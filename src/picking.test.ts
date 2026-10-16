import { expect, test } from 'bun:test'
import { Group, Mesh, MeshStandardMaterial } from 'three'
import { pickVisibleMesh } from './picking'

function mesh(opacity: number) {
  return new Mesh(undefined, new MeshStandardMaterial({ opacity, transparent: opacity < 1 }))
}
test('picks solid inner anatomy through a ghosted outer mesh', () => {
  const outer = mesh(0.22),
    inner = mesh(1)
  expect(pickVisibleMesh([{ object: outer }, { object: inner }])).toBe(inner)
})
test('keeps ghosts selectable when no solid anatomy is hit', () => {
  const outer = mesh(0.22)
  expect(pickVisibleMesh([{ object: outer }])).toBe(outer)
})
test('preserves nearest solid picking and ignores hidden geometry', () => {
  const first = mesh(1),
    second = mesh(1),
    group = new Group()
  expect(pickVisibleMesh([{ object: first }, { object: second }])).toBe(first)
  group.add(first)
  group.visible = false
  expect(pickVisibleMesh([{ object: first }, { object: second }])).toBe(second)
  expect(pickVisibleMesh([])).toBeUndefined()
})
