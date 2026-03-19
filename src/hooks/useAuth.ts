import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { MeshUser } from '../types';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [meshUser, setMeshUser] = useState<MeshUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthUser(session?.user ?? null);
      if (session?.user) {
        fetchMeshUser(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
      if (session?.user) {
        fetchMeshUser(session.user.id);
      } else {
        setMeshUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchMeshUser = async (userId: string) => {
    const { data, error } = await supabase
      .from('mesh_users')
      .select('*')
      .eq('id', userId)
      .single();

    if (data && !error) {
      setMeshUser(data);
      localStorage.setItem('mesh_last_role', data.role);
      localStorage.setItem('mesh_last_is_gm', data.is_gm ? 'true' : 'false');
      // Set online status
      await supabase.from('mesh_users').update({ is_online: true }).eq('id', userId);
    }
    setLoading(false);
  };

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const logout = useCallback(async () => {
    if (meshUser) {
      await supabase.from('mesh_users').update({ is_online: false }).eq('id', meshUser.id);
    }
    await supabase.auth.signOut();
    setMeshUser(null);
  }, [meshUser]);

  const signup = async (email: string, password: string, handle: string, displayName: string, role: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error };

    if (data.user) {
      const { error: profileError } = await supabase.from('mesh_users').insert({
        id: data.user.id,
        handle,
        display_name: displayName,
        role,
        colour_scheme: 'green',
        is_gm: false,
        is_online: true,
      });
      if (profileError) return { error: profileError };
    }

    return { error: null };
  };

  return { authUser, meshUser, loading, login, logout, signup, setMeshUser };
}
