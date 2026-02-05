import React, { useEffect, useState } from 'react';
import { FileText, Clock, ExternalLink, Trash2 } from 'lucide-react';
import * as visualApi from '../../api/visualApi';

export default function VisualReportList({ onViewReport }) {
    const [reports, setReports] = useState([]);

    useEffect(() => {
        loadReports();
    }, []);

    const loadReports = async () => {
        try {
            const data = await visualApi.getReports();
            setReports(data);
        } catch (err) {
            console.error('Failed to load reports', err);
        }
    };

    const handleDelete = async (reportId, reportSite) => {
        if (!window.confirm(`Are you sure you want to delete the report for "${reportSite}"? This action cannot be undone.`)) {
            return;
        }

        try {
            await visualApi.deleteReport(reportId);
            alert('Report deleted successfully');
            loadReports();
        } catch (error) {
            console.error('Delete failed:', error);
            alert('Failed to delete report');
        }
    };

    // Expose refresh method
    React.useEffect(() => {
        window.refreshVisualReports = loadReports;
        return () => {
            delete window.refreshVisualReports;
        };
    }, []);

    return (
        <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-white/10">
            <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                <FileText className="text-violet-400" /> Recent Reports
            </h2>
            <div className="space-y-4">
                {reports.length === 0 ? (
                    <p className="text-gray-500">No reports found. Run a visual test to generate reports.</p>
                ) : (
                    reports.map((report) => (
                        <div key={report.id} className="bg-slate-900/50 border border-white/5 p-4 rounded-xl hover:bg-slate-900/70 transition">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-semibold text-lg text-violet-400">{report.site}</h3>
                                    <p className="text-gray-500 text-sm mt-1">{report.url}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => onViewReport(report.id)}
                                        className="bg-slate-700/50 text-gray-300 px-3 py-1.5 rounded-lg hover:bg-slate-600/50 text-sm flex items-center gap-1 border border-white/10 transition"
                                    >
                                        View <ExternalLink size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(report.id, report.site)}
                                        className="bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/20 text-sm flex items-center gap-1 border border-red-500/20 transition"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex gap-4 mt-3 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                    <Clock size={14} />
                                    {new Date(report.timestamp).toLocaleString()}
                                </span>
                                <span>Duration: {report.duration}</span>
                                <span>Routes: {report.results?.length || report.tests?.length || 0}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
