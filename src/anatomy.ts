export type Group =
  | 'Upper right teeth'
  | 'Upper left teeth'
  | 'Lower left teeth'
  | 'Lower right teeth'
  | 'Gums'
  | 'Jaw bones'

export type Structure = {
  id: string
  fma: string
  name: string
  sourceName: string
  group: Group
  // Official 4.3 IS-A concepts this group draws its source meshes from.
  concepts: string[]
  // FJ element files; each element belongs to exactly one structure.
  elements: string[]
  color: string
  description: string
  note: string
}

type Arch = 'upper' | 'lower'
type Side = 'right' | 'left'
type Kind =
  | 'central incisor'
  | 'lateral incisor'
  | 'canine'
  | 'first premolar'
  | 'second premolar'
  | 'first molar'
  | 'second molar'

// Tooth order from the midline back, matching both numbering systems below.
const kinds: Kind[] = [
  'central incisor',
  'lateral incisor',
  'canine',
  'first premolar',
  'second premolar',
  'first molar',
  'second molar',
]

const colors: Record<Kind, string> = {
  'central incisor': '#f4eedf',
  'lateral incisor': '#efe7d3',
  canine: '#ece0c4',
  'first premolar': '#e9dcbd',
  'second premolar': '#e5d6b4',
  'first molar': '#e2d0aa',
  'second molar': '#ddc9a2',
}

const descriptions: Record<Arch, Record<Kind, string>> = {
  upper: {
    'central incisor':
      'The widest front tooth. Its straight, chisel-shaped edge bites into food and shapes the look of a smile.',
    'lateral incisor':
      'A smaller, rounder version of the central incisor beside it. It helps cut food at the front of the mouth.',
    canine:
      'The eye tooth at the corner of the arch. It has a single pointed cusp for gripping and the longest root of any tooth.',
    'first premolar':
      'A tooth with two cusps, one on the cheek side and one on the palate side. It usually has two roots.',
    'second premolar':
      'Similar to the first premolar but with cusps of more equal size, and usually a single root.',
    'first molar':
      'The largest upper tooth, with four cusps and three roots. It is often the first permanent tooth to erupt, around age six.',
    'second molar':
      'A smaller grinding tooth with four cusps and three roots, erupting around age twelve.',
  },
  lower: {
    'central incisor':
      'The smallest tooth in the mouth. Its thin, flat edge meets the back of the upper incisors when you bite.',
    'lateral incisor':
      'Slightly wider than the lower central incisor next to it, with a single flattened root.',
    canine:
      'The pointed tooth at the corner of the lower arch. It guides the jaw when it slides to the side.',
    'first premolar':
      'A tall cusp on the cheek side and a much smaller one on the tongue side, with a single root.',
    'second premolar':
      'Larger than the first premolar and often with three cusps. It has a single root.',
    'first molar':
      'A broad grinding tooth with five cusps and two roots, front and back. It erupts around age six.',
    'second molar': 'A grinding tooth with four cusps and two roots, erupting around age twelve.',
  },
}

// Universal numbering runs 1 to 32 from the upper right third molar around to
// the lower right third molar; FDI uses a quadrant digit then a position digit.
function numbers(arch: Arch, side: Side, position: number) {
  const universal =
    arch === 'upper'
      ? side === 'right'
        ? 8 - position
        : 9 + position
      : side === 'left'
        ? 24 - position
        : 25 + position
  const quadrant = arch === 'upper' ? (side === 'right' ? 1 : 2) : side === 'left' ? 3 : 4
  return { universal, fdi: `${quadrant}${position + 1}` }
}

