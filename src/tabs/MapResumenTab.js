import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { saveFileWithDialog } from '../utils/fileSaver';
import proj4 from 'proj4';
import shp from 'shpjs';
import * as turf from '@turf/turf';
import Drawing from 'dxf-writer';

// Asegurar defs de proj4
proj4.defs("EPSG:3116", "+proj=tmerc +lat_0=4.59620041666667 +lon_0=-74.0775079166667 +k=1 +x_0=1000000 +y_0=1000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
proj4.defs("EPSG:9377", "+proj=tmerc +lat_0=4 +lon_0=-73 +k=0.9992 +x_0=5000000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
proj4.defs("EPSG:3857", "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext  +no_defs");

proj4.defs("EPSG:3857", "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext  +no_defs");

function cleanNumber(val) {
  if (val === null || val === undefined || val === '') return null;
  let str = String(val).trim().replace(/['"]+/g, '').replace(',', '.');
  if ((str.match(/\./g) || []).length > 1) {
      let raw = str.replace(/\./g, "");
      if (raw.length > 7) str = raw.slice(0, 7) + "." + raw.slice(7);
      else str = raw;
  }
  let n = parseFloat(str);
  return isNaN(n) ? null : n;
}

function MapResizer({ isActive }) {
    const map = useMap();
    useEffect(() => {
        if (isActive) {
            let t1 = setTimeout(() => { if(map && map._mapPane) map.invalidateSize(); }, 300);
            return () => clearTimeout(t1);
        }
    }, [isActive, map]);
    return null;
}

function MapStateManager({ isExport }) {
    const map = useMapEvents({
        moveend: () => {
            if (!isExport) {
                window.currentMapCenter = map.getCenter();
                window.currentMapZoom = map.getZoom();
            }
        },
        zoomend: () => {
            if (!isExport) {
                window.currentMapCenter = map.getCenter();
                window.currentMapZoom = map.getZoom();
            }
        }
    });

    useEffect(() => {
        if (isExport) {
            let t = setTimeout(() => {
                if (map && map._mapPane) {
                    map.invalidateSize();
                    if (window.currentMapCenter && window.currentMapZoom) {
                        map.setView(window.currentMapCenter, window.currentMapZoom, { animate: false });
                    }
                }
            }, 600);
            return () => clearTimeout(t);
        }
    }, [isExport, map]);

    return null;
}

export default function MapResumenTab({ 
    T, selMap, R, autoAreasPoly, isActive, inpData, P, sumLat, sumTrans, pbItems, outfalls, isExport
}) {
    const mapRef = useRef(null);
    const renderLayerRef = useRef(null);

    useEffect(() => {
        const handleResize = () => {
            if (mapRef.current && mapRef.current._mapPane && renderLayerRef.current) {
                mapRef.current.invalidateSize();
                let bounds = renderLayerRef.current.getBounds();
                if (bounds.isValid()) {
                    mapRef.current.fitBounds(bounds, { padding: [30, 30] });
                }
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [showBaseMap, setShowBaseMap] = useState(true);
    const [showPozos, setShowPozos] = useState(true);
    const [showTramos, setShowTramos] = useState(true);
    const [showAreas, setShowAreas] = useState(true);
    const [showLblTramos, setShowLblTramos] = useState(true);
    const [showLblPozos, setShowLblPozos] = useState(true);
    const [showLblAreas, setShowLblAreas] = useState(true);
    const [localEpsg, setLocalEpsg] = useState(window.currentGlobalEpsg || "EPSG:3116");
    const [renderTick, setRenderTick] = useState(0);

    // Auto-detect EPSG from coordinate magnitude
    const detectEpsg = (x, y) => {
        var ax = Math.abs(x), ay = Math.abs(y);
        if (ax <= 180 && ay <= 90) return "WGS84";
        // EPSG:3116 Bogotá: X 900000-1100000, Y 900000-1200000
        if (ax > 800000 && ax < 1300000 && ay > 800000 && ay < 1300000) return "EPSG:3116";
        // EPSG:9377 Origen Nacional: X 4000000-6000000, Y 1000000-2500000
        if (ax > 3000000 && ax < 7000000) return "EPSG:9377";
        return "EPSG:3116"; // default
    };

    const projectToLatLng = (x, y, epsgOverride) => {
        var epsg = epsgOverride || localEpsg;
        if (Math.abs(x) <= 180 && Math.abs(y) <= 90) return [y, x];
        try {
            let pt = proj4(epsg, "EPSG:4326", [x, y]);
            return [pt[1], pt[0]];
        } catch (e) {
            return [0, 0];
        }
    };

    // Obtenemos los tramos y pozos a mostrar
    const getDisplayData = () => {
        let rawTramos = inpData && inpData.tr ? inpData.tr : [];
        let rawPozos = [];
        if (inpData && inpData.pozos && inpData.pozos.length > 0) {
            rawPozos = inpData.pozos;
        } else if (inpData && inpData.verts && inpData.verts.length > 0) {
            rawPozos = inpData.verts;
        }
        
        let pozosMap = {};
        rawPozos.forEach(p => { 
            let id = String(p.IdNodo || p.IDNODO || p.id || p.pozo || p.nombre || p.SubName || "").trim().toLowerCase();
            pozosMap[id] = p; 
        });

        const getX = (p) => p ? cleanNumber(p.CoordX !== undefined ? p.CoordX : (p.X !== undefined ? p.X : (p.coordX !== undefined ? p.coordX : (p.x !== undefined ? p.x : null)))) : null;
        const getY = (p) => p ? cleanNumber(p.CoordY !== undefined ? p.CoordY : (p.Y !== undefined ? p.Y : (p.coordY !== undefined ? p.coordY : (p.y !== undefined ? p.y : null)))) : null;

        // Auto-detect EPSG from first available pozo coordinate
        var detectedEpsg = localEpsg;
        // DISABLED forced auto-detect so it perfectly matches MapTab EPSG selection.
        /*
        var firstPozoCoordsKey = Object.keys(pozosMap).find(k => getX(pozosMap[k]) !== null);
        if (firstPozoCoordsKey) {
            var fp = pozosMap[firstPozoCoordsKey];
            detectedEpsg = detectEpsg(getX(fp), getY(fp));
        }
        */

        let displayMap = [];

        // Priority: selMap > inpData.tr > R > T (DatTab tramos)
        let baseItems = (selMap && selMap.length > 0) ? selMap : rawTramos;
        if (baseItems.length === 0 && R && R.length > 0) baseItems = R;
        if (baseItems.length === 0 && T && T.length > 0) baseItems = T; // use DatTab tramos as last fallback

        baseItems.forEach((tr, index) => {
            let item = { ...tr };
            let tr_de = tr.de || tr.DE1 || tr.DE || "";
            let tr_a = tr.a || tr.A1 || tr.A || "";
            item.de = tr_de;
            item.a = tr_a;

            let tr_de_key = String(tr_de).trim().toLowerCase();
            let tr_a_key = String(tr_a).trim().toLowerCase();

            // Si no tiene coords, calcularlas desde pozosMap
            if (!item.coords || item.coords.length === 0) {
                let p1 = pozosMap[tr_de_key];
                let p2 = pozosMap[tr_a_key];
                let p1X = getX(p1), p1Y = getY(p1);
                let p2X = getX(p2), p2Y = getY(p2);
                if (p1X !== null && p2X !== null) {
                    item.coords = [
                        projectToLatLng(p1X, p1Y, detectedEpsg),
                        projectToLatLng(p2X, p2Y, detectedEpsg)
                    ];
                }
            }
            if(item.coords && item.coords.length >= 2) {
                displayMap.push(item);
            }
        });
        return { displayMap, rawTramos, rawPozos, detectedEpsg };
    };

    const exportToGeoJSON = () => {
        const { displayMap, rawTramos, rawPozos } = getDisplayData();
        if (!displayMap || displayMap.length === 0) return;

        // Tramos
        if (showTramos) {
            let tramosFeatures = [];
            displayMap.forEach((tr, index) => {
                if (tr.coords) {
                    let rawTrIdx = rawTramos.findIndex(rt => {
                        let rt_de = String(rt.DE1 || rt.DE || rt.de || "").trim();
                        let rt_a = String(rt.A1 || rt.A || rt.a || "").trim();
                        return rt_de === String(tr.de).trim() && rt_a === String(tr.a).trim();
                    });
                    let trId = rawTrIdx >= 0 ? (rawTrIdx + 1) : (index + 1);
                    let calcData = (R || []).find(r => r.de === tr.de && r.a === tr.a);
                    
                    let rawTr = rawTrIdx >= 0 ? rawTramos[rawTrIdx] : tr;
                    let c_L = calcData ? calcData.L : (tr.longitud || 0);
                    let c_S = calcData ? calcData.S : (tr.pendiente || 0);

                    let isInitial = 1;
                    displayMap.forEach(otherTr => {
                        if (String(otherTr.a).trim() === String(tr.de).trim()) {
                            isInitial = 0;
                        }
                    });

                    let featureProps = {
                        id: trId,
                        id_1: trId,
                        DE: tr.de,
                        A: tr.a,
                        DE1: tr.de,
                        A1: tr.a,
                        ESTADO: rawTr.ESTADO || "PROYECTADO",
                        PSALIDA: rawTr.PSALIDA || 0,
                        LONGITUD: c_L,
                        PENDIENTE: c_S,
                        CINI: calcData ? calcData.cfDE : (tr.CINI || tr.cotaFondo || 0),
                        CFIN: calcData ? calcData.cfA : (tr.CFIN || tr.fondo_final || 0),
                        diametro: calcData ? calcData.Dmm : (tr.diametro || 0),
                        MATERIAL: calcData ? calcData.mat : (tr.MATERIAL || "PVC"),
                        LONGITUD_C: c_L,
                        PENDIENTE_C: c_S,
                        CRas1: calcData ? calcData.crDE : (tr.CRas1 || tr.cotaRasante || 0),
                        CRas2: calcData ? calcData.crA : (tr.CRas2 || tr.cotaRasanteA || 0),
                        PInicial: isInitial
                    };
                    
                    let coordinates = tr.coords.map(c => [c[1], c[0]]); // GeoJSON is [lng, lat]
                    tramosFeatures.push({
                        type: "Feature", geometry: { type: "LineString", coordinates },
                        properties: featureProps
                    });
                }
            });
            if (tramosFeatures.length > 0) {
                let geojson = { type: "FeatureCollection", features: tramosFeatures };
                saveFileWithDialog(new Blob([JSON.stringify(geojson, null, 2)], { type: "application/json" }), "tramos_diseno.geojson");
            }
        }

        // Pozos
        if (showPozos) {
            let pozosFeatures = [];
            let drawnPozos = new Set();
            displayMap.forEach(tr => {
                if (tr.coords && tr.coords.length >= 2) {
                    let ptDe = tr.coords[0];
                    let ptA = tr.coords[tr.coords.length - 1];
                    let calcData = (R || []).find(r => r.de === tr.de && r.a === tr.a);

                    const addPozoProps = (id, pt, ras, fon) => {
                        if (id && pt && !drawnPozos.has(id)) {
                            drawnPozos.add(id);
                            let isOutfall = (outfalls && (Array.isArray(outfalls) ? outfalls.includes(id) : outfalls[id])) || (calcData && !R.some(x => x.de === id));
                            let pzRaw = rawPozos.find(rp => String(rp.IdNodo || rp.IDNODO || rp.id || rp.Nombre || "").trim() === String(id).trim()) || {};
                            let pzIdNum = pzRaw.id || drawnPozos.size;
                            let featureProps = {
                                id: pzIdNum,
                                IdNodo: id,
                                IDfinal: id,
                                Nombre: id,
                                CoordX: pzRaw.CoordX !== undefined ? pzRaw.CoordX : pt[1],
                                CoordY: pzRaw.CoordY !== undefined ? pzRaw.CoordY : pt[0],
                                Ctapa: ras,
                                Cfondo: fon,
                                Profundidad_C: ras - fon,
                                TipoEstruc: isOutfall ? "OUTFALL" : "JUNCTION"
                            };
                            pozosFeatures.push({
                                type: "Feature", geometry: { type: "Point", coordinates: [pt[1], pt[0]] }, properties: featureProps
                            });
                        }
                    };
                    addPozoProps(tr.de, ptDe, calcData ? calcData.crDE : (tr.cotaRasante || 0), calcData ? calcData.cfDE : (tr.cotaFondo || 0));
                    addPozoProps(tr.a, ptA, calcData ? calcData.crA : (tr.cotaRasanteA || 0), calcData ? calcData.cfA : (tr.fondo_final || 0));
                }
            });
            if (pozosFeatures.length > 0) {
                let geojson = { type: "FeatureCollection", features: pozosFeatures };
                saveFileWithDialog(new Blob([JSON.stringify(geojson, null, 2)], { type: "application/json" }), "pozos_diseno.geojson");
            }
        }

        // Areas (Poligonos)
        if (showAreas && autoAreasPoly && autoAreasPoly.length > 0) {
            let areasFeatures = [];
            autoAreasPoly.forEach(feat => {
                let p = feat.properties || {};
                let tramoLabel = p.label || "";
                let tramoId = tramoLabel.replace("Tramo ", "");

                if (feat.geometry && feat.geometry.coordinates) {
                    // feat.geometry.coordinates already is in lat, lng internally from autoAreasPoly? No, leaflet expects [lat, lng], geojson expects [lng, lat]
                    // But autoAreasPoly uses GeoJSON which uses [lng, lat]. Wait, in MapResumenTab map rendering:
                    // polyLayer = L.geoJSON(feat)
                    // It means feat is a standard GeoJSON Feature with [lng, lat]!
                    let tipocuenca = p.TIPOCUENCA || "PROPIEDAD";
                    let grupoSuelo = p.GRUPO_SUELO || (P && P.grupoSueloDefecto ? P.grupoSueloDefecto : "C");
                    let cn = p.CN !== undefined ? p.CN : 75;
                    if (p.CN === undefined && P && P.cnMatrix && P.cnMatrix[tipocuenca] && P.cnMatrix[tipocuenca][grupoSuelo] !== undefined) {
                        cn = P.cnMatrix[tipocuenca][grupoSuelo];
                    }

                    let defaultCesc = 0.6;
                    if (P) {
                        if (tipocuenca === "RESIDENCIAL") defaultCesc = P.coef_aR !== undefined ? P.coef_aR : 0.8;
                        else if (tipocuenca === "COMERCIAL") defaultCesc = P.coef_aC !== undefined ? P.coef_aC : 0.9;
                        else if (tipocuenca === "INDUSTRIAL") defaultCesc = P.coef_aI !== undefined ? P.coef_aI : 0.6;
                        else if (tipocuenca === "INSTITUCIONAL") defaultCesc = P.coef_aIn !== undefined ? P.coef_aIn : 0.6;
                        else if (tipocuenca === "VIAS") defaultCesc = P.coef_aV !== undefined ? P.coef_aV : 0.9;
                        else if (tipocuenca === "RECREACIONAL") defaultCesc = P.coef_aRe !== undefined ? P.coef_aRe : 0.3;
                    }
                    
                    let featureProps = {
                        fid: p.id || areasFeatures.length + 1,
                        id: p.id || areasFeatures.length + 1,
                        IDCUENCA: tramoId,
                        AREACUENCA: p.areaHa !== undefined ? p.areaHa : 0,
                        TIPOCUENCA: tipocuenca,
                        CESC: defaultCesc,
                        DENSIDAD: (P && P.densidad !== undefined) ? P.densidad : (p.DENSIDAD !== undefined ? p.DENSIDAD : 200),
                        CONSUMO: (P && P.consumo !== undefined) ? P.consumo : (p.CONSUMO !== undefined ? p.CONSUMO : 140),
                        LONGCUENCA: p.LONGCUENCA !== undefined ? p.LONGCUENCA : 50,
                        IDESTACION: (P && P.estacion) ? P.estacion : "BUC",
                        IDNODO: p.de || p.IDNODO || tramoId,
                        Nombre: p.de || p.IDNODO || tramoId
                    };
                    areasFeatures.push({
                        type: "Feature", geometry: feat.geometry, properties: featureProps
                    });
                }
            });
            if (areasFeatures.length > 0) {
                let geojson = { type: "FeatureCollection", features: areasFeatures };
                saveFileWithDialog(new Blob([JSON.stringify(geojson, null, 2)], { type: "application/json" }), "areas_diseno.geojson");
            }
        }
    };

    useEffect(() => {
        let isCancelled = false;
        let t2 = null;

        if (mapRef.current || isExport) {
            // For export mode, give Leaflet time to mount
            const run = () => {

        // Clear previous layer
        if (renderLayerRef.current) {
            mapRef.current.removeLayer(renderLayerRef.current);
            renderLayerRef.current = null;
        }

        const { displayMap, detectedEpsg } = getDisplayData();

        if (!displayMap || displayMap.length === 0) {
            return;
        }

        let fg = L.featureGroup();
        let drawnPozos = new Set();

        // Mapear tramos y pozos
        displayMap.forEach((tr, idx) => {
            if (tr.coords && tr.coords.length >= 2) {
                // Find hydraulic results for this pipe
                let calcData = (R || []).find(r => String(r.de).trim() === String(tr.de).trim() && String(r.a).trim() === String(tr.a).trim());
                let pipeLabel = '';
                let trId = idx + 1;
                if (T && T.length > 0) {
                    let fIdx = T.findIndex(t => String(t.de).trim() === String(tr.de).trim() && String(t.a).trim() === String(tr.a).trim());
                    if (fIdx >= 0) trId = fIdx + 1;
                }
                
                if (calcData) {
                    pipeLabel = `<b>Tramo #${trId}:</b> ${tr.de} - ${tr.a}<br><b>L:</b> ${Number(calcData.L || 0).toFixed(1)}m<br><b>S:</b> ${Number(calcData.S || 0).toFixed(2)}%<br><b>D.Prop:</b> ${calcData.nomProp || '-'}`;
                } else {
                    pipeLabel = `<b>Tramo #${trId}:</b> ${tr.de} - ${tr.a}<br><b>L:</b> ${Number(tr.longitud || 0).toFixed(1)}m<br><b>S:</b> ${Number(tr.pendiente || 0).toFixed(2)}%<br><b>D:</b> ${tr.diametroCom || tr.diametro || '-'}`;
                }

                // Draw Pipe
                if (showTramos) {
                    let pl = L.polyline(tr.coords, { color: '#00ffff', weight: 4, pmIgnore: true });
                    pl.bindTooltip(pipeLabel, { permanent: true, direction: "center", className: "resumen-pipe-label" });
                    pl.addTo(fg);
                }

                // Add Manholes (Pozos)
                const addPozo = (id, lat, lng, cras, cfon) => {
                    if (showPozos && id && !drawnPozos.has(id) && lat && lng) {
                        drawnPozos.add(id);
                        let pozoLabel = `<b>Pozo:</b> ${id}<br><b>C.Ras:</b> ${Number(cras || 0).toFixed(2)}<br><b>C.Fon:</b> ${Number(cfon || 0).toFixed(2)}`;
                        L.circleMarker([lat, lng], { radius: 6, color: '#facc15', fillColor: '#a16207', fillOpacity: 1, weight: 2, pmIgnore: true })
                            .bindTooltip(pozoLabel, { permanent: true, direction: 'right', className: 'resumen-pozo-label' }).addTo(fg);
                    }
                };

                let cotaRasDE = calcData ? calcData.crDE : (tr.cotaRasante || 0);
                let cotaFonDE = calcData ? calcData.cfDE : (tr.cotaFondo || 0);
                
                let cotaRasA = calcData ? calcData.crA : (tr.cotaRasanteA || cotaRasDE);
                let cotaFonA = calcData ? calcData.cfA : (tr.fondo_final || 0);

                let ptDe = tr.coords[0];
                let ptA = tr.coords[tr.coords.length - 1];
                addPozo(tr.de, ptDe[0], ptDe[1], cotaRasDE, cotaFonDE);
                addPozo(tr.a, ptA[0], ptA[1], cotaRasA, cotaFonA);
            }
        });

        // Mapear Areas Autogeneradas (poligonos de Voronoi lineal)
        if (showAreas && autoAreasPoly && autoAreasPoly.length > 0) {
            autoAreasPoly.forEach(feat => {
                let p = feat.properties || {};
                let tramoLabel = p.label || ""; // e.g. "Tramo P1-P2"
                let tramoId = tramoLabel.replace("Tramo ", "");
                
                if (feat.geometry && feat.geometry.coordinates) {
                    let areaHa = p.areaHa !== undefined ? p.areaHa : 0;
                    let areaLabel = `<b>Area:</b> ${Number(areaHa).toFixed(2)} Ha`;

                    let polyLayer = L.geoJSON(feat, {
                        style: { color: '#fb923c', weight: 2, fillColor: '#fdba74', fillOpacity: 0.4, pmIgnore: true }
                    });
                    
                polyLayer.bindTooltip(areaLabel, { permanent: true, direction: 'center', className: 'resumen-area-label' });
                    polyLayer.addTo(fg);
                }
            });
        }
        fg.addTo(mapRef.current);
        renderLayerRef.current = fg;
        
        // Ajustar zoom a los elementos si hay algo
        let t1 = setTimeout(() => {
            if (isCancelled) return;
            if (mapRef.current && mapRef.current._mapPane && fg.getLayers().length > 0) {
                if (typeof mapRef.current.invalidateSize === 'function') {
                    mapRef.current.invalidateSize();
                }
                if(typeof mapRef.current.fitBounds === 'function') {
                    mapRef.current.fitBounds(fg.getBounds(), { padding: [30, 30] });
                }
            }
        }, 500);

        return () => {
            isCancelled = true;
            clearTimeout(t1);
            if (mapRef.current && fg) {
                mapRef.current.removeLayer(fg);
            }
        };
        }; // end of run()
        
        let t2 = null;
        if (isExport) {
            // In export mode, wait for Leaflet container to mount
            t2 = setTimeout(run, 200);
        } else {
            if (isActive) run();
        }
        } // end if mapRef.current || isExport

        return () => {
            isCancelled = true;
            if (t2) clearTimeout(t2);
            // Notice t1 is inside run, so we handle it with isCancelled.
        };

    }, [isActive, isExport, selMap, R, T, inpData, autoAreasPoly, showTramos, showPozos, showAreas, renderTick, localEpsg]);

    const handleEpsgChange = (e) => {
        let val = e.target.value;
        setLocalEpsg(val);
        window.currentGlobalEpsg = val;
    };

    const handleProcesar = () => {
        // Sync EPSG from global (Visor Espacial may have changed it)
        if (window.currentGlobalEpsg && window.currentGlobalEpsg !== localEpsg) {
            setLocalEpsg(window.currentGlobalEpsg);
        }
        setRenderTick(t => t + 1);
    };

    const handleAutoDetect = () => {
        // Try to auto-detect EPSG from inpData pozos coordinates
        if (inpData && inpData.pozos && inpData.pozos.length > 0) {
            var fp = inpData.pozos[0];
            if (fp && fp.CoordX) {
                var detected = detectEpsg(Number(fp.CoordX), Number(fp.CoordY));
                setLocalEpsg(detected);
                window.currentGlobalEpsg = detected;
            }
        }
        setRenderTick(t => t + 1);
    };

    const exportDXF = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            // 1. Instanciar DXF
            const d = new Drawing();
            d.addLayer('CATASTRO_BASE', 8, 'CONTINUOUS'); // 8 = Grey
            d.addLayer('RED_TRAMOS', 1, 'CONTINUOUS');    // 1 = Red
            d.addLayer('RED_POZOS', 2, 'CONTINUOUS');     // 2 = Yellow
            d.addLayer('TEXTOS_RED', 7, 'CONTINUOUS');    // 7 = White
            d.addLayer('AREAS', 3, 'CONTINUOUS');         // 3 = Green
            
            let tramosCoords = [];
            let pozosCoords = [];
            let drawnPozos = new Set();
            
            // Función de reproyección: Leaflet [lat, lng] a local EPSG [X, Y]
            const toProj = (lat, lng) => {
                try {
                    return proj4("EPSG:4326", localEpsg, [lng, lat]);
                } catch (err) {
                    return [lng, lat]; // fallback
                }
            };
            
            const { displayMap } = getDisplayData();
            if (displayMap && displayMap.length > 0) {
                displayMap.forEach((tr, idx) => {
                    if (tr.coords && tr.coords.length >= 2) {
                        let ptDe = tr.coords[0];
                        let ptA = tr.coords[tr.coords.length - 1];
                        
                        let projDe = toProj(ptDe[0], ptDe[1]);
                        let projA = toProj(ptA[0], ptA[1]);
                        
                        let x1 = projDe[0], y1 = projDe[1];
                        let x2 = projA[0], y2 = projA[1];
                        
                        d.setActiveLayer('RED_TRAMOS');
                        d.drawLine(x1, y1, x2, y2);
                        
                        // Texto Tramo
                        d.setActiveLayer('TEXTOS_RED');
                        let mx = (x1 + x2) / 2;
                        let my = (y1 + y2) / 2;
                        
                        let trId = idx + 1;
                        if (T && T.length > 0) {
                            let fIdx = T.findIndex(t => String(t.de).trim() === String(tr.de).trim() && String(t.a).trim() === String(tr.a).trim());
                            if (fIdx >= 0) trId = fIdx + 1;
                        }

                        let textStr = `L:${Number(tr.longitud || tr.L || 0).toFixed(1)}m`;
                        if (tr.diametroCom || tr.diametro) textStr += ` D:${tr.diametroCom || tr.diametro}mm`;
                        d.drawText(mx, my+1, 1.5, 0, textStr);
                        
                        tramosCoords.push([x1, y1]);
                        tramosCoords.push([x2, y2]);
                        
                        // Pozos
                        const drawP = (id, px, py) => {
                            if (id && !drawnPozos.has(id)) {
                                drawnPozos.add(id);
                                d.setActiveLayer('RED_POZOS');
                                d.drawCircle(px, py, 1.0);
                                d.setActiveLayer('TEXTOS_RED');
                                d.drawText(px+1.5, py+1.5, 1.2, 0, String(id));
                                pozosCoords.push([px, py]);
                            }
                        };
                        drawP(tr.de, x1, y1);
                        drawP(tr.a, x2, y2);
                    }
                });
            }
            
            // 3.5 Áreas Voronoi
            if (showAreas && autoAreasPoly && autoAreasPoly.length > 0) {
                d.setActiveLayer('AREAS');
                autoAreasPoly.forEach(feat => {
                    let p = feat.properties || {};
                    let tramoLabel = p.label || "";
                    let tramoId = tramoLabel.replace("Tramo ", "");
                    
                    if (feat.geometry && (feat.geometry.type === 'Polygon' || feat.geometry.type === 'MultiPolygon')) {
                        let polys = feat.geometry.type === 'Polygon' ? [feat.geometry.coordinates] : feat.geometry.coordinates;
                        polys.forEach(poly => {
                            poly.forEach(ring => {
                                for (let i=0; i<ring.length-1; i++) {
                                    // GeoJSON is [lng, lat], toProj expects (lat, lng)
                                    let p1 = toProj(ring[i][1], ring[i][0]);
                                    let p2 = toProj(ring[i+1][1], ring[i+1][0]);
                                    d.drawLine(p1[0], p1[1], p2[0], p2[1]);
                                }
                            });
                        });
                    }
                });
            }
            
            // 4. Bounding Box (en coordenadas proyectadas)
            let allPts = [...tramosCoords, ...pozosCoords];
            let bbox = null;
            let bboxPoly = null;
            if (allPts.length > 0) {
                let ptsFeat = turf.featureCollection(allPts.map(pt => turf.point(pt)));
                bbox = turf.bbox(ptsFeat); // [minX, minY, maxX, maxY]
                bbox = [bbox[0]-50, bbox[1]-50, bbox[2]+50, bbox[3]+50];
                
                d.header('EXTMIN', [[10, bbox[0]], [20, bbox[1]], [30, 0]]);
                d.header('EXTMAX', [[10, bbox[2]], [20, bbox[3]], [30, 0]]);
                d.header('LIMMIN', [[10, bbox[0]], [20, bbox[1]]]);
                d.header('LIMMAX', [[10, bbox[2]], [20, bbox[3]]]);
                
                bboxPoly = turf.bboxPolygon(bbox);
            }
            
            // 5. Cargar Catastro
            let geojson = null;
            if (file.name.endsWith('.zip')) {
                const buffer = await file.arrayBuffer();
                geojson = await shp(buffer);
            } else if (file.name.endsWith('.geojson') || file.name.endsWith('.json')) {
                const text = await file.text();
                geojson = JSON.parse(text);
            }
            
            // 6. Recortar y Dibujar Catastro
            if (geojson && geojson.features) {
                // Determinar si las coords vienen geográficas o proyectadas
                let sampleCoord = null;
                for (let f of geojson.features) {
                    if (f.geometry && f.geometry.coordinates && f.geometry.coordinates.length > 0) {
                        let c = f.geometry.coordinates[0];
                        while(Array.isArray(c[0])) c = c[0];
                        sampleCoord = c;
                        break;
                    }
                }
                
                let isGeo = sampleCoord && Math.abs(sampleCoord[0]) <= 180 && Math.abs(sampleCoord[1]) <= 90;
                
                geojson.features.forEach(feat => {
                    if (feat.geometry) {
                        let projFeat = feat;
                        if (isGeo) {
                            projFeat = JSON.parse(JSON.stringify(feat)); // clone
                            turf.coordEach(projFeat, (coord) => {
                                let prj = toProj(coord[1], coord[0]); // toProj expects (lat, lng)
                                coord[0] = prj[0];
                                coord[1] = prj[1];
                            });
                        }
                        
                        let gType = projFeat.geometry.type;
                        if (gType === 'Polygon' || gType === 'MultiPolygon') {
                            if (bboxPoly) {
                                if (turf.booleanIntersects(projFeat, bboxPoly)) {
                                    let clipped = turf.bboxClip(projFeat, bbox);
                                    if (clipped.geometry) {
                                        let clippedType = clipped.geometry.type;
                                        if (clippedType === 'Polygon' || clippedType === 'MultiPolygon') {
                                            let polys = clippedType === 'Polygon' ? [clipped.geometry.coordinates] : clipped.geometry.coordinates;
                                            d.setActiveLayer('CATASTRO_BASE');
                                            polys.forEach(poly => {
                                                poly.forEach(ring => {
                                                    for (let i=0; i<ring.length-1; i++) {
                                                        let p1 = ring[i];
                                                        let p2 = ring[i+1];
                                                        d.drawLine(p1[0], p1[1], p2[0], p2[1]);
                                                    }
                                                });
                                            });
                                        }
                                    }
                                }
                            } else {
                                let polys = gType === 'Polygon' ? [projFeat.geometry.coordinates] : projFeat.geometry.coordinates;
                                d.setActiveLayer('CATASTRO_BASE');
                                polys.forEach(poly => {
                                    poly.forEach(ring => {
                                        for (let i=0; i<ring.length-1; i++) {
                                            let p1 = ring[i];
                                            let p2 = ring[i+1];
                                            d.drawLine(p1[0], p1[1], p2[0], p2[1]);
                                        }
                                    });
                                });
                            }
                        }
                    }
                });
            }
            
            // 7. Guardar
            const blob = new Blob([d.toDxfString()], { type: "application/dxf" });
            saveFileWithDialog(blob, "Plano_Proyecto.dxf");
            alert("DXF generado exitosamente.");
            
        } catch (err) {
            console.error(err);
            alert("Error procesando cartografía: " + err.message);
        }
        e.target.value = null; // reset
    };

    const containerHeight = isExport ? '750px' : 'calc(100vh - 120px)';
    return (
        <div style={{ position: 'relative', width: '100%', height: containerHeight }}>
            <MapContainer
                center={[4.596200, -74.077507]}
                zoom={14}
                style={{ height: '100%', width: '100%', background: '#0f172a', minHeight: isExport ? '750px' : undefined }}
                ref={mapRef}
                zoomControl={true}
                maxZoom={22}
            >
                <MapResizer isActive={isActive} />
                <MapStateManager isExport={isExport} />
                {showBaseMap && (
                    <TileLayer
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        maxZoom={22}
                        maxNativeZoom={19}
                    />
                )}
            </MapContainer>
            
            {/* Control de Capas Flotante */}
            {!isExport && (
            <div className="visor-capas-panel" style={{
                position: 'absolute', top: 10, right: 10, zIndex: 1000,
                background: 'rgba(15, 23, 42, 0.9)', padding: '10px 15px', borderRadius: '8px',
                border: '1px solid #334155', color: '#e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)', width: '250px'
            }}>
                <div style={{ fontSize: 14, fontWeight: 'bold', borderBottom: '1px solid #475569', paddingBottom: 5, marginBottom: 5 }}>Visor Resumen / Capas</div>
                                <div style={{ marginBottom: 5 }}>
                    <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 2 }}>Sistema de Coordenadas:</label>
                    <select value={localEpsg} onChange={handleEpsgChange} style={{
                        width: '100%', padding: '4px', borderRadius: '4px', background: '#1e293b',
                        color: 'white', border: '1px solid #475569', fontSize: 12
                    }}>
                        <option value="EPSG:3116">EPSG:3116 (Magna Bogota)</option>
                        <option value="EPSG:9377">EPSG:9377 (Origen Nacional)</option>
                        <option value="EPSG:3857">EPSG:3857 (WGS 84)</option>
                    </select>
                    <button onClick={handleProcesar} style={{
                        marginTop: 8, background: '#10b981', color: 'white', border: 'none', padding: '6px 12px',
                        borderRadius: '4px', cursor: 'pointer', fontSize: 12, fontWeight: 'bold', width: '100%'
                    }}>
                        ¡ Procesar Coordenadas
                    </button>
                    <button onClick={handleAutoDetect} style={{
                        marginTop: 4, background: '#3b82f6', color: 'white', border: 'none', padding: '5px 12px',
                        borderRadius: '4px', cursor: 'pointer', fontSize: 11, fontWeight: 'bold', width: '100%'
                    }}>
                        🔍 Auto-Detectar EPSG
                    </button>
                    
                    <div style={{ marginTop: 8, background: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 4, border: '1px dashed #64748b' }}>
                        <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Exportar Plano DXF:</label>
                        <label style={{ display: "block", background: "#f59e0b", color: "#fff", textAlign: "center", padding: "6px", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: "bold" }}>
                            Subir Catastro (.zip/.geojson)
                            <input type="file" accept=".zip,.geojson,.json" onChange={exportDXF} style={{ display: 'none' }} />
                        </label>
                    </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox" checked={showBaseMap} onChange={e => setShowBaseMap(e.target.checked)} /> Mapa Satelital
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox" checked={showTramos} onChange={e => setShowTramos(e.target.checked)} /> Líneas (Tramos)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox" checked={showPozos} onChange={e => setShowPozos(e.target.checked)} /> Puntos (Pozos)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox" checked={showAreas} onChange={e => setShowAreas(e.target.checked)} /> Polígonos (Áreas)
                </label>
                <div style={{ height: '1px', background: '#475569', margin: '4px 0' }}></div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox" checked={showLblTramos} onChange={e => setShowLblTramos(e.target.checked)} /> Etiquetas Tramos
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox" checked={showLblPozos} onChange={e => setShowLblPozos(e.target.checked)} /> Etiquetas Pozos
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox" checked={showLblAreas} onChange={e => setShowLblAreas(e.target.checked)} /> Etiquetas Áreas
                </label>
                <button onClick={exportToGeoJSON} style={{
                    marginTop: 10, background: '#3b82f6', color: 'white', border: 'none', padding: '6px 12px',
                    borderRadius: '4px', cursor: 'pointer', fontSize: 12, fontWeight: 'bold'
                }}>
                    📥 Exportar (GeoJSON)
                </button>
            </div>
            )}
            {/* Custom CSS for MapResumenTab Labels */}
            <style>{`
                .resumen-pipe-label {
                    background: rgba(15, 23, 42, 0.85);
                    color: #00ffff;
                    border: 1px solid #00ffff;
                    font-size: 11px;
                    border-radius: 4px;
                    white-space: nowrap;
                    font-family: monospace;
                    text-align: center;
                }
                .resumen-pozo-label {
                    background: rgba(15, 23, 42, 0.85);
                    color: #facc15;
                    border: 1px solid #facc15;
                    font-size: 11px;
                    border-radius: 4px;
                    white-space: nowrap;
                    font-family: monospace;
                    text-align: left;
                }
                .resumen-area-label {
                    background: rgba(15, 23, 42, 0.85);
                    color: #fb923c;
                    border: 1px solid #fb923c;
                    font-size: 11px;
                    border-radius: 4px;
                    white-space: nowrap;
                    font-family: monospace;
                    font-weight: bold;
                    text-align: center;
                }
                .leaflet-tooltip-left:before, .leaflet-tooltip-right:before, .leaflet-tooltip-top:before, .leaflet-tooltip-bottom:before {
                    display: none; /* Hide tooltips pointer arrow */
                }
                ${!(isExport ? false : showLblTramos) ? `.resumen-pipe-label { display: none !important; }` : ''}
                ${!(isExport ? false : showLblPozos) ? `.resumen-pozo-label { display: none !important; }` : ''}
                ${!(isExport ? false : showLblAreas) ? `.resumen-area-label { display: none !important; }` : ''}
                @media print {
                    .visor-capas-panel { display: none !important; }
                    .leaflet-container { height: 750px !important; width: 100% !important; page-break-inside: avoid; }
                    body { background: white !important; }
                }
            `}</style>
        </div>
    );
}
