export let GET_INTERNALS: () => {state; dependents; notify} = null!;

export let SET_INTERNALS = (val: ReturnType<typeof GET_INTERNALS>) => (GET_INTERNALS = () => val);
