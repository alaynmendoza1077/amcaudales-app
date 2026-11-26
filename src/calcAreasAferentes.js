import * as turf from '@turf/turf';
import polygonClipping from 'polygon-clipping';
import proj4 from 'proj4';

// EPSG:3116 (Magna Sirgas Colombia Bogota)
if (!proj4.defs["EPSG:3116"]) {
    proj4.defs("EPSG:3116", "+proj=tmerc +lat_0=4.59620041666667 +lon_0=-74.0775079166667 +k=1 +x_0=1000000 +y_0=1000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
}

// Proj4 converter instances created once
const toEPSG3116 = proj4("EPSG:4326", "EPSG:3116");
const fromEPSG3116 = proj4("EPSG:3116", "EPSG:4326");

// EPSG:9377 (MAGNA-SIRGAS / Origen Nacional)
if (!proj4.defs["EPSG:9377"]) {
    proj4.defs("EPSG:9377", "+proj=tmerc +lat_0=4 +lon_0=-73 +k=0.9992 +x_0=5000000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
}
if (!proj4.defs["EPSG:3857"]) {
    proj4.defs("EPSG:3857", "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs");
}

export function convertPointToMeters(x, y) {
    if (x === null || x === undefined || y === null || y === undefined) return [0, 0];
    let numX = parseFloat(x);
    let numY = parseFloat(y);
    if (isNaN(numX) || isNaN(numY)) return [0, 0];

    // Caso 1: Grados decimales WGS84 (SIEMPRE evaluar primero para no confundir con EPSG:9377/3857)
    if (Math.abs(numX) <= 180 && Math.abs(numY) <= 180) {
        if (numX > -15 && numX < 20 && numY < -50 && numY >= -90) {
            let tmp = numX; numX = numY; numY = tmp;
        }
        try {
            return toEPSG3116.forward([numX, numY]);
        } catch(e) {
            return [numX, numY];
        }
    }

    const globalEpsg = (typeof window !== 'undefined' && window.currentGlobalEpsg) ? window.currentGlobalEpsg : null;

    // Caso 2: Coordenadas métricas en EPSG:9377 (Origen Nacional, X > 2M)
    if (numX > 3000000 || numY > 3000000 || (numX > 2000000 && globalEpsg === "EPSG:9377")) {
        try {
            return proj4("EPSG:9377", "EPSG:3116").forward([numX, numY]);
        } catch(e) {
            return [numX, numY];
        }
    }

    // Caso 3: Coordenadas Web Mercator EPSG:3857 (X negativo en millones para América)
    if (numX < -1000000 || (Math.abs(numX) > 100000 && globalEpsg === "EPSG:3857")) {
        try {
            return proj4("EPSG:3857", "EPSG:3116").forward([numX, numY]);
        } catch(e) {
            return [numX, numY];
        }
    }

    // Caso 4: Ya en coordenadas métricas EPSG:3116 (X ~ 1,000,000)
    return [numX, numY];
}

const projectToMeters = (lng, lat) => convertPointToMeters(lng, lat);
const projectToLatLng = (x, y) => fromEPSG3116.forward([x, y]);

// ==================== CONSTANTS (match main.py exactly) ====================
const RADIO_EXPLORACION_M = 150.0;
const MARGEN_PRED         = 1.05;
const RADIO_MIN_M         = 10.0;
const RADIO_MAX_M         = 200.0;
const SNAP_TOL_M          = 10.0;
const RADIO_VIA_EJE_M     = 12.0;
const ANGULO_COLECTOR_MAX = 30.0;
const LON_CORTA_M         = 30.0;
const LON_LARGA_M         = 80.0;
const FRAC_MAX            = 0.25;
const MIN_ZONA_PLANA_M    = 5.0;
const AREA_MIN_M2         = 20;

// ==================== GEOMETRY HELPERS ====================

function shoelaceArea(ring_m) {
    if (!ring_m || ring_m.length < 3) return 0;
    let area = 0;
    let n = ring_m.length;
    for (let i = 0; i < n; i++) {
        let j = (i + 1) % n;
        area += ring_m[i][0] * ring_m[j][1] - ring_m[j][0] * ring_m[i][1];
    }
    return Math.abs(area) / 2.0;
}

function distancePointToSegment(px, py, x1, y1, x2, y2) {
    let dx = x2 - x1, dy = y2 - y1;
    let l2 = dx * dx + dy * dy;
    if (l2 === 0) {
        let dx1 = px - x1, dy1 = py - y1;
        return Math.sqrt(dx1 * dx1 + dy1 * dy1);
    }
    let t = ((px - x1) * dx + (py - y1) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    let dx2 = px - (x1 + t * dx);
    let dy2 = py - (y1 + t * dy);
    return Math.sqrt(dx2 * dx2 + dy2 * dy2);
}

function bboxesOverlap(b1, b2) {
    return !(b1[2] < b2[0] || b1[0] > b2[2] || b1[3] < b2[1] || b1[1] > b2[3]);
}

// ==================== PLANAR POLYGON BOOLEAN & TOPOLOGY HELPERS (METERS) ====================

function getCoordsMeters(polyCoords) {
    if (!polyCoords || polyCoords.length === 0) return [];
    if (Array.isArray(polyCoords[0]) && Array.isArray(polyCoords[0][0]) && Array.isArray(polyCoords[0][0][0])) {
        return polyCoords;
    } else {
        return [polyCoords];
    }
}

function pointInRingMeters(pt, ring) {
    if (!pt || !ring || ring.length < 3) return false;
    let x = pt[0], y = pt[1];
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        let xi = ring[i][0], yi = ring[i][1];
        let xj = ring[j][0], yj = ring[j][1];
        let intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-12) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function pointInPolysMeters(pt_m, coords_m) {
    if (!pt_m || !coords_m) return false;
    const polys = getCoordsMeters(coords_m);
    for (let poly of polys) {
        if (!poly || !poly[0] || poly[0].length < 3) continue;
        if (pointInRingMeters(pt_m, poly[0])) {
            let inHole = false;
            for (let h = 1; h < poly.length; h++) {
                if (pointInRingMeters(pt_m, poly[h])) {
                    inHole = true;
                    break;
                }
            }
            if (!inHole) return true;
        }
    }
    return false;
}

function polygonContainsPolygonMeters(outerCoords, innerCoords) {
    const innerPolys = getCoordsMeters(innerCoords);
    if (!outerCoords || innerPolys.length === 0) return false;
    for (let poly of innerPolys) {
        if (!poly || !poly[0]) continue;
        for (let pt of poly[0]) {
            if (!pointInPolysMeters(pt, outerCoords)) return false;
        }
    }
    return true;
}

function metersCoordsToWgsFeature(coords_m, props = {}) {
    if (!coords_m) return null;
    let polys = getCoordsMeters(coords_m);
    let cleanPolys = [];
    for (let poly of polys) {
        if (!Array.isArray(poly) || poly.length === 0) continue;
        let cleanRings = [];
        for (let ring of poly) {
            if (!Array.isArray(ring) || ring.length < 3) continue;
            let wgsRing = [];
            for (let pt of ring) {
                if (!pt || pt.length < 2) continue;
                let wgs = projectToLatLng(pt[0], pt[1]);
                if (wgs && isFinite(wgs[0]) && isFinite(wgs[1])) wgsRing.push([wgs[0], wgs[1]]);
            }
            if (wgsRing.length < 3) continue;
            let first = wgsRing[0], last = wgsRing[wgsRing.length - 1];
            if (first[0] !== last[0] || first[1] !== last[1]) wgsRing.push([first[0], first[1]]);
            if (wgsRing.length >= 4) cleanRings.push(wgsRing);
        }
        if (cleanRings.length > 0) cleanPolys.push(cleanRings);
    }
    if (cleanPolys.length === 0) return null;
    return {
        type: "Feature",
        properties: props,
        geometry: cleanPolys.length === 1 ? { type: "Polygon", coordinates: cleanPolys[0] } : { type: "MultiPolygon", coordinates: cleanPolys }
    };
}

function metersCoordsToWgsGeoJSON(coords_m) {
    const feat = metersCoordsToWgsFeature(coords_m, {});
    return feat ? feat.geometry : null;
}

// Equivalent to Python's Shapely representative_point() — guarantees point inside polygon
function representativePointMeters(coords_m) {
    let polys = getCoordsMeters(coords_m);
    let ring = polys[0] && polys[0][0] ? polys[0][0] : null;
    if (!ring || ring.length < 3) return null;

    let cx = 0, cy = 0, minY = Infinity, maxY = -Infinity;
    const len = (ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]) ? ring.length - 1 : ring.length;
    if (len < 3) return null;
    for (let i = 0; i < len; i++) {
        let pt = ring[i];
        cx += pt[0];
        cy += pt[1];
        if (pt[1] < minY) minY = pt[1];
        if (pt[1] > maxY) maxY = pt[1];
    }
    let centroid = [cx / len, cy / len];
    if (pointInPolysMeters(centroid, coords_m)) return centroid;

    let midY = (minY + maxY) * 0.5;
    let xs = [];
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        let x1 = ring[j][0], y1 = ring[j][1];
        let x2 = ring[i][0], y2 = ring[i][1];
        if ((y1 <= midY && y2 > midY) || (y2 <= midY && y1 > midY)) {
            let xInt = x1 + ((midY - y1) * (x2 - x1)) / (y2 - y1);
            xs.push(xInt);
        }
    }
    xs.sort((a, b) => a - b);
    let bestPt = null, bestSpan = -1;
    for (let k = 0; k + 1 < xs.length; k += 2) {
        let span = xs[k + 1] - xs[k];
        let cand = [(xs[k] + xs[k + 1]) * 0.5, midY];
        if (span > bestSpan && pointInPolysMeters(cand, coords_m)) {
            bestSpan = span;
            bestPt = cand;
        }
    }
    return bestPt || centroid;
}

function fastUnionMeters(featuresCoordsArray) {
    if (!featuresCoordsArray || featuresCoordsArray.length === 0) return null;
    if (featuresCoordsArray.length === 1) return getCoordsMeters(featuresCoordsArray[0]);
    try {
        let validPolys = featuresCoordsArray.map(c => getCoordsMeters(c)).filter(p => p && p.length > 0);
        if (validPolys.length === 0) return null;
        if (validPolys.length === 1) return validPolys[0];
        if (polygonClipping && typeof polygonClipping.union === 'function') {
            let res = polygonClipping.union(...validPolys);
            if (res && res.length > 0) return res;
        }
    } catch (ePc) {}
    return getCoordsMeters(featuresCoordsArray[0]);
}

function fastDifferenceMeters(subjectCoords, clipCoords) {
    if (!subjectCoords) return null;
    if (!clipCoords) return getCoordsMeters(subjectCoords);
    try {
        let sP = getCoordsMeters(subjectCoords);
        let cP = getCoordsMeters(clipCoords);
        if (sP.length > 0 && cP.length > 0 && polygonClipping && typeof polygonClipping.difference === 'function') {
            let res = polygonClipping.difference(sP, cP);
            return (res && res.length > 0) ? res : null;
        }
    } catch (ePc) {}
    return getCoordsMeters(subjectCoords);
}

function fastIntersectionMeters(subjectCoords, clipCoords) {
    if (!subjectCoords || !clipCoords) return null;
    try {
        let sP = getCoordsMeters(subjectCoords);
        let cP = getCoordsMeters(clipCoords);
        if (sP.length > 0 && cP.length > 0 && polygonClipping && typeof polygonClipping.intersection === 'function') {
            let res = polygonClipping.intersection(sP, cP);
            return (res && res.length > 0) ? res : null;
        }
    } catch (ePc) {}
    return null;
}

function calcularAreaMeters(coords) {
    let polys = getCoordsMeters(coords);
    if (!polys || polys.length === 0) return 0;
    let totalArea = 0;
    for (let poly of polys) {
        if (!poly || poly.length === 0) continue;
        let extArea = shoelaceArea(poly[0]);
        let intArea = 0;
        for (let i = 1; i < poly.length; i++) {
            intArea += shoelaceArea(poly[i]);
        }
        totalArea += (extArea - intArea);
    }
    return totalArea;
}

function computeBboxMeters(coords) {
    let polys = getCoordsMeters(coords);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let poly of polys) {
        if (!poly[0]) continue;
        for (let pt of poly[0]) {
            if (pt[0] < minX) minX = pt[0];
            if (pt[1] < minY) minY = pt[1];
            if (pt[0] > maxX) maxX = pt[0];
            if (pt[1] > maxY) maxY = pt[1];
        }
    }
    return [minX, minY, maxX, maxY];
}

