import React, { useState } from 'react';
import {SepRow, TH} from '../ui';
import TrenchSection from '../components/Schematics/TrenchSection';
import TrenchProfile from '../components/Schematics/TrenchProfile';

function TramosTab(props){
  var R=props.R;
  var allR=R.filter(function(r){return !r.sep;});
  var dR=allR.filter(function(r){return r.reponer==="S";});
  
  const [selectedTramo, setSelectedTramo] = useState(allR.length > 0 ? allR[0] : null);

  if(!dR.length) return <div className="c"><p>Sin datos</p></div>;
  
  var tE=0,t025=0,t2550=0,t50p=0,tRot=0,tRep=0,tLe=0,tArena=0,tRelleno=0;
  dR.forEach(function(r){
    tE+=r.volE||0;
    t025+=r.v025||0;
    t2550+=r.v2550||0;
    t50p+=r.v50p||0;
    tRot+=r.rotP||0;
    tRep+=r.repP||0;
    tLe+=r.Le||0;
    tArena+=r.rArena||0;
    tRelleno+=r.rComun||0;
  });

  return (
    <div>
      {/* Schematics Section */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 450px' }}>
          <TrenchSection tramo={selectedTramo} P={props.P} />
        </div>
        <div style={{ flex: '1 1 550px' }}>
          <TrenchProfile tramo={selectedTramo} />
        </div>
      </div>

      <div className="c" style={{marginTop:8}}>
        <div className="ct">Detalle por Tramo (Clic en un tramo para ver esquema)</div>
        <div style={{overflowX:"auto",maxHeight:"70vh",overflowY:"auto"}}>
          <table>
            <thead>
              <tr>
                <TH>#</TH><TH>DE</TH><TH>A</TH><TH>Le</TH><TH>H1</TH><TH>H2</TH><TH>HP</TH><TH>B</TH><TH>Vol</TH><TH>0-2.5</TH><TH>2.5-5</TH><TH>&gt;5</TH><TH>Arena (m³)</TH><TH>Relleno (m³)</TH><TH>Rot</TH><TH>Rep</TH>
              </tr>
            </thead>
            <tbody>
              {allR.map(function(r){
                if(r.sep) return <SepRow key={r.id} cols={15}/>;
                const isSelected = selectedTramo && selectedTramo.id === r.id;
                return (
                  <tr key={r.id} 
                      onClick={() => setSelectedTramo(r)}
                      style={{
                        opacity:r.reponer==="S"?1:.3, 
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                        borderLeft: isSelected ? '4px solid #38bdf8' : '4px solid transparent'
                      }}>
                    <td>{r.id}</td><td style={{textAlign:"left",fontSize:13}}>{r.de}</td>
                    <td style={{textAlign:"left",fontSize:13}}>{r.a}</td><td>{r.Le}</td>
                    <td>{r.H1}</td><td>{r.H2}</td><td>{r.HP}</td><td>{r.bz}</td>
                    <td style={{fontWeight:600}}>{r.volE}</td><td>{r.v025}</td>
                    <td>{r.v2550}</td><td>{r.v50p}</td>
                    <td style={{color:"#F0932B",fontWeight:600}}>{r.rArena ? r.rArena.toFixed(2) : '0.00'}</td>
                    <td style={{color:"#00A6D6",fontWeight:600}}>{r.rComun ? r.rComun.toFixed(2) : '0.00'}</td>
                    <td>{r.rotP}</td><td>{r.repP}</td>
                  </tr>
                );
              })}
              <tr style={{background:"#003B73",fontWeight:700,color:"#fff"}}>
                <td colSpan={3}>TOTAL</td><td>{tLe.toFixed(1)}</td>
                <td colSpan={3}></td><td></td><td>{tE.toFixed(1)}</td>
                <td>{t025.toFixed(1)}</td><td>{t2550.toFixed(1)}</td>
                <td>{t50p.toFixed(1)}</td>
                <td style={{color:"#F0932B"}}>{tArena.toFixed(2)}</td>
                <td style={{color:"#00A6D6"}}>{tRelleno.toFixed(2)}</td>
                <td>{tRot.toFixed(1)}</td>
                <td>{tRep.toFixed(1)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default TramosTab;
