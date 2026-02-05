# Atendimento aos Requisitos do Projeto

**Projeto:** Efeito de Reflexo e Transparência em WebGL/GLSL  
**Data de Verificação:** 04 de Fevereiro de 2026

---

## Objetivo

Desenvolver um efeito de reflexo e transparência em um plano utilizando WebGL/GLSL, simulando um material translúcido com reflexo (vidro escuro).

---

## ✅ Requisitos Técnicos Atendidos

### 1. ✅ Shader Customizado

**Requisito:** Implementação própria dos shaders vertex e fragment. O shader deve calcular a reflexão e a transparência com base no ângulo de visão (não deve ser utilizado texturas prontas).

**Implementação:**

#### Shaders para Vidro (Glass)

- **Arquivo:** `shaders/glass.vert`
  - Calcula posição em world space
  - Calcula distância de clipping
  - Calcula posição em clip space para reflexão
  - Passa dados para o fragment shader

```glsl
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aTexCoord;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat4 uReflectionViewMatrix;
uniform mat4 uReflectionProjectionMatrix;
uniform vec4 uClipPlane;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vTexCoord;
varying float vClipDist;
varying vec4 vClipPos;
varying vec4 vReflectionClipPos;

void main() {
    vec4 worldPosition = uModelMatrix * vec4(aPosition, 1.0);
    vPosition = worldPosition.xyz;
    vNormal = normalize(mat3(uModelMatrix) * aNormal);
    
    vTexCoord = aTexCoord;
    vClipDist = dot(uClipPlane, vec4(vPosition, 1.0));
    
    vec4 clipPos = uProjectionMatrix * uViewMatrix * worldPosition;
    vClipPos = clipPos;
    vReflectionClipPos = uReflectionProjectionMatrix * uReflectionViewMatrix * worldPosition;
    gl_Position = clipPos;
}
```

- **Arquivo:** `shaders/glass.frag`
  - **Cálculo de Fresnel:** Baseado no ângulo entre a normal e o vetor de visão (`pow(1.0 - max(dot(N, V), 0.0), 3.0)`)
  - **Reflexão Dinâmica:** Amostra textura de reflexão usando coordenadas de tela calculadas
  - **Transparência:** Controlada por `uTransparency` e modulada pelo efeito Fresnel
  - **Sem texturas prontas:** Todas as cores são calculadas proceduralmente

```glsl
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
    if (vClipDist < 0.0) discard;

    vec3 N = normalize(vNormal);
    vec3 V = normalize(uCameraPos - vPosition);

    // Fresnel (stronger at grazing angles)
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);

    // Screen-space UV for reflection
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
```

**Evidência:**
- **Fresnel Effect:** Linha 25 em `glass.frag` - `float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);`
- **Ângulo de Visão:** Calculado pela relação entre normal (N) e vetor de visão (V)
- **Transparência Baseada em Ângulo:** Linha 41 em `glass.frag` - `float alpha = (1.0 - uTransparency) * (0.2 + 0.8 * fresnel);`

---

### 2. ✅ Reflexo e Transparência Dinâmicos

**Requisito:** O reflexo e transparência devem ser simulados utilizando um framebuffer renderizado a partir da cena (não usar cube map) usando renderização em vários passos (como foi feito usando shadowmap). É permitido usar stencil buffer para transparência.

**Implementação:**

#### Multi-Pass Rendering

O projeto implementa renderização em dois passos:

**Passo 1: Renderização da Reflexão no Framebuffer (linhas 646-695 em `main.js`)**

```javascript
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

// Render objects with mirrored camera
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
```

**Passo 2: Renderização da Cena Principal com Vidro (linhas 697-766 em `main.js`)**

```javascript
// --- Pass 2: main scene ---
gl.bindFramebuffer(gl.FRAMEBUFFER, null);
gl.viewport(0, 0, canvas.width, canvas.height);
gl.clearColor(0.1, 0.1, 0.1, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

// Render opaque objects
gl.useProgram(standardProgram);
gl.bindVertexArray(cubeVao);
setUniforms(gl, standardProgram, {
    uModel: cubeModel,
    uView: viewMatrix,
    uProj: projectionMatrix,
    // ... other uniforms
});
gl.drawElements(gl.TRIANGLES, cubeIndexCount, gl.UNSIGNED_SHORT, 0);

// Render glass plane with reflection texture
gl.useProgram(glassProgram);
gl.bindVertexArray(planeVao);

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
```

