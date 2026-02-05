# WebGL2 Glass Reflection and Transparency

A pure WebGL2/GLSL implementation of real-time reflection and transparency effects on a glass plane, simulating a dark translucent material like tinted glass. This project demonstrates advanced rendering techniques including multi-pass rendering, framebuffer reflections, Fresnel effects, and hardware clipping planes.

**No external libraries used** - Pure WebGL2, JavaScript ES6 modules, and custom math utilities.

---

## 🎯 Project Overview

This project implements a complete glass shader system with:

- **Dynamic planar reflections** using multi-pass rendering and framebuffers
- **View-angle dependent transparency** using Fresnel effect
- **Real-time adjustable transparency** via uniform controls
- **Hardware-accelerated clipping planes** for correct reflection rendering
- **Procedural textures** generated at runtime
- **First-person flyby camera** with full 6-DOF movement
- **Interactive scene** with multiple objects divided by the glass plane

### Scene Setup

The scene contains:
- **Rotating cube** (front of glass plane, Z = +2.5)
- **Static sphere** (behind glass plane, Z = -1.5)
- **Glass plane** (dividing the scene at Z = 0)
- All objects have procedural checker textures

---

## 🚀 Quick Start

### Running the Project

1. **Start a local web server** (required for ES6 modules):
   ```bash
   # Option 1: Python 3
   python -m http.server 8000
   
   # Option 2: Python 2
   python -m SimpleHTTPServer 8000
   
   # Option 3: Node.js
   npx http-server -p 8000
   ```

2. **Open in browser**: Navigate to `http://localhost:8000/index.html`

3. **Click the canvas** to lock the pointer and start interacting

### Controls

| Input | Action |
|-------|--------|
| **Mouse** | Look around (pointer lock required) |
| **W / S** | Move forward / backward |
| **A / D** | Strafe left / right |
| **Space** | Move up |
| **Shift** | Move down |
| **Transparency Slider** | Adjust glass transparency (0.0 - 1.0) |
| **Cube Distance Slider** | Adjust cube position (0.5 - 10.0) |

---

## 📋 Assignment Requirements Compliance

This project fulfills all technical requirements for the Computer Graphics assignment:

### ✅ 1. Custom Shaders
- **Implementation**: Custom vertex and fragment shaders (`glass.vert`, `glass.frag`)
- **View-angle calculation**: Fresnel effect based on dot product of normal and view vector
- **Formula**: `fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0)`
- **No pre-made textures**: All effects computed in real-time

### ✅ 2. Dynamic Reflection & Transparency
- **Multi-pass rendering**: Two-pass system (reflection + main scene)
- **Framebuffer**: Offscreen renders mirrored scene
- **No cubemaps**: Uses planar reflection with mirrored camera
- **Technique**: Similar to shadow mapping approach

### ✅ 3. Adjustable Transparency
- **Uniform control**: `uTransparency` uniform (0.0 to 1.0)
- **Real-time adjustment**: HTML5 range slider updates uniform each frame
- **Fresnel modulation**: Transparency affected by viewing angle

### ✅ 4. Default Texture
- **Procedural generation**: Checker pattern with noise via Canvas2D
- **Applied to all objects**: Cube, sphere, and glass plane
- **Specifications**: 512x512, mipmapped, with repeat wrapping

### ✅ 5. Clipping Plane
- **Hardware clipping**: Uses `gl_ClipDistance[0]` when available
- **Extension**: `EXT_clip_cull_distance` with automatic detection
- **Fallback**: Fragment shader discard (GPU-based, not CPU branching)
- **No CPU selection**: All objects rendered, clipping done in GPU

### ✅ 6. Flyby Camera
- **Type**: First-person with full 6 degrees of freedom
- **Rotation**: Yaw and pitch with mouse (pitch clamped)
- **Movement**: WASD for horizontal, Space/Shift for vertical
- **Pointer lock**: Smooth mouse control via Pointer Lock API

### ✅ 7. Real-time Demo
- **Scene**: Cube and sphere separated by glass plane
- **Animation**: Cube rotates continuously
- **Interactive**: Camera movement, adjustable parameters
- **Performance**: 60 FPS on modern hardware

---

## 🏗️ Technical Architecture

### Rendering Pipeline

