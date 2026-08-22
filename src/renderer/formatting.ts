import type { Precision } from "./settings.js"

export function prettyExpression(expr: string): string {
  return expr.replace(/\*/g, "×").replace(/\//g, "÷").replace(/-/g, "−")
}

export function trimTrailingZeros(value: string): string {
  if (!value.includes(".")) {
    return value
  }
  return value.replace(/0+$/, "").replace(/\.$/, "")
}

export function groupThousands(value: string): string {
  const negative = value.startsWith("-")
  const body = negative ? value.slice(1) : value
  const parts = body.split(".")
  const intPart = parts[0] ?? "0"
  const decPart = parts[1]
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ")
  return (negative ? "-" : "") + grouped + (decPart !== undefined ? "." + decPart : "")
}

export function formatNumber(raw: string, precision: Precision): string {
  const num = Number(raw)
  if (!Number.isFinite(num)) {
    return raw
  }
  // Beyond this magnitude toFixed gets unreliable/misleading either way.
  if (Math.abs(num) >= 1e15) {
    return raw
  }
  if (precision === "auto") {
    return groupThousands(trimTrailingZeros(num.toFixed(10)))
  }
  const digits = Number(precision)
  return groupThousands(num.toFixed(digits))
}
