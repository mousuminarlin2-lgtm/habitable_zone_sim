/**
 * Main Application Controller & Simulation Loop
 */
import { PHYSICAL_CONSTANTS, SIM_SCALING, STAR_PRESETS } from './constants.js';
import { PhysicsEngine } from './physics.js';
import { SimulationRenderer } from './renderer.js';
import { kelvinToRGB, getStellarSpectralClass } from './blackbody.js';

class HabitableZoneApp {
  constructor() {
    this.canvas = document.getElementById('simCanvas');
    this.physics = new PhysicsEngine();
    this.renderer = new SimulationRenderer(this.canvas);

    // Active Star
    this.currentStarPreset = STAR_PRESETS[0]; // The Sun
    this.star = {
      mass: this.currentStarPreset.mass * PHYSICAL_CONSTANTS.SOLAR_MASS,
      radius: this.currentStarPreset.radius * PHYSICAL_CONSTANTS.SOLAR_RADIUS,
      luminosity: this.currentStarPreset.luminosity * PHYSICAL_CONSTANTS.SOLAR_LUMINOSITY,
      temp: this.currentStarPreset.temp,
    };
    this.physics.setStar(this.star);

    // Planet state (in physical SI units: meters and m/s)
    const initialDistanceMeters = 1.0 * PHYSICAL_CONSTANTS.AU;
    const initialSpeed = this.physics.getCircularOrbitSpeed(initialDistanceMeters);

    this.planet = {
      x: initialDistanceMeters,
      y: 0,
      vx: 0,
      vy: initialSpeed,
      temp: 288.15,
      flux: PHYSICAL_CONSTANTS.SOLAR_FLUX_1AU,
      distance: initialDistanceMeters,
    };

    // Interaction state
    this.isDragging = false;
    this.hoverPlanet = false;
    this.dragHistory = []; // { x, y, time } for velocity estimation on fling
    this.releaseMode = 'circular'; // 'circular' or 'sling'

    // Simulation controls
    this.isPaused = false;
    this.timeScale = 1.0; // 1.0 = normal orbital speed (~30 Earth days per second)
    // Base simulation time step: 86400 * 0.5 seconds (0.5 Earth days) per animation frame
    this.baseDtSeconds = 86400 * 0.5;

    // Cache DOM UI Elements
    this.initDOM();

    // Event Listeners
    this.bindEvents();

    // Initialize UI values
    this.updateStarUI();
    this.updatePlanetMetrics();

    // Initial camera zoom setup
    this.fitCameraToSystem();

    // Start Simulation Loop
    this.lastTimestamp = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  initDOM() {
    // Readout values
    this.uiDistanceAU = document.getElementById('valDistanceAU');
    this.uiDistanceKm = document.getElementById('valDistanceKm');
    this.uiFlux = document.getElementById('valFlux');
    this.uiFluxRel = document.getElementById('valFluxRel');
    this.uiTempK = document.getElementById('valTempK');
    this.uiTempC = document.getElementById('valTempC');
    this.uiTempF = document.getElementById('valTempF');
    this.uiSpeed = document.getElementById('valSpeed');
    this.uiPeriod = document.getElementById('valPeriod');
    this.uiStatusBadge = document.getElementById('statusBadge');
    this.uiStatusDesc = document.getElementById('statusDesc');

    // Star UI
    this.uiStarSelect = document.getElementById('starPresetSelect');
    this.uiStarTemp = document.getElementById('starTempSlider');
    this.uiStarTempDisplay = document.getElementById('starTempDisplay');
    this.uiStarMassDisplay = document.getElementById('starMassDisplay');
    this.uiStarLumDisplay = document.getElementById('starLumDisplay');
    this.uiStarTypeBadge = document.getElementById('starTypeBadge');

    // Controls
    this.btnPause = document.getElementById('btnPause');
    this.btnReset = document.getElementById('btnReset');
    this.btnSnapHZ = document.getElementById('btnSnapHZ');
    this.btnZoomIn = document.getElementById('btnZoomIn');
    this.btnZoomOut = document.getElementById('btnZoomOut');
    this.btnZoomFit = document.getElementById('btnZoomFit');
    this.timeSlider = document.getElementById('timeSlider');
    this.timeDisplay = document.getElementById('timeDisplay');
    this.releaseModeSelect = document.getElementById('releaseModeSelect');

    // Populate preset dropdown
    this.uiStarSelect.innerHTML = STAR_PRESETS.map(preset => 
      `<option value="${preset.id}">${preset.name}</option>`
    ).join('');
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.renderer.resize();
    });

