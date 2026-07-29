export const saveFileWithDialog = async (blob, defaultFileName) => {
  if (window.showSaveFilePicker) {
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
      if (err.name !== 'AbortError') {
        console.error("Error al guardar archivo con showSaveFilePicker:", err);
      }
      return false;
    }
  } else {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = defaultFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  }
};
