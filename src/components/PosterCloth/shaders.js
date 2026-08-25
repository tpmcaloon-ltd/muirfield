export const vertexShader = `
    uniform float uTime;
    uniform float uWindStrength;
    uniform float uFabricFreq;
    
    varying vec2 vUv;
    varying float vZ;

    void main() {
        vUv = uv;
        vec3 pos = position;

        float looseFactor = 1.0 - uv.y; 
        float pinInfluence = pow(looseFactor, 1.8);

        float wave1 = sin(uv.x * 5.0 + uTime * 2.0);
        float wave2 = sin(uv.x * 12.0 + uTime * 4.0 + uv.y * 5.0); 
        float wave3 = sin(uTime * 1.5); 
        
        float ripples = (wave1 * 0.5 + wave2 * 0.2 + wave3 * 0.3);

        float displacement = (uWindStrength * 2.0 + ripples * uFabricFreq) * pinInfluence;
        
        pos.y += (sin(displacement) * 0.1) * pinInfluence;
        pos.z += displacement;

        vZ = displacement;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;

export const fragmentShader = `
    uniform sampler2D uTexture;
    uniform float uRatio; 
    
    uniform float uEdgeScale;
    uniform float uEdgeAmp;
    uniform float uFrameSize;
    uniform float uPhotoInset;
    uniform vec3 uPaperColor;
    
    uniform float uScratchAmp;
    uniform float uGrainAmp;
    uniform float uVignette;
    uniform float uSeed;
    uniform float uShadowOpacity; 
    
    uniform vec3 uEdgeShadowColor; 
    uniform float uEdgeShadowOpacity; 
    
    varying vec2 vUv;
    varying float vZ;

    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
    float snoise(vec2 v){
        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy) );
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod(i, 289.0);
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m ;
        m = m*m ;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
    }
    float fbm(vec2 x) {
        float v = 0.0; float a = 0.5; vec2 shift = vec2(100.0);
        mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
        for (int i = 0; i < 5; ++i) { v += a * snoise(x + uSeed); x = rot * x * 2.0 + shift; a *= 0.5; }
        return v;
    }

    void main() {
        vec2 uv = vUv - 0.5;
        vec2 aspectUV = uv;
        aspectUV.x *= uRatio; 

        float noise = fbm(aspectUV * uEdgeScale); 
        float dist = max(abs(uv.x), abs(uv.y));
        float raggedDist = dist + noise * uEdgeAmp;

        float borderLimit = 0.5 - uFrameSize; 
        float alpha = 1.0 - smoothstep(borderLimit, borderLimit + 0.01, raggedDist);
        if (alpha < 0.01) discard;

        float paperGrain = fbm(vUv * 60.0);
        vec3 paperCol = uPaperColor - paperGrain * 0.05;

        vec4 photoTex = texture2D(uTexture, vUv);
        float photoNoise = snoise(aspectUV * 30.0) * 0.005;
        float photoDist = max(abs(uv.x), abs(uv.y)) + photoNoise;
        float photoLimit = borderLimit - uPhotoInset;
        float photoMask = 1.0 - smoothstep(photoLimit, photoLimit + 0.02, photoDist);

        float scratches = snoise(vec2(vUv.x * 300.0, vUv.y * 3.0));
        float dust = fbm(vUv * 40.0 + uSeed);
        
        vec3 grungePhoto = photoTex.rgb;
        grungePhoto = mix(grungePhoto, vec3(0.6, 0.5, 0.4), dust * uGrainAmp); 
        grungePhoto -= scratches * uScratchAmp;
        float len = length(uv); 
        grungePhoto -= len * uVignette;

        vec3 finalRGB = mix(paperCol, grungePhoto, photoMask);

        finalRGB += vZ * uShadowOpacity;

        float edgeShadowFactor = smoothstep(borderLimit - 0.05, borderLimit, raggedDist);
        finalRGB = mix(finalRGB, uEdgeShadowColor, edgeShadowFactor * uEdgeShadowOpacity);

        gl_FragColor = vec4(finalRGB, 1.0);
    }
`;
