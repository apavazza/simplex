"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls, Plane, Sphere, Line, Html } from "@react-three/drei"
import * as THREE from "three"

interface SimplexVariable {
  name: string
  value: number
}

interface SimplexSolution {
  optimalValue: number
  variables: SimplexVariable[]
}

interface GraphVisualizer3DProps {
  constraints: {
    coefficients: number[]
    operator: "<=" | ">=" | "="
    rhs: number
  }[]
  solution: SimplexSolution | null
  problemType: "max" | "min"
  objectiveCoefficients: number[]
}

// Helper: get intersection of 3 planes (if any)
function intersectPlanes(
  a: number[], b: number[], c: number[],
  d1: number, d2: number, d3: number
): [number, number, number] | null {
  const A = new THREE.Matrix3()
  A.set(
    a[0], a[1], a[2],
    b[0], b[1], b[2],
    c[0], c[1], c[2]
  )
  const det = A.determinant()
  if (Math.abs(det) < 1e-8) return null
  // Cramer's rule
  const Dx = new THREE.Matrix3()
  Dx.set(
    d1, a[1], a[2],
    d2, b[1], b[2],
    d3, c[1], c[2]
  )
  const Dy = new THREE.Matrix3()
  Dy.set(
    a[0], d1, a[2],
    b[0], d2, b[2],
    c[0], d3, c[2]
  )
  const Dz = new THREE.Matrix3()
  Dz.set(
    a[0], a[1], d1,
    b[0], b[1], d2,
    c[0], c[1], d3
  )
  const x = Dx.determinant() / det
  const y = Dy.determinant() / det
  const z = Dz.determinant() / det
  return [x, y, z]
}

// Check if a point satisfies all constraints (assume <= for feasible region)
function satisfiesAll(
  pt: [number, number, number],
  constraints: { coefficients: number[]; operator: string; rhs: number }[]
) {
  if (pt[0] < -1e-6 || pt[1] < -1e-6 || pt[2] < -1e-6) return false
  return constraints.every((c) => {
    const val = c.coefficients[0] * pt[0] + c.coefficients[1] * pt[1] + c.coefficients[2] * pt[2]
    if (c.operator === "<=") return val <= c.rhs + 1e-6
    if (c.operator === ">=") return val >= c.rhs - 1e-6
    return Math.abs(val - c.rhs) < 1e-6
  })
}

// Helper: get a rotation quaternion to align the z-axis to a normal vector
function getPlaneQuaternion(normal: THREE.Vector3): THREE.Quaternion {
  const zAxis = new THREE.Vector3(0, 0, 1)
  const n = normal.clone().normalize()
  if (n.equals(zAxis)) return new THREE.Quaternion()
  const axis = new THREE.Vector3().crossVectors(zAxis, n).normalize()
  const angle = Math.acos(zAxis.dot(n))
  return new THREE.Quaternion().setFromAxisAngle(axis, angle)
}

