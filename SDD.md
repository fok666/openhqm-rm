# Software Design Document (SDD)
## OpenHQM Router Manager

**Version:** 1.1  
**Date:** February 8, 2026  
**Status:** Updated - Python Backend + GitHub Pages

---

## 1. Executive Summary

OpenHQM Router Manager is a web-based configuration management tool for OpenHQM routing rules. It provides an intuitive JavaScript interface for viewing, editing, testing, and simulating route configurations with real-time payload transformation using JQ expressions. Routes are deployed as Kubernetes ConfigMaps, enabling GitOps-friendly configuration management.

**Deployment Options:**
- **Full Version** (with Python backend): Complete functionality including Kubernetes integration, route storage, and advanced features
- **GitHub Pages** (static site): Standalone web tool for creating, testing, and downloading route configurations without backend dependencies

### 1.1 Purpose
Simplify the creation and management of OpenHQM routing configurations through a visual interface with built-in validation, testing, and simulation capabilities.

### 1.2 Key Features
- **Visual Route Editor**: Interactive UI for creating and editing routing rules
- **JQ Transform Simulator**: Real-time payload transformation testing with JQ expressions (runs in browser)
- **Route Testing**: Validate routing logic against test payloads
- **ConfigMap Export**: Download routes as Kubernetes ConfigMaps (YAML/JSON)
- **GitHub Pages Mode**: Standalone static site requiring no backend or installation
- **Full Backend Mode**: Python/FastAPI backend with Kubernetes integration, persistent storage
- **Multi-Route Management**: Handle multiple route configurations in a single interface

---

## 2. System Architecture

### 2.1 High-Level Architecture

```mermaid
flowchart TD
    User[User Browser]
    
    subgraph Frontend["Frontend (React + TypeScript)"]
        UI[Route Manager UI]
        Editor[Monaco Editor]
        Simulator[JQ Simulator]
        Validator[Route Validator]
    end
    
    subgraph Backend["Backend (Python + FastAPI)"]
        API[REST API]
        JQEngine[JQ Execution Engine]
        K8sClient[Kubernetes Client]
        Storage[Redis/PostgreSQL]
    end
    
    subgraph K8s["Kubernetes Cluster"]
        ConfigMaps[ConfigMaps]
        OpenHQM[OpenHQM Pods]
    end
    
    User --> UI
    UI --> Editor
    UI --> Simulator
    UI --> Validator
    
    Simulator --> API
    Validator --> API
    API --> JQEngine
    API --> K8sClient
    API --> Storage
    
    K8sClient --> ConfigMaps
    ConfigMaps --> OpenHQM
```

### 2.2 Component Overview

#### 2.2.1 Frontend Components
- **React Application**: Single-page application built with React 18+
- **Monaco Editor**: Code editor for route configuration (YAML/JSON)
- **JQ Playground**: Interactive JQ expression tester
- **Route Visualizer**: Visual representation of routing logic
- **ConfigMap Manager**: Import/export ConfigMaps

#### 2.2.2 Backend Services (Optional - Full Mode Only)
- **FastAPI Server**: REST API for route operations
- **JQ Runtime**: Python JQ library (pyjq) for payload transformation
- **Kubernetes Integration**: ConfigMap CRUD operations using kubernetes Python client
- **Validation Engine**: Route configuration validation with pydantic
- **Storage**: Redis or PostgreSQL for persistent route storage

#### 2.2.3 GitHub Pages Mode (Static Site)
- **Client-Side Processing**: All JQ transformations run in browser via WebAssembly
- **No Backend Required**: Complete functionality for route creation and testing
- **Local Storage**: Browser localStorage for saving work in progress
- **Export Only**: Download YAML/JSON files (no Kubernetes deployment)

---

## 3. Data Models

### 3.1 Route Configuration

```typescript
interface RouteConfig {
  metadata: RouteMetadata;
  spec: RouteSpec;
}

interface RouteMetadata {
  name: string;
  namespace: string;
  version: string;
  description?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

interface RouteSpec {
  routes: Route[];
  defaultRoute?: string;
  errorHandling?: ErrorHandlingConfig;
}

interface Route {
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

interface RouteCondition {
  type: 'header' | 'payload' | 'metadata' | 'jq';
  field?: string;
  operator: 'equals' | 'contains' | 'regex' | 'exists' | 'jq';
  value?: any;
  jqExpression?: string;
}

interface RouteAction {
  type: 'log' | 'tag' | 'header' | 'metadata' | 'metric';
  key?: string;
  value?: string;
  jqExpression?: string;
}

interface TransformConfig {
  enabled: boolean;
  jqExpression: string;
  errorHandling: 'fail' | 'skip' | 'default';
  defaultValue?: any;
}

interface DestinationConfig {
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

interface ErrorHandlingConfig {
  onValidationError: 'reject' | 'default' | 'fallback';
  onTransformError: 'reject' | 'skip' | 'original';
  defaultRoute?: string;
  fallbackRoute?: string;
}
```

### 3.2 Kubernetes ConfigMap Format

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: openhqm-routes
  namespace: openhqm
  labels:
    app: openhqm
    component: router
    version: "1.0"
data:
  routes.yaml: |
    version: "1.0"
    routes:
      - id: route-001
        name: "High Priority Orders"
        enabled: true
        priority: 100
        conditions:
          - type: payload
            field: order.priority
            operator: equals
            value: "high"
        transform:
          enabled: true
          jqExpression: |
            {
              orderId: .order.id,
              customerId: .customer.id,
              priority: "HIGH",
              items: [.order.items[] | {sku: .sku, qty: .quantity}]
            }
        destination:
          type: endpoint
          endpoint: "order-service-high"
```

### 3.3 Simulation Context

```typescript
interface SimulationContext {
  id: string;
  timestamp: string;
  
  // Input
  input: {
    payload: any;
    headers: Record<string, string>;
    metadata: Record<string, any>;
  };
  
  // Execution trace
  trace: SimulationStep[];
  
