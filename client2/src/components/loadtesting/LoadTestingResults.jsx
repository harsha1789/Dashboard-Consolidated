import React, { useState, useRef } from 'react';
import { BarChart3, Clock, AlertTriangle, CheckCircle, TrendingUp, TrendingDown, Activity, Server, Download, RefreshCw, Zap, FileText, FileJson, FileSpreadsheet, ChevronDown, X } from 'lucide-react';

// Export Report Modal Component
const ExportReportModal = ({ results, config, onClose }) => {
    const [exporting, setExporting] = useState(false);
    const [selectedFormat, setSelectedFormat] = useState('html');

    const { summary, timeline, apiResults, bottlenecks } = results;
    const testDate = new Date().toLocaleString();

    const generateHTMLReport = () => {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Load Test Report - ${testDate}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #e2e8f0; line-height: 1.6; }
        .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 40px; padding: 40px; background: linear-gradient(135deg, #7c3aed20 0%, #a855f720 100%); border-radius: 16px; border: 1px solid #7c3aed30; }
        .header h1 { font-size: 2.5rem; color: #fff; margin-bottom: 10px; }
        .header p { color: #94a3b8; font-size: 1.1rem; }
        .header .date { color: #a78bfa; font-weight: 600; margin-top: 15px; }
        .section { background: #1e293b; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #334155; }
        .section-title { font-size: 1.25rem; font-weight: 600; color: #fff; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
        .section-title::before { content: ''; width: 4px; height: 24px; background: linear-gradient(to bottom, #7c3aed, #a855f7); border-radius: 2px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
        .metric-card { background: #0f172a; border-radius: 12px; padding: 20px; border: 1px solid #334155; }
        .metric-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 8px; }
        .metric-value { font-size: 2rem; font-weight: 700; color: #fff; }
        .metric-unit { font-size: 0.875rem; color: #64748b; margin-left: 4px; }
        .metric-value.success { color: #22c55e; }
        .metric-value.error { color: #ef4444; }
        .metric-value.warning { color: #f59e0b; }
        .metric-value.info { color: #8b5cf6; }
        .table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        .table th, .table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #334155; }
        .table th { background: #0f172a; color: #94a3b8; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
        .table tr:hover { background: #334155; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
        .badge.get { background: #22c55e20; color: #22c55e; }
        .badge.post { background: #3b82f620; color: #3b82f6; }
        .badge.put { background: #f59e0b20; color: #f59e0b; }
        .badge.delete { background: #ef444420; color: #ef4444; }
        .badge.healthy { background: #22c55e20; color: #22c55e; }
        .badge.degraded { background: #f59e0b20; color: #f59e0b; }
        .badge.high { background: #ef444420; color: #ef4444; }
        .badge.medium { background: #f59e0b20; color: #f59e0b; }
        .bottleneck { background: #0f172a; border-radius: 8px; padding: 16px; margin-bottom: 12px; border-left: 4px solid #f59e0b; }
        .bottleneck.high { border-left-color: #ef4444; }
        .recommendation { display: flex; align-items: flex-start; gap: 12px; padding: 12px 0; border-bottom: 1px solid #334155; }
        .recommendation:last-child { border-bottom: none; }
        .recommendation-icon { width: 20px; height: 20px; background: #22c55e; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .recommendation-icon::after { content: '✓'; color: #fff; font-size: 12px; }
        .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin-top: 16px; }
        .summary-item { text-align: center; }
        .summary-label { font-size: 0.875rem; color: #64748b; }
        .summary-value { font-size: 1.25rem; font-weight: 600; color: #fff; }
        .chart-placeholder { background: #0f172a; border-radius: 8px; padding: 20px; margin: 16px 0; }
        .chart-bar { display: flex; align-items: flex-end; gap: 2px; height: 100px; }
        .chart-bar div { flex: 1; background: linear-gradient(to top, #7c3aed, #a855f7); border-radius: 2px 2px 0 0; opacity: 0.8; }
        .footer { text-align: center; margin-top: 40px; padding: 20px; color: #64748b; font-size: 0.875rem; }
        .status-passed { color: #22c55e; font-weight: 600; }
        .status-failed { color: #ef4444; font-weight: 600; }
        @media print { body { background: #fff; color: #000; } .section { border: 1px solid #ddd; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Load Test Performance Report</h1>
            <p>Comprehensive analysis of API performance under load</p>
            <p class="date">Generated: ${testDate}</p>
        </div>

        <!-- Executive Summary -->
        <div class="section">
            <h2 class="section-title">Executive Summary</h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-label">Total Requests</div>
                    <div class="metric-value info">${summary.totalRequests.toLocaleString()}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Successful Requests</div>
                    <div class="metric-value success">${summary.successfulRequests.toLocaleString()}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Failed Requests</div>
                    <div class="metric-value error">${summary.failedRequests.toLocaleString()}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Error Rate</div>
                    <div class="metric-value ${summary.errorRate > 2 ? 'error' : 'success'}">${summary.errorRate.toFixed(2)}<span class="metric-unit">%</span></div>
                </div>
            </div>
        </div>

        <!-- Test Configuration -->
        <div class="section">
            <h2 class="section-title">Test Configuration</h2>
            <div class="summary-grid">
                <div class="summary-item">
                    <div class="summary-label">Duration</div>
                    <div class="summary-value">${summary.duration} seconds</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Virtual Users</div>
                    <div class="summary-value">${summary.peakVUs} users</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Target RPS</div>
                    <div class="summary-value">${config?.requestsPerSecond || 'N/A'}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Test Status</div>
                    <div class="summary-value ${summary.errorRate < 2 ? 'status-passed' : 'status-failed'}">${summary.errorRate < 2 ? 'PASSED' : 'DEGRADED'}</div>
                </div>
            </div>
        </div>

        <!-- Response Time Analysis -->
        <div class="section">
            <h2 class="section-title">Response Time Analysis</h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-label">Average Response Time</div>
                    <div class="metric-value">${summary.avgResponseTime}<span class="metric-unit">ms</span></div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">P95 Response Time</div>
                    <div class="metric-value warning">${summary.p95ResponseTime}<span class="metric-unit">ms</span></div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">P99 Response Time</div>
                    <div class="metric-value warning">${summary.p99ResponseTime}<span class="metric-unit">ms</span></div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Throughput</div>
                    <div class="metric-value info">${summary.throughput}<span class="metric-unit">req/s</span></div>
                </div>
            </div>
            <div class="chart-placeholder">
                <div class="metric-label" style="margin-bottom: 12px;">Response Time Distribution</div>
                <div class="chart-bar">
                    ${timeline.map(t => `<div style="height: ${(t.responseTime / 400) * 100}%"></div>`).join('')}
                </div>
            </div>
        </div>

        <!-- Per-API Performance -->
        <div class="section">
            <h2 class="section-title">Per-API Performance</h2>
            <table class="table">
                <thead>
                    <tr>
                        <th>Method</th>
                        <th>Endpoint</th>
                        <th>Requests</th>
                        <th>Avg Time</th>
                        <th>P95 Time</th>
                        <th>Errors</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${apiResults.map(api => `
                    <tr>
                        <td><span class="badge ${api.method.toLowerCase()}">${api.method}</span></td>
                        <td style="font-family: monospace; font-size: 0.875rem;">${api.endpoint}</td>
                        <td>${api.requests.toLocaleString()}</td>
                        <td>${api.avgTime}ms</td>
                        <td>${api.p95Time}ms</td>
                        <td style="color: ${api.errors > 0 ? '#ef4444' : '#22c55e'}">${api.errors}</td>
                        <td><span class="badge ${api.status}">${api.status}</span></td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <!-- Error Breakdown with Server Messages -->
        ${results.errorBreakdown && results.errorBreakdown.length > 0 ? `
        <div class="section">
            <h2 class="section-title">Error Breakdown & Server Messages</h2>
            <table class="table">
                <thead>
                    <tr>
                        <th>Error Code</th>
                        <th>Error Type</th>
                        <th>Count</th>
                        <th>Server Message</th>
                    </tr>
                </thead>
                <tbody>
                    ${results.errorBreakdown.filter(e => e.count > 0).map(error => `
                    <tr>
                        <td><span class="badge" style="background: ${error.code >= 500 ? '#ef444420' : error.code === 429 ? '#f59e0b20' : '#64748b20'}; color: ${error.code >= 500 ? '#ef4444' : error.code === 429 ? '#f59e0b' : '#94a3b8'}">${error.code}</span></td>
                        <td style="font-weight: 500;">${error.name}</td>
                        <td style="color: #ef4444; font-weight: 600;">${error.count.toLocaleString()}</td>
                        <td style="font-family: monospace; font-size: 0.75rem; color: #f87171;">${error.serverMessage}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}

        <!-- Bottlenecks & Issues -->
        <div class="section">
            <h2 class="section-title">Detected Bottlenecks (${bottlenecks.length})</h2>
            ${bottlenecks.length === 0 ?
                '<p style="color: #22c55e; text-align: center; padding: 20px;">✓ No significant bottlenecks detected</p>' :
                bottlenecks.map(b => `
                <div class="bottleneck ${b.severity}" style="margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="font-weight: 600; font-size: 1.1rem;">${b.type}</span>
                        <span class="badge ${b.severity}">${b.severity.toUpperCase()}</span>
                    </div>
                    <p style="color: #94a3b8; font-size: 0.875rem; margin-bottom: 8px;">Endpoint: <code style="background: #1e293b; padding: 2px 6px; border-radius: 4px;">${b.endpoint}</code></p>
                    <p style="margin-bottom: 12px; line-height: 1.6;">${b.description}</p>
                    ${b.metric ? `<p style="color: #22d3ee; font-size: 0.875rem; margin-bottom: 8px;"><strong>Metric:</strong> <code style="background: #083344; padding: 2px 8px; border-radius: 4px;">${b.metric}</code></p>` : ''}
                    ${b.recommendation ? `<div style="background: #052e16; border: 1px solid #166534; border-radius: 8px; padding: 12px; margin-top: 8px;"><p style="color: #22c55e; font-size: 0.75rem; margin-bottom: 4px; font-weight: 600;">RECOMMENDATION:</p><p style="color: #86efac; font-size: 0.875rem;">${b.recommendation}</p></div>` : ''}
                </div>
                `).join('')
            }
        </div>

        <!-- Recommendations -->
        <div class="section">
            <h2 class="section-title">Recommendations</h2>
            <div class="recommendation">
                <div class="recommendation-icon"></div>
                <span>Consider implementing caching for frequently accessed endpoints to reduce response times</span>
            </div>
            <div class="recommendation">
                <div class="recommendation-icon"></div>
                <span>Optimize database queries for endpoints with high P95 latency (> 500ms)</span>
            </div>
            <div class="recommendation">
                <div class="recommendation-icon"></div>
                <span>Review error handling for endpoints with failure rates above threshold</span>
            </div>
            <div class="recommendation">
                <div class="recommendation-icon"></div>
                <span>Consider horizontal scaling if throughput requirements increase</span>
            </div>
            ${summary.errorRate > 2 ? `
            <div class="recommendation">
                <div class="recommendation-icon" style="background: #ef4444;"></div>
                <span style="color: #ef4444;">Critical: Error rate exceeds 2% threshold - immediate investigation required</span>
            </div>
            ` : ''}
        </div>

        <!-- Data Summary -->
        <div class="section">
            <h2 class="section-title">Test Data Summary</h2>
            <div class="summary-grid">
                <div class="summary-item">
                    <div class="summary-label">Data Transferred</div>
                    <div class="summary-value">~${((summary.totalRequests * 2) / 1024).toFixed(1)} MB</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">APIs Tested</div>
                    <div class="summary-value">${apiResults.length}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Peak Concurrency</div>
                    <div class="summary-value">${summary.peakVUs} VUs</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Success Rate</div>
                    <div class="summary-value">${((summary.successfulRequests / summary.totalRequests) * 100).toFixed(2)}%</div>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>Report generated by Automation Dashboard - Load Testing Module</p>
            <p style="margin-top: 8px;">© ${new Date().getFullYear()} - Confidential</p>
        </div>
    </div>
</body>
</html>`;
    };

    const generateJSONReport = () => {
        return JSON.stringify({
            reportInfo: {
                generatedAt: new Date().toISOString(),
                reportType: 'Load Test Performance Report',
                version: '1.0'
            },
            testConfiguration: {
                duration: summary.duration,
                virtualUsers: summary.peakVUs,
                targetRPS: config?.requestsPerSecond || null,
                rampUpTime: config?.rampUpTime || null,
                environment: config?.environment || null
            },
            summary: {
                totalRequests: summary.totalRequests,
                successfulRequests: summary.successfulRequests,
                failedRequests: summary.failedRequests,
                errorRate: summary.errorRate,
                throughput: summary.throughput,
                responseTime: {
                    average: summary.avgResponseTime,
                    p95: summary.p95ResponseTime,
                    p99: summary.p99ResponseTime
                },
                status: summary.errorRate < 2 ? 'PASSED' : 'DEGRADED'
            },
            timeline: timeline.map(t => ({
                timestamp: t.time,
                responseTime: Math.round(t.responseTime),
                throughput: Math.round(t.throughput),
                errorRate: t.errorRate.toFixed(2),
                activeUsers: Math.round(t.activeUsers)
            })),
            apiResults: apiResults.map(api => ({
                method: api.method,
                endpoint: api.endpoint,
                requests: api.requests,
                avgResponseTime: api.avgTime,
                p95ResponseTime: api.p95Time,
                errors: api.errors,
                status: api.status
            })),
            bottlenecks: bottlenecks.map(b => ({
                type: b.type,
                endpoint: b.endpoint,
                description: b.description,
                severity: b.severity,
                metric: b.metric || null,
                recommendation: b.recommendation || null
            })),
            errorBreakdown: results.errorBreakdown ? results.errorBreakdown.map(e => ({
                code: e.code,
                name: e.name,
                count: e.count,
                description: e.description,
                serverMessage: e.serverMessage
            })) : [],
            recommendations: [
                'Consider implementing caching for frequently accessed endpoints',
                'Optimize database queries for endpoints with high P95 latency',
                'Review error handling for endpoints with high failure rates',
                'Consider horizontal scaling if throughput requirements increase'
            ]
        }, null, 2);
    };

    const generateCSVReport = () => {
        let csv = 'Load Test Performance Report\n';
        csv += `Generated:,${testDate}\n\n`;

        csv += 'SUMMARY\n';
        csv += 'Metric,Value\n';
        csv += `Total Requests,${summary.totalRequests}\n`;
        csv += `Successful Requests,${summary.successfulRequests}\n`;
        csv += `Failed Requests,${summary.failedRequests}\n`;
        csv += `Error Rate,${summary.errorRate.toFixed(2)}%\n`;
        csv += `Throughput,${summary.throughput} req/s\n`;
        csv += `Avg Response Time,${summary.avgResponseTime}ms\n`;
        csv += `P95 Response Time,${summary.p95ResponseTime}ms\n`;
        csv += `P99 Response Time,${summary.p99ResponseTime}ms\n`;
        csv += `Duration,${summary.duration}s\n`;
        csv += `Peak VUs,${summary.peakVUs}\n\n`;

        csv += 'PER-API PERFORMANCE\n';
        csv += 'Method,Endpoint,Requests,Avg Time (ms),P95 Time (ms),Errors,Status\n';
        apiResults.forEach(api => {
            csv += `${api.method},${api.endpoint},${api.requests},${api.avgTime},${api.p95Time},${api.errors},${api.status}\n`;
        });

        csv += '\nTIMELINE DATA\n';
        csv += 'Time (s),Response Time (ms),Throughput (req/s),Error Rate (%),Active Users\n';
        timeline.forEach(t => {
            csv += `${t.time},${Math.round(t.responseTime)},${Math.round(t.throughput)},${t.errorRate.toFixed(2)},${Math.round(t.activeUsers)}\n`;
        });

        csv += '\nERROR BREAKDOWN\n';
        csv += 'Error Code,Error Type,Count,Server Message\n';
        if (results.errorBreakdown) {
            results.errorBreakdown.forEach(e => {
                csv += `${e.code},${e.name},${e.count},"${e.serverMessage}"\n`;
            });
        }

        csv += '\nBOTTLENECKS\n';
        csv += 'Type,Endpoint,Description,Severity,Metric,Recommendation\n';
        bottlenecks.forEach(b => {
            csv += `${b.type},${b.endpoint},"${b.description}",${b.severity},"${b.metric || ''}","${b.recommendation || ''}"\n`;
        });

        return csv;
    };

    const handleExport = async (format) => {
        setExporting(true);
        try {
            let content, filename, type;

            switch (format) {
                case 'html':
                    content = generateHTMLReport();
                    filename = `load-test-report-${Date.now()}.html`;
                    type = 'text/html';
                    break;
                case 'json':
                    content = generateJSONReport();
                    filename = `load-test-report-${Date.now()}.json`;
                    type = 'application/json';
                    break;
                case 'csv':
                    content = generateCSVReport();
                    filename = `load-test-report-${Date.now()}.csv`;
                    type = 'text/csv';
                    break;
                default:
                    return;
            }

            const blob = new Blob([content], { type });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setTimeout(() => {
                onClose();
            }, 500);
        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            setExporting(false);
        }
    };

    const exportFormats = [
        { id: 'html', name: 'HTML Report', icon: <FileText size={20} />, desc: 'Formatted report ready for sharing' },
        { id: 'json', name: 'JSON Data', icon: <FileJson size={20} />, desc: 'Structured data for integration' },
        { id: 'csv', name: 'CSV Spreadsheet', icon: <FileSpreadsheet size={20} />, desc: 'Excel-compatible data export' }
    ];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 rounded-2xl border border-white/10 w-full max-w-lg overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-violet-500/20">
                            <Download size={18} className="text-violet-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">Export Report</h3>
                            <p className="text-sm text-gray-400">Choose format and download</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                    {exportFormats.map((format) => (
                        <button
                            key={format.id}
                            onClick={() => handleExport(format.id)}
                            disabled={exporting}
                            className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                                exporting
                                    ? 'bg-slate-800/30 border-white/5 cursor-not-allowed opacity-50'
                                    : 'bg-slate-800/50 border-white/5 hover:bg-slate-700/50 hover:border-violet-500/30'
                            }`}
                        >
                            <div className="p-2 rounded-lg bg-slate-700/50 text-violet-400">
                                {format.icon}
                            </div>
                            <div className="flex-1 text-left">
                                <p className="font-medium text-white">{format.name}</p>
                                <p className="text-sm text-gray-500">{format.desc}</p>
                            </div>
                            <Download size={16} className="text-gray-500" />
                        </button>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-white/10 bg-slate-800/30">
                    <p className="text-xs text-gray-500 text-center">
                        Report includes: Summary, Response Times, Per-API Stats, Bottlenecks & Recommendations
                    </p>
                </div>
            </div>
        </div>
    );
};

const MetricCard = ({ icon, label, value, unit, trend, trendValue, color }) => (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
        <div className="flex items-center gap-2 mb-2">
            <div className={`p-1.5 rounded-lg ${color}`}>
                {icon}
            </div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
        </div>
        <div className="flex items-end justify-between">
            <div>
                <span className="text-2xl font-bold text-white">{value}</span>
                {unit && <span className="text-sm text-gray-500 ml-1">{unit}</span>}
            </div>
            {trend && (
                <div className={`flex items-center gap-1 text-xs ${trend === 'up' ? 'text-red-400' : 'text-green-400'}`}>
                    {trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {trendValue}
                </div>
            )}
        </div>
    </div>
);

export default function LoadTestingResults({ results, isRunning, config, progress, liveMetrics, onStopTest }) {
    const [activeView, setActiveView] = useState('summary');
    const [showExportModal, setShowExportModal] = useState(false);

    if (isRunning) {
        const hasLiveData = results?.timeline?.length > 0;

        // Live progress view when we have streaming data
        if (hasLiveData) {
            const timeline = results.timeline;
            const summary = results.summary;

            return (
                <div className="space-y-6">
                    {/* Progress Bar */}
                    <div className="bg-slate-800/50 rounded-xl p-6 border border-white/5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <RefreshCw size={18} className="text-violet-400 animate-spin" />
                                <span className="text-lg font-medium text-white">Test Running</span>
                                {progress?.phase && (
                                    <span className="px-2 py-0.5 rounded-full text-xs bg-violet-500/20 text-violet-400 capitalize">
                                        {progress.phase}
                                    </span>
                                )}
                            </div>
                            {onStopTest && (
                                <button
                                    onClick={onStopTest}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all"
                                >
                                    Stop Test
                                </button>
                            )}
                        </div>
                        <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500 rounded-full"
                                style={{ width: `${progress?.progress || 0}%` }}
                            />
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-gray-500">
                            <span>{progress?.elapsed || 0}s elapsed</span>
                            <span>{progress?.progress || 0}%</span>
                            <span>{progress?.vus || 0} VUs active</span>
                        </div>
                    </div>

                    {/* Live Metric Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <MetricCard
                            icon={<Zap size={16} className="text-violet-400" />}
                            label="Requests"
                            value={(liveMetrics?.requestCount || summary.totalRequests || 0).toLocaleString()}
                            color="bg-violet-500/20"
                        />
                        <MetricCard
                            icon={<Clock size={16} className="text-blue-400" />}
                            label="Avg Response"
                            value={liveMetrics?.responseTime || summary.avgResponseTime || 0}
                            unit="ms"
                            color="bg-blue-500/20"
                        />
                        <MetricCard
                            icon={<Activity size={16} className="text-green-400" />}
                            label="Throughput"
                            value={liveMetrics?.throughput || summary.throughput || 0}
                            unit="req/s"
                            color="bg-green-500/20"
                        />
                        <MetricCard
                            icon={<AlertTriangle size={16} className="text-red-400" />}
                            label="Error Rate"
                            value={typeof (liveMetrics?.errorRate ?? summary.errorRate) === 'number'
                                ? (liveMetrics?.errorRate ?? summary.errorRate).toFixed(2) : '0.00'}
                            unit="%"
                            color="bg-red-500/20"
                        />
                    </div>

                    {/* Live Timeline Chart */}
                    {timeline.length > 1 && (
                        <div className="bg-slate-800/50 rounded-xl p-6 border border-white/5">
                            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                                <Activity size={18} className="text-violet-400 animate-pulse" />
                                Live Performance
                            </h3>
                            <div className="mb-4">
                                <p className="text-sm text-gray-500 mb-2">Response Time (ms)</p>
                                <div className="h-32 flex items-end gap-0.5">
                                    {timeline.slice(-60).map((t, i) => (
                                        <div key={i} className="flex-1 flex flex-col justify-end">
                                            <div
                                                className="bg-violet-500/70 rounded-t transition-all duration-300"
                                                style={{ height: `${Math.min((t.responseTime / Math.max(...timeline.slice(-60).map(x => x.responseTime || 1))) * 100, 100)}%` }}
                                                title={`${t.time}s: ${Math.round(t.responseTime)}ms`}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-2">Active Users</p>
                                <div className="h-20 flex items-end gap-0.5">
                                    {timeline.slice(-60).map((t, i) => (
                                        <div key={i} className="flex-1">
                                            <div
                                                className="bg-indigo-500/70 rounded-t transition-all duration-300"
                                                style={{ height: `${Math.min((t.activeUsers / Math.max(...timeline.slice(-60).map(x => x.activeUsers || 1))) * 100, 100)}%` }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // Basic spinner when no live data yet
        return (
            <div className="flex flex-col items-center justify-center h-96">
                <div className="relative">
                    <div className="w-24 h-24 border-4 border-violet-500/30 rounded-full animate-pulse"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <RefreshCw size={32} className="text-violet-400 animate-spin" />
                    </div>
                </div>
                <p className="text-lg font-medium text-white mt-6">Running Load Test...</p>
                <p className="text-sm text-gray-500 mt-2">
                    {config.virtualUsers} VUs | {config.duration}s duration | {config.requestsPerSecond} RPS target
                </p>
                <div className="mt-6 flex items-center gap-2 text-sm text-gray-400">
                    <Activity size={16} className="animate-pulse" />
                    {progress ? `${progress.phase || 'Starting'} - ${progress.progress || 0}%` : 'Generating traffic and collecting metrics'}
                </div>
                {onStopTest && (
                    <button
                        onClick={onStopTest}
                        className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all"
                    >
                        Stop Test
                    </button>
                )}
            </div>
        );
    }

    if (!results) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-gray-500">
                <BarChart3 size={48} className="mb-4 opacity-50" />
                <p className="text-lg font-medium">No Results Yet</p>
                <p className="text-sm">Run a load test to see performance metrics</p>
            </div>
        );
    }

    const { summary, timeline, apiResults, bottlenecks } = results;

    return (
        <div className="space-y-6">
            {/* View Toggle */}
            <div className="flex gap-2">
                {['summary', 'timeline', 'apis', 'bottlenecks'].map(view => (
                    <button
                        key={view}
                        onClick={() => setActiveView(view)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeView === view
                            ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                            : 'bg-slate-800/50 text-gray-400 hover:text-white'
                            }`}
                    >
                        {view.charAt(0).toUpperCase() + view.slice(1)}
                    </button>
                ))}

                <div className="flex-1"></div>

                <button
                    onClick={() => setShowExportModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:shadow-lg hover:shadow-violet-500/25 transition-all"
                >
                    <Download size={16} />
                    Export Report
                </button>
            </div>

            {/* Summary View */}
            {activeView === 'summary' && (
                <>
                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <MetricCard
                            icon={<Zap size={16} className="text-violet-400" />}
                            label="Total Requests"
                            value={summary.totalRequests.toLocaleString()}
                            color="bg-violet-500/20"
                        />
                        <MetricCard
                            icon={<CheckCircle size={16} className="text-green-400" />}
                            label="Successful"
                            value={summary.successfulRequests.toLocaleString()}
                            color="bg-green-500/20"
                        />
                        <MetricCard
                            icon={<AlertTriangle size={16} className="text-red-400" />}
                            label="Failed"
                            value={summary.failedRequests.toLocaleString()}
                            color="bg-red-500/20"
                        />
                        <MetricCard
                            icon={<Activity size={16} className="text-blue-400" />}
                            label="Error Rate"
                            value={summary.errorRate.toFixed(2)}
                            unit="%"
                            trend={summary.errorRate > 2 ? 'up' : 'down'}
                            trendValue={summary.errorRate > 2 ? 'High' : 'Low'}
                            color="bg-blue-500/20"
                        />
                    </div>

                    {/* Response Time Metrics */}
                    <div className="bg-slate-800/50 rounded-xl p-6 border border-white/5">
                        <h3 className="text-lg font-semibold text-white mb-4">Response Times</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="text-center">
                                <p className="text-4xl font-bold text-white">{summary.avgResponseTime}</p>
                                <p className="text-sm text-gray-500 mt-1">Average (ms)</p>
                                <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500" style={{ width: '60%' }} />
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="text-4xl font-bold text-yellow-400">{summary.p95ResponseTime}</p>
                                <p className="text-sm text-gray-500 mt-1">P95 (ms)</p>
                                <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-yellow-500" style={{ width: '75%' }} />
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="text-4xl font-bold text-orange-400">{summary.p99ResponseTime}</p>
                                <p className="text-sm text-gray-500 mt-1">P99 (ms)</p>
                                <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-orange-500" style={{ width: '90%' }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Throughput & Performance */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-800/50 rounded-xl p-6 border border-white/5">
                            <h3 className="font-semibold text-white mb-4">Throughput</h3>
                            <div className="flex items-end gap-4">
                                <div>
                                    <p className="text-4xl font-bold text-violet-400">{summary.throughput}</p>
                                    <p className="text-sm text-gray-500">requests/second</p>
                                </div>
                                <div className="flex-1 h-24 flex items-end gap-1">
                                    {timeline.slice(-20).map((t, i) => (
                                        <div
                                            key={i}
                                            className="flex-1 bg-gradient-to-t from-violet-500 to-purple-500 rounded-t opacity-70"
                                            style={{ height: `${(t.throughput / 300) * 100}%` }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-800/50 rounded-xl p-6 border border-white/5">
                            <h3 className="font-semibold text-white mb-4">Virtual Users</h3>
                            <div className="flex items-end gap-4">
                                <div>
                                    <p className="text-4xl font-bold text-indigo-400">{summary.peakVUs}</p>
                                    <p className="text-sm text-gray-500">peak concurrent</p>
                                </div>
                                <div className="flex-1 h-24 flex items-end gap-1">
                                    {timeline.slice(-20).map((t, i) => (
                                        <div
                                            key={i}
                                            className="flex-1 bg-gradient-to-t from-indigo-500 to-purple-500 rounded-t opacity-70"
                                            style={{ height: `${(t.activeUsers / summary.peakVUs) * 100}%` }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Test Summary */}
                    <div className="bg-slate-800/50 rounded-xl p-6 border border-white/5">
                        <h3 className="font-semibold text-white mb-4">Test Summary</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <p className="text-gray-500">Duration</p>
                                <p className="text-white font-medium">{summary.duration} seconds</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Peak VUs</p>
                                <p className="text-white font-medium">{summary.peakVUs} users</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Data Transferred</p>
                                <p className="text-white font-medium">~{((summary.totalRequests * 2) / 1024).toFixed(1)} MB</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Status</p>
                                <p className={`font-medium ${summary.errorRate < 2 ? 'text-green-400' : 'text-red-400'}`}>
                                    {summary.errorRate < 2 ? 'Passed' : 'Degraded'}
                                </p>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Timeline View */}
            {activeView === 'timeline' && (
                <div className="bg-slate-800/50 rounded-xl p-6 border border-white/5">
                    <h3 className="font-semibold text-white mb-4">Performance Over Time</h3>

                    {/* Response Time Chart */}
                    <div className="mb-6">
                        <p className="text-sm text-gray-500 mb-2">Response Time (ms)</p>
                        <div className="h-40 flex items-end gap-0.5">
                            {timeline.map((t, i) => (
                                <div key={i} className="flex-1 flex flex-col justify-end gap-0.5">
                                    <div
                                        className="bg-violet-500/70 rounded-t"
                                        style={{ height: `${(t.responseTime / 400) * 100}%` }}
                                        title={`${t.time}s: ${Math.round(t.responseTime)}ms`}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between mt-1 text-xs text-gray-600">
                            <span>0s</span>
                            <span>{summary.duration}s</span>
                        </div>
                    </div>

                    {/* Error Rate Chart */}
                    <div className="mb-6">
                        <p className="text-sm text-gray-500 mb-2">Error Rate (%)</p>
                        <div className="h-24 flex items-end gap-0.5">
                            {timeline.map((t, i) => (
                                <div key={i} className="flex-1">
                                    <div
                                        className={`rounded-t ${t.errorRate > 2 ? 'bg-red-500/70' : 'bg-green-500/70'}`}
                                        style={{ height: `${Math.max(t.errorRate * 10, 2)}%` }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Active Users Chart */}
                    <div>
                        <p className="text-sm text-gray-500 mb-2">Active Virtual Users</p>
                        <div className="h-24 flex items-end gap-0.5">
                            {timeline.map((t, i) => (
                                <div key={i} className="flex-1">
                                    <div
                                        className="bg-indigo-500/70 rounded-t"
                                        style={{ height: `${(t.activeUsers / summary.peakVUs) * 100}%` }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* APIs View */}
            {activeView === 'apis' && (
                <div className="bg-slate-800/50 rounded-xl border border-white/5 overflow-hidden">
                    <div className="p-4 border-b border-white/5">
                        <h3 className="font-semibold text-white">Per-API Performance</h3>
                    </div>
                    <div className="divide-y divide-white/5">
                        {apiResults.map((api, i) => (
                            <div key={i} className="p-4 hover:bg-slate-700/20 transition-all">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2 py-0.5 rounded text-xs font-mono font-medium ${api.method === 'GET' ? 'bg-green-500/20 text-green-400' :
                                            api.method === 'POST' ? 'bg-blue-500/20 text-blue-400' :
                                                api.method === 'PUT' ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-red-500/20 text-red-400'
                                            }`}>
                                            {api.method}
                                        </span>
                                        <span className="font-mono text-sm text-white">{api.endpoint}</span>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs ${api.status === 'healthy' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                                        }`}>
                                        {api.status}
                                    </span>
                                </div>
                                <div className="grid grid-cols-4 gap-4 text-sm">
                                    <div>
                                        <p className="text-gray-500 text-xs">Requests</p>
                                        <p className="text-white font-medium">{api.requests.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-xs">Avg Time</p>
                                        <p className="text-white font-medium">{api.avgTime}ms</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-xs">P95 Time</p>
                                        <p className="text-yellow-400 font-medium">{api.p95Time}ms</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-xs">Errors</p>
                                        <p className={`font-medium ${api.errors > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                            {api.errors}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Bottlenecks View */}
            {activeView === 'bottlenecks' && (
                <div className="space-y-4">
                    {/* Error Breakdown Section */}
                    {results.errorBreakdown && results.errorBreakdown.length > 0 && (
                        <div className="bg-slate-800/50 rounded-xl p-6 border border-white/5">
                            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                                <AlertTriangle size={18} className="text-red-400" />
                                Error Breakdown & Server Messages
                            </h3>
                            <div className="space-y-3">
                                {results.errorBreakdown.filter(e => e.count > 0).map((error, i) => (
                                    <div key={i} className="p-4 bg-slate-900/50 rounded-lg border border-white/5">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <span className={`px-3 py-1 rounded-lg text-sm font-mono font-bold ${
                                                    error.code >= 500 ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                                    error.code === 429 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                                                    error.code === 401 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                                    'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                                                }`}>
                                                    {error.code}
                                                </span>
                                                <span className="font-medium text-white">{error.name}</span>
                                            </div>
                                            <span className="text-red-400 font-semibold">{error.count.toLocaleString()} occurrences</span>
                                        </div>
                                        <p className="text-sm text-gray-400 mb-2">{error.description}</p>
                                        <div className="bg-slate-950 rounded-lg p-3 border border-white/5">
                                            <p className="text-xs text-gray-500 mb-1">Server Response:</p>
                                            <code className="text-sm text-red-300 font-mono">{error.serverMessage}</code>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Bottlenecks Section */}
                    <div className="bg-slate-800/50 rounded-xl p-6 border border-white/5">
                        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                            <AlertTriangle size={18} className="text-yellow-400" />
                            Detected Bottlenecks ({bottlenecks.length})
                        </h3>

                        {bottlenecks.length === 0 ? (
                            <div className="text-center py-8">
                                <CheckCircle size={32} className="mx-auto mb-2 text-green-400" />
                                <p className="text-gray-400">No significant bottlenecks detected</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {bottlenecks.map((bottleneck, i) => (
                                    <div key={i} className={`p-4 bg-slate-900/50 rounded-lg border-l-4 ${
                                        bottleneck.severity === 'high' ? 'border-l-red-500' : 'border-l-yellow-500'
                                    }`}>
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                    bottleneck.severity === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                                                }`}>
                                                    {bottleneck.severity.toUpperCase()}
                                                </span>
                                                <span className="font-semibold text-white text-lg">{bottleneck.type}</span>
                                            </div>
                                            <span className="font-mono text-xs bg-slate-800 px-2 py-1 rounded text-gray-400">{bottleneck.endpoint}</span>
                                        </div>
                                        <p className="text-sm text-gray-300 mb-3">{bottleneck.description}</p>

                                        {bottleneck.metric && (
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="text-xs text-gray-500">Metric:</span>
                                                <span className="text-sm font-mono text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded">{bottleneck.metric}</span>
                                            </div>
                                        )}

                                        {bottleneck.recommendation && (
                                            <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                                                <p className="text-xs text-green-400 mb-1 font-medium">Recommendation:</p>
                                                <p className="text-sm text-green-300">{bottleneck.recommendation}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Dynamic Recommendations based on results */}
                    <div className="bg-slate-800/50 rounded-xl p-6 border border-white/5">
                        <h3 className="font-semibold text-white mb-4">Priority Actions</h3>
                        <ul className="space-y-3 text-sm">
                            {summary.errorRate > 5 && (
                                <li className="flex items-start gap-3 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                                    <AlertTriangle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                                    <span className="text-red-300">CRITICAL: Error rate ({summary.errorRate.toFixed(2)}%) exceeds acceptable threshold. Immediate investigation required.</span>
                                </li>
                            )}
                            {summary.p99ResponseTime > 1000 && (
                                <li className="flex items-start gap-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                                    <AlertTriangle size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                                    <span className="text-yellow-300">P99 response time ({summary.p99ResponseTime}ms) indicates severe latency for tail requests. Database optimization needed.</span>
                                </li>
                            )}
                            <li className="flex items-start gap-3">
                                <CheckCircle size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-300">Implement connection pooling with PgBouncer to handle high concurrency</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-300">Add Redis caching layer for session management to reduce database load</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-300">Scale authentication service horizontally with load balancer</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-300">Implement request queuing for login endpoints during peak load</span>
                            </li>
                        </ul>
                    </div>
                </div>
            )}

            {/* Export Modal */}
            {showExportModal && (
                <ExportReportModal
                    results={results}
                    config={config}
                    onClose={() => setShowExportModal(false)}
                />
            )}
        </div>
    );
}