// ==================== CIERRE MORFOLÓGICO & SIMPLIFICACIÓN PLANAR ====================

function simplifyRingMeters(ring, tol = 0.25) {
    if (!Array.isArray(ring) || ring.length <= 5) return ring;
    let open = ring.slice();
    if (open[0][0] === open[open.length - 1][0] && open[0][1] === open[open.length - 1][1]) {
        open.pop();
    }
    if (open.length <= 4) return ring;

    let cleaned = [open[0]];
    for (let i = 1; i < open.length; i++) {
        let prev = cleaned[cleaned.length - 1];
        let curr = open[i];
        if (Math.hypot(curr[0] - prev[0], curr[1] - prev[1]) >= tol) {
            cleaned.push(curr);
        }
    }
    if (cleaned.length < 3) return ring;
    cleaned.push([cleaned[0][0], cleaned[0][1]]);
    return cleaned;
}

function cierreMorfologicoMeters(coords_m) {
    if (!coords_m) return null;
    try {
        let polys = getCoordsMeters(coords_m);
        let exteriorOnly = [];
        for (let poly of polys) {
            if (!poly || !poly[0] || poly[0].length < 4) continue;
            let simp = simplifyRingMeters(poly[0], 0.25);
            if (shoelaceArea(simp) >= 1.0) {
                exteriorOnly.push([simp]);
            }
        }
        return exteriorOnly.length > 0 ? exteriorOnly : polys;
    } catch (e) {
        return coords_m;
    }
}

