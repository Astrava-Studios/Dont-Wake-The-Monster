// Cheaper drawing for weak phones without lowering the resolution (a blurry picture is worse than a simpler one).
//  - setLite(root, on): every MeshStandardMaterial is swapped for a MeshLambertMaterial with the same colour,
//    texture and glow. Same diffuse light, no PBR specular / image-based light: several times fewer GPU
//    instructions per pixel, which is what entry-level Mali / PowerVR GPUs choke on. Reversible.
//  - mergeStatic(world, dynamic): the room's furniture, walls and decor are hundreds of small meshes; every one
//    is a draw call the phone's CPU has to issue each frame. Meshes that never move again are baked into one
//    mesh per material, which cuts the room from ~300 draw calls to a few dozen.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { patchDarkMaterial } from './darkness.js';

const liteOf = new WeakMap();
function toLite(m) {
  let l = liteOf.get(m);
  if (l) return l;
  l = new THREE.MeshLambertMaterial({
    name: m.name, map: m.map, transparent: m.transparent, opacity: m.opacity, side: m.side, alphaTest: m.alphaTest,
    depthWrite: m.depthWrite, depthTest: m.depthTest, vertexColors: m.vertexColors, blending: m.blending,
    emissive: m.emissive, emissiveIntensity: m.emissiveIntensity, emissiveMap: m.emissiveMap, aoMap: m.aoMap, aoMapIntensity: m.aoMapIntensity,
    alphaMap: m.alphaMap, flatShading: m.flatShading, fog: m.fog, toneMapped: m.toneMapped,
  });
  l.color.copy(m.color);
  if (m.metalness > 0.3) l.color.multiplyScalar(1 - m.metalness * 0.35); // without reflections bright metal reads too light
  l.userData.std = m;
  if (m.userData.dk) patchDarkMaterial(l);
  liteOf.set(m, l);
  return l;
}
const swap = (m, on) => (on ? (m.isMeshStandardMaterial ? toLite(m) : m) : (m.userData && m.userData.std) || m);

// Swaps every material under root (call again after new objects were added; already swapped ones are skipped).
export function setLite(root, on) {
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    if (Array.isArray(o.material)) o.material = o.material.map((m) => swap(m, on));
    else o.material = swap(o.material, on);
  });
}

// Bakes the static meshes under `world` into one mesh per material. isDynamic(obj) marks subtrees that still move
// (loose props, treasures, the clock hand...): those are left alone, as are transparent, skinned and mirrored meshes.
export function mergeStatic(world, isDynamic) {
  world.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(world.matrixWorld).invert();
  const buckets = new Map(), mtx = new THREE.Matrix4();
  const visit = (o) => {
    if (!o.visible || isDynamic(o)) return;
    if (o.isMesh && !o.isSkinnedMesh && !o.isInstancedMesh && !Array.isArray(o.material) && !o.material.transparent
      && !o.morphTargetInfluences && !o.userData.flame && o.onBeforeRender === THREE.Object3D.prototype.onBeforeRender && o.geometry && o.geometry.attributes.position) {
      mtx.multiplyMatrices(inv, o.matrixWorld);
      if (mtx.determinant() > 0) { // a mirrored mesh would turn inside out once baked
        const g = o.geometry, attrs = Object.keys(g.attributes).sort().map((k) => k + g.attributes[k].itemSize).join(',');
        const key = `${o.material.uuid}|${attrs}|${!!g.index}|${o.castShadow}|${o.receiveShadow}`;
        let b = buckets.get(key); if (!b) buckets.set(key, (b = { mat: o.material, cast: o.castShadow, recv: o.receiveShadow, list: [] }));
        b.list.push({ o, m: mtx.clone() });
      }
    }
    for (const c of o.children) visit(c);
  };
  for (const c of world.children) visit(c);
  let before = 0, after = 0;
  for (const b of buckets.values()) {
    before += b.list.length;
    if (b.list.length < 2) { after += b.list.length; continue; }
    const geos = b.list.map(({ o, m }) => { const g = o.geometry.clone(); for (const k of Object.keys(g.morphAttributes)) delete g.morphAttributes[k]; g.groups = []; return g.applyMatrix4(m); });
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) { after += b.list.length; continue; }
    const mesh = new THREE.Mesh(merged, b.mat); mesh.castShadow = b.cast; mesh.receiveShadow = b.recv; mesh.userData.merged = true;
    world.add(mesh); after++;
    for (const { o } of b.list) o.removeFromParent();
  }
  // groups left empty are dropped too, so the per-frame matrix update skips them
  const prune = (o) => { for (const c of [...o.children]) prune(c); if (o !== world && o.isGroup && !o.children.length && !isDynamic(o)) o.removeFromParent(); };
  prune(world);
  return { before, after };
}
