import { Mesh, type Intersection, type Object3D } from 'three'

// Ghosts remain selectable when nothing solid is behind them. Prefer the solid
// anatomy visible through them so a translucent shell cannot steal its click.
export function pickVisibleMesh(hits: Pick<Intersection, 'object'>[]): Mesh | undefined {
  const meshes = hits
    .map(({ object }) => object)
    .filter((object): object is Mesh => {
      if (!(object instanceof Mesh)) return false
      for (let parent: Object3D | null = object; parent; parent = parent.parent) {
        if (!parent.visible) return false
      }
      return true
    })
  return (
    meshes.find((mesh) => {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      return materials.some((material) => !material.transparent || material.opacity >= 1)
    }) ?? meshes[0]
  )
}
