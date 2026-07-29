// Forced refresh 06:17:04
/* global txtEstaciones, jsonDensidades */
import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, FeatureGroup, useMap } from 'react-leaflet';
import { cIDF, formatDiam } from '../engine';
import { IDF } from '../constants';
import { calcularAreas } from '../calcAreasAferentes';
import L from 'leaflet';
import * as turf from '@turf/turf';
import shp from 'shpjs';
import proj4 from 'proj4';
import { parseNum, topoSort } from '../parsers';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

// EPSG:3116 (Magna Sirgas Colombia Bogota)
proj4.defs("EPSG:3116", "+proj=tmerc +lat_0=4.59620041666667 +lon_0=-74.0775079166667 +k=1 +x_0=1000000 +y_0=1000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
// EPSG:9377 (MAGNA-SIRGAS / Origen Nacional)
proj4.defs("EPSG:9377", "+proj=tmerc +lat_0=4 +lon_0=-73 +k=0.9992 +x_0=5000000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
// EPSG:3857 (WGS 84 / Pseudo-Mercator)
proj4.defs("EPSG:3857", "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext  +no_defs");

window.currentGlobalEpsg = "EPSG:3116";

function cleanNumber(val) {
  if (!val) return 0;
  let str = String(val).trim().replace(/['"]+/g, '').replace(',', '.');
  if ((str.match(/\./g) || []).length > 1) {
      let raw = str.replace(/\./g, "");
      if (raw.length > 7) str = raw.slice(0, 7) + "." + raw.slice(7);
      else str = raw;
  }
  return parseFloat(str) || 0;
}

function cleanCoordinate(val) { return cleanNumber(val); }
function cleanDecimal(val) { return parseFloat(String(val).replace(',', '.')) || 0; }

function getValCI(obj, ...keys) {
  if (!obj) return undefined;
  const objKeys = Object.keys(obj);
  for (let k of keys) {
    const kLow = k.toLowerCase();
    const found = objKeys.find(ok => ok.toLowerCase() === kLow);
    if (found !== undefined && obj[found] !== null && obj[found] !== undefined && obj[found] !== "") {
      return obj[found];
    }
  }
  return undefined;
}

function parseUniversalCSV(text) {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  if(lines.length < 2) return [];
  let delimiter = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
  const result = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const row = [];
    let current = '', inQuotes = false;
    for (let char of lines[i]) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === delimiter && !inQuotes) { row.push(current); current = ''; }
      else current += char;
    }
    row.push(current);
    let obj = { properties: {} };
    headers.forEach((h, idx) => {
      let val = row[idx] ? row[idx].replace(/^"|"$/g, '').trim() : '';
      obj.properties[h] = val; 
      let hLow = h;
      if (hLow.includes("coord") && hLow.includes("x")) obj.x = cleanCoordinate(val);
      else if (hLow.includes("coord") && hLow.includes("y")) obj.y = cleanCoordinate(val);
      else if (hLow.includes("nomencl")) obj.id = val;
      else if (hLow.includes("diam")) obj.diametro = val;
      else if (hLow.includes("material")) obj.material = val;
      else if (hLow.includes("pend")) obj.pendiente = cleanDecimal(val);
      else if (hLow.includes("long")) obj.longitud = cleanDecimal(val);
      if (hLow.includes("cota rasante") || hLow.includes("cota tapa") || hLow.includes("cota_tapa") || hLow.includes("cota_rasante") || hLow.includes("cota terreno") || hLow.includes("cota_terreno") || hLow.includes("cota rasante (m)") || hLow.includes("cota tapa (m)")) {
        obj.cota_terreno = cleanDecimal(val);
      } else if (hLow.includes("cota clave") || hLow.includes("cota batea") || hLow.includes("cota fondo") || hLow.includes("cota_fondo") || hLow.includes("cota clave ini") || hLow.includes("cota clave ini (m)")) {
        obj.cota_fondo = cleanDecimal(val);
      } else if (hLow.includes("cota") && (hLow.includes("ini") || hLow.includes("clave"))) {
        obj.cota = cleanNumber(val);
      }
      if (hLow.includes("fondo inicial") || hLow === "cini" || hLow.includes("cota_ini")) obj.fondo_inicial = cleanDecimal(val);
      if (hLow.includes("fondo final") || hLow === "cfin" || hLow.includes("cota_fin")) obj.fondo_final = cleanDecimal(val);
      if (hLow.includes("rasante inicial") || hLow.includes("rasante_ini") || hLow.includes("clave_ini") || hLow === "rini" || hLow.includes("cras1") || hLow.includes("cota_rasante_ini")) obj.rasante_inicial = cleanDecimal(val);
      if (hLow.includes("rasante final") || hLow.includes("rasante_fin") || hLow.includes("clave_fin") || hLow === "rfin" || hLow.includes("cras2") || hLow.includes("cota_rasante_fin")) obj.rasante_final = cleanDecimal(val);
      if (hLow.includes("area") || hLow.includes("área") || hLow.includes("aferente") || hLow === "areacuenca") obj.area = cleanDecimal(val);
    });
    result.push(obj);
  }
  return result;
}

const projectToMeters = (lng, lat) => {
    if (Math.abs(lng) > 180 || Math.abs(lat) > 90) return [lng, lat]; // already meters
    return proj4("EPSG:4326", window.currentGlobalEpsg || "EPSG:3116", [lng, lat]);
};
const projectToLatLng = (x, y) => {
    if (Math.abs(x) <= 180 && Math.abs(y) <= 90) return [x, y]; // already WGS84
    return proj4(window.currentGlobalEpsg || "EPSG:3116", "EPSG:4326", [x, y]);
};

    let getDen = (obj) => {
        if (!obj) return undefined;
        if (obj.Densidad_2024 !== undefined) return obj.Densidad_2024;
        if (obj.D2024 !== undefined) return obj.D2024;
        if (obj.DACTUAL !== undefined) return obj.DACTUAL;
        if (obj.densidad !== undefined) return obj.densidad;
        if (obj.DENSIDAD !== undefined) return obj.DENSIDAD;
        if (obj.Densidad !== undefined) return obj.Densidad;
        if (obj.properties) {
            if (obj.properties.Densidad_2024 !== undefined) return obj.properties.Densidad_2024;
            if (obj.properties.D2024 !== undefined) return obj.properties.D2024;
            if (obj.properties.DACTUAL !== undefined) return obj.properties.DACTUAL;
            if (obj.properties.densidad !== undefined) return obj.properties.densidad;
            if (obj.properties.DENSIDAD !== undefined) return obj.properties.DENSIDAD;
            if (obj.properties.Densidad !== undefined) return obj.properties.Densidad;
        }
        return undefined;
    };

    let getCon = (obj) => {
        if (!obj) return undefined;
        if (obj.consumo !== undefined) return obj.consumo;
        if (obj.CONSUMO !== undefined) return obj.CONSUMO;
        if (obj.Consumo !== undefined) return obj.Consumo;
        if (obj.properties) {
            if (obj.properties.consumo !== undefined) return obj.properties.consumo;
            if (obj.properties.CONSUMO !== undefined) return obj.properties.CONSUMO;
            if (obj.properties.Consumo !== undefined) return obj.properties.Consumo;
        }
        return undefined;
    };

    const findValueInGeoJSON = (geoJsonData, ptLngLat) => {
        try {
            if (!geoJsonData || !geoJsonData.features) return null;
            let pt = turf.point([ptLngLat[0], ptLngLat[1]]);
            for (let f of geoJsonData.features) {
                if (turf.booleanPointInPolygon(pt, f)) {
                    return f.properties.DACTUAL || f.properties.D2024 || f.properties.DENS2008 || f.properties.DENSIDAD || f.properties.Densidad || f.properties.densidad;
                }
            }
        } catch(e){}
        return null;
    };

    const findValueInWKT = (wktData, ptLngLat, propIndex) => {
        if (!wktData || typeof wktData !== 'string') return null;
        if (!window._wktCache) window._wktCache = {};
        let cacheKey = wktData.length;
        if (!window._wktCache[cacheKey]) {
            let lineas = wktData.trim().split('\n').slice(1);
            let polys = [];
            for (let lin of lineas) {
                if(!lin) continue;
                let parts = lin.split(';');
                if (parts.length <= propIndex) continue;
                let wkt = parts[0];
                let val = parts[propIndex];
                let coordsMatch = wkt.match(/\(\(+([^)]+)\)\)+/);
                if (coordsMatch) {
                    let points = coordsMatch[1].split(',').map(p => {
                        let xy = p.trim().split(/\s+/);
                        let proj = projectToLatLng(parseFloat(xy[0]), parseFloat(xy[1]));
                        return proj; 
                    });
                    if (points.length > 2) {
                        if (points[0][0] !== points[points.length-1][0] || points[0][1] !== points[points.length-1][1]) {
                            points.push([...points[0]]);
                        }
                        try {
                            polys.push({ poly: turf.polygon([points]), val: val });
                        } catch(e) {}
                    }
                }
            }
            window._wktCache[cacheKey] = polys;
        }
        let pt = turf.point([ptLngLat[0], ptLngLat[1]]);
        for (let item of window._wktCache[cacheKey]) {
            if (turf.booleanPointInPolygon(pt, item.poly)) return item.val;
        }
        return null;
    };

function frac_zona_plana(lon) {
  const LON_CORTA_M = 30.0, LON_LARGA_M = 80.0, FRAC_MAX = 0.25, MIN_ZONA_PLANA_M = 5.0;
  let frac = 0.0;
  if (lon <= LON_CORTA_M) frac = 0.0;
  else if (lon >= LON_LARGA_M) frac = FRAC_MAX;
  else frac = FRAC_MAX * (lon - LON_CORTA_M) / (LON_LARGA_M - LON_CORTA_M);
  let zona_plana_m = lon * (1 - 2 * frac);
  if (zona_plana_m < MIN_ZONA_PLANA_M && lon > MIN_ZONA_PLANA_M * 2) {
    frac = Math.max(0, (lon - MIN_ZONA_PLANA_M) / (2 * lon));
  }
  return frac;
}

// Hook removed to avoid StackBlitz bugs

class MinHeap {
    constructor() { this.heap = []; }
    push(val) {
        this.heap.push(val);
        this.bubbleUp(this.heap.length - 1);
    }
    pop() {
        if (this.heap.length === 1) return this.heap.pop();
        const top = this.heap[0];
        this.heap[0] = this.heap.pop();
        this.bubbleDown(0);
        return top;
    }
    bubbleUp(idx) {
        while (idx > 0) {
            let p = Math.floor((idx - 1) / 2);
            if (this.heap[idx].z >= this.heap[p].z) break;
            [this.heap[idx], this.heap[p]] = [this.heap[p], this.heap[idx]];
            idx = p;
        }
    }
    bubbleDown(idx) {
        while (true) {
            let left = 2 * idx + 1, right = 2 * idx + 2, min = idx;
            if (left < this.heap.length && this.heap[left].z < this.heap[min].z) min = left;
            if (right < this.heap.length && this.heap[right].z < this.heap[min].z) min = right;
            if (min === idx) break;
            [this.heap[idx], this.heap[min]] = [this.heap[min], this.heap[idx]];
            idx = min;
        }
    }
    get length() { return this.heap.length; }
}