export function GraphVisualizer3D({ constraints, solution }: GraphVisualizer3DProps) {
  // Compute feasible region vertices (intersection of all triplets of planes)
  const vertices: [number, number, number][] = []
  for (let i = 0; i < constraints.length; i++) {
    for (let j = i + 1; j < constraints.length; j++) {
      for (let k = j + 1; k < constraints.length; k++) {
        const a = constraints[i].coefficients
        const b = constraints[j].coefficients
        const c = constraints[k].coefficients
        const d1 = constraints[i].rhs
        const d2 = constraints[j].rhs
        const d3 = constraints[k].rhs
        const pt = intersectPlanes(a, b, c, d1, d2, d3)
        if (pt && satisfiesAll(pt, constraints)) {
          // Avoid duplicates
          if (!vertices.some(v => v.every((val, idx) => Math.abs(val - pt[idx]) < 1e-4))) {
            vertices.push(pt)
          }
        }
      }
    }
  }

  // Find optimal point
  let x = 0, y = 0, z = 0
  if (solution && solution.variables.length >= 3) {
    const xVar = solution.variables.find(v => v.name === "x1" || v.name === "s1")
    const yVar = solution.variables.find(v => v.name === "x2" || v.name === "s2")
    const zVar = solution.variables.find(v => v.name === "x3" || v.name === "s3")
    x = xVar ? xVar.value : 0
    y = yVar ? yVar.value : 0
    z = zVar ? zVar.value : 0
  }

  // Make the graph section taller
  const canvasHeight = 560
  const axisLength = 12 // extend axes and planes

  // Axis label positions
  const axisLabelOffset = 0.7

  // Plane colors (distinct, pastel)
  const planeColors = [
    "#fbbf24", // amber-400
    "#60a5fa", // blue-400
    "#34d399", // green-400
    "#f472b6", // pink-400
    "#a78bfa", // purple-400
    "#f87171", // red-400
    "#38bdf8", // sky-400
    "#facc15", // yellow-400
  ]

  return (
    <div style={{ width: "100%", height: canvasHeight, position: "relative", background: "#f8fafc", borderRadius: 12, boxShadow: "0 2px 8px #0001" }}>
      <Canvas camera={{ position: [18, 18, 18], fov: 50 }}>
        <ambientLight intensity={0.7} />
        <pointLight position={[20, 20, 20]} intensity={0.7} />
        <OrbitControls enablePan enableZoom enableRotate />

        {/* Axes */}
        <Line points={[[0,0,0],[axisLength,0,0]]} color="red" lineWidth={2} />
        <Line points={[[0,0,0],[0,axisLength,0]]} color="green" lineWidth={2} />
        <Line points={[[0,0,0],[0,0,axisLength]]} color="blue" lineWidth={2} />

        {/* Axis labels */}
        <Html position={[axisLength + axisLabelOffset, 0, 0]} center style={{ pointerEvents: "none" }}>
          <span style={{ color: "red", fontWeight: 600, fontSize: 16 }}>x₁</span>
        </Html>
        <Html position={[0, axisLength + axisLabelOffset, 0]} center style={{ pointerEvents: "none" }}>
          <span style={{ color: "green", fontWeight: 600, fontSize: 16 }}>x₂</span>
        </Html>
        <Html position={[0, 0, axisLength + axisLabelOffset]} center style={{ pointerEvents: "none" }}>
          <span style={{ color: "blue", fontWeight: 600, fontSize: 16 }}>x₃</span>
        </Html>
        <Html position={[-0.7, -0.7, -0.7]} center style={{ pointerEvents: "none" }}>
          <span style={{ color: "#222", fontWeight: 600, fontSize: 13 }}>0</span>
        </Html>

        {/* Constraint planes */}
        {constraints.map((c, idx) => {
          const normal = new THREE.Vector3(...c.coefficients)
          const norm = normal.length()
          if (norm < 1e-8) return null
          // Plane equation: n.x = d => position = n.normalized() * (rhs / |n|)
          const pos = normal.clone().normalize().multiplyScalar(c.rhs / norm)
          const quat = getPlaneQuaternion(normal)
          return (
            <Plane
              key={idx}
              args={[axisLength * 2, axisLength * 2]} // make plane larger to cover optimal solution
              position={pos.toArray()}
              quaternion={quat}
              material-color={planeColors[idx % planeColors.length]}
              material-opacity={0.22}
              material-transparent
              receiveShadow
              material-side={THREE.DoubleSide}
            >
              <Html position={[0, 0, 0]} center style={{ pointerEvents: "none", whiteSpace: "nowrap" }}>
                <span style={{
                  color: "#222",
                  background: "#fff9",
                  borderRadius: 4,
                  padding: "2px 8px",
                  fontSize: 13,
                  fontWeight: 500,
                  boxShadow: "0 1px 4px #0001",
                  whiteSpace: "nowrap"
                }}>
                  Constraint {idx + 1}
                </span>
              </Html>
            </Plane>
          )
        })}

        {/* Feasible region vertices */}
        {vertices.map((v, i) => (
          <Sphere key={i} args={[0.12, 16, 16]} position={v}>
            <meshStandardMaterial color="#1e90ff" />
            <Html position={[0,0.25,0]} center style={{ pointerEvents: "none" }}>
              <span style={{ color: "#1e90ff", fontWeight: 500, fontSize: 11 }}>
                ({v.map(val => val.toFixed(2)).join(", ")})
              </span>
            </Html>
          </Sphere>
        ))}

        {/* Optimal solution */}
        <Sphere args={[0.18, 24, 24]} position={[x, y, z]}>
          <meshStandardMaterial color="#ff0000" />
          <Html position={[0,0.32,0]} center style={{ pointerEvents: "none" }}>
            <span style={{ color: "#ff0000", fontWeight: 600, fontSize: 13 }}>
              Opt ({x.toFixed(2)}, {y.toFixed(2)}, {z.toFixed(2)})
            </span>
          </Html>
        </Sphere>
      </Canvas>
      <div
        className="text-xs text-gray-600 mt-2"
        style={{
          background: "#fff",
          borderRadius: 8,
          padding: "10px 16px",
          margin: "12px 0 0 0",
          maxWidth: 340,
          boxShadow: "0 2px 8px #0001",
          textAlign: "left",
          position: "absolute",
          left: 16,
          bottom: 16,
          transform: "none"
        }}
      >
        <div>
          <span style={{ color: "red" }}>x₁</span>,{" "}
          <span style={{ color: "green" }}>x₂</span>,{" "}
          <span style={{ color: "blue" }}>x₃</span> — axes
        </div>
        <div>
          <span style={{ color: "#1e90ff" }}>Blue dots</span>: feasible region vertices<br />
          <span style={{ color: "#ff0000" }}>Red dot</span>: optimal solution<br />
          <span style={{ color: "#888" }}>Colored planes</span>: constraints
        </div>
      </div>
    </div>
  )
}
