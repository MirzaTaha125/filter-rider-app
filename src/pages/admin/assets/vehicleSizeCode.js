export const MAX_CODE_LENGTH = 50
export const CODE_PATTERN = /^[a-z0-9_]+$/

/** "Extra Large (XL)" -> "extra_large_xl" */
export function suggestCode(name) {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, MAX_CODE_LENGTH)
}
