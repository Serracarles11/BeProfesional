'use client'

import { Manrope, Plus_Jakarta_Sans } from 'next/font/google'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import {
  ArrowLeft,
  ArrowUpDown,
  Copy,
  Download,
  Eye,
  Heart,
  History,
  MoreVertical,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react'
import { LeftNavigation } from '@/app/home/components/LeftNavigation'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  weight: ['400', '500', '600', '700', '800'],
})

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  weight: ['400', '500', '600', '700'],
})

type PlayMakerTab = 'MY' | 'COMMUNITY' | 'PUBLIC' | 'PRIVATE'
type ToolbarTool = 'SELECT' | 'TOOLS' | 'BALL' | 'DRAW' | 'ERASER'
type EquipmentType = 'cone' | 'ladder' | 'pole' | 'hurdle' | 'mannequin' | 'mini-goal'
type MarkerColor = 'blue' | 'red' | 'ball'
type ElementType = 'marker' | EquipmentType

type BoardElement = {
  id: string
  type: ElementType
  xPct: number
  yPct: number
  widthPct: number
  heightPct: number
  rotationDeg: number
  color?: MarkerColor
  label?: string
}

type BoardDrawing = {
  id: string
  type: 'arrow'
  color: string
  startXPct: number
  startYPct: number
  endXPct: number
  endYPct: number
  strokeWidthPct: number
}

type PhaseDraft = {
  id: string
  label: string
  elements: BoardElement[]
  drawings: BoardDrawing[]
}

type BoardDraft = {
  version: 1
  name: string
  analysisContext: string
  activePhaseId: string
  phases: PhaseDraft[]
}

type SavedPlay = {
  id: string
  title: string
  updatedAt: string
  draft: BoardDraft
}

type CommunityCategory = 'All Plays' | 'Attacking' | 'Defensive' | 'Set Pieces' | 'Counter-Press'

type CommunityPlay = {
  id: string
  title: string
  coach: string
  downloads: number
  likes: number
  category: Exclude<CommunityCategory, 'All Plays'>
  imageUrl: string
  elitePick?: boolean
}

type PaletteSelection =
  | { kind: 'equipment'; type: EquipmentType }
  | { kind: 'marker'; color: MarkerColor }

type DragState = {
  pointerId: number
  elementId: string
}

type DrawingState = {
  pointerId: number
  drawing: BoardDrawing
}

type DrawingDragState = {
  pointerId: number
  drawingId: string
  lastXPct: number
  lastYPct: number
}

type PlaymakerApiResponse = {
  ok: boolean
  plays?: SavedPlay[]
  play?: SavedPlay
  error?: string
}

type PlaymakerAnalysis = {
  verdict: string
  main_problem: string
  reasons: string[]
  improvements: string[]
  danger_zones: string[]
  strengths: string[]
  assumptions: string[]
  recommendations: Array<{
    title: string
    reason: string
    changes: Array<{
      operation: 'move_element' | 'add_drawing' | 'delete_drawing'
      [key: string]: unknown
    }>
  }>
  confidence: 'low' | 'medium' | 'high'
}

type PlaymakerAnalysisResponse = {
  ok: boolean
  data?: PlaymakerAnalysis
  error?: string
}

type ChatChannel = {
  id: string
  kind: 'team' | 'private' | 'ai'
  label: string
  canSend: boolean
}

type ChatBootstrapResponse =
  | {
      ok: true
      equipoId: string | null
      teamName: string | null
      role: string | null
      isCoach: boolean
      channels: ChatChannel[]
      activeChatId: string | null
    }
  | {
      ok: false
      error: string
    }

type SendMessageResponse =
  | {
      ok: true
      message: {
        id: string
      }
    }
  | {
      ok: false
      error: string
    }

const STORAGE_KEY = 'beprofessional-playmaker-draft-v1'
const SAVED_PLAYS_KEY = 'beprofessional-playmaker-saved-plays-v1'

const TOOLBAR_ITEMS: Array<{ id: ToolbarTool; label: string }> = [
  { id: 'SELECT', label: 'Select' },
  { id: 'TOOLS', label: 'Tools' },
  { id: 'BALL', label: 'Ball' },
  { id: 'DRAW', label: 'Lineas' },
  { id: 'ERASER', label: 'Eraser' },
]

const EQUIPMENT_OPTIONS: Array<{
  type: EquipmentType
  label: string
  widthPct: number
  heightPct: number
}> = [
  { type: 'cone', label: 'Cone', widthPct: 4.2, heightPct: 4.8 },
  { type: 'ladder', label: 'Ladder', widthPct: 8.5, heightPct: 14 },
  { type: 'pole', label: 'Pole', widthPct: 2.4, heightPct: 10.5 },
  { type: 'hurdle', label: 'Hurdle', widthPct: 6.5, heightPct: 4.5 },
  { type: 'mannequin', label: 'Mannequin', widthPct: 6.5, heightPct: 12 },
  { type: 'mini-goal', label: 'Mini Goal', widthPct: 10, heightPct: 6.5 },
]

const MARKER_OPTIONS: MarkerColor[] = ['blue', 'red', 'ball']
const BALL_SIZE_PCT = 8.4

const MARKER_STYLES: Record<MarkerColor, string> = {
  blue: 'bg-[#005db6] text-white',
  red: 'bg-[#ba1a1a] text-white',
  ball: 'bg-transparent text-[#181c20]',
}

const EQUIPMENT_ICON_SRC: Record<EquipmentType, string> = {
  cone: '/playmaker-assets/cone.svg',
  ladder: '/playmaker-assets/agility-ladder.svg',
  pole: '/playmaker-assets/pole.svg',
  hurdle: '/playmaker-assets/mini-hurdle.svg',
  mannequin: '/playmaker-assets/mannequin.svg',
  'mini-goal': '/playmaker-assets/mini-goal.svg',
}

const TOOL_ICON_SRC: Record<ToolbarTool, string> = {
  SELECT: '/playmaker-assets/tactical-zone-marker.svg',
  TOOLS: '/playmaker-assets/whistle.svg',
  BALL: '/playmaker-assets/pelota.png',
  DRAW: '/playmaker-assets/tactical-zone-marker.svg',
  ERASER: '/playmaker-assets/stopwatch.svg',
}

const COMMUNITY_CATEGORIES: CommunityCategory[] = [
  'All Plays',
  'Attacking',
  'Defensive',
  'Set Pieces',
  'Counter-Press',
]

const COMMUNITY_FEATURED_PLAY = {
  title: 'Total Overload 4-3-3',
  coach: 'Coach Julian Nagels',
  downloads: 12400,
  imageUrl:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBszHBVUPCATCwjG-ymUolk1KKNfrWFZ0CqFMQ5ebHrT46czht4tfgwDh4G4TGhxX_ejS_oKZ2lvFIWb9MFQo_xRWU8xWgYb7tUbPgjWJgvEWmXBvKLqWpU7y3igYKNi7_F01Ss7QY55PjNnoguLaisk2OAqevNVCbqxOnhZvXaz6OUaAIM4LiMyjqztxIE4_dLfoPMrCpaZO92bbIutpLDz_hmZ11tAXIpH8uhbjAmM0F3LHZB8lQZM26sO9bp6O4dznVW1s60CeE',
} as const

const COMMUNITY_PLAYS: CommunityPlay[] = [
  {
    id: 'asymmetric-343-diamond',
    title: 'Asymmetric 3-4-3 Diamond',
    coach: 'Coach Rafa',
    downloads: 2800,
    likes: 942,
    category: 'Attacking',
    elitePick: true,
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDlYzBlQcSips2QQf-8J-rtLsXNZcVF1PIxqAOEkrvIEqt0eKSzPSHT3VeeMtVGLKzfGhEeQwalbqDhTHSejC4erLwrQ73ZP5YhI1Zq9JwLVFdHPIfqyopdHah4r0M1aBbDGyghWsWK7KeB4i6QPjtrU9Djg8uSZoVAp66510uc8xImzbutMOFoEr7CAv8YnFqCUOMBN6KinHhqlRXtEDym6Ad-ofpmEHSDTW1B3g9FUgLrDVQCcNF5Z-4wa_o2SMsSBtmZK8AYzF8',
  },
  {
    id: 'false9-transition-grid',
    title: 'False 9 Transition Grid',
    coach: 'Analyst Mark',
    downloads: 1500,
    likes: 428,
    category: 'Counter-Press',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDzWOAqKin2cnS0zvVvy0PM4eehUyqU1iDm6cVRQoThb_o9yPuYGJxEw3_i-xCnR3IBwWXjrXjyQTOWa_jACRMKOVVbOFQngxPsmQGSZQwbt6bLWZUSzS0LHuSy0QFjheTYHj4MufvHNSXO5JkDO4VoUjlUfKVS1TdhRkD3VJR1hUlDjy-uXLVB1vWqKANtk6hqMcRJZrwl-vzn84dDbzTG_U3KK-OI14m29bQKwcQeZjyn8BVtayMduxhzwZkfFAb48R5JNXnYFvI',
  },
  {
    id: 'corner-flag-trap',
    title: 'Corner Flag Trap Set Piece',
    coach: 'SetPiecePro',
    downloads: 5200,
    likes: 1200,
    category: 'Set Pieces',
    elitePick: true,
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAjgft6_d6TsrUBnZkCtL0ZwEKIm56R8K3s39iRDmBYQ_UnooBt1BCDQlH72kwDK-574zzekuIRtlY-0242Cv8ZX1ZsLOQjT_hN5umcDH6-Dxe-hi44nrQaQnUEErkOdju_iH_bjpFHEa9yeOuVFZA3z7MFxdf3j6XCtBkLW8PPMWCcIztiTmWGlddLaGIHNSkBFsBHzq5Un5zo0yoDAxDLcvRFBVcUFooQ3_c6kWIPCCozZ7COIJ3-zKht_wrm_STX-7TNe2KmuI0',
  },
  {
    id: 'box-to-box-442',
    title: 'Box-to-Box Engine 4-4-2',
    coach: 'Coach Sime',
    downloads: 842,
    likes: 210,
    category: 'Defensive',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDOdIBJNk6561n2QjE_C10nUfCgbDC_jCB6-Ihza2SIgziLCPNaG0xZa28v1GXystBw3Hx2UdeDv596USUNPAi3anUhe1aGCXNNDKIgUPC7HuxeenmnP4bIyot5dAwoSWxn92Lo1d7a98r80aZE0oLJGy-7YR8_yIT0b5E8b-GAA_36eRC_Mt9fFmj69Jg_crzzx8bEgHD8bnppEpl5SVTUUlZL-qvA1tTmIZbMXimZck2KHj3PTszAMHA0uyq5nvMl426LW_hLrcU',
  },
  {
    id: 'low-block-counter',
    title: 'Low Block Counter Kill',
    coach: 'Master_Tactics',
    downloads: 1200,
    likes: 650,
    category: 'Defensive',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBs0vNipmnVBs6qdzkEH5-aOduwzKsV7t40Eu1gyjh4qmFl6_S7HujuFIrkLT_Lf4OWPiVqa4NwufrKjHPmNH3BTzDpwD68tlSLeTfDLRgP_hQSNfpPllzRh7WjwmbsvFnRHkOewD1bthPY8WFmYgCO-G6BBdKKtqbjOZoeguQw8ndHzL5YeCpAAAhVBiRYkX6GB7AxVI9bjlHT3AuSfYrBnCrCDa5-QzFKcrUnjz8tjwMeej6SgwAX-jF2vGiIdAAawFGYPqHs_ic',
  },
  {
    id: 'zonal-overload-left',
    title: 'Zonal Overload (Left Flank)',
    coach: 'WingBackKing',
    downloads: 940,
    likes: 312,
    category: 'Attacking',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuD_xFxtxFIR646B6MXbd69IEER8iVcvH-ytsaAWLn3fnpgcOHoTnsuyrSGW37k2ptBesA0VMMwib-4G7F7T40igMVeOF0xvbQRZD5oWbxQCbacGYxFqCrsRp-WakmyD9jql7yU-9vaCp8zvNCzk5W3nRkAjGocKA9uQyOBQLzxMXsEpwMoOxvAHwBxB13Zx-kfYCuTRVRoR_GwYWLlKv63mNclbHaXPLYwLHLohDTE6dLb3y4q53QumF3EvWe-6DBJHBiv7ikg8_9A',
  },
]

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function createMarkerElement(
  label: string,
  color: MarkerColor,
  xPct: number,
  yPct: number,
  widthPct = 6,
  heightPct = 6
): BoardElement {
  return {
    id: createId(`marker-${color}`),
    type: 'marker',
    xPct,
    yPct,
    widthPct,
    heightPct,
    rotationDeg: 0,
    color,
    label,
  }
}

