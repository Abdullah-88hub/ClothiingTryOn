import { useCallback, useEffect, useRef, useState, type ChangeEvent, type PointerEvent, type ReactNode } from 'react'
import {
  Aperture,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  CircleHelp,
  CloudOff,
  ImagePlus,
  Info,
  LayoutDashboard,
  LockKeyhole,
  MoreHorizontal,
  MoveUpRight,
  Plus,
  RotateCcw,
  RotateCw,
  Search,
  Settings,
  ShieldCheck,
  Shirt,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  WandSparkles,
  X,
} from 'lucide-react'
import { createPoseLandmarker, drawGarment, type FitAdjustments, type PosePoint } from './lib/pose'
import {
  CATEGORIES,
  clearWardrobe,
  deleteGarment,
  getGarments,
  readImageFile,
  saveGarment,
  type Category,
  type Garment,
} from './lib/wardrobe'
import './App.css'

type Screen = 'home' | 'wardrobe' | 'studio' | 'privacy'
type StudioMode = 'live' | 'photo'

const EMPTY_FIT: FitAdjustments = { x: 0, y: 0, scale: 1, rotation: 0, opacity: 0.94 }
function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [garments, setGarments] = useState<Garment[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [editorImage, setEditorImage] = useState<string | null>(null)
  const [editingGarment, setEditingGarment] = useState<Garment | null>(null)
  const [showAddOptions, setShowAddOptions] = useState(false)
  const [notice, setNotice] = useState('')
  const [loadingWardrobe, setLoadingWardrobe] = useState(true)

  useEffect(() => {
    getGarments()
      .then((saved) => {
        setGarments(saved)
        setSelectedId(saved[0]?.id ?? '')
      })
      .catch((error: unknown) => setNotice(errorMessage(error, 'Could not load your wardrobe.')))
      .finally(() => setLoadingWardrobe(false))
  }, [])

  const reportError = (error: unknown, fallback: string) => {
    setNotice(errorMessage(error, fallback))
  }
  const reportStudioError = useCallback((message: string) => setNotice(message), [])

  const refreshGarments = async (preferredId?: string) => {
    const saved = await getGarments()
    setGarments(saved)
    if (preferredId && saved.some((garment) => garment.id === preferredId)) {
      setSelectedId(preferredId)
    } else if (!saved.some((garment) => garment.id === selectedId)) {
      setSelectedId(saved[0]?.id ?? '')
    }
  }

  const openAddOptions = () => setShowAddOptions(true)

  const chooseClothingImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setShowAddOptions(false)
    if (!file.type.startsWith('image/')) {
      setNotice('Choose an image file to add it to your wardrobe.')
      return
    }

    try {
      setEditorImage(await readImageFile(file))
      setNotice('')
    } catch (error) {
      reportError(error, 'Could not open that image.')
    }
  }

  const saveNewGarment = async (garment: Garment) => {
    try {
      await saveGarment(garment)
      await refreshGarments(garment.id)
      setEditorImage(null)
      setNotice(`${garment.name} was saved to your wardrobe.`)
    } catch (error) {
      reportError(error, 'Could not save this garment. Your browser storage may be full.')
    }
  }

  const updateGarment = async (garment: Garment) => {
    try {
      await saveGarment(garment)
      await refreshGarments(garment.id)
      setEditingGarment(null)
      setNotice('Garment details updated.')
    } catch (error) {
      reportError(error, 'Could not update this garment.')
    }
  }

  const removeGarment = async (garment: Garment) => {
    if (!window.confirm(`Remove "${garment.name}" from this device?`)) return
    try {
      await deleteGarment(garment.id)
      await refreshGarments()
      setNotice(`${garment.name} was removed.`)
    } catch (error) {
      reportError(error, 'Could not remove this garment.')
    }
  }

  const removeAllLocalData = async () => {
    if (!window.confirm('Clear every saved garment from this browser? This cannot be undone.')) return
    try {
      await clearWardrobe()
      setGarments([])
      setSelectedId('')
      setNotice('Your local wardrobe has been cleared.')
    } catch (error) {
      reportError(error, 'Could not clear local data.')
    }
  }

  const openStudio = (garmentId?: string) => {
    if (garmentId) setSelectedId(garmentId)
    setScreen('studio')
    setNotice('')
  }

  const activeGarment = garments.find((garment) => garment.id === selectedId) ?? null

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" type="button" onClick={() => setScreen('home')} aria-label="Atelier home">
          <span className="brand-mark"><Aperture size={21} strokeWidth={2.2} /></span>
          <span>atelier<span className="brand-period">.</span></span>
        </button>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <NavButton active={screen === 'home'} icon={<LayoutDashboard size={18} />} onClick={() => setScreen('home')}>Overview</NavButton>
          <NavButton active={screen === 'wardrobe'} icon={<Shirt size={18} />} onClick={() => setScreen('wardrobe')}>My wardrobe <span className="nav-count">{garments.length}</span></NavButton>
          <NavButton active={screen === 'studio'} icon={<Sparkles size={18} />} onClick={() => openStudio()}>Try-on studio</NavButton>
        </nav>
        <div className="sidebar-label sidebar-label-lower">PREFERENCES</div>
        <nav className="side-nav" aria-label="Preferences">
          <NavButton active={screen === 'privacy'} icon={<Settings size={18} />} onClick={() => setScreen('privacy')}>Privacy & settings</NavButton>
        </nav>
        <div className="sidebar-spacer" />
        <div className="private-card">
          <div className="private-icon"><LockKeyhole size={16} /></div>
          <strong>Your space, your style.</strong>
          <p>Your wardrobe lives on this device. Your photos stay yours.</p>
          <button type="button" onClick={() => setScreen('privacy')}>How privacy works <ArrowRight size={14} /></button>
        </div>
        <div className="profile-chip">
          <div className="avatar">A</div>
          <div><strong>My Atelier</strong><small>Personal space</small></div>
          <MoreHorizontal size={19} className="profile-more" />
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="breadcrumb"><span>Atelier</span><span className="crumb-slash">/</span><strong>{screenTitle(screen)}</strong></div>
          <div className="topbar-actions">
            <span className="local-pill"><span /> Local mode</span>
            <button type="button" className="top-add" onClick={openAddOptions}>
              <Plus size={16} /> Add clothing
            </button>
            <input id="clothing-file-input" className="file-input-hidden" type="file" accept="image/*" onChange={chooseClothingImage} />
            <input id="clothing-camera-input" className="file-input-hidden" type="file" accept="image/*" capture="environment" onChange={chooseClothingImage} />
          </div>
        </header>

        {notice && (
          <div className="notice" role="status">
            <Info size={16} /> <span>{notice}</span>
            <button type="button" aria-label="Dismiss message" onClick={() => setNotice('')}><X size={15} /></button>
          </div>
        )}

        <main className="page-content">
          {screen === 'home' && (
            <Dashboard garments={garments} loading={loadingWardrobe} onNavigate={setScreen} onAdd={openAddOptions} onTryOn={openStudio} onEdit={setEditingGarment} />
          )}
          {screen === 'wardrobe' && (
            <Wardrobe garments={garments} loading={loadingWardrobe} selectedId={selectedId} onSelect={setSelectedId} onAdd={openAddOptions} onTryOn={openStudio} onEdit={setEditingGarment} onDelete={removeGarment} />
          )}
          {screen === 'studio' && (
            <Studio garments={garments} selectedId={selectedId} onSelect={setSelectedId} activeGarment={activeGarment} onGoWardrobe={() => setScreen('wardrobe')} onError={reportStudioError} />
          )}
          {screen === 'privacy' && <PrivacySettings onClear={removeAllLocalData} garmentCount={garments.length} />}
        </main>
      </div>

      {editorImage && (
        <GarmentEditor image={editorImage} onCancel={() => setEditorImage(null)} onSave={saveNewGarment} />
      )}
      {showAddOptions && <AddClothingOptions onClose={() => setShowAddOptions(false)} />}
      {editingGarment && (
        <DetailsEditor garment={editingGarment} onCancel={() => setEditingGarment(null)} onSave={updateGarment} />
      )}
    </div>
  )
}

