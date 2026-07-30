import { generarMarcoLisp } from './exportMarcoLISP';
import { exportMarcoPlantaLISP } from './exportMarcoPlantaLISP';
import { saveFileWithDialog } from './utils/fileSaver';

export function exportPerfilesLISP(R, P, T) {
  const ESCX = 1000.0 / parseFloat(P.escalaX || 250);
  const ESCY = 1000.0 / parseFloat(P.escalaY  || 100);

  const rawTramos = [];
  (R || []).forEach((r, idx) => {
    if (r.sep) return;
    const t  = (T && T[idx]) ? T[idx] : {};
    const L  = parseFloat(r.Le || r.L || t.longitud || 0);
    if (L <= 0) return;
    const parseF = (v, fb) => { let p = parseFloat(v); return isNaN(p) ? fb : p; };
    const p  = parseF(t.pendiente  || r.pendiente  || 0, 0);
    const H1 = parseF(r.H1, 0);
    const H2 = parseF(r.H2, 0);
    const cf0 = parseF(t.cotaFondoDE != null && t.cotaFondoDE !== "" ? t.cotaFondoDE : t.cotaFondo, 0);
    const cf1 = parseF(t.cotaFondoA  != null && t.cotaFondoA  !== "" ? t.cotaFondoA  : (cf0 - L * p / 100), 0);
    const ras0 = cf0 > 0 ? cf0 + H1 : 0;
    const ras1 = cf1 > 0 ? cf1 + H2 : 0;
    const dp   = parseF(P.diametroPozo, 1.20);
    let roughness = parseF(t.nManning != null ? t.nManning : r.nManning, 0.013);
    let derivedMat = t.material || r.material;
    if (!derivedMat || (derivedMat.toUpperCase() === "PVC" && roughness >= 0.013)) {
      derivedMat = roughness >= 0.013 ? "GRES" : "PVC";
    }

    rawTramos.push({
      de: String(r.de || `P${rawTramos.length+1}`),
      a:  String(r.a  || `P${rawTramos.length+2}`),
      cf0, cf1,
      ras0, ras1,
      L, p,
      diam: parseF(t.diametroCom || r.diametroCom || r.diamOrig, 200),
      mat: derivedMat.toUpperCase(),
      dp: parseF(P.diametroPozo, 1.20)
    });
  });

  if (!rawTramos.length) {
    alert('No hay tramos con longitud. Ejecute primero el cálculo hidráulico.');
    return;
  }

  const XBASE = 105.0;
  const XMAX = 710.0;
  const GRID_WIDTH = 1000.0;
  
  const FRANJAS = [
    { COTREF00: 520, EJE_T: 520, EJE_B: 310, AB1: 320, AB2: 340, ABT: 330, ARR: 345, NOM: 525, DL: 315, DT: 305, TK1: 310, TK2: 300 },
    { COTREF00: 270, EJE_T: 270, EJE_B:  60, AB1:  70, AB2:  90, ABT:  80, ARR:  95, NOM: 275, DL:  65, DT:  55, TK1:  60, TK2:  50 },
  ];

  // Split long tramos
  const tramosAll = [];
  for (let tr of rawTramos) {
      let pipeW = tr.L * ESCX;
      if (pipeW > XMAX) {
          let parts = Math.ceil(pipeW / XMAX);
          let splitL = tr.L / parts;
          let curCf0 = tr.cf0;
          let curRas0 = tr.ras0;
          let curDe = tr.de;
          for (let k = 1; k <= parts; k++) {
              let isLast = (k === parts);
              let nxtCf1 = curCf0 - (tr.p / 100) * splitL;
              let nxtRas1 = curRas0 - ((tr.ras0 - tr.ras1) / tr.L) * splitL;
              let nxtA = isLast ? tr.a : `${tr.de}-EMP${k}`;
              tramosAll.push({
                  ...tr,
                  de: curDe, a: nxtA, L: splitL,
                  cf0: curCf0, cf1: isLast ? tr.cf1 : nxtCf1,
                  ras0: curRas0, ras1: isLast ? tr.ras1 : nxtRas1,
              });
              curCf0 = nxtCf1;
              curRas0 = nxtRas1;
              curDe = nxtA;
          }
      } else {
          tramosAll.push(tr);
      }
  }

  const sequences = [];
  let currentSeq = [];
  let maxRas = -9999;
  let minBat = 9999;
  for (let i = 0; i < tramosAll.length; i++) {
    const tr = tramosAll[i];
    let curRas = Math.max(tr.ras0 || (tr.cf0 + tr.dp), tr.ras1 || (tr.cf1 + tr.dp));
    let curBat = Math.min(tr.cf0, tr.cf1);

    if (currentSeq.length === 0) {
      currentSeq.push(tr);
      maxRas = curRas;
      minBat = curBat;
    } else {
      let isShort = tr.L < 10;
      let prevShort = currentSeq[currentSeq.length - 1].L < 10;
      
      let nextMaxRas = Math.max(maxRas, curRas);
      let nextMinBat = Math.min(minBat, curBat);
      let diff = nextMaxRas - nextMinBat;

      if (currentSeq[currentSeq.length - 1].a === tr.de && !isShort && !prevShort && diff <= 16) {
        currentSeq.push(tr);
        maxRas = nextMaxRas;
        minBat = nextMinBat;
      } else {
        sequences.push(currentSeq);
        currentSeq = [tr];
        maxRas = curRas;
        minBat = curBat;
      }
    }
  }
  if (currentSeq.length > 0) sequences.push(currentSeq);

  const pages = [];
  let currentPage = 0;
  let currentFranja = 0;
  let currentX = XBASE;
  let longAcum = 0;
  const getFranjaData = (pIdx, fIdx) => {
    let p = pages.find(pg => pg.pageIdx === pIdx);
    if (!p) { p = { pageIdx: pIdx, franjas: [] }; pages.push(p); }
    let f = p.franjas.find(fr => fr.franjaIdx === fIdx);
    if (!f) { 
      f = { franjaIdx: fIdx, nodes: [], edges: [] }; 
      p.franjas.push(f); 
    }
    return f;
  };

  const advanceFranja = () => {
    currentFranja++;
    if (currentFranja >= FRANJAS.length) {
      currentFranja = 0;
      currentPage++;
    }
    currentX = XBASE;
  };

  for (let i_seq = 0; i_seq < sequences.length; i_seq++) {
    let seq = sequences[i_seq];
    let isShortSeq = seq[0].L < 10;

    if (currentX > XBASE) {
      currentX += 80;
      if (currentX > XBASE + XMAX) {
        advanceFranja();
      }
    }

    for (let i = 0; i < seq.length; i++) {
      let tr = seq[i];
      let curEscX = isShortSeq ? ESCX * 4 : ESCX;
      let pipeWidth = tr.L * curEscX;

      if (currentX + pipeWidth > XBASE + XMAX && currentX > XBASE) {
        advanceFranja();
      }

      let fd = getFranjaData(currentPage, currentFranja);

      let startX = currentX;
      currentX += pipeWidth;
      let endX = currentX;
      longAcum += tr.L;

      let n1 = fd.nodes.find(n => n.id === tr.de && Math.abs(n.x - startX) < 1.0);
      if (!n1) {
        n1 = { id: tr.de, x: startX, rasante: tr.ras0 || (tr.cf0 + tr.dp), batea: tr.cf0, k0: longAcum - tr.L, escX: curEscX, seqIdx: i_seq };
        fd.nodes.push(n1);
      } else {
        if (tr.cf0 < n1.batea) n1.batea = tr.cf0;
        let reqRas = tr.ras0 || (tr.cf0 + tr.dp);
        if (reqRas > n1.rasante) n1.rasante = reqRas;
      }

      let n2 = fd.nodes.find(n => n.id === tr.a && Math.abs(n.x - endX) < 1.0);
      if (!n2) {
        n2 = { id: tr.a, x: endX, rasante: tr.ras1 || (tr.cf1 + tr.dp), batea: tr.cf1, k0: longAcum, escX: curEscX, seqIdx: i_seq };
        fd.nodes.push(n2);
      } else {
        if (tr.cf1 < n2.batea) n2.batea = tr.cf1;
        let reqRas2 = tr.ras1 || (tr.cf1 + tr.dp);
        if (reqRas2 > n2.rasante) n2.rasante = reqRas2;
      }

      fd.edges.push({
        de: tr.de, a: tr.a,
        startX, endX,
        cf0: tr.cf0, cf1: tr.cf1,
        ras0: tr.ras0 || (tr.cf0 + tr.dp), ras1: tr.ras1 || (tr.cf1 + tr.dp),
        L: tr.L, p: tr.p, diam: tr.diam, mat: tr.mat, dp: tr.dp, escX: curEscX, seqIdx: i_seq
      });
    }
  }

  pages.forEach(p => {
    p.franjas.forEach(f => {
      f.seqs = {};
      f.nodes.forEach(n => {
        if (!f.seqs[n.seqIdx]) f.seqs[n.seqIdx] = { max_CR: 0, startX: 999999 };
        let sq = f.seqs[n.seqIdx];
        if (n.rasante > sq.max_CR) sq.max_CR = n.rasante;
        if (n.x < sq.startX) sq.startX = n.x;
      });
      for (let s in f.seqs) {
        f.seqs[s].topCota = Math.ceil(f.seqs[s].max_CR) + 2;
      }
      f.nodes.forEach(n => { n.topCota = f.seqs[n.seqIdx].topCota; });
      f.edges.forEach(e => { e.topCota = f.seqs[e.seqIdx].topCota; });
    });
  });

  const f2 = v  => parseFloat(v || 0).toFixed(2);
  const pt = (x, y) => `(LIST ${f2(x)} ${f2(y)})`;

  const lines = [];
  lines.push(`;;; PERFILES DE ALCANTARILLADO - GENERADO POR AMCAUDALES`);
  lines.push(`(DEFUN C:DIBUJAR_PERFILES ( / OLD_OSMODE)`);
  lines.push(`  (SETQ OLD_OSMODE (GETVAR "OSMODE"))`);
  lines.push(`  (SETVAR "OSMODE" 0)`);
  lines.push(`  (GRAPHSCR)`);
  lines.push(`  (COMMAND "_LAYER" "_Make" "Cotas Referencia" "_Color" "7" "" "")`);
  lines.push(`  (COMMAND "_LAYOUT" "_Set" "AMCAUDALES_PLANTA")`);
  lines.push(`  (COMMAND "_-PLOT" "_Y" "AMCAUDALES_PLANTA" "DWG To PDF.pc3" "ISO full bleed A1 (841.00 x 594.00 MM)" "_M" "_L" "_N" "_W" ${pt(35.0, 10.0)} ${pt(890.0, 540.0)} "_F" "_C" "_Y" "AMCaudales.ctb" "_Y" "_N" "_N" "_N" "_N" "_Y" "_Y")`);
  lines.push(`  (COMMAND "_PLOTTRANSPARENCYOVERRIDE" "2")`);
  lines.push(`  (COMMAND "_LAYER" "_Make" "1" "_Color" "4" "" "")`);
  lines.push(`  (COMMAND "_LAYER" "_Make" "000" "_Color" "2" "" "")`);
  lines.push(`  (COMMAND "_LAYER" "_Make" "0-0-0" "_Color" "6" "" "")`);
  lines.push(`  (COMMAND "_LAYER" "_Make" "COTAS" "_Color" "6" "" "")`);
  lines.push(`  (COMMAND "_LAYER" "_Make" "NOMENCLATURA" "_Color" "2" "" "")`);
  lines.push(`  (COMMAND "_LAYER" "_Make" "TEXTO_GENERAL" "_Color" "6" "" "")`);
  lines.push(`  `);
  lines.push(`  ;;; === CREACION DE CAPAS DE ALCANTARILLADO SEGUN CONVENCIONES ===`);
  lines.push(`  (vl-load-com)`);
  lines.push(`  (setq tempLinPath (strcat (getenv "TEMP") "\\\\amcaudales.lin"))`);
  lines.push(`  (setq fTempLin (open tempLinPath "w"))`);
  lines.push(`  (write-line "*AM_DASHED,AM Dashed __ __ __ __ __ __ __ __ __ __ __" fTempLin)`);
  lines.push(`  (write-line "A, ${f2(3.0)}, ${f2(-1.5)}" fTempLin)`);
  lines.push(`  (write-line "*AM_DASHDOT,AM Dash dot __ . __ . __ . __ . __ . __" fTempLin)`);
  lines.push(`  (write-line "A, ${f2(3.0)}, ${f2(-1.0)}, 0, ${f2(-1.0)}" fTempLin)`);
  lines.push(`  (write-line "*AM_DASHDOTDOT,AM Dash dot dot __ . . __ . . __" fTempLin)`);
  lines.push(`  (write-line "A, ${f2(3.0)}, ${f2(-1.0)}, 0, ${f2(-1.0)}, 0, ${f2(-1.0)}" fTempLin)`);
  lines.push(`  (close fTempLin)`);
  lines.push(`  (vl-catch-all-apply 'vla-load (list (vla-get-Linetypes (vla-get-ActiveDocument (vlax-get-acad-object))) "AM_DASHED" tempLinPath))`);
  lines.push(`  (vl-catch-all-apply 'vla-load (list (vla-get-Linetypes (vla-get-ActiveDocument (vlax-get-acad-object))) "AM_DASHDOT" tempLinPath))`);
  lines.push(`  (vl-catch-all-apply 'vla-load (list (vla-get-Linetypes (vla-get-ActiveDocument (vlax-get-acad-object))) "AM_DASHDOTDOT" tempLinPath))`);
  lines.push(`  (COMMAND "_LAYER" "_Make" "ALCANTARILLADO COMBINADO EXISTENTE" "_Color" "3" "" "_Ltype" "CONTINUOUS" "" "")`);
  lines.push(`  (COMMAND "_LAYER" "_Make" "ALCANTARILLADO PLUVIAL EXISTENTE" "_Color" "3" "" "_Ltype" "AM_DASHDOTDOT" "" "")`);
  lines.push(`  (COMMAND "_LAYER" "_Make" "ALCANTARILLADO SANITARIO EXISTENTE" "_Color" "3" "" "_Ltype" "AM_DASHDOT" "" "")`);
  lines.push(`  (COMMAND "_LAYER" "_Make" "ALCANTARILLADO COMBINADO PROYECTADO" "_Color" "1" "" "_Ltype" "AM_DASHED" "" "")`);
  lines.push(`  (COMMAND "_LAYER" "_Make" "ALCANTARILLADO PLUVIAL PROYECTADO" "_Color" "5" "" "_Ltype" "AM_DASHDOTDOT" "" "")`);
  lines.push(`  (COMMAND "_LAYER" "_Make" "ALCANTARILLADO SANITARIO PROYECTADO" "_Color" "1" "" "_Ltype" "AM_DASHED" "" "")`);
  lines.push("  ;;; === CREACION DE ESTILOS DE TEXTO ===");
  lines.push(`  (IF (NOT (TBLSEARCH "STYLE" "COTAS")) (ENTMAKE '((0 . "STYLE") (100 . "AcDbSymbolTableRecord") (100 . "AcDbTextStyleTableRecord") (2 . "COTAS") (70 . 0) (40 . 0.0) (41 . 1.0) (50 . 0.0) (71 . 0) (42 . 1.0) (3 . "romans.shx") (4 . ""))))`);
  lines.push(`  (IF (NOT (TBLSEARCH "STYLE" "POZOS")) (ENTMAKE '((0 . "STYLE") (100 . "AcDbSymbolTableRecord") (100 . "AcDbTextStyleTableRecord") (2 . "POZOS") (70 . 0) (40 . 0.0) (41 . 1.0) (50 . 0.0) (71 . 0) (42 . 1.0) (3 . "romanc.shx") (4 . ""))))`);
  lines.push(`  (IF (NOT (TBLSEARCH "STYLE" "DIRECCIONES")) (ENTMAKE '((0 . "STYLE") (100 . "AcDbSymbolTableRecord") (100 . "AcDbTextStyleTableRecord") (2 . "DIRECCIONES") (70 . 0) (40 . 0.0) (41 . 1.0) (50 . 0.0) (71 . 0) (42 . 1.0) (3 . "arial.ttf") (4 . ""))))`);
  lines.push(`  (IF (NOT (TBLSEARCH "STYLE" "COORDENADAS")) (ENTMAKE '((0 . "STYLE") (100 . "AcDbSymbolTableRecord") (100 . "AcDbTextStyleTableRecord") (2 . "COORDENADAS") (70 . 0) (40 . 0.0) (41 . 1.0) (50 . 0.0) (71 . 0) (42 . 1.0) (3 . "romanc.shx") (4 . ""))))`);
  lines.push(`  (IF (NOT (TBLSEARCH "STYLE" "TEXTO_GENERAL")) (ENTMAKE '((0 . "STYLE") (100 . "AcDbSymbolTableRecord") (100 . "AcDbTextStyleTableRecord") (2 . "TEXTO_GENERAL") (70 . 0) (40 . 0.0) (41 . 1.0) (50 . 0.0) (71 . 0) (42 . 1.0) (3 . "romans.shx") (4 . ""))))`);

  for (let p of pages) {
    const PAGE_OFFSET_X = p.pageIdx * GRID_WIDTH;
    
    // --- INSERT DYNAMIC FRAME ---
    const marcoLines = generarMarcoLisp(P, PAGE_OFFSET_X, p.pageIdx + 1, pages.length);
    lines.push(...marcoLines);
    // ----------------------------
    
    for (let f of p.franjas) {
      const F = FRANJAS[f.franjaIdx];
      const CR00 = F.COTREF00;

      lines.push(``);
      lines.push(`  ;;; === Cotas de referencia - Pagina ${p.pageIdx} Franja ${f.franjaIdx} ===`);
      for (let s in f.seqs) {
        let sq = f.seqs[s];
        let isMainGrid = Math.abs(sq.startX - XBASE) < 1.0;
        let gridX = isMainGrid ? XBASE - 35.0 : sq.startX - 15.0;
        for (let k = 0; k <= 16; k++) {
          const cy = (CR00 + 2.0) - k * ESCY;
          const cv = sq.topCota - k;
          lines.push(`  (ENTMAKE (LIST '(0 . "TEXT") '(7 . "COTAS") '(8 . "Cotas Referencia") (CONS 1 "${cv}") (CONS 10 (LIST ${f2(gridX + PAGE_OFFSET_X)} ${f2(cy)} 0.0)) '(40 . 1.4) '(62 . 2)))`);
        }
      }

      lines.push(``);
      lines.push(`  ;;; === DIBUJAR POZOS ===`);
      for (const n of f.nodes) {
        const curEscX = n.escX || ESCX;
        const NX = n.x + PAGE_OFFSET_X;
        const calcY = (C) => (CR00 + 2.0) - (n.topCota - C) * ESCY;
        const Y_top = calcY(n.rasante);
        const Y_bot = calcY(n.batea);
        
        if (n.id.includes("-EMP")) {
            lines.push(`  (COMMAND "_LAYER" "_Make" "0-0-0" "")`);
            lines.push(`  (COMMAND "_LINE" ${pt(NX, F.EJE_T)} ${pt(NX, F.EJE_B)} "")`);
            lines.push(`  (COMMAND "_LAYER" "_Make" "000" "")`);
            lines.push(`  (SETVAR "TEXTSTYLE" "POZOS")`);
            lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "000") (cons 10 ${pt(NX - 2, F.NOM)}) (cons 11 ${pt(NX - 2, F.NOM)}) '(40 . 2.2) '(50 . 1.570796) '(1 . "EMPALME") '(72 . 1) '(73 . 2)))`);
            continue;
        }

          const RX = (1.2 / 2) * curEscX;
          const RNX = (0.6 / 2) * curEscX;
          const Y_cone_bot = Y_top - 0.36 * ESCY;
          
          lines.push(`  (COMMAND "_LAYER" "_Make" "000" "")`);
          lines.push(`  (SETVAR "CECOLOR" "4")`);
          
          let leftHoles = [];
          let rightHoles = [];
          for (let e of rawTramos) {
             let d = e.diam / 1000.0;
             if (e.a === n.id) leftHoles.push([calcY(e.cf1), calcY(e.cf1 + d)]);
             if (e.de === n.id) rightHoles.push([calcY(e.cf0), calcY(e.cf0 + d)]);
          }

          const subtractHoles = (start, end, holes) => {
             let segments = [[start, end]];
             for (let h of holes) {
                let newSegs = [];
                for (let s of segments) {
                   if (h[1] <= s[0] || h[0] >= s[1]) {
                      newSegs.push(s);
                   } else {
                      if (s[0] < h[0]) newSegs.push([s[0], h[0]]);
                      if (h[1] < s[1]) newSegs.push([h[1], s[1]]);
                   }
                }
                segments = newSegs;
             }
             return segments;
          };

          // Draw left wall
          let leftSegs = subtractHoles(Y_bot, Y_cone_bot, leftHoles);
          for (let s of leftSegs) {
             lines.push(`  (COMMAND "_LINE" ${pt(NX - RX, s[0])} ${pt(NX - RX, s[1])} "")`);
          }
          // Draw right wall
          let rightSegs = subtractHoles(Y_bot, Y_cone_bot, rightHoles);
          for (let s of rightSegs) {
             lines.push(`  (COMMAND "_LINE" ${pt(NX + RX, s[0])} ${pt(NX + RX, s[1])} "")`);
          }
          // Draw top lid
          lines.push(`  (COMMAND "_LINE" ${pt(NX - RNX, Y_top)} ${pt(NX + RNX, Y_top)} "")`);
          // Draw bottom floor
          lines.push(`  (COMMAND "_LINE" ${pt(NX - RX, Y_bot)} ${pt(NX + RX, Y_bot)} "")`);
          // Draw left cone
          lines.push(`  (COMMAND "_LINE" ${pt(NX - RNX, Y_top)} ${pt(NX - RX, Y_cone_bot)} "")`);
          // Draw right cone
          lines.push(`  (COMMAND "_LINE" ${pt(NX + RNX, Y_top)} ${pt(NX + RX, Y_cone_bot)} "")`);
          
          lines.push(`  (SETVAR "CECOLOR" "BYLAYER")`);
        
        lines.push(`  (COMMAND "_LAYER" "_Make" "0-0-0" "")`);
        lines.push(`  (COMMAND "_LINE" ${pt(NX, F.EJE_T)} ${pt(NX, F.EJE_B)} "")`);
        lines.push(`  (COMMAND "_LAYER" "_Make" "000" "")`);
        lines.push(`  (SETVAR "TEXTSTYLE" "POZOS")`);
        lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "000") (cons 10 ${pt(NX - 2, F.NOM)}) (cons 11 ${pt(NX - 2, F.NOM)}) '(40 . 2.2) '(50 . 0.0) '(1 . "${n.id}") '(72 . 1) '(73 . 2)))`);
        
        const txtWidth = n.id.length * 2.0 + 2.0;
        const bTop = F.NOM + 2.5;
        const bBot = F.NOM - 2.5;
        const bLeft = (NX - 2) - txtWidth / 2;
        const bRight = (NX - 2) + txtWidth / 2;
        lines.push(`  (COMMAND "_LAYER" "_Make" "000" "")`);
        lines.push(`  (COMMAND "_PLINE" ${pt(bLeft, bBot)} ${pt(bRight, bBot)} ${pt(bRight, bTop)} ${pt(bLeft, bTop)} "_C")`);
        
        const midY = (Y_top + Y_bot) / 2;
        lines.push(`  (SETVAR "TEXTSTYLE" "TEXTO_GENERAL")`);
        lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "TEXTO_GENERAL") (cons 10 ${pt(NX - RX - 3, midY)}) (cons 11 ${pt(NX - RX - 3, midY)}) '(40 . 1.4) '(50 . 1.570796) '(1 . "H=${f2(n.rasante - n.batea)}m") '(72 . 1) '(73 . 2)))`);
        
        const k0str = `K0+${n.k0.toFixed(2).padStart(6,'0')}`;
        lines.push(`  (COMMAND "_LINE" ${pt(NX, F.AB1)} ${pt(NX, F.AB2)} "")`);
        lines.push(`  (SETVAR "TEXTSTYLE" "COORDENADAS")`);
        lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "COTAS") (cons 10 ${pt(NX - 2, F.ABT)}) (cons 11 ${pt(NX - 2, F.ABT)}) '(40 . 2.2) '(50 . 1.570796) '(1 . "${k0str}") '(72 . 1) '(73 . 2)))`);
        lines.push(`  (COMMAND "_PLINE" ${pt(NX, F.ARR)} ${pt(NX+22, F.ARR)} ${pt(NX+20, F.ARR-0.5)} ${pt(NX+20, F.ARR+0.5)} ${pt(NX+22, F.ARR)} "")`);
        lines.push(`  (COMMAND "_PLINE" ${pt(NX, F.ARR)} ${pt(NX-22, F.ARR)} ${pt(NX-20, F.ARR-0.5)} ${pt(NX-20, F.ARR+0.5)} ${pt(NX-22, F.ARR)} "")`);
        lines.push(`  (COMMAND "_CIRCLE" ${pt(NX, F.ARR)} "0.5" "")`);
        lines.push(`  (SETVAR "TEXTSTYLE" "TEXTO_GENERAL")`);
        lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "TEXTO_GENERAL") (cons 10 ${pt(NX+10, F.ARR+2)}) (cons 11 ${pt(NX+10, F.ARR+2)}) '(40 . 1.4) '(50 . 0.0) '(1 . "Lpd=0.60 m.") '(72 . 1) '(73 . 2)))`);
        lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "TEXTO_GENERAL") (cons 10 ${pt(NX-10, F.ARR+2)}) (cons 11 ${pt(NX-10, F.ARR+2)}) '(40 . 1.4) '(50 . 0.0) '(1 . "Lpi=0.60 m.") '(72 . 1) '(73 . 2)))`);
        
        lines.push(`  (COMMAND "_PLINE" ${pt(NX+1, Y_top+2)} ${pt(NX, Y_top)} ${pt(NX-1, Y_top+2)} ${pt(NX+14, Y_top+2)} "")`);
        lines.push(`  (SETVAR "TEXTSTYLE" "COTAS")`);
        lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "COTAS") (cons 10 ${pt(NX+9, Y_top+4)}) (cons 11 ${pt(NX+9, Y_top+4)}) '(40 . 1.4) '(50 . 0.0) '(1 . "${f2(n.rasante)}") '(72 . 1) '(73 . 2)))`);
      }

      lines.push(``);
      lines.push(`  ;;; === DIBUJAR TRAMOS (TUBERIA Y TERRENO) ===`);
      for (const e of f.edges) {
        const curEscX = e.escX || ESCX;
        const calcY = (C) => (CR00 + 2.0) - (e.topCota - C) * ESCY;
        const RX = (e.dp / 2) * curEscX;
        const L_wall = e.dp / 2;
        
        const X1_center = e.startX + PAGE_OFFSET_X;
        const X2_center = e.endX + PAGE_OFFSET_X;
        
        const X1_pipe = X1_center + RX;
        const X2_pipe = X2_center - RX;
        
        const diamM = e.diam / 1000;
        
        // Exact slope adjustment for pipe endpoints at the walls - Removed per user request
        const Y_b1 = calcY(e.cf0);
        const Y_c1 = calcY(e.cf0 + diamM);
        const Y_b2 = calcY(e.cf1);
        const Y_c2 = calcY(e.cf1 + diamM);
        
        if (X1_pipe < X2_pipe) {
            lines.push(`  (COMMAND "_LAYER" "_Make" "000" "")`);
            lines.push(`  (SETVAR "CECOLOR" "4")`);
            lines.push(`  (COMMAND "_LINE" ${pt(X1_pipe + 1.0, Y_c1)} ${pt(X2_pipe - 1.0, Y_c2)} "")`);
            lines.push(`  (COMMAND "_LINE" ${pt(X1_pipe + 1.0, Y_b1)} ${pt(X2_pipe - 1.0, Y_b2)} "")`);
            lines.push(`  (SETVAR "CECOLOR" "BYLAYER")`);
        }
        
        lines.push(`  (COMMAND "_LAYER" "_Make" "000" "")`);
        lines.push(`  (COMMAND "_LINE" ${pt(X1_center, calcY(e.ras0))} ${pt(X2_center, calcY(e.ras1))} "")`);
        
        const Y_cf0 = calcY(e.cf0);
        lines.push(`  (COMMAND "_PLINE" ${pt(X1_center-1, Y_cf0-2)} ${pt(X1_center, Y_cf0)} ${pt(X1_center+1, Y_cf0-2)} ${pt(X1_center-13, Y_cf0-2)} "")`);
        lines.push(`  (SETVAR "TEXTSTYLE" "COTAS")`);
        lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "COTAS") (cons 10 ${pt(X1_center-9, Y_cf0-4)}) (cons 11 ${pt(X1_center-9, Y_cf0-4)}) '(40 . 1.15) '(50 . 0.0) '(1 . "${f2(e.cf0)}") '(72 . 1) '(73 . 2)))`);
        
        const Y_cf1 = calcY(e.cf1);
        lines.push(`  (COMMAND "_PLINE" ${pt(X2_center+1, Y_cf1+2)} ${pt(X2_center, Y_cf1)} ${pt(X2_center-1, Y_cf1+2)} ${pt(X2_center+14, Y_cf1+2)} "")`);
        lines.push(`  (SETVAR "TEXTSTYLE" "COTAS")`);
        lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "COTAS") (cons 10 ${pt(X2_center+9, Y_cf1+4)}) (cons 11 ${pt(X2_center+9, Y_cf1+4)}) '(40 . 1.15) '(50 . 0.0) '(1 . "${f2(e.cf1)}") '(72 . 1) '(73 . 2)))`);
        
        const cx = (X1_center + X2_center) / 2;
        const midBateaY = (calcY(e.cf0) + calcY(e.cf1)) / 2;
        const cy = midBateaY - 0.6 * ESCY;
        
        const LET = Math.max(0, e.L - e.dp) * Math.sqrt(1 + (e.p/100)**2);
        lines.push(`  (SETVAR "TEXTSTYLE" "TEXTO_GENERAL")`);
        lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "TEXTO_GENERAL") (cons 10 ${pt(cx, cy+4)}) (cons 11 ${pt(cx, cy+4)}) '(40 . 1.15) '(50 . 0.0) '(1 . "Le= ${f2(LET)} m.") '(72 . 1) '(73 . 2)))`);
        lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "TEXTO_GENERAL") (cons 10 ${pt(cx, cy)}) (cons 11 ${pt(cx, cy)}) '(40 . 1.15) '(50 . 0.0) '(1 . "d= ${e.diam.toFixed(0)} mm.") '(72 . 1) '(73 . 2)))`);
        lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "TEXTO_GENERAL") (cons 10 ${pt(cx, cy-4)}) (cons 11 ${pt(cx, cy-4)}) '(40 . 1.15) '(50 . 0.0) '(1 . "P= ${f2(e.p)} %") '(72 . 1) '(73 . 2)))`);
        lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "TEXTO_GENERAL") (cons 10 ${pt(cx, cy-8)}) (cons 11 ${pt(cx, cy-8)}) '(40 . 1.15) '(50 . 0.0) '(1 . "Ent-Tipo1") '(72 . 1) '(73 . 2)))`);
        
        let matText = e.mat;
        if (matText === "PVC") {
           matText = "PVC RIG. 57 PSI - CIM. I";
        }
        lines.push(`  (COMMAND "_DIMLINEAR" ${pt(X1_pipe, F.DL)} ${pt(X2_pipe, F.DL)} "_Text" "L= ${f2(e.L)} m." ${pt(X2_pipe, F.DL)} "")`);
        lines.push(`  (COMMAND "_DIMLINEAR" ${pt(X1_pipe, F.DT)} ${pt(X2_pipe, F.DT)} "_Text" "${matText}" ${pt(X2_pipe, F.DT)} "")`);
        
        lines.push(`  (COMMAND "_LAYER" "_Make" "0-0-0" "")`);
        lines.push(`  (COMMAND "_LINE" ${pt(X1_pipe, F.TK1)} ${pt(X1_pipe, F.TK2)} "")`);
        lines.push(`  (COMMAND "_LINE" ${pt(X2_pipe, F.TK1)} ${pt(X2_pipe, F.TK2)} "")`);
      }
    }
  }

  lines.push(``);
  lines.push(`  (SETVAR "OSMODE" OLD_OSMODE)`);
  lines.push(`  (PRINC "\nPERFILES OK - ${tramosAll.length} tramos - AMCAUDALES")`);
  lines.push(`  (PRINC)`);
  lines.push(`)`);
  lines.push(``);

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const fileName = `Perfiles_${(P.proyecto || 'proyecto').replace(/[^a-zA-Z0-9_\-]/g, '_')}.lsp`;
  saveFileWithDialog(blob, fileName);
}

