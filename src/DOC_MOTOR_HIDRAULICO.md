# Documentación del Motor Hidráulico — AMCaudales Pro

**Propósito:** Dar trazabilidad normativa y bibliográfica a cada fórmula y constante del
núcleo de cálculo. Este motor genera presupuestos de obra que se entregan a entidades
bancarias y a la alcaldía; por eso **cada número debe poder justificarse**.

**Archivos cubiertos:**
- `engine.js` — fórmulas hidráulicas y bucle de cálculo por tramos (`runCalc`)
- `calcHelpers.js` — cantidades de obra (pozos, sumideros, excavaciones, tuberías)
- `constants.js` — curvas IDF, diámetros de tubería, parámetros por defecto (DP)

**Norma de referencia principal:** RAS-2017 (Reglamento Técnico del Sector de Agua
Potable y Saneamiento Básico, Colombia), Títulos C y D.

---

## 1. Curvas IDF de intensidad — `cIDF()` en engine.js

```js
function cIDF(est,Tr,tc,P){
  var s=IDF[est];
  if(P&&P.customIDF&&P.customIDF[est]) s=P.customIDF[est];
  if(!s||tc<=0) return 0;
  var x=s.c.find(function(c){return c.Tr===Tr;});
  if(!x) return 0;
  return x.a/Math.pow(Math.pow(tc,x.b1)+x.c, x.b2);
}
```

**Fórmula implementada:**

$$I = \frac{a}{(t_c^{b_1} + c)^{b_2}}$$

- **Fuente:** Modelo de **Bernard** (forma exponencial de ajuste de curvas IDF a partir
  de series de precipitación máxima anual). Es la forma estándar usada por el IDEAM y
  por los estudios pluviométricos del Área Metropolitana de Bucaramanga.
- **Unidades:** `I` en L/s·ha, `t_c` en minutos.
- `b2 = 1` y `c = 0` en todos los ajustes cargados (ver `constants.js`), por lo que en
  la práctica la forma usada es $I = a / t_c^{b_1}$.
- **Estaciones** (`IDF` en `constants.js`): BUC, FLO, LGR, LLG, AER (Palonegro), LAG.
  Parámetros `a` y `b1` calibrados por periodo de retorno Tr ∈ {3, 5, 10, 25, 50, 100} años.
- `P.customIDF` permite sobrescribir los parámetros desde la UI (caso de estudios propios).

**Verificación recomendada:** contrastar los pares `(a, b1)` contra el estudio
pluviométrico fuente de cada estación (generalmente el Estudio de Amenaza por
Derrumbes/Lluvias de Bucaramanga o datos CIEH-IDEAM).

---

## 2. Periodo de retorno por área — `gTr()`

```js
function gTr(a){ return a<2?3 : a<10?5 : 10; }
```

| Área aferente (Ha) | Tr asignado |
|---|---|
| < 2 | 3 años |
| 2 ≤ a < 10 | 5 años |
| ≥ 10 | 10 años |

**Fuente:** RAS-2017, **Tabla C.3.1** — Periodo de retorno de diseño para sistemas de
alcantarillado pluvial según el área de la cuenca. Los cortes coinciden con los rangos
normativos colombianos.

---

## 3. Diámetros de tubería — `PIPES` en constants.js

```js
{nom:"315 mm", Di:.283, De:.315}   // Di = diámetro interno, De = diámetro externo
```

- **Di (interno):** el que entra en las fórmulas hidráulicas (sección de flujo).
- **De (externo):** para cómputo de excavación (ancho de zanja = Di + 0.4).

Los Di son los diámetros normalizados de **tubería PVC-NTC, norma ISO 4422 / NTC 3822**
(sección circular, pared estructurada). Los valores `.098, .144, .181, .226, .283, ...`
corresponden a los diámetros internos reales de PVC para los nominales
110, 160, 200, 250, 315, 355, 400, 450, 500, 600, 700, 750, 850, 900, 1000 mm.

---

## 4. Caudal a tubo lleno — `QoM()` y `QoDW()`

### 4.1 Manning — `QoM()`
```js
function QoM(D,n,S){
  if(n===0||D===0||S<=0) return 0;
  return 1000*Math.PI*Math.pow(D,8/3)*Math.pow(S/100,.5)/(n*Math.pow(4,5/3));
}
```

$$Q_o = \frac{1000 \cdot \pi \cdot D^{8/3} \cdot \sqrt{S}}{n \cdot 4^{5/3}}$$

