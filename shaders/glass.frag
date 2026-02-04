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

    vec3 baseColor = texture2D(uBaseTex, vTexCoord).rgb;
    vec3 tintedBase = baseColor * uColor * 0.35;

    // Reflection UV: project this mirror fragment with the reflection camera (same view/proj
    // used to render the reflection texture). Sample only when in front (w > 0).
    float reflW = vReflectionClipPos.w;
    vec3 reflColor = tintedBase * 0.5;
    if (reflW > 0.01) {
        vec2 ndc = vReflectionClipPos.xy / reflW;
        vec2 screenUV = ndc * 0.5 + 0.5;
        screenUV = clamp(screenUV, 0.0, 1.0);
        reflColor = texture2D(uReflectionTex, screenUV).rgb;
    }

    vec3 color = mix(tintedBase, reflColor, fresnel);

    // Alpha: controlled by transparency and boosted by fresnel
    float alpha = (1.0 - uTransparency) * (0.2 + 0.8 * fresnel);

    gl_FragColor = vec4(color, alpha);
}