export function exportPerfilesLISPSeleccion(R, P, T, selMap) {
  if (!selMap || selMap.length === 0) {
    alert('No hay tramos seleccionados en el visor. Seleccione tramos en el mapa primero.');
    return;
  }
  const selSet = new Set(
    (selMap || []).filter(sm => sm && sm.de && sm.a)
      .map(sm => `${String(sm.de).trim().toLowerCase()}||${String(sm.a).trim().toLowerCase()}`)
  );
  if (selSet.size === 0) {
    alert('No hay tramos válidos seleccionados.');
    return;
  }
  const RFiltered = (R || []).filter(r => {
    if (r.sep) return false;
    const key = `${String(r.de || '').trim().toLowerCase()}||${String(r.a || '').trim().toLowerCase()}`;
    return selSet.has(key);
  });
  if (RFiltered.length === 0) {
    alert('Ningún tramo seleccionado coincide con los tramos calculados.');
    return;
  }
  const RReindexed = RFiltered.map((r, idx) => ({ ...r, id: idx + 1 }));
  const TFiltered = RFiltered.map(r => T[(r.id || 1) - 1] || {});
  const PRename = { ...P, proyecto: (P.proyecto || 'proyecto') + '_SEL' };
  exportPerfilesLISP(RReindexed, PRename, TFiltered);
}

