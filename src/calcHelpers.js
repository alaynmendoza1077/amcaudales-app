import {SUM_TYPES, SUM_TYPES_TRANS, PIPES} from './constants';
import {gDi, gDe} from './engine';

/* calcCantSumidero — cantidades de obra por unidad de sumidero
 * ⚠️ DISCREPANCIA (auditoría 2026-06-24): esta función define su propia tabla BASE
 * que difiere de SUM_TYPES en constants.js (p.ej. cim:0.18 vs 2.352).
 * BASE es la tabla vigente de facto; SUM_TYPES parece no usarse. UNIFICAR.
 *
 * Unidades por sumidero: cim=m³ cimiento, exc=m³ excavación, rell=m³ relleno,
 *   cp=m³ concreto pobre, c4=m³ concreto 4000, excC=m³ excavación complementaria,
 *   a37=m² asfalto A-37, pdr=kg acero PDR-60, cinta=m cinta PVC,
 *   rot=m² rotura pavimento, rep=m² reposición pavimento, comp=und compuerta.
 * Valores de BASE calibrados a partir de planos tipo EMPAS / detalles constructivos.
 */
function calcCantSumidero(fila, P){
  var n=fila.cant||0;
    var chk = function(key) { return (!P || P["inclSum_" + key] !== false) ? 1 : 0; };
  if(fila.tipo==="ST-40"||fila.tipo==="ST2-40"){
    var bt=SUM_TYPES_TRANS[fila.tipo]||SUM_TYPES_TRANS["ST-40"];
    return{cim:bt.cim*n*chk("cim"),exc:bt.exc*n*chk("exc"),excC:0,totExc:(bt.cim+bt.exc)*n*chk("totExc"),rell:bt.rell*n*chk("rell"),cp:bt.cp*n*chk("cp"),c4:bt.c4*n*chk("c4"),a37:bt.a37*n*chk("a37"),pdr:bt.pdr*n*chk("pdr"),rejas:bt.rejas*n*chk("rejas"),cinta:bt.cinta*n*chk("cinta"),rot:bt.rot*n*chk("rot"),rep:bt.rep*n*chk("rep"),comp:bt.comp*n*chk("comp")};
  }
  var BASE={"SL-200":{cim:0.18,exc:3.91,rell:3.465,cp:.1,c4:2,excC:8.19,a37:10,pdr:30,cinta:6.6,rot:4.29,rep:5.49,comp:1},"SL-400":{cim:0.25,exc:6.785,rell:3.444,cp:.2,c4:2.7,excC:8.19,a37:13.5,pdr:40.5,cinta:10.3,rot:4.29,rep:5.49,comp:1},"SL-600":{cim:0.35,exc:9.66,rell:3.444,cp:.3,c4:3.8,excC:8.19,a37:19,pdr:57,cinta:14.2,rot:4.29,rep:5.49,comp:1}};
  var b=BASE[fila.tipo]||BASE["SL-200"];
  return{cim:b.cim*n*chk("cim"),exc:b.exc*n*chk("exc"),excC:b.excC*n*chk("excC"),totExc:(b.cim+b.exc+b.excC)*n*chk("totExc"),rell:b.rell*n*chk("rell"),cp:b.cp*n*chk("cp"),c4:b.c4*n*chk("c4"),a37:b.a37*n*chk("a37"),pdr:b.pdr*n*chk("pdr"),cinta:b.cinta*n*chk("cinta"),rot:b.rot*n*chk("rot"),rep:b.rep*n*chk("rep"),comp:b.comp*n*chk("comp"),rejas:0};
}
function agruparTuberias(R,sumLat,sumTrans,params){
  var grupos={};
  var matGrupos={};
  R.filter(function(r){return !r.sep&&r.reponer==="S";}).forEach(function(r){
    var nom = r.nom;
    if(!grupos[nom])grupos[nom]={nom:nom,red:0,sum:0,acom:0};
    grupos[nom].red+=r.L||0;
    var mk=nom+"|"+(r.mat||"PVC");
    if(!matGrupos[mk])matGrupos[mk]={nom:nom,mat:r.mat||"PVC",red:0};
    matGrupos[mk].red+=r.L||0;
  });
  if(sumLat)sumLat.forEach(function(f){if((f.cant||0)>0){var dSum=(f.diam||200);var nom=dSum+" mm";if(!grupos[nom])grupos[nom]={nom:nom,red:0,sum:0,acom:0};grupos[nom].sum+=(f.long||6)*(f.cant||0);}});
  if(sumTrans)sumTrans.forEach(function(f){if((f.cant||0)>0){var dSumT=(f.diam||200);var nom=dSumT+" mm";if(!grupos[nom])grupos[nom]={nom:nom,red:0,sum:0,acom:0};grupos[nom].sum+=(f.long||6)*(f.cant||0);}});
  var nomAcom=(params.diamAcom||160)+" mm";if(!grupos[nomAcom])grupos[nomAcom]={nom:nomAcom,red:0,sum:0,acom:0};
  var largoAco=params.largoAco||6;
  grupos[nomAcom].acom+=params.nAcom06*largoAco+(params.nAcom610||0)*(largoAco+2)+(params.nAcom10||0)*(largoAco+6);
  var arr=[];for(var k in grupos)arr.push(grupos[k]);
  arr.sort(function(a,b){return parseFloat(a.nom)-parseFloat(b.nom);});
  var matArr=[];for(var mk in matGrupos)matArr.push(matGrupos[mk]);
  matArr.sort(function(a,b){return parseFloat(a.nom)-parseFloat(b.nom)||(a.mat<b.mat?-1:1);});
  arr.matDetalle=matArr;
  return arr;
}

