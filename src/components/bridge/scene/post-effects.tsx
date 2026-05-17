'use client';

import {
  Bloom,
  BrightnessContrast,
  ChromaticAberration,
  DepthOfField,
  EffectComposer,
  HueSaturation,
  N8AO,
  Noise,
  SMAA,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import { Vector2 } from 'three';

// Stable Vector2 — recreating each render leaks GPU uniform bindings.
const CA_OFFSET = new Vector2(0.0008, 0.0008);

export function PostEffects() {
  return (
    <EffectComposer multisampling={0}>
      <N8AO
        aoRadius={0.6}
        intensity={2.2}
        aoSamples={16}
        denoiseSamples={4}
        color="black"
      />
      <DepthOfField
        focusDistance={0.015}
        focalLength={0.05}
        bokehScale={2.2}
        height={480}
      />
      <Bloom
        intensity={1.05}
        luminanceThreshold={0.82}
        luminanceSmoothing={0.4}
        mipmapBlur
        radius={0.9}
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <ChromaticAberration
        offset={CA_OFFSET}
        radialModulation={false}
        modulationOffset={0}
      />
      <BrightnessContrast brightness={-0.02} contrast={0.18} />
      <HueSaturation saturation={0.12} hue={0} />
      <Vignette eskil={false} offset={0.3} darkness={0.55} />
      <Noise premultiply blendFunction={BlendFunction.OVERLAY} opacity={0.2} />
      <SMAA />
    </EffectComposer>
  );
}