function NavButton({
  active,
  icon,
  onClick,
  children,
}: {
  active: boolean
  icon: ReactNode
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button type="button" className={`side-nav-item${active ? ' active' : ''}`} onClick={onClick}>
      {icon}<span>{children}</span>
    </button>
  )
}

function Dashboard({
  garments,
  loading,
  onNavigate,
  onAdd,
  onTryOn,
  onEdit,
}: {
  garments: Garment[]
  loading: boolean
  onNavigate: (screen: Screen) => void
  onAdd: () => void
  onTryOn: (garmentId?: string) => void
  onEdit: (garment: Garment) => void
}) {
  return (
    <div className="dashboard">
      <div className="page-heading heading-with-action">
        <div>
          <div className="eyebrow">YOUR PERSONAL FITTING ROOM</div>
          <h1>A little more <em>you.</em></h1>
          <p>Play with your wardrobe. Find the look that feels right.</p>
        </div>
        <button className="button button-dark" type="button" onClick={() => onTryOn()}>
          <Sparkles size={17} /> Open try-on studio <ArrowRight size={16} />
        </button>
      </div>

      <section className="feature-banner">
        <div className="feature-copy">
          <span className="banner-kicker"><span className="live-dot" /> THE VIRTUAL FITTING ROOM</span>
          <h2>See how it<br />feels on <i>you.</i></h2>
          <p>Try your own clothes in a private, playful space. No uploads. No accounts. Just you and your style.</p>
          <button className="button button-light" type="button" onClick={() => onTryOn(garments[0]?.id)}>
            Start a fitting <ArrowRight size={16} />
          </button>
          <div className="banner-footnote"><ShieldCheck size={14} /> Your photos never leave your device</div>
        </div>
        <div className="feature-art" aria-hidden="true">
          <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
          <div className="art-sun" />
          <div className="art-person">
            <div className="art-head" />
            <div className="art-neck" />
            <div className="art-torso" />
            <div className="art-arm art-arm-left" /><div className="art-arm art-arm-right" />
          </div>
          <div className="art-label"><Sparkles size={13} /> YOUR LOOK, YOUR WAY</div>
          <div className="art-card art-card-top"><span>01</span> Find your fit</div>
          <div className="art-card art-card-bottom"><span>02</span> Make it yours</div>
        </div>
      </section>

      <section className="stats-row" aria-label="Wardrobe summary">
        <div className="stat-block"><span className="stat-icon stat-violet"><Shirt size={17} /></span><span><strong>{garments.length}</strong><small>pieces in your wardrobe</small></span></div>
        <span className="stat-divider" />
        <div className="stat-block"><span className="stat-icon stat-peach"><Sparkles size={17} /></span><span><strong>100%</strong><small>private, always</small></span></div>
        <span className="stat-divider" />
        <div className="stat-block"><span className="stat-icon stat-green"><CloudOff size={17} /></span><span><strong>On-device</strong><small>no account needed</small></span></div>
        <button className="text-button stats-link" type="button" onClick={() => onNavigate('privacy')}>Your privacy <ArrowRight size={14} /></button>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div><div className="eyebrow">THE GOOD STUFF</div><h2>Your wardrobe <span className="heading-count">{garments.length}</span></h2></div>
          <button className="text-button" type="button" onClick={() => onNavigate('wardrobe')}>View wardrobe <ArrowRight size={15} /></button>
        </div>
        {loading ? (
          <div className="empty-wardrobe"><div className="loading-spinner" /><p>Opening your wardrobe…</p></div>
        ) : garments.length ? (
          <div className="garment-grid home-garment-grid">
            {garments.slice(0, 4).map((garment) => (
              <GarmentCard key={garment.id} garment={garment} selected={false} onSelect={() => onTryOn(garment.id)} onEdit={() => onEdit(garment)} onDelete={() => onTryOn(garment.id)} compact />
            ))}
            <button className="add-garment-card" type="button" onClick={onAdd}>
              <span className="add-card-icon"><Plus size={20} /></span><strong>Add something you love</strong><small>Make your wardrobe yours</small>
            </button>
          </div>
        ) : (
          <div className="empty-wardrobe">
            <div className="empty-icon"><Shirt size={25} /></div>
            <h3>Start with something you already own</h3>
            <p>Add a clothing photo to build your private digital wardrobe.</p>
            <button className="button button-outline" type="button" onClick={onAdd}><Plus size={16} /> Add your first piece</button>
          </div>
        )}
      </section>
      <div className="disclaimer"><Info size={15} /> Virtual try-on is a 2D preview to help you explore styling. It's not a sizing or fit guarantee.</div>
    </div>
  )
}

