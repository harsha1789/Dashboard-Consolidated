import React, { useState, useEffect } from 'react';
import { Code, Upload, Play, AlertTriangle, CheckCircle, ChevronDown, ChevronRight, ExternalLink, RefreshCw, MessageSquare, X, Info, Zap } from 'lucide-react';

// Helper to save reports to localStorage
const saveSecurityReport = (type, report) => {
    const stored = localStorage.getItem('securityReports');
    const reports = stored ? JSON.parse(stored) : { sast: [], dast: [], sca: [], threat: [] };
    reports[type] = [report, ...reports[type].slice(0, 19)]; // Keep last 20
    localStorage.setItem('securityReports', JSON.stringify(reports));
};

export default function SecuritySAST() {
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [scanPhase, setScanPhase] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [expandedVuln, setExpandedVuln] = useState(null);
    const [repoUrl, setRepoUrl] = useState('');
    const [vulnerabilities, setVulnerabilities] = useState([]);
    const [reports, setReports] = useState([]);
    const [error, setError] = useState(null);
    const [scannerInfo, setScannerInfo] = useState({ type: 'built-in', semgrepInstalled: false });
    const [commentModal, setCommentModal] = useState({ open: false, vulnIndex: null, comment: '', reviewStatus: '' });

    useEffect(() => {
        loadReports();
        checkSemgrep();
    }, []);

    const loadReports = () => {
        const stored = localStorage.getItem('securityReports');
        if (stored) {
            const data = JSON.parse(stored);
            setReports(data.sast || []);
        }
    };

    const checkSemgrep = async () => {
        // Check if semgrep is available (mock check - in real scenario this would call backend)
        setScannerInfo({ type: 'built-in', semgrepInstalled: false });
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setRepoUrl('');
        }
    };

    const simulateScan = async () => {
        if (!repoUrl && !selectedFile) {
            setError('Please provide a repository URL or upload a file');
            return;
        }

        setError(null);
        setIsScanning(true);
        setScanProgress(0);
        setScanPhase('Initializing scan...');
        setVulnerabilities([]);

        // Simulate scanning phases
        const phases = [
            { progress: 20, phase: 'Cloning/Reading source...' },
            { progress: 40, phase: 'Parsing code files...' },
            { progress: 60, phase: 'Running security patterns...' },
            { progress: 80, phase: 'Analyzing vulnerabilities...' },
            { progress: 100, phase: 'Generating report...' }
        ];

        for (const p of phases) {
            await new Promise(r => setTimeout(r, 800));
            setScanProgress(p.progress);
            setScanPhase(p.phase);
        }

        // Generate mock vulnerabilities based on input
        const mockVulns = generateMockVulnerabilities(selectedFile?.name || repoUrl);
        setVulnerabilities(mockVulns);

        // Save report
        const report = {
            id: Date.now(),
            title: selectedFile?.name || repoUrl.split('/').pop() || 'SAST Scan',
            timestamp: new Date().toISOString(),
            status: 'Completed',
            scanner: scannerInfo.type,
            counts: {
                critical: mockVulns.filter(v => v.severity === 'critical').length,
                high: mockVulns.filter(v => v.severity === 'high').length,
                medium: mockVulns.filter(v => v.severity === 'medium').length,
                low: mockVulns.filter(v => v.severity === 'low').length
            },
            findings: mockVulns
        };

        saveSecurityReport('sast', report);
        loadReports();

        setIsScanning(false);
        setScanPhase('Completed');
    };

    const generateMockVulnerabilities = (source) => {
        const vulnTypes = [
            { title: 'SQL Injection', severity: 'critical', cwe: 'CWE-89', owasp: 'A03:2021' },
            { title: 'Cross-Site Scripting (XSS)', severity: 'high', cwe: 'CWE-79', owasp: 'A03:2021' },
            { title: 'Hardcoded Credentials', severity: 'high', cwe: 'CWE-798', owasp: 'A07:2021' },
            { title: 'Path Traversal', severity: 'medium', cwe: 'CWE-22', owasp: 'A01:2021' },
            { title: 'Insecure Deserialization', severity: 'high', cwe: 'CWE-502', owasp: 'A08:2021' },
            { title: 'Missing Input Validation', severity: 'medium', cwe: 'CWE-20', owasp: 'A03:2021' },
            { title: 'Weak Cryptography', severity: 'medium', cwe: 'CWE-327', owasp: 'A02:2021' },
            { title: 'Information Disclosure', severity: 'low', cwe: 'CWE-200', owasp: 'A01:2021' }
        ];

        const count = Math.floor(Math.random() * 5) + 3;
        const selected = vulnTypes.sort(() => Math.random() - 0.5).slice(0, count);

        return selected.map((v, i) => ({
            id: i + 1,
            ...v,
            file: `src/${['auth', 'api', 'utils', 'controllers'][i % 4]}/${['index', 'handler', 'service'][i % 3]}.js`,
            line_number: Math.floor(Math.random() * 200) + 10,
            description: `Potential ${v.title.toLowerCase()} vulnerability detected in the code.`,
            code_snippet: `// Line ${Math.floor(Math.random() * 200) + 10}\nconst result = process(userInput);`,
            remediation: `Apply proper input validation and use parameterized queries/safe APIs.`,
            review_status: '',
            comment: ''
        }));
    };

    const updateVulnerability = () => {
        if (commentModal.vulnIndex === null) return;
        const updated = [...vulnerabilities];
        updated[commentModal.vulnIndex] = {
            ...updated[commentModal.vulnIndex],
            comment: commentModal.comment,
            review_status: commentModal.reviewStatus
        };
        setVulnerabilities(updated);
        setCommentModal({ open: false, vulnIndex: null, comment: '', reviewStatus: '' });
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

    const severityCounts = {
        critical: vulnerabilities.filter(v => v.severity === 'critical').length,
        high: vulnerabilities.filter(v => v.severity === 'high').length,
        medium: vulnerabilities.filter(v => v.severity === 'medium').length,
        low: vulnerabilities.filter(v => v.severity === 'low').length
    };

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

            {/* Scanner Info Banner */}
            <div className={`rounded-xl p-4 border ${scannerInfo.semgrepInstalled
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-yellow-500/10 border-yellow-500/30'
                }`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {scannerInfo.semgrepInstalled ? (
                            <>
                                <Zap size={20} className="text-green-400" />
                                <div>
                                    <p className="text-sm font-medium text-green-400">Using Semgrep Scanner</p>
                                    <p className="text-xs text-green-300/70">Enhanced security scanning with 2000+ rules</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <Info size={20} className="text-yellow-400" />
                                <div>
                                    <p className="text-sm font-medium text-yellow-400">Using Built-in Pattern Analyzer</p>
                                    <p className="text-xs text-yellow-300/70">Install Semgrep for enhanced scanning</p>
                                </div>
                            </>
                        )}
                    </div>
                    {!scannerInfo.semgrepInstalled && (
                        <a
                            href="https://semgrep.dev/docs/getting-started/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-all"
                        >
                            <ExternalLink size={14} />
                            Install Semgrep
                        </a>
                    )}
                </div>
            </div>

            {/* Upload Section */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-white/5">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Code size={20} className="text-purple-400" />
                    Static Application Security Testing (SAST)
                </h3>
                <p className="text-sm text-gray-400 mb-6">
                    Analyze source code for security vulnerabilities using pattern-based analysis.
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Repository URL */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Repository URL or Path</label>
                        <input
                            type="text"
                            value={repoUrl}
                            onChange={(e) => { setRepoUrl(e.target.value); setSelectedFile(null); }}
                            placeholder="https://github.com/user/repo or /path/to/code"
                            disabled={isScanning}
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-purple-500/50 focus:outline-none disabled:opacity-50"
                        />
                    </div>

                    {/* File Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Or Upload ZIP File</label>
                        <div className="border-2 border-dashed border-white/10 rounded-xl p-4 text-center hover:border-purple-500/50 transition-all cursor-pointer">
                            <input
                                type="file"
                                accept=".zip,.tar,.gz"
                                onChange={handleFileUpload}
                                className="hidden"
                                id="code-upload"
                                disabled={isScanning}
                            />
                            <label htmlFor="code-upload" className="cursor-pointer">
                                <Upload size={24} className="mx-auto mb-2 text-gray-500" />
                                <p className="text-gray-400 text-sm">Drop ZIP file or click to upload</p>
                            </label>
                            {selectedFile && (
                                <div className="mt-2 p-2 bg-purple-500/10 rounded-lg border border-purple-500/30">
                                    <p className="text-xs text-purple-400">{selectedFile.name}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Scan Button */}
                <div className="mt-6 flex items-center gap-4">
                    <button
                        onClick={simulateScan}
                        disabled={isScanning || (!selectedFile && !repoUrl)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${isScanning || (!selectedFile && !repoUrl)
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/25'
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
                                Start SAST Scan
                            </>
                        )}
                    </button>

                    {isScanning && (
                        <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                                style={{ width: `${scanProgress}%` }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Previous Scans */}
            {reports.length > 0 && (
                <div className="bg-slate-800/50 rounded-xl p-6 border border-white/5">
                    <h3 className="text-lg font-semibold text-white mb-4">Previous SAST Scans</h3>
                    <div className="space-y-2">
                        {reports.slice(0, 5).map((report, index) => (
                            <div
                                key={report.id || index}
                                className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-white/5"
                            >
                                <div className="flex items-center gap-3">
                                    <Code size={16} className="text-purple-400" />
                                    <div>
                                        <p className="text-sm text-white">{report.title}</p>
                                        <p className="text-xs text-gray-500">{new Date(report.timestamp).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {report.counts?.critical > 0 && <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">{report.counts.critical}</span>}
                                    {report.counts?.high > 0 && <span className="px-2 py-0.5 rounded text-xs bg-orange-500/20 text-orange-400">{report.counts.high}</span>}
                                    <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400">{report.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Vulnerabilities */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-white/5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Detected Vulnerabilities</h3>
                    <div className="flex gap-2">
                        {severityCounts.critical > 0 && <span className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400 border border-red-500/30">{severityCounts.critical} Critical</span>}
                        {severityCounts.high > 0 && <span className="px-2 py-1 rounded text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30">{severityCounts.high} High</span>}
                        {severityCounts.medium > 0 && <span className="px-2 py-1 rounded text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">{severityCounts.medium} Medium</span>}
                        {severityCounts.low > 0 && <span className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30">{severityCounts.low} Low</span>}
                    </div>
                </div>

                {vulnerabilities.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <Code size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No vulnerabilities detected</p>
                        <p className="text-sm mt-1">Run a SAST scan to analyze your code</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {vulnerabilities.map((vuln, index) => (
                            <div key={vuln.id || index} className="border border-white/5 rounded-xl overflow-hidden">
                                <button
                                    onClick={() => setExpandedVuln(expandedVuln === index ? null : index)}
                                    className="w-full flex items-center justify-between p-4 bg-slate-900/50 hover:bg-slate-900/80 transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <span className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(vuln.severity)}`}>
                                            {vuln.severity?.toUpperCase()}
                                        </span>
                                        <div className="text-left">
                                            <p className="font-medium text-white">{vuln.title}</p>
                                            <p className="text-xs text-gray-500">{vuln.file}:{vuln.line_number} | {vuln.cwe}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {vuln.review_status && <span className="px-2 py-1 rounded text-xs bg-slate-700 text-gray-400">{vuln.review_status}</span>}
                                        {expandedVuln === index ? <ChevronDown size={18} className="text-gray-500" /> : <ChevronRight size={18} className="text-gray-500" />}
                                    </div>
                                </button>

                                {expandedVuln === index && (
                                    <div className="p-4 border-t border-white/5 space-y-4">
                                        <p className="text-sm text-gray-400">{vuln.description}</p>
                                        {vuln.code_snippet && (
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 mb-2">VULNERABLE CODE:</p>
                                                <pre className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm font-mono text-red-300 overflow-x-auto">{vuln.code_snippet}</pre>
                                            </div>
                                        )}
                                        {vuln.remediation && (
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 mb-2">RECOMMENDATION:</p>
                                                <p className="text-sm text-gray-300">{vuln.remediation}</p>
                                            </div>
                                        )}
                                        {vuln.comment && (
                                            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                                                <p className="text-xs font-medium text-blue-400 mb-1">Comment:</p>
                                                <p className="text-sm text-gray-300">{vuln.comment}</p>
                                            </div>
                                        )}
                                        <div className="flex gap-2 flex-wrap">
                                            <a href={`https://cwe.mitre.org/data/definitions/${vuln.cwe?.replace('CWE-', '')}.html`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-slate-700 text-gray-300 hover:bg-slate-600 transition-all">
                                                <ExternalLink size={14} />{vuln.cwe}
                                            </a>
                                            <span className="px-3 py-1.5 rounded-lg text-xs bg-purple-500/20 text-purple-400">{vuln.owasp}</span>
                                            <button onClick={() => setCommentModal({ open: true, vulnIndex: index, comment: vuln.comment || '', reviewStatus: vuln.review_status || '' })} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all">
                                                <MessageSquare size={14} />Add Comment
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Comment Modal */}
            {commentModal.open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">Update Vulnerability</h3>
                            <button onClick={() => setCommentModal({ open: false, vulnIndex: null, comment: '', reviewStatus: '' })}><X size={20} className="text-gray-400 hover:text-white" /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Review Status</label>
                                <select value={commentModal.reviewStatus} onChange={(e) => setCommentModal({ ...commentModal, reviewStatus: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:border-purple-500/50 focus:outline-none">
                                    <option value="">Select status...</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Confirmed">Confirmed</option>
                                    <option value="False Positive">False Positive</option>
                                    <option value="Fixed">Fixed</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Comment</label>
                                <textarea value={commentModal.comment} onChange={(e) => setCommentModal({ ...commentModal, comment: e.target.value })} placeholder="Add your comment..." className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-gray-600 focus:border-purple-500/50 focus:outline-none h-24 resize-none" />
                            </div>
                            <button onClick={updateVulnerability} className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
