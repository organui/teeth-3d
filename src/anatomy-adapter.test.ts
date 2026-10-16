import { describe, expect, test } from 'bun:test'
import {
  anatomyTree,
  assertAnatomyMapping,
  groupIds,
  hiddenFromVisibility,
  normalizeVisibility,
  sceneIdsForNode,
  visibilityFromHidden,
} from './anatomy-adapter'
import { structures } from './anatomy'

describe('anatomy tree adapter', () => {
  test('groups every structure exactly once under interface group rows', () => {
    expect(groupIds).toEqual([
      'group-upper-right-teeth',
      'group-upper-left-teeth',
      'group-lower-left-teeth',
      'group-lower-right-teeth',
      'group-gums',
      'group-jaw-bones',
    ])
    expect(anatomyTree.flatMap((group) => group.children!.map(({ id }) => id)).sort()).toEqual(
      structures.map(({ id }) => id).sort(),
    )
  })

  test('marks group rows as non-selectable and colours leaves like their meshes', () => {
    for (const group of anatomyTree) {
      expect(group.selectable).toBe(false)
      expect(group.color).toBeUndefined()
      for (const leaf of group.children!) {
        expect(leaf.selectable).toBeUndefined()
        expect(leaf.color).toBe(structures.find(({ id }) => id === leaf.id)!.color)
      }
    }
  })

  test('maps group rows to their scene leaves and leaves to themselves', () => {
    expect(sceneIdsForNode('group-jaw-bones')).toEqual([
      'right-maxilla',
      'left-maxilla',
      'mandible',
    ])
    expect(sceneIdsForNode('mandible')).toEqual(['mandible'])
    expect(sceneIdsForNode('unknown')).toEqual([])
    expect(sceneIdsForNode(null)).toEqual([])
  })

  test('treats missing visibility entries as visible', () => {
    const visibility = normalizeVisibility({ mandible: false })
    expect(visibility.mandible).toBe(false)
    expect(visibility['upper-gum']).toBe(true)
    expect(Object.keys(visibility)).toHaveLength(structures.length)
  })

  test('round-trips the hidden set through the tree visibility map', () => {
    const hidden = new Set(['upper-right-canine', 'lower-gum'])
    const visibility = visibilityFromHidden(hidden)
    expect(visibility).toEqual({ 'upper-right-canine': false, 'lower-gum': false })
    expect(hiddenFromVisibility(visibility)).toEqual(hidden)
    expect(hiddenFromVisibility({ mandible: true })).toEqual(new Set())
  })

  test('rejects missing, unknown, and duplicate leaves', () => {
    expect(() => assertAnatomyMapping()).not.toThrow()
    const [first, ...rest] = anatomyTree
    expect(() => assertAnatomyMapping(rest)).toThrow(/missing=upper-right-central-incisor/)
    expect(() =>
      assertAnatomyMapping([
        ...anatomyTree,
        { id: 'upper-right-third-molar', label: 'Wisdom tooth' },
      ]),
    ).toThrow(/unknown=upper-right-third-molar/)
    expect(() =>
      assertAnatomyMapping([...anatomyTree, { id: 'g', label: 'Again', children: [first] }]),
    ).toThrow(/duplicates=upper-right-central-incisor/)
  })
})
