import React, { useState, useEffect } from 'react';
import { Package, Upload, AlertTriangle, CheckCircle, ExternalLink, RefreshCw, Shield, Clock, Download, ChevronDown, ChevronRight } from 'lucide-react';

// Helper to save security reports to localStorage
const saveSecurityReport = (type, report) => {
    const stored = localStorage.getItem('securityReports');
    const reports = stored ? JSON.parse(stored) : { sast: [], dast: [], sca: [], threat: [] };
    reports[type] = [report, ...reports[type].slice(0, 19)]; // Keep last 20
    localStorage.setItem('securityReports', JSON.stringify(reports));
};

// Mock dependencies and vulnerabilities generator
const generateMockDependencies = (fileName) => {
    const packages = [
        { name: 'lodash', versions: ['4.17.15', '4.17.19', '4.17.21'] },
        { name: 'axios', versions: ['0.19.0', '0.21.0', '0.21.1'] },
        { name: 'express', versions: ['4.16.4', '4.17.1', '4.18.2'] },
        { name: 'moment', versions: ['2.24.0', '2.29.1', '2.29.4'] },
        { name: 'jquery', versions: ['3.3.1', '3.4.1', '3.6.0'] },
        { name: 'react', versions: ['16.8.0', '17.0.2', '18.2.0'] },
        { name: 'webpack', versions: ['4.41.2', '5.72.0', '5.88.0'] },
        { name: 'typescript', versions: ['3.7.5', '4.5.4', '5.0.0'] },
        { name: 'node-fetch', versions: ['2.6.0', '2.6.1', '3.2.0'] },
        { name: 'minimist', versions: ['1.2.0', '1.2.5', '1.2.8'] },
    ];

    const vulnerabilities = [
        { cve: 'CVE-2021-23337', severity: 'high', cvss: 7.2, desc: 'Prototype Pollution in lodash' },
        { cve: 'CVE-2020-28168', severity: 'medium', cvss: 5.9, desc: 'Server-Side Request Forgery in axios' },
        { cve: 'CVE-2022-24999', severity: 'high', cvss: 7.5, desc: 'Prototype Pollution in qs' },
        { cve: 'CVE-2019-11358', severity: 'medium', cvss: 6.1, desc: 'Prototype Pollution in jQuery' },
        { cve: 'CVE-2021-44906', severity: 'critical', cvss: 9.8, desc: 'Prototype Pollution in minimist' },
        { cve: 'CVE-2022-0235', severity: 'high', cvss: 8.1, desc: 'Information Exposure in node-fetch' },
        { cve: 'CVE-2020-8203', severity: 'high', cvss: 7.4, desc: 'Prototype Pollution in lodash' },
        { cve: 'CVE-2022-29078', severity: 'critical', cvss: 9.8, desc: 'Template Injection in ejs' },
    ];

    const depCount = Math.floor(Math.random() * 5) + 5;
    const selectedPackages = [...packages].sort(() => 0.5 - Math.random()).slice(0, depCount);

    return selectedPackages.map((pkg, index) => {
        const version = pkg.versions[Math.floor(Math.random() * pkg.versions.length)];
        const hasVulns = Math.random() > 0.4;
        const vulnCount = hasVulns ? Math.floor(Math.random() * 2) + 1 : 0;
        const selectedVulns = hasVulns
            ? [...vulnerabilities].sort(() => 0.5 - Math.random()).slice(0, vulnCount)
            : [];

        return {
            name: pkg.name,
            version: version,
            license: ['MIT', 'Apache-2.0', 'ISC', 'BSD-3-Clause'][Math.floor(Math.random() * 4)],
            vulnerabilities: selectedVulns.map(v => ({
                id: v.cve,
                cve: v.cve,
                title: v.desc,
                severity: v.severity,
                cvss: v.cvss,
                description: `${v.desc}. This vulnerability affects ${pkg.name} version ${version}.`,
                references: [`https://nvd.nist.gov/vuln/detail/${v.cve}`]
            }))
        };
    });
};

