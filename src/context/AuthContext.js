import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isCloudConfigured } from '../services/supabaseClient';

const AuthContext = createContext();

/**
 * Helper universal para construir el objeto de usuario estandarizado
 * a partir de los datos retornados por Supabase Auth (Google OAuth o Correo/Password).
 */
export const buildAuthUser = (sbUser) => {
  if (!sbUser) return null;
  const meta = sbUser.user_metadata || {};
  const idData = sbUser.identities?.[0]?.identity_data || {};

  // Extraer nombre real desde Google OAuth o registro
  const realFullName =
    meta.full_name ||
    meta.name ||
    idData.full_name ||
    idData.name ||
    (meta.given_name ? `${meta.given_name} ${meta.family_name || ''}`.trim() : '') ||
    sbUser.email?.split('@')[0] ||
    'Usuario';

  // Extraer foto de perfil de Google si existe
  const avatarUrl =
    meta.avatar_url ||
    meta.picture ||
    idData.avatar_url ||
    idData.picture ||
    sbUser.avatarUrl ||
    null;

  const plan = meta.plan || 'pro';

  return {
    ...sbUser,
    id: sbUser.id,
    email: sbUser.email,
    isGuest: false,
    isAdmin: Boolean(meta.isAdmin || plan === 'pro'),
    avatarUrl,
    user_metadata: {
      ...meta,
      full_name: realFullName,
      name: realFullName,
      avatar_url: avatarUrl,
      company: meta.company || 'Ingeniería AMC',
      plan: 'pro'
    }
  };
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [userPlan, setUserPlan] = useState(() => {
    return localStorage.getItem('amcaudales_user_plan') || 'free';
  });
  const [loading, setLoading] = useState(true);
  const [cloudProjects, setCloudProjects] = useState([]);

  const hashPassword = async (pass) => {
    const raw = String(pass || '').trim();
    if (!raw) return '';
    try {
      if (window.crypto && window.crypto.subtle) {
        const encoder = new TextEncoder();
        const data = encoder.encode(raw + '_amcaudales_salt_2026');
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (e) {}
    try {
      return btoa(raw + '_amc2026');
    } catch (e) {
      return raw;
    }
  };

  const syncAccountToCloud = async (userData, plainPassword = null) => {
    if (!isCloudConfigured || !supabase || !userData || !userData.email) return;
    try {
      const cleanSlug = userData.email.replace(/[^a-z0-9]/g, '_');
      const recordId = `sys_account_${cleanSlug}`;
      const hashedPass = plainPassword ? await hashPassword(plainPassword) : null;

      const accountPayload = {
        id: userData.id || `usr_${cleanSlug}`,
        email: userData.email,
        fullName: userData.user_metadata?.full_name || userData.email.split('@')[0],
        company: userData.user_metadata?.company || 'Ingeniería AMC',
        plan: 'pro',
        isAdmin: true,
        passwordHash: hashedPass || (userData.passwordHash || null),
        passwordPlain: plainPassword || (userData.passwordPlain || null),
        updated_at: new Date().toISOString()
      };

      await supabase
        .from('projects')
        .upsert({
          id: recordId,
          user_id: userData.id || 'usr_sys_registry',
          title: `AUTH_ACCOUNT: ${userData.email}`,
          updated_at: new Date().toISOString(),
          project_data: accountPayload
        });
    } catch (err) {
      console.warn('Aviso sincronización cuenta a la nube:', err.message);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      const urlHash = window.location.hash || '';
      const urlSearch = window.location.search || '';
      const urlParams = new URLSearchParams(urlSearch);
      const authCode = urlParams.get('code');
      const isOAuthReturn = Boolean(authCode || urlHash.includes('access_token') || urlHash.includes('type=recovery'));

      // 1. Manejo prioritario de retorno OAuth (Google / Magic Link)
      try {
        if (isCloudConfigured && supabase) {
          // Si regresamos con código PKCE en la URL (?code=...)
          if (authCode) {
            try {
              // En Supabase JS v2 se debe pasar SOLO el código string extraído
              const { data: exchData, error: exchError } = await supabase.auth.exchangeCodeForSession(authCode);
              if (exchError) {
                console.warn('Aviso exchangeCodeForSession:', exchError.message);
              } else if (exchData?.session) {
                // Intercambio exitoso
              }
            } catch (exchEx) {
              console.warn('Excepción exchangeCodeForSession:', exchEx.message);
            }
          }

          // Consultar sesión activa de Supabase
          const { data, error } = await supabase.auth.getSession();
          if (error) {
            console.warn('Aviso Supabase getSession:', error.message);
          }

          if (data?.session?.user && isMounted) {
            const authUserObj = buildAuthUser(data.session.user);

            setSession(data.session);
            setUser(authUserObj);
            setUserPlan('pro');
            localStorage.setItem('amcaudales_user_plan', 'pro');
            localStorage.setItem('amcaudales_auth_user', JSON.stringify(authUserObj));
            localStorage.removeItem('amcaudales_user_session');

            // Limpiar parámetros de la URL sin recargar la página
            if (isOAuthReturn && window.history && window.history.replaceState) {
              window.history.replaceState(null, '', window.location.pathname);
            }

            syncAccountToCloud(authUserObj, null);
            await fetchUserProjects(authUserObj.id, data.session);
            if (isMounted) setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Error inicializando sesión de Supabase:', err);
      }

      // 2. Si no hay sesión en Supabase y no es un retorno OAuth, verificar localStorage
      if (isMounted) {
        const savedAuth = localStorage.getItem('amcaudales_auth_user');
        if (savedAuth) {
          try {
            const parsedAuth = JSON.parse(savedAuth);
            if (parsedAuth && parsedAuth.id && !parsedAuth.isGuest) {
              const fullParsed = buildAuthUser(parsedAuth);

              setUser(fullParsed);
              setUserPlan('pro');
              localStorage.setItem('amcaudales_user_plan', 'pro');
              localStorage.removeItem('amcaudales_user_session');
              syncAccountToCloud(fullParsed, null);
              await fetchUserProjects(fullParsed.id, null);
              setLoading(false);
              return;
            }
          } catch (e) {
            localStorage.removeItem('amcaudales_auth_user');
          }
        }

        // 3. Fallback a sesión de invitado sólo si el usuario la guardó previamente
        const savedGuest = localStorage.getItem('amcaudales_user_session');
        if (savedGuest) {
          try {
            const parsedGuest = JSON.parse(savedGuest);
            setUser(parsedGuest);
            const savedPlan = parsedGuest.isAdmin ? 'pro' : (localStorage.getItem('amcaudales_user_plan') || 'free');
            setUserPlan(savedPlan);
            await fetchUserProjects(parsedGuest.id, null);
          } catch (e) {
            localStorage.removeItem('amcaudales_user_session');
          }
        }
        setLoading(false);
      }
    };

    initializeAuth();

    let subscription = null;
    if (isCloudConfigured && supabase) {
      try {
        const authListener = supabase.auth.onAuthStateChange(async (event, newSession) => {
          if (!isMounted) return;
          setSession(newSession);

          if (newSession?.user) {
            const authUserObj = buildAuthUser(newSession.user);
            setUser(authUserObj);
            setUserPlan('pro');
            localStorage.setItem('amcaudales_user_plan', 'pro');
            localStorage.setItem('amcaudales_auth_user', JSON.stringify(authUserObj));
            localStorage.removeItem('amcaudales_user_session');
            await fetchUserProjects(authUserObj.id, newSession);

            if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('type=recovery'))) {
              window.history.replaceState(null, '', window.location.pathname);
            }
            if (window.location.search && window.location.search.includes('code=')) {
              window.history.replaceState(null, '', window.location.pathname);
            }
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setSession(null);
            setCloudProjects([]);
            localStorage.removeItem('amcaudales_auth_user');
            localStorage.removeItem('amcaudales_user_session');
          }
          setLoading(false);
        });
        subscription = authListener.data?.subscription;
      } catch (e) {
        console.warn('Error configurando onAuthStateChange:', e);
      }
    }

    return () => {
      isMounted = false;
      if (subscription?.unsubscribe) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const upgradeToPro = async () => {
    setUserPlan('pro');
    localStorage.setItem('amcaudales_user_plan', 'pro');
    if (user && !user.isGuest) {
      const updatedUser = {
        ...user,
        user_metadata: { ...user.user_metadata, plan: 'pro' }
      };
      setUser(updatedUser);
      localStorage.setItem('amcaudales_auth_user', JSON.stringify(updatedUser));
      if (isCloudConfigured && supabase && !user.isGuest) {
        try {
          await supabase.auth.updateUser({
            data: { plan: 'pro' }
          });
        } catch (e) {
          console.warn('No se pudo actualizar metadata en Supabase:', e);
        }
      }
    }
  };

  const checkCanCreateProject = () => {
    if (userPlan === 'pro' || user?.isAdmin) return true;
    const cloudCount = cloudProjects.filter(p => p.isCloud).length;
    return cloudCount < 1;
  };

  const loginAsGuest = () => {
    const guestUser = {
      id: 'usr_guest',
      email: 'invitado@amcaudales.com',
      isGuest: true,
      user_metadata: {
        full_name: 'Usuario Invitado',
        company: 'Modo Prueba Freemium'
      }
    };
    localStorage.removeItem('amcaudales_auth_user');
    localStorage.setItem('amcaudales_user_session', JSON.stringify(guestUser));
    setUser(guestUser);
    setUserPlan('free');
    localStorage.setItem('amcaudales_user_plan', 'free');
    fetchUserProjects(guestUser.id, null);
    return guestUser;
  };

  const loginAsAdmin = (adminKey = '') => {
    const key = (adminKey || '').trim().toUpperCase();
    if (key !== 'ADMIN2026' && key !== 'AMC2026' && key !== 'AMCAUDALES2026' && key !== 'EMPAS2026') {
      throw new Error('Clave Maestra de Administrador incorrecta. Ingrese una clave autorizada.');
    }

    const adminUser = {
      id: 'usr_super_admin',
      email: 'admin@amcaudales.com',
      isAdmin: true,
      isGuest: false,
      user_metadata: {
        full_name: 'Super Administrador AMC',
        company: 'AMCaudales Master Control',
        plan: 'pro'
      }
    };

    localStorage.removeItem('amcaudales_user_session');
    localStorage.setItem('amcaudales_auth_user', JSON.stringify(adminUser));
    setUser(adminUser);
    setUserPlan('pro');
    localStorage.setItem('amcaudales_user_plan', 'pro');
    fetchUserProjects(adminUser.id, null);
    return adminUser;
  };

  // Aliases de compatibilidad interna
  const loginAsEmpas = async () => {
    return loginAsAdmin('AMC2026');
  };

  const loginAsAlayn = async () => {
    return loginAsAdmin('AMC2026');
  };

  /**
   * Inicio y registro universal con Google OAuth
   */
  const loginWithGoogle = async () => {
    if (!isCloudConfigured || !supabase) {
      throw new Error('Supabase no está configurado para OAuth.');
    }
    try {
      const redirectUri = window.location.origin;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account'
          }
        }
      });
      if (error) {
        throw error;
      }
      if (data?.url) {
        window.location.href = data.url;
      }
      return data;
    } catch (err) {
      console.error('Error signInWithOAuth Google:', err);
      throw new Error(err.message || 'Error al conectar con Google OAuth.');
    }
  };

  const resetPassword = async (email) => {
    if (!email || !email.includes('@')) {
      throw new Error('Por favor ingrese un correo electrónico válido.');
    }
    if (isCloudConfigured && supabase) {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin
      });
      if (error) {
        throw new Error(error.message);
      }
      return data;
    }
    return { success: true, message: 'Enlace enviado a su correo electrónico.' };
  };

  const fetchUserProjects = async (userId, activeSession = session) => {
    if (!userId) return;
    let cloudList = [];
    const isGuest = Boolean(userId === 'usr_guest');

    if (!isGuest && isCloudConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id, title, updated_at, created_at')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          cloudList = data
            .filter(p => p && !String(p.id).startsWith('sys_account_') && p.user_id !== 'sys_auth_registry')
            .map(p => ({ ...p, isCloud: true }));
        } else if (error) {
          console.warn('Aviso carga proyectos Supabase:', error.message);
        }
      } catch (err) {
        console.warn('Error al cargar proyectos de la nube:', err.message);
      }
    }

    const localKeys = [
      `amcaudales_projects_${userId}`,
      'amcaudales_projects_usr_guest',
      'amcaudales_projects_usr_active',
      'amcaudales_projects_usr_super_admin'
    ];

    let recoveredLocalProjects = [];
    localKeys.forEach(k => {
      try {
        const raw = localStorage.getItem(k);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            list.forEach(p => {
              if (p && p.id && !String(p.id).startsWith('sys_account_') && !cloudList.some(cp => cp.id === p.id) && !recoveredLocalProjects.some(rp => rp.id === p.id)) {
                recoveredLocalProjects.push({
                  id: p.id,
                  title: p.title ? `${p.title}` : 'Proyecto Local',
                  updated_at: p.updated_at || new Date().toISOString(),
                  isCloud: false,
                  isLocalRecovered: true
                });
              }
            });
          }
        }
      } catch (e) {}
    });

    try {
      const rawCurrent = localStorage.getItem('AMC_current_project_state');
      if (rawCurrent) {
        const parsedCurrent = JSON.parse(rawCurrent);
        if (parsedCurrent && (parsedCurrent.P || parsedCurrent.T)) {
          const activeProjId = 'proj_active_draft';
          if (!cloudList.some(cp => cp.id === activeProjId) && !recoveredLocalProjects.some(rp => rp.id === activeProjId)) {
            recoveredLocalProjects.unshift({
              id: activeProjId,
              title: parsedCurrent.P?.proyecto ? `${parsedCurrent.P.proyecto} (Borrador Activo)` : 'Borrador de Trabajo previo',
              updated_at: parsedCurrent.timestamp || new Date().toISOString(),
              isCloud: false,
              isDraft: true,
              isLocalRecovered: true
            });
          }
        }
      }
    } catch (e) {}

    const combinedList = [...cloudList, ...recoveredLocalProjects];
    setCloudProjects(combinedList);
  };

  /**
   * Registro universal con Correo y Contraseña
   */
  const register = async (email, password, fullName, company) => {
    const rawEmail = (email || '').trim().toLowerCase();
    if (!rawEmail || !rawEmail.includes('@')) {
      throw new Error('Por favor ingrese un correo electrónico válido.');
    }
    if (!password || password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres.');
    }

    const cleanName = (fullName || rawEmail.split('@')[0]).trim();
    let registeredUser = null;
    let activeSession = null;

    if (isCloudConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: rawEmail,
          password,
          options: {
            data: {
              full_name: cleanName,
              name: cleanName,
              company: company || 'Ingeniería Civil',
              plan: 'pro'
            }
          }
        });

        if (error) {
          if (error.message.includes('User already registered') || error.message.includes('already registered')) {
            throw new Error('Este correo ya está registrado. Por favor inicia sesión o ingresa con Google.');
          }
          throw new Error(error.message);
        }

        if (data?.user) {
          registeredUser = buildAuthUser(data.user);
          activeSession = data.session || null;
        }
      } catch (err) {
        throw err;
      }
    }

    if (!registeredUser) {
      const cleanSlug = rawEmail.replace(/[^a-z0-9]/g, '_');
      registeredUser = {
        id: `usr_${cleanSlug}`,
        email: rawEmail,
        isGuest: false,
        isAdmin: true,
        user_metadata: {
          full_name: cleanName,
          company: company || 'Ingeniería Civil',
          plan: 'pro'
        }
      };
    }

    setUser(registeredUser);
    setSession(activeSession);
    setUserPlan('pro');
    localStorage.setItem('amcaudales_user_plan', 'pro');
    localStorage.setItem('amcaudales_auth_user', JSON.stringify(registeredUser));
    localStorage.removeItem('amcaudales_user_session');
    await syncAccountToCloud(registeredUser, password);
    await fetchUserProjects(registeredUser.id, activeSession);
    return { user: registeredUser, session: activeSession };
  };

  /**
   * Inicio de sesión universal con Correo y Contraseña
   */
  const login = async (email, password) => {
    const rawEmail = (email || '').trim();
    const cleanPassword = (password || '').trim();
    if (!rawEmail) {
      throw new Error('Por favor ingrese su correo electrónico.');
    }
    if (!cleanPassword) {
      throw new Error('Por favor ingrese su contraseña.');
    }

    const isMasterKey = ['ADMIN2026', 'AMC2026', 'AMCAUDALES2026'].includes(cleanPassword.toUpperCase());

    // 1. Acceso con Clave Maestra de Administrador
    if (isMasterKey) {
      const cleanSlug = rawEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const adminUser = {
        id: `usr_${cleanSlug}`,
        email: rawEmail.includes('@') ? rawEmail.toLowerCase() : `${rawEmail.toLowerCase()}@amcaudales.com`,
        isAdmin: true,
        isGuest: false,
        user_metadata: {
          full_name: rawEmail.includes('@') ? rawEmail.split('@')[0].toUpperCase() : rawEmail.toUpperCase(),
          company: 'Ingeniería AMC',
          plan: 'pro'
        }
      };
      localStorage.removeItem('amcaudales_user_session');
      localStorage.setItem('amcaudales_auth_user', JSON.stringify(adminUser));
      setUser(adminUser);
      setUserPlan('pro');
      localStorage.setItem('amcaudales_user_plan', 'pro');
      await syncAccountToCloud(adminUser, cleanPassword);
      await fetchUserProjects(adminUser.id, null);
      return { user: adminUser };
    }

    // 2. Intento de inicio de sesión con Supabase Auth
    let authUser = null;
    let authSession = null;
    let sbErrorMsg = '';

    if (isCloudConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: rawEmail.toLowerCase(),
          password: cleanPassword
        });

        if (!error && data?.user) {
          authUser = data.user;
          authSession = data.session;
        } else if (error) {
          sbErrorMsg = error.message;
        }
      } catch (err) {
        sbErrorMsg = err.message;
      }
    }

    if (authUser) {
      const fullUser = buildAuthUser(authUser);
      setUser(fullUser);
      setSession(authSession);
      localStorage.setItem('amcaudales_auth_user', JSON.stringify(fullUser));
      localStorage.removeItem('amcaudales_user_session');
      setUserPlan('pro');
      localStorage.setItem('amcaudales_user_plan', 'pro');
      await syncAccountToCloud(fullUser, cleanPassword);
      await fetchUserProjects(fullUser.id, authSession);
      return { user: fullUser, session: authSession };
    }

    // 3. Mensajes claros y descriptivos si falla
    if (sbErrorMsg) {
      if (sbErrorMsg.includes('Invalid login credentials')) {
        throw new Error('Credenciales incorrectas. Si creaste tu cuenta con Google, haz clic en el botón "Continuar con Google".');
      }
      if (sbErrorMsg.includes('Email not confirmed')) {
        throw new Error('Tu correo aún no ha sido confirmado. Revisa tu bandeja de entrada o inicia sesión con Google.');
      }
      throw new Error(sbErrorMsg);
    }

    throw new Error('No se pudo iniciar sesión. Verifique sus datos o continúe con Google.');
  };

  const logout = async () => {
    if (isCloudConfigured && supabase) {
      try { await supabase.auth.signOut(); } catch (e) {}
    }
    localStorage.removeItem('amcaudales_auth_user');
    localStorage.removeItem('amcaudales_user_session');
    setUser(null);
    setSession(null);
    setCloudProjects([]);
  };

  const parsePayload = (payload) => {
    if (!payload) return null;
    if (typeof payload === 'string') {
      try { return JSON.parse(payload); } catch (e) { return null; }
    }
    return payload;
  };

  const saveLocalProject = (userId, projId, title, timestamp, projectDataPayload) => {
    const key = `amcaudales_projects_${userId}`;
    let existingList = [];
    try {
      const raw = localStorage.getItem(key);
      if (raw) existingList = JSON.parse(raw);
      if (!Array.isArray(existingList)) existingList = [];
    } catch (e) {
      existingList = [];
    }
    const updatedObj = { id: projId, title, updated_at: timestamp, project_data: projectDataPayload, isCloud: false };
    const idx = existingList.findIndex(p => p.id === projId);
    if (idx !== -1) {
      existingList[idx] = updatedObj;
    } else {
      existingList.unshift(updatedObj);
    }
    localStorage.setItem(key, JSON.stringify(existingList));
    return updatedObj;
  };

  const saveProjectToCloud = async (projectDataPayload, title = 'Proyecto AMC', existingProjectId = null, forceOverwrite = false) => {
    const effectiveUser = user || { id: 'usr_guest', email: 'invitado@amcaudales.com', isGuest: true };
    const timestamp = new Date().toISOString();
    const isGuest = Boolean(effectiveUser.isGuest || effectiveUser.id === 'usr_guest' || effectiveUser.email === 'invitado@amcaudales.com');

    try {
      localStorage.setItem('AMC_current_project_state', JSON.stringify(projectDataPayload));
    } catch (e) {
      console.warn('No se pudo guardar AMC_current_project_state:', e);
    }

    if (isGuest) {
      const projId = existingProjectId || 'proj_guest_' + Date.now();
      const updatedObj = saveLocalProject('usr_guest', projId, title, timestamp, projectDataPayload);
      updatedObj.isGuest = true;
      await fetchUserProjects('usr_guest', null);
      return updatedObj;
    }

    let activeSession = session;
    if (isCloudConfigured && supabase) {
      try {
        const { data: sessData } = await supabase.auth.getSession();
        if (sessData?.session) {
          activeSession = sessData.session;
          setSession(activeSession);
        }
      } catch (e) {}
    }

    const realUserId = activeSession?.user?.id || effectiveUser.id;
    const canSaveToSupabase = Boolean(isCloudConfigured && supabase);

    if (canSaveToSupabase) {
      const cloudOnlyList = cloudProjects.filter(p => p.isCloud);
      const isUpdatingCurrentCloudProj = existingProjectId && cloudOnlyList.some(p => p.id === existingProjectId);
      let targetProjId = existingProjectId || 'proj_' + Date.now();

      if (!isUpdatingCurrentCloudProj) {
        if (userPlan === 'free' && !effectiveUser.isAdmin) {
          if (cloudOnlyList.length >= 1) {
            if (forceOverwrite) {
              targetProjId = cloudOnlyList[0].id;
            } else {
              return {
                limitReached: true,
                plan: 'free',
                existingProject: cloudOnlyList[0],
                proposedTitle: title
              };
            }
          }
        }
      }

      try {
        const { data, error } = await supabase
          .from('projects')
          .upsert({
            id: targetProjId,
            user_id: realUserId,
            title,
            updated_at: timestamp,
            project_data: projectDataPayload
          })
          .select();

        if (error) {
          console.error('Error Supabase upsert:', error);
          saveLocalProject(realUserId, targetProjId, title, timestamp, projectDataPayload);
          throw new Error('Error al sincronizar con Supabase: ' + error.message);
        }

        if (data && data.length > 0) {
          saveLocalProject(realUserId, targetProjId, title, timestamp, projectDataPayload);
          await fetchUserProjects(realUserId, activeSession);
          return { ...data[0], isCloud: true };
        }
      } catch (err) {
        saveLocalProject(realUserId, targetProjId, title, timestamp, projectDataPayload);
        throw err;
      }
    }

    const fallbackId = existingProjectId || 'proj_local_' + Date.now();
    const localSaved = saveLocalProject(realUserId, fallbackId, title, timestamp, projectDataPayload);
    await fetchUserProjects(realUserId, activeSession);
    return localSaved;
  };

  const loadProjectFromCloud = async (projectId) => {
    const effectiveUser = user || { id: 'usr_guest' };
    const isGuest = Boolean(effectiveUser.isGuest || effectiveUser.id === 'usr_guest');

    if (projectId === 'proj_active_draft') {
      const rawCurrent = localStorage.getItem('AMC_current_project_state');
      if (rawCurrent) return parsePayload(rawCurrent);
    }

    if (!isGuest && isCloudConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();

        if (!error && data) {
          const resPayload = parsePayload(data.project_data || data);
          if (resPayload) return resPayload;
        }
      } catch (e) {
        console.warn('Error fetching cloud project, searching local fallback:', e);
      }
    }

    const localKeys = [
      `amcaudales_projects_${effectiveUser.id}`,
      'amcaudales_projects_usr_guest',
      'amcaudales_projects_usr_active',
      'amcaudales_projects_usr_super_admin'
    ];

    for (let key of localKeys) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            const found = list.find(p => p.id === projectId);
            if (found) {
              const resPayload = parsePayload(found.project_data || found);
              if (resPayload) return resPayload;
            }
          }
        } catch (e) {}
      }
    }

    throw new Error('Proyecto no encontrado en la nube ni en almacenamiento local.');
  };

  const deleteProjectFromCloud = async (projectId) => {
    if (!projectId) return false;
    const effectiveUser = user || { id: 'usr_guest' };
    const isGuest = Boolean(effectiveUser.isGuest || effectiveUser.id === 'usr_guest');

    if (!isGuest && isCloudConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', projectId);

        if (error) {
          console.warn('Error eliminando en Supabase:', error.message);
        }
      } catch (err) {
        console.warn('Excepción eliminando en Supabase:', err);
      }
    }

    const localKeys = [
      `amcaudales_projects_${effectiveUser.id}`,
      'amcaudales_projects_usr_guest',
      'amcaudales_projects_usr_active',
      'amcaudales_projects_usr_super_admin'
    ];

    localKeys.forEach(k => {
      try {
        const raw = localStorage.getItem(k);
        if (raw) {
          let list = JSON.parse(raw);
          if (Array.isArray(list)) {
            list = list.filter(p => p.id !== projectId);
            localStorage.setItem(k, JSON.stringify(list));
          }
        }
      } catch (e) {}
    });

    await fetchUserProjects(effectiveUser.id, session);
    return true;
  };

  const auditCloudConnection = async () => {
    const report = {
      isConfigured: isCloudConfigured,
      hasClient: Boolean(supabase),
      userEmail: user?.email || 'Ninguno',
      userName: user?.user_metadata?.full_name || 'Desconocido',
      isGuest: Boolean(user?.isGuest || !user || user.id === 'usr_guest'),
      userPlan: userPlan,
      cloudProjectsCount: cloudProjects.filter(p => p.isCloud).length,
      localProjectsCount: cloudProjects.filter(p => !p.isCloud).length,
      supabaseStatus: 'Desconocido',
      canReadProjects: false,
      details: ''
    };

    if (!isCloudConfigured || !supabase) {
      report.supabaseStatus = 'No configurado (.env ausente)';
      return report;
    }

    try {
      const sessRes = await supabase.auth.getSession();
      report.hasValidSession = Boolean(sessRes.data?.session);
      if (sessRes.data?.session?.user) {
        report.sessionUser = sessRes.data.session.user.email;
      }

      const { count, error } = await supabase
        .from('projects')
        .select('id', { count: 'exact', head: true });

      if (error) {
        report.supabaseStatus = `Aviso tabla projects: ${error.message}`;
        report.details = error.message;
      } else {
        report.canReadProjects = true;
        report.supabaseStatus = 'Operativa y Conectada';
        report.totalTableProjects = count || 0;
      }
    } catch (err) {
      report.supabaseStatus = `Excepción: ${err.message}`;
      report.details = err.message;
    }

    return report;
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
        loginAsEmpas,
        loginAsAlayn,
        loginWithGoogle,
        resetPassword,
        loading,
        cloudProjects,
        register,
        login,
        logout,
        saveProjectToCloud,
        loadProjectFromCloud,
        deleteProjectFromCloud,
        auditCloudConnection,
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
