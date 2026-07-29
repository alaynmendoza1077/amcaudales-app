import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fm } from './ui';
import { calcCantSumidero, calcPozosCompleto } from './calcHelpers';

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   AMCaudales Pro Â· Sistema de Reportes PDF Completos v1.0
   Genera reportes individuales y consolidados con toda la
   información técnica del proyecto.
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

const PAGE_W = 297, PAGE_H = 210;

function safe(v, dec = 2) {
  const n = parseFloat(v);
  return (isNaN(n) || !isFinite(n)) ? '-' : n.toFixed(dec);
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function sanitize(P) {
  return ((P.barrio || P.proyecto || 'Proyecto') + '')
    .replace(/[^a-zA-Z0-9\-_ ]/g, '').trim().replace(/\s+/g, '_');
}

/* â”€â”€ Paleta â”€â”€ */
function pal(isBW) {
  return {
    DARK  : isBW ? [40,40,40]   : [3,11,30],
    PRI   : isBW ? [60,60,60]   : [0,59,115],
    ACC   : isBW ? [120,120,120]: [0,166,214],
    EME   : isBW ? [80,80,80]   : [16,185,129],
    AMB   : isBW ? [140,120,80] : [240,147,43],
    WHITE : [255,255,255],
    LTGRAY: [230,230,230],
  };
}

/* â”€â”€ AutoTable config â”€â”€ */
function tbl(headerColor, isBW) {
  const { WHITE, LTGRAY } = pal(isBW);
  return {
    styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak',
              textColor: isBW ? [40,40,40] : [200,215,235] },
    headStyles: { fillColor: headerColor, textColor: WHITE, fontStyle: 'bold', fontSize: 7.5, halign: 'center' },
    alternateRowStyles: { fillColor: isBW ? LTGRAY : [8,16,40] },
    tableLineColor: isBW ? [160,160,160] : [28,46,74],
    tableLineWidth: 0.2,
    columnStyles: { 0: { halign: 'center' } },
    margin: { left: 10, right: 10 },
    theme: 'grid',
  };
}

function mkDoc() {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setFont('helvetica', 'normal');
  return doc;
}

function addFooter(doc, pg, P, isBW) {
  const { PRI, ACC, WHITE } = pal(isBW);
  const now = new Date().toLocaleDateString('es-CO');
  doc.setFillColor(...PRI); doc.rect(0, PAGE_H-8, PAGE_W, 8, 'F');
  doc.setDrawColor(...ACC); doc.setLineWidth(0.4); doc.line(0, PAGE_H-8, PAGE_W, PAGE_H-8);
  doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(...WHITE);
  doc.text('AMCaudales Pro', 10, PAGE_H-3);
  doc.setFont('helvetica','normal');
  doc.text((P.proyecto||''), PAGE_W/2, PAGE_H-3, {align:'center'});
  doc.text(`${now}  Â·  Pág. ${pg}`, PAGE_W-10, PAGE_H-3, {align:'right'});
}

