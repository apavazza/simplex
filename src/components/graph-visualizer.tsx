"use client"

import { useEffect, useRef } from "react"

interface SimplexVariable {
    name: string;
    value: number;
}

interface SimplexSolution {
    optimalValue: number;
    variables: SimplexVariable[];
}

interface GraphVisualizerProps {
  constraints: {
    coefficients: number[]
    operator: "<=" | ">=" | "="
    rhs: number
  }[]
  solution: SimplexSolution | null
  problemType: "max" | "min"
  objectiveCoefficients: number[]
}

export function GraphVisualizer({ constraints, solution, problemType, objectiveCoefficients }: GraphVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Set up coordinate system
    const padding = 40
    const width = canvas.width - 2 * padding
    const height = canvas.height - 2 * padding

    // Find reasonable bounds for the graph
    let maxX = 10
    let maxY = 10

    // Adjust bounds based on constraints
    constraints.forEach((constraint) => {
      if (constraint.coefficients[0] !== 0 && constraint.coefficients[1] === 0) {
        // x-intercept
        const x = constraint.rhs / constraint.coefficients[0]
        if (x > 0 && x * 1.2 > maxX) maxX = x * 1.2
      }

      if (constraint.coefficients[1] !== 0 && constraint.coefficients[0] === 0) {
        // y-intercept
        const y = constraint.rhs / constraint.coefficients[1]
        if (y > 0 && y * 1.2 > maxY) maxY = y * 1.2
      }

      if (constraint.coefficients[0] !== 0 && constraint.coefficients[1] !== 0) {
        // Both intercepts
        const x = constraint.rhs / constraint.coefficients[0]
        const y = constraint.rhs / constraint.coefficients[1]
        if (x > 0 && x * 1.2 > maxX) maxX = x * 1.2
        if (y > 0 && y * 1.2 > maxY) maxY = y * 1.2
      }
    })

    // If we have a solution, adjust bounds to include it
    if (solution && solution.variables && solution.variables.length >= 2) {
      // Prefer x1, x2 if present, else s1, s2, else first two variables
      let x = 0, y = 0;
      const x1 = solution.variables.find(v => v.name === 'x1');
      const x2 = solution.variables.find(v => v.name === 'x2');
      if (x1 && x2) {
        x = x1.value;
        y = x2.value;
      } else {
        const s1 = solution.variables.find(v => v.name === 's1');
        const s2 = solution.variables.find(v => v.name === 's2');
        if (s1 && s2) {
          x = s1.value;
          y = s2.value;
        } else {
          x = solution.variables[0].value;
          y = solution.variables[1].value;
        }
      }
      if (x * 1.2 > maxX) maxX = x * 1.2
      if (y * 1.2 > maxY) maxY = y * 1.2
    }

    // Ensure minimum bounds
    maxX = Math.max(maxX, 10)
    maxY = Math.max(maxY, 10)

    // Scale factors
    const scaleX = width / maxX
    const scaleY = height / maxY

    // Transform coordinates
    const transformX = (x: number) => padding + x * scaleX
    const transformY = (y: number) => canvas.height - padding - y * scaleY

    // Draw axes
    ctx.beginPath()
    ctx.strokeStyle = "#000"
    ctx.lineWidth = 1

    // X-axis
    ctx.moveTo(padding, canvas.height - padding)
    ctx.lineTo(canvas.width - padding, canvas.height - padding)

    // Y-axis
    ctx.moveTo(padding, canvas.height - padding)
    ctx.lineTo(padding, padding)

    ctx.stroke()

    // Draw axis labels
    ctx.fillStyle = "#000"
    ctx.font = "12px Arial"

    // X-axis labels
    for (let i = 0; i <= maxX; i += Math.ceil(maxX / 10)) {
      const x = transformX(i)
      ctx.fillText(i.toString(), x, canvas.height - padding + 15)

      // Tick mark
      ctx.beginPath()
      ctx.moveTo(x, canvas.height - padding - 3)
      ctx.lineTo(x, canvas.height - padding + 3)
      ctx.stroke()
    }

    // Y-axis labels
    for (let i = 0; i <= maxY; i += Math.ceil(maxY / 10)) {
      const y = transformY(i)
      ctx.fillText(i.toString(), padding - 25, y + 4)

      // Tick mark
      ctx.beginPath()
      ctx.moveTo(padding - 3, y)
      ctx.lineTo(padding + 3, y)
      ctx.stroke()
    }

    // Label axes
    ctx.fillText("x₁", canvas.width - padding + 10, canvas.height - padding + 4)
    ctx.fillText("x₂", padding - 4, padding - 10)

    // Draw feasible region (light blue)
    {
      // Gather candidate points consisting of rectangle corners and intersections of constraints
      const candidatePoints: { x: number; y: number }[] = [];
      // Add rectangle corners based on bounds
      candidatePoints.push({ x: 0, y: 0 });
      candidatePoints.push({ x: maxX, y: 0 });
      candidatePoints.push({ x: maxX, y: maxY });
      candidatePoints.push({ x: 0, y: maxY });

      // Add intersections between every pair of constraints
      for (let i = 0; i < constraints.length; i++) {
        const { coefficients: coeff1, rhs: c1 } = constraints[i];
        const a1 = coeff1[0], b1 = coeff1[1];
        for (let j = i + 1; j < constraints.length; j++) {
          const { coefficients: coeff2, rhs: c2 } = constraints[j];
          const a2 = coeff2[0], b2 = coeff2[1];
          const det = a1 * b2 - a2 * b1;
          if (Math.abs(det) > 1e-6) {
            const x = (c1 * b2 - c2 * b1) / det;
            const y = (a1 * c2 - a2 * c1) / det;
            candidatePoints.push({ x, y });
          }
        }
      }

      // Add intersections of each constraint with the axes
      constraints.forEach((constraint) => {
        const a = constraint.coefficients[0],
          b = constraint.coefficients[1],
          c = constraint.rhs;
        if (Math.abs(b) > 1e-6) {
          // Intersection with y-axis (x=0)
          candidatePoints.push({ x: 0, y: c / b });
        }
        if (Math.abs(a) > 1e-6) {
          // Intersection with x-axis (y=0)
          candidatePoints.push({ x: c / a, y: 0 });
        }
      });

      // Function to check if a point satisfies all constraints (assumed ≤)
      const satisfiesAll = (pt: { x: number; y: number }) => {
        if (pt.x < -1e-6 || pt.y < -1e-6) return false;
        return constraints.every((constraint) => {
          const a = constraint.coefficients[0],
            b = constraint.coefficients[1],
            c = constraint.rhs;
          return a * pt.x + b * pt.y <= c + 1e-6;
        });
      };

      // Filter candidate points that lie in the feasible region
      let feasiblePoints = candidatePoints.filter(satisfiesAll);

      // Remove duplicate points
      feasiblePoints = feasiblePoints.filter(
        (p, i, self) =>
          i === self.findIndex((q) => Math.abs(q.x - p.x) < 1e-6 && Math.abs(q.y - p.y) < 1e-6)
      );

      // If we have a feasible region, sort the points in clockwise order and fill the polygon
      if (feasiblePoints.length) {
        // Compute centroid
        const centroid = feasiblePoints.reduce(
          (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
          { x: 0, y: 0 }
        );
        centroid.x /= feasiblePoints.length;
        centroid.y /= feasiblePoints.length;
        // Sort points by angle from the centroid
        feasiblePoints.sort((p, q) => {
          const angleP = Math.atan2(p.y - centroid.y, p.x - centroid.x);
          const angleQ = Math.atan2(q.y - centroid.y, q.x - centroid.x);
          return angleP - angleQ;
        });

        // Draw the polygon
        ctx.beginPath();
        ctx.fillStyle = "rgba(173,216,230,0.3)"; // light blue
        ctx.moveTo(transformX(feasiblePoints[0].x), transformY(feasiblePoints[0].y));
        for (let i = 1; i < feasiblePoints.length; i++) {
          ctx.lineTo(transformX(feasiblePoints[i].x), transformY(feasiblePoints[i].y));
        }
        ctx.closePath();
        ctx.fill();
      }
    }

    // Draw constraints
    constraints.forEach((constraint, index) => {
      const a = constraint.coefficients[0]
      const b = constraint.coefficients[1]
      const c = constraint.rhs

      if (a === 0 && b === 0) return

      // Draw the constraint line
      ctx.beginPath()
      ctx.strokeStyle = `hsl(${index * 30}, 70%, 50%)`
      ctx.lineWidth = 2

      if (a === 0) {
        // Horizontal line: y = c/b
        const y = c / b
        if (y >= 0) {
          ctx.moveTo(transformX(0), transformY(y))
          ctx.lineTo(transformX(maxX), transformY(y))
        }
      } else if (b === 0) {
        // Vertical line: x = c/a
        const x = c / a
        if (x >= 0) {
          ctx.moveTo(transformX(x), transformY(0))
          ctx.lineTo(transformX(x), transformY(maxY))
        }
      } else {
        // General line: y = (c - a*x) / b
        type Point = { x: number; y: number }
        let pts: Point[] = [];

        // Intersection with y-axis (x = 0)
        if (b !== 0) {
          const y0 = c / b;
          if (y0 >= 0 && y0 <= maxY) pts.push({ x: 0, y: y0 });
        }

        // Intersection with x-axis (y = 0)
        if (a !== 0) {
          const x0 = c / a;
          if (x0 >= 0 && x0 <= maxX) pts.push({ x: x0, y: 0 });
        }

        // Intersection with vertical boundary: x = maxX
        if (b !== 0) {
          const yAtMaxX = (c - a * maxX) / b;
          if (yAtMaxX >= 0 && yAtMaxX <= maxY) pts.push({ x: maxX, y: yAtMaxX });
        }

        // Intersection with horizontal boundary: y = maxY
        if (a !== 0) {
          const xAtMaxY = (c - b * maxY) / a;
          if (xAtMaxY >= 0 && xAtMaxY <= maxX) pts.push({ x: xAtMaxY, y: maxY });
        }

        // Remove duplicate points
        pts = pts.filter(
          (p, i, self) =>
            i === self.findIndex((t) => Math.abs(t.x - p.x) < 0.001 && Math.abs(t.y - p.y) < 0.001)
        );

        if (pts.length >= 2) {
          // Choose the two points that are furthest apart
          let maxDist = 0;
          let p1: Point = pts[0],
            p2: Point = pts[1];
          for (let i = 0; i < pts.length; i++) {
            for (let j = i + 1; j < pts.length; j++) {
              const dx = pts[i].x - pts[j].x;
              const dy = pts[i].y - pts[j].y;
              const dist = dx * dx + dy * dy;
              if (dist > maxDist) {
                maxDist = dist;
                p1 = pts[i];
                p2 = pts[j];
              }
            }
          }

          ctx.moveTo(transformX(p1.x), transformY(p1.y));
          ctx.lineTo(transformX(p2.x), transformY(p2.y));

          // Label the line at the midpoint of the drawn segment
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;
          ctx.fillStyle = `hsl(${index * 30}, 70%, 50%)`;
          ctx.fillText(`Constraint ${index + 1}`, transformX(midX) + 5, transformY(midY) - 5);
        }
      }

      ctx.stroke()
    })

    // Draw optimal solution point if available
    if (solution && solution.variables && solution.variables.length >= 2) {
      // Prefer x1, x2 if present, else s1, s2, else first two variables
      let x = 0, y = 0;
      const x1 = solution.variables.find(v => v.name === 'x1');
      const x2 = solution.variables.find(v => v.name === 'x2');
      if (x1 && x2) {
        x = x1.value;
        y = x2.value;
      } else {
        const s1 = solution.variables.find(v => v.name === 's1');
        const s2 = solution.variables.find(v => v.name === 's2');
        if (s1 && s2) {
          x = s1.value;
          y = s2.value;
        } else {
          x = solution.variables[0].value;
          y = solution.variables[1].value;
        }
      }
      ctx.beginPath()
      ctx.arc(transformX(x), transformY(y), 6, 0, 2 * Math.PI)
      ctx.fillStyle = "#ff0000"
      ctx.fill()

      ctx.fillStyle = "#000"
      ctx.fillText(`Optimal (${x.toFixed(2)}, ${y.toFixed(2)})`, transformX(x) + 10, transformY(y))
    }
  }, [constraints, solution, problemType, objectiveCoefficients])

  return (
    <div className="w-full">
      {!solution ? (
        <div className="text-center py-8 text-gray-500">
          Enter a problem and click &quot;Solve&quot; to see the graphical solution
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-gray-600">
            <p>The graph shows:</p>
            <ul className="list-disc pl-5 mt-1">
              <li>Constraint lines (colored)</li>
              <li>Feasible region (light blue)</li>
              <li>Optimal solution point (red dot)</li>
            </ul>
          </div>
          <canvas ref={canvasRef} className="w-full border border-gray-300 rounded-md" style={{ height: "400px" }} />
        </>
      )}
    </div>
  )
}
