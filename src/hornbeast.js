// The Hornbeast: a sculpted, textured monster (Meshy AI model, public/models/monster/hornbeast.glb) that stands in
// for the procedural monster body (themed monsters keep their outfits). The model has no skeleton, so it gets a "soft rig" in its vertex
// shader: the head, tail and the four legs bend around fixed pivots, weighted by where each vertex sits. Their angles
// come from plain Groups (head, tail, arms) with the same names as the procedural monster's parts, so main.js
// animates both the same way. Eyelids sit over the painted eyes; each monster type re-tints the texture (hue shift).
import * as THREE from 'three';
import { toon, M, addAccessories } from './models.js';

// model space (as exported, ~1.5 x 1.3 x 1.9, facing +z, centred at the origin)
const MODEL_MIN_Y = -0.664;
const HEAD_P = new THREE.Vector3(0, 0, 0.1);
const TAIL_P = new THREE.Vector3(0, -0.2, -0.4);
const FRONT_P = [new THREE.Vector3(-0.52, -0.3, 0.35), new THREE.Vector3(0.52, -0.3, 0.35)];
const HIND_P = [new THREE.Vector3(-0.3, -0.38, -0.35), new THREE.Vector3(0.3, -0.38, -0.35)];
const EYE = { x: 0.2, y: 0.02, z: 0.85 }; // painted eyes: centre, ~0.11 x 0.10 half-size
const SCALE = 2.05;
const ACC_HEAD = 0.53, ACC_BODY = 0.65; // procedural head / body units -> this model's head (model units) / pivot // world units per model unit: about the size of the procedural monster
const BASE_FUR = '#5c35a2'; // the texture's fur colour around the eyes (lid colour for grumbo)
const BASE_TYPE = '#8e6bd8'; // grumbo's colour, the hue the texture is painted in

const VERT_HEAD = /* glsl */`
uniform mat4 uHbHead, uHbTail, uHbArm0, uHbArm1, uHbLeg0, uHbLeg1;
varying float vHbUp; // 1 on the horns' height (Oozefang tints them)
vec3 hbBend(vec3 p, mat4 m, float w) { return mix(p, (m * vec4(p, 1.0)).xyz, w); }
vec3 hbBendN(vec3 n, mat4 m, float w) { return normalize(mix(n, mat3(m) * n, w)); }
void hbWeights(vec3 p, out float wH, out float wT, out float wA0, out float wA1, out float wL0, out float wL1) {
  float low = 1.0 - smoothstep(-0.42, -0.22, p.y);
  float front = smoothstep(0.02, 0.14, p.z) * (1.0 - smoothstep(0.6, 0.7, p.z));
  float fx = smoothstep(0.36, 0.46, abs(p.x));
  wA0 = low * front * fx * step(p.x, 0.0); wA1 = low * front * fx * step(0.0, p.x);
  float hlow = 1.0 - smoothstep(-0.5, -0.38, p.y);
  float hind = smoothstep(-0.65, -0.55, p.z) * (1.0 - smoothstep(-0.12, -0.02, p.z));
  float hx = smoothstep(0.12, 0.2, abs(p.x)) * (1.0 - smoothstep(0.48, 0.56, abs(p.x)));
  wL0 = hlow * hind * hx * step(p.x, 0.0); wL1 = hlow * hind * hx * step(0.0, p.x);
  wH = smoothstep(-0.05, 0.3, p.z) * (1.0 - max(wA0, wA1));
  wT = 1.0 - smoothstep(-0.75, -0.4, p.z);
}
`;
const VERT_NORMAL = /* glsl */`
#include <beginnormal_vertex>
float hbH, hbT, hbA0, hbA1, hbL0, hbL1; hbWeights(position, hbH, hbT, hbA0, hbA1, hbL0, hbL1);
objectNormal = hbBendN(objectNormal, uHbArm0, hbA0); objectNormal = hbBendN(objectNormal, uHbArm1, hbA1);
objectNormal = hbBendN(objectNormal, uHbLeg0, hbL0); objectNormal = hbBendN(objectNormal, uHbLeg1, hbL1);
objectNormal = hbBendN(objectNormal, uHbTail, hbT); objectNormal = hbBendN(objectNormal, uHbHead, hbH);
`;
const VERT_POS = /* glsl */`
#include <begin_vertex>
{ float wH, wT, wA0, wA1, wL0, wL1; hbWeights(position, wH, wT, wA0, wA1, wL0, wL1);
  transformed = hbBend(transformed, uHbArm0, wA0); transformed = hbBend(transformed, uHbArm1, wA1);
  transformed = hbBend(transformed, uHbLeg0, wL0); transformed = hbBend(transformed, uHbLeg1, wL1);
  transformed = hbBend(transformed, uHbTail, wT); transformed = hbBend(transformed, uHbHead, wH); }
vHbUp = smoothstep(0.25, 0.36, position.y);
`;
// Re-tint in YIQ (sRGB values): rotating the chroma (I, Q) turns the hue, its length is the saturation, Y the brightness.
// Only pixels whose hue is near the purple fur change; cream horns, claws, white eyes and the red mouth keep theirs.
const FRAG_TINT = /* glsl */`
#include <map_fragment>
{
  vec3 hbC = pow(max(diffuseColor.rgb, vec3(0.0)), vec3(1.0 / 2.2));
  float hbY = dot(hbC, vec3(0.299, 0.587, 0.114));
  vec2 hbIQ = vec2(dot(hbC, vec3(0.596, -0.274, -0.322)), dot(hbC, vec3(0.211, -0.523, 0.312)));
  float hbChroma = length(hbIQ);
  float hbAng = atan(hbIQ.y, hbIQ.x + 1.0e-6);
  float hbDa = abs(mod(hbAng - uHbTint.w + 3.14159265, 6.2831853) - 3.14159265);
  float hbW = (1.0 - smoothstep(0.45, 0.8, hbDa)) * smoothstep(0.05, 0.1, hbChroma);
  float hbRot = uHbTint.x * hbW;
  hbIQ = mat2(cos(hbRot), sin(hbRot), -sin(hbRot), cos(hbRot)) * hbIQ * mix(1.0, uHbTint.y, hbW);
  hbY *= mix(1.0, uHbTint.z, hbW);
  vec3 hbOut = vec3(hbY + 0.956 * hbIQ.x + 0.621 * hbIQ.y, hbY - 0.272 * hbIQ.x - 0.647 * hbIQ.y, hbY - 1.106 * hbIQ.x + 1.703 * hbIQ.y);
  diffuseColor.rgb = pow(clamp(hbOut, 0.0, 1.0), vec3(2.2));
  float hbHornM = vHbUp * smoothstep(0.55, 0.7, hbY) * uHbHorn.w; // the pale horns (the fur up there is dark)
  diffuseColor.rgb = mix(diffuseColor.rgb, uHbHorn.rgb, hbHornM);
  totalEmissiveRadiance += uHbHorn.rgb * hbHornM * 0.6;
}
`;

