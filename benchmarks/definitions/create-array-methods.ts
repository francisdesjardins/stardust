/**
 * createArrayMethods — typed array CRUD operations on a store slice.
 * Internally: add uses structuredClone+spread, remove uses toSpliced,
 * set uses Array.with, setByPath uses copyOnWritePath+with, move uses splice.
 */

import { createArrayMethods, createStore } from '@stardust/core';
import { bench, group } from '../mitata.ts';

type WithArray = {
  phones: Array<{ number: string; label: string; meta: { primary: boolean } }>;
};

const ARRAY_INITIAL: WithArray = {
  phones: [
    { number: '5141234567', label: 'home', meta: { primary: true } },
    { number: '5149876543', label: 'work', meta: { primary: false } },
    { number: '4381112222', label: 'mobile', meta: { primary: false } },
  ],
};
const PHONE_DEFAULTS = { number: '', label: 'mobile', meta: { primary: false } };

group('createArrayMethods', () => {
  bench('arrayMethods.add()', function* () {
    const store = createStore({ phones: [] as WithArray['phones'] }, (api) => ({
      phones: createArrayMethods(api, 'phones', PHONE_DEFAULTS),
      clear() { api.set({ phones: [] }); },
    }));
    yield () => {
      store.phones.add({ number: '555' });
      store.clear();
    };
  });

  bench('arrayMethods.remove()', function* () {
    const store = createStore(structuredClone(ARRAY_INITIAL), (api) => ({
      phones: createArrayMethods(api, 'phones', PHONE_DEFAULTS),
      reset() { api.set(structuredClone(ARRAY_INITIAL)); },
    }));
    yield () => {
      store.phones.remove(1);
      store.reset();
    };
  });

  bench('arrayMethods.set() partial', function* () {
    const store = createStore(structuredClone(ARRAY_INITIAL), (api) => ({
      phones: createArrayMethods(api, 'phones', PHONE_DEFAULTS),
    }));
    yield () => store.phones.set(0, { label: 'work' });
  });

  bench('arrayMethods.setByPath()', function* () {
    const store = createStore(structuredClone(ARRAY_INITIAL), (api) => ({
      phones: createArrayMethods(api, 'phones', PHONE_DEFAULTS),
    }));
    yield () => store.phones.setByPath(0, 'meta.primary', true);
  });

  bench('arrayMethods.move()', function* () {
    const store = createStore(structuredClone(ARRAY_INITIAL), (api) => ({
      phones: createArrayMethods(api, 'phones', PHONE_DEFAULTS),
    }));
    yield () => {
      store.phones.move(0, 2);
      store.phones.move(2, 0);
    };
  });
});
