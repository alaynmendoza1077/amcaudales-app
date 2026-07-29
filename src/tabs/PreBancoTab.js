import React, {useState, useEffect, useRef} from 'react';
import {TH, fm} from '../ui';
import * as XLSX from 'xlsx';
import {SUM_TYPES, SUM_TYPES_TRANS, PRECIOS_TUB, CAPNAMES} from '../constants';
import {gDe} from '../engine';
import {agruparTuberias, calcVallasAuto, calcPozosCompleto, calcCantSumidero} from '../calcHelpers';
import {parsePtoBase} from '../parsers';
import PTOBANCO_DATA from '../ptoBancoData';
import { exportBancoExcel } from '../exportBanco';

function PreBancoTab(props){
  var R=props.R,P=props.P,T=props.T,sumLat=props.sumLat,sumTrans=props.sumTrans;
  var pbItems=props.pbItems,setPbItems=props.setPbItems;
  var dR=R.filter(function(r){return !r.sep;});
  var dN=dR.filter(function(r){return r.reponer==="S";});
  var sFilt=useState("used");var filt=sFilt[0],setFilt=sFilt[1];
  var sSearch=useState("");var search=sSearch[0],setSearch=sSearch[1];
  var refPB=useRef(null);
  var generify = function(txt) {
    if(!txt) return "";
    return txt
      .replace(/EMPAS SA ESP/gi, "Entidad Pública")
      .replace(/\(especificación EMPAS\)/gi, "(Normativa Vigente)")
      .replace(/especificación EMPAS/gi, "Normativa Vigente")
      .replace(/EMPAS/gi, "Entidad")
      .replace(/Suministro e instalación/gi, "Provisión e instalación")
      .replace(/Suministro y colocación/gi, "Provisión y conformación")
      .replace(/Suministro y aplicación/gi, "Provisión y aplicación")
      .replace(/Suministro/gi, "Provisión")
      .replace(/cámara de inspección/gi, "pozo de visita")
      .replace(/Cámara de inspección/gi, "Pozo de visita")
      .replace(/Tubería/gi, "Tubo")
      .replace(/tubería/gi, "tubo")
      .replace(/Silla Yee/gi, "Derivación Y")
      .replace(/silla yee/gi, "derivación y")
      .replace(/Concreto/gi, "Hormigón")
      .replace(/concreto/gi, "hormigón")
      .replace(/Acometida/gi, "Conexión domiciliaria")
      .replace(/acometida/gi, "conexión domiciliaria")
      .replace(/caja de inspección/gi, "caja de paso")
      .replace(/Caja de inspección/gi, "caja de paso");
  };

  var handleExportBancoOriginal = null; // Removed broken duplicate
  useEffect(function(){
    if(pbItems.length===0&&PTOBANCO_DATA&&PTOBANCO_DATA.length>0){
      if(typeof setPbItems !== 'function') return;
      var pb=PTOBANCO_DATA.map(function(it){return{c:it.c,d:generify(it.d),u:it.u,p:it.p,lv:it.lv,q:0,auto:0};});
      setPbItems(pb);
    }
  },[pbItems.length]);
  if(!dR.length&&pbItems.length===0)return <div className="c"><p style={{color:"#7088A8"}}>Cargue datos y/o PtoBase</p></div>;
  var lt=dN.reduce(function(s,r){return s+(r.Le||r.L||0);},0);
  var tE=dN.reduce(function(s,r){return s+(r.volE||0);},0);
  var t025=dN.reduce(function(s,r){return s+(r.v025||0);},0);
  var t2550=dN.reduce(function(s,r){return s+(r.v2550||0);},0);
  var t50p=dN.reduce(function(s,r){return s+(r.v50p||0);},0);
  var tArena=dN.reduce(function(s,r){return s+(r.rArena||0);},0);
  var tComun=dN.reduce(function(s,r){return s+(r.rComun||0);},0);
  /* totales sumideros */
  var sumExcLat=0,sumExcTrans=0,sumRellLat=0,sumRellTrans=0,sumConcLat=0,sumConcTrans=0;
  var sumRotLat=0,sumRotTrans=0,sumA37Lat=0,sumA37Trans=0,sumPdrLat=0,sumPdrTrans=0;
  var sumCimLat=0,sumCimTrans=0;
  if(sumLat)sumLat.forEach(function(f){if((f.cant||0)>0){var c=calcCantSumidero(f, P);sumExcLat+=c.totExc||0;sumRellLat+=c.rell||0;sumConcLat+=c.c4||0;sumRotLat+=(c.rot||0);sumA37Lat+=(c.a37||0);sumPdrLat+=(c.pdr||0);sumCimLat+=(c.cim||0);}});
  if(sumTrans)sumTrans.forEach(function(f){if((f.cant||0)>0){var c=calcCantSumidero(f, P);sumExcTrans+=c.totExc||0;sumRellTrans+=c.rell||0;sumConcTrans+=c.c4||0;sumRotTrans+=(c.rot||0);sumA37Trans+=(c.a37||0);sumPdrTrans+=(c.pdr||0);sumCimTrans+=(c.cim||0);}});
  var sumExcTot=sumExcLat+sumExcTrans;
  var sumRotTot=sumRotLat+sumRotTrans;
  var sumConcTot=sumConcLat+sumConcTrans;
  var sumA37Tot=sumA37Lat+sumA37Trans;
  var sumPdrTot=sumPdrLat+sumPdrTrans;
  var sumRellTot=sumRellLat+sumRellTrans;
  var sumCimTot=sumCimLat+sumCimTrans;
  var nSet={};dN.forEach(function(r){nSet[r.de]=1;nSet[r.a]=1;});var nP=Object.keys(nSet).length;
  var largoAco = P.largoAco || 6;
  var nAc=(P.nAcom06||0)+(P.nAcom610||0)+(P.nAcom10||0);
  var ltAc=(P.nAcom06||0)*largoAco+(P.nAcom610||0)*(largoAco+2)+(P.nAcom10||0)*(largoAco+6);
  var rotP=dN.reduce(function(s,r){return s+(r.rotP||0);},0);
  var calcProfProm=dN.length>0?dN.reduce(function(s,r){return s+((+r.profE||0)+(+r.profS||0))/2;},0)/dN.length:1.5;
  var profProm=P.profProm!==undefined?P.profProm:calcProfProm;
  var repP=dN.reduce(function(s,r){return s+(r.repP||0);},0);
  var tLe=dN.reduce(function(s,r){return s+(r.Le||0);},0);
  var ep2=calcPozosCompleto(R,T,P);var nPN=ep2.pz.length;
  
  var caidasCount = {
    "4.05.01.01": 0, "4.05.01.02": 0, "4.05.01.03": 0, "4.05.01.04": 0,
    "4.05.02.01": 0, "4.05.02.02": 0, "4.05.02.03": 0, "4.05.02.04": 0,
    "4.05.03.01": 0, "4.05.03.02": 0, "4.05.03.03": 0, "4.05.03.04": 0,
    "4.05.04.01": 0, "4.05.04.02": 0, "4.05.04.03": 0, "4.05.04.04": 0
  };
  if (ep2 && ep2.pz) {
    ep2.pz.forEach(function(p){
      if (p.pozoNuevo === "S" && p.caidas && p.caidas.length > 0) {
        p.caidas.forEach(function(c){
          var diam = c.diam || 200;
          var h = p.prof || 1.5;
          var dPrefix = "4.05.01";
          if (diam <= 200) dPrefix = "4.05.01";
          else if (diam <= 250) dPrefix = "4.05.02";
          else if (diam <= 315) dPrefix = "4.05.03";
          else dPrefix = "4.05.04";
          
          var hSuffix = "01";
          if (h <= 2) hSuffix = "01";
          else if (h <= 4) hSuffix = "02";
          else if (h <= 6) hSuffix = "03";
          else hSuffix = "04";
          
          var fullCode = dPrefix + "." + hSuffix;
          caidasCount[fullCode] = (caidasCount[fullCode] || 0) + 1;
        });
      }
    });
  }

  var pT=P.porcExcTierra||.55,pG=P.porcExcGranular||.30,pR=P.porcExcRoca||.15;
  var pAL=P.porcAcarreoLibre||.5,fE=P.porcExpansion||.05;
  var vaP=calcVallasAuto(R,pbItems);
  var FO=P.frentesObra||1;
  var nEst=P.distBotadero||8;
  var pA200=P.porcAcarreo200||.10;
  var pA500=P.porcAcarreo500||0;
  var pA1000=P.porcAcarreo1000||.90;
  var nTramRep=dN.length;
  /* desperdicio (factor >= 1) */
  var fD=1+(P.porcDesperdicio||0);
  /* campamentos automáticos: mismo criterio que vallas */
  var campAuto=calcVallasAuto(R,pbItems);
  /* acarreos */
  var excTtl=(tE+ep2.tVE+sumExcTot);
  var reutTtl=excTtl*(pT*(P.porcAprovTierra||.5)+pG*(P.porcAprovGranular||.5)+pR*(P.porcAprovRoca||0));
  var demolTtl=(rotP*0.15);
  var rellN_Tramos = tComun + sumRellTot;
  var matSobrExc = (excTtl-reutTtl) + Math.max(0, reutTtl - rellN_Tramos);
  var msSobrante = matSobrExc + demolTtl;
  /* entibado: Le × HP × 2 caras */
  var tEntibado=dN.reduce(function(s,r){return s+(r.Le||0)*((+r.profE||0)+(+r.profS||0))/2*2;},0)*(P.porcEntibado||1);

  var autoMap={
    "1.01":lt, 
    "1.02":sumRotTot,
    /* Vallas: los items con codigo 1.01.01.01-04 o descripcion que contenga 'valla' se mapean según calcVallasAuto */
    "1.01.01.01":vaP.v1,
    "1.01.01.02":vaP.v2,
    "1.01.01.03":vaP.v3,
    "1.01.01.04":vaP.v4,
    /* Campamentos: misma lógica */
    "1.01.02.01":campAuto.v1,
    "1.01.02.02":campAuto.v2,
    "1.01.02.03":campAuto.v3,
    "1.01.02.04":campAuto.v4,
    "2.01":(t025+ep2.v025+sumExcTot), 
    "2.02":(t2550+ep2.v2550), 
    "2.03":t50p, 
    "2.04":tEntibado, 
    "2.05":tComun+sumRellTot, 
    "2.06":tComun*0.2, 
    "2.07":tArena+sumCimTot, 
    "2.08":tComun*0.1, 
    "3.01":ep2.tAK+sumA37Tot, 
    "3.02":0, 
    "3.03":0,
    "3.04":ep2.tVC+sumConcTot, 
    "4.01":function(){var r=0;dN.forEach(function(t){if(t.nom==='6"'||t.nom==="160")r+=t.L||0;});return r;}(),
    "4.02":function(){var r=0;dN.forEach(function(t){if(t.nom==='8"'||t.nom==="200")r+=t.L||0;});return r;}(),
    "4.03":function(){var r=0;dN.forEach(function(t){if(t.nom==='10"'||t.nom==="250")r+=t.L||0;});return r;}(),
    "4.04":function(){var r=0;dN.forEach(function(t){if(t.nom==='12"'||t.nom==="315")r+=t.L||0;});return r;}(),
    "4.05":function(){var r=0;dN.forEach(function(t){if(t.nom==='14"'||t.nom==="355")r+=t.L||0;});return r;}(),
    "4.06":function(){var r=0;dN.forEach(function(t){if(t.nom==='18"'||t.nom==="450")r+=t.L||0;});return r;}(),
    "4.07":function(){var r=0;dN.forEach(function(t){if(t.nom==='20"'||t.nom==="500")r+=t.L||0;});return r;}(),
    "4.08":nAc,
    "5.01":0,"5.02":0,"5.03":0,"5.04":0,"5.05":0,"5.06":0,"5.07":0,"5.08":0,"5.09":0,"5.10":0,"5.11":0,"5.12":0,
    "6.01":sumLat?sumLat.length:0,
    "6.02":sumTrans?sumTrans.length:0,
    "8.01":msSobrante
  };
  /* También mapear por descripción: items cuya descripción incluya "valla" se mapean por tipo */
  if(pbItems.length > 0) {
    pbItems.forEach(function(it) {
      if(it.lv >= 3 && it.d) {
        var dl = it.d.toLowerCase();
        if(dl.includes('valla') || dl.includes('señal informativa')) {
          /* Determinar tipo por descripción */
          if(dl.includes('tipo 1') || dl.includes('>') && dl.includes('10.000')) { autoMap[it.c] = vaP.v1; }
          else if(dl.includes('tipo 2') || (dl.includes('5') && dl.includes('10.000'))) { autoMap[it.c] = vaP.v2; }
          else if(dl.includes('tipo 3') || (dl.includes('1.000') && dl.includes('5.000'))) { autoMap[it.c] = vaP.v3; }
          else if(dl.includes('tipo 4') || dl.includes('< 1.000') || dl.includes('<1.000')) { autoMap[it.c] = vaP.v4; }
          /* Fallback: cualquier otra valla usa v4 (menor costo) como default */
          else if(!(it.c in autoMap)) { autoMap[it.c] = vaP.v4; }
        }
        if(dl.includes('campamento')) {
          if(dl.includes('tipo 1') || dl.includes('90 m')) { autoMap[it.c] = campAuto.v1; }
          else if(dl.includes('tipo 2') || dl.includes('70 m')) { autoMap[it.c] = campAuto.v2; }
          else if(dl.includes('tipo 3') || dl.includes('50 m')) { autoMap[it.c] = campAuto.v3; }
          else if(dl.includes('tipo 4') || dl.includes('30 m')) { autoMap[it.c] = campAuto.v4; }
        }
      }
    });
  }
  var grp=agruparTuberias(R,sumLat||[],sumTrans||[],P);
  var mmToCode={"160 mm":"S1.01","200 mm":"S1.02","250 mm":"S1.03","315 mm":"S1.04","450 mm":"S1.05","500 mm":"S1.06","355 mm":"S1.08"};
  grp.filter(function(g){return (g.red||0)+(g.sum||0)>0;}).forEach(function(g){
    var tc=mmToCode[g.nom];if(tc)autoMap[tc]=((g.red||0)+(g.sum||0))*fD;
  });

  var autoRef={};
  grp.filter(function(g){return (g.red||0)+(g.sum||0)>0;}).forEach(function(g){
    var tc=mmToCode[g.nom];if(tc)autoRef[tc]="(Red:"+Math.round(g.red||0)+"m + Sum:"+Math.round(g.sum||0)+"m × fDesp)";
  });

  if(pbItems.length>0){
    pbItems.forEach(function(it){
      if(autoMap[it.c]!==undefined){
        var newAuto=Math.round(autoMap[it.c]);
        if(it.q===it.auto||it.auto===0){it.q=newAuto;}
        it.auto=newAuto;
      }
    });
  }
  var handleLoadPB=function(e){var f=e.target.files[0];if(!f)return;f.arrayBuffer().then(function(buf){
    var pb=parsePtoBase(new Uint8Array(buf));
    pb.forEach(function(it){
      it.d = generify(it.d);
      if(autoMap[it.c]!==undefined)it.q=Math.round(autoMap[it.c]);
      it.auto=it.q;
    });
    setPbItems(pb);
  });};
  var updQ=function(i,v){var n=pbItems.slice();n[i]=Object.assign({},n[i]);n[i].q=v;setPbItems(n);};
  var updD=function(i,v){var n=pbItems.slice();n[i]=Object.assign({},n[i]);n[i].d=v;setPbItems(n);};
  var items=pbItems;
  var leafs=items.filter(function(it){return it.lv>=3;});
  var used=leafs.filter(function(it){return it.q>0;});
  var shown=filt==="all"?leafs:filt==="used"?used:leafs;
  if(search){var sl=search.toLowerCase();shown=shown.filter(function(it){return it.c.includes(sl)||it.d.toLowerCase().includes(sl);});}
  var cd=0;var capTot={};
  leafs.forEach(function(it){
    if(it.q>0&&it.p>0){
      var v=Math.round(it.q*it.p);
      if(!it.c.startsWith("S")) cd+=v;
      var ch=it.c.substring(0,1);
      capTot[ch]=(capTot[ch]||0)+v;
    }
  });
  var adm=Math.round(cd*(P.porcAdmin||.29)),imp=Math.round(cd*(P.porcImprevistos||.01));
  var ut=Math.round(cd*(P.porcUtilidad||.05)),iva=Math.round(ut*(P.porcIVA||.19));var tot=cd+adm+imp+ut+iva;
  
  var handleExportBanco = () => {
    import('../tabs/ProjectConsolidatorTab').then(({ recalcPbItems }) => {
      var data = { v: "v36", P: P, T: T, sumLat: sumLat, sumTrans: sumTrans, pbItems: pbItems, R: R, urbanismoData: props.urbanismoData };
      var freshPbItems = recalcPbItems(data);
      var freshShown = freshPbItems.filter(function(it){return it.q>0;});

      var sumDirecto = 0;
      var cdTotal = 0;
      var capTotFresh = {};
      freshShown.forEach(function(it) {
        var partial = Math.round(it.q * it.p);
        if (it.c.startsWith("S")) {
            sumDirecto += partial;
        } else {
            cdTotal += partial;
        }
        var ch=it.c.substring(0,1);
        capTotFresh[ch]=(capTotFresh[ch]||0)+partial;
      });

      var pma = (P.reqPMA === "N" || P.reqPMA === false) ? 0 : cdTotal * (P.porcPMA !== undefined ? P.porcPMA : 0.025525);
      var pmt = (P.reqPMT === "N" || P.reqPMT === false) ? 0 : cdTotal * (P.porcPMT !== undefined ? P.porcPMT : 0.051068);
      var adm = cdTotal * (P.porcAdmin || 0.29);
      var imp = cdTotal * (P.porcImprevistos || 0.01);
      var ut = cdTotal * (P.porcUtilidad || 0.05);
      var iva = ut * (P.porcIVA || 0.19);
      var totObraCivil = cdTotal + adm + imp + ut + iva;
      var totObra = totObraCivil + pma + pmt;
      
      import('../exportBanco').then(m => m.exportBancoExcel(P, freshShown, capTotFresh, cdTotal, adm, imp, ut, pma, pmt, sumDirecto, lt, freshPbItems));
    });
  };
  
  return <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: '"Inter", sans-serif' }}>
    <div style={{ background: "linear-gradient(135deg, #1e3a8a, #3b82f6)", color: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}>
      <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "bold" }}>Presupuesto General (Formato Libre)</h2>
      <p style={{ margin: "5px 0 0 0", opacity: 0.8 }}>Presupuesto intercambiable sin ataduras a formatos oficiales, ideal para revisión gerencial y control de obra.</p>
    </div>
    
    {cd > 0 && (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
        <div style={{ background: "#ffffff", color: "#1f2937", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)", borderLeft: "5px solid #10b981" }}>
          <div style={{ fontSize: "0.85rem", textTransform: "uppercase", fontWeight: "bold", color: "#6b7280" }}>Costo Directo</div>
          <div style={{ fontSize: "1.8rem", fontWeight: "900", marginTop: "5px" }}>{fm(cd)}</div>
        </div>
        <div style={{ background: "#ffffff", color: "#1f2937", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)", borderLeft: "5px solid #f59e0b" }}>
          <div style={{ fontSize: "0.85rem", textTransform: "uppercase", fontWeight: "bold", color: "#6b7280" }}>Costo AIU + IVA</div>
          <div style={{ fontSize: "1.8rem", fontWeight: "900", marginTop: "5px" }}>{fm(adm+imp+ut+iva)}</div>
        </div>
        <div style={{ background: "#ffffff", color: "#1f2937", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)", borderLeft: "5px solid #3b82f6" }}>
          <div style={{ fontSize: "0.85rem", textTransform: "uppercase", fontWeight: "bold", color: "#6b7280" }}>Costo Total Obra</div>
          <div style={{ fontSize: "1.8rem", fontWeight: "900", marginTop: "5px", color: "#1e40af" }}>{fm(tot)}</div>
        </div>
        <div style={{ background: "#ffffff", color: "#1f2937", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)", borderLeft: "5px solid #8b5cf6" }}>
          <div style={{ fontSize: "0.85rem", textTransform: "uppercase", fontWeight: "bold", color: "#6b7280" }}>Índice por Metro Lineal</div>
          <div style={{ fontSize: "1.8rem", fontWeight: "900", marginTop: "5px" }}>{fm(Math.round(tot/(lt||1)))}</div>
        </div>
      </div>
    )}

    <div style={{ background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)", color: "#1f2937" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h3 style={{ margin: 0, color: "#111827" }}>Desglose por Capítulos</h3>
        <button className="btn" onClick={handleExportBanco} style={{ padding: "8px 16px", background: "#10b981", color: "white", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
          Exportar Presupuesto Banco
        </button>
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {["1","2","3","4","5","6","7","8","S"].map(function(ch) {
          var names = {"1": "PRELIMINARES", "2": "MOV. TIERRA", "3": "CONCRETOS", "4": "TUBERÍAS", "5": "POZOS", "6": "SUMIDEROS", "7": "URBANISMO", "8": "ASEO", "S": "SUMINISTROS"};
          var colors = {"1": "#64748b", "2": "#d97706", "3": "#0284c7", "4": "#4f46e5", "5": "#059669", "6": "#8b5cf6", "7": "#ec4899", "8": "#64748b", "S": "#f43f5e"};
          var cTotal = capTot[ch] || 0;
          var baseTotal = ch === "S" ? (capTot["S"] || 0) : cd;
          var pct = baseTotal > 0 ? ((cTotal / baseTotal) * 100).toFixed(1) : 0;
          
          return (
            <div key={ch} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "15px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "15px", flex: 1 }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: colors[ch], color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "1.2rem" }}>
                  {ch}
                </div>
                <div>
                  <div style={{ fontWeight: "bold", color: "#334155" }}>{names[ch]}</div>
                  <div style={{ fontSize: "0.85rem", color: "#64748b" }}>Capítulo {ch}</div>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ height: "8px", background: "#e2e8f0", borderRadius: "4px", overflow: "hidden", width: "100%", maxWidth: "300px" }}>
                  <div style={{ height: "100%", background: colors[ch], width: `${pct}%` }}></div>
                </div>
              </div>
              <div style={{ textAlign: "right", minWidth: "150px" }}>
                <div style={{ fontWeight: "900", color: "#1e293b", fontSize: "1.1rem" }}>{fm(cTotal)}</div>
                <div style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: "bold" }}>{pct}% del {ch==="S"?"Suministro":"C.D."}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
    
    <div style={{ background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)", color: "#1f2937", marginBottom: "30px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h3 style={{ margin: 0, color: "#111827" }}>Cantidades Principales (Editable)</h3>
        <div style={{ display: "flex", gap: "10px" }}>
           <button onClick={() => setFilt(filt === 'all' ? 'used' : 'all')} style={{ padding: "8px 16px", background: filt === 'all' ? "#f59e0b" : "#3b82f6", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
             {filt === 'all' ? "Ver Solo Usadas" : "Ver Todas"}
           </button>
           <button onClick={handleExportBanco} style={{ padding: "8px 16px", background: "#10b981", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
             Exportar Excel Banco
           </button>
           <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", width: "200px", color: "black", background: "white" }} />
           <button onClick={() => refPB.current && refPB.current.click()} style={{ padding: "8px 16px", background: "#334155", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>Importar Precios XLSM</button>
           <input ref={refPB} type="file" accept=".xlsm,.xlsx" style={{display:"none"}} onChange={handleLoadPB}/>
        </div>
      </div>
      
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "#f1f5f9", color: "#475569", fontSize: "0.85rem", textTransform: "uppercase" }}>
              <TH style={{ padding: "12px 15px", borderBottom: "2px solid #cbd5e1" }}>Ítem</TH>
              <TH style={{ padding: "12px 15px", borderBottom: "2px solid #cbd5e1", minWidth: "450px" }}>Descripción</TH>
              <TH style={{ padding: "12px 15px", borderBottom: "2px solid #cbd5e1" }}>Und</TH>
              <TH style={{ padding: "12px 15px", borderBottom: "2px solid #cbd5e1", width: "100px" }}>Cantidad</TH>
              <TH style={{ padding: "12px 15px", borderBottom: "2px solid #cbd5e1", width: "130px" }}>Precio Unitario</TH>
              <TH style={{ padding: "12px 15px", borderBottom: "2px solid #cbd5e1", textAlign: "right" }}>Total</TH>
            </tr>
          </thead>
          <tbody>
            {shown.map(function(it, idx){
              var ri = items.indexOf(it);
              var total = Math.round((it.q || 0) * (it.p || 0));
              var isUsed = it.q > 0;
              if(!isUsed && filt === "used") return null;
              
              return (
                <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0", background: isUsed ? "#ffffff" : "#f8fafc", opacity: isUsed ? 1 : 0.6 }}>
                  <td style={{ padding: "10px 15px", fontSize: "0.9rem", color: "#64748b", fontWeight: "bold" }}>{it.c}</td>
                  <td style={{ padding: "6px 15px" }}>
                    <input type="text" value={it.d || ""} onChange={e => updD(ri, e.target.value)} style={{ width: "100%", padding: "6px", border: "1px solid transparent", borderRadius: "4px", fontSize: "0.9rem", color: "#334155", background: "transparent", transition: "border 0.2s" }} onFocus={e => {e.target.style.border="1px solid #cbd5e1"; e.target.style.background="#fff"}} onBlur={e => {e.target.style.border="1px solid transparent"; e.target.style.background="transparent"}} title="Click para editar descripción" />
                  </td>
                  <td style={{ padding: "10px 15px", fontSize: "0.9rem", color: "#64748b" }}>{it.u}</td>
                  <td style={{ padding: "6px 15px" }}>
                    <input type="number" value={it.q || ""} onChange={e => updQ(ri, +e.target.value)} style={{ width: "100%", padding: "6px", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "0.9rem", color: "black", background: "white" }} />
                  </td>
                  <td style={{ padding: "10px 15px", fontSize: "0.9rem", color: "#0f172a" }}>{it.p > 0 ? "$" + it.p.toLocaleString("es-CO") : "-"}</td>
                  <td style={{ padding: "10px 15px", fontSize: "0.95rem", color: "#059669", fontWeight: "bold", textAlign: "right" }}>{total > 0 ? "$" + total.toLocaleString("es-CO") : "-"}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            {cd > 0 && (() => {
              var admVal = cd * (P.porcAdmin || 0.29);
              var impVal = cd * (P.porcImprevistos || 0.01);
              var utVal = cd * (P.porcUtilidad || 0.05);
              var ivaVal = utVal * (P.porcIVA || 0.19);
              var pma = (P.reqPMA === "N" || P.reqPMA === false) ? 0 : cd * (P.porcPMA !== undefined ? P.porcPMA : 0.025525);
              var pmt = (P.reqPMT === "N" || P.reqPMT === false) ? 0 : cd * (P.porcPMT !== undefined ? P.porcPMT : 0.051068);
              var obraCivil = cd + admVal + impVal + utVal + ivaVal;
              var costoObra = obraCivil + pma + pmt;
              var interObra = (P.reqInterventoria !== "N" && P.reqInterventoria !== false) ? (costoObra + (capTot["S"] || 0) + ((capTot["S"] || 0) * 0.291)) * (P.porcInterventoria !== undefined ? P.porcInterventoria : 0.08) : 0;
              
              var sumDirecto = capTot["S"] || 0;
              var aiuSum = sumDirecto * 0.291;
              var intSum = 0;
              var costoSuministros = sumDirecto + aiuSum + intSum;
              var costoTotalProyecto = costoObra + interObra + costoSuministros;
              
              return (
              <>
                <tr style={{ background: "#f8fafc", fontWeight: "bold", borderTop: "2px solid #cbd5e1" }}>
                  <td colSpan={5} style={{ padding: "10px 15px", textAlign: "right", color: "#475569" }}>Costo Directo Obra Civil</td>
                  <td style={{ padding: "10px 15px", textAlign: "right", color: "#0f172a" }}>${cd.toLocaleString("es-CO")}</td>
                </tr>
                <tr style={{ background: "#ffffff", color: "#64748b", fontSize: "0.85rem" }}>
                  <td colSpan={5} style={{ padding: "6px 15px", textAlign: "right" }}>Administración ({((P.porcAdmin||0.29)*100).toFixed(0)}%)</td>
                  <td style={{ padding: "6px 15px", textAlign: "right" }}>${admVal.toLocaleString("es-CO")}</td>
                </tr>
                <tr style={{ background: "#ffffff", color: "#64748b", fontSize: "0.85rem" }}>
                  <td colSpan={5} style={{ padding: "6px 15px", textAlign: "right" }}>Imprevistos ({((P.porcImprevistos||0.01)*100).toFixed(0)}%)</td>
                  <td style={{ padding: "6px 15px", textAlign: "right" }}>${impVal.toLocaleString("es-CO")}</td>
                </tr>
                <tr style={{ background: "#ffffff", color: "#64748b", fontSize: "0.85rem" }}>
                  <td colSpan={5} style={{ padding: "6px 15px", textAlign: "right" }}>Utilidad ({((P.porcUtilidad||0.05)*100).toFixed(0)}%)</td>
                  <td style={{ padding: "6px 15px", textAlign: "right" }}>${utVal.toLocaleString("es-CO")}</td>
                </tr>
                <tr style={{ background: "#ffffff", color: "#64748b", fontSize: "0.85rem" }}>
                  <td colSpan={5} style={{ padding: "6px 15px", textAlign: "right" }}>IVA sobre Utilidad ({((P.porcIVA||0.19)*100).toFixed(0)}%)</td>
                  <td style={{ padding: "6px 15px", textAlign: "right" }}>${ivaVal.toLocaleString("es-CO")}</td>
                </tr>
                <tr style={{ background: "#f8fafc", fontWeight: "bold" }}>
                  <td colSpan={5} style={{ padding: "6px 15px", textAlign: "right" }}>Costo Total Obra Civil</td>
                  <td style={{ padding: "6px 15px", textAlign: "right" }}>${obraCivil.toLocaleString("es-CO")}</td>
                </tr>
                <tr style={{ background: "#ffffff", color: "#64748b", fontSize: "0.85rem" }}>
                  <td colSpan={5} style={{ padding: "6px 15px", textAlign: "right" }}>Plan Manejo Ambiental (PMA)</td>
                  <td style={{ padding: "6px 15px", textAlign: "right" }}>${pma.toLocaleString("es-CO")}</td>
                </tr>
                <tr style={{ background: "#ffffff", color: "#64748b", fontSize: "0.85rem" }}>
                  <td colSpan={5} style={{ padding: "6px 15px", textAlign: "right" }}>Plan Manejo Tránsito (PMT)</td>
                  <td style={{ padding: "6px 15px", textAlign: "right" }}>${pmt.toLocaleString("es-CO")}</td>
                </tr>
                <tr style={{ background: "#f1f5f9", fontWeight: "900", borderTop: "2px solid #cbd5e1", fontSize: "1.0rem" }}>
                  <td colSpan={5} style={{ padding: "10px 15px", textAlign: "right", color: "#1e40af" }}>COSTO TOTAL OBRA</td>
                  <td style={{ padding: "10px 15px", textAlign: "right", color: "#1e40af" }}>${costoObra.toLocaleString("es-CO")}</td>
                </tr>
                <tr style={{ background: "#ffffff", color: "#64748b", fontSize: "0.85rem" }}>
                  <td colSpan={5} style={{ padding: "6px 15px", textAlign: "right" }}>Interventoría</td>
                  <td style={{ padding: "6px 15px", textAlign: "right" }}>${interObra.toLocaleString("es-CO")}</td>
                </tr>
                <tr style={{ background: "#f8fafc", fontWeight: "bold", borderTop: "1px solid #cbd5e1" }}>
                  <td colSpan={5} style={{ padding: "10px 15px", textAlign: "right" }}>Subtotal Suministros</td>
                  <td style={{ padding: "10px 15px", textAlign: "right" }}>${sumDirecto.toLocaleString("es-CO")}</td>
                </tr>
                <tr style={{ background: "#f1f5f9", fontWeight: "900", borderTop: "2px solid #cbd5e1", fontSize: "1.1rem" }}>
                  <td colSpan={5} style={{ padding: "12px 15px", textAlign: "right", color: "#10b981" }}>COSTO TOTAL DEL PROYECTO</td>
                  <td style={{ padding: "12px 15px", textAlign: "right", color: "#10b981" }}>${costoTotalProyecto.toLocaleString("es-CO")}</td>
                </tr>
              </>
              );
            })()}
          </tfoot>
        </table>
      </div>
    </div>
  </div>;
}

export default PreBancoTab;
