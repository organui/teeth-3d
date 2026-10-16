import { mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { Document, NodeIO } from '@gltf-transform/core'
import { BufferGeometry, Float32BufferAttribute, Color } from 'three'
import inputs from './model-inputs.json'
import { structures } from '../src/anatomy'

const sha = (data: Uint8Array) => createHash('sha256').update(data).digest('hex')
await mkdir('.asset-cache/objs', { recursive: true })
await mkdir('public/models', { recursive: true })
for (const input of inputs.objects) {
  const file = Bun.file(`.asset-cache/objs/${input.file}`)
  if (!(await file.exists())) {
    console.log(`Downloading ${input.file}…`)
    const response = await fetch(input.url)
    if (!response.ok) throw new Error(`${input.file}: HTTP ${response.status}`)
    await Bun.write(file, response)
  }
  if (sha(new Uint8Array(await file.arrayBuffer())) !== input.sha256) {
    throw new Error(
      `Checksum mismatch: ${input.file}. Refusing changed upstream data; review it before updating the pin.`,
    )
  }
}
const mapBytes = new Uint8Array(await Bun.file(inputs.mapping.file).arrayBuffer())
if (sha(mapBytes) !== inputs.mapping.sha256) throw new Error('Official concept mapping changed')
const isa = new Map(
  new TextDecoder()
    .decode(mapBytes)
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split('\t'))
    .filter((r) => r[1] === 'is_a')
    .map((r) => [r[0], r[2].split('+')]),
)
const doc = new Document()
doc.getRoot().getAsset().copyright =
  'BodyParts3D / Anatomography, © The Database Center for Life Science. CC BY-SA 2.1 Japan. Adapted by OrganUI.'
const scene = doc.createScene('OrganUI Teeth — BodyParts3D 4.3')
const buffer = doc.createBuffer()
const used = new Set<string>()
const min = [Infinity, Infinity, Infinity],
  max = [-Infinity, -Infinity, -Infinity]
const prepared = []
for (const structure of structures) {
  const mapped = structure.concepts.flatMap((c) => isa.get(c) ?? [])
  const positions: number[] = [],
    indices: number[] = []
  const sources = structure.elements.map((id) => {
    if (!mapped.includes(id)) throw new Error(`${id} is not an IS-A element of ${structure.id}`)
    if (used.has(id)) throw new Error(`Duplicate ownership: ${id}`)
    used.add(id)
    const input = inputs.objects.find((i) => i.id === id)
    if (!input) throw new Error(`Missing input: ${id}`)
    return { id, input }
  })
  const elements = []
  for (const { id, input } of sources) {
    const bytes = new Uint8Array(await Bun.file(`.asset-cache/objs/${input.file}`).arrayBuffer())
    const text = new TextDecoder().decode(bytes)
    const header = (name: string) => text.match(new RegExp(`^# ${name} : (.+)$`, 'm'))?.[1].trim()
    const concept = header('Concept ID')
    if (
      header('File ID') !== id ||
      !concept ||
      !structure.concepts.includes(concept) ||
      !isa.get(concept)!.includes(id) ||
      header('Compatibility version') !== '4.3'
    )
      throw new Error(`Geometry header does not match the official mapping: ${id}`)
    const offset = positions.length / 3
    let vertexCount = 0,
      triangles = 0
    for (const line of text.split(/\r?\n/)) {
      const tokens = line.trim().split(/\s+/)
      if (tokens[0] === 'v') {
        const v = tokens.slice(1, 4).map(Number)
        if (v.length !== 3 || !v.every(Number.isFinite)) throw new Error(`Invalid vertex: ${id}`)
        v.forEach((p, i) => {
          min[i] = Math.min(min[i], p)
          max[i] = Math.max(max[i], p)
        })
        positions.push(...v)
        vertexCount++
      } else if (tokens[0] === 'f') {
        const face = tokens.slice(1).map((t) => {
          const i = Number(t.split('/')[0])
          return offset + (i > 0 ? i - 1 : vertexCount + i)
        })
        for (let i = 1; i < face.length - 1; i++) {
          indices.push(face[0], face[i], face[i + 1])
          triangles++
        }
      }
    }
    if (!vertexCount || !triangles) throw new Error(`Empty mesh: ${id}`)
    elements.push({
      element: id,
      concept,
      sourceName: header('English name'),
      sha256: input.sha256,
      bytes: bytes.length,
      vertices: vertexCount,
      triangles,
    })
  }
  prepared.push({ structure, positions, indices, elements })
}
if (used.size !== inputs.objects.length)
  throw new Error(
    `Unused input meshes: ${inputs.objects.filter((i) => !used.has(i.id)).map((i) => i.id)}`,
  )
