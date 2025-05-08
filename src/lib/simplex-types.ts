export type Variable = {
  name: string
  value: number
}

export type Solution = {
  optimalValue: number
  variables: Variable[]
  feasible: boolean
}

export type PivotInfo = {
  row: number
  col: number
  entering: string
  leaving: string
}

export type Step = {
  table: number[][]
  pivotInfo?: PivotInfo
}