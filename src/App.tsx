import { useCallback, useEffect, useRef, useState } from 'react'
import { removeBackground } from '@imgly/background-removal'

type Status = 'empty' | 'processing' | 'result'
type Bg = 'transparent' | 'mist' | 'ink' | 'flame' | 'decor'
type Frame = 'auto' | '1:1' | '4:5' | '16:9'
type Format = 'png' | 'jpg' | 'webp'

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp']
const MAX_SIZE = 10 * 1024 * 1024

function loadImage(src: File | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image load failed'))
    if (src instanceof File) img.src = URL.createObjectURL(src)
    else img.src = src
  })
}

async function normalizeFile(file: File): Promise<File> {
  const img = await loadImage(file)
  const max = 4000
  if (Math.max(img.width, img.height) <= max) return file
  const scale = max / Math.max(img.width, img.height)
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, w, h)
  const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/png'))
  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.png', { type: 'image/png' })
}

function getAlphaBBox(img: HTMLImageElement) {
  const c = document.createElement('canvas')
  c.width = img.naturalWidth
  c.height = img.naturalHeight
  const ctx = c.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  const data = ctx.getImageData(0, 0, c.width, c.height).data
  let minX = c.width
  let minY = c.height
  let maxX = 0
  let maxY = 0
  let found = false
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const a = data[(y * c.width + x) * 4 + 3]
      if (a > 0) {
        found = true
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (!found) return { x: 0, y: 0, w: c.width, h: c.height }
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 }
}

function cropRectForFrame(frame: Frame, bbox: { x: number; y: number; w: number; h: number }, imgW: number, imgH: number) {
  if (frame === 'auto') return { sx: bbox.x, sy: bbox.y, sw: bbox.w, sh: bbox.h }
  const ratios: Record<Exclude<Frame, 'auto'>, number> = { '1:1': 1, '4:5': 4 / 5, '16:9': 16 / 9 }
  const r = ratios[frame as Exclude<Frame, 'auto'>]
  // start from bbox, expand to ratio
  let w = bbox.w
  let h = bbox.h
  if (w / h > r) {
    h = Math.round(w / r)
  } else {
    w = Math.round(h * r)
  }
  // center on bbox center
  const cx = bbox.x + bbox.w / 2
  const cy = bbox.y + bbox.h / 2
  let x = Math.round(cx - w / 2)
  let y = Math.round(cy - h / 2)
  // clamp
  if (x < 0) x = 0
  if (y < 0) y = 0
  if (x + w > imgW) {
    x = Math.max(0, imgW - w)
    w = Math.min(w, imgW)
  }
  if (y + h > imgH) {
    y = Math.max(0, imgH - h)
    h = Math.min(h, imgH)
  }
  return { sx: x, sy: y, sw: w, sh: h }
}

