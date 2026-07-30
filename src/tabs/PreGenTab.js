import React, {useState, useEffect, useRef} from 'react';
import {TH, fm} from '../ui';
import * as XLSX from 'xlsx';
import {SUM_TYPES, SUM_TYPES_TRANS, PRECIOS_TUB, CAPNAMES} from '../constants';
import {gDe} from '../engine';
import {agruparTuberias, calcVallasAuto, calcPozosCompleto, calcCantSumidero} from '../calcHelpers';
import {parsePtoBase} from '../parsers';
import PTOBASE_DATA from '../ptoBaseData';

function PreGenTab(props){
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
      .replace(/Silla Yee/gi, "DerivaciÃƒÂ³n Y")
      .replace(/silla yee/gi, "derivaciÃƒÂ³n y")
      .replace(/Concreto/gi, "HormigÃƒÂ³n")
      .replace(/concreto/gi, "hormigÃƒÂ³n")
      .replace(/Acometida/gi, "ConexiÃƒÂ³n domiciliaria")
      .replace(/acometida/gi, "conexiÃƒÂ³n domiciliaria")
      .replace(/caja de inspecciÃƒÂ³n/gi, "caja de paso")
      .replace(/Caja de inspecciÃƒÂ³n/gi, "Caja de paso");
  };

  useEffect(function(){
    if (PTOBASE_DATA && PTOBASE_DATA.length > 0) {
      if (pbItems.length === 0) {
        var pb = PTOBASE_DATA.map(function(it){return{c:it.c,d:generify(it.d),u:it.u,p:it.p,lv:it.lv,q:0,auto:0};});
        setPbItems(pb);
      } else if (pbItems.length < PTOBASE_DATA.length) {
        let missing = false;
        let newPb = [...pbItems];
        PTOBASE_DATA.forEach(pto => {
          if (!newPb.find(it => it.c === pto.c)) {
            missing = true;
            newPb.push({c:pto.c,d:generify(pto.d),u:pto.u,p:pto.p,lv:pto.lv,q:0,auto:0});
          }
        });
        if (missing) {
           newPb.sort((a,b) => {
             let idxA = PTOBASE_DATA.findIndex(p => p.c === a.c);
             let idxB = PTOBASE_DATA.findIndex(p => p.c === b.c);
             return idxA - idxB;
           });
           setPbItems(newPb);
        }
      }
    }
  }, [pbItems.length, PTOBASE_DATA.length]);
  if(!dR.length&&pbItems.length===0)return <div className="c"><p style={{color:"#7088A8"}}>Cargue datos y/o PtoBase</p></div>;
  var lt=dN.reduce(function(s,r){return s+(r.L||0);},0);
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
  /* campamentos automÃƒÂ¡ticos: mismo criterio que vallas */
  var campAuto=calcVallasAuto(R,pbItems);
  /* acarreos */
  var excTtl=(tE+ep2.tVE+sumExcTot);
  var reutTtl=excTtl*(pT*(P.porcAprovTierra||.5)+pG*(P.porcAprovGranular||.5)+pR*(P.porcAprovRoca||0));
  
  var isUrbAv = P.urbanismoAvanzado === true || P.urbanismoAvanzado === "S";
  var uDem_urb = 0;
  if (isUrbAv && props.urbanismoData) {
      props.urbanismoData.forEach(r => {
          if(!r.reqUrbanismo) return;
          let t = dN.find(x => x.id === r.id);
          let L = t ? (t.L || t.longitud || t.long || 0) : 0;
          let pavEsp = r.pavEspesorDem || 0;
          let pavL = r.pavL || L;
          let pavA = r.pavA || P.anchoVia || 6;
          if (r.pavDemolicion) uDem_urb += (pavL * pavA * pavEsp);
          if (r.reqAnden) uDem_urb += ((r.andL||L)*(r.andA||0)*(r.andLados||1) * 0.10);
          if (r.reqSardinel) uDem_urb += ((r.sarL||L)*(r.sarLados||1) * 0.08);
      });
  }

  var demolTtl= isUrbAv ? uDem_urb : (rotP*0.15);
  var rellN_Tramos = tComun + sumRellTot;
  var matSobrExc = isUrbAv ? 0 : ((excTtl-reutTtl) + Math.max(0, reutTtl - rellN_Tramos));
  var msSobrante = (matSobrExc + demolTtl) * (1 + (P.porcExpansion !== undefined ? parseFloat(P.porcExpansion) : 0.05));
  /* entibado: Le × HP × 2 caras */
  var tEntibado=dN.reduce(function(s,r){return s+(r.Le||0)*((+r.profE||0)+(+r.profS||0))/2*2;},0)*(P.porcEntibado||1);

  let uDem=0, uExc=0, uRell=0, uSob=0, uSubBase=0, uBase=0, uAnden=0, uSardinel=0, uAceroRG=0, uPavRG=0;
  let uRotAsf_0_10=0, uRotAsf_10_20=0, uRotAsf_20p=0;
  let uRotConc_0_15=0, uRotConc_16_25=0, uRotConc_25p=0;

  if (isUrbAv && props.urbanismoData) {
    props.urbanismoData.forEach(r => {
      if(!r.reqUrbanismo) return;
      let t = dN.find(x => x.id === r.id);
      let L = t ? (t.L || t.longitud || t.long || 0) : 0;
      let pavEsp = r.pavEspesorDem || 0;
      let pavL = r.pavL || L;
      let pavA = r.pavA || P.anchoVia || 6;
      let demM3 = r.pavDemolicion ? (pavL * pavA * pavEsp) : 0;
      let rotM2 = r.pavDemolicion ? (pavL * pavA) : 0;
      if (r.pavDemolicion) {
          uSob += demM3;
          if (r.pavTipo === 'FX' || r.pavTipo === 'TL') {
              if (pavEsp <= 0.10) uRotAsf_0_10 += rotM2;
              else if (pavEsp <= 0.20) uRotAsf_10_20 += rotM2;
              else uRotAsf_20p += rotM2;
          } else if (r.pavTipo === 'RG') {
              if (pavEsp <= 0.15) uRotConc_0_15 += rotM2;
              else if (pavEsp <= 0.25) uRotConc_16_25 += rotM2;
              else uRotConc_25p += rotM2;
          }
      }

      let viaM2 = pavL * pavA;
      if(r.pavTipo==='RG'){
         uPavRG+=viaM2;
         if(r.pavReqAcero) uAceroRG+=(viaM2 * 0.20 * (r.pavKgAcero||0));
      }
      let excM3 = r.reqRasante ? (r.rasL||L)*(r.rasA||(P.anchoVia||6))*(r.rasProf||0) : 0;
      uExc+=excM3; uSob+=excM3; uRell+=excM3;
      if(r.reqSubBase) uSubBase+=(r.sbL||L)*(r.sbA||(P.anchoVia||6));
      if(r.reqBase) uBase+=(r.baseL||L)*(r.baseA||(P.anchoVia||6));
      if(r.reqAnden) {
          let andA = (r.andL||L)*(r.andA||0)*(r.andLados||1);
          uAnden+=andA;
          let andDem = (andA * 0.10); // Asumiendo 10cm espesor
          uDem += andDem; uSob += andDem;
      }
      if(r.reqSardinel) {
          let sarL = (r.sarL||L)*(r.sarLados||1);
          uSardinel+=sarL;
          let sarDem = (sarL * 0.08); // Asumiendo 0.2x0.4m = 0.08m2/ml
          uDem += sarDem; uSob += sarDem;
      }
    });
    // Limpiar NaNs en caso de error
    uDem=uDem||0; uExc=uExc||0; uRell=uRell||0; uSob=uSob||0; uSubBase=uSubBase||0; uBase=uBase||0; uAnden=uAnden||0; uSardinel=uSardinel||0; uAceroRG=uAceroRG||0; uPavRG=uPavRG||0;
    uSob = uSob * (1 + (P.porcExpansion !== undefined ? parseFloat(P.porcExpansion) : 0.05));
  }

  var ratioRepTodo = lt > 0 ? dN.reduce(function(s,t){return s+(t.anchoVia==="S"?(t.L||0):0);},0) / lt : 0;

  var autoMap={
    /* 1.01 Vallas Ãƒâ€” frentes */
    "1.01.01.01":P.vallas1 !== undefined && P.vallas1 !== "" ? P.vallas1 : vaP.v1*FO,
    "1.01.01.02":P.vallas2 !== undefined && P.vallas2 !== "" ? P.vallas2 : vaP.v2*FO,
    "1.01.01.03":P.vallas3 !== undefined && P.vallas3 !== "" ? P.vallas3 : vaP.v3*FO,
    "1.01.01.04":P.vallas4 !== undefined && P.vallas4 !== "" ? P.vallas4 : vaP.v4*FO,
    /* 1.01.02 SeÃƒÂ±ales: 2 por frente */
    "1.01.02.01":FO*2,
    /* 1.01.03 Dispositivos */
    "1.01.03.03":Math.ceil(lt/100),
    "1.01.03.05":nTramRep,
    "1.01.03.06":lt,
    /* 1.02.01 Cerramientos */
    "1.02.01.06":lt,
    /* 1.02.02 Campamentos - frentes - tiempoObra */
    "1.02.02.01":P.camp1 !== undefined && P.camp1 !== "" ? P.camp1 : campAuto.v1*FO*(P.tiempoObra||1),
    "1.02.02.02":P.camp2 !== undefined && P.camp2 !== "" ? P.camp2 : campAuto.v2*FO*(P.tiempoObra||1),
    "1.02.02.03":P.camp3 !== undefined && P.camp3 !== "" ? P.camp3 : campAuto.v3*FO*(P.tiempoObra||1),
    "1.02.02.04":P.camp4 !== undefined && P.camp4 !== "" ? P.camp4 : campAuto.v4*FO*(P.tiempoObra||1),
    /* 1.02.03 Preparacion */
    "1.02.03.08":(P.tiempoObra||2),
    /* 1.03 Rotura pavimentos (+ sumideros) */
    "1.03.01.01":function(){var r=0;if(!isUrbAv){dN.forEach(function(t){if((t.tipoVia==="FX"||t.tipoVia==="TL")&&(P.espesorPav||0.15)<0.10)r+=t.rotP||0;});}return r;}(),
    "1.03.01.02":function(){var r=0;if(!isUrbAv){dN.forEach(function(t){if(t.tipoVia==="FX"||t.tipoVia==="TL"||!t.tipoVia){var esp=P.espesorPav||0.15;if(esp>=0.10&&esp<=0.20)r+=t.rotP||0;}});}return r+(isUrbAv?0:sumRotTot);}(),
    "1.03.01.03":function(){var r=0;if(!isUrbAv){dN.forEach(function(t){if((t.tipoVia==="FX"||t.tipoVia==="TL")&&(P.espesorPav||0.15)>0.20)r+=t.rotP||0;});}return r;}(),
    "1.03.02.01":function(){var r=0;if(!isUrbAv){dN.forEach(function(t){if(t.tipoVia==="RG"&&(P.espesorPav||0.15)<0.15)r+=t.rotP||0;});}return r;}(),
    "1.03.02.02":function(){var r=0;if(!isUrbAv){dN.forEach(function(t){if(t.tipoVia==="RG"){var esp=P.espesorPav||0.15;if(esp>=0.15&&esp<=0.25)r+=t.rotP||0;}});}return r;}(),
    "1.03.02.03":function(){var r=0;if(!isUrbAv){dN.forEach(function(t){if(t.tipoVia==="RG"&&(P.espesorPav||0.15)>0.25)r+=t.rotP||0;});}return r;}(),
    "1.03.03.02":function(){var r=0;if(!isUrbAv){dN.forEach(function(t){if(t.tipoVia==="PP"||t.tipoVia==="AD")r+=t.rotP||0;});}return r;}(),
    "1.03.04.02":function(){var r=0;if(!isUrbAv){dN.forEach(function(t){if(t.tipoVia==="AN")r+=t.rotP||0;});}return r;}(),
    /* 2.01 Excavaciones (tramos+pozos+sumideros) */
    "2.01.01.01":(t025+ep2.v025+sumExcTot)*pT*(1-pAL) + uExc,
    "2.01.01.02":(t2550+ep2.v2550)*pT*(1-pAL),
    "2.01.01.04":(t025+ep2.v025+sumExcTot)*pG*(1-pAL),
    "2.01.01.05":(t2550+ep2.v2550)*pG*(1-pAL),
    "2.01.01.07":(t025+t2550+t50p+ep2.tVE+sumExcTot)*pR*(1-pAL),
    "2.01.02.01":(t025+ep2.v025+sumExcTot)*pT*pAL,
    "2.01.02.02":(t2550+ep2.v2550)*pT*pAL,
    "2.01.02.04":(t025+ep2.v025+sumExcTot)*pG*pAL,
    "2.01.02.05":(t2550+ep2.v2550)*pG*pAL,
    "2.01.02.07":(t025+t2550+t50p+ep2.tVE+sumExcTot)*pR*pAL,
    /* 2.04 Entibado = Le Ãƒâ€” profProm Ãƒâ€” 2 caras */
    "2.04.01.01":tEntibado,
    /* 2.05 Rellenos: arena cimentaciÃƒÂ³n + comÃƒÂºn compactado */
    "2.05.01.01":tArena+sumCimTot,
    "2.05.02.01":(tComun+sumRellTot)*.50,
    "2.05.03.01":(tComun+sumRellTot)*.50,
    "2.05.04.02":tArena+sumCimTot,
    /* 2.06 Sobreacarreos con % y estaciones */
    "2.06.01.01":msSobrante*pA200*nEst,
    "2.06.01.02":msSobrante*pA500*nEst,
    "2.06.01.04":msSobrante*pA1000*(P.distBotadero||8) + uSob,
    /* 3. TuberÃƒÂ­as */
    "3.02.01.01":ep2.tTubVent*fD,
    /* 4. Estructuras */
    "4.01.01.01":(ep2.tVC+sumConcTot)*fD,
    "4.01.01.02":(ep2.tVolCaida||0)*fD,
    "4.01.02.02":ep2.tCP*fD,
    "4.02.01.01":(ep2.tA37+(sumA37Tot*0.5))*fD + uAceroRG + uAceroRG, // Asignando A37 (fy=2590)
    "4.02.01.02":(ep2.tPDR+(sumA37Tot*0.5))*fD, // Asignando PDR-60 (fy=4200)
    "4.04.01.01":ep2.tAM*fD,
    /* 4.05 Sifones de caÃƒÂ­da */
    "4.05.01.01":caidasCount["4.05.01.01"]||0,"4.05.01.02":caidasCount["4.05.01.02"]||0,"4.05.01.03":caidasCount["4.05.01.03"]||0,"4.05.01.04":caidasCount["4.05.01.04"]||0,
    "4.05.02.01":caidasCount["4.05.02.01"]||0,"4.05.02.02":caidasCount["4.05.02.02"]||0,"4.05.02.03":caidasCount["4.05.02.03"]||0,"4.05.02.04":caidasCount["4.05.02.04"]||0,
    "4.05.03.01":caidasCount["4.05.03.01"]||0,"4.05.03.02":caidasCount["4.05.03.02"]||0,"4.05.03.03":caidasCount["4.05.03.03"]||0,"4.05.03.04":caidasCount["4.05.03.04"]||0,
    "4.05.04.01":caidasCount["4.05.04.01"]||0,"4.05.04.02":caidasCount["4.05.04.02"]||0,"4.05.04.03":caidasCount["4.05.04.03"]||0,"4.05.04.04":caidasCount["4.05.04.04"]||0,
    /* 4.06 Acometidas */
    "4.06.01.01":nAc*(largoAco-(P.anchoAnden||1))*.56*(1-ratioRepTodo)*(P.inclAcom_4060101!==false?1:0),"4.06.01.02":nAc*(P.anchoAnden||1)*.56*(P.inclAcom_4060102!==false?1:0),
    "4.06.01.03":ltAc*.56*Math.min(profProm,2)*(P.inclAcom_4060103!==false?1:0),
    "4.06.01.04":ltAc*Math.PI*Math.pow((P.diamAcom||160)/2000,2)*1.5*(P.inclAcom_4060104!==false?1:0),
    "4.06.01.05":ltAc*fD*(P.inclAcom_4060105!==false?1:0),"4.06.01.06":nAc*(P.inclAcom_4060106!==false?1:0),"4.06.01.07":nAc*(P.inclAcom_4060107!==false?1:0),
    "4.06.01.09":ltAc*.56*Math.min(profProm,2)*.8*(P.inclAcom_4060109!==false?1:0),
    "4.06.01.10":nAc*(largoAco-(P.anchoAnden||1))*.56*(1-ratioRepTodo)*(P.inclAcom_4060110!==false?1:0),"4.06.01.11":nAc*(P.anchoAnden||1)*.56*(P.inclAcom_4060111!==false?1:0),
    /* 4.07-4.08 Juntas y pavimentos (+ sumideros) */
    "4.07.01.01":ep2.tJu+sumPdrTot,
    "4.08.01.02":function(){var r=0;dN.forEach(function(t){if(t.tipoVia==="FX"||!t.tipoVia)r+=(t.L||0)*(t.anchoVia||P.anchoVia||6);});return r+sumRotTot;}(),
    "4.08.01.03":function(){var r=0;dN.forEach(function(t){if(t.tipoVia==="FX"||!t.tipoVia)r+=(t.L||0)*(t.anchoVia||P.anchoVia||6);});return r+sumRotTot;}(),
    "4.08.03.01":function(){var r=0;dN.forEach(function(t){if(t.tipoVia==="RG")r+=(t.L||0)*(t.anchoVia||P.anchoVia||6);});return r;}(),
    "4.08.03.02":function(){var r=0;dN.forEach(function(t){if(t.tipoVia==="PP"||t.tipoVia==="AD")r+=(t.L||0)*(t.anchoVia||P.anchoVia||6);});return r;}(),
    "4.09.01.01":function(){var r=0;dN.forEach(function(t){if(t.tipoVia==="AN")r+=(t.L||0)*(t.anchoVia||P.anchoVia||6);});return r;}(),
    /* 5. Varios */
    "5.01.02.01":lt,
    "5.03.01.01":function(){var n=0;if(sumLat)sumLat.forEach(function(f){n+=f.cant||0;});return n;}(),
    "5.03.01.02":function(){var n=0;if(sumTrans)sumTrans.forEach(function(f){var st=SUM_TYPES_TRANS[f.tipo];n+=(f.cant||0)*(st?st.rejas||5:5);});return n;}(),
    "5.03.02.01":function(){var n=0;if(sumLat)sumLat.forEach(function(f){n+=f.cant||0;});return n;}(),
    "5.03.02.02":0,
    "5.03.03.01":ep2.nNuevos,
    "5.03.03.02":function(){var nSum=0;if(sumLat)sumLat.forEach(function(f){nSum+=f.cant||0;});if(sumTrans)sumTrans.forEach(function(f){nSum+=f.cant||0;});return nSum;}(),
    "5.05.01.02":Math.ceil(lt/100)*2,
    "5.05.01.03":Math.ceil(lt/50),
    "5.05.03.01":ep2.nNuevos*5,
    "5.07.01.01":function(){var r=0;dN.forEach(function(t){if(t.tipoVia==="PS")r+=(t.L||0)*(t.anchoVia||P.anchoVia||6);});return r;}(),
    "5.08.01.02":repP+sumRellTot,
    "5.09.01.06":Math.ceil(lt/100)*2,
    "5.09.01.07":lt*4,
  };
  var grp=agruparTuberias(R,sumLat||[],sumTrans||[],P);
  var mmToCode={"110 mm":"3.02.02.02","160 mm":"3.02.02.03","200 mm":"3.02.02.04","250 mm":"3.02.02.05","315 mm":"3.02.02.06","355 mm":"3.02.02.07","400 mm":"3.02.02.08","450 mm":"3.02.02.09","500 mm":"3.02.02.10","600 mm":"3.02.02.11","700 mm":"3.02.02.12","750 mm":"3.02.02.13","850 mm":"3.02.02.14","900 mm":"3.02.02.15","1000 mm":"3.02.02.16"};
  grp.filter(function(g){return (g.red||0)+(g.sum||0)>0;}).forEach(function(g){
    var tc=mmToCode[g.nom];if(tc)autoMap[tc]=((g.red||0)+(g.sum||0))*fD;
  });
  if(ltAc>0)autoMap["4.06.01.05"]=ltAc*fD*(P.inclAcom_4060105!==false?1:0);

  if (isUrbAv && props.urbanismoData) {
    let mode = 'S'; // Siempre sobreescribir para ignorar los cálculos antiguos de anchos de vía
    
    const tryAdd = (cod, val) => {
        if(P['inclUrb_' + cod.replace(/\./g, '')] === false) return;
        if(mode === 'S') autoMap[cod] = val;
        else autoMap[cod] = (autoMap[cod]||0) + val;
    };

    tryAdd("5.01.01.01", uDem);
    tryAdd("4.08.02.02", uSubBase);
    tryAdd("4.08.02.03", uBase);
    tryAdd("4.08.03.01", uPavRG);
    tryAdd("4.02.01.01", uAceroRG);
    tryAdd("4.09.01.01", uAnden);
    tryAdd("4.09.01.02", uSardinel);
    tryAdd("1.03.01.01", uRotAsf_0_10);
    tryAdd("1.03.01.02", uRotAsf_10_20);
    tryAdd("1.03.01.03", uRotAsf_20p);
    tryAdd("1.03.02.01", uRotConc_0_15);
    tryAdd("1.03.02.02", uRotConc_16_25);
    tryAdd("1.03.02.03", uRotConc_25p);
    tryAdd("2.02.01.01", uExc);
    tryAdd("2.05.01.02", uRell);
  }

  /* === NOTAS DE REFERENCIA: de dÃƒÂ³nde sale cada cantidad automÃƒÂ¡tica === */
  var autoRef={
    "1.01.01.01":"(Vallas Tipo1 Ãƒâ€” Frentes de Obra)","1.01.01.02":"(Vallas Tipo2 Ãƒâ€” Frentes)","1.01.01.03":"(Vallas Tipo3 Ãƒâ€” Frentes)","1.01.01.04":"(Vallas Tipo4 Ãƒâ€” Frentes)",
    "1.01.02.01":"(2 seÃƒÂ±ales Ãƒâ€” Frentes de Obra)",
    "1.01.03.03":"(Long.Nueva ÃƒÂ· 100)","1.01.03.05":"(NÃ‚Â° tramos nuevos)","1.01.03.06":"(Long.Total Nueva)",
    "1.02.01.06":"(Long.Total Nueva)",
    "1.02.03.08":"(Meses de obra)",
    "1.03.01.01":"(Ã¢Ë†â€˜ rotP tramos FX/TL, esp<0.10)","1.03.01.02":"(Ã¢Ë†â€˜ rotP tramos FX/TL, esp 0.10-0.20 + sumideros)","1.03.01.03":"(Ã¢Ë†â€˜ rotP tramos FX/TL, esp>0.20)",
    "1.03.02.01":"(Ã¢Ë†â€˜ rotP tramos RG, esp<0.15)","1.03.02.02":"(Ã¢Ë†â€˜ rotP tramos RG, esp 0.15-0.25)","1.03.02.03":"(Ã¢Ë†â€˜ rotP tramos RG, esp>0.25)",
    "1.03.03.02":"(Ã¢Ë†â€˜ rotP tramos PP/AD)","1.03.04.02":"(Ã¢Ë†â€˜ rotP tramos AN)",
    "2.01.01.01":"(V0-2.5 + Pozos + Sum) Ãƒâ€” %Tierra Ãƒâ€” (1-%AcLibre)","2.01.01.02":"(V2.5-5 + Pozos) Ãƒâ€” %Tierra Ãƒâ€” (1-%AcLibre)",
    "2.01.01.04":"(V0-2.5 + Pozos + Sum) Ãƒâ€” %Granular Ãƒâ€” (1-%AcLibre)","2.01.01.05":"(V2.5-5 + Pozos) Ãƒâ€” %Granular Ãƒâ€” (1-%AcLibre)",
    "2.01.01.07":"(VolTotal) Ãƒâ€” %Roca Ãƒâ€” (1-%AcLibre)",
    "2.01.02.01":"(V0-2.5 + Pozos + Sum) Ãƒâ€” %Tierra Ãƒâ€” %AcLibre","2.01.02.02":"(V2.5-5 + Pozos) Ãƒâ€” %Tierra Ãƒâ€” %AcLibre",
    "2.01.02.04":"(V0-2.5 + Pozos + Sum) Ãƒâ€” %Granular Ãƒâ€” %AcLibre","2.01.02.05":"(V2.5-5 + Pozos) Ãƒâ€” %Granular Ãƒâ€” %AcLibre",
    "2.01.02.07":"(VolTotal) Ãƒâ€” %Roca Ãƒâ€” %AcLibre",
    "2.04.01.01":"(Le Ãƒâ€” HP Ãƒâ€” 2caras Ãƒâ€” %Entibado)",
    "2.05.01.01":"(Arena ciment. tramos + sumideros)","2.05.02.01":"(Relleno comÃƒÂºn Ãƒâ€” 50%)","2.05.03.01":"(Relleno comÃƒÂºn Ãƒâ€” 50%)","2.05.04.02":"(Arena cimentaciÃƒÂ³n total)",
    "2.06.01.01":"(Sobrante Ãƒâ€” %Ac200 Ãƒâ€” Estaciones)","2.06.01.02":"(Sobrante Ãƒâ€” %Ac500 Ãƒâ€” Estaciones)","2.06.01.04":"(Sobrante Ãƒâ€” %Ac1000 Ãƒâ€” Dist.Botadero)",
    "3.02.01.01":"(Tub.VentilaciÃƒÂ³n pozos Ãƒâ€” fDesp)",
    "4.01.01.01":"(Concreto pozos + sumideros Ãƒâ€” fDesp)","4.01.01.02":"(Vol.CaÃƒÂ­da pozos Ãƒâ€” fDesp)","4.01.02.02":"(Concreto pobre pozos Ãƒâ€” fDesp)",
    "4.02.01.01":"(Acero 37 pozos+sum Ãƒâ€” fDesp)","4.02.01.02":"(Acero 60 pozos+sum Ãƒâ€” fDesp)",
    "4.04.01.01":"(MamposterÃƒÂ­a ladrillo pozos Ãƒâ€” fDesp)",
    "4.05.01.01":"(SifÃƒÂ³n caÃƒÂ­da D=200mm, pozo HÃ¢â€°Â¤2m)","4.05.01.02":"(SifÃƒÂ³n caÃƒÂ­da D=200mm, pozo H 2-4m)","4.05.01.03":"(SifÃƒÂ³n caÃƒÂ­da D=200mm, pozo H 4-6m)","4.05.01.04":"(SifÃƒÂ³n caÃƒÂ­da D=200mm, pozo H>6m)",
    "4.05.02.01":"(SifÃƒÂ³n caÃƒÂ­da D=250mm, pozo HÃ¢â€°Â¤2m)","4.05.02.02":"(SifÃƒÂ³n caÃƒÂ­da D=250mm, pozo H 2-4m)","4.05.02.03":"(SifÃƒÂ³n caÃƒÂ­da D=250mm, pozo H 4-6m)","4.05.02.04":"(SifÃƒÂ³n caÃƒÂ­da D=250mm, pozo H>6m)",
    "4.05.03.01":"(SifÃƒÂ³n caÃƒÂ­da D=315mm, pozo HÃ¢â€°Â¤2m)","4.05.03.02":"(SifÃƒÂ³n caÃƒÂ­da D=315mm, pozo H 2-4m)","4.05.03.03":"(SifÃƒÂ³n caÃƒÂ­da D=315mm, pozo H 4-6m)","4.05.03.04":"(SifÃƒÂ³n caÃƒÂ­da D=315mm, pozo H>6m)",
    "4.05.04.01":"(SifÃƒÂ³n caÃƒÂ­da D=400mm, pozo HÃ¢â€°Â¤2m)","4.05.04.02":"(SifÃƒÂ³n caÃƒÂ­da D=400mm, pozo H 2-4m)","4.05.04.03":"(SifÃƒÂ³n caÃƒÂ­da D=400mm, pozo H 4-6m)","4.05.04.04":"(SifÃƒÂ³n caÃƒÂ­da D=400mm, pozo H>6m)",
    "4.06.01.01":"(NÃ‚Â°Acom Ãƒâ€” (largoAco-Anden) Ãƒâ€” 0.56)","4.06.01.02":"(NÃ‚Â°Acom Ãƒâ€” AnchoAndÃƒÂ©n Ãƒâ€” 0.56)","4.06.01.03":"(Long.Acom Ãƒâ€” 0.56 Ãƒâ€” profProm)",
    "4.06.01.04":"(Long.Acom Ãƒâ€” VolTubo)","4.06.01.05":"(Long.Acom Ãƒâ€” fDesp)","4.06.01.06":"(NÃ‚Â° Acometidas)","4.06.01.07":"(NÃ‚Â° Acometidas)",
    "4.06.01.09":"(Long.Acom Ãƒâ€” 0.56 Ãƒâ€” profProm Ãƒâ€” 0.8)","4.06.01.10":"(NÃ‚Â°Acom Ãƒâ€” (largoAco-Anden) Ãƒâ€” 0.56)","4.06.01.11":"(NÃ‚Â°Acom Ãƒâ€” AnchoAndÃƒÂ©n Ãƒâ€” 0.56)",
    "4.07.01.01":"(Juntas PVC pozos + sumideros)","4.08.01.02":"(S LÃƒâ€”AnchoVÃƒÂ­a tramos FX + sumideros)","4.08.01.03":"(S LÃƒâ€”AnchoVÃƒÂ­a tramos FX + sumideros)","4.08.02.02": uSubBase, "4.08.02.03": uBase, "4.08.03.01":"(S LÃƒâ€”AnchoVÃƒÂ­a tramos RG)","4.08.03.02":"(S LÃƒâ€”AnchoVÃƒÂ­a tramos PP/AD)","4.09.01.02": uSardinel, "4.09.01.01":"(S LÃƒâ€”AnchoVÃƒÂ­a tramos AN)",
    "5.01.02.01":"(Long.Total Nueva)","5.03.01.01":"(NÃ‚Â° sumideros laterales)","5.03.01.02":"(NÃ‚Â° sumideros trans Ãƒâ€” rejas)","5.03.02.01":"(NÃ‚Â° sumideros laterales)",
    "5.03.03.01":"(NÃ‚Â° pozos nuevos)","5.03.03.02":"(NÃ‚Â° pozos nuevos)","5.05.01.02":"(LongÃƒÂ·100 Ãƒâ€” 2)","5.05.01.03":"(LongÃƒÂ·50)","5.05.03.01":"(NÃ‚Â° pozos Ãƒâ€” 5)",
    "5.07.01.01":"(Ã¢Ë†â€˜ LÃƒâ€”AnchoVÃƒÂ­a tramos PS)",
    "5.08.01.02":"(Ã¢Ë†â€˜ repP + relleno sumideros)","5.09.01.06":"(LongÃƒÂ·100 Ãƒâ€” 2)","5.09.01.07":"(Long Ãƒâ€” 4)",
  };
  /* TuberÃƒÂ­as: agregar referencia dinÃƒÂ¡mica */
  grp.filter(function(g){return (g.red||0)+(g.sum||0)>0;}).forEach(function(g){
    var tc=mmToCode[g.nom];if(tc)autoRef[tc]="(Red:"+Math.round(g.red||0)+"m + Sum:"+Math.round(g.sum||0)+"m Ãƒâ€” fDesp)";
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
  var getSubChapter = function(c) {
    var parts = c.split('.');
    if (parts.length > 2) {
      var subCode = parts.slice(0, parts.length - 1).join('.');
      var parent = PTOBASE_DATA.find(function(x){return x.c === subCode;});
      if (parent) return parent.d;
      subCode = parts.slice(0, 2).join('.');
      parent = PTOBASE_DATA.find(function(x){return x.c === subCode;});
      if (parent) return parent.d;
    }
    return "";
  };
  var items=pbItems;
  var leafs=items.filter(function(it){return it.lv>=3;});
  var used=leafs.filter(function(it){return it.q>0;});
  var shown=filt==="all"?leafs:filt==="used"?used:leafs;
  if(search){var sl=search.toLowerCase();shown=shown.filter(function(it){return it.c.includes(sl)||it.d.toLowerCase().includes(sl);});}
  var cd=0;var capTot={};
  leafs.forEach(function(it){if(it.q>0&&it.p>0){var v=Math.round(it.q*it.p);cd+=v;var ch=it.c.substring(0,1);capTot[ch]=(capTot[ch]||0)+v;}});
  var adm=Math.round(cd*(P.porcAdmin||.29)),imp=Math.round(cd*(P.porcImprevistos||.01));
  var ut=Math.round(cd*(P.porcUtilidad||.05)),iva=Math.round(ut*(P.porcIVA||.19));var tot=cd+adm+imp+ut+iva;
  var handleExportPre=function(){
    var wb2=XLSX.utils.book_new();
    var h=[["AMCaudales — FORMULARIO DE OBRA Y PRECIOS"],[P.proyecto],[P.municipio+" - "+P.barrio],[P.disenador+" - "+P.fecha],[""],["CODIGO","DESCRIPCION","UNIDAD","CANTIDAD","P.UNITARIO","TOTAL"]];
    var curCh="";used.forEach(function(it){var ch=it.c.substring(0,1);if(ch!==curCh){var cn=ch==="1"?"PRELIMINARES":ch==="2"?"MOVIMIENTOS DE TIERRAS":ch==="3"?"TUBERIAS Y ACCESORIOS":ch==="4"?"ESTRUCTURAS":"VARIOS";h.push([ch,cn,"","","",capTot[ch]||""]);curCh=ch;}
    h.push([it.c,it.d,it.u,+it.q.toFixed(2),it.p,Math.round(it.q*it.p)]);});
    h.push([]);h.push(["","COSTO DIRECTO","","","",cd]);h.push(["","Admin","","","",adm]);h.push(["","Imprevistos","","","",imp]);h.push(["","Utilidad","","","",ut]);h.push(["","IVA s/Util","","","",iva]);h.push(["","COSTO TOTAL","","","",tot]);
    var ws=XLSX.utils.aoa_to_sheet(h);ws["!cols"]=[{wch:14},{wch:52},{wch:8},{wch:12},{wch:14},{wch:16}];
    XLSX.utils.book_append_sheet(wb2,ws,"10.Presupuesto");XLSX.writeFile(wb2,(P.barrio||"Pto").replace(/\s+/g,"_")+"_Presupuesto.xlsx");};
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
          <div style={{ fontSize: "0.85rem", textTransform: "uppercase", fontWeight: "bold", color: "#6b7280" }}>ÃƒÂndice por Metro Lineal</div>
          <div style={{ fontSize: "1.8rem", fontWeight: "900", marginTop: "5px" }}>{fm(Math.round(tot/(lt||1)))}</div>
        </div>
      </div>
    )}

    <div style={{ background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)", color: "#1f2937" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h3 style={{ margin: 0, color: "#111827" }}>Desglose por CapÃƒÂ­tulos</h3>
        <button className="btn" onClick={handleExportPre} style={{ padding: "8px 16px", background: "#10b981", color: "white", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
          Exportar Excel Libre
        </button>
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {["1","2","3","4","5"].map(function(ch) {
          var names = {"1": "PRELIMINARES", "2": "MOV. TIERRAS", "3": "TUBERÃƒÂAS", "4": "ESTRUCTURAS", "5": "VARIOS"};
          var colors = {"1": "#64748b", "2": "#d97706", "3": "#0284c7", "4": "#4f46e5", "5": "#059669"};
          var cTotal = capTot[ch] || 0;
          var pct = cd > 0 ? ((cTotal / cd) * 100).toFixed(1) : 0;
          
          return (
            <div key={ch} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "15px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "15px", flex: 1 }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: colors[ch], color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "1.2rem" }}>
                  {ch}
                </div>
                <div>
                  <div style={{ fontWeight: "bold", color: "#334155" }}>{names[ch]}</div>
                  <div style={{ fontSize: "0.85rem", color: "#64748b" }}>CapÃƒÂ­tulo {ch}</div>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ height: "8px", background: "#e2e8f0", borderRadius: "4px", overflow: "hidden", width: "100%", maxWidth: "300px" }}>
                  <div style={{ height: "100%", background: colors[ch], width: `${pct}%` }}></div>
                </div>
              </div>
              <div style={{ textAlign: "right", minWidth: "150px" }}>
                <div style={{ fontWeight: "900", color: "#1e293b", fontSize: "1.1rem" }}>{fm(cTotal)}</div>
                <div style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: "bold" }}>{pct}% del C.D.</div>
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
           <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", width: "200px", color: "black", background: "white" }} />
           <button onClick={() => refPB.current && refPB.current.click()} style={{ padding: "8px 16px", background: "#334155", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>Importar Precios XLSM</button>
           <input ref={refPB} type="file" accept=".xlsm,.xlsx" style={{display:"none"}} onChange={handleLoadPB}/>
        </div>
      </div>
      
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "#f1f5f9", color: "#475569", fontSize: "0.85rem", textTransform: "uppercase" }}>
              <TH style={{ padding: "12px 15px", borderBottom: "2px solid #cbd5e1" }}>ÃƒÂtem</TH>
              <TH style={{ padding: "12px 15px", borderBottom: "2px solid #cbd5e1", minWidth: "450px" }}>DescripciÃƒÂ³n</TH>
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
                    <div style={{display: 'flex', flexDirection: 'column'}}>
                      <input type="text" value={it.d || ""} onChange={e => updD(ri, e.target.value)} style={{ width: "100%", padding: "6px", border: "1px solid transparent", borderRadius: "4px", fontSize: "0.9rem", color: "#334155", background: "transparent", transition: "border 0.2s" }} onFocus={e => {e.target.style.border="1px solid #cbd5e1"; e.target.style.background="#fff"}} onBlur={e => {e.target.style.border="1px solid transparent"; e.target.style.background="transparent"}} title="Click para editar descripciÃƒÂ³n" />
                      {(() => {
                        let sc = getSubChapter(it.c);
                        return sc ? <div style={{fontSize: '10px', color: '#94a3b8', marginTop: '2px', marginLeft: '6px'}}>{sc}</div> : null;
                      })()}
                    </div>
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
            {cd > 0 && (
              <>
                <tr style={{ background: "#f8fafc", fontWeight: "bold", borderTop: "2px solid #cbd5e1" }}>
                  <td colSpan={5} style={{ padding: "10px 15px", textAlign: "right", color: "#475569" }}>Costo Directo</td>
                  <td style={{ padding: "10px 15px", textAlign: "right", color: "#0f172a" }}>${cd.toLocaleString("es-CO")}</td>
                </tr>
                <tr style={{ background: "#ffffff", color: "#64748b", fontSize: "0.85rem" }}>
                  <td colSpan={5} style={{ padding: "6px 15px", textAlign: "right" }}>AdministraciÃƒÂ³n ({((P.porcAdmin||0.29)*100).toFixed(0)}%)</td>
                  <td style={{ padding: "6px 15px", textAlign: "right" }}>${adm.toLocaleString("es-CO")}</td>
                </tr>
                <tr style={{ background: "#ffffff", color: "#64748b", fontSize: "0.85rem" }}>
                  <td colSpan={5} style={{ padding: "6px 15px", textAlign: "right" }}>Imprevistos ({((P.porcImprevistos||0.01)*100).toFixed(0)}%)</td>
                  <td style={{ padding: "6px 15px", textAlign: "right" }}>${imp.toLocaleString("es-CO")}</td>
                </tr>
                <tr style={{ background: "#ffffff", color: "#64748b", fontSize: "0.85rem" }}>
                  <td colSpan={5} style={{ padding: "6px 15px", textAlign: "right" }}>Utilidad ({((P.porcUtilidad||0.05)*100).toFixed(0)}%)</td>
                  <td style={{ padding: "6px 15px", textAlign: "right" }}>${ut.toLocaleString("es-CO")}</td>
                </tr>
                <tr style={{ background: "#ffffff", color: "#64748b", fontSize: "0.85rem" }}>
                  <td colSpan={5} style={{ padding: "6px 15px", textAlign: "right" }}>IVA sobre Utilidad ({((P.porcIVA||0.19)*100).toFixed(0)}%)</td>
                  <td style={{ padding: "6px 15px", textAlign: "right" }}>${iva.toLocaleString("es-CO")}</td>
                </tr>
                <tr style={{ background: "#f1f5f9", fontWeight: "900", borderTop: "2px solid #cbd5e1", fontSize: "1.1rem" }}>
                  <td colSpan={5} style={{ padding: "12px 15px", textAlign: "right", color: "#1e40af" }}>COSTO TOTAL DE LA OBRA</td>
                  <td style={{ padding: "12px 15px", textAlign: "right", color: "#1e40af" }}>${tot.toLocaleString("es-CO")}</td>
                </tr>
              </>
            )}
          </tfoot>
        </table>
      </div>
    </div>
  </div>;
}

export default PreGenTab;




