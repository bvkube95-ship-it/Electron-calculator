import { isOperator } from "../calculator.js"

export function recalcParenCount(expression: string): number {
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

export function recalcExpectOperand(expression: string): boolean {
  if (expression === "") {
    return true
  }
  const lastChar = expression[expression.length - 1]
  if (lastChar === "(" || (lastChar !== undefined && isOperator(lastChar))) {
    return true
  }
  return false
}

export function canAddDot(expression: string): boolean {
  const lastChar = expression[expression.length - 1]
  if (lastChar === ")") {
    return false
  }

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

export function canReplaceOperator(expression: string): boolean {
  const i = expression.length - 1
 
  if (i < 0) {
    return false
  }
 
  const lastChar = expression[i]!
 
  return isOperator(lastChar)
}

export function isLastMinusUnary(expression: string): boolean {
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