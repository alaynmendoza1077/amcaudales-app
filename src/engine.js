import {IDF, PIPES, PIPES_DB} from './constants';

// ── Curva IDF (Bernard) ──────────────────────────────────────────────────────
// Fórmula: I = a / (tc^b1 + c)^b2
// Unidades: I en L/s·ha, tc en minutos.
// Fuente: Modelo de Bernard, parámetros calibrados por estación (IDEAM / AMB).
// Ver DOC_MOTOR_HIDRAULICO.md §1 para detalle de cada estación.
function cIDF(est,Tr,tc,P){var s=IDF[est];if(P&&P.customIDF&&P.customIDF[est]){s=P.customIDF[est];}if(!s||tc<=0)return 0;var x=s.c.find(function(c){return c.Tr===Tr;});if(!x)return 0;return x.a/Math.pow(Math.pow(tc,x.b1)+x.c,x.b2);}

// ── Periodo de retorno por área ─────────────────────────────────────────────
// Fuente: RAS-2017, Tabla C.3.1.
//   <2 Ha  → Tr=3a,  2-10 Ha → Tr=5a,  ≥10 Ha → Tr=10a
function gTr(a){return a<2?3:a<10?5:10;}

// ── Diámetro interno / externo de tubería ─────────────────────────────────────
// Di/De según NTC 3822 (PVC-NTE ISO 4422). Default: 315mm si no se encuentra.
function gDi(n, mat){
    var arr = PIPES_DB[mat] || PIPES_DB["PVC"];
    var p = arr.find(function(x){return x.nom===n;});
    if(!p && mat !== "PVC") p = PIPES_DB["PVC"].find(function(x){return x.nom===n;});
    return (p || {Di:.283}).Di;
}
function gDe(n, mat){
    var arr = PIPES_DB[mat] || PIPES_DB["PVC"];
    var p = arr.find(function(x){return x.nom===n;});
    if(!p && mat !== "PVC") p = PIPES_DB["PVC"].find(function(x){return x.nom===n;});
    return (p || {De:.315}).De;
}

// ── Relaciones de flujo parcialmente lleno (sección circular) ──────────────────
// Aproximaciones polinómicas por tramos de las relaciones exactas Y/Do, V/Vo, Dh/D.
// Coeficientes de regresión — FUENTE POR CONFIRMAR (verificar contra Chow / SWMM).
// Ver DOC_MOTOR_HIDRAULICO.md §6 para ecuación exacta de referencia.
// NOTA: el propio motor usa la forma exacta (θ) para Rh en runCalc(), estas son atajos.
function gYDo(q){if(q<=0)return 0;if(q<=.01)return 2.883*Math.pow(q,.807);if(q<=.035)return .585*Math.pow(q,.459);if(q<=.06)return .651*Math.pow(q,.459);if(q<=.33)return .816*Math.pow(q,.538);if(q<=.8)return .238+q*.654;if(q<=.91)return .229+q*.662;return .9;}
function gVVo(y){if(y<=0)return 0;if(y<=.115)return 1.375*Math.pow(y,.604);if(y<=.175)return .859*Math.pow(y,.382);if(y<=.49)return 1.183*Math.pow(y,.554);if(y<=.635)return 1.166*Math.pow(y,.540);if(y<=.72)return 1.133*Math.pow(y,.483);if(y<.885)return 1.094*Math.pow(y,.375);return 1;}
function gDhD(y){if(y<=0)return 0;if(y<=.14)return 1.168*Math.pow(y,1.232);if(y<=.38)return .860*Math.pow(y,1.142);if(y<=.52)return .911*Math.pow(y,1.199);if(y<=.657)return-.201+1.179*y;if(y<=.74)return-.486+1.611*y;if(y<=.9)return-.901+2.165*y;return y;}

// ── Caudal a tubo lleno: Manning ─────────────────────────────────────────────
// Q = (1/n)·A·R^(2/3)·√S, con A=πD²/4, R=D/4 → simplifica a la forma siguiente.
// S entra en %, se convierte a decimal (S/100). Factor 1000 → L/s.
// Fuente: Manning (RAS-2017, C.3.4).
function QoM(D,n,S){if(n===0||D===0||S<=0)return 0;return 1000*Math.PI*Math.pow(D,8/3)*Math.pow(S/100,.5)/(n*Math.pow(4,5/3));}

