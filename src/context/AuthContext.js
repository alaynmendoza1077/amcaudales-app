import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isCloudConfigured } from '../services/supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cloudProjects, setCloudProjects] = useState([]);

  useEffect(() => {
    if (isCloudConfigured && supabase) {
      // 1. Obtener sesión actual de Supabase
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchUserProjects(session.user.id);
        }
        setLoading(false);
      });

      // 2. Escuchar cambios de autenticación
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchUserProjects(session.user.id);
        } else {
          setCloudProjects([]);
        }
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    } else {
      // Modo Local / Simulación de Sesión con LocalStorage
      const savedUser = localStorage.getItem('amcaudales_user_session');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          setUser(parsed);
          fetchLocalCloudProjects(parsed.id);
        } catch (e) {
          localStorage.removeItem('amcaudales_user_session');
        }
      }
      setLoading(false);
    }
  }, []);

  // Fetch proyectos en Supabase
  const fetchUserProjects = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, updated_at, created_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setCloudProjects(data || []);
    } catch (err) {
      console.warn('Error al cargar proyectos de la nube:', err.message);
    }
  };

  // Fetch proyectos locales (modo Offline/Local)
  const fetchLocalCloudProjects = (userId) => {
    const raw = localStorage.getItem(`amcaudales_projects_${userId}`);
    if (raw) {
      try {
        const list = JSON.parse(raw);
        setCloudProjects(list.map(p => ({ id: p.id, title: p.title, updated_at: p.updated_at })));
      } catch (e) {
        setCloudProjects([]);
      }
    } else {
      setCloudProjects([]);
    }
  };

  // Registro de usuario
  const register = async (email, password, fullName, company) => {
    if (isCloudConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, company }
        }
      });
      if (error) throw error;
      return data;
    } else {
      // Simulación Local
      const mockUser = {
        id: 'usr_' + Date.now(),
        email,
        user_metadata: { full_name: fullName || email.split('@')[0], company: company || 'Ingeniería AMC' }
      };
      localStorage.setItem('amcaudales_user_session', JSON.stringify(mockUser));
      setUser(mockUser);
      fetchLocalCloudProjects(mockUser.id);
      return { user: mockUser };
    }
  };

  // Inicio de Sesión
  const login = async (email, password) => {
    if (isCloudConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      return data;
    } else {
      // Simulación Local
      const mockUser = {
        id: 'usr_local',
        email,
        user_metadata: { full_name: email.split('@')[0], company: 'AMC Ingenieros' }
      };
      localStorage.setItem('amcaudales_user_session', JSON.stringify(mockUser));
      setUser(mockUser);
      fetchLocalCloudProjects(mockUser.id);
      return { user: mockUser };
    }
  };

  // Cierre de Sesión
  const logout = async () => {
    if (isCloudConfigured && supabase) {
      await supabase.auth.signOut();
    } else {
      localStorage.removeItem('amcaudales_user_session');
    }
    setUser(null);
    setSession(null);
    setCloudProjects([]);
  };

  // Guardar Proyecto en la Nube
  const saveProjectToCloud = async (projectDataPayload, title = 'Proyecto AMC') => {
    if (!user) throw new Error('Debe iniciar sesión para guardar en la nube.');

    const timestamp = new Date().toISOString();
    const payload = {
      title,
      updated_at: timestamp,
      project_data: projectDataPayload
    };

    if (isCloudConfigured && supabase) {
      const { data, error } = await supabase
        .from('projects')
        .upsert({
          user_id: user.id,
          title,
          updated_at: timestamp,
          project_data: projectDataPayload
        })
        .select();

      if (error) throw error;
      await fetchUserProjects(user.id);
      return data[0];
    } else {
      // Guardar en Storage Local por usuario
      const key = `amcaudales_projects_${user.id}`;
      const existingRaw = localStorage.getItem(key);
      let existingList = existingRaw ? JSON.parse(existingRaw) : [];
      const projId = 'proj_' + Date.now();
      const newProj = { id: projId, title, updated_at: timestamp, project_data: projectDataPayload };
      existingList.unshift(newProj);
      localStorage.setItem(key, JSON.stringify(existingList));
      fetchLocalCloudProjects(user.id);
      return newProj;
    }
  };

  // Cargar Proyecto de la Nube
  const loadProjectFromCloud = async (projectId) => {
    if (!user) throw new Error('Debe iniciar sesión para cargar proyectos.');

    if (isCloudConfigured && supabase) {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return data.project_data;
    } else {
      const key = `amcaudales_projects_${user.id}`;
      const raw = localStorage.getItem(key);
      if (!raw) throw new Error('Proyecto no encontrado.');
      const list = JSON.parse(raw);
      const found = list.find(p => p.id === projectId);
      if (!found) throw new Error('Proyecto no encontrado.');
      return found.project_data;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        cloudProjects,
        register,
        login,
        logout,
        saveProjectToCloud,
        loadProjectFromCloud,
        isCloudConfigured
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
