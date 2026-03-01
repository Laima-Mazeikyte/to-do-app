/**
 * Single source of truth for list view: tasks, loading, error, lastAddedTaskId.
 * pendingDeletes holds tasks queued for permanent delete (undo window).
 * No DOM or API calls.
 */

/** @type {{ tasks: Array<{ id: string, text: string, done: boolean, pinned: boolean, created_at?: string }>, loading: boolean, error: string | null, lastAddedTaskId: string | null, supportsPinnedPersistence: boolean }} */
const state = {
  tasks: [],
  loading: false,
  error: null,
  lastAddedTaskId: null,
  supportsPinnedPersistence: true
}

/** @type {Map<string, { task: { id: string, text: string, done: boolean, pinned: boolean }, timerId: number }>} */
const pendingDeletes = new Map()

export function getState() {
  return state
}

export function getPendingDeletes() {
  return pendingDeletes
}

export function setTasks(tasks) {
  state.tasks = tasks
}

export function setError(error) {
  state.error = error
}

export function setLoading(loading) {
  state.loading = loading
}

export function setLastAddedTaskId(id) {
  state.lastAddedTaskId = id
}

export function clearLastAddedTaskId() {
  state.lastAddedTaskId = null
}

export function addTask(task) {
  state.tasks.push(task)
}

export function removeTaskById(id) {
  state.tasks = state.tasks.filter((t) => t.id !== id)
}

export function updateTask(id, patch) {
  const task = state.tasks.find((t) => t.id === id)
  if (task) Object.assign(task, patch)
}

/** Move task to the top of the "done" segment (most recently completed first). */
export function reorderTaskToDoneTop(id) {
  const idx = state.tasks.findIndex((t) => t.id === id)
  if (idx === -1) return
  const task = state.tasks[idx]
  if (!task.done) return
  const active = state.tasks.filter((t) => !t.done)
  const done = state.tasks.filter((t) => t.done)
  const doneWithout = done.filter((t) => t.id !== id)
  state.tasks = [...active, task, ...doneWithout]
}

/** Set the order of active (incomplete) tasks by id. Preserves done segment order. */
export function setActiveTaskOrder(orderedIds) {
  const active = state.tasks.filter((t) => !t.done)
  const done = state.tasks.filter((t) => t.done)
  const orderedActive = orderedIds
    .map((id) => active.find((t) => t.id === id))
    .filter(Boolean)
  state.tasks = [...orderedActive, ...done]
}

export function addPendingDelete(id, data) {
  pendingDeletes.set(id, data)
}

export function removePendingDelete(id) {
  pendingDeletes.delete(id)
}

export function getPendingDelete(id) {
  return pendingDeletes.get(id)
}
