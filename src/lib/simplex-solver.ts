type Variable = {
  name: string
  value: number
}

type Solution = {
  optimalValue: number
  variables: Variable[]
  feasible: boolean
}

type PivotInfo = {
  row: number
  col: number
  entering: string
  leaving: string
}

type Step = {
  table: number[][]
  pivotInfo?: PivotInfo
}

export class SimplexSolver {
  private objective: string
  private constraints: string[]
  private problemType: "max" | "min"
  private variables: string[] = []
  private slackVariables: string[] = []
  private matrix: number[][] = []
  private steps: Step[] = []

  constructor(objective: string, constraints: string[], problemType: "max" | "min") {
    this.objective = objective.trim()
    this.constraints = constraints.map((c) => c.trim()).filter((c) => c !== "")
    this.problemType = problemType

    if (this.constraints.length === 0) {
      throw new Error("At least one constraint is required")
    }

    if (this.objective === "") {
      throw new Error("Objective function is required")
    }

    // Look for direct contradictions: same left side, but lower bound > upper bound
    for (let i = 0; i < this.constraints.length; i++) {
      for (let j = i + 1; j < this.constraints.length; j++) {
        const ci = this.constraints[i];
        const cj = this.constraints[j];
        const partsI = ci.split(/<=|>=|=/);
        const partsJ = cj.split(/<=|>=|=/);
        if (partsI.length === 2 && partsJ.length === 2) {
          const leftI = partsI[0].replace(/\s+/g, "");
          const leftJ = partsJ[0].replace(/\s+/g, "");
          if (leftI === leftJ) {
            // Check for contradiction
            if (ci.includes("<=") && cj.includes(">=")) {
              const upper = parseFloat(partsI[1]);
              const lower = parseFloat(partsJ[1]);
              if (!isNaN(upper) && !isNaN(lower) && lower > upper) {
                throw new Error("No feasible solution");
              }
            }
            if (ci.includes(">=") && cj.includes("<=")) {
              const lower = parseFloat(partsI[1]);
              const upper = parseFloat(partsJ[1]);
              if (!isNaN(upper) && !isNaN(lower) && lower > upper) {
                throw new Error("No feasible solution");
              }
            }
          }
        }
      }
    }

    this.parseInput()
  }

  private parseInput(): void {
    // Extract variables from objective function
    const objVariables = this.extractVariables(this.objective)

    // Extract variables from constraints
    for (const constraint of this.constraints) {
      const constraintVars = this.extractVariables(constraint)
      for (const v of constraintVars) {
        if (!objVariables.includes(v)) {
          objVariables.push(v)
        }
      }
    }

    // Sort variables (x1, x2, x3, ...)
    this.variables = objVariables.sort((a, b) => {
      const numA = Number.parseInt(a.substring(1))
      const numB = Number.parseInt(b.substring(1))
      return numA - numB
    })

    // Create slack variables
    this.slackVariables = Array.from({ length: this.constraints.length }, (_, i) => `s${i + 1}`)

    // Initialize matrix
    this.initializeMatrix()
  }

  private extractVariables(expression: string): string[] {
    const regex = /x\d+/g
    const matches = expression.match(regex) || []
    return [...new Set(matches)]
  }

