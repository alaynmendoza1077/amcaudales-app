import { saveAs } from 'file-saver';

/**
 * Descarga de archivos blindada y universal.
 * Utiliza file-saver (saveAs) con fallback directo por elemento <a> Blob.
 * Nunca bloquea ni cancela la descarga por expiración de gestos del navegador.
 */
export const saveFileWithDialog = async (blob, defaultFileName) => {
  try {
    // 1. Método principal: saveAs de file-saver (altamente optimizado y estándar web)
    if (typeof saveAs === 'function') {
      saveAs(blob, defaultFileName);
      return true;
    }
  } catch (err) {
    console.warn("saveAs falló, intentando enlace Blob directo:", err);
  }

  // 2. Fallback universal garantizado por elemento <a> temporal
  try {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.style.display = "none";
    link.href = url;
    link.download = defaultFileName;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      try {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (e) {}
    }, 1000);
    return true;
  } catch (e) {
    console.error("Error crítico en descarga de archivo:", e);
    return false;
  }
};
