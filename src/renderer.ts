type Operator = "+" | "-" | "*" | "/"
type StackOp = Operator | "(" | "u-" | "u+"

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
  if (operator === "u-" || operator === "u+") return 3
  if (operator === "*" || operator === "/") return 2
  return 1
}

function evaluateExpression(expression: string): number {
  const tokens = expression.match(/\d+\.?\d*|[+\-*/()]/g)

  if (!tokens) {
    throw new Error("Invalid expression")
  }

  const numbersStack: number[] = []
  const operatorsStack: StackOp[] = []
  let expectOperand = true

  function collapseOnce() {
    const op = operatorsStack.pop()

    if (op === undefined || op === "(") {
      throw new Error("Invalid expression")
    }

    if (op === "u-" || op === "u+") {
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

        if (numbersStack.length === 0 || last === "(") {
          operatorsStack.push(token === "-" ? "u-" : "u+");
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

const display = document.querySelector<HTMLInputElement>(".display")
const buttons = document.querySelectorAll<HTMLButtonElement>(".btn")

let currentExpression = ""

function updateDisplay(value: string): void {
  if (display === null) {
    return
  }
  display.value = value === "" ? "0" : value
}

buttons.forEach((btn) => {
  const value = btn.dataset["value"]

  if (value !== undefined && !btn.classList.contains("operator")) {
    btn.addEventListener("click", () => {
      currentExpression += value
      updateDisplay(currentExpression)
    })
  }
})