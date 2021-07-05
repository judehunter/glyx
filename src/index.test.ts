import {action, createStore, derived, state, watch} from '.'

const nextTick = () =>
  new Promise((res) => {
    setTimeout(res);
  });

test('state and actions', async () => {
  const store = createStore(() => {
    const counter = state(10);
    const hungry = state(false);

    const increment = action(() => (counter.$ += 1));
    const decrement = action(() => (counter.$ -= 1));
    const becomeHungry = action(() => (hungry.$ = true));
    const eat = action(() => (hungry.$ = false));
    return {counter, hungry, increment, decrement, eat, becomeHungry};
  });

  expect(store.getState()).toStrictEqual({
    counter: 10,
    hungry: false,
  });

  store.increment();
  store.becomeHungry();

  await nextTick();

  expect(store.getState()).toStrictEqual({
    counter: 11,
    hungry: true,
  });

  store.decrement();
  store.eat();

  await nextTick();

  expect(store.getState()).toStrictEqual({
    counter: 10,
    hungry: false,
  });
});

test('batching - derived should recalc once', async () => {
  let recalcs = 0;
  const store = createStore(() => {
    const counter1 = state(10);
    const counter2 = state(100);

    const sum = derived(() => {
      recalcs += 1;
      return counter1.$ + counter2.$;
    })

    const test = action(() => {
      counter1.$ = 20;
      counter2.$ = 200;
    });
    
    return {sum, test};
  });

  expect(recalcs).toEqual(1);

  store.test();

  await nextTick();

  expect(recalcs).toEqual(2);

  expect(store.getState()).toStrictEqual({
    sum: 220
  });
});

test('batching - mutating the same variable', async () => {
  const store = createStore(() => {
    const counter = state(10);

    const changeTwice = action(() => {
      counter.$ = 20;
      counter.$ = 30;
    });
    return {counter, changeTwice};
  });

  store.changeTwice();

  await nextTick();

  expect(store.getState()).toStrictEqual({
    counter: 30,
  });
});

test('action - passing arguments', async () => {
  const store = createStore(() => {
    const counter = state(10);
    const add = action((val) => (counter.$ += val));
    return {counter, add};
  });

  expect(store.getState()).toStrictEqual({
    counter: 10,
  });

  store.add(5);

  await nextTick();

  expect(store.getState()).toStrictEqual({
    counter: 15,
  });
});

test('action.setter', async () => {
  const store = createStore(() => {
    const counter = state(10);
    const set = action.setter(counter);
    return {counter, set};
  });

  expect(store.getState()).toStrictEqual({
    counter: 10,
  });

  store.set(store.getState().counter + 5);

  await nextTick();

  expect(store.getState()).toStrictEqual({
    counter: 15,
  });
});

test('action.setter - callback fn', async () => {
  const store = createStore(() => {
    const counter = state(10);
    const set = action.setter(counter);
    return {counter, set};
  });

  expect(store.getState()).toStrictEqual({
    counter: 10,
  });

  store.set((x) => x + 5);

  await nextTick();

  expect(store.getState()).toStrictEqual({
    counter: 15,
  });
});

test('two independent stores', async () => {
  const store1 = createStore(() => {
    const val = state(0);
    const increment = action(() => (val.$ += 1));
    return {val, increment};
  });
  const store2 = createStore(() => {
    const val = state(10);
    const decrement = action(() => (val.$ -= 1));
    return {val, decrement};
  });

  expect(store1.getState()).toStrictEqual({
    val: 0,
  });
  expect(store2.getState()).toStrictEqual({
    val: 10,
  });

  store1.increment();
  store2.decrement();

  await nextTick();

  expect(store1.getState()).toStrictEqual({
    val: 1,
  });
  expect(store2.getState()).toStrictEqual({
    val: 9,
  });
});