// ==================== CORE LOGIC (match main.py) ====================

function esExtensionColector(r0_m, r1_m, p0_m, p1_m) {
    const endpoints_t = [
        { p: p0_m, dir: [p1_m[0] - p0_m[0], p1_m[1] - p0_m[1]] },
        { p: p1_m, dir: [p0_m[0] - p1_m[0], p0_m[1] - p1_m[1]] }
    ];
    const endpoints_r = [
        { p: r0_m, dir: [r1_m[0] - r0_m[0], r1_m[1] - r0_m[1]] },
        { p: r1_m, dir: [r0_m[0] - r1_m[0], r0_m[1] - r1_m[1]] }
    ];
    for (let ep_t of endpoints_t) {
        for (let ep_r of endpoints_r) {
            let dist = Math.hypot(ep_t.p[0] - ep_r.p[0], ep_t.p[1] - ep_r.p[1]);
            if (dist < SNAP_TOL_M) {
                let dx1 = ep_t.dir[0], dy1 = ep_t.dir[1];
                let dx2 = ep_r.dir[0], dy2 = ep_r.dir[1];
                let m1 = Math.hypot(dx1, dy1), m2 = Math.hypot(dx2, dy2);
                if (m1 > 0 && m2 > 0) {
                    let cos_theta = (dx1 * dx2 + dy1 * dy2) / (m1 * m2);
                    let angle = Math.abs(Math.acos(Math.max(-1, Math.min(1, cos_theta))) * 180 / Math.PI);
                    let abs_angle = angle > 90 ? 180 - angle : angle;
                    if (abs_angle < ANGULO_COLECTOR_MAX) return true;
                }
            }
        }
    }
    return false;
}

function fracZonaPlana(lon) {
    let frac;
    if (lon <= LON_CORTA_M) frac = 0.0;
    else if (lon >= LON_LARGA_M) frac = FRAC_MAX;
    else frac = FRAC_MAX * (lon - LON_CORTA_M) / (LON_LARGA_M - LON_CORTA_M);
    
    let zona_plana_m = lon * (1 - 2 * frac);
    if (zona_plana_m < MIN_ZONA_PLANA_M && lon > MIN_ZONA_PLANA_M * 2) {
        frac = (lon - MIN_ZONA_PLANA_M) / (2 * lon);
    }
    return frac;
}

function formaPuntaCierreMeters(p0_m, p1_m, dx, dy, lon_m, radio_m) {
    let px = -dy, py = dx;
    let frac = fracZonaPlana(lon_m);
    let t1 = lon_m * frac;
    let t2 = lon_m * (1.0 - frac);
    let w_punta = 6.0;
    
    let verts;
    if (frac === 0.0) {
        let midX = p0_m[0] + dx * lon_m * 0.5;
        let midY = p0_m[1] + dy * lon_m * 0.5;
        verts = [
            [p0_m[0] + px * w_punta, p0_m[1] + py * w_punta], [midX + px * radio_m, midY + py * radio_m],
            [p1_m[0] + px * w_punta, p1_m[1] + py * w_punta], [p1_m[0] - px * w_punta, p1_m[1] - py * w_punta],
            [midX - px * radio_m, midY - py * radio_m], [p0_m[0] - px * w_punta, p0_m[1] - py * w_punta],
            [p0_m[0] + px * w_punta, p0_m[1] + py * w_punta]
        ];
    } else {
        let m1X = p0_m[0] + dx * t1, m1Y = p0_m[1] + dy * t1;
        let m2X = p0_m[0] + dx * t2, m2Y = p0_m[1] + dy * t2;
        verts = [
            [p0_m[0] + px * w_punta, p0_m[1] + py * w_punta], [m1X + px * radio_m, m1Y + py * radio_m], [m2X + px * radio_m, m2Y + py * radio_m],
            [p1_m[0] + px * w_punta, p1_m[1] + py * w_punta], [p1_m[0] - px * w_punta, p1_m[1] - py * w_punta],
            [m2X - px * radio_m, m2Y - py * radio_m], [m1X - px * radio_m, m1Y - py * radio_m], [p0_m[0] - px * w_punta, p0_m[1] - py * w_punta],
            [p0_m[0] + px * w_punta, p0_m[1] + py * w_punta]
        ];
    }
    return [verts];
}

function resolverPuntoCierre(p_m, pozosCacheMeters) {
    let minDist = Infinity;
    let pozoCercano = null;
    for (let pz of pozosCacheMeters) {
        let dist = Math.hypot(p_m[0] - pz[0], p_m[1] - pz[1]);
        if (dist < minDist) {
            minDist = dist;
            pozoCercano = pz;
        }
    }
    if (minDist <= SNAP_TOL_M && pozoCercano) return pozoCercano;
    return p_m;
}

function calcularRadioPorPredios(p0_m, p1_m, dx, dy, lon_tramo, redes_barrera, candidates, radioDefault) {
    let px = -dy, py = dx;
    let dists_eje = [];
    let minx_e = Math.min(p0_m[0], p1_m[0]) - RADIO_EXPLORACION_M;
    let maxx_e = Math.max(p0_m[0], p1_m[0]) + RADIO_EXPLORACION_M;
    let miny_e = Math.min(p0_m[1], p1_m[1]) - RADIO_EXPLORACION_M;
    let maxy_e = Math.max(p0_m[1], p1_m[1]) + RADIO_EXPLORACION_M;

    for (let p of candidates) {
        if (p.bbox_m[2] < minx_e || p.bbox_m[0] > maxx_e || p.bbox_m[3] < miny_e || p.bbox_m[1] > maxy_e) continue;
        
        let ctr_m = p.ctr_m;
        let dist_to_tramo = distancePointToSegment(ctr_m[0], ctr_m[1], p0_m[0], p0_m[1], p1_m[0], p1_m[1]);
        
        let t = (ctr_m[0] - p0_m[0]) * dx + (ctr_m[1] - p0_m[1]) * dy;
        if (t < 0 || t > lon_tramo) continue;
        
        let d_walcan = dist_to_tramo;
        let d_red = Infinity;
        
        for (let r of redes_barrera) {
            let dx_bbox = ctr_m[0] < r.minX ? r.minX - ctr_m[0] : (ctr_m[0] > r.maxX ? ctr_m[0] - r.maxX : 0);
            let dy_bbox = ctr_m[1] < r.minY ? r.minY - ctr_m[1] : (ctr_m[1] > r.maxY ? ctr_m[1] - r.maxY : 0);
            let d_bbox_sq = dx_bbox * dx_bbox + dy_bbox * dy_bbox;
            if (d_bbox_sq >= d_red * d_red) continue;
            let d = distancePointToSegment(ctr_m[0], ctr_m[1], r.r0_m[0], r.r0_m[1], r.r1_m[0], r.r1_m[1]);
            if (d < d_red) d_red = d;
        }
        
        if (d_walcan <= d_red) {
            let max_d = 0;
            let outerRing = p.geomType === 'Polygon' ? p.coords_m[0] : p.coords_m[0][0];
            for (let v_m of outerRing) {
                let d = Math.abs((v_m[0] - p0_m[0]) * px + (v_m[1] - p0_m[1]) * py);
                if (d > max_d) max_d = d;
            }
            if (max_d > 0) dists_eje.push(max_d);
        }
    }
    
    if (dists_eje.length === 0) return radioDefault;
    let maxDist = 0;
    for (let d of dists_eje) {
        if (d > maxDist) maxDist = d;
    }
    let rad = maxDist * MARGEN_PRED;
    if (rad < RADIO_MIN_M) rad = RADIO_MIN_M;
    if (rad > RADIO_MAX_M) rad = RADIO_MAX_M;
    return rad;
}

