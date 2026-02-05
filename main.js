import { 
    initWebGL, 
    createShader, 
    createProgram, 
    loadShader,
    createBuffer,
    createIndexBuffer,
    createVao,
    setUniforms,
    createTexture2D,
    createDepthTexture,
    createFramebuffer
} from './gl.js';
import { 
    mat4,
    vec3Normalize,
    vec3Subtract,
    vec3Add,
    vec3Cross,
    vec3Dot,
    vec3Scale
} from './math.js';

let gl;
let canvas;
let transparency = 0.5;
let cubeDistance = 2.5;

// Camera (first-person flyby)
const camera = {
    position: new Float32Array([3, 2, 5]),
    forward: new Float32Array([0, 0, -1]),
    viewMatrix: mat4.identity(),
    yaw: -Math.PI / 2,
    pitch: 0,
    speed: 3.0,
    sensitivity: 0.002
};

const inputState = {
    forward: 0,
    right: 0,
    up: 0,
    pointerLocked: false
};

let lastTime = 0;

// Scene objects
let standardProgram;
let glassProgram;
let cubeVao, cubeIndexCount;
let sphereVao, sphereIndexCount;
let planeVao, planeIndexCount;
let baseTexture;
let reflectionFbo;
let reflectionColorTex;
let reflectionDepth;
let fboWidth = 0;
let fboHeight = 0;
let debugProgram;
let debugVao, debugIndexCount;
let debugEnabled = false;

// Matrices
let projectionMatrix;
let viewMatrix;

/**
 * Create cube geometry with positions, normals and UVs
 * @param {number} size - Cube size (half-extent)
 * @returns {Object} {positions, normals, uvs, indices}
 */
function createCube(size) {
    const s = size;
    const positions = new Float32Array([
        // Front face
        -s, -s,  s,   s, -s,  s,   s,  s,  s,   -s,  s,  s,
        // Back face
        -s, -s, -s,   -s,  s, -s,   s,  s, -s,   s, -s, -s,
        // Top face
        -s,  s, -s,   -s,  s,  s,   s,  s,  s,   s,  s, -s,
        // Bottom face
        -s, -s, -s,   s, -s, -s,   s, -s,  s,   -s, -s,  s,
        // Right face
         s, -s, -s,   s,  s, -s,   s,  s,  s,   s, -s,  s,
        // Left face
        -s, -s, -s,   -s, -s,  s,   -s,  s,  s,   -s,  s, -s,
    ]);

    const normals = new Float32Array([
        // Front face
         0,  0,  1,   0,  0,  1,   0,  0,  1,   0,  0,  1,
        // Back face
         0,  0, -1,   0,  0, -1,   0,  0, -1,   0,  0, -1,
        // Top face
         0,  1,  0,   0,  1,  0,   0,  1,  0,   0,  1,  0,
        // Bottom face
         0, -1,  0,   0, -1,  0,   0, -1,  0,   0, -1,  0,
        // Right face
         1,  0,  0,   1,  0,  0,   1,  0,  0,   1,  0,  0,
        // Left face
        -1,  0,  0,  -1,  0,  0,  -1,  0,  0,  -1,  0,  0,
    ]);

    const uvs = new Float32Array([
        // Front face
        0, 0,  1, 0,  1, 1,  0, 1,
        // Back face
        1, 0,  1, 1,  0, 1,  0, 0,
        // Top face
        0, 1,  0, 0,  1, 0,  1, 1,
        // Bottom face
        1, 1,  0, 1,  0, 0,  1, 0,
        // Right face
        1, 0,  1, 1,  0, 1,  0, 0,
        // Left face
        0, 0,  1, 0,  1, 1,  0, 1,
    ]);

    const indices = new Uint16Array([
        0,  1,  2,    0,  2,  3,    // front
        4,  5,  6,    4,  6,  7,    // back
        8,  9,  10,   8,  10, 11,   // top
        12, 13, 14,   12, 14, 15,   // bottom
        16, 17, 18,   16, 18, 19,   // right
        20, 21, 22,   20, 22, 23,   // left
    ]);

    return { positions, normals, uvs, indices };
}

