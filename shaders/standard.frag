precision mediump float;

uniform vec3 uLightDir;
uniform vec3 uCameraPos;
uniform vec3 uColor;
uniform sampler2D uBaseTex;
uniform float uTransparency;

varying vec3 vNormalWorld;
varying vec3 vPositionWorld;
varying vec2 vUV;
varying float vClipDist;

void main() {
    // Fallback clipping when gl_ClipDistance is unavailable
    if (vClipDist < 0.0) discard;

    vec3 N = normalize(vNormalWorld);
    vec3 L = normalize(uLightDir);
    vec3 V = normalize(uCameraPos - vPositionWorld);
    vec3 H = normalize(L + V);

    float diff = max(dot(N, L), 0.0);
    float spec = pow(max(dot(N, H), 0.0), 32.0);

    vec3 texColor = texture2D(uBaseTex, vUV).rgb;
    vec3 base = texColor * uColor;
    vec3 color = base * (0.2 + 0.8 * diff) + vec3(0.2) * spec;

    gl_FragColor = vec4(color, 1.0 - uTransparency);
}
