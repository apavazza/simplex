"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { CSS2DRenderer, CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js"

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

const CANVAS_HEIGHT = 560
const AXIS_LENGTH = 12
const AXIS_LABEL_OFFSET = 0.7
const PLANE_COLORS = [
  "#fbbf24",
  "#60a5fa",
  "#34d399",
  "#f472b6",
  "#a78bfa",
  "#f87171",
  "#38bdf8",
  "#facc15",
]

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas")
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    )
  } catch {
    return false
  }
}

function intersectPlanes(
  a: number[],
  b: number[],
  c: number[],
  d1: number,
  d2: number,
  d3: number,
): [number, number, number] | null {
  const A = new THREE.Matrix3()
  A.set(
    a[0], a[1], a[2],
    b[0], b[1], b[2],
    c[0], c[1], c[2],
  )
  const det = A.determinant()
  if (Math.abs(det) < 1e-8) return null

  const Dx = new THREE.Matrix3()
  Dx.set(
    d1, a[1], a[2],
    d2, b[1], b[2],
    d3, c[1], c[2],
  )
  const Dy = new THREE.Matrix3()
  Dy.set(
    a[0], d1, a[2],
    b[0], d2, b[2],
    c[0], d3, c[2],
  )
  const Dz = new THREE.Matrix3()
  Dz.set(
    a[0], a[1], d1,
    b[0], b[1], d2,
    c[0], c[1], d3,
  )
  const x = Dx.determinant() / det
  const y = Dy.determinant() / det
  const z = Dz.determinant() / det
  return [x, y, z]
}

function satisfiesAll(
  pt: [number, number, number],
  constraints: { coefficients: number[]; operator: string; rhs: number }[],
) {
  if (pt[0] < -1e-6 || pt[1] < -1e-6 || pt[2] < -1e-6) return false
  return constraints.every((c) => {
    const val =
      c.coefficients[0] * pt[0] +
      c.coefficients[1] * pt[1] +
      c.coefficients[2] * pt[2]
    if (c.operator === "<=") return val <= c.rhs + 1e-6
    if (c.operator === ">=") return val >= c.rhs - 1e-6
    return Math.abs(val - c.rhs) < 1e-6
  })
}

function getPlaneQuaternion(normal: THREE.Vector3): THREE.Quaternion {
  const zAxis = new THREE.Vector3(0, 0, 1)
  const n = normal.clone().normalize()
  if (n.equals(zAxis)) return new THREE.Quaternion()
  const axis = new THREE.Vector3().crossVectors(zAxis, n).normalize()
  const angle = Math.acos(THREE.MathUtils.clamp(zAxis.dot(n), -1, 1))
  return new THREE.Quaternion().setFromAxisAngle(axis, angle)
}

function computeFeasibleVertices(constraints: GraphVisualizer3DProps["constraints"]) {
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
          if (!vertices.some((v) => v.every((val, idx) => Math.abs(val - pt[idx]) < 1e-4))) {
            vertices.push(pt)
          }
        }
      }
    }
  }
  return vertices
}

function createTextLabel(
  text: string,
  color: string,
  fontSize = 14,
  fontWeight = 600,
  background?: string,
) {
  const element = document.createElement("div")
  element.textContent = text
  element.style.color = color
  element.style.fontSize = `${fontSize}px`
  element.style.fontWeight = `${fontWeight}`
  element.style.whiteSpace = "nowrap"
  element.style.pointerEvents = "none"
  element.style.textShadow = "0 1px 2px #fff9"
  if (background && background !== "transparent") {
    element.style.background = background
    element.style.borderRadius = "4px"
    element.style.padding = "2px 6px"
    element.style.boxShadow = "0 1px 4px #0001"
  }
  return new CSS2DObject(element)
}

