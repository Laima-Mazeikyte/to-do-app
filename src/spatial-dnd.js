const ZONE_BY_ID = {
  'todo-active-list': 'active',
  'todo-done-list': 'done',
  'todo-delete-zone': 'delete'
}

const DND_TYPE = 'application/x-todo-task-id'

function getZone(el) {
  if (!el) return null
  const zoneEl = el.closest('[data-drop-zone]')
  if (zoneEl) return zoneEl.getAttribute('data-drop-zone')
  const list = el.closest('ul[id], ol[id]')
  if (list && list.id && ZONE_BY_ID[list.id]) return ZONE_BY_ID[list.id]
  return null
}

function getTaskIdFromCard(card) {
  return card?.closest?.('.todo-card')?.dataset?.id ?? null
}

/**
 * Creates spatial drag-and-drop for todo cards and zones.
 * Cards (`.todo-card` with `data-id`) can be dragged onto zone elements.
 * Zones: #todo-active-list, #todo-done-list, or any [data-drop-zone="active|done|delete"].
 * When dropping on a card, the drop target element is passed so the handler can reorder.
 * @param {{ onDropToZone: (taskId: string, zone: string, dropTarget?: Element) => void }} options
 * @returns {{ destroy: () => void }}
 */
export function createSpatialDnd({ onDropToZone }) {
  function onDragStart(e) {
    const taskId = getTaskIdFromCard(e.target)
    if (!taskId) return
    e.dataTransfer.setData(DND_TYPE, taskId)
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDragOver(e) {
    const zone = getZone(e.target)
    if (zone) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
    }
  }

  function onDrop(e) {
    const zone = getZone(e.target)
    if (!zone) return
    e.preventDefault()
    const taskId = e.dataTransfer.getData(DND_TYPE)
    if (taskId && typeof onDropToZone === 'function') {
      const dropTarget = e.target.closest('.todo-card') || e.target
      onDropToZone(taskId, zone, dropTarget)
    }
  }

  document.addEventListener('dragstart', onDragStart)
  document.addEventListener('dragover', onDragOver)
  document.addEventListener('drop', onDrop)

  return {
    destroy() {
      document.removeEventListener('dragstart', onDragStart)
      document.removeEventListener('dragover', onDragOver)
      document.removeEventListener('drop', onDrop)
    }
  }
}
