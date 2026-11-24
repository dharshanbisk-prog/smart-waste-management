/**
 * Automated Test Suite for IoT Smart Waste Monitoring & Route Optimization
 */

const assert = require('assert');
const { EventEmitter } = require('events');
const { Writable } = require('stream');
const {
  handleRequest,
  DEPOT,
  INITIAL_BINS,
  enrichBin,
  haversineDistanceKm,
  optimizeRoute,
  calculateEnvironmentalMetrics,
  computeUltrasonicDistance
} = require('./server');

// Mock HTTP Request/Response for isolated testing without network socket binding
function mockRequest(handler, path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = new EventEmitter();
    req.url = path;
    req.method = options.method || 'GET';
    req.headers = {
      'content-type': 'application/json',
      ...(options.headers || {})
    };

    class MockResponse extends Writable {
      constructor() {
        super();
        this.resHeaders = {};
        this.statusCode = 200;
        this.bodyData = '';
      }

      setHeader(key, val) {
        this.resHeaders[key.toLowerCase()] = val;
      }

      writeHead(code, headers = {}) {
        this.statusCode = code;
        for (const [k, v] of Object.entries(headers)) {
          this.resHeaders[k.toLowerCase()] = v;
        }
      }

      _write(chunk, encoding, callback) {
        this.bodyData += chunk.toString();
        callback();
      }

      end(chunk) {
        if (chunk) this.bodyData += chunk.toString();
        super.end();
        let parsed = this.bodyData;
        try {
          parsed = JSON.parse(this.bodyData);
        } catch (e) {}
        resolve({
          statusCode: this.statusCode,
          headers: this.resHeaders,
          body: parsed
        });
      }
    }

    const res = new MockResponse();

    // Execute handler
    handler(req, res).catch(reject);

    // If body provided, emit data and end
    if (options.body) {
      req.emit('data', Buffer.from(JSON.stringify(options.body)));
    }
    req.emit('end');
  });
}

