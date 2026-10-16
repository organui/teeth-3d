import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import {
  Box3,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Spherical,
  Vector3,
} from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RotateCcw, Box, AlertCircle } from 'lucide-react'
import SceneCanvas from './SceneCanvas'
import { pickVisibleMesh } from './picking'
import { fitDistance, framingCenter, surfacePoints } from './framing'
import { byId, emphasis, structures, type View } from './anatomy'
import manifest from '../public/models/manifest.json'

export type ViewerHandle = {
  preset: (view: View) => void
  zoom: (factor: number) => void
  rotate: (x: number, y?: number) => void
}
type Props = {
  selected: string | null
  hidden: Set<string>
  onSelect: (id: string) => void
  onReady: (ready: boolean) => void
  onFreeView: () => void
  controlsRef: RefObject<ViewerHandle | null>
}

function disposeModel(model: Group) {
  model.traverse((object) => {
    if (object instanceof Mesh) {
      object.geometry.dispose()
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      materials.forEach((m) => m.dispose())
    }
  })
}

function CameraControls({
  controlsRef,
  onFreeView,
  onInteraction,
  radius,
  points,
}: Pick<Props, 'controlsRef' | 'onFreeView'> & {
  radius: number
  points: Vector3[]
  onInteraction: () => void
}) {
  const { camera, gl, invalidate, size } = useThree()
  const orbit = useRef<OrbitControls | null>(null)
  const previousPose = useRef<{ position: Vector3; distance: number } | null>(null)
  const freeView = useRef(onFreeView)
  freeView.current = onFreeView
  const interaction = useRef(onInteraction)
  interaction.current = onInteraction
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement)
    orbit.current = controls
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const motion = () => {
      controls.enableDamping = !media.matches
      invalidate()
    }
    motion()
    media.addEventListener('change', motion)
    controls.enablePan = false
    controls.minDistance = radius * 1.25
    controls.maxDistance = radius * 6
    controls.rotateSpeed = 0.65
    controls.zoomSpeed = 0.8
    let interacting = false
    const lastRotation = camera.quaternion.clone()
    let lastDistance = camera.position.distanceTo(controls.target)
    const change = () => {
      const distance = camera.position.distanceTo(controls.target)
      const rotated = 1 - Math.abs(lastRotation.dot(camera.quaternion)) > 1e-10
      if (interacting && (rotated || Math.abs(distance - lastDistance) > 1e-6)) {
        interaction.current()
        if (rotated) freeView.current()
      }
      lastRotation.copy(camera.quaternion)
      lastDistance = distance
      invalidate()
    }
    const start = () => {
      interacting = true
    }
    const end = () => {
      interacting = false
    }
    controls.addEventListener('change', change)
    controls.addEventListener('start', start)
    controls.addEventListener('end', end)
    const center = framingCenter(points)
    const fov = (camera as PerspectiveCamera).fov
    const aspect = size.width / size.height
    const directionFor = (view: View) =>
      new Vector3(
        ...((view === 'Posterior'
          ? [0, 0, -1]
          : view === 'Right lateral'
            ? [-1, 0, 0]
            : [0, 0, 1]) as [number, number, number]),
      ).normalize()
    const fit = (direction: Vector3) =>
      Math.min(
        controls.maxDistance,
        Math.max(controls.minDistance, fitDistance(points, center, direction, fov, aspect)),
      )
    const distance = fit(directionFor('Anterior'))
    const preset = (view: View) => {
      interacting = false
      // reset() clears residual damping before assigning a deterministic view.
      controls.reset()
      const direction = directionFor(view)
      controls.target.copy(center)
      camera.position.copy(direction).multiplyScalar(fit(direction)).add(center)
      camera.lookAt(center)
      controls.update()
      invalidate()
    }
    controlsRef.current = {
      preset,
      zoom(factor) {
        const offset = camera.position.clone().sub(controls.target)
        offset.setLength(
          Math.min(controls.maxDistance, Math.max(controls.minDistance, offset.length() * factor)),
        )
        camera.position.copy(controls.target).add(offset)
        controls.update()
        interaction.current()
        invalidate()
      },
      rotate(x, y = 0) {
        const spherical = new Spherical().setFromVector3(
          camera.position.clone().sub(controls.target),
        )
        spherical.theta += x
        spherical.phi += y
        spherical.makeSafe()
        camera.position.copy(controls.target).add(new Vector3().setFromSpherical(spherical))
        controls.update()
        freeView.current()
        interaction.current()
        invalidate()
      },
    }
    if (previousPose.current) {
      controls.target.copy(center)
      camera.position
        .copy(previousPose.current.position)
        .sub(center)
        .multiplyScalar(distance / previousPose.current.distance)
        .add(center)
      camera.lookAt(center)
      controls.update()
      invalidate()
    } else preset('Anterior')
    return () => {
      previousPose.current = { position: camera.position.clone(), distance }
      controlsRef.current = null
      orbit.current = null
      controls.dispose()
      controls.removeEventListener('change', change)
      controls.removeEventListener('start', start)
      controls.removeEventListener('end', end)
      media.removeEventListener('change', motion)
    }
  }, [camera, gl, invalidate, controlsRef, radius, points, size.width, size.height])
  useFrame(() => orbit.current?.update())
  return null
}

