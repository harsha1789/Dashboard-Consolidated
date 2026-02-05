/**
 * SCA (Software Composition Analysis) Service
 *
 * This service analyzes dependencies for known vulnerabilities using:
 * 1. npm audit - For Node.js projects
 * 2. Built-in CVE database lookup - For general dependency checking
 *
 * Supports:
 * - package.json / package-lock.json (npm)
 * - requirements.txt (Python - basic support)
 */

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const crypto = require('crypto');

class ScaService {
    constructor() {
        this.tempDir = path.join(os.tmpdir(), 'sca-scans');
        this.activeScans = new Map();

        // Initialize temp directory
        this.initTempDir();
    }

    async initTempDir() {
        try {
            await fs.mkdir(this.tempDir, { recursive: true });
        } catch (e) {
            console.error('Failed to create temp directory:', e);
        }
    }

    /**
     * Get service status
     */
    async getStatus() {
        const npmVersion = await this.getNpmVersion();
        return {
            npmAvailable: !!npmVersion,
            npmVersion,
            supportedFormats: ['package.json', 'package-lock.json', 'requirements.txt'],
            tempDir: this.tempDir
        };
    }

    /**
     * Get npm version
     */
    async getNpmVersion() {
        return new Promise((resolve) => {
            exec('npm --version', (error, stdout) => {
                resolve(error ? null : stdout.trim());
            });
        });
    }

