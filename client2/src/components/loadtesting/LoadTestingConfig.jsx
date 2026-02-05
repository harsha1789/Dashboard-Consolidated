import React, { useState } from 'react';
import { Settings, Users, Clock, Zap, Server, Key, FileJson, ChevronDown, ChevronRight, Plus, Trash2, Info } from 'lucide-react';

const InputField = ({ label, value, onChange, type = 'text', min, max, step, placeholder, suffix, tooltip }) => (
    <div className="space-y-1">
        <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">{label}</label>
            {tooltip && (
                <div className="group relative">
                    <Info size={14} className="text-gray-600 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 rounded-lg text-xs text-gray-300 w-48 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {tooltip}
                    </div>
                </div>
            )}
        </div>
        <div className="relative">
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
                min={min}
                max={max}
                step={step}
                placeholder={placeholder}
                className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:border-violet-500/50 focus:outline-none"
            />
            {suffix && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">{suffix}</span>
            )}
        </div>
    </div>
);

const SelectField = ({ label, value, onChange, options, tooltip }) => (
    <div className="space-y-1">
        <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">{label}</label>
            {tooltip && (
                <div className="group relative">
                    <Info size={14} className="text-gray-600 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 rounded-lg text-xs text-gray-300 w-48 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {tooltip}
                    </div>
                </div>
            )}
        </div>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-violet-500/50 focus:outline-none"
        >
            {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    </div>
);

export default function LoadTestingConfig({ config, setConfig, selectedApis, customHeaders: externalHeaders, setCustomHeaders: setExternalHeaders }) {
    const [expandedSections, setExpandedSections] = useState(new Set(['basic', 'load', 'auth', 'advanced']));
    const [internalHeaders, setInternalHeaders] = useState([{ key: '', value: '' }]);

    // Use external headers if provided (lifted state from parent), otherwise use internal
    const customHeaders = externalHeaders || internalHeaders;
    const setCustomHeaders = setExternalHeaders || setInternalHeaders;

    const toggleSection = (section) => {
        const newExpanded = new Set(expandedSections);
        if (newExpanded.has(section)) {
            newExpanded.delete(section);
        } else {
            newExpanded.add(section);
        }
        setExpandedSections(newExpanded);
    };

    const updateConfig = (key, value) => {
        setConfig({ ...config, [key]: value });
    };

    const addHeader = () => {
        setCustomHeaders([...customHeaders, { key: '', value: '' }]);
    };

    const removeHeader = (index) => {
        setCustomHeaders(customHeaders.filter((_, i) => i !== index));
    };

    const updateHeader = (index, field, value) => {
        const newHeaders = [...customHeaders];
        newHeaders[index][field] = value;
        setCustomHeaders(newHeaders);
    };

    const SectionHeader = ({ icon, title, section, badge }) => (
        <button
            onClick={() => toggleSection(section)}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-700/30 transition-all"
        >
            <div className="flex items-center gap-3">
                {expandedSections.has(section) ? (
                    <ChevronDown size={18} className="text-gray-500" />
                ) : (
                    <ChevronRight size={18} className="text-gray-500" />
                )}
                {icon}
                <span className="font-medium text-white">{title}</span>
                {badge && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-violet-500/20 text-violet-400">{badge}</span>
                )}
            </div>
        </button>
    );

    return (
        <div className="space-y-6">
            {/* Test Name */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-white/5">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Settings size={20} className="text-violet-400" />
                    Test Configuration
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField
                        label="Test Name"
                        value={config.testName}
                        onChange={(v) => updateConfig('testName', v)}
                        placeholder="e.g., API Load Test - Production"
                    />

                    <SelectField
                        label="Test Type"
                        value={config.testType}
                        onChange={(v) => updateConfig('testType', v)}
                        options={[
                            { value: 'single', label: 'Single API' },
                            { value: 'multiple', label: 'Multiple APIs (Parallel)' },
                            { value: 'sequential', label: 'Sequential Flow' },
                            { value: 'flow', label: 'Complete User Flow' }
                        ]}
                        tooltip="Single: Test one API. Multiple: Test selected APIs in parallel. Flow: Simulate realistic user journey."
                    />
                </div>
            </div>

            {/* Basic Load Parameters */}
            <div className="bg-slate-800/50 rounded-xl border border-white/5 overflow-hidden">
                <SectionHeader
                    icon={<Users size={18} className="text-violet-400" />}
                    title="Load Parameters"
                    section="basic"
                />

                {expandedSections.has('basic') && (
                    <div className="p-4 border-t border-white/5 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <InputField
                                label="Virtual Users (VUs)"
                                type="number"
                                value={config.virtualUsers}
                                onChange={(v) => updateConfig('virtualUsers', v)}
                                min={1}
                                max={10000}
                                tooltip="Number of concurrent users to simulate"
                            />

                            <InputField
                                label="Ramp-up Time"
                                type="number"
                                value={config.rampUpTime}
                                onChange={(v) => updateConfig('rampUpTime', v)}
                                min={0}
                                max={600}
                                suffix="seconds"
                                tooltip="Time to gradually increase users to target"
                            />

                            <InputField
                                label="Test Duration"
                                type="number"
                                value={config.duration}
                                onChange={(v) => updateConfig('duration', v)}
                                min={10}
                                max={3600}
                                suffix="seconds"
                                tooltip="How long to run the test at full load"
                            />

                            <InputField
                                label="Requests per Second"
                                type="number"
                                value={config.requestsPerSecond}
                                onChange={(v) => updateConfig('requestsPerSecond', v)}
                                min={1}
                                max={10000}
                                suffix="RPS"
                                tooltip="Target requests per second (rate limiting)"
                            />

                            <InputField
                                label="Think Time"
                                type="number"
                                value={config.thinkTime}
                                onChange={(v) => updateConfig('thinkTime', v)}
                                min={0}
                                max={60}
                                step={0.5}
                                suffix="seconds"
                                tooltip="Delay between requests (simulates user thinking)"
                            />

                            <SelectField
                                label="Load Profile"
                                value={config.loadProfile || 'constant'}
                                onChange={(v) => updateConfig('loadProfile', v)}
                                options={[
                                    { value: 'constant', label: 'Constant Load' },
                                    { value: 'rampup', label: 'Ramp Up/Down' },
                                    { value: 'spike', label: 'Spike Test' },
                                    { value: 'stress', label: 'Stress Test' },
                                    { value: 'soak', label: 'Soak/Endurance' }
                                ]}
                                tooltip="Pattern for applying load during test"
                            />
                        </div>

                        {/* Visual Load Profile */}
                        <div className="bg-slate-900/50 rounded-lg p-4 border border-white/5">
                            <p className="text-xs text-gray-500 mb-2">Load Profile Preview</p>
                            <div className="h-24 flex items-end gap-1">
                                {Array.from({ length: 30 }, (_, i) => {
                                    let height;
                                    const progress = i / 30;
                                    const rampUpProgress = config.rampUpTime / config.duration;

                                    if (config.loadProfile === 'spike') {
                                        height = i === 15 ? 100 : 30;
                                    } else if (config.loadProfile === 'stress') {
                                        height = Math.min(progress * 150, 100);
                                    } else if (config.loadProfile === 'rampup') {
                                        if (progress < 0.3) height = progress * 100 / 0.3;
                                        else if (progress > 0.7) height = (1 - progress) * 100 / 0.3;
                                        else height = 100;
                                    } else {
                                        height = progress < rampUpProgress ? (progress / rampUpProgress) * 100 : 100;
                                    }

                                    return (
                                        <div
                                            key={i}
                                            className="flex-1 bg-gradient-to-t from-violet-500 to-purple-500 rounded-t opacity-70"
                                            style={{ height: `${height}%` }}
                                        />
                                    );
                                })}
                            </div>
                            <div className="flex justify-between mt-2 text-xs text-gray-600">
                                <span>0s</span>
                                <span>{config.duration}s</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Authentication */}
            <div className="bg-slate-800/50 rounded-xl border border-white/5 overflow-hidden">
                <SectionHeader
                    icon={<Key size={18} className="text-violet-400" />}
                    title="Authentication"
                    section="auth"
                />

                {expandedSections.has('auth') && (
                    <div className="p-4 border-t border-white/5 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SelectField
                                label="Authentication Type"
                                value={config.authType || 'none'}
                                onChange={(v) => updateConfig('authType', v)}
                                options={[
                                    { value: 'none', label: 'None' },
                                    { value: 'apikey', label: 'API Key' },
                                    { value: 'bearer', label: 'Bearer Token' },
                                    { value: 'basic', label: 'Basic Auth' },
                                    { value: 'oauth2', label: 'OAuth 2.0' },
                                    { value: 'jwt', label: 'JWT' }
                                ]}
                            />

                            {config.authType === 'apikey' && (
                                <>
                                    <InputField
                                        label="API Key Header"
                                        value={config.apiKeyHeader || 'X-API-Key'}
                                        onChange={(v) => updateConfig('apiKeyHeader', v)}
                                        placeholder="X-API-Key"
                                    />
                                    <InputField
                                        label="API Key Value"
                                        value={config.apiKeyValue || ''}
                                        onChange={(v) => updateConfig('apiKeyValue', v)}
                                        placeholder="your-api-key"
                                        type="password"
                                    />
                                </>
                            )}

                            {config.authType === 'bearer' && (
                                <InputField
                                    label="Bearer Token"
                                    value={config.bearerToken || ''}
                                    onChange={(v) => updateConfig('bearerToken', v)}
                                    placeholder="your-bearer-token"
                                    type="password"
                                />
                            )}

                            {config.authType === 'basic' && (
                                <>
                                    <InputField
                                        label="Username"
                                        value={config.basicUsername || ''}
                                        onChange={(v) => updateConfig('basicUsername', v)}
                                    />
                                    <InputField
                                        label="Password"
                                        value={config.basicPassword || ''}
                                        onChange={(v) => updateConfig('basicPassword', v)}
                                        type="password"
                                    />
                                </>
                            )}

                            {config.authType === 'oauth2' && (
                                <>
                                    <InputField
                                        label="Token URL"
                                        value={config.oauth2TokenUrl || ''}
                                        onChange={(v) => updateConfig('oauth2TokenUrl', v)}
                                        placeholder="https://auth.example.com/oauth/token"
                                    />
                                    <InputField
                                        label="Client ID"
                                        value={config.oauth2ClientId || ''}
                                        onChange={(v) => updateConfig('oauth2ClientId', v)}
                                    />
                                    <InputField
                                        label="Client Secret"
                                        value={config.oauth2ClientSecret || ''}
                                        onChange={(v) => updateConfig('oauth2ClientSecret', v)}
                                        type="password"
                                    />
                                    <SelectField
                                        label="Grant Type"
                                        value={config.oauth2GrantType || 'client_credentials'}
                                        onChange={(v) => updateConfig('oauth2GrantType', v)}
                                        options={[
                                            { value: 'client_credentials', label: 'Client Credentials' },
                                            { value: 'password', label: 'Password' },
                                            { value: 'authorization_code', label: 'Authorization Code' }
                                        ]}
                                    />
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Custom Headers */}
            <div className="bg-slate-800/50 rounded-xl border border-white/5 overflow-hidden">
                <SectionHeader
                    icon={<FileJson size={18} className="text-violet-400" />}
                    title="Custom Headers"
                    section="headers"
                    badge={customHeaders.filter(h => h.key).length || null}
                />

                {expandedSections.has('headers') && (
                    <div className="p-4 border-t border-white/5 space-y-3">
                        {customHeaders.map((header, index) => (
                            <div key={index} className="flex gap-3">
                                <input
                                    type="text"
                                    value={header.key}
                                    onChange={(e) => updateHeader(index, 'key', e.target.value)}
                                    placeholder="Header name"
                                    className="flex-1 bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-violet-500/50 focus:outline-none"
                                />
                                <input
                                    type="text"
                                    value={header.value}
                                    onChange={(e) => updateHeader(index, 'value', e.target.value)}
                                    placeholder="Header value"
                                    className="flex-1 bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-violet-500/50 focus:outline-none"
                                />
                                <button
                                    onClick={() => removeHeader(index)}
                                    className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={addHeader}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-violet-400 hover:bg-violet-500/10 transition-all"
                        >
                            <Plus size={16} />
                            Add Header
                        </button>
                    </div>
                )}
            </div>

            {/* Advanced Settings */}
            <div className="bg-slate-800/50 rounded-xl border border-white/5 overflow-hidden">
                <SectionHeader
                    icon={<Server size={18} className="text-violet-400" />}
                    title="Advanced Settings"
                    section="advanced"
                />

                {expandedSections.has('advanced') && (
                    <div className="p-4 border-t border-white/5 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <SelectField
                                label="Environment"
                                value={config.environment}
                                onChange={(v) => updateConfig('environment', v)}
                                options={[
                                    { value: 'dev', label: 'Development' },
                                    { value: 'qa', label: 'QA/Staging' },
                                    { value: 'prod', label: 'Production' }
                                ]}
                            />

                            <InputField
                                label="Request Timeout"
                                type="number"
                                value={config.timeout || 30}
                                onChange={(v) => updateConfig('timeout', v)}
                                min={1}
                                max={300}
                                suffix="seconds"
                            />

                            <InputField
                                label="Max Redirects"
                                type="number"
                                value={config.maxRedirects || 5}
                                onChange={(v) => updateConfig('maxRedirects', v)}
                                min={0}
                                max={20}
                            />

                            <SelectField
                                label="Load Testing Tool"
                                value={config.tool || 'k6'}
                                onChange={(v) => updateConfig('tool', v)}
                                options={[
                                    { value: 'k6', label: 'k6 (Recommended)' },
                                    { value: 'jmeter', label: 'Apache JMeter' },
                                    { value: 'gatling', label: 'Gatling' },
                                    { value: 'locust', label: 'Locust' }
                                ]}
                            />

                            <InputField
                                label="Payload Size"
                                type="number"
                                value={config.payloadSize || 1024}
                                onChange={(v) => updateConfig('payloadSize', v)}
                                min={0}
                                suffix="bytes"
                                tooltip="Size of request body for POST/PUT requests"
                            />

                            <div className="flex items-center gap-3">
                                <label className="text-sm text-gray-400">SSL Verification</label>
                                <button
                                    onClick={() => updateConfig('sslVerify', !config.sslVerify)}
                                    className={`w-10 h-5 rounded-full transition-all ${config.sslVerify !== false ? 'bg-violet-500' : 'bg-slate-700'}`}
                                >
                                    <div className={`w-4 h-4 rounded-full bg-white transition-all transform ${config.sslVerify !== false ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                </button>
                            </div>
                        </div>

                        {/* Schedule Test */}
                        <div className="pt-4 border-t border-white/5">
                            <div className="flex items-center gap-3 mb-4">
                                <Clock size={18} className="text-violet-400" />
                                <span className="font-medium text-white">Schedule Test</span>
                                <button
                                    onClick={() => updateConfig('scheduleTest', !config.scheduleTest)}
                                    className={`w-10 h-5 rounded-full transition-all ${config.scheduleTest ? 'bg-violet-500' : 'bg-slate-700'}`}
                                >
                                    <div className={`w-4 h-4 rounded-full bg-white transition-all transform ${config.scheduleTest ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                </button>
                            </div>

                            {config.scheduleTest && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InputField
                                        label="Schedule Date & Time"
                                        type="datetime-local"
                                        value={config.scheduleTime || ''}
                                        onChange={(v) => updateConfig('scheduleTime', v)}
                                    />
                                    <SelectField
                                        label="Repeat"
                                        value={config.scheduleRepeat || 'once'}
                                        onChange={(v) => updateConfig('scheduleRepeat', v)}
                                        options={[
                                            { value: 'once', label: 'Run Once' },
                                            { value: 'daily', label: 'Daily' },
                                            { value: 'weekly', label: 'Weekly' },
                                            { value: 'monthly', label: 'Monthly' }
                                        ]}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Selected APIs Summary */}
            {selectedApis.length > 0 && (
                <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                    <p className="text-sm text-gray-400 mb-2">
                        This configuration will be applied to <span className="text-violet-400 font-medium">{selectedApis.length}</span> selected API{selectedApis.length !== 1 ? 's' : ''}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {selectedApis.slice(0, 5).map(api => (
                            <span key={api.id} className="px-2 py-1 rounded text-xs bg-slate-700 text-gray-300 font-mono">
                                {api.method} {api.endpoint}
                            </span>
                        ))}
                        {selectedApis.length > 5 && (
                            <span className="px-2 py-1 rounded text-xs bg-slate-700 text-gray-400">
                                +{selectedApis.length - 5} more
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
