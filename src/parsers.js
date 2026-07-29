import {IDF, PIPES} from './constants';
import * as XLSX from 'xlsx';
import PTOBASE_DATA from './ptoBaseData';

function getValCI(obj, ...keys) {
  if (!obj) return undefined;
  const objKeys = Object.keys(obj);
  for (let k of keys) {
    const kLow = k.toLowerCase();
    const found = objKeys.find(ok => ok.toLowerCase() === kLow);
    if (found !== undefined && obj[found] !== null && obj[found] !== undefined && obj[found] !== "") {
      return obj[found];
    }
  }
  return undefined;
}

function parseLibro(d){
  var wb=XLSX.read(d,{type:"array"});
  var ps=function(n){var ws=wb.Sheets[n];return ws?XLSX.utils.sheet_to_json(ws,{defval:null}):[];};
  var ad=ps("AreaDrenaje");
  var trWs=wb.Sheets["Walcan_Tramos_Ordenado"];
  var tr=trWs?XLSX.utils.sheet_to_json(trWs,{defval:null,blankrows:true}):[];
  var datWs=wb.Sheets["2.Datos"];
  var datos=[];
  var raw=[];
  if(datWs){
    raw=XLSX.utils.sheet_to_json(datWs,{defval:null,range:5});
    datos=raw.filter(function(r){var de=r["TRAMO"]||r["De"]||"";return de&&String(de)!=="0"&&String(de)!=="";});
  }
  if(datos.length>0){
    var di=0;
    tr.forEach(function(t){
      var de1=String(t.DE1||t.DE||"").trim();
      var a1=String(t.A1||t.A||"").trim();
      var rawIdx=raw.findIndex(function(dd){return String(dd["TRAMO"]||dd["De"]||"").trim()===de1;});
      var d2=rawIdx!==-1?raw[rawIdx]:null;
      var d3=null;
      if(rawIdx!==-1){
        var nextRow=(rawIdx+1<raw.length)?raw[rawIdx+1]:null;
        if(nextRow){
          var deNext=String(nextRow["TRAMO"]||nextRow["De"]||"").trim();
          if(!deNext||deNext==="0"||deNext===""){
            d3=nextRow;
          }
        }
        if(!d3&&a1){
          d3=raw.find(function(dd){return String(dd["TRAMO"]||dd["De"]||"").trim()===a1;});
        }
      }
      if(!d2&&di<datos.length)d2=datos[di];
      if(d2){
        t.Reponer=String(d2["Reponer"]||d2["Si/No"]||"S");
        t.TipoVia=String(d2["[Flexible, Rígido, Andén, Piedra Pegada, Adoquín, Pasto, Tierra]"]||"FX").substring(0,2);
        t.PavAncho=String(d2["Pavimento de Ancho de via?"]||"S");
        t.PozoNuevo=String(d2["Pozo Nuevo"]||"N");
        t.TipoPozo=String(d2["Tipo Pozo"]||d2["Concre/Mamp"]||"M");
        t.nManning=+(d2["Corf. Rugosidad Manning"]||0);
        
        var rasDE=getValCI(d2,'Cota Rasante del Pozo de Entrada','Cota Rasante','Cota_Rasante','Ctapa','CotaTapa','cras1','rasante','terreno','cota_terreno');
        if(rasDE!==undefined&&rasDE!==null&&rasDE!==""){
          t.cotaRasante_from_datos=+String(rasDE).replace(",",".");
        }
        var fonDE=getValCI(d2,'Cota Fondo del Pozo de Entrada','Cota Fondo','Cota_Fondo','CotaFondo','cfonde','cini','cfDE');
        if(fonDE!==undefined&&fonDE!==null&&fonDE!==""){
          t.cotaFondo_from_datos=+String(fonDE).replace(",",".");
        }
        
        if(d3){
          var rasA=getValCI(d3,'Cota Rasante del Pozo de Entrada','Cota Rasante','Cota_Rasante','Ctapa','CotaTapa','cras1','rasante','terreno','cota_terreno');
          if(rasA!==undefined&&rasA!==null&&rasA!==""){
            t.cotaRasanteA_from_datos=+String(rasA).replace(",",".");
          }
          var fonA=getValCI(d3,'Cota Fondo del Pozo de Entrada','Cota Fondo','Cota_Fondo','CotaFondo','cfonde','cini','cfDE');
          if(fonA!==undefined&&fonA!==null&&fonA!==""){
            t.cotaFondoA_from_datos=+String(fonA).replace(",",".");
          }
        }
      }
      di++;
    });
  }
  var verts=ps("Vertices");
  var pozos=ps("Walcan_Pozos_Ordenado");
  var outfallNodes={};
  if(pozos&&pozos.length>0){pozos.forEach(function(p){
    if(p.TipoEstruc&&String(p.TipoEstruc).toUpperCase().indexOf("OUTFALL")>=0){
      outfallNodes[String(p.IdNodo||p.IDfinal||"")]=true;
    }
  });}
  var libroParams={};
  var infoWs=wb.Sheets["1.InformaciónGeneral"]||wb.Sheets["1.InformacionGeneral"];
  if(infoWs){
    var ir=XLSX.utils.sheet_to_json(infoWs,{header:1,defval:null});
    if(ir&&ir.length>20){
      libroParams.proyecto=ir[3]&&ir[3][5]?String(ir[3][5]):"";
      libroParams.municipio=ir[4]&&ir[4][5]?String(ir[4][5]):"";
      libroParams.barrio=ir[5]&&ir[5][5]?String(ir[5][5]):"";
      libroParams.disenador=ir[6]&&ir[6][5]?String(ir[6][5]):"";
      libroParams.cedula=ir[6]&&ir[6][8]?String(ir[6][8]):"";
      libroParams.pobDirecta=ir[9]&&ir[9][5]?+ir[9][5]:0;
      libroParams.pobIndirecta=ir[10]&&ir[10][5]?+ir[10][5]:0;
      libroParams.areaTotal=ir[11]&&ir[11][5]?+ir[11][5]:0;
      libroParams.tipoAlc=ir[13]&&ir[13][5]?String(ir[13][5]):"C";
      libroParams.porcPatios=ir[14]&&ir[14][5]?+ir[14][5]:0.1;
      libroParams.alturaSNM=ir[15]&&ir[15][5]?+ir[15][5]:1015;
      libroParams.densidad=ir[16]&&ir[16][5]?+ir[16][5]:600;
      libroParams.habVivienda=ir[17]&&ir[17][5]?+ir[17][5]:4;
      libroParams.consumo=ir[18]&&ir[18][5]?+ir[18][5]:140;
      var estRaw=ir[19]&&ir[19][5]?String(ir[19][5]).toUpperCase().trim():"";
      var estMapL={"BUCARAMANGA":"BUC","FLORESTA":"FLO","LA GRANJA":"LGR","LLANO GRANDE":"LLG","PALONEGRO":"AER","LA LAGUNA":"LAG"};
      libroParams.estacion=estMapL[estRaw]||estRaw||"BUC";
      libroParams.relCapacidad=ir[22]&&ir[22][5]?+ir[22][5]:0.9;
      libroParams.porcProfundidad=ir[23]&&ir[23][5]?+ir[23][5]:0.9;
      libroParams.velMaxima=ir[24]&&ir[24][5]?+ir[24][5]:5.0;
      libroParams.fuerzaTractMin=ir[25]&&ir[25][5]?+ir[25][5]:1.0;
      libroParams.limFroudeSub=ir[26]&&ir[26][5]?+ir[26][5]:0.9;
      libroParams.limFroudeSup=ir[27]&&ir[27][5]?+ir[27][5]:1.1;
      libroParams.coefRetorno=ir[29]&&ir[29][5]?+ir[29][5]:0.85;
      libroParams.porcExcTierra=ir[9]&&ir[9][9]?+ir[9][9]:0.55;
      libroParams.porcExcGranular=ir[10]&&ir[10][9]?+ir[10][9]:0.30;
      libroParams.porcExcRoca=ir[11]&&ir[11][9]?+ir[11][9]:0.15;
      libroParams.porcEntibado=ir[13]&&ir[13][9]?+ir[13][9]:1;
      libroParams.porcAcarreoLibre=ir[14]&&ir[14][9]?+ir[14][9]:0.5;
      libroParams.porcAprovTierra=ir[15]&&ir[15][9]?+ir[15][9]:0.5;
      libroParams.porcAprovGranular=ir[16]&&ir[16][9]?+ir[16][9]:0.5;
      libroParams.porcAprovRoca=ir[17]&&ir[17][9]?+ir[17][9]:0;
      libroParams.distBotadero=ir[19]&&ir[19][9]?+ir[19][9]:8;
      libroParams.tiempoObra=ir[22]&&ir[22][9]?+ir[22][9]:2;
      libroParams.anchoVia=ir[24]&&ir[24][9]?+ir[24][9]:6;
      libroParams.nAcom06=ir[28]&&ir[28][9]?+ir[28][9]:0;
      libroParams.nAcom610=ir[29]&&ir[29][9]?+ir[29][9]:0;
      libroParams.nAcom10=ir[30]&&ir[30][9]?+ir[30][9]:0;
      libroParams.vallas1=ir[34]&&ir[34][9]?+ir[34][9]:0;
      libroParams.vallas2=ir[35]&&ir[35][9]?+ir[35][9]:0;
      libroParams.vallas3=ir[36]&&ir[36][9]?+ir[36][9]:0;
      libroParams.vallas4=ir[37]&&ir[37][9]?+ir[37][9]:1;
    }
  }
  return{ad:ad,tr:tr,verts:verts,pozos:pozos,outfallNodes:outfallNodes,libroParams:libroParams};
}


