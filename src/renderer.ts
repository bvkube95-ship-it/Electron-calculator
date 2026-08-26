import { evaluateExpression, isOperator } from "./calculator.js"
import {
  canAddDot,
  canReplaceOperator,
  isLastMinusUnary,
  recalcExpectOperand,
  recalcParenCount,
} from "./renderer/expression.js"
import { formatNumber, prettyExpression } from "./renderer/formatting.js"
import {
  buildCustomPaletteForRenderer,
  loadSettings,
  MAX_SAVED_ACCENTS,
  saveSettings,
  type Precision,
  type Settings,
  type Theme,
} from "./renderer/settings.js"
import { loadHistory, saveHistory, type HistoryEntry } from "./renderer/history.js"

const display = document.querySelector<HTMLInputElement>("#display")
const buttons = document.querySelectorAll<HTMLButtonElement>(".btn")
const expressionTrail = document.querySelector<HTMLDivElement>("#expression")

let currentExpression = ""
let expectOperand = true
let openParenCount = 0
let showingResult = false

const DISPLAY_MIN_FONT_SIZE = 18
// Small buffer so the skewed text never grazes the display's edge.
const DISPLAY_WIDTH_SAFETY_MARGIN = 6

// Reused off-screen canvas for measuring text width. Far more reliable than
// input.scrollWidth, which browsers do not consistently update to reflect
// overflow for <input> elements the way they do for plain block elements.
const measureCanvas = document.createElement("canvas")
const measureCtx = measureCanvas.getContext("2d")

// Sizes the result display's font to whatever fits on one line: shrinks
// long numbers/expressions down, and — just as importantly — grows back up
// to the normal size as soon as the value is short enough again (e.g. after
// pressing Clear).
function fitDisplayFont(): void {
  if (display === null || measureCtx === null) {
    return
  }

  // Always start from the CSS-defined baseline size (the responsive
  // clamp), so previous shrinking never lingers once it's no longer needed.
  display.style.removeProperty("font-size")
  const computed = getComputedStyle(display)
  const baseFontSize = parseFloat(computed.fontSize)
  const availableWidth = display.clientWidth - DISPLAY_WIDTH_SAFETY_MARGIN

  if (!Number.isFinite(baseFontSize) || availableWidth <= 0) {
    return
  }

  measureCtx.font = `${computed.fontWeight} ${baseFontSize}px ${computed.fontFamily}`
  const textWidth = measureCtx.measureText(display.value).width

  if (textWidth <= availableWidth) {
    // Fits at the normal size already — leave the CSS size in place.
    return
  }

  const scale = availableWidth / textWidth
  const fittedFontSize = Math.max(DISPLAY_MIN_FONT_SIZE, Math.floor(baseFontSize * scale))
  display.style.fontSize = `${fittedFontSize}px`
}

function updateDisplay(value: string): void {
  if (display === null) {
    return
  }
  display.value = value === "" ? "0" : prettyExpression(value)
  showingResult = false
  fitDisplayFont()
}

function clearTrail(): void {
  if (expressionTrail !== null) {
    expressionTrail.textContent = ""
  }
}

// Settings (persisted to localStorage)
function applySettings(): void {
  const app = document.querySelector<HTMLElement>(".app")
  app?.setAttribute("data-theme", settings.theme)

  if (settings.theme === "custom") {
    const palette = buildCustomPaletteForRenderer(settings.customColor)
    app?.style.setProperty("--accent-700", palette.accent700)
    app?.style.setProperty("--accent-500", palette.accent500)
    app?.style.setProperty("--accent-300", palette.accent300)
  } else {
    // Back on a hand-tuned preset — let its CSS rule take over again.
    app?.style.removeProperty("--accent-700")
    app?.style.removeProperty("--accent-500")
    app?.style.removeProperty("--accent-300")
  }

  document
    .querySelectorAll<HTMLButtonElement>('.settings__options[data-setting="theme"] button.chip')
    .forEach((chip) => {
      chip.classList.toggle("is-active", chip.dataset["value"] === settings.theme)
    })

  const customLabel = document.querySelector<HTMLElement>("#customColorLabel")
  customLabel?.classList.toggle("is-active", settings.theme === "custom")
  customLabel?.style.setProperty("background", settings.theme === "custom" ? settings.customColor : "")

  const customColorInput = document.querySelector<HTMLInputElement>("#customColorInput")
  if (customColorInput !== null) {
    customColorInput.value = settings.customColor
  }

  const precisionSelect = document.querySelector<HTMLSelectElement>("#precisionSelect")
  if (precisionSelect !== null) {
    precisionSelect.value = settings.precision
  }
}