// ── Caudal a tubo lleno: Darcy-Weisbach (Colebrook-White) ────────────────────
// Forma explícita de velocidad: V = -2·√(2gDSf)·log10(ks/(3.71D) + 2.51ν/(D√(2gDSf)))
// Constantes: 9.81=g (m/s²), 3.71 y 2.51 = constantes de Colebrook-White.
// ks = rugosidad absoluta pared (m), visc = viscosidad cinemática (m²/s), 20°C.
// Fuente: Colebrook & White (1937). Recomendada por RAS para verificación.
function QoDW(D,S,ks,visc){if(D<=0||S<=0)return 0;var Sf=S/100;var K=Math.sqrt(2*9.81*D*Sf);var arg=ks/(3.71*D)+2.51*visc/(D*K);if(arg<=0)return 0;var V=-2*K*Math.log(arg)/Math.LN10;var A=Math.PI*D*D/4;return V*A*1000;}

/* autoDiam — propone diámetro PVC mínimo que cumple verificaciones
 * Recorre la tabla PIPES desde minIdx y retorna el primero donde Q/Qo≤relCap y Y/Do≤porcProf.
 * Si cumple capacidad pero falla Ft/V/Fr, lo reporta en motivo (cumple=false parcial).
 * ks_pvc=1.5e-6 (rugosidad PVC), visc_v=1.007e-6 (agua a 20°C).
 * Ver DOC_MOTOR_HIDRAULICO.md §5 para coeficientes.
 */
function autoDiam(Qd,S,n_c,P,minIdx){
  if(Qd<=0||S<=0)return{idx:minIdx,nom:PIPES[minIdx].nom,Di:PIPES[minIdx].Di,cumple:true,motivo:"Qd=0"};
  var ks_pvc=1.5e-6;var visc_v=1.007e-6;
  for(var pi=minIdx;pi<PIPES.length;pi++){
    var pp=PIPES[pi];var D=pp.Di;
    var Qo=QoDW(D,S,ks_pvc,visc_v);var QoMann=QoM(D,n_c,S);
    var QQo=Qo>0?Qd/Qo:99;var YDo=gYDo(QQo);
    var Vo=D>0?4*QoMann/(1000*Math.PI*D*D):0;var VVo=gVVo(YDo);var V=VVo*Vo;
    var th=YDo>0?2*Math.acos(1-2*YDo):0;var Rh=th>0?.25*(1-Math.sin(th)/th)*D:0;
    // Ft = ρ·g·Rh·S = 9810·Rh·S(Pa). Ver DOC §10.1
    var Ft=9810*Rh*S/100;
    var DhD=gDhD(YDo);var Dh=DhD*D;var Froude=Dh>0?V/Math.sqrt(9.81*Dh):0;
    
    // Verificamos únicamente la capacidad de transporte
    var okQ=QQo<=P.relCapacidad;
    var okY=YDo<=P.porcProfundidad;
    
    if(okQ && okY){
        var okFt=Ft>=P.fuerzaTractMin;
        var okFr=Froude<P.limFroudeSub||Froude>P.limFroudeSup;
        var motivo = [];
        // Velocidad máx: 10 m/s para PVC/PEAD (RAS), 5 m/s para otros (Gres/Concreto)
        var maxV = (P.tipoAlc==="P"||P.tipoAlc==="C"||P.tipoAlc==="M")?10.0:(P.velMaxima||5.0);
        var okV=V<=maxV;
        if(!okV) motivo.push("V>max");
        if(!okFt) motivo.push("Ft<min");
        if(!okFr) motivo.push("Fr");
        return{idx:pi,nom:pp.nom,Di:D,cumple:(okV&&okFt&&okFr),motivo:motivo.join(","),Ydo:YDo,Qo:Qo,V:V};
    }
  }
  var last=PIPES.length-1;
  return{idx:last,nom:PIPES[last].nom,Di:PIPES[last].Di,cumple:false,motivo:"max",Ydo:0,Qo:0,V:0};
}
// Diámetro mínimo de partida: 200mm (índice 2) para sanitario, 250mm (3) semicombinado, 315mm (4) para pluvial/combinado
function getMinPipeIdx(tipoAlc){
  if(tipoAlc==="S")return 2; // 200 mm
  if(tipoAlc==="SC" || tipoAlc==="M")return 3; // 250 mm
  return 4; // 315 mm para C y P
}