function parseMaestra(d){
  var wb=XLSX.read(d,{type:"array"});
  var ws=wb.Sheets["MAESTRA"];
  if(!ws)return null;
  var raw=XLSX.utils.sheet_to_json(ws,{header:1,defval:null});
  if(!raw||raw.length<40)return null;
  var gv=function(row){if(!raw[row])return null;var v=raw[row][1];return v!==null&&v!==undefined?v:null;};
  var gs=function(row){var v=gv(row);return v!==null?String(v):"";};
  var gn=function(row){var v=gv(row);return v!==null?+v:0;};
  var m={};
  m.proyecto=gs(6)||"";m.municipio=gs(7)||"";m.barrio=gs(8)||"";
  m.disenador=gs(9)||"";m.cedula=gs(10)||"";
  m.estacion=gs(12)||"";
  m.porcExcTierra=gn(16)||0.55;m.porcExcGranular=gn(17)||0.30;m.porcExcRoca=gn(18)||0.15;
  m.porcEntibado=gn(19)||1;m.porcAcarreoLibre=gn(20)||0.5;
  m.porcAprovTierra=gn(21)||0.5;m.porcAprovGranular=gn(22)||0.5;m.porcAprovRoca=gn(23)||0;
  m.distBotadero=gn(24)||8;
  m.pobDirecta=gn(28)||0;m.pobIndirecta=gn(29)||0;
  m.areaTotal=gn(30)||0;
  var ta=gs(31);m.tipoAlc=ta==="S"||ta==="P"||ta==="C"||ta==="SC"?ta:"C";
  m.porcPatios=gn(33)||10;m.alturaSNM=gn(34)||1015;
  m.densidad=gn(35)||600;m.habVivienda=gn(36)||4;m.consumo=gn(37)||140;m.coefRetorno=gn(38)||0.85;
  m.tiempoObra=gn(39)||2;m.anchoVia=gn(41)||6;
  m.nAcom06=gn(42)||0;m.nAcom610=gn(43)||0;m.nAcom10=gn(44)||0;
  m.relCapacidad=gn(45)||0.9;m.porcProfundidad=gn(46)||0.9;
  m.velMaxima=gn(47)||5.0;m.fuerzaTractMin=gn(48)||1.0;
  m.limFroudeSub=gn(49)||0.9;m.limFroudeSup=gn(50)||1.1;
  m.reqInterventoria=gs(51)==="S"?"S":"N";m.porcInterventoria=gn(52)||0.08;
  m.vallas1=gn(53)||0;m.vallas2=gn(54)||0;m.vallas3=gn(55)||0;m.vallas4=gn(56)||1;
  m.porcAdmin=gn(60)||0.29;m.porcImprevistos=gn(61)||0.01;m.porcUtilidad=gn(62)||0.05;m.porcIVA=gn(63)||0.19;
  var estMap={"BUCARAMANGA":"BUC","FLORESTA":"FLO","LA GRANJA":"LGR","LLANO GRANDE":"LLG","PALONEGRO":"AER","LA LAGUNA":"LAG"};
  var estNorm=String(m.estacion).toUpperCase().trim();
  if(estMap[estNorm])m.estacion=estMap[estNorm];
  else if(IDF[m.estacion]){}
  else m.estacion="BUC";
  var datosTramos=[];
  for(var ri=533;ri<raw.length&&ri<640;ri++){
    var rw=raw[ri];if(!rw||!rw[1])continue;
    var deN=rw[1]?String(rw[1]):"";if(!deN||deN==="0")continue;
    datosTramos.push({de:deN,tipoVia:rw[4]?String(rw[4]).substring(0,2):"FX",pavAncho:rw[5]?String(rw[5]):"S",pozoNuevo:rw[6]?String(rw[6]):"N"});
  }
  m._datosTramos=datosTramos;
  return m;
}

