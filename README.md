# IoT-Enabled Smart Waste Monitoring and Route Optimization System

> **Environmental Studies (EVS) Engineering Prototype**  
> An autonomous end-to-end IoT and geospatial routing solution designed to eliminate municipal trash overflow, minimize sanitation truck fuel consumption, and reduce greenhouse gas emissions.

---

## 1. Project Overview & Environmental Benefits

Traditional municipal solid waste management relies on fixed, periodic collection schedules. Sanitation trucks visit all bins regardless of whether they are full or empty. This traditional model causes severe environmental and operational issues:

1. **Unnecessary Fuel Consumption & Emissions**: Sanitation trucks consume heavy diesel (~0.34 L/km) driving to empty or half-empty bins, contributing to urban smog, NOx, and CO2 emissions.
2. **Waste Overflow & Public Health Hazards**: Bins in high-footfall areas overflow before the next scheduled sweep, scattering plastic debris, generating foul odor, fostering disease vectors (flies, rodents, mosquitoes), and releasing contaminated leachate into urban storm drains and groundwater aquifers.

### Core Environmental Benefits of this System
- **35% – 50% Reduction in Route Distance**: Sanitation trucks are dispatched strictly to bins requiring urgent servicing (capacity &ge; 80%).
- **Significant Carbon Abatement**: Saves ~1.5 to 2.5 Liters of diesel and prevents ~4.0 to 7.0 kg of CO2e per collection circuit.
- **Leachate & Plastic Pollution Prevention**: Timely threshold-based alerts stop trash from spilling into street gutters and contaminating natural water bodies.
- **Resource Recovery Optimization**: Categorized waste monitoring (recyclables, organic, plastic) supports segregated recycling processing.

---

## 2. Hardware & IoT Architecture

```
  +-----------------------------------------------------------------------+
  |                        SMART DUSTBIN UNIT                             |
  |                                                                       |
  |   +-----------------------+              +------------------------+   |
  |   | JSN-SR04T / HC-SR04   |  40 kHz Echo | ESP32-WROOM-32         |   |
  |   | Waterproof Ultrasonic | -----------> | Microcontroller        |   |
  |   | Distance Sensor       |              | (Deep Sleep / Active)  |   |
  |   +-----------------------+              +-----------+------------+   |
  |                                                      |                |
  |   +-----------------------+                          | Wi-Fi / LoRa / |
  |   | 3.7V 18650 Li-ion     |                          | Cellular GSM   |
  |   | Battery + Solar Panel |                          |                |
  |   +-----------------------+                          v                |
  +------------------------------------------------------+----------------+
                                                         |
                                                         | JSON Telemetry Payload
                                                         v
                                           +----------------------------+
                                           | Central Municipal Server   |
                                           | (Node.js REST API & Engine)|
                                           +--------------+-------------+
                                                          |
                                      +-------------------+-------------------+
                                      |                                       |
                                      v                                       v
                        +---------------------------+           +---------------------------+
                        | Driver & Admin Dashboard  |           | Dynamic Route Optimizer   |
                        | (Leaflet Map & Telemetry) |           | (Haversine + 2-Opt TSP)   |
                        +---------------------------+           +---------------------------+
```

### Component Breakdown
1. **Ultrasonic Sensor (HC-SR04 / JSN-SR04T Waterproof)**:
   - Mounted at the inner roof of the dustbin (100 cm depth).
   - Measures time-of-flight of 40 kHz acoustic pulses reflected from trash surface.
   - Computes real-time fill level percentage:
     $$\text{Fill Level (\%)} = \left( \frac{\text{Total Depth} - \text{Measured Distance}}{\text{Total Depth}} \right) \times 100$$
2. **ESP32 Microcontroller**:
   - Ultra-low-power dual-core MCU.
   - Wakes up every 15 minutes or upon optical lid-trigger, measures distance and battery voltage, transmits an encrypted JSON telemetry packet, and returns to deep sleep (<10 µA).
3. **Power Management**:
   - 3.7V 2600 mAh Li-ion rechargeable battery coupled with a 5V 1W top-lid solar photovoltaic panel for continuous off-grid operation.