/* runCalc — bucle principal de cálculo hidráulico tramo a tramo
 * Recibe: T=tramos, P=parámetros del proyecto (DP).
 * Retorna: R=arreglo de resultados con todas las variables calculadas.
 *
 * Flujo: 1) Acumula áreas aferentes por nodo (aguas arriba→abajo)
 *        2) Calcula Qsan (Harmon) + Qpluv (Método Racional)
 *        3) Calcula Qd según tipo de alcantarillado (S/P/C/M)
 *        4) Evalúa aliviaderos si hay estructuras de separación
 *        5) Verifica Q/Qo, Y/Do, V, Ft, Fr, profundidad (RAS C.3.4)
 *        6) Auto-dimensiona diámetro PVC propuesto (v36.2)
 *        7) Calcula volúmenes de excavación y relleno
 *
 * Ver DOC_MOTOR_HIDRAULICO.md §7-12 para trazabilidad de cada fórmula.
 */
function runCalc(T,P){
  var R=[];var tipoN=P.tipoAlc==="S"?1:P.tipoAlc==="P"?2:P.tipoAlc==="C"?3:4;
  var validT_raw=T.filter(function(t){return t.de&&t.de!=="0"&&t.longitud>0;});
  var inDegree={}, outPipes={};
  validT_raw.forEach(function(t){
    if(!inDegree[t.a]) inDegree[t.a]=0;
    inDegree[t.a]++;
    if(!outPipes[t.de]) outPipes[t.de]=[];
    outPipes[t.de].push(t);
  });
  var queue=[], visited=new Set();
  validT_raw.forEach(function(t){
    if(!inDegree[t.de]){ queue.push(t); visited.add(t); }
  });
  var validT=[];
  while(queue.length>0){
    var curr=queue.shift();
    validT.push(curr);
    inDegree[curr.a]--;
    if(inDegree[curr.a]===0 && outPipes[curr.a]){
      outPipes[curr.a].forEach(function(nextT){
        if(!visited.has(nextT)){ queue.push(nextT); visited.add(nextT); }
      });
    }
  }
  if(validT.length<validT_raw.length){
    validT_raw.forEach(function(t){ if(!visited.has(t)) validT.push(t); });
  }

  // nodeArea: mapa de acumulación de áreas por nodo (propagación aguas abajo)
  var nodeArea={};
  for(var vi=0;vi<validT.length;vi++){
    var t=validT[vi];
    var aL=Number(String(t.areaParcial||0).replace(",","."));if(isNaN(aL))aL=0;
    var tp=(t.tipoArea||"RESIDENCIAL").toUpperCase();
    var lR = t.aR_prop != null ? +t.aR_prop : (t.areas ? +(t.areas.res||0) : (tp==="RESIDENCIAL"?aL:0));
    var lC = t.aC_prop != null ? +t.aC_prop : (t.areas ? +(t.areas.com||0) : (tp==="COMERCIAL"?aL:0));
    var lI = t.aI_prop != null ? +t.aI_prop : (t.areas ? +(t.areas.ind||0) : (tp==="INDUSTRIAL"?aL:0));
    var lN = t.aIn_prop != null ? +t.aIn_prop : (t.areas ? +(t.areas.inst||0) : (tp==="INSTITUCIONAL"?aL:0));
    var lV = t.aV_prop != null ? +t.aV_prop : (t.areas ? +(t.areas.via||0) : (tp==="VIA"?aL:0));
    var lE = t.aRe_prop != null ? +t.aRe_prop : (t.areas ? +(t.areas.rec||0) : (tp==="RECREACIONAL"?aL:0));
    var up=nodeArea[t.de]||{r:0,c:0,i:0,n:0,v:0,e:0};
    nodeArea[t.de]={r:0,c:0,i:0,n:0,v:0,e:0};
    var aR=lR+up.r,aC=lC+up.c,aI=lI+up.i,aIn=lN+up.n,aV=lV+up.v,aRe=lE+up.e;
    if(!nodeArea[t.a])nodeArea[t.a]={r:0,c:0,i:0,n:0,v:0,e:0};
    nodeArea[t.a].r+=aR;nodeArea[t.a].c+=aC;nodeArea[t.a].i+=aI;
    nodeArea[t.a].n+=aIn;nodeArea[t.a].v+=aV;nodeArea[t.a].e+=aRe;
    t._aR=aR;t._aC=aC;t._aI=aI;t._aIn=aIn;t._aV=aV;t._aRe=aRe;
    t._aR_p=lR; t._aC_p=lC; t._aI_p=lI; t._aIn_p=lN; t._aV_p=lV; t._aRe_p=lE;
  }
  var tcN={};
  var nodePurged={};
  var nodeAlivioCalc={};
  /* nodePropIdx: mapa de diámetro propuesto por nodo (restricción aguas abajo — v36.2)
   * Garantiza que un tramo aguas abajo no tenga diámetro menor que su aguas arriba. */
  var nodePropIdx={};
  var baseMinIdx=getMinPipeIdx(P.tipoAlc);
  for(var vi=0;vi<validT.length;vi++){
    var t=validT[vi];
    // mc: código de material. 1=PVC(n=.010), 2=GRES(.014), 4=PEAD(.010), 3=CONCRETO(.013)
    var mat=t.material||"PVC";var mc=mat.includes("PVC")?1:mat.includes("GRES")?2:mat.includes("PEAD")?4:3;
    var D=gDi(t.diametroCom||"315 mm", mat);var De=gDe(t.diametroCom||"315 mm", mat);
    /* Material de diseño forzado a PVC para auto-dimensionamiento (v36.6)
     * ks=1.5e-6 (rugosidad PVC liso), n=0.010. Diseño conservador al material más liso. */
    var matDiseno="PVC";var mcDis=1;var n_dis=0.01;
    var ks_dis=1.5e-6;
    var n_c=t.nManning>0?t.nManning:(mc===1?.01:mc===2?.014:mc===4?.01:.013);
    var aR=t._aR||0,aC=t._aC||0,aI=t._aI||0,aIn=t._aIn||0,aV=t._aV||0,aRe=t._aRe||0;
    var aR_p=t._aR_p||0,aC_p=t._aC_p||0,aI_p=t._aI_p||0,aIn_p=t._aIn_p||0,aV_p=t._aV_p||0,aRe_p=t._aRe_p||0;
    var dRaw = String(t.densidad).replace(",",".");
    var cRaw = String(t.consumo).replace(",",".");
    var pDen = Number(String(P.densidad).replace(",","."));
    var pCon = Number(String(P.consumo).replace(",","."));
    
    // Densidad/consumo: prioriza parámetros globales (P), si no están definidos usa los del tramo
    // Default si todo falla: 600 hab/Ha, 140 L/hab·día
    var den = (isNaN(pDen) || pDen === 0) ? Number(dRaw) : pDen;
    if (isNaN(den) || den === 0) den = 600;

    var con = (isNaN(pCon) || pCon === 0) ? Number(cRaw) : pCon;
    if (isNaN(con) || con === 0) con = 140;

    // ── CAUDAL SANITARIO (Qsan) ──────────────────────────────────────────────
    // pob = densidad × área poblacional (hab). .001 = mínimo para evitar división 0.
    var aPob=aR+aC+aI+aIn;var pob=aPob===0?.001:den*aPob;
    // Qmed = coefRetorno × pob × consumo / 86400 (L/s). coefRetorno default: 0.85 (RAS)
    var Qmed=P.coefRetorno*pob*con/86400+(aC>0?.5:0)+(aI>0?1:0)+(aIn>0?.5:0);
    // Qi: infiltración = 0.3 L/s/ha (RAS 2017)
    var coefQi = P.coef_Qi !== undefined ? P.coef_Qi : 0.3;
    var Qi = coefQi * (aR + aC + aI + aIn);
    // Qe: conexiones erradas = 0.2 L/s/ha (RAS 2017)
    var coefQe = P.coef_Qe !== undefined ? P.coef_Qe : 0.2;
    var Qe = coefQe * (aR + aC + aI + aIn);
    // Fm: Factor de Harmon. Acotado [1.4, 3.8] — convención RAS / manual EMPAS.
    // Ver DOC_MOTOR_HIDRAULICO.md §7.3
    var Fm=Math.min(3.8,Math.max(1.4,3.5/Math.pow(pob/1000,.1)));
    var Qmx=Fm*Qmed;var Qsan=Math.max(1.5,Qmx+Qe+Qi);

    // ── CAUDAL PLUVIAL (Qpluv) — Método Racional ──────────────────────────────
    // Cw = coeficiente de escorrentía ponderado por uso del suelo (RAS)
    // Ver DOC_MOTOR_HIDRAULICO.md §8
    var aT=aR+aC+aI+aIn+aV+aRe;
    var cR=P.coef_aR!==undefined?P.coef_aR:0.8;
    var cC=P.coef_aC!==undefined?P.coef_aC:0.9;
    var cI=P.coef_aI!==undefined?P.coef_aI:0.6;
    var cIn=P.coef_aIn!==undefined?P.coef_aIn:0.6;
    var cV=P.coef_aV!==undefined?P.coef_aV:0.9;
    var cRe=P.coef_aRe!==undefined?P.coef_aRe:0.3;
    var Cw=aT>0?(aR*cR+aC*cC+aI*cI+aIn*cIn+aV*cV+aRe*cRe)/aT:(t.coefEscorrentia||0.75);
    // tc: tiempo de concentración. Entry=8 min (típico urbano). Mínimo 10 min para IDF.
    var prevTc=tcN[t.de]||0;var Tc=prevTc===0?8:prevTc;
    var Fr=gTr(aT);var tcC=Tc<=10?10:Tc;var Iidf=cIDF(P.estacion,Fr,tcC,P);
    // Q = C·I·A (método racional, Mulvaney)
    var Qpluv=Cw*Iidf*aT;
    // ── CAUDAL DE DISEÑO según tipo de alcantarillado ─────────────────────────
    // S=sanitario, P=pluvial, C=combinado, M=semicombinado (patios)
    // Ver DOC_MOTOR_HIDRAULICO.md §9
    var Qd=0;
    if(tipoN===1)Qd=Qsan;
    else if(tipoN===2)Qd=Qpluv;
    else if(tipoN===3)Qd=Qpluv+Qsan;
    else if(tipoN===4)Qd=Qpluv*(P.porcPatios/100)+Qsan;
    else Qd=Qpluv;
    /* Reducción por aliviadero (estructura de separación)
     * QMD_est: caudal medio diario en la estación. 3.5 = factor de dilución inverso.
     * Qn = max(5·QMD, 25) L/s: umbral de undersurging (convención EMPAS).
     * Ver DOC_MOTOR_HIDRAULICO.md §11
     */
    var currentPurged = nodePurged[t.de] || 0;
    if (P.estSepData && P.estSepData[t.de] && !nodeAlivioCalc[t.de]) {
        var sep = P.estSepData[t.de];
        var QMD_est = sep.qmdSan_manual !== "" ? parseFloat(sep.qmdSan_manual) : (Qsan / 3.5);
        var Qn = Math.max(5 * QMD_est, 25);
        var Q_actual = Qd - currentPurged;
        if (Q_actual > Qn) {
            var purge = Q_actual - Qn;
            currentPurged += purge;
            nodeAlivioCalc[t.de] = purge;
        }
    } else if (P.estSepData && P.estSepData[t.de] && nodeAlivioCalc[t.de]) {
        currentPurged += nodeAlivioCalc[t.de];
    }
    Qd = Math.max(0, Qd - currentPurged);
    nodePurged[t.a] = (nodePurged[t.a] || 0) + currentPurged;
    /* ── CÁLCULO HIDRÁULICO FINAL ──────────────────────────────────────────── */
    var L=+(t.longitud||0);
    var Pend=+(t.pendiente||0);
    var crDE=+(t.cotaRasante||0);
    var crA=t.cotaRasanteA!=null&&t.cotaRasanteA!==""?+t.cotaRasanteA:crDE;
    var cfDE=t.cotaFondoDE!=null&&t.cotaFondoDE!==""?+t.cotaFondoDE:+(t.cotaFondo||0);
    var cfA=t.cotaFondoA!=null&&t.cotaFondoA!==""?+t.cotaFondoA:(cfDE-L*Pend/100);
    // S = pendiente real calculada por cotas (prioridad) o por pendiente ingresada (%)
    var S=L>0?((cfDE-cfA)/L)*100:Pend;
    // ks: rugosidad absoluta por material (m). 1.5e-6 PVC, 3e-4 GRES, 1e-3 Concreto
    var ks_v=mc===1?1.5e-6:mc===2?3e-4:mc===4?1.5e-6:1e-3;
    // visc: viscosidad cinemática del agua a 20°C = 1.007e-6 m²/s
    var visc_v=1.007e-6;
    // actQo: se usa DW por defecto (P.formulaQo), Manning si se selecciona explícitamente
    var Qo=QoDW(D,S,ks_v,visc_v);
    var QoMann=QoM(D,n_c,S);
    var actQo = (P.formulaQo === "M") ? QoMann : Qo;
    // Relaciones de flujo parcial: QQo=Q/Qo, YDo=tirante relativo, Y=tirante (mm)
    var QQo=actQo>0?Qd/actQo:0;var YDo=gYDo(QQo);var Y=YDo*D;
    var Vo=D>0?4*actQo/(1000*Math.PI*D*D):0;var VVo=gVVo(YDo);var V=VVo*Vo;
    // Radio hidráulico (forma EXACTA circular): Rh = (D/4)·(1 - sinθ/θ), θ = 2·acos(1-2·Y/D)
    var th=YDo>0?2*Math.acos(1-2*YDo):0;var Rh=th>0?.25*(1-Math.sin(th)/th)*D:0;
    // Fuerza tractiva: Ft = ρ·g·Rh·S (Pa). 9810 = 1000×9.81
    var Ft=9810*Rh*S/100;var Vh=V*V/19.62;
    // Número de Froude: Fr = V/√(g·Dh). 9.81 = g
    var DhD=gDhD(YDo);var Dh=DhD*D;var Froude=Dh>0?V/Math.sqrt(9.81*Dh):0;
    
    // ── Hw y Boquilla (Control de Entrada) ──────────────────────────────────
    var dBoq = t.boquilla ? (parseFloat(t.boquilla) / 1000) : D;
    var Hw = 0;
    if (Froude >= 1.1 && dBoq > 0) {
        var Z_D25 = (Qd / 1000) / (Math.pow(dBoq, 2.5) * Math.sqrt(9.81));
        if (Z_D25 > 0.62) {
            Hw = dBoq * (0.7 + 1.91 * Math.pow(Z_D25, 2));
        } else {
            Hw = Y + Vh; // Aproximación de energía si Z_D25 <= 0.62
        }
    }

    // Velocidad acotada a 10 m/s para calcular tiempo de recorrido
    var Vtop=Math.min(V,10);var TrRec=Vtop>0?t.longitud/Vtop/60:0;var caida=t.longitud*S/100;
    // Flujo: Sub=Froude<0.9, Sup=>1.1, Trans=entre ambos
    var flujo=Froude<.9?"Sub":(Froude>1.1?"Sup":"Trans");
    // Tiempo de concentración aguas abajo = max(tc actual, tc arribo + tiempo recorrido)
    if(!tcN[t.a]||Tc+TrRec>tcN[t.a])tcN[t.a]=Tc+TrRec;
    // Profundidades de pozo (excavación): cota rasante - cota fondo
    var profE=crDE-cfDE;var profS=crA-cfA;
    // ── CANTIDADES DE OBRA (excavación + relleno) ────────────────────────────
    // Dp=1.2m: descuento por pozo. bz=D+0.4m: ancho zanja (0.2m por lado)
    // H1,H2=prof+0.2m: sobre-excavación por cimentación
    // v025/v2550/v50p: volúmenes por rangos de profundidad (tarifas diferenciadas)
    // Ver DOC_MOTOR_HIDRAULICO.md §12.3
    var Dp = parseFloat(P.diametroPozo || 1.20);
    var L_horiz = Math.max(0, L - Dp);
    var slopeDec = Math.abs(S) / 100;
    var Le = L_horiz * Math.sqrt(1 + slopeDec * slopeDec);
    var bz = D + 0.4;
    var H1=profE+.2;var H2=profS+.2;var HP=(H1+H2)/2;
    var volE=Le*HP*bz;var v025=HP<=2.5?volE:Le*2.5*bz;
    var v2550=HP>2.5?Le*Math.min(HP-2.5,2.5)*bz:0;
    var v50p=HP>5?Le*(HP-5)*bz:0;
    /* Rellenos: arena cimentación (0.25m sobre tubo) + común compactado (hasta rasante)
     * rArena: relleno granular = Le × bz × (D+0.25) - sección tubo. Negativo → 0.
     * rComun: relleno común = Le × bz × (HP - D - 0.25). Negativo → 0.
     * Ver DOC_MOTOR_HIDRAULICO.md §12.4
     */
    var volTubo=Math.PI*Math.pow(D/2,2)*Le;
    var rArena=Le*(bz*(D+0.25)-Math.PI*Math.pow(D/2,2));if(rArena<0)rArena=0;
    var rComun=Le*bz*(HP-D-0.25);if(rComun<0)rComun=0;
    /* Auto-dimensionamiento PVC (v36.2): propone diámetro mínimo que cumple Q/Qo y Y/Do.
     * Restringe por nodo aguas arriba (nodePropIdx). Ver DOC §12. */
    var upIdx=nodePropIdx[t.de]||0;
    var effMinIdx=Math.max(baseMinIdx,upIdx);
    var n_pvc=.01;
    var ad=autoDiam(Qd,S,n_pvc,P,effMinIdx);
    nodePropIdx[t.a]=Math.max(nodePropIdx[t.a]||0,ad.idx);
    t._res = {
      de:t.de,a:t.a,deNum:t.deNum||"",aNum:t.aNum||"",
      aR_p:+aR_p.toFixed(6),aC_p:+aC_p.toFixed(6),aI_p:+aI_p.toFixed(6),aIn_p:+aIn_p.toFixed(6),aV_p:+aV_p.toFixed(6),aRe_p:+aRe_p.toFixed(6),
      aR:+aR.toFixed(6),aC:+aC.toFixed(6),aI:+aI.toFixed(6),aIn:+aIn.toFixed(6),
      aV:+aV.toFixed(6),aRe:+aRe.toFixed(6),aT:+aT.toFixed(6),
      den:den,con:con,pob:+pob.toFixed(2),Qmed:+Qmed.toFixed(6),Fm:+Fm.toFixed(2),Qmx:+Qmx.toFixed(4),
      Qi:+Qi.toFixed(6),Qe:+Qe.toFixed(6),Qsan:+Qsan.toFixed(2),
      Cw:+Cw.toFixed(4),Tc:+Tc.toFixed(2),Fr:Fr,I:+Iidf.toFixed(2),Qpluv:+Qpluv.toFixed(2),
      Qd:+Qd.toFixed(2),Qmed:+Qmed.toFixed(6),n:n_c,D:+D.toFixed(3),De:+De.toFixed(3),nom:t.diametroCom||"315 mm",mat:mat,
      L:L,S:+S.toFixed(4),cfDE:+cfDE.toFixed(3),cfA:+cfA.toFixed(3),
      Qo:+Qo.toFixed(2),QoM:+QoMann.toFixed(2),QQo:+(QQo*100).toFixed(2),YDo:+(YDo*100).toFixed(2),VVo:+VVo.toFixed(4),
      Y:+(Y*1000).toFixed(1),Vo:+Vo.toFixed(3),V:+V.toFixed(3),Vh:+Vh.toFixed(4),
      Ft:+Ft.toFixed(4),Froude:+Froude.toFixed(3),flujo:flujo,TrRec:+TrRec.toFixed(4),caida:+caida.toFixed(4),
      crDE:+crDE.toFixed(3),crA:+crA.toFixed(3),profE:+profE.toFixed(4),profS:+profS.toFixed(4),
      Le:+Le.toFixed(2),bz:+bz.toFixed(3),H1:+H1.toFixed(4),H2:+H2.toFixed(4),HP:+HP.toFixed(4),
      volE:+volE.toFixed(3),v025:+v025.toFixed(3),v2550:+v2550.toFixed(3),v50p:+v50p.toFixed(3),
      rArena:+rArena.toFixed(3),rComun:+rComun.toFixed(3),
      /* Rotura/Reposición de pavimento: si anchoVia="S", usa el ancho de vía (P.anchoVia, default 6m).
       * De lo contrario, usa bz (ancho zanja) — ver DOC §12 */
      rotP:+(t.anchoVia==="S"?(L*(P.anchoVia||6)):L*bz).toFixed(2),repP:+(t.anchoVia==="S"?(L*(P.anchoVia||6)):L*bz).toFixed(2),
      matOrig:t.matOrig||mat, matDiseno:matDiseno,
      /* ── Banderas de verificación RAS C.3.4 ─────────────────────────────────── */
      okV:V<=((mat==="PVC"||mat==="PEAD")?10.0:(P.velMaxima||5.0)),okFt:Ft>=P.fuerzaTractMin,
      okFr:Froude<P.limFroudeSub||Froude>P.limFroudeSup,
      okQ:QQo<=P.relCapacidad,okY:YDo<=P.porcProfundidad,
      okProf:profE>=(P.profMin!==undefined?P.profMin:0.80)&&profS>=(P.profMin!==undefined?P.profMin:0.80)&&profE<=(P.profMax||5)&&profS<=(P.profMax||5),
      reponer:t.reponer||'S',tipoVia:t.tipoVia||"FX",pavAncho:t.anchoVia||"N",
      /* Diámetro propuesto por autoDiam (v36.2): campos de propuesta */
      nomProp:ad.nom,DiProp:ad.Di,idxProp:ad.idx,propCumple:ad.cumple,propMotivo:ad.motivo,
      diamOrig:t.diamOrig||t.diametroCom||"",
      pozoNuevo:t.pozoNuevo||"N",
      boquilla:t.boquilla||"",
      Hw:+(typeof Hw !== 'undefined' ? Hw : 0).toFixed(3),
    };
  }

  for(var i=0;i<T.length;i++){
    var t=T[i];
    if(!t.de||t.de==="0"||t.longitud<=0){
      R.push({id:i+1,sep:true});
    } else if(t._res) {
      t._res.id = i+1;
      R.push(t._res);
    } else {
      R.push({id:i+1,sep:true});
    }
  }

  return R;
}


