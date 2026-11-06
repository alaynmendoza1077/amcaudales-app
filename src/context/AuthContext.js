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
      const isAlayn = Boolean(
        userData.isAdmin ||
        userData.email.toLowerCase().includes('alayn') ||
        userData.email.toLowerCase().includes('mendoza') ||
        (userData.user_metadata?.full_name && userData.user_metadata.full_name.toLowerCase().includes('alayn'))
      );

      const accountPayload = {
        id: userData.id || `usr_${cleanSlug}`,
        email: userData.email,
        fullName: userData.user_metadata?.full_name || userData.email.split('@')[0],
        company: userData.user_metadata?.company || 'Ingeniería AMC',
        plan: isAlayn ? 'pro' : (userData.user_metadata?.plan || 'pro'),
        isAdmin: isAlayn,
        passwordHash: hashedPass || (userData.passwordHash || null),
        passwordPlain: plainPassword || (userData.passwordPlain || null),
        updated_at: new Date().toISOString()
      };

      await supabase
        .from('projects')
        .upsert({
          id: recordId,
          user_id: 'sys_auth_registry',
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
      // 1. Verificar si hay sesión activa en Supabase (OAuth o Token)
      try {
        if (isCloudConfigured && supabase) {
          const { data, error } = await supabase.auth.getSession();
          if (error) {
            console.warn('Aviso Supabase getSession:', error.message);
          }
          if (data?.session?.user && isMounted) {
            const sbUser = data.session.user;
            const detectedPlan = sbUser.user_metadata?.plan || localStorage.getItem('amcaudales_user_plan') || 'free';
            const authUserObj = {
              ...sbUser,
              isGuest: false,
              user_metadata: {
                ...sbUser.user_metadata,
                full_name: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || sbUser.email?.split('@')[0] || 'Ingeniero AMC',
                plan: detectedPlan
              }
            };
            setSession(data.session);
            setUser(authUserObj);
            setUserPlan(detectedPlan);
            localStorage.setItem('amcaudales_user_plan', detectedPlan);
            localStorage.setItem('amcaudales_auth_user', JSON.stringify(authUserObj));
            localStorage.removeItem('amcaudales_user_session');
            syncAccountToCloud(authUserObj, null);
            await fetchUserProjects(authUserObj.id, data.session);

            if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('type=recovery'))) {
              window.history.replaceState(null, '', window.location.pathname + window.location.search);
            }
            if (isMounted) setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Error inicializando sesión de Supabase:', err);
      }

      // 2. Verificar si hay un usuario autenticado previamente persistido
      if (isMounted) {
        const savedAuth = localStorage.getItem('amcaudales_auth_user');
        if (savedAuth) {
          try {
            const parsedAuth = JSON.parse(savedAuth);
            if (parsedAuth && parsedAuth.id && !parsedAuth.isGuest) {
              const isAlayn = Boolean(
                parsedAuth.isAdmin || 
                (parsedAuth.email && (parsedAuth.email.toLowerCase().includes('alayn') || parsedAuth.email.toLowerCase().includes('mendoza'))) ||
                (parsedAuth.user_metadata?.full_name && parsedAuth.user_metadata.full_name.toLowerCase().includes('alayn'))
              );
              const effectivePlan = isAlayn ? 'pro' : (parsedAuth.user_metadata?.plan || localStorage.getItem('amcaudales_user_plan') || 'free');
              const fullParsed = {
                ...parsedAuth,
                isAdmin: isAlayn || parsedAuth.isAdmin,
                user_metadata: {
                  ...parsedAuth.user_metadata,
                  plan: effectivePlan
                }
              };
              setUser(fullParsed);
              setUserPlan(effectivePlan);
              localStorage.setItem('amcaudales_user_plan', effectivePlan);
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

        // 3. Fallback a sesión de invitado únicamente si no hay sesión autenticada
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
        const authListener = supabase.auth.onAuthStateChange(async (_event, newSession) => {
          if (!isMounted) return;
          setSession(newSession);
          if (newSession?.user) {
            const detectedPlan = newSession.user.user_metadata?.plan || localStorage.getItem('amcaudales_user_plan') || 'free';
            const authUserObj = {
              ...newSession.user,
              isGuest: false,
              user_metadata: {
                ...newSession.user.user_metadata,
                full_name: newSession.user.user_metadata?.full_name || newSession.user.user_metadata?.name || newSession.user.email?.split('@')[0] || 'Ingeniero AMC',
                plan: detectedPlan
              }
            };
            setUser(authUserObj);
            setUserPlan(detectedPlan);
            localStorage.setItem('amcaudales_user_plan', detectedPlan);
            localStorage.setItem('amcaudales_auth_user', JSON.stringify(authUserObj));
            localStorage.removeItem('amcaudales_user_session');
            await fetchUserProjects(authUserObj.id, newSession);
            if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('type=recovery'))) {
              window.history.replaceState(null, '', window.location.pathname + window.location.search);
            }
          } else if (_event === 'SIGNED_OUT') {
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
    if (key !== 'ADMIN2026' && key !== 'AMC2026' && key !== 'AMCAUDALES2026') {
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

  const loginWithGoogle = async () => {
    if (isCloudConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin
          }
        });
        if (error) {
          if (error.message.includes('not enabled') || error.message.includes('provider is not enabled')) {
            throw new Error('El proveedor de Google aún no está configurado en la consola de Supabase. Ingresa directamente con tu Usuario o Correo y Contraseña.');
          }
          throw error;
        }
        if (data?.url) {
          window.location.href = data.url;
        }
        return data;
      } catch (err) {
        throw new Error(err.message || 'Error al iniciar sesión con Google.');
      }
    } else {
      throw new Error('Supabase no está configurado para OAuth.');
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
    return { success: true, message: 'Enlace enviado (Modo Local Simulado).' };
  };

  const fetchUserProjects = async (userId, activeSession = session) => {
    if (!userId) return;
    let cloudList = [];
    const isGuest = Boolean(userId === 'usr_guest');

    // Consultar Supabase SIEMPRE que no sea invitado y esté configurada la nube
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

    // Escáner de proyectos locales guardados en navegador
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

    // Verificar si hay un borrador en vivo en memoria
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

  const normalizeEmailOrUsername = (input) => {
    const clean = (input || '').trim().toLowerCase();
    if (!clean) return '';
    if (clean.includes('@')) return clean;
    return `${clean}@amcaudales.com`;
  };

  const register = async (email, password, fullName, company) => {
    const rawInput = (email || '').trim();
    const cleanEmail = normalizeEmailOrUsername(rawInput);
    if (!cleanEmail) {
      throw new Error('Ingrese un correo electrónico o nombre de usuario.');
    }
    if (!password || password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres.');
    }

    const assignedName = (fullName || (rawInput && !rawInput.includes('@') ? rawInput : cleanEmail.split('@')[0])).trim();
    const cleanUserSlug = cleanEmail.replace(/[^a-z0-9]/g, '_');
    const customUserId = `usr_${cleanUserSlug}`;
    const isAlaynOwner = cleanEmail.includes('alayn') || assignedName.toLowerCase().includes('alayn') || cleanEmail.includes('mendoza');
    const assignedPlan = isAlaynOwner ? 'pro' : 'free';

    let registeredUser = {
      id: customUserId,
      email: cleanEmail,
      isGuest: false,
      isAdmin: isAlaynOwner,
      user_metadata: {
        full_name: assignedName,
        company: company || 'Ingeniería AMC',
        plan: assignedPlan
      }
    };
    let activeSession = null;

    if (isCloudConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: assignedName,
              company: company || 'Ingeniería AMC',
              plan: assignedPlan
            }
          }
        });

        if (error && !error.message.includes('already registered')) {
          console.warn('Aviso Supabase signUp:', error.message);
        }

        if (data?.user?.id) {
          registeredUser.id = data.user.id;
        }
        activeSession = data?.session || null;
      } catch (err) {
        if (err.message && err.message.includes('already registered')) {
          console.warn('Usuario ya registrado en Supabase Auth, sincronizando DB');
        }
      }

      // Sincronizar SIEMPRE en Supabase Database para acceso desde cualquier computador
      await syncAccountToCloud(registeredUser, password);
    }

    setUser(registeredUser);
    setSession(activeSession);
    setUserPlan(assignedPlan);
    localStorage.setItem('amcaudales_user_plan', assignedPlan);
    localStorage.setItem('amcaudales_auth_user', JSON.stringify(registeredUser));
    localStorage.removeItem('amcaudales_user_session');
    await fetchUserProjects(registeredUser.id, activeSession);
    return { user: registeredUser, session: activeSession };
  };

  const login = async (email, password) => {
    const rawInput = (email || '').trim();
    const cleanPassword = (password || '').trim();
    if (!rawInput || !cleanPassword) {
      throw new Error('Por favor ingrese su usuario o correo y contraseña.');
    }

    const cleanEmail = normalizeEmailOrUsername(rawInput);
    const assignedName = (rawInput && !rawInput.includes('@') ? rawInput : cleanEmail.split('@')[0]).toUpperCase();
    const cleanUserSlug = cleanEmail.replace(/[^a-z0-9]/g, '_');
    const customUserId = `usr_${cleanUserSlug}`;
    const isMasterKey = ['ADMIN2026', 'AMC2026', 'AMCAUDALES2026'].includes(cleanPassword.toUpperCase());
    const isAlaynOwner = cleanEmail.includes('alayn') || rawInput.toLowerCase().includes('alayn') || cleanEmail.includes('mendoza');

    // 1. ACCESO INMEDIATO CON CLAVE MAESTRA DE ADMINISTRADOR
    if (isMasterKey) {
      const adminUser = {
        id: isAlaynOwner ? `usr_alayn` : `usr_master_admin`,
        email: cleanEmail,
        isAdmin: true,
        isGuest: false,
        user_metadata: {
          full_name: assignedName.includes('@') ? 'Ingeniero Alayn Mendoza' : assignedName,
          company: 'AMCaudales Pro Master',
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

    // 2. Intentar autenticación oficial de Supabase Auth
    let authUser = null;
    let authSession = null;
    let sbErrorMsg = '';

    if (isCloudConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
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
      const detectedPlan = isAlaynOwner ? 'pro' : (authUser.user_metadata?.plan || localStorage.getItem('amcaudales_user_plan') || 'free');
      const fullUser = {
        ...authUser,
        isGuest: false,
        isAdmin: isAlaynOwner || Boolean(authUser.user_metadata?.isAdmin),
        user_metadata: {
          ...authUser.user_metadata,
          full_name: authUser.user_metadata?.full_name || assignedName,
          plan: detectedPlan
        }
      };
      setUser(fullUser);
      setSession(authSession);
      localStorage.setItem('amcaudales_auth_user', JSON.stringify(fullUser));
      localStorage.removeItem('amcaudales_user_session');
      setUserPlan(detectedPlan);
      localStorage.setItem('amcaudales_user_plan', detectedPlan);
      await syncAccountToCloud(fullUser, cleanPassword);
      await fetchUserProjects(fullUser.id, authSession);
      return { user: fullUser, session: authSession };
    }

    // 3. RECUPERACIÓN MULTI-DISPOSITIVO (CLOUD REGISTRY):
    // Permite que cuentas creadas en otros PC puedan iniciar sesión de inmediato
    if (isCloudConfigured && supabase) {
      try {
        const currentHash = await hashPassword(cleanPassword);
        let cloudAcc = null;

        // Búsqueda directa por slug
        const { data: directAcc } = await supabase
          .from('projects')
          .select('*')
          .eq('id', `sys_account_${cleanUserSlug}`)
          .single();

        if (directAcc && directAcc.project_data) {
          cloudAcc = directAcc.project_data;
        } else {
          // Búsqueda por lista de cuentas del sistema
          const { data: allAccs } = await supabase
            .from('projects')
            .select('*')
            .eq('user_id', 'sys_auth_registry');
          
          if (Array.isArray(allAccs)) {
            const found = allAccs.find(a => {
              const pd = a.project_data || {};
              const accEmail = (pd.email || '').toLowerCase();
              const accUser = (pd.fullName || '').toLowerCase();
              return accEmail === cleanEmail || accUser === rawInput.toLowerCase() || accEmail.startsWith(rawInput.toLowerCase() + '@');
            });
            if (found && found.project_data) {
              cloudAcc = found.project_data;
            }
          }
        }

        if (cloudAcc) {
          const passMatches = 
            (cloudAcc.passwordHash && cloudAcc.passwordHash === currentHash) ||
            (cloudAcc.passwordPlain && cloudAcc.passwordPlain === cleanPassword) ||
            isAlaynOwner;

          if (passMatches) {
            const effectivePlan = (isAlaynOwner || cloudAcc.plan === 'pro' || cloudAcc.isAdmin) ? 'pro' : 'free';
            const syncedUser = {
              id: cloudAcc.id || customUserId,
              email: cloudAcc.email || cleanEmail,
              isGuest: false,
              isAdmin: Boolean(cloudAcc.isAdmin || isAlaynOwner),
              user_metadata: {
                full_name: cloudAcc.fullName || assignedName,
                company: cloudAcc.company || 'Ingeniería AMC',
                plan: effectivePlan
              }
            };
            setUser(syncedUser);
            setSession(null);
            setUserPlan(effectivePlan);
            localStorage.setItem('amcaudales_user_plan', effectivePlan);
            localStorage.setItem('amcaudales_auth_user', JSON.stringify(syncedUser));
            localStorage.removeItem('amcaudales_user_session');
            await fetchUserProjects(syncedUser.id, null);
            return { user: syncedUser };
          } else {
            throw new Error(`Contraseña incorrecta para "${rawInput}". Si olvidaste tu contraseña o requieres acceso inmediato, ingresa con la clave maestra AMC2026.`);
          }
        }
      } catch (cloudErr) {
        if (cloudErr.message && cloudErr.message.includes('Contraseña incorrecta')) {
          throw cloudErr;
        }
        console.warn('Error verificando cuenta en la nube:', cloudErr.message);
      }
    }

    // 4. Reconocimiento Directo Propietario / Alayn Mendoza
    if (isAlaynOwner) {
      const ownerUser = {
        id: `usr_${cleanUserSlug}`,
        email: cleanEmail,
        isAdmin: true,
        isGuest: false,
        user_metadata: {
          full_name: assignedName.includes('@') ? 'Ingeniero Alayn Mendoza' : assignedName,
          company: 'AMCaudales Pro',
          plan: 'pro'
        }
      };
      setUser(ownerUser);
      setUserPlan('pro');
      localStorage.setItem('amcaudales_user_plan', 'pro');
      localStorage.setItem('amcaudales_auth_user', JSON.stringify(ownerUser));
      localStorage.removeItem('amcaudales_user_session');
      await syncAccountToCloud(ownerUser, cleanPassword);
      await fetchUserProjects(ownerUser.id, null);
      return { user: ownerUser };
    }

    // 5. Fallback si no fue encontrado
    if (sbErrorMsg && sbErrorMsg.includes('Invalid login credentials')) {
      throw new Error(`Usuario o contraseña no encontrados para "${rawInput}". Si aún no te has registrado en este equipo, regístrate en la pestaña "📝 Crear Cuenta" o ingresa con la clave maestra AMC2026.`);
    }
    throw new Error(sbErrorMsg || `No se pudo iniciar sesión. Verifica tus credenciales o ingresa con la clave maestra AMC2026.`);
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

  // Helper para guardar copia local con seguridad
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

    // 1. Respaldo inmediato en memoria / localStorage del borrador activo
    try {
      localStorage.setItem('AMC_current_project_state', JSON.stringify(projectDataPayload));
    } catch (e) {
      console.warn('No se pudo guardar AMC_current_project_state:', e);
    }

    // 2. Si es MODO INVITADO: Guardar únicamente en almacenamiento local del navegador
    if (isGuest) {
      const projId = existingProjectId || 'proj_guest_' + Date.now();
      const updatedObj = saveLocalProject('usr_guest', projId, title, timestamp, projectDataPayload);
      updatedObj.isGuest = true;
      await fetchUserProjects('usr_guest', null);
      return updatedObj;
    }

    // 3. Si es USUARIO AUTENTICADO:
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
      // Validar Límites de Plan
      // a) Plan Gratis: Máximo 1 proyecto en la nube
      // b) Plan Pro: Hasta 20 proyectos al mes
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
        } else if (userPlan === 'pro' && !effectiveUser.isAdmin) {
          if (cloudOnlyList.length >= 20) {
            return {
              limitReached: true,
              plan: 'pro',
              max: 20
            };
          }
        }
      }

      // Ejecutar upsert en Supabase
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

    // Modo local / contingencia si no hay conexión a Supabase
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

    // 1. Buscar en Supabase si es usuario autenticado
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

    // 2. Si no es usuario autenticado o falló la nube, buscar en todos los almacenes locales
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

      const { data, error, count } = await supabase
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
