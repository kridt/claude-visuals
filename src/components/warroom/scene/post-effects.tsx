'use client';

import {
  Bloom,
  BrightnessContrast,
  ChromaticAberration,
  EffectComposer,
  HueSaturation,
  N8AO,
  Noise,
  SMAA,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';

/**
 * Film-grade post pipeline. The Canvas runs in `flat` mode so this
 * composer's ACES tone mapping is authoritative.
 */
export function PostEffects() {
  return (
    <EffectComposer multisampling={0}>
      <N8AO
        aoRadius={0.4}
        intensity={1.9}
        aoSamples={12}
        denoiseSamples={4}
        color="black"
      />
      <Bloom
        intensity={0.95}
        luminanceThreshold={0.78}
        luminanceSmoothing={0.5}
        mipmapBlur
        radius={0.75}
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <ChromaticAberration
        offset={[0.001, 0.0005]}
        radialModulation={false}
        modulationOffset={0}
      />
      <BrightnessContrast brightness={-0.04} contrast={0.22} />
      <HueSaturation saturation={0.08} hue={-0.02} />
      <Vignette eskil={false} offset={0.25} darkness={0.65} />
      <Noise premultiply blendFunction={BlendFunction.OVERLAY} opacity={0.22} />
      <SMAA />
    </EffectComposer>
  );
}
