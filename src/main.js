import './style.css'
import {
  loadTasks as apiLoadTasks,
  addTask as apiAddTask,
  removeTask as apiRemoveTask,
  setDone as apiSetDone,
  setPinned as apiSetPinned,
  setTaskText as apiSetTaskText
} from './todo-api.js'
import { supabase } from './supabase.js'
import { createSpatialDnd } from './spatial-dnd.js'

const form = document.getElementById('todo-form')
const input = document.getElementById('todo-input')
const errorEl = document.getElementById('todo-error')
const priorityList = document.getElementById('todo-priority-list')
const pileList = document.getElementById('todo-pile-list')
const doneList = document.getElementById('todo-done-list')
const doneCountEl = document.getElementById('todo-done-count')
const undoEl = document.getElementById('todo-undo')
const undoTextEl = document.getElementById('todo-undo-text')
const undoButton = document.getElementById('todo-undo-button')

const DELETE_UNDO_MS = 5000

let state = {
  tasks: [],
  loading: !!supabase,
  error: null,
  lastAddedTaskId: null,
  supportsPinnedPersistence: true
}

const pendingDeletes = new Map()
let spatialDnd = null

async function loadTasks() {
  if (!supabase) return
  state.error = null
  const { data, error } = await apiLoadTasks()
  if (error) {
    state.error = error
    state.loading = false
    render()
    return
  }
  state.tasks = data
  state.loading = false
  render()
}

async function addTask(text) {
  const { data: nextTask, error } = await apiAddTask(text)
  if (error) {
    state.error = error
    render()
    return
  }
  if (!nextTask) return
  state.error = null
  state.tasks.push(nextTask)
  state.lastAddedTaskId = nextTask.id
  render()
}

async function removeTaskPermanent(id) {
  const { ok, error } = await apiRemoveTask(id)
  if (error) {
    state.error = error
    return false
  }
  return ok
}

async function setDone(id, done) {
  const { ok, error } = await apiSetDone(id, done)
  if (!ok) {
    if (error) state.error = error
    render()
    return false
  }
  const task = state.tasks.find((t) => t.id === id)
  if (task) task.done = done
  render()
  return true
}

async function setPinned(id, pinned) {
  const { ok, error } = await apiSetPinned(id, pinned)
  if (!ok) {
    if (error) state.error = error
    render()
    return false
  }
  const task = state.tasks.find((t) => t.id === id)
  if (task) task.pinned = pinned
  render()
  return true
}

async function setTaskText(id, text) {
  const { ok } = await apiSetTaskText(id, text)
  if (!ok) return
  const task = state.tasks.find((t) => t.id === id)
  if (task) task.text = text.trim()
  render()
}

function renderZoneEmptyState(message) {
  const empty = document.createElement('p')
  empty.className = 'todo-zone-empty'
  empty.textContent = message
  return empty
}

function resetUndoUI() {
  if (pendingDeletes.size === 0) {
    undoEl.hidden = true
    return
  }
  const lastPending = Array.from(pendingDeletes.values()).at(-1)
  undoTextEl.textContent = `"${lastPending.task.text}" moved to trash.`
  undoEl.hidden = false
}

async function finalizeDelete(id) {
  const pending = pendingDeletes.get(id)
  if (!pending) return

  pendingDeletes.delete(id)
  const didDelete = await removeTaskPermanent(id)

  if (!didDelete) {
    state.tasks.push(pending.task)
  }

  resetUndoUI()
  render()
}

function queueDeleteTask(id) {
  if (pendingDeletes.has(id)) return
  const task = state.tasks.find((item) => item.id === id)
  if (!task) return

  const timerId = window.setTimeout(() => {
    finalizeDelete(id)
  }, DELETE_UNDO_MS)

  pendingDeletes.set(id, { task, timerId })
  state.tasks = state.tasks.filter((item) => item.id !== id)
  resetUndoUI()
  render()
}

function undoLastDelete() {
  const entries = Array.from(pendingDeletes.entries())
  if (entries.length === 0) return
  const [taskId, pending] = entries[entries.length - 1]
  window.clearTimeout(pending.timerId)
  pendingDeletes.delete(taskId)
  state.tasks.push(pending.task)
  resetUndoUI()
  render()
}

function createTaskCard(task) {
  const card = document.createElement('article')
  card.className = 'todo-card'
  card.dataset.id = task.id
  card.draggable = true
  if (task.done) card.classList.add('todo-card--done')
  if (task.pinned) card.classList.add('todo-card--pinned')
  if (state.lastAddedTaskId === task.id && !task.done && !task.pinned) {
    card.classList.add('todo-card--spawn')
  }

  const controls = document.createElement('div')
  controls.className = 'todo-card-controls'

  const checkbox = document.createElement('input')
  checkbox.type = 'checkbox'
  checkbox.className = 'todo-card-checkbox'
  checkbox.checked = task.done
  checkbox.setAttribute('aria-label', `Mark "${task.text}" as ${task.done ? 'not done' : 'done'}`)
  checkbox.addEventListener('change', () => setDone(task.id, checkbox.checked))

  const textSpan = document.createElement('span')
  textSpan.className = 'todo-card-text'
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
  deleteBtn.className = 'todo-card-delete'
  deleteBtn.setAttribute('aria-label', `Delete "${task.text}"`)
  deleteBtn.textContent = 'Delete'
  deleteBtn.addEventListener('click', () => queueDeleteTask(task.id))

  controls.appendChild(checkbox)
  controls.appendChild(textSpan)
  controls.appendChild(deleteBtn)
  card.appendChild(controls)
  return card
}

