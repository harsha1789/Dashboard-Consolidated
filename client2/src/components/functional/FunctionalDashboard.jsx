import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { FlaskConical, BarChart2, Clock, FileText } from 'lucide-react';

import FunctionalTestPanel from './FunctionalTestPanel';
import FunctionalStatistics from './FunctionalStatistics';
import FunctionalHistory from './FunctionalHistory';
import FunctionalReports from './FunctionalReports';

const socket = io();

// API Base URL for functional testing
const API_BASE = '/api/functional';

export default function FunctionalDashboard() {
    const [activeView, setActiveView] = useState('dashboard'); // dashboard, stats, history, reports
    const [config, setConfig] = useState(null);
    const [inputValues, setInputValues] = useState({});
    const [selectedScripts, setSelectedScripts] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [logs, setLogs] = useState([]);
    const [history, setHistory] = useState([]);
    const [currentRunId, setCurrentRunId] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [latestRun, setLatestRun] = useState(null);
    const [currentViewingRun, setCurrentViewingRun] = useState(null);
    const [reportKey, setReportKey] = useState(Date.now());
    const [scriptsList, setScriptsList] = useState([]);
    const logsEndRef = useRef(null);

    const [configError, setConfigError] = useState(null);

    // 1. Fetch Configuration on Mount
    useEffect(() => {
        axios.get(`${API_BASE}/config`)
            .then(res => {
                const cfg = res.data;
                if (cfg.error) {
                    setConfigError(cfg.error);
                    return;
                }
                setConfig(cfg);
                setConfigError(null);

                // Initialize defaults
                const initialValues = {};
                if (cfg.inputs) {
                    cfg.inputs.forEach(input => {
                        initialValues[input.id] = input.default || '';
                        if (!initialValues[input.id] && input.type === 'select' && input.options.length > 0) {
                            const firstOpt = input.options[0];
                            initialValues[input.id] = typeof firstOpt === 'string' ? firstOpt : firstOpt.value;
                        }
                    });
                }
                setInputValues(initialValues);
            })
            .catch(err => {
                console.error("Failed to load functional config", err);
                setConfigError(err.response?.data?.error || err.message || 'Failed to load configuration. Please restart the server.');
            });
    }, []);

    // 2. Fetch Scripts when inputs change
    useEffect(() => {
        if (!config) return;
        fetchScripts();
    }, [inputValues, config]);

    const fetchScripts = () => {
        if (!config) return;
        const params = new URLSearchParams(inputValues).toString();
        axios.get(`${API_BASE}/scripts?${params}`)
            .then(res => {
                setScriptsList(res.data.scripts);
            })
            .catch(err => console.error("Failed to fetch scripts:", err));
    };

    const handleInputChange = (inputId, value) => {
        setInputValues(prev => ({
            ...prev,
            [inputId]: value
        }));
    };

    // Socket listeners
    useEffect(() => {
        fetchHistory();
        fetchLatestRun();

        socket.on('functional:execution:start', (data) => {
            console.log('Functional execution:start', data);
            setIsRunning(true);
            setCurrentRunId(data.runId);
            // Don't clear logs here - already cleared in handleRun
        });

        socket.on('functional:execution:log', (data) => {
            setLogs(prev => [...prev, { type: data.type, data: data.data, timestamp: new Date() }]);
        });

        socket.on('functional:execution:end', (data) => {
            console.log('Functional execution:end', data);
            setIsRunning(false);
            fetchHistory();
            fetchLatestRun();
            if (data.results) {
                setLatestRun(data.results);
            }
            setReportKey(Date.now());
        });

        socket.on('functional:execution:stopped', (data) => {
            console.log('Functional execution:stopped', data);
            setIsRunning(false);
            setLogs(prev => [...prev, { type: 'info', data: `\n⚠️ ${data.message}\n`, timestamp: new Date() }]);
        });

        return () => {
            socket.off('functional:execution:start');
            socket.off('functional:execution:log');
            socket.off('functional:execution:end');
            socket.off('functional:execution:stopped');
        };
    }, []);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const fetchHistory = () => {
        axios.get(`${API_BASE}/history`)
            .then(res => setHistory(res.data))
            .catch(err => console.error(err));
    };

    const fetchLatestRun = () => {
        axios.get(`${API_BASE}/runs/latest`)
            .then(res => {
                setLatestRun(res.data);
                if (!currentViewingRun) {
                    setCurrentViewingRun(res.data);
                }
            })
            .catch(err => {
                if (err.response?.status !== 404) {
                    console.error('Error fetching latest run:', err);
                }
            });
    };

    const viewRunStatistics = (runId) => {
        axios.get(`${API_BASE}/runs/${runId}`)
            .then(res => {
                setCurrentViewingRun(res.data);
                setActiveView('stats');
            })
            .catch(err => alert('Failed to load run: ' + err.message));
    };

    const handleRerun = (runId) => {
        if (isRunning) return; // Prevent rerun while execution is in progress
        if (!confirm('Are you sure you want to rerun this execution?')) return;

        setIsRunning(true);
        setLogs([]);
        setActiveView('dashboard');

        axios.post(`${API_BASE}/runs/${runId}/rerun`)
            .then(res => {
                console.log('Rerun started:', res.data);
            })
            .catch(err => {
                setIsRunning(false);
                alert('Failed to rerun: ' + err.message);
            });
    };

    const handleStop = () => {
        axios.post(`${API_BASE}/stop`)
            .then(res => {
                console.log('Execution stopped:', res.data);
            })
            .catch(err => {
                if (err.response?.status === 400) {
                    console.log('No execution is currently running');
                } else {
                    console.error('Failed to stop execution:', err.message);
                }
            });
    };

    const toggleScript = (script) => {
        setSelectedScripts(prev =>
            prev.includes(script)
                ? prev.filter(s => s !== script)
                : [...prev, script]
        );
    };

    const selectAllScripts = (list) => {
        setSelectedScripts(list || scriptsList);
    };

    const clearAllScripts = () => {
        setSelectedScripts([]);
    };

    const handleRun = () => {
        if (selectedScripts.length === 0) return alert("Select at least one script");
        if (isRunning) return; // Prevent duplicate executions

        // Set running state immediately to prevent race condition
        setIsRunning(true);
        setLogs([]);

        axios.post(`${API_BASE}/execute`, {
            ...inputValues,
            scripts: selectedScripts
        })
            .then(res => console.log("Started", res.data))
            .catch(err => {
                setIsRunning(false); // Reset on error
                alert("Failed to start: " + err.message);
            });
    };

    const getStats = () => {
        const total = history.length;
        const passed = history.filter(h => h.status === 'Passed').length;
        const failed = history.filter(h => h.status === 'Failed').length;
        const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;
        const avgDuration = total > 0 ? Math.round(history.reduce((acc, h) => acc + (h.duration || 0), 0) / total / 1000) : 0;
        return { total, passed, failed, successRate, avgDuration };
    };

    const stats = getStats();

    const filteredHistory = filterStatus === 'all'
        ? history
        : history.filter(h => h.status.toLowerCase() === filterStatus);

    // Error state
    if (configError) {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FlaskConical className="w-8 h-8 text-red-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Configuration Error</h3>
                    <p className="text-gray-400 mb-4">{configError}</p>
                    <div className="bg-slate-800/50 rounded-lg p-4 text-left text-sm text-gray-300">
                        <p className="font-bold text-orange-400 mb-2">To fix this:</p>
                        <ol className="list-decimal list-inside space-y-1">
                            <li>Ensure <code className="bg-slate-700 px-1 rounded">dashboard.config.json</code> exists in Betway-Automation folder</li>
                            <li>Restart the server after making changes</li>
                            <li>Check server console for detailed errors</li>
                        </ol>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // Loading state
    if (!config) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading Functional Testing Configuration...</p>
                </div>
            </div>
        );
    }

    // Sub-navigation tabs
    const NavTab = ({ id, label, icon: Icon }) => (
        <button
            onClick={() => setActiveView(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeView === id
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
        >
            <Icon size={16} />
            {label}
        </button>
    );

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 md:p-6 pt-14 border-b border-white/5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/30">
                            <FlaskConical className="w-6 h-6 text-orange-400" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 bg-clip-text text-transparent">
                                {config?.projectName || 'Functional Testing'}
                            </h1>
                            <p className="text-gray-400 text-sm">Configure and run automation tests</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <NavTab id="dashboard" label="Dashboard" icon={FlaskConical} />
                        <NavTab id="stats" label="Statistics" icon={BarChart2} />
                        <NavTab id="history" label="History" icon={Clock} />
                        <NavTab id="reports" label="Reports" icon={FileText} />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                {activeView === 'dashboard' && (
                    <FunctionalTestPanel
                        config={config}
                        inputValues={inputValues}
                        onInputChange={handleInputChange}
                        selectedScripts={selectedScripts}
                        toggleScript={toggleScript}
                        selectAllScripts={selectAllScripts}
                        clearAllScripts={clearAllScripts}
                        handleRun={handleRun}
                        handleStop={handleStop}
                        isRunning={isRunning}
                        logs={logs}
                        logsEndRef={logsEndRef}
                        stats={stats}
                        scriptsList={scriptsList}
                    />
                )}

                {activeView === 'stats' && (
                    <FunctionalStatistics
                        run={currentViewingRun}
                        latestRun={latestRun}
                        onBackToLatest={() => setCurrentViewingRun(latestRun)}
                    />
                )}

                {activeView === 'history' && (
                    <FunctionalHistory
                        history={filteredHistory}
                        filterStatus={filterStatus}
                        setFilterStatus={setFilterStatus}
                        onViewStatistics={viewRunStatistics}
                        onRerun={handleRerun}
                    />
                )}

                {activeView === 'reports' && (
                    <FunctionalReports reportKey={reportKey} apiBase={API_BASE} />
                )}
            </div>
        </div>
    );
}