/**
 * Create sphere geometry with positions, normals and UVs
 * @param {number} radius - Sphere radius
 * @param {number} segments - Number of segments (both horizontal and vertical)
 * @returns {Object} {positions, normals, uvs, indices}
 */
function createSphere(radius, segments) {
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    for (let y = 0; y <= segments; y++) {
        const theta = (y / segments) * Math.PI;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);

        for (let x = 0; x <= segments; x++) {
            const phi = (x / segments) * 2 * Math.PI;
            const sinPhi = Math.sin(phi);
            const cosPhi = Math.cos(phi);

            const px = radius * sinTheta * cosPhi;
            const py = radius * cosTheta;
            const pz = radius * sinTheta * sinPhi;

            positions.push(px, py, pz);
            normals.push(px / radius, py / radius, pz / radius);
            uvs.push(x / segments, y / segments);
        }
    }

    for (let y = 0; y < segments; y++) {
        for (let x = 0; x < segments; x++) {
            const a = y * (segments + 1) + x;
            const b = a + 1;
            const c = a + (segments + 1);
            const d = c + 1;

            indices.push(a, b, c);
            indices.push(b, d, c);
        }
    }

    return {
        positions: new Float32Array(positions),
        normals: new Float32Array(normals),
        uvs: new Float32Array(uvs),
        indices: new Uint16Array(indices)
    };
}

/**
 * Create plane geometry with positions, normals and UVs
 * Plane is oriented in XZ plane (Y is up)
 * @param {number} width - Plane width
 * @param {number} height - Plane height (depth)
 * @param {number} subdivisions - Number of subdivisions
 * @returns {Object} {positions, normals, uvs, indices}
 */
function createPlane(width, height, subdivisions) {
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    const w2 = width / 2;
    const h2 = height / 2;

    for (let z = 0; z <= subdivisions; z++) {
        for (let x = 0; x <= subdivisions; x++) {
            const px = (x / subdivisions) * width - w2;
            const py = 0;
            const pz = (z / subdivisions) * height - h2;

            positions.push(px, py, pz);
            normals.push(0, 1, 0); // Up vector
            uvs.push(x / subdivisions, z / subdivisions);
        }
    }

    for (let z = 0; z < subdivisions; z++) {
        for (let x = 0; x < subdivisions; x++) {
            const a = z * (subdivisions + 1) + x;
            const b = a + 1;
            const c = a + (subdivisions + 1);
            const d = c + 1;

            indices.push(a, b, c);
            indices.push(b, d, c);
        }
    }

    return {
        positions: new Float32Array(positions),
        normals: new Float32Array(normals),
        uvs: new Float32Array(uvs),
        indices: new Uint16Array(indices)
    };
}

function createReflectionFbo(width, height) {
    if (reflectionFbo) {
        gl.deleteFramebuffer(reflectionFbo);
        reflectionFbo = null;
    }
    if (reflectionColorTex) {
        gl.deleteTexture(reflectionColorTex);
        reflectionColorTex = null;
    }
    if (reflectionDepth) {
        gl.deleteRenderbuffer(reflectionDepth);
        reflectionDepth = null;
    }

    reflectionColorTex = createTexture2D(gl, width, height, {
        data: null,
        format: gl.RGBA,
        internalFormat: gl.RGBA8,
        type: gl.UNSIGNED_BYTE,
        minFilter: gl.LINEAR,
        magFilter: gl.LINEAR,
        wrapS: gl.CLAMP_TO_EDGE,
        wrapT: gl.CLAMP_TO_EDGE
    });
    reflectionDepth = createDepthTexture(gl, width, height);
    reflectionFbo = createFramebuffer(gl, reflectionColorTex, reflectionDepth);
}

