import { beforeAll, expect, test, vi } from 'vitest';
import { atom, store as _store, select } from '.';
import { act, render, renderHook } from '@testing-library/react';
import React from 'react';
import { revealTestInternals } from './utils';
import { Action, Atom, Internal, NestedStoreLocatorArgs } from './types';

const store = <TStoreDefinition extends Record<string, Atom | Action>>(
  args: () => TStoreDefinition,
) => revealTestInternals(_store(args));

test('basic store with atoms', () => {
  const s = store(() => {
    const counter = atom(0);
    const foo = atom('abc');
    return { counter, foo };
  });
  expect(s.get()).toEqual({ counter: 0, foo: 'abc' });
});

test('atom called illegally', () => {
  const s1 = () =>
    store(() => {
      const counter = atom(0);
      counter.get();
      return { counter };
    });
  expect(s1).toThrowError("Atom's get method called illegally");

  const s2 = () =>
    store(() => {
      const counter = atom(0);
      counter.use();
      return { counter };
    });
  expect(s2).toThrowError("Atom's use method called illegally");

  const s3 = () =>
    store(() => {
      const counter = atom(0);
      counter.set(1);
      return { counter };
    });
  expect(s3).toThrowError("Atom's set method called illegally");
});

test('initial state of derived atoms', () => {
  const s = store(() => {
    const counter = atom(5);
    const doubled = atom(() => counter.use() * 2);
    const quadrupled = atom(() => doubled.use() * 2);
    const sum = atom(() => counter.use() + doubled.use() + quadrupled.use());
    return { counter, quadrupled, doubled, sum }; // changed order
  });
  expect(s.get()).toEqual({ counter: 5, doubled: 10, quadrupled: 20, sum: 35 });
});

test('only atoms returned from store.use()', () => {
  const s = store(() => {
    const counter = atom(5);
    const doubled = atom(() => counter.use() * 2);
    const quadrupled = atom(() => doubled.use() * 2);
    const foo = atom(() => counter.use() + doubled.use() + quadrupled.use());
    return { counter, quadrupled, doubled, foo };
  });

  const { result } = renderHook(() => s.use());

  expect(result.current).toEqual({
    counter: 5,
    doubled: 10,
    quadrupled: 20,
    foo: 35,
  });
});

test('lazy derived atoms', () => {
  const s = store(() => {
    const counter = atom(5);
    const increment = () => counter.set(counter.get() + 1);
    const doubled = atom(() => counter.use() * 2);
    return { counter, doubled, increment };
  });

  expect(s.__glyx_test.get()).toEqual({ counter: 5 });
  s.increment();
  expect(s.__glyx_test.get()).toEqual({ counter: 6 });
  expect(s.get()).toEqual({ counter: 6, doubled: 12 });
  s.increment();
  expect(s.get()).toEqual({ counter: 7, doubled: 14 });
});

test('get and use - atom dependency', () => {
  const s = store(() => {
    const a = atom(5);
    const b = atom(() => a.use() * 2);
    const c = atom(() => b.get() * 2);
    const d = atom(() => c.use() * 2);
    return { a, b, c, d };
  });

  expect(s.get()).toEqual({ a: 5, b: 10, c: 20, d: 40 });
  expect(s.__glyx_test.getDependants()).toEqual({ a: ['b'], c: ['d'] });
});

test('store.use(), .set(), derived atoms', { timeout: 100 }, async () => {
  const s = store(() => {
    const counter = atom(5);
    const increment = () => counter.set(counter.get() + 1);
    const doubled = atom(() => counter.use() * 2);
    return { counter, doubled, increment };
  });

  const spy = vi.fn();

  const { result, rerender } = renderHook(() => {
    const state = s.use();
    spy(state);
    return state;
  });

  expect(spy).toHaveBeenCalledTimes(1);
  expect(spy.mock.lastCall).toEqual([{ counter: 5, doubled: 10 }]);

  act(() => {
    s.increment();
  });

  expect(spy).toHaveBeenCalledTimes(2);
  expect(spy.mock.lastCall).toEqual([{ counter: 6, doubled: 12 }]);
});

