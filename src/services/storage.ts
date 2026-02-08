import yaml from 'js-yaml';
import type { Route, RouteConfig } from '../types';
import { settings } from '../config/settings';

export class StorageService {
  private readonly ROUTES_KEY = settings.storage.localStorageKey;
  private readonly CONFIG_KEY = `${this.ROUTES_KEY}_config`;

  saveRoutes(routes: Route[]): void {
    try {
      localStorage.setItem(this.ROUTES_KEY, JSON.stringify(routes));
    } catch (error) {
      console.error('Failed to save routes:', error);
      throw new Error('Failed to save routes to localStorage');
    }
  }

  loadRoutes(): Route[] {
    try {
      const data = localStorage.getItem(this.ROUTES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load routes:', error);
      return [];
    }
  }

  clearRoutes(): void {
    localStorage.removeItem(this.ROUTES_KEY);
  }

  exportToYAML(routes: Route[]): string {
    const configMap = this.generateConfigMap(routes);
    return yaml.dump(configMap);
  }

  exportToJSON(routes: Route[]): string {
    const configMap = this.generateConfigMap(routes);
    return JSON.stringify(configMap, null, 2);
  }

  downloadFile(content: string, filename: string, mimeType: string = 'text/yaml'): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  importFromYAML(yamlContent: string): Route[] {
    try {
      const configMap: any = yaml.load(yamlContent);

      if (configMap.kind !== 'ConfigMap') {
        throw new Error('Invalid ConfigMap format');
      }

      const routesYaml = configMap.data?.['routes.yaml'];
      if (!routesYaml) {
        throw new Error('No routes.yaml found in ConfigMap');
      }

      const routesData: any = yaml.load(routesYaml);
      return routesData.routes || [];
    } catch (error) {
      console.error('Failed to import routes:', error);
      throw new Error(`Failed to import routes: ${error}`);
    }
  }

  private generateConfigMap(routes: Route[]): any {
    const timestamp = settings.export.includeTimestamp
      ? new Date().toISOString()
      : undefined;

    const routesData = {
      version: '1.0',
      routes: routes,
    };

    return {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        name: settings.export.defaultConfigMapName,
        namespace: settings.export.defaultNamespace,
        labels: {
          app: 'openhqm',
          component: 'router',
          version: settings.app.version,
        },
        ...(timestamp && {
          annotations: {
            lastModified: timestamp,
          },
        }),
      },
      data: {
        'routes.yaml': yaml.dump(routesData),
      },
    };
  }
}

// Singleton instance
export const storageService = new StorageService();
