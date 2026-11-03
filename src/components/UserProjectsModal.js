import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function UserProjectsModal({ isOpen, onClose, onLoadProject, onSaveCurrentProject }) {
  const { cloudProjects, loadProjectFromCloud, saveProjectToCloud, deleteProjectFromCloud, user, isCloudConfigured } = useAuth();
  const [newProjectTitle, setNewProjectTitle] = useState('Nuevo Proyecto AMC');
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [msg, setMsg] = useState('');

  if (!isOpen) return null;

  const handleSelectProject = async (projectId) => {
    setLoading(true);
    setMsg('Cargando datos del proyecto...');
    try {
      const projectDataPayload = await loadProjectFromCloud(projectId);
      onLoadProject(projectDataPayload);
      setMsg('¡Proyecto cargado con éxito!');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCurrent = async () => {
    if (!newProjectTitle.trim()) return;
    setLoading(true);
    setMsg('Guardando proyecto...');
    try {
      await onSaveCurrentProject(newProjectTitle.trim());
      setMsg('¡Proyecto guardado exitosamente!');
      setTimeout(() => {
        setMsg('');
      }, 2500);
    } catch (err) {
      setMsg(`Error al guardar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (projectId, projectTitle) => {
    const confirmDelete = window.confirm(`¿Estás seguro de que deseas eliminar permanentemente el proyecto "${projectTitle}"?\n\nEsta acción no se puede deshacer.`);
    if (!confirmDelete) return;

    setDeletingId(projectId);
    try {
      await deleteProjectFromCloud(projectId);
      setMsg(`Proyecto "${projectTitle}" eliminado correctamente.`);
      setTimeout(() => setMsg(''), 2500);
    } catch (err) {
      setMsg(`Error al eliminar: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        
        {/* Header */}
        <div style={headerStyle}>
          <div>
            <h2 style={titleStyle}>📁 Mis Proyectos en la Plataforma</h2>
            <p style={subtitleStyle}>
              Usuario: <strong>{user?.user_metadata?.full_name || user?.email || 'Invitado'}</strong>
              <span style={{ marginLeft: '10px', color: isCloudConfigured ? '#34d399' : '#fbbf24' }}>
                {isCloudConfigured ? '• ☁️ Nube Supabase' : '• 💾 Almacenamiento Local'}
              </span>
            </p>
          </div>
          <button style={closeBtnStyle} onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        {msg && <div style={msgBannerStyle}>{msg}</div>}

        {/* Sección Guardar Proyecto Actual */}
        <div style={saveBoxStyle}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            💾 Guardar Diseño Actual
          </h4>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={newProjectTitle}
              onChange={(e) => setNewProjectTitle(e.target.value)}
              placeholder="Nombre del Proyecto (ej. Alcantarillado Sector Norte)"
              style={inputStyle}
            />
            <button
              onClick={handleSaveCurrent}
              disabled={loading}
              style={saveBtnStyle}
            >
              ☁️ Guardar
            </button>
          </div>
        </div>

        {/* Lista de Proyectos Guardados */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 10px 0' }}>
          <h4 style={{ margin: 0, fontSize: '0.88rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Proyectos Almacenados ({cloudProjects.length})
          </h4>
        </div>

        <div style={projectListContainerStyle}>
          {cloudProjects.length === 0 ? (
            <div style={emptyStyle}>
              No tienes proyectos guardados aún en la plataforma. ¡Guarda tu primer diseño arriba!
            </div>
          ) : (
            cloudProjects.map((p) => (
              <div key={p.id} style={projectCardStyle}>
                <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={projTitleStyle}>{p.title}</span>
                    {p.isCloud ? (
                      <span style={cloudBadgeTag}>☁️ Nube</span>
                    ) : (
                      <span style={localBadgeTag}>💾 Local</span>
                    )}
                  </div>
                  <div style={projDateStyle}>
                    Última actualización: {new Date(p.updated_at).toLocaleString('es-CO')}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={() => handleSelectProject(p.id)}
                    disabled={loading || deletingId === p.id}
                    style={loadBtnStyle}
                    title="Cargar y abrir este proyecto"
                  >
                    Abrir 📂
                  </button>

                  <button
                    onClick={() => handleDelete(p.id, p.title)}
                    disabled={loading || deletingId === p.id}
                    style={deleteBtnStyle}
                    title="Eliminar este proyecto"
                  >
                    {deletingId === p.id ? '...' : '🗑️'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── ESTILOS DEL MODAL DE PROYECTOS ──
const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: 'rgba(3, 7, 18, 0.85)',
  backdropFilter: 'blur(10px)',
  zIndex: 100000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px'
};

const cardStyle = {
  width: '100%',
  maxWidth: '580px',
  maxHeight: '85vh',
  backgroundColor: '#0a1128',
  border: '1px solid rgba(59, 130, 246, 0.35)',
  borderRadius: '20px',
  boxShadow: '0 25px 60px rgba(0, 0, 0, 0.75)',
  padding: '24px',
  color: '#f0f4f8',
  fontFamily: "'Inter', sans-serif",
  display: 'flex',
  flexDirection: 'column'
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '16px'
};

const titleStyle = {
  fontSize: '1.25rem',
  fontWeight: '800',
  margin: 0,
  color: '#ffffff'
};

const subtitleStyle = {
  fontSize: '0.82rem',
  color: '#94a3b8',
  marginTop: '4px',
  marginBottom: 0
};

const closeBtnStyle = {
  background: 'none',
  border: 'none',
  color: '#94a3b8',
  fontSize: '1.3rem',
  cursor: 'pointer',
  padding: '4px'
};

const msgBannerStyle = {
  backgroundColor: 'rgba(59, 130, 246, 0.15)',
  border: '1px solid rgba(59, 130, 246, 0.4)',
  color: '#60a5fa',
  borderRadius: '8px',
  padding: '10px 14px',
  fontSize: '0.85rem',
  marginBottom: '14px'
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
  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
};

const projectListContainerStyle = {
  flex: 1,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  marginTop: '4px',
  paddingRight: '4px'
};

const emptyStyle = {
  textAlign: 'center',
  padding: '30px 20px',
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
  border: '1px solid rgba(255, 255, 255, 0.08)'
};

const projTitleStyle = {
  fontWeight: '700',
  color: '#f8fafc',
  fontSize: '0.9rem',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
};

const projDateStyle = {
  fontSize: '0.74rem',
  color: '#64748b',
  marginTop: '3px'
};

const cloudBadgeTag = {
  fontSize: '0.68rem',
  padding: '2px 6px',
  borderRadius: '6px',
  background: 'rgba(59, 130, 246, 0.2)',
  color: '#60a5fa',
  border: '1px solid rgba(59, 130, 246, 0.4)',
  fontWeight: '600'
};

const localBadgeTag = {
  fontSize: '0.68rem',
  padding: '2px 6px',
  borderRadius: '6px',
  background: 'rgba(245, 158, 11, 0.15)',
  color: '#fbbf24',
  border: '1px solid rgba(245, 158, 11, 0.3)',
  fontWeight: '600'
};

const loadBtnStyle = {
  padding: '7px 14px',
  backgroundColor: '#3b82f6',
  backgroundImage: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
  border: 'none',
  borderRadius: '7px',
  color: '#ffffff',
  fontWeight: '700',
  fontSize: '0.8rem',
  cursor: 'pointer'
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
