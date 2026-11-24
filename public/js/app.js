/**
 * Main Application Logic & State Controller
 * IoT-Enabled Smart Waste Monitoring and Route Optimization System
 */

class SmartWasteApp {
  constructor() {
    this.apiBase = window.location.origin.startsWith('http') ? '' : 'http://localhost:3000';
    this.isOfflineMode = false;
    this.bins = [];
    this.depot = {
      id: 'DEPOT-01',
      name: 'Central Municipal Sanitation Depot & Resource Recovery Hub',
      lat: 28.6328,
      lng: 77.2195,
      address: 'Connaught Central Ring, Sector 1',
      trucksAvailable: 3,
      trucksActive: 1
    };
    this.currentRoute = null;
    this.environmentalMetrics = null;
    this.simulationRunning = true;
    this.pollInterval = null;
    this.mapManager = null;
    this.lastCriticalIds = new Set();
  }

  async init() {
    console.log('🚀 Initializing Smart Waste Monitoring System...');
    this.mapManager = new WasteMapManager('map-container');

    // Attempt to load initial data from server or fallback to client simulation
    await this.fetchInitialData();
    this.mapManager.init(this.depot);
    this.render();

    // Start polling or local simulation loop
    this.startPolling();

    // Bind event listeners
    this.bindEvents();
  }

  // Bind UI Controls
  bindEvents() {
    const btnOptimize = document.getElementById('btn-optimize-route');
    if (btnOptimize) {
      btnOptimize.addEventListener('click', () => this.calculateOptimalRoute());
    }

    const btnSimulate = document.getElementById('btn-simulate-step');
    if (btnSimulate) {
      btnSimulate.addEventListener('click', () => this.simulateWasteInflux());
    }

    const btnToggleSim = document.getElementById('btn-toggle-simulation');
    if (btnToggleSim) {
      btnToggleSim.addEventListener('click', () => this.toggleSimulation());
    }

    const btnEmptyAll = document.getElementById('btn-empty-critical');
    if (btnEmptyAll) {
      btnEmptyAll.addEventListener('click', () => this.emptyAllCritical());
    }

    const btnReset = document.getElementById('btn-reset-benchmark');
    if (btnReset) {
      btnReset.addEventListener('click', () => this.resetBenchmark());
    }

    const btnModalOpen = document.getElementById('btn-open-tech-modal');
    const btnModalClose = document.getElementById('btn-close-tech-modal');
    const techModal = document.getElementById('tech-specs-modal');
    if (btnModalOpen && techModal) {
      btnModalOpen.addEventListener('click', () => techModal.classList.remove('hidden'));
    }
    if (btnModalClose && techModal) {
      btnModalClose.addEventListener('click', () => techModal.classList.add('hidden'));
    }
  }

  // Fetch initial data
  async fetchInitialData() {
    try {
      const [depotRes, binsRes] = await Promise.all([
        fetch(`${this.apiBase}/api/depot`).then(r => r.json()),
        fetch(`${this.apiBase}/api/bins`).then(r => r.json())
      ]);

      if (depotRes.success && binsRes.success) {
        this.depot = depotRes.depot;
        this.bins = binsRes.bins;
        this.isOfflineMode = false;
        this.updateNetworkBadge(true);
        return;
      }
    } catch (e) {
      console.warn('Backend server not directly reachable via HTTP, activating standalone in-memory mode:', e.message);
      this.isOfflineMode = true;
      this.initOfflineState();
      this.updateNetworkBadge(false);
    }
  }

