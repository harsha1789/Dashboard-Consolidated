import React, { useState } from 'react';
import { Rocket, Lock, ChevronDown, AlertCircle, Code, TestTube, Briefcase } from 'lucide-react';

// Password for all profiles
const PASSWORD = 'Zensar';

const profiles = [
    { id: 'developer', label: 'Developer', icon: Code, description: 'Full access to all features' },
    { id: 'qa', label: 'QA', icon: TestTube, description: 'Test execution and reporting' },
    { id: 'business', label: 'Business', icon: Briefcase, description: 'View reports and analytics' }
];

export default function Login({ onLogin }) {
    const [selectedProfile, setSelectedProfile] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!selectedProfile) {
            setError('Please select a profile');
            return;
        }

        if (!password) {
            setError('Please enter password');
            return;
        }

        setIsLoading(true);

        // Validate password
        if (password === PASSWORD) {
            const profileData = profiles.find(p => p.id === selectedProfile);
            onLogin({
                username: profileData.label,
                role: selectedProfile,
                timestamp: new Date().toISOString(),
                isRegisteredUser: false
            });
        } else {
            setError('Invalid password');
            setIsLoading(false);
        }
    };

    const selectedProfileData = profiles.find(p => p.id === selectedProfile);

    return (
        <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 -left-40 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl animate-blob"></div>
                <div className="absolute top-0 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-40 left-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
            </div>

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-sm">
                {/* Logo Section */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center mb-3">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-2xl blur-lg opacity-50"></div>
                            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-xl">
                                <Rocket className="w-7 h-7 text-white" />
                            </div>
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
                        Automation Hub
                    </h1>
                    <p className="text-gray-400 mt-1 text-sm">Select your profile to continue</p>
                </div>

                {/* Login Form */}
                <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Profile Selector */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Select Profile
                            </label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className={`w-full p-3 bg-slate-800/50 border rounded-xl text-left flex items-center justify-between transition-all ${
                                        isDropdownOpen
                                            ? 'border-violet-500/50 ring-2 ring-violet-500/20'
                                            : 'border-white/10 hover:border-white/20'
                                    }`}
                                >
                                    {selectedProfileData ? (
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-violet-500/20">
                                                <selectedProfileData.icon className="w-5 h-5 text-violet-400" />
                                            </div>
                                            <div>
                                                <p className="text-white font-medium">{selectedProfileData.label}</p>
                                                <p className="text-xs text-gray-500">{selectedProfileData.description}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-gray-500">Choose your profile...</span>
                                    )}
                                    <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Dropdown Menu */}
                                {isDropdownOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-white/10 rounded-xl overflow-hidden shadow-xl z-20">
                                        {profiles.map((profile) => (
                                            <button
                                                key={profile.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedProfile(profile.id);
                                                    setIsDropdownOpen(false);
                                                    setError('');
                                                }}
                                                className={`w-full p-3 flex items-center gap-3 hover:bg-slate-700/50 transition-colors ${
                                                    selectedProfile === profile.id ? 'bg-violet-500/10' : ''
                                                }`}
                                            >
                                                <div className={`p-2 rounded-lg ${
                                                    selectedProfile === profile.id ? 'bg-violet-500/20' : 'bg-slate-700/50'
                                                }`}>
                                                    <profile.icon className={`w-5 h-5 ${
                                                        selectedProfile === profile.id ? 'text-violet-400' : 'text-gray-400'
                                                    }`} />
                                                </div>
                                                <div className="text-left">
                                                    <p className={`font-medium ${
                                                        selectedProfile === profile.id ? 'text-violet-400' : 'text-white'
                                                    }`}>{profile.label}</p>
                                                    <p className="text-xs text-gray-500">{profile.description}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Password Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="w-5 h-5 text-gray-500" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setError('');
                                    }}
                                    placeholder="Enter password"
                                    className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
                                />
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 bg-gradient-to-r from-violet-500 to-indigo-500 text-white font-semibold rounded-xl hover:from-violet-600 hover:to-indigo-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/25 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Signing in...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-4 pt-4 border-t border-white/5 text-center">
                        <p className="text-xs text-gray-500">
                            Automation Hub v2.0 | Playwright Dashboard
                        </p>
                    </div>
                </div>

                {/* Quick Profile Selection */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                    {profiles.map((profile) => (
                        <button
                            key={profile.id}
                            type="button"
                            className={`p-2 rounded-xl border text-center transition-all ${
                                selectedProfile === profile.id
                                    ? 'bg-violet-500/10 border-violet-500/30'
                                    : 'bg-slate-900/50 border-white/5 hover:border-white/10'
                            }`}
                            onClick={() => {
                                setSelectedProfile(profile.id);
                                setError('');
                            }}
                        >
                            <profile.icon className={`w-4 h-4 mx-auto mb-1 ${
                                selectedProfile === profile.id ? 'text-violet-400' : 'text-gray-500'
                            }`} />
                            <p className={`text-xs font-medium ${
                                selectedProfile === profile.id ? 'text-violet-400' : 'text-gray-400'
                            }`}>{profile.label}</p>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
