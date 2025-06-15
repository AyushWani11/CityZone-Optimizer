/**
 * File handling utilities for Axion Prime Optimizer
 */

/**
 * Parse building data from text input
 * @param {string} textData - Raw text data
 * @returns {Object} - Parsed data with buildings array and metadata
 */
export const parseBuildingData = (textData) => {
	if (!textData || typeof textData !== 'string') {
		throw new Error('Invalid input data');
	}

	const lines = textData
		.trim()
		.split('\n')
		.filter((line) => line.trim());

	if (lines.length === 0) {
		throw new Error('No data provided');
	}

	const buildings = [];
	let n = null,
		k = null;
	let startIndex = 0;

	// Check if first line contains N and K
	const firstLine = lines[0].trim().split(/\s+/);
	if (firstLine.length === 2 && !isNaN(firstLine[0]) && !isNaN(firstLine[1])) {
		n = parseInt(firstLine[0]);
		k = parseInt(firstLine[1]);
		startIndex = 1;
	}

	// Parse building data
	for (let i = startIndex; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;

		const parts = line.split(/\s+/);
		if (parts.length !== 3) {
			throw new Error(
				`Line ${i + 1}: Expected 3 values (x y weight), got ${parts.length}`
			);
		}

		const [x, y, weight] = parts.map(Number);

		if (isNaN(x) || isNaN(y) || isNaN(weight)) {
			throw new Error(`Line ${i + 1}: Invalid number format`);
		}

		// Validate constraints
		if (x < 0 || x > 10000 || y < 0 || y > 10000) {
			throw new Error(`Line ${i + 1}: Coordinates must be between 0 and 10000`);
		}

		buildings.push({
			x,
			y,
			weight,
			id: buildings.length,
		});
	}

	// Validate N if provided
	if (n !== null && buildings.length !== n) {
		throw new Error(`Expected ${n} buildings, but found ${buildings.length}`);
	}

	return {
		buildings,
		n: n || buildings.length,
		k: k || Math.min(1, buildings.length),
		metadata: {
			totalBuildings: buildings.length,
			positiveWeights: buildings.filter((b) => b.weight > 0).length,
			negativeWeights: buildings.filter((b) => b.weight < 0).length,
			zeroWeights: buildings.filter((b) => b.weight === 0).length,
			minWeight: Math.min(...buildings.map((b) => b.weight)),
			maxWeight: Math.max(...buildings.map((b) => b.weight)),
			bounds: {
				minX: Math.min(...buildings.map((b) => b.x)),
				maxX: Math.max(...buildings.map((b) => b.x)),
				minY: Math.min(...buildings.map((b) => b.y)),
				maxY: Math.max(...buildings.map((b) => b.y)),
			},
		},
	};
};

/**
 * Handle file upload and parsing
 * @param {File} file - Uploaded file
 * @returns {Promise<Object>} - Promise resolving to parsed data
 */
export const handleFileUpload = (file) => {
	return new Promise((resolve, reject) => {
		if (!file) {
			reject(new Error('No file provided'));
			return;
		}

		// Validate file type
		const validTypes = ['.txt', 'text/plain', 'application/txt'];
		const fileType = file.type || '';
		const fileName = file.name || '';
		const fileExtension = fileName.substring(fileName.lastIndexOf('.'));

		if (!validTypes.includes(fileType) && fileExtension !== '.txt') {
			reject(new Error('Please upload a .txt file'));
			return;
		}

		// Validate file size (max 1MB)
		const maxSize = 1024 * 1024; // 1MB
		if (file.size > maxSize) {
			reject(new Error('File size must be less than 1MB'));
			return;
		}

		const reader = new FileReader();

		reader.onload = (event) => {
			try {
				const content = event.target.result;
				const parsedData = parseBuildingData(content);
				resolve(parsedData);
			} catch (error) {
				reject(new Error(`File parsing error: ${error.message}`));
			}
		};

		reader.onerror = () => {
			reject(new Error('Failed to read file'));
		};

		reader.readAsText(file);
	});
};

