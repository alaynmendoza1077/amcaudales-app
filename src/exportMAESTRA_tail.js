    wsNodos.columns = [
      { width: 10 }, { width: 25 }, { width: 25 }, { width: 25 }, { width: 20 }
    ];
  }

  /* ─── HOJA: 10.Presupuesto (formato idéntico a 10.Presupuesto2026 del xlsm) ─── */
  if (pbItems && pbItems.length > 0) {
    const wsPb = wb.addWorksheet('10.Presupuesto', { views: [{ showGridLines: false }] });

    // ── Anchos de columnas idénticos al original ──
    wsPb.getColumn(1).width = 16;   // A: Código
    wsPb.getColumn(2).width = 55;   // B: Descripción
    wsPb.getColumn(3).width = 10;   // C: Unidad
    wsPb.getColumn(4).width = 13;   // D: Cantidad
    wsPb.getColumn(5).width = 18;   // E: Precio Peso
    wsPb.getColumn(6).width = 20;   // F: Total Peso
    wsPb.getColumn(7).width = 3;    // G: separador
    wsPb.getColumn(8).width = 4;    // H: flag activo

    // ── Helpers ──
    const pbFill = (argb) => ({ type:'pattern', pattern:'solid', fgColor:{ argb } });
    const pbFont = (bold, size, argb) => ({ name:'Arial', size:size||10, bold:!!bold, color:{ argb: argb||'FF0A0A0A' } });
    const pbBord = (style, argb) => ({ style:style||'thin', color:{ argb: argb||'FFAAAAAA' } });
    const pbAllBorder = (s, c) => { var b = pbBord(s,c); return { top:b, bottom:b, left:b, right:b }; };

    // ── FILAS 1-24: ENCABEZADO INSTITUCIONAL ──
    // Fila 1: Empresa
    wsPb.mergeCells('A1:F1');
    var c1 = wsPb.getCell('A1');
    c1.value = 'EMPRESA PÚBLICA DE ALCANTARILLADO DE SANTANDER S.A. E.S.P.';
    c1.font  = pbFont(true, 12, 'FFFFFFFF');
    c1.fill  = pbFill('FF003B73');
    c1.alignment = { horizontal:'center', vertical:'middle' };
    wsPb.getRow(1).height = 24;

    // Filas 2-9: vacías encabezado
    for(var hi=2; hi<=9; hi++) {
      try { wsPb.mergeCells('A'+hi+':F'+hi); } catch(e) {}
      wsPb.getCell('A'+hi).fill = pbFill('FF003B73');
      wsPb.getRow(hi).height = 6;
    }

    // Fila 10: Subgerencia
    try { wsPb.mergeCells('A10:F10'); } catch(e) {}
    var c10 = wsPb.getCell('A10');
    c10.value = 'SUBGERENCIA DE ALCANTARILLADO';
    c10.font  = pbFont(true, 11, 'FFFFFFFF');
    c10.fill  = pbFill('FF003B73');
    c10.alignment = { horizontal:'center', vertical:'middle' };
    wsPb.getRow(10).height = 18;

    // Filas 11-15: vacías claras
    for(var hi2=11; hi2<=15; hi2++) {
      try { wsPb.mergeCells('A'+hi2+':F'+hi2); } catch(e) {}
      wsPb.getCell('A'+hi2).fill = pbFill('FFD6E4F0');
      wsPb.getRow(hi2).height = 5;
    }

    // Fila 16: Nombre proyecto / fecha
    try { wsPb.mergeCells('A16:B16'); } catch(e) {}
    var c16a = wsPb.getCell('A16');
    c16a.value = 'NOMBRE DEL PROYECTO:';
    c16a.font  = pbFont(true, 10, 'FF003B73');
    c16a.fill  = pbFill('FFD6E4F0');
    c16a.alignment = { horizontal:'left', vertical:'middle' };
    var c16c = wsPb.getCell('C16');
    c16c.value = P.municipio || '';
    c16c.font  = pbFont(false, 10, 'FF0A0A0A');
    c16c.fill  = pbFill('FFD6E4F0');
    c16c.alignment = { horizontal:'center', vertical:'middle' };
    try { wsPb.mergeCells('D16:E16'); } catch(e) {}
    var c16d = wsPb.getCell('D16');
    c16d.value = 'FECHA:';
    c16d.font  = pbFont(true, 10, 'FF003B73');
    c16d.fill  = pbFill('FFD6E4F0');
    c16d.alignment = { horizontal:'right', vertical:'middle' };
    var c16f = wsPb.getCell('F16');
    c16f.value = P.fecha || new Date().toLocaleDateString('es-CO');
    c16f.font  = pbFont(false, 10, 'FF0A0A0A');
    c16f.fill  = pbFill('FFD6E4F0');
    c16f.alignment = { horizontal:'center', vertical:'middle' };
    wsPb.getRow(16).height = 18;

    // Filas 17-19: vacías
    for(var hi3=17; hi3<=19; hi3++) {
      try { wsPb.mergeCells('A'+hi3+':F'+hi3); } catch(e) {}
      wsPb.getRow(hi3).height = 5;
    }

    // Fila 20: Nombre completo del proyecto
    try { wsPb.mergeCells('A20:F20'); } catch(e) {}
    var c20 = wsPb.getCell('A20');
    c20.value = (P.proyecto || P.barrio || 'PROYECTO DE ALCANTARILLADO').toUpperCase();
    c20.font  = pbFont(true, 11, 'FF003B73');
    c20.fill  = pbFill('FFD6E4F0');
    c20.alignment = { horizontal:'center', vertical:'middle', wrapText:true };
    wsPb.getRow(20).height = 22;

    // Filas 21-22: vacías
    for(var hi4=21; hi4<=22; hi4++) {
      try { wsPb.mergeCells('A'+hi4+':F'+hi4); } catch(e) {}
      wsPb.getRow(hi4).height = 5;
    }

    // Fila 23: Título del formulario
    try { wsPb.mergeCells('A23:F23'); } catch(e) {}
    var c23 = wsPb.getCell('A23');
    c23.value = 'FORMULARIO APROXIMADO DE OBRA';
    c23.font  = pbFont(true, 10, 'FF003B73');
    c23.fill  = pbFill('FFEBF5FB');
    c23.alignment = { horizontal:'center', vertical:'middle' };
    wsPb.getRow(23).height = 16;

    // Fila 24: separadora
    try { wsPb.mergeCells('A24:F24'); } catch(e) {}
    wsPb.getRow(24).height = 4;

    // ── FILA 25: CABECERA DE COLUMNAS (idéntica al original) ──
    var pbHdrs = ['CÓDIGO','DESCRIPCIÓN','UNIDAD','CANTIDAD','PRECIO PESO','TOTAL PESO'];
    for(var ci=0; ci<pbHdrs.length; ci++) {
      var cHd = wsPb.getCell(25, ci+1);
      cHd.value = pbHdrs[ci];
      cHd.font  = pbFont(true, 10, 'FFFFFFFF');
      cHd.fill  = pbFill('FF003B73');
      cHd.alignment = { horizontal: ci===1 ? 'left' : 'center', vertical:'middle', wrapText:true };
      cHd.border = pbAllBorder('medium', 'FF000000');
    }
    wsPb.getRow(25).height = 22;

    // ── Pre-calcular totales por código para encabezados de grupo ──
    var totByCode = {};
    pbItems.forEach(function(it) {
      if(it.lv >= 3 && it.q > 0 && it.p > 0) {
        var v = Math.round(it.q * it.p);
        var parts = it.c.split('.');
        for(var pi=1; pi<=parts.length; pi++) {
          var key = parts.slice(0,pi).join('.');
          totByCode[key] = (totByCode[key]||0) + v;
        }
        if(it.c.startsWith('S')) {
          totByCode['S'] = (totByCode['S']||0) + v;
        }
      }
    });

    // ── PRE-PASO PARA MAPEAR FILAS ──
    var curRowTemp = 26;
    var rowMapTemp = {};
    pbItems.forEach(function(it) {
      if((it.lv || 1) >= 4 && (it.p||0) === 0) return;
      rowMapTemp[it.c] = curRowTemp++;
    });

    // ── ÍTEMS DESDE FILA 26 ──
    var curRow = 26;
    var itemCount = 0;

    pbItems.forEach(function(it) {
      var code   = it.c || '';
      var lv     = it.lv || 1;
      var isLeaf = lv >= 4;
      var hasVal = isLeaf && (it.q||0) > 0 && (it.p||0) > 0;
      var total  = hasVal ? Math.round(it.q * it.p) : null;
      var grpTot = totByCode[code] || 0;
      var showTotal = lv < 4 ? (grpTot > 0 ? grpTot : null) : total;

      // Saltar ítems hoja sin precio
      if(lv >= 4 && (it.p||0) === 0) return;

      // Color de fondo según nivel
      var bgArgb, fontArgb, isBold, rHeight;
      if(lv === 1) {
        bgArgb='FF1A3A5C'; fontArgb='FFFFFFFF'; isBold=true; rHeight=18;
      } else if(lv === 2) {
        bgArgb='FF1D6A9C'; fontArgb='FFFFFFFF'; isBold=true; rHeight=16;
      } else if(lv === 3) {
        bgArgb='FFD6E4F0'; fontArgb='FF003B73'; isBold=true; rHeight=15;
      } else {
        bgArgb = (itemCount % 2 === 0) ? 'FFFFFFFF' : 'FFEBF5FB';
        fontArgb='FF0A0A0A'; isBold=false; rHeight=14;
        if(hasVal) itemCount++;
      }

      var rowFill   = pbFill(bgArgb);
      var rowFont   = pbFont(isBold, 10, fontArgb);
      var rowBorder = pbAllBorder('thin', 'FFBBBBBB');

      // A: Código
      var cA = wsPb.getCell(curRow, 1);
      cA.value = code; cA.font = rowFont; cA.fill = rowFill;
      cA.alignment = { horizontal:'center', vertical:'middle' };
      cA.border = rowBorder;

      // B: Descripción
      var ind = Math.max(0, lv - 1);
      var cB = wsPb.getCell(curRow, 2);
      cB.value = it.d || ''; cB.font = rowFont; cB.fill = rowFill;
      cB.alignment = { horizontal:'left', vertical:'middle', indent: ind, wrapText: lv >= 4 };
      cB.border = rowBorder;

      // C: Unidad
      var cC = wsPb.getCell(curRow, 3);
      cC.value = lv >= 4 ? (it.u || '') : 'GLB';
      cC.font = rowFont; cC.fill = rowFill;
      cC.alignment = { horizontal:'center', vertical:'middle' };
      cC.border = rowBorder;

      // D: Cantidad
      var cD = wsPb.getCell(curRow, 4);
      cD.value = lv >= 4 ? (it.q || 0) : null;
      cD.font = rowFont; cD.fill = rowFill;
      cD.alignment = { horizontal:'right', vertical:'middle' };
      cD.numFmt = '#,##0.##'; cD.border = rowBorder;

      // E: Precio Unitario
      var cE = wsPb.getCell(curRow, 5);
      cE.value = lv >= 4 ? (it.p || 0) : null;
      cE.font = rowFont; cE.fill = rowFill;
      cE.alignment = { horizontal:'right', vertical:'middle' };
      cE.numFmt = '#,##0'; cE.border = rowBorder;

      // F: Total
      var fval = showTotal;
      if (isLeaf && it.q != null && it.p != null) {
          fval = { formula: `ROUND(D${curRow}*E${curRow}, 0)`, result: showTotal || 0 };
      } else if (!isLeaf && grpTot > 0) {
          let numParts = code.split('.').length;
          let childRows = [];
          pbItems.forEach(child => {
             if (child.c && child.c.startsWith(code + '.') && child.c.split('.').length === numParts + 1) {
                 if (rowMapTemp[child.c]) childRows.push(rowMapTemp[child.c]);
             }
          });
          if (childRows.length > 0) {
              fval = { formula: childRows.map(r => `F${r}`).join('+'), result: grpTot };
          }
      }
      var cF = wsPb.getCell(curRow, 6);
      cF.value = fval;
      cF.font = rowFont; cF.fill = rowFill;
      cF.alignment = { horizontal:'right', vertical:'middle' };
      cF.numFmt = '#,##0'; cF.border = rowBorder;

      // H: Flag activación (igual al original)
      var cH = wsPb.getCell(curRow, 8);
      cH.value = lv >= 4 ? (hasVal ? 1 : 0) : 1;
      cH.font = pbFont(false, 8, 'FF888888');
      cH.alignment = { horizontal:'center' };

      wsPb.getRow(curRow).height = rHeight;
      curRow++;
    });

    // ── PIE: RESUMEN FINANCIERO ──
    var cdPb2=0, sumPb2=0;
    var rootRowsCD = [];
    var rootRowsS = [];
    pbItems.forEach(function(it) {
      if (!it.c.includes('.')) {
         if (it.c === 'S' && rowMapTemp[it.c]) {
             rootRowsS.push(rowMapTemp[it.c]);
         } else if (rowMapTemp[it.c]) {
             rootRowsCD.push(rowMapTemp[it.c]);
         }
      }
      if(it.lv >= 3 && (it.q||0) > 0 && (it.p||0) > 0) {
        var v2 = Math.round(it.q * it.p);
        if(it.c.startsWith('S')) sumPb2 += v2; else cdPb2 += v2;
      }
    });
    
    var fCD = rootRowsCD.length > 0 ? rootRowsCD.map(r => `F${r}`).join('+') : `${cdPb2}`;
    var fS = rootRowsS.length > 0 ? rootRowsS.map(r => `F${r}`).join('+') : `${sumPb2}`;

    var pAdmin = P.porcAdmin || 0.29;
    var pImp = P.porcImprevistos || 0.01;
    var pUt = P.porcUtilidad || 0.05;
    var pIva = P.porcIVA || 0.19;
    var pPma = P.porcPMA !== undefined ? P.porcPMA : 0.025525;
    var pPmt = P.porcPMT !== undefined ? P.porcPMT : 0.051068;

    var admPb2 = Math.round(cdPb2 * pAdmin);
    var impPb2 = Math.round(cdPb2 * pImp);
    var utPb2  = Math.round(cdPb2 * pUt);
    var ivaPb2 = Math.round(utPb2 * pIva);
    var pmaPb2 = (P.reqPMA === 'N' || P.reqPMA === false) ? 0 : Math.round(cdPb2 * pPma);
    var pmtPb2 = (P.reqPMT === 'N' || P.reqPMT === false) ? 0 : Math.round(cdPb2 * pPmt);
    var totPb2 = cdPb2 + admPb2 + impPb2 + utPb2 + ivaPb2 + pmaPb2 + pmtPb2 + sumPb2;
    var mlPb2  = lt > 0 ? Math.round(totPb2 / lt) : 0;

    curRow++; // separador

    var addFR = function(label, val, pct, dark) {
      var bgA = dark ? 'FF1A3A5C' : 'FFEBF5FB';
      var fgA = dark ? 'FFFFFFFF' : 'FF0A0A0A';
      for(var ci2=1; ci2<=6; ci2++) {
        var c2 = wsPb.getCell(curRow, ci2);
        c2.fill = pbFill(bgA);
        c2.border = pbAllBorder('thin', 'FFAAAAAA');
        c2.font = pbFont(dark, 10, fgA);
      }
      wsPb.getCell(curRow, 2).value = label;
      wsPb.getCell(curRow, 2).alignment = { horizontal:'left', vertical:'middle' };
      if(pct !== null && pct !== undefined) {
        wsPb.getCell(curRow, 3).value = pct;
        wsPb.getCell(curRow, 3).numFmt = '0.00%';
        wsPb.getCell(curRow, 3).alignment = { horizontal:'center' };
      }
      wsPb.getCell(curRow, 6).value = val;
      wsPb.getCell(curRow, 6).numFmt = '#,##0';
      wsPb.getCell(curRow, 6).alignment = { horizontal:'right' };
      wsPb.getRow(curRow).height = 16;
      curRow++;
    };

    let rCD = curRow;
    addFR('COSTO DIRECTO OBRA CIVIL', {formula: fCD, result: cdPb2}, null, true);
    let rAdm = curRow;
    addFR('Administración', {formula: `ROUND(F${rCD}*C${rAdm},0)`, result: admPb2}, pAdmin);
    let rImp = curRow;
    addFR('Imprevistos', {formula: `ROUND(F${rCD}*C${rImp},0)`, result: impPb2}, pImp);
    let rUt = curRow;
    addFR('Utilidad', {formula: `ROUND(F${rCD}*C${rUt},0)`, result: utPb2}, pUt);
    let rIva = curRow;
    addFR('IVA sobre Utilidad', {formula: `ROUND(F${rUt}*C${rIva},0)`, result: ivaPb2}, pIva);
    let rSumaOC = curRow;
    addFR('SUBTOTAL OBRA CIVIL', {formula: `F${rCD}+F${rAdm}+F${rImp}+F${rUt}+F${rIva}`, result: cdPb2+admPb2+impPb2+utPb2+ivaPb2}, null, true);
    
    let fTotObra = `F${rSumaOC}`;
    if (P.reqPMA !== 'N' && P.reqPMA !== false) {
      let rPma = curRow;
      addFR('Plan de Manejo Ambiental (PMA)', {formula: `ROUND(F${rCD}*C${rPma},0)`, result: pmaPb2}, pPma);
      fTotObra += `+F${rPma}`;
    }
    if (P.reqPMT !== 'N' && P.reqPMT !== false) {
      let rPmt = curRow;
      addFR('Plan de Manejo de Tránsito (PMT)', {formula: `ROUND(F${rCD}*C${rPmt},0)`, result: pmtPb2}, pPmt);
      fTotObra += `+F${rPmt}`;
    }

    let rTotObra = curRow;
    addFR('COSTO TOTAL OBRA CIVIL', {formula: fTotObra, result: cdPb2+admPb2+impPb2+utPb2+ivaPb2+pmaPb2+pmtPb2}, null, true);
    
    // Interventoría
    var intPb2 = 0, aiuS = 0;
    if(P.reqInterventoria==='S' || P.reqInterventoria===true){
      var baseInt = (cdPb2+admPb2+impPb2+utPb2+ivaPb2+pmaPb2+pmtPb2) + sumPb2 + (sumPb2*0.291);
      intPb2 = Math.round(baseInt * (P.porcInterventoria || 0.08));
    }
    
    curRow++;
    let rSum = curRow;
    addFR('COSTO DIRECTO SUMINISTROS', {formula: fS, result: sumPb2}, null, true);
    let rAIUSum = curRow;
    aiuS = Math.round(sumPb2*0.291);
    addFR('A.I.U Suministros (29.1%)', {formula: `ROUND(F${rSum}*0.291,0)`, result: aiuS}, null);
    
    let rInt = curRow;
    if(P.reqInterventoria==='S' || P.reqInterventoria===true){
       let pInt = P.porcInterventoria || 0.08;
       addFR('Interventoría Obra', {formula: `ROUND((F${rTotObra}+F${rSum}+F${rAIUSum})*C${rInt},0)`, result: intPb2}, pInt);
    }
    
    curRow++;
    let fTotalProy = `F${rTotObra}+F${rSum}+F${rAIUSum}`;
    if (P.reqInterventoria==='S' || P.reqInterventoria===true) fTotalProy += `+F${rInt}`;
    let rTotFinal = curRow;
    addFR('VALOR TOTAL PROYECTO', {formula: fTotalProy, result: totPb2+intPb2+aiuS}, null, true);
  }

  var fn = (P.proyecto || P.barrio || "Proyecto").replace(/\s+/g, "_") + "_MAESTRA.xlsx";
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, fn);
}

export {exportMAESTRA};
