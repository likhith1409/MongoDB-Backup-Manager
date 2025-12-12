import React from 'react';

const StatusBadge = ({ status, className = '' }) => {
    const getStatusConfig = () => {
        switch (status?.toLowerCase()) {
            case 'completed':
            case 'success':
            case 'connected':
            case 'enabled':
                return {
                    color: 'bg-gradient-to-r from-green-500 to-emerald-500',
                    textColor: 'text-white',
                    icon: '✓',
                    dotColor: 'bg-green-400'
                };
            case 'running':
            case 'in_progress':
            case 'pending':
                return {
                    color: 'bg-gradient-to-r from-blue-500 to-cyan-500',
                    textColor: 'text-white',
                    icon: '◉',
                    dotColor: 'bg-blue-400',
                    animate: true
                };
            case 'failed':
            case 'error':
            case 'disconnected':
                return {
                    color: 'bg-gradient-to-r from-red-500 to-rose-500',
                    textColor: 'text-white',
                    icon: '✕',
                    dotColor: 'bg-red-400'
                };
            case 'warning':
            case 'disabled':
                return {
                    color: 'bg-gradient-to-r from-yellow-500 to-amber-500',
                    textColor: 'text-white',
                    icon: '⚠',
                    dotColor: 'bg-yellow-400'
                };
            default:
                return {
                    color: 'bg-gradient-to-r from-gray-400 to-gray-500',
                    textColor: 'text-white',
                    icon: '○',
                    dotColor: 'bg-gray-400'
                };
        }
    };

    const config = getStatusConfig();

    return (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${config.color} ${config.textColor} shadow-lg ${className}`}>
            {config.animate && (
                <span className={`w-2 h-2 ${config.dotColor} rounded-full mr-2 animate-pulse`}></span>
            )}
            {!config.animate && (
                <span className="mr-1.5">{config.icon}</span>
            )}
            {status}
        </span>
    );
};

export default StatusBadge;