function GarmentCard({
  garment,
  selected,
  onSelect,
  onEdit,
  onDelete,
  compact = false,
}: {
  garment: Garment
  selected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  compact?: boolean
}) {
  return (
    <article className={`garment-card${selected ? ' garment-selected' : ''}${compact ? ' garment-compact' : ''}`}>
      <button className="garment-image-button" type="button" onClick={onSelect} aria-label={`Try on ${garment.name}`}>
        <img src={garment.image} alt={garment.name} />
        <span className="garment-category">{garment.category}</span>
      </button>
      <div className="garment-card-info">
        <div className="garment-name-wrap"><h3>{garment.name}</h3><span>{new Date(garment.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></div>
        <div className="garment-card-actions">
          <button type="button" className={`small-action${selected ? ' selected-action' : ''}`} onClick={onSelect}>{compact ? 'Try on' : selected ? 'Selected' : 'Select'}</button>
          {!compact && <button type="button" className="icon-action" onClick={onEdit} aria-label={`Edit ${garment.name}`}><MoreHorizontal size={18} /></button>}
        </div>
      </div>
      {compact && <div className="compact-card-edit"><button type="button" onClick={onEdit}>Edit details</button><button type="button" onClick={onDelete}>Try on <ArrowRight size={13} /></button></div>}
    </article>
  )
}

function Wardrobe({
  garments,
  loading,
  selectedId,
  onSelect,
  onAdd,
  onTryOn,
  onEdit,
  onDelete,
}: {
  garments: Garment[]
  loading: boolean
  selectedId: string
  onSelect: (id: string) => void
  onAdd: () => void
  onTryOn: (id?: string) => void
  onEdit: (garment: Garment) => void
  onDelete: (garment: Garment) => void
}) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All pieces')
  const filtered = garments.filter((garment) =>
    garment.name.toLowerCase().includes(query.toLowerCase()) &&
    (category === 'All pieces' || garment.category === category),
  )

  return (
    <div className="wardrobe-page">
      <div className="page-heading heading-with-action">
        <div><div className="eyebrow">YOUR PERSONAL COLLECTION</div><h1>My <em>wardrobe.</em></h1><p>All the pieces you love, in one private place.</p></div>
        <button className="button button-dark" type="button" onClick={onAdd}><Plus size={17} /> Add clothing</button>
      </div>
      <div className="wardrobe-toolbar">
        <label className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your wardrobe" aria-label="Search your wardrobe" /></label>
        <label className="filter-field"><SlidersHorizontal size={15} /><select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category"><option>All pieces</option>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={14} /></label>
        <span className="wardrobe-total">{filtered.length} {filtered.length === 1 ? 'piece' : 'pieces'}</span>
      </div>
      {loading ? <div className="empty-wardrobe"><div className="loading-spinner" /><p>Opening your wardrobe…</p></div> : filtered.length ? (
        <div className="garment-grid wardrobe-grid">
          {filtered.map((garment) => (
            <GarmentCard key={garment.id} garment={garment} selected={selectedId === garment.id} onSelect={() => onSelect(garment.id)} onEdit={() => onEdit(garment)} onDelete={() => onDelete(garment)} />
          ))}
          <button className="add-garment-card" type="button" onClick={onAdd}><span className="add-card-icon"><Plus size={20} /></span><strong>Add something you love</strong><small>Make your wardrobe yours</small></button>
        </div>
      ) : (
        <div className="empty-wardrobe">
          <div className="empty-icon"><Shirt size={25} /></div>
          <h3>{garments.length ? 'No pieces match that search' : 'Your wardrobe is ready for its first look'}</h3>
          <p>{garments.length ? 'Try another name or category.' : 'Add a clothing photo and it will be saved here on this device.'}</p>
          {!garments.length && <button className="button button-outline" type="button" onClick={onAdd}><Plus size={16} /> Add your first piece</button>}
        </div>
      )}
      {garments.length > 0 && <div className="privacy-footnote"><LockKeyhole size={14} /> Saved only in this browser. Nothing is synced to a server.</div>}
      <button className="wardrobe-try-button" type="button" onClick={() => onTryOn(selectedId || garments[0]?.id)} disabled={!garments.length}><Sparkles size={16} /> Start try-on with selected piece <ArrowRight size={15} /></button>
    </div>
  )
}

function GarmentEditor({
  image,
  onCancel,
  onSave,
}: {
  image: string
  onCancel: () => void
  onSave: (garment: Garment) => Promise<void>
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const [name, setName] = useState('New favorite')
  const [category, setCategory] = useState<Category>('Tops')
  const [description, setDescription] = useState('')
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [brushSize, setBrushSize] = useState(24)
  const [eraseMode, setEraseMode] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const source = new Image()
    source.onload = () => {
      imageRef.current = source
      redrawEditor(canvasRef.current, source, scale, rotation)
    }
    source.src = image
  }, [image, scale, rotation])

  const pointerToCanvas = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const bounds = canvas.getBoundingClientRect()
    return {
      x: (event.clientX - bounds.left) * canvas.width / bounds.width,
      y: (event.clientY - bounds.top) * canvas.height / bounds.height,
    }
  }
  const eraseAtPointer = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!eraseMode || event.buttons !== 1) return
    const point = pointerToCanvas(event)
    const context = canvasRef.current?.getContext('2d')
    if (!point || !context) return
    context.save()
    context.globalCompositeOperation = 'destination-out'
    context.beginPath()
    context.arc(point.x, point.y, brushSize * (canvasRef.current!.width / canvasRef.current!.getBoundingClientRect().width) / 2, 0, Math.PI * 2)
    context.fill()
    context.restore()
  }
  const startErasing = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!eraseMode) return
    event.currentTarget.setPointerCapture(event.pointerId)
    eraseAtPointer(event)
  }
  const save = async () => {
    const canvas = canvasRef.current
    if (!canvas || !name.trim()) return
    setSaving(true)
    try {
      await onSave({
        id: crypto.randomUUID(),
        name: name.trim(),
        category,
        description: description.trim(),
        image: canvas.toDataURL('image/png'),
        createdAt: Date.now(),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onCancel} title="Add to your wardrobe" wide>
      <div className="editor-layout">
        <div className="editor-preview-column">
          <div className="editor-canvas-wrap">
            <canvas ref={canvasRef} width={480} height={540} className={eraseMode ? 'erase-cursor' : ''} onPointerDown={startErasing} onPointerMove={eraseAtPointer} />
            <span className="editor-preview-label">PREVIEW</span>
          </div>
          <p className="editor-hint"><Info size={14} /> Transparent PNGs keep their background. Use the eraser to manually remove unwanted areas.</p>
        </div>
        <div className="editor-controls">
          <div className="form-section-label">MAKE IT YOURS</div>
          <label className="form-label">Piece name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={70} placeholder="e.g. Linen weekend shirt" /></label>
          <label className="form-label">Category<select value={category} onChange={(event) => setCategory(event.target.value as Category)}>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="form-label">A little note <span className="optional-label">OPTIONAL</span><textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={180} placeholder="Color, occasion, or anything you want to remember" /></label>
          <div className="form-section-label editor-adjust-label">IMAGE ADJUSTMENTS</div>
          <div className="editor-adjust-row"><span><RotateCcw size={14} /> Rotate</span><button type="button" className="round-control" aria-label="Rotate image counterclockwise" onClick={() => setRotation(rotation - 90)}><RotateCcw size={15} /></button><button type="button" className="round-control" aria-label="Rotate image clockwise" onClick={() => setRotation(rotation + 90)}><RotateCw size={15} /></button></div>
          <label className="range-field"><span>Zoom <strong>{Math.round(scale * 100)}%</strong></span><input type="range" min="0.65" max="1.5" step="0.01" value={scale} onChange={(event) => setScale(Number(event.target.value))} /></label>
          <div className="editor-adjust-row"><span><WandSparkles size={14} /> Manual background eraser</span><button type="button" className={`toggle${eraseMode ? ' toggle-on' : ''}`} onClick={() => setEraseMode(!eraseMode)} aria-label="Toggle manual background eraser"><span /></button></div>
          {eraseMode && <label className="range-field"><span>Brush size <strong>{brushSize}px</strong></span><input type="range" min="8" max="72" value={brushSize} onChange={(event) => setBrushSize(Number(event.target.value))} /></label>}
          <button className="text-button reset-editor" type="button" onClick={() => { setScale(1); setRotation(0); redrawEditor(canvasRef.current, imageRef.current, 1, 0) }}><RotateCcw size={14} /> Reset image</button>
          <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onCancel}>Cancel</button><button type="button" className="button button-dark" disabled={saving || !name.trim()} onClick={save}>{saving ? 'Saving…' : <><Check size={16} /> Save to wardrobe</>}</button></div>
        </div>
      </div>
    </Modal>
  )
}

