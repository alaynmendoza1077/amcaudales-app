import React, {useState, useEffect, useRef} from 'react';
import {K} from '../ui';
import {cAlternatingBlocks} from '../engine';
import {PU} from '../constants';
import * as turf from '@turf/turf';
import proj4 from 'proj4';
import * as XLSX from 'xlsx';

proj4.defs("EPSG:3116", "+proj=tmerc +lat_0=4.59620041666667 +lon_0=-74.0775079166667 +k=1 +x_0=1000000 +y_0=1000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");


function SwmmTab(props) {
  var P=props.P||{};var R=props.R||[];var libroData=props.libroData||{};var inpData=props.inpData;
  var dR=R.filter(function(r){return !r.sep;});
  if(!dR.length)return <div className="c"><p style={{color:"#7088A8"}}>Cargue datos primero</p></div>;
  var outfalls=props.outfalls||{};var setOutfalls=props.setOutfalls;
  var sOpt=useState({rainInt:25,duracion:60,simDur:2,hTr:10,hDt:5});var opt=sOpt[0],setOpt=sOpt[1];
  var uO=function(k,v){setOpt(function(o){var n={};for(var x in o)n[x]=o[x];n[k]=v;return n;});};
  
  var uOut=function(nodeId,isOut){if(setOutfalls)setOutfalls(function(o){var n={};for(var k in o)n[k]=o[k];if(isOut)n[nodeId]=true;else delete n[nodeId];return n;});};
  var refINP = useRef(null);
  var refExcel = useRef(null);
  var sHyeto=useState(null);var hyetoData=sHyeto[0],setHyetoData=sHyeto[1];
  var sSeries=useState("TS1_AltBlocks");var selectedSeries=sSeries[0],setSelectedSeries=sSeries[1];
  var nodes={};dR.forEach(function(r){var dk=r.deNum||r.de;var ak=r.aNum||r.a;nodes[dk]={name:r.de};nodes[ak]={name:r.a};});
  var nodeList=Object.keys(nodes);
  var lastA=dR[dR.length-1].aNum||dR[dR.length-1].a;
  var libroOutfalls=(inpData&&inpData.outfallNodes)||{};
  var libroKeys=Object.keys(libroOutfalls);var selectedOutfalls=Object.keys(outfalls).length>0?Object.keys(outfalls):(libroKeys.length>0?libroKeys:[lastA]);
  var pozosData=(inpData&&inpData.pozos)||[];
  var vertsData=(inpData&&inpData.verts)||[];
  var wTramos=(inpData&&inpData.tr)||[];
  var pad=function(s,w){s=String(s); if(s.length>=w) return s+" "; while(s.length<w)s+=" ";return s;};
  var generateINP=function(){
    var nodeMap={};var ni=1;
    nodeList.forEach(function(n){
      var pz=pozosData.find(function(p){return String(p.IdNodo)===String(n)||String(p.IDfinal)===String(n);})||pozosData.find(function(p){return String(p.Nombre||"")===String(n);});
      var shortId=pz?String(pz.IdNodo||pz.IDfinal||ni):String(n).length<=16?n:String(ni);
      nodeMap[n]=shortId;ni++;
    });
    var outfallSet={};selectedOutfalls.forEach(function(o){outfallSet[o]=true;});
    var L=[];
      var raw = inpData && inpData.rawSections;
      var formatId = function(id) { return String(id).trim().replace(/\s+/g, '_'); };
      L.push("[TITLE]");L.push(";");L.push("Proyecto          "+P.proyecto+"  "+P.barrio);L.push("");
      L.push("[OPTIONS]");
      L.push("FLOW_UNITS        LPS");L.push("INFILTRATION      CURVE_NUMBER");L.push("FLOW_ROUTING      DYNWAVE");
      L.push("START_DATE        01/01/2026");L.push("START_TIME        00:00:00");
      L.push("REPORT_START_DATE 01/01/2026");L.push("REPORT_START_TIME 00:00:00");
      L.push("END_DATE          01/01/2026");L.push("END_TIME          "+pad(opt.simDur||2,2)+":00:00");
      L.push("SWEEP_START       01/01");L.push("SWEEP_END         12/31");L.push("DRY_DAYS          0");
      L.push("REPORT_STEP       00:05:00");L.push("WET_STEP          00:03:00");L.push("DRY_STEP          00:03:00");
      L.push("ROUTING_STEP      0:00:30");L.push("ALLOW_PONDING     NO");L.push("INERTIAL_DAMPING  PARTIAL");
      L.push("VARIABLE_STEP     0.75");L.push("LENGTHENING_STEP  0");L.push("MIN_SURFAREA      12.557");
      L.push("NORMAL_FLOW_LIMITEDFROUDE");L.push("SKIP_STEADY_STATE NO");
      L.push("FORCE_MAIN_EQUATIOND-W");L.push("LINK_OFFSETS      ELEVATION");L.push("MIN_SLOPE         0.3");L.push("");
      L.push("[EVAPORATION]");L.push("CONSTANT          0.0");L.push("");
      L.push("[RAINGAGES]");
      L.push(pad("G1",18)+pad("INTENSITY",14)+pad("0:05",14)+pad("1.0",14)+"TIMESERIES    TS1");L.push("");
      var isAutoAreasApplied = inpData && inpData.isAutoAreasApplied;
      var useRawAreas = raw && raw.SUBCATCHMENTS && raw.SUBCATCHMENTS.length > 0 && !isAutoAreasApplied;

      if (useRawAreas) {
          L.push("[SUBCATCHMENTS]");
        L.push(";;Name           RainGage         Outlet           Area     %Imperv  Width    %Slope   CurbLen  SnowPack");
        L.push(";;-------------- ---------------- ---------------- -------- -------- -------- -------- -------- ----------------");
        L.push(...raw.SUBCATCHMENTS); L.push("");
        L.push("[SUBAREAS]"); L.push(...(raw.SUBAREAS||[])); L.push("");
        L.push("[INFILTRATION]"); L.push(...(raw.INFILTRATION||[])); L.push("");
      } else {
        L.push("[SUBCATCHMENTS]");
        L.push(";;Name           RainGage         Outlet           Area     %Imperv  Width    %Slope   CurbLen  SnowPack");
        L.push(";;-------------- ---------------- ---------------- -------- -------- -------- -------- -------- ----------------");
        dR.forEach(function(r,ri){
          var subName = "S" + r.id;
          var outNode=formatId(nodeMap[r.deNum||r.de]||r.deNum||r.de);
          var areaP = (r.aR_p||0) + (r.aC_p||0) + (r.aI_p||0) + (r.aIn_p||0) + (r.aV_p||0) + (r.aRe_p||0);
          var area = areaP || 0;
          if (P.tipoAlc === "SC") {
             var pct = P.porcPatios !== undefined ? parseFloat(P.porcPatios) : 5;
             area = area * (pct / 100.0);
          }
          var swmm_imperv = P.swmm_imperv !== undefined && P.swmm_imperv !== "" ? P.swmm_imperv : 65;
          var swmm_width = P.swmm_width !== undefined && P.swmm_width !== "" ? P.swmm_width : 50;
          var swmm_slope = P.swmm_slope !== undefined && P.swmm_slope !== "" ? P.swmm_slope : 0.5;
          L.push(pad(subName,18)+pad("G1",18)+pad(outNode,18)+pad(area.toFixed(6),14)+pad(String(swmm_imperv),10)+pad(String(swmm_width),10)+pad(String(swmm_slope),10)+"0");
        });
        L.push("");
        
        L.push("[SUBAREAS]");
        var n_imperv = P.swmm_n_imperv !== undefined && P.swmm_n_imperv !== "" ? P.swmm_n_imperv : 0.013;
        var n_perv = P.swmm_n_perv !== undefined && P.swmm_n_perv !== "" ? P.swmm_n_perv : 0.15;
        var s_imperv = P.swmm_dstore_imperv !== undefined && P.swmm_dstore_imperv !== "" ? P.swmm_dstore_imperv : 1.5;
        var s_perv = P.swmm_dstore_perv !== undefined && P.swmm_dstore_perv !== "" ? P.swmm_dstore_perv : 5;
        var z_imperv = P.swmm_zero_imperv !== undefined && P.swmm_zero_imperv !== "" ? P.swmm_zero_imperv : 25;
        var subAreaLine = pad(String(n_imperv),14)+pad(String(n_perv),14)+pad(String(s_imperv),14)+pad(String(s_perv),14)+pad(String(z_imperv),14)+pad("OUTLET",14)+"100";
        dR.forEach(function(r,ri){
          var subName = "S" + r.id;
          L.push(pad(subName,18)+subAreaLine);
        });
        L.push("");
        L.push("[INFILTRATION]");
        dR.forEach(function(r,ri){
          var subName = "S" + r.id;
          var existingAd = inpData && inpData.ad ? inpData.ad.find(ad => String(ad.IDNODO) === String(r.deNum||r.de) || String(ad.Subcatchment) === String(r.id)) : null;
          var tipocuenca = existingAd && existingAd.TIPOCUENCA ? existingAd.TIPOCUENCA : (r.TIPOCUENCA || (P && P.tipoArea ? P.tipoArea : "RESIDENCIAL"));
          var grupoSuelo = existingAd && existingAd.GRUPO_SUELO ? existingAd.GRUPO_SUELO : (r.GRUPO_SUELO || (P && P.grupoSueloDefecto ? P.grupoSueloDefecto : "C"));
          
          var cn = 75;
          if (r.CN !== undefined) cn = r.CN;
          else if (existingAd && existingAd.CN !== undefined) cn = existingAd.CN;
          else if (P && P.cnMatrix && P.cnMatrix[tipocuenca] && P.cnMatrix[tipocuenca][grupoSuelo] !== undefined) {
              cn = P.cnMatrix[tipocuenca][grupoSuelo];
          }
          
          L.push(pad(subName,18)+pad(cn.toFixed(1),14)+"15            4");
        });
        L.push("");
      }
      
      L.push("[JUNCTIONS]");
      nodeList.forEach(function(n){if(outfallSet[n])return;
        var pz=pozosData.find(function(p){return String(p.IdNodo)===String(n)||String(p.IDfinal)===String(n);})||pozosData.find(function(p){return String(p.Nombre||"")===String(n);});
        var elev=0;var maxD=0;var ctapa=0;
        
        if(pz){
          elev = parseFloat(pz.Cfondo !== undefined && pz.Cfondo !== 0 ? pz.Cfondo : (pz.CotaFondo !== undefined && pz.CotaFondo !== 0 ? pz.CotaFondo : (pz.cota_fondo !== undefined && pz.cota_fondo !== 0 ? pz.cota_fondo : (pz.cotaFondo !== undefined && pz.cotaFondo !== 0 ? pz.cotaFondo : (pz.cfDE || 0)))));
          ctapa = parseFloat(pz.Ctapa !== undefined && pz.Ctapa !== 0 ? pz.Ctapa : (pz.CotaTapa !== undefined && pz.CotaTapa !== 0 ? pz.CotaTapa : (pz.cota_tapa !== undefined && pz.cota_tapa !== 0 ? pz.cota_tapa : (pz.cotaRasante || pz.cota_terreno || 0))));
        }
        
        var sal=dR.filter(function(r){return String(r.deNum||r.de).trim()===String(n).trim();});
        var ent2=dR.filter(function(r){return String(r.aNum||r.a).trim()===String(n).trim();});

        if(elev===0 && sal.length>0) elev = parseFloat(sal[0].cfDE || sal[0].cotaFondoDE || sal[0].cotaFondo || sal[0].cota_fondo || 0);
        if(elev===0 && ent2.length>0) elev = parseFloat(ent2[0].cfA || ent2[0].cotaFondoA || ent2[0].cotaFondo || ent2[0].cota_fondo || 0);
        
        if(ctapa===0 && sal.length>0) ctapa = parseFloat(sal[0].crDE || sal[0].cotaRasante || sal[0].cotaRasanteDE || sal[0].cr || 0);
        if(ctapa===0 && ent2.length>0) ctapa = parseFloat(ent2[0].crA || ent2[0].cotaRasanteA || ent2[0].cotaRasanteA_from_datos || ent2[0].cr || 0);

        if(ctapa>0 && elev===0) elev = ctapa - 2.0;
        if(elev>0 && ctapa===0) ctapa = elev + 2.0;

        maxD = (ctapa > elev) ? (ctapa - elev) : 2.0;
        if(maxD <= 0) maxD = 2.0;

        L.push(pad(formatId(nodeMap[n]||n),18)+pad(elev.toFixed(3),14)+pad(maxD.toFixed(3),14)+pad("0",14)+pad(ctapa.toFixed(3),14)+"0");});
      L.push("");
      L.push("[OUTFALLS]");L.push(";; Name Elev Type");
      selectedOutfalls.forEach(function(outNode){
        var outPz=pozosData.find(function(p){return String(p.IdNodo||"")===String(outNode)||String(p.Nombre||"")===String(outNode);});
        var outElev=outPz?parseFloat(outPz.Cfondo||outPz.CotaFondo||outPz.cota_fondo||outPz.cotaFondo||0):0;
        if(outElev===0){
          var oe=dR.filter(function(r){return String(r.aNum||r.a).trim()===String(outNode).trim();});
          if(oe.length>0) outElev=parseFloat(oe[0].cfA||oe[0].cotaFondoA||oe[0].cotaFondo||0);
        }
        L.push(pad(formatId(nodeMap[outNode]||outNode),18)+pad(outElev.toFixed(3),14)+"FREE          NO");
      });
      L.push("");
      L.push("[CONDUITS]");
      dR.forEach(function(r,ri){var nde=r.deNum||r.de;var na=r.aNum||r.a;
        var linkId=ri+1;
        var cf1 = parseFloat(r.cfDE || r.cotaFondoDE || r.cotaFondo || 0);
        var cf2 = parseFloat(r.cfA || r.cotaFondoA || r.cotaFondo || 0);
        L.push(pad(linkId,18)+pad(formatId(nodeMap[nde]||nde),18)+pad(formatId(nodeMap[na]||na),18)+pad(Number(r.L||r.longitud||0).toFixed(2),14)+pad((r.n||0.01).toFixed(3),14)+pad(cf1.toFixed(3),14)+pad(cf2.toFixed(3),14)+pad("0",14)+"0");});
      L.push("");
      L.push("[XSECTIONS]");
      dR.forEach(function(r,ri){var linkId=ri+1;
        L.push(pad(linkId,18)+pad("CIRCULAR",14)+pad(r.D,14)+pad("0",14)+pad("0",14)+pad("0",14)+"1");});
      L.push("");
      L.push("[LOSSES]");L.push("");
      L.push("[DWF]");
      dR.forEach(function(r){var nde=r.deNum||r.de;var ndeM=formatId(nodeMap[nde]||nde);var qmh=+(r.Qmed||r.Qsan/3.5||0).toFixed(3);
        L.push(pad(ndeM,18)+pad("FLOW",14)+pad(qmh,14)+"QMH");});
      L.push("");
        L.push("[PATTERNS]");
        L.push(pad("QMH",18)+"HOURLY        1.0           10            10            10            10            10");
        L.push("");
        L.push("[TIMESERIES]");
        if (P.tipoAlc === "S") {
            L.push("TS1               0:00          0.00");
            L.push("TS1               1:00          0.00");
        } else if (selectedSeries === "TS1_AltBlocks") {
            var durMin = opt.duracion || 120;
            var dtMin = opt.hDt || 5;
            var hTr = opt.hTr || 5;
            var est = P.estacion || "BUC";
            var hyetoValues = cAlternatingBlocks(est, hTr, durMin, dtMin, P);
            hyetoValues.forEach(function(val, i){
                var tc = (i+1)*dtMin;
                var h=Math.floor(tc/60);var m2=tc%60;
                var timeStr = (h<10?"0":"")+h+":"+(m2<10?"0":"")+m2;
                L.push(pad("TS1",18)+pad(timeStr,14)+val.toFixed(5));
            });
        } else if (hyetoData && selectedSeries !== "TS1_Default" && hyetoData[selectedSeries]) {
          var serie = hyetoData[selectedSeries];
          serie.forEach(function(p){
            var timeStr = p.Hora || "0:00";
            var val = parseFloat(p.Valor) || 0;
            L.push(pad("TS1",18)+pad(timeStr,14)+val.toFixed(5));
          });
        } else {
          var dur=opt.duracion||60;var intens=opt.rainInt||25;
          for(var t=0;t<=dur;t+=5){var h=Math.floor(t/60);var m2=t%60;
            L.push(pad("TS1",18)+pad((h<10?"0":"")+h+":"+(m2<10?"0":"")+m2,14)+intens.toFixed(5));
          }
        }
        L.push("");
      L.push("[REPORT]");L.push("INPUT             NO");L.push("CONTROLS          NO");
      L.push("SUBCATCHMENTS     ALL");L.push("NODES             ALL");L.push("LINKS             ALL");L.push("");
      L.push("[TAGS]");
      nodeList.forEach(function(n){var nm=nodes[n]?nodes[n].name:n;
        L.push(pad("Node",18)+pad(formatId(nodeMap[n]||n),14)+nm);});
      L.push("");
      
      var formatCoordMeters = function(xVal, yVal) {
        var x = parseFloat(xVal);
        var y = parseFloat(yVal);
        if (isNaN(x) || isNaN(y)) return null;
        if (x >= -180 && x <= 180 && y >= -90 && y <= 90) {
          try {
            var proj = proj4("EPSG:4326", "EPSG:3116", [x, y]);
            x = proj[0];
            y = proj[1];
          } catch(e){}
        }
        return { x: x, y: y, text: pad(x.toFixed(3), 14) + y.toFixed(3) };
      };

      L.push("[MAP]");
      var minX=999999999,minY=999999999,maxX=-999999999,maxY=-999999999;
      nodeList.forEach(function(n){
        var pz2=pozosData.find(function(p){return String(p.IdNodo)===String(n)||String(p.IDfinal)===String(n);})||pozosData.find(function(p){return String(p.Nombre||"")===String(n);});
        var xRaw = pz2 ? (pz2.CoordX !== undefined ? pz2.CoordX : (pz2.x !== undefined ? pz2.x : pz2.X)) : null;
        var yRaw = pz2 ? (pz2.CoordY !== undefined ? pz2.CoordY : (pz2.y !== undefined ? pz2.y : pz2.Y)) : null;
        if (xRaw != null && yRaw != null) {
          var res = formatCoordMeters(xRaw, yRaw);
          if (res) {
            minX = Math.min(minX, res.x); maxX = Math.max(maxX, res.x);
            minY = Math.min(minY, res.y); maxY = Math.max(maxY, res.y);
          }
        }
      });
      if(maxX > -999999999 && minX < 999999999) L.push("DIMENSIONS        "+(minX - 50).toFixed(3)+"   "+(minY - 50).toFixed(3)+"   "+(maxX + 50).toFixed(3)+"   "+(maxY + 50).toFixed(3));
      else L.push("DIMENSIONS        1000000 1000000 1200000 1300000");
      L.push("Units             Metros");L.push("");
      
      L.push("[COORDINATES]");
      var rawCoords = {};
      var validNodeIDs = {};
      nodeList.forEach(n => { validNodeIDs[formatId(nodeMap[n]||n)] = true; });
      if (raw && raw.COORDINATES) {
         raw.COORDINATES.forEach(function(l){
            var p = l.trim().split(/\s+/);
            if (p.length>=3 && validNodeIDs[p[0]]) {
                var res = formatCoordMeters(p[1], p[2]);
                if (res) {
                  L.push(pad(p[0], 18) + res.text);
                  rawCoords[p[0]] = true;
                }
            }
         });
      }
      nodeList.forEach(function(n){
        var shortId = formatId(nodeMap[n]||n);
        if(rawCoords[shortId]) return;
        var pz2=pozosData.find(function(p){return String(p.IdNodo)===String(n)||String(p.IDfinal)===String(n);})||pozosData.find(function(p){return String(p.Nombre||"")===String(n);});
        var xRaw = pz2 ? (pz2.CoordX !== undefined ? pz2.CoordX : (pz2.x !== undefined ? pz2.x : pz2.X)) : null;
        var yRaw = pz2 ? (pz2.CoordY !== undefined ? pz2.CoordY : (pz2.y !== undefined ? pz2.y : pz2.Y)) : null;
        if (xRaw != null && yRaw != null) {
          var res = formatCoordMeters(xRaw, yRaw);
          if (res) L.push(pad(shortId, 18) + res.text);
        } else {
          var idx=nodeList.indexOf(n);
          L.push(pad(shortId,18)+pad((1105000+idx*50).toFixed(3),14)+(1281000).toFixed(3));
        }
      });
      L.push("");
      
      L.push("[VERTICES]");
      var currentT = props.T || [];
      dR.forEach(function(r, ri) {
             var wt = currentT.find ? currentT.find(t => (String(t.id).trim() === String(r.de+"-"+r.a).trim()) || (String(t.de).trim() === String(r.de).trim() && String(t.a).trim() === String(r.a).trim())) : null;
             if (!wt) {
                 wt = wTramos[ri] || (wTramos.find ? wTramos.find(t => (String(t.id||"").trim() === String(r.de+"-"+r.a).trim()) || (String(t.de||"").trim() === String(r.de).trim() && String(t.a||"").trim() === String(r.a).trim())) : null);
             }
             if (wt && wt.coords && wt.coords.length > 2) {
                 var linkId = ri+1;
                 for (var i = 1; i < wt.coords.length - 1; i++) {
                     var c = wt.coords[i];
                     var x = c.lng !== undefined ? c.lng : (c.X !== undefined ? c.X : c[0]);
                     var y = c.lat !== undefined ? c.lat : (c.Y !== undefined ? c.Y : c[1]);
                     L.push(pad(linkId,18)+pad(Number(x).toFixed(3),14)+Number(y).toFixed(3));
                 }
             }
         });
      
      L.push("[Polygons]");
      dR.forEach(function(r, ri) {
          var dn = r.deNum || r.de;
          var tId = r.de + "-" + r.a;
          var subName = "S" + r.id;
          
          var hasPoly = false;
          if (vertsData.length > 0) {
              var vvAll = vertsData.filter(function(v) { 
                  if (v.DE) return v.DE === tId;
                  if (v.SubName) return v.SubName === subName;
                  return String(v.IDNODO||"").trim() === String(r.de).trim() || String(v.Nombre||"").trim() === String(r.de).trim(); 
              });
              if (vvAll.length > 0) {
                  // If older files grouped multiple polygons, try to just use the one matching sn, or the first one
                  var subs = {};
                  vvAll.forEach(function(v) {
                      var sn = v.SubName || ("S_" + dn + "_" + v.ID);
                      if (!subs[sn]) subs[sn] = [];
                      subs[sn].push(v);
                  });
                    var bestSn = null;
                    if (subs[subName]) bestSn = subName;
                    else {
                        var keys = Object.keys(subs);
                        if (keys.length > 0) bestSn = keys[0];
                    }
                    if (bestSn) {
                        var pts = subs[bestSn];
                        if (pts.length > 2) {
                            var firstPt = null;
                            var countClosed = 0;
                            pts.forEach(function(pt) {
                                var x = pt.X !== undefined ? pt.X : pt.CoordX;
                                var y = pt.Y !== undefined ? pt.Y : pt.CoordY;
                                if (x === undefined || y === undefined || isNaN(x) || isNaN(y)) return;
                                
                                if (!firstPt) {
                                    firstPt = { x: x, y: y };
                                    L.push(pad(subName, 18) + pad(Number(x).toFixed(6), 14) + Number(y).toFixed(6));
                                } else {
                                    if (countClosed > 0) return; // Evitar anillos secundarios que cortan el polígono en SWMM
                                    if (Math.abs(firstPt.x - x) < 0.000001 && Math.abs(firstPt.y - y) < 0.000001) {
                                        countClosed++;
                                    }
                                    L.push(pad(subName, 18) + pad(Number(x).toFixed(6), 14) + Number(y).toFixed(6));
                                }
                            });
                        }
                    }
              }
          }
          
          if (!hasPoly && props.autoAreasPoly && props.autoAreasPoly.length > 0) {
              var poly = props.autoAreasPoly.find(p => p.properties && p.properties.isCompleta && (
                  String(p.properties.de||"").trim().toLowerCase() === String(r.de).trim().toLowerCase() ||
                  String(p.properties.tramoId||"").trim().toLowerCase() === String(tId).trim().toLowerCase() ||
                  String(p.properties.id||"").trim().toLowerCase() === String(tId).trim().toLowerCase()
              )) || props.autoAreasPoly.find(p => p.properties && (
                  String(p.properties.id||"").trim().toLowerCase() === String(tId).trim().toLowerCase() ||
                  String(p.properties.id||"").trim().toLowerCase() === String(r.de).trim().toLowerCase() ||
                  String(p.properties.tramoId||"").trim().toLowerCase() === String(tId).trim().toLowerCase() || 
                  String(p.properties.DE||"").trim().toLowerCase() === String(tId).trim().toLowerCase() ||
                  String(p.properties.de||"").trim().toLowerCase() === String(r.de).trim().toLowerCase() ||
                  String(p.properties.IDNODO||"").trim().toLowerCase() === String(r.de).trim().toLowerCase() ||
                  String(p.properties.Nombre||"").trim().toLowerCase() === String(r.de).trim().toLowerCase() ||
                  String(p.properties.label||"").trim().toLowerCase() === ("tramo " + String(tId).trim().toLowerCase())
              ));

                if (poly && poly.geometry) {
                    var targetPoly = poly;
                    if (poly.geometry.type === 'MultiPolygon') {
                        try {
                            var hull = turf.convex(turf.explode(poly));
                            if (hull && hull.geometry) targetPoly = hull;
                        } catch(e){}
                    }
                    var geom = targetPoly.geometry;
                    var mainRing = null;
                    if (geom.type === 'Polygon') {
                        mainRing = geom.coordinates[0];
                    } else if (geom.type === 'MultiPolygon') {
                        var bestArea = -1;
                        geom.coordinates.forEach(c => {
                            try {
                                var a = turf.area(turf.polygon(c));
                                if (a > bestArea) { bestArea = a; mainRing = c[0]; }
                            } catch(e) { if (!mainRing) mainRing = c[0]; }
                        });
                    }
                    if (mainRing) {
                        var lastPt = null;
                        mainRing.forEach(pt => {
                            if (lastPt && Math.abs(lastPt[0] - pt[0]) < 0.000001 && Math.abs(lastPt[1] - pt[1]) < 0.000001) return;
                            // Convertir de WGS84 (Lat/Lon) a MAGNA-SIRGAS EPSG:3116
                            var projCoords = proj4("EPSG:4326", "EPSG:3116", [pt[0], pt[1]]);
                            L.push(pad(subName, 18) + pad(Number(projCoords[0]).toFixed(6), 14) + Number(projCoords[1]).toFixed(6));
                            lastPt = pt;
                        });
                    }
                }
            }
        });
        L.push("");
        L.push("[SYMBOLS]");
        if(maxX>0)L.push(pad("G1",18)+pad((maxX+50).toFixed(3),14)+(maxY+50).toFixed(3));
        else L.push(pad("G1",18)+"10500.000     5500.000");
        L.push("");
      var content=L.join("\r\n");
      var blob=new Blob([content],{type:"text/plain"});
      var defaultName = (P.barrio||"modelo").replace(/\s+/g,"_")+".inp";
      import('../utils/fileSaver').then(m => m.saveFileWithDialog(blob, defaultName));
    };
  const downloadRainTemplate = () => {
    const data = [
      ["Nombre", "Tiempo_min", "Intensidad_mmh"],
      ["Bucaramanga_Tr10", 0, 0],
      ["Bucaramanga_Tr10", 5, 12.5],
      ["Bucaramanga_Tr10", 10, 28.4],
      ["Bucaramanga_Tr10", 15, 65.2],
      ["Bucaramanga_Tr10", 20, 110.8],
      ["Bucaramanga_Tr10", 25, 145.3],
      ["Bucaramanga_Tr10", 30, 95.7],
      ["Bucaramanga_Tr10", 35, 52.1],
      ["Bucaramanga_Tr10", 40, 31.4],
      ["Bucaramanga_Tr10", 45, 20.8],
      ["Bucaramanga_Tr10", 50, 15.2],
      ["Bucaramanga_Tr10", 55, 11.0],
      ["Bucaramanga_Tr10", 60, 8.5]
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Estaciones");
    XLSX.writeFile(wb, "Plantilla_Lluvia_SWMM.xlsx");
  };

  var nOut=selectedOutfalls.length;
  return <div>
    <div className="c"><div className="ct">EPA SWMM 5.x (.inp)</div>
      <div className="g3" style={{marginBottom:8}}>
        <div className="f"><label>Intensidad (mm/h) para Cte.</label><input className="ec" type="number" value={opt.rainInt} onChange={function(e){uO("rainInt",+e.target.value);}}/></div>
        <div className="f"><label>Duracion (min)</label><input className="ec" type="number" value={opt.duracion} onChange={function(e){uO("duracion",+e.target.value);}}/></div>
        <div className="f"><label>Simulacion (h)</label><input className="ec" type="number" value={opt.simDur} onChange={function(e){uO("simDur",+e.target.value);}}/></div>
        {selectedSeries === "TS1_AltBlocks" && (
          <>
            <div className="f"><label>Periodo Retorno (años)</label><input className="ec" type="number" value={opt.hTr} onChange={function(e){uO("hTr",+e.target.value);}}/></div>
            <div className="f"><label>Paso de tiempo (dt min)</label><input className="ec" type="number" value={opt.hDt} onChange={function(e){uO("hDt",+e.target.value);}}/></div>
          </>
        )}
      </div>
      <div style={{marginBottom:8}}>
        <div style={{fontSize:12,color:"#D4A843",marginBottom:4,fontWeight:600}}>OUTFALLS ({nOut} seleccionados) — marque los nodos de descarga:</div>
        <div style={{maxHeight:130,overflowY:"auto",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:2}}>
          {nodeList.map(function(n){var isOut=Object.keys(outfalls).length===0?(libroKeys.length>0?!!libroOutfalls[n]:n===lastA):!!outfalls[n];
            return <label key={n} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,cursor:"pointer",padding:"2px 4px",background:isOut?"#1A2A15":"transparent",borderRadius:2}}>
              <input type="checkbox" checked={isOut} onChange={function(e){uOut(n,e.target.checked);}} style={{cursor:"pointer"}}/>
              <span style={{color:isOut?"#8FD67A":"#7088A8"}}>{nodes[n]?nodes[n].name:n}</span>
            </label>;
          })}
        </div>
      </div>
      <div className="f" style={{marginBottom:8}}><label>Coordenadas</label><input readOnly value={Object.keys(nodes).length>0?Object.keys(nodes).length+" nodos XY (Filtrados)":"Esquematicas"} style={{background:"#151D30",border:"1px solid #1C2E4A",borderRadius:3,padding:"5px 7px",color:"#7088A8",fontSize:14,width:"100%"}}/></div>
      <div style={{display:"flex", gap:10, flexWrap: "wrap"}}>
        <button className="btn" onClick={generateINP} style={{flex:1,fontSize:14,padding:"10px",background:"linear-gradient(135deg,#00A6D6,#007bb5)",color:"#fff",fontWeight:600}}>Generar .INP</button>
        <button className="btn" onClick={() => {if(refINP.current) refINP.current.click();}} style={{flex:1,fontSize:14,padding:"10px",background:"linear-gradient(135deg,#D4A843,#B28828)",color:"#111",fontWeight:600}}>
          Cargar Proyecto .INP
        </button>
        <button className="btn" onClick={() => {if(refExcel.current) refExcel.current.click();}} style={{flex:1,fontSize:14,padding:"10px",background:"linear-gradient(135deg,#4CAF50,#388E3C)",color:"#fff",fontWeight:600}}>
          Cargar Lluvia (Excel)
        </button>
        <button className="btn" onClick={downloadRainTemplate} style={{flex:1,fontSize:14,padding:"10px",background:"linear-gradient(135deg,#0284c7,#0369a1)",color:"#fff",fontWeight:600}} title="Descarga una plantilla Excel lista con el formato exacto para cargar series de lluvia en SWMM">
          📥 Plantilla Lluvia (Excel)
        </button>
      </div>
      
      <div className="f" style={{marginTop:8}}>
        <label>Serie de Lluvia (Generador TIMESERIES):</label>
        <select className="ec" value={selectedSeries} onChange={e => setSelectedSeries(e.target.value)}>
          <option value="TS1_Default">Lluvia Constante ({opt.rainInt} mm/h)</option>
          <option value="TS1_AltBlocks">Hietograma Diseño (Bloques Alternos de IDF)</option>
          {hyetoData && Object.keys(hyetoData).map(k => <option key={k} value={k}>Excel: Serie {k}</option>)}
        </select>
      </div>

      <input ref={refExcel} type="file" accept=".xlsx,.xls" style={{display:"none"}} onChange={(e) => {
        let file = e.target.files[0];
        if(!file) return;
        let reader = new FileReader();
        reader.onload = (ev) => {
           let data = new Uint8Array(ev.target.result);
           let workbook = XLSX.read(data, {type: 'array'});
           if(workbook.SheetNames.includes("Estaciones")) {
              let rows = XLSX.utils.sheet_to_json(workbook.Sheets["Estaciones"]);
              let hyetos = {};
              rows.forEach(r => {
                 let nombre = r.Nombre || r.NOMBRE || r.nombre;
                 if(nombre) {
                    if(!hyetos[nombre]) hyetos[nombre] = [];
                    hyetos[nombre].push(r);
                 }
              });
              setHyetoData(hyetos);
              let keys = Object.keys(hyetos);
              if(keys.length > 0) setSelectedSeries(keys[0]);
              alert("Series de lluvia cargadas con éxito: " + keys.join(", "));
           } else {
              alert("El archivo no tiene la pestaña 'Estaciones'.");
           }
        };
        reader.readAsArrayBuffer(file);
        e.target.value = null;
      }}/>
      <input ref={refINP} type="file" multiple accept=".inp" style={{display:"none"}} onChange={(e) => {
        let files = e.target.files;
        if(!files || files.length === 0) return;
        let contents = [];
        let loaded = 0;
        Array.from(files).forEach((f, idx) => {
          let reader = new FileReader();
          reader.onload = (ev) => {
             contents[idx] = ev.target.result;
             loaded++;
             if(loaded === files.length && props.onLoadINP) {
                props.onLoadINP(contents);
             }
          };
          reader.readAsText(f);
        });
        e.target.value = null;
      }}/>
    </div>
    <div className="kpig" style={{marginTop:8}}><K v={nodeList.length-nOut} l="Junctions"/><K v={nOut} l="Outfalls" color="#D4A843"/><K v={dR.length} l="Conduits"/><K v={dR.filter(function(r){return(r.areaParcial||r.aT||0)>0;}).length} l="Subcatchments"/></div>
  </div>;
}

export default SwmmTab;