const GeomanSetup = ({ sT, setSelTramos, tramosConCoordsRef, setBufferArea }) => {
  const map = useMap();
  const sTRef = useRef(sT);
  
  useEffect(() => {
      sTRef.current = sT;
  }, [sT]);

  useEffect(() => {
      if (!map) return;
      if (!map.pm) {
          console.log("Geoman plugin no se cargó en L.Map");
          return;
      }
      try {
          if (!map.pm.Toolbar || !map.pm.Toolbar.isVisible) {
             map.pm.addControls({
                position: 'topleft',
                drawMarker: false, drawCircleMarker: false, drawPolyline: false,
                drawRectangle: false, drawPolygon: false, drawCircle: false,
                editMode: true, dragMode: true, cutPolygon: false, removalMode: false, drawText: false
             });
          }
          
          const handleEdit = (e) => {
              let featureId = null;
              let isBufferEdit = false;
              
              if (e.layer.feature && e.layer.feature.properties && e.layer.feature.properties.id) {
                  featureId = e.layer.feature.properties.id; // e.g. "PZ1 - PZ2"
                  isBufferEdit = true;
              } else if (e.layer.options && e.layer.options.nid) {
                  featureId = e.layer.options.nid;
              }
              
              if (featureId) {
                  try {
                      const geojson = e.layer.toGeoJSON();
                      const sqMeters = turf.area(geojson);
                      const hectares = (sqMeters / 10000).toFixed(4);
                      
                      let tTip = e.layer.getTooltip();
                      if (tTip) {
                          tTip.setContent(`Área Modificada: ${featureId}<br>Hectáreas: ${hectares} Ha`);
                      }
                      
                      // Split id if it's "de - a"
                      let nid = featureId;
                      let de_match = featureId, a_match = featureId;
                      if (featureId.includes(" - ")) {
                          let parts = featureId.split(" - ");
                          de_match = parts[0].trim();
                          a_match = parts[1].trim();
                      }
                      
                      // 1. Update tramosConCoordsRef and selTramos (so exportToApp works!)
                      if (tramosConCoordsRef && tramosConCoordsRef.current) {
                          tramosConCoordsRef.current = tramosConCoordsRef.current.map(tc => {
                              if (!tc) return tc;
                              if (isBufferEdit) {
                                  if (String(tc.de).trim() === de_match && String(tc.a).trim() === a_match) {
                                      return { ...tc, areaCalc: parseFloat(hectares), areaPredCalc: parseFloat(hectares), areaViaCalc: 0, areaParcial: parseFloat(hectares) };
                                  }
                              } else {
                                  if (String(tc.de).trim() === nid || String(tc.deNum).trim() === nid) {
                                      return { ...tc, areaParcial: parseFloat(hectares), areaCalc: parseFloat(hectares), areaPredCalc: parseFloat(hectares), areaViaCalc: 0 };
                                  }
                              }
                              return tc;
                          });
                      }
                      
                      if (setSelTramos) {
                          setSelTramos(prev => {
                              let newSel = prev.map(st => {
                                  if (!st) return st;
                                  if (isBufferEdit) {
                                      if (String(st.de).trim() === de_match && String(st.a).trim() === a_match) {
                                          return { ...st, areaCalc: parseFloat(hectares), areaPredCalc: parseFloat(hectares), areaViaCalc: 0, areaParcial: parseFloat(hectares) };
                                      }
                                  } else {
                                      if (String(st.de).trim() === nid || String(st.deNum).trim() === nid) {
                                          return { ...st, areaParcial: parseFloat(hectares), areaCalc: parseFloat(hectares), areaPredCalc: parseFloat(hectares), areaViaCalc: 0 };
                                      }
                                  }
                                  return st;
                              });
                              
                              if (isBufferEdit && setBufferArea) {
                                  let sum = 0;
                                  newSel.forEach(st => {
                                      if (st && st.areaCalc) sum += st.areaCalc;
                                  });
                                  setBufferArea(sum);
                              }
                              
                              return newSel;
                          });
                      }
                      
                      // 2. Update T via sT
                      if (sTRef.current) {
                          sTRef.current(prevT => {
                              let newT = [...prevT];
                              let changed = false;
                              newT.forEach(t => {
                                  if (isBufferEdit) {
                                      if (String(t.de).trim() === de_match && String(t.a).trim() === a_match) {
                                          t.areaCalc = parseFloat(hectares);
                                          t.areaPredCalc = parseFloat(hectares);
                                          t.areaViaCalc = 0;
                                          t.areaParcial = parseFloat(hectares);
                                          t.aT = parseFloat(hectares);
                                          changed = true;
                                      }
                                  } else {
                                      if (String(t.de) === String(nid) || String(t.deNum) === String(nid) || String(t.a) === String(nid) || String(t.aNum) === String(nid)) {
                                          if (String(t.de) === String(nid) || String(t.deNum) === String(nid)) {
                                              t.areaParcial = parseFloat(hectares);
                                              t.areaCalc = parseFloat(hectares);
                                              t.areaPredCalc = parseFloat(hectares);
                                              t.areaViaCalc = 0;
                                              t.aT = parseFloat(hectares);
                                              changed = true;
                                          }
                                      }
                                  }
                              });
                              return changed ? newT : prevT;
                          });
                      }
                  } catch (areaErr) {
                      console.warn("Turf area err:", areaErr);
                  }
              }
          };
          
          map.on('pm:edit', handleEdit);
          
          return () => {
              map.off('pm:edit', handleEdit);
          };
      } catch(err) {
          console.log("Error inicializando Geoman:", err);
      }
  }, [map]);
  return null;
};

