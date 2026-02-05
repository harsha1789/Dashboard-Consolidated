import React, { useState, useEffect } from 'react';
import { Monitor, Eye, FlaskConical, CheckCircle, XCircle, TrendingUp, Clock, BarChart2, Activity } from 'lucide-react';
import axios from 'axios';
import { getReports } from '../api/visualApi';

const TestSummaryCard = ({ title, icon: Icon, color, latestRun, stats, onClick }) => (
    <div
        onClick={onClick}
        className={`bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-white/5 hover:border-${color}-500/30 transition-all cursor-pointer hover:shadow-lg hover:shadow-${color}-500/10`}
    >
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl bg-${color}-500/20 border border-${color}-500/30`}>
                    <Icon size={24} className={`text-${color}-400`} />
                </div>
                <div>
                    <span className="text-white font-bold text-lg">{title}</span>
                    <p className="text-gray-500 text-xs">Click to view details</p>
                </div>
            </div>
            {latestRun && (
                <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold ${
                    latestRun.status === 'Passed' || latestRun.passed
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                    {latestRun.status === 'Passed' || latestRun.passed ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    {latestRun.status || (latestRun.passed ? 'Passed' : 'Failed')}
                </span>
            )}
        </div>

        {latestRun ? (
            <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 flex items-center gap-2">
                        <Clock size={14} /> Last Run
                    </span>
                    <span className="text-gray-300 font-medium">{new Date(latestRun.timestamp).toLocaleString()}</span>
                </div>
                {stats && (
                    <div className="flex items-center gap-6 pt-2 border-t border-white/5">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-emerald-400 font-bold">{stats.passed || 0}</span>
                            <span className="text-gray-500 text-sm">passed</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            <span className="text-red-400 font-bold">{stats.failed || 0}</span>
                            <span className="text-gray-500 text-sm">failed</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                            <span className="text-gray-400 font-bold">{stats.total || 0}</span>
                            <span className="text-gray-500 text-sm">total</span>
                        </div>
                    </div>
                )}
            </div>
        ) : (
            <div className="text-center py-4">
                <Activity size={32} className={`mx-auto mb-2 text-${color}-400/30`} />
                <p className="text-gray-500 text-sm">No tests run yet</p>
            </div>
        )}
    </div>
);

const QuickStatCard = ({ label, value, icon: Icon, color }) => (
    <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl p-4 border border-white/5">
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-${color}-500/20`}>
                <Icon size={18} className={`text-${color}-400`} />
            </div>
            <div>
                <p className={`text-2xl font-bold text-${color}-400`}>{value}</p>
                <p className="text-gray-500 text-xs uppercase tracking-wider">{label}</p>
            </div>
        </div>
    </div>
);