function parsePtoBase(d){
  var wb=XLSX.read(d,{type:"array"});var ws=wb.Sheets["10.Presupuesto2026"];
  if(!ws)return[];
  var raw=XLSX.utils.sheet_to_json(ws,{defval:null,range:22});
  var items=[];
  raw.forEach(function(r){
    var cod=r["CÓDIGO"]||r["CODIGO"]||"";
    var desc=r["DESCRIPCIÓN"]||r["DESCRIPCION"]||"";
    if(!cod)return;
    var cs=String(cod).trim();
    if(cs.match(/^[A-K]\./)||cs==="CÓDIGO")return;
    if(!desc){
      var ptoItem = PTOBASE_DATA.find(function(x){return x.c===cs;});
      if(ptoItem) desc = ptoItem.d;
      else if(cs.split(".").length===2) desc = "Título Automático";
      else return;
    }
    var und=r["UNIDAD"]||"";var pu=r["PRECIO PESO"]||r["PRECIO"]||r["P. UNITARIO"]||0;
    var cant=r["CANTIDAD"]||r["CANT"]||r["CANT. /ML"]||r["CANT."]||0;
    var lv=cs.split(".").length-1;
    items.push({c:cs,d:String(desc).trim().substring(0,100),u:String(und).trim()||"GLB",p:+(pu||0),lv:lv,q:parseNum(cant),auto:0});
  });
  return items;
}

