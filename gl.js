/**
 * WebGL2 helper functions
 */

/**
 * Initialize WebGL2 context
 * @param {HTMLCanvasElement} canvas - The canvas element
 * @returns {WebGL2RenderingContext|null} WebGL2 context or null if failed
 */
export function initWebGL(canvas) {
    const gl = canvas.getContext('webgl2');
    
    if (!gl) {
        console.error('WebGL2 not supported');
        return null;
    }

    // Enable depth testing
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    // Enable culling
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    return gl;
}

/**
 * Create and compile a shader
 * @param {WebGL2RenderingContext} gl - WebGL2 context
 * @param {number} type - gl.VERTEX_SHADER or gl.FRAGMENT_SHADER
 * @param {string} source - Shader source code
 * @returns {WebGLShader|null} Compiled shader or null if failed
 */
export function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

/**
 * Create a shader program from vertex and fragment shaders with error logging
 * @param {WebGL2RenderingContext} gl - WebGL2 context
 * @param {string} vsSource - Vertex shader source
 * @param {string} fsSource - Fragment shader source
 * @returns {WebGLProgram|null} Shader program or null if failed
 */
export function createProgram(gl, vsSource, fsSource) {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);

    if (!vertexShader || !fragmentShader) {
        return null;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program linking error:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }

    // Clean up shaders after linking
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    return program;
}

/**
 * Create 2D texture (RGBA8 for FBO support)
 * @param {WebGL2RenderingContext} gl - WebGL2 context
 * @param {number} w - Width
 * @param {number} h - Height
 * @param {Object} options - Options: {data, format, internalFormat, type, minFilter, magFilter, wrapS, wrapT}
 * @returns {WebGLTexture} Texture object
 */
export function createTexture2D(gl, w, h, options = {}) {
    const {
        data = null,
        format = gl.RGBA,
        internalFormat = gl.RGBA8,
        type = gl.UNSIGNED_BYTE,
        minFilter = gl.LINEAR,
        magFilter = gl.LINEAR,
        wrapS = gl.CLAMP_TO_EDGE,
        wrapT = gl.CLAMP_TO_EDGE
    } = options;

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);
    gl.bindTexture(gl.TEXTURE_2D, null);

    return texture;
}

/**
 * Create depth renderbuffer (simpler and more compatible than depth texture)
 * @param {WebGL2RenderingContext} gl - WebGL2 context
 * @param {number} w - Width
 * @param {number} h - Height
 * @returns {WebGLRenderbuffer} Renderbuffer object
 */
export function createDepthTexture(gl, w, h) {
    const renderbuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    return renderbuffer;
}

/**
 * Create framebuffer with color texture and depth attachment
 * @param {WebGL2RenderingContext} gl - WebGL2 context
 * @param {WebGLTexture} colorTex - Color texture
 * @param {WebGLRenderbuffer|WebGLTexture} depthAttachment - Depth renderbuffer or texture
 * @returns {WebGLFramebuffer} Framebuffer object
 */
export function createFramebuffer(gl, colorTex, depthAttachment) {
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTex, 0);
    
    if (depthAttachment instanceof WebGLRenderbuffer) {
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthAttachment);
    } else if (depthAttachment instanceof WebGLTexture) {
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthAttachment, 0);
    }
    
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
        console.error('Framebuffer incomplete:', status);
        gl.deleteFramebuffer(fbo);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return null;
    }
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return fbo;
}

/**
 * Create Vertex Array Object (VAO) with simple attribute layout
 * @param {WebGL2RenderingContext} gl - WebGL2 context
 * @param {Array} attribLayout - Array of {location, size, type, normalized, stride, offset}
 * @param {Array<WebGLBuffer>} buffers - Array of buffers
 * @param {WebGLBuffer|null} indices - Index buffer or null
 * @returns {WebGLVertexArrayObject} VAO object
 */
export function createVao(gl, attribLayout, buffers, indices = null) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    for (const attrib of attribLayout) {
        const { location, size, type = gl.FLOAT, normalized = false, stride = 0, offset = 0, bufferIndex = 0 } = attrib;
        
        if (bufferIndex < buffers.length) {
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers[bufferIndex]);
            gl.enableVertexAttribArray(location);
            gl.vertexAttribPointer(location, size, type, normalized, stride, offset);
        }
    }

    if (indices) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
    }

    gl.bindVertexArray(null);
    return vao;
}

/**
 * Set uniforms for a shader program
 * @param {WebGL2RenderingContext} gl - WebGL2 context
 * @param {WebGLProgram} program - Shader program
 * @param {Object} uniformMap - Object mapping uniform names to values
 *   Supports: mat4 (Float32Array), vec3 (Float32Array or [x,y,z]), float (number), int (number), sampler2D (number)
 */
export function setUniforms(gl, program, uniformMap) {
    gl.useProgram(program);

    // Get uniform info to determine types
    const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    const uniformInfo = {};
    for (let i = 0; i < uniformCount; i++) {
        const info = gl.getActiveUniform(program, i);
        if (info) {
            uniformInfo[info.name] = info.type;
        }
    }

    for (const [name, value] of Object.entries(uniformMap)) {
        const location = gl.getUniformLocation(program, name);
        if (location === null) continue;

        const uniformType = uniformInfo[name];

        if (value instanceof Float32Array && value.length === 16) {
            // mat4
            gl.uniformMatrix4fv(location, false, value);
        } else if (value instanceof Float32Array && value.length === 3) {
            // vec3 (Float32Array)
            gl.uniform3fv(location, value);
        } else if (value instanceof Float32Array && value.length === 4) {
            // vec4 (Float32Array)
            gl.uniform4fv(location, value);
        } else if (Array.isArray(value) && value.length === 3) {
            // vec3 (array)
            gl.uniform3f(location, value[0], value[1], value[2]);
        } else if (Array.isArray(value) && value.length === 4) {
            // vec4 (array)
            gl.uniform4f(location, value[0], value[1], value[2], value[3]);
        } else if (typeof value === 'number') {
            // Check uniform type to determine if int or float
            if (uniformType === gl.INT || uniformType === gl.SAMPLER_2D || uniformType === gl.SAMPLER_CUBE) {
                gl.uniform1i(location, value);
            } else {
                // Default to float for FLOAT and unknown types
                gl.uniform1f(location, value);
            }
        }
    }
}

/**
 * Load shader source from file
 * @param {string} url - URL to shader file
 * @returns {Promise<string>} Shader source code
 */
export async function loadShader(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load shader: ${url}`);
    }
    return await response.text();
}

/**
 * Create a buffer and upload data
 * @param {WebGL2RenderingContext} gl - WebGL2 context
 * @param {ArrayBuffer|ArrayBufferView} data - Buffer data
 * @param {number} usage - Buffer usage (gl.STATIC_DRAW, etc.)
 * @returns {WebGLBuffer} WebGL buffer
 */
export function createBuffer(gl, data, usage = gl.STATIC_DRAW) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, usage);
    return buffer;
}

/**
 * Create an index buffer
 * @param {WebGL2RenderingContext} gl - WebGL2 context
 * @param {ArrayBuffer|ArrayBufferView} data - Index data
 * @param {number} usage - Buffer usage
 * @returns {WebGLBuffer} WebGL buffer
 */
export function createIndexBuffer(gl, data, usage = gl.STATIC_DRAW) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, usage);
    return buffer;
}
