/**
 * UI copy – edit these strings to adjust all user-facing text.
 * Used for empty states, buttons, and search.
 */
export const COPY = {
  /** Button to delete all completed tasks (shown only when done tasks exist, on All or Done filter) */
  clearDoneButton: 'Clear all completed',

  /** Undo bar: single task deleted. {{task}} = task text */
  undoSingleDelete: '"{{task}}" moved to trash.',

  /** Undo bar: bulk clear – 1 task. Shown when exactly one completed task was cleared */
  undoBulkClearOne: 'Cleared 1 completed task.',

  /** Undo bar: bulk clear – many. {{count}} = number of tasks cleared */
  undoBulkClearMany: 'Cleared {{count}} completed tasks.',

  /** Empty state: no tasks at all (filter: All) */
  emptyAll: 'No tasks yet. Add one above or paste a list.',

  /** Empty state: no to-do tasks (filter: To do) */
  emptyTodo: 'All done! Nothing left to do.',

  /** Empty state: no done tasks (filter: Done) */
  emptyDone: 'No completed tasks yet.',

  /** Empty state: search returned no results. {{query}} is replaced with the search term. */
  emptySearch: 'No results for "{{query}}".',
}
