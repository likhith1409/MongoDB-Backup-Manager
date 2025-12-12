import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import api from '../utils/api';

const Logs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalLogs, setTotalLogs] = useState(0);
    const [filters, setFilters] = useState({
        level: '',
        type: '',
        status: ''
    });
    const [expandedLog, setExpandedLog] = useState(null);
    const [clearing, setClearing] = useState(false);
    const [showClearModal, setShowClearModal] = useState(false);

    useEffect(() => {
        fetchLogs();
    }, [page, filters]);

    const fetchLogs = async () => {
        setLoading(true);

        try {
            const queryParams = {
                page,
                limit: 15
            };

            if (filters.level) queryParams.level = filters.level;
            if (filters.type) queryParams.type = filters.type;
            if (filters.status) queryParams.status = filters.status;

            const params = new URLSearchParams(queryParams);
            const response = await api.get(`/logs?${params}`);

            if (response.data.success) {
                setLogs(response.data.data.logs);
                setTotalPages(response.data.data.pages);
                setTotalLogs(response.data.data.total);
            }
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (field, value) => {
        setFilters({ ...filters, [field]: value });
        setPage(1);
    };

    const clearAllLogs = async () => {
        setClearing(true);
        try {
            const response = await api.delete('/logs');
            if (response.data.success) {
                setLogs([]);
                setTotalPages(1);
                setTotalLogs(0);
                setPage(1);
                setShowClearModal(false);
            }
        } catch (error) {
            console.error('Failed to clear logs:', error);
            alert('Failed to clear logs. Please try again.');
        } finally {
            setClearing(false);
        }
    };

    const downloadLogs = async () => {
        try {
            const response = await api.get('/logs/download', {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'backup.log');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Download failed:', error);
            alert('Failed to download logs');
        }
    };

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        return {
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
    };

    const getLevelConfig = (level) => {
        const configs = {
            info: {
                bg: 'bg-gradient-to-r from-blue-500 to-cyan-500',
                text: 'text-white',
                icon: (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                ),
                glow: 'shadow-blue-500/20'
            },
            success: {
                bg: 'bg-gradient-to-r from-emerald-500 to-green-500',
                text: 'text-white',
                icon: (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                ),
                glow: 'shadow-emerald-500/20'
            },
            warning: {
                bg: 'bg-gradient-to-r from-amber-500 to-yellow-500',
                text: 'text-white',
                icon: (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                ),
                glow: 'shadow-amber-500/20'
            },
            error: {
                bg: 'bg-gradient-to-r from-red-500 to-rose-500',
                text: 'text-white',
                icon: (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                ),
                glow: 'shadow-red-500/20'
            }
        };
        return configs[level] || configs.info;
    };

    const getTypeConfig = (type) => {
        if (type === 'full') return { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Full Backup' };
        if (type === 'incremental') return { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Incremental' };
        return null;
    };

    const downloadBackup = async (backupId) => {
        try {
            const response = await api.get(`/backups/${backupId}/download`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `backup_${backupId}.tar.gz`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Download failed:', error);
            alert('Failed to download backup');
        }
    };

    const toggleLogDetails = (logId) => {
        setExpandedLog(expandedLog === logId ? null : logId);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header Section */}
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
                            Activity Logs
                        </h1>
                        <p className="text-gray-500 mt-2 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Monitor backup operations and system events
                        </p>
                    </div>

                    {/* Stats Badge */}
                    <div className="flex items-center gap-3">
                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-5 py-3 shadow-lg border border-white/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{totalLogs.toLocaleString()}</p>
                                    <p className="text-xs text-gray-500 font-medium">Total Entries</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters & Actions Card */}
                <Card className="mb-6 !bg-white/80 backdrop-blur-sm border-white/50">
                    <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                        {/* Filter Dropdowns */}
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="label flex items-center gap-2">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                    </svg>
                                    Level
                                </label>
                                <select
                                    value={filters.level}
                                    onChange={(e) => handleFilterChange('level', e.target.value)}
                                    className="input !bg-white/50"
                                >
                                    <option value="">All Levels</option>
                                    <option value="info">ℹ️ Info</option>
                                    <option value="success">✅ Success</option>
                                    <option value="warning">⚠️ Warning</option>
                                    <option value="error">❌ Error</option>
                                </select>
                            </div>

                            <div>
                                <label className="label flex items-center gap-2">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                                    </svg>
                                    Backup Type
                                </label>
                                <select
                                    value={filters.type}
                                    onChange={(e) => handleFilterChange('type', e.target.value)}
                                    className="input !bg-white/50"
                                >
                                    <option value="">All Types</option>
                                    <option value="full">📦 Full Backup</option>
                                    <option value="incremental">📄 Incremental</option>
                                </select>
                            </div>

                            <div>
                                <label className="label flex items-center gap-2">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Status
                                </label>
                                <select
                                    value={filters.status}
                                    onChange={(e) => handleFilterChange('status', e.target.value)}
                                    className="input !bg-white/50"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="started">🚀 Started</option>
                                    <option value="completed">✅ Completed</option>
                                    <option value="failed">❌ Failed</option>
                                </select>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                onClick={() => {
                                    setFilters({ level: '', type: '', status: '' });
                                    setPage(1);
                                }}
                                className="btn-secondary !px-4 !py-2.5 text-sm"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Reset
                            </button>

                            <button
                                onClick={downloadLogs}
                                className="btn-secondary !px-4 !py-2.5 text-sm"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download
                            </button>

                            <button
                                onClick={() => setShowClearModal(true)}
                                className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-all duration-300 inline-flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 text-sm"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Clear All Logs
                            </button>
                        </div>
                    </div>
                </Card>

                {/* Logs Timeline */}
                <Card className="!bg-white/80 backdrop-blur-sm border-white/50 !p-0 overflow-hidden">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                            <p className="text-gray-500 font-medium">Loading logs...</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-700 mb-1">No Logs Found</h3>
                            <p className="text-gray-500 text-sm">There are no log entries matching your filters.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {logs.map((log, index) => {
                                const levelConfig = getLevelConfig(log.level);
                                const typeConfig = log.type ? getTypeConfig(log.type) : null;
                                const dateTime = formatDate(log.timestamp);
                                const isExpanded = expandedLog === log.id;

                                return (
                                    <div
                                        key={log.id}
                                        className={`group transition-all duration-300 ${isExpanded ? 'bg-gradient-to-r from-blue-50/50 to-indigo-50/50' : 'hover:bg-gray-50/50'}`}
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                        <div
                                            className="flex items-start gap-4 p-5 cursor-pointer"
                                            onClick={() => toggleLogDetails(log.id)}
                                        >
                                            {/* Timeline Indicator */}
                                            <div className="flex flex-col items-center mt-1">
                                                <div className={`w-10 h-10 rounded-xl ${levelConfig.bg} flex items-center justify-center shadow-lg ${levelConfig.glow} transition-transform duration-300 group-hover:scale-110`}>
                                                    <span className={levelConfig.text}>{levelConfig.icon}</span>
                                                </div>
                                                {index < logs.length - 1 && (
                                                    <div className="w-0.5 h-full bg-gradient-to-b from-gray-200 to-transparent mt-2 min-h-[20px]"></div>
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                {/* Tags Row */}
                                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${levelConfig.bg} ${levelConfig.text} shadow-sm uppercase tracking-wide`}>
                                                        {log.level}
                                                    </span>
                                                    {typeConfig && (
                                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${typeConfig.bg} ${typeConfig.text}`}>
                                                            {typeConfig.label}
                                                        </span>
                                                    )}
                                                    {log.status && (
                                                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">
                                                            {log.status}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Message */}
                                                <p className="text-gray-800 font-medium leading-relaxed mb-2 break-words">
                                                    {log.message}
                                                </p>

                                                {/* Timestamp */}
                                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                                    <span className="flex items-center gap-1.5">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        {dateTime.date}
                                                    </span>
                                                    <span className="flex items-center gap-1.5">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        {dateTime.time}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2 shrink-0">
                                                {log.backup_id && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            downloadBackup(log.backup_id);
                                                        }}
                                                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                        </svg>
                                                        Download
                                                    </button>
                                                )}

                                                {log.details && (
                                                    <button
                                                        className={`p-2 rounded-lg transition-all duration-300 ${isExpanded ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                                    >
                                                        <svg className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Expanded Details */}
                                        {isExpanded && log.details && (
                                            <div className="px-5 pb-5 animate-fadeIn">
                                                <div className="ml-14 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 shadow-inner overflow-hidden">
                                                    <div className="flex items-center gap-2 mb-3 text-gray-400">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                                        </svg>
                                                        <span className="text-sm font-medium">Details</span>
                                                    </div>
                                                    <pre className="text-sm text-emerald-400 overflow-x-auto font-mono leading-relaxed">
                                                        {typeof log.details === 'object'
                                                            ? JSON.stringify(log.details, null, 2)
                                                            : log.details}
                                                    </pre>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200">
                            <div className="text-sm text-gray-600">
                                Showing page <span className="font-semibold text-gray-900">{page}</span> of <span className="font-semibold text-gray-900">{totalPages}</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(1)}
                                    disabled={page === 1}
                                    className="p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                                    </svg>
                                </button>

                                <button
                                    onClick={() => setPage(page - 1)}
                                    disabled={page === 1}
                                    className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    Previous
                                </button>

                                <div className="flex items-center gap-1">
                                    {[...Array(Math.min(5, totalPages))].map((_, idx) => {
                                        let pageNum;
                                        if (totalPages <= 5) {
                                            pageNum = idx + 1;
                                        } else if (page <= 3) {
                                            pageNum = idx + 1;
                                        } else if (page >= totalPages - 2) {
                                            pageNum = totalPages - 4 + idx;
                                        } else {
                                            pageNum = page - 2 + idx;
                                        }

                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => setPage(pageNum)}
                                                className={`w-10 h-10 rounded-lg font-medium transition-all duration-200 ${page === pageNum
                                                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                                                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                                                    }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={() => setPage(page + 1)}
                                    disabled={page === totalPages}
                                    className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
                                >
                                    Next
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>

                                <button
                                    onClick={() => setPage(totalPages)}
                                    disabled={page === totalPages}
                                    className="p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {/* Clear Logs Confirmation Modal */}
            {showClearModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all duration-300 scale-100">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-red-500 to-rose-600 p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">Clear All Logs?</h3>
                                    <p className="text-red-100 text-sm mt-1">This action cannot be undone</p>
                                </div>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6">
                            <p className="text-gray-600 leading-relaxed">
                                You are about to permanently delete <span className="font-semibold text-gray-900">{totalLogs.toLocaleString()} log entries</span> from the system. This will also clear the log file.
                            </p>

                            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                <div className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <p className="text-sm text-amber-800">
                                        <strong>Warning:</strong> You will lose all historical backup operation records, including success/failure logs and timestamps.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Modal Actions */}
                        <div className="flex items-center justify-end gap-3 p-6 bg-gray-50 border-t border-gray-100">
                            <button
                                onClick={() => setShowClearModal(false)}
                                disabled={clearing}
                                className="px-5 py-2.5 rounded-xl bg-white border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={clearAllLogs}
                                disabled={clearing}
                                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 disabled:opacity-70"
                            >
                                {clearing ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Clearing...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Yes, Clear All Logs
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Logs;
