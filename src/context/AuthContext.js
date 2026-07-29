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

  const checkCanCreateProject = () => {
    if (userPlan === 'pro') return true;
    // Plan Gratis: Máximo 5 proyectos o 1 diseño completo
    return cloudProjects.length < 5;
  };

  const loginAsGuest = () => {
    const guestUser = {
      id: 'usr_guest',
      email: 'invitado@amcaudales.com',
      user_metadata: {
        full_name: 'Usuario Invitado',
        company: 'Modo Prueba Freemium'
      }
    };
    localStorage.setItem('amcaudales_user_session', JSON.stringify(guestUser));
    setUser(guestUser);
    setUserPlan('free');
    localStorage.setItem('amcaudales_user_plan', 'free');
    fetchLocalCloudProjects(guestUser.id);
    return guestUser;
  };

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

  const loginWithGoogle = async () => {
    const googleUser = {
      id: 'usr_google_active',
      email: 'norman.castillo@amcaudales.com',
      user_metadata: {
        full_name: 'Norman Castillo',
        company: 'Ingeniería AMC (Google Account)'
      }
    };

    localStorage.setItem('amcaudales_user_session', JSON.stringify(googleUser));
    setUser(googleUser);
    const storedPlan = localStorage.getItem('amcaudales_user_plan') || 'pro';
    setUserPlan(storedPlan);
    fetchLocalCloudProjects(googleUser.id);
    return { user: googleUser };
  };

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

  const fetchLocalCloudProjects = (userId) => {
    const key = `amcaudales_projects_${userId}`;
    const raw = localStorage.getItem(key);
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

  const register = async (email, password, fullName, company) => {
    const newUser = {
      id: 'usr_' + Date.now(),
      email,
      user_metadata: { full_name: fullName || 'Ingeniero AMC', company: company || 'Ingeniería AMC' }
    };
    localStorage.setItem('amcaudales_user_session', JSON.stringify(newUser));
    setUser(newUser);
    setUserPlan('free');
    localStorage.setItem('amcaudales_user_plan', 'free');
    fetchLocalCloudProjects(newUser.id);
    return { user: newUser };
  };

  const login = async (email, password) => {
    const loggedUser = {
      id: 'usr_active',
      email,
      user_metadata: { full_name: email.split('@')[0] || 'Ingeniero AMC', company: 'AMC Ingenieros' }
    };
    localStorage.setItem('amcaudales_user_session', JSON.stringify(loggedUser));
    setUser(loggedUser);
    const storedPlan = localStorage.getItem('amcaudales_user_plan') || 'free';
    setUserPlan(storedPlan);
    fetchLocalCloudProjects(loggedUser.id);
    return { user: loggedUser };
  };

  const logout = async () => {
    if (isCloudConfigured && supabase) {
      try { await supabase.auth.signOut(); } catch(e){}
    }
    localStorage.removeItem('amcaudales_user_session');
    setUser(null);
    setSession(null);
    setCloudProjects([]);
  };

  const saveProjectToCloud = async (projectDataPayload, title = 'Proyecto AMC') => {
    const effectiveUser = user || { id: 'usr_guest', email: 'invitado@amcaudales.com' };
    const timestamp = new Date().toISOString();

    if (isCloudConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('projects')
          .upsert({
            id: 'proj_' + Date.now(),
            user_id: effectiveUser.id,
            title,
            updated_at: timestamp,
            project_data: projectDataPayload
          })
          .select();

        if (!error && data) {
          await fetchUserProjects(effectiveUser.id);
          return data[0];
        }
      } catch (e) {
        console.warn('Fallback a guardado local:', e);
      }
    }

    const key = `amcaudales_projects_${effectiveUser.id}`;
    const existingRaw = localStorage.getItem(key);
    let existingList = existingRaw ? JSON.parse(existingRaw) : [];
    const projId = 'proj_' + Date.now();
    const newProj = { id: projId, title, updated_at: timestamp, project_data: projectDataPayload };
    existingList.unshift(newProj);
    localStorage.setItem(key, JSON.stringify(existingList));
    fetchLocalCloudProjects(effectiveUser.id);
    return newProj;
  };

  const loadProjectFromCloud = async (projectId) => {
    const effectiveUser = user || { id: 'usr_guest' };

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

    const key = `amcaudales_projects_${effectiveUser.id}`;
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
        checkCanCreateProject,
        loginAsGuest,
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
