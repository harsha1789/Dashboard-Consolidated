import React, { useState, useEffect } from 'react';
import { AlertTriangle, Shield, Target, Users, Server, Database, Globe, Lock, Eye, Zap, FileText, Plus, ChevronRight, ChevronDown, RefreshCw, Upload, Play, MessageSquare, X, Image } from 'lucide-react';

// Helper to save security reports to localStorage
const saveSecurityReport = (type, report) => {
    const stored = localStorage.getItem('securityReports');
    const reports = stored ? JSON.parse(stored) : { sast: [], dast: [], sca: [], threat: [] };
    reports[type] = [report, ...reports[type].slice(0, 19)]; // Keep last 20
    localStorage.setItem('securityReports', JSON.stringify(reports));
};

// Mock threat generator
const generateMockThreats = (source) => {
    const strideThreats = [
        { category: 'Spoofing', threats: [
            { name: 'Authentication Bypass', desc: 'Attacker could bypass authentication mechanisms to gain unauthorized access', impact: 'Unauthorized access to system resources and data', mitigations: ['Implement multi-factor authentication', 'Use strong session management', 'Implement account lockout policies'] },
            { name: 'Session Hijacking', desc: 'Attacker could steal or forge session tokens to impersonate users', impact: 'Identity theft and unauthorized actions on behalf of users', mitigations: ['Use secure session tokens', 'Implement session timeout', 'Use HTTPS everywhere'] },
        ]},
        { category: 'Tampering', threats: [
            { name: 'Data Manipulation', desc: 'Attacker could modify data in transit or at rest without detection', impact: 'Data integrity compromised, incorrect business decisions', mitigations: ['Implement data integrity checks', 'Use digital signatures', 'Enable audit logging'] },
            { name: 'Code Injection', desc: 'Attacker could inject malicious code through user inputs', impact: 'Remote code execution, data breach', mitigations: ['Input validation', 'Parameterized queries', 'Content Security Policy'] },
        ]},
        { category: 'Repudiation', threats: [
            { name: 'Insufficient Logging', desc: 'Lack of audit trails makes it impossible to track malicious actions', impact: 'Cannot identify attackers or scope of breach', mitigations: ['Implement comprehensive logging', 'Store logs securely', 'Set up log monitoring'] },
            { name: 'Missing Non-repudiation', desc: 'Users could deny performing certain actions', impact: 'Disputes and compliance issues', mitigations: ['Digital signatures', 'Transaction logging', 'Timestamps'] },
        ]},
        { category: 'Information Disclosure', threats: [
            { name: 'Sensitive Data Exposure', desc: 'Sensitive information could be exposed through insecure storage or transmission', impact: 'Privacy violations, compliance penalties', mitigations: ['Encrypt sensitive data', 'Use secure protocols', 'Implement access controls'] },
            { name: 'Error Message Leakage', desc: 'Detailed error messages reveal system information to attackers', impact: 'Attackers gain knowledge of system internals', mitigations: ['Generic error messages', 'Secure error handling', 'Log details server-side only'] },
        ]},
        { category: 'Denial of Service', threats: [
            { name: 'Resource Exhaustion', desc: 'Attacker could exhaust system resources making service unavailable', impact: 'Service downtime, revenue loss', mitigations: ['Rate limiting', 'Resource quotas', 'Auto-scaling'] },
            { name: 'Application-layer DoS', desc: 'Targeting specific endpoints with expensive operations', impact: 'Degraded performance, service unavailability', mitigations: ['Request throttling', 'Caching', 'CDN protection'] },
        ]},
        { category: 'Elevation of Privilege', threats: [
            { name: 'Privilege Escalation', desc: 'Attacker could gain higher privileges than authorized', impact: 'Full system compromise', mitigations: ['Principle of least privilege', 'Role-based access control', 'Regular permission audits'] },
            { name: 'Insecure Direct Object References', desc: 'Accessing resources by manipulating object references', impact: 'Access to unauthorized data', mitigations: ['Indirect references', 'Authorization checks', 'Access control validation'] },
        ]},
    ];

    const severities = ['critical', 'high', 'medium', 'low'];
    const threats = [];

    // Randomly select some threats from each category
    strideThreats.forEach(cat => {
        const selectedThreats = cat.threats.filter(() => Math.random() > 0.3);
        selectedThreats.forEach(t => {
            threats.push({
                id: `THREAT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: t.name,
                category: cat.category,
                description: t.desc,
                severity: severities[Math.floor(Math.random() * severities.length)],
                impact: t.impact,
                mitigations: t.mitigations,
                asset: ['API Gateway', 'Database', 'Authentication Service', 'Web Application', 'File Storage'][Math.floor(Math.random() * 5)],
                review_status: null,
                comment: null
            });
        });
    });

    return threats;
};

// Generate mock diagrams
const generateMockDiagrams = () => ({
    sequence: `sequenceDiagram
    participant User
    participant WebApp
    participant API
    participant Database

    User->>WebApp: Login Request
    WebApp->>API: Authenticate
    API->>Database: Validate Credentials
    Database-->>API: User Data
    API-->>WebApp: JWT Token
    WebApp-->>User: Session Created`,
    flow: `flowchart TD
    A[User Browser] --> B[Load Balancer]
    B --> C[Web Server]
    C --> D[API Gateway]
    D --> E[Auth Service]
    D --> F[Business Logic]
    F --> G[(Database)]
    E --> G`
});

export default function SecurityThreatModel() {
    const [selectedThreat, setSelectedThreat] = useState(null);
    const [threats, setThreats] = useState([]);
    const [diagrams, setDiagrams] = useState({ sequence: null, flow: null });
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [scanPhase, setScanPhase] = useState('');
    const [error, setError] = useState(null);
    const [scanHistory, setScanHistory] = useState([]);
    const [repoUrl, setRepoUrl] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [commentModal, setCommentModal] = useState({ open: false, threatId: null, comment: '', reviewStatus: '' });
    const [expandedThreat, setExpandedThreat] = useState(null);
    const [showDiagram, setShowDiagram] = useState(null);

    // Load scan history from localStorage on mount
    useEffect(() => {
        loadScanHistory();
    }, []);

    const loadScanHistory = () => {
        const stored = localStorage.getItem('securityReports');
        if (stored) {
            try {
                const reports = JSON.parse(stored);
                setScanHistory(reports.threat || []);
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
        if (!repoUrl && !selectedFile) {
            setError('Please provide a repository URL or upload a ZIP file');
            return;
        }

        setError(null);
        setIsScanning(true);
        setScanProgress(0);
        setScanPhase('Starting threat modeling...');
        setThreats([]);
        setDiagrams({ sequence: null, flow: null });

        // Simulate scanning phases
        const phases = [
            { phase: 'Analyzing source code...', progress: 15 },
            { phase: 'Identifying components...', progress: 30 },
            { phase: 'Mapping data flows...', progress: 45 },
            { phase: 'Applying STRIDE methodology...', progress: 60 },
            { phase: 'Generating threat scenarios...', progress: 75 },
            { phase: 'Creating diagrams...', progress: 90 },
            { phase: 'Compiling report...', progress: 95 },
        ];

        for (const step of phases) {
            await new Promise(resolve => setTimeout(resolve, 700 + Math.random() * 500));
            setScanProgress(step.progress);
            setScanPhase(step.phase);
        }

        // Generate mock threats and diagrams
        const mockThreats = generateMockThreats(repoUrl || selectedFile?.name);
        const mockDiagrams = generateMockDiagrams();

        setThreats(mockThreats);
        setDiagrams(mockDiagrams);
        setScanProgress(100);
        setScanPhase('Completed');
        setIsScanning(false);

        // Calculate summary by severity
        const summary = {
            critical: mockThreats.filter(t => t.severity === 'critical').length,
            high: mockThreats.filter(t => t.severity === 'high').length,
            medium: mockThreats.filter(t => t.severity === 'medium').length,
            low: mockThreats.filter(t => t.severity === 'low').length,
        };

        // Save report to localStorage
        const report = {
            id: `THREAT-${Date.now()}`,
            name: `Threat Model - ${repoUrl ? new URL(repoUrl).pathname.split('/').pop() : selectedFile?.name}`,
            source: repoUrl || selectedFile?.name,
            date: new Date().toISOString(),
            status: 'Completed',
            threats: mockThreats,
            diagrams: mockDiagrams,
            summary
        };

        saveSecurityReport('threat', report);
        loadScanHistory();
    };

    const loadReport = (report) => {
        setThreats(report.threats || []);
        setDiagrams(report.diagrams || { sequence: null, flow: null });
        setScanPhase('Completed');
        setScanProgress(100);
    };

    const updateThreatLocal = () => {
        if (!commentModal.threatId) return;

        const updatedThreats = threats.map(t => {
            if (t.id === commentModal.threatId) {
                return {
                    ...t,
                    comment: commentModal.comment,
                    review_status: commentModal.reviewStatus
                };
            }
            return t;
        });

        setThreats(updatedThreats);
        setCommentModal({ open: false, threatId: null, comment: '', reviewStatus: '' });
    };

    const getRiskColor = (risk) => {
        const riskLower = (risk || '').toLowerCase();
        switch (riskLower) {
            case 'critical': return 'text-red-400 bg-red-500/20 border-red-500/30';
            case 'high': return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
            case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
            case 'low': return 'text-green-400 bg-green-500/20 border-green-500/30';
            default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
        }
    };

    const strideCategories = [
        { name: 'Spoofing', description: 'Impersonating something or someone', color: 'text-red-400' },
        { name: 'Tampering', description: 'Modifying data or code', color: 'text-orange-400' },
        { name: 'Repudiation', description: 'Claiming to not have performed an action', color: 'text-yellow-400' },
        { name: 'Information Disclosure', description: 'Exposing information to unauthorized users', color: 'text-green-400' },
        { name: 'Denial of Service', description: 'Denying or degrading service to users', color: 'text-blue-400' },
        { name: 'Elevation of Privilege', description: 'Gaining capabilities without authorization', color: 'text-purple-400' }
    ];

    const threatsBySeverity = {
        critical: threats.filter(t => t.severity?.toLowerCase() === 'critical'),
        high: threats.filter(t => t.severity?.toLowerCase() === 'high'),
        medium: threats.filter(t => t.severity?.toLowerCase() === 'medium'),
        low: threats.filter(t => t.severity?.toLowerCase() === 'low')
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

            {/* Header */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-white/5">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <AlertTriangle size={20} className="text-orange-400" />
                    Threat Modeling (STRIDE)
                </h3>
                <p className="text-sm text-gray-400 mb-6">
                    Analyze your application architecture to identify potential security threats using AI-powered STRIDE methodology.
                </p>

                {/* STRIDE Legend */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                    {strideCategories.map(cat => (
                        <div key={cat.name} className="p-3 bg-slate-900/50 rounded-lg border border-white/5">
                            <p className={`font-medium text-sm ${cat.color}`}>{cat.name[0]}</p>
                            <p className="text-xs text-gray-500 mt-1">{cat.name}</p>
                        </div>
                    ))}
                </div>

                {/* Input Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Repository URL */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Repository URL</label>
                            <input
                                type="url"
                                value={repoUrl}
                                onChange={(e) => setRepoUrl(e.target.value)}
                                placeholder="https://github.com/user/repo"
                                disabled={isScanning || selectedFile}
                                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-orange-500/50 focus:outline-none disabled:opacity-50"
                            />
                        </div>
                    </div>

                    {/* File Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Or Upload ZIP File</label>
                        <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:border-orange-500/50 transition-all cursor-pointer h-[76px] flex flex-col justify-center">
                            <input
                                type="file"
                                accept=".zip"
                                onChange={handleFileUpload}
                                className="hidden"
                                id="threat-upload"
                                disabled={isScanning || repoUrl}
                            />
                            <label htmlFor="threat-upload" className="cursor-pointer">
                                <div className="flex items-center justify-center gap-2">
                                    <Upload size={20} className="text-gray-500" />
                                    <p className="text-gray-400 text-sm">Upload source code ZIP</p>
                                </div>
                            </label>
                            {selectedFile && (
                                <div className="mt-2 p-2 bg-orange-500/10 rounded-lg border border-orange-500/30">
                                    <p className="text-xs text-orange-400">{selectedFile.name}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Scan Button */}
                <div className="mt-6 flex items-center gap-4">
                    <button
                        onClick={startScan}
                        disabled={isScanning || (!selectedFile && !repoUrl)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${isScanning || (!selectedFile && !repoUrl)
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:shadow-lg hover:shadow-orange-500/25'
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
                                Start Threat Modeling
                            </>
                        )}
                    </button>

                    {isScanning && (
                        <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-300"
                                style={{ width: `${scanProgress}%` }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Scan History */}
            {scanHistory.length > 0 && (
                <div className="bg-slate-800/50 rounded-xl p-6 border border-white/5">
                    <h3 className="text-lg font-semibold text-white mb-4">Previous Threat Models</h3>
                    <div className="space-y-2">
                        {scanHistory.slice(0, 5).map((scan, index) => (
                            <button
                                key={scan.id || index}
                                onClick={() => loadReport(scan)}
                                className="w-full flex items-center justify-between p-3 rounded-lg border transition-all bg-slate-900/50 border-white/5 hover:border-orange-500/30"
                            >
                                <div className="flex items-center gap-3">
                                    <AlertTriangle size={16} className="text-orange-400" />
                                    <div className="text-left">
                                        <p className="text-sm text-white">{scan.name || 'Threat Model'}</p>
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

            {/* Diagrams */}
            {(diagrams.sequence || diagrams.flow) && (
                <div className="bg-slate-800/50 rounded-xl p-6 border border-white/5">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Image size={20} className="text-orange-400" />
                        Architecture Diagrams
                    </h3>
                    <div className="flex gap-4">
                        {diagrams.sequence && (
                            <button
                                onClick={() => setShowDiagram(showDiagram === 'sequence' ? null : 'sequence')}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900/50 border border-white/10 hover:border-orange-500/30 transition-all"
                            >
                                <FileText size={16} className="text-orange-400" />
                                <span className="text-sm text-white">Sequence Diagram</span>
                            </button>
                        )}
                        {diagrams.flow && (
                            <button
                                onClick={() => setShowDiagram(showDiagram === 'flow' ? null : 'flow')}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900/50 border border-white/10 hover:border-orange-500/30 transition-all"
                            >
                                <FileText size={16} className="text-blue-400" />
                                <span className="text-sm text-white">Data Flow Diagram</span>
                            </button>
                        )}
                    </div>
                    {showDiagram && (
                        <div className="mt-4 p-4 bg-slate-900/50 rounded-xl border border-white/5">
                            <pre className="text-sm text-gray-300 whitespace-pre-wrap overflow-x-auto">
                                {showDiagram === 'sequence' ? diagrams.sequence : diagrams.flow}
                            </pre>
                        </div>
                    )}
                </div>
            )}

            {/* Stats */}
            {threats.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                            <Target size={16} className="text-orange-400" />
                            <span className="text-xs text-gray-500">Total Threats</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{threats.length}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle size={16} className="text-red-400" />
                            <span className="text-xs text-gray-500">Critical Risk</span>
                        </div>
                        <p className="text-2xl font-bold text-red-400">{threatsBySeverity.critical.length}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                            <Shield size={16} className="text-orange-400" />
                            <span className="text-xs text-gray-500">High Risk</span>
                        </div>
                        <p className="text-2xl font-bold text-orange-400">{threatsBySeverity.high.length}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                            <Eye size={16} className="text-yellow-400" />
                            <span className="text-xs text-gray-500">Medium Risk</span>
                        </div>
                        <p className="text-2xl font-bold text-yellow-400">{threatsBySeverity.medium.length}</p>
                    </div>
                </div>
            )}

            {/* Threats List */}
            {threats.length > 0 && (
                <div className="bg-slate-800/50 rounded-xl p-6 border border-white/5">
                    <h3 className="text-lg font-semibold text-white mb-4">Identified Threats</h3>
                    <div className="space-y-3">
                        {threats.map((threat, index) => (
                            <div key={threat.id || index} className="border border-white/5 rounded-xl overflow-hidden">
                                <button
                                    onClick={() => setExpandedThreat(expandedThreat === index ? null : index)}
                                    className="w-full p-4 bg-slate-900/50 hover:bg-slate-900/80 transition-all"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3">
                                            <span className={`px-2 py-1 rounded text-xs font-medium border ${getRiskColor(threat.severity)}`}>
                                                {(threat.severity || 'unknown').toUpperCase()}
                                            </span>
                                            <div className="text-left">
                                                <p className="font-medium text-white">{threat.name}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {threat.category && (
                                                        <span className="px-2 py-0.5 rounded text-xs bg-slate-700 text-gray-400">
                                                            {threat.category}
                                                        </span>
                                                    )}
                                                    {threat.asset && (
                                                        <span className="text-xs text-gray-500">{threat.asset}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {threat.review_status && (
                                                <span className="px-2 py-1 rounded text-xs bg-slate-700 text-gray-400">
                                                    {threat.review_status}
                                                </span>
                                            )}
                                            {expandedThreat === index ?
                                                <ChevronDown size={18} className="text-gray-500" /> :
                                                <ChevronRight size={18} className="text-gray-500" />
                                            }
                                        </div>
                                    </div>
                                </button>

                                {expandedThreat === index && (
                                    <div className="p-4 border-t border-white/5 space-y-4">
                                        {threat.description && (
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 mb-2">DESCRIPTION:</p>
                                                <p className="text-sm text-gray-400">{threat.description}</p>
                                            </div>
                                        )}

                                        {threat.impact && (
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 mb-2">IMPACT:</p>
                                                <p className="text-sm text-gray-400">{threat.impact}</p>
                                            </div>
                                        )}

                                        {threat.mitigations && threat.mitigations.length > 0 && (
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 mb-2">MITIGATIONS:</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {threat.mitigations.map((m, i) => (
                                                        <span key={i} className="px-2 py-1 rounded text-xs bg-green-500/10 text-green-400 border border-green-500/20">
                                                            {m}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {threat.comment && (
                                            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                                                <p className="text-xs font-medium text-blue-400 mb-1">Comment:</p>
                                                <p className="text-sm text-gray-300">{threat.comment}</p>
                                            </div>
                                        )}

                                        <button
                                            onClick={() => setCommentModal({
                                                open: true,
                                                threatId: threat.id,
                                                comment: threat.comment || '',
                                                reviewStatus: threat.review_status || ''
                                            })}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all"
                                        >
                                            <MessageSquare size={14} />
                                            Add Comment
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {threats.length === 0 && !isScanning && (
                <div className="bg-slate-800/50 rounded-xl p-12 border border-white/5 text-center">
                    <AlertTriangle size={48} className="mx-auto mb-4 text-gray-500 opacity-50" />
                    <p className="text-gray-400">No threat models yet</p>
                    <p className="text-sm text-gray-500 mt-1">Upload source code or provide a repository URL to start threat modeling</p>
                </div>
            )}

            {/* Comment Modal */}
            {commentModal.open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">Update Threat</h3>
                            <button onClick={() => setCommentModal({ open: false, threatId: null, comment: '', reviewStatus: '' })}>
                                <X size={20} className="text-gray-400 hover:text-white" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Review Status</label>
                                <select
                                    value={commentModal.reviewStatus}
                                    onChange={(e) => setCommentModal({ ...commentModal, reviewStatus: e.target.value })}
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:border-orange-500/50 focus:outline-none"
                                >
                                    <option value="">Select status...</option>
                                    <option value="pending">Pending</option>
                                    <option value="accepted">Accepted</option>
                                    <option value="mitigated">Mitigated</option>
                                    <option value="false_positive">False Positive</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Comment</label>
                                <textarea
                                    value={commentModal.comment}
                                    onChange={(e) => setCommentModal({ ...commentModal, comment: e.target.value })}
                                    placeholder="Add your comment..."
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-gray-600 focus:border-orange-500/50 focus:outline-none h-24 resize-none"
                                />
                            </div>
                            <button
                                onClick={updateThreatLocal}
                                className="w-full px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-orange-500/25 transition-all"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