function tooth(arch: Arch, side: Side, kind: Kind, fma: string, element: string): Structure {
  const position = kinds.indexOf(kind)
  const { universal, fdi } = numbers(arch, side, position)
  const archName = arch[0].toUpperCase() + arch.slice(1)
  // Source labels put first/second before the arch: "right first upper molar tooth".
  const [order, type] = kind.split(' ')
  const sourceName = /molar/.test(kind)
    ? `${side} ${order} ${arch} ${type} tooth`
    : `${side} ${arch} ${kind} tooth`
  return {
    id: `${arch}-${side}-${kind.replace(' ', '-')}`,
    fma,
    name: `${archName} ${side} ${kind}`,
    sourceName,
    group: `${archName} ${side} teeth` as Group,
    concepts: [fma],
    elements: [element],
    color: colors[kind],
    description: descriptions[arch][kind],
    note:
      `Universal number ${universal}, FDI ${fdi}. Shown as one surface: enamel, dentine and pulp are not separated.` +
      (kind === 'second molar'
        ? ' The third molar (wisdom tooth) behind it is not in the source.'
        : ''),
  }
}

export const anatomySource = 'https://en.wikipedia.org/wiki/Human_tooth'
export const structures: Structure[] = [
  tooth('upper', 'right', 'central incisor', 'FMA55681', 'FJ1279'),
  tooth('upper', 'right', 'lateral incisor', 'FMA55680', 'FJ1280'),
  tooth('upper', 'right', 'canine', 'FMA55798', 'FJ1281'),
  tooth('upper', 'right', 'first premolar', 'FMA55689', 'FJ1277'),
  tooth('upper', 'right', 'second premolar', 'FMA55688', 'FJ1278'),
  tooth('upper', 'right', 'first molar', 'FMA55698', 'FJ1276'),
  tooth('upper', 'right', 'second molar', 'FMA55697', 'FJ1275'),
  tooth('upper', 'left', 'central incisor', 'FMA55682', 'FJ1265'),
  tooth('upper', 'left', 'lateral incisor', 'FMA55683', 'FJ1266'),
  tooth('upper', 'left', 'canine', 'FMA55799', 'FJ1267'),
  tooth('upper', 'left', 'first premolar', 'FMA55690', 'FJ1262'),
  tooth('upper', 'left', 'second premolar', 'FMA55691', 'FJ1264'),
  tooth('upper', 'left', 'first molar', 'FMA55699', 'FJ1261'),
  tooth('upper', 'left', 'second molar', 'FMA55700', 'FJ1263'),
  tooth('lower', 'left', 'central incisor', 'FMA57143', 'FJ1258'),
  tooth('lower', 'left', 'lateral incisor', 'FMA57141', 'FJ1259'),
  tooth('lower', 'left', 'canine', 'FMA55687', 'FJ1260'),
  tooth('lower', 'left', 'first premolar', 'FMA55693', 'FJ1255'),
  tooth('lower', 'left', 'second premolar', 'FMA55692', 'FJ1257'),
  tooth('lower', 'left', 'first molar', 'FMA55704', 'FJ1254'),
  tooth('lower', 'left', 'second molar', 'FMA55703', 'FJ1256'),
  tooth('lower', 'right', 'central incisor', 'FMA57142', 'FJ1272'),
  tooth('lower', 'right', 'lateral incisor', 'FMA57140', 'FJ1273'),
  tooth('lower', 'right', 'canine', 'FMA55686', 'FJ1274'),
  tooth('lower', 'right', 'first premolar', 'FMA55694', 'FJ1269'),
  tooth('lower', 'right', 'second premolar', 'FMA55695', 'FJ1271'),
  tooth('lower', 'right', 'first molar', 'FMA55705', 'FJ1268'),
  tooth('lower', 'right', 'second molar', 'FMA55706', 'FJ1270'),
  {
    id: 'upper-gum',
    fma: 'FMA59763',
    name: 'Upper gum',
    sourceName: 'maxillary gingiva',
    group: 'Gums',
    concepts: ['FMA59763'],
    elements: ['FJ1252'],
    color: '#d9878d',
    description:
      'The gingiva around the necks of the upper teeth. It covers the bone of the upper jaw and seals around each tooth.',
    note: 'Shown as one band. The gum on the roof of the mouth and the lining of the lips and cheeks are not modelled.',
  },
  {
    id: 'lower-gum',
    fma: 'FMA59764',
    name: 'Lower gum',
    sourceName: 'mandibular gingiva',
    group: 'Gums',
    concepts: ['FMA59764'],
    elements: ['FJ1253'],
    color: '#cf7a82',
    description:
      'The gingiva around the necks of the lower teeth, covering the tooth-bearing ridge of the mandible.',
    note: 'Shown as one band. The floor of the mouth and the tongue are omitted.',
  },
  {
    id: 'right-maxilla',
    fma: 'FMA53649',
    name: 'Right maxilla',
    sourceName: 'right maxilla',
    group: 'Jaw bones',
    concepts: ['FMA53649'],
    elements: ['FJ3375'],
    color: '#bdbcb4',
    description:
      'One half of the upper jaw. It holds the upper teeth on this side and forms part of the hard palate, the nose and the floor of the eye socket.',
    note: 'The two maxillae join at the midline. The rest of the skull is omitted.',
  },
  {
    id: 'left-maxilla',
    fma: 'FMA53650',
    name: 'Left maxilla',
    sourceName: 'left maxilla',
    group: 'Jaw bones',
    concepts: ['FMA53650'],
    elements: ['FJ3269'],
    color: '#b6b5ad',
    description:
      'The other half of the upper jaw, mirroring the right maxilla. It is fixed to the skull and does not move.',
    note: 'The two maxillae join at the midline. The rest of the skull is omitted.',
  },
  {
    id: 'mandible',
    fma: 'FMA52748',
    name: 'Mandible',
    sourceName: 'mandible',
    group: 'Jaw bones',
    concepts: ['FMA52748'],
    elements: ['FJ3289'],
    color: '#adaca4',
    description:
      'The lower jaw, the only bone of the skull that moves. It holds the lower teeth and hinges at the temporomandibular joints in front of the ears.',
    note: 'Shown with the mouth closed and the teeth together. The temporal bones it hinges against are omitted.',
  },
]
export const groups = [
  'Upper right teeth',
  'Upper left teeth',
  'Lower left teeth',
  'Lower right teeth',
  'Gums',
  'Jaw bones',
] as const satisfies readonly Group[]
export const byId = Object.fromEntries(structures.map((s) => [s.id, s]))
export const isTooth = (s: Structure) => s.group.endsWith('teeth')
export type View = 'Anterior' | 'Right lateral' | 'Posterior'
export const tour: { id: string; title: string; text: string; view: View; isolate?: boolean }[] = [
  {
    id: 'upper-right-central-incisor',
    title: 'Two arches, 28 teeth',
    text: 'The model shows a full adult set without wisdom teeth: seven teeth in each quarter of the mouth. The front incisors are the widest upper teeth, built to bite.',
    view: 'Anterior',
  },
  {
    id: 'upper-right-canine',
    title: 'The longest root',
    text: 'The upper canine is isolated here. Most of each tooth is hidden in bone: this one’s root is longer than its crown. Restore all to put it back in the jaw.',
    view: 'Right lateral',
    isolate: true,
  },
  {
    id: 'lower-right-first-molar',
    title: 'Grinders at the back',
    text: 'Behind the premolars, the molars have broad, cusped surfaces that crush food. The lower first molar has two roots; the upper molars have three.',
    view: 'Right lateral',
  },
  {
    id: 'upper-gum',
    title: 'Gums seal each tooth',
    text: 'The gingiva wraps the neck of every tooth and covers the bone that holds it. Select a tooth to see its root through the gum and bone.',
    view: 'Anterior',
  },
  {
    id: 'mandible',
    title: 'The jaw that moves',
    text: 'The mandible carries the lower teeth and is the only movable bone of the skull. From behind you can see its branches rising toward the jaw joints.',
    view: 'Posterior',
  },
]

export type Emphasis = 'normal' | 'selected' | 'ghosted'
// With nothing selected every structure keeps its own color. A selection
// keeps its structure solid and ghosts the rest so a root stays visible
// inside the gum and bone around it.
export function emphasis(id: string, selected: string | null): Emphasis {
  if (!selected) return 'normal'
  return id === selected ? 'selected' : 'ghosted'
}