function applyCustomColor(hex: string): void {
  settings = { ...settings, theme: "custom", customColor: hex }
  saveSettings(settings)
  applySettings()
  renderSavedAccents()
}

function renderSavedAccents(): void {
  const list = document.querySelector<HTMLDivElement>("#savedAccentsList")
  if (list === null) {
    return
  }
  list.innerHTML = ""

  if (settings.savedAccents.length === 0) {
    const empty = document.createElement("p")
    empty.className = "saved-accents__empty"
    empty.textContent = "No saved colors yet — pick one above, then tap +"
    list.appendChild(empty)
    return
  }

  for (const hex of settings.savedAccents) {
    const wrap = document.createElement("div")
    wrap.className = "saved-accent"

    const swatch = document.createElement("button")
    swatch.type = "button"
    swatch.className = "saved-accent__swatch"
    swatch.style.background = hex
    swatch.setAttribute("aria-label", `Use ${hex}`)
    swatch.classList.toggle("is-active", settings.theme === "custom" && settings.customColor === hex)
    swatch.addEventListener("click", () => applyCustomColor(hex))

    const remove = document.createElement("button")
    remove.type = "button"
    remove.className = "saved-accent__remove"
    remove.setAttribute("aria-label", `Remove ${hex}`)
    remove.textContent = "×"
    remove.addEventListener("click", (event) => {
      event.stopPropagation()
      settings = { ...settings, savedAccents: settings.savedAccents.filter((c) => c !== hex) }
      saveSettings(settings)
      renderSavedAccents()
    })

    wrap.appendChild(swatch)
    wrap.appendChild(remove)
    list.appendChild(wrap)
  }
}

let settings = loadSettings()

let history = loadHistory()

function renderHistory(): void {
  const list = document.querySelector<HTMLUListElement>("#historyList")
  if (list === null) {
    return
  }
  list.innerHTML = ""

  if (history.length === 0) {
    const empty = document.createElement("li")
    empty.className = "history__empty"
    empty.textContent = "No calculations yet"
    list.appendChild(empty)
    return
  }

  for (const entry of history) {
    const item = document.createElement("li")
    item.className = "history__item"
    item.tabIndex = 0

    const expr = document.createElement("span")
    expr.className = "history__expr"
    expr.textContent = prettyExpression(entry.expression)

    const res = document.createElement("span")
    res.className = "history__res"
    res.textContent = "= " + formatNumber(entry.result, settings.precision)

    item.appendChild(expr)
    item.appendChild(res)

    item.addEventListener("click", () => loadFromHistory(entry))
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault()
        loadFromHistory(entry)
      }
    })

    list.appendChild(item)
  }
}

function loadFromHistory(entry: HistoryEntry): void {
  currentExpression = entry.result
  openParenCount = recalcParenCount(currentExpression)
  expectOperand = recalcExpectOperand(currentExpression)
  updateDisplay(currentExpression)
  switchView("calculate")
}

function pushHistory(expression: string, result: string): void {
  history = [{ expression, result }, ...history].slice(0, 50)
  saveHistory(history)
  renderHistory()
}

// View switching (Calculate / History / Settings)
type ViewName = "calculate" | "history" | "settings"

function switchView(view: ViewName): void {
  document.querySelectorAll<HTMLElement>(".view").forEach((section) => {
    section.hidden = section.dataset["view"] !== view
  })
  document.querySelectorAll<HTMLButtonElement>(".rail__item").forEach((item) => {
    item.classList.toggle("is-active", item.dataset["view"] === view)
  })
  if (view === "history") {
    renderHistory()
  }
}

