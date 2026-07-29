import React from 'react';

var fm=function(n){return n.toLocaleString("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0});};

function K(props){return <div className="kpi" style={props.color?{borderTopColor:props.color}:{}}><div className="kpiv">{props.v}</div><div className="kpil">{props.l}</div>{props.u?<div className="kpiu">{props.u}</div>:null}</div>;}
function SepRow(props){return <tr className="sep"><td colSpan={props.cols}>---</td></tr>;}

export const GLOSSARY_DICT = {
  "Qsan": "Caudal Sanitario (L/s).",
  "Qplu": "Caudal Pluvial (L/s).",
  "Qd": "Caudal de Diseño (L/s).",
  "n": "Coeficiente de Rugosidad de Manning.",
  "Cat": "Categoría o tipo de vía/terreno.",
  "Di": "Diámetro Interno (m).",
  "D.Prop": "Diámetro Propuesto (mm o pulg).",
  "D.Actual": "Diámetro Actual del Tramo.",
  "D.Propuesto": "Diámetro Propuesto para el Tramo.",
  "Alerta": "Indicador de incumplimiento de norma o parámetro.",

  "A": "Pozo de Llegada (Aguas Abajo).",
  "A exc": "Área de Excavación (m²).",
  "A-37": "Asfalto A-37.",
  "Acero(kg)": "Peso del Acero de Refuerzo (kg).",
  "Aflu": "Afluentes o tuberías entrantes.",
  "AN": "Andén.",
  "AncV": "Ancho de Vía: Indica si afecta el ancho total de la vía (S/N).",
  "Area": "Área tributaria del tramo (Ha).",
  "B": "Ancho de zanja (m).",
  "C.Fon": "Cota Fondo o Batea.",
  "C.FonA": "Cota Fondo A: Cota batea / fondo del tubo en el pozo de llegada.",
  "C.FonDE": "Cota Fondo DE: Cota batea / fondo del tubo en el pozo de inicio.",
  "C.Pob": "Concreto Pobre (m³).",
  "C.Ras": "Cota Rasante (terreno).",
  "C.RasA": "Cota Rasante A: Cota de rasante en el pozo de llegada.",
  "C.RasDe": "Cota Rasante DE: Cota de rasante (terreno) en el pozo de inicio.",
  "Caida": "Caída del tramo (m).",
  "Caidas": "Caídas en el pozo (m).",
  "Camara": "Diámetro de la cámara del pozo (m).",
  "Cant": "Cantidad.",
  "CF ent": "Cota Fondo de entrada.",
  "CF sal": "Cota Fondo de salida.",
  "CFon.A": "Cota Fondo A: Cota batea / fondo del tubo en el pozo de llegada.",
  "CFon.DE": "Cota Fondo DE: Cota batea / fondo del tubo en el pozo de inicio.",
  "Cons": "Consumo per cápita (L/hab/día).",
  "Cont.": "Control del flujo.",
  "CRas.A": "Cota Rasante A: Cota de rasante en el pozo de llegada.",
  "CRas.DE": "Cota Rasante DE: Cota de rasante (terreno) en el pozo de inicio.",
  "Cto(m3)": "Volumen de Concreto (m³).",
  "D": "Diámetro Nominal de la tubería.",
  "D.Colector(mm)": "Diámetro del Colector (mm).",
  "D.Ent": "Diámetro de Entrada (mm o pulg).",
  "D.Ent(pul)": "Diámetro de Entrada (pulg).",
  "D.Estructura(mm)": "Diámetro de la Estructura/Pozo (mm).",
  "D.Sal": "Diámetro de Salida (mm o pulg).",
  "D.Sal(pul)": "Diámetro de Salida (pulg).",
  "D1": "Dimensión geométrica 1 (m).",
  "D2": "Dimensión geométrica 2 (m).",
  "D3": "Dimensión geométrica 3 (m).",
  "DE": "Pozo de Inicio (Aguas Arriba).",
  "DeltaH(m)": "Diferencia de altura / Caída (m).",
  "Dens": "Densidad poblacional.",
  "DHe": "Diferencia de Altura de Energía (m).",
  "Diam": "Diámetro Nominal de la tubería (mm o pulgadas).",
  "DN": "Diámetro Nominal.",
  "Exc(m3)": "Volumen de Excavación (m³).",
  "Flujo": "Tipo de Flujo (Supercrítico, Subcrítico).",
  "Fr": "Número de Froude.",
  "Ft": "Fuerza Tractiva (Pa).",
  "FX": "Pavimento Flexible (Asfalto).",
  "H exc": "Altura de Excavación (m).",
  "H1": "Profundidad inicial (m).",
  "H2": "Profundidad final (m).",
  "hConc": "Altura en Concreto (m).",
  "hMamp": "Altura en Mampostería (m).",
  "HP": "Profundidad Promedio (m).",
  "I/N": "Inicial o Normal.",
  "L(m)": "Longitud del tramo (m).",
  "Le": "Longitud de excavación (m).",
  "Long": "Longitud del tramo (m).",
  "M/C": "Material de Construcción del pozo (Mampostería o Concreto).",
  "Mamp(m2)": "Área de Mampostería (m²).",
  "Masivo Rep": "Reposición Masiva: Sobrescribir todos los valores de reposición.",
  "Mat": "Material de la tubería.",
  "P(%)": "Pendiente del tramo (%).",
  "P.E.": "Pozo Existente.",
  "P.N.": "Pozo Nuevo.",
  "P.Unit": "Precio Unitario.",
  "PDR-60": "Rejilla o Tapa PDR-60.",
  "PE": "Pozo Existente.",
  "Pe%": "Pendiente de Entrada (%).",
  "Peld": "Peldaños instalados en pozo.",
  "PN": "Pozo Nuevo.",
  "PP": "Placa Huella o Pavimento Articulado.",
  "Prof": "Profundidad del pozo (m).",
  "Prof.E": "Profundidad de Entrada al pozo (m).",
  "Prof.S": "Profundidad de Salida del pozo (m).",
  "Ps%": "Pendiente de Salida (%).",
  "PzN": "Número/Nombre de Pozo.",
  "Q": "Caudal de diseño (L/s).",
  "Q(L/s)": "Caudal de diseño (L/s).",
  "Q.Diseño": "Caudal de diseño (L/s).",
  "Q.Lleno": "Caudal a tubo lleno (L/s).",
  "Q/Qo%": "Relación de caudal sobre caudal a tubo lleno en porcentaje.",
  "Qo(DW)": "Caudal a tubo lleno (Darcy-Weisbach).",
  "Qo(M)": "Caudal a tubo lleno (Manning).",
  "Red.": "Reducción excéntrica/concéntrica.",
  "Rep": "Reposición de pavimento / pozo.",
  "RG": "Pavimento Rígido (Concreto).",
  "Rot": "Rotura de pavimento.",
  "S%": "Pendiente (Slope) en porcentaje.",
  "T(min)": "Tiempo de concentración (minutos).",
  "T.c.(m)": "Tiempo de concentración (minutos).",
  "Tc(min)": "Tiempo de concentración (minutos).",
  "Tipo": "Tipo de tramo (Principal, Secundario, etc).",
  "TpPz": "Tipo de Pozo: Mampostería (M) o Concreto (C).",
  "TrRec": "Tiempo de Recorrido.",
  "Und": "Unidad de medida.",
  "V": "Velocidad del fluido (m/s).",
  "V(m/s)": "Velocidad del fluido (m/s).",
  "V.Lleno": "Velocidad a tubo lleno (m/s).",
  "V/Vo": "Relación de velocidad a tubo parcialmente lleno sobre velocidad a tubo lleno.",
  "vFt": "Validación de Fuerza Tractiva.",
  "Via": "Tipo de Vía: Asfalto(FX), Concreto(RG), Placa Huella(PP), etc.",
  "Vo(m/s)": "Velocidad a tubo lleno (m/s).",
  "Vol": "Volumen (m³).",
  "Vol.Exc": "Volumen de Excavación (m³).",
  "Vol.Rell": "Volumen de Relleno (m³).",
  "VolCaida(m3)": "Volumen de la cámara de caída (m³).",
  "vQ": "Validación de Caudal.",
  "vV": "Validación de Velocidad.",
  "Y(mm)": "Tirante hidráulico o nivel del agua (mm).",
  "y/d": "Relación tirante hidráulico sobre diámetro.",
  "Y/Do%": "Relación de tirante (Y) sobre diámetro (Do) en porcentaje."
};

function TH(props) {
  const {children, style, ...rest} = props;
  let text = '';
  if (typeof children === 'string') {
    text = children;
  } else if (Array.isArray(children)) {
    text = children.join('');
  }
  
  const title = GLOSSARY_DICT[text] || '';
  const newStyle = { ...style };
  
  if (title) {
    newStyle.cursor = 'help';
    newStyle.textDecoration = 'underline dotted rgba(255,255,255,0.5)';
  }
  
  return <th title={title} style={newStyle} {...rest}>{children}</th>;
}

function Glossary(props) {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{position:"fixed", bottom:20, left:20, zIndex:9999}}>
      <div 
        onClick={()=>setOpen(!open)}
        style={{width:40,height:40,borderRadius:"50%",background:"#00A6D6",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"0 2px 5px rgba(0,0,0,0.3)",fontWeight:"bold",fontSize:20}}
        title="Glosario de Abreviaturas"
      >?</div>
      {open && (
        <div style={{position:"absolute", bottom:50, left:0, background:"#fff", border:"1px solid #ccc", padding:15, borderRadius:8, boxShadow:"0 5px 15px rgba(0,0,0,0.2)", width:360, fontSize:12, color:"#333", maxHeight:"60vh", overflowY:"auto"}}>
          <div style={{fontWeight:"bold", fontSize:14, marginBottom:10, borderBottom:"1px solid #eee", paddingBottom:5}}>Glosario de Abreviaturas</div>
          {Object.entries(GLOSSARY_DICT).sort((a, b) => a[0].localeCompare(b[0])).map(([key, desc]) => {
            // Deduplicate slightly for UI
            if (key.includes("(") && !key.includes("m)") && key !== "Qo(DW)" && key !== "Qo(M)") return null; 
            return (
              <div key={key} style={{marginTop:5}}><b>{key}:</b> {desc}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export {fm, K, SepRow, Glossary, TH};
