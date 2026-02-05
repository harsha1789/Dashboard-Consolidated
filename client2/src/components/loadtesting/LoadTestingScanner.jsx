import React, { useState, useEffect, useRef } from 'react';
import { Globe, Search, RefreshCw, FileJson, Network, Code, CheckCircle, AlertCircle, Loader, Zap, Users, Wifi, WifiOff, Play, Settings, Radio, Square, Brain, Save, Download, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import { io } from 'socket.io-client';

export default function LoadTestingScanner({ targetUrl, setTargetUrl, isScanning, setIsScanning, onApisDiscovered, onSaveConfig, savedConfigs, setSavedConfigs, customHeaders, loadConfig }) {
    const [showDemoScenarios, setShowDemoScenarios] = useState(false);
    const [scanMethod, setScanMethod] = useState('auto');
    const [scanProgress, setScanProgress] = useState(0);
    const [scanPhase, setScanPhase] = useState('');
    const [openApiUrl, setOpenApiUrl] = useState('');
    const [scanLogs, setScanLogs] = useState([]);
    const [useRealDiscovery, setUseRealDiscovery] = useState(true);
    const [socketConnected, setSocketConnected] = useState(false);
    const [discoveryOptions, setDiscoveryOptions] = useState({
        timeout: 60000,
        scrollPage: true,
        clickButtons: true,
        maxAPIs: 200,
        waitTime: 3000
    });
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
    const socketRef = useRef(null);

    // Proxy recording state
    const [proxyRunning, setProxyRunning] = useState(false);
    const [proxyPort, setProxyPort] = useState(8888);
    const [proxyCapturedApis, setProxyCapturedApis] = useState([]);
    const [proxyStarting, setProxyStarting] = useState(false);

    // AI analysis state
    const [aiAnalysis, setAiAnalysis] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [showAnalysis, setShowAnalysis] = useState(false);

    // Socket.io connection for real-time updates
    useEffect(() => {
        if (useRealDiscovery) {
            socketRef.current = io(window.location.origin, {
                transports: ['websocket', 'polling']
            });

            socketRef.current.on('connect', () => {
                setSocketConnected(true);
                addLog('Connected to discovery server', 'success');
            });

            socketRef.current.on('disconnect', () => {
                setSocketConnected(false);
            });

            socketRef.current.on('discovery:progress', (data) => {
                setScanProgress(data.progress);
                setScanPhase(data.phase);
                if (data.message) {
                    addLog(data.message, data.type || 'info');
                }
            });

            socketRef.current.on('discovery:api-found', (data) => {
                addLog(`Found API: ${data.method} ${data.endpoint}`, 'success');
            });

            socketRef.current.on('discovery:complete', (data) => {
                addLog(`Discovery complete! Found ${data.apiCount} APIs`, 'success');
            });

            socketRef.current.on('discovery:error', (data) => {
                addLog(`Error: ${data.message}`, 'error');
            });

            return () => {
                if (socketRef.current) {
                    socketRef.current.disconnect();
                }
            };
        }
    }, [useRealDiscovery]);

    const scanMethods = [
        { id: 'auto', label: 'Auto Discovery', icon: Search, description: 'Crawl website and analyze network traffic' },
        { id: 'openapi', label: 'OpenAPI/Swagger', icon: FileJson, description: 'Import from OpenAPI specification' },
        { id: 'har', label: 'HAR File', icon: Network, description: 'Upload HTTP Archive file' },
        { id: 'proxy', label: 'Proxy Record', icon: Radio, description: 'Record live browser traffic via proxy' },
        { id: 'manual', label: 'Manual Entry', icon: Code, description: 'Manually add API endpoints' }
    ];

    const phases = ['Initializing', 'Crawling Pages', 'Analyzing Network', 'Detecting APIs', 'Classifying Endpoints', 'Finalizing'];

    // Listen for proxy events
    useEffect(() => {
        if (!socketRef.current) return;
        const socket = socketRef.current;

        socket.on('proxy:started', (data) => {
            setProxyRunning(true);
            setProxyStarting(false);
            addLog(`Proxy started on port ${data.port}`, 'success');
        });

        socket.on('proxy:api-captured', (data) => {
            setProxyCapturedApis(prev => [...prev, data]);
            addLog(`Captured: ${data.method} ${data.url} [${data.status}]`, 'success');
        });

        socket.on('proxy:stopped', (data) => {
            setProxyRunning(false);
            addLog(`Proxy stopped. Captured ${data.total} API calls.`, 'info');
        });

        return () => {
            socket.off('proxy:started');
            socket.off('proxy:api-captured');
            socket.off('proxy:stopped');
        };
    }, [socketRef.current]);

    // Check proxy status on mount
    useEffect(() => {
        fetch('/api/loadtest/proxy/status')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setProxyRunning(data.status.running);
                    if (data.status.running) setProxyPort(data.status.port);
                }
            })
            .catch(() => {});
    }, []);

    const addLog = (message, type = 'info') => {
        setScanLogs(prev => [...prev, { message, type, timestamp: new Date().toLocaleTimeString() }]);
    };

    // Proxy control functions
    const startProxy = async () => {
        setProxyStarting(true);
        setProxyCapturedApis([]);
        setScanLogs([]);
        addLog(`Starting proxy on port ${proxyPort}...`, 'info');
        try {
            const res = await fetch('/api/loadtest/proxy/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ port: proxyPort })
            });
            const data = await res.json();
            if (data.success) {
                setProxyRunning(true);
                addLog(`Proxy running on port ${data.port}`, 'success');
                addLog('Configure your browser to use HTTP proxy: 127.0.0.1:' + data.port, 'info');
            } else {
                addLog(`Failed: ${data.error}`, 'error');
            }
        } catch (e) {
            addLog(`Error starting proxy: ${e.message}`, 'error');
        } finally {
            setProxyStarting(false);
        }
    };

    const stopProxy = async () => {
        addLog('Stopping proxy...', 'info');
        try {
            const res = await fetch('/api/loadtest/proxy/stop', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                setProxyRunning(false);
                addLog(`Stopped. Captured ${data.total} API calls.`, 'success');
                if (data.apis && data.apis.length > 0) {
                    onApisDiscovered(data.apis);
                    addLog(`${data.apis.length} APIs added to API list.`, 'success');
                }
            }
        } catch (e) {
            addLog(`Error stopping proxy: ${e.message}`, 'error');
        }
    };

    // AI Analysis of captured/imported APIs
    const runAiAnalysis = async (apis) => {
        setAnalyzing(true);
        setAiAnalysis(null);
        addLog('Running AI analysis on captured traffic...', 'info');
        try {
            const res = await fetch('/api/loadtest/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameUrl: targetUrl,
                    capturedApis: apis,
                    providerHint: null
                })
            });
            const data = await res.json();
            if (data.success) {
                setAiAnalysis(data.analysis);
                setShowAnalysis(true);
                addLog(`AI Analysis complete: ${data.analysis?.provider_analysis?.provider_name || 'Unknown'} provider detected`, 'success');
            } else {
                addLog(`AI analysis failed: ${data.error}`, 'error');
            }
        } catch (e) {
            addLog(`AI analysis error: ${e.message}`, 'error');
        } finally {
            setAnalyzing(false);
        }
    };

    // Save AI analysis as a config
    const saveAnalysisAsConfig = async () => {
        if (!aiAnalysis) return;
        const provider = aiAnalysis.provider_analysis?.provider_name || 'Unknown';
        const configName = `${provider} - AI Analyzed Config`;
        const apis = (aiAnalysis.api_endpoints || aiAnalysis.classified_apis || []).map((api, i) => ({
            id: Date.now() + i,
            method: api.method || 'GET',
            endpoint: api.url || api.endpoint || '',
            fullUrl: api.url || api.fullUrl || '',
            category: api.category || 'other',
            description: api.description || `${api.method} ${api.url || api.endpoint}`,
            source: 'ai-analysis'
        }));

        try {
            const res = await fetch('/api/loadtest/configs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: configName,
                    provider,
                    targetUrl,
                    selectedApis: apis,
                    loadConfig: {
                        virtualUsers: aiAnalysis.performance_profile?.recommended_vus || 50,
                        duration: aiAnalysis.performance_profile?.recommended_duration_seconds || 300,
                        rampUpTime: aiAnalysis.performance_profile?.recommended_ramp_up_seconds || 30,
                        testName: configName
                    },
                    customHeaders: []
                })
            });
            const data = await res.json();
            if (data.success) {
                if (setSavedConfigs) setSavedConfigs(prev => [data.config, ...prev]);
                addLog(`Config saved as "${configName}"`, 'success');
            }
        } catch (e) {
            addLog(`Failed to save config: ${e.message}`, 'error');
        }
    };

    const startScan = async () => {
        if (!targetUrl) {
            alert('Please enter a target URL');
            return;
        }

        setIsScanning(true);
        setScanProgress(0);
        setScanLogs([]);

        addLog(`Starting ${scanMethod} scan for ${targetUrl}`, 'info');

        // Use real backend discovery if enabled
        if (useRealDiscovery && scanMethod === 'auto') {
            try {
                addLog('Connecting to discovery backend...', 'info');

                const response = await fetch('/api/loadtest/discover', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        targetUrl,
                        options: discoveryOptions
                    })
                });

                const result = await response.json();

                if (result.success) {
                    addLog(`Discovery complete! Found ${result.apis?.length || 0} APIs`, 'success');
                    setIsScanning(false);
                    onApisDiscovered(result.apis || []);
                } else {
                    throw new Error(result.error || 'Discovery failed');
                }
            } catch (error) {
                addLog(`Backend discovery failed: ${error.message}`, 'error');
                addLog('Falling back to mock discovery...', 'info');

                // Fallback to mock discovery
                await runMockDiscovery();
            }
        } else if (scanMethod === 'openapi' && openApiUrl) {
            // OpenAPI spec parsing
            try {
                addLog('Fetching OpenAPI specification...', 'info');

                const response = await fetch('/api/loadtest/parse/openapi', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ specUrl: openApiUrl })
                });

                const result = await response.json();

                if (result.success) {
                    addLog(`Parsed ${result.apis?.length || 0} APIs from OpenAPI spec`, 'success');
                    setIsScanning(false);
                    onApisDiscovered(result.apis || []);
                } else {
                    throw new Error(result.error || 'OpenAPI parsing failed');
                }
            } catch (error) {
                addLog(`OpenAPI parsing failed: ${error.message}`, 'error');
                setIsScanning(false);
            }
        } else {
            // Use mock discovery
            await runMockDiscovery();
        }
    };

    const runMockDiscovery = async () => {
        // Simulate scanning phases
        for (let i = 0; i < phases.length; i++) {
            setScanPhase(phases[i]);
            addLog(`${phases[i]}...`, 'info');

            await new Promise(resolve => setTimeout(resolve, 1500));
            setScanProgress(((i + 1) / phases.length) * 100);

            // Add phase-specific logs
            if (phases[i] === 'Crawling Pages') {
                addLog('Found 12 pages with potential API calls', 'success');
            } else if (phases[i] === 'Analyzing Network') {
                addLog('Captured 47 unique network requests', 'success');
            } else if (phases[i] === 'Detecting APIs') {
                addLog('Identified API endpoints', 'success');
            }
        }

        addLog('Scan completed successfully!', 'success');

        // Generate mock discovered APIs
        const mockApis = generateMockApis();
        setIsScanning(false);
        onApisDiscovered(mockApis);
    };

    // Detect website type from URL and return appropriate APIs
    const generateMockApis = () => {
        const url = targetUrl.toLowerCase();

        // Betting/Gaming websites
        if (url.includes('bet') || url.includes('gaming') || url.includes('casino') || url.includes('sport') || url.includes('odds')) {
            return generateBettingApis();
        }
        // E-commerce websites
        else if (url.includes('shop') || url.includes('store') || url.includes('cart') || url.includes('amazon') || url.includes('ebay')) {
            return generateEcommerceApis();
        }
        // Banking/Fintech websites
        else if (url.includes('bank') || url.includes('pay') || url.includes('finance') || url.includes('money') || url.includes('wallet')) {
            return generateBankingApis();
        }
        // Social media
        else if (url.includes('social') || url.includes('facebook') || url.includes('twitter') || url.includes('instagram')) {
            return generateSocialApis();
        }
        // Default - generic APIs
        else {
            return generateGenericApis();
        }
    };

    // Betting Platform APIs (55+ endpoints)
    const generateBettingApis = () => [
        // Authentication APIs
        { id: 101, method: 'POST', endpoint: '/api/v1/auth/login', category: 'Authentication', auth: 'None', params: [{ name: 'msisdn', type: 'string' }, { name: 'password', type: 'string' }], description: 'User login with phone/email' },
        { id: 102, method: 'POST', endpoint: '/api/v1/auth/register', category: 'Authentication', auth: 'None', params: [{ name: 'msisdn', type: 'string' }, { name: 'password', type: 'string' }, { name: 'email', type: 'string' }], description: 'New user registration' },
        { id: 103, method: 'POST', endpoint: '/api/v1/auth/session/validate', category: 'Authentication', auth: 'Bearer Token', params: [], description: 'Validate active session' },
        { id: 104, method: 'GET', endpoint: '/api/v1/auth/user/profile', category: 'Authentication', auth: 'Bearer Token', params: [], description: 'Get user profile data' },
        { id: 105, method: 'POST', endpoint: '/api/v1/auth/otp/send', category: 'Authentication', auth: 'None', params: [{ name: 'msisdn', type: 'string' }], description: 'Send OTP to user' },
        { id: 106, method: 'POST', endpoint: '/api/v1/auth/otp/verify', category: 'Authentication', auth: 'None', params: [{ name: 'otp', type: 'string' }], description: 'Verify OTP code' },
        { id: 107, method: 'POST', endpoint: '/api/v1/auth/logout', category: 'Authentication', auth: 'Bearer Token', params: [], description: 'User logout' },
        { id: 108, method: 'POST', endpoint: '/api/v1/auth/refresh-token', category: 'Authentication', auth: 'Refresh Token', params: [], description: 'Refresh access token' },
        { id: 109, method: 'POST', endpoint: '/api/v1/auth/password/reset', category: 'Authentication', auth: 'None', params: [{ name: 'msisdn', type: 'string' }], description: 'Request password reset' },
        { id: 110, method: 'PUT', endpoint: '/api/v1/auth/password/change', category: 'Authentication', auth: 'Bearer Token', params: [{ name: 'oldPassword', type: 'string' }, { name: 'newPassword', type: 'string' }], description: 'Change password' },

        // Pre-Match Betting APIs
        { id: 201, method: 'GET', endpoint: '/api/v1/sports/prematch/events', category: 'Pre-Match', auth: 'None', params: [{ name: 'sportId', type: 'number' }, { name: 'leagueId', type: 'number' }], description: 'Get pre-match events list' },
        { id: 202, method: 'GET', endpoint: '/api/v1/sports/prematch/event/:eventId', category: 'Pre-Match', auth: 'None', params: [{ name: 'eventId', type: 'string' }], description: 'Get single event details' },
        { id: 203, method: 'GET', endpoint: '/api/v1/sports/prematch/markets/:eventId', category: 'Pre-Match', auth: 'None', params: [{ name: 'eventId', type: 'string' }], description: 'Get markets for event' },
        { id: 204, method: 'GET', endpoint: '/api/v1/sports/prematch/odds/:eventId', category: 'Pre-Match', auth: 'None', params: [{ name: 'eventId', type: 'string' }], description: 'Get odds for event' },
        { id: 205, method: 'GET', endpoint: '/api/v1/sports/prematch/leagues', category: 'Pre-Match', auth: 'None', params: [{ name: 'sportId', type: 'number' }], description: 'Get leagues by sport' },
        { id: 206, method: 'GET', endpoint: '/api/v1/sports/prematch/featured', category: 'Pre-Match', auth: 'None', params: [], description: 'Get featured pre-match events' },
        { id: 207, method: 'GET', endpoint: '/api/v1/sports/prematch/upcoming', category: 'Pre-Match', auth: 'None', params: [{ name: 'hours', type: 'number' }], description: 'Get upcoming events' },
        { id: 208, method: 'GET', endpoint: '/api/v1/sports/prematch/popular', category: 'Pre-Match', auth: 'None', params: [], description: 'Get popular events' },

        // Live & Play APIs
        { id: 301, method: 'GET', endpoint: '/api/v1/sports/live/events', category: 'Live & Play', auth: 'None', params: [{ name: 'sportId', type: 'number' }], description: 'Get all live events' },
        { id: 302, method: 'GET', endpoint: '/api/v1/sports/live/event/:eventId', category: 'Live & Play', auth: 'None', params: [{ name: 'eventId', type: 'string' }], description: 'Get live event details' },
        { id: 303, method: 'GET', endpoint: '/api/v1/sports/live/odds/:eventId', category: 'Live & Play', auth: 'None', params: [{ name: 'eventId', type: 'string' }], description: 'Get live odds (real-time)' },
        { id: 304, method: 'GET', endpoint: '/api/v1/sports/live/stats/:eventId', category: 'Live & Play', auth: 'None', params: [{ name: 'eventId', type: 'string' }], description: 'Get live match statistics' },
        { id: 305, method: 'GET', endpoint: '/api/v1/sports/live/stream/:eventId', category: 'Live & Play', auth: 'Bearer Token', params: [{ name: 'eventId', type: 'string' }], description: 'Get live stream URL' },
        { id: 306, method: 'GET', endpoint: '/api/v1/sports/live/scoreboard/:eventId', category: 'Live & Play', auth: 'None', params: [{ name: 'eventId', type: 'string' }], description: 'Get live scoreboard' },
        { id: 307, method: 'GET', endpoint: '/api/v1/sports/live/timeline/:eventId', category: 'Live & Play', auth: 'None', params: [{ name: 'eventId', type: 'string' }], description: 'Get match timeline/events' },
        { id: 308, method: 'WS', endpoint: '/ws/v1/sports/live/subscribe', category: 'Live & Play', auth: 'Bearer Token', params: [{ name: 'eventIds', type: 'array' }], description: 'WebSocket for live updates' },

        // Build A Bet APIs
        { id: 401, method: 'GET', endpoint: '/api/v1/betbuilder/events', category: 'Build A Bet', auth: 'None', params: [{ name: 'sportId', type: 'number' }], description: 'Get bet builder eligible events' },
        { id: 402, method: 'GET', endpoint: '/api/v1/betbuilder/selections/:eventId', category: 'Build A Bet', auth: 'None', params: [{ name: 'eventId', type: 'string' }], description: 'Get available selections' },
        { id: 403, method: 'POST', endpoint: '/api/v1/betbuilder/calculate', category: 'Build A Bet', auth: 'None', params: [{ name: 'selections', type: 'array' }], description: 'Calculate combined odds' },
        { id: 404, method: 'POST', endpoint: '/api/v1/betbuilder/validate', category: 'Build A Bet', auth: 'Bearer Token', params: [{ name: 'selections', type: 'array' }], description: 'Validate bet combination' },
        { id: 405, method: 'GET', endpoint: '/api/v1/betbuilder/popular', category: 'Build A Bet', auth: 'None', params: [], description: 'Get popular combinations' },
        { id: 406, method: 'GET', endpoint: '/api/v1/betbuilder/markets/:eventId', category: 'Build A Bet', auth: 'None', params: [{ name: 'eventId', type: 'string' }], description: 'Get bet builder markets' },

        // Outright APIs
        { id: 501, method: 'GET', endpoint: '/api/v1/sports/outrights', category: 'Outright', auth: 'None', params: [{ name: 'sportId', type: 'number' }], description: 'Get outright markets' },
        { id: 502, method: 'GET', endpoint: '/api/v1/sports/outrights/:leagueId', category: 'Outright', auth: 'None', params: [{ name: 'leagueId', type: 'string' }], description: 'Get league outrights' },
        { id: 503, method: 'GET', endpoint: '/api/v1/sports/outrights/odds/:marketId', category: 'Outright', auth: 'None', params: [{ name: 'marketId', type: 'string' }], description: 'Get outright odds' },
        { id: 504, method: 'GET', endpoint: '/api/v1/sports/outrights/featured', category: 'Outright', auth: 'None', params: [], description: 'Get featured outrights' },

        // Test My Bet / Cashout APIs
        { id: 601, method: 'POST', endpoint: '/api/v1/bets/test', category: 'Test My Bet', auth: 'Bearer Token', params: [{ name: 'betslip', type: 'object' }], description: 'Test bet before placing' },
        { id: 602, method: 'GET', endpoint: '/api/v1/bets/cashout/available/:betId', category: 'Test My Bet', auth: 'Bearer Token', params: [{ name: 'betId', type: 'string' }], description: 'Check cashout availability' },
        { id: 603, method: 'POST', endpoint: '/api/v1/bets/cashout/calculate', category: 'Test My Bet', auth: 'Bearer Token', params: [{ name: 'betId', type: 'string' }], description: 'Calculate cashout amount' },
        { id: 604, method: 'POST', endpoint: '/api/v1/bets/cashout/execute', category: 'Test My Bet', auth: 'Bearer Token', params: [{ name: 'betId', type: 'string' }], description: 'Execute cashout' },
        { id: 605, method: 'GET', endpoint: '/api/v1/bets/potential-return', category: 'Test My Bet', auth: 'None', params: [{ name: 'odds', type: 'number' }, { name: 'stake', type: 'number' }], description: 'Calculate potential return' },
        { id: 606, method: 'POST', endpoint: '/api/v1/bets/cashout/partial', category: 'Test My Bet', auth: 'Bearer Token', params: [{ name: 'betId', type: 'string' }, { name: 'percentage', type: 'number' }], description: 'Partial cashout' },

        // Betslip & Bet Placement APIs
        { id: 701, method: 'POST', endpoint: '/api/v1/betslip/add', category: 'Betslip', auth: 'Bearer Token', params: [{ name: 'selection', type: 'object' }], description: 'Add selection to betslip' },
        { id: 702, method: 'DELETE', endpoint: '/api/v1/betslip/remove/:selectionId', category: 'Betslip', auth: 'Bearer Token', params: [{ name: 'selectionId', type: 'string' }], description: 'Remove from betslip' },
        { id: 703, method: 'GET', endpoint: '/api/v1/betslip', category: 'Betslip', auth: 'Bearer Token', params: [], description: 'Get current betslip' },
        { id: 704, method: 'POST', endpoint: '/api/v1/bets/place', category: 'Betslip', auth: 'Bearer Token', params: [{ name: 'betslip', type: 'object' }, { name: 'stake', type: 'number' }], description: 'Place single bet' },
        { id: 705, method: 'POST', endpoint: '/api/v1/bets/place/multiple', category: 'Betslip', auth: 'Bearer Token', params: [{ name: 'bets', type: 'array' }], description: 'Place multiple bets' },
        { id: 706, method: 'POST', endpoint: '/api/v1/bets/place/accumulator', category: 'Betslip', auth: 'Bearer Token', params: [{ name: 'selections', type: 'array' }, { name: 'stake', type: 'number' }], description: 'Place accumulator bet' },
        { id: 707, method: 'DELETE', endpoint: '/api/v1/betslip/clear', category: 'Betslip', auth: 'Bearer Token', params: [], description: 'Clear betslip' },

        // Transaction History APIs
        { id: 801, method: 'GET', endpoint: '/api/v1/account/transactions', category: 'Transaction History', auth: 'Bearer Token', params: [{ name: 'page', type: 'number' }, { name: 'limit', type: 'number' }, { name: 'type', type: 'string' }], description: 'Get transaction history' },
        { id: 802, method: 'GET', endpoint: '/api/v1/account/transactions/:transactionId', category: 'Transaction History', auth: 'Bearer Token', params: [{ name: 'transactionId', type: 'string' }], description: 'Get transaction details' },
        { id: 803, method: 'GET', endpoint: '/api/v1/account/bets/history', category: 'Transaction History', auth: 'Bearer Token', params: [{ name: 'status', type: 'string' }, { name: 'fromDate', type: 'date' }, { name: 'toDate', type: 'date' }], description: 'Get betting history' },
        { id: 804, method: 'GET', endpoint: '/api/v1/account/bets/pending', category: 'Transaction History', auth: 'Bearer Token', params: [], description: 'Get pending/open bets' },
        { id: 805, method: 'GET', endpoint: '/api/v1/account/bets/settled', category: 'Transaction History', auth: 'Bearer Token', params: [{ name: 'page', type: 'number' }], description: 'Get settled bets' },
        { id: 806, method: 'GET', endpoint: '/api/v1/account/bets/:betId', category: 'Transaction History', auth: 'Bearer Token', params: [{ name: 'betId', type: 'string' }], description: 'Get bet details' },
        { id: 807, method: 'GET', endpoint: '/api/v1/account/deposits', category: 'Transaction History', auth: 'Bearer Token', params: [{ name: 'page', type: 'number' }], description: 'Get deposit history' },
        { id: 808, method: 'GET', endpoint: '/api/v1/account/withdrawals', category: 'Transaction History', auth: 'Bearer Token', params: [{ name: 'page', type: 'number' }], description: 'Get withdrawal history' },
        { id: 809, method: 'GET', endpoint: '/api/v1/account/statements', category: 'Transaction History', auth: 'Bearer Token', params: [{ name: 'month', type: 'number' }, { name: 'year', type: 'number' }], description: 'Get account statements' },

        // Wallet & Balance APIs
        { id: 901, method: 'GET', endpoint: '/api/v1/account/balance', category: 'Wallet', auth: 'Bearer Token', params: [], description: 'Get account balance' },
        { id: 902, method: 'GET', endpoint: '/api/v1/account/bonus-balance', category: 'Wallet', auth: 'Bearer Token', params: [], description: 'Get bonus balance' },
        { id: 903, method: 'POST', endpoint: '/api/v1/account/deposit', category: 'Wallet', auth: 'Bearer Token', params: [{ name: 'amount', type: 'number' }, { name: 'method', type: 'string' }], description: 'Initiate deposit' },
        { id: 904, method: 'POST', endpoint: '/api/v1/account/withdraw', category: 'Wallet', auth: 'Bearer Token', params: [{ name: 'amount', type: 'number' }, { name: 'method', type: 'string' }], description: 'Initiate withdrawal' },
        { id: 905, method: 'GET', endpoint: '/api/v1/account/payment-methods', category: 'Wallet', auth: 'Bearer Token', params: [], description: 'Get payment methods' },
        { id: 906, method: 'POST', endpoint: '/api/v1/account/payment-methods', category: 'Wallet', auth: 'Bearer Token', params: [{ name: 'method', type: 'object' }], description: 'Add payment method' },

        // Promotions & Bonuses
        { id: 1001, method: 'GET', endpoint: '/api/v1/promotions', category: 'Promotions', auth: 'None', params: [], description: 'Get active promotions' },
        { id: 1002, method: 'GET', endpoint: '/api/v1/promotions/:promoId', category: 'Promotions', auth: 'None', params: [{ name: 'promoId', type: 'string' }], description: 'Get promotion details' },
        { id: 1003, method: 'POST', endpoint: '/api/v1/promotions/claim/:promoId', category: 'Promotions', auth: 'Bearer Token', params: [{ name: 'promoId', type: 'string' }], description: 'Claim promotion' },
        { id: 1004, method: 'GET', endpoint: '/api/v1/account/bonuses', category: 'Promotions', auth: 'Bearer Token', params: [], description: 'Get user bonuses' },
        { id: 1005, method: 'POST', endpoint: '/api/v1/promotions/code/redeem', category: 'Promotions', auth: 'Bearer Token', params: [{ name: 'code', type: 'string' }], description: 'Redeem promo code' },

        // System & Config APIs
        { id: 1101, method: 'GET', endpoint: '/api/v1/config/sports', category: 'System', auth: 'None', params: [], description: 'Get available sports' },
        { id: 1102, method: 'GET', endpoint: '/api/v1/config/countries', category: 'System', auth: 'None', params: [], description: 'Get countries list' },
        { id: 1103, method: 'GET', endpoint: '/api/v1/config/currencies', category: 'System', auth: 'None', params: [], description: 'Get supported currencies' },
        { id: 1104, method: 'GET', endpoint: '/api/v1/health', category: 'System', auth: 'None', params: [], description: 'Health check endpoint' },
        { id: 1105, method: 'GET', endpoint: '/api/v1/config/limits', category: 'System', auth: 'Bearer Token', params: [], description: 'Get betting limits' },
        { id: 1106, method: 'GET', endpoint: '/api/v1/config/odds-formats', category: 'System', auth: 'None', params: [], description: 'Get odds format options' },
        { id: 1107, method: 'GET', endpoint: '/api/v1/config/languages', category: 'System', auth: 'None', params: [], description: 'Get supported languages' }
    ];

    // E-commerce Platform APIs
    const generateEcommerceApis = () => [
        // Authentication
        { id: 1, method: 'POST', endpoint: '/api/v1/auth/login', category: 'Authentication', auth: 'None', params: [{ name: 'email', type: 'string' }, { name: 'password', type: 'string' }], description: 'User login' },
        { id: 2, method: 'POST', endpoint: '/api/v1/auth/register', category: 'Authentication', auth: 'None', params: [{ name: 'email', type: 'string' }, { name: 'password', type: 'string' }, { name: 'name', type: 'string' }], description: 'User registration' },
        { id: 3, method: 'POST', endpoint: '/api/v1/auth/logout', category: 'Authentication', auth: 'Bearer Token', params: [], description: 'User logout' },
        { id: 4, method: 'GET', endpoint: '/api/v1/auth/profile', category: 'Authentication', auth: 'Bearer Token', params: [], description: 'Get user profile' },
        // Products
        { id: 10, method: 'GET', endpoint: '/api/v1/products', category: 'Products', auth: 'None', params: [{ name: 'page', type: 'number' }, { name: 'limit', type: 'number' }, { name: 'category', type: 'string' }], description: 'Get products list' },
        { id: 11, method: 'GET', endpoint: '/api/v1/products/:id', category: 'Products', auth: 'None', params: [{ name: 'id', type: 'string' }], description: 'Get product details' },
        { id: 12, method: 'GET', endpoint: '/api/v1/products/search', category: 'Products', auth: 'None', params: [{ name: 'q', type: 'string' }], description: 'Search products' },
        { id: 13, method: 'GET', endpoint: '/api/v1/products/featured', category: 'Products', auth: 'None', params: [], description: 'Get featured products' },
        { id: 14, method: 'GET', endpoint: '/api/v1/categories', category: 'Products', auth: 'None', params: [], description: 'Get categories' },
        { id: 15, method: 'GET', endpoint: '/api/v1/products/:id/reviews', category: 'Products', auth: 'None', params: [{ name: 'id', type: 'string' }], description: 'Get product reviews' },
        // Cart
        { id: 20, method: 'GET', endpoint: '/api/v1/cart', category: 'Cart', auth: 'Bearer Token', params: [], description: 'Get cart' },
        { id: 21, method: 'POST', endpoint: '/api/v1/cart/add', category: 'Cart', auth: 'Bearer Token', params: [{ name: 'productId', type: 'string' }, { name: 'quantity', type: 'number' }], description: 'Add to cart' },
        { id: 22, method: 'PUT', endpoint: '/api/v1/cart/update', category: 'Cart', auth: 'Bearer Token', params: [{ name: 'itemId', type: 'string' }, { name: 'quantity', type: 'number' }], description: 'Update cart item' },
        { id: 23, method: 'DELETE', endpoint: '/api/v1/cart/remove/:itemId', category: 'Cart', auth: 'Bearer Token', params: [{ name: 'itemId', type: 'string' }], description: 'Remove from cart' },
        // Orders
        { id: 30, method: 'POST', endpoint: '/api/v1/orders', category: 'Orders', auth: 'Bearer Token', params: [{ name: 'items', type: 'array' }, { name: 'address', type: 'object' }], description: 'Create order' },
        { id: 31, method: 'GET', endpoint: '/api/v1/orders', category: 'Orders', auth: 'Bearer Token', params: [], description: 'Get orders' },
        { id: 32, method: 'GET', endpoint: '/api/v1/orders/:id', category: 'Orders', auth: 'Bearer Token', params: [{ name: 'id', type: 'string' }], description: 'Get order details' },
        { id: 33, method: 'POST', endpoint: '/api/v1/orders/:id/cancel', category: 'Orders', auth: 'Bearer Token', params: [{ name: 'id', type: 'string' }], description: 'Cancel order' },
        { id: 34, method: 'GET', endpoint: '/api/v1/orders/:id/track', category: 'Orders', auth: 'Bearer Token', params: [{ name: 'id', type: 'string' }], description: 'Track order' },
        // Payments
        { id: 40, method: 'POST', endpoint: '/api/v1/checkout', category: 'Payments', auth: 'Bearer Token', params: [{ name: 'paymentMethod', type: 'string' }], description: 'Checkout' },
        { id: 41, method: 'GET', endpoint: '/api/v1/payment-methods', category: 'Payments', auth: 'Bearer Token', params: [], description: 'Get payment methods' },
        { id: 42, method: 'POST', endpoint: '/api/v1/payments/process', category: 'Payments', auth: 'Bearer Token', params: [{ name: 'orderId', type: 'string' }, { name: 'paymentDetails', type: 'object' }], description: 'Process payment' }
    ];

    // Banking Platform APIs
    const generateBankingApis = () => [
        // Authentication
        { id: 1, method: 'POST', endpoint: '/api/v1/auth/login', category: 'Authentication', auth: 'None', params: [{ name: 'username', type: 'string' }, { name: 'password', type: 'string' }], description: 'User login' },
        { id: 2, method: 'POST', endpoint: '/api/v1/auth/mfa/verify', category: 'Authentication', auth: 'None', params: [{ name: 'code', type: 'string' }], description: 'Verify MFA' },
        { id: 3, method: 'POST', endpoint: '/api/v1/auth/logout', category: 'Authentication', auth: 'Bearer Token', params: [], description: 'Logout' },
        // Accounts
        { id: 10, method: 'GET', endpoint: '/api/v1/accounts', category: 'Accounts', auth: 'Bearer Token', params: [], description: 'Get accounts' },
        { id: 11, method: 'GET', endpoint: '/api/v1/accounts/:id/balance', category: 'Accounts', auth: 'Bearer Token', params: [{ name: 'id', type: 'string' }], description: 'Get balance' },
        { id: 12, method: 'GET', endpoint: '/api/v1/accounts/:id/transactions', category: 'Accounts', auth: 'Bearer Token', params: [{ name: 'id', type: 'string' }, { name: 'fromDate', type: 'date' }, { name: 'toDate', type: 'date' }], description: 'Get transactions' },
        // Transfers
        { id: 20, method: 'POST', endpoint: '/api/v1/transfers/internal', category: 'Transfers', auth: 'Bearer Token', params: [{ name: 'fromAccount', type: 'string' }, { name: 'toAccount', type: 'string' }, { name: 'amount', type: 'number' }], description: 'Internal transfer' },
        { id: 21, method: 'POST', endpoint: '/api/v1/transfers/external', category: 'Transfers', auth: 'Bearer Token', params: [{ name: 'fromAccount', type: 'string' }, { name: 'beneficiary', type: 'object' }, { name: 'amount', type: 'number' }], description: 'External transfer' },
        { id: 22, method: 'GET', endpoint: '/api/v1/transfers/history', category: 'Transfers', auth: 'Bearer Token', params: [], description: 'Transfer history' },
        // Bills
        { id: 30, method: 'GET', endpoint: '/api/v1/bills', category: 'Bills', auth: 'Bearer Token', params: [], description: 'Get bills' },
        { id: 31, method: 'POST', endpoint: '/api/v1/bills/pay', category: 'Bills', auth: 'Bearer Token', params: [{ name: 'billId', type: 'string' }, { name: 'amount', type: 'number' }], description: 'Pay bill' }
    ];

    // Social Media APIs
    const generateSocialApis = () => [
        { id: 1, method: 'POST', endpoint: '/api/v1/auth/login', category: 'Authentication', auth: 'None', params: [{ name: 'email', type: 'string' }, { name: 'password', type: 'string' }], description: 'Login' },
        { id: 2, method: 'GET', endpoint: '/api/v1/feed', category: 'Feed', auth: 'Bearer Token', params: [{ name: 'page', type: 'number' }], description: 'Get feed' },
        { id: 3, method: 'GET', endpoint: '/api/v1/posts/:id', category: 'Posts', auth: 'Bearer Token', params: [{ name: 'id', type: 'string' }], description: 'Get post' },
        { id: 4, method: 'POST', endpoint: '/api/v1/posts', category: 'Posts', auth: 'Bearer Token', params: [{ name: 'content', type: 'string' }], description: 'Create post' },
        { id: 5, method: 'POST', endpoint: '/api/v1/posts/:id/like', category: 'Posts', auth: 'Bearer Token', params: [{ name: 'id', type: 'string' }], description: 'Like post' },
        { id: 6, method: 'POST', endpoint: '/api/v1/posts/:id/comment', category: 'Posts', auth: 'Bearer Token', params: [{ name: 'id', type: 'string' }, { name: 'text', type: 'string' }], description: 'Comment on post' },
        { id: 7, method: 'GET', endpoint: '/api/v1/users/:id', category: 'Users', auth: 'Bearer Token', params: [{ name: 'id', type: 'string' }], description: 'Get user profile' },
        { id: 8, method: 'POST', endpoint: '/api/v1/users/:id/follow', category: 'Users', auth: 'Bearer Token', params: [{ name: 'id', type: 'string' }], description: 'Follow user' },
        { id: 9, method: 'GET', endpoint: '/api/v1/notifications', category: 'Notifications', auth: 'Bearer Token', params: [], description: 'Get notifications' },
        { id: 10, method: 'GET', endpoint: '/api/v1/messages', category: 'Messages', auth: 'Bearer Token', params: [], description: 'Get messages' }
    ];

    // Generic APIs (fallback)
    const generateGenericApis = () => [
        { id: 1, method: 'POST', endpoint: '/api/v1/auth/login', category: 'Authentication', auth: 'None', params: [{ name: 'email', type: 'string' }, { name: 'password', type: 'string' }], description: 'User login' },
        { id: 2, method: 'POST', endpoint: '/api/v1/auth/register', category: 'Authentication', auth: 'None', params: [{ name: 'email', type: 'string' }, { name: 'password', type: 'string' }], description: 'User registration' },
        { id: 3, method: 'POST', endpoint: '/api/v1/auth/logout', category: 'Authentication', auth: 'Bearer Token', params: [], description: 'Logout' },
        { id: 4, method: 'GET', endpoint: '/api/v1/auth/profile', category: 'Authentication', auth: 'Bearer Token', params: [], description: 'Get profile' },
        { id: 5, method: 'GET', endpoint: '/api/v1/users', category: 'Users', auth: 'Bearer Token', params: [{ name: 'page', type: 'number' }], description: 'Get users' },
        { id: 6, method: 'GET', endpoint: '/api/v1/users/:id', category: 'Users', auth: 'Bearer Token', params: [{ name: 'id', type: 'string' }], description: 'Get user' },
        { id: 7, method: 'PUT', endpoint: '/api/v1/users/:id', category: 'Users', auth: 'Bearer Token', params: [{ name: 'id', type: 'string' }], description: 'Update user' },
        { id: 8, method: 'DELETE', endpoint: '/api/v1/users/:id', category: 'Users', auth: 'Bearer Token', params: [{ name: 'id', type: 'string' }], description: 'Delete user' },
        { id: 9, method: 'GET', endpoint: '/api/v1/data', category: 'Data', auth: 'API Key', params: [], description: 'Get data' },
        { id: 10, method: 'POST', endpoint: '/api/v1/data', category: 'Data', auth: 'API Key', params: [{ name: 'payload', type: 'object' }], description: 'Create data' },
        { id: 11, method: 'GET', endpoint: '/api/v1/reports', category: 'Reports', auth: 'Bearer Token', params: [{ name: 'type', type: 'string' }], description: 'Get reports' },
        { id: 12, method: 'GET', endpoint: '/api/v1/health', category: 'System', auth: 'None', params: [], description: 'Health check' },
        { id: 13, method: 'GET', endpoint: '/api/v1/config', category: 'System', auth: 'None', params: [], description: 'Get config' }
    ];

    // Demo scenarios for quick testing - Comprehensive Betting Platform APIs
    const demoScenarios = [
        {
            id: 'betting-full',
            name: 'Betting Platform Full Test (4000 VUs)',
            description: 'Complete betting platform load test with all major endpoints',
            targetUrl: 'https://mobi.betway.co.tz',
            virtualUsers: 4000,
            duration: 120,
            rampUpTime: 60,
            apis: [
                // Authentication APIs
                { id: 101, method: 'POST', endpoint: '/api/v1/auth/login', category: 'Authentication', auth: 'None', params: [{ name: 'msisdn', type: 'string', value: '255999676222' }, { name: 'password', type: 'string', value: '******' }], description: 'User login with phone number', body: '{"msisdn": "255999676222", "password": "123456"}' },
                { id: 102, method: 'POST', endpoint: '/api/v1/auth/session/validate', category: 'Authentication', auth: 'Bearer Token', params: [], description: 'Validate active session' },
                { id: 103, method: 'GET', endpoint: '/api/v1/auth/user/profile', category: 'Authentication', auth: 'Bearer Token', params: [], description: 'Get user profile data' },
                { id: 104, method: 'POST', endpoint: '/api/v1/auth/otp/send', category: 'Authentication', auth: 'None', params: [{ name: 'msisdn', type: 'string' }], description: 'Send OTP to user' },
                { id: 105, method: 'POST', endpoint: '/api/v1/auth/otp/verify', category: 'Authentication', auth: 'None', params: [{ name: 'otp', type: 'string' }], description: 'Verify OTP code' },
                { id: 106, method: 'POST', endpoint: '/api/v1/auth/logout', category: 'Authentication', auth: 'Bearer Token', params: [], description: 'User logout' },
                { id: 107, method: 'POST', endpoint: '/api/v1/auth/refresh-token', category: 'Authentication', auth: 'Refresh Token', params: [], description: 'Refresh access token' },

                // Pre-Match Betting APIs
                { id: 201, method: 'GET', endpoint: '/api/v1/sports/prematch/events', category: 'Pre-Match', auth: 'None', params: [{ name: 'sportId', type: 'number' }, { name: 'leagueId', type: 'number' }], description: 'Get pre-match events list' },
                { id: 202, method: 'GET', endpoint: '/api/v1/sports/prematch/event/:eventId', category: 'Pre-Match', auth: 'None', params: [{ name: 'eventId', type: 'string' }], description: 'Get single event details' },
                { id: 203, method: 'GET', endpoint: '/api/v1/sports/prematch/markets/:eventId', category: 'Pre-Match', auth: 'None', params: [{ name: 'eventId', type: 'string' }], description: 'Get markets for event' },
                { id: 204, method: 'GET', endpoint: '/api/v1/sports/prematch/odds/:eventId', category: 'Pre-Match', auth: 'None', params: [{ name: 'eventId', type: 'string' }], description: 'Get odds for event' },
                { id: 205, method: 'GET', endpoint: '/api/v1/sports/prematch/leagues', category: 'Pre-Match', auth: 'None', params: [{ name: 'sportId', type: 'number' }], description: 'Get leagues by sport' },
                { id: 206, method: 'GET', endpoint: '/api/v1/sports/prematch/featured', category: 'Pre-Match', auth: 'None', params: [], description: 'Get featured pre-match events' },

                // Live & Play APIs
                { id: 301, method: 'GET', endpoint: '/api/v1/sports/live/events', category: 'Live & Play', auth: 'None', params: [{ name: 'sportId', type: 'number' }], description: 'Get all live events' },
                { id: 302, method: 'GET', endpoint: '/api/v1/sports/live/event/:eventId', category: 'Live & Play', auth: 'None', params: [{ name: 'eventId', type: 'string' }], description: 'Get live event details' },
                { id: 303, method: 'GET', endpoint: '/api/v1/sports/live/odds/:eventId', category: 'Live & Play', auth: 'None', params: [{ name: 'eventId', type: 'string' }], description: 'Get live odds (real-time)' },
                { id: 304, method: 'GET', endpoint: '/api/v1/sports/live/stats/:eventId', category: 'Live & Play', auth: 'None', params: [{ name: 'eventId', type: 'string' }], description: 'Get live match statistics' },
                { id: 305, method: 'GET', endpoint: '/api/v1/sports/live/stream/:eventId', category: 'Live & Play', auth: 'Bearer Token', params: [{ name: 'eventId', type: 'string' }], description: 'Get live stream URL' },
                { id: 306, method: 'WS', endpoint: '/ws/v1/sports/live/subscribe', category: 'Live & Play', auth: 'Bearer Token', params: [{ name: 'eventIds', type: 'array' }], description: 'WebSocket subscription for live updates' },

                // Build A Bet APIs
                { id: 401, method: 'GET', endpoint: '/api/v1/betbuilder/events', category: 'Build A Bet', auth: 'None', params: [{ name: 'sportId', type: 'number' }], description: 'Get bet builder eligible events' },
                { id: 402, method: 'GET', endpoint: '/api/v1/betbuilder/selections/:eventId', category: 'Build A Bet', auth: 'None', params: [{ name: 'eventId', type: 'string' }], description: 'Get available selections for bet builder' },
                { id: 403, method: 'POST', endpoint: '/api/v1/betbuilder/calculate', category: 'Build A Bet', auth: 'None', params: [{ name: 'selections', type: 'array' }], description: 'Calculate bet builder odds', body: '{"selections": [{"marketId": "123", "outcomeId": "456"}]}' },
                { id: 404, method: 'POST', endpoint: '/api/v1/betbuilder/validate', category: 'Build A Bet', auth: 'Bearer Token', params: [{ name: 'selections', type: 'array' }], description: 'Validate bet builder combination' },
                { id: 405, method: 'GET', endpoint: '/api/v1/betbuilder/popular', category: 'Build A Bet', auth: 'None', params: [], description: 'Get popular bet builder combinations' },

                // Outright APIs
                { id: 501, method: 'GET', endpoint: '/api/v1/sports/outrights', category: 'Outright', auth: 'None', params: [{ name: 'sportId', type: 'number' }], description: 'Get outright betting markets' },
                { id: 502, method: 'GET', endpoint: '/api/v1/sports/outrights/:leagueId', category: 'Outright', auth: 'None', params: [{ name: 'leagueId', type: 'string' }], description: 'Get outright markets for league' },
                { id: 503, method: 'GET', endpoint: '/api/v1/sports/outrights/odds/:marketId', category: 'Outright', auth: 'None', params: [{ name: 'marketId', type: 'string' }], description: 'Get outright odds' },
                { id: 504, method: 'GET', endpoint: '/api/v1/sports/outrights/featured', category: 'Outright', auth: 'None', params: [], description: 'Get featured outright markets' },

                // Test My Bet / Cashout APIs
                { id: 601, method: 'POST', endpoint: '/api/v1/bets/test', category: 'Test My Bet', auth: 'Bearer Token', params: [{ name: 'betslip', type: 'object' }], description: 'Test bet before placing', body: '{"selections": [], "stake": 1000}' },
                { id: 602, method: 'GET', endpoint: '/api/v1/bets/cashout/available/:betId', category: 'Test My Bet', auth: 'Bearer Token', params: [{ name: 'betId', type: 'string' }], description: 'Check cashout availability' },
                { id: 603, method: 'POST', endpoint: '/api/v1/bets/cashout/calculate', category: 'Test My Bet', auth: 'Bearer Token', params: [{ name: 'betId', type: 'string' }], description: 'Calculate cashout amount' },
                { id: 604, method: 'POST', endpoint: '/api/v1/bets/cashout/execute', category: 'Test My Bet', auth: 'Bearer Token', params: [{ name: 'betId', type: 'string' }, { name: 'amount', type: 'number' }], description: 'Execute cashout' },
                { id: 605, method: 'GET', endpoint: '/api/v1/bets/potential-return', category: 'Test My Bet', auth: 'None', params: [{ name: 'odds', type: 'number' }, { name: 'stake', type: 'number' }], description: 'Calculate potential return' },

                // Betslip & Bet Placement APIs
                { id: 701, method: 'POST', endpoint: '/api/v1/betslip/add', category: 'Betslip', auth: 'Bearer Token', params: [{ name: 'selection', type: 'object' }], description: 'Add selection to betslip' },
                { id: 702, method: 'DELETE', endpoint: '/api/v1/betslip/remove/:selectionId', category: 'Betslip', auth: 'Bearer Token', params: [{ name: 'selectionId', type: 'string' }], description: 'Remove selection from betslip' },
                { id: 703, method: 'GET', endpoint: '/api/v1/betslip', category: 'Betslip', auth: 'Bearer Token', params: [], description: 'Get current betslip' },
                { id: 704, method: 'POST', endpoint: '/api/v1/bets/place', category: 'Betslip', auth: 'Bearer Token', params: [{ name: 'betslip', type: 'object' }, { name: 'stake', type: 'number' }], description: 'Place bet', body: '{"selections": [], "stake": 1000, "betType": "single"}' },
                { id: 705, method: 'POST', endpoint: '/api/v1/bets/place/multiple', category: 'Betslip', auth: 'Bearer Token', params: [{ name: 'bets', type: 'array' }], description: 'Place multiple bets' },

                // Transaction History APIs
                { id: 801, method: 'GET', endpoint: '/api/v1/account/transactions', category: 'Transaction History', auth: 'Bearer Token', params: [{ name: 'page', type: 'number' }, { name: 'limit', type: 'number' }, { name: 'type', type: 'string' }], description: 'Get transaction history' },
                { id: 802, method: 'GET', endpoint: '/api/v1/account/transactions/:transactionId', category: 'Transaction History', auth: 'Bearer Token', params: [{ name: 'transactionId', type: 'string' }], description: 'Get transaction details' },
                { id: 803, method: 'GET', endpoint: '/api/v1/account/bets/history', category: 'Transaction History', auth: 'Bearer Token', params: [{ name: 'status', type: 'string' }, { name: 'fromDate', type: 'date' }, { name: 'toDate', type: 'date' }], description: 'Get betting history' },
                { id: 804, method: 'GET', endpoint: '/api/v1/account/bets/pending', category: 'Transaction History', auth: 'Bearer Token', params: [], description: 'Get pending/open bets' },
                { id: 805, method: 'GET', endpoint: '/api/v1/account/bets/settled', category: 'Transaction History', auth: 'Bearer Token', params: [{ name: 'page', type: 'number' }], description: 'Get settled bets' },
                { id: 806, method: 'GET', endpoint: '/api/v1/account/bets/:betId', category: 'Transaction History', auth: 'Bearer Token', params: [{ name: 'betId', type: 'string' }], description: 'Get bet details' },
                { id: 807, method: 'GET', endpoint: '/api/v1/account/deposits', category: 'Transaction History', auth: 'Bearer Token', params: [{ name: 'page', type: 'number' }], description: 'Get deposit history' },
                { id: 808, method: 'GET', endpoint: '/api/v1/account/withdrawals', category: 'Transaction History', auth: 'Bearer Token', params: [{ name: 'page', type: 'number' }], description: 'Get withdrawal history' },

                // Wallet & Balance APIs
                { id: 901, method: 'GET', endpoint: '/api/v1/account/balance', category: 'Wallet', auth: 'Bearer Token', params: [], description: 'Get account balance' },
                { id: 902, method: 'GET', endpoint: '/api/v1/account/bonus-balance', category: 'Wallet', auth: 'Bearer Token', params: [], description: 'Get bonus balance' },
                { id: 903, method: 'POST', endpoint: '/api/v1/account/deposit', category: 'Wallet', auth: 'Bearer Token', params: [{ name: 'amount', type: 'number' }, { name: 'method', type: 'string' }], description: 'Initiate deposit' },
                { id: 904, method: 'POST', endpoint: '/api/v1/account/withdraw', category: 'Wallet', auth: 'Bearer Token', params: [{ name: 'amount', type: 'number' }, { name: 'method', type: 'string' }], description: 'Initiate withdrawal' },

                // System & Config APIs
                { id: 1001, method: 'GET', endpoint: '/api/v1/config/sports', category: 'System', auth: 'None', params: [], description: 'Get available sports' },
                { id: 1002, method: 'GET', endpoint: '/api/v1/config/countries', category: 'System', auth: 'None', params: [], description: 'Get countries list' },
                { id: 1003, method: 'GET', endpoint: '/api/v1/config/currencies', category: 'System', auth: 'None', params: [], description: 'Get supported currencies' },
                { id: 1004, method: 'GET', endpoint: '/api/v1/health', category: 'System', auth: 'None', params: [], description: 'Health check endpoint' },
                { id: 1005, method: 'GET', endpoint: '/api/v1/config/limits', category: 'System', auth: 'Bearer Token', params: [], description: 'Get betting limits' }
            ]
        },
        {
            id: 'login-only',
            name: 'Login Flow Only (4000 VUs)',
            description: 'Focus on authentication endpoints only',
            targetUrl: 'https://mobi.betway.co.tz',
            virtualUsers: 4000,
            duration: 60,
            rampUpTime: 30,
            apis: [
                { id: 101, method: 'POST', endpoint: '/api/v1/auth/login', category: 'Authentication', auth: 'None', params: [{ name: 'msisdn', type: 'string', value: '255999676222' }, { name: 'password', type: 'string', value: '******' }], description: 'User login', body: '{"msisdn": "255999676222", "password": "123456"}' },
                { id: 102, method: 'POST', endpoint: '/api/v1/auth/session/validate', category: 'Authentication', auth: 'Bearer Token', params: [], description: 'Validate session' },
                { id: 103, method: 'GET', endpoint: '/api/v1/auth/user/profile', category: 'Authentication', auth: 'Bearer Token', params: [], description: 'Get profile' },
                { id: 104, method: 'GET', endpoint: '/api/v1/account/balance', category: 'Wallet', auth: 'Bearer Token', params: [], description: 'Get balance after login' },
                { id: 105, method: 'POST', endpoint: '/api/v1/auth/logout', category: 'Authentication', auth: 'Bearer Token', params: [], description: 'Logout' }
            ]
        },
        {
            id: 'live-betting',
            name: 'Live Betting Stress Test (3000 VUs)',
            description: 'High-frequency live betting and odds updates',
            targetUrl: 'https://mobi.betway.co.tz',
            virtualUsers: 3000,
            duration: 90,
            rampUpTime: 30,
            apis: [
                { id: 301, method: 'GET', endpoint: '/api/v1/sports/live/events', category: 'Live & Play', auth: 'None', params: [], description: 'Get live events' },
                { id: 302, method: 'GET', endpoint: '/api/v1/sports/live/odds/:eventId', category: 'Live & Play', auth: 'None', params: [{ name: 'eventId', type: 'string' }], description: 'Get live odds' },
                { id: 303, method: 'GET', endpoint: '/api/v1/sports/live/stats/:eventId', category: 'Live & Play', auth: 'None', params: [{ name: 'eventId', type: 'string' }], description: 'Get live stats' },
                { id: 304, method: 'POST', endpoint: '/api/v1/bets/place', category: 'Betslip', auth: 'Bearer Token', params: [], description: 'Place live bet' },
                { id: 305, method: 'POST', endpoint: '/api/v1/bets/cashout/execute', category: 'Test My Bet', auth: 'Bearer Token', params: [], description: 'Execute cashout' }
            ]
        }
    ];

    const loadDemoScenario = (scenario) => {
        setTargetUrl(scenario.targetUrl);
        setScanLogs([]);
        addLog(`Loading demo scenario: ${scenario.name}`, 'info');
        addLog(`Target: ${scenario.targetUrl}`, 'info');
        addLog(`Virtual Users: ${scenario.virtualUsers}`, 'info');
        addLog(`Duration: ${scenario.duration}s`, 'info');
        addLog(`Ramp-up Time: ${scenario.rampUpTime}s`, 'info');
        addLog(`APIs: ${scenario.apis.length} endpoints configured`, 'success');

        // Store config in localStorage for the config tab to pick up
        localStorage.setItem('demoLoadConfig', JSON.stringify({
            virtualUsers: scenario.virtualUsers,
            duration: scenario.duration,
            rampUpTime: scenario.rampUpTime,
            testName: scenario.name
        }));

        setTimeout(() => {
            onApisDiscovered(scenario.apis);
            addLog('Demo scenario loaded! Go to APIs tab to select endpoints.', 'success');
        }, 500);

        setShowDemoScenarios(false);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            addLog(`Uploaded file: ${file.name}`, 'info');
            setScanLogs([]);
            setIsScanning(true);
            setScanProgress(20);

            try {
                const fileContent = await file.text();
                addLog('Parsing HAR file...', 'info');
                setScanProgress(50);

                const response = await fetch('/api/loadtest/parse/har', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ harContent: fileContent })
                });

                const result = await response.json();
                setScanProgress(100);

                if (result.success) {
                    addLog(`Parsed ${result.apis?.length || 0} APIs from HAR file (${result.totalEntries} total entries)`, 'success');
                    addLog('Running AI analysis on imported traffic...', 'info');
                    setIsScanning(false);
                    onApisDiscovered(result.apis || []);
                    // Auto-trigger AI analysis on HAR import
                    runAiAnalysis(result.apis || []);
                } else {
                    throw new Error(result.error || 'HAR parsing failed');
                }
            } catch (error) {
                addLog(`HAR parsing failed: ${error.message}`, 'error');
                addLog('Falling back to mock discovery...', 'info');
                await runMockDiscovery();
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* URL Input Section */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-white/5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Globe size={20} className="text-violet-400" />
                        Target Website
                    </h3>
                    <div className="flex items-center gap-4">
                        {/* Real Discovery Toggle */}
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={useRealDiscovery}
                                onChange={(e) => setUseRealDiscovery(e.target.checked)}
                                className="w-4 h-4 rounded bg-slate-700 border-white/10 text-violet-500 focus:ring-violet-500/50"
                            />
                            <span className="text-sm text-gray-400">Real Discovery (Playwright)</span>
                            {useRealDiscovery && (
                                socketConnected ? (
                                    <Wifi size={14} className="text-green-400" title="Connected to server" />
                                ) : (
                                    <WifiOff size={14} className="text-gray-500" title="Disconnected" />
                                )
                            )}
                        </label>
                        {/* Advanced Options Toggle */}
                        <button
                            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                            className="flex items-center gap-1 text-sm text-gray-400 hover:text-violet-400 transition-colors"
                        >
                            <Settings size={14} />
                            Options
                        </button>
                    </div>
                </div>

                {/* Advanced Discovery Options */}
                {showAdvancedOptions && useRealDiscovery && (
                    <div className="mb-4 p-4 bg-slate-900/50 rounded-lg border border-white/10">
                        <h4 className="text-sm font-medium text-white mb-3">Discovery Options</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Timeout (ms)</label>
                                <input
                                    type="number"
                                    value={discoveryOptions.timeout}
                                    onChange={(e) => setDiscoveryOptions({ ...discoveryOptions, timeout: parseInt(e.target.value) })}
                                    className="w-full bg-slate-800 border border-white/10 rounded px-3 py-2 text-sm text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Max APIs</label>
                                <input
                                    type="number"
                                    value={discoveryOptions.maxAPIs}
                                    onChange={(e) => setDiscoveryOptions({ ...discoveryOptions, maxAPIs: parseInt(e.target.value) })}
                                    className="w-full bg-slate-800 border border-white/10 rounded px-3 py-2 text-sm text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Wait Time (ms)</label>
                                <input
                                    type="number"
                                    value={discoveryOptions.waitTime}
                                    onChange={(e) => setDiscoveryOptions({ ...discoveryOptions, waitTime: parseInt(e.target.value) })}
                                    className="w-full bg-slate-800 border border-white/10 rounded px-3 py-2 text-sm text-white"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="flex items-center gap-2 text-xs text-gray-400">
                                    <input
                                        type="checkbox"
                                        checked={discoveryOptions.scrollPage}
                                        onChange={(e) => setDiscoveryOptions({ ...discoveryOptions, scrollPage: e.target.checked })}
                                        className="w-3 h-3 rounded bg-slate-700 border-white/10 text-violet-500"
                                    />
                                    Scroll page
                                </label>
                                <label className="flex items-center gap-2 text-xs text-gray-400">
                                    <input
                                        type="checkbox"
                                        checked={discoveryOptions.clickButtons}
                                        onChange={(e) => setDiscoveryOptions({ ...discoveryOptions, clickButtons: e.target.checked })}
                                        className="w-3 h-3 rounded bg-slate-700 border-white/10 text-violet-500"
                                    />
                                    Click buttons
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex gap-3">
                    <div className="flex-1 relative">
                        <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="url"
                            value={targetUrl}
                            onChange={(e) => setTargetUrl(e.target.value)}
                            placeholder="https://example.com"
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-600 focus:border-violet-500/50 focus:outline-none"
                        />
                    </div>
                    <button
                        onClick={startScan}
                        disabled={isScanning || !targetUrl}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${isScanning || !targetUrl
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:shadow-lg hover:shadow-violet-500/25'
                            }`}
                    >
                        {isScanning ? (
                            <>
                                <RefreshCw size={18} className="animate-spin" />
                                Scanning...
                            </>
                        ) : (
                            <>
                                <Play size={18} />
                                {useRealDiscovery ? 'Discover APIs (Real)' : 'Discover APIs (Mock)'}
                            </>
                        )}
                    </button>
                </div>

                {/* Demo Scenarios Button */}
                <div className="mt-4 pt-4 border-t border-white/10">
                    <button
                        onClick={() => setShowDemoScenarios(!showDemoScenarios)}
                        className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-all"
                    >
                        <Zap size={16} />
                        Load Demo Scenario (for demonstration)
                    </button>

                    {showDemoScenarios && (
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                            {demoScenarios.map(scenario => (
                                <button
                                    key={scenario.id}
                                    onClick={() => loadDemoScenario(scenario)}
                                    className="p-4 bg-slate-900/50 rounded-xl border border-white/10 hover:border-violet-500/50 transition-all text-left group"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <Users size={16} className="text-violet-400" />
                                        <span className="font-medium text-white text-sm">{scenario.name}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-2">{scenario.description}</p>
                                    <div className="flex flex-wrap gap-2 text-xs">
                                        <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-400">
                                            {scenario.virtualUsers} VUs
                                        </span>
                                        <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                                            {scenario.duration}s
                                        </span>
                                        <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400">
                                            {scenario.apis.length} APIs
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Scan Method Selection */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-white/5">
                <h3 className="text-lg font-semibold text-white mb-4">Discovery Method</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {scanMethods.map(method => {
                        const Icon = method.icon;
                        return (
                            <button
                                key={method.id}
                                onClick={() => setScanMethod(method.id)}
                                className={`p-4 rounded-xl border transition-all text-left ${scanMethod === method.id
                                    ? 'bg-violet-500/20 border-violet-500/50'
                                    : 'bg-slate-900/50 border-white/10 hover:border-white/20'
                                    }`}
                            >
                                <Icon size={24} className={scanMethod === method.id ? 'text-violet-400' : 'text-gray-500'} />
                                <p className="font-medium text-white mt-2">{method.label}</p>
                                <p className="text-xs text-gray-500 mt-1">{method.description}</p>
                            </button>
                        );
                    })}
                </div>

                {/* OpenAPI URL Input */}
                {scanMethod === 'openapi' && (
                    <div className="mt-4">
                        <label className="block text-sm text-gray-400 mb-2">OpenAPI Specification URL</label>
                        <input
                            type="url"
                            value={openApiUrl}
                            onChange={(e) => setOpenApiUrl(e.target.value)}
                            placeholder="https://api.example.com/openapi.json"
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-violet-500/50 focus:outline-none"
                        />
                    </div>
                )}

                {/* HAR File Upload */}
                {scanMethod === 'har' && (
                    <div className="mt-4">
                        <label className="block text-sm text-gray-400 mb-2">Upload HAR File</label>
                        <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:border-violet-500/50 transition-all cursor-pointer">
                            <input
                                type="file"
                                accept=".har"
                                onChange={handleFileUpload}
                                className="hidden"
                                id="har-upload"
                            />
                            <label htmlFor="har-upload" className="cursor-pointer">
                                <Network size={32} className="mx-auto mb-2 text-gray-500" />
                                <p className="text-gray-400">Drop HAR file here or click to upload</p>
                                <p className="text-xs text-gray-500 mt-1">Exported from browser DevTools (Network tab → Export HAR)</p>
                            </label>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">After import, AI will automatically analyze the traffic to detect provider, classify endpoints, and suggest load test parameters.</p>
                    </div>
                )}

                {/* Proxy Recording */}
                {scanMethod === 'proxy' && (
                    <div className="mt-4 space-y-4">
                        <div className="bg-slate-900/50 rounded-xl p-5 border border-white/10">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h4 className="font-medium text-white flex items-center gap-2">
                                        <Radio size={16} className={proxyRunning ? 'text-red-400 animate-pulse' : 'text-gray-500'} />
                                        Proxy Capture
                                    </h4>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Record browser traffic by routing it through a capture proxy
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${proxyRunning ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                        {proxyRunning ? 'RECORDING' : 'STOPPED'}
                                    </span>
                                </div>
                            </div>

                            {!proxyRunning ? (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Proxy Port</label>
                                        <input
                                            type="number"
                                            value={proxyPort}
                                            onChange={(e) => setProxyPort(parseInt(e.target.value) || 8888)}
                                            className="w-32 bg-slate-800 border border-white/10 rounded px-3 py-2 text-sm text-white"
                                        />
                                    </div>
                                    <button
                                        onClick={startProxy}
                                        disabled={proxyStarting}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-all"
                                    >
                                        {proxyStarting ? <Loader size={14} className="animate-spin" /> : <Radio size={14} />}
                                        Start Recording
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="bg-slate-800/50 rounded-lg p-3 border border-white/5">
                                        <p className="text-sm text-white mb-2">Browser Proxy Settings:</p>
                                        <div className="font-mono text-xs text-violet-400 bg-slate-900 rounded p-2">
                                            HTTP Proxy: <span className="text-white">127.0.0.1:{proxyPort}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">
                                            Set your browser's HTTP proxy to the address above, then browse the game normally. API calls will be captured automatically.
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-400">
                                            Captured: <span className="text-white font-medium">{proxyCapturedApis.length}</span> API calls
                                        </span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={stopProxy}
                                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-600 text-white hover:bg-gray-500 transition-all"
                                            >
                                                <Square size={14} />
                                                Stop Recording
                                            </button>
                                            {proxyCapturedApis.length > 0 && (
                                                <button
                                                    onClick={async () => {
                                                        await stopProxy();
                                                        // After stopping, run AI analysis
                                                        const res = await fetch('/api/loadtest/proxy/stop', { method: 'POST' });
                                                        const data = await res.json();
                                                        if (data.apis) runAiAnalysis(data.apis);
                                                    }}
                                                    disabled={analyzing}
                                                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 border border-violet-500/30 transition-all"
                                                >
                                                    {analyzing ? <Loader size={14} className="animate-spin" /> : <Brain size={14} />}
                                                    Stop & Analyze
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Live captured APIs feed */}
                                    {proxyCapturedApis.length > 0 && (
                                        <div className="max-h-48 overflow-y-auto space-y-1">
                                            {proxyCapturedApis.slice(-20).map((api, i) => (
                                                <div key={i} className="flex items-center gap-2 text-xs px-3 py-1.5 bg-slate-800/50 rounded">
                                                    <span className={`px-1.5 py-0.5 rounded font-mono font-bold ${
                                                        api.method === 'GET' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                                                    }`}>{api.method}</span>
                                                    <span className="text-gray-300 truncate flex-1 font-mono">{api.url}</span>
                                                    <span className={`flex-shrink-0 ${api.status >= 200 && api.status < 400 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {api.status}
                                                    </span>
                                                    <span className="text-gray-500 flex-shrink-0">{api.responseTime}ms</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* AI Analysis Results */}
            {aiAnalysis && (
                <div className="bg-slate-800/50 rounded-xl border border-violet-500/20 overflow-hidden">
                    <button
                        onClick={() => setShowAnalysis(!showAnalysis)}
                        className="w-full flex items-center justify-between p-5 hover:bg-slate-700/20 transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-violet-500/20">
                                <Brain size={20} className="text-violet-400" />
                            </div>
                            <div className="text-left">
                                <h3 className="font-semibold text-white">AI Traffic Analysis</h3>
                                <p className="text-xs text-gray-400">
                                    Provider: <span className="text-violet-400">{aiAnalysis.provider_analysis?.provider_name || 'Unknown'}</span>
                                    {' | '}
                                    {(aiAnalysis.api_endpoints || []).length} endpoints classified
                                    {' | '}
                                    Architecture: {aiAnalysis.provider_analysis?.architecture_type || 'N/A'}
                                </p>
                            </div>
                        </div>
                        {showAnalysis ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
                    </button>

                    {showAnalysis && (
                        <div className="px-5 pb-5 space-y-4">
                            {/* Provider Info */}
                            {aiAnalysis.provider_analysis && (
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-3 py-1.5 rounded-lg text-sm bg-violet-500/20 text-violet-400 border border-violet-500/30">
                                        {aiAnalysis.provider_analysis.provider_name}
                                    </span>
                                    <span className="px-3 py-1.5 rounded-lg text-sm bg-blue-500/20 text-blue-400">
                                        {aiAnalysis.provider_analysis.architecture_type}
                                    </span>
                                    <span className="px-3 py-1.5 rounded-lg text-sm bg-green-500/20 text-green-400">
                                        {aiAnalysis.provider_analysis.game_type}
                                    </span>
                                    <span className="px-3 py-1.5 rounded-lg text-sm bg-gray-500/20 text-gray-400">
                                        Confidence: {aiAnalysis.provider_analysis.confidence}
                                    </span>
                                </div>
                            )}

                            {/* Performance Profile */}
                            {aiAnalysis.performance_profile && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="bg-slate-900/50 rounded-lg p-3 border border-white/5">
                                        <p className="text-xs text-gray-500">Recommended VUs</p>
                                        <p className="text-lg font-bold text-white">{aiAnalysis.performance_profile.recommended_vus}</p>
                                    </div>
                                    <div className="bg-slate-900/50 rounded-lg p-3 border border-white/5">
                                        <p className="text-xs text-gray-500">Duration</p>
                                        <p className="text-lg font-bold text-white">{aiAnalysis.performance_profile.recommended_duration_seconds}s</p>
                                    </div>
                                    <div className="bg-slate-900/50 rounded-lg p-3 border border-white/5">
                                        <p className="text-xs text-gray-500">Ramp-Up</p>
                                        <p className="text-lg font-bold text-white">{aiAnalysis.performance_profile.recommended_ramp_up_seconds}s</p>
                                    </div>
                                    <div className="bg-slate-900/50 rounded-lg p-3 border border-white/5">
                                        <p className="text-xs text-gray-500">P95 Target</p>
                                        <p className="text-lg font-bold text-white">{aiAnalysis.performance_profile.expected_response_time_p95_ms}ms</p>
                                    </div>
                                </div>
                            )}

                            {/* Classified Endpoints */}
                            {(aiAnalysis.api_endpoints || []).length > 0 && (
                                <div>
                                    <h4 className="text-sm font-medium text-white mb-2">Classified Endpoints</h4>
                                    <div className="space-y-1 max-h-48 overflow-y-auto">
                                        {aiAnalysis.api_endpoints.map((ep, i) => (
                                            <div key={i} className="flex items-center gap-2 text-xs px-3 py-2 bg-slate-900/50 rounded-lg">
                                                <span className={`px-1.5 py-0.5 rounded font-mono font-bold flex-shrink-0 ${
                                                    ep.method === 'GET' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                                                }`}>{ep.method}</span>
                                                <span className="text-gray-300 truncate flex-1 font-mono">{ep.url}</span>
                                                <span className={`px-2 py-0.5 rounded flex-shrink-0 ${
                                                    ep.category === 'spin' ? 'bg-red-500/20 text-red-400' :
                                                    ep.category === 'bet' ? 'bg-orange-500/20 text-orange-400' :
                                                    ep.category === 'launch' ? 'bg-green-500/20 text-green-400' :
                                                    ep.category === 'balance' ? 'bg-blue-500/20 text-blue-400' :
                                                    'bg-gray-500/20 text-gray-400'
                                                }`}>{ep.category}</span>
                                                {ep.critical_for_load_test && (
                                                    <Shield size={12} className="text-yellow-400 flex-shrink-0" title="Critical for load test" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recommendations */}
                            {(aiAnalysis.recommendations || []).length > 0 && (
                                <div>
                                    <h4 className="text-sm font-medium text-white mb-2">Recommendations</h4>
                                    <div className="space-y-1">
                                        {aiAnalysis.recommendations.map((rec, i) => (
                                            <p key={i} className="text-xs text-gray-400 pl-3 border-l-2 border-violet-500/30 py-1">{rec}</p>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={saveAnalysisAsConfig}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 border border-violet-500/30 transition-all"
                                >
                                    <Save size={14} />
                                    Save as Config
                                </button>
                                {aiAnalysis.k6_script && (
                                    <button
                                        onClick={() => {
                                            const blob = new Blob([aiAnalysis.k6_script], { type: 'text/javascript' });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = 'ai_generated_k6.js';
                                            a.click();
                                            URL.revokeObjectURL(url);
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30 transition-all"
                                    >
                                        <Download size={14} />
                                        Download K6 Script
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Scan Progress */}
            {isScanning && (
                <div className="bg-slate-800/50 rounded-xl p-6 border border-white/5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">Scanning Progress</h3>
                        <span className="text-violet-400 font-medium">{Math.round(scanProgress)}%</span>
                    </div>

                    <div className="w-full bg-slate-700 rounded-full h-2 mb-4 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-300"
                            style={{ width: `${scanProgress}%` }}
                        />
                    </div>

                    <div className="flex justify-between text-xs text-gray-500 mb-4">
                        {phases.map((phase, i) => (
                            <span key={phase} className={scanProgress >= ((i + 1) / phases.length) * 100 ? 'text-violet-400' : ''}>
                                {phase}
                            </span>
                        ))}
                    </div>

                    <p className="text-sm text-gray-400 flex items-center gap-2">
                        <Loader size={14} className="animate-spin" />
                        {scanPhase}
                    </p>
                </div>
            )}

            {/* Scan Logs */}
            {scanLogs.length > 0 && (
                <div className="bg-slate-800/50 rounded-xl p-6 border border-white/5">
                    <h3 className="text-lg font-semibold text-white mb-4">Scan Log</h3>
                    <div className="bg-slate-900/50 rounded-lg p-4 max-h-60 overflow-auto font-mono text-sm space-y-1">
                        {scanLogs.map((log, i) => (
                            <div key={i} className="flex items-start gap-2">
                                <span className="text-gray-600">[{log.timestamp}]</span>
                                {log.type === 'success' ? (
                                    <CheckCircle size={14} className="text-green-400 mt-0.5 flex-shrink-0" />
                                ) : log.type === 'error' ? (
                                    <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                                ) : (
                                    <span className="text-gray-500">→</span>
                                )}
                                <span className={log.type === 'success' ? 'text-green-400' : log.type === 'error' ? 'text-red-400' : 'text-gray-400'}>
                                    {log.message}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Features Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                        <Search size={16} className="text-violet-400" />
                        <span className="font-medium text-white">Smart Crawling</span>
                    </div>
                    <p className="text-xs text-gray-500">Automatically crawls pages and identifies AJAX/XHR calls</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                        <FileJson size={16} className="text-violet-400" />
                        <span className="font-medium text-white">OpenAPI Detection</span>
                    </div>
                    <p className="text-xs text-gray-500">Auto-detects Swagger/OpenAPI specs at common paths</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                        <Network size={16} className="text-violet-400" />
                        <span className="font-medium text-white">Traffic Analysis</span>
                    </div>
                    <p className="text-xs text-gray-500">Analyzes network patterns to classify endpoints</p>
                </div>
            </div>
        </div>
    );
}