// the same maths on the CPU: [hue angle, chroma, luma] of a hex colour (sRGB)
const yiq = (hex) => { const { r, g, b } = new THREE.Color(hex).getRGB({}, THREE.SRGBColorSpace);
  const I = 0.596 * r - 0.274 * g - 0.322 * b, Q = 0.211 * r - 0.523 * g + 0.312 * b;
  return [Math.atan2(Q, I), Math.hypot(I, Q), 0.299 * r + 0.587 * g + 0.114 * b]; };
// rotation, chroma and luma ratios that turn grumbo's purple into the type's colour; w = the fur's hue angle
function tintFor(color) {
  const a = yiq(BASE_TYPE), b = yiq(color);
  return new THREE.Vector4(b[0] - a[0], b[1] / a[1], b[2] / a[2], yiq(BASE_FUR)[0]);
}
function tintColor(hex, t) { // for the eyelids
  const [ang, ch, Y] = yiq(hex); const A = ang + t.x, C = ch * t.y, L = Y * t.z, I = Math.cos(A) * C, Q = Math.sin(A) * C;
  const cl = (v) => Math.max(0, Math.min(1, v));
  return new THREE.Color().setRGB(cl(L + 0.956 * I + 0.621 * Q), cl(L - 0.272 * I - 0.647 * Q), cl(L - 1.106 * I + 1.703 * Q), THREE.SRGBColorSpace).getStyle();
}

function patch(mat, U, tint) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = VERT_HEAD + sh.vertexShader.replace('#include <beginnormal_vertex>', VERT_NORMAL).replace('#include <begin_vertex>', VERT_POS);
    if (tint) sh.fragmentShader = 'uniform vec4 uHbTint, uHbHorn;\nvarying float vHbUp;\n' + sh.fragmentShader.replace('#include <map_fragment>', FRAG_TINT);
  };
  mat.customProgramCacheKey = () => (tint ? 'hornbeast' : 'hornbeast-depth');
}

