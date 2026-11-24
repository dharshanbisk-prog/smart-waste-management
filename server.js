/**
 * IoT-Enabled Smart Waste Monitoring and Route Optimization System
 * Backend Server & IoT Simulation Engine
 * Environmental Studies (EVS) Engineering Prototype
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// Municipal Sanitation Central Depot
const DEPOT = {
  id: 'DEPOT-01',
  name: 'Central Municipal Sanitation Depot & Resource Recovery Hub',
  lat: 28.6328,
  lng: 77.2195,
  address: 'Connaught Central Ring, Sector 1',
  trucksAvailable: 3,
  trucksActive: 1
};

// Initial state of 5 simulated public dustbins equipped with ultrasonic sensors
const INITIAL_BINS = [
  {
    id: 'BIN-101',
    name: 'Connaught Circle - Block A (Metro Gate 2)',
    area: 'Commercial / Metro Transit Hub',
    lat: 28.6352,
    lng: 77.2172,
    fillLevel: 88,
    batteryLevel: 94,
    depthCm: 100,
    capacityLiters: 240,
    wasteType: 'Dry Recyclables / Bottles',
    sensorModel: 'Ultrasonic HC-SR04 (Waterproof JSN-SR04T)',
    microcontroller: 'ESP32-WROOM-32 (LoRaWAN/WiFi)',
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'BIN-102',
    name: 'Central Park Promenade - South Fountain',
    area: 'Public Urban Park',
    lat: 28.6315,
    lng: 77.2165,
    fillLevel: 46,
    batteryLevel: 89,
    depthCm: 100,
    capacityLiters: 240,
    wasteType: 'Organic & Food Waste',
    sensorModel: 'Ultrasonic HC-SR04 (Waterproof JSN-SR04T)',
    microcontroller: 'ESP32-WROOM-32 (LoRaWAN/WiFi)',
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'BIN-103',
    name: 'Janpath Flea Market - Food Court Area',
    area: 'High Footfall Street Market',
    lat: 28.6272,
    lng: 77.2185,
    fillLevel: 92,
    batteryLevel: 78,
    depthCm: 100,
    capacityLiters: 240,
    wasteType: 'Mixed Municipal Solid Waste',
    sensorModel: 'Ultrasonic HC-SR04 (Waterproof JSN-SR04T)',
    microcontroller: 'ESP32-WROOM-32 (LoRaWAN/WiFi)',
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'BIN-104',
    name: 'Barakhamba Financial Tower Walkway',
    area: 'Corporate Commercial District',
    lat: 28.6298,
    lng: 77.2252,
    fillLevel: 32,
    batteryLevel: 96,
    depthCm: 100,
    capacityLiters: 240,
    wasteType: 'Paper / Packaging Cardboard',
    sensorModel: 'Ultrasonic HC-SR04 (Waterproof JSN-SR04T)',
    microcontroller: 'ESP32-WROOM-32 (LoRaWAN/WiFi)',
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'BIN-105',
    name: 'Kasturba Gandhi Marg - BRT Bus Terminal',
    area: 'Public Transit Terminal',
    lat: 28.6248,
    lng: 77.2220,
    fillLevel: 84,
    batteryLevel: 85,
    depthCm: 100,
    capacityLiters: 240,
    wasteType: 'Single-use Plastics & Cans',
    sensorModel: 'Ultrasonic HC-SR04 (Waterproof JSN-SR04T)',
    microcontroller: 'ESP32-WROOM-32 (LoRaWAN/WiFi)',
    lastUpdated: new Date().toISOString()
  }
];

// Deep copy of bins for live state
let bins = JSON.parse(JSON.stringify(INITIAL_BINS));

// Helper: compute ultrasonic distance from fill level
function computeUltrasonicDistance(depthCm, fillLevel) {
  const distance = Math.max(2, Math.round(depthCm * (1 - fillLevel / 100)));
  return distance;
}

// Enhance bin object with computed sensor values and status label
function enrichBin(bin) {
  const distanceCm = computeUltrasonicDistance(bin.depthCm, bin.fillLevel);
  let status = 'NORMAL';
  let statusColor = 'green';
  if (bin.fillLevel >= 80) {
    status = 'CRITICAL';
    statusColor = 'red';
  } else if (bin.fillLevel >= 50) {
    status = 'WARNING';
    statusColor = 'yellow';
  }
  return {
    ...bin,
    distanceCm,
    status,
    statusColor,
    isCritical: bin.fillLevel >= 80
  };
}

// Great-circle Haversine Distance in Kilometers
function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Traveling Salesperson Heuristic (Nearest Neighbor + 2-opt refinement)
function optimizeRoute(startLocation, destinationPoints) {
  if (!destinationPoints || destinationPoints.length === 0) {
    return {
      orderedRoute: [startLocation],
      totalDistanceKm: 0,
      legs: [],
      stopsCount: 0
    };
  }

  // If only 1 stop
  if (destinationPoints.length === 1) {
    const single = destinationPoints[0];
    const dOut = haversineDistanceKm(startLocation.lat, startLocation.lng, single.lat, single.lng);
    const dReturn = haversineDistanceKm(single.lat, single.lng, startLocation.lat, startLocation.lng);
    return {
      orderedRoute: [startLocation, single, startLocation],
      totalDistanceKm: Number((dOut + dReturn).toFixed(2)),
      legs: [
        { from: startLocation.name, to: single.name, distanceKm: Number(dOut.toFixed(2)) },
        { from: single.name, to: startLocation.name, distanceKm: Number(dReturn.toFixed(2)) }
      ],
      stopsCount: 1
    };
  }

  // Nearest Neighbor algorithm
  const unvisited = [...destinationPoints];
  let current = startLocation;
  const orderedStops = [];
  let totalDistance = 0;
  const legs = [];

  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let shortestDist = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const dist = haversineDistanceKm(current.lat, current.lng, unvisited[i].lat, unvisited[i].lng);
      if (dist < shortestDist) {
        shortestDist = dist;
        nearestIdx = i;
      }
    }

    const nextStop = unvisited.splice(nearestIdx, 1)[0];
    legs.push({
      from: current.name,
      to: nextStop.name,
      distanceKm: Number(shortestDist.toFixed(2))
    });
    totalDistance += shortestDist;
    orderedStops.push(nextStop);
    current = nextStop;
  }

  // Return to Depot
  const returnDist = haversineDistanceKm(current.lat, current.lng, startLocation.lat, startLocation.lng);
  legs.push({
    from: current.name,
    to: startLocation.name + ' (Return)',
    distanceKm: Number(returnDist.toFixed(2))
  });
  totalDistance += returnDist;

  const fullRoute = [startLocation, ...orderedStops, startLocation];

  return {
    orderedRoute: fullRoute,
    stops: orderedStops,
    totalDistanceKm: Number(totalDistance.toFixed(2)),
    legs,
    stopsCount: orderedStops.length
  };
}

// Environmental Impact Calculator
function calculateEnvironmentalMetrics(criticalRouteDist, allBinsRouteDist) {
  // Average municipal medium-heavy diesel truck consumption: ~0.34 L/km
  const DIESEL_LITER_PER_KM = 0.34;
  // Diesel combustion emission factor: 2.68 kg CO2e per liter of diesel
  const CO2_KG_PER_LITER = 2.68;

  const distSavedKm = Math.max(0, allBinsRouteDist - criticalRouteDist);
  const fuelUsedCriticalL = criticalRouteDist * DIESEL_LITER_PER_KM;
  const fuelUsedAllL = allBinsRouteDist * DIESEL_LITER_PER_KM;
  const fuelSavedL = distSavedKm * DIESEL_LITER_PER_KM;

  const co2CriticalKg = fuelUsedCriticalL * CO2_KG_PER_LITER;
  const co2AllKg = fuelUsedAllL * CO2_KG_PER_LITER;
  const co2SavedKg = fuelSavedL * CO2_KG_PER_LITER;

  const fuelEfficiencyGainPct = allBinsRouteDist > 0 
    ? Math.round((distSavedKm / allBinsRouteDist) * 100) 
    : 0;

  return {
    distSavedKm: Number(distSavedKm.toFixed(2)),
    fuelSavedL: Number(fuelSavedL.toFixed(2)),
    co2SavedKg: Number(co2SavedKg.toFixed(2)),
    fuelEfficiencyGainPct,
    criticalRouteDistKm: Number(criticalRouteDist.toFixed(2)),
    allBinsRouteDistKm: Number(allBinsRouteDist.toFixed(2)),
    co2CriticalKg: Number(co2CriticalKg.toFixed(2)),
    co2AllKg: Number(co2AllKg.toFixed(2))
  };
}

// Background simulation state
let simulationRunning = true;
let simulationInterval = null;

function stepSimulation() {
  bins.forEach((b) => {
    // 70% chance of footfall filling trash by 2 to 6 percent
    if (Math.random() > 0.3) {
      const increment = Math.floor(Math.random() * 5) + 2;
      b.fillLevel = Math.min(100, b.fillLevel + increment);
      // Slight battery drain of 0.05%
      b.batteryLevel = Math.max(15, Number((b.batteryLevel - 0.05).toFixed(1)));
      b.lastUpdated = new Date().toISOString();
    }
  });
}

function startSimulationInterval() {
  if (!simulationInterval) {
    simulationInterval = setInterval(() => {
      if (simulationRunning) {
        stepSimulation();
      }
    }, 5000);
  }
}

startSimulationInterval();

// MIME Types Map
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Request Parser Helper
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        if (!body) return resolve({});
        resolve(JSON.parse(body));
      } catch (err) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

// Request Handler Dispatcher
async function handleRequest(req, res) {
  const reqUrl = new URL(req.url, 'http://localhost');
  const pathname = reqUrl.pathname;
  const method = req.method;

  // Enable CORS for easy cross-origin prototyping & testing
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Helper JSON Response
  const sendJSON = (statusCode, data) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };

  try {
    // API: GET /api/bins - List all dustbins
    if (pathname === '/api/bins' && method === 'GET') {
      const enriched = bins.map(enrichBin);
      return sendJSON(200, { success: true, bins: enriched });
    }

    // API: GET /api/depot - Depot information
    if (pathname === '/api/depot' && method === 'GET') {
      return sendJSON(200, { success: true, depot: DEPOT });
    }

    // API: GET /api/stats - Key metrics
    if (pathname === '/api/stats' && method === 'GET') {
      const enriched = bins.map(enrichBin);
      const totalBins = enriched.length;
      const criticalBins = enriched.filter(b => b.fillLevel >= 80).length;
      const warningBins = enriched.filter(b => b.fillLevel >= 50 && b.fillLevel < 80).length;
      const normalBins = enriched.filter(b => b.fillLevel < 50).length;
      const avgFill = Math.round(enriched.reduce((acc, b) => acc + b.fillLevel, 0) / (totalBins || 1));

      return sendJSON(200, {
        success: true,
        stats: {
          totalBins,
          criticalBins,
          warningBins,
          normalBins,
          averageFillLevel: avgFill,
          activeTrucks: DEPOT.trucksActive,
          simulationRunning
        }
      });
    }

    // API: POST /api/bins/:id/empty - Empty a single bin
    const emptyMatch = pathname.match(/^\/api\/bins\/([A-Za-z0-9-]+)\/empty$/);
    if (emptyMatch && method === 'POST') {
      const binId = emptyMatch[1];
      const targetBin = bins.find(b => b.id.toLowerCase() === binId.toLowerCase());
      if (!targetBin) {
        return sendJSON(404, { success: false, error: 'Bin not found' });
      }
      targetBin.fillLevel = Math.floor(Math.random() * 4) + 1; // 1% - 4% residual
      targetBin.lastUpdated = new Date().toISOString();
      return sendJSON(200, {
        success: true,
        message: `Bin ${binId} successfully emptied by driver.`,
        bin: enrichBin(targetBin)
      });
    }

    // API: POST /api/bins/empty-critical - Empty all critical bins
    if (pathname === '/api/bins/empty-critical' && method === 'POST') {
      let count = 0;
      bins.forEach(b => {
        if (b.fillLevel >= 80) {
          b.fillLevel = Math.floor(Math.random() * 4) + 1;
          b.lastUpdated = new Date().toISOString();
          count++;
        }
      });
      return sendJSON(200, {
        success: true,
        message: `Emptied ${count} critical dustbins.`,
        bins: bins.map(enrichBin)
      });
    }

    // API: POST /api/bins/simulate - Manually trigger waste accumulation
    if (pathname === '/api/bins/simulate' && method === 'POST') {
      stepSimulation();
      return sendJSON(200, {
        success: true,
        message: 'Trash accumulation step simulated.',
        bins: bins.map(enrichBin)
      });
    }

    // API: POST /api/bins/reset - Reset bins to initial state
    if (pathname === '/api/bins/reset' && method === 'POST') {
      bins = JSON.parse(JSON.stringify(INITIAL_BINS));
      return sendJSON(200, {
        success: true,
        message: 'All dustbins reset to initial benchmark state.',
        bins: bins.map(enrichBin)
      });
    }

    // API: POST /api/simulation/toggle - Toggle auto-interval simulation
    if (pathname === '/api/simulation/toggle' && method === 'POST') {
      simulationRunning = !simulationRunning;
      return sendJSON(200, {
        success: true,
        simulationRunning,
        message: `Simulation ${simulationRunning ? 'resumed' : 'paused'}.`
      });
    }

    // API: GET /api/simulation/status
    if (pathname === '/api/simulation/status' && method === 'GET') {
      return sendJSON(200, { success: true, simulationRunning });
    }

    // API: POST /api/iot/telemetry - Simulated ESP32 ultrasonic telemetry ingestion
    if (pathname === '/api/iot/telemetry' && method === 'POST') {
      const body = await parseBody(req);
      const { binId, distanceCm, batteryLevel } = body;
      const targetBin = bins.find(b => b.id === binId);
      if (!targetBin) {
        return sendJSON(404, { success: false, error: 'Bin not registered in municipal registry.' });
      }

      if (typeof distanceCm === 'number') {
        const computedFill = Math.max(0, Math.min(100, Math.round(((targetBin.depthCm - distanceCm) / targetBin.depthCm) * 100)));
        targetBin.fillLevel = computedFill;
      }
      if (typeof batteryLevel === 'number') {
        targetBin.batteryLevel = Math.max(0, Math.min(100, batteryLevel));
      }
      targetBin.lastUpdated = new Date().toISOString();

      return sendJSON(200, {
        success: true,
        message: 'ESP32 ultrasonic telemetry received and ingested.',
        bin: enrichBin(targetBin)
      });
    }

    // API: POST /api/route/optimize - Smart Route Optimization
    if (pathname === '/api/route/optimize' && method === 'POST') {
      const body = await parseBody(req);
      const threshold = typeof body.threshold === 'number' ? body.threshold : 80;

      const enriched = bins.map(enrichBin);
      const criticalBins = enriched.filter(b => b.fillLevel >= threshold);

      // Route visiting only critical bins
      const optimizedPlan = optimizeRoute(DEPOT, criticalBins);

      // Traditional baseline route: visits ALL bins regardless of fill level
      const baselinePlan = optimizeRoute(DEPOT, enriched);

      // Environmental metrics comparison
      const environmentalMetrics = calculateEnvironmentalMetrics(
        optimizedPlan.totalDistanceKm,
        baselinePlan.totalDistanceKm
      );

      // Estimated travel time (average city sanitation speed: 25 km/h + 4 mins per collection stop)
      const travelTimeMinutes = Math.round((optimizedPlan.totalDistanceKm / 25) * 60 + (optimizedPlan.stopsCount * 4));

      return sendJSON(200, {
        success: true,
        threshold,
        depot: DEPOT,
        criticalBinsCount: criticalBins.length,
        totalBinsCount: enriched.length,
        routePlan: {
          ...optimizedPlan,
          estimatedDurationMinutes: travelTimeMinutes,
          wasteCollectedLiters: criticalBins.reduce((sum, b) => sum + Math.round((b.fillLevel / 100) * b.capacityLiters), 0)
        },
        baselinePlan: {
          totalDistanceKm: baselinePlan.totalDistanceKm,
          stopsCount: baselinePlan.stopsCount
        },
        environmentalMetrics
      });
    }

    // Serve Static Files from /public
    let reqPath = pathname === '/' ? '/index.html' : pathname;
    let safePath = path.normalize(path.join(PUBLIC_DIR, reqPath));

    if (!safePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      return res.end('Access Denied');
    }

    fs.stat(safePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('File Not Found');
      }

      const ext = path.extname(safePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(safePath).pipe(res);
    });

  } catch (error) {
    console.error('Server error:', error);
    sendJSON(500, { success: false, error: 'Internal Server Error' });
  }
}

// HTTP Server
const server = http.createServer(handleRequest);

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(` IoT Smart Waste Monitoring & Route Optimization Server `);
    console.log(` EVS Engineering Prototype Running on Port: ${PORT}      `);
    console.log(` Local URL: http://localhost:${PORT}                   `);
    console.log(`=======================================================`);
  });
}

module.exports = {
  server,
  handleRequest,
  bins,
  INITIAL_BINS,
  DEPOT,
  enrichBin,
  haversineDistanceKm,
  optimizeRoute,
  calculateEnvironmentalMetrics,
  computeUltrasonicDistance
};
