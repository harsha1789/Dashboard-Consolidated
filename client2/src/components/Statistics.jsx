import React, { useState, useEffect } from 'react';
import { BarChart2, RefreshCw, Code2, CheckCircle, XCircle, TrendingUp, FlaskConical, Eye, Shield, Monitor } from 'lucide-react';
import {
    BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import axios from 'axios';
import { getReports } from '../api/visualApi';

const SCRIPT_LABELS = {
    'buildABet': 'Build A Bet',
    'login': 'Login',
    'signUp': 'Sign Up',
    'signup': 'Sign Up',
    'myBet': 'My Bet',
    'transactionHistory': 'Transaction History',
    'swipeBet': 'Swipe Bet',
    'bookABet': 'Book A Bet',
    'footer': 'Footer',
    'betslip': 'Betslip',
    'header': 'Header',
    'betInfluencer': 'Bet Influencer',
    'betSaver': 'BetSaver',
    'feeds': 'Feeds'
};

const StatCard = ({ icon, label, value, color }) => (
    <div className={`p-4 rounded-xl bg-slate-900/50 backdrop-blur-sm border border-white/5 flex items-center gap-4`}>
        <div className={`w-12 h-12 rounded-lg bg-${color}-500/10 flex items-center justify-center text-${color}-400`}>
            {icon}
        </div>
        <div>
            <p className="text-xs text-gray-400 font-medium">{label}</p>
            <p className="text-xl md:text-2xl font-bold text-white">{value}</p>
        </div>
    </div>
);

export default function Statistics({ run, latestRun, onBackToLatest }) {
    const [aggregatedData, setAggregatedData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch aggregated data from all test types
    useEffect(() => {
        fetchAggregatedStats();
    }, []);

    const fetchAggregatedStats = async () => {
        setLoading(true);
        try {
            // Fetch functional testing history
            let functionalHistory = [];
            try {
                const funcRes = await axios.get('/api/functional/history');
                functionalHistory = funcRes.data || [];
            } catch (e) { console.log('No functional history'); }

            // Fetch visual testing reports
            let visualReports = [];
            try {
                visualReports = await getReports() || [];
            } catch (e) { console.log('No visual reports'); }

            // Fetch main playwright history
            let playwrightHistory = [];
            try {
                const pwRes = await axios.get('/api/history');
                playwrightHistory = pwRes.data || [];
            } catch (e) { console.log('No playwright history'); }

            // Calculate aggregated stats
            const funcPassed = functionalHistory.filter(h => h.status === 'Passed').length;
            const funcFailed = functionalHistory.filter(h => h.status === 'Failed').length;
            const visualPassed = visualReports.filter(r => r.passed).length;
            const visualFailed = visualReports.filter(r => !r.passed).length;
            const pwPassed = playwrightHistory.filter(h => h.status === 'Passed').length;
            const pwFailed = playwrightHistory.filter(h => h.status === 'Failed').length;

            const totalTests = functionalHistory.length + visualReports.length + playwrightHistory.length;
            const totalPassed = funcPassed + visualPassed + pwPassed;
            const totalFailed = funcFailed + visualFailed + pwFailed;

            // Get the latest run from any test type
            const allRuns = [
                ...functionalHistory.map(h => ({ ...h, type: 'functional' })),
                ...visualReports.map(r => ({ ...r, type: 'visual', status: r.passed ? 'Passed' : 'Failed' })),
                ...playwrightHistory.map(h => ({ ...h, type: 'playwright' }))
            ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            const latestRunData = allRuns[0];

            // Build per-type breakdown for chart
            const typeBreakdown = [
                { name: 'Functional', passed: funcPassed, failed: funcFailed, total: functionalHistory.length },
                { name: 'Visual', passed: visualPassed, failed: visualFailed, total: visualReports.length },
                { name: 'Playwright', passed: pwPassed, failed: pwFailed, total: playwrightHistory.length }
            ].filter(t => t.total > 0);

            setAggregatedData({
                totalTests,
                totalPassed,
                totalFailed,
                successRate: totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0,
                typeBreakdown,
                latestRun: latestRunData,
                functionalHistory,
                visualReports,
                playwrightHistory
            });
        } catch (e) {
            console.error('Failed to fetch aggregated stats:', e);
        }
        setLoading(false);
    };

    // Show loading state
    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center p-4 md:p-8 pt-14">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading statistics...</p>
                </div>
            </div>
        );
    }

    // If no data at all, show empty state
    if (!aggregatedData || aggregatedData.totalTests === 0) {
        return (
            <div className="flex-1 flex items-center justify-center p-4 md:p-8 pt-14">
                <div className="text-center">
                    <BarChart2 size={64} className="mx-auto mb-4 opacity-30 text-violet-400" />
                    <h3 className="text-lg md:text-xl font-bold text-white mb-2">No Test Data Yet</h3>
                    <p className="text-sm md:text-base text-gray-400 mb-4">Run tests from Functional, Visual, or Security dashboards to see statistics</p>
                    <button
                        onClick={fetchAggregatedStats}
                        className="px-4 py-2 bg-violet-500/20 text-violet-400 rounded-xl font-bold hover:bg-violet-500/30 transition-all flex items-center gap-2 mx-auto"
                    >
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                </div>
            </div>
        );
    }

    // Use aggregated data for display
    const displayRun = run || aggregatedData.latestRun;

    // Prepare chart data - use aggregated type breakdown
    const typeBreakdownData = aggregatedData.typeBreakdown;

    const statusData = [
        { name: 'Passed', value: aggregatedData.totalPassed, color: '#10b981' },
        { name: 'Failed', value: aggregatedData.totalFailed, color: '#ef4444' }
    ];

    // Script coverage from functional tests if available
    const scriptCoverageData = displayRun?.perScriptResults?.map(script => ({
        name: SCRIPT_LABELS[script.scriptName] || script.scriptName,
        passed: script.passed,
        failed: script.failed
    })) || [];

    return (
        <div className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 pt-14 gap-4 md:gap-6 overflow-y-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-white mb-1">Test Statistics Overview</h2>
                    <p className="text-xs md:text-sm text-gray-400">Aggregated metrics across all test types</p>
                </div>
                <button
                    onClick={fetchAggregatedStats}
                    className="px-4 py-2 bg-violet-500/20 text-violet-400 rounded-xl font-bold hover:bg-violet-500/30 transition-all flex items-center gap-2"
                >
                    <RefreshCw size={16} />
                    Refresh
                </button>
            </div>

            {/* Overall Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <StatCard icon={<Code2 />} label="Total Test Runs" value={aggregatedData.totalTests} color="violet" />
                <StatCard icon={<CheckCircle />} label="Passed" value={aggregatedData.totalPassed} color="emerald" />
                <StatCard icon={<XCircle />} label="Failed" value={aggregatedData.totalFailed} color="red" />
                <StatCard icon={<TrendingUp />} label="Success Rate" value={`${aggregatedData.successRate}%`} color="purple" />
            </div>

            {/* Test Type Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-5 border border-white/5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-orange-500/20">
                            <FlaskConical size={20} className="text-orange-400" />
                        </div>
                        <h3 className="text-white font-bold">Functional Tests</h3>
                    </div>
                    <div className="flex items-center gap-4">
                        <div>
                            <p className="text-2xl font-bold text-white">{aggregatedData.functionalHistory.length}</p>
                            <p className="text-xs text-gray-500">Total Runs</p>
                        </div>
                        <div className="flex-1 flex gap-2">
                            <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                                {aggregatedData.functionalHistory.filter(h => h.status === 'Passed').length} Passed
                            </span>
                            <span className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs font-bold">
                                {aggregatedData.functionalHistory.filter(h => h.status === 'Failed').length} Failed
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-5 border border-white/5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-purple-500/20">
                            <Eye size={20} className="text-purple-400" />
                        </div>
                        <h3 className="text-white font-bold">Visual Tests</h3>
                    </div>
                    <div className="flex items-center gap-4">
                        <div>
                            <p className="text-2xl font-bold text-white">{aggregatedData.visualReports.length}</p>
                            <p className="text-xs text-gray-500">Total Runs</p>
                        </div>
                        <div className="flex-1 flex gap-2">
                            <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                                {aggregatedData.visualReports.filter(r => r.passed).length} Passed
                            </span>
                            <span className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs font-bold">
                                {aggregatedData.visualReports.filter(r => !r.passed).length} Failed
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-5 border border-white/5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-violet-500/20">
                            <Monitor size={20} className="text-violet-400" />
                        </div>
                        <h3 className="text-white font-bold">Playwright Tests</h3>
                    </div>
                    <div className="flex items-center gap-4">
                        <div>
                            <p className="text-2xl font-bold text-white">{aggregatedData.playwrightHistory.length}</p>
                            <p className="text-xs text-gray-500">Total Runs</p>
                        </div>
                        <div className="flex-1 flex gap-2">
                            <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                                {aggregatedData.playwrightHistory.filter(h => h.status === 'Passed').length} Passed
                            </span>
                            <span className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs font-bold">
                                {aggregatedData.playwrightHistory.filter(h => h.status === 'Failed').length} Failed
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {/* Test Type Breakdown - Bar Chart */}
                <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-white/5">
                    <h3 className="text-lg font-bold text-white mb-4">Results by Test Type</h3>
                    {typeBreakdownData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={typeBreakdownData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="name" stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                                <Legend />
                                <Bar dataKey="passed" stackId="a" fill="#10b981" name="Passed" />
                                <Bar dataKey="failed" stackId="a" fill="#ef4444" name="Failed" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-64 text-gray-500">
                            <p>No test data available</p>
                        </div>
                    )}
                </div>

                {/* Pass/Fail Distribution - Pie Chart */}
                <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-white/5">
                    <h3 className="text-lg font-bold text-white mb-4">Overall Pass/Fail Distribution</h3>
                    {aggregatedData.totalTests > 0 ? (
                        <>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={statusData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {statusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex justify-center gap-6 mt-2">
                                <div className="text-center">
                                    <p className="text-xs text-gray-500">Total Passed</p>
                                    <p className="text-2xl font-bold text-emerald-400">{aggregatedData.totalPassed}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-gray-500">Total Failed</p>
                                    <p className="text-2xl font-bold text-red-400">{aggregatedData.totalFailed}</p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-64 text-gray-500">
                            <p>No test data available</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Latest Run Info (if available) */}
            {displayRun && (
                <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-white/5">
                    <h3 className="text-lg font-bold text-white mb-4">Latest Test Run</h3>
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="px-4 py-2 bg-slate-800/50 rounded-xl border border-white/5">
                            <p className="text-xs text-gray-500">Type</p>
                            <p className="text-sm font-bold text-violet-400 capitalize">{displayRun.type || 'Unknown'}</p>
                        </div>
                        <div className="px-4 py-2 bg-slate-800/50 rounded-xl border border-white/5">
                            <p className="text-xs text-gray-500">Timestamp</p>
                            <p className="text-sm font-bold text-white">{new Date(displayRun.timestamp).toLocaleString()}</p>
                        </div>
                        <div className="px-4 py-2 bg-slate-800/50 rounded-xl border border-white/5">
                            <p className="text-xs text-gray-500">Status</p>
                            <p className={`text-sm font-bold ${displayRun.status === 'Passed' ? 'text-emerald-400' : 'text-red-400'}`}>
                                {displayRun.status}
                            </p>
                        </div>
                        {displayRun.region && (
                            <div className="px-4 py-2 bg-slate-800/50 rounded-xl border border-white/5">
                                <p className="text-xs text-gray-500">Region</p>
                                <p className="text-sm font-bold text-white">{displayRun.region}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Script Coverage (if functional test has per-script results) */}
            {scriptCoverageData.length > 0 && (
                <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-white/5">
                    <h3 className="text-lg font-bold text-white mb-4">Script Execution Coverage (Latest Run)</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={scriptCoverageData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="name" stroke="#94a3b8" angle={-45} textAnchor="end" height={100} />
                            <YAxis stroke="#94a3b8" />
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                            <Legend />
                            <Bar dataKey="passed" stackId="a" fill="#10b981" name="Passed" />
                            <Bar dataKey="failed" stackId="a" fill="#ef4444" name="Failed" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