document.querySelectorAll<HTMLButtonElement>(".rail__item").forEach((item) => {
  item.addEventListener("click", () => {
    const view = item.dataset["view"]
    if (view === "calculate" || view === "history" || view === "settings") {
      switchView(view)
    }
  })
})

document.querySelector<HTMLButtonElement>("#historyClear")?.addEventListener("click", () => {
  history = []
  saveHistory(history)
  renderHistory()
})

document.querySelectorAll<HTMLButtonElement>(".settings__options button.chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    const value = chip.dataset["value"]
    if (value === undefined) {
      return
    }
    settings = { ...settings, theme: value as Theme }
    saveSettings(settings)
    applySettings()
  })
})

document.querySelector<HTMLInputElement>("#customColorInput")?.addEventListener("input", (event) => {
  const input = event.currentTarget as HTMLInputElement
  applyCustomColor(input.value)
})

document.querySelector<HTMLButtonElement>("#saveAccentBtn")?.addEventListener("click", () => {
  const hex = settings.customColor
  if (settings.savedAccents.includes(hex)) {
    return
  }
  const next = [hex, ...settings.savedAccents].slice(0, MAX_SAVED_ACCENTS)
  settings = { ...settings, savedAccents: next }
  saveSettings(settings)
  renderSavedAccents()
})

document.querySelector<HTMLSelectElement>("#precisionSelect")?.addEventListener("change", (event) => {
  const select = event.currentTarget as HTMLSelectElement
  settings = { ...settings, precision: select.value as Precision }
  saveSettings(settings)
  if (showingResult && display !== null) {
    display.value = formatNumber(currentExpression, settings.precision)
    fitDisplayFont()
  }
})

window.addEventListener("resize", fitDisplayFont)

applySettings()
renderHistory()
renderSavedAccents()

