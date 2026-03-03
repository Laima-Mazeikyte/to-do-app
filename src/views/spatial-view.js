import Matter from 'matter-js'
import {
  loadTasks as apiLoadTasks,
  addTask as apiAddTask,
  removeTask as apiRemoveTask,
  setDone as apiSetDone,
  setTaskText as apiSetTaskText
} from '../lib/todo-api.js'
import { parsePastedList } from '../paste-list-parser.js'
import { COPY } from '../copy.js'
import { getTheme, setTheme } from '../lib/theme.js'

const Engine = Matter.Engine
const World = Matter.World
const Bodies = Matter.Bodies
const Body = Matter.Body

const DRAWER_FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
const DELETE_UNDO_MS = 5000

const CARD_MIN_WIDTH = 90
const CARD_MAX_WIDTH = 280
const CARD_MIN_HEIGHT = 44
const CARD_MAX_HEIGHT = 120
const FLOOR_HEIGHT = 60
const SPAWN_Y = 72
const GRAVITY = 1.2
const GRID_GAP = 16
const CLEANUP_STORAGE_KEY = 'spatial-cleanup-mode'

/** @typedef {'all' | 'todo' | 'done'} FilterMode */

/**
 * Initialize the spatial (physics) view. Sets up DOM refs, physics, paste drawer, filters, and event listeners.
 * @param {import('@supabase/supabase-js').SupabaseClient | null} supabase
 * @param {{ auth?: { openAuthModal: () => void, signOut: () => Promise<void>, getAuthState: () => Promise<{ user: object | null, isAnonymous: boolean }> } }} [options]
 */