  // Output
  output: {
    matchedRoute?: string;
    transformedPayload?: any;
    destination?: string;
    actions: ExecutedAction[];
    errors: SimulationError[];
  };
  
  // Metrics
  metrics: {
    totalDuration: number;
    matchingDuration: number;
    transformDuration: number;
  };
}

interface SimulationStep {
  step: number;
  type: 'condition' | 'transform' | 'action' | 'route';
  description: string;
  input?: any;
  output?: any;
  duration: number;
  success: boolean;
  error?: string;
}

interface ExecutedAction {
  type: string;
  key: string;
  value: any;
  success: boolean;
}

interface SimulationError {
  severity: 'error' | 'warning';
  message: string;
  context?: string;
  suggestion?: string;
}
```

---

## 4. Frontend Design

### 4.1 Technology Stack

- **Framework**: React 18 with TypeScript
- **State Management**: Zustand or Redux Toolkit
- **UI Library**: Material-UI (MUI) or Ant Design
- **Code Editor**: Monaco Editor (VS Code editor)
- **JQ Integration**: @jqlang/jq-web (WebAssembly)
- **HTTP Client**: Axios
- **Form Validation**: Zod or Yup
- **Build Tool**: Vite
- **Testing**: Vitest + React Testing Library

### 4.2 UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│  OpenHQM Router Manager                    [Save] [Deploy]  │
├───────────────┬─────────────────────────────────────────────┤
│               │                                             │
│  Route List   │  Route Editor                               │
│               │                                             │
│ ┌───────────┐ │  Name: [High Priority Orders          ]   │
│ │ Route 1 ✓ │ │  Priority: [100]  Status: [✓ Enabled ]   │
│ │ Route 2   │ │                                             │
│ │ Route 3   │ │  Conditions:                                │
│ │ + New     │ │  ┌─────────────────────────────────────┐   │
│ └───────────┘ │  │ Field: order.priority               │   │
│               │  │ Operator: equals                    │   │
│ Actions:      │  │ Value: "high"                       │   │
│ • Test Route  │  └─────────────────────────────────────┘   │
│ • Import CM   │                                             │
│ • Export CM   │  Transform (JQ):                            │
│               │  ┌─────────────────────────────────────┐   │
│               │  │ {                                   │   │
│               │  │   orderId: .order.id,               │   │
│               │  │   customerId: .customer.id          │   │
│               │  │ }                                   │   │
│               │  └─────────────────────────────────────┘   │
│               │                                             │
│               │  [Test Transform]  [Simulate Route]        │
├───────────────┴─────────────────────────────────────────────┤
│  Simulation Results                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ✓ Route matched: route-001                         │   │
│  │ ✓ Transform successful (12ms)                       │   │
│  │ → Destination: order-service-high                   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Key Views

#### 4.3.1 Route List View
- Display all configured routes
- Quick enable/disable toggle
- Drag-and-drop for priority reordering
- Filter and search capabilities
- Bulk operations (enable/disable/delete)

#### 4.3.2 Route Editor View
- **Basic Info**: Name, description, priority, enabled status
- **Conditions Section**: 
  - Add/remove conditions
  - Visual condition builder
  - Support for AND/OR operators
  - JQ expression editor for complex conditions
- **Transform Section**:
  - Monaco editor with JQ syntax highlighting
  - Live preview with sample data
  - Error highlighting and suggestions
- **Actions Section**:
  - Configure logging, tagging, headers
  - JQ-based dynamic values
- **Destination Section**:
  - Endpoint selector
  - Queue name input
  - Webhook configuration

#### 4.3.3 JQ Playground
- **Input Panel**: JSON editor for test payload
- **Transform Panel**: JQ expression editor
- **Output Panel**: Transformed result
- **Error Display**: Validation errors and suggestions
- **Examples Library**: Common JQ patterns
- **Syntax Help**: Inline documentation

#### 4.3.4 Simulation View
- **Test Input**: Define test payloads, headers, metadata
- **Execution Trace**: Step-by-step execution visualization
- **Result Display**: Final output and destination
- **Performance Metrics**: Timing breakdown
- **Error Analysis**: Detailed error information

#### 4.3.5 ConfigMap Manager
- **Import**: Upload ConfigMap YAML/JSON
- **Export**: Download current configuration as ConfigMap
- **Deploy**: Push to Kubernetes cluster
- **Diff View**: Compare current vs deployed versions
- **History**: View deployment history

### 4.4 Component Structure

```
src/
├── components/
│   ├── RouteList/
│   │   ├── RouteList.tsx
│   │   ├── RouteItem.tsx
│   │   └── RouteList.styles.ts
│   ├── RouteEditor/
│   │   ├── RouteEditor.tsx
│   │   ├── BasicInfo.tsx
│   │   ├── ConditionsEditor.tsx
│   │   ├── TransformEditor.tsx
│   │   ├── ActionsEditor.tsx
│   │   ├── DestinationEditor.tsx
│   │   └── RouteEditor.styles.ts
│   ├── JQPlayground/
│   │   ├── JQPlayground.tsx
│   │   ├── InputPanel.tsx
│   │   ├── TransformPanel.tsx
│   │   ├── OutputPanel.tsx
│   │   └── ExamplesLibrary.tsx
│   ├── Simulator/
│   │   ├── Simulator.tsx
│   │   ├── TestInputEditor.tsx
│   │   ├── ExecutionTrace.tsx
│   │   ├── ResultDisplay.tsx
│   │   └── Simulator.styles.ts
│   ├── ConfigMapManager/
│   │   ├── ConfigMapManager.tsx
│   │   ├── ImportDialog.tsx
│   │   ├── ExportDialog.tsx
│   │   ├── DeployDialog.tsx
│   │   └── DiffViewer.tsx
│   └── common/
│       ├── CodeEditor.tsx
│       ├── JSONViewer.tsx
│       ├── ErrorDisplay.tsx
│       └── LoadingSpinner.tsx
├── hooks/
│   ├── useRoutes.ts
│   ├── useJQTransform.ts
│   ├── useSimulation.ts
│   └── useConfigMap.ts
├── services/
│   ├── api.ts
│   ├── jqEngine.ts
│   ├── routeValidator.ts
│   └── kubeClient.ts
├── store/
│   ├── routesSlice.ts
│   ├── simulationSlice.ts
│   └── uiSlice.ts
├── types/
│   ├── route.ts
│   ├── simulation.ts
│   └── configmap.ts
├── utils/
│   ├── jqHelpers.ts
│   ├── yamlParser.ts
│   └── validators.ts
├── App.tsx
└── main.tsx
```

---

## 5. Backend Design

### 5.1 Technology Stack

**Note**: Backend is optional and only required for full deployment with Kubernetes integration.

- **Runtime**: Python 3.11+
- **Framework**: FastAPI
- **JQ Engine**: pyjq (Python bindings for jq)
- **Kubernetes Client**: kubernetes (official Python client)
- **Validation**: Pydantic (built into FastAPI)
- **Storage**: Redis or PostgreSQL with asyncio drivers
- **Testing**: pytest + pytest-asyncio + httpx
- **CORS**: fastapi-cors for frontend integration
- **Async**: Full async/await support throughout

### 5.2 API Endpoints

#### 5.2.1 Route Management

```python
# Get all routes
GET /api/v1/routes
Response: List[RouteConfig]

