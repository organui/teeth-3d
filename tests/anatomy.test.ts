import { describe, expect, test } from 'bun:test'
import { byId, emphasis, isTooth, structures } from '../src/anatomy'

describe('selection emphasis', () => {
  test('keeps every structure normal without a selection', () => {
    expect(structures.every((s) => emphasis(s.id, null) === 'normal')).toBe(true)
  })

  test('keeps the selection solid and ghosts everything else', () => {
    const states = structures.map((s) => emphasis(s.id, 'lower-right-first-molar'))
    expect(states.filter((s) => s === 'selected')).toHaveLength(1)
    expect(emphasis('lower-right-first-molar', 'lower-right-first-molar')).toBe('selected')
    expect(emphasis('mandible', 'lower-right-first-molar')).toBe('ghosted')
  })
})

describe('tooth numbering', () => {
  test('gives each of the 28 teeth a unique Universal and FDI number', () => {
    const teeth = structures.filter(isTooth)
    expect(teeth).toHaveLength(28)
    const universal = teeth.map((t) => t.note.match(/Universal number (\d+)/)![1])
    const fdi = teeth.map((t) => t.note.match(/FDI (\d\d)/)![1])
    expect(new Set(universal).size).toBe(28)
    expect(new Set(fdi).size).toBe(28)
    expect(byId['upper-right-central-incisor'].note).toContain('Universal number 8, FDI 11')
    expect(byId['upper-left-second-molar'].note).toContain('Universal number 15, FDI 27')
    expect(byId['lower-left-first-molar'].note).toContain('Universal number 19, FDI 36')
    expect(byId['lower-right-canine'].note).toContain('Universal number 27, FDI 43')
  })

  test('matches each tooth to its source label', () => {
    expect(byId['upper-right-first-molar'].sourceName).toBe('right first upper molar tooth')
    expect(byId['lower-left-central-incisor'].sourceName).toBe('left lower central incisor tooth')
  })
})

describe('source ownership', () => {
  test('assigns every source element to exactly one structure', () => {
    const elements = structures.flatMap((s) => s.elements)
    expect(new Set(elements).size).toBe(elements.length)
  })
})