export default function SecuritySCA() {
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [scanPhase, setScanPhase] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [dependencies, setDependencies] = useState([]);
    const [summary, setSummary] = useState({
        total: 0,
        vulnerable: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
    });
    const [filterSeverity, setFilterSeverity] = useState('all');
    const [error, setError] = useState(null);
    const [scanHistory, setScanHistory] = useState([]);
    const [expandedDep, setExpandedDep] = useState(null);

    // Load scan history from localStorage on mount
    useEffect(() => {
        loadScanHistory();
    }, []);

    const loadScanHistory = () => {
        const stored = localStorage.getItem('securityReports');
        if (stored) {
            try {
                const reports = JSON.parse(stored);
                setScanHistory(reports.sca || []);
            } catch (e) {
                console.error('Failed to load scan history:', e);
            }
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    const startScan = async () => {
        if (!selectedFile) {
            setError('Please upload a dependency manifest file');
            return;
        }

        setError(null);
        setIsScanning(true);
        setScanProgress(0);
        setScanPhase('Starting SCA scan...');
        setDependencies([]);

        // Simulate scanning phases
        const phases = [
            { phase: 'Reading manifest file...', progress: 15 },
            { phase: 'Resolving dependencies...', progress: 30 },
            { phase: 'Building dependency tree...', progress: 45 },
            { phase: 'Checking CVE database...', progress: 60 },
            { phase: 'Analyzing vulnerabilities...', progress: 75 },
            { phase: 'Checking license compliance...', progress: 90 },
            { phase: 'Generating report...', progress: 95 },
        ];

        for (const step of phases) {
            await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 400));
            setScanProgress(step.progress);
            setScanPhase(step.phase);
        }

        // Generate mock dependencies
        const mockDeps = generateMockDependencies(selectedFile.name);
        setDependencies(mockDeps);

        // Calculate summary
        let vulnCounts = { critical: 0, high: 0, medium: 0, low: 0 };
        mockDeps.forEach(dep => {
            dep.vulnerabilities?.forEach(v => {
                const sev = v.severity?.toLowerCase();
                if (vulnCounts[sev] !== undefined) {
                    vulnCounts[sev]++;
                }
            });
        });

        const newSummary = {
            total: mockDeps.length,
            vulnerable: mockDeps.filter(d => d.vulnerabilities?.length > 0).length,
            ...vulnCounts
        };
        setSummary(newSummary);

        setScanProgress(100);
        setScanPhase('Completed');
        setIsScanning(false);

        // Save report to localStorage
        const report = {
            id: `SCA-${Date.now()}`,
            name: `SCA Scan - ${selectedFile.name}`,
            fileName: selectedFile.name,
            date: new Date().toISOString(),
            status: 'Completed',
            dependencies: mockDeps,
            summary: newSummary
        };

        saveSecurityReport('sca', report);
        loadScanHistory();
    };

    const loadReport = (report) => {
        setDependencies(report.dependencies || []);
        setSummary(report.summary || { total: 0, vulnerable: 0, critical: 0, high: 0, medium: 0, low: 0 });
        setScanPhase('Completed');
        setScanProgress(100);
    };

    const getSeverityColor = (severity) => {
        switch (severity?.toLowerCase()) {
            case 'critical': return 'text-red-400 bg-red-500/20 border-red-500/30';
            case 'high': return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
            case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
            case 'low': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
            default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
        }
    };

    const filteredDeps = filterSeverity === 'all'
        ? dependencies
        : dependencies.filter(dep =>
            dep.vulnerabilities?.some(v => v.severity === filterSeverity) ||
            (filterSeverity === 'safe' && (!dep.vulnerabilities || dep.vulnerabilities.length === 0))
        );

    return (
        <div className="space-y-6">
            {/* Error Display */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-red-400 font-medium">Error</p>
                            <p className="text-sm text-red-300">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Section */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-white/5">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Package size={20} className="text-green-400" />
                    Software Composition Analysis (SCA)
                </h3>
                <p className="text-sm text-gray-400 mb-6">
                    Identify vulnerabilities in open-source dependencies. Upload your package manifest to scan for known CVEs and license issues.
                </p>

                {/* Upload Area */}
                <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-green-500/50 transition-all cursor-pointer">
                    <input
                        type="file"
                        accept=".json,.lock,.txt,.xml,.gradle,.pom"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="manifest-upload"
                        disabled={isScanning}
                    />
                    <label htmlFor="manifest-upload" className="cursor-pointer">
                        <Upload size={40} className="mx-auto mb-3 text-gray-500" />
                        <p className="text-gray-400 mb-1">Upload dependency manifest</p>
                        <p className="text-xs text-gray-500">Supports: package.json, package-lock.json, requirements.txt, pom.xml, build.gradle</p>
                    </label>
                    {selectedFile && (
                        <div className="mt-4 p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                            <p className="text-sm text-green-400">{selectedFile.name}</p>
                        </div>
                    )}
                </div>

                {/* Scan Button */}
                <div className="mt-6 flex items-center gap-4">
                    <button
                        onClick={startScan}
                        disabled={isScanning || !selectedFile}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${isScanning || !selectedFile
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg hover:shadow-green-500/25'
                            }`}
                    >
                        {isScanning ? (
                            <>
                                <RefreshCw size={18} className="animate-spin" />
                                {scanPhase}
                            </>
                        ) : (
                            <>
                                <Shield size={18} />
                                Analyze Dependencies
                            </>
                        )}
                    </button>

                    {isScanning && (
                        <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300"
                                style={{ width: `${scanProgress}%` }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Scan History */}
            {scanHistory.length > 0 && (
                <div className="bg-slate-800/50 rounded-xl p-6 border border-white/5">
                    <h3 className="text-lg font-semibold text-white mb-4">Previous SCA Scans</h3>
                    <div className="space-y-2">
                        {scanHistory.slice(0, 5).map((scan, index) => (
                            <button
                                key={scan.id || index}
                                onClick={() => loadReport(scan)}
                                className="w-full flex items-center justify-between p-3 rounded-lg border transition-all bg-slate-900/50 border-white/5 hover:border-green-500/30"
                            >
                                <div className="flex items-center gap-3">
                                    <Package size={16} className="text-green-400" />
                                    <div className="text-left">
                                        <p className="text-sm text-white">{scan.name || 'SCA Scan'}</p>
                                        <p className="text-xs text-gray-500">{new Date(scan.date).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {scan.summary && (
                                        <div className="flex gap-1">
                                            {scan.summary.critical > 0 && (
                                                <span className="px-1.5 py-0.5 rounded text-xs bg-red-500/20 text-red-400">
                                                    {scan.summary.critical}C
                                                </span>
                                            )}
                                            {scan.summary.high > 0 && (
                                                <span className="px-1.5 py-0.5 rounded text-xs bg-orange-500/20 text-orange-400">
                                                    {scan.summary.high}H
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400">
                                        {scan.status || 'Completed'}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Stats */}
            {dependencies.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                            <Package size={16} className="text-blue-400" />
                            <span className="text-xs text-gray-500">Total Dependencies</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{summary.total}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle size={16} className="text-orange-400" />
                            <span className="text-xs text-gray-500">Vulnerable</span>
                        </div>
                        <p className="text-2xl font-bold text-orange-400">{summary.vulnerable}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                            <Shield size={16} className="text-red-400" />
                            <span className="text-xs text-gray-500">Critical Issues</span>
                        </div>
                        <p className="text-2xl font-bold text-red-400">{summary.critical}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock size={16} className="text-yellow-400" />
                            <span className="text-xs text-gray-500">High Severity</span>
                        </div>
                        <p className="text-2xl font-bold text-yellow-400">{summary.high}</p>
                    </div>
                </div>
            )}

            {/* Dependencies List */}
            {dependencies.length > 0 && (
                <div className="bg-slate-800/50 rounded-xl p-6 border border-white/5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">Dependencies</h3>
                        <div className="flex gap-2">
                            {['all', 'critical', 'high', 'medium', 'safe'].map(filter => (
                                <button
                                    key={filter}
                                    onClick={() => setFilterSeverity(filter)}
                                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${filterSeverity === filter
                                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                        : 'bg-slate-700 text-gray-400 hover:text-white'
                                        }`}
                                >
                                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        {filteredDeps.map((dep, index) => (
                            <div key={dep.name || index} className="border border-white/5 rounded-xl overflow-hidden">
                                <button
                                    onClick={() => setExpandedDep(expandedDep === index ? null : index)}
                                    className="w-full p-4 bg-slate-900/50 hover:bg-slate-900/80 transition-all"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-slate-800">
                                                <Package size={18} className="text-green-400" />
                                            </div>
                                            <div className="text-left">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium text-white">{dep.name}</p>
                                                    {dep.version && (
                                                        <span className="px-2 py-0.5 rounded text-xs bg-slate-700 text-gray-400">
                                                            v{dep.version}
                                                        </span>
                                                    )}
                                                </div>
                                                {dep.license && (
                                                    <p className="text-xs text-gray-500">License: {dep.license}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {!dep.vulnerabilities || dep.vulnerabilities.length === 0 ? (
                                                <span className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-500/20 text-green-400">
                                                    <CheckCircle size={12} />
                                                    Secure
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-500/20 text-red-400">
                                                    <AlertTriangle size={12} />
                                                    {dep.vulnerabilities.length} issue{dep.vulnerabilities.length > 1 ? 's' : ''}
                                                </span>
                                            )}
                                            {expandedDep === index ?
                                                <ChevronDown size={18} className="text-gray-500" /> :
                                                <ChevronRight size={18} className="text-gray-500" />
                                            }
                                        </div>
                                    </div>
                                </button>

                                {expandedDep === index && dep.vulnerabilities && dep.vulnerabilities.length > 0 && (
                                    <div className="p-4 border-t border-white/5 space-y-3">
                                        {dep.vulnerabilities.map((vuln, i) => (
                                            <div key={i} className="p-3 bg-slate-800/50 rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getSeverityColor(vuln.severity)}`}>
                                                            {vuln.severity?.toUpperCase()}
                                                        </span>
                                                        <span className="text-sm font-medium text-white">{vuln.cve}</span>
                                                    </div>
                                                    {vuln.cvss && (
                                                        <span className="text-xs text-gray-400">CVSS: {vuln.cvss}</span>
                                                    )}
                                                </div>
                                                {vuln.description && (
                                                    <p className="text-xs text-gray-400 mb-2">{vuln.description}</p>
                                                )}
                                                {vuln.cve && (
                                                    <a
                                                        href={`https://nvd.nist.gov/vuln/detail/${vuln.cve}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                                                    >
                                                        <ExternalLink size={12} />
                                                        View on NVD
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {dependencies.length === 0 && !isScanning && (
                <div className="bg-slate-800/50 rounded-xl p-12 border border-white/5 text-center">
                    <Package size={48} className="mx-auto mb-4 text-gray-500 opacity-50" />
                    <p className="text-gray-400">No dependencies analyzed yet</p>
                    <p className="text-sm text-gray-500 mt-1">Upload a dependency manifest to scan for vulnerabilities</p>
                </div>
            )}
        </div>
    );
}
