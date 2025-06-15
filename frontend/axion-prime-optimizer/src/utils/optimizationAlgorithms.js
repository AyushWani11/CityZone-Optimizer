/**
 * Urban Redevelopment Optimization Algorithms
 * Axion Prime - Boundary Optimization System
 */

/**
 * Main optimization function to find the optimal boundary
 * @param {Array} buildings - Array of building objects {x, y, weight, id}
 * @param {number} k - Minimum number of buildings to enclose
 * @returns {Object|null} - Optimization result with cost, polygon, and enclosed buildings
 */
export const optimizeBoundary = (buildings, k) => {
	if (!buildings || buildings.length === 0 || k <= 0) {
		return null;
	}

	// Validate input
	if (k > buildings.length) {
		throw new Error(
			`Cannot enclose ${k} buildings when only ${buildings.length} are available`
		);
	}

	// Strategy 1: Greedy approach based on building weights
	const greedyResult = greedyOptimization(buildings, k);

	// Strategy 2: Geometric approach for small datasets
	const geometricResult =
		buildings.length <= 50 ? geometricOptimization(buildings, k) : null;

	// Strategy 3: Convex hull approach
	const convexResult = convexHullOptimization(buildings, k);

	// Return the best result
	const candidates = [greedyResult, geometricResult, convexResult].filter(
		Boolean
	);
	return candidates.reduce((best, current) =>
		!best || current.cost < best.cost ? current : best
	);
};

/**
 * Greedy optimization approach
 * Prioritizes buildings with negative weights (profitable to include)
 */
const greedyOptimization = (buildings, k) => {
	// Sort buildings by weight (negative weights first)
	const sortedBuildings = [...buildings].sort((a, b) => a.weight - b.weight);

	let bestResult = null;
	let bestCost = Infinity;

	// Try different combinations starting with most profitable buildings
	for (let start = 0; start <= buildings.length - k; start++) {
		for (let end = start + k - 1; end < buildings.length; end++) {
			const selectedBuildings = sortedBuildings.slice(start, end + 1);

			if (selectedBuildings.length < k) continue;

			const result = calculateBoundingRectangle(
				buildings,
				selectedBuildings,
				k
			);

			if (result && result.cost < bestCost) {
				bestCost = result.cost;
				bestResult = result;
			}
		}
	}

	return bestResult;
};

/**
 * Geometric optimization approach
 * Tests different geometric configurations
 */
const geometricOptimization = (buildings, k) => {
	let bestResult = null;
	let bestCost = Infinity;

	// Generate all combinations of k buildings (for small datasets)
	const combinations = generateCombinations(buildings, k);

	for (const combination of combinations) {
		const result = calculateBoundingRectangle(buildings, combination, k);

		if (result && result.cost < bestCost) {
			bestCost = result.cost;
			bestResult = result;
		}
	}

	return bestResult;
};

/**
 * Convex hull based optimization
 * Uses convex hull concepts for axis-aligned rectangles
 */
const convexHullOptimization = (buildings, k) => {
	// Find buildings on the convex hull
	const hullBuildings = findAxisAlignedHull(buildings);

	// If hull has enough buildings, use it
	if (hullBuildings.length >= k) {
		return calculateBoundingRectangle(buildings, hullBuildings.slice(0, k), k);
	}

	// Otherwise, add more buildings to reach k
	const remainingBuildings = buildings.filter(
		(b) => !hullBuildings.includes(b)
	);
	const additionalBuildings = remainingBuildings
		.sort((a, b) => a.weight - b.weight)
		.slice(0, k - hullBuildings.length);

	const selectedBuildings = [...hullBuildings, ...additionalBuildings];
	return calculateBoundingRectangle(buildings, selectedBuildings, k);
};

/**
 * Calculate bounding rectangle for selected buildings
 */
