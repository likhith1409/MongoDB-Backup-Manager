import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

    useEffect(() => {
        // Check if user is logged in on mount
        const token = localStorage.getItem('token');
        const storedUsername = localStorage.getItem('username');
        const isFirstLogin = localStorage.getItem('isFirstLogin') === 'true';

        if (token) {
            setUser({
                token,
                username: storedUsername || 'admin',
                isFirstLogin
            });

            // Show modal if first login
            if (isFirstLogin) {
                setShowChangePasswordModal(true);
            }
        }

        setLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            const response = await api.post('/auth/login', { username, password });

            if (response.data.success) {
                const { token, username: returnedUsername, isFirstLogin } = response.data;
                localStorage.setItem('token', token);
                localStorage.setItem('username', returnedUsername);
                localStorage.setItem('isFirstLogin', isFirstLogin ? 'true' : 'false');

                setUser({
                    token,
                    username: returnedUsername,
                    isFirstLogin
                });

                return { success: true, isFirstLogin };
            }

            return { success: false, message: response.data.message };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Login failed'
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('isFirstLogin');
        setUser(null);
        setShowChangePasswordModal(false);
    };

    const updateUserCredentials = (newUsername) => {
        localStorage.setItem('username', newUsername);
        localStorage.setItem('isFirstLogin', 'false');
        setUser(prev => ({
            ...prev,
            username: newUsername,
            isFirstLogin: false
        }));
        setShowChangePasswordModal(false);
    };

    const openChangePasswordModal = () => {
        setShowChangePasswordModal(true);
    };

    const closeChangePasswordModal = () => {
        // Mark first login as complete when closing
        localStorage.setItem('isFirstLogin', 'false');
        if (user) {
            setUser(prev => ({ ...prev, isFirstLogin: false }));
        }
        setShowChangePasswordModal(false);
    };

    const value = {
        user,
        login,
        logout,
        loading,
        isAuthenticated: !!user,
        showChangePasswordModal,
        openChangePasswordModal,
        closeChangePasswordModal,
        updateUserCredentials
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }

    return context;
};
