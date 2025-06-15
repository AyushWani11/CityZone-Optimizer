import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Play, RotateCcw } from 'lucide-react';

const AxionPrimeOptimizer = () => {
	const [inputMethod, setInputMethod] = useState('Manual');
	const [numBuildings, setNumBuildings] = useState('');
	const [minBuildings, setMinBuildings] = useState('');
	const [buildingData, setBuildingData] = useState('');
	const [buildings, setBuildings] = useState([]);
	const [optimizationResult, setOptimizationResult] = useState(null);
	const [isOptimizing, setIsOptimizing] = useState(false);
	const canvasRef = useRef(null);

	// Optimization algorithm implementation
	const optimizeBoundary = (buildings, k) => {
		if (buildings.length === 0 || k <= 0) return null;

		// Sort buildings by weight (negative first for better selection)
		const sortedBuildings = [...buildings].sort((a, b) => a.weight - b.weight);

		let bestCost = Infinity;
		let bestPolygon = null;
		let bestBuildings = null;

		// Try different combinations starting with the most negative weights
		for (let i = 0; i <= buildings.length - k; i++) {
			for (let j = i + k - 1; j < buildings.length; j++) {
				const selectedBuildings = sortedBuildings.slice(i, j + 1);

				if (selectedBuildings.length < k) continue;

				// Find bounding rectangle
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
				const perimeter = 2 * (rect.maxX - rect.minX + (rect.maxY - rect.minY));

				// Calculate sum of weights of all buildings in this rectangle
				const enclosedBuildings = buildings.filter(
					(b) =>
						b.x >= rect.minX &&
						b.x <= rect.maxX &&
						b.y >= rect.minY &&
						b.y <= rect.maxY
				);

				if (enclosedBuildings.length < k) continue;

				const weightSum = enclosedBuildings.reduce(
					(sum, b) => sum + b.weight,
					0
				);
				const totalCost = perimeter + weightSum;

				if (totalCost < bestCost) {
					bestCost = totalCost;
					bestPolygon = [
						{ x: rect.minX, y: rect.minY },
						{ x: rect.maxX, y: rect.minY },
						{ x: rect.maxX, y: rect.maxY },
						{ x: rect.minX, y: rect.maxY },
					];
					bestBuildings = enclosedBuildings;
				}
			}
		}

		// Also try the minimal bounding rectangle of k best buildings
		const kBestBuildings = sortedBuildings.slice(
			0,
			Math.max(k, sortedBuildings.length)
		);
		if (kBestBuildings.length >= k) {
			const xs = kBestBuildings.map((b) => b.x);
			const ys = kBestBuildings.map((b) => b.y);
			const minX = Math.min(...xs);
			const maxX = Math.max(...xs);
			const minY = Math.min(...ys);
			const maxY = Math.max(...ys);

			const padding = 0.1;
			const rect = {
				minX: minX - padding,
				maxX: maxX + padding,
				minY: minY - padding,
				maxY: maxY + padding,
			};

			const perimeter = 2 * (rect.maxX - rect.minX + (rect.maxY - rect.minY));
			const enclosedBuildings = buildings.filter(
				(b) =>
					b.x >= rect.minX &&
					b.x <= rect.maxX &&
					b.y >= rect.minY &&
					b.y <= rect.maxY
			);

			if (enclosedBuildings.length >= k) {
				const weightSum = enclosedBuildings.reduce(
					(sum, b) => sum + b.weight,
					0
				);
				const totalCost = perimeter + weightSum;

				if (totalCost < bestCost) {
					bestCost = totalCost;
					bestPolygon = [
						{ x: rect.minX, y: rect.minY },
						{ x: rect.maxX, y: rect.minY },
						{ x: rect.maxX, y: rect.maxY },
						{ x: rect.minX, y: rect.maxY },
					];
					bestBuildings = enclosedBuildings;
				}
			}
		}

		return bestPolygon
			? {
					cost: bestCost,
					polygon: bestPolygon,
					enclosedBuildings: bestBuildings,
			  }
			: null;
	};

	const handleOptimize = async () => {
		if (buildings.length === 0) {
			alert('Please add building data first');
			return;
		}

		const k = parseInt(minBuildings);
		if (isNaN(k) || k <= 0 || k > buildings.length) {
			alert('Invalid minimum buildings to enclose');
			return;
		}

		setIsOptimizing(true);

		// Simulate processing time for better UX
		await new Promise((resolve) => setTimeout(resolve, 1000));

		const result = optimizeBoundary(buildings, k);
		setOptimizationResult(result);
		setIsOptimizing(false);
	};

	const parseBuildingData = () => {
		if (!buildingData.trim()) return;

		try {
			const lines = buildingData.trim().split('\n');
			const parsedBuildings = lines.map((line, index) => {
				const parts = line.trim().split(/\s+/);
				if (parts.length !== 3) {
					throw new Error(`Line ${index + 1}: Expected 3 values (x y weight)`);
				}

				const [x, y, weight] = parts.map(Number);
				if (isNaN(x) || isNaN(y) || isNaN(weight)) {
					throw new Error(`Line ${index + 1}: Invalid number format`);
				}

				return { x, y, weight, id: index };
			});

			setBuildings(parsedBuildings);
		} catch (error) {
			alert(`Error parsing building data: ${error.message}`);
		}
	};

	const handleFileUpload = (event) => {
		const file = event.target.files[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			const content = e.target.result;
			const lines = content.trim().split('\n');

			if (lines.length < 1) {
				alert('Invalid file format');
				return;
			}

			// First line should contain N and K
			const firstLine = lines[0].trim().split(/\s+/);
			if (firstLine.length === 2) {
				setNumBuildings(firstLine[0]);
				setMinBuildings(firstLine[1]);
				setBuildingData(lines.slice(1).join('\n'));
			} else {
				setBuildingData(content);
			}
		};
		reader.readAsText(file);
	};

	const drawVisualization = () => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext('2d');
		const width = canvas.width;
		const height = canvas.height;

		// Clear canvas with dark background
		ctx.fillStyle = '#0f1419';
		ctx.fillRect(0, 0, width, height);

		if (buildings.length === 0) {
			// Draw empty state
			ctx.fillStyle = '#4a5568';
			ctx.font = '16px Inter, system-ui, sans-serif';
			ctx.textAlign = 'center';
			ctx.fillText('Add building data to see heat map', width / 2, height / 2);
			return;
		}

		// Grid dimensions (logical coordinate space)
		const GRID_SIZE = 10000;

		// Calculate canvas grid resolution (downsampled for performance)
		const maxCanvasGridSize = Math.min(width, height);
		const canvasGridSize = Math.min(200, maxCanvasGridSize); // Max 200x200 grid on canvas
		const cellWidth = width / canvasGridSize;
		const cellHeight = height / canvasGridSize;

		// Find actual bounds of buildings for better visualization
		const xs = buildings.map((b) => b.x);
		const ys = buildings.map((b) => b.y);
		const minX = Math.min(...xs);
		const maxX = Math.max(...xs);
		const minY = Math.min(...ys);
		const maxY = Math.max(...ys);

		// Add padding to bounds
		const padding = Math.max(1, (maxX - minX) * 0.1, (maxY - minY) * 0.1);
		const viewMinX = Math.max(0, minX - padding);
		const viewMaxX = Math.min(GRID_SIZE, maxX + padding);
		const viewMinY = Math.max(0, minY - padding);
		const viewMaxY = Math.min(GRID_SIZE, maxY + padding);

		const viewWidth = viewMaxX - viewMinX;
		const viewHeight = viewMaxY - viewMinY;

		// Create grid data structure
		const gridData = new Map();
		const weights = buildings.map((b) => b.weight);
		const minWeight = Math.min(...weights);
		const maxWeight = Math.max(...weights);
		const weightRange = maxWeight - minWeight || 1;

		// Populate grid with building data
		buildings.forEach((building) => {
			// Convert building coordinates to grid coordinates
			const gridX = Math.floor(
				((building.x - viewMinX) / viewWidth) * canvasGridSize
			);
			const gridY = Math.floor(
				((building.y - viewMinY) / viewHeight) * canvasGridSize
			);

			// Clamp to grid bounds
			const clampedX = Math.max(0, Math.min(canvasGridSize - 1, gridX));
			const clampedY = Math.max(0, Math.min(canvasGridSize - 1, gridY));

			const key = `${clampedX},${clampedY}`;

			if (!gridData.has(key)) {
				gridData.set(key, {
					buildings: [],
					totalWeight: 0,
					avgWeight: 0,
					isEnclosed: false,
				});
			}

			const cell = gridData.get(key);
			cell.buildings.push(building);
			cell.totalWeight += building.weight;
			cell.avgWeight = cell.totalWeight / cell.buildings.length;

			// Check if any building in this cell is enclosed
			if (
				optimizationResult?.enclosedBuildings?.some((b) => b.id === building.id)
			) {
				cell.isEnclosed = true;
			}
		});

		// Draw grid cells
		for (let x = 0; x < canvasGridSize; x++) {
			for (let y = 0; y < canvasGridSize; y++) {
				const key = `${x},${y}`;
				const cell = gridData.get(key);

				if (cell) {
					// Calculate color based on average weight
					const normalizedWeight = (cell.avgWeight - minWeight) / weightRange;

					let color;
					if (cell.avgWeight >= 0) {
						// Positive weights: Blue gradient
						const intensity = Math.sqrt(normalizedWeight * 0.5 + 0.5); // Square root for better visual distribution
						const blue = Math.floor(intensity * 255);
						const alpha = Math.max(0.3, intensity * 0.8);
						color = `rgba(59, 130, 246, ${alpha})`;
					} else {
						// Negative weights: Red gradient
						const intensity = Math.sqrt((1 - normalizedWeight) * 0.5 + 0.5);
						const red = Math.floor(intensity * 255);
						const alpha = Math.max(0.3, intensity * 0.8);
						color = `rgba(239, 68, 68, ${alpha})`;
					}

					// Enhanced color for enclosed buildings
					if (cell.isEnclosed) {
						if (cell.avgWeight >= 0) {
							color = `rgba(34, 197, 94, 0.9)`; // Strong green for enclosed positive
						} else {
							color = `rgba(251, 146, 60, 0.9)`; // Orange for enclosed negative
						}
					}

					ctx.fillStyle = color;
					ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);

					// Add subtle border for enclosed cells
					if (cell.isEnclosed) {
						ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)';
						ctx.lineWidth = Math.max(1, cellWidth / 20);
						ctx.strokeRect(
							x * cellWidth,
							y * cellHeight,
							cellWidth,
							cellHeight
						);
					}
				}
			}
		}

		// Draw optimization boundary if present
		if (optimizationResult?.polygon) {
			const polygon = optimizationResult.polygon;

			// Convert polygon coordinates to canvas coordinates
			const toCanvasX = (worldX) => ((worldX - viewMinX) / viewWidth) * width;
			const toCanvasY = (worldY) => ((worldY - viewMinY) / viewHeight) * height;

			// Draw animated dashed border
			ctx.strokeStyle = '#10b981';
			ctx.lineWidth = 3;
			ctx.setLineDash([10, 5]);
			ctx.lineDashOffset = (Date.now() / 50) % 15; // Animated dash

			ctx.beginPath();
			const firstPoint = polygon[0];
			ctx.moveTo(toCanvasX(firstPoint.x), toCanvasY(firstPoint.y));

			for (let i = 1; i < polygon.length; i++) {
				ctx.lineTo(toCanvasX(polygon[i].x), toCanvasY(polygon[i].y));
			}
			ctx.closePath();
			ctx.stroke();
			ctx.setLineDash([]);

			// Add subtle shadow to boundary
			ctx.shadowColor = '#10b981';
			ctx.shadowBlur = 8;
			ctx.stroke();
			ctx.shadowBlur = 0;
		}

		// Draw coordinate system and scale info
		ctx.fillStyle = '#64748b';
		ctx.font = '11px monospace';
		ctx.textAlign = 'left';

		// Scale info
		const info = [
			`View: (${viewMinX.toFixed(0)}, ${viewMinY.toFixed(
				0
			)}) to (${viewMaxX.toFixed(0)}, ${viewMaxY.toFixed(0)})`,
			`Grid: ${canvasGridSize}×${canvasGridSize} cells`,
			`Range: ${minWeight.toFixed(1)} to ${maxWeight.toFixed(1)}`,
		];

		info.forEach((text, i) => {
			ctx.fillText(text, 8, height - 35 + i * 12);
		});

		// Draw weight legend
		const legendWidth = 200;
		const legendHeight = 20;
		const legendX = width - legendWidth - 10;
		const legendY = 10;

		// Legend background
		ctx.fillStyle = 'rgba(15, 20, 25, 0.8)';
		ctx.fillRect(legendX - 5, legendY - 5, legendWidth + 10, legendHeight + 25);

		// Legend gradient
		const gradient = ctx.createLinearGradient(
			legendX,
			0,
			legendX + legendWidth,
			0
		);
		gradient.addColorStop(0, 'rgba(239, 68, 68, 0.8)');
		gradient.addColorStop(0.5, 'rgba(100, 116, 139, 0.3)');
		gradient.addColorStop(1, 'rgba(59, 130, 246, 0.8)');

		ctx.fillStyle = gradient;
		ctx.fillRect(legendX, legendY, legendWidth, legendHeight);

		// Legend border
		ctx.strokeStyle = '#475569';
		ctx.lineWidth = 1;
		ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);

		// Legend labels
		ctx.fillStyle = '#e2e8f0';
		ctx.font = '10px monospace';
		ctx.textAlign = 'left';
		ctx.fillText(minWeight.toFixed(1), legendX, legendY + legendHeight + 12);
		ctx.textAlign = 'center';
		ctx.fillText('0', legendX + legendWidth / 2, legendY + legendHeight + 12);
		ctx.textAlign = 'right';
		ctx.fillText(
			maxWeight.toFixed(1),
			legendX + legendWidth,
			legendY + legendHeight + 12
		);

		// Legend title
		ctx.textAlign = 'center';
		ctx.fillStyle = '#cbd5e1';
		ctx.font = '11px Inter, system-ui, sans-serif';
		ctx.fillText('Building Weight', legendX + legendWidth / 2, legendY - 8);
	};

	useEffect(() => {
		drawVisualization();
	}, [buildings, optimizationResult]);

	useEffect(() => {
		if (buildingData && numBuildings) {
			parseBuildingData();
		}
	}, [buildingData, numBuildings]);

	const formatOutput = () => {
		if (!optimizationResult) return '';

		const { cost, polygon } = optimizationResult;
		let output = `${cost.toFixed(6)}\n`;

		// Generate edges from polygon vertices
		for (let i = 0; i < polygon.length; i++) {
			const current = polygon[i];
			const next = polygon[(i + 1) % polygon.length];
			output += `${current.x.toFixed(6)} ${current.y.toFixed(
				6
			)} ${next.x.toFixed(6)} ${next.y.toFixed(6)}\n`;
		}

		return output.trim();
	};

	return (
		<div className='min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white'>
			<div className='container mx-auto px-4 py-8'>
				{/* Header */}
				<div className='text-center mb-8'>
					<h1 className='text-5xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-4'>
						AXION PRIME
					</h1>
					<p className='text-xl text-blue-200'>
						Urban Redevelopment Optimization
					</p>
				</div>

				<div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
					{/* Configuration Panel */}
					<div className='bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700'>
						<h2 className='text-2xl font-semibold text-blue-300 mb-6'>
							Configuration
						</h2>

						{/* Input Method */}
						<div className='mb-6'>
							<label className='block text-sm font-medium text-gray-300 mb-3'>
								Input Method
							</label>
							<div className='flex gap-2'>
								<button
									onClick={() => setInputMethod('Manual')}
									className={`px-4 py-2 rounded-lg font-medium transition-all ${
										inputMethod === 'Manual'
											? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
											: 'bg-slate-700 text-gray-300 hover:bg-slate-600'
									}`}
								>
									Manual
								</button>
								<button
									onClick={() => setInputMethod('File Upload')}
									className={`px-4 py-2 rounded-lg font-medium transition-all ${
										inputMethod === 'File Upload'
											? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
											: 'bg-slate-700 text-gray-300 hover:bg-slate-600'
									}`}
								>
									File Upload
								</button>
							</div>
						</div>

						{inputMethod === 'File Upload' && (
							<div className='mb-6'>
								<label className='block text-sm font-medium text-gray-300 mb-2'>
									Upload Input File
								</label>
								<input
									type='file'
									accept='.txt'
									onChange={handleFileUpload}
									className='block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer cursor-pointer bg-slate-700 border border-slate-600 rounded-lg'
								/>
							</div>
						)}

						{/* Number of Buildings */}
						<div className='grid grid-cols-2 gap-4 mb-6'>
							<div>
								<label className='block text-sm font-medium text-gray-300 mb-2'>
									Number of Buildings (N)
								</label>
								<input
									type='number'
									value={numBuildings}
									onChange={(e) => setNumBuildings(e.target.value)}
									className='w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
									placeholder='Enter N'
								/>
							</div>
							<div>
								<label className='block text-sm font-medium text-gray-300 mb-2'>
									Minimum Buildings to Enclose (K)
								</label>
								<input
									type='number'
									value={minBuildings}
									onChange={(e) => setMinBuildings(e.target.value)}
									className='w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
									placeholder='Enter K'
								/>
							</div>
						</div>

						{/* Building Data */}
						<div className='mb-6'>
							<label className='block text-sm font-medium text-gray-300 mb-2'>
								Building Data
							</label>
							<div className='text-xs text-gray-400 mb-2'>
								Format: x y weight (one building per line)
							</div>
							<textarea
								value={buildingData}
								onChange={(e) => setBuildingData(e.target.value)}
								className='w-full h-32 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm'
								placeholder='0 0 10&#10;1 1 -5&#10;2 0 15&#10;...'
							/>
						</div>

						{/* Optimize Button */}
						<button
							onClick={handleOptimize}
							disabled={isOptimizing || buildings.length === 0}
							className='w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-green-600/25 flex items-center justify-center gap-2'
						>
							{isOptimizing ? (
								<>
									<div className='animate-spin rounded-full h-5 w-5 border-b-2 border-white'></div>
									Optimizing...
								</>
							) : (
								<>
									<Play size={20} />
									Optimize Boundary
								</>
							)}
						</button>
					</div>

					{/* Visualization Panel */}
					<div className='bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700'>
						<div className='flex items-center justify-between mb-4'>
							<h2 className='text-2xl font-semibold text-blue-300'>
								City Visualization
							</h2>
							<div className='flex items-center gap-4 text-sm'>
								<div className='flex items-center gap-2'>
									<div className='w-3 h-3 bg-blue-500 rounded-full'></div>
									<span>Building (Positive Cost)</span>
								</div>
								<div className='flex items-center gap-2'>
									<div className='w-3 h-3 bg-red-500 rounded-full'></div>
									<span>Building (Negative Cost)</span>
								</div>
								<div className='flex items-center gap-2'>
									<div className='w-4 h-1 bg-green-500'></div>
									<span>Optimized Boundary</span>
								</div>
							</div>
						</div>

						<div className='bg-slate-900 rounded-lg p-4'>
							<canvas
								ref={canvasRef}
								width={600}
								height={400}
								className='w-full h-auto border border-slate-600 rounded'
							/>
						</div>
					</div>
				</div>

				{/* Results Panel */}
				<div className='mt-8 bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700'>
					<h2 className='text-2xl font-semibold text-blue-300 mb-4'>
						Optimization Results
					</h2>

					{!optimizationResult ? (
						<div className='text-center py-12 text-gray-400'>
							<div className='text-6xl mb-4'>📊</div>
							<p className='text-lg mb-2'>
								Run the optimization to see results
							</p>
							<p className='text-sm'>
								Configure your parameters and click "Optimize Boundary"
							</p>
						</div>
					) : (
						<div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
							<div>
								<h3 className='text-lg font-semibold text-green-400 mb-3'>
									Summary
								</h3>
								<div className='space-y-2 text-sm'>
									<div className='flex justify-between'>
										<span className='text-gray-300'>Total Cost:</span>
										<span className='font-mono text-green-400'>
											{optimizationResult.cost.toFixed(6)}
										</span>
									</div>
									<div className='flex justify-between'>
										<span className='text-gray-300'>Buildings Enclosed:</span>
										<span className='font-mono text-blue-400'>
											{optimizationResult.enclosedBuildings.length}
										</span>
									</div>
									<div className='flex justify-between'>
										<span className='text-gray-300'>Polygon Vertices:</span>
										<span className='font-mono text-blue-400'>
											{optimizationResult.polygon.length}
										</span>
									</div>
								</div>
							</div>

							<div>
								<h3 className='text-lg font-semibold text-green-400 mb-3'>
									Output Format
								</h3>
								<textarea
									value={formatOutput()}
									readOnly
									className='w-full h-32 px-3 py-2 bg-slate-900 border border-slate-600 rounded text-green-400 font-mono text-xs'
								/>
								<button
									onClick={() => navigator.clipboard.writeText(formatOutput())}
									className='mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors'
								>
									Copy Output
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default AxionPrimeOptimizer;
