import {
  getState,
  setTasks,
  setError,
  setLoading,
  setLastAddedTaskId,
  clearLastAddedTaskId,
  addTask as stateAddTask,
  removeTaskById,
  updateTask,
  addPendingDelete,
  removePendingDelete,
  getPendingDeletes
} from '../lib/state.js'
import {
  loadTasks as apiLoadTasks,
  addTask as apiAddTask,
  removeTask as apiRemoveTask,
  setDone as apiSetDone,
  setPinned as apiSetPinned,
  setTaskText as apiSetTaskText
} from '../lib/todo-api.js'
import { createSpatialDnd } from '../spatial-dnd.js'

const DELETE_UNDO_MS = 5000

let spatialDnd = null

function getElements() {
  return {
    form: document.getElementById('todo-form'),
    input: document.getElementById('todo-input'),
    errorEl: document.getElementById('todo-error'),
    priorityList: document.getElementById('todo-priority-list'),
    pileList: document.getElementById('todo-pile-list'),
    doneList: document.getElementById('todo-done-list'),
    doneCountEl: document.getElementById('todo-done-count'),
    undoEl: document.getElementById('todo-undo'),
    undoTextEl: document.getElementById('todo-undo-text'),
    undoButton: document.getElementById('todo-undo-button')
  }
}

function renderZoneEmptyState(message) {
  const empty = document.createElement('p')
  empty.className = 'todo-zone-empty'
  empty.textContent = message
  return empty
}

function resetUndoUI(el) {
  const pendingDeletes = getPendingDeletes()
  if (pendingDeletes.size === 0) {
    el.undoEl.hidden = true
    return
  }
  const lastPending = Array.from(pendingDeletes.values()).at(-1)
  el.undoTextEl.textContent = `"${lastPending.task.text}" moved to trash.`
  el.undoEl.hidden = false
}

async function removeTaskPermanent(id) {
  const { ok, error } = await apiRemoveTask(id)
  if (error) {
    setError(error)
    return false
  }
  return ok
}

function createTaskCard(task, onSetDone, onQueueDelete, onStartEdit) {
  const state = getState()
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
  checkbox.addEventListener('change', () => onSetDone(task.id, checkbox.checked))

  const textSpan = document.createElement('span')
  textSpan.className = 'todo-card-text'
  textSpan.textContent = task.text
  textSpan.setAttribute('role', 'button')
  textSpan.setAttribute('tabindex', '0')
  textSpan.setAttribute('aria-label', `Edit task: ${task.text}`)
  const openEdit = () => onStartEdit(card, task)
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
  deleteBtn.addEventListener('click', () => onQueueDelete(task.id))

  controls.appendChild(checkbox)
  controls.appendChild(textSpan)
  controls.appendChild(deleteBtn)
  card.appendChild(controls)
  return card
}

/**
 * Initialize the list view. Sets up state, DOM, event listeners, and DnD.
 * @param {import('@supabase/supabase-js').SupabaseClient | null} supabase
 */
export function initListView(supabase) {
  const el = getElements()
  setLoading(!!supabase)

  async function loadTasks() {
    if (!supabase) return
    setError(null)
    const { data, error } = await apiLoadTasks()
    if (error) {
      setError(error)
      setLoading(false)
      render()
      return
    }
    setTasks(data)
    setLoading(false)
    render()
  }

  async function addTask(text) {
    const { data: nextTask, error } = await apiAddTask(text)
    if (error) {
      setError(error)
      render()
      return
    }
    if (!nextTask) return
    setError(null)
    stateAddTask(nextTask)
    setLastAddedTaskId(nextTask.id)
    render()
  }

  async function setDone(id, done) {
    const { ok, error } = await apiSetDone(id, done)
    if (!ok) {
      if (error) setError(error)
      render()
      return false
    }
    updateTask(id, { done })
    render()
    return true
  }

  async function setPinned(id, pinned) {
    const { ok, error } = await apiSetPinned(id, pinned)
    if (!ok) {
      if (error) setError(error)
      render()
      return false
    }
    updateTask(id, { pinned })
    render()
    return true
  }

  async function setTaskText(id, text) {
    const { ok } = await apiSetTaskText(id, text)
    if (!ok) return
    updateTask(id, { text: text.trim() })
    render()
  }

  async function finalizeDelete(id) {
    const pendingDeletes = getPendingDeletes()
    const pending = pendingDeletes.get(id)
    if (!pending) return

    removePendingDelete(id)
    const didDelete = await removeTaskPermanent(id)

    if (!didDelete) {
      stateAddTask(pending.task)
    }

    resetUndoUI(el)
    render()
  }

  function queueDeleteTask(id) {
    if (getPendingDeletes().has(id)) return
    const state = getState()
    const task = state.tasks.find((item) => item.id === id)
    if (!task) return

    const timerId = window.setTimeout(() => {
      finalizeDelete(id)
    }, DELETE_UNDO_MS)

    addPendingDelete(id, { task, timerId })
    removeTaskById(id)
    resetUndoUI(el)
    render()
  }

  function undoLastDelete() {
    const pendingDeletes = getPendingDeletes()
    const entries = Array.from(pendingDeletes.entries())
    if (entries.length === 0) return
    const [taskId, pending] = entries[entries.length - 1]
    window.clearTimeout(pending.timerId)
    removePendingDelete(taskId)
    stateAddTask(pending.task)
    resetUndoUI(el)
    render()
  }

  async function handleDropToZone(taskId, zone) {
    const state = getState()
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

  function render() {
    const state = getState()
    el.errorEl.textContent = state.error || ''
    el.errorEl.hidden = !state.error

    el.priorityList.innerHTML = ''
    el.pileList.innerHTML = ''
    el.doneList.innerHTML = ''

    if (state.loading) {
      el.pileList.appendChild(renderZoneEmptyState('Loading...'))
      el.doneCountEl.textContent = '0'
      return
    }

    const doneCount = state.tasks.filter((task) => task.done).length
    el.doneCountEl.textContent = `${doneCount}`

    state.tasks.forEach((task) => {
      const card = createTaskCard(task, setDone, queueDeleteTask, startEdit)
      if (task.done) {
        el.doneList.appendChild(card)
        return
      }
      if (task.pinned) {
        el.priorityList.appendChild(card)
        return
      }
      el.pileList.appendChild(card)
    })

    if (!el.priorityList.children.length) {
      el.priorityList.appendChild(renderZoneEmptyState('Drag cards here to pin for today.'))
    }
    if (!el.pileList.children.length) {
      el.pileList.appendChild(renderZoneEmptyState('Create a task and it will land here.'))
    }
    if (!el.doneList.children.length) {
      el.doneList.appendChild(renderZoneEmptyState('Drop a card here or tick the checkbox.'))
    }

    clearLastAddedTaskId()
  }

  function ensureSpatialDnd() {
    if (spatialDnd) return
    spatialDnd = createSpatialDnd({
      onDropToZone: (taskId, zone) => {
        handleDropToZone(taskId, zone)
      }
    })
  }

  el.form.addEventListener('submit', (e) => {
    e.preventDefault()
    const text = el.input.value
    addTask(text)
    el.input.value = ''
    el.input.focus()
  })

  el.undoButton.addEventListener('click', undoLastDelete)

  ensureSpatialDnd()

  if (supabase) {
    console.info('[To-Do] Supabase connected – tasks will sync to the database.')
    loadTasks()
  } else {
    console.info(
      '[To-Do] Running without Supabase – tasks are stored locally only. Add .env and restart dev server to persist.'
    )
    render()
  }
}
