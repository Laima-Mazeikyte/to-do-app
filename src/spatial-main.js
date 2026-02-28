import './style.css'
import './spatial.css'
import Matter from 'matter-js'
import {
  loadTasks as apiLoadTasks,
  addTask as apiAddTask,
  removeTask as apiRemoveTask,
  setDone as apiSetDone,
  setTaskText as apiSetTaskText
} from './todo-api.js'
import { supabase } from './supabase.js'

const Engine = Matter.Engine
const World = Matter.World
const Bodies = Matter.Bodies
const Body = Matter.Body
const Composite = Matter.Composite

const form = document.getElementById('spatial-todo-form')
const input = document.getElementById('spatial-todo-input')
const errorEl = document.getElementById('spatial-error')
const stageEl = document.getElementById('spatial-stage')
const zoneDoneEl = document.getElementById('spatial-zone-done')
const zoneDeleteEl = document.getElementById('spatial-zone-delete')
const doneCountEl = document.getElementById('spatial-done-count')

const CARD_MIN_WIDTH = 100
const CARD_MAX_WIDTH = 320
const CARD_MIN_HEIGHT = 56
const CARD_MAX_HEIGHT = 120
const FLOOR_HEIGHT = 60
const SPAWN_Y = 72
const GRAVITY = 0.8

let engine = null
let floor = null
let leftWall = null
let rightWall = null
let topWall = null
let animationId = null
/** @type {Map<string, { body: Matter.Body, element: HTMLElement, task: { id: string, text: string, done: boolean } }>} */
const cardMap = new Map()
let state = { tasks: [], error: null, loading: true }

function getStageRect() {
  return stageEl.getBoundingClientRect()
}

function showError(message) {
  state.error = message
  if (errorEl) {
    errorEl.textContent = message || ''
    errorEl.hidden = !message
  }
}

