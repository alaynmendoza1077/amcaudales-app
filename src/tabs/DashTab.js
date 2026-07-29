import React, {useState, useEffect, useRef} from 'react';
import {fm} from '../ui';
import {IDF} from '../constants';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

function DashTab(props){
  var R=props.R,P=props.P,sumLat=props.sumLat,sumTrans=props.sumTrans;
  var dR=R.filter(function(r){return !r.sep;});
  var dN=dR.filter(function(r){return r.reponer==="S";});
  if(!dR.length) return <div style={{textAlign:"center",padding:40}}><div style={{fontSize:48,fontWeight:700,color:"#003B73"}}>AMCaudales</div><div style={{fontSize:20,color:"#00A6D6",marginTop:8}}>Diseno de Alcantarillado</div><p style={{fontSize:14,color:"#7088A8",marginTop:16}}>Cargue el archivo de entrada en la pestana Datos</p></div>;
  var lt=dN.reduce(function(s,r){return s+(r.L||0);},0);
  var calcProfProm=dN.length>0?dN.reduce(function(s,r){return s+((+r.profE||0)+(+r.profS||0))/2;},0)/dN.length:1.5;
  var profProm=P.profProm!==undefined?P.profProm:calcProfProm;
  var ltAll=dR.reduce(function(s,r){return s+(r.L||0);},0);
  var aT=Math.max.apply(null,dR.map(function(r){return r.aT||0;}));
  /* >>> ADICIÓN v36.1: área total del proyecto desde 1.InformaciónGeneral <<< */
  var aTproy=P.areaTotal>0?P.areaTotal:aT;
  /* >>> FIN ADICIÓN v36.1 <<< */
  /* >>> ADICIÓN v36.6: densidad ponderada desde AreaDrenaje <<< */
  var denPond = P.densidad || 600;
  if (dR.length > 0) {
      var dSum = 0;
      dR.forEach(function(r) {
          var d = Number(String(r.densidad).replace(",", "."));
          if (isNaN(d) || d === 0) d = P.densidad || 600;
          dSum += d;
      });
      denPond = dSum / dR.length;
  }
  /* >>> FIN ADICIÓN v36.6 <<< */
  var pMn=Math.min.apply(null,dR.map(function(r){return r.profE||0;}));
  var pMx=Math.max.apply(null,dR.map(function(r){return r.profE||0;}));
  var pPr=dR.reduce(function(s,r){return s+(r.profE||0);},0)/dR.length;
  var tE=dN.reduce(function(s,r){return s+(r.volE||0);},0);
  var nSet={};dN.forEach(function(r){nSet[r.de]=1;nSet[r.a]=1;});var nP=Object.keys(nSet).length;
  var nSumTot=0;
  if(sumLat)sumLat.forEach(function(f){nSumTot+=f.cant||0;});
  if(sumTrans)sumTrans.forEach(function(f){nSumTot+=f.cant||0;});
  var nAc=P.nAcom06+(P.nAcom610||0)+(P.nAcom10||0);
  /* >>> ADICIÓN v36.1: desglose acometidas, sumideros lat/trans, pozos nuevos <<< */
  var nSumLat=0;var nSumTrans=0;
  if(sumLat)sumLat.forEach(function(f){nSumLat+=f.cant||0;});
  if(sumTrans)sumTrans.forEach(function(f){nSumTrans+=f.cant||0;});
  var nPozNuevos=0;dN.forEach(function(r){if(r.pozoNuevo==="S")nPozNuevos++;});
  var nVallas=(P.vallas1||0)+(P.vallas2||0)+(P.vallas3||0)+(P.vallas4||0);
  /* >>> FIN ADICIÓN v36.1 <<< */
  var pbI=props.pbItems||[];var pbCd=0;pbI.forEach(function(it){if(it.lv>=3&&it.q>0&&it.p>0)pbCd+=Math.round(it.q*it.p);});
  
  var rotP = dN.reduce(function(s,r){return s+(r.rotP||0);},0);
  var repP = dN.reduce(function(s,r){return s+(r.repP||0);},0);
  
  var cd=pbCd>0?pbCd:Math.round(lt*5474000);
  var adm=Math.round(cd*P.porcAdmin);var imp=Math.round(cd*P.porcImprevistos);
  var ut=Math.round(cd*P.porcUtilidad);var iva=Math.round(ut*P.porcIVA);
  var interv=(P.reqInterventoria !== "N" && P.reqInterventoria !== false) ? Math.round((cd+adm+imp+ut+iva)*(P.porcInterventoria||0.08)) : 0;
  var tot=cd+adm+imp+ut+iva+interv;
  var costoMl=lt>0?Math.round(tot/lt):0;
  var okV=dR.filter(function(r){return r.okV;}).length;
  var okFt=dR.filter(function(r){return r.okFt;}).length;
  var okQ=dR.filter(function(r){return r.okQ;}).length;
  var okFr=dR.filter(function(r){return r.okFr;}).length;
  var grupos={};dN.forEach(function(r){var d=r.nom||"315 mm";if(!grupos[d])grupos[d]=0;grupos[d]+=r.L||0;});
  var gArr=[];for(var gk in grupos)gArr.push({nom:gk,l:grupos[gk]});
  gArr.sort(function(a,b){return b.l-a.l;});
  var maxL=gArr.length>0?gArr[0].l:1;
  var barColors=["#00A6D6","#D4A843","#28A745","#F0932B","#DC3545","#8FD67A","#7088A8"];
  var donutR=45;var donutW=12;var donutC=donutR+donutW/2+5;
  var pctOk=dR.length>0?Math.round((okV+okFt+okQ+okFr)/(dR.length*4)*100):0;
  var donutDash=2*Math.PI*donutR;
  var donutOff=donutDash*(1-pctOk/100);
  var PS=function(p2){return <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:"1px solid rgba(255,255,255,.05)"}}><span style={{color:"#7088A8",fontSize:13}}>{p2.l}</span><span style={{color:p2.c||"#fff",fontWeight:600,fontFamily:"monospace",fontSize:13}}>{p2.v}</span></div>;};
  var PB=function(p2){
    var pct = Math.round(p2.v * 100);
    return <div style={{display:"flex",flexDirection:"column",padding:"4px 0",borderBottom:"1px dashed rgba(255,255,255,.05)"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{color:"#7088A8",fontSize:12}}>{p2.l}</span><span style={{color:p2.c||"#fff",fontWeight:600,fontFamily:"monospace",fontSize:12}}>{pct}%</span></div>
      <div style={{height:4,background:"rgba(255,255,255,0.05)",borderRadius:2}}><div style={{height:"100%",width:pct+"%",background:p2.c||"#00A6D6",borderRadius:2}}></div></div>
    </div>;
  };

  const exportDashboardPDF = async () => {
    const dashElement = document.getElementById('dash-content');
    if(!dashElement) return;
    
    const isLight = true;
    if(isLight) dashElement.classList.add('light-export');

    try {
      const canvas = await html2canvas(dashElement, { scale: 2, backgroundColor: isLight ? '#FFFFFF' : '#07090F' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save((P.proyecto||'Dashboard').replace(/\s+/g,'_')+'_Dashboard.pdf');
    } catch (e) {
      console.error(e);
      alert("Error al exportar el Dashboard.");
    } finally {
      if(isLight) dashElement.classList.remove('light-export');
    }
  };

  return <div id="dash-content" style={{padding:"8px"}}>
    <div className="c" style={{borderTop:"3px solid #D4A843",padding:"12px 16px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div><div style={{fontSize:18,fontWeight:800,color:"#fff"}}>{P.proyecto}</div><div style={{fontSize:13,color:"#7088A8"}}>{P.municipio} - {P.barrio}</div></div>
      <div style={{display:"flex",gap:16,alignItems:"center"}}>
        <div style={{textAlign:"right"}}><div style={{fontSize:13,color:"#7088A8"}}>{P.fecha}</div><div style={{fontSize:13,color:"#fff"}}>{P.disenador}</div></div>
        <button className="btn btn-outline" onClick={exportDashboardPDF} style={{padding:"6px 12px",fontSize:12}}>📄 Exportar a PDF</button>
      </div>
    </div>
    <div className="kpig" style={{marginBottom:16}}>
      <div className="kpi" style={{borderTopColor:"#00A6D6"}}><div className="kpiv">{dN.length}</div><div className="kpil">Tramos Nuevos</div><div className="kpiu">de {dR.length} total</div></div>
      <div className="kpi" style={{borderTopColor:"#28A745"}}><div className="kpiv">{nP}</div><div className="kpil">Pozos</div></div>
      <div className="kpi" style={{borderTopColor:"#D4A843"}}><div className="kpiv">{lt.toFixed(0)}</div><div className="kpil">Longitud (m)</div><div className="kpiu">a reponer</div></div>
      <div className="kpi" style={{borderTopColor:"#F0932B"}}><div className="kpiv">{aTproy.toFixed(2)}</div><div className="kpil">Area Proy (ha)</div><div className="kpiu">{P.areaTotal>0?"1.Info":"acum"}</div></div>
    </div>
    <div className="kpig" style={{marginBottom:16}}>
      <div className="kpi"><div className="kpiv">{nAc}</div><div className="kpil">Acometidas</div></div>
      <div className="kpi"><div className="kpiv">{nSumTot}</div><div className="kpil">Sumideros</div></div>
      <div className="kpi"><div className="kpiv">{P.pobDirecta||Math.round(nAc*(P.habVivienda||4))}</div><div className="kpil">Pob.Directa</div><div className="kpiu">Acom x Hab/Viv</div></div>
      <div className="kpi"><div className="kpiv">{Math.round(aTproy*denPond)}</div><div className="kpil">Pob.Beneficiada</div><div className="kpiu">Area x {Math.round(denPond)} hab/ha</div></div>
      <div className="kpi"><div className="kpiv">{tE.toFixed(0)}</div><div className="kpil">Exc. (m3)</div></div>
      <div className="kpi"><div className="kpiv">{gArr.length}</div><div className="kpil">Diametros</div><div className="kpiu">distintos</div></div>
    </div>
    {/* >>> ADICIÓN v36.1: Panel Información General del Proyecto <<< */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))",gap:16,marginBottom:16}}>
      <div className="dp"><div className="dpt" style={{background:"linear-gradient(90deg, #003B73 0%, transparent 100%)"}}>Parámetros Proyecto</div>
        <PS l="Densidad" v={(P.densidad||0)+" hab/ha"}/>
        <PS l="Consumo" v={(P.consumo||0)+" L/hab/dia"}/>
        <PS l="Coef. Retorno" v={(P.coefRetorno||0)}/>
        <PS l="Hab/Vivienda" v={(P.habVivienda||0)}/>
        <PS l="Tipo Alcant." v={P.tipoAlc==="S"?"Sanitario":P.tipoAlc==="P"?"Pluvial":P.tipoAlc==="C"?"Combinado":"Semi-Comb"}/>
        <PS l="Estacion IDF" v={IDF[P.estacion]?IDF[P.estacion].name:P.estacion}/>
      </div>
      <div className="dp"><div className="dpt" style={{background:"linear-gradient(90deg, #003B73 0%, transparent 100%)"}}>Parámetros Hidráulicos</div>
        <PS l="Rel. Capacidad Q/Qo" v={(P.relCapacidad||0)}/>
        <PS l="% Prof. Y/Do" v={(P.porcProfundidad||0)}/>
        <PS l="Vel. Maxima" v={(P.velMaxima||0)+" m/s"}/>
        <PS l="Fza. Tractiva Min" v={(P.fuerzaTractMin||0)+" Pa"}/>
        <PS l="Froude Sub" v={(P.limFroudeSub||0)}/>
        <PS l="Froude Sup" v={(P.limFroudeSup||0)}/>
      </div>
      <div className="dp"><div className="dpt" style={{background:"linear-gradient(90deg, #003B73 0%, transparent 100%)"}}>Parámetros Obra</div>
        <PS l="Tiempo Obra" v={(P.tiempoObra||0)+" mes(es)"}/>
        <PS l="Long. Obra" v={lt.toFixed(1)+" m"}/>
        <PS l="Ancho Via" v={(P.anchoVia||0)+" m"}/>
        <PS l="Rotura Pav." v={rotP.toFixed(1)+" m2"}/>
        <PS l="Reposicion Pav." v={repP.toFixed(1)+" m2"}/>
        <PS l="Altura SNM" v={(P.alturaSNM||0).toFixed(0)+" m"}/>
        <PS l="Dist. Botadero" v={(P.distBotadero||0)+" km"}/>
        <PS l="Prof. Promedio" v={profProm.toFixed(2)+" m"}/>
      </div>
      <div className="dp"><div className="dpt" style={{background:"linear-gradient(90deg, #003B73 0%, transparent 100%)"}}>% Excavación</div>
        <PB l="Tierra" v={P.porcExcTierra||0.55} c="#D4A843"/>
        <PB l="Material Granular" v={P.porcExcGranular||0.30} c="#F0932B"/>
        <PB l="Roca" v={P.porcExcRoca||0.15} c="#DC3545"/>
        <PB l="Entibado (del total)" v={P.porcEntibado||1} c="#00A6D6"/>
        <PB l={P.nombreExcMaquina ? P.nombreExcMaquina.replace('%', '').trim() : "Excavación a Máquina"} v={P.porcAcarreoLibre||0.5} c="#8FD67A"/>
      </div>
      <div className="dp"><div className="dpt" style={{background:"linear-gradient(90deg, #003B73 0%, transparent 100%)"}}>% Aprovechamiento</div>
        <PB l="Tierra" v={P.porcAprovTierra||0.5} c="#D4A843"/>
        <PB l="Material Granular" v={P.porcAprovGranular||0.5} c="#F0932B"/>
        <PB l="Roca" v={P.porcAprovRoca||0} c="#DC3545"/>
      </div>
    </div>
    {/* >>> FIN ADICIÓN v36.1: Panel Información General <<< */}
    <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:8,marginBottom:8}}>
      <div className="dp"><div className="dpt">Distribucion Tuberias</div>
        {gArr.map(function(g,gi){return <div key={g.nom} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
          <span style={{width:60,fontSize:11,color:"#7088A8",textAlign:"right"}}>{g.nom}</span>
          <div style={{flex:1,height:16,background:"#151D30",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:(g.l/maxL*100)+"%",background:barColors[gi%barColors.length],borderRadius:3,transition:"width 0.3s"}}></div></div>
          <span style={{width:50,fontSize:11,color:"#fff",textAlign:"right",fontFamily:"monospace"}}>{g.l.toFixed(0)}m</span>
        </div>;})}
      </div>
      <div className="dp" style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        <div className="dpt">Verificaciones</div>
        <svg width={donutC*2} height={donutC*2} style={{marginTop:4}}>
          <circle cx={donutC} cy={donutC} r={donutR} fill="none" stroke="#1C2E4A" strokeWidth={donutW}/>
          <circle cx={donutC} cy={donutC} r={donutR} fill="none" stroke={pctOk>=90?"#28A745":pctOk>=70?"#F0932B":"#DC3545"} strokeWidth={donutW} strokeDasharray={donutDash} strokeDashoffset={donutOff} strokeLinecap="round" transform={"rotate(-90 "+donutC+" "+donutC+")"}/>
          <text x={donutC} y={donutC-4} textAnchor="middle" fill="#fff" fontSize="18" fontWeight="700" fontFamily="monospace">{pctOk}%</text>
          <text x={donutC} y={donutC+12} textAnchor="middle" fill="#7088A8" fontSize="9">CUMPLE</text>
        </svg>
        <div style={{fontSize:10,color:"#7088A8",marginTop:4}}>V:{okV} Ft:{okFt} Q:{okQ} Fr:{okFr} / {dR.length}</div>
      </div>
      <div className="dp"><div className="dpt">Profundidades</div>
        <div style={{display:"flex",flexDirection:"column",gap:4,marginTop:8}}>
          <div style={{textAlign:"center"}}><div style={{fontSize:22,fontWeight:700,color:"#fff",fontFamily:"monospace"}}>{pPr.toFixed(2)}</div><div style={{fontSize:10,color:"#7088A8"}}>PROMEDIO (m)</div></div>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <div style={{textAlign:"center"}}><div style={{fontSize:14,fontWeight:600,color:"#28A745"}}>{pMn.toFixed(2)}</div><div style={{fontSize:9,color:"#7088A8"}}>MIN</div></div>
            <div style={{textAlign:"center"}}><div style={{fontSize:14,fontWeight:600,color:"#DC3545"}}>{pMx.toFixed(2)}</div><div style={{fontSize:9,color:"#7088A8"}}>MAX</div></div>
          </div>
          <div style={{height:6,background:"#1C2E4A",borderRadius:3,marginTop:4,position:"relative"}}><div style={{position:"absolute",left:(pMn/pMx*100)+"%",width:((pPr-pMn)/pMx*100)+"%",height:"100%",background:"linear-gradient(90deg,#28A745,#F0932B)",borderRadius:3}}></div></div>
        </div>
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
      <div className="dp"><div className="dpt">Resumen Obra</div>
        <PS l="Excavacion" v={tE.toFixed(1)+" m3"}/>
        <PS l="Acometidas" v={nAc+" und"}/>
        <PS l="Sumideros" v={nSumTot+" und"}/>
        <PS l="Tipo" v={P.tipoAlc==="S"?"Sanitario":P.tipoAlc==="P"?"Pluvial":P.tipoAlc==="C"?"Combinado":"Semi-Comb"}/>
        <PS l="Pavimento" v={{"FX":"Asfalto(FX)", "RG":"Concreto(RG)", "PP":"Placa Huella(PP)", "AD":"Adoquín(AD)", "EM":"Empedrado(EM)", "AN":"Andén(AN)", "TL":"Tierra/Suelto(TL)", "MC":"Macadam(MC)", "MR":"Afirmado(MR)", "PR":"Piedra Pegada(PR)", "PS":"Pasto(PS)"}[P.tipoViaGral] || P.tipoViaGral || "S/D"}/>
        <PS l="Estacion IDF" v={IDF[P.estacion]?IDF[P.estacion].name:P.estacion}/>
      </div>
      {/* >>> ADICIÓN v36.1: Panel Acometidas desglosadas + Vallas <<< */}
      <div className="dp"><div className="dpt">Acometidas y Vallas</div>
        <div style={{fontSize:11,color:"#00A6D6",fontWeight:600,padding:"4px 0 2px",borderBottom:"1px solid rgba(255,255,255,.08)"}}>ACOMETIDAS ({nAc} total)</div>
        <PS l={"0 - " + (P.largoAco || 6) + " m"} v={(P.nAcom06||0)+" und"}/>
        <PS l={(P.largoAco || 6) + " - " + ((P.largoAco || 6) + 4) + " m"} v={(P.nAcom610||0)+" und"}/>
        <PS l={"> " + ((P.largoAco || 6) + 4) + " m"} v={(P.nAcom10||0)+" und"}/>
        <div style={{fontSize:11,color:"#00A6D6",fontWeight:600,padding:"6px 0 2px",borderBottom:"1px solid rgba(255,255,255,.08)"}}>SUMIDEROS ({nSumTot} total)</div>
        <PS l="Laterales" v={nSumLat+" und"}/>
        <PS l="Transversales" v={nSumTrans+" und"}/>
        <div style={{fontSize:11,color:"#00A6D6",fontWeight:600,padding:"6px 0 2px",borderBottom:"1px solid rgba(255,255,255,.08)"}}>VALLAS ({nVallas} total)</div>
        {(P.vallas1||0)>0?<PS l="Tipo 1 (>10.000m)" v={(P.vallas1)+" und"}/>:null}
        {(P.vallas2||0)>0?<PS l="Tipo 2 (5-10.000m)" v={(P.vallas2)+" und"}/>:null}
        {(P.vallas3||0)>0?<PS l="Tipo 3 (1-5.000m)" v={(P.vallas3)+" und"}/>:null}
        {(P.vallas4||0)>0?<PS l="Tipo 4 (<1.000m)" v={(P.vallas4)+" und"}/>:null}
        {nVallas===0?<div style={{fontSize:11,color:"#7088A8",padding:"3px 0"}}>Sin vallas</div>:null}
        <div style={{fontSize:11,color:"#00A6D6",fontWeight:600,padding:"6px 0 2px",borderBottom:"1px solid rgba(255,255,255,.08)"}}>POZOS</div>
        <PS l="Total nodos" v={nP+" und"}/>
        <PS l="Pozos nuevos" v={nPozNuevos+" und"} c="#28A745"/>
      </div>
      {/* >>> FIN ADICIÓN v36.1 <<< */}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr",gap:8,marginBottom:8}}>
      <div className="dp" style={{background:"linear-gradient(135deg,#0F1628,#1A2238)",border:"2px solid #D4A843"}}><div className="dpt" style={{background:"#D4A843",color:"#000"}}>Costos</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div>
            <PS l="Costo Directo" v={fm(cd)}/>
            <PS l={"Admin "+((P.porcAdmin*100).toFixed(0))+"%"} v={fm(adm)}/>
            <PS l={"Imprevistos "+((P.porcImprevistos*100).toFixed(0))+"%"} v={fm(imp)}/>
            <PS l={"Utilidad "+((P.porcUtilidad*100).toFixed(0))+"%"} v={fm(ut)}/>
            <PS l={"IVA/Util "+((P.porcIVA*100).toFixed(0))+"%"} v={fm(iva)}/>
            {interv>0?<PS l={"Interventoria "+((P.porcInterventoria||0.08)*100).toFixed(0)+"%"} v={fm(interv)} c="#D4A843"/>:null}
          </div>
          <div style={{display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center"}}>
            <div style={{fontSize:11,color:"#7088A8"}}>$/ML</div>
            <div style={{fontSize:22,fontWeight:700,color:"#fff",fontFamily:"monospace"}}>{fm(costoMl)}</div>
            <div style={{fontSize:11,color:"#7088A8",marginTop:8}}>COSTO TOTAL</div>
            <div style={{fontSize:28,fontWeight:700,color:"#D4A843",fontFamily:"monospace"}}>{fm(tot)}</div>
            {/* >>> ADICIÓN v36.1: Costo por habitante <<< */}
            {(P.pobDirecta||0)+Math.round(aTproy*denPond)>0?<div style={{marginTop:6}}><div style={{fontSize:11,color:"#7088A8"}}>$/HABITANTE</div><div style={{fontSize:16,fontWeight:600,color:"#00A6D6",fontFamily:"monospace"}}>{fm(Math.round(tot/((P.pobDirecta||0)+Math.round(aTproy*denPond))))}</div></div>:null}
            {/* >>> FIN ADICIÓN v36.1 <<< */}
          </div>
        </div>
      </div>
    </div>
  </div>;
}


export default DashTab;