const center = min.map((v, i) => (v + max[i]) / 2)
const scale = 0.025 // millimeters to display units; uniform scale, no anatomical reshaping
for (const { structure, positions, indices } of prepared) {
  const transformed = new Float32Array(positions.length)
  for (let i = 0; i < positions.length; i += 3) {
    transformed[i] = (positions[i] - center[0]) * scale
    transformed[i + 1] = (positions[i + 2] - center[2]) * scale
    transformed[i + 2] = -(positions[i + 1] - center[1]) * scale
  }
  const geometry = new BufferGeometry()
    .setAttribute('position', new Float32BufferAttribute(transformed, 3))
    .setIndex(indices)
  geometry.computeVertexNormals()
  const color = new Color(structure.color)
  const material = doc
    .createMaterial(structure.id)
    .setBaseColorFactor([color.r, color.g, color.b, 1])
    .setRoughnessFactor(0.65)
    .setMetallicFactor(0)
    .setDoubleSided(true)
  const primitive = doc
    .createPrimitive()
    .setAttribute(
      'POSITION',
      doc.createAccessor().setType('VEC3').setArray(transformed).setBuffer(buffer),
    )
    .setAttribute(
      'NORMAL',
      doc
        .createAccessor()
        .setType('VEC3')
        .setArray(new Float32Array(geometry.getAttribute('normal').array))
        .setBuffer(buffer),
    )
    .setIndices(
      doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(indices)).setBuffer(buffer),
    )
    .setMaterial(material)
  const mesh = doc.createMesh(structure.id).addPrimitive(primitive)
  scene.addChild(
    doc
      .createNode(structure.id)
      .setMesh(mesh)
      .setExtras({ structureId: structure.id, fma: structure.fma, elements: structure.elements }),
  )
  geometry.dispose()
}
const runtime = await new NodeIO().writeBinary(doc)
await Bun.write('public/models/teeth.glb', runtime)
const manifest = {
  dataset: 'BodyParts3D / Anatomography',
  version: '4.3',
  variant: 'Object set 4.3, ontology tree FMA3.0; official IS-A concept-to-element mapping',
  retrieved: '2026-10-16',
  license: 'CC-BY-SA-2.1-JP',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en',
  sourceLicenseStatement: 'https://lifesciencedb.jp/bp3d/info/index.html#License',
  credit: doc.getRoot().getAsset().copyright,
  mirror: {
    repository: 'https://github.com/olivercase/body_parts_3d_api',
    commit: inputs.mirrorCommit,
  },
  mapping: inputs.mapping,
  transform: { sourceBoundsMm: { min, max }, centerMm: center, scale, axes: '[x, z, -y]' },
  runtime: { file: 'teeth.glb', bytes: runtime.byteLength, sha256: sha(runtime) },
  structures: prepared.map(({ structure, elements }) => ({
    id: structure.id,
    fma: structure.fma,
    concepts: structure.concepts,
    sourceName: structure.sourceName,
    elements,
  })),
}
await Bun.write('public/models/manifest.json', JSON.stringify(manifest, null, 2) + '\n')
await Bun.write(
  'docs/model-source/selected-mappings.tsv',
  'structure\tconcept id\tsource name\telement file id\tsha256\n' +
    prepared
      .flatMap(({ structure, elements }) =>
        elements.map((e) =>
          [structure.id, e.concept, e.sourceName, e.element, e.sha256].join('\t'),
        ),
      )
      .join('\n') +
    '\n',
)
console.log(
  `Prepared ${structures.length} groups, ${used.size} source meshes, ${runtime.byteLength} bytes. SHA-256 ${sha(runtime)}`,
)