- **Fuente:** Ecuación de **Manning** para sección circular llena.
  Con $R = D/4$ (radio hidráulico de sección llena), $A = \pi D^2/4$:
  $Q = (1/n) \cdot A \cdot R^{2/3} \cdot \sqrt{S}$ se simplifica a la forma anterior.
- `S` entra en **porcentaje** y se convierte a decimal (`S/100`).
- El factor `1000` convierte m³/s → L/s.
- `n` = coeficiente de rugosidad de Manning (ver §5).

### 4.2 Darcy-Weisbach (Colebrook-White) — `QoDW()`
```js
function QoDW(D,S,ks,visc){
  if(D<=0||S<=0) return 0;
  var Sf=S/100;
  var K=Math.sqrt(2*9.81*D*Sf);
  var arg=ks/(3.71*D)+2.51*visc/(D*K);
  if(arg<=0) return 0;
  var V=-2*K*Math.log(arg)/Math.LN10;
  var A=Math.PI*D*D/4;
  return V*A*1000;
}
```

$$V = -2\sqrt{2 g D S_f} \cdot \log_{10}\!\left(\frac{k_s}{3.71\,D} + \frac{2.51\,\nu}{D\sqrt{2 g D S_f}}\right)$$

- **Fuente:** Ecuación de **Colebrook-White** en forma explícita de velocidad
  (aproximación directa, evita iteración de Colebrook original). Estándar para diseño
  hidráulico de alcantarillado con flujo a tubo lleno; recomendada por el RAS para
  verificación cuando se conoce la rugosidad absoluta.
- **Constantes:**
  - `9.81` = gravedad $g$ (m/s²).
  - `3.71` y `2.51` = constantes de la fórmula de Colebrook-White (valores teóricos).
  - `ks` = rugosidad absoluta de la pared (m). Ver tabla §5.
  - `visc` = viscosidad cinemática del agua (m²/s). `1.007e-6` corresponde a **agua a
    20 °C** (valor estándar de referencia).

> **Selección de fórmula:** el parámetro `P.formulaQo` ("M" = Manning, otro = DW)
> decide cuál se usa como caudal de referencia (`actQo`). Por defecto se usa **DW**.

---

## 5. Coeficientes de rugosidad y viscosidad

Definidos en `runCalc()`:

| Material (`mat`) | `mc` | `n` Manning | `ks` rugosidad (m) |
|---|---|---|---|
| PVC | 1 | **0.010** | 1.5×10⁻⁶ |
| GRES | 2 | 0.014 | 3×10⁻⁴ |
| PEAD | 4 | 0.010 | 1.5×10⁻⁶ |
| CONCRETO (default) | 3 | 0.013 | 1×10⁻³ |

- **PVC `n = 0.010`:** valor estándar RAS-2017 / NTC 3822 para PVC nuevo.
- **`ks` PVC = 1.5×10⁻⁶ m:** rugosidad absoluta del PVC liso (literatura, valor típico).
- **Viscosidad `visc_v = 1.007e-6` m²/s:** agua dulce a ~20 °C (tabla de propiedades).

> ⚠️ En el bloque v36.6 el motor **fuerza el material de diseño a PVC** (`matDiseno="PVC"`,
> `n_dis=0.01`, `ks_dis=1.5e-6`) para el dimensionamiento automático, aunque el material
> real del tramo pueda ser otro. Esto es coherente con diseñar al material más liso y
> conservador, pero debe documentarse en la memoria del proyecto.

---

## 6. Relaciones hidráulicas en flujo parcialmente lleno

Secciones circulares: las funciones `gYDo`, `gVVo`, `gDhD` son **aproximaciones
polinomicas por tramos** (regresión por potencia, segmentada) de las relaciones
exactas de flujo circular parcialmente lleno.

> Estas aproximaciones son una **discrepancia documentada**: no son las ecuaciones
> exactas de sección circular (que requieren resolver numéricamente el ángulo θ),
> sino ajustes empíricos. **Recomendación de auditoría:** validar contra las
> ecuaciones exactas (ver §6.4) para el rango de trabajo típico.

