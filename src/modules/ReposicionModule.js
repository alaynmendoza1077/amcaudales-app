import React, {useState, useEffect, useCallback, useRef} from 'react';
import * as XLSX from 'xlsx';
import {DP} from '../constants';
import runCalc from '../engine';
import {parseLibro, parseMaestra, parsePtoBase, topoSort, buildTramos, parseINPFile} from '../parsers';
import {fm, Glossary} from '../ui';
import {exportMAESTRA} from '../exportMAESTRA';
import {exportPDF} from '../exportPDF';
import {exportAllReports} from '../exportAllReports';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import DashTab from '../tabs/DashTab';
import ParTab from '../tabs/ParTab';
import ParObraTab from '../tabs/ParObraTab';
import DatTab from '../tabs/DatTab';
import CalcTab from '../tabs/CalcTab';
import ExcTab from '../tabs/ExcTab';
import PozTab from '../tabs/PozTab';
import TubTab from '../tabs/TubTab';
import AcoTab from '../tabs/AcoTab';
import SumTab from '../tabs/SumTab';
import IDFTab from '../tabs/IDFTab';
import AbrevTab from '../tabs/AbrevTab';
import PreTab from '../tabs/PreTab';
import PreGenTab from '../tabs/PreGenTab';
import PreBancoTab from '../tabs/PreBancoTab';
import SwmmTab from '../tabs/SwmmTab';
import CronoTab from '../tabs/CronoTab';

import ResumenCantidadesTab from '../tabs/ResumenCantidadesTab';
import MapTab from '../tabs/MapTab';
import MapResumenTab from '../tabs/MapResumenTab';
import ImportGeoJsonTab from '../tabs/ImportGeoJsonTab';
import ProjectConsolidatorTab from '../tabs/ProjectConsolidatorTab';
import ReportesTab from '../tabs/ReportesTab';
import UrbanismoTab from '../tabs/UrbanismoTab';

import TramosTab from '../tabs/TramosTab';

var TABS=[
  {id:"dash",l:"Dashboard"},{id:"par",l:"Parámetros"},{id:"dat",l:"Datos"},
  {id:"map",l:"Visor Espacial"},{id:"calc",l:"Cálculos"},{id:"mapRes",l:"Visor Resumen"},{id:"poz",l:"Pozos"},
  {id:"tub",l:"Tuberías"},{id:"aco",l:"Acometidas"},{id:"sum",l:"Sumideros"},
  {id:"urbanismo",l:"Urbanismo"},{id:"tra",l:"Tramos"},{id:"exc",l:"Excavaciones"},{id:"pre",l:"Presupuesto"},{id:"cro",l:"Cronograma"},
  {id:"idf",l:"IDF"},{id:"abrev",l:"Abreviaturas"},{id:"swmm",l:"SWMM"},{id:"consolidador",l:"Consolidar Proyectos"},{id:"report",l:"Reportes"}
];