function getEquipmentConfig(type: EquipmentType) {
  return EQUIPMENT_OPTIONS.find((option) => option.type === type) ?? EQUIPMENT_OPTIONS[0]
}

function createEquipmentElement(type: EquipmentType, xPct: number, yPct: number): BoardElement {
  const config = getEquipmentConfig(type)
  const sizePct = Math.max(config.widthPct, config.heightPct)
  return {
    id: createId(type),
    type,
    xPct,
    yPct,
    widthPct: sizePct,
    heightPct: sizePct,
    rotationDeg: 0,
    label: config.label,
  }
}

function getNextMarkerNumber(color: MarkerColor, elements: BoardElement[]) {
  if (color === 'ball') return ''

  const usedNumbers = new Set(
    elements
      .filter((element) => element.type === 'marker' && element.color === color)
      .map((element) => Number(element.label))
      .filter((value) => Number.isFinite(value) && value >= 1 && value <= 11)
  )

  let next = 1
  while (usedNumbers.has(next) && next <= 11) {
    next += 1
  }

  return next <= 11 ? String(next) : ''
}

function getMarkerCount(color: MarkerColor, elements: BoardElement[]) {
  if (color === 'ball') return 0
  return elements.filter((element) => element.type === 'marker' && element.color === color).length
}

const INITIAL_PHASES: PhaseDraft[] = [
  {
    id: 'phase-1',
    label: 'Phase 1',
    elements: [
      createMarkerElement('4', 'blue', 45, 80),
      createMarkerElement('10', 'blue', 30, 65),
      createMarkerElement('8', 'blue', 60, 55),
      createMarkerElement('5', 'red', 35, 25),
      createMarkerElement('2', 'red', 50, 15),
      createMarkerElement('', 'ball', 46, 22, BALL_SIZE_PCT, BALL_SIZE_PCT),
    ],
    drawings: [
      {
        id: 'seed-arrow',
        type: 'arrow',
        color: '#ffe170',
        startXPct: 30,
        startYPct: 65,
        endXPct: 48,
        endYPct: 26,
        strokeWidthPct: 0.7,
      },
    ],
  },
  { id: 'phase-2', label: 'Phase 2', elements: [], drawings: [] },
  { id: 'phase-3', label: 'Phase 3', elements: [], drawings: [] },
  { id: 'phase-4', label: 'Phase 4', elements: [], drawings: [] },
]

function createEmptyDraft(): BoardDraft {
  return {
    version: 1,
    name: 'Play Maker Draft',
    analysisContext: '',
    activePhaseId: INITIAL_PHASES[0].id,
    phases: INITIAL_PHASES,
  }
}

function isBoardDraft(value: unknown): value is BoardDraft {
  if (!value || typeof value !== 'object') return false
  const draft = value as Partial<BoardDraft>
  return draft.version === 1 && Array.isArray(draft.phases) && typeof draft.activePhaseId === 'string'
}

function normalizeDraft(draft: BoardDraft): BoardDraft {
  return {
    ...draft,
    analysisContext: typeof draft.analysisContext === 'string' ? draft.analysisContext : '',
    phases: draft.phases.map((phase) => ({
      ...phase,
      elements: phase.elements.map((element) =>
        element.type === 'marker' && element.color === 'ball'
          ? { ...element, widthPct: BALL_SIZE_PCT, heightPct: BALL_SIZE_PCT }
          : element
      ),
    })),
  }
}

function isSavedPlay(value: unknown): value is SavedPlay {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<SavedPlay>
  return typeof item.id === 'string' && typeof item.title === 'string' && typeof item.updatedAt === 'string' && isBoardDraft(item.draft)
}

function isSavedPlayList(value: unknown): value is SavedPlay[] {
  return Array.isArray(value) && value.every(isSavedPlay)
}

function PlaymakerAsset({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className?: string
}) {
  return <img src={src} alt={alt} className={className} draggable={false} />
}

function EquipmentPreview({ type }: { type: EquipmentType }) {
  return <PlaymakerAsset src={EQUIPMENT_ICON_SRC[type]} alt={type} className="h-7 w-7 opacity-90" />
}

function BoardElementView({
  element,
  selected,
  showLabel = true,
}: {
  element: BoardElement
  selected: boolean
  showLabel?: boolean
}) {
  if (element.type === 'marker') {
    const style = MARKER_STYLES[element.color ?? 'blue']
    const isSmallBall = (element.color ?? 'blue') === 'ball' && !element.label

    return (
      <div
        className={[
          isSmallBall
            ? 'flex h-full w-full items-center justify-center bg-transparent'
            : 'flex h-full w-full items-center justify-center rounded-full border-2 border-white shadow-lg',
          !isSmallBall ? style : '',
          selected ? 'ring-4 ring-white/60 rounded-full' : '',
        ].join(' ')}
      >
        {isSmallBall ? (
          <PlaymakerAsset src="/playmaker-assets/pelota.png" alt="ball" className="h-full w-full object-contain" />
        ) : !showLabel ? (
          <span className="h-[42%] w-[42%] rounded-full bg-white/12" />
        ) : (
          <span className="text-sm font-black leading-none">{element.label}</span>
        )}
      </div>
    )
  }

  return (
    <div
      className={[
        'flex h-full w-full items-center justify-center rounded-full bg-transparent shadow-none',
        selected ? 'ring-4 ring-white/40' : '',
      ].join(' ')}
    >
      <PlaymakerAsset
        src={EQUIPMENT_ICON_SRC[element.type]}
        alt={element.type}
        className="h-[72%] w-[72%] object-contain"
      />
    </div>
  )
}

function PlayPreviewThumbnail({ draft }: { draft: BoardDraft }) {
  const previewPhase = draft.phases.find((phase) => phase.id === draft.activePhaseId) ?? draft.phases[0]

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-gradient-to-b from-[#2e7d32] to-[#1b5e20]">
      <div className="absolute inset-0 opacity-20 [background-image:repeating-linear-gradient(180deg,transparent,transparent_5%,rgba(255,255,255,0.05)_5%,rgba(255,255,255,0.05)_10%)]" />
      <div className="absolute inset-3 rounded-lg border border-white/30" />
      <div className="absolute left-0 top-1/2 h-px w-full bg-white/25" />
      <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25" />
      <div className="absolute left-1/2 top-3 h-8 w-18 -translate-x-1/2 border border-b-0 border-white/25" />
      <div className="absolute bottom-3 left-1/2 h-8 w-18 -translate-x-1/2 border border-t-0 border-white/25" />

      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <marker id="card-arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <polygon points="0 0, 6 3, 0 6" fill="#ffe170" />
          </marker>
        </defs>
        {previewPhase?.drawings.slice(0, 4).map((drawing) => (
          <path
            key={drawing.id}
            d={`M ${drawing.startXPct} ${drawing.startYPct} L ${drawing.endXPct} ${drawing.endYPct}`}
            fill="none"
            stroke={drawing.color}
            strokeWidth={drawing.strokeWidthPct}
            strokeDasharray="2.5 1.8"
            markerEnd="url(#card-arrowhead)"
            strokeLinecap="round"
          />
        ))}
      </svg>

      {previewPhase?.elements.slice(0, 10).map((element) => (
        <div
          key={element.id}
          className="absolute"
          style={{
            left: `${element.xPct}%`,
            top: `${element.yPct}%`,
            width: `${element.widthPct}%`,
            height: `${element.heightPct}%`,
            transform: `translate(-50%, -50%) rotate(${element.rotationDeg}deg)`,
          }}
        >
          <BoardElementView element={element} selected={false} showLabel={false} />
        </div>
      ))}
    </div>
  )
}