test('store.atom.use()', () => {
  const s = store(() => {
    const counter = atom(5);
    const increment = () => counter.set(counter.get() + 1);
    const doubled = atom(() => counter.use() * 2);
    const unrelated = atom(10);
    return { counter, unrelated, doubled, increment };
  });

  const spy1 = vi.fn();
  const spy2 = vi.fn();
  const spy3 = vi.fn();

  renderHook(() => {
    const state = s.counter.use();
    spy1(state);
    return state;
  });

  renderHook(() => {
    const state = s.doubled.use();
    spy2(state);
    return state;
  });

  renderHook(() => {
    const state = s.unrelated.use();
    spy3(state);
    return state;
  });

  expect(spy1).toHaveBeenCalledTimes(1);
  expect(spy1.mock.lastCall).toEqual([5]);
  expect(spy2).toHaveBeenCalledTimes(1);
  expect(spy2.mock.lastCall).toEqual([10]);
  expect(spy3).toHaveBeenCalledTimes(1);
  expect(spy3.mock.lastCall).toEqual([10]);

  act(() => {
    s.increment();
  });

  expect(spy1).toHaveBeenCalledTimes(2);
  expect(spy1.mock.lastCall).toEqual([6]);
  expect(spy2).toHaveBeenCalledTimes(2);
  expect(spy2.mock.lastCall).toEqual([12]);
  expect(spy3).toHaveBeenCalledTimes(1);
  expect(spy3.mock.lastCall).toEqual([10]);
});

test('set derived atom', () => {
  const s = store(() => {
    const counter = atom(5);
    const doubled = atom(
      () => counter.use() * 2,
      (val) => counter.set(val / 2),
    );
    const quadrupled = atom(
      () => doubled.use() * 2,
      (val) => doubled.set(val / 2),
    );
    return { counter, doubled, quadrupled };
  });

  expect(s.get()).toEqual({ counter: 5, doubled: 10, quadrupled: 20 });

  s.doubled.set(20);

  expect(s.get()).toEqual({ counter: 10, doubled: 20, quadrupled: 40 });

  s.quadrupled.set(80);

  expect(s.get()).toEqual({ counter: 20, doubled: 40, quadrupled: 80 });
});

test.todo('paths', () => {
  const s = store(() => {
    const a = atom([1, 2]);
    const a2 = atom(() => a.use().map((v) => v * 2));
    const b = select(
      (idx: number) => ({
        get: () => a.use()[idx],
        set: (val) => a.set(a.use().map((v, i) => (i === idx ? val : v))),
      }),
      (ab) => {
        const c = atom(() => ab.use() * 2);
        return { c };
      },
    );
    return { a, b };
  });

  // expect(s.a.)
});

test('nested store', () => {
  const s = store(() => {
    const a = atom([1, 2]);
    const b = select(
      (idx: number) => ({
        get: () => a.use()[idx],
        set: (val) => a.set(a.use().map((v, i) => (i === idx ? val : v))),
      }),
      (ab) => {
        const c = atom(() => ab.use() * 2);
        return { c };
      },
    );
    return { a, b };
  });

  s.b(0);

  expect(s.__glyx_test.get()).toEqual({ a: [1, 2], b: new WeakMap() });
});

test.only('new impl', () => {
  const s = store(() => {
    const counter = atom(1);
    const mult = select(
      (mult) => [() => counter.use() * mult],
      {
        memo: true,
      },
      (a) => {
        const double = select(() => [() => '' + a.use() * 2], {
          memo: true,
        });
        const test = () => {};
        return { double, test };
      },
    );
    return { counter, mult };
  });

  /*
  mult: ([5]) -> {
    value: 5,
    selectors: {
      double: ([]) -> {
        value: 10
      }
    }
  }

  {
    selects: {
      mult: [
        [5] -> {
          value: 5,
          selects: {
            double: [
              [] -> {
                value: 10
              }
            ]
          }
        }
      ]
    }
  }
  */

  s.mult(5).double().get();

  // const doubleCounter = select(
  //   () => [() => 2],
  //   {
  //     memo: true,
  //   },
  //   (a) => {
  //     const quadrupleCounter = select(() => [() => a.use() * 2], {
  //       memo: true,
  //     });
  //     const test = () => {};
  //     return { quadrupleCounter, test };
  //   },
  // );

  // type Test = typeof doubleCounter.__glyx.test;
  // type Test2 = typeof doubleCounter.__glyx.test2;
  // type Test3 = typeof doubleCounter.__glyx.test3;
  // console.log(s.__glyx_test.get());
  // console.log(s.__glyx_test.getDependants());
  // console.log(s.doubleCounter().get());
  // console.log(s.__glyx_test.get());
  // console.log(s.__glyx_test.getDependants());
});
