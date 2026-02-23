import './style.css'

const form = document.getElementById('todo-form')
const input = document.getElementById('todo-input')
const list = document.getElementById('todo-list')
const filterButtons = document.querySelectorAll('.todo-filter')

let state = {
  tasks: [],
  filter: 'all'
}

function addTask(text) {
  if (!text.trim()) return
  state.tasks.push({
    id: crypto.randomUUID(),
    text: text.trim(),
    done: false
  })
  render()
}

function removeTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id)
  render()
}

function setDone(id, done) {
  const task = state.tasks.find(t => t.id === id)
  if (task) task.done = done
  render()
}

function setTaskText(id, text) {
  const task = state.tasks.find(t => t.id === id)
  if (task && text.trim()) task.text = text.trim()
  render()
}

function setFilter(filter) {
  state.filter = filter
  filterButtons.forEach(btn => {
    const isActive = btn.getAttribute('data-filter') === filter
    btn.classList.toggle('todo-filter--active', isActive)
    btn.setAttribute('aria-selected', isActive)
  })
  render()
}

function getFilteredTasks() {
  if (state.filter === 'active') return state.tasks.filter(t => !t.done)
  if (state.filter === 'done') return state.tasks.filter(t => t.done)
  return state.tasks
}

function renderEmptyState(message = 'No tasks yet.') {
  const li = document.createElement('li')
  li.className = 'todo-list-empty'
  li.setAttribute('aria-live', 'polite')
  li.textContent = message
  return li
}

function render() {
  const filtered = getFilteredTasks()
  list.innerHTML = ''

  if (filtered.length === 0) {
    const emptyMessage =
      state.tasks.length === 0
        ? 'No tasks yet.'
        : state.filter === 'active'
          ? 'No active tasks.'
          : state.filter === 'done'
            ? 'No completed tasks.'
            : 'No tasks yet.'
    list.appendChild(renderEmptyState(emptyMessage))
    return
  }

  filtered.forEach(task => {
    const li = document.createElement('li')
    li.className = 'todo-item' + (task.done ? ' todo-item--done' : '')
    li.dataset.id = task.id

    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.className = 'todo-item-checkbox'
    checkbox.checked = task.done
    checkbox.setAttribute('aria-label', `Mark "${task.text}" as ${task.done ? 'not done' : 'done'}`)
    checkbox.addEventListener('change', () => setDone(task.id, checkbox.checked))

    const textSpan = document.createElement('span')
    textSpan.className = 'todo-item-text'
    textSpan.textContent = task.text
    textSpan.addEventListener('dblclick', () => startEdit(li, task))

    const deleteBtn = document.createElement('button')
    deleteBtn.type = 'button'
    deleteBtn.className = 'todo-item-delete'
    deleteBtn.setAttribute('aria-label', `Delete "${task.text}"`)
    deleteBtn.textContent = 'Delete'
    deleteBtn.addEventListener('click', () => removeTask(task.id))

    li.appendChild(checkbox)
    li.appendChild(textSpan)
    li.appendChild(deleteBtn)
    list.appendChild(li)
  })
}

function startEdit(li, task) {
  const textSpan = li.querySelector('.todo-item-text')
  const inputEl = document.createElement('input')
  inputEl.type = 'text'
  inputEl.className = 'todo-item-edit'
  inputEl.value = task.text
  inputEl.setAttribute('aria-label', 'Edit task')

  const finishEdit = () => {
    setTaskText(task.id, inputEl.value)
    li.replaceChild(textSpan, inputEl)
    inputEl.removeEventListener('blur', finishEdit)
    inputEl.removeEventListener('keydown', keydown)
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
  li.replaceChild(inputEl, textSpan)
  inputEl.focus()
}

form.addEventListener('submit', (e) => {
  e.preventDefault()
  const text = input.value
  addTask(text)
  input.value = ''
  input.focus()
})

filterButtons.forEach(btn => {
  btn.addEventListener('click', () => setFilter(btn.getAttribute('data-filter')))
})

// Initial filter UI
setFilter('all')
