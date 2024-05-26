import { expect, test } from 'vitest';
import { atom, store } from '.';

test('basic store with atoms', () => {
  const s = store(() => {
    const counter = atom(0);
    const foo = atom('abc');
    return { counter, foo };
  });

  expect(s.get()).toEqual({ counter: 0, foo: 'abc' });
});

test('derived atoms', () => {
  const s = store(() => {
    const counter = atom(5);
    const doubled = atom(() => counter.get() * 2);
    const quadrupled = atom(() => doubled.get() * 2);
    const foo = atom(() => counter.get() + doubled.get() + quadrupled.get());
    return { counter, quadrupled, doubled, foo }; // changed order
  });
  expect(s.get()).toEqual({ counter: 5, doubled: 10, quadrupled: 20, foo: 35 });
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