# Get single route
GET /api/v1/routes/{route_id}
Response: RouteConfig

# Create route
POST /api/v1/routes
Request: RouteConfig
Response: RouteConfig

# Update route
PUT /api/v1/routes/{route_id}
Request: RouteConfig
Response: RouteConfig

# Delete route
DELETE /api/v1/routes/{route_id}
Response: {"success": bool}

# Reorder routes
PUT /api/v1/routes/reorder
Request: {"route_ids": List[str]}
Response: {"success": bool}
```

#### 5.2.2 JQ Transform

**Note**: In GitHub Pages mode, these operations run client-side using jq-web WebAssembly.

```python
# Test JQ transform
POST /api/v1/jq/transform
Request: {
  "expression": str,
  "input": dict
}
Response: {
  "success": bool,
  "output": dict | None,
  "error": str | None
}

# Validate JQ expression
POST /api/v1/jq/validate
Request: {
  "expression": str
}
Response: {
  "valid": bool,
  "error": str | None,
  "suggestions": List[str] | None
}
```

#### 5.2.3 Simulation

**Note**: Simulation works in both modes - backend (optional) and client-side (GitHub Pages).

```python
# Simulate route execution
POST /api/v1/simulate
Request: {
  "route_id": str | None,  # Optional, simulates specific route
  "input": {
    "payload": dict,
    "headers": dict[str, str],
    "metadata": dict[str, Any]
  }
}
Response: SimulationContext

# Batch simulation
POST /api/v1/simulate/batch
Request: {
  "test_cases": List[{
    "name": str,
    "input": SimulationInput
  }]
}
Response: {
  "results": List[SimulationContext],
  "summary": {
    "total": int,
    "passed": int,
    "failed": int
  }
}
```

#### 5.2.4 ConfigMap Operations

**Note**: Import/Export work in both modes. Deploy/Get/List only available with backend.

```python
# Import ConfigMap (parses YAML, works client-side too)
POST /api/v1/configmap/import
Request: {
  "yaml": str,
  "namespace": str | None
}
Response: {
  "success": bool,
  "routes": List[RouteConfig]
}

# Export as ConfigMap (generates YAML, works client-side too)
GET /api/v1/configmap/export?format=yaml|json
Response: str (YAML or JSON)
# In GitHub Pages mode: Download file directly

# Deploy to Kubernetes (backend only)
POST /api/v1/configmap/deploy
Request: {
  "namespace": str,
  "name": str,
  "routes": List[RouteConfig]
}
Response: {
  "success": bool,
  "configmap_name": str
}

# Get deployed ConfigMap (backend only)
GET /api/v1/configmap/{namespace}/{name}
Response: {
  "configmap": dict,
  "routes": List[RouteConfig],
  "version": str
}

# List ConfigMaps (backend only)
GET /api/v1/configmap?namespace=openhqm
Response: List[{
  "name": str,
  "namespace": str,
  "version": str,
  "created_at": str
}]
```

#### 5.2.5 Validation

**Note**: Validation works in both modes using Pydantic models (backend) or Zod schemas (client-side).

```python
# Validate route configuration
POST /api/v1/validate/route
Request: RouteConfig
Response: {
  "valid": bool,
  "errors": List[ValidationError],
  "warnings": List[ValidationWarning]
}

# Validate full configuration
POST /api/v1/validate/config
Request: {
  "routes": List[RouteConfig]
}
Response: {
  "valid": bool,
  "errors": List[ValidationError],
  "warnings": List[ValidationWarning],
  "conflicts": List[RouteConflict]
}
```

### 5.3 Backend Structure (Optional - Full Mode)

```
backend/
├── src/
│   ├── openhqm_rm/
│   │   ├── __init__.py
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── main.py           # FastAPI app
│   │   │   ├── routes/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── routes.py     # Route CRUD
│   │   │   │   ├── jq.py         # JQ transform
│   │   │   │   ├── simulation.py # Simulation
│   │   │   │   ├── configmap.py  # K8s ConfigMap
│   │   │   │   └── validation.py # Validation
│   │   │   └── dependencies.py   # FastAPI dependencies
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── route_service.py
│   │   │   ├── jq_service.py
│   │   │   ├── simulation_service.py
│   │   │   ├── kubernetes_service.py
│   │   │   └── validation_service.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── route.py          # Pydantic models
│   │   │   ├── simulation.py
│   │   │   └── configmap.py
│   │   ├── storage/
│   │   │   ├── __init__.py
│   │   │   ├── redis_storage.py
│   │   │   └── postgres_storage.py
│   │   ├── utils/
│   │   │   ├── __init__.py
│   │   │   ├── jq_runner.py
│   │   │   ├── yaml_parser.py
│   │   │   ├── route_matcher.py
│   │   │   └── logger.py
│   │   └── config/
│   │       ├── __init__.py
│   │       └── settings.py       # Pydantic settings
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── requirements.txt
├── requirements-dev.txt
├── pyproject.toml
└── Dockerfile
```

### 5.4 JQ Integration

#### 5.4.1 JQ Service (Python Backend)

```python
import pyjq
import json
from typing import Any, Dict, List, Optional

