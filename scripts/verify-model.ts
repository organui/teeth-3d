import { createHash } from 'node:crypto'
import { NodeIO } from '@gltf-transform/core'
import { structures } from '../src/anatomy'
import manifest from '../public/models/manifest.json'

const bytes = new Uint8Array(await Bun.file('public/models/teeth.glb').arrayBuffer())
if (createHash('sha256').update(bytes).digest('hex') !== manifest.runtime.sha256)
  throw new Error('Runtime checksum mismatch')
const doc = await new NodeIO().readBinary(bytes)
const nodes = doc.getRoot().listNodes()
if (nodes.length !== structures.length) throw new Error('Incorrect structure count')
let triangles = 0
for (const s of structures) {
  const node = nodes.find((n) => n.getName() === s.id)
  if (
    !node ||
    node.getExtras().fma !== s.fma ||
    JSON.stringify(node.getExtras().elements) !== JSON.stringify(s.elements)
  )
    throw new Error(`Missing or mismatched structure: ${s.id}`)
  for (const p of node.getMesh()!.listPrimitives()) {
    const positions = p.getAttribute('POSITION')!.getArray()!
    const indices = p.getIndices()!.getArray()!
    if (!positions.length || !indices.length || !Array.from(positions).every(Number.isFinite))
      throw new Error(`Invalid geometry: ${s.id}`)
    if (Array.from(indices).some((i) => i < 0 || i >= positions.length / 3))
      throw new Error(`Invalid face: ${s.id}`)
    triangles += indices.length / 3
  }
}
console.log(
  `Verified ${nodes.length} structure mappings, ${triangles.toLocaleString()} triangles, ${bytes.length.toLocaleString()} bytes and SHA-256.`,
)
