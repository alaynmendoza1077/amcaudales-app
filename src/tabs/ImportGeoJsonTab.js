import React, { useState, useRef } from 'react';
import { DP } from '../constants';
import { topoSort, buildTramos } from '../parsers';
import { formatDiam } from '../engine';
import * as turf from '@turf/turf';

const pozosBase = {
    type: "FeatureCollection",
    features: [
        {
            type: "Feature",
            properties: { id: 1, IdNodo: "P1", IDfinal: "P1", Nombre: "P1", CoordX: -74.077507, CoordY: 4.596200, Ctapa: 100.5, Cfondo: 98.2, Profundidad_C: 2.3, TipoEstruc: "JUNCTION" },
            geometry: { type: "Point", coordinates: [-74.077507, 4.596200] }
        }
    ]
};

const tramosBase = {
    type: "FeatureCollection",
    features: [
        {
            type: "Feature",
            properties: { id: 1, id_1: "P1-P2", DE: "P1", A: "P2", DE1: "P1", A1: "P2", ESTADO: "NUEVO", PSALIDA: "", LONGITUD: 50, PENDIENTE: 1.5, CINI: 98.2, CFIN: 97.4, diametro: 200, MATERIAL: "PVC", LONGITUD_C: 50, PENDIENTE_C: 1.5, CRas1: 98.2, CRas2: 97.4, PInicial: 98.2 },
            geometry: { type: "LineString", coordinates: [[-74.077507, 4.596200], [-74.077607, 4.596300]] }
        }
    ]
};

const areasBase = {
    type: "FeatureCollection",
    features: [
        {
            type: "Feature",
            properties: { fid: 1, id: 1, IDCUENCA: "P1", AREACUENCA: 0.25, TIPOCUENCA: "RESIDENCIAL", CESC: 0.7, DENSIDAD: 150, CONSUMO: 130, LONGCUENCA: 20, IDESTACION: "BUC", IDNODO: "P1", Nombre: "Area_P1" },
            geometry: {
                type: "Polygon",
                coordinates: [[
                    [-74.0774, 4.5961], [-74.0776, 4.5961], [-74.0776, 4.5963], [-74.0774, 4.5963], [-74.0774, 4.5961]
                ]]
            }
        }
    ]
};

