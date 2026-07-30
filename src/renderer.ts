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

  calculate(a: number, operator: string, b: number): number {
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

let currentValue = "0"
let previousValue = ""
let operator = ""
let waitingForNewValue = false

const display = document.getElementById("display") as HTMLInputElement
const buttons = document.querySelectorAll(".btn")

function updateDisplay() {
  display.value = currentValue
}

function inputDigit(digit: string) {
  if (waitingForNewValue) {
    currentValue = digit
    waitingForNewValue = false
  } else {
    currentValue = currentValue === "0" ? digit : currentValue + digit
  }
}

function inputDot() {
  if (waitingForNewValue) {
    currentValue = "0."
    waitingForNewValue = false
    return
  }
  if (!currentValue.includes(".")) {
    currentValue += "."
  }
}

function chooseOperator(nextOperator: string) {
  if (operator && !waitingForNewValue) {
    handleEquals()
  }
  previousValue = currentValue
  operator = nextOperator
  waitingForNewValue = true
}

function handleEquals() {
  if (!operator || waitingForNewValue) return

  try {
    const result = calculator.calculate(
      parseFloat(previousValue),
      operator,
      parseFloat(currentValue)
    )
    currentValue = String(result)
    operator = ""
    previousValue = ""
  } catch (error) {
    if (error instanceof Error) {
      currentValue = "Error"
    }
  }
}

function handleClear() {
  currentValue = "0"
  previousValue = ""
  operator = ""
  waitingForNewValue = false
}

function handleDelete() {
  currentValue = currentValue.length > 1 ? currentValue.slice(0, -1) : "0"
}

// EVENT LISTENERS