const stageTone = new Color('#e4e3dc')
const ghosts = new Map<string, string>()
function ghostColor(color: string) {
  let value = ghosts.get(color)
  if (!value) {
    value = '#' + new Color(color).lerp(stageTone, 0.5).getHexString()
    ghosts.set(color, value)
  }
  return value
}

function Model({
  model,
  selected,
  hidden,
  onSelect,
}: Pick<Props, 'selected' | 'hidden' | 'onSelect'> & { model: Group }) {
  const { invalidate } = useThree()
  useEffect(() => {
    model.traverse((object) => {
      if (!(object instanceof Mesh)) return
      const id = object.userData.structureId || object.name
      const structure = byId[id]
      if (!structure) return
      object.visible = !hidden.has(id)
      const material = object.material as MeshStandardMaterial
      const state = emphasis(id, selected)
      material.color.set(state === 'ghosted' ? ghostColor(structure.color) : structure.color)
      material.emissive.set(state === 'selected' ? structure.color : '#000000')
      material.emissiveIntensity = state === 'selected' ? 0.35 : 0
      material.transparent = state === 'ghosted'
      material.opacity = state === 'ghosted' ? 0.22 : 1
      material.depthWrite = state !== 'ghosted'
      material.roughness = 0.58
      material.needsUpdate = true
    })
    invalidate()
  }, [model, selected, hidden, invalidate])
  return (
    <primitive
      object={model}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation()
        if (event.delta > 4) return
        const object = pickVisibleMesh(event.intersections)
        if (!object) return
        const id = object.userData.structureId || object.name
        if (byId[id]) onSelect(id)
      }}
    />
  )
}

