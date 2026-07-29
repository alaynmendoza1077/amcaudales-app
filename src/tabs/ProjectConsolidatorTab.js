import React, { useState, useRef } from 'react';
import {TH} from '../ui';
import * as XLSX from 'xlsx';
import { SUM_TYPES_TRANS } from '../constants';
import { agruparTuberias, calcVallasAuto, calcPozosCompleto, calcCantSumidero } from '../calcHelpers';
import PTOBASE_DATA from '../ptoBaseData';

export function recalcPbItems(data) {
  if (!data || !data.R || !data.pbItems || data.pbItems.length === 0) return data.pbItems || [];
  var R = data.R, P = data.P || {}, T = data.T || [], sumLat = data.sumLat || [], sumTrans = data.sumTrans || [];
  var urbanismoData = data.urbanismoData;

  let uDem=0, uExc=0, uRell=0, uSob=0, uSubBase=0, uBase=0, uAnden=0, uSardinel=0, uAceroRG=0, uPavRG=0;
  if ((P.urbanismoAvanzado === true || P.urbanismoAvanzado === "S") && urbanismoData) {
    urbanismoData.forEach(r => {
      if(!r.reqUrbanismo) return;
      let demM3=r.pavDemolicion?r.pavL*r.pavA*r.pavEspesorDem:0;
      let viaM2=r.pavL*r.pavA;
      uDem+=demM3; uSob+=demM3;
      if(r.pavTipo==='RG'){
         uPavRG+=viaM2;
         if(r.pavReqAcero) uAceroRG+=(viaM2*r.pavKgAcero);
      }
      let excM3=r.reqRasante?r.rasL*r.rasA*r.rasProf:0;
      uExc+=excM3; uSob+=excM3; uRell+=excM3;
      if(r.reqSubBase) uSubBase+=r.sbL*r.sbA;
      if(r.reqBase) uBase+=r.baseL*r.baseA;
      if(r.reqAnden) uAnden+=r.andL*r.andA*r.andLados;
      if(r.reqSardinel) uSardinel+=r.sarL*r.sarLados;
    });
    uSob = uSob * (1 + (P.porcExpansion !== undefined ? parseFloat(P.porcExpansion) : 0.05));
  }

  var dR = R.filter(r => !r.sep);
  var dN = dR.filter(r => r.reponer === "S");
  var lt = dN.reduce((s, r) => s + (r.L || 0), 0);
  var tE = dN.reduce((s, r) => s + (r.volE || 0), 0);
  var t025 = dN.reduce((s, r) => s + (r.v025 || 0), 0);
  var t2550 = dN.reduce((s, r) => s + (r.v2550 || 0), 0);
  var t50p = dN.reduce((s, r) => s + (r.v50p || 0), 0);
  var tArena = dN.reduce((s, r) => s + (r.rArena || 0), 0);
  var tComun = dN.reduce((s, r) => s + (r.rComun || 0), 0);
  var sumExcLat = 0, sumExcTrans = 0, sumRellLat = 0, sumRellTrans = 0, sumConcLat = 0, sumConcTrans = 0;
  var sumRotLat = 0, sumRotTrans = 0, sumA37Lat = 0, sumA37Trans = 0, sumPdrLat = 0, sumPdrTrans = 0;
  var sumCimLat = 0, sumCimTrans = 0;
  if (sumLat) sumLat.forEach(f => { if ((f.cant || 0) > 0) { var c = calcCantSumidero(f, P); sumExcLat += c.totExc || 0; sumRellLat += c.rell || 0; sumConcLat += c.c4 || 0; sumRotLat += (c.rot || 0); sumA37Lat += (c.a37 || 0); sumPdrLat += (c.pdr || 0); sumCimLat += (c.cim || 0); } });
  if (sumTrans) sumTrans.forEach(f => { if ((f.cant || 0) > 0) { var c = calcCantSumidero(f, P); sumExcTrans += c.totExc || 0; sumRellTrans += c.rell || 0; sumConcTrans += c.c4 || 0; sumRotTrans += (c.rot || 0); sumA37Trans += (c.a37 || 0); sumPdrTrans += (c.pdr || 0); sumCimTrans += (c.cim || 0); } });
  var sumExcTot = sumExcLat + sumExcTrans;
  var sumRotTot = sumRotLat + sumRotTrans;
  var sumConcTot = sumConcLat + sumConcTrans;
  var sumA37Tot = sumA37Lat + sumA37Trans;
  var sumPdrTot = sumPdrLat + sumPdrTrans;
  var sumRellTot = sumRellLat + sumRellTrans;
  var sumCimTot = sumCimLat + sumCimTrans;
  var largoAco = P.largoAco || 6;
  var nAc = (P.nAcom06 || 0) + (P.nAcom610 || 0) + (P.nAcom10 || 0);
  var ltAc = (P.nAcom06 || 0) * largoAco + (P.nAcom610 || 0) * (largoAco + 2) + (P.nAcom10 || 0) * (largoAco + 6);
  var rotP = dN.reduce((s, r) => s + (r.rotP || 0), 0);
  var calcProfProm = dN.length > 0 ? dN.reduce((s, r) => s + ((+r.profE || 0) + (+r.profS || 0)) / 2, 0) / dN.length : 1.5;
  var profProm = P.profProm !== undefined ? P.profProm : calcProfProm;
  var repP = dN.reduce((s, r) => s + (r.repP || 0), 0);
  var ep2 = calcPozosCompleto(R, T, P);
  var caidasCount = { "4.05.01.01": 0, "4.05.01.02": 0, "4.05.01.03": 0, "4.05.01.04": 0, "4.05.02.01": 0, "4.05.02.02": 0, "4.05.02.03": 0, "4.05.02.04": 0, "4.05.03.01": 0, "4.05.03.02": 0, "4.05.03.03": 0, "4.05.03.04": 0, "4.05.04.01": 0, "4.05.04.02": 0, "4.05.04.03": 0, "4.05.04.04": 0 };
  if (ep2 && ep2.pz) {
    ep2.pz.forEach(p => {
      if (p.pozoNuevo === "S" && p.caidas && p.caidas.length > 0) {
        p.caidas.forEach(c => {
          var diam = c.diam || 200; var h = p.prof || 1.5; var dPrefix = "4.05.01";
          if (diam <= 200) dPrefix = "4.05.01"; else if (diam <= 250) dPrefix = "4.05.02"; else if (diam <= 315) dPrefix = "4.05.03"; else dPrefix = "4.05.04";
          var hSuffix = "01";
          if (h <= 2) hSuffix = "01"; else if (h <= 4) hSuffix = "02"; else if (h <= 6) hSuffix = "03"; else hSuffix = "04";
          var fullCode = dPrefix + "." + hSuffix;
          caidasCount[fullCode] = (caidasCount[fullCode] || 0) + 1;
        });
      }
    });
  }
  var pT = P.porcExcTierra || .55, pG = P.porcExcGranular || .30, pR = P.porcExcRoca || .15;
  var pAL = P.porcAcarreoLibre || .5;
  var vaP = calcVallasAuto(R, data.pbItems);
  var FO = P.frentesObra || 1;
  var nEst = P.distBotadero || 8;
  var pA200 = P.porcAcarreo200 || .10, pA500 = P.porcAcarreo500 || 0, pA1000 = P.porcAcarreo1000 || .90;
  var nTramRep = dN.length;
  var fD = 1 + (P.porcDesperdicio || 0);
  var excTtl = (tE + ep2.tVE + sumExcTot);
  var reutTtl = excTtl * (pT * (P.porcAprovTierra || .5) + pG * (P.porcAprovGranular || .5) + pR * (P.porcAprovRoca || 0));
  var demolTtl = (rotP * 0.15);
  var rellN_Tramos = tComun + sumRellTot;
  var matSobrExc = (excTtl - reutTtl) + Math.max(0, reutTtl - rellN_Tramos);
  var msSobrante = (matSobrExc + demolTtl) * (1 + (P.porcExpansion !== undefined ? parseFloat(P.porcExpansion) : 0.05));
  var tEntibado = dN.reduce((s, r) => s + (r.Le || 0) * ((+r.profE || 0) + (+r.profS || 0)) / 2 * 2, 0) * (P.porcEntibado || 1);

  var ratioRepTodo = lt > 0 ? dN.reduce(function(s,t){return s+(t.anchoVia==="S"?(t.L||0):0);},0) / lt : 0;

  var autoMap = {
    "1.01.01.01": vaP.v1 * FO, "1.01.01.02": vaP.v2 * FO, "1.01.01.03": vaP.v3 * FO, "1.01.01.04": vaP.v4 * FO,
    "1.01.02.01": FO * 2,
    "1.01.03.03": Math.ceil(lt / 100), "1.01.03.05": nTramRep, "1.01.03.06": lt,
    "1.02.01.06": lt,
    "1.02.02.01": (P.camp1 || 0) * (P.frentes || 1) * (P.tiempoObra || 1), "1.02.02.02": (P.camp2 || 0) * (P.frentes || 1) * (P.tiempoObra || 1), "1.02.02.03": (P.camp3 || 0) * (P.frentes || 1) * (P.tiempoObra || 1), "1.02.02.04": (P.camp4 || 0) * (P.frentes || 1) * (P.tiempoObra || 1),
    "1.02.03.08": (P.tiempoObra || 2),
    "1.03.01.01": (() => { var r = 0; dN.forEach(t => { if ((t.tipoVia === "FX" || t.tipoVia === "TL") && (P.espesorPav || 0.15) < 0.10) r += t.rotP || 0; }); return r; })(),
    "1.03.01.02": (() => { var r = 0; dN.forEach(t => { if (t.tipoVia === "FX" || t.tipoVia === "TL" || !t.tipoVia) { var esp = P.espesorPav || 0.15; if (esp >= 0.10 && esp <= 0.20) r += t.rotP || 0; } }); return r + sumRotTot; })(),
    "1.03.01.03": (() => { var r = 0; dN.forEach(t => { if ((t.tipoVia === "FX" || t.tipoVia === "TL") && (P.espesorPav || 0.15) > 0.20) r += t.rotP || 0; }); return r; })(),
    "1.03.02.01": (() => { var r = 0; dN.forEach(t => { if (t.tipoVia === "RG" && (P.espesorPav || 0.15) < 0.15) r += t.rotP || 0; }); return r; })(),
    "1.03.02.02": (() => { var r = 0; dN.forEach(t => { if (t.tipoVia === "RG") { var esp = P.espesorPav || 0.15; if (esp >= 0.15 && esp <= 0.25) r += t.rotP || 0; } }); return r; })(),
    "1.03.02.03": (() => { var r = 0; dN.forEach(t => { if (t.tipoVia === "RG" && (P.espesorPav || 0.15) > 0.25) r += t.rotP || 0; }); return r; })(),
    "1.03.03.02": (() => { var r = 0; dN.forEach(t => { if (t.tipoVia === "PP" || t.tipoVia === "AD") r += t.rotP || 0; }); return r; })(),
    "1.03.04.02": (() => { var r = 0; dN.forEach(t => { if (t.tipoVia === "AN") r += t.rotP || 0; }); return r; })(),
    "2.01.01.01": (t025 + ep2.v025 + sumExcTot) * pT * (1 - pAL), "2.01.01.02": (t2550 + ep2.v2550) * pT * (1 - pAL), "2.01.01.04": (t025 + ep2.v025 + sumExcTot) * pG * (1 - pAL), "2.01.01.05": (t2550 + ep2.v2550) * pG * (1 - pAL), "2.01.01.07": (t025 + t2550 + t50p + ep2.tVE + sumExcTot) * pR * (1 - pAL),
    "2.01.02.01": (t025 + ep2.v025 + sumExcTot) * pT * pAL, "2.01.02.02": (t2550 + ep2.v2550) * pT * pAL, "2.01.02.04": (t025 + ep2.v025 + sumExcTot) * pG * pAL, "2.01.02.05": (t2550 + ep2.v2550) * pG * pAL, "2.01.02.07": (t025 + t2550 + t50p + ep2.tVE + sumExcTot) * pR * pAL,
    "2.04.01.01": tEntibado,
    "2.05.01.01": tArena + sumCimTot, "2.05.02.01": (tComun + sumRellTot) * .50, "2.05.03.01": (tComun + sumRellTot) * .50, "2.05.04.02": tArena + sumCimTot,
    "2.06.01.01": msSobrante * pA200 * nEst, "2.06.01.02": msSobrante * pA500 * nEst, "2.06.01.04": msSobrante * pA1000 * (P.distBotadero || 8),
    "3.02.01.01": ep2.tTubVent * fD,
    "4.01.01.01": (ep2.tVC + sumConcTot) * fD, "4.01.01.02": (ep2.tVolCaida || 0) * fD, "4.01.02.02": ep2.tCP * fD,
    "4.02.01.01": (ep2.tA37 + (sumA37Tot * 0.5)) * fD, "4.02.01.02": (ep2.tPDR + (sumA37Tot * 0.5)) * fD,
    "4.04.01.01": ep2.tAM * fD,
    "4.05.01.01": caidasCount["4.05.01.01"] || 0, "4.05.01.02": caidasCount["4.05.01.02"] || 0, "4.05.01.03": caidasCount["4.05.01.03"] || 0, "4.05.01.04": caidasCount["4.05.01.04"] || 0,
    "4.05.02.01": caidasCount["4.05.02.01"] || 0, "4.05.02.02": caidasCount["4.05.02.02"] || 0, "4.05.02.03": caidasCount["4.05.02.03"] || 0, "4.05.02.04": caidasCount["4.05.02.04"] || 0,
    "4.05.03.01": caidasCount["4.05.03.01"] || 0, "4.05.03.02": caidasCount["4.05.03.02"] || 0, "4.05.03.03": caidasCount["4.05.03.03"] || 0, "4.05.03.04": caidasCount["4.05.03.04"] || 0,
    "4.05.04.01": caidasCount["4.05.04.01"] || 0, "4.05.04.02": caidasCount["4.05.04.02"] || 0, "4.05.04.03": caidasCount["4.05.04.03"] || 0, "4.05.04.04": caidasCount["4.05.04.04"] || 0,
    "4.06.01.01": nAc * (largoAco - (P.anchoAnden || 1)) * .56 * (1 - ratioRepTodo) * (P.inclAcom_4060101 !== false ? 1 : 0),
    "4.06.01.02": nAc * (P.anchoAnden || 1) * .56 * (P.inclAcom_4060102 !== false ? 1 : 0),
    "4.06.01.03": ltAc * .56 * Math.min(profProm, 2) * (P.inclAcom_4060103 !== false ? 1 : 0),
    "4.06.01.04": ltAc * Math.PI * Math.pow((P.diamAcom || 160) / 2000, 2) * 1.5 * (P.inclAcom_4060104 !== false ? 1 : 0),
    "4.06.01.05": ltAc * fD * (P.inclAcom_4060105 !== false ? 1 : 0),
    "4.06.01.06": nAc * (P.inclAcom_4060106 !== false ? 1 : 0),
    "4.06.01.07": nAc * (P.inclAcom_4060107 !== false ? 1 : 0),
    "4.06.01.09": ltAc * .56 * Math.min(profProm, 2) * .8 * (P.inclAcom_4060109 !== false ? 1 : 0),
    "4.06.01.10": nAc * (largoAco - (P.anchoAnden || 1)) * .56 * (1 - ratioRepTodo) * (P.inclAcom_4060110 !== false ? 1 : 0),
    "4.06.01.11": nAc * (P.anchoAnden || 1) * .56 * (P.inclAcom_4060111 !== false ? 1 : 0),
    "4.07.01.01": ep2.tJu + sumPdrTot,
    "4.08.01.01": (() => { var r = 0; dN.forEach(t => { if (t.tipoVia === "FX" || !t.tipoVia) r += (t.L || 0) * (t.anchoVia || P.anchoVia || 6); }); return r + sumRotTot; })(),
    "4.08.02.02": uSubBase, "4.08.02.03": uBase, "4.08.03.01": (() => { var r = 0; dN.forEach(t => { if (t.tipoVia === "RG") r += (t.L || 0) * (t.anchoVia || P.anchoVia || 6); }); return r; })(),
    "4.08.03.02": (() => { var r = 0; dN.forEach(t => { if (t.tipoVia === "PP" || t.tipoVia === "AD") r += (t.L || 0) * (t.anchoVia || P.anchoVia || 6); }); return r; })(),
    "4.09.01.02": uSardinel, "4.09.01.01": (() => { var r = 0; dN.forEach(t => { if (t.tipoVia === "AN") r += (t.L || 0) * (t.anchoVia || P.anchoVia || 6); }); return r; })(),
    "5.01.02.01": lt,
    "5.01.03.02": (ep2.tVolDemolicion || 0),
    "5.02.01.01": (ep2.remodelCounts ? ep2.remodelCounts["5.02.01.01"] : 0),
    "5.02.01.02": (ep2.remodelCounts ? ep2.remodelCounts["5.02.01.02"] : 0),
    "5.02.01.03": (ep2.remodelCounts ? ep2.remodelCounts["5.02.01.03"] : 0),
    "5.03.01.01": (() => { var n = 0; if (sumLat) sumLat.forEach(f => { n += f.cant || 0; }); return n; })(),
    "5.03.01.02": (() => { var n = 0; if (sumTrans) sumTrans.forEach(f => { var st = SUM_TYPES_TRANS[f.tipo]; n += (f.cant || 0) * (st ? st.rejas || 5 : 5); }); return n; })(),
    "5.03.02.01": (() => { var n = 0; if (sumLat) sumLat.forEach(f => { n += f.cant || 0; }); return n; })(),
    "5.03.03.01": ep2.nNuevos, "5.03.03.02": (() => { var nSum = 0; if (sumLat) sumLat.forEach(f => { nSum += f.cant || 0; }); if (sumTrans) sumTrans.forEach(f => { nSum += f.cant || 0; }); return nSum; })(),
    "5.05.01.02": Math.ceil(lt / 100) * 2, "5.05.01.03": Math.ceil(lt / 50), "5.05.03.01": ep2.nNuevos * 5,
    "5.07.01.01": (() => { var r = 0; dN.forEach(t => { if (t.tipoVia === "PS") r += (t.L || 0) * (t.anchoVia || P.anchoVia || 6); }); return r; })(),
    "5.08.01.02": repP + sumRellTot,
    "5.09.01.06": Math.ceil(lt / 100) * 2, "5.09.01.07": lt * 4,
  };
  var grp = agruparTuberias(R, sumLat || [], sumTrans || [], P);
  var mmToCode = { "110 mm": "3.02.02.02", "160 mm": "3.02.02.03", "200 mm": "3.02.02.04", "250 mm": "3.02.02.05", "315 mm": "3.02.02.06", "355 mm": "3.02.02.07", "400 mm": "3.02.02.08", "450 mm": "3.02.02.09", "500 mm": "3.02.02.10", "600 mm": "3.02.02.11", "700 mm": "3.02.02.12", "750 mm": "3.02.02.13", "850 mm": "3.02.02.14", "900 mm": "3.02.02.15", "1000 mm": "3.02.02.16" };
  grp.filter(g => (g.red || 0) + (g.sum || 0) > 0).forEach(g => {
    var tc = mmToCode[g.nom]; if (tc) autoMap[tc] = ((g.red || 0) + (g.sum || 0)) * fD;
  });
  if (ltAc > 0) autoMap["4.06.01.05"] = ltAc * fD;

  var updatedPbItems = data.pbItems.map(it => {
    let updated = { ...it };
    if (autoMap[it.c] !== undefined || (updated.auto !== undefined && updated.auto > 0)) {
      var newAuto = autoMap[it.c] !== undefined ? Math.round(autoMap[it.c]) : 0;
      if (it.q === it.auto || it.auto === 0 || it.auto === undefined) {
        updated.q = newAuto;
      }
      updated.auto = newAuto;
    }
    
    // Update descriptions for excavation
    let excMaq = P.nombreExcMaquina !== undefined ? P.nombreExcMaquina : "Excavaciones Sin Acarreo Libre";
    let excMan = P.nombreExcManual !== undefined ? P.nombreExcManual : "Excavaciones Con Acarreo Libre";
    if (it.c.startsWith("2.01.01.") && excMaq) {
      updated.d = updated.d.replace(/Excavaci.*?n(?: a m.*?quina)?/i, excMaq.replace('%', '').trim());
    }
    if (it.c.startsWith("2.01.02.") && excMan) {
      updated.d = updated.d.replace(/Excavaci.*?n(?: a m.*?quina)?(.*?)(?:con acarreo|acarreo)?/i, excMan.replace('%', '').trim() + "$1");
    }
    if (updated.d.toLowerCase().includes("sin acarreo libre") && excMaq) {
      updated.d = updated.d.replace(/sin acarreo libre/ig, excMaq.replace('%', '').trim());
    }
    if (updated.d.toLowerCase().includes("con acarreo libre") && excMan) {
      updated.d = updated.d.replace(/con acarreo libre/ig, excMan.replace('%', '').trim());
    }

    return updated;
  });
  return updatedPbItems;
}

