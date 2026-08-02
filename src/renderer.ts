type Operator = "+" | "-" | "*" | "/"

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

function priority(operator: Operator): number {
  return operator === "+" || operator === "-" ? 1 : 2
}

function evaluateExpression(expression: string): number {
  const tokens = expression.match(/\d+\.?\d*|[+\-*/()]/g)
  if (!tokens) {
    throw new Error("Invalid expression")
  }

  const numbersStack: number[] = []
  const operatorsStack: (Operator | "(")[] = []

  function collapseOnce() {
    const op = operatorsStack.pop()
    const b = numbersStack.pop()
    const a = numbersStack.pop()
    if (op === undefined || op === "(" || a === undefined || b === undefined) {
      throw new Error("Invalid expression")
    }
    numbersStack.push(calculator.calculate(a, op, b))
    }

    for (const token of tokens) {
      if (!isNaN(Number(token))) {
        numbersStack.push(Number(token))
      } else if (token === "(") {
        operatorsStack.push("(")
        } else if (token === ")") {
          while (
            operatorsStack.length > 0 &&
            operatorsStack[operatorsStack.length - 1] !== "("
          ) {
            collapseOnce()
          } 
          if (operatorsStack.length === 0) {
            throw new Error("Mismatched parentheses")
          }
          operatorsStack.pop() // Remove the "("
        } else if (isOperator(token)) {
          while (
            operatorsStack.length > 0 &&
            operatorsStack[operatorsStack.length - 1] !== "(" &&
            priority(operatorsStack[operatorsStack.length - 1] as Operator) >= priority(token)
          ) {
            collapseOnce()
          }
          operatorsStack.push(token)
        }
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
