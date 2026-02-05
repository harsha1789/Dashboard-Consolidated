import React, { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Globe, Monitor, Smartphone, Tablet, ArrowLeft, Loader2, Image as ImageIcon, RefreshCw } from 'lucide-react';
import * as visualApi from '../../api/visualApi';

export default function VisualBaselineManager({ onBack }) {
    const [domain, setDomain] = useState('');
    const [baselines, setBaselines] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRefs = useRef({});

    // Form state
    const [routeName, setRouteName] = useState('home');
    const [viewport, setViewport] = useState('Desktop');
    const [file, setFile] = useState(null);

    const loadBaselines = async () => {
        if (!domain) return;
        setLoading(true);
        setError(null);
        try {
            const data = await visualApi.getBaselines(domain);
            setBaselines(data);
        } catch (err) {
            setError('Failed to load baselines');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (domain) {
                let sanitizedDomain = domain;
                try {
                    if (domain.includes('://')) {
                        sanitizedDomain = new URL(domain).hostname;
                        setDomain(sanitizedDomain);
                    }
                } catch (e) { }
                loadBaselines();
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [domain]);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file || !domain || !routeName || !viewport) {
            alert('Please fill all fields');
            return;
        }

        setUploading(true);
        try {
            await visualApi.uploadBaseline(domain, routeName, viewport, file);
            setFile(null);
            e.target.reset();
            loadBaselines();
        } catch (err) {
            alert('Upload failed: ' + (err.response?.data?.error || err.message));
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (filename) => {
        if (!window.confirm('Delete this baseline?')) return;
        try {
            await visualApi.deleteBaseline(domain, filename);
            loadBaselines();
        } catch (err) {
            alert('Delete failed');
        }
    };

    const handleReplace = (filename) => {
        if (fileInputRefs.current[filename]) {
            fileInputRefs.current[filename].click();
        }
    };

    const handleReplaceFile = async (filename, file) => {
        if (!file) return;

        const parts = filename.replace('-fullpage.png', '').split('-');
        const viewport = parts[parts.length - 1];
        const routeName = parts.slice(0, -1).join('-');

        setUploading(true);
        try {
            await visualApi.uploadBaseline(domain, routeName, viewport, file);
            loadBaselines();
        } catch (err) {
            alert('Replace failed: ' + (err.response?.data?.error || err.message));
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="p-6">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-400 mb-6 hover:text-violet-400 transition">
                <ArrowLeft size={20} /> Back to Visual Testing
            </button>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar: Upload Form */}
                <div className="lg:w-1/3">
                    <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-white/10 sticky top-6">
                        <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                            <Upload className="text-violet-400" /> Upload Baseline
                        </h2>

                        <form onSubmit={handleUpload} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Domain</label>
                                <input
                                    type="text"
                                    placeholder="Enter domain or website URL"
                                    value={domain}
                                    onChange={(e) => setDomain(e.target.value)}
                                    className="w-full p-2 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 text-sm"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Route Name</label>
                                <input
                                    type="text"
                                    placeholder="home, about, etc."
                                    value={routeName}
                                    onChange={(e) => setRouteName(e.target.value)}
                                    className="w-full p-2 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 text-sm"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Viewport</label>
                                <select
                                    value={viewport}
                                    onChange={(e) => setViewport(e.target.value)}
                                    className="w-full p-2 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 text-sm"
                                >
                                    <option value="Desktop">Desktop (1920x1080)</option>
                                    <option value="Tablet">Tablet (768x1024)</option>
                                    <option value="Mobile">Mobile (375x667)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Image File</label>
                                <input
                                    type="file"
                                    accept="image/png"
                                    onChange={(e) => setFile(e.target.files[0])}
                                    className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-violet-500/20 file:text-violet-400 hover:file:bg-violet-500/30 file:cursor-pointer"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={uploading || !domain}
                                className="w-full bg-gradient-to-r from-violet-500 to-purple-500 text-white py-2 rounded-xl font-semibold hover:from-violet-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                            >
                                {uploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                                {uploading ? 'Uploading...' : 'Save Baseline'}
                            </button>
                        </form>

                        <div className="mt-6 p-4 bg-amber-500/10 rounded-xl border border-amber-500/20 italic text-xs text-amber-400">
                            Note: Uploaded images will be used as the new ground truth for visual comparisons.
                        </div>
                    </div>
                </div>

                {/* Main Content: Baseline List */}
                <div className="lg:w-2/3">
                    <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-white/10 min-h-[500px]">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <ImageIcon className="text-gray-400" /> Existing Baselines
                            </h2>
                            {domain && (
                                <span className="bg-slate-900/50 text-gray-400 px-3 py-1 rounded-full text-xs font-mono border border-white/10">
                                    {domain}
                                </span>
                            )}
                        </div>

                        {!domain ? (
                            <div className="flex flex-col items-center justify-center h-80 text-gray-500">
                                <Globe size={48} className="mb-4 opacity-20" />
                                <p>Enter a domain to manage its baselines</p>
                            </div>
                        ) : loading ? (
                            <div className="flex justify-center items-center h-80">
                                <Loader2 className="animate-spin text-violet-400" size={32} />
                            </div>
                        ) : baselines.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-80 text-gray-500">
                                <ImageIcon size={48} className="mb-4 opacity-20" />
                                <p>No baselines found for this domain</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {baselines.map((bl) => (
                                    <div key={bl.filename} className="group relative bg-slate-900/50 border border-white/10 rounded-xl overflow-hidden hover:border-violet-500/30 transition">
                                        <div className="aspect-video bg-slate-950 overflow-hidden">
                                            <img
                                                src={visualApi.getScreenshotUrl(bl.path)}
                                                alt={bl.filename}
                                                className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                                onClick={() => window.open(visualApi.getScreenshotUrl(bl.path), '_blank')}
                                            />
                                        </div>
                                        <div className="p-3 flex justify-between items-center">
                                            <div className="truncate pr-2">
                                                <div className="text-sm font-bold truncate text-white">{bl.filename}</div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {bl.filename.includes('desktop') ? <Monitor size={12} className="text-gray-500" /> :
                                                        bl.filename.includes('tablet') ? <Tablet size={12} className="text-gray-500" /> :
                                                            <Smartphone size={12} className="text-gray-500" />}
                                                    <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                                                        {bl.filename.split('-')[1]}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <input
                                                    ref={el => fileInputRefs.current[bl.filename] = el}
                                                    type="file"
                                                    accept="image/png"
                                                    onChange={(e) => handleReplaceFile(bl.filename, e.target.files[0])}
                                                    className="hidden"
                                                />
                                                <button
                                                    onClick={() => handleReplace(bl.filename)}
                                                    className="p-2 text-gray-500 hover:text-violet-400 hover:bg-violet-500/10 rounded-full transition-colors"
                                                    title="Replace baseline"
                                                    disabled={uploading}
                                                >
                                                    <RefreshCw size={16} className={uploading ? 'animate-spin' : ''} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(bl.filename)}
                                                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors"
                                                    title="Delete baseline"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