const calculateBoundingRectangle = (allBuildings, selectedBuildings, k) => {
	if (selectedBuildings.length < k) return null;

	// Find bounding rectangle coordinates
	const xs = selectedBuildings.map((b) => b.x);
	const ys = selectedBuildings.map((b) => b.y);
	const minX = Math.min(...xs);
	const maxX = Math.max(...xs);
	const minY = Math.min(...ys);
	const maxY = Math.max(...ys);

	// Add small padding to ensure buildings on boundary are included
	const padding = 0.1;
	const rect = {
		minX: minX - padding,
		maxX: maxX + padding,
		minY: minY - padding,
		maxY: maxY + padding,
	};

	// Calculate perimeter
	const width = rect.maxX - rect.minX;
	const height = rect.maxY - rect.minY;
	const perimeter = 2 * (width + height);

	// Find all buildings enclosed by this rectangle
	const enclosedBuildings = allBuildings.filter(
		(b) =>
			b.x >= rect.minX &&
			b.x <= rect.maxX &&
			b.y >= rect.minY &&
			b.y <= rect.maxY
	);

	// Check if we have enough buildings
	if (enclosedBuildings.length < k) return null;

	// Calculate total weight of enclosed buildings
	const totalWeight = enclosedBuildings.reduce((sum, b) => sum + b.weight, 0);
	const totalCost = perimeter + totalWeight;

	// Create polygon vertices (rectangle)
	const polygon = [
		{ x: rect.minX, y: rect.minY },
		{ x: rect.maxX, y: rect.minY },
		{ x: rect.maxX, y: rect.maxY },
		{ x: rect.minX, y: rect.maxY },
	];

	return {
		cost: totalCost,
		polygon,
		enclosedBuildings,
		perimeter,
		totalWeight,
		boundingRect: rect,
	};
};

/**
 * Find axis-aligned "hull" buildings (extreme points)
 */
const findAxisAlignedHull = (buildings) => {
	if (buildings.length === 0) return [];

	const minX = Math.min(...buildings.map((b) => b.x));
	const maxX = Math.max(...buildings.map((b) => b.x));
	const minY = Math.min(...buildings.map((b) => b.y));
	const maxY = Math.max(...buildings.map((b) => b.y));

	const hullBuildings = [];

	// Find buildings at extreme positions
	buildings.forEach((building) => {
		if (
			building.x === minX ||
			building.x === maxX ||
			building.y === minY ||
			building.y === maxY
		) {
			hullBuildings.push(building);
		}
	});

	// Remove duplicates
	return [...new Set(hullBuildings)];
};

/**
 * Generate all combinations of k buildings from the array
 * Only used for small datasets to avoid performance issues
 */
const generateCombinations = (buildings, k) => {
	if (k > buildings.length || buildings.length > 20) return [];

	const combinations = [];

	const backtrack = (start, currentCombination) => {
		if (currentCombination.length === k) {
			combinations.push([...currentCombination]);
			return;
		}

		for (let i = start; i < buildings.length; i++) {
			currentCombination.push(buildings[i]);
			backtrack(i + 1, currentCombination);
			currentCombination.pop();
		}
	};

	backtrack(0, []);
	return combinations;
};

/**
 * Validate building data format
 */
export const validateBuildings = (buildings) => {
	if (!Array.isArray(buildings)) {
		throw new Error('Buildings must be an array');
	}

	buildings.forEach((building, index) => {
		if (typeof building !== 'object' || building === null) {
			throw new Error(`Building at index ${index} must be an object`);
		}

		if (typeof building.x !== 'number' || typeof building.y !== 'number') {
			throw new Error(
				`Building at index ${index} must have numeric x and y coordinates`
			);
		}

		if (typeof building.weight !== 'number') {
			throw new Error(`Building at index ${index} must have a numeric weight`);
		}

		if (
			building.x < 0 ||
			building.y < 0 ||
			building.x > 10000 ||
			building.y > 10000
		) {
			throw new Error(
				`Building at index ${index} coordinates must be between 0 and 10000`
			);
		}
	});

	return true;
};

/**
 * Format output for submission
 */
export const formatOptimizationOutput = (result) => {
	if (!result) return '';

	const { cost, polygon } = result;
	let output = `${cost.toFixed(6)}\n`;

	// Generate edges from polygon vertices
	for (let i = 0; i < polygon.length; i++) {
		const current = polygon[i];
		const next = polygon[(i + 1) % polygon.length];
		output += `${current.x.toFixed(6)} ${current.y.toFixed(6)} ${next.x.toFixed(
			6
		)} ${next.y.toFixed(6)}\n`;
	}

	return output.trim();
};
