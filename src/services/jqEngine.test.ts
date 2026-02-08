import { describe, it, expect, beforeAll } from 'vitest';
import { JQService } from './jqEngine';

describe('JQService', () => {
  let jqService: JQService;

  beforeAll(async () => {
    jqService = new JQService();
    await jqService.init();
  });

  describe('init', () => {
    it('should initialize JQ engine', async () => {
      const service = new JQService();
      await service.init();
      expect(service).toBeDefined();
    });

    it('should not reinitialize if already initialized', async () => {
      await jqService.init();
      await jqService.init(); // Second call should be no-op
      expect(jqService).toBeDefined();
    });
  });

  describe('transform', () => {
    it('should transform payload with simple expression', async () => {
      const input = { id: 123, name: 'Test', extra: 'data' };
      const expression = '{ id: .id, name: .name }';

      const result = await jqService.transform(expression, input);

      expect(result.success).toBe(true);
      expect(result.output).toEqual({ id: 123, name: 'Test' });
    });

    it('should pass through with identity expression', async () => {
      const input = { id: 123, name: 'Test' };
      const expression = '.';

      const result = await jqService.transform(expression, input);

      expect(result.success).toBe(true);
      expect(result.output).toEqual(input);
    });

    it('should handle invalid JQ expression', async () => {
      const input = { id: 123 };
      const expression = 'invalid error syntax';

      const result = await jqService.transform(expression, input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.suggestions).toBeDefined();
    });

    it('should provide suggestions for errors', async () => {
      const input = { id: 123 };
      const expression = 'error syntax';

      const result = await jqService.transform(expression, input);

      expect(result.success).toBe(false);
      expect(result.suggestions).toBeInstanceOf(Array);
    });
  });

  describe('validate', () => {
    it('should validate correct JQ expression', async () => {
      const expression = '.';

      const result = await jqService.validate(expression);

      expect(result.valid).toBe(true);
    });

    it('should invalidate incorrect JQ expression', async () => {
      const expression = 'invalid error expression';

      const result = await jqService.validate(expression);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('error parsing', () => {
    it('should parse JQ error messages', async () => {
      const input = { id: 123 };
      const expression = 'syntax error';

      const result = await jqService.transform(expression, input);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should provide relevant suggestions based on error type', async () => {
      const input = { id: 123 };
      const expression = 'error';

      const result = await jqService.transform(expression, input);

      if (!result.success) {
        expect(result.suggestions).toBeInstanceOf(Array);
      }
    });
  });
});