function initPhysics() {
  const rect = getStageRect()
  engine = Engine.create({
    gravity: { x: 0, y: GRAVITY }
  })
  engine.world.bounds = { min: { x: 0, y: 0 }, max: { x: rect.width, y: rect.height } }

  const floorX = rect.width / 2
  const floorY = rect.height - FLOOR_HEIGHT / 2
  floor = Bodies.rectangle(floorX, floorY, Math.max(rect.width + 2, 4000), FLOOR_HEIGHT, {
    isStatic: true,
    render: { visible: false }
  })
  World.add(engine.world, floor)

  const wallThick = 20
  leftWall = Bodies.rectangle(-wallThick / 2, rect.height / 2, wallThick, rect.height + 100, {
    isStatic: true,
    render: { visible: false }
  })
  rightWall = Bodies.rectangle(rect.width + wallThick / 2, rect.height / 2, wallThick, rect.height + 100, {
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
  card.dataset.id = task.id
  card.style.minHeight = CARD_MIN_HEIGHT + 'px'

  const inner = document.createElement('div')
  inner.className = 'spatial-card-inner'

  const handle = document.createElement('div')
  handle.className = 'spatial-card-handle'
  handle.setAttribute('aria-hidden', 'true')
  handle.textContent = '⋮⋮'

  const controls = document.createElement('div')
  controls.className = 'spatial-card-controls'

  const textSpan = document.createElement('span')
  textSpan.className = 'spatial-card-text'
  textSpan.textContent = task.text
  textSpan.addEventListener('dblclick', () => startEdit(card, task))

  controls.appendChild(textSpan)
  inner.appendChild(handle)
  inner.appendChild(controls)
  card.appendChild(inner)
  return card
}

function createCardBody(x, y, width, height) {
  const body = Bodies.rectangle(x, y, width, height, {
    restitution: 0.2,
    friction: 0.4,
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
  const bodyH = Math.max(CARD_MIN_HEIGHT, Math.min(CARD_MAX_HEIGHT, h))
  const body = createCardBody(x, y, bodyW, bodyH)
  World.add(engine.world, body)
  element.style.left = body.position.x + 'px'
  element.style.top = body.position.y + 'px'
  element.style.transform = 'translate(-50%, -50%) rotate(0rad)'
  cardMap.set(task.id, { body, element, task })
  setupDrag(element, body, task.id)
}

function isPointInElement(clientX, clientY, el) {
  if (!el) return false
  const rect = el.getBoundingClientRect()
  return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
}

function updateDoneCount() {
  const count = state.tasks.filter((t) => t.done).length
  if (doneCountEl) doneCountEl.textContent = count
}

function setupDrag(cardEl, body, taskId) {
  const handleEl = cardEl.querySelector('.spatial-card-handle')
  if (!handleEl) return
  let dragging = false
  let offsetX = 0
  let offsetY = 0
  let lastClientX = 0
  let lastClientY = 0

  function getWorldCoords(clientX, clientY) {
    const rect = getStageRect()
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    }
  }

  function onPointerDown(e) {
    if (e.target !== handleEl && !handleEl.contains(e.target)) return
    e.preventDefault()
    const coords = getWorldCoords(e.clientX, e.clientY)
    offsetX = coords.x - body.position.x
    offsetY = coords.y - body.position.y
    lastClientX = e.clientX
    lastClientY = e.clientY
    dragging = true
    Body.setStatic(body, true)
    Body.setAngle(body, 0)
    Body.setAngularVelocity(body, 0)
    document.addEventListener('pointermove', onPointerMove)
    document.addEventListener('pointerup', onPointerUp)
    document.addEventListener('pointercancel', onPointerUp)
  }

  function updateOverZones() {
    const overDone = isPointInElement(lastClientX, lastClientY, zoneDoneEl)
    const overDelete = isPointInElement(lastClientX, lastClientY, zoneDeleteEl)
    cardEl.classList.toggle('spatial-card--over-done', overDone && !overDelete)
    cardEl.classList.toggle('spatial-card--over-delete', overDelete && !overDone)
  }

  function clampToStage(x, y) {
    const rect = getStageRect()
    const { halfW, halfH } = getBodyHalfSize(body)
    return {
      x: Math.max(halfW, Math.min(rect.width - halfW, x)),
      y: Math.max(halfH, Math.min(rect.height - halfH, y))
    }
  }

  function onPointerMove(e) {
    if (!dragging) return
    lastClientX = e.clientX
    lastClientY = e.clientY
    const coords = getWorldCoords(e.clientX, e.clientY)
    const clamped = clampToStage(coords.x - offsetX, coords.y - offsetY)
    Body.setPosition(body, clamped)
    updateOverZones()
  }

  function onPointerUp() {
    if (!dragging) return
    dragging = false
    cardEl.classList.remove('spatial-card--over-done', 'spatial-card--over-delete')
    document.removeEventListener('pointermove', onPointerMove)
    document.removeEventListener('pointerup', onPointerUp)
    document.removeEventListener('pointercancel', onPointerUp)

    if (isPointInElement(lastClientX, lastClientY, zoneDoneEl)) {
      markDoneAndRemoveFromStage(taskId)
      return
    }
    if (isPointInElement(lastClientX, lastClientY, zoneDeleteEl)) {
      removeCard(taskId)
      return
    }

    Body.setStatic(body, false)
    Body.setVelocity(body, { x: 0, y: 0 })
  }

  handleEl.addEventListener('pointerdown', onPointerDown)
}

function markDoneAndRemoveFromStage(id) {
  const entry = cardMap.get(id)
  if (!entry) return
  apiSetDone(id, true).then(({ ok, error }) => {
    if (!ok && error) showError(error)
  })
  const task = state.tasks.find((t) => t.id === id)
  if (task) task.done = true
  World.remove(engine.world, entry.body)
  entry.element.remove()
  cardMap.delete(id)
  updateDoneCount()
}

function clampBodyToStage(body) {
  const rect = getStageRect()
  const { halfW, halfH } = getBodyHalfSize(body)
  const x = Math.max(halfW, Math.min(rect.width - halfW, body.position.x))
  const y = Math.max(halfH, Math.min(rect.height - halfH, body.position.y))
  if (x !== body.position.x || y !== body.position.y) {
    Body.setPosition(body, { x, y })
  }
}

function syncBodyToDom() {
  for (const [, { body, element }] of cardMap) {
    clampBodyToStage(body)
    element.style.left = body.position.x + 'px'
    element.style.top = body.position.y + 'px'
    element.style.transform = `translate(-50%, -50%) rotate(${body.angle}rad)`
  }
}

function runLoop() {
  Engine.update(engine)
  syncBodyToDom()
  animationId = requestAnimationFrame(runLoop)
}

function removeCard(id) {
  const entry = cardMap.get(id)
  if (!entry) return
  apiRemoveTask(id).then(({ ok, error }) => {
    if (!ok && error) showError(error)
  })
  World.remove(engine.world, entry.body)
  entry.element.remove()
  cardMap.delete(id)
  const idx = state.tasks.findIndex((t) => t.id === id)
  if (idx !== -1) state.tasks.splice(idx, 1)
}

function startEdit(cardEl, task) {
  const textSpan = cardEl.querySelector('.spatial-card-text')
  if (!textSpan) return
  const inputEl = document.createElement('input')
  inputEl.type = 'text'
  inputEl.className = 'spatial-card-edit'
  inputEl.value = task.text
  inputEl.setAttribute('aria-label', 'Edit task')
  const finishEdit = () => {
    const text = inputEl.value.trim()
    textSpan.parentNode.replaceChild(textSpan, inputEl)
    inputEl.removeEventListener('blur', finishEdit)
    inputEl.removeEventListener('keydown', keydown)
    if (text) {
      apiSetTaskText(task.id, text).then(({ ok }) => {
        if (ok) {
          task.text = text
          const entry = cardMap.get(task.id)
          if (entry) entry.task.text = text
        }
        textSpan.textContent = task.text
      })
    } else {
      textSpan.textContent = task.text
    }
  }
  const keydown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      finishEdit()
    }
    if (e.key === 'Escape') {
      inputEl.value = task.text
      finishEdit()
    }
  }
  inputEl.addEventListener('blur', finishEdit)
  inputEl.addEventListener('keydown', keydown)
  textSpan.parentNode.replaceChild(inputEl, textSpan)
  inputEl.focus()
}

function spawnCard(task) {
  const rect = getStageRect()
  const x = rect.width / 2 + (Math.random() - 0.5) * 40
  addCardToWorld(task, x, SPAWN_Y)
}

function spawnExistingCards(tasks) {
  const rect = getStageRect()
  const centerX = rect.width / 2
  tasks.forEach((task, i) => {
    setTimeout(() => {
      const x = centerX + (Math.random() - 0.5) * 60
      addCardToWorld(task, x, SPAWN_Y)
    }, i * 120)
  })
}

async function onAddTask(text) {
  const { data: task, error } = await apiAddTask(text)
  if (error) {
    showError(error)
    return
  }
  if (!task) return
  state.tasks.push(task)
  spawnCard(task)
}

async function loadInitialTasks() {
  state.loading = true
  const { data, error } = await apiLoadTasks()
  if (error) {
    showError(error)
    state.loading = false
    return
  }
  state.tasks = data || []
  state.loading = false
  updateDoneCount()
  const activeTasks = state.tasks.filter((t) => !t.done)
  if (activeTasks.length === 0) return
  spawnExistingCards(activeTasks)
}

form.addEventListener('submit', (e) => {
  e.preventDefault()
  const text = input.value
  onAddTask(text)
  input.value = ''
  input.focus()
})

function handleResize() {
  const rect = getStageRect()
  if (floor) {
    Body.setPosition(floor, { x: rect.width / 2, y: rect.height - FLOOR_HEIGHT / 2 })
  }
  if (leftWall) Body.setPosition(leftWall, { x: -10, y: rect.height / 2 })
  if (rightWall) Body.setPosition(rightWall, { x: rect.width + 10, y: rect.height / 2 })
  if (topWall) Body.setPosition(topWall, { x: rect.width / 2, y: -10 })
  engine.world.bounds = { min: { x: 0, y: 0 }, max: { x: rect.width, y: rect.height } }
}

window.addEventListener('resize', handleResize)
requestAnimationFrame(() => {
  initPhysics()
  runLoop()
  if (supabase) {
    loadInitialTasks()
  } else {
    state.loading = false
    console.info('[To-Do Spatial] No Supabase – add .env and restart to persist.')
  }
})
