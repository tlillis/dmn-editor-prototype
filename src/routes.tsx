import {
  Outlet,
  Router,
  createRootRoute,
  createRoute,
} from '@tanstack/react-router'
import { EditorPage } from './features/editor'
import { ConstantsPage } from './features/constants'
import { ScreenerPage } from './features/screener'

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

export const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: EditorPage,
})

export const constantsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/constants',
  component: ConstantsPage,
})

export const screenerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/screener',
  component: ScreenerPage,
})

export const routeTree = rootRoute.addChildren([
  homeRoute,
  constantsRoute,
  screenerRoute,
])

export const router = new Router({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
