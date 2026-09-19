/**
 * Astrophysical Physics Engine & Leapfrog Integrator
 */
import { PHYSICAL_CONSTANTS } from './constants.js';

export class PhysicsEngine {
  constructor(star = null) {
    this.star = star || {
      mass: PHYSICAL_CONSTANTS.SOLAR_MASS,
      radius: PHYSICAL_CONSTANTS.SOLAR_RADIUS,
      luminosity: PHYSICAL_CONSTANTS.SOLAR_LUMINOSITY,
      temp: PHYSICAL_CONSTANTS.SOLAR_TEMP,
    };
    this.greenhouseFactor = PHYSICAL_CONSTANTS.GREENHOUSE_FACTOR;
    this.albedo = PHYSICAL_CONSTANTS.EARTH_ALBEDO;
  }

  /**
   * Set active star parameters
   * @param {Object} starParams - mass in kg, luminosity in W, temp in K, radius in m
   */
  setStar(starParams) {
    this.star = { ...starParams };
  }

  /**
   * Calculate stellar luminosity using Stefan-Boltzmann law if not explicitly provided:
   * L = 4 * pi * R^2 * sigma * T^4
   */
  calculateLuminosity(radiusMeters, tempKelvin) {
    return 4 * Math.PI * Math.pow(radiusMeters, 2) * PHYSICAL_CONSTANTS.SIGMA * Math.pow(tempKelvin, 4);
  }

  /**
   * Calculate actual incident radiant flux (W/m^2) using inverse-square law:
   * F = L / (4 * pi * d^2)
   * @param {number} distanceMeters - distance from star center to planet
   * @returns {number} Flux in W/m^2
   */
  calculateFlux(distanceMeters) {
    if (distanceMeters <= 0) return Infinity;
    return this.star.luminosity / (4 * Math.PI * Math.pow(distanceMeters, 2));
  }

  /**
   * Calculate flux relative to Earth's solar constant (1 AU from Sun)
   * @param {number} distanceMeters 
   * @returns {number} Solar flux ratio (e.g. 1.0 at 1 AU from Sun)
   */
  calculateRelativeFlux(distanceMeters) {
    const flux = this.calculateFlux(distanceMeters);
    return flux / PHYSICAL_CONSTANTS.SOLAR_FLUX_1AU;
  }

  /**
   * Calculate planet equilibrium temperature and surface temperature:
   * T_eq = [ (1 - A) * F / (4 * sigma) ]^(1/4)
   * T_surf = T_eq * greenhouseFactor
   * @param {number} distanceMeters 
   * @returns {Object} { teq, tsurf, celsius, fahrenheit }
   */
  calculateTemperatures(distanceMeters) {
    const flux = this.calculateFlux(distanceMeters);
    if (!isFinite(flux)) {
      return { teq: Infinity, tsurf: Infinity, celsius: Infinity, fahrenheit: Infinity };
    }

    // Bare rock equilibrium temperature (no atmosphere)
    const absorbedFraction = 1 - this.albedo;
    const teq = Math.pow((absorbedFraction * flux) / (4 * PHYSICAL_CONSTANTS.SIGMA), 0.25);
    
    // Effective surface temperature including atmospheric greenhouse warming
    const tsurf = teq * this.greenhouseFactor;
    const celsius = tsurf - 273.15;
    const fahrenheit = (celsius * 9 / 5) + 32;

    return {
      teq,
      tsurf,
      celsius,
      fahrenheit
    };
  }

  /**
   * Calculate Habitable Zone boundaries in meters:
   * Range of distances where surface temperature keeps water liquid (273.15 K to 373.15 K)
   * Since T_surf = [ (1 - A) * L / (16 * pi * sigma * d^2) ]^(1/4) * f_gh
   * d = sqrt( (1 - A) * L / (16 * pi * sigma * (T / f_gh)^4) )
   * @returns {Object} { innerMeters, outerMeters, innerAU, outerAU }
   */
  getHabitableZoneBoundaries() {
    const L = this.star.luminosity;
    const A = this.albedo;
    const f = this.greenhouseFactor;
    const sigma = PHYSICAL_CONSTANTS.SIGMA;

    const calcDistForTemp = (targetTempK) => {
      const teqTarget = targetTempK / f;
      const numerator = (1 - A) * L;
      const denominator = 16 * Math.PI * sigma * Math.pow(teqTarget, 4);
      return Math.sqrt(numerator / denominator);
    };

    const innerMeters = calcDistForTemp(PHYSICAL_CONSTANTS.TEMP_BOILING); // 373.15 K
    const outerMeters = calcDistForTemp(PHYSICAL_CONSTANTS.TEMP_FREEZING); // 273.15 K

    return {
      innerMeters,
      outerMeters,
      innerAU: innerMeters / PHYSICAL_CONSTANTS.AU,
      outerAU: outerMeters / PHYSICAL_CONSTANTS.AU,
    };
  }

