/**
 * Test & Verification script for physics engine, leapfrog integrator, and blackbody radiation.
 */
import { PHYSICAL_CONSTANTS, STAR_PRESETS } from './js/constants.js';
import { PhysicsEngine } from './js/physics.js';
import { kelvinToRGB, getStellarSpectralClass } from './js/blackbody.js';

console.log('=== VERIFYING HABITABLE ZONE ASTROPHYSICS & SIMULATION ===\n');

const physics = new PhysicsEngine();

// 1. Test Solar Constant & Flux at 1 AU
const dist1AU = PHYSICAL_CONSTANTS.AU;
const flux1AU = physics.calculateFlux(dist1AU);
const relFlux1AU = physics.calculateRelativeFlux(dist1AU);
console.log(`1. Flux at 1 AU from Sun:`);
console.log(`   Expected: ~1361 W/m^2, Actual: ${flux1AU.toFixed(2)} W/m^2`);
console.log(`   Relative Flux: ${relFlux1AU.toFixed(3)}x Earth`);
if (Math.abs(flux1AU - 1361) > 20) throw new Error('Flux calculation error at 1 AU');

// 2. Test Equilibrium Surface Temperature at 1 AU
const temps = physics.calculateTemperatures(dist1AU);
console.log(`\n2. Earth Surface Temperature at 1 AU:`);
console.log(`   T_surf: ${temps.tsurf.toFixed(2)} K (${temps.celsius.toFixed(1)} °C)`);
console.log(`   T_eq (bare rock): ${temps.teq.toFixed(2)} K`);
if (Math.abs(temps.tsurf - 288.15) > 1.0) throw new Error('Surface temperature calculation unexpected');

// 3. Test Habitable Zone Boundaries
const hz = physics.getHabitableZoneBoundaries();
console.log(`\n3. Sun Habitable Zone Boundaries (273.15 K to 373.15 K):`);
console.log(`   Inner (Boiling 373 K): ${hz.innerAU.toFixed(3)} AU (${(hz.innerMeters / 1e9).toFixed(1)}M km)`);
console.log(`   Outer (Freezing 273 K): ${hz.outerAU.toFixed(3)} AU (${(hz.outerMeters / 1e9).toFixed(1)}M km)`);
if (hz.innerAU >= 1.0 || hz.outerAU <= 1.0) {
  throw new Error('1 AU must be inside the habitable zone');
}

// 4. Test Inverse-Square Law Scaling
const dist2AU = 2.0 * PHYSICAL_CONSTANTS.AU;
const flux2AU = physics.calculateFlux(dist2AU);
console.log(`\n4. Inverse-Square Law verification at 2 AU:`);
console.log(`   Ratio (Flux 1 AU / Flux 2 AU): ${(flux1AU / flux2AU).toFixed(4)} (Expected: 4.0000)`);
if (Math.abs((flux1AU / flux2AU) - 4.0) > 0.001) throw new Error('Inverse-square scaling failed');

// 5. Test Habitability Classifications
console.log(`\n5. Habitability Classifications:`);
const closeTemps = physics.calculateTemperatures(0.3 * PHYSICAL_CONSTANTS.AU);
const midTemps = physics.calculateTemperatures(1.0 * PHYSICAL_CONSTANTS.AU);
const farTemps = physics.calculateTemperatures(2.5 * PHYSICAL_CONSTANTS.AU);
console.log(`   At 0.3 AU: ${physics.getHabitabilityStatus(closeTemps.tsurf).label} (${closeTemps.tsurf.toFixed(0)} K)`);
console.log(`   At 1.0 AU: ${physics.getHabitabilityStatus(midTemps.tsurf).label} (${midTemps.tsurf.toFixed(0)} K)`);
console.log(`   At 2.5 AU: ${physics.getHabitabilityStatus(farTemps.tsurf).label} (${farTemps.tsurf.toFixed(0)} K)`);

if (physics.getHabitabilityStatus(closeTemps.tsurf).status !== 'scorched') throw new Error('0.3 AU should be scorched');
if (physics.getHabitabilityStatus(midTemps.tsurf).status !== 'habitable') throw new Error('1.0 AU should be habitable');
if (physics.getHabitabilityStatus(farTemps.tsurf).status !== 'frozen') throw new Error('2.5 AU should be frozen');

// 6. Test Leapfrog Integrator (Conservation of Energy & Orbit Stability)
console.log(`\n6. Symplectic Leapfrog Integrator 1-Year Orbit Simulation:`);
const vCirc = physics.getCircularOrbitSpeed(dist1AU);
let state = { x: dist1AU, y: 0, vx: 0, vy: vCirc };

const initialEnergy = physics.getSpecificOrbitalEnergy(state.x, state.y, state.vx, state.vy);
const orbitPeriodSeconds = physics.getOrbitalPeriod(dist1AU);
const dt = 3600; // 1-hour time steps
const totalSteps = Math.round(orbitPeriodSeconds / dt);

for (let s = 0; s < totalSteps; s++) {
  state = physics.leapfrogStep(state, dt);
}

const finalEnergy = physics.getSpecificOrbitalEnergy(state.x, state.y, state.vx, state.vy);
const finalDist = Math.hypot(state.x, state.y);
const energyError = Math.abs((finalEnergy - initialEnergy) / initialEnergy);
const radiusError = Math.abs((finalDist - dist1AU) / dist1AU);

console.log(`   Orbit period: ${(orbitPeriodSeconds / 86400).toFixed(2)} days (~1 year)`);
console.log(`   Initial distance: ${(dist1AU / PHYSICAL_CONSTANTS.AU).toFixed(4)} AU`);
console.log(`   Distance after 1 year: ${(finalDist / PHYSICAL_CONSTANTS.AU).toFixed(4)} AU`);
console.log(`   Radius error: ${(radiusError * 100).toExponential(3)} %`);
console.log(`   Energy conservation error: ${(energyError * 100).toExponential(3)} %`);

if (radiusError > 0.005 || energyError > 0.001) {
  throw new Error('Leapfrog integrator did not conserve orbit/energy sufficiently');
}

// 7. Test Blackbody Radiation
console.log(`\n7. Blackbody Radiation Colors:`);
const sunColor = kelvinToRGB(5778);
const redDwarfColor = kelvinToRGB(3042);
const siriusColor = kelvinToRGB(9940);
console.log(`   Sun (5778 K): ${sunColor.hex} ${sunColor.rgbString}`);
console.log(`   Red Dwarf (3042 K): ${redDwarfColor.hex} ${redDwarfColor.rgbString}`);
console.log(`   Sirius A (9940 K): ${siriusColor.hex} ${siriusColor.rgbString}`);

console.log('\n>>> ALL ASTROPHYSICAL & INTEGRATION TESTS PASSED! <<<');