/**
 * Generate sample data for testing
 * @param {number} numBuildings - Number of buildings to generate
 * @param {number} minK - Minimum K value
 * @returns {Object} - Generated sample data
 */
export const generateSampleData = (numBuildings = 10, minK = 3) => {
	const buildings = [];

	for (let i = 0; i < numBuildings; i++) {
		buildings.push({
			x: Math.floor(Math.random() * 100),
			y: Math.floor(Math.random() * 100),
			weight: Math.floor(Math.random() * 40) - 20, // Range: -20 to 19
			id: i,
		});
	}

	return {
		buildings,
		n: numBuildings,
		k: Math.min(minK, numBuildings),
		metadata: {
			totalBuildings: numBuildings,
			positiveWeights: buildings.filter((b) => b.weight > 0).length,
			negativeWeights: buildings.filter((b) => b.weight < 0).length,
			zeroWeights: buildings.filter((b) => b.weight === 0).length,
			minWeight: Math.min(...buildings.map((b) => b.weight)),
			maxWeight: Math.max(...buildings.map((b) => b.weight)),
			bounds: {
				minX: Math.min(...buildings.map((b) => b.x)),
				maxX: Math.max(...buildings.map((b) => b.x)),
				minY: Math.min(...buildings.map((b) => b.y)),
				maxY: Math.max(...buildings.map((b) => b.y)),
			},
		},
	};
};

/**
 * Export results to downloadable file
 * @param {Object} result - Optimization result
 * @param {string} filename - Output filename
 */
export const exportResults = (result, filename = 'axion_prime_result.txt') => {
	if (!result) {
		throw new Error('No result to export');
	}

	const { cost, polygon } = result;
	let content = `${cost.toFixed(6)}\n`;

	// Add polygon edges
	for (let i = 0; i < polygon.length; i++) {
		const current = polygon[i];
		const next = polygon[(i + 1) % polygon.length];
		content += `${current.x.toFixed(6)} ${current.y.toFixed(
			6
		)} ${next.x.toFixed(6)} ${next.y.toFixed(6)}\n`;
	}

	// Create and trigger download
	const blob = new Blob([content], { type: 'text/plain' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
};

/**
 * Validate input constraints
 * @param {Object} data - Input data to validate
 * @returns {Object} - Validation result
 */
export const validateInput = (data) => {
	const errors = [];
	const warnings = [];

	if (!data.buildings || data.buildings.length === 0) {
		errors.push('No buildings provided');
		return { isValid: false, errors, warnings };
	}

	if (data.k <= 0) {
		errors.push('K must be greater than 0');
	}

	if (data.k > data.buildings.length) {
		errors.push(
			`K (${data.k}) cannot be greater than number of buildings (${data.buildings.length})`
		);
	}

	// Check for duplicate buildings
	const positions = new Set();
	data.buildings.forEach((building, index) => {
		const pos = `${building.x},${building.y}`;
		if (positions.has(pos)) {
			warnings.push(
				`Duplicate building position at (${building.x}, ${building.y})`
			);
		}
		positions.add(pos);
	});

	// Check for edge cases
	if (data.buildings.every((b) => b.weight > 0)) {
		warnings.push(
			'All buildings have positive weights - consider including exactly K buildings'
		);
	}

	if (data.buildings.every((b) => b.weight < 0)) {
		warnings.push(
			'All buildings have negative weights - optimal solution will likely include all buildings'
		);
	}

	// Check data distribution
	const bounds = data.metadata?.bounds;
	if (bounds) {
		const width = bounds.maxX - bounds.minX;
		const height = bounds.maxY - bounds.minY;

		if (width === 0 || height === 0) {
			warnings.push('All buildings are aligned on a single axis');
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings,
	};
};
