import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Custom test fixtures for OpenHQM Router Manager E2E tests
 * Provides common utilities and helpers for testing
 */

/**
 * Helper functions for E2E tests
 */
export class RouteManagerHelpers {
  constructor(private page: Page) {}

  /**
   * Navigate to the application
   */
  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for the application to be ready
   */
  async waitForAppReady() {
    await this.page.waitForSelector('[data-testid="app-container"]', {
      timeout: 10000,
    });
  }

  /**
   * Helper to select an option in MUI Select component
   */
  async selectMUIOption(selectDataTestId: string, optionValue: string) {
    // Click the select to open the dropdown
    await this.page.click(`[data-testid="${selectDataTestId}"]`);
    // Wait for menu to open and click the option
    await this.page.click(`li[data-value="${optionValue}"]`, { timeout: 2000 });
  }

  /**
   * Create a new route through the UI
   */
  async createRoute(routeName: string) {
    await this.page.click('[data-testid="new-route-button"]');
    await this.page.waitForSelector('[data-testid="route-editor"]');
    await this.page.fill('[data-testid="route-name-input"]', routeName);
  }

  /**
   * Fill in route conditions
   */
  async addCondition(field: string, operator: string, value: string) {
    await this.page.click('[data-testid="add-condition-button"]');
    await this.page.fill('[data-testid="condition-field-input"]', field);
    await this.selectMUIOption('condition-operator-select', operator);
    await this.page.fill('[data-testid="condition-value-input"]', value);
  }

  /**
   * Add JQ transform
   */
  async addTransform(jqExpression: string) {
    await this.page.click('[data-testid="enable-transform-toggle"]');
    await this.page.fill('[data-testid="jq-expression-editor"]', jqExpression);
  }

  /**
   * Save the current route
   */
  async saveRoute() {
    await this.page.click('[data-testid="save-route-button"]');
    await this.page.waitForSelector('[data-testid="save-success-message"]', {
      timeout: 5000,
    });
  }

  /**
   * Select a route from the list
   */
  async selectRoute(routeName: string) {
    await this.page.click(`[data-testid="route-item-${routeName}"]`);
  }

  /**
   * Delete a route
   */
  async deleteRoute(routeName: string) {
    await this.page.click(`[data-testid="route-item-${routeName}"] [data-testid="delete-button"]`);
    await this.page.click('[data-testid="confirm-delete-button"]');
  }

  /**
   * Open JQ Playground
   */
  async openJQPlayground() {
    await this.page.click('[data-testid="jq-playground-tab"]');
    await this.page.waitForSelector('[data-testid="jq-playground"]');
  }

  /**
   * Test JQ expression in playground
   */
  async testJQExpression(expression: string, input: any) {
    await this.page.fill('[data-testid="jq-input-editor"]', JSON.stringify(input, null, 2));
    await this.page.fill('[data-testid="jq-expression-editor"]', expression);
    await this.page.click('[data-testid="run-transform-button"]');
  }

  /**
   * Open Simulator
   */
  async openSimulator() {
    await this.page.click('[data-testid="simulator-tab"]');
    await this.page.waitForSelector('[data-testid="simulator"]');
  }

  /**
   * Run simulation
   */
  async runSimulation(payload: any) {
    await this.page.fill(
      '[data-testid="simulation-payload-editor"]',
      JSON.stringify(payload, null, 2)
    );
    await this.page.click('[data-testid="run-simulation-button"]');
    await this.page.waitForSelector('[data-testid="simulation-results"]', {
      timeout: 10000,
    });
  }

  /**
   * Export configuration as YAML
   */
  async exportConfigMap() {
    await this.page.click('[data-testid="export-button"]');
    await this.page.click('[data-testid="export-yaml-option"]');
  }

  /**
   * Import configuration
   */
  async importConfigMap(yamlContent: string) {
    await this.page.click('[data-testid="import-button"]');
    await this.page.fill('[data-testid="import-textarea"]', yamlContent);
    await this.page.click('[data-testid="import-confirm-button"]');
  }

  /**
   * Get text content of an element
   */
  async getText(selector: string): Promise<string> {
    return (await this.page.textContent(selector)) || '';
  }

  /**
   * Check if element is visible
   */
  async isVisible(selector: string): Promise<boolean> {
    return await this.page.isVisible(selector);
  }

  /**
   * Wait for element
   */
  async waitForElement(selector: string, timeout = 5000) {
    await this.page.waitForSelector(selector, { timeout });
  }

  /**
   * Take screenshot
   */
  async screenshot(name: string) {
    await this.page.screenshot({
      path: `screenshots/${name}.png`,
      fullPage: true,
    });
  }
}

// Extended test object with custom fixtures
export const test = base.extend<{
  cleanLocalStorage: void;
  sampleRoute: any;
  samplePayload: any;
  helpers: RouteManagerHelpers;
}>({
  // Fixture to clean localStorage before each test
  cleanLocalStorage: [
    async ({ page }, use) => {
      await page.goto('/');
      await page.evaluate(() => localStorage.clear());
      await use();
    },
    { auto: true },
  ],

  // Helper functions fixture
  helpers: async ({ page }, use) => {
    const helpers = new RouteManagerHelpers(page);
    await use(helpers);
  },

  // Sample route for testing
  sampleRoute: {
    id: 'test-route-001',
    name: 'Test High Priority Route',
    description: 'Test route for E2E testing',
    enabled: true,
    priority: 100,
    conditions: [
      {
        type: 'payload',
        field: 'order.priority',
        operator: 'equals',
        value: 'high',
      },
    ],
    conditionOperator: 'AND',
    transform: {
      enabled: true,
      jqExpression: '{ orderId: .order.id, priority: "HIGH" }',
      errorHandling: 'fail',
    },
    destination: {
      type: 'endpoint',
      target: 'order-service-high',
      endpoint: 'order-service-high',
    },
  },

  // Sample payload for testing
  samplePayload: {
    order: {
      id: 12345,
      priority: 'high',
      customer: {
        id: 'CUST-001',
        name: 'Test Customer',
      },
      items: [
        { sku: 'ITEM-001', quantity: 2 },
        { sku: 'ITEM-002', quantity: 1 },
      ],
    },
  },
});

export { expect };
