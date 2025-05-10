import type { Solution, Step, Variable, PivotInfo } from "./simplex-types"

export class DualSimplexSolver {
  private matrix: number[][] = []
  private steps: Step[] = []
  private dualVariables: string[] = []
  private slackVariables: string[] = []
  private originalVariables: string[] = []
  private constraints: string[]
  private objective: string
  private problemType: "max" | "min"

  constructor(objective: string, constraints: string[], problemType: "max" | "min") {
    this.objective = objective.trim()
    this.constraints = constraints.map((c) => c.trim()).filter((c) => c !== "")
    this.problemType = problemType

    if (this.constraints.length === 0) throw new Error("At least one constraint is required")
    if (this.objective === "") throw new Error("Objective function is required")

    this.buildDualTableau()
  }

  // Build the dual tableau as a standard simplex tableau
  private buildDualTableau(): void {
    // Parse original variables and constraints
    const primalVars = this.extractVariables(this.objective)
    for (const constraint of this.constraints) {
      const vars = this.extractVariables(constraint)
      for (const v of vars) if (!primalVars.includes(v)) primalVars.push(v)
    }
    this.originalVariables = primalVars.sort((a, b) => {
      const numA = Number.parseInt(a.substring(1))
      const numB = Number.parseInt(b.substring(1))
      return numA - numB
    })

    const m = this.constraints.length // number of primal constraints
    const n = this.originalVariables.length // number of primal variables

    // Dual variables: y1, y2, ..., ym
    this.dualVariables = Array.from({ length: m }, (_, i) => `y${i + 1}`)
    // Slack variables for dual constraints: s1, s2, ..., sn
    this.slackVariables = Array.from({ length: n }, (_, i) => `s${i + 1}`)

    // Tableau: rows = n constraints + 1 (objective), cols = m dual vars + n slack + 1 (p) + 1 (rhs)
    const numRows = n + 1
    const numCols = m + n + 2 // y's, s's, p, rhs

    this.matrix = Array.from({ length: numRows }, () => Array(numCols).fill(0))

    // Fill constraint rows (dual constraints)
    // Each primal variable gives a dual constraint
    // For primal: maximize c^T x, Ax <= b
    // Dual: minimize b^T y, A^T y >= c
    // So for each xj: sum_i a_ij y_i + s_j = c_j
    for (let j = 0; j < n; j++) {
      // For each dual variable y_i, get a_ij from primal constraint i
      for (let i = 0; i < m; i++) {
        const constraint = this.constraints[i]
        const parts = constraint.split(/<=|>=|=/)
        if (parts.length !== 2) throw new Error(`Invalid constraint format: ${constraint}`)
        const leftSide = parts[0].trim()
        const terms = leftSide.split(/(?=[-+])/).map((term) => term.trim())
        let coef = 0
        for (const term of terms) {
          if (!term) continue
          const match = term.match(/^\s*([+-]?\s*\d*\.?\d*)\s*(x\d+)/)
          if (!match) continue
          const coefStr = match[1].replace(/\s+/g, "")
          const c = coefStr === "" || coefStr === "+" ? 1 : (coefStr === "-" ? -1 : Number.parseFloat(coefStr))
          const variable = match[2].trim()
          if (variable === this.originalVariables[j]) {
            coef = c
            break
          }
        }
        this.matrix[j][i] = coef // y_i coefficient
      }
      // Slack variable for this constraint
      this.matrix[j][m + j] = 1 // s_j
      // RHS: c_j from objective
      const objTerms = this.objective.split(/(?=[-+])/).map((term) => term.trim())
      let c_j = 0
      for (const term of objTerms) {
        if (!term) continue
        const match = term.match(/^\s*([+-]?\s*\d*\.?\d*)\s*(x\d+)/)
        if (!match) continue
        const coefStr = match[1].replace(/\s+/g, "")
        const c = coefStr === "" || coefStr === "+" ? 1 : (coefStr === "-" ? -1 : Number.parseFloat(coefStr))
        const variable = match[2].trim()
        if (variable === this.originalVariables[j]) {
          c_j = c
          break
        }
      }
      this.matrix[j][numCols - 1] = c_j // rhs
    }

    // Objective row (minimize b^T y + p)
    // b^T y: b_i from each constraint's rhs
    for (let i = 0; i < m; i++) {
      const constraint = this.constraints[i]
      const parts = constraint.split(/<=|>=|=/)
      if (parts.length !== 2) throw new Error(`Invalid constraint format: ${constraint}`)
      const rhs = Number.parseFloat(parts[1].trim())
      this.matrix[n][i] = -rhs // negative for maximization in simplex tableau
    }
    // p variable (artificial for phase 2): set to 1 in objective row
    this.matrix[n][numCols - 2] = 1
    // RHS of objective row is 0
  }