### 6.1 Relación tirante — `gYDo(q)` : Y/Do en función de Q/Qo
```js
function gYDo(q){
  if(q<=0) return 0;
  if(q<=.01) return 2.883*Math.pow(q,.807);
  if(q<=.035) return .585*Math.pow(q,.459);
  if(q<=.06)  return .651*Math.pow(q,.459);
  if(q<=.33)  return .816*Math.pow(q,.538);
  if(q<=.8)   return .238+q*.654;
  if(q<=.91)  return .229+q*.662;
  return .9;
}
```
- **Entrada:** `q = Q/Qo` (relación de caudales).
- **Salida:** `y/d` = tirante relativo.
- Los coeficientes `2.883, 0.807, 0.585, 0.459, ...` son constantes de ajuste de
  regresión. **Su origen no está citado en el código** — verifique contra tabla de
  flujo circular (p.ej. *Chow, "Open-Channel Hydraulics"*, Tabla de flujo circular, o
  el manual de SWMM).

### 6.2 Relación velocidad — `gVVo(y)` : V/Vo en función de Y/Do
Ajuste polinómico similar. Coeficientes `1.375, 0.604, 0.859, 0.382, ...`.

### 6.3 Profundidad hidráulica — `gDhD(y)` : Dh/D en función de Y/Do
```js
if(y<=.657) return -.201+1.179*y;
```
El diámetro hidráulico $D_h = A/T$ (área / ancho superficial) se usa para Froude.

### 6.4 Forma EXACTA (referencia, para validación futura)
Para una sección circular con ángulo mojado θ:
$$\theta = 2\arccos(1 - 2\,y/d)$$
$$A = \frac{d^2}{8}(\theta - \sin\theta), \quad
  P = \frac{d\,\theta}{2}, \quad
  R = \frac{A}{P}, \quad
  T = d\sin(\theta/2)$$

> Notar que el propio motor **sí usa la forma exacta** en `runCalc()` para calcular el
> radio hidráulico `Rh` (línea `var th=...; var Rh=.25*(1-Math.sin(th)/th)*D`), por lo
> que `gYDo`/`gVVo`/`gDhD` son solo atajos de relación. **Acción:** mantenerlas pero
> citar la fuente de los coeficientes de regresión.

---

## 7. Cálculo del caudal sanitario (Qsan) — `runCalc()` líneas ~104-109

```js
var aPob=aR+aC+aI+aIn;
var pob=aPob===0?.001:den*aPob;          // habitantes
var Qmed=P.coefRetorno*pob*con/86400;    // L/s (caudal medio diario)
var Qi=...;  var Qe=aR*.01;              // infiltración + aportes conexos
var Fm=Math.min(3.8, Math.max(1.4, 3.5/Math.pow(pob/1000,.1)));  // factor Harmon
var Qmx=Fm*Qmed;
var Qsan=Math.max(1.5, Qmx+Qe+Qi);
```

### 7.1 Población
$$pob = densidad \times área_{residencial+comercial+industrial+institucional}$$

### 7.2 Caudal medio diario
$$Q_{med} = \frac{coefRetorno \times pob \times consumo}{86400}$$
- `consumo` en L/hab·día, dividido entre 86400 s/día → L/s. ✔
- `coefRetorno` por defecto **0.85** (RAS, dotación neta que retorna al alcantarillado).

### 7.3 Factor de Harmon — `Fm`
$$F_m = \min\!\big(3.8,\; \max(1.4,\; \tfrac{3.5}{(pob/1000)^{0.1}})\big)$$
- **Fuente:** Fórmula de **Harmon** para el factor de punta (peak factor).
- **Acotamiento [1.4, 3.8]:** la cota inferior 1.4 y superior 3.8 son límites de
  aplicación práctica recomendados en manuales colombianos de alcantarillado.
- > ⚠️ Algunas referencias usan límites **[1.2, 4.0]**. Confirmar contra el manual
  > específico aplicable al proyecto (EMPAS / ICMMB).

### 7.4 Aportes adicionales
- `Qe = aR * 0.01`: **infiltración** = 0.01 L/s·Ha de área residencial. Coeficiente
  de infiltración por área (valor conservador típico).
- `Qi`: aportes industriales/comerciales (0.2·(aC+aI+aIn) o 50·pob/86400).
- `Qsan = max(1.5, ...)`: **caudal mínimo sanitario 1.5 L/s** — límite inferior de
  autolimpieza para evitar sedimentos en tramos de cabecera.

---

## 8. Caudal pluvial (método racional) — `runCalc()` líneas ~110-120

```js
var Cw = (aR*cR + aC*cC + aI*cI + aIn*cIn + aV*cV + aRe*cRe) / aT;  // coef. escorrentía ponderado
var Fr = gTr(aT);                       // Tr según área
var tcC = Tc<=10?10:Tc;                 // tiempo de concentración mínimo 10 min
var Iidf = cIDF(P.estacion, Fr, tcC, P);
var Qpluv = Cw * Iidf * aT;             // método racional: Q = C·I·A
```

