export const EDITOR_TIP_IDS = [
  'add-tag',
  'drag-tag',
  'style',
  'tag-popup',
  'select',
  'zoom',
  'export',
] as const;

export type EditorTipId = (typeof EDITOR_TIP_IDS)[number];

export const EDITOR_TIP_PRIORITY: EditorTipId[] = [
  'style',
  'add-tag',
  'drag-tag',
  'tag-popup',
  'select',
  'zoom',
  'export',
];

export function isEditorTipId(value: string): value is EditorTipId {
  return (EDITOR_TIP_IDS as readonly string[]).includes(value);
}