function addSection(doc, title, color, y, isBW) {
  const { WHITE } = pal(isBW);
  doc.setFillColor(...color); doc.rect(10, y, PAGE_W-20, 7, 'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(...WHITE);
  doc.text(title, 14, y+5);
  doc.setFont('helvetica','normal'); doc.setTextColor(isBW?40:200, isBW?40:215, isBW?40:235);
  return y + 11;
}

function addCover(doc, P, title, num, total, isBW) {
  const { PRI, ACC, EME, AMB, WHITE, DARK } = pal(isBW);
  doc.setFillColor(...(isBW?[30,30,30]:DARK)); doc.rect(0,0,PAGE_W,PAGE_H,'F');
  doc.setFillColor(...PRI); doc.rect(0,0,42,PAGE_H,'F');
  doc.setFillColor(...ACC); doc.rect(42,0,3,PAGE_H,'F');
  // Logo
  doc.setFont('helvetica','bold'); doc.setFontSize(20); doc.setTextColor(...ACC);
  doc.text('AMC', 7, 22); doc.setFontSize(10); doc.setTextColor(...WHITE); doc.text('Pro', 7, 29);
  // Section badge
  doc.setFillColor(...ACC); doc.circle(21, 68, 13, 'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(15); doc.setTextColor(...WHITE);
  doc.text(String(num).padStart(2,'0'), 21, 72, {align:'center'});
  doc.setFontSize(7); doc.text(`de ${String(total).padStart(2,'0')}`, 21, 79, {align:'center'});
  // Title
  doc.setFont('helvetica','bold'); doc.setFontSize(24); doc.setTextColor(...WHITE);
  doc.text(title, 55, 52);
  doc.setFillColor(...ACC); doc.rect(55, 56, 220, 0.8, 'F');
  // Info
  const info = [
    ['PROYECTO', P.proyecto||'Sin definir'],['BARRIO', P.barrio||P.municipio||'-'],
    ['DISEÃ‘ADOR', P.disenador||'-'],['EMPRESA', P.empresa||'AMCaudales Pro'],
    ['FECHA', P.fecha||new Date().toLocaleDateString('es-CO')],
  ];
  let iy = 68;
  info.forEach(([k,v]) => {
    doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(...ACC);
    doc.text(k+':', 55, iy);
    doc.setFont('helvetica','normal'); doc.setTextColor(...WHITE);
    doc.text(String(v).substring(0,55), 96, iy);
    iy += 9;
  });
  // Badge
  if (num > 0) {
    doc.setFillColor(...AMB); doc.roundedRect(55, PAGE_H-30, 90, 12, 2, 2, 'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(40,25,5);
    doc.text('USO TÃ‰CNICO â€” AMCaudales Pro', 100, PAGE_H-22, {align:'center'});
  }
  // Footer
  doc.setFillColor(...PRI); doc.rect(0, PAGE_H-8, PAGE_W, 8, 'F');
  doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(...WHITE);
  doc.text('AMCaudales Pro  |  Sistema de Diseño de Reposición de Redes de Alcantarillado', PAGE_W/2, PAGE_H-3, {align:'center'});
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SEC 01 â€” FORMULARIO
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function sec01_Formulario(doc, P, R, isBW, pg) {
  const { PRI, ACC, EME } = pal(isBW);
  addFooter(doc, pg++, P, isBW); let y = 14;
  y = addSection(doc, '1. Información General del Proyecto', PRI, y, isBW);
  autoTable(doc, { ...tbl(ACC, isBW), startY: y,
    head:[['Parámetro','Valor','Parámetro','Valor']],
    body:[
      ['Proyecto',P.proyecto||'-','Barrio / Sector',P.barrio||'-'],
      ['Municipio',P.municipio||'-','Empresa',P.empresa||'-'],
      ['Diseñador',P.disenador||'-','Cédula',P.cedula||'-'],
      ['Tipo Sistema',P.tipoAlc==='S'?'Sanitario':P.tipoAlc==='P'?'Pluvial':'Combinado','Estación IDF',P.estacion||'BUC'],
      ['Pob. Directa (hab)',P.pobDirecta||'-','Pob. Indirecta (hab)',Math.round((P.areaTotal||0)*(P.densidad||600))],
      ['Área Total (Ha)',P.areaTotal||'-','Altitud (m.s.n.m.)',P.alturaSNM||1015],
      ['Densidad (hab/Ha)',P.densidad||600,'Consumo (L/hab/día)',P.consumo||140],
      ['Período Retorno (a)',P.periodoRetorno||10,'Período Diseño (a)',P.periodoDisenio||25],
      ['Hab/Vivienda',P.habVivienda||4,'% Patios',((P.porcPatios||0.1)*100).toFixed(0)+'%'],
    ],
    columnStyles:{0:{fontStyle:'bold',textColor:ACC,halign:'left'},2:{fontStyle:'bold',textColor:ACC,halign:'left'}},
  });
  y = doc.lastAutoTable.finalY + 7;
  y = addSection(doc, '2. Parámetros Hidráulicos de Diseño', ACC, y, isBW);
  autoTable(doc, { ...tbl(ACC, isBW), startY: y,
    head:[['Parámetro','Valor','Parámetro','Valor','Parámetro','Valor']],
    body:[
      ['n Manning',P.nManning||0.013,'Vel. Mín. (m/s)',P.velMinima||0.45,'Vel. Máx. (m/s)',P.velMaxima||5.0],
      ['Ft Mín. (Pa)',P.fuerzaTractMin||1.5,'Rel. Q/Qo Máx.',P.relCapacidad||0.85,'Prof. Mín. Zanja (m)',P.profMinimaZanja||1.0],
      ['Coef. Retorno',P.coefRetorno||0.85,'Lím. Froude Sub.',P.limFroudeSub||0.9,'Lím. Froude Sup.',P.limFroudeSup||1.1],
      ['% Prof. Pozo',((P.porcProfundidad||0.9)*100).toFixed(0)+'%','Coef. Escorr. Res.',P.coef_aR||0.8,'Coef. Escorr. Com.',P.coef_aC||0.9],
    ],
    columnStyles:{0:{fontStyle:'bold',textColor:PRI,halign:'left'},2:{fontStyle:'bold',textColor:PRI,halign:'left'},4:{fontStyle:'bold',textColor:PRI,halign:'left'}},
  });
  y = doc.lastAutoTable.finalY + 7;
  if (y > PAGE_H-45) { doc.addPage(); addFooter(doc, pg++, P, isBW); y = 14; }
  y = addSection(doc, '3. Parámetros Administrativos', EME, y, isBW);
  autoTable(doc, { ...tbl(EME, isBW), startY: y,
    head:[['Parámetro','Valor','Parámetro','Valor','Parámetro','Valor']],
    body:[
      ['% Admin.',((P.porcAdmin||0.29)*100).toFixed(1)+'%','% Imprevistos',((P.porcImprevistos||0.01)*100).toFixed(1)+'%','% Utilidad',((P.porcUtilidad||0.05)*100).toFixed(1)+'%'],
      ['% IVA/Utilidad',((P.porcIVA||0.19)*100).toFixed(1)+'%','Interventoría',P.reqInterventoria||'N','% Interventoría',((P.porcInterventoria||0.08)*100).toFixed(1)+'%'],
      ['Tiempo Obra (meses)',P.tiempoObra||2,'Dist. Botadero (km)',P.distBotadero||8,'Ancho Vía (m)',P.anchoVia||6],
      ['% Exc. Tierra',((P.porcExcTierra||0.55)*100).toFixed(0)+'%','% Exc. Granular',((P.porcExcGranular||0.30)*100).toFixed(0)+'%','% Exc. Roca',((P.porcExcRoca||0.15)*100).toFixed(0)+'%'],
    ],
    columnStyles:{0:{fontStyle:'bold',textColor:EME,halign:'left'},2:{fontStyle:'bold',textColor:EME,halign:'left'},4:{fontStyle:'bold',textColor:EME,halign:'left'}},
  });
  return pg;
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SEC 02 â€” DISEÃ‘O HIDRÁULICO
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function sec02_DisenoHidra(doc, P, R, isBW, pg) {
  const { PRI, ACC, EME, AMB, WHITE } = pal(isBW);
  addFooter(doc, pg++, P, isBW); let y = 14;
  const dR = R.filter(r=>!r.sep);
  y = addSection(doc, '4. Reporte de Diseño Hidráulico por Tramo', PRI, y, isBW);
  const head=[['#','DE','A','L\n(m)','S\n(%)','Diam\nNvo\n(mm)','Mat.\nNvo','Diam\nAnt\n(mm)','Mat.\nAnt','Q.San\n(L/s)','Q.Pl\n(L/s)','Q.Dis\n(L/s)','Q.Lle\n(L/s)','Q/Qo\n(%)','Y/Do\n(%)','V\n(m/s)','Ft\n(Pa)','Fr','Rep.']];
  const rows = dR.map((r,i)=>[i+1,r.de||'',r.a||'',safe(r.L,1),safe(r.S,3),
    r.nom||(r.D?Math.round(r.D*1000):'-'),r.mat||'-',
    r.diamOrig||r.diametroCom||'-',r.matOrig||r.material||'-',
    safe(r.Qsan,2),safe(r.Qpluv,2),safe(r.Qd,2),safe(r.Qo,2),
    safe(r.QQo,1),safe(r.YDo,1),safe(r.V,3),safe(r.Ft,2),safe(r.Froude,3),r.reponer||'N']);
  autoTable(doc,{...tbl(PRI,isBW),startY:y,head,body:rows,
    columnStyles:{0:{cellWidth:6},1:{cellWidth:14,halign:'left'},2:{cellWidth:14,halign:'left'},5:{cellWidth:12},6:{cellWidth:9},7:{cellWidth:12,textColor:AMB},8:{cellWidth:9,textColor:AMB},18:{cellWidth:8}},
    didParseCell:d=>{
      if(d.section==='body'){
        if(d.column.index===18){d.cell.styles.textColor=d.cell.raw==='S'?EME:[200,50,50];d.cell.styles.fontStyle='bold';}
        if(d.column.index===17){const fr=parseFloat(d.cell.raw);if(!isNaN(fr)&&fr>1)d.cell.styles.textColor=[200,50,50];}
        if(d.column.index===7||d.column.index===8){d.cell.styles.textColor=d.cell.raw==='-'?[160,160,160]:AMB;}
      }
    },
  });
  // Resumen
  y = doc.lastAutoTable.finalY+7;
  if(y<PAGE_H-40){
    const dN=dR.filter(r=>r.reponer==='S');
    const lt=dN.reduce((s,r)=>s+(r.L||0),0);
    y = addSection(doc,'4.1 Resumen de la Red',ACC,y,isBW);
    autoTable(doc,{...tbl(ACC,isBW),startY:y,
      head:[['Indicador','Valor','Indicador','Valor','Indicador','Valor']],
      body:[
        ['Total Tramos',dR.length,'Tramos a Reponer',dN.length,'Long. Reposición (m)',lt.toFixed(1)],
        ['Alertas Froude>1',dR.filter(r=>parseFloat(r.Froude)>1).length,'V fuera de rango',dR.filter(r=>parseFloat(r.V)<(P.velMinima||0.45)||parseFloat(r.V)>(P.velMaxima||5)).length,'Ft < Mínimo',dR.filter(r=>parseFloat(r.Ft)<(P.fuerzaTractMin||1.5)).length],
      ],
      columnStyles:{0:{fontStyle:'bold',textColor:PRI,halign:'left'},2:{fontStyle:'bold',textColor:PRI,halign:'left'},4:{fontStyle:'bold',textColor:PRI,halign:'left'}},
    });
  }
  return pg;
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SEC 03 â€” EXCAVACIONES
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function sec03_Excavaciones(doc, P, R, isBW, pg) {
  const { PRI, ACC, EME } = pal(isBW);
  addFooter(doc, pg++, P, isBW); let y = 14;
  const dN = R.filter(r => r.sep || r.reponer === 'S');
  y = addSection(doc,'5. Cantidades de Obra â€” Excavaciones y Zanjas',EME,y,isBW);
  let tVE=0,tRP=0,tRE=0;
  const rows=dN.map((r,i)=>{tVE+=r.volE||0;tRP+=r.rotP||0;tRE+=r.repP||0;
    return[i+1,r.de||'',r.a||'',safe(r.L,1),r.nom||(r.D?Math.round(r.D*1000):'-'),
      safe(r.bz,3),safe(r.HP,2),safe(r.profE,2),safe(r.profS,2),safe(r.volE,2),r.tipoVia||'-',safe(r.rotP,2),safe(r.repP,2)];});
  rows.push([{content:'TOTALES',colSpan:9,styles:{fontStyle:'bold',halign:'right',textColor:[255,255,255],fillColor:PRI}},'','','',safe(tVE,2),'','',safe(tRP,2),safe(tRE,2)]);
  autoTable(doc,{...tbl(EME,isBW),startY:y,
    head:[['#','DE','A','L(m)','Diam\n(mm)','Bz\n(m)','H.Pav\n(m)','Prof.E\n(m)','Prof.S\n(m)','Vol.Exc\n(mÂ³)','Vía','Rot.Pav\n(mÂ²)','Rep.Pav\n(mÂ²)']],
    body:rows,columnStyles:{0:{cellWidth:6},1:{cellWidth:18,halign:'left'},2:{cellWidth:18,halign:'left'}},
  });
  return pg;
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SEC 04 â€” POZOS DE INSPECCIÃ“N (Cantidades Detalladas)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function sec04_Pozos(doc, P, R, isBW, pg) {
  const { PRI, ACC, AMB } = pal(isBW);
  addFooter(doc, pg++, P, isBW); let y = 14;
  const dN = R.filter(r => r.sep || r.reponer === 'S');
  y = addSection(doc, '6. Cantidades de Obra â€” Pozos de Inspección', AMB, y, isBW);
  let pzDataCompleto = null;
  try { pzDataCompleto = calcPozosCompleto ? calcPozosCompleto(dN, P) : null; } catch(e) {}
  
  if (pzDataCompleto && pzDataCompleto.pz && pzDataCompleto.pz.length > 0) {
    const rows = pzDataCompleto.pz.map((p, i) => [
      i + 1,
      p.nodo || '',
      safe(p.prof, 2),
      p.tipoPozo || 'M',
      p.hConc ? safe(p.hConc, 2) : "-",
      p.hMamp > 0 ? safe(p.hMamp, 2) : "-",
      p.volConc ? safe(p.volConc, 2) : "-",
      p.areaMamp > 0 ? safe(p.areaMamp, 2) : "-",
      p.volExc ? safe(p.volExc, 2) : "-",
      p.pdr60 > 0 ? p.pdr60 : "-",
      p.a37 > 0 ? safe(p.a37, 2) : "-",
      p.peldanos || "-",
      p.concPobre > 0 ? safe(p.concPobre, 2) : "-"
    ]);
    autoTable(doc, {
      ...tbl(AMB, isBW), startY: y,
      head: [['#','ID Pozo','Prof.\n(m)','M/C','hConc\n(m)','hMamp\n(m)','Conc.\n(mÂ³)','Mamp.\n(mÂ²)','Exc.\n(mÂ³)','PDR-60','A-37\n(mÂ²)','Peld.','C.Pobre\n(mÂ³)' ]],
      body: rows,
      columnStyles: { 0: { cellWidth: 6 }, 1: { cellWidth: 20, halign: 'left' } },
      styles: { fontSize: 7, cellPadding: 1 }
    });
  } else {
    // Fallback al inventario básico
    const rows = dN.map((r, i) => [i + 1, r.de || '', safe(r.crDE, 2), safe(r.cfDE, 2), safe(r.HP, 2), '-', r.tipoPozo || 'M', r.pozoNuevo || 'N', '-', '-']);
    autoTable(doc, {
      ...tbl(AMB, isBW), startY: y,
      head: [['#','ID Pozo','C.Ras\n(m)','C.Fon\n(m)','Prof.\n(m)','DI\nExt.','Tipo','Nuevo','Vol.Conc\n(mÂ³)','Vol.Mamp\n(mÂ³)' ]],
      body: rows,
      columnStyles: { 0: { cellWidth: 6 }, 1: { cellWidth: 30, halign: 'left' } },
    });
  }
  return pg;
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SEC 04b â€” ACOMETIDAS
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function sec04b_Acometidas(doc, P, R, isBW, pg) {
  const { PRI, ACC, AMB } = pal(isBW);
  addFooter(doc, pg++, P, isBW); let y = 14;
  const dN = R.filter(r => r.sep || r.reponer === 'S');
  y = addSection(doc, '6.5 Cantidades de Obra â€” Acometidas Domiciliarias', ACC, y, isBW);
  
  let acData = [];
  try {
      dN.forEach(r => {
        let n = parseInt(r.nAcom, 10) || 0;
        if (n > 0) {
            acData.push([
                r.de + "-" + r.a,
                n,
                r.long || "-",
                (n * (P.longAcometida || 6)).toFixed(1),
                r.tipoVia || "FX"
            ]);
        }
      });
  } catch(e) {}
  
  if (acData.length > 0) {
      autoTable(doc, {
          ...tbl(ACC, isBW), startY: y,
          head: [['Tramo', 'Cant. Acometidas', 'Long. Tramo (m)', 'Long. Total Acometidas (m)', 'Tipo Vía']],
          body: acData
      });
  } else {
      doc.setFont("helvetica", "italic");
      doc.text("No se registraron acometidas en la red.", 14, y + 10);
  }
  return pg;
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SEC 05 â€” TUBERÍAS
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function sec05_Tuberias(doc, P, R, isBW, pg) {
  const { PRI, ACC, EME } = pal(isBW);
  addFooter(doc, pg++, P, isBW); let y = 14;
  const dN = R.filter(r => r.sep || r.reponer === 'S');
  y = addSection(doc,'7. Cantidades de Obra â€” Tuberías (Detalle)',PRI,y,isBW);
  const detRows=dN.map((r,i)=>[i+1,r.de||'',r.a||'',safe(r.L,1),r.nom||(r.D?Math.round(r.D*1000):'-'),r.mat||'-',r.reponer||'N']);
  autoTable(doc,{...tbl(PRI,isBW),startY:y,
    head:[['#','DE','A','L (m)','Diám. (mm)','Material','Rep.']],
    body:detRows,columnStyles:{0:{cellWidth:6},1:{cellWidth:30,halign:'left'},2:{cellWidth:30,halign:'left'}},
  });
  y=doc.lastAutoTable.finalY+7;
  if(y<PAGE_H-40){
    const groups={};
    dN.forEach(r=>{const k=`${r.nom||'?'}_${r.mat||'-'}`;if(!groups[k])groups[k]={d:r.nom||(r.D?Math.round(r.D*1000)+' mm':'-'),m:r.mat||'-',L:0,n:0};groups[k].L+=r.L||0;groups[k].n++;});
    y=addSection(doc,'7.1 Resumen por Diámetro y Material',ACC,y,isBW);
    const sumR=Object.values(groups).map(g=>[g.d,g.m,g.n,safe(g.L,1)]);
    sumR.push([{content:'TOTAL',colSpan:2,styles:{fontStyle:'bold'}},Object.values(groups).reduce((s,g)=>s+g.n,0),safe(dN.reduce((s,r)=>s+(r.L||0),0),1)]);
    autoTable(doc,{...tbl(ACC,isBW),startY:y,head:[['Diámetro','Material','NÂ° Tramos','Long. Total (m)']],body:sumR,
      columnStyles:{0:{cellWidth:50},1:{cellWidth:50},2:{cellWidth:35},3:{cellWidth:50}},
    });
  }
  return pg;
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SEC 06 â€” SUMIDEROS
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function sec06_Sumideros(doc, P, R, sumLat, sumTrans, isBW, pg) {
  const { PRI, ACC, EME } = pal(isBW);
  addFooter(doc, pg++, P, isBW); let y = 14;
  y = addSection(doc,'8. Cantidades de Obra â€” Sumideros Laterales',ACC,y,isBW);
  const mkRow=(s,i)=>{let c=null;try{c=calcCantSumidero?calcCantSumidero(s):null;}catch(e){}
    return[i+1,s.tipo||'-',s.cant||0,safe(s.long,1),s.pozo||'-',c?safe(c.volExc,2):'-',c?safe(c.concBase,3):'-',c?safe(c.cim,2):'-'];};
  const latR=(sumLat||[]).filter(s=>s.cant>0).map(mkRow);
  autoTable(doc,{...tbl(ACC,isBW),startY:y,body:latR.length>0?latR:[['â€”','â€”','â€”','â€”','â€”','â€”','â€”','â€”']],
    head:[['#','Tipo','Cant.','Long.(m)','Pozo','Vol.Exc(mÂ³)','Conc.(mÂ³)','Cim.(mÂ³)']],
  });
  y=doc.lastAutoTable.finalY+7;
  if(y > 250){doc.addPage();addFooter(doc,pg++,P,isBW);y=14;}
  y=addSection(doc,'8.2 Sumideros Transversales',EME,y,isBW);
  const trR=(sumTrans||[]).filter(s=>s.cant>0).map(mkRow);
  autoTable(doc,{...tbl(EME,isBW),startY:y,body:trR.length>0?trR:[['â€”','â€”','â€”','â€”','â€”','â€”','â€”','â€”']],
    head:[['#','Tipo','Cant.','Long.(m)','Pozo','Vol.Exc(mÂ³)','Conc.(mÂ³)','Cim.(mÂ³)']],
  });
  return pg;
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SEC 07 â€” PRESUPUESTO
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function sec07_Presupuesto(doc, P, R, pbItems, isBW, pg) {
  const { PRI, ACC, EME, AMB, WHITE } = pal(isBW);
  addFooter(doc, pg++, P, isBW); let y = 14;
  const dN = R.filter(r => r.sep || r.reponer === 'S');
  const lt=dN.reduce((s,r)=>s+(r.L||0),0);
  let pbCd=0,allRows=[];
  (pbItems||[]).forEach(it=>{
    if(it.lv>=3&&it.q>0&&it.p>0){const t=Math.round(it.q*it.p);pbCd+=t;allRows.push({type:'item',lv:it.lv,c:it.c,d:it.d,u:it.u,q:it.q,p:it.p,t});}
    else if(it.lv<3)allRows.push({type:'header',lv:it.lv,c:it.c,d:it.d});
  });
  const cdE=pbCd>0?pbCd:Math.round(lt*5474000);
  const adm=Math.round(cdE*(P.porcAdmin||0.29));
  const imp=Math.round(cdE*(P.porcImprevistos||0.01));
  const ut=Math.round(cdE*(P.porcUtilidad||0.05));
  const iva=Math.round(ut*(P.porcIVA||0.19));
  const interv = (P.reqInterventoria === "S" || P.reqInterventoria === true) ? Math.round((cdE+adm+imp+ut+iva)*(P.porcInterventoria||0.08)) : 0;
  const totE=cdE+adm+imp+ut+iva+interv;

  y=addSection(doc,'9. Presupuesto de Obra â€” Listado Completo',PRI,y,isBW);
  if(allRows.length>0){
    const pbBody=allRows.map(row=>{
      if(row.type==='header'){
        const ind=row.lv===1?'':row.lv===2?'  ':'    ';
        const bg=row.lv===1?PRI:row.lv===2?[12,30,60]:[8,22,45];
        const col=row.lv===1?WHITE:row.lv===2?ACC:EME;
        return[{content:ind+row.c,styles:{fontStyle:'bold',textColor:col,fillColor:bg}},
          {content:ind+row.d,colSpan:4,styles:{fontStyle:'bold',textColor:col,fillColor:bg,halign:'left'}},'','',''];
      }
      const ind=row.lv===3?'  ':'    ';
      return[ind+row.c,{content:ind+row.d,styles:{halign:'left'}},row.u,safe(row.q,2),fm(row.p),fm(row.t)];
    });
    autoTable(doc,{...tbl(PRI,isBW),startY:y,head:[['Código','Descripción','Und','Cant.','P.Unit. ($)','Total ($)']],body:pbBody,
      columnStyles:{0:{cellWidth:28},1:{cellWidth:100,halign:'left'},2:{cellWidth:14},3:{cellWidth:18,halign:'right'},4:{cellWidth:28,halign:'right'},5:{cellWidth:28,halign:'right'}},
      didParseCell:d=>{if(d.section==='body'&&d.column.index===5&&typeof d.cell.raw==='string'&&d.cell.raw.startsWith('$')){d.cell.styles.fontStyle='bold';d.cell.styles.textColor=AMB;}},
    });
    y=doc.lastAutoTable.finalY+7;
  }
  if(y>PAGE_H-50){doc.addPage();addFooter(doc,pg++,P,isBW);y=14;}
  y=addSection(doc,'9.1 Resumen de Costos',ACC,y,isBW);
  const resRows=[
    ['COSTO DIRECTO',fm(cdE),'â€”'],
    [`Administración (${((P.porcAdmin||0.29)*100).toFixed(0)}%)`,fm(adm),((adm/totE)*100).toFixed(1)+'%'],
    [`Imprevistos (${((P.porcImprevistos||0.01)*100).toFixed(0)}%)`,fm(imp),((imp/totE)*100).toFixed(1)+'%'],
    [`Utilidad (${((P.porcUtilidad||0.05)*100).toFixed(0)}%)`,fm(ut),((ut/totE)*100).toFixed(1)+'%'],
    [`IVA s/Utilidad (${((P.porcIVA||0.19)*100).toFixed(0)}%)`,fm(iva),((iva/totE)*100).toFixed(1)+'%'],
  ];
  if(interv>0)resRows.push([`Interventoría (${((P.porcInterventoria||0.08)*100).toFixed(0)}%)`,fm(interv),((interv/totE)*100).toFixed(1)+'%']);
  resRows.push([{content:'COSTO TOTAL DEL PROYECTO',styles:{fontStyle:'bold',textColor:WHITE,fillColor:PRI}},{content:fm(totE),styles:{fontStyle:'bold',textColor:AMB,fillColor:PRI}},{content:'100%',styles:{fontStyle:'bold',textColor:WHITE,fillColor:PRI}}]);
  autoTable(doc,{...tbl(ACC,isBW),startY:y,head:[['Componente','Valor ($)','% del Total']],body:resRows,
    columnStyles:{0:{cellWidth:110,halign:'left'},1:{cellWidth:65,halign:'right'},2:{cellWidth:40,halign:'center'}},
  });
  return pg;
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SEC 08 â€” CRONOGRAMA DE INVERSIONES
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function sec08_Cronograma(doc, P, R, pbItems, isBW, pg) {
  const { PRI, ACC, EME, AMB, WHITE } = pal(isBW);
  addFooter(doc, pg++, P, isBW); let y = 14;
  const m=P.tiempoObra||2;
  const mL=Array.from({length:m},(_,i)=>'M'+(i+1));
  const CNAMES={'1.01':'Vallas y señales','1.02':'Trabajos preliminares','1.03':'Rotura pavimentos','2.01':'Excavaciones zanja','2.04':'Entibados','2.05':'Rellenos','2.06':'Sobreacarreos','3.02':'Tuberías','4.01':'Concretos/Mampostería','4.06':'Acometidas','4.08':'Reparación pavimento','5.03':'Accesorios','5.05':'Ensayos','5.09':'Demarcación'};
  const CAPS=[{cod:'1.01',cap:0},{cod:'1.02',cap:0},{cod:'1.03',cap:0},{cod:'2.01',cap:1},{cod:'2.04',cap:1},{cod:'2.05',cap:1},{cod:'2.06',cap:1},{cod:'3.02',cap:2},{cod:'4.01',cap:3},{cod:'4.06',cap:3},{cod:'4.08',cap:3},{cod:'5.03',cap:4},{cod:'5.05',cap:4},{cod:'5.09',cap:4}];
  const CAP_NAMES=['1. PRELIMINARES','2. MOV. TIERRAS','3. TUBERÍAS','4. ESTRUCTURAS','5. VARIOS'];
  const CAP_COLORS=[[0,166,214],[212,168,67],[40,167,69],[240,147,43],[220,53,69]];
  const scCosts={};
  (pbItems||[]).forEach(it=>{if(it.lv>=3&&it.q>0&&it.p>0){const sc2=it.c.split('.').slice(0,2).join('.');scCosts[sc2]=(scCosts[sc2]||0)+Math.round(it.q*it.p);}});
  const subCaps=CAPS.map(sc=>({...sc,n:CNAMES[sc.cod]||sc.cod,costo:scCosts[sc.cod]||0}));
  const hasCosts=subCaps.some(sc=>sc.costo>0);
  const cData=subCaps.map(()=>Array.from({length:m},()=>Math.round(100/m)));
  const dN = R.filter(r => r.sep || r.reponer === 'S');
  const lt=dN.reduce((s,r)=>s+(r.L||0),0);
  let pbCd=0;(pbItems||[]).forEach(it=>{if(it.lv>=3&&it.q>0&&it.p>0)pbCd+=Math.round(it.q*it.p);});
  const cdE=pbCd>0?pbCd:Math.round(lt*5474000);
  const adm=Math.round(cdE*(P.porcAdmin||0.29));
  const imp=Math.round(cdE*(P.porcImprevistos||0.01));
  const ut=Math.round(cdE*(P.porcUtilidad||0.05));
  const iva=Math.round(ut*(P.porcIVA||0.19));
  const totE=cdE+adm+imp+ut+iva;
  const anticipo=P.anticipo||35;
  const mesCD=mL.map((_,mi)=>{let t=0;subCaps.forEach((sc,si)=>{const c=hasCosts?(sc.costo||0):Math.round(cdE/subCaps.length);t+=Math.round(c*cData[si][mi]/100);});return t;});
  const mesTot=mesCD.map(v=>{const a=Math.round(v*(P.porcAdmin||0.29));const i=Math.round(v*(P.porcImprevistos||0.01));const u=Math.round(v*(P.porcUtilidad||0.05));const iv=Math.round(u*(P.porcIVA||0.19));return v+a+i+u+iv;});
  const mesAntic=mesTot.map(v=>Math.round(v*anticipo/100));

  y=addSection(doc,`10. Cronograma de Inversiones â€” ${m} meses (distribución equitativa)`,PRI,y,isBW);
  const body=[];let prevCap=-1;
  subCaps.forEach((sc,si)=>{
    if(sc.cap!==prevCap){prevCap=sc.cap;const rgb=CAP_COLORS[sc.cap]||PRI;body.push([{content:CAP_NAMES[sc.cap],colSpan:m+3,styles:{fontStyle:'bold',textColor:WHITE,fillColor:rgb,halign:'left'}},...Array(m+2).fill('')]);}
    const row=[sc.cod,{content:hasCosts&&sc.costo>0?sc.n+' ('+fm(sc.costo)+')':sc.n,styles:{halign:'left'}}];
    let tot=0;cData[si].forEach(v=>{row.push(v+'%');tot+=v;});
    row.push({content:tot+'%',styles:{fontStyle:'bold',textColor:Math.abs(tot-100)<1?EME:[200,50,50]}});
    body.push(row.slice(0,m+3));
  });
  body.push([{content:'COSTO DIRECTO',colSpan:2,styles:{fontStyle:'bold',textColor:WHITE,fillColor:PRI,halign:'left'}},...mesCD.map(v=>({content:fm(v),styles:{textColor:WHITE,fillColor:PRI,fontSize:6}})),{content:fm(cdE),styles:{fontStyle:'bold',textColor:AMB,fillColor:PRI}}]);
  body.push([{content:'TOTAL C/AI&U',colSpan:2,styles:{fontStyle:'bold',textColor:AMB,fillColor:[0,30,70],halign:'left'}},...mesTot.map(v=>({content:fm(v),styles:{textColor:AMB,fillColor:[0,30,70],fontSize:6}})),{content:fm(totE),styles:{fontStyle:'bold',textColor:AMB,fillColor:[0,30,70]}}]);
  body.push([{content:`Anticipo ${anticipo}%`,colSpan:2,styles:{textColor:EME,fillColor:[10,40,20],halign:'left'}},...mesAntic.map(v=>({content:fm(v),styles:{textColor:EME,fillColor:[10,40,20],fontSize:6}})),'']);
  const cs={0:{cellWidth:15},1:{cellWidth:Math.max(40,Math.min(80,220-15-m*20)),halign:'left'}};
  autoTable(doc,{...tbl(PRI,isBW),startY:y,head:[['Cód','Descripción',...mL,'Total']],body,columnStyles:cs});
  return pg;
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SEC 09 â€” GLOSARIO
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function sec09_Glosario(doc, P, isBW, pg) {
  const { PRI, ACC } = pal(isBW);
  addFooter(doc, pg++, P, isBW); let y=14;
  y=addSection(doc,'11. Glosario de Abreviaturas y Términos Técnicos',ACC,y,isBW);
  const G=[
    ['#','NÂ° de orden del tramo'],['DE / A','Nodo inicio / llegada del tramo'],
    ['L (m)','Longitud del tramo en metros'],['S (%)','Pendiente hidráulica (%)'],
    ['Diam. Nvo (mm)','Diámetro nuevo de diseño (mm)'],['Mat. Nvo','Material nuevo (PVC, PEAD, GR, HF)'],
    ['Diam. Ant (mm)','Diámetro original existente (dato de entrada)'],['Mat. Ant','Material original existente'],
    ['Q.San (L/s)','Caudal sanitario de diseño'],['Q.Pl (L/s)','Caudal pluvial â€” método racional'],
    ['Q.Dis (L/s)','Caudal de diseño total'],['Q.Lle / Qo (L/s)','Caudal a tubo lleno (cap. máxima)'],
    ['Q/Qo (%)','Relación caudal/tubo lleno (debe â‰¤ relCapacidad)'],['Y/Do (%)','Relación tirante/diámetro'],
    ['V (m/s)','Velocidad media de flujo'],['Ft (Pa)','Fuerza tractiva (mín. 1.0â€“1.5 Pa RAS)'],
    ['Fr','Número de Froude â€” Fr<1: subcrítico; Fr>1: supercrítico'],['Rep.','S=reponer, N=no reponer'],
    ['PZN','S=pozo nuevo, N=pozo existente'],['Tipo Pozo','M=mampostería, C=concreto'],
    ['Vía','FX=flexible, RD=rígido, AD=andén, PP=piedra, AQ=adoquín, PT=pasto, TI=tierra'],
    ['n Manning','Coeficiente de rugosidad para Manning'],['PVC','Policloruro de Vinilo'],
    ['PEAD','Polietileno de Alta Densidad'],['GR','Gres â€” cerámica vidriada'],['HF','Hierro Fundido dúctil'],
    ['CD','Costo Directo â€” suma de ítems de obra'],['AI&U','Administración, Imprevistos y Utilidad'],
    ['IVA','Impuesto al Valor Agregado sobre la utilidad'],['SL','Sumidero Lateral'],['ST','Sumidero de Transición'],
    ['Cim.','Cimentación del sumidero (mÂ³ concreto en base)'],['RAS 330/17','Reglamento Técnico Sector Agua (Título D)'],
    ['IDF','Curva Intensidad-Duración-Frecuencia'],['msnm','Metros sobre el nivel del mar'],
    ['Bz','Berma de zanja (m)'],['H.Pav','Espesor de pavimento sobre zanja (m)'],
    ['Prof.E / Prof.S','Profundidad de excavación en inicio / final del tramo'],
    ['Vol.Exc','Volumen de excavación de zanja (mÂ³)'],['Rot.Pav','Rotura de pavimento (mÂ²)'],
    ['Rep.Pav','Reposición de pavimento (mÂ²)'],['DI Ext.','Diámetro interior del pozo (m)'],
  ];
  const mid=Math.ceil(G.length/2);
  const col1=G.slice(0,mid),col2=G.slice(mid);
  const rows=[];
  for(let i=0;i<Math.max(col1.length,col2.length);i++){
    const l=col1[i]||['',''];const r=col2[i]||['',''];
    rows.push([{content:l[0],styles:{fontStyle:'bold',textColor:ACC,halign:'center'}},{content:l[1],styles:{halign:'left'}},
               {content:r[0],styles:{fontStyle:'bold',textColor:ACC,halign:'center'}},{content:r[1],styles:{halign:'left'}}]);
  }
  autoTable(doc,{...tbl(ACC,isBW),startY:y,head:[['Abrev.','Descripción','Abrev.','Descripción']],body:rows,
    columnStyles:{0:{cellWidth:24},1:{cellWidth:108},2:{cellWidth:24},3:{cellWidth:108}},
  });
  return pg;
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   ORQUESTADOR PRINCIPAL
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const SECTIONS = [
  {id:'01',name:'Formulario',      fn:(doc,P,R,T,sL,sT,pb,isBW,pg)=>sec01_Formulario(doc,P,R,isBW,pg)},
  {id:'02',name:'DisenoHidra',     fn:(doc,P,R,T,sL,sT,pb,isBW,pg)=>sec02_DisenoHidra(doc,P,R,isBW,pg)},
  {id:'03',name:'Excavaciones',    fn:(doc,P,R,T,sL,sT,pb,isBW,pg)=>sec03_Excavaciones(doc,P,R,isBW,pg)},
  {id:'04',name:'Pozos',           fn:(doc,P,R,T,sL,sT,pb,isBW,pg)=>sec04_Pozos(doc,P,R,isBW,pg)},
  {id:'05',name:'Tuberias',        fn:(doc,P,R,T,sL,sT,pb,isBW,pg)=>sec05_Tuberias(doc,P,R,isBW,pg)},
  {id:'06',name:'Sumideros',       fn:(doc,P,R,T,sL,sT,pb,isBW,pg)=>sec06_Sumideros(doc,P,R,sL,sT,isBW,pg)},
  {id:'07',name:'Presupuesto',     fn:(doc,P,R,T,sL,sT,pb,isBW,pg)=>sec07_Presupuesto(doc,P,R,pb,isBW,pg)},
  {id:'08',name:'Cronograma',      fn:(doc,P,R,T,sL,sT,pb,isBW,pg)=>sec08_Cronograma(doc,P,R,pb,isBW,pg)},
  {id:'09',name:'Glosario',        fn:(doc,P,R,T,sL,sT,pb,isBW,pg)=>sec09_Glosario(doc,P,isBW,pg)},
];

export async function exportAllReports(P, R, T, sumLat, sumTrans, pbItems, mode, isBW) {
  if (!R || R.length === 0) {
    alert('âš ï¸ Primero calcule la red (pestaña Cálculos) para generar los reportes.');
    return;
  }
  const b = sanitize(P);
  const color = isBW ? 'BN' : 'Color';

  if (mode === 'individual') {
    for (let i = 0; i < SECTIONS.length; i++) {
      const s = SECTIONS[i];
      const doc = mkDoc();
      const label = s.name.replace(/([A-Z])/g,' $1').trim();
      addCover(doc, P, label, i+1, SECTIONS.length, isBW);
      doc.addPage();
      s.fn(doc, P, R, T, sumLat, sumTrans, pbItems, isBW, 2);
      await sleep(500);
      doc.save(`${s.id}_${s.name}_${b}_${color}.pdf`);
    }
    setTimeout(()=>alert(`âœ… ${SECTIONS.length} reportes PDF descargados individualmente.\nNombre: [NN]_[Sección]_${b}_${color}.pdf`),300);
  } else {
    // Consolidated
    const doc = mkDoc();
    addCover(doc, P, 'Reporte Completo de Ingeniería', 0, SECTIONS.length, isBW);
    // TOC page
    doc.addPage();
    addFooter(doc, 1, P, isBW);
    const { PRI, ACC, AMB, WHITE } = pal(isBW);
    let y=14;
    y=addSection(doc,'Tabla de Contenido / Índice del Reporte',PRI,y,isBW);
    autoTable(doc,{...tbl(PRI,isBW),startY:y,head:[['NÂ°','Sección','Descripción']],
      body:SECTIONS.map((s,i)=>[s.id,s.name.replace(/([A-Z])/g,' $1').trim(),`Sección ${i+1} de ${SECTIONS.length}`]),
      columnStyles:{0:{cellWidth:15,halign:'center'},1:{cellWidth:60,halign:'left'},2:{cellWidth:100,halign:'left'}},
    });
    let pg=2;
    for(let i=0;i<SECTIONS.length;i++){
      const s=SECTIONS[i];
      doc.addPage();
      addCover(doc,P,s.name.replace(/([A-Z])/g,' $1').trim(),i+1,SECTIONS.length,isBW);
      doc.addPage();
      pg+=2;
      pg=s.fn(doc,P,R,T,sumLat,sumTrans,pbItems,isBW,pg);
    }
    doc.save(`AMCPro_ReporteCompleto_${b}_${color}.pdf`);
    setTimeout(()=>alert(`âœ… Reporte consolidado generado:\nAMCPro_ReporteCompleto_${b}_${color}.pdf`),300);
  }
}
