export const saveFileWithDialog = async (blob, defaultFileName) => {
  if (typeof window !== 'undefined' && window.showSaveFilePicker) {
    try {
      const extension = defaultFileName.split('.').pop().toLowerCase();
      let mimeType = 'text/plain';
      let description = 'Archivo';
      
      if (extension === 'amc') {
        mimeType = 'application/json';
        description = 'Proyecto AMCaudales';
      } else if (extension === 'lsp') {
        mimeType = 'text/plain';
        description = 'Script LISP de AutoCAD';
      } else if (extension === 'xlsx' || extension === 'xls') {
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        description = 'Hoja de Cálculo Excel';
      } else if (extension === 'geojson') {
        mimeType = 'application/geo+json';
        description = 'Archivo GeoJSON';
      } else if (extension === 'inp') {
        mimeType = 'text/plain';
        description = 'Archivo INP de SWMM';
      } else if (extension === 'csv') {
        mimeType = 'text/csv';
        description = 'Archivo CSV';
      } else if (extension === 'dxf') {
        mimeType = 'application/dxf';
        description = 'Plano de AutoCAD DXF';
      }

      const options = {
        suggestedName: defaultFileName,
        types: [{
          description: description,
          accept: { [mimeType]: [`.${extension}`] },
        }],
      };
      
      const handle = await window.showSaveFilePicker(options);
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch (err) {
      if (err.name === 'AbortError') return false;
      console.warn("showSaveFilePicker falló o fue bloqueado, usando descarga directa URL Blob:", err);
    }
  }

  // Descarga directa por enlace Blob para evitar bloqueos del navegador
  try {
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = defaultFileName;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 500);
    return true;
  } catch (e) {
    console.error("Error en descarga directa Blob:", e);
    return false;
  }
};
