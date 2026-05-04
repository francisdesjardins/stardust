import type { CachedState } from '@stardust/core';

export const cachedStatusColor: Record<
  CachedState<unknown>['status'],
  'default' | 'info' | 'success' | 'warning' | 'error'
> = {
  idle: 'default',
  pending: 'info',
  fresh: 'success',
  expired: 'warning',
  rejected: 'error',
};
