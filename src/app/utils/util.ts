import _ from 'lodash';
import { tempContainer } from './temp-container';

/**
 * Count the number of values in the list that pass the predicate.
 */
export function count<T>(
  list: readonly T[],
  predicate: (value: T) => boolean | null | undefined
): number {
  return _.sumBy(list, (item) => (predicate(item) ? 1 : 0));
}

/**
 * A single-pass filter and map function. Returning `undefined` from the mapping
 * function will skip the value. Falsy values are still included!
 *
 * Similar to https://doc.rust-lang.org/std/iter/trait.Iterator.html#method.filter_map
 */
export function filterMap<In, Out>(
  list: readonly In[],
  fn: (value: In, index: number) => Out | undefined
): Out[] {
  const result: Out[] = [];
  for (let i = 0; i < list.length; i++) {
    const mapped = fn(list[i], i);
    if (mapped !== undefined) {
      result.push(mapped);
    }
  }
  return result;
}

// Create a type from the keys of an object type that map to values of type PropType
type PropertiesOfType<T, PropType> = keyof {
  [K in keyof T as T[K] extends PropType ? K : never]: T[K];
};

/**
 * This is similar to _.keyBy, but it specifically handles keying multiple times per item, where
 * the keys come from an array property.
 *
 * given the key 'key', turns
 * [           { key: [1, 3] },      { key: [2, 4] } ]
 * into { '1': { key: [1, 3] }, '2': { key: [2, 4], '3': { key: [1, 3] }, '4': { key: [2, 4] } }
 */
export function objectifyArray<T>(array: T[], key: PropertiesOfType<T, any[]>): NodeJS.Dict<T> {
  return array.reduce<NodeJS.Dict<T>>((acc, val) => {
    const prop = val[key] as string[];
    for (const eachKeyName of prop) {
      acc[eachKeyName] = val;
    }
    return acc;
  }, {});
}

/**
 * Produce a function that can memoize a calculation about an item. The cache is backed by
 * a WeakMap so when the item is garbage collected the cache is freed up too.
 */
export function weakMemoize<T extends object, R>(func: (arg0: T) => R): (arg1: T) => R {
  const cache = new WeakMap<T, R>();
  return (arg: T): R => {
    if (cache.has(arg)) {
      return cache.get(arg)!;
    }

    const value = func(arg);
    cache.set(arg, value);
    return value;
  };
}

/**
 * Transform an async function into a version that will only execute once at a time - if there's already
 * a version going, the existing promise will be returned instead of running it again.
 */
export function dedupePromise<T extends unknown[], K>(
  func: (...args: T) => Promise<K>
): (...args: T) => Promise<K> {
  let promiseCache: Promise<K> | null = null;
  return async (...args: T) => {
    if (promiseCache) {
      return promiseCache;
    }
    promiseCache = func(...args);
    try {
      return await promiseCache;
    } finally {
      promiseCache = null;
    }
  };
}

// setTimeout as a promise
export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Copy a string to the clipboard */
export function copyString(str: string) {
  navigator.clipboard.writeText(str);
}

/** Download a string as a file */
export function download(data: string, filename: string, type: string) {
  const a = document.createElement('a');
  a.setAttribute('href', `data:${type};charset=utf-8,${encodeURIComponent(data)}`);
  a.setAttribute('download', filename);
  tempContainer.appendChild(a);
  a.click();
  setTimeout(() => tempContainer.removeChild(a));
}

/**
 * Given an index into an array, which may exceed the bounds of the array in either direction,
 * return a new index that "wraps around".
 *
 * @example
 * [0, 1][wrap(-1, 2)] === 1
 */
export const wrap = (index: number, length: number) => {
  while (index < 0) {
    index += length;
  }
  while (index >= length) {
    index -= length;
  }
  return index;
};

/**
 * A faster replacement for _.uniqBy that uses a Set internally
 */
export function uniqBy<T, K>(data: Iterable<T>, iteratee: (input: T) => K): T[] {
  const dedupe = new Set<K>();
  const result: T[] = [];
  for (const d of data) {
    const mapped = iteratee(d);
    if (!dedupe.has(mapped)) {
      result.push(d);
      dedupe.add(mapped);
    }
  }
  return result;
}

/**
 * Immutably reorder a list by moving an element at index `startIndex` to
 * `endIndex`. Helpful for drag and drop. Returns a copy of the initial list.
 */
export function reorder<T>(list: T[], startIndex: number, endIndex: number): T[] {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
}

/**
 * Produce an error message either from an Error object, or a stringy
 * representation of a non-Error object. Meant to be used when displaying or
 * logging errors from catch blocks.
 */
export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : JSON.stringify(e);
}

/**
 * If the parameter is not an Error, wrap a stringified version of it in an
 * Error. Meant to be used from catch blocks where the thrown type is not known.
 */
export function convertToError(e: unknown): Error {
  if (e instanceof Error) {
    return e;
  }
  return new Error(JSON.stringify(e));
}