function topoSort(tramos){
  if(!tramos||tramos.length<=1)return tramos;
  var real=[];
  tramos.forEach(function(t, i){
    if(!t.sep && t.de && t.a && t.de!=="0"){
      t._pid = i+"_"+t.de+"_"+t.a;
      real.push(t);
    }
  });
  if(real.length<=1) return tramos;
  
  var encontrados = {};
  real.forEach(function(t){ encontrados[t._pid] = t; });
  
  var hijos = {};
  var padre = {};
  
  var pipesByA = {};
  real.forEach(function(t){
    if(!pipesByA[t.a]) pipesByA[t.a] = [];
    pipesByA[t.a].push(t._pid);
  });
  
  real.forEach(function(t){
    var incoming = pipesByA[t.de] || [];
    hijos[t._pid] = incoming;
    incoming.forEach(function(inc){
      padre[inc] = t._pid;
    });
  });

  var max_L_up = {};
  var calc_visiting = {};
  function calc_max_L(pid){
    if(max_L_up[pid] !== undefined) return max_L_up[pid];
    if(calc_visiting[pid]) return 0; // Prevenir ciclo infinito
    calc_visiting[pid] = true;
    
    var t = encontrados[pid];
    var L = parseNum(t.longitud) || parseNum(t.L) || 0;
    if(!hijos[pid] || hijos[pid].length === 0){
      max_L_up[pid] = L;
      calc_visiting[pid] = false;
      return L;
    }
    var max_up = 0;
    hijos[pid].forEach(function(u){
      var v = calc_max_L(u);
      if(v > max_up) max_up = v;
    });
    var m_len = L + max_up;
    max_L_up[pid] = m_len;
    calc_visiting[pid] = false;
    return m_len;
  }
  
  real.forEach(function(t){ calc_max_L(t._pid); });

  // Outfalls: nodes with no padre (no downstream pipe)
  var outfall_pipes = [];
  real.forEach(function(t){
    if(!padre[t._pid]) outfall_pipes.push(t._pid);
  });
  outfall_pipes.sort(function(a,b){ return max_L_up[a] - max_L_up[b]; });

  var orden_final = [];
  var post_visited = {};
  function post_order(pid){
    if(post_visited[pid]) return;
    post_visited[pid] = true;
    
    var ups = (hijos[pid]||[]).slice();
    ups.sort(function(a,b){ return max_L_up[a] - max_L_up[b]; });
    for(var i=0; i<ups.length; i++){
      if(!post_visited[ups[i]]){
        post_order(ups[i]);
        if(i < ups.length - 1){
          orden_final.push(null);
        }
      }
    }
    orden_final.push(encontrados[pid]);
  }

  outfall_pipes.forEach(function(out_p, idx){
    if(idx > 0) orden_final.push(null);
    post_order(out_p);
  });

  var mapped = {};
  var result = [];
  orden_final.forEach(function(x){
    if(x === null) result.push({sep:true});
    else { result.push(x); mapped[x._pid] = true; }
  });
  
  // Agregar cualquier tramo suelto o cíclico que haya quedado por fuera
  real.forEach(function(t){
    if(!mapped[t._pid]) result.push(t);
  });

  result.forEach(function(t, i){ t.id = i+1; delete t._pid; });
  return result;
}

