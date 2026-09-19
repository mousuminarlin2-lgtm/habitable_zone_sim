/**
 * Cosmic Visuals & Canvas Renderer
 * Renders the starfield, blackbody star, glowing habitable zone band,
 * temperature-responsive procedural planet, 3D terminator shading, and orbit trails.
 */
import { kelvinToRGB } from './blackbody.js';
import { PHYSICAL_CONSTANTS, SIM_SCALING } from './constants.js';

export class SimulationRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // Viewport transform (pan & zoom)
    this.zoom = 1.0;
    this.panX = 0;
    this.panY = 0;

    // Animation time tracker
    this.time = 0;

    // Pre-generate background starfield
    this.starfield = this.generateStarfield(200);

    // Orbit trail history: array of { x, y, temp }
    this.trail = [];
    this.maxTrailLength = 240;

    // Handle high-DPI displays
    this.devicePixelRatio = window.devicePixelRatio || 1;
    this.resize();
  }

  resize() {
    const width = this.canvas.parentElement.clientWidth;
    const height = this.canvas.parentElement.clientHeight;
    
    this.canvas.width = width * this.devicePixelRatio;
    this.canvas.height = height * this.devicePixelRatio;
    
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    
    this.ctx.resetTransform();
    this.ctx.scale(this.devicePixelRatio, this.devicePixelRatio);
    
    this.width = width;
    this.height = height;
  }

  generateStarfield(count) {
    const stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * 3000 - 1500,
        y: Math.random() * 3000 - 1500,
        radius: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.7 + 0.3,
        twinkleSpeed: Math.random() * 2 + 1,
        color: Math.random() > 0.8 ? '#a0c4ff' : (Math.random() > 0.8 ? '#ffd166' : '#ffffff')
      });
    }
    return stars;
  }

  /**
   * Convert simulation distance (meters) to screen canvas pixels
   */
  metersToPixels(meters) {
    const au = meters / PHYSICAL_CONSTANTS.AU;
    return au * SIM_SCALING.PIXELS_PER_AU * this.zoom;
  }

  /**
   * Convert screen canvas pixels to simulation distance (meters)
   */
  pixelsToMeters(pixels) {
    const au = pixels / (SIM_SCALING.PIXELS_PER_AU * this.zoom);
    return au * PHYSICAL_CONSTANTS.AU;
  }

  /**
   * Convert world coordinates (meters) to screen canvas position
   */
  worldToScreen(worldX, worldY) {
    const screenCenterX = this.width / 2 + this.panX;
    const screenCenterY = this.height / 2 + this.panY;
    
    const px = this.metersToPixels(worldX);
    const py = this.metersToPixels(worldY);
    
    return {
      x: screenCenterX + px,
      y: screenCenterY + py
    };
  }

  /**
   * Convert screen canvas position to world coordinates (meters)
   */
  screenToWorld(screenX, screenY) {
    const screenCenterX = this.width / 2 + this.panX;
    const screenCenterY = this.height / 2 + this.panY;
    
    const px = screenX - screenCenterX;
    const py = screenY - screenCenterY;
    
    return {
      x: this.pixelsToMeters(px),
      y: this.pixelsToMeters(py)
    };
  }

  addTrailPoint(worldX, worldY, tempKelvin) {
    this.trail.push({
      x: worldX,
      y: worldY,
      temp: tempKelvin
    });
    if (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }
  }

  clearTrail() {
    this.trail = [];
  }

  /**
   * Main Render Frame
   */
  render(simState) {
    const {
      star,
      planet,
      physics,
      isDragging,
      hoverPlanet
    } = simState;

    this.time += 0.016;
    const ctx = this.ctx;

    // Reset transform to exact devicePixelRatio scaling for sharp rendering
    ctx.setTransform(this.devicePixelRatio, 0, 0, this.devicePixelRatio, 0, 0);

    // 1. Clear viewport with deep cosmic background
    this.renderBackground(ctx);

    const starPos = this.worldToScreen(0, 0);
    const planetPos = this.worldToScreen(planet.x, planet.y);
    const hz = physics.getHabitableZoneBoundaries();
    const hzInnerPx = this.metersToPixels(hz.innerMeters);
    const hzOuterPx = this.metersToPixels(hz.outerMeters);

    // 2. Render Habitable Zone Glowing Ring
    this.renderHabitableZone(ctx, starPos, hzInnerPx, hzOuterPx, hz);

    // 3. Render Distance Guide / Distance Ruler from Star to Planet
    this.renderDistanceGuide(ctx, starPos, planetPos, planet, physics);

    // 4. Render Orbit Trail
    this.renderOrbitTrail(ctx);

    // 5. Render The Central Star with Blackbody Radiation
    this.renderStar(ctx, starPos, star);

    // 6. Render Velocity Vector if dragging or enabled
    if (isDragging) {
      this.renderDragAffordance(ctx, planetPos);
    }

    // 7. Render The Planet with Temperature-Driven Surface Color & Shading
    this.renderPlanet(ctx, starPos, planetPos, planet, isDragging || hoverPlanet);
  }

  renderBackground(ctx) {
    const w = this.width;
    const h = this.height;

    // Dark space gradient with subtle deep violet/navy nebulosity
    const bgGrad = ctx.createRadialGradient(
      w / 2 + this.panX * 0.3,
      h / 2 + this.panY * 0.3,
      50,
      w / 2,
      h / 2,
      Math.max(w, h)
    );
    bgGrad.addColorStop(0, '#0a0d18');
    bgGrad.addColorStop(0.5, '#05070e');
    bgGrad.addColorStop(1, '#020306');

    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Render twinkling stars
    const centerScreenX = w / 2;
    const centerScreenY = h / 2;

    for (let s of this.starfield) {
      const sx = centerScreenX + (s.x + this.panX * 0.1) % (w + 400) - 200;
      const sy = centerScreenY + (s.y + this.panY * 0.1) % (h + 400) - 200;

      const twinkle = Math.sin(this.time * s.twinkleSpeed + s.x) * 0.3 + 0.7;
      ctx.fillStyle = s.color;
      ctx.globalAlpha = s.alpha * twinkle;
      ctx.beginPath();
      ctx.arc(sx, sy, s.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }

  /**
   * Render Glowing Translucent Habitable Zone Band (273K to 373K)
   */
  renderHabitableZone(ctx, center, rInner, rOuter, hz) {
    if (rOuter <= 0 || rInner <= 0) return;

    ctx.save();

    // 1. Shaded translucent annular band
    // Habitable zone has vibrant emerald-cyan glow with warm inner and cool outer borders
    const bandThickness = rOuter - rInner;
    if (bandThickness > 2) {
      const grad = ctx.createRadialGradient(
        center.x, center.y, rInner,
        center.x, center.y, rOuter
      );
      
      // Warm transition at inner edge (approaching boiling 373K)
      grad.addColorStop(0, 'rgba(255, 180, 50, 0.08)');
      // Prime habitable center (temperate liquid water ~290K)
      grad.addColorStop(0.3, 'rgba(46, 213, 115, 0.22)');
      grad.addColorStop(0.7, 'rgba(0, 210, 211, 0.18)');
      // Cool transition at outer edge (approaching freezing 273K)
      grad.addColorStop(1, 'rgba(112, 161, 255, 0.08)');

      ctx.beginPath();
      ctx.arc(center.x, center.y, rOuter, 0, Math.PI * 2, false);
      ctx.arc(center.x, center.y, rInner, 0, Math.PI * 2, true);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // 2. Glowing inner boundary ring (373.15 K boiling limit)
    ctx.beginPath();
    ctx.arc(center.x, center.y, rInner, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 159, 67, 0.75)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 6]);
    ctx.shadowColor = '#ff9f43';
    ctx.shadowBlur = 8;
    ctx.stroke();

    // 3. Glowing outer boundary ring (273.15 K freezing limit)
    ctx.beginPath();
    ctx.arc(center.x, center.y, rOuter, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(84, 160, 255, 0.75)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 6]);
    ctx.shadowColor = '#54a0ff';
    ctx.shadowBlur = 8;
    ctx.stroke();

    // Reset shadow and dash
    ctx.shadowBlur = 0;
    ctx.setLineDash([]);

    // 4. Subtle Habitable Zone labels along top arc if zoom is sufficient
    if (bandThickness > 30) {
      ctx.font = '11px "Inter", -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      
      const midR = (rInner + rOuter) / 2;
      ctx.fillStyle = 'rgba(46, 213, 115, 0.85)';
      ctx.fillText(`HABITABLE ZONE (${hz.innerAU.toFixed(2)} - ${hz.outerAU.toFixed(2)} AU)`, center.x, center.y - midR - 4);
      
      ctx.font = '9px "Inter", -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = 'rgba(255, 159, 67, 0.8)';
      ctx.fillText('373 K (100°C) Boiling', center.x, center.y - rInner + 14);

      ctx.fillStyle = 'rgba(84, 160, 255, 0.8)';
      ctx.fillText('273 K (0°C) Freezing', center.x, center.y - rOuter - 4);
    }

    ctx.restore();
  }

  /**
   * Distance guide line from star to planet
   */
  renderDistanceGuide(ctx, starPos, planetPos, planet, physics) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(starPos.x, starPos.y);
    ctx.lineTo(planetPos.x, planetPos.y);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  /**
   * Render Orbit Trail with temperature-colored gradient fading
   */
  renderOrbitTrail(ctx) {
    if (this.trail.length < 2) return;

    ctx.save();
    for (let i = 1; i < this.trail.length; i++) {
      const p0 = this.worldToScreen(this.trail[i - 1].x, this.trail[i - 1].y);
      const p1 = this.worldToScreen(this.trail[i].x, this.trail[i].y);
      const alpha = (i / this.trail.length) * 0.45;

      const temp = this.trail[i].temp;
      let strokeStyle;
      if (temp > PHYSICAL_CONSTANTS.TEMP_BOILING) {
        strokeStyle = `rgba(255, 99, 72, ${alpha})`;
      } else if (temp >= PHYSICAL_CONSTANTS.TEMP_FREEZING) {
        strokeStyle = `rgba(46, 213, 115, ${alpha})`;
      } else {
        strokeStyle = `rgba(112, 161, 255, ${alpha})`;
      }

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Render Star using real blackbody radiation color
   */
  renderStar(ctx, pos, star) {
    ctx.save();
    const tempK = star.temp;
    const bbColor = kelvinToRGB(tempK);
    const starRadius = SIM_SCALING.STAR_PIXEL_RADIUS * Math.cbrt(star.radius || 1.0);

    // Coronal glow pulsation
    const pulse = 1 + Math.sin(this.time * 2.5) * 0.04;
    const outerGlowRadius = starRadius * 4.5 * pulse;

    // 1. Broad outer atmospheric corona (additive blending)
    ctx.globalCompositeOperation = 'screen';
    const coronaGrad = ctx.createRadialGradient(
      pos.x, pos.y, starRadius * 0.8,
      pos.x, pos.y, outerGlowRadius
    );
    coronaGrad.addColorStop(0, bbColor.rgba(0.8));
    coronaGrad.addColorStop(0.3, bbColor.rgba(0.35));
    coronaGrad.addColorStop(0.7, bbColor.rgba(0.08));
    coronaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = coronaGrad;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, outerGlowRadius, 0, Math.PI * 2);
    ctx.fill();

    // 2. Solar Prominence / Dynamic Corona Spikes
    const spikeCount = 8;
    for (let i = 0; i < spikeCount; i++) {
      const angle = (i * Math.PI * 2 / spikeCount) + (this.time * 0.15);
      const spikeLen = starRadius * (1.6 + Math.sin(this.time * 3 + i * 2) * 0.25);
      const sx = pos.x + Math.cos(angle) * spikeLen;
      const sy = pos.y + Math.sin(angle) * spikeLen;

      const flareGrad = ctx.createLinearGradient(pos.x, pos.y, sx, sy);
      flareGrad.addColorStop(0, bbColor.rgba(0.5));
      flareGrad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(sx, sy);
      ctx.strokeStyle = flareGrad;
      ctx.lineWidth = starRadius * 0.4;
      ctx.stroke();
    }

    // 3. Dense Photosphere Core
    ctx.globalCompositeOperation = 'source-over';
    const coreGrad = ctx.createRadialGradient(
      pos.x, pos.y, 0,
      pos.x, pos.y, starRadius
    );
    // Core is brilliant white-hot center transitioning to true blackbody rim
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.45, bbColor.rgba(0.95));
    coreGrad.addColorStop(0.85, bbColor.rgbString);
    coreGrad.addColorStop(1, bbColor.rgba(0.7));

    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, starRadius, 0, Math.PI * 2);
    ctx.fill();

    // Subtle edge rim shadow for depth
    ctx.strokeStyle = bbColor.rgba(0.9);
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Render The Planet:
   * Dynamic surface texture that shifts live based on equilibrium/surface temperature:
   * - Near star (T > 373 K): Magma fissures, scorched glowing red-hot to incandescent white
   * - Habitable zone (273 K <= T <= 373 K): Blue liquid oceans, green continents, white clouds, polar caps
   * - Far out (T < 273 K): Pale icy blue-white snowball glaciated sphere
   * With 3D spherical lighting, day/night terminator facing away from the star,
   * atmospheric limb scattering, and ocean specular glint.
   */
  renderPlanet(ctx, starPos, planetPos, planet, isInteracting) {
    ctx.save();

    const radius = SIM_SCALING.PLANET_PIXEL_RADIUS;
    const tempK = planet.temp;
    const angleToStar = Math.atan2(starPos.y - planetPos.y, starPos.x - planetPos.x);

    // Grab / hover highlight indicator
    if (isInteracting) {
      ctx.beginPath();
      ctx.arc(planetPos.x, planetPos.y, radius + 8, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 1. Base Surface Color Interpolation based on Temperature
    const surfaceTheme = this.getPlanetSurfaceTheme(tempK);

    // Save clip to spherical disc
    ctx.save();
    ctx.beginPath();
    ctx.arc(planetPos.x, planetPos.y, radius, 0, Math.PI * 2);
    ctx.clip();

    // 2. Render Procedural Continental / Surface Texture
    this.renderPlanetSurfaceDetails(ctx, planetPos, radius, surfaceTheme, angleToStar);

    // 3. Spherical 3D Lighting & Day-Night Terminator
    // Light comes from star at angleToStar
    const lightOffsetX = Math.cos(angleToStar) * (radius * 0.35);
    const lightOffsetY = Math.sin(angleToStar) * (radius * 0.35);
    const lightSourceX = planetPos.x + lightOffsetX;
    const lightSourceY = planetPos.y + lightOffsetY;

    // Day/Night 3D shadow gradient
    const shadowGrad = ctx.createRadialGradient(
      lightSourceX, lightSourceY, radius * 0.2,
      planetPos.x, planetPos.y, radius
    );
    
    if (surfaceTheme.isScorched) {
      // Scorched planets glow slightly in the dark from internal magma
      shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      shadowGrad.addColorStop(0.7, 'rgba(30, 5, 0, 0.55)');
      shadowGrad.addColorStop(1, 'rgba(10, 0, 0, 0.88)');
    } else {
      shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      shadowGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.2)');
      shadowGrad.addColorStop(0.85, 'rgba(0, 5, 15, 0.75)');
      shadowGrad.addColorStop(1, 'rgba(0, 2, 8, 0.95)');
    }

    ctx.fillStyle = shadowGrad;
    ctx.fillRect(planetPos.x - radius, planetPos.y - radius, radius * 2, radius * 2);

    // 4. Ocean Specular Highlight on Day Side (if habitable)
    if (surfaceTheme.isHabitable) {
      const glintX = planetPos.x + Math.cos(angleToStar) * (radius * 0.45);
      const glintY = planetPos.y + Math.sin(angleToStar) * (radius * 0.45);
      const specGrad = ctx.createRadialGradient(
        glintX, glintY, 0,
        glintX, glintY, radius * 0.5
      );
      specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
      specGrad.addColorStop(0.4, 'rgba(200, 230, 255, 0.25)');
      specGrad.addColorStop(1, 'rgba(200, 230, 255, 0)');

      ctx.fillStyle = specGrad;
      ctx.beginPath();
      ctx.arc(glintX, glintY, radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Restore spherical clip
    ctx.restore();

    // 5. Atmospheric Rayleigh Scattering Rim / Crescent Glow
    this.renderAtmosphereRim(ctx, planetPos, radius, angleToStar, surfaceTheme);

    ctx.restore();
  }

  /**
   * Determine planetary visual theme from temperature
   */
  getPlanetSurfaceTheme(tempK) {
    if (tempK > PHYSICAL_CONSTANTS.TEMP_BOILING) {
      // Scorched / Superheated (373 K to 1500+ K)
      // Interpolate from deep red-orange lava to incandescent yellow-white
      const hotFactor = Math.min(1.0, (tempK - 373.15) / 600); // 0 at 373K, 1 at ~973K+
      
      const r = Math.round(210 + 45 * hotFactor);
      const g = Math.round(40 + 180 * hotFactor);
      const b = Math.round(20 + 200 * Math.max(0, hotFactor - 0.5) * 2);

      return {
        isScorched: true,
        isHabitable: false,
        isFrozen: false,
        oceanColor: `rgb(${Math.round(40 + 60 * hotFactor)}, 10, 5)`, // dark basalt crust / lava beds
        landColor: `rgb(${r}, ${g}, ${b})`, // glowing magma rivers / white-hot fractures
        cloudColor: `rgba(255, ${Math.round(150 + 80 * hotFactor)}, 50, ${0.45 + 0.3 * hotFactor})`,
        rimColor: `rgba(255, ${Math.round(100 + 120 * hotFactor)}, 30, 0.85)`
      };
    } else if (tempK >= PHYSICAL_CONSTANTS.TEMP_FREEZING) {
      // Habitable Zone (273.15 K to 373.15 K)
      // Normal Earth is ~288 K
      const warmFactor = (tempK - 273.15) / 100; // 0 at 273K (cool), 1 at 373K (tropical)

      // Ocean: deep sapphire blue to warm azure
      const oceanR = Math.round(15 + 20 * warmFactor);
      const oceanG = Math.round(65 + 40 * warmFactor);
      const oceanB = Math.round(160 - 20 * warmFactor);

      // Continents: lush green, temperate forests to arid savannah
      const landR = Math.round(35 + 65 * warmFactor);
      const landG = Math.round(135 - 25 * warmFactor);
      const landB = Math.round(45);

      return {
        isScorched: false,
        isHabitable: true,
        isFrozen: false,
        oceanColor: `rgb(${oceanR}, ${oceanG}, ${oceanB})`,
        landColor: `rgb(${landR}, ${landG}, ${landB})`,
        cloudColor: 'rgba(255, 255, 255, 0.72)',
        rimColor: 'rgba(70, 160, 255, 0.75)',
        warmFactor
      };
    } else {
      // Frozen / Snowball Planet (T < 273.15 K)
      // Cryosphere: pale cyan-white ice sheets and glaciated continents
      const freezeFactor = Math.min(1.0, (273.15 - tempK) / 180); // 0 at 273K, 1 at 93K
      
      const r = Math.round(190 - 40 * freezeFactor);
      const g = Math.round(225 - 25 * freezeFactor);
      const b = Math.round(250);

      return {
        isScorched: false,
        isHabitable: false,
        isFrozen: true,
        oceanColor: `rgb(${Math.round(140 - 50 * freezeFactor)}, ${Math.round(180 - 40 * freezeFactor)}, 235)`, // frozen ice shelves
        landColor: `rgb(${r}, ${g}, ${b})`, // bright snow-covered land
        cloudColor: 'rgba(235, 245, 255, 0.45)',
        rimColor: 'rgba(180, 225, 255, 0.8)'
      };
    }
  }

  /**
   * Render Continental Shapes, Clouds, and Magma details
   */
  renderPlanetSurfaceDetails(ctx, pos, r, theme, angleToStar) {
    const cx = pos.x;
    const cy = pos.y;

    // 1. Ocean / Base Ground Fill
    ctx.fillStyle = theme.oceanColor;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    // 2. Procedural Continents (simulated rotation with time)
    const rotOffset = (this.time * 0.4) % (r * 4);
    ctx.fillStyle = theme.landColor;

    // Simulated landmass blobs
    ctx.beginPath();
    ctx.arc(cx - r * 0.3 + Math.sin(this.time * 0.3) * 2, cy - r * 0.2, r * 0.45, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.25, cy + r * 0.25, r * 0.38, 0, Math.PI * 2);
    ctx.arc(cx - r * 0.2, cy + r * 0.4, r * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // If scorched: render incandescent magma veins/fractures
    if (theme.isScorched) {
      ctx.strokeStyle = theme.landColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.5, cy - r * 0.1);
      ctx.lineTo(cx + r * 0.4, cy + r * 0.2);
      ctx.lineTo(cx + r * 0.1, cy - r * 0.4);
      ctx.moveTo(cx - r * 0.2, cy + r * 0.3);
      ctx.lineTo(cx + r * 0.5, cy - r * 0.1);
      ctx.stroke();
    }

    // If habitable: render polar ice caps (scaled by temperature)
    if (theme.isHabitable) {
      const iceCapSize = Math.max(0, r * (0.35 - theme.warmFactor * 0.3));
      if (iceCapSize > 1) {
        ctx.fillStyle = '#ffffff';
        // North pole
        ctx.beginPath();
        ctx.arc(cx, cy - r + iceCapSize * 0.4, iceCapSize, 0, Math.PI * 2);
        ctx.fill();
        // South pole
        ctx.beginPath();
        ctx.arc(cx, cy + r - iceCapSize * 0.4, iceCapSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3. Swirling cloud bands (drift across planet)
    const cloudShift = (this.time * 0.8) % (r * 2);
    ctx.fillStyle = theme.cloudColor;
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.2 + (cloudShift * 0.5), cy - r * 0.25, r * 0.7, r * 0.18, 0.1, 0, Math.PI * 2);
    ctx.ellipse(cx + r * 0.1 - (cloudShift * 0.4), cy + r * 0.3, r * 0.65, r * 0.16, -0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Atmospheric Rim / Limb Rayleigh Glow
   */
  renderAtmosphereRim(ctx, pos, r, angleToStar, theme) {
    // Crescent glow on the illuminated limb facing the star
    ctx.save();
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r + 1.8, 0, Math.PI * 2);
    ctx.strokeStyle = theme.rimColor;
    ctx.lineWidth = 2.2;
    ctx.shadowColor = theme.rimColor;
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Render Drag Target and Affordance
   */
  renderDragAffordance(ctx, planetPos) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(planetPos.x, planetPos.y, SIM_SCALING.PLANET_GRAB_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();

    // Pulse ring
    const pulse = 1 + Math.sin(this.time * 6) * 0.15;
    ctx.beginPath();
    ctx.arc(planetPos.x, planetPos.y, SIM_SCALING.PLANET_GRAB_RADIUS * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(46, 213, 115, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }
}
