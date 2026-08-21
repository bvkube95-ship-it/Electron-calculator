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