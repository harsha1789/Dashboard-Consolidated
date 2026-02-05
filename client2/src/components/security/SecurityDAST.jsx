import React, { useState, useEffect } from 'react';
import { Globe, Play, AlertTriangle, CheckCircle, Clock, Shield, Server, Lock, Eye, RefreshCw, StopCircle, Wifi, WifiOff } from 'lucide-react';

// Helper to save security reports to localStorage
const saveSecurityReport = (type, report) => {
    const stored = localStorage.getItem('securityReports');
    const reports = stored ? JSON.parse(stored) : { sast: [], dast: [], sca: [], threat: [] };
    reports[type] = [report, ...reports[type].slice(0, 19)]; // Keep last 20
    localStorage.setItem('securityReports', JSON.stringify(reports));
};

// Mock DAST vulnerabilities generator
const generateMockDastFindings = (targetUrl) => {
    const findingTypes = [
        { title: 'Cross-Site Scripting (Reflected)', severity: 'high', cweid: '79', wascid: '8', owasp: 'A03:2021' },
        { title: 'SQL Injection', severity: 'critical', cweid: '89', wascid: '19', owasp: 'A03:2021' },
        { title: 'Missing X-Frame-Options Header', severity: 'medium', cweid: '1021', wascid: '15', owasp: 'A05:2021' },
        { title: 'Missing Content-Security-Policy', severity: 'medium', cweid: '693', wascid: '15', owasp: 'A05:2021' },
        { title: 'Cookie Without Secure Flag', severity: 'low', cweid: '614', wascid: '13', owasp: 'A05:2021' },
        { title: 'Information Disclosure - Debug Error Messages', severity: 'medium', cweid: '200', wascid: '13', owasp: 'A01:2021' },
        { title: 'Server Leaks Version Information', severity: 'low', cweid: '200', wascid: '45', owasp: 'A01:2021' },
        { title: 'Cross-Site Request Forgery (CSRF)', severity: 'high', cweid: '352', wascid: '9', owasp: 'A01:2021' },
        { title: 'Insecure HTTP Methods Enabled', severity: 'medium', cweid: '749', wascid: '45', owasp: 'A05:2021' },
        { title: 'Directory Browsing Enabled', severity: 'low', cweid: '548', wascid: '48', owasp: 'A01:2021' },
    ];

    const methods = ['GET', 'POST', 'PUT', 'DELETE'];
    const paths = ['/api/users', '/api/login', '/api/products', '/search', '/admin', '/api/data', '/upload'];
    const params = ['id', 'query', 'page', 'token', 'user', 'action', 'file'];

    const count = Math.floor(Math.random() * 6) + 2;
    const selectedTypes = [...findingTypes].sort(() => 0.5 - Math.random()).slice(0, count);

    return selectedTypes.map((type, index) => {
        const path = paths[Math.floor(Math.random() * paths.length)];
        const param = params[Math.floor(Math.random() * params.length)];
        return {
            id: `DAST-${Date.now()}-${index}`,
            title: type.title,
            severity: type.severity,
            cweid: type.cweid,
            wascid: type.wascid,
            url: `${targetUrl}${path}`,
            method: methods[Math.floor(Math.random() * methods.length)],
            param: param,
            description: `The application is vulnerable to ${type.title}. This was detected on the endpoint ${path}.`,
            solution: `Review the ${path} endpoint and implement appropriate security controls. See OWASP guidelines for ${type.owasp}.`,
            evidence: type.severity === 'critical' || type.severity === 'high'
                ? `Payload: ${param}=<script>alert(1)</script> resulted in reflected content`
                : null,
            reference: `https://owasp.org/Top10/`
        };
    });
};

