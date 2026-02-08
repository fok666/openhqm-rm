# GitHub Copilot Instructions for OpenHQM Router Manager

## Project Overview
OpenHQM Router Manager is a **pure client-side** web application for creating, testing, and managing OpenHQM routing rules. It runs entirely in the browser with no backend required. Built with React 18, TypeScript, and JQ WebAssembly, it enables users to visually design routes, test JQ transformations in real-time, simulate message routing, and export configurations as Kubernetes ConfigMaps.

See [SDD.md](../SDD.md) for complete technical details.

**Deployment**: GitHub Pages static site - no server infrastructure needed.

## Code Style and Conventions

### TypeScript Standards
- Use TypeScript strict mode
- No `any` types without justification
- Comprehensive type coverage for all functions and components
- Maximum line length: 100 characters
- Use functional programming patterns where appropriate
- Prefer `const` over `let`, avoid `var`

### Naming Conventions
```typescript
// Interfaces/Types: PascalCase
interface RouteConfig {
  metadata: RouteMetadata;
  spec: RouteSpec;
}

type TransformResult = {
  success: boolean;
  output?: any;
};

// Functions and variables: camelCase
const calculatePriority = (route: Route): number => {
  return route.priority;
};

// Constants: UPPER_SNAKE_CASE
const MAX_ROUTE_COUNT = 100;
const DEFAULT_NAMESPACE = 'openhqm';

// Private methods: _leadingUnderscore (by convention)
const _validateInternal = (data: any): boolean => {
  return true;
};

// React Components: PascalCase
const RouteEditor: React.FC<RouteEditorProps> = ({ route }) => {
  return <div>...</div>;
};
```

### Import Organization
```typescript
// React imports
import React, { useState, useEffect, useMemo } from 'react';

// Third-party library imports
import { Box, Button, TextField } from '@mui/material';
import { useStore } from 'zustand';

// Local imports - types first
import type { Route, RouteConfig, SimulationContext } from '../types';
import { JQService } from '../services/jqEngine';
import { StorageService } from '../services/storage';
import { RouteItem } from './RouteItem';
```

## Architecture Patterns

### React Patterns
Use functional components with hooks:
```typescript
// Custom hooks for reusable logic
export const useRoutes = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const storage = useMemo(() => new StorageService(), []);
  
  useEffect(() => {
    const loadedRoutes = storage.loadRoutes();
    setRoutes(loadedRoutes);
  }, [storage]);
  
  const saveRoute = useCallback((route: Route) => {
    setRoutes(prev => {
      const updated = [...prev, route];
      storage.saveRoutes(updated);
      return updated;
    });
  }, [storage]);
  
  return { routes, saveRoute };
};

// Component example
const RouteEditor: React.FC<RouteEditorProps> = ({ route }) => {
  const [name, setName] = useState(route.name);
  const { saveRoute } = useRoutes();
  
  const handleSave = () => {
    saveRoute({ ...route, name });
  };
  
  return (
    <Box>
      <TextField value={name} onChange={e => setName(e.target.value)} />
      <Button onClick={handleSave}>Save</Button>
    </Box>
  );
};
```

### State Management
Use Zustand for global state (or Redux Toolkit):
```typescript
import { create } from 'zustand';

interface RouteStore {
  routes: Route[];
  selectedRoute: Route | null;
  setRoutes: (routes: Route[]) => void;
  selectRoute: (route: Route) => void;
  addRoute: (route: Route) => void;
  updateRoute: (id: string, updates: Partial<Route>) => void;
}

export const useRouteStore = create<RouteStore>((set) => ({
  routes: [],
  selectedRoute: null,
  setRoutes: (routes) => set({ routes }),
  selectRoute: (route) => set({ selectedRoute: route }),
  addRoute: (route) => set((state) => ({ 
    routes: [...state.routes, route] 
  })),
  updateRoute: (id, updates) => set((state) => ({
    routes: state.routes.map(r => r.id === id ? { ...r, ...updates } : r)
  }))
}));
```