    /**
     * Start SCA scan
     */
    async startScan(options) {
        const { content, filename, type } = options;
        const scanId = `sca_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

        const session = {
            id: scanId,
            status: 'running',
            progress: 0,
            phase: 'Initializing',
            startTime: new Date().toISOString(),
            dependencies: [],
            vulnerabilities: [],
            summary: {
                total: 0,
                vulnerable: 0,
                critical: 0,
                high: 0,
                medium: 0,
                low: 0,
                outdated: 0
            },
            error: null,
            filename: filename || 'package.json',
            type: type || this.detectType(filename || 'package.json')
        };

        this.activeScans.set(scanId, session);

        // Run scan asynchronously
        this.runScan(scanId, content, session.type);

        return { success: true, scanId, session };
    }

    /**
     * Detect manifest type from filename
     */
    detectType(filename) {
        const name = filename.toLowerCase();
        if (name.includes('package-lock') || name.includes('package.json')) return 'npm';
        if (name.includes('requirements') || name.includes('.txt')) return 'pip';
        if (name.includes('gemfile')) return 'gem';
        if (name.includes('pom.xml')) return 'maven';
        return 'npm'; // Default
    }

    /**
     * Run the actual scan
     */
    async runScan(scanId, content, type) {
        const session = this.activeScans.get(scanId);
        if (!session) return;

        try {
            session.phase = 'Parsing manifest';
            session.progress = 10;

            if (type === 'npm') {
                await this.runNpmAudit(scanId, content);
            } else if (type === 'pip') {
                await this.runPipAnalysis(scanId, content);
            } else {
                // Fallback: parse as JSON and do basic analysis
                await this.runBasicAnalysis(scanId, content);
            }

            session.progress = 100;
            session.status = 'completed';
            session.phase = 'Completed';
            session.endTime = new Date().toISOString();

        } catch (error) {
            session.status = 'failed';
            session.phase = 'Failed';
            session.error = error.message;
        }
    }

    /**
     * Run npm audit
     */
    async runNpmAudit(scanId, content) {
        const session = this.activeScans.get(scanId);

        // Create temp directory for this scan
        const scanDir = path.join(this.tempDir, scanId);
        await fs.mkdir(scanDir, { recursive: true });

        try {
            session.phase = 'Writing package files';
            session.progress = 20;

            // Parse and write package.json
            let packageJson;
            try {
                packageJson = JSON.parse(content);
            } catch (e) {
                // If it's a package-lock, create a minimal package.json
                packageJson = { name: 'scan', version: '1.0.0', dependencies: {} };
            }

            await fs.writeFile(
                path.join(scanDir, 'package.json'),
                JSON.stringify(packageJson, null, 2)
            );

            // Extract dependencies for display
            const allDeps = {
                ...packageJson.dependencies,
                ...packageJson.devDependencies
            };

            session.dependencies = Object.entries(allDeps).map(([name, version]) => ({
                name,
                version: version.replace(/[\^~>=<]/g, ''),
                specifiedVersion: version,
                license: 'Unknown',
                vulnerabilities: []
            }));

            session.summary.total = session.dependencies.length;

            session.phase = 'Running npm audit';
            session.progress = 40;

            // Run npm audit
            const auditResult = await this.executeNpmAudit(scanDir);

            session.phase = 'Processing results';
            session.progress = 70;

            // Process audit results
            if (auditResult.vulnerabilities) {
                this.processNpmAuditResult(session, auditResult);
            }

            // Calculate summary
            this.calculateSummary(session);

        } finally {
            // Clean up
            try {
                await fs.rm(scanDir, { recursive: true });
            } catch (e) { }
        }
    }

    /**
     * Execute npm audit command
     */
    async executeNpmAudit(dir) {
        return new Promise((resolve) => {
            exec('npm audit --json', { cwd: dir }, (error, stdout, stderr) => {
                try {
                    // npm audit returns exit code 1 if vulnerabilities found
                    const result = JSON.parse(stdout || '{}');
                    resolve(result);
                } catch (e) {
                    resolve({ vulnerabilities: {} });
                }
            });
        });
    }

    /**
     * Process npm audit results
     */
    processNpmAuditResult(session, auditResult) {
        const vulns = auditResult.vulnerabilities || {};

        Object.entries(vulns).forEach(([pkgName, vuln]) => {
            const dep = session.dependencies.find(d => d.name === pkgName);

            const vulnInfo = {
                severity: vuln.severity || 'medium',
                title: vuln.title || `Vulnerability in ${pkgName}`,
                cve: vuln.cve || vuln.via?.[0]?.cve || null,
                url: vuln.url || vuln.via?.[0]?.url || null,
                range: vuln.range || '*',
                fixAvailable: !!vuln.fixAvailable,
                fixedIn: typeof vuln.fixAvailable === 'object' ? vuln.fixAvailable.version : null
            };

            session.vulnerabilities.push({
                package: pkgName,
                ...vulnInfo
            });

            if (dep) {
                dep.vulnerabilities.push(vulnInfo);
            }
        });
    }

    /**
     * Run basic Python requirements analysis
     */
    async runPipAnalysis(scanId, content) {
        const session = this.activeScans.get(scanId);

        session.phase = 'Parsing requirements';
        session.progress = 30;

        // Parse requirements.txt
        const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));

        session.dependencies = lines.map(line => {
            const match = line.match(/^([a-zA-Z0-9_-]+)([=<>!]+)?(.+)?$/);
            if (match) {
                return {
                    name: match[1],
                    version: match[3] || 'latest',
                    specifiedVersion: line,
                    license: 'Unknown',
                    vulnerabilities: []
                };
            }
            return null;
        }).filter(Boolean);

        session.summary.total = session.dependencies.length;

        session.phase = 'Checking known vulnerabilities';
        session.progress = 60;

        // Check against known vulnerable packages
        const knownVulnerable = {
            'django': { below: '3.2.0', severity: 'high', cve: 'CVE-2021-33203' },
            'flask': { below: '2.0.0', severity: 'medium', cve: 'CVE-2019-1010083' },
            'requests': { below: '2.20.0', severity: 'high', cve: 'CVE-2018-18074' },
            'urllib3': { below: '1.26.5', severity: 'medium', cve: 'CVE-2021-33503' },
            'pyyaml': { below: '5.4', severity: 'critical', cve: 'CVE-2020-14343' },
            'pillow': { below: '8.3.2', severity: 'high', cve: 'CVE-2021-34552' },
            'numpy': { below: '1.22.0', severity: 'medium', cve: 'CVE-2021-41496' },
            'jinja2': { below: '2.11.3', severity: 'medium', cve: 'CVE-2020-28493' }
        };

        session.dependencies.forEach(dep => {
            const vuln = knownVulnerable[dep.name.toLowerCase()];
            if (vuln) {
                const vulnInfo = {
                    severity: vuln.severity,
                    title: `Known vulnerability in ${dep.name}`,
                    cve: vuln.cve,
                    fixedIn: vuln.below
                };
                dep.vulnerabilities.push(vulnInfo);
                session.vulnerabilities.push({ package: dep.name, ...vulnInfo });
            }
        });

        this.calculateSummary(session);
    }

    /**
     * Run basic JSON analysis
     */
    async runBasicAnalysis(scanId, content) {
        const session = this.activeScans.get(scanId);

        session.phase = 'Parsing content';
        session.progress = 50;

        try {
            const parsed = JSON.parse(content);
            const deps = parsed.dependencies || {};

            session.dependencies = Object.entries(deps).map(([name, version]) => ({
                name,
                version: typeof version === 'string' ? version : 'unknown',
                specifiedVersion: typeof version === 'string' ? version : JSON.stringify(version),
                license: 'Unknown',
                vulnerabilities: []
            }));

            session.summary.total = session.dependencies.length;
        } catch (e) {
            session.error = 'Failed to parse manifest file';
        }

        this.calculateSummary(session);
    }

    /**
     * Calculate summary statistics
     */
    calculateSummary(session) {
        session.summary.vulnerable = session.dependencies.filter(d => d.vulnerabilities.length > 0).length;
        session.summary.critical = session.vulnerabilities.filter(v => v.severity === 'critical').length;
        session.summary.high = session.vulnerabilities.filter(v => v.severity === 'high').length;
        session.summary.medium = session.vulnerabilities.filter(v => v.severity === 'medium' || v.severity === 'moderate').length;
        session.summary.low = session.vulnerabilities.filter(v => v.severity === 'low').length;
    }

    /**
     * Analyze a project directory (if provided path to node_modules)
     */
    async analyzeDirectory(dirPath) {
        const packageJsonPath = path.join(dirPath, 'package.json');

        try {
            const content = await fs.readFile(packageJsonPath, 'utf8');
            return this.startScan({
                content,
                filename: 'package.json',
                type: 'npm'
            });
        } catch (e) {
            return { success: false, error: 'No package.json found in directory' };
        }
    }

    /**
     * Get scan status
     */
    getScanStatus(scanId) {
        const session = this.activeScans.get(scanId);
        if (!session) {
            return { success: false, error: 'Scan not found' };
        }
        return { success: true, session };
    }

    /**
     * Get all scans
     */
    getAllScans() {
        return Array.from(this.activeScans.values());
    }

    /**
     * Clear a scan
     */
    clearScan(scanId) {
        this.activeScans.delete(scanId);
        return { success: true };
    }

    /**
     * Generate remediation command
     */
    generateRemediationCommand(session) {
        if (!session || !session.vulnerabilities.length) {
            return null;
        }

        const packages = [...new Set(session.vulnerabilities.map(v => v.package))];

        if (session.type === 'npm') {
            return `npm update ${packages.join(' ')}`;
        } else if (session.type === 'pip') {
            return `pip install --upgrade ${packages.join(' ')}`;
        }

        return null;
    }
}

// Export singleton
const scaService = new ScaService();
module.exports = scaService;
module.exports.ScaService = ScaService;
