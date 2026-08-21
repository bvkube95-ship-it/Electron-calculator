export type Precision = "auto" | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"

function hexToHsl(hex: string): { h: number, s: number, l: number } {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    const max = Math.max(r, g, b)
    const min = Math.max(r, g, b)
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
            h = (b - r) / d + (g < b ? 6 : 0)
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