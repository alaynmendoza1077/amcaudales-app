import React from "react";
import { useState, useCallback, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
var IDF={
  BUC:{name:"Bucaramanga",c:[{Tr:3,a:384.017,b1:.5773,b2:1,c:0},{Tr:5,a:419.809,b1:.5773,b2:1,c:0},{Tr:10,a:473.770,b1:.5773,b2:1,c:0},{Tr:25,a:555.890,b1:.5773,b2:1,c:0},{Tr:50,a:627.341,b1:.5773,b2:1,c:0},{Tr:100,a:707.977,b1:.5773,b2:1,c:0}]},
  FLO:{name:"Floresta",c:[{Tr:3,a:1145.081,b1:.5093,b2:1,c:0},{Tr:5,a:1220.878,b1:.5093,b2:1,c:0},{Tr:10,a:1331.813,b1:.5093,b2:1,c:0},{Tr:25,a:1494.079,b1:.5093,b2:1,c:0},{Tr:50,a:1629.838,b1:.5093,b2:1,c:0},{Tr:100,a:1777.933,b1:.5093,b2:1,c:0}]},
  LGR:{name:"La Granja",c:[{Tr:3,a:1499.651,b1:.4825,b2:1,c:0},{Tr:5,a:1596.024,b1:.4825,b2:1,c:0},{Tr:10,a:1736.773,b1:.4825,b2:1,c:0},{Tr:25,a:1942.060,b1:.4825,b2:1,c:0},{Tr:50,a:2113.325,b1:.4825,b2:1,c:0},{Tr:100,a:2299.693,b1:.4825,b2:1,c:0}]},
  LLG:{name:"Llano Grande",c:[{Tr:3,a:780.688,b1:.4325,b2:1,c:0},{Tr:5,a:853.680,b1:.4325,b2:1,c:0},{Tr:10,a:963.758,b1:.4325,b2:1,c:0},{Tr:25,a:1131.352,b1:.4325,b2:1,c:0},{Tr:50,a:1277.235,b1:.4325,b2:1,c:0},{Tr:100,a:1441.928,b1:.4325,b2:1,c:0}]},
  AER:{name:"Palonegro",c:[{Tr:3,a:742.960,b1:.4692,b2:1,c:0},{Tr:5,a:800.311,b1:.4692,b2:1,c:0},{Tr:10,a:885.274,b1:.4692,b2:1,c:0},{Tr:25,a:1011.588,b1:.4692,b2:1,c:0},{Tr:50,a:1118.981,b1:.4692,b2:1,c:0},{Tr:100,a:1237.776,b1:.4692,b2:1,c:0}]},
  LAG:{name:"La Laguna",c:[{Tr:3,a:1017.426,b1:.5333,b2:1,c:0},{Tr:5,a:1098.590,b1:.5333,b2:1,c:0},{Tr:10,a:1219.173,b1:.5333,b2:1,c:0},{Tr:25,a:1399.124,b1:.5333,b2:1,c:0},{Tr:50,a:1552.695,b1:.5333,b2:1,c:0},{Tr:100,a:1723.122,b1:.5333,b2:1,c:0}]},
};
var PIPES=[
  {id:1,nom:"110 mm",Di:.098,De:.11},{id:2,nom:"160 mm",Di:.144,De:.16},{id:3,nom:"200 mm",Di:.181,De:.2},
  {id:4,nom:"250 mm",Di:.226,De:.25},{id:5,nom:"315 mm",Di:.283,De:.315},{id:6,nom:"355 mm",Di:.32,De:.355},
  {id:7,nom:"400 mm",Di:.361,De:.4},{id:8,nom:"450 mm",Di:.406,De:.45},{id:9,nom:"500 mm",Di:.451,De:.5},
  {id:10,nom:"600 mm",Di:.595,De:.625},{id:11,nom:"700 mm",Di:.671,De:.71},{id:12,nom:"750 mm",Di:.747,De:.786},
  {id:13,nom:"800 mm",Di:.823,De:.86},{id:14,nom:"900 mm",Di:.899,De:.95},{id:15,nom:"1000 mm",Di:.975,De:1.025},
  {id:16,nom:"1100 mm",Di:1.105,De:1.140}
];
var PIPES_DB = {
  "PVC": PIPES,
  "GRES": [
    {nom:"4\"",Di:0.100,De:0.150}, {nom:"6\"",Di:0.150,De:0.200}, {nom:"8\"",Di:0.203,De:0.240},
    {nom:"10\"",Di:0.254,De:0.300}, {nom:"12\"",Di:0.305,De:0.350}, {nom:"14\"",Di:0.356,De:0.420},
    {nom:"16\"",Di:0.406,De:0.480}, {nom:"18\"",Di:0.457,De:0.540}, {nom:"20\"",Di:0.508,De:0.630},
    {nom:"24\"",Di:0.533,De:0.640}, {nom:"28\"",Di:0.610,De:0.750}, {nom:"30\"",Di:0.686,De:0.890},
    {nom:"32\"",Di:0.762,De:0.970}, {nom:"36\"",Di:0.838,De:1.060}, {nom:"40\"",Di:0.914,De:1.150},
    {nom:"44\"",Di:1.000,De:1.220}, {nom:"48\"",Di:1.200,De:1.440}, {nom:"52\"",Di:1.300,De:1.560},
    {nom:"56\"",Di:1.400,De:1.680}
  ],
  "PEAD": [
    {nom:"200 mm",Di:0.184,De:0.200}, {nom:"250 mm",Di:0.229,De:0.249}, {nom:"300 mm",Di:0.279,De:0.308},
    {nom:"375 mm",Di:0.351,De:0.382}, {nom:"450 mm",Di:0.418,De:0.460}, {nom:"600 mm",Di:0.563,De:0.614},
    {nom:"750 mm",Di:0.711,De:0.774}, {nom:"900 mm",Di:0.828,De:0.900}, {nom:"1000 mm",Di:0.926,De:1.000},
    {nom:"1050 mm",Di:0.969,De:1.050}, {nom:"1200 mm",Di:1.123,De:1.204}, {nom:"1350 mm",Di:1.276,De:1.365},
    {nom:"1500 mm",Di:1.408,De:1.500}, {nom:"1600 mm",Di:1.512,De:1.600}, {nom:"1800 mm",Di:1.701,De:1.800},
    {nom:"2000 mm",Di:1.890,De:2.000}
  ]
};
var MATERIALS=["PVC","GRES","CONCRETO","PEAD"];
var VIA_TYPES=["FX","RG","AN","PP","AD","PS","TR","TL"];
var SUM_TYPES={
  "SL-200":{cim:2.352,exc:3.91,rell:3.738,cp:.1,c4:2,excC:7.445,a37:10,pdr:30,cinta:6.6,rot:3.9,rep:5.1,comp:1},
  "SL-400":{cim:2.352,exc:6.785,rell:3.444,cp:.2,c4:2.7,excC:7.445,a37:13.5,pdr:40.5,cinta:10.3,rot:3.9,rep:5.1,comp:1},
  "SL-600":{cim:2.352,exc:9.66,rell:3.444,cp:.3,c4:3.8,excC:7.445,a37:19,pdr:57,cinta:14.2,rot:3.9,rep:5.1,comp:1},
};
var SUM_TYPES_TRANS={
  "ST-40": {cim:2.730,exc:6.653,rell:1.695,cp:0.217,c4:2.828,a37:14.14,pdr:42.42,rejas:5,cinta:8.409,rot:2.29,rep:2.49,comp:1},
  "ST2-40":{cim:2.730,exc:12.242,rell:1.815,cp:0.435,c4:6.754,a37:33.77,pdr:101.31,rejas:10,cinta:9.109,rot:2.29,rep:2.49,comp:1},
};
var PRECIOS_TUB={"110 mm":98000,"160 mm":145000,"200 mm":187000,"250 mm":223000,"315 mm":305501,"355 mm":378000,"400 mm":445000,"450 mm":523000,"500 mm":612000,"600 mm":820000,"700 mm":1050000,"750 mm":1180000,"850 mm":1380000,"900 mm":1520000,"1000 mm":1750000};
var CAPNAMES={"1":"PRELIMINARES","1.01":"VALLAS Y SENALES","1.01.01":"Vallas","1.01.02":"Senales Verticales","1.01.03":"Senales luminosas y dispositivos","1.02":"TRABAJOS PRELIMINARES","1.02.01":"Cerramientos","1.02.02":"Campamentos","1.02.03":"Preparacion zona","1.03":"ROTURA DE PAVIMENTOS","1.03.01":"Asfaltico","1.03.02":"Concreto","2":"MOVIMIENTOS DE TIERRAS","2.01":"Excavaciones en zanja","2.01.01":"Sin acarreo libre","2.01.02":"Con acarreo libre","2.04":"Entibados","2.04.01":"En madera","2.04.02":"Metalico","2.05":"Terraplenes y rellenos","2.05.01":"Sum/Conf/Comp relleno","2.05.02":"Conf/Comp relleno comun","2.05.03":"Conf/Comp relleno compactado","2.05.04":"Sum/Conf/Comp relleno seleccionado","2.06":"Sobreacarreos","2.06.01":"Sobreacarreos totales","3":"TUBERIAS Y ACCESORIOS","3.01":"Tuberia rigida","3.02":"Tuberia flexible PVC","3.02.01":"PVC 28PSI","3.02.02":"PVC 57PSI","3.03":"Accesorios","3.03.01":"Accesorios PVC","3.03.02":"Kit silla yee","4":"ESTRUCTURAS","4.01":"Concretos","4.01.01":"Concretos estructurales","4.01.02":"Concretos simples","4.02":"Aceros","4.02.01":"Estructurales","4.04":"Estructuras en ladrillo","4.04.01":"Mamposteria de ladrillo","4.05":"Sifones de caida","4.05.01":"Sifon de caida D=200mm","4.05.02":"Sifon de caida D=250mm","4.05.03":"Sifon de caida D=315mm","4.05.04":"Sifon de caida D=400mm","4.06":"Acometida domiciliarias","4.06.01":"Actividades acometida","4.07":"Juntas cinta polivinilo","4.07.01":"Juntas PVC","4.08":"Pavimentos","4.08.01":"Reparacion pav flexible","4.09":"Obras urbanismo","4.09.01":"Recuperacion urbanismo","5":"VARIOS","5.01":"Demoliciones","5.01.02":"Demolicion tuberias","5.03":"Accesorios hierro fundido","5.03.01":"Rejillas sumideros","5.03.02":"Compuertas charnela","5.03.03":"Aros y contra-aros","5.05":"Ensayos laboratorio","5.05.01":"Terraplenes y rellenos","5.05.03":"Concretos","5.08":"Reparacion urbanismo","5.08.01":"Reparacion y limpieza","5.09":"Otros","5.09.01":"Otros"};
var PU={
  v4:"1456742",senV:"417947",pasac:"535624",barric:"152412",delin:"19488",cerram:"59333",camp4:"5947762",replant:"9965172",
  rotPavFx:"79198",
  excTS025:"51786",excGS025:"90488",excRS:"186695",excTC025:"75812",excGC025:"86840",excRC:"218519",
  entibMad:"74371",relSumCo:"122162",relConfZa:"56151",relConfComp:"75937",arenaCim:"196692",
  sobreA200:"5424",sobreA1k:"7294",
  c4000:"1647394",cPobre:"651913",acero2590:"13692",acero4200:"14065",ladrPozo:"307629",
  rotPavAcom:"79199",rotAndAcom:"79007",excAcom:"51786",cimAcom:"196692",tubAcom:"187549",
  cajaAcom:"469928",sillaYee:"567589",rellAcom:"56151",repPavAcom:"210949",andAcom:"164016",
  juntaPVC:"24892",repPavEmpas:"210949",selloAsf:"116355",
  demolTub:"21514",compCharn:"769375",aroContra:"850158",aroContra2:"494218",
  proctor:"133303",densCampo:"206817",compresion:"12897",
  repSardLimp:"12525",demPare:"215569",demLinea:"12853"
};
var DP={
  proyecto:"CONSTRUCCION SISTEMA DE ALCANTARILLADO",municipio:"BUCARAMANGA",barrio:"",
  disenador:"",cedula:"",fecha:new Date().toISOString().split("T")[0],
  estacion:"LGR",tipoAlc:"C",porcPatios:10,alturaSNM:1015,
  densidad:600,habVivienda:4,pobDirecta:0,pobIndirecta:0,consumo:140,coefRetorno:.85,
  relCapacidad:.90,porcProfundidad:.85,velMaxima:5.0,fuerzaTractMin:1.0,
  limFroudeSub:.9,limFroudeSup:1.1,profMin:0.80,profMax:5.0,
  porcExcTierra:.55,porcExcGranular:.30,porcExcRoca:.15,
  porcEntibado:1,porcAcarreoLibre:.5,porcExpansion:.05,
  porcAprovTierra:.5,porcAprovGranular:.5,porcAprovRoca:0,
  distBotadero:8,tiempoObra:2,anchoVia:6,tipoViaGral:"FX",espesorPav:0.15,
  nAcom06:0,nAcom610:0,nAcom10:0,diamAcom:200,diamSumid:200,anchoAnden:1,largoAco:6,
  nSumLat:2,nSumTrans:0,tipoSumLat:"SL-200",longSumLat:6,
  porcAdmin:.29,porcImprevistos:.01,porcUtilidad:.05,porcIVA:.19,
  vallas1:0,vallas2:0,vallas3:0,vallas4:1,camp1:0,camp2:0,camp3:0,camp4:1,
  coef_aR:0.8,coef_aC:0.9,coef_aI:0.6,coef_aIn:0.6,coef_aV:0.9,coef_aRe:0.3,
  /* >>> ADICIÓN v36.7: frentes de obra, estaciones acarreo, % acarreo <<< */
  frentesObra:1,
  nEstaciones:14,
  porcAcarreo200:.10,
  porcAcarreo500:0,
  porcAcarreo1000:.90,
  reqInterventoria:"N",porcInterventoria:.08,
  /* >>> FIN ADICIÓN v36.7 <<< */
  grupoSueloDefecto: "C",
  cnMatrix: {
    RESIDENCIAL: { A: 65, B: 77, C: 85, D: 92 },
    COMERCIAL: { A: 89, B: 92, C: 94, D: 95 },
    INDUSTRIAL: { A: 81, B: 88, C: 91, D: 93 },
    INSTITUCIONAL: { A: 39, B: 61, C: 74, D: 80 },
    VIAS: { A: 98, B: 98, C: 98, D: 98 },
    RECREACIONAL: { A: 39, B: 61, C: 74, D: 80 },
    PROPIEDAD: { A: 65, B: 77, C: 85, D: 92 }
  }
};


export {IDF, PIPES, PIPES_DB, MATERIALS, VIA_TYPES, SUM_TYPES, SUM_TYPES_TRANS, PRECIOS_TUB, PU, DP, CAPNAMES};
