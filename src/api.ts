declare const store: any;
declare const group: any;
declare const atom: any;
declare const optic: any;
declare const select: any;

/*
 * manual usage without existing optic:
 *
 * optic.get(...).set(...)
 *
 * allows for specifying only one of the methods too
 *
 * not sure about this
 */

export const $ = store(() => {
  const canvas = group(() => {
    const nodes = atom([{id: 1}, {id: 2}, {id: 3}]);
    const edges = atom([
      {id: 1, source: 1, target: 2},
      {id: 2, source: 2, target: 3},
    ]);

    const hasNodes = select(() => !!nodes.get().length);

    const nodeById = select(
      (id: number) => optic(nodes).find((node) => node.id === id),

      (node) => {
        const nodeText = select(
          () => node.get().title + ' ' + node.get().description,
        );

        return {nodeText};
      },
    );

    const edgeById = select((id: number) =>
      optic(edges).find((edge) => edge.id === id),
    );

    return {
      nodes,
      edges,
      hasNodes,
      nodeById,
      edgeById,
    };
  });

  return {canvas};
});

$.canvas.nodes.get(); // .use(), .set()
$.canvas.edges.get(); // .use(), .set()
$.canvas.hasNodes.get(); // .use()
$.canvas.nodeById(1).get(); // .use(), .set()
$.canvas.nodeById(1).nodeText.get(); // .use()
$.canvas.edgeById(1).get(); // .use(), .set()
