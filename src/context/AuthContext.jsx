import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loggingOut, setLoggingOut] = useState(false);

    useEffect(() => {
        // Restore user from localStorage
        const saved = localStorage.getItem('domushr_user');
        const token = localStorage.getItem('domushr_token');
        if (saved && token) {
            try {
                setUser(JSON.parse(saved));
                api.setToken(token);
            } catch { }
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        const data = await api.login(username, password);
        const userData = data.user;
        setUser(userData);
        localStorage.setItem('domushr_user', JSON.stringify(userData));
        return userData;
    };

    const logout = async () => {
        setLoggingOut(true);
        // Wait for the logout animation to play
        await new Promise(resolve => setTimeout(resolve, 1800));
        setUser(null);
        api.setToken(null);
        localStorage.removeItem('domushr_user');
        localStorage.removeItem('domushr_token');
        setLoggingOut(false);
    };

    const updateUsername = async (newUsername) => {
        if (!user) throw new Error('Tidak ada user yang login');
        // Note: username update would need a backend endpoint
        // For now, update locally
        const updated = { ...user, username: newUsername };
        setUser(updated);
        localStorage.setItem('domushr_user', JSON.stringify(updated));
    };

    const updateName = async (newName) => {
        if (!user) throw new Error('Tidak ada user yang login');
        const updated = { ...user, name: newName };
        setUser(updated);
        localStorage.setItem('domushr_user', JSON.stringify(updated));
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, loggingOut, updateUsername, updateName }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be inside AuthProvider');
    return ctx;
}
