import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isCloudConfigured } from '../services/supabaseClient';

const AuthContext = createContext();

export const isValidUUID = (str) => {
  if (!str || typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str.trim());
};

export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch (e) {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const stringToUUID = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  const hex = (Math.abs(hash).toString(16) + '00000000000000000000000000000000').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};

/**
 * Helper universal para construir el objeto de usuario estandarizado
 * a partir de los datos retornados por Supabase Auth (Google OAuth o Correo/Password).
 */
export const buildAuthUser = (sbUser) => {
  if (!sbUser) return null;
  const meta = sbUser.user_metadata || {};
  const idData = sbUser.identities?.[0]?.identity_data || {};

  // Extraer nombre real universal desde Google OAuth o registro con correo
  const realFullName =
    meta.full_name ||
    meta.name ||
    idData.full_name ||
    idData.name ||
    (meta.given_name ? `${meta.given_name} ${meta.family_name || ''}`.trim() : '') ||
    sbUser.email?.split('@')[0] ||
    'Usuario';

  // Extraer foto de perfil de Google OAuth si existe
  const avatarUrl =
    meta.avatar_url ||
    meta.picture ||
    idData.avatar_url ||
    idData.picture ||
    sbUser.avatarUrl ||
    null;

  const plan = meta.plan || 'pro';
  const company = meta.company || idData.company || 'Consultoría Hidráulica';

  return {
    ...sbUser,
    id: sbUser.id || `usr_${sbUser.email?.replace(/[^a-z0-9]/gi, '_')}`,
    email: sbUser.email,
    isGuest: false,
    isAdmin: Boolean(meta.isAdmin || plan === 'pro'),
    avatarUrl,
    user_metadata: {
      ...meta,
      full_name: realFullName,
      name: realFullName,
      avatar_url: avatarUrl,
      company: company,
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
  const [oauthBanner, setOauthBanner] = useState(null);

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
      const recordId = stringToUUID(`sys_account_${cleanSlug}`);
      const hashedPass = plainPassword ? await hashPassword(plainPassword) : null;
      const userUUID = isValidUUID(userData.id) ? userData.id : stringToUUID(`usr_${cleanSlug}`);

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
          user_id: userUUID,
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
    let sessionApplied = false;

    // Detectar si la URL actual proviene de un retorno de OAuth (Google / Magic Link)
    const urlHash = window.location.hash || '';
    const urlSearch = window.location.search || '';
    const urlParams = new URLSearchParams(urlSearch);
    const hashParams = new URLSearchParams(urlHash.replace(/^#/, ''));

    const authCode = urlParams.get('code');
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const oauthError = urlParams.get('error') || hashParams.get('error');
    const oauthErrorDesc = urlParams.get('error_description') || hashParams.get('error_description');

    if (oauthError) {
      console.error('[Google OAuth Error]:', oauthError, oauthErrorDesc);
      setOauthBanner({
        type: 'error',
        title: 'Aviso de Autenticación con Google',
        message: oauthErrorDesc || oauthError,
        details: `Código: ${oauthError}\nDetalle: ${oauthErrorDesc || 'Error devuelto por el proveedor'}\nDominio: ${window.location.origin}`
      });
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    }

    // Helper universal para aplicar y persistir la sesión autenticada
    const applyUserSession = async (sbSession, source = 'supabase') => {
      if (!isMounted || !sbSession?.user || sessionApplied) return;
      sessionApplied = true;
      const authUserObj = buildAuthUser(sbSession.user);

      setUser(authUserObj);
      setSession(sbSession);
      setUserPlan('pro');
      localStorage.setItem('amcaudales_user_plan', 'pro');
      localStorage.setItem('amcaudales_auth_user', JSON.stringify(authUserObj));
      localStorage.removeItem('amcaudales_user_session');

      // Solo mostrar banner si es un retorno explícito de OAuth, no en cargas automáticas de sesión
      const isActualOAuthReturn = source === 'hash_tokens' || source === 'exchange_code' || source === 'event_SIGNED_IN';
      if (isActualOAuthReturn) {
        setOauthBanner({
          type: 'success',
          title: '¡Sesión Iniciada con Éxito!',
          message: `Bienvenido, ${authUserObj.user_metadata?.full_name || authUserObj.email}. Has ingresado correctamente con tu cuenta Google.`
        });

        // Limpiar el banner de éxito tras 4 segundos automáticamente
        setTimeout(() => {
          setOauthBanner(null);
        }, 4000);
      } else {
        setOauthBanner(null);
      }

      if (isMounted) setLoading(false);

      // Limpiar parámetros de la URL sin recargar
      try {
        if ((window.location.search.includes('code=') || window.location.hash.includes('access_token')) && window.history && window.history.replaceState) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      } catch (e) {}

      // Sincronización en segundo plano sin congelar la UI
      syncAccountToCloud(authUserObj, null).catch(err => console.warn('Sync cloud account:', err));
      fetchUserProjects(authUserObj.id, sbSession).catch(err => console.warn('Fetch user projects:', err));
    };

    const fallbackToStorage = () => {
      if (!isMounted || sessionApplied) return;
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
            syncAccountToCloud(fullParsed, null).catch(console.warn);
            fetchUserProjects(fullParsed.id, null).catch(console.warn);
            setLoading(false);
            return;
          }
        } catch (e) {
          localStorage.removeItem('amcaudales_auth_user');
        }
      }

      // Fallback a sesión de invitado sólo si el usuario la guardó previamente
      const savedGuest = localStorage.getItem('amcaudales_user_session');
      if (savedGuest) {
        try {
          const parsedGuest = JSON.parse(savedGuest);
          setUser(parsedGuest);
          const savedPlan = parsedGuest.isAdmin ? 'pro' : (localStorage.getItem('amcaudales_user_plan') || 'free');
          setUserPlan(savedPlan);
          fetchUserProjects(parsedGuest.id, null).catch(console.warn);
        } catch (e) {
          localStorage.removeItem('amcaudales_user_session');
        }
      }

      setLoading(false);
    };

    // 1. Suscribirse a onAuthStateChange para escuchar cambios de sesión y refresco de tokens
    let subscription = null;
    if (isCloudConfigured && supabase) {
      try {
        const authListener = supabase.auth.onAuthStateChange(async (event, newSession) => {
          if (!isMounted) return;
          console.log('[Supabase Auth Event]:', event, newSession?.user?.email);

          if (newSession?.user) {
            await applyUserSession(newSession, `event_${event}`);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setSession(null);
            setCloudProjects([]);
            localStorage.removeItem('amcaudales_auth_user');
            localStorage.removeItem('amcaudales_user_session');
            if (isMounted) setLoading(false);
          }
        });
        subscription = authListener.data?.subscription;
      } catch (e) {
        console.warn('Error configurando onAuthStateChange:', e);
      }
    }

    // 2. Proceso de inicialización y verificación
    const initializeAuth = async () => {
      try {
        if (isCloudConfigured && supabase) {
          // A: Si llegaron tokens en el hash (#access_token=...&refresh_token=...)
          if (accessToken && refreshToken) {
            console.log('[OAuth Return] Tokens detectados en hash, aplicando setSession...');
            try {
              const { data: setRes, error: setErr } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              });
              if (!setErr && setRes?.session?.user) {
                await applyUserSession(setRes.session, 'hash_tokens');
                return;
              } else if (setErr) {
                console.warn('[OAuth Return] Error setSession:', setErr.message);
              }
            } catch (e) {
              console.warn('[OAuth Return] Error setSession hash:', e);
            }
          }

          // B: Si la URL trae código de autorización PKCE (?code=...)
          if (authCode) {
            console.log('[OAuth Return] authCode detectado en URL, realizando intercambio...');
            try {
              const { data: exchData, error: exchError } = await supabase.auth.exchangeCodeForSession(authCode);
              if (!exchError && exchData?.session?.user) {
                console.log('[OAuth Return] ¡Intercambio de código exitoso!');
                await applyUserSession(exchData.session, 'exchange_code');
                return;
              } else if (exchError) {
                console.error('[OAuth Return] Error en exchangeCodeForSession:', exchError.message);
                setOauthBanner({
                  type: 'error',
                  title: 'Aviso al autenticar con Google',
                  message: exchError.message,
                  details: `Código: ${authCode.substring(0, 10)}...\nError: ${exchError.message}\nVerifica que https://amcaudales.com esté en Redirect URLs de Supabase.`
                });
              }
            } catch (e) {
              console.warn('[OAuth Return] exchangeCodeForSession catch:', e.message);
            }
          }

          // C: Consultar getSession() activo (sesión persistida en Supabase)
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          if (!sessionError && sessionData?.session?.user && isMounted) {
            await applyUserSession(sessionData.session, 'get_session');
            return;
          }
        }
      } catch (err) {
        console.warn('Error verificando sesión en Supabase:', err);
      }

      // Si no hay sesión en Supabase y no es retorno OAuth, verificar localStorage
      fallbackToStorage();
    };

    initializeAuth();

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

  // Aliases de compatibilidad interna y acceso directo
  const loginAsEmpas = async () => {
    return loginAsAdmin('EMPAS2026');
  };

  const loginAsAlayn = (customPlan = 'pro') => {
    const alaynUser = {
      id: 'usr_alaynmendoza',
      email: 'alaynmendoza@gmail.com',
      isAdmin: true,
      isGuest: false,
      user_metadata: {
        full_name: 'Ing. Alayn Mendoza',
        name: 'Ing. Alayn Mendoza',
        company: 'Ingeniería Hidráulica AMC',
        plan: customPlan || 'pro'
      }
    };
    localStorage.removeItem('amcaudales_user_session');
    localStorage.setItem('amcaudales_auth_user', JSON.stringify(alaynUser));
    localStorage.setItem('amcaudales_user_plan', 'pro');
    setUser(alaynUser);
    setUserPlan('pro');
    syncAccountToCloud(alaynUser, 'AMC2026').catch(console.warn);
    fetchUserProjects(alaynUser.id, null).catch(console.warn);
    return alaynUser;
  };

  /**
   * Inicio y registro universal con Google OAuth
   */
  const loginWithGoogle = async () => {
    if (!isCloudConfigured || !supabase) {
      throw new Error('Supabase no está configurado para OAuth.');
    }
    try {
      localStorage.removeItem('amcaudales_user_session');
      // Redirigir al origen exacto del navegador sin rutas extra
      const redirectTarget = window.location.origin;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTarget
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

  /**
   * Helper bajo demanda para verificar si hay sesión activa en Supabase Cloud
   */
  const checkCloudSession = async () => {
    if (!isCloudConfigured || !supabase) {
      return { success: false, message: 'Supabase no está configurado.' };
    }
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (data?.session?.user) {
        const authUserObj = buildAuthUser(data.session.user);
        setUser(authUserObj);
        setSession(data.session);
        setUserPlan('pro');
        localStorage.setItem('amcaudales_user_plan', 'pro');
        localStorage.setItem('amcaudales_auth_user', JSON.stringify(authUserObj));
        localStorage.removeItem('amcaudales_user_session');
        fetchUserProjects(authUserObj.id, data.session).catch(console.warn);
        setOauthBanner({
          type: 'success',
          title: '¡Sesión Detectada!',
          message: `Sesión recuperada con éxito: ${authUserObj.user_metadata?.full_name || authUserObj.email}`
        });
        return { success: true, user: authUserObj };
      }
      return { success: false, message: 'No hay ninguna sesión activa en Supabase Cloud para este navegador.' };
    } catch (e) {
      return { success: false, message: e.message };
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
        // 1. Consultar directamente proyectos del usuario en Supabase vía RLS
        const { data: directData, error: directError } = await supabase
          .from('projects')
          .select('id, title, updated_at, created_at, user_id')
          .order('updated_at', { ascending: false });

        if (!directError && Array.isArray(directData) && directData.length > 0) {
          cloudList = directData
            .filter(p => p && p.id && !String(p.title || '').startsWith('AUTH_ACCOUNT:'))
            .map(p => ({ ...p, isCloud: true }));
        } else {
          // 2. Filtro de contingencia por IDs candidatos si RLS no retorna directo
          const candidateIds = [userId, activeSession?.user?.id, user?.id];
          const userEmail = activeSession?.user?.email || user?.email || '';
          if (userEmail) {
            candidateIds.push(stringToUUID(userEmail));
            candidateIds.push(stringToUUID(`usr_${userEmail.replace(/[^a-z0-9]/g, '_')}`));
          }

          const validUUIDs = candidateIds.filter(id => isValidUUID(id));
          const uniqueUUIDs = Array.from(new Set(validUUIDs));

          if (uniqueUUIDs.length > 0) {
            const { data, error } = await supabase
              .from('projects')
              .select('id, title, updated_at, created_at, user_id')
              .in('user_id', uniqueUUIDs)
              .order('updated_at', { ascending: false });

            if (!error && Array.isArray(data)) {
              cloudList = data
                .filter(p => p && p.id && !String(p.title || '').startsWith('AUTH_ACCOUNT:'))
                .map(p => ({ ...p, isCloud: true }));
            }
          }
        }
      } catch (err) {
        console.warn('Error al cargar proyectos de la nube:', err.message);
      }
    }

    const normalizeTitle = (t) => {
      return String(t || '')
        .replace(/\s*\(Borrador Activo\)$/i, '')
        .replace(/\s*\(Borrador de Trabajo previo\)$/i, '')
        .trim()
        .toLowerCase();
    };

    const localKeys = [
      `amcaudales_projects_${userId}`,
      'amcaudales_projects_usr_alaynmendoza',
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
              if (!p || !p.id || String(p.id).startsWith('sys_account_')) return;
              const pNorm = normalizeTitle(p.title);
              if (!pNorm) return;

              // Si ya está en la Nube con el mismo título o id, no duplicar local
              const alreadyInCloud = cloudList.some(cp => cp && (cp.id === p.id || normalizeTitle(cp.title) === pNorm));
              if (alreadyInCloud) return;

              // Si ya existe este proyecto en la lista local, conservar solo el más reciente
              const existingIdx = recoveredLocalProjects.findIndex(rp => normalizeTitle(rp.title) === pNorm);
              if (existingIdx !== -1) {
                const existingDate = new Date(recoveredLocalProjects[existingIdx].updated_at || 0).getTime();
                const newDate = new Date(p.updated_at || 0).getTime();
                if (newDate > existingDate) {
                  recoveredLocalProjects[existingIdx] = {
                    id: p.id,
                    title: p.title ? p.title.replace(/\s*\(Borrador Activo\)$/i, '').trim() : 'Proyecto Local',
                    updated_at: p.updated_at || new Date().toISOString(),
                    project_data: p.project_data || null,
                    isCloud: false,
                    isLocalRecovered: true
                  };
                }
              } else {
                recoveredLocalProjects.push({
                  id: p.id,
                  title: p.title ? p.title.replace(/\s*\(Borrador Activo\)$/i, '').trim() : 'Proyecto Local',
                  updated_at: p.updated_at || new Date().toISOString(),
                  project_data: p.project_data || null,
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
          const draftTitle = parsedCurrent.P?.proyecto ? `${parsedCurrent.P.proyecto}` : '';
          const pNorm = normalizeTitle(draftTitle);
          const draftAlreadyInCloud = pNorm && cloudList.some(cp => cp && (cp.id === activeProjId || normalizeTitle(cp.title) === pNorm));
          const draftAlreadyInLocal = pNorm && recoveredLocalProjects.some(rp => rp && normalizeTitle(rp.title) === pNorm);

          if (!draftAlreadyInCloud && !draftAlreadyInLocal) {
            recoveredLocalProjects.unshift({
              id: activeProjId,
              title: draftTitle ? `${draftTitle}` : 'Borrador de Trabajo previo',
              updated_at: parsedCurrent.timestamp || new Date().toISOString(),
              project_data: parsedCurrent,
              isCloud: false,
              isDraft: true,
              isLocalRecovered: true
            });
          }
        }
      }
    } catch (e) {}

    const combinedList = [...cloudList, ...recoveredLocalProjects].filter(Boolean);
    setCloudProjects(combinedList);

    // Auto-sincronización transparente en segundo plano a Supabase Cloud:
    // Si el usuario está autenticado con Google y tiene proyectos locales con datos,
    // los subimos de forma automática para que se sincronicen de inmediato en todos los computadores
    if (activeSession?.user?.id && !isGuest && recoveredLocalProjects.length > 0 && isCloudConfigured && supabase) {
      setTimeout(async () => {
        let uploadedAny = false;
        for (const lp of recoveredLocalProjects) {
          const pNorm = normalizeTitle(lp.title);
          const inCloud = cloudList.some(cp => cp && (cp.id === lp.id || normalizeTitle(cp.title) === pNorm));
          if (!inCloud) {
            try {
              let payload = lp.project_data;
              if (!payload) {
                try {
                  const raw = localStorage.getItem('AMC_current_project_state');
                  if (raw) payload = JSON.parse(raw);
                } catch (e) {}
              }
              if (!payload || typeof payload !== 'object') {
                payload = { title: lp.title, created_at: new Date().toISOString(), version: '3.0' };
              }
              const targetId = (isValidUUID(lp.id)) ? lp.id : generateUUID();
              const cleanTitle = lp.title.replace(/\s*\(Borrador Activo\)$/i, '').trim();

              const { error: upErr } = await supabase.from('projects').upsert({
                id: targetId,
                user_id: activeSession.user.id,
                title: cleanTitle,
                updated_at: lp.updated_at || new Date().toISOString(),
                project_data: payload
              });

              if (!upErr) {
                uploadedAny = true;
              }
            } catch (e) {
              console.warn('Auto-sync background error:', e);
            }
          }
        }

        if (uploadedAny) {
          const { data: refreshedData } = await supabase
            .from('projects')
            .select('id, title, updated_at, created_at, user_id')
            .order('updated_at', { ascending: false });

          if (Array.isArray(refreshedData) && refreshedData.length > 0) {
            const freshCloud = refreshedData
              .filter(p => p && p.id && !String(p.title || '').startsWith('AUTH_ACCOUNT:'))
              .map(p => ({ ...p, isCloud: true }));
            setCloudProjects(freshCloud);
          }
        }
      }, 700);
    }
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
    let rawEmail = (email || '').trim();
    const cleanPassword = (password || '').trim();
    if (!rawEmail) {
      throw new Error('Por favor ingrese su correo electrónico o usuario.');
    }
    if (!cleanPassword) {
      throw new Error('Por favor ingrese su contraseña.');
    }

    const isMasterKey = ['ADMIN2026', 'AMC2026', 'AMCAUDALES2026', 'EMPAS2026'].includes(cleanPassword.toUpperCase());

    // 1. Acceso con Clave Maestra de Administrador, EMPAS o Alayn Mendoza
    if (isMasterKey) {
      const cleanSlug = rawEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const isEmpas = rawEmail.toLowerCase().includes('empas') || cleanPassword.toUpperCase() === 'EMPAS2026';
      const isAlayn = rawEmail.toLowerCase().includes('alayn') || rawEmail.toLowerCase().includes('mendoza');
      const adminUser = {
        id: `usr_${cleanSlug}`,
        email: rawEmail.includes('@') ? rawEmail.toLowerCase() : `${rawEmail.toLowerCase()}@amcaudales.com`,
        isAdmin: true,
        isGuest: false,
        user_metadata: {
          full_name: isAlayn
            ? 'Ing. Alayn Mendoza'
            : (isEmpas ? 'EMPAS S.A. E.S.P.' : (rawEmail.includes('@') ? rawEmail.split('@')[0].toUpperCase() : rawEmail.toUpperCase())),
          company: isEmpas
            ? 'Empresa Pública de Alcantarillado de Santander'
            : 'Ingeniería Hidráulica AMC',
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

    // Normalizar si se ingresó nombre sin dominio para Supabase
    const supabaseEmail = rawEmail.includes('@') ? rawEmail.toLowerCase() : `${rawEmail.toLowerCase()}@amcaudales.com`;

    // 2. Intento de inicio de sesión con Supabase Auth
    let authUser = null;
    let authSession = null;
    let sbErrorMsg = '';

    if (isCloudConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: supabaseEmail,
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

    const realUserId = (activeSession?.user?.id && isValidUUID(activeSession.user.id))
      ? activeSession.user.id
      : (isValidUUID(effectiveUser.id)
          ? effectiveUser.id
          : (effectiveUser.email ? stringToUUID(effectiveUser.email) : generateUUID()));
    const canSaveToSupabase = Boolean(isCloudConfigured && supabase);

    if (canSaveToSupabase) {
      if (!activeSession?.user?.id) {
        const localTargetId = (existingProjectId && isValidUUID(existingProjectId)) ? existingProjectId : generateUUID();
        saveLocalProject(effectiveUser.id, localTargetId, title, timestamp, projectDataPayload);
        await fetchUserProjects(effectiveUser.id, null);
        throw new Error('⚠️ Tu navegador en este computador no tiene la sesión de Supabase conectada. Por favor haz clic en "Conectar con Google" en la barra superior o inicia sesión con Google para sincronizar proyectos entre computadores.');
      }

      const cloudOnlyList = cloudProjects.filter(p => p.isCloud);
      const isUpdatingCurrentCloudProj = existingProjectId && isValidUUID(existingProjectId) && cloudOnlyList.some(p => p.id === existingProjectId);
      let targetProjId = (existingProjectId && isValidUUID(existingProjectId)) ? existingProjectId : generateUUID();

      if (!isUpdatingCurrentCloudProj) {
        if (userPlan === 'free' && !effectiveUser.isAdmin) {
          if (cloudOnlyList.length >= 1) {
            if (forceOverwrite) {
              targetProjId = (cloudOnlyList[0].id && isValidUUID(cloudOnlyList[0].id)) ? cloudOnlyList[0].id : generateUUID();
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

      // Asegurar que project_data NUNCA sea null ni undefined (para cumplir restricción not-null en Postgres)
      let validPayload = projectDataPayload;
      if (!validPayload || typeof validPayload !== 'object') {
        try {
          const raw = localStorage.getItem('AMC_current_project_state');
          if (raw) validPayload = JSON.parse(raw);
        } catch (e) {}
      }
      if (!validPayload || typeof validPayload !== 'object') {
        validPayload = { title, created_at: new Date().toISOString(), version: '3.0' };
      }

      try {
        const { data, error } = await supabase
          .from('projects')
          .upsert({
            id: targetProjId,
            user_id: realUserId,
            title,
            updated_at: timestamp,
            project_data: validPayload
          })
          .select();

        if (error) {
          console.error('Error Supabase upsert:', error);
          throw new Error('Error al sincronizar con Supabase: ' + (error.message || JSON.stringify(error)));
        }

        if (data && data.length > 0) {
          saveLocalProject(realUserId, targetProjId, title, timestamp, validPayload);
          await fetchUserProjects(realUserId, activeSession);
          return { ...data[0], isCloud: true };
        }
      } catch (err) {
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

    if (!isGuest && isCloudConfigured && supabase && isValidUUID(projectId)) {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();

        if (!error && data) {
          const resPayload = parsePayload(data.project_data || data);
          if (resPayload) {
            if (resPayload.P) {
              resPayload.P.cloudProjectId = projectId;
            }
            return resPayload;
          }
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

    if (!isGuest && isCloudConfigured && supabase && isValidUUID(projectId)) {
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

  const refreshProjects = async () => {
    const effectiveUser = user || { id: 'usr_guest' };
    await fetchUserProjects(effectiveUser.id, session);
  };

  const cleanLocalDuplicates = () => {
    const normalizeTitle = (t) => {
      return String(t || '')
        .replace(/\s*\(Borrador Activo\)$/i, '')
        .replace(/\s*\(Borrador de Trabajo previo\)$/i, '')
        .trim()
        .toLowerCase();
    };

    const localKeys = [
      `amcaudales_projects_${user?.id || 'usr_guest'}`,
      'amcaudales_projects_usr_alaynmendoza',
      'amcaudales_projects_usr_guest',
      'amcaudales_projects_usr_active',
      'amcaudales_projects_usr_super_admin'
    ];

    localKeys.forEach(k => {
      try {
        const raw = localStorage.getItem(k);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            const uniqueMap = new Map();
            list.forEach(p => {
              if (p && p.title) {
                const norm = normalizeTitle(p.title);
                if (!uniqueMap.has(norm)) {
                  uniqueMap.set(norm, p);
                } else {
                  const prev = uniqueMap.get(norm);
                  if (new Date(p.updated_at || 0) > new Date(prev.updated_at || 0)) {
                    uniqueMap.set(norm, p);
                  }
                }
              }
            });
            localStorage.setItem(k, JSON.stringify(Array.from(uniqueMap.values())));
          }
        }
      } catch (e) {}
    });

    fetchUserProjects(user?.id, session);
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
        checkCloudSession,
        oauthBanner,
        setOauthBanner,
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
        refreshProjects,
        cleanLocalDuplicates,
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