function DetailsEditor({
  garment,
  onCancel,
  onSave,
}: {
  garment: Garment
  onCancel: () => void
  onSave: (garment: Garment) => Promise<void>
}) {
  const [name, setName] = useState(garment.name)
  const [category, setCategory] = useState<Category>(garment.category)
  const [description, setDescription] = useState(garment.description)
  const [saving, setSaving] = useState(false)
  const submit = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave({ ...garment, name: name.trim(), category, description: description.trim() })
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal onClose={onCancel} title="Edit garment details">
      <div className="details-edit">
        <div className="details-image"><img src={garment.image} alt={garment.name} /></div>
        <label className="form-label">Piece name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={70} /></label>
        <label className="form-label">Category<select value={category} onChange={(event) => setCategory(event.target.value as Category)}>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="form-label">Description<textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={180} placeholder="Add a note" /></label>
        <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onCancel}>Cancel</button><button type="button" className="button button-dark" disabled={saving || !name.trim()} onClick={submit}>{saving ? 'Saving…' : 'Save changes'}</button></div>
      </div>
    </Modal>
  )
}

function AddClothingOptions({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose} title="Add a piece to your wardrobe">
      <div className="add-options">
        <p>Choose a clear photo of the garment, ideally on a plain background. You can tidy it up before saving.</p>
        <button type="button" onClick={() => { onClose(); document.getElementById('clothing-camera-input')?.click() }}>
          <span><Camera size={18} /></span><div><strong>Take a photo</strong><small>Use your device camera</small></div><ArrowRight size={16} />
        </button>
        <button type="button" onClick={() => { onClose(); document.getElementById('clothing-file-input')?.click() }}>
          <span><Upload size={18} /></span><div><strong>Choose from device</strong><small>Browse your photos and files</small></div><ArrowRight size={16} />
        </button>
        <div className="add-options-note"><LockKeyhole size={14} /> Your image is resized and saved only in this browser.</div>
      </div>
    </Modal>
  )
}

