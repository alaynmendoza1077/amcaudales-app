import ExcelJS from 'exceljs';
import { saveFileWithDialog } from './utils/fileSaver';
import { calcCantSumidero } from './calcHelpers';

const titleFont = { name: 'Arial', family: 2, size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
const subTitleFont = { name: 'Arial', family: 2, size: 11, bold: true, color: { argb: 'FF000000' } };
const headerFont = { name: 'Arial', family: 2, size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
const dataFont = { name: 'Arial', family: 2, size: 10 };
const dataFontBold = { name: 'Arial', family: 2, size: 10, bold: true };
const bgDarkBlue = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003B73' } };
const bgCyan = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00A6D6' } };
const bgLightCyan = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCF0FA' } };
const bgLightYellow = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF3D8' } };

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

function addBasicSheet(wb, sheetName, title, headers, dataRows, P) {
  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
  createCorporateHeader(ws, title, P);
  let headerRow = ws.addRow(headers);
  headerRow.eachCell({ includeEmpty: true }, (c) => {
    c.font = headerFont; c.fill = bgDarkBlue;
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
  });
  dataRows.forEach((rData, idx) => {
    let row = ws.addRow(rData);
    const bgColor = (idx % 2 === 0) ? bgLightCyan : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    row.eachCell({ includeEmpty: true }, (c) => {
      c.font = dataFont; c.fill = bgColor;
      c.border = { top: {style:'thin', color:{argb:'FFEEEEEE'}}, bottom: {style:'thin', color:{argb:'FFEEEEEE'}} };
      if (typeof c.value === 'number' && !Number.isInteger(c.value)) c.numFmt = '0.00';
      c.alignment = { horizontal: 'center', vertical: 'middle' };
    });
  });
  ws.columns.forEach(col => { col.width = 12; });
}

export async function exportDiseno(P, R, alivData = [], sumLat = [], sumTrans = [], estSepData = null) {
  var dR = R.filter(r => !r.sep);
  const wb = new ExcelJS.Workbook();
  
  // 1. SANITARIO
  const sanH = ["DE","A","Dens","Cons","A.Res.P","A.Res.Ac","A.Com.P","A.Com.Ac","A.Ind.P","A.Ind.Ac","A.Inst.P","A.Inst.Ac","Pob","Qmed","F","Qmax","Qi","Qe","Qsan"];
  const sanD = R.map(r => r.sep ? [] : [r.de, r.a, r.den, r.con, r.aR_p, r.aR, r.aC_p, r.aC, r.aI_p, r.aI, r.aIn_p, r.aIn, r.pob, r.Qmed, r.Fm, r.Qmx, r.Qi, r.Qe, r.Qsan]);
  addBasicSheet(wb, "1. Sanitario", "CÁLCULO CAUDAL SANITARIO", sanH, sanD, P);

  // 2. PLUVIAL
  const pluH = ["DE","A","A.Res.P","A.Res.Ac","A.Vía.P","A.Vía.Ac","A.Rec.P","A.Rec.Ac","A.Total","Coef.C","T.Conc","T.Retorno","Intensidad","Q.Pluvial"];
  const pluD = R.map(r => r.sep ? [] : [r.de, r.a, r.aR_p, r.aR, r.aV_p, r.aV, r.aRe_p, r.aRe, r.aT, r.Cw, r.Tc, r.Fr||3, r.I, r.Qpluv]);
  addBasicSheet(wb, "2. Pluvial", "CÁLCULO CAUDAL PLUVIAL", pluH, pluD, P);

  // 3. ALIVIADEROS
  const alivH = ["DE","A","Qsan","Qpluv","Aliviar","QMD","5xQMD","Qd.Aliv"];
  const alivD = R.map((r, ri) => {
    if(r.sep) return [];
    var al = alivData[ri] || {aliviar:"N",qmd:0,f5:0};
    var qmd = al.qmd>0 ? +al.qmd.toFixed(2) : +(r.Qmed || r.Qsan/3.5 || 0).toFixed(2);
    var f5 = al.f5>0 ? +al.f5.toFixed(2) : +(qmd*5).toFixed(2);
    var qdA = al.aliviar==="S" ? +Math.max(0, r.Qpluv-f5).toFixed(2) : r.Qd;
    return [r.de, r.a, r.Qsan, r.Qpluv, al.aliviar||"N", al.aliviar==="S"?qmd:"-", al.aliviar==="S"?f5:"-", qdA];
  });
  addBasicSheet(wb, "3. Alivio", "ALIVIADEROS / SEPARADORES", alivH, alivD, P);

  // 4. CALCULOS HIDRÁULICOS
  const ws = wb.addWorksheet('4. Calculos', { views: [{ showGridLines: false }] });
  ws.mergeCells('A1:AA1'); ws.getCell('A1').value = 'AMCaudales - DISEÑO DE ALCANTARILLADO';
  ws.getCell('A1').font = titleFont; ws.getCell('A1').fill = bgDarkBlue;
  ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.mergeCells('A2:AA2'); ws.getCell('A2').value = `PROYECTO: ${P.proyecto || ''} | ${P.municipio} - ${P.barrio}`;
  ws.getCell('A2').font = subTitleFont;
  ws.mergeCells('A3:AA3'); ws.getCell('A3').value = `DISEÑADOR: ${P.disenador || ''} | FECHA: ${P.fecha || new Date().toLocaleDateString('es-CO')}`;
  ws.getCell('A3').font = subTitleFont;
  ws.addRow([]); ws.addRow([]);

  ws.mergeCells('A6:B6'); ws.getCell('A6').value = 'IDENTIFICACIÓN';
  ws.mergeCells('C6:E6'); ws.getCell('C6').value = 'CAUDAL SANITARIO';
  ws.mergeCells('F6:K6'); ws.getCell('F6').value = 'CAUDAL PLUVIAL';
  ws.mergeCells('L6:M6'); ws.getCell('L6').value = 'CAUDAL DISEÑO';
  ws.mergeCells('N6:P6'); ws.getCell('N6').value = 'CARACTERÍSTICAS TUBERÍA';
  ws.mergeCells('Q6:AA6'); ws.getCell('Q6').value = 'PARÁMETROS HIDRÁULICOS';
  const superHeaders = ['A6','C6','F6','L6','N6','Q6'];
  superHeaders.forEach(cell => {
    ws.getCell(cell).font = headerFont; ws.getCell(cell).fill = bgDarkBlue;
    ws.getCell(cell).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(cell).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
  });

  ws.mergeCells('A8:B8'); ws.getCell('A8').value = 'TRAMO';
  const subH = ['A8','C8','D8','E8','F8','G8','H8','I8','J8','K8','L8','M8','N8','O8','P8','Q8','R8','S8','T8','U8','V8','W8','X8'];
  ['Q. Conex.\nErradas','Q. Infiltración','Caudal\nSanitario','Tiempo\nConcen.','Periodo de\nRetorno','Intens.','Coef.\nEscorrentía','Area Total','Caudal\nPluvial','Caudal\nDiseño','Material','Diam.','Long.','Pendiente','Qo DW','Qo Mann','Q/Qo %','Y/Do %','V. Lleno','V. Real','Ft','Froude'].forEach((v, i) => { ws.getCell(subH[i+1]).value = v; });
  subH.forEach(cell => {
    ws.getCell(cell).font = headerFont; ws.getCell(cell).fill = bgDarkBlue;
    ws.getCell(cell).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    ws.getCell(cell).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
  });
  ws.getRow(8).height = 30;

  const vars10 = ['DE','A','Qe','Qi','(3)+(4)','Tc','F','I','C','A','Q','Qd','Mat','Dn','L','S','Qo','Qom','Q/Qo','Y/D','Vo','V','Ft','Fr'];
  vars10.forEach((val, idx) => {
    let c = ws.getCell(10, idx+1); c.value = val; c.font = headerFont; c.fill = bgDarkBlue;
    c.alignment = { horizontal: 'center', vertical: 'middle' }; c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
  });

  const units11 = ['','','[L/s]','[L/s]','[L/s]','[Min]','[Años]','[L/s*Ha]','Tabla','[Has]','[L/s]','[L/s]','-','[mm]','[m]','[%]','[L/s]','[L/s]','[%]','[%]','[m/s]','[m/s]','[Pa]','-'];
  units11.forEach((val, idx) => {
    let c = ws.getCell(11, idx+1); c.value = val; c.font = headerFont; c.fill = bgDarkBlue;
    c.alignment = { horizontal: 'center', vertical: 'middle' }; c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
  });

  for(let i=0; i<24; i++) {
    let c = ws.getCell(12, i+1); c.value = `(${i+1})`;
    c.font = { name: 'Arial', family: 2, size: 9, bold: true, color: { argb: 'FF000000' } };
    c.fill = bgCyan; c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
  }

  let rNum = 14;
  R.forEach((r, idx) => {
    if (r.sep) {
      ws.mergeCells(`A${rNum}:X${rNum}`); ws.getCell(`A${rNum}`).value = "━ SEPARADOR ━";
      ws.getCell(`A${rNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDDDDD' } };
      ws.getCell(`A${rNum}`).alignment = { horizontal: 'center' };
      rNum++; return;
    }
    const rowData = [r.de, r.a, r.Qe, r.Qi, r.Qsan, r.Tc, r.Fr||3, r.I, r.Cw, r.aT, r.Qpluv, r.Qd, r.mat||'PVC', r.nom, r.L, r.S, r.Qo, r.QoM, r.QQo, r.YDo, r.Vo, r.V, r.Ft, r.Froude];
    var sanitized = rowData.map(cell => (cell === null || cell === undefined) ? '' : (typeof cell === 'number' && !Number.isFinite(cell) ? 0 : cell));
    let excelRow = ws.addRow(sanitized);
    const bgColor = (idx % 2 === 0) ? bgLightCyan : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    excelRow.eachCell({ includeEmpty: true }, (c, colNumber) => {
      c.font = dataFont; c.fill = bgColor;
      c.border = { top: {style:'thin', color:{argb:'FFEEEEEE'}}, bottom: {style:'thin', color:{argb:'FFEEEEEE'}} };
      if ([5,11,12,22,23].includes(colNumber)) c.font = dataFontBold;
      if (colNumber === 12) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDFF4D8' } };
      if (typeof c.value === 'number') c.numFmt = '0.00';
      c.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    rNum++;
  });
  ws.columns = [
    { width: 14 }, { width: 14 }, { width: 9 }, { width: 9 }, { width: 10 }, { width: 9 }, { width: 9 }, { width: 9 }, { width: 9 }, { width: 9 }, { width: 10 }, { width: 11 }, { width: 10 }, { width: 10 }, { width: 9 }, { width: 9 }, { width: 9 }, { width: 9 }, { width: 9 }, { width: 9 }, { width: 9 }, { width: 9 }, { width: 9 }, { width: 9 }
  ];

  // 5. COTAS
  const cotasH = ["DE","A","L(m)","P(%)","C.Ras DE","C.Ras A","C.Fon DE","C.Fon A","Prof.E","Prof.S","Caída","Flujo"];
  const cotasD = R.map(r => r.sep ? [] : [r.de, r.a, r.L, r.S, r.crDE, r.crA, r.cfDE, r.cfA, r.profE, r.profS, r.caida, r.flujo]);
  addBasicSheet(wb, "5. Cotas", "COTAS Y PROFUNDIDADES", cotasH, cotasD, P);

  // 6. VERIFICACIONES
  const verifH = ["DE","A","Diam","V(m/s)","Ft(Pa)","Q/Qo(%)","Y/Do(%)","Froude","V>Min","Ft>Min","Q/Qo<Max","Y/Do<Max","Prof OK","Fr OK","Alerta","D.Prop"];
  const verifD = R.map(r => {
    if(r.sep) return [];
    var al = [];
    if(!r.okV)al.push("V");if(!r.okFt)al.push("Ft");if(!r.okQ)al.push("Q/Qo");if(!r.okY)al.push("Y/Do");if(!r.okFr)al.push("Fr");if(!r.okProf)al.push("Prof");
    return [r.de, r.a, r.nom, r.V, r.Ft, r.QQo, r.YDo, r.Froude, r.okV?"SI":"NO", r.okFt?"SI":"NO", r.okQ?"SI":"NO", r.okY?"SI":"NO", r.okProf?"SI":"NO", r.okFr?"SI":"NO", al.join(", "), r.nomProp&&r.nomProp!==r.nom?r.nomProp:"-"];
  });
  addBasicSheet(wb, "6. Verif", "VERIFICACIONES HIDRÁULICAS", verifH, verifD, P);

  // 7. PERFIL
  const perfilH = ["Distancia Acumulada", "Cota Rasante (Terreno)", "Cota Fondo"];
  let pts = []; let xAcc = 0;
  var adjMap={}; dR.forEach(r => adjMap[r.de]=r);
  var allA={}; dR.forEach(r => allA[r.a]=1);
  var cabeceras=[]; dR.forEach(r => {if(!allA[r.de])cabeceras.push(r.de);});
  if(cabeceras.length===0) cabeceras.push(dR[0].de);
  var colectores=[];
  cabeceras.forEach(cab => {
    var chain2=[]; var cur2=adjMap[cab]; var vis2={};
    while(cur2&&!vis2[cur2.id]){vis2[cur2.id]=1;chain2.push(cur2);cur2=adjMap[cur2.a];}
    if(chain2.length>=1) colectores.push({cab:cab,chain:chain2,len:chain2.reduce((s,r)=>s+(r.L||0),0)});
  });
  colectores.sort((a,b)=>b.len-a.len);
  var chain = colectores.length>0 ? colectores[0].chain : dR;

  chain.forEach((r, i) => {
    pts.push([xAcc, r.crDE, r.cfDE]);
    xAcc += (r.L || 10);
    if(i === chain.length-1) pts.push([xAcc, r.crA, r.cfA]);
  });
  const wsPerfil = wb.addWorksheet("7. Perfil", { views: [{ showGridLines: false }] });
  createCorporateHeader(wsPerfil, "DATOS PARA PERFIL (COLECTOR PRINCIPAL)", P);
  let phRow = wsPerfil.addRow(perfilH);
  phRow.eachCell(c => { c.font = headerFont; c.fill = bgDarkBlue; c.alignment = {horizontal:'center'}; c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} }; });
  pts.forEach(p => {
    let pr = wsPerfil.addRow(p);
    pr.eachCell(c => { c.font = dataFont; c.border = { top: {style:'thin', color:{argb:'FFEEEEEE'}}, bottom: {style:'thin', color:{argb:'FFEEEEEE'}} }; });
  });
  wsPerfil.columns.forEach(col => { col.width = 25; });
  
  wsPerfil.mergeCells('E6:I10');
  let hintCell = wsPerfil.getCell('E6');
  hintCell.value = "NOTA: ExcelJS no soporta la creación de gráficos automáticos.\nPara ver tu perfil:\n1. Selecciona los datos de la izquierda (A6:C...)\n2. Ve a Insertar > Gráfico de Líneas.\n¡Y listo!";
  hintCell.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF000000' } };
  hintCell.fill = bgLightYellow;
  hintCell.alignment = { vertical: 'middle', wrapText: true };

  // 8. CALC SUMIDEROS
  const sumH = ["#","Tipo","Cant.","Long/Ancho(m)","Pozo","Vol.Exc(m3)","Conc.(m3)","Cim.(m3)"];
  const sumD = [];
  let sumIdx = 0;
  (sumLat||[]).filter(s=>s.cant>0).forEach(s => { 
    let c = calcCantSumidero ? calcCantSumidero(s) : null;
    let t = s.tipo || "SL-200";
    if (t === "SL-200") t = "SL-200 (L=2m)";
    else if (t === "SL-400") t = "SL-400 (L=4m)";
    else if (t === "SL-600") t = "SL-600 (L=6m)";
    sumD.push([sumIdx+1, t, s.cant, s.long||s.ancho||1, s.pozo||'-', c?(c.totExc||0).toFixed(2):'-', c?((c.c4||0)+(c.cp||0)).toFixed(3):'-', c?(c.cim||0).toFixed(2):'-']);
    sumIdx++;
  });
  (sumTrans||[]).filter(s=>s.cant>0).forEach(s => { 
    let c = calcCantSumidero ? calcCantSumidero(s) : null;
    let t = s.tipo || "ST-40";
    if (t === "ST-40") t = "ST-40 (B=40cm)";
    else if (t === "ST2-40") t = "ST2-40 (B=80cm)";
    sumD.push([sumIdx+1, t, s.cant, s.long||s.ancho||1, s.pozo||'-', c?(c.totExc||0).toFixed(2):'-', c?((c.c4||0)+(c.cp||0)).toFixed(3):'-', c?(c.cim||0).toFixed(2):'-']);
    sumIdx++;
  });
  if (sumD.length > 0) {
    addBasicSheet(wb, "8. Calc Sumideros", "CÁLCULO DE SUMIDEROS", sumH, sumD, P);
  }

  // 9. EST SEPARACION
  if (estSepData && Object.keys(estSepData).length > 0) {
    const sepH = ["Pozo/Nodo","Q.Diseño","D.Tubo(m)","Q.Tubo","Q.Alivio","Vol.Excav(m3)","Vol.Conc(m3)","Peso.Acero(kg)","L.Vertedero(m)"];
    const sepD = [];
    Object.keys(estSepData).forEach(nodo => {
      let d = estSepData[nodo];
      sepD.push([nodo, d.Qd||0, d.Dt||0, d.Qt||0, d.Qa||0, d.cantExcav||0, d.cantConc||0, d.cantAcero||0, d.cantLongVertedero||0]);
    });
    if (sepD.length > 0) {
      addBasicSheet(wb, "9. Est Separacion", "ESTRUCTURAS DE SEPARACIÓN", sepH, sepD, P);
    }
  }

  var fn = (P.proyecto || P.barrio || "Proyecto").replace(/\s+/g, "_") + "_Diseño.xlsx";
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveFileWithDialog(blob, fn);
}