/**
 * Create procedural texture using Canvas2D (checker pattern + light noise)
 * @param {WebGL2RenderingContext} gl - WebGL2 context
 * @param {number} size - Texture size (power of 2 recommended)
 * @returns {WebGLTexture} Texture object
 */
function createProceduralTexture(gl, size = 512) {
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Checker pattern parameters
    const checkerSize = size / 8;
    
    // Draw checker pattern
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const checkerX = Math.floor(x / checkerSize);
            const checkerY = Math.floor(y / checkerSize);
            const isEven = (checkerX + checkerY) % 2 === 0;
            
            // Base colors for checker
            let r = isEven ? 200 : 100;
            let g = isEven ? 200 : 100;
            let b = isEven ? 200 : 100;
            
            // Add light noise
            const noise = (Math.random() - 0.5) * 30;
            r = Math.max(0, Math.min(255, r + noise));
            g = Math.max(0, Math.min(255, g + noise));
            b = Math.max(0, Math.min(255, b + noise));
            
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.fillRect(x, y, 1, 1);
        }
    }
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, size, size);
    
    // Create texture with REPEAT wrap and mipmaps
    const texture = createTexture2D(gl, size, size, {
        data: imageData,
        format: gl.RGBA,
        internalFormat: gl.RGBA8,
        type: gl.UNSIGNED_BYTE,
        minFilter: gl.LINEAR_MIPMAP_LINEAR,
        magFilter: gl.LINEAR,
        wrapS: gl.REPEAT,
        wrapT: gl.REPEAT
    });
    
    // Generate mipmaps
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
    
    return texture;
}

function updateCameraForward() {
    const cosPitch = Math.cos(camera.pitch);
    camera.forward[0] = Math.cos(camera.yaw) * cosPitch;
    camera.forward[1] = Math.sin(camera.pitch);
    camera.forward[2] = Math.sin(camera.yaw) * cosPitch;
}

function updateCamera(deltaTime) {
    updateCameraForward();

    // Right vector from forward and world up
    const worldUp = new Float32Array([0, 1, 0]);
    const right = vec3Normalize(vec3Cross(camera.forward, worldUp));
    const forwardFlat = vec3Normalize(new Float32Array([camera.forward[0], 0, camera.forward[2]]));

    let move = new Float32Array([0, 0, 0]);
    if (inputState.forward !== 0) {
        move = vec3Add(move, vec3Scale(forwardFlat, inputState.forward));
    }
    if (inputState.right !== 0) {
        move = vec3Add(move, vec3Scale(right, inputState.right));
    }
    if (inputState.up !== 0) {
        move = vec3Add(move, vec3Scale(worldUp, inputState.up));
    }

    if (vec3Dot(move, move) > 0.0) {
        move = vec3Normalize(move);
        const step = vec3Scale(move, camera.speed * deltaTime);
        camera.position = vec3Add(camera.position, step);
    }

    const target = vec3Add(camera.position, camera.forward);
    camera.viewMatrix = mat4.lookAt(camera.position, target, worldUp);
}

function reflectPointAcrossPlane(point, planeNormal, planeD) {
    const dist = vec3Dot(planeNormal, point) + planeD;
    return vec3Subtract(point, vec3Scale(planeNormal, 2 * dist));
}

function reflectDirectionAcrossPlane(direction, planeNormal) {
    const dist = vec3Dot(planeNormal, direction);
    return vec3Subtract(direction, vec3Scale(planeNormal, 2 * dist));
}

