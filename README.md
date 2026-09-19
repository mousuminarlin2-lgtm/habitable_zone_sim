# Habitable Zone & Orbital Mechanics Simulator

An interactive, physically grounded astrophysics simulation exploring stellar radiation, the inverse-square law, planetary equilibrium temperature, and orbital mechanics.

Grab and drag the planet closer to or farther from the star in real time to observe live physical changes to radiant flux, surface temperature, and planetary geology.

---

## Key Features

1. **Interactive Real-Time Grab & Drag**:
   - Grab the planet with mouse or touch.
   - Instantly observe dynamic updates to incident flux and surface temperature as distance changes.
   - Releasing the planet transitions smoothly into a physically real orbit.

2. **Inverse-Square Radiation Flux**:
   - Computes actual flux received in watts per square meter:
     $$F = \frac{L_*}{4 \pi d^2}$$
   - Compares live against Earth's solar constant ($S_0 \approx 1361 \text{ W/m}^2$).

3. **Planetary Equilibrium Temperature**:
   - Derived from Stefan-Boltzmann thermal radiation balance:
     $$T_{\text{eq}} = \left[ \frac{(1 - A) F}{4 \sigma} \right]^{1/4} = \left[ \frac{(1 - A) L_*}{16 \pi \sigma d^2} \right]^{1/4}$$
   - Includes natural atmospheric greenhouse warming factor calibrated to Earth baseline ($288.15\text{ K} / 15^\circ\text{C}$ at $1.0\text{ AU}$).

4. **Glowing Translucent Habitable Zone Band**:
   - Renders an emerald-cyan translucent ring around the star demarcating where surface water remains liquid ($273.15\text{ K}$ to $373.15\text{ K}$ / $0^\circ\text{C}$ to $100^\circ\text{C}$).
   - Boundary distances adjust dynamically if stellar temperature or luminosity changes:
     $$d_{\text{inner}} = \left[ \frac{(1 - A) L_*}{16 \pi \sigma (373.15 / f_{\text{gh}})^4} \right]^{1/2}$$
     $$d_{\text{outer}} = \left[ \frac{(1 - A) L_*}{16 \pi \sigma (273.15 / f_{\text{gh}})^4} \right]^{1/2}$$

5. **Temperature-Driven Planetary Surface Transitions**:
   - **$T > 373\text{ K}$ (Scorched / Superheated)**: Oceans vaporize into space; surface cracks into glowing molten lava lakes and magma fissures, turning incandescent white-hot close to the star.
   - **$273\text{ K} \le T \le 373\text{ K}$ (Habitable Zone)**: Deep sapphire blue liquid oceans, verdant continents, polar ice caps, swirling white clouds, and blue atmospheric Rayleigh scattering rim.
   - **$T < 273\text{ K}$ (Frozen / Snowball Planet)**: Global glaciation; liquid oceans freeze over into bright ice shelves, glaciated continents, and frosted crystalline terrain.

6. **Stellar Blackbody Radiation**:
   - Converts stellar photosphere temperature (Kelvin) to true spectral colors using Planckian locus approximations (CIE 1931 / sRGB).
   - Presets include:
     - **The Sun** (G2V Yellow Dwarf, $5,778\text{ K}$)
     - **Proxima Centauri** (M5.5V Red Dwarf, $3,042\text{ K}$)
     - **TRAPPIST-1** (Ultra-cool Dwarf, $2,566\text{ K}$)
     - **Kepler-186** (M1V Dwarf, $3,788\text{ K}$)
     - **Sirius A** (A1V White Main-Sequence, $9,940\text{ K}$)

7. **Symplectic Leapfrog (Velocity Verlet) Integrator**:
   - Real Newtonian gravitational dynamics:
     $$\vec{a} = -\frac{G M_*}{r^3} \vec{r}$$
   - Energy-conserving symplectic time-stepping prevents secular orbital decay or drift.

---

## How to Run

Because this project is built using native ES6 JavaScript modules and HTML5 Canvas with **zero external package dependencies**, you can run it immediately with any local web server:

### Option 1: Python HTTP Server (Built-in)
```bash
python -m http.server 8000
```
Then open: [http://localhost:8000](http://localhost:8000)

### Option 2: Node.js `npx serve`
```bash
npx serve .
```

### Option 3: VS Code Live Server
Right-click `index.html` and select **"Open with Live Server"**.

---

## Controls Reference

- **Grab & Drag**: Click and drag the planet with left mouse button or touch.
- **Scroll Wheel**: Zoom in and out of the planetary system.
- **Star Preset Selector**: Switch between stellar classes to see the habitable zone expand or contract.
- **Photosphere Temp Slider**: Manually tune star temperature to observe live blackbody color and luminosity changes.
- **Snap to Habitable Zone**: Instantly positions the planet into a stable circular orbit in the center of the current star's habitable zone.
- **Time Flow**: Adjust simulation speed between $0.1\times$ and $5.0\times$.
- **On Release Mode**: Toggle between **"Stable Circular Orbit"** (automatically calculates circular orbital speed $v = \sqrt{GM/r}$) and **"Flick / Momentum Sling"** (projects trajectory from mouse velocity).
