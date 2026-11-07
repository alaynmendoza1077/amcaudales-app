import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { saveFileWithDialog } from '../utils/fileSaver';
import AuthModal from './AuthModal';
import UpgradeProModal from './UpgradeProModal';

export default function UserProjectsModal({ isOpen, onClose, onLoadProject, onSaveCurrentProject }) {
  const {
    cloudProjects,
    loadProjectFromCloud,
    deleteProjectFromCloud,
    user,
    userPlan,
    isCloudConfigured,
    auditCloudConnection
  } = useAuth();

  const [newProjectTitle, setNewProjectTitle] = useState('Nuevo Proyecto AMC');
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('info'); // 'info' | 'success' | 'warning' | 'error'

  // Modales anidados
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Estados de diálogo de advertencia
  const [guestConfirm, setGuestConfirm] = useState(false);
  const [overwriteConfirm, setOverwriteConfirm] = useState(null); // { existingProject, title }
  const [auditResult, setAuditResult] = useState(null);

  if (!isOpen) return null;

  const isGuest = Boolean(!user || user.isGuest || user.id === 'usr_guest' || user.email === 'invitado@amcaudales.com');
  const safeProjects = Array.isArray(cloudProjects) ? cloudProjects.filter(Boolean) : [];
  const cloudCount = safeProjects.filter(p => p && p.isCloud).length;
  const localCount = safeProjects.filter(p => p && !p.isCloud).length;

  const rawModalName = user?.user_metadata?.full_name || user?.user_metadata?.name || '';
  let displayModalName = rawModalName;
  if (!displayModalName && user?.email) {
    if (user.email.endsWith('@amcaudales.com')) {
      displayModalName = user.email.replace('@amcaudales.com', '').toUpperCase();
    } else {
      displayModalName = user.email.split('@')[0];
    }
  }
  if (!displayModalName) displayModalName = 'Ingeniero';

  const showNotification = (text, type = 'info', duration = 3500) => {
    setMsg(text);
    setMsgType(type);
    if (duration > 0) {
      setTimeout(() => setMsg(''), duration);
    }
  };

  const handleSelectProject = async (projectId) => {
    setLoading(true);
    showNotification('Cargando datos del proyecto...', 'info', 0);
    try {
      const projectDataPayload = await loadProjectFromCloud(projectId);
      onLoadProject(projectDataPayload);
      showNotification('¡Proyecto cargado con éxito!', 'success', 2000);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      showNotification(`Error: ${err.message}`, 'error', 4000);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAMC = async (p) => {
    setDownloadingId(p.id);
    showNotification(`Preparando archivo .AMC de "${p.title}"...`, 'info', 2000);
    try {
      let payload = null;
      if (p.project_data) {
        payload = p.project_data;
      } else {
        payload = await loadProjectFromCloud(p.id);
      }

      const fileName = `${(p.title || 'Proyecto_AMC').replace(/[^a-zA-Z0-9_\-]/g, '_')}.amc`;
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      await saveFileWithDialog(blob, fileName);
      showNotification(`¡Archivo "${fileName}" descargado con éxito a tu computador! 📥`, 'success');
    } catch (err) {
      showNotification(`Error al descargar .AMC: ${err.message}`, 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  const fileInputRef = useRef(null);

  const executeSave = async (title, forceOverwrite = false, customPayload = null) => {
    setLoading(true);
    showNotification('Guardando proyecto...', 'info', 0);
    try {
      const res = await onSaveCurrentProject(title, forceOverwrite, customPayload);

      // Si el backend reporta que se superó el límite del plan
      if (res && res.limitReached) {
        if (res.plan === 'free') {
          setOverwriteConfirm({
            existingProject: res.existingProject,
            title: title,
            customPayload: customPayload
          });
          showNotification('⚠️ Límite de Plan Gratis: Solo 1 proyecto en la nube. Confirma si deseas sobreescribir.', 'warning', 0);
          setLoading(false);
          return res;
        } else if (res.plan === 'pro') {
          showNotification('Has alcanzado el límite mensual de 20 proyectos en la nube de tu Plan Pro.', 'warning', 5000);
          setLoading(false);
          return res;
        }
      }

      // Si se guardó en la nube con éxito
      if (res && res.isCloud) {
        setOverwriteConfirm(null);
        showNotification(`✅ ¡Proyecto "${title}" guardado con éxito en la Nube de Supabase! Ahora podrás abrirlo desde cualquier PC.`, 'success', 4000);
      } else {
        // Guardado local (invitado o contingencia)
        showNotification(`💾 Proyecto "${title}" guardado en este computador (Local). Para sincronizar entre PCs, inicia sesión en la Nube.`, 'info', 4000);
      }
      return res;
    } catch (err) {
      showNotification(`Error al guardar: ${err.message}`, 'error', 5000);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleUploadAMCFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    showNotification(`Leyendo archivo "${file.name}"...`, 'info', 0);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const rawContent = ev.target.result;
        const parsed = JSON.parse(rawContent);

        // Extraer título sugerido del archivo o del objeto
        const fileTitle = (parsed.P?.proyecto || parsed.title || file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')).trim();

        showNotification(`Subiendo "${fileTitle}" a la Nube de Supabase...`, 'info', 0);
        await executeSave(fileTitle, false, parsed);
      } catch (err) {
        showNotification(`Error al leer o subir archivo .AMC: ${err.message}`, 'error', 5000);
      } finally {
        setLoading(false);
        if (e.target) e.target.value = '';
      }
    };
    reader.onerror = () => {
      showNotification('Error al leer el archivo desde el disco.', 'error');
      setLoading(false);
      if (e.target) e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleUploadLocalToCloud = async (p) => {
    setLoading(true);
    showNotification(`Sincronizando "${p.title}" a la Nube...`, 'info', 0);
    try {
      let payload = null;
      if (p.project_data) {
        payload = p.project_data;
      } else {
        payload = await loadProjectFromCloud(p.id);
      }
      await executeSave(p.title, false, payload);
    } catch (err) {
      showNotification(`Error al subir a la Nube: ${err.message}`, 'error', 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClick = async () => {
    const title = newProjectTitle.trim();
    if (!title) {
      showNotification('Por favor introduce un nombre para el proyecto.', 'warning');
      return;
    }

    // 1. Si es modo invitado, advertir que solo se guarda local y ofrecer registrarse
    if (isGuest) {
      setGuestConfirm(true);
      return;
    }

    // 2. Si es usuario autenticado con Plan Gratis, verificar límite de 1 proyecto
    if (userPlan === 'free' && !user?.isAdmin && cloudCount >= 1) {
      const existing = cloudProjects.find(p => p.isCloud);
      setOverwriteConfirm({
        existingProject: existing,
        title: title
      });
      return;
    }

    // 3. Proceder normalmente
    await executeSave(title, false);
  };

  const handleDelete = async (projectId, projectTitle) => {
    const confirmDelete = window.confirm(`¿Estás seguro de que deseas eliminar permanentemente el proyecto "${projectTitle}"?\n\nEsta acción no se puede deshacer.`);
    if (!confirmDelete) return;

    setDeletingId(projectId);
    try {
      await deleteProjectFromCloud(projectId);
      showNotification(`Proyecto "${projectTitle}" eliminado correctamente.`, 'info');
    } catch (err) {
      showNotification(`Error al eliminar: ${err.message}`, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleRunAudit = async () => {
    setLoading(true);
    showNotification('Ejecutando auto-auditoría de Nube y Sesión...', 'info', 0);
    try {
      const report = await auditCloudConnection();
      setAuditResult(report);
      showNotification('Auditoría completada con éxito.', 'success', 2000);
    } catch (err) {
      showNotification('Error al auditar: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div style={overlayStyle}>
        <div style={cardStyle}>
          
          {/* Header */}
          <div style={headerStyle}>
            <div>
              <h2 style={titleStyle}>📁 Mis Proyectos en la Plataforma</h2>
              <div style={sessionInfoStyle}>
                {isGuest ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#fbbf24', fontWeight: '700' }}>
                      👤 Modo Invitado (Proyectos guardados solo en este PC)
                    </span>
                    <button
                      onClick={() => setShowAuthModal(true)}
                      style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '3px 10px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      🔑 Iniciar Sesión para Sincronizar en Nube
                    </button>
                  </div>
                ) : (
                  <span>
                    👋 Conectado como: <strong style={{ color: '#38bdf8' }}>{displayModalName}</strong>{' '}
                    <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>({user?.email})</span>
                  </span>
                )}
                <div style={{ marginTop: '4px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {isCloudConfigured ? (
                    <span style={cloudStatusBadge}>☁️ Nube Supabase Sincronizada</span>
                  ) : (
                    <span style={localStatusBadge}>💾 Almacenamiento Local</span>
                  )}

                  {!isGuest && (
                    <span style={userPlan === 'pro' || user?.isAdmin ? proPlanBadge : freePlanBadge}>
                      {user?.isAdmin
                        ? '👑 Super Admin Master (Ilimitado)'
                        : userPlan === 'pro'
                        ? `👑 Plan Pro (${cloudCount}/20 Proyectos al mes)`
                        : `⚡ Plan Gratis (${cloudCount}/1 Proyecto Nube)`}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button style={closeBtnStyle} onClick={onClose} aria-label="Cerrar ventana">✕</button>
          </div>

          {/* Notificaciones / Mensajes */}
          {msg && (
            <div style={
              msgType === 'success' ? successBannerStyle :
              msgType === 'warning' ? warningBannerStyle :
              msgType === 'error' ? errorBannerStyle : msgBannerStyle
            }>
              {msg}
            </div>
          )}

          {/* Banner de Advertencia de Modo Invitado */}
          {isGuest && (
            <div style={guestNoticeBannerStyle}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                <div style={{ flex: 1, fontSize: '0.82rem', lineHeight: '1.4' }}>
                  <strong>Estás trabajando como Invitado.</strong> Los proyectos guardados en este modo solo existen en el navegador de este computador (Local). Si quieres abrir tu diseño en otro PC o compartirlo, inicia sesión o crea tu cuenta gratis.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button
                  onClick={() => setShowAuthModal(true)}
                  style={loginActionBtnStyle}
                >
                  🔑 Iniciar Sesión / Registrarme Gratis
                </button>
              </div>
            </div>
          )}

          {/* Diálogo de Confirmación para Modo Invitado (cuando hace clic en Guardar) */}
          {guestConfirm && (
            <div style={confirmBoxStyle}>
              <h4 style={{ margin: '0 0 6px 0', color: '#fbbf24', fontSize: '0.9rem' }}>
                ⚠️ Advertencia de Guardado en Modo Invitado
              </h4>
              <p style={{ margin: '0 0 12px 0', fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                Si guardas como invitado, el proyecto <strong>NO se sincronizará en la nube</strong> y no podrás abrirlo en otros computadores. Tu diseño actual no se perderá si decides registrarte ahora.
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    setGuestConfirm(false);
                    setShowAuthModal(true);
                  }}
                  style={primaryConfirmBtnStyle}
                >
                  🔑 Registrarme / Iniciar Sesión para Guardar en la Nube
                </button>
                <button
                  onClick={() => {
                    setGuestConfirm(false);
                    executeSave(newProjectTitle.trim(), false);
                  }}
                  style={secondaryConfirmBtnStyle}
                >
                  💾 Guardar solo en este PC (Local)
                </button>
                <button
                  onClick={() => {
                    setGuestConfirm(false);
                    // Descargar .AMC directo
                    try {
                      const raw = localStorage.getItem('AMC_current_project_state');
                      const payload = raw ? JSON.parse(raw) : { title: newProjectTitle.trim() };
                      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                      saveFileWithDialog(blob, `${newProjectTitle.trim().replace(/\s+/g, '_')}.amc`);
                      showNotification('¡Archivo .AMC descargado con éxito! Puedes llevarlo en USB a otro PC.', 'success');
                    } catch (e) {
                      showNotification('Error descargando .AMC: ' + e.message, 'error');
                    }
                  }}
                  style={neutralConfirmBtnStyle}
                >
                  📥 Descargar .AMC al Computador
                </button>
                <button
                  onClick={() => setGuestConfirm(false)}
                  style={cancelConfirmBtnStyle}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Diálogo de Confirmación de Sobreescritura (Plan Gratis: 1 Proyecto Nube) */}
          {overwriteConfirm && (
            <div style={overwriteBoxStyle}>
              <h4 style={{ margin: '0 0 6px 0', color: '#f59e0b', fontSize: '0.92rem' }}>
                ⚡ Límite del Plan Gratis (1 Proyecto en la Nube)
              </h4>
              <p style={{ margin: '0 0 10px 0', fontSize: '0.83rem', color: '#e2e8f0', lineHeight: '1.4' }}>
                Tu cuenta tiene el <strong>Plan Gratis</strong>, que permite almacenar <strong>1 proyecto en la nube</strong>. Ya tienes guardado el proyecto:
                <br />
                <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>
                  "{overwriteConfirm.existingProject?.title || 'Proyecto Existente'}"
                </span>
                <br /><br />
                ¿Deseas <strong>SOBREESCRIBIRLO</strong> con tu nuevo diseño "{overwriteConfirm.title}", o actualizar a Plan Pro para guardar hasta 20 proyectos al mes?
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    const titleToSave = overwriteConfirm.title;
                    setOverwriteConfirm(null);
                    executeSave(titleToSave, true);
                  }}
                  style={overwriteBtnStyle}
                >
                  🔄 Sí, Sobreescribir Proyecto en la Nube
                </button>
                <button
                  onClick={() => {
                    setOverwriteConfirm(null);
                    setShowUpgradeModal(true);
                  }}
                  style={upgradeConfirmBtnStyle}
                >
                  👑 Pasar a Plan Pro (20 Proyectos/mes)
                </button>
                <button
                  onClick={() => {
                    const titleToSave = overwriteConfirm.title;
                    setOverwriteConfirm(null);
                    // Descargar .AMC para no perderlo sin sobreescribir
                    try {
                      const raw = localStorage.getItem('AMC_current_project_state');
                      const payload = raw ? JSON.parse(raw) : { title: titleToSave };
                      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                      saveFileWithDialog(blob, `${titleToSave.replace(/\s+/g, '_')}.amc`);
                      showNotification('¡Diseño descargado como archivo .AMC local! Tu proyecto en la nube permanece intacto.', 'success');
                    } catch (e) {
                      showNotification('Error descargando: ' + e.message, 'error');
                    }
                  }}
                  style={neutralConfirmBtnStyle}
                >
                  📥 Descargar como .AMC local (Gratis)
                </button>
                <button
                  onClick={() => setOverwriteConfirm(null)}
                  style={cancelConfirmBtnStyle}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Sección Guardar Proyecto Actual y Subir .AMC */}
          <div style={saveBoxStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
              <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                💾 Guardar Diseño Actual o Subir .AMC a la Nube
              </h4>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                {isGuest ? 'Modo Local' : (userPlan === 'pro' || user?.isAdmin ? 'Sincronización Pro (Ilimitada)' : 'Sincronización Gratis (1 Proj)')}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={newProjectTitle}
                onChange={(e) => setNewProjectTitle(e.target.value)}
                placeholder="Nombre del Proyecto (ej. Alcantarillado Sector Norte)"
                style={{ ...inputStyle, flex: '1 1 220px' }}
              />
              <button
                onClick={handleSaveClick}
                disabled={loading}
                style={saveBtnStyle}
                title={isGuest ? 'Guardar proyecto (Local / Opción Nube)' : 'Guardar y sincronizar en la Nube'}
              >
                {isGuest ? '💾 Guardar' : '☁️ Guardar en Nube'}
              </button>
              {!isGuest && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".amc,.json"
                    style={{ display: 'none' }}
                    onChange={handleUploadAMCFile}
                  />
                  <button
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    disabled={loading}
                    style={{
                      background: 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.6)',
                      color: '#93c5fd',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap'
                    }}
                    title="Selecciona un archivo .AMC de tu computador para subirlo a la Nube y abrirlo desde cualquier PC"
                  >
                    📂 Subir .AMC a Nube
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Encabezado Lista de Proyectos y Contador */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 10px 0', flexWrap: 'wrap', gap: '8px' }}>
            <h4 style={{ margin: 0, fontSize: '0.88rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Proyectos Disponibles ({safeProjects.length})
              <span style={{ fontSize: '0.75rem', textTransform: 'none', marginLeft: '8px', color: '#64748b' }}>
                ({cloudCount} en Nube • {localCount} Locales)
              </span>
            </h4>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={handleRunAudit}
                style={auditBtnStyle}
                title="Verificar estado de conexión con la Nube de Supabase"
              >
                🔍 Auditar Nube & Sesión
              </button>
            </div>
          </div>

          {/* Panel de Resultado de Auditoría */}
          {auditResult && (
            <div style={auditPanelStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <strong style={{ color: auditResult.canReadProjects ? '#34d399' : '#f87171', fontSize: '0.82rem' }}>
                  {auditResult.canReadProjects ? '✔ Diagnóstico de Nube: OPERATIVO' : '⚠️ Diagnóstico de Nube: ATENCIÓN'}
                </strong>
                <button onClick={() => setAuditResult(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                <div>• Supabase: <strong>{auditResult.supabaseStatus}</strong></div>
                <div>• Sesión Activa: <strong>{auditResult.hasValidSession ? `Sí (${auditResult.sessionUser})` : (auditResult.isGuest ? 'Modo Invitado' : 'No')}</strong></div>
                <div>• Plan Actual: <strong>{auditResult.userPlan}</strong></div>
                <div>• Proyectos en Nube: <strong>{auditResult.cloudProjectsCount}</strong> | Locales: <strong>{auditResult.localProjectsCount}</strong></div>
                {auditResult.totalTableProjects !== undefined && (
                  <div>• Total Registros en Base de Datos: <strong>{auditResult.totalTableProjects}</strong></div>
                )}
                {auditResult.details && <div style={{ color: '#fca5a5', marginTop: '4px' }}>Detalles: {auditResult.details}</div>}
                <div style={{ marginTop: '8px', padding: '6px 10px', background: 'rgba(59, 130, 246, 0.12)', borderRadius: '6px', borderLeft: '3px solid #38bdf8', color: '#93c5fd', fontSize: '0.73rem', lineHeight: '1.4' }}>
                  ℹ️ <strong>Sincronización Multi-PC:</strong> Los proyectos con etiqueta <span style={{ color: '#34d399', fontWeight: 'bold' }}>☁️ Nube</span> se sincronizan en todos tus computadores. En tu segundo PC, simplemente inicia sesión con Google (<strong>alaynmendoza@gmail.com</strong>) y aparecerán aquí automáticamente.
                </div>
              </div>
            </div>
          )}

          {/* Lista de Proyectos Guardados */}
          <div style={projectListContainerStyle}>
            {safeProjects.length === 0 ? (
              <div style={emptyStyle}>
                No tienes proyectos guardados aún en la plataforma. ¡Ingresa un nombre arriba y haz clic en Guardar!
              </div>
            ) : (
              safeProjects.map((p) => {
                if (!p) return null;
                const safeTitle = p.title || 'Proyecto sin título';
                const safeDate = p.updated_at ? new Date(p.updated_at).toLocaleString('es-CO') : 'Reciente';
                return (
                  <div key={p.id || Math.random()} style={projectCardStyle}>
                    {/* Título y Detalles del Proyecto (Sin truncar, wrap completo) */}
                    <div style={{ flex: 1, minWidth: 0, paddingRight: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={projTitleStyle} title={safeTitle}>
                          {safeTitle}
                        </span>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {p.isCloud ? (
                            <span style={cloudBadgeTag} title="Alojado en Supabase. Accesible desde cualquier computador.">
                              ☁️ Nube
                            </span>
                          ) : (
                            <span style={localBadgeTag} title="Alojado únicamente en este computador y navegador.">
                              💾 Local
                            </span>
                          )}
                          {p.isDraft && (
                            <span style={draftBadgeTag} title="Borrador en memoria de trabajo activa">
                              📝 Borrador
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={projDateStyle}>
                        Última actualización: {safeDate}
                      </div>
                    </div>

                    {/* Acciones del Proyecto */}
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                      <button
                        onClick={() => handleSelectProject(p.id)}
                        disabled={loading || deletingId === p.id}
                        style={loadBtnStyle}
                        title="Cargar y abrir este proyecto en el módulo de cálculo"
                      >
                        Abrir 📂
                      </button>

                      {!p.isCloud && !isGuest && (
                        <button
                          onClick={() => handleUploadLocalToCloud(p)}
                          disabled={loading}
                          style={{
                            background: 'rgba(16, 185, 129, 0.2)',
                            border: '1px solid #10b981',
                            color: '#34d399',
                            borderRadius: '8px',
                            padding: '7px 11px',
                            fontWeight: '700',
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Subir este proyecto local a la Nube de Supabase para abrirlo desde cualquier PC"
                        >
                          ☁️ A Nube
                        </button>
                      )}

                      <button
                        onClick={() => handleDownloadAMC(p)}
                        disabled={loading || downloadingId === p.id}
                        style={amcDownloadBtnStyle}
                        title="Descargar archivo .AMC directamente a tu computador"
                      >
                        {downloadingId === p.id ? '...' : '📥 .AMC'}
                      </button>

                      <button
                        onClick={() => handleDelete(p.id, safeTitle)}
                        disabled={loading || deletingId === p.id}
                        style={deleteBtnStyle}
                        title="Eliminar este proyecto permanentemente"
                      >
                        {deletingId === p.id ? '...' : '🗑️'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modales de Autenticación y Plan Pro */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={() => {
          setShowAuthModal(false);
          // Si el usuario tenía un nombre pendiente para guardar, ofrecer guardar de inmediato
          const title = newProjectTitle.trim();
          if (title) {
            executeSave(title, false);
          }
        }}
      />

      <UpgradeProModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        featureName="Almacenamiento de hasta 20 Proyectos en la Nube"
      />
    </>
  );
}

// ── ESTILOS DEL MODAL DE PROYECTOS (DARK GLASSMORPHIC) ──
const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: 'rgba(3, 7, 18, 0.88)',
  backdropFilter: 'blur(10px)',
  zIndex: 100000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px'
};

const cardStyle = {
  width: '100%',
  maxWidth: '680px',
  maxHeight: '90vh',
  backgroundColor: '#0a1128',
  border: '1px solid rgba(59, 130, 246, 0.35)',
  borderRadius: '20px',
  boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 40px rgba(59, 130, 246, 0.15)',
  padding: '24px',
  color: '#f0f4f8',
  fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  display: 'flex',
  flexDirection: 'column'
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '14px'
};

const titleStyle = {
  fontSize: '1.25rem',
  fontWeight: '800',
  margin: 0,
  color: '#ffffff',
  letterSpacing: '-0.02em'
};

const sessionInfoStyle = {
  fontSize: '0.82rem',
  color: '#cbd5e1',
  marginTop: '4px'
};

const cloudStatusBadge = {
  fontSize: '0.72rem',
  color: '#34d399',
  fontWeight: '600'
};

const localStatusBadge = {
  fontSize: '0.72rem',
  color: '#fbbf24',
  fontWeight: '600'
};

const freePlanBadge = {
  fontSize: '0.72rem',
  padding: '2px 8px',
  borderRadius: '10px',
  backgroundColor: 'rgba(59, 130, 246, 0.15)',
  border: '1px solid #3b82f6',
  color: '#93c5fd',
  fontWeight: '600'
};

const proPlanBadge = {
  fontSize: '0.72rem',
  padding: '2px 8px',
  borderRadius: '10px',
  backgroundColor: 'rgba(16, 185, 129, 0.15)',
  border: '1px solid #10b981',
  color: '#34d399',
  fontWeight: '700'
};

const closeBtnStyle = {
  background: 'none',
  border: 'none',
  color: '#94a3b8',
  fontSize: '1.4rem',
  cursor: 'pointer',
  padding: '4px 8px',
  borderRadius: '6px'
};

const msgBannerStyle = {
  backgroundColor: 'rgba(59, 130, 246, 0.15)',
  border: '1px solid rgba(59, 130, 246, 0.4)',
  color: '#60a5fa',
  borderRadius: '8px',
  padding: '10px 14px',
  fontSize: '0.85rem',
  marginBottom: '12px',
  lineHeight: '1.4'
};

const successBannerStyle = {
  backgroundColor: 'rgba(16, 185, 129, 0.18)',
  border: '1px solid #10b981',
  color: '#6ee7b7',
  borderRadius: '8px',
  padding: '10px 14px',
  fontSize: '0.85rem',
  marginBottom: '12px',
  lineHeight: '1.4'
};

const warningBannerStyle = {
  backgroundColor: 'rgba(245, 158, 11, 0.18)',
  border: '1px solid #f59e0b',
  color: '#fcd34d',
  borderRadius: '8px',
  padding: '10px 14px',
  fontSize: '0.85rem',
  marginBottom: '12px',
  lineHeight: '1.4'
};

const errorBannerStyle = {
  backgroundColor: 'rgba(239, 68, 68, 0.18)',
  border: '1px solid #ef4444',
  color: '#fca5a5',
  borderRadius: '8px',
  padding: '10px 14px',
  fontSize: '0.85rem',
  marginBottom: '12px',
  lineHeight: '1.4'
};

const guestNoticeBannerStyle = {
  backgroundColor: 'rgba(245, 158, 11, 0.12)',
  border: '1px solid rgba(245, 158, 11, 0.35)',
  color: '#fde68a',
  borderRadius: '12px',
  padding: '12px 14px',
  marginBottom: '14px'
};

const loginActionBtnStyle = {
  padding: '8px 16px',
  backgroundColor: '#3b82f6',
  backgroundImage: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
  border: 'none',
  borderRadius: '8px',
  color: '#ffffff',
  fontWeight: '700',
  fontSize: '0.82rem',
  cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)'
};

const confirmBoxStyle = {
  backgroundColor: 'rgba(30, 41, 59, 0.95)',
  border: '1px solid #fbbf24',
  borderRadius: '12px',
  padding: '14px',
  marginBottom: '14px'
};

const overwriteBoxStyle = {
  backgroundColor: 'rgba(30, 41, 59, 0.95)',
  border: '1px solid #f59e0b',
  borderRadius: '12px',
  padding: '14px',
  marginBottom: '14px'
};

const primaryConfirmBtnStyle = {
  padding: '8px 14px',
  backgroundColor: '#3b82f6',
  border: 'none',
  borderRadius: '7px',
  color: 'white',
  fontWeight: '700',
  fontSize: '0.8rem',
  cursor: 'pointer'
};

const secondaryConfirmBtnStyle = {
  padding: '8px 14px',
  backgroundColor: 'rgba(245, 158, 11, 0.2)',
  border: '1px solid #f59e0b',
  borderRadius: '7px',
  color: '#fbbf24',
  fontWeight: '700',
  fontSize: '0.8rem',
  cursor: 'pointer'
};

const neutralConfirmBtnStyle = {
  padding: '8px 14px',
  backgroundColor: 'rgba(100, 116, 139, 0.3)',
  border: '1px solid #64748b',
  borderRadius: '7px',
  color: '#e2e8f0',
  fontWeight: '600',
  fontSize: '0.8rem',
  cursor: 'pointer'
};

const cancelConfirmBtnStyle = {
  padding: '8px 12px',
  backgroundColor: 'transparent',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '7px',
  color: '#94a3b8',
  fontSize: '0.8rem',
  cursor: 'pointer'
};

const overwriteBtnStyle = {
  padding: '8px 14px',
  backgroundColor: '#f59e0b',
  backgroundImage: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  border: 'none',
  borderRadius: '7px',
  color: '#ffffff',
  fontWeight: '700',
  fontSize: '0.8rem',
  cursor: 'pointer'
};

const upgradeConfirmBtnStyle = {
  padding: '8px 14px',
  backgroundColor: '#10b981',
  backgroundImage: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  border: 'none',
  borderRadius: '7px',
  color: '#ffffff',
  fontWeight: '700',
  fontSize: '0.8rem',
  cursor: 'pointer'
};

const saveBoxStyle = {
  backgroundColor: 'rgba(15, 23, 42, 0.95)',
  padding: '14px',
  borderRadius: '12px',
  border: '1px solid rgba(59, 130, 246, 0.25)'
};

const inputStyle = {
  flex: 1,
  padding: '10px 12px',
  backgroundColor: '#030712',
  border: '1px solid rgba(59, 130, 246, 0.4)',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '0.88rem',
  outline: 'none'
};

const saveBtnStyle = {
  padding: '10px 18px',
  backgroundColor: '#10b981',
  backgroundImage: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  border: 'none',
  borderRadius: '8px',
  color: '#ffffff',
  fontWeight: '700',
  cursor: 'pointer',
  fontSize: '0.88rem',
  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
  whiteSpace: 'nowrap'
};

const auditBtnStyle = {
  padding: '4px 10px',
  backgroundColor: 'rgba(59, 130, 246, 0.15)',
  border: '1px solid rgba(59, 130, 246, 0.35)',
  borderRadius: '6px',
  color: '#93c5fd',
  fontSize: '0.74rem',
  fontWeight: '600',
  cursor: 'pointer'
};

const auditPanelStyle = {
  backgroundColor: 'rgba(15, 23, 42, 0.95)',
  border: '1px solid rgba(59, 130, 246, 0.3)',
  borderRadius: '10px',
  padding: '10px 14px',
  marginBottom: '10px'
};

const projectListContainerStyle = {
  flex: 1,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  marginTop: '4px',
  paddingRight: '4px'
};

const emptyStyle = {
  textAlign: 'center',
  padding: '36px 20px',
  color: '#64748b',
  fontSize: '0.85rem',
  background: 'rgba(15, 23, 42, 0.4)',
  borderRadius: '10px',
  border: '1px dashed rgba(255, 255, 255, 0.1)'
};

const projectCardStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: 'rgba(15, 23, 42, 0.85)',
  padding: '12px 14px',
  borderRadius: '10px',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  transition: 'border 0.2s',
  gap: '10px'
};

const projTitleStyle = {
  fontWeight: '700',
  color: '#f8fafc',
  fontSize: '0.95rem',
  wordBreak: 'break-word',
  whiteSpace: 'normal',
  lineHeight: '1.4',
  flex: 1
};

const projDateStyle = {
  fontSize: '0.74rem',
  color: '#64748b',
  marginTop: '4px'
};

const cloudBadgeTag = {
  fontSize: '0.68rem',
  padding: '2px 8px',
  borderRadius: '6px',
  background: 'rgba(59, 130, 246, 0.2)',
  color: '#60a5fa',
  border: '1px solid rgba(59, 130, 246, 0.4)',
  fontWeight: '700'
};

const localBadgeTag = {
  fontSize: '0.68rem',
  padding: '2px 8px',
  borderRadius: '6px',
  background: 'rgba(245, 158, 11, 0.15)',
  color: '#fbbf24',
  border: '1px solid rgba(245, 158, 11, 0.3)',
  fontWeight: '700'
};

const draftBadgeTag = {
  fontSize: '0.68rem',
  padding: '2px 6px',
  borderRadius: '6px',
  background: 'rgba(139, 92, 246, 0.2)',
  color: '#c4b5fd',
  border: '1px solid rgba(139, 92, 246, 0.4)',
  fontWeight: '600'
};

const loadBtnStyle = {
  padding: '7px 12px',
  backgroundColor: '#3b82f6',
  backgroundImage: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
  border: 'none',
  borderRadius: '7px',
  color: '#ffffff',
  fontWeight: '700',
  fontSize: '0.8rem',
  cursor: 'pointer',
  whiteSpace: 'nowrap'
};

const amcDownloadBtnStyle = {
  padding: '7px 10px',
  backgroundColor: 'rgba(59, 130, 246, 0.15)',
  border: '1px solid rgba(59, 130, 246, 0.4)',
  borderRadius: '7px',
  color: '#93c5fd',
  fontWeight: '600',
  fontSize: '0.8rem',
  cursor: 'pointer',
  whiteSpace: 'nowrap'
};

const deleteBtnStyle = {
  padding: '7px 10px',
  backgroundColor: 'rgba(239, 68, 68, 0.15)',
  border: '1px solid rgba(239, 68, 68, 0.4)',
  borderRadius: '7px',
  color: '#fca5a5',
  cursor: 'pointer',
  fontSize: '0.85rem'
};