function setupInput() {
    canvas.addEventListener('click', () => {
        canvas.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
        inputState.pointerLocked = document.pointerLockElement === canvas;
    });

    document.addEventListener('mousemove', (e) => {
        if (!inputState.pointerLocked) return;
        camera.yaw += e.movementX * camera.sensitivity;
        camera.pitch -= e.movementY * camera.sensitivity;
        const maxPitch = Math.PI / 2 - 0.01;
        camera.pitch = Math.max(-maxPitch, Math.min(maxPitch, camera.pitch));
    });

    document.addEventListener('keydown', (e) => {
        switch (e.code) {
            case 'KeyW': inputState.forward = 1; break;
            case 'KeyS': inputState.forward = -1; break;
            case 'KeyA': inputState.right = -1; break;
            case 'KeyD': inputState.right = 1; break;
            case 'Space': inputState.up = 1; break;
            case 'ShiftLeft':
            case 'ShiftRight':
                inputState.up = -1; break;
            case 'KeyF':
                if (!e.repeat) debugEnabled = !debugEnabled;
                break;
        }
    });

    document.addEventListener('keyup', (e) => {
        switch (e.code) {
            case 'KeyW':
            case 'KeyS':
                inputState.forward = 0; break;
            case 'KeyA':
            case 'KeyD':
                inputState.right = 0; break;
            case 'Space':
            case 'ShiftLeft':
            case 'ShiftRight':
                inputState.up = 0; break;
        }
    });
}