/* cAlternatingBlocks — Hietograma de bloques alternados (método I-PF)
 * Genera un hietograma de diseño redistribuyendo la profundidad acumulada
 * de la curva IDF en bloques alternados (centro-pecho).
 * Entrada: est, Tr, duracionMin, dtMin (delta de tiempo), P (parámetros).
 * Salida: arreglo de intensidades (mm/h) por intervalo dtMin.
 * Fuente: Método del Alternador de Bloques (Chow, Maidment, Mays).
 *         Usado para hietogramas de diseño cuando se modela con SWMM.
 * Ver DOC_MOTOR_HIDRAULICO.md §6 para referencia.
 */
function cAlternatingBlocks(est, Tr, duracionMin, dtMin, P) {
  var blocks = Math.ceil(duracionMin / dtMin);
  var incDepths = [];
  var prevP = 0;
  for(var i=1; i<=blocks; i++){
     var tc = i * dtMin;
     var I_lsha = cIDF(est, Tr, tc, P);
     var I_mmh = I_lsha * 0.36; // Convert from L/s/ha to mm/h
     var ptc = I_mmh * (tc / 60); // Cumulative depth in mm
     incDepths.push(ptc - prevP);
     prevP = ptc;
  }
  incDepths.sort(function(a,b){return b-a;});
  var result = new Array(blocks);
  var center = Math.floor(blocks / 2);
  var left = center - 1, right = center + 1;
  result[center] = incDepths[0];
  var toggle = true;
  for(var i=1; i<blocks; i++){
     if(toggle && right < blocks){ result[right++] = incDepths[i]; }
     else if (!toggle && left >= 0){ result[left--] = incDepths[i]; }
     else if (toggle) { result[left--] = incDepths[i]; }
     else { result[right++] = incDepths[i]; }
     toggle = !toggle;
  }
  return result.map(function(d){ return d / (dtMin / 60); });
}