    // Pointer events on canvas for drag & drop
    this.canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
    window.addEventListener('pointermove', this.onPointerMove.bind(this));
    window.addEventListener('pointerup', this.onPointerUp.bind(this));
    window.addEventListener('pointercancel', this.onPointerUp.bind(this));

    // Mouse wheel zoom
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
      this.setZoom(this.renderer.zoom * zoomFactor);
    }, { passive: false });

    // UI Buttons
    this.btnPause.addEventListener('click', () => {
      this.isPaused = !this.isPaused;
      this.btnPause.innerHTML = this.isPaused ? '▶ Play' : '⏸ Pause';
      this.btnPause.classList.toggle('active', this.isPaused);
    });

    this.btnReset.addEventListener('click', () => {
      this.resetPlanetOrbit();
    });

    this.btnSnapHZ.addEventListener('click', () => {
      this.snapPlanetToHabitableZone();
    });

    this.btnZoomIn.addEventListener('click', () => {
      this.setZoom(this.renderer.zoom * 1.25);
    });

    this.btnZoomOut.addEventListener('click', () => {
      this.setZoom(this.renderer.zoom * 0.8);
    });

    this.btnZoomFit.addEventListener('click', () => {
      this.fitCameraToSystem();
    });

    this.timeSlider.addEventListener('input', (e) => {
      this.timeScale = parseFloat(e.target.value);
      this.timeDisplay.textContent = `${this.timeScale.toFixed(1)}x`;
    });

    this.releaseModeSelect.addEventListener('change', (e) => {
      this.releaseMode = e.target.value;
    });

    // Star Preset Change
    this.uiStarSelect.addEventListener('change', (e) => {
      const presetId = e.target.value;
      const preset = STAR_PRESETS.find(p => p.id === presetId);
      if (preset) {
        this.selectStarPreset(preset);
      }
    });

    // Star Temperature Slider (interactive blackbody adjustment)
    this.uiStarTemp.addEventListener('input', (e) => {
      const tempK = parseInt(e.target.value, 10);
      this.setCustomStarTemperature(tempK);
    });
  }

  setZoom(newZoom) {
    this.renderer.zoom = Math.max(0.04, Math.min(25.0, newZoom));
  }

  fitCameraToSystem() {
    const hz = this.physics.getHabitableZoneBoundaries();
    // Want the outer HZ boundary to take roughly 40% of the viewport radius
    const screenHalfMin = Math.min(this.renderer.width, this.renderer.height) * 0.4;
    const hzOuterPxAtZoom1 = (hz.outerMeters / PHYSICAL_CONSTANTS.AU) * SIM_SCALING.PIXELS_PER_AU;
    const targetZoom = screenHalfMin / hzOuterPxAtZoom1;
    this.renderer.zoom = Math.max(0.05, Math.min(10.0, targetZoom));
    this.renderer.panX = 0;
    this.renderer.panY = 0;
  }

  selectStarPreset(preset) {
    this.currentStarPreset = preset;
    this.star = {
      mass: preset.mass * PHYSICAL_CONSTANTS.SOLAR_MASS,
      radius: preset.radius * PHYSICAL_CONSTANTS.SOLAR_RADIUS,
      luminosity: preset.luminosity * PHYSICAL_CONSTANTS.SOLAR_LUMINOSITY,
      temp: preset.temp,
    };
    this.physics.setStar(this.star);
    this.uiStarTemp.value = preset.temp;

    this.updateStarUI();
    this.renderer.clearTrail();
    this.fitCameraToSystem();
    
    // Automatically move planet to the habitable zone of the new star
    this.snapPlanetToHabitableZone();
  }

  setCustomStarTemperature(tempK) {
    this.star.temp = tempK;
    // Estimate luminosity using Stefan-Boltzmann: L proportional to R^2 * T^4
    // Assume main-sequence mass-luminosity / mass-radius relationship or maintain radius
    const radiusMeters = this.star.radius;
    this.star.luminosity = this.physics.calculateLuminosity(radiusMeters, tempK);
    this.physics.setStar(this.star);

    this.updateStarUI();
    this.updatePlanetMetrics();
  }

  snapPlanetToHabitableZone() {
    const hz = this.physics.getHabitableZoneBoundaries();
    // Midpoint of habitable zone
    const targetDist = (hz.innerMeters + hz.outerMeters) * 0.5;
    
    // Preserve current angle or place on positive X axis
    let angle = Math.atan2(this.planet.y, this.planet.x);
    if (isNaN(angle)) angle = 0;

    this.planet.x = Math.cos(angle) * targetDist;
    this.planet.y = Math.sin(angle) * targetDist;

    // Set circular orbit velocity
    const speed = this.physics.getCircularOrbitSpeed(targetDist);
    this.planet.vx = -Math.sin(angle) * speed;
    this.planet.vy = Math.cos(angle) * speed;

    this.renderer.clearTrail();
    this.updatePlanetMetrics();
  }

  resetPlanetOrbit() {
    const hz = this.physics.getHabitableZoneBoundaries();
    const targetDist = (hz.innerMeters + hz.outerMeters) * 0.5;

    this.planet.x = targetDist;
    this.planet.y = 0;
    const speed = this.physics.getCircularOrbitSpeed(targetDist);
    this.planet.vx = 0;
    this.planet.vy = speed;

    this.renderer.clearTrail();
    this.updatePlanetMetrics();
  }

  updateStarUI() {
    const bbColor = kelvinToRGB(this.star.temp);
    const spectral = getStellarSpectralClass(this.star.temp);
    
    this.uiStarTempDisplay.textContent = `${Math.round(this.star.temp).toLocaleString()} K`;
    this.uiStarMassDisplay.textContent = `${(this.star.mass / PHYSICAL_CONSTANTS.SOLAR_MASS).toFixed(2)} M☉`;
    this.uiStarLumDisplay.textContent = `${(this.star.luminosity / PHYSICAL_CONSTANTS.SOLAR_LUMINOSITY).toExponential(2)} L☉`;
    
    this.uiStarTypeBadge.textContent = `${spectral.type} Class (${spectral.desc})`;
    this.uiStarTypeBadge.style.borderColor = bbColor.rgbString;
    this.uiStarTypeBadge.style.color = bbColor.rgbString;
    this.uiStarTypeBadge.style.boxShadow = `0 0 12px ${bbColor.rgba(0.35)}`;
  }

  updatePlanetMetrics() {
    const distanceMeters = Math.hypot(this.planet.x, this.planet.y);
    this.planet.distance = distanceMeters;

    // Actual flux in W/m^2 and relative solar flux
    const flux = this.physics.calculateFlux(distanceMeters);
    const relFlux = this.physics.calculateRelativeFlux(distanceMeters);
    this.planet.flux = flux;

    // Equilibrium and surface temperature
    const temps = this.physics.calculateTemperatures(distanceMeters);
    this.planet.temp = temps.tsurf;

    // Orbital speed and period
    const speedMs = Math.hypot(this.planet.vx, this.planet.vy);
    const periodSec = this.physics.getOrbitalPeriod(distanceMeters);
    const periodDays = periodSec / 86400;

    // Habitability status
    const habStatus = this.physics.getHabitabilityStatus(temps.tsurf);

    // Update DOM elements
    const distanceAU = distanceMeters / PHYSICAL_CONSTANTS.AU;
    const distanceMillionKm = distanceMeters / 1e9;
    
    this.uiDistanceAU.textContent = `${distanceAU.toFixed(3)} AU`;
    this.uiDistanceKm.textContent = `(${distanceMillionKm.toFixed(1)}M km)`;

    if (flux > 1e6) {
      this.uiFlux.textContent = `${flux.toExponential(2)} W/m²`;
    } else {
      this.uiFlux.textContent = `${Math.round(flux).toLocaleString()} W/m²`;
    }
    this.uiFluxRel.textContent = `(${relFlux.toFixed(2)}x Earth)`;

    this.uiTempK.textContent = `${Math.round(temps.tsurf)} K`;
    this.uiTempC.textContent = `${temps.celsius >= 0 ? '+' : ''}${Math.round(temps.celsius)} °C`;
    this.uiTempF.textContent = `(${Math.round(temps.fahrenheit)} °F)`;

    this.uiSpeed.textContent = `${(speedMs / 1000).toFixed(1)} km/s`;
    
    if (periodDays < 365) {
      this.uiPeriod.textContent = `${periodDays.toFixed(1)} days`;
    } else {
      this.uiPeriod.textContent = `${(periodDays / 365.25).toFixed(2)} yrs`;
    }

    // Status Badge & Description
    this.uiStatusBadge.textContent = habStatus.label;
    this.uiStatusBadge.className = `status-badge ${habStatus.badgeClass}`;
    this.uiStatusDesc.textContent = habStatus.description;
  }

  // Pointer Interaction Handlers
  getPointerWorldPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    return {
      screenX,
      screenY,
      world: this.renderer.screenToWorld(screenX, screenY)
    };
  }

  onPointerDown(e) {
    const { screenX, screenY, world } = this.getPointerWorldPos(e);
    const planetScreen = this.renderer.worldToScreen(this.planet.x, this.planet.y);
    const distToPlanetPx = Math.hypot(screenX - planetScreen.x, screenY - planetScreen.y);

    if (distToPlanetPx <= SIM_SCALING.PLANET_GRAB_RADIUS + 6) {
      this.isDragging = true;
      this.canvas.style.cursor = 'grabbing';
      this.dragHistory = [{ x: world.x, y: world.y, time: performance.now() }];
      
      // Zero out velocity during drag
      this.planet.vx = 0;
      this.planet.vy = 0;
    } else {
      // Pan viewport
      this.isPanning = true;
      this.panStart = {
        screenX,
        screenY,
        initialPanX: this.renderer.panX,
        initialPanY: this.renderer.panY
      };
      this.canvas.style.cursor = 'grabbing';
    }
  }

  onPointerMove(e) {
    const { screenX, screenY, world } = this.getPointerWorldPos(e);
    const planetScreen = this.renderer.worldToScreen(this.planet.x, this.planet.y);
    const distToPlanetPx = Math.hypot(screenX - planetScreen.x, screenY - planetScreen.y);

    if (this.isPanning) {
      this.renderer.panX = this.panStart.initialPanX + (screenX - this.panStart.screenX);
      this.renderer.panY = this.panStart.initialPanY + (screenY - this.panStart.screenY);
      return;
    }

    this.hoverPlanet = distToPlanetPx <= SIM_SCALING.PLANET_GRAB_RADIUS + 6;
    if (!this.isDragging) {
      this.canvas.style.cursor = this.hoverPlanet ? 'grab' : 'crosshair';
      return;
    }

    // While dragging: Update planet position immediately
    // Prevent dragging directly into star center (minimum distance of 1.5 star radii)
    const minDistMeters = this.star.radius * 1.5;
    const dragDist = Math.hypot(world.x, world.y);

    if (dragDist < minDistMeters) {
      const angle = Math.atan2(world.y, world.x) || 0;
      this.planet.x = Math.cos(angle) * minDistMeters;
      this.planet.y = Math.sin(angle) * minDistMeters;
    } else {
      this.planet.x = world.x;
      this.planet.y = world.y;
    }

    // Record drag history for fling velocity calculation
    const now = performance.now();
    this.dragHistory.push({ x: this.planet.x, y: this.planet.y, time: now });
    // Keep last 150ms of drag samples
    this.dragHistory = this.dragHistory.filter(pt => now - pt.time < 150);

    // Live update calculations as user drags
    this.updatePlanetMetrics();
    this.renderer.addTrailPoint(this.planet.x, this.planet.y, this.planet.temp);
  }

  onPointerUp(e) {
    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.style.cursor = this.hoverPlanet ? 'grab' : 'crosshair';
      return;
    }

    if (!this.isDragging) return;

    this.isDragging = false;
    this.canvas.style.cursor = this.hoverPlanet ? 'grab' : 'default';

    const currentDist = Math.hypot(this.planet.x, this.planet.y);
    const angle = Math.atan2(this.planet.y, this.planet.x);

    if (this.releaseMode === 'circular') {
      // Release into a stable circular Keplerian orbit
      const circSpeed = this.physics.getCircularOrbitSpeed(currentDist);
      // Counter-clockwise tangent vector: (-sin theta, cos theta)
      this.planet.vx = -Math.sin(angle) * circSpeed;
      this.planet.vy = Math.cos(angle) * circSpeed;
    } else {
      // Free throw / momentum sling mode
      if (this.dragHistory.length >= 2) {
        const oldest = this.dragHistory[0];
        const latest = this.dragHistory[this.dragHistory.length - 1];
        const dt = (latest.time - oldest.time) / 1000; // in seconds
        
        if (dt > 0.01) {
          // Screen velocity in m/s world coordinates scaled to simulated orbital time
          const simTimeFactor = 1000; // scale mouse speed to celestial velocities
          this.planet.vx = ((latest.x - oldest.x) / dt) * simTimeFactor;
          this.planet.vy = ((latest.y - oldest.y) / dt) * simTimeFactor;
        } else {
          // Fallback to circular if no momentum
          const circSpeed = this.physics.getCircularOrbitSpeed(currentDist);
          this.planet.vx = -Math.sin(angle) * circSpeed;
          this.planet.vy = Math.cos(angle) * circSpeed;
        }
      } else {
        const circSpeed = this.physics.getCircularOrbitSpeed(currentDist);
        this.planet.vx = -Math.sin(angle) * circSpeed;
        this.planet.vy = Math.cos(angle) * circSpeed;
      }
    }

    this.dragHistory = [];
    this.renderer.clearTrail();
    this.updatePlanetMetrics();
  }

  /**
   * Main Simulation & Animation Loop
   */
  loop(timestamp) {
    const deltaMs = Math.min(50, timestamp - this.lastTimestamp);
    this.lastTimestamp = timestamp;

    if (!this.isPaused && !this.isDragging) {
      // Physical orbital integration via Leapfrog (Symplectic Verlet)
      // Number of sub-steps per frame for high numerical accuracy and energy conservation
      const subSteps = 8;
      const effectiveDt = (this.baseDtSeconds * this.timeScale * (deltaMs / 16.67)) / subSteps;

      for (let step = 0; step < subSteps; step++) {
        const nextState = this.physics.leapfrogStep({
          x: this.planet.x,
          y: this.planet.y,
          vx: this.planet.vx,
          vy: this.planet.vy
        }, effectiveDt);

        this.planet.x = nextState.x;
        this.planet.y = nextState.y;
        this.planet.vx = nextState.vx;
        this.planet.vy = nextState.vy;
      }

      // Add point to trail periodically
      this.renderer.addTrailPoint(this.planet.x, this.planet.y, this.planet.temp);
      
      // Update metrics
      this.updatePlanetMetrics();
    }

    // Render Canvas Frame
    this.renderer.render({
      star: this.star,
      planet: this.planet,
      physics: this.physics,
      isDragging: this.isDragging,
      hoverPlanet: this.hoverPlanet
    });

    requestAnimationFrame(this.loop.bind(this));
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  new HabitableZoneApp();
});