  private initializeMatrix(): void {
    const numVars = this.variables.length
    const numConstraints = this.constraints.length

    // Initialize matrix with zeros
    // Rows: constraints + objective function
    // Columns: variables + slack variables + Z + RHS
    this.matrix = Array.from({ length: numConstraints + 1 }, () => Array(numVars + numConstraints + 2).fill(0))

    // Fill constraint rows
    for (let i = 0; i < numConstraints; i++) {
      const constraint = this.constraints[i]
      const parts = constraint.split(/<=|>=|=/)

      if (parts.length !== 2) {
        throw new Error(`Invalid constraint format: ${constraint}`)
      }

      const leftSide = parts[0].trim()
      const rightSide = Number.parseFloat(parts[1].trim())

      if (isNaN(rightSide)) {
        throw new Error(`Invalid right-hand side in constraint: ${constraint}`)
      }

      // Set RHS
      this.matrix[i][numVars + numConstraints + 1] = rightSide

      // Set Z coefficient to 0
      this.matrix[i][numVars + numConstraints] = 0

      // Parse left side coefficients
      const terms = leftSide.split(/(?=[-+])/).map((term) => term.trim())
      for (const term of terms) {
        if (!term) continue
        const match = term.match(/^\s*([+-]?\s*\d*\.?\d*)\s*(.*)$/)
        if (!match) continue

        const coefStr = match[1].replace(/\s+/g, "")
        const coef = coefStr === "" || coefStr === "+" ? 1 : (coefStr === "-" ? -1 : Number.parseFloat(coefStr))
        
        let variable = match[2].trim()
        if (variable.startsWith("*")) {
          variable = variable.substring(1).trim()
        }

        const varIndex = this.variables.indexOf(variable)
        if (varIndex !== -1) {
          this.matrix[i][varIndex] = coef
        }
      }

      // Set slack variable
      if (constraint.includes("<=")) {
        this.matrix[i][numVars + i] = 1
      } else if (constraint.includes(">=")) {
        this.matrix[i][numVars + i] = -1
      }
      // For equality constraints, no slack variable is added
    }

    // Fill objective function row (last row)
    const objTerms = this.objective.split(/(?=[-+])/).map((term) => term.trim());
    // For maximization problems, multiply coefficients by -1 to convert them to minimization form
    const sign = this.problemType === "max" ? -1 : 1;
    
    for (const term of objTerms) {
      if (!term) continue;
      
      const match = term.match(/^\s*([+-]?\s*\d*\.?\d*)\s*(.*)$/);
      if (!match) continue;
      
      const coefStr = match[1].replace(/\s+/g, "");
      const coef = coefStr === "" || coefStr === "+" ? 1 : (coefStr === "-" ? -1 : Number.parseFloat(coefStr));
      
      let variable = match[2].trim();
      if (variable.startsWith("*")) {
        variable = variable.substring(1).trim();
      }
      
      const varIndex = this.variables.indexOf(variable);
      if (varIndex !== -1) {
        this.matrix[numConstraints][varIndex] = sign * coef; // apply sign conversion here
      }
    }

    // Set Z coefficient to 1 in objective function row
    this.matrix[numConstraints][numVars + numConstraints] = 1
  }

  public solve(): { solution: Solution; steps: Step[] } {
    this.steps = []

    // Save initial tableau
    this.steps.push({
      table: this.cloneMatrix(this.matrix),
    })

    // Perform simplex iterations
    while (this.canImprove()) {
      const pivotCol = this.findPivotColumn()
      const pivotRow = this.findPivotRow(pivotCol)

      const pivotInfo: PivotInfo = {
        row: pivotRow,
        col: pivotCol,
        entering:
          pivotCol < this.variables.length
            ? this.variables[pivotCol]
            : this.slackVariables[pivotCol - this.variables.length],
        leaving: pivotRow < this.slackVariables.length ? this.slackVariables[pivotRow] : "Z",
      }

      this.pivot(pivotRow, pivotCol)

      // Save step
      this.steps.push({
        table: this.cloneMatrix(this.matrix),
        pivotInfo,
      })
    }

    // Extract solution
    const solution = this.extractSolution()

    return { solution, steps: this.steps }
  }

  // Use the standard criteria for maximization (look for negative coefficients) without branching.
  private canImprove(): boolean {
    const lastRow = this.matrix[this.matrix.length - 1];
    const numVars = this.variables.length;
    const numConstraints = this.constraints.length;
    return lastRow.slice(0, numVars + numConstraints).some((val) => val < 0);
  }

  private findPivotColumn(): number {
    const lastRow = this.matrix[this.matrix.length - 1];
    const numVars = this.variables.length;
    const numConstraints = this.constraints.length;

    let minVal = 0;
    let minIndex = -1;
    for (let i = 0; i < numVars + numConstraints; i++) {
      if (lastRow[i] < minVal) {
        minVal = lastRow[i];
        minIndex = i;
      }
    }
    return minIndex;
  }

