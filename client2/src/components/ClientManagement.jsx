import React, { useState } from 'react';
import { X, Building2, Plus, Trash2, Edit2, Globe, Save, AlertCircle } from 'lucide-react';
import { useClient } from '../context/ClientContext';

export default function ClientManagement({ isOpen, onClose }) {
    const { clients, activeClient, addClient, updateClient, deleteClient, switchClient } = useClient();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        baseUrl: '',
        description: ''
    });

    const resetForm = () => {
        setFormData({ name: '', baseUrl: '', description: '' });
        setIsAdding(false);
        setEditingId(null);
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.name.trim()) {
            setError('Client name is required');
            return;
        }

        try {
            if (editingId) {
                await updateClient(editingId, formData);
            } else {
                await addClient(formData);
            }
            resetForm();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleEdit = (client) => {
        setFormData({
            name: client.name,
            baseUrl: client.baseUrl || '',
            description: client.description || ''
        });
        setEditingId(client.id);
        setIsAdding(true);
    };

    const handleDelete = async (clientId) => {
        if (window.confirm('Are you sure you want to delete this client? All history will remain but won\'t be filterable by this client.')) {
            try {
                await deleteClient(clientId);
            } catch (err) {
                setError(err.message);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-500/20 rounded-xl">
                            <Building2 className="w-5 h-5 text-violet-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Client Management</h2>
                            <p className="text-sm text-gray-400">Manage your testing clients/projects</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {/* Error Message */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Add/Edit Form */}
                    {isAdding ? (
                        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-slate-800/50 rounded-xl border border-white/5">
                            <h3 className="text-white font-medium mb-4">
                                {editingId ? 'Edit Client' : 'Add New Client'}
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Client Name *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g., Betway Tanzania"
                                        className="w-full px-4 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Base URL</label>
                                    <input
                                        type="url"
                                        value={formData.baseUrl}
                                        onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                                        placeholder="https://example.com"
                                        className="w-full px-4 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Brief description of this client/project"
                                        rows={2}
                                        className="w-full px-4 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 resize-none"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="submit"
                                        className="flex items-center gap-2 px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition-colors"
                                    >
                                        <Save className="w-4 h-4" />
                                        {editingId ? 'Update' : 'Add Client'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="px-4 py-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </form>
                    ) : (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="w-full flex items-center justify-center gap-2 p-4 mb-6 border-2 border-dashed border-white/10 rounded-xl text-gray-400 hover:text-violet-400 hover:border-violet-500/30 transition-all"
                        >
                            <Plus className="w-5 h-5" />
                            <span>Add New Client</span>
                        </button>
                    )}

                    {/* Client List */}
                    <div className="space-y-3">
                        {clients.map((client) => (
                            <div
                                key={client.id}
                                className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                                    activeClient === client.id
                                        ? 'bg-violet-500/10 border-violet-500/30'
                                        : 'bg-slate-800/30 border-white/5 hover:border-white/10'
                                }`}
                            >
                                <div className={`p-2 rounded-lg ${
                                    activeClient === client.id ? 'bg-violet-500/20' : 'bg-slate-700/50'
                                }`}>
                                    <Building2 className={`w-5 h-5 ${
                                        activeClient === client.id ? 'text-violet-400' : 'text-gray-400'
                                    }`} />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-white font-medium truncate">{client.name}</h4>
                                        {activeClient === client.id && (
                                            <span className="px-2 py-0.5 bg-violet-500/20 text-violet-400 text-xs rounded-full font-medium">
                                                Active
                                            </span>
                                        )}
                                    </div>
                                    {client.baseUrl && (
                                        <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                                            <Globe className="w-3 h-3" />
                                            <span className="truncate">{client.baseUrl}</span>
                                        </div>
                                    )}
                                    {client.description && (
                                        <p className="text-gray-500 text-sm mt-1 truncate">{client.description}</p>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    {activeClient !== client.id && (
                                        <button
                                            onClick={() => switchClient(client.id)}
                                            className="px-3 py-1.5 text-sm text-violet-400 hover:bg-violet-500/20 rounded-lg transition-all"
                                        >
                                            Switch
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleEdit(client)}
                                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    {client.id !== 'default' && (
                                        <button
                                            onClick={() => handleDelete(client.id)}
                                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 bg-slate-800/30">
                    <p className="text-xs text-gray-500 text-center">
                        Test history is automatically tagged with the active client for filtering
                    </p>
                </div>
            </div>
        </div>
    );
}
