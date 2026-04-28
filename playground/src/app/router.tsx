import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  redirect,
} from '@tanstack/react-router';
import { RootLayout } from '@/widgets/root-layout';

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw redirect({ to: '/getting-started' });
  },
});

const gettingStartedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/getting-started',
  component: lazyRouteComponent(() => import('@/pages/getting-started'), 'GettingStartedPage'),
});

const reactRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/react',
  component: lazyRouteComponent(() => import('@/pages/react'), 'ReactPage'),
});

const solidRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/solid',
  component: lazyRouteComponent(() => import('@/pages/solid'), 'SolidPage'),
});

const utilitiesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/utilities',
  component: lazyRouteComponent(() => import('@/pages/utilities'), 'UtilitiesPage'),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  gettingStartedRoute,
  reactRoute,
  solidRoute,
  utilitiesRoute,
]);

const history = import.meta.env['VITE_HASH_ROUTER'] === 'true' ? createHashHistory() : undefined;

export const router = createRouter({ routeTree, ...(history ? { history } : {}) });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