async function init() {
    canvas = document.getElementById('c');
    gl = initWebGL(canvas);
    
    if (!gl) {
        console.error('Failed to initialize WebGL2');
        const errorDiv = document.getElementById('webgl2Error');
        if (errorDiv) {
            errorDiv.classList.add('show');
        }
        return;
    }

    // Load shaders
    // Use EXT_clip_cull_distance if available; otherwise fall back to fragment discard.
    const clipExt = gl.getExtension('EXT_clip_cull_distance');
    const clipHeader = clipExt
        ? '#extension GL_EXT_clip_cull_distance : enable\n#define USE_GL_CLIP_DISTANCE\n'
        : '';
    const standardVertSource = clipHeader + await loadShader('shaders/standard.vert');
    const standardFragSource = await loadShader('shaders/standard.frag');
    const glassVertSource = clipHeader + await loadShader('shaders/glass.vert');
    const glassFragSource = await loadShader('shaders/glass.frag');

    // Create shader programs
    standardProgram = createProgram(gl, standardVertSource, standardFragSource);
    glassProgram = createProgram(gl, glassVertSource, glassFragSource);

    if (!standardProgram || !glassProgram) {
        console.error('Failed to create shader programs');
        return;
    }

    // Debug quad shader (screen-space)
    const debugVertSource = `
        attribute vec2 aPosition;
        attribute vec2 aTexCoord;
        varying vec2 vUV;
        void main() {
            vUV = aTexCoord;
            gl_Position = vec4(aPosition, 0.0, 1.0);
        }
    `;
    const debugFragSource = `
        precision mediump float;
        uniform sampler2D uTex;
        varying vec2 vUV;
        void main() {
            gl_FragColor = texture2D(uTex, vUV);
        }
    `;
    debugProgram = createProgram(gl, debugVertSource, debugFragSource);

    // Create procedural texture
    baseTexture = createProceduralTexture(gl, 512);

    // Generate geometries
    const cubeGeo = createCube(0.5);
    const sphereGeo = createSphere(0.6, 32);
    const planeGeo = createPlane(16, 9, 1); // Large plane (glass) in XZ plane

    // Create buffers for cube
    const cubePosBuffer = createBuffer(gl, cubeGeo.positions);
    const cubeNormBuffer = createBuffer(gl, cubeGeo.normals);
    const cubeUvBuffer = createBuffer(gl, cubeGeo.uvs);
    const cubeIndexBuffer = createIndexBuffer(gl, cubeGeo.indices);
    cubeIndexCount = cubeGeo.indices.length;

    // Get attribute locations for standard shader
    const posLoc = gl.getAttribLocation(standardProgram, 'aPosition');
    const normLoc = gl.getAttribLocation(standardProgram, 'aNormal');
    const uvLoc = gl.getAttribLocation(standardProgram, 'aTexCoord');

    // Create VAO for cube
    cubeVao = createVao(gl, [
        { location: posLoc, size: 3, bufferIndex: 0 },
        { location: normLoc, size: 3, bufferIndex: 1 },
        { location: uvLoc, size: 2, bufferIndex: 2 }
    ], [cubePosBuffer, cubeNormBuffer, cubeUvBuffer], cubeIndexBuffer);

    // Create buffers for sphere
    const spherePosBuffer = createBuffer(gl, sphereGeo.positions);
    const sphereNormBuffer = createBuffer(gl, sphereGeo.normals);
    const sphereUvBuffer = createBuffer(gl, sphereGeo.uvs);
    const sphereIndexBuffer = createIndexBuffer(gl, sphereGeo.indices);
    sphereIndexCount = sphereGeo.indices.length;

    // Create VAO for sphere
    sphereVao = createVao(gl, [
        { location: posLoc, size: 3, bufferIndex: 0 },
        { location: normLoc, size: 3, bufferIndex: 1 },
        { location: uvLoc, size: 2, bufferIndex: 2 }
    ], [spherePosBuffer, sphereNormBuffer, sphereUvBuffer], sphereIndexBuffer);

    // Create buffers for plane
    const planePosBuffer = createBuffer(gl, planeGeo.positions);
    const planeNormBuffer = createBuffer(gl, planeGeo.normals);
    const planeUvBuffer = createBuffer(gl, planeGeo.uvs);
    const planeIndexBuffer = createIndexBuffer(gl, planeGeo.indices);
    planeIndexCount = planeGeo.indices.length;

    // Get attribute locations for glass shader
    const glassPosLoc = gl.getAttribLocation(glassProgram, 'aPosition');
    const glassNormLoc = gl.getAttribLocation(glassProgram, 'aNormal');
    const glassUvLoc = gl.getAttribLocation(glassProgram, 'aTexCoord');

    // Create VAO for plane (glass)
    planeVao = createVao(gl, [
        { location: glassPosLoc, size: 3, bufferIndex: 0 },
        { location: glassNormLoc, size: 3, bufferIndex: 1 },
        { location: glassUvLoc, size: 2, bufferIndex: 2 }
    ], [planePosBuffer, planeNormBuffer, planeUvBuffer], planeIndexBuffer);

    // Debug quad (top-left corner)
    if (debugProgram) {
        const quadPositions = new Float32Array([
            -0.98,  0.98,
            -0.60,  0.98,
            -0.60,  0.60,
            -0.98,  0.60
        ]);
        const quadUVs = new Float32Array([
            0, 1,
            1, 1,
            1, 0,
            0, 0
        ]);
        const quadIndices = new Uint16Array([0, 1, 2, 0, 2, 3]);
        const quadPosBuffer = createBuffer(gl, quadPositions);
        const quadUvBuffer = createBuffer(gl, quadUVs);
        const quadIndexBuffer = createIndexBuffer(gl, quadIndices);
        debugIndexCount = quadIndices.length;

        const dbgPosLoc = gl.getAttribLocation(debugProgram, 'aPosition');
        const dbgUvLoc = gl.getAttribLocation(debugProgram, 'aTexCoord');
        debugVao = createVao(gl, [
            { location: dbgPosLoc, size: 2, bufferIndex: 0 },
            { location: dbgUvLoc, size: 2, bufferIndex: 1 }
        ], [quadPosBuffer, quadUvBuffer], quadIndexBuffer);
    }

    // Setup transparency slider
    const slider = document.getElementById('transparencySlider');
    const valueDisplay = document.getElementById('transparencyValue');
    
    // Initialize slider value
    slider.value = transparency;
    valueDisplay.textContent = transparency.toFixed(2);
    
    slider.addEventListener('input', (e) => {
        transparency = parseFloat(e.target.value);
        valueDisplay.textContent = transparency.toFixed(2);
    });

    // Setup cube distance slider
    const cubeSlider = document.getElementById('cubeDistanceSlider');
    const cubeValueDisplay = document.getElementById('cubeDistanceValue');
    
    // Initialize slider value
    cubeSlider.value = cubeDistance;
    cubeValueDisplay.textContent = cubeDistance.toFixed(2);
    
    cubeSlider.addEventListener('input', (e) => {
        cubeDistance = parseFloat(e.target.value);
        cubeValueDisplay.textContent = cubeDistance.toFixed(2);
    });

    // Handle resize
    window.addEventListener('resize', handleResize);
    handleResize();

    // Setup input for fly camera
    setupInput();

    // Start render loop
    requestAnimationFrame(render);
}

