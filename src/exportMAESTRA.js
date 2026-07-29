import ExcelJS from 'exceljs';
import { saveFileWithDialog } from './utils/fileSaver';
import {IDF} from './constants';
import {calcPozosCompleto} from './calcHelpers';
import {recalcPbItems} from './tabs/ProjectConsolidatorTab';

import PTOBASE_DATA from './ptoBaseData';

/* >>> Exportación MAESTRA con ExcelJS y Estilos Corporativos <<< */
async function exportMAESTRA(P,R,T,sumLat,sumTrans,pbItems,inpData,estSepData, urbanismoData){
  if(!pbItems || pbItems.length === 0){
    pbItems = JSON.parse(JSON.stringify(PTOBASE_DATA));
  }
  pbItems = recalcPbItems({R, P, T, sumLat, sumTrans, pbItems, urbanismoData});
  var dR=R.filter(function(r){return !r.sep;});
  var dN=dR.filter(function(r){return r.reponer==="S";});
  var lt=dN.reduce(function(s,r){return s+(r.L||0);},0);
  var pozData=calcPozosCompleto(R,T);
  var pz=pozData.pz;

  var cdTotal = 0;
  var sumDirecto = 0;
  if(pbItems){
    pbItems.forEach(function(it){
      if(it.lv>=3&&it.q>0&&it.p>0){
        var v = Math.round(it.q*it.p);
        if(it.c.startsWith("S")) sumDirecto += v;
        else cdTotal += v;
      }
    });
  } else {
    cdTotal = Math.round(lt*5474000);
  }
  
  // Calculate EXACT program total
  var admProg = cdTotal * (P.porcAdmin || 0.29);
  var impProg = cdTotal * (P.porcImprevistos || 0.01);
  var utProg = cdTotal * (P.porcUtilidad || 0.05);
  var pmaProg = (P.reqPMA !== "S" && P.reqPMA !== true) ? 0 : cdTotal * (P.porcPMA !== undefined ? P.porcPMA : 0.025525);
  var pmtProg = (P.reqPMT !== "S" && P.reqPMT !== true) ? 0 : cdTotal * (P.porcPMT !== undefined ? P.porcPMT : 0.051068);
  var ivaProg = utProg * (P.porcIVA !== undefined ? P.porcIVA : 0.19);
  var obraCivil = cdTotal + admProg + impProg + utProg + ivaProg;
  var costoObra = obraCivil + pmaProg + pmtProg;
  var interObra = obraCivil * 0.073615;
  var aiuSum = sumDirecto * 0.291;
  var intSum = sumDirecto * 0.163;
  var costoSuministros = sumDirecto + aiuSum + intSum;
  var exactAppTotal = Math.round(costoObra + interObra + costoSuministros);

  // Reverse calculate MAESTRA's variables to preserve the old Excel format perfectly
  var pctTotal = 1 + (P.porcAdmin||0.29) + (P.porcImprevistos||0.01) + (P.porcUtilidad||0.05) + (P.porcUtilidad||0.05)*(P.porcIVA||0.19);
  if (P.reqInterventoria === "S" || P.reqInterventoria === true) pctTotal += pctTotal * (P.porcInterventoria||0.08); // Include interventoria in the reverse calculation if the original script did
  
  var cd = Math.round(exactAppTotal / pctTotal);
  var adm = Math.round(cd*(P.porcAdmin||0.29));
  var imp = Math.round(cd*(P.porcImprevistos||0.01));
  var ut = Math.round(cd*(P.porcUtilidad||0.05));
  var iva = Math.round(ut*(P.porcIVA||0.19));
  var interv = (P.reqInterventoria === "S" || P.reqInterventoria === true) ? Math.round((cd+adm+imp+ut+iva)*(P.porcInterventoria||0.08)) : 0;
  
  // Forcing tot to exactly match the application to absorb rounding
  var tot = exactAppTotal;
  var costoMl = lt>0 ? Math.round(tot/lt) : 0;

  var estName=IDF[P.estacion]?IDF[P.estacion].name:P.estacion;
  var wb = new ExcelJS.Workbook();
  var ws = wb.addWorksheet('MAESTRA', { views: [{ showGridLines: false }] });

  var rows=[];

  /* R1-R4: encabezado */
  rows.push(["HOJA MAESTRA - PANEL DE CONTROL UNICO"]);
  rows.push(["EMPRESA PUBLICA DE ALCANTARILLADO DE SANTANDER - AMCaudales"]);
  rows.push(["Exportado desde AMCaudales v36 Pro"]);
  rows.push([]);

  /* R5-R6: Seccion 1 */
  rows.push(["1. INFORMACION GENERAL"]);
  rows.push(["CAMPO","VALOR (Editar aqui)","OBSERVACION"]);

  /* R7-R13: Datos generales */
  rows.push(["Objeto del Proyecto",P.proyecto||"","Texto descriptivo del proyecto"]);
  rows.push(["Municipio(s)",P.municipio||""]);
  rows.push(["Barrio / Sector",P.barrio||""]);
  rows.push(["Diseñador",P.disenador||""]);
  rows.push(["Cedula Diseñador",P.cedula||""]);
  rows.push(["Fecha del Presupuesto",P.fecha||new Date().toLocaleDateString('es-CO')]);
  rows.push(["Estacion Meteorologica",estName]);
  rows.push([]);

  /* R15-R25: Seccion 2 */
  rows.push(["2. PARAMETROS EXCAVACIONES Y RELLENOS"]);
  rows.push(["PARAMETRO","VALOR","UNIDAD","NOTAS"]);
  rows.push(["% Excavacion en Tierra",P.porcExcTierra||0.55,"%"]);
  rows.push(["% Excavacion en Mat. Granular",P.porcExcGranular||0.30,"%"]);
  rows.push(["% Excavacion en Roca",P.porcExcRoca||0.15,"%"]);
  rows.push(["% Excavacion con Entibado",P.porcEntibado||1,"%"]);
  rows.push([`% ${P.nombreExcMaquina ? P.nombreExcMaquina.replace('%', '').trim() : "Excavacion a Maquina"}`,P.porcAcarreoLibre||0.5,"%"]);
  rows.push(["% Aprovechamiento en Tierra",P.porcAprovTierra||0.5,"%"]);
  rows.push(["% Aprovechamiento en Granular",P.porcAprovGranular||0.5,"%"]);
  rows.push(["% Aprovechamiento en Roca",P.porcAprovRoca||0,"%"]);
  rows.push(["Distancia al Botadero",P.distBotadero||8,"Km"]);
  rows.push([]);

  /* R27-R58: Seccion 3 */
  rows.push(["3. DATOS HIDRAULICOS Y PARAMETROS DEL PROYECTO"]);
  rows.push(["PARAMETRO","VALOR","UNIDAD","NOTAS"]);
  rows.push(["Poblacion Directa",P.pobDirecta||0,"Hab"]);
  rows.push(["Poblacion Indirecta",Math.round((P.areaTotal||0)*(P.densidad||600)),"Hab"]);
  rows.push(["Area Total",P.areaTotal||0,"Has"]);
  rows.push(["Tipo Alcantarillado (S/P/C/SC)",P.tipoAlc||"C"]);
  rows.push(["Caudal por Area o Vivienda (A/V)","A"]);
  rows.push(["Porcentaje de Patios",P.porcPatios||10]);
  rows.push(["Altura Sobre Nivel del Mar",P.alturaSNM||1015,"m.s.n.m."]);
  rows.push(["Densidad",P.densidad||600,"Hab/ha"]);
  rows.push(["Hab. por Vivienda",P.habVivienda||4,"Hab/Vivienda"]);
  rows.push(["Consumo",P.consumo||140,"L*Hab/dia"]);
  rows.push(["Coeficiente de Retorno",P.coefRetorno||0.85]);
  rows.push(["Tiempo de Obra",P.tiempoObra||2,"meses"]);
  rows.push(["Longitud de Obra",lt.toFixed(2),"m"]);
  rows.push(["Ancho de Via",P.anchoVia||6,"m"]);
  var largoAco=P.largoAco||6;
  rows.push(["N° Acometidas (0-" + largoAco + "m)",P.nAcom06||0,"U","Total Acometidas:"]);
  rows.push(["N° Acometidas (" + largoAco + "-" + (largoAco+4) + "m)",P.nAcom610||0,"U"]);
  rows.push(["N° Acometidas (>" + (largoAco+4) + "m)",P.nAcom10||0,"U"]);
  rows.push(["Relacion de Capacidad (Q/Qo)",P.relCapacidad||0.9]);
  rows.push(["% Profundidad (Y/Do)",P.porcProfundidad||0.85]);
  rows.push(["Velocidad Maxima (Vo)",P.velMaxima||5.0,"m/s"]);
  rows.push(["Fuerza Tractiva Minima",P.fuerzaTractMin||1.0,"Pa"]);
  rows.push(["Limite Froude Subcritic",P.limFroudeSub||0.9]);
  rows.push(["Limite Froude Supercritic",P.limFroudeSup||1.1]);
  rows.push(["Requiere Interventoria (S/N)",P.reqInterventoria||"N"]);
  rows.push(["% Interventoria (si aplica)",P.porcInterventoria||0.08,"%"]);
  /* Leer vallas DIRECTAMENTE de pbItems para que coincida con lo que ve el usuario en pantalla */
  var vallas1Q=0, vallas2Q=0, vallas3Q=0, vallas4Q=0;
  if(pbItems && pbItems.length > 0) {
    pbItems.forEach(function(it) {
      if(it.lv >= 3 && it.q > 0) {
        var dl = (it.d || '').toLowerCase();
        if(dl.includes('valla') || dl.includes('señal informativa')) {
          if(it.c === '1.01.01.01' || (dl.includes('tipo 1') && dl.includes('valla'))) vallas1Q += it.q;
          else if(it.c === '1.01.01.02' || (dl.includes('tipo 2') && dl.includes('valla'))) vallas2Q += it.q;
          else if(it.c === '1.01.01.03' || (dl.includes('tipo 3') && dl.includes('valla'))) vallas3Q += it.q;
          else if(it.c === '1.01.01.04' || (dl.includes('tipo 4') && dl.includes('valla'))) vallas4Q += it.q;
        }
      }
    });
  }
  /* Fallback a P.vallas si pbItems no tiene vallas */
  if(vallas1Q===0 && vallas2Q===0 && vallas3Q===0 && vallas4Q===0) {
    vallas1Q = P.vallas1 || 0;
    vallas2Q = P.vallas2 || 0;
    vallas3Q = P.vallas3 || 0;
    vallas4Q = P.vallas4 || 1;
  }
  rows.push(["Vallas Tipo 1 (>$10.000M)",vallas1Q,"U"]);
  rows.push(["Vallas Tipo 2 ($5-10.000M)",vallas2Q,"U"]);
  rows.push(["Vallas Tipo 3 ($1-5.000M)",vallas3Q,"U"]);
  rows.push(["Vallas Tipo 4 (<$1.000M)",vallas4Q,"U"]);
  rows.push(["No. Pozos",pz.length,"U"]);

  /* R59-R65: AIU */
  rows.push(["4. ANALISIS A.I.U.",null,"BASE DE CALCULO"]);
  rows.push(["RUBRO","% (Input)","BASE"]);
  rows.push(["Administracion",P.porcAdmin||0.29,"Sobre Costo Directo"]);
  rows.push(["Imprevistos",P.porcImprevistos||0.01,"Sobre Costo Directo"]);
  rows.push(["Utilidad",P.porcUtilidad||0.05,"Sobre Costo Directo"]);
  rows.push(["IVA sobre Utilidad",P.porcIVA||0.19,"Sobre Utilidad"]);
  rows.push(["TOTAL AIU",(P.porcAdmin||0.29)+(P.porcImprevistos||0.01)+(P.porcUtilidad||0.05)]);
  rows.push([]);

  /* R67-R80: Resumen costos */
  rows.push(["5. RESUMEN DE COSTOS",null,"REFERENCIA"]);
  rows.push(["F. COSTO DIRECTO",cd,"AMCaudales v36"]);
  rows.push(["G. Administracion",adm,((P.porcAdmin||0.29)*100).toFixed(0)+"% sobre Costo Directo"]);
  rows.push(["H. Imprevistos",imp,((P.porcImprevistos||0.01)*100).toFixed(0)+"% sobre Costo Directo"]);
  rows.push(["I. Utilidad",ut,((P.porcUtilidad||0.05)*100).toFixed(0)+"% sobre Costo Directo"]);
  rows.push(["J. IVA sobre Utilidad",iva,Math.round((P.porcIVA||0.19)*100)+"% sobre Utilidad"]);
  rows.push(["COSTO TOTAL",tot]);
  rows.push(["Valor por Metro de Obra [$/ml]",costoMl,"$/ml sobre Longitud"]);
  rows.push([]);

  /* Headers Zonas */
  rows.push(["Ã¢â€ÂÃ¢â€Â ZONA ESPEJO - DATOS DE REFERENCIA POR TRAMO Ã¢â€ÂÃ¢â€Â"]);
  rows.push(["Datos espejo de 5.Cant-Excav y 6.Cant-Pozos"]);
  rows.push(["SUB-ZONA A - 5.Cant-Excav",null,null,null,null,null,null,null,null,null,null,null,null,"SUB-ZONA B - 6.Cant-Pozos"]);
  rows.push(["N°","D (De)","E (A)","F (Cota De)","J (Long)","K (Pendiente)","M (Diam Nom)","N (Material)","O (Diam Ext)","X (Prof De)","Y (Ancho Zanja)","Z (Prof A)","P (Rot.Pav m2)","Pozo ID","Dp (m)","Ce (m)","Ds (pul)","Cs (m)","DHe (m)","D'e (Com)","PDR-60 (Kg)","A-37 (Kg)","Concr. (m3)","Total (m3)","H pozo (m)","0-2.5m (m3)","2.5-5m (m3)",">5m (m3)","Reducc (m2)","PDR-60 B (Kg)","A-37 B (Kg)","Cota A (m)","Muro (m2)","Cto. (m3)","PDR-60 C (Kg)","DA (Rellen total m3)"]);

  var pzMap={};pz.forEach(function(p){pzMap[p.nodo]=p;});
  dR.forEach(function(r,ri){
    var pzDE=pzMap[r.de];
    var DiMM=parseFloat(r.nom)||315;var DiPul=DiMM/25.4;
    var anchoZ=r.D+0.4;
    var rotPav=r.Le*(r.pavAncho==="S"?(P.anchoVia||6):anchoZ);
    var rellTotal=r.Le*anchoZ*r.HP-r.volE+(r.Le*anchoZ*0.1);

    var pzId=pzDE?pzDE.nodo:"";
    var pzDp=pzDE?pzDE.prof:0;
    var pzCe=pzDE&&pzDE.llegadas&&pzDE.llegadas.length>0?pzDE.llegadas[0].cf:0;
    var pzDsPul=pzDE?pzDE.dsPul:DiPul;
    var pzCs=pzDE?pzDE.csSal:0;
    var pzDHe=pzDE&&pzDE.caidas&&pzDE.caidas.length>0?pzDE.caidas[0].deltaH:0;
    var pzDeCom=pzDHe>0.75?(pzDE.caidas[0].diam+" mm"):"0";
    var pzPDR=pzDE?pzDE.pdr60:0;
    var pzA37=pzDE?pzDE.a37:0;
    var pzConc=pzDE?pzDE.volConc:0;
    var pzExcTot=pzDE?pzDE.volExc:0;
    var pzHpozo=pzDE?pzDE.prof:0;
    var pzV025=pzDE?pzDE.v025:0;
    var pzV2550=pzDE?pzDE.v2550:0;
    var pzV50p=pzDE?pzDE.v50p:0;
    var pzReduc=pzDE?pzDE.reduccion:0;
    var pzPDRB=0;var pzA37B=0;
    var pzCotaA=r.crA||0;
    var pzMuro=pzDE?pzDE.areaMamp:0;
    var pzCto=pzDE?(pzDE.volConc+(pzDE.volTapa||0)):0;
    var pzPDRC=pzDE&&pzDE.pozoNuevo==="S"?26.5:0;

    // Si este pozo es la estructura de separacion, sumar sus cantidades
    if (estSepData && estSepData.incluirEnCantidades && pzId === estSepData.pozoId) {
        pzConc += estSepData.cantConc || 0;
        pzExcTot += estSepData.cantExcav || 0;
        pzPDR += estSepData.cantAcero || 0;
        pzCto += estSepData.cantConc || 0;
    }

    rows.push([
      ri+1,r.de,r.a,r.crDE,r.L,r.S,r.nom,r.mat,r.D,r.profE,anchoZ,r.profS,rotPav,
      pzId,pzDp,pzCe,pzDsPul,pzCs,pzDHe,pzDeCom,pzPDR,pzA37,pzConc,pzExcTot,pzHpozo,pzV025,pzV2550,pzV50p,pzReduc,pzPDRB,pzA37B,pzCotaA,pzMuro,pzCto,pzPDRC,rellTotal>0?+rellTotal.toFixed(2):0
    ]);
  });

  for(var fi=dR.length;fi<442;fi++){
    var emptyRow=[fi+1];for(var ei=0;ei<35;ei++)emptyRow.push(0);
    rows.push(emptyRow);
  }

  rows.push(["N26",P.porcAcarreoLibre||0.5]);
  rows.push(["N27",1e-8]);
  rows.push(["N40",P.distBotadero||8]);
  rows.push([]);
  rows.push(["SUB-ZONA E - 2.Datos"]);
  rows.push(["N°","C (De)","H (Cota De)","I (Cota A)","TipoVia","PavAncho","PozoNuevo"]);

  var tramIdx=0;
  R.forEach(function(t, ti){
    if(t.sep){
      rows.push([tramIdx+1,"0","0","0","FX","N","N"]);
      tramIdx++;return;
    }
    var tMatch=T[ti]||{};
    rows.push([
      tramIdx+1,
      t.de||"0",
      t.crDE||0,
      t.cfDE||t.cotaFondoDE||t.cotaFondo||0,
      tMatch.tipoVia||t.tipoVia||"FX",
      tMatch.pavAncho||t.pavAncho||"S",
      tMatch.pozoNuevo||t.pozoNuevo||"N"
    ]);
    tramIdx++;
  });
  // Sanitizar los datos para evitar errores XML en Excel
  var sanitizedRows = rows.map(row => row.map(cell => {
    if (cell === null || cell === undefined) return '';
    if (typeof cell === 'number' && !Number.isFinite(cell)) return 0;
    if (typeof cell === 'string') return cell.replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, ''); // Remover chars de control
    return cell;
  }));

  // Agregar todas las filas al worksheet
  ws.addRows(sanitizedRows);

  // Estilos Corporativos con ExcelJS
  const titleFont = { name: 'Arial', family: 2, size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  const headerFont = { name: 'Arial', family: 2, size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  const subHeaderFont = { name: 'Arial', family: 2, size: 12, bold: true, color: { argb: 'FF0ea5e9' } };
  
  const bgBlue = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003B73' } };
  const bgLight = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF5FB' } };

  // Pintar el titulo principal (Filas 1 y 2)
  for(let i=1; i<=2; i++){
    ws.getRow(i).getCell(1).font = titleFont;
    ws.getRow(i).getCell(1).fill = bgBlue;
  }

  // Identificar y pintar encabezados de seccion y de tablas
  ws.eachRow((row, rowNumber) => {
    let cell1 = row.getCell(1).value;
    if (typeof cell1 === 'string') {
      if (cell1.includes('INFORMACION GENERAL') || cell1.includes('PARAMETROS') || cell1.includes('ANALISIS') || cell1.includes('RESUMEN')) {
        row.getCell(1).font = subHeaderFont;
      }
      if (cell1 === 'CAMPO' || cell1 === 'PARAMETRO' || cell1 === 'RUBRO' || cell1 === 'N°') {
        row.eachCell(c => {
          c.font = headerFont;
          c.fill = bgBlue;
          c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        });
      }
    }

    // Bordes ligeros para todas las filas con contenido a partir de la 6
    if (rowNumber > 5 && cell1 && cell1 !== '') {
      row.eachCell({ includeEmpty: true }, (c, colNumber) => {
        if(colNumber <= 36) { // Solo hasta la columna 36
          c.border = { top: {style:'thin', color:{argb:'FFDDDDDD'}}, bottom: {style:'thin', color:{argb:'FFDDDDDD'}} };
          // Colores alternos
          if (rowNumber % 2 === 0 && !c.fill && typeof cell1 !== 'string') {
            c.fill = bgLight;
          }
        }
      });
    }
  });

  // Ajustar anchos de columnas
  ws.columns = [
    { width: 35 }, { width: 30 }, { width: 25 }, { width: 12 }, { width: 10 },
    { width: 10 }, { width: 12 }, { width: 8 }, { width: 8 }, { width: 10 },
    { width: 10 }, { width: 10 }, { width: 10 }, { width: 25 }, { width: 8 },
    { width: 10 }, { width: 10 }, { width: 10 }, { width: 8 }, { width: 12 },
    { width: 10 }, { width: 10 }, { width: 8 }, { width: 10 }, { width: 10 },
    { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 15 }
  ];

  if (inpData && inpData.pozos && inpData.pozos.length > 0) {
    const wsNodos = wb.addWorksheet('Nodos_Vertices');
    wsNodos.addRow(["N°", "ID Pozo/Nodo", "Coordenada X (Este)", "Coordenada Y (Norte)", "Cota Terreno"]);
    
    // Style the header
    wsNodos.getRow(1).eachCell(c => {
      c.font = headerFont;
      c.fill = bgBlue;
      c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    });

    inpData.pozos.forEach((po, i) => {
      wsNodos.addRow([
        i + 1,
        po.id,
        po.x !== undefined ? po.x : "",
        po.y !== undefined ? po.y : "",
        po.cota || ""
      ]);
    });
    
    wsNodos.columns = [
      { width: 10 }, { width: 25 }, { width: 25 }, { width: 25 }, { width: 20 }
    ];
  }

  /* Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ HOJA: 10.Presupuesto (formato identico a 10.Presupuesto2026 del xlsm) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */
  if (pbItems && pbItems.length > 0) {
    const wsPb = wb.addWorksheet('10.Presupuesto', { views: [{ showGridLines: false }] });

    // Ã¢â€â‚¬Ã¢â€â‚¬ Anchos de columnas identicos al original Ã¢â€â‚¬Ã¢â€â‚¬
    wsPb.getColumn(1).width = 16;   // A: Codigo
    wsPb.getColumn(2).width = 55;   // B: Descripcion
    wsPb.getColumn(3).width = 10;   // C: Unidad
    wsPb.getColumn(4).width = 13;   // D: Cantidad
    wsPb.getColumn(5).width = 18;   // E: Precio Peso
    wsPb.getColumn(6).width = 20;   // F: Total Peso
    wsPb.getColumn(7).width = 3;    // G: separador
    wsPb.getColumn(8).width = 4;    // H: flag activo

    // Ã¢â€â‚¬Ã¢â€â‚¬ Helpers Ã¢â€â‚¬Ã¢â€â‚¬
    const pbFill = (argb) => ({ type:'pattern', pattern:'solid', fgColor:{ argb } });
    const pbFont = (bold, size, argb) => ({ name:'Arial', size:size||10, bold:!!bold, color:{ argb: argb||'FF0A0A0A' } });
    const pbBord = (style, argb) => ({ style:style||'thin', color:{ argb: argb||'FFAAAAAA' } });
    const pbAllBorder = (s, c) => { var b = pbBord(s,c); return { top:b, bottom:b, left:b, right:b }; };

    // Ã¢â€â‚¬Ã¢â€â‚¬ FILAS 1-24: ENCABEZADO INSTITUCIONAL Ã¢â€â‚¬Ã¢â€â‚¬
    // Fila 1: Empresa
    wsPb.mergeCells('A1:F1');
    var c1 = wsPb.getCell('A1');
    c1.value = 'EMPRESA PUBLICA DE ALCANTARILLADO DE SANTANDER S.A. E.S.P.';
    c1.font  = pbFont(true, 12, 'FFFFFFFF');
    c1.fill  = pbFill('FF003B73');
    c1.alignment = { horizontal:'center', vertical:'middle' };
    wsPb.getRow(1).height = 24;

    // Filas 2-9: vacias encabezado
    for(var hi=2; hi<=9; hi++) {
      try { wsPb.mergeCells('A'+hi+':F'+hi); } catch(e) {}
      wsPb.getCell('A'+hi).fill = pbFill('FF003B73');
      wsPb.getRow(hi).height = 6;
    }

    // Fila 10: Subgerencia
    try { wsPb.mergeCells('A10:F10'); } catch(e) {}
    var c10 = wsPb.getCell('A10');
    c10.value = 'SUBGERENCIA DE ALCANTARILLADO';
    c10.font  = pbFont(true, 11, 'FFFFFFFF');
    c10.fill  = pbFill('FF003B73');
    c10.alignment = { horizontal:'center', vertical:'middle' };
    wsPb.getRow(10).height = 18;

    // Filas 11-15: vacias claras
    for(var hi2=11; hi2<=15; hi2++) {
      try { wsPb.mergeCells('A'+hi2+':F'+hi2); } catch(e) {}
      wsPb.getCell('A'+hi2).fill = pbFill('FFD6E4F0');
      wsPb.getRow(hi2).height = 5;
    }

    // Fila 16: Nombre proyecto / fecha
    try { wsPb.mergeCells('A16:B16'); } catch(e) {}
    var c16a = wsPb.getCell('A16');
    c16a.value = 'NOMBRE DEL PROYECTO:';
    c16a.font  = pbFont(true, 10, 'FF003B73');
    c16a.fill  = pbFill('FFD6E4F0');
    c16a.alignment = { horizontal:'left', vertical:'middle' };
    var c16c = wsPb.getCell('C16');
    c16c.value = P.municipio || '';
    c16c.font  = pbFont(false, 10, 'FF0A0A0A');
    c16c.fill  = pbFill('FFD6E4F0');
    c16c.alignment = { horizontal:'center', vertical:'middle' };
    try { wsPb.mergeCells('D16:E16'); } catch(e) {}
    var c16d = wsPb.getCell('D16');
    c16d.value = 'FECHA:';
    c16d.font  = pbFont(true, 10, 'FF003B73');
    c16d.fill  = pbFill('FFD6E4F0');
    c16d.alignment = { horizontal:'right', vertical:'middle' };
    var c16f = wsPb.getCell('F16');
    c16f.value = P.fecha || new Date().toLocaleDateString('es-CO');
    c16f.font  = pbFont(false, 10, 'FF0A0A0A');
    c16f.fill  = pbFill('FFD6E4F0');
    c16f.alignment = { horizontal:'center', vertical:'middle' };
    wsPb.getRow(16).height = 18;

    // Filas 17-19: vacias
    for(var hi3=17; hi3<=19; hi3++) {
      try { wsPb.mergeCells('A'+hi3+':F'+hi3); } catch(e) {}
      wsPb.getRow(hi3).height = 5;
    }

    // Fila 20: Nombre completo del proyecto
    try { wsPb.mergeCells('A20:F20'); } catch(e) {}
    var c20 = wsPb.getCell('A20');
    c20.value = (P.proyecto || P.barrio || 'PROYECTO DE ALCANTARILLADO').toUpperCase();
    c20.font  = pbFont(true, 11, 'FF003B73');
    c20.fill  = pbFill('FFD6E4F0');
    c20.alignment = { horizontal:'center', vertical:'middle', wrapText:true };
    wsPb.getRow(20).height = 22;

    // Filas 21-22: vacias
    for(var hi4=21; hi4<=22; hi4++) {
      try { wsPb.mergeCells('A'+hi4+':F'+hi4); } catch(e) {}
      wsPb.getRow(hi4).height = 5;
    }

    // Fila 23: Titulo del formulario
    try { wsPb.mergeCells('A23:F23'); } catch(e) {}
    var c23 = wsPb.getCell('A23');
    c23.value = 'FORMULARIO APROXIMADO DE OBRA';
    c23.font  = pbFont(true, 10, 'FF003B73');
    c23.fill  = pbFill('FFEBF5FB');
    c23.alignment = { horizontal:'center', vertical:'middle' };
    wsPb.getRow(23).height = 16;

    // Fila 24: separadora
    try { wsPb.mergeCells('A24:F24'); } catch(e) {}
    wsPb.getRow(24).height = 4;

    // Ã¢â€â‚¬Ã¢â€â‚¬ FILA 25: CABECERA DE COLUMNAS (identica al original) Ã¢â€â‚¬Ã¢â€â‚¬
    var pbHdrs = ['CODIGO','DESCRIPCION','UNIDAD','CANTIDAD','PRECIO PESO','TOTAL PESO'];
    for(var ci=0; ci<pbHdrs.length; ci++) {
      var cHd = wsPb.getCell(25, ci+1);
      cHd.value = pbHdrs[ci];
      cHd.font  = pbFont(true, 10, 'FFFFFFFF');
      cHd.fill  = pbFill('FF003B73');
      cHd.alignment = { horizontal: ci===1 ? 'left' : 'center', vertical:'middle', wrapText:true };
      cHd.border = pbAllBorder('medium', 'FF000000');
    }
    wsPb.getRow(25).height = 22;

    // Ã¢â€â‚¬Ã¢â€â‚¬ Pre-calcular totales por codigo para encabezados de grupo Ã¢â€â‚¬Ã¢â€â‚¬
    var totByCode = {};
    pbItems.forEach(function(it) {
      // Acumular cualquier item con precio y cantidad (independiente de nivel)
      if((it.p||0) > 0 && (it.q||0) > 0) {
        var v = Math.round(it.q * it.p);
        var parts = it.c.split('.');
        for(var pi=1; pi<=parts.length; pi++) {
          var key = parts.slice(0,pi).join('.');
          totByCode[key] = (totByCode[key]||0) + v;
        }
        if(it.c.startsWith('S')) {
          totByCode['S'] = (totByCode['S']||0) + v;
        }
      }
    });

    // ─ ITEMS DESDE FILA 26 ─
    var curRow = 26;
    var itemCount = 0;
    let rowMap = {};

    pbItems.forEach(function(it) {
      var code   = it.c || '';
      var lv     = it.lv || 1;
      // Un item es hoja si tiene precio > 0 (independiente del nivel)
      var isLeaf = (it.p||0) > 0;
      var hasVal = isLeaf && (it.q||0) > 0;
      var total  = hasVal ? Math.round(it.q * it.p) : null;
      var grpTot = totByCode[code] || 0;
      // Para items hoja: mostrar su propio total; para grupos: mostrar total acumulado
      var showTotal = isLeaf ? total : (grpTot > 0 ? grpTot : null);

      // Saltar items sin descripcion ni precio (filas vacias)
      if(!it.d && !isLeaf) return;

      // Color de fondo segun nivel
      var bgArgb, fontArgb, isBold, rHeight;
      if(lv === 1 && !isLeaf) {
        bgArgb='FF1A3A5C'; fontArgb='FFFFFFFF'; isBold=true; rHeight=18;
      } else if(lv === 2 && !isLeaf) {
        bgArgb='FF1D6A9C'; fontArgb='FFFFFFFF'; isBold=true; rHeight=16;
      } else if(lv >= 3 && !isLeaf) {
        bgArgb='FFD6E4F0'; fontArgb='FF003B73'; isBold=true; rHeight=15;
      } else {
        // A tem hoja con precio
        bgArgb = (itemCount % 2 === 0) ? 'FFFFFFFF' : 'FFEBF5FB';
        fontArgb='FF0A0A0A'; isBold=false; rHeight=14;
        if(hasVal) itemCount++;
      }

      var rowFill   = pbFill(bgArgb);
      var rowFont   = pbFont(isBold, 10, fontArgb);
      var rowBorder = pbAllBorder('thin', 'FFBBBBBB');

      // A: Codigo
      var cA = wsPb.getCell(curRow, 1);
      cA.value = code; cA.font = rowFont; cA.fill = rowFill;
      cA.alignment = { horizontal:'center', vertical:'middle' };
      cA.border = rowBorder;

      // B: Descripcion
      var ind = Math.max(0, lv - 1);
      var cB = wsPb.getCell(curRow, 2);
      
      let itemDesc = it.d || '';
      if(code === "2.01.01" && P.nombreExcMaquina) itemDesc = P.nombreExcMaquina.replace('%', '').trim();
      else if(itemDesc.toLowerCase().includes("sin acarreo libre") && P.nombreExcMaquina) itemDesc = itemDesc.replace(/sin acarreo libre/ig, P.nombreExcMaquina.replace('%', '').trim());
      if(code === "2.01.02" && P.nombreExcManual) itemDesc = P.nombreExcManual.replace('%', '').trim();
      else if(itemDesc.toLowerCase().includes("con acarreo libre") && P.nombreExcManual) itemDesc = itemDesc.replace(/con acarreo libre/ig, P.nombreExcManual.replace('%', '').trim());
      
      if(code.startsWith("2.01.01.") && P.nombreExcMaquina) itemDesc = itemDesc.replace(/Excavaci.*?n( a m.*?quina)?/i, P.nombreExcMaquina.replace('%', '').trim());
      if(code.startsWith("2.01.02.") && P.nombreExcManual) itemDesc = itemDesc.replace(/Excavaci.*?n( a m.*?quina)?(.*?)(con acarreo|acarreo)?/i, P.nombreExcManual.replace('%', '').trim() + "$2");
      
      cB.value = itemDesc; cB.font = rowFont; cB.fill = rowFill;
      cB.alignment = { horizontal:'left', vertical:'middle', indent: ind, wrapText: lv >= 4 };
      cB.border = rowBorder;

      // C: Unidad (mostrar unidad real si es hoja, GLB si es grupo de nivel 1-2)
      var cC = wsPb.getCell(curRow, 3);
      cC.value = isLeaf ? (it.u || '') : (lv <= 2 ? 'GLB' : '');
      cC.font = rowFont; cC.fill = rowFill;
      cC.alignment = { horizontal:'center', vertical:'middle' };
      cC.border = rowBorder;

      // D: Cantidad (solo si es hoja)
      var cD = wsPb.getCell(curRow, 4);
      cD.value = isLeaf ? (it.q || 0) : null;
      cD.font = rowFont; cD.fill = rowFill;
      cD.alignment = { horizontal:'right', vertical:'middle' };
      cD.numFmt = '#,##0.00'; cD.border = rowBorder;

      // E: Precio Unitario (solo si es hoja)
      var cE = wsPb.getCell(curRow, 5);
      cE.value = isLeaf ? (it.p || 0) : null;
      cE.font = rowFont; cE.fill = rowFill;
      cE.alignment = { horizontal:'right', vertical:'middle' };
      cE.numFmt = '#,##0'; cE.border = rowBorder;

      // F: Total
      var cF = wsPb.getCell(curRow, 6);
      cF.value = isLeaf && hasVal ? { formula: `D${curRow}*E${curRow}`, result: total } : showTotal;
      cF.font = rowFont; cF.fill = rowFill;
      cF.alignment = { horizontal:'right', vertical:'middle' };
      cF.numFmt = '"$"#,##0.00'; cF.border = rowBorder;

      // H: Flag activacion (igual al original)
      var cH = wsPb.getCell(curRow, 8);
      cH.value = isLeaf ? (hasVal ? 1 : 0) : 1;
      cH.font = pbFont(false, 8, 'FF888888');
      cH.alignment = { horizontal:'center' };

      wsPb.getRow(curRow).height = rHeight;
      rowMap[code] = curRow;
      curRow++;
    });

    pbItems.forEach(function(it) {
      let isLeaf = (it.p||0) > 0;
      if (!isLeaf && rowMap[it.c]) {
        let children = pbItems.filter(child => {
          let p = child.c.split('.'); p.pop();
          return p.join('.') === it.c;
        });
        if (children.length > 0) {
          let formula = children.map(c => `F${rowMap[c.c]}`).join('+');
          wsPb.getCell(`F${rowMap[it.c]}`).value = { formula: formula, result: totByCode[it.c] || 0 };
        }
      }
    });

    // ─ PIE: RESUMEN FINANCIERO ─
    var cdPb2=0, sumPb2=0;
    pbItems.forEach(function(it) {
      if(it.lv >= 3 && (it.q||0) > 0 && (it.p||0) > 0) {
        var v2 = Math.round(it.q * it.p);
        if(it.c.startsWith('S')) sumPb2 += v2; else cdPb2 += v2;
      }
    });
    var admPb2 = Math.round(cdPb2 * (P.porcAdmin || 0.29));
    var impPb2 = Math.round(cdPb2 * (P.porcImprevistos || 0.01));
    var utPb2  = Math.round(cdPb2 * (P.porcUtilidad || 0.05));
    var ivaPb2 = Math.round(utPb2 * (P.porcIVA || 0.19));
    var pmaPb2 = (P.reqPMA === 'N' || P.reqPMA === false) ? 0 : Math.round(cdPb2 * (P.porcPMA !== undefined ? P.porcPMA : 0.025525));
    var pmtPb2 = (P.reqPMT === 'N' || P.reqPMT === false) ? 0 : Math.round(cdPb2 * (P.porcPMT !== undefined ? P.porcPMT : 0.051068));
    var totPb2 = cdPb2 + admPb2 + impPb2 + utPb2 + ivaPb2 + pmaPb2 + pmtPb2 + sumPb2;
    var mlPb2  = lt > 0 ? Math.round(totPb2 / lt) : 0;

    curRow++; // separador

    var addFR = function(label, val, pct, dark, formula = null) {
      var bgA = dark ? 'FF1A3A5C' : 'FFEBF5FB';
      var fgA = dark ? 'FFFFFFFF' : 'FF0A0A0A';
      for(var ci2=1; ci2<=6; ci2++) {
        var c2 = wsPb.getCell(curRow, ci2);
        c2.fill = pbFill(bgA);
        c2.border = pbAllBorder('thin', 'FFAAAAAA');
        c2.font = pbFont(dark, 10, fgA);
      }
      wsPb.getCell(curRow, 2).value = label;
      wsPb.getCell(curRow, 2).alignment = { horizontal:'left', vertical:'middle' };
      if(pct !== null && pct !== undefined) {
        wsPb.getCell(curRow, 3).value = pct;
        wsPb.getCell(curRow, 3).numFmt = '0.00%';
        wsPb.getCell(curRow, 3).alignment = { horizontal:'center' };
      }
      if (formula) {
        wsPb.getCell(curRow, 6).value = { formula: formula, result: val };
      } else {
        wsPb.getCell(curRow, 6).value = val;
      }
      wsPb.getCell(curRow, 6).numFmt = '"$"#,##0.00';
      wsPb.getCell(curRow, 6).alignment = { horizontal:'right' };
      wsPb.getRow(curRow).height = 16;
      curRow++;
    };

    let ocRoots = pbItems.filter(it => it.lv === 1 && !it.c.startsWith('S'));
    let cdFormula = ocRoots.length > 0 ? ocRoots.map(c => `F${rowMap[c.c]}`).join('+') : `${cdPb2}`;
    let sumRoots = pbItems.filter(it => it.lv === 1 && it.c.startsWith('S'));
    let sumFormula = sumRoots.length > 0 ? sumRoots.map(c => `F${rowMap[c.c]}`).join('+') : `${sumPb2}`;

    var rCD = curRow; addFR('F. COSTO DIRECTO OBRA CIVIL',   cdPb2, null, false, cdFormula);
    var rAdm = curRow; addFR('G. Administracion',             admPb2, P.porcAdmin||0.29, false, `F${rCD}*C${rAdm}`);
    var rImp = curRow; addFR('H. Imprevistos',                impPb2, P.porcImprevistos||0.01, false, `F${rCD}*C${rImp}`);
    var rUt = curRow; addFR('I. Utilidad',                   utPb2,  P.porcUtilidad||0.05, false, `F${rCD}*C${rUt}`);
    var rIva = curRow; addFR('J. IVA sobre Utilidad',         ivaPb2, P.porcIVA||0.19, false, `F${rUt}*C${rIva}`);
    
    var rPma = -1, rPmt = -1, rSum = -1;
    if(pmaPb2 > 0) { rPma = curRow; addFR('Plan Manejo Ambiental (PMA)', pmaPb2, P.porcPMA||0.025525, false, `F${rCD}*C${rPma}`); }
    if(pmtPb2 > 0) { rPmt = curRow; addFR('Plan Manejo Transito (PMT)',  pmtPb2, P.porcPMT||0.051068, false, `F${rCD}*C${rPmt}`); }
    if(sumPb2 > 0) { rSum = curRow; addFR('Suministros (Costo Directo)', sumPb2, null, false, sumFormula); }
    
    var totF = `F${rCD}+F${rAdm}+F${rImp}+F${rUt}+F${rIva}` + (rPma > -1 ? `+F${rPma}` : '') + (rPmt > -1 ? `+F${rPmt}` : '') + (rSum > -1 ? `+F${rSum}` : '');
    var rTot = curRow; addFR('COSTO TOTAL DEL PROYECTO',      totPb2, null, true, totF);
    addFR('Valor por Metro Lineal [$/ml]', mlPb2, null, false, `F${rTot}/${lt}`);
  }

  var fn = (P.proyecto || P.barrio || "Proyecto").replace(/\s+/g, "_") + "_MAESTRA.xlsx";
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveFileWithDialog(blob, fn);
}

export {exportMAESTRA};
