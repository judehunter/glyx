import { expect, test, vi } from 'vitest';
import { atom, store } from '.';
import { act, render, renderHook } from '@testing-library/react';
import React from 'react';

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

test('store.use(), .set(), derived atoms', () => {
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