export default function Viewer(props: Props) {
  const [model, setModel] = useState<Group | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [graphicsReady, setGraphicsReady] = useState(false)
  const readyCallback = useRef(props.onReady)
  readyCallback.current = props.onReady

  useEffect(() => {
    const abort = new AbortController()
    let disposed = false
    let loaded: Group | null = null
    setModel(null)
    setError(null)
    setProgress(0)
    setGraphicsReady(false)
    readyCallback.current(false)
    async function load() {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}models/teeth.glb`, {
          signal: AbortSignal.any([abort.signal, AbortSignal.timeout(30000)]),
        })
        if (!response.ok) throw new Error(`The model request returned HTTP ${response.status}.`)
        const total = Number(response.headers.get('content-length')) || manifest.runtime.bytes
        const reader = response.body?.getReader()
        let data: ArrayBuffer
        if (reader) {
          const chunks: Uint8Array[] = []
          let received = 0
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            chunks.push(value)
            received += value.length
            if (!disposed) setProgress(Math.min(95, Math.round((received / total) * 95)))
          }
          const bytes = new Uint8Array(received)
          let offset = 0
          for (const chunk of chunks) {
            bytes.set(chunk, offset)
            offset += chunk.length
          }
          data = bytes.buffer
        } else data = await response.arrayBuffer()
        if (data.byteLength < 12 || new DataView(data).getUint32(0, true) !== 0x46546c67) {
          throw new Error('The model file is missing or is not a valid GLB.')
        }
        const gltf = await new GLTFLoader().parseAsync(data, '')
        loaded = gltf.scene
        const ids = new Set<string>()
        loaded.traverse((object) => {
          if (object instanceof Mesh) ids.add(object.userData.structureId || object.name)
        })
        if (structures.some((s) => !ids.has(s.id)))
          throw new Error('The model does not contain the expected structures.')
        if (disposed) {
          disposeModel(loaded)
          return
        }
        setProgress(100)
        setModel(loaded)
      } catch (e) {
        if (!disposed)
          setError(
            e instanceof Error && e.name === 'TimeoutError'
              ? 'The download timed out.'
              : e instanceof Error
                ? e.message
                : 'The model could not be decoded.',
          )
      }
    }
    void load()
    return () => {
      disposed = true
      abort.abort()
      if (loaded) disposeModel(loaded)
    }
  }, [attempt])

  const retry = () => setAttempt((n) => n + 1)
  const fallback = (
    <div className="stage-message" role="alert">
      <AlertCircle size={26} />
      <h2>3D view unavailable</h2>
      <p>
        WebGL could not start or its connection was interrupted. Try again, or use a browser with
        hardware acceleration enabled. Every structure is still available in the anatomy panel.
      </p>
      <button className="button" onClick={retry}>
        <RotateCcw size={15} /> Try again
      </button>
    </div>
  )
  const radius = useMemo(
    () => (model ? new Box3().setFromObject(model).getSize(new Vector3()).length() / 2 : 2),
    [model],
  )
  const points = useMemo(() => (model ? surfacePoints(model) : []), [model])
  return (
    <div
      className="canvas-wrap"
      role="region"
      aria-label="Interactive teeth and jaws model"
      tabIndex={0}
      aria-describedby="model-instructions"
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return
        const controls = props.controlsRef.current
        const handled = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-'].includes(
          e.key,
        )
        if (handled) e.preventDefault()
        if (e.key === 'ArrowLeft') controls?.rotate(-0.2)
        if (e.key === 'ArrowRight') controls?.rotate(0.2)
        if (e.key === 'ArrowUp') controls?.rotate(0, -0.2)
        if (e.key === 'ArrowDown') controls?.rotate(0, 0.2)
        if (e.key === '+' || e.key === '=') controls?.zoom(0.85)
        if (e.key === '-') controls?.zoom(1.18)
      }}
    >
      {error ? (
        <div className="stage-message" role="alert">
          <AlertCircle size={26} />
          <h2>The teeth model couldn’t load</h2>
          <p>
            {error} Check your connection and retry. Anatomy text remains available in the panel.
          </p>
          <button className="button" onClick={retry}>
            <RotateCcw size={15} /> Retry model
          </button>
        </div>
      ) : !model ? (
        <div className="stage-message" role="status">
          <Box size={28} />
          <span className="eyebrow">PREPARING YOUR EXPLORATION</span>
          <h2>Finding the teeth.</h2>
          <progress value={progress} max={100} aria-label="Loading teeth model" />
          <p>{progress}% · Loading anatomy</p>
        </div>
      ) : (
        <SceneCanvas
          key={attempt}
          fallback={fallback}
          onReady={() => {
            setGraphicsReady(true)
            readyCallback.current(true)
          }}
          onLost={() => {
            setGraphicsReady(false)
            readyCallback.current(false)
          }}
        >
          <ambientLight intensity={0.8} />
          <hemisphereLight args={['#fffcf3', '#a49b8f', 1.6]} />
          <directionalLight position={[-4, 6, 6]} intensity={2.6} color="#fff5e6" />
          <directionalLight position={[5, 1, -4]} intensity={1.8} color="#e1edff" />
          <directionalLight position={[-3, -3, 0]} intensity={0.45} />
          <Model
            model={model}
            selected={props.selected}
            hidden={props.hidden}
            onSelect={props.onSelect}
          />
          <CameraControls
            controlsRef={props.controlsRef}
            onFreeView={props.onFreeView}
            onInteraction={() => setHasInteracted(true)}
            radius={radius}
            points={points}
          />
        </SceneCanvas>
      )}
      {graphicsReady && (
        <span
          className={`canvas-hint ${hasInteracted ? 'is-dismissed' : ''}`}
          aria-hidden={hasInteracted}
        >
          Drag to rotate · Scroll or pinch to zoom
        </span>
      )}
    </div>
  )
}