function MapTabInner({ T, sT, P, setP, inpData, setInpData, setTab, isActive, setSelMap, autoAreasPoly, setAutoAreasPoly, isExport }) {
      const [selTramos, setSelTramos] = useState([]); // Arreglo de datos crudos seleccionados
    const [bufferArea, setBufferArea] = useState(0);
    const [epsgCode, setEpsgCode] = useState(window.currentGlobalEpsg || "EPSG:3116");

    const handleEpsgChange = (e) => {
        const val = e.target.value;
        window.currentGlobalEpsg = val;
        setEpsgCode(val);
    };

  useEffect(() => {
    if (setSelMap) setSelMap(selTramos.filter(t => t !== null));
  }, [selTramos, setSelMap]);
  const mapBoundsRef = useRef(null);

  useEffect(() => {
      if (isActive && mapRef.current) {
          let t = setTimeout(() => {
              if (mapRef.current && mapRef.current._mapPane) {
                  mapRef.current.invalidateSize();
                  if (mapBoundsRef.current && mapBoundsRef.current.isValid()) {
                      mapRef.current.fitBounds(mapBoundsRef.current);
                  }
              }
          }, 300);
          return () => clearTimeout(t);
      }
    }, [isActive]);

    useEffect(() => {
        const handleResize = () => {
            if (mapRef.current && mapRef.current._mapPane && mapBoundsRef.current && mapBoundsRef.current.isValid()) {
                mapRef.current.invalidateSize();
                mapRef.current.fitBounds(mapBoundsRef.current, { padding: [20, 20] });
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

  const [bufferPoly, setBufferPoly] = useState([]); // GeoJSON polygon coordinates
  // autoAreasPoly y setAutoAreasPoly vienen de props
  const [tcVal, setTcVal] = useState("-");
  const [traceMode, setTraceMode] = useState(false);
  const traceModeRef = useRef(false);
  const selLinesLayerRef = useRef(null);
  const [radio, setRadio] = useState(20);
  const [cartografia, setCartografia] = useState([]);
  const [verCartografia, setVerCartografia] = useState(true);
  const [incluirVias, setIncluirVias] = useState(true); // Added for vias toggle
  const [verAreaCompleta, setVerAreaCompleta] = useState(true);
  const [verAreaSeparada, setVerAreaSeparada] = useState(true);
  const [verAutoAreas, setVerAutoAreas] = useState(true);
  const mapRef = useRef(null);
  const cartoLayerRef = useRef(null);
  const bufferLayerRef = useRef(null);
  const autoAreasLayerRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcProgress, setCalcProgress] = useState({ current: 0, total: 0 });
  const [refFeatures, setRefFeatures] = useState([]);
  const [verRefFeatures, setVerRefFeatures] = useState(true);
  const refLayerGroup = useRef(null);
  const tramosConCoordsRef = useRef([]);
  const pozosDrawnRef = useRef([]);

  const handleLoadRefGeoJSON = (e) => {
    let f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            let data = JSON.parse(ev.target.result);
            let feats = data.features || (data.type === "Feature" ? [data] : []);
            setRefFeatures(feats);
        } catch (err) {
            alert("Error al parsear GeoJSON de referencia: " + err.message);
        }
    };
    reader.readAsText(f);
    e.target.value = "";
  };

  useEffect(() => { traceModeRef.current = traceMode; }, [traceMode]);

  useEffect(() => {
    if (isActive && mapRef.current) {
        let t = setTimeout(() => {
            if(mapRef.current && mapRef.current._mapPane) mapRef.current.invalidateSize();
        }, 250);
        return () => clearTimeout(t);
    }
  }, [isActive]);

  useEffect(() => {
    if (!inpData && T && T.length === 0) {
      setCartografia([]);
      setSelTramos([]);
      setBufferArea(0);
      setBufferPoly([]);
      if (setAutoAreasPoly) setAutoAreasPoly([]);
      if (mapRef.current) {
        if (cartoLayerRef.current) mapRef.current.removeLayer(cartoLayerRef.current);
        if (selLinesLayerRef.current) mapRef.current.removeLayer(selLinesLayerRef.current);
        if (bufferLayerRef.current) mapRef.current.removeLayer(bufferLayerRef.current);
        if (autoAreasLayerRef.current) mapRef.current.removeLayer(autoAreasLayerRef.current);
      }
    }
  }, [inpData, T, mapLoaded]);

  useEffect(() => {
     if(mapRef.current && cartoLayerRef.current) {
         if(verCartografia) {
             if(!mapRef.current.hasLayer(cartoLayerRef.current)) cartoLayerRef.current.addTo(mapRef.current);
         } else {
             if(mapRef.current.hasLayer(cartoLayerRef.current)) mapRef.current.removeLayer(cartoLayerRef.current);
         }
     }
  }, [verCartografia, mapLoaded]);

  useEffect(() => {
     if(mapRef.current && autoAreasLayerRef.current) {
         if(verAutoAreas) {
             if(!mapRef.current.hasLayer(autoAreasLayerRef.current)) autoAreasLayerRef.current.addTo(mapRef.current);
         } else {
             if(mapRef.current.hasLayer(autoAreasLayerRef.current)) mapRef.current.removeLayer(autoAreasLayerRef.current);
         }
     }
  }, [verAutoAreas, mapLoaded]);

  useEffect(() => {
      if (!mapRef.current) return;
      if (bufferLayerRef.current) {
          mapRef.current.removeLayer(bufferLayerRef.current);
          bufferLayerRef.current = null;
      }
      if (!bufferPoly || bufferPoly.length === 0) return;

      let featuresToRender = bufferPoly.filter(f => {
          if (f.properties && f.properties.isCompleta) return verAreaCompleta;
          if (f.properties && (f.properties.isPredio || f.properties.isVia)) return verAreaSeparada;
          return true;
      });

      let fc = { type: "FeatureCollection", features: featuresToRender };
      bufferLayerRef.current = L.geoJSON(fc, {
          style: function(feature) {
              if (feature.properties && feature.properties.isCompleta) {
                  return { color: "#ff7800", fillColor: "transparent", fillOpacity: 0, weight: 3, dashArray: "5, 5" };
              }
              if (feature.properties && feature.properties.isVia) {
                  return { color: "#6b7280", fillColor: "#9ca3af", fillOpacity: 0.4, weight: 1, dashArray: "4" };
              }
              return { color: "#8e44ad", fillColor: "#9b59b6", fillOpacity: 0.4, weight: 2 };
          }
      });
      if (!mapRef.current.hasLayer(bufferLayerRef.current))
          bufferLayerRef.current.addTo(mapRef.current);
  }, [bufferPoly, verAreaCompleta, verAreaSeparada, mapLoaded]);

  useEffect(() => {
      if (!mapRef.current) return;
      if (autoAreasLayerRef.current) {
          mapRef.current.removeLayer(autoAreasLayerRef.current);
          autoAreasLayerRef.current = null;
      }
      if (!autoAreasPoly || autoAreasPoly.length === 0) return;

      let fc = { type: "FeatureCollection", features: autoAreasPoly };
      autoAreasLayerRef.current = L.geoJSON(fc, {
          style: function(feature) {
              return {
                  color: '#059669', // Emerald
                  weight: 2,
                  fillColor: '#10b981',
                  fillOpacity: 0.3,
                  dashArray: '5, 5'
              };
          },
          onEachFeature: function(feature, layer) {
              if (feature.properties && feature.properties.areaHa !== undefined) {
                  let label = feature.properties.label || feature.properties.pozoId || '';
                  layer.bindTooltip(`${label}<br/><b>${feature.properties.areaHa.toFixed(2)} Ha</b>`, {
                      permanent: true,
                      direction: 'center',
                      className: 'auto-area-tooltip'
                  });
              }
          }
      });
      if (verAutoAreas) {
          if (!mapRef.current.hasLayer(autoAreasLayerRef.current)) {
              autoAreasLayerRef.current.addTo(mapRef.current);
          }
          try {
              let b = autoAreasLayerRef.current.getBounds();
              if (b.isValid()) {
                  mapBoundsRef.current = b;
                  if (mapLoaded) mapRef.current.fitBounds(b, { padding: [20, 20] });
              }
          } catch (e) {}
      }
  }, [autoAreasPoly, mapLoaded]);

    // handleAutoAreas was removed (unified with handleCalcularAreas)

    const handleCalcularAreas = (modoSeleccionado) => {
        const coordinatedTramos = tramosConCoordsRef.current.length > 0 ? tramosConCoordsRef.current : T;
        let tramosObjetivo = [];
        
        if (modoSeleccionado) {
            if (selTramos.length === 0) {
                alert("No hay ningún tramo seleccionado.");
                return;
            }
            // Match selected tramos to their coordinated versions
            tramosObjetivo = selTramos.map(st => {
                if (!st) return null;
                let found = coordinatedTramos.find(ct => String(ct.de).trim() === String(st.de).trim() && String(ct.a).trim() === String(st.a).trim());
                return found || st;
            }).filter(t => t !== null);
        } else {
            tramosObjetivo = coordinatedTramos.filter(t => t && !t.sep);
            if (tramosObjetivo.length === 0) {
                alert("No hay tramos en la red para calcular.");
                return;
            }
        }

        setIsCalculating(true);
        setCalcProgress({ current: 0, total: tramosObjetivo.length });
        
        let radioInputVal = parseFloat(document.getElementById('radioBufferInput')?.value) || parseFloat(radio) || 40.0;

        setTimeout(async () => {
            try {
                // Use spatial pozos from the drawn layer (with coordinates), not P.pz
                const pozosParaAreas = pozosDrawnRef.current.length > 0 ? pozosDrawnRef.current : (P && P.pz ? P.pz : []);
                const resultados = await calcularAreas(tramosObjetivo, coordinatedTramos, cartografia, pozosParaAreas, (cur, tot) => {
                    setCalcProgress({ current: cur, total: tot });
                }, radioInputVal);
            let tramosActualizados = [...T];
            if (tramosActualizados.length === 0 && coordinatedTramos.length > 0) {
                tramosActualizados = [...coordinatedTramos];
            }
            let totalArea = 0;
                
                let newSelTramos = [...selTramos];
                
                let features = [];
                
                for (let res of resultados) {
                    if (!res) continue;
                    let idx = tramosActualizados.findIndex(t => t && String(t.de).trim().toLowerCase() === String(res.de).trim().toLowerCase());
                    if (idx !== -1) {
                        tramosActualizados[idx] = { 
                            ...tramosActualizados[idx], 
                            ...res,
                            areaParcial: res.areaCalc,
                            areaCalc: res.areaCalc,
                            areaPredCalc: res.areaPredCalc,
                            areaViaCalc: res.areaViaCalc,
                            aR_prop: res.tipoArea === "RESIDENCIAL" ? res.areaCalc : null,
                            aV_prop: res.tipoArea === "VIA" ? res.areaCalc : null,
                            tipoArea: res.tipoArea || "RESIDENCIAL" 
                        };
                    }
                    let idx2 = newSelTramos.findIndex(t => t && String(t.de).trim().toLowerCase() === String(res.de).trim().toLowerCase() && String(t.a).trim().toLowerCase() === String(res.a).trim().toLowerCase());
                    if (idx2 !== -1) {
                        newSelTramos[idx2] = {
                            ...newSelTramos[idx2],
                            ...res,
                            area: res.areaCalc,
                            areaParcial: res.areaCalc,
                            areaCalc: res.areaCalc,
                            areaPredCalc: res.areaPredCalc,
                            areaViaCalc: res.areaViaCalc,
                            aR_prop: res.tipoArea === "RESIDENCIAL" ? res.areaCalc : null,
                            aV_prop: res.tipoArea === "VIA" ? res.areaCalc : null,
                            tipoArea: res.tipoArea || "RESIDENCIAL"
                        };
                    } else {
                        newSelTramos.push({
                            ...res,
                            area: res.areaCalc,
                            areaParcial: res.areaCalc,
                            areaCalc: res.areaCalc,
                            areaPredCalc: res.areaPredCalc,
                            areaViaCalc: res.areaViaCalc,
                            aR_prop: res.tipoArea === "RESIDENCIAL" ? res.areaCalc : null,
                            aV_prop: res.tipoArea === "VIA" ? res.areaCalc : null,
                            tipoArea: res.tipoArea || "RESIDENCIAL"
                        });
                    }
                    const ensureGeoJSON = (geom) => {
                        if (!geom) return null;
                        if (geom.type === "Feature") return geom.geometry;
                        if (geom.type) return geom;
                        let isMulti = Array.isArray(geom[0]) && Array.isArray(geom[0][0]) && Array.isArray(geom[0][0][0]) && typeof geom[0][0][0][0] === 'number';
                        if (isMulti) return { type: "MultiPolygon", coordinates: geom };
                        let isPoly = Array.isArray(geom[0]) && Array.isArray(geom[0][0]) && typeof geom[0][0][0] === 'number';
                        if (isPoly) return { type: "Polygon", coordinates: geom };
                        if (Array.isArray(geom[0]) && typeof geom[0][0] === 'number') return { type: "Polygon", coordinates: [geom] };
                        return null;
                    };
                    
                    let geomPred = ensureGeoJSON(res.areaPredPoli);
                    if (geomPred) {
                        features.push({
                            type: "Feature",
                            geometry: geomPred,
                            properties: { id: res.id, isVia: false, isPredio: true }
                        });
                    }
                    
                    let geomVia = ensureGeoJSON(res.areaViaPoli);
                    if (geomVia) {
                        features.push({
                            type: "Feature",
                            geometry: geomVia,
                            properties: { id: res.id, isVia: true }
                        });
                    }
                    
                    let geomPoli = ensureGeoJSON(res.areaPoli);
                    if (geomPoli) {
                        features.push({
                            type: "Feature",
                            geometry: geomPoli,
                            properties: { id: res.id, de: res.de, a: res.a, tramoId: res.de + "-" + res.a, DE: res.de, IDNODO: res.de, isCompleta: true }
                        });
                    }
                    totalArea += res.areaCalc;
                }
                
                // We don't push to App.js state here anymore to avoid freezing with massive GeoJSONs.
                // The injection to CalcTab/DataTab happens exclusively when clicking 'Exportar a AMCaudales'.
                
                let tMap = {};
                resultados.forEach(res => {
                    if (!res) return;
                    tMap[String(res.de).trim().toLowerCase() + "_" + String(res.a).trim().toLowerCase()] = res;
                });

                // Save calculated data to tramosConCoordsRef so exportToApp can access it later!
                if (tramosConCoordsRef.current) {
                    tramosConCoordsRef.current = tramosConCoordsRef.current.map(tc => {
                        if (!tc) return tc;
                        let key = String(tc.de).trim().toLowerCase() + "_" + String(tc.a).trim().toLowerCase();
                        if (tMap[key]) return { ...tc, ...tMap[key] };
                        return tc;
                    });
                }
                
                setSelTramos(newSelTramos);
                setBufferArea(totalArea);
                setBufferPoly(features);  
                
                setIsCalculating(false);
                alert(`Cálculo completado.\nSe procesaron ${resultados.length} tramos.\nÁrea total calculada: ${totalArea.toFixed(4)} Ha.`);
            } catch (err) {
                console.error("Error crítico en cálculo de áreas:", err);
                setIsCalculating(false);
                alert(`Ocurrió un error al calcular las áreas: ${err.message || err}\nRevisa la consola para más detalles.`);
            }
        }, 150);
    };

  const onLoad = React.useCallback(function callback(map) {
      mapRef.current = map;
      setMapLoaded(true);
    }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    try {
      let layerPozos = L.layerGroup();
      let layerTramos = L.featureGroup();
      let pozoMap = {};
      let rData = [];
      
      let esriSat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { 
          attribution: 'Esri Satélite', maxZoom: 24, maxNativeZoom: 19
      });
      let osmCalles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
          attribution: 'OSM Calles', maxZoom: 24, maxNativeZoom: 19
      });
      
      osmCalles.addTo(map);

      let pozosToDraw = [];
      let tramosToDraw = [];
      
      if (inpData && (inpData.pozos || inpData.verts)) {
        console.log("MapTab drawing with inpData:", inpData);
        var sourcePozos = inpData.pozos || inpData.verts;
        pozosToDraw = sourcePozos.map(p => {
           let props = p.properties || p;
           // Prioritize cota_tapa / rasante for cota_terreno (surface elevation)
           let rawCtTerreno = getValCI(props, 'Ctapa', 'cota_tapa', 'CotaTapa', 'CRas1', 'cota_rasante_inicial', 'Cota Rasante (m)', 'Cota Tapa (m)', 'cota rasante', 'cota tapa', 'CotaRasante', 'rasante', 'terreno', 'cota_terreno')
                           || getValCI(p, 'Ctapa', 'cota_tapa', 'CotaTapa', 'CRas1', 'cota_rasante_inicial', 'Cota Rasante (m)', 'Cota Tapa (m)', 'cota rasante', 'cota tapa', 'CotaRasante', 'rasante', 'terreno', 'cota_terreno')
                           || p.cota_terreno || p.rasante_inicial || 0;
           // Prioritize Cfondo / cota_clave / cota_batea for cota_fondo (invert elevation)
           let rawCtFondo   = getValCI(props, 'Cfondo', 'cota_fondo', 'CotaFondo', 'cota_clave_inicial', 'cota_batea_inicial', 'Cota Clave Ini', 'cota clave', 'cota batea', 'Fondo', 'CotaBatea', 'Batea', 'cini')
                           || getValCI(p, 'Cfondo', 'cota_fondo', 'CotaFondo', 'cota_clave_inicial', 'cota_batea_inicial', 'Cota Clave Ini', 'cota clave', 'cota batea', 'Fondo', 'CotaBatea', 'Batea', 'cini')
                           || p.cota_fondo || p.fondo_inicial || p.cota || 0;
           return {
              id: String(props.IdNodo || props.Nombre || props.IDfinal || props.IDNODO || props.id || p.id || "").trim(),
              altId1: String(props.IDNODO || props.Idnodo || p.altId1 || "").trim(),
              altId2: String(props.Nombre || props.nombre || p.altId2 || "").trim(),
              altId3: String(props.IdNodo || props.idnodo || p.altId3 || "").trim(),
              altId4: String(props.id || props.IDfinal || props.fid || p.id || "").trim(),
              x: props.CoordX || props.X || props.coordX || props.coordx || p.x,
              y: props.CoordY || props.Y || props.coordY || props.coordy || p.y,
              cota_terreno: cleanDecimal(rawCtTerreno),
              cota_fondo: cleanDecimal(rawCtFondo)
           };
        });
        if (T && T.length > 0) {
           tramosToDraw = T.filter(t => !t.sep).map(t => ({
              ...t,
              id: t.de + " - " + t.a,
              de: t.de, a: t.a, 
              node0: String(t.deNum || t.de).trim(), node1: String(t.aNum || t.a).trim(),
              material: t.material || "PVC",
              diametro: t.diametroCom || "200",
              longitud: t.longitud || t.L || 0,
              pendiente: t.pendiente || t.P || 0
           }));
        }
      } else if (window.txtPozos && window.txtRedes) {
        let rawPozos = parseUniversalCSV(window.txtPozos);
        pozosToDraw = rawPozos.map(p => {
           let props = p.properties || p;
           let rawCtTerreno = getValCI(props, 'Ctapa', 'cota_tapa', 'CotaTapa', 'CRas1', 'cota_rasante_inicial', 'Cota Rasante (m)', 'Cota Tapa (m)', 'cota rasante', 'cota tapa', 'CotaRasante', 'rasante', 'terreno', 'cota_terreno')
                           || getValCI(p, 'Ctapa', 'cota_tapa', 'CotaTapa', 'CRas1', 'cota_rasante_inicial', 'Cota Rasante (m)', 'Cota Tapa (m)', 'cota rasante', 'cota tapa', 'CotaRasante', 'rasante', 'terreno', 'cota_terreno')
                           || p.cota_terreno || p.rasante_inicial || 0;
           let rawCtFondo   = getValCI(props, 'Cfondo', 'cota_fondo', 'CotaFondo', 'cota_clave_inicial', 'cota_batea_inicial', 'Cota Clave Ini', 'cota clave', 'cota batea', 'Fondo', 'CotaBatea', 'Batea', 'cini')
                           || getValCI(p, 'Cfondo', 'cota_fondo', 'CotaFondo', 'cota_clave_inicial', 'cota_batea_inicial', 'Cota Clave Ini', 'cota clave', 'cota batea', 'Fondo', 'CotaBatea', 'Batea', 'cini')
                           || p.cota_fondo || p.fondo_inicial || p.cota || 0;
           return {
              ...p,
              id: String(props.IdNodo || props.Nombre || props.IDfinal || props.IDNODO || props.id || p.id || "").trim(),
              altId1: String(props.IDNODO || props.Idnodo || p.altId1 || "").trim(),
              altId2: String(props.Nombre || props.nombre || p.altId2 || "").trim(),
              altId3: String(props.IdNodo || props.idnodo || p.altId3 || "").trim(),
              altId4: String(props.id || props.IDfinal || props.fid || p.id || "").trim(),
              x: cleanCoordinate(props.CoordX || props.X || props.coordX || props.coordx || p.x || 0),
              y: cleanCoordinate(props.CoordY || props.Y || props.coordY || props.coordy || p.y || 0),
              cota_terreno: cleanDecimal(rawCtTerreno),
              cota_fondo: cleanDecimal(rawCtFondo)
           };
        });
        tramosToDraw = parseUniversalCSV(window.txtRedes).map(t => {
            let props = t.properties || t;
            let deVal = props.de || props.DE || props.de1 || props.DE1 || props.node0 || props.deNum || "";
            let aVal = props.a || props.A || props.a1 || props.A1 || props.node1 || props.aNum || "";
            
            t.de = String(deVal).trim();
            t.a = String(aVal).trim();
            t.node0 = t.de;
            t.node1 = t.a;
            
            if (!t.de || !t.a) {
                if (t.id && t.id.includes(" / ")) {
                    let parts = t.id.split(" / ");
                    t.node0 = parts[0].trim();
                    t.node1 = parts[1].trim();
                    t.de = t.node0;
                    t.a = t.node1;
                } else if (props.id && props.id.includes(" / ")) {
                    let parts = props.id.split(" / ");
                    t.node0 = parts[0].trim();
                    t.node1 = parts[1].trim();
                    t.de = t.node0;
                    t.a = t.node1;
                }
            }
            t.longitud = cleanDecimal(props.longitud || props.long || props.L || t.longitud || 0);
            t.pendiente = cleanDecimal(props.pendiente || props.pend || props.S || props.P || t.pendiente || 0);
            t.material = props.material || t.material || "PVC";
            t.diametro = props.diametro || props.diam || t.diametro || "200";
            return t;
        });
      }

      if (pozosToDraw.length > 0 && tramosToDraw.length > 0) {
        pozosToDraw.forEach(p => {
          if (p.x && p.y) {
            try {
              const wgs84 = projectToLatLng(parseNum(p.x), parseNum(p.y));
              if (wgs84 && !isNaN(wgs84[0]) && !isNaN(wgs84[1])) {
                p.lat = wgs84[1]; p.lng = wgs84[0];
                if(p.id) pozoMap[p.id] = p;
                if(p.altId1) pozoMap[p.altId1] = p;
                if(p.altId2) pozoMap[p.altId2] = p;
                if(p.altId3) pozoMap[p.altId3] = p;
                if(p.altId4) pozoMap[p.altId4] = p;
                L.circleMarker([p.lat, p.lng], { radius: 4, color: '#f97316', fillColor: '#f97316', fillOpacity: 0.8, pmIgnore: true }).bindTooltip("<b>Pozo:</b> " + p.id + "<br><b>Cota Rasante:</b> " + p.cota_terreno.toFixed(2) + "<br><b>Cota Fondo:</b> " + p.cota_fondo.toFixed(2), { permanent: false, sticky: true }).addTo(layerPozos);
              }
            } catch(e){}
          }
        });

        rData = tramosToDraw;
        let allKeys = Object.keys(pozoMap);
        let lowerPozoMap = {};
        allKeys.forEach(k => {
           lowerPozoMap[k.toLowerCase()] = pozoMap[k];
        });
        
        let matchedCount = 0;
        
        rData.forEach(r => {
            let sId = String(r.node0 || "").trim();
            let eId = String(r.node1 || "").trim();
            let sDe = String(r.de || "").trim();
            let eA = String(r.a || "").trim();
            
            let s = pozoMap[sId] || pozoMap[sId.replace(/\s/g,'')] || pozoMap[sDe] || pozoMap[sDe.replace(/\s/g,'')];
            let e = pozoMap[eId] || pozoMap[eId.replace(/\s/g,'')] || pozoMap[eA] || pozoMap[eA.replace(/\s/g,'')];
            
            if (!s || !e) {
               if (!s) s = lowerPozoMap[sId.toLowerCase()] || lowerPozoMap[sDe.toLowerCase()];
               if (!e) e = lowerPozoMap[eId.toLowerCase()] || lowerPozoMap[eA.toLowerCase()];
            }
            
            if (s && e && s.lat !== undefined && s.lng !== undefined && e.lat !== undefined && e.lng !== undefined && !isNaN(s.lat) && !isNaN(e.lat)) {
              r.coords = [[s.lat, s.lng], [e.lat, e.lng]];
              r.cotaRasante = cleanDecimal(
                  r.CRas1 !== undefined && r.CRas1 !== null && String(r.CRas1).trim() !== "" ? r.CRas1 :
                  (r.properties && r.properties.CRas1 !== undefined && r.properties.CRas1 !== null && String(r.properties.CRas1).trim() !== "" ? r.properties.CRas1 :
                  (r.cotaRasante !== undefined && r.cotaRasante !== null && r.cotaRasante !== "" ? r.cotaRasante : 
                  (s.cota_terreno || getValCI(s, 'Ctapa', 'CotaTapa', 'cota', 'CotaRasante', 'cras1', 'rasante', 'terreno', 'cota_terreno') || (s.properties && getValCI(s.properties, 'Ctapa', 'CotaTapa', 'cota', 'CotaRasante', 'cras1', 'rasante', 'terreno', 'cota_terreno')) || s.cota || r.cota_ini || r.rasante_inicial || 0))));
              
              r.cotaRasanteA = cleanDecimal(
                  r.CRas2 !== undefined && r.CRas2 !== null && String(r.CRas2).trim() !== "" ? r.CRas2 :
                  (r.properties && r.properties.CRas2 !== undefined && r.properties.CRas2 !== null && String(r.properties.CRas2).trim() !== "" ? r.properties.CRas2 :
                  (r.cotaRasanteA !== undefined && r.cotaRasanteA !== null && r.cotaRasanteA !== "" ? r.cotaRasanteA : 
                  (e.cota_terreno || getValCI(e, 'Ctapa', 'CotaTapa', 'cota', 'CotaRasante', 'cras2', 'rasante', 'terreno', 'cota_terreno') || (e.properties && getValCI(e.properties, 'Ctapa', 'CotaTapa', 'cota', 'CotaRasante', 'cras2', 'rasante', 'terreno', 'cota_terreno')) || e.cota || r.cota_fin || r.rasante_final || 0))));
              r.cotaFondo = cleanDecimal(r.cotaFondo !== undefined && r.cotaFondo !== null && r.cotaFondo !== "" ? r.cotaFondo : (s.cota_fondo || getValCI(s, 'Cfondo', 'CotaFondo', 'cota_fondo', 'Fondo', 'CotaBatea', 'Batea', 'cini', 'cfin') || (s.properties && getValCI(s.properties, 'Cfondo', 'CotaFondo', 'cota_fondo', 'Fondo', 'CotaBatea', 'Batea', 'cini', 'cfin')) || s.fondo_inicial || r.fondo_inicial || 0));
              r.fondo_inicial = r.cotaFondo;
              
              let fallbackCFA = r.cotaFondoA !== undefined && r.cotaFondoA !== null && r.cotaFondoA !== "" ? r.cotaFondoA : (r.fondo_final !== undefined && r.fondo_final !== null && r.fondo_final !== "" ? r.fondo_final : (r.cfA !== undefined && r.cfA !== null && r.cfA !== "" ? r.cfA : undefined));
              if (fallbackCFA !== undefined) {
                  r.fondo_final = cleanDecimal(fallbackCFA);
              } else {
                  r.fondo_final = cleanDecimal(e.cota_fondo || getValCI(e, 'Cfondo', 'CotaFondo', 'cota_fondo', 'Fondo', 'CotaBatea', 'Batea', 'cini', 'cfin') || (e.properties && getValCI(e.properties, 'Cfondo', 'CotaFondo', 'cota_fondo', 'Fondo', 'CotaBatea', 'Batea', 'cini', 'cfin')) || e.fondo_final || 0);
              }
              r.cotaFondoA = r.fondo_final;
              
              let pl = L.polyline(r.coords, { color: '#3b82f6', weight: 3, pmIgnore: true });
              let lengthVal = r.L !== undefined ? r.L : (r.longitud || 0);
              let slopeVal = r.S !== undefined ? r.S : (r.pendiente || 0);
              let matVal = String(r.material || r.material_1 || "PVC").toUpperCase();
              let diamVal = String(r.diametroCom || r.diametro || "200").trim();
              let dVis = formatDiam(diamVal, matVal);
              
              let tEst = r.estacion || r.IDESTACION || r.NOM_EST || r.Estacion || (r.properties && (r.properties.estacion || r.properties.IDESTACION || r.properties.NOM_EST));
              let tDen = getDen(r);
              if (r.coords && r.coords.length >= 2) {
                  let lng = (r.coords[0][1] + r.coords[r.coords.length-1][1]) / 2;
                  let lat = (r.coords[0][0] + r.coords[r.coords.length-1][0]) / 2;
                  let midPt = [lng, lat];
                  if (!tEst && typeof txtEstaciones !== 'undefined') tEst = findValueInWKT(txtEstaciones, midPt, 3);
                  if (tDen === undefined && typeof jsonDensidades !== 'undefined') {
                      let denVal = findValueInGeoJSON(jsonDensidades, midPt);
                      if (denVal) tDen = parseFloat(denVal);
                  }
              }
              let estStr = tEst !== undefined ? String(tEst).trim() : "N/A";
              let denStr = tDen !== undefined ? Number(tDen).toFixed(0) : "N/A";

              pl.bindTooltip("<b>Tramo:</b> " + r.de + " - " + r.a + "<br><b>Longitud:</b> " + Number(lengthVal).toFixed(2) + " m<br><b>Pendiente:</b> " + Number(slopeVal).toFixed(4) + " m/m<br><b>Diámetro:</b> " + dVis + "<br><b>C.Ras.DE:</b> " + r.cotaRasante.toFixed(2) + "<br><b>C.Ras.A:</b> " + r.cotaRasanteA.toFixed(2) + "<br><b>C.Fon.DE:</b> " + r.cotaFondo.toFixed(2) + "<br><b>C.Fon.A:</b> " + r.fondo_final.toFixed(2) + "<br><b>Estación:</b> " + estStr + "<br><b>Densidad:</b> " + denStr, { permanent: false, sticky: true });
              pl.on('click', (evt) => {
                let shiftPressed = evt.originalEvent && evt.originalEvent.shiftKey;
                let ctrlPressed = evt.originalEvent && (evt.originalEvent.ctrlKey || evt.originalEvent.metaKey);
                handlePipeClick(r, shiftPressed, ctrlPressed, rData, pozoMap, pl);
                L.DomEvent.stopPropagation(evt); 
              });
              pl.addTo(layerTramos);
              matchedCount++;
            }
        });
        tramosConCoordsRef.current = rData;
        pozosDrawnRef.current = pozosToDraw;
        
        try {
          let bounds = layerTramos.getBounds();
          if(bounds.isValid()) {
              mapBoundsRef.current = bounds;
              map.fitBounds(bounds);
          } else if (layerPozos.getBounds) {
              let pBounds = layerPozos.getBounds();
              if(pBounds.isValid()) {
                  mapBoundsRef.current = pBounds;
                  map.fitBounds(pBounds);
              }
          }
        } catch(e) {}
      }

      let layerAreasAferentes = L.featureGroup();
      if (inpData && inpData.verts && inpData.verts.length > 0) {
          let groupedVerts = {};
          inpData.verts.forEach(v => {
              let nid = String(v.IDNODO || v.Subcatchment || v.Nombre || "");
              if (!nid) return;
              if (!groupedVerts[nid]) groupedVerts[nid] = [];
              if (v.CoordX && v.CoordY) groupedVerts[nid].push(v);
          });

          for (let nid in groupedVerts) {
              let pts = groupedVerts[nid];
              let latlngs = [];
              pts.forEach(p => {
                  try {
                     let wgs84 = projectToLatLng(parseNum(p.CoordX), parseNum(p.CoordY));
                     if (wgs84 && !isNaN(wgs84[0]) && !isNaN(wgs84[1])) {
                         latlngs.push([wgs84[1], wgs84[0]]);
                     }
                  } catch(e){}
              });
              if (latlngs.length >= 3) {
                  let adProps = inpData.ad ? inpData.ad.find(a => String(a.IDNODO || a.Subcatchment || a.Nombre || "") === nid) : null;
                  let isVia = adProps && adProps.TIPOCUENCA === "VIA";
                  let poly = L.polygon(latlngs, {
                      color: isVia ? "#808080" : "#A06010",
                      fillColor: isVia ? "#C8C8C8" : "#E8A020",
                      weight: 1, fillOpacity: 0.4,
                      nid: nid
                  });
                  if(adProps) {
                     poly.bindTooltip(`Área Aferente: ${nid}<br>Hectáreas: ${adProps.AREACUENCA} Ha<br>Tipo: ${adProps.TIPOCUENCA}`);
                  }
                  poly.addTo(layerAreasAferentes);

                  let sub = inpData.subcatchments ? inpData.subcatchments.find(s => String(s.Name).trim() === String(nid).trim()) : null;
                  let outlet = sub ? sub.Outlet : null;
                  if (outlet) {
                      let center = poly.getBounds().getCenter();
                      let icon = L.divIcon({className: 'area-outlet-label', html: outlet, iconSize: [0,0]});
                      L.marker(center, {icon: icon, pmIgnore: true}).addTo(layerAreasAferentes);
                  }
              }
          }
          layerAreasAferentes.addTo(map);
      }
      
      let layerDensidades = L.featureGroup();
      if (typeof jsonDensidades !== 'undefined') {
          let den = L.geoJSON(jsonDensidades, {
              pmIgnore: true,
              style: function(feature) {
                  return { color: "#10b981", weight: 2, fillOpacity: 0.1, dashArray: "5,5" };
              },
              onEachFeature: function(feature, layer) {
                  if (feature.properties) {
                      layer.bindTooltip("Densidad: " + (feature.properties.DENSIDAD || feature.properties.D2024 || "N/A"));
                  }
              }
          });
          den.addTo(layerDensidades);
      }

      let layerThiessen = L.featureGroup();
      if (typeof txtEstaciones !== 'undefined') {
          let lineas = txtEstaciones.trim().split('\n').slice(1);
          let features = [];
          lineas.forEach(lin => {
              if(!lin) return;
              let parts = lin.split(';');
              let wkt = parts[0];
              let nom = parts[3];
              let coordsMatch = wkt.match(/\(\(\((.*)\)\)\)/);
              if (coordsMatch) {
                  let points = coordsMatch[1].split(',').map(p => {
                      let xy = p.trim().split(/\s+/);
                      let x = parseFloat(xy[0]);
                      let y = parseFloat(xy[1]);
                      return projectToLatLng(x, y);
                  });
                  features.push({
                      type: "Feature",
                      properties: { NOM_EST: nom },
                      geometry: { type: "Polygon", coordinates: [points] }
                  });
              }
          });

          if (features.length > 0) {
              let est = L.geoJSON({ type: "FeatureCollection", features: features }, {
                  pmIgnore: true,
                  style: function(feature) {
                      return { color: "#8b5cf6", weight: 2, fillOpacity: 0.1, dashArray: "4,8" };
                  },
                  onEachFeature: function(feature, layer) {
                      if (feature.properties) {
                          layer.bindTooltip("Estación: " + (feature.properties.NOM_EST || "N/A"));
                      }
                  }
              });
              est.addTo(layerThiessen);
          }
      }

      let layerControl = L.control.layers(
          { "Calles": osmCalles, "Satélite": esriSat },
          { "Pozos": layerPozos, "Redes": layerTramos, "Densidades": layerDensidades, "Thiessen IDF": layerThiessen, "Áreas Aferentes": layerAreasAferentes },
          { position: 'topright' }
      ).addTo(map);

      return () => {
        try {
          map.removeControl(layerControl);
          map.removeLayer(osmCalles);
          map.removeLayer(esriSat);
          map.removeLayer(layerPozos);
          map.removeLayer(layerTramos);
          map.removeLayer(layerDensidades);
          map.removeLayer(layerThiessen);
          map.removeLayer(layerAreasAferentes);
        } catch(er) {}
      };

    } catch (err) {
      console.error(err);
      window.alert("Crash en el Visor: " + err.message + "\nLinea: " + err.stack);
    }
  }, [mapLoaded, inpData]); 

  const traceUpstream = (startPipe, allPipes, pozoMap) => {
    let idx_tocan = {};
    let tramos = {};
    allPipes.forEach((seg, index) => {
        let segId = seg.id || "pipe_"+index;
        if (!idx_tocan[seg.node0]) idx_tocan[seg.node0] = [];
        if (!idx_tocan[seg.node1]) idx_tocan[seg.node1] = [];
        idx_tocan[seg.node0].push(segId);
        idx_tocan[seg.node1].push(segId);

        let z0 = parseFloat(seg.fondo_inicial);
        if (!z0 || isNaN(z0)) { z0 = (pozoMap[seg.node0] ? parseFloat(pozoMap[seg.node0].cota) : 0.0); }
        let z1 = parseFloat(seg.fondo_final);
        if (!z1 || isNaN(z1)) { z1 = (pozoMap[seg.node1] ? parseFloat(pozoMap[seg.node1].cota) : 0.0); }

        tramos[segId] = {
            raw_seg: seg,
            id: segId,
            raw_0: { id: seg.node0, z: z0 || 0.0 },
            raw_1: { id: seg.node1, z: z1 || 0.0 },
            L: parseFloat(seg.longitud) || 0
        };
    });

    let pq = new MinHeap();
    let encontrados = {};
    let resultPipes = [];

    let startId = startPipe.id || "pipe_"+allPipes.indexOf(startPipe);
    if (tramos[startId]) {
        let t = tramos[startId];
        if (t.raw_0.z > t.raw_1.z) { t.up = t.raw_0; t.dn = t.raw_1; } 
        else { t.up = t.raw_1; t.dn = t.raw_0; }
        
        encontrados[startId] = t;
        pq.push({ z: t.up.z, nodeId: t.up.id, pathLen: t.L });
        resultPipes.push(t.raw_seg);
    }

    while (pq.length > 0) {
        let act = pq.pop();
        let z_ref_recibo = act.z;
        let N_act = act.nodeId;
        let actPathLen = act.pathLen;

        let conexos = idx_tocan[N_act] || [];
        for (let p_id of conexos) {
            if (encontrados[p_id]) continue;
            let t = tramos[p_id];
            let con_idx = (t.raw_0.id === N_act) ? 0 : 1;
            let con = (con_idx === 0) ? t.raw_0 : t.raw_1;
            let rem = (con_idx === 0) ? t.raw_1 : t.raw_0;
            
            let cota_entrega = con.z;
            let cota_origen = rem.z;
            let cota_recibo = z_ref_recibo;
            
            let es_aguas_arriba = false;
            if (cota_origen > 1.0 && cota_entrega > 1.0) {
                if (cota_origen >= cota_entrega) es_aguas_arriba = true;
            } else {
                if (con_idx === 1) es_aguas_arriba = true;
            }

            if (!es_aguas_arriba) continue;

            let es_valido = false;
            if (cota_entrega > 1.0 && cota_recibo > 1.0) {
                if (cota_entrega >= cota_recibo) es_valido = true;
            } else if (cota_origen > 1.0 && cota_recibo > 1.0) {
                if (cota_origen >= cota_recibo) es_valido = true;
            } else {
                es_valido = true;
            }

            if (es_valido) {
                t.up = rem;
                t.dn = con;
                encontrados[p_id] = t;

                let newPathLen = actPathLen + t.L;
                pq.push({ z: rem.z, nodeId: rem.id, pathLen: newPathLen });
                resultPipes.push(t.raw_seg);
            }
        }
    }
    let hijos = {};
    let padre = {};
    
    Object.keys(encontrados).forEach(p_id => {
        hijos[p_id] = [];
    });
    
    Object.entries(encontrados).forEach(([p_id, t]) => {
        let incoming = Object.keys(encontrados).filter(u_id => encontrados[u_id].dn.id === t.up.id);
        hijos[p_id] = incoming;
        incoming.forEach(inc => {
            padre[inc] = p_id;
        });
    });

    let max_L_up = {};
    let visiting = new Set();
    const calc_max_L = (pid) => {
        if (max_L_up[pid] !== undefined) return max_L_up[pid];
        if (visiting.has(pid)) {
            return encontrados[pid].L; // Cycle breaker
        }
        visiting.add(pid);
        if (!hijos[pid] || hijos[pid].length === 0) {
            max_L_up[pid] = encontrados[pid].L;
            visiting.delete(pid);
            return max_L_up[pid];
        }
        let childrenLengths = hijos[pid].map(u => calc_max_L(u));
        let m_len = encontrados[pid].L + (childrenLengths.length > 0 ? Math.max(...childrenLengths) : 0);
        max_L_up[pid] = m_len;
        visiting.delete(pid);
        return m_len;
    };

    Object.keys(encontrados).forEach(pid => calc_max_L(pid));

    let outfall_pipes = Object.keys(encontrados).filter(pid => !padre[pid]);
    outfall_pipes.sort((a, b) => max_L_up[a] - max_L_up[b]);

    let orden_final = [];
    let visited_post = new Set();
    
    const post_order = (pid) => {
        if (visited_post.has(pid)) return;
        visited_post.add(pid);
        let ups = [...hijos[pid]].sort((a, b) => max_L_up[a] - max_L_up[b]);
        ups.forEach((u, i) => {
            post_order(u);
            if (i < ups.length - 1) {
                orden_final.push(null);
            }
        });
        orden_final.push(encontrados[pid].raw_seg);
    };

    outfall_pipes.forEach(out_p => {
        if (orden_final.length > 0) orden_final.push(null);
        post_order(out_p);
    });

    return orden_final;
  };

  const handlePipeClick = (pipeInfo, shiftPressed, ctrlPressed, allPipes, pozoMap, plLayer) => {
    let doTrace = shiftPressed || traceModeRef.current;
    let toSelect = doTrace ? traceUpstream(pipeInfo, allPipes, pozoMap) : [pipeInfo];
    
    setSelTramos(prev => {
        let currentValid = prev.filter(t => t !== null);
        let newSel = ctrlPressed ? [...currentValid, null, ...toSelect] : toSelect;
        
        // Evitar duplicados exactos si el usuario da clic repetido
        let uniqueSel = [];
        let seen = new Set();
        newSel.forEach(t => {
            if (t === null) {
                uniqueSel.push(null);
            } else {
                let key = t.de + "_" + t.a;
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueSel.push(t);
                }
            }
        });
        
        let validTramos = uniqueSel.filter(t => t !== null);
        
        setTimeout(() => {
            generarBuffer(validTramos, radio);
            calcularTc(validTramos);
            
            if (mapRef.current) {
                if (selLinesLayerRef.current) mapRef.current.removeLayer(selLinesLayerRef.current);
                let fg = L.featureGroup();
                let drawnPozos = new Set();

                validTramos.forEach(tr => {
                    if(tr.coords) {
                        let pl = L.polyline(tr.coords, {color: '#ef4444', weight: 6, pmIgnore: true});
                        let matTr = String(tr.material || tr.material_1 || "PVC").toUpperCase();
                        let dRawTr = String(tr.diametroCom || tr.diametro || "200").trim();
                        let dVisTr = formatDiam(dRawTr, matTr);
                        let pipeLabel = `L:${Number(tr.longitud||0).toFixed(1)}m D:${dVisTr} P:${Number(tr.pendiente||0).toFixed(2)}%`;
                        pl.bindTooltip(pipeLabel, {permanent: true, direction: "center", className: "sel-pipe-label"});
                        pl.addTo(fg);

                        let pDe = pozoMap ? (pozoMap[tr.node0] || pozoMap[tr.de]) : null;
                        let pA = pozoMap ? (pozoMap[tr.node1] || pozoMap[tr.a]) : null;

                        if (pDe && !drawnPozos.has(pDe.id)) {
                           drawnPozos.add(pDe.id);
                           L.circleMarker([pDe.lat, pDe.lng], {radius: 5, color: '#991b1b', fillColor: '#fca5a5', fillOpacity:1, pmIgnore: true})
                             .bindTooltip(pDe.id, {permanent: true, direction: 'right', className: 'sel-pozo-label'}).addTo(fg);
                        }
                        if (pA && !drawnPozos.has(pA.id)) {
                           drawnPozos.add(pA.id);
                           L.circleMarker([pA.lat, pA.lng], {radius: 5, color: '#991b1b', fillColor: '#fca5a5', fillOpacity:1, pmIgnore: true})
                             .bindTooltip(pA.id, {permanent: true, direction: 'right', className: 'sel-pozo-label'}).addTo(fg);
                        }
                    }
                });
                fg.addTo(mapRef.current);
                selLinesLayerRef.current = fg;
            }
        }, 0);
        
        return uniqueSel;
    });
  };

  const calcularTc = (tramos) => {
    if(!tramos || tramos.length === 0) return;
    let sumL = 0;
    let sElev = -1, eElev = -1;
    tramos.forEach(tr => {
      if(!tr || tr.sep) return;
      sumL += tr.longitud || 0;
      if(tr.fondo_inicial > sElev) sElev = tr.fondo_inicial;
      if(eElev === -1 || tr.fondo_final < eElev) eElev = tr.fondo_final;
    });
    
    let drop = sElev - eElev;
    let S = (sumL>0 && drop>0) ? drop/sumL : 0.01;
    let tc_kir = 0.01947 * Math.pow(sumL, 0.77) * Math.pow(S, -0.385);
    setTcVal(tc_kir.toFixed(2));
  };

  const generarBuffer = (tramos, rMeters) => {
    let polys = [];
    tramos.forEach(tr => {
      if(!tr || !tr.coords) return;
      let pStart = {lng: tr.coords[0][1], lat: tr.coords[0][0]};
      let pEnd = {lng: tr.coords[1][1], lat: tr.coords[1][0]};

      let c0 = projectToMeters(pStart.lng, pStart.lat);
      let c1 = projectToMeters(pEnd.lng, pEnd.lat);
      let x0 = c0[0], y0 = c0[1], x1 = c1[0], y1 = c1[1];
      let ddx = x1 - x0, ddy = y1 - y0;
      let lon = Math.hypot(ddx, ddy);
      if (lon === 0) return;

      let dx = ddx/lon, dy = ddy/lon, px = -dy, py = dx;
      let frac = frac_zona_plana(lon);
      let t1 = lon*frac, t2 = lon*(1.0-frac);
      let verts = [];

      if (frac === 0.0) {
        let midX = x0 + dx*lon*0.5, midY = y0 + dy*lon*0.5;
        verts.push([x0, y0]);
        verts.push([midX + px*rMeters, midY + py*rMeters]);
        verts.push([x1, y1]);
        verts.push([midX - px*rMeters, midY - py*rMeters]);
      } else {
        let m1x = x0+dx*t1, m1y = y0+dy*t1;
        let m2x = x0+dx*t2, m2y = y0+dy*t2;
        verts.push([x0, y0]);
        verts.push([m1x + px*rMeters, m1y + py*rMeters]);
        verts.push([m2x + px*rMeters, m2y + py*rMeters]);
        verts.push([x1, y1]);
        verts.push([m2x - px*rMeters, m2y - py*rMeters]);
        verts.push([m1x - px*rMeters, m1y - py*rMeters]);
      }

      let latlngsPoly = verts.map(v => {
        let ll = projectToLatLng(v[0], v[1]);
        return [ll[0], ll[1]];
      });

      if (latlngsPoly.length >= 3) {
        let turfCoords = latlngsPoly.map(ll => [ll[0], ll[1]]);
        turfCoords.push(turfCoords[0]);
        try { polys.push(turf.polygon([turfCoords])); } catch(e){}
      }
    });

    if (polys.length === 0) {
      setBufferPoly([]); setBufferArea(0); return;
    }
    
    let finalGeoJSON = polys[0];
    for (let i = 1; i < polys.length; i++) {
      try {
        let unionRes = turf.union(turf.featureCollection([finalGeoJSON, polys[i]]));
        if (unionRes) finalGeoJSON = unionRes;
      } catch(e){}
    }

    let rings = [];
    if (finalGeoJSON.geometry.type === 'Polygon') {
        finalGeoJSON.geometry.coordinates.forEach(ring => rings.push(ring));
    } else if (finalGeoJSON.geometry.type === 'MultiPolygon') {
        finalGeoJSON.geometry.coordinates.forEach(poly => poly.forEach(ring => rings.push(ring)));
    }
    setBufferPoly(rings);
    let areaHa = turf.area(finalGeoJSON) / 10000;
    setBufferArea(areaHa);
  };

  const setupCartoLayer = (features) => {
      if (mapRef.current) {
          if(cartoLayerRef.current) mapRef.current.removeLayer(cartoLayerRef.current);
          cartoLayerRef.current = L.geoJSON(features, {
              renderer: L.canvas({ padding: 0.5 }),
              interactive: false,
              pmIgnore: true, // EVITAR FREEZE DE GEOMAN
              style: function(feature) {
                  let isVia = feature.properties && feature.properties.TIPOCUENCA === "VIA";
                  return { color: isVia ? "#808080" : "#8b5cf6", weight: 1, fillOpacity: isVia ? 0.3 : 0.1 };
              }
          });
          if(verCartografia) cartoLayerRef.current.addTo(mapRef.current);
          alert(`Se cargaron ${features.length} polígonos en el mapa.`);
      }
  };
  const handleCargarCartografia = async (e) => {
    let f = e.target.files[0];
    if(!f) return;
    try {
        if(f.name.toLowerCase().endsWith('.zip')) {
            let buffer = await f.arrayBuffer();
            let geojson = await shp(buffer);
            let features = [];
            if (Array.isArray(geojson)) {
                geojson.forEach(g => {
                     if (g.features) features = features.concat(g.features);
                });
            } else if (geojson.features) {
                features = geojson.features;
            }
            setCartografia(features);
            setupCartoLayer(features);
        } else {
           let reader = new FileReader();
           reader.onload = (ev) => {
              try {
                  let res = ev.target.result;
                  if(res.includes("=")) {
                      res = res.substring(res.indexOf("=") + 1).trim();
                      if(res.endsWith(";")) res = res.substring(0, res.length - 1);
                  }
                  let data = JSON.parse(res);
                  let features = data.features || [];
                  setCartografia(features);
                  setupCartoLayer(features);
              } catch(e) { alert("Error leyendo el archivo: " + e.message); }
           };
           reader.readAsText(f);
        }
    } catch(err) {
        console.error(err);
        alert("Error procesando cartografía: " + err.message);
    }
  };

  const matchTramo = (a, b) => {
    if (!a || !b || a.sep || b.sep) return false;
    let aId = String(a.id || "").trim();
    let bId = String(b.id || "").trim();
    if (aId !== "" && bId !== "" && aId === bId) return true;
    
    let aDe = String(a.de || a.node0 || "").trim().toLowerCase();
    let bDe = String(b.de || b.node0 || "").trim().toLowerCase();
    let aA = String(a.a || a.node1 || "").trim().toLowerCase();
    let bA = String(b.a || b.node1 || "").trim().toLowerCase();
    
    if (aDe !== "" && bDe !== "" && aDe === bDe) {
        if (aA !== "" && bA !== "" && aA === bA) return true;
        return true; 
    }
    return false;
  };

  const exportToApp = (onlySelection = false) => {
    let injectedAreas = new Set();
    let baseT = (T && T.length > 0) ? [...T] : [];
    let fullNetwork = (tramosConCoordsRef.current && tramosConCoordsRef.current.length > 0) ? tramosConCoordsRef.current : baseT;
    
    let selectedItems = selTramos.length > 0 ? [...selTramos] : [];
    let itemsToProcess = onlySelection && selectedItems.length > 0 ? selectedItems : fullNetwork;
    let sourceMap = {};
    selectedItems.forEach(st => {
        if (st && st.de && st.a) {
            sourceMap[String(st.de).trim() + "_" + String(st.a).trim()] = st;
        }
    });

    let newVerts = [];
    let newTr = [];
    let newPozosMap = {};
    let foundGlobalEst = null;
    let foundGlobalDen = null;
    let foundGlobalCon = null;

    if (inpData && inpData.ad && inpData.ad.length > 0) {
        for (let i = 0; i < inpData.ad.length; i++) {
            let ad = inpData.ad[i];
            let p = ad.properties || ad;
            let est = p.IDESTACION || p.Estacion || p.estacion || p.NOM_EST || ad.IDESTACION || ad.Estacion || ad.estacion || ad.NOM_EST;
            let den = p.DENSIDAD !== undefined ? p.DENSIDAD : (p.densidad !== undefined ? p.densidad : (ad.DENSIDAD !== undefined ? ad.DENSIDAD : ad.densidad));
            let con = p.CONSUMO !== undefined ? p.CONSUMO : (p.consumo !== undefined ? p.consumo : (ad.CONSUMO !== undefined ? ad.CONSUMO : ad.consumo));

            if (est && !foundGlobalEst) foundGlobalEst = est;
            if (den !== undefined && !foundGlobalDen) foundGlobalDen = parseFloat(den);
            if (con !== undefined && !foundGlobalCon) foundGlobalCon = parseFloat(con);
            
            if (foundGlobalEst && foundGlobalDen !== null && foundGlobalCon !== null) break;
        }
    }


    itemsToProcess.forEach(t => {
        if (!t) return;
        let calcT = sourceMap[String(t.de).trim() + "_" + String(t.a).trim()] || t;
        let pts = Array.isArray(t.coords) ? t.coords.map(c => c.lat !== undefined ? [c.lat, c.lng] : c) : [];
        let midPt = pts.length >= 2 ? [ (pts[0][1] + pts[pts.length-1][1])/2, (pts[0][0] + pts[pts.length-1][0])/2 ] : null;
        
        let tEst = calcT.estacion || t.estacion || calcT.IDESTACION || t.IDESTACION || calcT.NOM_EST || t.NOM_EST || calcT.Estacion || t.Estacion || (calcT.properties && (calcT.properties.estacion || calcT.properties.IDESTACION || calcT.properties.NOM_EST)) || (t.properties && (t.properties.estacion || t.properties.IDESTACION || t.properties.NOM_EST));
        if (!tEst && midPt && typeof txtEstaciones !== 'undefined') {
            tEst = findValueInWKT(txtEstaciones, midPt, 3);
        }

        let cDen = getDen(calcT);
        let tDen = cDen !== undefined ? cDen : getDen(t);
        if (tDen === undefined && midPt && typeof jsonDensidades !== 'undefined') {
            let denVal = findValueInGeoJSON(jsonDensidades, midPt);
            if (denVal) tDen = parseFloat(denVal);
        }
        
        let cCon = getCon(calcT);
        let tCon = cCon !== undefined ? cCon : getCon(t);

        if (!foundGlobalEst && tEst) foundGlobalEst = tEst;
        if (tDen !== undefined && parseFloat(tDen) > (foundGlobalDen || 0)) foundGlobalDen = parseFloat(tDen);
        if (!foundGlobalCon && tCon !== undefined) foundGlobalCon = parseFloat(tCon);
    });

    if (setP && (foundGlobalEst || foundGlobalDen || foundGlobalCon)) {
        let newP = Object.assign({}, P);
        if (foundGlobalEst) {
            let estName = String(foundGlobalEst).trim();
            let matchedKey = Object.keys(IDF).find(k => IDF[k].name.toLowerCase() === estName.toLowerCase());
            newP.estacion = matchedKey ? matchedKey : estName;
        }
        if (foundGlobalDen) newP.densidad = Math.ceil(foundGlobalDen);
        if (foundGlobalCon) newP.consumo = foundGlobalCon;
        setP(newP);
    }

    let globalEstToUse = foundGlobalEst || (P && P.estacion !== undefined ? P.estacion : "BUC");
    let globalDenToUse = foundGlobalDen ? Math.ceil(foundGlobalDen) : (P && P.densidad !== undefined ? parseFloat(P.densidad) : 600);
    let globalConToUse = foundGlobalCon || (P && P.consumo !== undefined ? parseFloat(P.consumo) : 140);

    let processed = itemsToProcess.map((t, index) => {
        if (!t || t.sep) return { id: index + 1, sep: true };

        let calcT = sourceMap[String(t.de).trim() + "_" + String(t.a).trim()] || t;

        let pts = Array.isArray(t.coords) ? t.coords.map(c => c.lat !== undefined ? [c.lat, c.lng] : c) : [];
        let midPt = pts.length >= 2 ? [ (pts[0][1] + pts[pts.length-1][1])/2, (pts[0][0] + pts[pts.length-1][0])/2 ] : null;
        
        let tEst = calcT.estacion || t.estacion || calcT.IDESTACION || t.IDESTACION || calcT.NOM_EST || t.NOM_EST || calcT.Estacion || t.Estacion || (calcT.properties && (calcT.properties.estacion || calcT.properties.IDESTACION || calcT.properties.NOM_EST)) || (t.properties && (t.properties.estacion || t.properties.IDESTACION || t.properties.NOM_EST));
        if (!tEst && midPt && typeof txtEstaciones !== 'undefined') tEst = findValueInWKT(txtEstaciones, midPt, 3);

        let cDen = getDen(calcT);
        let tDen = cDen !== undefined ? cDen : getDen(t);
        if (tDen === undefined && midPt && typeof jsonDensidades !== 'undefined') {
            let denVal = findValueInGeoJSON(jsonDensidades, midPt);
            if (denVal) tDen = parseFloat(denVal);
        }

        let cCon = getCon(calcT);
        let tCon = cCon !== undefined ? cCon : getCon(t);

        if (pts.length >= 2) {
           let first = pts[0];
           let last = pts[pts.length - 1];
           let ptMFirst = projectToMeters(first[1] || first.lng, first[0] || first.lat);
           let ptMLast = projectToMeters(last[1] || last.lng, last[0] || last.lat);
           
           let oldPzDe = ((inpData && inpData.pozos) || []).find(p => String(p.IdNodo)===String(t.de) || String(p.IDfinal)===String(t.de) || String(p.Nombre)===String(t.de)) || {};
           newPozosMap[t.de] = { ...oldPzDe, IdNodo: t.de, Nombre: t.de, CoordX: ptMFirst[0], CoordY: ptMFirst[1] };
           let oldPzA = ((inpData && inpData.pozos) || []).find(p => String(p.IdNodo)===String(t.a) || String(p.IDfinal)===String(t.a) || String(p.Nombre)===String(t.a)) || {};
           newPozosMap[t.a] = { ...oldPzA, IdNodo: t.a, Nombre: t.a, CoordX: ptMLast[0], CoordY: ptMLast[1] };
           let oldTr = ((inpData && inpData.tr) || []).find(rt => (String(rt.DE1 || rt.DE || rt.de)===String(t.de)) && (String(rt.A1 || rt.A || rt.a)===String(t.a))) || {};
           newTr.push({ ...oldTr, id_1: (index + 1), id: (index + 1), de: t.de, a: t.a, coords: pts });
        }
        let areaFeature = null;
        if (calcT.areaPoli && (calcT.areaPoli.type === "Polygon" || calcT.areaPoli.type === "MultiPolygon") && calcT.areaPoli.coordinates) {
            areaFeature = { geometry: calcT.areaPoli };
        } else if (calcT.areaPoli && calcT.areaPoli.geometry && calcT.areaPoli.geometry.coordinates) {
            areaFeature = calcT.areaPoli;
        } else if (typeof autoAreasPoly !== 'undefined' && autoAreasPoly && autoAreasPoly.features && autoAreasPoly.features.length > 0) {
            let found = autoAreasPoly.features.find(f => f.properties && String(f.properties.de) === String(t.de) && String(f.properties.a) === String(t.a));
            if (found && found.geometry && found.geometry.coordinates) {
                areaFeature = found;
            }
        }
        if (areaFeature) {
           injectedAreas.add(String(t.de));
           let geom = areaFeature.geometry;
           let rings = geom.type === 'MultiPolygon' ? geom.coordinates[0] : geom.coordinates;
           if (rings && rings.length > 0) {
               rings[0].forEach(pt => {
                   let ptM = projectToMeters(pt[0], pt[1]);
                   newVerts.push({ IDNODO: t.de, DE: String(t.de).trim() + "-" + String(t.a).trim(), SubName: "S" + (index + 1), CoordX: ptM[0], CoordY: ptM[1] });
               });
           }
        }

        let matVal = calcT.material || t.material || "PVC";
        if(typeof matVal === 'string') matVal = matVal.toUpperCase();        
        let dNom = formatDiam(calcT.diametro || t.diametro || 200, matVal);
        let areaParcialVal = 0;
        let areaViaVal = null;
        let tipoArea = calcT.tipoArea || t.tipoArea || "RESIDENCIAL";
        
        if (calcT.areaCalc !== undefined && calcT.areaCalc !== null) {
            if (!incluirVias) {
                areaParcialVal = parseFloat(calcT.areaCalc) || 0;
            } else {
                areaParcialVal = parseFloat(calcT.areaPredCalc) || 0;
                areaViaVal = parseFloat(calcT.areaViaCalc) || 0;
            }
        } else {
            areaParcialVal = parseFloat(calcT.areaParcial || calcT.area || t.areaParcial) || 0;
        }

        let crDE = +(calcT.cotaRasante || calcT.crDE || calcT.cotaRasante_from_datos || t.cotaRasante || 0);
        let crA = +(calcT.cotaRasanteA || calcT.crA || calcT.cotaRasanteA_from_datos || t.cotaRasanteA || 0);
        let cfDE = +(calcT.cotaFondoDE || calcT.cotaFondo || calcT.cfDE || calcT.cotaFondo_from_datos || t.cotaFondoDE || 0);
        let cfA = +(calcT.cotaFondoA || calcT.fondo_final || calcT.cfA || calcT.cotaFondoA_from_datos || t.cotaFondoA || 0);

        // Strip massive GeoJSON objects that freeze the app
        let { areaPoli, areaPredPoli, areaViaPoli, coords, ...safeT } = t;

        return {
            ...safeT,
            L: +(calcT.longitud || calcT.L || t.L || 0), 
            S: +(calcT.pendiente || calcT.S || t.S || 0),
            longitud: +(calcT.longitud || calcT.L || t.longitud || 0),
            pendiente: +(calcT.pendiente || calcT.S || t.pendiente || 0),
            crDE, crA, cotaRasante: crDE, cotaRasanteA: crA,
            cfDE, cfA, cotaFondo: cfDE, cotaFondoDE: cfDE, cotaFondoA: cfA,
            diametroCom: dNom, 
            diamOrig: dNom,
            material: matVal,
            matOrig: matVal,
            areaParcial: areaParcialVal, 
            tipoArea: tipoArea,
            aR_prop: tipoArea === "RESIDENCIAL" ? areaParcialVal : null,
            aC_prop: tipoArea === "COMERCIAL" ? areaParcialVal : null,
            aI_prop: tipoArea === "INDUSTRIAL" ? areaParcialVal : null,
            aIn_prop: tipoArea === "INSTITUCIONAL" ? areaParcialVal : null,
            aV_prop: areaViaVal !== null ? areaViaVal : (tipoArea === "VIA" ? areaParcialVal : null),
            aRe_prop: tipoArea === "RECREACIONAL" ? areaParcialVal : null,
            reponer: calcT.reponer || t.reponer || "S",
            tipoVia: calcT.tipoVia || t.tipoVia || "FX",
            pavAncho: calcT.pavAncho || t.pavAncho || "S",
            pozoNuevo: calcT.pozoNuevo || t.pozoNuevo || "N",
            tipoPozo: calcT.tipoPozo || t.tipoPozo || "M",
            material: calcT.material || t.material || "PVC",
            coefEscorrentia: (calcT.coefEscorrentia !== undefined ? parseFloat(calcT.coefEscorrentia) : (t.coefEscorrentia !== undefined ? parseFloat(t.coefEscorrentia) : ((P && P.coefEscorrentia !== undefined) ? parseFloat(P.coefEscorrentia) : 0.75))),
            densidad: tDen !== undefined ? parseFloat(tDen) : globalDenToUse,
            consumo: tCon !== undefined ? parseFloat(tCon) : globalConToUse,
            estacion: tEst !== undefined ? String(tEst).trim() : globalEstToUse
        };
    });


    if (setInpData) {
        let finalPozos = Object.values(newPozosMap);
        let updatedInpData = { ...inpData, pozos: finalPozos, verts: newVerts, tr: newTr, isAutoAreasApplied: true };
        setInpData(updatedInpData);
    }

    sT(topoSort(processed));
    if(setTab) setTab("calc");
    alert("¡Red y Áreas Inyectadas a AMCaudales!");
};