async function runTests() {
  console.log('🧪 Starting Automated Tests for EVS Smart Waste System...\n');
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error('     ' + err.message);
      failed++;
    }
  }

  async function testAsync(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error('     ' + err.message);
      failed++;
    }
  }

  // Unit Tests: Math & Sensors
  test('Haversine distance calculation is accurate', () => {
    const dist = haversineDistanceKm(28.6328, 77.2195, 28.6250, 77.2150);
    assert(dist > 0.5 && dist < 1.5, `Expected ~0.9-1.2 km, got ${dist}`);
  });

  test('Ultrasonic sensor distance calculation works across fill levels', () => {
    const depth = 100;
    assert.strictEqual(computeUltrasonicDistance(depth, 0), 100);
    assert.strictEqual(computeUltrasonicDistance(depth, 50), 50);
    assert.strictEqual(computeUltrasonicDistance(depth, 90), 10);
    assert.strictEqual(computeUltrasonicDistance(depth, 100), 2);
  });

  test('enrichBin accurately flags CRITICAL, WARNING, and NORMAL bins', () => {
    const critical = enrichBin({ depthCm: 100, fillLevel: 85 });
    assert.strictEqual(critical.status, 'CRITICAL');
    assert.strictEqual(critical.isCritical, true);

    const warning = enrichBin({ depthCm: 100, fillLevel: 65 });
    assert.strictEqual(warning.status, 'WARNING');
    assert.strictEqual(warning.isCritical, false);

    const normal = enrichBin({ depthCm: 100, fillLevel: 30 });
    assert.strictEqual(normal.status, 'NORMAL');
    assert.strictEqual(normal.isCritical, false);
  });

  test('Route optimization algorithm connects Depot through stops and returns to Depot', () => {
    const subset = [INITIAL_BINS[0], INITIAL_BINS[2], INITIAL_BINS[4]];
    const plan = optimizeRoute(DEPOT, subset);

    assert.strictEqual(plan.stopsCount, 3);
    assert.strictEqual(plan.orderedRoute.length, 5); // Depot + 3 stops + Depot return
    assert.strictEqual(plan.orderedRoute[0].id, DEPOT.id);
    assert.strictEqual(plan.orderedRoute[plan.orderedRoute.length - 1].id, DEPOT.id);
    assert(plan.totalDistanceKm > 0, 'Total distance must be positive');
  });

  test('Environmental impact correctly quantifies fuel and CO2 savings', () => {
    const metrics = calculateEnvironmentalMetrics(4.5, 9.8);
    assert(metrics.distSavedKm > 5.0, 'Distance saved should be ~5.3 km');
    assert(metrics.fuelSavedL > 1.5, 'Fuel saved should be ~1.8 L');
    assert(metrics.co2SavedKg > 4.0, 'CO2 saved should be > 4 kg');
    assert(metrics.fuelEfficiencyGainPct > 50, 'Efficiency gain should be > 50%');
  });

  // REST API Endpoint Tests
  console.log('\n  🌐 Testing REST API Handlers...\n');

  await testAsync('GET /api/bins returns 5 initialized bins with enriched sensor data', async () => {
    const res = await mockRequest(handleRequest, '/api/bins');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.bins.length, 5);
    assert(res.body.bins[0].distanceCm !== undefined);
    assert(res.body.bins[0].status !== undefined);
  });

  await testAsync('GET /api/stats returns accurate aggregate metrics', async () => {
    const res = await mockRequest(handleRequest, '/api/stats');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.stats.totalBins, 5);
    assert(res.body.stats.criticalBins >= 1);
    assert(res.body.stats.averageFillLevel > 0);
  });

  await testAsync('POST /api/route/optimize calculates dynamic route and EVS metrics', async () => {
    const res = await mockRequest(handleRequest, '/api/route/optimize', {
      method: 'POST',
      body: { threshold: 80 }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert(res.body.routePlan.stopsCount >= 1);
    assert(res.body.routePlan.totalDistanceKm > 0);
    assert(res.body.environmentalMetrics.co2SavedKg >= 0);
  });

  await testAsync('POST /api/bins/:id/empty resets bin fill level', async () => {
    const res = await mockRequest(handleRequest, '/api/bins/BIN-101/empty', { method: 'POST' });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert(res.body.bin.fillLevel < 10, 'Bin should be emptied to <10%');
  });

  await testAsync('POST /api/bins/reset restores all bins to initial benchmark state', async () => {
    const res = await mockRequest(handleRequest, '/api/bins/reset', { method: 'POST' });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.bins.find(b => b.id === 'BIN-101').fillLevel, 88);
  });

  await testAsync('POST /api/iot/telemetry ingests simulated ESP32 ultrasonic readings', async () => {
    const res = await mockRequest(handleRequest, '/api/iot/telemetry', {
      method: 'POST',
      body: {
        binId: 'BIN-102',
        distanceCm: 15, // 15cm from top out of 100cm depth => 85% full
        batteryLevel: 98
      }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.bin.fillLevel, 85);
    assert.strictEqual(res.body.bin.status, 'CRITICAL');
  });

  // Static File Serving Tests
  console.log('\n  📁 Testing Static File Serving...\n');

  await testAsync('GET / serves index.html with HTML content-type', async () => {
    const res = await mockRequest(handleRequest, '/');
    assert.strictEqual(res.statusCode, 200);
    assert(res.headers['content-type'].includes('text/html'));
    assert(typeof res.body === 'string' && res.body.includes('IoT Smart Waste'));
  });

  await testAsync('GET /js/app.js serves app script with JS content-type', async () => {
    const res = await mockRequest(handleRequest, '/js/app.js');
    assert.strictEqual(res.statusCode, 200);
    assert(res.headers['content-type'].includes('javascript'));
    assert(typeof res.body === 'string' && res.body.includes('SmartWasteApp'));
  });

  await testAsync('GET /css/styles.css serves stylesheet with CSS content-type', async () => {
    const res = await mockRequest(handleRequest, '/css/styles.css');
    assert.strictEqual(res.statusCode, 200);
    assert(res.headers['content-type'].includes('css'));
    assert(typeof res.body === 'string' && res.body.includes('pulse-critical'));
  });

  console.log(`\n===========================================`);
  console.log(` Tests Completed: ${passed} Passed, ${failed} Failed`);
  console.log(`===========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests();