### Error Handling
Use error boundaries and try-catch for async operations:
```typescript
// Error boundary
class ErrorBoundary extends React.Component<Props, State> {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorDisplay error={this.state.error} />;
    }
    return this.props.children;
  }
}

// Async error handling
const transformPayload = async (expression: string, input: any) => {
  try {
    const result = await jqService.transform(expression, input);
    if (!result.success) {
      showNotification({
        type: 'error',
        message: result.error,
        suggestions: result.suggestions
      });
    }
    return result;
  } catch (error) {
    console.error('Transform failed:', error);
    throw error;
  }
};
```

## Key Components

### 1. Services Layer (`src/services/`)
All client-side services run in the browser:

**JQ Service (WebAssembly)**:
```typescript
import jq from '@jqlang/jq-web';

export class JQService {
  private jq: any;
  
  async init() {
    this.jq = await jq();
  }
  
  async transform(expression: string, inputData: any) {
    try {
      const result = await this.jq.json(inputData, expression);
      return { success: true, output: result };
    } catch (error) {
      return { success: false, error: this.parseJQError(error) };
    }
  }
}
```

**Storage Service (localStorage)**:
```typescript
export class StorageService {
  private readonly ROUTES_KEY = 'openhqm_routes';
  
  saveRoutes(routes: RouteConfig[]): void {
    localStorage.setItem(this.ROUTES_KEY, JSON.stringify(routes));
  }
  
  loadRoutes(): RouteConfig[] {
    const data = localStorage.getItem(this.ROUTES_KEY);
    return data ? JSON.parse(data) : [];
  }
}
```

### 2. Components Layer (`src/components/`)
Organize by feature:

**RouteList Component**:
```typescript
export const RouteList: React.FC = () => {
  const { routes, selectRoute, deleteRoute } = useRouteStore();
  
  return (
    <List>
      {routes.map(route => (
        <RouteItem
          key={route.id}
          route={route}
          onSelect={() => selectRoute(route)}
          onDelete={() => deleteRoute(route.id)}
        />
      ))}
    </List>
  );
};
```

**RouteEditor Component**:
```typescript
export const RouteEditor: React.FC<{ route: Route }> = ({ route }) => {
  return (
    <Box>
      <BasicInfo route={route} />
      <ConditionsEditor conditions={route.conditions} />
      <TransformEditor transform={route.transform} />
      <DestinationEditor destination={route.destination} />
    </Box>
  );
};
```

### 3. Types Layer (`src/types/`)
Define all TypeScript interfaces:
```typescript
// src/types/route.ts
export interface Route {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  conditions: RouteCondition[];
  transform?: TransformConfig;
  destination: DestinationConfig;
}

export interface RouteCondition {
  type: 'header' | 'payload' | 'metadata' | 'jq';
  field?: string;
  operator: 'equals' | 'contains' | 'regex' | 'exists';
  value?: any;
  jqExpression?: string;
}
```

### 4. Configuration (`src/config/`)
Client-side configuration:
```typescript
// src/config/settings.ts
export const settings = {
  app: {
    name: 'OpenHQM Router Manager',
    version: '2.0.0'
  },
  storage: {
    localStorageKey: 'openhqm_routes',
    autoSaveInterval: 30000,
    maxRoutes: 100
  },
  jq: {
    maxExecutionTime: 5000
  }
}
};
```

## Testing Guidelines

### Unit Tests
Use Vitest with React Testing Library:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RouteEditor } from './RouteEditor';

describe('RouteEditor', () => {
  it('should update route name', () => {
    const onSave = vi.fn();
    render(<RouteEditor route={mockRoute} onSave={onSave} />);
    
    const input = screen.getByLabelText('Route Name');
    fireEvent.change(input, { target: { value: 'New Name' } });
    fireEvent.click(screen.getByText('Save'));
    
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'New Name' })
    );
  });
});
```

### Service Tests
Test client-side services:
```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { JQService } from './jqEngine';

describe('JQService', () => {
  let jqService: JQService;
  
  beforeAll(async () => {
    jqService = new JQService();
    await jqService.init();
  });
  
  it('should transform payload', async () => {
    const input = { order: { id: 123 } };
    const result = await jqService.transform('{ orderId: .order.id }', input);
    
    expect(result.success).toBe(true);
    expect(result.output).toEqual({ orderId: 123 });
  });
});
```

### E2E Tests
Use Playwright for end-to-end testing:
```typescript
import { test, expect } from '@playwright/test';

