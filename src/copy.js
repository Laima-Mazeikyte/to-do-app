/**
 * UI copy – edit these strings to adjust all user-facing text.
 * Used for empty states, buttons, and search.
 */
export const COPY = {
  /** Button to clear all visible tasks (respects filter and search) */
  clearVisibleButton: 'Clear all',

  /** Undo bar: single task deleted. {{task}} = task text */
  undoSingleDelete: '"{{task}}" moved to trash.',

  /** Undo bar: bulk clear – 1 task. Shown when exactly one visible task was cleared */
  undoBulkClearOne: 'Cleared 1 task.',

  /** Undo bar: bulk clear – many. {{count}} = number of tasks cleared */
  undoBulkClearMany: 'Cleared {{count}} tasks.',

  /** Empty state: no tasks at all (filter: All). Prefix before the clickable trigger. */
  emptyAllPrefix: 'Start adding by adding a to-do or',
  /** Empty state: clickable trigger that opens the Paste to-dos drawer */
  emptyAllPasteTrigger: 'paste a to-do list',

  /** Empty state: no to-do tasks (filter: To do) */
  emptyTodo: 'All done! Nothing left to do.',

  /** Empty state: no done tasks (filter: Done) */
  emptyDone: 'No completed todos yet.',

  /** Empty state: search returned no results. {{query}} is replaced with the search term. */
  emptySearch: 'No results for "{{query}}".',

  /** Paste drawer: shown when user tries to add with no text pasted */
  pasteDrawerEmpty: 'Nothing to add—paste your list first.',

  /** More menu: Copy to-dos success toast */
  copySuccess: 'Copied successfully',

  /** More menu: Paste to-dos item */
  morePaste: 'Paste to-dos',

  /** More menu: Copy to-dos item */
  moreCopy: 'Copy to-dos',

  /** More menu: Background color section label */
  moreBackground: 'Background color',

  /** More menu: Sign in item */
  moreSignIn: 'Sign in',

  /** More menu: Sign out item */
  moreSignOut: 'Sign out',
}