export function exportPlantaLISP(R, P, T, inpData) {
  let totalL = 0; let countL = 0;
  T.forEach(t => { if(t.longitud > 0) { totalL += t.longitud; countL++; } });
  let avgL = countL > 0 ? totalL / countL : 30;
  let fEscala = avgL / 80.0;
  if(fEscala < 0.3) fEscala = 0.3;
  if(fEscala > 1.5) fEscala = 1.5;

  const coordsMap = {};
  const sourcePozos = (inpData && inpData.pozos) ? inpData.pozos : (P && P.pz ? P.pz : []);
  
  const getCoord = (pzObj, keysX, keysY) => {
    let x = 0, y = 0;
    for (let k of keysX) {
      if (pzObj[k] !== undefined && pzObj[k] !== null && pzObj[k] !== "") {
        let val = parseFloat(pzObj[k]);
        if (!isNaN(val)) { x = val; break; }
      }
    }
    for (let k of keysY) {
      if (pzObj[k] !== undefined && pzObj[k] !== null && pzObj[k] !== "") {
        let val = parseFloat(pzObj[k]);
        if (!isNaN(val)) { y = val; break; }
      }
    }
    return { x, y };
  };

  sourcePozos.forEach(p => {
    const id = String(p.IdNodo || p.id || p.nodo || "").trim().toLowerCase();
    if (id) {
      const coords = getCoord(p, ["CoordX", "X", "coordX", "coordx", "x"], ["CoordY", "Y", "coordY", "coordy", "y"]);
      coordsMap[id] = {
        id: String(p.IdNodo || p.id || p.nodo || "").trim(),
        x: coords.x,
        y: coords.y,
        cr: parseFloat(p.Ctapa || p.cota_terreno || p.cr || 0),
        cf: parseFloat(p.Cfondo || p.cota_fondo || p.cf || 0),
        pozoNuevo: p.pozoNuevo !== undefined ? p.pozoNuevo : "",
        reponer: p.reponer !== undefined ? p.reponer : "",
        tipoPozo: p.tipoPozo || "M"
      };
    }
  });

  (T || []).forEach(t => {
    if (!t) return;
    let deKey = String(t.de || "").trim().toLowerCase();
    let aKey = String(t.a || "").trim().toLowerCase();
    if (deKey && coordsMap[deKey]) {
      if (!coordsMap[deKey].cr || coordsMap[deKey].cr === 0) {
        coordsMap[deKey].cr = parseFloat(t.cotaRasante || 0);
      }
    }
    if (aKey && coordsMap[aKey]) {
      if (!coordsMap[aKey].cr || coordsMap[aKey].cr === 0) {
        let valA = t.cotaRasanteA != null && t.cotaRasanteA !== "" ? t.cotaRasanteA : t.cotaRasante;
        coordsMap[aKey].cr = parseFloat(valA || 0);
      }
    }
  });

  const validPozos = Object.values(coordsMap).filter(p => p.x !== 0 || p.y !== 0);
  if (validPozos.length === 0) {
    alert("No hay coordenadas de pozos disponibles en este proyecto.");
    return;
  }

  const placedBoxes = [];
  const margin = 2.5 * fEscala;
  const addBox = (x, y, w, h) => {
    placedBoxes.push({ x, y, w, h });
  };
  const isOverlap = (x, y, w, h) => {
    return placedBoxes.some(b => 
      x < b.x + b.w + margin &&
      x + w > b.x - margin &&
      y < b.y + b.h + margin &&
      y + h > b.y - margin
    );
  };
  const resolveOverlap = (origX, origY, w, h, dx, dy, maxDist = 300 * fEscala) => {
    let dist = 0;
    const step = 0.5 * fEscala;
    let x = origX, y = origY;
    while (isOverlap(x - w/2, y - h/2, w, h) && dist < maxDist) {
      x += dx * step;
      y += dy * step;
      dist += step;
    }
    return { x, y, dist };
  };

  validPozos.forEach(pz => {
    addBox(pz.x - 1.5, pz.y - 1.5, 3.0, 3.0); // Bloqueo estricto del c�rculo del pozo
  });

  const pozoConnections = {};
  validPozos.forEach(vp => {
    pozoConnections[vp.id.toLowerCase()] = { inPipes: [], outPipes: [], allPipes: [] };
  });

  const rawTramos = [];
  (R || []).forEach((r, idx) => {
    if (r.sep) return;
    const t = (T && T[idx]) ? T[idx] : {};
    const L = parseFloat(r.Le || r.L || t.longitud || 0);
    if (L <= 0) return;
    const deStr = String(r.de || "").trim();
    const aStr = String(r.a || "").trim();
    const deKey = deStr.toLowerCase();
    const aKey = aStr.toLowerCase();
    
    if (coordsMap[deKey] && coordsMap[aKey]) {
      const p = parseFloat(t.pendiente || r.pendiente || 0);
      const diam = parseFloat(t.diametroCom || r.diametroCom || r.diamOrig || 200);
      const tramoObj = {
        de: deStr, a: aStr,
        deX: coordsMap[deKey].x, deY: coordsMap[deKey].y,
        aX: coordsMap[aKey].x, aY: coordsMap[aKey].y,
        L, p, diam,
        reponer: t.reponer || r.reponer || "S",
        cf0: parseFloat(t.cotaFondoDE != null && t.cotaFondoDE !== "" ? t.cotaFondoDE : (t.cotaFondo != null ? t.cotaFondo : (r.cf0 || coordsMap[deKey].cf || 0))),
        cf1: parseFloat(t.cotaFondoA != null && t.cotaFondoA !== "" ? t.cotaFondoA : (t.cotaFondoSalida != null ? t.cotaFondoSalida : (r.cf1 || coordsMap[aKey].cf || 0)))
      };
      rawTramos.push(tramoObj);
      pozoConnections[deKey].outPipes.push(tramoObj);
      pozoConnections[deKey].allPipes.push(tramoObj);
      pozoConnections[aKey].inPipes.push(tramoObj);
      pozoConnections[aKey].allPipes.push(tramoObj);
    }
  });

  if (rawTramos.length === 0) {
    alert("No hay tramos calculados con coordenadas v�lidas de inicio y fin.");
    return;
  }

  const lines = [];
  lines.push(";;; PLANTA DE ALCANTARILLADO - GENERADO POR AMCAUDALES");
  lines.push("(DEFUN C:DIBUJAR_PLANTA ( / OLD_OSMODE)");
  lines.push("  (SETQ OLD_OSMODE (GETVAR \"OSMODE\"))");
  lines.push("  (SETVAR \"OSMODE\" 0)");
  lines.push(`  (vl-load-com)`);
  lines.push(`  (setq acadObj (vlax-get-acad-object))`);
  lines.push(`  (defun setTrueColor (ent r g b / clr ver)`);
  lines.push(`    (vl-catch-all-apply '(lambda () (setq ver (substr (getvar "ACADVER") 1 2)) (setq clr (vla-GetInterfaceObject acadObj (strcat "AutoCAD.AcCmColor." ver))) (vla-SetRGB clr r g b) (vla-put-TrueColor (vlax-ename->vla-object ent) clr)))`);
  lines.push(`    (princ))`);
  lines.push("  (GRAPHSCR)");
  
  lines.push("  (IF (NOT (TBLSEARCH \"STYLE\" \"COTAS\")) (COMMAND \"_-STYLE\" \"COTAS\" \"romans.shx\" \"0.0\" \"1.0\" \"0.0\" \"_N\" \"_N\" \"_N\"))");
  lines.push("  (IF (NOT (TBLSEARCH \"STYLE\" \"POZOS\")) (COMMAND \"_-STYLE\" \"POZOS\" \"romanc.shx\" \"0.0\" \"1.0\" \"0.0\" \"_N\" \"_N\" \"_N\"))");
  lines.push("  (IF (NOT (TBLSEARCH \"STYLE\" \"TEXTO_GENERAL\")) (COMMAND \"_-STYLE\" \"TEXTO_GENERAL\" \"romans.shx\" \"0.0\" \"1.0\" \"0.0\" \"_N\" \"_N\" \"_N\"))");
  lines.push("  (IF (NOT (TBLSEARCH \"STYLE\" \"TEXTO-AREAS\")) (COMMAND \"_-STYLE\" \"TEXTO-AREAS\" \"romans.shx\" \"0.0\" \"1.0\" \"0.0\" \"_N\" \"_N\" \"_N\"))");
  lines.push("  (IF (NOT (TBLSEARCH \"STYLE\" \"COORDENADAS\")) (COMMAND \"_-STYLE\" \"COORDENADAS\" \"romanc.shx\" \"0.0\" \"1.0\" \"0.0\" \"_N\" \"_N\" \"_N\"))");

  const writeLayerDef = (lyName, color, ltype) => {
    lines.push(`  (COMMAND "_LAYER" "_Make" "${lyName}" "_Color" "${color}" "" "")`);
    if (ltype && ltype !== "Continuous") {
      lines.push(`  (IF (TBLSEARCH "LTYPE" "${ltype}")`);
      lines.push(`    (COMMAND "_LAYER" "_Ltype" "${ltype}" "${lyName}" "" "")`);
      lines.push(`  )`);
    }
  };

  const f2 = v => parseFloat(v || 0).toFixed(2);
  const pt = (x, y) => `(LIST ${f2(x)} ${f2(y)} 0.0)`;

  lines.push(`  (setq tempLinPath (strcat (getenv "TEMP") "\\\\amcaudales.lin"))`);
  lines.push(`  (setq fTempLin (open tempLinPath "w"))`);
  lines.push(`  (write-line "*AM_DASHED,AM Dashed __ __ __ __ __ __ __ __ __ __ __" fTempLin)`);
  lines.push(`  (write-line "A, ${f2(3.0 * fEscala)}, ${f2(-1.5 * fEscala)}" fTempLin)`);
  lines.push(`  (write-line "*AM_DASHDOT,AM Dash dot __ . __ . __ . __ . __ . __" fTempLin)`);
  lines.push(`  (write-line "A, ${f2(3.0 * fEscala)}, ${f2(-1.0 * fEscala)}, 0, ${f2(-1.0 * fEscala)}" fTempLin)`);
  lines.push(`  (write-line "*AM_DASHDOTDOT,AM Dash dot dot __ . . __ . . __ . . __" fTempLin)`);
  lines.push(`  (write-line "A, ${f2(3.0 * fEscala)}, ${f2(-1.0 * fEscala)}, 0, ${f2(-1.0 * fEscala)}, 0, ${f2(-1.0 * fEscala)}" fTempLin)`);
  lines.push(`  (close fTempLin)`);
  lines.push(`  (vl-catch-all-apply 'vla-load (list (vla-get-Linetypes (vla-get-ActiveDocument (vlax-get-acad-object))) "AM_DASHED" tempLinPath))`);
  lines.push(`  (vl-catch-all-apply 'vla-load (list (vla-get-Linetypes (vla-get-ActiveDocument (vlax-get-acad-object))) "AM_DASHDOT" tempLinPath))`);
  lines.push(`  (vl-catch-all-apply 'vla-load (list (vla-get-Linetypes (vla-get-ActiveDocument (vlax-get-acad-object))) "AM_DASHDOTDOT" tempLinPath))`);

  writeLayerDef("POZOE", 2, "Continuous");
  writeLayerDef("POZOP", 4, "Continuous");
  writeLayerDef("NOMENCLATURA", 2, "Continuous");
  writeLayerDef("COTAS", 7, "Continuous");
  writeLayerDef("L-D-P", 6, "Continuous");

  const alcType = P.tipoAlc || "S";
  if (alcType === "S") {
    writeLayerDef("ALCANTARILLADO SANITARIO PROYECTADO", 1, "AM_DASHED");
    writeLayerDef("ALCANTARILLADO SANITARIO EXISTENTE", 3, "Continuous");
  } else if (alcType === "P") {
    writeLayerDef("ALCANTARILLADO PLUVIAL PROYECTADO", 1, "AM_DASHED");
    writeLayerDef("ALCANTARILLADO PLUVIAL EXISTENTE", 3, "AM_DASHDOTDOT");
  } else {
    writeLayerDef("ALCANTARILLADO COMBINADO PROYECTADO", 1, "AM_DASHED");
    writeLayerDef("ALCANTARILLADO COMBINADO EXISTENTE", 3, "Continuous");
  }

  const activePozosSet = new Set();
  rawTramos.forEach(t => { activePozosSet.add(t.de.toLowerCase()); activePozosSet.add(t.a.toLowerCase()); });

  let activeValidPozos = Array.from(activePozosSet).map(pk => coordsMap[pk]).filter(p => p);
  let maxDistSq = 0;
  let p1_max = null, p2_max = null;
  for(let i=0; i<activeValidPozos.length; i++){
    for(let j=i+1; j<validPozos.length; j++){
      let dx = activeValidPozos[j].x - activeValidPozos[i].x;
      let dy = activeValidPozos[j].y - activeValidPozos[i].y;
      let dSq = dx*dx + dy*dy;
      if(dSq > maxDistSq){ maxDistSq = dSq; p1_max = activeValidPozos[i]; p2_max = activeValidPozos[j]; }
    }
  }
  let theta = 0;
  if(p1_max && p2_max) {
      theta = Math.atan2(p2_max.y - p1_max.y, p2_max.x - p1_max.x);
      if (theta > Math.PI / 2) theta -= Math.PI;
      if (theta < -Math.PI / 2) theta += Math.PI;
  }
  let thetaDeg = theta * 180 / Math.PI;
  let cosT = Math.cos(theta), sinT = Math.sin(theta);


  // === 0. DIBUJAR POZOS (BASE) ===
  activePozosSet.forEach(pk => {
    const p = coordsMap[pk];
    if (!p) return;
    const strPN = String(p.pozoNuevo).trim().toUpperCase();
    const strRep = String(p.reponer).trim().toUpperCase();
    const pid = String(p.id).trim().toUpperCase();
    const isNew = strPN === "S" || strPN === "N" || strPN === "NUEVO" || strPN === "P" || strPN === "PROYECTADO" || strRep === "S" || pid.endsWith("_N") || pid.endsWith("_P") || pid.includes("-P") || pid.includes("_N");
    const layer = isNew ? "POZOP" : "POZOE";
    lines.push(`  (COMMAND "_LAYER" "_Make" "${layer}" "")`);
    
    const conn = pozoConnections[pk];
    const isInitial = conn ? conn.inPipes.length === 0 : false;
    
    if (isNew) {
      lines.push(`  (COMMAND "_CIRCLE" ${pt(p.x, p.y)} "0.60")`);
    } else {
      lines.push(`  (COMMAND "_CIRCLE" ${pt(p.x, p.y)} "0.60")`);
      lines.push(`  (COMMAND "_CIRCLE" ${pt(p.x, p.y)} "0.85")`);
      if (isInitial && conn && conn.outPipes[0]) {
        const outPipe = conn.outPipes[0];
        const dx = outPipe.aX - outPipe.deX;
        const dy = outPipe.aY - outPipe.deY;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
          const ux = dx / len; const uy = dy / len;
          const midAng = Math.atan2(uy, ux);
          const sweepHalf = 65 * Math.PI / 180;
          const R = 1.1;
          lines.push(`  (COMMAND "_ARC" ${pt(p.x + R * Math.cos(midAng - sweepHalf), p.y + R * Math.sin(midAng - sweepHalf))} ${pt(p.x + R * Math.cos(midAng), p.y + R * Math.sin(midAng))} ${pt(p.x + R * Math.cos(midAng + sweepHalf), p.y + R * Math.sin(midAng + sweepHalf))})`);
        }
      }
    }
  });

  // === FASE A: COTAS ===
  activePozosSet.forEach(pk => {
    const p = coordsMap[pk];
    if (!p) return;
    const conn = pozoConnections[pk];
    if (conn && conn.allPipes.length > 0) {
      lines.push(`  (COMMAND "_LAYER" "_Make" "COTAS" "")`);
      lines.push(`  (SETVAR "TEXTSTYLE" "COTAS")`);
      
      const pipesWithAngles = conn.allPipes.map(pipe => {
        const isUpstream = pipe.de.toLowerCase() === pk;
        const dx = isUpstream ? (pipe.aX - pipe.deX) : (pipe.deX - pipe.aX);
        const dy = isUpstream ? (pipe.aY - pipe.deY) : (pipe.deY - pipe.aY);
        return { pipe, angle: Math.atan2(dy, dx), cotaBatea: isUpstream ? pipe.cf0 : pipe.cf1 };
      }).sort((a, b) => a.angle - b.angle);

      pipesWithAngles.forEach((pwa, idx) => {
        const pipeAngRad = pwa.angle;
        const diagAngRad = pipeAngRad - Math.PI / 4;
        const dx = Math.cos(diagAngRad); const dy = Math.sin(diagAngRad);
        
        const startX = p.x + 0.85 * Math.cos(pipeAngRad);
        const startY = p.y + 0.85 * Math.sin(pipeAngRad);
        
        const textTop = idx === 0 ? f2(p.cr) : "";
        const textBot = f2(pwa.cotaBatea);
        const tLen = Math.max(textTop.length, textBot.length);
        const fontH = 1.76 * fEscala;
        const barLen = Math.max(3.0 * fEscala, tLen * 0.9 * fontH);
        
        let diagLen = 7.0 * fEscala;
        let cx, cy, midX, midY, wbb_cotas, hbb_cotas, tRadDir;
        let tRad = (thetaDeg * Math.PI) / 180;
        
        for (let attempt = 0; attempt < 20; attempt++) {
            cx = startX + dx * diagLen;
            cy = startY + dy * diagLen;
            
            const dot = (cx - p.x) * Math.cos(tRad) + (cy - p.y) * Math.sin(tRad);
            const dirX = dot >= 0 ? 1 : -1;
            tRadDir = dirX > 0 ? tRad : tRad + Math.PI;
            
            midX = cx + (barLen/2) * Math.cos(tRadDir);
            midY = cy + (barLen/2) * Math.sin(tRadDir);
            
            wbb_cotas = barLen * Math.abs(Math.cos(tRadDir)) + (3.0 * fontH) * Math.abs(Math.sin(tRadDir));
            hbb_cotas = barLen * Math.abs(Math.sin(tRadDir)) + (3.0 * fontH) * Math.abs(Math.cos(tRadDir));
            
            if (!isOverlap(midX - wbb_cotas/2, midY - hbb_cotas/2, wbb_cotas, hbb_cotas)) {
                break;
            }
            diagLen += 2.0 * fEscala;
        }
        
        // Register Cotas box to prevent overlaps with FASE C
        addBox(midX - wbb_cotas/2, midY - hbb_cotas/2, wbb_cotas, hbb_cotas);
        
        const upX = -Math.sin(tRad) * (fontH * 0.2);
        const upY = Math.cos(tRad) * (fontH * 0.2);
        
        const s1x = cx; const s1y = cy;
        const s2x = cx + barLen * Math.cos(tRadDir);
        const s2y = cy + barLen * Math.sin(tRadDir);
        
        lines.push(`  (SETVAR "CECOLOR" "7")`);
        lines.push(`  (COMMAND "_LINE" ${pt(startX, startY)} ${pt(s1x, s1y)} "")`);
        lines.push(`  (COMMAND "_LINE" ${pt(s1x, s1y)} ${pt(s2x, s2y)} "")`);
        lines.push(`  (SETVAR "CECOLOR" "BYLAYER")`);
        
        if (textTop !== "") lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "COTAS") (cons 10 ${pt(midX + upX, midY + upY)}) (cons 11 ${pt(midX + upX, midY + upY)}) '(40 . ${f2(fontH)}) '(50 . ${f2(thetaDeg * Math.PI / 180)}) '(1 . "${textTop}") '(72 . 1) '(73 . 1)))`);
        lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "COTAS") (cons 10 ${pt(midX - upX, midY - upY)}) (cons 11 ${pt(midX - upX, midY - upY)}) '(40 . ${f2(fontH)}) '(50 . ${f2(thetaDeg * Math.PI / 180)}) '(1 . "${textBot}") '(72 . 1) '(73 . 3)))`);
        
      });
    }
  });

  // === FASE B: TEXTOS L-D-P Y TUBERIAS ===
  rawTramos.forEach(t => {
    const isProj = t.reponer === "S";
    const layer = isProj ? 
      (alcType === "S" ? "ALCANTARILLADO SANITARIO PROYECTADO" : alcType === "P" ? "ALCANTARILLADO PLUVIAL PROYECTADO" : "ALCANTARILLADO COMBINADO PROYECTADO") :
      (alcType === "S" ? "ALCANTARILLADO SANITARIO EXISTENTE" : alcType === "P" ? "ALCANTARILLADO PLUVIAL EXISTENTE" : "ALCANTARILLADO COMBINADO EXISTENTE");
    
    const dx = t.aX - t.deX; const dy = t.aY - t.deY;
    const len = Math.sqrt(dx*dx + dy*dy);
    
    if (len > 0) {
      const ux = dx / len; const uy = dy / len;
      const pr = 1.5 * fEscala;
      const arrowLen = Math.min(2.0, len * 0.60);
      const x_base = t.aX - pr * ux - arrowLen * ux;
      const y_base = t.aY - pr * uy - arrowLen * uy;
      
      lines.push(`  (COMMAND "_LAYER" "_Make" "${layer}" "")`);
      lines.push(`  (SETVAR "CELTSCALE" 2.4)`);
      lines.push(`  (COMMAND "_LINE" ${pt(t.deX + pr*ux, t.deY + pr*uy)} ${pt(x_base, y_base)} "")`);
      lines.push(`  (SETVAR "CELTSCALE" 1.0)`);
      lines.push(`  (SETVAR "CELTYPE" "CONTINUOUS")`);
      lines.push(`  (COMMAND "_PLINE" ${pt(x_base, y_base)} "_Width" "${f2(arrowLen * 0.3)}" "0.0" ${pt(t.aX - pr*ux, t.aY - pr*uy)} "")`);
      lines.push(`  (SETVAR "CELTYPE" "BYLAYER")`);
      lines.push(`  (COMMAND)`);
      
      let angRad = Math.atan2(dy, dx);
      let angDeg = angRad * 180 / Math.PI;
      
      let pipeAngView = angDeg - thetaDeg;
      pipeAngView = (pipeAngView % 360 + 360) % 360;
      if (pipeAngView > 180) pipeAngView -= 360;
      
      if (pipeAngView > 90 || pipeAngView <= -90) { 
          pipeAngView = (pipeAngView + 180) % 360; 
      }
      
      let finalAngDegWorld = pipeAngView + thetaDeg;
      let finalRad = finalAngDegWorld * Math.PI / 180;
      
      const labelFontHeight = 1.76 * fEscala;
      const label1 = `L=${f2(t.L)}m`;
      const label2 = `%%c=${t.diam.toFixed(0)}mm`;
      const label3 = `P=${f2(t.p)}%`;
      
      const pushX = -Math.sin(finalRad); 
      const pushY = Math.cos(finalRad);
      
      const w = Math.max(label1.length, label2.length, label3.length) * labelFontHeight * 0.8;
      const h = labelFontHeight * 3.5;
      
      const xm = (t.deX + 1.0*ux + x_base) / 2;
      const ym = (t.deY + 1.0*uy + y_base) / 2;
      
      const spacing = labelFontHeight * 1.2;
      const dynamicOffset = labelFontHeight * 2.0; 
      
      const defaultTx = xm + pushX * dynamicOffset;
      const defaultTy = ym + pushY * dynamicOffset;
      
      // Convert to axis-aligned bounding box for overlap detection
      const w_aa = w * Math.abs(Math.cos(angRad)) + h * Math.abs(Math.sin(angRad));
      const h_aa = w * Math.abs(Math.sin(angRad)) + h * Math.abs(Math.cos(angRad));
      
      let resolved = resolveOverlap(defaultTx, defaultTy, w_aa, h_aa, pushX, pushY, 30 * fEscala);
      let rx = resolved.x; let ry = resolved.y;
      addBox(rx - w_aa/2, ry - h_aa/2, w_aa, h_aa);
      
      const tx_top = rx + pushX * spacing;
      const ty_top = ry + pushY * spacing;
      const tx_mid = rx;
      const ty_mid = ry;
      const tx_bot = rx - pushX * spacing;
      const ty_bot = ry - pushY * spacing;
      lines.push(`  (COMMAND "_LAYER" "_Make" "L-D-P" "")`);
      lines.push(`  (SETVAR "TEXTSTYLE" "TEXTO_GENERAL")`);
      lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "L-D-P") (cons 10 ${pt(tx_top, ty_top)}) (cons 11 ${pt(tx_top, ty_top)}) '(40 . ${f2(labelFontHeight)}) '(50 . ${f2(finalAngDegWorld * Math.PI / 180)}) '(1 . "${label1}") '(72 . 1) '(73 . 2)))`);
      lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "L-D-P") (cons 10 ${pt(tx_mid, ty_mid)}) (cons 11 ${pt(tx_mid, ty_mid)}) '(40 . ${f2(labelFontHeight)}) '(50 . ${f2(finalAngDegWorld * Math.PI / 180)}) '(1 . "${label2}") '(72 . 1) '(73 . 2)))`);
      lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "L-D-P") (cons 10 ${pt(tx_bot, ty_bot)}) (cons 11 ${pt(tx_bot, ty_bot)}) '(40 . ${f2(labelFontHeight)}) '(50 . ${f2(finalAngDegWorld * Math.PI / 180)}) '(1 . "${label3}") '(72 . 1) '(73 . 2)))`);
    }
  });

  // === FASE C: NOMENCLATURAS (POZOS) ===
  activePozosSet.forEach(pk => {
    const p = coordsMap[pk];
    if (!p) return;
    const conn = pozoConnections[pk];
    
    let bestAng = Math.PI / 4;
    if (conn && conn.allPipes.length > 0) {
      let angles = conn.allPipes.map(pipe => {
        let dx = pipe.de.toLowerCase() === pk ? pipe.aX - pipe.deX : pipe.deX - pipe.aX;
        let dy = pipe.de.toLowerCase() === pk ? pipe.aY - pipe.deY : pipe.deY - pipe.aY;
        let a = Math.atan2(dy, dx);
        return a < 0 ? a + 2*Math.PI : a;
      }).sort((a,b) => a - b);
      if (angles.length === 1) {
        let opp = angles[0] + Math.PI;
        let ang1 = opp + Math.PI/4;
        let ang2 = opp - Math.PI/4;
        bestAng = (Math.sin(ang1) > Math.sin(ang2)) ? ang1 : ang2;
      }
      else {
        let maxGap = 0;
        for (let i = 0; i < angles.length; i++) {
          let a1 = angles[i];
          let a2 = angles[(i+1)%angles.length];
          if (i === angles.length - 1) a2 += 2*Math.PI;
          let gap = a2 - a1;
          if (gap > maxGap) { maxGap = gap; bestAng = a1 + gap/2; }
        }
      }
    }

    const textLabel = p.id;
    const w = ((textLabel.length * 2.2) / 2 + 2.5) * fEscala;
    const h = 1.8 * fEscala;
    const dist = 3.5 * fEscala;
    
    let initialXc = p.x + dist * Math.cos(bestAng);
    let initialYc = p.y + dist * Math.sin(bestAng);
    
    let wbb = (w * 2) * Math.abs(cosT) + (h * 2) * Math.abs(sinT);
    let hbb = (w * 2) * Math.abs(sinT) + (h * 2) * Math.abs(cosT);
    let resolved = resolveOverlap(initialXc, initialYc, wbb, hbb, Math.cos(bestAng), Math.sin(bestAng), 300 * fEscala);
    let xc = resolved.x; let yc = resolved.y;
    addBox(xc - wbb / 2, yc - hbb / 2, wbb, hbb);
    
    lines.push(`  (COMMAND "_LAYER" "_Make" "NOMENCLATURA" "")`);
    if (resolved.dist > 0 || dist > 2.0 * fEscala) {
      lines.push(`  (SETVAR "CECOLOR" "7")`);
      lines.push(`  (IF (TBLSEARCH "LTYPE" "AM_DASHED") (SETVAR "CELTYPE" "AM_DASHED"))`);
      lines.push(`  (COMMAND "_LINE" ${pt(p.x, p.y)} ${pt(xc, yc)} "")`);
      lines.push(`  (SETVAR "CELTYPE" "BYLAYER")`);
      let dx = p.x - xc; let dy = p.y - yc;
      let len = Math.sqrt(dx*dx + dy*dy);
      if(len > 0) {
        let ux = dx / len; let uy = dy / len;
        lines.push(`  (COMMAND "_LINE" ${pt(xc, yc)} ${pt(xc + ux*0.5*fEscala - uy*0.25*fEscala, yc + uy*0.5*fEscala + ux*0.25*fEscala)} "")`);
        lines.push(`  (COMMAND "_LINE" ${pt(xc, yc)} ${pt(xc + ux*0.5*fEscala + uy*0.25*fEscala, yc + uy*0.5*fEscala - ux*0.25*fEscala)} "")`);
      }
      lines.push(`  (SETVAR "CECOLOR" "BYLAYER")`);
    }
    
    let cRad = thetaDeg * Math.PI / 180;
    let cosC = Math.cos(cRad), sinC = Math.sin(cRad);
    let p1x = xc + (-w)*cosC - (-h)*sinC, p1y = yc + (-w)*sinC + (-h)*cosC;
    let p2x = xc + (w)*cosC - (-h)*sinC,  p2y = yc + (w)*sinC + (-h)*cosC;
    let p3x = xc + (-w)*cosC - (h)*sinC,  p3y = yc + (-w)*sinC + (h)*cosC;
    let p4x = xc + (w)*cosC - (h)*sinC,   p4y = yc + (w)*sinC + (h)*cosC;
    lines.push(`  (SETVAR "CECOLOR" "2")`);
    lines.push(`  (COMMAND "_SOLID" ${pt(p1x, p1y)} ${pt(p2x, p2y)} ${pt(p3x, p3y)} ${pt(p4x, p4y)} "" "")`);
    lines.push(`  (SETVAR "CECOLOR" "BYLAYER")`);
    lines.push(`  (SETVAR "CECOLOR" "7")`);
    lines.push(`  (SETVAR "TEXTSTYLE" "POZOS")`);
    lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "NOMENCLATURA") (cons 10 ${pt(xc, yc)}) (cons 11 ${pt(xc, yc)}) '(40 . ${(2.2 * fEscala).toFixed(2)}) '(50 . ${f2(thetaDeg * Math.PI / 180)}) '(1 . "${textLabel}") '(72 . 1) '(73 . 2)))`);
    lines.push(`  (SETVAR "CECOLOR" "BYLAYER")`);
  });

  // === FASE D: �REAS AFERENTES ===
  let hasAreas = false;
  T.forEach(t => { if (t.areaPoli && t.areaPoli.length > 2) hasAreas = true; });
  if (hasAreas) {
    lines.push(`  ;;; === DIBUJAR AREAS AFERENTES ===`);
    lines.push(`  (COMMAND "_LAYER" "_Make" "AREAS-AFERENTES" "_Color" "8" "" "")`);
    lines.push(`  (SETVAR "PLINEGEN" 0)`);
    lines.push(`  (vl-catch-all-apply 'vla-put-Linetype (list (vla-Item (vla-get-Layers (vla-get-ActiveDocument (vlax-get-acad-object))) "AREAS-AFERENTES") "AM_DASHED"))`);
    
    T.forEach(t => {
      if (!t.areaPoli || t.areaPoli.length < 3) return;
      let pts = t.areaPoli;
      lines.push(`  (COMMAND "_LAYER" "_Make" "AREAS-AFERENTES" "")`);
      lines.push(`  (SETVAR "CELTSCALE" 0.05)`);
      let sumX = 0, sumY = 0;
      let validPts = 0;
      let plineStr = `  (COMMAND "_PLINE"`;
      let lastPx = null, lastPy = null;
      let firstPx = null, firstPy = null;
      pts.forEach((p, index) => {
          let px = Array.isArray(p) ? p[0] : p.x;
          let py = Array.isArray(p) ? p[1] : p.y;
          if (firstPx === null) { firstPx = px; firstPy = py; }
          else if (index === pts.length - 1 && Math.abs(px - firstPx) < 0.05 && Math.abs(py - firstPy) < 0.05) return;
          
          if (lastPx !== null && Math.abs(px - lastPx) < 0.05 && Math.abs(py - lastPy) < 0.05) return;
          plineStr += ` ${pt(px, py)}`;
          sumX += px; sumY += py;
          validPts++;
          lastPx = px; lastPy = py;
      });
      plineStr += ` "_C")`;
      if (validPts < 3) return;
      lines.push(plineStr);
      lines.push(`  (IF (TBLSEARCH "LTYPE" "AM_DASHED") (COMMAND "_CHPROP" (ENTLAST) "" "_LType" "AM_DASHED" ""))`);
      lines.push(`  (SETVAR "CELTSCALE" 1.0)`);
      
      lines.push(`  (vl-catch-all-apply '(lambda () (COMMAND "_-HATCH" "_P" "SOLID" "_S" (ENTLAST) "" "")))`);
      lines.push(`  (setTrueColor (ENTLAST) 150 200 255)`);
      lines.push(`  (vl-catch-all-apply '(lambda () (COMMAND "_CHPROP" (ENTLAST) "" "_TRansparency" "70" "")))`);
      lines.push(`  (SETVAR "CECOLOR" "BYLAYER")`);
      lines.push(`  (COMMAND "_DRAWORDER" (ENTLAST) "" "_Back")`);
      
      let cx = sumX / validPts;
      let cy = sumY / validPts;
      let areaText = `A=${parseFloat(t.areaCalc || t.areaParcial || 0).toFixed(2)}Has`;
      
      if (areaText !== "") {
        let textWidth = areaText.length * (2.4 * fEscala);
        let boxH = 3.6 * fEscala;
        let bestAng = Math.PI / 4;
        let initialCx = cx + 2.5 * fEscala * Math.cos(bestAng);
        let initialCy = cy + 2.5 * fEscala * Math.sin(bestAng);
        let wbb = textWidth * Math.abs(cosT) + boxH * Math.abs(sinT);
        let hbb = textWidth * Math.abs(sinT) + boxH * Math.abs(cosT);
        let resolved = resolveOverlap(initialCx, initialCy, wbb, hbb, Math.cos(bestAng), Math.sin(bestAng), 300 * fEscala);
        let rx = resolved.x; let ry = resolved.y;
        addBox(rx - wbb / 2.0, ry - hbb / 2.0, wbb, hbb);
        
        if (Math.sqrt((rx-cx)*(rx-cx)+(ry-cy)*(ry-cy)) > 1.5 * fEscala) {
          let dx_line = cx - rx; let dy_line = cy - ry;
          let dist_line = Math.sqrt(dx_line*dx_line + dy_line*dy_line);
          let srx = rx, sry = ry;
          if (dist_line > 0) {
              let udx = dx_line / dist_line;
              let udy = dy_line / dist_line;
              let tx = (wbb / 2) / Math.abs(udx);
              let ty = (hbb / 2) / Math.abs(udy);
              let t_min = Math.min(tx, ty);
              srx = rx + udx * t_min;
              sry = ry + udy * t_min;
          }
          
          lines.push(`  (SETVAR "CECOLOR" "7")`);
          lines.push(`  (IF (TBLSEARCH "LTYPE" "AM_DASHED") (SETVAR "CELTYPE" "AM_DASHED"))`);
          lines.push(`  (COMMAND "_LINE" ${pt(cx, cy)} ${pt(srx, sry)} "")`);
          lines.push(`  (SETVAR "CELTYPE" "BYLAYER")`);
          let dx = cx - rx; let dy = cy - ry;
          let len = Math.sqrt(dx*dx + dy*dy);
          if (len > 0) {
            let ux = dx/len; let uy = dy/len;
            let ax = cx - 1.0*fEscala*ux; let ay = cy - 1.0*fEscala*uy;
            lines.push(`  (SETVAR "CELTYPE" "CONTINUOUS")`);
            lines.push(`  (COMMAND "_SOLID" ${pt(cx, cy)} ${pt(ax - 0.4*fEscala*uy, ay + 0.4*fEscala*ux)} ${pt(ax + 0.4*fEscala*uy, ay - 0.4*fEscala*ux)} "" "")`);
            lines.push(`  (SETVAR "CELTYPE" "BYLAYER")`);
          }
          lines.push(`  (SETVAR "CECOLOR" "BYLAYER")`);
        }

        lines.push(`  (COMMAND "_LAYER" "_Make" "TEXTO-AREAS" "")`);
        lines.push(`  (SETVAR "TEXTSTYLE" "TEXTO_GENERAL")`);
        let hW = textWidth / 2, hH = boxH / 2;
        let cRad = thetaDeg * Math.PI / 180;
        let cosC = Math.cos(cRad), sinC = Math.sin(cRad);
        let p1x = rx + (-hW)*cosC - (-hH)*sinC, p1y = ry + (-hW)*sinC + (-hH)*cosC;
        let p2x = rx + (hW)*cosC - (-hH)*sinC,  p2y = ry + (hW)*sinC + (-hH)*cosC;
        let p3x = rx + (-hW)*cosC - (hH)*sinC,  p3y = ry + (-hW)*sinC + (hH)*cosC;
        let p4x = rx + (hW)*cosC - (hH)*sinC,   p4y = ry + (hW)*sinC + (hH)*cosC;
        lines.push(`  (SETVAR "CECOLOR" "4")`);
        lines.push(`  (COMMAND "_SOLID" ${pt(p1x, p1y)} ${pt(p2x, p2y)} ${pt(p3x, p3y)} ${pt(p4x, p4y)} "" "")`);
        lines.push(`  (SETVAR "CECOLOR" "BYLAYER")`);
        lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "TEXTO-AREAS") (cons 10 ${pt(rx, ry)}) (cons 11 ${pt(rx, ry)}) '(40 . ${f2(2.4*fEscala)}) '(50 . ${f2(thetaDeg * Math.PI / 180)}) '(1 . "${areaText}") '(72 . 1) '(73 . 2)))`);
      }
    });
  }


    if (!hasAreas && inpData && inpData.verts && inpData.verts.length > 0) {
      lines.push(`  ;;; === DIBUJAR AREAS AFERENTES ===`);
      lines.push(`  (COMMAND "_LAYER" "_Make" "AREAS-AFERENTES" "_Color" "8" "" "")`);
      lines.push(`  (SETVAR "PLINEGEN" 0)`);
      lines.push(`  (vl-catch-all-apply 'vla-put-Linetype (list (vla-Item (vla-get-Layers (vla-get-ActiveDocument (vlax-get-acad-object))) "AREAS-AFERENTES") "AM_DASHED"))`);
      
      let groupedVerts = {};
      inpData.verts.forEach(v => {
          let nid = String(v.SubName || v.Subcatchment || v.IDNODO || v.Nombre || "");
          if (!nid) return;
          if (!groupedVerts[nid]) groupedVerts[nid] = [];
          if (v.CoordX && v.CoordY) groupedVerts[nid].push(v);
      });
      
      const pzMinX = Math.min(...validPozos.map(p => p.x));
      const pzMaxX = Math.max(...validPozos.map(p => p.x));
      const pzMinY = Math.min(...validPozos.map(p => p.y));
      const pzMaxY = Math.max(...validPozos.map(p => p.y));

      for (let nid in groupedVerts) {
          let pts = groupedVerts[nid];
          if (pts.length < 3) continue;
          
          let sumX = 0, sumY = 0;
          pts.forEach(v => { sumX += v.CoordX; sumY += v.CoordY; });
          let cxTest = sumX / pts.length;
          let cyTest = sumY / pts.length;

          // Si el centroide del polígono está a más de 2000m del proyecto de pozos, omitir para evitar desfasamiento espacial
          if (cxTest < pzMinX - 2000 || cxTest > pzMaxX + 2000 || cyTest < pzMinY - 2000 || cyTest > pzMaxY + 2000) {
              continue;
          }
          lines.push(`  (COMMAND "_LAYER" "_Make" "AREAS-AFERENTES" "")`);
          lines.push(`  (SETVAR "CELTSCALE" 0.05)`);
          sumX = 0; sumY = 0;
          let validPts = 0;
          let plineStr = `  (COMMAND "_PLINE"`;
          let lastPx = null, lastPy = null;
          let firstPx = null, firstPy = null;
          pts.forEach((v, index) => {
              let px = v.CoordX, py = v.CoordY;
              if (firstPx === null) { firstPx = px; firstPy = py; }
              else if (index === pts.length - 1 && Math.abs(px - firstPx) < 0.05 && Math.abs(py - firstPy) < 0.05) return;
              
              if (lastPx !== null && Math.abs(px - lastPx) < 0.05 && Math.abs(py - lastPy) < 0.05) return;
              plineStr += ` ${pt(px, py)}`;
              sumX += px; sumY += py;
              validPts++;
              lastPx = px; lastPy = py;
          });
          plineStr += ` "_C")`;
          if (validPts < 3) continue;
          lines.push(plineStr);
          lines.push(`  (IF (TBLSEARCH "LTYPE" "AM_DASHED") (COMMAND "_CHPROP" (ENTLAST) "" "_LType" "AM_DASHED" ""))`);
          lines.push(`  (SETVAR "CELTSCALE" 1.0)`);
          
          lines.push(`  (vl-catch-all-apply '(lambda () (COMMAND "_-HATCH" "_P" "SOLID" "_S" (ENTLAST) "" "")))`);
          lines.push(`  (setTrueColor (ENTLAST) 150 200 255)`);
          lines.push(`  (vl-catch-all-apply '(lambda () (COMMAND "_CHPROP" (ENTLAST) "" "_TRansparency" "70" "")))`);
          lines.push(`  (SETVAR "CECOLOR" "BYLAYER")`);
          lines.push(`  (COMMAND "_DRAWORDER" (ENTLAST) "" "_Back")`);
          
          let cx = sumX / pts.length;
          let cy = sumY / pts.length;
          
          let areaText = "";
          T.forEach(t => {
              if (String(t.de || "").trim() === nid || String(t.a || "").trim() === nid) {
                  areaText = `A=${parseFloat(t.areaCalc || t.areaParcial || 0).toFixed(2)}Has`;
              }
          });
          
          if (!areaText) {
              let adProps = inpData.areasAdicionales ? inpData.areasAdicionales.find(a => String(a.IDNODO) === String(nid)) : null;
              if (adProps && adProps.areaCalc !== undefined) {
                  areaText = `A=${parseFloat(adProps.areaCalc).toFixed(2)}Has`;
              } else {
                  let sub = inpData.subcatchments ? inpData.subcatchments.find(s => String(s.Name).trim() === String(nid).trim()) : null;
                  if (sub && sub.Area) {
                      areaText = `A=${parseFloat(sub.Area).toFixed(2)}Has`;
                  }
              }
          }
          
          if (!areaText && pts.length >= 3) {
              let areaSqM = 0;
              for (let k = 0; k < pts.length; k++) {
                  let j = (k + 1) % pts.length;
                  areaSqM += pts[k].CoordX * pts[j].CoordY;
                  areaSqM -= pts[j].CoordX * pts[k].CoordY;
              }
              areaSqM = Math.abs(areaSqM) / 2.0;
              let areaHa = areaSqM / 10000.0;
              areaText = `A=${areaHa.toFixed(2)}Has`;
          }

          if (areaText !== "") {
              let textWidth = areaText.length * (2.4 * fEscala);
              let boxH = 3.6 * fEscala;
              let bestAng = Math.PI / 4;
              let initialCx = cx + 2.5 * fEscala * Math.cos(bestAng);
              let initialCy = cy + 2.5 * fEscala * Math.sin(bestAng);
              let wbb = textWidth * Math.abs(cosT) + boxH * Math.abs(sinT);
              let hbb = textWidth * Math.abs(sinT) + boxH * Math.abs(cosT);
              let resolved = resolveOverlap(initialCx, initialCy, wbb, hbb, Math.cos(bestAng), Math.sin(bestAng), 300 * fEscala);
              let rx = resolved.x; let ry = resolved.y;
              addBox(rx - wbb / 2.0, ry - hbb / 2.0, wbb, hbb);
              
              if (Math.sqrt((rx-cx)*(rx-cx)+(ry-cy)*(ry-cy)) > 1.5 * fEscala) {
                  lines.push(`  (SETVAR "CECOLOR" "7")`);
          lines.push(`  (IF (TBLSEARCH "LTYPE" "AM_DASHED") (SETVAR "CELTYPE" "AM_DASHED"))`);
          lines.push(`  (COMMAND "_LINE" ${pt(cx, cy)} ${pt(rx, ry)} "")`);
          lines.push(`  (SETVAR "CELTYPE" "BYLAYER")`);
                  let dx = cx - rx; let dy = cy - ry;
                  let len = Math.sqrt(dx*dx + dy*dy);
                  if (len > 0) {
                      let ux = dx/len; let uy = dy/len;
                      let ax = cx - 1.0*fEscala*ux; let ay = cy - 1.0*fEscala*uy;
            lines.push(`  (SETVAR "CELTYPE" "CONTINUOUS")`);
                      lines.push(`  (COMMAND "_SOLID" ${pt(cx, cy)} ${pt(ax - 0.4*fEscala*uy, ay + 0.4*fEscala*ux)} ${pt(ax + 0.4*fEscala*uy, ay - 0.4*fEscala*ux)} "" "")`);
            lines.push(`  (SETVAR "CELTYPE" "BYLAYER")`);
                  }
                  lines.push(`  (SETVAR "CECOLOR" "BYLAYER")`);
              }
              
              lines.push(`  (COMMAND "_LAYER" "_Make" "TEXTO-AREAS" "")`);
        lines.push(`  (SETVAR "TEXTSTYLE" "TEXTO_GENERAL")`);
              let hW = textWidth / 2, hH = boxH / 2;
              let cRad = thetaDeg * Math.PI / 180;
              let cosC = Math.cos(cRad), sinC = Math.sin(cRad);
              let p1x = rx + (-hW)*cosC - (-hH)*sinC, p1y = ry + (-hW)*sinC + (-hH)*cosC;
              let p2x = rx + (hW)*cosC - (-hH)*sinC,  p2y = ry + (hW)*sinC + (-hH)*cosC;
              let p3x = rx + (-hW)*cosC - (hH)*sinC,  p3y = ry + (-hW)*sinC + (hH)*cosC;
              let p4x = rx + (hW)*cosC - (hH)*sinC,   p4y = ry + (hW)*sinC + (hH)*cosC;
              lines.push(`  (SETVAR "CECOLOR" "4")`);
              lines.push(`  (COMMAND "_SOLID" ${pt(p1x, p1y)} ${pt(p2x, p2y)} ${pt(p3x, p3y)} ${pt(p4x, p4y)} "" "")`);
              lines.push(`  (SETVAR "CECOLOR" "BYLAYER")`);
              lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "TEXTO-AREAS") (cons 10 ${pt(rx, ry)}) (cons 11 ${pt(rx, ry)}) '(40 . ${f2(2.4*fEscala)}) '(50 . ${f2(thetaDeg * Math.PI / 180)}) '(1 . "${areaText}") '(72 . 1) '(73 . 2)))`);
          }
      }
    }
  
  // === FASE E: GRILLA DE COORDENADAS Y NORTE ===
  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  let g_eMinU = 0, g_eMaxU = 1000, g_eMinV = 0, g_eMaxV = 1000;
  let g_dU = 400, g_dV = 400;
  activeValidPozos.forEach(pz => {
      let u = pz.x * cosT + pz.y * sinT;
      let v = -pz.x * sinT + pz.y * cosT;
      if(u < minU) minU = u;
      if(u > maxU) maxU = u;
      if(v < minV) minV = v;
      if(v > maxV) maxV = v;
  });
  
  if (minU !== Infinity && activeValidPozos.length > 1) {
      let dU = maxU - minU;
      let dV = maxV - minV;
      let cU = (minU + maxU) / 2;
      let cV = (minV + maxV) / 2;
      
      let maxD = Math.max(dU, dV);
      let rawStep = maxD / 5;
      let step = Math.ceil(rawStep / 50) * 50;
      if (step === 0) step = 50;
      
      let targetW = dU + step * 2.5;
      let targetH = dV + step * 2.5;
      
      const vpRatio = 847.0 / 487.0;
      if (targetW / targetH < vpRatio) {
          targetW = targetH * vpRatio;
      } else {
          targetH = targetW / vpRatio;
      }
      
      let eMinU = cU - targetW / 2;
      let eMaxU = cU + targetW / 2;
      let eMinV = cV - targetH / 2;
      let eMaxV = cV + targetH / 2;
      
      g_eMinU = eMinU; g_eMaxU = eMaxU;
      g_eMinV = eMinV; g_eMaxV = eMaxV;
      g_dU = dU; g_dV = dV;
      
      const uv2xy = (u, v) => pt(u * cosT - v * sinT, u * sinT + v * cosT);
      let p1 = uv2xy(eMinU, eMinV);
      let p2 = uv2xy(eMaxU, eMinV);
      let p3 = uv2xy(eMaxU, eMaxV);
      let p4 = uv2xy(eMinU, eMaxV);
      lines.push(`  (setq zP1 ${pt(eMinU, eMinV)})`);
      lines.push(`  (setq zpWCS1 ${p1})`);
      lines.push(`  (setq zpWCS3 ${p3})`);
      
      lines.push(`  (setq zP2 ${pt(eMaxU, eMaxV)})`);
      
      lines.push(`  ;;; === DIBUJAR MARCO DE LA GRILLA ===`);
      lines.push(`  (COMMAND "_LAYER" "_Make" "GRILLA-MARCO" "_Color" "7" "" "")`);
      lines.push(`  (SETVAR "CECOLOR" "BYLAYER")`);
      lines.push(`  (COMMAND "_PLINE" ${p1} ${p2} ${p3} ${p4} "_C")`);
      
      lines.push(`  ;;; === DIBUJAR GRILLA DE COORDENADAS ===`);
      lines.push(`  (COMMAND "_LAYER" "_Make" "GRILLA-COORDENADAS" "")`);
      lines.push(`  (SETVAR "CECOLOR" "7")`);
      
      let gridTextSize = 1.0 * fEscala;
      if (step >= 50) gridTextSize = step * 0.0175;
      
      lines.push(`  (SETVAR "TEXTSTYLE" "COORDENADAS")`);
      
      let cornersX = [eMinU * cosT - eMinV * sinT, eMaxU * cosT - eMinV * sinT, eMaxU * cosT - eMaxV * sinT, eMinU * cosT - eMaxV * sinT];
      let cornersY = [eMinU * sinT + eMinV * cosT, eMaxU * sinT + eMinV * cosT, eMaxU * sinT + eMaxV * cosT, eMinU * sinT + eMaxV * cosT];
      let gMinX = Math.min(...cornersX), gMaxX = Math.max(...cornersX);
      let gMinY = Math.min(...cornersY), gMaxY = Math.max(...cornersY);
      
      let gridMinX = Math.ceil(gMinX / step) * step;
      let gridMaxX = Math.floor(gMaxX / step) * step;
      let gridMinY = Math.ceil(gMinY / step) * step;
      let gridMaxY = Math.floor(gMaxY / step) * step;
      
      const getLineIntersections = (isX, val) => {
          let points = [];
          const checkEdge = (x1, y1, x2, y2) => {
              if (isX) {
                  if ((x1 <= val && x2 >= val) || (x2 <= val && x1 >= val)) {
                      if (x1 === x2) return;
                      let y = y1 + (y2 - y1) * (val - x1) / (x2 - x1);
                      points.push(y);
                  }
              } else {
                  if ((y1 <= val && y2 >= val) || (y2 <= val && y1 >= val)) {
                      if (y1 === y2) return;
                      let x = x1 + (x2 - x1) * (val - y1) / (y2 - y1);
                      points.push(x);
                  }
              }
          };
          checkEdge(cornersX[0], cornersY[0], cornersX[1], cornersY[1]);
          checkEdge(cornersX[1], cornersY[1], cornersX[2], cornersY[2]);
          checkEdge(cornersX[2], cornersY[2], cornersX[3], cornersY[3]);
          checkEdge(cornersX[3], cornersY[3], cornersX[0], cornersY[0]);
          return points.sort((a,b) => a - b);
      };
      
      for (let x = gridMinX; x <= gridMaxX; x += step) {
          let ints = getLineIntersections(true, x);
          if (ints.length >= 2) {
              let y0 = ints[0]; let y1 = ints[ints.length-1];
              lines.push(`  (COMMAND "_LINE" ${pt(x, y0)} ${pt(x, y1)} "")`);
              
              let tx0 = x - gridTextSize * 1.5; let ty0 = y0 + gridTextSize * 8.0;
              let tx1 = x - gridTextSize * 1.5; let ty1 = y1 - gridTextSize * 8.0;
              lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "GRILLA-COORDENADAS") (cons 10 ${pt(tx1, ty1)}) (cons 11 ${pt(tx1, ty1)}) '(40 . ${f2(gridTextSize)}) '(50 . 1.570796) '(1 . "${x.toFixed(0)} E") '(72 . 1) '(73 . 2)))`);
              lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "GRILLA-COORDENADAS") (cons 10 ${pt(tx0, ty0)}) (cons 11 ${pt(tx0, ty0)}) '(40 . ${f2(gridTextSize)}) '(50 . 1.570796) '(1 . "${x.toFixed(0)} E") '(72 . 1) '(73 . 2)))`);
          }
      }
      for (let y = gridMinY; y <= gridMaxY; y += step) {
          let ints = getLineIntersections(false, y);
          if (ints.length >= 2) {
              let x0 = ints[0]; let x1 = ints[ints.length-1];
              lines.push(`  (COMMAND "_LINE" ${pt(x0, y)} ${pt(x1, y)} "")`);
              
              let tx0 = x0 + gridTextSize * 8.0; let ty0 = y + gridTextSize * 1.5;
              let tx1 = x1 - gridTextSize * 8.0; let ty1 = y + gridTextSize * 1.5;
              lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "GRILLA-COORDENADAS") (cons 10 ${pt(tx0, ty0)}) (cons 11 ${pt(tx0, ty0)}) '(40 . ${f2(gridTextSize)}) '(50 . 0.0) '(1 . "${y.toFixed(0)} N") '(72 . 1) '(73 . 2)))`);
              lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "GRILLA-COORDENADAS") (cons 10 ${pt(tx1, ty1)}) (cons 11 ${pt(tx1, ty1)}) '(40 . ${f2(gridTextSize)}) '(50 . 0.0) '(1 . "${y.toFixed(0)} N") '(72 . 1) '(73 . 2)))`);
          }
      }
      
      lines.push(`  (SETVAR "CECOLOR" "BYLAYER")`);
      lines.push(`  (if (ssget "X" '((8 . "GRILLA-COORDENADAS"))) (COMMAND "_DRAWORDER" "_P" "" "_Back"))`);
      lines.push(`  (if (ssget "X" '((8 . "GRILLA-MARCO"))) (COMMAND "_DRAWORDER" "_P" "" "_Back"))`);
      
      lines.push(`  ;;; === DIBUJAR NORTE 3D ===`);
      lines.push(`  (COMMAND "_LAYER" "_Make" "SIMBOLO-NORTE" "")`);
      
      let nU = eMaxU - step * 0.6;
      let nV = eMaxV - step * 0.6;
      let nPt = uv2xy(nU, nV);
      let nX = parseFloat(f2(nPt.split(' ')[1])); // Hack to get back X and Y since pt() gives "(LIST X Y 0.0)"
      let nY = parseFloat(f2(nPt.split(' ')[2]));
      
      let r = step * 0.12;
      
      lines.push(`  (SETVAR "CECOLOR" "251")`);
      lines.push(`  (COMMAND "_CIRCLE" ${pt(nX, nY)} "${f2(r)}")`);
      lines.push(`  (COMMAND "_CIRCLE" ${pt(nX, nY)} "${f2(r * 0.9)}")`);
      lines.push(`  (COMMAND "_CIRCLE" ${pt(nX, nY)} "${f2(r * 0.35)}")`);
      
      let lN = pt(nX, nY + r * 1.6); let lS = pt(nX, nY - r * 1.6);
      let lE = pt(nX + r * 1.6, nY); let lW = pt(nX - r * 1.6, nY);
      
      let pM = pt(nX, nY);
      let pNE = pt(nX + r*0.35*Math.cos(Math.PI/4), nY + r*0.35*Math.sin(Math.PI/4));
      let pNW = pt(nX + r*0.35*Math.cos(3*Math.PI/4), nY + r*0.35*Math.sin(3*Math.PI/4));
      let pSE = pt(nX + r*0.35*Math.cos(7*Math.PI/4), nY + r*0.35*Math.sin(7*Math.PI/4));
      let pSW = pt(nX + r*0.35*Math.cos(5*Math.PI/4), nY + r*0.35*Math.sin(5*Math.PI/4));
      
      const drawSolid = (p1, p2, p3, color) => {
          lines.push(`  (SETVAR "CECOLOR" "${color}")`);
          lines.push(`  (COMMAND "_SOLID" ${p1} ${p2} ${p3} "" "")`);
      };
      
      drawSolid(pM, pNW, lN, "250"); drawSolid(pM, pNE, lN, "253");
      drawSolid(pM, pSW, lS, "253"); drawSolid(pM, pSE, lS, "250");
      drawSolid(pM, pNE, lE, "250"); drawSolid(pM, pSE, lE, "253");
      drawSolid(pM, pNW, lW, "253"); drawSolid(pM, pSW, lW, "250");
      
      let lNE = pt(nX + r, nY + r); let lNW = pt(nX - r, nY + r);
      let lSE = pt(nX + r, nY - r); let lSW = pt(nX - r, nY - r);
      let tN = pt(nX, nY + r*0.35); let tS = pt(nX, nY - r*0.35);
      let tE = pt(nX + r*0.35, nY); let tW = pt(nX - r*0.35, nY);
      
      drawSolid(pM, tN, lNE, "253"); drawSolid(pM, tE, lNE, "250");
      drawSolid(pM, tN, lNW, "250"); drawSolid(pM, tW, lNW, "253");
      drawSolid(pM, tS, lSE, "250"); drawSolid(pM, tE, lSE, "253");
      drawSolid(pM, tS, lSW, "253"); drawSolid(pM, tW, lSW, "250");
      
      lines.push(`  (SETVAR "CECOLOR" "BYLAYER")`);
      let cTxtS = r * 0.4;
      
      // We want North Arrow texts to be horizontal on the layout. 
      // To place them relative to WCS North, we place them at 0/90 degrees relative to center, 
      // but rotate their text to thetaDeg.
      let tRadNorth = (thetaDeg * Math.PI) / 180;
      lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "SIMBOLO-NORTE") (cons 10 ${pt(nX, nY + r * 2.0)}) (cons 11 ${pt(nX, nY + r * 2.0)}) '(40 . ${f2(cTxtS*0.5)}) '(50 . ${f2(tRadNorth)}) '(1 . "N") '(72 . 1) '(73 . 2)))`);
      lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "SIMBOLO-NORTE") (cons 10 ${pt(nX, nY - r * 2.0)}) (cons 11 ${pt(nX, nY - r * 2.0)}) '(40 . ${f2(cTxtS*0.5)}) '(50 . ${f2(tRadNorth)}) '(1 . "S") '(72 . 1) '(73 . 2)))`);
      lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "SIMBOLO-NORTE") (cons 10 ${pt(nX + r * 2.0, nY)}) (cons 11 ${pt(nX + r * 2.0, nY)}) '(40 . ${f2(cTxtS*0.5)}) '(50 . ${f2(tRadNorth)}) '(1 . "E") '(72 . 1) '(73 . 2)))`);
      lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "SIMBOLO-NORTE") (cons 10 ${pt(nX - r * 2.0, nY)}) (cons 11 ${pt(nX - r * 2.0, nY)}) '(40 . ${f2(cTxtS*0.5)}) '(50 . ${f2(tRadNorth)}) '(1 . "W") '(72 . 1) '(73 . 2)))`);
      
      lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "SIMBOLO-NORTE") (cons 10 ${pt(nX + r * 1.3, nY + r * 1.3)}) (cons 11 ${pt(nX + r * 1.3, nY + r * 1.3)}) '(40 . ${f2(cTxtS*0.3)}) '(50 . ${f2(tRadNorth)}) '(1 . "NE") '(72 . 1) '(73 . 2)))`);
      lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "SIMBOLO-NORTE") (cons 10 ${pt(nX - r * 1.3, nY + r * 1.3)}) (cons 11 ${pt(nX - r * 1.3, nY + r * 1.3)}) '(40 . ${f2(cTxtS*0.3)}) '(50 . ${f2(tRadNorth)}) '(1 . "NW") '(72 . 1) '(73 . 2)))`);
      lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "SIMBOLO-NORTE") (cons 10 ${pt(nX + r * 1.3, nY - r * 1.3)}) (cons 11 ${pt(nX + r * 1.3, nY - r * 1.3)}) '(40 . ${f2(cTxtS*0.3)}) '(50 . ${f2(tRadNorth)}) '(1 . "SE") '(72 . 1) '(73 . 2)))`);
      lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "SIMBOLO-NORTE") (cons 10 ${pt(nX - r * 1.3, nY - r * 1.3)}) (cons 11 ${pt(nX - r * 1.3, nY - r * 1.3)}) '(40 . ${f2(cTxtS*0.3)}) '(50 . ${f2(tRadNorth)}) '(1 . "SW") '(72 . 1) '(73 . 2)))`);
  }

  // Phase G start (Coordinates table)
  
  // Always generate tables
  if (true) {
      let maxPozoLen = 0;
      let pozoKeys = Array.from(activePozosSet);
      pozoKeys.sort((a,b) => String(coordsMap[a].id).localeCompare(String(coordsMap[b].id), undefined, {numeric: true, sensitivity: 'base'}));
      
      pozoKeys.forEach(pk => {
          let p = coordsMap[pk];
          if (p && p.id) {
              let len = String(p.id).length;
              if (len > maxPozoLen) maxPozoLen = len;
          }
      });
      // Table dimensioning
      let col1 = Math.max(25.0 * fEscala, (maxPozoLen * 2.2 + 6.0) * fEscala); // Pozo width
      let col2 = 28.0 * fEscala; // Este width
      let col3 = 28.0 * fEscala; // Norte width
      let rowH = 4.5 * fEscala;
      let totalW = col1 + col2 + col3;
      
      let tU = g_eMaxU - (totalW / fEscala) - (typeof step !== 'undefined' ? step * 0.1 : 10.0);
      let tV = g_eMaxV - (typeof step !== 'undefined' ? step * 2.2 : 50.0);
      let tPtStr = pt(tU * cosT - tV * sinT, tU * sinT + tV * cosT);
      let tableStartX = parseFloat(f2(tPtStr.split(' ')[1]));
      let tableStartY = parseFloat(f2(tPtStr.split(' ')[2]));
      
      let tRad = (thetaDeg * Math.PI) / 180;
      let cosA = Math.cos(tRad);
      let sinA = Math.sin(tRad);
      const rPt = (x, y) => {
          let dx = x - tableStartX, dy = y - tableStartY;
          let rx = dx * cosA - dy * sinA;
          let ry = dx * sinA + dy * cosA;
          return pt(tableStartX + rx, tableStartY + ry);
      };
      const drawRect = (x1, y1, x2, y2) => {
          lines.push(`  (COMMAND "_PLINE" ${rPt(x1, y1)} ${rPt(x2, y1)} ${rPt(x2, y2)} ${rPt(x1, y2)} "_C")`);
      };
      
      lines.push(`  (COMMAND "_LAYER" "_Make" "TEXTOS" "")`);
      lines.push(`  (SETVAR "CECOLOR" "BYLAYER")`);
      lines.push(`  (SETVAR "TEXTSTYLE" "TEXTO_GENERAL")`);
      
      // Cuadro de Coordenadas Header
      let curY = tableStartY;
      lines.push(`  (SETVAR "CECOLOR" "150")`);
      lines.push(`  (COMMAND "_SOLID" ${rPt(tableStartX, curY)} ${rPt(tableStartX + totalW, curY)} ${rPt(tableStartX, curY - rowH*2)} ${rPt(tableStartX + totalW, curY - rowH*2)} "" "")`);
      lines.push(`  (SETVAR "CECOLOR" "BYLAYER")`);
      drawRect(tableStartX, curY, tableStartX + totalW, curY - rowH*2);
      
      lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "TEXTOS") (cons 10 ${rPt(tableStartX + totalW/2, curY - rowH/2)}) (cons 11 ${rPt(tableStartX + totalW/2, curY - rowH/2)}) '(40 . ${f2(1.8 * fEscala)}) '(50 . ${f2(tRad)}) '(1 . "CUADRO DE COORDENADAS") '(72 . 1) '(73 . 2)))`);
      curY -= rowH;
      lines.push(`  (COMMAND "_LINE" ${rPt(tableStartX, curY)} ${rPt(tableStartX + totalW, curY)} "")`);
      
      lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "TEXTOS") (cons 10 ${rPt(tableStartX + col1/2, curY - rowH/2)}) (cons 11 ${rPt(tableStartX + col1/2, curY - rowH/2)}) '(40 . ${f2(1.8 * fEscala)}) '(50 . ${f2(tRad)}) '(1 . "POZOS") '(72 . 1) '(73 . 2)))`);
      lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "TEXTOS") (cons 10 ${rPt(tableStartX + col1 + col2/2, curY - rowH/2)}) (cons 11 ${rPt(tableStartX + col1 + col2/2, curY - rowH/2)}) '(40 . ${f2(1.8 * fEscala)}) '(50 . ${f2(tRad)}) '(1 . "ESTE") '(72 . 1) '(73 . 2)))`);
      lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "TEXTOS") (cons 10 ${rPt(tableStartX + col1 + col2 + col3/2, curY - rowH/2)}) (cons 11 ${rPt(tableStartX + col1 + col2 + col3/2, curY - rowH/2)}) '(40 . ${f2(1.8 * fEscala)}) '(50 . ${f2(tRad)}) '(1 . "NORTE") '(72 . 1) '(73 . 2)))`);
      curY -= rowH;
      
      // Rows
      pozoKeys.forEach(pk => {
          let p = coordsMap[pk];
          lines.push(`  (COMMAND "_LINE" ${rPt(tableStartX, curY)} ${rPt(tableStartX + totalW, curY)} "")`);
          lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "TEXTOS") (cons 10 ${rPt(tableStartX + col1/2, curY - rowH/2)}) (cons 11 ${rPt(tableStartX + col1/2, curY - rowH/2)}) '(40 . ${f2(1.8 * fEscala)}) '(50 . ${f2(tRad)}) '(1 . "${p.id}") '(72 . 1) '(73 . 2)))`);
          lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "TEXTOS") (cons 10 ${rPt(tableStartX + col1 + col2/2, curY - rowH/2)}) (cons 11 ${rPt(tableStartX + col1 + col2/2, curY - rowH/2)}) '(40 . ${f2(1.8 * fEscala)}) '(50 . ${f2(tRad)}) '(1 . "${f2(p.x)}") '(72 . 1) '(73 . 2)))`);
          lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "TEXTOS") (cons 10 ${rPt(tableStartX + col1 + col2 + col3/2, curY - rowH/2)}) (cons 11 ${rPt(tableStartX + col1 + col2 + col3/2, curY - rowH/2)}) '(40 . ${f2(1.8 * fEscala)}) '(50 . ${f2(tRad)}) '(1 . "${f2(p.y)}") '(72 . 1) '(73 . 2)))`);
          curY -= rowH;
      });
      lines.push(`  (COMMAND "_LINE" ${rPt(tableStartX, curY)} ${rPt(tableStartX + totalW, curY)} "")`);
      
      // Vertical Lines
      lines.push(`  (COMMAND "_LINE" ${rPt(tableStartX, tableStartY)} ${rPt(tableStartX, curY)} "")`);
      lines.push(`  (COMMAND "_LINE" ${rPt(tableStartX + col1, tableStartY - rowH)} ${rPt(tableStartX + col1, curY)} "")`);
      lines.push(`  (COMMAND "_LINE" ${rPt(tableStartX + col1 + col2, tableStartY - rowH)} ${rPt(tableStartX + col1 + col2, curY)} "")`);
      lines.push(`  (COMMAND "_LINE" ${rPt(tableStartX + totalW, tableStartY)} ${rPt(tableStartX + totalW, curY)} "")`);
      
      // CONVENCIONES
      let convItems = [
          { type: 'pozo_ext', label: 'Pozo Existente' },
          { type: 'pozo_proj', label: 'Pozo Proyectado' }
      ];
      if (alcType === "S") {
          convItems.push({ type: 'alc_ext', label: 'Alcantarillado Sanitario Existente', color: 3, lt: "CONTINUOUS" });
          convItems.push({ type: 'alc_proj', label: 'Alcantarillado Sanitario Proyectado', color: 1, lt: "AM_DASHED" });
      } else if (alcType === "P") {
          convItems.push({ type: 'alc_ext', label: 'Alcantarillado Pluvial Existente', color: 3, lt: "AM_DASHDOTDOT" });
          convItems.push({ type: 'alc_proj', label: 'Alcantarillado Pluvial Proyectado', color: 1, lt: "AM_DASHED" });
      } else {
          convItems.push({ type: 'alc_ext', label: 'Alcantarillado Combinado Existente', color: 3, lt: "CONTINUOUS" });
          convItems.push({ type: 'alc_proj', label: 'Alcantarillado Combinado Proyectado', color: 1, lt: "AM_DASHED" });
      }
      convItems.push({ type: 'area_af', label: '\\U+00C1reas Aferentes' });
      convItems.push({ type: 'medida_ar', label: 'Medida \\U+00C1reas' });
      convItems.push({ type: 'nom_pozo', label: 'Nomenclatura de Pozo' });
      
      let maxConvLen = 0;
      convItems.forEach(item => {
          let len = String(item.label).length;
          if (len > maxConvLen) maxConvLen = len;
      });
      
      curY -= rowH * 3.5;
      let convStartY = curY;
      // Convenciones dimensioning dynamically
      let convW = Math.max(totalW, (maxConvLen * 1.8 + 35.0) * fEscala);
      
      lines.push(`  (SETVAR "CECOLOR" "150")`);
      lines.push(`  (COMMAND "_SOLID" ${rPt(tableStartX, curY)} ${rPt(tableStartX + convW, curY)} ${rPt(tableStartX, curY - rowH*1.5)} ${rPt(tableStartX + convW, curY - rowH*1.5)} "" "")`);
      lines.push(`  (SETVAR "CECOLOR" "BYLAYER")`);
      drawRect(tableStartX, curY, tableStartX + convW, curY - rowH*1.5);
      lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "TEXTOS") (cons 10 ${rPt(tableStartX + convW/2, curY - rowH*0.75)}) (cons 11 ${rPt(tableStartX + convW/2, curY - rowH*0.75)}) '(40 . ${f2(2.5 * fEscala)}) '(50 . ${f2(tRad)}) '(1 . "CONVENCIONES") '(72 . 1) '(73 . 2)))`);
      curY -= rowH*1.5;

      
      let symX = tableStartX + 15.0 * fEscala;
      let textX = tableStartX + 30.0 * fEscala;
      
      convItems.forEach(item => {
          curY -= rowH * 1.5;
          let symY = curY;
          
          if (item.type === 'pozo_ext') {
              lines.push(`  (COMMAND "_LAYER" "_Make" "POZOE" "")`);
              lines.push(`  (COMMAND "_CIRCLE" ${rPt(symX, symY)} "${f2(1.5 * fEscala)}")`);
              lines.push(`  (COMMAND "_CIRCLE" ${rPt(symX, symY)} "${f2(1.0 * fEscala)}")`);
          } else if (item.type === 'pozo_proj') {
              lines.push(`  (COMMAND "_LAYER" "_Make" "POZOP" "")`);
              lines.push(`  (COMMAND "_CIRCLE" ${rPt(symX, symY)} "${f2(1.5 * fEscala)}")`);
          } else if (item.type === 'alc_ext' || item.type === 'alc_proj') {
              lines.push(`  (SETVAR "CECOLOR" "${item.color}")`);
              lines.push(`  (IF (TBLSEARCH "LTYPE" "${item.lt}") (SETVAR "CELTYPE" "${item.lt}"))`);
              lines.push(`  (SETVAR "CELTSCALE" 3.2)`);
              lines.push(`  (COMMAND "_LINE" ${rPt(symX - 10*fEscala, symY)} ${rPt(symX + 10*fEscala, symY)} "")`);
              lines.push(`  (SETVAR "CELTSCALE" 1.0)`);
              lines.push(`  (SETVAR "CELTYPE" "BYLAYER")`);
              lines.push(`  (SETVAR "CECOLOR" "BYLAYER")`);
          } else if (item.type === 'area_af') {
              lines.push(`  (SETVAR "CECOLOR" "5")`);
              lines.push(`  (IF (TBLSEARCH "LTYPE" "AM_DASHED") (SETVAR "CELTYPE" "AM_DASHED"))`);
              lines.push(`  (SETVAR "CELTSCALE" 3.2)`);
              lines.push(`  (COMMAND "_LINE" ${rPt(symX - 10*fEscala, symY)} ${rPt(symX + 10*fEscala, symY)} "")`);
              lines.push(`  (SETVAR "CELTSCALE" 1.0)`);
              lines.push(`  (SETVAR "CELTYPE" "BYLAYER")`);
              lines.push(`  (SETVAR "CECOLOR" "BYLAYER")`);
          } else if (item.type === 'medida_ar') {
              let cx1 = symX - 8*fEscala, cy1 = symY - 1.5*fEscala;
              let cx2 = symX + 8*fEscala, cy2 = symY + 1.5*fEscala;
              lines.push(`  (SETVAR "CECOLOR" "4")`);
              lines.push(`  (COMMAND "_SOLID" ${rPt(cx1, cy1)} ${rPt(cx2, cy1)} ${rPt(cx1, cy2)} ${rPt(cx2, cy2)} "" "")`);
              lines.push(`  (SETVAR "CECOLOR" "BYLAYER")`);
              lines.push(`  (COMMAND "_LAYER" "_Make" "TEXTOS" "")`);
              lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "TEXTOS") (cons 10 ${rPt(symX, symY)}) (cons 11 ${rPt(symX, symY)}) '(40 . ${f2(1.5 * fEscala)}) '(50 . ${f2(tRad)}) '(1 . "A=0.00Has") '(72 . 1) '(73 . 2)))`);
          } else if (item.type === 'nom_pozo') {
              let cx1 = symX - 10*fEscala, cy1 = symY - 1.5*fEscala;
              let cx2 = symX + 10*fEscala, cy2 = symY + 1.5*fEscala;
              lines.push(`  (SETVAR "CECOLOR" "2")`);
              lines.push(`  (COMMAND "_SOLID" ${rPt(cx1, cy1)} ${rPt(cx2, cy1)} ${rPt(cx1, cy2)} ${rPt(cx2, cy2)} "" "")`);
              lines.push(`  (SETVAR "CECOLOR" "BYLAYER")`);
              lines.push(`  (COMMAND "_LAYER" "_Make" "TEXTOS" "")`);
              lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "TEXTOS") (cons 10 ${rPt(symX, symY)}) (cons 11 ${rPt(symX, symY)}) '(40 . ${f2(1.5 * fEscala)}) '(50 . ${f2(tRad)}) '(1 . "001-P(A-B)1") '(72 . 1) '(73 . 2)))`);
          }
          
          lines.push(`  (COMMAND "_LAYER" "_Make" "TEXTOS" "")`);
          lines.push(`  (SETVAR "CECOLOR" "2")`);
          lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "TEXTOS") (cons 10 ${rPt(textX, symY)}) (cons 11 ${rPt(textX, symY)}) '(40 . ${f2(1.8 * fEscala)}) '(50 . ${f2(tRad)}) '(1 . "${item.label}") '(72 . 0) '(73 . 2)))`);
          lines.push(`  (SETVAR "CECOLOR" "BYLAYER")`);
      });
      
      curY -= rowH;
      drawRect(tableStartX, convStartY, tableStartX + convW, curY);
  }

  // Switch to Layout and generate Paper Space elements
  lines.push(`  (COMMAND "_TILEMODE" "0")`);
  lines.push(`  (COMMAND "_PSPACE")`);
  
  const marcoLines = exportMarcoPlantaLISP(P);
  marcoLines.forEach(l => lines.push(l));
  
  let minX = 39.0, minY = 46.0, maxX = 886.0, maxY = 533.0;
  
  lines.push(`  (vl-load-com)`);
  lines.push(`  (vlax-for ent (vla-get-PaperSpace (vla-get-ActiveDocument (vlax-get-acad-object))) (if (= (vla-get-ObjectName ent) "AcDbViewport") (vl-catch-all-apply 'vla-delete (list ent))))`);
  lines.push(`  (COMMAND "_MVIEW" ${pt(minX, minY)} ${pt(maxX, maxY)})`);
  lines.push(`  (COMMAND "_MSPACE")`);
  lines.push(`  (SETVAR "GRIDMODE" 0)`);
  lines.push(`  (COMMAND "_UCS" "_Z" "${f2(thetaDeg)}")`);
  lines.push(`  (COMMAND "_PLAN" "")`);
  lines.push(`  (if (and zpWCS1 zpWCS3) (COMMAND "_ZOOM" "_W" (trans zpWCS1 0 1) (trans zpWCS3 0 1)))`);
  
  lines.push(`  (COMMAND "_PSPACE")`);
  
  lines.push(`  ;;; AJUSTAR LIENZO DEL LAYOUT (TAMAO PAPEL)`);
  lines.push(`  (vl-load-com)`);
  lines.push(`  (if (and (setq acadObj (vlax-get-acad-object)) (setq doc (vla-get-ActiveDocument acadObj)))`);
  lines.push(`    (progn`);
  lines.push(`      (setq layout (vla-get-ActiveLayout doc))`);
  lines.push(`      (vla-put-ConfigName layout "DWG To PDF.pc3")`);
  lines.push(`      (vl-catch-all-apply 'vla-put-CanonicalMediaName (list layout "ISO_full_bleed_A1_(841.00_x_594.00_MM)"))`);
  lines.push(`      (vl-catch-all-apply 'vla-put-CanonicalMediaName (list layout "ISO_A1_(841.00_x_594.00_MM)"))`);
  lines.push(`      (vla-put-PlotType layout 1)`);
  lines.push(`      (vla-put-PlotRotation layout 0)`);
  lines.push(`      (vla-put-CenterPlot layout :vlax-true)`);
  lines.push(`      (vla-put-StandardScale layout 0)`);
  lines.push(`      (vla-RefreshPlotDeviceInfo layout)`);
  lines.push(`    )`);
  lines.push(`  )`);
  lines.push(`  (COMMAND "_ZOOM" "_E")`);
  lines.push(`  (SETVAR "GRIDMODE" 0)`);

  lines.push("  (SETVAR \"OSMODE\" OLD_OSMODE)");
  lines.push(`  (PRINC "\nPLANTA OK - ${rawTramos.length} tramos dibujados - AMCAUDALES")`);
  lines.push("  (PRINC)");
  lines.push(")");
  lines.push("");

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const fileName = `Planta_${(P.proyecto || 'proyecto').replace(/[^a-zA-Z0-9_\-]/g, '_')}.lsp`;
  saveFileWithDialog(blob, fileName);
}

