import React, { useState, useEffect } from 'react';
import { Shield, Code, Globe, Package, AlertTriangle, ChevronRight, Upload, Play, FileSearch, Bug, Lock, Server, Database, Activity, RefreshCw } from 'lucide-react';

// Sub-components
import SecuritySAST from './SecuritySAST';
import SecurityDAST from './SecurityDAST';
import SecuritySCA from './SecuritySCA';
import SecurityThreatModel from './SecurityThreatModel';

const TabButton = ({ icon, label, active, onClick, badge }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all text-sm font-medium ${active
            ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-400 border border-orange-500/30'
            : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
    >
        {icon}
        <span>{label}</span>
        {badge && badge.count > 0 && (
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${badge.type === 'critical' ? 'bg-red-500/20 text-red-400' :
                badge.type === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-green-500/20 text-green-400'
                }`}>
                {badge.count}
            </span>
        )}
    </button>
);

const StatCard = ({ icon, label, value, color, trend }) => (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
        <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${color}`}>
                {icon}
            </div>
            <span className="text-gray-400 text-sm">{label}</span>
        </div>
        <div className="flex items-end justify-between">
            <span className="text-2xl font-bold text-white">{value}</span>
            {trend && (
                <span className={`text-xs ${trend > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {trend > 0 ? '+' : ''}{trend}%
                </span>
            )}
        </div>
    </div>
);

export default function SecurityDashboard() {
    const [activeSubTab, setActiveSubTab] = useState('overview');
    const [scanHistory, setScanHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [scanCounts, setScanCounts] = useState({
        sast: 0,
        dast: 0,
        sca: 0,
        threat: 0
    });
    const [totalVulnerabilities, setTotalVulnerabilities] = useState({
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
    });

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = () => {
        setLoading(true);
        try {
            const stored = localStorage.getItem('securityReports');
            if (stored) {
                const reports = JSON.parse(stored);

                // Count scans by type
                const counts = {
                    sast: reports.sast?.length || 0,
                    dast: reports.dast?.length || 0,
                    sca: reports.sca?.length || 0,
                    threat: reports.threat?.length || 0
                };
                setScanCounts(counts);

                // Build scan history from all report types
                const allScans = [];

                (reports.sast || []).forEach(scan => {
                    allScans.push({
                        id: scan.id,
                        type: 'SAST',
                        target: scan.name || 'SAST Scan',
                        date: new Date(scan.date).toLocaleString(),
                        status: scan.status?.toLowerCase() || 'completed',
                        summary: scan.summary
                    });
                });

                (reports.dast || []).forEach(scan => {
                    allScans.push({
                        id: scan.id,
                        type: 'DAST',
                        target: scan.name || 'DAST Scan',
                        date: new Date(scan.date).toLocaleString(),
                        status: scan.status?.toLowerCase() || 'completed',
                        summary: scan.summary
                    });
                });

                (reports.sca || []).forEach(scan => {
                    allScans.push({
                        id: scan.id,
                        type: 'SCA',
                        target: scan.name || 'SCA Scan',
                        date: new Date(scan.date).toLocaleString(),
                        status: scan.status?.toLowerCase() || 'completed',
                        summary: scan.summary
                    });
                });

                (reports.threat || []).forEach(scan => {
                    allScans.push({
                        id: scan.id,
                        type: 'Threat',
                        target: scan.name || 'Threat Model',
                        date: new Date(scan.date).toLocaleString(),
                        status: scan.status?.toLowerCase() || 'completed',
                        summary: scan.summary
                    });
                });

                // Sort by date (newest first) and take top 10
                allScans.sort((a, b) => new Date(b.date) - new Date(a.date));
                setScanHistory(allScans.slice(0, 10));

                // Calculate total vulnerabilities across all scans
                let vulns = { critical: 0, high: 0, medium: 0, low: 0 };

                // From SAST
                const latestSast = reports.sast?.[0];
                if (latestSast?.summary) {
                    vulns.critical += latestSast.summary.critical || 0;
                    vulns.high += latestSast.summary.high || 0;
                    vulns.medium += latestSast.summary.medium || 0;
                    vulns.low += latestSast.summary.low || 0;
                }

                // From DAST
                const latestDast = reports.dast?.[0];
                if (latestDast?.summary) {
                    vulns.critical += latestDast.summary.critical || 0;
                    vulns.high += latestDast.summary.high || 0;
                    vulns.medium += latestDast.summary.medium || 0;
                    vulns.low += latestDast.summary.low || 0;
                }

                // From SCA
                const latestSca = reports.sca?.[0];
                if (latestSca?.summary) {
                    vulns.critical += latestSca.summary.critical || 0;
                    vulns.high += latestSca.summary.high || 0;
                    vulns.medium += latestSca.summary.medium || 0;
                    vulns.low += latestSca.summary.low || 0;
                }

                // From Threat
                const latestThreat = reports.threat?.[0];
                if (latestThreat?.summary) {
                    vulns.critical += latestThreat.summary.critical || 0;
                    vulns.high += latestThreat.summary.high || 0;
                    vulns.medium += latestThreat.summary.medium || 0;
                    vulns.low += latestThreat.summary.low || 0;
                }

                setTotalVulnerabilities(vulns);
            }
        } catch (err) {
            console.error('Error loading dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    const calculateSecurityScore = () => {
        const total = totalVulnerabilities.critical * 10 + totalVulnerabilities.high * 5 + totalVulnerabilities.medium * 2 + totalVulnerabilities.low;
        if (total === 0) return 100;
        return Math.max(0, Math.min(100, 100 - total));
    };

    const renderOverview = () => (
        <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={<Code size={20} className="text-purple-400" />}
                    label="SAST Scans"
                    value={scanCounts.sast}
                    color="bg-purple-500/20"
                />
                <StatCard
                    icon={<Globe size={20} className="text-blue-400" />}
                    label="DAST Scans"
                    value={scanCounts.dast}
                    color="bg-blue-500/20"
                />
                <StatCard
                    icon={<Package size={20} className="text-green-400" />}
                    label="SCA Scans"
                    value={scanCounts.sca}
                    color="bg-green-500/20"
                />
                <StatCard
                    icon={<AlertTriangle size={20} className="text-orange-400" />}
                    label="Threat Models"
                    value={scanCounts.threat}
                    color="bg-orange-500/20"
                />
            </div>

            {/* Security Score & Vulnerabilities Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-800/50 rounded-xl p-6 border border-white/5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">Security Score</h3>
                        <button
                            onClick={loadDashboardData}
                            disabled={loading}
                            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative w-24 h-24 flex-shrink-0">
                            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="42"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="none"
                                    className="text-slate-700"
                                />
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="42"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="none"
                                    strokeDasharray={`${calculateSecurityScore() * 2.64} 264`}
                                    strokeLinecap="round"
                                    className={calculateSecurityScore() > 70 ? 'text-green-500' : calculateSecurityScore() > 40 ? 'text-yellow-500' : 'text-red-500'}
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-2xl font-bold text-white">{calculateSecurityScore()}</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm text-gray-400">Based on latest scan results</p>
                            <div className="flex flex-wrap gap-2">
                                <span className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400">
                                    {totalVulnerabilities.critical} Critical
                                </span>
                                <span className="px-2 py-1 rounded text-xs bg-orange-500/20 text-orange-400">
                                    {totalVulnerabilities.high} High
                                </span>
                                <span className="px-2 py-1 rounded text-xs bg-yellow-500/20 text-yellow-400">
                                    {totalVulnerabilities.medium} Medium
                                </span>
                                <span className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400">
                                    {totalVulnerabilities.low} Low
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-6 border border-white/5">
                    <h3 className="text-lg font-semibold text-white mb-4">Quick Start</h3>
                    <p className="text-sm text-gray-400 mb-4">
                        Run security scans to identify vulnerabilities in your code, applications, and dependencies.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setActiveSubTab('sast')}
                            className="p-3 bg-slate-900/50 rounded-lg border border-white/5 hover:border-purple-500/30 transition-all text-left"
                        >
                            <Code size={18} className="text-purple-400 mb-2" />
                            <p className="text-sm text-white">SAST</p>
                            <p className="text-xs text-gray-500">Static Analysis</p>
                        </button>
                        <button
                            onClick={() => setActiveSubTab('dast')}
                            className="p-3 bg-slate-900/50 rounded-lg border border-white/5 hover:border-blue-500/30 transition-all text-left"
                        >
                            <Globe size={18} className="text-blue-400 mb-2" />
                            <p className="text-sm text-white">DAST</p>
                            <p className="text-xs text-gray-500">Dynamic Testing</p>
                        </button>
                        <button
                            onClick={() => setActiveSubTab('sca')}
                            className="p-3 bg-slate-900/50 rounded-lg border border-white/5 hover:border-green-500/30 transition-all text-left"
                        >
                            <Package size={18} className="text-green-400 mb-2" />
                            <p className="text-sm text-white">SCA</p>
                            <p className="text-xs text-gray-500">Dependency Check</p>
                        </button>
                        <button
                            onClick={() => setActiveSubTab('threat')}
                            className="p-3 bg-slate-900/50 rounded-lg border border-white/5 hover:border-orange-500/30 transition-all text-left"
                        >
                            <AlertTriangle size={18} className="text-orange-400 mb-2" />
                            <p className="text-sm text-white">Threat Model</p>
                            <p className="text-xs text-gray-500">STRIDE Analysis</p>
                        </button>
                    </div>
                </div>
            </div>

            {/* Recent Scans */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-white/5">
                <h3 className="text-lg font-semibold text-white mb-4">Recent Security Scans</h3>
                {scanHistory.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <Shield size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No scans yet</p>
                        <p className="text-sm mt-1">Run a security scan to get started</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {scanHistory.map(scan => (
                            <div key={scan.id} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-white/5 hover:border-orange-500/30 transition-all cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-lg ${scan.type === 'SAST' ? 'bg-purple-500/20' :
                                        scan.type === 'DAST' ? 'bg-blue-500/20' :
                                            scan.type === 'SCA' ? 'bg-green-500/20' :
                                                'bg-orange-500/20'
                                        }`}>
                                        {scan.type === 'SAST' ? <Code size={18} className="text-purple-400" /> :
                                            scan.type === 'DAST' ? <Globe size={18} className="text-blue-400" /> :
                                                scan.type === 'SCA' ? <Package size={18} className="text-green-400" /> :
                                                    <AlertTriangle size={18} className="text-orange-400" />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">{scan.target}</p>
                                        <p className="text-xs text-gray-500">{scan.type} Scan - {scan.date}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
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
                                    <span className={`px-2 py-1 rounded text-xs ${scan.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                        scan.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                                            scan.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                                'bg-gray-500/20 text-gray-400'
                                        }`}>
                                        {scan.status}
                                    </span>
                                    <ChevronRight size={18} className="text-gray-500" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="p-6 pt-14 border-b border-white/5">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30">
                        <Shield size={24} className="text-orange-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Security Testing</h1>
                        <p className="text-sm text-gray-400">Comprehensive security analysis for your applications</p>
                    </div>
                </div>

                {/* Sub-tabs */}
                <div className="flex flex-wrap gap-2">
                    <TabButton
                        icon={<Activity size={16} />}
                        label="Overview"
                        active={activeSubTab === 'overview'}
                        onClick={() => setActiveSubTab('overview')}
                    />
                    <TabButton
                        icon={<Code size={16} />}
                        label="SAST"
                        active={activeSubTab === 'sast'}
                        onClick={() => setActiveSubTab('sast')}
                        badge={{ count: scanCounts.sast, type: scanCounts.sast > 0 ? 'warning' : 'success' }}
                    />
                    <TabButton
                        icon={<Globe size={16} />}
                        label="DAST"
                        active={activeSubTab === 'dast'}
                        onClick={() => setActiveSubTab('dast')}
                        badge={{ count: scanCounts.dast, type: scanCounts.dast > 0 ? 'warning' : 'success' }}
                    />
                    <TabButton
                        icon={<Package size={16} />}
                        label="SCA"
                        active={activeSubTab === 'sca'}
                        onClick={() => setActiveSubTab('sca')}
                        badge={{ count: scanCounts.sca, type: scanCounts.sca > 0 ? 'warning' : 'success' }}
                    />
                    <TabButton
                        icon={<AlertTriangle size={16} />}
                        label="Threat Model"
                        active={activeSubTab === 'threat'}
                        onClick={() => setActiveSubTab('threat')}
                        badge={{ count: scanCounts.threat, type: scanCounts.threat > 0 ? 'warning' : 'success' }}
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                {activeSubTab === 'overview' && renderOverview()}
                {activeSubTab === 'sast' && <SecuritySAST />}
                {activeSubTab === 'dast' && <SecurityDAST />}
                {activeSubTab === 'sca' && <SecuritySCA />}
                {activeSubTab === 'threat' && <SecurityThreatModel />}
            </div>
        </div>
    );
}
