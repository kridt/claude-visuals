'use client';

import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';

/**
 * Crisper post-processing than the bridge. Military readouts should
 * stay legible — lower bloom, harder vignette.
 */
export function PostEffects() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={0.5}
        luminanceThreshold={0.4}
        luminanceSmoothing={0.35}
        mipmapBlur
      />
      <Vignette eskil={false} offset={0.15} darkness={0.7} />
    </EffectComposer>
  );
}
