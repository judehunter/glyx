export { store } from './methods/store'
export { atom } from './methods/atom'
export { group } from './methods/group'
export { select } from './methods/select'
export { nested } from './methods/nested'

/*
todo:
optics
sub fn with custom selector (atom and select)
pick, use, etc. on group
nested over atom
middleware
typings
select.set
think about actions (fns in stores)
cleanup of errors in selectors in respsect to deps (must be resiliant)
store context and global version
*/

/*
note in readme:

no zombie child problem
no need to repeat functions for hook and non-hook versions
changes in one atom notify only relevant subscribers, so you cn put everything in one store
supposed to keep global stuff in one store and then smaller stores for context stuff
*/
