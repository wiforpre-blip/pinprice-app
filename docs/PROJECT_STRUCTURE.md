# PinPrice — Project Structure

เอกสารนี้สรุปโครงสร้างไฟล์หลักของ PinPrice เพื่อให้สั่งงานได้ตรงจุดว่าต้องแก้ไฟล์ไหน / ทำงานกับชั้นไหน

**กฎสั้นๆ:**
- `app/` = หน้าจอ + routing เท่านั้น (orchestration)
- `components/` = UI
- `hooks/` = state / behavior
- `utils/` = pure helpers (ไม่มี side effect)
- `services/` = native / storage / permission side effects
- `types/` + `constants/` = shared shapes และค่าคงที่

---

## App Flow

```
Home (app/index.tsx)
  → เลือก/ถ่ายรูป
  → ส่ง imageUri ไป Editor

Editor (app/editor.tsx)
  → แท็ก / price list / ลาก / undo
  → กด Preview

Preview / Export (useEditorExport + EditorPreviewScreen)
  → Save to gallery / Share
```

| Step | Screen / Entry | หน้าที่ |
|------|----------------|---------|
| 1. Home | `app/index.tsx` | เลือกภาพ / ถ่ายภาพ / เปิด settings → navigate ไป `/editor` |
| 2. Editor | `app/editor.tsx` | รวม hooks + UI ของโหมดแท็ก / price list |
| 3. Preview/Export | `hooks/useEditorExport.ts` + `components/editor/EditorPreviewScreen.tsx` | ดูผลก่อน export → save / share |

Root routing อยู่ที่ `app/_layout.tsx` (Stack: `index`, `editor` + Language/Currency providers)

---

## Folders

### `app/` — screens และ routing

| File | Role |
|------|------|
| `_layout.tsx` | Root layout, Expo Router Stack, wrap contexts |
| `index.tsx` | Home: pick/take photo → ไป editor |
| `editor.tsx` | Editor screen orchestration (ต่อ hooks กับ UI) |
| `editor.styles.ts` | styles ของ editor screen (ถ้ามี/ค้างจาก refactor) |

### `components/` — UI components

แยกตามโดเมน:

| Subfolder | Role |
|-----------|------|
| `components/editor/` | UI ของ editor: canvas, tags, toolbar, preview, price list |
| `components/settings/` | Settings / currency / feedback sheets |
| `components/ui/` | UI ใช้ซ้ำทั่วไป (bottom sheet, confirm) |

### `hooks/` — state/behavior ของ editor

| File | Role |
|------|------|
| `useTagEditorState.ts` | state/behavior โหมดแท็ก (add/edit/drag/delete/sold) |
| `usePriceListEditorState.ts` | state/behavior โหมด price list (markers) |
| `useEditorChrome.ts` | ปุ่ม/เมนู/mode switching + undo/redo wiring |
| `useEditorExport.ts` | preview / save / share |
| `useEditorLayout.ts` | วัดขนาด canvas/header/image rect |
| `useEditorSession.ts` | session เริ่มต้น editor + parse `imageUri` |
| `useEditorHistory.ts` | undo/redo stack (ถูกใช้โดย chrome) |

### `utils/` — pure helper functions

| File | Role |
|------|------|
| `editorGeometry.ts` | normalize position, clamp, image rect, drag math |
| `editorHistory.ts` | สร้าง history snapshot |
| `priceText.ts` | format ราคาตาม currency/language |
| `pricePanelLayout.ts` | layout ของ price list composition |

### `services/` — native side effects

| File | Role |
|------|------|
| `settings.service.ts` | AsyncStorage: language / currency |
| `feedback.service.ts` | ส่ง feedback (email flow) |

> Save/share ภาพอยู่ใน `hooks/useEditorExport.ts` (เรียก MediaLibrary / Sharing / view-shot โดยตรง) — ยังไม่ได้แยกเป็น service แยกไฟล์

### `types/` — shared TypeScript types

| File | Role |
|------|------|
| `tag.ts` | `PriceTag`, `TagType`, style/size/format types |
| `editor.ts` | layout sizes, export action, pricing mode, undo snapshot |
| `pricePanel.ts` | `PanelMarker` สำหรับ price list |
| `settings.ts` | language, currency, feedback types |

### `constants/` — presets / theme / defaults

| File | Role |
|------|------|
| `tagPresets.ts` | style presets ตามประเภทแท็ก |
| `tagDefaults.ts` | default text / type lists / size cycle |
| `theme.ts` | สี / typography ของแอป |
| `currencies.ts` | รายการ currency + default |
| `editorHistory.ts` | history limit |
| `app.ts` | app version |

### Folders อื่นที่เกี่ยวข้อง

| Folder | Role |
|--------|------|
| `contexts/` | `LanguageContext`, `CurrencyContext` — global preferences |
| `locales/` | `th.json`, `en.json` — ข้อความ UI |
| `assets/` | รูป/ไอคอน |
| `scripts/` | script ช่วยพัฒนา (ไม่ใช่ runtime app) |

---

## Key Files

ไฟล์ที่สั่งงานบ่อยที่สุด:

| File | หน้าที่ | สั่งงานเมื่อ… |
|------|---------|----------------|
| `app/editor.tsx` | รวม editor screen, ต่อ hooks กับ UI | เปลี่ยน wiring ระหว่างโหมด/ปุ่ม/overlay, เพิ่ม prop ระหว่าง hook ↔ component |
| `app/index.tsx` | Home entry | เปลี่ยน flow เลือก/ถ่ายรูป, ปุ่มเข้า editor |
| `hooks/useTagEditorState.ts` | state/behavior ของ tag mode | เพิ่ม/ลาก/แก้/ลบแท็ก, long-press Sold, zoom-to-place ที่เกี่ยวกับแท็ก |
| `hooks/usePriceListEditorState.ts` | state/behavior ของ price list mode | marker add/select/edit/delete |
| `hooks/useEditorChrome.ts` | ปุ่ม/เมนู/mode switching | สลับ tag ↔ price list, more menu, settings open, undo/redo entry |
| `hooks/useEditorExport.ts` | preview/save/share | preview timing, gallery permission, share sheet, export capture |
| `hooks/useEditorLayout.ts` | geometry ของ canvas | ตำแหน่งแท็กผิดเพราะ image rect / header overlap |
| `hooks/useEditorHistory.ts` | undo/redo stack | จำนวน step, restore snapshot |
| `components/editor/EditorCanvas.tsx` | canvas รูปและ overlay | tap บนรูป, render tags/markers บนภาพ |
| `components/editor/EditorFloatingControls.tsx` | toolbar ลอย | ปุ่ม undo/redo/preview/mode/actions |
| `components/editor/EditorPreviewScreen.tsx` | หน้า preview ก่อน export | UI preview + ปุ่ม save/share |
| `components/editor/TagOverlay.tsx` / `TagEditor.tsx` | แสดง/แก้แท็ก | รูปลักษณ์แท็ก, popup แก้ข้อความ/สไตล์ |
| `components/editor/PriceListComposition.tsx` / `PricePanel.tsx` | UI price list | แผงราคา + composition ตอน preview/export |
| `utils/editorGeometry.ts` | คำนวณตำแหน่ง | แท็กลากหลุดขอบ, normalize 0–1 ผิด |
| `constants/tagPresets.ts` | สไตล์แท็ก | สี/ฟอนต์/preset ใหม่ |
| `types/tag.ts` | โครงข้อมูลแท็ก | เพิ่ม field/type ของแท็ก |

---

## Dependency Map

### Editor screen (หลัก)

```
app/editor.tsx
├── hooks/
│   ├── useEditorSession      → parse imageUri / session
│   ├── useEditorLayout       → canvasSize, imageRect
│   ├── useEditorExport       → preview / save / share
│   ├── useEditorChrome       → mode, menus, undo/redo
│   │     └── useEditorHistory
│   ├── useTagEditorState     → tags state + gestures handlers
│   └── usePriceListEditorState → panel markers state
│
├── components/editor/
│   ├── EditorHeader
│   ├── EditorCanvas
│   │     ├── TagOverlay / StaticTag / PanelMarker …
│   │     └── PriceListComposition (เมื่อโหมด price list)
│   ├── EditorFloatingControls
│   ├── EditorPreviewScreen
│   │     └── ExportPreview (+ watermark path ถ้ามี)
│   ├── TagEditor / StylePickerPanel / PriceRowEditor / PricePanel
│   └── …
│
├── components/settings/SettingsSheet
└── components/ui/ (BottomSheetOverlay, ConfirmOverlay)
```

### Home screen

```
app/index.tsx
├── expo-image-picker / expo-camera (เลือก/ถ่ายรูป)
├── expo-router → push /editor?imageUri=…
└── components/settings/SettingsSheet
```

### Shared cross-cutting

```
contexts/LanguageContext  ← locales/*.json + settings.service
contexts/CurrencyContext  ← currencies + settings.service

constants/tagPresets + tagDefaults
  ↑ ใช้โดย useTagEditorState / TagOverlay / TagEditor

utils/editorGeometry
  ↑ ใช้โดย useTagEditorState / usePriceListEditorState / EditorCanvas path

types/tag + types/editor + types/pricePanel
  ↑ ใช้ทั่ว editor stack
```

### Data / responsibility direction (อย่าสลับทิศ)

```
Screen (app/)
  → calls Hooks
    → may call Services / Utils
  → renders Components
    → may call Utils for display math
    → should NOT own export/permission logic

Utils = pure
Services = side effects only
```

---

## How to order work (quick guide)

| อยากแก้อะไร | เริ่มที่ไฟล์ |
|-------------|--------------|
| Flow เลือกภาพ / เข้า editor | `app/index.tsx` |
| ปุ่มบน editor / สลับโหมด | `useEditorChrome.ts` + `EditorFloatingControls.tsx` |
| พฤติกรรมแท็ก | `useTagEditorState.ts` |
| พฤติกรรม price list | `usePriceListEditorState.ts` |
| ตำแหน่ง/ลาก/ขอบภาพ | `editorGeometry.ts` + `useEditorLayout.ts` |
| หน้าตาแท็ก / preset | `TagOverlay.tsx` / `StaticTag.tsx` + `tagPresets.ts` |
| Preview / Save / Share | `useEditorExport.ts` + `EditorPreviewScreen.tsx` |
| Undo/Redo | `useEditorHistory.ts` (+ chrome) |
| Settings / ภาษา / สกุลเงิน | `SettingsSheet` + `contexts/*` + `settings.service.ts` |
| ต่อ hook เข้า UI ทั้งหน้า | `app/editor.tsx` |

---

## Notes

- ตำแหน่งแท็กเก็บแบบ **normalized (0.0–1.0)** ใน state — แปลงเป็น pixel ตอน render/export เท่านั้น (`editorGeometry.ts`)
- `app/editor.tsx` ไม่ควรมี logic หนัก; ถ้า logic โต ให้ใส่ hook/utils ตามชั้นด้านบน
- อย่าเพิ่ม library / top-level folder ใหม่โดยไม่ขออนุมัติ (ยกเว้นที่ระบุใน task เช่น `docs/` นี้)
)