export function GraphVisualizer3D({ constraints, solution }: GraphVisualizer3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  if (!isWebGLAvailable()) {
    return (
      <div className="p-8 text-center text-gray-500">
        3D Graph is not available because WebGL is disabled in your browser.
      </div>
    )
  }

  useEffect(() => {
    if (!canvasRef.current || !wrapperRef.current) return

    const canvas = canvasRef.current
    const wrapper = wrapperRef.current
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(window.devicePixelRatio ?? 1)
    renderer.setSize(wrapper.clientWidth, wrapper.clientHeight)
    renderer.setClearColor(0xf8fafc, 1)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      50,
      wrapper.clientWidth / wrapper.clientHeight,
      0.1,
      500,
    )
    camera.position.set(18, 18, 18)

    const controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.enablePan = true
    controls.enableZoom = true
    controls.enableRotate = true

    const labelRenderer = new CSS2DRenderer()
    labelRenderer.setSize(wrapper.clientWidth, wrapper.clientHeight)
    labelRenderer.domElement.style.position = "absolute"
    labelRenderer.domElement.style.inset = "0"
    labelRenderer.domElement.style.pointerEvents = "none"
    wrapper.appendChild(labelRenderer.domElement)

    const cleanupObjects: THREE.Object3D[] = []
    const disposableGeometries: THREE.BufferGeometry[] = []
    const disposableMaterials: THREE.Material[] = []
    const labelObjects: CSS2DObject[] = []

    const trackMesh = (object: THREE.Object3D) => {
      cleanupObjects.push(object)
      scene.add(object)
    }

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
    trackMesh(ambientLight)
    const pointLight = new THREE.PointLight(0xffffff, 0.7)
    pointLight.position.set(20, 20, 20)
    trackMesh(pointLight)

    const axisLines: Array<{ start: [number, number, number]; end: [number, number, number]; color: number }>
      = [
        { start: [0, 0, 0], end: [AXIS_LENGTH, 0, 0], color: 0xff0000 },
        { start: [0, 0, 0], end: [0, AXIS_LENGTH, 0], color: 0x00aa00 },
        { start: [0, 0, 0], end: [0, 0, AXIS_LENGTH], color: 0x0000ff },
      ]

    axisLines.forEach(({ start, end, color }) => {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...start),
        new THREE.Vector3(...end),
      ])
      const material = new THREE.LineBasicMaterial({ color, linewidth: 2 })
      disposableGeometries.push(geometry)
      disposableMaterials.push(material)
      const line = new THREE.Line(geometry, material)
      trackMesh(line)
    })

    const axisLabels = [
      { text: "x₁", color: "red", position: new THREE.Vector3(AXIS_LENGTH + AXIS_LABEL_OFFSET, 0, 0) },
      { text: "x₂", color: "green", position: new THREE.Vector3(0, AXIS_LENGTH + AXIS_LABEL_OFFSET, 0) },
      { text: "x₃", color: "blue", position: new THREE.Vector3(0, 0, AXIS_LENGTH + AXIS_LABEL_OFFSET) },
      { text: "0", color: "#222", position: new THREE.Vector3(-0.7, -0.7, -0.7), fontSize: 13 },
    ]
    axisLabels.forEach(({ text, color, position, fontSize }) => {
      const label = createTextLabel(text, color, fontSize ?? 16)
      label.position.copy(position)
      labelObjects.push(label)
      cleanupObjects.push(label)
      scene.add(label)
    })

    constraints.forEach((constraint, idx) => {
      const normal = new THREE.Vector3(...constraint.coefficients)
      const norm = normal.length()
      if (norm < 1e-8) return

      const positionOnPlane = normal.clone().normalize().multiplyScalar(constraint.rhs / norm)
      const planeGeometry = new THREE.PlaneGeometry(AXIS_LENGTH * 2, AXIS_LENGTH * 2)
      const planeMaterial = new THREE.MeshStandardMaterial({
        color: PLANE_COLORS[idx % PLANE_COLORS.length],
        opacity: 0.22,
        transparent: true,
        side: THREE.DoubleSide,
      })

      disposableGeometries.push(planeGeometry)
      disposableMaterials.push(planeMaterial)

      const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial)
      planeMesh.position.copy(positionOnPlane)
      planeMesh.quaternion.copy(getPlaneQuaternion(normal))
      trackMesh(planeMesh)

      const constraintLabel = createTextLabel(`Constraint ${idx + 1}`, "#222", 13, 500, "#fff9")
      constraintLabel.position.set(-AXIS_LENGTH / 2, AXIS_LENGTH / 2, 0)
      planeMesh.add(constraintLabel)
      labelObjects.push(constraintLabel)
    })

    const vertices = computeFeasibleVertices(constraints)
    const vertexGeometry = new THREE.SphereGeometry(0.12, 16, 16)
    const vertexMaterial = new THREE.MeshStandardMaterial({ color: 0x1e90ff })
    disposableGeometries.push(vertexGeometry)
    disposableMaterials.push(vertexMaterial)

    vertices.forEach((vertex) => {
      const mesh = new THREE.Mesh(vertexGeometry, vertexMaterial)
      mesh.position.set(vertex[0], vertex[1], vertex[2])
      const label = createTextLabel(
        `(${vertex.map((val) => val.toFixed(2)).join(", ")})`,
        "#1e90ff",
        11,
        500,
      )
      label.position.set(0, 0.5, 0)
      mesh.add(label)
      labelObjects.push(label)
      trackMesh(mesh)
    })

    const optimalPosition: [number, number, number] = [0, 0, 0]
    if (solution?.variables?.length) {
      const findValue = (names: string[]) =>
        solution.variables.find((variable) => names.includes(variable.name))?.value ?? 0
      optimalPosition[0] = findValue(["x1", "s1"])
      optimalPosition[1] = findValue(["x2", "s2"])
      optimalPosition[2] = findValue(["x3", "s3"])
    }

    const optimalGeometry = new THREE.SphereGeometry(0.18, 24, 24)
    const optimalMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 })
    disposableGeometries.push(optimalGeometry)
    disposableMaterials.push(optimalMaterial)
    const optimalMesh = new THREE.Mesh(optimalGeometry, optimalMaterial)
    optimalMesh.position.set(...optimalPosition)
    const optimalLabel = createTextLabel(
      `Opt (${optimalPosition.map((val) => val.toFixed(2)).join(", ")})`,
      "#ff0000",
      13,
    )
    optimalLabel.position.set(0, 0.75, 0)
    optimalMesh.add(optimalLabel)
    labelObjects.push(optimalLabel)
    trackMesh(optimalMesh)

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target !== wrapper) continue
        const { width, height } = entry.contentRect
        renderer.setSize(width, height)
        labelRenderer.setSize(width, height)
        camera.aspect = width / height
        camera.updateProjectionMatrix()
      }
    })
    resizeObserver.observe(wrapper)

    let animationFrameId: number
    const renderLoop = () => {
      animationFrameId = requestAnimationFrame(renderLoop)
      controls.update()
      renderer.render(scene, camera)
      labelRenderer.render(scene, camera)
    }
    renderLoop()

    return () => {
      cancelAnimationFrame(animationFrameId)
      resizeObserver.disconnect()
      controls.dispose()
      renderer.dispose()
      labelRenderer.domElement.remove()
      cleanupObjects.forEach((object) => {
        scene.remove(object)
        object.traverse?.(() => null)
      })
      disposableGeometries.forEach((geometry) => geometry.dispose())
      disposableMaterials.forEach((material) => material.dispose())
      labelObjects.forEach((label) => label.element.remove())
    }
  }, [constraints, solution])

  return (
    <div style={{ width: "100%" }}>
      <div
        ref={wrapperRef}
        style={{
          width: "100%",
          height: CANVAS_HEIGHT,
          position: "relative",
          background: "#f8fafc",
          borderRadius: 12,
          boxShadow: "0 2px 8px #0001",
          overflow: "hidden",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
          }}
        />
      </div>
      <div
        className="text-xs text-gray-600 mt-2"
        style={{
          background: "#fff",
          borderRadius: 8,
          padding: "10px 16px",
          marginTop: 12,
          maxWidth: 340,
          boxShadow: "0 2px 8px #0001",
          textAlign: "left",
        }}
      >
        <div>
          <span style={{ color: "red" }}>x₁</span>, <span style={{ color: "green" }}>x₂</span>, and
          {" "}
          <span style={{ color: "blue" }}>x₃</span> mark the axes
        </div>
        <div>
          <span style={{ color: "#1e90ff" }}>Blue spheres</span>: feasible vertices
        </div>
        <div>
          <span style={{ color: "#ff0000" }}>Red sphere</span>: optimal solution
        </div>
        <div>
          <span style={{ color: "#888" }}>Colored planes</span>: constraints
        </div>
      </div>
    </div>
  )
}