function calcExcPozos(R){
  var dR=R.filter(function(r){return !r.sep;});
  var pz=[];
  var nSet={};
  var orderedNodes=[];
  dR.forEach(function(r){
    if(r.de && !nSet[r.de]){ nSet[r.de]=1; orderedNodes.push(r.de); }
    if(r.a && !nSet[r.a]){ nSet[r.a]=1; orderedNodes.push(r.a); }
  });
  orderedNodes.forEach(function(n){
    var ent=dR.filter(function(r){return r.a===n;});
    var sal=dR.filter(function(r){return r.de===n;});
    if(ent.length>0&&sal.length>0){
      var e=ent[0];var prof=+((e.crA||0)-e.cfA).toFixed(3);
      var diam=Math.max(parseFloat(e.nom),parseFloat(sal[0].nom))/1000+1.2;
      var vol=Math.PI*Math.pow(diam/2,2)*prof;
      pz.push({nodo:n,prof:prof,vol:vol,v025:prof<=2.5?vol:Math.PI*Math.pow(diam/2,2)*2.5,v2550:prof>2.5?Math.PI*Math.pow(diam/2,2)*Math.min(prof-2.5,2.5):0,v50p:prof>5?Math.PI*Math.pow(diam/2,2)*(prof-5):0});
    }
  });
  var totVol=0,tot025=0,tot2550=0,tot50p=0;
  pz.forEach(function(p){totVol+=p.vol;tot025+=p.v025;tot2550+=p.v2550;tot50p+=p.v50p;});
  return{pz:pz,totVol:totVol,tot025:tot025,tot2550:tot2550,tot50p:tot50p};
}

function calcExcSumideros(sumArr, P){
  var tot=0;
  if(sumArr)sumArr.forEach(function(f){var c=calcCantSumidero(f, P);tot+=(c.cim||0)+c.exc+(c.excC||0);});
  return tot;
}



/* calcVallasAuto — estimación automática de número de vallas de señalización
 * 5474000: costo referencial COP por metro lineal de tubería (incluye instalación).
 * ⚠️ Este valor es ECONÓMICO y DEVALUABLE — requiere fecha de referencia.
 * Rangos de valor de obra (cdv) en COP para definir número de vallas:
 *   ≥ $10.000M → v1, ≥ $5.000M → v2, ≥ $1.000M → v3, < $1.000M → v4
 * Fuente: convención EMPAS para presupuestos de alcantarillado.
 */