// Spatial grid indexing definitions
const GRID_SIZE = 150.0;
function getGridCells(minX, minY, maxX, maxY) {
    let cells = [];
    let startX = Math.floor(minX / GRID_SIZE);
    let startY = Math.floor(minY / GRID_SIZE);
    let endX = Math.floor(maxX / GRID_SIZE);
    let endY = Math.floor(maxY / GRID_SIZE);
    if ((endX - startX + 1) * (endY - startY + 1) > 1000) return [];
    for (let x = startX; x <= endX; x++) {
        for (let y = startY; y <= endY; y++) {
            cells.push(`${x}_${y}`);
        }
    }
    return cells;
}

// ==================== MAIN EXPORT ====================

export async function calcularAreas(tramosACalcular, todosLosTramos, cartografia, pozosData, onProgress, radioDefault = 40.0) {
    const resultados = [];
    let areasAsignadasGlobal = [];
    let tramosPrevCache = [];

    const pozosLatLngMap = {};
    (pozosData || []).forEach(pz => {
        if (!pz) return;
        let rx = pz.CoordX !== undefined ? pz.CoordX : (pz.X !== undefined ? pz.X : (pz.x !== undefined ? pz.x : pz.lng));
        let ry = pz.CoordY !== undefined ? pz.CoordY : (pz.Y !== undefined ? pz.Y : (pz.y !== undefined ? pz.y : pz.lat));
        let x = parseFloat(rx), y = parseFloat(ry);
        if (!isFinite(x) || !isFinite(y) || (x === 0 && y === 0)) return;
        let pm = convertPointToMeters(x, y);
        let wgs = projectToLatLng(pm[0], pm[1]);
        if (wgs && isFinite(wgs[0]) && isFinite(wgs[1])) {
            [pz.IdNodo, pz.IDNODO, pz.Nombre, pz.IDfinal, pz.id].forEach(k => {
                if (k !== undefined && k !== null && String(k).trim() !== "") {
                    pozosLatLngMap[String(k).trim().toLowerCase()] = [wgs[1], wgs[0]];
                }
            });
        }
    });

    const ensureTramoCoords = (tr) => {
        if (!tr || tr.sep) return tr;
        if (Array.isArray(tr.coords) && tr.coords.length >= 2) return tr;
        let pDe = pozosLatLngMap[String(tr.de || tr.DE1 || tr.DE || "").trim().toLowerCase()];
        let pA = pozosLatLngMap[String(tr.a || tr.A1 || tr.A || "").trim().toLowerCase()];
        if (pDe && pA) return { ...tr, coords: [pDe, pA] };
        return tr;
    };

    tramosACalcular = (tramosACalcular || []).map(ensureTramoCoords);
    todosLosTramos = (todosLosTramos || []).map(ensureTramoCoords);

    let zonaBboxWGS = [Infinity, Infinity, -Infinity, -Infinity];
    for (let tramo of tramosACalcular) {
        if (!tramo || !tramo.coords || tramo.coords.length < 2) continue;
        let c0 = Array.isArray(tramo.coords[0]) ? tramo.coords[0] : [tramo.coords[0].lat, tramo.coords[0].lng];
        let c1 = Array.isArray(tramo.coords[tramo.coords.length - 1]) ? tramo.coords[tramo.coords.length - 1] : [tramo.coords[tramo.coords.length - 1].lat, tramo.coords[tramo.coords.length - 1].lng];
        let lng0 = c0.lat !== undefined ? c0.lng : c0[1];
        let lat0 = c0.lat !== undefined ? c0.lat : c0[0];
        let lng1 = c1.lat !== undefined ? c1.lng : c1[1];
        let lat1 = c1.lat !== undefined ? c1.lat : c1[0];
        if (lng0 < zonaBboxWGS[0]) zonaBboxWGS[0] = lng0;
        if (lat0 < zonaBboxWGS[1]) zonaBboxWGS[1] = lat0;
        if (lng0 > zonaBboxWGS[2]) zonaBboxWGS[2] = lng0;
        if (lat0 > zonaBboxWGS[3]) zonaBboxWGS[3] = lat0;
        if (lng1 < zonaBboxWGS[0]) zonaBboxWGS[0] = lng1;
        if (lat1 < zonaBboxWGS[1]) zonaBboxWGS[1] = lat1;
        if (lng1 > zonaBboxWGS[2]) zonaBboxWGS[2] = lng1;
        if (lat1 > zonaBboxWGS[3]) zonaBboxWGS[3] = lat1;
    }

    const MARGEN_GRADOS = 0.005;
    let zonaBboxWGS_exp = [
        zonaBboxWGS[0] - MARGEN_GRADOS, zonaBboxWGS[1] - MARGEN_GRADOS,
        zonaBboxWGS[2] + MARGEN_GRADOS, zonaBboxWGS[3] + MARGEN_GRADOS
    ];
    let corner1_m = projectToMeters(zonaBboxWGS_exp[0], zonaBboxWGS_exp[1]);
    let corner2_m = projectToMeters(zonaBboxWGS_exp[2], zonaBboxWGS_exp[3]);
    let zonaBboxM_exp = [
        Math.min(corner1_m[0], corner2_m[0]) - RADIO_MAX_M,
        Math.min(corner1_m[1], corner2_m[1]) - RADIO_MAX_M,
        Math.max(corner1_m[0], corner2_m[0]) + RADIO_MAX_M,
        Math.max(corner1_m[1], corner2_m[1]) + RADIO_MAX_M
    ];

    // 1. Project predios ONLY within the expanded zone
    let prediosCache = [];
    const grid = {};
    
    if (cartografia && cartografia.length > 0) {
        for (let i = 0; i < cartografia.length; i++) {
            if (i > 0 && i % 2000 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
            let c = cartografia[i];
            try {
                let geom = c.geometry || c;
                if (!geom || !geom.type) continue;
                
                let firstCoord = null;
                if (geom.type === 'Polygon' && geom.coordinates && geom.coordinates.length > 0 && geom.coordinates[0] && geom.coordinates[0][0]) {
                    firstCoord = geom.coordinates[0][0];
                } else if (geom.type === 'MultiPolygon' && geom.coordinates && geom.coordinates.length > 0 && geom.coordinates[0] && geom.coordinates[0][0] && geom.coordinates[0][0][0]) {
                    firstCoord = geom.coordinates[0][0][0];
                }
                if (firstCoord) {
                    let fLng = firstCoord[0], fLat = firstCoord[1];
                    let isMetric = Math.abs(fLng) > 1000;
                    let ptCheck = isMetric ? convertPointToMeters(fLng, fLat) : null;
                    if (isMetric ? (ptCheck[0] < zonaBboxM_exp[0] || ptCheck[0] > zonaBboxM_exp[2] || ptCheck[1] < zonaBboxM_exp[1] || ptCheck[1] > zonaBboxM_exp[3]) : (fLng < zonaBboxWGS_exp[0] || fLng > zonaBboxWGS_exp[2] || fLat < zonaBboxWGS_exp[1] || fLat > zonaBboxWGS_exp[3])) {
                        continue;
                    }
                }
                
                let coords_m = [];
                if (!geom.coordinates || geom.coordinates.length === 0) continue;
                
                if (geom.type === 'Polygon') {
                    coords_m = geom.coordinates.map(ring => ring ? ring.map(pt => pt ? projectToMeters(pt[0], pt[1]) : null).filter(p => p !== null) : []).filter(r => r.length >= 3);
                } else if (geom.type === 'MultiPolygon') {
                    coords_m = geom.coordinates.map(poly => poly ? poly.map(ring => ring ? ring.map(pt => pt ? projectToMeters(pt[0], pt[1]) : null).filter(p => p !== null) : []).filter(r => r.length >= 3) : []).filter(p => p.length > 0);
                } else {
                    continue;
                }

                if (coords_m.length === 0) continue;
                let outerRing = geom.type === 'Polygon' ? coords_m[0] : (coords_m[0] ? coords_m[0][0] : null);
                if (!outerRing || outerRing.length < 3) continue;
                
                let ctr_m_arr = representativePointMeters(coords_m);
                if (!ctr_m_arr) continue;
                let cx = ctr_m_arr[0], cy = ctr_m_arr[1];
                
                if (cx < zonaBboxM_exp[0] || cx > zonaBboxM_exp[2] ||
                    cy < zonaBboxM_exp[1] || cy > zonaBboxM_exp[3]) {
                    continue;
                }
                
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                for (let pt of outerRing) {
                    if (pt[0] < minX) minX = pt[0];
                    if (pt[1] < minY) minY = pt[1];
                    if (pt[0] > maxX) maxX = pt[0];
                    if (pt[1] > maxY) maxY = pt[1];
                }
                
                let areaM2 = calcularAreaMeters(coords_m);
                if (areaM2 < 1.0) continue;
                
                let pObj = {
                    feature: c,
                    geomType: geom.type,
                    coords_m: coords_m,
                    ctr_m: [cx, cy],
                    areaM2: areaM2,
                    bbox_m: [minX, minY, maxX, maxY]
                };
                prediosCache.push(pObj);
                
                let cells = getGridCells(minX, minY, maxX, maxY);
                for (let cell of cells) {
                    if (!grid[cell]) grid[cell] = [];
                    grid[cell].push(pObj);
                }
            } catch(e) { continue; }
        }
    }

    // 2. Project tramos — ONLY within expanded zone
    const tramosCache = (todosLosTramos || []).map(r => {
        if (!r || r.sep || !r.coords || r.coords.length < 2) return null;
        let c0 = Array.isArray(r.coords[0]) ? r.coords[0] : [r.coords[0].lat, r.coords[0].lng];
        let c1 = Array.isArray(r.coords[r.coords.length - 1]) ? r.coords[r.coords.length - 1] : [r.coords[r.coords.length - 1].lat, r.coords[r.coords.length - 1].lng];
        let r0_wgs = c0.lat !== undefined ? [c0.lng, c0.lat] : [c0[1], c0[0]];
        let r1_wgs = c1.lat !== undefined ? [c1.lng, c1.lat] : [c1[1], c1[0]];
        let tMinLng = Math.min(r0_wgs[0], r1_wgs[0]);
        let tMaxLng = Math.max(r0_wgs[0], r1_wgs[0]);
        let tMinLat = Math.min(r0_wgs[1], r1_wgs[1]);
        let tMaxLat = Math.max(r0_wgs[1], r1_wgs[1]);
        if (tMaxLng < zonaBboxWGS_exp[0] || tMinLng > zonaBboxWGS_exp[2] ||
            tMaxLat < zonaBboxWGS_exp[1] || tMinLat > zonaBboxWGS_exp[3]) {
            return null;
        }
        let r0_m = projectToMeters(r0_wgs[0], r0_wgs[1]);
        let r1_m = projectToMeters(r1_wgs[0], r1_wgs[1]);
        let ddx = r1_m[0] - r0_m[0], ddy = r1_m[1] - r0_m[1];
        let lon = Math.hypot(ddx, ddy);
        let prop = r.properties || r;
        let tipoVal = prop.tipo || prop.TIPO || prop.Tipo || '';
        return {
            id: r.id, de: r.de, a: r.a,
            r0_m, r1_m,
            dx: lon > 0 ? ddx / lon : 0,
            dy: lon > 0 ? ddy / lon : 0,
            lon,
            minX: Math.min(r0_m[0], r1_m[0]),
            maxX: Math.max(r0_m[0], r1_m[0]),
            minY: Math.min(r0_m[1], r1_m[1]),
            maxY: Math.max(r0_m[1], r1_m[1]),
            tipo: String(tipoVal).toUpperCase()
        };
    }).filter(t => t !== null);

    // 3. Cache pozos for snapping — AUTO-DETECT COORDINATE SYSTEM
    const pozosCache = (pozosData || []).map(pz => {
        if (!pz) return null;
        let rx = pz.CoordX !== undefined ? pz.CoordX : (pz.X !== undefined ? pz.X : (pz.x !== undefined ? pz.x : pz.lng));
        let ry = pz.CoordY !== undefined ? pz.CoordY : (pz.Y !== undefined ? pz.Y : (pz.y !== undefined ? pz.y : pz.lat));
        let x = parseFloat(rx) || 0;
        let y = parseFloat(ry) || 0;
        if (x === 0 || y === 0) return null;
        return convertPointToMeters(x, y);
    }).filter(p => p !== null);

    // --- PROCESS EACH TRAMO ---
    const totalTramos = tramosACalcular.length;
    for (let index = 0; index < totalTramos; index++) {
        let tramo = tramosACalcular[index];
        
        if (index % 3 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
            if (onProgress) onProgress(index + 1, totalTramos);
        }

        if (!tramo || !tramo.coords || tramo.coords.length < 2) {
            resultados.push(tramo ? { ...tramo, areaCalc: 0, areaPredCalc: 0, areaViaCalc: 0, areaPoli: null, tipoArea: String(tramo.tipoArea || "RESIDENCIAL").toUpperCase() } : null);
            continue;
        }

        const hasBaseCarto = Boolean(cartografia && cartografia.length > 0 && prediosCache.length > 0);

        let c0 = Array.isArray(tramo.coords[0]) ? tramo.coords[0] : [tramo.coords[0].lat, tramo.coords[0].lng];
        let c1 = Array.isArray(tramo.coords[tramo.coords.length - 1]) ? tramo.coords[tramo.coords.length - 1] : [tramo.coords[tramo.coords.length - 1].lat, tramo.coords[tramo.coords.length - 1].lng];
        
        let p0 = c0.lat !== undefined ? [c0.lng, c0.lat] : (Math.abs(c0[0]) <= 20 && Math.abs(c0[1]) > 50 ? [c0[1], c0[0]] : [c0[0], c0[1]]);
        let p1 = c1.lat !== undefined ? [c1.lng, c1.lat] : (Math.abs(c1[0]) <= 20 && Math.abs(c1[1]) > 50 ? [c1[1], c1[0]] : [c1[0], c1[1]]);
        
        let p0_m = projectToMeters(p0[0], p0[1]);
        let p1_m = projectToMeters(p1[0], p1[1]);
        let ddx = p1_m[0] - p0_m[0], ddy = p1_m[1] - p0_m[1];
        let lonMeters = Math.hypot(ddx, ddy);
        let dx = lonMeters > 0 ? ddx / lonMeters : 0;
        let dy = lonMeters > 0 ? ddy / lonMeters : 0;

        let p0_cierre = pozosCache.length > 0 ? resolverPuntoCierre(p0_m, pozosCache) : p0_m;
        let p1_cierre = pozosCache.length > 0 ? resolverPuntoCierre(p1_m, pozosCache) : p1_m;
        let ddx_c = p1_cierre[0] - p0_cierre[0], ddy_c = p1_cierre[1] - p0_cierre[1];
        let lonCierre = Math.hypot(ddx_c, ddy_c);
        let dx_c = lonCierre > 0 ? ddx_c / lonCierre : dx;
        let dy_c = lonCierre > 0 ? ddy_c / lonCierre : dy;

        if (lonCierre < 0.5) {
            resultados.push({ ...tramo, areaCalc: 0, areaPredCalc: 0, areaViaCalc: 0, areaPoli: null, tipoArea: String(tramo.tipoArea || "RESIDENCIAL").toUpperCase() });
            continue;
        }

        let minX = Math.min(p0_m[0], p1_m[0]) - RADIO_EXPLORACION_M;
        let maxX = Math.max(p0_m[0], p1_m[0]) + RADIO_EXPLORACION_M;
        let minY = Math.min(p0_m[1], p1_m[1]) - RADIO_EXPLORACION_M;
        let maxY = Math.max(p0_m[1], p1_m[1]) + RADIO_EXPLORACION_M;
        
        let cellCandidates = new Set();
        let tramoGridCells = getGridCells(minX, minY, maxX, maxY);
        for (let cell of tramoGridCells) {
            let list = grid[cell];
            if (list) {
                for (let p of list) cellCandidates.add(p);
            }
        }

        let redes_barrera = [];
        for (let r of tramosCache) {
            if (r.id && tramo.id && r.id === tramo.id) continue;
            if (r.de && tramo.de && r.a && tramo.a && String(r.de).trim() === String(tramo.de).trim() && String(r.a).trim() === String(tramo.a).trim()) continue;
            if (r.tipo === 'VIRTUAL') continue;
            if (r.maxX < minX || r.minX > maxX || r.maxY < minY || r.minY > maxY) continue;
            if (esExtensionColector(r.r0_m, r.r1_m, p0_m, p1_m)) continue;
            redes_barrera.push(r);
        }
        for (let r of tramosPrevCache) {
            if (r.tipo === 'VIRTUAL') continue;
            if (r.maxX < minX || r.minX > maxX || r.maxY < minY || r.minY > maxY) continue;
            redes_barrera.push(r);
        }

        let radioMeters = (hasBaseCarto && cellCandidates.size > 0)
            ? calcularRadioPorPredios(p0_m, p1_m, dx, dy, lonMeters, redes_barrera, cellCandidates, radioDefault)
            : radioDefault;

        // 1. Create capture zone in meters
        let zonaPuntaMeters = formaPuntaCierreMeters(p0_cierre, p1_cierre, dx_c, dy_c, lonCierre, radioMeters);
        let zonaBbox_m = computeBboxMeters(zonaPuntaMeters);
        let zonaBboxNorm = [zonaBbox_m[0] - 100, zonaBbox_m[1] - 100, zonaBbox_m[2] + 100, zonaBbox_m[3] + 100];

        // 2. Cut against previously assigned areas (non-overlapping tributary zones)
        let zonaCapturaMeters = zonaPuntaMeters;
        let obstaculoGlobalUnido = null;
        if (areasAsignadasGlobal.length > 0) {
            let overlapping = [];
            for (let aObj of areasAsignadasGlobal) {
                if (bboxesOverlap(zonaBbox_m, aObj.bbox)) overlapping.push(aObj.coords);
            }
            if (overlapping.length > 0) {
                obstaculoGlobalUnido = fastUnionMeters(overlapping);
                if (obstaculoGlobalUnido) {
                    let diff = fastDifferenceMeters(zonaCapturaMeters, obstaculoGlobalUnido);
                    if (diff) zonaCapturaMeters = diff;
                    else zonaCapturaMeters = null;
                }
            }
        }

        if (!zonaCapturaMeters) {
            resultados.push({ ...tramo, areaCalc: 0, areaPredCalc: 0, areaViaCalc: 0, areaPoli: null, tipoArea: String(tramo.tipoArea || "RESIDENCIAL").toUpperCase() });
            tramosPrevCache.push({
                r0_m: p0_m, r1_m: p1_m,
                minX: Math.min(p0_m[0], p1_m[0]), maxX: Math.max(p0_m[0], p1_m[0]),
                minY: Math.min(p0_m[1], p1_m[1]), maxY: Math.max(p0_m[1], p1_m[1])
            });
            continue;
        }

        let poligonosParaUnirMeters = [];
        let prediosLocalesCrudos = [];

        // 3. Create road corridor polygon in meters
        let pxVia = -dy_c, pyVia = dx_c;
        let wVia = Math.min(RADIO_VIA_EJE_M, radioMeters);
        let franjaVerts = [
            [p0_cierre[0] + pxVia * wVia, p0_cierre[1] + pyVia * wVia],
            [p0_cierre[0] - pxVia * wVia, p0_cierre[1] - pyVia * wVia],
            [p1_cierre[0] - pxVia * wVia, p1_cierre[1] - pyVia * wVia],
            [p1_cierre[0] + pxVia * wVia, p1_cierre[1] + pyVia * wVia],
            [p0_cierre[0] + pxVia * wVia, p0_cierre[1] + pyVia * wVia]
        ];
        poligonosParaUnirMeters.push([franjaVerts]);

        // 4. Extract parcels from candidates when base cartography is loaded
        if (prediosCache.length > 0) {
            for (let p of cellCandidates) {
                if (!bboxesOverlap(p.bbox_m, zonaBboxNorm)) continue;
                prediosLocalesCrudos.push(p.coords_m);
                
                let ctr_m = p.ctr_m;
                if (!zonaPuntaMeters || !pointInPolysMeters(ctr_m, zonaPuntaMeters)) continue;

                let t = (ctr_m[0] - p0_cierre[0]) * dx_c + (ctr_m[1] - p0_cierre[1]) * dy_c;
                if (t < 0 || t > lonCierre) continue;

                let d_walcan = distancePointToSegment(ctr_m[0], ctr_m[1], p0_m[0], p0_m[1], p1_m[0], p1_m[1]);
                let d_red_min = Infinity;
                for (let r of redes_barrera) {
                    let d = distancePointToSegment(ctr_m[0], ctr_m[1], r.r0_m[0], r.r0_m[1], r.r1_m[0], r.r1_m[1]);
                    if (d < d_red_min) d_red_min = d;
                }

                if (d_red_min < d_walcan) continue;

                let p_coords = p.coords_m;
                if (zonaCapturaMeters && (polygonContainsPolygonMeters(zonaCapturaMeters, p_coords) || pointInPolysMeters(ctr_m, zonaCapturaMeters))) {
                    // Keep whole parcel
                } else if (zonaCapturaMeters) {
                    let clipped = fastIntersectionMeters(p_coords, zonaCapturaMeters);
                    if (!clipped) continue;
                    p_coords = clipped;
                }

                let area_m2 = calcularAreaMeters(p_coords);
                if (area_m2 < AREA_MIN_M2) continue;

                poligonosParaUnirMeters.push(p_coords);
            }
        }

        // Si no se capturaron predios (Reto Voronoi / Buffer sin cartografía), usar la zona de captura entera
        if (prediosLocalesCrudos.length === 0 && (!hasBaseCarto || poligonosParaUnirMeters.length <= 1) && zonaCapturaMeters) {
            poligonosParaUnirMeters.push(zonaCapturaMeters);
        }

        let areaFinalShapeMeters = fastUnionMeters(poligonosParaUnirMeters) || zonaCapturaMeters;

        if (areaFinalShapeMeters) {
            let closedM = cierreMorfologicoMeters(areaFinalShapeMeters);
            if (closedM && calcularAreaMeters(closedM) > 1.0) areaFinalShapeMeters = closedM;
        }

        if (areaFinalShapeMeters && obstaculoGlobalUnido) {
            let diffFinal = fastDifferenceMeters(areaFinalShapeMeters, obstaculoGlobalUnido);
            if (diffFinal && calcularAreaMeters(diffFinal) > 1.0) areaFinalShapeMeters = diffFinal;
        }

        if (areaFinalShapeMeters) {
            let simpCoords = cierreMorfologicoMeters(areaFinalShapeMeters);
            if (simpCoords && calcularAreaMeters(simpCoords) > 1.0) areaFinalShapeMeters = simpCoords;
        }

        let aTotalM2 = 0, aPredM2 = 0, aViaM2 = 0;
        let areaPredPoli = null, areaViaPoli = null;
        if (areaFinalShapeMeters) {
            aTotalM2 = calcularAreaMeters(areaFinalShapeMeters);

            let unionCarto = (hasBaseCarto && prediosLocalesCrudos.length > 0) ? fastUnionMeters(prediosLocalesCrudos) : null;
            if (unionCarto) {
                let gViaCoords = fastDifferenceMeters(areaFinalShapeMeters, unionCarto);
                let gPredCoords = fastIntersectionMeters(areaFinalShapeMeters, unionCarto);
                if (gPredCoords) {
                    aPredM2 = calcularAreaMeters(gPredCoords);
                    areaPredPoli = metersCoordsToWgsGeoJSON(gPredCoords);
                }
                if (gViaCoords) {
                    aViaM2 = calcularAreaMeters(gViaCoords);
                    areaViaPoli = metersCoordsToWgsGeoJSON(gViaCoords);
                }
                if (!aPredM2 && !aViaM2) {
                    aPredM2 = aTotalM2;
                    areaPredPoli = metersCoordsToWgsGeoJSON(areaFinalShapeMeters);
                }
            } else {
                // Sin cartografía catastral: 100% del área va a predial/residencial (CERO vías separadas)
                aPredM2 = aTotalM2;
                aViaM2 = 0;
                areaPredPoli = metersCoordsToWgsGeoJSON(areaFinalShapeMeters);
                areaViaPoli = null;
            }
        }

        if (areaFinalShapeMeters) {
            let bboxFinal = computeBboxMeters(areaFinalShapeMeters);
            areasAsignadasGlobal.push({
                coords: areaFinalShapeMeters,
                bbox: bboxFinal
            });
        }
        
        tramosPrevCache.push({
            r0_m: p0_m, r1_m: p1_m,
            minX: Math.min(p0_m[0], p1_m[0]), maxX: Math.max(p0_m[0], p1_m[0]),
            minY: Math.min(p0_m[1], p1_m[1]), maxY: Math.max(p0_m[1], p1_m[1])
        });

        let areaFinalShapeWGS84 = null;
        let shapeToConvert = areaFinalShapeMeters || zonaCapturaMeters;
        if (shapeToConvert) {
            areaFinalShapeWGS84 = metersCoordsToWgsFeature(shapeToConvert, {
                de: tramo.de,
                a: tramo.a,
                areaHa: aTotalM2 / 10000
            });
        }

        let areaHa = aTotalM2 / 10000;

        resultados.push({
            ...tramo,
            areaCalc: areaHa,
            areaPredCalc: aPredM2 / 10000,
            areaViaCalc: aViaM2 / 10000,
            areaPoli: areaFinalShapeWGS84,
            areaPredPoli: areaPredPoli,
            areaViaPoli: areaViaPoli,
            tipoArea: String(tramo.tipoArea || "RESIDENCIAL").toUpperCase()
        });
    }

    if (onProgress) onProgress(totalTramos, totalTramos);
    return resultados;
}

export function generarPoligonosVoronoiSync(tramosInput, pozosData = [], radioDefault = 20.0) {
    const features = [];
    const verts = [];
    const ad = [];
    const resultados = [];
    if (!Array.isArray(tramosInput) || tramosInput.length === 0) {
        return { features, verts, ad, resultados };
    }

    const pozosMap = {};
    const pozosCache = [];
    (pozosData || []).forEach(pz => {
        if (!pz) return;
        let rx = pz.CoordX !== undefined ? pz.CoordX : (pz.X !== undefined ? pz.X : (pz.x !== undefined ? pz.x : pz.lng));
        let ry = pz.CoordY !== undefined ? pz.CoordY : (pz.Y !== undefined ? pz.Y : (pz.y !== undefined ? pz.y : pz.lat));
        let x = parseFloat(rx), y = parseFloat(ry);
        if (!isFinite(x) || !isFinite(y) || (x === 0 && y === 0)) return;
        let pm = convertPointToMeters(x, y);
        pozosCache.push(pm);
        [pz.IdNodo, pz.IDNODO, pz.Nombre, pz.IDfinal, pz.id].forEach(k => {
            if (k !== undefined && k !== null && String(k).trim() !== "") {
                pozosMap[String(k).trim().toLowerCase()] = pm;
            }
        });
    });

    const areasAsignadas = [];
    let validIdx = 0;

    for (let i = 0; i < tramosInput.length; i++) {
        const tr = tramosInput[i];
        if (!tr || tr.sep) continue;
        validIdx++;
        const deStr = String(tr.de || tr.DE1 || tr.DE || "").trim();
        const aStr = String(tr.a || tr.A1 || tr.A || "").trim();
        if (!deStr || !aStr) continue;

        let p0_m = null, p1_m = null;
        if (Array.isArray(tr.coords) && tr.coords.length >= 2) {
            let c0 = tr.coords[0];
            let c1 = tr.coords[tr.coords.length - 1];
            let lng0 = c0.lat !== undefined ? c0.lng : (Math.abs(c0[0]) <= 90 && Math.abs(c0[1]) <= 180 && Math.abs(c0[1]) > 50 ? c0[1] : c0[0]);
            let lat0 = c0.lat !== undefined ? c0.lat : (Math.abs(c0[0]) <= 90 && Math.abs(c0[1]) <= 180 && Math.abs(c0[1]) > 50 ? c0[0] : c0[1]);
            let lng1 = c1.lat !== undefined ? c1.lng : (Math.abs(c1[0]) <= 90 && Math.abs(c1[1]) <= 180 && Math.abs(c1[1]) > 50 ? c1[1] : c1[0]);
            let lat1 = c1.lat !== undefined ? c1.lat : (Math.abs(c1[0]) <= 90 && Math.abs(c1[1]) <= 180 && Math.abs(c1[1]) > 50 ? c1[0] : c1[1]);
            p0_m = convertPointToMeters(lng0, lat0);
            p1_m = convertPointToMeters(lng1, lat1);
        } else {
            p0_m = pozosMap[deStr.toLowerCase()] || null;
            p1_m = pozosMap[aStr.toLowerCase()] || null;
        }

        if (!p0_m || !p1_m) continue;
        let p0_c = pozosCache.length > 0 ? resolverPuntoCierre(p0_m, pozosCache) : p0_m;
        let p1_c = pozosCache.length > 0 ? resolverPuntoCierre(p1_m, pozosCache) : p1_m;
        let ddx = p1_c[0] - p0_c[0], ddy = p1_c[1] - p0_c[1];
        let lonCierre = Math.hypot(ddx, ddy);
        if (lonCierre < 0.5) continue;
        let dx_c = ddx / lonCierre, dy_c = ddy / lonCierre;

        const savedHa = parseFloat(tr.areaParcial || tr.areaCalc || tr.aR_p || tr.aR_prop || 0) || 0;
        let rUse = radioDefault || 20.0;
        if (savedHa > 0) {
            let estR = ((savedHa * 10000.0) / lonCierre) - 8.57;
            if (isFinite(estR)) rUse = Math.max(6.0, Math.min(120.0, estR));
        }

        let zonaPuntaM = formaPuntaCierreMeters(p0_c, p1_c, dx_c, dy_c, lonCierre, rUse);
        let zonaBbox = computeBboxMeters(zonaPuntaM);
        let zonaCapturaM = zonaPuntaM;
        let obstUnido = null;

        if (areasAsignadas.length > 0) {
            let ov = [];
            for (let aObj of areasAsignadas) {
                if (bboxesOverlap(zonaBbox, aObj.bbox)) ov.push(aObj.coords);
            }
            if (ov.length > 0) {
                obstUnido = fastUnionMeters(ov);
                if (obstUnido) {
                    let diff = fastDifferenceMeters(zonaCapturaM, obstUnido);
                    if (diff && calcularAreaMeters(diff) > 1.0) zonaCapturaM = diff;
                }
            }
        }

        let pxVia = -dy_c, pyVia = dx_c;
        let wVia = Math.min(RADIO_VIA_EJE_M, rUse);
        let franjaVerts = [
            [p0_c[0] + pxVia * wVia, p0_c[1] + pyVia * wVia],
            [p0_c[0] - pxVia * wVia, p0_c[1] - pyVia * wVia],
            [p1_c[0] - pxVia * wVia, p1_c[1] - pyVia * wVia],
            [p1_c[0] + pxVia * wVia, p1_c[1] + pyVia * wVia],
            [p0_c[0] + pxVia * wVia, p0_c[1] + pyVia * wVia]
        ];
        let shapeM = fastUnionMeters([[franjaVerts], zonaCapturaM]) || zonaCapturaM;
        try {
            let cl = cierreMorfologicoMeters(shapeM);
            if (cl && calcularAreaMeters(cl) > 1.0) shapeM = cl;
        } catch (e) {}
        if (obstUnido) {
            let df = fastDifferenceMeters(shapeM, obstUnido);
            if (df && calcularAreaMeters(df) > 1.0) shapeM = df;
        }

        let calcM2 = calcularAreaMeters(shapeM);
        let finalHa = savedHa > 0 ? savedHa : (calcM2 / 10000.0);
        const subId = "S" + (tr.id && typeof tr.id === "number" ? tr.id : validIdx);
        const tramoKey = deStr + "-" + aStr;
        const tipoCuenca = String(tr.tipoArea || tr.TIPOCUENCA || "RESIDENCIAL").toUpperCase();

        const propsObj = {
            id: tr.id && typeof tr.id === "number" ? tr.id : validIdx,
            de: deStr,
            a: aStr,
            tramoId: tramoKey,
            label: "Tramo " + deStr + " → " + aStr,
            DE: deStr,
            IDNODO: deStr,
            Nombre: deStr,
            SubName: subId,
            areaHa: finalHa,
            areaPredHa: finalHa,
            areaViaHa: 0,
            TIPOCUENCA: tipoCuenca,
            isCompleta: true
        };

        const featWGS = metersCoordsToWgsFeature(shapeM, propsObj);
        if (featWGS) {
            features.push(featWGS);
            areasAsignadas.push({ coords: shapeM, bbox: computeBboxMeters(shapeM) });

            const polysM = getCoordsMeters(shapeM);
            const mainRingM = polysM[0] && polysM[0][0] ? polysM[0][0] : null;
            if (Array.isArray(mainRingM)) {
                mainRingM.forEach(ptM => {
                    verts.push({ IDNODO: deStr, DE: tramoKey, SubName: subId, CoordX: ptM[0], CoordY: ptM[1] });
                });
            }
            ad.push({ IDNODO: deStr, Subcatchment: subId, AREACUENCA: finalHa, TIPOCUENCA: tipoCuenca });
            resultados.push({ de: deStr, a: aStr, areaCalc: finalHa, areaPredCalc: finalHa, areaViaCalc: 0, areaPoli: featWGS, tipoArea: tipoCuenca });
        }
    }

    return { features, verts, ad, resultados };
}
