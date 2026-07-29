import React, {useState, useEffect, useRef} from 'react';
import {K, TH} from '../ui';
import {calcCantSumidero} from '../calcHelpers';
import CatchBasin from '../components/Schematics/CatchBasin';
import ExcelJS from 'exceljs';
import { saveFileWithDialog } from '../utils/fileSaver';

function SumTab(props){
  var sumLat=props.sumLat,setSumLat=props.setSumLat;
  var sumTrans=props.sumTrans,setSumTrans=props.setSumTrans;
  var subS=props.subS,setSubS=props.setSubS;
  var P=props.P||{}; var sP=props.sP||function(){};
  var anchoVia=props.anchoVia||6;
  var TIPOS_LAT=["SL-200","SL-400","SL-600"];
  var TIPOS_TRANS=["ST-40","ST2-40"];
  var COLS_LAT=["Cim","Exc","Exc.C","TotExc","Rell","C.Pob","C.4k","A37","PDR","Cinta","Rot","Rep","Comp"];
  var CKEYS_LAT=["cim","exc","excC","totExc","rell","cp","c4","a37","pdr","cinta","rot","rep","comp"];
  var COLS_TRANS=["Cim","Exc","TotExc","Rell","C.Pob","C.4k","A37","PDR","Rejas","Cinta","Rot","Rep","Comp"];
  var CKEYS_TRANS=["cim","exc","totExc","rell","cp","c4","a37","pdr","rejas","cinta","rot","rep","comp"];
  var updLat=function(i,k,v){var n=sumLat.slice();n[i]=Object.assign({},n[i]);n[i][k]=v;if(k==='caudal'){n[i]['diam']=calcDiametroSumidero(v);}setSumLat(n);};
  var updTrans=function(i,k,v){var n=sumTrans.slice();n[i]=Object.assign({},n[i]);n[i][k]=v;if(k==='caudal'){n[i]['diam']=calcDiametroSumidero(v);}setSumTrans(n);};
  var calcTots=function(arr,ckeys){return ckeys.map(function(_,ci){return arr.reduce(function(s,f){var c=calcCantSumidero(f, P);return s+(c[ckeys[ci]]||0);},0);});};
  var totalesLat=calcTots(sumLat,CKEYS_LAT);
  var totalesTrans=calcTots(sumTrans,CKEYS_TRANS);
  var nTotLat=sumLat.reduce(function(s,f){return s+(f.cant||0);},0);
  var nTotTrans=sumTrans.reduce(function(s,f){return s+(f.cant||0);},0);
  
  const handleExpSum = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      const headerStyle = { font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003B73' } } };

      const addHeader = (ws, title) => {
        ws.addRow([`Proyecto: ${P?.proyecto || ''}`]).font = { bold: true };
        ws.addRow([`Diseñador: ${P?.disenador || ''}`]).font = { bold: true };
        ws.addRow([`Fecha: ${P?.fecha || new Date().toLocaleDateString('es-CO')}`]).font = { bold: true };
        ws.addRow([]);
        ws.addRow([]);
        const tRow = ws.addRow([title]);
        tRow.font = { bold: true, size: 14 };
        ws.addRow([]);
      };

      const addAbrevs = (ws, startRow) => {
        ws.addRow([]);
        ws.addRow(["ABREVIATURAS UTILIZADAS:"]);
        ws.getCell(`A${startRow + 1}`).font = { bold: true, color: { argb: 'FF005A8C' } };
        const abrevs = [
          ["Cim", "Cimentación (m3)"],
          ["Exc", "Excavación (m3)"],
          ["TotExc", "Total Excavación (m3)"],
          ["Rell", "Relleno (m3)"],
          ["C.Pob", "Concreto Pobre (m3)"],
          ["C.4k", "Concreto 4000 PSI (m3)"],
          ["A37", "Acero A-37 (kg)"],
          ["PDR", "Acero PDR-60 (kg)"],
          ["Cinta", "Cinta PVC (m)"],
          ["Rot", "Rotura de pavimento (m2)"],
          ["Rep", "Reposición de pavimento (m2)"],
          ["Comp", "Compactación (m3)"],
          ["Rejas", "Cantidad de rejas (unidades)"]
        ];
        abrevs.forEach(ab => {
          const r = ws.addRow(ab);
          r.getCell(1).font = { bold: true };
        });
      };

      // Sumideros Laterales
      const wsLat = wb.addWorksheet("Sumideros Laterales");
      addHeader(wsLat, "Cantidades Sumideros Laterales");
      
      const latHeader = ["#", "Cant", "Tipo", "Diam", "Pozo", "Long", ...COLS_LAT];
      const hLat = wsLat.addRow(latHeader);
      hLat.eachCell(c => Object.assign(c, headerStyle));
      
      sumLat.forEach((f, i) => {
        let c = calcCantSumidero(f, P);
        let row = [i+1, f.cant, f.tipo, f.diam || 200, f.pozo, f.long];
        CKEYS_LAT.forEach(k => row.push((c[k] || 0) > 0 ? (c[k] || 0).toFixed(2) : "-"));
        wsLat.addRow(row);
      });
      let totRowLat = ["TOTAL", nTotLat, "", "", "", ""];
      totalesLat.forEach(v => totRowLat.push(v > 0 ? v.toFixed(2) : "-"));
      const rTotLat = wsLat.addRow(totRowLat);
      rTotLat.eachCell(c => { c.font = { bold: true }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } }; });
      addAbrevs(wsLat, sumLat.length + 8);
      wsLat.columns.forEach(col => { col.width = 12; });

      // Sumideros Transversales
      const wsTrans = wb.addWorksheet("Sumideros Transversales");
      addHeader(wsTrans, "Cantidades Sumideros Transversales");
      
      const transHeader = ["#", "Cant", "Tipo", "Diam", "Pozo", "Long", ...COLS_TRANS];
      const hTrans = wsTrans.addRow(transHeader);
      hTrans.eachCell(c => Object.assign(c, headerStyle));
      
      sumTrans.forEach((f, i) => {
        let c = calcCantSumidero(f, P);
        let row = [i+1, f.cant, f.tipo, f.diam || 315, f.pozo, f.long];
        CKEYS_TRANS.forEach(k => row.push((c[k] || 0) > 0 ? (c[k] || 0).toFixed(2) : "-"));
        wsTrans.addRow(row);
      });
      let totRowTrans = ["TOTAL", nTotTrans, "", "", "", ""];
      totalesTrans.forEach(v => totRowTrans.push(v > 0 ? v.toFixed(2) : "-"));
      const rTotTrans = wsTrans.addRow(totRowTrans);
      rTotTrans.eachCell(c => { c.font = { bold: true }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } }; });
      addAbrevs(wsTrans, sumTrans.length + 8);
      wsTrans.columns.forEach(col => { col.width = 12; });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveFileWithDialog(blob, "Reporte_Sumideros.xlsx");
    } catch(e) {
      console.error("Error al exportar XLSX de sumideros:", e);
      alert("Hubo un error al generar el archivo Excel de sumideros.");
    }
  };

  var [selectedSum, setSelectedSum] = useState(sumLat.length > 0 ? { item: sumLat[0], isTransversal: false } : null);
  
  var renderHeaderToggles=function(ckeys) {
    return <tr style={{background:"rgba(0,0,0,0.2)"}}>
      <td colSpan={7} style={{textAlign:"right", fontSize:11, color:"#A0AAB5"}}>Incluir en Pto:</td>
      {ckeys.map(function(k){
        var isIncl = P["inclSum_" + k] !== false;
        return <td key={k} style={{textAlign:"center"}}>
          <input type="checkbox" checked={isIncl} onChange={function(e){
            sP(function(p){var n=Object.assign({},p);n["inclSum_"+k]=e.target.checked;return n;});
          }} />
        </td>;
      })}
    </tr>;
  };

  var renderTablaLat=function(filas,upd,tots){
    return <div style={{overflowX:"auto",maxHeight:"50vh",overflowY:"auto"}}><table><thead><tr>
      <TH>#</TH><TH>Cant</TH><TH>Tipo</TH><TH>Q (L/s)</TH><TH>Diam</TH><TH>Pozo</TH><TH>Long</TH>
      {COLS_LAT.map(function(c){return <TH key={c}>{c}</TH>;})}
    </tr></thead><tbody>
      {renderHeaderToggles(CKEYS_LAT)}
      {filas.map(function(f,i){var c=calcCantSumidero(f, P);
        var isSelected = selectedSum && !selectedSum.isTransversal && selectedSum.item === f;
        return <tr key={i} onClick={() => setSelectedSum({ item: f, isTransversal: false })} style={{ cursor: 'pointer', background: isSelected ? 'rgba(56,189,248,0.15)' : 'transparent', borderLeft: isSelected ? '4px solid #38bdf8' : '4px solid transparent' }}>
        <td>{i+1}</td>
        <td><input className="ec" type="number" min="0" max="5" value={f.cant} onChange={function(e){upd(i,"cant",+e.target.value);}} style={{width:42,fontSize:12,padding:3}}/></td>
        <td><select className="es" value={f.tipo} onChange={function(e){upd(i,"tipo",e.target.value);}}>{TIPOS_LAT.map(function(t){return <option key={t}>{t}</option>;})}</select></td>
        <td><input className="ec" type="number" step="0.1" value={f.caudal||0} onChange={function(e){upd(i,"caudal",+e.target.value);}} style={{width:50,fontSize:12,padding:3}}/></td>
        <td><select className="es" value={f.diam||250} onChange={function(e){upd(i,"diam",+e.target.value);}}><option value={160}>160</option><option value={200}>200</option><option value={250}>250</option><option value={315}>315</option><option value={355}>355</option><option value={400}>400</option><option value={500}>500</option></select></td>
        <td><input className="ec" type="text" value={f.pozo} onChange={function(e){upd(i,"pozo",e.target.value);}} style={{width:60,fontSize:12,padding:3}}/></td>
        <td><input className="ec" type="number" step=".5" value={f.long} onChange={function(e){upd(i,"long",+e.target.value);}} style={{width:48,fontSize:12,padding:3}}/></td>
        {CKEYS_LAT.map(function(k){return <td key={k} style={{color:(c[k]||0)>0?"#8FD67A":"#555"}}>{(c[k]||0)>0?(c[k]||0).toFixed(2):"-"}</td>;})}
      </tr>;})}
      <tr style={{background:"#003B73",fontWeight:700,color:"#fff"}}>
        <td colSpan={7} style={{textAlign:"left"}}>TOTAL</td>
        {tots.map(function(v,i){return <td key={i} style={{color:"#D4A843"}}>{v>0?v.toFixed(2):"-"}</td>;})}
      </tr>
    </tbody></table></div>;
  };
  var renderTablaTrans=function(filas,upd,tots){
    return <div style={{overflowX:"auto",maxHeight:"50vh",overflowY:"auto"}}><table><thead><tr>
      <TH>#</TH><TH>Cant</TH><TH>Tipo</TH><TH>Q (L/s)</TH><TH>Diam</TH><TH>Pozo</TH><TH>Long</TH>
      {COLS_TRANS.map(function(c){return <TH key={c}>{c}</TH>;})}
    </tr></thead><tbody>
      {renderHeaderToggles(CKEYS_TRANS)}
      {filas.map(function(f,i){var c=calcCantSumidero(f, P);
        var isSelected = selectedSum && selectedSum.isTransversal && selectedSum.item === f;
        return <tr key={i} onClick={() => setSelectedSum({ item: f, isTransversal: true })} style={{ cursor: 'pointer', background: isSelected ? 'rgba(56,189,248,0.15)' : 'transparent', borderLeft: isSelected ? '4px solid #38bdf8' : '4px solid transparent' }}>
        <td>{i+1}</td>
        <td><input className="ec" type="number" min="0" max="5" value={f.cant} onChange={function(e){upd(i,"cant",+e.target.value);}} style={{width:42,fontSize:12,padding:3}}/></td>
        <td><select className="es" value={f.tipo} onChange={function(e){upd(i,"tipo",e.target.value);}}>{TIPOS_TRANS.map(function(t){return <option key={t}>{t}</option>;})}</select></td>
        <td><input className="ec" type="number" step="0.1" value={f.caudal||0} onChange={function(e){upd(i,"caudal",+e.target.value);}} style={{width:50,fontSize:12,padding:3}}/></td>
        <td><select className="es" value={f.diam||315} onChange={function(e){upd(i,"diam",+e.target.value);}}><option value={250}>250</option><option value={315}>315</option><option value={355}>355</option><option value={400}>400</option><option value={500}>500</option></select></td>
        <td><input className="ec" type="text" value={f.pozo} onChange={function(e){upd(i,"pozo",e.target.value);}} style={{width:60,fontSize:12,padding:3}}/></td>
        <td><input className="ec" type="number" step=".5" value={f.long} onChange={function(e){upd(i,"long",+e.target.value);}} style={{width:48,fontSize:12,padding:3}}/></td>
        {CKEYS_TRANS.map(function(k){return <td key={k} style={{color:(c[k]||0)>0?"#8FD67A":"#555"}}>{(c[k]||0)>0?(c[k]||0).toFixed(2):"-"}</td>;})}
      </tr>;})}
      <tr style={{background:"#003B73",fontWeight:700,color:"#fff"}}>
        <td colSpan={7} style={{textAlign:"left"}}>TOTAL</td>
        {tots.map(function(v,i){return <td key={i} style={{color:"#D4A843"}}>{v>0?v.toFixed(2):"-"}</td>;})}
      </tr>
    </tbody></table></div>;
  };
  return <div>
    <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20, flexWrap: "wrap", gap: 15}}>
      <div style={{display: "flex", gap: 15, flexWrap: "wrap"}}>
        <K v={nTotLat} l="Sum.Laterales" u="und" color="#00A6D6"/>
        <K v={nTotTrans} l="Sum.Transversales" u="und" color="#D4A843"/>
        <K v={nTotLat+nTotTrans} l="Total Sumideros" u="und"/>
      </div>
      <div style={{display: "flex", gap: 15, alignItems: "center", flexWrap: "wrap"}}>
        <div className="stabs" style={{margin: 0}}>
          <button className={"stab"+(subS==="lat"?" a":"")} onClick={function(){setSubS("lat");}}>Laterales SL</button>
          <button className={"stab"+(subS==="trans"?" a":"")} onClick={function(){setSubS("trans");}}>Transversales ST</button>
        </div>
        <button className="btn" onClick={handleExpSum} style={{fontSize:11,padding:"6px 12px",background:"linear-gradient(135deg,#28A745,#1A6B2C)"}}>XLSX</button>
      </div>
    </div>
    
    <div className="c">
      <div className="ct">Parametros de Sumideros (Clic en una fila para ver esquema)</div>
      
      {/* Schematics Section */}
      {selectedSum && selectedSum.item && (
        <div style={{ marginBottom: '20px', maxWidth: '600px', width: '100%', margin: '0 auto 20px auto', background: '#0f172a', padding: 15, borderRadius: 8, border: '1px solid #334155' }}>
          <CatchBasin item={selectedSum.item} isTransversal={selectedSum.isTransversal} />
        </div>
      )}

      <div style={{fontSize:12,color:"#8FD67A",marginBottom:4}}>Cant=0 no incluye. Cantidades auto por tipo.</div>
      {subS==="lat"?renderTablaLat(sumLat,updLat,totalesLat):renderTablaTrans(sumTrans,updTrans,totalesTrans)}
    </div>
  </div>;
}

export default SumTab;
