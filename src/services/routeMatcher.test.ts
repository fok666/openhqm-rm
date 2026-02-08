import { describe, it, expect, beforeAll } from 'vitest';
import { RouteMatcher } from './routeMatcher';
import type { Route, SimulationContext } from '../types';

describe('RouteMatcher', () => {
  let routeMatcher: RouteMatcher;

  beforeAll(() => {
    routeMatcher = new RouteMatcher();
  });

  const createMockRoute = (overrides?: Partial<Route>): Route => ({
    id: 'route-001',
    name: 'Test Route',
    enabled: true,
    priority: 100,
    conditions: [],
    conditionOperator: 'AND',
    actions: [],
    destination: {
      type: 'endpoint',
      target: 'test-endpoint',
    },
    ...overrides,
  });

  const createMockContext = (payload?: any): SimulationContext => ({
    id: 'sim-001',
    timestamp: new Date().toISOString(),
    input: {
      payload: payload || { order: { priority: 'high' } },
      headers: { 'Content-Type': 'application/json' },
      metadata: {},
    },
    trace: [],
    output: {
      actions: [],
      errors: [],
    },
    metrics: {
      totalDuration: 0,
      matchingDuration: 0,
      transformDuration: 0,
    },
  });

  describe('matchRoute', () => {
    it('should match route with no conditions', async () => {
      const routes = [createMockRoute()];
      const context = createMockContext();

      const matched = await routeMatcher.matchRoute(routes, context);

      expect(matched).toBeDefined();
      expect(matched?.id).toBe('route-001');
    });

    it('should return null when no routes match', async () => {
      const routes = [
        createMockRoute({
          conditions: [
            {
              type: 'payload',
              field: 'order.priority',
              operator: 'equals',
              value: 'low',
            },
          ],
        }),
      ];
      const context = createMockContext({ order: { priority: 'high' } });

      const matched = await routeMatcher.matchRoute(routes, context);

      expect(matched).toBeNull();
    });

    it('should skip disabled routes', async () => {
      const routes = [
        createMockRoute({ enabled: false, priority: 200 }),
        createMockRoute({ enabled: true, priority: 100 }),
      ];
      const context = createMockContext();

      const matched = await routeMatcher.matchRoute(routes, context);

      expect(matched).toBeDefined();
      expect(matched?.priority).toBe(100);
    });

    it('should match route with highest priority', async () => {
      const routes = [
        createMockRoute({ id: 'low-priority', priority: 50 }),
        createMockRoute({ id: 'high-priority', priority: 200 }),
        createMockRoute({ id: 'medium-priority', priority: 100 }),
      ];
      const context = createMockContext();

      const matched = await routeMatcher.matchRoute(routes, context);

      expect(matched?.id).toBe('high-priority');
    });
  });

  describe('evaluateConditions', () => {
    it('should evaluate AND conditions correctly', async () => {
      const route = createMockRoute({
        conditions: [
          {
            type: 'payload',
            field: 'order.priority',
            operator: 'equals',
            value: 'high',
          },
          {
            type: 'payload',
            field: 'order.id',
            operator: 'exists',
          },
        ],
        conditionOperator: 'AND',
      });
      const context = createMockContext({ order: { id: 123, priority: 'high' } });

      const result = await routeMatcher.evaluateConditions(route, context);

      expect(result).toBe(true);
    });

    it('should evaluate OR conditions correctly', async () => {
      const route = createMockRoute({
        conditions: [
          {
            type: 'payload',
            field: 'order.priority',
            operator: 'equals',
            value: 'low',
          },
          {
            type: 'payload',
            field: 'order.priority',
            operator: 'equals',
            value: 'high',
          },
        ],
        conditionOperator: 'OR',
      });
      const context = createMockContext({ order: { priority: 'high' } });

      const result = await routeMatcher.evaluateConditions(route, context);

      expect(result).toBe(true);
    });

    it('should return false when AND conditions not all met', async () => {
      const route = createMockRoute({
        conditions: [
          {
            type: 'payload',
            field: 'order.priority',
            operator: 'equals',
            value: 'high',
          },
          {
            type: 'payload',
            field: 'order.priority',
            operator: 'equals',
            value: 'low',
          },
        ],
        conditionOperator: 'AND',
      });
      const context = createMockContext({ order: { priority: 'high' } });

      const result = await routeMatcher.evaluateConditions(route, context);

      expect(result).toBe(false);
    });
  });

  describe('payload conditions', () => {
    it('should evaluate equals operator', async () => {
      const route = createMockRoute({
        conditions: [
          {
            type: 'payload',
            field: 'order.priority',
            operator: 'equals',
            value: 'high',
          },
        ],
      });
      const context = createMockContext({ order: { priority: 'high' } });

      const matched = await routeMatcher.matchRoute([route], context);

      expect(matched).toBeDefined();
    });

    it('should evaluate contains operator', async () => {
      const route = createMockRoute({
        conditions: [
          {
            type: 'payload',
            field: 'order.description',
            operator: 'contains',
            value: 'urgent',
          },
        ],
      });
      const context = createMockContext({ order: { description: 'This is urgent' } });

      const matched = await routeMatcher.matchRoute([route], context);

      expect(matched).toBeDefined();
    });

    it('should evaluate exists operator', async () => {
      const route = createMockRoute({
        conditions: [
          {
            type: 'payload',
            field: 'order.id',
            operator: 'exists',
          },
        ],
      });
      const context = createMockContext({ order: { id: 123 } });

      const matched = await routeMatcher.matchRoute([route], context);

      expect(matched).toBeDefined();
    });

    it('should evaluate regex operator', async () => {
      const route = createMockRoute({
        conditions: [
          {
            type: 'payload',
            field: 'order.email',
            operator: 'regex',
            value: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
          },
        ],
      });
      const context = createMockContext({ order: { email: 'test@example.com' } });

      const matched = await routeMatcher.matchRoute([route], context);

      expect(matched).toBeDefined();
    });

    it('should handle nested field access', async () => {
      const route = createMockRoute({
        conditions: [
          {
            type: 'payload',
            field: 'order.customer.type',
            operator: 'equals',
            value: 'premium',
          },
        ],
      });
      const context = createMockContext({
        order: { customer: { type: 'premium' } },
      });

      const matched = await routeMatcher.matchRoute([route], context);

      expect(matched).toBeDefined();
    });
  });

  describe('header conditions', () => {
    it('should evaluate header conditions', async () => {
      const route = createMockRoute({
        conditions: [
          {
            type: 'header',
            field: 'X-Priority',
            operator: 'equals',
            value: 'high',
          },
        ],
      });
      const context = createMockContext();
      context.input.headers['X-Priority'] = 'high';

      const matched = await routeMatcher.matchRoute([route], context);

      expect(matched).toBeDefined();
    });
  });

  describe('metadata conditions', () => {
    it('should evaluate metadata conditions', async () => {
      const route = createMockRoute({
        conditions: [
          {
            type: 'metadata',
            field: 'source',
            operator: 'equals',
            value: 'web',
          },
        ],
      });
      const context = createMockContext();
      context.input.metadata.source = 'web';

      const matched = await routeMatcher.matchRoute([route], context);

      expect(matched).toBeDefined();
    });
  });
});
