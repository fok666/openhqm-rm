import { test, expect, RouteManagerHelpers } from './fixtures';

/**
 * E2E tests for JQ Playground functionality
 * 
 * Tests cover:
 * - Basic JQ transformations
 * - Complex JQ expressions
 * - Error handling
 * - Syntax validation
 * - Live preview
 * - Example templates
 * - Expression history
 */

test.describe('JQ Playground', () => {
  let helpers: RouteManagerHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new RouteManagerHelpers(page);
    await helpers.goto();
    await helpers.waitForAppReady();
    await helpers.openJQPlayground();
  });

  test('should execute simple JQ expression', async ({ page }) => {
    const inputData = { id: 123, name: 'Test' };
    const jqExpression = '{ id: .id }';
    
    // Enter input data
    await page.fill('[data-testid="jq-input-editor"] textarea', JSON.stringify(inputData, null, 2));
    
    // Enter JQ expression
    await page.fill('[data-testid="jq-expression-editor"] textarea', jqExpression);
    
    // Run transformation
    await page.click('[data-testid="run-transform-button"]');
    
    // Wait for output
    await page.waitForSelector('[data-testid="jq-output-display"]');
    
    // Verify output
    const output = await page.textContent('[data-testid="jq-output-display"]');
    expect(output).toContain('"id": 123');
  });

  test('should handle complex nested transformations', async ({ page }) => {
    const inputData = {
      order: {
        id: 12345,
        customer: {
          id: 'CUST-001',
          name: 'John Doe',
          email: 'john@example.com'
        },
        items: [
          { sku: 'ITEM-001', quantity: 2, price: 10.50 },
          { sku: 'ITEM-002', quantity: 1, price: 25.00 }
        ]
      }
    };
    
    const jqExpression = `{
  orderId: .order.id,
  customerId: .order.customer.id,
  customerEmail: .order.customer.email,
  totalItems: (.order.items | length),
  items: [.order.items[] | { sku: .sku, qty: .quantity }]
}`;
    
    await page.fill('[data-testid="jq-input-editor"] textarea', JSON.stringify(inputData, null, 2));
    await page.fill('[data-testid="jq-expression-editor"] textarea', jqExpression);
    await page.click('[data-testid="run-transform-button"]');
    
    await page.waitForSelector('[data-testid="jq-output-display"]');
    
    const output = await page.textContent('[data-testid="jq-output-display"]');
    expect(output).toContain('orderId');
    expect(output).toContain('12345');
    expect(output).toContain('totalItems');
    expect(output).toContain('2');
  });

  test('should display syntax errors', async ({ page }) => {
    const inputData = { id: 123 };
    const invalidExpression = '{ id: .id'; // Missing closing brace
    
    await page.fill('[data-testid="jq-input-editor"] textarea', JSON.stringify(inputData, null, 2));
    await page.fill('[data-testid="jq-expression-editor"] textarea', invalidExpression);
    await page.click('[data-testid="run-transform-button"]');
    
    // Wait for error message
    await page.waitForSelector('[data-testid="jq-error-display"]');
    
    // Verify error is shown
    const errorMessage = await page.textContent('[data-testid="jq-error-display"]');
    expect(errorMessage).toContain('syntax');
  });

  test('should provide helpful error messages', async ({ page }) => {
    const inputData = { id: 123 };
    const expression = '.nonexistent.field';
    
    await page.fill('[data-testid="jq-input-editor"] textarea', JSON.stringify(inputData, null, 2));
    await page.fill('[data-testid="jq-expression-editor"] textarea', expression);
    await page.click('[data-testid="run-transform-button"]');
    
    await page.waitForSelector('[data-testid="jq-error-display"]');
    
    // Check for suggestions
    const suggestions = page.locator('[data-testid="jq-error-suggestions"]');
    await expect(suggestions).toBeVisible();
  });

  test('should use example templates', async ({ page }) => {
    // Click on examples dropdown
    await page.click('[data-testid="jq-examples-button"]');
    
    // Select an example
    await page.click('[data-testid="example-extract-fields"]');
    
    // Verify expression is populated
    const expression = await page.inputValue('[data-testid="jq-expression-editor"] textarea');
    expect(expression.length).toBeGreaterThan(0);
  });

  test('should handle array filtering', async ({ page }) => {
    const inputData = {
      items: [
        { id: 1, active: true, name: 'Item 1' },
        { id: 2, active: false, name: 'Item 2' },
        { id: 3, active: true, name: 'Item 3' }
      ]
    };
    
    const expression = '[.items[] | select(.active == true)]';
    
    await page.fill('[data-testid="jq-input-editor"] textarea', JSON.stringify(inputData, null, 2));
    await page.fill('[data-testid="jq-expression-editor"] textarea', expression);
    await page.click('[data-testid="run-transform-button"]');
    
    await page.waitForSelector('[data-testid="jq-output-display"]');
    
    const output = await page.textContent('[data-testid="jq-output-display"]');
    expect(output).toContain('Item 1');
    expect(output).toContain('Item 3');
    expect(output).not.toContain('Item 2');
  });

  test('should handle conditional logic', async ({ page }) => {
    const inputData = { priority: 'high', value: 100 };
    const expression = 'if .priority == "high" then .sla = 1 else .sla = 24 end | .';
    
    await page.fill('[data-testid="jq-input-editor"] textarea', JSON.stringify(inputData, null, 2));
    await page.fill('[data-testid="jq-expression-editor"] textarea', expression);
    await page.click('[data-testid="run-transform-button"]');
    
    await page.waitForSelector('[data-testid="jq-output-display"]');
    
    const output = await page.textContent('[data-testid="jq-output-display"]');
    expect(output).toContain('"sla": 1');
  });

  test('should handle default values', async ({ page }) => {
    const inputData = { name: 'John' };
    const expression = '{ name: .name, email: .email // "no-email@example.com" }';
    
    await page.fill('[data-testid="jq-input-editor"] textarea', JSON.stringify(inputData, null, 2));
    await page.fill('[data-testid="jq-expression-editor"] textarea', expression);
    await page.click('[data-testid="run-transform-button"]');
    
    await page.waitForSelector('[data-testid="jq-output-display"]');
    
    const output = await page.textContent('[data-testid="jq-output-display"]');
    expect(output).toContain('no-email@example.com');
  });

  test('should format output JSON', async ({ page }) => {
    const inputData = { a: 1, b: 2, c: 3 };
    const expression = '.';
    
    await page.fill('[data-testid="jq-input-editor"] textarea', JSON.stringify(inputData));
    await page.fill('[data-testid="jq-expression-editor"] textarea', expression);
    await page.click('[data-testid="run-transform-button"]');
    
    await page.waitForSelector('[data-testid="jq-output-display"]');
    
    // Toggle format
    await page.click('[data-testid="format-output-button"]');
    
    const output = await page.textContent('[data-testid="jq-output-display"]');
    expect(output).toContain('{\n');
  });

  test('should copy output to clipboard', async ({ page }) => {
    const inputData = { id: 123 };
    const expression = '.';
    
    await page.fill('[data-testid="jq-input-editor"] textarea', JSON.stringify(inputData, null, 2));
    await page.fill('[data-testid="jq-expression-editor"] textarea', expression);
    await page.click('[data-testid="run-transform-button"]');
    
    await page.waitForSelector('[data-testid="jq-output-display"]');
    
    // Copy output
    await page.click('[data-testid="copy-output-button"]');
    
    // Verify copy success message
    await expect(page.locator('[data-testid="copy-success-message"]')).toBeVisible();
  });

  test('should save expression to history', async ({ page }) => {
    const expression1 = '{ id: .id }';
    const expression2 = '{ name: .name }';
    
    // Execute first expression
    await page.fill('[data-testid="jq-expression-editor"] textarea', expression1);
    await page.click('[data-testid="run-transform-button"]');
    await page.waitForSelector('[data-testid="jq-output-display"]');
    
    // Execute second expression
    await page.fill('[data-testid="jq-expression-editor"] textarea', expression2);
    await page.click('[data-testid="run-transform-button"]');
    await page.waitForSelector('[data-testid="jq-output-display"]');
    
    // Open history
    await page.click('[data-testid="jq-history-button"]');
    
    // Verify history contains both expressions
    await expect(page.locator('[data-testid="history-item"]').nth(0)).toContainText(expression2);
    await expect(page.locator('[data-testid="history-item"]').nth(1)).toContainText(expression1);
  });

  test('should load expression from history', async ({ page }) => {
    const expression = '{ test: .value }';
    
    // Execute and save to history
    await page.fill('[data-testid="jq-expression-editor"] textarea', expression);
    await page.click('[data-testid="run-transform-button"]');
    await page.waitForSelector('[data-testid="jq-output-display"]');
    
    // Clear expression
    await page.fill('[data-testid="jq-expression-editor"] textarea', '');
    
    // Load from history
    await page.click('[data-testid="jq-history-button"]');
    await page.click('[data-testid="history-item"]:first-child');
    
    // Verify expression is loaded
    const loadedExpression = await page.inputValue('[data-testid="jq-expression-editor"] textarea');
    expect(loadedExpression).toBe(expression);
  });

  test('should show live syntax validation', async ({ page }) => {
    // Type invalid syntax
    await page.fill('[data-testid="jq-expression-editor"] textarea', '{ invalid');
    
    // Wait for validation
    await page.waitForTimeout(500);
    
    // Check for syntax error indicator (without running)
    await expect(page.locator('[data-testid="syntax-error-indicator"]')).toBeVisible();
    
    // Fix syntax
    await page.fill('[data-testid="jq-expression-editor"] textarea', '{ valid: .id }');
    await page.waitForTimeout(500);
    
    // Error should be gone
    await expect(page.locator('[data-testid="syntax-error-indicator"]')).not.toBeVisible();
  });

  test('should provide JQ function reference', async ({ page }) => {
    // Open function reference
    await page.click('[data-testid="jq-reference-button"]');
    
    // Verify reference panel opens
    await expect(page.locator('[data-testid="jq-reference-panel"]')).toBeVisible();
    
    // Search for function
    await page.fill('[data-testid="reference-search"]', 'map');
    
    // Verify function details are shown
    await expect(page.locator('[data-testid="function-map"]')).toBeVisible();
    await expect(page.locator('[data-testid="function-map"]')).toContainText('map');
  });

  test('should handle large JSON inputs efficiently', async ({ page }) => {
    // Generate large input
    const largeArray = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      value: Math.random() * 100
    }));
    const inputData = { items: largeArray };
    
    const expression = '{ count: (.items | length), sample: .items[0] }';
    
    await page.fill('[data-testid="jq-input-editor"] textarea', JSON.stringify(inputData));
    await page.fill('[data-testid="jq-expression-editor"] textarea', expression);
    
    // Measure execution time
    const startTime = Date.now();
    await page.click('[data-testid="run-transform-button"]');
    await page.waitForSelector('[data-testid="jq-output-display"]');
    const endTime = Date.now();
    
    // Verify it completes in reasonable time (< 5 seconds)
    expect(endTime - startTime).toBeLessThan(5000);
    
    // Verify output
    const output = await page.textContent('[data-testid="jq-output-display"]');
    expect(output).toContain('count');
    expect(output).toContain('1000');
  });

  test('should handle string operations', async ({ page }) => {
    const inputData = { text: 'Hello World' };
    const expression = '{ upper: (.text | ascii_upcase), lower: (.text | ascii_downcase) }';
    
    await page.fill('[data-testid="jq-input-editor"] textarea', JSON.stringify(inputData, null, 2));
    await page.fill('[data-testid="jq-expression-editor"] textarea', expression);
    await page.click('[data-testid="run-transform-button"]');
    
    await page.waitForSelector('[data-testid="jq-output-display"]');
    
    const output = await page.textContent('[data-testid="jq-output-display"]');
    expect(output).toContain('HELLO WORLD');
    expect(output).toContain('hello world');
  });
});