```
┌─────────────────────────────────────────┐
│  PASS 1: Reflection (Offscreen)         │
├─────────────────────────────────────────┤
│ 1. Mirror camera across glass plane     │
│ 2. Apply clipping plane (clip Z < 0)    │
│ 3. Render cube and sphere               │
│ 4. Output to reflectionColorTex         │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  PASS 2: Main Scene (Screen)           │
├─────────────────────────────────────────┤
│ 1. Render cube and sphere (normal cam)  │
│ 2. Render glass plane with:             │
│    - Base texture (procedural)          │
│    - Reflection texture (from Pass 1)   │
│    - Fresnel blending                   │
│    - Alpha blending for transparency    │
└─────────────────────────────────────────┘
```

### Shader System

#### Standard Shader (Opaque Objects)
- **Vertex**: Transforms positions, calculates clip distance
- **Fragment**: Blinn-Phong lighting with diffuse and specular
- **Features**: Texture mapping, normal transformation, lighting

#### Glass Shader (Transparent Plane)
- **Vertex**: Calculates both normal and reflected clip positions
- **Fragment**: 
  - Samples base texture (tinted dark for glass effect)
  - Samples reflection texture (mirrored scene)
  - Calculates Fresnel factor from view angle
  - Blends base and reflection based on Fresnel
  - Outputs alpha based on transparency uniform and Fresnel

### Fresnel Effect

The Fresnel effect makes the glass more reflective at grazing angles and more transparent when viewed head-on:

```glsl
vec3 N = normalize(vNormal);
vec3 V = normalize(uCameraPos - vPosition);
float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);

// Blend between tinted base and reflection
vec3 color = mix(tintedBase, reflColor, fresnel);

// Boost alpha at grazing angles
float alpha = (1.0 - uTransparency) * (0.2 + 0.8 * fresnel);
```

### Clipping Plane System

The clipping plane ensures only objects on the correct side of the glass are reflected:

```javascript
// Glass plane equation: Z = 0  →  (0, 0, 1, 0)
const clipPlane = new Float32Array([0, 0, 1, 0]);

// In shader:
// gl_ClipDistance[0] = dot(clipPlane, worldPosition);
// Objects with negative distance are clipped
```

---

## 📁 Project Structure

```
/home/joser/ifg/trabalhos/cg/
│
├── index.html              # Main HTML page with canvas and UI
├── main.js                 # Application entry point and render loop
├── gl.js                   # WebGL2 helper functions (shaders, buffers, etc.)
├── math.js                 # Matrix and vector math library
│
├── shaders/
│   ├── standard.vert       # Vertex shader for opaque objects
│   ├── standard.frag       # Fragment shader for opaque objects
│   ├── glass.vert          # Vertex shader for glass plane
│   └── glass.frag          # Fragment shader for glass plane
│
├── README.md               # This file
└── trabalho2025cg.pdf      # Assignment specification
```

### Module Descriptions

#### `index.html`
- Fullscreen WebGL canvas
- UI controls (transparency and cube distance sliders)
- WebGL2 unsupported error message
- Minimal CSS for clean interface

#### `main.js` (786 lines)
- Scene initialization and geometry generation
- Camera system with flyby controls
- Multi-pass rendering orchestration
- Input handling (keyboard, mouse, pointer lock)
- Animation loop with delta time
- Reflection management and resizing

#### `gl.js` (284 lines)
- WebGL2 context initialization
- Shader compilation and program linking
- Texture creation (2D and depth)
- Framebuffer management
- VAO (Vertex Array Object) creation
- Uniform setting with automatic type detection
- Buffer creation helpers

#### `math.js` (263 lines)
- 4x4 matrix operations (identity, multiply, invert, transpose)
- Matrix generators (perspective, lookAt, translate, rotate, scale)
- 3D vector operations (normalize, cross, dot, add, subtract, scale)
- Column-major format (OpenGL convention)
- Self-testing with validation

---

## 🎨 Features

### Core Features
- ✅ **Multi-pass rendering** with framebuffer objects
- ✅ **Planar reflection** using mirrored camera
- ✅ **Fresnel-based transparency** for realistic glass
- ✅ **Hardware clipping planes** with fallback support
- ✅ **Procedural textures** generated at runtime
- ✅ **Blinn-Phong lighting** for opaque objects
- ✅ **Alpha blending** for transparent glass

### Camera System
- ✅ **First-person controls** (WASD + Space/Shift)
- ✅ **Free look** with mouse (yaw and pitch)
- ✅ **Pointer Lock API** for smooth control
- ✅ **Pitch clamping** to prevent gimbal lock
- ✅ **Delta time movement** for framerate independence

