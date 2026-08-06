import React, {useState, useEffect, useRef} from 'react';
import {K, SepRow, TH} from '../ui';
import * as XLSX from 'xlsx';
import {IDF, PIPES, PIPES_DB, MATERIALS} from '../constants';
import {formatDiam} from '../engine';
import {calcCantSumidero, agruparTuberias} from '../calcHelpers';
import { exportCalculos } from '../exportCalculos';

import EstructurasSeparacionTab from './EstructurasSeparacionTab';
import CalculoSumiderosTab from './CalculoSumiderosTab';


export default function CalcTab(props){
  var R=props.R||[],P=props.P||{},T=props.T||[],sT=props.sT||(function(){}),sub=props.sub||"san",setSub=props.setSub||(function(){});
  var alivData=props.alivData||[],setAlivData=props.setAlivData||(function(){});
  var sumLat=props.sumLat||[],sumTrans=props.sumTrans||[];
  var setSumLat=props.setSumLat||(function(){});
  var setSumTrans=props.setSumTrans||(function(){});
  var sumData=props.sumData||[];var setSumData=props.setSumData||(function(){});
  var estSepData=props.estSepData||{};var setEstSepData=props.setEstSepData||(function(){});
  var perfilIdx=props.perfilIdx,setPerfilIdx=props.setPerfilIdx;
  var perfilZoom=props.perfilZoom,setPerfilZoom=props.setPerfilZoom;
  var selMap=props.selMap;
  var filterSel=props.filterSel;
  var isSel=function(de,a){
    return Array.isArray(selMap) && selMap.some(function(sm){return sm && sm.de===de && sm.a===a;});
  };
  var dR=(R||[]).filter(function(r){return r && !r.sep;});
  var updSmart=function(id,k,vStr){
    sT(function(oldT){
      var n=oldT.slice();
      var i=id-1;
      if(i<0)return n;
      var t=Object.assign({},n[i]);
      if((k==="diametroCom"||k==="material") && !t.diamOrig && R[i]) {
        t.diamOrig = R[i].diamOrig || R[i].nom || t.diametroCom;
        t.matOrig = R[i].matOrig || R[i].mat || t.material;
      }
      if(k==="cotaFondoDE"){t.cotaFondo=vStr;t.cotaFondoDE=vStr;}else{t[k]=vStr;}
      var L=parseFloat(k==="longitud"?vStr:t.longitud);
      var P=parseFloat(k==="pendiente"?vStr:t.pendiente);
      var cfA=parseFloat(k==="cotaFondoA"?vStr:t.cotaFondoA);
      var cfDE=parseFloat(k==="cotaFondoDE"?vStr:(t.cotaFondoDE!=null&&t.cotaFondoDE!==""?t.cotaFondoDE:t.cotaFondo));
      if((k==="pendiente"||k==="cotaFondoDE")&&!isNaN(P)&&!isNaN(cfDE)&&!isNaN(L)&&L>0) t.cotaFondoA=(cfDE-L*(P/100)).toFixed(3);
      else if((k==="cotaFondoA"||k==="longitud")&&!isNaN(cfA)&&!isNaN(cfDE)&&!isNaN(L)&&L>0) t.pendiente=(((cfDE-cfA)/L)*100).toFixed(4);
      n[i]=t;return n;
    });
  };
  var updArea=function(id,k,vStr){
    var ti=id-1;
    sT(function(oldT){
      var n=oldT.slice();n[ti]=Object.assign({},n[ti]);
      n[ti][k]=vStr===""?null:parseFloat(vStr.replace(",","."));
      return n;
    });
  };
  /* >>> ADICIÓN v36.2: handler Aplicar Propuestos <<< */
  var handleApplyProp=function(){
    var n=T.slice();var cambios=0;
    R.forEach(function(r,ri){
      if(r.sep)return;
      if(r.reponer==="S"){
        var newDiam = r.nomProp || r.nom;
        var tItem = n[ri] || {};
        if (tItem.diametroCom !== newDiam || tItem.material !== "PVC" || tItem.nManning !== 0.01) {
          n[ri]=Object.assign({}, tItem, {
            diamOrig: tItem.diamOrig || tItem.diametroCom || r.diamOrig || r.nom,
            matOrig: tItem.matOrig || tItem.material || r.matOrig || r.mat,
            diametroCom:newDiam,
            material:"PVC",
            nManning:0.01
          });
          cambios++;
        }
      }
    });
    if(cambios>0){sT(n);}
    else{window.alert("No hay cambios por aplicar.");}
  };
  var handleRevertProp=function(){
    var n=T.slice();var cambios=0;
    R.forEach(function(r,ri){
      if(r.sep)return;
      if(r.reponer==="S"){
        var tItem = n[ri];
        if (tItem.diametroCom !== (tItem.diamOrig || r.diamOrig || r.nom) || tItem.material !== (tItem.matOrig || r.matOrig || r.mat)) {
          let diamRevert = tItem.diamOrig || r.diamOrig || r.nom;
          let matRevert = tItem.matOrig || r.matOrig || r.mat;
          n[ri]=Object.assign({},n[ri],{diametroCom:diamRevert, material:matRevert});
          if(matRevert==="GRES") n[ri].nManning = 0.014;
          else if(matRevert==="PVC") n[ri].nManning = 0.01;
          else if(matRevert==="PEAD") n[ri].nManning = 0.01;
          else n[ri].nManning = 0.013;
          cambios++;
        }
      }
    });
    if(cambios>0){sT(n);}
  };
  var handleApplySingle=function(ri,nomProp){
    var n=T.slice();
    var r = R[ri];
    var tItem = n[ri] || {};
    n[ri]=Object.assign({}, tItem, {
       diamOrig: tItem.diamOrig || tItem.diametroCom || (r ? (r.diamOrig || r.nom) : ""),
       matOrig: tItem.matOrig || tItem.material || (r ? (r.matOrig || r.mat) : ""),
       diametroCom:nomProp,
       material:"PVC",
       nManning:0.01
    });
    sT(n);
  };
  /* >>> FIN ADICIÓN v36.2 <<< */
  var handleExportCSV=function(){
    var head=["#,DE,A,L,S%,Qsan,Qpluv,Qd,n,QoDW,QoM,Q/Qo%,Y/Do%,V,Ft,Froude,Flujo,Reponer"];
    var lines=[];
    dR.forEach(function(r){lines.push([r.id,r.de,r.a,r.L,r.S,r.Qsan,r.Qpluv,r.Qd,r.n,r.Qo,r.QoM,r.QQo,r.YDo,r.V,r.Ft,r.Froude,r.flujo,r.reponer].join(","));});
    var content=head.join(",")+"\r\n"+lines.join("\r\n");
    var blob=new Blob([content],{type:"text/csv"});
    import('../utils/fileSaver').then(m => m.saveFileWithDialog(blob, "calculo_hidraulico.csv"));
  };
  var handleExportXLSX=function(){
    var wb2=XLSX.utils.book_new();
    var hdr=[["AMCaudales - DISEÑO DE ALCANTARILLADO"],[P.proyecto],[P.municipio+" - "+P.barrio],["Disenador: "+P.disenador+" | Fecha: "+P.fecha],[""]];
    var hC=hdr.concat([["#","DE","A","Qsan","Qpluv","Qd","n","Do","Diam","Mat","L","S%","Qo(DW)","Qo(M)","Q/Qo%","Y/Do%","Y(mm)","Vo","V","Ft","Froude","Flujo","Rep","D.Prop"]]);
    dR.forEach(function(r){hC.push([r.id,r.de,r.a,r.Qsan,r.Qpluv,r.Qd,r.n,r.D,r.nom,r.mat,r.L,r.S,r.Qo,r.QoM,r.QQo,r.YDo,r.Y,r.Vo,r.V,r.Ft,r.Froude,r.flujo,r.reponer,r.nomProp||""]);});
    XLSX.utils.book_append_sheet(wb2,XLSX.utils.aoa_to_sheet(hC),"3.Calculos");
    var hP=hdr.concat([["#","DE","A","CRas.DE","CRas.A","CFon.DE","CFon.A","Prof.E","Prof.S","S%","Caida"]]);
    dR.forEach(function(r){hP.push([r.id,r.de,r.a,r.crDE,r.crA,r.cfDE,r.cfA,r.profE,r.profS,r.S,r.caida]);});
    XLSX.utils.book_append_sheet(wb2,XLSX.utils.aoa_to_sheet(hP),"4.Cotas");
    var hE=hdr.concat([["#","DE","A","Le","H1","H2","HP","B","Vol","0-2.5","2.5-5",">5","RotPav","RepPav","Rep"]]);
    dR.forEach(function(r){hE.push([r.id,r.de,r.a,r.Le,r.H1,r.H2,r.HP,r.bz,r.volE,r.v025,r.v2550,r.v50p,r.rotP,r.repP,r.reponer]);});
    XLSX.utils.book_append_sheet(wb2,XLSX.utils.aoa_to_sheet(hE),"5.Cant-Excav");
    var hPz=hdr.concat([["#","Pozo","Prof","Tipo","D.Ent","D.Sal","Aflu","C.Ras","C.Fon"]]);
    var pzS={};dR.forEach(function(r){pzS[r.de]=1;pzS[r.a]=1;});
    var pi=1;Object.keys(pzS).forEach(function(n){var ent=dR.filter(function(r){return r.a===n;});var sal=dR.filter(function(r){return r.de===n;});if(ent.length>0||sal.length>0){var e=ent[0]||sal[0];hPz.push([pi++,n,e?((e.crA||e.crDE||0)-(e.cfA||e.cfDE||0)).toFixed(2):"",e?e.nom:"",sal.length>0?sal[0].nom:"",ent.length,e?(e.crA||e.crDE):"",e?(e.cfA||e.cfDE):""]);}});
    XLSX.utils.book_append_sheet(wb2,XLSX.utils.aoa_to_sheet(hPz),"6.Cant-Pozos");
    var hInfo=[["AMCaudales - INFORMACION GENERAL"],[""],["CAMPO","VALOR"],["Proyecto",P.proyecto],["Municipio",P.municipio],["Barrio",P.barrio],["Disenador",P.disenador],["Cedula",P.cedula],["Fecha",P.fecha],[""],["PARAMETROS HIDRAULICOS"],["Tipo Alcantarillado",P.tipoAlc==="S"?"Sanitario":P.tipoAlc==="P"?"Pluvial":P.tipoAlc==="C"?"Combinado":"Semi-Combinado"],["Estacion IDF",P.estacion],["Densidad (hab/ha)",P.densidad],["Consumo (L/hab/d)",P.consumo],["Coef. Retorno",P.coefRetorno],["Vel. Maxima (m/s)",P.velMaxima],["Ft Min (Pa)",P.fuerzaTractMin],["Prof. Min (m)",P.profMin||1.2],["Prof. Max (m)",P.profMax||5],[""],["EXCAVACIONES"],["% Tierra",P.porcExcTierra],["% Granular",P.porcExcGranular],["% Roca",P.porcExcRoca],["% Entibado",P.porcEntibado],["Dist. Botadero (km)",P.distBotadero],[""],["RESUMEN"],["Longitud Tuberia Nueva (m)",dR.reduce(function(s,r){return r.reponer==="S"?s+(r.L||0):s;},0).toFixed(1)],["No. Tramos",dR.length],["No. Pozos",Object.keys(function(){var ns={};dR.forEach(function(r){ns[r.de]=1;ns[r.a]=1;});return ns;}()).length],["Acometidas (total)",(P.nAcom06||0)+(P.nAcom610||0)+(P.nAcom10||0)]];
    XLSX.utils.book_append_sheet(wb2,XLSX.utils.aoa_to_sheet(hInfo),"1.InfoGeneral");
    var hT=hdr.concat([["#","Diametro","Material","Red Principal (m)","Sumideros (m)","Acometidas (m)","TOTAL (m)"]]);
    var grpX=agruparTuberias(R,null,null,P);
    grpX.forEach(function(g,i){hT.push([i+1,g.nom,"PVC",g.red,g.sum,g.acom,g.red+g.sum+g.acom]);});
    if(grpX.matDetalle)grpX.matDetalle.forEach(function(g,i){hT.push([i+1,g.nom,g.mat,g.red,0,0,g.red]);});
    XLSX.utils.book_append_sheet(wb2,XLSX.utils.aoa_to_sheet(hT),"7.Cant-Tuberias");
    var largoAco=P.largoAco||6;
    var hA=hdr.concat([["Cant. Acometidas"],["Rango","Cantidad","Long.Prom(m)","Long.Total(m)"],["0-"+largoAco+"m",P.nAcom06||0,largoAco,(P.nAcom06||0)*largoAco],[largoAco+"-"+(largoAco+4)+"m",P.nAcom610||0,largoAco+2,(P.nAcom610||0)*(largoAco+2)],[">"+(largoAco+4)+"m",P.nAcom10||0,largoAco+6,(P.nAcom10||0)*(largoAco+6)],["TOTAL",(P.nAcom06||0)+(P.nAcom610||0)+(P.nAcom10||0),"",(P.nAcom06||0)*largoAco+(P.nAcom610||0)*(largoAco+2)+(P.nAcom10||0)*(largoAco+6)],[""],["Diametro acometida:",(P.diamAcom||160)+" mm"],["Ancho anden:",P.anchoAnden||1,"m"]]);
    XLSX.utils.book_append_sheet(wb2,XLSX.utils.aoa_to_sheet(hA),"8.Cant-Acometidas");
    var hS=hdr.concat([["SUMIDEROS LATERALES"],["#","Cant","Tipo","Diam","Pozo","Long","Cim","Exc","Exc.C","TotExc","Rell","C.Pob","C.4k","A37","PDR","Cinta","Rot","Rep"]]);
    if(props.sumLat)props.sumLat.forEach(function(f,i){if(f.cant>0){var c=calcCantSumidero(f);hS.push([i+1,f.cant,f.tipo,f.diam,f.pozo,f.long,c.cim,c.exc,c.excC,c.totExc,c.rell,c.cp,c.c4,c.a37,c.pdr,c.cinta,c.rot,c.rep]);}});
    hS.push([]);hS.push(["SUMIDEROS TRANSVERSALES"]);
    hS.push(["#","Cant","Tipo","Diam","Pozo","Long","Cim","Exc","TotExc","Rell","C.Pob","C.4k","A37","PDR","Rejas","Cinta","Rot","Rep"]);
    if(props.sumTrans)props.sumTrans.forEach(function(f,i){if(f.cant>0){var c=calcCantSumidero(f);hS.push([i+1,f.cant,f.tipo,f.diam,f.pozo,f.long,c.cim,c.exc,c.totExc,c.rell,c.cp,c.c4,c.a37,c.pdr,c.rejas,c.cinta,c.rot,c.rep]);}});
    XLSX.utils.book_append_sheet(wb2,XLSX.utils.aoa_to_sheet(hS),"9.Cant-Sumideros");
    var fn=(P.barrio||"Diseno").replace(/\s+/g,"_")+"_Calculos.xlsx";
    XLSX.writeFile(wb2,fn);
  };
  var fN=function(v,d){return typeof v==='number'?v.toFixed(d):v;};
  if(!dR.length) return <div className="c"><p style={{color:"#7088A8"}}>Cargue datos</p></div>;
  /* >>> ADICIÓN v36.2: conteo de propuestas diferentes <<< */
  var nPropDiff=0; var nRevertDiff=0;
  dR.forEach(function(r){
    var tItem = T[r.id - 1] || {};
    var currentNom = tItem.diametroCom || r.nom;
    if(r.nomProp&&r.nomProp!==currentNom&&r.reponer==="S")nPropDiff++;
    if(tItem.diametroCom !== (tItem.diamOrig || r.diamOrig || r.nom) || tItem.material !== (tItem.matOrig || r.matOrig || r.mat)) nRevertDiff++;
  });
  /* >>> FIN ADICIÓN v36.2 <<< */
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
      <div className="stabs">
        {[["san","1.Sanitario"],["plu","2.Pluvial"],["aliv","3.Aliviadero"],["hid","4.Hidraulica"],["prof","5.Cotas"],["ver","6.Verific"],["perfil","7.Perfil"],["sep","8. Est. Separación"],["calc_sum","9. Calc. Sumideros"]].map(function(x){
          return <button key={x[0]} className={"stab"+(sub===x[0]?" a":"")} onClick={function(){setSub(x[0]);}}>{x[1]}</button>;
        })}
      </div>
      <div style={{display:"flex",gap:3}}>
        <div style={{display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.05)",padding:"4px 10px",borderRadius:20,marginRight:10,border:"1px solid rgba(255,255,255,0.1)"}} title="Selecciona la fórmula a usar para capacidad (Q/Qo%) y velocidades">
          <span style={{fontSize:11,color:P.formulaQo==="M"?"#475569":"#8FD67A",fontWeight:P.formulaQo==="M"?400:700}}>Darcy-Weisbach</span>
          <div style={{width:36,height:20,background:P.formulaQo==="M"?"#00A6D6":"#1A6B2C",borderRadius:10,position:"relative",cursor:"pointer",boxShadow:"inset 0 1px 3px rgba(0,0,0,0.3)"}} onClick={function(){props.setP(Object.assign({},P,{formulaQo:P.formulaQo==="M"?"D":"M"}));}}>
            <div style={{width:16,height:16,background:"#fff",borderRadius:"50%",position:"absolute",top:2,left:P.formulaQo==="M"?18:2,transition:"all 0.2s"}}/>
          </div>
          <span style={{fontSize:11,color:P.formulaQo==="M"?"#00A6D6":"#475569",fontWeight:P.formulaQo==="M"?700:400}}>Manning</span>
        </div>
        {/* >>> ADICIÓN v36.2: botón Aplicar Propuestos <<< */}
        {nPropDiff>0?<button className="btn" onClick={handleApplyProp} style={{fontSize:11,padding:"4px 8px",background:"linear-gradient(135deg,#D4A843,#B8922E)"}} title={"Aplicar "+nPropDiff+" diametros propuestos PVC"}>Aplicar D.Prop ({nPropDiff})</button>:null}
        {nRevertDiff>0?<button className="btn" onClick={handleRevertProp} style={{fontSize:11,padding:"4px 8px",background:"linear-gradient(135deg,#DC3545,#A71D2A)"}} title="Revertir todos los aplicados a su estado original (D.Actual)">Revertir a D.Actual ({nRevertDiff})</button>:null}
        {/* >>> FIN ADICIÓN v36.2 <<< */}
        <button className="btn" onClick={() => exportCalculos(P, R, sub, alivData)} style={{fontSize:11,padding:"4px 8px",background:"linear-gradient(135deg,#00A6D6,#003B73)", color:"white"}}>Excel Diseño (Oficial)</button>
        <button className="btn" onClick={handleExportCSV} style={{fontSize:11,padding:"4px 8px"}}>CSV</button>
        <button className="btn" onClick={handleExportXLSX} style={{fontSize:11,padding:"4px 8px",marginLeft:3,background:"linear-gradient(135deg,#28A745,#1A6B2C)"}}>XLSX (Crudo)</button>
      </div>
    </div>
    <div style={{fontSize:12,color:"#8FD67A",marginBottom:4}}>Celdas verdes = editables</div>
    {(sub==="san" || props.isExport)?<div className={"c" + (props.isExport?" print-page-break":"")}><div className="ct">Caudal Sanitario</div><div style={{overflowX:"auto",maxHeight:"60vh",overflowY:"auto"}}><table><thead><tr>
      <TH>#</TH><TH>DE</TH><TH className="col-sep">A</TH><TH>Dens</TH><TH>Cons</TH><TH>A.Res (P|Ac)</TH><TH>A.Com (P|Ac)</TH><TH>A.Ind (P|Ac)</TH><TH className="col-sep">A.Inst (P|Ac)</TH><TH>Pob</TH><TH>Qmed</TH><TH>F</TH><TH className="col-sep">Qmax</TH><TH>Qi</TH><TH className="col-sep">Qe</TH><TH className="hl-san-hdr">Qsan</TH>
    </tr></thead><tbody>
      {R.map(function(r){var h=isSel(r.de, r.a); if(filterSel && (!h || r.sep)) return null; if(r.sep)return <SepRow key={r.id} cols={16}/>; return <tr key={r.id} className={h?"hl-row":""}><td>{r.id}</td><td style={{textAlign:"left",fontSize:13}}>{r.de}</td><td className="col-sep" style={{textAlign:"left",fontSize:13}}>{r.a}</td><td>{r.den}</td><td>{r.con}</td>
      <td style={{whiteSpace:"nowrap"}}><input className="ec" type="text" value={r.aR_p!=null?r.aR_p:""} onChange={function(e){updArea(r.id,"aR_prop",e.target.value);}} style={{width:48,fontSize:10,padding:2,display:"inline-block"}}/> <span style={{fontSize:10,color:"#7088A8",marginLeft:4,display:"inline-block",width:40,textAlign:"left"}}>{fN(r.aR,3)}</span></td>
      <td style={{whiteSpace:"nowrap"}}><input className="ec" type="text" value={r.aC_p!=null?r.aC_p:""} onChange={function(e){updArea(r.id,"aC_prop",e.target.value);}} style={{width:48,fontSize:10,padding:2,display:"inline-block"}}/> <span style={{fontSize:10,color:"#7088A8",marginLeft:4,display:"inline-block",width:40,textAlign:"left"}}>{fN(r.aC,3)}</span></td>
      <td style={{whiteSpace:"nowrap"}}><input className="ec" type="text" value={r.aI_p!=null?r.aI_p:""} onChange={function(e){updArea(r.id,"aI_prop",e.target.value);}} style={{width:48,fontSize:10,padding:2,display:"inline-block"}}/> <span style={{fontSize:10,color:"#7088A8",marginLeft:4,display:"inline-block",width:40,textAlign:"left"}}>{fN(r.aI,3)}</span></td>
      <td className="col-sep" style={{whiteSpace:"nowrap"}}><input className="ec" type="text" value={r.aIn_p!=null?r.aIn_p:""} onChange={function(e){updArea(r.id,"aIn_prop",e.target.value);}} style={{width:48,fontSize:10,padding:2,display:"inline-block"}}/> <span style={{fontSize:10,color:"#7088A8",marginLeft:4,display:"inline-block",width:40,textAlign:"left"}}>{fN(r.aIn,3)}</span></td>
      <td>{r.pob}</td><td>{fN(r.Qmed,2)}</td><td>{fN(r.Fm,2)}</td><td className="col-sep">{fN(r.Qmx,2)}</td><td>{fN(r.Qi,2)}</td><td className="col-sep">{fN(r.Qe,2)}</td><td className="hl-main">{fN(r.Qsan,2)}</td></tr>;})}
    </tbody></table></div></div>:null}
    {(sub==="plu" || props.isExport)?<div className={"c" + (props.isExport?" print-page-break":"")}><div className="ct">Caudal Pluvial - Estación: {IDF[P.estacion]?.name || P.estacion || "BUC"}</div><div style={{overflowX:"auto",maxHeight:"60vh",overflowY:"auto"}}><table><thead><tr>
      <TH>#</TH><TH>DE</TH><TH className="col-sep">A</TH><TH>A.Res (P|Ac)</TH><TH>A.Via (P|Ac)</TH><TH>A.Rec (P|Ac)</TH><TH className="col-sep">A.Tot</TH><TH>C</TH><TH>Tc</TH><TH>Tr</TH><TH className="col-sep">I</TH><TH className="hl-plu-hdr">Qpluv</TH>
    </tr></thead><tbody>
      {R.map(function(r){var h=isSel(r.de, r.a); if(filterSel && (!h || r.sep)) return null; if(r.sep)return <SepRow key={r.id} cols={12}/>; return <tr key={r.id} className={h?"hl-row":""}><td>{r.id}</td><td style={{textAlign:"left",fontSize:13}}>{r.de}</td><td className="col-sep" style={{textAlign:"left",fontSize:13}}>{r.a}</td>
      <td style={{whiteSpace:"nowrap"}}><input className="ec" type="text" value={r.aR_p!=null?r.aR_p:""} onChange={function(e){updArea(r.id,"aR_prop",e.target.value);}} style={{width:48,fontSize:10,padding:2,display:"inline-block"}}/> <span style={{fontSize:10,color:"#7088A8",marginLeft:4,display:"inline-block",width:40,textAlign:"left"}}>{fN(r.aR,3)}</span></td>
      <td style={{whiteSpace:"nowrap"}}><input className="ec" type="text" value={r.aV_p!=null?r.aV_p:""} onChange={function(e){updArea(r.id,"aV_prop",e.target.value);}} style={{width:48,fontSize:10,padding:2,display:"inline-block"}}/> <span style={{fontSize:10,color:"#7088A8",marginLeft:4,display:"inline-block",width:40,textAlign:"left"}}>{fN(r.aV,3)}</span></td>
      <td style={{whiteSpace:"nowrap"}}><input className="ec" type="text" value={r.aRe_p!=null?r.aRe_p:""} onChange={function(e){updArea(r.id,"aRe_prop",e.target.value);}} style={{width:48,fontSize:10,padding:2,display:"inline-block"}}/> <span style={{fontSize:10,color:"#7088A8",marginLeft:4,display:"inline-block",width:40,textAlign:"left"}}>{fN(r.aRe,3)}</span></td>
      <td className="col-sep">{fN(r.aT,3)}</td><td>{fN(r.Cw,2)}</td><td>{fN(r.Tc,2)}</td><td>{fN(r.Fr,2)}</td><td className="col-sep">{fN(r.I,2)}</td><td className="hl-plu-cell">{fN(r.Qpluv,2)}</td></tr>;})}
    </tbody></table></div></div>:null}
    {(sub==="aliv" || props.isExport)?<div className={"c" + (props.isExport?" print-page-break":"")}><div className="ct">Aliviadero / Estructura de Separacion</div>
      <div style={{fontSize:12,color:"#8FD67A",marginBottom:6}}>Aliviar="S": Qd = Qpluv - 5*QMD. QMD viene del calculo sanitario.</div>
      <div style={{overflowX:"auto",maxHeight:"55vh",overflowY:"auto"}}><table><thead><tr>
        <TH>#</TH><TH>DE</TH><TH className="col-sep">A</TH><TH className="hl-san-hdr">Qsan</TH><TH className="col-sep hl-plu-hdr">Qpluv</TH><TH>Aliv</TH><TH>QMD</TH><TH className="col-sep">5xQMD</TH><TH className="hl-hid-hdr">Qd.Aliv</TH>
      </tr></thead><tbody>
        {dR.map(function(r,ri){
          var h=isSel(r.de, r.a);
          if(filterSel && !h) return null;
          var al=alivData[ri]||{aliviar:"N",qmd:0,f5:0};
          var qmd=al.qmd>0?+al.qmd.toFixed(2):+(r.Qmed||r.Qsan/3.5||0).toFixed(2);
          var f5=al.f5>0?+al.f5.toFixed(2):+(qmd*5).toFixed(2);
          var qdA=al.aliviar==="S"?+Math.max(0,r.Qpluv-f5).toFixed(2):r.Qd;
      return <tr key={r.id} className={h?"hl-row":""}><td>{r.id}</td><td style={{textAlign:"left",fontSize:12}}>{r.de}</td><td className="col-sep" style={{textAlign:"left",fontSize:12}}>{r.a}</td>
            <td className="hl-main">{fN(r.Qsan,2)}</td><td className="col-sep hl-plu-cell">{fN(r.Qpluv,2)}</td>
            <td><select className="es" value={al.aliviar||"N"} onChange={function(e){var n=alivData.slice();while(n.length<=ri)n.push({aliviar:"N",qmd:0,f5:0});n[ri]=Object.assign({},n[ri],{aliviar:e.target.value});setAlivData(n);}}><option>N</option><option>S</option></select></td>
            <td>{al.aliviar==="S"?<input className="ec" type="number" step=".01" value={qmd} onChange={function(e){var n=alivData.slice();while(n.length<=ri)n.push({aliviar:"N",qmd:0,f5:0});n[ri]=Object.assign({},n[ri],{qmd:+e.target.value});setAlivData(n);}} style={{width:60,fontSize:11,padding:2}}/>:<span style={{color:"#555"}}>-</span>}</td>
            <td className="col-sep">{al.aliviar==="S"?<input className="ec" type="number" step=".01" value={f5} onChange={function(e){var n=alivData.slice();while(n.length<=ri)n.push({aliviar:"N",qmd:0,f5:0});n[ri]=Object.assign({},n[ri],{f5:+e.target.value});setAlivData(n);}} style={{width:60,fontSize:11,padding:2}}/>:<span style={{color:"#555"}}>-</span>}</td>
            <td style={{fontWeight:700,color:al.aliviar==="S"?"#8FD67A":"#7088A8",background:al.aliviar==="S"?"rgba(40,167,69,0.08)":"transparent",fontSize:14}}>{qdA}</td>
          </tr>;
        })}
      </tbody></table></div>
    </div>:null}
        {(sub==="hid" || props.isExport)?<div className={"c" + (props.isExport?" print-page-break":"")}><div className="ct">Hidraulica <span style={{marginLeft:15, fontSize:12, background:'#003B73', color:'white', padding:'2px 8px', borderRadius:10}}>Estación de Cálculo: {P.estacion||"BUC"}</span></div><div style={{overflowX:"auto",maxHeight:"60vh",overflowY:"auto"}}><table><thead><tr>
      <TH>#</TH><TH>DE</TH><TH>A</TH><TH className="gh">Mat</TH><TH style={{fontSize:10,color:"#7088A8"}}>Cat</TH><TH className="gh">Diam</TH><TH>Di</TH>
      {/* >>> ADICIÓN v36.2: columna D.Prop llamativa <<< */}
      <TH style={{background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#000000', fontSize: '12px', fontWeight: '900', padding: '6px 10px', borderRadius: '6px', boxShadow: '0 0 12px rgba(245, 158, 11, 0.6)', border: '1px solid #fcd34d', letterSpacing: '0.05em'}}>★ D.Prop</TH>
      {/* >>> FIN ADICIÓN v36.2 <<< */}
      <TH className="gh">L(m)</TH><TH className="gh">P(%)</TH><TH>Qsan</TH><TH>Qplu</TH><TH>Qd</TH><TH>n</TH><TH style={{color:P.formulaQo==="M"?"#475569":""}}>Qo(DW)</TH><TH style={{color:P.formulaQo==="M"?"":"#475569"}}>Qo(M)</TH><TH>Q/Qo%</TH><TH>Y/Do%</TH><TH>V/Vo</TH><TH>Y(mm)</TH><TH>V</TH><TH>Ft</TH><TH>Fr</TH><TH title="Diámetro de Boquilla (mm) para reducir Hw en diseño">Boq(mm)</TH><TH title="Longitud de Boquilla en metros (6 * Diámetro)">L.Boq</TH><TH>Hw</TH><TH>vV</TH><TH>vFt</TH><TH>vQ</TH>
    </tr></thead><tbody>
      {R.map(function(r,ri){
      var h=isSel(r.de, r.a);
      if(filterSel && (!h || r.sep)) return null;
      if(r.sep)return <SepRow key={r.id} cols={26}/>;
      /* >>> ADICIÓN v36.2: lógica color D.Prop llamativo <<< */
      var tItem = T[r.id - 1] || {};
      var currentNom = tItem.diametroCom || r.nom;
      var propIsDiff=r.nomProp&&r.nomProp!==currentNom&&r.reponer==="S";
      var propColor=propIsDiff?"#fef08a":"#34d399";
      var propBg=propIsDiff?"rgba(245, 158, 11, 0.35)":"rgba(16, 185, 129, 0.15)";
      var propBorder=propIsDiff?"1px solid #f59e0b":"1px solid rgba(16, 185, 129, 0.4)";
      /* >>> FIN ADICIÓN v36.2 <<< */
      var h_pozo_DE = parseFloat(tItem.cotaRasanteDE || r.crDE) - parseFloat(tItem.cotaFondoDE != null && tItem.cotaFondoDE !== "" ? tItem.cotaFondoDE : (tItem.cotaFondo != null && tItem.cotaFondo !== "" ? tItem.cotaFondo : (r.cfDE || 0)));
      var isHNivel = !isNaN(h_pozo_DE) && (parseFloat(r.Hw) > h_pozo_DE);
      var diamVal = parseFloat(tItem.diametroCom || r.diamOrig || 0);
      var lBoq = (diamVal / 1000 * 6).toFixed(2);
      
      var roughness = tItem.nManning || r.n;
      var displayedMaterial = tItem.material;
      if (!displayedMaterial || (displayedMaterial === "PVC" && roughness >= 0.013)) {
        displayedMaterial = roughness >= 0.013 ? "CONCRETO" : "PVC";
      }
      var pipeOptions = PIPES_DB[displayedMaterial] || PIPES;

      return <tr key={r.id} className={h?"hl-row":""}>
        <td>{r.id}</td><td style={{textAlign:"left",fontSize:13}}>{r.de}</td><td style={{textAlign:"left",fontSize:13}}>{r.a}</td>
        <td>
          <select className="es" value={displayedMaterial} onChange={function(e){var v=e.target.value; updSmart(r.id,"material",v); updSmart(r.id,"nManning",v.includes("PVC")?0.01:v.includes("GRES")?0.014:v.includes("PEAD")?0.01:0.013);}}>{MATERIALS.map(function(m){return <option key={m}>{m}</option>;})}</select>
        </td>
        <td style={{fontSize:10,color:"#7088A8"}}>{r.matOrig||r.mat}</td>
        <td><select className="es" value={formatDiam(tItem.diametroCom||"315 mm", displayedMaterial)} onChange={function(e){updSmart(r.id,"diametroCom",e.target.value);}}>{pipeOptions.map(function(p){return <option key={p.id||p.nom} value={p.nom}>{p.nom}</option>;})}</select></td>
        <td title={r.nom}>{r.D}</td>
        {/* >>> ADICIÓN v36.2: celda D.Prop con click para aplicar individual y estilo llamativo <<< */}
        <td style={{background:propBg,color:propColor,border:propBorder,fontWeight:900,fontSize:13,cursor:propIsDiff?"pointer":"default",textAlign:"center",borderRadius:6,padding:"4px 6px",boxShadow:propIsDiff?"0 0 10px rgba(245,158,11,0.4)":"none"}} title={propIsDiff?"Click para aplicar "+r.nomProp:"Cumple con "+currentNom} onClick={function(){if(propIsDiff)handleApplySingle(ri,r.nomProp);}}>{formatDiam(r.nomProp||"-", displayedMaterial)}{propIsDiff?" ↑":""}</td>
        {/* >>> FIN ADICIÓN v36.2 <<< */}
        <td><input className="ec" type="text" value={tItem.longitud||""} onChange={function(e){updSmart(r.id,"longitud",e.target.value.replace(",","."));}} style={{width:60,fontSize:12,padding:3}}/></td>
        <td><input className="ec" type="text" value={tItem.pendiente||""} onChange={function(e){updSmart(r.id,"pendiente",e.target.value.replace(",","."));}} style={{width:55,fontSize:12,padding:3}}/></td>
        <td>{fN(r.Qsan,2)}</td><td>{fN(r.Qpluv,2)}</td><td style={{fontWeight:700,color:r.aliviado?"#8FD67A":"#D4A843"}}>{r.Qd}{r.aliviado?" *":""}</td>
        <td>{r.n}</td><td style={{color:P.formulaQo==="M"?"#475569":""}}>{r.Qo}</td><td style={{color:P.formulaQo==="M"?"":"#475569"}}>{r.QoM}</td><td>{r.QQo}</td><td>{r.YDo}</td><td>{r.VVo}</td><td>{r.Y}</td><td>{r.V}</td><td>{r.Ft}</td><td>{r.Froude}</td><td><input className="ec" type="text" value={tItem.boquilla||""} onChange={function(e){updSmart(r.id,"boquilla",e.target.value.replace(",","."));}} style={{width:45,fontSize:11,padding:2}} placeholder="mm"/></td><td>{lBoq}</td><td style={{color:isHNivel?"#ff4444":"#00A6D6",fontWeight:700,background:isHNivel?"rgba(255,68,68,0.1)":"transparent"}} title={isHNivel?"HNivel (Hw > altura de pozo inicial DE)":""}>{r.Hw}{isHNivel?" ⚠️":""}</td>
        <td><span className={r.okV?"ok":"fl"}>{r.okV?"v":"x"}</span></td>
        <td><span className={r.okFt?"ok":"fl"}>{r.okFt?"v":"x"}</span></td>
        <td><span className={r.okQ?"ok":"fl"}>{r.okQ?"v":"x"}</span></td>
      </tr>;})}
    </tbody></table></div></div>:null}
    {(sub==="prof" || props.isExport)?function(){var cfAMap={};dR.forEach(function(r){if(!cfAMap[r.a])cfAMap[r.a]=[];cfAMap[r.a].push(r.cfA);});var contMap={};dR.forEach(function(r){var prev=cfAMap[r.de];contMap[r.id]=prev?Math.abs(Math.min.apply(null,prev)-r.cfDE)<0.01:"--";});return <div className={"c" + (props.isExport?" print-page-break":"")}><div className="ct">Cotas y Profundidades</div><div style={{overflowX:"auto",maxHeight:"60vh",overflowY:"auto"}}><table><thead><tr>
      <TH>#</TH><TH>DE</TH><TH>A</TH><TH>CRas.DE</TH><TH>CRas.A</TH><TH className="gh">CFon.DE</TH><TH className="gh">CFon.A</TH><TH>Prof.E</TH><TH>Prof.S</TH><TH>S%</TH><TH>Caida</TH><TH>TrRec</TH><TH>Fr</TH><TH>Flujo</TH><TH>Cont.</TH>
    </tr></thead><tbody>
      {R.map(function(r,ri){var h=isSel(r.de, r.a); if(filterSel && (!h || r.sep)) return null; if(r.sep)return <SepRow key={r.id} cols={15}/>; var tItem = T[r.id - 1] || {}; return <tr key={r.id} className={h?"hl-row":""}><td>{r.id}</td>
        <td style={{textAlign:"left",fontSize:13}}>{r.de}</td><td style={{textAlign:"left",fontSize:13}}>{r.a}</td>
        <td>{r.crDE}</td><td>{r.crA}</td>
        <td><input className="ec" type="text" value={(tItem.cotaFondoDE != null && tItem.cotaFondoDE !== "" ? tItem.cotaFondoDE : (tItem.cotaFondo != null && tItem.cotaFondo !== "" ? tItem.cotaFondo : (r.cfDE || "")))} onChange={function(e){updSmart(r.id,"cotaFondoDE",e.target.value.replace(",","."));}} style={{width:75,fontSize:12,padding:3}}/></td>
        <td><input className="ec" type="text" value={(tItem.cotaFondoA != null && tItem.cotaFondoA !== "" ? tItem.cotaFondoA : (tItem.cfA != null && tItem.cfA !== "" ? tItem.cfA : (r.cfA || "")))} onChange={function(e){updSmart(r.id,"cotaFondoA",e.target.value.replace(",","."));}} style={{width:75,fontSize:12,padding:3}}/></td>
        <td>{r.profE}</td><td>{r.profS}</td><td>{r.S}</td><td>{r.caida}</td><td>{r.TrRec}</td><td>{r.Froude}</td>
        <td style={{textAlign:"left",fontSize:12,color:r.flujo==="Sub"?"#28A745":(r.flujo==="Sup"?"#DC3545":"#F0932B")}}>{r.flujo}</td>
        <td style={{color:contMap[r.id]===true?"#28A745":contMap[r.id]===false?"#DC3545":"#555",fontWeight:contMap[r.id]===false?700:400}}>{contMap[r.id]===true?"OK":contMap[r.id]===false?"!":"-"}</td>
      </tr>;})}
    </tbody></table></div></div>;}():null}
    {(sub==="ver" || props.isExport)?<div className={props.isExport?"print-page-break":""}>
      <div className="kpig" style={{marginBottom:8}}>
        <K v={dR.filter(function(r){return r.okV;}).length+"/"+dR.length} l="Velocidad" u={"<="+P.velMaxima+"m/s"} color={dR.every(function(r){return r.okV;})?"#28A745":"#DC3545"}/>
        <K v={dR.filter(function(r){return r.okFt;}).length+"/"+dR.length} l="Fza.Tractiva" u={">="+P.fuerzaTractMin+" Pa"} color={dR.every(function(r){return r.okFt;})?"#28A745":"#DC3545"}/>
        <K v={dR.filter(function(r){return r.okQ;}).length+"/"+dR.length} l="Q/Qo" u={"<="+(P.relCapacidad*100)+"%"} color={dR.every(function(r){return r.okQ;})?"#28A745":"#DC3545"}/>
        <K v={dR.filter(function(r){return r.okY;}).length+"/"+dR.length} l="Y/Do" u={"<="+(P.porcProfundidad*100)+"%"} color={dR.every(function(r){return r.okY;})?"#28A745":"#DC3545"}/>
        <K v={dR.filter(function(r){return r.okFr;}).length+"/"+dR.length} l="Froude" u={"Sub/Sup"} color={dR.every(function(r){return r.okFr;})?"#28A745":"#F0932B"}/>
        <K v={dR.filter(function(r){return r.okProf;}).length+"/"+dR.length} l="Prof Min/Max" u={(P.profMin||1.2)+"~"+(P.profMax||5)+"m"} color={dR.every(function(r){return r.okProf;})?"#28A745":"#DC3545"}/>
      </div>
      {/* >>> ADICIÓN v36.2: resumen de diámetros propuestos en verificaciones <<< */}
      {nPropDiff>0?<div className="c" style={{borderTop:"3px solid #D4A843",marginBottom:8}}><div className="ct" style={{color:"#D4A843"}}>Diametros Propuestos ({nPropDiff} cambios)</div><div style={{overflowX:"auto",maxHeight:"30vh",overflowY:"auto"}}><table><thead><tr>
        <TH>#</TH><TH>DE</TH><TH>A</TH><TH>D.Actual</TH><TH>D.Propuesto</TH><TH>Qd</TH><TH>Q/Qo%</TH>
      </tr></thead><tbody>
        {dR.filter(function(r,ri){
          var origRi = R.findIndex(function(or){return or.id===r.id;});
          var currentNom = (origRi >= 0 && T[origRi] && T[origRi].diametroCom) ? T[origRi].diametroCom : r.nom;
          var isDiff = r.nomProp&&r.nomProp!==currentNom&&r.reponer==="S";
          var h=isSel(r.de, r.a);
          if(filterSel && !h) return false;
          return isDiff;
        }).map(function(r){
          var origRi = R.findIndex(function(or){return or.id===r.id;});
          var currentNom = (origRi >= 0 && T[origRi] && T[origRi].diametroCom) ? T[origRi].diametroCom : r.nom;
          var h=isSel(r.de, r.a);
      return <tr key={r.id} className={h?"hl-row":""}><td>{r.id}</td><td style={{textAlign:"left",fontSize:12}}>{r.de}</td><td style={{textAlign:"left",fontSize:12}}>{r.a}</td>
            <td style={{color:"#DC3545"}}>{currentNom}</td>
            <td style={{color:"#28A745",fontWeight:700}}>{r.nomProp}</td>
            <td>{r.Qd}</td><td>{r.QQo}</td>
          </tr>;
        })}
      </tbody></table></div>
      <button className="btn" onClick={handleApplyProp} style={{fontSize:12,padding:"6px 12px",marginTop:6,background:"linear-gradient(135deg,#D4A843,#B8922E)"}}>Aplicar Todos los Propuestos</button>
      </div>:null}
      {/* >>> FIN ADICIÓN v36.2 <<< */}
      {dR.filter(function(r){return !r.okV||!r.okFt||!r.okQ||!r.okY||!r.okFr||!r.okProf;}).length>0?<div className="c" style={{borderTop:"3px solid #DC3545"}}><div className="ct" style={{color:"#DC3545"}}>Tramos con Alertas</div><div style={{overflowX:"auto",maxHeight:"50vh",overflowY:"auto"}}><table><thead><tr>
        <TH>#</TH><TH>DE</TH><TH>A</TH><TH>Diam</TH><TH>V</TH><TH>Ft</TH><TH>Q/Qo%</TH><TH>Y/Do%</TH><TH>Fr</TH><TH>Alerta</TH>
      </tr></thead><tbody>
        {dR.filter(function(r){return !r.okV||!r.okFt||!r.okQ||!r.okY||!r.okFr||!r.okProf;}).map(function(r){
          var al=[];if(!r.okV)al.push("V");if(!r.okFt)al.push("Ft");if(!r.okQ)al.push("Q/Qo");if(!r.okY)al.push("Y/Do");if(!r.okFr)al.push("Fr");if(!r.okProf)al.push("Prof");
          var h=selMap&&selMap.some(function(sm){return sm&&sm.de===r.de&&sm.a===r.a;});
          if(filterSel && !h) return null;
      return <tr key={r.id} className={h?"hl-row":""}><td>{r.id}</td><td style={{textAlign:"left",fontSize:12}}>{r.de}</td><td style={{textAlign:"left",fontSize:12}}>{r.a}</td><td>{r.nom}</td>
            <td style={{color:r.okV?"#28A745":"#DC3545",fontWeight:600}}>{r.V}</td>
            <td style={{color:r.okFt?"#28A745":"#DC3545",fontWeight:600}}>{r.Ft}</td>
            <td style={{color:r.okQ?"#28A745":"#DC3545",fontWeight:600}}>{r.QQo}</td>
            <td style={{color:r.okY?"#28A745":"#DC3545",fontWeight:600}}>{r.YDo}</td>
            <td style={{color:r.okFr?"#28A745":"#DC3545",fontWeight:600}}>{r.Froude}</td>
            <td style={{textAlign:"left",color:"#DC3545",fontSize:12,fontWeight:600}}>{al.join(", ")}</td>
          </tr>;
        })}
      </tbody></table></div></div>:<div className="c" style={{borderTop:"3px solid #28A745",textAlign:"center",padding:20}}><div style={{fontSize:18,fontWeight:700,color:"#28A745"}}>TODOS LOS TRAMOS CUMPLEN</div><div style={{fontSize:13,color:"#7088A8",marginTop:4}}>Verificaciones hidraulicas OK</div></div>}
    </div>:null}
    {(sub==="perfil" || props.isExport)?function(){
      if(dR.length<1)return <div className="c"><p style={{color:"#7088A8"}}>Minimo 1 tramo necesario</p></div>;
      /* >>> ADICIÓN v36.5: identificar colectores desde cabeceras <<< */
      var adjMap={};dR.forEach(function(r){adjMap[r.de]=r;});
      var allA={};dR.forEach(function(r){allA[r.a]=1;});
      var cabeceras=[];dR.forEach(function(r){if(!allA[r.de])cabeceras.push(r.de);});
      if(cabeceras.length===0)cabeceras.push(dR[0].de);
      var colectores=[];
      cabeceras.forEach(function(cab){
        var chain2=[];var cur2=adjMap[cab];var vis2={};
        while(cur2&&!vis2[cur2.id]){vis2[cur2.id]=1;chain2.push(cur2);cur2=adjMap[cur2.a];}
        if(chain2.length>=1)colectores.push({cab:cab,chain:chain2,len:chain2.reduce(function(s,r){return s+(r.L||0);},0)});
      });
      colectores.sort(function(a,b){return b.len-a.len;});
      /* >>> FIN ADICIÓN v36.5 <<< */

      if (props.selMap && props.selMap.length > 0) {
        var selItems = props.selMap.filter(function(x){return x;});
        if (selItems.length > 0) {
          var customChain = [];
          selItems.forEach(function(x){
              var xDe = String(x.de || x.DE1 || x.DE || "").trim().toLowerCase();
              var xA = String(x.a || x.A1 || x.A || "").trim().toLowerCase();
              var match = dR.find(function(r){
                  return String(r.de).trim().toLowerCase() === xDe && String(r.a).trim().toLowerCase() === xA;
              });
              if(match) customChain.push(match);
          });
          if (customChain.length > 0) {
            // Sort topologically from upstream to downstream
            var deMap = {};
            customChain.forEach(function(r){ deMap[r.de] = r; });
            var allA = {};
            customChain.forEach(function(r){ allA[r.a] = 1; });
            var startNode = customChain[0].de;
            customChain.forEach(function(r){
              if (!allA[r.de]) startNode = r.de; // Find the true upstream node
            });
            var sortedChain = [];
            var cur = deMap[startNode];
            var vis = {};
            while(cur && !vis[cur.id]) {
              vis[cur.id] = 1;
              sortedChain.push(cur);
              cur = deMap[cur.a];
            }
            // Fallback: if not fully connected, just append the rest
            customChain.forEach(function(r){
              if(!vis[r.id]) { vis[r.id] = 1; sortedChain.push(r); }
            });
            customChain = sortedChain;

            colectores.unshift({
              cab: "RUTA PERSONALIZADA (Selección Visor)",
              chain: customChain,
              len: customChain.reduce(function(s,r){return s+(r.L||0);},0)
            });
          }
        }
      }

      var selIdx=props.perfilIdx||0;
      if(selIdx>=colectores.length)selIdx=0;
      var chain=colectores.length>0?colectores[selIdx].chain:dR.slice(0,Math.min(dR.length,30));
      var xAcc=0;var pts=[];
      chain.forEach(function(r,i){
        pts.push({x:xAcc,crDE:r.crDE,cfDE:r.cfDE,de:r.de,D:r.D,nom:r.nom,L:r.L,mat:r.mat,profE:r.profE,profS:r.profS,S:r.S,V:r.V,Qd:r.Qd,QQo:r.QQo});
        xAcc+=r.L||10;
        if(i===chain.length-1)pts.push({x:xAcc,crDE:r.crA,cfDE:r.cfA,de:r.a,D:r.D,nom:"",L:0});
      });
      var xMax=xAcc||100;
      var allY=pts.map(function(p){return parseFloat(p.crDE);}).concat(pts.map(function(p){return parseFloat(p.cfDE);})).filter(function(v){return !isNaN(v);});
      var yMin=(allY.length>0?Math.min.apply(null,allY):0)-1;var yMax=(allY.length>0?Math.max.apply(null,allY):10)+1;var yR=yMax-yMin||1;
      /* >>> ADICIÓN v36.6: zoom para perfil <<< */
      var zoomLvl=props.perfilZoom||1;
      var W=Math.round(900*zoomLvl);var H=Math.round(380*zoomLvl);var mL=60;var mR=20;var mT=20;var mB=80;
      /* >>> FIN ADICIÓN v36.6 <<< */
      var pw=W-mL-mR;var ph=H-mT-mB;
      var sx=function(v){
        var val=parseFloat(v);if(isNaN(val))val=0;
        return mL+(xMax>0?(val/xMax)*pw:0);
      };
      var sy=function(v){
        var val=parseFloat(v);if(isNaN(val))val=yMin;
        return mT+(yR>0?((yMax-val)/yR)*ph:0);
      };
      var terr="M"+pts.map(function(p){return sx(p.x)+","+sy(p.crDE);}).join(" L");
      var bat="M"+pts.map(function(p){return sx(p.x)+","+sy(p.cfDE);}).join(" L");
      var gridY=[];var step=yR>10?2:yR>5?1:.5;for(var gy=Math.ceil(yMin/step)*step;gy<=yMax;gy+=step)gridY.push(gy);
      var gridX=[];var stepX=xMax>500?100:xMax>200?50:xMax>100?20:10;for(var gx=0;gx<=xMax;gx+=stepX)gridX.push(gx);
      return <div className="c">
        {/* >>> ADICIÓN v36.5: selector de colector <<< */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div className="ct" style={{margin:0}}>Perfil Longitudinal ({chain.length} tramos, {xMax.toFixed(1)}m)</div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:11,color:"#7088A8"}}>Colector:</span>
            <select className="es" value={selIdx} onChange={function(e){if(props.setPerfilIdx)props.setPerfilIdx(+e.target.value);}} style={{fontSize:11,minWidth:180}}>
              {colectores.map(function(col,ci){return <option key={ci} value={ci}>{"["+ci+"] "+col.cab+" ("+col.chain.length+"tr, "+col.len.toFixed(0)+"m)"}</option>;})}
            </select>
            {/* >>> ADICIÓN v36.6: botones zoom <<< */}
            <button className="btn" onClick={function(){if(props.setPerfilZoom)props.setPerfilZoom(Math.max(0.5,(zoomLvl||1)-0.25));}} style={{fontSize:11,padding:"2px 6px",background:"#1C2E4A"}}>-</button>
            <span style={{fontSize:11,color:"#D8E2F0",minWidth:30,textAlign:"center"}}>{Math.round((zoomLvl||1)*100)+"%"}</span>
            <button className="btn" onClick={function(){if(props.setPerfilZoom)props.setPerfilZoom(Math.min(3,(zoomLvl||1)+0.25));}} style={{fontSize:11,padding:"2px 6px",background:"#1C2E4A"}}>+</button>
            <button className="btn" onClick={function(){if(props.setPerfilZoom)props.setPerfilZoom(1);}} style={{fontSize:10,padding:"2px 6px",background:"#1C2E4A"}}>100%</button>
            {/* >>> FIN ADICIÓN v36.6 <<< */}
          </div>
        </div>
        {/* >>> FIN ADICIÓN v36.5 <<< */}
        <div style={{overflowX:"auto"}}><svg viewBox={"0 0 "+W+" "+H} style={{width:"100%",maxWidth:W,background:"#0A0F1E",borderRadius:6}}>
          {gridY.map(function(gy2){return <g key={"gy"+gy2}><line x1={mL} y1={sy(gy2)} x2={W-mR} y2={sy(gy2)} stroke="#1C2E4A" strokeWidth=".5"/><text x={mL-4} y={sy(gy2)+4} fill="#7088A8" fontSize="11" textAnchor="end">{gy2.toFixed(1)}</text></g>;})}
          {gridX.map(function(gx2){return <g key={"gx"+gx2}><line x1={sx(gx2)} y1={mT} x2={sx(gx2)} y2={H-mB} stroke="#1C2E4A" strokeWidth=".3"/><text x={sx(gx2)} y={H-mB+12} fill="#7088A8" fontSize="10" textAnchor="middle">{gx2}</text></g>;})}
          {/* >>> ADICIÓN v36.5: relleno suelo bajo rasante <<< */}
          <path d={terr+" L"+(W-mR)+","+(H-mB)+" L"+mL+","+(H-mB)+" Z"} fill="rgba(40,167,69,0.08)" stroke="none"/>
          {/* >>> FIN ADICIÓN v36.5 <<< */}
          <path d={terr} fill="none" stroke="#28A745" strokeWidth="2"/>
          <path d={bat} fill="none" stroke="#00A6D6" strokeWidth="2"/>
          {/* >>> ADICIÓN v36.5: tubería dibujada (rectángulo entre batea DE y batea A) <<< */}
          {chain.map(function(r,ci){
            var x1t=sx(pts[ci].x);var x2t=sx(pts[ci+1]?pts[ci+1].x:pts[ci].x+(r.L||10));
            var y1b=sy(r.cfDE);var y2b=sy(r.cfA);
            var dPx=Math.max(2,r.D*ph/yR);
            return <g key={"tub"+ci}>
              <line x1={x1t} y1={y1b} x2={x2t} y2={y2b} stroke="#00A6D6" strokeWidth={dPx} strokeOpacity="0.3"/>
            </g>;
          })}
          {/* >>> FIN ADICIÓN v36.5 <<< */}
          {pts.map(function(p,pi){
            var pw_px = Math.max(8, 1.2 / xMax * pw);
            var mhTop = sy(p.crDE);
            var mhBot = sy(p.cfDE);
            var mhH = Math.max(1, mhBot - mhTop);
            return <g key={"pp"+pi}>
            <rect x={sx(p.x) - pw_px/2} y={mhTop} width={pw_px} height={mhH} fill="rgba(212,168,67,0.15)" stroke="#D4A843" strokeWidth="1" />
            <circle cx={sx(p.x)} cy={sy(p.crDE)} r="3" fill="#28A745"/>
            <circle cx={sx(p.x)} cy={sy(p.cfDE)} r="3" fill="#00A6D6"/>
            {pi%2===0?<text x={sx(p.x)} y={sy(p.crDE)-6} fill="#8FD67A" fontSize="11" textAnchor="middle">{p.crDE}</text>:null}
            {pi%2===0?<text x={sx(p.x)} y={sy(p.cfDE)+12} fill="#7088A8" fontSize="11" textAnchor="middle">{p.cfDE}</text>:null}
            <text x={sx(p.x)} y={H-mB+24} fill="#D8E2F0" fontSize="11" textAnchor="middle" transform={"rotate(-45,"+sx(p.x)+","+(H-mB+24)+")"}>{p.de}</text>
          </g>;})}
          {chain.map(function(r,ci){var x1=sx(pts[ci].x);var x2=sx(pts[ci+1]?pts[ci+1].x:pts[ci].x+r.L);var yM=(sy(r.cfDE)+sy(r.cfA))/2;return <text key={"dn"+ci} x={(x1+x2)/2} y={yM-4} fill="#F0932B" fontSize="11" textAnchor="middle">{"#"+(r.id||"-")+" "+r.nom+" S="+r.S+"%"}</text>;})}
          {/* >>> ADICIÓN v36.5: tabla de datos bajo el perfil <<< */}
          {chain.map(function(r,ci){var x1=sx(pts[ci].x);var x2=sx(pts[ci+1]?pts[ci+1].x:pts[ci].x+r.L);var xM=(x1+x2)/2;var yBase=H-mB+40;
            return <g key={"dt"+ci}>
              <text x={xM} y={yBase} fill="#D8E2F0" fontSize="10" textAnchor="middle">{r.L.toFixed(1)+"m"}</text>
              <text x={xM} y={yBase+8} fill="#00A6D6" fontSize="10" textAnchor="middle">{"#"+(r.id||"-")+" "+r.nom}</text>
              <text x={xM} y={yBase+16} fill={r.V>=0.4?"#28A745":"#DC3545"} fontSize="10" textAnchor="middle">{"V="+r.V}</text>
            </g>;
          })}
          {/* >>> FIN ADICIÓN v36.5 <<< */}
          <text x={mL} y={12} fill="#28A745" fontSize="11">Rasante</text>
          <text x={mL+70} y={12} fill="#00A6D6" fontSize="11">Batea</text>
          <text x={mL+130} y={12} fill="#D4A843" fontSize="11">Pozos</text>
          <text x={W/2} y={H-2} fill="#7088A8" fontSize="11" textAnchor="middle">Distancia (m)</text>
          <text x={12} y={H/2} fill="#7088A8" fontSize="11" textAnchor="middle" transform={"rotate(-90,12,"+H/2+")"}>Cota (m)</text>
        </svg></div></div>;}():null}
    {(sub==="sep" || props.isExport)? <div className={props.isExport?"print-page-break":""}><EstructurasSeparacionTab R={R} P={P} T={T} estSepData={estSepData} setEstSepData={setEstSepData} /></div> : null}
    {(sub==="calc_sum" || props.isExport)? <div className={props.isExport?"print-page-break":""}><CalculoSumiderosTab P={P} sumData={sumData} setSumData={setSumData} sumLat={sumLat} setSumLat={setSumLat} sumTrans={sumTrans} setSumTrans={setSumTrans} /></div> : null}
  </div>;
}



