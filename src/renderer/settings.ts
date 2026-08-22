export type Precision = "auto" | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"

function hexToHsl(hex: string): { h: number, s: number, l: number } {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const l = (max + min) / 2
    let h = 0
    let s = 0
    if (max !== min) {
        const d = max - min
        s = l > 0.5 
            ? d / (2 - max - min) 
            : d / (max + min)
        if (max === r) {
            h = (g - b) / d + (g < b ? 6 : 0)
        } else if (max === g) {
            h = (b - r) / d + 2
        } else {
            h = (r - g) / d + 4
        }
        h *= 60
    }
    return { 
        h, 
        s: s * 100, 
        l: l * 100 
    }
}

function hslToHex(h: number, s: number, l: number): string {
  const sN = s / 100
  const lN = l / 100
  const c = (1 - Math.abs(2 * lN - 1)) * sN
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = lN - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) {
    r = c
    g = x
  } else if (h < 120) {
    r = x
    g = c
  } else if (h < 180) {
    g = c
    b = x
  } else if (h < 240) {
    g = x
    b = c
  } else if (h < 300) {
    r = x
    b = c
  } else {
    r = c
    b = x
  }
  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0")
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

interface AccentPalette {
  accent700: string
  accent500: string
  accent400: string
  accent300: string
}

function buildCustomPalette(hex: string): AccentPalette {
    const { h, s } = hexToHsl(hex)
    return {
        accent700: hslToHex(h, s, 22),
        accent500: hslToHex(h, s, 50),
        accent400: hslToHex(h, s, 62),
        accent300: hslToHex(h, s, 80),
    }
}

export type Theme = "blue" | "red" | "violet" | "teal" | "custom"
export interface Settings {
    precision: Precision
    theme: Theme
    customColor: string
    savedAccents: string[]
}

export const SETTINGS_KEY = "nyx-calc-settings"
export const MAX_SAVED_ACCENTS = 12

function isValidPrecision(value: unknown): value is Precision {
    return value === "auto" || (typeof value === "string" && /^[0-9]$/.test(value))
}

function isValidTheme(value: unknown): value is Theme {
    return value === "blue" ||
           value === "red" ||
           value === "violet" ||
           value === "teal" ||
           value === "custom"
}

export function isValidHexColor(value: unknown): value is string {
    return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)
}

export function buildCustomPaletteForRenderer(hex: string): AccentPalette {
    return buildCustomPalette(hex)
}

export function loadSettings(): Settings {
    const defaults: Settings = { precision: "auto", theme: "blue", customColor: "#0057f7", savedAccents: [] }
    try {
        const raw = localStorage.getItem(SETTINGS_KEY)
        if (raw === null) {
            return defaults
        }
        const parsed = JSON.parse(raw) as Partial<Settings>
        const savedAccents = Array.isArray(parsed.savedAccents)
            ? parsed.savedAccents.filter(isValidHexColor).slice(0, MAX_SAVED_ACCENTS)
            : defaults.savedAccents
        return {
            precision: isValidPrecision(parsed.precision) ? parsed.precision : defaults.precision,
            theme: isValidTheme(parsed.theme) ? parsed.theme : defaults.theme,
            customColor: isValidHexColor(parsed.customColor) ? parsed.customColor : defaults.customColor,
            savedAccents
        }
    } catch {
        return defaults
    }
}

export function saveSettings(settings: Settings): void {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {
        // Storage unavailable (e.g. restricted profile) — settings just won't persist.
    }
}