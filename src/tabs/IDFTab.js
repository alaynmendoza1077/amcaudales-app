import React, {useState, useEffect, useRef} from 'react';
import {TH} from '../ui';
import {cIDF, cAlternatingBlocks} from '../engine';
import {IDF} from '../constants';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function IDFTab(props){
console.log('IDFTab imports: HOTPINK TEST', { TH, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer });

  var P=props.P;var sP=props.sP;
  var est=P.estacion || "BUC";
  var combinedIDF = Object.assign({}, IDF, P.customIDF || {});
  var s=combinedIDF[est]; 
  
  const [showForm, setShowForm] = useState(false);
  const [cName, setCName] = useState("");
  const [cAbbr, setCAbbr] = useState("");
  const [ca, setCa] = useState("");
  const [cb1, setCb1] = useState("");
  const [cb2, setCb2] = useState("");
  const [cc, setCc] = useState("");
  
  const [hTr, setHTr] = useState(5);
  const [hDur, setHDur] = useState(120);
  const [hDt, setHDt] = useState(5);

  const handleSaveCustom = () => {
    if(!cName || !cAbbr) { alert("Ingrese nombre y abreviatura"); return; }
    
    const aVal = parseFloat(ca || 0);
    const b1Val = parseFloat(cb1 || 0); // Exponente de Tr
    const b2Val = parseFloat(cb2 || 0); // Exponente de Tc
    const cVal = parseFloat(cc || 0);   // Constante

    const get_a_for_tr = (tr) => aVal * Math.pow(tr, b1Val);

    const newStation = {
      name: cName,
      c: [
        { Tr: 3, a: get_a_for_tr(3), b1: 1, b2: b2Val, c: cVal },
        { Tr: 5, a: get_a_for_tr(5), b1: 1, b2: b2Val, c: cVal },
        { Tr: 10, a: get_a_for_tr(10), b1: 1, b2: b2Val, c: cVal },
        { Tr: 25, a: get_a_for_tr(25), b1: 1, b2: b2Val, c: cVal },
        { Tr: 50, a: get_a_for_tr(50), b1: 1, b2: b2Val, c: cVal },
        { Tr: 100, a: get_a_for_tr(100), b1: 1, b2: b2Val, c: cVal },
      ]
    };
    const newP = Object.assign({}, P);
    if (!newP.customIDF) newP.customIDF = {};
    const finalAbbr = cAbbr.toUpperCase();
    newP.customIDF[finalAbbr] = newStation;
    newP.estacion = finalAbbr;
    sP(newP);
    setShowForm(false);
    alert("Estación guardada.\nPara ver esta estación en otros proyectos, asegúrese de Guardar el archivo completo .amc (Guardar Proyecto).");
  };

  if(!s) return null;
  var tcs=[5,10,15,20,30,45,60,90,120,180,240,360];
  var graphData = tcs.map(function(tc){
    var d = { name: tc };
    s.c.forEach(function(c){
      if(c.Tr === 3 || c.Tr === 5 || c.Tr === 10) {
        d['Tr ' + c.Tr] = parseFloat(cIDF(est, c.Tr, tc, P).toFixed(2));
      }
    });
    return d;
  });
  
  var hyetoValues = cAlternatingBlocks(est, hTr, hDur, hDt, P);
  var hyetoGraphData = hyetoValues.map((v, i) => ({ time: (i+1)*hDt, intensity: parseFloat(v.toFixed(2)) }));
  
  return <div className="c"><div className="ct">IDF y Hietograma de Diseño - {s.name}</div>
    <div className="f" style={{maxWidth:600,marginBottom:10, display:"flex", gap:10, alignItems:"flex-end"}}>
      <div style={{flex:1}}>
        <label>Estación Seleccionada (para el Proyecto)</label>
        <select className="es" value={est} onChange={function(e){var v=e.target.value;if(sP){var newP=Object.assign({},P);newP.estacion=v;sP(newP);}}} style={{padding:5,fontSize:12, width:"100%"}}>
          {Object.keys(combinedIDF).map(function(k){return <option key={k} value={k}>{combinedIDF[k].name} ({k})</option>;})}
        </select>
      </div>
      <button className="btn" style={{background:"#10b981", color:"white", padding:"5px 10px", height:28}} onClick={() => setShowForm(!showForm)}>
        {showForm ? "Cerrar" : "+ Nueva Estación"}
      </button>
    </div>

    {showForm && (
      <div style={{background:"rgba(16, 185, 129, 0.1)", border:"1px solid #10b981", borderRadius:6, padding:15, marginBottom:20}}>
        <h3 style={{marginTop:0, color:"#10b981", fontSize:14}}>Crear Estación Personalizada</h3>
        <p style={{fontSize:11, color:"#94a3b8", marginBottom:10}}>Fórmula: I = (a * Tr^b1) / (Tc + c)^b2</p>
        <div style={{display:"flex", gap:15, marginBottom:10, flexWrap:"wrap"}}>
          <div className="f" style={{flex: 1, minWidth: 150, maxWidth: 250}}><label style={{fontSize:11}}>Nombre</label><input className="ec" value={cName} onChange={e=>setCName(e.target.value)} placeholder="Ej. Mi Estación" style={{padding:"4px 8px", fontSize:12}}/></div>
          <div className="f" style={{width: 110}}><label style={{fontSize:11}}>Abreviatura</label><input className="ec" value={cAbbr} onChange={e=>setCAbbr(e.target.value)} placeholder="Ej. MIE" style={{padding:"4px 8px", fontSize:12}}/></div>
        </div>
        <div style={{display:"flex", gap:15, marginBottom:15, flexWrap:"wrap"}}>
          <div className="f" style={{width: 110}}><label style={{fontSize:11}}>a (Constante)</label><input className="ec" type="number" value={ca} onChange={e=>setCa(e.target.value)} style={{padding:"4px 8px"}}/></div>
          <div className="f" style={{width: 110}}><label style={{fontSize:11}}>b1 (Exp. de Tr)</label><input className="ec" type="number" value={cb1} onChange={e=>setCb1(e.target.value)} style={{padding:"4px 8px"}}/></div>
          <div className="f" style={{width: 110}}><label style={{fontSize:11}}>b2 (Exp. de Tc)</label><input className="ec" type="number" value={cb2} onChange={e=>setCb2(e.target.value)} style={{padding:"4px 8px"}}/></div>
          <div className="f" style={{width: 110}}><label style={{fontSize:11}}>c (Cte. de Tc)</label><input className="ec" type="number" value={cc} onChange={e=>setCc(e.target.value)} style={{padding:"4px 8px"}}/></div>
        </div>
        <div style={{display:"flex", justifyContent:"flex-end"}}>
          <button className="btn" style={{background:"#10b981", color:"white", padding:"4px 15px", fontSize:12, borderRadius:4}} onClick={handleSaveCustom}>Guardar Estación</button>
        </div>
      </div>
    )}

    <div style={{height: 300, width: '100%', marginBottom: 20}}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={graphData} margin={{top: 5, right: 30, left: 20, bottom: 5}}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" label={{ value: 'Tc (min)', position: 'insideBottomRight', offset: 0 }} />
          <YAxis label={{ value: 'Intensidad (mm/h)', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="Tr 3" stroke="#8884d8" strokeWidth={2} dot={{r:3}} />
          <Line type="monotone" dataKey="Tr 5" stroke="#82ca9d" strokeWidth={2} dot={{r:3}} />
          <Line type="monotone" dataKey="Tr 10" stroke="#ff7300" strokeWidth={2} dot={{r:3}} />
        </LineChart>
      </ResponsiveContainer>
    </div>
    <div style={{overflowX:"auto"}}><table><thead><tr><TH>Tc(min)</TH>{s.c.map(function(c){return <TH key={c.Tr}>Tr={c.Tr}</TH>;})}</tr></thead>
      <tbody>{tcs.map(function(tc){return <tr key={tc}><td style={{fontWeight:600}}>{tc}</td>{s.c.map(function(c){return <td key={c.Tr}>{cIDF(est,c.Tr,tc, P).toFixed(2)}</td>;})}</tr>;})}</tbody></table></div>

    <div style={{marginTop:30, borderTop:"1px solid #1e293b", paddingTop:20}}>
      <h3 style={{marginTop:0, color:"#38bdf8", fontSize:16}}>Hietograma de Diseño (Bloques Alternos)</h3>
      <div className="f" style={{display:"flex", gap:15, marginBottom:15, flexWrap:"wrap"}}>
         <div className="f" style={{width: 120}}><label style={{fontSize:11}}>Periodo Retorno (Tr)</label><input className="ec" type="number" value={hTr} onChange={e=>setHTr(+e.target.value)} style={{padding:"4px 8px"}}/></div>
         <div className="f" style={{width: 120}}><label style={{fontSize:11}}>Duración Total (min)</label><input className="ec" type="number" value={hDur} onChange={e=>setHDur(+e.target.value)} style={{padding:"4px 8px"}}/></div>
         <div className="f" style={{width: 120}}><label style={{fontSize:11}}>Paso de tiempo (dt)</label><input className="ec" type="number" value={hDt} onChange={e=>setHDt(+e.target.value)} style={{padding:"4px 8px"}}/></div>
      </div>
      <div style={{height: 300, width: '100%', marginBottom: 20}}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={hyetoGraphData} margin={{top: 5, right: 30, left: 20, bottom: 5}}>
            <CartesianGrid strokeDasharray="3 3" vertical={false}/>
            <XAxis dataKey="time" label={{ value: 'Tiempo (min)', position: 'insideBottomRight', offset: -5 }} />
            <YAxis label={{ value: 'Intensidad (mm/h)', angle: -90, position: 'insideLeft' }} />
            <Tooltip cursor={{fill: 'rgba(56, 189, 248, 0.2)'}}/>
            <Bar dataKey="intensity" fill="#38bdf8" name="Intensidad (mm/h)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>;
}

export default IDFTab;
