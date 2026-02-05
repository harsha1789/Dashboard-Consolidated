import React, { useState, useMemo, useEffect } from 'react';
import { Globe, Check, CheckSquare, Square, Filter, Search, ChevronDown, ChevronRight, Edit2, Trash2, Plus, X, Key, Save } from 'lucide-react';

// Edit API Modal Component
const EditAPIModal = ({ api, onSave, onClose }) => {
    const [editedApi, setEditedApi] = useState({
        ...api,
        params: api.params || [],
        headers: api.headers || [],
        body: api.body || '',
        authConfig: api.authConfig || { type: 'None', value: '' }
    });

    useEffect(() => {
        setEditedApi({
            ...api,
            params: api.params || [],
            headers: api.headers || [],
            body: api.body || '',
            authConfig: api.authConfig || { type: 'None', value: '' }
        });
    }, [api]);

    const authTypes = ['None', 'API Key', 'Bearer Token', 'Basic Auth', 'OAuth 2.0', 'JWT'];
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    const paramTypes = ['string', 'number', 'boolean', 'object', 'array'];

    const updateField = (field, value) => {
        setEditedApi(prev => ({ ...prev, [field]: value }));
    };

    const updateAuthConfig = (field, value) => {
        setEditedApi(prev => ({
            ...prev,
            authConfig: { ...prev.authConfig, [field]: value },
            auth: field === 'type' ? value : prev.auth
        }));
    };

    const addParam = () => {
        setEditedApi(prev => ({
            ...prev,
            params: [...prev.params, { name: '', type: 'string', value: '', required: false }]
        }));
    };

    const updateParam = (index, field, value) => {
        setEditedApi(prev => ({
            ...prev,
            params: prev.params.map((p, i) => i === index ? { ...p, [field]: value } : p)
        }));
    };

    const removeParam = (index) => {
        setEditedApi(prev => ({
            ...prev,
            params: prev.params.filter((_, i) => i !== index)
        }));
    };

    const addHeader = () => {
        setEditedApi(prev => ({
            ...prev,
            headers: [...(prev.headers || []), { key: '', value: '' }]
        }));
    };

    const updateHeader = (index, field, value) => {
        setEditedApi(prev => ({
            ...prev,
            headers: prev.headers.map((h, i) => i === index ? { ...h, [field]: value } : h)
        }));
    };

    const removeHeader = (index) => {
        setEditedApi(prev => ({
            ...prev,
            headers: prev.headers.filter((_, i) => i !== index)
        }));
    };

    const handleSave = () => {
        onSave(editedApi);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 rounded-2xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-violet-500/20">
                            <Edit2 size={18} className="text-violet-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">Edit API Configuration</h3>
                            <p className="text-sm text-gray-400">Modify endpoint parameters and credentials</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Basic Information</h4>
                        <div className="grid grid-cols-4 gap-3">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Method</label>
                                <select
                                    value={editedApi.method}
                                    onChange={(e) => updateField('method', e.target.value)}
                                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-violet-500/50 focus:outline-none"
                                >
                                    {methods.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <div className="col-span-3">
                                <label className="block text-xs text-gray-500 mb-1">Endpoint</label>
                                <input
                                    type="text"
                                    value={editedApi.endpoint}
                                    onChange={(e) => updateField('endpoint', e.target.value)}
                                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-violet-500/50 focus:outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Description</label>
                            <input
                                type="text"
                                value={editedApi.description}
                                onChange={(e) => updateField('description', e.target.value)}
                                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-violet-500/50 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Authentication */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <Key size={14} />
                            Authentication
                        </h4>
                        <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5 space-y-3">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Auth Type</label>
                                <select
                                    value={editedApi.authConfig?.type || 'None'}
                                    onChange={(e) => updateAuthConfig('type', e.target.value)}
                                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-violet-500/50 focus:outline-none"
                                >
                                    {authTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>

                            {editedApi.authConfig?.type === 'API Key' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Header Name</label>
                                        <input
                                            type="text"
                                            value={editedApi.authConfig?.headerName || 'X-API-Key'}
                                            onChange={(e) => updateAuthConfig('headerName', e.target.value)}
                                            placeholder="X-API-Key"
                                            className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-violet-500/50 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">API Key Value</label>
                                        <input
                                            type="password"
                                            value={editedApi.authConfig?.value || ''}
                                            onChange={(e) => updateAuthConfig('value', e.target.value)}
                                            placeholder="Enter API key"
                                            className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-violet-500/50 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            )}

                            {editedApi.authConfig?.type === 'Bearer Token' && (
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Bearer Token</label>
                                    <input
                                        type="password"
                                        value={editedApi.authConfig?.value || ''}
                                        onChange={(e) => updateAuthConfig('value', e.target.value)}
                                        placeholder="Enter bearer token"
                                        className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-violet-500/50 focus:outline-none"
                                    />
                                </div>
                            )}

                            {editedApi.authConfig?.type === 'Basic Auth' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Username</label>
                                        <input
                                            type="text"
                                            value={editedApi.authConfig?.username || ''}
                                            onChange={(e) => updateAuthConfig('username', e.target.value)}
                                            placeholder="Username"
                                            className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-violet-500/50 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Password</label>
                                        <input
                                            type="password"
                                            value={editedApi.authConfig?.password || ''}
                                            onChange={(e) => updateAuthConfig('password', e.target.value)}
                                            placeholder="Password"
                                            className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-violet-500/50 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            )}

                            {(editedApi.authConfig?.type === 'OAuth 2.0' || editedApi.authConfig?.type === 'JWT') && (
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Token</label>
                                    <textarea
                                        value={editedApi.authConfig?.value || ''}
                                        onChange={(e) => updateAuthConfig('value', e.target.value)}
                                        placeholder={`Enter ${editedApi.authConfig?.type} token`}
                                        rows={3}
                                        className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-violet-500/50 focus:outline-none resize-none"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Parameters */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Parameters</h4>
                            <button
                                onClick={addParam}
                                className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300"
                            >
                                <Plus size={14} /> Add Parameter
                            </button>
                        </div>
                        <div className="space-y-2">
                            {editedApi.params.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-4">No parameters defined. Click "Add Parameter" to add one.</p>
                            ) : (
                                editedApi.params.map((param, index) => (
                                    <div key={index} className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-2 border border-white/5">
                                        <input
                                            type="text"
                                            value={param.name}
                                            onChange={(e) => updateParam(index, 'name', e.target.value)}
                                            placeholder="Name"
                                            className="flex-1 bg-slate-800 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:border-violet-500/50 focus:outline-none"
                                        />
                                        <select
                                            value={param.type}
                                            onChange={(e) => updateParam(index, 'type', e.target.value)}
                                            className="bg-slate-800 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:border-violet-500/50 focus:outline-none"
                                        >
                                            {paramTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                        <input
                                            type="text"
                                            value={param.value || ''}
                                            onChange={(e) => updateParam(index, 'value', e.target.value)}
                                            placeholder="Value"
                                            className="flex-1 bg-slate-800 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:border-violet-500/50 focus:outline-none"
                                        />
                                        <label className="flex items-center gap-1 text-xs text-gray-400">
                                            <input
                                                type="checkbox"
                                                checked={param.required || false}
                                                onChange={(e) => updateParam(index, 'required', e.target.checked)}
                                                className="rounded border-gray-600"
                                            />
                                            Required
                                        </label>
                                        <button
                                            onClick={() => removeParam(index)}
                                            className="p-1 text-gray-500 hover:text-red-400"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Custom Headers */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Custom Headers</h4>
                            <button
                                onClick={addHeader}
                                className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300"
                            >
                                <Plus size={14} /> Add Header
                            </button>
                        </div>
                        <div className="space-y-2">
                            {(!editedApi.headers || editedApi.headers.length === 0) ? (
                                <p className="text-sm text-gray-500 text-center py-4">No custom headers. Click "Add Header" to add one.</p>
                            ) : (
                                editedApi.headers.map((header, index) => (
                                    <div key={index} className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-2 border border-white/5">
                                        <input
                                            type="text"
                                            value={header.key}
                                            onChange={(e) => updateHeader(index, 'key', e.target.value)}
                                            placeholder="Header name"
                                            className="flex-1 bg-slate-800 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:border-violet-500/50 focus:outline-none"
                                        />
                                        <input
                                            type="text"
                                            value={header.value}
                                            onChange={(e) => updateHeader(index, 'value', e.target.value)}
                                            placeholder="Header value"
                                            className="flex-1 bg-slate-800 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:border-violet-500/50 focus:outline-none"
                                        />
                                        <button
                                            onClick={() => removeHeader(index)}
                                            className="p-1 text-gray-500 hover:text-red-400"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Request Body (for POST/PUT/PATCH) */}
                    {['POST', 'PUT', 'PATCH'].includes(editedApi.method) && (
                        <div className="space-y-4">
                            <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Request Body</h4>
                            <textarea
                                value={editedApi.body || ''}
                                onChange={(e) => updateField('body', e.target.value)}
                                placeholder='{"key": "value"}'
                                rows={5}
                                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-violet-500/50 focus:outline-none resize-none"
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-4 border-t border-white/10">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/5 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:shadow-lg hover:shadow-violet-500/25 transition-all"
                    >
                        <Save size={14} />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

const MethodBadge = ({ method }) => {
    const colors = {
        GET: 'bg-green-500/20 text-green-400 border-green-500/30',
        POST: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        PUT: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
        PATCH: 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    };

    return (
        <span className={`px-2 py-0.5 rounded text-xs font-mono font-medium border ${colors[method] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
            {method}
        </span>
    );
};

export default function LoadTestingAPIList({ apis, selectedApis, onSelectionChange, onUpdateApi }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterMethod, setFilterMethod] = useState('all');
    const [expandedCategories, setExpandedCategories] = useState(new Set(['Users', 'Products', 'Orders', 'Analytics', 'Authentication', 'System']));
    const [editingApi, setEditingApi] = useState(null);

    // Get unique categories and methods
    const categories = useMemo(() => ['all', ...new Set(apis.map(api => api.category))], [apis]);
    const methods = ['all', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

    // Filter APIs
    const filteredApis = useMemo(() => {
        return apis.filter(api => {
            const matchesSearch = api.endpoint.toLowerCase().includes(searchTerm.toLowerCase()) ||
                api.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = filterCategory === 'all' || api.category === filterCategory;
            const matchesMethod = filterMethod === 'all' || api.method === filterMethod;
            return matchesSearch && matchesCategory && matchesMethod;
        });
    }, [apis, searchTerm, filterCategory, filterMethod]);

    // Group APIs by category
    const groupedApis = useMemo(() => {
        return filteredApis.reduce((acc, api) => {
            if (!acc[api.category]) acc[api.category] = [];
            acc[api.category].push(api);
            return acc;
        }, {});
    }, [filteredApis]);

    const toggleCategory = (category) => {
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(category)) {
            newExpanded.delete(category);
        } else {
            newExpanded.add(category);
        }
        setExpandedCategories(newExpanded);
    };

    const toggleApi = (api) => {
        const isSelected = selectedApis.some(a => a.id === api.id);
        if (isSelected) {
            onSelectionChange(selectedApis.filter(a => a.id !== api.id));
        } else {
            onSelectionChange([...selectedApis, api]);
        }
    };

    const selectAll = () => {
        onSelectionChange([...filteredApis]);
    };

    const clearAll = () => {
        onSelectionChange([]);
    };

    const selectCategory = (category) => {
        const categoryApis = filteredApis.filter(api => api.category === category);
        const newSelection = [...selectedApis];
        categoryApis.forEach(api => {
            if (!newSelection.some(a => a.id === api.id)) {
                newSelection.push(api);
            }
        });
        onSelectionChange(newSelection);
    };

    if (apis.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-gray-500">
                <Globe size={48} className="mb-4 opacity-50" />
                <p className="text-lg font-medium">No APIs Discovered</p>
                <p className="text-sm">Run a scan to discover API endpoints</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filters and Search */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Search */}
                    <div className="flex-1 min-w-64 relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search endpoints..."
                            className="w-full bg-slate-900/50 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-600 focus:border-violet-500/50 focus:outline-none"
                        />
                    </div>

                    {/* Category Filter */}
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-violet-500/50 focus:outline-none"
                    >
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
                        ))}
                    </select>

                    {/* Method Filter */}
                    <select
                        value={filterMethod}
                        onChange={(e) => setFilterMethod(e.target.value)}
                        className="bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-violet-500/50 focus:outline-none"
                    >
                        {methods.map(method => (
                            <option key={method} value={method}>{method === 'all' ? 'All Methods' : method}</option>
                        ))}
                    </select>

                    {/* Selection Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={selectAll}
                            className="px-3 py-2 rounded-lg text-sm bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 transition-all"
                        >
                            Select All
                        </button>
                        <button
                            onClick={clearAll}
                            className="px-3 py-2 rounded-lg text-sm bg-slate-700 text-gray-400 hover:bg-slate-600 transition-all"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            </div>

            {/* Selection Summary */}
            <div className="flex items-center justify-between px-2">
                <span className="text-sm text-gray-400">
                    Showing <span className="text-white font-medium">{filteredApis.length}</span> of {apis.length} APIs
                </span>
                <span className="text-sm text-gray-400">
                    <span className="text-violet-400 font-medium">{selectedApis.length}</span> selected for load testing
                </span>
            </div>

            {/* API List by Category */}
            <div className="space-y-4">
                {Object.entries(groupedApis).map(([category, categoryApis]) => (
                    <div key={category} className="bg-slate-800/50 rounded-xl border border-white/5 overflow-hidden">
                        {/* Category Header */}
                        <button
                            onClick={() => toggleCategory(category)}
                            className="w-full flex items-center justify-between p-4 hover:bg-slate-700/30 transition-all"
                        >
                            <div className="flex items-center gap-3">
                                {expandedCategories.has(category) ? (
                                    <ChevronDown size={18} className="text-gray-500" />
                                ) : (
                                    <ChevronRight size={18} className="text-gray-500" />
                                )}
                                <span className="font-medium text-white">{category}</span>
                                <span className="px-2 py-0.5 rounded-full text-xs bg-slate-700 text-gray-400">
                                    {categoryApis.length}
                                </span>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    selectCategory(category);
                                }}
                                className="text-xs text-violet-400 hover:text-violet-300"
                            >
                                Select All
                            </button>
                        </button>

                        {/* Category APIs */}
                        {expandedCategories.has(category) && (
                            <div className="border-t border-white/5">
                                {categoryApis.map(api => {
                                    const isSelected = selectedApis.some(a => a.id === api.id);
                                    return (
                                        <div
                                            key={api.id}
                                            className={`flex items-center gap-4 p-4 border-b border-white/5 last:border-b-0 hover:bg-slate-700/20 transition-all cursor-pointer ${isSelected ? 'bg-violet-500/10' : ''
                                                }`}
                                            onClick={() => toggleApi(api)}
                                        >
                                            {/* Checkbox */}
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${isSelected
                                                ? 'bg-violet-500 border-violet-500'
                                                : 'border-gray-600 hover:border-gray-500'
                                                }`}>
                                                {isSelected && <Check size={14} className="text-white" />}
                                            </div>

                                            {/* Method Badge */}
                                            <MethodBadge method={api.method} />

                                            {/* Endpoint */}
                                            <div className="flex-1">
                                                <p className="font-mono text-sm text-white">{api.endpoint}</p>
                                                <p className="text-xs text-gray-500">{api.description}</p>
                                            </div>

                                            {/* Auth Type */}
                                            <span className={`px-2 py-1 rounded text-xs ${api.auth === 'None'
                                                ? 'bg-gray-500/20 text-gray-400'
                                                : 'bg-yellow-500/20 text-yellow-400'
                                                }`}>
                                                {api.auth}
                                            </span>

                                            {/* Parameters Count */}
                                            {api.params.length > 0 && (
                                                <span className="px-2 py-1 rounded text-xs bg-slate-700 text-gray-400">
                                                    {api.params.length} params
                                                </span>
                                            )}

                                            {/* Actions */}
                                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => setEditingApi(api)}
                                                    className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-slate-700 transition-all"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Selected APIs Summary */}
            {selectedApis.length > 0 && (
                <div className="bg-violet-500/10 rounded-xl p-4 border border-violet-500/30">
                    <h4 className="font-medium text-white mb-3">Selected for Load Testing ({selectedApis.length})</h4>
                    <div className="flex flex-wrap gap-2">
                        {selectedApis.map(api => (
                            <span
                                key={api.id}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-white/10"
                            >
                                <MethodBadge method={api.method} />
                                <span className="text-sm font-mono text-gray-300">{api.endpoint}</span>
                                <button
                                    onClick={() => toggleApi(api)}
                                    className="text-gray-500 hover:text-red-400"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Edit API Modal */}
            {editingApi && (
                <EditAPIModal
                    api={editingApi}
                    onSave={(updatedApi) => {
                        if (onUpdateApi) {
                            onUpdateApi(updatedApi);
                        }
                        // Also update in selectedApis if present
                        if (selectedApis.some(a => a.id === updatedApi.id)) {
                            onSelectionChange(
                                selectedApis.map(a => a.id === updatedApi.id ? updatedApi : a)
                            );
                        }
                    }}
                    onClose={() => setEditingApi(null)}
                />
            )}
        </div>
    );
}