### User Interface
- ✅ **Real-time transparency control**
- ✅ **Cube distance adjustment**
- ✅ **Debug mode** to visualize reflection texture
- ✅ **Responsive design** with automatic resize
- ✅ **WebGL2 compatibility check**

### Technical Quality
- ✅ **Zero external dependencies** (no Three.js, no glMatrix)
- ✅ **ES6 modules** for clean code organization
- ✅ **Automatic extension detection** (EXT_clip_cull_distance)
- ✅ **Proper resource cleanup** on resize
- ✅ **Error handling** with friendly messages
- ✅ **Self-documented code** with JSDoc comments

---

## 🔧 Technical Details

### WebGL2 Features Used

- **Vertex Array Objects (VAO)**: Efficient geometry binding
- **Framebuffer Objects (FBO)**: Offscreen rendering for reflections
- **Hardware instancing**: Separate VAOs for each geometry
- **Extension detection**: `EXT_clip_cull_distance` for optimal clipping
- **Depth testing**: `gl.LEQUAL` for proper depth ordering
- **Face culling**: `gl.BACK` for performance optimization
- **Alpha blending**: `gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA`

### GLSL Features

- **Preprocessor directives**: `#ifdef` for conditional compilation
- **gl_ClipDistance**: Hardware clip plane support
- **Varying interpolation**: Smooth per-fragment values
- **Built-in functions**: `normalize`, `dot`, `pow`, `mix`, `clamp`
- **Texture sampling**: `texture2D` with screen-space UVs

### Math Implementation

All matrix and vector operations implemented from scratch:
- **Column-major matrices** for OpenGL compatibility
- **Proper matrix inversion** with determinant check
- **Quaternion-free rotation** using Euler angles
- **Numerical stability** considerations

### Performance Optimizations

- **Single procedural texture** shared by all objects
- **Mipmapping** for texture filtering
- **Efficient VAO usage** (no redundant binding)
- **Minimal state changes** between draw calls
- **Depth mask disabled** only for glass rendering
- **Framebuffer recycled** on resize (not recreated)

---

## 🐛 Troubleshooting

### White/Blank Screen
- **Check browser console** for WebGL errors
- **Ensure WebGL2 support**: Use Chrome/Firefox/Edge (not IE)
- **Run from web server**: File protocol doesn't support ES6 modules
- **Check shader compilation**: Errors logged to console

### Poor Performance
- **Reduce FBO resolution** in `createReflectionFbo()`
- **Lower sphere segments** in `createSphere(radius, segments)`
- **Disable debug mode** (toggle with F key)
- **Update graphics drivers**

### Reflection Not Visible
- **Adjust transparency slider** to lower values
- **Move camera** to view glass at grazing angle (more Fresnel)
- **Check cube distance slider** - ensure cube is visible in reflection

### Controls Not Working
- **Click canvas** to activate pointer lock
- **Check browser permissions** for pointer lock
- **Try different browser** if pointer lock fails
- **Use keyboard controls** even without pointer lock

---

## 📚 Learning Resources

This project demonstrates concepts from:

- **Real-Time Rendering** (Akenine-Möller, Haines, Hoffman)
  - Chapter 4: Transforms
  - Chapter 5: Shading Basics
  - Chapter 9: Physically Based Shading

- **WebGL2 Specification**: https://www.khronos.org/webgl/
- **GLSL ES 3.00 Specification**: https://www.khronos.org/opengles/
- **Fresnel Equations**: https://en.wikipedia.org/wiki/Fresnel_equations

---

## 🎓 Educational Value

This project is ideal for learning:

1. **Multi-pass rendering techniques**
2. **Framebuffer objects and render targets**
3. **Planar reflections without cubemaps**
4. **View-dependent effects (Fresnel)**
5. **Hardware clipping planes**
6. **Custom shader development**
7. **WebGL2 API usage without libraries**
8. **3D math implementation**
9. **Camera systems and controls**
10. **Real-time interactive graphics**

---

## 📄 License

Educational project for Computer Graphics course at IFG (Instituto Federal de Goiás).

---

## 👨‍💻 Development

**Language**: JavaScript (ES6)  
**Graphics API**: WebGL2  
**Shading Language**: GLSL ES 3.00  
**Platform**: Web (cross-platform)  
**Dependencies**: None (pure WebGL2)

**Browser Compatibility**:
- ✅ Chrome 56+
- ✅ Firefox 51+
- ✅ Edge 79+
- ✅ Safari 15+
- ❌ Internet Explorer (no WebGL2 support)

---

**Last Updated**: February 4, 2026
