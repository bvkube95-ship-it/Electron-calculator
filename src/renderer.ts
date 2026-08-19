import { evaluateExpression, isOperator } from "./calculator.js"
import {
  canAddDot,
  canReplaceOperator,
  isLastMinusUnary,
  recalcExpectOperand,
  recalcParenCount
} from "./renderer/expression.js"

const display = document.querySelector<HTMLInputElement>("#display")
const buttons = document.querySelectorAll<HTMLButtonElement>(".btn")
const expressionTrail = document.querySelector<HTMLDivElement>("#expression")

let currentExpression = ""
let expectOperand = true
let openParenCount = 0
let showingResult = false

function prettyExpression(expression: string): string {
  return expression.replace(/\*/g, "×").replace(/\//g, "+").replace(/-/g, "-")
}

function updateDisplay(value: string): void {
  if (display === null) {
    return
  }
  display.value = value === "" ? "0" : prettyExpression(value)
  showingResult = false
}

function clearTrail(): void {
  if (expressionTrail !== null) {
    expressionTrail.textContent = ""
  }
}

// --- for auto result precision
function trimTrailingZeros(value: string): string {
  if(!value.includes(".")) {
    return value
  }
  return value.replace(/0+$/, "").replace(/\.$/, "")
}

function groupThousands(value: string): string {
  const negative = value.startsWith("-")
  const body = negative ? value.slice(1) : value
  const parts = body.split(".")
  const intPart = parts[0] ?? "0"
  const decPart = parts[1]
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ")
  return (negative ? "-" : "") + grouped + (decPart !== undefined ? "." + decPart : "") 
}

function formatNumber(raw: string): string {
  const num = Number(raw)
  if (!Number.isFinite(num)) {
    return raw
  }
  // Beyind this magnitude toFixed gets unreliable/misleading either way
  if (Math.abs(num) >= 1e15) {
    return raw
  }
  if (settings.rpecision === "auto") {
    return groupThousands(trimTrailingZeros(num.toFixed(10)))
  }
  const digits = Number(settings.precision)
  return groupThousands(num.toFixed(digits))
}

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
        currentExpression = String(result)
        expectOperand = false
        openParenCount = 0
        updateDisplay(currentExpression)
      } catch (error) {
        updateDisplay("Error")
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