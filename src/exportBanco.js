import ExcelJS from 'exceljs';
import { saveFileWithDialog } from './utils/fileSaver';
import PTOBASE_DATA from './ptoBaseData';

/**
 * Exportador Oficial de Presupuesto en Formato Institucional EMPAS 2026
 * 
 * Cumple estrictamente con la estructura de filas, columnas, fórmulas por capítulos,
 * subtotales, totales dinámicos, cuadro de A.I.U. e imagen corporativa de EMPAS.
 */
export async function exportBancoExcel(P = {}, usedItems = [], capTot = {}, cd = 0, adm = 0, imp = 0, ut = 0, pma = 0, pmt = 0, sumDirecto = 0, lt = 1, allItems = null) {
  try {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'AMCaudales Pro';
    wb.created = new Date();

    // Mapear items utilizados y catálogo completo
    const usedMap = {};
    (usedItems || []).forEach(it => {
      if (it && it.c) usedMap[it.c] = it;
    });

    const allItemsMap = {};
    (allItems || []).forEach(it => {
      if (it && it.c) allItemsMap[it.c] = it;
    });

    // Catálogo base oficial EMPAS (filtrando metadatos iniciales)
    const baseCatalog = (PTOBASE_DATA || []).filter(it => it && it.c && /^[1-9S]/.test(it.c));

    // Parámetros financieros
    const pAdmin = P.porcAdmin !== undefined ? parseFloat(P.porcAdmin) : 0.24;
    const pImp = P.porcImprevistos !== undefined ? parseFloat(P.porcImprevistos) : 0.01;
    const pUt = P.porcUtilidad !== undefined ? parseFloat(P.porcUtilidad) : 0.05;
    const pIva = P.porcIVA !== undefined ? parseFloat(P.porcIVA) : 0.19;
    const pPma = P.porcPMA !== undefined ? parseFloat(P.porcPMA) : 0.025525;
    const pPmt = P.porcPMT !== undefined ? parseFloat(P.porcPMT) : 0.051068;
    const pInt = P.porcInterventoria !== undefined ? parseFloat(P.porcInterventoria) : 0.08;

    // Estilos institucionales EMPAS
    const fillHeader = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003B73' } };
    const fillSubHeader = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F0' } };
    const fillFormTitle = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF5FB' } };
    const fillCap1 = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3A5C' } };
    const fillCap2 = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D6A9C' } };
    const fillCap3 = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F0' } };
    const fillResumen = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF5FB' } };
    const fillRowAlt = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };

    const fontWhiteBold = (sz = 10) => ({ name: 'Arial', size: sz, bold: true, color: { argb: 'FFFFFFFF' } });
    const fontNavyBold = (sz = 10) => ({ name: 'Arial', size: sz, bold: true, color: { argb: 'FF003B73' } });
    const fontData = (bold = false, sz = 10) => ({ name: 'Arial', size: sz, bold: !!bold, color: { argb: 'FF0A0A0A' } });

    const borderThin = {
      top: { style: 'thin', color: { argb: 'FFBBBBBB' } },
      left: { style: 'thin', color: { argb: 'FFBBBBBB' } },
      bottom: { style: 'thin', color: { argb: 'FFBBBBBB' } },
      right: { style: 'thin', color: { argb: 'FFBBBBBB' } }
    };
    const borderHeader = {
      top: { style: 'medium', color: { argb: 'FF002244' } },
      left: { style: 'medium', color: { argb: 'FF002244' } },
      bottom: { style: 'medium', color: { argb: 'FF002244' } },
      right: { style: 'medium', color: { argb: 'FF002244' } }
    };

    const ws = wb.addWorksheet('10.Presupuesto2026', {
      views: [{ showGridLines: true }]
    });

    ws.pageSetup.orientation = 'landscape';
    ws.pageSetup.fitToPage = true;
    ws.pageSetup.fitToWidth = 1;
    ws.pageSetup.fitToHeight = 0;

    // Configuración exacta de columnas
    ws.columns = [
      { key: 'colA', width: 16 }, // A: CODIGO
      { key: 'colB', width: 62 }, // B: DESCRIPCION
      { key: 'colC', width: 10 }, // C: UNIDAD
      { key: 'colD', width: 14 }, // D: CANTIDAD
      { key: 'colE', width: 18 }, // E: PRECIO PESO
      { key: 'colF', width: 22 }, // F: TOTAL PESO
      { key: 'colG', width: 3 },  // G: Separador
      { key: 'colH', width: 6 }   // H: ESTADO / FLAG ACTIVO
    ];

    // Filas 1 a 24: ENCABEZADO INSTITUCIONAL EMPAS
    for (let i = 1; i <= 24; i++) {
      ws.addRow([]);
    }

    // Fila 1: Título Empresa
    ws.mergeCells('A1:F1');
    const r1 = ws.getCell('A1');
    r1.value = 'EMPRESA PUBLICA DE ALCANTARILLADO DE SANTANDER S.A. E.S.P.';
    r1.font = fontWhiteBold(12);
    r1.alignment = { horizontal: 'center', vertical: 'middle' };
    r1.fill = fillHeader;
    ws.getRow(1).height = 26;

    // Filas 2-9: Franja azul institucional
    for (let r = 2; r <= 9; r++) {
      ws.mergeCells(`A${r}:F${r}`);
      ws.getCell(`A${r}`).fill = fillHeader;
      ws.getRow(r).height = 5;
    }

    // Fila 10: Subgerencia
    ws.mergeCells('A10:F10');
    const r10 = ws.getCell('A10');
    r10.value = 'SUBGERENCIA DE ALCANTARILLADO';
    r10.font = fontWhiteBold(11);
    r10.alignment = { horizontal: 'center', vertical: 'middle' };
    r10.fill = fillHeader;
    ws.getRow(10).height = 20;

    // Filas 11-15: Franja clara
    for (let r = 11; r <= 15; r++) {
      ws.mergeCells(`A${r}:F${r}`);
      ws.getCell(`A${r}`).fill = fillSubHeader;
      ws.getRow(r).height = 5;
    }

    // Fila 16: Información General (Proyecto y Fecha)
    ws.mergeCells('A16:B16');
    const r16A = ws.getCell('A16');
    r16A.value = 'NOMBRE DEL PROYECTO:';
    r16A.font = fontNavyBold(10);
    r16A.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    r16A.fill = fillSubHeader;

    const r16C = ws.getCell('C16');
    r16C.value = (P.municipio || 'BUCARAMANGA').toUpperCase();
    r16C.font = fontData(true, 10);
    r16C.alignment = { horizontal: 'center', vertical: 'middle' };
    r16C.fill = fillSubHeader;

    ws.mergeCells('D16:E16');
    const r16D = ws.getCell('D16');
    r16D.value = 'FECHA:';
    r16D.font = fontNavyBold(10);
    r16D.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };
    r16D.fill = fillSubHeader;

    const r16F = ws.getCell('F16');
    r16F.value = P.fecha || new Date().toLocaleDateString('es-CO');
    r16F.font = fontData(false, 10);
    r16F.alignment = { horizontal: 'center', vertical: 'middle' };
    r16F.fill = fillSubHeader;
    ws.getRow(16).height = 18;

    // Filas 17-19: Franja clara
    for (let r = 17; r <= 19; r++) {
      ws.mergeCells(`A${r}:F${r}`);
      ws.getCell(`A${r}`).fill = fillSubHeader;
      ws.getRow(r).height = 5;
    }

    // Fila 20: Nombre Completo del Proyecto
    ws.mergeCells('A20:F20');
    const r20 = ws.getCell('A20');
    r20.value = (P.proyecto || P.barrio || 'CONSTRUCCION SISTEMA DE ALCANTARILLADO').toUpperCase();
    r20.font = fontNavyBold(11);
    r20.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    r20.fill = fillSubHeader;
    ws.getRow(20).height = 24;

    // Filas 21-22: Márgenes
    for (let r = 21; r <= 22; r++) {
      ws.mergeCells(`A${r}:F${r}`);
      ws.getRow(r).height = 5;
    }

    // Fila 23: Título del Formulario
    ws.mergeCells('A23:F23');
    const r23 = ws.getCell('A23');
    r23.value = 'FORMULARIO APROXIMADO DE OBRA';
    r23.font = fontNavyBold(11);
    r23.alignment = { horizontal: 'center', vertical: 'middle' };
    r23.fill = fillFormTitle;
    ws.getRow(23).height = 18;

    // Fila 24: Separador
    ws.mergeCells('A24:F24');
    ws.getRow(24).height = 4;

    // Fila 25: Cabecera de Columnas Oficial
    const headerRow = ws.getRow(25);
    const headers = ['CODIGO', 'DESCRIPCION', 'UNIDAD', 'CANTIDAD', 'PRECIO PESO', 'TOTAL PESO', '', 'ESTADO'];
    headers.forEach((hd, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = hd;
      cell.font = fontWhiteBold(10);
      cell.fill = fillHeader;
      cell.alignment = { horizontal: idx === 1 ? 'left' : 'center', vertical: 'middle' };
      cell.border = borderHeader;
    });
    headerRow.height = 24;

    // Filas 26+: Inyección secuencial de items del catálogo
    let currentRow = 26;
    const rowMap = {};
    const isLeafMap = {};

    baseCatalog.forEach(it => {
      const parts = it.c.split('.');
      const hasPrice = (it.p || 0) > 0;
      isLeafMap[it.c] = hasPrice || parts.length >= 4;
    });

    baseCatalog.forEach(it => {
      const code = it.c;
      const parts = code.split('.');
      const lv = parts.length;
      const isLeaf = isLeafMap[code];

      const usedItem = usedMap[code];
      const allItem = allItemsMap[code];
      const sourceItem = usedItem || allItem || it;

      const qty = isLeaf ? (sourceItem.q || 0) : null;
      const pu = isLeaf ? (sourceItem.p !== undefined ? sourceItem.p : it.p || 0) : null;
      const hasVal = isLeaf && qty > 0;

      let desc = sourceItem.d || it.d || '';
      if (code === "2.01.01" && P.nombreExcMaquina) desc = P.nombreExcMaquina.replace('%', '').trim();
      else if (desc.toLowerCase().includes("sin acarreo libre") && P.nombreExcMaquina) desc = desc.replace(/sin acarreo libre/ig, P.nombreExcMaquina.replace('%', '').trim());
      if (code === "2.01.02" && P.nombreExcManual) desc = P.nombreExcManual.replace('%', '').trim();
      else if (desc.toLowerCase().includes("con acarreo libre") && P.nombreExcManual) desc = desc.replace(/con acarreo libre/ig, P.nombreExcManual.replace('%', '').trim());

      if (code.startsWith("2.01.01.") && P.nombreExcMaquina) desc = desc.replace(/Excavaci.*?n(?: a m.*?quina)?/i, P.nombreExcMaquina.replace('%', '').trim());
      if (code.startsWith("2.01.02.") && P.nombreExcManual) desc = desc.replace(/Excavaci.*?n(?: a m.*?quina)?(.*?)(?:con acarreo|acarreo)?/i, P.nombreExcManual.replace('%', '').trim() + "$1");

      const row = ws.getRow(currentRow);
      rowMap[code] = currentRow;

      // Col A: Código
      const cellA = row.getCell(1);
      cellA.value = code;
      cellA.alignment = { horizontal: 'center', vertical: 'middle' };

      // Col B: Descripción
      const cellB = row.getCell(2);
      cellB.value = desc;
      cellB.alignment = { horizontal: 'left', vertical: 'middle', indent: Math.max(0, lv - 1), wrapText: lv >= 3 };

      // Col C: Unidad
      const cellC = row.getCell(3);
      cellC.value = isLeaf ? (sourceItem.u || it.u || 'GLB') : (lv <= 2 ? 'GLB' : '');
      cellC.alignment = { horizontal: 'center', vertical: 'middle' };

      // Col D: Cantidad
      const cellD = row.getCell(4);
      cellD.value = isLeaf ? qty : null;
      cellD.alignment = { horizontal: 'right', vertical: 'middle' };
      if (isLeaf) cellD.numFmt = '#,##0.00';

      // Col E: Precio Unitario
      const cellE = row.getCell(5);
      cellE.value = isLeaf ? pu : null;
      cellE.alignment = { horizontal: 'right', vertical: 'middle' };
      if (isLeaf) cellE.numFmt = '"$"#,##0.00';

      // Col F: Total
      const cellF = row.getCell(6);
      if (isLeaf) {
        cellF.value = {
          formula: `D${currentRow}*E${currentRow}`,
          result: Math.round((qty || 0) * (pu || 0))
        };
      }
      cellF.alignment = { horizontal: 'right', vertical: 'middle' };
      cellF.numFmt = '"$"#,##0.00';

      // Col H: Flag de Estado
      const cellH = row.getCell(8);
      cellH.value = isLeaf ? (hasVal ? 1 : 0) : 1;
      cellH.alignment = { horizontal: 'center', vertical: 'middle' };
      cellH.font = fontData(false, 8);

      // Estilos según nivel jerárquico
      if (!isLeaf) {
        if (lv === 1) {
          row.eachCell({ includeEmpty: true }, (c, col) => {
            if (col <= 6) { c.fill = fillCap1; c.font = fontWhiteBold(10); }
            c.border = borderThin;
          });
          row.height = 20;
        } else if (lv === 2) {
          row.eachCell({ includeEmpty: true }, (c, col) => {
            if (col <= 6) { c.fill = fillCap2; c.font = fontWhiteBold(10); }
            c.border = borderThin;
          });
          row.height = 18;
        } else {
          row.eachCell({ includeEmpty: true }, (c, col) => {
            if (col <= 6) { c.fill = fillCap3; c.font = fontNavyBold(10); }
            c.border = borderThin;
          });
          row.height = 16;
        }
      } else {
        const bg = (currentRow % 2 === 0) ? fillRowAlt : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
        row.eachCell({ includeEmpty: true }, (c, col) => {
          if (col <= 6) {
            c.fill = bg;
            c.font = fontData(false, 10);
          }
          c.border = borderThin;
        });
        row.height = 16;
      }

      currentRow++;
    });

    // Inyección de fórmulas dinámicas en grupos y capítulos
    baseCatalog.slice().reverse().forEach(it => {
      const code = it.c;
      const isLeaf = isLeafMap[code];
      if (!isLeaf) {
        const parentRow = rowMap[code];
        const directChildren = baseCatalog.filter(child => {
          const p = child.c.split('.');
          p.pop();
          return p.join('.') === code;
        });

        const validChildren = directChildren.filter(c => rowMap[c.c] !== undefined);
        if (validChildren.length > 0 && parentRow !== undefined) {
          const sumFormula = validChildren.map(c => `F${rowMap[c.c]}`).join('+');
          const cellF = ws.getCell(`F${parentRow}`);
          cellF.value = { formula: sumFormula };
          cellF.numFmt = '"$"#,##0.00';
        }
      }
    });

    // Fila separadora
    ws.addRow([]);
    currentRow++;

    // RESUMEN FINANCIERO CON FÓRMULAS VINCULADAS
    const addResumenRow = (label, pctVal, formulaStr, hardResult, isMain = false, isBold = false) => {
      const r = ws.getRow(currentRow);
      r.height = isMain ? 20 : 17;

      for (let c = 1; c <= 6; c++) {
        const cell = r.getCell(c);
        cell.fill = isMain ? fillCap1 : fillResumen;
        cell.border = borderThin;
        cell.font = isMain ? fontWhiteBold(10) : fontData(isBold, 10);
      }

      const cellB = r.getCell(2);
      cellB.value = label;
      cellB.alignment = { horizontal: 'left', vertical: 'middle', indent: isMain ? 1 : 2 };

      const cellC = r.getCell(3);
      if (pctVal !== null && pctVal !== undefined) {
        cellC.value = pctVal;
        cellC.numFmt = '0.00%';
        cellC.alignment = { horizontal: 'center', vertical: 'middle' };
      }

      const cellF = r.getCell(6);
      if (formulaStr) {
        cellF.value = { formula: formulaStr, result: hardResult };
      } else {
        cellF.value = hardResult;
      }
      cellF.numFmt = '"$"#,##0.00';
      cellF.alignment = { horizontal: 'right', vertical: 'middle' };

      const retRow = currentRow;
      currentRow++;
      return retRow;
    };

    const capRoots = ['1', '2', '3', '4', '5'].filter(ch => rowMap[ch] !== undefined);
    const cdFormula = capRoots.length > 0 ? capRoots.map(ch => `F${rowMap[ch]}`).join('+') : `${cd}`;

    const rCD = addResumenRow('F. COSTO DIRECTO OBRA CIVIL', null, cdFormula, cd, false, true);
    const rAdm = addResumenRow('G. Administracion', pAdmin, `F${rCD}*C${currentRow}`, adm);
    const rImp = addResumenRow('H. Imprevistos', pImp, `F${rCD}*C${currentRow}`, imp);
    const rUt = addResumenRow('I. Utilidad', pUt, `F${rCD}*C${currentRow}`, ut);
    const rIva = addResumenRow('J. IVA sobre Utilidad', pIva, `F${rUt}*C${currentRow}`, iva);

    const ocTotForm = `F${rCD}+F${rAdm}+F${rImp}+F${rUt}+F${rIva}`;
    const rTotOC = addResumenRow('COSTO TOTAL OBRA CIVIL', null, ocTotForm, cd + adm + imp + ut + iva, false, true);

    const rPma = pma > 0 ? addResumenRow('Plan Manejo Ambiental (PMA)', pPma, `F${rCD}*C${currentRow}`, pma) : null;
    const rPmt = pmt > 0 ? addResumenRow('Plan Manejo Transito (PMT)', pPmt, `F${rCD}*C${currentRow}`, pmt) : null;

    const ctoObForm = `F${rTotOC}` + (rPma ? `+F${rPma}` : '') + (rPmt ? `+F${rPmt}` : '');
    const rCtoOb = addResumenRow('COSTO TOTAL OBRA', null, ctoObForm, (cd + adm + imp + ut + iva + pma + pmt), false, true);

    const aiuSum = Math.round(sumDirecto * 0.291);
    const intSum = 0;
    const costoObra = cd + adm + imp + ut + iva + pma + pmt;
    const interObra = (P.reqInterventoria === 'S' || P.reqInterventoria === true)
      ? Math.round((costoObra + sumDirecto + aiuSum) * pInt)
      : 0;

    let rSum = null, rAiuSum = null;
    if (sumDirecto > 0 && rowMap['S'] !== undefined) {
      rSum = addResumenRow('Suministros (Costo Directo)', null, `F${rowMap['S']}`, sumDirecto, false, true);
      rAiuSum = addResumenRow('A.I.U Suministros (29.1%)', 0.291, `F${rSum}*0.291`, aiuSum);
    }

    let rInt = null;
    if (interObra > 0) {
      const sumBase = rSum ? `+F${rSum}+F${rAiuSum}` : '';
      const intFormula = `(F${rCtoOb}${sumBase})*C${currentRow}`;
      rInt = addResumenRow('Interventoria', pInt, intFormula, interObra, false, true);
    }

    const totProyFormula = `F${rCtoOb}` + (rInt ? `+F${rInt}` : '') + (rSum ? `+F${rSum}+F${rAiuSum}` : '');
    const costoTotalProyecto = costoObra + interObra + sumDirecto + aiuSum + intSum;
    const rTotProy = addResumenRow('COSTO TOTAL DEL PROYECTO', null, totProyFormula, costoTotalProyecto, true, true);

    const ltNum = parseFloat(lt);
    if (!isNaN(ltNum) && ltNum > 0) {
      addResumenRow('Valor por Metro Lineal [$/ml]', null, `F${rTotProy}/${ltNum.toFixed(2)}`, Math.round(costoTotalProyecto / ltNum), false, true);
    }

    // Generar buffer XLSX y descargar de forma segura
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const filename = (P.proyecto || 'Proyecto').replace(/\s+/g, '_') + '_Presupuesto_EMPAS_2026.xlsx';
    await saveFileWithDialog(blob, filename);
    return true;
  } catch (error) {
    console.error("Error al exportar Presupuesto EMPAS:", error);
    alert("Hubo un error al generar el archivo Excel: " + error.message);
    return false;
  }
}
