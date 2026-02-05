/**
 * SAST (Static Application Security Testing) Service
 *
 * This service performs static code analysis using multiple engines:
 * 1. Semgrep (if installed) - Industry-standard SAST tool
 * 2. Built-in pattern matching - Fallback for common vulnerabilities
 *
 * Prerequisites for Semgrep:
 * - Python 3.7+
 * - pip install semgrep
 * - Or: brew install semgrep (macOS)
 */

const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const crypto = require('crypto');

class SastService {
    constructor() {
        this.tempDir = path.join(os.tmpdir(), 'sast-scans');
        this.activeScans = new Map();
        this.semgrepAvailable = null;

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
     * Check if Semgrep is installed
     */
    async checkSemgrep() {
        if (this.semgrepAvailable !== null) {
            return this.semgrepAvailable;
        }

        return new Promise((resolve) => {
            exec('semgrep --version', (error, stdout) => {
                this.semgrepAvailable = !error;
                resolve({
                    available: !error,
                    version: error ? null : stdout.trim()
                });
            });
        });
    }

    /**
     * Get service status
     */
    async getStatus() {
        const semgrep = await this.checkSemgrep();
        return {
            semgrepAvailable: semgrep.available,
            semgrepVersion: semgrep.version,
            builtInAnalyzer: true,
            tempDir: this.tempDir
        };
    }

    /**
     * Start a SAST scan on provided code
     */
    async startScan(options) {
        const { code, filename, language } = options;
        const scanId = `sast_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

        const session = {
            id: scanId,
            status: 'running',
            progress: 0,
            phase: 'Initializing',
            startTime: new Date().toISOString(),
            findings: [],
            error: null,
            filename: filename || 'code.js',
            language: language || this.detectLanguage(filename || 'code.js')
        };

        this.activeScans.set(scanId, session);

        // Run scan asynchronously
        this.runScan(scanId, code, session.language);

        return { success: true, scanId, session };
    }

    /**
     * Detect programming language from filename
     */
    detectLanguage(filename) {
        const ext = path.extname(filename).toLowerCase();
        const langMap = {
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.py': 'python',
            '.java': 'java',
            '.go': 'go',
            '.rb': 'ruby',
            '.php': 'php',
            '.cs': 'csharp',
            '.c': 'c',
            '.cpp': 'cpp',
            '.h': 'c'
        };
        return langMap[ext] || 'javascript';
    }

    /**
     * Run the actual scan
     */
    async runScan(scanId, code, language) {
        const session = this.activeScans.get(scanId);
        if (!session) return;

        try {
            session.phase = 'Preparing code';
            session.progress = 10;

            // Save code to temp file
            const tempFile = path.join(this.tempDir, `${scanId}.${this.getExtension(language)}`);
            await fs.writeFile(tempFile, code);

            session.phase = 'Analyzing code';
            session.progress = 30;

            // Try Semgrep first, fall back to built-in
            const semgrepStatus = await this.checkSemgrep();
            let findings = [];

            if (semgrepStatus.available) {
                session.phase = 'Running Semgrep analysis';
                session.progress = 50;
                findings = await this.runSemgrep(tempFile, language);
            }

            // Always run built-in patterns (catches things Semgrep might miss)
            session.phase = 'Running pattern analysis';
            session.progress = 70;
            const builtInFindings = this.runBuiltInAnalysis(code, language);

            // Merge findings, avoiding duplicates
            findings = this.mergeFindings(findings, builtInFindings);

            session.phase = 'Generating report';
            session.progress = 90;

            // Clean up temp file
            try {
                await fs.unlink(tempFile);
            } catch (e) { }

            session.findings = findings;
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
     * Get file extension for language
     */
    getExtension(language) {
        const extMap = {
            'javascript': 'js',
            'typescript': 'ts',
            'python': 'py',
            'java': 'java',
            'go': 'go',
            'ruby': 'rb',
            'php': 'php',
            'csharp': 'cs',
            'c': 'c',
            'cpp': 'cpp'
        };
        return extMap[language] || 'txt';
    }

    /**
     * Run Semgrep analysis
     */
    async runSemgrep(filePath, language) {
        return new Promise((resolve) => {
            const findings = [];

            // Use auto config which includes security rules
            const semgrep = spawn('semgrep', [
                '--config', 'auto',
                '--json',
                filePath
            ]);

            let output = '';
            let errorOutput = '';

            semgrep.stdout.on('data', (data) => {
                output += data.toString();
            });

            semgrep.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            semgrep.on('close', (code) => {
                try {
                    const result = JSON.parse(output);
                    if (result.results) {
                        result.results.forEach(r => {
                            findings.push(this.transformSemgrepFinding(r));
                        });
                    }
                } catch (e) {
                    console.error('Semgrep parse error:', e);
                }
                resolve(findings);
            });

            semgrep.on('error', () => {
                resolve(findings);
            });
        });
    }

    /**
     * Transform Semgrep finding to our format
     */
    transformSemgrepFinding(finding) {
        const severityMap = {
            'ERROR': 'critical',
            'WARNING': 'high',
            'INFO': 'medium'
        };

        return {
            id: finding.check_id,
            severity: severityMap[finding.extra?.severity] || 'medium',
            title: finding.check_id.split('.').pop().replace(/-/g, ' '),
            description: finding.extra?.message || 'Security issue detected',
            file: finding.path,
            line: finding.start?.line,
            endLine: finding.end?.line,
            code: finding.extra?.lines || '',
            cwe: finding.extra?.metadata?.cwe?.[0] || null,
            owasp: finding.extra?.metadata?.owasp?.[0] || null,
            recommendation: finding.extra?.fix || 'Review and fix the security issue',
            source: 'semgrep',
            ruleId: finding.check_id
        };
    }

    /**
     * Built-in pattern analysis for common vulnerabilities
     */
    runBuiltInAnalysis(code, language) {
        const findings = [];
        const lines = code.split('\n');

        // Define patterns for each vulnerability type
        const patterns = [
            // SQL Injection
            {
                pattern: /(\+\s*['"]?\s*\w+\s*['"]?\s*\+|\$\{[^}]+\}|['"`]\s*\+\s*\w+)/,
                context: /(query|sql|select|insert|update|delete|execute)/i,
                title: 'Potential SQL Injection',
                severity: 'critical',
                cwe: 'CWE-89',
                owasp: 'A03:2021 - Injection',
                description: 'User input appears to be concatenated directly into a SQL query.',
                recommendation: 'Use parameterized queries or prepared statements.'
            },
            // XSS - innerHTML/dangerouslySetInnerHTML
            {
                pattern: /(innerHTML\s*=|dangerouslySetInnerHTML|\.html\(|document\.write)/,
                title: 'Potential Cross-Site Scripting (XSS)',
                severity: 'critical',
                cwe: 'CWE-79',
                owasp: 'A03:2021 - Injection',
                description: 'Direct HTML manipulation detected which could allow XSS attacks.',
                recommendation: 'Sanitize user input using DOMPurify or similar libraries.'
            },
            // Hardcoded Secrets
            {
                pattern: /(api[_-]?key|apikey|secret|password|token|auth)\s*[:=]\s*['"`][A-Za-z0-9_\-]{8,}['"`]/i,
                title: 'Hardcoded Secret/Credential',
                severity: 'high',
                cwe: 'CWE-798',
                owasp: 'A07:2021 - Auth Failures',
                description: 'Sensitive credential appears to be hardcoded in source code.',
                recommendation: 'Use environment variables for sensitive credentials.'
            },
            // Insecure Random
            {
                pattern: /Math\.random\(\)/,
                context: /(token|secret|password|key|auth|session|id)/i,
                title: 'Insecure Random Number Generation',
                severity: 'high',
                cwe: 'CWE-330',
                owasp: 'A02:2021 - Cryptographic Failures',
                description: 'Math.random() is not cryptographically secure.',
                recommendation: 'Use crypto.randomBytes() or crypto.getRandomValues() for security-sensitive random values.'
            },
            // Command Injection
            {
                pattern: /(exec|spawn|execSync|spawnSync|system)\s*\([^)]*\+/,
                title: 'Potential Command Injection',
                severity: 'critical',
                cwe: 'CWE-78',
                owasp: 'A03:2021 - Injection',
                description: 'User input may be passed to a system command.',
                recommendation: 'Validate and sanitize all inputs before passing to system commands.'
            },
            // Path Traversal
            {
                pattern: /(readFile|writeFile|createReadStream|readdir|unlink|rmdir)\s*\([^)]*\+/,
                title: 'Potential Path Traversal',
                severity: 'high',
                cwe: 'CWE-22',
                owasp: 'A01:2021 - Broken Access Control',
                description: 'File path appears to include user-controlled input.',
                recommendation: 'Validate and sanitize file paths, use path.resolve() and check against a whitelist.'
            },
            // Eval usage
            {
                pattern: /\beval\s*\(|\bnew\s+Function\s*\(/,
                title: 'Use of eval() or Function constructor',
                severity: 'high',
                cwe: 'CWE-95',
                owasp: 'A03:2021 - Injection',
                description: 'Dynamic code execution can lead to code injection attacks.',
                recommendation: 'Avoid eval() and new Function(). Use safer alternatives like JSON.parse().'
            },
            // Prototype Pollution
            {
                pattern: /\[['"`]__proto__['"`]\]|\[['"`]constructor['"`]\]|\[['"`]prototype['"`]\]/,
                title: 'Potential Prototype Pollution',
                severity: 'high',
                cwe: 'CWE-1321',
                owasp: 'A03:2021 - Injection',
                description: 'Object property access pattern susceptible to prototype pollution.',
                recommendation: 'Validate object keys and use Object.create(null) for dictionaries.'
            },
            // Missing Input Validation
            {
                pattern: /req\.(body|params|query)\.\w+/,
                context: /(?!.*validat)/i,
                title: 'Missing Input Validation',
                severity: 'medium',
                cwe: 'CWE-20',
                owasp: 'A03:2021 - Injection',
                description: 'User input from request may not be validated.',
                recommendation: 'Validate and sanitize all user inputs using a validation library.'
            },
            // Insecure Cookie
            {
                pattern: /cookie.*(?!.*httpOnly|.*secure|.*sameSite)/i,
                context: /set.*cookie/i,
                title: 'Insecure Cookie Configuration',
                severity: 'medium',
                cwe: 'CWE-614',
                owasp: 'A05:2021 - Security Misconfiguration',
                description: 'Cookie may be missing security flags (httpOnly, secure, sameSite).',
                recommendation: 'Set httpOnly, secure, and sameSite flags on sensitive cookies.'
            },
            // NoSQL Injection
            {
                pattern: /\$where|\$regex|\$ne|\$gt|\$lt/,
                context: /(find|update|delete|aggregate)/i,
                title: 'Potential NoSQL Injection',
                severity: 'high',
                cwe: 'CWE-943',
                owasp: 'A03:2021 - Injection',
                description: 'MongoDB query operators detected that could enable NoSQL injection.',
                recommendation: 'Sanitize input and avoid using dangerous operators with user input.'
            },
            // Open Redirect
            {
                pattern: /(redirect|location)\s*[=(]\s*[^'"`]*req\./i,
                title: 'Potential Open Redirect',
                severity: 'medium',
                cwe: 'CWE-601',
                owasp: 'A01:2021 - Broken Access Control',
                description: 'Redirect URL may be controlled by user input.',
                recommendation: 'Validate redirect URLs against a whitelist of allowed destinations.'
            },
            // SSRF
            {
                pattern: /(fetch|axios|request|http\.get|https\.get)\s*\([^)]*req\./,
                title: 'Potential Server-Side Request Forgery (SSRF)',
                severity: 'high',
                cwe: 'CWE-918',
                owasp: 'A10:2021 - SSRF',
                description: 'HTTP request URL may be controlled by user input.',
                recommendation: 'Validate and whitelist allowed URLs and hosts.'
            }
        ];

        lines.forEach((line, index) => {
            patterns.forEach(p => {
                if (p.pattern.test(line)) {
                    // Check context if specified
                    if (p.context) {
                        // Check surrounding lines for context
                        const contextLines = lines.slice(Math.max(0, index - 3), index + 4).join('\n');
                        if (!p.context.test(contextLines) && !p.context.test(line)) {
                            return; // Skip if context doesn't match
                        }
                    }

                    findings.push({
                        id: `builtin_${findings.length + 1}`,
                        severity: p.severity,
                        title: p.title,
                        description: p.description,
                        file: 'input',
                        line: index + 1,
                        code: line.trim(),
                        cwe: p.cwe,
                        owasp: p.owasp,
                        recommendation: p.recommendation,
                        source: 'builtin'
                    });
                }
            });
        });

        return findings;
    }

    /**
     * Merge findings from multiple sources, removing duplicates
     */
    mergeFindings(semgrepFindings, builtInFindings) {
        const merged = [...semgrepFindings];
        const existingLines = new Set(semgrepFindings.map(f => `${f.line}-${f.cwe}`));

        builtInFindings.forEach(f => {
            const key = `${f.line}-${f.cwe}`;
            if (!existingLines.has(key)) {
                merged.push(f);
            }
        });

        // Sort by severity then line number
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        merged.sort((a, b) => {
            const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
            return sevDiff !== 0 ? sevDiff : a.line - b.line;
        });

        return merged;
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
}

// Export singleton
const sastService = new SastService();
module.exports = sastService;
module.exports.SastService = SastService;