export function initSpatialView(supabase, options = {}) {
  const authOpts = options.auth
  const form = document.getElementById('spatial-todo-form')
  const input = document.getElementById('spatial-todo-input')
  const errorEl = document.getElementById('spatial-error')
  const stageEl = document.getElementById('spatial-stage')
  const footerEl = document.getElementById('spatial-auth-footer')
  const pasteDrawerBackdrop = document.getElementById('spatial-paste-drawer-backdrop')
  const pasteDrawer = document.getElementById('spatial-paste-drawer')
  const pasteDrawerTextarea = document.getElementById('spatial-paste-drawer-textarea')
  const pasteDrawerEmpty = document.getElementById('spatial-paste-drawer-empty')
  const pasteDrawerCreate = document.getElementById('spatial-paste-drawer-create')
  const pasteDrawerCancel = document.getElementById('spatial-paste-drawer-cancel')
  const undoBarEl = document.getElementById('spatial-undo-bar')
  const undoTimerEl = document.getElementById('spatial-undo-timer')
  const undoMsgEl = document.getElementById('spatial-undo-msg')
  const undoBtnEl = document.getElementById('spatial-undo-btn')
  const searchInputEl = document.getElementById('spatial-search-input')
  const filterChips = document.querySelectorAll('.spatial-filter-chip')
  const clearDoneBtn = document.getElementById('spatial-clear-done-btn')
  const emptyStateEl = document.getElementById('spatial-empty-state')
  const emptyStateTextEl = document.getElementById('spatial-empty-state-text')
  const moreBtn = document.getElementById('spatial-more-btn')
  const moreMenu = document.getElementById('spatial-more-menu')
  const appEl = document.getElementById('app')
  const cleanupToggleEl = document.getElementById('spatial-cleanup-toggle')
  const gravityLabelEl = document.getElementById('spatial-gravity-label')
  const gravityHintEl = document.getElementById('spatial-gravity-hint')
  const floatingTopEl = document.querySelector('.spatial-floating-top')

  let engine = null
  let floor = null
  let leftWall = null
  let rightWall = null
  let topWall = null
  let animationId = null
  /** @type {Map<string, { body: Matter.Body | null, element: HTMLElement, task: { id: string, text: string, done: boolean } }>} */
  const cardMap = new Map()
  const state = { tasks: [], error: null, loading: true }
  /** @type {{ task: { id: string, text: string, done: boolean }, timerId: number } | null} */
  let pendingDelete = null
  /** @type {{ tasks: Array<{ id: string, text: string, done: boolean }>, timerId: number } | null} */
  let pendingBulkClear = null
  /** @type {FilterMode} */
  let filterMode = 'all'
  /** @type {boolean} */
  let cleanupMode =
    typeof localStorage !== 'undefined' && localStorage.getItem(CLEANUP_STORAGE_KEY) === 'true'
  /** @type {Map<string, { x: number, y: number }>} Stored positions for cleanup mode (persists across filter changes) */
  const cleanupPositions = new Map()
  function getStageRect() {
    return stageEl.getBoundingClientRect()
  }

  /** Y coordinate (in stage space) for the top of the footer – cards must not go below this. */
  function getFooterTopY() {
    if (!footerEl) return getStageRect().height - FLOOR_HEIGHT
    const stageRect = getStageRect()
    const footerRect = footerEl.getBoundingClientRect()
    return footerRect.top - stageRect.top
  }

  /** Y coordinate (in stage space) for the bottom of the toolbar – cards must not go above this. */
  function getToolbarBottomY() {
    if (!floatingTopEl) return GRID_GAP
    const stageRect = getStageRect()
    const toolbarRect = floatingTopEl.getBoundingClientRect()
    return toolbarRect.bottom - stageRect.top + GRID_GAP
  }

  function showError(message) {
    state.error = message
    if (errorEl) {
      errorEl.textContent = message || ''
      errorEl.hidden = !message
    }
  }

  function getVisibleTasks() {
    const searchQuery = (searchInputEl?.value ?? '').trim().toLowerCase()
    return state.tasks.filter((task) => {
      const matchesFilter =
        filterMode === 'all' ||
        (filterMode === 'todo' && !task.done) ||
        (filterMode === 'done' && task.done)
      const matchesSearch = !searchQuery || task.text.toLowerCase().includes(searchQuery)
      return matchesFilter && matchesSearch
    })
  }

  function getVisibleTaskIds() {
    const ids = new Set(getVisibleTasks().map((t) => t.id))
    if (pendingDelete) ids.delete(pendingDelete.task.id)
    if (pendingBulkClear) {
      for (const t of pendingBulkClear.tasks) ids.delete(t.id)
    }
    return ids
  }

  function updateFilterHint() {
    if (clearDoneBtn) {
      const visible = getVisibleTasks()
      const show = visible.length > 0
      clearDoneBtn.textContent = COPY.clearVisibleButton
      clearDoneBtn.hidden = !show
    }
    updateFilterCounts()
  }

  function updateFilterCounts() {
    const all = state.tasks.length
    const todo = state.tasks.filter((t) => !t.done).length
    const done = state.tasks.filter((t) => t.done).length
    filterChips.forEach((chip) => {
      const countEl = chip.querySelector('.spatial-filter-count[data-count]')
      if (!countEl) return
      const filter = chip.dataset.filter
      const n = filter === 'all' ? all : filter === 'todo' ? todo : done
      countEl.textContent = String(n)
    })
  }

  function clearVisibleTasks() {
    const visibleTasks = getVisibleTasks()
    if (visibleTasks.length === 0) return

    if (pendingDelete) {
      window.clearTimeout(pendingDelete.timerId)
      apiRemoveTask(pendingDelete.task.id).then(({ ok, error }) => {
        if (!ok && error) showError(error)
      })
      const prevIdx = state.tasks.findIndex((t) => t.id === pendingDelete.task.id)
      if (prevIdx !== -1) state.tasks.splice(prevIdx, 1)
      pendingDelete = null
    }
    if (pendingBulkClear) {
      window.clearTimeout(pendingBulkClear.timerId)
      pendingBulkClear.tasks.forEach((t) => {
        apiRemoveTask(t.id).then(({ ok, error }) => {
          if (!ok && error) showError(error)
        })
        const idx = state.tasks.findIndex((x) => x.id === t.id)
        if (idx !== -1) state.tasks.splice(idx, 1)
      })
      pendingBulkClear = null
    }

    for (const task of visibleTasks) {
      const entry = cardMap.get(task.id)
      if (entry) {
        if (entry.body && engine) World.remove(engine.world, entry.body)
        entry.element.remove()
        cardMap.delete(task.id)
      }
    }

    const timerId = window.setTimeout(() => {
      finalizeBulkClear()
    }, DELETE_UNDO_MS)

    pendingBulkClear = { tasks: visibleTasks, timerId }
    const msg =
      visibleTasks.length === 1
        ? COPY.undoBulkClearOne
        : COPY.undoBulkClearMany.replace('{{count}}', String(visibleTasks.length))
    if (undoMsgEl) undoMsgEl.textContent = msg
    restartUndoTimer()
    if (undoBarEl) undoBarEl.hidden = false

    syncPileToFilter()
    updateFilterHint()
  }

  async function finalizeBulkClear() {
    if (!pendingBulkClear) return
    const tasks = pendingBulkClear.tasks
    window.clearTimeout(pendingBulkClear.timerId)
    pendingBulkClear = null
    hideUndoBar()

    for (const task of tasks) {
      const { ok, error } = await apiRemoveTask(task.id)
      if (!ok && error) showError(error)
      const idx = state.tasks.findIndex((t) => t.id === task.id)
      if (idx !== -1) state.tasks.splice(idx, 1)
    }

    syncPileToFilter()
    updateFilterHint()
  }

  function updateEmptyState() {
    if (!emptyStateEl || !emptyStateTextEl) return
    const visible = getVisibleTasks()
    const searchQuery = (searchInputEl?.value ?? '').trim()
    const hasSearch = searchQuery.length > 0

    if (state.loading || visible.length > 0) {
      emptyStateEl.hidden = true
      return
    }

    const isInteractiveEmpty = !hasSearch && filterMode === 'all'

    if (isInteractiveEmpty) {
      emptyStateTextEl.textContent = COPY.emptyAllPrefix
    } else {
      let text
      if (hasSearch) {
        text = COPY.emptySearch.replace('{{query}}', searchQuery)
      } else if (filterMode === 'todo') {
        text = COPY.emptyTodo
      } else {
        text = COPY.emptyDone
      }
      emptyStateTextEl.textContent = text
    }

    emptyStateEl.hidden = false
  }

  function initPhysics() {
    const rect = getStageRect()
    const footerTopY = getFooterTopY()
    engine = Engine.create({
      gravity: { x: 0, y: GRAVITY }
    })
    engine.world.bounds = { min: { x: 0, y: 0 }, max: { x: rect.width, y: rect.height } }

    const floorX = rect.width / 2
    const floorY = footerTopY + FLOOR_HEIGHT / 2
    floor = Bodies.rectangle(floorX, floorY, Math.max(rect.width + 2, 4000), FLOOR_HEIGHT, {
      isStatic: true,
      restitution: 0.55,
      friction: 0.2,
      render: { visible: false }
    })
    World.add(engine.world, floor)

    const wallThick = 20
    const wallHeight = Math.max(rect.height, footerTopY) + FLOOR_HEIGHT + 100
    const wallCenterY = wallHeight / 2
    leftWall = Bodies.rectangle(-wallThick / 2, wallCenterY, wallThick, wallHeight, {
      isStatic: true,
      render: { visible: false }
    })
    rightWall = Bodies.rectangle(rect.width + wallThick / 2, wallCenterY, wallThick, wallHeight, {
      isStatic: true,
      render: { visible: false }
    })
    topWall = Bodies.rectangle(rect.width / 2, -wallThick / 2, rect.width + 100, wallThick, {
      isStatic: true,
      render: { visible: false }
    })
    World.add(engine.world, [leftWall, rightWall, topWall])
  }

  function createCardElement(task) {
    const card = document.createElement('article')
    card.className = 'spatial-card'
    if (task.done) card.classList.add('spatial-card--done')
    card.dataset.id = task.id
    card.style.minHeight = CARD_MIN_HEIGHT + 'px'

    const inner = document.createElement('div')
    inner.className = 'spatial-card-inner'

    const handle = document.createElement('div')
    handle.className = 'spatial-card-handle'
    handle.setAttribute('aria-hidden', 'true')
    handle.textContent = '⋮⋮'

    const checkboxWrap = document.createElement('div')
    checkboxWrap.className = 'spatial-card-checkbox-wrap'
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.className = 'spatial-card-checkbox'
    checkbox.checked = task.done
    checkbox.setAttribute('aria-label', `Mark "${task.text}" as ${task.done ? 'to do' : 'done'}`)
    checkbox.addEventListener('change', () => toggleDone(task.id))
    checkboxWrap.appendChild(checkbox)

    const controls = document.createElement('div')
    controls.className = 'spatial-card-controls'

    const textSpan = document.createElement('span')
    textSpan.className = 'spatial-card-text'
    textSpan.textContent = task.text
    textSpan.setAttribute('role', 'button')
    textSpan.setAttribute('tabindex', '0')
    textSpan.setAttribute('aria-label', `Edit task: ${task.text}`)
    const openEdit = () => startEdit(card, task)
    textSpan.addEventListener('click', openEdit)
    textSpan.addEventListener('dblclick', openEdit)
    textSpan.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        openEdit()
      }
    })

    const deleteBtn = document.createElement('button')
    deleteBtn.type = 'button'
    deleteBtn.className = 'spatial-card-delete'
    deleteBtn.textContent = '×'
    deleteBtn.setAttribute('aria-label', `Delete "${task.text}"`)
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      queueDeleteCard(task.id)
    })

    controls.appendChild(textSpan)
    inner.appendChild(handle)
    inner.appendChild(checkboxWrap)
    inner.appendChild(controls)
    inner.appendChild(deleteBtn)
    card.appendChild(inner)
    return card
  }

  function toggleDone(id) {
    const task = state.tasks.find((t) => t.id === id)
    if (!task) return
    const newDone = !task.done
    apiSetDone(id, newDone).then(({ ok, error }) => {
      if (!ok && error) showError(error)
    })
    task.done = newDone
    const entry = cardMap.get(id)
    if (entry) {
      entry.task.done = newDone
      entry.element.classList.toggle('spatial-card--done', newDone)
      const checkbox = entry.element.querySelector('.spatial-card-checkbox')
      if (checkbox) checkbox.checked = newDone
    }
    syncPileToFilter()
  }

  function createCardBody(x, y, width, height) {
    const body = Bodies.rectangle(x, y, width, height, {
      restitution: 0.55,
      friction: 0.3,
      frictionAir: 0.01,
      density: 0.002
    })
    body.cardWidth = width
    body.cardHeight = height
    return body
  }

  function getBodyHalfSize(body) {
    const w = body.cardWidth ?? (body.bounds ? body.bounds.max.x - body.bounds.min.x : CARD_MAX_WIDTH)
    const h = body.cardHeight ?? (body.bounds ? body.bounds.max.y - body.bounds.min.y : CARD_MIN_HEIGHT)
    return { halfW: w / 2, halfH: h / 2 }
  }

  /** Sync physics body size to match the card element after content changes (e.g. edit). */
  function syncBodyToElementSize(element, body) {
    const w = element.offsetWidth
    const h = element.offsetHeight
    const newW = Math.max(CARD_MIN_WIDTH, Math.min(CARD_MAX_WIDTH, w))
    const newH = Math.max(CARD_MIN_HEIGHT, h)
    const oldW = body.cardWidth ?? CARD_MAX_WIDTH
    const oldH = body.cardHeight ?? CARD_MIN_HEIGHT
    if (Math.abs(newW - oldW) > 0.5 || Math.abs(newH - oldH) > 0.5) {
      Body.scale(body, newW / oldW, newH / oldH)
      body.cardWidth = newW
      body.cardHeight = newH
      clampBodyToStage(body)
    }
  }

  /** Vertical extent from body center to bottom edge of rotated rectangle. */
  function getBodyBottomExtent(body) {
    const { halfW, halfH } = getBodyHalfSize(body)
    const a = Math.abs(body.angle ?? 0)
    return halfH * Math.abs(Math.cos(a)) + halfW * Math.abs(Math.sin(a))
  }

  function addCardToWorld(task, x, y) {
    const element = createCardElement(task)
    element.style.visibility = 'hidden'
    element.style.position = 'absolute'
    element.style.left = '0'
    element.style.top = '0'
    stageEl.appendChild(element)
    const w = element.offsetWidth
    const h = element.offsetHeight
    element.style.visibility = ''
    element.style.left = ''
    element.style.top = ''

    const bodyW = Math.max(CARD_MIN_WIDTH, Math.min(CARD_MAX_WIDTH, w))
    const bodyH = Math.max(CARD_MIN_HEIGHT, h)
    const body = createCardBody(x, y, bodyW, bodyH)
    World.add(engine.world, body)
    element.style.left = body.position.x + 'px'
    element.style.top = body.position.y + 'px'
    element.style.transform = 'translate(-50%, -50%) rotate(0rad)'
    cardMap.set(task.id, { body, element, task })
    setupDrag(element, body, task.id)
  }

  function addCardToGrid(task) {
    const element = createCardElement(task)
    element.style.position = 'absolute'
    element.style.left = '0'
    element.style.top = '0'
    element.style.transform = 'translate(-50%, -50%)'
    stageEl.appendChild(element)
    cardMap.set(task.id, { body: null, element, task })
    setupCleanupDrag(element, task.id)
  }

  /** Check if two axis-aligned boxes overlap (with optional gap). */
  function boxesOverlap(cx1, cy1, w1, h1, cx2, cy2, w2, h2, gap = 0) {
    const margin = gap / 2
    return (
      cx1 - w1 / 2 - margin < cx2 + w2 / 2 + margin &&
      cx1 + w1 / 2 + margin > cx2 - w2 / 2 - margin &&
      cy1 - h1 / 2 - margin < cy2 + h2 / 2 + margin &&
      cy1 + h1 / 2 + margin > cy2 - h2 / 2 - margin
    )
  }

  /** Cloud layout: place cards in spirals, grouping done vs todo. Preserves positions across filter changes. */
  function layoutGridInCleanupMode() {
    const rect = getStageRect()
    const toolbarBottom = getToolbarBottomY()
    const footerTopY = getFooterTopY()
    const maxY = footerTopY - CARD_MIN_HEIGHT
    const centerX = rect.width / 2
    const centerY = (toolbarBottom + maxY) / 2
    const padding = GRID_GAP
    const clusterOffset = Math.min(100, rect.width * 0.15)
    const todoClusterX = centerX - clusterOffset
    const doneClusterX = centerX + clusterOffset

    const visibleTasks = getVisibleTasks()
    const visibleIds = getVisibleTaskIds()
    const allEntries = visibleTasks
      .filter((t) => visibleIds.has(t.id))
      .map((t) => cardMap.get(t.id))
      .filter((e) => e && e.body === null)

    const todoEntries = allEntries.filter((e) => !e.task.done)
    const doneEntries = allEntries.filter((e) => e.task.done)

    const goldenAngle = (2 * Math.PI * 137.5) / 360
    const radiusStep = 40
    const placed = []

    function placeGroup(entries, clusterX) {
      entries.forEach(({ element, task }, i) => {
        const taskId = task.id
        const w = element.offsetWidth
        const h = element.offsetHeight
        const halfW = w / 2
        const halfH = h / 2

        const stored = cleanupPositions.get(taskId)
        let cx, cy

        if (stored) {
          cx = Math.max(halfW + padding, Math.min(rect.width - halfW - padding, stored.x))
          cy = Math.max(toolbarBottom + halfH, Math.min(maxY - halfH, stored.y))
        } else {
          let radius = padding + Math.sqrt(i + 1) * radiusStep
          const angle = i * goldenAngle
          const maxAttempts = 50

          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const jitter = attempt === 0 ? (0.9 + ((i * 17) % 11) / 55) : 1
            const r = radius * jitter
            cx = clusterX + Math.cos(angle + attempt * 0.1) * r
            cy = centerY + Math.sin(angle + attempt * 0.1) * r

            cx = Math.max(halfW + padding, Math.min(rect.width - halfW - padding, cx))
            cy = Math.max(toolbarBottom + halfH, Math.min(maxY - halfH, cy))

            const overlaps = placed.some((p) =>
              boxesOverlap(cx, cy, w, h, p.cx, p.cy, p.w, p.h, GRID_GAP)
            )
            if (!overlaps) break
            radius += radiusStep * 0.6
          }
          cleanupPositions.set(taskId, { x: cx, y: cy })
        }

        placed.push({ cx, cy, w, h })
        element.style.left = cx + 'px'
        element.style.top = cy + 'px'
        element.style.transform = 'translate(-50%, -50%)'
      })
    }

    placeGroup(todoEntries, todoClusterX)
    placeGroup(doneEntries, doneClusterX)
  }

  function setupCleanupDrag(cardEl, taskId) {
    const handleEl = cardEl.querySelector('.spatial-card-handle')
    if (!handleEl) return
    let dragging = false
    let offsetX = 0
    let offsetY = 0

    function getStageCoords(clientX, clientY) {
      const rect = getStageRect()
      return { x: clientX - rect.left, y: clientY - rect.top }
    }

    function onPointerDown(e) {
      if (e.target !== handleEl && !handleEl.contains(e.target)) return
      e.preventDefault()
      const rect = getStageRect()
      const left = parseFloat(cardEl.style.left) || 0
      const top = parseFloat(cardEl.style.top) || 0
      const coords = getStageCoords(e.clientX, e.clientY)
      offsetX = coords.x - left
      offsetY = coords.y - top
      dragging = true
      document.addEventListener('pointermove', onPointerMove)
      document.addEventListener('pointerup', onPointerUp)
      document.addEventListener('pointercancel', onPointerUp)
    }

    function onPointerMove(e) {
      if (!dragging) return
      const coords = getStageCoords(e.clientX, e.clientY)
      const rect = getStageRect()
      const toolbarBottom = getToolbarBottomY()
      const footerTopY = getFooterTopY()
      const halfW = cardEl.offsetWidth / 2
      const halfH = cardEl.offsetHeight / 2
      const minY = toolbarBottom + halfH
      const maxY = footerTopY - halfH
      const x = Math.max(halfW, Math.min(rect.width - halfW, coords.x - offsetX))
      const y = Math.max(minY, Math.min(maxY, coords.y - offsetY))
      cardEl.style.left = x + 'px'
      cardEl.style.top = y + 'px'
    }

    function onPointerUp() {
      if (!dragging) return
      dragging = false
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)
      document.removeEventListener('pointercancel', onPointerUp)
      const x = parseFloat(cardEl.style.left) || 0
      const y = parseFloat(cardEl.style.top) || 0
      cleanupPositions.set(taskId, { x, y })
    }

    handleEl.addEventListener('pointerdown', onPointerDown)
  }

  function applyCleanupMode() {
    if (cleanupMode) {
      for (const [id, entry] of [...cardMap.entries()]) {
        if (entry.body && engine) {
          World.remove(engine.world, entry.body)
          const handleEl = entry.element.querySelector('.spatial-card-handle')
          if (handleEl) {
            const newHandle = handleEl.cloneNode(true)
            handleEl.parentNode?.replaceChild(newHandle, handleEl)
          }
          cardMap.set(id, { body: null, element: entry.element, task: entry.task })
          setupCleanupDrag(entry.element, id)
        }
      }
      layoutGridInCleanupMode()
      if (stageEl) stageEl.dataset.cleanup = 'true'
    } else {
      const rect = getStageRect()
      for (const [id, entry] of [...cardMap.entries()]) {
        if (entry.body === null) {
          const handleEl = entry.element.querySelector('.spatial-card-handle')
          if (handleEl) {
            const newHandle = handleEl.cloneNode(true)
            handleEl.parentNode?.replaceChild(newHandle, handleEl)
          }
          const left = parseFloat(entry.element.style.left) || rect.width / 2
          const top = parseFloat(entry.element.style.top) || SPAWN_Y
          const w = Math.max(CARD_MIN_WIDTH, Math.min(CARD_MAX_WIDTH, entry.element.offsetWidth))
          const h = Math.max(CARD_MIN_HEIGHT, entry.element.offsetHeight)
          const body = createCardBody(left, top, w, h)
          body.cardWidth = w
          body.cardHeight = h
          World.add(engine.world, body)
          cardMap.set(id, { body, element: entry.element, task: entry.task })
          setupDrag(entry.element, body, id)
        }
      }
      if (stageEl) stageEl.removeAttribute('data-cleanup')
    }
    if (cleanupToggleEl) {
      cleanupToggleEl.setAttribute('aria-pressed', String(cleanupMode))
      cleanupToggleEl.setAttribute('aria-label', cleanupMode ? COPY.gravityModeOff : COPY.gravityModeOn)
    }
    if (gravityLabelEl) {
      gravityLabelEl.textContent = cleanupMode ? COPY.gravityModeOff : COPY.gravityModeOn
    }
    if (gravityHintEl) {
      gravityHintEl.hidden = !cleanupMode
      gravityHintEl.textContent = COPY.gravityModeHint
    }
  }

  function setupCleanupToggle() {
    if (!cleanupToggleEl) return
    cleanupToggleEl.setAttribute('aria-pressed', String(cleanupMode))
    cleanupToggleEl.setAttribute('aria-label', cleanupMode ? COPY.gravityModeOff : COPY.gravityModeOn)
    if (gravityLabelEl) {
      gravityLabelEl.textContent = cleanupMode ? COPY.gravityModeOff : COPY.gravityModeOn
    }
    if (gravityHintEl) {
      gravityHintEl.hidden = !cleanupMode
      gravityHintEl.textContent = COPY.gravityModeHint
    }
    cleanupToggleEl.addEventListener('click', () => {
      cleanupMode = !cleanupMode
      localStorage.setItem(CLEANUP_STORAGE_KEY, String(cleanupMode))
      applyCleanupMode()
    })
  }

  function setupDrag(cardEl, body, taskId) {
    const handleEl = cardEl.querySelector('.spatial-card-handle')
    if (!handleEl) return
    let dragging = false
    let offsetX = 0
    let offsetY = 0

    function getWorldCoords(clientX, clientY) {
      const rect = getStageRect()
      return { x: clientX - rect.left, y: clientY - rect.top }
    }

    function clampToStage(x, y) {
      const rect = getStageRect()
      const footerTopY = getFooterTopY()
      const { halfW } = getBodyHalfSize(body)
      const bottomExtent = getBodyBottomExtent(body)
      const maxY = footerTopY - bottomExtent
      return {
        x: Math.max(halfW, Math.min(rect.width - halfW, x)),
        y: Math.max(bottomExtent, Math.min(maxY, y))
      }
    }

    function onPointerDown(e) {
      if (e.target !== handleEl && !handleEl.contains(e.target)) return
      e.preventDefault()
      const coords = getWorldCoords(e.clientX, e.clientY)
      offsetX = coords.x - body.position.x
      offsetY = coords.y - body.position.y
      dragging = true
      Body.setStatic(body, true)
      Body.setAngle(body, 0)
      Body.setAngularVelocity(body, 0)
      document.addEventListener('pointermove', onPointerMove)
      document.addEventListener('pointerup', onPointerUp)
      document.addEventListener('pointercancel', onPointerUp)
    }

    function onPointerMove(e) {
      if (!dragging) return
      const coords = getWorldCoords(e.clientX, e.clientY)
      const clamped = clampToStage(coords.x - offsetX, coords.y - offsetY)
      Body.setPosition(body, clamped)
    }

    function onPointerUp() {
      if (!dragging) return
      dragging = false
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)
      document.removeEventListener('pointercancel', onPointerUp)
      Body.setStatic(body, false)
      Body.setVelocity(body, { x: 0, y: 0 })
    }

    handleEl.addEventListener('pointerdown', onPointerDown)
  }

  function clampBodyToStage(body) {
    const rect = getStageRect()
    const footerTopY = getFooterTopY()
    const { halfW } = getBodyHalfSize(body)
    const bottomExtent = getBodyBottomExtent(body)
    const maxY = footerTopY - bottomExtent
    const x = Math.max(halfW, Math.min(rect.width - halfW, body.position.x))
    // Skip Y clamp when bouncing up – let the bounce play out before constraining
    const y =
      body.velocity.y < -1
        ? body.position.y
        : Math.max(bottomExtent, Math.min(maxY, body.position.y))
    if (x !== body.position.x || y !== body.position.y) {
      Body.setPosition(body, { x, y })
    }
  }

  let syncFrameCount = 0
  function syncBodyToDom() {
    if (cleanupMode) return
    const rect = getStageRect()
    if (rect.width < 10 || rect.height < 10) return
    for (const [, { body, element }] of cardMap) {
      if (!body) continue
      clampBodyToStage(body)
      element.style.left = body.position.x + 'px'
      element.style.top = body.position.y + 'px'
      element.style.transform = `translate(-50%, -50%) rotate(${body.angle}rad)`
      // Stack cards by Y so lower cards (higher Y) appear on top; editing card stays on top via CSS
      if (!element.classList.contains('spatial-card--editing')) {
        element.style.zIndex = String(Math.round(body.position.y))
      }
    }
    // #region agent log
    syncFrameCount++
    if (cardMap.size > 0 && syncFrameCount % 120 === 1) {
      const rect = getStageRect()
      const [, entry] = [...cardMap.entries()][0]
      if (entry) {
        const elRect = entry.element.getBoundingClientRect()
        const expectedCenterX = rect.left + entry.body.position.x
        const expectedCenterY = rect.top + entry.body.position.y
        const actualCenterX = elRect.left + elRect.width / 2
        const actualCenterY = elRect.top + elRect.height / 2
        const dx = Math.abs(actualCenterX - expectedCenterX)
        const dy = Math.abs(actualCenterY - expectedCenterY)
        if (dx > 5 || dy > 5) {
          const payload = { sessionId: '41cc86', location: 'spatial-view.js:syncBodyToDom', message: 'Body/DOM mismatch', data: { expectedCenterX, expectedCenterY, actualCenterX, actualCenterY, dx, dy, bodyPos: entry.body.position, stageRect: { left: rect.left, top: rect.top } }, timestamp: Date.now(), hypothesisId: 'C' }
          fetch('http://127.0.0.1:7308/ingest/c142f65c-2a15-4e36-a402-a64aa2d8e75a', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '41cc86' }, body: JSON.stringify(payload) }).catch(() => {})
          console.warn('[debug] Body/DOM mismatch', payload)
        }
      }
    }
    // #endregion
  }

  /** Sync the pile to the current filter: remove filtered-out cards, add filtered-in cards. */
  function syncPileToFilter() {
    const visibleIds = getVisibleTaskIds()
    const rect = getStageRect()
    const centerX = rect.width / 2

    // Remove cards that no longer match the filter
    for (const [id, entry] of [...cardMap.entries()]) {
      if (!visibleIds.has(id)) {
        if (entry.body && engine) World.remove(engine.world, entry.body)
        entry.element.remove()
        cardMap.delete(id)
      }
    }

    // Add cards that should be visible but aren't in the pile
    const toAdd = state.tasks.filter((t) => visibleIds.has(t.id) && !cardMap.has(t.id))
    if (cleanupMode) {
      toAdd.forEach((task) => addCardToGrid(task))
      layoutGridInCleanupMode()
    } else if (engine) {
      toAdd.forEach((task, i) => {
        const x = centerX + (Math.random() - 0.5) * 60
        setTimeout(() => addCardToWorld(task, x, SPAWN_Y), i * 80)
      })
    }

    updateEmptyState()
    updateFilterHint()
  }

  /** Max delta (ms) to prevent physics overshoot when tab was hidden and rAF throttled. Matter.js recommends ≤16.667ms. */
  const MAX_DELTA_MS = 1000 / 60
  let lastUpdateTime = 0

  function runLoop(now) {
    if (document.visibilityState === 'hidden') {
      animationId = requestAnimationFrame(runLoop)
      return
    }
    const t = typeof now === 'number' ? now : performance.now()
    const rawDelta = lastUpdateTime ? t - lastUpdateTime : 0
    const delta = lastUpdateTime ? Math.min(rawDelta, MAX_DELTA_MS) : MAX_DELTA_MS
    // #region agent log
    if (rawDelta > 80) {
      const rect = getStageRect()
      const footerTopY = getFooterTopY()
      const samplePos = cardMap.size ? [...cardMap.entries()].slice(0,2).map(([,e])=>({x:e.body.position.x,y:e.body.position.y})) : []
      fetch('http://127.0.0.1:7308/ingest/c142f65c-2a15-4e36-a402-a64aa2d8e75a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'41cc86'},body:JSON.stringify({sessionId:'41cc86',location:'spatial-view.js:runLoop',message:'Large delta',data:{rawDelta,clampedDelta:delta,visible:document.visibilityState,cardCount:cardMap.size,stageH:rect.height,footerTopY,samplePos},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
    }
    // #endregion
    lastUpdateTime = t
    if (!cleanupMode && engine) Engine.update(engine, delta)
    syncBodyToDom()
    animationId = requestAnimationFrame(runLoop)
  }

  async function finalizeDelete(id) {
    if (!pendingDelete || pendingDelete.task.id !== id) return
    window.clearTimeout(pendingDelete.timerId)
    pendingDelete = null
    hideUndoBar()
    const { ok, error } = await apiRemoveTask(id)
    if (!ok && error) showError(error)
    const idx = state.tasks.findIndex((t) => t.id === id)
    if (idx !== -1) state.tasks.splice(idx, 1)
    syncPileToFilter()
  }

  function hideUndoBar() {
    if (undoBarEl) undoBarEl.hidden = true
  }

  function restartUndoTimer() {
    if (!undoTimerEl) return
    undoTimerEl.style.animation = 'none'
    undoTimerEl.offsetHeight // force reflow
    undoTimerEl.style.animation = 'spatial-undo-shrink 5s linear forwards'
  }

  function showUndoBar(taskText) {
    if (undoMsgEl) undoMsgEl.textContent = COPY.undoSingleDelete.replace('{{task}}', taskText)
    restartUndoTimer()
    if (undoBarEl) undoBarEl.hidden = false
  }

  function queueDeleteCard(id) {
    const entry = cardMap.get(id)
    if (!entry) return
    const task = entry.task

    if (pendingDelete) {
      window.clearTimeout(pendingDelete.timerId)
      apiRemoveTask(pendingDelete.task.id).then(({ ok, error }) => {
        if (!ok && error) showError(error)
      })
      const prevIdx = state.tasks.findIndex((t) => t.id === pendingDelete.task.id)
      if (prevIdx !== -1) state.tasks.splice(prevIdx, 1)
    }
    if (pendingBulkClear) {
      window.clearTimeout(pendingBulkClear.timerId)
      pendingBulkClear.tasks.forEach((t) => {
        apiRemoveTask(t.id).then(({ ok, error }) => {
          if (!ok && error) showError(error)
        })
        const idx = state.tasks.findIndex((x) => x.id === t.id)
        if (idx !== -1) state.tasks.splice(idx, 1)
      })
      pendingBulkClear = null
    }

    if (entry.body && engine) World.remove(engine.world, entry.body)
    entry.element.remove()
    cardMap.delete(id)

    const timerId = window.setTimeout(() => {
      finalizeDelete(id)
    }, DELETE_UNDO_MS)

    pendingDelete = { task, timerId }
    showUndoBar(task.text)
  }

  function handleUndoClick() {
    if (pendingDelete) {
      const { timerId } = pendingDelete
      window.clearTimeout(timerId)
      pendingDelete = null
      hideUndoBar()
      syncPileToFilter()
      return
    }
    if (pendingBulkClear) {
      window.clearTimeout(pendingBulkClear.timerId)
      pendingBulkClear = null
      hideUndoBar()
      syncPileToFilter()
      updateFilterHint()
    }
  }

  function startEdit(cardEl, task) {
    const entry = cardMap.get(task.id)
    if (!entry) return
    const { body } = entry

    const textSpan = cardEl.querySelector('.spatial-card-text')
    if (!textSpan) return
    const controls = textSpan.parentNode
    if (!controls) return

    const savedX = body ? body.position.x : parseFloat(cardEl.style.left) || 0
    const savedY = body ? body.position.y : parseFloat(cardEl.style.top) || 0
    if (body) {
      Body.setStatic(body, true)
      Body.setAngle(body, 0)
    }

    cardEl.classList.add('spatial-card--editing')

    const exitEditMode = () => {
      cardEl.classList.remove('spatial-card--editing')
      if (body) {
        Body.setPosition(body, { x: savedX, y: savedY })
        Body.setStatic(body, false)
      } else {
        cardEl.style.left = savedX + 'px'
        cardEl.style.top = savedY + 'px'
      }
    }

    const inputWrap = document.createElement('div')
    inputWrap.className = 'spatial-card-edit-input-wrap spatial-card-edit-input-wrap--multiline'
    const editField = document.createElement('textarea')
    editField.className = 'spatial-card-edit'
    editField.value = task.text
    editField.setAttribute('aria-label', 'Edit task')
    inputWrap.appendChild(editField)

    const autoResize = () => {
      editField.style.height = 'auto'
      editField.style.height = editField.scrollHeight + 'px'
    }
    editField.addEventListener('input', autoResize)
    requestAnimationFrame(() => autoResize(editField))

    const editWrap = document.createElement('div')
    editWrap.className = 'spatial-card-edit-wrap'
    editWrap.appendChild(inputWrap)

    controls.replaceChild(editWrap, textSpan)

    const finishEdit = () => {
      const text = editField.value.trim()
      controls.replaceChild(textSpan, editWrap)
      editField.removeEventListener('blur', finishEdit)
      editField.removeEventListener('input', autoResize)
      editField.removeEventListener('keydown', keydown)
      exitEditMode()
      if (text) {
        apiSetTaskText(task.id, text).then(({ ok }) => {
          if (ok) {
            task.text = text
            const entry = cardMap.get(task.id)
            if (entry) entry.task.text = text
          }
          textSpan.textContent = task.text
          if (ok) {
            const entry = cardMap.get(task.id)
            if (entry?.body) {
              requestAnimationFrame(() => {
                syncBodyToElementSize(entry.element, entry.body)
              })
            } else if (cleanupMode && entry) {
              requestAnimationFrame(() => layoutGridInCleanupMode())
            }
          }
        })
      } else {
        textSpan.textContent = task.text
      }
    }

    const keydown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        editField.value = task.text
        finishEdit()
        return
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        e.stopPropagation()
        finishEdit()
      }
    }

    editField.addEventListener('blur', finishEdit)
    editField.addEventListener('keydown', keydown)
    editField.focus()
  }

  async function onAddTask(text) {
    const { data: task, error } = await apiAddTask(text)
    if (error) {
      showError(error)
      return
    }
    if (!task) return
    state.tasks.push(task)
    syncPileToFilter()
  }

  function openPasteDrawer() {
    pasteDrawerBackdrop.hidden = false
    pasteDrawer.hidden = false
    pasteDrawerBackdrop.setAttribute('aria-hidden', 'false')
    pasteDrawer.setAttribute('aria-hidden', 'false')
    pasteDrawerTextarea.value = ''
    if (pasteDrawerEmpty) pasteDrawerEmpty.hidden = true
    document.body.addEventListener('keydown', onDrawerKeydown)
    requestAnimationFrame(() => {
      pasteDrawerBackdrop.classList.add('is-open')
      pasteDrawer.classList.add('is-open')
      pasteDrawerTextarea.focus()
    })
  }

  function closePasteDrawer() {
    pasteDrawerBackdrop.classList.remove('is-open')
    pasteDrawer.classList.remove('is-open')
    const onTransitionEnd = () => {
      pasteDrawer.removeEventListener('transitionend', onTransitionEnd)
      pasteDrawerBackdrop.hidden = true
      pasteDrawer.hidden = true
      pasteDrawerBackdrop.setAttribute('aria-hidden', 'true')
      pasteDrawer.setAttribute('aria-hidden', 'true')
      document.body.removeEventListener('keydown', onDrawerKeydown)
    }
    pasteDrawer.addEventListener('transitionend', onTransitionEnd)
  }

  function onDrawerKeydown(e) {
    if (e.key !== 'Escape') return
    e.preventDefault()
    closePasteDrawer()
  }

  function getDrawerFocusables() {
    return [...pasteDrawer.querySelectorAll(DRAWER_FOCUSABLE)].filter(
      (el) => !el.hidden && el.getAttribute('tabindex') !== '-1'
    )
  }

  function trapDrawerFocus(e) {
    if (e.key !== 'Tab') return
    const focusables = getDrawerFocusables()
    if (focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  async function onCreateCardsFromPaste() {
    const raw = pasteDrawerTextarea.value
    const items = parsePastedList(raw)
    if (items.length === 0) {
      if (pasteDrawerEmpty) {
        pasteDrawerEmpty.hidden = false
        pasteDrawerEmpty.textContent = COPY.pasteDrawerEmpty
      }
      return
    }
    closePasteDrawer()
    const rect = getStageRect()
    const centerX = rect.width / 2
    for (let i = 0; i < items.length; i++) {
      const { data: task, error } = await apiAddTask(items[i])
      if (error) {
        showError(error)
        continue
      }
      if (!task) continue
      state.tasks.push(task)
      if (cleanupMode) {
        addCardToGrid(task)
      } else {
        const x = centerX + (Math.random() - 0.5) * 60
        setTimeout(() => addCardToWorld(task, x, SPAWN_Y), i * 120)
      }
    }
    if (cleanupMode) layoutGridInCleanupMode()
    updateEmptyState()
    updateFilterHint()
  }

  function setFilterMode(mode) {
    filterMode = mode
    filterChips.forEach((chip) => {
      const chipFilter = chip.dataset.filter
      chip.classList.toggle('spatial-filter-chip--active', chipFilter === mode)
    })
    updateFilterHint()
    syncPileToFilter()
  }

  function setupFilters() {
    updateFilterHint()
    filterChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const mode = chip.dataset.filter
        setFilterMode(/** @type {FilterMode} */ (mode))
      })
    })
    if (clearDoneBtn) {
      clearDoneBtn.addEventListener('click', () => clearVisibleTasks())
    }
    const searchClearBtn = document.getElementById('spatial-search-clear')
    if (searchInputEl) {
      searchInputEl.addEventListener('input', () => {
        if (searchClearBtn) searchClearBtn.hidden = !searchInputEl.value.trim()
        syncPileToFilter()
      })
    }
    if (searchClearBtn) {
      searchClearBtn.addEventListener('click', () => {
        if (searchInputEl) {
          searchInputEl.value = ''
          searchInputEl.focus()
          searchClearBtn.hidden = true
          syncPileToFilter()
        }
      })
    }
  }

  const SIGN_IN_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>'
  const SIGN_OUT_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>'

  async function refreshMoreMenuAuth() {
    const authSection = moreMenu?.querySelector('#spatial-more-auth')
    const authBtn = moreMenu?.querySelector('#spatial-more-auth-btn')
    if (!authSection || !authBtn || !authOpts || !supabase) return
    const { user, isAnonymous } = await authOpts.getAuthState()
    const isSignedIn = !!user?.email && !isAnonymous
    authSection.hidden = false
    authBtn.dataset.action = isSignedIn ? 'signout' : 'signin'
    authBtn.setAttribute('aria-label', isSignedIn ? 'Sign out' : 'Sign in or create account')
    authBtn.querySelector('.spatial-more-item-icon').innerHTML = isSignedIn ? SIGN_OUT_ICON : SIGN_IN_ICON
    authBtn.querySelector('.spatial-more-item-text').textContent = isSignedIn ? COPY.moreSignOut : COPY.moreSignIn
  }

  function setupMoreMenu() {
    if (!moreBtn || !moreMenu) return

    // Populate COPY labels
    moreMenu.querySelectorAll('[data-copy]').forEach((el) => {
      const key = el.dataset.copy
      if (key && COPY[key]) el.textContent = COPY[key]
    })

    // Account section: single button (Sign in or Sign out) based on auth state
    if (authOpts && supabase) {
      refreshMoreMenuAuth()
    }

    // Sync theme pill active state
    const currentTheme = getTheme()
    moreMenu.querySelectorAll('.spatial-more-theme').forEach((btn) => {
      btn.classList.toggle('spatial-more-theme--active', btn.dataset.theme === currentTheme)
    })

    // Restore background preference (migrate old values to warm)
    const VALID_THEMES = ['warm', 'sand', 'lavender', 'sage']
    const savedBg = localStorage.getItem('spatial-bg')
    const bg = savedBg && VALID_THEMES.includes(savedBg) ? savedBg : 'warm'
    if (appEl) {
      appEl.dataset.bg = bg
      moreMenu.querySelectorAll('.spatial-more-color').forEach((btn) => {
        btn.classList.toggle('spatial-more-color--active', btn.dataset.color === bg)
      })
    }
    if (bg !== savedBg) localStorage.setItem('spatial-bg', bg)

    moreBtn.addEventListener('click', async (e) => {
      e.preventDefault()
      e.stopPropagation()
      const isOpen = !moreMenu.hidden
      moreMenu.hidden = isOpen
      moreBtn.setAttribute('aria-expanded', String(!isOpen))
      if (!isOpen) await refreshMoreMenuAuth()
    })
    document.addEventListener('click', () => {
      moreMenu.hidden = true
      moreBtn?.setAttribute('aria-expanded', 'false')
    })
    moreMenu.addEventListener('click', (e) => e.stopPropagation())
    moreMenu.querySelectorAll('.spatial-more-item').forEach((item) => {
      item.addEventListener('click', async () => {
        const action = item.dataset.action
        moreMenu.hidden = true
        moreBtn?.setAttribute('aria-expanded', 'false')
        if (action === 'signin') authOpts?.openAuthModal()
        if (action === 'signout') await authOpts?.signOut()
      })
    })
    moreMenu.querySelectorAll('.spatial-more-theme').forEach((btn) => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme
        if (!theme) return
        setTheme(/** @type {'light' | 'dark' | 'system'} */ (theme))
        moreMenu.querySelectorAll('.spatial-more-theme').forEach((b) => {
          b.classList.toggle('spatial-more-theme--active', b.dataset.theme === theme)
        })
      })
    })
    moreMenu.querySelectorAll('.spatial-more-color').forEach((btn) => {
      btn.addEventListener('click', () => {
        const color = btn.dataset.color
        if (!color || !appEl) return
        appEl.dataset.bg = color
        localStorage.setItem('spatial-bg', color)
        moreMenu.querySelectorAll('.spatial-more-color').forEach((b) => {
          b.classList.toggle('spatial-more-color--active', b.dataset.color === color)
        })
      })
    })
  }

  /** Prevents duplicate loads/seeds when init and auth both trigger loadInitialTasks. */
  let loadPromise = null

  async function loadInitialTasks() {
    const previous = loadPromise
    loadPromise = (async () => {
      if (previous) await previous
      if (engine) {
        for (const [, { body, element }] of cardMap) {
          if (body) World.remove(engine.world, body)
          element.remove()
        }
        cardMap.clear()
        initPhysics()
      }
      state.loading = true
      let { data, error } = await apiLoadTasks()
      if (error) {
        showError(error)
        state.loading = false
        return
      }
      state.tasks = data || []
      state.loading = false
      syncPileToFilter()
      if (cleanupMode) applyCleanupMode()
    })()
    await loadPromise
  }

  function handleResize() {
    const rect = getStageRect()
    const footerTopY = getFooterTopY()
    // #region agent log
    if (cardMap.size > 0 && (rect.width < 10 || rect.height < 10)) {
      const payload = { sessionId: '41cc86', location: 'spatial-view.js:handleResize', message: 'Suspicious stage rect', data: { stageW: rect.width, stageH: rect.height, footerTopY, cardCount: cardMap.size }, timestamp: Date.now(), hypothesisId: 'D' }
      fetch('http://127.0.0.1:7308/ingest/c142f65c-2a15-4e36-a402-a64aa2d8e75a', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '41cc86' }, body: JSON.stringify(payload) }).catch(() => {})
      console.warn('[debug] Suspicious stage rect on resize', payload)
    }
    // #endregion
    const wallHeight = Math.max(rect.height, footerTopY) + FLOOR_HEIGHT + 100
    const wallCenterY = wallHeight / 2
    if (floor) {
      Body.setPosition(floor, { x: rect.width / 2, y: footerTopY + FLOOR_HEIGHT / 2 })
    }
    if (leftWall) Body.setPosition(leftWall, { x: -10, y: wallCenterY })
    if (rightWall) Body.setPosition(rightWall, { x: rect.width + 10, y: wallCenterY })
    if (topWall) Body.setPosition(topWall, { x: rect.width / 2, y: -10 })
    engine.world.bounds = { min: { x: 0, y: 0 }, max: { x: rect.width, y: rect.height } }
    if (rect.width >= 10 && rect.height >= 10 && cardMap.size > 0) {
      if (cleanupMode) {
        layoutGridInCleanupMode()
      } else {
        syncBodyToDom()
      }
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const text = input.value.trim()
    if (text) {
      onAddTask(text)
      input.value = ''
    }
    input.focus()
  })

  if (pasteDrawerBackdrop) {
    pasteDrawerBackdrop.addEventListener('click', () => closePasteDrawer())
  }
  if (pasteDrawerCancel) {
    pasteDrawerCancel.addEventListener('click', () => closePasteDrawer())
  }
  if (pasteDrawerCreate) {
    pasteDrawerCreate.addEventListener('click', () => onCreateCardsFromPaste())
  }
  if (pasteDrawer) {
    pasteDrawer.addEventListener('keydown', trapDrawerFocus)
  }

  if (undoBtnEl) {
    undoBtnEl.addEventListener('click', handleUndoClick)
  }
  setupFilters()
  setupCleanupToggle()
  setupMoreMenu()

  const pasteBtn = document.getElementById('spatial-paste-btn')
  if (pasteBtn) {
    pasteBtn.addEventListener('click', () => openPasteDrawer())
  }

  window.addEventListener('resize', handleResize)

  function onReturnToView() {
    lastUpdateTime = 0
    if (!engine) return
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        handleResize()
        if (!cleanupMode) {
          for (const [, { body }] of cardMap) {
            if (body) clampBodyToStage(body)
          }
          syncBodyToDom()
        }
      })
    })
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') onReturnToView()
  })

  // Update physics bounds when stage resizes (e.g. auth footer content changes on login/logout)
  const resizeObserver = new ResizeObserver(() => {
    if (engine) handleResize()
  })
  resizeObserver.observe(stageEl)

  requestAnimationFrame(() => {
    initPhysics()
    runLoop()
    loadInitialTasks()
    if (!supabase) {
      console.info('[To-Do Spatial] No Supabase – add .env and restart to persist.')
    }
  })

  return { reloadTasks: loadInitialTasks, refreshMoreMenuAuth }
}