class JQService:
    """Service for executing JQ transformations."""
    
    async def transform(self, expression: str, input_data: Any) -> Dict[str, Any]:
        """Transform data using JQ expression."""
        try:
            result = pyjq.all(expression, input_data)
            # pyjq.all returns a list, get first result
            output = result[0] if result else None
            return {"success": True, "output": output}
        except Exception as error:
            return {
                "success": False,
                "error": self._parse_jq_error(error)
            }
    
    async def validate(self, expression: str) -> Dict[str, Any]:
        """Validate JQ expression syntax."""
        try:
            # Test with empty object
            pyjq.all(expression, {})
            return {"valid": True}
        except Exception as error:
            return {
                "valid": False,
                "error": self._parse_jq_error(error),
                "suggestions": self._get_suggestions(error)
            }
    
    def _parse_jq_error(self, error: Exception) -> str:
        """Parse jq error messages into user-friendly format."""
        message = str(error)
        # Clean up jq error messages
        message = message.replace('jq: error:', '').strip()
        return message
    
    def _get_suggestions(self, error: Exception) -> List[str]:
        """Provide helpful suggestions based on common errors."""
        suggestions = []
        message = str(error).lower()
        
        if 'undefined' in message or 'null' in message:
            suggestions.append('Check if all field paths exist in your input data')
            suggestions.append('Use the // operator for default values: .field // "default"')
        
        if 'syntax' in message or 'parse' in message:
            suggestions.append('Verify JQ syntax - common issues: missing pipes |, parentheses, or brackets')
            suggestions.append('Check for unmatched quotes or brackets')
        
        if 'cannot iterate' in message:
            suggestions.append('Make sure you are iterating over an array or object')
            suggestions.append('Use [] to iterate: .items[]')
        
        return suggestions
```

#### 5.4.2 Route Matcher (Python Backend)

```python
import pyjq
import asyncio
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)

class RouteMatcher:
    """Service for matching routes based on conditions."""
    
    async def match_route(
        self,
        routes: List[Route],
        context: SimulationContext
    ) -> Optional[Route]:
        """Find the first matching route based on priority and conditions."""
        # Sort by priority (higher first)
        sorted_routes = sorted(
            [r for r in routes if r.enabled],
            key=lambda x: x.priority,
            reverse=True
        )
        
        for route in sorted_routes:
            if await self._evaluate_conditions(route, context):
                return route
        
        return None
    
    async def _evaluate_conditions(
        self,
        route: Route,
        context: SimulationContext
    ) -> bool:
        """Evaluate all conditions for a route."""
        # Evaluate all conditions concurrently
        tasks = [
            self._evaluate_condition(condition, context)
            for condition in route.conditions
        ]
        results = await asyncio.gather(*tasks)
        
        # Apply operator
        if route.condition_operator == 'AND':
            return all(results)
        else:  # OR
            return any(results)
    
    async def _evaluate_condition(
        self,
        condition: RouteCondition,
        context: SimulationContext
    ) -> bool:
        """Evaluate a single condition."""
        condition_type = condition.type
        
        if condition_type == 'jq':
            return await self._evaluate_jq_condition(condition, context)
        elif condition_type == 'payload':
            return self._evaluate_payload_condition(condition, context)
        elif condition_type == 'header':
            return self._evaluate_header_condition(condition, context)
        elif condition_type == 'metadata':
            return self._evaluate_metadata_condition(condition, context)
        else:
            logger.warning(f"Unknown condition type: {condition_type}")
            return False
    
    async def _evaluate_jq_condition(
        self,
        condition: RouteCondition,
        context: SimulationContext
    ) -> bool:
        """Evaluate JQ expression condition."""
        try:
            result = pyjq.first(
                condition.jq_expression,
                context.input['payload']
            )
            # JQ result should be boolean or truthy value
            return bool(result)
        except Exception as error:
            logger.error(f"JQ condition evaluation error: {error}")
            return False
    
    def _evaluate_payload_condition(
        self,
        condition: RouteCondition,
        context: SimulationContext
    ) -> bool:
        """Evaluate payload field condition."""
        # Get nested field value
        value = self._get_nested_value(
            context.input['payload'],
            condition.field
        )
        return self._compare_values(value, condition.operator, condition.value)
    
    def _get_nested_value(self, obj: dict, path: str) -> Any:
        """Get nested value from dict using dot notation."""
        keys = path.split('.')
        value = obj
        for key in keys:
            if isinstance(value, dict):
                value = value.get(key)
            else:
                return None
        return value
```

### 5.5 Kubernetes Integration (Python Backend)

```python
from kubernetes import client, config
from kubernetes.client import V1ConfigMap, V1ObjectMeta
from typing import List, Dict, Any
import yaml
import logging

logger = logging.getLogger(__name__)

