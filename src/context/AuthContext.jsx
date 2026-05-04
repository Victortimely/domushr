import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loggingOut, setLoggingOut] = useState(false);

    useEffect(() => {
        let mounted = true;

        // Safety timeout — if auth takes more than 8 seconds, stop loading
        const safetyTimer = setTimeout(() => {
            if (mounted) {
                console.warn('Auth initialization timed out after 8s, falling back to logged-out state.');
                setLoading(false);
            }
        }, 8000);

        // IMPORTANT: The onAuthStateChange callback MUST NOT be async.
        // Supabase holds a Web Lock during the callback. If we await inside it,
        // the lock is not released and causes "Lock not released within 5000ms" errors.
        // Instead, we defer async work (fetchProfile) to the next microtask.
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            console.log("Auth state change:", event);

            if (event === 'SIGNED_OUT') {
                if (mounted) {
                    setUser(null);
                    setLoading(false);
                    clearTimeout(safetyTimer);
                }
                return;
            }

            if (session?.user && mounted) {
                // Defer async profile fetch to release the auth lock first
                clearTimeout(safetyTimer);
                const authUser = session.user;
                setTimeout(() => {
                    if (mounted) {
                        fetchProfile(authUser);
                    }
                }, 0);
            } else if (event === 'INITIAL_SESSION' && !session) {
                if (mounted) {
                    setUser(null);
                    setLoading(false);
                    clearTimeout(safetyTimer);
                }
            }
        });

        return () => {
            mounted = false;
            clearTimeout(safetyTimer);
            authListener.subscription.unsubscribe();
        };
    }, []);

    const fetchProfile = async (authUser) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authUser.id)
                .single();
            
            if (error) throw error;

            setUser({
                id: data.id,
                username: data.username,
                name: data.full_name,
                role: data.role
            });
        } catch (error) {
            console.error('Error fetching profile:', error);
            // Fallback if profile doesn't exist yet but trigger should have created it
            setUser({
               id: authUser.id,
               username: authUser.user_metadata?.preferred_username || authUser.email,
               name: authUser.user_metadata?.full_name || 'User',
               role: 'surveyor'
            });
        } finally {
            setLoading(false);
        }
    };

    const loginWithGithub = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: 'https://domushr.vercel.app'
            }
        });
        if (error) throw error;
    };

    const loginWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: 'https://domushr.vercel.app'
            }
        });
        if (error) throw error;
    };

    const loginWithEmail = async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) throw error;
    };

    const signUpWithEmail = async (email, password, fullName) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
                emailRedirectTo: 'https://domushr.vercel.app'
            }
        });
        if (error) throw error;
    };

    const logout = async () => {
        setLoggingOut(true);
        await new Promise(resolve => setTimeout(resolve, 1800)); // wait for animation
        const { error } = await supabase.auth.signOut();
        setLoggingOut(false);
        if (error) throw error;
    };

    const updateName = async (newName) => {
        if (!user) throw new Error('Tidak ada user yang login');
        const { error } = await supabase.from('profiles').update({ full_name: newName }).eq('id', user.id);
        if (error) throw error;
        setUser({ ...user, name: newName });
    };

    return (
        <AuthContext.Provider value={{ user, loginWithGithub, loginWithGoogle, loginWithEmail, signUpWithEmail, logout, loading, loggingOut, updateName }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be inside AuthProvider');
    return ctx;
}
