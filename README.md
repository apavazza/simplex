# Simplex Method Solver

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)

Simplex Method Solver is an open source web application that allows users to solve linear programming problems using the Simplex algorithm. The application provides an interactive interface to input objective functions and constraints, displays step-by-step solution tables, and visualizes the feasible region for two-variable problems.

## Features

- **Interactive Problem Setup:** Specify the number of variables, define the objective function, and configure constraints.
- **Step-by-Step Solution:** View each iteration of the Simplex algorithm with pivot information and tableau updates.
- **Graphical Visualization:** For two-variable problems, the app displays the constraint lines, feasible region, and highlights the optimal solution point.
- **Responsive UI:** Styled with Tailwind CSS for a modern and responsive design.

## Prerequisites

- [Node.js](https://nodejs.org/) (v22 or later)
- [pnpm](https://pnpm.io/)

## Project Structure

- **src/app/page.tsx:** Main page that contains the problem setup and integrates all components.
- **src/lib/simplex-solver.ts:** The Simplex algorithm implementation, including tableau initialization, pivot selection, and solution extraction.
- **src/components/simplex-table.tsx:** Displays each simplex tableau and pivot operations.
- **src/components/graph-visualizer.tsx:** Provides a 2D graphical visualization of the feasible region and constraints.

## License

This repository is licensed under the [GNU Affero General Public License v3.0](LICENSE).
