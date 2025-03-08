export { store } from './methods/store'
export { atom } from './methods/atom'
export { group } from './methods/group'
export { select } from './methods/select'
export { nested } from './methods/nested'
export { derived } from './methods/derived'
export { watch } from './methods/watch'
export { onInit } from './methods/onInit'

/*
todo:

optics

sub fn with custom selector (atom and select)

pick, use, etc. on group

X nested over atom

middleware
devtools
X persistence
immer

X typings

select.set

X think about actions (fns in stores)

X cleanup of errors in selectors in respect to deps (must be resilient)

store context and global version

object atom that creates atoms for each key to isolate updates

slice method that is just a group that unwraps?

X derived atoms
- eqFn?

prevent atoms from being returned in nested

derived atoms should only save themselves to deps, and not the underlying atoms they derive from, to preserve fine-grained reactivity

make sub return the whole state

X batch updates because of stuff like watch (multiple listeneres that will run the same fn many times)
- batching with Promise done, but maybe could be better for derived, so that it runs before other listeners?
todo: flushing could also be done on only some changes (using a callback), since we can track and remove the pending changes

add onInit to all atoms, selects, etc. that checks if they have been initialized, and if not, error out. alternatively, register the atom then, to allow atoms that are not returned but still work? the problem is that using methods outside of a store wouldn't be allowed (maybe that's fine - just use a factory for them). update: this could be done by deferring getting the current store until the setup

remove values from pending updates that are identical? what about eqfn?

function to wrap dependencies that should not be tracked (akin to solid)

group set

maybe anon atoms should always be explicitly marked as anon to avoid mistakes?

wait for commit fn that doesn't force commit like flush and returns a promise

flush directly after store is inited?
*/

/*
note in readme:

no zombie child problem
no need to repeat functions for hook and non-hook versions
changes in one atom notify only relevant subscribers, so you cn put everything in one store
supposed to keep global stuff in one store and then smaller stores for context stuff
fine-grained reactivity
*/
