precision mediump float;

uniform float uTransparency;
uniform vec3 uColor;
uniform float uRefractionIndex;
uniform sampler2D uBaseTex;
uniform sampler2D uReflectionTex;
uniform vec3 uCameraPos;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vTexCoord;
varying float vClipDist;
varying vec4 vClipPos;
varying vec4 vReflectionClipPos;

void main() {
    // Fallback clipping when gl_ClipDistance is unavailable
    if (vClipDist < 0.0) discard;

    vec3 N = normalize(vNormal);
    vec3 V = normalize(uCameraPos - vPosition);

    // Fresnel (stronger at grazing angles)
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);

    // Screen-space UV for reflection: use reflected camera's clip position so we sample
    // the reflection texture at the correct pixel (that texture was rendered with reflected view).
    vec2 screenUV = (vReflectionClipPos.xy / vReflectionClipPos.w) * 0.5 + 0.5;
    screenUV = clamp(screenUV, 0.0, 1.0);

    // Sample textures
    vec3 baseColor = texture2D(uBaseTex, vTexCoord).rgb;
    vec3 reflColor = texture2D(uReflectionTex, screenUV).rgb;

    // Dark glass base + fresnel reflection
    vec3 tintedBase = baseColor * uColor * 0.35;
    vec3 color = mix(tintedBase, reflColor, fresnel);

    // Alpha: controlled by transparency and boosted by fresnel
    float alpha = (1.0 - uTransparency) * (0.2 + 0.8 * fresnel);

    gl_FragColor = vec4(color, alpha);
}
