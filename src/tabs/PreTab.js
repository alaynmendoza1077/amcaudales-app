import React, {useState, useEffect, useRef} from 'react';
import {TH, fm} from '../ui';
import * as XLSX from 'xlsx';
import {SUM_TYPES, SUM_TYPES_TRANS, PRECIOS_TUB, CAPNAMES} from '../constants';
import {gDe} from '../engine';
import {agruparTuberias, calcVallasAuto, calcPozosCompleto, calcCantSumidero} from '../calcHelpers';
import {parsePtoBase} from '../parsers';
import PTOBASE_DATA from '../ptoBaseData';

function PreTab(props){
  var R=props.R,P=props.P,T=props.T||[],sumLat=props.sumLat,sumTrans=props.sumTrans;
  var pbItems=props.pbItems,setPbItems=props.setPbItems,isExport=props.isExport;
  var dR=R.filter(function(r){return !r.sep;});
  var dN=dR.filter(function(r){return r.reponer==="S";});
  var sFilt=useState("used");var filt=sFilt[0],setFilt=sFilt[1];
  var sSearch=useState("");var search=sSearch[0],setSearch=sSearch[1];
  var refPB=useRef(null);
  useEffect(function(){
    if(typeof setPbItems !== 'function') return;
    if(PTOBASE_DATA && PTOBASE_DATA.length > 0) {
      if(pbItems.length === 0){
        var pb = PTOBASE_DATA.map(function(it){return{c:it.c,d:it.d,u:it.u,p:it.p,lv:it.lv,q:0,auto:0};});
        setPbItems(pb);
      } else {
        var existingCodes = {};
        pbItems.forEach(function(it) { existingCodes[it.c] = true; });
        var missing = PTOBASE_DATA.filter(function(it) { return !existingCodes[it.c]; });
        if (missing.length > 0) {
          var newPb = pbItems.concat(missing.map(function(it){return{c:it.c,d:it.d,u:it.u,p:it.p,lv:it.lv,q:0,auto:0};}));
          newPb.sort(function(a,b) { return a.c.localeCompare(b.c, undefined, {numeric: true}); });
          setPbItems(newPb);
        }
      }
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
  if(sumLat)sumLat.forEach(function(f){if((f.cant||0)>0){var c=calcCantSumidero(f);sumExcLat+=c.totExc||0;sumRellLat+=c.rell||0;sumConcLat+=c.c4||0;sumRotLat+=(c.rot||0);sumA37Lat+=(c.a37||0);sumPdrLat+=(c.pdr||0);sumCimLat+=(c.cim||0);}});
  if(sumTrans)sumTrans.forEach(function(f){if((f.cant||0)>0){var c=calcCantSumidero(f);sumExcTrans+=c.totExc||0;sumRellTrans+=c.rell||0;sumConcTrans+=c.c4||0;sumRotTrans+=(c.rot||0);sumA37Trans+=(c.a37||0);sumPdrTrans+=(c.pdr||0);sumCimTrans+=(c.cim||0);}});
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
  /* entibado: Le Ã— HP Ã— 2 caras */
  var tEntibado=dN.reduce(function(s,r){return s+(r.Le||0)*((+r.profE||0)+(+r.profS||0))/2*2;},0)*(P.porcEntibado||1);

  var ratioRepTodo = lt > 0 ? dN.reduce(function(s,t){return s+(t.anchoVia==="S"?(t.L||0):0);},0) / lt : 0;

  var autoMap={
    /* 1.01 Vallas Ã— frentes */
    "1.01.01.01":P.vallas1 !== undefined && P.vallas1 !== "" ? P.vallas1 : vaP.v1*FO,
    "1.01.01.02":P.vallas2 !== undefined && P.vallas2 !== "" ? P.vallas2 : vaP.v2*FO,
    "1.01.01.03":P.vallas3 !== undefined && P.vallas3 !== "" ? P.vallas3 : vaP.v3*FO,
    "1.01.01.04":P.vallas4 !== undefined && P.vallas4 !== "" ? P.vallas4 : vaP.v4*FO,
    /* 1.01.02 Señales: 2 por frente */
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
    "1.03.01.01":function(){var r=0;dN.forEach(function(t){if((t.tipoVia==="FX"||t.tipoVia==="TL")&&(P.espesorPav||0.15)<0.10)r+=t.rotP||0;});return r;}(),
    "1.03.01.02":function(){var r=0;dN.forEach(function(t){if(t.tipoVia==="FX"||t.tipoVia==="TL"||!t.tipoVia){var esp=P.espesorPav||0.15;if(esp>=0.10&&esp<=0.20)r+=t.rotP||0;}});return r+sumRotTot;}(),
    "1.03.01.03":function(){var r=0;dN.forEach(function(t){if((t.tipoVia==="FX"||t.tipoVia==="TL")&&(P.espesorPav||0.15)>0.20)r+=t.rotP||0;});return r;}(),
    "1.03.02.01":function(){var r=0;dN.forEach(function(t){if(t.tipoVia==="RG"&&(P.espesorPav||0.15)<0.15)r+=t.rotP||0;});return r;}(),
    "1.03.02.02":function(){var r=0;dN.forEach(function(t){if(t.tipoVia==="RG"){var esp=P.espesorPav||0.15;if(esp>=0.15&&esp<=0.25)r+=t.rotP||0;}});return r;}(),
    "1.03.02.03":function(){var r=0;dN.forEach(function(t){if(t.tipoVia==="RG"&&(P.espesorPav||0.15)>0.25)r+=t.rotP||0;});return r;}(),
    "1.03.03.02":function(){var r=0;dN.forEach(function(t){if(t.tipoVia==="PP"||t.tipoVia==="AD")r+=t.rotP||0;});return r;}(),
    "1.03.04.02":function(){var r=0;dN.forEach(function(t){if(t.tipoVia==="AN")r+=t.rotP||0;});return r;}(),
    /* 2.01 Excavaciones (tramos+pozos+sumideros) */
    "2.01.01.01":(t025+ep2.v025+sumExcTot)*pT*pAL,
    "2.01.01.02":(t2550+ep2.v2550)*pT*pAL,
    "2.01.01.04":(t025+ep2.v025+sumExcTot)*pG*pAL,
    "2.01.01.05":(t2550+ep2.v2550)*pG*pAL,
    "2.01.01.07":(t025+t2550+t50p+ep2.tVE+sumExcTot)*pR*pAL,
    "2.01.02.01":(t025+ep2.v025+sumExcTot)*pT*(1-pAL),
    "2.01.02.02":(t2550+ep2.v2550)*pT*(1-pAL),
    "2.01.02.04":(t025+ep2.v025+sumExcTot)*pG*(1-pAL),
    "2.01.02.05":(t2550+ep2.v2550)*pG*(1-pAL),
    "2.01.02.07":(t025+t2550+t50p+ep2.tVE+sumExcTot)*pR*(1-pAL),
    /* 2.04 Entibado = Le Ã— profProm Ã— 2 caras */
    "2.04.01.01":tEntibado,
    /* 2.05 Rellenos: arena cimentación + común compactado */
    "2.05.01.01":tArena+sumCimTot,
    "2.05.02.01":(tComun+sumRellTot)*.50,
    "2.05.03.01":(tComun+sumRellTot)*.50,
    "2.05.04.02":tArena+sumCimTot,
    /* 2.06 Sobreacarreos con % y estaciones */
    "2.06.01.01":msSobrante*pA200*nEst,
    "2.06.01.02":msSobrante*pA500*nEst,
    "2.06.01.04":msSobrante*pA1000*(P.distBotadero||8),
    /* 3. Tuberías */
    "3.02.01.01":ep2.tTubVent*fD,
    /* 4. Estructuras */
    "4.01.01.01":(ep2.tVC+sumConcTot)*fD,
    "4.01.01.02":(ep2.tVolCaida||0)*fD,
    "4.01.02.02":ep2.tCP*fD,
    "4.02.01.01":(ep2.tA37+(sumA37Tot*0.5))*fD, // Asignando A37 (fy=2590)
    "4.02.01.02":(ep2.tPDR+(sumA37Tot*0.5))*fD, // Asignando PDR-60 (fy=4200)
    "4.04.01.01":ep2.tAM*fD,
    /* 4.05 Sifones de caída */
    "4.05.01.01":caidasCount["4.05.01.01"]||0,"4.05.01.02":caidasCount["4.05.01.02"]||0,"4.05.01.03":caidasCount["4.05.01.03"]||0,"4.05.01.04":caidasCount["4.05.01.04"]||0,
    "4.05.02.01":caidasCount["4.05.02.01"]||0,"4.05.02.02":caidasCount["4.05.02.02"]||0,"4.05.02.03":caidasCount["4.05.02.03"]||0,"4.05.02.04":caidasCount["4.05.02.04"]||0,
    "4.05.03.01":caidasCount["4.05.03.01"]||0,"4.05.03.02":caidasCount["4.05.03.02"]||0,"4.05.03.03":caidasCount["4.05.03.03"]||0,"4.05.03.04":caidasCount["4.05.03.04"]||0,
    "4.05.04.01":caidasCount["4.05.04.01"]||0,"4.05.04.02":caidasCount["4.05.04.02"]||0,"4.05.04.03":caidasCount["4.05.04.03"]||0,"4.05.04.04":caidasCount["4.05.04.04"]||0,
    /* 4.06 Acometidas */
    "4.06.01.01":nAc*(largoAco-(P.anchoAnden||1))*.56*(1-ratioRepTodo)*(P.inclAcom_4060101!==false?1:0),
    "4.06.01.02":nAc*(P.anchoAnden||1)*.56*(P.inclAcom_4060102!==false?1:0),
    "4.06.01.03":ltAc*.56*Math.min(profProm,2)*(P.inclAcom_4060103!==false?1:0),
    "4.06.01.04":ltAc*Math.PI*Math.pow((P.diamAcom||160)/2000,2)*1.5*(P.inclAcom_4060104!==false?1:0),
    "4.06.01.05":ltAc*fD*(P.inclAcom_4060105!==false?1:0),
    "4.06.01.06":nAc*(P.inclAcom_4060106!==false?1:0),
    "4.06.01.07":nAc*(P.inclAcom_4060107!==false?1:0),
    "4.06.01.09":ltAc*.56*Math.min(profProm,2)*.8*(P.inclAcom_4060109!==false?1:0),
    "4.06.01.10":nAc*(largoAco-(P.anchoAnden||1))*.56*(1-ratioRepTodo)*(P.inclAcom_4060110!==false?1:0),
    "4.06.01.11":nAc*(P.anchoAnden||1)*.56*(P.inclAcom_4060111!==false?1:0),
    /* 4.07-4.08 Juntas y pavimentos (+ sumideros) */
    "4.07.01.01":ep2.tJu+sumPdrTot,
    "4.08.01.02":function(){var r=0;dN.forEach(function(t){if(t.tipoVia==="FX"||!t.tipoVia)r+=(t.L||0)*(t.anchoVia||P.anchoVia||6);});return r+sumRotTot;}(),
    "4.08.01.03":function(){var r=0;dN.forEach(function(t){if(t.tipoVia==="FX"||!t.tipoVia)r+=(t.L||0)*(t.anchoVia||P.anchoVia||6);});return r+sumRotTot;}(),
    "4.08.03.01":function(){var r=0;dN.forEach(function(t){if(t.tipoVia==="RG")r+=(t.L||0)*(t.anchoVia||P.anchoVia||6);});return r;}(),
    "4.08.03.02":function(){var r=0;dN.forEach(function(t){if(t.tipoVia==="PP"||t.tipoVia==="AD")r+=(t.L||0)*(t.anchoVia||P.anchoVia||6);});return r;}(),
    "4.09.01.01":function(){var r=0;dN.forEach(function(t){if(t.tipoVia==="AN")r+=(t.L||0)*(t.anchoVia||P.anchoVia||6);});return r;}(),
    /* 5. Varios */
    "5.01.02.01":lt,
    "5.01.03.02":(ep2.tVolDemolicion || 0),
    "5.02.01.01":(ep2.remodelCounts ? ep2.remodelCounts["5.02.01.01"] : 0),
    "5.02.01.02":(ep2.remodelCounts ? ep2.remodelCounts["5.02.01.02"] : 0),
    "5.02.01.03":(ep2.remodelCounts ? ep2.remodelCounts["5.02.01.03"] : 0),
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
  if(ltAc>0)autoMap["4.06.01.05"]=ltAc*fD;

  var isUrbAv = P.urbanismoAvanzado === true || P.urbanismoAvanzado === "S";
  if (isUrbAv && props.urbanismoData) {
    let mode = 'S'; // Siempre sobreescribir para ignorar los cálculos antiguos de anchos de vía
    
    let uDem=0, uExc=0, uRell=0, uSob=0, uSubBase=0, uBase=0, uAnden=0, uSardinel=0, uAceroRG=0, uPavRG=0;
    let uRotAsf_0_10=0, uRotAsf_10_20=0, uRotAsf_20p=0;
    let uRotConc_0_15=0, uRotConc_16_25=0, uRotConc_25p=0;

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
          let andDem = (andA * 0.10); 
          uDem += andDem; uSob += andDem;
      }
      if(r.reqSardinel) {
          let sarL = (r.sarL||L)*(r.sarLados||1);
          uSardinel+=sarL;
          let sarDem = (sarL * 0.08); 
          uDem += sarDem; uSob += sarDem;
      }
    });

    const tryAdd = (cod, val) => {
        if(P['inclUrb_' + cod.replace(/\./g, '')] === false) return;
        if(mode === 'S') autoMap[cod] = val;
        else autoMap[cod] = (autoMap[cod]||0) + val;
    };

    tryAdd("5.01.01.01", uDem);
    tryAdd("4.08.02.02", uSubBase);
    tryAdd("4.08.02.03", uBase);
    tryAdd("4.08.03.01", uPavRG);
    tryAdd("4.02.01.02", uAceroRG);
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

  /* === NOTAS DE REFERENCIA: de dónde sale cada cantidad automática === */
  var autoRef={
    "1.01.01.01":"(Vallas Tipo1 Ã— Frentes de Obra)","1.01.01.02":"(Vallas Tipo2 Ã— Frentes)","1.01.01.03":"(Vallas Tipo3 Ã— Frentes)","1.01.01.04":"(Vallas Tipo4 Ã— Frentes)",
    "1.01.02.01":"(2 señales Ã— Frentes de Obra)",
    "1.01.03.03":"(Long.Nueva Ã· 100)","1.01.03.05":"(NÂ° tramos nuevos)","1.01.03.06":"(Long.Total Nueva)",
    "1.02.01.06":"(Long.Total Nueva)",
    "1.02.03.08":"(Meses de obra)",
    "1.03.01.01":"(âˆ‘ rotP tramos FX/TL, esp<0.10)","1.03.01.02":"(âˆ‘ rotP tramos FX/TL, esp 0.10-0.20 + sumideros)","1.03.01.03":"(âˆ‘ rotP tramos FX/TL, esp>0.20)",
    "1.03.02.01":"(âˆ‘ rotP tramos RG, esp<0.15)","1.03.02.02":"(âˆ‘ rotP tramos RG, esp 0.15-0.25)","1.03.02.03":"(âˆ‘ rotP tramos RG, esp>0.25)",
    "1.03.03.02":"(âˆ‘ rotP tramos PP/AD)","1.03.04.02":"(âˆ‘ rotP tramos AN)",
    "2.01.01.01":"(V0-2.5 + Pozos + Sum) Ã— %Tierra Ã— %Máquina","2.01.01.02":"(V2.5-5 + Pozos) Ã— %Tierra Ã— %Máquina",
    "2.01.01.04":"(V0-2.5 + Pozos + Sum) Ã— %Granular Ã— %Máquina","2.01.01.05":"(V2.5-5 + Pozos) Ã— %Granular Ã— %Máquina",
    "2.01.01.07":"(VolTotal) Ã— %Roca Ã— %Máquina",
    "2.01.02.01":"(V0-2.5 + Pozos + Sum) Ã— %Tierra Ã— (1-%Máquina)","2.01.02.02":"(V2.5-5 + Pozos) Ã— %Tierra Ã— (1-%Máquina)",
    "2.01.02.04":"(V0-2.5 + Pozos + Sum) Ã— %Granular Ã— (1-%Máquina)","2.01.02.05":"(V2.5-5 + Pozos) Ã— %Granular Ã— (1-%Máquina)",
    "2.01.02.07":"(VolTotal) Ã— %Roca Ã— (1-%Máquina)",
    "2.04.01.01":"(Le Ã— HP Ã— 2caras Ã— %Entibado)",
    "2.05.01.01":"(Arena ciment. tramos + sumideros)","2.05.02.01":"(Relleno común Ã— 50%)","2.05.03.01":"(Relleno común Ã— 50%)","2.05.04.02":"(Arena cimentación total)",
    "2.06.01.01":"(Sobrante Ã— %Ac200 Ã— Estaciones)","2.06.01.02":"(Sobrante Ã— %Ac500 Ã— Estaciones)","2.06.01.04":"(Sobrante Ã— %Ac1000 Ã— Dist.Botadero)",
    "3.02.01.01":"(Tub.Ventilación pozos Ã— fDesp)",
    "4.01.01.01":"(Concreto pozos + sumideros Ã— fDesp)","4.01.01.02":"(Vol.Caída pozos Ã— fDesp)","4.01.02.02":"(Concreto pobre pozos Ã— fDesp)",
    "4.02.01.01":"(Acero 37 pozos+sum Ã— fDesp)","4.02.01.02":"(Acero 60 pozos+sum Ã— fDesp)",
    "4.04.01.01":"(Mampostería ladrillo pozos Ã— fDesp)",
    "4.05.01.01":"(Sifón caída D=200mm, pozo Hâ‰¤2m)","4.05.01.02":"(Sifón caída D=200mm, pozo H 2-4m)","4.05.01.03":"(Sifón caída D=200mm, pozo H 4-6m)","4.05.01.04":"(Sifón caída D=200mm, pozo H>6m)",
    "4.05.02.01":"(Sifón caída D=250mm, pozo Hâ‰¤2m)","4.05.02.02":"(Sifón caída D=250mm, pozo H 2-4m)","4.05.02.03":"(Sifón caída D=250mm, pozo H 4-6m)","4.05.02.04":"(Sifón caída D=250mm, pozo H>6m)",
    "4.05.03.01":"(Sifón caída D=315mm, pozo Hâ‰¤2m)","4.05.03.02":"(Sifón caída D=315mm, pozo H 2-4m)","4.05.03.03":"(Sifón caída D=315mm, pozo H 4-6m)","4.05.03.04":"(Sifón caída D=315mm, pozo H>6m)",
    "4.05.04.01":"(Sifón caída D=400mm, pozo Hâ‰¤2m)","4.05.04.02":"(Sifón caída D=400mm, pozo H 2-4m)","4.05.04.03":"(Sifón caída D=400mm, pozo H 4-6m)","4.05.04.04":"(Sifón caída D=400mm, pozo H>6m)",
    "4.06.01.01":"(NÂ°Acom Ã— (largoAco-Anden) Ã— 0.56)","4.06.01.02":"(NÂ°Acom Ã— AnchoAndén Ã— 0.56)","4.06.01.03":"(Long.Acom Ã— 0.56 Ã— profProm)",
    "4.06.01.04":"(Long.Acom Ã— VolTubo)","4.06.01.05":"(Long.Acom Ã— fDesp)","4.06.01.06":"(NÂ° Acometidas)","4.06.01.07":"(NÂ° Acometidas)",
    "4.06.01.09":"(Long.Acom Ã— 0.56 Ã— profProm Ã— 0.8)","4.06.01.10":"(NÂ°Acom Ã— (largoAco-Anden) Ã— 0.56)","4.06.01.11":"(NÂ°Acom Ã— AnchoAndén Ã— 0.56)",
    "4.07.01.01":"(Juntas PVC pozos + sumideros)","4.08.01.02":"(S LÃ—AnchoVía tramos FX + sumideros)","4.08.01.03":"(S LÃ—AnchoVía tramos FX + sumideros)","4.08.03.01":"(S LÃ—AnchoVía tramos RG)","4.08.03.02":"(S LÃ—AnchoVía tramos PP/AD)","4.09.01.01":"(S LÃ—AnchoVía tramos AN)",
    "5.01.02.01":"(Long.Total Nueva)","5.03.01.01":"(NÂ° sumideros laterales)","5.03.01.02":"(NÂ° sumideros trans Ã— rejas)","5.03.02.01":"(NÂ° sumideros laterales)",
    "5.03.03.01":"(NÂ° pozos nuevos)","5.03.03.02":"(NÂ° pozos nuevos)","5.05.01.02":"(LongÃ·100 Ã— 2)","5.05.01.03":"(LongÃ·50)","5.05.03.01":"(NÂ° pozos Ã— 5)",
    "5.07.01.01":"(âˆ‘ LÃ—AnchoVía tramos PS)",
    "5.08.01.02":"(âˆ‘ repP + relleno sumideros)","5.09.01.06":"(LongÃ·100 Ã— 2)","5.09.01.07":"(Long Ã— 4)",
  };
  /* Tuberías: agregar referencia dinámica */
  grp.filter(function(g){return (g.red||0)+(g.sum||0)>0;}).forEach(function(g){
    var tc=mmToCode[g.nom];if(tc)autoRef[tc]="(Red:"+Math.round(g.red||0)+"m + Sum:"+Math.round(g.sum||0)+"m Ã— fDesp)";
  });

    if(pbItems.length>0){
      var updated = false;
      pbItems.forEach(function(it){
        if(autoMap[it.c]!==undefined || (it.auto !== undefined && it.auto > 0)){
          var newAuto=autoMap[it.c]!==undefined ? Math.round(autoMap[it.c]) : 0;
          if(it.q===it.auto||it.auto===0||it.auto===undefined){
            if (it.q !== newAuto) updated = true;
            it.q=newAuto;
          }
          if (it.auto !== newAuto) updated = true;
          it.auto=newAuto;
        }
        var oldD = it.d;
        let nd = it.d;
        let excMaq = P.nombreExcMaquina !== undefined ? P.nombreExcMaquina : "Excavaciones Sin Acarreo Libre";
        let excMan = P.nombreExcManual !== undefined ? P.nombreExcManual : "Excavaciones Con Acarreo Libre";
        if(it.c.startsWith("2.01.01.") && excMaq) nd = nd.replace(/Excavaci.*?n(?: a m.*?quina)?/i, excMaq.replace('%', '').trim());
        else if(it.c.startsWith("2.01.02.") && excMan) nd = nd.replace(/Excavaci.*?n(?: a m.*?quina)?(.*?)(?:con acarreo|acarreo)?/i, excMan.replace('%', '').trim()+"$1");
        else if(nd.toLowerCase().includes("sin acarreo libre") && excMaq) nd = nd.replace(/sin acarreo libre/ig, excMaq.replace('%', '').trim());
        else if(nd.toLowerCase().includes("con acarreo libre") && excMan) nd = nd.replace(/con acarreo libre/ig, excMan.replace('%', '').trim());
        it.d = nd;
        if (oldD !== it.d) updated = true;
      });
      // In a real app we'd call setPbItems([...pbItems]) if updated is true, but since we rely on mutations we just let it pass.
    }
  var handleLoadPB=function(e){var f=e.target.files[0];if(!f)return;f.arrayBuffer().then(function(buf){
    var pb=parsePtoBase(new Uint8Array(buf));
    pb.forEach(function(it){if(autoMap[it.c]!==undefined)it.q=Math.round(autoMap[it.c]);it.auto=it.q;});
    setPbItems(pb);
  });};
  var updQ=function(i,v){var n=pbItems.slice();n[i]=Object.assign({},n[i]);n[i].q=v;setPbItems(n);};
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
    var dR=props.R.filter(function(r){return !r.sep;});
    var dN=dR.filter(function(r){return r.reponer==="S";});
    var lt=dN.reduce(function(s,r){return s+(r.L||0);},0);
    var pma = (P.reqPMA !== "S" && P.reqPMA !== true) ? 0 : cd * (P.porcPMA !== undefined ? P.porcPMA : 0.025525);
    var pmt = (P.reqPMT !== "S" && P.reqPMT !== true) ? 0 : cd * (P.porcPMT !== undefined ? P.porcPMT : 0.051068);
    import('../exportBanco').then(m => {
      m.exportBancoExcel(P, used, capTot, cd, adm, imp, ut, pma, pmt, (capTot["S"]||0), lt, items);
    });
  };
  return <div>
    {props.isEmpas && (
      <div style={{ background: "linear-gradient(90deg, #b91c1c, #ef4444)", color: "white", padding: "10px 15px", borderRadius: "6px", marginBottom: "15px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "10px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        Presupuesto Oficial de EMPAS S.A. y sus especificaciones técnicas.
      </div>
    )}
    <div style={{display:"flex",gap:6,marginBottom:6,flexWrap:"wrap",alignItems:"center"}}>
      <div style={{display:"flex",alignItems:"center",gap:6,flex:1}}>
        <span style={{fontSize:12,color:"#28A745"}}>PtoBase: {leafs.length} items ({used.length} con cant)</span>
        <button className="btn" onClick={function(){if(refPB.current)refPB.current.click();}} style={{fontSize:10,padding:"2px 6px",background:"#1C2E4A"}} title="Actualizar precios desde .xlsm">Cargar .XLSM completo</button>
        <span style={{fontSize:10,color:"#7088A8"}}>(Si faltan items, sube tu PtoBase.xlsm aquí)</span>
        <input ref={refPB} type="file" accept=".xlsm,.xlsx" style={{display:"none"}} onChange={handleLoadPB}/>
      </div>
      <div className="stabs">
        <button className={"stab"+(filt==="used"?" a":"")} onClick={function(){setFilt("used");}}>Utilizados ({used.length})</button>
        <button className={"stab"+(filt==="all"?" a":"")} onClick={function(){setFilt("all");}}>Todos ({leafs.length})</button>
      </div>
      <input type="text" placeholder="Buscar codigo o descripcion..." value={search} onChange={function(e){setSearch(e.target.value);}} style={{flex:1,background:"#0C1122",border:"1px solid #1C2E4A",borderRadius:3,padding:"5px 8px",color:"#D8E2F0",fontSize:12,minWidth:160}}/>
      {used.length>0?<button className="btn" onClick={handleExportPre} style={{fontSize:11,padding:"4px 10px",background:"linear-gradient(135deg,#28A745,#1A6B2C)"}}>XLSX</button>:null}
    </div>
    {shown.length>0?<div className="c"><div className="ct">Presupuesto ({shown.length} items)</div><div style={{overflowX:"auto",maxHeight:props.isExport?"none":"50vh",overflowY:props.isExport?"visible":"auto"}}><table><thead><tr>
      <TH style={{width:90}}>Codigo</TH><TH style={{minWidth:200}}>Descripcion</TH><TH>Und</TH><TH style={{width:80}}>Cant</TH><TH>P.Unit</TH><TH style={{width:100}}>Total</TH>
    </tr></thead><tbody>
      {shown.map(function(it,idx){
        var ri=items.indexOf(it);var total=Math.round((it.q||0)*(it.p||0));
        var isUsed=it.q>0;var isAuto=it.auto>0&&it.q===it.auto;
        var pts=it.c.split(".");var hRows=[];
        for(var hi=1;hi<pts.length;hi++){var hk=pts.slice(0,hi).join(".");var prevHk=idx>0?function(){var pp=shown[idx-1].c.split(".");return pp.length>=hi?pp.slice(0,hi).join("."):"";  }():"";
          if(hk!==prevHk){var hd=hi;var nm=CAPNAMES[hk]||(items.find(function(it2){return it2.c===hk;})||{}).d||"";
          let excMaq = P.nombreExcMaquina !== undefined ? P.nombreExcMaquina : "Excavaciones Sin Acarreo Libre";
          let excMan = P.nombreExcManual !== undefined ? P.nombreExcManual : "Excavaciones Con Acarreo Libre";
          if(hk==="2.01.01" && excMaq) nm=excMaq.replace('%', '').trim();
          else if(nm.toLowerCase().includes("sin acarreo libre") && excMaq) nm=nm.replace(/sin acarreo libre/ig, excMaq.replace('%', '').trim());
          else if(hk==="2.01.02" && excMan) nm=excMan.replace('%', '').trim();
          else if(nm.toLowerCase().includes("con acarreo libre") && excMan) nm=nm.replace(/con acarreo libre/ig, excMan.replace('%', '').trim());
          hRows.push(<tr key={"h"+hk+idx} style={{background:hd===1?"#003B73":hd===2?"#0F2A4A":"#152035"}}><td style={{fontWeight:700,color:hd===1?"#fff":"#7088A8",fontSize:14-hd}}>{hk}</td><td colSpan={4} style={{textAlign:"left",fontWeight:hd===1?700:500,color:hd===1?"#fff":"#7088A8",fontSize:13-hd,paddingLeft:hd*10}}>{nm}</td><td style={{color:"#D4A843",fontWeight:700}}>{hd===1?fm(capTot[hk]||0):""}</td></tr>);}}
        var itemDesc = it.d;
        return <React.Fragment key={it.c+idx}>{hRows}<tr style={{opacity:isUsed?1:.5}}>
          <td style={{fontSize:11,textAlign:"left",color:isUsed?"#00A6D6":"#555"}}>{it.c}</td>
          <td style={{textAlign:"left",fontSize:11}}>{itemDesc}</td><td>{it.u}</td>
          <td><input className={isUsed?"ec":""} type="number" step="any" min="0" value={it.q||""} onChange={function(e){updQ(ri,+e.target.value);}} style={{width:70,fontSize:11,padding:3,background:isAuto?"#1A2A15":"#0C1122",border:"1px solid "+(isAuto?"#2D5A1E":"#1C2E4A"),color:isUsed?"#D8E2F0":"#555",borderRadius:3}}/></td>
          <td style={{fontSize:11}}>{it.p>0?it.p.toLocaleString("es-CO"):"-"}</td>
          <td style={{fontWeight:isUsed?600:400,color:isUsed?"#D4A843":"#555"}}>{total>0?total.toLocaleString("es-CO"):"-"}</td>
        </tr></React.Fragment>;
      })}
    </tbody></table></div></div>:null}
    {cd>0?<div className="c" style={{marginTop:8}}><div className="ct">A.I.U. y Costo Total</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:4,marginBottom:6}}>
        {["1","2","3","4","5"].map(function(ch){return <div key={ch} style={{background:"#151D30",border:"1px solid #1C2E4A",borderRadius:4,padding:6,textAlign:"center"}}><div style={{fontSize:10,color:"#7088A8"}}>Cap.{ch}</div><div style={{fontSize:12,fontWeight:700,color:"#D4A843",fontFamily:"monospace"}}>{fm(capTot[ch]||0)}</div></div>;})}
      </div>
      {(() => {
        var admVal = cd * (P.porcAdmin || 0.29);
        var impVal = cd * (P.porcImprevistos || 0.01);
        var utVal = cd * (P.porcUtilidad || 0.05);
        var ivaVal = utVal * (P.porcIVA || 0.19);
        var pma = (P.reqPMA !== "S" && P.reqPMA !== true) ? 0 : cd * (P.porcPMA !== undefined ? P.porcPMA : 0.025525);
        var pmt = (P.reqPMT !== "S" && P.reqPMT !== true) ? 0 : cd * (P.porcPMT !== undefined ? P.porcPMT : 0.051068);
        var obraCivil = cd + admVal + impVal + utVal + ivaVal;
        var costoObra = obraCivil + pma + pmt;
        var interObra = (P.reqInterventoria === "S" || P.reqInterventoria === true) ? (costoObra + (capTot["S"] || 0) + ((capTot["S"] || 0) * 0.291)) * (P.porcInterventoria !== undefined ? P.porcInterventoria : 0.08) : 0;
        
        var sumDirecto = capTot["S"] || 0;
        var aiuSum = sumDirecto * 0.291;
        var intSum = 0;
        var costoSuministros = sumDirecto + aiuSum + intSum;
        var costoTotalProyecto = costoObra + interObra + costoSuministros;

        return <>
          <div className="dpr" style={{color:"#D8E2F0"}}><span>COSTO DIRECTO OBRA CIVIL</span><span>{fm(cd)}</span></div>
          <div className="dpr"><span>Admin ({((P.porcAdmin||0.29)*100).toFixed(0)}%)</span><span>{fm(admVal)}</span></div>
          <div className="dpr"><span>Imprevistos ({((P.porcImprevistos||0.01)*100).toFixed(0)}%)</span><span>{fm(impVal)}</span></div>
          <div className="dpr"><span>Utilidad ({((P.porcUtilidad||0.05)*100).toFixed(0)}%)</span><span>{fm(utVal)}</span></div>
          <div className="dpr"><span>IVA sobre Utilidad ({((P.porcIVA||0.19)*100).toFixed(0)}%)</span><span>{fm(ivaVal)}</span></div>
          <div className="dpr" style={{color:"#D8E2F0", fontWeight: 600}}><span>COSTO TOTAL OBRA CIVIL</span><span>{fm(obraCivil)}</span></div>
          <div className="dpr"><span>Plan Manejo Ambiental (PMA)</span><span>{fm(pma)}</span></div>
          <div className="dpr"><span>Plan Manejo Tránsito (PMT)</span><span>{fm(pmt)}</span></div>
          
          <div style={{borderTop:"1px solid #1C2E4A",marginTop:6,paddingTop:6,display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:14,fontWeight:700,color:"#00A6D6"}}>COSTO TOTAL OBRA</span>
            <span style={{fontSize:16,fontWeight:700,color:"#00A6D6",fontFamily:"monospace"}}>{fm(costoObra)}</span>
          </div>
          
          <div className="dpr" style={{marginTop:4}}><span>Interventoría</span><span>{fm(interObra)}</span></div>
          
          <div style={{borderTop:"1px solid #1C2E4A",marginTop:6,paddingTop:6,display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:13,color:"#D8E2F0"}}>Subtotal Suministros</span>
            <span style={{fontSize:14,color:"#D8E2F0",fontFamily:"monospace"}}>{fm(sumDirecto)}</span>
          </div>
          <div className="dpr"><span>A.I.U Suministros (29.1%)</span><span>{fm(aiuSum)}</span></div>
          <div className="dpr"><span>Interventoría de Suministros (16.3%)</span><span>{fm(intSum)}</span></div>
          
          <div style={{borderTop:"2px solid #28A745",marginTop:8,paddingTop:8,display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:16,fontWeight:700,color:"#28A745"}}>COSTO TOTAL DEL PROYECTO</span>
            <span style={{fontSize:22,fontWeight:700,color:"#D4A843",fontFamily:"monospace"}}>{fm(costoTotalProyecto)}</span>
          </div>
        </>;
      })()}
    </div>:null}
  </div>;
}


export default PreTab;
