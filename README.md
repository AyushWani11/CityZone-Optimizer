**UrbanBoundary Planner**
A Python tool to design axis-aligned, minimum-cost containment polygons over a grid of weighted buildings, combining greedy seeding and simulated-annealing polish.

---

## Features

* **Input**: List of building coordinates $(x,y)$ with weights $w$; target $K$ buildings to enclose.
* **Greedy + Random Grids**: Tries grid resolutions 1×1 up to 110×110, with random cell‐size jitter and multiple trials to avoid aliasing.
* **Hole-free Growth**: Greedily adds cells by marginal cost ($\Delta$ perimeter + weight), with flood-fill hole detection.
* **Simulated Annealing**: Polishes each greedy seed for a short time budget to escape local minima, allowing both cell additions and removals.
* **Boundary Extraction**: Converts the final cell set to a simple, clockwise edge list of horizontal/vertical segments.
* **Output**:

  1. Minimum cost (perimeter + sum of weights)
  2. Number of enclosed buildings
  3. Number of edges
  4. Edge list (`x1 y1 x2 y2`)

---

## Requirements

* Python 3.7+
* No external libraries (only standard library modules)

---

## Installation

```bash
git clone https://github.com/yourorg/UrbanBoundaryPlanner.git
cd UrbanBoundaryPlanner
chmod +x main.py
```

---

## Usage

```bash
# From project root
./main.py input.txt > output.txt
```

* **`input.txt`** format:

  ```
  N K
  x1 y1 w1
  x2 y2 w2
  …
  xN yN wN
  ```
* **`output.txt`** will contain:

  ```
  <cost>
  <number_of_enclosed_buildings>
  <number_of_edges>
  x1 y1 x2 y2
  …
  ```

---

## Configuration

All tuning parameters live in `main.py`:

* **Grid search**

  ```python
  MAX_SPLIT = 110       # try splits 1 … MAX_SPLIT
  TRIALS_SMALL = 80     # for splits 2 … 9
  TRIALS_MED  = 20      # for splits 10 … 19
  TRIALS_BIG  = 1       # for splits ≥ 20
  ```
* **Cell-size jitter**

  ```python
  # In each trial:
  if split > 4:
      factor = 1 - 0.01/split * random.random()
  else:
      factor = 1 - 0.0005 * random.random()
  ```
* **Simulated Annealing**

  ```python
  SA_TIME = 0.30        # seconds per greedy seed
  T0, T_end = 5.0, 0.05
  max_iter = 5000
  ```
* **Hole test** grid expansion size is `split + 2` to avoid boundary issues.

Feel free to adjust these values for your dataset and runtime budget.

---

## How It Works

1. **Read** $N,K$ and $(x,y,w)$ triples.
2. **For** each split in 1…MAX\_SPLIT:

   * Determine `trials` by split size.
   * For each trial, compute `cell_size = (max_coord/split) * factor`.
   * **Greedy growth**: bucket buildings → seed best single cell → add neighbour cells by minimal Δcost, avoiding holes.
   * **SA polish**: on the greedy cell set, run a short Metropolis loop proposing add/remove flips, respecting hole-freeness and ≥ K buildings.
   * Keep the best solution so far.
3. **Extract** the polygon boundary from the final cell set.
4. **Print** cost, building count, edge count and edges.

---

## Performance

* **Typical**: \~0.5 s for $N≈10^4$ on a moder laptop.
* **Tuning**:

  * Lower `MAX_SPLIT` and `TRIALS_*` for speed.
  * Increase `SA_TIME` for quality.

---

## License

MIT © 2025 Your Name / Your Organization.
