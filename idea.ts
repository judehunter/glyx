declare const store: any;
declare const atom: any;
declare const select: any;
declare const evt: <T>() => void;
declare const nested: any;
declare const optic: any;

const foo = store(() => {
  const counter = atom(5);
  const multipliedBy = select((factor: number) => [counter.use() * factor]);

  const users = atom([]);

  let userById = select(
    (id: number) => [users.use().find((user) => user.id === id)],

    {
      memo: true,
    },

    (user) => {
      const fullName = select(
        () => user.use().firstName + ' ' + user.use().lastName,
      );
    },
  );

  const onShakeLogInButton = evt<{ strength: number }>();

  return { counter, multipliedBy, userById };
});

foo.counter.get(); // 5
foo.multipliedBy(2).get(); // 10

// dependants: { counter: ['multipliedBy'] }

const canvasStore = store(() => {
  const nodes = atom([]);
  const edges = atom([]);

  const nodesCount = select(() => [() => nodes.use().length]);

  const nodeById = select(
    // (id: string) => [
    //   () => nodes.use().find((node) => node.id === id),
    //   (value) => nodes.set(nodes.use().map((node) => (node.id === id ? value : node)))
    // ],

    (id: string) => optic(nodes.use()).find((node) => node.id === id),

    {
      memo: true,
    },

    (node) => {
      const patch = (value) => {
        node.set({ ...node.use(), ...value });
      };

      const nodeType = select(() => node.use().type)

      return { patch };
    },
  );
});

canvasStore.nodes.get().set.use;
canvasStore.nodesCount.use();

canvasStore.nodeById('abc').use();
canvasStore.nodeById('abc').patch({});
canvasStore.nodeById('abc').type.use();