export default function ReposicionModule({ onBack, initialData }){
  const [isThinking, setIsThinking] = useState(false);
  var sTab=useState("map");var tab=sTab[0],setTab=sTab[1];
  var sP=useState(DP);var P=sP[0],setP=sP[1];
  var sT=useState([]);var T=sT[0],setT=sT[1];
  var sR=useState([]);var R=sR[0],setR=sR[1];
  var sSub=useState("san");var sub=sSub[0],setSub=sSub[1];
  var sAliv=useState([]);var alivData=sAliv[0],setAlivData=sAliv[1];
  var sSum=useState([]);var sumData=sSum[0],setSumData=sSum[1];
  var sEstSep=useState(() => { try { let s = localStorage.getItem("AMC_estSepData"); return s ? JSON.parse(s) : {}; } catch(e){return {};} });
    var estSepData=sEstSep[0],setEstSepData=sEstSep[1];
    useEffect(() => { localStorage.setItem("AMC_estSepData", JSON.stringify(estSepData)); }, [estSepData]);
  var sSubS=useState("lat");var subS=sSubS[0],setSubS=sSubS[1];
  var sIdfEst=useState(DP.estacion);var idfEst=sIdfEst[0],setIdfEst=sIdfEst[1];
  var sSumLat=useState([]);var sumLat=sSumLat[0],setSumLat=sSumLat[1];
  var sSumTrans=useState([]);var sumTrans=sSumTrans[0],setSumTrans=sSumTrans[1];
  var sUrbanismoData=useState(null);var urbanismoData=sUrbanismoData[0],setUrbanismoData=sUrbanismoData[1];
  var sPB=useState([]);var pbItems=sPB[0],setPbItems=sPB[1];
  var sPBBanco=useState([]);var pbBancoItems=sPBBanco[0],setPbBancoItems=sPBBanco[1];
  var sLM=useState(false);var lightMode=sLM[0],setLightMode=sLM[1];
  const [exportPhase, setExportPhase] = useState("");
  const [customReportConfig, setCustomReportConfig] = useState(null);
  const isExportingScreenshots = exportPhase !== "";

  /* >>> ADICIÃ“N v36.5: state para selector de colector en perfil <<< */
  var sPI=useState(0);var perfilIdx=sPI[0],setPerfilIdx=sPI[1];
  var sPZ=useState(1);var perfilZoom=sPZ[0],setPerfilZoom=sPZ[1];

  var sFS=useState('menu');var flowStage=sFS[0],setFlowStage=sFS[1];
  var sInp=useState(null);var inpData=sInp[0],setInpData=sInp[1];
  var sSelMap=useState([]);var selMap=sSelMap[0],setSelMap=sSelMap[1];
  var sAutoAreas=useState([]);var autoAreasPoly=sAutoAreas[0],setAutoAreasPoly=sAutoAreas[1];
  var sOutfalls=useState({});var outfalls=sOutfalls[0],setOutfalls=sOutfalls[1];
  var sFilter=useState(false);var filterSel=sFilter[0],setFilterSel=sFilter[1];

  useEffect(function(){
    // Solo inicializar sumLat/sumTrans si NO hay datos AMC que cargar
    var isAMC = initialData && initialData.type === 'amc';
    if (!isAMC) {
      var lat=[];for(var i=0;i<15;i++)lat.push({id:i,cant:0,tipo:"SL-200",diam:250,pozo:"",long:6});
      setSumLat(lat);
      var trans=[];for(var j=0;j<15;j++)trans.push({id:j,cant:0,tipo:"ST-40",diam:250,pozo:"",long:6});
      setSumTrans(trans);
    }

    if (initialData && initialData.type === 'inp') {
       runHeavyTask(() => {
           try {
             var p = parseINPFile(initialData.content);
             var trams = topoSort(buildTramos(p));
             var newP = Object.assign({}, DP);
             setP(newP); setT(trams); setInpData(p);
             setFlowStage('inp');
             setTab('dat');
             if (p.pozos && p.pozos.some(pz => pz.TipoEstruc === 'OUTFALL')) {
                setTimeout(() => alert("Aviso: El archivo INP contiene entregas (OUTFALLS). Dado que los outfalls no proporcionan cota rasante, se ha asignado automáticamente una profundidad de zanja de 2.0 metros para efectos de cálculo. Puedes modificar esta cota rasante en la hoja de Datos."), 100);
             }
           } catch(err) {
             console.error(err);
             setTimeout(() => alert("Error al procesar INP."), 100);
           } finally {
             setIsThinking(false);
           }
       });
    } else if (initialData && initialData.type === 'setup' && initialData.projectSetup) {
       var newP = Object.assign({}, DP, initialData.projectSetup);
       setP(newP);
       setFlowStage('visor');
       setTab('par');
    } else if (initialData && (initialData.type === 'amc' || initialData.type === 'amc_payload')) {
       try {
         var data = typeof initialData.content === 'string' ? JSON.parse(initialData.content) : initialData.content;
         if(data.P){
           var restoredP2 = Object.assign({}, DP, data.P);
           setP(restoredP2);
           setIdfEst(data.P.estacion||"BUC");
         }
         if(data.T)setT(data.T);
         if(data.sumLat)setSumLat(data.sumLat);
         if(data.sumTrans)setSumTrans(data.sumTrans);
         if(data.pbItems)setPbItems(data.pbItems);
         if(data.alivData)setAlivData(data.alivData);
         if(data.sumData)setSumData(data.sumData);
         if(data.estSepData)setEstSepData(data.estSepData);
         if(data.urbanismoData)setUrbanismoData(data.urbanismoData);
         if(data.inpData)setInpData(data.inpData);
         if(data.autoAreasPoly)setAutoAreasPoly(data.autoAreasPoly);
         if(data.selMap)setSelMap(data.selMap);
         if(data.outfalls)setOutfalls(data.outfalls);
         if(data.filterSel!==undefined)setFilterSel(data.filterSel);
         if(data.R)setR(data.R);
         if(data.flowStage && data.flowStage !== 'select') {
           setFlowStage(data.flowStage);
         } else {
           setFlowStage('visor');
         }
         if(data.tab) {
           setTab(data.tab);
         } else {
           setTab('calc');
         }
       } catch(err) {
         console.error(err);
         alert("Error al cargar proyecto AMC.");
       }
    }
  },[initialData]);
  const runHeavyTask = (task) => {
    setIsThinking(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(task, 50);
      });
    });
  };

  var onFL=useCallback(function(d){
    runHeavyTask(() => {
        try{
          setR([]);setAlivData([]);setPbItems([]);
          var lat=[];for(var i2=0;i2<15;i2++)lat.push({id:i2,cant:0,tipo:"SL-200",diam:250,pozo:"",long:6});
          setSumLat(lat);
          var trans=[];for(var j2=0;j2<15;j2++)trans.push({id:j2,cant:0,tipo:"ST-40",diam:250,pozo:"",long:6});
          setSumTrans(trans);
          var p=parseLibro(d);var trams=topoSort(buildTramos(p));
          var newP=Object.assign({},DP);
          if(p.libroParams){Object.assign(newP,p.libroParams);}
          var mst=parseMaestra(d);
          if(mst){Object.assign(newP,mst);delete newP._datosTramos;
            if(mst._datosTramos&&mst._datosTramos.length>0){trams.forEach(function(t){var dm=mst._datosTramos.find(function(dd){return dd.de===t.de;});if(dm){if(!t.tipoVia||t.tipoVia==="FX")t.tipoVia=dm.tipoVia;if(!t.anchoVia)t.anchoVia=dm.pavAncho;if(!t.pozoNuevo||t.pozoNuevo==="N")t.pozoNuevo=dm.pozoNuevo;}});}
          }
          
          var getPredominant = function(arr, key, fallback) {
            if (!arr || arr.length === 0) return fallback;
            var counts = {};
            var maxCount = 0;
            var predominantVal = null;
            arr.forEach(function(item) {
              var val = item[key];
              if (val !== undefined && val !== null && val !== "" && val !== 0 && val !== "0") {
                counts[val] = (counts[val] || 0) + 1;
                if (counts[val] > maxCount) {
                  maxCount = counts[val];
                  predominantVal = val;
                }
              }
            });
            return (predominantVal !== null && predominantVal !== undefined) ? predominantVal : fallback;
          };
          
          var predEst = getPredominant(trams, "estacion", null);
          var predDen = getPredominant(trams, "densidad", null);
          
          var bookEst = (p.libroParams && p.libroParams.estacion) ? p.libroParams.estacion : (mst ? mst.estacion : null);
          if (!bookEst || bookEst === "0" || bookEst === 0) {
            newP.estacion = predEst || DP.estacion;
          } else {
            newP.estacion = bookEst;
          }
          
          var bookDen = (p.libroParams && p.libroParams.densidad !== undefined) ? p.libroParams.densidad : (mst ? mst.densidad : null);
          if (!bookDen || bookDen === "0" || bookDen === 0) {
            newP.densidad = predDen || DP.densidad;
          } else {
            newP.densidad = bookDen;
          }

          var pb=parsePtoBase(d);
          if(pb&&pb.length>0){
            setPbItems(pb);
          }
          setP(newP);setT(trams);setInpData(p);
          setIdfEst(newP.estacion || "BUC");
        }catch(e){console.error(e);}
        finally { setIsThinking(false); }
    }, 50);
  },[T]);

  var onLoadINP=useCallback(function(fileContents){
    runHeavyTask(() => {
    try{
      setR([]);setAlivData([]);setPbItems([]);
      
      if (!Array.isArray(fileContents)) {
          fileContents = [fileContents];
      }
      
      var allTrams = [];
      var allP = Object.assign({}, DP);
      var multiple = fileContents.length > 1;
      
      var mergedP = { pozos: [], verts: [], tr: [], ad: [], outfallNodes: {} };
      
      fileContents.forEach((content, idx) => {
          var p = parseINPFile(content);
          var trams = topoSort(buildTramos(p));
          
          let zPrefix = multiple ? `[Z${idx+1}] ` : "";
          
          if (multiple) {
              trams.forEach(t => {
                 t.de = zPrefix + t.de;
                 t.a = zPrefix + t.a;
                 if(t.nombre) t.nombre = zPrefix + t.nombre;
                 t.id = t.de + "-" + t.a;
              });
              if (p.pozos) {
                  p.pozos.forEach(pz => {
                     if(pz.Nombre) pz.Nombre = zPrefix + pz.Nombre;
                     if(pz.IdNodo) pz.IdNodo = zPrefix + pz.IdNodo;
                     if(pz.IDfinal) pz.IDfinal = zPrefix + pz.IDfinal;
                  });
              }
              if (p.verts) {
                  p.verts.forEach(v => {
                     if(v.IDNODO) v.IDNODO = zPrefix + v.IDNODO;
                  });
              }
              let newOutfalls = {};
              if (p.outfallNodes) {
                  Object.keys(p.outfallNodes).forEach(k => {
                      newOutfalls[zPrefix + k] = p.outfallNodes[k];
                  });
              }
              p.outfallNodes = newOutfalls;
              if (p.ad) {
                  p.ad.forEach(adItem => {
                     if(adItem.IDNODO) adItem.IDNODO = zPrefix + adItem.IDNODO;
                     if(adItem.Nombre) adItem.Nombre = zPrefix + adItem.Nombre;
                     if(adItem.IDNODO_SWMM) adItem.IDNODO_SWMM = zPrefix + adItem.IDNODO_SWMM;
                  });
              }
          }
          
          allTrams = allTrams.concat(trams);
          mergedP.pozos = mergedP.pozos.concat(p.pozos || []);
          mergedP.verts = mergedP.verts.concat(p.verts || []);
          mergedP.tr = mergedP.tr.concat(p.tr || []);
          mergedP.ad = mergedP.ad.concat(p.ad || []);
          Object.assign(mergedP.outfallNodes, p.outfallNodes || {});
      });
      
      var newAutoAreas = [];
      if (mergedP.verts && mergedP.verts.length > 0) {
          let groupedVerts = {};
          mergedP.verts.forEach(v => {
              let nid = String(v.SubName || v.IDNODO || v.Nombre || "");
              if (!nid) return;
              if (!groupedVerts[nid]) groupedVerts[nid] = [];
              if (v.CoordX && v.CoordY) groupedVerts[nid].push(v);
          });
          for (let nid in groupedVerts) {
              let pts = groupedVerts[nid];
              let coords = [];
              pts.forEach(pt => {
                  coords.push([pt.CoordX, pt.CoordY]);
              });
              if (coords.length >= 3) {
                  if (coords[0][0] !== coords[coords.length-1][0] || coords[0][1] !== coords[coords.length-1][1]) {
                      coords.push([...coords[0]]);
                  }
                  let tr = allTrams.find(t => String(t.id) === nid || String(t.de + "-" + t.a) === nid);
                  let de = tr ? tr.de : nid;
                  let a = tr ? tr.a : "";
                  
                  let feat = {
                      type: "Feature",
                      properties: {
                          label: "Tramo " + nid,
                          de: de,
                          a: a,
                          areaHa: mergedP.ad ? (mergedP.ad.find(ad => String(ad.IDNODO) === nid || String(ad.Subcatchment) === nid)?.AREACUENCA || 0) : 0
                      },
                      geometry: {
                          type: "Polygon",
                          coordinates: [coords]
                      }
                  };
                  newAutoAreas.push(feat);
              }
          }
      }
      setAutoAreasPoly(newAutoAreas);

      setP(allP); setT(allTrams); setInpData(mergedP);
      let baseMsg = "Proyecto(s) importado(s) desde INP con \u00e9xito. " + allTrams.length + " tramos y " + mergedP.pozos.length + " pozos procesados.";
      if (mergedP.pozos && mergedP.pozos.some(pz => pz.TipoEstruc === 'OUTFALL')) {
         baseMsg += "\n\nAviso: El archivo INP contiene entregas (OUTFALLS). Dado que los outfalls no proporcionan cota rasante, se ha asignado automáticamente una profundidad de zanja de 2.0 metros para efectos de cálculo. Puedes modificar esta cota rasante en la hoja de Datos.";
      }
      setTimeout(() => alert(baseMsg), 100);
      setTab('dat');
    }catch(e){
      console.error(e);
      setTimeout(() => alert("Error leyendo el(los) archivo(s) INP."), 100);
    } finally { setIsThinking(false); }
    });
  }, [T]);

  useEffect(function(){
    if(!T.length)return;
    setTimeout(() => {
      var results=runCalc(T, { ...P, estSepData });
    if(alivData&&alivData.length>0){
      var dR2=results.filter(function(r){return !r.sep;});
      dR2.forEach(function(r,ri){
        var al=alivData[ri];
        if(al&&al.aliviar==="S"){
          var qmd=al.qmd>0?al.qmd:(r.Qmed||r.Qsan/3.5||0);
          var f5=al.f5>0?al.f5:qmd*5;
          var newQd=Math.max(0,r.Qpluv-f5);
          if(newQd>0&&newQd!==r.Qd){
            r.Qd=+newQd.toFixed(2);
            var QQo=r.Qo>0?newQd/r.Qo:0;
            r.QQo=+(QQo*100).toFixed(2);
            var ydo=0;
            if(QQo<=0)ydo=0;else if(QQo<=.01)ydo=2.883*Math.pow(QQo,.807);else if(QQo<=.035)ydo=.585*Math.pow(QQo,.459);else if(QQo<=.06)ydo=.651*Math.pow(QQo,.459);else if(QQo<=.33)ydo=.816*Math.pow(QQo,.538);else if(QQo<=.8)ydo=.238+QQo*.654;else if(QQo<=.91)ydo=.229+QQo*.662;else ydo=.9;
            r.YDo=+(ydo*100).toFixed(2);r.Y=+(ydo*r.D*1000).toFixed(1);
            var vvo=0;if(ydo<=0)vvo=0;else if(ydo<=.115)vvo=1.375*Math.pow(ydo,.604);else if(ydo<=.175)vvo=.859*Math.pow(ydo,.382);else if(ydo<=.49)vvo=1.183*Math.pow(ydo,.554);else if(ydo<=.635)vvo=1.166*Math.pow(ydo,.540);else if(ydo<=.72)vvo=1.133*Math.pow(ydo,.483);else if(ydo<.885)vvo=1.094*Math.pow(ydo,.375);else vvo=1;
            r.VVo=+vvo.toFixed(4);r.V=+(vvo*r.Vo).toFixed(3);
            var th=ydo>0?2*Math.acos(1-2*ydo):0;var Rh=th>0?.25*(1-Math.sin(th)/th)*r.D:0;
            r.Ft=+(9810*Rh*r.S/100).toFixed(4);
            var dhd=0;if(ydo<=0)dhd=0;else if(ydo<=.14)dhd=1.168*Math.pow(ydo,1.232);else if(ydo<=.38)dhd=.860*Math.pow(ydo,1.142);else if(ydo<=.52)dhd=.911*Math.pow(ydo,1.199);else if(ydo<=.657)dhd=-.201+1.179*ydo;else if(ydo<=.74)dhd=-.486+1.611*ydo;else if(ydo<=.9)dhd=-.901+2.165*ydo;else dhd=ydo;
            var Dh=dhd*r.D;r.Froude=Dh>0?+(r.V/Math.sqrt(9.81*Dh)).toFixed(3):0;
            r.okV=r.V<=((r.mat==="PVC"||r.mat==="PEAD")?10.0:(P.velMaxima||5.0));r.okFt=r.Ft>=P.fuerzaTractMin;r.okQ=QQo<=P.relCapacidad;r.okY=ydo<=P.porcProfundidad;
            r.okFr=r.Froude<P.limFroudeSub||r.Froude>P.limFroudeSup;
            r.aliviado=true;
            r.qdReduced=f5;
          }
        }
      });
      var reducMap={};
      dR2.forEach(function(r){if(r.aliviado&&r.qdReduced>0)reducMap[r.a]=r.qdReduced;});
      dR2.forEach(function(r,ri){
        if(r.aliviado)return;
        var reduc=reducMap[r.de]||0;
        if(reduc>0){
          var newQd2=Math.max(0,r.Qd-reduc);
          r.Qd=+newQd2.toFixed(2);
          var QQo2=r.Qo>0?newQd2/r.Qo:0;
          r.QQo=+(QQo2*100).toFixed(2);
          var ydo2=0;if(QQo2<=0)ydo2=0;else if(QQo2<=.01)ydo2=2.883*Math.pow(QQo2,.807);else if(QQo2<=.035)ydo2=.585*Math.pow(QQo2,.459);else if(QQo2<=.06)ydo2=.651*Math.pow(QQo2,.459);else if(QQo2<=.33)ydo2=.816*Math.pow(QQo2,.538);else if(QQo2<=.8)ydo2=.238+QQo2*.654;else if(QQo2<=.91)ydo2=.229+QQo2*.662;else ydo2=.9;
          r.YDo=+(ydo2*100).toFixed(2);r.Y=+(ydo2*r.D*1000).toFixed(1);
          var vvo2=0;if(ydo2<=0)vvo2=0;else if(ydo2<=.115)vvo2=1.375*Math.pow(ydo2,.604);else if(ydo2<=.175)vvo2=.859*Math.pow(ydo2,.382);else if(ydo2<=.49)vvo2=1.183*Math.pow(ydo2,.554);else if(ydo2<=.635)vvo2=1.166*Math.pow(ydo2,.540);else if(ydo2<=.72)vvo2=1.133*Math.pow(ydo2,.483);else if(ydo2<.885)vvo2=1.094*Math.pow(ydo2,.375);else vvo2=1;
          r.VVo=+vvo2.toFixed(4);r.V=+(vvo2*r.Vo).toFixed(3);
          r.aliviado=true;
          reducMap[r.a]=reduc;
        }
      });
    }
      setR(results);
    }, 10);
  },[T, P, alivData, estSepData]);

  var handleSaveAMC=function(){
    var suggestedName = (P.proyecto || P.barrio || "proyecto").replace(/\s+/g,"_");
    var fileName = window.prompt("Introduce el nombre con el que deseas guardar el archivo:", suggestedName);
    if(!fileName) return;
    if(!fileName.toLowerCase().endsWith(".amc")) fileName += ".amc";
    
    // Forzar recalculo de presupuesto con base en P (Acometidas, Urbanismo, etc)
    import('../tabs/ProjectConsolidatorTab').then(({ recalcPbItems }) => {
      var data={v:"v36",P:P,T:T,sumLat:sumLat,sumTrans:sumTrans,pbItems:pbItems,alivData:alivData,sumData:sumData,estSepData:estSepData,urbanismoData:urbanismoData,inpData:inpData,flowStage:flowStage,tab:tab,autoAreasPoly:autoAreasPoly,selMap:selMap,outfalls:outfalls,filterSel:filterSel,R:R};
      var freshPbItems = recalcPbItems(data);
      data.pbItems = freshPbItems; // Reemplazar con el recalculado
      
      var blob=new Blob([JSON.stringify(data)],{type:"application/json"});
      import('../utils/fileSaver').then(m => m.saveFileWithDialog(blob, fileName));
    });
  };

  
      
  const handlePrintCustom = (config) => {
      setIsThinking("Preparando reporte personalizado...");
      setCustomReportConfig(config);
      // Si onlySelected, activar filterSel=true para el reporte
      if (config.onlySelected && selMap && selMap.length > 0) {
        setFilterSel(true);
      }
      setExportPhase("custom");
        document.body.classList.add("printing-all-native");
      
      let wasLightMode = lightMode;
      if (config.settings.colorMode === "bn") {
          document.body.classList.add("print-grayscale");
      }
      
      if (!wasLightMode) setLightMode(true);
      
      setTimeout(() => {
          setIsThinking(false);
          window.print();
          setExportPhase("");
          setCustomReportConfig(null);
          
          document.body.classList.remove('print-grayscale');
            document.body.classList.remove('printing-all-native');
          if (!wasLightMode) setLightMode(false);
      }, 4500);
  };

  const exportScreenshots = (phase) => {
      setIsThinking("Preparando hojas...");
      setExportPhase(phase);
      let wasLightMode = lightMode;
      if (!wasLightMode && (phase === "fase1" || phase === "fase2")) {
          setLightMode(true);
      }
      document.body.classList.add('printing-all-native');
      setTimeout(() => {
          setIsThinking(false);
          window.print();
          setExportPhase('');
          document.body.classList.remove('printing-all-native');
          if (!wasLightMode && (phase === 'fase1' || phase === 'fase2')) {
              setLightMode(false);
          }
        }, 4500);
    };

  const exportCurrentTabPDF = () => {
    setIsThinking("Preparando pestaña actual para impresión nativa...");
    setTimeout(() => {
      setIsThinking(null);
      window.print();
    }, 4500);
  };

  var refINP = useRef(null);
  var handleLoadINPFiles = (e) => {
    if(!e.target.files.length) return;
    if(T.length>0){
      var ok=window.confirm("Hay datos cargados. Se perderan los datos no guardados.\n\nPresione Aceptar para continuar o Cancelar para guardar primero.");
      if(!ok) { e.target.value = ""; return; }
    }
    setIsThinking(true);
    var files = Array.from(e.target.files);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          Promise.all(files.map(f => new Promise(res => {
            var reader = new FileReader();
            reader.onload = ev => res(ev.target.result);
            reader.readAsText(f);
          }))).then(contents => {
            try {
              onLoadINP(contents);
            } catch(err) {
              console.error("Error loading INP:", err);
              setTimeout(() => alert("Hubo un error cargando los archivos INP: " + err.message), 100);
            }
            setIsThinking(false);
            e.target.value = "";
          });
        }, 10);
      });
    });
  };


  var handleLoadAMC=function(e){
    var f=e.target.files[0];
    if(!f)return;
    runHeavyTask(() => {
      var reader=new FileReader();
      reader.onload=function(ev){
        try{
          var data=JSON.parse(ev.target.result);
          // Restaurar P: usar merge de DP + data.P para que todas las claves (inclAcom_*, inclUrb_*, etc) persistan correctamente
          if(data.P){
            var restoredP = Object.assign({}, DP, data.P);
            setP(restoredP);
            setIdfEst(data.P.estacion||"BUC");
          }
          if(data.T)setT(data.T);
          if(data.sumLat)setSumLat(data.sumLat);
          if(data.sumTrans)setSumTrans(data.sumTrans);
          if(data.pbItems)setPbItems(data.pbItems);
          if(data.alivData)setAlivData(data.alivData);
          if(data.sumData)setSumData(data.sumData);
          if(data.estSepData)setEstSepData(data.estSepData);
          if(data.urbanismoData)setUrbanismoData(data.urbanismoData);
          if(data.inpData)setInpData(data.inpData);
          if(data.flowStage)setFlowStage(data.flowStage);
          if(data.tab)setTab(data.tab);
          if(data.autoAreasPoly)setAutoAreasPoly(data.autoAreasPoly);
          if(data.selMap)setSelMap(data.selMap);
          if(data.outfalls)setOutfalls(data.outfalls);
          if(data.filterSel!==undefined)setFilterSel(data.filterSel);
          if(data.R)setR(data.R);
        }catch(err){
          console.error(err);
        }
        setIsThinking(false);
      };
      reader.readAsText(f);
    }, 50);
  };
  var refAMC=useRef(null);

  var handleExportMAESTRA=function(){
    if(!T || T.length===0){alert("No hay tuberías calculadas");return;}
    if(!P.municipio || !P.disenador){alert("Complete información del Proyecto (Municipio, Diseñador, etc) en la pestaña Proyecto.");}
    setIsThinking("Generando Excel MAESTRA...");
    import('../tabs/ProjectConsolidatorTab').then(({ recalcPbItems }) => {
      var data={v:"v36",P:P,T:T,sumLat:sumLat,sumTrans:sumTrans,pbItems:pbItems,alivData:alivData,sumData:sumData,estSepData:estSepData,urbanismoData:urbanismoData,inpData:inpData,R:R};
      var freshPbItems = recalcPbItems(data);
      exportMAESTRA(P,R,T,sumLat,sumTrans,freshPbItems,inpData,estSepData, urbanismoData);
      setTimeout(()=>setIsThinking(false),1500);
    });
  };

