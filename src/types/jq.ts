// JQ service types
export interface TransformResult {
  success: boolean;
  output?: any;
  error?: string;
  suggestions?: string[];
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  suggestions?: string[];
}
