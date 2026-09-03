# Bug Fix Summary: Song Suggestions with song_id = null

## Problem
Las canciones nuevas (tipo "addition") se guardaban en `song_suggestions` con `song_id = null` porque todavía no existía una canción asociada. Sin embargo, el panel `SuggestionReviewPanel` filtraba las sugerencias solo por `song_id` específico, lo que hacía que las sugerencias de nuevas canciones con `song_id = null` nunca aparecieran en la interfaz de revisión para ser aprobadas o rechazadas.

## Solution
Se implementó un nuevo flujo para mostrar y gestionar las sugerencias de nuevas canciones pendientes en una sección dedicada del portal del editor.

## Files Changed

### 1. **packages/core/src/songs/songSuggestions.js**
**Cambio**: Agregué la función `fetchPendingAdditionSuggestions`

```javascript
export async function fetchPendingAdditionSuggestions(client) {
  // Obtiene todas las sugerencias de tipo 'addition' con song_id = null
  // que tengan estado 'pending'
}
```

**Descripción**: Esta función obtiene todas las sugerencias pendientes de tipo "addition" sin un `song_id` asociado. Esto incluye todas las nuevas canciones propuestas por usuarios que aún no han sido aprobadas.

---

### 2. **apps/web/src/components/editor/PendingAdditionSuggestionsPanel.jsx** (NUEVO)
**Cambio**: Creé un nuevo componente React

**Características**:
- Muestra una lista de sugerencias de nuevas canciones pendientes de aprobación
- Permite a los editores (role >= 'editor') revisar, aprobar o rechazar las sugerencias
- Muestra la metadata de la canción propuesta (título, artista, etc.)
- Muestra el contenido ChordPro propuesto con diff visual
- Permite hacer un "touch up" (ajuste) de la sugerencia antes de aprobarla
- Compatible con el sistema de rechazo con razón

**Componentes internos**:
- `AdditionSuggestionCard`: Card individual para cada sugerencia
- `MetadataDiff`: Mostrar cambios en metadata
- `ContentDiff`: Mostrar contenido ChordPro propuesto
- `RejectionForm`: Formulario para rechazar con razón

---

### 3. **apps/web/src/pages/portal/EditorPage.jsx**
**Cambios**:
- Importé el componente `PendingAdditionSuggestionsPanel`
- Agregué la lógica para mostrar el panel cuando:
  - No hay una canción siendo editada (`!song`)
  - No hay un draft personal siendo editado (`!personalId`)
  - El usuario es editor o superior (`isAtLeast('editor')`)

**Ubicación en el render**:
```jsx
{/* Pending new songs review panel (Editor+, when no song is being edited) */}
{!song && !personalId && isAtLeast('editor') && (
  <PendingAdditionSuggestionsPanel
    onApproved={() => {}}
    onRejected={() => {}}
    onTouchUp={handleTouchUp}
  />
)}
```

---

### 4. **Translation Files**
Agregué nuevas claves de traducción en todos los idiomas soportados:

**Claves agregadas**:
- `pendingNewSongs`: Título del panel de sugerencias de nuevas canciones
- `newSong`: Etiqueta para el tipo de sugerencia (en el badge)
- `noNewSuggestions`: Mensaje cuando no hay sugerencias pendientes

**Idiomas actualizados**:
- `apps/web/src/i18n/locales/en/editor.json` (Inglés)
- `apps/web/src/i18n/locales/es/editor.json` (Español)
- `apps/web/src/i18n/locales/ko/editor.json` (Coreano)
- `apps/web/src/i18n/locales/tr/editor.json` (Turco)

---

## How It Works

### User Flow

1. **Usuario propone una nueva canción**:
   - Crea un draft personal
   - Envía para revisión con tipo "addition" y `song_id = null`
   - La sugerencia se almacena en `song_suggestions`

2. **Editor ve las sugerencias pendientes**:
   - Navega a `/portal/editor` sin seleccionar una canción específica
   - Ve la sección "Pending New Songs"
   - Puede ver el metadata y contenido ChordPro propuesto

3. **Editor aprueba o rechaza**:
   - **Aprobar**: 
     - La RPC `review_song_suggestion` crea una nueva canción en `songs`
     - Asigna el slug automáticamente usando `gc_next_song_slug`
     - Actualiza la sugerencia a estado "approved"
     - Retorna el ID de la nueva canción creada
   - **Rechazar**: 
     - Actualiza la sugerencia a "rejected"
     - Guarda la razón del rechazo
     - El draft del usuario vuelve a "draft"
   - **Touch Up**: 
     - Carga la sugerencia en el editor para ajustes
     - El editor puede modificar y guardar

### Database Flow

```
song_suggestions (tipo='addition', song_id=NULL, status='pending')
    ↓ [Editor aprueba]
songs (nueva canción creada automáticamente)
song_suggestions (estado actualizado a 'approved')
personal_songs (si existe, actualizado a 'published')
```

---

## Verification

✅ **Compilación exitosa**: El build de la web app pasó sin errores
✅ **Funcionalidad**: La RPC `review_song_suggestion` ya manejaba correctamente el caso de "addition"
✅ **Seguridad**: Solo editores+ pueden ver y revisar estas sugerencias (control de acceso a nivel de rol)
✅ **UX**: Las nuevas canciones se muestran en una sección dedicada cuando no hay una canción en edición

---

## Edge Cases Handled

1. ✅ Cuando no hay sugerencias pendientes → Muestra mensaje "No new songs pending approval"
2. ✅ Cuando está cargando → Muestra "Loading suggestions…"
3. ✅ Cuando hay error de red → Muestra el mensaje de error
4. ✅ Validación de rol → Solo muestra el panel a editores+
5. ✅ Rechazo con razón → Registra el motivo del rechazo para retroalimentación del usuario

---

## Testing Recommendations

1. **Happy path**: Proponer una nueva canción → Verla en pendientes → Aprobarla
2. **Reject path**: Proponer una canción → Rechazarla con razón → Verificar que aparezca en auditoría
3. **Touch-up path**: Proponer una canción → Click "Touch Up" → Editar y guardar → Actualizar lista
4. **Permissions**: Intentar acceder como usuario no-editor → No debe ver el panel
5. **Edge cases**: Sin sugerencias pendientes → Debe mostrar mensaje apropiado

---

## Notes

- La función RPC `review_song_suggestion` ya estaba implementada correctamente para manejar el caso de "addition"
- No se modificó el flujo de aprobación existente, solo se agregó la UI para mostrar estas sugerencias
- El componente mantiene consistencia visual con `SuggestionReviewPanel`
- Las traducciones cubren todos los idiomas soportados del repositorio
