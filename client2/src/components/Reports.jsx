import React, { useState, useEffect } from 'react';
import { FileText, Camera, Download, Eye, FlaskConical, Monitor, CheckCircle, XCircle, Clock, Shield, Code, Globe, Package, AlertTriangle, ChevronRight, ExternalLink, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { getReports } from '../api/visualApi';

const TabButton = ({ active, onClick, icon: Icon, label, color }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            active
                ? `bg-${color}-500/20 text-${color}-400 border border-${color}-500/30`
                : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
        }`}
    >
        <Icon size={16} />
        {label}
    </button>
);

const ReportCard = ({ title, status, timestamp, type, onClick, color, subtitle, counts }) => (
    <div
        onClick={onClick}
        className={`bg-slate-800/50 rounded-xl p-4 border border-white/5 hover:border-${color}-500/30 cursor-pointer transition-all hover:bg-slate-800/80`}
    >
        <div className="flex items-start justify-between mb-3">
            <div className={`p-2 rounded-lg bg-${color}-500/20`}>
                {type === 'visual' ? <Eye size={18} className={`text-${color}-400`} /> :
                 type === 'functional' ? <FlaskConical size={18} className={`text-${color}-400`} /> :
                 type === 'sast' ? <Code size={18} className={`text-${color}-400`} /> :
                 type === 'dast' ? <Globe size={18} className={`text-${color}-400`} /> :
                 type === 'sca' ? <Package size={18} className={`text-${color}-400`} /> :
                 type === 'threat' ? <AlertTriangle size={18} className={`text-${color}-400`} /> :
                 <Monitor size={18} className={`text-${color}-400`} />}
            </div>
            <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${
                status === 'passed' || status === 'Passed' || status === 'Completed' || status === 'completed'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : status === 'failed' || status === 'Failed'
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-yellow-500/20 text-yellow-400'
            }`}>
                {status === 'passed' || status === 'Passed' || status === 'Completed' || status === 'completed' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                {status}
            </span>
        </div>
        <h4 className="text-white font-medium text-sm mb-1 truncate">{title}</h4>
        {subtitle && <p className="text-gray-500 text-xs mb-2">{subtitle}</p>}
        <p className="text-gray-500 text-xs flex items-center gap-1">
            <Clock size={12} />
            {new Date(timestamp).toLocaleString()}
        </p>
        {counts && (
            <div className="flex gap-2 mt-3 flex-wrap">
                {counts.critical > 0 && <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">{counts.critical} Critical</span>}
                {counts.high > 0 && <span className="px-2 py-0.5 rounded text-xs bg-orange-500/20 text-orange-400">{counts.high} High</span>}
                {counts.medium > 0 && <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400">{counts.medium} Medium</span>}
            </div>
        )}
    </div>
);

export default function Reports({ reportKey }) {
    const [activeTab, setActiveTab] = useState('functional');
    const [visualReports, setVisualReports] = useState([]);
    const [functionalHistory, setFunctionalHistory] = useState([]);
    const [playwrightHistory, setPlaywrightHistory] = useState([]);
    const [securityReports, setSecurityReports] = useState({ sast: [], dast: [], sca: [], threat: [] });
    const [selectedSecurityReport, setSelectedSecurityReport] = useState(null);

    useEffect(() => {
        fetchVisualReports();
        fetchFunctionalHistory();
        fetchPlaywrightHistory();
        loadSecurityReports();
    }, []);

    const fetchVisualReports = async () => {
        try {
            const reports = await getReports();
            setVisualReports(reports || []);
        } catch (err) {
            console.error('Failed to fetch visual reports:', err);
        }
    };

    const fetchFunctionalHistory = async () => {
        try {
            const res = await axios.get('/api/functional/history');
            setFunctionalHistory(res.data || []);
        } catch (err) {
            console.error('Failed to fetch functional history:', err);
        }
    };

    const fetchPlaywrightHistory = async () => {
        try {
            const res = await axios.get('/api/history');
            setPlaywrightHistory(res.data || []);
        } catch (err) {
            console.error('Failed to fetch playwright history:', err);
        }
    };

    const loadSecurityReports = () => {
        // Load security reports from localStorage
        const stored = localStorage.getItem('securityReports');
        if (stored) {
            try {
                setSecurityReports(JSON.parse(stored));
            } catch (e) {
                console.error('Failed to parse security reports:', e);
            }
        }
    };

    const getSeverityColor = (severity) => {
        switch (severity?.toLowerCase()) {
            case 'critical': return 'text-red-400 bg-red-500/20';
            case 'high': return 'text-orange-400 bg-orange-500/20';
            case 'medium': return 'text-yellow-400 bg-yellow-500/20';
            case 'low': return 'text-blue-400 bg-blue-500/20';
            default: return 'text-gray-400 bg-gray-500/20';
        }
    };

    const renderSecurityReportDetail = () => {
        if (!selectedSecurityReport) return null;

        const report = selectedSecurityReport;

        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">
                        {report.type === 'sast' ? 'SAST Vulnerabilities' :
                         report.type === 'dast' ? 'DAST Findings' :
                         report.type === 'sca' ? 'SCA Dependencies' : 'Threat Model'}
                    </h3>
                    <span className="text-sm text-gray-400">
                        {report.findings?.length || 0} issues found
                    </span>
                </div>
                {report.scanner && (
                    <div className="text-xs text-gray-500">
                        Scanner: {report.scanner === 'semgrep' ? 'Semgrep' : 'Built-in Pattern Analyzer'}
                    </div>
                )}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {report.findings?.map((finding, i) => (
                        <div key={i} className="p-3 bg-slate-900/50 rounded-lg border border-white/5">
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(finding.severity)}`}>
                                    {finding.severity?.toUpperCase() || 'INFO'}
                                </span>
                                <span className="text-sm text-white">{finding.title || finding.name}</span>
                            </div>
                            {finding.file && <p className="text-xs text-gray-500">{finding.file}:{finding.line}</p>}
                            {finding.url && <p className="text-xs text-blue-400">{finding.url}</p>}
                            {finding.description && <p className="text-xs text-gray-400 mt-2">{finding.description}</p>}
                        </div>
                    )) || (
                        <div className="text-center py-8 text-gray-500">
                            <p>No detailed findings available</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const allSecurityReports = [
        ...securityReports.sast.map(r => ({ ...r, type: 'sast' })),
        ...securityReports.dast.map(r => ({ ...r, type: 'dast' })),
        ...securityReports.sca.map(r => ({ ...r, type: 'sca' })),
        ...securityReports.threat.map(r => ({ ...r, type: 'threat' }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return (
        <div className="flex-1 w-full h-full bg-slate-950 relative flex flex-col pt-10">
            {/* Header */}
            <div className="bg-slate-900 border-b border-white/10 p-4 shrink-0">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <FileText size={20} className="text-violet-400" /> Test Reports
                    </h2>
                    <div className="flex gap-2 flex-wrap">
                        <TabButton
                            active={activeTab === 'playwright'}
                            onClick={() => setActiveTab('playwright')}
                            icon={Monitor}
                            label="Playwright"
                            color="violet"
                        />
                        <TabButton
                            active={activeTab === 'functional'}
                            onClick={() => setActiveTab('functional')}
                            icon={FlaskConical}
                            label="Functional"
                            color="orange"
                        />
                        <TabButton
                            active={activeTab === 'visual'}
                            onClick={() => setActiveTab('visual')}
                            icon={Eye}
                            label="Visual"
                            color="purple"
                        />
                        <TabButton
                            active={activeTab === 'security'}
                            onClick={() => setActiveTab('security')}
                            icon={Shield}
                            label="Security"
                            color="red"
                        />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 relative w-full overflow-hidden">
                {/* Playwright Reports Tab */}
                {activeTab === 'playwright' && (
                    <div className="h-full flex flex-col overflow-hidden">
                        <div className="bg-slate-900/50 p-3 border-b border-white/5 flex justify-between items-center gap-3">
                            <p className="text-gray-400 text-sm">Playwright test execution history ({playwrightHistory.length} runs)</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => window.open('/api/report/screenshots', '_blank')}
                                    className="px-4 py-2 bg-slate-800 border border-white/10 hover:bg-slate-700 text-white rounded-lg font-bold text-sm flex items-center gap-2 transition-all active:scale-95"
                                >
                                    <Camera size={16} className="text-red-400" /> Failed Screenshots
                                </button>
                                <button
                                    onClick={() => window.open('/api/report/pdf', '_blank')}
                                    className="px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-500 hover:shadow-lg hover:shadow-violet-500/30 text-white rounded-lg font-bold text-sm flex items-center gap-2 transition-all active:scale-95"
                                >
                                    <Download size={16} /> Save as PDF
                                </button>
                                <button
                                    onClick={() => window.open('/report/index.html', '_blank')}
                                    className="px-4 py-2 bg-slate-800 border border-white/10 hover:bg-slate-700 text-white rounded-lg font-bold text-sm flex items-center gap-2 transition-all active:scale-95"
                                >
                                    <ExternalLink size={16} /> Open HTML Report
                                </button>
                            </div>
                        </div>
                        {playwrightHistory.length > 0 ? (
                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {playwrightHistory.map((run, index) => (
                                        <ReportCard
                                            key={run.runId || index}
                                            title={`Run #${run.runId?.slice(-6) || index + 1}`}
                                            subtitle={`${run.region || 'N/A'} - ${run.scripts?.join(', ') || 'No scripts'}`}
                                            status={run.status}
                                            timestamp={run.timestamp}
                                            type="playwright"
                                            color="violet"
                                            onClick={() => {
                                                window.open('/report/index.html', '_blank');
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center bg-slate-950">
                                <div className="text-center">
                                    <Monitor size={48} className="mx-auto mb-4 text-violet-400/30" />
                                    <p className="text-gray-400">No Playwright test reports yet</p>
                                    <p className="text-gray-500 text-sm">Run Playwright tests from the main dashboard to generate reports</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Functional Reports Tab */}
                {activeTab === 'functional' && (
                    <div className="h-full flex flex-col overflow-hidden">
                        <div className="bg-slate-900/50 p-3 border-b border-white/5 flex justify-between items-center gap-3">
                            <p className="text-gray-400 text-sm">Functional test execution history ({functionalHistory.length} runs)</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => window.open('/api/functional/report/screenshots', '_blank')}
                                    className="px-4 py-2 bg-slate-800 border border-white/10 hover:bg-slate-700 text-white rounded-lg font-bold text-sm flex items-center gap-2 transition-all active:scale-95"
                                >
                                    <Camera size={16} className="text-red-400" /> Failed Screenshots
                                </button>
                                <button
                                    onClick={() => window.open('/api/functional/report/pdf', '_blank')}
                                    className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:shadow-lg hover:shadow-orange-500/30 text-white rounded-lg font-bold text-sm flex items-center gap-2 transition-all active:scale-95"
                                >
                                    <Download size={16} /> Save as PDF
                                </button>
                            </div>
                        </div>
                        {functionalHistory.length > 0 ? (
                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {functionalHistory.map((run, index) => (
                                        <ReportCard
                                            key={run.runId || index}
                                            title={`Run #${run.runId?.slice(-6) || index + 1}`}
                                            subtitle={`${run.region || 'N/A'} - ${run.scripts?.join(', ') || 'No scripts'}`}
                                            status={run.status}
                                            timestamp={run.timestamp}
                                            type="functional"
                                            color="orange"
                                            onClick={() => {
                                                // Open detailed view or HTML report
                                                window.open(`/functional-report/index.html?t=${run.runId}`, '_blank');
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center bg-slate-950">
                                <div className="text-center">
                                    <FlaskConical size={48} className="mx-auto mb-4 text-orange-400/30" />
                                    <p className="text-gray-400">No functional test reports yet</p>
                                    <p className="text-gray-500 text-sm">Run a functional test to generate reports</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Visual Reports Tab */}
                {activeTab === 'visual' && (
                    <div className="h-full overflow-y-auto p-6">
                        {visualReports.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {visualReports.map((report) => (
                                    <ReportCard
                                        key={report.id}
                                        title={report.site || report.url || 'Visual Test'}
                                        status={report.passed ? 'passed' : 'failed'}
                                        timestamp={report.timestamp}
                                        type="visual"
                                        color="purple"
                                        onClick={() => window.open(`/api/visual/reports/${report.id}`, '_blank')}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center h-full">
                                <div className="text-center">
                                    <Eye size={48} className="mx-auto mb-4 text-purple-400/30" />
                                    <p className="text-gray-400">No visual test reports yet</p>
                                    <p className="text-gray-500 text-sm">Run a visual test to generate reports</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Security Reports Tab */}
                {activeTab === 'security' && (
                    <div className="h-full overflow-y-auto p-6">
                        {selectedSecurityReport ? (
                            <div className="space-y-4">
                                <button
                                    onClick={() => setSelectedSecurityReport(null)}
                                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-all"
                                >
                                    <ChevronRight size={16} className="rotate-180" />
                                    Back to reports
                                </button>
                                <div className="bg-slate-800/50 rounded-xl p-6 border border-white/5">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className={`p-2 rounded-lg ${
                                            selectedSecurityReport.type === 'sast' ? 'bg-purple-500/20' :
                                            selectedSecurityReport.type === 'dast' ? 'bg-blue-500/20' :
                                            selectedSecurityReport.type === 'sca' ? 'bg-green-500/20' :
                                            'bg-orange-500/20'
                                        }`}>
                                            {selectedSecurityReport.type === 'sast' ? <Code size={20} className="text-purple-400" /> :
                                             selectedSecurityReport.type === 'dast' ? <Globe size={20} className="text-blue-400" /> :
                                             selectedSecurityReport.type === 'sca' ? <Package size={20} className="text-green-400" /> :
                                             <AlertTriangle size={20} className="text-orange-400" />}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-white">{selectedSecurityReport.title}</h3>
                                            <p className="text-xs text-gray-500">{new Date(selectedSecurityReport.timestamp).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    {renderSecurityReportDetail()}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Refresh Button */}
                                <div className="flex justify-end">
                                    <button
                                        onClick={loadSecurityReports}
                                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-slate-700 transition-all"
                                    >
                                        <RefreshCw size={16} />
                                        Refresh
                                    </button>
                                </div>

                                {allSecurityReports.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {allSecurityReports.map((report, index) => (
                                            <ReportCard
                                                key={report.id || index}
                                                title={report.title}
                                                subtitle={report.type === 'sast' ? (report.scanner === 'semgrep' ? 'Semgrep Scanner' : 'Built-in Analyzer') :
                                                         report.type === 'dast' ? 'Dynamic Analysis' :
                                                         report.type === 'sca' ? 'Dependency Check' : 'STRIDE Analysis'}
                                                status={report.status || 'Completed'}
                                                timestamp={report.timestamp}
                                                type={report.type}
                                                color={report.type === 'sast' ? 'purple' :
                                                       report.type === 'dast' ? 'blue' :
                                                       report.type === 'sca' ? 'green' : 'orange'}
                                                counts={report.counts}
                                                onClick={() => setSelectedSecurityReport(report)}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-64">
                                        <div className="text-center">
                                            <Shield size={48} className="mx-auto mb-4 text-red-400/30" />
                                            <p className="text-gray-400">No security reports yet</p>
                                            <p className="text-gray-500 text-sm mt-2">
                                                Run security scans from the Security Testing tab to generate reports
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