const handleExportPolygonVertices = () => {
      let csvContent = "Subcatchment,X-Coord,Y-Coord\n";
      let hasData = false;
      
      // 1. Export from INP data if available
      if (inpData && inpData.verts && inpData.verts.length > 0) {
          inpData.verts.forEach(v => {
              csvContent += `${v.SubName || v.Nombre || v.IDNODO},${v.CoordX},${v.CoordY}\n`;
              hasData = true;
          });
      } 
      // 2. Or from generated buffer/voronoi polygons
      else if (bufferPoly && bufferPoly.length > 0) {
          bufferPoly.forEach(feat => {
              if (feat.geometry && feat.geometry.type === 'Polygon') {
                  let subName = "S" + (feat.properties.id || feat.properties.IdNodo || feat.properties.Nombre || "");
                  feat.geometry.coordinates[0].forEach(coord => {
                      csvContent += `${subName},${coord[0].toFixed(2)},${coord[1].toFixed(2)}\n`;
                      hasData = true;
                  });
              } else if (feat.geometry && feat.geometry.type === 'MultiPolygon') {
                  let subName = "S" + (feat.properties.id || feat.properties.IdNodo || feat.properties.Nombre || "");
                  feat.geometry.coordinates.forEach(poly => {
                      poly[0].forEach(coord => {
                          csvContent += `${subName},${coord[0].toFixed(2)},${coord[1].toFixed(2)}\n`;
                          hasData = true;
                      });
                  });
              }
          });
      }
      
      if (!hasData) {
          alert("No hay vértices de polígonos disponibles para exportar. Cargue un INP o calcule áreas primero.");
          return;
      }
      
      let blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      let url = URL.createObjectURL(blob);
      let link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "Vertices_Poligonos.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
      <div style={{ display: 'flex', height: 'calc(100vh - 120px)', position: 'relative', overflow: 'hidden' }}>
          <style>{`
            .sel-pipe-label { background: rgba(255,255,255,0.9); border: 1px solid #ef4444; border-radius: 4px; padding: 2px 4px; font-size: 9px; font-weight: bold; box-shadow: 0 1px 3px rgba(0,0,0,0.3); white-space: nowrap; }
            .sel-pozo-label { background: transparent; border: none; box-shadow: none; font-size: 10px; font-weight: bold; color: #b91c1c; text-shadow: 1px 1px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff; white-space: nowrap; }
            .area-outlet-label { background: transparent; border: none; box-shadow: none; font-size: 8px; font-weight: bold; color: #4b5563; text-shadow: 1px 1px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff; white-space: nowrap; transform: translate(-50%, -50%); }
        `}</style>
      <div style={{ flex: 1, position: 'relative', zIndex: 0 }}>
        <MapContainer 
            center={[4.6097, -74.0817]} zoom={13} maxZoom={24} 
            style={{ width: '100%', height: '100%', backgroundColor: '#f9fafb' }} ref={mapRef}
            whenReady={() => setMapLoaded(true)}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          { !isExport && <GeomanSetup sT={sT} setSelTramos={setSelTramos} tramosConCoordsRef={tramosConCoordsRef} setBufferArea={setBufferArea} /> }
        </MapContainer>
      </div>

      <div style={{ 
          width: '320px', 
          backgroundColor: 'rgba(255, 255, 255, 0.95)', 
          backdropFilter: 'blur(10px)', 
          boxShadow: '-4px 0 15px rgba(0,0,0,0.05)', 
          borderLeft: '1px solid #e5e7eb', 
          padding: '24px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '16px', 
          overflowY: 'auto', 
          zIndex: 10 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937', letterSpacing: '-0.025em', margin: 0 }}>Visor Catastral</h2>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '12px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#4b5563', textTransform: 'uppercase' }}>Sistema de Coordenadas</span>
            </div>
            <select 
                value={epsgCode} 
                onChange={handleEpsgChange} 
                style={{ width: '100%', padding: '6px', fontSize: '12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}
            >
                <option value="EPSG:3116">EPSG:3116 (Bogotá)</option>
                <option value="EPSG:9377">EPSG:9377 (Origen Nacional)</option>
                <option value="EPSG:3857">EPSG:3857 (Web Mercator)</option>
            </select>
            <button onClick={() => setInpData(prev => ({...prev}))} style={{
                marginTop: 8, background: '#10b981', color: 'white', border: 'none', padding: '6px 12px',
                borderRadius: '4px', cursor: 'pointer', fontSize: 12, fontWeight: 'bold', width: '100%'
            }}>
                Procesar Coordenadas
            </button>
            <div style={{ fontSize: '9px', color: '#6b7280', marginTop: '4px', textAlign: 'center', lineHeight: '1.2' }}>
                Cambia el sistema si no ves la red importada en el mapa.
            </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '12px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#4b5563', textTransform: 'uppercase' }}>Rastreo Aguas Arriba</span>
                <span style={{ color: traceMode ? '#10b981' : '#d1d5db' }}>●</span>
            </div>
            <button 
                onClick={() => setTraceMode(!traceMode)} 
                style={{ width: '100%', padding: '8px', fontSize: '12px', fontWeight: 'bold', color: traceMode ? '#047857' : '#4b5563', backgroundColor: traceMode ? '#d1fae5' : '#f3f4f6', border: '1px solid', borderColor: traceMode ? '#6ee7b7' : '#e5e7eb', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}>
                {traceMode ? 'Activado (Shift+Click opcional)' : 'Activar Rastreo'}
            </button>
            <div style={{ fontSize: '9px', color: '#6b7280', marginTop: '6px', textAlign: 'center', lineHeight: '1.2' }}>
                Con el rastreo apagado, presiona <b>Shift+Click</b> para rastrear manualmente.<br/>
                Usa <b>Ctrl+Click</b> para sumar tramos a la selección.
            </div>
        </div>
        
        <div style={{ backgroundColor: 'rgba(239, 246, 255, 0.5)', padding: '16px', borderRadius: '12px', border: '1px solid #dbeafe', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Radio del Buffer (m)</label>
          <input type="number" id="radioBufferInput"
                 style={{ width: '100%', backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px', color: '#374151', outline: 'none' }} 
                 value={radio} onChange={e => {
                   let v = Number(e.target.value);
                   setRadio(v);
                   generarBuffer(selTramos, v);
                 }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', border: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Área Tributaria</span>
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#059669' }}>{bufferArea.toFixed(4)} <span style={{ fontSize: '14px', fontWeight: '500', color: '#9ca3af' }}>Ha</span></span>
          </div>
          <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', border: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>T. Concentración</span>
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#ea580c' }}>{tcVal} <span style={{ fontSize: '14px', fontWeight: '500', color: '#9ca3af' }}>min</span></span>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '12px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#4b5563', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <span>Cartografía Base (.zip con SHP)</span>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '4px', fontSize: '10px', textTransform: 'none', fontWeight: 'normal', color: '#6b7280' }}>
                 <input type="checkbox" checked={verCartografia} onChange={e => setVerCartografia(e.target.checked)} /> Mostrar en Mapa
              </label>
            </label>
            <input 
              type="file" 
              accept=".zip,.geojson,.json,.js" 
              onChange={handleCargarCartografia}
              style={{ width: '100%', fontSize: '10px' }}
            />
            {cartografia.length > 0 && (
                <div style={{ marginTop: '8px', fontSize: '11px', color: '#059669', fontWeight: 'bold' }}>
                   ✓ {cartografia.length} polígonos base listos para cálculo.
                </div>
            )}
        </div>
        
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '12px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#4b5563', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <span>Capa de Referencia (.geojson)</span>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '4px', fontSize: '10px', textTransform: 'none', fontWeight: 'normal', color: '#6b7280' }}>
                 <input type="checkbox" checked={verRefFeatures} onChange={e => setVerRefFeatures(e.target.checked)} /> Mostrar
              </label>
            </label>
            <input 
              type="file" 
              accept=".geojson,.json" 
              onChange={handleLoadRefGeoJSON}
              style={{ width: '100%', fontSize: '10px' }}
            />
            {refFeatures.length > 0 && (
                <div style={{ marginTop: '8px', fontSize: '11px', color: '#ea580c', fontWeight: 'bold' }}>
                   ✓ {refFeatures.length} elementos de referencia listos.
                </div>
            )}
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', border: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Tramos Elegidos</span>
          <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937', backgroundColor: '#f3f4f6', padding: '4px 12px', borderRadius: '8px' }}>{selTramos.length}</span>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexDirection: 'column' }}>
          {isCalculating && calcProgress.total > 0 && (
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #dbeafe', borderRadius: '12px', padding: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#4b5563', marginBottom: '6px' }}>Calculando áreas aferentes...</div>
              <div style={{ width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.round((calcProgress.current / calcProgress.total) * 100)}%`, height: '100%', backgroundColor: '#8e44ad', borderRadius: '4px', transition: 'width 0.3s ease' }}></div>
              </div>
              <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px', textAlign: 'center' }}>
                Tramo {calcProgress.current} de {calcProgress.total} ({Math.round((calcProgress.current / calcProgress.total) * 100)}%)
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
               onClick={() => handleCalcularAreas(true)}
               disabled={isCalculating}
               style={{ flex: 1, backgroundColor: isCalculating ? '#9ca3af' : '#00A6D6', color: '#ffffff', fontWeight: 'bold', padding: '12px 8px', borderRadius: '12px', border: 'none', cursor: isCalculating ? 'not-allowed' : 'pointer', fontSize: '13px' }}
             >
               {isCalculating ? `Procesando ${calcProgress.current}/${calcProgress.total}...` : "🧮 Calcular Áreas (Tramos Selec.)"}
            </button>
            <button 
               onClick={() => handleCalcularAreas(selTramos.length > 0)}
               disabled={isCalculating}
               style={{ flex: 1, backgroundColor: isCalculating ? '#9ca3af' : '#8b5cf6', color: '#ffffff', fontWeight: 'bold', padding: '12px 8px', borderRadius: '12px', border: 'none', cursor: isCalculating ? 'not-allowed' : 'pointer', fontSize: '13px' }}
             >
               {isCalculating ? `Procesando ${calcProgress.current}/${calcProgress.total}...` : "🧮 Autogenerar Áreas (Reto Voronoi)"}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '4px', fontSize: '10px', color: '#6b7280', marginTop: '5px' }}>
                     <input type="checkbox" checked={verAutoAreas} onChange={e => setVerAutoAreas(e.target.checked)} /> Mostrar Áreas Autogeneradas
                </label>
          </div>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => { 
                  setSelTramos([]); 
                  setBufferPoly([]); 
                  setBufferArea(0); 
                  setTcVal("-"); 
                  if (mapRef.current && selLinesLayerRef.current) {
                      mapRef.current.removeLayer(selLinesLayerRef.current);
                      selLinesLayerRef.current = null;
                  }
              }} 
              disabled={selTramos.length===0}
              style={{ 
                  flex: 1, 
                  backgroundColor: '#ef4444', 
                  opacity: selTramos.length === 0 ? 0.5 : 1,
                  cursor: selTramos.length === 0 ? 'not-allowed' : 'pointer',
                  color: '#ffffff', 
                  fontWeight: 'bold', 
                  padding: '12px 8px', 
                  borderRadius: '12px', 
                  border: 'none',
                  fontSize: '13px'
              }}
            >
              Borrar Selec.
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button 
              onClick={() => exportToApp(false)} 
              disabled={selTramos.length===0}
              style={{ 
                  flex: 1, 
                  backgroundColor: '#3b82f6', 
                  opacity: selTramos.length === 0 ? 0.5 : 1,
                  cursor: selTramos.length === 0 ? 'not-allowed' : 'pointer',
                  color: '#ffffff', 
                  fontWeight: 'bold', 
                  padding: '12px 8px', 
                  borderRadius: '12px', 
                  border: 'none',
                  fontSize: '11px'
              }}
              title="Mantiene los caudales acumulados intactos"
            >
              📥 Inyectar Red Completa (Cálculos Intactos)
            </button>
            <button 
              onClick={() => exportToApp(true)} 
              disabled={selTramos.length===0}
              style={{ 
                  flex: 1, 
                  backgroundColor: '#f59e0b', 
                  opacity: selTramos.length === 0 ? 0.5 : 1,
                  cursor: selTramos.length === 0 ? 'not-allowed' : 'pointer',
                  color: '#ffffff', 
                  fontWeight: 'bold', 
                  padding: '12px 8px', 
                  borderRadius: '12px', 
                  border: 'none',
                  fontSize: '11px'
              }}
              title="Trunca la red solo a tu selección (afecta caudales aguas abajo, ideal para extraer Cantidades limpias)"
            >
              ✂️ Inyectar Solo Selección (Para Cantidades)
            </button>
          </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input type="checkbox" id="chk_vias" checked={incluirVias} onChange={e => setIncluirVias(e.target.checked)} />
                  <label htmlFor="chk_vias" style={{ fontSize: '11px', color: '#4b5563', cursor: 'pointer', marginLeft: '4px' }}>Inyectar áreas vías separadas</label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input type="checkbox" id="chk_ver_completa" checked={verAreaCompleta} onChange={e => setVerAreaCompleta(e.target.checked)} />
                  <label htmlFor="chk_ver_completa" style={{ fontSize: '11px', color: '#4b5563', cursor: 'pointer', marginLeft: '4px' }}>Ver Área Completa</label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input type="checkbox" id="chk_ver_separada" checked={verAreaSeparada} onChange={e => setVerAreaSeparada(e.target.checked)} />
                  <label htmlFor="chk_ver_separada" style={{ fontSize: '11px', color: '#4b5563', cursor: 'pointer', marginLeft: '4px' }}>Ver Vías/Predios</label>
              </div>
          </div>
      </div>
    </div>
  );


}

class MapTabErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) return <div style={{padding: '20px', color:'red', backgroundColor: 'white', zIndex: 9999, position: 'relative'}}><h2>Error in MapTab:</h2><pre>{this.state.error.toString()}</pre></div>;
    return this.props.children;
  }
}
export default function MapTab(props) {
  return <MapTabErrorBoundary><MapTabInner {...props} /></MapTabErrorBoundary>;
}
