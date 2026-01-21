# Architecture Overview

This document explains the structure and runtime flow of the WebGL2 demo.

## High-Level Flow

1. **Initialization**
   - `index.html` loads `main.js` as an ES module.
   - `main.js` creates the WebGL2 context via `initWebGL()` and builds shaders.
   - Procedural texture is generated in Canvas2D and uploaded to the GPU.
   - Geometry (cube, sphere, plane) is generated and uploaded as buffers/VAOs.
   - An offscreen **FBO** (color texture + depth renderbuffer) is created and
     resized with the canvas.

2. **Per-Frame Update**
   - Camera is updated based on pointer-lock mouse input + keyboard movement.
   - Two render passes are executed:
     - **Pass 1 (FBO):** renders only cube + sphere with a mirrored camera to
       produce a reflection texture.
     - **Pass 2 (Default):** renders cube + sphere normally, then the glass
       plane with Fresnel reflection sampled from the FBO.

## Core Modules

### `main.js`

**Responsibilities**
- Bootstraps the scene and render loop.
- Generates geometry (cube/sphere/plane).
- Builds FBO and handles resize.
- Runs the multi-pass pipeline.
- Implements the flyby camera.
- Applies clipping plane in shaders.
- Provides a debug quad to visualize the FBO (toggle with `F`).

**Key data**
- `camera`: position, forward, view matrix, yaw/pitch, speed.
- `reflectionFbo`: color texture + depth renderbuffer.
- `baseTexture`: procedural texture used by all objects.

### `gl.js`

WebGL2 utilities:
- Shader compile/link.
- Texture creation (RGBA8, mipmaps).
- Depth renderbuffer and FBO creation.
- VAO creation.
- Uniform setter with type detection.

### `math.js`

Minimal math library:
- Matrices: identity, multiply, perspective, lookAt, rotation, transpose, invert.
- Vectors: add, subtract, normalize, dot, cross, scale.

### `shaders/standard.*`

**Purpose**: opaque objects (cube/sphere).
- Vertex shader transforms to clip space, outputs world normal/pos/UV.
- Fragment shader: simple Lambert + Blinn spec + `uBaseTex`.
- `uClipPlane` used for clipping (with fallback discard if no clip distance).

### `shaders/glass.*`

**Purpose**: glass plane.
- Vertex shader outputs clip position for screen-space reflection UVs.
- Fragment shader:
  - Fresnel term controls reflection strength.
  - Samples `uReflectionTex` from the FBO (screen-space).
  - Samples `uBaseTex` for dark glass tint.
  - Alpha controlled by `uTransparency` and Fresnel.

## Rendering Pipeline Details

### Pass 1 — Reflection FBO

- **Camera mirror**: camera position and forward vector are mirrored across the
  glass plane (Z=0).
- **Clipping plane**: keeps only the correct side of geometry.
- **Output**: the FBO color texture (used as `uReflectionTex`).

### Pass 2 — Final Scene

- **Opaque objects**: cube + sphere rendered first.
- **Glass**: rendered last with blending and depth write disabled.
- **Reflection**: sampled in screen-space from the FBO.

## Clipping Strategy

- Primary: `gl_ClipDistance[0]` when `EXT_clip_cull_distance` is available.
- Fallback: fragment discard using `vClipDist` (still GPU-side).

## Input & Interaction

- **Pointer lock** on click enables mouse-look.
- **W/A/S/D** move on the ground plane.
- **Space / Shift** move vertically.
- **F** toggles debug quad.
- **Slider** updates `uTransparency` in real time.

## Debug Overlay

A small quad in the top-left displays the FBO texture to verify reflection
contents and clipping behavior.
