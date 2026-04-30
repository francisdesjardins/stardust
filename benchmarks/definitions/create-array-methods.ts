/**
 * createArrayMethods — typed array CRUD operations on a store slice.
 * Internally: add uses structuredClone+spread, remove uses toSpliced,
 * set uses Array.with, setByPath uses copyOnWritePath+with, move uses splice,
 * upsert uses findIndex+with (hit) or spread+push (miss).
 */

import { createArrayMethods, createStore } from '@stardust/core';
import { bench, group } from '../mitata.ts';

type Phone = { number: string; label: string; meta: { primary: boolean } };

const PHONE_DEFAULTS: Phone = { number: '', label: 'mobile', meta: { primary: false } };

const ARRAY_INITIAL = {
  phones: [
    { number: '5141234567', label: 'home', meta: { primary: true } },
    { number: '5149876543', label: 'work', meta: { primary: false } },
    { number: '4381112222', label: 'mobile', meta: { primary: false } },
  ] as Phone[],
};

const phoneOps = createArrayMethods<Phone>(PHONE_DEFAULTS);

group('createArrayMethods', () => {
  bench('arrayMethods.add()', function* () {
    const store = createStore({ phones: [] as Phone[] }, (api) => ({
      phones: phoneOps.mount(api, 'phones'),
      clear() {
        api.set({ phones: [] });
      },
    }));
    yield () => {
      store.phones.add({ number: '555' });
      store.clear();
    };
  });

  bench('arrayMethods.remove()', function* () {
    const store = createStore(structuredClone(ARRAY_INITIAL), (api) => ({
      phones: phoneOps.mount(api, 'phones'),
      reset() {
        api.set(structuredClone(ARRAY_INITIAL));
      },
    }));
    yield () => {
      store.phones.remove(1);
      store.reset();
    };
  });

  bench('arrayMethods.set() partial', function* () {
    const store = createStore(structuredClone(ARRAY_INITIAL), (api) => ({
      phones: phoneOps.mount(api, 'phones'),
    }));
    yield () => store.phones.set(0, { label: 'work' });
  });

  bench('arrayMethods.setByPath()', function* () {
    const store = createStore(structuredClone(ARRAY_INITIAL), (api) => ({
      phones: phoneOps.mount(api, 'phones'),
    }));
    yield () => store.phones.setByPath(0, 'meta.primary', true);
  });

  bench('arrayMethods.move()', function* () {
    const store = createStore(structuredClone(ARRAY_INITIAL), (api) => ({
      phones: phoneOps.mount(api, 'phones'),
    }));
    yield () => {
      store.phones.move(0, 2);
      store.phones.move(2, 0);
    };
  });

  bench('arrayMethods.upsert() hit', function* () {
    const store = createStore(structuredClone(ARRAY_INITIAL), (api) => ({
      phones: phoneOps.mount(api, 'phones'),
    }));
    const needle: Phone = { number: '9999999999', label: 'work', meta: { primary: false } };
    yield () =>
      store.phones.upsert(needle, function (item) {
        return item.label === this.label;
      });
  });

  bench('arrayMethods.upsert() miss', function* () {
    const store = createStore(structuredClone(ARRAY_INITIAL), (api) => ({
      phones: phoneOps.mount(api, 'phones'),
      reset() {
        api.set(structuredClone(ARRAY_INITIAL));
      },
    }));
    const needle: Phone = { number: '9999999999', label: 'fax', meta: { primary: false } };
    yield () => {
      store.phones.upsert(needle, function (item) {
        return item.label === this.label;
      });
      store.reset();
    };
  });
});