export default function PlayMakerClient() {
  const searchParams = useSearchParams()
  const equipoId = searchParams.get('equipo')
  const sharedPlayId = searchParams.get('playId')
  const pitchRef = useRef<HTMLDivElement | null>(null)
  const trashRef = useRef<HTMLDivElement | null>(null)
  const [activeTab, setActiveTab] = useState<PlayMakerTab>('MY')
  const [query, setQuery] = useState('')
  const [communityCategory, setCommunityCategory] = useState<CommunityCategory>('All Plays')
  const [communitySort, setCommunitySort] = useState<'newest' | 'popular'>('newest')
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [activeTool, setActiveTool] = useState<ToolbarTool>('SELECT')
  const [paletteSelection, setPaletteSelection] = useState<PaletteSelection | null>(null)
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [drawingState, setDrawingState] = useState<DrawingState | null>(null)
  const [drawingDragState, setDrawingDragState] = useState<DrawingDragState | null>(null)
  const [isOverTrash, setIsOverTrash] = useState(false)
  const [saveNotice, setSaveNotice] = useState('Cloud sync ready')
  const [draft, setDraft] = useState<BoardDraft>(() => createEmptyDraft())
  const [savedPlays, setSavedPlays] = useState<SavedPlay[]>([])
  const [currentPlayId, setCurrentPlayId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<PlaymakerAnalysis | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [sharePlay, setSharePlay] = useState<SavedPlay | null>(null)
  const [shareChannels, setShareChannels] = useState<ChatChannel[]>([])
  const [selectedShareChatId, setSelectedShareChatId] = useState<string>('')
  const [isLoadingShareChannels, setIsLoadingShareChannels] = useState(false)
  const [isSendingShare, setIsSendingShare] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  const [shareSuccess, setShareSuccess] = useState<string | null>(null)
  const [hasHandledSharedPlay, setHasHandledSharedPlay] = useState(false)
  const [hasLoadedDraftStorage, setHasLoadedDraftStorage] = useState(false)
  const [hasLoadedSavedPlaysStorage, setHasLoadedSavedPlaysStorage] = useState(false)

  const tabMeta = useMemo(
    () => ({
      MY: { label: 'My Plays', count: savedPlays.length },
      COMMUNITY: { label: 'Community', count: null as number | null },
      PUBLIC: { label: 'Public', count: null as number | null },
      PRIVATE: { label: 'Private', count: null as number | null },
    }),
    [savedPlays.length]
  )

  const activePhase = useMemo(
    () => draft.phases.find((phase) => phase.id === draft.activePhaseId) ?? draft.phases[0],
    [draft]
  )

  const communityPlays = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const filtered = COMMUNITY_PLAYS.filter((play) => {
      const categoryMatch = communityCategory === 'All Plays' || play.category === communityCategory
      if (!categoryMatch) return false
      if (!normalizedQuery) return true
      return (
        play.title.toLowerCase().includes(normalizedQuery) ||
        play.coach.toLowerCase().includes(normalizedQuery) ||
        play.category.toLowerCase().includes(normalizedQuery)
      )
    })

    const sorted = [...filtered]
    if (communitySort === 'popular') {
      sorted.sort((a, b) => b.downloads + b.likes - (a.downloads + a.likes))
    }

    return sorted
  }, [communityCategory, communitySort, query])

  const serializedBoard = useMemo(() => JSON.stringify(draft), [draft])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as unknown
      if (isBoardDraft(parsed)) {
        setDraft(normalizeDraft(parsed))
      }
    } catch {
      // Ignore malformed local drafts.
    } finally {
      setHasLoadedDraftStorage(true)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadSavedPlays() {
      try {
        const response = await fetch('/api/playmaker/plays', {
          credentials: 'same-origin',
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }

        const payload = (await response.json()) as PlaymakerApiResponse
        if (!payload.ok || !isSavedPlayList(payload.plays)) {
          throw new Error(payload.error ?? 'Invalid cloud payload')
        }

        if (!cancelled) {
          setSavedPlays(payload.plays.map((play) => ({ ...play, draft: normalizeDraft(play.draft) })))
          setSaveNotice('Synced with Supabase')
        }
      } catch {
        try {
          const raw = window.localStorage.getItem(SAVED_PLAYS_KEY)
          if (!raw) return
          const parsed = JSON.parse(raw) as unknown
          if (isSavedPlayList(parsed) && !cancelled) {
            setSavedPlays(parsed.map((play) => ({ ...play, draft: normalizeDraft(play.draft) })))
            setSaveNotice('Showing local backup')
          }
        } catch {
          // Ignore malformed saved plays fallback.
        }
      } finally {
        if (!cancelled) {
          setHasLoadedSavedPlaysStorage(true)
        }
      }
    }

    void loadSavedPlays()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!hasLoadedDraftStorage) return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
  }, [draft, hasLoadedDraftStorage])

  useEffect(() => {
    if (!hasLoadedSavedPlaysStorage) return
    window.localStorage.setItem(SAVED_PLAYS_KEY, JSON.stringify(savedPlays))
  }, [savedPlays, hasLoadedSavedPlaysStorage])

  useEffect(() => {
    if (!sharedPlayId || hasHandledSharedPlay || !hasLoadedSavedPlaysStorage) return

    const targetPlay = savedPlays.find((play) => play.id === sharedPlayId)
    if (!targetPlay) return

    setHasHandledSharedPlay(true)
    setActiveTab('MY')
    openSavedPlay(targetPlay)
  }, [sharedPlayId, hasHandledSharedPlay, hasLoadedSavedPlaysStorage, savedPlays])

  useEffect(() => {
    if (!isEditorOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isEditorOpen])

  useEffect(() => {
    if (!dragState) return
    const activePointerId = dragState.pointerId
    const elementId = dragState.elementId

    function isPointerInsideTrash(clientX: number, clientY: number) {
      const trash = trashRef.current
      if (!trash) return false
      const rect = trash.getBoundingClientRect()
      return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
    }

    function updatePosition(clientX: number, clientY: number) {
      const pitch = pitchRef.current
      if (!pitch) return
      const rect = pitch.getBoundingClientRect()
      setIsOverTrash(isPointerInsideTrash(clientX, clientY))

      setDraft((current) => ({
        ...current,
        phases: current.phases.map((phase) => {
          if (phase.id !== current.activePhaseId) return phase
          return {
            ...phase,
            elements: phase.elements.map((element) => {
              if (element.id !== elementId) return element
              const halfWidth = element.widthPct / 2
              const halfHeight = element.heightPct / 2
              return {
                ...element,
                xPct: clamp(((clientX - rect.left) / rect.width) * 100, halfWidth, 100 - halfWidth),
                yPct: clamp(((clientY - rect.top) / rect.height) * 100, halfHeight, 100 - halfHeight),
              }
            }),
          }
        }),
      }))
    }

    function handlePointerMove(event: PointerEvent) {
      if (event.pointerId !== activePointerId) return
      updatePosition(event.clientX, event.clientY)
    }

    function handlePointerUp(event: PointerEvent) {
      if (event.pointerId !== activePointerId) return
      if (isPointerInsideTrash(event.clientX, event.clientY)) {
        setDraft((current) => ({
          ...current,
          phases: current.phases.map((phase) =>
            phase.id === current.activePhaseId
              ? { ...phase, elements: phase.elements.filter((element) => element.id !== elementId) }
              : phase
          ),
        }))
        if (selectedElementId === elementId) {
          setSelectedElementId(null)
        }
      }
      setIsOverTrash(false)
      setDragState(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      setIsOverTrash(false)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [dragState, selectedElementId])

  useEffect(() => {
    if (!drawingState) return
    const activePointerId = drawingState.pointerId
    const currentDrawingState = drawingState

    function updateDrawing(clientX: number, clientY: number) {
      const pitch = pitchRef.current
      if (!pitch) return
      const rect = pitch.getBoundingClientRect()

      setDrawingState((current) => {
        if (!current) return current
        return {
          ...current,
          drawing: {
            ...current.drawing,
            endXPct: clamp(((clientX - rect.left) / rect.width) * 100, 0, 100),
            endYPct: clamp(((clientY - rect.top) / rect.height) * 100, 0, 100),
          },
        }
      })
    }

    function commitDrawing() {
      const currentDrawing = currentDrawingState.drawing
      const deltaX = Math.abs(currentDrawing.endXPct - currentDrawing.startXPct)
      const deltaY = Math.abs(currentDrawing.endYPct - currentDrawing.startYPct)

      setDrawingState(null)
      if (deltaX < 1 && deltaY < 1) return

      setDraft((draftState) => ({
        ...draftState,
        phases: draftState.phases.map((phase) => {
          if (phase.id !== draftState.activePhaseId) return phase
          if (phase.drawings.some((drawing) => drawing.id === currentDrawing.id)) return phase
          return { ...phase, drawings: [...phase.drawings, currentDrawing] }
        }),
      }))
    }

    function handlePointerMove(event: PointerEvent) {
      if (event.pointerId !== activePointerId) return
      updateDrawing(event.clientX, event.clientY)
    }

    function handlePointerUp(event: PointerEvent) {
      if (event.pointerId !== activePointerId) return
      commitDrawing()
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [drawingState])

  useEffect(() => {
    if (!drawingDragState) return
    const activePointerId = drawingDragState.pointerId

    function updateDrawingPosition(clientX: number, clientY: number) {
      const pitch = pitchRef.current
      if (!pitch) return
      const rect = pitch.getBoundingClientRect()
      const nextXPct = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100)
      const nextYPct = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100)

      setDrawingDragState((current) => {
        if (!current) return current

        const deltaX = nextXPct - current.lastXPct
        const deltaY = nextYPct - current.lastYPct

        setDraft((draftState) => ({
          ...draftState,
          phases: draftState.phases.map((phase) => {
            if (phase.id !== draftState.activePhaseId) return phase

            return {
              ...phase,
              drawings: phase.drawings.map((drawing) => {
                if (drawing.id !== current.drawingId) return drawing

                const minX = Math.min(drawing.startXPct, drawing.endXPct)
                const maxX = Math.max(drawing.startXPct, drawing.endXPct)
                const minY = Math.min(drawing.startYPct, drawing.endYPct)
                const maxY = Math.max(drawing.startYPct, drawing.endYPct)

                const safeDeltaX = clamp(deltaX, -minX, 100 - maxX)
                const safeDeltaY = clamp(deltaY, -minY, 100 - maxY)

                return {
                  ...drawing,
                  startXPct: drawing.startXPct + safeDeltaX,
                  endXPct: drawing.endXPct + safeDeltaX,
                  startYPct: drawing.startYPct + safeDeltaY,
                  endYPct: drawing.endYPct + safeDeltaY,
                }
              }),
            }
          }),
        }))

        return {
          ...current,
          lastXPct: nextXPct,
          lastYPct: nextYPct,
        }
      })
    }

    function handlePointerMove(event: PointerEvent) {
      if (event.pointerId !== activePointerId) return
      updateDrawingPosition(event.clientX, event.clientY)
    }

    function handlePointerUp(event: PointerEvent) {
      if (event.pointerId !== activePointerId) return
      setDrawingDragState(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [drawingDragState])

  function setActivePhase(phaseId: string) {
    setDraft((current) => ({ ...current, activePhaseId: phaseId }))
    setSelectedElementId(null)
    setSelectedDrawingId(null)
    setDragState(null)
    setDrawingState(null)
    setDrawingDragState(null)
  }

  function activateTool(tool: ToolbarTool) {
    setActiveTool(tool)
    setSelectedElementId(null)
    setSelectedDrawingId(null)
    setDragState(null)
    setDrawingState(null)
    setDrawingDragState(null)

    if (tool !== 'TOOLS' && paletteSelection?.kind === 'equipment') {
      setPaletteSelection(null)
    }

    if (tool !== 'BALL' && paletteSelection?.kind === 'marker') {
      setPaletteSelection(null)
    }
  }

  function getAutoPlacement(indexSeed: number) {
    const positions = [
      { xPct: 50, yPct: 52 },
      { xPct: 42, yPct: 58 },
      { xPct: 58, yPct: 58 },
      { xPct: 35, yPct: 46 },
      { xPct: 65, yPct: 46 },
      { xPct: 50, yPct: 38 },
    ]

    return positions[indexSeed % positions.length]
  }

  function addElementToActivePhase(element: BoardElement) {
    setDraft((current) => ({
      ...current,
      phases: current.phases.map((phase) =>
        phase.id === current.activePhaseId ? { ...phase, elements: [...phase.elements, element] } : phase
      ),
    }))
    setSelectedElementId(element.id)
    setSelectedDrawingId(null)
  }

  function handleEquipmentOptionClick(type: EquipmentType) {
    const activeCount = activePhase.elements.length
    const placement = getAutoPlacement(activeCount)
    const element = createEquipmentElement(type, placement.xPct, placement.yPct)
    setPaletteSelection({ kind: 'equipment', type })
    addElementToActivePhase(element)
  }

  function handleMarkerOptionClick(color: MarkerColor) {
    if (color !== 'ball' && getMarkerCount(color, activePhase.elements) >= 11) {
      setSaveNotice(`Max 11 players for ${color}`)
      return
    }

    const activeCount = activePhase.elements.length
    const placement = getAutoPlacement(activeCount)
    const isSmallBall = color === 'ball'
    const label = getNextMarkerNumber(color, activePhase.elements)
    if (!isSmallBall && !label) {
      setSaveNotice(`Numbers 1-11 already used for ${color}`)
      return
    }
    const element = createMarkerElement(
      label,
      color,
      placement.xPct,
      placement.yPct,
      isSmallBall ? BALL_SIZE_PCT : 6,
      isSmallBall ? BALL_SIZE_PCT : 6
    )
    setPaletteSelection({ kind: 'marker', color })
    addElementToActivePhase(element)
  }

  function handlePitchPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (activeTool !== 'DRAW') return

    const target = event.target as HTMLElement | SVGElement
    const targetElement = target instanceof Element ? target : null
    if (targetElement?.closest('button')) return
    if (targetElement?.closest('[data-drawing-item="true"]')) return

    const pitch = pitchRef.current
    if (!pitch) return
    const rect = pitch.getBoundingClientRect()
    const startXPct = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100)
    const startYPct = clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100)

    setSelectedElementId(null)
    setSelectedDrawingId(null)
    setDrawingState({
      pointerId: event.pointerId,
      drawing: {
        id: createId('arrow'),
        type: 'arrow',
        color: '#ffe170',
        startXPct,
        startYPct,
        endXPct: startXPct,
        endYPct: startYPct,
        strokeWidthPct: 0.7,
      },
    })
  }

  function handlePitchClick(event: ReactPointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement | SVGElement
    const targetElement = target instanceof Element ? target : null
    if (targetElement?.closest('button')) return
    if (targetElement?.closest('[data-drawing-item="true"]')) return

    if (activeTool === 'SELECT') {
      setSelectedElementId(null)
      setSelectedDrawingId(null)
    }
  }

  function handleElementPointerDown(elementId: string, event: ReactPointerEvent<HTMLButtonElement>) {
    event.stopPropagation()

    if (activeTool === 'ERASER') {
      setDraft((current) => ({
        ...current,
        phases: current.phases.map((phase) =>
          phase.id === current.activePhaseId
            ? { ...phase, elements: phase.elements.filter((element) => element.id !== elementId) }
            : phase
        ),
      }))
      if (selectedElementId === elementId) {
        setSelectedElementId(null)
      }
      return
    }

    setSelectedElementId(elementId)
    setSelectedDrawingId(null)

    if (activeTool !== 'SELECT') return

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragState({ pointerId: event.pointerId, elementId })
  }

  function handleDrawingClick(drawingId: string) {
    if (activeTool === 'ERASER') {
      setDraft((current) => ({
        ...current,
        phases: current.phases.map((phase) =>
          phase.id === current.activePhaseId
            ? { ...phase, drawings: phase.drawings.filter((drawing) => drawing.id !== drawingId) }
            : phase
        ),
      }))
      if (selectedDrawingId === drawingId) {
        setSelectedDrawingId(null)
      }
      return
    }

    if (activeTool === 'SELECT') {
      setSelectedElementId(null)
      setSelectedDrawingId(drawingId)
    }
  }

  function handleDrawingPointerDown(drawingId: string, event: ReactPointerEvent<SVGGElement>) {
    event.stopPropagation()

    if (activeTool === 'ERASER') {
      handleDrawingClick(drawingId)
      return
    }

    if (activeTool !== 'SELECT') return

    const pitch = pitchRef.current
    if (!pitch) return
    const rect = pitch.getBoundingClientRect()
    const xPct = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100)
    const yPct = clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100)

    setSelectedElementId(null)
    setSelectedDrawingId(drawingId)
    setDrawingDragState({
      pointerId: event.pointerId,
      drawingId,
      lastXPct: xPct,
      lastYPct: yPct,
    })
  }

  function clearBoard() {
    setDraft((current) => ({
      ...current,
      phases: current.phases.map((phase) =>
        phase.id === current.activePhaseId ? { ...phase, elements: [], drawings: [] } : phase
      ),
    }))
    setSelectedElementId(null)
    setSelectedDrawingId(null)
  }

  function addPhase() {
    const nextPhase: PhaseDraft = {
      id: createId('phase'),
      label: `Phase ${draft.phases.length + 1}`,
      elements: [],
      drawings: [],
    }

    setDraft((current) => ({
      ...current,
      activePhaseId: nextPhase.id,
      phases: [...current.phases, nextPhase],
    }))
    setSelectedElementId(null)
    setSelectedDrawingId(null)
  }

  function createAiPhaseFromRecommendation(recommendation: PlaymakerAnalysis['recommendations'][number], index: number) {
    const sourcePhase = activePhase
    const nextPhaseId = createId('phase-ai')
    const nextPhaseLabel = `Fase IA ${index + 1}`

    const nextPhase: PhaseDraft = {
      id: nextPhaseId,
      label: nextPhaseLabel,
      elements: sourcePhase.elements.map((element) => ({ ...element })),
      drawings: sourcePhase.drawings.map((drawing) => ({ ...drawing })),
    }

    for (const change of recommendation.changes) {
      if (change.operation === 'move_element') {
        const elementId = typeof change.elementId === 'string' ? change.elementId : ''
        const xPct = typeof change.xPct === 'number' ? change.xPct : null
        const yPct = typeof change.yPct === 'number' ? change.yPct : null
        const rotationDeg = typeof change.rotationDeg === 'number' ? change.rotationDeg : null

        if (!elementId || xPct === null || yPct === null) continue

        nextPhase.elements = nextPhase.elements.map((element) => {
          if (element.id !== elementId) return element
          const halfWidth = element.widthPct / 2
          const halfHeight = element.heightPct / 2

          return {
            ...element,
            xPct: clamp(xPct, halfWidth, 100 - halfWidth),
            yPct: clamp(yPct, halfHeight, 100 - halfHeight),
            rotationDeg: rotationDeg ?? element.rotationDeg,
          }
        })
        continue
      }

      if (change.operation === 'add_drawing') {
        const type = change.type === 'arrow' ? 'arrow' : null
        const color = typeof change.color === 'string' ? change.color : '#ffe170'
        const startXPct = typeof change.startXPct === 'number' ? clamp(change.startXPct, 0, 100) : null
        const startYPct = typeof change.startYPct === 'number' ? clamp(change.startYPct, 0, 100) : null
        const endXPct = typeof change.endXPct === 'number' ? clamp(change.endXPct, 0, 100) : null
        const endYPct = typeof change.endYPct === 'number' ? clamp(change.endYPct, 0, 100) : null
        const strokeWidthPct =
          typeof change.strokeWidthPct === 'number' ? clamp(change.strokeWidthPct, 0.3, 2) : 0.7

        if (!type || startXPct === null || startYPct === null || endXPct === null || endYPct === null) continue

        nextPhase.drawings = [
          ...nextPhase.drawings,
          {
            id: createId('arrow-ai'),
            type,
            color,
            startXPct,
            startYPct,
            endXPct,
            endYPct,
            strokeWidthPct,
          },
        ]
        continue
      }

      if (change.operation === 'delete_drawing') {
        const drawingId =
          typeof change.drawingId === 'string'
            ? change.drawingId
            : typeof change.id === 'string'
              ? change.id
              : ''

        if (!drawingId) continue
        nextPhase.drawings = nextPhase.drawings.filter((drawing) => drawing.id !== drawingId)
      }
    }

    setDraft((current) => ({
      ...current,
      activePhaseId: nextPhaseId,
      phases: [...current.phases, nextPhase],
    }))
    setSelectedElementId(null)
    setSelectedDrawingId(null)
    setDragState(null)
    setDrawingState(null)
    setDrawingDragState(null)
    setSaveNotice(`Creada ${nextPhaseLabel}`)
  }

  function upsertSavedPlayState(nextPlay: SavedPlay) {
    setSavedPlays((current) => {
      const existingIndex = current.findIndex((play) => play.id === nextPlay.id)
      if (existingIndex === -1) {
        return [nextPlay, ...current].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      }

      const clone = [...current]
      clone[existingIndex] = nextPlay
      return clone.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    })
  }

  async function openShareModal(play: SavedPlay) {
    setSharePlay(play)
    setShareChannels([])
    setSelectedShareChatId('')
    setShareError(null)
    setShareSuccess(null)
    setIsLoadingShareChannels(true)

    try {
      const params = new URLSearchParams()
      if (equipoId) params.set('equipo', equipoId)
      const query = params.toString()
      const response = await fetch(`/api/chat${query ? `?${query}` : ''}`, {
        credentials: 'same-origin',
        cache: 'no-store',
      })

      const payload = (await response.json()) as ChatBootstrapResponse
      if (!response.ok || !payload.ok) {
        throw new Error('No se pudieron cargar los chats.')
      }

      const sendableChannels = payload.channels.filter((channel) => channel.canSend)
      setShareChannels(sendableChannels)
      setSelectedShareChatId(
        sendableChannels.find((channel) => channel.id === payload.activeChatId)?.id ??
          sendableChannels[0]?.id ??
          ''
      )

      if (sendableChannels.length === 0) {
        setShareError('No tienes ningun chat disponible para enviar esta jugada.')
      }
    } catch (error) {
      setShareError(error instanceof Error ? error.message : 'No se pudieron cargar los chats.')
    } finally {
      setIsLoadingShareChannels(false)
    }
  }

  function closeShareModal() {
    setSharePlay(null)
    setShareChannels([])
    setSelectedShareChatId('')
    setShareError(null)
    setShareSuccess(null)
    setIsLoadingShareChannels(false)
    setIsSendingShare(false)
  }

  async function sendPlayToChat() {
    if (!sharePlay || !selectedShareChatId || isSendingShare) return

    setIsSendingShare(true)
    setShareError(null)
    setShareSuccess(null)

    try {
      const targetEquipoId = equipoId ?? searchParams.get('equipo') ?? ''
      const params = new URLSearchParams()
      if (targetEquipoId) params.set('equipo', targetEquipoId)
      params.set('playId', sharePlay.id)
      const playUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/play-maker?${params.toString()}`
          : `/play-maker?${params.toString()}`

      const messageLines = [
        `Jugada compartida: ${sharePlay.title}`,
        sharePlay.draft.analysisContext.trim()
          ? `Contexto del entrenador: ${sharePlay.draft.analysisContext.trim()}`
          : null,
        `Abrir en Play Maker: ${playUrl}`,
      ].filter(Boolean)

      const response = await fetch('/api/chat/mensajes', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId: selectedShareChatId,
          text: messageLines.join('\n\n'),
        }),
      })

      const payload = (await response.json()) as SendMessageResponse
      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok ? 'No se pudo enviar la jugada.' : payload.error)
      }

      setShareSuccess('Jugada enviada al chat.')
    } catch (error) {
      setShareError(error instanceof Error ? error.message : 'No se pudo enviar la jugada.')
    } finally {
      setIsSendingShare(false)
    }
  }

  async function analyzeBoard() {
    if (isAnalyzing) return

    setIsAnalyzing(true)
    setAnalysisError(null)

    try {
      const response = await fetch('/api/playmaker/analyze', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          draft,
        }),
      })

      const payload = (await response.json()) as PlaymakerAnalysisResponse
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error ?? 'Analysis failed')
      }

      setAnalysis(payload.data)
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'No se pudo analizar la jugada.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  async function saveBoard() {
    if (isSaving) return

    const now = new Date().toISOString()
    const playId = currentPlayId ?? createId('play')
    const title = draft.name.trim() || `Play ${savedPlays.length + 1}`
    const nextPlay: SavedPlay = {
      id: playId,
      title,
      updatedAt: now,
      draft: {
        ...draft,
        name: title,
      },
    }

    setIsSaving(true)
    setSaveNotice('Saving to Supabase...')

    try {
      const response = await fetch('/api/playmaker/plays', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: playId,
          title,
          draft: nextPlay.draft,
          equipoId,
        }),
      })

      const payload = (await response.json()) as PlaymakerApiResponse
      if (!response.ok || !payload.ok || !payload.play || !isSavedPlay(payload.play)) {
        throw new Error(payload.error ?? 'Cloud save failed')
      }

      const persistedPlay: SavedPlay = {
        ...payload.play,
        draft: normalizeDraft(payload.play.draft),
      }

      upsertSavedPlayState(persistedPlay)
      setDraft(persistedPlay.draft)
      setCurrentPlayId(persistedPlay.id)
      setSaveNotice(
        `Saved ${new Date(persistedPlay.updatedAt).toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
        })}`
      )
      setActiveTab('MY')
      setIsEditorOpen(false)
      return
    } catch {
      upsertSavedPlayState(nextPlay)
      setDraft(nextPlay.draft)
      setCurrentPlayId(playId)
      setSaveNotice(`Saved locally ${new Date(now).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`)
      setActiveTab('MY')
      setIsEditorOpen(false)
    } finally {
      setIsSaving(false)
    }
  }

  function openSavedPlay(play: SavedPlay) {
    setDraft(normalizeDraft(play.draft))
    setCurrentPlayId(play.id)
    setSelectedElementId(null)
    setSelectedDrawingId(null)
    setDragState(null)
    setDrawingState(null)
    setDrawingDragState(null)
    setAnalysis(null)
    setAnalysisError(null)
    setSaveNotice(`Opened ${new Date(play.updatedAt).toLocaleDateString('es-ES')}`)
    setIsEditorOpen(true)
  }

  function openNewPlay() {
    const nextDraft = createEmptyDraft()
    setDraft(nextDraft)
    setCurrentPlayId(null)
    setSelectedElementId(null)
    setSelectedDrawingId(null)
    setDragState(null)
    setDrawingState(null)
    setDrawingDragState(null)
    setAnalysis(null)
    setAnalysisError(null)
    setSaveNotice('New draft')
    setIsEditorOpen(true)
  }

  if (isEditorOpen) {
    return (
      <div
        className={`${plusJakarta.variable} ${manrope.variable} fixed inset-0 z-[100] flex h-screen w-screen overflow-hidden bg-[#f7f9fe] [font-family:var(--font-manrope)] text-[#181c20]`}
      >
        <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex h-16 items-center justify-between border-b border-[#dfe3e8] bg-[#f7f9fe]/95 px-4 backdrop-blur md:px-6">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#181c20] transition hover:bg-[#f1f4f9]"
                aria-label="Back to Play Maker"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <p className="hidden text-[11px] font-bold uppercase tracking-[0.18em] text-[#5f6776] md:block">
                  Tactical Board
                </p>
                <input
                  value={draft.name}
                  onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                  className="[font-family:var(--font-plus-jakarta)] w-[220px] max-w-full rounded-xl border border-transparent bg-transparent px-2 py-1 text-lg font-extrabold tracking-tight text-[#181c20] outline-none transition focus:border-[#bfd0ef] focus:bg-white md:w-[320px] md:text-xl"
                  placeholder="Untitled play"
                  type="text"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearBoard}
                className="hidden rounded-full border border-[#c1c6d6] px-5 py-2 text-sm font-semibold text-[#414754] transition hover:bg-[#f1f4f9] md:inline-flex"
              >
                Clear
              </button>
              <button
                type="button"
                className="hidden rounded-full bg-[#dfe3e8] px-5 py-2 text-sm font-semibold text-[#414754] transition hover:bg-[#e5e8ed] md:inline-flex"
              >
                Export PDF
              </button>
              <button
                type="button"
                onClick={analyzeBoard}
                disabled={isAnalyzing}
                className="rounded-full border border-[#bfd0ef] bg-white px-5 py-2 text-sm font-bold text-[#005db6] transition hover:bg-[#ebf2ff] disabled:cursor-wait disabled:opacity-70"
              >
                {isAnalyzing ? 'Analizando...' : 'Analizar IA'}
              </button>
              <button
                type="button"
                onClick={saveBoard}
                disabled={isSaving}
                className="rounded-full bg-[#005db6] px-5 py-2 text-sm font-black text-white shadow-[0_12px_24px_rgba(0,93,182,0.2)] transition hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <div className="ml-2 hidden items-center gap-1 md:flex">
                <button type="button" className="rounded-full p-2 text-[#727785] transition hover:bg-[#f1f4f9]">
                  <History className="h-4 w-4" />
                </button>
                <button type="button" className="rounded-full p-2 text-[#727785] transition hover:bg-[#f1f4f9]">
                  <Settings className="h-4 w-4" />
                </button>
              </div>
            </div>
          </header>

          <main className="relative flex flex-1 overflow-hidden bg-[#f1f4f9]">
            <nav className="absolute left-3 top-3 bottom-28 z-30 flex w-[72px] flex-col items-center rounded-[28px] border border-white/60 bg-white/75 px-2 py-5 shadow-[0_20px_40px_rgba(0,93,182,0.08)] backdrop-blur md:left-4 md:top-6 md:w-20">
              <div className="flex w-full flex-1 flex-col items-center gap-4">
                {TOOLBAR_ITEMS.map((tool) => {
                  const isActive = activeTool === tool.id
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => activateTool(tool.id)}
                      className={[
                        'flex h-14 w-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold uppercase tracking-[0.12em] transition',
                        isActive
                          ? 'bg-[#005db6] text-white shadow-[0_14px_28px_rgba(0,93,182,0.22)]'
                          : 'text-[#727785] hover:bg-[#ebf2ff] hover:text-[#005db6]',
                      ].join(' ')}
                      aria-pressed={isActive}
                    >
                      <PlaymakerAsset
                        src={TOOL_ICON_SRC[tool.id]}
                        alt={tool.label}
                        className={`h-4 w-4 ${isActive ? 'brightness-[8]' : 'opacity-75'}`}
                      />
                      <span>{tool.label}</span>
                    </button>
                  )
                })}

                <div className="mt-auto flex flex-col gap-2 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#727785]">
                    {saveNotice}
                  </span>
                </div>
              </div>
            </nav>

            {(activeTool === 'TOOLS' || activeTool === 'BALL') && (
              <div className="absolute left-[92px] top-6 z-30 w-[220px] rounded-[28px] border border-white/70 bg-white/92 p-4 shadow-[0_20px_40px_rgba(0,93,182,0.08)] backdrop-blur">
                {activeTool === 'TOOLS' ? (
                  <>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#5f6776]">
                      Training Equipment
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {EQUIPMENT_OPTIONS.map((option) => {
                        const active =
                          paletteSelection?.kind === 'equipment' && paletteSelection.type === option.type
                        return (
                          <button
                            key={option.type}
                            type="button"
                            onClick={() => handleEquipmentOptionClick(option.type)}
                            className={[
                              'rounded-2xl border px-3 py-3 text-left transition',
                              active
                                ? 'border-[#005db6]/20 bg-[#ebf2ff] text-[#005db6]'
                                : 'border-[#dfe3e8] bg-[#f8fafc] text-[#414754] hover:border-[#bfd0ef]',
                            ].join(' ')}
                          >
                            <div className="mb-2 flex h-9 items-center justify-center rounded-xl bg-transparent">
                              <EquipmentPreview type={option.type} />
                            </div>
                            <span className="text-xs font-bold">{option.label}</span>
                          </button>
                        )
                      })}
                    </div>
                    <p className="mt-3 text-[11px] text-[#727785]">
                      Choose equipment, then click on the pitch to place it.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#5f6776]">
                      Marker Colors
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {MARKER_OPTIONS.map((color) => {
                        const active = paletteSelection?.kind === 'marker' && paletteSelection.color === color
                        const isBall = color === 'ball'
                        return (
                          <button
                            key={color}
                            type="button"
                            onClick={() => handleMarkerOptionClick(color)}
                            className={[
                              'flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] transition',
                              active
                                ? 'border-[#005db6]/20 bg-[#ebf2ff] text-[#005db6]'
                                : 'border-[#dfe3e8] bg-[#f8fafc] text-[#414754] hover:border-[#bfd0ef]',
                            ].join(' ')}
                          >
                            {isBall ? (
                              <span className="flex h-4 w-4 items-center justify-center">
                                <PlaymakerAsset src="/playmaker-assets/pelota.png" alt="ball" className="h-5.5 w-5.5 object-contain" />
                              </span>
                            ) : (
                              <span
                                className={[
                                  'h-4 w-4 rounded-full border border-black/10',
                                  MARKER_STYLES[color],
                                ].join(' ')}
                              />
                            )}
                            {color}
                          </button>
                        )
                      })}
                    </div>
                    <p className="mt-3 text-[11px] text-[#727785]">
                      Add blue or red players with numbers 1-11, or place the ball.
                    </p>
                  </>
                )}
              </div>
            )}

            <aside className="absolute right-3 top-3 bottom-28 z-30 flex w-[300px] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white/92 p-4 shadow-[0_20px_40px_rgba(0,93,182,0.08)] backdrop-blur md:right-6 md:top-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#5f6776]">
                    Analisis IA
                  </p>
                  <p className="mt-1 text-xs text-[#727785]">
                    Opinion tactica breve sobre la idea actual.
                  </p>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full bg-[#ebf2ff] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#005db6]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Coach
                </div>
              </div>

              <div className="mt-4 flex-1 overflow-y-auto pr-1">
                <div>
                  <label
                    htmlFor="playmaker-analysis-context"
                    className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#5f6776]"
                  >
                    Contexto de la jugada
                  </label>
                  <textarea
                    id="playmaker-analysis-context"
                    value={draft.analysisContext}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        analysisContext: event.target.value,
                      }))
                    }
                    placeholder="Ejemplo: buscamos fijar por dentro y activar al extremo en lado debil, o atraer presion para salir por fuera."
                    className="mt-2 min-h-[104px] w-full resize-none rounded-2xl border border-[#dfe3e8] bg-[#f8fafc] px-3 py-3 text-sm font-medium text-[#181c20] outline-none transition focus:border-[#759efd] focus:ring-2 focus:ring-[#759efd]/25"
                  />
                  <p className="mt-2 text-xs text-[#727785]">
                    Aqui puedes explicar la idea, el objetivo o el contexto para que la IA valore mejor la jugada.
                  </p>
                </div>

                {analysis ? (
                  <div className="mt-4 space-y-4 pb-2">
                    <div>
                      <p className="[font-family:var(--font-plus-jakarta)] text-base font-extrabold leading-snug text-[#0e1f46]">
                        {analysis.verdict}
                      </p>
                      <p className="mt-3 rounded-2xl bg-[#fff4e5] px-3 py-2 text-sm font-semibold text-[#8a5200]">
                        {analysis.main_problem}
                      </p>
                      <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#727785]">
                        Confidence {analysis.confidence}
                      </p>
                    </div>

                    {analysis.reasons.length > 0 ? (
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#5f6776]">
                          Reasons
                        </p>
                        <div className="mt-2 space-y-2">
                          {analysis.reasons.map((reason, index) => (
                            <p
                              key={`reason-${index}`}
                              className="rounded-2xl bg-[#f8fafc] px-3 py-2 text-sm font-medium text-[#414754]"
                            >
                              {reason}
                            </p>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {analysis.improvements.length > 0 ? (
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#5f6776]">
                          Improvements
                        </p>
                        <div className="mt-2 space-y-2">
                          {analysis.improvements.map((improvement, index) => (
                            <p
                              key={`improvement-${index}`}
                              className="rounded-2xl bg-[#ebf2ff] px-3 py-2 text-sm font-semibold text-[#005db6]"
                            >
                              {improvement}
                            </p>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {analysis.danger_zones.length > 0 ? (
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#5f6776]">
                          Danger Zones
                        </p>
                        <div className="mt-2 space-y-2">
                          {analysis.danger_zones.map((zone, index) => (
                            <p
                              key={`danger-zone-${index}`}
                              className="rounded-2xl bg-[#ffdad6] px-3 py-2 text-sm font-semibold text-[#93000a]"
                            >
                              {zone}
                            </p>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {analysis.strengths.length > 0 ? (
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#5f6776]">
                          Strengths
                        </p>
                        <div className="mt-2 space-y-2">
                          {analysis.strengths.map((strength, index) => (
                            <p
                              key={`strength-${index}`}
                              className="rounded-2xl bg-[#e8f5e9] px-3 py-2 text-sm font-semibold text-[#1b5e20]"
                            >
                              {strength}
                            </p>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {analysis.assumptions.length > 0 ? (
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#5f6776]">
                          Assumptions
                        </p>
                        <div className="mt-2 space-y-2">
                          {analysis.assumptions.map((assumption, index) => (
                            <p
                              key={`assumption-${index}`}
                              className="rounded-2xl bg-[#f1f4f9] px-3 py-2 text-sm font-medium text-[#5f6776]"
                            >
                              {assumption}
                            </p>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {analysis.recommendations.length > 0 ? (
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#5f6776]">
                          Board Recommendations
                        </p>
                        <div className="mt-2 space-y-3">
                          {analysis.recommendations.map((recommendation, index) => (
                            <div
                              key={`recommendation-${index}`}
                              className="rounded-3xl border border-[#dfe3e8] bg-white p-3"
                            >
                              <p className="text-sm font-extrabold text-[#0e1f46]">
                                {recommendation.title}
                              </p>
                              <p className="mt-1 text-sm font-medium text-[#414754]">
                                {recommendation.reason}
                              </p>
                              <button
                                type="button"
                                onClick={() => createAiPhaseFromRecommendation(recommendation, index)}
                                className="mt-3 inline-flex rounded-full bg-[#005db6] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white shadow-[0_10px_20px_rgba(0,93,182,0.18)] transition hover:opacity-90"
                              >
                                Crear Fase IA
                              </button>
                              <div className="mt-2 space-y-2">
                                {recommendation.changes.map((change, changeIndex) => (
                                  <pre
                                    key={`recommendation-${index}-change-${changeIndex}`}
                                    className="overflow-x-auto rounded-2xl bg-[#f8fafc] px-3 py-2 text-xs font-medium text-[#5f6776]"
                                  >
                                    {JSON.stringify(change, null, 2)}
                                  </pre>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-4 rounded-3xl border border-dashed border-[#dfe3e8] bg-[#f8fafc] p-4">
                    <p className="text-sm font-semibold text-[#414754]">
                      {isAnalyzing ? 'Analizando la estructura y el riesgo tactico...' : 'Pulsa "Analizar IA" para recibir una opinion de entrenador.'}
                    </p>
                    <p className="mt-2 text-xs text-[#727785]">
                      El analisis juzga la idea: apoyos, balance defensivo, weak side, espacio a la espalda y riesgo tras perdida.
                    </p>
                  </div>
                )}

                {analysisError ? (
                  <p className="mt-3 rounded-2xl bg-[#ffdad6] px-3 py-2 text-sm font-semibold text-[#93000a]">
                    {analysisError}
                  </p>
                ) : null}
              </div>
            </aside>

            <section className="flex flex-1 items-center justify-center px-3 pb-28 pt-3 md:px-6 md:pt-5">
              <div
                ref={pitchRef}
                onPointerDown={handlePitchPointerDown}
                onClick={handlePitchClick}
                className="relative aspect-[9/14] h-full max-h-[82vh] w-full max-w-[540px] overflow-hidden rounded-[32px] border-[12px] border-white/10 bg-gradient-to-b from-[#2e7d32] to-[#1b5e20] shadow-2xl ring-1 ring-black/5"
              >
                <div className="absolute inset-0 opacity-20 [background-image:repeating-linear-gradient(180deg,transparent,transparent_5%,rgba(255,255,255,0.05)_5%,rgba(255,255,255,0.05)_10%)]" />
                <div className="absolute inset-4 rounded-sm border-2 border-white/40" />
                <div className="absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 bg-white/40" />
                <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/40" />
                <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40" />
                <div className="absolute left-1/2 top-4 h-20 w-48 -translate-x-1/2 border-2 border-t-0 border-white/40" />
                <div className="absolute left-1/2 top-4 h-8 w-24 -translate-x-1/2 border-2 border-t-0 border-white/40" />
                <div className="absolute bottom-4 left-1/2 h-20 w-48 -translate-x-1/2 border-2 border-b-0 border-white/40" />
                <div className="absolute bottom-4 left-1/2 h-8 w-24 -translate-x-1/2 border-2 border-b-0 border-white/40" />
                <div className="absolute -top-1 left-1/2 flex h-4 w-20 -translate-x-1/2 items-end justify-center rounded-b-lg border-2 border-white/60 bg-white/20 shadow-inner">
                  <div className="mb-1 h-[1px] w-full bg-white/30" />
                </div>
                <div className="absolute -bottom-1 left-1/2 flex h-4 w-20 -translate-x-1/2 items-start justify-center rounded-t-lg border-2 border-white/60 bg-white/20 shadow-inner">
                  <div className="mt-1 h-[1px] w-full bg-white/30" />
                </div>

                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <defs>
                    <marker id="play-maker-arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                      <polygon points="0 0, 6 3, 0 6" fill="#ffe170" />
                    </marker>
                  </defs>

                  {[
                    ...activePhase.drawings,
                    ...(drawingState &&
                    !activePhase.drawings.some((item) => item.id === drawingState.drawing.id)
                      ? [drawingState.drawing]
                      : []),
                  ].map((drawing) => {
                    const isSelected = selectedDrawingId === drawing.id
                    return (
                      <g
                        key={drawing.id}
                        data-drawing-item="true"
                        onPointerDown={(event) => handleDrawingPointerDown(drawing.id, event)}
                        onClick={() => handleDrawingClick(drawing.id)}
                        className={activeTool === 'SELECT' ? 'cursor-move' : 'cursor-pointer'}
                      >
                        <path
                          data-drawing-item="true"
                          d={`M ${drawing.startXPct} ${drawing.startYPct} L ${drawing.endXPct} ${drawing.endYPct}`}
                          fill="none"
                          stroke={drawing.color}
                          strokeWidth={isSelected ? drawing.strokeWidthPct + 0.35 : drawing.strokeWidthPct}
                          strokeDasharray="2.5 1.8"
                          markerEnd="url(#play-maker-arrowhead)"
                          strokeLinecap="round"
                          pointerEvents="stroke"
                        />
                      </g>
                    )
                  })}
                </svg>

                {activePhase.elements.map((element) => {
                  const isSelected = selectedElementId === element.id

                  return (
                    <button
                      key={element.id}
                      type="button"
                      onPointerDown={(event) => handleElementPointerDown(element.id, event)}
                      className={[
                        'absolute z-20 touch-none select-none transition',
                        activeTool === 'ERASER' ? 'cursor-not-allowed' : 'cursor-pointer',
                        isSelected ? 'drop-shadow-[0_0_16px_rgba(255,255,255,0.85)]' : '',
                      ].join(' ')}
                      style={{
                        left: `${element.xPct}%`,
                        top: `${element.yPct}%`,
                        width: `${element.widthPct}%`,
                        height: `${element.heightPct}%`,
                        transform: `translate(-50%, -50%) rotate(${element.rotationDeg}deg)`,
                      }}
                      aria-label={element.label ?? element.type}
                    >
                      <BoardElementView element={element} selected={isSelected} />
                    </button>
                  )
                })}

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
            </section>

            <footer className="absolute bottom-0 left-0 right-0 z-30 flex h-24 items-center justify-center border-t border-[#dfe3e8] bg-white/95 px-4 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] backdrop-blur">
              <div className="flex items-center gap-2 md:gap-4">
                {draft.phases.map((phase, index) => {
                  const active = draft.activePhaseId === phase.id
                  return (
                    <button
                      key={phase.id}
                      type="button"
                      onClick={() => setActivePhase(phase.id)}
                      className={[
                        'flex flex-col items-center justify-center rounded-2xl px-4 py-2 text-xs font-bold transition md:px-6',
                        active
                          ? 'border-2 border-[#005db6]/10 bg-[#ebf2ff] text-[#005db6]'
                          : 'text-[#727785] hover:bg-[#f8fafc]',
                      ].join(' ')}
                    >
                      <span className="mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-current/10 text-[11px]">
                        {index + 1}
                      </span>
                      {phase.label}
                    </button>
                  )
                })}

                <button
                  type="button"
                  onClick={addPhase}
                  className="ml-1 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#e5e8ed] text-[#005db6] transition hover:bg-[#d6e3ff]"
                  aria-label="Add phase"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </footer>

            <div className="pointer-events-none absolute bottom-30 right-4 z-40 md:right-6">
              <div
                ref={trashRef}
                className={[
                  'flex h-16 w-16 items-center justify-center rounded-full border-2 shadow-[0_16px_30px_rgba(0,0,0,0.12)] transition-all',
                  isOverTrash
                    ? 'scale-110 border-[#ba1a1a] bg-[#ba1a1a] text-white'
                    : 'border-white/80 bg-white/92 text-[#727785] backdrop-blur',
                ].join(' ')}
              >
                <Trash2 className="h-6 w-6" />
              </div>
              <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-[#5f6776]">
                Trash
              </p>
            </div>
          </main>

          <textarea readOnly value={serializedBoard} className="hidden" aria-hidden="true" tabIndex={-1} />
        </div>
      </div>
    )
  }

  return (
    <div
      className={`${plusJakarta.variable} ${manrope.variable} min-h-screen bg-[#f7f9fe] [font-family:var(--font-manrope)] text-[#181c20]`}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-[1700px]">
        <LeftNavigation equipoId={equipoId ?? undefined} teamName="Equipo" />

        <main className="flex min-w-0 flex-1 flex-col px-5 py-6 pb-24 lg:px-10 lg:pb-10">
          <header className="sticky top-0 z-30 -mx-5 border-b border-[#dfe3e8] bg-[#f7f9fe]/92 px-5 py-5 backdrop-blur lg:-mx-10 lg:px-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#5f6776]">
                  AI Workspace
                </p>
                <h1 className="[font-family:var(--font-plus-jakarta)] text-3xl font-extrabold tracking-tight text-[#0e1f46]">
                  Play Maker
                </h1>
                <p className="mt-2 max-w-2xl text-sm font-medium text-[#5f6776]">
                  Future home for AI-powered play creation and tactical assistance.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <div className="relative w-full sm:w-[340px]">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#727785]" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search tactics, plays, or authors..."
                    className="w-full rounded-full border border-[#dfe3e8] bg-white px-11 py-3 text-sm font-semibold text-[#181c20] outline-none transition focus:border-[#759efd] focus:ring-2 focus:ring-[#759efd]/30"
                    type="search"
                  />
                </div>

                <button
                  type="button"
                  onClick={openNewPlay}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#005db6] to-[#2b5bb5] px-6 py-3 text-sm font-black text-white shadow-[0_12px_24px_rgba(0,93,182,0.22)] transition hover:brightness-105 active:scale-[0.98]"
                >
                  <Plus className="h-4 w-4" />
                  Create Play
                </button>
              </div>
            </div>

            <div className="mt-5 flex gap-8 overflow-x-auto border-b border-[#e5e8ed] pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {(Object.keys(tabMeta) as PlayMakerTab[]).map((key) => {
                const tab = tabMeta[key]
                const isActive = activeTab === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key)}
                    className={[
                      'flex items-center gap-2 whitespace-nowrap pb-4 [font-family:var(--font-plus-jakarta)] text-sm font-extrabold transition',
                      isActive
                        ? 'border-b-2 border-[#005db6] text-[#005db6]'
                        : 'text-[#727785] hover:text-[#5f6776]',
                    ].join(' ')}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {tab.label}
                    {typeof tab.count === 'number' ? (
                      <span className="rounded bg-[#005db6]/10 px-2 py-0.5 text-[10px] font-black text-[#005db6]">
                        {tab.count}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </header>

          <section className="mt-8 flex flex-1">
            {activeTab === 'MY' && savedPlays.length > 0 ? (
              <div className="grid w-full grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                <button
                  type="button"
                  onClick={openNewPlay}
                  className="group flex min-h-[360px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-[#f1f4f9] p-4 transition-all duration-300 hover:border-[#005db6]/40 hover:bg-[#dfe3e8]"
                >
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#005db6] shadow-sm transition-transform group-hover:scale-110">
                    <Plus className="h-8 w-8" />
                  </div>
                  <span className="[font-family:var(--font-plus-jakarta)] text-lg font-bold text-slate-500">
                    Create New Play
                  </span>
                  <span className="mt-1 text-xs text-slate-400">Start from a blank pitch</span>
                </button>

                {savedPlays.map((play) => {
                  const firstPhase = play.draft.phases[0]
                  const playerCount = firstPhase?.elements.filter(
                    (element) => element.type === 'marker' && element.color !== 'ball'
                  ).length ?? 0
                  const equipmentCount = firstPhase?.elements.filter((element) => element.type !== 'marker').length ?? 0

                  return (
                    <article
                      key={play.id}
                      className="group flex flex-col rounded-xl bg-white p-4 shadow-[0px_20px_40px_rgba(0,93,182,0.02)] transition-all duration-300 hover:shadow-[0px_20px_40px_rgba(0,93,182,0.06)]"
                    >
                      <div className="relative mb-5 h-48 w-full overflow-hidden rounded-xl">
                        <PlayPreviewThumbnail draft={play.draft} />
                        <div className="absolute left-3 top-3 flex gap-2">
                          <span className="flex items-center gap-1 rounded-full bg-[#3176d2]/90 px-3 py-1 text-[10px] font-bold uppercase text-white backdrop-blur-md">
                            My Play
                          </span>
                        </div>

                        <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => openSavedPlay(play)}
                            className="mb-4 rounded-full bg-white/20 px-6 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white backdrop-blur-xl transition-colors hover:bg-white/40"
                          >
                            Quick Preview
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 px-1">
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => openSavedPlay(play)}
                            className="[font-family:var(--font-plus-jakarta)] text-left text-lg font-bold leading-tight text-[#181c20] transition-colors group-hover:text-[#005db6]"
                          >
                            {play.title}
                          </button>
                          <span className="text-slate-300">•••</span>
                        </div>

                        <div className="mb-6 flex items-center gap-2">
                          <div className="h-6 w-6 overflow-hidden rounded-full bg-slate-200">
                            <div className="flex h-full w-full items-center justify-center bg-[#d6e3ff] text-[10px] font-black text-[#005db6]">
                              BP
                            </div>
                          </div>
                          <span className="text-xs text-slate-500">
                            Beprofessional •{' '}
                            {new Date(play.updatedAt).toLocaleString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="mt-auto flex items-center justify-between border-t border-slate-50 pt-4">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => openSavedPlay(play)}
                            className="rounded-lg p-2 text-slate-400 transition-all hover:bg-[#005db6]/5 hover:text-[#005db6]"
                            title="Open"
                          >
                            Open
                          </button>
                          <div className="rounded-lg bg-[#f1f4f9] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#5f6776]">
                            {playerCount}P · {equipmentCount}T
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openShareModal(play)}
                            className="rounded-lg p-2 text-slate-400 transition-all hover:bg-[#005db6]/5 hover:text-[#005db6]"
                            title="Share"
                          >
                            Share
                          </button>
                          <button
                            type="button"
                            onClick={() => openSavedPlay(play)}
                            className="rounded-lg p-2 text-slate-400 transition-all hover:bg-[#005db6]/5 hover:text-[#005db6]"
                            title="Edit"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : activeTab === 'COMMUNITY' ? (
              <div className="w-full space-y-8 lg:space-y-10">
                <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#005db6] via-[#1f67c6] to-[#2b5bb5] p-6 text-white shadow-[0_18px_45px_rgba(0,93,182,0.28)] md:p-8 lg:p-10">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_60%)]" />

                  <div className="relative grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
                    <div>
                      <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#ffe170] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#3a3100]">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        Most Downloaded Play of the Week
                      </div>
                      <h2 className="[font-family:var(--font-plus-jakarta)] text-3xl font-extrabold tracking-tight md:text-4xl xl:text-5xl">
                        {COMMUNITY_FEATURED_PLAY.title}
                      </h2>
                      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm font-semibold text-white/90">
                        <span>{COMMUNITY_FEATURED_PLAY.coach}</span>
                        <span className="h-1.5 w-1.5 rounded-full bg-white/50" />
                        <span className="inline-flex items-center gap-1.5">
                          <Download className="h-4 w-4" />
                          {formatCompactNumber(COMMUNITY_FEATURED_PLAY.downloads)} downloads
                        </span>
                      </div>

                      <div className="mt-7 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={openNewPlay}
                          className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-[#005db6] transition hover:bg-[#f1f4f9]"
                        >
                          <Copy className="h-4 w-4" />
                          Clone to My Library
                        </button>
                        <button
                          type="button"
                          onClick={openNewPlay}
                          className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/15 px-6 py-3 text-sm font-black text-white backdrop-blur-sm transition hover:bg-white/25"
                        >
                          <Eye className="h-4 w-4" />
                          View Breakdown
                        </button>
                      </div>
                    </div>

                    <div className="mx-auto w-full max-w-[420px] lg:mx-0 lg:justify-self-end">
                      <div className="rounded-3xl border border-white/30 bg-white/12 p-3 shadow-[0_14px_36px_rgba(0,0,0,0.24)] backdrop-blur-md">
                        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
                          <PlaymakerAsset
                            src={COMMUNITY_FEATURED_PLAY.imageUrl}
                            alt={COMMUNITY_FEATURED_PLAY.title}
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
                          <div className="absolute bottom-4 left-4 rounded-full bg-black/35 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white">
                            Positional Play
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-5">
                  <div className="flex flex-wrap gap-2">
                    {COMMUNITY_CATEGORIES.map((category) => {
                      const isActive = communityCategory === category
                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() => setCommunityCategory(category)}
                          className={[
                            'rounded-full px-5 py-2 text-xs font-black uppercase tracking-[0.1em] transition',
                            isActive
                              ? 'bg-[#005db6] text-white shadow-[0_10px_20px_rgba(0,93,182,0.25)]'
                              : 'border border-[#dfe3e8] bg-white text-[#5f6776] hover:bg-[#f1f4f9]',
                          ].join(' ')}
                        >
                          {category}
                        </button>
                      )
                    })}
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#dfe3e8] bg-white px-4 py-2.5 text-sm font-bold text-[#414754] transition hover:bg-[#f1f4f9]"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                      Filter
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCommunitySort((current) => (current === 'newest' ? 'popular' : 'newest'))
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#dfe3e8] bg-white px-4 py-2.5 text-sm font-bold text-[#414754] transition hover:bg-[#f1f4f9]"
                    >
                      <ArrowUpDown className="h-4 w-4" />
                      Sort: {communitySort === 'newest' ? 'Newest' : 'Popular'}
                    </button>
                  </div>
                </section>

                {communityPlays.length > 0 ? (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {communityPlays.map((play) => (
                      <article
                        key={play.id}
                        className="group flex flex-col overflow-hidden rounded-[22px] border border-[#e5e8ed] bg-white shadow-[0px_18px_35px_rgba(0,93,182,0.04)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0px_20px_40px_rgba(0,93,182,0.1)]"
                      >
                        <div className="relative aspect-video overflow-hidden">
                          <PlaymakerAsset
                            src={play.imageUrl}
                            alt={play.title}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent opacity-80" />

                          {play.elitePick ? (
                            <div className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-[#ffe170] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#3a3100]">
                              <Star className="h-3 w-3 fill-current" />
                              Elite Pick
                            </div>
                          ) : null}

                          <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-2 opacity-0 transition group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={openNewPlay}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-[#005db6] transition hover:scale-105"
                              aria-label={`Preview ${play.title}`}
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={openNewPlay}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#005db6] text-white transition hover:scale-105"
                              aria-label={`Clone ${play.title}`}
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-1 flex-col p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="[font-family:var(--font-plus-jakarta)] text-lg font-bold leading-tight text-[#181c20]">
                                {play.title}
                              </h3>
                              <p className="mt-1 text-sm font-semibold text-[#5f6776]">by {play.coach}</p>
                            </div>
                            <button
                              type="button"
                              className="rounded-lg p-1.5 text-[#9aa0ae] transition hover:bg-[#f1f4f9] hover:text-[#5f6776]"
                              aria-label={`More options for ${play.title}`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="mt-5 flex flex-wrap items-center gap-4 text-xs font-bold text-[#5f6776]">
                            <span className="inline-flex items-center gap-1.5">
                              <Download className="h-3.5 w-3.5" />
                              {formatCompactNumber(play.downloads)}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <Heart className="h-3.5 w-3.5" />
                              {formatCompactNumber(play.likes)}
                            </span>
                            <span className="rounded-full bg-[#ebf2ff] px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-[#005db6]">
                              {play.category}
                            </span>
                          </div>

                          <div className="mt-6 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={openNewPlay}
                              className="rounded-xl bg-[#ebf2ff] px-3 py-2 text-sm font-bold text-[#005db6] transition hover:bg-[#d6e3ff]"
                            >
                              Preview
                            </button>
                            <button
                              type="button"
                              onClick={openNewPlay}
                              className="rounded-xl bg-[#005db6] px-3 py-2 text-sm font-black text-white transition hover:bg-[#2b5bb5]"
                            >
                              Clone
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="flex w-full flex-1 items-center justify-center rounded-3xl border border-dashed border-[#c1c6d6] bg-white/50 p-10 text-center">
                    <div className="max-w-md">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#ebf2ff] text-[#005db6]">
                        <Search className="h-8 w-8" />
                      </div>
                      <p className="text-sm font-semibold text-[#414754]">No community plays found.</p>
                      <p className="mt-2 text-xs text-[#727785]">
                        Try another search term or change the selected category.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex w-full flex-1 items-center justify-center rounded-3xl border border-dashed border-[#c1c6d6] bg-white/50 p-10 text-center">
                <div className="max-w-md">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#ebf2ff] text-[#005db6]">
                    <Sparkles className="h-8 w-8" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#727785]">
                    {tabMeta[activeTab].label}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#414754]">
                    {activeTab === 'MY' ? 'No saved plays yet.' : 'Empty for now.'}
                  </p>
                  <p className="mt-2 text-xs text-[#727785]">
                    {activeTab === 'MY'
                      ? 'Save a play from the editor and it will appear here ready to reopen.'
                      : 'This section is prepared for upcoming Play Maker features.'}
                  </p>
                </div>
              </div>
            )}
          </section>

          <button
            type="button"
            onClick={openNewPlay}
            className="fixed bottom-6 right-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-[#005db6] to-[#2b5bb5] text-white shadow-[0_18px_35px_rgba(0,93,182,0.35)] transition hover:brightness-105 active:scale-[0.98] lg:hidden"
            aria-label="Create Play"
            title="Create Play"
          >
            <Plus className="h-6 w-6" />
          </button>

          {sharePlay ? (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0e1f46]/30 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_24px_60px_rgba(14,31,70,0.18)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#5f6776]">
                      Compartir jugada
                    </p>
                    <h3 className="[font-family:var(--font-plus-jakarta)] mt-1 text-xl font-extrabold text-[#0e1f46]">
                      {sharePlay.title}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={closeShareModal}
                    className="rounded-full px-3 py-1 text-sm font-bold text-[#727785] transition hover:bg-[#f1f4f9]"
                  >
                    Cerrar
                  </button>
                </div>

                <div className="mt-4">
                  <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#5f6776]">
                    Elegir chat
                  </label>
                  <div className="mt-2 space-y-2">
                    {isLoadingShareChannels ? (
                      <div className="rounded-2xl bg-[#f8fafc] px-4 py-3 text-sm font-semibold text-[#414754]">
                        Cargando chats...
                      </div>
                    ) : shareChannels.length > 0 ? (
                      shareChannels.map((channel) => (
                        <button
                          key={channel.id}
                          type="button"
                          onClick={() => setSelectedShareChatId(channel.id)}
                          className={[
                            'flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition',
                            selectedShareChatId === channel.id
                              ? 'border-[#005db6]/20 bg-[#ebf2ff] text-[#005db6]'
                              : 'border-[#dfe3e8] bg-[#f8fafc] text-[#414754] hover:border-[#bfd0ef]',
                          ].join(' ')}
                        >
                          <span className="font-semibold">{channel.label}</span>
                          <span className="text-[10px] font-bold uppercase tracking-[0.14em]">
                            {channel.kind}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="rounded-2xl bg-[#f8fafc] px-4 py-3 text-sm font-semibold text-[#414754]">
                        No hay chats disponibles.
                      </div>
                    )}
                  </div>
                </div>

                {shareError ? (
                  <p className="mt-4 rounded-2xl bg-[#ffdad6] px-3 py-2 text-sm font-semibold text-[#93000a]">
                    {shareError}
                  </p>
                ) : null}

                {shareSuccess ? (
                  <p className="mt-4 rounded-2xl bg-[#e8f5e9] px-3 py-2 text-sm font-semibold text-[#1b5e20]">
                    {shareSuccess}
                  </p>
                ) : null}

                <div className="mt-5 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeShareModal}
                    className="rounded-full border border-[#dfe3e8] px-4 py-2 text-sm font-bold text-[#414754] transition hover:bg-[#f1f4f9]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={sendPlayToChat}
                    disabled={!selectedShareChatId || isSendingShare || isLoadingShareChannels}
                    className="rounded-full bg-[#005db6] px-5 py-2 text-sm font-black text-white shadow-[0_12px_24px_rgba(0,93,182,0.2)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSendingShare ? 'Enviando...' : 'Enviar al chat'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  )
}