export function exportPlantaLISPSeleccion(R, P, T, selMap, inpData) {
  if (!selMap || selMap.length === 0) {
    alert('No hay tramos seleccionados en el visor. Seleccione tramos en el mapa primero.');
    return;
  }
  const selSet = new Set(
    (selMap || []).filter(sm => sm && sm.de && sm.a)
      .map(sm => `${String(sm.de).trim().toLowerCase()}||${String(sm.a).trim().toLowerCase()}`)
  );
  if (selSet.size === 0) {
    alert('No hay tramos válidos seleccionados.');
    return;
  }
  const RFiltered = (R || []).filter(r => {
    if (r.sep) return false;
    const key = `${String(r.de || '').trim().toLowerCase()}||${String(r.a || '').trim().toLowerCase()}`;
    return selSet.has(key);
  });
  if (RFiltered.length === 0) {
    alert('Ningún tramo seleccionado coincide con los tramos calculados.');
    return;
  }
  const RReindexed = RFiltered.map((r, idx) => ({ ...r, id: idx + 1 }));
  const TFiltered = RFiltered.map(r => T[(r.id || 1) - 1] || {});
  const PRename = { ...P, proyecto: (P.proyecto || 'proyecto') + '_SEL' };
  exportPlantaLISP(RReindexed, PRename, TFiltered, inpData);
}