export default function App() {
  const [status, setStatus] = useState<Status>('empty')
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)
  const [originalName, setOriginalName] = useState('image')
  const [cutoutUrl, setCutoutUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const [bg, setBg] = useState<Bg>('transparent')
  const [decorUrl, setDecorUrl] = useState<string | null>(null)
  const [shadow, setShadow] = useState(40)
  const [frame, setFrame] = useState<Frame>('auto')
  const [format, setFormat] = useState<Format>('png')
  const [pos, setPos] = useState(50)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const decorInputRef = useRef<HTMLInputElement>(null)
  const dropzoneRef = useRef<HTMLLabelElement>(null)

  const handleFile = useCallback(async (file: File) => {
    if (status === 'processing') return
    if (!ACCEPTED.includes(file.type)) {
      setError('Unsupported format. Use PNG, JPG or WEBP.')
      return
    }
    if (file.size > MAX_SIZE) {
      setError('Image too large (max 10 MB).')
      return
    }
    setError(null)
    // cleanup previous
    setOriginalUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setCutoutUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setStatus('processing')
    setProgress(0)
    try {
      const normalized = await normalizeFile(file)
      const origUrl = URL.createObjectURL(normalized)
      setOriginalUrl(origUrl)
      setOriginalName(file.name.replace(/\.[^.]+$/, '') || 'image')
      const blob = await removeBackground(normalized, {
        progress: (_key, current, total) => {
          if (total > 0) setProgress(Math.round((current / total) * 100))
        },
      })
      const cUrl = URL.createObjectURL(blob)
      setCutoutUrl(cUrl)
      setStatus('result')
    } catch (e) {
      console.error(e)
      setError('Processing failed. Try again.')
      setStatus('empty')
    }
  }, [status])

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
    e.target.value = ''
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  const onPaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const it of items) {
      if (it.kind === 'file') {
        const f = it.getAsFile()
        if (f) {
          handleFile(f)
          break
        }
      }
    }
  }, [handleFile])

  useEffect(() => {
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [onPaste])

  const onDecorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!ACCEPTED.includes(f.type)) {
      setError('Unsupported format for the backdrop.')
      return
    }
    const url = URL.createObjectURL(f)
    setDecorUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return url
    })
    setBg('decor')
    e.target.value = ''
  }

  const disabled = status !== 'result'

  const download = async () => {
    if (!cutoutUrl || !originalUrl) return
    try {
      const cutImg = await loadImage(cutoutUrl)
      const bbox = getAlphaBBox(cutImg)
      const { sx, sy, sw, sh } = cropRectForFrame(frame, bbox, cutImg.naturalWidth, cutImg.naturalHeight)

      let canvasW = sw
      let canvasH = sh
      const canvas = document.createElement('canvas')
      canvas.width = canvasW
      canvas.height = canvasH
      const ctx = canvas.getContext('2d')!

      // background
      const jpgNeedsBg = format === 'jpg'
      const effectiveBg: Bg = bg === 'transparent' && jpgNeedsBg ? 'mist' : bg

      if (effectiveBg === 'mist') {
        ctx.fillStyle = '#c9d6df'
        ctx.fillRect(0, 0, canvasW, canvasH)
      } else if (effectiveBg === 'ink') {
        ctx.fillStyle = '#2b2d30'
        ctx.fillRect(0, 0, canvasW, canvasH)
      } else if (effectiveBg === 'flame') {
        ctx.fillStyle = '#ff4b2b'
        ctx.fillRect(0, 0, canvasW, canvasH)
      } else if (effectiveBg === 'decor' && decorUrl) {
        const decorImg = await loadImage(decorUrl)
        // cover
        const scale = Math.max(canvasW / decorImg.naturalWidth, canvasH / decorImg.naturalHeight)
        const dw = decorImg.naturalWidth * scale
        const dh = decorImg.naturalHeight * scale
        const dx = (canvasW - dw) / 2
        const dy = (canvasH - dh) / 2
        ctx.drawImage(decorImg, dx, dy, dw, dh)
      }
      // transparent: nothing

      // shadow
      if (shadow > 0) {
        ctx.shadowColor = 'rgba(0,0,0,0.55)'
        ctx.shadowBlur = shadow * 1.2
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = shadow * 0.6
      } else {
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.shadowOffsetY = 0
      }

      ctx.drawImage(cutImg, sx, sy, sw, sh, 0, 0, canvasW, canvasH)

      // reset shadow
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetY = 0

      const mime = format === 'png' ? 'image/png' : format === 'jpg' ? 'image/jpeg' : 'image/webp'
      const quality = 0.92
      const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), mime, quality))
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const ext = format === 'jpg' ? 'jpg' : format
      a.download = `cutout-${originalName}.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) {
      console.error(e)
      setError('Export failed.')
    }
  }

  // bg color for after tile
  const afterBgClass =
    bg === 'transparent' ? 'checker' :
    bg === 'mist' ? 'bg-mist' :
    bg === 'ink' ? 'bg-ink' :
    bg === 'flame' ? 'bg-flame' : ''

  const afterStyle: React.CSSProperties = {}
  if (bg === 'decor' && decorUrl) {
    afterStyle.backgroundImage = `url(${decorUrl})`
    afterStyle.backgroundSize = 'cover'
    afterStyle.backgroundPosition = 'center'
  }

  const swatchSelected = (v: Bg) => bg === v

  return (
    <div className="mx-auto max-w-[1200px] p-3 sm:p-6">
      <header className="flex items-center justify-between px-2 pb-6">
        <div className="flex items-center gap-2.5 font-display font-bold text-2xl">
          <span className="relative inline-block h-7 w-7 rounded-full bg-mist" aria-hidden="true">
            <span className="absolute inset-[7px] rounded-full bg-flame"></span>
          </span>
          Cutout
        </div>
        <span className="rounded-full bg-mist px-4 py-2.5 text-sm font-semibold text-ink">
          Free · No sign-up
        </span>
      </header>

      {error && (
        <div className="mb-4 rounded-inner border-2 border-mist bg-ink px-4 py-3 text-sm text-mist" role="alert">
          {error}
        </div>
      )}

      <main className="grid grid-cols-12 gap-4">
        {/* Hero + dropzone */}
        <section className="tile tile-dark col-span-12 lg:col-span-7 min-h-[560px]">
          <p className="text-[13px] font-semibold uppercase tracking-[.08em]">
            Background removal
          </p>
          <h1 className="font-display font-bold tracking-tightest leading-[1.02] text-[44px] sm:text-[60px] mt-4 mb-3">
            One click, one background gone.
          </h1>
          <p className="text-lg leading-relaxed max-w-[480px] mb-6">
            Drop a photo, the background disappears. Adjust, compare, download.
          </p>

          <label
            ref={dropzoneRef}
            htmlFor="file"
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="flex flex-1 flex-col items-center justify-center gap-2.5 text-center p-6 rounded-inner border-2 border-dashed border-mist cursor-pointer"
          >
            {status === 'processing' ? (
              <>
                <svg className="h-11 w-11 stroke-flame" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 16V4" /><path d="M7 9l5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
                </svg>
                <b className="font-display text-[22px]">Processing…</b>
                <span className="text-sm" aria-live="polite">{progress}%</span>
                <div className="w-full max-w-[260px] h-2 bg-ink rounded-full overflow-hidden border border-mist">
                  <div className="h-full bg-flame" style={{ width: `${progress}%` }} />
                </div>
              </>
            ) : (
              <>
                <svg className="h-11 w-11 stroke-flame" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 16V4" /><path d="M7 9l5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
                </svg>
                <b className="font-display text-[22px]">Drop your image here</b>
                <span className="text-sm">or paste with Ctrl + V · PNG, JPG, WEBP</span>
                <span className="btn mt-1.5 inline-flex items-center">Choose a file</span>
              </>
            )}
            <input
              id="file"
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={onInputChange}
              disabled={status === 'processing'}
            />
          </label>
        </section>

        {/* Comparateur */}
        <section className="tile tile-light col-span-12 lg:col-span-5 min-h-[560px] !p-4">
          <div
            id="cmp"
            className="relative flex-1 overflow-hidden rounded-inner"
            style={{ '--pos': `${pos}%` } as React.CSSProperties}
          >
            <div id="before" className="absolute inset-0">
              {originalUrl ? (
                <img src={originalUrl} className="h-full w-full object-cover" alt="Before" />
              ) : (
                <div className="h-full w-full grid place-items-center text-ink text-sm">
                  No image
                </div>
              )}
            </div>
            <div
              id="after"
              className={`absolute inset-0 ${afterBgClass}`}
              style={{ clipPath: 'inset(0 0 0 var(--pos))', ...afterStyle }}
            >
              {cutoutUrl ? (
                <img src={cutoutUrl} className="h-full w-full object-contain" alt="After" />
              ) : null}
            </div>
            <div className="pointer-events-none absolute inset-y-0 w-1 -translate-x-1/2 bg-flame" style={{ left: 'var(--pos)' }} />
            <div className="pointer-events-none absolute top-1/2 grid h-[52px] w-[52px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[3px] border-ink bg-flame" style={{ left: 'var(--pos)' }}>
              <svg className="h-[22px] w-[22px] stroke-ink" viewBox="0 0 24 24" fill="none" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 6l-6 6 6 6" /><path d="M15 6l6 6-6 6" />
              </svg>
            </div>
            <span className="absolute left-3.5 top-3.5 rounded-full border-2 border-mist bg-ink px-3.5 py-2 text-[13px] font-semibold text-mist">
              Before
            </span>
            <span className="absolute right-3.5 top-3.5 rounded-full border-2 border-mist bg-ink px-3.5 py-2 text-[13px] font-semibold text-mist">
              After
            </span>
            <input
              id="slider"
              type="range"
              min="0"
              max="100"
              value={pos}
              aria-label="Compare before and after"
              onChange={(e) => setPos(Number(e.target.value))}
              className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
            />
          </div>
        </section>

        {/* Background color */}
        <section className="tile tile-dark col-span-12 sm:col-span-6 lg:col-span-3 min-h-[220px] gap-3.5">
          <h2 className="font-display text-xl font-bold">Background color</h2>
          <div className="flex flex-wrap gap-2" id="swatches">
            {(['transparent', 'mist', 'ink', 'flame'] as Bg[]).map((v) => {
              const labels: Record<Bg, string> = {
                transparent: 'Transparent',
                mist: 'Light',
                ink: 'Dark',
                flame: 'Orange',
                decor: 'Backdrop',
              }
              const cls =
                v === 'transparent'
                  ? 'checker !bg-[length:12px_12px]'
                  : v === 'mist'
                  ? 'bg-mist'
                  : v === 'ink'
                  ? 'bg-ink'
                  : 'bg-flame'
              return (
                <button
                  key={v}
                  aria-label={labels[v]}
                  aria-pressed={swatchSelected(v)}
                  disabled={disabled}
                  onClick={() => setBg(v)}
                  className={`h-11 w-11 rounded-full border-2 ${
                    swatchSelected(v) ? 'border-flame' : 'border-mist'
                  } ${cls} disabled:cursor-not-allowed`}
                />
              )
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => decorInputRef.current?.click()}
              className="chip disabled:cursor-not-allowed"
              aria-pressed={bg === 'decor'}
            >
              Import backdrop
            </button>
            <input
              ref={decorInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={onDecorChange}
              disabled={disabled}
            />
          </div>
          <p className="text-sm">Or a backdrop image.</p>
        </section>

        {/* Drop shadow */}
        <section className="tile tile-light col-span-12 sm:col-span-6 lg:col-span-3 min-h-[220px] gap-3.5">
          <h2 className="font-display text-xl font-bold">Drop shadow</h2>
          <label htmlFor="shadow" className="text-sm">Intensity</label>
          <input
            id="shadow"
            type="range"
            min="0"
            max="100"
            value={shadow}
            disabled={disabled}
            onChange={(e) => setShadow(Number(e.target.value))}
            className="min-h-[44px] w-full accent-flame disabled:cursor-not-allowed"
          />
          <p className="text-sm">Anchors the subject on its new background.</p>
        </section>

        {/* Framing */}
        <section className="tile tile-dark col-span-12 sm:col-span-6 lg:col-span-3 min-h-[220px] gap-3.5">
          <h2 className="font-display text-xl font-bold">Framing</h2>
          <div className="flex flex-wrap gap-2">
            {(['auto', '1:1', '4:5', '16:9'] as Frame[]).map((f) => {
              const label = f === 'auto' ? 'Auto' : f
              return (
                <button
                  key={f}
                  className="chip disabled:cursor-not-allowed"
                  aria-pressed={frame === f}
                  disabled={disabled}
                  onClick={() => setFrame(f)}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <p className="text-sm">Crops around the subject.</p>
        </section>

        {/* Export */}
        <section className="tile tile-flame col-span-12 sm:col-span-6 lg:col-span-3 min-h-[220px] justify-between gap-3.5">
          <h2 className="font-display text-xl font-bold">Export</h2>
          <div className="flex flex-wrap gap-2">
            {(['png', 'jpg', 'webp'] as Format[]).map((f) => (
              <button
                key={f}
                className="chip chip-flame disabled:cursor-not-allowed !text-[19px] !font-bold !border-ink"
                aria-pressed={format === f}
                disabled={disabled}
                onClick={() => setFormat(f)}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            id="download"
            className="btn !bg-ink !text-mist disabled:cursor-not-allowed"
            disabled={disabled}
            onClick={download}
          >
            Download
          </button>
        </section>
      </main>

      <footer className="py-6 text-center text-sm">Your images stay on your device.</footer>
    </div>
  )
}