  private findPivotRow(pivotCol: number): number {
    let minRatio = Number.POSITIVE_INFINITY
    let minRatioIndex = -1
    const numVars = this.variables.length
    const numConstraints = this.constraints.length

    for (let i = 0; i < this.matrix.length - 1; i++) {
      if (this.matrix[i][pivotCol] > 0) {
        const ratio = this.matrix[i][numVars + numConstraints + 1] / this.matrix[i][pivotCol]
                if (ratio < minRatio) {
          minRatio = ratio
          minRatioIndex = i
        }
      }
    }

    // If no valid pivot row found, the solution is unbounded
    if (minRatioIndex === -1) {
      throw new Error("No finite solution")
    }

    return minRatioIndex
  }

  private pivot(pivotRow: number, pivotCol: number): void {
    // Normalize pivot row
    const pivotValue = this.matrix[pivotRow][pivotCol]

    for (let j = 0; j < this.matrix[pivotRow].length; j++) {
      this.matrix[pivotRow][j] = this.matrix[pivotRow][j] / pivotValue
    }

    // Update other rows
    for (let i = 0; i < this.matrix.length; i++) {
      if (i !== pivotRow) {
        const factor = this.matrix[i][pivotCol]

        for (let j = 0; j < this.matrix[i].length; j++) {
          this.matrix[i][j] = this.matrix[i][j] - factor * this.matrix[pivotRow][j]
        }
      }
    }
  }

  // After solving, if the original problem was minimization, flip the optimal value again.
  private extractSolution(): Solution {
    const numVars = this.variables.length;
    const numConstraints = this.constraints.length;
    const RHS_COLUMN = numVars + numConstraints + 1;
    const tol = 1e-8;
    
    const variableValues: { [key: string]: number } = {};
    for (const v of this.variables) {
      variableValues[v] = 0;
    }
    for (const s of this.slackVariables) {
      variableValues[s] = 0;
    }

    // For each constraint row, try to identify the basic variable
    for (let i = 0; i < numConstraints; i++) {
      let basicCol = -1;
      let bestObjCoeff = Number.POSITIVE_INFINITY;
      // Examine each column among variables+slack
      for (let j = 0; j < numVars + numConstraints; j++) {
        const value = this.matrix[i][j];
        if (Math.abs(value - 1) < tol) {
          // Check that it is the only nonzero entry in its column (among constraint rows)
          let isUnit = true;
          for (let k = 0; k < numConstraints; k++) {
            if (k !== i && Math.abs(this.matrix[k][j]) > tol) {
              isUnit = false;
              break;
            }
          }
          if (!isUnit) continue;
          
          // Get the objective row coefficient for this column
          const objCoeff = Math.abs(this.matrix[this.matrix.length - 1][j]);
          // Prefer basic variable candidates with near-zero objective coefficient
          // (This distinguishes between ambiguous unit columns)
          if (j < numVars && objCoeff < tol) {
            // Immediate selection if an original variable has near-zero objective coefficient
            basicCol = j;
            break;
          } else if (objCoeff < bestObjCoeff) {
            bestObjCoeff = objCoeff;
            basicCol = j;
          }
        }
      }
      if (basicCol !== -1) {
        const rhsVal = this.matrix[i][RHS_COLUMN];
        if (basicCol < numVars) {
          variableValues[this.variables[basicCol]] = rhsVal;
        } else {
          variableValues[this.slackVariables[basicCol - numVars]] = rhsVal;
        }
      }
    }

    // Use the last row's RHS as the optimal value
    let optimalValue = this.matrix[this.matrix.length - 1][RHS_COLUMN];
    if (this.problemType === "min") {
      optimalValue = -optimalValue;
    }

    // Combine original and slack variables so all are visible in the final solution
    const solutionVariables: Variable[] = [
      ...this.variables.map((v) => ({
        name: v,
        value: variableValues[v] || 0,
      })),
      ...this.slackVariables.map((s) => ({
        name: s,
        value: variableValues[s] || 0,
      })),
    ];

    return {
      optimalValue,
      variables: solutionVariables,
      feasible: true,
    };
  }

  private cloneMatrix(matrix: number[][]): number[][] {
    return matrix.map((row) => [...row])
  }
}
