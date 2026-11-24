/**
 * Leaflet Map Controller for Smart Waste Monitoring & Route Optimization
 */

class WasteMapManager {
  constructor(containerId) {
    this.containerId = containerId;
    this.map = null;
    this.depotMarker = null;
    this.binMarkers = new Map();
    this.routePolyline = null;
    this.routeDecorator = null;
    this.onEmptyBinCallback = null;
  }

  // Initialize Map
  init(depot) {
    if (this.map) return;

    // Center on depot
    this.map = L.map(this.containerId, {
      zoomControl: true,
      attributionControl: true
    }).setView([depot.lat, depot.lng], 15);

    // OpenStreetMap standard tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors | EVS IoT Waste Monitoring'
    }).addTo(this.map);

    // Add Depot Marker
    this.renderDepotMarker(depot);
  }

  renderDepotMarker(depot) {
    const depotIcon = L.divIcon({
      className: 'depot-marker-wrapper',
      html: `
        <div class="depot-marker" title="${depot.name}">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v7c0 .6.4 1 1 1h2m10 0a2 2 0 104 0m-4 0a2 2 0 11-4 0m-6 0a2 2 0 104 0m-4 0a2 2 0 11-4 0">
            </path>
          </svg>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });

    this.depotMarker = L.marker([depot.lat, depot.lng], { icon: depotIcon }).addTo(this.map);
    this.depotMarker.bindPopup(`
      <div class="p-1 max-w-xs">
        <div class="flex items-center gap-2 mb-2">
          <span class="inline-block w-3 h-3 rounded-full bg-blue-600"></span>
          <h4 class="font-bold text-gray-900 text-sm">Central Municipal Depot</h4>
        </div>
        <p class="text-xs text-gray-600 mb-1"><strong>Location:</strong> ${depot.address || 'Central District'}</p>
        <p class="text-xs text-gray-600 mb-2"><strong>Fleet:</strong> ${depot.trucksAvailable || 3} Sanitation Trucks (${depot.trucksActive || 1} Active)</p>
        <div class="text-[11px] bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200">
          Base departure & recycling discharge terminal
        </div>
      </div>
    `);
  }

  // Update or render dustbin markers
  renderBins(bins, routeStopsOrder = []) {
    if (!this.map) return;

    // Map stop sequence if route is active
    const stopSequenceMap = new Map();
    routeStopsOrder.forEach((stop, index) => {
      stopSequenceMap.set(stop.id, index + 1);
    });

    bins.forEach((bin) => {
      const pinClass =
        bin.fillLevel >= 80
          ? 'bin-pin-critical'
          : bin.fillLevel >= 50
          ? 'bin-pin-warning'
          : 'bin-pin-safe';

      const stopSeq = stopSequenceMap.get(bin.id);
      const stopBadgeHtml = stopSeq
        ? `<div class="stop-sequence-badge" title="Stop #${stopSeq}">#${stopSeq}</div>`
        : '';

      const iconHtml = `
        <div style="position: relative; width: 40px; height: 40px;">
          <div class="bin-marker-pin ${pinClass}">
            <span>${bin.fillLevel}%</span>
          </div>
          ${stopBadgeHtml}
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'bin-marker-icon',
        html: iconHtml,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
      });

      const popupHtml = `
        <div class="p-1 min-w-[240px]">
          <div class="flex items-center justify-between gap-2 border-b pb-2 mb-2">
            <div>
              <span class="text-[10px] font-mono px-1.5 py-0.5 rounded ${
                bin.fillLevel >= 80 ? 'bg-red-100 text-red-700' : bin.fillLevel >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
              } font-semibold">${bin.id}</span>
              <h4 class="font-bold text-gray-900 text-xs mt-1 leading-tight">${bin.name}</h4>
            </div>
            ${stopSeq ? `<span class="bg-indigo-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm">Pickup #${stopSeq}</span>` : ''}
          </div>

          <div class="space-y-1.5 text-xs text-gray-600 mb-3">
            <div>
              <div class="flex justify-between text-[11px] mb-1">
                <span class="font-medium text-gray-700">Capacity Fill Level:</span>
                <span class="font-bold ${bin.fillLevel >= 80 ? 'text-red-600' : bin.fillLevel >= 50 ? 'text-amber-600' : 'text-emerald-600'}">${bin.fillLevel}%</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div class="h-2 rounded-full transition-all duration-500 ${
                  bin.fillLevel >= 80 ? 'bg-red-500' : bin.fillLevel >= 50 ? 'bg-amber-500' : 'bg-emerald-500'
                }" style="width: ${bin.fillLevel}%"></div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-1 pt-1 text-[11px]">
              <div class="bg-slate-50 p-1.5 rounded border border-slate-100">
                <span class="text-gray-400 block text-[9px] uppercase font-semibold">Ultrasonic Distance</span>
                <span class="font-semibold text-slate-800">${bin.distanceCm} cm from sensor</span>
              </div>
              <div class="bg-slate-50 p-1.5 rounded border border-slate-100">
                <span class="text-gray-400 block text-[9px] uppercase font-semibold">Battery / Solar</span>
                <span class="font-semibold text-slate-800">🔋 ${bin.batteryLevel}%</span>
              </div>
            </div>

            <div class="text-[11px] text-gray-500">
              <span class="text-gray-400">Waste Stream:</span> <strong>${bin.wasteType}</strong>
            </div>
          </div>

          <button 
            onclick="window.app.emptySingleBin('${bin.id}')"
            class="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Empty Dustbin Now
          </button>
        </div>
      `;

      if (this.binMarkers.has(bin.id)) {
        const marker = this.binMarkers.get(bin.id);
        marker.setIcon(customIcon);
        marker.setLatLng([bin.lat, bin.lng]);
        marker.setPopupContent(popupHtml);
      } else {
        const marker = L.marker([bin.lat, bin.lng], { icon: customIcon }).addTo(this.map);
        marker.bindPopup(popupHtml);
        this.binMarkers.set(bin.id, marker);
      }
    });
  }

  // Draw Route Polyline
  drawRoute(orderedRoute) {
    this.clearRoute();

    if (!orderedRoute || orderedRoute.length < 2) return;

    const latlngs = orderedRoute.map((point) => [point.lat, point.lng]);

    // Outer glow line
    const glowLine = L.polyline(latlngs, {
      color: '#3b82f6',
      weight: 8,
      opacity: 0.35,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(this.map);

    // Core active route polyline
    const mainLine = L.polyline(latlngs, {
      color: '#1d4ed8',
      weight: 4,
      dashArray: '8, 8',
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(this.map);

    this.routePolyline = L.layerGroup([glowLine, mainLine]).addTo(this.map);

    // Zoom/pan to fit route
    this.map.fitBounds(mainLine.getBounds(), { padding: [50, 50], maxZoom: 16 });
  }

  clearRoute() {
    if (this.routePolyline) {
      this.map.removeLayer(this.routePolyline);
      this.routePolyline = null;
    }
  }

  // Focus a specific bin on map
  focusBin(binId) {
    if (this.binMarkers.has(binId)) {
      const marker = this.binMarkers.get(binId);
      this.map.setView(marker.getLatLng(), 16, { animate: true });
      marker.openPopup();
    }
  }
}

window.WasteMapManager = WasteMapManager;