const handleNewProject = () => {
  if (window.confirm("¿Estás seguro de que deseas empezar un nuevo proyecto en blanco? Se perderán todos los datos no guardados.")) {
    window.location.reload();
  }
};

const handleBack = () => {
  if (window.confirm("¿Estás seguro de salir al Menú Principal? Se perderán los datos si no los has guardado en un archivo .AMC.")) {
    onBack();
  }
};

  var visibleTabs = [];
  if (flowStage === 'quantities') {
    visibleTabs = [
      {id:"dash",l:"Dashboard"}, {id:"parObra",l:"Parámetros Obra"},
      {id:"tra",l:"Tramos"}, {id:"poz",l:"Pozos"}, {id:"tub",l:"Tuberías"}, {id:"aco",l:"Acometidas"}, {id:"sum",l:"Sumideros"}, {id:"exc",l:"Excavaciones"},
      {id:"urbanismo",l:"Urbanismo"}, {id:"preBanco",l:"Cantidades de Obra"}, {id:"pre",l:"Presupuesto"}, {id:"resumen",l:"Resumen"}, {id:"cro",l:"Cronograma"}, {id:"abrev", l:"Abreviaturas"}
    ];
  } else {
    // Fase 1: Diseño
    visibleTabs = [
      {id:"par",l:"Parámetros Hidráulicos"}, {id:"idf",l:"IDF"}, {id:"map",l:"Visor Espacial"}, 
      {id:"dat",l:"Datos"}, {id:"calc",l:"Cálculos"}, {id:"mapRes",l:"Visor Resumen"}, 
      {id:"swmm",l:"SWMM"}, {id:"importGis",l:"Importar GIS"}
    ];
  }

  if (flowStage === 'menu') {
    return <div className={`app ${lightMode ? 'light-mode' : ''}`} style={{minHeight:'100vh', background: lightMode ? '#f8fafc' : 'linear-gradient(135deg, #050a15 0%, #0a1128 100%)'}}>
      {isThinking && (
        <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', zIndex:9999, display:'flex', justifyContent:'center', alignItems:'center'}}>
          <div style={{background:'white', padding:40, borderRadius:16, textAlign:'center', boxShadow:'0 20px 25px -5px rgba(0,0,0,0.1)'}}>
           <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 30px', display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}>
               <div style={{ position: 'absolute', width: 40, height: 10, background: 'rgba(37, 99, 235, 0.4)', borderRadius: '50%', bottom: 0, left: 20, animation: 'ripple 1.5s infinite ease-out' }}></div>
               <div style={{ position: 'absolute', width: 50, height: 50, background: 'linear-gradient(135deg, #93c5fd 0%, #3b82f6 50%, #1d4ed8 100%)', borderRadius: '0 50% 50% 50%', transform: 'rotate(45deg)', animation: 'drop-bounce 1.5s infinite cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 10px 20px rgba(37, 99, 235, 0.6), inset 4px 4px 10px rgba(255,255,255,0.8), inset -4px -4px 15px rgba(0,0,0,0.4)', bottom: 15, left: 15 }}></div>
               <div style={{ position: 'absolute', width: 12, height: 12, background: 'rgba(255,255,255,0.9)', borderRadius: '50%', zIndex: 2, animation: 'drop-shine-bounce 1.5s infinite cubic-bezier(0.4, 0, 0.2, 1)', filter: 'blur(1px)', bottom: 42, left: 26 }}></div>
           </div>
           <h2 style={{color: '#1e293b', margin: '0 0 10px 0', fontWeight: 800, fontSize: '24px', letterSpacing: '1px'}}>Procesando...</h2>
           <p style={{color: '#64748b', margin: 0, fontSize: '15px'}}>Calculando sistema de alcantarillado</p>
           <style>{`
             @keyframes drop-bounce {
               0%, 100% { transform: translateY(0) scale(0.95) rotate(45deg); }
               50% { transform: translateY(-20px) scale(1.05) rotate(45deg); }
             }
             @keyframes drop-shine-bounce {
               0%, 100% { transform: translateY(0); }
               50% { transform: translateY(-20px); }
             }
             @keyframes ripple {
               0% { transform: scale(1); opacity: 0.8; }
               100% { transform: scale(3.5); opacity: 0; }
             }
           `}</style>
          </div>
        </div>
      )}
      <div className="header-container" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="hdr">
          <div className="logo">AMC<br/>Pro</div>
          <div style={{display:'flex', flexDirection:'column', justifyContent:'center', color: lightMode?'#1e293b':'white', textShadow: lightMode?'none':'0 2px 4px rgba(0,0,0,0.5)'}}>
            <h1>AMCaudales <span style={{fontSize:'16px', fontWeight:'normal', color: lightMode?'#3b82f6':'#93c5fd', marginLeft: 10}}>| Diseño de Reposición</span></h1>
            <p>CÁLCULO DE SISTEMAS DE ALCANTARILLADO</p>
          </div>
          <div className="hdr-actions">
            <button className="hdr-btn" onClick={handleBack} title="Salir al Menú Principal" style={{ background: 'linear-gradient(to right, #4b5563, #374151)', color: 'white', border: '1px solid #6b7280' }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
              Salir al Menú
            </button>
            <button className="hdr-btn" onClick={() => setLightMode(!lightMode)}>
              {lightMode ? '🌙' : '☀️'} {lightMode ? 'Oscuro' : 'Claro'}
            </button>
            <input ref={refAMC} type="file" accept=".amc" style={{display:"none"}} onChange={handleLoadAMC}/>
            <input ref={refINP} type="file" accept=".inp" multiple style={{display:"none"}} onChange={handleLoadINPFiles}/>
          </div>
        </div>
      </div>
      
      <div style={{ padding: '2rem 2rem 0 2rem' }}>
         <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <div onClick={() => { setFlowStage('excel'); setTab('dat'); }} style={{ width: 280, height: 300, display: 'flex', flexDirection: 'column', background: lightMode ? '#ffffff' : 'rgba(30,41,59,0.4)', border: lightMode ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '24px', cursor: 'pointer', textAlign: 'center', transition: 'transform 0.2s, background 0.2s', boxShadow: lightMode ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : '0 10px 30px rgba(0,0,0,0.3)' }} onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-5px)';e.currentTarget.style.background=lightMode ? '#f8fafc' : 'rgba(30,41,59,0.8)'}} onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.background=lightMode ? '#ffffff' : 'rgba(30,41,59,0.4)'}}>
                <div style={{ fontSize: 32, marginBottom: 16 }}>📊</div>
                <h2 style={{ color: lightMode ? '#2563eb' : '#60a5fa', margin: '0 0 8px 0', fontSize: '1.2rem' }}>Cargar con Excel</h2>
                <p style={{ color: lightMode ? '#475569' : '#94a3b8', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>Importa tu Maestro de Excel sin usar el Visor Geográfico.</p>
            </div>

            <div onClick={() => { setFlowStage('visor'); setTab('map'); }} style={{ width: 280, height: 300, display: 'flex', flexDirection: 'column', background: lightMode ? '#ffffff' : 'rgba(30,41,59,0.4)', border: lightMode ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '24px', cursor: 'pointer', textAlign: 'center', transition: 'transform 0.2s, background 0.2s', boxShadow: lightMode ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : '0 10px 30px rgba(0,0,0,0.3)' }} onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-5px)';e.currentTarget.style.background=lightMode ? '#f8fafc' : 'rgba(30,41,59,0.8)'}} onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.background=lightMode ? '#ffffff' : 'rgba(30,41,59,0.4)'}}>
                <div style={{ fontSize: 32, marginBottom: 16 }}>🗺️</div>
                <h2 style={{ color: lightMode ? '#059669' : '#10b981', margin: '0 0 8px 0', fontSize: '1.2rem' }}>Cargar desde Visor</h2>
                <p style={{ color: lightMode ? '#475569' : '#94a3b8', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>Dibuja, traza y genera redes directamente en el mapa espacial.</p>
            </div>
         </div>
      </div>
      
      <div style={{ borderTop: lightMode ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.1)', margin: '2rem auto', maxWidth: '1000px', width: '90%' }}></div>

      <ImportGeoJsonTab setIsThinking={setIsThinking} setAutoAreasPoly={setAutoAreasPoly} DP={DP} setT={setT} inpData={inpData} setInpData={setInpData} setFlowStage={setFlowStage} setTab={setTab} setP={setP} onLoadINP={() => { if(refINP.current) refINP.current.click(); }} onLoadAMC={() => { if(refAMC.current) refAMC.current.click(); }} lightMode={lightMode} />
    </div>;
  }

  return <div className={`app ${lightMode ? 'light-mode' : ''}`}>
    {isThinking && (
      <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', zIndex:9999, display:'flex', justifyContent:'center', alignItems:'center'}}>
        <div style={{background:'white', padding:40, borderRadius:16, textAlign:'center', boxShadow:'0 20px 25px -5px rgba(0,0,0,0.1)'}}>
           <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 30px', display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}>
               <div style={{ position: 'absolute', width: 40, height: 10, background: 'rgba(37, 99, 235, 0.4)', borderRadius: '50%', bottom: 0, left: 20, animation: 'ripple 1.5s infinite ease-out' }}></div>
               <div style={{ position: 'absolute', width: 50, height: 50, background: 'linear-gradient(135deg, #93c5fd 0%, #3b82f6 50%, #1d4ed8 100%)', borderRadius: '0 50% 50% 50%', transform: 'rotate(45deg)', animation: 'drop-bounce 1.5s infinite cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 10px 20px rgba(37, 99, 235, 0.6), inset 4px 4px 10px rgba(255,255,255,0.8), inset -4px -4px 15px rgba(0,0,0,0.4)', bottom: 15, left: 15 }}></div>
               <div style={{ position: 'absolute', width: 12, height: 12, background: 'rgba(255,255,255,0.9)', borderRadius: '50%', zIndex: 2, animation: 'drop-shine-bounce 1.5s infinite cubic-bezier(0.4, 0, 0.2, 1)', filter: 'blur(1px)', bottom: 42, left: 26 }}></div>
           </div>
           <h2 style={{color: '#1e293b', margin: '0 0 10px 0', fontWeight: 800, fontSize: '24px', letterSpacing: '1px'}}>Procesando...</h2>
           <p style={{color: '#64748b', margin: 0, fontSize: '15px'}}>Calculando sistema de alcantarillado</p>
           <style>{`
             @keyframes drop-bounce {
               0%, 100% { transform: translateY(0) scale(0.95) rotate(45deg); }
               50% { transform: translateY(-20px) scale(1.05) rotate(45deg); }
             }
             @keyframes drop-shine-bounce {
               0%, 100% { transform: translateY(0); }
               50% { transform: translateY(-20px); }
             }
             @keyframes ripple {
               0% { transform: scale(1); opacity: 0.8; }
               100% { transform: scale(3.5); opacity: 0; }
             }
           `}</style>
        </div>
      </div>
    )}
    <div className="top-info-bar">
      <span><strong>Proyecto:</strong> {P.proyecto || "Sin definir"}</span>
      <span><strong>Diseñador:</strong> {P.disenador || "Sin definir"}</span>
      <span><strong>Fecha:</strong> {P.fecha || new Date().toLocaleDateString('es-CO')}</span>
      <span><strong>Estación IDF:</strong> {P.estacion || "BUCARAMANGA"}</span>
    </div>
    <style>{`
      .dropdown-item:hover { background-color: #3b82f6 !important; color: white !important; }
      .light-mode .dropdown-item:hover { background-color: #eff6ff !important; color: #1d4ed8 !important; }
      .hdr { position: relative; z-index: 50; }
      .tabs { position: relative; z-index: 10; }
    `}</style>
    <div className="header-container">
      <div className="hdr">
        <div className="logo">AMC<br/>Pro</div>
        <div className="hdr-titles">
          <h1>AMCaudales <span style={{fontSize:'16px', fontWeight:'normal', color: lightMode?'#3b82f6':'#93c5fd', marginLeft: 10}}>| Diseño de Reposición</span></h1>
          <p>Plataforma de Ingeniería v37</p>
        </div>
        <div className="hdr-actions" style={{display:'flex', alignItems:'center', gap:'15px'}}>
          
          {/* GRUPO IZQUIERDO: ARCHIVO */}
          <div style={{display:'flex', gap:'5px', paddingRight:'15px', borderRight: lightMode?'1px solid #e5e7eb':'1px solid #4b5563', alignItems: 'center'}}>
            <button className="hdr-btn" onClick={onBack} title="Volver al Menú Principal" style={{ height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '135px' }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              <span style={{marginLeft: 6}}>Volver</span>
            </button>
            <button className="hdr-btn" onClick={handleNewProject} title="Crear Nuevo Proyecto en Blanco" style={{ height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '135px' }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
              <span style={{marginLeft: 6}}>Nuevo</span>
            </button>
            <button className="hdr-btn" onClick={() => { if(refAMC.current) refAMC.current.click(); }} title="Abrir Proyecto (.AMC)" style={{ height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '135px' }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
              <span style={{marginLeft: 6}}>Abrir .AMC</span>
            </button>
            <button className="hdr-btn" onClick={handleSaveAMC} title="Guardar Proyecto (.AMC)" style={{ height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '135px' }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
              <span style={{marginLeft: 6}}>Guardar .AMC</span>
            </button>
            <button className="hdr-btn" onClick={() => setTab('consolidador')} title="Consolidar Proyectos" style={{ height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '135px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', color: '#3b82f6' }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16m-7 6h7"/></svg>
              <span style={{marginLeft: 6}}>Consolidar</span>
            </button>
          </div>

          {/* GRUPO CENTRAL: TOGGLE DE FASE */}
          <div style={{ display:'flex', background: lightMode?'#e2e8f0':'rgba(255,255,255,0.05)', borderRadius:'8px', padding:'4px', cursor:'pointer', height: '38px', alignItems: 'center', border: lightMode?'1px solid #cbd5e1':'1px solid #334155' }}>
             <div onClick={() => { setFlowStage(T.length > 0 ? 'visor' : 'menu'); setTab('par'); }} style={{ padding:'0 16px', height: '100%', display: 'flex', alignItems: 'center', fontSize:'13px', fontWeight:'600', borderRadius:'5px', background: flowStage!=='quantities' ? '#3b82f6' : 'transparent', color: flowStage!=='quantities' ? '#fff' : (lightMode?'#4b5563':'#9ca3af'), transition:'all 0.2s' }}>
                Fase 1: Diseño
             </div>
             <div onClick={() => { setFlowStage('quantities'); setTab('dash'); }} style={{ padding:'0 16px', height: '100%', display: 'flex', alignItems: 'center', fontSize:'13px', fontWeight:'600', borderRadius:'5px', background: flowStage==='quantities' ? '#10b981' : 'transparent', color: flowStage==='quantities' ? '#fff' : (lightMode?'#4b5563':'#9ca3af'), transition:'all 0.2s' }}>
                Fase 2: Cantidades
             </div>
          </div>

          {/* GRUPO DERECHO: HERRAMIENTAS */}
          <div style={{display:'flex', gap:'5px', paddingLeft:'15px', borderLeft: lightMode?'1px solid #e5e7eb':'1px solid #4b5563'}}>
            
            {/* DROPDOWN EXPORTAR EXCEL */}
            <div style={{ position:'relative', display:'inline-block' }} onMouseEnter={(e)=>e.currentTarget.querySelector('.dropdown-content').style.display='block'} onMouseLeave={(e)=>e.currentTarget.querySelector('.dropdown-content').style.display='none'}>
              <button className="hdr-btn" style={{ height: '38px', display: 'flex', alignItems: 'center' }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg> 
                Exportar Excel
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{marginLeft:'5px'}}><path d="M6 9l6 6 6-6"/></svg>
              </button>
              <div className="dropdown-content" style={{ display:'none', position:'absolute', top:'100%', right:0, background: lightMode?'#fff':'#1f2937', minWidth:'180px', boxShadow:'0 4px 6px rgba(0,0,0,0.1)', borderRadius:'6px', border: lightMode?'1px solid #e5e7eb':'1px solid #374151', zIndex: 9999, overflow:'hidden', marginTop:'4px' }}>
                <div onClick={() => { setIsThinking("Generando Excel de Diseño..."); setTimeout(() => import('../exportDiseno').then(m => m.exportDiseno(P, R, alivData, sumLat, sumTrans, estSepData)).catch(e => { console.error(e); alert("Error al exportar: " + e.message); }).finally(() => setIsThinking(null)), 100); }} style={{ padding:'10px 15px', fontSize:'13px', cursor:'pointer', borderBottom: lightMode?'1px solid #f3f4f6':'1px solid #374151', color: lightMode?'#1f2937':'#f3f4f6' }} className="dropdown-item">Excel de Diseño</div>
                <div onClick={() => { setIsThinking("Generando Excel de Cantidades..."); setTimeout(() => import('../exportCantidades').then(m => m.exportCantidades(P, R, T, sumLat, sumTrans, pbItems, estSepData, urbanismoData)).catch(e => { console.error(e); alert("Error al exportar: " + e.message); }).finally(() => setIsThinking(null)), 100); }} style={{ padding:'10px 15px', fontSize:'13px', cursor:'pointer', borderBottom: lightMode?'1px solid #f3f4f6':'1px solid #374151', color: lightMode?'#1f2937':'#f3f4f6' }} className="dropdown-item">Excel de Cantidades</div>
                <div onClick={handleExportMAESTRA} style={{ padding:'10px 15px', fontSize:'13px', cursor:'pointer', borderBottom: lightMode?'1px solid #f3f4f6':'1px solid #374151', color: lightMode?'#1f2937':'#f3f4f6' }} className="dropdown-item">Formato MAESTRA</div>
                <div onClick={() => { setIsThinking("Generando Libro GIS..."); setTimeout(() => import('../exportLibro').then(m => m.exportLibro(P, R, T, inpData, autoAreasPoly)).catch(e => { console.error(e); alert("Error al exportar: " + e.message); }).finally(() => setIsThinking(null)), 100); }} style={{ padding:'10px 15px', fontSize:'13px', cursor:'pointer', color: lightMode?'#1f2937':'#f3f4f6' }} className="dropdown-item">Libro GIS</div>
              </div>
            </div>

            {/* DROPDOWN REPORTES PDF */}
            <div style={{ position:'relative', display:'inline-block' }} onMouseEnter={(e)=>e.currentTarget.querySelector('.dropdown-content').style.display='block'} onMouseLeave={(e)=>e.currentTarget.querySelector('.dropdown-content').style.display='none'}>
              <button className="hdr-btn" style={{ height: '38px', display: 'flex', alignItems: 'center' }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg> 
                &nbsp;Reportes PDF
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{marginLeft:'5px'}}><path d="M6 9l6 6 6-6"/></svg>
              </button>
              <div className="dropdown-content" style={{ display:'none', position:'absolute', top:'100%', right:0, background: lightMode?'#fff':'#1f2937', minWidth:'230px', boxShadow:'0 4px 6px rgba(0,0,0,0.1)', borderRadius:'6px', border: lightMode?'1px solid #e5e7eb':'1px solid #374151', zIndex: 9999, overflow:'hidden', marginTop:'0px', paddingTop:'4px' }}>
                <div onClick={() => { exportCurrentTabPDF() }} style={{ padding:'10px 15px', fontSize:'13px', cursor:'pointer', borderBottom: lightMode?'1px solid #f3f4f6':'1px solid #374151', color: lightMode?'#1f2937':'#f3f4f6' }} className="dropdown-item">Imprimir Pestaña Actual (Nativo)</div>
                <div onClick={() => { setTab("report") }} style={{ padding:"10px 15px", fontSize:"13px", cursor:"pointer", color: lightMode?"#1f2937":"#f3f4f6" }} className="dropdown-item">Generador de Reportes (Nativo)</div>
              </div>
            </div>
            <button className="hdr-btn" onClick={() => setLightMode(!lightMode)} title="Alternar Modo Claro / Oscuro" style={{ height: '38px', display: 'flex', alignItems: 'center' }}>
              {lightMode ? '🌙' : '☀️'}
            </button>
          </div>
          
          <input ref={refAMC} type="file" accept=".amc" style={{display:"none"}} onChange={handleLoadAMC}/>
          <input ref={refINP} type="file" accept=".inp" multiple style={{display:"none"}} onChange={handleLoadINPFiles}/>
        </div>
      </div>
      {isExportingScreenshots && (
        <div id="export-screens-container" className="light-export native-print-container" style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '1600px', background: '#FFFFFF', zIndex:-1 }}>
           
            {exportPhase === "custom" && customReportConfig && (
                <div className="custom-report-container">
                    {customReportConfig.settings.headerText && (
                        <div style={{ textAlign:'center', padding:'10px', fontWeight:'bold', borderBottom:'1px solid #000', marginBottom:'20px', color: lightMode?'#000':'#fff' }}>
                            {customReportConfig.settings.headerText}
                        </div>
                    )}
                    
                    {/* Fase 1 */}
                    {customReportConfig.fase1.parIdf && <><div className="print-page-break"><ParTab P={P} sP={setP} R={R} selMap={selMap}/></div> <div className="print-page-break"><IDFTab P={P} sP={setP} idfEst={idfEst} setIdfEst={setIdfEst}/></div></>}
                    {customReportConfig.fase1.dat && <div className="print-page-break"><DatTab T={T} sT={setT} onFL={onFL} selMap={selMap} filterSel={filterSel} setFilterSel={setFilterSel} P={P} setP={setP} setIsThinking={setIsThinking}/></div>}
                    {customReportConfig.fase1.calcSan && <div className="print-page-break"><CalcTab R={R} P={P} setP={setP} T={T} sT={setT} sub="san" setSub={setSub} alivData={alivData} setAlivData={setAlivData} sumData={sumData} setSumData={setSumData} setSumLat={setSumLat} setSumTrans={setSumTrans} estSepData={estSepData} setEstSepData={setEstSepData} sumLat={sumLat} sumTrans={sumTrans} perfilIdx={perfilIdx} setPerfilIdx={setPerfilIdx} perfilZoom={perfilZoom} setPerfilZoom={setPerfilZoom} selMap={selMap} filterSel={filterSel}/></div>}
                    {customReportConfig.fase1.calcPluv && <div className="print-page-break"><CalcTab R={R} P={P} setP={setP} T={T} sT={setT} sub="plu" setSub={setSub} alivData={alivData} setAlivData={setAlivData} sumData={sumData} setSumData={setSumData} setSumLat={setSumLat} setSumTrans={setSumTrans} estSepData={estSepData} setEstSepData={setEstSepData} sumLat={sumLat} sumTrans={sumTrans} perfilIdx={perfilIdx} setPerfilIdx={setPerfilIdx} perfilZoom={perfilZoom} setPerfilZoom={setPerfilZoom} selMap={selMap} filterSel={filterSel}/></div>}
                    {customReportConfig.fase1.calcHid && <div className="print-page-break"><CalcTab R={R} P={P} setP={setP} T={T} sT={setT} sub="hid" setSub={setSub} alivData={alivData} setAlivData={setAlivData} sumData={sumData} setSumData={setSumData} setSumLat={setSumLat} setSumTrans={setSumTrans} estSepData={estSepData} setEstSepData={setEstSepData} sumLat={sumLat} sumTrans={sumTrans} perfilIdx={perfilIdx} setPerfilIdx={setPerfilIdx} perfilZoom={perfilZoom} setPerfilZoom={setPerfilZoom} selMap={selMap} filterSel={filterSel}/></div>}
                    {customReportConfig.fase1.calcAliv && <div className="print-page-break"><CalcTab R={R} P={P} setP={setP} T={T} sT={setT} sub="aliv" setSub={setSub} alivData={alivData} setAlivData={setAlivData} sumData={sumData} setSumData={setSumData} setSumLat={setSumLat} setSumTrans={setSumTrans} estSepData={estSepData} setEstSepData={setEstSepData} sumLat={sumLat} sumTrans={sumTrans} perfilIdx={perfilIdx} setPerfilIdx={setPerfilIdx} perfilZoom={perfilZoom} setPerfilZoom={setPerfilZoom} selMap={selMap} filterSel={filterSel}/></div>}
                    {customReportConfig.fase1.estSep && <div className="print-page-break"><CalcTab R={R} P={P} setP={setP} T={T} sT={setT} sub="sep" setSub={setSub} alivData={alivData} setAlivData={setAlivData} sumData={sumData} setSumData={setSumData} setSumLat={setSumLat} setSumTrans={setSumTrans} estSepData={estSepData} setEstSepData={setEstSepData} sumLat={sumLat} sumTrans={sumTrans} perfilIdx={perfilIdx} setPerfilIdx={setPerfilIdx} perfilZoom={perfilZoom} setPerfilZoom={setPerfilZoom} selMap={selMap} filterSel={filterSel}/></div>}
                    {customReportConfig.fase1.sum && <div className="print-page-break"><CalcTab R={R} P={P} setP={setP} T={T} sT={setT} sub="calc_sum" setSub={setSub} alivData={alivData} setAlivData={setAlivData} sumData={sumData} setSumData={setSumData} setSumLat={setSumLat} setSumTrans={setSumTrans} estSepData={estSepData} setEstSepData={setEstSepData} sumLat={sumLat} sumTrans={sumTrans} perfilIdx={perfilIdx} setPerfilIdx={setPerfilIdx} perfilZoom={perfilZoom} setPerfilZoom={setPerfilZoom} selMap={selMap} filterSel={filterSel}/></div>}
                    {customReportConfig.fase1.perfiles && (() => {
                        // Calculate number of colectores (same logic as CalcTab)
                        const dRPrint = (R||[]).filter(r => !r.sep);
                        const adjMapPrint = {};
                        dRPrint.forEach(r => { adjMapPrint[r.de] = r; });
                        const allAPrint = {};
                        dRPrint.forEach(r => { allAPrint[r.a] = 1; });
                        const cabecerasPrint = [];
                        dRPrint.forEach(r => { if (!allAPrint[r.de]) cabecerasPrint.push(r.de); });
                        if (cabecerasPrint.length === 0 && dRPrint.length > 0) cabecerasPrint.push(dRPrint[0].de);
                        const colectoresPrint = [];
                        cabecerasPrint.forEach(cab => {
                          const chain2 = []; let cur2 = adjMapPrint[cab]; const vis2 = {};
                          while (cur2 && !vis2[cur2.id]) { vis2[cur2.id] = 1; chain2.push(cur2); cur2 = adjMapPrint[cur2.a]; }
                          if (chain2.length >= 1) colectoresPrint.push({ cab, chain: chain2, len: chain2.reduce((s, r) => s + (r.L || 0), 0) });
                        });
                        colectoresPrint.sort((a, b) => b.len - a.len);
                        const nColectores = Math.max(1, colectoresPrint.length);
                        return Array.from({length: nColectores}, (_, ci) => (
                          <div key={"perfil_col_" + ci} className="print-page-break">
                            <CalcTab R={R} P={P} setP={setP} T={T} sT={setT} sub="perfil" setSub={setSub} alivData={alivData} setAlivData={setAlivData} sumData={sumData} setSumData={setSumData} setSumLat={setSumLat} setSumTrans={setSumTrans} estSepData={estSepData} setEstSepData={setEstSepData} sumLat={sumLat} sumTrans={sumTrans} perfilIdx={ci} setPerfilIdx={setPerfilIdx} perfilZoom={perfilZoom} setPerfilZoom={setPerfilZoom} selMap={selMap} filterSel={filterSel}/>
                          </div>
                        ));
                      })()}
                    {customReportConfig.fase1.swmm && <div className="print-page-break"><SwmmTab R={R} P={P} T={T} inpData={inpData} onLoadINP={onLoadINP} autoAreasPoly={autoAreasPoly} outfalls={outfalls} setOutfalls={setOutfalls}/></div>}
                    {customReportConfig.fase1.visorEspacial && <div className="print-page-break" style={{height: "1000px"}}><MapTab T={T} setT={setT} onFL={onFL} selTramos={[]} setSelTramos={()=>{}} bufferArea={0} setBufferArea={()=>{}} bufferPoly={[]} setBufferPoly={()=>{}} autoAreasPoly={autoAreasPoly} setAutoAreasPoly={()=>{}} isExport={true} /></div>}
                    {customReportConfig.fase1.mapRes && <div className="print-page-break" style={{height: "1000px"}}><MapResumenTab T={T} selMap={selMap} R={R} autoAreasPoly={autoAreasPoly} isActive={true} inpData={inpData} P={P} outfalls={outfalls} isExport={true} /></div>}

                      {/* Fase 2 */}
                      {customReportConfig.fase2.dash && <div className="print-page-break"><DashTab R={R} P={P} T={T} sumLat={sumLat} sumTrans={sumTrans} pbItems={pbItems}/></div>}
                      {customReportConfig.fase2.parObra && <div className="print-page-break"><h2 style={{marginTop: '20px', marginBottom: '10px'}}>Parámetros de Obra</h2><ParObraTab P={P} sP={setP}/></div>}
                      {customReportConfig.fase2.cantPoz && <div className="print-page-break"><h2 style={{marginTop: '20px', marginBottom: '10px'}}>Pozos</h2><PozTab R={R} T={T} isExport={true}/></div>}
                      {customReportConfig.fase2.cantTub && <div className="print-page-break"><h2 style={{marginTop: '20px', marginBottom: '10px'}}>Tuberías</h2><TubTab R={R} sumLat={sumLat} sumTrans={sumTrans} P={P}/></div>}
                      {customReportConfig.fase2.cantAco && <div className="print-page-break"><h2 style={{marginTop: '20px', marginBottom: '10px'}}>Acometidas</h2><AcoTab P={P} sP={setP} R={R}/></div>}
                      {customReportConfig.fase2.cantSum && <div className="print-page-break"><SumTab P={P} sP={setP} T={T} sumLat={sumLat} sumTrans={sumTrans}/></div>}
                      {customReportConfig.fase2.cantExc && <div className="print-page-break"><ExcTab R={R} P={P} sP={setP} T={T} pbItems={pbItems} selMap={selMap}/></div>}
                      {customReportConfig.fase2.urbanismo && <div className="print-page-break"><UrbanismoTab R={R} setR={setR} P={P} sP={setP} T={T} selMap={selMap} urbanismoData={urbanismoData} setUrbanismoData={setUrbanismoData}/></div>}
                      {customReportConfig.fase2.cantGen && <div className="print-page-break"><h2 style={{marginTop: '20px', marginBottom: '10px'}}>Cantidades de Obra</h2><PreGenTab R={R} P={P} T={T} sumLat={sumLat} sumTrans={sumTrans} pbItems={pbItems} setPbItems={setPbItems} urbanismoData={urbanismoData}/></div>}
                      {customReportConfig.fase2.pre && (
                        <div className="print-page-break">
                          <div><h2 style={{marginTop: '20px', marginBottom: '10px'}}>Presupuesto</h2><PreTab R={R} P={P} T={T} sumLat={sumLat} sumTrans={sumTrans} pbItems={pbItems} setPbItems={setPbItems} isExport={true}/></div>
                        </div>
                      )}
                      {customReportConfig.fase2.resumen && (
                        <div className="print-page-break">
                          <div><h2 style={{marginTop: '20px', marginBottom: '10px'}}>Resumen de Obra (Gráficas)</h2><ResumenCantidadesTab pbItems={pbItems} R={R} P={P} sumLat={sumLat} sumTrans={sumTrans} /></div>
                        </div>
                      )}
                      {customReportConfig.fase2.cronograma && <div className="print-page-break"><h2 style={{marginTop: '20px', marginBottom: '10px'}}>Cronograma</h2><CronoTab P={P} sP={setP} R={R} pbItems={pbItems}/></div>}
                      {customReportConfig.fase2.abrev && <div className="print-page-break"><AbrevTab /></div>}

                </div>
              )}


            {exportPhase === "fase1" && <>
             <div className="print-page-break"><DashTab R={R} P={P} T={T} sumLat={sumLat} sumTrans={sumTrans} pbItems={pbItems}/></div>
             <div className="print-page-break"><ParTab P={P} sP={setP} R={R} selMap={selMap}/></div>
             <div className="print-page-break"><DatTab T={T} sT={setT} onFL={onFL} selMap={selMap} filterSel={filterSel} setFilterSel={setFilterSel} P={P} setP={setP} setIsThinking={setIsThinking}/></div>
             <div className="print-page-break"><CalcTab R={R} P={P} setP={setP} T={T} sT={setT} sub={sub} setSub={setSub} alivData={alivData} setAlivData={setAlivData} sumData={sumData} setSumData={setSumData} setSumLat={setSumLat} setSumTrans={setSumTrans} estSepData={estSepData} setEstSepData={setEstSepData} sumLat={sumLat} sumTrans={sumTrans} perfilIdx={perfilIdx} setPerfilIdx={setPerfilIdx} perfilZoom={perfilZoom} setPerfilZoom={setPerfilZoom} selMap={selMap} filterSel={filterSel} isExport={isExportingScreenshots}/></div>
             <div className="print-page-break"><IDFTab P={P} sP={setP}/></div>
             <div className="print-page-break"><SwmmTab P={P} T={T} R={R} pbItems={pbItems}/></div>
             <div className="print-page-break"><PozTab R={R} T={T}/></div>
             <div className="print-page-break"><TubTab R={R} sumLat={sumLat} sumTrans={sumTrans} P={P}/></div>
             <div className="print-page-break"><AcoTab P={P} sP={setP} R={R}/></div>
             <div className="print-page-break"><SumTab P={P} sP={setP} sumLat={sumLat} setSumLat={setSumLat} sumTrans={sumTrans} setSumTrans={setSumTrans} subS={subS} setSubS={setSubS} anchoVia={P.anchoVia||6}/></div>
           </>}
             {exportPhase === "fase1" && <div className="print-page-break" style={{height: "1000px"}}><MapResumenTab T={T} selMap={selMap} R={R} autoAreasPoly={autoAreasPoly} isActive={true} inpData={inpData} P={P} outfalls={outfalls} isExport={true} /></div>}
           {exportPhase === "fase2" && <>
               <div className="print-page-break"><DashTab R={R} P={P} T={T} sumLat={sumLat} sumTrans={sumTrans} pbItems={pbItems}/></div>
               <div className="print-page-break"><ParObraTab P={P} sP={setP}/></div>
               <div className="print-page-break"><PozTab R={R} T={T}/></div>
               <div className="print-page-break"><TubTab R={R} sumLat={sumLat} sumTrans={sumTrans} P={P}/></div>
               <div className="print-page-break"><AcoTab P={P} sP={setP} R={R}/></div>
               <div className="print-page-break"><SumTab P={P} sP={setP} sumLat={sumLat} setSumLat={setSumLat} sumTrans={sumTrans} setSumTrans={setSumTrans} subS={subS} setSubS={setSubS} anchoVia={P.anchoVia||6}/></div>
               <div className="print-page-break"><ExcTab R={R} P={P} T={T} sumLat={sumLat} sumTrans={sumTrans}/></div>
                 <div className="print-page-break">
                   <PreTab R={R} P={P} pbItems={pbItems} setPbItems={setPbItems} sumLat={sumLat} sumTrans={sumTrans} urbanismoData={urbanismoData}/>
                   <div style={{marginTop: '40px'}}>
                     <h2 style={{marginTop: '20px', marginBottom: '10px'}}>Resumen de Obra (Gráficas)</h2>
                     <ResumenCantidadesTab pbItems={pbItems} R={R} P={P} sumLat={sumLat} sumTrans={sumTrans} />
                   </div>
                 </div>
               <div className="print-page-break"><PreGenTab R={R} P={P} T={T} sumLat={sumLat} sumTrans={sumTrans} pbItems={pbItems} setPbItems={setPbItems} urbanismoData={urbanismoData}/></div>
               <div className="print-page-break"><CronoTab P={P} sP={setP} pbItems={pbItems} R={R} /></div>
             </>}
        </div>
)}
        <div className="tabs">
        {visibleTabs.map(function(t){return <button key={t.id} className={"tab"+(tab===t.id?" a":"")} onClick={function(){setTab(t.id);}}>{t.l}</button>;})}
      </div>
    </div>
    <div className="cnt">
      {tab==="dash"? <DashTab R={R} P={P} T={T} sumLat={sumLat} sumTrans={sumTrans} pbItems={pbItems}/>:null}
      {tab==="importGis"? <ImportGeoJsonTab setIsThinking={setIsThinking} setT={setT} setP={setP} inpData={inpData} setInpData={setInpData} setAutoAreasPoly={setAutoAreasPoly} setTab={setTab} setFlowStage={setFlowStage} onLoadINP={() => { if(refINP.current) refINP.current.click(); }} onLoadAMC={() => { if(refAMC.current) refAMC.current.click(); }} /> : null}
      {tab==="par"? <ParTab P={P} sP={setP} R={R} selMap={selMap}/>:null}
      {tab==="parObra"? <ParObraTab P={P} sP={setP} />:null}
      {tab==="dat"? <DatTab T={T} sT={setT} onFL={onFL} selMap={selMap} filterSel={filterSel} setFilterSel={setFilterSel} P={P} setP={setP} setIsThinking={setIsThinking}/>:null}
      {tab==="calc"? <CalcTab R={R} P={P} setP={setP} T={T} sT={setT} sub={sub} setSub={setSub} alivData={alivData} setAlivData={setAlivData} sumData={sumData} setSumData={setSumData} setSumLat={setSumLat} setSumTrans={setSumTrans} estSepData={estSepData} setEstSepData={setEstSepData} sumLat={sumLat} sumTrans={sumTrans} perfilIdx={perfilIdx} setPerfilIdx={setPerfilIdx} perfilZoom={perfilZoom} setPerfilZoom={setPerfilZoom} selMap={selMap} filterSel={filterSel}/>:null}
      
        <div style={{ display: tab==="map" ? "block" : "none", flex: 1, height: "100%" }}>
         <MapTab T={T} sT={setT} P={P} setP={setP} inpData={inpData} setInpData={setInpData} setTab={setTab} isActive={tab==="map"} setSelMap={setSelMap} autoAreasPoly={autoAreasPoly} setAutoAreasPoly={setAutoAreasPoly} />
        </div>
      
        <div style={{ display: tab==="report" ? "block" : "none", height: "100%" }}>
          <ReportesTab onPrintCustom={handlePrintCustom} R={R} P={P} T={T} selMap={selMap} inpData={inpData} />
        </div>

        <div style={{ display: tab==="mapRes" ? "block" : "none", height: "100%" }}>
         <MapResumenTab T={T} selMap={selMap} R={R} autoAreasPoly={autoAreasPoly} isActive={tab==="mapRes"} inpData={inpData} P={P} outfalls={outfalls}/>
      </div>

      {tab==="tra"? <TramosTab R={R} />:null}
      {tab==="exc"? <ExcTab R={R} P={P} T={T} sumLat={sumLat} sumTrans={sumTrans} urbanismoData={urbanismoData}/>:null}
      {tab==="poz"? <PozTab R={R} T={T}/>:null}
      {tab==="tub"? <TubTab R={R} sumLat={sumLat} sumTrans={sumTrans} P={P}/>:null}
      {tab==="aco"? <AcoTab P={P} sP={setP} R={R}/>:null}
      {tab==="sum"? <SumTab P={P} sP={setP} sumLat={sumLat} setSumLat={setSumLat} sumTrans={sumTrans} setSumTrans={setSumTrans} subS={subS} setSubS={setSubS} anchoVia={P.anchoVia||6}/>:null}
      {tab==="idf"? <IDFTab P={P} sP={setP} idfEst={idfEst} setIdfEst={setIdfEst}/>:null}
      {tab==="pre"? <PreTab R={R} P={P} T={T} sumLat={sumLat} sumTrans={sumTrans} pbItems={pbItems} setPbItems={setPbItems} urbanismoData={urbanismoData}/>:null}
      {tab==="resumen"? <ResumenCantidadesTab pbItems={pbItems} R={R} P={P} sumLat={sumLat} sumTrans={sumTrans} />:null}
      {tab==="preGen"? <PreGenTab R={R} P={P} T={T} sumLat={sumLat} sumTrans={sumTrans} pbItems={pbItems} setPbItems={setPbItems} urbanismoData={urbanismoData}/>:null}
      {tab==="preBanco"? <PreBancoTab R={R} P={P} T={T} sumLat={sumLat} sumTrans={sumTrans} pbItems={pbItems} pbBancoItems={pbBancoItems} setPbBancoItems={setPbBancoItems}/>:null}
      {tab==="cro"? <CronoTab P={P} sP={setP} R={R} pbItems={pbItems}/>:null}
      {tab==="swmm"? <SwmmTab R={R} P={P} T={T} inpData={inpData} onLoadINP={onLoadINP} autoAreasPoly={autoAreasPoly} outfalls={outfalls} setOutfalls={setOutfalls}/>:null}
      {tab==="consolidador"? <ProjectConsolidatorTab lightMode={lightMode} setR={setR} setP={setP} setT={setT} setAutoAreasPoly={setAutoAreasPoly} setInpData={setInpData} setTab={setTab} setSumLat={setSumLat} setSumTrans={setSumTrans} setPbItems={setPbItems} setAlivData={setAlivData} setSumData={setSumData} setUrbanismoData={setUrbanismoData} setEstSepData={setEstSepData} />:null}
      {tab==="abrev"? <AbrevTab />:null}
      {tab==="urbanismo"? <UrbanismoTab R={R} setR={setR} P={P} sP={setP} T={T} selMap={selMap} urbanismoData={urbanismoData} setUrbanismoData={setUrbanismoData}/>:null}
      <Glossary />
    </div>
  </div>;
}


