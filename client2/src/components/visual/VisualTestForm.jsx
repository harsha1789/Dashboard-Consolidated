import React, { useState, useEffect } from 'react';
import { Play, Loader2, Plus, Shield, ShieldOff, X } from 'lucide-react';
import * as visualApi from '../../api/visualApi';

export default function VisualTestForm({ onTestComplete }) {
    const [url, setUrl] = useState('');
    const [domain, setDomain] = useState('');
    const [availableRoutes, setAvailableRoutes] = useState([]);
    const [selectedRoutes, setSelectedRoutes] = useState(['/']);
    const [newRoute, setNewRoute] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Authentication state
    const [requiresAuth, setRequiresAuth] = useState(false);
    const [mobile, setMobile] = useState('');
    const [password, setPassword] = useState('');
    const [customHeaders, setCustomHeaders] = useState({});

    // Extract domain from URL and load auth config
    useEffect(() => {
        if (url) {
            try {
                const urlObj = new URL(url);
                const extractedDomain = urlObj.hostname;
                setDomain(extractedDomain);
                loadRoutes(extractedDomain);
                loadAuthConfig(extractedDomain);
            } catch (e) {
                setDomain('');
                setAvailableRoutes([]);
            }
        } else {
            setDomain('');
            setAvailableRoutes([]);
        }
    }, [url]);

    const loadAuthConfig = async (domain) => {
        try {
            const config = await visualApi.getAuthConfig(domain);
            setRequiresAuth(config.requiresAuth || false);
            setMobile(config.mobile || '');
            setPassword(config.password || '');
            setCustomHeaders(config.customHeaders || {});
        } catch (err) {
            console.error('Failed to load auth config:', err);
        }
    };

    const loadRoutes = async (domain) => {
        try {
            const routes = await visualApi.getRoutes(domain);
            setAvailableRoutes(routes);
            if (routes.includes('/') && !selectedRoutes.includes('/')) {
                setSelectedRoutes(['/']);
            }
        } catch (err) {
            console.error('Failed to load routes:', err);
        }
    };

    const toggleRoute = (route) => {
        if (selectedRoutes.includes(route)) {
            setSelectedRoutes(selectedRoutes.filter(r => r !== route));
        } else {
            setSelectedRoutes([...selectedRoutes, route]);
        }
    };

    const handleAddRoute = async () => {
        if (!newRoute.trim() || !domain) return;

        const route = newRoute.trim();

        try {
            const updatedRoutes = await visualApi.saveRoute(domain, route);
            setAvailableRoutes(updatedRoutes);
            setSelectedRoutes([...selectedRoutes, route]);
            setNewRoute('');
        } catch (err) {
            console.error('Failed to save route:', err);
        }
    };

    const handleDeleteRoute = async (routeToDelete) => {
        if (routeToDelete === '/' && availableRoutes.length === 1) {
            alert('Cannot delete the last route');
            return;
        }

        if (!window.confirm(`Delete route "${routeToDelete}"?`)) return;

        try {
            setSelectedRoutes(selectedRoutes.filter(r => r !== routeToDelete));
            const updatedRoutes = availableRoutes.filter(r => r !== routeToDelete);
            setAvailableRoutes(updatedRoutes);
        } catch (err) {
            console.error('Failed to delete route:', err);
        }
    };

    const handleSaveAuth = async () => {
        if (!domain) return;
        try {
            await visualApi.saveAuthConfig(domain, {
                requiresAuth,
                mobile,
                password,
                customHeaders
            });
        } catch (err) {
            console.error('Failed to save auth config:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (selectedRoutes.length === 0) {
            setError('Please select at least one route');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const authConfig = {
                requiresAuth,
                mobile,
                password,
                customHeaders
            };
            const report = await visualApi.runTest(url, selectedRoutes, authConfig);
            onTestComplete(report);
            setUrl('');
            setSelectedRoutes(['/']);
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-white/10 mb-6">
            <h2 className="text-xl font-bold mb-4 text-white">Run Visual Test</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Website URL</label>
                    <input
                        type="url"
                        required
                        placeholder="https://example.com"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="w-full p-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    />
                </div>

                {domain && (
                    <>
                        {/* Authentication Section */}
                        <div className="border border-white/10 rounded-xl p-4 bg-slate-900/30">
                            <div className="flex items-center justify-between mb-3">
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                                    {requiresAuth ? <Shield className="text-emerald-400" size={20} /> : <ShieldOff className="text-gray-500" size={20} />}
                                    Authentication
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setRequiresAuth(!requiresAuth)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${requiresAuth ? 'bg-emerald-500' : 'bg-slate-600'}`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${requiresAuth ? 'translate-x-6' : 'translate-x-1'}`}
                                    />
                                </button>
                            </div>

                            {requiresAuth && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1">Mobile Number</label>
                                        <input
                                            type="tel"
                                            placeholder="Enter mobile number"
                                            value={mobile}
                                            onChange={(e) => setMobile(e.target.value)}
                                            onBlur={handleSaveAuth}
                                            className="w-full p-2 bg-slate-800/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1">Password</label>
                                        <input
                                            type="password"
                                            placeholder="Enter password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            onBlur={handleSaveAuth}
                                            className="w-full p-2 bg-slate-800/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                                        />
                                    </div>
                                    <p className="text-xs text-violet-400 italic bg-violet-500/10 p-2 rounded-lg border border-violet-500/20">
                                        System will auto-login and capture session for testing
                                    </p>
                                </div>
                            )}

                            {!requiresAuth && (
                                <p className="text-xs text-gray-500 italic">
                                    Toggle ON to test authenticated pages (e.g., my-bets, profile)
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Select Routes to Test
                            </label>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {availableRoutes.map((route) => (
                                    <div key={route} className="relative group">
                                        <button
                                            type="button"
                                            onClick={() => toggleRoute(route)}
                                            className={`px-4 py-2 pr-8 rounded-lg font-medium transition ${selectedRoutes.includes(route)
                                                ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                                                : 'bg-slate-700/50 text-gray-300 border border-white/10 hover:bg-slate-600/50'
                                                }`}
                                        >
                                            {route}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteRoute(route);
                                            }}
                                            className={`absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full transition-opacity ${selectedRoutes.includes(route)
                                                ? 'text-violet-400 hover:bg-violet-500/20'
                                                : 'text-gray-500 hover:bg-slate-600'
                                                }`}
                                            title="Delete route"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Add custom route (e.g., /about)"
                                    value={newRoute}
                                    onChange={(e) => setNewRoute(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddRoute())}
                                    className="flex-1 p-2 bg-slate-900/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddRoute}
                                    className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-lg hover:bg-emerald-500/30 flex items-center gap-1 text-sm font-medium transition"
                                >
                                    <Plus size={16} />
                                    Add
                                </button>
                            </div>
                        </div>

                        <div className="bg-slate-900/30 p-3 rounded-lg border border-white/5">
                            <p className="text-sm text-gray-400">
                                <strong className="text-gray-300">Selected:</strong> {selectedRoutes.length > 0 ? selectedRoutes.join(', ') : 'None'}
                            </p>
                        </div>
                    </>
                )}

                <button
                    type="submit"
                    disabled={loading || selectedRoutes.length === 0}
                    className="bg-gradient-to-r from-violet-500 to-purple-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-violet-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/25"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <Play size={20} />}
                    {loading ? 'Running Visual Tests...' : 'Run Test'}
                </button>
            </form>
            {error && (
                <div className="mt-4 p-4 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20">
                    Error: {error}
                </div>
            )}
        </div>
    );
}