function calcVallasAuto(R,pbItems){
  if(!R||!R.length)return{v1:0,v2:0,v3:0,v4:1};
  var dNv=R.filter(function(r){return !r.sep&&r.reponer==="S";});
  var ltv=dNv.reduce(function(s,r){return s+(r.L||0);},0);
  var pbCdv=0;if(pbItems)pbItems.forEach(function(it){if(it.lv>=3&&it.q>0&&it.p>0)pbCdv+=Math.round(it.q*it.p);});
  var cdv=pbCdv>0?pbCdv:Math.round(ltv*5474000);
  var cdM=cdv/1000000;
  var numVallas = Math.max(1, Math.round(cdM / 1000));
  return{v1:cdM>=10000?numVallas:0,v2:(cdM>=5000&&cdM<10000)?numVallas:0,v3:(cdM>=1000&&cdM<5000)?numVallas:0,v4:cdM<1000?numVallas:0};
}
/* calcPozosCompleto — cómputo detallado de cantidades de pozo por nodo
 * Basado en planos tipo EMPAS / Excel de presupuestos EMPAS.
 * Constantes constructivas:
 *   ESP=0.25     → espesor total de pared de pozo (mampostería)
 *   ESP_BASE=0.20→ espesor fondo/base de concreto (m)
 *   ESP_TAPA=0.15→ espesor tapa/corona de concreto (m)
 *   PDR60_FIJO=26.5→ kg de acero PDR-60 por tapa de pozo nuevo (fijo EMPAS)
 *   0.56        → descontado de profundidad (hConc = prof - 0.56 = prof - ESP_TAPA - ESP_BASE - sobre-exc)
 *   0.35        → espaciamiento peldaños (m), φ ≥ 12mm, norma EMPAS
 *   1.30, 1.40  → diámetros de corona/fondo de pozo (m), para volumen concreto
 *   4.5         → factor A-37 por m de cuerpo de pozo (m²·/m = recubrimiento asfalto pared)
 *   80          → kg PDR-60 por m³ de concreto de cuerpo de pozo (kg/m³)
 *
 * DI según Tabla 10 RAS-2017 (v36.6):
 *   d≤600mm → DI=1.20m, 600<d≤900 → DI=1.80m, d>900 → DI=2.20m
 *
 * Cámara de caída: deltaH>0.75m → requiere estructura dedicada (Tabla 11 RAS).
 *   d≤300mm → 170mm, d≤450mm → 280mm, >450mm → 360mm
 *   ⚠️ VERIFICAR UNIDADES de diamEstrCaida contra Tabla 11 RAS.
 *
 * Ver DOC_MOTOR_HIDRAULICO.md §12.2 para detalle completo.
 */
