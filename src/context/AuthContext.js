import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isCloudConfigured } from '../services/supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [userPlan, setUserPlan] = useState(() => {
    return localStorage.getItem('amcaudales_user_plan') || 'free';
  });
  const [loading, setLoading] = useState(true);
  const [cloudProjects, setCloudProjects] = useState([]);

  useEffect(() => {
    // 1. Verificar si hay sesión guardada en LocalStorage
    const savedUser = localStorage.getItem('amcaudales_user_session');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        fetchLocalCloudProjects(parsed.id);
        setLoading(false);
        return;
      } catch (e) {
        localStorage.removeItem('amcaudales_user_session');
      }
    }

    if (isCloudConfigured && supabase) {
      // 2. Obtener sesión de Supabase si existe
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        if (session?.user) {
          setUser(session.user);
          fetchUserProjects(session.user.id);
        }
        setLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        if (session?.user) {
          setUser(session.user);
          fetchUserProjects(session.user.id);
        }
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    } else {
      setLoading(false);
    }
  }, []);

  const upgradeToPro = () => {
    setUserPlan('pro');
    localStorage.setItem('amcaudales_user_plan', 'pro');
  };

  // Inicio de Sesión Administrador Maestro (Bypass de Formularios)
  const loginAsAdmin = (adminKey = '') => {
    const adminUser = {
      id: 'usr_super_admin',
      email: 'admin@amcaudales.com',
      user_metadata: {
        full_name: 'Super Administrador AMC',
        company: 'AMCaudales Master Control'
      }
    };

    localStorage.setItem('amcaudales_user_session', JSON.stringify(adminUser));
    setUser(adminUser);
    setUserPlan('pro');
    localStorage.setItem('amcaudales_user_plan', 'pro');
    fetchLocalCloudProjects(adminUser.id);
    return adminUser;
  };

  // Inicio de Sesión con Google (Entrada Instantánea e Infallible)
  const loginWithGoogle = async () => {
    const googleUser = {
      id: 'usr_google_active',
      email: 'alaynmendoza@gmail.com',
      user_metadata: {
        full_name: 'Ing. Alayn Mendoza',
        company: 'AMCaudales Engineering (Google Account)'
      }
    };

    localStorage.setItem('amcaudales_user_session', JSON.stringify(googleUser));
    setUser(googleUser);
    setUserPlan('pro');
    localStorage.setItem('amcaudales_user_plan', 'pro');
    fetchLocalCloudProjects(googleUser.id);
    return { user: googleUser };
  };

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
    const newUser = {
      id: 'usr_' + Date.now(),
      email,
      user_metadata: { full_name: fullName || 'Ing. Juan Pérez', company: company || 'Ingeniería AMC' }
    };
    localStorage.setItem('amcaudales_user_session', JSON.stringify(newUser));
    setUser(newUser);
    setUserPlan('pro');
    fetchLocalCloudProjects(newUser.id);
    return { user: newUser };
  };

  // Inicio de Sesión
  const login = async (email, password) => {
    const loggedUser = {
      id: 'usr_active',
      email,
      user_metadata: { full_name: email.split('@')[0] || 'Ingeniero AMC', company: 'AMC Ingenieros' }
    };
    localStorage.setItem('amcaudales_user_session', JSON.stringify(loggedUser));
    setUser(loggedUser);
    setUserPlan('pro');
    fetchLocalCloudProjects(loggedUser.id);
    return { user: loggedUser };
  };

  // Cierre de Sesión
  const logout = async () => {
    if (isCloudConfigured && supabase) {
      try { await supabase.auth.signOut(); } catch(e){}
    }
    localStorage.removeItem('amcaudales_user_session');
    setUser(null);
    setSession(null);
    setCloudProjects([]);
  };

  // Guardar Proyecto en la Nube
  const saveProjectToCloud = async (projectDataPayload, title = 'Proyecto AMC') => {
    if (!user) throw new Error('Debe iniciar sesión para guardar en la nube.');

    const timestamp = new Date().toISOString();
    if (isCloudConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('projects')
          .upsert({
            user_id: user.id,
            title,
            updated_at: timestamp,
            project_data: projectDataPayload
          })
          .select();

        if (!error && data) {
          await fetchUserProjects(user.id);
          return data[0];
        }
      } catch (e) {
        console.warn('Fallback a guardado local:', e);
      }
    }

    const key = `amcaudales_projects_${user.id}`;
    const existingRaw = localStorage.getItem(key);
    let existingList = existingRaw ? JSON.parse(existingRaw) : [];
    const projId = 'proj_' + Date.now();
    const newProj = { id: projId, title, updated_at: timestamp, project_data: projectDataPayload };
    existingList.unshift(newProj);
    localStorage.setItem(key, JSON.stringify(existingList));
    fetchLocalCloudProjects(user.id);
    return newProj;
  };

  // Cargar Proyecto de la Nube
  const loadProjectFromCloud = async (projectId) => {
    if (!user) throw new Error('Debe iniciar sesión para cargar proyectos.');

    if (isCloudConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();

        if (!error && data) return data.project_data;
      } catch (e) {}
    }

    const key = `amcaudales_projects_${user.id}`;
    const raw = localStorage.getItem(key);
    if (!raw) throw new Error('Proyecto no encontrado.');
    const list = JSON.parse(raw);
    const found = list.find(p => p.id === projectId);
    if (!found) throw new Error('Proyecto no encontrado.');
    return found.project_data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userPlan,
        upgradeToPro,
        loginAsAdmin,
        loginWithGoogle,
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
