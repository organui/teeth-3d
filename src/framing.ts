import { Box3, Mesh, Vector3, type Object3D } from 'three'

// Shared by every OrganUI explorer so each organ's named views fill the stage
// by the same rule, whatever the organ's shape.
export const FRAME_FILL = 0.8

// Every 16th vertex is plenty to bound the silhouette at a negligible cost.
export function surfacePoints(root: Object3D, stride = 16) {
  const points: Vector3[] = []
  root.updateMatrixWorld(true)
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return
    const position = object.geometry.getAttribute('position')
    for (let i = 0; i < position.count; i += stride) {
      points.push(new Vector3().fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld))
    }
  })
  return points
}

export function framingCenter(points: Vector3[]) {
  return new Box3().setFromPoints(points).getCenter(new Vector3())
}

// Distance from `center` along `direction` at which every sampled point sits
// inside `fill` of the frustum. Fitting points rather than a bounding sphere or
// box keeps tall, flat, and paired organs at a similar, generous size.
export function fitDistance(
  points: Vector3[],
  center: Vector3,
  direction: Vector3,
  fov: number,
  aspect: number,
  fill = FRAME_FILL,
) {
  const forward = direction.clone().normalize()
  const right = new Vector3(0, 1, 0).cross(forward)
  if (right.lengthSq() < 1e-8) right.set(1, 0, 0)
  right.normalize()
  const up = forward.clone().cross(right).normalize()
  const tanV = Math.tan((fov * Math.PI) / 360) * fill
  const tanH = tanV * aspect
  const offset = new Vector3()
  let distance = 0
  for (const point of points) {
    offset.subVectors(point, center)
    distance = Math.max(
      distance,
      offset.dot(forward) +
        Math.max(Math.abs(offset.dot(right)) / tanH, Math.abs(offset.dot(up)) / tanV),
    )
  }
  return distance
}