function formatDiam(rawStr, mat) {
    let mUpper = String(mat || "").toUpperCase();
    let isInchMat = mUpper === "GRES" || mUpper === "CONCRETO";
    if (!rawStr) return isInchMat ? '8"' : '200 mm';
    let str = String(rawStr);
    let dr = str.replace(/[^0-9.]/g, "");
    let dm = parseFloat(dr);
    if (isNaN(dm)) return isInchMat ? '8"' : '200 mm';
    
    let isI = str.includes('"');
    if (isI || dm < 20) dm = Math.round(dm * 25.4);
    if (dm < 100) dm = 200; // minimum
    
    let dbKey = isInchMat ? (mUpper === "CONCRETO" ? "CONCRETO" : "GRES") : (mUpper === "PEAD" ? "PEAD" : "PVC");
    let db = PIPES_DB[dbKey] || PIPES_DB["PVC"];
    let closestPipe = db[0];
    let minDiff = 99999;
    
    for (let i = 0; i < db.length; i++) {
        let p = db[i];
        let pMm;
        if (p.nom.includes('"')) {
            let inch = parseFloat(p.nom.replace(/[^0-9.]/g, ""));
            pMm = inch * 25.4;
        } else {
            pMm = parseFloat(p.nom.replace(/[^0-9.]/g, ""));
        }
        let diff = Math.abs(dm - pMm);
        if (diff < minDiff) {
            minDiff = diff;
            closestPipe = p;
        }
    }
    return closestPipe ? closestPipe.nom : (isInchMat ? '8"' : '200 mm');
}

export {cIDF, gTr, gDi, gDe, gYDo, gVVo, gDhD, QoM, QoDW, autoDiam, getMinPipeIdx, runCalc, cAlternatingBlocks, formatDiam};

export default runCalc;