class KubernetesService:
    """Service for Kubernetes ConfigMap operations."""
    
    def __init__(self):
        try:
            # Try in-cluster config first
            config.load_incluster_config()
            logger.info("Using in-cluster Kubernetes config")
        except config.ConfigException:
            # Fall back to kubeconfig file
            config.load_kube_config()
            logger.info("Using kubeconfig file")
        
        self.core_api = client.CoreV1Api()
    
    async def get_configmap(
        self,
        namespace: str,
        name: str
    ) -> V1ConfigMap:
        """Get a ConfigMap from Kubernetes."""
        return self.core_api.read_namespaced_config_map(
            name=name,
            namespace=namespace
        )
    
    async def create_configmap(
        self,
        namespace: str,
        name: str,
        routes: List[Dict[str, Any]]
    ) -> V1ConfigMap:
        """Create a new ConfigMap in Kubernetes."""
        configmap = V1ConfigMap(
            api_version='v1',
            kind='ConfigMap',
            metadata=V1ObjectMeta(
                name=name,
                namespace=namespace,
                labels={
                    'app': 'openhqm',
                    'component': 'router',
                    'managed_by': 'router-manager'
                }
            ),
            data={
                'routes.yaml': yaml.dump({'routes': routes})
            }
        )
        
        return self.core_api.create_namespaced_config_map(
            namespace=namespace,
            body=configmap
        )
    
    async def update_configmap(
        self,
        namespace: str,
        name: str,
        routes: List[Dict[str, Any]]
    ) -> V1ConfigMap:
        """Update an existing ConfigMap in Kubernetes."""
        # Get existing ConfigMap
        existing = await self.get_configmap(namespace, name)
        
        # Update data
        existing.data = {
            'routes.yaml': yaml.dump({'routes': routes})
        }
        
        return self.core_api.replace_namespaced_config_map(
            name=name,
            namespace=namespace,
            body=existing
        )
    
    async def list_configmaps(
        self,
        namespace: str
    ) -> List[V1ConfigMap]:
        """List all OpenHQM ConfigMaps in a namespace."""
        result = self.core_api.list_namespaced_config_map(
            namespace=namespace,
            label_selector='app=openhqm,component=router'
        )
        return result.items
```

---

## 6. Detailed Features

### 6.1 Route Condition Builder

Visual builder for creating routing conditions without writing code:

```typescript
// Example: Visual condition builder output
{
  conditions: [
    {
      type: 'payload',
      field: 'order.priority',
      operator: 'equals',
      value: 'high'
    },
    {
      type: 'header',
      field: 'X-Customer-Type',
      operator: 'contains',
      value: 'premium'
    },
    {
      type: 'jq',
      jqExpression: '.order.total > 1000'
    }
  ],
  conditionOperator: 'AND'
}
```

**UI Features**:
- Drag-and-drop condition ordering
- Type-ahead for field names
- Operator dropdown (equals, contains, regex, exists, gt, lt, etc.)
- Value input with type validation
- Toggle between visual builder and JQ expression mode

### 6.2 JQ Transform Editor

Monaco-based editor with JQ syntax support:

**Features**:
- Syntax highlighting for JQ expressions
- Auto-completion for JQ functions
- Inline error highlighting
- Live preview with sample data
- Function reference sidebar
- Common pattern templates

**Example Templates**:
```jq
# Extract fields
{
  id: .id,
  name: .name,
  timestamp: now
}

# Filter array
.items | map(select(.active == true))

# Flatten nested structure
.orders[].items[] | {orderId: .orderId, sku: .sku}

# Conditional logic
if .priority == "high" then .sla = 1 else .sla = 24 end

# Error handling with defaults
{
  id: .id,
  name: .name // "Unknown",
  email: .contact.email // .contact.phone // "N/A"
}
```

### 6.3 Route Simulation Engine

Simulate complete message routing with detailed tracing:

```typescript
// Simulation execution
const simulation: SimulationContext = {
  id: 'sim-123',
  timestamp: '2026-02-08T10:00:00Z',
  input: {
    payload: { order: { id: 1, priority: 'high' } },
    headers: { 'Content-Type': 'application/json' },
    metadata: { source: 'web' }
  },
  trace: [
    {
      step: 1,
      type: 'condition',
      description: 'Evaluating condition: order.priority == "high"',
      input: { order: { id: 1, priority: 'high' } },
      output: true,
      duration: 2,
      success: true
    },
    {
      step: 2,
      type: 'transform',
      description: 'Applying JQ transform',
      input: { order: { id: 1, priority: 'high' } },
      output: { orderId: 1, priority: 'HIGH' },
      duration: 5,
      success: true
    },
    {
      step: 3,
      type: 'route',
      description: 'Routing to endpoint: order-service-high',
      output: { endpoint: 'order-service-high' },
      duration: 1,
      success: true
    }
  ],
  output: {
    matchedRoute: 'route-001',
    transformedPayload: { orderId: 1, priority: 'HIGH' },
    destination: 'order-service-high',
    actions: [
      { type: 'log', key: 'level', value: 'info', success: true }
    ],
    errors: []
  },
  metrics: {
    totalDuration: 8,
    matchingDuration: 2,
    transformDuration: 5
  }
};
```

### 6.4 ConfigMap Export/Import

#### Export Format

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: openhqm-routes
  namespace: openhqm
  labels:
    app: openhqm
    component: router
    version: "1.0.0"
    managedBy: router-manager
  annotations:
    description: "OpenHQM routing configuration"
    lastModified: "2026-02-08T10:00:00Z"
    modifiedBy: "user@example.com"
data:
  routes.yaml: |
    version: "1.0"
    routes:
      - id: route-001
        name: "High Priority Orders"
        description: "Route high-priority orders to dedicated service"
        enabled: true
        priority: 100
        conditions:
          - type: payload
            field: order.priority
            operator: equals
            value: "high"
        transform:
          enabled: true
          jqExpression: |
            {
              orderId: .order.id,
              customerId: .customer.id,
              priority: "HIGH",
              items: [.order.items[] | {sku: .sku, qty: .quantity}],
              timestamp: now
            }
          errorHandling: fail
        actions:
          - type: log
            key: level
            value: info
          - type: tag
            key: priority
            value: high
        destination:
          type: endpoint
          endpoint: order-service-high
```

#### Import Validation

When importing a ConfigMap:
1. Validate YAML/JSON syntax
2. Validate route schema
3. Check for duplicate route IDs
4. Validate JQ expressions
5. Check for condition conflicts
6. Verify endpoint references

### 6.5 Route Validation

**Validation Rules**:
- Route IDs must be unique
- Priority must be non-negative integer
- JQ expressions must be syntactically valid
- Required fields must be present
- Destination endpoints must be configured in OpenHQM
- No circular route dependencies
- Condition operators must be valid for field types

**Conflict Detection**:
- Overlapping conditions (e.g., two routes matching same criteria)
- Priority conflicts (same priority with overlapping conditions)
- Unreachable routes (lower priority but more specific conditions)