function Studio({
  garments,
  selectedId,
  onSelect,
  activeGarment,
  onGoWardrobe,
  onError,
}: {
  garments: Garment[]
  selectedId: string
  onSelect: (id: string) => void
  activeGarment: Garment | null
  onGoWardrobe: () => void
  onError: (message: string) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const photoRef = useRef<HTMLImageElement>(null)
  const landmarkerRef = useRef<Awaited<ReturnType<typeof createPoseLandmarker>> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const garmentImageRef = useRef<HTMLImageElement | null>(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [facing, setFacing] = useState<'user' | 'environment'>('user')
  const [mode, setMode] = useState<StudioMode>('live')
  const [modelReady, setModelReady] = useState(false)
  const [modelError, setModelError] = useState('')
  const [posePoints, setPosePoints] = useState<PosePoint[] | null>(null)
  const [photoUrl, setPhotoUrl] = useState('')
  const [photoLoaded, setPhotoLoaded] = useState(false)
  const [photoInputKey, setPhotoInputKey] = useState(0)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [showOverlay, setShowOverlay] = useState(true)
  const [fit, setFit] = useState<FitAdjustments>(EMPTY_FIT)
  const [loadedGarmentId, setLoadedGarmentId] = useState('')
  const [captured, setCaptured] = useState('')
  const [poseStatus, setPoseStatus] = useState('Downloading the on-device pose model…')
  const photoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const lifecycle = { cancelled: false }
    createPoseLandmarker('VIDEO')
      .then((landmarker) => {
        if (lifecycle.cancelled) {
          landmarker.close()
          return
        }
        landmarkerRef.current?.close()
        landmarkerRef.current = landmarker
        setModelReady(true)
        setModelError('')
        setPoseStatus('Pose detection is ready')
      })
      .catch((error: unknown) => {
        if (lifecycle.cancelled) return
        const message = errorMessage(error, 'Could not load the pose model.')
        setModelError(message)
        setPoseStatus('Pose detection is unavailable')
      })
    return () => {
      lifecycle.cancelled = true
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      landmarkerRef.current?.close()
      landmarkerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!activeGarment) {
      garmentImageRef.current = null
      return
    }
    const image = new Image()
    image.onload = () => {
      garmentImageRef.current = image
      setLoadedGarmentId(activeGarment.id)
    }
    image.onerror = () => onError('This garment image could not be loaded.')
    image.src = activeGarment.image
    return () => {
      image.onload = null
      image.onerror = null
    }
  }, [activeGarment, onError])

  useEffect(() => () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl)
  }, [photoUrl])

  useEffect(() => {
    if (!cameraOn || !modelReady) return
    const frame = { id: 0 }
    let lastInference = 0
    const detect = (time: number) => {
      frame.id = requestAnimationFrame(detect)
      const video = videoRef.current
      const landmarker = landmarkerRef.current
      if (!video || !landmarker || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || time - lastInference < 85) return
      lastInference = time
      try {
        const result = landmarker.detectForVideo(video, time)
        const points = result.landmarks[0] as PosePoint[] | undefined
        setPosePoints(points ?? null)
        setPoseStatus(points ? 'Person detected · tracking live' : 'Step into frame to find your fit')
      } catch (error) {
        cancelAnimationFrame(frame.id)
        setPoseStatus('Pose tracking stopped')
        onError(errorMessage(error, 'Pose tracking stopped unexpectedly.'))
      }
    }
    frame.id = requestAnimationFrame(detect)
    return () => {
      cancelAnimationFrame(frame.id)
    }
  }, [cameraOn, modelReady, onError])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const frame = { id: 0 }
    const paint = () => {
      const video = mode === 'live' && cameraOn ? videoRef.current : null
      const photo = mode === 'photo' && photoLoaded ? photoRef.current : null
      const source = video && video.videoWidth ? video : photo && photo.complete ? photo : null
      if (source) {
        const width = 'videoWidth' in source ? source.videoWidth : source.naturalWidth
        const height = 'videoHeight' in source ? source.videoHeight : source.naturalHeight
        if (width && height) {
          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width
            canvas.height = height
          }
          context.clearRect(0, 0, width, height)
          const mirror = mode === 'live' && facing === 'user'
          context.save()
          if (mirror) {
            context.translate(width, 0)
            context.scale(-1, 1)
          }
          context.drawImage(source, 0, 0, width, height)
          if (showOverlay && activeGarment && loadedGarmentId === activeGarment.id && garmentImageRef.current) {
            drawGarment(context, garmentImageRef.current, posePoints, activeGarment.category, fit, width, height)
          }
          context.restore()
        }
      }
      if (mode === 'live' && cameraOn) frame.id = requestAnimationFrame(paint)
    }
    paint()
    return () => {
      if (frame.id) cancelAnimationFrame(frame.id)
    }
  }, [mode, cameraOn, facing, posePoints, showOverlay, activeGarment, loadedGarmentId, fit, photoUrl, photoLoaded])

  const startCamera = async (cameraFacing = facing) => {
    if (!window.isSecureContext) {
      setCameraError('Camera access needs HTTPS or localhost. Open this site using its secure HTTPS address.')
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('This browser does not support camera access. You can still try on an uploaded photo.')
      return
    }
    setCameraError('')
    streamRef.current?.getTracks().forEach((track) => track.stop())
    try {
      await landmarkerRef.current?.setOptions({ runningMode: 'VIDEO' })
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: cameraFacing }, width: { ideal: 1280 }, height: { ideal: 960 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraOn(true)
      setPosePoints(null)
      setPoseStatus(modelReady ? 'Step into frame to find your fit' : 'Camera ready · loading pose detection')
    } catch (error) {
      setCameraOn(false)
      setCameraError(cameraErrorMessage(error))
    }
  }
  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOn(false)
  }
  const changeCamera = async () => {
    const nextFacing = facing === 'user' ? 'environment' : 'user'
    setFacing(nextFacing)
    await startCamera(nextFacing)
  }
  const openPhoto = () => photoInputRef.current?.click()
  const selectPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      onError('Choose an image file to try on a photo.')
      return
    }
    const url = URL.createObjectURL(file)
    setPhotoUrl(url)
    stopCamera()
    setMode('photo')
    setPhotoLoaded(false)
    setPhotoBusy(true)
    setPosePoints(null)
    setFit(EMPTY_FIT)
  }
  const detectPhoto = useCallback(async () => {
    const image = photoRef.current
    if (!image || !landmarkerRef.current || !modelReady) {
      setPoseStatus(modelError ? 'Pose unavailable · manual placement enabled' : 'Preparing pose detection…')
      setPhotoBusy(false)
      return
    }
    setPhotoBusy(true)
    setPoseStatus('Finding your pose…')
    try {
      await landmarkerRef.current.setOptions({ runningMode: 'IMAGE' })
      const result = landmarkerRef.current.detect(image)
      const points = result.landmarks[0] as PosePoint[] | undefined
      setPosePoints(points ?? null)
      setPoseStatus(points ? 'Person detected · ready to style' : 'No pose found · adjust the overlay manually')
    } catch (error) {
      setPoseStatus('Pose detection unavailable · manual placement enabled')
      setModelError(errorMessage(error, 'Pose detection failed for this image.'))
    } finally {
      setPhotoBusy(false)
    }
  }, [modelError, modelReady])

  useEffect(() => {
    if (mode === 'photo' && photoUrl && photoLoaded && modelReady) void detectPhoto()
  }, [mode, photoUrl, photoLoaded, modelReady, detectPhoto])
  const resetToLive = () => {
    setPhotoUrl('')
    setPhotoLoaded(false)
    setPosePoints(null)
    setMode('live')
    setPoseStatus(modelReady ? 'Ready when you are' : 'Preparing pose detection…')
    setFit(EMPTY_FIT)
    setPhotoInputKey((key) => key + 1)
  }
  const capture = () => {
    const canvas = canvasRef.current
    if (!canvas || !canvas.width || !canvas.height) {
      onError('There is no image to capture yet.')
      return
    }
    setCaptured(canvas.toDataURL('image/png'))
  }

  const setFitValue = (key: keyof FitAdjustments, value: number) => setFit((current) => ({ ...current, [key]: value }))
  const canPaint = mode === 'photo' ? Boolean(photoUrl) : cameraOn
  const detectionHint = posePoints ? 'Garment alignment uses your body landmarks.' : 'No pose? Position controls are ready when your photo appears.'

  return (
    <div className="studio-page">
      <div className="page-heading studio-heading">
        <div><div className="eyebrow">YOUR PRIVATE FITTING ROOM</div><h1>Try it <em>on.</em></h1><p>A playful preview, made right here on your device.</p></div>
        <div className="studio-heading-badge"><LockKeyhole size={14} /> Nothing is uploaded</div>
      </div>
      <div className="studio-layout">
        <section className="studio-main">
          <div className="studio-toolbar">
            <div className="studio-mode-tabs" role="tablist" aria-label="Try-on mode">
              <button type="button" role="tab" aria-selected={mode === 'live'} className={mode === 'live' ? 'active' : ''} onClick={() => { if (mode === 'photo') resetToLive(); setMode('live') }}><Camera size={15} /> Live camera</button>
              <button type="button" role="tab" aria-selected={mode === 'photo'} className={mode === 'photo' ? 'active' : ''} onClick={openPhoto}><ImagePlus size={15} /> Use a photo</button>
            </div>
            <button type="button" className="camera-switch" onClick={changeCamera} disabled={!cameraOn} title="Switch between front and rear camera"><RotateCw size={15} /><span>Flip camera</span></button>
          </div>
          <input id="photo-file-input" key={photoInputKey} ref={photoInputRef} className="file-input-hidden" type="file" accept="image/*" onChange={selectPhoto} />
          <div className={`camera-stage${canPaint ? ' stage-active' : ''}`}>
            <video ref={videoRef} className="hidden-video" muted playsInline />
            <img ref={photoRef} src={photoUrl || undefined} className="hidden-photo" alt="" onLoad={() => setPhotoLoaded(true)} />
            <canvas ref={canvasRef} className="stage-canvas" aria-label="Virtual try-on preview" />
            {!canPaint && (
              <div className="stage-placeholder">
                <div className="stage-placeholder-icon">{mode === 'live' ? <Camera size={26} /> : <ImagePlus size={26} />}</div>
                <h3>{mode === 'live' ? 'Ready when you are' : 'Choose a photo to get started'}</h3>
                <p>{mode === 'live' ? 'Allow camera access to see your look come together.' : 'Pick a photo from your device. It stays right here.'}</p>
                {mode === 'live' ? <button className="button button-light" type="button" onClick={() => void startCamera()}><Camera size={16} /> Turn on camera</button> : <button className="button button-light" type="button" onClick={openPhoto}><Upload size={16} /> Choose a photo</button>}
              </div>
            )}
            {canPaint && (
              <>
                <div className="stage-live-badge"><span className="live-dot" /> {mode === 'live' ? 'LIVE PREVIEW' : 'PHOTO PREVIEW'}</div>
                <div className="pose-status"><span className={posePoints ? 'pose-found' : ''} />{photoBusy ? 'Finding your pose…' : poseStatus}</div>
                {mode === 'photo' && <button type="button" className="change-photo" onClick={openPhoto}><ImagePlus size={14} /> Change photo</button>}
              </>
            )}
            {cameraError && <div className="stage-error" role="alert"><Info size={16} />{cameraError}<button type="button" onClick={() => setCameraError('')} aria-label="Dismiss"><X size={15} /></button></div>}
            {!cameraError && modelError && <div className="stage-model-note" title={modelError}><Info size={13} /> Pose unavailable · manual fitting still works</div>}
            {canPaint && (
              <button type="button" className={`overlay-toggle${showOverlay ? ' overlay-on' : ''}`} onClick={() => setShowOverlay(!showOverlay)}><span className="toggle"><span /></span> Garment {showOverlay ? 'on' : 'off'}</button>
            )}
          </div>
          <div className="camera-actions">
            {mode === 'live' ? (
              <button type="button" className={`shutter-button${cameraOn ? '' : ' shutter-disabled'}`} onClick={cameraOn ? capture : () => void startCamera()} aria-label={cameraOn ? 'Capture photo' : 'Start camera'}><span>{cameraOn ? <Camera size={19} /> : <Camera size={19} />}</span></button>
            ) : (
              <button type="button" className="button button-dark photo-capture-button" disabled={!photoUrl || photoBusy} onClick={capture}><Aperture size={17} /> Capture this look</button>
            )}
            <span className="capture-note">{mode === 'live' ? cameraOn ? 'Tap to capture your look' : 'Camera is off' : 'Capture a finished photo'}</span>
            {mode === 'photo' && <button type="button" className="text-button retake-button" onClick={resetToLive}><ArrowLeft size={14} /> Back to camera</button>}
          </div>
          {cameraOn && <button type="button" className="stop-camera-link" onClick={stopCamera}>Turn camera off</button>}
          <div className="pose-explainer"><Sparkles size={15} /><span>{detectionHint}</span>{!modelReady && !modelError && <span className="model-loading"><span className="loading-spinner" /> Loading model</span>}</div>
        </section>

        <aside className="fitting-panel">
          <div className="fitting-panel-heading"><div><div className="eyebrow">THE LOOK</div><h2>Fitting details</h2></div><span className="fitting-panel-mark"><SlidersHorizontal size={16} /></span></div>
          <div className="selected-piece">
            {activeGarment ? <><div className="selected-piece-image"><img src={activeGarment.image} alt="" /></div><div className="selected-piece-meta"><strong>{activeGarment.name}</strong><span>{activeGarment.category}</span></div><button type="button" className="selected-piece-menu" aria-label="Open wardrobe" onClick={onGoWardrobe}><ChevronDown size={17} /></button></> : <><div className="selected-piece-image selected-empty"><Shirt size={20} /></div><div className="selected-piece-meta"><strong>No garment selected</strong><span>Choose something to try on</span></div></>}
          </div>
          {garments.length > 0 && <label className="select-garment-label">Choose a piece<select value={selectedId} onChange={(event) => onSelect(event.target.value)}>{garments.map((garment) => <option value={garment.id} key={garment.id}>{garment.name} · {garment.category}</option>)}</select><ChevronDown size={14} /></label>}
          {!garments.length && <button type="button" className="add-from-studio" onClick={onGoWardrobe}><Plus size={15} /> Add clothing to wardrobe</button>}
          <div className="panel-divider" />
          <div className="adjustments-heading"><strong>Fine-tune your fit</strong><span>Adjust to your eye</span></div>
          <FitRange label="Horizontal position" value={fit.x} min={-0.8} max={0.8} step={0.01} display={`${Math.round(fit.x * 100)}%`} disabled={!activeGarment} onChange={(value) => setFitValue('x', value)} />
          <FitRange label="Vertical position" value={fit.y} min={-0.8} max={0.8} step={0.01} display={`${Math.round(fit.y * 100)}%`} disabled={!activeGarment} onChange={(value) => setFitValue('y', value)} />
          <FitRange label="Scale" value={fit.scale} min={0.45} max={1.8} step={0.01} display={`${Math.round(fit.scale * 100)}%`} disabled={!activeGarment} onChange={(value) => setFitValue('scale', value)} />
          <FitRange label="Rotation" value={fit.rotation} min={-35} max={35} step={1} display={`${fit.rotation}°`} disabled={!activeGarment} onChange={(value) => setFitValue('rotation', value)} />
          <FitRange label="Opacity" value={fit.opacity} min={0.25} max={1} step={0.01} display={`${Math.round(fit.opacity * 100)}%`} disabled={!activeGarment} onChange={(value) => setFitValue('opacity', value)} />
          <button type="button" className="reset-fit" onClick={() => setFit(EMPTY_FIT)} disabled={!activeGarment}><RotateCcw size={14} /> Reset adjustments</button>
          <div className="fitting-note"><Info size={14} /> A 2D style preview—not a precise fit or sizing recommendation.</div>
        </aside>
      </div>
      <div className="studio-privacy"><ShieldCheck size={16} /><span><strong>Made for your privacy.</strong> Pose detection and image composition happen locally in your browser. The AI model is downloaded when needed; your images are not sent anywhere.</span><button type="button" onClick={onGoWardrobe}>My wardrobe <ArrowRight size={14} /></button></div>
      {captured && <CaptureModal image={captured} onClose={() => setCaptured('')} />}
    </div>
  )
}

