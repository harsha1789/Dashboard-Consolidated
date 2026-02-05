import React, { useState, useEffect } from 'react';
import { History, Play, Trash2, Copy, Settings, Clock, Users, Globe, ChevronRight, Search, Filter, Loader, X, BarChart3, AlertTriangle, CheckCircle, TrendingUp, TrendingDown, Activity, Zap, Server, Download, FileText, ArrowLeft, Shield, Brain, ChevronDown, ChevronUp, Package } from 'lucide-react';

const fallbackHistory = [
    {
        id: 1,
        name: 'API Load Test - Production',
        targetUrl: 'https://api.example.com',
        date: '2025-01-19 14:30:00',
        duration: 60,
        virtualUsers: 100,
        status: 'completed',
        results: { avgTime: 234, throughput: 456, errorRate: 1.2 }
    },
    {
        id: 2,
        name: 'Stress Test - Checkout Flow',
        targetUrl: 'https://shop.example.com',
        date: '2025-01-18 10:15:00',
        duration: 120,
        virtualUsers: 500,
        status: 'completed',
        results: { avgTime: 567, throughput: 234, errorRate: 3.5 }
    },
    {
        id: 3,
        name: 'Spike Test - Login API',
        targetUrl: 'https://auth.example.com',
        date: '2025-01-17 16:45:00',
        duration: 30,
        virtualUsers: 1000,
        status: 'failed',
        results: { avgTime: 1234, throughput: 89, errorRate: 15.2 }
    },
    {
        id: 4,
        name: 'Soak Test - Dashboard',
        targetUrl: 'https://app.example.com',
        date: '2025-01-16 08:00:00',
        duration: 3600,
        virtualUsers: 50,
        status: 'completed',
        results: { avgTime: 189, throughput: 567, errorRate: 0.5 }
    }
];

// Interpret response time health
const getResponseTimeVerdict = (ms) => {
    if (ms < 200) return { label: 'Excellent', color: 'text-green-400', bg: 'bg-green-500/10', desc: 'Well within acceptable range. Users experience near-instant response.' };
    if (ms < 500) return { label: 'Good', color: 'text-green-400', bg: 'bg-green-500/10', desc: 'Acceptable performance. Most users will not notice delay.' };
    if (ms < 1000) return { label: 'Fair', color: 'text-yellow-400', bg: 'bg-yellow-500/10', desc: 'Noticeable delay. Consider optimization for better UX.' };
    if (ms < 2000) return { label: 'Poor', color: 'text-orange-400', bg: 'bg-orange-500/10', desc: 'Significant delay impacting user experience. Optimization required.' };
    return { label: 'Critical', color: 'text-red-400', bg: 'bg-red-500/10', desc: 'Unacceptable response time. Immediate action needed.' };
};

const getErrorRateVerdict = (rate) => {
    if (rate < 1) return { label: 'Healthy', color: 'text-green-400', bg: 'bg-green-500/10', desc: 'Error rate is well within acceptable limits.' };
    if (rate < 5) return { label: 'Acceptable', color: 'text-yellow-400', bg: 'bg-yellow-500/10', desc: 'Some errors present. Monitor closely under sustained load.' };
    if (rate < 15) return { label: 'Degraded', color: 'text-orange-400', bg: 'bg-orange-500/10', desc: 'Significant failure rate. Investigate root cause.' };
    return { label: 'Critical', color: 'text-red-400', bg: 'bg-red-500/10', desc: 'Majority of requests failing. System is unable to handle the load.' };
};

const getThroughputVerdict = (rps, vus) => {
    const ratio = rps / Math.max(vus, 1);
    if (ratio >= 3) return { label: 'High', color: 'text-green-400', desc: 'Excellent throughput relative to user count.' };
    if (ratio >= 1) return { label: 'Normal', color: 'text-green-400', desc: 'Expected throughput for the given load.' };
    if (ratio >= 0.5) return { label: 'Low', color: 'text-yellow-400', desc: 'Below expected throughput. Possible bottleneck.' };
    return { label: 'Very Low', color: 'text-red-400', desc: 'System struggling to serve requests at this load.' };
};

// Extract game name from URL or test name
const extractGameInfo = (test) => {
    const url = test.targetUrl || '';
    const name = test.name || '';
    let game = 'Unknown';
    let provider = 'Unknown';
    let environment = 'Production';

    // Try to extract game from URL path
    const gameMatch = url.match(/game\/([^/?]+)/i) || name.match(/(?:game|slot|casino)\s*[-:]\s*(.+?)(?:\s*[-|]|$)/i);
    if (gameMatch) game = gameMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    // Try to detect provider
    if (url.includes('habanero') || name.toLowerCase().includes('habanero')) provider = 'Habanero';
    else if (url.includes('betway') || name.toLowerCase().includes('betway')) provider = 'Betway';
    else if (url.includes('pragmatic')) provider = 'Pragmatic Play';
    else if (url.includes('microgaming')) provider = 'Microgaming';
    else if (url.includes('netent')) provider = 'NetEnt';

    // Try to detect game name from test name
    if (game === 'Unknown' && name) {
        const knownGames = ['wealth inn', 'hot hot fruit', 'fa cai shen', 'koi gate', 'lucky lucky'];
        for (const g of knownGames) {
            if (name.toLowerCase().includes(g)) {
                game = g.replace(/\b\w/g, c => c.toUpperCase());
                break;
            }
        }
        if (game === 'Unknown') game = name.split('-')[0].trim();
    }

    // Environment from config or URL
    if (url.includes('staging') || url.includes('qa')) environment = 'Staging/QA';
    else if (url.includes('dev') || url.includes('localhost')) environment = 'Development';
    else if (url.includes('uat')) environment = 'UAT';

    return { game, provider, environment };
};

