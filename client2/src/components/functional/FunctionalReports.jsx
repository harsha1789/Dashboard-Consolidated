import React from 'react';
import { FileText, Camera, Download } from 'lucide-react';

export default function FunctionalReports({ reportKey, apiBase }) {
    return (
        <div className="flex-1 w-full h-full bg-slate-950 relative flex flex-col">
            <div className="bg-slate-900 border-b border-white/10 p-4 flex justify-between items-center shrink-0">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileText size={20} className="text-orange-400" /> Playwright Test Report
                </h2>
                <div className="flex gap-3">
                    <button
                        onClick={() => window.open(`${apiBase}/report/screenshots`, '_blank')}
                        className="px-4 py-2 bg-slate-800 border border-white/10 hover:bg-slate-700 text-white rounded-lg font-bold text-sm flex items-center gap-2 transition-all active:scale-95"
                    >
                        <Camera size={16} className="text-red-400" /> Failed Screenshots
                    </button>
                    <button
                        onClick={() => window.open(`${apiBase}/report/pdf`, '_blank')}
                        className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:shadow-lg hover:shadow-orange-500/30 text-white rounded-lg font-bold text-sm flex items-center gap-2 transition-all active:scale-95"
                    >
                        <Download size={16} /> Save as PDF
                    </button>
                </div>
            </div>
            <div className="flex-1 relative w-full bg-white">
                <iframe
                    id="functional-report-iframe"
                    key={reportKey}
                    src={`/functional-report/index.html?t=${reportKey}`}
                    className="w-full h-full border-none"
                    title="Playwright Report"
                ></iframe>
            </div>
        </div>
    );
}