### 6.6 Test Case Management

Save and manage test cases for routes:

```typescript
interface TestCase {
  id: string;
  name: string;
  description: string;
  routeId?: string;  // Test specific route or all routes
  input: {
    payload: any;
    headers: Record<string, string>;
    metadata: Record<string, any>;
  };
  expectedOutput?: {
    routeId: string;
    transformedPayload?: any;
    destination?: string;
  };
  createdAt: string;
}
```

**Features**:
- Save test cases with routes
- Run individual test or all tests
- Compare expected vs actual results
- Generate test cases from real traffic (future)
- Export test suites

---

## 7. Configuration

### 7.1 Application Configuration

```yaml
# config/default.yaml
server:
  port: 3000
  host: "0.0.0.0"
  cors:
    enabled: true
    origins:
      - "http://localhost:5173"  # Vite dev server
      - "https://router-manager.openhqm.io"

kubernetes:
  enabled: true
  inCluster: false  # Set to true when running in K8s
  configPath: "~/.kube/config"
  defaultNamespace: "openhqm"

storage:
  type: "local"  # local, redis, postgres
  local:
    path: "./data/routes"

jq:
  maxExecutionTime: 5000  # milliseconds
  maxMemory: 100  # MB

logging:
  level: "info"
  format: "json"

security:
  authentication:
    enabled: false  # Enable for production
    type: "jwt"  # jwt, basic, oauth
  rateLimit:
    enabled: true
    maxRequests: 100
    windowMs: 60000  # 1 minute
```

### 7.2 Environment Variables (Python Backend)

```bash
# Server
OPENHQM_RM__SERVER__PORT=8000
OPENHQM_RM__SERVER__HOST=0.0.0.0
OPENHQM_RM__SERVER__RELOAD=false  # Dev mode only

# Kubernetes
OPENHQM_RM__KUBERNETES__ENABLED=true
OPENHQM_RM__KUBERNETES__IN_CLUSTER=false
OPENHQM_RM__KUBERNETES__CONFIG_PATH=~/.kube/config
OPENHQM_RM__KUBERNETES__DEFAULT_NAMESPACE=openhqm

# Storage
OPENHQM_RM__STORAGE__TYPE=redis  # redis or postgres
OPENHQM_RM__STORAGE__REDIS__URL=redis://localhost:6379
OPENHQM_RM__STORAGE__REDIS__DB=0
# Or PostgreSQL:
# OPENHQM_RM__STORAGE__POSTGRES__URL=postgresql://user:pass@localhost/openhqm_rm

# JQ
OPENHQM_RM__JQ__MAX_EXECUTION_TIME=5.0  # seconds
OPENHQM_RM__JQ__MAX_MEMORY=100  # MB

# Security
OPENHQM_RM__AUTH__ENABLED=false
OPENHQM_RM__AUTH__TYPE=jwt
OPENHQM_RM__AUTH__JWT_SECRET=your-secret-key

# CORS
OPENHQM_RM__CORS__ORIGINS=["http://localhost:5173","https://router-manager.openhqm.io"]

# Logging
OPENHQM_RM__LOGGING__LEVEL=INFO
OPENHQM_RM__LOGGING__FORMAT=json
```

---

## 8. Deployment

### 8.1 Docker Deployment

#### 8.1.1 GitHub Pages Deployment (Static Site)

For GitHub Pages, no Docker needed. Build and deploy static files:

```bash
# Build frontend for production
cd frontend
npm run build

# Deploy to GitHub Pages
# Output goes to dist/ directory
# Configure GitHub Pages to serve from /docs or gh-pages branch
```

**GitHub Actions Workflow**:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Build
        run: |
          cd frontend
          npm ci
          npm run build
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./frontend/dist
```

#### 8.1.2 Dockerfile (Frontend)

```dockerfile
# Frontend Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### 8.1.3 Dockerfile (Backend - Python)

```dockerfile
# Backend Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies including jq
RUN apt-get update && apt-get install -y \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY src/ ./src/
COPY config/ ./config/

EXPOSE 8000

CMD ["uvicorn", "openhqm_rm.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### 8.1.4 docker-compose.yml

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "5173:80"
    environment:
      - VITE_API_URL=http://localhost:8000
      - VITE_MODE=full  # 'full' or 'static'
    depends_on:
      - backend

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - OPENHQM_RM__SERVER__PORT=8000
      - OPENHQM_RM__KUBERNETES__ENABLED=true
      - OPENHQM_RM__KUBERNETES__IN_CLUSTER=false
      - OPENHQM_RM__STORAGE__TYPE=redis
    volumes:
      - ~/.kube/config:/root/.kube/config:ro
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

volumes:
  redis-data:
```

### 8.2 GitHub Pages Deployment

**Access**: `https://yourusername.github.io/openhqm-router-manager/`

**Features Available**:
- ✅ Create and edit routes visually
- ✅ Test JQ transformations (client-side)
- ✅ Simulate route matching
- ✅ Export routes as YAML/JSON
- ✅ Import ConfigMaps for editing
- ✅ Download route configurations
- ✅ Save work to browser localStorage
- ❌ Deploy to Kubernetes (requires backend)
- ❌ List existing ConfigMaps (requires backend)
- ❌ Persistent storage (requires backend)

**Frontend Configuration**:
```typescript
// vite.config.ts for GitHub Pages
export default defineConfig({
  base: '/openhqm-router-manager/',  // Repository name
  build: {
    outDir: 'dist'
  },
  define: {
    'import.meta.env.VITE_MODE': '"static"'  // Enable static mode
  }
});
```

**Client-Side Features**:
```typescript
// Frontend detects mode automatically
const isStaticMode = import.meta.env.VITE_MODE === 'static';

if (isStaticMode) {
  // Use jq-web WebAssembly for transforms
  // Use localStorage for persistence
  // Hide Kubernetes deployment features
} else {
  // Use backend API for all operations
}
```

### 8.3 Kubernetes Deployment (Full Mode)

