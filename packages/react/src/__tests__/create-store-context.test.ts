import { expect, test } from '@playwright/test';
import type { MaybeContext, StoreApi } from '@stardust/core';
import { createStore } from '@stardust/core';

type Ctx = { multiplier: number };

test.describe('createStore — context', () => {
  test('getContext returns the value bound via setContext', () => {
    const store = createStore({ value: 0 }, ({ getContext }: StoreApi<{ value: number }, Ctx>) => ({
      compute(): number {
        return getContext().multiplier * 10;
      },
      
    }));

    store.setContext({ multiplier: 3 });
    expect(store.compute()).toBe(30);
  });

  test('getContext returns undefined when called before setContext', () => {
    const store = createStore({ value: 0 }, ({ getContext }: StoreApi<{ value: number }, Ctx>) => ({
      readCtx() {
        return getContext();
      },
      
    }));

    expect(store.readCtx()).toBeUndefined();
  });

  test('setContext can be called multiple times; last value wins', () => {
    const store = createStore({ value: 0 }, ({ getContext }: StoreApi<{ value: number }, Ctx>) => ({
      getMultiplier(): number {
        return getContext().multiplier;
      },
      
    }));

    store.setContext({ multiplier: 2 });
    expect(store.getMultiplier()).toBe(2);

    store.setContext({ multiplier: 7 });
    expect(store.getMultiplier()).toBe(7);
  });

  test('context is independent per store instance', () => {
    const makeStore = () =>
      createStore({ value: 0 }, ({ getContext }: StoreApi<{ value: number }, Ctx>) => ({
        getMultiplier(): number {
          return getContext().multiplier;
        },
        
      }));

    const storeA = makeStore();
    const storeB = makeStore();

    storeA.setContext({ multiplier: 1 });
    storeB.setContext({ multiplier: 9 });

    expect(storeA.getMultiplier()).toBe(1);
    expect(storeB.getMultiplier()).toBe(9);
  });

  test('MaybeContext store returns undefined before injection and the value after', () => {
    type Ctx = { rate: number };
    const store = createStore(
      { value: 0 },
      ({ getContext }: StoreApi<{ value: number }, MaybeContext<Ctx>>) => ({
        getRate(): number | undefined {
          return getContext()?.rate;
        },
        
      })
    );

    // Before injection — getContext() returns undefined (compile-time T | undefined)
    expect(store.getRate()).toBeUndefined();

    // After injection — getContext() returns the bound value
    store.setContext({ rate: 5 });
    expect(store.getRate()).toBe(5);
  });

  test('stores without context are unaffected', () => {
    const store = createStore({ count: 0 }, ({ update }) => ({
      increment() {
        update((d) => {
          d.count += 1;
        });
      },
      
    }));

    store.increment();
    expect(store.getSnapshot()).toEqual({ count: 1 });
  });
});