// src: the loaded model's mesh (assets.js); returns null without it so callers fall back to the procedural monster
export function buildHornbeast(type, src) {
  if (!src) return null;
  const g = new THREE.Group(); const pivot = new THREE.Group(); g.add(pivot);
  const model = new THREE.Group(); model.scale.setScalar(SCALE); model.position.y = -MODEL_MIN_Y * SCALE; pivot.add(model);
  const at = (p) => { const o = new THREE.Group(); o.position.copy(p); model.add(o); return o; };
  const head = at(HEAD_P), tail = at(TAIL_P), arms = FRONT_P.map(at), legs = HIND_P.map(at);
  const tint = tintFor(type.color);
  const U = { uHbHead: { value: new THREE.Matrix4() }, uHbTail: { value: new THREE.Matrix4() }, uHbArm0: { value: new THREE.Matrix4() }, uHbArm1: { value: new THREE.Matrix4() },
    uHbLeg0: { value: new THREE.Matrix4() }, uHbLeg1: { value: new THREE.Matrix4() }, uHbTint: { value: tint },
    uHbHorn: { value: type.alchemist ? new THREE.Vector4(...new THREE.Color('#00ffcc').toArray(), 1) : new THREE.Vector4(0, 0, 0, 0) } };
  const mat = src.material.clone(); patch(mat, U, true);
  mat.userData.liteHook = (l) => patch(l, U, true); // lite.js swaps in a Lambert material on weak phones
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }); patch(depth, U, false);
  const body = new THREE.Mesh(src.geometry, mat); body.castShadow = true; body.receiveShadow = true; body.customDepthMaterial = depth;
  body.frustumCulled = false; // the bent pose can poke out of the rest-pose bounds
  model.add(body);
  const un = new THREE.Matrix4();
  const bend = (u, o) => { o.updateMatrix(); u.value.multiplyMatrices(o.matrix, un.makeTranslation(-o.position.x, -o.position.y, -o.position.z)); };
  body.onBeforeRender = () => {
    bend(U.uHbHead, head); bend(U.uHbTail, tail);
    // the procedural monster swings its arms on x; the hind legs follow the opposite front leg
    bend(U.uHbArm0, arms[0]); bend(U.uHbArm1, arms[1]);
    legs[0].rotation.x = -arms[1].rotation.x * 0.7; legs[1].rotation.x = -arms[0].rotation.x * 0.7;
    bend(U.uHbLeg0, legs[0]); bend(U.uHbLeg1, legs[1]);
  };

  // eyelids over the painted eyes (main.js shows eyesClosed while asleep and nudges their y around 0.18 when restless)
  const lidMat = toon(tintColor(BASE_FUR, tint)), dark = toon('#2a1f33');
  const eyeBase = new THREE.Group(); eyeBase.position.set(0, EYE.y - HEAD_P.y - 0.18, EYE.z - HEAD_P.z); head.add(eyeBase);
  const eyesClosed = [], eyesOpen = [], pupils = [], brows = [];
  for (const s of [-1, 1]) {
    const lid = new THREE.Group(); lid.position.set(s * EYE.x, 0.18, 0); lid.rotation.y = s * 0.42; eyeBase.add(lid); eyesClosed.push(lid);
    const shell = M(new THREE.SphereGeometry(1, 14, 10), lidMat, 0, 0, 0, lid, false); shell.scale.set(0.135, 0.135, 0.09);
    const line = M(new THREE.TorusGeometry(0.08, 0.01, 5, 12, Math.PI), dark, 0, -0.015, 0.088, lid, false); line.rotation.z = Math.PI;
    const eo = new THREE.Group(); eo.visible = false; eyeBase.add(eo); eyesOpen.push(eo); // painted eyes show through when the lids lift
    const pu = new THREE.Group(); eo.add(pu); pupils.push(pu);
    const br = new THREE.Group(); br.visible = false; eyeBase.add(br); brows.push(br);
  }
  const mouth = new THREE.Group(); mouth.visible = false; head.add(mouth); // the model's face already has its fangs
  const teeth = [new THREE.Group(), new THREE.Group()]; const smile = new THREE.Group(); head.add(smile);
  const bubble = M(new THREE.SphereGeometry(0.035, 10, 8), toon('#bfe9ff', { opacity: 0.65, emissive: '#9fd8ff', ei: 0.3 }), 0.06, -0.1 - HEAD_P.y, 0.94 - HEAD_P.z, head, false);
  // dizzy stars ring above the head
  const stars = new THREE.Group(); stars.position.set(0, 0.8, 0.45); stars.visible = false; model.add(stars);
  for (let i = 0; i < 4; i++) { const st = M(new THREE.OctahedronGeometry(0.07), toon('#ffe066', { emissive: '#ffcc00', ei: 0.8 }), Math.cos(i * 1.57) * 0.3, 0, Math.sin(i * 1.57) * 0.3, stars, false); st.scale.y = 0.5; }
  const sh = new THREE.Mesh(new THREE.CircleGeometry(1.7, 16), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.22, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03; g.add(sh);
  // themed outfits (models.js) are laid out for the procedural monster: adapters map its head and back onto this one
  const headFit = new THREE.Group(); headFit.position.set(0, -0.085, 0.33); headFit.scale.setScalar(ACC_HEAD); head.add(headFit);
  const backFit = new THREE.Group(); backFit.position.set(0, 0.16, -0.11); backFit.scale.setScalar(ACC_BODY); pivot.add(backFit);
  addAccessories(type, headFit, backFit, { ownHorns: true });
  return { group: g, pivot, head, body, eyesClosed, eyesOpen, pupils, brows, mouth, teeth, smile, bubble, arms, feet: legs, tail, stars };
}
