import React from "react"

interface DualSimplexTableProps {
  data: number[][]
  dualVars: number
  primalVars: number
  pivotInfo?: {
    row: number
    col: number
    entering: string
    leaving: string
  }
  previousTable?: number[][]
}

export function DualSimplexTable({
  data,
  dualVars,
  primalVars,
  pivotInfo,
  previousTable,
}: DualSimplexTableProps) {
  if (!data || data.length === 0) return null

  const getOperationText = (rowIndex: number): string => {
    if (!pivotInfo || !previousTable) return ""
    if (rowIndex === pivotInfo.row) {
      const pivotValue = previousTable[pivotInfo.row][pivotInfo.col]
      return `R${rowIndex + 1} ÷ ${pivotValue.toFixed(2)}`
    } else {
      const coefficient = previousTable[rowIndex][pivotInfo.col]
      if (Math.abs(coefficient) < 0.001) {
        return `R${rowIndex + 1} (unchanged)`
      }
      const sign = coefficient < 0 ? " + " : " - "
      return `R${rowIndex + 1}${sign}${Math.abs(coefficient).toFixed(2)} × R${pivotInfo.row + 1}`
    }
  }

  // Table: y columns, then x columns, then p, then RHS
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200">
          <thead>
            <tr className="bg-purple-50">
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
              {/* y columns */}
              {Array.from({ length: dualVars }).map((_, i) => (
                <th
                  key={`y${i}`}
                  className={`px-4 py-2 text-center text-xs font-medium uppercase tracking-wider ${
                    pivotInfo && pivotInfo.col === i ? "bg-purple-200 text-purple-800" : "text-gray-500"
                  }`}
                >
                  y<sub>{i + 1}</sub>
                </th>
              ))}
              {/* x columns */}
              {Array.from({ length: primalVars }).map((_, i) => (
                <th
                  key={`x${i}`}
                  className={`px-4 py-2 text-center text-xs font-medium uppercase tracking-wider ${
                    pivotInfo && pivotInfo.col === dualVars + i ? "bg-purple-200 text-purple-800" : "text-gray-500"
                  }`}
                >
                  x<sub>{i + 1}</sub>
                </th>
              ))}
              {/* p column */}
              <th
                className={`px-4 py-2 text-center text-xs font-medium uppercase tracking-wider ${
                  pivotInfo && pivotInfo.col === dualVars + primalVars
                    ? "bg-purple-200 text-purple-800"
                    : "text-gray-500"
                }`}
              >
                p
              </th>
              {/* RHS column */}
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">RHS</th>
              {/* Operations column */}
              {pivotInfo && previousTable && (
                <th className="px-4 py-2 text-left text-xs font-medium bg-yellow-100 uppercase tracking-wider">
                  Operation
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {/* Constraint rows */}
            {data.slice(0, -1).map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={`${
                  pivotInfo && pivotInfo.row === rowIndex
                    ? "bg-purple-100"
                    : rowIndex % 2 === 0
                    ? "bg-white"
                    : "bg-gray-50"
                }`}
              >
                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                  Constraint {rowIndex + 1}
                </td>
                {/* y columns */}
                {row.slice(0, dualVars).map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={`px-4 py-2 whitespace-nowrap text-sm text-center ${
                      pivotInfo && pivotInfo.row === rowIndex && pivotInfo.col === cellIndex
                        ? "bg-purple-300 font-bold"
                        : pivotInfo && pivotInfo.col === cellIndex
                        ? "bg-purple-100"
                        : "text-gray-500"
                    }`}
                  >
                    {cell.toFixed(2)}
                  </td>
                ))}
                {/* x columns */}
                {row.slice(dualVars, dualVars + primalVars).map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={`px-4 py-2 whitespace-nowrap text-sm text-center ${
                      pivotInfo && pivotInfo.row === rowIndex && pivotInfo.col === dualVars + cellIndex
                        ? "bg-purple-300 font-bold"
                        : pivotInfo && pivotInfo.col === dualVars + cellIndex
                        ? "bg-purple-100"
                        : "text-gray-500"
                    }`}
                  >
                    {cell.toFixed(2)}
                  </td>
                ))}
                {/* p column */}
                <td
                  className={`px-4 py-2 whitespace-nowrap text-sm text-center ${
                    pivotInfo && pivotInfo.row === rowIndex && pivotInfo.col === dualVars + primalVars
                      ? "bg-purple-300 font-bold"
                      : pivotInfo && pivotInfo.col === dualVars + primalVars
                      ? "bg-purple-100"
                      : "text-gray-500"
                  }`}
                >
                  {row[dualVars + primalVars].toFixed(2)}
                </td>
                {/* RHS column */}
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                  {row[row.length - 1].toFixed(2)}
                </td>
                {/* Operations column */}
                {pivotInfo && previousTable && (
                  <td className="px-4 py-2 whitespace-nowrap text-sm bg-yellow-50 border-l border-yellow-200 font-medium">
                    {getOperationText(rowIndex)}
                  </td>
                )}
              </tr>
            ))}
            {/* Objective function row */}
            <tr className={`bg-blue-50 ${pivotInfo && pivotInfo.row === data.length - 1 ? "bg-purple-100" : ""}`}>
              <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-blue-800">
                Objective Function
              </td>
              {/* y columns */}
              {data[data.length - 1].slice(0, dualVars).map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={`px-4 py-2 whitespace-nowrap text-sm text-center font-medium ${
                    pivotInfo && pivotInfo.row === data.length - 1 && pivotInfo.col === cellIndex
                      ? "bg-purple-300"
                      : pivotInfo && pivotInfo.col === cellIndex
                      ? "bg-purple-100"
                      : "text-blue-700"
                  }`}
                >
                  {cell.toFixed(2)}
                </td>
              ))}
              {/* x columns */}
              {data[data.length - 1].slice(dualVars, dualVars + primalVars).map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={`px-4 py-2 whitespace-nowrap text-sm text-center font-medium ${
                    pivotInfo && pivotInfo.row === data.length - 1 && pivotInfo.col === dualVars + cellIndex
                      ? "bg-purple-300"
                      : pivotInfo && pivotInfo.col === dualVars + cellIndex
                      ? "bg-purple-100"
                      : "text-blue-700"
                  }`}
                >
                  {cell.toFixed(2)}
                </td>
              ))}
              {/* p column */}
              <td
                className={`px-4 py-2 whitespace-nowrap text-sm text-center font-medium ${
                  pivotInfo && pivotInfo.row === data.length - 1 && pivotInfo.col === dualVars + primalVars
                    ? "bg-purple-300"
                    : pivotInfo && pivotInfo.col === dualVars + primalVars
                    ? "bg-purple-100"
                    : "text-blue-700"
                }`}
              >
                {data[data.length - 1][dualVars + primalVars].toFixed(2)}
              </td>
              {/* RHS column */}
              <td className="px-4 py-2 whitespace-nowrap text-sm text-blue-700 text-center font-medium">
                {data[data.length - 1][data[data.length - 1].length - 1].toFixed(2)}
              </td>
              {/* Operations column */}
              {pivotInfo && previousTable && (
                <td className="px-4 py-2 whitespace-nowrap text-sm bg-yellow-50 border-l border-yellow-200 font-medium">
                  {getOperationText(data.length - 1)}
                </td>
              )}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}