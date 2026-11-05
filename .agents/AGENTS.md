# AMCaudales_VHome_003 - Reglas del Proyecto

## 1. Ubicación del Repositorio Git y Despliegue en Vercel

- **Repositorio Oficial de Git**: El proyecto conectado a GitHub y Vercel está ubicado exclusivamente en la carpeta `amcaudales_app`:
  `c:\Users\Alayn Mendoza\OneDrive\Desktop\AMCaudales_VHome_003\amcaudales_app`
- **Sincronización de Archivos**: Cada vez que se realicen o editen archivos en el proyecto, **SIEMPRE** deben sincronizarse/copiarse los archivos actualizados hacia `amcaudales_app` para que el `git push` incluya los cambios.
- **Sintaxis de Comandos en Windows**:
  - Para **Command Prompt (CMD)**: Usar siempre `&&` entre comandos (ej: `cd /d ".../amcaudales_app" && git add . && git commit -m "..." && git push origin main`).
  - Para **PowerShell**: Usar `;` entre comandos.

## 2. Estándar de Diseño Gráfico y Sistema de Estilos UI (CSS)

- **Sistema Maestro de Estilos**: Todas las reglas visuales están centralizadas en `src/design_system.css` e importadas en `src/index.js`.
- **Textboxes e Inputs Uniformes**: Todos los campos de entrada de texto, números, dropdowns y selectores (`input`, `select`, `textarea`, `.ec`) deben mantener el tema **Dark Glassmorphic** (`background: rgba(15, 23, 42, 0.85)`, texto claro `#f8fafc`, bordes azul cian `rgba(59, 130, 246, 0.35)`). Nunca dejar textboxes blancos estridentes en la interfaz oscura.
- **Homogenización de Botones y Encabezados**: Mantener tipografía uniforme (Inter / Segoe UI), botones agrupados con bordes redondeados (`6px`), y encabezados limpios sin saturación visual.

## 3. Lógica de Altura SNM y Consumo (Norma RAS 2017)

- **Cálculo de Altura SNM**: La variable `alturaSNM` en `P` se determina automáticamente a partir de la cota rasante máxima (RAS) del pozo más elevado/alejado de la red cargada.
- **Ajuste de Consumo**: La variable `consumo` en `P` se ajusta automáticamente según la tabla RAS 2017:
  - `alturaSNM > 2000 m.s.n.m` -> `120 L/hab/día`
  - `1000 <= alturaSNM <= 2000 m.s.n.m` -> `130 L/hab/día`
  - `alturaSNM < 1000 m.s.n.m` -> `140 L/hab/día`

## 4. Regla de Integración y Persistencia de Nuevos Componentes

**CADA VEZ** que se agregue una nueva pestaña, un nuevo panel de configuración o se introduzcan nuevas variables (por ejemplo, checkboxes de inclusión, cantidades de obra, parámetros de diseño o reportes):

1. **Actualizar Descargas de Excel (Maestra y Botón Verde)**
   - El estado o los datos de las nuevas variables deben inyectarse en la lógica de cálculo global (ej: `PreTab.js`, `ProjectConsolidatorTab.js`).
   - Se debe garantizar que al descargar la Hoja Maestra (`exportMAESTRA.js`) o el presupuesto Banco (`exportBanco.js`) estos consideren los filtros y estados actualizados de la nueva pestaña.

2. **Persistencia en el archivo `.AMC`**
   - El estado de la nueva característica debe guardarse en el objeto principal (generalmente `P` u otros objetos del estado global como `urbanismoData`).
   - Esto asegura que al hacer clic en "Guardar .AMC" toda la configuración se guarde.
   - De la misma manera, se debe verificar que al hacer "Abrir .AMC" el estado de los componentes visuales reaccione correctamente.

3. **Sincronización entre Pestañas**
   - Si se cambia un dato en la nueva pestaña (ej: Informe de Acometidas), al volver a la pestaña de Presupuesto éste debe actualizarse automáticamente. Para esto, se debe verificar que los `useEffect` de consolidación (como en `PreTab` o `ProjectConsolidatorTab`) dependan de las variables afectadas para disparar el recálculo (ej. depender de `P`).

**NOTA:** Esta regla fue introducida debido a la desincronización ocurrida con las Acometidas y Obras de Urbanismo, donde el estado existía en la UI pero no se conectaba con los exportadores de Excel ni con el presupuesto general. ¡Sé riguroso al integrar el estado!

## 5. Regla de Oro para Cantidades de Obra (Desglose Analítico Tramo por Tramo y Pozo por Pozo)

**NUNCA** generar ni mostrar una cantidad de obra global con una sola fila genérica o valores a la azar sin soporte geométrico. Cada ítem en el cuadro analítico de **Cantidades de Obra** (Sello Asfáltico, Excavaciones, Rellenos, Tuberías, Pozos, Acero PDR-60, Acometidas, Sumideros, Retiro de Sobrantes, Demoliciones, Urbanismo) **DEBE ESTAR RIGUROSAMENTE DESGLOSADO TRAMO POR TRAMO, POZO POR POZO O ELEMENTO POR ELEMENTO**.

Cada fila de desglose debe incluir explícitamente:
- **Identificador / Elemento**: Nombre del tramo (`Tramo DE -> A`), pozo (`Pozo N`), o elemento específico.
- **Cantidad N°**: Número de unidades (1, conteo).
- **Longitud L (m)**: Longitud física del tramo o elemento.
- **Ancho W (m)**: Ancho de vía, ancho de zanja o diámetro del elemento.
- **Profundidad / Espesor H (m)**: Profundidad promedio o espesor de capa.
- **Expresión / Dimensión**: Fórmula geométrica explícita (ej. `L (15.5m) x W (6.0m)`).
- **Subtotal Cantidad**: Cantidad resultante en su unidad oficial (`m²`, `m³`, `m`, `kg`, `UND`).

## 6. Regla de Oro: Entrega Obligatoria de Comandos PowerShell y Pasos de Actualización

Al finalizar cualquier modificación en el código o corrección de bugs, el asistente **DEBE SIEMPRE Y SIN EXCEPCIÓN**:
1. **Entregar el comando de PowerShell listo para copiar y pegar**:
   Debido a que el entorno de ejecución del agente en este equipo no tiene permisos de ejecución de comandos por consola (`Acceso denegado`), el agente modifica los archivos en disco pero **NO puede hacer git push automáticamente**.
   Por lo tanto, **SIEMPRE** se debe entregar el comando exacto en PowerShell para que el usuario lo ejecute en su terminal:
   ```powershell
   cd "c:\Users\Alayn Mendoza\OneDrive\Desktop\AMCaudales_VHome_003\amcaudales_app" ; git add . ; git commit -m "<descripción del cambio>" ; git push origin main
   ```
2. **Explicar los pasos exactos y recordar al usuario que debe ejecutarlos él mismo**:
   Dejar 100% claro qué hizo el agente (editar archivos en disco) y qué debe hacer el usuario en su terminal o consola (ejecutar git push, recargar navegador, correr queries de base de datos si aplica), para que nunca exista duda sobre si el cambio ya se subió a Vercel o requiere la acción del usuario.
