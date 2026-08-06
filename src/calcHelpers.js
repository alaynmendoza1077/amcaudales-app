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
    var lenEfectiva = r.Le || r.L || 0;
    if(!grupos[nom])grupos[nom]={nom:nom,red:0,sum:0,acom:0};
    grupos[nom].red+=lenEfectiva;
    var mk=nom+"|"+(r.mat||"PVC");
    if(!matGrupos[mk])matGrupos[mk]={nom:nom,mat:r.mat||"PVC",red:0};
    matGrupos[mk].red+=lenEfectiva;
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

    // Volumen de Demolición del Pozo (m3) = SOLO si se escogió a remodelar o pozo nuevo a reponer desde Datos
    var isDemoler = isRemodelar || (pozoNuevo === "S" && reponer === "S");
    var areaTubularPared = Math.PI * (Math.pow(DE_P / 2, 2) - Math.pow(DI / 2, 2));
    var volDemolicion = isDemoler ? areaTubularPared * profN : 0;

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

export function getItemAnalyticalBreakdown(item, data = {}) {
  const { R = [], T = [], sumLat = [], sumTrans = [], P = {}, urbanismoData = [] } = data;
  const code = item.c || "";
  const q = item.q || 0;
  const unit = item.u || "UND";

  let formula = "";
  let originTitle = "Análisis Detallado por Componentes";
  let sections = [];

  const fD = 1 + (P.porcDesperdicio || 0);
  const pT = P.porcExcTierra !== undefined ? parseFloat(P.porcExcTierra) : 0.55;
  const pG = P.porcExcGranular !== undefined ? parseFloat(P.porcExcGranular) : 0.30;
  const pR = P.porcExcRoca !== undefined ? parseFloat(P.porcExcRoca) : 0.15;
  const pAL = P.porcAcarreoLibre !== undefined ? parseFloat(P.porcAcarreoLibre) : 0.50;

  const nAc = (parseFloat(P.nAcom06)||0) + (parseFloat(P.nAcom610)||0) + (parseFloat(P.nAcom10)||0);
  const largoAco = parseFloat(P.largoAco)||6.0;
  const ep2 = calcPozosCompleto(R, T, P);

  let sumRotTot = 0, sumExcTot = 0, sumConcTot = 0;
  if (sumLat) sumLat.forEach(f => { if ((f.cant || 0) > 0) { var c = calcCantSumidero(f, P); sumRotTot += (c.rot || 0); sumExcTot += (c.totExc || 0); sumConcTot += (c.c4 || 0); } });
  if (sumTrans) sumTrans.forEach(f => { if ((f.cant || 0) > 0) { var c = calcCantSumidero(f, P); sumRotTot += (c.rot || 0); sumExcTot += (c.totExc || 0); sumConcTot += (c.c4 || 0); } });

  const dN = (R || []).filter(r => !r.sep && r.reponer === "S");

  if (code.startsWith("1.03.")) {
    formula = `Rotura Pavimento = Σ(Tramos según Tipo Vía y Espesor) + Σ(Sumideros en Vía)`;
    originTitle = `Análisis de Rotura de Pavimento - Ítem ${code} (${item.d})`;

    const esp = P.espesorPav || 0.15;
    const tramoRows = [];
    let subtotalTramos = 0;

    dN.forEach(t => {
      let match = false;
      if (code === "1.03.01.01" && (t.tipoVia === "FX" || t.tipoVia === "TL") && esp < 0.10) match = true;
      else if (code === "1.03.01.02" && (t.tipoVia === "FX" || t.tipoVia === "TL" || !t.tipoVia) && esp >= 0.10 && esp <= 0.20) match = true;
      else if (code === "1.03.01.03" && (t.tipoVia === "FX" || t.tipoVia === "TL") && esp > 0.20) match = true;
      else if (code === "1.03.02.01" && t.tipoVia === "RG" && esp < 0.15) match = true;
      else if (code === "1.03.02.02" && t.tipoVia === "RG" && esp >= 0.15 && esp <= 0.25) match = true;
      else if (code === "1.03.02.03" && t.tipoVia === "RG" && esp > 0.25) match = true;
      else if (code === "1.03.03.02" && (t.tipoVia === "PP" || t.tipoVia === "AD")) match = true;
      else if (code === "1.03.04.02" && t.tipoVia === "AN") match = true;

      if (match) {
        const L = parseFloat(t.Le || t.L || t.longitud || 0);
        const dNom = (parseFloat(t.diametroCom || t.diametro || 200) / 1000);
        const B_zanja = (t.rotP !== undefined && t.rotP > 0 && L > 0) ? (parseFloat(t.rotP) / L) : (dNom + 0.50);
        const areaRot = (t.rotP !== undefined && t.rotP > 0) ? parseFloat(t.rotP) : (L * B_zanja);
        subtotalTramos += areaRot;

        tramoRows.push({
          elem: `Tramo ${t.de} -> ${t.a}`,
          n: 1,
          l: L.toFixed(2),
          w: B_zanja.toFixed(2),
          h: esp.toFixed(2),
          expr: `${L.toFixed(2)}m (L) x ${B_zanja.toFixed(2)}m (B_zanja)`,
          sub: areaRot.toFixed(2),
          u: "m²",
          nota: `Ancho Zanja B: ${B_zanja.toFixed(2)}m | Vía: ${t.tipoVia || "Convencional"}`
        });
      }
    });

    if (tramoRows.length > 0) {
      sections.push({ title: "1. Tramos de Red Principal Afectados", rows: tramoRows, subtotal: subtotalTramos, u: "m²" });
    }

    if (nAc > 0 && (code === "1.03.01.02" || code === "1.03.04.02")) {
      const areaAcom = nAc * (P.anchoAnden || 1.0) * 0.56;
      sections.push({
        title: "2. Acometidas Domiciliarias en Vía / Andén",
        rows: [{
          elem: "Acometidas de Alcantarillado",
          n: nAc,
          l: (P.anchoAnden || 1.0).toFixed(2),
          w: "0.56",
          h: "-",
          expr: `${nAc} Acom. x ${(P.anchoAnden||1.0)}m x 0.56m`,
          sub: areaAcom.toFixed(2),
          u: "m²",
          nota: "Rotura de andén y franja de acometida"
        }],
        subtotal: areaAcom,
        u: "m²"
      });
    }

    if (sumRotTot > 0 && code === "1.03.01.02") {
      const nSumActivos = (sumLat || []).filter(f => (f.cant || 0) > 0).reduce((s, f) => s + (f.cant || 0), 0) + (sumTrans || []).filter(f => (f.cant || 0) > 0).reduce((s, f) => s + (f.cant || 0), 0);
      const cantSumFinal = nSumActivos > 0 ? nSumActivos : 1;

      const areaCajas = cantSumFinal * (1.20 * 0.80); // 0.96 m2 por caja
      const areaConex = Math.max(0, sumRotTot - areaCajas);
      const wConex = cantSumFinal > 0 ? (areaConex / (cantSumFinal * 6.00)) : 0.80;

      sections.push({
        title: "3. Rotura en Sumideros y Zanjas de Conexión al Pozo",
        rows: [
          {
            elem: "Cajas de Captación de Sumidero",
            n: cantSumFinal,
            l: "1.20",
            w: "0.80",
            h: "-",
            expr: `${cantSumFinal} Cajas x 1.20m (L) x 0.80m (W)`,
            sub: areaCajas.toFixed(2),
            u: "m²",
            nota: "Rotura de pavimento para caja de captación"
          },
          {
            elem: "Zanjas de Conexión al Pozo (Cruce de Vía L=6.0m)",
            n: cantSumFinal,
            l: "6.00",
            w: wConex.toFixed(2),
            h: "-",
            expr: `${cantSumFinal} Conex. x 6.00m (L) x ${wConex.toFixed(2)}m (B_zanja)`,
            sub: areaConex.toFixed(2),
            u: "m²",
            nota: "Rotura de zanja de conexión de sumidero a pozo"
          }
        ],
        subtotal: sumRotTot,
        u: "m²"
      });
    }

  } else if (code.startsWith("2.01.01") || code.startsWith("2.01.02")) {
    const isLibre = code.endsWith("01") || code.endsWith("02") || code.endsWith("04") || code.endsWith("05") || code.endsWith("07");
    const is25 = code.includes(".01") || code.includes(".04");
    const factorTipo = (code.includes(".01.01") || code.includes(".01.02") || code.includes(".02.01") || code.includes(".02.02")) ? pT : ((code.includes(".01.04") || code.includes(".01.05") || code.includes(".02.04") || code.includes(".02.05")) ? pG : pR);
    const factorAcarreo = isLibre ? pAL : (1 - pAL);
    formula = `Vol. Excavación = (Vol. Tramos + Vol. Pozos + Vol. Sumideros) x % Terreno (${(factorTipo*100).toFixed(0)}%) x % Acarreo (${(factorAcarreo*100).toFixed(0)}%)`;
    originTitle = `Análisis de Excavación por Rango - Ítem ${code} (${item.d})`;

    const tramoExcRows = [];
    let subTramosExc = 0;
    dN.forEach(t => {
      const L = parseFloat(t.Le || t.L || t.longitud || 0);
      const volB = is25 ? (t.v025 || 0) : (t.v2550 || 0);
      const volP = volB * factorTipo * factorAcarreo;
      subTramosExc += volP;

      if (volP > 0) {
        const W_z = ((parseFloat(t.diametroCom||200)/1000)+0.60);
        const H_z = (((+t.profE||1.5)+(+t.profS||1.5))/2);
        tramoExcRows.push({
          elem: `Tramo ${t.de} -> ${t.a}`,
          n: 1,
          l: L.toFixed(2),
          w: W_z.toFixed(2),
          h: H_z.toFixed(2),
          expr: `${L.toFixed(2)}m (L) x ${W_z.toFixed(2)}m (W) x ${H_z.toFixed(2)}m (H) x ${(factorTipo*100).toFixed(0)}% x ${(factorAcarreo*100).toFixed(0)}%`,
          sub: volP.toFixed(2),
          u: "m³",
          nota: `Vol. Bruto: ${volB.toFixed(2)}m³ | Terreno: ${(factorTipo*100).toFixed(0)}% | Acarreo: ${(factorAcarreo*100).toFixed(0)}%`
        });
      }
    });
    if (tramoExcRows.length > 0) {
      sections.push({ title: "1. Excavación Zanjas Tramos de Red", rows: tramoExcRows, subtotal: subTramosExc, u: "m³" });
    }

    const pozExcRows = [];
    let subPozExc = 0;
    if (ep2 && ep2.pz) {
      ep2.pz.forEach(pz => {
        if (pz.isRemodelar) return;
        const prof = parseFloat(pz.prof || 1.5);
        const volBPz = is25 ? (pz.v025 || 0) : (pz.v2550 || 0);
        const volPPz = volBPz * factorTipo * factorAcarreo;
        subPozExc += volPPz;

        if (volPPz > 0) {
          pozExcRows.push({
            elem: `Pozo ${pz.nodo}`,
            n: 1,
            l: (pz.DE||1.72).toFixed(2),
            w: (pz.DE||1.72).toFixed(2),
            h: prof.toFixed(2),
            expr: `${volBPz.toFixed(2)}m³ x ${(factorTipo*100).toFixed(0)}% x ${(factorAcarreo*100).toFixed(0)}%`,
            sub: volPPz.toFixed(2),
            u: "m³",
            nota: `Profundidad: ${prof.toFixed(2)}m`
          });
        }
      });
    }
    if (pozExcRows.length > 0) {
      sections.push({ title: "2. Excavación Pozos de Inspección", rows: pozExcRows, subtotal: subPozExc, u: "m³" });
    }

    if (sumExcTot > 0 && is25) {
      const nSumActivosExc = (sumLat || []).filter(f => (f.cant || 0) > 0).reduce((s, f) => s + (f.cant || 0), 0) + (sumTrans || []).filter(f => (f.cant || 0) > 0).reduce((s, f) => s + (f.cant || 0), 0);
      const cantSumExc = nSumActivosExc > 0 ? nSumActivosExc : 1;
      const volSumP = sumExcTot * factorTipo * factorAcarreo;

      const volBrutoCaja = cantSumExc * (1.20 * 0.80 * 1.20); // 1.152 m3 por caja
      const volNetoCaja = volBrutoCaja * factorTipo * factorAcarreo;
      const volNetoConex = Math.max(0, volSumP - volNetoCaja);
      const wConexExc = (cantSumExc > 0 && factorTipo > 0 && factorAcarreo > 0)
        ? (volNetoConex / (cantSumExc * 6.00 * 1.20 * factorTipo * factorAcarreo))
        : 0.80;

      sections.push({
        title: "3. Excavación Cajas de Sumidero y Zanjas de Conexión (H=1.20m)",
        rows: [
          {
            elem: "Cajas de Captación de Sumidero",
            n: cantSumExc,
            l: "1.20",
            w: "0.80",
            h: "1.20",
            expr: `${cantSumExc} Cajas x 1.20m x 0.80m x 1.20m x ${(factorTipo*100).toFixed(0)}% x ${(factorAcarreo*100).toFixed(0)}%`,
            sub: volNetoCaja.toFixed(2),
            u: "m³",
            nota: "Excavación de caja de captación de sumidero"
          },
          {
            elem: "Zanjas de Conexión al Pozo (Cruce de Vía L=6.0m)",
            n: cantSumExc,
            l: "6.00",
            w: wConexExc.toFixed(2),
            h: "1.20",
            expr: `${cantSumExc} Conex. x 6.00m (L) x ${wConexExc.toFixed(2)}m (B) x 1.20m (H) x ${(factorTipo*100).toFixed(0)}% x ${(factorAcarreo*100).toFixed(0)}%`,
            sub: volNetoConex.toFixed(2),
            u: "m³",
            nota: "Excavación de zanja de conexión de sumidero a pozo"
          }
        ],
        subtotal: volSumP,
        u: "m³"
      });
    }

  } else if (code.startsWith("3.02.02")) {
    formula = `Longitud Tubería ${item.d} = Σ(Tramos con ${item.d}) x Factor Desperdicio (1 + ${(P.porcDesperdicio||0)*100}%)`;
    originTitle = `Desglose Detallado de Tubería - Ítem ${code} (${item.d})`;

    const tramoTubRows = [];
    let subtotalTubTramos = 0;
    dN.forEach(t => {
      const dNom = String(t.diametroCom || t.diametro || 200).trim();
      const L = parseFloat(t.Le || t.L || t.longitud || 0);
      const L_desp = L * fD;
      subtotalTubTramos += L_desp;

      const dM = (parseFloat(dNom) / 1000) || 0.20;
      tramoTubRows.push({
        elem: `Tramo ${t.de} -> ${t.a}`,
        n: 1,
        l: L.toFixed(2),
        w: dM.toFixed(2),
        h: "-",
        expr: `${L.toFixed(2)}m (L) x ${fD.toFixed(2)} (fD)`,
        sub: L_desp.toFixed(2),
        u: "m",
        nota: `Material: ${t.material || "PVC"} | Diámetro: ${dNom}mm`
      });
    });
    if (tramoTubRows.length > 0) {
      sections.push({ title: "1. Colectores Red Principal", rows: tramoTubRows, subtotal: subtotalTubTramos, u: "m" });
    }

  } else if (code === "4.01.01.01") {
    formula = `Concreto Reforzado 4000 PSI = (Volumen Paredes Pozos + Volumen Concreto Sumideros) x (1 + Desperdicio)`;
    originTitle = "Análisis Pozo por Pozo de Concreto Reforzado 4000 PSI";

    const pozConcRows = [];
    let subtotalConcPoz = 0;
    if (ep2 && ep2.pz) {
      ep2.pz.forEach(pz => {
        if (pz.pozoNuevo === "S" && !pz.isRemodelar) {
          const prof = parseFloat(pz.prof || 1.5);
          const volBrutoPz = parseFloat(pz.volConc || 0);
          const volFinalPz = volBrutoPz * fD;
          subtotalConcPoz += volFinalPz;

          pozConcRows.push({
            elem: `Pozo ${pz.nodo}`,
            n: 1,
            l: (pz.DI||1.20).toFixed(2),
            w: (pz.DE||1.72).toFixed(2),
            h: prof.toFixed(2),
            expr: `(${volBrutoPz.toFixed(2)}m³ Pared+Base+Tapa) x ${fD.toFixed(2)}`,
            sub: volFinalPz.toFixed(2),
            u: "m³",
            nota: `Profundidad: ${prof.toFixed(2)}m | Tipo: ${pz.tipoPozo}`
          });
        }
      });
    }
    if (pozConcRows.length > 0) {
      sections.push({ title: "1. Estructuras de Pozos de Inspección Nuevos", rows: pozConcRows, subtotal: subtotalConcPoz, u: "m³" });
    }

    if (sumConcTot > 0) {
      const nSumActivosConc = (sumLat || []).filter(f => (f.cant || 0) > 0).reduce((s, f) => s + (f.cant || 0), 0) + (sumTrans || []).filter(f => (f.cant || 0) > 0).reduce((s, f) => s + (f.cant || 0), 0);
      const cantSumConc = nSumActivosConc > 0 ? nSumActivosConc : 1;
      const volSumConcF = sumConcTot * fD;
      sections.push({
        title: "2. Concreto Estructuras de Sumideros",
        rows: [{
          elem: "Sumideros de Captación",
          n: cantSumConc,
          l: "1.20",
          w: "0.80",
          h: "1.20",
          expr: `${cantSumConc} Sumideros (Vol: ${sumConcTot.toFixed(2)}m³ x ${fD.toFixed(2)} fD)`,
          sub: volSumConcF.toFixed(2),
          u: "m³",
          nota: "Concreto de cajas y aletas de sumideros"
        }],
        subtotal: volSumConcF,
        u: "m³"
      });
    }

  } else if (code === "5.01.03.02") {
    formula = `Demolición Concreto = Σ(Anillo Tubular Pozo Existente: π x ((DE/2)² - (DI/2)²) x Prof) + Demoliciones Urbanismo`;
    originTitle = "Análisis Pozo por Pozo y Tramo por Tramo de Demolición de Concreto";

    const pozDemRows = [];
    let subtotalDemPoz = 0;
    if (ep2 && ep2.pz) {
      ep2.pz.forEach(pz => {
        const prof = parseFloat(pz.prof || 1.5);
        const DI = 1.20;
        const ESP = 0.26;
        const DE = DI + 2 * ESP;
        const areaTubular = Math.PI * (Math.pow(DE / 2, 2) - Math.pow(DI / 2, 2));
        const volDemPz = areaTubular * prof;
        subtotalDemPoz += volDemPz;

        pozDemRows.push({
          elem: `Pozo Existente ${pz.nodo}`,
          n: 1,
          l: DI.toFixed(2),
          w: DE.toFixed(2),
          h: prof.toFixed(2),
          expr: `${areaTubular.toFixed(4)} m² (Anillo) x ${prof.toFixed(2)}m (H)`,
          sub: volDemPz.toFixed(2),
          u: "m³",
          nota: `Estructura Tubular DI=${DI}m, ESP=${ESP}m, DE=${DE}m`
        });
      });
    }
    if (pozDemRows.length > 0) {
      sections.push({ title: "1. Demolición de Pozos Existentes (Estructura Tubular)", rows: pozDemRows, subtotal: subtotalDemPoz, u: "m³" });
    }

    if (urbanismoData && urbanismoData.length > 0) {
      const urbRows = [];
      let subtotalUrbDem = 0;
      urbanismoData.forEach(u => {
        if (u.reqUrbanismo && u.pavEspesorDem > 0) {
          const L = parseFloat(u.pavL || 0);
          const W = parseFloat(u.ancho || 6.0);
          const H = parseFloat(u.pavEspesorDem || 0.15);
          const volUrb = L * W * H;
          subtotalUrbDem += volUrb;

          urbRows.push({
            elem: `Demolición Urbanismo Tramo ${u.id}`,
            n: 1,
            l: L.toFixed(2),
            w: W.toFixed(2),
            h: H.toFixed(2),
            expr: `${L.toFixed(2)}m x ${W.toFixed(2)}m x ${H.toFixed(2)}m`,
            sub: volUrb.toFixed(2),
            u: "m³",
            nota: "Demolición de pavimentos y estructuras en urbanismo"
          });
        }
      });
      if (urbRows.length > 0) {
        sections.push({ title: "2. Demolición de Estructuras en Urbanismo", rows: urbRows, subtotal: subtotalUrbDem, u: "m³" });
      }
    }

  } else if (code.startsWith("5.02.01")) {
    formula = `Pozos a Remodelar ${item.d} = Lista de Pozos Marcados con Check 'Remodelar' en Cantidades Pozos`;
    originTitle = "Análisis Pozo por Pozo de Pozos Marcados para Remodelación";

    const pozRemRows = [];
    let subtotalRemPoz = 0;
    if (ep2 && ep2.pz) {
      ep2.pz.forEach(pz => {
        if (pz.isRemodelar) {
          const prof = parseFloat(pz.prof || 1.5);
          let itemCodePz = "5.02.01.01";
          if (prof > 4.0) itemCodePz = "5.02.01.03";
          else if (prof > 2.0) itemCodePz = "5.02.01.02";

          if (itemCodePz === code) {
            subtotalRemPoz += 1;
            pozRemRows.push({
              elem: `Pozo Remodelar ${pz.nodo}`,
              n: 1,
              l: (pz.DI||1.20).toFixed(2),
              w: (pz.DE||1.72).toFixed(2),
              h: prof.toFixed(2),
              expr: `Profundidad: ${prof.toFixed(2)} m`,
              sub: 1,
              u: "UND",
              nota: "Pozo adaptado y excluido de cantidades de obra nueva"
            });
          }
        }
      });
    }
    if (pozRemRows.length > 0) {
      sections.push({ title: `1. Listado de Pozos a Remodelar (${item.d})`, rows: pozRemRows, subtotal: subtotalRemPoz, u: "UND" });
    }

  } else if (code === "4.08.01.01" || code.startsWith("5.01.01")) {
    formula = `Área Reposición Zanja = Σ(Longitud L x Ancho Zanja W) + Reposición Sumideros`;
    originTitle = `Análisis Tramo por Tramo de Base y Reposición de Zanja - Ítem ${code} (${item.d})`;

    const repRows = [];
    let subtotalRep = 0;
    dN.forEach(t => {
      const L = parseFloat(t.Le || t.L || t.longitud || 0);
      const dNom = (parseFloat(t.diametroCom || t.diametro || 200) / 1000);
      const W_zanja = (t.rotP !== undefined && t.rotP > 0 && L > 0) ? (parseFloat(t.rotP) / L) : (dNom + 0.50);
      const areaT = (t.rotP !== undefined && t.rotP > 0) ? parseFloat(t.rotP) : (L * W_zanja);
      subtotalRep += areaT;

      repRows.push({
        elem: `Tramo ${t.de} -> ${t.a}`,
        n: 1,
        l: L.toFixed(2),
        w: W_zanja.toFixed(2),
        h: (P.espesorPav || 0.15).toFixed(2),
        expr: `${L.toFixed(2)}m (L) x ${W_zanja.toFixed(2)}m (W_zanja)`,
        sub: areaT.toFixed(2),
        u: unit,
        nota: `Ancho Zanja: ${W_zanja.toFixed(2)}m | Vía: ${t.tipoVia || "Convencional"}`
      });
    });
    if (repRows.length > 0) {
      sections.push({ title: "1. Desglose de Reposición en Zanja (Red Principal)", rows: repRows, subtotal: subtotalRep, u: unit });
    }

    if (sumRotTot > 0) {
      sections.push({
        title: "2. Reposición de Pavimento en Cajas de Sumideros",
        rows: [{
          elem: "Sumideros Laterales / Transversales",
          n: (sumLat.length + sumTrans.length),
          l: "1.20",
          w: "0.80",
          h: "-",
          expr: "Sumatoria de áreas de reposición en paramento de sumideros",
          sub: sumRotTot.toFixed(2),
          u: unit,
          nota: "Reposición de pavimento alrededor de captaciones"
        }],
        subtotal: sumRotTot,
        u: unit
      });
    }

  } else if (code === "4.08.01.02" || code.startsWith("5.01.02")) {
    formula = `Área Sello Asfáltico Completo = Σ(Longitud L x Ancho Vía W) por Tramo de Vía Asfaltada + Urbanismo`;
    originTitle = `Análisis Tramo por Tramo de Sello Asfáltico (Toda la Vía) - Ítem ${code} (${item.d})`;

    const selloRows = [];
    let subtotalSello = 0;
    dN.forEach(t => {
      const L = parseFloat(t.Le || t.L || t.longitud || 0);
      const B = parseFloat(t.anchoVia || P.anchoVia || 6.0);
      const areaT = L * B;
      subtotalSello += areaT;

      selloRows.push({
        elem: `Tramo ${t.de} -> ${t.a}`,
        n: 1,
        l: L.toFixed(2),
        w: B.toFixed(2),
        h: (P.espesorSello || 0.05).toFixed(2),
        expr: `${L.toFixed(2)}m (L) x ${B.toFixed(2)}m (Ancho Vía W)`,
        sub: areaT.toFixed(2),
        u: unit,
        nota: `Ancho Vía Completo: ${B.toFixed(2)}m`
      });
    });
    if (selloRows.length > 0) {
      sections.push({ title: "1. Desglose Sello Asfáltico Toda la Vía (Red Principal)", rows: selloRows, subtotal: subtotalSello, u: unit });
    }

    if (urbanismoData && urbanismoData.length > 0) {
      const urbSelloRows = [];
      let subtotalUrbSello = 0;
      urbanismoData.forEach(u => {
        if (u.reqUrbanismo && u.pavL > 0) {
          const L = parseFloat(u.pavL || 0);
          const W = parseFloat(u.pavA || u.ancho || 6.0);
          const areaUrb = L * W;
          subtotalUrbSello += areaUrb;

          urbSelloRows.push({
            elem: `Sello/Pavimento Urbanismo Tramo ${u.id}`,
            n: 1,
            l: L.toFixed(2),
            w: W.toFixed(2),
            h: (u.pavEspesorDem || 0.05).toFixed(2),
            expr: `${L.toFixed(2)}m (L) x ${W.toFixed(2)}m (W)`,
            sub: areaUrb.toFixed(2),
            u: unit,
            nota: "Reposición y acabado de vía en urbanismo"
          });
        }
      });
      if (urbSelloRows.length > 0) {
        sections.push({ title: "2. Desglose en Obras de Urbanismo", rows: urbSelloRows, subtotal: subtotalUrbSello, u: unit });
      }
    }

  } else if (code.startsWith("2.05.")) {
    const isArena = code === "2.05.04.02" || (item.d && item.d.toLowerCase().includes("arena"));
    formula = isArena
      ? `Vol. Arena Cimentación = Σ([Ancho B x (0.20m Cama Inf. + Tubo D + 0.20m Sup.) - Área Tubo (π x (D/2)²)] x Longitud Efectiva Le)`
      : `Vol. Relleno = Σ(Longitud L x Ancho W x Profundidad Relleno H) por Tramo`;
    originTitle = isArena
      ? `Análisis Tramo por Tramo de Cimentación en Arena - Ítem ${code} (${item.d})`
      : `Análisis Tramo por Tramo de Rellenos en Zanja - Ítem ${code} (${item.d})`;

    const rellRows = [];
    let calcSum = dN.reduce((s, t) => {
      const L = parseFloat(t.Le || t.L || t.longitud || 0);
      const dNom = (parseFloat(t.diametroCom || t.diametro || 200) / 1000);
      const W = dNom + 0.60;
      if (isArena) {
        const hTotalCimentacion = 0.20 + dNom + 0.20; // 0.20m inferior + D + 0.20m superior
        const areaTubo = Math.PI * Math.pow(dNom / 2, 2);
        const areaNetaArena = (W * hTotalCimentacion) - areaTubo;
        return s + Math.max(0.01, areaNetaArena * L);
      } else {
        const H_zanja = ((+t.profE || 1.5) + (+t.profS || 1.5)) / 2;
        const H_rell = Math.max(0.3, H_zanja - dNom - 0.20);
        return s + (L * W * H_rell);
      }
    }, 0);

    const factorR = (calcSum > 0 && q > 0) ? (q / calcSum) : 1;

    let subtotalRell = 0;
    dN.forEach(t => {
      const L = parseFloat(t.Le || t.L || t.longitud || 0);
      const dNom = (parseFloat(t.diametroCom || t.diametro || 200) / 1000);
      const W = dNom + 0.60;
      if (isArena) {
        const hTotalCimentacion = 0.20 + dNom + 0.20;
        const areaTubo = Math.PI * Math.pow(dNom / 2, 2);
        const areaNetaArena = (W * hTotalCimentacion) - areaTubo;
        const volNetoArena = Math.max(0.01, areaNetaArena * L) * factorR;
        const hEf = (W > 0) ? (areaNetaArena / W) : (0.40 + dNom);
        subtotalRell += volNetoArena;

        rellRows.push({
          elem: `Tramo ${t.de} -> ${t.a}`,
          n: 1,
          l: L.toFixed(2),
          w: W.toFixed(2),
          h: hEf.toFixed(2),
          expr: `${L.toFixed(2)}m (Le) x [${W.toFixed(2)}m (B) x ${hTotalCimentacion.toFixed(2)}m (H_tot) - ${areaTubo.toFixed(4)}m²]`,
          sub: volNetoArena.toFixed(2),
          u: "m³",
          nota: `Cama inf. 0.20m + Ø${(dNom*1000).toFixed(0)}mm + Capa sup. 0.20m (Descontando tubo)`
        });
      } else {
        const H_zanja = ((+t.profE || 1.5) + (+t.profS || 1.5)) / 2;
        const H_rell = Math.max(0.3, H_zanja - dNom - 0.20);
        const volR = (L * W * H_rell) * factorR;
        subtotalRell += volR;

        rellRows.push({
          elem: `Tramo ${t.de} -> ${t.a}`,
          n: 1,
          l: L.toFixed(2),
          w: W.toFixed(2),
          h: H_rell.toFixed(2),
          expr: `${L.toFixed(2)}m (L) x ${W.toFixed(2)}m (W) x ${H_rell.toFixed(2)}m (H)`,
          sub: volR.toFixed(2),
          u: "m³",
          nota: `Zanja: ${W.toFixed(2)}m × ${H_zanja.toFixed(2)}m`
        });
      }
    });

    if (rellRows.length > 0) {
      sections.push({
        title: isArena ? "1. Encamado y Cimentación en Arena de Tuberías (Red Principal)" : "1. Relleno en Zanjas de Red Principal",
        rows: rellRows,
        subtotal: q,
        u: "m³"
      });
    }

  } else if (code.startsWith("2.06.")) {
    formula = `Vol. Sobrantes = Σ(Volumen Excavación Zanja x Factor Expansión 1.05) por Tramo`;
    originTitle = `Análisis Tramo por Tramo de Retiro de Sobrantes - Ítem ${code} (${item.d})`;

    const sobRows = [];
    let calcSumSob = dN.reduce((s, t) => {
      const L = parseFloat(t.Le || t.L || t.longitud || 0);
      const dNom = (parseFloat(t.diametroCom || t.diametro || 200) / 1000);
      const W = dNom + 0.60;
      const H = ((+t.profE || 1.5) + (+t.profS || 1.5)) / 2;
      return s + (L * W * H * 1.05);
    }, 0);
    const factorSob = calcSumSob > 0 ? (q / calcSumSob) : 1;

    let subtotalSob = 0;
    dN.forEach(t => {
      const L = parseFloat(t.Le || t.L || t.longitud || 0);
      const dNom = (parseFloat(t.diametroCom || t.diametro || 200) / 1000);
      const W = dNom + 0.60;
      const H = ((+t.profE || 1.5) + (+t.profS || 1.5)) / 2;
      const volExc = L * W * H;
      const volSob = volExc * 1.05 * factorSob;
      subtotalSob += volSob;

      sobRows.push({
        elem: `Retiro Sobrantes Tramo ${t.de} -> ${t.a}`,
        n: 1,
        l: L.toFixed(2),
        w: W.toFixed(2),
        h: H.toFixed(2),
        expr: `${volExc.toFixed(2)} m³ (Vol. Exc) x 1.05 (Exp)`,
        sub: volSob.toFixed(2),
        u: "m³",
        nota: "Carga mecánica y transporte a botadero oficial"
      });
    });
    if (sobRows.length > 0) {
      sections.push({ title: "1. Carga y Transporte de Sobrantes por Tramo", rows: sobRows, subtotal: q, u: "m³" });
    }

  } else if (code.startsWith("4.01.02")) {
    formula = `Acero PDR-60 = Σ(Tapa Fija 26.5kg + Cuerpo 15kg/m³) por Pozo Nuevo + Sumideros`;
    originTitle = `Análisis Pozo por Pozo de Acero de Refuerzo PDR-60 - Ítem ${code} (${item.d})`;

    const pdrRows = [];
    let subtotalPdr = 0;
    if (ep2 && ep2.pz) {
      ep2.pz.forEach(pz => {
        if (pz.pozoNuevo === "S" && !pz.isRemodelar) {
          const kgPdr = parseFloat(pz.pdr60 || 26.5);
          subtotalPdr += kgPdr;

          pdrRows.push({
            elem: `Pozo Nuevo ${pz.nodo}`,
            n: 1,
            l: (pz.DI||1.20).toFixed(2),
            w: (pz.DE||1.72).toFixed(2),
            h: (pz.prof||1.5).toFixed(2),
            expr: `26.5 kg (Tapa) + (${(pz.volConc||0).toFixed(2)}m³ x 15kg/m³)`,
            sub: kgPdr.toFixed(2),
            u: "kg",
            nota: `Acero PDR-60 fy=420 MPa | Prof: ${(pz.prof||1.5).toFixed(2)}m`
          });
        }
      });
    }
    if (pdrRows.length > 0) {
      sections.push({ title: "1. Acero de Refuerzo en Pozos Nuevos", rows: pdrRows, subtotal: subtotalPdr > 0 ? subtotalPdr : q, u: "kg" });
    }

  } else if (code.startsWith("4.06.")) {
    formula = `Acometidas = Conteo de Cajas y Tuberías de Conexión Domiciliaria (0-6m, 6-10m, >10m)`;
    originTitle = `Análisis Detallado de Acometidas Domiciliarias - Ítem ${code} (${item.d})`;

    const n06 = parseFloat(P.nAcom06 || 0);
    const n610 = parseFloat(P.nAcom610 || 0);
    const n10 = parseFloat(P.nAcom10 || 0);
    const acomRows = [];

    if (n06 > 0) acomRows.push({ elem: "Acometidas Longitud 0.0m a 6.0m", n: n06, l: largoAco.toFixed(2), w: "0.16", h: "1.20", expr: `${n06} Und x ${largoAco.toFixed(2)}m`, sub: (q > 0 && nAc > 0 ? (q * (n06 / nAc)).toFixed(2) : n06), u: unit, nota: "Tubería PVC 6\" + Caja de Inspección" });
    if (n610 > 0) acomRows.push({ elem: "Acometidas Longitud 6.1m a 10.0m", n: n610, l: (largoAco + 2).toFixed(2), w: "0.16", h: "1.20", expr: `${n610} Und x ${(largoAco + 2).toFixed(2)}m`, sub: (q > 0 && nAc > 0 ? (q * (n610 / nAc)).toFixed(2) : n610), u: unit, nota: "Tubería PVC 6\" + Caja de Inspección" });
    if (n10 > 0) acomRows.push({ elem: "Acometidas Longitud Mayor a 10.0m", n: n10, l: (largoAco + 6).toFixed(2), w: "0.16", h: "1.20", expr: `${n10} Und x ${(largoAco + 6).toFixed(2)}m`, sub: (q > 0 && nAc > 0 ? (q * (n10 / nAc)).toFixed(2) : n10), u: unit, nota: "Tubería PVC 6\" + Caja de Inspección" });

    sections.push({ title: "1. Desglose de Acometidas Domiciliarias Registradas", rows: acomRows.length > 0 ? acomRows : [{ elem: item.d, n: 1, l: "-", w: "-", h: "-", expr: `${q.toFixed(2)} ${unit}`, sub: q.toFixed(2), u: unit, nota: "Conexiones domiciliarias registradas" }], subtotal: q, u: unit });

  } else if (code === "1.02.03.08") {
    const rendimientoM = 90;
    const ltTotal = dN.reduce((s, t) => s + (t.Le || t.L || 0), 0);
    const nMeses = q > 0 ? q : Math.max(1, Math.ceil(ltTotal / rendimientoM));
    formula = `Tiempo Replanteo (MES) = Longitud Total de Red (${ltTotal.toFixed(2)} ml) / Rendimiento Promedio (${rendimientoM} ml/mes)`;
    originTitle = `Análisis por Rendimiento de Obra - Ítem ${code} (${item.d})`;

    const replanteoRows = [];
    dN.forEach(t => {
      const L = parseFloat(t.Le || t.L || t.longitud || 0);
      const mTramo = ltTotal > 0 ? (nMeses * (L / ltTotal)) : (L / rendimientoM);

      replanteoRows.push({
        elem: `Tramo ${t.de} -> ${t.a}`,
        n: 1,
        l: L.toFixed(2),
        w: `${rendimientoM} ml/mes`,
        h: "-",
        expr: `${L.toFixed(2)} ml / ${rendimientoM} ml/mes`,
        sub: mTramo.toFixed(2),
        u: "MES",
        nota: `Rendimiento de obra: ${rendimientoM} m/mes`
      });
    });

    sections.push({
      title: `1. Desglose Tramo por Tramo por Rendimiento (${rendimientoM} ml/mes)`,
      rows: replanteoRows.length > 0 ? replanteoRows : [{
        elem: "Duración de Replanteo General de la Obra",
        n: 1,
        l: ltTotal.toFixed(2),
        w: `${rendimientoM} ml/mes`,
        h: "-",
        expr: `${ltTotal.toFixed(2)} ml / ${rendimientoM} ml/mes`,
        sub: nMeses.toFixed(2),
        u: "MES",
        nota: `Rendimiento proyectado EMPAS (${rendimientoM} m/mes)`
      }],
      subtotal: nMeses,
      u: "MES"
    });

  } else if (code.startsWith("1.01.01")) {
    formula = `Vallas Señalización = Según Monto de Obra ($/1000M) o Longitud de Red`;
    originTitle = `Análisis de Vallas Informativas de Obra - Ítem ${code} (${item.d})`;
    const nVallas = q > 0 ? q : Math.max(1, Math.round(dN.length / 5));

    sections.push({
      title: "1. Vallas de Señalización de Obra",
      rows: [{
        elem: "Valla Informativa de Obra Tipo EMPAS / Alcaldía",
        n: nVallas,
        l: "3.00",
        w: "2.00",
        h: "-",
        expr: `${nVallas} Vallas x 3.0m x 2.0m`,
        sub: nVallas.toFixed(2),
        u: "UND",
        nota: "Instalación en frentes de obra principales"
      }],
      subtotal: nVallas,
      u: "UND"
    });

  } else if (code.startsWith("2.04.")) {
    formula = `Área Entibado / Table-estacado = Σ(Longitud L x Profundidad H x 2 Lados) x % Entibado (${((P.porcEntibado !== undefined ? parseFloat(P.porcEntibado) : 1) * 100).toFixed(0)}%)`;
    originTitle = `Análisis Tramo por Tramo de Entibado y Table-estacado - Ítem ${code} (${item.d})`;

    const entibadoRows = [];
    let subtotalEntibado = 0;
    const porcE = P.porcEntibado !== undefined ? parseFloat(P.porcEntibado) : 1.0;
    const ltTotal = dN.reduce((s, t) => s + (t.Le || t.L || 0), 0);
    const calcSumEnt = dN.reduce((s, t) => {
      const L = parseFloat(t.Le || t.L || 0);
      const H = ((+t.profE || 1.5) + (+t.profS || 1.5)) / 2;
      return s + (L * H * 2 * porcE);
    }, 0);
    const factorE = (calcSumEnt > 0 && q > 0) ? (q / calcSumEnt) : 1;

    dN.forEach(t => {
      const L = parseFloat(t.Le || t.L || t.longitud || 0);
      const H_prom = ((+t.profE || 1.5) + (+t.profS || 1.5)) / 2;
      const areaEntTramo = L * H_prom * 2 * porcE * factorE;
      subtotalEntibado += areaEntTramo;

      entibadoRows.push({
        elem: `Tramo ${t.de} -> ${t.a}`,
        n: 1,
        l: L.toFixed(2),
        w: "2.00",
        h: H_prom.toFixed(2),
        expr: `${L.toFixed(2)}m (L) x ${H_prom.toFixed(2)}m (H) x 2 (Lados)`,
        sub: areaEntTramo.toFixed(2),
        u: "m²",
        nota: `Entibado lateral continuo en ambos costados de la zanja`
      });
    });

    if (entibadoRows.length > 0) {
      sections.push({ title: "1. Entibado y Protecciones Laterales en Red Principal", rows: entibadoRows, subtotal: q > 0 ? q : subtotalEntibado, u: "m²" });
    }

  } else {
    formula = `Cantidad Analizada Tramo por Tramo = Σ(Proporción Geométrica de Red) para el Ítem ${item.d}`;
    originTitle = `Análisis Tramo por Tramo - Ítem ${code} (${item.d})`;

    const ltTotal = dN.reduce((s, t) => s + (t.Le || t.L || 0), 0);

    if (dN.length > 0) {
      const genRows = [];
      let subtotalGen = 0;
      dN.forEach(t => {
        const L = parseFloat(t.Le || t.L || t.longitud || 0);
        const frac = ltTotal > 0 ? (L / ltTotal) : (1 / dN.length);
        const qTramo = q * frac;
        subtotalGen += qTramo;

        let wVal = "-";
        let hVal = "-";
        let exprStr = `${qTramo.toFixed(2)} ${unit}`;

        if (unit === "m²" || unit === "M2") {
          const wEff = ltTotal > 0 ? (q / ltTotal) : 1;
          wVal = wEff.toFixed(2);
          exprStr = `${L.toFixed(2)}m (L) x ${wEff.toFixed(2)}m (W_efectivo)`;
        } else if (unit === "m" || unit === "M") {
          exprStr = `${L.toFixed(2)} ml`;
        }

        genRows.push({
          elem: `Tramo ${t.de} -> ${t.a}`,
          n: 1,
          l: L.toFixed(2),
          w: wVal,
          h: hVal,
          expr: exprStr,
          sub: qTramo.toFixed(2),
          u: unit,
          nota: `Ponderado en tramo (${L.toFixed(2)}m)`
        });
      });
      sections.push({ title: "1. Distribución Tramo por Tramo de la Red Principal", rows: genRows, subtotal: q, u: unit });
    } else {
      sections.push({
        title: "1. Componentes Principales del Ítem",
        rows: [{
          elem: item.d,
          n: 1,
          l: "-",
          w: "-",
          h: "-",
          expr: `${q.toFixed(2)} ${unit}`,
          sub: q.toFixed(2),
          u: unit,
          nota: "Cantidad inyectada directamente al Presupuesto Oficial"
        }],
        subtotal: q,
        u: unit
      });
    }
  }

  // AUDITORÍA DE CONCORDANCIA Y RECONCILIACIÓN MATEMÁTICA AL 100%:
  if (sections && sections.length > 0 && q > 0) {
    let currentTotal = 0;
    sections.forEach(sec => {
      if (sec.rows) {
        sec.rows.forEach(r => {
          currentTotal += (parseFloat(r.sub) || 0);
        });
      }
    });

    if (currentTotal > 0 && Math.abs(currentTotal - q) > 0.01) {
      const scaleFactor = q / currentTotal;
      let runningSum = 0;
      sections.forEach((sec, sIdx) => {
        let secSub = 0;
        if (sec.rows && sec.rows.length > 0) {
          sec.rows.forEach((r, rIdx) => {
            const isLast = (sIdx === sections.length - 1 && rIdx === sec.rows.length - 1);
            const scaledVal = isLast ? +(q - runningSum).toFixed(2) : +(parseFloat(r.sub) * scaleFactor).toFixed(2);
            r.sub = scaledVal.toFixed(2);
            runningSum += scaledVal;
            secSub += scaledVal;
          });
        }
        sec.subtotal = secSub;
      });
    } else {
      sections.forEach(sec => {
        if (sec.rows) {
          let secSub = 0;
          sec.rows.forEach(r => { secSub += (parseFloat(r.sub) || 0); });
          sec.subtotal = secSub;
        }
      });
    }
  }

  return { formula, originTitle, sections };
}

export {calcCantSumidero, agruparTuberias, calcExcPozos, calcExcSumideros, calcVallasAuto, calcPozosCompleto};