async function handleDropToZone(taskId, zone) {
  const task = state.tasks.find((item) => item.id === taskId)
  if (!task) return

  if (zone === 'delete') {
    queueDeleteTask(task.id)
    return
  }

  if (zone === 'done' && !task.done) {
    await setDone(task.id, true)
    return
  }

  if (zone === 'priority') {
    if (task.done) await setDone(task.id, false)
    if (!task.pinned) await setPinned(task.id, true)
    return
  }

  if (zone === 'pile') {
    if (task.done) await setDone(task.id, false)
    if (task.pinned) await setPinned(task.id, false)
  }
}

function render() {
  errorEl.textContent = state.error || ''
  errorEl.hidden = !state.error

  priorityList.innerHTML = ''
  pileList.innerHTML = ''
  doneList.innerHTML = ''

  if (state.loading) {
    pileList.appendChild(renderZoneEmptyState('Loading...'))
    doneCountEl.textContent = '0'
    return
  }

  const doneCount = state.tasks.filter((task) => task.done).length
  doneCountEl.textContent = `${doneCount}`

  state.tasks.forEach((task) => {
    const card = createTaskCard(task)
    if (task.done) {
      doneList.appendChild(card)
      return
    }
    if (task.pinned) {
      priorityList.appendChild(card)
      return
    }
    pileList.appendChild(card)
  })

  if (!priorityList.children.length) {
    priorityList.appendChild(renderZoneEmptyState('Drag cards here to pin for today.'))
  }
  if (!pileList.children.length) {
    pileList.appendChild(renderZoneEmptyState('Create a task and it will land here.'))
  }
  if (!doneList.children.length) {
    doneList.appendChild(renderZoneEmptyState('Drop a card here or tick the checkbox.'))
  }

  state.lastAddedTaskId = null
}

function ensureSpatialDnd() {
  if (spatialDnd) return
  spatialDnd = createSpatialDnd({
    onDropToZone: (taskId, zone) => {
      handleDropToZone(taskId, zone)
    }
  })
}

function startEdit(card, task) {
  const textSpan = card.querySelector('.todo-card-text')
  if (!textSpan) return

  const controls = card.querySelector('.todo-card-controls')
  if (!controls) return

  const inputWrap = document.createElement('div')
  inputWrap.className = 'todo-card-edit-input-wrap todo-card-edit-input-wrap--multiline'
  const editField = document.createElement('textarea')
  editField.className = 'todo-card-edit'
  editField.value = task.text
  editField.setAttribute('aria-label', 'Edit task')
  const lineCount = (task.text.match(/\n/g) || []).length + 1
  editField.rows = Math.max(10, lineCount)
  inputWrap.appendChild(editField)

  const saveBtn = document.createElement('button')
  saveBtn.type = 'button'
  saveBtn.className = 'todo-card-save'
  saveBtn.textContent = 'Save'
  saveBtn.setAttribute('aria-label', 'Save changes')

  const editWrap = document.createElement('div')
  editWrap.className = 'todo-card-edit-wrap'
  editWrap.appendChild(inputWrap)
  editWrap.appendChild(saveBtn)

  controls.replaceChild(editWrap, textSpan)

  const finishEdit = () => {
    const value = editField.value.trim()
    if (value) setTaskText(task.id, value)
    textSpan.textContent = value || task.text
    controls.replaceChild(textSpan, editWrap)
    editField.removeEventListener('blur', finishEdit)
    editField.removeEventListener('keydown', keydown)
    saveBtn.removeEventListener('click', onSaveClick)
  }

  const onSaveClick = (e) => {
    e.preventDefault()
    finishEdit()
  }

  const keydown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      editField.value = task.text
      finishEdit()
      return
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      finishEdit()
    }
  }

  editField.addEventListener('blur', finishEdit)
  editField.addEventListener('keydown', keydown)
  saveBtn.addEventListener('click', onSaveClick)
  editField.focus()
}

form.addEventListener('submit', (e) => {
  e.preventDefault()
  const text = input.value
  addTask(text)
  input.value = ''
  input.focus()
})

undoButton.addEventListener('click', undoLastDelete)

if (supabase) {
  console.info('[To-Do] Supabase connected – tasks will sync to the database.')
  loadTasks()
} else {
  console.info(
    '[To-Do] Running without Supabase – tasks are stored locally only. Add .env and restart dev server to persist.'
  )
  render()
}

ensureSpatialDnd()
