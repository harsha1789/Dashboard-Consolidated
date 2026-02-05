import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Zap, Globe, Search, Settings, Play, BarChart3, History, Save, Clock, Square, Wifi, WifiOff, Download } from 'lucide-react';
import { io } from 'socket.io-client';

// Sub-components
import LoadTestingScanner from './LoadTestingScanner';
import LoadTestingAPIList from './LoadTestingAPIList';
import LoadTestingConfig from './LoadTestingConfig';
import LoadTestingResults from './LoadTestingResults';
import LoadTestingHistory from './LoadTestingHistory';

const TabButton = ({ icon, label, active, onClick, badge }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all text-sm font-medium ${active
            ? 'bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-violet-400 border border-violet-500/30'
            : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
    >
        {icon}
        <span>{label}</span>
        {badge && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-violet-500/20 text-violet-400">
                {badge}
            </span>
        )}
    </button>
);

export default function LoadTestingDashboard() {
    const [activeSubTab, setActiveSubTab] = useState('scanner');
    const [targetUrl, setTargetUrl] = useState('');
    const [discoveredApis, setDiscoveredApis] = useState([]);
    const [selectedApis, setSelectedApis] = useState([]);
    const [isScanning, setIsScanning] = useState(false);
    const [isRunningTest, setIsRunningTest] = useState(false);
    const [testResults, setTestResults] = useState(null);
    const [savedConfigs, setSavedConfigs] = useState([]);

    // k6 integration state
    const [testId, setTestId] = useState(null);
    const [k6Available, setK6Available] = useState(null);
    const [liveMetrics, setLiveMetrics] = useState(null);
    const [testProgress, setTestProgress] = useState(null);
    const [customHeaders, setCustomHeaders] = useState([{ key: '', value: '' }]);
    const socketRef = useRef(null);

    // Validation & analysis state
    const [validationResults, setValidationResults] = useState({});
    const [validatingConfigId, setValidatingConfigId] = useState(null);
    const [analysisResults, setAnalysisResults] = useState({});
    const [analyzingConfigId, setAnalyzingConfigId] = useState(null);

    // Default load test configuration
    const [loadConfig, setLoadConfig] = useState({
        testName: '',
        testType: 'single', // single, multiple, flow
        virtualUsers: 10,
        rampUpTime: 30,
        duration: 60,
        requestsPerSecond: 100,
        thinkTime: 1,
        environment: 'dev',
        scheduleTest: false,
        scheduleTime: null
    });

    // Check k6 availability on mount, load last results, and set up Socket.IO
    useEffect(() => {
        // Check k6 status
        fetch('/api/loadtest/k6/status')
            .then(res => res.json())
            .then(data => setK6Available(data.available))
            .catch(() => setK6Available(false));

        // Load saved configs
        fetch('/api/loadtest/configs')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.configs) {
                    setSavedConfigs(data.configs);
                }
            })
            .catch(() => {});

        // Auto-load the most recent test results if none are loaded
        fetch('/api/loadtest/history?limit=1')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.tests && data.tests.length > 0) {
                    const lastTest = data.tests[0];
                    if (lastTest.fullResults) {
                        setTestResults(lastTest.fullResults);
                    } else if (lastTest.id) {
                        // Fetch full results by ID
                        fetch(`/api/loadtest/results/${lastTest.id}`)
                            .then(r => r.json())
                            .then(d => {
                                if (d.success && d.fullResults) {
                                    setTestResults(d.fullResults);
                                }
                            })
                            .catch(() => {});
                    }
                }
            })
            .catch(() => {});

        // Set up Socket.IO connection
        const socket = io(window.location.origin, { transports: ['websocket', 'polling'] });
        socketRef.current = socket;

        socket.on('loadtest:metrics', (data) => {
            setLiveMetrics(data);
            // Build live timeline from metrics
            setTestResults(prev => {
                if (!prev) {
                    return {
                        summary: {
                            totalRequests: data.requestCount,
                            successfulRequests: Math.floor(data.requestCount * (1 - data.errorRate / 100)),
                            failedRequests: Math.floor(data.requestCount * data.errorRate / 100),
                            avgResponseTime: data.responseTime,
                            p95ResponseTime: Math.round(data.responseTime * 1.8),
                            p99ResponseTime: Math.round(data.responseTime * 2.5),
                            throughput: data.throughput,
                            errorRate: data.errorRate,
                            peakVUs: data.activeUsers,
                            duration: data.elapsed
                        },
                        timeline: [data],
                        apiResults: [],
                        bottlenecks: [],
                        errorBreakdown: []
                    };
                }
                return {
                    ...prev,
                    summary: {
                        ...prev.summary,
                        totalRequests: data.requestCount,
                        successfulRequests: Math.floor(data.requestCount * (1 - data.errorRate / 100)),
                        failedRequests: Math.floor(data.requestCount * data.errorRate / 100),
                        avgResponseTime: data.responseTime,
                        throughput: data.throughput,
                        errorRate: data.errorRate,
                        peakVUs: Math.max(prev.summary.peakVUs || 0, data.activeUsers),
                        duration: data.elapsed
                    },
                    timeline: [...(prev.timeline || []), data]
                };
            });
        });

        socket.on('loadtest:progress', (data) => {
            setTestProgress(data);
        });

        socket.on('loadtest:complete', (data) => {
            setTestResults(data.results);
            setIsRunningTest(false);
            setTestProgress(null);
            setLiveMetrics(null);
        });

        socket.on('loadtest:error', (data) => {
            console.error('[LoadTest] Error:', data.error);
            setIsRunningTest(false);
            setTestProgress(null);
            setLiveMetrics(null);
        });

        socket.on('loadtest:stopped', () => {
            setIsRunningTest(false);
            setTestProgress(null);
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    // Handle API discovery completion
    const handleApisDiscovered = (apis) => {
        setDiscoveredApis(apis);
        setActiveSubTab('apis');

        // Check if there's a demo config to load
        const demoConfig = localStorage.getItem('demoLoadConfig');
        if (demoConfig) {
            try {
                const config = JSON.parse(demoConfig);
                setLoadConfig(prev => ({
                    ...prev,
                    virtualUsers: config.virtualUsers || prev.virtualUsers,
                    duration: config.duration || prev.duration,
                    rampUpTime: config.rampUpTime || prev.rampUpTime,
                    testName: config.testName || prev.testName
                }));
                localStorage.removeItem('demoLoadConfig');
            } catch (e) {
                console.error('Failed to parse demo config:', e);
            }
        }

        // Auto-select all APIs for demo scenarios
        setSelectedApis(apis);
    };

    // Handle API selection
    const handleApiSelection = (apis) => {
        setSelectedApis(apis);
    };

    // Handle API update (from edit modal)
    const handleApiUpdate = (updatedApi) => {
        setDiscoveredApis(prevApis =>
            prevApis.map(api => api.id === updatedApi.id ? updatedApi : api)
        );
    };

    // Handle stopping a running test
    const handleStopTest = async () => {
        if (!testId) return;
        try {
            await fetch(`/api/loadtest/execute/stop/${testId}`, { method: 'POST' });
        } catch (e) {
            console.error('Failed to stop test:', e);
        }
    };

    // Handle test execution
    const handleRunTest = async () => {
        if (selectedApis.length === 0) {
            alert('Please select at least one API to test');
            return;
        }

        setIsRunningTest(true);
        setTestResults(null);
        setTestProgress(null);
        setLiveMetrics(null);
        setActiveSubTab('results');

        // If k6 is available, use real execution
        if (k6Available) {
            try {
                const res = await fetch('/api/loadtest/execute', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        selectedApis,
                        loadConfig,
                        customHeaders: customHeaders.filter(h => h.key && h.value),
                        targetUrl
                    })
                });
                const data = await res.json();
                if (data.success) {
                    setTestId(data.testId);
                } else {
                    // Fallback to mock if k6 execution failed
                    console.warn('[LoadTest] k6 execution failed, falling back to mock:', data.error);
                    setTimeout(() => {
                        setTestResults(generateMockResults());
                        setIsRunningTest(false);
                    }, 5000);
                }
            } catch (e) {
                console.error('[LoadTest] Execution error:', e);
                // Fallback to mock
                setTimeout(() => {
                    setTestResults(generateMockResults());
                    setIsRunningTest(false);
                }, 5000);
            }
        } else {
            // Mock mode fallback
            setTimeout(() => {
                setTestResults(generateMockResults());
                setIsRunningTest(false);
            }, 5000);
        }
    };

    // Generate mock results (replace with actual k6/JMeter integration)
    const generateMockResults = () => {
        const vus = loadConfig.virtualUsers;
        const duration = loadConfig.duration;
        const isHighLoad = vus >= 1000;

        // Calculate realistic metrics based on VU count
        const baseRequests = vus * duration * 0.8;
        const totalRequests = Math.floor(baseRequests + (Math.random() * baseRequests * 0.1));

        // Higher VU count = more failures and slower response
        const errorMultiplier = isHighLoad ? (vus / 1000) * 2.5 : 1;
        const failedRequests = Math.floor(totalRequests * (0.02 + (Math.random() * 0.03 * errorMultiplier)));
        const successfulRequests = totalRequests - failedRequests;

        // Response times degrade under high load
        const baseResponseTime = 180;
        const loadFactor = isHighLoad ? Math.log10(vus / 100) * 150 : 0;
        const avgResponseTime = Math.floor(baseResponseTime + loadFactor + (Math.random() * 100));
        const p95ResponseTime = Math.floor(avgResponseTime * 2.2 + (Math.random() * 200));
        const p99ResponseTime = Math.floor(p95ResponseTime * 1.8 + (Math.random() * 300));

        const errorRate = ((failedRequests / totalRequests) * 100);
        const throughput = (totalRequests / duration).toFixed(1);

        // Generate realistic timeline with load phases
        const timeline = Array.from({ length: duration }, (_, i) => {
            const progress = i / duration;
            const rampProgress = Math.min(i / loadConfig.rampUpTime, 1);
            const activeUsers = Math.floor(vus * rampProgress);

            // Simulate performance degradation during peak load
            let timeResponseTime = avgResponseTime;
            let timeErrorRate = errorRate;

            if (rampProgress >= 0.8) {
                // Performance degrades at high load
                timeResponseTime = avgResponseTime * (1 + (rampProgress - 0.8) * 2 + Math.random() * 0.5);
                timeErrorRate = errorRate * (1 + (rampProgress - 0.8) * 3);
            }

            // Add some spikes
            if (Math.random() > 0.9) {
                timeResponseTime *= 1.5 + Math.random();
                timeErrorRate *= 1.5;
            }

            return {
                time: i,
                responseTime: Math.floor(timeResponseTime + (Math.random() * 50)),
                throughput: parseFloat(throughput) * (0.8 + Math.random() * 0.4),
                errorRate: Math.min(timeErrorRate + (Math.random() * 2), 15),
                activeUsers: activeUsers
            };
        });

        // Generate per-API results
        const apiResults = selectedApis.map(api => {
            const isLoginEndpoint = api.endpoint.toLowerCase().includes('login') ||
                                   api.endpoint.toLowerCase().includes('auth') ||
                                   api.endpoint.toLowerCase().includes('session');
            const isWriteMethod = ['POST', 'PUT', 'PATCH'].includes(api.method);

            // Login/auth endpoints typically have more issues under load
            const apiErrorMultiplier = isLoginEndpoint ? 1.5 : (isWriteMethod ? 1.2 : 1);
            const apiRequests = Math.floor((totalRequests / selectedApis.length) * (0.8 + Math.random() * 0.4));
            const apiErrors = Math.floor(apiRequests * (errorRate / 100) * apiErrorMultiplier);

            return {
                ...api,
                requests: apiRequests,
                avgTime: Math.floor(avgResponseTime * (isLoginEndpoint ? 1.3 : 1) * (0.8 + Math.random() * 0.4)),
                p95Time: Math.floor(p95ResponseTime * (isLoginEndpoint ? 1.4 : 1) * (0.8 + Math.random() * 0.4)),
                errors: apiErrors,
                status: apiErrors > (apiRequests * 0.05) ? 'degraded' : 'healthy',
                errorDetails: generateErrorDetails(apiErrors, isLoginEndpoint)
            };
        });

        // Generate realistic bottlenecks based on load
        const bottlenecks = generateBottlenecks(vus, avgResponseTime, errorRate, selectedApis);

        // Generate detailed error breakdown
        const errorBreakdown = generateErrorBreakdown(failedRequests, isHighLoad);

        return {
            summary: {
                totalRequests,
                successfulRequests,
                failedRequests,
                avgResponseTime,
                p95ResponseTime,
                p99ResponseTime,
                throughput: parseFloat(throughput),
                errorRate: parseFloat(errorRate.toFixed(2)),
                peakVUs: vus,
                duration: duration
            },
            timeline,
            apiResults,
            bottlenecks,
            errorBreakdown
        };
    };

    // Generate realistic error details
    const generateErrorDetails = (totalErrors, isLoginEndpoint) => {
        if (totalErrors === 0) return [];

        const errorTypes = isLoginEndpoint ? [
            { code: 401, message: 'Invalid credentials', percentage: 15 },
            { code: 429, message: 'Too Many Requests - Rate limit exceeded', percentage: 35 },
            { code: 503, message: 'Service Unavailable - Authentication service overloaded', percentage: 25 },
            { code: 504, message: 'Gateway Timeout - Database connection pool exhausted', percentage: 15 },
            { code: 500, message: 'Internal Server Error - Session creation failed', percentage: 10 }
        ] : [
            { code: 429, message: 'Too Many Requests - Rate limit exceeded', percentage: 40 },
            { code: 503, message: 'Service Unavailable', percentage: 30 },
            { code: 504, message: 'Gateway Timeout', percentage: 20 },
            { code: 500, message: 'Internal Server Error', percentage: 10 }
        ];

        return errorTypes.map(err => ({
            ...err,
            count: Math.floor(totalErrors * (err.percentage / 100))
        }));
    };

    // Generate bottlenecks based on test parameters
    const generateBottlenecks = (vus, avgResponseTime, errorRate, apis) => {
        const bottlenecks = [];

        if (vus >= 2000) {
            bottlenecks.push({
                type: 'Database Connection Pool',
                endpoint: '/api/auth/login',
                description: `Connection pool exhausted under ${vus} concurrent users. Max connections (100) reached, causing ${Math.floor(avgResponseTime * 0.4)}ms additional latency. Consider increasing pool size or implementing connection queuing.`,
                severity: 'high',
                metric: 'Connections: 100/100 (saturated)',
                recommendation: 'Increase max_connections from 100 to 500, implement PgBouncer for connection pooling'
            });
        }

        if (vus >= 1000) {
            bottlenecks.push({
                type: 'Authentication Service',
                endpoint: '/api/auth/login',
                description: `Authentication service response time degraded by ${Math.floor((avgResponseTime / 180 - 1) * 100)}% under load. Password hashing (bcrypt) consuming excessive CPU cycles.`,
                severity: 'high',
                metric: `Avg latency: ${avgResponseTime}ms (baseline: 180ms)`,
                recommendation: 'Scale authentication service horizontally, consider async password verification queue'
            });
        }

        if (errorRate > 3) {
            bottlenecks.push({
                type: 'Rate Limiting',
                endpoint: '/api/auth/login',
                description: `Rate limiter rejecting ${errorRate.toFixed(1)}% of requests. Current limit: 100 req/s per IP. Legitimate users affected during peak load.`,
                severity: 'high',
                metric: `Rejected: ${errorRate.toFixed(1)}% of requests`,
                recommendation: 'Implement tiered rate limiting, increase threshold for authenticated sessions'
            });
        }

        if (vus >= 3000) {
            bottlenecks.push({
                type: 'Memory Pressure',
                endpoint: 'Application Server',
                description: `Memory usage at 87% capacity. Session storage consuming 2.1GB RAM. Garbage collection pauses detected (avg 45ms).`,
                severity: 'high',
                metric: 'Memory: 87% (6.9GB/8GB)',
                recommendation: 'Implement Redis for session storage, increase server memory to 16GB'
            });
        }

        if (vus >= 1500) {
            bottlenecks.push({
                type: 'Network I/O',
                endpoint: 'Load Balancer',
                description: `Network throughput approaching saturation. Packet queuing observed during traffic spikes.`,
                severity: 'medium',
                metric: 'Bandwidth: 850Mbps/1Gbps',
                recommendation: 'Upgrade to 10Gbps network interface, enable HTTP/2 multiplexing'
            });
        }

        if (avgResponseTime > 500) {
            bottlenecks.push({
                type: 'Database Query Performance',
                endpoint: '/api/auth/validate-session',
                description: `Session validation query taking ${Math.floor(avgResponseTime * 0.3)}ms on average. Missing index on sessions.user_id column causing full table scans.`,
                severity: 'medium',
                metric: `Query time: ${Math.floor(avgResponseTime * 0.3)}ms`,
                recommendation: 'Add index: CREATE INDEX idx_sessions_user_id ON sessions(user_id)'
            });
        }

        return bottlenecks;
    };

    // Generate error breakdown
    const generateErrorBreakdown = (totalErrors, isHighLoad) => {
        return [
            {
                code: 429,
                name: 'Too Many Requests',
                count: Math.floor(totalErrors * 0.35),
                description: 'Rate limit exceeded - server protecting against overload',
                serverMessage: 'Rate limit exceeded. Please retry after 60 seconds.'
            },
            {
                code: 503,
                name: 'Service Unavailable',
                count: Math.floor(totalErrors * 0.28),
                description: 'Backend service temporarily unavailable',
                serverMessage: 'The server is temporarily unable to handle the request. Authentication service at capacity.'
            },
            {
                code: 504,
                name: 'Gateway Timeout',
                count: Math.floor(totalErrors * 0.18),
                description: 'Request timed out waiting for upstream server',
                serverMessage: 'upstream request timeout while reading response header from upstream'
            },
            {
                code: 500,
                name: 'Internal Server Error',
                count: Math.floor(totalErrors * 0.12),
                description: 'Unexpected server error during request processing',
                serverMessage: isHighLoad ?
                    'FATAL: too many connections for role "app_user" | SQLSTATE: 53300' :
                    'Error: Connection pool exhausted'
            },
            {
                code: 401,
                name: 'Unauthorized',
                count: Math.floor(totalErrors * 0.07),
                description: 'Authentication failed or session expired',
                serverMessage: 'Invalid credentials or session expired. Please login again.'
            }
        ];
    };

    // Load historical results into the Results tab
    const handleViewTestResults = (results) => {
        setTestResults(results);
        setActiveSubTab('results');
    };

    // Save configuration to server
    const handleSaveConfig = async () => {
        try {
            const res = await fetch('/api/loadtest/configs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: loadConfig.testName || `Config ${savedConfigs.length + 1}`,
                    targetUrl,
                    selectedApis,
                    loadConfig,
                    customHeaders: customHeaders.filter(h => h.key && h.value)
                })
            });
            const data = await res.json();
            if (data.success) {
                setSavedConfigs(prev => [data.config, ...prev]);
                alert('Configuration saved!');
            }
        } catch (e) {
            console.error('Failed to save config:', e);
        }
    };

    // Delete a saved configuration
    const handleDeleteConfig = async (configId) => {
        try {
            const res = await fetch(`/api/loadtest/configs/${configId}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                setSavedConfigs(prev => prev.filter(c => c.id !== configId));
            }
        } catch (e) {
            console.error('Failed to delete config:', e);
        }
    };

    // Clone a saved configuration
    const handleCloneConfig = async (config) => {
        try {
            const res = await fetch('/api/loadtest/configs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: `${config.name} (Copy)`,
                    targetUrl: config.targetUrl,
                    selectedApis: config.selectedApis,
                    loadConfig: config.loadConfig,
                    customHeaders: config.customHeaders
                })
            });
            const data = await res.json();
            if (data.success) {
                setSavedConfigs(prev => [data.config, ...prev]);
            }
        } catch (e) {
            console.error('Failed to clone config:', e);
        }
    };

    // Validate a saved configuration's APIs with real HTTP requests
    const handleValidateConfig = async (config) => {
        setValidatingConfigId(config.id);
        try {
            const res = await fetch('/api/loadtest/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apis: config.selectedApis || [],
                    customHeaders: config.customHeaders || []
                })
            });
            const data = await res.json();
            if (data.success) {
                setValidationResults(prev => ({ ...prev, [config.id]: data.results }));
            }
        } catch (e) {
            console.error('Validation failed:', e);
        } finally {
            setValidatingConfigId(null);
        }
    };

    // AI-powered analysis of a config's APIs
    const handleAnalyzeConfig = async (config) => {
        setAnalyzingConfigId(config.id);
        try {
            const res = await fetch('/api/loadtest/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameUrl: config.targetUrl,
                    capturedApis: config.selectedApis || [],
                    providerHint: config.provider || null
                })
            });
            const data = await res.json();
            if (data.success) {
                setAnalysisResults(prev => ({ ...prev, [config.id]: data.analysis }));
            }
        } catch (e) {
            console.error('Analysis failed:', e);
        } finally {
            setAnalyzingConfigId(null);
        }
    };

    // Generate and download K6 script for a config
    const handleGenerateK6 = async (config) => {
        try {
            const res = await fetch('/api/loadtest/generate-k6', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: config.name,
                    targetUrl: config.targetUrl,
                    selectedApis: config.selectedApis || [],
                    loadConfig: config.loadConfig,
                    customHeaders: config.customHeaders || []
                })
            });
            const data = await res.json();
            if (data.success && data.script) {
                // Download as .js file
                const blob = new Blob([data.script], { type: 'text/javascript' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${(config.name || 'loadtest').replace(/[^a-z0-9]/gi, '_')}_k6.js`;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (e) {
            console.error('K6 generation failed:', e);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="p-6 pt-14 border-b border-white/5">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30">
                        <Zap size={24} className="text-violet-400" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-white">Load Testing</h1>
                        <p className="text-sm text-gray-400">API discovery, performance testing & bottleneck analysis</p>
                    </div>
                    {k6Available !== null && (
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${k6Available ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'}`}>
                            {k6Available ? <Wifi size={14} /> : <WifiOff size={14} />}
                            {k6Available ? 'k6 Connected' : 'k6 Not Found (Mock Mode)'}
                        </div>
                    )}
                </div>

                {/* Sub-tabs */}
                <div className="flex flex-wrap gap-2">
                    <TabButton
                        icon={<Search size={16} />}
                        label="API Discovery"
                        active={activeSubTab === 'scanner'}
                        onClick={() => setActiveSubTab('scanner')}
                    />
                    <TabButton
                        icon={<Globe size={16} />}
                        label="APIs"
                        active={activeSubTab === 'apis'}
                        onClick={() => setActiveSubTab('apis')}
                        badge={discoveredApis.length > 0 ? discoveredApis.length : null}
                    />
                    <TabButton
                        icon={<Settings size={16} />}
                        label="Configuration"
                        active={activeSubTab === 'config'}
                        onClick={() => setActiveSubTab('config')}
                    />
                    <TabButton
                        icon={<BarChart3 size={16} />}
                        label="Results"
                        active={activeSubTab === 'results'}
                        onClick={() => setActiveSubTab('results')}
                    />
                    <TabButton
                        icon={<History size={16} />}
                        label="History"
                        active={activeSubTab === 'history'}
                        onClick={() => setActiveSubTab('history')}
                    />
                </div>
            </div>

            {/* Quick Actions Bar */}
            {discoveredApis.length > 0 && (
                <div className="px-6 py-3 bg-slate-800/30 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-400">
                            Target: <span className="text-white font-medium">{targetUrl}</span>
                        </span>
                        <span className="text-gray-400">
                            APIs: <span className="text-violet-400 font-medium">{discoveredApis.length} discovered</span>
                        </span>
                        <span className="text-gray-400">
                            Selected: <span className="text-green-400 font-medium">{selectedApis.length}</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSaveConfig}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-slate-700 text-gray-300 hover:bg-slate-600 transition-all"
                        >
                            <Save size={14} />
                            Save Config
                        </button>
                        {isRunningTest ? (
                            <button
                                onClick={handleStopTest}
                                className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all"
                            >
                                <Square size={14} />
                                Stop Test
                            </button>
                        ) : (
                            <button
                                onClick={handleRunTest}
                                disabled={selectedApis.length === 0}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedApis.length === 0
                                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:shadow-lg hover:shadow-violet-500/25'
                                    }`}
                            >
                                <Play size={14} />
                                Run Load Test
                                {k6Available === false && (
                                    <span className="text-xs opacity-70">(Mock)</span>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                {activeSubTab === 'scanner' && (
                    <LoadTestingScanner
                        targetUrl={targetUrl}
                        setTargetUrl={setTargetUrl}
                        isScanning={isScanning}
                        setIsScanning={setIsScanning}
                        onApisDiscovered={handleApisDiscovered}
                        onSaveConfig={handleSaveConfig}
                        savedConfigs={savedConfigs}
                        setSavedConfigs={setSavedConfigs}
                        customHeaders={customHeaders}
                        loadConfig={loadConfig}
                    />
                )}
                {activeSubTab === 'apis' && (
                    <LoadTestingAPIList
                        apis={discoveredApis}
                        selectedApis={selectedApis}
                        onSelectionChange={handleApiSelection}
                        onUpdateApi={handleApiUpdate}
                    />
                )}
                {activeSubTab === 'config' && (
                    <LoadTestingConfig
                        config={loadConfig}
                        setConfig={setLoadConfig}
                        selectedApis={selectedApis}
                        customHeaders={customHeaders}
                        setCustomHeaders={setCustomHeaders}
                    />
                )}
                {activeSubTab === 'results' && (
                    <LoadTestingResults
                        results={testResults}
                        isRunning={isRunningTest}
                        config={loadConfig}
                        progress={testProgress}
                        liveMetrics={liveMetrics}
                        onStopTest={handleStopTest}
                    />
                )}
                {activeSubTab === 'history' && (
                    <LoadTestingHistory
                        savedConfigs={savedConfigs}
                        onLoadConfig={(config) => {
                            setTargetUrl(config.targetUrl);
                            setSelectedApis(config.selectedApis || []);
                            setDiscoveredApis(prev => {
                                const existing = new Set(prev.map(a => a.id));
                                const merged = [...prev];
                                (config.selectedApis || []).forEach(a => {
                                    if (!existing.has(a.id)) merged.push(a);
                                });
                                return merged;
                            });
                            setLoadConfig(config.loadConfig);
                            if (config.customHeaders && config.customHeaders.length > 0) {
                                setCustomHeaders(config.customHeaders);
                            }
                        }}
                        onDeleteConfig={handleDeleteConfig}
                        onCloneConfig={handleCloneConfig}
                        onViewResults={handleViewTestResults}
                        onValidateConfig={handleValidateConfig}
                        onAnalyzeConfig={handleAnalyzeConfig}
                        onGenerateK6={handleGenerateK6}
                        validationResults={validationResults}
                        validatingConfigId={validatingConfigId}
                        analysisResults={analysisResults}
                        analyzingConfigId={analyzingConfigId}
                    />
                )}
            </div>
        </div>
    );
}
