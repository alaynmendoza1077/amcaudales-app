/**
 * Motor topológico para Perfiles Longitudinales (RAS 2017)
 * 1) Descompone cualquier conjunto de tramos en sub-perfiles estrictamente conectados
 *    (nunca une tramos desconectados ni fusiona pozos distintos).
 * 2) Construye el modelo geométrico para:
 *    - Perfil individual continuo
 *    - Vista comparativa lado a lado con corte explícito de discontinuidad (mostrando los 4+ pozos reales y su desnivel)
 */

export function decomposeIntoContinuousProfiles(pipesList, pzMap = {}) {
  const validPipes = (Array.isArray(pipesList) ? pipesList : []).filter(
    p => p && !p.sep && String(p.de || '').trim() !== '' && String(p.a || '').trim() !== ''
  );
  if (validPipes.length === 0) return [];

  const edges = validPipes.map((p, idx) => {
    const u = String(p.de).trim();
    const v = String(p.a).trim();
    const crDE = parseFloat(p.crDE != null ? p.crDE : p.cotaRasante) || 0;
    const crA = parseFloat(p.crA != null ? p.crA : p.cotaRasanteA) || 0;
    const cfDE = parseFloat(p.cfDE != null ? p.cfDE : (p.cotaFondoDE != null ? p.cotaFondoDE : p.cotaFondo)) || 0;
    const cfA = parseFloat(p.cfA != null ? p.cfA : p.cotaFondoA) || 0;
    const L = parseFloat(p.L != null ? p.L : p.longitud) || 10;
    return { idx, raw: p, u, v, crDE, crA, cfDE, cfA, L };
  });

  const visited = new Set();
  const profiles = [];

  // Calcula el alcance máximo aguas abajo desde un nodo usando aristas no visitadas
  const calcDownstreamReach = (nodeId, guard = new Set()) => {
    if (guard.has(nodeId)) return 0;
    guard.add(nodeId);
    let best = 0;
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      if (visited.has(e.idx)) continue;
      if (e.u === nodeId) {
        const reach = e.L + calcDownstreamReach(e.v, new Set(guard));
        if (reach > best) best = reach;
      }
    }
    return best;
  };

  while (visited.size < edges.length) {
    const inDeg = {};
    const outEdges = {};
    edges.forEach(e => {
      if (visited.has(e.idx)) return;
      inDeg[e.u] = inDeg[e.u] || 0;
      inDeg[e.v] = (inDeg[e.v] || 0) + 1;
      if (!outEdges[e.u]) outEdges[e.u] = [];
      outEdges[e.u].push(e);
    });

    // Elegir cabecera óptima (inDeg === 0, priorizando mayor alcance y mayor cota)
    let startEdge = null;
    let bestScore = -Infinity;

    edges.forEach(e => {
      if (visited.has(e.idx)) return;
      const isHead = (inDeg[e.u] || 0) === 0;
      const reach = calcDownstreamReach(e.u);
      const elev = e.crDE || e.cfDE || 0;
      const score = (isHead ? 1000000 : 0) + reach * 100 + elev;
      if (score > bestScore) {
        bestScore = score;
        startEdge = e;
      }
    });

    if (!startEdge) {
      startEdge = edges.find(e => !visited.has(e.idx));
    }
    if (!startEdge) break;

    const chain = [];
    let curEdge = startEdge;

    while (curEdge && !visited.has(curEdge.idx)) {
      visited.add(curEdge.idx);
      const item = Object.assign({}, curEdge.raw);
      let effDe = curEdge.u;
      let effA = curEdge.v;
      if (effDe === effA) {
        effDe = `${effDe} (Entrada)`;
      }
      item.effectiveDe = effDe;
      item.effectiveA = effA;
      item.effectiveCrDE = curEdge.crDE;
      item.effectiveCrA = curEdge.crA;
      item.effectiveCfDE = curEdge.cfDE;
      item.effectiveCfA = curEdge.cfA;
      item.L = curEdge.L;
      chain.push(item);

      const nextCandidates = (outEdges[curEdge.v] || []).filter(ne => !visited.has(ne.idx));
      if (nextCandidates.length === 0) {
        curEdge = null;
      } else if (nextCandidates.length === 1) {
        curEdge = nextCandidates[0];
      } else {
        // En confluencias/bifurcaciones seguir la rama principal de mayor alcance / diámetro
        nextCandidates.sort((a, b) => {
          const rDiff = calcDownstreamReach(b.v) - calcDownstreamReach(a.v);
          if (Math.abs(rDiff) > 0.01) return rDiff;
          return (parseFloat(b.raw.D) || 0) - (parseFloat(a.raw.D) || 0);
        });
        curEdge = nextCandidates[0];
      }
    }

    if (chain.length > 0) {
      const len = chain.reduce((acc, r) => acc + (parseFloat(r.L) || 0), 0);
      const firstDe = chain[0].effectiveDe;
      const lastA = chain[chain.length - 1].effectiveA;
      const pIdx = profiles.length + 1;
      profiles.push({
        profileNumber: pIdx,
        cab: firstDe,
        fin: lastA,
        title: `Perfil ${pIdx}: ${firstDe} → ${lastA}`,
        chain,
        len
      });
    }
  }

  return profiles;
}

