# WebGL2 Glass Reflection Demo

Pure WebGL2 project (no external libraries) demonstrating a multi-pass
reflection using an FBO, a procedural texture, and a translucent glass plane.

## Features

- WebGL2-only initialization with a friendly error message if unsupported
- Procedural checker + noise texture generated via Canvas2D
- Multi-pass rendering with an offscreen FBO for planar reflections
- Fresnel-based reflection strength on the glass (no cubemap)
- Clipping plane aligned to the glass to avoid incorrect reflection regions
- First-person flyby camera with pointer lock
- Debug quad toggle to visualize the FBO output

## Files

- `index.html` - Fullscreen canvas + transparency slider
- `main.js` - Scene setup, FBO passes, camera, geometry
- `gl.js` - WebGL2 helpers
- `math.js` - Matrix/vector utilities
- `shaders/standard.vert` - Vertex shader for opaque objects
- `shaders/standard.frag` - Fragment shader for opaque objects
- `shaders/glass.vert` - Vertex shader for glass
- `shaders/glass.frag` - Fragment shader for glass

## How to Run

1. Open `index.html` in a modern browser (Chrome/Firefox/Edge/Safari).
2. Click the canvas to lock the mouse.
3. Use WASD to move on the plane, Space/Shift to go up/down.
4. Move the mouse to look around.

## Controls

- **Mouse**: look around (requires pointer lock)
- **W/A/S/D**: move forward/left/back/right (ground plane)
- **Space / Shift**: up / down
- **F**: toggle FBO debug quad (top-left)
- **Slider**: controls glass `uTransparency`

## Notes

- The glass plane is at **Z=0** and the reflection camera is mirrored across
  that plane for the FBO pass.
- Clipping uses `EXT_clip_cull_distance` when available; otherwise it falls back
  to a fragment discard based on the clip distance.
- The reflection is sampled in screen space from the FBO (no cubemap).
