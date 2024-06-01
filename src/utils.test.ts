import { expect, test, vi } from 'vitest';
import {
  adjacencyListToClosureTable,
  dependenciesToDependants,
  getTransitiveDependants,
  mergeDependants,
} from './utils';

test('dependencies to dependants', () => {
  const adjList = {
    a: ['b', 'c'],
    b: ['c'],
    c: ['d', 'b'],
    d: [],
  };
  expect(dependenciesToDependants(adjList)).toEqual({
    b: ['a', 'c'],
    c: ['a', 'b'],
    d: ['c'],
  });
});

test('adjacency list to closure table', () => {
  const adjList = {
    a: ['b', 'c'],
    b: ['c'],
    c: ['d', 'b'],
    d: [],
  };
  expect(adjacencyListToClosureTable(adjList)).toEqual([
    ['a', 'b'],
    ['a', 'c'],
    ['b', 'c'],
    ['c', 'd'],
    ['c', 'b'],
  ]);
});

test('transitive dependants', () => {
  const dependencies = {
    a: [],
    b: ['a'],
    c: ['b'],
    d: ['a'],
    e: ['c', 'd'],
    f: [],
  };
  const dependants = dependenciesToDependants(dependencies);

  expect(getTransitiveDependants(dependants, 'a').sort()).toEqual([
    'b',
    'c',
    'd',
    'e',
  ]);

  expect(getTransitiveDependants(dependants, 'b').sort()).toEqual(['c', 'e']);

  expect(getTransitiveDependants(dependants, 'c').sort()).toEqual(['e']);

  expect(getTransitiveDependants(dependants, 'd').sort()).toEqual(['e']);

  expect(getTransitiveDependants(dependants, 'e').sort()).toEqual([]);
});

test('mergeDependants', () => {
  const a = {
    a: ['b'],
    b: ['c', 'e'],
    c: ['d', 'e'],
  };
  const b = {
    b: ['c', 'd'],
    c: ['b'],
  };
  expect(mergeDependants(a, b)).toEqual({
    a: ['b'],
    b: ['c', 'e', 'd'],
    c: ['d', 'e', 'b'],
  });
});
