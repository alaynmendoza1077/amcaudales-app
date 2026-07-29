import React, {useState, useEffect} from 'react';
import {fm} from '../ui';
import PTOBASE_DATA from '../ptoBaseData';
import UrbanismSection from '../components/Schematics/UrbanismSection';
import ExcelJS from 'exceljs';
import { saveFileWithDialog } from '../utils/fileSaver';

export default function UrbanismoTab({P, sP, T, selMap, urbanismoData, setUrbanismoData}) {
  const fmt = (n) => Number(n).toLocaleString("es-CO", {maximumFractionDigits: 2});

  // Inicializar urbanismoData si está vacío o no coincide con T
  useEffect(() => {
    let tArr = T || [];
    if (!urbanismoData || urbanismoData.length === 0 || urbanismoData.length !== tArr.length) {
      let init = tArr.map((t, idx) => {
        let existing = (urbanismoData && urbanismoData[idx] && urbanismoData[idx].id === t.id) ? urbanismoData[idx] : null;
        let l = t.L || t.longitud || t.long || 0;
        let a = P.anchoVia || 6;
        if (existing) {
          if (!existing.pavL) existing.pavL = l;
          if (!existing.rasL) existing.rasL = l;
          if (!existing.sbL) existing.sbL = l;
          if (!existing.baseL) existing.baseL = l;
          if (!existing.andL) existing.andL = l;
          if (!existing.sarL) existing.sarL = l;
          if (existing.pavKgAcero === undefined || existing.pavKgAcero === 50) existing.pavKgAcero = 14;
        }
        return existing || {
          id: t.id,
          de: t.de,
          a: t.a,
          reqUrbanismo: false,
          
          pavDemolicion: false,
          pavEspesorDem: 0.15,
          pavTipo: 'FX',
          pavL: l,
          pavA: a,
          pavReqAcero: false,
          pavKgAcero: 14,
          
          reqRasante: false,
          rasL: l,
          rasA: a,
          rasProf: 0,
          
          reqSubBase: false,
          sbL: l,
          sbA: a,
          sbProf: 0, // No se usa en total de exportación, pero se pide en imagen
          
          reqBase: false,
          baseL: l,
          baseA: a,
          baseProf: 0,
          
          reqAnden: false,
          andL: l,
          andA: 1,
          andLados: 2,
          
          reqSardinel: false,
          sarL: l,
          sarA: 0.2, // Ancho de sardinel 0.2
          sarLados: 2
        };
      });
      setUrbanismoData(init);
    }
  }, [T]);

  const updateRow = (id, field, value) => {
    let newData = [...(urbanismoData || [])];
    let rowIdx = newData.findIndex(r => r.id === id);
    if (rowIdx !== -1) {
      newData[rowIdx][field] = value;
      setUrbanismoData(newData);
    }
  };

  const setP = sP;

  const [filterSel, setFilterSel] = useState(false);
  const [filterUrb, setFilterUrb] = useState("S");
  const [selectedRow, setSelectedRow] = useState(null);

  const bulkUpdate = (key, val) => {
    if (val === "" || val === null) return;
    let n = [...(urbanismoData || [])];
    let tArr = T || [];
    for (let i = 0; i < n.length; i++) {
      let t = tArr[i] || {};
      let h = selMap && selMap.some(sm => sm && String(sm.de).trim().toLowerCase() === String(t.de || "").trim().toLowerCase() && String(sm.a).trim().toLowerCase() === String(t.a || "").trim().toLowerCase());
      
      let visible = true;
      if (filterSel && !h) visible = false;
      if (filterUrb === 'S' && !n[i].reqUrbanismo) visible = false;
      if (filterUrb === 'N' && n[i].reqUrbanismo) visible = false;
      
      if (visible) {
        n[i] = { ...n[i], [key]: val };
      }
    }
    setUrbanismoData(n);
  };

  let uDem=0, uExc=0, uRell=0, uSob=0, uSubBase=0, uBase=0, uAnden=0, uSardinel=0, uAceroRG=0, uPavRG=0;
  let uRotAsf_0_10=0, uRotAsf_10_20=0, uRotAsf_20p=0;
  let uRotConc_0_15=0, uRotConc_16_25=0, uRotConc_25p=0;

  (urbanismoData || []).forEach(r => {
    if(!r.reqUrbanismo) return;
    
    let pavEsp = r.pavEspesorDem || 0;
    let pavL = r.pavL || 0;
    let pavA = r.pavA || 0;
    let demM3 = r.pavDemolicion ? (pavL * pavA * pavEsp) : 0;
    let rotM2 = r.pavDemolicion ? (pavL * pavA) : 0;
    
    if (r.pavDemolicion) {
        uSob += demM3;
        if (r.pavTipo === 'FX' || r.pavTipo === 'TL') {
            if (pavEsp <= 0.10) uRotAsf_0_10 += rotM2;
            else if (pavEsp <= 0.20) uRotAsf_10_20 += rotM2;
            else uRotAsf_20p += rotM2;
        } else if (r.pavTipo === 'RG') {
            if (pavEsp <= 0.15) uRotConc_0_15 += rotM2;
            else if (pavEsp <= 0.25) uRotConc_16_25 += rotM2;
            else uRotConc_25p += rotM2;
        }
    }

    let viaM2 = pavL * pavA;
    if(r.pavTipo === 'RG') {
       uPavRG += viaM2;
       if(r.pavReqAcero) uAceroRG += (viaM2 * 0.20 * (r.pavKgAcero||0));
    }
    
    let excM3 = r.reqRasante ? (r.rasL||0)*(r.rasA||0)*(r.rasProf||0) : 0;
    uExc += excM3; uSob += excM3; uRell += excM3;
    
    if(r.reqSubBase) uSubBase += (r.sbL||0)*(r.sbA||0);
    if(r.reqBase) uBase += (r.baseL||0)*(r.baseA||0);
    
    if(r.reqAnden) {
        let andA = (r.andL||0)*(r.andA||0)*(r.andLados||1);
        uAnden += andA;
        let andDem = (andA * 0.10); // Asumiendo 10cm espesor
        uDem += andDem; uSob += andDem;
    }
    
    if(r.reqSardinel) {
        let sarL = (r.sarL||0)*(r.sarLados||1);
        uSardinel += sarL;
        let sarDem = (sarL * 0.08); // Asumiendo 0.2x0.4m = 0.08m2/ml
        uDem += sarDem; uSob += sarDem;
    }
  });

  uDem=uDem||0; uExc=uExc||0; uRell=uRell||0; uSob=uSob||0; uSubBase=uSubBase||0; uBase=uBase||0; uAnden=uAnden||0; uSardinel=uSardinel||0; uAceroRG=uAceroRG||0; uPavRG=uPavRG||0;
  uSob = uSob * (1 + (P.porcExpansion !== undefined ? parseFloat(P.porcExpansion) : 0.05));

  let baseItems = [
    {cod: "1.03.01.01", und: "M2", cant: uRotAsf_0_10},
    {cod: "1.03.01.02", und: "M2", cant: uRotAsf_10_20},
    {cod: "1.03.01.03", und: "M2", cant: uRotAsf_20p},
    {cod: "1.03.02.01", und: "M2", cant: uRotConc_0_15},
    {cod: "1.03.02.02", und: "M2", cant: uRotConc_16_25},
    {cod: "1.03.02.03", und: "M2", cant: uRotConc_25p},
    {cod: "2.02.01.01", und: "M3", cant: uExc},
    {cod: "2.05.01.02", und: "M3", cant: uRell},
    {cod: "2.06.01.04", und: "M3", cant: uSob},
    {cod: "4.02.01.02", und: "KG", cant: uAceroRG},
    {cod: "4.08.02.02", und: "M2", cant: uSubBase},
    {cod: "4.08.02.03", und: "M2", cant: uBase},
    {cod: "4.08.03.01", und: "M2", cant: uPavRG},
    {cod: "4.09.01.01", und: "M2", cant: uAnden},
    {cod: "4.09.01.02", und: "ML", cant: uSardinel},
    {cod: "5.01.01.01", und: "M3", cant: uDem}
  ];

  let ptoDict = {};
  (PTOBASE_DATA || []).forEach(d => { ptoDict[d.c] = d.d; });

  let groupedItems = {};
  baseItems.forEach(it => {
    let subCap = it.cod.substring(0, 7); // e.g. "1.03.01"
    if (!groupedItems[subCap]) {
      groupedItems[subCap] = { desc: ptoDict[subCap] || `Subcapitulo ${subCap}`, items: [] };
    }
    it.desc = ptoDict[it.cod] || it.cod;
    groupedItems[subCap].items.push(it);
  });

  const handleExpUrb = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      const headerStyle = { font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003B73' } } };
      
      // Resumen
      const wsRes = wb.addWorksheet("Resumen");
      wsRes.addRow([`Proyecto: ${P?.proyecto || ''}`]).font = { bold: true };
      wsRes.addRow([`Diseñador: ${P?.disenador || ''}`]).font = { bold: true };
      wsRes.addRow([`Fecha: ${P?.fecha || new Date().toLocaleDateString('es-CO')}`]).font = { bold: true };
      wsRes.addRow([]);
      
      const addAbrevs = (ws, startRow) => {
        ws.addRow([]);
        ws.addRow(["ABREVIATURAS UTILIZADAS:"]);
        ws.getCell(`A${startRow + 1}`).font = { bold: true, color: { argb: 'FF005A8C' } };
        const abrevs = [
          ["Req.Urb", "Requiere Urbanismo"],
          ["Demol?", "Requiere Demolición de Pavimento"],
          ["Acero(RG)?", "Requiere Acero de Refuerzo (Pavimento Rígido)"],
          ["Req Ras?", "Requiere Rasante"],
          ["Req S.Base?", "Requiere Sub-Base"],
          ["Req Base?", "Requiere Base"],
          ["Req Anden?", "Requiere Andén"],
          ["Req Sar?", "Requiere Sardinel"]
        ];
        abrevs.forEach(ab => {
          const r = ws.addRow(ab);
          r.getCell(1).font = { bold: true };
        });
      };


      const cols = ["Codigo", "Descripcion", "Cant", "Und", "Incluir en Pto"];
      const headerRow = wsRes.addRow(cols);
      headerRow.eachCell(c => { Object.assign(c, headerStyle); });

      Object.keys(groupedItems).sort().map(subCapCod => {
        const titleRow = wsRes.addRow([`${subCapCod} - ${groupedItems[subCapCod].desc}`, "", "", "", ""]);
        titleRow.eachCell(c => { c.font = { bold: true, color: { argb: 'FFFFFFFF' }}; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' }}; });
        wsRes.mergeCells(`A${titleRow.number}:E${titleRow.number}`);

        groupedItems[subCapCod].items.forEach(it => {
          var isIncl = P['inclUrb_' + it.cod.replace(/\./g, '')] !== false;
          wsRes.addRow([it.cod, it.desc, it.cant > 0 ? it.cant.toFixed(2) : "-", it.und, isIncl ? "SI" : "NO"]);
        });
      });

      wsRes.columns.forEach(col => { col.width = 15; });
      wsRes.getColumn(2).width = 40;

      // Detalle
      const wsDet = wb.addWorksheet("Detalle");
      wsDet.addRow([`Proyecto: ${P?.proyecto || ''}`]).font = { bold: true };
      wsDet.addRow([`Diseñador: ${P?.disenador || ''}`]).font = { bold: true };
      wsDet.addRow([`Fecha: ${P?.fecha || new Date().toLocaleDateString('es-CO')}`]).font = { bold: true };
      wsDet.addRow([]);

      const detHeader1 = ["Tramo", "Req.Urb", 
        "Demol?", "Espesor", "Tipo", "Acero(RG)?", "Kg/m3", "Long(m)", "Ancho(m)", "Area(m2)", "Demol.(m3)",
        "Req Ras?", "Long(m)", "Ancho(m)", "Prof(m)", "Vol.(m3)",
        "Req S.Base?", "Long(m)", "Ancho(m)", "Prof(m)", "Area(m2)",
        "Req Base?", "Long(m)", "Ancho(m)", "Prof(m)", "Area(m2)",
        "Req Anden?", "Long(m)", "Ancho(m)", "Lados", "Area(m2)",
        "Req Sar?", "Long(m)", "Ancho(m)", "Lados", "Long.Tot(m)"
      ];
      const hDet = wsDet.addRow(detHeader1);
      hDet.eachCell(c => { Object.assign(c, headerStyle); });

      (urbanismoData || []).forEach(r => {
        if (!r.de) {
          wsDet.addRow([]);
        } else {
          // Filtrar si queremos que el Excel coincida con la UI o no.
          // El request dice "AL IGUAL Q SU DESCARGA EN EXCEL".
          // Así que exportaremos todos, pero pondremos los totales de los que sí requieren urbanismo.
          const pavArea = (r.pavL||0) * (r.pavA||0);
          const pavDemolVol = r.pavDemolicion ? (pavArea * (r.pavEspesorDem||0)) : 0;
          const rasVol = (r.rasL||0) * (r.rasA||0) * (r.rasProf||0);
          const sbArea = (r.sbL||0) * (r.sbA||0);
          const baseArea = (r.baseL||0) * (r.baseA||0);
          const andArea = (r.andL||0) * (r.andA||0) * (r.andLados||1);
          const sarLong = (r.sarL||0) * (r.sarLados||1);

          const req = !!r.reqUrbanismo;
          const tramoStr = r.tramo || `${r.de || ''}-${r.a || ''}`;
          const row = wsDet.addRow([
            tramoStr, req ? "SI" : "NO",
            (req && r.pavDemolicion) ? "SI" : (req ? "NO" : ""), req ? r.pavEspesorDem : "", req ? r.pavTipo : "", (req && r.pavReqAcero) ? "SI" : (req ? "NO" : ""), req ? r.pavKgAcero : "", req ? r.pavL : "", req ? r.pavA : "", req ? pavArea.toFixed(2) : "", req ? pavDemolVol.toFixed(2) : "",
            (req && r.reqRasante) ? "SI" : (req ? "NO" : ""), req ? r.rasL : "", req ? r.rasA : "", req ? r.rasProf : "", req ? rasVol.toFixed(2) : "",
            (req && r.reqSubBase) ? "SI" : (req ? "NO" : ""), req ? r.sbL : "", req ? r.sbA : "", req ? r.sbProf : "", req ? sbArea.toFixed(2) : "",
            (req && r.reqBase) ? "SI" : (req ? "NO" : ""), req ? r.baseL : "", req ? r.baseA : "", req ? r.baseProf : "", req ? baseArea.toFixed(2) : "",
            (req && r.reqAnden) ? "SI" : (req ? "NO" : ""), req ? r.andL : "", req ? r.andA : "", req ? r.andLados : "", req ? andArea.toFixed(2) : "",
            (req && r.reqSardinel) ? "SI" : (req ? "NO" : ""), req ? r.sarL : "", req ? r.sarA : "", req ? r.sarLados : "", req ? sarLong.toFixed(2) : ""
          ]);
          if (r.reqUrbanismo) {
            row.eachCell(c => {
              c.border = { top: {style:'thin', color:{argb:'FF3B82F6'}}, bottom: {style:'thin', color:{argb:'FF3B82F6'}}, left: {style:'thin', color:{argb:'FF3B82F6'}}, right: {style:'thin', color:{argb:'FF3B82F6'}} };
              c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
            });
          }
        }
      });
      
      let t_kgAcero=0, t_pavL=0, t_pavA=0, t_pavArea=0, t_pavDemolVol=0;
      let t_rasL=0, t_rasA=0, t_rasProf=0, t_rasVol=0;
      let t_sbL=0, t_sbA=0, t_sbProf=0, t_sbArea=0;
      let t_baseL=0, t_baseA=0, t_baseProf=0, t_baseArea=0;
      let t_andL=0, t_andA=0, t_andArea=0;
      let t_sarL=0, t_sarA=0, t_sarLong=0;
      (urbanismoData || []).forEach(r => {
        if (r.reqUrbanismo) {
          const pavArea = (r.pavL||0) * (r.pavA||0);
          if (r.pavReqAcero && r.pavTipo==='RG') t_kgAcero += parseFloat(r.pavKgAcero)||0;
          t_pavL += parseFloat(r.pavL)||0;
          t_pavA += parseFloat(r.pavA)||0;
          t_pavArea += pavArea;
          if (r.pavDemolicion) t_pavDemolVol += pavArea * (r.pavEspesorDem||0);

          if (r.reqRasante) { t_rasL+=parseFloat(r.rasL)||0; t_rasA+=parseFloat(r.rasA)||0; t_rasProf+=parseFloat(r.rasProf)||0; t_rasVol += ((r.rasL||0)*(r.rasA||0)*(r.rasProf||0)); }
          if (r.reqSubBase) { t_sbL+=parseFloat(r.sbL)||0; t_sbA+=parseFloat(r.sbA)||0; t_sbProf+=parseFloat(r.sbProf)||0; t_sbArea += ((r.sbL||0)*(r.sbA||0)); }
          if (r.reqBase) { t_baseL+=parseFloat(r.baseL)||0; t_baseA+=parseFloat(r.baseA)||0; t_baseProf+=parseFloat(r.baseProf)||0; t_baseArea += ((r.baseL||0)*(r.baseA||0)); }
          if (r.reqAnden) { t_andL+=parseFloat(r.andL)||0; t_andA+=parseFloat(r.andA)||0; t_andArea += ((r.andL||0)*(r.andA||0)*(r.andLados||1)); }
          if (r.reqSardinel) { t_sarL+=parseFloat(r.sarL)||0; t_sarA+=parseFloat(r.sarA)||0; t_sarLong += ((r.sarL||0)*(r.sarLados||1)); }
        }
      });
      
      const totalRow = wsDet.addRow([
        "TOTALES (Con Urb=SI)", "", "", "", "", "", t_kgAcero.toFixed(2), t_pavL.toFixed(2), t_pavA.toFixed(2), t_pavArea.toFixed(2), t_pavDemolVol.toFixed(2),
        "", t_rasL.toFixed(2), t_rasA.toFixed(2), t_rasProf.toFixed(2), t_rasVol.toFixed(2),
        "", t_sbL.toFixed(2), t_sbA.toFixed(2), t_sbProf.toFixed(2), t_sbArea.toFixed(2),
        "", t_baseL.toFixed(2), t_baseA.toFixed(2), t_baseProf.toFixed(2), t_baseArea.toFixed(2),
        "", t_andL.toFixed(2), t_andA.toFixed(2), "", t_andArea.toFixed(2),
        "", t_sarL.toFixed(2), t_sarA.toFixed(2), "", t_sarLong.toFixed(2)
      ]);
      totalRow.eachCell(c => {
        c.font = { bold: true };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
      });
      
      addAbrevs(wsDet, (urbanismoData || []).length + 8);
      wsDet.columns.forEach(col => { col.width = 12; });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveFileWithDialog(blob, "Reporte_Urbanismo.xlsx");
    } catch (e) {
      console.error("Error al exportar XLSX de urbanismo:", e);
      alert("Hubo un error al generar el archivo Excel de urbanismo.");
    }
  };

  const visibleData = (urbanismoData || []).filter(r => {
    if (filterSel && selMap && !selMap.some(sm => sm && String(sm.de).trim().toLowerCase() === String(r.de).trim().toLowerCase() && String(sm.a).trim().toLowerCase() === String(r.a).trim().toLowerCase())) return false;
    if (filterUrb === "S" && !r.reqUrbanismo) return false;
    if (filterUrb === "N" && r.reqUrbanismo) return false;
    return true;
  });

  const totals = {
    pavKgAcero: 0, pavL: 0, pavA: 0, pavArea: 0, pavDemolVol: 0,
    rasL: 0, rasA: 0, rasProf: 0, rasVol: 0,
    sbL: 0, sbA: 0, sbProf: 0, sbArea: 0,
    baseL: 0, baseA: 0, baseProf: 0, baseArea: 0,
    andL: 0, andA: 0, andArea: 0,
    sarL: 0, sarA: 0, sarLong: 0
  };

  visibleData.forEach(r => {
    if (r.reqUrbanismo) {
      const pavArea = (parseFloat(r.pavL)||0) * (parseFloat(r.pavA)||0);
      if (r.pavReqAcero && r.pavTipo === 'RG') totals.pavKgAcero += (parseFloat(r.pavKgAcero) || 0);
      totals.pavL += (parseFloat(r.pavL) || 0);
      totals.pavA += (parseFloat(r.pavA) || 0);
      totals.pavArea += pavArea;
      if (r.pavDemolicion) totals.pavDemolVol += pavArea * (parseFloat(r.pavEspesorDem)||0);

      if (r.reqRasante) { totals.rasL += (parseFloat(r.rasL) || 0); totals.rasA += (parseFloat(r.rasA) || 0); totals.rasProf += (parseFloat(r.rasProf) || 0); totals.rasVol += ((parseFloat(r.rasL)||0)*(parseFloat(r.rasA)||0)*(parseFloat(r.rasProf)||0)); }
      if (r.reqSubBase) { totals.sbL += (parseFloat(r.sbL) || 0); totals.sbA += (parseFloat(r.sbA) || 0); totals.sbProf += (parseFloat(r.sbProf) || 0); totals.sbArea += ((parseFloat(r.sbL)||0)*(parseFloat(r.sbA)||0)); }
      if (r.reqBase) { totals.baseL += (parseFloat(r.baseL) || 0); totals.baseA += (parseFloat(r.baseA) || 0); totals.baseProf += (parseFloat(r.baseProf) || 0); totals.baseArea += ((parseFloat(r.baseL)||0)*(parseFloat(r.baseA)||0)); }
      if (r.reqAnden) { totals.andL += (parseFloat(r.andL) || 0); totals.andA += (parseFloat(r.andA) || 0); totals.andArea += ((parseFloat(r.andL)||0)*(parseFloat(r.andA)||0)*(parseFloat(r.andLados)||1)); }
      if (r.reqSardinel) { totals.sarL += (parseFloat(r.sarL) || 0); totals.sarA += (parseFloat(r.sarA) || 0); totals.sarLong += ((parseFloat(r.sarL)||0)*(parseFloat(r.sarLados)||1)); }
    }
  });

  return (
    <div style={{padding:'20px', color:'#e2e8f0', fontSize:'13px'}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
        <div>
          <h2 style={{marginTop:0, color:'#60a5fa'}}>Obras de Urbanismo</h2>
          <p style={{color:'#94a3b8', marginBottom:'20px'}}>
            Configure los parámetros de urbanismo para cada tramo. Presione "Inyectar a Cantidades" para que estos totales se sumen automáticamente a la hoja maestra y presupuestos.
          </p>
        </div>
        <button className="btn" onClick={handleExpUrb} style={{fontSize:10,padding:"3px 8px",background:"linear-gradient(135deg,#28A745,#1A6B2C)"}}>XLSX</button>
      </div>

      <div style={{display:'flex', alignItems:'center', marginBottom:'20px', gap:'15px', flexWrap: 'wrap'}}>

        <div style={{display:"flex", gap:15, padding:"8px 12px", background:"#1e293b", border:"1px solid #334155", borderRadius:6, alignItems:"center"}}>
          <span style={{fontSize:12, fontWeight:"bold", color:"#94a3b8"}}>Filtros Visuales:</span>
          <label style={{fontSize:12, display:"flex", alignItems:"center", gap:5, cursor:"pointer"}}>
            <input type="checkbox" checked={filterSel} onChange={e=>setFilterSel(e.target.checked)} />
            Mostrar solo seleccionados en mapa
          </label>
          <label style={{fontSize:12, display:"flex", alignItems:"center", gap:5}}>
            Req. Urbanismo:
            <select value={filterUrb} onChange={e=>setFilterUrb(e.target.value)} style={{fontSize:11, padding:2, borderRadius:4, background:'#0f172a', color:'white', border:'1px solid #475569'}}>
              <option value="">Todos</option>
              <option value="S">Sí (S)</option>
              <option value="N">No (N)</option>
            </select>
          </label>
        </div>
      </div>
      
      {/* Schematics Section */}
      {selectedRow && selectedRow.reqUrbanismo && (
        <div style={{ marginBottom: '20px', maxWidth: '600px', margin: '0 auto 20px auto' }}>
          <UrbanismSection r={selectedRow} />
        </div>
      )}

      <div style={{overflowX:'auto'}}>
        <table className="dt" style={{width:'100%', minWidth:'1800px', borderCollapse:'collapse'}}>
          <thead>
            <tr>
              <th rowSpan="3" style={{position:'sticky', left:0, zIndex:2, background:'#1e293b'}}>Tramo</th>
              <th rowSpan="3" style={{width:'60px'}}>Urbanismo?</th>
              <th colSpan="9" style={{background:'rgba(59,130,246,0.15)', textAlign:'center', borderLeft:'2px solid #334155'}}>PAVIMENTO</th>
              <th colSpan="5" style={{background:'rgba(16,185,129,0.15)', textAlign:'center', borderLeft:'2px solid #334155'}}>RASANTE</th>
              <th colSpan="5" style={{background:'rgba(245,158,11,0.15)', textAlign:'center', borderLeft:'2px solid #334155'}}>SUB BASE</th>
              <th colSpan="5" style={{background:'rgba(239,68,68,0.15)', textAlign:'center', borderLeft:'2px solid #334155'}}>BASE</th>
              <th colSpan="5" style={{background:'rgba(139,92,246,0.15)', textAlign:'center', borderLeft:'2px solid #334155'}}>ANDÉN</th>
              <th colSpan="5" style={{background:'rgba(236,72,153,0.15)', textAlign:'center', borderLeft:'2px solid #334155'}}>SARDINEL</th>
            </tr>
            <tr>
              <th style={{borderLeft:'2px solid #334155'}}>Demol.?</th>
              <th>Espesor(m)</th>
              <th>Tipo</th>
              <th>Acero(RG)?</th>
              <th>Kg/m3</th>
              <th>Long.(m)</th>
              <th>Ancho(m)</th>
              <th>Área(m2)</th>
              <th>Demol.(m3)</th>
              <th style={{borderLeft:'2px solid #334155'}}>Req?</th>
              <th>Long.(m)</th>
              <th>Ancho(m)</th>
              <th>Prof.(m)</th>
              <th>Vol.(m3)</th>
              <th style={{borderLeft:'2px solid #334155'}}>Req?</th>
              <th>Long.(m)</th>
              <th>Ancho(m)</th>
              <th>Prof.(m)</th>
              <th>Área(m2)</th>
              <th style={{borderLeft:'2px solid #334155'}}>Req?</th>
              <th>Long.(m)</th>
              <th>Ancho(m)</th>
              <th>Prof.(m)</th>
              <th>Área(m2)</th>
              <th style={{borderLeft:'2px solid #334155'}}>Req?</th>
              <th>Long.(m)</th>
              <th>Ancho(m)</th>
              <th>Lados</th>
              <th>Área(m2)</th>
              <th style={{borderLeft:'2px solid #334155'}}>Req?</th>
              <th>Long.(m)</th>
              <th>Ancho(m)</th>
              <th>Lados</th>
              <th>Long.Tot(m)</th>
            </tr>
            <tr style={{background:'#0f172a'}}>
              <th style={{borderLeft:'2px solid #334155'}}>
                <select style={{width:'40px', fontSize:10, padding:1, background:'#1e293b', color:'#fbbf24', border:'1px solid #fbbf24'}} onChange={e=>bulkUpdate('pavDemolicion', e.target.value==='S')}>
                  <option value="">-</option><option value="S">S</option><option value="N">N</option>
                </select>
              </th>
              <th><input type="number" step="0.01" style={{width:'50px', fontSize:10, padding:1, background:'#1e293b', color:'#fbbf24', border:'1px solid #fbbf24'}} onBlur={e=>bulkUpdate('pavEspesorDem', parseFloat(e.target.value))} placeholder="-" /></th>
              <th>
                <select style={{width:'50px', fontSize:10, padding:1, background:'#1e293b', color:'#fbbf24', border:'1px solid #fbbf24'}} onChange={e=>bulkUpdate('pavTipo', e.target.value)}>
                  <option value="">-</option><option value="FX">FX</option><option value="RG">RG</option>
                </select>
              </th>
              <th>
                <select style={{width:'40px', fontSize:10, padding:1, background:'#1e293b', color:'#fbbf24', border:'1px solid #fbbf24'}} onChange={e=>bulkUpdate('pavReqAcero', e.target.value==='S')}>
                  <option value="">-</option><option value="S">S</option><option value="N">N</option>
                </select>
              </th>
              <th><input type="number" step="1" style={{width:'40px', fontSize:10, padding:1, background:'#1e293b', color:'#fbbf24', border:'1px solid #fbbf24'}} onBlur={e=>bulkUpdate('pavKgAcero', parseFloat(e.target.value))} placeholder="-" /></th>
              <th><input type="number" step="0.1" style={{width:'40px', fontSize:10, padding:1, background:'#1e293b', color:'#fbbf24', border:'1px solid #fbbf24'}} onBlur={e=>bulkUpdate('pavL', parseFloat(e.target.value))} placeholder="-" /></th>
              <th><input type="number" step="0.1" style={{width:'40px', fontSize:10, padding:1, background:'#1e293b', color:'#fbbf24', border:'1px solid #fbbf24'}} onBlur={e=>bulkUpdate('pavA', parseFloat(e.target.value))} placeholder="-" /></th>
              <th style={{borderLeft:'2px solid #334155'}}>
                <select style={{width:'40px', fontSize:10, padding:1, background:'#1e293b', color:'#fbbf24', border:'1px solid #fbbf24'}} onChange={e=>bulkUpdate('reqRasante', e.target.value==='S')}>
                  <option value="">-</option><option value="S">S</option><option value="N">N</option>
                </select>
              </th>
              <th><input type="number" step="0.1" style={{width:'40px', fontSize:10, padding:1, background:'#1e293b', color:'#fbbf24', border:'1px solid #fbbf24'}} onBlur={e=>bulkUpdate('rasL', parseFloat(e.target.value))} placeholder="-" /></th>
              <th><input type="number" step="0.1" style={{width:'40px', fontSize:10, padding:1, background:'#1e293b', color:'#fbbf24', border:'1px solid #fbbf24'}} onBlur={e=>bulkUpdate('rasA', parseFloat(e.target.value))} placeholder="-" /></th>
              <th><input type="number" step="0.1" style={{width:'40px', fontSize:10, padding:1, background:'#1e293b', color:'#fbbf24', border:'1px solid #fbbf24'}} onBlur={e=>bulkUpdate('rasProf', parseFloat(e.target.value))} placeholder="-" /></th>
              <th style={{borderLeft:'2px solid #334155'}}>
                <select style={{width:'40px', fontSize:10, padding:1, background:'#1e293b', color:'#fbbf24', border:'1px solid #fbbf24'}} onChange={e=>bulkUpdate('reqSubBase', e.target.value==='S')}>
                  <option value="">-</option><option value="S">S</option><option value="N">N</option>
                </select>
              </th>
              <th><input type="number" step="0.1" style={{width:'40px', fontSize:10, padding:1, background:'#1e293b', color:'#fbbf24', border:'1px solid #fbbf24'}} onBlur={e=>bulkUpdate('sbL', parseFloat(e.target.value))} placeholder="-" /></th>
              <th><input type="number" step="0.1" style={{width:'40px', fontSize:10, padding:1, background:'#1e293b', color:'#fbbf24', border:'1px solid #fbbf24'}} onBlur={e=>bulkUpdate('sbA', parseFloat(e.target.value))} placeholder="-" /></th>
              <th><input type="number" step="0.1" style={{width:'40px', fontSize:10, padding:1, background:'#1e293b', color:'#fbbf24', border:'1px solid #fbbf24'}} onBlur={e=>bulkUpdate('sbProf', parseFloat(e.target.value))} placeholder="-" /></th>
              <th style={{borderLeft:'2px solid #334155'}}>
                <select style={{width:'40px', fontSize:10, padding:1, background:'#1e293b', color:'#fbbf24', border:'1px solid #fbbf24'}} onChange={e=>bulkUpdate('reqBase', e.target.value==='S')}>
                  <option value="">-</option><option value="S">S</option><option value="N">N</option>
                </select>
              </th>
              <th><input type="number" step="0.1" style={{width:'40px', fontSize:10, padding:1, background:'#1e293b', color:'#fbbf24', border:'1px solid #fbbf24'}} onBlur={e=>bulkUpdate('baseL', parseFloat(e.target.value))} placeholder="-" /></th>
              <th><input type="number" step="0.1" style={{width:'40px', fontSize:10, padding:1, background:'#1e293b', color:'#fbbf24', border:'1px solid #fbbf24'}} onBlur={e=>bulkUpdate('baseA', parseFloat(e.target.value))} placeholder="-" /></th>
              <th><input type="number" step="0.1" style={{width:'40px', fontSize:10, padding:1, background:'#1e293b', color:'#fbbf24', border:'1px solid #fbbf24'}} onBlur={e=>bulkUpdate('baseProf', parseFloat(e.target.value))} placeholder="-" /></th>
              <th style={{borderLeft:'2px solid #334155'}}>
                <select style={{width:'40px', fontSize:10, padding:1, background:'#1e293b', color:'#fbbf24', border:'1px solid #fbbf24'}} onChange={e=>bulkUpdate('reqAnden', e.target.value==='S')}>
                  <option value="">-</option><option value="S">S</option><option value="N">N</option>
                </select>
              </th>
              <th><input type="number" step="0.1" style={{width:'40px', fontSize:10, padding:1, background:'#1e293b', color:'#fbbf24', border:'1px solid #fbbf24'}} onBlur={e=>bulkUpdate('andL', parseFloat(e.target.value))} placeholder="-" /></th>
              <th><input type="number" step="0.1" style={{width:'40px', fontSize:10, padding:1, background:'#1e293b', color:'#fbbf24', border:'1px solid #fbbf24'}} onBlur={e=>bulkUpdate('andA', parseFloat(e.target.value))} placeholder="-" /></th>
              <th>
                <select style={{width:'40px', fontSize:10, padding:1, background:'#1e293b', color:'#fbbf24', border:'1px solid #fbbf24'}} onChange={e=>bulkUpdate('andLados', parseInt(e.target.value,10))}>
                  <option value="">-</option><option value={1}>1</option><option value={2}>2</option>
                </select>
              </th>
              <th style={{borderLeft:'2px solid #334155'}}>
                <select style={{width:'40px', fontSize:10, padding:1, background:'#1e293b', color:'#fbbf24', border:'1px solid #fbbf24'}} onChange={e=>bulkUpdate('reqSardinel', e.target.value==='S')}>
                  <option value="">-</option><option value="S">S</option><option value="N">N</option>
                </select>
              </th>
              <th><input type="number" step="0.1" style={{width:'40px', fontSize:10, padding:1, background:'#1e293b', color:'#fbbf24', border:'1px solid #fbbf24'}} onBlur={e=>bulkUpdate('sarL', parseFloat(e.target.value))} placeholder="-" /></th>
              <th><input type="number" step="0.1" style={{width:'40px', fontSize:10, padding:1, background:'#1e293b', color:'#fbbf24', border:'1px solid #fbbf24'}} onBlur={e=>bulkUpdate('sarA', parseFloat(e.target.value))} placeholder="-" /></th>
              <th>
                <select style={{width:'40px', fontSize:10, padding:1, background:'#1e293b', color:'#fbbf24', border:'1px solid #fbbf24'}} onChange={e=>bulkUpdate('sarLados', parseInt(e.target.value,10))}>
                  <option value="">-</option><option value={1}>1</option><option value={2}>2</option>
                </select>
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleData.map((r, i) => {
              const isUndefined = !r.de || !r.a || String(r.de).trim().toLowerCase() === 'undefined' || String(r.a).trim().toLowerCase() === 'undefined' || String(r.de).trim() === '' || String(r.a).trim() === '';
              
              if (isUndefined) {
                return (
                  <tr key={r.id} style={{ background: 'transparent', borderBottom: '1px solid #334155' }}>
                    <td style={{position:'sticky', left:0, zIndex:1, background: '#0f172a', borderRight:'1px solid #334155'}}></td>
                    <td colSpan="35" style={{background: 'transparent'}}></td>
                  </tr>
                );
              }

              const isSelected = selectedRow && selectedRow.id === r.id;
              return (
              <tr key={r.id} onClick={() => setSelectedRow(r)} style={{
                background: isSelected ? 'rgba(56, 189, 248, 0.15)' : (r.reqUrbanismo ? 'rgba(59,130,246,0.05)' : 'transparent'),
                borderBottom: '1px solid #334155',
                cursor: 'pointer',
                borderLeft: isSelected ? '4px solid #38bdf8' : '4px solid transparent'
              }}>
                <td style={{position:'sticky', left:0, zIndex:1, background: isSelected ? '#1e293b' : '#0f172a', fontWeight:'bold', borderRight:'1px solid #334155'}}>{r.de}-{r.a}</td>
                <td style={{textAlign:'center'}}>
                  <input type="checkbox" checked={r.reqUrbanismo} onChange={e=>updateRow(r.id,'reqUrbanismo',e.target.checked)} />
                </td>
                
                {/* Pavimento */}
                <td style={{borderLeft:'2px solid #334155', textAlign:'center'}}>
                  <input type="checkbox" checked={r.pavDemolicion} disabled={!r.reqUrbanismo} onChange={e=>updateRow(r.id,'pavDemolicion',e.target.checked)} />
                </td>
                <td><input type="number" step="0.01" style={{width:'50px', background:'transparent', color:'white', border:'none'}} value={r.pavEspesorDem} disabled={!r.reqUrbanismo||!r.pavDemolicion} onChange={e=>updateRow(r.id,'pavEspesorDem',parseFloat(e.target.value)||0)} /></td>
                <td>
                  <select value={r.pavTipo} disabled={!r.reqUrbanismo} onChange={e=>updateRow(r.id,'pavTipo',e.target.value)} style={{background:'#1e293b', color:'white', border:'1px solid #334155'}}>
                    <option value="FX">Asfalto (FX)</option>
                    <option value="RG">Concreto (RG)</option>
                  </select>
                </td>
                <td style={{textAlign:'center'}}>
                  <input type="checkbox" checked={r.pavReqAcero} disabled={!r.reqUrbanismo||r.pavTipo!=='RG'} onChange={e=>updateRow(r.id,'pavReqAcero',e.target.checked)} />
                </td>
                <td><input type="number" step="1" style={{width:'50px', background:'transparent', color:'white', border:'none'}} value={r.pavKgAcero} disabled={!r.reqUrbanismo||!r.pavReqAcero||r.pavTipo!=='RG'} onChange={e=>updateRow(r.id,'pavKgAcero',parseFloat(e.target.value)||0)} /></td>
                <td><input type="number" step="0.1" style={{width:'50px', background:'transparent', color:'white', border:'none'}} value={r.pavL} disabled={!r.reqUrbanismo} onChange={e=>updateRow(r.id,'pavL',parseFloat(e.target.value)||0)} /></td>
                <td><input type="number" step="0.1" style={{width:'50px', background:'transparent', color:'white', border:'none'}} value={r.pavA} disabled={!r.reqUrbanismo} onChange={e=>updateRow(r.id,'pavA',parseFloat(e.target.value)||0)} /></td>
                <td style={{textAlign:'center', color:'#8b5cf6', fontWeight:'bold'}}>{((r.pavL||0)*(r.pavA||0)).toFixed(2)}</td>
                <td style={{textAlign:'center', color:'#8b5cf6', fontWeight:'bold'}}>{(r.pavDemolicion ? (r.pavL||0)*(r.pavA||0)*(r.pavEspesorDem||0) : 0).toFixed(2)}</td>
                
                {/* Rasante */}
                <td style={{borderLeft:'2px solid #334155', textAlign:'center'}}>
                  <input type="checkbox" checked={r.reqRasante} disabled={!r.reqUrbanismo} onChange={e=>updateRow(r.id,'reqRasante',e.target.checked)} />
                </td>
                <td><input type="number" step="0.1" style={{width:'50px', background:'transparent', color:'white', border:'none'}} value={r.rasL} disabled={!r.reqUrbanismo||!r.reqRasante} onChange={e=>updateRow(r.id,'rasL',parseFloat(e.target.value)||0)} /></td>
                <td><input type="number" step="0.1" style={{width:'50px', background:'transparent', color:'white', border:'none'}} value={r.rasA} disabled={!r.reqUrbanismo||!r.reqRasante} onChange={e=>updateRow(r.id,'rasA',parseFloat(e.target.value)||0)} /></td>
                <td><input type="number" step="0.1" style={{width:'50px', background:'transparent', color:'white', border:'none'}} value={r.rasProf} disabled={!r.reqUrbanismo||!r.reqRasante} onChange={e=>updateRow(r.id,'rasProf',parseFloat(e.target.value)||0)} /></td>
                <td style={{textAlign:'center', color:'#8b5cf6', fontWeight:'bold'}}>{(r.reqRasante ? (r.rasL||0)*(r.rasA||0)*(r.rasProf||0) : 0).toFixed(2)}</td>

                {/* Sub Base */}
                <td style={{borderLeft:'2px solid #334155', textAlign:'center'}}>
                  <input type="checkbox" checked={r.reqSubBase} disabled={!r.reqUrbanismo} onChange={e=>updateRow(r.id,'reqSubBase',e.target.checked)} />
                </td>
                <td><input type="number" step="0.1" style={{width:'50px', background:'transparent', color:'white', border:'none'}} value={r.sbL} disabled={!r.reqUrbanismo||!r.reqSubBase} onChange={e=>updateRow(r.id,'sbL',parseFloat(e.target.value)||0)} /></td>
                <td><input type="number" step="0.1" style={{width:'50px', background:'transparent', color:'white', border:'none'}} value={r.sbA} disabled={!r.reqUrbanismo||!r.reqSubBase} onChange={e=>updateRow(r.id,'sbA',parseFloat(e.target.value)||0)} /></td>
                <td><input type="number" step="0.1" style={{width:'50px', background:'transparent', color:'white', border:'none'}} value={r.sbProf} disabled={!r.reqUrbanismo||!r.reqSubBase} onChange={e=>updateRow(r.id,'sbProf',parseFloat(e.target.value)||0)} title="No suma a M2"/></td>
                <td style={{textAlign:'center', color:'#8b5cf6', fontWeight:'bold'}}>{(r.reqSubBase ? (r.sbL||0)*(r.sbA||0) : 0).toFixed(2)}</td>

                {/* Base */}
                <td style={{borderLeft:'2px solid #334155', textAlign:'center'}}>
                  <input type="checkbox" checked={r.reqBase} disabled={!r.reqUrbanismo} onChange={e=>updateRow(r.id,'reqBase',e.target.checked)} />
                </td>
                <td><input type="number" step="0.1" style={{width:'50px', background:'transparent', color:'white', border:'none'}} value={r.baseL} disabled={!r.reqUrbanismo||!r.reqBase} onChange={e=>updateRow(r.id,'baseL',parseFloat(e.target.value)||0)} /></td>
                <td><input type="number" step="0.1" style={{width:'50px', background:'transparent', color:'white', border:'none'}} value={r.baseA} disabled={!r.reqUrbanismo||!r.reqBase} onChange={e=>updateRow(r.id,'baseA',parseFloat(e.target.value)||0)} /></td>
                <td><input type="number" step="0.1" style={{width:'50px', background:'transparent', color:'white', border:'none'}} value={r.baseProf} disabled={!r.reqUrbanismo||!r.reqBase} onChange={e=>updateRow(r.id,'baseProf',parseFloat(e.target.value)||0)} title="No suma a M2"/></td>
                <td style={{textAlign:'center', color:'#8b5cf6', fontWeight:'bold'}}>{(r.reqBase ? (r.baseL||0)*(r.baseA||0) : 0).toFixed(2)}</td>

                {/* Anden */}
                <td style={{borderLeft:'2px solid #334155', textAlign:'center'}}>
                  <input type="checkbox" checked={r.reqAnden} disabled={!r.reqUrbanismo} onChange={e=>updateRow(r.id,'reqAnden',e.target.checked)} />
                </td>
                <td><input type="number" step="0.1" style={{width:'50px', background:'transparent', color:'white', border:'none'}} value={r.andL} disabled={!r.reqUrbanismo||!r.reqAnden} onChange={e=>updateRow(r.id,'andL',parseFloat(e.target.value)||0)} /></td>
                <td><input type="number" step="0.1" style={{width:'50px', background:'transparent', color:'white', border:'none'}} value={r.andA} disabled={!r.reqUrbanismo||!r.reqAnden} onChange={e=>updateRow(r.id,'andA',parseFloat(e.target.value)||0)} /></td>
                <td>
                  <select value={r.andLados} disabled={!r.reqUrbanismo||!r.reqAnden} onChange={e=>updateRow(r.id,'andLados',parseInt(e.target.value,10))} style={{background:'#1e293b', color:'white', border:'1px solid #334155'}}>
                    <option value={1}>1 Lado</option>
                    <option value={2}>2 Lados</option>
                  </select>
                </td>
                <td style={{textAlign:'center', color:'#8b5cf6', fontWeight:'bold'}}>{(r.reqAnden ? (r.andL||0)*(r.andA||0)*(r.andLados||1) : 0).toFixed(2)}</td>

                {/* Sardinel */}
                <td style={{borderLeft:'2px solid #334155', textAlign:'center'}}>
                  <input type="checkbox" checked={r.reqSardinel} disabled={!r.reqUrbanismo} onChange={e=>updateRow(r.id,'reqSardinel',e.target.checked)} />
                </td>
                <td><input type="number" step="0.1" style={{width:'50px', background:'transparent', color:'white', border:'none'}} value={r.sarL} disabled={!r.reqUrbanismo||!r.reqSardinel} onChange={e=>updateRow(r.id,'sarL',parseFloat(e.target.value)||0)} /></td>
                <td style={{textAlign:'center'}}><input type="number" step="0.01" value={r.sarA} onChange={e=>updateRow(r.id, 'sarA', e.target.value)} style={{width:50, background:'#0f172a', color:'white', border:'1px solid #475569'}}/></td>
                <td style={{textAlign:'center'}}>
                  <select value={r.sarLados} onChange={e=>updateRow(r.id, 'sarLados', parseInt(e.target.value))} style={{width:40, background:'#0f172a', color:'white', border:'1px solid #475569'}}>
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                  </select>
                </td>
                <td style={{textAlign:'center', color:'#8b5cf6', fontWeight:'bold'}}>{(r.reqSardinel ? (r.sarL||0)*(r.sarLados||1) : 0).toFixed(2)}</td>
              </tr>
            )})}
          </tbody>
          <tfoot>
            <tr style={{background:'#1e293b', fontWeight:'bold', position:'sticky', bottom:0, zIndex:2, borderTop:'2px solid #334155'}}>
              <td colSpan="6" style={{textAlign:'right', padding:'8px 12px', color:'#fbbf24', borderRight:'2px solid #334155'}}>TOTALES (Visibles c/Urb=SI)</td>
              <td style={{textAlign:'center', color:'#fbbf24'}}>{totals.pavKgAcero > 0 ? totals.pavKgAcero.toFixed(2) : '-'}</td>
              <td style={{textAlign:'center', color:'#fbbf24'}}>{totals.pavL > 0 ? totals.pavL.toFixed(2) : '-'}</td>
              <td style={{textAlign:'center', color:'#fbbf24'}}>{totals.pavA > 0 ? totals.pavA.toFixed(2) : '-'}</td>
              <td style={{textAlign:'center', color:'#fbbf24', fontWeight: 'bold'}}>{totals.pavArea > 0 ? totals.pavArea.toFixed(2) : '-'}</td>
              <td style={{textAlign:'center', color:'#fbbf24', fontWeight: 'bold'}}>{totals.pavDemolVol > 0 ? totals.pavDemolVol.toFixed(2) : '-'}</td>
              <td style={{borderLeft:'2px solid #334155'}}></td>
              <td style={{textAlign:'center', color:'#fbbf24'}}>{totals.rasL > 0 ? totals.rasL.toFixed(2) : '-'}</td>
              <td style={{textAlign:'center', color:'#fbbf24'}}>{totals.rasA > 0 ? totals.rasA.toFixed(2) : '-'}</td>
              <td style={{textAlign:'center', color:'#fbbf24'}}>{totals.rasProf > 0 ? totals.rasProf.toFixed(2) : '-'}</td>
              <td style={{textAlign:'center', color:'#fbbf24', fontWeight: 'bold'}}>{totals.rasVol > 0 ? totals.rasVol.toFixed(2) : '-'}</td>
              <td style={{borderLeft:'2px solid #334155'}}></td>
              <td style={{textAlign:'center', color:'#fbbf24'}}>{totals.sbL > 0 ? totals.sbL.toFixed(2) : '-'}</td>
              <td style={{textAlign:'center', color:'#fbbf24'}}>{totals.sbA > 0 ? totals.sbA.toFixed(2) : '-'}</td>
              <td style={{textAlign:'center', color:'#fbbf24'}}>{totals.sbProf > 0 ? totals.sbProf.toFixed(2) : '-'}</td>
              <td style={{textAlign:'center', color:'#fbbf24', fontWeight: 'bold'}}>{totals.sbArea > 0 ? totals.sbArea.toFixed(2) : '-'}</td>
              <td style={{borderLeft:'2px solid #334155'}}></td>
              <td style={{textAlign:'center', color:'#fbbf24'}}>{totals.baseL > 0 ? totals.baseL.toFixed(2) : '-'}</td>
              <td style={{textAlign:'center', color:'#fbbf24'}}>{totals.baseA > 0 ? totals.baseA.toFixed(2) : '-'}</td>
              <td style={{textAlign:'center', color:'#fbbf24'}}>{totals.baseProf > 0 ? totals.baseProf.toFixed(2) : '-'}</td>
              <td style={{textAlign:'center', color:'#fbbf24', fontWeight: 'bold'}}>{totals.baseArea > 0 ? totals.baseArea.toFixed(2) : '-'}</td>
              <td style={{borderLeft:'2px solid #334155'}}></td>
              <td style={{textAlign:'center', color:'#fbbf24'}}>{totals.andL > 0 ? totals.andL.toFixed(2) : '-'}</td>
              <td style={{textAlign:'center', color:'#fbbf24'}}>{totals.andA > 0 ? totals.andA.toFixed(2) : '-'}</td>
              <td></td>
              <td style={{textAlign:'center', color:'#fbbf24', fontWeight: 'bold'}}>{totals.andArea > 0 ? totals.andArea.toFixed(2) : '-'}</td>
              <td style={{borderLeft:'2px solid #334155'}}></td>
              <td style={{textAlign:'center', color:'#fbbf24'}}>{totals.sarL > 0 ? totals.sarL.toFixed(2) : '-'}</td>
              <td style={{textAlign:'center', color:'#fbbf24'}}>{totals.sarA > 0 ? totals.sarA.toFixed(2) : '-'}</td>
              <td></td>
              <td style={{textAlign:'center', color:'#fbbf24', fontWeight: 'bold'}}>{totals.sarLong > 0 ? totals.sarLong.toFixed(2) : '-'}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* DASHBOARD Y RESUMEN DE CANTIDADES */}
      <div style={{marginTop:'30px'}}>
        <div className="c">
          <div className="ct">Cantidades de Obra Urbanismo</div>
          <div style={{overflowX:"auto"}}>
            <table>
              <thead>
                <tr>
                  <th style={{padding: '10px'}}>Codigo</th>
                  <th style={{padding: '10px', minWidth:180}}>Descripcion</th>
                  <th style={{padding: '10px'}}>Cant</th>
                  <th style={{padding: '10px'}}>Und</th>
                  <th style={{padding: '10px'}}>Incluir en Pto</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(groupedItems).sort().map(subCapCod => (
                  <React.Fragment key={subCapCod}>
                    <tr style={{background: 'rgba(59, 130, 246, 0.15)'}}>
                      <td colSpan="5" style={{padding: '6px 10px', fontWeight: 'bold', color: '#60a5fa', fontSize: 13, textAlign: 'left'}}>
                        {subCapCod} - {groupedItems[subCapCod].desc}
                      </td>
                    </tr>
                    {groupedItems[subCapCod].items.map(function(it){
                      var isIncl = P['inclUrb_' + it.cod.replace(/\./g, '')] !== false;
                      return <tr key={it.cod} style={{opacity:it.cant>0?1:.4}}>
                      <td style={{fontSize:12, padding: '8px'}}>{it.cod}</td>
                      <td style={{textAlign:"left",fontSize:12, padding: '8px'}}>
                        <div>{it.desc}</div>
                      </td>
                      <td style={{fontWeight:600,color:it.cant>0?"#D4A843":"#555", padding: '8px'}}>{it.cant>0?it.cant.toFixed(2):"-"}</td>
                      <td style={{padding: '8px'}}>{it.und}</td>
                      <td style={{textAlign:"center", padding: '8px'}}>
                        <input type="checkbox" checked={isIncl} onChange={function(e){
                          var nP = {...P};
                          nP['inclUrb_' + it.cod.replace(/\./g, '')] = e.target.checked;
                          sP(nP);
                        }} />
                      </td>
                    </tr>;})}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
        
        <div style={{marginTop: '20px', padding: '10px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '6px', fontSize: '11px', color: '#94a3b8'}}>
          <strong style={{color: '#60a5fa'}}>Metodología de Cálculo:</strong>
          <ul style={{margin: '5px 0 0 15px', padding: 0}}>
            <li><strong>Demolición Pisos (M3):</strong> Longitud × Ancho × Espesor (solo si Demolición=S)</li>
            <li><strong>Excavación (M3):</strong> Volumen SubBase (L×A×Prof) + Volumen Base (L×A×Prof) + Volumen Rasante (L×A×Prof)</li>
            <li><strong>Relleno Terraplen (M3):</strong> Mismo volumen excavado de la Rasante</li>
            <li><strong>Sobre Acarreos (M3):</strong> Demolición + Excavación</li>
            <li><strong>Sub Base / Base / Pavicreto (M2):</strong> Longitud × Ancho (solo en tramos requeridos)</li>
            <li><strong>Acero RG (KG):</strong> Volumen de Pavimento (L×A×0.20) × Cuantía (Kg/m3) (solo para Pavimento RG con Acero=S)</li>
            <li><strong>Andenes (M2):</strong> Longitud × Ancho × Número de Lados</li>
            <li><strong>Sardineles (ML):</strong> Longitud × Número de Lados</li>
          </ul>
        </div>
    </div>
  );
}
