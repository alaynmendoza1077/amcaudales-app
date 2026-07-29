import React, {useState, useEffect, useRef} from 'react';
import {K, TH, fm} from '../ui';
import * as XLSX from 'xlsx';
import {calcPozosCompleto} from '../calcHelpers';
import Manhole from '../components/Schematics/Manhole';

function PozTab(props){
  var P=props.P||{};
  var dR=props.R.filter(function(r){return !r.sep;});var T=props.T||[];
  if(!dR.length)return <div className="c"><p>Sin datos</p></div>;
  var DI=1.2;var ESP=0.25;
  var pozData=calcPozosCompleto(props.R,T);
  var pz=pozData.pz;
  /* >>> ADICIÓN v36.6: conteo pozos con DI ampliado <<< */
  var nDIamp=pz.filter(function(p){return p.alertaDI;}).length;
  var tVC=pozData.tVC,tAM=pozData.tAM,tVE=pozData.tVE,tAK=pozData.tAK,tPe=pozData.tPe,tJu=pozData.tJu,tCP=pozData.tCP;
  var sSub=useState("inv");var sub=sSub[0],setSub=sSub[1];
  var sSelPz=useState(null);var selPz=sSelPz[0],setSelPz=sSelPz[1];
  var nM=pz.filter(function(p){return p.tipoPozo==="M";}).length;
  var nC=pz.filter(function(p){return p.tipoPozo==="C";}).length;
  var pzConCaida=pz.filter(function(p){return p.caidas&&p.caidas.length>0;});
  const handleExpPz = async () => {
    try {
      const ExcelJS = await import('exceljs');
      const { saveFileWithDialog } = await import('../utils/fileSaver');
      const wb = new ExcelJS.Workbook();
      wb.creator = 'AMCaudales';
      wb.created = new Date();

      const headerStyle = {
        font: { bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF005A8C' } },
        alignment: { vertical: 'middle', horizontal: 'center' },
        border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
      };

      const addHeaderInfo = (ws) => {
        ws.addRow([`Proyecto: ${P?.proyecto || ''}`]).font = { bold: true };
        ws.addRow([`Diseñador: ${P?.disenador || ''}`]).font = { bold: true };
        ws.addRow([`Fecha: ${P?.fecha || new Date().toLocaleDateString('es-CO')}`]).font = { bold: true };
        ws.addRow([]);
      };

      const addAbrevs = (ws, startRow) => {
        ws.addRow([]);
        ws.addRow(["ABREVIATURAS UTILIZADAS:"]);
        ws.getCell(`A${startRow + 1}`).font = { bold: true, color: { argb: 'FF005A8C' } };
        const abrevs = [
          ["Prof", "Profundidad del pozo (m)"],
          ["M/C", "Tipo de Material: Mampostería (M) o Concreto (C)"],
          ["PzN", "Pozo Nuevo (S = Sí)"],
          ["D.Ent / D.Sal", "Diámetro de Entrada / Diámetro de Salida"],
          ["Aflu", "Número de afluentes o tuberías que llegan al pozo"],
          ["C.RasDe / C.Ras", "Cota Rasante (m)"],
          ["C.Fon / CF", "Cota de Fondo (m)"],
          ["Rep", "Reponer Pozo (S = Sí)"],
          ["hConc / hMamp", "Altura de Concreto / Altura de Mampostería (m)"],
          ["Cto(m3)", "Volumen de Concreto (m3)"],
          ["Mamp(m2)", "Área de Mampostería (m2)"],
          ["Exc(m3)", "Volumen de Excavación (m3)"],
          ["A-60(T/C)", "Acero de Refuerzo 60,000 PSI en Tapa/Cuerpo (kg)"],
          ["A-37(C)", "Acero Estructural A-37 en Cuerpo (kg)"],
          ["Peld", "Cantidad de Peldaños"],
          ["C.Pob", "Concreto Pobre (m3)"],
          ["Red.", "Reducción de Cono (m3)"],
          ["DHe", "Caída o Delta H (diferencia de nivel)"],
          ["Pe% / Ps%", "Pendiente de Entrada / Pendiente de Salida (%)"]
        ];
        abrevs.forEach(ab => {
          const r = ws.addRow(ab);
          r.getCell(1).font = { bold: true };
        });
      };

      // 1. INVENTARIO
      const wsInv = wb.addWorksheet("1.Inventario");
      addHeaderInfo(wsInv);
      wsInv.addRow(["AMCaudales - INVENTARIO DE POZOS"]);
      wsInv.getCell('A5').font = { size: 14, bold: true };
      wsInv.addRow([]);
      
      const invCols = ["#", "Pozo", "Prof(m)", "Tipo", "M/C", "PzN", "D.Ent", "D.Sal", "Aflu", "C.Ras", "C.Fon", "Rep", "Caida"];
      const invHeaderRow = wsInv.addRow(invCols);
      invHeaderRow.eachCell(c => { Object.assign(c, headerStyle); });
      
      pz.forEach((p, i) => {
        const row = wsInv.addRow([
          i + 1, p.nodo, p.prof.toFixed(2), p.tipo, p.tipoPozo, p.pozoNuevo, p.De, p.Ds, p.nAflu, p.cr, p.cf, p.reponer, p.caidas && p.caidas.length > 0 ? "SI" : "NO"
        ]);
        if (p.reponer === "S") {
          row.eachCell(c => {
            c.border = { top: {style:'medium', color:{argb:'FFF0932B'}}, bottom: {style:'medium', color:{argb:'FFF0932B'}}, left: {style:'medium', color:{argb:'FFF0932B'}}, right: {style:'medium', color:{argb:'FFF0932B'}} };
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF7E6' } };
          });
        }
      });
      addAbrevs(wsInv, pz.length + 7);

      // 2. CANTIDADES
      const wsCant = wb.addWorksheet("2.Cantidades");
      addHeaderInfo(wsCant);
      wsCant.addRow(["AMCaudales - CANTIDADES DE POZOS"]);
      wsCant.getCell('A5').font = { size: 14, bold: true };
      wsCant.addRow([`DI=${DI}m, ESP=${ESP}m, DE=${(DI+2*ESP).toFixed(2)}m, Concreto 4000PSI`]);
      wsCant.addRow([]);

      const cantCols = ["#", "Pozo", "Prof(m)", "M/C", "hConc", "hMamp", "Cto(m3)", "Mamp(m2)", "Exc(m3)", "A-60(T)", "A-60(C)", "A-37(C)", "Peld", "C.Pob", "Red."];
      const cantHeaderRow = wsCant.addRow(cantCols);
      cantHeaderRow.eachCell(c => { Object.assign(c, headerStyle); });

      pz.forEach((p, i) => {
        const row = wsCant.addRow([
          i + 1, p.nodo, p.prof.toFixed(2), p.tipoPozo, p.hConc, p.hMamp > 0 ? p.hMamp : "-", p.volConc, p.areaMamp > 0 ? p.areaMamp : "-", p.volExc, p.a60Tapa > 0 ? p.a60Tapa.toFixed(1) : "-", p.a60Cuerpo > 0 ? p.a60Cuerpo.toFixed(1) : "-", p.a37Cuerpo > 0 ? p.a37Cuerpo.toFixed(1) : "-", p.peldanos, p.concPobre > 0 ? p.concPobre.toFixed(3) : "-", p.reduccion > 0 ? p.reduccion.toFixed(3) : "-"
        ]);
        if (p.reponer === "S") {
          row.eachCell(c => {
            c.border = { top: {style:'medium', color:{argb:'FFF0932B'}}, bottom: {style:'medium', color:{argb:'FFF0932B'}}, left: {style:'medium', color:{argb:'FFF0932B'}}, right: {style:'medium', color:{argb:'FFF0932B'}} };
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF7E6' } };
          });
        }
      });
      const cantTot = wsCant.addRow(["", "TOTAL", "", "", "", "", tVC.toFixed(2), tAM.toFixed(2), tVE.toFixed(2), pozData.tA60T ? pozData.tA60T.toFixed(1) : 0, pozData.tA60C ? pozData.tA60C.toFixed(1) : 0, pozData.tA37C ? pozData.tA37C.toFixed(1) : 0, tPe, tCP.toFixed(3), pozData.tRed.toFixed(3)]);
      cantTot.eachCell(c => { c.font = { bold: true }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } }; });
      addAbrevs(wsCant, pz.length + 9);

      // 3. EXCAVACION
      const wsExc = wb.addWorksheet("3.Excavacion");
      addHeaderInfo(wsExc);
      wsExc.addRow(["AMCaudales - EXCAVACION POZOS POR RANGO"]);
      wsExc.getCell('A5').font = { size: 14, bold: true };
      wsExc.addRow([]);
      
      const excCols = ["#", "Pozo", "Prof(m)", "PzN", "H exc", "A exc", "0-2.5m", "2.5-5m", ">5m", "Total"];
      const excHeaderRow = wsExc.addRow(excCols);
      excHeaderRow.eachCell(c => { Object.assign(c, headerStyle); });
      
      const pzNuevos = pz.filter(p => p.pozoNuevo === "S");
      pzNuevos.forEach((p, i) => {
        let Aex = Math.PI * Math.pow((p.DE + 0.22) / 2, 2);
        wsExc.addRow([
          i + 1, p.nodo, p.prof.toFixed(2), "S", (p.prof + 0.20).toFixed(2), Aex.toFixed(3), p.v025 > 0 ? p.v025 : "-", p.v2550 > 0 ? p.v2550 : "-", p.v50p > 0 ? p.v50p : "-", p.volExc
        ]);
      });
      const excTot = wsExc.addRow(["", "TOTAL", "", "", "", "", pozData.v025.toFixed(2), pozData.v2550.toFixed(2), pozData.v50p.toFixed(2), tVE.toFixed(2)]);
      excTot.eachCell(c => { c.font = { bold: true }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } }; });
      addAbrevs(wsExc, pzNuevos.length + 8);

      // 4. DETALLE LLEGADAS
      const wsDet = wb.addWorksheet("4.Detalle");
      addHeaderInfo(wsDet);
      wsDet.addRow(["AMCaudales - DETALLE ESTRUCTURA Y LLEGADAS"]);
      wsDet.getCell('A5').font = { size: 14, bold: true };
      wsDet.addRow([]);
      
      const detCols = ["#", "Pozo", "Prof", "M/C", "D.Ent(pul)", "D.Ent", "Pe%", "CF ent", "D.Sal(pul)", "D.Sal", "Ps%", "CF sal", "Aflu", "D1", "D2", "D3", "DHe", "Camara"];
      const detHeaderRow = wsDet.addRow(detCols);
      detHeaderRow.eachCell(c => { Object.assign(c, headerStyle); });
      
      pz.forEach((p, i) => {
        const ll = p.llegadas || [];
        const entR = ll.length > 0 ? ll[0] : null;
        const l1 = ll.length > 1 ? ll[1] : null;
        const l2 = ll.length > 2 ? ll[2] : null;
        wsDet.addRow([
          i + 1, p.nodo, p.prof.toFixed(2), p.tipoPozo, entR ? entR.diamPul : "-", p.De, entR ? entR.S : "-", entR ? entR.cf.toFixed(2) : "-", p.dsPul || "-", p.Ds, p.peSal || "-", p.csSal ? p.csSal.toFixed(2) : "-", p.nAflu, l1 ? l1.nom : "-", l2 ? l2.nom : "-", ll.length > 3 ? ll[3].nom : "-", p.caidas.length > 0 ? p.caidas.map(c => c.deltaH.toFixed(2)).join(", ") : "-", p.caidas.length > 0 ? "SI" : "NO"
        ]);
      });
      addAbrevs(wsDet, pz.length + 7);

      // 5. CAIDAS
      const wsCaidas = wb.addWorksheet("5.Caidas");
      addHeaderInfo(wsCaidas);
      wsCaidas.addRow(["AMCaudales - CAMARAS DE CAIDA"]);
      wsCaidas.getCell('A5').font = { size: 14, bold: true };
      wsCaidas.addRow([]);
      
      const caiCols = ["#", "Pozo", "Prof(m)", "C.Ras", "C.Fon", "Caidas", "D.Colector(mm)", "D.Estructura(mm)", "DeltaH(m)", "VolCaida(m3)"];
      const caiHeaderRow = wsCaidas.addRow(caiCols);
      caiHeaderRow.eachCell(c => { Object.assign(c, headerStyle); });
      
      pzConCaida.forEach((p, i) => {
        wsCaidas.addRow([
          i + 1, p.nodo, p.prof.toFixed(2), p.cr, p.cf, p.caidas.length, p.caidas.map(c => c.diam).join(", "), p.caidas.map(c => c.diamEstr || "-").join(", "), p.caidas.map(c => c.deltaH.toFixed(2)).join(", "), (p.volCaida || 0).toFixed(3)
        ]);
      });
      const caiTot = wsCaidas.addRow(["", "TOTAL CAIDAS POZOS NUEVOS", "", "", "", pozData.nCaida, "", "", "", ""]);
      caiTot.eachCell(c => { c.font = { bold: true }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } }; });
      addAbrevs(wsCaidas, pzConCaida.length + 8);

      [wsInv, wsCant, wsExc, wsDet, wsCaidas].forEach(ws => {
        ws.columns.forEach(column => {
          column.width = 15;
        });
      });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveFileWithDialog(blob, "Reporte_Pozos.xlsx");
    } catch (e) {
      console.error("Error al exportar XLSX de pozos:", e);
      alert("Hubo un error al generar el archivo Excel de pozos.");
    }
  };
  return <div>
    <div className="kpig" style={{marginBottom:8}}>
      <K v={pz.length} l="Total Pozos"/><K v={pozData.nNuevos} l="Pozos Nuevos" u="PzN=S" color="#28A745"/><K v={nM} l="Mamposteria" u="M" color="#F0932B"/><K v={nC} l="Concreto" u="C" color="#00A6D6"/>
      <K v={pozData.nCaida} l="Con Caida" u="dH>0.75" color="#DC3545"/><K v={"DI="+DI+"m"} l="Diametro Int"/>
    </div>
    {/* >>> ADICIÓN v36.6: alerta pozos con DI ampliado <<< */}
    {nDIamp>0?<div style={{background:"rgba(240,147,43,0.15)",border:"1px solid #F0932B",borderRadius:6,padding:"6px 12px",marginBottom:8,fontSize:12,color:"#F0932B"}}><strong>Alerta:</strong> {nDIamp} pozo(s) requieren DI=1.80m o mayor (colector &gt;600mm, Tabla 10 RAS 330/17). Verificar cantidades.</div>:null}
    {/* >>> FIN ADICIÓN v36.6 <<< */}
    {/* >>> ADICIÓN v36.3: KPIs de cantidades totales <<< */}
    <div className="kpig" style={{marginBottom:8}}>
      <K v={tVC.toFixed(1)} l="Concreto" u="m3" color="#00A6D6"/>
      <K v={tAM.toFixed(1)} l="Mampost." u="m2" color="#F0932B"/>
      <K v={tVE.toFixed(1)} l="Excavacion" u="m3"/>
      <K v={pozData.tPDR.toFixed(0)} l="Acero 60" u="kg" color="#D4A843"/>
      <K v={pozData.tA37.toFixed(0)} l="A-37" u="kg" color="#D4A843"/>
    </div>
    {/* >>> FIN ADICIÓN v36.3 <<< */}
    {!props.isExport && (
      <div style={{display:"flex",gap:4,marginBottom:8}}><div className="stabs">
        <button className={"stab"+(sub==="inv"?" a":"")} onClick={function(){setSub("inv");}}>Inventario</button>
        <button className={"stab"+(sub==="cant"?" a":"")} onClick={function(){setSub("cant");}}>Cantidades</button>
        {/* >>> ADICIÓN v36.3: subtab Excavación y Detalle <<< */}
        <button className={"stab"+(sub==="exc"?" a":"")} onClick={function(){setSub("exc");}}>Excavacion</button>
        <button className={"stab"+(sub==="det"?" a":"")} onClick={function(){setSub("det");}}>Detalle</button>
        {/* >>> FIN ADICIÓN v36.3 <<< */}
        <button className={"stab"+(sub==="caida"?" a":"")} onClick={function(){setSub("caida");}}>Caidas ({pozData.nCaida})</button>
      </div>
      <button className="btn" onClick={handleExpPz} style={{fontSize:10,padding:"3px 8px",background:"linear-gradient(135deg,#28A745,#1A6B2C)"}}>XLSX</button></div>
    )}
    
    {/* Schematics Section */}
    {(!props.isExport && selPz) && (
      <div style={{ marginBottom: '20px', maxWidth: '600px', margin: '0 auto 20px auto' }}>
        <Manhole pozo={selPz} DI={DI} ESP={ESP} />
      </div>
    )}

    {(sub==="inv" || props.isExport)?<div className="c" style={props.isExport ? {marginBottom: 20} : {}}><div className="ct">Inventario ({pz.length} pozos) (Clic en pozo para ver esquema)</div><div style={{overflowX:"auto",maxHeight:props.isExport?"none":"55vh",overflowY:props.isExport?"visible":"auto"}}><table><thead><tr><TH>#</TH><TH>Pozo</TH><TH>Prof</TH><TH>Tipo</TH><TH>M/C</TH><TH>PzN</TH><TH>D.Ent</TH><TH>D.Sal</TH><TH>Aflu</TH><TH>C.RasDe</TH><TH>C.Fon</TH><TH>Rep</TH><TH>Caida</TH></tr></thead><tbody>
    {pz.map(function(p,i){
      var isSelected = selPz && selPz.nodo === p.nodo;
      var isRep = p.reponer === "S";
      return <tr key={i} onClick={() => setSelPz(p)} style={{cursor:'pointer', borderLeft: isSelected ? '4px solid #38bdf8' : isRep ? '4px solid #F0932B' : '4px solid transparent', outline: isRep ? '1px solid rgba(240,147,43,0.5)' : 'none', outlineOffset: '-1px', background:isSelected ? "rgba(56,189,248,0.15)" : p.caidas&&p.caidas.length>0?"rgba(220,53,69,0.1)":"transparent"}}><td>{i+1}</td><td style={{textAlign:"left",fontSize:12}}>{p.nodo}</td><td style={{fontWeight:700,color:p.prof<=1.5?"#28A745":p.prof<=3?"#F0932B":"#DC3545"}}>{p.prof.toFixed(2)}</td><td>{p.tipo}</td><td style={{color:p.tipoPozo==="C"?"#00A6D6":"#F0932B",fontWeight:700}}>{p.tipoPozo}</td><td style={{color:p.pozoNuevo==="S"?"#28A745":"#555"}}>{p.pozoNuevo}</td><td>{p.De}</td><td>{p.Ds}</td><td>{p.nAflu}</td><td>{p.cr}</td><td>{p.cf}</td><td style={{color:p.reponer==="S"?"#28A745":"#F0932B"}}>{p.reponer}</td><td style={{color:p.caidas&&p.caidas.length>0?"#DC3545":"#555",fontWeight:p.caidas&&p.caidas.length>0?700:400}}>{p.caidas&&p.caidas.length>0?"SI":"no"}</td></tr>;
    })}</tbody></table></div></div>:null}
    {(sub==="cant" || props.isExport)?<div className="c print-page-break" style={props.isExport ? {marginBottom: 20} : {}}><div className="ct">Cantidades (DI={DI}m, ESP={ESP}m, DE={(DI+2*ESP).toFixed(2)}m, Cto 4000PSI)</div><div style={{overflowX:"auto",maxHeight:props.isExport?"none":"50vh",overflowY:props.isExport?"visible":"auto"}}><table><thead><tr><TH>#</TH><TH>Pozo</TH><TH>Prof</TH><TH>M/C</TH><TH>hConc</TH><TH>hMamp</TH><TH>Cto(m3)</TH><TH>Mamp(m2)</TH><TH>Exc(m3)</TH><TH>A-60(T)</TH><TH>A-60(C)</TH><TH>A-37(C)</TH><TH>Peld</TH><TH>C.Pob</TH><TH>Red.</TH></tr></thead><tbody>
    {pz.map(function(p,i){
      var isRep = p.reponer === "S";
      return <tr key={i} style={{borderLeft: isRep ? '4px solid #F0932B' : '4px solid transparent', outline: isRep ? '1px solid rgba(240,147,43,0.5)' : 'none', outlineOffset: '-1px'}}><td>{i+1}</td><td style={{textAlign:"left",fontSize:12}}>{p.nodo}</td><td>{p.prof.toFixed(2)}</td><td style={{color:p.tipoPozo==="C"?"#00A6D6":"#F0932B",fontWeight:700}}>{p.tipoPozo}</td><td>{p.hConc}</td><td>{p.hMamp>0?p.hMamp:"-"}</td><td>{p.volConc}</td><td>{p.areaMamp>0?p.areaMamp:"-"}</td><td>{p.volExc}</td><td style={{color:"#D4A843"}}>{p.a60Tapa>0?p.a60Tapa.toFixed(1):"-"}</td><td style={{color:"#D4A843"}}>{p.a60Cuerpo>0?p.a60Cuerpo.toFixed(1):"-"}</td><td style={{color:"#D4A843"}}>{p.a37Cuerpo>0?p.a37Cuerpo.toFixed(1):"-"}</td><td>{p.peldanos}</td><td>{p.concPobre>0?p.concPobre.toFixed(3):"-"}</td><td>{p.reduccion>0?p.reduccion.toFixed(3):"-"}</td></tr>;
    })}<tr style={{background:"#003B73",fontWeight:700,color:"#fff"}}><td colSpan={4}>TOTAL ({pz.length})</td><td></td><td></td><td>{tVC.toFixed(2)}</td><td>{tAM.toFixed(2)}</td><td>{tVE.toFixed(2)}</td><td style={{color:"#D4A843"}}>{pozData.tA60T?pozData.tA60T.toFixed(1):0}</td><td style={{color:"#D4A843"}}>{pozData.tA60C?pozData.tA60C.toFixed(1):0}</td><td style={{color:"#D4A843"}}>{pozData.tA37C?pozData.tA37C.toFixed(1):0}</td><td>{tPe}</td><td>{tCP.toFixed(3)}</td><td>{pozData.tRed.toFixed(3)}</td></tr></tbody></table></div></div>:null}
    {/* >>> ADICIÓN v36.3: subtab Excavación por rango <<< */}
    {(sub==="exc" || props.isExport)?<div className="c print-page-break" style={props.isExport ? {marginBottom: 20} : {}}><div className="ct">Excavacion Pozos por Rango de Profundidad</div>
      <div className="kpig" style={{marginBottom:8}}>
        <K v={pozData.v025.toFixed(1)} l="0 - 2.5m" u="m3" color="#28A745"/>
        <K v={pozData.v2550.toFixed(1)} l="2.5 - 5m" u="m3" color="#F0932B"/>
        <K v={pozData.v50p.toFixed(1)} l="> 5m" u="m3" color="#DC3545"/>
        <K v={tVE.toFixed(1)} l="Total Exc" u="m3"/>
      </div>
      <div style={{overflowX:"auto",maxHeight:props.isExport?"none":"50vh",overflowY:props.isExport?"visible":"auto"}}><table><thead><tr><TH>#</TH><TH>Pozo</TH><TH>Prof(m)</TH><TH>PzN</TH><TH>H exc</TH><TH>A exc</TH><TH>0-2.5m</TH><TH>2.5-5m</TH><TH>&gt;5m</TH><TH>Total</TH></tr></thead><tbody>
      {pz.filter(function(p){return p.pozoNuevo==="S";}).map(function(p,i){
        var Aex=Math.PI*Math.pow((p.DE+0.22)/2,2);
        return <tr key={i}><td>{i+1}</td><td style={{textAlign:"left",fontSize:12}}>{p.nodo}</td><td style={{fontWeight:700,color:p.prof<=2.5?"#28A745":p.prof<=5?"#F0932B":"#DC3545"}}>{p.prof.toFixed(2)}</td><td style={{color:"#28A745"}}>S</td><td>{(p.prof+0.20).toFixed(2)}</td><td>{Aex.toFixed(3)}</td>
        <td style={{color:"#28A745"}}>{p.v025>0?p.v025:"-"}</td>
        <td style={{color:"#F0932B"}}>{p.v2550>0?p.v2550:"-"}</td>
        <td style={{color:"#DC3545"}}>{p.v50p>0?p.v50p:"-"}</td>
        <td style={{fontWeight:700}}>{p.volExc}</td></tr>;
      })}<tr style={{background:"#003B73",fontWeight:700,color:"#fff"}}><td colSpan={6}>TOTAL</td>
        <td style={{color:"#28A745"}}>{pozData.v025.toFixed(2)}</td>
        <td style={{color:"#F0932B"}}>{pozData.v2550.toFixed(2)}</td>
        <td style={{color:"#DC3545"}}>{pozData.v50p.toFixed(2)}</td>
        <td>{tVE.toFixed(2)}</td></tr></tbody></table></div></div>:null}
    {/* >>> FIN ADICIÓN v36.3 <<< */}
    {/* >>> ADICIÓN v36.3: subtab Detalle (estructura + llegadas) <<< */}
    {(sub==="det" || props.isExport)?<div className="c print-page-break" style={props.isExport ? {marginBottom: 20} : {}}><div className="ct">Detalle Estructura y Llegadas</div>
      <div style={{overflowX:"auto",maxHeight:props.isExport?"none":"55vh",overflowY:props.isExport?"visible":"auto"}}><table><thead><tr>
        <TH>#</TH><TH>Pozo</TH><TH>Prof</TH><TH>M/C</TH>
        <TH style={{borderLeft:"2px solid #00A6D6"}}>D.Ent(pul)</TH><TH>D.Ent</TH><TH>Pe%</TH><TH>CF ent</TH>
        <TH style={{borderLeft:"2px solid #28A745"}}>D.Sal(pul)</TH><TH>D.Sal</TH><TH>Ps%</TH><TH>CF sal</TH>
        <TH style={{borderLeft:"2px solid #F0932B"}}>Aflu</TH><TH>D1</TH><TH>D2</TH><TH>D3</TH>
        <TH style={{borderLeft:"2px solid #DC3545"}}>DHe</TH><TH>Camara</TH>
      </tr></thead><tbody>
      {pz.map(function(p,i){
        var ll=p.llegadas||[];
        var entR=ll.length>0?ll[0]:null;
        var l1=ll.length>1?ll[1]:null;
        var l2=ll.length>2?ll[2]:null;
        return <tr key={i} style={{background:p.caidas&&p.caidas.length>0?"rgba(220,53,69,0.06)":"transparent"}}>
          <td>{i+1}</td><td style={{textAlign:"left",fontSize:11}}>{p.nodo}</td><td>{p.prof.toFixed(2)}</td>
          <td style={{color:p.tipoPozo==="C"?"#00A6D6":"#F0932B",fontWeight:700}}>{p.tipoPozo}</td>
          <td style={{borderLeft:"2px solid #00A6D6"}}>{entR?entR.diamPul:"-"}</td>
          <td>{p.De}</td>
          <td>{entR?entR.S:"-"}</td>
          <td>{entR?entR.cf.toFixed(2):"-"}</td>
          <td style={{borderLeft:"2px solid #28A745"}}>{p.dsPul||"-"}</td>
          <td>{p.Ds}</td>
          <td>{p.peSal||"-"}</td>
          <td>{p.csSal?p.csSal.toFixed(2):"-"}</td>
          <td style={{borderLeft:"2px solid #F0932B"}}>{p.nAflu}</td>
          <td>{l1?l1.nom:"-"}</td>
          <td>{l2?l2.nom:"-"}</td>
          <td>{ll.length>3?ll[3].nom:"-"}</td>
          <td style={{borderLeft:"2px solid #DC3545",color:p.caidas.length>0?"#DC3545":"#555",fontWeight:p.caidas.length>0?700:400}}>{p.caidas.length>0?p.caidas.map(function(c){return c.deltaH.toFixed(2);}).join(", "):"-"}</td>
          <td>{p.caidas.length>0?"SI":"no"}</td>
        </tr>;
      })}</tbody></table></div></div>:null}
    {/* >>> FIN ADICIÓN v36.3 <<< */}
    {(sub==="caida" || props.isExport)?<div className="c print-page-break"><div className="ct">Camaras de Caida ({pzConCaida.length} pozos con deltaH &gt; 0.75m)</div>{pzConCaida.length===0?<p style={{color:"#7088A8",textAlign:"center",padding:20}}>No se detectaron caidas (deltaH &gt; 0.75m entre cota fondo de entrada y salida)</p>:<div style={{overflowX:"auto",maxHeight:props.isExport?"none":"50vh",overflowY:props.isExport?"visible":"auto"}}><table><thead><tr><TH>#</TH><TH>Pozo</TH><TH>Prof(m)</TH><TH>C.Ras</TH><TH>C.Fon</TH><TH>Caidas</TH><TH>D.Colector(mm)</TH><TH>D.Estructura(mm)</TH><TH>DeltaH(m)</TH><TH>VolCaida(m3)</TH></tr></thead><tbody>
    {pzConCaida.map(function(p,i){
      var isNew = p.pozoNuevo === "S";
      return <tr key={i} style={{background:isNew?"rgba(220,53,69,0.08)":"rgba(0,0,0,0.03)", opacity:isNew?1:0.6}}><td>{i+1}</td><td style={{textAlign:"left",fontSize:12}}>{p.nodo}</td><td style={{fontWeight:700}}>{p.prof.toFixed(2)}</td><td>{p.cr}</td><td>{p.cf}</td><td style={{color:isNew?"#DC3545":"#777",fontWeight:700}}>{p.caidas.length}</td><td>{p.caidas.map(function(c){return c.diam;}).join(", ")}</td><td style={{color:isNew?"#D4A843":"#777",fontWeight:700}}>{p.caidas.map(function(c){return c.diamEstr||"-";}).join(", ")}</td><td style={{color:isNew?"#DC3545":"#777",fontWeight:700}}>{p.caidas.map(function(c){return c.deltaH.toFixed(2);}).join(", ")}</td><td style={{color:isNew?"#D4A843":"#777",fontWeight:700}}>{(p.volCaida||0).toFixed(3)}</td></tr>;
    })}
    <tr style={{background:"#003B73",fontWeight:700,color:"#fff"}}><td colSpan={5}>TOTAL POZOS CON CAIDA NUEVOS (S)</td><td style={{color:"#DC3545"}}>{pozData.nCaida}</td><td colSpan={3}></td></tr></tbody></table></div>}</div>:null}
  </div>;
}


export default PozTab;
