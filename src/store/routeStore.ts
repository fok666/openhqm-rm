import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Route } from '../types';
import { storageService } from '../services';

interface RouteStore {
  routes: Route[];
  selectedRoute: Route | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadRoutes: () => void;
  setRoutes: (routes: Route[]) => void;
  selectRoute: (route: Route | null) => void;
  addRoute: (route: Omit<Route, 'id'>) => void;
  updateRoute: (id: string, updates: Partial<Route>) => void;
  deleteRoute: (id: string) => void;
  duplicateRoute: (id: string) => void;
  reorderRoutes: (startIndex: number, endIndex: number) => void;
  clearError: () => void;
}

export const useRouteStore = create<RouteStore>((set, get) => ({
  routes: [],
  selectedRoute: null,
  isLoading: false,
  error: null,

  loadRoutes: () => {
    try {
      set({ isLoading: true, error: null });
      const routes = storageService.loadRoutes();
      set({ routes, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  setRoutes: (routes) => {
    try {
      storageService.saveRoutes(routes);
      set({ routes, error: null });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  selectRoute: (route) => {
    set({ selectedRoute: route });
  },

  addRoute: (routeData) => {
    const newRoute: Route = {
      ...routeData,
      id: uuidv4(),
    };

    const routes = [...get().routes, newRoute];
    get().setRoutes(routes);
    set({ selectedRoute: newRoute });
  },

  updateRoute: (id, updates) => {
    const routes = get().routes.map((route) =>
      route.id === id ? { ...route, ...updates } : route
    );
    get().setRoutes(routes);

    // Update selected route if it's the one being updated
    const selectedRoute = get().selectedRoute;
    if (selectedRoute?.id === id) {
      set({ selectedRoute: { ...selectedRoute, ...updates } });
    }
  },

  deleteRoute: (id) => {
    const routes = get().routes.filter((route) => route.id !== id);
    get().setRoutes(routes);

    // Clear selection if deleted route was selected
    if (get().selectedRoute?.id === id) {
      set({ selectedRoute: null });
    }
  },

  duplicateRoute: (id) => {
    const route = get().routes.find((r) => r.id === id);
    if (!route) return;

    const newRoute: Route = {
      ...route,
      id: uuidv4(),
      name: `${route.name} (Copy)`,
    };

    const routes = [...get().routes, newRoute];
    get().setRoutes(routes);
  },

  reorderRoutes: (startIndex, endIndex) => {
    const routes = Array.from(get().routes);
    const [removed] = routes.splice(startIndex, 1);
    routes.splice(endIndex, 0, removed);
    get().setRoutes(routes);
  },

  clearError: () => {
    set({ error: null });
  },
}));
