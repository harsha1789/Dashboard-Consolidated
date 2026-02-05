import React from 'react';
import { Monitor, BarChart2, Clock, FileText, Rocket, LogOut, Code, TestTube, Briefcase, Eye, FlaskConical, Shield, Zap } from 'lucide-react';

const NavItem = ({ icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all font-medium text-sm group ${active
                ? 'bg-gradient-to-r from-violet-500/20 to-indigo-500/20 text-violet-400 border border-violet-500/30'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
    >
        <div className={`p-1 rounded-md transition-all ${active ? 'bg-violet-500/20 text-violet-400' : 'text-gray-500 group-hover:text-gray-300'}`}>
            {icon}
        </div>
        {label}
    </button>
);

const roleIcons = {
    developer: Code,
    qa: TestTube,
    business: Briefcase
};

const roleLabels = {
    developer: 'Developer',
    qa: 'QA',
    business: 'Business'
};

export default function Sidebar({ activeTab, setActiveTab, isMobileMenuOpen, isRunning, user, onLogout }) {
    const RoleIcon = user ? roleIcons[user.role] || Briefcase : Briefcase;

    // Business users only see Dashboard, Statistics, History, Reports
    const isBusiness = user?.role === 'business';

    return (
        <div className={`fixed md:relative inset-y-0 left-0 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out w-64 bg-slate-900/95 md:bg-slate-900/80 backdrop-blur-xl border-r border-white/5 flex flex-col z-40`}>
            {/* Header - Compact */}
            <div className="p-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-xl blur-md opacity-50"></div>
                        <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-lg">
                            <Rocket className="w-5 h-5 text-white" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                            Automation Hub
                        </h1>
                        <p className="text-xs text-gray-500">Playwright Dashboard</p>
                    </div>
                </div>
            </div>

            {/* Navigation - Compact spacing */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                <NavItem icon={<Monitor size={18} />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                <NavItem icon={<BarChart2 size={18} />} label="Statistics" active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} />
                <NavItem icon={<Clock size={18} />} label="History" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
                <NavItem icon={<FileText size={18} />} label="Reports" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />

                {/* Testing Tabs - Hidden for Business Users */}
                {!isBusiness && (
                    <>
                        <div className="my-2 border-t border-white/10"></div>
                        <NavItem icon={<Eye size={18} />} label="Visual Testing" active={activeTab === 'visual'} onClick={() => setActiveTab('visual')} />
                        <NavItem icon={<FlaskConical size={18} />} label="Functional Testing" active={activeTab === 'functional'} onClick={() => setActiveTab('functional')} />
                        <NavItem icon={<Shield size={18} />} label="Security Testing" active={activeTab === 'security'} onClick={() => setActiveTab('security')} />
                        <NavItem icon={<Zap size={18} />} label="Load Testing" active={activeTab === 'loadtesting'} onClick={() => setActiveTab('loadtesting')} />
                    </>
                )}
            </nav>

            {/* Footer - Compact */}
            <div className="p-3 border-t border-white/5 space-y-2">
                {/* Status Indicator - Compact */}
                <div className="bg-slate-800/50 rounded-lg p-2 border border-white/5">
                    <div className="flex items-center gap-2">
                        <div className={`relative w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-500' : 'bg-gray-600'}`}>
                            {isRunning && <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping"></div>}
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-bold text-white">{isRunning ? 'Running' : 'Idle'}</p>
                        </div>
                    </div>
                    {isRunning && (
                        <div className="mt-2 w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-violet-500 to-emerald-500 animate-shimmer"></div>
                        </div>
                    )}
                </div>

                {/* User Info & Logout - Compact */}
                {user && (
                    <div className="bg-slate-800/50 rounded-lg p-2 border border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 rounded-md bg-violet-500/20 border border-violet-500/30">
                                <RoleIcon className="w-4 h-4 text-violet-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate">{user.username || roleLabels[user.role]}</p>
                                <p className="text-xs text-gray-500">{roleLabels[user.role]}</p>
                            </div>
                        </div>
                        <button
                            onClick={onLogout}
                            className="w-full flex items-center justify-center gap-2 px-2 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 rounded-md text-red-400 text-xs font-medium transition-all"
                        >
                            <LogOut size={14} />
                            Sign Out
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