export default function ProjectConsolidatorTab({ lightMode, setR, setP, setT, setAutoAreasPoly, setInpData, setTab, setSumLat, setSumTrans, setPbItems, setAlivData, setSumData, setUrbanismoData, setEstSepData }) {
  const [projectTray, setProjectTray] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [customRows, setCustomRows] = useState([]);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  // Procesa una lista de archivos .amc (desde botón, carpeta completa o arrastrar-y-soltar).
  // Los proyectos se ACUMULAN en la bandeja, así que puedes cargar en tandas desde carpetas distintas.
  const processFiles = (fileArr) => {
    const files = (fileArr || []).filter(f => f && /\.amc$/i.test(f.name));
    if (!files.length) { alert("No se encontraron archivos .amc en la selección."); return; }

    setIsProcessing(true);
    let loadedProjects = [];
    let filesProcessed = 0;

    files.forEach((f) => {
      f.text().then((text) => {
        try {
          const data = JSON.parse(text);
          if (data && data.pbItems && data.P) {

            // Recalculate quantities if they are missing or zero
            var recalcedItems = recalcPbItems(data);

            loadedProjects.push({
              id: Date.now() + Math.random(),
              filename: f.name,
              proyecto: data.P.proyecto || "Desconocido",
              tipoAlc: data.P.tipoAlc === "S" ? "Sanitario" : data.P.tipoAlc === "P" ? "Pluvial" : "Semicombinado",
              costoDirecto: recalcedItems.reduce((acc, it) => acc + (it.q > 0 ? (it.q * it.p) : 0), 0),
              pbItems: recalcedItems,
              P: data.P,
              T: data.T,
              R: data.R,
              autoAreasPoly: data.autoAreasPoly,
              inpData: data.inpData,
              sumLat: data.sumLat,
              sumTrans: data.sumTrans,
              alivData: data.alivData,
              sumData: data.sumData,
              urbanismoData: data.urbanismoData,
              estSepData: data.estSepData
            });
          } else {
            alert(`El archivo ${f.name} no tiene ítems de presupuesto generados. Asegúrate de abrir el archivo en AMCaudales, generar el presupuesto y volverlo a guardar (.amc) antes de consolidarlo.`);
          }
        } catch(err) {
          console.error("Error parsing file", f.name, err);
          alert(`No se pudo leer ${f.name}. ¿Es un archivo .amc válido?`);
        }

        filesProcessed++;
        if (filesProcessed === files.length) {
          setProjectTray(prev => {
            const existentes = new Set(prev.map(p => p.filename));
            const nuevos = loadedProjects.filter(p => !existentes.has(p.filename));
            const dupes = loadedProjects.length - nuevos.length;
            if (dupes > 0) console.warn(`${dupes} archivo(s) ya estaban en la bandeja y se omitieron.`);
            return [...prev, ...nuevos];
          });
          setIsProcessing(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
          if (folderInputRef.current) folderInputRef.current.value = "";
        }
      });
    });
  };

  const handleLoadMultipleAMC = (e) => { processFiles(Array.from(e.target.files || [])); };
  const handleFolderLoad = (e) => { processFiles(Array.from(e.target.files || [])); };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const dt = e.dataTransfer;
    if (!dt) return;
    let files = [];
    if (dt.items && dt.items.length) {
      files = Array.from(dt.items).filter(i => i.kind === "file").map(i => i.getAsFile()).filter(Boolean);
    } else if (dt.files) {
      files = Array.from(dt.files);
    }
    processFiles(files);
  };

  const clearTray = () => {
    if (projectTray.length && window.confirm("¿Vaciar la bandeja de proyectos?")) setProjectTray([]);
  };

  const removeProject = (id) => {
    setProjectTray(projectTray.filter(p => p.id !== id));
  };

  const handleMergeToWorkspace = () => {
    if (projectTray.length === 0) {
      alert("No hay proyectos en la bandeja.");
      return;
    }

    let mergedP = JSON.parse(JSON.stringify(projectTray[0].P || {}));
    if(!mergedP.pozos) mergedP.pozos = [];
    if(!mergedP.verts) mergedP.verts = [];
    if(!mergedP.tr) mergedP.tr = [];
    if(!mergedP.ad) mergedP.ad = [];
    
    let px0 = `[Z1] `;
    mergedP.pozos.forEach(p => { p.Nombre = px0 + p.Nombre; p.IdNodo = px0 + p.IdNodo; });
    mergedP.verts.forEach(p => { p.IDNODO = px0 + p.IDNODO; });
    mergedP.tr.forEach(p => { p.IdNodo = px0 + p.IdNodo; });
    mergedP.ad.forEach(p => { p.IDNODO = px0 + p.IDNODO; });

    let mergedT = [];
    let mergedR = [];
    let mergedAutoAreas = [];
    let mergedInpData = projectTray[0].inpData ? JSON.parse(JSON.stringify(projectTray[0].inpData)) : null;
    let mergedSumLat = [];
    let mergedSumTrans = [];
    let mergedAlivData = [];
    let mergedSumData = [];
    let mergedUrbanismoData = [];
    let mergedEstSepData = {};

    projectTray.forEach((proj, i) => {
      let px = `[Z${i+1}] `;
      
      if (i > 0 && proj.P) {
        if (proj.P.pozos) proj.P.pozos.forEach(p => { let np = {...p, Nombre: px + p.Nombre, IdNodo: px + p.IdNodo}; mergedP.pozos.push(np); });
        if (proj.P.verts) proj.P.verts.forEach(p => { let np = {...p, IDNODO: px + p.IDNODO}; mergedP.verts.push(np); });
        if (proj.P.tr) proj.P.tr.forEach(p => { let np = {...p, IdNodo: px + p.IdNodo}; mergedP.tr.push(np); });
        if (proj.P.ad) proj.P.ad.forEach(p => { let np = {...p, IDNODO: px + p.IDNODO}; mergedP.ad.push(np); });
        
        // Acumular parámetros escalares y cantidades de obra
        mergedP.nAcom06 = (mergedP.nAcom06 || 0) + (proj.P.nAcom06 || 0);
        mergedP.nAcom610 = (mergedP.nAcom610 || 0) + (proj.P.nAcom610 || 0);
        mergedP.nAcom10 = (mergedP.nAcom10 || 0) + (proj.P.nAcom10 || 0);
        mergedP.vallas1 = (mergedP.vallas1 || 0) + (proj.P.vallas1 || 0);
        mergedP.vallas2 = (mergedP.vallas2 || 0) + (proj.P.vallas2 || 0);
        mergedP.vallas3 = (mergedP.vallas3 || 0) + (proj.P.vallas3 || 0);
        mergedP.vallas4 = (mergedP.vallas4 || 0) + (proj.P.vallas4 || 0);
        mergedP.camp1 = (mergedP.camp1 || 0) + (proj.P.camp1 || 0);
        mergedP.camp2 = (mergedP.camp2 || 0) + (proj.P.camp2 || 0);
        mergedP.camp3 = (mergedP.camp3 || 0) + (proj.P.camp3 || 0);
        mergedP.camp4 = (mergedP.camp4 || 0) + (proj.P.camp4 || 0);
        mergedP.frentesObra = (mergedP.frentesObra || 0) + (proj.P.frentesObra || 0);
      }

      if (proj.R) {
        proj.R.forEach(r => {
          let nr = { ...r };
          nr.de = px + nr.de;
          nr.a = px + nr.a;
          if (nr.pozoId) nr.pozoId = px + nr.pozoId;
          mergedR.push(nr);
        });
      }

      if (proj.T) {
        proj.T.forEach(t => {
          let nt = { ...t };
          nt.de = px + nt.de;
          nt.a = px + nt.a;
          if (nt.nombre) nt.nombre = px + nt.nombre;
          nt.id = nt.de + "-" + nt.a;
          mergedT.push(nt);
        });
      }

      if (proj.autoAreasPoly) {
        proj.autoAreasPoly.forEach(a => {
          let na = JSON.parse(JSON.stringify(a));
          if (na.properties) {
            if (na.properties.pozoId) na.properties.pozoId = px + na.properties.pozoId;
            if (na.properties.label) na.properties.label = px + na.properties.label;
            if (na.properties.de) na.properties.de = px + na.properties.de;
            if (na.properties.a) na.properties.a = px + na.properties.a;
          }
          mergedAutoAreas.push(na);
        });
      }

      if (proj.sumLat) proj.sumLat.forEach(s => mergedSumLat.push({ ...s, tr: px + s.tr }));
      if (proj.sumTrans) proj.sumTrans.forEach(s => mergedSumTrans.push({ ...s, de: px + s.de, a: px + s.a }));
      if (proj.alivData) proj.alivData.forEach(a => mergedAlivData.push({ ...a, nodo: px + a.nodo }));
      if (proj.sumData) proj.sumData.forEach(s => mergedSumData.push({ ...s, nodo: px + s.nodo }));
      if (proj.urbanismoData) proj.urbanismoData.forEach(u => mergedUrbanismoData.push({ ...u, de: px + u.de, a: px + u.a, id: px + u.id }));
      if (proj.estSepData) {
        Object.keys(proj.estSepData).forEach(k => {
          mergedEstSepData[px + k] = proj.estSepData[k];
        });
      }
    });

    let mergedPbItemsMap = {};
    projectTray.forEach(proj => {
      if (proj.pbItems) {
        proj.pbItems.forEach(it => {
          if (!mergedPbItemsMap[it.c]) {
            mergedPbItemsMap[it.c] = { ...it, q: 0, auto: 0 };
          }
          mergedPbItemsMap[it.c].q += (it.q || 0);
          mergedPbItemsMap[it.c].auto += (it.auto || 0);
        });
      }
    });
    
    let mergedPbItems = Object.values(mergedPbItemsMap).sort((a,b) => a.c.localeCompare(b.c));

    if (setP) setP(mergedP);
    if (setR) setR(mergedR);
    if (setT) setT(mergedT);
    if (setAutoAreasPoly) setAutoAreasPoly(mergedAutoAreas);
    if (setInpData && mergedInpData) setInpData(mergedInpData);
    if (setSumLat) setSumLat(mergedSumLat);
    if (setSumTrans) setSumTrans(mergedSumTrans);
    if (setAlivData) setAlivData(mergedAlivData);
    if (setSumData) setSumData(mergedSumData);
    if (setUrbanismoData) setUrbanismoData(mergedUrbanismoData);
    if (setEstSepData) setEstSepData(mergedEstSepData);
    if (setPbItems) setPbItems(mergedPbItems); 

    if (setTab) setTab("preGen");
  };

  const handleExportConsolidated = () => {
    if (projectTray.length === 0) {
      alert("No hay proyectos en la bandeja.");
      return;
    }

    // Merge pbItems
    let masterItemsMap = {};
    
    projectTray.forEach(proj => {
      proj.pbItems.forEach(it => {
        if (it.q > 0) {
          if (!masterItemsMap[it.c]) {
            masterItemsMap[it.c] = { ...it, q: 0 };
          }
          masterItemsMap[it.c].q += it.q;
        }
      });
    });

    let mergedItems = Object.values(masterItemsMap).sort((a, b) => a.c.localeCompare(b.c));
    
    const h = [
      ["AMCaudales — PRESUPUESTO CONSOLIDADO MULTI-PROYECTO"],
      ["Proyectos consolidados:"],
      ...projectTray.map(p => ["- " + p.filename + " (" + p.tipoAlc + ")"]),
      [""],
      ["Factores de Costos Indirectos (AUI):", `A:${(masterP.porcAdmin*100).toFixed(1)}%`, `I:${(masterP.porcImprevistos*100).toFixed(1)}%`, `U:${(masterP.porcUtilidad*100).toFixed(1)}%`, `IVA:${(masterP.porcIVA*100).toFixed(1)}%`],
      [""],
      ["CODIGO", "DESCRIPCION", "UNIDAD", "CANTIDAD", "P.UNITARIO", "TOTAL"]
    ];

    let curCh = "";
    mergedItems.forEach(it => {
      let ch = it.c.substring(0, 1);
      if (ch !== curCh) {
        let cn = ch === "1" ? "PRELIMINARES" : ch === "2" ? "MOVIMIENTOS DE TIERRAS" : ch === "3" ? "TUBERIAS Y ACCESORIOS" : ch === "4" ? "ESTRUCTURAS" : ch === "S" ? "SUMINISTROS" : "VARIOS";
        h.push([ch, cn, "", "", "", capTot[ch] || ""]);
        curCh = ch;
      }
      h.push([it.c, it.d, it.u, +it.q.toFixed(2), it.p, Math.round(it.q * it.p)]);
    });

    h.push([]);
    h.push(["", "COSTO DIRECTO OBRA CIVIL", "", "", "", cd]);
    h.push(["", "Administración", "", "", "", admVal]);
    h.push(["", "Imprevistos", "", "", "", impVal]);
    h.push(["", "Utilidad", "", "", "", utVal]);
    h.push(["", "IVA s/Util", "", "", "", ivaVal]);
    h.push(["", "COSTO TOTAL OBRA CIVIL", "", "", "", obraCivil]);
    h.push(["", "Plan Manejo Ambiental (PMA)", "", "", "", pma]);
    h.push(["", "Plan Manejo Tránsito (PMT)", "", "", "", pmt]);
    h.push(["", "COSTO TOTAL OBRA", "", "", "", costoObra]);
    h.push(["", "Interventoría", "", "", "", interObra]);
    h.push(["", "Subtotal Suministros", "", "", "", sumDirecto]);
    h.push(["", "A.I.U Suministros", "", "", "", aiuSum]);
    h.push(["", "Interventoría de Suministros", "", "", "", intSum]);
    h.push(["", "COSTO TOTAL DEL PROYECTO", "", "", "", costoTotalProyecto]);
    
    customRowsVals.forEach(cr => {
      h.push(["", cr.name, "", "", "", cr.calcVal]);
    });
    
    h.push(["", "COSTO TOTAL CONSOLIDADO", "", "", "", totalConsolidado]);

    const ws = XLSX.utils.aoa_to_sheet(h);
    ws["!cols"] = [{ wch: 14 }, { wch: 60 }, { wch: 8 }, { wch: 12 }, { wch: 14 }, { wch: 16 }];
    
    XLSX.utils.book_append_sheet(wb2, ws, "10.Presupuesto");
    XLSX.writeFile(wb2, "Presupuesto_Consolidado.xlsx");
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ color: lightMode ? "#1e293b" : "#e2e8f0", marginBottom: 10 }}>Consolidador Multi-Proyecto</h2>
      <p style={{ color: lightMode ? "#475569" : "#94a3b8", fontSize: 14, marginBottom: 20 }}>
        Carga múltiples archivos <b>.amc</b> que ya tengan su presupuesto calculado. El sistema sumará las cantidades de obra comunes y generará un único archivo Excel con el presupuesto consolidado.
      </p>

      <div
        onDragOver={(e) => { e.preventDefault(); if (!isDragging) setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        onDrop={handleDrop}
        style={{
          marginBottom: 20,
          padding: "16px",
          borderRadius: 12,
          border: isDragging ? "2px dashed #3b82f6" : (lightMode ? "2px dashed #cbd5e1" : "2px dashed rgba(255,255,255,0.15)"),
          background: isDragging ? (lightMode ? "#eff6ff" : "rgba(59,130,246,0.12)") : (lightMode ? "#f8fafc" : "rgba(0,0,0,0.15)"),
          transition: "all .15s ease"
        }}
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button className="btn" onClick={() => { if(fileInputRef.current) fileInputRef.current.click(); }} style={{ padding: "10px 16px", background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "white", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", gap: "8px" }}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            Cargar Archivos .AMC
          </button>
          <button className="btn" onClick={() => { if(folderInputRef.current) folderInputRef.current.click(); }} title="Escanea todos los .amc dentro de una carpeta (y subcarpetas)" style={{ padding: "10px 16px", background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "white", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", gap: "8px" }}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>
            Cargar Carpeta Completa
          </button>
          <button className="btn" onClick={handleMergeToWorkspace} style={{ padding: "10px 16px", background: "linear-gradient(135deg, #10b981, #059669)", color: "white", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", gap: "8px" }}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Fusionar y Configurar Presupuesto (Recomendado)
          </button>
          <button className="btn" onClick={handleExportConsolidated} style={{ padding: "10px 16px", background: "linear-gradient(135deg, #6b7280, #4b5563)", color: "white", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", gap: "8px", fontSize: 11 }}>
            Exportar Consolidado Rápido (Solo XLSX)
          </button>
          {isProcessing && <span style={{ color: lightMode ? "#2563eb" : "#60a5fa", fontSize: 13, fontWeight: "bold" }}>Procesando archivos…</span>}
          <input ref={fileInputRef} type="file" multiple accept=".amc" style={{ display: "none" }} onChange={handleLoadMultipleAMC} />
          <input ref={folderInputRef} type="file" multiple webkitdirectory="" directory="" style={{ display: "none" }} onChange={handleFolderLoad} />
        </div>
        <p style={{ margin: "12px 4px 0", color: lightMode ? "#64748b" : "#94a3b8", fontSize: 13 }}>
          {isDragging
            ? "Suelta aquí los archivos .amc para agregarlos a la bandeja."
            : "No necesitan estar en la misma carpeta: arrastra y suelta archivos .amc aquí, o cárgalos en tandas desde carpetas distintas — se van acumulando en la bandeja. También puedes escanear una carpeta completa."}
        </p>
      </div>

      {projectTray.length > 0 ? (
        <div style={{ background: lightMode ? "#f8fafc" : "rgba(0,0,0,0.2)", borderRadius: 8, padding: 15, border: lightMode ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "0 0 15px 0" }}>
            <h3 style={{ margin: 0, fontSize: 16, color: lightMode ? "#334155" : "#cbd5e1" }}>Proyectos en la Bandeja ({projectTray.length})</h3>
            <button onClick={clearTray} title="Vaciar la bandeja" style={{ padding: "5px 12px", background: "transparent", color: "#ef4444", border: "1px solid #ef4444", borderRadius: 6, fontSize: 12, fontWeight: "bold", cursor: "pointer" }}>Limpiar bandeja</button>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: lightMode ? "1px solid #cbd5e1" : "1px solid rgba(255,255,255,0.1)", color: lightMode ? "#64748b" : "#94a3b8" }}>
                <TH style={{ padding: "8px" }}>Archivo</TH>
                <TH style={{ padding: "8px" }}>Nombre Proyecto</TH>
                <TH style={{ padding: "8px" }}>Tipo</TH>
                <TH style={{ padding: "8px", textAlign: "right" }}>Costo Directo</TH>
                <TH style={{ padding: "8px", textAlign: "center" }}>Acción</TH>
              </tr>
            </thead>
            <tbody>
              {projectTray.map((p, idx) => (
                <tr key={p.id} style={{ borderBottom: lightMode ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.05)", background: idx % 2 === 1 ? (lightMode ? "#f1f5f9" : "rgba(255,255,255,0.03)") : "transparent" }}>
                  <td style={{ padding: "10px 8px", color: lightMode ? "#0f172a" : "#f1f5f9" }}>{p.filename}</td>
                  <td style={{ padding: "10px 8px", color: lightMode ? "#334155" : "#cbd5e1" }}>{p.proyecto}</td>
                  <td style={{ padding: "10px 8px" }}>
                    <span style={{ 
                      background: p.tipoAlc === 'Pluvial' ? (lightMode ? "#e0f2fe" : "rgba(14,165,233,0.2)") : p.tipoAlc === 'Sanitario' ? (lightMode ? "#fef08a" : "rgba(234,179,8,0.2)") : (lightMode ? "#dcfce3" : "rgba(34,197,94,0.2)"), 
                      color: p.tipoAlc === 'Pluvial' ? (lightMode ? "#0284c7" : "#38bdf8") : p.tipoAlc === 'Sanitario' ? (lightMode ? "#a16207" : "#fde047") : (lightMode ? "#166534" : "#4ade80"), 
                      padding: "3px 8px", 
                      borderRadius: 12, 
                      fontSize: 12 
                    }}>
                      {p.tipoAlc}
                    </span>
                  </td>
                  <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: "bold", color: lightMode ? "#0f172a" : "#f1f5f9" }}>
                    ${Math.round(p.costoDirecto).toLocaleString('es-CO')}
                  </td>
                  <td style={{ padding: "10px 8px", textAlign: "center" }}>
                    <button 
                      onClick={() => removeProject(p.id)}
                      style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16 }}
                      title="Quitar"
                    >
                      ✖
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="3" style={{ padding: "15px 8px", textAlign: "right", fontWeight: "bold", color: lightMode ? "#0f172a" : "#e2e8f0" }}>Suma de Costos Directos:</td>
                <td style={{ padding: "15px 8px", textAlign: "right", fontWeight: "bold", fontSize: 16, color: lightMode ? "#059669" : "#10b981" }}>
                  ${Math.round(projectTray.reduce((acc, p) => acc + p.costoDirecto, 0)).toLocaleString('es-CO')}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "40px", border: lightMode ? "2px dashed #cbd5e1" : "2px dashed rgba(255,255,255,0.1)", borderRadius: 12, color: lightMode ? "#94a3b8" : "#64748b" }}>
          <div style={{ fontSize: 15, fontWeight: "bold", marginBottom: 6, color: lightMode ? "#64748b" : "#94a3b8" }}>La bandeja está vacía</div>
          Arrastra y suelta tus archivos <b>.amc</b> aquí arriba, o usa "Cargar Archivos .AMC" / "Cargar Carpeta Completa". Puedes traerlos de carpetas distintas: se acumulan.
        </div>
      )}

      {projectTray.length > 0 && (
        <div style={{ background: lightMode ? "#f8fafc" : "rgba(0,0,0,0.2)", borderRadius: 8, padding: 15, border: lightMode ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.1)", marginTop: 20 }}>
          <h3 style={{ margin: "0 0 10px 0", fontSize: 15, color: lightMode ? "#334155" : "#cbd5e1" }}>Filas Extras al Final (Ej: Pólizas, Gastos Legales)</h3>
          <p style={{ color: lightMode ? "#64748b" : "#94a3b8", fontSize: 13, marginBottom: 10 }}>Estas filas se añadirán en el Excel exportado sumando al Costo Total del Proyecto.</p>
          {customRows.map((cr, idx) => (
            <div key={cr.id} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
              <input type="text" value={cr.name} onChange={e => {
                const nw = [...customRows]; nw[idx].name = e.target.value; setCustomRows(nw);
              }} placeholder="Nombre del concepto" style={{ flex: 1, padding: "6px", borderRadius: 4, border: "1px solid #cbd5e1" }} />
              <select value={cr.type} onChange={e => {
                const nw = [...customRows]; nw[idx].type = e.target.value; setCustomRows(nw);
              }} style={{ padding: "6px", borderRadius: 4, border: "1px solid #cbd5e1" }}>
                <option value="fixed">Valor Fijo ($)</option>
                <option value="percentCD">% del Costo Directo</option>
                <option value="percentTotal">% del Costo Total</option>
              </select>
              <input type="number" step="any" value={cr.value} onChange={e => {
                const nw = [...customRows]; nw[idx].value = e.target.value; setCustomRows(nw);
              }} placeholder="Valor" style={{ width: 120, padding: "6px", borderRadius: 4, border: "1px solid #cbd5e1" }} />
              <button onClick={() => {
                setCustomRows(customRows.filter((_, i) => i !== idx));
              }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}>&times;</button>
            </div>
          ))}
          <button className="btn" onClick={() => {
            setCustomRows([...customRows, { id: Date.now(), name: "Nuevo Concepto", type: "percentCD", value: 0 }]);
          }} style={{ padding: "6px 12px", background: "#3b82f6", color: "white", border: "none", borderRadius: "4px", fontSize: 12, cursor: "pointer" }}>+ Añadir Fila Extra</button>
        </div>
      )}
    </div>
  );
}