function FitRange({
  label,
  value,
  min,
  max,
  step,
  display,
  disabled,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  display: string
  disabled: boolean
  onChange: (value: number) => void
}) {
  return (
    <label className={`fit-range${disabled ? ' fit-range-disabled' : ''}`}><span>{label}<strong>{display}</strong></span><input type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} /></label>
  )
}

function CaptureModal({ image, onClose }: { image: string; onClose: () => void }) {
  const [format, setFormat] = useState<'image/png' | 'image/jpeg'>('image/png')
  const [busy, setBusy] = useState(false)
  const convertImage = async (mime: string): Promise<Blob> => {
    const source = new Image()
    source.src = image
    await source.decode()
    const canvas = document.createElement('canvas')
    canvas.width = source.naturalWidth
    canvas.height = source.naturalHeight
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Could not prepare your photo for download.')
    if (mime === 'image/jpeg') {
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
    }
    context.drawImage(source, 0, 0)
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not export the image.')), mime, 0.92)
    })
  }
  const download = async () => {
    setBusy(true)
    try {
      const blob = await convertImage(format)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `atelier-look.${format === 'image/png' ? 'png' : 'jpg'}`
      anchor.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      window.alert(errorMessage(error, 'Could not download this image.'))
    } finally {
      setBusy(false)
    }
  }
  const share = async () => {
    setBusy(true)
    try {
      const blob = await convertImage(format)
      const file = new File([blob], `atelier-look.${format === 'image/png' ? 'png' : 'jpg'}`, { type: format })
      if (!navigator.share || !navigator.canShare?.({ files: [file] })) {
        await download()
        return
      }
      await navigator.share({ files: [file], title: 'My Atelier look' })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      window.alert(errorMessage(error, 'Could not share this image.'))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal onClose={onClose} title="Your look, captured" wide>
      <div className="capture-preview-layout">
        <div className="capture-image-wrap"><img src={image} alt="Captured virtual try-on result" /></div>
        <div className="capture-actions">
          <div className="eyebrow">A MOMENT FOR YOU</div><h2>Looking good.</h2><p>Your photo is ready. Save it to your device or share it somewhere lovely.</p>
          <label className="form-label">Save as<select value={format} onChange={(event) => setFormat(event.target.value as 'image/png' | 'image/jpeg')}><option value="image/png">PNG · best quality</option><option value="image/jpeg">JPEG · smaller file</option></select></label>
          <button type="button" className="button button-dark capture-download" onClick={() => void download()} disabled={busy}><ArrowDownToLine size={17} /> {busy ? 'Preparing…' : 'Download photo'}</button>
          {typeof navigator !== 'undefined' && !!navigator.share && <button type="button" className="button button-outline capture-share" onClick={() => void share()} disabled={busy}><MoveUpRight size={16} /> Share photo</button>}
          <div className="capture-privacy"><LockKeyhole size={14} /> Your photo has not been uploaded or saved in the app.</div>
          <button type="button" className="text-button capture-close-link" onClick={onClose}>Back to fitting room <ArrowRight size={14} /></button>
        </div>
      </div>
    </Modal>
  )
}

