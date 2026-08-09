type Operator = "+" | "-" | "*" | "/"
type StackOp = Operator | "(" | "u-"

function isOperator(value: string): value is Operator {
  return value === "+" || value === "-" || value === "*" || value === "/"
}

class Calculator {
  add(a: number, b: number): number {
    return a + b
  }

  substract(a: number, b: number): number {
    return a - b
  }

  multiply(a: number, b: number): number {
    return a * b
  }

  divide(a: number, b: number): number {
    if(b === 0) {
      throw new Error("Division by zero is impossible")
    }
    return a / b
  }

  calculate(a: number, operator: Operator, b: number): number {
    switch (operator) {
      case "+":
        return this.add(a, b);
      case "-":
        return this.substract(a, b);
      case "*":
        return this.multiply(a, b);
      case "/":
        return this.divide(a, b);
      default:
        throw new Error(`Unknown operator: ${operator}`)
    }
  }
}

const calculator = new Calculator()

function priority(operator: StackOp): number {
  if (operator === "u-") return 3
  if (operator === "*" || operator === "/") return 2
  return 1
}

function evaluateExpression(expression: string): number {
  const tokens = expression.match(/\d+\.?\d*|[+\-*/()]/g)

  if (!tokens) {
    throw new Error("Invalid expression")
  }

  let expectOperand = true
  const numbersStack: number[] = []
  const operatorsStack: StackOp[] = []

  function collapseOnce() {
    const op = operatorsStack.pop()

    if (op === undefined || op === "(") {
      throw new Error("Invalid expression")
    }

    if (op === "u-") {
      const a = numbersStack.pop()
      if (a === undefined) {
        throw new Error("Invalid expression")
      }
      numbersStack.push(op === "u-" ? -a : a)
      return
    }

    const b = numbersStack.pop()
    const a = numbersStack.pop()

    if (a === undefined || b === undefined) {
      throw new Error("Invalid expression")
    }

    numbersStack.push(calculator.calculate(a, op, b))
  }

  for (const token of tokens) {
    if (!isNaN(Number(token))) {
      if (!expectOperand) {
        throw new Error("Invalid expression")
      }
      numbersStack.push(Number(token))
      expectOperand = false

    } else if (token === "(") {
      if (!expectOperand) {
        throw new Error("Invalid expression")
      }
      operatorsStack.push("(")

    } else if (token === ")") {
      if (expectOperand) {
        throw new Error("Invalid expression")
      }

      while (
        operatorsStack.length > 0 &&
        operatorsStack[operatorsStack.length - 1] !== "("
      ) {
        collapseOnce()
      }

      if (operatorsStack.length === 0) {
        throw new Error("Mismatched parentheses")
      }

      operatorsStack.pop()
      expectOperand = false
    } else if (isOperator(token)) {
      if (expectOperand) {
        if (token === "*" || token === "/") {
          throw new Error("Invalid expression")
        }

        const last = operatorsStack[operatorsStack.length - 1];

        if (token === "-" && last === "u-") {
          throw new Error("Invalid expression");
        }

        if (token === "-" && (numbersStack.length === 0 || last === "(")) {
          operatorsStack.push("u-");
          continue;
        }

        throw new Error("Invalid expression");
      }

      while (
        operatorsStack.length > 0 &&
        operatorsStack[operatorsStack.length - 1] !== "(" &&
        priority(operatorsStack[operatorsStack.length - 1]!) >= priority(token)
      ) {
        collapseOnce()
      }
      operatorsStack.push(token)
      expectOperand = true
    } else {
      throw new Error(`Unknown token: ${token}`)
    }
  }

  if (expectOperand) {
    throw new Error("Invalid expression")
  }

  while (operatorsStack.length > 0) {
    collapseOnce()
  }

  const result = numbersStack.pop()

  if (result === undefined || numbersStack.length > 0) {
    throw new Error("Invalid expression")
  }

  return result
}

const display = document.querySelector<HTMLInputElement>("#display")
const buttons = document.querySelectorAll<HTMLButtonElement>(".btn")

let currentExpression = ""
let expectOperand = true
let openParenCount = 0

function updateDisplay(value: string): void {
  if (display === null) {
    return
  }
  display.value = value === "" ? "0" : value
}

function recalcParenCount(expression: string): number {
  let count = 0
  for (const char of expression) {
    if (char === "(") {
      count += 1
    }
    if (char === ")") {
      count -= 1
    }
  }
  return count
}

function recalcExpectOperand(expression: string): boolean {
  if (expression === "") {
    return true
  }
  const lastChar = expression[expression.length - 1]
  if (lastChar === "(" || (lastChar !== undefined && isOperator(lastChar))) {
    return true
  }
  return false
}

function canAddDot(expression: string): boolean {
  let i = expression.length - 1

  while (
    i >= 0 &&
    !isOperator(expression[i]!) &&
    expression[i] !== "(" &&
    expression[i] !== ")"
  ) {
    if (expression[i] === ".") {
      return false
    }
    i--
  }
  return true
}

function canReplaceOperator(expression: string): boolean {
  const i = expression.length - 1
 
  if (i < 0) {
    return false
  }
 
  const lastChar = expression[i]!
 
  return isOperator(lastChar)
}

function isLastMinusUnary(expression: string): boolean {
  const i = expression.length - 1

  if (expression[i] !== "-") {
    return false
  }

  if (i === 0) {
    return true
  }

  const prev = expression[i - 1]!

  return isOperator(prev) || prev === "("
}

buttons.forEach((btn) => {
  const value = btn.dataset["value"]
  const action = btn.dataset["action"]

  if (value !== undefined && !btn.classList.contains("operator") && !btn.classList.contains("paren")) {
    // numbers and dots
    btn.addEventListener("click", () => {
      // for dots
      if (value === ".") {
        const lastChar = currentExpression[currentExpression.length - 1]
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
      if (!expectOperand) {
        return
      }
      currentExpression += value
      openParenCount += 1
      updateDisplay(currentExpression)
    })
  } else if (value === ")" && btn.classList.contains("paren")) {
    // close open
    btn.addEventListener("click", () => {
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

  if (key === "Delete" || key === "Escape") {
    event.preventDefault()
    clickButtonByAction("clear")
    return
  }
})