$$Q_{pluv} = C_w \cdot I \cdot A$$

- **Fuente:** **Método Racional** (Mulvaney, 1851; estándar mundial para cuencas < 80 Ha).
- `Cw` = coeficiente de escorrentía ponderado por uso del suelo (ver §8.1).
- `I` = intensidad IDF (L/s·ha), `A` en Ha → Q en L/s. ✔
- **`tcC` mínimo 10 min:** el RAS recomienda no usar tc menor a 10 min por
  incertidumbre en cuencas pequeñas.

### 8.1 Coeficientes de escorrentía por uso (DP en constants.js)
| Uso | C |
|---|---|
| Residencial (aR) | 0.80 |
| Comercial (aC) | 0.90 |
| Industrial (aI) | 0.60 |
| Institucional (aIn) | 0.60 |
| Vías (aV) | 0.90 |
| Recreacional (aRe) | 0.30 |

**Fuente:** Tablas de coeficientes de escorrentía del RAS / manuales de hidrología
urbana colombiana. Valores típicos para suelos urbanos con drenaje.

---

## 9. Caudal de diseño (Qd) según tipo de alcantarillado

```js
if(tipoN===1) Qd = Qsan;                                  // SANITARIO
else if(tipoN===2) Qd = Qpluv;                            // PLUVIAL
else if(tipoN===3) Qd = Qpluv + Qsan;                     // COMBINADO
else if(tipoN===4) Qd = Qpluv*(porcPatios/100) + Qsan;    // SEMICOMBINADO
```

- **Semicombinado (tipo 4):** solo el porcentaje de agua lluvia de patios entra al
  sanitario. `porcPatios` por defecto **10%**. Convención de diseño colombiana.

---

## 10. Verificaciones de cumplimiento (RAS-2017)

Definidas al final de `runCalc()` (campos `okV, okFt, okFr, okQ, okY, okProf`):

| Verificación | Campo | Criterio (default DP) | Fuente |
|---|---|---|---|
| Velocidad | `okV` | V ≤ 5.0 m/s (PVC/PEAD: ≤ 10) | RAS C.3.4 |
| Fuerza tractiva | `okFt` | Ft ≥ 1.0 Pa (10 kg/m·s²) | RAS C.3.4 autolimpieza |
| Capacidad | `okQ` | Q/Qo ≤ 0.90 (90%) | RAS C.3.4 |
| Tirante relativo | `okY` | Y/Do ≤ 0.85 (85%) | RAS C.3.4 |
| Froude | `okFr` | Fr < 0.9 ó Fr > 1.1 (evita transición) | Buena práctica hidráulica |
| Profundidad | `okProf` | 0.80 ≤ prof ≤ 5.0 m | RAS C.3.2 |

### 10.1 Fuerza tractiva
$$F_t = \gamma_w \cdot R_h \cdot S = 9810 \cdot R_h \cdot S$$
- `9810` = peso específico del agua $= \rho g = 1000 \times 9.81$ N/m³ → pasa a Pa.
- `Rh` = radio hidráulico (forma exacta circular, §6.4).
- `S` en decimal (S/100 si entra en %).
- **Límite 1.0 Pa:** RAS recomienda ≥ 1.0 Pa para autolimpieza (arrastre de sedimentos).

### 10.2 Tiempo de recorrido y concentración
```js
var TrRec = t.longitud/Vtop/60;   // minutos, Vtop=min(V,10)
if(!tcN[t.a] || Tc+TrRec>tcN[t.a]) tcN[t.a]=Tc+TrRec;
```
- Tiempo de concentración aguas abajo = tiempo de llegada + tiempo de recorrido del tramo.
- **`Tc` inicial = 8 min** (entry, tiempo de entrada) — valor típico de entradas de
  alcantarillado pluvial urbano.
- `Vtop` acotado a 10 m/s para no subestimar tc.

---

## 11. Aliviaderos / estructuras de separación — `runCalc()` líneas ~127-143

```js
var QMD_est = sep.qmdSan_manual !== "" ? parseFloat(sep.qmdSan_manual) : (Qsan/3.5);
var Qn = Math.max(5*QMD_est, 25);
```

- **`3.5`:** factor de dilución — se asume que el QMD sanitario = Qsan / 3.5
  (factor de punta inverso). Convención de diseño de aliviaderos.
- **`5*QMD`:** caudal de undersurging — un aliviadero descarga cuando el caudal
  combinado supera **5 veces el medio diario**. Estándar de diseño EMPAS.
