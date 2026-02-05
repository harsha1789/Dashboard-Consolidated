import React, { useState, useEffect } from 'react';
import { Filter, CheckCircle, XCircle, RotateCcw, BarChart2, RefreshCw, FlaskConical, Eye, Monitor, Shield } from 'lucide-react';
import axios from 'axios';
import { getReports } from '../api/visualApi';

export default function History({ onViewStatistics, onRerun }) {
    const [allHistory, setAllHistory] = useState([]);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAllHistory();
    }, []);

    const fetchAllHistory = async () => {
        setLoading(true);
        try {
            const combined = [];

            // Fetch functional testing history
            try {
                const funcRes = await axios.get('/api/functional/history');
                const funcHistory = (funcRes.data || []).map(h => ({
                    ...h,
                    type: 'functional',
                    typeLabel: 'Functional',
                    typeColor: 'orange',
                    typeIcon: FlaskConical
                }));
                combined.push(...funcHistory);
            } catch (e) { console.log('No functional history'); }

            // Fetch visual testing reports
            try {
                const visualReports = await getReports() || [];
                const visualHistory = visualReports.map(r => ({
                    runId: r.id,
                    timestamp: r.timestamp,
                    status: r.passed ? 'Passed' : 'Failed',
                    region: r.site || 'N/A',
                    scripts: [r.url || 'Visual Test'],
                    duration: r.duration || 0,
                    type: 'visual',
                    typeLabel: 'Visual',
                    typeColor: 'purple',
                    typeIcon: Eye
                }));
                combined.push(...visualHistory);
            } catch (e) { console.log('No visual reports'); }

            // Fetch main playwright history
            try {
                const pwRes = await axios.get('/api/history');
                const pwHistory = (pwRes.data || []).map(h => ({
                    ...h,
                    type: 'playwright',
                    typeLabel: 'Playwright',
                    typeColor: 'violet',
                    typeIcon: Monitor
                }));
                combined.push(...pwHistory);
            } catch (e) { console.log('No playwright history'); }

            // Sort by timestamp (newest first)
            combined.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            setAllHistory(combined);
        } catch (e) {
            console.error('Failed to fetch history:', e);
        }
        setLoading(false);
    };

    // Apply filters
    const filteredHistory = allHistory.filter(run => {
        const statusMatch = filterStatus === 'all' || run.status?.toLowerCase() === filterStatus;
        const typeMatch = filterType === 'all' || run.type === filterType;
        return statusMatch && typeMatch;
    });

    const getTypeIcon = (type) => {
        switch (type) {
            case 'functional': return <FlaskConical size={14} className="text-orange-400" />;
            case 'visual': return <Eye size={14} className="text-purple-400" />;
            case 'playwright': return <Monitor size={14} className="text-violet-400" />;
            default: return <Monitor size={14} className="text-gray-400" />;
        }
    };

    const getTypeBadgeClass = (type) => {
        switch (type) {
            case 'functional': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
            case 'visual': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            case 'playwright': return 'bg-violet-500/20 text-violet-400 border-violet-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center p-4 md:p-8 pt-14">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading execution history...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 pt-14 gap-4 md:gap-6 overflow-hidden">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Execution History</h2>
                    <p className="text-gray-400">Track all your test runs across all test types ({allHistory.length} total runs)</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Type Filter */}
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2 text-white font-medium focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                        <option value="all">All Types</option>
                        <option value="functional">Functional</option>
                        <option value="visual">Visual</option>
                        <option value="playwright">Playwright</option>
                    </select>
                    {/* Status Filter */}
                    <div className="flex items-center gap-2">
                        <Filter size={18} className="text-gray-400" />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2 text-white font-medium focus:outline-none focus:ring-2 focus:ring-violet-500"
                        >
                            <option value="all">All Status</option>
                            <option value="passed">Passed Only</option>
                            <option value="failed">Failed Only</option>
                        </select>
                    </div>
                    {/* Refresh Button */}
                    <button
                        onClick={fetchAllHistory}
                        className="px-4 py-2 bg-violet-500/20 text-violet-400 rounded-xl font-bold hover:bg-violet-500/30 transition-all flex items-center gap-2"
                    >
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* History Table with Scrollbar */}
            <div className="flex-1 overflow-y-auto">
                <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-800/50 text-gray-400 uppercase text-xs font-bold sticky top-0">
                            <tr>
                                <th className="p-4">Type</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Timestamp</th>
                                <th className="p-4">Region/Site</th>
                                <th className="p-4">Scripts/Details</th>
                                <th className="p-4">Duration</th>
                                <th className="p-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredHistory.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-gray-500">
                                        {allHistory.length === 0
                                            ? 'No execution history available. Run some tests to see history here.'
                                            : 'No results match your filters.'}
                                    </td>
                                </tr>
                            ) : filteredHistory.map((run, idx) => (
                                <tr key={`${run.type}-${run.runId}-${idx}`} className="hover:bg-white/5 transition-all">
                                    <td className="p-4">
                                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border ${getTypeBadgeClass(run.type)}`}>
                                            {getTypeIcon(run.type)}
                                            {run.typeLabel}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold ${run.status === 'Passed'
                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                            }`}>
                                            {run.status === 'Passed' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                            {run.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-300 text-sm">{new Date(run.timestamp).toLocaleString()}</td>
                                    <td className="p-4">
                                        <span className="px-3 py-1.5 rounded-xl bg-slate-700/50 text-gray-300 font-mono text-sm border border-white/10 font-bold">
                                            {run.region || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-400 text-sm truncate max-w-xs" title={run.scripts?.join(', ') || 'N/A'}>
                                        {run.scripts?.join(', ') || 'N/A'}
                                    </td>
                                    <td className="p-4 text-gray-300 text-sm font-mono font-bold">
                                        {run.duration ? `${(run.duration / 1000).toFixed(1)}s` : '-'}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex gap-2">
                                            {run.type === 'functional' && (
                                                <>
                                                    <button
                                                        onClick={() => onViewStatistics && onViewStatistics(run.runId)}
                                                        className="px-3 py-1.5 bg-violet-500/20 text-violet-400 rounded-lg text-sm font-bold hover:bg-violet-500/30 transition-colors flex items-center gap-1"
                                                    >
                                                        <BarChart2 size={14} /> Stats
                                                    </button>
                                                    <button
                                                        onClick={() => onRerun && onRerun(run.runId)}
                                                        className="px-3 py-1.5 bg-slate-700/50 text-gray-300 rounded-lg text-sm font-bold hover:bg-white/10 transition-colors flex items-center gap-1"
                                                    >
                                                        <RotateCcw size={14} /> Rerun
                                                    </button>
                                                </>
                                            )}
                                            {run.type === 'visual' && (
                                                <button
                                                    onClick={() => window.open(`/api/visual/reports/${run.runId}`, '_blank')}
                                                    className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg text-sm font-bold hover:bg-purple-500/30 transition-colors flex items-center gap-1"
                                                >
                                                    <Eye size={14} /> View
                                                </button>
                                            )}
                                            {run.type === 'playwright' && (
                                                <>
                                                    <button
                                                        onClick={() => onViewStatistics && onViewStatistics(run.runId)}
                                                        className="px-3 py-1.5 bg-violet-500/20 text-violet-400 rounded-lg text-sm font-bold hover:bg-violet-500/30 transition-colors flex items-center gap-1"
                                                    >
                                                        <BarChart2 size={14} /> Stats
                                                    </button>
                                                    <button
                                                        onClick={() => onRerun && onRerun(run.runId)}
                                                        className="px-3 py-1.5 bg-slate-700/50 text-gray-300 rounded-lg text-sm font-bold hover:bg-white/10 transition-colors flex items-center gap-1"
                                                    >
                                                        <RotateCcw size={14} /> Rerun
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
