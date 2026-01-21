attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aTexCoord;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProj;
uniform mat4 uNormalMatrix;
uniform vec4 uClipPlane;

varying vec3 vNormalWorld;
varying vec3 vPositionWorld;
varying vec2 vUV;
varying float vClipDist;

void main() {
    vec4 worldPosition = uModel * vec4(aPosition, 1.0);
    vPositionWorld = worldPosition.xyz;
    vNormalWorld = normalize(mat3(uNormalMatrix) * aNormal);
    vUV = aTexCoord;
    vClipDist = dot(uClipPlane, vec4(vPositionWorld, 1.0));

#ifdef USE_GL_CLIP_DISTANCE
    gl_ClipDistance[0] = vClipDist;
#endif

    gl_Position = uProj * uView * worldPosition;
}
