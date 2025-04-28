"use client"

import type React from "react"
import { useState } from "react"
import { SimplexSolver } from "@/src/lib/simplex-solver"
import { SimplexTable } from "@/src/components/simplex-table"
import { GraphVisualizer } from "@/src/components/graph-visualizer"

interface SimplexVariable {
    name: string;
    value: number;
}

interface SimplexSolution {
    optimalValue: number;
    variables: SimplexVariable[];
}

interface PivotInfo {
    row: number;
    col: number;
    entering: string;
    leaving: string;
}

interface SimplexStep {
    table: number[][];
    pivotInfo?: PivotInfo;
}

export default function SimplexCalculator() {
  const [solution, setSolution] = useState<SimplexSolution | null>(null)
  const [steps, setSteps] = useState<SimplexStep[]>([])

  const [numVariables, setNumVariables] = useState<number>(2)
  const [objectiveCoefficients, setObjectiveCoefficients] = useState<string[]>(["", ""])
  const [constraints, setConstraints] = useState<
    {
      coefficients: string[]
      operator: "<=" | ">=" | "="
      rhs: string
    }[]
  >([
    { coefficients: Array(2).fill(""), operator: "<=", rhs: "" },
    { coefficients: Array(2).fill(""), operator: "<=", rhs: "" },
  ])

  const [problemType, setProblemType] = useState<"max" | "min">("max")
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"solution" | "steps" | "graph">("solution")

  const updateObjectiveCoefficient = (index: number, value: string) => {
    const newCoeffs = [...objectiveCoefficients]
    newCoeffs[index] = value
    setObjectiveCoefficients(newCoeffs)
  }

  const addConstraint = () => {
    setConstraints([...constraints, { coefficients: Array(numVariables).fill(""), operator: "<=", rhs: "" }])
  }

  const removeConstraint = (index: number) => {
    if (constraints.length > 1) {
      const newConstraints = [...constraints]
      newConstraints.splice(index, 1)
      setConstraints(newConstraints.map(constraint => ({
        ...constraint,
        coefficients: constraint.coefficients.map(String),
      })))
    }
  }

  const updateConstraintCoefficient = (constraintIndex: number, coefficientIndex: number, value: string) => {
    const newConstraints = [...constraints];
    newConstraints[constraintIndex].coefficients[coefficientIndex] = value;
    setConstraints(newConstraints);
  }

  const updateConstraintOperator = (constraintIndex: number, operator: "<=" | ">=" | "=") => {
    const newConstraints = [...constraints]
    newConstraints[constraintIndex].operator = operator
    setConstraints(newConstraints.map(constraint => ({
      ...constraint,
      coefficients: constraint.coefficients.map(String),
    })))
  }

  const updateConstraintRHS = (constraintIndex: number, value: string) => {
    const newConstraints = [...constraints];
    newConstraints[constraintIndex].rhs = value;
    setConstraints(newConstraints);
  }

  const buildObjectiveFunction = (): string => {
    return objectiveCoefficients
      .map((coef, index) => {
        const num = parseFloat(coef)
        if (isNaN(num)) return ""
        return `${num}x${index + 1}`
      })
      .filter(term => term !== "")
      .join(" + ") || "0"
  }

  const buildConstraints = () => {
    return constraints.map((constraint) => {
      const leftSide =
        constraint.coefficients
          .map((coef, index) => {
            const num = parseFloat(coef)
            if (isNaN(num) || num === 0) return ""
            return `${num}x${index + 1}`
          })
          .filter((term) => term !== "")
          .join(" + ") || "0"

      const rhsValue = parseFloat(constraint.rhs)
      return `${leftSide} ${constraint.operator} ${isNaN(rhsValue) ? 0 : rhsValue}`
    })
  }

  const solve = () => {

  // Validate that all inputs are valid numbers
  if (
    objectiveCoefficients.some(coef => Number.isNaN(parseFloat(coef))) ||
    constraints.some(constraint =>
      constraint.coefficients.some(coef => Number.isNaN(parseFloat(coef))) ||
      Number.isNaN(parseFloat(constraint.rhs))
    )
  ) {
    setError("Please provide valid numeric values for all coefficients and constraints.");
    return;
  }

  try {
    setError(null);
    const objectiveFunction = buildObjectiveFunction();
    const constraintStrings = buildConstraints();

    const solver = new SimplexSolver(objectiveFunction, constraintStrings, problemType);
    const { solution, steps } = solver.solve();
    setSolution(solution);
    setSteps(steps);
  } catch (err: unknown) {
    if (err instanceof Error) {
      setError(err.message);
    } else {
      setError("An error occurred while solving the problem");
    }
    setSolution(null);
    setSteps([]);
  }
  }

  const reset = () => {
    setObjectiveCoefficients(Array(numVariables).fill(""))
    setConstraints([
      { coefficients: Array(numVariables).fill(""), operator: "<=", rhs: "" },
      { coefficients: Array(numVariables).fill(""), operator: "<=", rhs: "" },
    ])
    setProblemType("max")
    setSolution(null)
    setSteps([])
    setError(null)
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold text-center mb-8">Simplex Method Solver</h1>

      <div className="grid gap-6 md:grid-cols-[1fr_1fr] lg:grid-cols-[1fr_2fr]">
        {/* Problem Setup Card */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 md:col-span-1">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Problem Setup</h2>
            <p className="text-gray-500 text-sm">Enter coefficients for your linear programming problem</p>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              {/* Number of variables selector */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">Number of Variables</label>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      if (numVariables > 2) {
                        const newNumVars = numVariables - 1
                        setNumVariables(newNumVars)

                        // Update objective coefficients
                        const newObjCoefs = objectiveCoefficients.slice(0, newNumVars)
                        setObjectiveCoefficients(newObjCoefs.map(String))

                        // Update constraints
                        const newConstraints = constraints.map((constraint) => ({
                          ...constraint,
                          coefficients: constraint.coefficients.slice(0, newNumVars),
                        }))
                        setConstraints(newConstraints.map(constraint => ({
                          ...constraint,
                          coefficients: constraint.coefficients.map(String),
                        })))
                      }
                    }}
                    className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50"
                    disabled={numVariables <= 2}
                  >
                    -
                  </button>
                  <span className="px-3 py-1">{numVariables}</span>
                  <button
                    onClick={() => {
                      if (numVariables < 6) {
                        const newNumVars = numVariables + 1
                        setNumVariables(newNumVars)

                        // Update objective coefficients
                        const newObjCoefs = [...objectiveCoefficients, ""];
                        setObjectiveCoefficients(newObjCoefs);

                        // Update constraints
                        const newConstraints = constraints.map((constraint) => ({
                          ...constraint,
                          coefficients: [...constraint.coefficients, ""],
                        }));
                        setConstraints(newConstraints);
                      }
                    }}
                    className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50"
                    disabled={numVariables >= 6}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Objective Function */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <input
                        type="radio"
                        id="max"
                        name="problemType"
                        value="max"
                        checked={problemType === "max"}
                        onChange={() => setProblemType("max")}
                        className="h-4 w-4 text-blue-600"
                      />
                      <label htmlFor="max" className="text-sm">
                        Max
                      </label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <input
                        type="radio"
                        id="min"
                        name="problemType"
                        value="min"
                        checked={problemType === "min"}
                        onChange={() => setProblemType("min")}
                        className="h-4 w-4 text-blue-600"
                      />
                      <label htmlFor="min" className="text-sm">
                        Min
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium">{problemType === "max" ? "Max" : "Min"} Z =</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {objectiveCoefficients.map((coef, index) => (
                      <div key={index} className="flex items-center">
                        {index > 0 && <span className="mx-1">+</span>}
                        <input
                          type="number"
                          value={coef}
                          onChange={(e) => updateObjectiveCoefficient(index, e.target.value)}
                          className="w-16 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="ml-1">
                          x<sub>{index + 1}</sub>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Constraints */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">Constraints</label>
                <div className="space-y-3">
                  {constraints.map((constraint, index) => (
                    <div key={index} className="flex flex-wrap items-center gap-2">
                      {constraint.coefficients.map((coef, coefIndex) => (
                        <div key={coefIndex} className="flex items-center">
                          {coefIndex > 0 && <span className="mx-1">+</span>}
                          <input
                            type="number"
                            value={coef}
                            onChange={(e) => updateConstraintCoefficient(index, coefIndex, e.target.value)}
                            className="w-16 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="ml-1">
                            x<sub>{coefIndex + 1}</sub>
                          </span>
                        </div>
                      ))}

                      <select
                        value={constraint.operator}
                        onChange={(e) => updateConstraintOperator(index, e.target.value as "<=" | ">=" | "=")}
                        className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="<=">≤</option>
                        <option value=">=">≥</option>
                        <option value="=">=</option>
                      </select>

                      <input
                        type="number"
                        value={constraint.rhs}
                        onChange={(e) => updateConstraintRHS(index, e.target.value)}
                        className="w-16 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />

                      {constraints.length > 1 && (
                        <button
                          onClick={() => removeConstraint(index)}
                          className="p-1 text-gray-500 hover:text-gray-700 focus:outline-none"
                          aria-label="Remove constraint"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={addConstraint}
                  className="mt-2 text-sm px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Add Constraint
                </button>

                {/* Non-negativity constraints are assumed */}
                <div className="mt-2 text-sm text-gray-500">
                  Note: x<sub>i</sub> ≥ 0 (Non-negativity constraints are assumed)
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={solve}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Solve
                </button>
                <button
                  onClick={reset}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Reset
                </button>
              </div>

              {/* Error Message */}
              {error && <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">{error}</div>}
            </div>
          </div>
        </div>

        {/* Results Card */}
        <div className="md:col-span-1 lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                className={`flex-1 px-4 py-3 text-center ${
                  activeTab === "solution"
                    ? "border-b-2 border-blue-500 text-blue-600 font-medium"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("solution")}
              >
                Solution
              </button>
              <button
                className={`flex-1 px-4 py-3 text-center ${
                  activeTab === "steps"
                    ? "border-b-2 border-blue-500 text-blue-600 font-medium"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("steps")}
              >
                Step by Step
              </button>
              {numVariables === 2 && (
                <button
                  className={`flex-1 px-4 py-3 text-center ${
                    activeTab === "graph"
                      ? "border-b-2 border-blue-500 text-blue-600 font-medium"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setActiveTab("graph")}
                >
                  Graph
                </button>
              )}
            </div>

            {/* Solution Tab Content */}
            {activeTab === "solution" && (
              <div className="p-6">
                {solution ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-medium text-gray-800">Optimal Value</h3>
                      <p className="text-2xl font-bold text-blue-600">{solution.optimalValue.toFixed(4)}</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-800">Optimal Solution</h3>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {solution.variables.map((variable: SimplexVariable, index: number) => (
                          <div key={index} className="bg-gray-100 p-2 rounded-md">
                          <span className="font-medium">{variable.name}:</span> {variable.value.toFixed(4)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Enter a problem and click &quot;Solve&quot; to see the solution
                  </div>
                )}
              </div>
            )}

            {/* Steps Tab Content */}
            {activeTab === "steps" && (
              <div className="p-4">
                {steps.length > 0 ? (
                  <div className="space-y-6">
                    {steps.map((step, index) => (
                      <div key={index} className="space-y-2">
                        <h3 className="font-medium text-gray-800">Iteration {index + 1}</h3>
                        <SimplexTable
                          data={step.table}
                          variables={numVariables}
                          constraints={constraints.length}
                          pivotInfo={step.pivotInfo}
                          previousTable={index > 0 ? steps[index - 1].table : undefined}
                        />
                        {step.pivotInfo && (
                          <div className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-md border border-yellow-200">
                            <p className="font-medium">Pivot Information:</p>
                            <p>
                              Pivot: Row {step.pivotInfo.row + 1}, Column {step.pivotInfo.col + 1}
                            </p>
                            <p>Entering: {step.pivotInfo.entering}</p>
                            <p>Leaving: {step.pivotInfo.leaving}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Enter a problem and click &quot;Solve&quot; to see the step-by-step solution
                  </div>
                )}
              </div>
            )}

            {/* Graph Tab Content */}
            {activeTab === "graph" && numVariables === 2 && (
              <div className="p-4">
                <GraphVisualizer
                  constraints={constraints.map(constraint => ({
                    coefficients: constraint.coefficients.map(Number),
                    operator: constraint.operator,
                    rhs: parseFloat(constraint.rhs)
                  }))}
                  solution={solution}
                  problemType={problemType}
                  objectiveCoefficients={objectiveCoefficients.map(Number)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