buttons.forEach((btn) => {
  const value = btn.dataset["value"]
  const action = btn.dataset["action"]

  if (value !== undefined && !btn.classList.contains("operator") && !btn.classList.contains("paren")) {
    // numbers and dots
    btn.addEventListener("click", () => {
      const lastChar = currentExpression[currentExpression.length - 1]
      // for dots
      if (value === ".") {
        // after operator or after "(", put 0 with dot
        if (expectOperand) {
          if (lastChar === "(" || currentExpression === "") {
            currentExpression += "0."
            expectOperand = false
            updateDisplay(currentExpression)
            return
          }

          if (lastChar !== undefined && isOperator(lastChar)) {
            currentExpression += "0."
            expectOperand = false
            updateDisplay(currentExpression)
            return
          }

          return
        }

        if (lastChar === ")") {
          currentExpression += "*0."
          updateDisplay(currentExpression)
          return
        }

        if (!canAddDot(currentExpression)) {
          return
        }

        currentExpression += "."
        updateDisplay(currentExpression)
        return
      }
      // for numbers
      if (expectOperand) {
        currentExpression += value
      } else if (lastChar === ")") { 
        currentExpression += "*" + value
      } else {
        let i = currentExpression.length - 1
        while (
          i >= 0 &&
          !isOperator(currentExpression[i]!) &&
          currentExpression[i] !== "(" &&
          currentExpression[i] !== ")"
        ) {
          i--
        }

        const currentNumber = currentExpression.slice(i + 1)

        // if current number is 0, replace it
        if (currentNumber === "0") {
          currentExpression =
            currentExpression.slice(0, i + 1) + value
        } else {
          currentExpression += value
        }
      }
      expectOperand = false
      updateDisplay(currentExpression)
    }
  )
  } else if (value !== undefined && btn.classList.contains("operator") && isOperator(value)) {
    // operators
    btn.addEventListener("click", () => {
    const lastChar = currentExpression[currentExpression.length - 1];

    if (lastChar === ".") {
      return;
    }

    if (expectOperand) {

      if (isLastMinusUnary(currentExpression)) {
        return
      }

      if (canReplaceOperator(currentExpression)) {
        currentExpression =
          currentExpression.slice(0, -1) + value

        updateDisplay(currentExpression)
        return
      }

      if (value === "-") {
        currentExpression += "-"
      }

    } else {
      currentExpression += value;
      expectOperand = true;
    }

    updateDisplay(currentExpression);
  });
  } else if (value === "(" && btn.classList.contains("paren")) {
    // open paren
    btn.addEventListener("click", () => {
      const lastChar = currentExpression[currentExpression.length - 1]
      if (lastChar === ".") return

      if (!expectOperand) {
        currentExpression += "*"
      }
      currentExpression += value
      openParenCount += 1
      expectOperand = true
      updateDisplay(currentExpression)
    })
  } else if (value === ")" && btn.classList.contains("paren")) {
    // close open
    btn.addEventListener("click", () => {
      const lastChar = currentExpression[currentExpression.length - 1]
      if (lastChar === ".") return

      if (expectOperand || openParenCount === 0) {
        return
      }
      currentExpression += value
      openParenCount -= 1
      updateDisplay(currentExpression)
    })
  } else if (action === "clear") {
    // C button
    btn.addEventListener("click", () => {
      currentExpression = ""
      expectOperand = true
      openParenCount = 0
      updateDisplay(currentExpression)
      clearTrail()
    })
  } else if (action === "delete") {
    // Delete button
    btn.addEventListener("click", () => {
      currentExpression = currentExpression.slice(0, -1)
      openParenCount = recalcParenCount(currentExpression)
      expectOperand = recalcExpectOperand(currentExpression)
      updateDisplay(currentExpression)
    })
  } else if (action === "equals") {
    // Equals
    btn.addEventListener("click", () => {
      if (expectOperand || currentExpression === "") {
        return
      }

      try {
        const result = evaluateExpression(currentExpression)
        const solvedExpression = currentExpression
        currentExpression = String(result)
        expectOperand = false
        openParenCount = 0
        updateDisplay(currentExpression)

        // Promote the just-solved expression to the small trail above
        if (expressionTrail !== null) {
          expressionTrail.textContent = prettyExpression(solvedExpression)
        }
        if (display !== null) {
          display.value = formatNumber(currentExpression, settings.precision)
          fitDisplayFont()
        }
        showingResult = true
        pushHistory(solvedExpression, currentExpression)
      } catch (error) {
        updateDisplay("Error")
        clearTrail()
        currentExpression = ""
        expectOperand = true
        openParenCount = 0
      }
    })
  }
})

function clickButtonByValue(value: string): void {
  const button = document.querySelector<HTMLButtonElement>(`.btn[data-value="${value}"]`)
  if (button !== null) {
    button.click()
  }
}

function clickButtonByAction(action: string): void {
  const button = document.querySelector<HTMLButtonElement>(`.btn[data-action="${action}"]`)
  if (button !== null) {
    button.click()
  }
}

document.addEventListener("keydown", (event) => {
  const active = document.activeElement
  const isFormField =
    active !== null &&
    (active.tagName === "INPUT" || active.tagName === "SELECT" || active.tagName === "TEXTAREA")
  if (isFormField) {
    return
  }

  const key = event.key

  if (/^[0-9]$/.test(key)) {
    event.preventDefault()
    clickButtonByValue(key)
    return
  }

  if (key === "." || key === ",") {
    event.preventDefault()
    clickButtonByValue(".")
    return
  }

  if (key === "+" || key === "-" || key === "*" || key === "/") {
    event.preventDefault()
    clickButtonByValue(key)
    return
  }

  if (key === "(" || key === ")") {
    event.preventDefault()
    clickButtonByValue(key)
    return
  }

  if (key === "Enter" || key === "=") {
    event.preventDefault()
    clickButtonByAction("equals")
    return
  }

  if (key === "Backspace") {
    event.preventDefault()
    clickButtonByAction("delete")
    return
  }

  if (key === "Delete" || key === "Escape" || key === "c" || key === "C") {
    event.preventDefault()
    clickButtonByAction("clear")
    return
  }
})