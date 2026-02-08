// Core route configuration types
export interface RouteConfig {
  metadata: RouteMetadata;
  spec: RouteSpec;
}

export interface RouteMetadata {
  name: string;
  namespace: string;
  version: string;
  description?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface RouteSpec {
  routes: Route[];
  defaultRoute?: string;
  errorHandling?: ErrorHandlingConfig;
}

export interface Route {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number;

  // Matching conditions
  conditions: RouteCondition[];
  conditionOperator: 'AND' | 'OR';

  // Actions
  actions: RouteAction[];

  // Transformation
  transform?: TransformConfig;

  // Destination
  destination: DestinationConfig;
}

export interface RouteCondition {
  type: 'header' | 'payload' | 'metadata' | 'jq';
  field?: string;
  operator: 'equals' | 'contains' | 'regex' | 'exists' | 'jq';
  value?: any;
  jqExpression?: string;
}

export interface RouteAction {
  type: 'log' | 'tag' | 'header' | 'metadata' | 'metric';
  key?: string;
  value?: string;
  jqExpression?: string;
}

export interface TransformConfig {
  enabled: boolean;
  jqExpression: string;
  errorHandling: 'fail' | 'skip' | 'default';
  defaultValue?: any;
}

export interface DestinationConfig {
  type: 'endpoint' | 'queue' | 'webhook';
  target: string;

  // For endpoint type
  endpoint?: string;

  // For queue type
  queueName?: string;

  // For webhook type
  webhookUrl?: string;
  webhookMethod?: 'POST' | 'PUT' | 'PATCH';
  webhookHeaders?: Record<string, string>;
}

export interface ErrorHandlingConfig {
  onValidationError: 'reject' | 'default' | 'fallback';
  onTransformError: 'reject' | 'skip' | 'original';
  defaultRoute?: string;
  fallbackRoute?: string;
}
