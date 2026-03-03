/**
 * UI copy – edit these strings to adjust all user-facing text.
 * Used for empty states, buttons, and search.
 */
export const COPY = {
  /** Button to clear all visible tasks (respects filter and search) */
  clearVisibleButton: 'Remove all',

  /** Undo bar: single task deleted. {{task}} = task text */
  undoSingleDelete: '"{{task}}" removed.',

  /** Undo bar: bulk clear – 1 task. Shown when exactly one visible task was cleared */
  undoBulkClearOne: 'Removed 1 to-do.',

  /** Undo bar: bulk clear – many. {{count}} = number of tasks cleared */
  undoBulkClearMany: 'Removed {{count}} to-dos.',

  /** Empty state: no tasks at all (filter: All) */
  emptyAllPrefix: 'Add a to-do or paste a list',


  /** Empty state: no to-do tasks (filter: To do) */
  emptyTodo: 'All done! Nothing left to do!',

  /** Empty state: no done tasks (filter: Done) */
  emptyDone: 'No completed to-dos yet.',

  /** Empty state: search returned no results. {{query}} is replaced with the search term. */
  emptySearch: 'No results for "{{query}}".',

  /** Paste drawer: shown when user tries to add with no text pasted */
  pasteDrawerEmpty: 'Nothing to add—paste your list first.',

  /** More menu: Copy to-dos success toast */
  copySuccess: 'Copied successfully',

  /** More menu: Paste to-dos item */
  morePaste: 'Paste to-do list',

  /** More menu: Copy to-dos item */
  moreCopy: 'Copy to-dos',

  /** More menu: Appearance section label */
  moreAppearance: 'Appearance',

  /** More menu: Theme option – follow system preference */
  themeSystem: 'System',

  /** More menu: Theme option – light mode */
  themeLight: 'Light',

  /** More menu: Theme option – dark mode */
  themeDark: 'Dark',

  /** More menu: Background color section label */
  moreBackground: 'Background color',

  /** More menu: Sign in item */
  moreSignIn: 'Sign in',

  /** More menu: Sign out item */
  moreSignOut: 'Sign out',

  /** Gravity mode: when physics is on */
  gravityModeOn: 'Gravity mode: On',

  /** Gravity mode: when physics is off (cleanup mode) */
  gravityModeOff: 'Gravity mode: Off',

  /** Hint shown under gravity mode when off */
  gravityModeHint: 'Move cards around freely',
}