test('derived - no deps', async () => {
  const store = createStore(() => {
    const counter = state(10);
    const doubleCounter = derived(() => counter.$ * 2);

    const increment = action(() => (counter.$ += 1));

    return {counter, doubleCounter, increment};
  });

  expect(store.getState()).toStrictEqual({
    counter: 10,
    doubleCounter: 20,
  });

  store.increment();

  await nextTick();

  expect(store.getState()).toStrictEqual({
    counter: 11,
    doubleCounter: 22,
  });
});

test('derived - deps', async () => {
  let recalcs = 0;
  const store = createStore(() => {
    const counter = state(10);
    // const hungry = state(true);

    const expensive = derived(() => {
      recalcs++;
      return counter.$ * 2;
    }, [counter]);

    const increment = action(() => (counter.$ += 1));

    return {counter, expensive, increment};
  });

  expect(recalcs).toEqual(1);

  expect(store.getState()).toStrictEqual({
    counter: 10,
    expensive: 20,
  });

  store.increment();

  await nextTick();

  expect(recalcs).toEqual(2);

  expect(store.getState()).toStrictEqual({
    counter: 11,
    expensive: 22,
  });
});

test('derived - empty deps', async () => {
  let recalcs = 0;
  const store = createStore(() => {
    const counter = state(10);

    const expensive = derived(() => {
      recalcs++;
      return counter.$ * 2;
    }, []);

    const increment = action(() => (counter.$ += 1));

    return {counter, expensive, increment};
  });

  expect(recalcs).toEqual(1);

  expect(store.getState()).toStrictEqual({
    counter: 10,
    expensive: 20,
  });

  store.increment();

  await nextTick();

  expect(recalcs).toEqual(1);

  expect(store.getState()).toStrictEqual({
    counter: 11,
    expensive: 20,
  });
});

test('derived - multiple deps', async () => {
  let recalcs = 0;
  const store = createStore(() => {
    const foo = state(10);
    const bar = state(20);
    const giz = state(30);

    const sum = derived(() => {
      recalcs++;
      return foo.$ + bar.$ + giz.$;
    }, [foo, bar, giz]);

    const incrementFoo = action(() => (foo.$ += 1));
    const incrementBar = action(() => (bar.$ += 1));

    return {foo, bar, giz, sum, incrementFoo, incrementBar};
  });

  expect(recalcs).toEqual(1);

  expect(store.getState()).toStrictEqual({
    foo: 10,
    bar: 20,
    giz: 30,
    sum: 60,
  });

  store.incrementFoo();

  await nextTick();

  expect(recalcs).toEqual(2);

  expect(store.getState()).toStrictEqual({
    foo: 11,
    bar: 20,
    giz: 30,
    sum: 61,
  });

  store.incrementBar();

  await nextTick();

  expect(recalcs).toEqual(3);

  expect(store.getState()).toStrictEqual({
    foo: 11,
    bar: 21,
    giz: 30,
    sum: 62,
  });
});

test('derived - multiple deps that change at the same time', async () => {
  let recalcs = 0;
  const store = createStore(() => {
    const foo = state(10);
    const bar = state(20);
    const giz = state(30);

    const sum = derived(() => {
      recalcs++;
      return foo.$ + bar.$ + giz.$;
    }, [foo, bar, giz]);

    const incrementFoo = action(() => (foo.$ += 1));
    const incrementBarAndGiz = action(() => {
      bar.$ += 1;
      giz.$ += 1;
    });

    return {foo, bar, giz, sum, incrementFoo, incrementBarAndGiz};
  });

  expect(recalcs).toEqual(1);

  expect(store.getState()).toStrictEqual({
    foo: 10,
    bar: 20,
    giz: 30,
    sum: 60,
  });

  store.incrementFoo();

  await nextTick();

  expect(recalcs).toEqual(2);

  expect(store.getState()).toStrictEqual({
    foo: 11,
    bar: 20,
    giz: 30,
    sum: 61,
  });

  store.incrementBarAndGiz();

  await nextTick();

  expect(recalcs).toEqual(3);

  expect(store.getState()).toStrictEqual({
    foo: 11,
    bar: 21,
    giz: 31,
    sum: 63,
  });
});