- **`25` (L/s):** caudal mínimo absoluto antes de activar purga.
- **`0.75` m** (línea `deltaH>0.75`): desnivel que define **cámara de caída** en pozos
  (RAS: diferencias de cotas de batea > 0.75 m requieren cámara de caída dedicada).

---

## 12. Cantidades de obra — `calcHelpers.js`

### 12.1 Sumideros — `calcCantSumidero()` y `SUM_TYPES` en constants.js
Constantes por tipo de sumidero (SL-200, SL-400, SL-600, ST-40, ST2-40):
```
cim: m³ cimiento, exc: m³ excavación, rell: m³ relleno, cp: m³ concreto pobre,
c4: m³ concreto 4000, a37: m² asfalto A-37, pdr: kg acero PDR-60,
cinta: m cinta PVC, rot: m² rotura pavimento, rep: m² reposición, comp: unidades compuerta
```
> ⚠️ **Discrepancia detectada:** `SUM_TYPES` en `constants.js` (cim:2.352, exc:3.91)
> **difiere** de los valores hardcoded en `calcCantSumidero()` (cim:0.18, exc:3.91).
> `calcCantSumidero()` define su propia tabla `BASE` que no usa `SUM_TYPES`.
> **Acción:** unificar las dos tablas; actualmente `SUM_TYPES` parece no usarse y
> `BASE` es la vigente. Riesgo de inconsistencia en presupuestos.

### 12.2 Pozos — `calcPozosCompleto()`, magic numbers:
| Constante | Valor | Significado / Fuente |
|---|---|---|
| `ESP` | 0.25 m | Espesor pared de pozo (mampostería) |
| `ESP_BASE` | 0.20 m | Espesor base/fondo de pozo |
| `ESP_TAPA` | 0.15 m | Espesor tapa/corona |
| `PDR60_FIJO` | **26.5 kg** | Acero PDR-60 fijo por tapa de pozo nuevo (EMPAS) |
| `0.56` | m | Descontado de profundidad para hConc (espesor tapa+fondo: 0.20+0.15+0.20≈0.56) |
| `0.35` | m | Espaciamiento de **peldaños** (peldanos = floor((prof-0.5)/0.35)) |
| `1.30` | m | Diámetro de corona de pozo (volCorona) |
| `1.40` | m | Diámetro de fondo de pozo (volFondo) |
| `0.20, 0.30` | m | Espesores corona/fondo de concreto |
| `4.5` | — | Factor para A-37 en cuerpo de pozo (m²/kg) |
| `80` | — | Factor acero PDR-60 por m³ de concreto (kg/m³) |

**DI según RAS (Tabla 10 RAS-2017, ya documentado en v36.6):**
| d tubería máxima | DI (diámetro interno pozo) |
|---|---|
| ≤ 600 mm | 1.20 m |
| 600 < d ≤ 900 mm | 1.80 m |
| > 900 mm | 2.20 m |

**Cámara de caída (Tabla 11 RAS-2017):**
| d llegada | Diámetro estructura |
|---|---|
| ≤ 300 mm | 170 mm (sic, revisar — debería ser 0.17 m o 170 mm de algo) |
| ≤ 450 mm | 280 mm |
| resto | 360 mm |

> ⚠️ Los valores `170/280/360` en `calcPozosCompleto` (línea `diamEstrCaida`) parecen
> estar en **mm pero sin escala correcta**. Verificar contra Tabla 11 RAS antes de
> confiar en el volumen de la cámara de caída (`volCaida`).

### 12.3 Ancho de zanja / volúmenes de excavación
```js
var bz = D + 0.4;                 // ancho zanja = Di + 0.4 m (0.2 m por lado)
var Le = Math.max(0, L - Dp);     // longitud excavación (descuenta pozo, Dp=1.2 m)
var H1 = profE + 0.2;  var H2 = profS + 0.2;   // sobre-excavación 0.2 m
var HP = (H1+H2)/2;
```
- **`0.4` m:** sobreancho total de zanja (0.20 m por lado). Estándar EMPAS.
- **`Dp = 1.2` m:** descuento de longitud por pozo (diámetro de pozo promedio).
- **`0.2` m:** sobre-excavación en profundidad (capa de cimentación).
- **Acarreo por rangos de profundidad** (`v025, v2550, v50p`):
  - `0–2.5 m`, `2.5–5 m`, `>5 m` — tarifas diferenciadas por dificultad de excavación.

