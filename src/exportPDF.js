import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {fm} from './ui';
import { calcCantSumidero, agruparTuberias, calcPozosCompleto } from './calcHelpers';

/* ─────────────────────────────────────────────────────────
   AMCaudales Pro · Generador de Reporte PDF  v3.0
   ───────────────────────────────────────────────────────── */

// Safe number → formatted string. Avoids NaN/undefined display.
function safe(v, dec = 2) {
  var n = parseFloat(v);
  if (isNaN(n) || !isFinite(n)) return '-';
  return n.toFixed(dec);
}

export function exportPDF(P, R, T, sumLat, sumTrans, pbItems, isBW = false) {
  var dR  = R.filter(r => !r.sep);
  var dN  = dR.filter(r => r.reponer === 'S');
  var lt  = dN.reduce((s, r) => s + (r.L || 0), 0);

  // Área real calculada desde los tramos
  var areaTotalHa = dN.reduce((s, r) => s + (parseFloat(r.areaParcial) || 0), 0);
  if (areaTotalHa === 0 && P.areaTotal) areaTotalHa = parseFloat(P.areaTotal) || 0;

  /* ── Presupuesto: incluir TODOS los ítems (headers + líneas) ── */
  var pbCd = 0;
  var allPbRows = []; // para la tabla jerárquica
  if (pbItems && pbItems.length > 0) {
    pbItems.forEach(it => {
      if (it.lv >= 3 && it.q > 0 && it.p > 0) {
        var t = Math.round(it.q * it.p);
        pbCd += t;
        allPbRows.push({ type: 'item', lv: it.lv, c: it.c, d: it.d, u: it.u, q: it.q, p: it.p, t });
      } else if (it.lv < 3) {
        allPbRows.push({ type: 'header', lv: it.lv, c: it.c, d: it.d });
      }
    });
  }

  var cdE   = pbCd > 0 ? pbCd : Math.round(lt * 5474000);
  var adm   = Math.round(cdE * (P.porcAdmin       || 0.29));
  var imp   = Math.round(cdE * (P.porcImprevistos || 0.01));
  var ut    = Math.round(cdE * (P.porcUtilidad    || 0.05));
  var iva   = Math.round(ut  * (P.porcIVA         || 0.19));
  var interv = (P.reqInterventoria !== "N" && P.reqInterventoria !== false)
    ? Math.round((cdE + adm + imp + ut + iva) * (P.porcInterventoria || 0.08))
    : 0;
  var totE  = cdE + adm + imp + ut + iva + interv;

  /* ── Paleta ── */
  const DARK  = isBW ? [40,  40,  40]  : [3,  11,  30];
  const PRI   = isBW ? [60,  60,  60]  : [0,  59, 115];
  const ACC   = isBW ? [120,120, 120]  : [0, 166, 214];
  const EME   = isBW ? [100,100, 100]  : [16, 185, 129];
  const AMB   = isBW ? [130,130, 130]  : [217, 119,  6];
  const ALT   = isBW ? [245,245, 245]  : [240, 248, 255];
  const WHITE = [255, 255, 255];
  const BODY_TEXT = [20, 20, 20];

  const PAGE_W = 297;
  const MARGIN = 12;

  const doc = new jsPDF('landscape', 'mm', 'a4');

  /* ── Helper: wrap text en ancho ── */
  function wrapText(text, maxWidth, fontSize) {
    doc.setFontSize(fontSize);
    var lines = doc.splitTextToSize(String(text || ''), maxWidth);
    return lines;
  }

  /* ── Helper: pie de página ── */
  function addFooter(pg) {
    doc.setFillColor(...PRI);
    doc.rect(0, 203, PAGE_W, 7, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'normal');
    var proyecto = String(P.proyecto || '');
    if (proyecto.length > 80) proyecto = proyecto.substring(0, 77) + '...';
    doc.text('AMCaudales Pro  |  ' + proyecto, MARGIN, 207);
    doc.text('Diseñador: ' + (P.disenador || '-'), PAGE_W / 2, 207, { align: 'center' });
    doc.text('Pág. ' + pg, PAGE_W - MARGIN, 207, { align: 'right' });
  }

  /* ── Helper: banda de sección ── */
  function addSection(title, colorBand, y) {
    doc.setFillColor(colorBand[0], colorBand[1], colorBand[2]);
    doc.roundedRect(MARGIN, y, PAGE_W - MARGIN * 2, 10, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...WHITE);
    doc.text(title.toUpperCase(), MARGIN + 4, y + 7);
    return y + 14;
  }

  /* ── Helper: tabla defaults ── */
  function tbl(headColor) {
    return {
      theme: 'grid',
      headStyles: { fillColor: headColor, textColor: WHITE, fontStyle: 'bold', fontSize: 8, halign: 'center', cellPadding: 2 },
      alternateRowStyles: { fillColor: ALT },
      styles: { fontSize: 7.5, halign: 'center', textColor: BODY_TEXT, cellPadding: 1.8, overflow: 'linebreak' },
      margin: { left: MARGIN, right: MARGIN },
    };
  }

  /* ══════════════════════════════════════════════════════
     PORTADA
     ══════════════════════════════════════════════════════ */
  doc.setFillColor(...DARK);
  doc.rect(0, 0, PAGE_W, 210, 'F');
  doc.setFillColor(...ACC);
  doc.rect(0, 0, PAGE_W, 7, 'F');
  doc.setFillColor(...PRI);
  doc.rect(0, 203, PAGE_W, 7, 'F');

  // Logo
  doc.setFontSize(44); doc.setFont('helvetica', 'bold'); doc.setTextColor(...ACC);
  doc.text('AMC', 20, 78);
  doc.setFontSize(18); doc.setTextColor(...EME);
  doc.text('Pro', 74, 78);

  doc.setDrawColor(...ACC); doc.setLineWidth(0.5);
  doc.line(108, 35, 108, 175);

  // Título
  doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(...WHITE);
  doc.text('DISEÑO DE SISTEMA DE', 116, 65);
  doc.text('ALCANTARILLADO', 116, 78);
  doc.setFontSize(12); doc.setTextColor(...ACC);
  doc.text('Reporte General de Ingeniería', 116, 88);

  doc.setDrawColor(...ACC); doc.setLineWidth(0.3);
  doc.line(116, 93, PAGE_W - 10, 93);

  // Datos proyecto — con wrap
  const info = [
    ['Proyecto',  P.proyecto   || 'Sin definir'],
    ['Diseñador', P.disenador  || 'Sin definir'],
    ['Empresa',   P.empresa    || 'Sin definir'],
    ['Municipio', P.municipio  || 'Sin definir'],
    ['Estación',  P.estacion   || 'Sin definir'],
    ['Fecha',     P.fecha      || new Date().toLocaleDateString('es-CO')],
  ];
  let iy = 102;
  info.forEach(([label, val]) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...ACC);
    doc.text(label + ':', 116, iy);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...WHITE);
    var lines = wrapText(val, 155, 9);
    doc.text(lines, 148, iy);
    iy += lines.length > 1 ? 11 : 8;
  });

  // KPIs
  const kpis = [
    { label: 'TRAMOS',   value: String(dR.length),     color: ACC },
    { label: 'LONG (M)', value: lt.toFixed(0),          color: EME },
    { label: 'PRESUP.',  value: fm(totE),               color: AMB },
  ];
  let kx = 116;
  kpis.forEach(kpi => {
    doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.roundedRect(kx, 175, 52, 22, 3, 3, 'F');
    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...WHITE);
    doc.text(kpi.label, kx + 4, 181);
    doc.setFontSize(kpi.label === 'PRESUP.' ? 9 : 13);
    doc.text(String(kpi.value), kx + 4, 191);
    kx += 57;
  });

  /* ══════════════════════════════════════════════════════
     PÁG 2 · Resumen General + Parámetros
     ══════════════════════════════════════════════════════ */
  doc.addPage(); addFooter(2);
  let y = 14;
  y = addSection('1. Resumen General del Proyecto', PRI, y);

  const dashRows = [
    ['Longitud Red (m)', lt.toFixed(2), 'Tramos Totales', dR.length, 'Tramos a Reponer', dN.length],
    ['Área Total Cuencas (Ha)', areaTotalHa.toFixed(4), 'N° Pozos', dN.length + 1, 'Diseñador', P.disenador || '-'],
    ['Costo Directo', fm(cdE), 'IVA + Adm + Impr.', fm(adm+imp+iva), 'Costo Total', fm(totE)],
  ];
  autoTable(doc, { ...tbl(PRI), startY: y,
    head: [['Indicador', 'Valor', 'Indicador', 'Valor', 'Indicador', 'Valor']],
    body: dashRows,
    columnStyles: { 0:{fontStyle:'bold',textColor:PRI,halign:'left'}, 2:{fontStyle:'bold',textColor:PRI,halign:'left'}, 4:{fontStyle:'bold',textColor:PRI,halign:'left'} },
  });

  y = doc.lastAutoTable.finalY + 10;
  y = addSection('2. Parámetros de Diseño Hidráulico', ACC, y);

  const parRows = [
    ['Estación IDF', P.estacion || '-', 'Período Retorno (a)', P.periodoRetorno || 10, 'n Manning', P.nManning || 0.013],
    ['Vel. Mín. (m/s)', P.velMinima || 0.45, 'Vel. Máx. (m/s)', P.velMaxima || 5.0, 'Ft Mín. (Pa)', P.fuerzaTractMin || 1.5],
    ['Rel. Q/Qo máx.', P.relCapacidad || 0.85, 'Coef. Retorno', P.coefRetorno || 0.85, 'Prof. Mín. (m)', P.profMinimaZanja || 1.0],
    ['Tipo Sistema', P.tipoSistema || 'Sanitario', 'Período Diseño (a)', P.periodoDisenio || 25, 'Densidad (hab/Ha)', P.densidad || 600],
  ];
  autoTable(doc, { ...tbl(ACC), startY: y,
    head: [['Parámetro', 'Valor', 'Parámetro', 'Valor', 'Parámetro', 'Valor']],
    body: parRows,
    columnStyles: { 0:{fontStyle:'bold',textColor:PRI,halign:'left'}, 2:{fontStyle:'bold',textColor:PRI,halign:'left'}, 4:{fontStyle:'bold',textColor:PRI,halign:'left'} },
  });

  /* ══════════════════════════════════════════════════════
     PÁG 3 · Reporte de Diseño Hidráulico
     ══════════════════════════════════════════════════════ */
  doc.addPage(); addFooter(3);
  y = 14;
  y = addSection('3. Reporte de Diseño Hidráulico por Tramo', PRI, y);

  // Col indices: 0=#, 1=DE, 2=A, 3=L, 4=S, 5=Diam, 6=Mat, 7=Diam.Ant, 8=Mat.Ant, 9=Q.San, 10=Q.Pl, 11=Q.Dis, 12=Q.Lle, 13=Q/Qo, 14=Y/Do, 15=V, 16=Ft, 17=Fr, 18=Rep.
  const designHead = [['#', 'DE', 'A', 'L\n(m)', 'S\n(%)', 'Diam\nNuevo\n(mm)', 'Mat.\nNuevo', 'Diam.\nAnt.\n(mm)', 'Mat.\nAnt.', 'Q.San\n(L/s)', 'Q.Pl\n(L/s)', 'Q.Dis\n(L/s)', 'Q.Lle\n(L/s)', 'Q/Qo\n(%)', 'Y/Do\n(%)', 'V\n(m/s)', 'Ft\n(Pa)', 'Fr', 'Rep.']];
  const designRows = dR.map((r, i) => [
    i + 1, r.de || '', r.a || '',
    safe(r.L, 1), safe(r.S, 3),
    r.nom || (r.D ? Math.round(r.D*1000) : '-'),
    r.mat || '-',
    r.diamOrig || r.diametroCom || '-',
    r.matOrig || r.material || '-',
    safe(r.Qsan, 2), safe(r.Qpluv, 2), safe(r.Qd, 2), safe(r.Qo, 2),
    safe(r.QQo, 1), safe(r.YDo, 1),
    safe(r.V, 3), safe(r.Ft, 2), safe(r.Froude, 3),
    r.reponer || 'N',
  ]);

  autoTable(doc, { ...tbl(PRI), startY: y, head: designHead, body: designRows,
    columnStyles: {
      0: { cellWidth: 6 },
      1: { cellWidth: 15, halign: 'left' },
      2: { cellWidth: 15, halign: 'left' },
      5: { cellWidth: 14 },
      6: { cellWidth: 10 },
      7: { cellWidth: 14, textColor: AMB },
      8: { cellWidth: 10, textColor: AMB },
      18: { cellWidth: 8 },
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        if (data.column.index === 18) { data.cell.styles.textColor = data.cell.raw === 'S' ? EME : [200,50,50]; data.cell.styles.fontStyle = 'bold'; }
        if (data.column.index === 17) { // Froude > 1 = supercrítico → rojo
          var fr = parseFloat(data.cell.raw);
          if (!isNaN(fr) && fr > 1) data.cell.styles.textColor = [200, 50, 50];
        }
        // Diám. Ant y Mat Ant en color ámbar para distinguirlos
        if (data.column.index === 7 || data.column.index === 8) {
          data.cell.styles.textColor = data.cell.raw === '-' ? [160,160,160] : AMB;
        }
      }
    },
  });

  /* ══════════════════════════════════════════════════════
     PÁG 4 · Excavaciones y Zanjas
     ══════════════════════════════════════════════════════ */
  doc.addPage(); addFooter(4);
  y = 14;
  y = addSection('4. Cantidades de Obra — Excavaciones y Zanjas', EME, y);

  var totVolE=0, totRotP=0, totRepP=0;
  const excaRows = dN.map((r, i) => {
    totVolE += r.volE || 0; totRotP += r.rotP || 0; totRepP += r.repP || 0;
    return [i+1, r.de||'', r.a||'', safe(r.L,1), r.nom||(r.D?Math.round(r.D*1000):'-'),
      safe(r.bz,3), safe(r.HP,2), safe(r.profE,2), safe(r.profS,2),
      safe(r.volE,2), safe(r.rotP,2), safe(r.repP,2)];
  });
  autoTable(doc, { ...tbl(EME), startY: y,
    head: [['#','DE','A','Long\n(m)','Diam\n(mm)','B-Zanja\n(m)','HP Prom\n(m)','Prof.E\n(m)','Prof.S\n(m)','Vol.Exc\n(m³)','Rot.Pav\n(m²)','Rep.Pav\n(m²)']],
    body: excaRows,
    foot: [['','','TOTALES', safe(lt,1),'','','','','', safe(totVolE,2), safe(totRotP,2), safe(totRepP,2)]],
    footStyles: { fillColor: EME, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    columnStyles: { 1:{halign:'left'}, 2:{halign:'left'} },
  });

  /* ══════════════════════════════════════════════════════
     PÁG 5 · Pozos y Estructuras
     ══════════════════════════════════════════════════════ */
  doc.addPage(); addFooter(5);
  y = 14;
  y = addSection('5. Cantidades de Obra — Pozos y Estructuras', PRI, y);

  var pozDataObj = calcPozosCompleto(R, T);
  var pzRows = [];
  var totPP=0, totConcP=0, totExcP=0, totPDR=0, totA37=0;
  if (pozDataObj && pozDataObj.pz) {
    pozDataObj.pz.forEach((p, i) => {
      totPP += p.prof||0; totConcP += p.volConc||0; totExcP += p.volExc||0; totPDR += p.pdr60||0; totA37 += p.a37||0;
      pzRows.push([i+1, p.nodo||'', safe(p.prof,2), p.tipoPozo||'M',
        safe(p.hConc,2), safe(p.volConc,2), safe(p.volExc,2), safe(p.pdr60,1), safe(p.a37,1)]);
    });
  }
  autoTable(doc, { ...tbl(PRI), startY: y,
    head: [['#','Pozo','Prof\n(m)','Tipo\n(M/C)','h.Conc\n(m)','Conc.\n(m³)','Exc.\n(m³)','PDR-60\n(kg)','A-37\n(kg)']],
    body: pzRows,
    foot: [['','TOTALES', safe(totPP,2),'','', safe(totConcP,2), safe(totExcP,2), safe(totPDR,1), safe(totA37,1)]],
    footStyles: { fillColor: PRI, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    columnStyles: { 1:{halign:'left'} },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 8) {
        data.cell.styles.textColor = data.cell.raw === 'S' ? EME : [200,50,50];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  /* ══════════════════════════════════════════════════════
     PÁG 6 · Tuberías
     ══════════════════════════════════════════════════════ */
  doc.addPage(); addFooter(6);
  y = 14;
  y = addSection('6. Cantidades de Obra — Tuberías por Diámetro', ACC, y);

  var grp = agruparTuberias(R, sumLat, sumTrans, P);
  var tubRows = grp.map((g, i) => [
    i+1, g.nom||'', 'PVC/PEAD',
    safe(g.red||0,2), safe(g.sum||0,2), safe(g.acom||0,2),
    safe((g.red||0)+(g.sum||0),2),
  ]);
  autoTable(doc, { ...tbl(ACC), startY: y,
    head: [['#', 'Diámetro', 'Material', 'Red Principal (m)', 'Sumideros (m)', 'Acometidas (m)', 'TOTAL (m)']],
    body: tubRows,
    foot: [[
      { content: 'TOTALES', colSpan: 3, styles: { halign: 'right' } },
      safe(grp.reduce((s,g)=>s+(g.red||0),0),2),
      safe(grp.reduce((s,g)=>s+(g.sum||0),0),2),
      safe(grp.reduce((s,g)=>s+(g.acom||0),0),2),
      safe(grp.reduce((s,g)=>s+(g.red||0)+(g.sum||0),0),2),
    ]],
    footStyles: { fillColor: ACC, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
  });

  /* ══════════════════════════════════════════════════════
     PÁG 7 · Sumideros (solo si hay)
     ══════════════════════════════════════════════════════ */
  var sumRows = [];
  if (sumLat) sumLat.forEach((f, i) => { if ((f.cant||0) > 0) { var c = calcCantSumidero(f); sumRows.push(['L-'+(i+1), f.cant, f.tipo||'-', f.diam||'-', f.pozo||'-', safe(c.totExc,2), safe(c.cim,2), safe(c.rell,2), safe(c.cp,2), safe(c.a37,1)]); }});
  if (sumTrans) sumTrans.forEach((f, i) => { if ((f.cant||0) > 0) { var c = calcCantSumidero(f); sumRows.push(['T-'+(i+1), f.cant, f.tipo||'-', f.diam||'-', f.pozo||'-', safe(c.totExc,2), safe(c.cim,2), safe(c.rell,2), safe(c.cp,2), safe(c.a37,1)]); }});

  if (sumRows.length > 0) {
    doc.addPage(); addFooter(7);
    y = 14;
    y = addSection('7. Cantidades de Obra — Sumideros', AMB, y);
    autoTable(doc, { ...tbl(AMB), startY: y,
      head: [['ID','Cant.','Tipo','Diam.\n(mm)','Pozo','Exc.Total\n(m³)','Cim.\n(m³)','Rell.\n(m³)','C.Pob.\n(m³)','A-37\n(m²)']],
      body: sumRows,
    });
  }

  /* ══════════════════════════════════════════════════════
     PÁG 8 · Presupuesto Detallado CON JERARQUÍA
     ══════════════════════════════════════════════════════ */
  doc.addPage(); addFooter(8);
  y = 14;
  y = addSection('8. Presupuesto Detallado de Obra', PRI, y);

  if (allPbRows.length > 0) {
    const preBody = [];
    allPbRows.forEach(row => {
      if (row.type === 'header') {
        preBody.push({
          content: '',
          isHeader: true,
          lv: row.lv,
          c: row.c,
          d: row.d,
        });
      } else {
        preBody.push([
          row.c || '', row.d || '', row.u || '',
          safe(row.q, 2), fm(row.p), fm(row.t),
        ]);
      }
    });

    // Build table body: convert headers to styled rows
    const tableBody = preBody.map(row => {
      if (row.content !== undefined) {
        // It's a header
        return [{ content: (row.c ? row.c + '  ' : '') + (row.d || ''), colSpan: 6,
          styles: {
            fillColor: row.lv === 1 ? PRI : row.lv === 2 ? [0, 90, 160] : [30, 130, 200],
            textColor: WHITE, fontStyle: 'bold', fontSize: row.lv === 1 ? 9 : 8,
            cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
          }}];
      }
      return row;
    });

    autoTable(doc, { ...tbl(PRI), startY: y,
      head: [['Código','Descripción del Ítem','Und.','Cantidad','Vr. Unitario','Vr. Total']],
      body: tableBody,
      foot: [['','TOTAL COSTO DIRECTO DE OBRA','','','', fm(cdE)]],
      footStyles: { fillColor: EME, textColor: WHITE, fontStyle: 'bold', fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 22, halign: 'center' },
        1: { cellWidth: 'auto', halign: 'left' },
        2: { cellWidth: 14, halign: 'center' },
        3: { cellWidth: 18, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' },
        5: { cellWidth: 30, halign: 'right' },
      },
    });
  } else {
    doc.setFontSize(10); doc.setTextColor(100,100,100);
    doc.text('No hay ítems de presupuesto con cantidades definidas.', MARGIN, y + 8);
  }

  /* ══════════════════════════════════════════════════════
     PÁG 9 · Resumen de Costos
     ══════════════════════════════════════════════════════ */
  doc.addPage(); addFooter(9);
  y = 14;
  y = addSection('9. Resumen de Costos — Cierre Presupuestal', PRI, y);

  const costRows = [
    ['1', 'Costo Directo de Obra (CD)', fm(cdE), '100.0 %'],
    ['2', `Administración (${((P.porcAdmin||0.29)*100).toFixed(0)} %)`, fm(adm), `${((adm/cdE)||0)*100 > 0 ? ((adm/cdE)*100).toFixed(1) : '-'} %`],
    ['3', `Imprevistos (${((P.porcImprevistos||0.01)*100).toFixed(0)} %)`, fm(imp), `${((imp/cdE)||0)*100 > 0 ? ((imp/cdE)*100).toFixed(1) : '-'} %`],
    ['4', `Utilidad (${((P.porcUtilidad||0.05)*100).toFixed(0)} %)`, fm(ut), `${((ut/cdE)||0)*100 > 0 ? ((ut/cdE)*100).toFixed(1) : '-'} %`],
    ['5', `IVA sobre Utilidad (${((P.porcIVA||0.19)*100).toFixed(0)} %)`, fm(iva), `${((iva/cdE)||0)*100 > 0 ? ((iva/cdE)*100).toFixed(1) : '-'} %`],
  ];
  if (interv > 0) costRows.push(['6', `Interventoría (${((P.porcInterventoria||0.08)*100).toFixed(0)} %)`, fm(interv), `${((interv/cdE)*100).toFixed(1)} %`]);

  autoTable(doc, { ...tbl(PRI), startY: y,
    head: [['Ítem','Concepto','Valor','% s/CD']],
    body: costRows,
    foot: [['','COSTO TOTAL DEL PROYECTO', fm(totE), `${((totE/cdE-1)*100).toFixed(1)} % s/CD`]],
    footStyles: { fillColor: EME, textColor: WHITE, fontStyle: 'bold', fontSize: 9 },
    columnStyles: { 0:{cellWidth:10,halign:'center'}, 1:{cellWidth:120,halign:'left',fontStyle:'bold'}, 2:{cellWidth:50,halign:'right'}, 3:{cellWidth:25,halign:'center'} },
  });

  // Nota
  var noteY = doc.lastAutoTable.finalY + 8;
  doc.setDrawColor(...ACC); doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, noteY, PAGE_W - MARGIN*2, 16, 2, 2);
  doc.setFontSize(8); doc.setTextColor(...PRI); doc.setFont('helvetica', 'bold');
  doc.text('NOTA:', MARGIN + 4, noteY + 6);
  doc.setFont('helvetica', 'normal'); doc.setTextColor(80,80,80);
  var note = 'Los valores presentados son estimaciones para efectos de diseño y planeación. Los precios finales deben validarse con cotizaciones actualizadas al momento de la contratación. Elaborado con AMCaudales Pro.';
  doc.text(doc.splitTextToSize(note, PAGE_W - MARGIN*2 - 20), MARGIN + 4, noteY + 11);

  /* ══════════════════════════════════════════════════════
     PÁG 10 · GLOSARIO DE ABREVIATURAS
     ══════════════════════════════════════════════════════ */
  doc.addPage(); addFooter(10);
  y = 14;
  y = addSection('10. Glosario de Abreviaturas y Simbología', PRI, y);

  const glossary = [
    // Diseño Hidráulico
    ['DE / A', 'Nodo de inicio / nodo de llegada del tramo'],
    ['L (m)', 'Longitud del tramo en metros'],
    ['S (%)', 'Pendiente hidráulica del tramo en porcentaje'],
    ['Diam. Nuevo (mm)', 'Diámetro comercial de la tubería nueva de diseño en milímetros'],
    ['Mat. Nuevo', 'Material de la tubería nueva de diseño (PVC, PEAD, GR, HF, etc.)'],
    ['Diam. Ant. (mm)', 'Diámetro original de la tubería existente antes del proyecto (dato de entrada)'],
    ['Mat. Ant.', 'Material original de la tubería existente antes de la reposición (dato de entrada)'],
    ['Q.San (L/s)', 'Caudal sanitario de diseño (aguas residuales domésticas)'],
    ['Q.Pl (L/s)', 'Caudal pluvial de diseño (aguas lluvias por el método racional)'],
    ['Q.Dis (L/s)', 'Caudal de diseño total que debe conducir el tramo'],
    ['Q.Lle (L/s)', 'Caudal a tubo lleno (capacidad máxima a sección plena)'],
    ['Q/Qo (%)', 'Relación entre el caudal de diseño y el caudal a tubo lleno. Max. recomendado: 85%'],
    ['Y/Do (%)', 'Tirante hidráulico relativo (lámina de agua / diámetro). Max. recomendado: 85%'],
    ['V (m/s)', 'Velocidad media del flujo en el tramo bajo condiciones de diseño'],
    ['Ft (Pa)', 'Fuerza tractiva o tensión de arrastre. Mínimo recomendado: 1.5 Pa'],
    ['Fr', 'Número de Froude. Fr < 1: flujo subcrítico (correcto); Fr > 1: flujo supercrítico'],
    ['Rep.', 'Indica si el tramo se va a reponer (S = Sí, N = No)'],
    // Pozos
    ['Prof. (m)', 'Profundidad del pozo o caja de inspección desde la tapa hasta el fondo'],
    ['Tipo M/C', 'Tipo de pozo: M = Mampostería, C = Concreto prefabricado'],
    ['h.Conc (m)', 'Altura de la base cónica o de concretado del pozo'],
    ['Conc. (m³)', 'Volumen de concreto de la cimentación y base del pozo'],
    ['Exc. (m³)', 'Volumen de excavación requerido para construir el pozo'],
    ['Acero (kg)', 'Peso de acero de refuerzo necesario para el pozo'],
    ['Nuevo (S/N)', 'Indica si el pozo debe construirse nuevo (S) o es un pozo existente (N)'],
    // Zanjas
    ['B-Zanja (m)', 'Ancho de zanja de excavación para instalación de la tubería'],
    ['HP Prom. (m)', 'Altura promedio de zanja entre el extremo inicio y extremo llegada'],
    ['Prof.E / Prof.S', 'Profundidad al inicio (E) y al final/salida (S) del tramo'],
    ['Vol.Exc (m³)', 'Volumen total de excavación para la zanja del tramo'],
    ['Rot.Pav (m²)', 'Área de pavimento existente que debe rotarse (levantarse y removerse)'],
    ['Rep.Pav (m²)', 'Área de pavimento que debe reponerse al finalizar la obra'],
    // Sumideros
    ['SL-200/400/600', 'Sumidero Lateral de 200, 400 o 600 mm de ancho de captación'],
    ['ST-40 / ST2-40', 'Sumidero Transversal de 40 cm de ancho, sencillo o doble'],
    ['Cim. (m³)', 'Volumen de cimentación de concreto del sumidero'],
    ['Exc.Total (m³)', 'Excavación total del sumidero (cimentación + cuerpo + cajilla)'],
    ['Rell. (m³)', 'Volumen de relleno granular compactado alrededor del sumidero'],
    ['C.Pob. (m³)', 'Concreto pobre de limpieza bajo la cimentación'],
    ['A-37 (m²)', 'Área de acero inoxidable A-37 de la reja de captación del sumidero'],
    // Vías y tipos
    ['FX', 'Vía flexible (pavimento asfáltico)'],
    ['RG', 'Vía en Rígido (losa de concreto)'],
    ['AT', 'Vía en adoquín o tratamiento superficial'],
    ['TL', 'Vía en tierra (sin pavimento)'],
  ];

  // Dos columnas de glosario
  const half = Math.ceil(glossary.length / 2);
  const col1 = glossary.slice(0, half);
  const col2 = glossary.slice(half);
  const glossBody = col1.map((row, i) => {
    const r2 = col2[i] || ['', ''];
    return [row[0], row[1], r2[0], r2[1]];
  });

  autoTable(doc, { ...tbl(PRI), startY: y,
    head: [['Abreviatura', 'Significado', 'Abreviatura', 'Significado']],
    body: glossBody,
    columnStyles: {
      0: { cellWidth: 28, fontStyle: 'bold', textColor: PRI, halign: 'left' },
      1: { halign: 'left', cellWidth: 105 },
      2: { cellWidth: 28, fontStyle: 'bold', textColor: PRI, halign: 'left' },
      3: { halign: 'left', cellWidth: 105 },
    },
    styles: { ...tbl(PRI).styles, fontSize: 7, cellPadding: 1.5 },
  });

  /* ── Guardar ── */
  const fileName = `${(P.proyecto || 'Proyecto').replace(/\s+/g, '_').substring(0,40)}_ReporteGeneral_AMCPro.pdf`;
  doc.save(fileName);
}