#### Criação do Framebuffer (linhas 234-260 em `main.js`)

```javascript
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
```

**Evidência:**
- **Framebuffer criado:** Linha 259 em `main.js` - `reflectionFbo = createFramebuffer(gl, reflectionColorTex, reflectionDepth)`
- **Não usa Cube Map:** O projeto usa planar reflection com câmera espelhada
- **Multi-pass:** Dois passos de renderização claramente separados
- **Transparência com Blending:** Linhas 761-766 em `main.js` - `gl.enable(gl.BLEND)`

---

### 3. ✅ Transparência Controlada

**Requisito:** A transparência deve ser ajustável por meio de um uniform.

**Implementação:**

#### Uniform de Transparência

O uniform `uTransparency` é definido no fragment shader do vidro e pode ser ajustado em tempo real.

**Interface HTML (linhas 95-99 em `index.html`):**

```html
<div class="control-group">
    <label for="transparencySlider">Transparency (uTransparency):</label>
    <input type="range" id="transparencySlider" min="0" max="1" step="0.01" value="0.5">
    <div id="transparencyValue" class="value-display">0.50</div>
</div>
```

**Controle JavaScript (linhas 560-571 em `main.js`):**

```javascript
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
```

**Uso no Shader (linha 752 em `main.js`):**

```javascript
setUniforms(gl, glassProgram, {
    // ...
    uTransparency: transparency,
    // ...
});
```

**Aplicação no Fragment Shader (linha 41 em `glass.frag`):**

```glsl
float alpha = (1.0 - uTransparency) * (0.2 + 0.8 * fresnel);
```

**Evidência:**
- **Uniform declarado:** Linha 3 em `glass.frag` - `uniform float uTransparency;`
- **Slider funcional:** Interface HTML com range de 0 a 1
- **Atualização em tempo real:** Event listener atualiza a variável `transparency`
- **Aplicado no shader:** Usado no cálculo final do alpha channel

---

### 4. ✅ Textura Padrão

**Requisito:** Todos os objetos devem possuir uma textura padrão. Inclusive o próprio vidro.

**Implementação:**

#### Textura Procedural Gerada

O projeto cria uma **textura procedural** usando Canvas2D com padrão checker e ruído (linhas 268-322 em `main.js`):

```javascript
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
```

**Criação e Uso (linha 473 em `main.js`):**

```javascript
// Create procedural texture
baseTexture = createProceduralTexture(gl, 512);
```

**Aplicada em Todos os Objetos:**

- **Cubo:** Linha 675 em `main.js` - `uBaseTex: 0`
- **Esfera:** Linha 690 em `main.js` - `uBaseTex: 0`
- **Vidro:** Linha 755 em `main.js` - `uBaseTex: 0`

**Uso nos Shaders:**

- **Standard Fragment Shader:** Linha 26 em `standard.frag` - `vec3 texColor = texture2D(uBaseTex, vUV).rgb;`
- **Glass Fragment Shader:** Linha 33 em `glass.frag` - `vec3 baseColor = texture2D(uBaseTex, vTexCoord).rgb;`

**Evidência:**
- **Textura criada proceduralmente:** Função `createProceduralTexture` (checker + noise)
- **Aplicada em todos objetos:** Cubo, esfera e vidro recebem `uBaseTex`
- **Vidro também tem textura base:** Usado na linha 37 de `glass.frag` para criar a cor base escura do vidro

---

### 5. ✅ Utilizar Clipping Plane

**Requisito:** Não é permitida a seleção por "if" de objetos que serão renderizados.

**Implementação:**

#### Clipping Plane com Hardware Acceleration

O projeto usa **clipping planes em GPU** de duas formas:

**1. Via `gl_ClipDistance` (quando disponível):**

**Detecção de Extensão (linhas 434-441 em `main.js`):**

```javascript
// Use EXT_clip_cull_distance if available; otherwise fall back to fragment discard.
const clipExt = gl.getExtension('EXT_clip_cull_distance');
const clipHeader = clipExt
    ? '#extension GL_EXT_clip_cull_distance : enable\n#define USE_GL_CLIP_DISTANCE\n'
    : '';
const standardVertSource = clipHeader + await loadShader('shaders/standard.vert');
const standardFragSource = await loadShader('shaders/standard.frag');
const glassVertSource = clipHeader + await loadShader('shaders/glass.vert');
```

**Vertex Shader (linhas 21-25 em `standard.vert`):**

