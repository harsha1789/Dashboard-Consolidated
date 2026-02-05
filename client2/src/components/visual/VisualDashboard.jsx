import React, { useState } from 'react';
import { Eye, Image, Settings } from 'lucide-react';
import VisualTestForm from './VisualTestForm';
import VisualReportList from './VisualReportList';
import VisualReportDetail from './VisualReportDetail';
import VisualBaselineManager from './VisualBaselineManager';

export default function VisualDashboard() {
    const [view, setView] = useState('main'); // 'main', 'report', 'baselines'
    const [selectedReportId, setSelectedReportId] = useState(null);

    const handleViewReport = (reportId) => {
        setSelectedReportId(reportId);
        setView('report');
    };

    const handleBackToMain = () => {
        setView('main');
        setSelectedReportId(null);
        // Refresh report list
        if (window.refreshVisualReports) {
            window.refreshVisualReports();
        }
    };

    const handleTestComplete = () => {
        // Refresh report list after test completes
        if (window.refreshVisualReports) {
            window.refreshVisualReports();
        }
    };

    // Main view with test form and reports
    if (view === 'main') {
        return (
            <div className="flex-1 overflow-y-auto p-6 md:p-8 pt-14">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                                    <Eye className="w-6 h-6 text-purple-400" />
                                </div>
                                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-rose-400 bg-clip-text text-transparent">
                                    Visual Testing
                                </h1>
                            </div>
                            <p className="text-gray-400 text-sm">Pixel-perfect UI regression testing across viewports</p>
                        </div>
                        <button
                            onClick={() => setView('baselines')}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-white/10 rounded-xl text-gray-300 hover:text-white transition"
                        >
                            <Image size={18} />
                            <span className="hidden sm:inline">Manage Baselines</span>
                        </button>
                    </div>
                </div>

                {/* Test Form */}
                <VisualTestForm onTestComplete={handleTestComplete} />

                {/* Report List */}
                <VisualReportList onViewReport={handleViewReport} />
            </div>
        );
    }

    // Report detail view
    if (view === 'report' && selectedReportId) {
        return (
            <div className="flex-1 overflow-y-auto">
                <VisualReportDetail reportId={selectedReportId} onBack={handleBackToMain} />
            </div>
        );
    }

    // Baseline manager view
    if (view === 'baselines') {
        return (
            <div className="flex-1 overflow-y-auto">
                <VisualBaselineManager onBack={handleBackToMain} />
            </div>
        );
    }

    return null;
}
