# glyx

The declarative state management library.

```bash
npm i glyx
```

```ts
const $ = store(() => {
  const count = atom(1)
  const expensive = derived(() => count.get() ** 10)
  const mult = select((factor: number) => count.get() * factor)

  const increment = () => count.set(count.get() + 1)

  return { count, expensive, mult, increment }
})

$.increment()
// .get() and .use()
$.count.get() // 2
$.expensive.get() // 1024
$.mult.get(10) // 20

const { count, expensive } = $.pick(['count', 'expensive']).get()
```
