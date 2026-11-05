import * as THREE from 'three';

// Low-poly optimized version of monster
function testOptMonster() {
  const S = (r, w = 12, h = 8) => new THREE.SphereGeometry(r, w, h);
  const B = (x, y, z) => new THREE.BoxGeometry(x, y, z);
  const C = (rt, rb, h, s = 10) => new THREE.CylinderGeometry(rt, rb, h, s);
  
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial();
  const M = (geo) => { const m = new THREE.Mesh(geo, mat); g.add(m); return m; };

  // body
  M(S(1.4, 16, 12));
  // belly
  M(S(1.05, 12, 8));
  // 5 spots
  for (let i = 0; i < 5; i++) M(S(0.25, 8, 6));
  // 4 spikes
  for (let i = 0; i < 4; i++) M(new THREE.ConeGeometry(0.17, 0.42, 6));
  // head
  M(S(0.92, 14, 10));
  // muzzle
  M(S(0.5, 10, 8));
  // nostrils
  for (let i = 0; i < 2; i++) M(S(0.06, 6, 4));
  // bubble
  M(S(0.13, 8, 6));
  // eyes
  for (let i = 0; i < 2; i++) {
    M(new THREE.TorusGeometry(0.15, 0.035, 6, 10, Math.PI));
    M(S(0.21, 10, 8));
    M(S(0.11, 8, 6));
    M(B(0.3, 0.07, 0.07));
    M(S(0.13, 8, 6));
    M(new THREE.ConeGeometry(0.17, 0.62, 8));
    M(S(0.26, 8, 6));
  }
  // mouth
  M(S(0.32, 10, 8));
  // arms
  for (let i = 0; i < 2; i++) {
    M(new THREE.CapsuleGeometry(0.3, 0.6, 4, 8));
    for (let j = 0; j < 3; j++) M(new THREE.ConeGeometry(0.06, 0.15, 6));
  }
  // feet
  for (let i = 0; i < 2; i++) M(S(0.45, 10, 8));
  // tail (4 segments instead of 7)
  for (let i = 0; i < 4; i++) M(S(0.35, 8, 6));
  M(new THREE.ConeGeometry(0.22, 0.45, 6));

  let tris = 0;
  g.traverse((o) => {
    if (o.isMesh && o.geometry) {
      const geo = o.geometry;
      if (geo.index) tris += geo.index.count / 3;
      else if (geo.attributes.position) tris += geo.attributes.position.count / 3;
    }
  });
  return tris;
}

console.log('Original Monster Tris: 13,508');
console.log('Optimized Monster Tris:', testOptMonster());