/**
 * Construye los pozos, tuberías y cortes de discontinuidad para 1 o múltiples sub-perfiles.
 * Cuando se pasan varios sub-perfiles desconectados:
 * - Dibuja TODOS los pozos reales (ej. 4 pozos para 2 tramos sueltos: P1, P2 | corte | P3, P4)
 * - Mantiene la misma escala vertical s.n.m. para evidenciar el desnivel real lado a lado
 * - NO traza terreno ni tubería falsa a través del corte ni inventa caídas ΔH entre sectores desconectados
 */
export function buildProfileRenderModel(subProfiles, pzMap = {}) {
  const validSubs = (Array.isArray(subProfiles) ? subProfiles : []).filter(
    sp => sp && Array.isArray(sp.chain) && sp.chain.length > 0
  );
  if (validSubs.length === 0) {
    return { segments: [], profileNodes: [], pipesToDraw: [], breaks: [], xMaxPlot: 100, totalRealLen: 0 };
  }

  const totalRealLen = validSubs.reduce((s, sp) => s + (sp.len || sp.chain.reduce((a, r) => a + (parseFloat(r.L) || 10), 0)), 0);
  const totalPipes = validSubs.reduce((s, sp) => s + sp.chain.length, 0);
  const avgPipeLen = totalPipes > 0 ? totalRealLen / totalPipes : 35;
  const gapPlotWidth = validSubs.length > 1 ? Math.max(16, Math.min(45, avgPipeLen * 0.45)) : 0;

  let xPlotCursor = 0;
  const segments = [];
  const profileNodes = [];
  const pipesToDraw = [];
  const breaks = [];

  validSubs.forEach((sp, segIdx) => {
    const chain = sp.chain;
    let localAbscisa = 0;
    const segNodes = [];
    const segStartPlot = xPlotCursor;

    chain.forEach((r, i) => {
      let nodeName = r.effectiveDe || r.de;
      if (i > 0 && segNodes.length > 0 && nodeName === segNodes[segNodes.length - 1].name) {
        nodeName = `${nodeName} (N${i + 1})`;
      }

      const pzObj = pzMap[nodeName] || pzMap[r.effectiveDe] || pzMap[r.de];
      const pipeCrDE = parseFloat(r.effectiveCrDE != null ? r.effectiveCrDE : r.crDE);
      const pipeCfDE = parseFloat(r.effectiveCfDE != null ? r.effectiveCfDE : r.cfDE);

      // En inicios de sub-perfil desconectado priorizamos la cota real del propio tramo si no hay llegada previa en este perfil
      let cr = !isNaN(pipeCrDE) && pipeCrDE !== 0 ? pipeCrDE : (pzObj ? parseFloat(pzObj.cr) : 0);
      if (pzObj && !isNaN(parseFloat(pzObj.cr)) && parseFloat(pzObj.cr) > 0 && i > 0) {
        cr = parseFloat(pzObj.cr);
      }
      const cfA_in = i > 0 ? parseFloat(chain[i - 1].effectiveCfA != null ? chain[i - 1].effectiveCfA : chain[i - 1].cfA) : null;
      const cfDE_out = !isNaN(pipeCfDE) ? pipeCfDE : (pzObj ? parseFloat(pzObj.cf) : 0);
      let cf = cfDE_out;
      if (cfA_in != null && !isNaN(cfA_in)) {
        cf = Math.min(cfDE_out, cfA_in);
      }
      const prof = +(cr - cf).toFixed(2);
      const drop = (cfA_in != null && !isNaN(cfA_in) && !isNaN(cfDE_out)) ? Math.max(0, +(cfA_in - cfDE_out).toFixed(2)) : 0;

      const startNodeObj = {
        globalIdx: profileNodes.length,
        segIdx,
        segTitle: sp.title || `Perfil ${segIdx + 1}`,
        idxInSeg: i,
        x: xPlotCursor,
        abscisaLocal: localAbscisa,
        name: nodeName,
        cr: cr || 0,
        cf: cf || 0,
        prof,
        pz: pzObj,
        cfDE_out,
        cfA_in,
        drop,
        pipeOut: r,
        pipeIn: i > 0 ? chain[i - 1] : null,
        isSegmentStart: i === 0,
        isSegmentEnd: false
      };

      segNodes.push(startNodeObj);
      profileNodes.push(startNodeObj);

      const pipeLen = parseFloat(r.L) || 10;
      xPlotCursor += pipeLen;
      localAbscisa += pipeLen;

      if (i === chain.length - 1) {
        let endNodeName = r.effectiveA || r.a;
        if (endNodeName === nodeName) {
          endNodeName = `${endNodeName} (Salida)`;
        }
        const endPzObj = pzMap[endNodeName] || pzMap[r.effectiveA] || pzMap[r.a];
        const pipeCrA = parseFloat(r.effectiveCrA != null ? r.effectiveCrA : r.crA);
        const pipeCfA = parseFloat(r.effectiveCfA != null ? r.effectiveCfA : r.cfA);
        const endCr = (!isNaN(pipeCrA) && pipeCrA !== 0) ? pipeCrA : (endPzObj ? parseFloat(endPzObj.cr) || 0 : 0);
        const endCf = !isNaN(pipeCfA) ? pipeCfA : (endPzObj ? parseFloat(endPzObj.cf) || 0 : 0);
        const endProf = +(endCr - endCf).toFixed(2);

        const endNodeObj = {
          globalIdx: profileNodes.length,
          segIdx,
          segTitle: sp.title || `Perfil ${segIdx + 1}`,
          idxInSeg: i + 1,
          x: xPlotCursor,
          abscisaLocal: localAbscisa,
          name: endNodeName,
          cr: endCr,
          cf: endCf,
          prof: endProf,
          pz: endPzObj,
          cfDE_out: null,
          cfA_in: endCf,
          drop: 0,
          pipeOut: null,
          pipeIn: r,
          isSegmentStart: false,
          isSegmentEnd: true
        };

        segNodes.push(endNodeObj);
        profileNodes.push(endNodeObj);
      }
    });

    for (let i = 0; i < chain.length; i++) {
      pipesToDraw.push({
        pipe: chain[i],
        segIdx,
        n1: segNodes[i],
        n2: segNodes[i + 1]
      });
    }

    const segEndPlot = xPlotCursor;
    segments.push({
      segIdx,
      title: sp.title || `Perfil ${segIdx + 1}`,
      cab: sp.cab,
      fin: sp.fin,
      nodes: segNodes,
      chain,
      len: localAbscisa,
      xStartPlot: segStartPlot,
      xEndPlot: segEndPlot
    });

    if (segIdx < validSubs.length - 1) {
      const leftEndNode = segNodes[segNodes.length - 1];
      const xLeft = xPlotCursor;
      xPlotCursor += gapPlotWidth;
      const xRight = xPlotCursor;
      breaks.push({
        breakIdx: segIdx,
        afterGlobalNodeIdx: leftEndNode.globalIdx,
        leftNode: leftEndNode,
        rightNode: null, // se completa al crear el primer nodo del siguiente segmento
        xLeft,
        xRight,
        xMid: (xLeft + xRight) / 2
      });
    }
  });

  // Asociar nodo derecho de cada corte para calcular el desnivel exacto lado a lado
  breaks.forEach((brk, bIdx) => {
    const nextSeg = segments[bIdx + 1];
    if (nextSeg && nextSeg.nodes.length > 0) {
      const rNode = nextSeg.nodes[0];
      brk.rightNode = rNode;
      brk.deltaCr = +(rNode.cr - brk.leftNode.cr).toFixed(2);
      brk.deltaCf = +(rNode.cf - brk.leftNode.cf).toFixed(2);
    }
  });

  return {
    segments,
    profileNodes,
    pipesToDraw,
    breaks,
    xMaxPlot: xPlotCursor || 100,
    totalRealLen
  };
}