// Detailed Report Modal
const DetailedReportModal = ({ test, fullResults, onClose }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const gameInfo = extractGameInfo(test);
    const r = fullResults;
    const summary = r?.summary;
    const apiResults = r?.apiResults || [];
    const timeline = r?.timeline || [];
    const bottlenecks = r?.bottlenecks || [];
    const errorBreakdown = r?.errorBreakdown || [];

    const rtVerdict = summary ? getResponseTimeVerdict(summary.avgResponseTime) : null;
    const erVerdict = summary ? getErrorRateVerdict(summary.errorRate) : null;
    const tpVerdict = summary ? getThroughputVerdict(summary.throughput, summary.peakVUs) : null;

    const overallStatus = summary
        ? (summary.errorRate < 5 && summary.avgResponseTime < 1000 ? 'PASSED' : summary.errorRate < 15 ? 'DEGRADED' : 'FAILED')
        : 'UNKNOWN';
    const overallColor = overallStatus === 'PASSED' ? 'text-green-400' : overallStatus === 'DEGRADED' ? 'text-yellow-400' : 'text-red-400';
    const overallBg = overallStatus === 'PASSED' ? 'bg-green-500/10 border-green-500/20' : overallStatus === 'DEGRADED' ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-red-500/10 border-red-500/20';

    const tabs = ['overview', 'apis', 'timeline', 'errors', 'interpretation'];

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-slate-900 rounded-2xl border border-white/10 w-full max-w-5xl my-8">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/10">
                    <div className="flex items-center gap-4">
                        <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h2 className="text-xl font-bold text-white">{test.name}</h2>
                            <p className="text-sm text-gray-400 mt-0.5">{test.targetUrl}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${overallBg} ${overallColor}`}>
                            {overallStatus}
                        </span>
                        <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Test Info Bar */}
                <div className="px-5 py-3 bg-slate-800/50 border-b border-white/5 grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                        <p className="text-gray-500 text-xs">Game</p>
                        <p className="text-white font-medium">{gameInfo.game}</p>
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs">Provider</p>
                        <p className="text-white font-medium">{gameInfo.provider}</p>
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs">Environment</p>
                        <p className="text-white font-medium">{gameInfo.environment}</p>
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs">Date</p>
                        <p className="text-white font-medium">{new Date(test.date).toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs">Duration</p>
                        <p className="text-white font-medium">{summary?.duration || test.duration}s ({summary?.peakVUs || test.virtualUsers} VUs)</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 px-5 pt-4 border-b border-white/5">
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all capitalize ${activeTab === tab
                                ? 'bg-slate-800 text-violet-400 border border-white/10 border-b-0'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="p-5 max-h-[60vh] overflow-y-auto">
                    {!summary ? (
                        <div className="text-center py-12 text-gray-500">
                            <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
                            <p>No detailed results available for this test</p>
                        </div>
                    ) : (
                        <>
                            {/* Overview Tab */}
                            {activeTab === 'overview' && (
                                <div className="space-y-6">
                                    {/* Key Metrics */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Zap size={14} className="text-violet-400" />
                                                <span className="text-xs text-gray-500">Total Requests</span>
                                            </div>
                                            <p className="text-2xl font-bold text-white">{summary.totalRequests.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                                            <div className="flex items-center gap-2 mb-1">
                                                <CheckCircle size={14} className="text-green-400" />
                                                <span className="text-xs text-gray-500">Successful</span>
                                            </div>
                                            <p className="text-2xl font-bold text-green-400">{summary.successfulRequests.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                                            <div className="flex items-center gap-2 mb-1">
                                                <AlertTriangle size={14} className="text-red-400" />
                                                <span className="text-xs text-gray-500">Failed</span>
                                            </div>
                                            <p className="text-2xl font-bold text-red-400">{summary.failedRequests.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Activity size={14} className="text-blue-400" />
                                                <span className="text-xs text-gray-500">Throughput</span>
                                            </div>
                                            <p className="text-2xl font-bold text-blue-400">{summary.throughput} <span className="text-sm text-gray-500">req/s</span></p>
                                        </div>
                                    </div>

                                    {/* Response Times */}
                                    <div className="bg-slate-800/50 rounded-xl p-5 border border-white/5">
                                        <h4 className="font-semibold text-white mb-4">Response Times</h4>
                                        <div className="grid grid-cols-3 gap-6 text-center">
                                            <div>
                                                <p className="text-3xl font-bold text-white">{summary.avgResponseTime}<span className="text-sm text-gray-500 ml-1">ms</span></p>
                                                <p className="text-sm text-gray-500 mt-1">Average</p>
                                                <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                                                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, (summary.avgResponseTime / 30))}%` }} />
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-3xl font-bold text-yellow-400">{summary.p95ResponseTime}<span className="text-sm text-gray-500 ml-1">ms</span></p>
                                                <p className="text-sm text-gray-500 mt-1">P95</p>
                                                <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                                                    <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${Math.min(100, (summary.p95ResponseTime / 30))}%` }} />
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-3xl font-bold text-orange-400">{summary.p99ResponseTime}<span className="text-sm text-gray-500 ml-1">ms</span></p>
                                                <p className="text-sm text-gray-500 mt-1">P99</p>
                                                <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                                                    <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min(100, (summary.p99ResponseTime / 30))}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Error Rate & Verdicts */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className={`rounded-xl p-4 border ${rtVerdict.bg} border-white/5`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm text-gray-400">Response Time Verdict</span>
                                                <span className={`text-sm font-bold ${rtVerdict.color}`}>{rtVerdict.label}</span>
                                            </div>
                                            <p className="text-xs text-gray-500">{rtVerdict.desc}</p>
                                        </div>
                                        <div className={`rounded-xl p-4 border ${erVerdict.bg} border-white/5`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm text-gray-400">Error Rate Verdict</span>
                                                <span className={`text-sm font-bold ${erVerdict.color}`}>{erVerdict.label} ({summary.errorRate.toFixed(2)}%)</span>
                                            </div>
                                            <p className="text-xs text-gray-500">{erVerdict.desc}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* APIs Tab */}
                            {activeTab === 'apis' && (
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-white flex items-center gap-2">
                                        <Server size={18} className="text-violet-400" />
                                        APIs Triggered ({apiResults.length})
                                    </h4>
                                    <p className="text-sm text-gray-400">
                                        Each API below was called by <span className="text-white font-medium">{summary.peakVUs} concurrent virtual users</span> against
                                        <span className="text-violet-400 font-medium"> {gameInfo.game}</span> ({gameInfo.provider}) in <span className="text-white font-medium">{gameInfo.environment}</span>
                                    </p>

                                    {apiResults.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">No per-API data available</div>
                                    ) : (
                                        <div className="space-y-3">
                                            {apiResults.map((api, i) => {
                                                const apiRtVerdict = getResponseTimeVerdict(api.avgTime);
                                                const apiErrRate = api.requests > 0 ? ((api.errors / api.requests) * 100) : 0;
                                                const apiErVerdict = getErrorRateVerdict(apiErrRate);

                                                return (
                                                    <div key={i} className="bg-slate-800/50 rounded-xl border border-white/5 overflow-hidden">
                                                        {/* API Header */}
                                                        <div className="p-4">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                    <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold flex-shrink-0 ${
                                                                        api.method === 'GET' ? 'bg-green-500/20 text-green-400' :
                                                                        api.method === 'POST' ? 'bg-blue-500/20 text-blue-400' :
                                                                        api.method === 'PUT' ? 'bg-yellow-500/20 text-yellow-400' :
                                                                        'bg-red-500/20 text-red-400'
                                                                    }`}>{api.method}</span>
                                                                    <span className="font-mono text-sm text-white truncate">{api.endpoint}</span>
                                                                </div>
                                                                <span className={`px-2.5 py-1 rounded text-xs font-medium flex-shrink-0 ml-2 ${
                                                                    api.status === 'healthy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                                                }`}>
                                                                    {api.status === 'healthy' ? 'HEALTHY' : 'DEGRADED'}
                                                                </span>
                                                            </div>

                                                            {api.description && (
                                                                <p className="text-xs text-gray-500 mb-3">{api.description}</p>
                                                            )}

                                                            {/* API Metrics */}
                                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                                                <div className="bg-slate-900/50 rounded-lg p-2.5">
                                                                    <p className="text-xs text-gray-500">Requests</p>
                                                                    <p className="text-sm font-bold text-white">{api.requests.toLocaleString()}</p>
                                                                </div>
                                                                <div className="bg-slate-900/50 rounded-lg p-2.5">
                                                                    <p className="text-xs text-gray-500">Avg Time</p>
                                                                    <p className={`text-sm font-bold ${apiRtVerdict.color}`}>{api.avgTime}ms</p>
                                                                </div>
                                                                <div className="bg-slate-900/50 rounded-lg p-2.5">
                                                                    <p className="text-xs text-gray-500">P95 Time</p>
                                                                    <p className="text-sm font-bold text-yellow-400">{api.p95Time}ms</p>
                                                                </div>
                                                                <div className="bg-slate-900/50 rounded-lg p-2.5">
                                                                    <p className="text-xs text-gray-500">Errors</p>
                                                                    <p className={`text-sm font-bold ${api.errors > 0 ? 'text-red-400' : 'text-green-400'}`}>{api.errors.toLocaleString()}</p>
                                                                </div>
                                                                <div className="bg-slate-900/50 rounded-lg p-2.5">
                                                                    <p className="text-xs text-gray-500">Error Rate</p>
                                                                    <p className={`text-sm font-bold ${apiErVerdict.color}`}>{apiErrRate.toFixed(1)}%</p>
                                                                </div>
                                                            </div>

                                                            {/* API Interpretation */}
                                                            <div className={`mt-3 rounded-lg p-3 text-xs ${api.status === 'healthy' ? 'bg-green-500/5 border border-green-500/10' : 'bg-red-500/5 border border-red-500/10'}`}>
                                                                {api.status === 'healthy' ? (
                                                                    <p className="text-green-300">
                                                                        This endpoint handled {api.requests.toLocaleString()} requests with {api.avgTime}ms avg response time and only {api.errors} failures. Performance is stable under {summary.peakVUs} concurrent users.
                                                                    </p>
                                                                ) : (
                                                                    <p className="text-red-300">
                                                                        This endpoint failed {apiErrRate.toFixed(1)}% of requests ({api.errors.toLocaleString()} out of {api.requests.toLocaleString()}).
                                                                        {apiErrRate >= 99 ? ' This likely requires authentication (Bearer token) that was not provided during the test.' : ' Investigate server-side logs for root cause.'}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Timeline Tab */}
                            {activeTab === 'timeline' && (
                                <div className="space-y-6">
                                    {timeline.length > 0 ? (
                                        <>
                                            <div className="bg-slate-800/50 rounded-xl p-5 border border-white/5">
                                                <h4 className="font-semibold text-white mb-4">Response Time Over Time</h4>
                                                <div className="h-40 flex items-end gap-0.5">
                                                    {timeline.map((t, i) => (
                                                        <div key={i} className="flex-1">
                                                            <div
                                                                className="bg-violet-500/70 rounded-t"
                                                                style={{ height: `${Math.min((t.responseTime / Math.max(...timeline.map(x => x.responseTime || 1))) * 100, 100)}%` }}
                                                                title={`${t.time}s: ${Math.round(t.responseTime)}ms`}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex justify-between mt-1 text-xs text-gray-600">
                                                    <span>0s</span>
                                                    <span>{summary.duration}s</span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="bg-slate-800/50 rounded-xl p-5 border border-white/5">
                                                    <h4 className="font-semibold text-white mb-4">Error Rate Over Time</h4>
                                                    <div className="h-24 flex items-end gap-0.5">
                                                        {timeline.map((t, i) => (
                                                            <div key={i} className="flex-1">
                                                                <div
                                                                    className={`rounded-t ${t.errorRate > 5 ? 'bg-red-500/70' : 'bg-green-500/70'}`}
                                                                    style={{ height: `${Math.max(Math.min(t.errorRate, 100), 2)}%` }}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="bg-slate-800/50 rounded-xl p-5 border border-white/5">
                                                    <h4 className="font-semibold text-white mb-4">Active Users Over Time</h4>
                                                    <div className="h-24 flex items-end gap-0.5">
                                                        {timeline.map((t, i) => (
                                                            <div key={i} className="flex-1">
                                                                <div
                                                                    className="bg-indigo-500/70 rounded-t"
                                                                    style={{ height: `${(t.activeUsers / Math.max(summary.peakVUs, 1)) * 100}%` }}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">No timeline data available</div>
                                    )}
                                </div>
                            )}

                            {/* Errors Tab */}
                            {activeTab === 'errors' && (
                                <div className="space-y-6">
                                    {/* Error Breakdown */}
                                    {errorBreakdown.length > 0 && errorBreakdown.some(e => e.count > 0) ? (
                                        <div className="space-y-3">
                                            <h4 className="font-semibold text-white flex items-center gap-2">
                                                <AlertTriangle size={18} className="text-red-400" />
                                                Error Breakdown
                                            </h4>
                                            {errorBreakdown.filter(e => e.count > 0).map((error, i) => (
                                                <div key={i} className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-3">
                                                            <span className={`px-3 py-1 rounded-lg text-sm font-mono font-bold ${
                                                                error.code >= 500 ? 'bg-red-500/20 text-red-400' :
                                                                error.code === 429 ? 'bg-orange-500/20 text-orange-400' :
                                                                'bg-yellow-500/20 text-yellow-400'
                                                            }`}>{error.code}</span>
                                                            <span className="font-medium text-white">{error.name}</span>
                                                        </div>
                                                        <span className="text-red-400 font-semibold">{error.count.toLocaleString()}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-400 mb-2">{error.description}</p>
                                                    <div className="bg-slate-950 rounded-lg p-3">
                                                        <code className="text-xs text-red-300 font-mono">{error.serverMessage}</code>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <CheckCircle size={32} className="mx-auto mb-2 text-green-400" />
                                            <p className="text-gray-400">No errors recorded during this test</p>
                                        </div>
                                    )}

                                    {/* Bottlenecks */}
                                    {bottlenecks.length > 0 && (
                                        <div className="space-y-3">
                                            <h4 className="font-semibold text-white flex items-center gap-2">
                                                <Activity size={18} className="text-yellow-400" />
                                                Detected Bottlenecks ({bottlenecks.length})
                                            </h4>
                                            {bottlenecks.map((b, i) => (
                                                <div key={i} className={`bg-slate-800/50 rounded-xl p-4 border-l-4 ${b.severity === 'high' ? 'border-l-red-500' : 'border-l-yellow-500'}`}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="font-semibold text-white">{b.type}</span>
                                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${b.severity === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                                            {b.severity.toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-300 mb-2">{b.description}</p>
                                                    {b.metric && (
                                                        <p className="text-xs text-violet-400 font-mono bg-violet-500/10 px-2 py-1 rounded inline-block mb-2">{b.metric}</p>
                                                    )}
                                                    {b.recommendation && (
                                                        <div className="bg-green-500/5 rounded-lg p-3 border border-green-500/10">
                                                            <p className="text-xs text-green-400 font-medium mb-1">Recommendation:</p>
                                                            <p className="text-xs text-green-300">{b.recommendation}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Interpretation Tab */}
                            {activeTab === 'interpretation' && (
                                <div className="space-y-6">
                                    {/* Overall Verdict */}
                                    <div className={`rounded-xl p-6 border ${overallBg}`}>
                                        <div className="flex items-center gap-3 mb-4">
                                            {overallStatus === 'PASSED' ? <CheckCircle size={28} className="text-green-400" /> :
                                             overallStatus === 'DEGRADED' ? <AlertTriangle size={28} className="text-yellow-400" /> :
                                             <AlertTriangle size={28} className="text-red-400" />}
                                            <div>
                                                <h4 className={`text-xl font-bold ${overallColor}`}>Overall Verdict: {overallStatus}</h4>
                                                <p className="text-sm text-gray-400">
                                                    Load test of <span className="text-white">{gameInfo.game}</span> ({gameInfo.provider}) in {gameInfo.environment}
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-300 leading-relaxed">
                                            {overallStatus === 'PASSED'
                                                ? `The game launch flow handled ${summary.totalRequests.toLocaleString()} requests across ${summary.peakVUs} concurrent users with an average response time of ${summary.avgResponseTime}ms and only ${summary.errorRate.toFixed(2)}% error rate. The system is stable under this load.`
                                                : overallStatus === 'DEGRADED'
                                                ? `The game launch flow processed ${summary.totalRequests.toLocaleString()} requests but showed signs of degradation. The ${summary.errorRate.toFixed(2)}% error rate and ${summary.avgResponseTime}ms response time indicate some endpoints are struggling under ${summary.peakVUs} concurrent users.`
                                                : `The game launch flow is unable to handle ${summary.peakVUs} concurrent users reliably. With a ${summary.errorRate.toFixed(2)}% error rate (${summary.failedRequests.toLocaleString()} failed requests), multiple endpoints are failing. See the API breakdown for details.`
                                            }
                                        </p>
                                    </div>

                                    {/* Per-metric interpretation */}
                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-white">Metric-by-Metric Analysis</h4>

                                        <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-medium text-white">Response Time</span>
                                                <span className={`font-bold ${rtVerdict.color}`}>{summary.avgResponseTime}ms avg / {summary.p95ResponseTime}ms p95</span>
                                            </div>
                                            <p className="text-sm text-gray-400">{rtVerdict.desc}</p>
                                            <p className="text-xs text-gray-500 mt-2">
                                                The P95 value of {summary.p95ResponseTime}ms means 95% of all requests completed within this time.
                                                {summary.p95ResponseTime > summary.avgResponseTime * 3 && ' The large gap between avg and P95 suggests inconsistent response times with occasional slow requests.'}
                                            </p>
                                        </div>

                                        <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-medium text-white">Error Rate</span>
                                                <span className={`font-bold ${erVerdict.color}`}>{summary.errorRate.toFixed(2)}% ({summary.failedRequests.toLocaleString()} failed)</span>
                                            </div>
                                            <p className="text-sm text-gray-400">{erVerdict.desc}</p>
                                            {summary.errorRate > 50 && (
                                                <p className="text-xs text-yellow-400 mt-2">
                                                    High error rate is often caused by missing authentication tokens. APIs requiring Bearer tokens will return 401/403 when tested without valid credentials.
                                                </p>
                                            )}
                                        </div>

                                        <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-medium text-white">Throughput</span>
                                                <span className={`font-bold ${tpVerdict.color}`}>{summary.throughput} req/s</span>
                                            </div>
                                            <p className="text-sm text-gray-400">{tpVerdict.desc}</p>
                                            <p className="text-xs text-gray-500 mt-2">
                                                With {summary.peakVUs} VUs, the system processed {summary.throughput} requests per second over {summary.duration} seconds,
                                                totaling {summary.totalRequests.toLocaleString()} requests.
                                            </p>
                                        </div>
                                    </div>

                                    {/* API-level summary */}
                                    {apiResults.length > 0 && (
                                        <div className="space-y-3">
                                            <h4 className="font-semibold text-white">API Health Summary</h4>
                                            <div className="bg-slate-800/50 rounded-xl border border-white/5 overflow-hidden">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="border-b border-white/5">
                                                            <th className="text-left p-3 text-gray-500 text-xs font-medium">API</th>
                                                            <th className="text-right p-3 text-gray-500 text-xs font-medium">Requests</th>
                                                            <th className="text-right p-3 text-gray-500 text-xs font-medium">Avg Time</th>
                                                            <th className="text-right p-3 text-gray-500 text-xs font-medium">Error Rate</th>
                                                            <th className="text-center p-3 text-gray-500 text-xs font-medium">Status</th>
                                                            <th className="text-left p-3 text-gray-500 text-xs font-medium">Interpretation</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {apiResults.map((api, i) => {
                                                            const apiErrRate = api.requests > 0 ? ((api.errors / api.requests) * 100) : 0;
                                                            let interpretation = '';
                                                            if (apiErrRate >= 99) interpretation = 'Auth required - needs Bearer token';
                                                            else if (apiErrRate > 10) interpretation = 'Degraded under load';
                                                            else if (api.avgTime > 500) interpretation = 'Slow response - optimize';
                                                            else interpretation = 'Performing well';

                                                            return (
                                                                <tr key={i} className="border-b border-white/5 last:border-0">
                                                                    <td className="p-3">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                                                                                api.method === 'GET' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                                                                            }`}>{api.method}</span>
                                                                            <span className="font-mono text-xs text-gray-300 truncate max-w-[200px]">{api.endpoint.split('?')[0]}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-3 text-right text-white">{api.requests.toLocaleString()}</td>
                                                                    <td className={`p-3 text-right ${getResponseTimeVerdict(api.avgTime).color}`}>{api.avgTime}ms</td>
                                                                    <td className={`p-3 text-right ${getErrorRateVerdict(apiErrRate).color}`}>{apiErrRate.toFixed(1)}%</td>
                                                                    <td className="p-3 text-center">
                                                                        <span className={`px-2 py-0.5 rounded text-xs ${api.status === 'healthy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                                            {api.status}
                                                                        </span>
                                                                    </td>
                                                                    <td className="p-3 text-xs text-gray-400">{interpretation}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* Recommendations */}
                                    <div className="bg-slate-800/50 rounded-xl p-5 border border-white/5">
                                        <h4 className="font-semibold text-white mb-3">Recommendations</h4>
                                        <ul className="space-y-2">
                                            {summary.errorRate > 50 && (
                                                <li className="flex items-start gap-2 text-sm">
                                                    <AlertTriangle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                                                    <span className="text-red-300">Add authentication tokens to the test configuration. Most failures are likely 401/403 responses from protected endpoints.</span>
                                                </li>
                                            )}
                                            {apiResults.some(a => a.status === 'degraded' && ((a.errors / Math.max(a.requests, 1)) * 100) < 99) && (
                                                <li className="flex items-start gap-2 text-sm">
                                                    <AlertTriangle size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                                                    <span className="text-yellow-300">Some endpoints show genuine degradation under load. Check server resource utilization and connection pools.</span>
                                                </li>
                                            )}
                                            {summary.avgResponseTime < 300 && (
                                                <li className="flex items-start gap-2 text-sm">
                                                    <CheckCircle size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                                                    <span className="text-green-300">Response times are healthy. The infrastructure handles {summary.peakVUs} concurrent game launches well.</span>
                                                </li>
                                            )}
                                            <li className="flex items-start gap-2 text-sm">
                                                <CheckCircle size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                                                <span className="text-gray-300">Consider running a follow-up test with higher VU count to find the breaking point.</span>
                                            </li>
                                            <li className="flex items-start gap-2 text-sm">
                                                <CheckCircle size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                                                <span className="text-gray-300">For Habanero canvas game testing (spin/bet), capture a HAR file while playing to extract WebSocket and game API calls.</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// Validation Results Inline Display
const ValidationResultsPanel = ({ results }) => {
    if (!results || results.length === 0) return null;

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    return (
        <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-400">Validation:</span>
                <span className="text-green-400">{successCount} passed</span>
                {failCount > 0 && <span className="text-red-400">{failCount} failed</span>}
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {results.map((r, i) => (
                    <div key={i} className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg ${r.success ? 'bg-green-500/5 border border-green-500/10' : 'bg-red-500/5 border border-red-500/10'}`}>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            {r.success
                                ? <CheckCircle size={12} className="text-green-400 flex-shrink-0" />
                                : <AlertTriangle size={12} className="text-red-400 flex-shrink-0" />
                            }
                            <span className={`px-1.5 py-0.5 rounded font-mono font-bold flex-shrink-0 ${
                                r.method === 'GET' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                            }`}>{r.method || 'GET'}</span>
                            <span className="text-gray-300 truncate font-mono">{(r.endpoint || r.fullUrl || '').split('?')[0]}</span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                            <span className={`font-medium ${r.success ? 'text-green-400' : 'text-red-400'}`}>
                                {r.status || 'ERR'}
                            </span>
                            <span className="text-gray-500">{r.responseTime}ms</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// AI Analysis Results Panel
const AnalysisResultsPanel = ({ analysis }) => {
    const [expanded, setExpanded] = useState(false);
    if (!analysis) return null;

    const provider = analysis.provider_analysis;
    const profile = analysis.performance_profile;

    return (
        <div className="mt-3 space-y-2">
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-2 text-xs text-violet-400 hover:text-violet-300 transition-all"
            >
                <Brain size={12} />
                AI Analysis Results
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {expanded && (
                <div className="bg-slate-900/50 rounded-lg p-3 space-y-3 border border-violet-500/10">
                    {provider && (
                        <div className="flex flex-wrap gap-2">
                            <span className="px-2 py-1 rounded text-xs bg-violet-500/20 text-violet-400">
                                {provider.provider_name}
                            </span>
                            <span className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400">
                                {provider.architecture_type}
                            </span>
                            <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-400">
                                {provider.game_type}
                            </span>
                            <span className="px-2 py-1 rounded text-xs bg-gray-500/20 text-gray-400">
                                Confidence: {provider.confidence}
                            </span>
                        </div>
                    )}
                    {profile && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-slate-800/50 rounded px-2 py-1.5">
                                <span className="text-gray-500">Recommended VUs:</span>
                                <span className="text-white ml-1 font-medium">{profile.recommended_vus}</span>
                            </div>
                            <div className="bg-slate-800/50 rounded px-2 py-1.5">
                                <span className="text-gray-500">Duration:</span>
                                <span className="text-white ml-1 font-medium">{profile.recommended_duration_seconds}s</span>
                            </div>
                            <div className="bg-slate-800/50 rounded px-2 py-1.5">
                                <span className="text-gray-500">P95 Target:</span>
                                <span className="text-white ml-1 font-medium">{profile.expected_response_time_p95_ms}ms</span>
                            </div>
                            <div className="bg-slate-800/50 rounded px-2 py-1.5">
                                <span className="text-gray-500">Rate Limited:</span>
                                <span className={`ml-1 font-medium ${profile.rate_limit_detected ? 'text-yellow-400' : 'text-green-400'}`}>
                                    {profile.rate_limit_detected ? 'Yes' : 'No'}
                                </span>
                            </div>
                        </div>
                    )}
                    {analysis.recommendations && analysis.recommendations.length > 0 && (
                        <div className="text-xs space-y-1">
                            <span className="text-gray-500">Recommendations:</span>
                            {analysis.recommendations.map((rec, i) => (
                                <p key={i} className="text-gray-400 pl-2 border-l border-violet-500/20">{rec}</p>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default function LoadTestingHistory({
    savedConfigs, onLoadConfig, onDeleteConfig, onCloneConfig, onViewResults,
    onValidateConfig, onAnalyzeConfig, onGenerateK6,
    validationResults, validatingConfigId, analysisResults, analyzingConfigId
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('date');
    const [testHistory, setTestHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTest, setSelectedTest] = useState(null);
    const [fullResults, setFullResults] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [collapsedProviders, setCollapsedProviders] = useState({});

    useEffect(() => {
        fetch('/api/loadtest/history')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.tests && data.tests.length > 0) {
                    const mapped = data.tests.map(t => ({
                        id: t.id,
                        name: t.name || t.config?.testName || 'Unnamed Test',
                        targetUrl: t.targetUrl || '',
                        date: t.startTime || t.timestamp || '',
                        duration: t.duration || t.config?.duration || 0,
                        virtualUsers: t.config?.virtualUsers || 0,
                        status: t.status || 'completed',
                        results: t.results || { avgTime: 0, throughput: 0, errorRate: 0 }
                    }));
                    setTestHistory(mapped);
                } else {
                    setTestHistory(fallbackHistory);
                }
            })
            .catch(() => {
                setTestHistory(fallbackHistory);
            })
            .finally(() => setLoading(false));
    }, []);

    const handleViewDetails = (test) => {
        setSelectedTest(test);
        setLoadingDetails(true);
        fetch(`/api/loadtest/results/${test.id}`)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.fullResults) {
                    setFullResults(data.fullResults);
                } else {
                    setFullResults(null);
                }
            })
            .catch(() => setFullResults(null))
            .finally(() => setLoadingDetails(false));
    };

    const handleViewInResultsTab = (test) => {
        if (!onViewResults) return;
        fetch(`/api/loadtest/results/${test.id}`)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.fullResults) {
                    onViewResults(data.fullResults);
                }
            })
            .catch(err => console.error('Failed to load results:', err));
    };

    const filteredHistory = testHistory.filter(test =>
        test.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        test.targetUrl.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sortedHistory = [...filteredHistory].sort((a, b) => {
        if (sortBy === 'date') return new Date(b.date) - new Date(a.date);
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'status') return a.status.localeCompare(b.status);
        return 0;
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'bg-green-500/20 text-green-400';
            case 'failed': return 'bg-red-500/20 text-red-400';
            case 'running': return 'bg-blue-500/20 text-blue-400';
            default: return 'bg-gray-500/20 text-gray-400';
        }
    };

    const formatDuration = (seconds) => {
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    };

    return (
        <div className="space-y-6">
            {/* Saved Configurations — Grouped by Provider */}
            {savedConfigs.length > 0 && (() => {
                // Group configs by provider
                const groups = {};
                savedConfigs.forEach(config => {
                    const provider = config.provider || 'Ungrouped';
                    if (!groups[provider]) groups[provider] = [];
                    groups[provider].push(config);
                });
                const providerNames = Object.keys(groups).sort((a, b) => {
                    if (a === 'Ungrouped') return 1;
                    if (b === 'Ungrouped') return -1;
                    return a.localeCompare(b);
                });

                return (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Settings size={20} className="text-violet-400" />
                                Saved Configurations
                                <span className="text-sm font-normal text-gray-500">({savedConfigs.length})</span>
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Package size={14} />
                                {providerNames.filter(p => p !== 'Ungrouped').length} providers
                            </div>
                        </div>

                        {providerNames.map(provider => {
                            const configs = groups[provider];
                            const isCollapsed = collapsedProviders[provider];

                            return (
                                <div key={provider} className="bg-slate-800/50 rounded-xl border border-white/5 overflow-hidden">
                                    {/* Provider Header */}
                                    <button
                                        onClick={() => setCollapsedProviders(prev => ({ ...prev, [provider]: !prev[provider] }))}
                                        className="w-full flex items-center justify-between p-4 hover:bg-slate-700/30 transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            {provider !== 'Ungrouped' ? (
                                                <div className="p-1.5 rounded-lg bg-violet-500/20 border border-violet-500/30">
                                                    <Zap size={16} className="text-violet-400" />
                                                </div>
                                            ) : (
                                                <div className="p-1.5 rounded-lg bg-gray-500/20 border border-gray-500/30">
                                                    <Settings size={16} className="text-gray-400" />
                                                </div>
                                            )}
                                            <div className="text-left">
                                                <p className="font-medium text-white">{provider}</p>
                                                <p className="text-xs text-gray-500">{configs.length} config{configs.length !== 1 ? 's' : ''}</p>
                                            </div>
                                        </div>
                                        {isCollapsed ? <ChevronRight size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
                                    </button>

                                    {/* Provider Configs */}
                                    {!isCollapsed && (
                                        <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {configs.map(config => (
                                                <div
                                                    key={config.id}
                                                    className="p-4 bg-slate-900/50 rounded-xl border border-white/5 hover:border-violet-500/30 transition-all"
                                                >
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-medium text-white truncate">{config.name}</p>
                                                            <p className="text-xs text-gray-500 truncate">{config.targetUrl}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                                                        <span className="flex items-center gap-1">
                                                            <Users size={12} />
                                                            {config.loadConfig?.virtualUsers || 10} VUs
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock size={12} />
                                                            {formatDuration(config.loadConfig?.duration || 60)}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Globe size={12} />
                                                            {(config.selectedApis || []).length} APIs
                                                        </span>
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="flex gap-2 flex-wrap">
                                                        <button
                                                            onClick={() => onLoadConfig(config)}
                                                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 transition-all"
                                                        >
                                                            <Play size={14} />
                                                            Load
                                                        </button>
                                                        <button
                                                            onClick={() => onValidateConfig && onValidateConfig(config)}
                                                            disabled={validatingConfigId === config.id}
                                                            className={`p-2 rounded-lg transition-all ${
                                                                validatingConfigId === config.id
                                                                    ? 'text-yellow-400 bg-yellow-500/10 cursor-wait'
                                                                    : 'text-green-500 hover:text-green-400 hover:bg-green-500/10'
                                                            }`}
                                                            title="Validate APIs (real HTTP requests)"
                                                        >
                                                            {validatingConfigId === config.id
                                                                ? <Loader size={14} className="animate-spin" />
                                                                : <Shield size={14} />
                                                            }
                                                        </button>
                                                        <button
                                                            onClick={() => onAnalyzeConfig && onAnalyzeConfig(config)}
                                                            disabled={analyzingConfigId === config.id}
                                                            className={`p-2 rounded-lg transition-all ${
                                                                analyzingConfigId === config.id
                                                                    ? 'text-yellow-400 bg-yellow-500/10 cursor-wait'
                                                                    : 'text-purple-500 hover:text-purple-400 hover:bg-purple-500/10'
                                                            }`}
                                                            title="AI Analysis"
                                                        >
                                                            {analyzingConfigId === config.id
                                                                ? <Loader size={14} className="animate-spin" />
                                                                : <Brain size={14} />
                                                            }
                                                        </button>
                                                        <button
                                                            onClick={() => onGenerateK6 && onGenerateK6(config)}
                                                            className="p-2 rounded-lg text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                                                            title="Download K6 script"
                                                        >
                                                            <Download size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => onCloneConfig && onCloneConfig(config)}
                                                            className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-slate-700 transition-all"
                                                            title="Clone configuration"
                                                        >
                                                            <Copy size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => onDeleteConfig && onDeleteConfig(config.id)}
                                                            className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                                            title="Delete configuration"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>

                                                    {/* Validation Results */}
                                                    {validationResults && validationResults[config.id] && (
                                                        <ValidationResultsPanel results={validationResults[config.id]} />
                                                    )}

                                                    {/* AI Analysis Results */}
                                                    {analysisResults && analysisResults[config.id] && (
                                                        <AnalysisResultsPanel analysis={analysisResults[config.id]} />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                );
            })()}

            {/* Test History */}
            <div className="bg-slate-800/50 rounded-xl border border-white/5 overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <History size={20} className="text-violet-400" />
                        Test History
                    </h3>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search tests..."
                                className="bg-slate-900/50 border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-sm text-white placeholder-gray-600 focus:border-violet-500/50 focus:outline-none w-48"
                            />
                        </div>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="bg-slate-900/50 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:border-violet-500/50 focus:outline-none"
                        >
                            <option value="date">Sort by Date</option>
                            <option value="name">Sort by Name</option>
                            <option value="status">Sort by Status</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-gray-500">
                        <Loader size={32} className="mx-auto mb-4 animate-spin text-violet-400" />
                        <p>Loading test history...</p>
                    </div>
                ) : sortedHistory.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <History size={48} className="mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">No Test History</p>
                        <p className="text-sm">Run load tests to see them here</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {sortedHistory.map(test => (
                            <div
                                key={test.id}
                                className="p-4 hover:bg-slate-700/20 transition-all cursor-pointer"
                                onClick={() => handleViewDetails(test)}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(test.status)}`}>
                                            {test.status.toUpperCase()}
                                        </span>
                                        <div>
                                            <p className="font-medium text-white">{test.name}</p>
                                            <p className="text-xs text-gray-500">{test.targetUrl}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-gray-400">{new Date(test.date).toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 mb-3 text-sm text-gray-400">
                                    <span className="flex items-center gap-1">
                                        <Users size={14} />
                                        {test.virtualUsers} VUs
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Clock size={14} />
                                        {formatDuration(test.duration)}
                                    </span>
                                </div>

                                {test.results && (
                                    <div className="grid grid-cols-3 gap-4 p-3 bg-slate-900/30 rounded-lg">
                                        <div>
                                            <p className="text-xs text-gray-500">Avg Response</p>
                                            <p className={`text-sm font-medium ${test.results.avgTime < 300 ? 'text-green-400' : test.results.avgTime < 500 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                {test.results.avgTime}ms
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Throughput</p>
                                            <p className="text-sm font-medium text-violet-400">{test.results.throughput} req/s</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Error Rate</p>
                                            <p className={`text-sm font-medium ${test.results.errorRate < 2 ? 'text-green-400' : test.results.errorRate < 5 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                {test.results.errorRate}%
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); }}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 transition-all"
                                        >
                                            <Play size={12} />
                                            Re-run
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); }}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-slate-700 text-gray-400 hover:text-white transition-all"
                                        >
                                            <Copy size={12} />
                                            Clone
                                        </button>
                                        {onViewResults && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleViewInResultsTab(test); }}
                                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all"
                                            >
                                                <BarChart3 size={12} />
                                                View in Results
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleViewDetails(test); }}
                                        className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-all font-medium"
                                    >
                                        View Detailed Report
                                        <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Statistics Summary */}
            {testHistory.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                        <p className="text-xs text-gray-500 mb-1">Total Tests Run</p>
                        <p className="text-2xl font-bold text-white">{testHistory.length}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                        <p className="text-xs text-gray-500 mb-1">Success Rate</p>
                        <p className="text-2xl font-bold text-green-400">
                            {Math.round((testHistory.filter(t => t.status === 'completed').length / testHistory.length) * 100)}%
                        </p>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                        <p className="text-xs text-gray-500 mb-1">Avg Response Time</p>
                        <p className="text-2xl font-bold text-violet-400">
                            {Math.round(testHistory.reduce((acc, t) => acc + (t.results?.avgTime || 0), 0) / testHistory.length)}ms
                        </p>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                        <p className="text-xs text-gray-500 mb-1">Saved Configs</p>
                        <p className="text-2xl font-bold text-violet-400">{savedConfigs.length}</p>
                    </div>
                </div>
            )}

            {/* Detailed Report Modal */}
            {selectedTest && (
                <DetailedReportModal
                    test={selectedTest}
                    fullResults={fullResults}
                    onClose={() => { setSelectedTest(null); setFullResults(null); }}
                />
            )}
        </div>
    );
}
