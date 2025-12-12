import React from 'react';

const Card = ({ children, className = '', title, subtitle }) => {
    return (
        <div className={`card ${className}`}>
            {(title || subtitle) && (
                <div className="mb-4">
                    {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
                    {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
                </div>
            )}
            {children}
        </div>
    );
};

export default Card;