function handleResize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    // Update projection matrix
    const aspect = canvas.width / canvas.height;
    const fovy = Math.PI / 4; // 45 degrees
    projectionMatrix = mat4.perspective(fovy, aspect, 0.1, 100.0);

    // Recreate reflection FBO if size changed
    if (canvas.width !== fboWidth || canvas.height !== fboHeight) {
        fboWidth = canvas.width;
        fboHeight = canvas.height;
        createReflectionFbo(fboWidth, fboHeight);
    }
}

function render(time) {
    const now = time * 0.001;
    const deltaTime = Math.min(0.1, now - lastTime);
    lastTime = now;

    updateCamera(deltaTime);
    const lightDir = vec3Normalize(new Float32Array([1, 1, 1]));
    // Glass plane is at Z=0 (XY plane)
    const clipPlane = new Float32Array([0, 0, 1, 0]);
    const planeNormal = vec3Normalize(new Float32Array([clipPlane[0], clipPlane[1], clipPlane[2]]));
    const planeD = clipPlane[3];
    const noClipPlane = new Float32Array([0, 0, 0, 1]);
    // Cube rotates in place at position (-1.0, 2.0, cubeDistance)
    // Create rotation matrix
    const cubeRotation = mat4.rotateY(now * 0.8);
    // Apply translation directly to the rotation matrix
    const cubeModel = new Float32Array(cubeRotation);
    cubeModel[12] = -1.0; // x translation
    cubeModel[13] = 2.0;  // y translation
    cubeModel[14] = cubeDistance;  // z translation
    const sphereModel = mat4.multiply(
        mat4.translate(new Float32Array([1.0, 2.0, -1.5])),
        mat4.identity()
    );
    const cubeNormalMatrix = mat4.transpose(mat4.invert(cubeModel));
    const sphereNormalMatrix = mat4.transpose(mat4.invert(sphereModel));

    // Bind base texture to texture unit 0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, baseTexture);

    // --- Pass 1: reflection into FBO (no glass plane) ---
    gl.bindFramebuffer(gl.FRAMEBUFFER, reflectionFbo);
    gl.viewport(0, 0, fboWidth, fboHeight);
    gl.clearColor(0.05, 0.05, 0.05, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Mirror camera across the glass plane (clipPlane)
    const mirroredPos = reflectPointAcrossPlane(camera.position, planeNormal, planeD);
    const mirroredForward = reflectDirectionAcrossPlane(camera.forward, planeNormal);
    const mirroredTarget = vec3Add(mirroredPos, mirroredForward);
    const mirroredUp = reflectDirectionAcrossPlane(new Float32Array([0, 1, 0]), planeNormal);
    const mirroredView = mat4.lookAt(mirroredPos, mirroredTarget, mirroredUp);

    // When we rebuild the mirrored camera with lookAt() (using reflected forward + reflected up),
    // the resulting view basis is typically right-handed again, so triangle winding does NOT need
    // to be flipped. Forcing gl.frontFace(gl.CW) here can make meshes look inside-out.
    gl.frontFace(gl.CCW);
    gl.cullFace(gl.BACK);
    gl.useProgram(standardProgram);
    gl.bindVertexArray(cubeVao);
    setUniforms(gl, standardProgram, {
        uModel: cubeModel,
        uView: mirroredView,
        uProj: projectionMatrix,
        uNormalMatrix: cubeNormalMatrix,
        uLightDir: lightDir,
        uCameraPos: mirroredPos,
        uTransparency: 0.0,
        uColor: [0.8, 0.3, 0.3],
        uBaseTex: 0,
        uClipPlane: clipPlane
    });
    gl.drawElements(gl.TRIANGLES, cubeIndexCount, gl.UNSIGNED_SHORT, 0);

    gl.bindVertexArray(sphereVao);
    setUniforms(gl, standardProgram, {
        uModel: sphereModel,
        uView: mirroredView,
        uProj: projectionMatrix,
        uNormalMatrix: sphereNormalMatrix,
        uLightDir: lightDir,
        uCameraPos: mirroredPos,
        uTransparency: 0.0,
        uColor: [0.3, 0.8, 0.3],
        uBaseTex: 0,
        uClipPlane: clipPlane
    });
    gl.drawElements(gl.TRIANGLES, sphereIndexCount, gl.UNSIGNED_SHORT, 0);
    // Keep default winding for subsequent passes.
    gl.frontFace(gl.CCW);

    // --- Pass 2: main scene ---
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    viewMatrix = camera.viewMatrix;
    const eye = camera.position;

    gl.useProgram(standardProgram);
    gl.bindVertexArray(cubeVao);
    setUniforms(gl, standardProgram, {
        uModel: cubeModel,
        uView: viewMatrix,
        uProj: projectionMatrix,
        uNormalMatrix: cubeNormalMatrix,
        uLightDir: lightDir,
        uCameraPos: eye,
        uTransparency: 0.0,
        uColor: [0.8, 0.3, 0.3],
        uBaseTex: 0,
        uClipPlane: noClipPlane
    });
    gl.drawElements(gl.TRIANGLES, cubeIndexCount, gl.UNSIGNED_SHORT, 0);

    gl.bindVertexArray(sphereVao);
    setUniforms(gl, standardProgram, {
        uModel: sphereModel,
        uView: viewMatrix,
        uProj: projectionMatrix,
        uNormalMatrix: sphereNormalMatrix,
        uLightDir: lightDir,
        uCameraPos: eye,
        uTransparency: 0.0,
        uColor: [0.3, 0.8, 0.3],
        uBaseTex: 0,
        uClipPlane: noClipPlane
    });
    gl.drawElements(gl.TRIANGLES, sphereIndexCount, gl.UNSIGNED_SHORT, 0);

    // Render glass plane at Z=0 (plane mesh rotated from XZ to XY)
    gl.useProgram(glassProgram);
    gl.bindVertexArray(planeVao);

    const planeModel = mat4.rotateX(-Math.PI / 2);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, reflectionColorTex);

    setUniforms(gl, glassProgram, {
        uModelMatrix: planeModel,
        uViewMatrix: viewMatrix,
        uProjectionMatrix: projectionMatrix,
        uReflectionViewMatrix: mirroredView,
        uReflectionProjectionMatrix: projectionMatrix,
        uTransparency: transparency,
        uColor: [0.7, 0.9, 1.0],
        uRefractionIndex: 1.5,
        uBaseTex: 0,
        uReflectionTex: 1,
        uCameraPos: eye,
        uClipPlane: clipPlane
    });

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.drawElements(gl.TRIANGLES, planeIndexCount, gl.UNSIGNED_SHORT, 0);
    gl.depthMask(true);
    gl.disable(gl.BLEND);

    // Debug quad overlay (F toggle)
    if (debugEnabled && debugProgram && debugVao) {
        gl.disable(gl.DEPTH_TEST);
        gl.useProgram(debugProgram);
        gl.bindVertexArray(debugVao);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, reflectionColorTex);
        setUniforms(gl, debugProgram, { uTex: 2 });
        gl.drawElements(gl.TRIANGLES, debugIndexCount, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);
        gl.enable(gl.DEPTH_TEST);
    }

    requestAnimationFrame(render);
}

// Start application
init();
