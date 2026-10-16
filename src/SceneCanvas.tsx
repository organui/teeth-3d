import { Component, useEffect, useRef, useState, type ReactNode } from 'react'
import { createRoot, events, extend } from '@react-three/fiber'
import { AmbientLight, DirectionalLight, HemisphereLight, WebGLRenderer } from 'three'

extend({ AmbientLight, DirectionalLight, HemisphereLight })

class SceneErrorBoundary extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onFailure()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

// Own renderer construction so an asynchronous Fiber configure() rejection
// cannot bypass the DOM fallback. Each mount owns a distinct canvas/context.
export default function SceneCanvas({
  children,
  fallback,
  onReady,
  onLost,
}: {
  children: ReactNode
  fallback: ReactNode
  onReady: () => void
  onLost: () => void
}) {
  const container = useRef<HTMLDivElement>(null)
  const root = useRef<ReturnType<typeof createRoot> | null>(null)
  const latest = useRef({ children, onReady, onLost })
  latest.current = { children, onReady, onLost }
  const [failed, setFailed] = useState(false)
  const failedRef = useRef(false)
  const failure = () => {
    failedRef.current = true
    setFailed(true)
    latest.current.onLost()
  }

  useEffect(() => {
    if (failed) return
    const host = container.current!
    const canvas = document.createElement('canvas')
    canvas.setAttribute(
      'aria-label',
      '3D anatomy rendering; use the structure list for an accessible text alternative',
    )
    canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none'
    host.appendChild(canvas)
    let renderer: WebGLRenderer | undefined
    let sceneRoot: ReturnType<typeof createRoot> | undefined
    let observer: ResizeObserver | undefined
    let cancelled = false
    const size = () => ({ width: host.clientWidth, height: host.clientHeight, top: 0, left: 0 })
    const loseContext = (event: Event) => {
      event.preventDefault()
      failure()
    }
    canvas.addEventListener('webglcontextlost', loseContext)
    async function start() {
      try {
        renderer = new WebGLRenderer({
          canvas,
          antialias: true,
          alpha: true,
          powerPreference: 'low-power',
        })
        sceneRoot = createRoot(canvas)
        await sceneRoot.configure({
          gl: renderer,
          events,
          size: size(),
          dpr: [1, 2],
          frameloop: 'demand',
          camera: { position: [0, 0, 10], fov: 34, near: 0.05, far: 100 },
          onCreated: () => {
            if (!cancelled && !failedRef.current) latest.current.onReady()
          },
        })
        if (cancelled) return
        root.current = sceneRoot
        sceneRoot.render(
          <SceneErrorBoundary onFailure={failure}>{latest.current.children}</SceneErrorBoundary>,
        )
        observer = new ResizeObserver(() => {
          // configure() falls back to frameloop 'always' when it is omitted, which
          // would keep rendering every frame after the first resize.
          void sceneRoot?.configure({ size: size(), frameloop: 'demand' }).catch(() => {
            if (!cancelled) failure()
          })
        })
        observer.observe(host)
      } catch {
        if (!cancelled) failure()
      }
    }
    void start()
    return () => {
      cancelled = true
      root.current = null
      observer?.disconnect()
      canvas.removeEventListener('webglcontextlost', loseContext)
      sceneRoot?.unmount()
      renderer?.dispose()
      canvas.remove()
    }
    // Callbacks and scene content are read through latest; mount owns the context.
  }, [failed])
  useEffect(() => {
    root.current?.render(<SceneErrorBoundary onFailure={failure}>{children}</SceneErrorBoundary>)
  }, [children])
  return failed ? fallback : <div ref={container} style={{ width: '100%', height: '100%' }} />
}
