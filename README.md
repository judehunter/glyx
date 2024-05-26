# glyx

The declarative state management library.

````ts
const canvas = store(() => {
  const nodes = atom([]);
  const edges = atom([]);

  const nodeCount = atom(() => nodes.use().length);

  /**
   * nodeById is a function that returns a nested store
   * by making a list of derived atoms behind the scenes, here:
   * ```ts
   * id => atom(() => nodes.use().find(x => x.id === id))
   * ```
   */
  const nodeById = store(
    // the optic creates a drillable getter and setter
    (id: number) => optic(nodes).find((e) => e.id === id),
    // this is the equivalent defined manually:
    // (id: number) => nodes.get().find((u: any) => u.id === id),
    // (id: number, node: any) =>
    //   nodes.set([...nodes.get().filter((u: any) => u.id !== id), node]),

    (node: any /* derived atom for this id */) => {
      // read-write manually derived atom
      const width = atom(
        () => node.use().width,
        (width: any) => node.set({ ...node.get(), width }),
      );
      // derived atom using an optic
      const height = atom(optic(node).prop('height'));

      // read-only manually derived atom
      const internalHeight = atom(() => height.use() - 2 * NODE_BORDER_WIDTH);

      return { width, height, internalHeight };
    },
  );

  const deleteNode = (id: number) => {
    nodes.set(nodes.get().filter((u: any) => u.id !== id));
  };

  return { nodes, edges, nodeCount, nodeById, deleteNode };
});

canvas.use(); // .get(), .set()
canvas.nodes.use();
canvas.edges.use();
canvas.nodeCount.use();
canvas.nodeById(123).use(); // { width }
canvas.nodeById(123).width.use();

// notifies: nodeById(123).width, nodeById(123), nodes (and nodeCount), canvas
canvas.nodeById(123).width.set(100);

canvas.deleteNode(123);
````