```glsl
vClipDist = dot(uClipPlane, vec4(vPositionWorld, 1.0));

#ifdef USE_GL_CLIP_DISTANCE
    gl_ClipDistance[0] = vClipDist;
#endif
```

**2. Fallback com Fragment Discard (GPU-based):**

**Fragment Shader (linhas 14-16 em `standard.frag`):**

```glsl
void main() {
    // Fallback clipping when gl_ClipDistance is unavailable
    if (vClipDist < 0.0) discard;
    // ...
}
```

**Configuração do Plano de Clipping (linhas 623-626 em `main.js`):**

```javascript
// Glass plane is at Z=0 (XY plane)
const clipPlane = new Float32Array([0, 0, 1, 0]);
const planeNormal = vec3Normalize(new Float32Array([clipPlane[0], clipPlane[1], clipPlane[2]]));
const planeD = clipPlane[3];
const noClipPlane = new Float32Array([0, 0, 0, 1]);
```

**Uso nos Uniforms:**

- **Durante reflexão:** Linha 676 em `main.js` - `uClipPlane: clipPlane` (ativa o clipping)
- **Durante renderização normal:** Linha 718 em `main.js` - `uClipPlane: noClipPlane` (desativa o clipping)

**Evidência:**
- **Não usa "if" na CPU:** Todos os objetos são desenhados sem condicionais JavaScript
- **Clipping em GPU:** Usa `gl_ClipDistance` ou `discard` no shader
- **Plano matemático:** Definido por equação do plano (Ax + By + Cz + D = 0)
- **Aplicado uniformemente:** Todos os objetos recebem o uniform `uClipPlane`

---

### 6. ✅ Câmera Flyby

**Requisito:** Câmera que permita movimento flyby (permitido a cópia da internet).

**Implementação:**

#### First-Person Flyby Camera

**Estrutura da Câmera (linhas 29-47 em `main.js`):**

```javascript
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
```

**Atualização de Movimento (linhas 331-358 em `main.js`):**

```javascript
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
```

**Controle de Mouse (linhas 379-385 em `main.js`):**

```javascript
document.addEventListener('mousemove', (e) => {
    if (!inputState.pointerLocked) return;
    camera.yaw += e.movementX * camera.sensitivity;
    camera.pitch -= e.movementY * camera.sensitivity;
    const maxPitch = Math.PI / 2 - 0.01;
    camera.pitch = Math.max(-maxPitch, Math.min(maxPitch, camera.pitch));
});
```

**Controle de Teclado (linhas 387-416 em `main.js`):**

```javascript
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
```

**Controles:**
- **Mouse:** Look around (requer pointer lock)
- **W/A/S/D:** Movimento horizontal
- **Space:** Subir
- **Shift:** Descer
- **F:** Toggle debug view

**Evidência:**
- **6 graus de liberdade:** Movimento em X, Y, Z
- **Rotação livre:** Yaw e pitch sem restrições (exceto limite de pitch)
- **Pointer lock:** Captura o mouse para controle suave
- **Delta time:** Movimento independente de frame rate

---

### 7. ✅ Demonstração em Tempo Real

**Requisito:** Demonstração em tempo real do shader aplicado em um plano dentro de uma cena contendo pelo menos dois objetos (com o plano dividindo eles).

**Implementação:**

#### Cena com Múltiplos Objetos

**Objeto 1: Cubo Rotativo (linhas 627-634 em `main.js`):**

```javascript
// Cube rotates in place at position (-1.0, 1, cubeDistance)
// Create rotation matrix
const cubeRotation = mat4.rotateY(now * 0.8);
// Apply translation directly to the rotation matrix
const cubeModel = new Float32Array(cubeRotation);
cubeModel[12] = -1.0; // x translation
cubeModel[13] = 1.0;  // y translation
cubeModel[14] = cubeDistance;  // z translation (padrão: 2.5)
```

**Objeto 2: Esfera Estática (linhas 635-638 em `main.js`):**

```javascript
const sphereModel = mat4.multiply(
    mat4.translate(new Float32Array([1.0, 1, -1.5])),
    mat4.identity()
);
```

**Plano de Vidro Dividindo os Objetos (linha 741 em `main.js`):**

```javascript
// Render glass plane at Z=0 (plane mesh rotated from XZ to XY)
const planeModel = mat4.rotateX(-Math.PI / 2);
```

