/**
 * Matrix and vector math utilities (col-major, OpenGL/WebGL convention)
 */

/**
 * Create 4x4 identity matrix
 */
export function mat4Identity() {
    return new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);
}

/**
 * Multiply two 4x4 matrices (col-major)
 */
export function mat4Multiply(a, b) {
    const out = new Float32Array(16);
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            out[i * 4 + j] = 
                a[i * 4 + 0] * b[0 * 4 + j] +
                a[i * 4 + 1] * b[1 * 4 + j] +
                a[i * 4 + 2] * b[2 * 4 + j] +
                a[i * 4 + 3] * b[3 * 4 + j];
        }
    }
    return out;
}

/**
 * Create perspective projection matrix (col-major)
 * @param {number} fovy - Field of view Y in radians
 * @param {number} aspect - Aspect ratio (width/height)
 * @param {number} near - Near clipping plane
 * @param {number} far - Far clipping plane
 */
export function mat4Perspective(fovy, aspect, near, far) {
    const f = 1.0 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);

    return new Float32Array([
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (far + near) * nf, -1,
        0, 0, (2 * far * near) * nf, 0
    ]);
}

/**
 * Create look-at view matrix (col-major)
 * @param {Float32Array} eye - Eye position [x, y, z]
 * @param {Float32Array} target - Target position [x, y, z]
 * @param {Float32Array} up - Up vector [x, y, z]
 */
export function mat4LookAt(eye, target, up) {
    const z = vec3Normalize(vec3Subtract(eye, target));
    const x = vec3Normalize(vec3Cross(up, z));
    const y = vec3Cross(z, x);

    return new Float32Array([
        x[0], y[0], z[0], 0,
        x[1], y[1], z[1], 0,
        x[2], y[2], z[2], 0,
        -vec3Dot(x, eye), -vec3Dot(y, eye), -vec3Dot(z, eye), 1
    ]);
}

/**
 * Create translation matrix (col-major)
 * @param {Float32Array} t - Translation vector [x, y, z]
 */
export function mat4Translate(t) {
    const m = mat4Identity();
    m[12] = t[0];
    m[13] = t[1];
    m[14] = t[2];
    return m;
}

/**
 * Create rotation matrix around Y axis (col-major)
 * @param {number} angle - Rotation angle in radians
 */
export function mat4RotateY(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Float32Array([
        c, 0, -s, 0,
        0, 1, 0, 0,
        s, 0, c, 0,
        0, 0, 0, 1
    ]);
}

/**
 * Create rotation matrix around X axis (col-major)
 * @param {number} angle - Rotation angle in radians
 */
export function mat4RotateX(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Float32Array([
        1, 0, 0, 0,
        0, c, s, 0,
        0, -s, c, 0,
        0, 0, 0, 1
    ]);
}

/**
 * Create scale matrix (col-major)
 * @param {Float32Array} s - Scale vector [x, y, z]
 */
export function mat4Scale(s) {
    const m = mat4Identity();
    m[0] = s[0];
    m[5] = s[1];
    m[10] = s[2];
    return m;
}

/**
 * Invert 4x4 matrix (col-major)
 */
