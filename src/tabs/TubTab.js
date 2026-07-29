import React, {useState, useEffect, useRef} from 'react';
import {K, TH} from '../ui';
import {agruparTuberias} from '../calcHelpers';

function TubTab(props){
  var R=props.R,sumLat=props.sumLat,sumTrans=props.sumTrans,P=props.P;
  var dR=R.filter(function(r){return !r.sep;});
  if(!dR.length)return <div className="c"><p style={{color:"#7088A8"}}>Cargue datos primero</p></div>;
  var grupos=agruparTuberias(R,sumLat,sumTrans,P);
  var totRed=0,totSum=0,totAcom=0;
  grupos.forEach(function(g){totRed+=g.red;totSum+=g.sum;totAcom+=g.acom;});
  return <div>
    <div className="kpig" style={{marginBottom:8}}>
      <K v={totRed.toFixed(1)} l="Red Principal" u="m" color="#00A6D6"/><K v={totSum.toFixed(1)} l="Sumideros" u="m" color="#D4A843"/><K v={totAcom.toFixed(1)} l="Acometidas" u="m" color="#28A745"/><K v={(totRed+totSum+totAcom).toFixed(1)} l="TOTAL" u="m" color="#fff"/>
    </div>
    <div className="c"><div className="ct">Resumen por Diametro</div>
      <div style={{overflowX:"auto"}}><table><thead><tr>
        <TH>Diametro</TH><TH>Red Principal (m)</TH><TH>Sumideros (m)</TH><TH>Acometidas (m)</TH><TH style={{color:"#D4A843"}}>TOTAL (m)</TH>
      </tr></thead><tbody>
        {grupos.map(function(g){var tot=g.red+g.sum+g.acom;return <tr key={g.nom}>
            <td style={{textAlign:"left",fontWeight:700,color:"#00A6D6"}}>{g.nom}</td>
            <td style={{color:g.red>0?"#D8E2F0":"#555"}}>{g.red>0?g.red.toFixed(2):"-"}</td>
            <td style={{color:g.sum>0?"#D8E2F0":"#555"}}>{g.sum>0?g.sum.toFixed(2):"-"}</td>
            <td style={{color:g.acom>0?"#D8E2F0":"#555"}}>{g.acom>0?g.acom.toFixed(2):"-"}</td>
            <td style={{fontWeight:700,color:"#D4A843"}}>{tot.toFixed(2)}</td>
          </tr>;})}
        <tr style={{background:"#003B73",fontWeight:700,color:"#fff"}}><td style={{textAlign:"left"}}>TOTAL</td><td>{totRed.toFixed(2)}</td><td>{totSum.toFixed(2)}</td><td>{totAcom.toFixed(2)}</td><td style={{color:"#D4A843"}}>{(totRed+totSum+totAcom).toFixed(2)}</td></tr>
      </tbody></table></div>
    </div>
    {grupos.matDetalle&&grupos.matDetalle.length>0?<div className="c" style={{marginTop:8}}><div className="ct">Red Principal por Material</div>
      <div style={{overflowX:"auto"}}><table><thead><tr><TH>Diametro</TH><TH>Material</TH><TH>Longitud (m)</TH></tr></thead><tbody>
        {grupos.matDetalle.map(function(g,i){return <tr key={i}><td style={{textAlign:"left",color:"#00A6D6"}}>{g.nom}</td><td style={{color:g.mat==="PVC"?"#28A745":g.mat==="GRES"?"#F0932B":g.mat==="PEAD"?"#D4A843":"#DC3545"}}>{g.mat}</td><td>{g.red.toFixed(2)}</td></tr>;})}
      </tbody></table></div>
    </div>:null}
  </div>;
}


export default TubTab;
