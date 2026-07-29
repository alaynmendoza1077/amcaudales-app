# AMCaudales Pro - Software Web de Ingeniería Hidráulica y Caudales

AMCaudales es una suite profesional completa de ingeniería hidráulica para diseño de redes de alcantarillado sanitario y pluvial, cálculo de caudales, hidrología, simulación SWMM, estructuras de separación/aliviaderos, presupuesto (Banco/Maestra), acometidas y generación de planos LISP y exportación a Excel.

## Funcionalidades Principales

- **Autenticación y Sesiones de Usuario**: Inicia sesión, gestiona tus proyectos guardados en la nube y sincroniza entre dispositivos.
- **Motor Hidráulico Integrado**: Cálculo en tiempo real de redes, trazado de tuberías y pozos.
- **Persistencia en la Nube y Local (.AMC)**: Guarda tus diseños localmente o en tu cuenta personal.
- **Reportes y Presupuestos**: Exportación oficial a Hoja Maestra Excel, Presupuesto Banco y planos LISP/DWG/DXF.

## Cómo Ejecutar Localmente

1. Clonar o acceder a la carpeta `amcaudales_app`.
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Iniciar servidor de desarrollo:
   ```bash
   npm start
   ```
4. Para construir la versión de producción:
   ```bash
   npm run build
   ```

## Configuración de Base de Datos y Sesiones (Supabase / Cloud Backend)

Configura tus credenciales en un archivo `.env` tomando como base `.env.example`:
- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`
