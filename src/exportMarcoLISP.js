export function generarMarcoLisp(P, pageOffset, pageNum, totalPages) {
  const lines = [];
  lines.push(`  ;;; === CAPAS DEL MARCO ===`);
  lines.push(`  (if (not (tblsearch "LAYER" "GUIA")) (entmake (list \'(0 . "LAYER") \'(100 . "AcDbSymbolTableRecord") \'(100 . "AcDbLayerTableRecord") \'(2 . "GUIA") \'(70 . 0) '(62 . 256))))`);
  lines.push(`  (if (not (tblsearch "LAYER" "MARCO")) (entmake (list \'(0 . "LAYER") \'(100 . "AcDbSymbolTableRecord") \'(100 . "AcDbLayerTableRecord") \'(2 . "MARCO") \'(70 . 0) '(62 . 256))))`);
  lines.push(`  (if (not (tblsearch "LAYER" "CUADRI")) (entmake (list \'(0 . "LAYER") \'(100 . "AcDbSymbolTableRecord") \'(100 . "AcDbLayerTableRecord") \'(2 . "CUADRI") \'(70 . 0) '(62 . 256))))`);
  lines.push(`  (if (not (tblsearch "LAYER" "000")) (entmake (list \'(0 . "LAYER") \'(100 . "AcDbSymbolTableRecord") \'(100 . "AcDbLayerTableRecord") \'(2 . "000") \'(70 . 0) '(62 . 256))))`);
  lines.push(`  (if (not (tblsearch "LAYER" "ROTULO")) (entmake (list \'(0 . "LAYER") \'(100 . "AcDbSymbolTableRecord") \'(100 . "AcDbLayerTableRecord") \'(2 . "ROTULO") \'(70 . 0) '(62 . 256))))`);

  lines.push(`  ;;; === ENTIDADES DEL MARCO ===`);
  const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const d = new Date();
  const fechaStr = `${meses[d.getMonth()]} del ${d.getFullYear()}`;
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "MARCO") '(62 . 256) '(100 . "AcDbPolyline") '(90 . 4) '(70 . 0)
    '(10 . (${87.66418542781359 + pageOffset} 50))
    '(10 . (${867.4985854278135 + pageOffset} 50))
    '(10 . (${867.4985854278135 + pageOffset} 280))
    '(10 . (${87.66418542781373 + pageOffset} 280))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "MARCO") '(62 . 256) '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${57.49858542781359 + pageOffset} 90))
    '(10 . (${86.16418542781358 + pageOffset} 90))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "MARCO") '(62 . 256) '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${57.49858542781359 + pageOffset} 70))
    '(10 . (${86.16418542781358 + pageOffset} 70))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "MARCO") '(62 . 256) '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${57.49858542781359 + pageOffset} 60))
    '(10 . (${86.16418542781358 + pageOffset} 60))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${67.4985854278136 + pageOffset} 100))
    '(10 . (${86.16418542781358 + pageOffset} 100))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${67.4985854278136 + pageOffset} 110))
    '(10 . (${86.16418542781358 + pageOffset} 110))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${67.4985854278136 + pageOffset} 120))
    '(10 . (${86.16418542781358 + pageOffset} 120))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${67.4985854278136 + pageOffset} 130))
    '(10 . (${86.16418542781358 + pageOffset} 130))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${67.4985854278136 + pageOffset} 140))
    '(10 . (${86.16418542781358 + pageOffset} 140))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${67.4985854278136 + pageOffset} 150))
    '(10 . (${86.16418542781358 + pageOffset} 150))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${67.4985854278136 + pageOffset} 160))
    '(10 . (${86.16418542781358 + pageOffset} 160))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${67.4985854278136 + pageOffset} 170))
    '(10 . (${86.16418542781358 + pageOffset} 170))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${67.4985854278136 + pageOffset} 180))
    '(10 . (${86.16418542781358 + pageOffset} 180))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${67.4985854278136 + pageOffset} 190))
    '(10 . (${86.16418542781358 + pageOffset} 190))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${67.4985854278136 + pageOffset} 200))
    '(10 . (${86.16418542781358 + pageOffset} 200))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${67.4985854278136 + pageOffset} 210))
    '(10 . (${86.16418542781358 + pageOffset} 210))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${67.4985854278136 + pageOffset} 220))
    '(10 . (${86.16418542781358 + pageOffset} 220))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${67.4985854278136 + pageOffset} 230))
    '(10 . (${86.16418542781358 + pageOffset} 230))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${67.4985854278136 + pageOffset} 240))
    '(10 . (${86.16418542781358 + pageOffset} 240))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${67.4985854278136 + pageOffset} 250))
    '(10 . (${86.16418542781358 + pageOffset} 250))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${67.4985854278136 + pageOffset} 260))
    '(10 . (${86.16418542781358 + pageOffset} 260))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${67.4985854278136 + pageOffset} 270))
    '(10 . (${86.16418542781358 + pageOffset} 270))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "MARCO") '(62 . 256) '(100 . "AcDbPolyline") '(90 . 3) '(70 . 0)
    '(10 . (${87.66418542781359 + pageOffset} 280))
    '(10 . (${87.66418542781359 + pageOffset} 95))
    '(10 . (${87.66418542781359 + pageOffset} 50))
  ))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "000") '(10 . (${59.82224467793375 + pageOffset} 61.79205189336852 0.0)) '(40 . 2.0) '(50 . 0.0) '(1 . "${"EJES DE POZOS"}") '(73 . 0) '(72 . 0)))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "000") '(10 . (${59.14518760023338 + pageOffset} 53.86504137540521 0.0)) '(40 . 2.0) '(50 . 0.0) '(1 . "${"CLASE DE TUBERIA"}") '(73 . 0) '(72 . 0)))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "000") '(10 . (${63.25039832749998 + pageOffset} 78.43877398109151 0.0)) '(40 . 2.399999999999999) '(50 . 0.0) '(1 . "${"ABSCISAS"}") '(73 . 0) '(72 . 0)))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "000") '(10 . (${59.82224467793375 + pageOffset} 66.01979083628225 0.0)) '(40 . 2.0) '(50 . 0.0) '(1 . "${"LONGITUD ENTRE"}") '(73 . 0) '(72 . 0)))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "000") '(10 . (${52.0334687239622 + pageOffset} 139.585641516474 0.0)) '(40 . 2.399999999999999) '(50 . 1.57079632679) '(1 . "${"ELEVACION EN METROS"}") '(73 . 0) '(72 . 0)))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "ROTULO") '(62 . 256) '(100 . "AcDbPolyline") '(90 . 4) '(70 . 1)
    '(10 . (${7.498585427813509 + pageOffset} 549.4815823530672))
    '(10 . (${7.498585427813509 + pageOffset} -0.518417646932619))
    '(10 . (${907.4985854278136 + pageOffset} -0.518417646932619))
    '(10 . (${907.4985854278136 + pageOffset} 549.4815823530672))
  ))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "000") '(10 . (${876.4520732836193 + pageOffset} 139.4593025018269 0.0)) '(40 . 2.399999999999999) '(50 . 1.57079632679) '(1 . "${"ELEVACION EN METROS"}") '(73 . 0) '(72 . 0)))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "ROTULO") '(62 . 256) '(100 . "AcDbPolyline") '(90 . 4) '(70 . 1)
    '(10 . (${7.498585427813509 + pageOffset} 549.4815823530672))
    '(10 . (${7.498585427813509 + pageOffset} -0.5184176469326669))
    '(10 . (${907.4985854278136 + pageOffset} -0.5184176469326669))
    '(10 . (${907.4985854278136 + pageOffset} 549.4815823530672))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "MARCO") '(62 . 256) '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${86.16418542781358 + pageOffset} 280))
    '(10 . (${86.16418542781358 + pageOffset} 50))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "MARCO") '(62 . 256) '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.66418542781359 + pageOffset} 60))
    '(10 . (${867.4985854278135 + pageOffset} 60))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "MARCO") '(62 . 256) '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.66418542781359 + pageOffset} 70))
    '(10 . (${867.4985854278135 + pageOffset} 70))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "MARCO") '(62 . 256) '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.66418542781359 + pageOffset} 90))
    '(10 . (${867.4985854278135 + pageOffset} 90))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "MARCO") '(62 . 256) '(100 . "AcDbPolyline") '(90 . 4) '(70 . 0)
    '(10 . (${86.16418542781362 + pageOffset} 280))
    '(10 . (${57.49858542781359 + pageOffset} 280))
    '(10 . (${57.49858542781359 + pageOffset} 50))
    '(10 . (${86.16418542781358 + pageOffset} 50))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.66418542781359 + pageOffset} 270))
    '(10 . (${857.4985854278136 + pageOffset} 270))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.66418542781359 + pageOffset} 260))
    '(10 . (${857.4985854278136 + pageOffset} 260))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.66418542781359 + pageOffset} 250))
    '(10 . (${857.4985854278136 + pageOffset} 250))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.66418542781359 + pageOffset} 240))
    '(10 . (${857.4985854278136 + pageOffset} 240))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.66418542781359 + pageOffset} 230))
    '(10 . (${857.4985854278136 + pageOffset} 230))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.66418542781359 + pageOffset} 220))
    '(10 . (${857.4985854278136 + pageOffset} 220))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.66418542781359 + pageOffset} 210))
    '(10 . (${857.4985854278136 + pageOffset} 210))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.66418542781359 + pageOffset} 200))
    '(10 . (${857.4985854278136 + pageOffset} 200))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.66418542781359 + pageOffset} 190))
    '(10 . (${857.4985854278136 + pageOffset} 190))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.66418542781359 + pageOffset} 180))
    '(10 . (${857.4985854278136 + pageOffset} 180))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.66418542781359 + pageOffset} 170))
    '(10 . (${857.4985854278136 + pageOffset} 170))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.66418542781359 + pageOffset} 160))
    '(10 . (${857.4985854278136 + pageOffset} 160))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.66418542781359 + pageOffset} 150))
    '(10 . (${857.4985854278136 + pageOffset} 150))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.66418542781359 + pageOffset} 140))
    '(10 . (${857.4985854278136 + pageOffset} 140))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.66418542781359 + pageOffset} 130))
    '(10 . (${857.4985854278136 + pageOffset} 130))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.66418542781359 + pageOffset} 120))
    '(10 . (${857.4985854278136 + pageOffset} 120))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.66418542781359 + pageOffset} 110))
    '(10 . (${857.4985854278136 + pageOffset} 110))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.66418542781359 + pageOffset} 100))
    '(10 . (${857.4985854278136 + pageOffset} 100))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "MARCO") '(100 . "AcDbPolyline") '(90 . 4) '(70 . 1)
    '(10 . (${37.49858542781351 + pageOffset} 534.4815823530673))
    '(10 . (${37.49858542781351 + pageOffset} 14.48158235306738))
    '(10 . (${887.4985854278135 + pageOffset} 14.48158235306738))
    '(10 . (${887.4985854278135 + pageOffset} 534.4815823530673))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "MARCO") '(62 . 256) '(100 . "AcDbPolyline") '(90 . 4) '(70 . 1)
    '(10 . (${38.99858542781351 + pageOffset} 532.9815823530672))
    '(10 . (${885.9985854278134 + pageOffset} 532.9815823530672))
    '(10 . (${885.9985854278134 + pageOffset} 45.98158235306738))
    '(10 . (${38.99858542781351 + pageOffset} 45.98158235306738))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "MARCO") '(62 . 256) '(100 . "AcDbPolyline") '(90 . 4) '(70 . 0)
    '(10 . (${87.6641854278135 + pageOffset} 300))
    '(10 . (${867.4985854278135 + pageOffset} 300))
    '(10 . (${867.4985854278135 + pageOffset} 530))
    '(10 . (${87.66418542781363 + pageOffset} 530))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "MARCO") '(62 . 256) '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${57.49858542781351 + pageOffset} 320))
    '(10 . (${86.1641854278135 + pageOffset} 320))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "MARCO") '(62 . 256) '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${57.49858542781351 + pageOffset} 310))
    '(10 . (${86.1641854278135 + pageOffset} 310))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${67.49858542781351 + pageOffset} 360))
    '(10 . (${86.1641854278135 + pageOffset} 360))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${67.49858542781351 + pageOffset} 370))
    '(10 . (${86.1641854278135 + pageOffset} 370))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${67.49858542781351 + pageOffset} 380))
    '(10 . (${86.1641854278135 + pageOffset} 380))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${67.49858542781351 + pageOffset} 390))
    '(10 . (${86.1641854278135 + pageOffset} 390))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${67.49858542781351 + pageOffset} 400))
    '(10 . (${86.1641854278135 + pageOffset} 400))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${67.49858542781351 + pageOffset} 410))
    '(10 . (${86.1641854278135 + pageOffset} 410))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${67.49858542781351 + pageOffset} 420))
    '(10 . (${86.1641854278135 + pageOffset} 420))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${67.49858542781351 + pageOffset} 430))
    '(10 . (${86.1641854278135 + pageOffset} 430))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${67.49858542781351 + pageOffset} 440))
    '(10 . (${86.1641854278135 + pageOffset} 440))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${67.49858542781351 + pageOffset} 450))
    '(10 . (${86.1641854278135 + pageOffset} 450))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${67.49858542781351 + pageOffset} 460))
    '(10 . (${86.1641854278135 + pageOffset} 460))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${67.49858542781351 + pageOffset} 470))
    '(10 . (${86.1641854278135 + pageOffset} 470))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${67.49858542781351 + pageOffset} 480))
    '(10 . (${86.1641854278135 + pageOffset} 480))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${67.49858542781351 + pageOffset} 490))
    '(10 . (${86.1641854278135 + pageOffset} 490))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${67.49858542781351 + pageOffset} 500))
    '(10 . (${86.1641854278135 + pageOffset} 500))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${67.49858542781351 + pageOffset} 510))
    '(10 . (${86.1641854278135 + pageOffset} 510))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${67.49858542781351 + pageOffset} 520))
    '(10 . (${86.1641854278135 + pageOffset} 520))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "MARCO") '(62 . 256) '(100 . "AcDbPolyline") '(90 . 3) '(70 . 0)
    '(10 . (${87.6641854278135 + pageOffset} 530))
    '(10 . (${87.6641854278135 + pageOffset} 345))
    '(10 . (${87.6641854278135 + pageOffset} 300))
  ))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "000") '(10 . (${61.18426275308456 + pageOffset} 312.7441842669591 0.0)) '(40 . 2.0) '(50 . 0.0) '(1 . "${"EJES DE POZOS"}") '(73 . 0) '(72 . 0)))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "000") '(10 . (${59.1451876002333 + pageOffset} 303.8650413754052 0.0)) '(40 . 2.0) '(50 . 0.0) '(1 . "${"CLASE DE TUBERIA"}") '(73 . 0) '(72 . 0)))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "000") '(10 . (${66.58734086718623 + pageOffset} 330.0029902118492 0.0)) '(40 . 2.399999999999999) '(50 . 0.0) '(1 . "${"ABSCISAS"}") '(73 . 0) '(72 . 0)))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "000") '(10 . (${59.82224467793366 + pageOffset} 316.0197908362822 0.0)) '(40 . 2.0) '(50 . 0.0) '(1 . "${"LONGITUD ENTRE"}") '(73 . 0) '(72 . 0)))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "000") '(10 . (${52.03346872396211 + pageOffset} 389.585641516474 0.0)) '(40 . 2.399999999999999) '(50 . 1.57079632679) '(1 . "${"ELEVACION EN METROS"}") '(73 . 0) '(72 . 0)))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "000") '(10 . (${876.452073283619 + pageOffset} 389.4593025018269 0.0)) '(40 . 2.399999999999999) '(50 . 1.57079632679) '(1 . "${"ELEVACION EN METROS"}") '(73 . 0) '(72 . 0)))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "MARCO") '(62 . 256) '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${86.1641854278135 + pageOffset} 530))
    '(10 . (${86.1641854278135 + pageOffset} 300))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "MARCO") '(62 . 256) '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.6641854278135 + pageOffset} 310))
    '(10 . (${867.4985854278135 + pageOffset} 310))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "MARCO") '(62 . 256) '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.6641854278135 + pageOffset} 320))
    '(10 . (${867.4985854278135 + pageOffset} 320))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "MARCO") '(62 . 256) '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.6641854278135 + pageOffset} 340))
    '(10 . (${867.4985854278135 + pageOffset} 340))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "MARCO") '(62 . 256) '(100 . "AcDbPolyline") '(90 . 4) '(70 . 0)
    '(10 . (${86.16418542781354 + pageOffset} 530))
    '(10 . (${57.49858542781351 + pageOffset} 530))
    '(10 . (${57.49858542781351 + pageOffset} 300))
    '(10 . (${86.1641854278135 + pageOffset} 300))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.6641854278135 + pageOffset} 520))
    '(10 . (${857.4985854278136 + pageOffset} 520))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.6641854278135 + pageOffset} 510))
    '(10 . (${857.4985854278136 + pageOffset} 510))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.6641854278135 + pageOffset} 500))
    '(10 . (${857.4985854278136 + pageOffset} 500))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.6641854278135 + pageOffset} 490))
    '(10 . (${857.4985854278136 + pageOffset} 490))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.6641854278135 + pageOffset} 480))
    '(10 . (${857.4985854278136 + pageOffset} 480))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.6641854278135 + pageOffset} 470))
    '(10 . (${857.4985854278136 + pageOffset} 470))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.6641854278135 + pageOffset} 460))
    '(10 . (${857.4985854278136 + pageOffset} 460))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.6641854278135 + pageOffset} 450))
    '(10 . (${857.4985854278136 + pageOffset} 450))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.6641854278135 + pageOffset} 440))
    '(10 . (${857.4985854278136 + pageOffset} 440))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.6641854278135 + pageOffset} 430))
    '(10 . (${857.4985854278136 + pageOffset} 430))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.6641854278135 + pageOffset} 420))
    '(10 . (${857.4985854278136 + pageOffset} 420))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.6641854278135 + pageOffset} 410))
    '(10 . (${857.4985854278136 + pageOffset} 410))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.6641854278135 + pageOffset} 400))
    '(10 . (${857.4985854278136 + pageOffset} 400))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.6641854278135 + pageOffset} 390))
    '(10 . (${857.4985854278136 + pageOffset} 390))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.6641854278135 + pageOffset} 380))
    '(10 . (${857.4985854278136 + pageOffset} 380))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.6641854278135 + pageOffset} 370))
    '(10 . (${857.4985854278136 + pageOffset} 370))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.6641854278135 + pageOffset} 360))
    '(10 . (${857.4985854278136 + pageOffset} 360))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${87.6641854278135 + pageOffset} 350))
    '(10 . (${857.4985854278136 + pageOffset} 350))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "MARCO") '(62 . 256) '(100 . "AcDbPolyline") '(90 . 8) '(70 . 1)
    '(10 . (${369.2450065431532 + pageOffset} 42.98158235306738))
    '(10 . (${427.2818065431531 + pageOffset} 42.98158235306738))
    '(10 . (${429.2818065431531 + pageOffset} 40.98158235306738))
    '(10 . (${429.2818065431531 + pageOffset} 17.98158235306738))
    '(10 . (${427.2818065431531 + pageOffset} 15.98158235306738))
    '(10 . (${369.2450065431532 + pageOffset} 15.98158235306738))
    '(10 . (${367.2450065431532 + pageOffset} 17.98158235306738))
    '(10 . (${367.2450065431532 + pageOffset} 40.98158235306738))
  ))`);
  lines.push(`  (entmake (list '(0 . "LINE") '(8 . "MARCO") '(10 . (${37.49858542781351 + pageOffset} 14.48158235306738 0.0)) '(11 . (${887.4985854278136 + pageOffset} 14.48158235306738 0.0))))`);
  lines.push(`  (entmake (list '(0 . "LINE") '(8 . "MARCO") '(10 . (${37.49858542781351 + pageOffset} 44.48158235306737 0.0)) '(11 . (${887.4985854278136 + pageOffset} 44.48158235306737 0.0))))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "MARCO") '(62 . 256) '(100 . "AcDbPolyline") '(90 . 8) '(70 . 1)
    '(10 . (${167.1346315186642 + pageOffset} 15.98158235306738))
    '(10 . (${40.9985854278135 + pageOffset} 15.98158235306738))
    '(10 . (${38.99858542781351 + pageOffset} 17.98158235306738))
    '(10 . (${38.99858542781351 + pageOffset} 40.98158235306738))
    '(10 . (${40.9985854278135 + pageOffset} 42.98158235306738))
    '(10 . (${167.1346315186642 + pageOffset} 42.98158235306738))
    '(10 . (${169.1346315186642 + pageOffset} 40.98158235306738))
    '(10 . (${169.1346315186642 + pageOffset} 17.98158235306738))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "MARCO") '(62 . 256) '(100 . "AcDbPolyline") '(90 . 8) '(70 . 1)
    '(10 . (${239.1714315186643 + pageOffset} 42.98158235306738))
    '(10 . (${297.2082315186643 + pageOffset} 42.98158235306738))
    '(10 . (${299.2082315186643 + pageOffset} 40.98158235306738))
    '(10 . (${299.2082315186643 + pageOffset} 17.98158235306738))
    '(10 . (${297.2082315186643 + pageOffset} 15.98158235306738))
    '(10 . (${239.1714315186643 + pageOffset} 15.98158235306738))
    '(10 . (${237.1714315186643 + pageOffset} 17.98158235306738))
    '(10 . (${237.1714315186643 + pageOffset} 40.98158235306738))
  ))`);
  lines.push(`  (entmake (list '(0 . "LINE") '(8 . "MARCO") '(62 . 256) '(10 . (${235.6714315186643 + pageOffset} 44.48158235306737 0.0)) '(11 . (${235.6714315186643 + pageOffset} 14.48158235306738 0.0))))`);
  lines.push(`  (entmake (list '(0 . "LINE") '(8 . "MARCO") '(62 . 256) '(10 . (${170.6346315186642 + pageOffset} 44.48158235306737 0.0)) '(11 . (${170.6346315186642 + pageOffset} 14.48158235306738 0.0))))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "MARCO") '(62 . 256) '(100 . "AcDbPolyline") '(90 . 8) '(70 . 1)
    '(10 . (${174.1346315186642 + pageOffset} 42.98158235306738))
    '(10 . (${232.1714315186643 + pageOffset} 42.98158235306738))
    '(10 . (${234.1714315186643 + pageOffset} 40.98158235306738))
    '(10 . (${234.1714315186643 + pageOffset} 17.98158235306738))
    '(10 . (${232.1714315186643 + pageOffset} 15.98158235306738))
    '(10 . (${174.1346315186642 + pageOffset} 15.98158235306738))
    '(10 . (${172.1346315186642 + pageOffset} 17.98158235306738))
    '(10 . (${172.1346315186642 + pageOffset} 40.98158235306738))
  ))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "MARCO") '(62 . 256) '(10 . (${239.1714315186643 + pageOffset} 39.28366653359382 0.0)) '(40 . 1.759999999999999) '(50 . 0.0) '(1 . "${"REVISO:"}") '(73 . 0) '(72 . 0)))`);
  lines.push(`  (entmake (list '(0 . "LINE") '(8 . "MARCO") '(62 . 256) '(10 . (${300.7082315186643 + pageOffset} 44.48158235306737 0.0)) '(11 . (${300.7082315186643 + pageOffset} 14.48158235306738 0.0))))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "MARCO") '(62 . 256) '(100 . "AcDbPolyline") '(90 . 8) '(70 . 1)
    '(10 . (${304.2082315186643 + pageOffset} 42.98158235306738))
    '(10 . (${362.2450065431532 + pageOffset} 42.98158235306738))
    '(10 . (${364.2450065431532 + pageOffset} 40.98158235306738))
    '(10 . (${364.2450065431532 + pageOffset} 17.98158235306738))
    '(10 . (${362.2450065431532 + pageOffset} 15.98158235306738))
    '(10 . (${304.2082315186643 + pageOffset} 15.98158235306738))
    '(10 . (${302.2082315186643 + pageOffset} 17.98158235306738))
    '(10 . (${302.2082315186643 + pageOffset} 40.98158235306738))
  ))`);
  lines.push(`  (entmake (list '(0 . "LINE") '(8 . "MARCO") '(62 . 256) '(10 . (${322.2905067143075 + pageOffset} 26.98158235306738 0.0)) '(11 . (${362.325610678212 + pageOffset} 26.98158235306738 0.0))))`);
  lines.push(`  (entmake (list '(0 . "LINE") '(8 . "MARCO") '(62 . 256) '(10 . (${322.2099025792486 + pageOffset} 37.98158235306738 0.0)) '(11 . (${362.2450065431532 + pageOffset} 37.98158235306738 0.0))))`);
  lines.push(`  (entmake (list '(0 . "LINE") '(8 . "MARCO") '(62 . 256) '(10 . (${322.4261163347947 + pageOffset} 32.48691856042052 0.0)) '(11 . (${362.4612202986992 + pageOffset} 32.48691856042052 0.0))))`);
  lines.push(`  (entmake (list '(0 . "LINE") '(8 . "MARCO") '(62 . 256) '(10 . (${302.2082315186643 + pageOffset} 21.48158235306738 0.0)) '(11 . (${364.2450065431532 + pageOffset} 21.48158235306738 0.0))))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "MARCO") '(62 . 256) '(10 . (${304.2082315186643 + pageOffset} 33.61082818749248 0.0)) '(40 . 1.759999999999999) '(50 . 0.0) '(1 . "${"LEV. TOP."}") '(73 . 0) '(72 . 0)))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "MARCO") '(62 . 256) '(10 . (${304.1821505338256 + pageOffset} 27.7048266748896 0.0)) '(40 . 1.759999999999999) '(50 . 0.0) '(1 . "${"FECHA"}") '(73 . 0) '(72 . 0)))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "MARCO") '(62 . 256) '(10 . (${304.2082315186643 + pageOffset} 17.98158235306738 0.0)) '(40 . 1.759999999999999) '(50 . 0.0) '(1 . "${"ESCALA"}") '(73 . 0) '(72 . 0)))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "MARCO") '(62 . 256) '(10 . (${304.2082315186643 + pageOffset} 39.17082818708269 0.0)) '(40 . 1.759999999999999) '(50 . 0.0) '(1 . "${"DIBUJO"}") '(73 . 0) '(72 . 0)))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "MARCO") '(62 . 256) '(10 . (${320.2664876474674 + pageOffset} 33.61082818749248 0.0)) '(40 . 1.759999999999999) '(50 . 0.0) '(1 . "${":"}") '(73 . 0) '(72 . 0)))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "MARCO") '(62 . 256) '(10 . (${320.2664876474674 + pageOffset} 27.7048266748896 0.0)) '(40 . 1.759999999999999) '(50 . 0.0) '(1 . "${":"}") '(73 . 0) '(72 . 0)))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "MARCO") '(62 . 256) '(10 . (${320.2664876474674 + pageOffset} 17.98158235306738 0.0)) '(40 . 1.759999999999999) '(50 . 0.0) '(1 . "${":"}") '(73 . 0) '(72 . 0)))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "MARCO") '(62 . 256) '(10 . (${320.2664876474674 + pageOffset} 39.17082818708269 0.0)) '(40 . 1.759999999999999) '(50 . 0.0) '(1 . "${":"}") '(73 . 0) '(72 . 0)))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "MARCO") '(62 . 256) '(10 . (${369.2450065431532 + pageOffset} 39.28366653359382 0.0)) '(40 . 1.759999999999999) '(50 . 0.0) '(1 . "${"APROBADO"}") '(73 . 0) '(72 . 0)))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "MARCO") '(62 . 256) '(100 . "AcDbPolyline") '(90 . 8) '(70 . 1)
    '(10 . (${695.9985854278137 + pageOffset} 42.98158235306738))
    '(10 . (${828.9985854278137 + pageOffset} 42.98158235306738))
    '(10 . (${830.9985854278137 + pageOffset} 40.98158235306738))
    '(10 . (${830.9985854278137 + pageOffset} 17.98158235306738))
    '(10 . (${828.9985854278137 + pageOffset} 15.98158235306738))
    '(10 . (${695.9985854278137 + pageOffset} 15.98158235306738))
    '(10 . (${693.9985854278137 + pageOffset} 17.98158235306738))
    '(10 . (${693.9985854278137 + pageOffset} 40.98158235306738))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "MARCO") '(62 . 256) '(100 . "AcDbPolyline") '(90 . 8) '(70 . 1)
    '(10 . (${555.9985854278137 + pageOffset} 42.98158235306738))
    '(10 . (${688.9985854278137 + pageOffset} 42.98158235306738))
    '(10 . (${690.9985854278137 + pageOffset} 40.98158235306738))
    '(10 . (${690.9985854278137 + pageOffset} 17.98158235306738))
    '(10 . (${688.9985854278137 + pageOffset} 15.98158235306738))
    '(10 . (${555.9985854278137 + pageOffset} 15.98158235306738))
    '(10 . (${553.9985854278137 + pageOffset} 17.98158235306738))
    '(10 . (${553.9985854278137 + pageOffset} 40.98158235306738))
  ))`);
  lines.push(`  (entmake (list '(0 . "LINE") '(8 . "MARCO") '(62 . 256) '(10 . (${532.4985854278139 + pageOffset} 35.48158235306738 0.0)) '(11 . (${532.4985854278139 + pageOffset} 15.98158235306738 0.0))))`);
  lines.push(`  (entmake (list '(0 . "LINE") '(8 . "MARCO") '(62 . 256) '(10 . (${552.4985854278137 + pageOffset} 44.48158235306737 0.0)) '(11 . (${552.4985854278137 + pageOffset} 14.48158235306738 0.0))))`);
  lines.push(`  (entmake (list '(0 . "LINE") '(8 . "MARCO") '(62 . 256) '(10 . (${512.4985854278137 + pageOffset} 35.48158235306738 0.0)) '(11 . (${512.4985854278137 + pageOffset} 15.98158235306738 0.0))))`);
  lines.push(`  (entmake (list '(0 . "LINE") '(8 . "MARCO") '(62 . 256) '(10 . (${430.7818065431531 + pageOffset} 44.48158235306737 0.0)) '(11 . (${430.7818065431531 + pageOffset} 14.48158235306738 0.0))))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "MARCO") '(62 . 256) '(100 . "AcDbPolyline") '(90 . 8) '(70 . 1)
    '(10 . (${434.2818065431531 + pageOffset} 42.98158235306738))
    '(10 . (${548.9985854278139 + pageOffset} 42.98158235306738))
    '(10 . (${550.9985854278137 + pageOffset} 40.98158235306738))
    '(10 . (${550.9985854278137 + pageOffset} 17.98158235306738))
    '(10 . (${548.9985854278139 + pageOffset} 15.98158235306738))
    '(10 . (${434.2818065431531 + pageOffset} 15.98158235306738))
    '(10 . (${432.2818065431532 + pageOffset} 17.98158235306738))
    '(10 . (${432.2818065431532 + pageOffset} 40.98158235306738))
  ))`);
  lines.push(`  (entmake (list '(0 . "LINE") '(8 . "MARCO") '(62 . 256) '(10 . (${432.2818065431532 + pageOffset} 35.48158235306738 0.0)) '(11 . (${550.9985854278137 + pageOffset} 35.48158235306738 0.0))))`);
  lines.push(`  (entmake (list '(0 . "LINE") '(8 . "MARCO") '(62 . 256) '(10 . (${432.212405653582 + pageOffset} 29.48158235306738 0.0)) '(11 . (${550.9291845382425 + pageOffset} 29.48158235306738 0.0))))`);
  lines.push(`  (entmake (list '(0 . "LINE") '(8 . "MARCO") '(62 . 256) '(10 . (${432.2818065431532 + pageOffset} 24.98158235306738 0.0)) '(11 . (${550.9985854278137 + pageOffset} 24.98158235306738 0.0))))`);
  lines.push(`  (entmake (list '(0 . "LINE") '(8 . "MARCO") '(62 . 256) '(10 . (${432.2818065431532 + pageOffset} 20.48158235306738 0.0)) '(11 . (${550.9985854278137 + pageOffset} 20.48158235306738 0.0))))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "MARCO") '(62 . 256) '(10 . (${462.6114805157102 + pageOffset} 31.21043031976153 0.0)) '(40 . 1.759999999999999) '(50 . 0.0) '(1 . "${"REFERENCIA"}") '(73 . 0) '(72 . 0)))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "MARCO") '(62 . 256) '(10 . (${468.9637813500658 + pageOffset} 37.68510105331694 0.0)) '(40 . 3.08) '(50 . 0.0) '(1 . "${"R E V I S I O N E S"}") '(73 . 0) '(72 . 0)))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "MARCO") '(62 . 256) '(10 . (${518.5153071675625 + pageOffset} 31.21043031976154 0.0)) '(40 . 1.759999999999999) '(50 . 0.0) '(1 . "${"FECHA"}") '(73 . 0) '(72 . 0)))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "MARCO") '(62 . 256) '(10 . (${535.532760805091 + pageOffset} 31.03716285850822 0.0)) '(40 . 1.759999999999999) '(50 . 0.0) '(1 . "${"RESPONS."}") '(73 . 0) '(72 . 0)))`);
  lines.push(`  (entmake (list '(0 . "LINE") '(8 . "MARCO") '(62 . 256) '(10 . (${692.4985854278137 + pageOffset} 44.48158235306737 0.0)) '(11 . (${692.4985854278137 + pageOffset} 14.48158235306738 0.0))))`);
  lines.push(`  (entmake (list '(0 . "LINE") '(8 . "MARCO") '(62 . 256) '(10 . (${832.4985854278137 + pageOffset} 29.48158235306738 0.0)) '(11 . (${887.4985854278136 + pageOffset} 29.48158235306738 0.0))))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "MARCO") '(62 . 256) '(100 . "AcDbPolyline") '(90 . 8) '(70 . 1)
    '(10 . (${835.9985854278139 + pageOffset} 27.98158235306738))
    '(10 . (${883.9985854278139 + pageOffset} 27.98158235306738))
    '(10 . (${885.9985854278139 + pageOffset} 25.98158235306738))
    '(10 . (${885.9985854278139 + pageOffset} 17.98158235306738))
    '(10 . (${883.9985854278139 + pageOffset} 15.98158235306738))
    '(10 . (${835.9985854278139 + pageOffset} 15.98158235306738))
    '(10 . (${833.9985854278136 + pageOffset} 17.98158235306738))
    '(10 . (${833.9985854278136 + pageOffset} 25.98158235306738))
  ))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "MARCO") '(62 . 256) '(100 . "AcDbPolyline") '(90 . 8) '(70 . 1)
    '(10 . (${863.4985854278139 + pageOffset} 42.98158235306738))
    '(10 . (${883.9985854278139 + pageOffset} 42.98158235306738))
    '(10 . (${885.9985854278139 + pageOffset} 40.98158235306738))
    '(10 . (${885.9985854278139 + pageOffset} 32.98158235306738))
    '(10 . (${883.9985854278139 + pageOffset} 30.98158235306738))
    '(10 . (${863.4985854278139 + pageOffset} 30.98158235306738))
    '(10 . (${861.4985854278137 + pageOffset} 32.98158235306738))
    '(10 . (${861.4985854278137 + pageOffset} 40.98158235306738))
  ))`);
  lines.push(`  (entmake (list '(0 . "LINE") '(8 . "MARCO") '(62 . 256) '(10 . (${832.4985854278137 + pageOffset} 44.48158235306737 0.0)) '(11 . (${832.4985854278137 + pageOffset} 14.48158235306738 0.0))))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "MARCO") '(62 . 256) '(10 . (${835.8201078738838 + pageOffset} 39.52064743976377 0.0)) '(40 . 1.759999999999999) '(50 . 0.0) '(1 . "${"PLANO:"}") '(73 . 0) '(72 . 0)))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "MARCO") '(62 . 256) '(100 . "AcDbPolyline") '(90 . 8) '(70 . 1)
    '(10 . (${835.9985854278139 + pageOffset} 42.98158235306738))
    '(10 . (${856.4985854278139 + pageOffset} 42.98158235306738))
    '(10 . (${858.4985854278137 + pageOffset} 40.98158235306738))
    '(10 . (${858.4985854278137 + pageOffset} 32.98158235306738))
    '(10 . (${856.4985854278139 + pageOffset} 30.98158235306738))
    '(10 . (${835.9985854278139 + pageOffset} 30.98158235306738))
    '(10 . (${833.9985854278136 + pageOffset} 32.98158235306738))
    '(10 . (${833.9985854278136 + pageOffset} 40.98158235306738))
  ))`);
  lines.push(`  (entmake (list '(0 . "LINE") '(8 . "MARCO") '(62 . 256) '(10 . (${859.9985854278139 + pageOffset} 29.48158235306738 0.0)) '(11 . (${859.9985854278139 + pageOffset} 44.48158235306737 0.0))))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "MARCO") '(62 . 256) '(10 . (${839.8728350867497 + pageOffset} 21.36698480872905 0.0)) '(40 . 1.7) '(50 . 0.0) '(1 . "${""}") '(73 . 0) '(72 . 0)))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "MARCO") '(62 . 256) '(10 . (${844.1172488622495 + pageOffset} 33.15346969152448 0.0)) '(40 . 3.85) '(50 . 0.0) '(1 . "${`${pageNum}`}") '(73 . 0) '(72 . 0)))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "MARCO") '(62 . 256) '(10 . (${870.953627142522 + pageOffset} 33.18629711307973 0.0)) '(40 . 3.85) '(50 . 0.0) '(1 . "${`${totalPages}`}") '(73 . 0) '(72 . 0)))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "MARCO") '(62 . 256) '(10 . (${862.9009433316268 + pageOffset} 39.46063118400985 0.0)) '(40 . 1.759999999999999) '(50 . 0.0) '(1 . "${"SON:"}") '(73 . 0) '(72 . 0)))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "MARCO") '(62 . 256) '(10 . (${174.1346315186642 + pageOffset} 39.28366653359382 0.0)) '(40 . 1.759999999999999) '(50 . 0.0) '(1 . "${"DISE\\U+00D1O Y C\\U+00C1LCULO:"}") '(73 . 0) '(72 . 0)))`);
  lines.push(`  (entmake (list '(0 . "LINE") '(8 . "MARCO") '(62 . 256) '(10 . (${369.2450065431532 + pageOffset} 21.48158235306738 0.0)) '(11 . (${427.2818065431531 + pageOffset} 21.48158235306738 0.0))))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "MARCO") '(62 . 256) '(10 . (${328.7286675261764 + pageOffset} 18.04401022224773 0.0)) '(40 . 2.639999999999999) '(50 . 0.0) '(1 . "${`H=1 : ${P.escalaX || 250}  V=1 : ${P.escalaY || 100}`}") '(73 . 0) '(72 . 0)))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "MARCO") '(62 . 256) '(10 . (${333.2888390509664 + pageOffset} 28.03333500890659 0.0)) '(40 . 2.639999999999999) '(50 . 0.0) '(1 . "${fechaStr}") '(73 . 0) '(72 . 0)))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "MARCO") '(62 . 256) '(10 . (${371.0230245513387 + pageOffset} 17.72974489763351 0.0)) '(40 . 2.2) '(50 . 0.0) '(1 . "${""}") '(73 . 0) '(72 . 0)))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "MARCO") '(62 . 256) '(10 . (${341.7361912597002 + pageOffset} 39.03333500890659 0.0)) '(40 . 2.639999999999999) '(50 . 0.0) '(1 . "${"AMCAUDALES"}") '(73 . 0) '(72 . 0)))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(8 . "MARCO") '(62 . 256) '(10 . (${608.0046222627387 + pageOffset} 27.49653695859344 0.0)) '(40 . 3.85) '(50 . 0.0) '(1 . "${"PERFILES"}") '(73 . 0) '(72 . 0)))`);
  lines.push(`  (entmake (list '(0 . "LINE") '(8 . "MARCO") '(62 . 256) '(10 . (${241.6898315186643 + pageOffset} 23.29372256860239 0.0)) '(11 . (${294.6898315186643 + pageOffset} 23.29372256860239 0.0))))`);
  lines.push(`  (SETVAR "TEXTSTYLE" "STANDARD")`);
  const boxW = 110.0;
  const sDis = Math.min(4.0, boxW / (Math.max(1, (P.disenador || "AMCAUDALES").length) * 1.0));
  const sRev = Math.min(4.0, boxW / (Math.max(1, (P.revisor || "AMCAUDALES").length) * 1.0));
  const sPro = Math.min(4.0, boxW / (Math.max(1, (P.proyecto || "").length) * 1.0));
  
  lines.push(`  (entmake (list '(0 . "TEXT") '(67 . 1) '(8 . "MARCO") '(10 . (${270.0 + pageOffset} 20.5 0.0)) '(11 . (${270.0 + pageOffset} 20.5 0.0)) '(40 . ${sRev.toFixed(2)}) '(50 . 0.0) '(1 . "${(P.revisor || "AMCAUDALES").toUpperCase()}") '(72 . 1) '(73 . 2)))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(67 . 1) '(8 . "MARCO") '(62 . 256) '(10 . (${251.5574986400831 + pageOffset} 17.3020297722415 0.0)) '(40 . 2.0) '(50 . 0.0) '(1 . "${`${totalPages}`}") '(73 . 0) '(72 . 0)))`);
  lines.push(`  (entmake (list '(0 . "LINE") '(67 . 1) '(8 . "MARCO") '(62 . 256) '(10 . (${365.7450065431532 + pageOffset} 44.48158235306737 0.0)) '(11 . (${365.7450065431532 + pageOffset} 14.48158235306738 0.0))))`);
  lines.push(`  (entmake (list '(0 . "LINE") '(67 . 1) '(8 . "MARCO") '(62 . 256) '(10 . (${174.1346315186642 + pageOffset} 23.29372256860239 0.0)) '(11 . (${232.1714315186643 + pageOffset} 23.29372256860239 0.0))))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(67 . 1) '(8 . "MARCO") '(10 . (${203.15 + pageOffset} 20.5 0.0)) '(11 . (${203.15 + pageOffset} 20.5 0.0)) '(40 . ${sDis.toFixed(2)}) '(50 . 0.0) '(1 . "${(P.disenador || "AMCAUDALES").toUpperCase()}") '(72 . 1) '(73 . 2)))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(67 . 1) '(8 . "MARCO") '(62 . 256) '(10 . (${187.7785431148443 + pageOffset} 17.3020297722415 0.0)) '(40 . 2.0) '(50 . 0.0) '(1 . "${"MAT. 25202-80273 CND"}") '(73 . 0) '(72 . 0)))`);
  lines.push(`  (entmake (list '(0 . "TEXT") '(67 . 1) '(8 . "MARCO") '(10 . (${762.49 + pageOffset} 30.0 0.0)) '(11 . (${762.49 + pageOffset} 30.0 0.0)) '(40 . ${sPro.toFixed(2)}) '(50 . 0.0) '(1 . "${(P.proyecto || "").toUpperCase()}") '(72 . 1) '(73 . 2)))`);
  lines.push(`  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "CUADRI") '(100 . "AcDbPolyline") '(90 . 2) '(70 . 0)
    '(10 . (${67.49858542781351 + pageOffset} 350))
    '(10 . (${86.1641854278135 + pageOffset} 350))
  ))`);
  return lines;
}
