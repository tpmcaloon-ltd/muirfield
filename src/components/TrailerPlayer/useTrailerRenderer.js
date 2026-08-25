import { useEffect } from "react";
import * as THREE from "three";
import {
  compositeFragmentShader,
  postFragmentShader,
  vertexShader,
} from "./trailerShader";
import { trailerDisplayConfig, getEffectivePost } from "./trailerDisplayConfig";

const BG_COLOR = 0x181503;
const BG_COLOR_VEC = new THREE.Vector3(24 / 255, 21 / 255, 3 / 255);

function syncPostUniforms(uniforms, config, isMobile, isDebug) {
  const post = getEffectivePost(config, isMobile, isDebug);

  uniforms.uDistortEnabled.value = post.distortEnabled ? 1 : 0;
  uniforms.uDistortK1.value = post.distortK1;
  uniforms.uDistortK2.value = post.distortK2;
  uniforms.uVignetteEnabled.value = post.vignetteEnabled ? 1 : 0;
  uniforms.uVignetteHalfSize.value.set(
    post.vignetteHalfWidth,
    post.vignetteHalfHeight,
  );
  uniforms.uVignetteRadius.value = post.vignetteRadius;
  uniforms.uVignetteFeather.value = post.vignetteFeather;
  uniforms.uChromaticAberrationEnabled.value = post.chromaticAberrationEnabled
    ? 1
    : 0;
  uniforms.uChromaticAberrationStrength.value =
    post.chromaticAberrationStrength;
  uniforms.uScanlinesEnabled.value = post.scanlinesEnabled ? 1 : 0;
}

export function useTrailerRenderer(
  videoRef,
  canvasRef,
  containerRef,
  configRef,
  isMobileRef,
  isDebugRef,
) {
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!video || !canvas || !container) return;

    const getConfig = () => configRef?.current ?? trailerDisplayConfig;
    const getIsMobile = () => isMobileRef?.current ?? false;
    const getIsDebug = () => isDebugRef?.current ?? false;

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
    });
    renderer.setClearColor(BG_COLOR, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.colorSpace = THREE.SRGBColorSpace;
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;

    const renderTarget = new THREE.WebGLRenderTarget(1, 1);
    renderTarget.texture.colorSpace = THREE.SRGBColorSpace;
    renderTarget.texture.minFilter = THREE.LinearFilter;
    renderTarget.texture.magFilter = THREE.LinearFilter;

    const resolution = new THREE.Vector2(1, 1);
    const videoResolution = new THREE.Vector2(1, 1);
    const initialConfig = getConfig();

    const compositeMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: compositeFragmentShader,
      uniforms: {
        uVideo: { value: videoTexture },
        iResolution: { value: resolution.clone() },
        iVideoResolution: { value: videoResolution.clone() },
        uVideoScale: { value: initialConfig.video.scale },
      },
    });

    const postMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: postFragmentShader,
      uniforms: {
        iChannel0: { value: renderTarget.texture },
        iResolution: { value: resolution },
        uBackgroundColor: { value: BG_COLOR_VEC.clone() },
        uDistortEnabled: { value: 1 },
        uDistortK1: { value: initialConfig.post.distortK1 },
        uDistortK2: { value: initialConfig.post.distortK2 },
        uVignetteEnabled: { value: 1 },
        uVignetteHalfSize: {
          value: new THREE.Vector2(
            initialConfig.post.vignetteHalfWidth,
            initialConfig.post.vignetteHalfHeight,
          ),
        },
        uVignetteRadius: { value: initialConfig.post.vignetteRadius },
        uVignetteFeather: { value: initialConfig.post.vignetteFeather },
        uChromaticAberrationEnabled: { value: 1 },
        uChromaticAberrationStrength: {
          value: initialConfig.post.chromaticAberrationStrength,
        },
        uScanlinesEnabled: { value: 1 },
      },
    });

    syncPostUniforms(
      postMaterial.uniforms,
      initialConfig,
      getIsMobile(),
      getIsDebug(),
    );

    const compositeScene = new THREE.Scene();
    compositeScene.add(new THREE.Mesh(geometry, compositeMaterial));

    const postScene = new THREE.Scene();
    postScene.add(new THREE.Mesh(geometry, postMaterial));

    const updateSize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      const dpr = Math.min(window.devicePixelRatio, 2);
      const bufferWidth = Math.max(1, Math.floor(width * dpr));
      const bufferHeight = Math.max(1, Math.floor(height * dpr));

      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height, false);

      renderTarget.setSize(bufferWidth, bufferHeight);

      resolution.set(bufferWidth, bufferHeight);
      compositeMaterial.uniforms.iResolution.value.set(
        bufferWidth,
        bufferHeight,
      );
    };

    const updateVideoSize = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        videoResolution.set(video.videoWidth, video.videoHeight);
        compositeMaterial.uniforms.iVideoResolution.value.set(
          video.videoWidth,
          video.videoHeight,
        );
      }
    };

    let frameId = 0;

    const render = () => {
      const config = getConfig();
      compositeMaterial.uniforms.uVideoScale.value = config.video.scale;
      syncPostUniforms(
        postMaterial.uniforms,
        config,
        getIsMobile(),
        getIsDebug(),
      );

      if (video.readyState >= video.HAVE_CURRENT_DATA) {
        videoTexture.needsUpdate = true;
      }

      renderer.setRenderTarget(renderTarget);
      renderer.setClearColor(BG_COLOR, 1);
      renderer.clear();
      renderer.render(compositeScene, camera);

      renderer.setRenderTarget(null);
      renderer.render(postScene, camera);

      frameId = requestAnimationFrame(render);
    };

    updateSize();
    updateVideoSize();

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);
    video.addEventListener("loadedmetadata", updateVideoSize);

    frameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      video.removeEventListener("loadedmetadata", updateVideoSize);
      videoTexture.dispose();
      renderTarget.dispose();
      compositeMaterial.dispose();
      postMaterial.dispose();
      geometry.dispose();
      renderer.dispose();
    };
  }, [videoRef, canvasRef, containerRef, configRef, isMobileRef, isDebugRef]);
}
