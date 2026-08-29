# Project Status: Atril (web-atril)

## Arquitectura General
El proyecto es un fork de **GraceChords**, estructurado como un monorepo utilizando **npm workspaces**. 
- **Tecnologías:** React + Vite (Web), Supabase (Auth/DB/Storage), Cloudflare Pages / Workers (Hosting).
- **Paquetes:**
    - `apps/web`: Aplicación principal React.
    - `apps/mobile`: Aplicación móvil (Expo).
    - `packages/core`: Lógica compartida (parser de ChordPro, transposición).
    - `packages/tokens`: Design tokens (colores, tipografía).
- **Branding y Contenido:** Rebrand completo de la UI visible y limpieza general de archivos de localización (`i18n`), eliminando términos religiosos/plantillas heredadas y adaptando el vocabulario para bandas de rock y músicos ("Atril" / Sisirock). Los paquetes internos mantienen el scope `@gracechords` para estabilidad del monorepo.

## Estado de Objetivos (100% Completados)

### 1. Rebrand a "Atril" / Sisirock & Contenido
- **Estado:** **Completado (100%)**
- **Detalle:** Actualizado en títulos, metadatos, manifest PWA y traducciones visibles en español e inglés. Eliminadas referencias cristianas/heredadas.

### 2. Transposición automática (Bb / Eb) & Notas Privadas
- **Estado:** **Completado (100%)**
- **Detalle:** Offsets configurados (+2 para Bb, +9 para Eb) operativos junto con transposición manual. Tabla `notes` con RLS desplegada en Supabase.

### 3. Migraciones SQL & Build Clean
- **Estado:** **Completado (100%)**
- **Detalle:** Todas las migraciones aplicadas exitosamente en Supabase. Build de Vite compila limpio (`exit code 0`).

### 4. Cloudflare Worker Static Assets Config
- **Estado:** **Completado (100%)**
- **Detalle:** Creado `apps/web/wrangler.toml` configurado con el binding de `[assets]` apuntando a `./dist` y `not_found_handling = "single-page-application"` para servir la SPA de Atril correctamente en vez del "Hello world".