```yaml
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: router-manager-config
  namespace: openhqm
data:
  config.yaml: |
    server:
      port: 8000
    kubernetes:
      enabled: true
      inCluster: true
      defaultNamespace: openhqm

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: router-manager-backend
  namespace: openhqm
spec:
  replicas: 2
  selector:
    matchLabels:
      app: router-manager
      component: backend
  template:
    metadata:
      labels:
        app: router-manager
        component: backend
    spec:
      serviceAccountName: router-manager
      containers:
      - name: backend
        image: openhqm/router-manager-backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: OPENHQM_RM__KUBERNETES__ENABLED
          value: "true"
        - name: OPENHQM_RM__KUBERNETES__IN_CLUSTER
          value: "true"
        - name: OPENHQM_RM__KUBERNETES__DEFAULT_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        - name: OPENHQM_RM__STORAGE__TYPE
          value: "redis"
        - name: OPENHQM_RM__STORAGE__REDIS__URL
          value: "redis://router-manager-redis:6379"
        volumeMounts:
        - name: config
          mountPath: /app/config
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
      volumes:
      - name: config
        configMap:
          name: router-manager-config

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: router-manager-frontend
  namespace: openhqm
spec:
  replicas: 2
  selector:
    matchLabels:
      app: router-manager
      component: frontend
  template:
    metadata:
      labels:
        app: router-manager
        component: frontend
    spec:
      containers:
      - name: frontend
        image: openhqm/router-manager-frontend:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            cpu: 50m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi

---
apiVersion: v1
kind: Service
metadata:
  name: router-manager-backend
  namespace: openhqm
spec:
  selector:
    app: router-manager
    component: backend
  ports:
  - port: 8000
    targetPort: 8000

---
apiVersion: v1
kind: Service
metadata:
  name: router-manager-frontend
  namespace: openhqm
spec:
  selector:
    app: router-manager
    component: frontend
  ports:
  - port: 80
    targetPort: 80

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: router-manager
  namespace: openhqm
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - router-manager.openhqm.io
    secretName: router-manager-tls
  rules:
  - host: router-manager.openhqm.io
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: router-manager-backend
            port:
              number: 8000
      - path: /
        pathType: Prefix
        backend:
          service:
            name: router-manager-frontend
            port:
              number: 80

---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: router-manager
  namespace: openhqm

---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: router-manager
  namespace: openhqm
rules:
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list", "create", "update", "patch", "delete"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: router-manager
  namespace: openhqm
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: router-manager
subjects:
- kind: ServiceAccount
  name: router-manager
  namespace: openhqm
```

---

## 9. Security

### 9.1 Authentication & Authorization

**Authentication Options**:
- JWT tokens
- API keys
- OAuth 2.0 / OIDC
- Kubernetes RBAC (when deployed in-cluster)

**Authorization Levels**:
- **Viewer**: Read-only access to routes
- **Editor**: Create and edit routes, run simulations
- **Admin**: Deploy to Kubernetes, manage configurations

### 9.2 Security Best Practices

1. **Input Validation**: Sanitize all user inputs
2. **JQ Sandboxing**: Limit JQ execution time and memory
3. **CORS Configuration**: Restrict allowed origins
4. **Rate Limiting**: Prevent abuse
5. **Audit Logging**: Track all configuration changes
6. **Secret Management**: Store sensitive data in Kubernetes Secrets
7. **TLS/HTTPS**: Always use encrypted connections
8. **CSP Headers**: Prevent XSS attacks

### 9.3 Audit Trail

Track all changes to routes:

```typescript
interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: 'create' | 'update' | 'delete' | 'deploy';
  resource: 'route' | 'configmap';
  resourceId: string;
  changes?: {
    before: any;
    after: any;
  };
  metadata: {
    ipAddress: string;
    userAgent: string;
  };
}
```

---

## 10. Testing Strategy

### 10.1 Frontend Testing

```typescript
// Example: Route editor test
describe('RouteEditor', () => {
  it('should create a new route with conditions', () => {
    render(<RouteEditor />);
    
    // Fill in basic info
    fireEvent.change(screen.getByLabelText('Route Name'), {
      target: { value: 'Test Route' }
    });
    
    // Add condition
    fireEvent.click(screen.getByText('Add Condition'));
    fireEvent.change(screen.getByLabelText('Field'), {
      target: { value: 'order.priority' }
    });
    
    // Save
    fireEvent.click(screen.getByText('Save'));
    
    expect(mockSaveRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Route',
        conditions: expect.arrayContaining([
          expect.objectContaining({ field: 'order.priority' })
        ])
      })
    );
  });
});
```

### 10.2 Backend Testing

```typescript
// Example: JQ transform test
describe('JQService', () => {
  it('should transform payload using JQ expression', async () => {
    const jqService = new JQService();
    const input = { order: { id: 123, items: [1, 2, 3] } };
    const expression = '{ orderId: .order.id, itemCount: (.order.items | length) }';
    
    const result = await jqService.transform(expression, input);
    
    expect(result.success).toBe(true);
    expect(result.output).toEqual({
      orderId: 123,
      itemCount: 3
    });
  });
});
```

### 10.3 E2E Testing

```typescript
// Example: Full workflow test
describe('Route Management E2E', () => {
  it('should create, test, and deploy a route', async () => {
    // Navigate to app
    await page.goto('http://localhost:5173');
    
    // Create new route
    await page.click('[data-testid="new-route"]');
    await page.fill('[data-testid="route-name"]', 'E2E Test Route');
    
    // Add JQ transform
    await page.fill('[data-testid="jq-expression"]', '{ id: .id }');
    
    // Test transform
    await page.click('[data-testid="test-transform"]');
    await expect(page.locator('[data-testid="transform-result"]')).toBeVisible();
    
    // Save route
    await page.click('[data-testid="save-route"]');
    
    // Deploy to K8s
    await page.click('[data-testid="deploy"]');
    await page.fill('[data-testid="namespace"]', 'openhqm');
    await page.click('[data-testid="confirm-deploy"]');
    
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });
});
```

---

## 11. Monitoring & Observability

### 11.1 Metrics

