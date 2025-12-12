import React, { useEffect } from 'react';

const Toast = ({ message, type = 'info', onClose, duration = 3000 }) => {
    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    const backgrounds = {
        success: 'bg-primary-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    };

    return (
        <div className={`${backgrounds[type]} text-white px-6 py-4 rounded-lg shadow-lg flex items-center justify-between min-w-[300px] max-w-md animate-slide-in`}>
            <p className="font-medium">{message}</p>
            <button
                onClick={onClose}
                className="ml-4 text-white hover:text-gray-200 font-bold text-xl"
            >
                ×
            </button>
        </div>
    );
};

export default Toast;
