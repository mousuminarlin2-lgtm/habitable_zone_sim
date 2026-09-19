/**
 * Blackbody Radiation Color Converter
 * Maps temperature in Kelvin to accurate sRGB blackbody radiation colors
 * Based on analytic approximations of the Planckian locus across the visible spectrum (CIE 1931 / sRGB).
 */

export function kelvinToRGB(kelvin) {
  // Clamp temperature between 1000K and 40000K
  const temp = Math.max(1000, Math.min(40000, kelvin)) / 100;
  
  let r, g, b;

  // Calculate Red
  if (temp <= 66) {
    r = 255;
  } else {
    r = temp - 60;
    r = 329.698727446 * Math.pow(r, -0.1332047592);
    r = Math.max(0, Math.min(255, r));
  }

  // Calculate Green
  if (temp <= 66) {
    g = temp;
    g = 99.4708025861 * Math.log(g) - 161.1195681661;
    g = Math.max(0, Math.min(255, g));
  } else {
    g = temp - 60;
    g = 288.1221695283 * Math.pow(g, -0.0755148492);
    g = Math.max(0, Math.min(255, g));
  }

  // Calculate Blue
  if (temp >= 66) {
    b = 255;
  } else if (temp <= 19) {
    b = 0;
  } else {
    b = temp - 10;
    b = 138.5177312231 * Math.log(b) - 305.0447927307;
    b = Math.max(0, Math.min(255, b));
  }

  return {
    r: Math.round(r),
    g: Math.round(g),
    b: Math.round(b),
    hex: rgbToHex(Math.round(r), Math.round(g), Math.round(b)),
    rgbString: `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`,
    rgba: (alpha) => `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`
  };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Get human-readable stellar classification based on temperature
 */
export function getStellarSpectralClass(tempKelvin) {
  if (tempKelvin >= 30000) return { type: 'O', desc: 'Blue Hypergiant / Main-Sequence' };
  if (tempKelvin >= 10000) return { type: 'B', desc: 'Blue-White Subgiant / Main-Sequence' };
  if (tempKelvin >= 7500)  return { type: 'A', desc: 'White Main-Sequence' };
  if (tempKelvin >= 6000)  return { type: 'F', desc: 'Yellow-White Dwarf' };
  if (tempKelvin >= 5200)  return { type: 'G', desc: 'Yellow Dwarf (Solar Type)' };
  if (tempKelvin >= 3700)  return { type: 'K', desc: 'Orange Dwarf' };
  return { type: 'M', desc: 'Red Dwarf' };
}
