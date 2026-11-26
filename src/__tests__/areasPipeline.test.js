import { runAreasAutomatedTests } from '../utils/areasAutoTest';

describe('Pipeline Integral de Áreas Aferentes (Visor -> Datos -> Cálculos -> Visor Resumen -> SWMM)', () => {
  test('Ejecuta todas las pruebas automáticas sin contaminación de vías ni pérdida de polígonos', async () => {
    const report = await runAreasAutomatedTests();
    report.checks.forEach((chk) => {
      if (!chk.passed) {
        // eslint-disable-next-line no-console
        console.error(`FALLO EN: ${chk.name} -> ${chk.detail}`);
      }
      expect(chk.passed).toBe(true);
    });
    expect(report.allPassed).toBe(true);
    expect(report.passedCount).toBe(6);
  });
});