### 12.4 Rellenos
```js
var rArena = Le*(bz*(D+0.25) - π(D/2)²);   // relleno arena cimentación
var rComun = Le*bz*(HP-D-0.25);             // relleno común compactado
```
- `0.25 m`: capa de arena sobre clave del tubo (cama + recubrimiento granular).

### 12.5 Vallas automáticas — `calcVallasAuto()`
```js
var cdv = pbCdv>0 ? pbCdv : Math.round(ltv*5474000);
```
- **`5474000`:** costo referencial por metro lineal de tubería (COP), usado para
  estimar el valor total de obra y de ahí el número de vallas según rangos de valor:
  - ≥ $10.000 millones, ≥ $5.000M, ≥ $1.000M, < $1.000M.
- **Rango $1.000M** (`v4`): `numVallas = max(1, round(cdv/1e9))`.

> ⚠️ Este `5474000` es un **valor económico hardcoded** que probablemente deba
> actualizarse con la fecha de los precios unitarios (PU). Documentar fecha de
> referencia de precios.

---

## 13. Precios unitarios (PU) y costos — constants.js

`PU = {...}` contiene precios unitarios en COP. Todos los campos son literales
numéricos sin fecha de referencia. **Acción crítica:** añadir un campo
`PU.fecha_referencia` (p.ej. "Precios a mayo 2026, origen EMPAS/Banco") porque estos
valores se devalúan con la inflación y los presupuestos bancarios requieren fecha de
cierre de precios.

`PRECIOS_TUB`: precio por metro de cada diámetro de tubería.

### Cargos sobre el subtotal (DP)
```js
porcAdmin:.29, porcImprevistos:.01, porcUtilidad:.05, porcIVA:.19
```
- **29% AIU** (Administración 29%, Imprevistos 1%, Utilidad 5% = 35% total) — estándar
  de contratación pública colombiana.
- **IVA 19%** — tarifa general vigente en Colombia.

---

## 14. Discrepancias y acciones pendientes (resumen de auditoría)

| # | Severidad | Discrepancia | Acción |
|---|---|---|---|
| D1 | Alta | Origen no citado de coeficientes `2.883, 0.807, ...` en `gYDo/gVVo/gDhD` | Citar fuente (Chow / SWMM) o validar vs ecuación exacta §6.4 |
| D2 | Alta | Dos tablas de sumideros incoherentes (`SUM_TYPES` vs `BASE` en calcCantSumidero) | Unificar a una sola fuente |
| D3 | Media | `diamEstrCaida` 170/280/360 — escala dudosa | Verificar contra Tabla 11 RAS |
| D4 | Media | Límites Harmon [1.4, 3.8] vs otras referencias [1.2, 4.0] | Confirmar manual aplicable |
| D5 | Media | `5474000` (costo ref. vallas) sin fecha de precios | Añadir `PU.fecha_referencia` |
| D6 | Baja | `3.5`, `5×QMD`, `25` de aliviaderos sin cita | Documentar convención EMPAS |
| D7 | Baja | `170/280/360` ya mencionado — confirmar unidades (¿m o mm?) | Revisar |

---

## 15. Referencias bibliográficas y normativas

1. **RAS-2017** — Reglamento Técnico del Sector de Agua Potable y Saneamiento Básico.
   Ministerio de Vivienda, Colombia. Títulos C (Alcantarillado) y D (Tratamiento).
   *Tablas citadas: C.3.1 (Tr), C.3.2 (profundidades), C.3.4 (velocidad/tirante),
   Tabla 10 (DI pozos), Tabla 11 (cámara de caída).*
2. **Chow, V.T. (1959)** — *Open-Channel Hydraulics*. McGraw-Hill.
   *Referencia para relaciones de flujo circular parcialmente lleno.*
3. **Colebrook, C.F. & White, C. (1937)** — Ecuación de Colebrook-White para fricción.
4. **SWMM Reference Manual Vol. II** (US EPA) — base del método de flujo y de los
   ajustes de relaciones Y/Do, V/Vo.
5. **Bernard, M.M. (1932)** — Forma de las curvas IDF.
6. **Manual EMPAS / ICMMB** — convenciones locales de diseño de pozos, aliviaderos y
   cómputos de cantidades de obra (Bucaramanga / Área Metropolitana).

---

*Documento generado como parte de la auditoría técnica de AMCaudales Pro (2026-06-24).
Manténgalo junto a `engine.js` y `calcHelpers.js` — cualquier modificación de una
constante hidráulica debe actualizarse aquí.*