export function mat4Invert(m) {
    const out = new Float32Array(16);
    
    out[0] = m[5] * m[10] * m[15] - m[5] * m[11] * m[14] - m[9] * m[6] * m[15] + m[9] * m[7] * m[14] + m[13] * m[6] * m[11] - m[13] * m[7] * m[10];
    out[1] = -m[1] * m[10] * m[15] + m[1] * m[11] * m[14] + m[9] * m[2] * m[15] - m[9] * m[3] * m[14] - m[13] * m[2] * m[11] + m[13] * m[3] * m[10];
    out[2] = m[1] * m[6] * m[15] - m[1] * m[7] * m[14] - m[5] * m[2] * m[15] + m[5] * m[3] * m[14] + m[13] * m[2] * m[7] - m[13] * m[3] * m[6];
    out[3] = -m[1] * m[6] * m[11] + m[1] * m[7] * m[10] + m[5] * m[2] * m[11] - m[5] * m[3] * m[10] - m[9] * m[2] * m[7] + m[9] * m[3] * m[6];
    
    out[4] = -m[4] * m[10] * m[15] + m[4] * m[11] * m[14] + m[8] * m[6] * m[15] - m[8] * m[7] * m[14] - m[12] * m[6] * m[11] + m[12] * m[7] * m[10];
    out[5] = m[0] * m[10] * m[15] - m[0] * m[11] * m[14] - m[8] * m[2] * m[15] + m[8] * m[3] * m[14] + m[12] * m[2] * m[11] - m[12] * m[3] * m[10];
    out[6] = -m[0] * m[6] * m[15] + m[0] * m[7] * m[14] + m[4] * m[2] * m[15] - m[4] * m[3] * m[14] - m[12] * m[2] * m[7] + m[12] * m[3] * m[6];
    out[7] = m[0] * m[6] * m[11] - m[0] * m[7] * m[10] - m[4] * m[2] * m[11] + m[4] * m[3] * m[10] + m[8] * m[2] * m[7] - m[8] * m[3] * m[6];
    
    out[8] = m[4] * m[9] * m[15] - m[4] * m[11] * m[13] - m[8] * m[5] * m[15] + m[8] * m[7] * m[13] + m[12] * m[5] * m[11] - m[12] * m[7] * m[9];
    out[9] = -m[0] * m[9] * m[15] + m[0] * m[11] * m[13] + m[8] * m[1] * m[15] - m[8] * m[3] * m[13] - m[12] * m[1] * m[11] + m[12] * m[3] * m[9];
    out[10] = m[0] * m[5] * m[15] - m[0] * m[7] * m[13] - m[4] * m[1] * m[15] + m[4] * m[3] * m[13] + m[12] * m[1] * m[7] - m[12] * m[3] * m[5];
    out[11] = -m[0] * m[5] * m[11] + m[0] * m[7] * m[9] + m[4] * m[1] * m[11] - m[4] * m[3] * m[9] - m[8] * m[1] * m[7] + m[8] * m[3] * m[5];
    
    out[12] = -m[4] * m[9] * m[14] + m[4] * m[10] * m[13] + m[8] * m[5] * m[14] - m[8] * m[6] * m[13] - m[12] * m[5] * m[10] + m[12] * m[6] * m[9];
    out[13] = m[0] * m[9] * m[14] - m[0] * m[10] * m[13] - m[8] * m[1] * m[14] + m[8] * m[2] * m[13] + m[12] * m[1] * m[10] - m[12] * m[2] * m[9];
    out[14] = -m[0] * m[5] * m[14] + m[0] * m[6] * m[13] + m[4] * m[1] * m[14] - m[4] * m[2] * m[13] - m[12] * m[1] * m[6] + m[12] * m[2] * m[5];
    out[15] = m[0] * m[5] * m[10] - m[0] * m[6] * m[9] - m[4] * m[1] * m[10] + m[4] * m[2] * m[9] + m[8] * m[1] * m[6] - m[8] * m[2] * m[5];
    
    let det = m[0] * out[0] + m[1] * out[4] + m[2] * out[8] + m[3] * out[12];
    if (det === 0) {
        console.warn('mat4Invert: matrix is singular');
        return mat4Identity();
    }
    
    det = 1.0 / det;
    for (let i = 0; i < 16; i++) {
        out[i] *= det;
    }
    
    return out;
}

/**
 * Transpose 4x4 matrix (col-major to row-major or vice versa)
 */
export function mat4Transpose(m) {
    return new Float32Array([
        m[0], m[4], m[8], m[12],
        m[1], m[5], m[9], m[13],
        m[2], m[6], m[10], m[14],
        m[3], m[7], m[11], m[15]
    ]);
}

/**
 * Normalize 3D vector (returns new vector)
 */
export function vec3Normalize(v) {
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    if (len > 0) {
        return new Float32Array([v[0] / len, v[1] / len, v[2] / len]);
    }
    return new Float32Array([0, 0, 0]);
}

/**
 * Subtract two 3D vectors
 */
export function vec3Subtract(a, b) {
    return new Float32Array([a[0] - b[0], a[1] - b[1], a[2] - b[2]]);
}

/**
 * Add two 3D vectors
 */
export function vec3Add(a, b) {
    return new Float32Array([a[0] + b[0], a[1] + b[1], a[2] + b[2]]);
}

/**
 * Cross product of two 3D vectors
 */
export function vec3Cross(a, b) {
    return new Float32Array([
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
    ]);
}

/**
 * Dot product of two 3D vectors
 */
export function vec3Dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * Scale 3D vector by scalar
 */
export function vec3Scale(v, s) {
    return new Float32Array([v[0] * s, v[1] * s, v[2] * s]);
}

// Export mat4 namespace for convenience
export const mat4 = {
    identity: mat4Identity,
    multiply: mat4Multiply,
    perspective: mat4Perspective,
    lookAt: mat4LookAt,
    translate: mat4Translate,
    rotateY: mat4RotateY,
    rotateX: mat4RotateX,
    scale: mat4Scale,
    invert: mat4Invert,
    transpose: mat4Transpose
};

// Test: lookAt * inverse(lookAt) ≈ identity
(function testMath() {
    const eye = new Float32Array([5, 5, 5]);
    const target = new Float32Array([0, 0, 0]);
    const up = new Float32Array([0, 1, 0]);
    
    const lookAt = mat4LookAt(eye, target, up);
    const invLookAt = mat4Invert(lookAt);
    const result = mat4Multiply(lookAt, invLookAt);
    const identity = mat4Identity();
    
    let maxError = 0;
    for (let i = 0; i < 16; i++) {
        const error = Math.abs(result[i] - identity[i]);
        if (error > maxError) maxError = error;
    }
    
    const passed = maxError < 0.0001;
    console.log(`[math.js] Test: lookAt * inverse(lookAt) ≈ identity`);
    console.log(`  Max error: ${maxError.toFixed(6)} ${passed ? '✓ PASS' : '✗ FAIL'}`);
})();