  /**
   * Determine planetary climate zone classification
   * @param {number} tsurfKelvin 
   * @returns {Object} { status, label, color, description }
   */
  getHabitabilityStatus(tsurfKelvin) {
    if (tsurfKelvin > PHYSICAL_CONSTANTS.TEMP_BOILING) {
      return {
        status: 'scorched',
        label: 'SCORCHED',
        badgeClass: 'status-scorched',
        color: '#ff3b30',
        description: 'Superheated! Water boils away into space. Volcanic magma surface.'
      };
    } else if (tsurfKelvin >= PHYSICAL_CONSTANTS.TEMP_FREEZING) {
      return {
        status: 'habitable',
        label: 'HABITABLE ZONE',
        badgeClass: 'status-habitable',
        color: '#34c759',
        description: 'Liquid water stable! Earth-like oceans, temperate climate, and life-friendly.'
      };
    } else {
      return {
        status: 'frozen',
        label: 'FROZEN',
        badgeClass: 'status-frozen',
        color: '#5ac8fa',
        description: 'Deep freeze! Global glaciation, ice sheets, and frozen oceans.'
      };
    }
  }

  /**
   * Compute stable circular orbital velocity at distance r:
   * v_circ = sqrt(G * M / r)
   * @param {number} distanceMeters 
   * @returns {number} Speed in m/s
   */
  getCircularOrbitSpeed(distanceMeters) {
    if (distanceMeters <= 0) return 0;
    return Math.sqrt((PHYSICAL_CONSTANTS.G * this.star.mass) / distanceMeters);
  }

  /**
   * Compute Keplerian orbital period for a circular orbit:
   * P = 2 * pi * sqrt( r^3 / (G * M) )
   * @param {number} distanceMeters 
   * @returns {number} Period in seconds
   */
  getOrbitalPeriod(distanceMeters) {
    if (distanceMeters <= 0) return 0;
    return 2 * Math.PI * Math.sqrt(Math.pow(distanceMeters, 3) / (PHYSICAL_CONSTANTS.G * this.star.mass));
  }

  /**
   * Gravitational acceleration vector:
   * a = - G * M / r^3 * r
   * @param {number} x - position in meters relative to star
   * @param {number} y - position in meters relative to star
   * @returns {Object} { ax, ay, r }
   */
  getGravitationalAcceleration(x, y) {
    const r2 = x * x + y * y;
    const r = Math.sqrt(r2);
    if (r < 1e3) {
      // Softening for extreme proximity
      return { ax: 0, ay: 0, r };
    }
    const mu = PHYSICAL_CONSTANTS.G * this.star.mass;
    const factor = -mu / (r2 * r);
    return {
      ax: factor * x,
      ay: factor * y,
      r
    };
  }

  /**
   * Symplectic Leapfrog (Kick-Drift-Kick / Velocity Verlet) Step:
   * Integrates equations of motion preserving energy and phase space.
   * 1. v(t + dt/2) = v(t) + 0.5 * a(r(t)) * dt
   * 2. r(t + dt)   = r(t) + v(t + dt/2) * dt
   * 3. a(r(t + dt)) calculated
   * 4. v(t + dt)   = v(t + dt/2) + 0.5 * a(r(t + dt)) * dt
   * 
   * @param {Object} state - { x, y, vx, vy } in meters and m/s
   * @param {number} dt - time step in seconds
   * @returns {Object} New state { x, y, vx, vy }
   */
  leapfrogStep(state, dt) {
    const { x, y, vx, vy } = state;

    // Half-step kick
    const a0 = this.getGravitationalAcceleration(x, y);
    const vx_half = vx + 0.5 * a0.ax * dt;
    const vy_half = vy + 0.5 * a0.ay * dt;

    // Full drift
    const x_new = x + vx_half * dt;
    const y_new = y + vy_half * dt;

    // New acceleration at updated position
    const a1 = this.getGravitationalAcceleration(x_new, y_new);

    // Final half-step kick
    const vx_new = vx_half + 0.5 * a1.ax * dt;
    const vy_new = vy_half + 0.5 * a1.ay * dt;

    return {
      x: x_new,
      y: y_new,
      vx: vx_new,
      vy: vy_new,
      r: a1.r
    };
  }

  /**
   * Calculate specific orbital energy (conserved quantity for checking stability)
   * epsilon = 0.5 * v^2 - G * M / r
   */
  getSpecificOrbitalEnergy(x, y, vx, vy) {
    const r = Math.hypot(x, y);
    const v2 = vx * vx + vy * vy;
    return 0.5 * v2 - (PHYSICAL_CONSTANTS.G * this.star.mass / r);
  }
}
