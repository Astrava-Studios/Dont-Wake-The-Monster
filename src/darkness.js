// Completely dark sections (Old Library): every lit material gets a tiny shader patch that turns fragments inside a
// dark zone black — except within the lantern's radius around the thief. Zones + lantern are shared uniforms.
import * as THREE from 'three';

const MAX = 8;
export const DARK = {
  uDk: { value: Array.from({ length: MAX }, () => new THREE.Vector4()) }, // x, z, half-width, half-depth
  uDkN: { value: 0 },
  uDkLight: { value: new THREE.Vector4(0, 1, 0, 2.4) }, // lantern position + radius
};
export function setDarkZones(zones = []) {
  DARK.uDkN.value = Math.min(MAX, zones.length);
  zones.slice(0, MAX).forEach((z, i) => DARK.uDk.value[i].set(z.x, z.z, z.hw, z.hd));
}
export function setDarkLight(x, y, z, r) { DARK.uDkLight.value.set(x, y, z, r); }

function patchMaterial(m) {
  if (!m || m.userData.dk || !(m.isMeshStandardMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial)) return;
  m.userData.dk = true;
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    Object.assign(sh.uniforms, DARK);
    sh.vertexShader = 'varying vec3 vDkW;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
      vec4 dkP = vec4(transformed, 1.0);
      #ifdef USE_BATCHING
        dkP = batchingMatrix * dkP;
      #endif
      #ifdef USE_INSTANCING
        dkP = instanceMatrix * dkP;
      #endif
      vDkW = (modelMatrix * dkP).xyz;`);
    sh.fragmentShader = `varying vec3 vDkW;\nuniform vec4 uDk[${MAX}];\nuniform int uDkN;\nuniform vec4 uDkLight;\n` + sh.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
      float dk = 0.0;
      for (int i = 0; i < ${MAX}; i++) {
        if (i >= uDkN) break;
        vec4 z = uDk[i]; vec2 d = abs(vDkW.xz - z.xy) - z.zw;
        dk = max(dk, 1.0 - smoothstep(-0.7, 0.0, max(d.x, d.y)));
      }
      if (dk > 0.0) {
        float lit = 1.0 - smoothstep(uDkLight.w * 0.55, uDkLight.w, distance(vDkW.xz, uDkLight.xz));
        gl_FragColor.rgb *= 1.0 - dk * (1.0 - lit) * 0.985;
      }`);
  };
  const key = m.customProgramCacheKey ? m.customProgramCacheKey.bind(m) : () => '';
  m.customProgramCacheKey = () => key() + '|dk';
  m.needsUpdate = true;
}
// patch everything under root (call after a level is built; already patched materials are skipped)
export function patchDark(root) {
  root.traverse((o) => { if (!o.isMesh) return; (Array.isArray(o.material) ? o.material : [o.material]).forEach(patchMaterial); });
}
