import React, {useState, useEffect, useRef} from 'react';
import {K, SepRow, TH} from '../ui';
import * as XLSX from 'xlsx';
import {IDF, PIPES, PIPES_DB, MATERIALS} from '../constants';
import {formatDiam} from '../engine';
import {calcCantSumidero, agruparTuberias, calcPozosCompleto} from '../calcHelpers';
import { exportCalculos } from '../exportCalculos';
import { decomposeIntoContinuousProfiles, buildProfileRenderModel } from '../utils/profileGraph';

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
  var [splitProfilesMode, setSplitProfilesMode] = useState(false);

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
      
      // Auditoría técnica completa de cotas y pozos según RAS 2017
      var pozData = calcPozosCompleto(R, T, P);
      var pzMap = {};
      (pozData.pz || []).forEach(function(p){ if(p && p.nodo) pzMap[p.nodo] = p; });

      // 1. Descomponer TODO el proyecto en colectores/perfiles estrictamente conectados (sin unir tramos desconectados)
      var projectSubProfiles = decomposeIntoContinuousProfiles(dR, pzMap);

      // 2. Si hay selección activa en el visor, descomponer también la selección en sus tramos conectados reales
      var selectedSubProfiles = [];
      if (props.selMap && props.selMap.length > 0) {
        var selItems = props.selMap.filter(function(x){ return x; });
        var matchedPipes = [];
        selItems.forEach(function(x){
          var xId = x.id != null ? String(x.id).trim() : "";
          var xDe = String(x.de || x.DE1 || x.DE || "").trim().toLowerCase();
          var xA = String(x.a || x.A1 || x.A || "").trim().toLowerCase();
          var match = dR.find(function(r){
            if (xId !== "" && String(r.id).trim() === xId) return true;
            var rDe = String(r.de || "").trim().toLowerCase();
            var rA = String(r.a || "").trim().toLowerCase();
            return (rDe === xDe && rA === xA) || (rDe === xA && rA === xDe);
          });
          if (match && !matchedPipes.some(function(mp){ return mp.id === match.id; })) {
            matchedPipes.push(match);
          }
        });
        if (matchedPipes.length > 0) {
          selectedSubProfiles = decomposeIntoContinuousProfiles(matchedPipes, pzMap);
        }
      }

      // 3. Construir opciones del selector de Colector / Perfil
      var colectores = [];
      if (selectedSubProfiles.length > 1) {
        var selTotalLen = selectedSubProfiles.reduce(function(s, sp){ return s + sp.len; }, 0);
        var selTotalPipes = selectedSubProfiles.reduce(function(s, sp){ return s + sp.chain.length; }, 0);
        colectores.push({
          cab: "VISTA COMPARATIVA SELECCIÓN (" + selectedSubProfiles.length + " tramos/perfiles desconectados)",
          subProfiles: selectedSubProfiles,
          pipesCount: selTotalPipes,
          len: selTotalLen,
          isComparative: true
        });
      } else if (selectedSubProfiles.length === 1) {
        colectores.push({
          cab: "SELECCIÓN VISOR: " + selectedSubProfiles[0].cab + " → " + selectedSubProfiles[0].fin,
          subProfiles: selectedSubProfiles,
          pipesCount: selectedSubProfiles[0].chain.length,
          len: selectedSubProfiles[0].len,
          isComparative: false
        });
      }

      if (projectSubProfiles.length > 1 && selectedSubProfiles.length !== projectSubProfiles.length) {
        var projTotalLen = projectSubProfiles.reduce(function(s, sp){ return s + sp.len; }, 0);
        colectores.push({
          cab: "PROYECTO COMPLETO CON CORTES (" + projectSubProfiles.length + " perfiles | Desnivel General)",
          subProfiles: projectSubProfiles,
          pipesCount: dR.length,
          len: projTotalLen,
          isComparative: true
        });
      } else if (projectSubProfiles.length > 1 && selectedSubProfiles.length === 0) {
        var projTotalLen2 = projectSubProfiles.reduce(function(s, sp){ return s + sp.len; }, 0);
        colectores.push({
          cab: "PROYECTO COMPLETO CON CORTES (" + projectSubProfiles.length + " perfiles | Desnivel Lado a Lado)",
          subProfiles: projectSubProfiles,
          pipesCount: dR.length,
          len: projTotalLen2,
          isComparative: true
        });
      }

      projectSubProfiles.forEach(function(sp){
        colectores.push({
          cab: sp.title,
          subProfiles: [sp],
          pipesCount: sp.chain.length,
          len: sp.len,
          isComparative: false
        });
      });

      var selIdx = props.perfilIdx || 0;
      if (selIdx >= colectores.length) selIdx = 0;
      var currentChoice = colectores[selIdx] || {
        cab: "Perfil Principal",
        subProfiles: projectSubProfiles.slice(0, 1),
        pipesCount: dR.length,
        len: 0
      };

      var baseTruncatableProfiles = selectedSubProfiles.length > 1 ? selectedSubProfiles : projectSubProfiles;
      var zoomLvl = props.perfilZoom || 1;
      var profMinRAS = parseFloat(P.profMin) || 1.20;
      var profMaxRAS = parseFloat(P.profMax) || 5.00;

      // Función universal para renderizar un lienzo de perfil (con 1 o varios sub-perfiles con corte de discontinuidad)
      var renderProfileBlock = function(subProfilesList, blockTitle, blockKey) {
        var model = buildProfileRenderModel(subProfilesList, pzMap);
        var profileNodes = model.profileNodes;
        var pipesToDraw = model.pipesToDraw;
        var segments = model.segments;
        var breaks = model.breaks;
        var xMax = model.xMaxPlot || 100;

        if (profileNodes.length === 0) return null;

        var allElevs = [];
        profileNodes.forEach(function(n){
          if(!isNaN(n.cr)) allElevs.push(n.cr);
          if(!isNaN(n.cf)) allElevs.push(n.cf);
          if(n.cfDE_out != null && !isNaN(n.cfDE_out)) allElevs.push(n.cfDE_out);
          if(n.cfA_in != null && !isNaN(n.cfA_in)) allElevs.push(n.cfA_in);
        });
        pipesToDraw.forEach(function(ptd){
          var r = ptd.pipe;
          var diamM = (parseFloat(r.D) || 0.2);
          if(diamM > 10) diamM = diamM / 1000;
          var cDE = parseFloat(r.effectiveCfDE != null ? r.effectiveCfDE : r.cfDE);
          var cA = parseFloat(r.effectiveCfA != null ? r.effectiveCfA : r.cfA);
          if(!isNaN(cDE)) { allElevs.push(cDE); allElevs.push(cDE + diamM); }
          if(!isNaN(cA)) { allElevs.push(cA); allElevs.push(cA + diamM); }
        });

        var validElevs = allElevs.filter(function(v){ return typeof v === 'number' && !isNaN(v); });
        var yMin = (validElevs.length > 0 ? Math.min.apply(null, validElevs) : 0) - 1.3;
        var yMax = (validElevs.length > 0 ? Math.max.apply(null, validElevs) : 10) + 1.5;
        var yR = yMax - yMin || 1;

        var baseW = Math.max(920, Math.round(profileNodes.length * 120 + breaks.length * 90));
        var W = Math.round(baseW * zoomLvl);
        var H = Math.round(440 * zoomLvl);
        var mL = 72; var mR = 44; var mT = segments.length > 1 ? 56 : 42; var mB = 115;
        var pw = W - mL - mR; var ph = H - mT - mB;

        var sx = function(v){
          var val = parseFloat(v); if(isNaN(val)) val = 0;
          return mL + (xMax > 0 ? (val / xMax) * pw : 0);
        };
        var sy = function(v){
          var val = parseFloat(v); if(isNaN(val)) val = yMin;
          return mT + (yR > 0 ? ((yMax - val) / yR) * ph : 0);
        };

        var gridY = [];
        var step = yR > 20 ? 5 : yR > 10 ? 2 : yR > 5 ? 1 : 0.5;
        for (var gy = Math.ceil(yMin / step) * step; gy <= yMax; gy += step) gridY.push(gy);

        // Construir marcas de abscisa local por cada sub-perfil (no mezclar abscisas falsas a través de un corte)
        var localTicks = [];
        segments.forEach(function(seg){
          var sLen = seg.len || 10;
          var stepX = sLen > 500 ? 100 : sLen > 200 ? 50 : sLen > 100 ? 25 : 10;
          for (var lx = 0; lx <= sLen; lx += stepX) {
            localTicks.push({ xPlot: seg.xStartPlot + lx, label: lx + " m" });
          }
          if (sLen % stepX > 2) {
            localTicks.push({ xPlot: seg.xEndPlot, label: sLen.toFixed(1) + " m" });
          }
        });

        var breakAfterNodeMap = {};
        breaks.forEach(function(b){ breakAfterNodeMap[b.afterGlobalNodeIdx] = b; });

        return <div key={blockKey} style={{marginBottom: 22}} className={props.isExport ? "print-page-break" : ""}>
          {blockTitle ? (
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(30,41,59,0.75)",padding:"8px 12px",borderRadius:"8px 8px 0 0",border:"1px solid rgba(59,130,246,0.3)",borderBottom:"none"}}>
              <span style={{fontSize:13,fontWeight:800,color:"#38BDF8"}}>{blockTitle}</span>
              <span style={{fontSize:11,color:"#94A3B8"}}>
                {pipesToDraw.length} {pipesToDraw.length === 1 ? "tramo" : "tramos"} • {profileNodes.length} pozos • Longitud neta: {model.totalRealLen.toFixed(2)} m
                {breaks.length > 0 ? " • " + breaks.length + (breaks.length === 1 ? " corte sin conexión" : " cortes sin conexión") : ""}
              </span>
            </div>
          ) : null}

          {/* Canvas SVG del Perfil Longitudinal */}
          <div style={{overflowX:"auto",background:"#080E1A",borderRadius:blockTitle?"0 0 8px 8px":8,border:"1px solid rgba(59,130,246,0.25)",padding:4}}>
            <svg viewBox={"0 0 "+W+" "+H} style={{width:"100%",minWidth:W,height:H,display:"block"}}>
              {/* Cuadrícula Y (Cotas Reales s.n.m. compartidas lado a lado) */}
              {gridY.map(function(gy2){
                var yPos = sy(gy2);
                return <g key={"gy"+gy2}>
                  <line x1={mL} y1={yPos} x2={W-mR} y2={yPos} stroke="rgba(30, 41, 59, 0.7)" strokeWidth="0.7"/>
                  <text x={mL-8} y={yPos+4} fill="#64748B" fontSize="10.5" textAnchor="end">{gy2.toFixed(2)}</text>
                </g>;
              })}

              {/* Cuadrícula X (Abscisas locales de cada tramo/colector) */}
              {localTicks.map(function(tk, tki){
                var xPos = sx(tk.xPlot);
                return <g key={"gx"+tki}>
                  <line x1={xPos} y1={mT} x2={xPos} y2={H-mB} stroke="rgba(30, 41, 59, 0.55)" strokeWidth="0.5"/>
                  <text x={xPos} y={H-mB+14} fill="#64748B" fontSize="9.5" textAnchor="middle">{tk.label}</text>
                </g>;
              })}

              {/* Terreno independiente por cada segmento continuo (NUNCA une tramos desconectados) */}
              {segments.map(function(seg, sIdx){
                if (!seg.nodes || seg.nodes.length < 2) return null;
                var segPath = "M" + seg.nodes.map(function(n){ return sx(n.x) + "," + sy(n.cr); }).join(" L");
                var xS = sx(seg.xStartPlot);
                var xE = sx(seg.xEndPlot);
                var xMidSeg = (xS + xE) / 2;
                return <g key={"seg_terr_"+sIdx}>
                  <path d={segPath + " L" + xE + "," + (H-mB) + " L" + xS + "," + (H-mB) + " Z"} fill="rgba(34, 197, 94, 0.05)" stroke="none"/>
                  <path d={segPath} fill="none" stroke="#22C55E" strokeWidth="2.5"/>
                  {segments.length > 1 ? (
                    <g>
                      <rect x={Math.max(mL, xMidSeg - 95)} y={26} width="190" height="18" rx="4" fill="rgba(15, 23, 42, 0.92)" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="1"/>
                      <text x={Math.max(mL + 95, xMidSeg)} y={38} fill="#38BDF8" fontSize="9.5" fontWeight="bold" textAnchor="middle">
                        {seg.title}
                      </text>
                    </g>
                  ) : null}
                </g>;
              })}

              {/* Zonas de CORTE / SIN CONEXIÓN evidenciando el desnivel real lado a lado */}
              {breaks.map(function(brk, bi){
                var bx1 = sx(brk.xLeft);
                var bx2 = sx(brk.xRight);
                var bMid = (bx1 + bx2) / 2;
                var bw = Math.max(12, bx2 - bx1);
                var yTop = mT;
                var yBot = H - mB;
                var yCenter = (yTop + yBot) / 2;
                var dCrStr = (brk.deltaCr >= 0 ? "+" : "") + brk.deltaCr.toFixed(2) + "m";
                var dCfStr = (brk.deltaCf >= 0 ? "+" : "") + brk.deltaCf.toFixed(2) + "m";
                return <g key={"brk_"+bi}>
                  <rect x={bx1 + 3} y={yTop} width={Math.max(4, bw - 6)} height={yBot - yTop} fill="rgba(245, 158, 11, 0.06)" />
                  <line x1={bx1 + 4} y1={yTop} x2={bx1 + 4} y2={yBot} stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="6,4" />
                  <line x1={bx2 - 4} y1={yTop} x2={bx2 - 4} y2={yBot} stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="6,4" />
                  {/* Líneas guía horizontales suaves comparando las cotas de ambos pozos lado a lado */}
                  {brk.leftNode && brk.rightNode ? (
                    <g>
                      <line x1={bx1} y1={sy(brk.leftNode.cf)} x2={bx2} y2={sy(brk.leftNode.cf)} stroke="rgba(56, 189, 248, 0.35)" strokeWidth="1" strokeDasharray="2,3" />
                      <line x1={bx1} y1={sy(brk.rightNode.cf)} x2={bx2} y2={sy(brk.rightNode.cf)} stroke="rgba(56, 189, 248, 0.35)" strokeWidth="1" strokeDasharray="2,3" />
                    </g>
                  ) : null}
                  <rect x={bMid - 56} y={yCenter - 26} width="112" height="50" rx="6" fill="rgba(15, 23, 42, 0.95)" stroke="#F59E0B" strokeWidth="1.2" />
                  <text x={bMid} y={yCenter - 11} fill="#FBBF24" fontSize="9" fontWeight="bold" textAnchor="middle">✂ SIN CONEXIÓN</text>
                  <text x={bMid} y={yCenter + 3} fill="#86EFAC" fontSize="8.8" fontWeight="bold" textAnchor="middle">{"ΔRas: " + dCrStr}</text>
                  <text x={bMid} y={yCenter + 16} fill="#38BDF8" fontSize="8.8" fontWeight="bold" textAnchor="middle">{"ΔFon: " + dCfStr}</text>
                </g>;
              })}

              {/* Tuberías únicamente dentro de su tramo real */}
              {pipesToDraw.map(function(ptd, ci){
                var r = ptd.pipe;
                var n1 = ptd.n1;
                var n2 = ptd.n2;
                if(!n1 || !n2) return null;
                var x1 = sx(n1.x); var x2 = sx(n2.x);
                var curCfDE = r.effectiveCfDE != null ? r.effectiveCfDE : r.cfDE;
                var curCfA = r.effectiveCfA != null ? r.effectiveCfA : r.cfA;
                var y1b = sy(curCfDE); var y2b = sy(curCfA);
                var diamM = (parseFloat(r.D) || 0.2);
                if(diamM > 10) diamM = diamM / 1000;
                var y1c = sy(parseFloat(curCfDE) + diamM);
                var y2c = sy(parseFloat(curCfA) + diamM);
                var tirM = Math.min(diamM, (parseFloat(r.Y) || 0) / 1000);
                var y1w = sy(parseFloat(curCfDE) + tirM);
                var y2w = sy(parseFloat(curCfA) + tirM);

                var midX = (x1 + x2) / 2;
                var midYb = (y1b + y2b) / 2;

                return <g key={"tub"+ci}>
                  <polygon points={x1+","+y1b+" "+x2+","+y2b+" "+x2+","+y2c+" "+x1+","+y1c} fill="rgba(0,166,214,0.08)" stroke="#0284C7" strokeWidth="1" strokeDasharray="3,3" />
                  {tirM > 0.005 ? <polygon points={x1+","+y1b+" "+x2+","+y2b+" "+x2+","+y2w+" "+x1+","+y1w} fill="rgba(56, 189, 248, 0.3)" /> : null}
                  <line x1={x1} y1={y1b} x2={x2} y2={y2b} stroke="#00D2FF" strokeWidth="2.5" />
                  <text x={midX} y={midYb - 10} fill="#F59E0B" fontSize="10.5" fontWeight="bold" textAnchor="middle">
                    {"#" + (r.id||"-") + " " + (r.nom||"") + " S=" + r.S + "%"}
                  </text>
                  <text x={midX} y={midYb + 14} fill="#94A3B8" fontSize="9.5" textAnchor="middle">
                    {"L=" + (parseFloat(r.L)||0).toFixed(1) + "m | V=" + (r.V||0) + "m/s"}
                  </text>
                </g>;
              })}

              {/* Pozos de Inspección Reales (los 4+ pozos dibujados individualmente) */}
              {profileNodes.map(function(n, ni){
                var pw_px = Math.max(14, Math.min(26, 1.2 / xMax * pw));
                var xPos = sx(n.x);
                var mhTop = sy(n.cr);
                var mhBot = sy(n.cf);
                var mhH = Math.max(4, mhBot - mhTop);

                var hasDrop = n.drop > 0.05;
                var dropIsCritical = n.drop > 0.75;
                var isCritDepth = n.prof < profMinRAS || n.prof > profMaxRAS;

                return <g key={"pz"+ni}>
                  <rect x={xPos - pw_px/2} y={mhTop} width={pw_px} height={mhH} fill="rgba(212,168,67,0.22)" stroke={isCritDepth ? "#EF4444" : "#D4A843"} strokeWidth="1.5" rx="2" />
                  <line x1={xPos - pw_px/2 - 2} y1={mhTop} x2={xPos + pw_px/2 + 2} y2={mhTop} stroke="#22C55E" strokeWidth="3" />
                  <line x1={xPos - pw_px/2 - 2} y1={mhBot} x2={xPos + pw_px/2 + 2} y2={mhBot} stroke="#00D2FF" strokeWidth="3" />
                  <circle cx={xPos} cy={mhTop} r="3.5" fill="#22C55E" stroke="#000" strokeWidth="0.5" />
                  <circle cx={xPos} cy={mhBot} r="3.5" fill="#00D2FF" stroke="#000" strokeWidth="0.5" />

                  {hasDrop && n.cfA_in != null ? (
                    <g>
                      <line x1={xPos - pw_px/2} y1={sy(n.cfA_in)} x2={xPos} y2={sy(n.cfA_in)} stroke={dropIsCritical ? "#EF4444" : "#F59E0B"} strokeWidth="2" />
                      <line x1={xPos} y1={sy(n.cfA_in)} x2={xPos} y2={mhBot} stroke={dropIsCritical ? "#EF4444" : "#F59E0B"} strokeWidth="1.5" strokeDasharray="2,2" />
                      <rect x={xPos + pw_px/2 + 2} y={(sy(n.cfA_in) + mhBot)/2 - 8} width="58" height="15" rx="3" fill="rgba(15, 23, 42, 0.85)" stroke={dropIsCritical ? "#EF4444" : "#F59E0B"} strokeWidth="0.8"/>
                      <text x={xPos + pw_px/2 + 31} y={(sy(n.cfA_in) + mhBot)/2 + 3} fill={dropIsCritical ? "#EF4444" : "#F59E0B"} fontSize="9" fontWeight="bold" textAnchor="middle">
                        {"ΔH=" + n.drop.toFixed(2) + "m"}
                      </text>
                    </g>
                  ) : null}

                  <text x={xPos} y={mhTop - 8} fill="#86EFAC" fontSize="10.5" fontWeight="bold" textAnchor="middle">
                    {"CR: " + n.cr.toFixed(2)}
                  </text>
                  <text x={xPos} y={mhBot + 14} fill="#38BDF8" fontSize="10.5" fontWeight="bold" textAnchor="middle">
                    {"CF: " + n.cf.toFixed(2)}
                  </text>
                  <text x={xPos} y={mhBot + 26} fill={isCritDepth ? "#F87171" : "#FDE047"} fontSize="9.5" fontWeight={isCritDepth ? "bold" : "normal"} textAnchor="middle">
                    {"H=" + n.prof.toFixed(2) + "m"}
                  </text>
                  <text x={xPos} y={H - mB + 24} fill="#F8FAFC" fontSize="10.5" fontWeight="bold" textAnchor="end" transform={"rotate(-42, "+xPos+", "+(H - mB + 24)+")"}>
                    {n.name}
                  </text>
                </g>;
              })}

              {/* Leyenda Superior */}
              <g transform={"translate("+mL+", 16)"}>
                <circle cx="0" cy="0" r="4" fill="#22C55E"/>
                <text x="8" y="4" fill="#86EFAC" fontSize="11" fontWeight="bold">Rasante Terreno (CR)</text>

                <circle cx="160" cy="0" r="4" fill="#00D2FF"/>
                <text x="168" y="4" fill="#38BDF8" fontSize="11" fontWeight="bold">Batea Tubería (CF)</text>

                <rect x="310" y="-5" width="10" height="10" fill="rgba(212,168,67,0.4)" stroke="#D4A843" strokeWidth="1.2"/>
                <text x="325" y="4" fill="#FDE047" fontSize="11" fontWeight="bold">Pozos ({profileNodes.length})</text>

                <line x1="435" y1="0" x2="455" y2="0" stroke="#F59E0B" strokeWidth="2" strokeDasharray="3,2"/>
                <text x="462" y="4" fill="#F59E0B" fontSize="11" fontWeight="bold">{breaks.length > 0 ? "Corte / Caída ΔH" : "Caída Interna (ΔH)"}</text>
              </g>

              <text x={W/2} y={H-6} fill="#64748B" fontSize="11" textAnchor="middle">
                {segments.length > 1 ? "Abscisa Local por Sub-Perfil (m) — Escala Vertical Compartida para Comparar Desnivel Real" : "Distancia Acumulada / Abscisa (m)"}
              </text>
              <text x={16} y={H/2} fill="#64748B" fontSize="11" textAnchor="middle" transform={"rotate(-90, 16, "+(H/2)+")"}>Cota Real s.n.m. (m)</text>
            </svg>
          </div>

          {/* GUITARRA TÉCNICA DEL PERFIL (Pozo a Pozo con separador explícito en cortes desconectados) */}
          <div style={{marginTop:12,background:"rgba(15,23,42,0.75)",borderRadius:8,padding:12,border:"1px solid rgba(59,130,246,0.25)"}}>
            <div style={{fontSize:13,fontWeight:700,color:"#38BDF8",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
              <span>GUITARRA TÉCNICA DEL PERFIL LONGITUDINAL ({profileNodes.length} Pozos Reales)</span>
              {breaks.length > 0 ? <span style={{fontSize:11,color:"#FBBF24"}}>{segments.length} tramos/colectores independientes separados por corte</span> : null}
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",fontSize:11,borderCollapse:"collapse"}}>
                <thead>
                  <tr style={{background:"rgba(30,41,59,0.8)",color:"#94A3B8"}}>
                    <th style={{padding:"6px 8px",textAlign:"left",borderBottom:"1px solid rgba(59,130,246,0.3)"}}>Sub-Perfil</th>
                    <th style={{padding:"6px 8px",textAlign:"left",borderBottom:"1px solid rgba(59,130,246,0.3)"}}>Pozo / Nodo</th>
                    <th style={{padding:"6px 8px",textAlign:"right",borderBottom:"1px solid rgba(59,130,246,0.3)"}}>Abscisa Local (m)</th>
                    <th style={{padding:"6px 8px",textAlign:"right",color:"#86EFAC",borderBottom:"1px solid rgba(59,130,246,0.3)"}}>Cota Rasante (m)</th>
                    <th style={{padding:"6px 8px",textAlign:"right",color:"#38BDF8",borderBottom:"1px solid rgba(59,130,246,0.3)"}}>Cota Fondo (m)</th>
                    <th style={{padding:"6px 8px",textAlign:"right",color:"#FDE047",borderBottom:"1px solid rgba(59,130,246,0.3)"}}>Profundidad H (m)</th>
                    <th style={{padding:"6px 8px",textAlign:"right",borderBottom:"1px solid rgba(59,130,246,0.3)"}}>Batea Entrada (m)</th>
                    <th style={{padding:"6px 8px",textAlign:"right",borderBottom:"1px solid rgba(59,130,246,0.3)"}}>Batea Salida (m)</th>
                    <th style={{padding:"6px 8px",textAlign:"center",borderBottom:"1px solid rgba(59,130,246,0.3)"}}>Caída ΔH (m)</th>
                    <th style={{padding:"6px 8px",textAlign:"center",borderBottom:"1px solid rgba(59,130,246,0.3)"}}>Estado RAS 2017</th>
                  </tr>
                </thead>
                <tbody>
                  {profileNodes.map(function(n, ni){
                    var okDepth = n.prof >= profMinRAS && n.prof <= profMaxRAS;
                    var dropCrit = n.drop > 0.75;
                    var brkAfter = breakAfterNodeMap[n.globalIdx];
                    return <React.Fragment key={"gt_frag_"+ni}>
                      <tr style={{borderBottom:"1px solid rgba(255,255,255,0.05)",background:ni%2===0?"rgba(255,255,255,0.02)":"transparent"}}>
                        <td style={{padding:"5px 8px",color:"#38BDF8",fontSize:10.5,fontWeight:600}}>{"P" + (n.segIdx + 1)}</td>
                        <td style={{padding:"5px 8px",fontWeight:"bold",color:"#F8FAFC"}}>{n.name}</td>
                        <td style={{padding:"5px 8px",textAlign:"right",color:"#94A3B8"}}>{n.abscisaLocal.toFixed(2)}</td>
                        <td style={{padding:"5px 8px",textAlign:"right",color:"#86EFAC",fontWeight:600}}>{n.cr.toFixed(2)}</td>
                        <td style={{padding:"5px 8px",textAlign:"right",color:"#38BDF8",fontWeight:600}}>{n.cf.toFixed(2)}</td>
                        <td style={{padding:"5px 8px",textAlign:"right",color:okDepth?"#FDE047":"#EF4444",fontWeight:700}}>{n.prof.toFixed(2)}</td>
                        <td style={{padding:"5px 8px",textAlign:"right",color:"#CBD5E1"}}>{n.cfA_in != null ? n.cfA_in.toFixed(2) : "-"}</td>
                        <td style={{padding:"5px 8px",textAlign:"right",color:"#CBD5E1"}}>{n.cfDE_out != null ? n.cfDE_out.toFixed(2) : "-"}</td>
                        <td style={{padding:"5px 8px",textAlign:"center"}}>
                          {n.drop > 0.05 ? <span style={{color:dropCrit?"#EF4444":"#F59E0B",fontWeight:"bold"}}>{n.drop.toFixed(2)+" m"}</span> : <span style={{color:"#64748B"}}>0.00</span>}
                        </td>
                        <td style={{padding:"5px 8px",textAlign:"center"}}>
                          {n.prof < profMinRAS ? <span style={{background:"rgba(239,68,68,0.2)",color:"#EF4444",padding:"2px 6px",borderRadius:4,fontSize:10}}>H &lt; {profMinRAS}m</span> :
                           n.prof > profMaxRAS ? <span style={{background:"rgba(245,158,11,0.2)",color:"#F59E0B",padding:"2px 6px",borderRadius:4,fontSize:10}}>H &gt; {profMaxRAS}m</span> :
                           dropCrit ? <span style={{background:"rgba(239,68,68,0.2)",color:"#EF4444",padding:"2px 6px",borderRadius:4,fontSize:10}}>Requiere Bajante RAS</span> :
                           <span style={{background:"rgba(34,197,94,0.15)",color:"#22C55E",padding:"2px 6px",borderRadius:4,fontSize:10}}>CUMPLE RAS</span>}
                        </td>
                      </tr>
                      {brkAfter && brkAfter.rightNode ? (
                        <tr style={{background:"rgba(245, 158, 11, 0.12)",borderTop:"1px dashed #F59E0B",borderBottom:"1px dashed #F59E0B"}}>
                          <td colSpan={10} style={{padding:"6px 10px",textAlign:"center",color:"#FCD34D",fontWeight:700,fontSize:10.5}}>
                            {"✂ CORTE DE PERFIL (TRAMOS NO UNIDOS): Fin en pozo " + brkAfter.leftNode.name + " → Reinicia en pozo independiente " + brkAfter.rightNode.name + " | Desnivel entre sectores: ΔRasante = " + (brkAfter.deltaCr >= 0 ? "+" : "") + brkAfter.deltaCr.toFixed(2) + " m, ΔFondo = " + (brkAfter.deltaCf >= 0 ? "+" : "") + brkAfter.deltaCf.toFixed(2) + " m"}
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>;
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>;
      };

      var fullAuditModel = buildProfileRenderModel(
        (splitProfilesMode || props.isExport) ? baseTruncatableProfiles : currentChoice.subProfiles,
        pzMap
      );
      var auditNodes = fullAuditModel.profileNodes;

      return <div className="c">
        {/* Selector de colector, modo Truncar Proyecto en Perfiles y controles de Zoom */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
          <div className="ct" style={{margin:0,fontSize:14,color:"#38BDF8"}}>
            PERFIL LONGITUDINAL AUDITADO ({auditNodes.length} pozos reales | {fullAuditModel.pipesToDraw.length} tramos | Long neta: {fullAuditModel.totalRealLen.toFixed(1)} m)
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
            {baseTruncatableProfiles.length > 1 ? (
              <button
                type="button"
                className="btn"
                onClick={function(){ setSplitProfilesMode(!splitProfilesMode); }}
                style={{
                  fontSize:11,
                  padding:"5px 10px",
                  fontWeight:700,
                  background: splitProfilesMode ? "linear-gradient(135deg,#10B981,#059669)" : "rgba(245,158,11,0.18)",
                  color: splitProfilesMode ? "#ffffff" : "#FCD34D",
                  border: splitProfilesMode ? "1px solid #34D399" : "1px solid rgba(245,158,11,0.55)"
                }}
                title="Alterna entre ver los tramos desconectados lado a lado con su desnivel o truncar el proyecto en tarjetas de perfil independientes"
              >
                {splitProfilesMode
                  ? "📐 Ver Lado a Lado con Desnivel (" + auditNodes.length + " pozos)"
                  : "✂️ Truncar Proyecto en Perfiles (" + baseTruncatableProfiles.length + ")"}
              </button>
            ) : null}
            {!splitProfilesMode ? (
              <>
                <span style={{fontSize:11,color:"#94A3B8"}}>Vista / Colector:</span>
                <select className="es" value={selIdx} onChange={function(e){if(props.setPerfilIdx)props.setPerfilIdx(+e.target.value);}} style={{fontSize:11,minWidth:240}}>
                  {colectores.map(function(col,ci){return <option key={ci} value={ci}>{"["+ci+"] "+col.cab+" ("+col.pipesCount+" tramos, "+col.len.toFixed(1)+" m)"}</option>;})}
                </select>
              </>
            ) : null}
            <button className="btn" onClick={function(){if(props.setPerfilZoom)props.setPerfilZoom(Math.max(0.6,(zoomLvl||1)-0.2));}} style={{fontSize:11,padding:"3px 8px",background:"#1E293B"}}>-</button>
            <span style={{fontSize:11,color:"#F8FAFC",minWidth:35,textAlign:"center",fontWeight:"bold"}}>{Math.round((zoomLvl||1)*100)+"%"}</span>
            <button className="btn" onClick={function(){if(props.setPerfilZoom)props.setPerfilZoom(Math.min(3,(zoomLvl||1)+0.2));}} style={{fontSize:11,padding:"3px 8px",background:"#1E293B"}}>+</button>
            <button className="btn" onClick={function(){if(props.setPerfilZoom)props.setPerfilZoom(1);}} style={{fontSize:10,padding:"3px 8px",background:"#1E293B"}}>100%</button>
          </div>
        </div>

        {/* Renderizado: o tarjetas truncadas por cada perfil conectado (splitProfilesMode / exportación PDF) o vista actual con cortes */}
        {(splitProfilesMode || (props.isExport && baseTruncatableProfiles.length > 1))
          ? baseTruncatableProfiles.map(function(sp, spi){
              return renderProfileBlock([sp], "✂️ " + sp.title + " (Perfil Independiente " + (spi + 1) + " de " + baseTruncatableProfiles.length + ")", "split_prof_" + spi);
            })
          : renderProfileBlock(
              currentChoice.subProfiles,
              currentChoice.subProfiles.length > 1
                ? "📐 Vista Comparativa con Desnivel Lado a Lado (" + currentChoice.subProfiles.length + " tramos/colectores no unidos)"
                : currentChoice.cab,
              "single_prof_view"
            )
        }

        {/* AUDITORÍA POZO POR POZO (RAS 2017) */}
        <div style={{marginTop:8,background:"rgba(15,23,42,0.75)",borderRadius:8,padding:12,border:"1px solid rgba(59,130,246,0.25)"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#22C55E",marginBottom:6,display:"flex",alignItems:"center",gap:8}}>
            <span>AUDITORÍA TÉCNICA Y ESTRUCTURAL POZO POR POZO (Norma RAS 2017)</span>
          </div>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:10}}>
            <div style={{background:"rgba(30,41,59,0.6)",padding:"6px 12px",borderRadius:6,border:"1px solid rgba(255,255,255,0.06)"}}>
              <span style={{color:"#94A3B8",fontSize:10}}>Perfiles Independientes:</span> <strong style={{color:"#38BDF8",fontSize:12}}>{baseTruncatableProfiles.length}</strong>
            </div>
            <div style={{background:"rgba(30,41,59,0.6)",padding:"6px 12px",borderRadius:6,border:"1px solid rgba(255,255,255,0.06)"}}>
              <span style={{color:"#94A3B8",fontSize:10}}>Pozos Auditados:</span> <strong style={{color:"#F8FAFC",fontSize:12}}>{auditNodes.length}</strong>
            </div>
            <div style={{background:"rgba(30,41,59,0.6)",padding:"6px 12px",borderRadius:6,border:"1px solid rgba(255,255,255,0.06)"}}>
              <span style={{color:"#94A3B8",fontSize:10}}>Con Caída Interna (&gt;5cm):</span> <strong style={{color:"#F59E0B",fontSize:12}}>{auditNodes.filter(function(n){return n.drop>0.05;}).length}</strong>
            </div>
            <div style={{background:"rgba(30,41,59,0.6)",padding:"6px 12px",borderRadius:6,border:"1px solid rgba(255,255,255,0.06)"}}>
              <span style={{color:"#94A3B8",fontSize:10}}>Caídas Críticas (&gt;75cm - Bajante):</span> <strong style={{color:"#EF4444",fontSize:12}}>{auditNodes.filter(function(n){return n.drop>0.75;}).length}</strong>
            </div>
            <div style={{background:"rgba(30,41,59,0.6)",padding:"6px 12px",borderRadius:6,border:"1px solid rgba(255,255,255,0.06)"}}>
              <span style={{color:"#94A3B8",fontSize:10}}>Profundidades Críticas:</span> <strong style={{color:auditNodes.some(function(n){return n.prof<profMinRAS||n.prof>profMaxRAS;})?"#EF4444":"#22C55E",fontSize:12}}>{auditNodes.filter(function(n){return n.prof<profMinRAS||n.prof>profMaxRAS;}).length}</strong>
            </div>
          </div>

          <div style={{fontSize:11,color:"#94A3B8",lineHeight:1.5}}>
            • <strong>Tramos No Conectados / Truncado de Perfiles:</strong> Cuando el proyecto contiene tramos sin unión física, el sistema conserva los pozos reales de cada tramo sin fusionarlos, evidenciando su desnivel real lado a lado o truncándolos en perfiles independientes.<br/>
            • <strong>Cota Rasante Terreno (CR) y Cota Fondo (CF):</strong> Niveles reales s.n.m. en cada pozo de entrada y salida.<br/>
            • <strong>Profundidad Mínima y Máxima RAS 2017:</strong> En vías vehiculares se exige mínimo {profMinRAS} m a clave de tubería; profundidades &gt; {profMaxRAS} m requieren verificación de entibados.<br/>
            • <strong>Caídas Internas:</strong> Si la diferencia de cotas entre llegada y salida de un mismo pozo supera 0.75 m, la norma RAS 2017 exige cámara o tubería bajante.
          </div>
        </div>
      </div>;}():null}
    {(sub==="sep" || props.isExport)? <div className={props.isExport?"print-page-break":""}><EstructurasSeparacionTab R={R} P={P} T={T} estSepData={estSepData} setEstSepData={setEstSepData} /></div> : null}
    {(sub==="calc_sum" || props.isExport)? <div className={props.isExport?"print-page-break":""}><CalculoSumiderosTab P={P} sumData={sumData} setSumData={setSumData} sumLat={sumLat} setSumLat={setSumLat} sumTrans={sumTrans} setSumTrans={setSumTrans} /></div> : null}
  </div>;
}