export default function Dashboard({ stats, setActiveTab }) {
    const [visualReports, setVisualReports] = useState([]);
    const [functionalHistory, setFunctionalHistory] = useState([]);
    const [playwrightHistory, setPlaywrightHistory] = useState([]);

    useEffect(() => {
        fetchTestSummaries();
    }, []);

    const fetchTestSummaries = async () => {
        // Fetch Visual Testing reports
        try {
            const reports = await getReports();
            setVisualReports(reports || []);
        } catch (err) {
            console.error('Failed to fetch visual reports:', err);
        }

        // Fetch Functional Testing history
        try {
            const res = await axios.get('/api/functional/history');
            setFunctionalHistory(res.data || []);
        } catch (err) {
            console.error('Failed to fetch functional history:', err);
        }

        // Fetch Playwright history
        try {
            const res = await axios.get('/api/history');
            setPlaywrightHistory(res.data || []);
        } catch (err) {
            console.error('Failed to fetch playwright history:', err);
        }
    };

    // Calculate stats for each test type
    const getVisualStats = () => {
        const passed = visualReports.filter(r => r.passed).length;
        const failed = visualReports.filter(r => !r.passed).length;
        return { passed, failed, total: visualReports.length };
    };

    const getFunctionalStats = () => {
        const passed = functionalHistory.filter(h => h.status === 'Passed').length;
        const failed = functionalHistory.filter(h => h.status === 'Failed').length;
        return { passed, failed, total: functionalHistory.length };
    };

    const getPlaywrightStats = () => {
        const passed = playwrightHistory.filter(h => h.status === 'Passed').length;
        const failed = playwrightHistory.filter(h => h.status === 'Failed').length;
        return { passed, failed, total: playwrightHistory.length };
    };

    const latestVisual = visualReports[0];
    const latestFunctional = functionalHistory[0];
    const latestPlaywright = playwrightHistory[0];

    const visualStats = getVisualStats();
    const functionalStats = getFunctionalStats();
    const playwrightStats = getPlaywrightStats();

    // Overall stats
    const totalTests = playwrightStats.total + functionalStats.total + visualStats.total;
    const totalPassed = playwrightStats.passed + functionalStats.passed + visualStats.passed;
    const totalFailed = playwrightStats.failed + functionalStats.failed + visualStats.failed;
    const successRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;

    return (
        <div className="flex-1 flex flex-col p-6 md:p-8 pt-14 gap-6 overflow-y-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Test Dashboard</h2>
                    <p className="text-gray-400">Overview of all automated testing activities</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/50 rounded-xl border border-white/5">
                    <div className={`w-2 h-2 rounded-full ${totalTests > 0 ? 'bg-emerald-500' : 'bg-gray-500'}`}></div>
                    <span className="text-gray-400 text-sm">
                        {totalTests > 0 ? `${totalTests} total test runs` : 'No tests run yet'}
                    </span>
                </div>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <QuickStatCard label="Total Runs" value={totalTests} icon={BarChart2} color="violet" />
                <QuickStatCard label="Passed" value={totalPassed} icon={CheckCircle} color="emerald" />
                <QuickStatCard label="Failed" value={totalFailed} icon={XCircle} color="red" />
                <QuickStatCard label="Success Rate" value={`${successRate}%`} icon={TrendingUp} color="purple" />
            </div>

            {/* Test Type Summary Cards */}
            <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Activity size={20} className="text-violet-400" />
                    Test Summaries
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <TestSummaryCard
                        title="Playwright Tests"
                        icon={Monitor}
                        color="violet"
                        latestRun={latestPlaywright}
                        stats={playwrightStats}
                        onClick={() => setActiveTab && setActiveTab('stats')}
                    />
                    <TestSummaryCard
                        title="Functional Tests"
                        icon={FlaskConical}
                        color="orange"
                        latestRun={latestFunctional}
                        stats={functionalStats}
                        onClick={() => setActiveTab && setActiveTab('functional')}
                    />
                    <TestSummaryCard
                        title="Visual Tests"
                        icon={Eye}
                        color="purple"
                        latestRun={latestVisual}
                        stats={visualStats}
                        onClick={() => setActiveTab && setActiveTab('visual')}
                    />
                </div>
            </div>

            {/* Recent Activity */}
            <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Clock size={20} className="text-purple-400" />
                    Recent Activity
                </h3>
                <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden">
                    {[...playwrightHistory.slice(0, 2), ...functionalHistory.slice(0, 2), ...visualReports.slice(0, 2)]
                        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                        .slice(0, 5)
                        .length > 0 ? (
                        <div className="divide-y divide-white/5">
                            {[...playwrightHistory.slice(0, 2).map(h => ({...h, type: 'playwright'})),
                              ...functionalHistory.slice(0, 2).map(h => ({...h, type: 'functional'})),
                              ...visualReports.slice(0, 2).map(r => ({...r, type: 'visual', status: r.passed ? 'Passed' : 'Failed'}))]
                                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                                .slice(0, 5)
                                .map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${
                                                item.type === 'playwright' ? 'bg-violet-500/20' :
                                                item.type === 'functional' ? 'bg-orange-500/20' : 'bg-purple-500/20'
                                            }`}>
                                                {item.type === 'playwright' ? <Monitor size={16} className="text-violet-400" /> :
                                                 item.type === 'functional' ? <FlaskConical size={16} className="text-orange-400" /> :
                                                 <Eye size={16} className="text-purple-400" />}
                                            </div>
                                            <div>
                                                <p className="text-white font-medium text-sm">
                                                    {item.type === 'playwright' ? 'Playwright Test' :
                                                     item.type === 'functional' ? 'Functional Test' : 'Visual Test'}
                                                </p>
                                                <p className="text-gray-500 text-xs">{new Date(item.timestamp).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${
                                            item.status === 'Passed'
                                                ? 'bg-emerald-500/20 text-emerald-400'
                                                : 'bg-red-500/20 text-red-400'
                                        }`}>
                                            {item.status === 'Passed' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                            {item.status}
                                        </span>
                                    </div>
                                ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center">
                            <Activity size={40} className="mx-auto mb-3 text-gray-600" />
                            <p className="text-gray-500">No recent activity</p>
                            <p className="text-gray-600 text-sm">Run some tests to see activity here</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
