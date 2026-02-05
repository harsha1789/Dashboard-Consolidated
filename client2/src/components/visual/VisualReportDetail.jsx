import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle, Download, Trash2 } from 'lucide-react';
import * as visualApi from '../../api/visualApi';

export default function VisualReportDetail({ reportId, onBack }) {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const data = await visualApi.getReport(reportId);
                setReport(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [reportId]);

    const handleDownload = async () => {
        try {
            const blob = await visualApi.downloadReport(reportId);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `report-${reportId}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Download failed:', error);
            alert('Failed to download report');
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
            return;
        }

        try {
            await visualApi.deleteReport(reportId);
            alert('Report deleted successfully');
            onBack();
        } catch (error) {
            console.error('Delete failed:', error);
            alert('Failed to delete report');
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>;
    if (!report) return <div className="p-8 text-center text-red-400">Report not found</div>;

    return (
        <div className="p-6">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-400 mb-6 hover:text-violet-400 transition">
                <ArrowLeft size={20} /> Back to Reports
            </button>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden mb-8">
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-8 border-b border-white/10">
                    <div className="flex justify-between items-start mb-2">
                        <h1 className="text-3xl font-bold text-white">{report.site}</h1>
                        <div className="flex gap-2">
                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-2 bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 px-4 py-2 rounded-xl border border-violet-500/30 transition"
                            >
                                <Download size={18} />
                                Download
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-xl border border-red-500/30 transition"
                            >
                                <Trash2 size={18} />
                                Delete
                            </button>
                        </div>
                    </div>
                    <p className="text-gray-400 mb-4">{report.url}</p>
                    <div className="flex gap-4">
                        <span className="bg-white/10 px-3 py-1 rounded-full text-sm text-gray-300">
                            {new Date(report.timestamp).toLocaleString()}
                        </span>
                        <span className="bg-white/10 px-3 py-1 rounded-full text-sm text-gray-300">
                            Duration: {report.duration}
                        </span>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-slate-900/50 border-b border-white/5">
                    <StatCard label="Routes Tested" value={report.results.length} />
                    <StatCard label="Total Viewports" value={report.results.reduce((acc, r) => acc + (r.viewports?.length || 0), 0)} />
                    <StatCard label="Screenshots" value={report.results.reduce((acc, r) => {
                        return acc + (r.viewports?.reduce((sum, vp) => sum + 1 + (vp.components?.length || 0), 0) || 0);
                    }, 0)} />
                    <StatCard label="Components" value={report.results.reduce((acc, r) => {
                        return acc + (r.viewports?.reduce((sum, vp) => sum + (vp.components?.length || 0), 0) || 0);
                    }, 0)} />
                </div>
            </div>

            {/* Visual Tests Section */}
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <CheckCircle className="text-violet-400" /> Comparison Results
            </h2>
            <div className="flex flex-col gap-8 mb-12">
                {report.results.map((result, index) => (
                    <div key={index} className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
                        <div className="p-4 border-b border-white/10 bg-slate-900/50">
                            <h3 className="font-bold text-white text-lg">{result.route}</h3>
                        </div>

                        <div className="p-4 space-y-8">
                            {/* Viewport Results */}
                            {result.viewports?.map((vpResult, vpIdx) => (
                                <div key={vpIdx} className="border border-white/10 rounded-xl p-4 bg-slate-900/30">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="text-2xl">
                                            {vpResult.viewport === 'Desktop' ? '🖥️' : vpResult.viewport === 'Tablet' ? '📱' : '📱'}
                                        </span>
                                        <div>
                                            <h4 className="font-bold text-white">{vpResult.viewport}</h4>
                                            <span className="text-xs text-gray-500">{vpResult.width} × {vpResult.height}</span>
                                        </div>
                                    </div>

                                    {/* Full Page Result */}
                                    {vpResult.fullPage && (
                                        <ComparisonBlock
                                            title="Full Page Scan"
                                            data={vpResult.fullPage}
                                            isMain={true}
                                        />
                                    )}

                                    {/* Component Results */}
                                    {vpResult.components?.length > 0 && (
                                        <div className="border-t border-white/10 mt-4 pt-4">
                                            <h5 className="font-bold text-gray-300 mb-4 flex items-center gap-2">
                                                <span className="w-2 h-6 bg-violet-500 rounded-sm"></span>
                                                Component Analysis
                                            </h5>
                                            <div className="grid grid-cols-1 gap-6">
                                                {vpResult.components.map((comp, idx) => (
                                                    <ComparisonBlock key={idx} title={comp.name} data={comp} />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Legacy format support */}
                            {!result.viewports && result.fullPage && (
                                <>
                                    <ComparisonBlock
                                        title="Full Page Scan"
                                        data={result.fullPage}
                                        isMain={true}
                                    />
                                    {result.components?.length > 0 && (
                                        <div className="border-t border-white/10 pt-4">
                                            <h4 className="font-bold text-gray-300 mb-4 flex items-center gap-2">
                                                <span className="w-2 h-6 bg-violet-500 rounded-sm"></span>
                                                Component Analysis
                                            </h4>
                                            <div className="grid grid-cols-1 gap-6">
                                                {result.components.map((comp, idx) => (
                                                    <ComparisonBlock key={idx} title={comp.name} data={comp} />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {result.error && (
                            <div className="p-4 bg-red-500/10 text-red-400 border-t border-red-500/20">
                                Error: {result.error}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function ComparisonBlock({ title, data, isMain = false }) {
    if (!data) return null;

    const statusColor =
        data.status === 'pass' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
            data.status === 'fail' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                data.status.includes('baseline') ? 'bg-violet-500/20 text-violet-400 border-violet-500/30' :
                    'bg-slate-700/50 text-gray-400 border-white/10';

    return (
        <div className={`rounded-xl ${isMain ? 'bg-slate-900/50 p-4 border border-white/10' : 'bg-slate-800/30'}`}>
            <div className="flex justify-between items-center mb-3">
                <h5 className={`font-semibold ${isMain ? 'text-xl text-white' : 'text-lg text-gray-300'}`}>{title}</h5>
                <div className="flex items-center gap-3">
                    {data.accuracy && (
                        <div className="text-sm font-mono text-gray-400 flex flex-col items-end">
                            <span>Accuracy: <strong className="text-emerald-400">{data.accuracy}%</strong></span>
                            {data.totalPixels && (
                                <span className="text-xs text-gray-500">
                                    {data.matchingPixels?.toLocaleString()} / {data.totalPixels?.toLocaleString()} pixels match
                                </span>
                            )}
                            {data.diffPixels > 0 && (
                                <span className="text-xs text-red-400">
                                    {data.diffPixels?.toLocaleString()} pixels differ
                                </span>
                            )}
                        </div>
                    )}
                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase border ${statusColor}`}>
                        {data.status.replace('_', ' ')}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Imagebox label="BASELINE" src={data.baseline} />
                <Imagebox label="CURRENT" src={data.current} />
                <Imagebox label="DIFF" src={data.diff} isDiff={true} status={data.status} />
            </div>
        </div>
    );
}

function Imagebox({ label, src, isDiff = false, status }) {
    if (!src && isDiff && status?.includes('baseline')) {
        return (
            <div className="border border-dashed border-white/20 rounded-xl h-40 flex items-center justify-center bg-slate-900/50 text-gray-500 text-sm">
                Baseline Created
            </div>
        );
    }

    if (!src) return <div className="h-40 bg-slate-900/50 rounded-xl border border-white/10"></div>;

    return (
        <div>
            <div className="text-xs text-center text-gray-500 mb-1 uppercase tracking-wider">{label}</div>
            <div className="border border-white/10 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition bg-slate-900/50">
                <img
                    src={visualApi.getScreenshotUrl(src)}
                    alt={label}
                    className="w-full h-auto cursor-pointer hover:scale-[1.02] transition-transform duration-200"
                    onClick={() => window.open(visualApi.getScreenshotUrl(src), '_blank')}
                />
            </div>
        </div>
    );
}

function StatCard({ label, value }) {
    return (
        <div className="bg-slate-800/50 p-4 rounded-xl text-center border border-white/5">
            <div className="text-2xl font-bold text-white">{value}</div>
            <div className="text-xs text-uppercase text-gray-500 font-semibold">{label}</div>
        </div>
    );
}