  // Offline Fallback Data Initialization
  initOfflineState() {
    this.bins = [
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
    this.enrichClientBins();
  }

  enrichClientBins() {
    this.bins.forEach(b => {
      b.distanceCm = Math.max(2, Math.round(b.depthCm * (1 - b.fillLevel / 100)));
      b.status = b.fillLevel >= 80 ? 'CRITICAL' : b.fillLevel >= 50 ? 'WARNING' : 'NORMAL';
      b.isCritical = b.fillLevel >= 80;
    });
  }

  updateNetworkBadge(online) {
    const badge = document.getElementById('network-status-badge');
    if (badge) {
      if (online) {
        badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Node.js IoT Server Live`;
        badge.className = 'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200';
      } else {
        badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-blue-500"></span> Standalone Browser Mode`;
        badge.className = 'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200';
      }
    }
  }

  // Periodic polling / synchronization
  startPolling() {
    if (this.pollInterval) clearInterval(this.pollInterval);

    this.pollInterval = setInterval(async () => {
      if (!this.isOfflineMode) {
        try {
          const res = await fetch(`${this.apiBase}/api/bins`);
          const data = await res.json();
          if (data.success) {
            this.bins = data.bins;
            this.checkCriticalAlerts();
            this.render();
          }
        } catch (e) {
          // If server went down, switch to offline mode
          this.isOfflineMode = true;
          this.updateNetworkBadge(false);
        }
      } else if (this.simulationRunning) {
        // Run client-side simulation tick
        this.clientSimulationTick();
        this.render();
      }
    }, 4000);
  }

  clientSimulationTick() {
    this.bins.forEach(b => {
      if (Math.random() > 0.4) {
        b.fillLevel = Math.min(100, b.fillLevel + Math.floor(Math.random() * 4) + 2);
        b.batteryLevel = Math.max(15, Number((b.batteryLevel - 0.05).toFixed(1)));
        b.lastUpdated = new Date().toISOString();
      }
    });
    this.enrichClientBins();
    this.checkCriticalAlerts();
  }

  checkCriticalAlerts() {
    const currentCritical = new Set(this.bins.filter(b => b.fillLevel >= 80).map(b => b.id));
    // Detect newly critical bins
    currentCritical.forEach(id => {
      if (!this.lastCriticalIds.has(id)) {
        const bin = this.bins.find(b => b.id === id);
        this.showToast(`🚨 ALERT: ${bin ? bin.name : id} exceeded 80% capacity! Route pickup recommended.`, 'error');
      }
    });
    this.lastCriticalIds = currentCritical;
  }

  // Calculate Optimal Route
  async calculateOptimalRoute() {
    const btn = document.getElementById('btn-optimize-route');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg> Optimizing Route...
      `;
    }

    try {
      if (!this.isOfflineMode) {
        const res = await fetch(`${this.apiBase}/api/route/optimize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ threshold: 80 })
        });
        const data = await res.json();
        if (data.success) {
          this.currentRoute = data.routePlan;
          this.environmentalMetrics = data.environmentalMetrics;
          this.applyRouteResult();
          this.showToast(`✅ Route optimized! ${data.criticalBinsCount} critical dustbins scheduled for pickup.`, 'success');
        }
      } else {
        // Run client-side optimization logic
        this.calculateClientRoute();
        this.applyRouteResult();
        this.showToast(`✅ Route optimized! ${this.currentRoute.stopsCount} critical dustbins scheduled.`, 'success');
      }
    } catch (e) {
      console.error('Route calculation error:', e);
      this.calculateClientRoute();
      this.applyRouteResult();
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `
          <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg> Calculate Optimal Pickup Route
        `;
      }
    }
  }

  calculateClientRoute() {
    const critical = this.bins.filter(b => b.fillLevel >= 80);
    if (critical.length === 0) {
      this.currentRoute = {
        orderedRoute: [this.depot],
        stops: [],
        totalDistanceKm: 0,
        estimatedDurationMinutes: 0,
        legs: [],
        stopsCount: 0,
        wasteCollectedLiters: 0
      };
      this.environmentalMetrics = {
        distSavedKm: 0,
        fuelSavedL: 0,
        co2SavedKg: 0,
        fuelEfficiencyGainPct: 0
      };
      return;
    }

    // Nearest neighbor algorithm
    const unvisited = [...critical];
    let current = this.depot;
    const orderedStops = [];
    let totalDist = 0;
    const legs = [];

    while (unvisited.length > 0) {
      let nearestIdx = 0;
      let shortestDist = Infinity;
      for (let i = 0; i < unvisited.length; i++) {
        const d = this.haversine(current.lat, current.lng, unvisited[i].lat, unvisited[i].lng);
        if (d < shortestDist) {
          shortestDist = d;
          nearestIdx = i;
        }
      }
      const nextStop = unvisited.splice(nearestIdx, 1)[0];
      legs.push({ from: current.name, to: nextStop.name, distanceKm: Number(shortestDist.toFixed(2)) });
      totalDist += shortestDist;
      orderedStops.push(nextStop);
      current = nextStop;
    }

    const returnDist = this.haversine(current.lat, current.lng, this.depot.lat, this.depot.lng);
    legs.push({ from: current.name, to: this.depot.name + ' (Return)', distanceKm: Number(returnDist.toFixed(2)) });
    totalDist += returnDist;

    // Baseline route calculation (visiting all 5 bins)
    const baselineDist = 9.4; // Benchmark roundtrip across all 5 bins
    const distSaved = Math.max(0, baselineDist - totalDist);
    const fuelSaved = distSaved * 0.34;
    const co2Saved = fuelSaved * 2.68;

    this.currentRoute = {
      orderedRoute: [this.depot, ...orderedStops, this.depot],
      stops: orderedStops,
      totalDistanceKm: Number(totalDist.toFixed(2)),
      estimatedDurationMinutes: Math.round((totalDist / 25) * 60 + (orderedStops.length * 4)),
      legs,
      stopsCount: orderedStops.length,
      wasteCollectedLiters: orderedStops.reduce((sum, b) => sum + Math.round((b.fillLevel / 100) * b.capacityLiters), 0)
    };

    this.environmentalMetrics = {
      distSavedKm: Number(distSaved.toFixed(2)),
      fuelSavedL: Number(fuelSaved.toFixed(2)),
      co2SavedKg: Number(co2Saved.toFixed(2)),
      fuelEfficiencyGainPct: Math.round((distSaved / baselineDist) * 100)
    };
  }

  haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  applyRouteResult() {
    if (this.currentRoute && this.mapManager) {
      this.mapManager.drawRoute(this.currentRoute.orderedRoute);
      this.mapManager.renderBins(this.bins, this.currentRoute.stops || []);
    }
    this.renderRoutePanel();
    this.renderEnvironmentalMetrics();
  }

  // Trigger manual simulation tick
  async simulateWasteInflux() {
    if (!this.isOfflineMode) {
      try {
        const res = await fetch(`${this.apiBase}/api/bins/simulate`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          this.bins = data.bins;
        }
      } catch (e) {
        this.clientSimulationTick();
      }
    } else {
      this.clientSimulationTick();
    }
    this.render();
    this.showToast('📈 Simulated footfall trash accumulation.', 'info');
  }

  // Toggle auto simulation
  async toggleSimulation() {
    this.simulationRunning = !this.simulationRunning;
    if (!this.isOfflineMode) {
      try {
        await fetch(`${this.apiBase}/api/simulation/toggle`, { method: 'POST' });
      } catch (e) {}
    }
    this.updateSimulationButton();
    this.showToast(this.simulationRunning ? '▶️ Auto-simulation resumed' : '⏸️ Auto-simulation paused', 'info');
  }

  updateSimulationButton() {
    const btn = document.getElementById('btn-toggle-simulation');
    if (btn) {
      if (this.simulationRunning) {
        btn.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-1.5"></span> Auto-Fill: ON`;
        btn.className = 'px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-900/60 text-emerald-200 border border-emerald-700/50 hover:bg-emerald-800 transition flex items-center';
      } else {
        btn.innerHTML = `<span class="w-2 h-2 rounded-full bg-slate-400 mr-1.5"></span> Auto-Fill: OFF`;
        btn.className = 'px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition flex items-center';
      }
    }
  }

  // Empty single dustbin
  async emptySingleBin(binId) {
    if (!this.isOfflineMode) {
      try {
        const res = await fetch(`${this.apiBase}/api/bins/${binId}/empty`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          const idx = this.bins.findIndex(b => b.id.toLowerCase() === binId.toLowerCase());
          if (idx !== -1) this.bins[idx] = data.bin;
        }
      } catch (e) {
        this.emptyClientBin(binId);
      }
    } else {
      this.emptyClientBin(binId);
    }

    // Refresh route if active
    if (this.currentRoute && this.currentRoute.stopsCount > 0) {
      this.calculateOptimalRoute();
    }

    this.render();
    this.showToast(`🗑️ Bin ${binId} emptied and ultrasonic sensor calibrated to 0% fill.`, 'success');
  }

  emptyClientBin(binId) {
    const bin = this.bins.find(b => b.id.toLowerCase() === binId.toLowerCase());
    if (bin) {
      bin.fillLevel = Math.floor(Math.random() * 3) + 2;
      bin.lastUpdated = new Date().toISOString();
      this.enrichClientBins();
    }
  }

  // Empty all critical dustbins
  async emptyAllCritical() {
    if (!this.isOfflineMode) {
      try {
        const res = await fetch(`${this.apiBase}/api/bins/empty-critical`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          this.bins = data.bins;
        }
      } catch (e) {
        this.emptyAllClientCritical();
      }
    } else {
      this.emptyAllClientCritical();
    }

    if (this.mapManager) {
      this.mapManager.clearRoute();
      this.currentRoute = null;
    }
    this.render();
    this.renderRoutePanel();
    this.showToast('🚛 Driver completed pickup: All critical bins emptied!', 'success');
  }

  emptyAllClientCritical() {
    this.bins.forEach(b => {
      if (b.fillLevel >= 80) {
        b.fillLevel = Math.floor(Math.random() * 3) + 2;
        b.lastUpdated = new Date().toISOString();
      }
    });
    this.enrichClientBins();
  }

  // Reset benchmark data
  async resetBenchmark() {
    if (!this.isOfflineMode) {
      try {
        const res = await fetch(`${this.apiBase}/api/bins/reset`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          this.bins = data.bins;
        }
      } catch (e) {
        this.initOfflineState();
      }
    } else {
      this.initOfflineState();
    }

    if (this.mapManager) {
      this.mapManager.clearRoute();
      this.currentRoute = null;
    }
    this.render();
    this.renderRoutePanel();
    this.showToast('🔄 Benchmark dataset reset to initial state.', 'info');
  }

  // Render All UI Components
  render() {
    this.renderMetricsCards();
    this.renderBinsList();
    if (this.mapManager) {
      this.mapManager.renderBins(this.bins, (this.currentRoute && this.currentRoute.stops) || []);
    }
  }

  renderMetricsCards() {
    const totalBins = this.bins.length;
    const criticalBins = this.bins.filter(b => b.fillLevel >= 80).length;
    const avgFill = Math.round(this.bins.reduce((acc, b) => acc + b.fillLevel, 0) / (totalBins || 1));

    const elTotal = document.getElementById('metric-total-bins');
    const elCritical = document.getElementById('metric-critical-bins');
    const elAvg = document.getElementById('metric-avg-fill');
    const elTrucks = document.getElementById('metric-active-trucks');

    if (elTotal) elTotal.textContent = totalBins;
    if (elCritical) {
      elCritical.textContent = criticalBins;
      const card = document.getElementById('metric-critical-card');
      if (card) {
        if (criticalBins > 0) {
          card.classList.add('border-red-400', 'bg-red-50/50');
        } else {
          card.classList.remove('border-red-400', 'bg-red-50/50');
        }
      }
    }
    if (elAvg) elAvg.textContent = `${avgFill}%`;
    if (elTrucks) elTrucks.textContent = criticalBins > 0 ? '1 on Dispatch' : 'Standby / Ready';
  }

  renderBinsList() {
    const container = document.getElementById('bins-list-container');
    if (!container) return;

    if (this.bins.length === 0) {
      container.innerHTML = `<div class="p-4 text-center text-gray-500 text-sm">No dustbins connected.</div>`;
      return;
    }

    container.innerHTML = this.bins
      .map((bin) => {
        const isCritical = bin.fillLevel >= 80;
        const isWarning = bin.fillLevel >= 50 && bin.fillLevel < 80;

        const borderClass = isCritical ? 'border-red-300 ring-1 ring-red-200' : isWarning ? 'border-amber-200' : 'border-gray-200';
        const badgeBg = isCritical ? 'bg-red-100 text-red-700' : isWarning ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';
        const progressBg = isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500';

        return `
          <div class="bin-card bg-white p-4 rounded-xl border ${borderClass} shadow-sm transition">
            <div class="flex items-start justify-between gap-2 mb-2">
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-[11px] font-mono px-2 py-0.5 rounded font-bold ${badgeBg}">${bin.id}</span>
                  <span class="text-[11px] text-gray-500 font-medium">${bin.area}</span>
                </div>
                <h4 class="font-bold text-gray-900 text-sm mt-1 cursor-pointer hover:text-blue-600 transition" onclick="window.app.mapManager.focusBin('${bin.id}')">
                  ${bin.name}
                </h4>
              </div>
              <div class="text-right">
                <span class="text-xl font-extrabold ${isCritical ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-emerald-600'}">
                  ${bin.fillLevel}%
                </span>
                <span class="block text-[10px] text-gray-400 uppercase font-semibold">Capacity</span>
              </div>
            </div>

            <!-- Progress Bar -->
            <div class="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden mb-3">
              <div class="h-2.5 rounded-full transition-all duration-700 ${progressBg}" style="width: ${bin.fillLevel}%"></div>
            </div>

            <!-- Sensor Telemetry Details -->
            <div class="grid grid-cols-2 gap-2 text-xs mb-3">
              <div class="bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center gap-2">
                <div class="w-7 h-7 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                  📶
                </div>
                <div>
                  <div class="text-[10px] text-gray-400 font-medium leading-none">Ultrasonic Depth</div>
                  <div class="font-bold text-slate-800 text-xs mt-0.5">${bin.distanceCm} cm to sensor</div>
                </div>
              </div>

              <div class="bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center gap-2">
                <div class="w-7 h-7 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                  🔋
                </div>
                <div>
                  <div class="text-[10px] text-gray-400 font-medium leading-none">Battery & Solar</div>
                  <div class="font-bold text-slate-800 text-xs mt-0.5">${bin.batteryLevel}% remaining</div>
                </div>
              </div>
            </div>

            <!-- Card Actions -->
            <div class="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
              <span class="text-gray-400 text-[11px] truncate max-w-[170px]" title="${bin.wasteType}">
                🗑️ ${bin.wasteType}
              </span>
              <div class="flex items-center gap-2">
                <button 
                  onclick="window.app.mapManager.focusBin('${bin.id}')"
                  class="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded hover:bg-blue-50 transition">
                  Locate
                </button>
                <button 
                  onclick="window.app.emptySingleBin('${bin.id}')"
                  class="px-2.5 py-1 text-xs font-semibold rounded-lg ${
                    isCritical ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  } transition flex items-center gap-1 shadow-sm">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Empty
                </button>
              </div>
            </div>
          </div>
        `;
      })
      .join('');
  }

  renderRoutePanel() {
    const container = document.getElementById('route-plan-container');
    if (!container) return;

    if (!this.currentRoute || this.currentRoute.stopsCount === 0) {
      container.innerHTML = `
        <div class="p-6 text-center text-gray-400">
          <div class="w-12 h-12 mx-auto mb-2 text-gray-300">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <p class="text-sm font-semibold text-gray-600">No Active Collection Route</p>
          <p class="text-xs text-gray-400 mt-1">Click "Calculate Optimal Pickup Route" above to generate a fuel-optimized schedule for critical bins.</p>
        </div>
      `;
      return;
    }

    const { totalDistanceKm, estimatedDurationMinutes, wasteCollectedLiters, legs, stops } = this.currentRoute;

    container.innerHTML = `
      <div class="space-y-4">
        <!-- Route Summary Header -->
        <div class="bg-gradient-to-br from-indigo-900 to-blue-900 text-white p-4 rounded-xl shadow-sm">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-semibold uppercase tracking-wider text-blue-200">Municipal Dispatch Order</span>
            <span class="bg-indigo-500/40 text-blue-200 text-xs px-2.5 py-0.5 rounded-full border border-indigo-400/30">
              TSP Optimized (Nearest Neighbor)
            </span>
          </div>

          <div class="grid grid-cols-3 gap-2 text-center pt-1 border-t border-indigo-800/60">
            <div>
              <span class="text-xs text-blue-200 block">Total Distance</span>
              <span class="text-lg font-extrabold text-white">${totalDistanceKm} km</span>
            </div>
            <div>
              <span class="text-xs text-blue-200 block">Est. Time</span>
              <span class="text-lg font-extrabold text-white">${estimatedDurationMinutes} min</span>
            </div>
            <div>
              <span class="text-xs text-blue-200 block">Waste Volume</span>
              <span class="text-lg font-extrabold text-white">${wasteCollectedLiters} L</span>
            </div>
          </div>
        </div>

        <!-- Stop Sequence List -->
        <div>
          <h5 class="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Turn-by-Turn Waypoints:</h5>
          <div class="space-y-2 max-h-56 overflow-y-auto pr-1">
            <!-- Start at Depot -->
            <div class="flex items-start gap-2.5 p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-lg text-xs">
              <span class="w-6 h-6 rounded-full bg-blue-700 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                DEP
              </span>
              <div class="flex-1">
                <span class="font-bold text-blue-900 block">${this.depot.name}</span>
                <span class="text-[11px] text-blue-700">Sanitation truck departs from central facility</span>
              </div>
            </div>

            <!-- Stops -->
            ${stops
              .map((stop, i) => {
                const leg = legs[i];
                return `
                  <div class="flex items-start gap-2.5 p-2.5 bg-white border border-gray-200 rounded-lg text-xs hover:border-blue-300 transition">
                    <span class="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px] shadow-sm">
                      #${i + 1}
                    </span>
                    <div class="flex-1">
                      <div class="flex items-center justify-between">
                        <span class="font-bold text-gray-900">${stop.name}</span>
                        <span class="text-red-600 font-bold font-mono text-[11px]">${stop.fillLevel}% Full</span>
                      </div>
                      <div class="flex items-center justify-between text-[11px] text-gray-500 mt-1">
                        <span>Leg distance: <strong>${leg ? leg.distanceKm : 0} km</strong></span>
                        <span>Capacity: ${stop.capacityLiters}L (${stop.wasteType})</span>
                      </div>
                    </div>
                  </div>
                `;
              })
              .join('')}

            <!-- Return to Depot -->
            <div class="flex items-start gap-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <span class="w-6 h-6 rounded-full bg-slate-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                END
              </span>
              <div class="flex-1">
                <span class="font-bold text-slate-800 block">${this.depot.name} (Return)</span>
                <span class="text-[11px] text-slate-600">Discharge waste at recycling & composting station</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderEnvironmentalMetrics() {
    if (!this.environmentalMetrics) return;

    const { distSavedKm, fuelSavedL, co2SavedKg, fuelEfficiencyGainPct } = this.environmentalMetrics;

    const elDist = document.getElementById('env-dist-saved');
    const elFuel = document.getElementById('env-fuel-saved');
    const elCo2 = document.getElementById('env-co2-saved');
    const elPct = document.getElementById('env-efficiency-pct');

    if (elDist) elDist.textContent = `${distSavedKm} km`;
    if (elFuel) elFuel.textContent = `${fuelSavedL} L`;
    if (elCo2) elCo2.textContent = `${co2SavedKg} kg`;
    if (elPct) elPct.textContent = `${fuelEfficiencyGainPct}%`;
  }

  // Toast Notification System
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const bg =
      type === 'error'
        ? 'bg-red-900 text-red-100 border-red-700'
        : type === 'success'
        ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
        : 'bg-slate-900 text-slate-100 border-slate-700';

    toast.className = `p-3 rounded-xl border ${bg} shadow-lg text-xs font-medium flex items-center justify-between gap-3 transform transition-all duration-300 translate-y-2 opacity-0`;
    toast.innerHTML = `
      <span>${message}</span>
      <button class="text-white/70 hover:text-white" onclick="this.parentElement.remove()">✕</button>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    });

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }
}

// Global bootstrap
document.addEventListener('DOMContentLoaded', () => {
  window.app = new SmartWasteApp();
  window.app.init();
});
