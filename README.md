# Simplex Method Solver

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)

**Simplex Method Solver** is an open-source web application that allows users to solve linear programming problems using the Simplex algorithm. The application provides an interactive interface for defining problems, step-by-step solution tables, and visualizations of feasible regions. It supports both the standard and dual simplex methods.

## Features

- **Interactive Problem Setup:** Easily specify the number of variables, define the objective function, and configure constraints for both standard and dual simplex methods.
- **Step-by-Step Solution:** View each iteration of the Simplex algorithm, including pivot information and tableau updates.
- **Graphical Visualization:**
  - **2D Visualization** for two-variable objective functions: Displays constraint lines, the feasible region, and the optimal solution point.
  - **3D Interactive Visualization** for three-variable objective functions: Provides an interactive 3D graph of the constraint surfaces and feasible region, with visual indication of the optimal point.
- **Responsive UI:** Built with Tailwind CSS for a clean, modern, and responsive user experience.

## Prerequisites

- [Node.js](https://nodejs.org/) (v22 or later)
- [pnpm](https://pnpm.io/)

## License

This repository is licensed under the [GNU Affero General Public License v3.0](LICENSE).
