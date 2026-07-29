import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function UserProjectsModal({ isOpen, onClose, onLoadProject, onSaveCurrentProject }) {
  const { cloudProjects, loadProjectFromCloud, saveProjectToCloud, user } = useAuth();
  const [newProjectTitle, setNewProjectTitle] = useState('Nuevo Proyecto AMC');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  if (!isOpen) return null;

  const handleSelectProject = async (projectId) => {
    setLoading(true);
    setMsg('Cargando proyecto desde la nube...');
    try {
      const projectDataPayload = await loadProjectFromCloud(projectId);
      onLoadProject(projectDataPayload);
      setMsg('¡Proyecto cargado con éxito!');
      setTimeout(() => {
        onClose();
      }, 800);
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
      setMsg('¡Proyecto guardado exitosamente en la nube!');
      setTimeout(() => {
        setMsg('');
      }, 2000);
    } catch (err) {
      setMsg(`Error al guardar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div>
            <h2 style={titleStyle}>📁 Mis Proyectos en la Nube</h2>
            <p style={subtitleStyle}>
              Usuario: <strong>{user?.user_metadata?.full_name || user?.email}</strong>
            </p>
          </div>
          <button style={closeBtnStyle} onClick={onClose}>✕</button>
        </div>

        {msg && <div style={msgBannerStyle}>{msg}</div>}

        {/* Sección Guardar Proyecto Actual */}
        <div style={saveBoxStyle}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#e2e8f0' }}>
            Guardar Diseño Actual en la Nube
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
        <h4 style={{ margin: '16px 0 10px 0', fontSize: '0.9rem', color: '#94a3b8' }}>
          Proyectos Almacenados ({cloudProjects.length})
        </h4>

        <div style={projectListContainerStyle}>
          {cloudProjects.length === 0 ? (
            <div style={emptyStyle}>
              No tienes proyectos guardados aún en la nube. ¡Guarda tu primer diseño arriba!
            </div>
          ) : (
            cloudProjects.map((p) => (
              <div key={p.id} style={projectCardStyle}>
                <div>
                  <div style={projTitleStyle}>{p.title}</div>
                  <div style={projDateStyle}>
                    Última modificación: {new Date(p.updated_at).toLocaleString('es-CO')}
                  </div>
                </div>
                <button
                  onClick={() => handleSelectProject(p.id)}
                  disabled={loading}
                  style={loadBtnStyle}
                >
                  Abrir 📂
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: 'rgba(11, 15, 25, 0.75)',
  backdropFilter: 'blur(8px)',
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px'
};

const cardStyle = {
  width: '100%',
  maxWidth: '560px',
  maxHeight: '85vh',
  backgroundColor: '#161c2e',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '16px',
  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
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
  fontSize: '1.3rem',
  fontWeight: '700',
  fontFamily: "'Outfit', sans-serif",
  margin: 0,
  color: '#ffffff'
};

const subtitleStyle = {
  fontSize: '0.85rem',
  color: '#38bdf8',
  marginTop: '4px',
  marginBottom: 0
};

const closeBtnStyle = {
  background: 'none',
  border: 'none',
  color: '#94a3b8',
  fontSize: '1.3rem',
  cursor: 'pointer'
};

const msgBannerStyle = {
  backgroundColor: 'rgba(0, 168, 255, 0.15)',
  border: '1px solid rgba(0, 168, 255, 0.4)',
  color: '#38bdf8',
  borderRadius: '8px',
  padding: '10px 14px',
  fontSize: '0.85rem',
  marginBottom: '14px'
};

const saveBoxStyle = {
  backgroundColor: '#0f172a',
  padding: '14px',
  borderRadius: '10px',
  border: '1px solid #334155'
};

const inputStyle = {
  flex: 1,
  padding: '8px 12px',
  backgroundColor: '#1e293b',
  border: '1px solid #475569',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '0.85rem'
};

const saveBtnStyle = {
  padding: '8px 16px',
  backgroundColor: '#10b981',
  backgroundImage: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  border: 'none',
  borderRadius: '6px',
  color: '#ffffff',
  fontWeight: '600',
  cursor: 'pointer',
  fontSize: '0.85rem'
};

const projectListContainerStyle = {
  flex: 1,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  marginTop: '4px'
};

const emptyStyle = {
  textAlign: 'center',
  padding: '24px',
  color: '#64748b',
  fontSize: '0.85rem'
};

const projectCardStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: '#0f172a',
  padding: '12px 16px',
  borderRadius: '8px',
  border: '1px solid #1e293b'
};

const projTitleStyle = {
  fontWeight: '600',
  color: '#f8fafc',
  fontSize: '0.9rem'
};

const projDateStyle = {
  fontSize: '0.75rem',
  color: '#64748b',
  marginTop: '2px'
};

const loadBtnStyle = {
  padding: '6px 12px',
  backgroundColor: '#3b82f6',
  border: 'none',
  borderRadius: '6px',
  color: '#ffffff',
  fontWeight: '600',
  fontSize: '0.8rem',
  cursor: 'pointer'
};
