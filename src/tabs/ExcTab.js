import React, {useState, useEffect, useRef} from 'react';
import {SepRow, TH} from '../ui';
import {calcExcSumideros, calcPozosCompleto, calcCantSumidero} from '../calcHelpers';

function drawBar(val, tot, color) {
  let pct = tot > 0 ? (val/tot)*100 : 0;
  return <div style={{width:'100%',background:'#1C2E4A',height:8,borderRadius:4,marginTop:2}}><div style={{width:pct+'%',background:color,height:'100%',borderRadius:4}}/></div>;
}

function ExcTab(props){
  var R=props.R,P=props.P,sumLat=props.sumLat,sumTrans=props.sumTrans;
  var allR=R.filter(function(r){return !r.sep;});
  var dR=allR.filter(function(r){return r.reponer==="S";});
  if(!dR.length) return <div className="c"><p>Sin datos</p></div>;
  var tE=0,t025=0,t2550=0,t50p=0,tRot=0,tRep=0,tLe=0,lt=0,rArenaTot=0,rComunTot=0;
  dR.forEach(function(r){tE+=r.volE||0;t025+=r.v025||0;t2550+=r.v2550||0;t50p+=r.v50p||0;tRot+=r.rotP||0;tRep+=r.repP||0;tLe+=r.Le||0;lt+=r.L||0;rArenaTot+=r.rArena||0;rComunTot+=r.rComun||0;});
  var ep=calcPozosCompleto(R,props.T||[]);
  var excSumL=calcExcSumideros(sumLat, P);
  var excSumT=calcExcSumideros(sumTrans, P);
  var totGral=tE+ep.tVE+excSumL+excSumT;
  
  var rSumL = 0;
  if(sumLat) sumLat.forEach(function(f){ rSumL += calcCantSumidero(f, P).rell; });
  var rSumT = 0;
  if(sumTrans) sumTrans.forEach(function(f){ rSumT += calcCantSumidero(f, P).rell; });

  var fE=P.porcExpansion||.05;
  var nvT=totGral*P.porcExcTierra;
  var nvG=totGral*P.porcExcGranular;
  var nvR=totGral*P.porcExcRoca;
  var nvTot=nvT+nvG+nvR;
  var rellN=rComunTot + rSumL + rSumT;
  /* Expansión: material suelto ocupa (1+fE) más que en banco */
  var reuT=nvT*P.porcAprovTierra*(1+fE),reuG=nvG*P.porcAprovGranular*(1+fE),reuR=nvR*P.porcAprovRoca*(1+fE),reuTot=reuT+reuG+reuR;
  var sumMC=Math.max(0,rellN-reuTot);
  var matSob=(nvTot*(1+fE)-reuTot) + Math.max(0, reuTot - rellN);
    const fmt = (n) => Number(n||0).toLocaleString('es-CO', {maximumFractionDigits: 2, minimumFractionDigits: 2});
  const pT = P.porcExcTierra ?? 0.55;
  const pG = P.porcExcGranular ?? 0.30;
  const pR = P.porcExcRoca ?? 0.15;
  const pAprovT = P.porcAprovTierra ?? 0.5;
  const pAprovG = P.porcAprovGranular ?? 0.5;
  const pAprovR = P.porcAprovRoca ?? 0;
  const exp = P.porcExpansion ?? 0.05;
  
  let uDem = 0, uExc = 0;
  if ((P.urbanismoAvanzado === true || P.urbanismoAvanzado === "S") && props.urbanismoData) {
    props.urbanismoData.forEach(r => {
      if(!r.reqUrbanismo) return;
      if (r.pavDemolicion) uDem += (r.pavL * r.pavA * r.pavEspesorDem);
      if (r.reqRasante) uExc += (r.rasL * r.rasA * r.rasProf);
      if (r.reqAnden) uDem += ((r.andL||0)*(r.andA||0)*(r.andLados||1) * 0.10);
      if (r.reqSardinel) uDem += ((r.sarL||0)*(r.sarLados||1) * 0.08);
    });
  }
  let isUrbAv = P.urbanismoAvanzado === true || P.urbanismoAvanzado === "S";
  let demolTotal = isUrbAv ? uDem : (tRot * 0.15);

  let nEst = P.distBotadero || 8;

  let bot200 = matSob * (1+exp) * (P.porcAcarreo200 ?? 0.10) * nEst;
  let bot500 = matSob * (1+exp) * (P.porcAcarreo500 ?? 0) * nEst;
  let bot1000 = ((matSob * (1+exp) * (P.porcAcarreo1000 ?? 0.90)) + (demolTotal * (1+exp))) * nEst;

  return <div>
    <div className="c" style={{borderTop:"3px solid #2E86AB"}}><div className="ct">Resumen General Excavaciones</div>
      <div style={{overflowX:"auto"}}><table><thead><tr><TH>Componente</TH><TH>0-2.5m</TH><TH>2.5-5m</TH><TH>&gt;5m</TH><TH style={{color:"#D4A843"}}>TOTAL m3</TH></tr></thead><tbody>
        <tr><td style={{textAlign:"left",fontWeight:600}}>Tramos Tuberia</td><td>{t025.toFixed(2)}</td><td>{t2550.toFixed(2)}</td><td>{t50p.toFixed(2)}</td><td style={{fontWeight:700}}>{tE.toFixed(2)}</td></tr>
        <tr><td style={{textAlign:"left",fontWeight:600}}>Pozos</td><td>{ep.v025.toFixed(2)}</td><td>{ep.v2550.toFixed(2)}</td><td>{ep.v50p.toFixed(2)}</td><td style={{fontWeight:700}}>{ep.tVE.toFixed(2)}</td></tr>
        <tr><td style={{textAlign:"left",fontWeight:600}}>Sumideros Laterales</td><td>{excSumL.toFixed(2)}</td><td>-</td><td>-</td><td style={{fontWeight:700}}>{excSumL.toFixed(2)}</td></tr>
        <tr><td style={{textAlign:"left",fontWeight:600}}>Sumideros Transversales</td><td>{excSumT.toFixed(2)}</td><td>-</td><td>-</td><td style={{fontWeight:700}}>{excSumT.toFixed(2)}</td></tr>
        <tr style={{background:"#003B73",fontWeight:700,color:"#fff"}}><td style={{textAlign:"left"}}>TOTAL GENERAL</td><td>{(t025+ep.v025+excSumL+excSumT).toFixed(2)}</td><td>{(t2550+ep.v2550).toFixed(2)}</td><td>{(t50p+ep.v50p).toFixed(2)}</td><td style={{color:"#D4A843"}}>{totGral.toFixed(2)}</td></tr>
      </tbody></table></div></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
      <div className="dp"><div className="dpt">Materiales (Tramos+Pozos)</div>
        <div className="dpr" style={{display:'block'}}>
            <div style={{display:'flex',justifyContent:'space-between'}}><span>TIERRA {(P.porcExcTierra*100).toFixed(0)}%<br/><span style={{fontSize:9,color:'#5A7A9A',fontStyle:'italic'}}>(VolTotal × %Tierra)</span></span><span>{nvT.toFixed(2)} m3</span></div>
            {drawBar(nvT, nvTot, '#8FD67A')}
        </div>
        <div className="dpr" style={{display:'block'}}>
            <div style={{display:'flex',justifyContent:'space-between'}}><span>GRANULAR {(P.porcExcGranular*100).toFixed(0)}%<br/><span style={{fontSize:9,color:'#5A7A9A',fontStyle:'italic'}}>(VolTotal × %Granular)</span></span><span>{nvG.toFixed(2)} m3</span></div>
            {drawBar(nvG, nvTot, '#D4A843')}
        </div>
        <div className="dpr" style={{display:'block'}}>
            <div style={{display:'flex',justifyContent:'space-between'}}><span>ROCA {(P.porcExcRoca*100).toFixed(0)}%<br/><span style={{fontSize:9,color:'#5A7A9A',fontStyle:'italic'}}>(VolTotal × %Roca)</span></span><span>{nvR.toFixed(2)} m3</span></div>
            {drawBar(nvR, nvTot, '#DC3545')}
        </div>
        <div className="dpr" style={{fontWeight:700,borderTop:"1px solid #1C2E4A",marginTop:3,paddingTop:3}}><span>Total</span><span>{nvTot.toFixed(2)} m3</span></div>
      </div>
      <div className="dp"><div className="dpt">Rellenos</div>
        <div className="dpr" style={{display:'block'}}>
            <div style={{display:'flex',justifyContent:'space-between'}}><span>Arena Cimentacion<br/><span style={{fontSize:9,color:'#5A7A9A',fontStyle:'italic'}}>(Le × bz × (D+0.25) − VolTubo)</span></span><span>{(rArenaTot).toFixed(2)} m3</span></div>
            {drawBar(rArenaTot, rArenaTot+rellN, '#F0932B')}
        </div>
        <div className="dpr" style={{display:'block'}}>
            <div style={{display:'flex',justifyContent:'space-between'}}><span>Relleno Total (Tramos + Sumideros)<br/><span style={{fontSize:9,color:'#5A7A9A',fontStyle:'italic'}}>(Le × bz × (HP−D−0.25) + rellSumideros)</span></span><span>{(rellN).toFixed(2)} m3</span></div>
            {drawBar(rellN, rArenaTot+rellN, '#00A6D6')}
        </div>
        <div className="dpr" style={{fontWeight:700,borderTop:"1px solid #1C2E4A",marginTop:3,paddingTop:3}}><span>Relleno Necesario<br/><span style={{fontSize:9,color:'#5A7A9A',fontStyle:'italic',fontWeight:400}}>(Relleno Común + Relleno Sumideros)</span></span><span>{rellN.toFixed(2)} m3</span></div>
        <div className="dpr"><span>Reutilizable<br/><span style={{fontSize:9,color:'#5A7A9A',fontStyle:'italic'}}>(Tierra×%Aprov + Gran.×%Aprov + Roca×%Aprov) × (1+{(fE*100).toFixed(0)}% Exp)</span></span><span style={{color:"#28A745"}}>{reuTot.toFixed(2)} m3</span></div>
        <div className="dpr"><span>Suministro Mat.Comun<br/><span style={{fontSize:9,color:'#5A7A9A',fontStyle:'italic'}}>(max(0, Relleno Necesario − Reutilizable))</span></span><span style={{color:"#D4A843"}}>{sumMC.toFixed(2)} m3</span></div>
        <div className="dpr" style={{fontWeight:700,borderTop:"1px solid #1C2E4A",marginTop:3,paddingTop:3}}><span>Mat.Sobrante<br/><span style={{fontSize:9,color:'#5A7A9A',fontStyle:'italic',fontWeight:400}}>(Excavado×(1+{(fE*100).toFixed(0)}% Exp) − Reutilizado + Excedente)</span></span><span style={{color:"#DC3545"}}>{matSob.toFixed(2)} m3</span></div>
      </div>
    </div>
    
    <div style={{padding:'20px', color:'#e2e8f0', fontSize:'13px', maxWidth:'1000px', margin:'20px auto 0', background:'#050a15', borderRadius:'12px'}}>
      <h2 style={{marginTop:0, color:'#60a5fa', borderBottom:'1px solid #334155', paddingBottom:'10px'}}>Resumen de Material Sobrante y Acarreos</h2>
      <p style={{color:'#94a3b8', marginBottom:'20px', fontSize:'14px'}}>
        Este módulo desglosa el cálculo exacto de cómo se obtiene el material sobrante que debe ser llevado a botadero. 
      </p>

      <div style={{display:'flex', gap:'20px', flexWrap:'wrap'}}>
        
        {/* REUTILIZACIÓN Y SOBRANTE NETO */}
        <div style={{flex:'1 1 450px', background:'rgba(16,185,129,0.1)', border:'1px solid #10b981', borderRadius:'8px', padding:'15px'}}>
          <h3 style={{margin:'0 0 15px 0', color:'#34d399'}}>Sobrante Neto (Volumen Suelto)</h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 15px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '13px' }}>
            <span style={{ color: '#94a3b8' }}>Reutilización Tierra:</span>
            <span style={{ fontWeight: 'bold', color: '#fff' }}>{fmt(reuT,2)} M3</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 15px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '13px' }}>
            <span style={{ color: '#94a3b8' }}>Reutilización Subbase:</span>
            <span style={{ fontWeight: 'bold', color: '#fff' }}>{fmt(reuG,2)} M3</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 15px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '13px' }}>
            <span style={{ color: '#94a3b8' }}>Reutilización Roca:</span>
            <span style={{ fontWeight: 'bold', color: '#fff' }}>{fmt(reuR,2)} M3</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: 'rgba(16, 185, 129, 0.1)', fontSize: '14px', marginTop:'10px' }}>
            <span style={{ color: '#10b981', fontWeight: 'bold' }}>MAT. SOBRANTE EXCAV.</span>
            <span style={{ fontWeight: 'bold', color: '#34d399' }}>{fmt(matSob * (1+exp),2)} M3 (Esp. {(exp*100).toFixed(0)}%)</span>
          </div>
        </div>

        {/* DEMOLICIONES */}
        <div style={{flex:'1 1 450px', background:'rgba(245,158,11,0.1)', border:'1px solid #f59e0b', borderRadius:'8px', padding:'15px'}}>
          <h3 style={{margin:'0 0 15px 0', color:'#fbbf24'}}>Demoliciones</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 15px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '13px' }}>
            <span style={{ color: '#94a3b8' }}>Demoliciones de Pavimento (Tramos):</span>
            <span style={{ fontWeight: 'bold', color: '#fff' }}>{isUrbAv ? 'N/A' : fmt(tRot*0.15,2)} M3</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 15px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '13px' }}>
            <span style={{ color: '#94a3b8' }}>Demoliciones Obras de Urbanismo:</span>
            <span style={{ fontWeight: 'bold', color: '#fff' }}>{fmt(uDem,2)} M3</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: 'rgba(245, 158, 11, 0.1)', fontSize: '14px', marginTop:'10px' }}>
            <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>SUBTOTAL DEMOLICIÓN</span>
            <span style={{ fontWeight: 'bold', color: '#fbbf24' }}>{fmt(demolTotal * (1+exp),2)} M3 (Esp. {(exp*100).toFixed(0)}%)</span>
          </div>
        </div>
      </div>

      {/* BOTADEROS Y ACARREOS */}
      <div style={{marginTop:'30px', background:'rgba(255,255,255,0.02)', border:'1px solid #334155', borderRadius:'8px', padding:'20px'}}>
        <h3 style={{margin:'0 0 15px 0', color:'#94a3b8', fontSize:'16px'}}>Acarreos y Distancias a Botadero ({nEst} Estaciones)</h3>
        <p style={{color:'#64748b', fontSize:'13px'}}>
          La norma indica que las demoliciones (escombros) y el material de urbanismo van a un botadero lejano, 
          mientras que el sobrante de zanjas (suelto) puede distribuirse en botaderos intermedios según porcentajes.
        </p>
        
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'20px', marginTop:'20px'}}>
          <div style={{background:'#0f172a', padding:'15px', borderRadius:'6px', borderLeft:'4px solid #94a3b8'}}>
            <div style={{color:'#64748b', fontSize:'12px', marginBottom:'5px'}}>Volumen a botadero &lt; 200m</div>
            <div style={{fontSize:'18px', fontWeight:'bold', color:'#f8fafc'}}>{fmt(bot200,2)} M3-Est</div>
          </div>
          <div style={{background:'#0f172a', padding:'15px', borderRadius:'6px', borderLeft:'4px solid #94a3b8'}}>
            <div style={{color:'#64748b', fontSize:'12px', marginBottom:'5px'}}>Volumen a botadero &lt; 500m</div>
            <div style={{fontSize:'18px', fontWeight:'bold', color:'#f8fafc'}}>{fmt(bot500,2)} M3-Est</div>
          </div>
          <div style={{background:'#0f172a', padding:'15px', borderRadius:'6px', borderLeft:'4px solid #ef4444'}}>
            <div style={{color:'#64748b', fontSize:'12px', marginBottom:'5px'}}>Volumen a botadero &gt; 1km</div>
            <div style={{fontSize:'18px', fontWeight:'bold', color:'#f8fafc'}}>{fmt(bot1000,2)} M3-Est</div>
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 20px', background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.2), transparent)', borderLeft: '4px solid #ef4444', marginTop: '20px', borderRadius:'6px' }}>
          <span style={{ color: '#fca5a5', fontWeight: 'bold', fontSize:'16px' }}>VOLUMEN TOTAL A BOTADERO (Suelto)</span>
          <span style={{ fontWeight: '900', color: '#fff', fontSize:'18px' }}>{fmt(bot200 + bot500 + bot1000,2)} M3-Est</span>
        </div>
      </div>
    </div>
  </div>;
}

export default ExcTab;