export default function ImportGeoJsonTab({ setIsThinking, setAutoAreasPoly, DP, setT, inpData, setInpData, setFlowStage, setTab, P, setP, onLoadINP, onLoadAMC, lightMode = true }) {
    const [pozosFile, setPozosFile] = useState(null);
    const [tramosFile, setTramosFile] = useState(null);
    const [areasFile, setAreasFile] = useState(null);
    const [suelosFile, setSuelosFile] = useState(null);

    const refPozos = useRef(null);
    const refTramos = useRef(null);
    const refAreas = useRef(null);
    const refSuelos = useRef(null);

    const downloadExcelTemplate = async (baseData, fileName) => {
        try {
            const XLSX = await import('xlsx');
            const wsData = [Object.keys(baseData.features[0].properties)];
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
            const wbout = XLSX.write(wb, {bookType:'xlsx', type:'array'});
            const blob = new Blob([wbout], {type:"application/octet-stream"});
            import('../utils/fileSaver').then(m => m.saveFileWithDialog(blob, fileName));
        } catch(e) {
            console.error("Error generating excel template", e);
        }
    };

    const downloadTemplate = (data, filename) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        import('../utils/fileSaver').then(m => m.saveFileWithDialog(blob, filename));
    };

    const parseGeoJsonFile = (file) => {
        return new Promise((resolve, reject) => {
            if (!file) {
                resolve(null);
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                let text = e.target.result.trim();
                try {
                    resolve(JSON.parse(text));
                } catch (err) {
                    try {
                        let lines = text.split(/\r?\n/).filter(l => l.trim().startsWith('{'));
                        if (lines.length > 0) {
                            let features = lines.map(line => JSON.parse(line));
                            resolve({ type: "FeatureCollection", features: features });
                        } else {
                            throw new Error("Formato inválido");
                        }
                    } catch (err2) {
                        reject(new Error(`Error al parsear ${file.name}: no es un JSON válido o GeoJSON Lines.`));
                    }
                }
            };
            reader.readAsText(file);
        });
    };

    const handleProcess = async () => {
        try {
            if (setIsThinking) setIsThinking(true);
            await new Promise(r => setTimeout(r, 50));

            const pozosGeoJson = await parseGeoJsonFile(pozosFile);
            const tramosGeoJson = await parseGeoJsonFile(tramosFile);
            const areasGeoJson = await parseGeoJsonFile(areasFile);
            const suelosGeoJson = await parseGeoJsonFile(suelosFile);

            if (!pozosGeoJson && !tramosGeoJson && !areasGeoJson && !suelosGeoJson) {
                alert("Debes seleccionar al menos un archivo GeoJSON para importar.");
                return;
            }

            let mergedP = {
                pozos: inpData?.pozos || [],
                verts: inpData?.verts || [],
                tr: inpData?.tr || [],
                ad: inpData?.ad || [],
                outfallNodes: inpData?.outfallNodes || {}
            };

            // Procesar Pozos
            if (pozosGeoJson && pozosGeoJson.features) {
                mergedP.pozos = []; // Clear existing pozos if a new file is provided
                pozosGeoJson.features.forEach(f => {
                    let props = f.properties || {};
                    let coords = f.geometry && f.geometry.coordinates ? f.geometry.coordinates : [0, 0];
                    mergedP.pozos.push({
                        ...props,
                        IdNodo: String(props.IdNodo || props.id || props.Nombre || props.nombre || props.pozo || ""),
                        TipoEstruc: String(props.TipoEstruc || "JUNCTION"),
                        Ctapa: parseFloat(props.Ctapa || props.CotaTapa || 0),
                        Cfondo: parseFloat(props.Cfondo || props.CotaFondo || 0),
                        CoordX: coords[0],
                        CoordY: coords[1]
                    });
                });
            }

            // Procesar Tramos
            if (tramosGeoJson && tramosGeoJson.features) {
                mergedP.tr = []; // Clear existing tramos if a new file is provided
                tramosGeoJson.features.forEach(f => {
                    let props = f.properties || {};
                    let deStr = String(props.de || props.DE || props.De || "");
                    let aStr = String(props.a || props.A || "");
                    let diamRaw = parseFloat(props.Diametro || props.diametro || props.D || 200);
                    let lNum = parseFloat(props.Longitud || props.LONGITUD || props.L || 0);
                    if (lNum <= 0) lNum = 0.1; // Evitar que buildTramos lo descarte
                    let sNum = parseFloat(props.Pendiente || props.PENDIENTE || props.S || 0);
                    let mat = String(props.Material || props.MATERIAL || "PVC");
                    
                    let newCom = formatDiam(diamRaw, mat);

                    mergedP.tr.push({
                        ...props,
                        de: deStr,
                        a: aStr,
                        DE: deStr,
                        A: aStr,
                        DE1: deStr,
                        A1: aStr,
                        diametro: diamRaw,
                        diametroCom: newCom,
                        nManning: parseFloat(props.Manning || props.nManning || props.n || 0.013),
                        LONGITUD: lNum,
                        PENDIENTE: sNum,
                        MATERIAL: mat,
                        Tipo: "CONDUIT"
                    });
                });
            }

            let suelosFc = null;
            if (suelosGeoJson && suelosGeoJson.features) {
                suelosFc = turf.featureCollection(suelosGeoJson.features);
            }

            var newAutoAreas = [];
            // Procesar Areas
            if (areasGeoJson && areasGeoJson.features) {
                mergedP.ad = []; // Clear existing areas if a new file is provided
                
                // Extraer parámetros globales del primer polígono de áreas si existen
                if (areasGeoJson.features.length > 0 && DP) {
                    let fp = areasGeoJson.features[0].properties || {};
                    let est = fp.IDESTACION || fp.IdEstacion || fp.estacion || fp.Estacion;
                    if (est) DP.estacion = String(est).trim();
                    let den = fp.DENSIDAD !== undefined ? fp.DENSIDAD : (fp.Densidad !== undefined ? fp.Densidad : fp.densidad);
                    if (den !== undefined) DP.densidad = parseFloat(den);
                    let con = fp.CONSUMO !== undefined ? fp.CONSUMO : (fp.Consumo !== undefined ? fp.Consumo : fp.consumo);
                    if (con !== undefined) DP.consumo = parseFloat(con);
                }

                areasGeoJson.features.forEach(f => {
                    let props = f.properties || {};
                    let deRaw = String(props.IDNODO || props.IdNodo || props.TRAMO || props.DE || props.de || props.Nombre || props.nombre || props.IDCUENCA || props.ID || props.id || "").trim();
                    if (deRaw.toUpperCase().endsWith("_VIA")) deRaw = deRaw.substring(0, deRaw.length - 4);
                    let de = deRaw;

                    let tipocuenca = String(props.TIPOCUENCA || props.Tipo || "RESIDENCIAL");
                    let defaultCesc = 0.6;
                    if (P) {
                        if (tipocuenca === "RESIDENCIAL") defaultCesc = P.coef_aR !== undefined ? P.coef_aR : 0.8;
                        else if (tipocuenca === "COMERCIAL") defaultCesc = P.coef_aC !== undefined ? P.coef_aC : 0.9;
                        else if (tipocuenca === "INDUSTRIAL") defaultCesc = P.coef_aI !== undefined ? P.coef_aI : 0.6;
                        else if (tipocuenca === "INSTITUCIONAL") defaultCesc = P.coef_aIn !== undefined ? P.coef_aIn : 0.6;
                        else if (tipocuenca === "VIAS") defaultCesc = P.coef_aV !== undefined ? P.coef_aV : 0.9;
                        else if (tipocuenca === "RECREACIONAL") defaultCesc = P.coef_aRe !== undefined ? P.coef_aRe : 0.3;
                    }
                    
                    let grupoSuelo = undefined;
                    if (suelosFc && f.geometry) {
                        try {
                            let centroid = turf.centroid(f);
                            for (let sf of suelosFc.features) {
                                if (sf.geometry && turf.booleanPointInPolygon(centroid, sf)) {
                                    let sp = sf.properties || {};
                                    let gs = sp.GRUPO_SUELO || sp.Grupo || sp.GRUPO || sp.HSG || sp.hsg || sp.Symbol || undefined;
                                    if (gs) {
                                        gs = String(gs).trim().toUpperCase();
                                        if (["A","B","C","D"].includes(gs)) {
                                            grupoSuelo = gs;
                                            break;
                                        }
                                    }
                                }
                            }
                        } catch(e) { console.warn("Error intersectando suelo", e); }
                    }
                    if (!grupoSuelo && props.GRUPO_SUELO) {
                        let pgs = String(props.GRUPO_SUELO).trim().toUpperCase();
                        if(["A","B","C","D"].includes(pgs)) grupoSuelo = pgs;
                    }

                    let estVal = props.IDESTACION || props.IdEstacion || props.estacion || props.Estacion;
                    let denVal = props.DENSIDAD !== undefined ? props.DENSIDAD : (props.Densidad !== undefined ? props.Densidad : props.densidad);
                    let conVal = props.CONSUMO !== undefined ? props.CONSUMO : (props.Consumo !== undefined ? props.Consumo : props.consumo);

                    mergedP.ad.push({
                        IDNODO: de,
                        AREACUENCA: parseFloat(props.AREACUENCA || props.areaHa || props.Area || props.area || 0),
                        TIPOCUENCA: tipocuenca,
                        CESC: props.CESC !== undefined ? parseFloat(props.CESC) : (props.Cesc !== undefined ? parseFloat(props.Cesc) : (props.cesc !== undefined ? parseFloat(props.cesc) : defaultCesc)),
                        DENSIDAD: denVal !== undefined ? parseFloat(denVal) : undefined,
                        CONSUMO: conVal !== undefined ? parseFloat(conVal) : undefined,
                        LONGCUENCA: props.LONGCUENCA !== undefined ? parseFloat(props.LONGCUENCA) : (props.LongCuenca !== undefined ? parseFloat(props.LongCuenca) : 50),
                        IDESTACION: estVal !== undefined ? String(estVal).trim() : undefined,
                        GRUPO_SUELO: grupoSuelo
                    });

                    if (f.geometry) {
                        let feat = {
                            type: "Feature",
                            properties: {
                                label: "Tramo " + de,
                                de: de,
                                a: "",
                                areaHa: parseFloat(props.AREACUENCA || props.areaHa || props.Area || 0),
                                TIPOCUENCA: tipocuenca,
                                CESC: props.CESC !== undefined ? parseFloat(props.CESC) : defaultCesc,
                                DENSIDAD: props.DENSIDAD !== undefined ? parseFloat(props.DENSIDAD) : undefined,
                                CONSUMO: props.CONSUMO !== undefined ? parseFloat(props.CONSUMO) : undefined,
                                LONGCUENCA: props.LONGCUENCA !== undefined ? parseFloat(props.LONGCUENCA) : 50,
                                GRUPO_SUELO: grupoSuelo,
                                fid: Math.random().toString(36).substr(2, 9)
                            },
                            geometry: f.geometry
                        };
                        newAutoAreas.push(feat);
                    }

                });
            }

            if (mergedP.tr.length === 0 && mergedP.pozos.length === 0) {
                alert("No se encontraron tramos ni pozos válidos en los archivos proporcionados.");
                return;
            }

            var pForTopo = { tr: mergedP.tr, pozos: mergedP.pozos, ad: mergedP.ad };
            var trams = topoSort(buildTramos(pForTopo));

            trams.forEach(t => {
                if (!t.longitud || t.longitud <= 0) {
                    let p1 = mergedP.pozos.find(p => p.IdNodo === t.de);
                    let p2 = mergedP.pozos.find(p => p.IdNodo === t.a);
                    if (p1 && p2 && p1.CoordX && p2.CoordX) {
                        t.longitud = 0.1;
                    }
                }
            });

            setAutoAreasPoly(newAutoAreas);

            let areaTotalGeo = 0;
            if (mergedP.ad) {
                mergedP.ad.forEach(a => {
                    areaTotalGeo += (parseFloat(a.AREACUENCA) || 0);
                });
            }
            if (DP) {
                DP.areaTotal = areaTotalGeo;
                DP.pobIndirecta = Math.round(areaTotalGeo * (DP.densidad || 600));
            }

            if (setP && DP) setP(Object.assign({}, DP)); 
            setT(trams); 
            setInpData(mergedP);
            setFlowStage('inp');
            setTab('dat');
            
            if (setIsThinking) setIsThinking(false);
            setTimeout(() => {
                alert(`GeoJSON cargados exitosamente:\n- ${mergedP.pozos.length} Pozos\n- ${trams.length} Tramos\n- ${mergedP.ad.length} Áreas`);
            }, 150);

        } catch (err) {
            console.error(err);
            if (setIsThinking) setIsThinking(false);
            alert(err.message || "Error al procesar los archivos GeoJSON.");
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', color: lightMode ? '#1e293b' : '#f8fafc' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '1rem', textAlign: 'center' }}>Cálculo de Sistemas de Alcantarillado</h2>
            <p style={{ marginBottom: '2rem', color: lightMode ? '#64748b' : '#94a3b8', textAlign: 'center' }}>
                Importa tu red preexistente usando un archivo <strong>.AMC</strong> guardado, un archivo <strong>.INP</strong> de SWMM, o a partir de capas vectoriales <strong>GeoJSON</strong> extraídas de tu SIG (ArcGIS/QGIS).
            </p>

            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '3rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <div onClick={onLoadAMC} style={{ flex: '1 1 280px', background: lightMode ? 'white' : 'rgba(30,41,59,0.4)', padding: '1.5rem', borderRadius: '12px', boxShadow: lightMode ? '0 4px 6px -1px rgba(0,0,0,0.1)' : '0 10px 30px rgba(0,0,0,0.3)', cursor: 'pointer', textAlign: 'center', transition: 'transform 0.2s', border: lightMode ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.1)' }} onMouseEnter={e => e.currentTarget.style.transform='translateY(-4px)'} onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💾</div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: lightMode ? '#ec4899' : '#f472b6', marginBottom: '0.5rem' }}>Abrir .AMC</h3>
                    <p style={{ fontSize: '0.9rem', color: lightMode ? '#64748b' : '#94a3b8' }}>Restaura una sesión guardada previamente con toda su información, cálculos y visor intactos.</p>
                </div>
                
                <div onClick={onLoadINP} style={{ flex: '1 1 280px', background: lightMode ? 'white' : 'rgba(30,41,59,0.4)', padding: '1.5rem', borderRadius: '12px', boxShadow: lightMode ? '0 4px 6px -1px rgba(0,0,0,0.1)' : '0 10px 30px rgba(0,0,0,0.3)', cursor: 'pointer', textAlign: 'center', transition: 'transform 0.2s', border: lightMode ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.1)' }} onMouseEnter={e => e.currentTarget.style.transform='translateY(-4px)'} onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: lightMode ? '#8b5cf6' : '#a78bfa', marginBottom: '0.5rem' }}>Cargar INP</h3>
                    <p style={{ fontSize: '0.9rem', color: lightMode ? '#64748b' : '#94a3b8' }}>Importa un archivo INP directamente desde EPA SWMM para generar topología, perfiles y datos.</p>
                </div>
            </div>

            <div style={{ borderTop: lightMode ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.1)', margin: '2rem 0' }}></div>
            
            <h3 style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '1rem', color: lightMode ? '#334155' : '#cbd5e1' }}>Importar Capas Vectoriales (GeoJSON)</h3>
            <p style={{ marginBottom: '1.5rem', color: lightMode ? '#64748b' : '#94a3b8', fontSize: '0.95rem' }}>
                Si deseas crear una red a partir de planos CAD/SIG, sube las tres capas fundamentales. Puedes descargar las plantillas base en GeoJSON o Excel (.xlsx) para estructurar tus datos correctamente.
            </p>

            <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                {/* Capa Pozos */}
                <div style={{ flex: '1 1 250px', background: lightMode ? 'white' : 'rgba(30,41,59,0.4)', padding: '1.5rem', borderRadius: '8px', boxShadow: lightMode ? '0 1px 3px rgba(0,0,0,0.1)' : '0 10px 30px rgba(0,0,0,0.3)', border: lightMode ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.1)' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ef4444' }}></div>
                        Capa Pozos (Puntos)
                    </h3>
                    <p style={{ fontSize: '0.9rem', color: lightMode ? '#475569' : '#94a3b8', marginBottom: '1rem', minHeight: '60px' }}>
                        Atributos requeridos: <br/>
                        <code style={{ background: lightMode ? '#f1f5f9' : 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '4px' }}>IdNodo</code> (String)<br/>
                        <code style={{ background: lightMode ? '#f1f5f9' : 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '4px' }}>Ctapa</code> (Numérico)<br/>
                        <code style={{ background: lightMode ? '#f1f5f9' : 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '4px' }}>Cfondo</code> (Numérico)
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                        <button onClick={() => downloadTemplate(pozosBase, 'pozos_base.geojson')} style={{ flex: 1, padding: '0.5rem', background: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#334155', fontWeight: '500', fontSize: '0.8rem' }}>
                            ⬇️ .GEOJSON
                        </button>
                        <button onClick={() => downloadExcelTemplate(pozosBase, 'pozos_base.xlsx')} style={{ flex: 1, padding: '0.5rem', background: '#10b981', border: 'none', borderRadius: '6px', cursor: 'pointer', color: 'white', fontWeight: '500', fontSize: '0.8rem' }}>
                            ⬇️ .XLSX
                        </button>
                    </div>
                    <input type="file" accept=".geojson,.json,.geojsonl" onChange={(e) => setPozosFile(e.target.files[0])} ref={refPozos} style={{ display: 'none' }} />
                    <button onClick={() => refPozos.current.click()} style={{ width: '100%', padding: '0.75rem', background: pozosFile ? '#10b981' : '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                        {pozosFile ? '✓ Archivo Seleccionado' : 'Subir GeoJSON Pozos'}
                    </button>
                    {pozosFile && <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', textAlign: 'center', color: '#10b981' }}>{pozosFile.name}</p>}
                </div>

                {/* Capa Tramos */}
                <div style={{ flex: '1 1 250px', background: lightMode ? 'white' : 'rgba(30,41,59,0.4)', padding: '1.5rem', borderRadius: '8px', boxShadow: lightMode ? '0 1px 3px rgba(0,0,0,0.1)' : '0 10px 30px rgba(0,0,0,0.3)', border: lightMode ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.1)' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '12px', height: '12px', backgroundColor: '#3b82f6' }}></div>
                        Capa Tramos (Líneas)
                    </h3>
                    <p style={{ fontSize: '0.9rem', color: lightMode ? '#475569' : '#94a3b8', marginBottom: '1rem', minHeight: '60px' }}>
                        Atributos requeridos: <br/>
                        <code style={{ background: lightMode ? '#f1f5f9' : 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '4px' }}>de</code> (Id inicial)<br/>
                        <code style={{ background: lightMode ? '#f1f5f9' : 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '4px' }}>a</code> (Id final)<br/>
                        <code style={{ background: lightMode ? '#f1f5f9' : 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '4px' }}>Diametro</code>, <code style={{ background: lightMode ? '#f1f5f9' : 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '4px' }}>Manning</code>
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                        <button onClick={() => downloadTemplate(tramosBase, 'tramos_base.geojson')} style={{ flex: 1, padding: '0.5rem', background: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#334155', fontWeight: '500', fontSize: '0.8rem' }}>
                            ⬇️ .GEOJSON
                        </button>
                        <button onClick={() => downloadExcelTemplate(tramosBase, 'tramos_base.xlsx')} style={{ flex: 1, padding: '0.5rem', background: '#3b82f6', border: 'none', borderRadius: '6px', cursor: 'pointer', color: 'white', fontWeight: '500', fontSize: '0.8rem' }}>
                            ⬇️ .XLSX
                        </button>
                    </div>
                    <input type="file" accept=".geojson,.json,.geojsonl" onChange={(e) => setTramosFile(e.target.files[0])} ref={refTramos} style={{ display: 'none' }} />
                    <button onClick={() => refTramos.current.click()} style={{ width: '100%', padding: '0.75rem', background: tramosFile ? '#10b981' : '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                        {tramosFile ? '✓ Archivo Seleccionado' : 'Subir GeoJSON Tramos'}
                    </button>
                    {tramosFile && <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', textAlign: 'center', color: '#10b981' }}>{tramosFile.name}</p>}
                </div>

                {/* Capa Áreas */}
                <div style={{ flex: '1 1 250px', background: lightMode ? 'white' : 'rgba(30,41,59,0.4)', padding: '1.5rem', borderRadius: '8px', boxShadow: lightMode ? '0 1px 3px rgba(0,0,0,0.1)' : '0 10px 30px rgba(0,0,0,0.3)', border: lightMode ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.1)' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '12px', height: '12px', backgroundColor: '#f59e0b', borderRadius: '2px' }}></div>
                        Capa Áreas (Polígonos)
                    </h3>
                    <p style={{ fontSize: '0.9rem', color: lightMode ? '#475569' : '#94a3b8', marginBottom: '1rem', minHeight: '60px' }}>
                        Atributos requeridos: <br/>
                        <code style={{ background: lightMode ? '#f1f5f9' : 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '4px' }}>DE</code> (Nodo asociado)<br/>
                        <code style={{ background: lightMode ? '#f1f5f9' : 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '4px' }}>AREACUENCA</code> (Hectáreas)<br/>
                        <code style={{ background: lightMode ? '#f1f5f9' : 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '4px' }}>TIPOCUENCA</code>, <code style={{ background: lightMode ? '#f1f5f9' : 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '4px' }}>CESC</code>, <code style={{ background: lightMode ? '#f1f5f9' : 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '4px' }}>DENSIDAD</code>, <code style={{ background: lightMode ? '#f1f5f9' : 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '4px' }}>CONSUMO</code> (Opcionales)
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                        <button onClick={() => downloadTemplate(areasBase, 'areas_base.geojson')} style={{ flex: 1, padding: '0.5rem', background: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#334155', fontWeight: '500', fontSize: '0.8rem' }}>
                            ⬇️ .GEOJSON
                        </button>
                        <button onClick={() => downloadExcelTemplate(areasBase, 'areas_base.xlsx')} style={{ flex: 1, padding: '0.5rem', background: '#f59e0b', border: 'none', borderRadius: '6px', cursor: 'pointer', color: 'white', fontWeight: '500', fontSize: '0.8rem' }}>
                            ⬇️ .XLSX
                        </button>
                    </div>
                    <input type="file" accept=".geojson,.json,.geojsonl" onChange={(e) => setAreasFile(e.target.files[0])} ref={refAreas} style={{ display: 'none' }} />
                    <button onClick={() => refAreas.current.click()} style={{ width: '100%', padding: '0.75rem', background: areasFile ? '#10b981' : '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                        {areasFile ? '✓ Archivo Seleccionado' : 'Subir GeoJSON Áreas'}
                    </button>
                    {areasFile && <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', textAlign: 'center', color: '#10b981' }}>{areasFile.name}</p>}
                </div>

                {/* Capa Suelos */}
                <div style={{ flex: '1 1 250px', background: lightMode ? 'white' : 'rgba(30,41,59,0.4)', padding: '1.5rem', borderRadius: '8px', boxShadow: lightMode ? '0 1px 3px rgba(0,0,0,0.1)' : '0 10px 30px rgba(0,0,0,0.3)', border: lightMode ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.1)' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '12px', height: '12px', backgroundColor: '#8b5cf6', borderRadius: '2px' }}></div>
                        Capa Suelos (Opcional)
                    </h3>
                    <p style={{ fontSize: '0.9rem', color: lightMode ? '#475569' : '#94a3b8', marginBottom: '1rem', minHeight: '60px' }}>
                        Para cálculo dinámico de Infiltración (SWMM): <br/>
                        Debe ser un polígono y contener el atributo <code style={{ background: lightMode ? '#f1f5f9' : 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '4px' }}>GRUPO_SUELO</code> (A, B, C o D).
                    </p>
                    <input type="file" accept=".geojson,.json,.geojsonl" onChange={(e) => setSuelosFile(e.target.files[0])} ref={refSuelos} style={{ display: 'none' }} />
                    <button onClick={() => refSuelos.current.click()} style={{ width: '100%', padding: '0.75rem', background: suelosFile ? '#10b981' : '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginTop: '3.1rem' }}>
                        {suelosFile ? '✓ Archivo Seleccionado' : 'Subir GeoJSON Suelos'}
                    </button>
                    {suelosFile && <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', textAlign: 'center', color: '#10b981' }}>{suelosFile.name}</p>}
                </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <button 
                    onClick={handleProcess}
                    style={{ 
                        padding: '1rem 3rem', 
                        fontSize: '1.2rem', 
                        background: '#1e293b', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '8px', 
                        cursor: 'pointer', 
                        fontWeight: 'bold',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)'
                    }}
                >
                    Procesar y Cargar al Sistema
                </button>
            </div>
        </div>
    );
}