function calcPozosCompleto(R,T,P){
  var dR=R.filter(function(r){return !r.sep;});
  if(!dR.length)return{pz:[],tVC:0,tAM:0,tVE:0,tAK:0,tPe:0,tJu:0,tCP:0,nCaida:0,nNuevos:0,tVolDemolicion:0,remodelCounts:{"5.02.01.01":0,"5.02.01.02":0,"5.02.01.03":0}};
  var ESP=0.25;
  var ESP_BASE=0.20;var ESP_TAPA=0.15;
  var PDR60_FIJO=26.5;
  var pz=[];
  var nSet={};
  var orderedNodes=[];
  dR.forEach(function(r){
    if(r.de && !nSet[r.de]){ nSet[r.de]=1; orderedNodes.push(r.de); }
    if(r.a && !nSet[r.a]){ nSet[r.a]=1; orderedNodes.push(r.a); }
  });
  orderedNodes.forEach(function(n){
    var ent=dR.filter(function(r){return r.a===n;});
    var sal=dR.filter(function(r){return r.de===n;});
    if(ent.length===0&&sal.length===0)return;
    var e=ent.length>0?ent[0]:null;var s=sal.length>0?sal[0]:null;
    var cr=s?(s.crDE||0):(e?e.crA:0);var cf=s?s.cfDE:(e?e.cfA:0);
    var profN=+((cr-cf)).toFixed(3);if(profN<0.5)profN=0.5;
    var dMaxMM=0;ent.forEach(function(r){var d=parseFloat(r.nom)||0;if(d>dMaxMM)dMaxMM=d;});
    sal.forEach(function(r){var d=parseFloat(r.nom)||0;if(d>dMaxMM)dMaxMM=d;});
    var dTubM=dMaxMM/1000;
    /* DI según Tabla 10 RAS — d≤600→1.20, 600<d≤900→1.80, d>900→2.20 */
    var DI=dMaxMM<=600?1.20:dMaxMM<=900?1.80:2.20;
    var DE_P=DI+2*ESP;
    var DE_EXC=DE_P+0.22;  // 0.22m = sobreancho de excavación por lado (0.11m×2)
    var alertaDI=dMaxMM>600;
    var tMatch=null;
    (T||[]).forEach(function(tr){if(tr.de===n||tr.a===n)tMatch=tr;});
    if(!tMatch)(T||[]).forEach(function(tr){if(String(tr.de).indexOf(n)>=0||String(tr.a).indexOf(n)>=0||n.indexOf(String(tr.de))>=0||n.indexOf(String(tr.a))>=0)tMatch=tr;});
    var tipoPozo=tMatch?tMatch.tipoPozo:"M";
    var reponer=tMatch?tMatch.reponer:"S";
    var pozoNuevo=tMatch?tMatch.pozoNuevo:"N";
    if(!tipoPozo)tipoPozo="M";if(!reponer)reponer="S";if(!pozoNuevo)pozoNuevo="N";

    // Chequeo de Remodelar según checkbox en P.remodelPozos
    var isRemodelar = !!(P && P.remodelPozos && P.remodelPozos[n]);
    var remodelCode = profN <= 2.0 ? "5.02.01.01" : profN <= 4.0 ? "5.02.01.02" : "5.02.01.03";

    // Volumen de Demolición del Pozo (m3) = cilindro exterior DE_P * profN
    var volDemolicion = Math.PI * Math.pow(DE_P / 2, 2) * profN;

    /* Fórmulas de volumen de concreto de pozo (calibradas Excel EMPAS) */
    var hConcTotal = Math.max(0, profN - 0.56);
    var hMamp = 0;
    var hConc = hConcTotal;
    if(pozoNuevo!=="S" || isRemodelar){hConc=0;hConcTotal=0;}
    var Rint = DI/2;
    var ESP_PARED = 0.20;
    var Rext_pared = Rint + ESP_PARED;
    var areaAnillo = Math.PI*(Rext_pared*Rext_pared - Rint*Rint);
    var volParedConc = (pozoNuevo==="S" && !isRemodelar) ? areaAnillo * hConcTotal : 0;
    var volCorona = (pozoNuevo==="S" && !isRemodelar) ? Math.PI * Math.pow(1.30/2, 2) * 0.20 : 0;
    var volFondo = (pozoNuevo==="S" && !isRemodelar) ? Math.PI * Math.pow(1.40/2, 2) * 0.30 : 0;
    var volConcTotal = volParedConc + volCorona + volFondo;
    var volBase = volFondo;
    var volTapa = volCorona;
    var areaMamp = (pozoNuevo==="S" && !isRemodelar) ? 1.008 : 0;
    // Excavación: cilindro DE_EXC × (prof + 0.20m sobre-excavación)
    var volExc=(pozoNuevo==="S" && !isRemodelar)?Math.PI*Math.pow(DE_EXC/2,2)*(profN+0.20):0;
    var v025p=0;var v2550p=0;var v50pp=0;
    if(pozoNuevo==="S" && !isRemodelar){
      var Aex=Math.PI*Math.pow(DE_EXC/2,2);var hp=profN+0.20;
      v025p=hp<=2.5?Aex*hp:Aex*2.5;
      v2550p=hp>2.5?Aex*Math.min(hp-2.5,2.5):0;
      v50pp=hp>5?Aex*(hp-5):0;
    }
    var a60Tapa = (pozoNuevo==="S" && !isRemodelar ? PDR60_FIJO : 0);
    var a60Cuerpo = (volConcTotal*15);
    var pdr60 = a60Tapa + a60Cuerpo;
    var a37Cuerpo = (pozoNuevo==="S" && !isRemodelar ? volConcTotal*5 : 0);
    var a37 = a37Cuerpo;
    var peldanos = (!isRemodelar) ? Math.max(0,Math.floor((profN-0.5)/0.35)) : 0;
    var juntaPVC = (pozoNuevo==="S" && !isRemodelar) ? Math.PI*DI : 0;
    var concPobre = (pozoNuevo==="S" && !isRemodelar) ? Math.PI*Math.pow(1.30/2,2)*0.05 : 0;
    var reduccion=0;
    if(pozoNuevo==="S" && !isRemodelar && ent.length>0 && sal.length>0){
      var dEntMM=parseFloat(ent[0].nom)||0;
      var dSalMM=parseFloat(sal[0].nom)||0;
      if(dEntMM>dSalMM)reduccion=Math.PI*DI*0.30;
    }
    var cfSalida=s?s.cfDE:cf;
    var caidas=[];
    var llegadas=[];
    ent.forEach(function(r,idx){
      var cfLlegada=r.cfA||0;
      var deltaH=cfLlegada-cfSalida;
      var dLlegMM=parseFloat(r.nom)||315;
      var dLlegPul=+(dLlegMM/25.4).toFixed(2);
      llegadas.push({idx:idx,diam:dLlegMM,diamPul:dLlegPul,nom:r.nom,cf:cfLlegada,deltaH:+deltaH.toFixed(3),S:r.S||0,de:r.de});
      if(deltaH>0.75){
        var diamEstrCaida=dLlegMM<=300?170:dLlegMM<=450?280:360;
        caidas.push({diam:dLlegMM,deltaH:+deltaH.toFixed(3),diamPul:dLlegPul,diamEstr:diamEstrCaida});
      }
    });
    var dSalMM2=s?parseFloat(s.nom)||315:0;
    var dSalPul=+(dSalMM2/25.4).toFixed(2);
    var peSal=s?s.S||0:0;
    var csSal=s?s.cfDE||0:0;
    var volCaida=0;
    caidas.forEach(function(cc){var dCm=cc.diam/1000;volCaida+=Math.PI*Math.pow(dCm/2,2)*cc.deltaH*1.2;});
    var tubVent=(pozoNuevo==="S" && !isRemodelar)?3:0;
    pz.push({nodo:n,prof:profN,tipoPozo:tipoPozo,pozoNuevo:pozoNuevo,reponer:reponer,
      isRemodelar:isRemodelar, remodelCode: isRemodelar ? remodelCode : null,
      volDemolicion:+volDemolicion.toFixed(3),
      volConc:+volConcTotal.toFixed(3),areaMamp:+areaMamp.toFixed(2),volExc:+volExc.toFixed(3),
      peldanos:peldanos,juntaPVC:+juntaPVC.toFixed(2),
      concPobre:+concPobre.toFixed(3),caidas:caidas,nAflu:ent.length,
      hConc:+hConcTotal.toFixed(2),hMamp:+hMamp.toFixed(2),volCaida:+volCaida.toFixed(3),tubVent:tubVent,
      De:e?e.nom:"-",Ds:s?s.nom:"-",cr:+(cr).toFixed(3),cf:+(cf).toFixed(3),
      tipo:profN<=1.5?"Peq":profN<=3?"Med":"Gra",
      v025:+v025p.toFixed(3),v2550:+v2550p.toFixed(3),v50p:+v50pp.toFixed(3),
      pdr60:+pdr60.toFixed(1),a37:+a37.toFixed(1),
      a60Tapa:+a60Tapa.toFixed(1), a60Cuerpo:+a60Cuerpo.toFixed(1), a37Cuerpo:+a37Cuerpo.toFixed(1),
      reduccion:+reduccion.toFixed(3),
      volBase:+volBase.toFixed(3),volTapa:+volTapa.toFixed(3),
      dePul:llegadas.length>0?llegadas[0].diamPul:0,
      dsCom:s?s.nom:"-",dsPul:dSalPul,
      peSal:+peSal.toFixed(2),csSal:+csSal.toFixed(3),
      llegadas:llegadas,
      DI:DI,ESP:ESP,DE:DE_P,alertaDI:alertaDI,dMaxColector:dMaxMM,
    });
  });
  pz.sort(function(a,b){return b.prof-a.prof;});
  var tVC=0,tAM=0,tVE=0,tPe=0,tJu=0,tCP=0,nCaida=0,nNuevos=0;
  var tVolCaida=0,tTubVent=0,tVolDemolicion=0;
  var remodelCounts={"5.02.01.01":0, "5.02.01.02":0, "5.02.01.03":0};

  var tPDR=0,tA37=0,tRed=0,tV025=0,tV2550=0,tV50p=0;
  var tA60T=0;var tA60C=0;var tA37C=0;
  pz.forEach(function(p){
    tVC+=p.volConc;tAM+=p.areaMamp;tVE+=p.volExc;
    tPe+=p.peldanos;tJu+=p.juntaPVC;tCP+=p.concPobre;
    if (p.reponer === "S" || p.isRemodelar) {
      tVolDemolicion += (p.volDemolicion || 0);
    }
    if (p.isRemodelar && p.remodelCode) {
      remodelCounts[p.remodelCode] = (remodelCounts[p.remodelCode] || 0) + 1;
    }
    if(p.pozoNuevo==="S" && !p.isRemodelar){
      tVolCaida+=p.volCaida||0;
      tTubVent+=p.tubVent||0;
      if(p.caidas.length>0)nCaida++;
      nNuevos++;
    }
    tPDR+=p.pdr60||0;tA37+=p.a37||0;tRed+=p.reduccion||0;
    tA60T+=p.a60Tapa||0;tA60C+=p.a60Cuerpo||0;tA37C+=p.a37Cuerpo||0;
    tV025+=p.v025||0;tV2550+=p.v2550||0;tV50p+=p.v50p||0;
  });
  return{pz:pz,tVC:tVC,tAM:tAM,tVE:tVE,tPe:tPe,tJu:tJu,tCP:tCP,nCaida:nCaida,nNuevos:nNuevos,tVolCaida:tVolCaida,tTubVent:tTubVent,
    tVolDemolicion:+tVolDemolicion.toFixed(3),
    remodelCounts:remodelCounts,
    tPDR:tPDR,tA37:tA37,tRed:tRed,
    tA60T:tA60T, tA60C:tA60C, tA37C:tA37C,
    v025:tV025,
    v2550:tV2550,
    v50p:tV50p};
}

export {calcCantSumidero, agruparTuberias, calcExcPozos, calcExcSumideros, calcVallasAuto, calcPozosCompleto};
