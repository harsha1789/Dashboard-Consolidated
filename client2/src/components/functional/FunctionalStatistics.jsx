import React from 'react';
import { BarChart2, RefreshCw } from 'lucide-react';

export default function FunctionalStatistics({ run, latestRun, onBackToLatest }) {
    if (!run) {
        return (
            <div className="flex-1 flex items-center justify-center p-4 md:p-8">
                <div className="text-center">
                    <BarChart2 size={64} className="mx-auto mb-4 opacity-30 text-orange-400" />
                    <h3 className="text-lg md:text-xl font-bold text-white mb-2">No Execution Data</h3>
                    <p className="text-sm md:text-base text-gray-400">Run a test to see statistics</p>
                </div>
            </div>
        );
    }

    const isViewingHistorical = run.runId !== latestRun?.runId;

    // Construct URL for the run-specific Allure Report
    const reportUrl = `/functional-source/regions/${run.region}/reports/allure-reports/${run.runId}/index.html`;

    return (
        <div className="flex-1 flex flex-col p-0 overflow-hidden relative">
            {/* Header Overlay */}
            <div className="absolute top-4 right-4 z-10 flex gap-2">
                {isViewingHistorical && (
                    <button
                        onClick={onBackToLatest}
                        className="px-4 py-2 bg-slate-900/90 text-orange-400 rounded-xl font-bold border border-white/10 shadow-xl hover:bg-slate-800 transition-all flex items-center gap-2"
                    >
                        <RefreshCw size={16} />
                        Back to Latest
                    </button>
                )}
            </div>

            {/* Run Info Banner */}
            <div className="bg-slate-900/80 border-b border-white/10 p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={`px-3 py-1.5 rounded-lg text-sm font-bold ${
                        run.status === 'Passed'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                        {run.status}
                    </div>
                    <div className="text-gray-400 text-sm">
                        <span className="text-white font-medium">Run ID:</span> {run.runId}
                    </div>
                    <div className="text-gray-400 text-sm">
                        <span className="text-white font-medium">Region:</span> {run.region}
                    </div>
                    <div className="text-gray-400 text-sm">
                        <span className="text-white font-medium">Time:</span> {new Date(run.timestamp).toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Allure Report Iframe */}
            <div className="flex-1 w-full h-full bg-white">
                <iframe
                    src={reportUrl}
                    className="w-full h-full border-none"
                    title={`Allure Report - ${run.runId}`}
                    onError={(e) => console.error("Failed to load iframe", e)}
                />
            </div>
        </div>
    );
}
