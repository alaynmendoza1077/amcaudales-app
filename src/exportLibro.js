import ExcelJS from 'exceljs';
import { saveFileWithDialog } from './utils/fileSaver';
import proj4 from 'proj4';

if (!proj4.defs["EPSG:3116"]) {
    proj4.defs("EPSG:3116", "+proj=tmerc +lat_0=4.59620041666667 +lon_0=-74.0775079166667 +k=1 +x_0=1000000 +y_0=1000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
}
const projectToMeters = (lng, lat) => proj4("EPSG:4326", "EPSG:3116", [lng, lat]);

export function exportLibro(P, R, T, inpData, autoAreasPoly) {
    if (!R || !R.length) {
        window.alert("No hay datos para exportar. Cargue o inyecte datos primero.");
        return;
    }

    // Filtrar solo tramos calculados (no separadores) 
    const dR = R.filter(r => !r.sep);

    const wb = new ExcelJS.Workbook();

    const addSheetData = (wsName, headers, dataRows) => {
        const ws = wb.addWorksheet(wsName);
        ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
        const headerRow = ws.addRow(headers);
        headerRow.eachCell(c => {
            c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F497D' } };
            c.alignment = { horizontal: 'center', vertical: 'middle' };
        });
        ws.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: 1, column: headers.length }
        };
        dataRows.forEach(row => ws.addRow(row));
        ws.columns.forEach(col => { col.width = 15; });
    };

    // Construir set de pozos seleccionados (solo los que aparecen en dR)
    const selectedNodes = new Set();
    dR.forEach(r => { selectedNodes.add(r.de); selectedNodes.add(r.a); });

    // 1. AreaDrenaje - usar áreas actuales (tItem.areaCalc o tItem.areaParcial) o fallback a r.aP / r.aT
    const areaH = ['fid', 'id', 'IDCUENCA', 'AREACUENCA', 'TIPOCUENCA', 'CESC', 'DENSIDAD', 'CONSUMO', 'LONGCUENCA', 'IDESTACION', 'IDNODO', 'Nombre'];
    const areaData = [];
    
    let baseAdMap = {};
    if (inpData && inpData.ad) {
        inpData.ad.forEach(ad => {
            let key = String(ad.IDNODO || ad.Nombre || ad.IDCUENCA || "").trim();
            if (key) baseAdMap[key] = ad;
        });
    }

    let autoAreaMap = {};
    let autoVertsMap = {};
    if (autoAreasPoly) {
        autoAreasPoly.forEach(feat => {
            let nId = String(feat.properties.pozoId || feat.properties.id || "").trim();
            if (!nId && feat.properties.label) {
                let lbl = feat.properties.label; // e.g. "Tramo P1-P2"
                nId = lbl.replace("Tramo ", "").split("-")[0];
            }
            if (nId) {
                autoAreaMap[nId] = feat.properties.areaHa;
                if (feat.geometry) autoVertsMap[nId] = feat.geometry;
            }
        });
    }

    let aIdx = 1;
    dR.forEach((r, i) => {
        let tItem = T[r.id - 1] || {};
        let baseAd = baseAdMap[r.de] || {};
        
        let idCuenca = baseAd.IDCUENCA || r.de + "_CUENCA";
        let area = autoAreaMap[r.de] !== undefined ? autoAreaMap[r.de] : (tItem.areaCalc !== undefined ? tItem.areaCalc : (tItem.areaParcial !== undefined ? tItem.areaParcial : (r.aP !== undefined ? r.aP : (r.aT !== undefined ? r.aT : (baseAd.AREACUENCA || 0.15)))));
        let tipo = tItem.TIPOCUENCA || baseAd.TIPOCUENCA || (P && P.tipoArea) || "RESIDENCIAL";
        let cesc = tItem.CESC !== undefined ? tItem.CESC : (baseAd.CESC !== undefined ? baseAd.CESC : (P && P.coefEscorrentia !== undefined ? P.coefEscorrentia : 0.75));
        let den = tItem.DENSIDAD !== undefined ? tItem.DENSIDAD : (baseAd.DENSIDAD !== undefined ? baseAd.DENSIDAD : (P && P.densidad ? P.densidad : 200));
        let con = tItem.CONSUMO !== undefined ? tItem.CONSUMO : (baseAd.CONSUMO !== undefined ? baseAd.CONSUMO : (P && P.consumo ? P.consumo : 140));
        let longc = tItem.LONGCUENCA !== undefined ? tItem.LONGCUENCA : (baseAd.LONGCUENCA !== undefined ? baseAd.LONGCUENCA : 50);
        let est = (P && P.estacion) || baseAd.IDESTACION || "BUC";
        
        areaData.push([aIdx, aIdx, idCuenca, area, tipo, cesc, den, con, longc, est, r.de, baseAd.Nombre || "C_" + r.de]);
        aIdx++;
    });
    addSheetData("AreaDrenaje", areaH, areaData);

    // 2. Vertices - exportar los vértices asociados a los nodos seleccionados
    const vertH = ['fid', 'id', 'IDCUENCA', 'AREACUENCA', 'TIPOCUENCA', 'CESC', 'DENSIDAD', 'CONSUMO', 'LONGCUENCA', 'IDESTACION', 'IDNODO', 'Nombre', 'CoordX', 'CoordY'];
    const vertData = [];
    var coordMap = {};
    
    // Recolectar coordenadas de todas las fuentes disponibles
    const ptCoords = {};
    const allPozos = (inpData && inpData.pozos ? inpData.pozos : []).concat(inpData && inpData.rawPozos ? inpData.rawPozos : []);
    
    allPozos.forEach(pz => {
        let pid = String(pz.IdNodo || pz.IDNODO || pz.id || pz.Nombre || pz.pozo || pz.nombre || pz.SubName || "").trim();
        if (pid) {
            ptCoords[pid] = { x: pz.CoordX !== undefined ? pz.CoordX : pz.x, y: pz.CoordY !== undefined ? pz.CoordY : pz.y };
        }
    });

    let vIdx = 1;
    if (inpData && inpData.verts && inpData.verts.length > 0) {
        inpData.verts.forEach(row => {
            let nodo = String(row.IDNODO || row.SubName || row.Nombre || "").trim();
            let match = selectedNodes.has(nodo) || dR.some(r => {
                let rde = String(r.de).trim();
                let ra = String(r.a).trim();
                return nodo === rde || nodo === ra || nodo === rde + "-" + ra || String(row.IDCUENCA || "").trim() === rde;
            });
            if (match) {
                let tItem = T.find(t => String(t.de) === String(nodo) || String(t.de + "-" + t.a) === String(nodo)) || {};
                let baseAd = baseAdMap[nodo] || {};
                let idCuenca = baseAd.IDCUENCA || row.IDCUENCA || row.id || (nodo + "_CUENCA");
                let area = tItem.areaCalc !== undefined ? tItem.areaCalc : (tItem.areaParcial !== undefined ? tItem.areaParcial : (row.AREACUENCA || row.areaHa || 0.15));
                let tipo = tItem.TIPOCUENCA || baseAd.TIPOCUENCA || (P && P.tipoArea) || row.TIPOCUENCA || row.tipocuenca || "RESIDENCIAL";
                let cesc = tItem.CESC !== undefined ? tItem.CESC : (baseAd.CESC !== undefined ? baseAd.CESC : (P && P.coefEscorrentia !== undefined ? P.coefEscorrentia : (row.CESC !== undefined ? row.CESC : 0.75)));
                let den = tItem.DENSIDAD !== undefined ? tItem.DENSIDAD : (baseAd.DENSIDAD !== undefined ? baseAd.DENSIDAD : (P && P.densidad ? P.densidad : (row.DENSIDAD !== undefined ? row.DENSIDAD : 200)));
                let con = tItem.CONSUMO !== undefined ? tItem.CONSUMO : (baseAd.CONSUMO !== undefined ? baseAd.CONSUMO : (P && P.consumo ? P.consumo : (row.CONSUMO !== undefined ? row.CONSUMO : 140)));
                let longc = tItem.LONGCUENCA !== undefined ? tItem.LONGCUENCA : (baseAd.LONGCUENCA !== undefined ? baseAd.LONGCUENCA : (row.LONGCUENCA !== undefined ? row.LONGCUENCA : 50));
                let est = (P && P.estacion) || baseAd.IDESTACION || row.IDESTACION || "BUC";
                let idN = row.IDNODO || row.IdNodo || nodo || "";
                let nom = row.Nombre || row.nombre || "C_" + idN;

                vertData.push([vIdx, vIdx, idCuenca, area, tipo, cesc, den, con, longc, est, idN, nom, row.CoordX, row.CoordY]);
                coordMap[idN] = { x: row.CoordX, y: row.CoordY };
                vIdx++;
            }
        });
    } else {
        selectedNodes.forEach(n => {
            let nx = 0; let ny = 0;
            if (ptCoords[n] && ptCoords[n].x !== undefined && ptCoords[n].y !== undefined) {
                if (Math.abs(ptCoords[n].x) < 180 && Math.abs(ptCoords[n].y) < 90) {
                    let ptM = projectToMeters(ptCoords[n].x, ptCoords[n].y);
                    nx = ptM[0]; ny = ptM[1];
                } else {
                    nx = ptCoords[n].x; ny = ptCoords[n].y;
                }
            }
            
            let tItem = T.find(t => String(t.de) === String(n)) || {};
            let baseAd = baseAdMap[n] || {};
            
            let idCuenca = baseAd.IDCUENCA || n + "_CUENCA";
            let area = autoAreaMap[n] !== undefined ? autoAreaMap[n] : (tItem.areaCalc !== undefined ? tItem.areaCalc : (tItem.areaParcial !== undefined ? tItem.areaParcial : (baseAd.AREACUENCA || 0.15)));
            let tipo = tItem.TIPOCUENCA || baseAd.TIPOCUENCA || (P && P.tipoArea) || "RESIDENCIAL";
            let cesc = tItem.CESC !== undefined ? tItem.CESC : (baseAd.CESC !== undefined ? baseAd.CESC : (P && P.coefEscorrentia !== undefined ? P.coefEscorrentia : 0.75));
            let den = tItem.DENSIDAD !== undefined ? tItem.DENSIDAD : (baseAd.DENSIDAD !== undefined ? baseAd.DENSIDAD : (P && P.densidad ? P.densidad : 200));
            let con = tItem.CONSUMO !== undefined ? tItem.CONSUMO : (baseAd.CONSUMO !== undefined ? baseAd.CONSUMO : (P && P.consumo ? P.consumo : 140));
            let longc = tItem.LONGCUENCA !== undefined ? tItem.LONGCUENCA : (baseAd.LONGCUENCA !== undefined ? baseAd.LONGCUENCA : 50);
            let est = (P && P.estacion) || baseAd.IDESTACION || "BUC";

            if (autoVertsMap[n]) {
                let geom = autoVertsMap[n];
                let polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
                polys.forEach(poly => {
                    poly.forEach(ring => {
                        ring.forEach(pt => {
                            let ptM = projectToMeters(pt[0], pt[1]);
                            vertData.push([vIdx, vIdx, idCuenca, area, tipo, cesc, den, con, longc, est, n, baseAd.Nombre || "C_" + n, ptM[0], ptM[1]]);
                            vIdx++;
                        });
                    });
                });
                coordMap[n] = { x: nx, y: ny }; // fallback para el pozo
            } else {
                vertData.push([vIdx, vIdx, idCuenca, area, tipo, cesc, den, con, longc, est, n, baseAd.Nombre || "C_" + n, nx, ny]);
                coordMap[n] = { x: nx, y: ny };
                vIdx++;
            }
        });
    }
    addSheetData("Vertices", vertH, vertData);

    // 3. Walcan_Pozos_Ordenado - solo pozos que aparecen en dR (seleccionados)
    const nodosPoz = {};
    // Usar T filtrado por los nodos que aparecen en dR
    T.forEach(t => {
        if (t.sep) return;
        if (!selectedNodes.has(t.de) && !selectedNodes.has(t.a)) return;
        if (selectedNodes.has(t.de) && !nodosPoz[t.de]) nodosPoz[t.de] = { id: t.de, tipo: "JUNCTION", z: t.cotaRasante, zfondo: t.cotaFondoDE };
        if (selectedNodes.has(t.a) && !nodosPoz[t.a]) nodosPoz[t.a] = { id: t.a, tipo: "JUNCTION", z: t.cotaRasanteA, zfondo: t.cotaFondoA };
    });
    // Marcar outfalls (nodos que no son DE de ningún tramo en dR)
    const isDe = {};
    dR.forEach(r => { isDe[r.de] = true; });
    Object.keys(nodosPoz).forEach(k => { if (!isDe[k]) nodosPoz[k].tipo = "OUTFALLS"; });

    const pozoNamesMap = {};
    // Usar coordenadas del inpData.pozos si están disponibles
    if (inpData && inpData.pozos) {
        inpData.pozos.forEach(pz => {
            let pid = String(pz.IdNodo || pz.IDNODO || pz.id || pz.Nombre || pz.pozo || pz.nombre || "").trim();
            if (pid && selectedNodes.has(pid)) {
                if (pz.CoordX && pz.CoordY) {
                    coordMap[pid] = { x: pz.CoordX, y: pz.CoordY };
                }
                if (pz.Nombre && pz.Nombre !== pid) {
                    pozoNamesMap[pid] = pz.Nombre;
                }
            }
        });
    }

    if (inpData && inpData.rawPozos) {
        inpData.rawPozos.forEach(pz => {
            let pid = String(pz.IdNodo || pz.IDNODO || pz.id || pz.Nombre || pz.pozo || pz.nombre || "").trim();
            if (pid && selectedNodes.has(pid)) {
                if (pz.Nombre && pz.Nombre !== pid) {
                    pozoNamesMap[pid] = pz.Nombre;
                }
            }
        });
    }

    const pozosH = ["id", "IdNodo", "IDfinal", "Nombre", "CoordX", "CoordY", "Ctapa", "Cfondo", "Profundidad_C", "TipoEstruc"];
    const pozosData = [];
    let pozIdx = 1;
    Object.values(nodosPoz).forEach(n => {
        var cx = coordMap[n.id] ? coordMap[n.id].x : 0;
        var cy = coordMap[n.id] ? coordMap[n.id].y : 0;
        var prof = +((n.z || 0) - (n.zfondo || 0)).toFixed(2);
        let pName = pozoNamesMap[n.id] || n.id;
        pozosData.push([n.id, n.id, n.id, pName, cx, cy, n.z, n.zfondo, prof, n.tipo]);
        pozIdx++;
    });
    addSheetData("Walcan_Pozos_Ordenado", pozosH, pozosData);

    // 4. Walcan_Tramos_Ordenado - usar ID secuencial del programa (r.id)
    const tramosH = ["id", "id_1", "DE", "A", "DE1", "A1", "ESTADO", "PSALIDA", "LONGITUD", "PENDIENTE", "CINI", "CFIN", "diametro", "MATERIAL", "LONGITUD_C", "PENDIENTE_C", "CRas1", "CRas2", "PInicial"];
    const tramosData = [];
    R.forEach((r, i) => {
        if (r.sep) {
            tramosData.push([]);
            return;
        }
        let tItem = T[r.id - 1] || {};
        // Calcular PInicial dinámicamente si no hay ningún tramo que llegue al pozo DE de este tramo
        let isInitial = 1;
        for (let j = 0; j < dR.length; j++) {
            if (dR[j].a === r.de) {
                isInitial = 0;
                break;
            }
        }
        
        let deName = pozoNamesMap[r.de] || r.de;
        let aName = pozoNamesMap[r.a] || r.a;
        let originalId = tItem.idTramo || tItem.IDTRAMO || tItem.id || r.id;
        
        tramosData.push([
            originalId, r.id, r.de, r.a, deName, aName, "ACTIVO", "S",
            r.L, r.S, r.cfDE, r.cfA,
            r.diamOrig || r.nom, r.matOrig || r.mat,
            r.L, r.S, r.crDE, r.crA,
            isInitial
        ]);
    });
    addSheetData("Walcan_Tramos_Ordenado", tramosH, tramosData);

    const fn = (P.proyecto || P.barrio || "Diseno").replace(/\s+/g, "_") + "_LIBRO_GIS.xlsx";
    wb.xlsx.writeBuffer().then(buffer => {
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveFileWithDialog(blob, fn);
    });
}