test('watchers - no deps', async () => {
  let recalcs = 0;
  const store = createStore(() => {
    const counter = state(10);

    watch(() => {
      recalcs++;
    });

    const increment = action(() => (counter.$ += 1));

    return {counter, increment};
  });

  expect(recalcs).toEqual(1);

  store.increment();

  await nextTick();

  expect(recalcs).toEqual(2);
});

test('watchers - deps', async () => {
  let recalcs = 0;
  const store = createStore(() => {
    const counter = state(10);
    const hungry = state(true);

    watch(() => {
      recalcs++;
    }, [counter]);

    const increment = action(() => (counter.$ += 1));
    const eat = action(() => (hungry.$ = false));

    return {counter, increment, eat};
  });

  expect(recalcs).toEqual(0);

  store.increment();
  store.eat();

  await nextTick();

  expect(recalcs).toEqual(1);
});

test('watchers - empty deps', async () => {
  let recalcs = 0;
  const store = createStore(() => {
    const counter = state(10);

    watch(() => {
      recalcs++;
    }, []);

    const increment = action(() => (counter.$ += 1));

    return {counter, increment};
  });

  expect(recalcs).toEqual(0);

  store.increment();

  await nextTick();

  expect(recalcs).toEqual(0);
});

test('watchers - mutate state', async () => {
  const store = createStore(() => {
    const count1 = state(10);
    const count2 = state(20);

    const increment = action(() => (count1.$ += 1));

    watch(() => {
      count2.$ += 5;
    }, [count1]);

    return {count1, count2, increment};
  });

  expect(store.getState()).toStrictEqual({count1: 10, count2: 20});

  store.increment();

  await nextTick();

  expect(store.getState()).toStrictEqual({count1: 11, count2: 25});
});

test('subscribe', async () => {
  const store = createStore(() => {
    const counter = state(10);

    const increment = action(() => (counter.$ += 1));

    return {counter, increment};
  });
  const listenerPromise = () =>
    new Promise((res, rej) => {
      store.subscribe((state) => {
        res(state);
      });
      store.increment();
    });
  await expect(listenerPromise()).resolves.toStrictEqual({counter: 11});
});

test('unsubscribe', async () => {
  const store = createStore(() => {
    const counter = state(10);

    const increment = action(() => (counter.$ += 1));

    return {counter, increment};
  });
  const listenerPromise = () =>
    new Promise((res, rej) => {
      store.subscribe((state) => {
        res(state);
      })();
      store.increment();
      rej();
    });
  await expect(listenerPromise()).rejects.toStrictEqual(undefined);
});

test('mutate state during createStore', async () => {
  const store = createStore(() => {
    const counter = state(10);

    const increment = action(() => (counter.$ += 1));
    increment();

    return {counter, increment};
  });

  expect(store.getState()).toStrictEqual({
    counter: 11
  })
});

test('cause an infinite loop', async () => {
  const shouldThrow = () => {
    const store = createStore(() => {
      const counter = state(10);

      counter.$ += 1;

      return {counter};
    });
  }
  expect(shouldThrow).toThrow();
})

test.only('store previous state', async () => {
  const store = createStore(() => {
    const counter = state(10);
    let counterFrozen: number | undefined = undefined;
    const prevCounter = state<number | undefined>(undefined);

    watch(() => {
      console.log('watch', counter.$)
      prevCounter.$ = counterFrozen;
      counterFrozen = counter.$;
    }, [counter]);

    const increment = action(() => (counter.$ += 1));

    return {counter, prevCounter, increment};
  });

  expect(store.getState()).toStrictEqual({
    counter: 10,
    prevCounter: undefined
  })

  store.increment();

  await nextTick();

  expect(store.getState()).toStrictEqual({
    counter: 11,
    prevCounter: 10,
  });
})