**Frontend Metrics**:
- Page load times
- User interactions
- Error rates
- JQ transform execution times

**Backend Metrics**:
- API request latency
- JQ execution times
- Kubernetes API calls
- Error rates by endpoint

### 11.2 Logging

Structured logging with correlation IDs:

```typescript
logger.info('Route created', {
  correlationId: req.id,
  userId: req.user.id,
  routeId: route.id,
  routeName: route.name,
  duration: Date.now() - startTime
});
```

### 11.3 Health Checks

```typescript
// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      jq: await checkJQEngine(),
      kubernetes: await checkKubernetesConnection(),
      storage: await checkStorage()
    }
  };
  
  const isHealthy = Object.values(health.checks).every(c => c.status === 'ok');
  res.status(isHealthy ? 200 : 503).json(health);
});
```

---

## 12. Future Enhancements

### 12.1 Phase 2 Features

1. **Git Integration**: Version control for route configurations
2. **Diff Viewer**: Compare route versions
3. **Route Templates**: Pre-built templates for common patterns
4. **Traffic Analysis**: View real traffic and suggest routes
5. **A/B Testing**: Test multiple route versions
6. **Route Performance**: Monitor route execution metrics
7. **Collaborative Editing**: Real-time collaboration
8. **Import from OpenAPI**: Generate routes from API specs

### 12.2 Phase 3 Features

1. **AI-Assisted Route Creation**: LLM-powered route suggestions
2. **Auto-optimization**: Analyze and optimize route performance
3. **Multi-cluster Support**: Manage routes across clusters
4. **Route Marketplace**: Share and discover route templates
5. **Advanced Visualizations**: Flow diagrams, dependency graphs
6. **Integration Testing**: Test against live OpenHQM instances
7. **Backup & Restore**: Route configuration backups
8. **Access Control**: Fine-grained permissions

---

## 13. Development Guidelines

### 13.1 Code Standards

**TypeScript**:
- Strict mode enabled
- No `any` types without justification
- Comprehensive type coverage

**React**:
- Functional components only
- Custom hooks for reusable logic
- Proper error boundaries

**Testing**:
- Minimum 80% code coverage
- Unit tests for all services
- Integration tests for APIs
- E2E tests for critical flows

### 13.2 Git Workflow

```
main
├── develop
│   ├── feature/route-editor
│   ├── feature/jq-playground
│   └── feature/k8s-integration
└── hotfix/security-patch
```

**Branch Naming**:
- `feature/description` - New features
- `bugfix/description` - Bug fixes
- `hotfix/description` - Critical fixes
- `docs/description` - Documentation

**Commit Messages**:
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### 13.3 Code Review Checklist

- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No security vulnerabilities
- [ ] Performance considerations addressed
- [ ] Error handling implemented
- [ ] Logging added for key operations
- [ ] No console.log statements in production code

---

## 14. Documentation

### 14.1 User Documentation

- **Getting Started Guide**: Installation and first route
- **Route Configuration Guide**: Comprehensive routing documentation
- **JQ Reference**: JQ expression examples and patterns
- **API Documentation**: Complete API reference
- **Troubleshooting**: Common issues and solutions

### 14.2 Developer Documentation

- **Architecture Overview**: System design and components
- **API Reference**: Backend API documentation (OpenAPI/Swagger)
- **Component Documentation**: Frontend component library (Storybook)
- **Deployment Guide**: Deployment instructions
- **Contributing Guide**: How to contribute

---

## 15. Appendix

### 15.1 JQ Common Patterns

```jq
# Extract specific fields
{ id: .id, name: .name }

# Map array
[.items[] | { id: .id, name: .name }]

# Filter array
[.items[] | select(.active == true)]

# Conditional
if .type == "premium" then .discount = 0.2 else .discount = 0.1 end

# Default values
.email // .phone // "N/A"

# Nested access with safety
.user?.profile?.email // "no-email"

# Array operations
.items | length
.items | sort_by(.priority)
.items | group_by(.category)

# Date operations
now | strftime("%Y-%m-%d")

# String operations
.name | ascii_upcase
.description | split(" ") | join("-")

# Math operations
.price * 1.1
(.items | map(.price) | add) / (.items | length)
```

### 15.2 Example Route Configurations

See `examples/routes/` directory for complete examples:
- `high-priority-orders.yaml` - Priority-based routing
- `customer-segmentation.yaml` - Route by customer type
- `data-enrichment.yaml` - Transform and enrich payloads
- `error-handling.yaml` - Error routing patterns
- `multi-destination.yaml` - Fan-out routing

### 15.3 Glossary

- **Route**: A configuration rule that matches messages and defines processing
- **Condition**: A rule that determines if a route matches
- **Transform**: JQ expression that modifies message payload
- **Destination**: Target endpoint/queue for matched messages
- **ConfigMap**: Kubernetes resource for configuration data
- **JQ**: JSON query language for transformations
- **Simulation**: Test execution of routes with sample data

### 15.4 References

**Backend (Python)**:
- **FastAPI**: https://fastapi.tiangolo.com/
- **pyjq**: https://github.com/doloopwhile/pyjq
- **Kubernetes Python Client**: https://github.com/kubernetes-client/python
- **Pydantic**: https://docs.pydantic.dev/
- **pytest**: https://docs.pytest.org/

**Frontend**:
- **React Documentation**: https://react.dev/
- **Monaco Editor**: https://microsoft.github.io/monaco-editor/
- **jq-web (WebAssembly)**: https://github.com/jqlang/jq-web
- **Material-UI**: https://mui.com/
- **Vite**: https://vitejs.dev/

**General**:
- **JQ Manual**: https://stedolan.github.io/jq/manual/
- **Kubernetes ConfigMaps**: https://kubernetes.io/docs/concepts/configuration/configmap/
- **GitHub Pages**: https://pages.github.com/

### 15.5 Change Log

- **2026-02-08**: Initial SDD version 1.0
- **2026-02-08**: Version 1.1 - Changed backend to Python (FastAPI), added GitHub Pages deployment option

---

**End of Document**

