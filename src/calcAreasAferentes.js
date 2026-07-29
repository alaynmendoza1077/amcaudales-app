import * as turf from '@turf/turf';
import 'jsts/dist/jsts.min.js';
const jsts = window.jsts;
import proj4 from 'proj4';

// EPSG:3116 (Magna Sirgas Colombia Bogota)
if (!proj4.defs["EPSG:3116"]) {
    proj4.defs("EPSG:3116", "+proj=tmerc +lat_0=4.59620041666667 +lon_0=-74.0775079166667 +k=1 +x_0=1000000 +y_0=1000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
}

// Proj4 converter instances created once
const toEPSG3116 = proj4("EPSG:4326", "EPSG:3116");
const fromEPSG3116 = proj4("EPSG:3116", "EPSG:4326");

const projectToMeters = (lng, lat) => toEPSG3116.forward([lng, lat]);
const projectToLatLng = (x, y) => fromEPSG3116.forward([x, y]);

// ==================== CONSTANTS (match main.py exactly) ====================
const RADIO_EXPLORACION_M = 150.0;
const MARGEN_PRED         = 1.05;
const RADIO_MIN_M         = 10.0;
const RADIO_DEFAULT_M     = 40.0;
const RADIO_MAX_M         = 200.0; // Igual que Python (self.RADIO_MAX_M)
const SNAP_TOL_M          = 10.0;
const RADIO_VIA_EJE_M     = 12.0;
const ANGULO_COLECTOR_MAX = 30.0;
const LON_CORTA_M         = 30.0;
const LON_LARGA_M         = 80.0;
const FRAC_MAX            = 0.25;
const MIN_ZONA_PLANA_M    = 5.0;
const AREA_MIN_M2         = 20;
const MAX_ASPECT_RATIO    = 50;
const MAX_COMPACIDAD      = 200;
const ANCHO_VIA_M         = 12;
const BUFFER_CIERRE_M     = 3.0;   // Cierre morfológico
const VIA_MIN_M2          = 10;    // Igual que Python (self.VIA_MIN_M2)

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

function distanceMaxToGeom(x1, y1, x2, y2, coords) {
    let dx = x2 - x1, dy = y2 - y1;
    let lon = Math.hypot(dx, dy);
    if (lon === 0) return 0;
    dx /= lon; dy /= lon;
    let px = -dy, py = dx;

    let max_d = 0;
    function traverse(arr) {
        if (!arr || arr.length === 0) return;
        if (typeof arr[0] === 'number') {
            let p_m = projectToMeters(arr[0], arr[1]);
            let d = Math.abs((p_m[0] - x1) * px + (p_m[1] - y1) * py);
            if (d > max_d) max_d = d;
            return;
        }
        for (let i = 0; i < arr.length; i++) {
            traverse(arr[i]);
        }
    }
    traverse(coords);
    return max_d;
};

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

// ==================== FAST JSTS WRAPPERS (METERS COORDS) ====================

const geojsonReader = new jsts.io.GeoJSONReader();
const geojsonWriter = new jsts.io.GeoJSONWriter();

function getCoordsMeters(polyCoords) {
    if (!polyCoords || polyCoords.length === 0) return [];
    if (Array.isArray(polyCoords[0]) && Array.isArray(polyCoords[0][0]) && Array.isArray(polyCoords[0][0][0])) {
        return polyCoords;
    } else {
        return [polyCoords];
    }
}

function coordsToJsts(coords_m) {
    let polys = getCoordsMeters(coords_m);
    if (!polys || polys.length === 0) return null;
    let geojson;
    if (polys.length === 1) {
        geojson = { type: 'Polygon', coordinates: polys[0] };
    } else {
        geojson = { type: 'MultiPolygon', coordinates: polys };
    }
    try {
        return geojsonReader.read(geojson);
    } catch(e) {
        return null;
    }
}

function jstsToCoords(geom) {
    if (!geom || geom.isEmpty()) return null;
    try {
        let geojson = geojsonWriter.write(geom);
        if (geojson.type === 'Polygon') {
            return [geojson.coordinates];
        } else if (geojson.type === 'MultiPolygon') {
            return geojson.coordinates;
        }
    } catch(e) { }
    return null;
}

function pointInJstsGeom(pt_m, jstsGeom) {
    if (!jstsGeom) return false;
    try {
        let geomFactory = new jsts.geom.GeometryFactory();
        let pt = geomFactory.createPoint(new jsts.geom.Coordinate(pt_m[0], pt_m[1]));
        return jstsGeom.contains(pt);
    } catch(e) { return false; }
}

// Equivalent to Python's Shapely representative_point() — guarantees point inside polygon
function representativePointMeters(coords_m) {
    try {
        let geom = coordsToJsts(coords_m);
        if (!geom || geom.isEmpty()) return null;
        let ip = geom.getInteriorPoint();
        if (ip) return [ip.getX(), ip.getY()];
    } catch(e) { }
    // Fallback: use simple centroid of outer ring
    let polys = getCoordsMeters(coords_m);
    let ring = polys[0] && polys[0][0] ? polys[0][0] : null;
    if (!ring || ring.length < 3) return null;
    let cx = 0, cy = 0;
    for (let pt of ring) { cx += pt[0]; cy += pt[1]; }
    return [cx / ring.length, cy / ring.length];
}

function fastUnionMeters(featuresCoordsArray) {
    if (!featuresCoordsArray || featuresCoordsArray.length === 0) return null;
    if (featuresCoordsArray.length === 1) return featuresCoordsArray[0];
    try {
        let geoms = [];
        for (let coords of featuresCoordsArray) {
            let g = coordsToJsts(coords);
            if (g && !g.isEmpty()) geoms.push(g);
        }
        if (geoms.length === 0) return null;
        let geomFactory = new jsts.geom.GeometryFactory();
        let geomCollection = geomFactory.createGeometryCollection(geoms);
        let result = geomCollection.union();
        return jstsToCoords(result);
    } catch (e) {
        return null;
    }
}

function fastDifferenceMeters(subjectCoords, clipCoords) {
    try {
        let subj = coordsToJsts(subjectCoords);
        let clip = coordsToJsts(clipCoords);
        if (!subj) return null;
        if (!clip) return subjectCoords;
        let diff = subj.difference(clip);
        return jstsToCoords(diff);
    } catch (e) {
        return subjectCoords;
    }
}

function fastIntersectionMeters(subjectCoords, clipCoords) {
    try {
        let subj = coordsToJsts(subjectCoords);
        let clip = coordsToJsts(clipCoords);
        if (!subj || !clip) return null;
        let inter = subj.intersection(clip);
        return jstsToCoords(inter);
    } catch (e) {
        return null;
    }
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

// ==================== CIERRE MORFOLÓGICO (port from Python) ====================
// Uses JSTS exact planar buffer

function limpiarJsts(jstsGeom) {
    if (!jstsGeom || jstsGeom.isEmpty()) return null;
    try {
        // En Python: g.simplify(self.SIMPLIFY_TOL, preserve_topology=True) donde TOL=0.25
        let simplifier = new jsts.simplify.TopologyPreservingSimplifier(jstsGeom);
        simplifier.setDistanceTolerance(0.25);
        return simplifier.getResultGeometry();
    } catch(e) {
        return jstsGeom;
    }
}

function extraerExteriorJsts(geom) {
    if (!geom || geom.isEmpty()) return geom;
    let polys = [];
    if (geom.getGeometryType() === 'Polygon') {
        polys.push(geom.getExteriorRing());
    } else if (geom.getGeometryType() === 'MultiPolygon') {
        for (let i = 0; i < geom.getNumGeometries(); i++) {
            polys.push(geom.getGeometryN(i).getExteriorRing());
        }
    }
    if (polys.length === 0) return geom;
    
    let geomFactory = new jsts.geom.GeometryFactory();
    let exteriorGeoms = polys.map(ring => geomFactory.createPolygon(ring));
    if (exteriorGeoms.length === 1) return exteriorGeoms[0];
    return geomFactory.createMultiPolygon(exteriorGeoms);
}

function cierreMorfologicoMeters(coords_m) {
    let geom = coordsToJsts(coords_m);
    if (!geom) return null;
    
    try {
        let bp = new jsts.operation.buffer.BufferParameters();
        bp.setJoinStyle(jsts.operation.buffer.BufferParameters.JOIN_MITRE);
        bp.setEndCapStyle(jsts.operation.buffer.BufferParameters.CAP_FLAT);
        bp.setMitreLimit(10.0);
        
        // 1. Buffer out 3m
        let expanded = jsts.operation.buffer.BufferOp.bufferOp(geom, BUFFER_CIERRE_M, bp);
        // 2. Buffer in 3m
        let closed = jsts.operation.buffer.BufferOp.bufferOp(expanded, -BUFFER_CIERRE_M, bp);
        // 3. Remove holes
        let noHoles = extraerExteriorJsts(closed);
        // 4. Simplificar (limpiar)
        noHoles = limpiarJsts(noHoles);
        return jstsToCoords(noHoles);
    } catch(e) {
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

// Constantes removidas por duplicidad

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
    let w_punta = 6.0; // Anchura en el pozo
    
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
    // Use module-level constants (matching Python exactly)
    let rad = maxDist * MARGEN_PRED;
    if (rad < RADIO_MIN_M) rad = RADIO_MIN_M;
    if (rad > RADIO_MAX_M) rad = RADIO_MAX_M;
    return rad;
}

function esSpike(bbox_m) {
    let w = bbox_m[2] - bbox_m[0];
    let h = bbox_m[3] - bbox_m[1];
    if (Math.min(w, h) === 0) return true;
    return Math.max(w, h) / Math.min(w, h) > MAX_ASPECT_RATIO;
}

function compacidad(ring_m) {
    let area = shoelaceArea(ring_m);
    if (area === 0) return Infinity;
    // Approximate perimeter
    let perimeter = 0;
    for (let i = 0; i < ring_m.length - 1; i++) {
        perimeter += Math.hypot(ring_m[i+1][0] - ring_m[i][0], ring_m[i+1][1] - ring_m[i][1]);
    }
    return (perimeter * perimeter) / area;
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
    let areasAsignadasGlobal = []; // Array of { coords: coords_m, bbox: bbox_m }
    let tramosPrevCache = []; // Tramos ya procesados como barrera (same as Python tramos_previos_cache)

    console.time('calcAreas_total');
    console.log(`[calcAreas] Iniciando con ${tramosACalcular.length} tramos, ${(cartografia||[]).length} predios`);

    // --- PRE-CÓMPUTO OPTIMIZADO ---
    // 0. First compute bounding box of the tramos to CALCULATE (not all tramos)
    //    so we only project predios and tramos within the relevant zone
    let zonaBboxWGS = [Infinity, Infinity, -Infinity, -Infinity]; // [minLng, minLat, maxLng, maxLat]
    for (let tramo of tramosACalcular) {
        if (!tramo || !tramo.coords || tramo.coords.length < 2) continue;
        let c0 = Array.isArray(tramo.coords[0]) ? tramo.coords[0] : [tramo.coords[0].lat, tramo.coords[0].lng];
        let c1 = Array.isArray(tramo.coords[1]) ? tramo.coords[1] : [tramo.coords[1].lat, tramo.coords[1].lng];
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
    // Expand by ~500m in WGS84 degrees (~0.005 deg ≈ 550m at equator, ~450m at lat 7)
    const MARGEN_GRADOS = 0.005;
    let zonaBboxWGS_exp = [
        zonaBboxWGS[0] - MARGEN_GRADOS, zonaBboxWGS[1] - MARGEN_GRADOS,
        zonaBboxWGS[2] + MARGEN_GRADOS, zonaBboxWGS[3] + MARGEN_GRADOS
    ];
    // Project expanded bbox corners to meters for predios filtering
    let corner1_m = projectToMeters(zonaBboxWGS_exp[0], zonaBboxWGS_exp[1]);
    let corner2_m = projectToMeters(zonaBboxWGS_exp[2], zonaBboxWGS_exp[3]);
    let zonaBboxM_exp = [
        Math.min(corner1_m[0], corner2_m[0]) - RADIO_MAX_M,
        Math.min(corner1_m[1], corner2_m[1]) - RADIO_MAX_M,
        Math.max(corner1_m[0], corner2_m[0]) + RADIO_MAX_M,
        Math.max(corner1_m[1], corner2_m[1]) + RADIO_MAX_M
    ];
    console.log(`[calcAreas] Zona de trabajo: ${(zonaBboxM_exp[2]-zonaBboxM_exp[0]).toFixed(0)}m x ${(zonaBboxM_exp[3]-zonaBboxM_exp[1]).toFixed(0)}m`);

    // 1. Project predios ONLY within the expanded zone
    let prediosCache = [];
    const grid = {};
    
    if (cartografia && cartografia.length > 0) {
        console.time('predios_cache');
        let skipped = 0;
        for (let i = 0; i < cartografia.length; i++) {
            if (i > 0 && i % 2000 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
            let c = cartografia[i];
            try {
                let geom = c.geometry || c;
                if (!geom || !geom.type) continue;
                
                // QUICK FILTER: check if the feature's first coordinate is within our zone
                // before doing expensive projection
                let firstCoord = null;
                if (geom.type === 'Polygon' && geom.coordinates && geom.coordinates.length > 0 && geom.coordinates[0] && geom.coordinates[0][0]) {
                    firstCoord = geom.coordinates[0][0];
                } else if (geom.type === 'MultiPolygon' && geom.coordinates && geom.coordinates.length > 0 && geom.coordinates[0] && geom.coordinates[0][0] && geom.coordinates[0][0][0]) {
                    firstCoord = geom.coordinates[0][0][0];
                }
                if (firstCoord) {
                    let fLng = firstCoord[0], fLat = firstCoord[1];
                    if (fLng < zonaBboxWGS_exp[0] || fLng > zonaBboxWGS_exp[2] ||
                        fLat < zonaBboxWGS_exp[1] || fLat > zonaBboxWGS_exp[3]) {
                        skipped++;
                        continue; // Outside zone — skip entirely
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
                
                // Use representative_point (JSTS InteriorPoint) — matches Python's Shapely representative_point()
                // This guarantees the point is INSIDE the polygon (unlike turf.centroid which can fall outside for concave shapes)
                let ctr_m_arr = representativePointMeters(coords_m);
                if (!ctr_m_arr) continue;
                let cx = ctr_m_arr[0], cy = ctr_m_arr[1];
                
                // SECOND FILTER: check centroid is within expanded meters bbox
                if (cx < zonaBboxM_exp[0] || cx > zonaBboxM_exp[2] ||
                    cy < zonaBboxM_exp[1] || cy > zonaBboxM_exp[3]) {
                    skipped++;
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
                
                // Index to grid
                let cells = getGridCells(minX, minY, maxX, maxY);
                for (let cell of cells) {
                    if (!grid[cell]) grid[cell] = [];
                    grid[cell].push(pObj);
                }
            } catch(e) { continue; }
        }
        console.timeEnd('predios_cache');
        console.log(`[calcAreas] ${prediosCache.length} predios cacheados (${skipped} fuera de zona, omitidos)`);
    }

    // 2. Project tramos — ONLY within expanded zone
    const tramosCache = (todosLosTramos || []).map(r => {
        if (!r || r.sep || !r.coords || r.coords.length < 2) return null;
        let c0 = Array.isArray(r.coords[0]) ? r.coords[0] : [r.coords[0].lat, r.coords[0].lng];
        let c1 = Array.isArray(r.coords[1]) ? r.coords[1] : [r.coords[1].lat, r.coords[1].lng];
        let r0_wgs = c0.lat !== undefined ? [c0.lng, c0.lat] : [c0[1], c0[0]];
        let r1_wgs = c1.lat !== undefined ? [c1.lng, c1.lat] : [c1[1], c1[0]];
        // Quick WGS84 filter: skip tramos far from working zone
        let tMinLng = Math.min(r0_wgs[0], r1_wgs[0]);
        let tMaxLng = Math.max(r0_wgs[0], r1_wgs[0]);
        let tMinLat = Math.min(r0_wgs[1], r1_wgs[1]);
        let tMaxLat = Math.max(r0_wgs[1], r1_wgs[1]);
        if (tMaxLng < zonaBboxWGS_exp[0] || tMinLng > zonaBboxWGS_exp[2] ||
            tMaxLat < zonaBboxWGS_exp[1] || tMinLat > zonaBboxWGS_exp[3]) {
            return null; // Outside zone
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
        if (!pz || pz.y === undefined || pz.x === undefined) return null;
        let x = parseFloat(pz.x) || 0;
        let y = parseFloat(pz.y) || 0;
        if (x === 0 || y === 0) return null;
        
        // Auto-detect: if x > 100000 it's already in EPSG:3116 (metric), 
        // otherwise it's WGS84 (degrees)
        if (Math.abs(x) > 100000) {
            // Already in EPSG:3116 meters — use directly
            return [x, y];
        } else {
            // WGS84 degrees — project to meters
            return projectToMeters(x, y);
        }
    }).filter(p => p !== null);

    console.log(`[calcAreas] ${pozosCache.length} pozos cacheados para snapping`);

    // --- PROCESS EACH TRAMO ---
    const totalTramos = tramosACalcular.length;
    for (let index = 0; index < totalTramos; index++) {
        let tramo = tramosACalcular[index];
        
        // Yield to event loop every 3 tramos to prevent UI freeze
        if (index % 3 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
            if (onProgress) onProgress(index + 1, totalTramos);
        }

        if (!tramo || !tramo.coords || tramo.coords.length < 2) {
            resultados.push(tramo ? { ...tramo, areaCalc: 0, areaPoli: null } : null);
            continue;
        }

        // --- NUEVA LÓGICA: RESPETAR ÁREAS IMPORTADAS ---
        let areaImportada = tramo.aT !== undefined && tramo.aT !== null && tramo.aT !== "" ? tramo.aT :
                            (tramo.area !== undefined && tramo.area !== null && tramo.area !== "" ? tramo.area : null);

        if (areaImportada !== null && parseFloat(areaImportada) > 0) {
            console.log(`[calcAreas] Tramo ${tramo.de}: Omitiendo cálculo espacial. Usando área importada: ${areaImportada} Ha`);
            resultados.push({
                ...tramo,
                areaCalc: parseFloat(areaImportada),
                areaPredCalc: parseFloat(tramo.aR_prop || areaImportada),
                areaViaCalc: parseFloat(tramo.aV_prop || 0),
                areaPoli: tramo.areaPoli || null,
                areaPredPoli: tramo.areaPredPoli || null,
                areaViaPoli: tramo.areaViaPoli || null,
                tipoArea: tramo.tipoArea || 'RESIDENCIAL'
            });
            continue;
        }
        // --- FIN NUEVA LÓGICA ---

        console.time(`tramo_${index}`);

        let c0 = Array.isArray(tramo.coords[0]) ? tramo.coords[0] : [tramo.coords[0].lat, tramo.coords[0].lng];
        let c1 = Array.isArray(tramo.coords[1]) ? tramo.coords[1] : [tramo.coords[1].lat, tramo.coords[1].lng];
        
        // Handle Leaflet vs standard order. If c0[0] is roughly lat (e.g., 7.x), Leaflet usually gives [lat, lng]
        let p0 = c0.lat !== undefined ? [c0.lng, c0.lat] : [c0[1], c0[0]];
        let p1 = c1.lat !== undefined ? [c1.lng, c1.lat] : [c1[1], c1[0]];
        
        let p0_m = projectToMeters(p0[0], p0[1]);
        let p1_m = projectToMeters(p1[0], p1[1]);
        let ddx = p1_m[0] - p0_m[0], ddy = p1_m[1] - p0_m[1];
        let lonMeters = Math.hypot(ddx, ddy);
        let dx = lonMeters > 0 ? ddx / lonMeters : 0;
        let dy = lonMeters > 0 ? ddy / lonMeters : 0;

        // Snapping to pozos
        let p0_cierre = resolverPuntoCierre(p0_m, pozosCache);
        let p1_cierre = resolverPuntoCierre(p1_m, pozosCache);
        let ddx_c = p1_cierre[0] - p0_cierre[0], ddy_c = p1_cierre[1] - p0_cierre[1];
        let lonCierre = Math.hypot(ddx_c, ddy_c);
        let dx_c = lonCierre > 0 ? ddx_c / lonCierre : dx;
        let dy_c = lonCierre > 0 ? ddy_c / lonCierre : dy;

        // If lonCierre is too small, skip
        if (lonCierre < 0.5) {
            resultados.push({ ...tramo, areaCalc: 0, areaPoli: null });
            console.timeEnd(`tramo_${index}`);
            continue;
        }

        // Query spatial grid cell candidates for this tramo
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
        let minx_e = Math.min(p0_m[0], p1_m[0]) - RADIO_EXPLORACION_M;
        let maxx_e = Math.max(p0_m[0], p1_m[0]) + RADIO_EXPLORACION_M;
        let miny_e = Math.min(p0_m[1], p1_m[1]) - RADIO_EXPLORACION_M;
        let maxy_e = Math.max(p0_m[1], p1_m[1]) + RADIO_EXPLORACION_M;
        
        for (let r of tramosCache) {
            if (r.id === tramo.id) continue;
            if (r.tipo === 'VIRTUAL') continue;
            if (r.maxX < minx_e || r.minX > maxx_e || r.maxY < miny_e || r.minY > maxy_e) continue;
            if (esExtensionColector(r.r0_m, r.r1_m, p0_m, p1_m)) continue;
            redes_barrera.push(r);
        }
        for (let r of tramosPrevCache) {
            if (r.tipo === 'VIRTUAL') continue;
            if (r.maxX < minx_e || r.minX > maxx_e || r.maxY < miny_e || r.minY > maxy_e) continue;
            redes_barrera.push(r);
        }

        // Forzado para Reto Voronoi: usar el radio especificado en la UI en lugar de buscar predios adyacentes
        let radioMeters = radioDefault;

        // 1. Create capture zone in meters
        let zonaPuntaMeters = formaPuntaCierreMeters(p0_cierre, p1_cierre, dx_c, dy_c, lonCierre, radioMeters);

        // Compute bbox of zonaPunta in meters for spatial filtering
        let zonaBbox_m = computeBboxMeters(zonaPuntaMeters);
        let zonaBboxNorm = [zonaBbox_m[0] - 100, zonaBbox_m[1] - 100, zonaBbox_m[2] + 100, zonaBbox_m[3] + 100];

        // 2. Cut against previously assigned areas (in meters)
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
                    else { zonaCapturaMeters = null; }
                }
            }
        }

        if (!zonaCapturaMeters) {
            resultados.push({ ...tramo, areaCalc: 0, areaPoli: null });
            // Still add this tramo to previous cache
            tramosPrevCache.push({
                r0_m: p0_m, r1_m: p1_m,
                minX: Math.min(p0_m[0], p1_m[0]), maxX: Math.max(p0_m[0], p1_m[0]),
                minY: Math.min(p0_m[1], p1_m[1]), maxY: Math.max(p0_m[1], p1_m[1])
            });
            console.timeEnd(`tramo_${index}`);
            continue;
        }

        let poligonosParaUnirMeters = [];
        let prediosLocalesCrudos = []; // Match Python: predios_locales_crudos for vía separation

        // 3. Create road polygon in meters
        let pxVia = -dy_c, pyVia = dx_c;
        let franjaVerts = [
            [p0_cierre[0] + pxVia * RADIO_VIA_EJE_M, p0_cierre[1] + pyVia * RADIO_VIA_EJE_M],
            [p0_cierre[0] - pxVia * RADIO_VIA_EJE_M, p0_cierre[1] - pyVia * RADIO_VIA_EJE_M],
            [p1_cierre[0] - pxVia * RADIO_VIA_EJE_M, p1_cierre[1] - pyVia * RADIO_VIA_EJE_M],
            [p1_cierre[0] + pxVia * RADIO_VIA_EJE_M, p1_cierre[1] + pyVia * RADIO_VIA_EJE_M],
            [p0_cierre[0] + pxVia * RADIO_VIA_EJE_M, p0_cierre[1] + pyVia * RADIO_VIA_EJE_M]
        ];
        let franjaViaMeters = [franjaVerts];

        poligonosParaUnirMeters.push(franjaViaMeters);

        let zonaPuntaJsts = coordsToJsts(zonaPuntaMeters);
        let zonaCapturaJsts = zonaCapturaMeters ? coordsToJsts(zonaCapturaMeters) : null;

        // 4. Extract parcels from candidates
        if (prediosCache.length > 0) {
            let minx_e = Math.min(p0_m[0], p1_m[0]) - RADIO_EXPLORACION_M;
            let maxx_e = Math.max(p0_m[0], p1_m[0]) + RADIO_EXPLORACION_M;
            let miny_e = Math.min(p0_m[1], p1_m[1]) - RADIO_EXPLORACION_M;
            let maxy_e = Math.max(p0_m[1], p1_m[1]) + RADIO_EXPLORACION_M;

            for (let p of cellCandidates) {
                if (!bboxesOverlap(p.bbox_m, zonaBboxNorm)) continue;
                
                // Accumulate raw predios for vía separation (matches Python: predios_locales_crudos)
                prediosLocalesCrudos.push(p.coords_m);
                
                let ctr_m = p.ctr_m;
                // FIX: Python checks centroid against zona_punta (original zone, NOT cut by obstacles)
                // Python main.py line 755: if not zona_punta.contains(ctr): continue
                if (!zonaPuntaJsts || !pointInJstsGeom(ctr_m, zonaPuntaJsts)) continue;

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
                let p_jsts = coordsToJsts(p_coords);
                if (!p_jsts) continue;

                // Match Python obtener_predio_sin_fuga(): clip against zona_captura
                if (zonaCapturaJsts && (zonaCapturaJsts.contains(p_jsts) || pointInJstsGeom(ctr_m, zonaCapturaJsts))) {
                    // Parcel fully inside or centroid inside → keep whole parcel
                } else {
                    // Clip parcel against zonaCaptura
                    if (zonaCapturaJsts) {
                        try {
                            let inter = p_jsts.intersection(zonaCapturaJsts);
                            if (!inter || inter.isEmpty()) continue;
                            p_coords = jstsToCoords(inter);
                        } catch(e) {
                            p_coords = jstsToCoords(p_jsts);
                        }
                    }
                }

                let area_m2 = calcularAreaMeters(p_coords);
                if (area_m2 < AREA_MIN_M2) continue;

                poligonosParaUnirMeters.push(p_coords);
            }
        }

        // Si no se capturaron predios (ej. Reto Voronoi sin cartografía), usar la zona de captura entera
        if (prediosLocalesCrudos.length === 0 && zonaCapturaMeters) {
            poligonosParaUnirMeters.push(zonaCapturaMeters);
        }

        let areaFinalShapeMeters = fastUnionMeters(poligonosParaUnirMeters);

        // 5b. Apply morphological closing (buffer +3m, -3m, remove holes)
        if (areaFinalShapeMeters) {
            try {
                areaFinalShapeMeters = cierreMorfologicoMeters(areaFinalShapeMeters);
            } catch(e) {
                console.warn(`[calcAreas] Cierre morfológico failed for tramo ${index}:`, e);
            }
        }

        if (areaFinalShapeMeters && obstaculoGlobalUnido) {
            let diffFinal = fastDifferenceMeters(areaFinalShapeMeters, obstaculoGlobalUnido);
            if (diffFinal) areaFinalShapeMeters = diffFinal;
        }

        // 6. Aplica simplify (limpiar) como Python hace al final
        if (areaFinalShapeMeters) {
            let jstsGeom = coordsToJsts(areaFinalShapeMeters);
            if (jstsGeom) {
                jstsGeom = limpiarJsts(jstsGeom);
                areaFinalShapeMeters = jstsToCoords(jstsGeom);
            }
        }

        let aTotalM2 = 0, aPredM2 = 0, aViaM2 = 0;
        let areaPredPoli = null, areaViaPoli = null;
        if (areaFinalShapeMeters) {
            aTotalM2 = calcularAreaMeters(areaFinalShapeMeters);
            
            // (Removido cacheAssigned)
            
            function jstsToWgsGeoJSON(geom) {
                if (!geom || geom.isEmpty()) return null;
                let writer = new jsts.io.GeoJSONWriter();
                let geojson = writer.write(geom);
                function unproj(coords) {
                    if (!coords) return coords;
                    if (typeof coords[0] === 'number') {
                        let w = projectToLatLng(coords[0], coords[1]);
                        return [w[0], w[1]]; // [lng, lat]
                    }
                    return coords.map(unproj);
                }
                
                if (geojson.type === 'GeometryCollection') {
                    if (geojson.geometries) {
                        geojson.geometries.forEach(g => {
                            if (g.coordinates) g.coordinates = unproj(g.coordinates);
                        });
                    }
                } else if (geojson.coordinates) {
                    geojson.coordinates = unproj(geojson.coordinates);
                }
                return geojson;
            }

            let gPred = null;
            let gVia = null;

            // FIX: Match Python logic — use ALL local raw predios (predios_locales_crudos)
            // for vía separation, not just the ones that passed filters.
            // Python main.py line 799-808:
            //   union_carto = unary_union(predios_locales_crudos)
            //   via_shp = area_total_shp.difference(union_carto)
            //   area_pred_shp = area_total_shp.intersection(union_carto)
            let unionCarto = prediosLocalesCrudos.length > 0 ? fastUnionMeters(prediosLocalesCrudos) : null;
            if (unionCarto) {
                let geomTotal = coordsToJsts(areaFinalShapeMeters);
                let geomCarto = coordsToJsts(unionCarto);
                if (geomTotal && geomCarto) {
                    try {
                        gVia = geomTotal.difference(geomCarto);
                        gPred = geomTotal.intersection(geomCarto);
                    } catch(e) {
                        gPred = geomCarto;
                    }
                }
            } else {
                gVia = coordsToJsts(areaFinalShapeMeters);
            }

            if (gPred && !gPred.isEmpty()) {
                aPredM2 = calcularAreaMeters(jstsToCoords(gPred));
                areaPredPoli = jstsToWgsGeoJSON(gPred);
            }
            if (gVia && !gVia.isEmpty()) {
                aViaM2 = calcularAreaMeters(jstsToCoords(gVia));
                areaViaPoli = jstsToWgsGeoJSON(gVia);
            }
            if (!aPredM2 && !aViaM2) {
                aPredM2 = aTotalM2;
                areaPredPoli = jstsToWgsGeoJSON(coordsToJsts(areaFinalShapeMeters));
            }
        }

        console.timeEnd(`tramo_${index}`);

        if (areaFinalShapeMeters) {
            let bboxFinal = computeBboxMeters(areaFinalShapeMeters);
            areasAsignadasGlobal.push({
                coords: areaFinalShapeMeters,
                bbox: bboxFinal
            });
        }
        
        // Always add to previous tramos cache
        tramosPrevCache.push({
            r0_m: p0_m, r1_m: p1_m,
            minX: Math.min(p0_m[0], p1_m[0]), maxX: Math.max(p0_m[0], p1_m[0]),
            minY: Math.min(p0_m[1], p1_m[1]), maxY: Math.max(p0_m[1], p1_m[1])
        });

        // Unproject final shape to WGS84 for leaflet
        let areaFinalShapeWGS84 = null;
        let shapeToConvert = areaFinalShapeMeters || zonaCapturaMeters;
        if (shapeToConvert) {
            try {
                let polys = getCoordsMeters(shapeToConvert);
                let wgsPolys = polys.map(poly => poly.map(ring => ring.map(pt => {
                    let wgs = projectToLatLng(pt[0], pt[1]);
                    return [wgs[0], wgs[1]];
                })));
                areaFinalShapeWGS84 = wgsPolys.length === 1 ? turf.polygon(wgsPolys[0]) : turf.multiPolygon(wgsPolys);
            } catch(e) {
                console.warn(`[calcAreas] Error converting to WGS84 for tramo ${index}:`, e);
            }
        }

        let areaHa = aTotalM2 / 10000;
        console.timeEnd(`tramo_${index}`);
        console.log(`[calcAreas] Tramo ${tramo.de}: ${areaHa.toFixed(4)} Ha, ${poligonosParaUnirMeters.length} polígonos`);

        resultados.push({
            ...tramo,
            areaCalc: areaHa,
            areaPredCalc: aPredM2 / 10000,
            areaViaCalc: aViaM2 / 10000,
            areaPoli: areaFinalShapeWGS84,
            areaPredPoli: areaPredPoli,
            areaViaPoli: areaViaPoli
        });
    }

    console.timeEnd('calcAreas_total');
    if (onProgress) onProgress(totalTramos, totalTramos);
    return resultados;
}