function parseNum(val) {
  if (val == null || val === "") return 0;
  if (typeof val === "number") return val;
  var s = String(val).trim();
  if (s.indexOf(',') !== -1 && s.indexOf('.') !== -1) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (s.indexOf(',') !== -1) {
    s = s.replace(',', '.');
  }
  var n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
function buildTramos(inp){
  if(!inp||!inp.tr||!inp.tr.length)return[];
  var assignedNodes = {};
  return inp.tr.map(function(t,i){
    var de1Raw=t.DE1||t.DE||"";
    var lonRaw=parseNum(t.LONGITUD);
    if(!de1Raw||String(de1Raw)==="0"||lonRaw<=0){return{id:i+1,sep:true};}
    var sumAreas = {res:0, com:0, ind:0, inst:0, via:0, rec:0};
    var adList = [];
    var adRes = null, adVia = null;
    if(inp.ad){
      var deNum=String(t.DE||"").trim();var deNom=String(t.DE1||"").trim();
      if (!assignedNodes[deNum]) {
      adList=inp.ad.filter(function(a){return String(a.IDNODO||"").trim()===deNum || String(a.Nombre||"").trim()===deNom;});
      adList.forEach(function(a){
          var tc = String(a.TIPOCUENCA).toUpperCase();
          var ac = +(a.AREACUENCA||0);
          if(tc==="COMERCIAL") sumAreas.com+=ac;
          else if(tc==="INDUSTRIAL") sumAreas.ind+=ac;
          else if(tc==="INSTITUCIONAL") sumAreas.inst+=ac;
          else if(tc==="RECREACIONAL") sumAreas.rec+=ac;
          else if(tc==="VIA"||tc==="VIAS") sumAreas.via+=ac;
          else sumAreas.res+=ac;
      });
      adVia = adList.find(function(a){return String(a.TIPOCUENCA).toUpperCase()==="VIA" || String(a.TIPOCUENCA).toUpperCase()==="VIAS";});
      adRes = adList.find(function(a){return String(a.TIPOCUENCA).toUpperCase()!=="VIA" && String(a.TIPOCUENCA).toUpperCase()!=="VIAS";});
      if (!adRes && adList.length > 0 && !adVia) adRes = adList[0];
      assignedNodes[deNum] = true;
      }
    }
    var ad = adRes || adVia; // Fallback for qmh and other properties
    var dStr=String(t.diametro||"315").trim();
    var isInch=dStr.indexOf('"')>=0||dStr.indexOf("pulg")>=0;
    var dRaw=dStr.replace(/[^0-9.]/g,"");var dMM=+dRaw;
    if(isInch||dMM<50)dMM=Math.round(dMM*25.4);if(dMM<100)dMM=315;
    var nomArr=[110,160,200,250,315,355,400,450,500,600,700,750,850,900,1000];
    var closest=nomArr.reduce(function(prev,curr){return Math.abs(curr-dMM)<Math.abs(prev-dMM)?curr:prev;});
    var dNom=closest+" mm";var dOrig=dStr;
    var matRaw=String(t.MATERIAL||"PVC").toUpperCase();
    var matOrig=matRaw.includes("PVC")?"PVC":matRaw.includes("PEAD")?"PEAD":matRaw.includes("GRES")?"GRES":"CONCRETO";
    var nMann=t.nManning||0;
    var mat = nMann >= 0.013 ? "GRES" : "PVC";
    var repRaw=String(t.Reponer||"S").toUpperCase();
    var reponer=repRaw==="N"?"N":"S";
    var tipoViaRaw=String(t.TipoVia||t["Tipo Via"]||"FX").toUpperCase();
    var pavAnchoRaw=String(t.PavAncho||"S").toUpperCase();
    var pozoNuevoRaw=String(t.PozoNuevo||"N").toUpperCase();
    var tipoPozoRaw=String(t.TipoPozo||"M").toUpperCase();
    var parsedCR1 = getValCI(t, 'CRas1', 'Rasante_Inicial', 'Rasante Inicial (m)', 'Rasante Inicial', 'Cota_Rasante_Ini', 'Cota_Rasante', 'Cota Rasante Inicial', 'Cota Rasante', 'cras1', 'cota_rasante_ini', 'C.Ras', 'Ctapa', 'CotaTapa', 'cotaTapa', 'cota', 'Cota', 'Cota_Terreno', 'CotaTerreno', 'Rasante1', 'crDE', 'cotaRasante', 'crasDE', 'crasde');
    var cR1 = parseNum(parsedCR1 !== undefined && parsedCR1 !== null && parsedCR1 !== "" ? parsedCR1 : (t.crDE !== undefined && t.crDE !== null ? t.crDE : t.cotaRasante_from_datos));
    var parsedCR2 = getValCI(t, 'CRas2', 'Rasante_Final', 'Rasante Final (m)', 'Rasante Final', 'Cota_Rasante_Fin', 'Cota Rasante Final', 'Cota_Rasante_Fin', 'cras2', 'cota_rasante_fin', 'C.RasA', 'Rasante2', 'crA', 'cotaRasanteA', 'crasA', 'crasa');
    var cR2 = parseNum(parsedCR2 !== undefined && parsedCR2 !== null && parsedCR2 !== "" ? parsedCR2 : (t.crA !== undefined && t.crA !== null ? t.crA : t.cotaRasanteA_from_datos));

    if (t.CRas1 !== undefined && t.CRas1 !== null && String(t.CRas1).trim() !== "") cR1 = parseNum(t.CRas1);
    if (t.CRas2 !== undefined && t.CRas2 !== null && String(t.CRas2).trim() !== "") cR2 = parseNum(t.CRas2);
    var parsedCFDE = getValCI(t, 'CINI', 'cotaFondoDE', 'cotaFondo', 'CotaFondo', 'CotaFondo1', 'Cota_Fondo_Ini', 'Cota_Fondo_DE', 'Cota_Fondo', 'c_ini', 'cfDE', 'CotaBatea', 'Batea', 'CotaBatea1', 'cfonDE', 'cfonde');
    var cFDE = parseNum(parsedCFDE !== undefined && parsedCFDE !== null && parsedCFDE !== "" ? parsedCFDE : t.cotaFondo_from_datos);
    var parsedCFA = getValCI(t, 'CFIN', 'cotaFondoA', 'CotaFondo2', 'Cota_Fondo_Fin', 'Cota_Fondo_A', 'c_fin', 'cfA', 'CotaBatea2', 'cfonA', 'cfonda');
    var cFA = parsedCFA !== undefined && parsedCFA !== null && parsedCFA !== "" ? parsedCFA : t.cotaFondoA_from_datos;
    var cFA_parsed = cFA !== undefined && cFA !== null && cFA !== "" ? parseNum(cFA) : null;

    var qmh = ad && ad.QMH ? parseFloat(ad.QMH) : 0;
    var areaC = adRes ? +(adRes.AREACUENCA||0) : (ad ? +(ad.AREACUENCA||0) : 0);
    var areaViaC = adVia ? +(adVia.AREACUENCA||0) : 0;
    var denCalculada = null;
    if (qmh > 0 && areaC > 0) {
      // QMH = (Pop * Consumo * Retorno) / 86400 -> Pop = (QMH * 86400) / (Consumo * Retorno)
      var pop = (qmh * 86400) / (140 * 0.85);
      denCalculada = Math.round(pop / areaC);
    }

    return{id:i+1,de:t.DE1||t.DE||"",a:t.A1||t.A||"",deNum:String(t.DE||""),aNum:String(t.A||""),
      longitud:parseNum(t.LONGITUD),pendiente:parseNum(t.PENDIENTE),
      cotaRasante:cR1,
      cotaRasanteA:cR2,
      crDE:cR1,
      crA:cR2,
      cotaFondo:cFDE,
      cotaFondoDE:cFDE,
      cotaFondoA:cFA_parsed,
      cfDE:cFDE,
      cfA:cFA_parsed,
      diametroCom:dNom,diamOrig:dNom,material:mat,matOrig:matOrig,
      esInicial:+(t.PInicial||0)===1?"I":"N",
      areaParcial:areaC, aV_prop: areaViaC, tipoArea:ad?(ad.TIPOCUENCA||"RESIDENCIAL"):"RESIDENCIAL",
      areas: sumAreas,
      coefEscorrentia: ad && ad.CESC ? +(ad.CESC) : null,
      densidad: ad && ad.DENSIDAD ? +(ad.DENSIDAD) : denCalculada,
      consumo: ad && ad.CONSUMO ? +(ad.CONSUMO) : null,
      estacion:ad?(ad.IDESTACION||ad.estacion||ad.Estacion||""):"",
      nManning:nMann,reponer:reponer,tipoVia:tipoViaRaw.substring(0,2)||"FX",pavAncho:pavAnchoRaw==="S"?"S":"N",pozoNuevo:pozoNuevoRaw==="S"?"S":"N",tipoPozo:tipoPozoRaw==="C"?"C":"M",
    };
  });
}

function parseINPFile(fileContent) {
  const lines = fileContent.split(/\r?\n/);
  let currentSection = null;
  const sections = { TITLE: [], OPTIONS: [], JUNCTIONS: [], OUTFALLS: [], CONDUITS: [], XSECTIONS: [], COORDINATES: [], POLYGONS: [], SUBCATCHMENTS: [], TAGS: [], DWF: [], TIMESERIES: [] };
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(';')) return;
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      currentSection = trimmed.substring(1, trimmed.length - 1).toUpperCase();
      if (!sections[currentSection]) sections[currentSection] = [];
    } else if (currentSection && sections[currentSection]) {
      sections[currentSection].push(trimmed);
    }
  });
  const parseLine = (l) => l.split(/\s+/);
  const pozos = [];
  const nodesMap = {};
  
  // Extraer TAGS para recuperar nombres originales
  const tagsMap = {};
  sections.TAGS.forEach(l => {
    const p = parseLine(l);
    if (p.length >= 3 && p[0].toUpperCase() === 'NODE') {
      tagsMap[p[1]] = p[2];
    }
  });

  // Extraer DWF para caudales base
  const dwfMap = {};
  sections.DWF.forEach(l => {
    const p = parseLine(l);
    if (p.length >= 3 && p[1].toUpperCase() === 'FLOW') {
      dwfMap[p[0]] = parseFloat(p[2]); // QMH en L/s
    }
  });

  sections.JUNCTIONS.forEach(l => {
    const p = parseLine(l);
    if (p.length >= 2) {
      const id = p[0];
      const nom = tagsMap[id] || id;
      nodesMap[id] = { IdNodo: id, Nombre: nom, Cfondo: parseFloat(p[1]), maxD: parseFloat(p[2]||0), Ctapa: parseFloat(p[1]) + parseFloat(p[2]||0), TipoEstruc: 'JUNCTION' };
      pozos.push(nodesMap[id]);
    }
  });
  sections.OUTFALLS.forEach(l => {
    const p = parseLine(l);
    if (p.length >= 2) {
      const id = p[0];
      const nom = tagsMap[id] || id;
      nodesMap[id] = { IdNodo: id, Nombre: nom, Cfondo: parseFloat(p[1]), Ctapa: parseFloat(p[1]), TipoEstruc: 'OUTFALL' };
      pozos.push(nodesMap[id]);
    }
  });
  sections.COORDINATES.forEach(l => {
    const p = parseLine(l);
    if (p.length >= 3 && nodesMap[p[0]]) {
      nodesMap[p[0]].CoordX = parseFloat(p[1]);
      nodesMap[p[0]].CoordY = parseFloat(p[2]);
    }
  });
  const tr = [];
  const linksMap = {};
  
  let offsetType = 'DEPTH';
  sections.OPTIONS.forEach(l => {
    const p = parseLine(l);
    if (p.length >= 2 && p[0].toUpperCase() === 'LINK_OFFSETS') {
      offsetType = p[1].toUpperCase();
    }
  });

  sections.CONDUITS.forEach(l => {
    const p = parseLine(l);
    if (p.length >= 4) {
      const deOrig = tagsMap[p[1]] || p[1];
      const aOrig = tagsMap[p[2]] || p[2];
      const link = { DE1: deOrig, A1: aOrig, DE: p[1], A: p[2], LONGITUD: parseFloat(p[3]), nManning: parseFloat(p[4]||0.01) };
      
      const nodeDE = nodesMap[p[1]];
      const nodeA = nodesMap[p[2]];
      
      if (nodeDE) {
         link.cotaRasante_from_datos = nodeDE.Ctapa;
         const p5Str = String(p[5]||'*').trim();
         if (p5Str === '*') {
           link.cotaFondo_from_datos = nodeDE.Cfondo;
         } else {
           if (offsetType === 'ELEVATION') link.cotaFondo_from_datos = parseFloat(p5Str);
           else link.cotaFondo_from_datos = nodeDE.Cfondo + parseFloat(p5Str);
         }
      }
      if (nodeA) {
         const p6Str = String(p[6]||'*').trim();
         if (p6Str === '*') {
           link.cotaFondoA_from_datos = nodeA.Cfondo;
         } else {
           if (offsetType === 'ELEVATION') link.cotaFondoA_from_datos = parseFloat(p6Str);
           else link.cotaFondoA_from_datos = nodeA.Cfondo + parseFloat(p6Str);
         }

         if (nodeA.TipoEstruc === 'OUTFALL') {
             // El usuario solicitó asumir 2 metros exactos de profundidad de zanja en outfalls
             link.cotaRasanteA_from_datos = link.cotaFondoA_from_datos + 2.0;
         } else {
             link.cotaRasanteA_from_datos = nodeA.Ctapa;
         }
      }

      if (link.cotaFondo_from_datos !== undefined && link.cotaFondoA_from_datos !== undefined && link.LONGITUD > 0) {
         link.PENDIENTE = ((link.cotaFondo_from_datos - link.cotaFondoA_from_datos) / link.LONGITUD) * 100;
      }

      linksMap[p[0]] = link;
      tr.push(link);
    }
  });
  sections.XSECTIONS.forEach(l => {
    const p = parseLine(l);
    if (p.length >= 3 && linksMap[p[0]]) {
      linksMap[p[0]].diametro = Math.round(parseFloat(p[2]) * 1000);
    }
  });
  const ad = [];
  const subMap = {};
  sections.SUBCATCHMENTS.forEach(l => {
    const p = parseLine(l);
    if (p.length >= 4) {
      // Intentar calcular Coef. Escorrentia aproximado si es posible
      const nomNodo = tagsMap[p[2]] || p[2];
      const sub = { IDNODO: p[2], Nombre: nomNodo, IDNODO_SWMM: p[2], AREACUENCA: parseFloat(p[3]) };
      
      // Buscar QMH si existe para este nodo
      if (dwfMap[p[2]]) {
        sub.QMH = dwfMap[p[2]];
      }

      subMap[p[0]] = sub;
      ad.push(sub);
    }
  });
  const verts = [];
  sections.POLYGONS.forEach(l => {
    const p = parseLine(l);
    if (p.length >= 3 && subMap[p[0]]) {
      verts.push({ SubName: p[0], IDNODO: subMap[p[0]].IDNODO, Nombre: subMap[p[0]].Nombre, CoordX: parseFloat(p[1]), CoordY: parseFloat(p[2]) });
    }
  });

  // Extraer TIMESERIES para IDF
  const idfData = [];
  sections.TIMESERIES.forEach(l => {
    const p = parseLine(l);
    if (p.length >= 3) {
      const trStr = p[0].replace('A', ''); // "10A" -> "10"
      const trNum = parseInt(trStr, 10);
      const timeStr = p[1];
      const val = parseFloat(p[2]);
      if (!isNaN(trNum)) {
         idfData.push({ Tr: trNum, time: timeStr, i: val });
      }
    }
  });
  return { ad, tr, verts, pozos, outfallNodes: {}, libroParams: {}, timeseries: idfData, rawSections: sections };
}

export {parseLibro, parseMaestra, parsePtoBase, topoSort, buildTramos, parseINPFile, parseNum};
