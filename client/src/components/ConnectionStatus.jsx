import React from 'react';

const ConnectionStatus = ({ isConnected, details, testResult, className = '' }) => {
    if (!testResult) {
        return null;
    }

    const { success, message, details: resultDetails } = testResult;

    return (
        <div className={`mt-4 p-4 rounded-lg border-2 ${success ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'} ${className}`}>
            <div className="flex items-start">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${success ? 'bg-green-500' : 'bg-red-500'}`}>
                    <span className="text-white text-xl font-bold">
                        {success ? '✓' : '✕'}
                    </span>
                </div>

                <div className="ml-4 flex-1">
                    <h4 className={`text-lg font-semibold ${success ? 'text-green-800' : 'text-red-800'}`}>
                        {message}
                    </h4>

                    {resultDetails && (
                        <div className="mt-3 space-y-2">
                            {success ? (
                                <div className="text-sm text-green-700 space-y-1">
                                    {resultDetails.host && (
                                        <p><strong>Host:</strong> {resultDetails.host}:{resultDetails.port}</p>
                                    )}
                                    {resultDetails.user && (
                                        <p><strong>User:</strong> {resultDetails.user}</p>
                                    )}
                                    {resultDetails.basePath && (
                                        <p><strong>Base Path:</strong> {resultDetails.basePath}</p>
                                    )}
                                    {resultDetails.duration && (
                                        <p><strong>Connection Time:</strong> {resultDetails.duration}</p>
                                    )}
                                    {resultDetails.status && (
                                        <p className="mt-2 text-green-900 font-medium">
                                            {resultDetails.status}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="text-sm text-red-700 space-y-2">
                                    {resultDetails.error && (
                                        <div className="bg-red-100 p-3 rounded border border-red-200">
                                            <p className="font-semibold text-red-900 mb-1">Error:</p>
                                            <p className="text-red-800 font-mono text-xs">{resultDetails.error}</p>
                                        </div>
                                    )}

                                    {resultDetails.type && (
                                        <p><strong>Type:</strong> {resultDetails.type}</p>
                                    )}

                                    {resultDetails.duration && (
                                        <p><strong>Attempt Duration:</strong> {resultDetails.duration}</p>
                                    )}

                                    {resultDetails.troubleshooting && resultDetails.troubleshooting.length > 0 && (
                                        <div className="mt-3">
                                            <p className="font-semibold text-red-900 mb-2">Troubleshooting Steps:</p>
                                            <ul className="list-disc list-inside space-y-1 text-red-800">
                                                {resultDetails.troubleshooting.map((step, index) => (
                                                    <li key={index}>{step}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConnectionStatus;
