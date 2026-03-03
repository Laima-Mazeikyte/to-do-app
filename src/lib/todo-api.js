import { supabase, ensureSession } from './supabase.js'

/**
 * @param {import('@supabase/supabase-js').Row} row
 * @returns {{ id: string, text: string, done: boolean, pinned: boolean, created_at?: string }}
 */
export function rowToTask(row) {
  return {
    id: row.id,
    text: row.text ?? '',
    done: !!row.done,
    pinned: !!(row.pinned ?? false),
    created_at: row.created_at ?? new Date().toISOString()
  }
}

/**
 * @returns {Promise<{ data: Array<{ id: string, text: string, done: boolean, pinned: boolean }>, error: string | null }>}
 */
export async function loadTasks() {
  if (!supabase) {
    return { data: [], error: null }
  }
  const user = await ensureSession()
  if (!user) {
    return { data: [], error: 'Not authenticated. Ensure session before loading todos.' }
  }
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
  if (error) {
    console.error('Failed to load todos:', error)
    return { data: [], error: error.message || 'Failed to load tasks from database.' }
  }
  return { data: (data || []).map(rowToTask), error: null }
}

/**
 * @param {string} text
 * @returns {Promise<{ data: { id: string, text: string, done: boolean, pinned: boolean } | null, error: string | null }>}
 */
export async function addTask(text) {
  const nextText = text.trim()
  if (!nextText) {
    return { data: null, error: null }
  }
  if (!supabase) {
    return {
      data: {
        id: crypto.randomUUID(),
        text: nextText,
        done: false,
        pinned: false,
        created_at: new Date().toISOString()
      },
      error: null
    }
  }
  const { data, error } = await supabase
    .from('todos')
    .insert({ text: nextText, done: false })
    .select()
    .single()
  if (error) {
    console.error('Failed to add todo:', error)
    return { data: null, error: error.message || 'Failed to save task to database.' }
  }
  return { data: rowToTask(data), error: null }
}

/**
 * @param {string} id
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function removeTask(id) {
  if (!supabase) return { ok: true }
  const { error } = await supabase.from('todos').delete().eq('id', id)
  if (error) {
    console.error('Failed to delete todo:', error)
    return { ok: false, error: error.message || 'Failed to delete task from database.' }
  }
  return { ok: true }
}

/**
 * @param {string} id
 * @param {boolean} done
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function setDone(id, done) {
  if (supabase) {
    const { error } = await supabase.from('todos').update({ done }).eq('id', id)
    if (error) {
      console.error('Failed to update todo:', error)
      return { ok: false, error: error.message || 'Failed to update task.' }
    }
  }
  return { ok: true }
}

/**
 * @param {string} id
 * @param {boolean} pinned
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function setPinned(id, pinned) {
  if (!supabase) return { ok: true }
  const { error } = await supabase.from('todos').update({ pinned }).eq('id', id)
  if (error) {
    const msg = (error?.message || '').toLowerCase()
    const isPinnedColumnMissing =
      msg.includes('pinned') && (msg.includes('column') || msg.includes('schema cache'))
    if (isPinnedColumnMissing) {
      console.warn('[To-Do] Missing "pinned" column in Supabase todos table.', error)
      return { ok: true }
    }
    console.error('Failed to pin todo:', error)
    return { ok: false, error: error.message || 'Failed to update pinned state.' }
  }
  return { ok: true }
}

/**
 * @param {string} id
 * @param {string} text
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function setTaskText(id, text) {
  if (!text.trim()) return { ok: false }
  if (!supabase) return { ok: true }
  const { error } = await supabase.from('todos').update({ text: text.trim() }).eq('id', id)
  if (error) {
    console.error('Failed to update todo:', error)
    return { ok: false, error: error.message || 'Failed to update task.' }
  }
  return { ok: true }
}
