import PropTypes from 'prop-types';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { supabase } from 'lib/supabase';

const AuthContext = createContext(null);

function mapAdminUser(authUser, adminRow) {
  if (!authUser) return null;
  return {
    id: authUser.id,
    email: authUser.email,
    name: adminRow?.name || authUser.user_metadata?.name || 'Fema AI Admin',
    role: adminRow?.role || authUser.user_metadata?.role || 'Administrator',
    loggedInAt: new Date().toISOString()
  };
}

async function fetchAdminProfile(userId) {
  const { data, error } = await supabase.from('admin_users').select('id, email, name, role, is_active').eq('id', userId).maybeSingle();

  if (error) {
    throw error;
  }

  if (!data || !data.is_active) {
    return null;
  }

  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const resolveSession = useCallback(async (session) => {
    if (!session?.user) {
      setUser(null);
      return;
    }

    try {
      const adminRow = await fetchAdminProfile(session.user.id);
      if (!adminRow) {
        await supabase.auth.signOut();
        setUser(null);
        return;
      }
      setUser(mapAdminUser(session.user, adminRow));
    } catch {
      await supabase.auth.signOut();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      await resolveSession(data.session);
      if (mounted) setLoading(false);
    };

    init();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      resolveSession(session).finally(() => {
        if (mounted) setLoading(false);
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [resolveSession]);

  const login = useCallback(async (email, password) => {
    const normalized = String(email || '')
      .trim()
      .toLowerCase();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalized,
      password
    });

    if (error) {
      return { ok: false, error: error.message || 'Invalid email or password' };
    }

    try {
      const adminRow = await fetchAdminProfile(data.user.id);
      if (!adminRow) {
        await supabase.auth.signOut();
        return { ok: false, error: 'This account is not authorized for the admin panel.' };
      }
      setUser(mapAdminUser(data.user, adminRow));
      return { ok: true };
    } catch {
      await supabase.auth.signOut();
      return { ok: false, error: 'Unable to verify admin access. Try again.' };
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      logout
    }),
    [user, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = { children: PropTypes.node };

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

export default AuthContext;