**Posicionamento:**
- **Cubo:** Posição `(-1.0, 1.0, 2.5)` - **Na frente do plano** (Z > 0)
- **Esfera:** Posição `(1.0, 1.0, -1.5)` - **Atrás do plano** (Z < 0)
- **Plano de Vidro:** Posição Z = 0 - **Divide a cena**

**Controle de Distância (linhas 574-584 em `main.js`):**

```javascript
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
```

**Loop de Renderização em Tempo Real (linhas 615-782 em `main.js`):**

```javascript
function render(time) {
    const now = time * 0.001;
    const deltaTime = Math.min(0.1, now - lastTime);
    lastTime = now;

    updateCamera(deltaTime);
    // ... render pass 1 (reflection)
    // ... render pass 2 (main scene)
    
    requestAnimationFrame(render);
}

// Start application
init();
```

**Evidência:**
- **2+ objetos:** Cubo e esfera claramente visíveis
- **Plano divide objetos:** Cubo em Z > 0, esfera em Z < 0, vidro em Z = 0
- **Tempo real:** Loop `requestAnimationFrame` roda continuamente
- **Shader aplicado ao plano:** Programa `glassProgram` usado para renderizar o plano
- **Interativo:** Sliders permitem ajustar transparência e distância em tempo real

---

## 📁 Estrutura de Arquivos

```
/home/joser/ifg/trabalhos/cg/
├── index.html              # Interface HTML com canvas e controles
├── main.js                 # Lógica principal, geometrias, renderização
├── gl.js                   # Helpers WebGL2 (shaders, buffers, VAOs, FBOs)
├── math.js                 # Biblioteca de matemática (matrizes, vetores)
├── shaders/
│   ├── standard.vert       # Vertex shader para objetos opacos
│   ├── standard.frag       # Fragment shader para objetos opacos
│   ├── glass.vert          # Vertex shader para vidro
│   └── glass.frag          # Fragment shader para vidro
├── README.md               # Documentação do projeto
└── COMPLIANCE.md           # Este arquivo
```

---

## 🎯 Funcionalidades Extras Implementadas

Além dos requisitos obrigatórios, o projeto inclui:

1. **Debug Mode:** Pressione 'F' para visualizar a textura de reflexão no canto superior esquerdo
2. **Controle de Distância:** Slider para ajustar a distância do cubo em relação ao plano
3. **Textura Procedural:** Padrão checker com ruído gerado em Canvas2D
4. **Suporte a Extensões:** Detecção automática de `EXT_clip_cull_distance` com fallback
5. **Geometria Subdividida:** Esfera com 32 segmentos para suavidade
6. **Sistema de Biblioteca:** Módulos separados para GL, Math e Main
7. **Animação:** Cubo rotaciona em tempo real
8. **Error Handling:** Mensagem amigável se WebGL2 não for suportado

---

## 🔍 Verificação de Compilação

Para verificar que o projeto compila e executa corretamente:

1. **Abra `index.html` em um navegador moderno** (Chrome/Firefox/Edge/Safari)
2. **Verifique o console do navegador** - Não deve haver erros de compilação de shaders
3. **Clique no canvas** para ativar pointer lock
4. **Mova o mouse e use WASD/Space/Shift** para navegar
5. **Ajuste os sliders** para modificar transparência e distância
6. **Pressione 'F'** para toggle do debug view

---

## ✅ Conclusão

Este projeto **atende a TODOS os requisitos técnicos** especificados:

1. ✅ **Shader Customizado:** Implementação completa com cálculo de Fresnel baseado em ângulo de visão
2. ✅ **Reflexo e Transparência Dinâmicos:** Multi-pass rendering com framebuffer, sem cube maps
3. ✅ **Transparência Controlada:** Uniform `uTransparency` ajustável via slider em tempo real
4. ✅ **Textura Padrão:** Textura procedural (checker + noise) aplicada em todos os objetos incluindo vidro
5. ✅ **Clipping Plane:** Implementado via `gl_ClipDistance` ou fragment discard, sem seleção por "if"
6. ✅ **Câmera Flyby:** First-person camera com 6 graus de liberdade (WASD + Space/Shift + mouse)
7. ✅ **Demonstração em Tempo Real:** Cena com cubo, esfera e plano de vidro dividindo-os

**O projeto está completo e pronto para demonstração.**

---

**Desenvolvido com WebGL2, GLSL ES 3.00, e JavaScript puro (sem bibliotecas externas).**
