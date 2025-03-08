export { store } from './methods/store'
export { atom } from './methods/atom'
export { group } from './methods/group'
export { select } from './methods/select'
export { nested } from './methods/nested'
export { derived } from './methods/derived'

/*
todo:
optics
sub fn with custom selector (atom and select)
pick, use, etc. on group
nested over atom
middleware
devtools
persistence
immer
X typings
select.set
think about actions (fns in stores)
cleanup of errors in selectors in respsect to deps (must be resilient)
store context and global version
object atom that creates atoms for each key to isolate updates
slice method that is just a group that unwraps?
derived atoms
prevent atoms from being returned in nested
*/

/*
note in readme:

no zombie child problem
no need to repeat functions for hook and non-hook versions
changes in one atom notify only relevant subscribers, so you cn put everything in one store
supposed to keep global stuff in one store and then smaller stores for context stuff
*/