function PrivacySettings({ onClear, garmentCount }: { onClear: () => void; garmentCount: number }) {
  return (
    <div className="privacy-page">
      <div className="page-heading"><div className="eyebrow">YOUR DATA, YOUR CALL</div><h1>Privacy <em>first.</em></h1><p>A little clarity about where everything lives.</p></div>
      <div className="privacy-hero-card"><span className="privacy-hero-icon"><ShieldCheck size={25} /></span><div><div className="eyebrow">PRIVATE BY DESIGN</div><h2>Your fitting room stays yours.</h2><p>Atelier works in your browser. There are no accounts, no app backend, and no photo uploads.</p></div></div>
      <div className="privacy-cards">
        <PrivacyInfo icon={<DatabaseIcon />} title="Your wardrobe" description={`${garmentCount} saved ${garmentCount === 1 ? 'piece' : 'pieces'} stored in this browser's IndexedDB. It stays on this device and does not sync to other browsers.`} />
        <PrivacyInfo icon={<Camera size={18} />} title="Camera & photos" description="Camera frames and selected photos are processed locally. A captured image is only saved when you choose to download or share it." />
        <PrivacyInfo icon={<Sparkles size={18} />} title="On-device AI" description="Pose detection uses a free model downloaded to your browser when you open the studio. Your images and pose results are not sent with that download." />
      </div>
      <div className="privacy-detail-card"><div className="privacy-detail-icon"><CircleHelp size={18} /></div><div><h3>What happens if I clear my browser data?</h3><p>Your saved wardrobe may be removed along with the browser's other site data. There is no account or cloud backup, so add your pieces again if you clear storage or switch devices.</p></div></div>
      <div className="clear-data-card"><div><strong>Clear local wardrobe</strong><p>Remove all saved clothing from this browser. This cannot be undone.</p></div><button className="button button-danger" type="button" onClick={onClear} disabled={!garmentCount}><Trash2 size={15} /> Clear my data</button></div>
      <div className="privacy-footnote"><Info size={14} /> This demo does not use analytics, advertising, or external image storage.</div>
    </div>
  )
}

