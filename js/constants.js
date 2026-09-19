/**
 * Astrophysical and Simulation Constants
 */

export const PHYSICAL_CONSTANTS = {
  // Gravitational constant (m^3 kg^-1 s^-2)
  G: 6.67430e-11,
  
  // Stefan-Boltzmann constant (W m^-2 K^-4)
  SIGMA: 5.670374419e-8,
  
  // Solar Mass (kg)
  SOLAR_MASS: 1.98847e30,
  
  // Solar Radius (m)
  SOLAR_RADIUS: 6.957e8,
  
  // Solar Luminosity (W)
  SOLAR_LUMINOSITY: 3.828e26,
  
  // Solar Temperature (K)
  SOLAR_TEMP: 5778,
  
  // Astronomical Unit (m)
  AU: 1.495978707e11,
  
  // Solar Constant (Flux at 1 AU from Sun, W/m^2)
  SOLAR_FLUX_1AU: 1361.0,

  // Planetary constants (Earth baseline)
  EARTH_ALBEDO: 0.306,
  EARTH_RADIUS: 6.371e6, // m
  
  // Greenhouse factor: ratio of Earth's actual surface temp (288.15 K) to bare rock equilibrium temp (254.3 K)
  // 288.15 / 254.3 = 1.133
  GREENHOUSE_FACTOR: 1.1331,

  // Temperature thresholds for liquid water at 1 atm (Kelvin)
  TEMP_FREEZING: 273.15, // 0 °C
  TEMP_BOILING: 373.15,  // 100 °C
};

// Simulation coordinate scaling
export const SIM_SCALING = {
  // 1 AU in screen canvas pixels at 1.0 zoom level
  PIXELS_PER_AU: 220,
  
  // Visual radius of star in canvas pixels (at 1x zoom)
  STAR_PIXEL_RADIUS: 28,
  
  // Visual radius of planet in canvas pixels
  PLANET_PIXEL_RADIUS: 12,
  
  // Grab tolerance in pixels
  PLANET_GRAB_RADIUS: 24,
};

// Preset Stars
export const STAR_PRESETS = [
  {
    id: 'sun',
    name: 'The Sun (G2V Yellow Dwarf)',
    temp: 5778,
    mass: 1.0, // in solar masses
    radius: 1.0, // in solar radii
    luminosity: 1.0, // in solar luminosities
    description: 'Our home star. Habitable zone is centered at ~1.0 AU.'
  },
  {
    id: 'proxima',
    name: 'Proxima Centauri (M5.5V Red Dwarf)',
    temp: 3042,
    mass: 0.122,
    radius: 0.154,
    luminosity: 0.0017,
    description: 'Closest star to the Sun. Habitable zone is extremely close-in (~0.04 - 0.08 AU).'
  },
  {
    id: 'trappist1',
    name: 'TRAPPIST-1 (Ultra-cool Red Dwarf)',
    temp: 2566,
    mass: 0.0898,
    radius: 0.121,
    luminosity: 0.000553,
    description: 'Hosts 7 rocky planets. Tight habitable zone at ~0.02 - 0.05 AU.'
  },
  {
    id: 'kepler186',
    name: 'Kepler-186 (M1V Orange-Red Dwarf)',
    temp: 3788,
    mass: 0.54,
    radius: 0.52,
    luminosity: 0.055,
    description: 'Hosts Kepler-186f, the first Earth-size planet validated in an HZ (~0.35 - 0.65 AU).'
  },
  {
    id: 'sirius',
    name: 'Sirius A (A1V White Main-Sequence)',
    temp: 9940,
    mass: 2.063,
    radius: 1.711,
    luminosity: 25.4,
    description: 'Intensely bright star. Scorching radiation pushes habitable zone far out (~3.5 - 6.5 AU).'
  }
];
