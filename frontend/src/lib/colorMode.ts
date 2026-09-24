export type ColorMode = 'wine' | 'light'

const COLOR_MODE_STORAGE_KEY = 'site-color-mode'
export const COLOR_MODE_CHANGE_EVENT = 'site-color-mode-change'

export function getColorMode(): ColorMode {
  if (typeof window === 'undefined') return 'wine'
  return window.localStorage.getItem(COLOR_MODE_STORAGE_KEY) === 'light' ? 'light' : 'wine'
}

export function applyColorMode(mode: ColorMode) {
  if (typeof document === 'undefined') return

  document.documentElement.dataset.theme = mode
  window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode)
  window.dispatchEvent(new CustomEvent<ColorMode>(COLOR_MODE_CHANGE_EVENT, { detail: mode }))
}

export function initializeColorMode() {
  applyColorMode(getColorMode())
}
