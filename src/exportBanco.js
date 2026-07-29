import ExcelJS from 'exceljs';
import { saveFileWithDialog } from './utils/fileSaver';
import PTOBANCO_DATA from './ptoBancoData';

export async function exportBancoExcel(P, usedItems, capTot, cd, adm, imp, ut, pma, pmt, sumDirecto, lt = 1, allItems = null) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('PRESUPUESTO');

  ws.pageSetup.orientation = 'landscape';
  ws.pageSetup.fitToPage = true;
  ws.pageSetup.fitToWidth = 1;

  const fontTitle = { name: 'Arial', size: 10, bold: true };
  const fontHeader = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  const fontChapter = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  const fontData = { name: 'Arial', size: 10 };
  const fontDataBold = { name: 'Arial', size: 10, bold: true };

  const fillHeader = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003B73' } };
  const fillChapter = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3A5C' } };
  const fillResumen = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF5FB' } };

  const borderThin = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  ws.columns = [
    { key: 'colA', width: 15 },
    { key: 'colB', width: 75 },
    { key: 'colC', width: 10 },
    { key: 'colD', width: 15 },
    { key: 'colE', width: 18 },
    { key: 'colF', width: 20 }
  ];

  // Generar las 24 filas iniciales
  for (let i = 1; i <= 24; i++) {
    ws.addRow([]);
  }

  // Fila 1
  ws.mergeCells('A1:F1');
  let r1 = ws.getCell('A1');
  r1.value = 'EMPRESA PUBLICA DE ALCANTARILLADO DE SANTANDER S.A. E.S.P.';
  r1.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  r1.alignment = { horizontal: 'center', vertical: 'middle' };
  r1.fill = fillHeader;

  // Fila 10
  ws.mergeCells('A10:F10');
  let r10 = ws.getCell('A10');
  r10.value = 'SUBGERENCIA DE ALCANTARILLADO';
  r10.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  r10.alignment = { horizontal: 'center', vertical: 'middle' };
  r10.fill = fillHeader;

  // Fila 16
  ws.getCell('A16').value = 'NOMBRE DEL PROYECTO:';
  ws.getCell('A16').font = fontTitle;
  ws.getCell('C16').value = (P.municipio || 'PIEDECUESTA').toUpperCase();
  ws.getCell('C16').font = fontData;
  ws.getCell('D16').value = 'FECHA:';
  ws.getCell('D16').font = fontTitle;
  let today = new Date();
  ws.getCell('F16').value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  ws.getCell('F16').font = fontData;

  // Fila 20
  ws.mergeCells('A20:F20');
  let r20 = ws.getCell('A20');
  r20.value = (P.proyecto || 'CONSTRUCCION SISTEMA DE ALCANTARILLADO').toUpperCase();
  r20.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF003B73' } };
  r20.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  r20.fill = fillResumen;

  // Fila 23
  ws.mergeCells('A23:F23');
  let r23 = ws.getCell('A23');
  r23.value = 'FORMULARIO APROXIMADO DE OBRA';
  r23.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF003B73' } };
  r23.alignment = { horizontal: 'center', vertical: 'middle' };

  // Fila 25 - Encabezados
  const headerRow = ws.addRow(['CODIGO', 'DESCRIPCION', 'UNIDAD', 'CANTIDAD', 'PRECIO PESO', 'TOTAL PESO']);
  headerRow.eachCell(c => {
    c.font = fontHeader;
    c.fill = fillHeader;
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = borderThin;
  });

  // Preparar jerarquía de items
  let mapItems = {};
  usedItems.forEach(i => mapItems[i.c] = i);

  let neededCodes = new Set();
  usedItems.forEach(it => {
    let parts = it.c.split('.');
    let cur = "";
    for (let i = 0; i < parts.length; i++) {
      cur = cur === "" ? parts[i] : (cur + "." + parts[i]);
      neededCodes.add(cur);
    }
  });

  let dataToUse = allItems || PTOBANCO_DATA;
  let rowsToPrint = dataToUse.filter(it => neededCodes.has(it.c));

  let totalsMap = {};
  usedItems.forEach(it => totalsMap[it.c] = (it.q || 0) * (it.p || 0));

  rowsToPrint.slice().reverse().forEach(it => {
    let parts = it.c.split('.');
    if (parts.length > 1) {
      parts.pop();
      let parent = parts.join('.');
      if (!totalsMap[parent]) totalsMap[parent] = 0;
      totalsMap[parent] += (totalsMap[it.c] || 0);
    }
  });

  let rowMap = {};
  rowsToPrint.forEach(it => {
    let isLeaf = mapItems[it.c] != null;
    let qty = isLeaf ? mapItems[it.c].q : null;
    let pu = isLeaf ? mapItems[it.c].p : null;
    let pt = totalsMap[it.c] || 0;

    let d = it.d || (isLeaf ? mapItems[it.c].d : '');
    if (it.c === "2.01.01" && P.nombreExcMaquina) d = P.nombreExcMaquina.replace('%', '').trim();
    if (it.c === "2.01.02" && P.nombreExcManual) d = P.nombreExcManual.replace('%', '').trim();
    if (it.c.startsWith("2.01.01.") && P.nombreExcMaquina) d = d.replace(/Excavaci[n]/i, P.nombreExcMaquina.replace('%', '').trim());
    if (it.c.startsWith("2.01.02.") && P.nombreExcManual) d = d.replace(/Excavaci[n]/i, P.nombreExcManual.replace('%', '').trim());
    if (d.toLowerCase().includes("sin acarreo libre") && P.nombreExcMaquina) d = d.replace(/sin acarreo libre/ig, P.nombreExcMaquina.replace('%', '').trim());
    if (d.toLowerCase().includes("con acarreo libre") && P.nombreExcManual) d = d.replace(/con acarreo libre/ig, P.nombreExcManual.replace('%', '').trim());

    let fval = isLeaf && qty !== null && pu !== null ? { formula: `D${ws.rowCount+1}*E${ws.rowCount+1}`, result: pt } : pt;

    let row = ws.addRow([
      it.c,
      d,
      it.u || (isLeaf ? mapItems[it.c].u : 'GLB'),
      qty,
      pu,
      fval
    ]);
    rowMap[it.c] = row.number;

    row.eachCell((c, colNumber) => {
      c.font = isLeaf ? fontData : fontChapter;
      if (!isLeaf) {
        c.fill = fillChapter;
      }
      c.border = borderThin;
      if (colNumber === 4 && c.value !== null && c.value !== undefined) c.numFmt = '#,##0.00';
      if (colNumber >= 5 && c.value !== null && c.value !== undefined) c.numFmt = '"$"#,##0.00';
      if (colNumber === 2) c.alignment = { wrapText: true, vertical: 'top' };
    });
  });

  rowsToPrint.forEach(it => {
    if (!mapItems[it.c]) {
      let children = rowsToPrint.filter(child => {
        let p = child.c.split('.'); p.pop();
        return p.join('.') === it.c;
      });
      if (children.length > 0) {
        let formula = children.map(c => `F${rowMap[c.c]}`).join('+');
        ws.getCell(`F${rowMap[it.c]}`).value = { formula: formula, result: totalsMap[it.c] };
      }
    }
  });

  ws.addRow([]);
  ws.addRow([]);

  const addResumenRow = (label, valColC, valColF, isBold = false) => {
    let row = ws.addRow([null, label, valColC, null, null, valColF]);
    
    row.eachCell((c, colNum) => {
      if (colNum > 1 && colNum <= 6) {
        c.fill = fillResumen;
      }
    });

    row.getCell(2).font = isBold ? fontDataBold : fontData;
    
    if (valColC !== null) {
        row.getCell(3).numFmt = '0.00%';
        row.getCell(3).font = fontData;
    }
    if (valColF !== null) {
        row.getCell(6).numFmt = '"$"#,##0.00';
        row.getCell(6).font = isBold ? fontDataBold : fontData;
    }
    return row;
  };

  let pAdmin = P.porcAdmin !== undefined ? parseFloat(P.porcAdmin) : 0.29;
  let pImp = P.porcImprevistos !== undefined ? parseFloat(P.porcImprevistos) : 0.01;
  let pUt = P.porcUtilidad !== undefined ? parseFloat(P.porcUtilidad) : 0.05;
  let pIva = P.porcIVA !== undefined ? parseFloat(P.porcIVA) : 0.19;

  let iva = ut * pIva;
  let obraCivil = cd + adm + imp + ut + iva;
  let costoObra = obraCivil + pma + pmt;
  let interObra = (P.reqInterventoria === "S" || P.reqInterventoria === true) ? (costoObra + sumDirecto + sumDirecto * 0.291) * (P.porcInterventoria !== undefined ? parseFloat(P.porcInterventoria) : 0.08) : 0;
  let aiuSum = sumDirecto * 0.291;
  let intSum = 0;
  let costoSuministros = sumDirecto + aiuSum + intSum;
  let costoTotalProyecto = costoObra + interObra + costoSuministros;

  let ocRoots = rowsToPrint.filter(it => !it.c.includes('.') && it.c !== 'S');
  let ocForm = ocRoots.length > 0 ? ocRoots.map(c => `F${rowMap[c.c]}`).join('+') : `${cd}`;

  let rCD = addResumenRow('COSTO DIRECTO OBRA CIVIL', null, { formula: ocForm, result: cd }, true);
  let rAdm = addResumenRow('Admin', pAdmin, { formula: `F${rCD.number}*C${rCD.number+1}`, result: adm });
  let rImp = addResumenRow('Imprevistos', pImp, { formula: `F${rCD.number}*C${rCD.number+2}`, result: imp });
  let rUt = addResumenRow('Utilidad', pUt, { formula: `F${rCD.number}*C${rCD.number+3}`, result: ut });
  let rIva = addResumenRow('IVA sobre Utilidad', pIva, { formula: `F${rUt.number}*C${rUt.number+1}`, result: iva });

  let ocTotF = `F${rCD.number}+F${rAdm.number}+F${rImp.number}+F${rUt.number}+F${rIva.number}`;
  let rTotOC = addResumenRow('COSTO TOTAL OBRA CIVIL', null, { formula: ocTotF, result: obraCivil }, true);
  
  let pPma = P.porcPMA !== undefined ? parseFloat(P.porcPMA) : 0.025525;
  let pPmt = P.porcPMT !== undefined ? parseFloat(P.porcPMT) : 0.051068;
  
  let rPma = pma > 0 ? addResumenRow('Plan Manejo Ambiental (PMA)', pPma, { formula: `F${rCD.number}*C${ws.rowCount+1}`, result: pma }) : null;
  let rPmt = pmt > 0 ? addResumenRow('Plan Manejo Transito (PMT)', pPmt, { formula: `F${rCD.number}*C${ws.rowCount+1}`, result: pmt }) : null;
  
  let ctoObF = `F${rTotOC.number}` + (rPma ? `+F${rPma.number}` : "") + (rPmt ? `+F${rPmt.number}` : "");
  let rCtoOb = addResumenRow('COSTO TOTAL OBRA', null, { formula: ctoObF, result: costoObra }, true);
  
  let sumRoots = rowsToPrint.filter(it => !it.c.includes('.') && it.c === 'S');
  let sumForm = sumRoots.length > 0 ? sumRoots.map(c => `F${rowMap[c.c]}`).join('+') : `${sumDirecto}`;
  
  let rSumSub, rSumAiu, rSumInt;
  if (sumDirecto > 0) {
    rSumSub = addResumenRow('Subtotal Suministros', null, { formula: sumForm, result: sumDirecto });
    rSumAiu = addResumenRow('A.I.U Suministros (29.1%)', 0.291, { formula: `F${rSumSub.number}*0.291`, result: aiuSum });
    rSumInt = addResumenRow('Interventoria de Suministros (16.3%)', 0.163, { formula: `F${rSumSub.number}*0.163`, result: intSum });
  }

  let rInt;
  let pInt = (P.porcInterventoria !== undefined ? parseFloat(P.porcInterventoria) : 0.08);
  if (interObra > 0) {
      let sumSubInt = rSumSub ? `+F${rSumSub.number}` : "";
      let sumAiuInt = rSumSub ? `+F${rSumSub.number}*0.291` : "";
      let intFormula = `(F${rCtoOb.number}${sumSubInt}${sumAiuInt})*C${ws.rowCount+1}`;
      rInt = addResumenRow('Interventoria', pInt, { formula: intFormula, result: interObra });
  }

  let fTotP = `F${rCtoOb.number}` + (rInt ? `+F${rInt.number}` : "") + (rSumSub ? `+F${rSumSub.number}+F${rSumAiu.number}+F${rSumInt.number}` : "");
  let rTotProy = addResumenRow('COSTO TOTAL DEL PROYECTO', null, { formula: fTotP, result: costoTotalProyecto }, true);

  if (lt && lt > 0) {
      addResumenRow('Valor por Metro Lineal [$/ml]', null, { formula: `F${rTotProy.number}/${lt}`, result: costoTotalProyecto / lt }, true);
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveFileWithDialog(blob, (P.proyecto || "Proyecto").replace(/\s+/g, "_") + "_Presupuesto_Banco.xlsx");
}