  public solve(): { solution: Solution; steps: Step[] } {
    this.steps = []
    // Save initial tableau
    this.steps.push({ table: this.cloneMatrix(this.matrix) })

    // Standard simplex iterations (dual tableau)
    while (this.canImprove()) {
      const pivotCol = this.findPivotColumn()
      const pivotRow = this.findPivotRow(pivotCol)

      const pivotInfo: PivotInfo = {
        row: pivotRow,
        col: pivotCol,
        entering:
          pivotCol < this.dualVariables.length
            ? this.dualVariables[pivotCol]
            : this.slackVariables[pivotCol - this.dualVariables.length],
        leaving:
          pivotRow < this.originalVariables.length
            ? this.originalVariables[pivotRow]
            : "p",
      }

      this.pivot(pivotRow, pivotCol)
      this.steps.push({ table: this.cloneMatrix(this.matrix), pivotInfo })
    }

    const solution = this.extractSolution()
    return { solution, steps: this.steps }
  }

  private canImprove(): boolean {
    // Standard simplex: look for negative coefficients in objective row (excluding p and rhs)
    const lastRow = this.matrix[this.matrix.length - 1]
    const numVars = this.dualVariables.length + this.slackVariables.length
    return lastRow.slice(0, numVars).some((val) => val < 0)
  }

  private findPivotColumn(): number {
    const lastRow = this.matrix[this.matrix.length - 1]
    const numVars = this.dualVariables.length + this.slackVariables.length
    let minVal = 0
    let minIndex = -1
    for (let i = 0; i < numVars; i++) {
      if (lastRow[i] < minVal) {
        minVal = lastRow[i]
        minIndex = i
      }
    }
    return minIndex
  }

  private findPivotRow(pivotCol: number): number {
    let minRatio = Number.POSITIVE_INFINITY
    let minRatioIndex = -1
    for (let i = 0; i < this.matrix.length - 1; i++) {
      if (this.matrix[i][pivotCol] > 0) {
        const ratio = this.matrix[i][this.matrix[i].length - 1] / this.matrix[i][pivotCol]
        if (ratio < minRatio) {
          minRatio = ratio
          minRatioIndex = i
        }
      }
    }
    if (minRatioIndex === -1) {
      throw new Error("No finite solution")
    }
    return minRatioIndex
  }

  private pivot(pivotRow: number, pivotCol: number): void {
    const pivotValue = this.matrix[pivotRow][pivotCol]
    for (let j = 0; j < this.matrix[pivotRow].length; j++) {
      this.matrix[pivotRow][j] = this.matrix[pivotRow][j] / pivotValue
    }
    for (let i = 0; i < this.matrix.length; i++) {
      if (i !== pivotRow) {
        const factor = this.matrix[i][pivotCol]
        for (let j = 0; j < this.matrix[i].length; j++) {
          this.matrix[i][j] = this.matrix[i][j] - factor * this.matrix[pivotRow][j]
        }
      }
    }
  }

  private extractSolution(): Solution {
    const numDualVars = this.dualVariables.length
    const numSlackVars = this.slackVariables.length
    const RHS_COLUMN = numDualVars + numSlackVars + 1
    const tol = 1e-8

    const variableValues: { [key: string]: number } = {}
    for (const v of this.dualVariables) variableValues[v] = 0
    for (const s of this.slackVariables) variableValues[s] = 0

    // For dual simplex: x variables (primal) are in the last row, s columns
    const lastRow = this.matrix[this.matrix.length - 1]
    for (let j = 0; j < numSlackVars; j++) {
      variableValues[this.slackVariables[j]] = lastRow[numDualVars + j]
    }

    // For each constraint row, try to identify the basic variable (for y variables)
    for (let i = 0; i < this.originalVariables.length; i++) {
      let basicCol = -1
      for (let j = 0; j < numDualVars; j++) {
        const value = this.matrix[i][j]
        if (Math.abs(value - 1) < tol) {
          // Check that it is the only nonzero entry in its column (among constraint rows)
          let isUnit = true
          for (let k = 0; k < this.originalVariables.length; k++) {
            if (k !== i && Math.abs(this.matrix[k][j]) > tol) {
              isUnit = false
              break
            }
          }
          if (isUnit) {
            basicCol = j
            break
          }
        }
      }
      if (basicCol !== -1) {
        const rhsVal = this.matrix[i][RHS_COLUMN]
        variableValues[this.dualVariables[basicCol]] = rhsVal
      }
    }

    // Use the last row's RHS as the optimal value (dual objective)
    const optimalValue = this.matrix[this.matrix.length - 1][RHS_COLUMN]

    // Combine dual and slack variables for output
    const solutionVariables: Variable[] = [
      ...this.dualVariables.map((v) => ({
        name: v,
        value: variableValues[v] || 0,
      })),
      ...this.slackVariables.map((s) => ({
        name: s,
        value: variableValues[s] || 0,
      })),
    ]

    return {
      optimalValue,
      variables: solutionVariables,
      feasible: true,
    }
  }

  private extractVariables(expression: string): string[] {
    const regex = /x\d+/g
    const matches = expression.match(regex) || []
    return [...new Set(matches)]
  }

  private cloneMatrix(matrix: number[][]): number[][] {
    return matrix.map((row) => [...row])
  }
}