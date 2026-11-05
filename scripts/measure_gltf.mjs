import fs from 'fs';
import path from 'path';

function parseGltfTris(filePath) {
  try {
    const isGlb = filePath.endsWith('.glb');
    if (isGlb) {
      const buf = fs.readFileSync(filePath);
      const magic = buf.readUInt32LE(0);
      if (magic !== 0x46546C67) return { error: 'not glb' };
      const jsonLen = buf.readUInt32LE(12);
      const jsonStr = buf.toString('utf8', 20, 20 + jsonLen);
      const gltf = JSON.parse(jsonStr);
      return countGltf(gltf);
    } else {
      const gltf = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return countGltf(gltf);
    }
  } catch (e) {
    return { error: e.message };
  }
}

function countGltf(gltf) {
  let tris = 0;
  let meshCount = (gltf.meshes || []).length;
  let primitives = 0;
  for (const mesh of gltf.meshes || []) {
    for (const prim of mesh.primitives || []) {
      primitives++;
      if (prim.indices !== undefined) {
        const accessor = gltf.accessors[prim.indices];
        tris += accessor.count / 3;
      } else if (prim.attributes.POSITION !== undefined) {
        const accessor = gltf.accessors[prim.attributes.POSITION];
        tris += accessor.count / 3;
      }
    }
  }
  return { tris: Math.round(tris), meshCount, primitives };
}

const dir = 'public/models';
function walk(d) {
  const files = fs.readdirSync(d);
  for (const f of files) {
    const full = path.join(d, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (f.endsWith('.gltf') || f.endsWith('.glb')) {
      console.log(path.relative('public/models', full).padEnd(40), parseGltfTris(full));
    }
  }
}
walk(dir);

