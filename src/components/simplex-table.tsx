interface SimplexTableProps {
  data: number[][]
  variables: number
  constraints: number
  pivotInfo?: {
    row: number
    col: number
    entering: string
    leaving: string
  }
  previousTable?: number[][]
}

export function SimplexTable({ data, variables, constraints, pivotInfo, previousTable }: SimplexTableProps) {
  if (!data || data.length === 0) return null

  // Determine basic variables
  const basicVariables: string[] = [];
  for (let i = 0; i < data.length - 1; i++) {
      basicVariables.push(`Constraint ${i + 1}`);
  }
  basicVariables.push("Objective Function (Z)");

  // Function to get the operation text for a row
  const getOperationText = (rowIndex: number): string => {
    if (!pivotInfo || !previousTable) return ""

    if (rowIndex === pivotInfo.row) {
      // For pivot row: R{row} ÷ {pivot value}
      const pivotValue = previousTable[pivotInfo.row][pivotInfo.col]
      return `R${rowIndex + 1} ÷ ${pivotValue.toFixed(2)}`
    } else {
      // For other rows: R{row} {sign} {coefficient} × R{pivot row}
      const coefficient = previousTable[rowIndex][pivotInfo.col]
      if (Math.abs(coefficient) < 0.001) {
        return `R${rowIndex + 1} (unchanged)`
      }
      const sign = coefficient < 0 ? " + " : " - ";
      return `R${rowIndex + 1}${sign}${Math.abs(coefficient).toFixed(2)} × R${pivotInfo.row + 1}`
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-200">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
            {/* Variable columns (x1, x2, etc.) */}
            {Array.from({ length: variables }).map((_, i) => (
              <th
                key={`x${i}`}
                className={`px-4 py-2 text-center text-xs font-medium uppercase tracking-wider ${
                  pivotInfo && pivotInfo.col === i ? "bg-orange-200 text-orange-800" : "text-gray-500"
                }`}
              >
                x<sub>{i + 1}</sub>
              </th>
            ))}

            {/* Slack variable columns (s1, s2, etc.) */}
            {Array.from({ length: constraints }).map((_, i) => (
              <th
                key={`s${i}`}
                className={`px-4 py-2 text-center text-xs font-medium uppercase tracking-wider ${
                  pivotInfo && pivotInfo.col === variables + i ? "bg-orange-200 text-orange-800" : "text-gray-500"
                }`}
              >
                s<sub>{i + 1}</sub>
              </th>
            ))}

            {/* Z column */}
            <th
              className={`px-4 py-2 text-center text-xs font-medium uppercase tracking-wider ${
                pivotInfo && pivotInfo.col === variables + constraints
                  ? "bg-orange-200 text-orange-800"
                  : "text-gray-500"
              }`}
            >
              Z
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
                  ? "bg-orange-100"
                  : rowIndex % 2 === 0
                    ? "bg-white"
                    : "bg-gray-50"
              }`}
            >
              <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                {basicVariables[rowIndex]}
              </td>
              {/* Display variable columns */}
              {row.slice(0, variables).map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={`px-4 py-2 whitespace-nowrap text-sm text-center ${
                    pivotInfo && pivotInfo.row === rowIndex && pivotInfo.col === cellIndex
                      ? "bg-orange-300 font-bold"
                      : pivotInfo && pivotInfo.col === cellIndex
                        ? "bg-orange-100"
                        : "text-gray-500"
                  }`}
                >
                  {cell.toFixed(2)}
                </td>
              ))}

              {/* Display slack variable columns */}
              {row.slice(variables, variables + constraints).map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={`px-4 py-2 whitespace-nowrap text-sm text-center ${
                    pivotInfo && pivotInfo.row === rowIndex && pivotInfo.col === variables + cellIndex
                      ? "bg-orange-300 font-bold"
                      : pivotInfo && pivotInfo.col === variables + cellIndex
                        ? "bg-orange-100"
                        : "text-gray-500"
                  }`}
                >
                  {cell.toFixed(2)}
                </td>
              ))}

              {/* Display Z column */}
              <td
                className={`px-4 py-2 whitespace-nowrap text-sm text-center ${
                  pivotInfo && pivotInfo.row === rowIndex && pivotInfo.col === variables + constraints
                    ? "bg-orange-300 font-bold"
                    : pivotInfo && pivotInfo.col === variables + constraints
                      ? "bg-orange-100"
                      : "text-gray-500"
                }`}
              >
                {row[variables + constraints].toFixed(2)}
              </td>

              {/* Display RHS column */}
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

          {/* Objective function row (Z row) */}
          <tr className={`bg-blue-50 ${pivotInfo && pivotInfo.row === data.length - 1 ? "bg-orange-100" : ""}`}>
            <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-blue-800">
              {basicVariables[basicVariables.length - 1]}
            </td>

            {/* Display variable columns */}
            {data[data.length - 1].slice(0, variables).map((cell, cellIndex) => (
              <td
                key={cellIndex}
                className={`px-4 py-2 whitespace-nowrap text-sm text-center font-medium ${
                  pivotInfo && pivotInfo.row === data.length - 1 && pivotInfo.col === cellIndex
                    ? "bg-orange-300"
                    : pivotInfo && pivotInfo.col === cellIndex
                      ? "bg-orange-100"
                      : "text-blue-700"
                }`}
              >
                {cell.toFixed(2)}
              </td>
            ))}

            {/* Display slack variable columns */}
            {data[data.length - 1].slice(variables, variables + constraints).map((cell, cellIndex) => (
              <td
                key={cellIndex}
                className={`px-4 py-2 whitespace-nowrap text-sm text-center font-medium ${
                  pivotInfo && pivotInfo.row === data.length - 1 && pivotInfo.col === variables + cellIndex
                    ? "bg-orange-300"
                    : pivotInfo && pivotInfo.col === variables + cellIndex
                      ? "bg-orange-100"
                      : "text-blue-700"
                }`}
              >
                {cell.toFixed(2)}
              </td>
            ))}

            {/* Display Z column */}
            <td
              className={`px-4 py-2 whitespace-nowrap text-sm text-center font-medium ${
                pivotInfo && pivotInfo.row === data.length - 1 && pivotInfo.col === variables + constraints
                  ? "bg-orange-300"
                  : pivotInfo && pivotInfo.col === variables + constraints
                    ? "bg-orange-100"
                    : "text-blue-700"
              }`}
            >
              {data[data.length - 1][variables + constraints].toFixed(2)}
            </td>

            {/* Display RHS column */}
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
  )
}