4. **Cloud / Central Municipal Server**:
   - Ingests telemetry, detects critical thresholds (>80%), executes route optimization algorithms, and serves the real-time driver dashboard.

---

## 3. Mathematical & Algorithmic Models

### A. Great-Circle Haversine Distance
The distance $d$ between two geospatial points $(\phi_1, \lambda_1)$ and $(\phi_2, \lambda_2)$ on Earth (radius $R = 6371\text{ km}$):
$$a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)$$
$$d = 2R \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1 - a}\right)$$

### B. Route Optimization (Traveling Salesperson Problem)
- Filters bins where $\text{Fill Level} \ge 80\%$.
- Solves for the minimal-length Hamiltonian cycle starting from the Central Municipal Depot, visiting all critical nodes, and returning to the Depot/Recovery Facility.

### C. Environmental Quantification Formulas
- **Fuel Saved**:
  $$\text{Fuel Saved (L)} = (\text{Baseline Distance} - \text{Optimized Distance}) \times 0.34\text{ L/km}$$
- **CO2 Avoided**:
  $$\text{CO}_2\text{ Saved (kg)} = \text{Fuel Saved (L)} \times 2.68\text{ kg CO}_2\text{e/L}$$

---

## 4. Project File Structure

```
evs_proj/
├── package.json         # Project metadata and run scripts
├── server.js            # Node.js backend API & IoT simulation engine
├── test.js              # Automated unit, algorithmic & integration test suite
├── README.md            # Comprehensive project documentation
└── public/
    ├── index.html       # Driver & Municipal Dashboard UI
    ├── css/
    │   └── styles.css   # Custom animations, markers, and responsive styling
    └── js/
        ├── map.js       # Leaflet.js map controller & polyline renderer
        └── app.js       # Frontend state management & route calculator
```

---

## 5. Step-by-Step Setup & How to Run

### Option 1: 1-Click Launchers (Easiest & Fastest)
You can launch the entire system with a single double-click:
- **From your Desktop**: Double-click `Launch_Smart_Waste_App.bat` or `Open_Smart_Waste_App.url`.
- **From this folder**: Double-click `START_APP.bat` or `Open_Dashboard.html`.

This starts the server and automatically opens the dashboard in your web browser!

---

### Option 2: Run via Terminal (Node.js Server)
If you prefer running commands manually:
1. Open PowerShell or Command Prompt:
   ```bash
   cd c:\Users\dhars\OneDrive\Desktop\evs_proj
   ```
2. Start the application:
   ```bash
   npm start
   ```
3. Open your browser to:
   ```
   http://localhost:3000
   ```

---

### Option 3: Standalone Direct Browser Preview (Offline Mode)
To view without running any server:
- Simply double-click `Open_Dashboard.html` or `public/index.html` in Chrome, Edge, or Firefox.
- The built-in client engine will simulate the sensors and route optimization entirely inside the browser.

---

## 6. How to Use the Dashboard During an EVS Presentation

1. **Observe Initial Bins**: Notice the color-coded markers on the map:
   - 🟢 **Green (<50%)**: Normal/Safe
   - 🟡 **Yellow (50-80%)**: Warning/Moderate
   - 🔴 **Red (>80%)**: Critical/Pulsing Alert
2. **Calculate Optimal Route**: Click **"Calculate Optimal Pickup Route"**.
   - Watch the interactive blue polyline connect the Central Depot directly through the critical bins with stop sequence badges (`#1`, `#2`, `#3`).
   - Review the **Turn-by-Turn Waypoints** and the **EVS Environmental Benefits** card showing exact fuel saved and CO2 emissions avoided.
3. **Simulate Trash Influx**: Click **"+ Waste"** or watch the auto-fill simulation periodically increase bin levels to show real-time urban footfall.
4. **Driver Emptying Action**: Click **"Empty"** on individual bins or click **"Empty All Critical"** to simulate the driver completing collection and resetting the bins to 0%.
5. **View Technical Specs**: Click the **⚙️ Info** button in the top navigation bar to open the full IoT hardware architecture and sustainability report modal.

---

## 7. License
Developed as an Environmental Studies (EVS) prototype for academic and municipal smart city research. Licensed under the MIT License.
