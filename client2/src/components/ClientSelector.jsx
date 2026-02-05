import React, { useState } from 'react';
import { Building2, ChevronDown, Plus, Settings, Check } from 'lucide-react';
import { useClient } from '../context/ClientContext';

export default function ClientSelector({ onManageClients }) {
    const { clients, activeClient, activeClientData, switchClient, loading } = useClient();
    const [isOpen, setIsOpen] = useState(false);

    if (loading) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-xl border border-white/10">
                <div className="w-4 h-4 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"></div>
                <span className="text-gray-400 text-sm">Loading...</span>
            </div>
        );
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-xl border border-white/10 hover:border-violet-500/30 transition-all group"
            >
                <Building2 className="w-4 h-4 text-violet-400" />
                <span className="text-white text-sm font-medium max-w-[150px] truncate">
                    {activeClientData?.name || 'Select Client'}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown */}
                    <div className="absolute top-full right-0 mt-2 w-64 bg-slate-800 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                        <div className="p-2 border-b border-white/5">
                            <p className="text-xs text-gray-500 uppercase font-bold px-2">Switch Client</p>
                        </div>

                        <div className="max-h-64 overflow-y-auto p-2">
                            {clients.map((client) => (
                                <button
                                    key={client.id}
                                    onClick={() => {
                                        switchClient(client.id);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                                        activeClient === client.id
                                            ? 'bg-violet-500/20 text-violet-400'
                                            : 'text-gray-300 hover:bg-white/5'
                                    }`}
                                >
                                    <Building2 className="w-4 h-4 flex-shrink-0" />
                                    <div className="flex-1 text-left">
                                        <p className="text-sm font-medium truncate">{client.name}</p>
                                        {client.baseUrl && (
                                            <p className="text-xs text-gray-500 truncate">{client.baseUrl}</p>
                                        )}
                                    </div>
                                    {activeClient === client.id && (
                                        <Check className="w-4 h-4 text-violet-400 flex-shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="p-2 border-t border-white/5 space-y-1">
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    onManageClients?.();
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all text-sm"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Add New Client</span>
                            </button>
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    onManageClients?.();
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all text-sm"
                            >
                                <Settings className="w-4 h-4" />
                                <span>Manage Clients</span>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