function PrivacyInfo({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return <article className="privacy-info-card"><span>{icon}</span><div><h3>{title}</h3><p>{description}</p></div></article>
}

function DatabaseIcon() {
  return <LockKeyhole size={18} />
}

function Modal({ children, onClose, title, wide = false }: { children: ReactNode; onClose: () => void; title: string; wide?: boolean }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className={`modal-card${wide ? ' modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header"><div><span className="modal-brand-icon"><Aperture size={16} /></span><h2>{title}</h2></div><button type="button" className="modal-close" onClick={onClose} aria-label="Close dialog"><X size={18} /></button></header>
        {children}
      </section>
    </div>
  )
}

function redrawEditor(canvas: HTMLCanvasElement | null, image: HTMLImageElement | null, scale: number, rotation: number) {
  const context = canvas?.getContext('2d')
  if (!canvas || !context || !image?.complete || !image.naturalWidth) return
  context.clearRect(0, 0, canvas.width, canvas.height)
  const ratio = Math.min(canvas.width * 0.78 / image.naturalWidth, canvas.height * 0.8 / image.naturalHeight) * scale
  context.save()
  context.translate(canvas.width / 2, canvas.height / 2)
  context.rotate(rotation * Math.PI / 180)
  context.drawImage(image, -image.naturalWidth * ratio / 2, -image.naturalHeight * ratio / 2, image.naturalWidth * ratio, image.naturalHeight * ratio)
  context.restore()
}

function screenTitle(screen: Screen) {
  if (screen === 'home') return 'Overview'
  if (screen === 'wardrobe') return 'My wardrobe'
  if (screen === 'studio') return 'Try-on studio'
  return 'Privacy & settings'
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

function cameraErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') return 'Camera permission was blocked. Allow camera access in your browser settings, or try an uploaded photo instead.'
    if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') return 'No camera was found. You can still try on an uploaded photo.'
    if (error.name === 'NotReadableError') return 'Your camera is already in use by another app. Close it and try again.'
  }
  return errorMessage(error, 'Could not start the camera. Try an uploaded photo or check your browser settings.')
}

export default App
