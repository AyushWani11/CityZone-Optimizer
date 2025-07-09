# Axis Aligned Enclosure Optimization

## Introduction

The **Polygon Selection Optimizer** is a Python-based tool designed to pick a connected polygonal region over a continuous map so that:

1. It contains at least **K** buildings out of **N**,
2. It minimizes **Cost = (Perimeter length) + (Sum of building weights)**.

Instead of searching over infinitely many polygons, we discretize space into grid‐cells, apply a fast **greedy** heuristic to find an initial region, then refine it via **simulated annealing (SA)**. A Streamlit interface enables interactive parameter tuning and visualization.

## Table of Contents

1. [Installation](#installation)
2. [Usage](#usage)
3. [Features](#features)
4. [Theory & Approach](#theory--approach)
5. [Dependencies](#dependencies)
6. [Configuration](#configuration)
7. [Documentation](#documentation)



## Installation

1. Clone the repo:

   ```bash
   git clone https://github.com/yourusername/polygon-selection-optimizer.git
   cd polygon-selection-optimizer
   ```
2. (Optional) Create a virtual environment:

   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

 

## Usage

### Command-Line Interface

1. Prepare `input.txt`:

   ```
   N K
   x₁ y₁ w₁
   x₂ y₂ w₂
   …
   xₙ yₙ wₙ
   ```
2. Run:

   ```bash
   python3 optimize.py input.txt
   ```
3. Outputs both to stdout and `output.txt`:

   * Total cost (6 decimals)
   * Number of buildings inside
   * Number of polygon edges
   * List of edges `(x₁ y₁ x₂ y₂)`

### Streamlit Web UI

```bash
streamlit run optimize.py
```

1. Upload/paste input.
2. Adjust **Simulated Annealing Time** and **Grid Splits**.
3. Click **Run Optimization**.
4. Visualize and download results.

## Features

* **Grid Discretization** of continuous plane
* **Greedy** connected‐region seeding
* **Hole Detection** via flood‐fill to enforce simple connectivity
* **Simulated Annealing** refinement on cell‐sets
* **Randomized Grid Shifting** per trial to diversify starts
* **Boundary Extraction** for precise polygon output
* **Dual Interface**: CLI & Streamlit

## Theory & Approach

### 1. Continuous → Discrete via Grid

* We divide the continuous domain \[0,…,max\_coord]² into a **split × split** grid of square cells.
* Each cell aggregates:

  * **Total weight**: sum of building costs in it.
  * **Count**: number of buildings in it.



### 2. Greedy Initialization

1. **Seed** with the single cell of minimum `(4·cell_size + weight)`.
2. Maintain a min‐heap of **border candidates**: neighboring cells not yet in the region, keyed by

   ```
   (perimeter_delta(if added) + cell_weight).
   ```
3. Pop the cheapest, **toggle** it on if it doesn’t create a hole and moves us toward K buildings.
4. Track the best prefix (once ≥ K) by total cost.

This BFS‐style expansion yields a fast, connected region.

### 3. Hole Detection

To avoid holes, we:

1. Flood‐fill the outside of an expanded grid of size `(split+2)²`, marking visited.
2. Any unvisited cell inside that is not in the region indicates a hole → reject the move.

### 4. Simulated Annealing Refinement

We take the greedy set and refine it via local edge‐tweaks:

#### Neighborhood Moves

* **Border block**: any cell in the region touching at least one empty neighbor.
* **Move**: pick a random border block, then a random one‐step neighbor cell; **toggle** membership.
* Ensures connectivity is very likely preserved and holes are detected.

#### Temperature Schedule

* Initial temperature `T₀ = 5.0`, end temperature `T_end = 0.05`.
* Linearly in log‐space over `max_iter` (default 5000):

  ```
  T(it) = T₀ · exp(–β · it),   where  β = ln(T₀/T_end) / max_iter
  ```

#### Acceptance Criterion

* Compute Δ = cost(new) – cost(current).
* If Δ ≤ 0, **always accept** (downhill move).
* Else accept with probability `exp(–Δ / T)` (allow uphill to escape local minima).

Stop once time limit (default 0.3 s) or iteration cap is reached. Track the best encountered.

### 5. Randomized Grid Shifting

To diversify starts, each trial uses

```python
base = max_coord / split
ε   = (split > 4) and 0.01/split or 0.0005
factor = 1 − ε * random()
cell_size = base * factor
```

This **slightly shrinks** all cells, shifting grid lines so buildings near boundaries re‐bin differently. Multiple trials thus explore distinct discretizations.

## Dependencies

* Python ≥ 3.7
* `matplotlib`
* `streamlit`
* Standard libraries: `sys`, `math`, `heapq`, `random`, `time`, `collections`

## Configuration

* **`SA_TIME_LIMIT`**: seconds for SA refinement (default 0.3).
* **`min_split`**, **`max_split`**: grid‐split range.
* **`max_iter`**, **`T₀`**, **`T_end`**: SA parameters.
  Adjust via code or Streamlit sliders.

## Documentation

* **`solve()`**: runs greedy+SA over splits, outputs best.
* **`greedy(...)`**: builds initial region.
* **`sa_refine(...)`**: applies simulated annealing.
* **`has_hole(...)`**: flood‐fill hole check.
* **`extract_boundary(...)`**: traces polygon edges.
* **Streamlit helpers**: `read_input_from_text`, `solve_streamlit`, `main`.