export default function SecurityDAST() {
    const [targetUrl, setTargetUrl] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [scanPhase, setScanPhase] = useState('');
    const [findings, setFindings] = useState([]);
    const [error, setError] = useState(null);
    const [scanHistory, setScanHistory] = useState([]);
    const [expandedFinding, setExpandedFinding] = useState(null);

    // Load scan history from localStorage on mount
    useEffect(() => {
        loadScanHistory();
    }, []);

    const loadScanHistory = () => {
        const stored = localStorage.getItem('securityReports');
        if (stored) {
            try {
                const reports = JSON.parse(stored);
                setScanHistory(reports.dast || []);
            } catch (e) {
                console.error('Failed to load scan history:', e);
            }
        }
    };

    const startScan = async () => {
        if (!targetUrl) {
            setError('Please enter a target URL');
            return;
        }

        // Validate URL format
        try {
            new URL(targetUrl);
        } catch {
            setError('Please enter a valid URL (e.g., https://example.com)');
            return;
        }

        setError(null);
        setIsScanning(true);
        setScanProgress(0);
        setScanPhase('Initializing DAST scan...');
        setFindings([]);

        // Simulate scanning phases
        const phases = [
            { phase: 'Connecting to target...', progress: 10 },
            { phase: 'Crawling application...', progress: 25 },
            { phase: 'Discovering endpoints...', progress: 40 },
            { phase: 'Testing for XSS vulnerabilities...', progress: 55 },
            { phase: 'Testing for injection flaws...', progress: 70 },
            { phase: 'Checking security headers...', progress: 85 },
            { phase: 'Generating report...', progress: 95 },
        ];

        for (const step of phases) {
            await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 600));
            setScanProgress(step.progress);
            setScanPhase(step.phase);
        }

        // Generate mock findings
        const mockFindings = generateMockDastFindings(targetUrl);
        setFindings(mockFindings);
        setScanProgress(100);
        setScanPhase('Completed');
        setIsScanning(false);

        // Save report to localStorage
        const report = {
            id: `DAST-${Date.now()}`,
            name: `DAST Scan - ${new URL(targetUrl).hostname}`,
            target: targetUrl,
            date: new Date().toISOString(),
            status: 'Completed',
            findings: mockFindings,
            summary: {
                critical: mockFindings.filter(f => f.severity === 'critical').length,
                high: mockFindings.filter(f => f.severity === 'high').length,
                medium: mockFindings.filter(f => f.severity === 'medium').length,
                low: mockFindings.filter(f => f.severity === 'low').length,
                info: mockFindings.filter(f => f.severity === 'info').length,
            }
        };

        saveSecurityReport('dast', report);
        loadScanHistory();
    };

    const loadReport = (report) => {
        setFindings(report.findings || []);
        setTargetUrl(report.target || '');
        setScanPhase('Completed');
        setScanProgress(100);
    };

    const getSeverityColor = (severity) => {
        switch (severity?.toLowerCase()) {
            case 'critical': return 'text-red-400 bg-red-500/20 border-red-500/30';
            case 'high': return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
            case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
            case 'low': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
            case 'info': return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
            default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
        }
    };

    const getSeverityCounts = () => {
        const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
        findings.forEach(f => {
            const sev = f.severity?.toLowerCase();
            if (counts[sev] !== undefined) {
                counts[sev]++;
            }
        });
        return counts;
    };

    const severityCounts = getSeverityCounts();

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

            {/* Scan Configuration */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-white/5">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Globe size={20} className="text-blue-400" />
                    Dynamic Application Security Testing (DAST)
                </h3>
                <p className="text-sm text-gray-400 mb-6">
                    Test running web applications for vulnerabilities. The scan will crawl and test the target URL for common security issues like XSS, CSRF, and security misconfigurations.
                </p>

                <div className="space-y-4">
                    {/* Target URL */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Target URL</label>
                        <div className="flex gap-3">
                            <div className="flex-1 relative">
                                <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    type="url"
                                    value={targetUrl}
                                    onChange={(e) => setTargetUrl(e.target.value)}
                                    placeholder="https://example.com"
                                    disabled={isScanning}
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-600 focus:border-blue-500/50 focus:outline-none disabled:opacity-50"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Scan Button */}
                    <div className="flex gap-3">
                        <button
                            onClick={startScan}
                            disabled={isScanning || !targetUrl}
                            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${isScanning || !targetUrl
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:shadow-lg hover:shadow-violet-500/25'
                                }`}
                        >
                            {isScanning ? (
                                <>
                                    <RefreshCw size={18} className="animate-spin" />
                                    {scanPhase}
                                </>
                            ) : (
                                <>
                                    <Play size={18} />
                                    Start DAST Scan
                                </>
                            )}
                        </button>
                    </div>

                    {/* Progress Bar */}
                    {(isScanning || scanPhase) && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">{scanPhase}</span>
                                <span className="text-blue-400">{scanProgress}%</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-300 ${scanPhase === 'Failed' || scanPhase === 'Timeout' ? 'bg-red-500' :
                                            scanPhase === 'Completed' ? 'bg-green-500' :
                                                'bg-gradient-to-r from-violet-500 to-purple-500'
                                        }`}
                                    style={{ width: `${scanProgress}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Scan History */}
            {scanHistory.length > 0 && (
                <div className="bg-slate-800/50 rounded-xl p-6 border border-white/5">
                    <h3 className="text-lg font-semibold text-white mb-4">Previous DAST Scans</h3>
                    <div className="space-y-2">
                        {scanHistory.slice(0, 5).map((scan, index) => (
                            <button
                                key={scan.id || index}
                                onClick={() => loadReport(scan)}
                                className="w-full flex items-center justify-between p-3 rounded-lg border transition-all bg-slate-900/50 border-white/5 hover:border-blue-500/30"
                            >
                                <div className="flex items-center gap-3">
                                    <Globe size={16} className="text-blue-400" />
                                    <div className="text-left">
                                        <p className="text-sm text-white">{scan.name || 'DAST Scan'}</p>
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

            {/* Findings */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-white/5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Security Findings</h3>
                    <div className="flex gap-2">
                        {severityCounts.critical > 0 && (
                            <span className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400">
                                {severityCounts.critical} Critical
                            </span>
                        )}
                        {severityCounts.high > 0 && (
                            <span className="px-2 py-1 rounded text-xs bg-orange-500/20 text-orange-400">
                                {severityCounts.high} High
                            </span>
                        )}
                        {severityCounts.medium > 0 && (
                            <span className="px-2 py-1 rounded text-xs bg-yellow-500/20 text-yellow-400">
                                {severityCounts.medium} Medium
                            </span>
                        )}
                        {severityCounts.low > 0 && (
                            <span className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400">
                                {severityCounts.low} Low
                            </span>
                        )}
                    </div>
                </div>

                {findings.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <Shield size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No findings yet</p>
                        <p className="text-sm mt-1">Run a DAST scan or select a previous scan to view results</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {findings.map((finding, index) => (
                            <div key={finding.id || index} className="border border-white/5 rounded-xl overflow-hidden">
                                <button
                                    onClick={() => setExpandedFinding(expandedFinding === index ? null : index)}
                                    className="w-full p-4 bg-slate-900/50 hover:bg-slate-900/80 transition-all"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(finding.severity)}`}>
                                                {finding.severity?.toUpperCase()}
                                            </span>
                                            <div className="text-left">
                                                <p className="font-medium text-white">{finding.title}</p>
                                                <p className="text-xs text-gray-500">
                                                    {finding.cweid && `CWE-${finding.cweid}`}
                                                    {finding.wascid && ` | WASC-${finding.wascid}`}
                                                </p>
                                            </div>
                                        </div>
                                        {finding.url && (
                                            <span className="px-2 py-1 rounded text-xs bg-slate-700 text-gray-400 max-w-xs truncate">
                                                {finding.method} {finding.url.length > 50 ? finding.url.substring(0, 50) + '...' : finding.url}
                                            </span>
                                        )}
                                    </div>
                                </button>

                                {expandedFinding === index && (
                                    <div className="p-4 border-t border-white/5 space-y-4">
                                        {finding.description && (
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 mb-2">DESCRIPTION:</p>
                                                <p className="text-sm text-gray-400">{finding.description}</p>
                                            </div>
                                        )}

                                        {finding.url && (
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 mb-2">AFFECTED URL:</p>
                                                <p className="text-sm text-blue-400 break-all">{finding.url}</p>
                                                {finding.param && (
                                                    <p className="text-xs text-gray-500 mt-1">Parameter: {finding.param}</p>
                                                )}
                                            </div>
                                        )}

                                        {finding.evidence && (
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 mb-2">EVIDENCE:</p>
                                                <pre className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm font-mono text-red-300 overflow-x-auto">
                                                    {finding.evidence}
                                                </pre>
                                            </div>
                                        )}

                                        {finding.solution && (
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 mb-2">SOLUTION:</p>
                                                <p className="text-sm text-green-400">{finding.solution}</p>
                                            </div>
                                        )}

                                        {finding.reference && (
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 mb-2">REFERENCES:</p>
                                                <p className="text-sm text-gray-400 break-all">{finding.reference}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