test('create and export route', async ({ page }) => {
  await page.goto('http://localhost:5173');
  
  // Create route
  await page.click('[data-testid="new-route"]');
  await page.fill('[data-testid="route-name"]', 'Test Route');
  await page.click('[data-testid="save-route"]');
  
  // Export
  const downloadPromise = page.waitForEvent('download');
  await page.click('[data-testid="export-yaml"]');
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('openhqm-routes.yaml');
});
```

## Performance Considerations

- Use React.memo for expensive components
- Implement virtualization for large lists (react-window)
- Debounce user inputs
- Use Web Workers for heavy JQ operations if needed
- Lazy load components with React.lazy and Suspense
- Optimize bundle size with code splitting

## Browser Storage Best Practices

- Handle localStorage quota exceeded errors
- Implement data cleanup for old configurations
- Add export/import for user data backup
- Use compression for large route configurations
- Clear sensitive data on logout/close

## Documentation

Add JSDoc comments to all exported functions:
```typescript
/**
 * Transforms a payload using a JQ expression.
 * 
 * @param expression - The JQ expression to evaluate
 * @param inputData - The input data to transform
 * @returns Promise resolving to transform result
 * 
 * @example
 * ```typescript
 * const result = await transform('{ id: .id }', { id: 123 });
 * // result: { success: true, output: { id: 123 } }
 * ```
 */
export async function transform(
  expression: string,
  inputData: any
): Promise<TransformResult> {
  // ...
}
```

## Common Patterns to Follow

### Monaco Editor Integration
Use Monaco editor for code editing:
```typescript
import Editor from '@monaco-editor/react';

export const JQEditor: React.FC<{ value: string; onChange: (value: string) => void }> = ({ value, onChange }) => {
  return (
    <Editor
      height="200px"
      language="javascript"
      value={value}
      onChange={onChange}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on'
      }}
    />
  );
};
```

### YAML Export
Generate Kubernetes ConfigMap YAML:
```typescript
import yaml from 'js-yaml';

export const exportToYAML = (routes: Route[]): string => {
  const configMap = {
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: {
      name: 'openhqm-routes',
      namespace: 'openhqm',
      labels: {
        app: 'openhqm',
        component: 'router'
      }
    },
    data: {
      'routes.yaml': yaml.dump({ version: '1.0', routes })
    }
  };
  
  return yaml.dump(configMap);
};
```

### Auto-save Implementation
Implement auto-save functionality:
```typescript
export const useAutoSave = (data: Route[], interval: number = 30000) => {
  const storage = useMemo(() => new StorageService(), []);
  
  useEffect(() => {
    const timer = setInterval(() => {
      storage.saveRoutes(data);
      console.log('Auto-saved routes');
    }, interval);
    
    return () => clearInterval(timer);
  }, [data, interval, storage]);
};
```

## Files and Directories

When creating new files:
- Put React components in `src/components/[FeatureName]/`
- Put TypeScript types in `src/types/`
- Put services in `src/services/`
- Put hooks in `src/hooks/`
- Put utilities in `src/utils/`
- Put tests alongside components: `ComponentName.test.tsx`
- Put global styles in `src/styles/`
- Put configuration in `src/config/`

## Additional Notes

- This is a client-side only application - no backend server
- All data processing happens in the browser
- Use Web Assembly (jq-web) for JQ transformations
- localStorage is the only persistence mechanism
- Export functionality generates downloadable files
- Focus on performance and user experience
- Keep bundle size small (< 500KB gzipped)
- Support offline usage after initial load
- Provide clear error messages and suggestions
- Implement small incremental changes and verify your steps along the way
- Always test locally before pushing changes
- Push to new branches for review, don't commit directly to main
- Use pull requests for code review and discussion

## Quick Reference

### Running the Application
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm run test

# Run linter
npm run lint

# Format code
npm run format
```

### Technology Stack
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **@jqlang/jq-web** - JQ WebAssembly
- **@monaco-editor/react** - Code editor
- **Material-UI** or **Ant Design** - UI components
- **Zustand** - State management
- **Zod** - Validation
- **Vitest** - Unit testing
- **Playwright** - E2E testing
- **js-yaml** - YAML parsing/generation

---

**Remember**: This is a pure client-side application. All code runs in the browser, no backend services required. Focus on creating a smooth, intuitive user experience for creating and testing OpenHQM routing configurations.

