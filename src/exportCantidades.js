import ExcelJS from 'exceljs';
import { saveFileWithDialog } from './utils/fileSaver';
import { calcCantSumidero, agruparTuberias, calcExcPozos, calcPozosCompleto } from './calcHelpers';

const titleFont = { name: 'Arial', family: 2, size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
const subTitleFont = { name: 'Arial', family: 2, size: 11, bold: true, color: { argb: 'FF000000' } };
const headerFont = { name: 'Arial', family: 2, size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
const dataFont = { name: 'Arial', family: 2, size: 10 };
const bgDarkBlue = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003B73' } };
const bgLightCyan = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCF0FA' } };

function createCorporateHeader(ws, title, P) {
  ws.mergeCells('A1:J1'); ws.getCell('A1').value = 'AMCaudales - ' + title;
  ws.getCell('A1').font = titleFont; ws.getCell('A1').fill = bgDarkBlue;
  ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.mergeCells('A2:J2'); ws.getCell('A2').value = `PROYECTO: ${P.proyecto || ''} | ${P.municipio} - ${P.barrio}`;
  ws.getCell('A2').font = subTitleFont;
  ws.mergeCells('A3:J3'); ws.getCell('A3').value = `DISEÑADOR: ${P.disenador || ''} | FECHA: ${P.fecha || new Date().toLocaleDateString('es-CO')}`;
  ws.getCell('A3').font = subTitleFont;
  ws.addRow([]); ws.addRow([]);
}

function addBasicSheet(wb, sheetName, title, headers, dataRows, P, options = {}) {
  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
  createCorporateHeader(ws, title, P);
  let headerRow = ws.addRow(headers);
  headerRow.eachCell({ includeEmpty: true }, (c) => {
    c.font = headerFont; c.fill = bgDarkBlue;
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
  });

  let totals = new Array(headers.length).fill(0);

  dataRows.forEach((rData, idx) => {
    let row = ws.addRow(rData);
    
    let isHighlighted = false;
    if (options.highlightFn) isHighlighted = options.highlightFn(rData);
    
    let shouldSum = true;
    if (options.sumOnlyHighlighted && options.highlightFn) {
       shouldSum = isHighlighted;
    }

    const defaultBg = (idx % 2 === 0) ? bgLightCyan : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    const highlightBg = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1F2EB' } }; // Light green for reponer='S'

    const bgColor = isHighlighted ? highlightBg : defaultBg;

    row.eachCell({ includeEmpty: true }, (c, colNumber) => {
      let colIdx = colNumber - 1;
      c.font = dataFont; c.fill = bgColor;
      c.border = { top: {style:'thin', color:{argb:'FFEEEEEE'}}, bottom: {style:'thin', color:{argb:'FFEEEEEE'}} };
      if (typeof c.value === 'number' && !Number.isInteger(c.value)) c.numFmt = '0.00';
      else if (c.value && typeof c.value === 'object' && c.value.formula) c.numFmt = '0.00';
      c.alignment = { horizontal: 'center', vertical: 'middle' };
      
      if (shouldSum && typeof c.value === 'number' && colIdx > 0 && (!options.sumCols || options.sumCols.includes(colIdx))) {
        totals[colIdx] += c.value;
      }
    });
  });

  if (options.showTotals) {
    const dataStartRow = 7;
    const dataEndRow = 6 + dataRows.length;
    let totRowData = headers.map((h, i) => {
      if (i === 1) return "TOTALES";
      if (options.sumCols && options.sumCols.includes(i)) {
         let colLetter = String.fromCharCode(65 + i);
         if (i >= 26) {
           colLetter = String.fromCharCode(64 + Math.floor(i / 26)) + String.fromCharCode(65 + (i % 26));
         }
         
         if (options.sumOnlyHighlighted && options.highlightCol !== undefined) {
           let condCol = String.fromCharCode(65 + options.highlightCol);
           if (options.highlightCol >= 26) {
             condCol = String.fromCharCode(64 + Math.floor(options.highlightCol / 26)) + String.fromCharCode(65 + (options.highlightCol % 26));
           }
           return { formula: `SUMIF(${condCol}${dataStartRow}:${condCol}${dataEndRow}, "S", ${colLetter}${dataStartRow}:${colLetter}${dataEndRow})` };
         } else {
           return { formula: `SUM(${colLetter}${dataStartRow}:${colLetter}${dataEndRow})` };
         }
      }
      return "";
    });

    totRowData[0] = "";
    let totRow = ws.addRow(totRowData);
    totRow.eachCell({ includeEmpty: true }, (c) => {
      c.font = { name: 'Arial', family: 2, size: 10, bold: true }; 
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEEAA' } };
      c.border = { top: {style:'thin'}, bottom: {style:'thin'} };
      if (typeof c.value === 'number' && !Number.isInteger(c.value)) c.numFmt = '#,##0.00';
      else if (c.value && typeof c.value === 'object' && c.value.formula) c.numFmt = '#,##0.00';
      c.alignment = { horizontal: 'center', vertical: 'middle' };
    });
  }

  ws.columns.forEach((col, idx) => { 
    if (idx === 1) col.width = 40;
    else if (idx === 0) col.width = 10;
    else col.width = 12; 
  });
  return ws;
}

export async function exportCantidades(P, R, T, sumLat, sumTrans, pbItems, estSepData, urbanismoData) {
  const wb = new ExcelJS.Workbook();
  
  // 1. Excavaciones (Tramos)
  const excaH = ["#","DE","A","L(m)","Diam(mm)","B(m)","Le","HP(m)","Vol.Excav","Vol 0-2.5m","Vol 2.5-5m",">5m","Arena(m3)","Relleno(m3)","Reponer"];
  let excaD = [];
  let rNum = 7;
  R.forEach((r, i) => {
    if(r.sep) return;
    let n = rNum;
    
    let fVol = `F${n}*H${n}*G${n}`;
    let f025 = `IF(H${n}>2.5, 2.5, H${n})*F${n}*G${n}`;
    let f2550 = `IF(H${n}>5, 2.5, IF(H${n}>2.5, H${n}-2.5, 0))*F${n}*G${n}`;
    let f50p = `IF(H${n}>5, H${n}-5, 0)*F${n}*G${n}`;
    let fArena = `MAX(0, G${n}*(F${n}*(E${n}/1000+0.25)-PI()*POWER(E${n}/2000, 2)))`;
    let fRelleno = `MAX(0, G${n}*F${n}*(H${n}-(E${n}/1000+0.25)))`;

    excaD.push([
      excaD.length + 1, r.de, r.a, r.L, parseFloat(r.nom)||0, r.bz, r.Le, r.HP, 
      {formula: fVol, result: r.volE||0},
      {formula: f025, result: r.v025||0},
      {formula: f2550, result: r.v2550||0},
      {formula: f50p, result: r.v50p||0},
      {formula: fArena, result: r.rArena||0},
      {formula: fRelleno, result: r.rComun||0},
      (r.reponer === true || r.reponer === 'S') ? 'S' : 'N'
    ]);
    rNum++;
  });

  addBasicSheet(wb, "Tramos_Excavacion", "CANTIDADES - TRAMOS Y EXCAVACIONES", excaH, excaD, P, {
     showTotals: true,
     highlightFn: (r) => r[14] === "S",
     sumOnlyHighlighted: true,
     highlightCol: 14,
     sumCols: [3, 8, 9, 10, 11, 12, 13]
  });

  // 2. Pozos
  const pozosH = ["#","Pozo","Prof(m)","M/C","hConc(m)","hMamp(m)","Conc(m3)","Mamp(m2)","Exc(m3)","PDR-60","A-37(m2)","Peld","C.Pobre(m3)","Reducc(m3)"];
  var pozDataCompleto = calcPozosCompleto(R, T, P);
  var pzData = [];
  if(pozDataCompleto && pozDataCompleto.pz) {
    let pzRow = 7;
    pozDataCompleto.pz.forEach(function(p, i) {
      if (p.pozoNuevo === "S") {
        let fHConc = `MAX(0, C${pzRow}-0.56)`;
        let fConc = `PI()*(POWER(${p.DI/2+0.2},2)-POWER(${p.DI/2},2))*E${pzRow} + PI()*POWER(1.3/2,2)*0.2 + PI()*POWER(1.4/2,2)*0.3`;
        let fExc = `PI()*POWER((${p.DE}+0.4)/2, 2)*(C${pzRow}+0.2)`;
        let fPdr = `G${pzRow}*15 + 26.5`;
        let fA37 = `G${pzRow}*5`;
        let fPeld = `MAX(0, INT((C${pzRow}-0.5)/0.35))`;
        
        pzData.push([
          i+1, p.nodo, p.prof||0, p.tipoPozo,
          {formula: fHConc, result: p.hConc||0}, 0,
          {formula: fConc, result: p.volConc||0}, {formula: `1.008`, result: p.areaMamp||0},
          {formula: fExc, result: p.volExc||0}, {formula: fPdr, result: p.pdr60||0},
          {formula: fA37, result: p.a37||0}, {formula: fPeld, result: p.peldanos||0},
          {formula: `PI()*POWER(1.3/2,2)*0.05`, result: p.concPobre||0},
          p.reduccion||0
        ]);
      } else {
        pzData.push([
          i+1, p.nodo, p.prof||0, p.tipoPozo, 
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0
        ]);
      }
      pzRow++;
    });
  }
  addBasicSheet(wb, "Pozos", "CANTIDADES - POZOS", pozosH, pzData, P, {
     showTotals: true,
     showTotals: true,
     sumOnlyHighlighted: false,
     sumCols: [6, 7, 8, 9, 10, 11, 12, 13]
  });

  // 3. Tuberias
  const tubH = ["#","Diametro","Material","Red Principal (m)","Sumideros (m)","Acometidas (m)","TOTAL (m)"];
  var grpX = agruparTuberias(R, sumLat, sumTrans, P);
  let tubRow = 7;
  var tubData = grpX.map((g, i) => {
    let fTotal = `D${tubRow}+E${tubRow}+F${tubRow}`;
    let res = [i + 1, g.nom, "PVC", g.red, g.sum, g.acom, {formula: fTotal, result: g.red + g.sum + g.acom}];
    tubRow++;
    return res;
  });
  
  addBasicSheet(wb, "Tuberias", "CANTIDADES - TUBERÍAS", tubH, tubData, P, {
     showTotals: true,
     sumCols: [3, 4, 5, 6]
  });

  // 4. Sumideros (Dashboard)
  const wsSum = wb.addWorksheet("Sumideros", { views: [{ showGridLines: false }] });
  createCorporateHeader(wsSum, "ANÁLISIS DE CANTIDADES DE OBRA SUMIDEROS LATERALES", P);
  const allSums = [...(sumLat || []), ...(sumTrans || [])];
  
  wsSum.columns = [
    { width: 5 }, { width: 10 }, { width: 15 }, { width: 15 }, { width: 15 },
    { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 },
    { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 },
    { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 15 }
  ];

  const sBg1 = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
  const sBg2 = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B0F0' } };
  
  let rowS1 = wsSum.addRow(["", "DIMENSIONES", "", "", "", "CANTIDADES APROXIMADAS DE OBRA", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
  wsSum.mergeCells(`B${rowS1.number}:E${rowS1.number}`);
  wsSum.mergeCells(`F${rowS1.number}:S${rowS1.number}`);
  for(let i=2; i<=19; i++) {
    let c = rowS1.getCell(i);
    c.font = {bold:true, color:{argb:'FFFFFFFF'}, size:10};
    c.fill = sBg1; c.alignment = {horizontal:'center'};
  }

  const sCols = [
    "NÚMERO TIPO SUMIDERO", "TIPO DE SUMIDERO", "POZO DE ENTREGA", "Longitud (m)", "Diámetro (mm)",
    "Cimentación (m3)", "Excav. (m3)", "Relleno (m3)", "Concr. Pobre (m3)", "Concr. 4000 (m3)",
    "Excav. Conexión (m3)", "Acero A-37 (kg)", "Acero PDR-60 (kg)", "Cinta PVC (m)", "Rotura Pavimento (m2)",
    "Reparación Pavimento (m2)", "Compuerta (u)", "OBSERVACIONES"
  ];
  let rowS2 = wsSum.addRow(["", ...sCols]);
  for(let i=2; i<=19; i++) {
    let c = rowS2.getCell(i);
    c.font = {bold:true, color:{argb:'FFFFFFFF'}, size:8};
    c.fill = sBg2; c.alignment = {horizontal:'center', wrapText:true};
  }

  // (Se ha movido el TOTAL al final del listado detallado)
  wsSum.addRow([]);
  wsSum.addRow(["", "Cantidades por tipo de sumidero"]).getCell(2).font = {bold:true};
  
  allSums.forEach((f, idx) => {
    var c = calcCantSumidero(f, P);
    let row = wsSum.addRow(["", f.cant, f.tipo, f.pozo, f.long, f.diam, c.cim, c.exc, c.rell, c.cp, c.c4, c.excC||0, c.a37, c.pdr, c.cinta, c.rot, c.rep, c.comp||1, "-"]);
    row.eachCell((cell, i) => {
      if (i > 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: (idx % 2 === 0 ? 'FF2F75B5' : 'FFBDD7EE') } };
        if (i <= 4) cell.font = {bold:true, color:{argb:(idx%2===0?'FFFFFFFF':'FF000000')}};
        else cell.font = {color:{argb:(idx%2===0?'FFFFFFFF':'FF000000')}};
        if (typeof cell.value === 'number' && !Number.isInteger(cell.value)) cell.numFmt = '0.00';
      }
    });
    // Highlight specific columns (Longitud and Diametro)
    row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF99' } }; row.getCell(5).font = {color:{argb:'FFFF0000'}};
    row.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } }; row.getCell(6).font = {color:{argb:'FFFF0000'}};
  });
  
  wsSum.addRow([]);
  wsSum.addRow(["", "Listado detallado"]).getCell(2).font = {bold:true};
  let startRow = wsSum.rowCount + 1;
  allSums.forEach((f, idx) => {
    for(let k=0; k<f.cant; k++) {
      let cU = calcCantSumidero({cant: 1, tipo: f.tipo}, P);
      let row = wsSum.addRow([k+1, 1, f.tipo, f.pozo, f.long, f.diam, cU.cim, cU.exc, cU.rell, cU.cp, cU.c4, cU.excC||0, cU.a37, cU.pdr, cU.cinta, cU.rot, cU.rep, cU.comp||1, "-"]);
      row.eachCell((cell, i) => {
        if (typeof cell.value === 'number' && !Number.isInteger(cell.value)) cell.numFmt = '0.00';
        if (k % 2 !== 0 && i > 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF1DE' } };
      });
    }
  });
  let endRow = wsSum.rowCount;

  let rTot = wsSum.addRow(["", "TOTAL SUMIDEROS", "", ""]);
  wsSum.mergeCells(`B${rTot.number}:D${rTot.number}`);
  for(let col = 5; col <= 18; col++) {
      if (col !== 6) { // Ignorar columna de diámetro
          let colLetter = String.fromCharCode(64 + col);
          rTot.getCell(col).value = { formula: `SUM(${colLetter}${startRow}:${colLetter}${endRow})` };
      }
  }
  rTot.getCell(19).value = "-";
  
  for(let i=2; i<=19; i++) {
    let c = rTot.getCell(i);
    c.font = {bold:true}; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
    if (i >= 5 && i <= 18 && i !== 6) c.numFmt = '0.00';
  }


  // 5. Acometidas (Dashboard)
  const largoAco = P.largoAco || 6;
  const n06 = P.nAcom06 || 0;
  const n610 = P.nAcom610 || 0;
  const n10 = P.nAcom10 || 0;
  const totalAco = n06 + n610 + n10;
  
  const wsAco = wb.addWorksheet("Acometidas", { views: [{ showGridLines: false }] });
  createCorporateHeader(wsAco, "CANTIDADES DE ACOMETIDAS DOMICILIARIAS", P);
  
  wsAco.columns = [
    { width: 25 }, { width: 10 }, { width: 10 }, { width: 15 }, { width: 10 }, { width: 10 },
    { width: 5 }, // separator
    { width: 15 }, { width: 50 }, { width: 15 }, { width: 10 }
  ];

  const headerFont = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  const hBg = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
  const valFont = { name: 'Arial', size: 10 };

  // NUMERO DE ACOMETIDAS (Left)
  let rowAcoH = wsAco.addRow(["NÚMERO DE ACOMETIDAS", "", "", "", "", ""]);
  rowAcoH.eachCell((c, idx) => { if(idx<=6) { c.font = headerFont; c.fill = hBg; c.alignment = {horizontal:'center'}; }});
  wsAco.mergeCells(`A${rowAcoH.number}:F${rowAcoH.number}`);

  wsAco.addRow(["Tipo", "Cantidad", "Und.", "Longitud Promedio", "Und.", "pond"]).eachCell(c => { c.font = {bold:true}; c.alignment = {horizontal:'center'}; });
  wsAco.addRow(["de longitud entre 0-6 m", n06, "[und]", largoAco, "[m]", n06 * largoAco]).eachCell(c => { c.font = valFont; c.alignment = {horizontal:'center'}; });
  wsAco.addRow(["de longitud entre 6-10 m", n610, "[und]", largoAco + 2, "[m]", n610 * (largoAco + 2)]).eachCell(c => { c.font = valFont; c.alignment = {horizontal:'center'}; });
  wsAco.addRow(["de longitud mayor a 10 m", n10, "[und]", largoAco + 6, "[m]", n10 * (largoAco + 6)]).eachCell(c => { c.font = valFont; c.alignment = {horizontal:'center'}; });
  wsAco.addRow(["Total", totalAco, "[und]", "-", "-", totalAco * largoAco]).eachCell(c => { c.font = {bold:true}; c.alignment = {horizontal:'center'}; });
  
  wsAco.addRow([]);
  
  // PARÁMETROS (Left)
  let rowParH = wsAco.addRow(["PARÁMETROS DE CÁLCULO", "", "", "", "", ""]);
  rowParH.eachCell((c, idx) => { if(idx<=6) { c.font = headerFont; c.fill = hBg; c.alignment = {horizontal:'center'}; }});
  wsAco.mergeCells(`A${rowParH.number}:F${rowParH.number}`);

  const parData = [
    [`Diámetro Acometida (${P.diamAcom||160}mm)`, (P.diamAcom||160)/1000, "[m]"],
    ["Profundidad (promedio)", P.hExcavAcom || 1.79, "[m]"],
    ["Longitud de andén (promedio)", P.anchoAndenAcom || 1.0, "[m]"],
    ["Longitud de pavimento (promedio)", 5.0, "[m]"],
    ["Ancho de zanja", P.anchoZanjaAcom || 0.56, "[m]"]
  ];
  parData.forEach(pd => {
    let r = wsAco.addRow([pd[0], pd[1], pd[2]]);
    r.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF99' } };
    r.getCell(2).font = { bold: true, color: { argb: 'FFFF0000' } };
  });

  // CANTIDADES DE OBRA (Right)
  // We place this at row 5 (right side)
  const rightStartRow = 5;
  wsAco.getCell(`H${rightStartRow}`).value = "CANTIDADES DE OBRA PARA ACOMETIDAS ---> método 1.";
  wsAco.mergeCells(`H${rightStartRow}:K${rightStartRow}`);
  for(let i=8; i<=11; i++) {
    let c = wsAco.getCell(rightStartRow, i);
    c.font = headerFont; c.fill = hBg; c.alignment = {horizontal:'center'};
  }
  
  wsAco.getCell(`H${rightStartRow+1}`).value = "Código";
  wsAco.getCell(`I${rightStartRow+1}`).value = "Descripción";
  wsAco.getCell(`J${rightStartRow+1}`).value = "Cantidad";
  wsAco.getCell(`K${rightStartRow+1}`).value = "Unidad";
  for(let i=8; i<=11; i++) wsAco.getCell(rightStartRow+1, i).font = {bold:true};

  const getQ = (code) => {
    let item = (pbItems||[]).find(it => it.c === code);
    return item && typeof item.q === 'number' ? item.q : 0;
  };

  const acoItems = [
    { c: "4.06.01.01", d: "Rotura de pavimento para acometida", u: "M2" },
    { c: "4.06.01.02", d: "Rotura de andenes para acometida", u: "M2" },
    { c: "4.06.01.03", d: "Excavaciones para acometida", u: "M3" },
    { c: "4.06.01.04", d: "Cimentación para acometida", u: "M3" },
    { c: "4.06.01.05", d: `Tuberia para acometida D=${P.diamAcom||160}mm PVC`, u: "ML" },
    { c: "4.06.01.06", d: "Caja de inspección para acometida", u: "UND" },
    { c: "4.06.01.07", d: "Kit Silla Yee para acometida", u: "UND" },
    { c: "4.06.01.08", d: "Accesorios para acometida", u: "UND" },
    { c: "4.06.01.09", d: "Relleno para acometida", u: "M3" },
    { c: "4.06.01.10", d: "Reparación de pavimento para acometida", u: "M2" },
    { c: "4.06.01.11", d: "Andén para acometida", u: "M2" }
  ];

  acoItems.forEach((it, idx) => {
    let currR = rightStartRow + 2 + idx;
    // ensure row exists
    let row = wsAco.getRow(currR);
    row.getCell(8).value = it.c;
    row.getCell(9).value = it.d;
    row.getCell(10).value = getQ(it.c);
    row.getCell(11).value = it.u;
  });


  // 6. Cantidades de Obra
  const preH = ["Item","Descripción","Unid","Cant"];
  var preData = [];
  if(pbItems && pbItems.length > 0) {
    pbItems.forEach(it => {
      var isItem = it.lv >= 3;
      preData.push([it.c || "", it.d || "", it.u || "", isItem ? it.q : ""]);
    });
  }
  addBasicSheet(wb, "Cant. Obra", "CANTIDADES DE OBRA", preH, preData, P);

  // 7. Estructura de Separación (solo si incluirEnCantidades == true)
  if (estSepData && estSepData.incluirEnCantidades) {
    const e_est = 0.20;
    // Recompute from estSepData: we store computed cantidades if available
    const cantExcav = estSepData.cantExcav || 0;
    const cantConc  = estSepData.cantConc  || 0;
    const cantAcero = estSepData.cantAcero || 0;
    const cantLongVertedero = estSepData.cantLongVertedero || 0;

    const estSepH = ["#", "Descripción", "Unidad", "Cantidad"];
    const estSepRows = [
      [1, "Excavación mecanizada para estructura de separación", "m³", cantExcav > 0 ? cantExcav : "-"],
      [2, `Concreto 4000 psi — Canal separador (e=${e_est}m)`, "m³", cantConc > 0 ? cantConc : "-"],
      [3, "Acero de refuerzo PDR-60 (≈100 kg/m³)", "kg", cantAcero > 0 ? cantAcero : "-"],
      [4, "Vertedero lateral — Longitud de control", "m", cantLongVertedero > 0 ? cantLongVertedero : "-"],
      ["", "", "", ""],
      ["", "TOTALES", "", ""],
      ["", "Concreto 4000 psi (est.sep) ⇒ sumar a pozos y cimentaciones", "m³", cantConc],
      ["", "Acero de refuerzo (est.sep) ⇒ sumar a acero estructural", "kg", cantAcero],
      ["", "Excavación (est.sep) ⇒ sumar a excavaciones", "m³", cantExcav],
    ];
    addBasicSheet(wb, "Est.Separacion", "CANTIDADES — ESTRUCTURA DE SEPARACIÓN", estSepH, estSepRows, P);
  }

  // 8. Urbanismo
  if (urbanismoData && urbanismoData.length > 0) {
    const urbH = ["#","Tramo (DE-A)","Req.Urb","Pav.Tipo","Pav.Área(m2)","Pav.Demol(m3)","Ras.Vol(m3)","SubBase.Área(m2)","Base.Área(m2)","Anden.Área(m2)","Sard.Long(m)"];
    const urbD = urbanismoData.map((u, i) => {
       const hasU = u.reqUrbanismo === true || u.reqUrbanismo === 'S';
       const pL = parseFloat(u.pavL) || 0;
       const pA = parseFloat(u.pavA) || 0;
       return [
         i+1, 
         u.tramo || `${u.de || ''} - ${u.a || ''}`, 
         hasU ? 'S' : 'N', 
         u.pavTipo || '',
         hasU ? (pL * pA || 0) : "",
         (hasU && u.pavDemolicion) ? (pL * pA * (parseFloat(u.pavEspesorDem) || 0) || 0) : "",
         (hasU && u.reqRasante) ? ((parseFloat(u.rasL) || 0) * (parseFloat(u.rasA) || 0) * (parseFloat(u.rasProf) || 0) || 0) : "",
         (hasU && u.reqSubBase) ? ((parseFloat(u.sbL) || 0) * (parseFloat(u.sbA) || 0) || 0) : "",
         (hasU && u.reqBase) ? ((parseFloat(u.baseL) || 0) * (parseFloat(u.baseA) || 0) || 0) : "",
         (hasU && u.reqAnden) ? ((parseFloat(u.andL) || 0) * (parseFloat(u.andA) || 0) * (parseFloat(u.andLados) || 1) || 0) : "",
         (hasU && u.reqSardinel) ? ((parseFloat(u.sarL) || 0) * (parseFloat(u.sarLados) || 1) || 0) : ""
       ];
    });
    addBasicSheet(wb, "Urbanismo", "CANTIDADES - URBANISMO", urbH, urbD, P, {
       showTotals: true,
       sumOnlyHighlighted: true,
       highlightFn: (rData) => rData[2] === 'S',
       highlightCol: 2,
       sumCols: [4, 5, 6, 7, 8, 9, 10]
    });
    const wsUrb = wb.getWorksheet("Urbanismo");
    if(wsUrb) {
      wsUrb.addRow([]); wsUrb.addRow([]);
      let rUH = wsUrb.addRow(["", "CÓDIGO", "DESCRIPCIÓN", "UNIDAD", "CANTIDAD TOTAL"]);
      rUH.eachCell(c => { c.font = headerFont; c.fill = bgDarkBlue; });
      let sumPavM2 = 0, sumDemM3 = 0, sumRasM3 = 0, sumSbM2 = 0, sumBaseM2 = 0, sumAndM2 = 0, sumSarMl = 0;
      urbD.forEach(r => {
        if(r[2] === 'S') {
          sumPavM2 += r[4] || 0;
          sumDemM3 += r[5] || 0;
          sumRasM3 += r[6] || 0;
          sumSbM2 += r[7] || 0;
          sumBaseM2 += r[8] || 0;
          sumAndM2 += r[9] || 0;
          sumSarMl += r[10] || 0;
        }
      });
      let urbItems = [
         ["4.08.02", "Reparación de pavimento (Flexible/Rígido)", "M2", sumPavM2],
         ["1.03", "Rotura/Demolición de pavimento", "M3", sumDemM3],
         ["2.01", "Excavación para rasante", "M3", sumRasM3],
         ["4.08.02.02", "Sub-base granular", "M2", sumSbM2],
         ["4.08.02.03", "Base granular", "M2", sumBaseM2],
         ["4.09.01.01", "Andenes y/o pisos en concreto", "M2", sumAndM2],
         ["4.09.01.02", "Sardineles", "ML", sumSarMl]
      ];
      urbItems.forEach(it => {
         let rw = wsUrb.addRow(["", it[0], it[1], it[2], it[3]]);
         rw.getCell(5).font = {bold:true};
         if (it[3] !== 0) rw.getCell(5).numFmt = '0.00';
      });
    }
  }

  // 9. Análisis de Excavaciones, Sobrantes y Acarreos
  const exp = P.porcExpansion !== undefined ? parseFloat(P.porcExpansion) : 0.05;
  const pT = P.porcExcTierra !== undefined ? parseFloat(P.porcExcTierra) : 0.55;
  const pG = P.porcExcGranular !== undefined ? parseFloat(P.porcExcGranular) : 0.30;
  const pR = P.porcExcRoca !== undefined ? parseFloat(P.porcExcRoca) : 0.15;
  const pAprovT = P.porcAprovTierra !== undefined ? parseFloat(P.porcAprovTierra) : 0.5;
  const pAprovG = P.porcAprovGranular !== undefined ? parseFloat(P.porcAprovGranular) : 0.5;
  const pAprovR = P.porcAprovRoca !== undefined ? parseFloat(P.porcAprovRoca) : 0.0;

  let tE=0, t025=0, t2550=0, t50p=0, tRot=0, tRep=0, tLe=0, lt=0, rArenaTot=0, rComunTot=0;
  R.filter(r => !r.sep && (r.reponer === 'S' || r.reponer === true)).forEach(r => {
    tE += r.volE || 0;
    t025 += r.v025 || 0;
    t2550 += r.v2550 || 0;
    t50p += r.v50p || 0;
    tRot += r.rotP || 0;
    tRep += r.repP || 0;
    tLe += r.Le || 0;
    lt += r.L || 0;
    rArenaTot += r.rArena || 0;
    rComunTot += r.rComun || 0;
  });

  const ep = calcPozosCompleto(R, T || []);
  let excSumL = 0, excSumT = 0, rSumL = 0, rSumT = 0;
  if(sumLat) sumLat.forEach(f => { let c = calcCantSumidero(f, P); excSumL += c.exc+(c.excC||0); rSumL += c.rell; });
  if(sumTrans) sumTrans.forEach(f => { let c = calcCantSumidero(f, P); excSumT += c.exc+(c.excC||0); rSumT += c.rell; });

  const totGral = tE + ep.tVE + excSumL + excSumT;
  
  const nvT = totGral * pT;
  const nvG = totGral * pG;
  const nvR = totGral * pR;
  const nvTot = nvT + nvG + nvR;
  
  const rellN = rComunTot + rSumL + rSumT;
  const reuT = nvT * pAprovT * (1 + exp);
  const reuG = nvG * pAprovG * (1 + exp);
  const reuR = nvR * pAprovR * (1 + exp);
  const reuTot = reuT + reuG + reuR;
  const sumMC = Math.max(0, rellN - reuTot);
  const matSob = (nvTot * (1 + exp) - reuTot) + Math.max(0, reuTot - rellN);
  
  const wsAc = wb.addWorksheet('Excavaciones', { views: [{ showGridLines: false }] });
  createCorporateHeader(wsAc, 'RESUMEN GENERAL DE EXCAVACIONES Y MATERIALES', P);

  const headerFontExc = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  const hBgExc = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1C2E4A' } };
  const sBgExc = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003B73' } };
  
  wsAc.columns = [{ width: 25 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 5 }, { width: 35 }, { width: 15 }];
  
  let hR = wsAc.addRow(['Componente', '0-2.5m', '2.5-5m', '>5m', 'TOTAL m3', '', 'Origen de los datos']);
  hR.eachCell(c => { c.font = headerFontExc; c.fill = hBgExc; c.alignment = {horizontal:'center'}; });
  
  let r1 = wsAc.addRow(['Tramos Tuberia', t025, t2550, t50p, tE, '', '(Viene de la hoja Tramos_Excavacion)']);
  let r2 = wsAc.addRow(['Pozos', ep.v025, ep.v2550, ep.v50p, ep.tVE, '', '(Viene de la hoja Pozos)']);
  let r3 = wsAc.addRow(['Sumideros Laterales', excSumL, '-', '-', excSumL, '', '(Viene de la hoja Sumideros)']);
  let r4 = wsAc.addRow(['Sumideros Transversales', excSumT, '-', '-', excSumT, '', '(Viene de la hoja Sumideros)']);
  let rTotAc = wsAc.addRow(['TOTAL GENERAL', t025+ep.v025+excSumL+excSumT, t2550+ep.v2550, t50p+ep.v50p, totGral, '', 'Suma de los componentes superiores']);
  rTotAc.eachCell((c, i) => { c.font = {bold:true, color:{argb:(i===5?'FFD4A843':'FFFFFFFF')}}; c.fill = sBgExc; });
  
  wsAc.addRow([]);

  const pM = P.porcAcarreoLibre !== undefined ? parseFloat(P.porcAcarreoLibre) : 0.5;
  const pA = 1 - pM;
  let rMach = wsAc.addRow(['Excavación a Máquina', '', '', '', totGral * pM, '', 'Porcentaje asignado:', (pM*100).toFixed(0) + '%']);
  let rHand = wsAc.addRow(['Excavación a Mano', '', '', '', totGral * pA, '', 'Porcentaje asignado:', (pA*100).toFixed(0) + '%']);
  rMach.getCell(5).font = {bold:true, color:{argb:'FF8FD67A'}}; rMach.getCell(8).font = {bold:true};
  rHand.getCell(5).font = {bold:true, color:{argb:'FFF0932B'}}; rHand.getCell(8).font = {bold:true};

  wsAc.addRow([]);

  
  let hM = wsAc.addRow(['Materiales (Tramos+Pozos)', '', '', '', '', '', 'Rellenos', '']);
  hM.getCell(1).font = headerFontExc; hM.getCell(1).fill = hBgExc; wsAc.mergeCells(`A${hM.number}:E${hM.number}`);
  hM.getCell(7).font = headerFontExc; hM.getCell(7).fill = hBgExc; wsAc.mergeCells(`G${hM.number}:H${hM.number}`);

  let mr1 = wsAc.addRow([`TIERRA ${(pT*100).toFixed(0)}%`, '', '', '', nvT, '', 'Arena Cimentacion', rArenaTot]);
  let mr2 = wsAc.addRow([`GRANULAR ${(pG*100).toFixed(0)}%`, '', '', '', nvG, '', 'Relleno Total (Tramos + Sumideros)', rellN]);
  let mr3 = wsAc.addRow([`ROCA ${(pR*100).toFixed(0)}%`, '', '', '', nvR, '', 'Relleno Necesario', rellN]);
  let mr4 = wsAc.addRow(['Total', '', '', '', nvTot, '', 'Reutilizable', reuTot]);
  let mr5 = wsAc.addRow(['', '', '', '', '', '', 'Suministro Mat.Comun', sumMC]);
  let mr6 = wsAc.addRow(['', '', '', '', '', '', 'Mat.Sobrante', matSob]);

  [mr1,mr2,mr3,mr4,mr5,mr6].forEach(r => {
    r.getCell(5).font = {bold:true}; r.getCell(5).numFmt = '#,##0.00';
    r.getCell(8).font = {bold:true}; r.getCell(8).numFmt = '#,##0.00';
    r.getCell(8).alignment = {horizontal:'right'};
    r.getCell(5).alignment = {horizontal:'right'};
  });
  mr4.getCell(1).font = {bold:true};
  mr3.getCell(7).font = {bold:true};
  mr4.getCell(7).font = {bold:true}; mr4.getCell(8).font = {bold:true, color:{argb:'FF28A745'}};
  mr5.getCell(8).font = {bold:true, color:{argb:'FFD4A843'}};
  mr6.getCell(7).font = {bold:true}; mr6.getCell(8).font = {bold:true, color:{argb:'FFDC3545'}};
  
  // --- Acarreos y Material Sobrante ---
  let uDem = 0;
  if (urbanismoData && urbanismoData.length > 0) {
     urbanismoData.forEach(r => {
        if (r.reqUrbanismo === true || r.reqUrbanismo === 'S') {
           if (r.pavDemolicion) uDem += (parseFloat(r.pavL)||0) * (parseFloat(r.pavA)||0) * (parseFloat(r.pavEspesorDem)||0);
           if (r.reqAnden) uDem += ((parseFloat(r.andL)||0)*(parseFloat(r.andA)||0)*(parseFloat(r.andLados)||1) * 0.10);
           if (r.reqSardinel) uDem += ((parseFloat(r.sarL)||0)*(parseFloat(r.sarLados)||1) * 0.08);
        }
     });
  }
  let isUrbAv = P.urbanismoAvanzado === true || P.urbanismoAvanzado === "S";
  let demolTotal = isUrbAv ? uDem : (tRot * 0.15);
  
  let nEst = parseFloat(P.distBotadero) || 8;
  let bot200 = matSob * (1+exp) * (P.porcAcarreo200 !== undefined ? parseFloat(P.porcAcarreo200) : 0.10) * nEst;
  let bot500 = matSob * (1+exp) * (P.porcAcarreo500 !== undefined ? parseFloat(P.porcAcarreo500) : 0) * nEst;
  let bot1000 = ((matSob * (1+exp) * (P.porcAcarreo1000 !== undefined ? parseFloat(P.porcAcarreo1000) : 0.90)) + (demolTotal * (1+exp))) * nEst;

  wsAc.addRow([]);
  let hSobrantes = wsAc.addRow(['RESUMEN DE MATERIAL SOBRANTE Y ACARREOS']);
  hSobrantes.getCell(1).font = headerFontExc; hSobrantes.getCell(1).fill = hBgExc; wsAc.mergeCells(`A${hSobrantes.number}:H${hSobrantes.number}`);

  let mrS1 = wsAc.addRow(['Sobrante Neto (Volumen Suelto)', '', '', '', '', '', 'Demoliciones', '']);
  mrS1.getCell(1).font = {bold:true, color:{argb:'FF34D399'}}; mrS1.getCell(1).fill = {type:'pattern', pattern:'solid', fgColor:{argb:'FF0F3B2E'}}; wsAc.mergeCells(`A${mrS1.number}:D${mrS1.number}`);
  mrS1.getCell(7).font = {bold:true, color:{argb:'FFFBBF24'}}; mrS1.getCell(7).fill = {type:'pattern', pattern:'solid', fgColor:{argb:'FF3F2E0E'}}; wsAc.mergeCells(`G${mrS1.number}:H${mrS1.number}`);

  let mrS2 = wsAc.addRow(['Reutilización Tierra:', '', '', reuT, '', '', 'Demoliciones de Pavimento (Tramos):', isUrbAv ? 'N/A' : (tRot * 0.15)]);
  let mrS3 = wsAc.addRow(['Reutilización Subbase:', '', '', reuG, '', '', 'Demoliciones Obras de Urbanismo:', uDem]);
  let mrS4 = wsAc.addRow(['Reutilización Roca:', '', '', reuR, '', '', 'SUBTOTAL DEMOLICIÓN:', demolTotal * (1+exp)]);
  mrS4.getCell(7).font = {bold:true, color:{argb:'FFF59E0B'}}; mrS4.getCell(8).font = {bold:true, color:{argb:'FFFBBF24'}};

  let mrS5 = wsAc.addRow(['MAT. SOBRANTE EXCAV.:', '', '', matSob * (1+exp), '', '', '', '']);
  mrS5.getCell(1).font = {bold:true, color:{argb:'FF10B981'}}; mrS5.getCell(4).font = {bold:true, color:{argb:'FF34D399'}};
  
  wsAc.addRow([]);
  let hAc = wsAc.addRow([`Acarreos y Distancias a Botadero (${nEst} Estaciones)`, '', '', '', '', '', '', '']);
  hAc.getCell(1).font = {bold:true, color:{argb:'FF94A3B8'}}; hAc.getCell(1).fill = {type:'pattern', pattern:'solid', fgColor:{argb:'FF0F172A'}}; wsAc.mergeCells(`A${hAc.number}:H${hAc.number}`);
  let mAc1 = wsAc.addRow(['Volumen a botadero < 200m:', '', '', bot200, '', '', '', '']);
  let mAc2 = wsAc.addRow(['Volumen a botadero < 500m:', '', '', bot500, '', '', '', '']);
  let mAc3 = wsAc.addRow(['Volumen a botadero > 1km:', '', '', bot1000, '', '', '', '']);
  let mAc4 = wsAc.addRow(['VOLUMEN TOTAL A BOTADERO (Suelto):', '', '', bot200 + bot500 + bot1000, '', '', '', '']);
  mAc4.getCell(1).font = {bold:true, color:{argb:'FFFCA5A5'}}; mAc4.getCell(4).font = {bold:true, color:{argb:'FFFFFFFF'}}; mAc4.getCell(1).fill = {type:'pattern', pattern:'solid', fgColor:{argb:'FF7F1D1D'}}; wsAc.mergeCells(`A${mAc4.number}:C${mAc4.number}`); mAc4.getCell(4).fill = {type:'pattern', pattern:'solid', fgColor:{argb:'FF7F1D1D'}};

  [mrS2, mrS3, mrS4, mrS5, mAc1, mAc2, mAc3, mAc4].forEach(r => {
      [4, 8].forEach(idx => {
          if (typeof r.getCell(idx).value === 'number') {
              r.getCell(idx).numFmt = '#,##0.00';
              r.getCell(idx).alignment = {horizontal:'right'};
          }
      });
  });

  wsAc.eachRow((r, i) => { if(i>3) { r.eachCell(c => { if(typeof c.value==='number') c.numFmt = '#,##0.00'; }); }});

  // --- 10. Dashboard Resumen de Cantidades ---
  if (pbItems && pbItems.length > 0) {
    const wsDash = wb.addWorksheet('Resumen_Cantidades', { views: [{ showGridLines: false }] });
    createCorporateHeader(wsDash, 'DASHBOARD RESUMEN DE PROYECTO', P);

    wsDash.columns = [{ width: 35 }, { width: 25 }, { width: 60 }];

    let numSumL = sumLat ? sumLat.reduce((a,b)=>a+(b.cant||0),0) : 0;
    let numSumT = sumTrans ? sumTrans.reduce((a,b)=>a+(b.cant||0),0) : 0;
    
    let rKpi1 = wsDash.addRow(["TRAMOS NUEVOS", "POZOS", "LONGITUD A REPONER (m)"]);
    let rKpiV1 = wsDash.addRow([R.filter(x=>x.reponer==="S"||x.reponer===true).length + " de " + R.length + " total", (pozDataCompleto && pozDataCompleto.pz) ? pozDataCompleto.pz.length : 0, lt.toFixed(1)]);
    
    let rKpi2 = wsDash.addRow(["ACOMETIDAS", "SUMIDEROS", "EXCAVACIÓN TOTAL (m3)"]);
    let rKpiV2 = wsDash.addRow([(P.nAcom06||0)+(P.nAcom610||0)+(P.nAcom10||0), numSumL + numSumT, totGral.toFixed(1)]);

    [rKpi1, rKpiV1, rKpi2, rKpiV2].forEach((r, i) => {
        r.eachCell({includeEmpty:true}, c => {
           c.alignment = {horizontal:'center', vertical:'middle'};
           if(i%2===0) { c.font = {bold:true, color:{argb:'FFFFFFFF'}, size:10}; c.fill = {type:'pattern', pattern:'solid', fgColor:{argb:'FF003B73'}}; }
           else { c.font = {bold:true, size: 16, color:{argb:'FF1C2E4A'}}; c.fill = {type:'pattern', pattern:'solid', fgColor:{argb:'FFF0F4F8'}}; c.border = {bottom:{style:'medium', color:{argb:'FF003B73'}}}; }
        });
        r.height = i%2===0 ? 25 : 40;
    });

    wsDash.addRow([]); wsDash.addRow([]);

    let hDash = wsDash.addRow(['Grupo (Capítulo)', 'Costo Total Estimado', 'Ítems Principales en el Grupo']);
    hDash.eachCell(c => { c.font = headerFontExc; c.fill = hBgExc; c.alignment = {horizontal:'center'}; });

    const groups = {
      'Campamentos y Preliminares': { total: 0, items: [] },
      'Excavaciones': { total: 0, items: [] },
      'Tuberías': { total: 0, items: [] },
      'Acometidas': { total: 0, items: [] },
      'Pozos': { total: 0, items: [] },
      'Sumideros': { total: 0, items: [] },
      'Pavimentos / Reposición': { total: 0, items: [] },
      'Varios y Otros': { total: 0, items: [] }
    };

    pbItems.forEach(it => {
      if (it.lv === 3 && it.q > 0) {
        const cost = (it.q || 0) * (it.p || 0);
        const d = (it.d || "").toLowerCase();
        const c = it.c || "";

        let group = 'Varios y Otros';
        if (c.startsWith('1.')) group = 'Campamentos y Preliminares';
        else if (c.startsWith('2.')) group = 'Excavaciones';
        else if (c.startsWith('3.')) group = 'Tuberías';
        else if (c.startsWith('4.')) {
          if (d.includes('pozo')) group = 'Pozos';
          else if (d.includes('acometida') || d.includes('silla yee') || d.includes('silla tee')) group = 'Acometidas';
          else if (d.includes('sumidero')) group = 'Sumideros';
          else if (d.includes('pavimento') || d.includes('asfalto') || d.includes('concreto') || d.includes('base') || d.includes('subbase')) group = 'Pavimentos / Reposición';
        }

        groups[group].total += cost;
        groups[group].items.push({ d: it.d, cost });
      }
    });

    let gTotal = 0;
    Object.keys(groups).forEach(g => {
      let gData = groups[g];
      if (gData.total > 0) {
         gTotal += gData.total;
         let sortedItems = gData.items.sort((a,b) => b.cost - a.cost);
         let topDescs = sortedItems.slice(0, 3).map(x => '- ' + x.d).join('\n');
         if (sortedItems.length > 3) topDescs += `\n... y ${sortedItems.length - 3} más`;
         
         let row = wsDash.addRow([g, gData.total, topDescs]);
         row.getCell(1).font = {bold:true};
         row.getCell(2).numFmt = '"$"#,##0.00';
         row.getCell(3).alignment = {wrapText:true, vertical:'top'};
         row.height = 60;
      }
    });

    let rTotalDash = wsDash.addRow(['TOTAL GENERAL', gTotal, '']);
    rTotalDash.eachCell(c => { c.font = {bold:true, size:12}; c.fill = sBgExc; c.color = {argb:'FFFFFFFF'}; });
    rTotalDash.getCell(2).numFmt = '"$"#,##0.00';
    rTotalDash.getCell(1).font = {bold:true, color:{argb:'FFFFFFFF'}};
    rTotalDash.getCell(2).font = {bold:true, color:{argb:'FFFFFFFF'}};
  }

  var fn = (P.proyecto || P.barrio || 'Proyecto').replace(/\s+/g, '_') + '_Cantidades.xlsx';
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveFileWithDialog(blob, fn);
}

/* >>> EXPORTACIÓN MEMORIA DE CANTIDADES ANALIZADAS POR ÍTEM (FORMULAS Y FORMATO CORPORATIVO) <<< */
export async function exportMemoriaCantidades(P, R, T, sumLat, sumTrans, pbItems, urbanismoData) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('MEMORIA_CANTIDADES', { views: [{ showGridLines: true }] });

  // Styles
  const fontTitle = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  const fontSubTitle = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E293B' } };
  const fontItemHeader = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  const fontSecHeader = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  const fontTblHeader = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
  const fontData = { name: 'Arial', size: 9 };
  const fontBold = { name: 'Arial', size: 9, bold: true };
  const fontFormula = { name: 'Consolas', size: 9, color: { argb: 'FFD97706' } };

  const bgHeader = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003B73' } };
  const bgItem = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5C' } };
  const bgSection = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  const bgSubtotal = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  const bgTotalItem = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1F2EB' } };

  const borderThin = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
  };

  ws.columns = [
    { key: 'colA', width: 6 },
    { key: 'colB', width: 38 },
    { key: 'colC', width: 10 },
    { key: 'colD', width: 14 },
    { key: 'colE', width: 14 },
    { key: 'colF', width: 14 },
    { key: 'colG', width: 28 },
    { key: 'colH', width: 16 },
    { key: 'colI', width: 10 },
    { key: 'colJ', width: 35 }
  ];

  // Title block
  ws.mergeCells('A1:J1');
  let r1 = ws.getCell('A1');
  r1.value = 'MEMORIA ANALÍTICA DE CANTIDADES DE OBRA (CONEXIÓN Y SINCRO PRESUPUESTO OFICIAL)';
  r1.font = fontTitle; r1.fill = bgHeader; r1.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('A2:J2');
  let r2 = ws.getCell('A2');
  r2.value = `PROYECTO: ${(P.proyecto || 'SISTEMA DE ALCANTARILLADO').toUpperCase()} | MUNICIPIO: ${(P.municipio || 'SANTANDER').toUpperCase()}`;
  r2.font = fontSubTitle; r2.alignment = { horizontal: 'left', vertical: 'middle' };

  ws.mergeCells('A3:J3');
  let r3 = ws.getCell('A3');
  r3.value = `DISEÑADOR: ${(P.disenador || 'AMCaudales').toUpperCase()} | FECHA: ${P.fecha || new Date().toLocaleDateString('es-CO')}`;
  r3.font = fontSubTitle; r3.alignment = { horizontal: 'left', vertical: 'middle' };

  ws.addRow([]); // Blank row 4

  let activeItems = (pbItems || []).filter(it => it.lv === 3 && it.q > 0);
  if (activeItems.length === 0) activeItems = (pbItems || []).filter(it => it.q > 0);

  // Import dynamically breakdown calculation
  const { getItemAnalyticalBreakdown } = require('./tabs/ResumenCantidadesTab');

  let curRowIndex = 5;

  activeItems.forEach(it => {
    const bk = getItemAnalyticalBreakdown(it, { R, T, sumLat, sumTrans, P, urbanismoData });

    // Item Header Bar
    ws.mergeCells(`A${curRowIndex}:J${curRowIndex}`);
    let itemCell = ws.getCell(`A${curRowIndex}`);
    itemCell.value = `ÍTEM ${it.c} — ${it.d.toUpperCase()} (CANTIDAD EN PRESUPUESTO: ${it.q} ${it.u || 'UND'})`;
    itemCell.font = fontItemHeader; itemCell.fill = bgItem;
    itemCell.alignment = { horizontal: 'left', vertical: 'middle' };
    curRowIndex++;

    // Formula Row
    ws.mergeCells(`A${curRowIndex}:J${curRowIndex}`);
    let formCell = ws.getCell(`A${curRowIndex}`);
    formCell.value = `📌 ${bk.originTitle} | Fórmula: ${bk.formula}`;
    formCell.font = fontFormula;
    formCell.alignment = { horizontal: 'left', vertical: 'middle' };
    curRowIndex++;

    const sectionSubtotalCells = [];

    bk.sections.forEach((sec) => {
      // Section title
      ws.mergeCells(`A${curRowIndex}:J${curRowIndex}`);
      let secCell = ws.getCell(`A${curRowIndex}`);
      secCell.value = sec.title;
      secCell.font = fontSecHeader; secCell.fill = bgSection;
      secCell.alignment = { horizontal: 'left', vertical: 'middle' };
      curRowIndex++;

      // Table headers
      let tblH = ws.addRow(['#', 'Identificador / Elemento', 'Cant. (N°)', 'Long. L (m)', 'Ancho W (m)', 'Prof. H (m)', 'Expresión / Dimensión', 'Subtotal Cantidad', 'Unidad', 'Notas']);
      tblH.eachCell(c => { c.font = fontTblHeader; c.fill = bgHeader; c.alignment = { horizontal: 'center', vertical: 'middle' }; c.border = borderThin; });
      curRowIndex++;

      const startDataRow = curRowIndex;

      sec.rows.forEach((r, rIdx) => {
        let nVal = r.n || 1;
        let lVal = typeof r.l === 'string' ? parseFloat(r.l) || null : r.l;
        let wVal = typeof r.w === 'string' ? parseFloat(r.w) || null : r.w;
        let hVal = typeof r.h === 'string' ? parseFloat(r.h) || null : r.h;
        let subVal = typeof r.sub === 'number' ? r.sub : parseFloat(r.sub) || 0;

        let subFormula = null;
        if (lVal && wVal && hVal) {
          subFormula = `C${curRowIndex}*D${curRowIndex}*E${curRowIndex}*F${curRowIndex}`;
        } else if (lVal && wVal) {
          subFormula = `C${curRowIndex}*D${curRowIndex}*E${curRowIndex}`;
        } else if (lVal) {
          subFormula = `C${curRowIndex}*D${curRowIndex}`;
        }

        let dRow = ws.addRow([
          rIdx + 1,
          r.elem,
          nVal,
          lVal || "-",
          wVal || "-",
          hVal || "-",
          r.expr || "-",
          subFormula ? { formula: subFormula, result: subVal } : subVal,
          r.u || sec.u,
          r.nota || ""
        ]);

        dRow.eachCell((c, colNum) => {
          c.font = fontData; c.border = borderThin;
          if (colNum === 1 || colNum === 3 || colNum === 9) c.alignment = { horizontal: 'center' };
          else if (colNum >= 4 && colNum <= 6) { c.alignment = { horizontal: 'right' }; if (typeof c.value === 'number') c.numFmt = '#,##0.00'; }
          else if (colNum === 8) { c.alignment = { horizontal: 'right' }; c.font = fontBold; c.numFmt = '#,##0.00'; }
          else c.alignment = { horizontal: 'left' };
        });

        curRowIndex++;
      });

      const endDataRow = curRowIndex - 1;

      // Section Subtotal Row with SUM Formula
      let subRow = ws.addRow([
        "",
        `SUBTOTAL ${sec.title.toUpperCase()}`,
        "", "", "", "", "",
        { formula: `SUM(H${startDataRow}:H${endDataRow})`, result: sec.subtotal },
        sec.u,
        "Subtotal parcial amarrado con fórmula Excel SUM"
      ]);

      subRow.eachCell((c, colNum) => {
        c.font = fontBold; c.fill = bgSubtotal; c.border = borderThin;
        if (colNum === 8) { c.alignment = { horizontal: 'right' }; c.numFmt = '#,##0.00'; }
      });

      sectionSubtotalCells.push(`H${curRowIndex}`);
      curRowIndex++;
    });

    // Item Total Row
    let totalFormula = sectionSubtotalCells.length > 0 ? `SUM(${sectionSubtotalCells.join(',')})` : `${it.q}`;
    let totRow = ws.addRow([
      "",
      `TOTAL CANTIDAD ANALIZADA ÍTEM ${it.c}`,
      "", "", "", "", "",
      { formula: totalFormula, result: it.q },
      it.u || "UND",
      "CANTIDAD OFICIAL INYECTADA A PRESUPUESTO"
    ]);

    totRow.eachCell((c, colNum) => {
      c.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF065F46' } };
      c.fill = bgTotalItem; c.border = borderThin;
      if (colNum === 8) { c.alignment = { horizontal: 'right' }; c.numFmt = '#,##0.00'; }
    });

    curRowIndex += 2; // Blank spacing
  });

  const fnMemoria = `Memoria_Cantidades_Analizadas_${(P.proyecto || 'Proyecto').replace(/\s+/g, '_')}.xlsx`;
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveFileWithDialog(blob, fnMemoria);
}

