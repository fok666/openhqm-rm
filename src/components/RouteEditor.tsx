import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Typography,
  Paper,
  Divider,
  Switch,
  FormControlLabel,
  IconButton,
  Alert,
  Snackbar,
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon, Save as SaveIcon } from '@mui/icons-material';
import { useRouteStore } from '../store';
import type { Route, RouteCondition, DestinationConfig } from '../types';

export const RouteEditor: React.FC = () => {
  const { selectedRoute, updateRoute } = useRouteStore();
  const [localRoute, setLocalRoute] = useState<Route | null>(null);
  const [validationError, setValidationError] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    setLocalRoute(selectedRoute);
    setValidationError('');
    setShowSuccess(false);
  }, [selectedRoute]);

  if (!localRoute) {
    return (
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'text.secondary',
        }}
      >
        <Typography>Select a route to edit</Typography>
      </Box>
    );
  }

  const handleUpdate = (updates: Partial<Route>) => {
    const updated = { ...localRoute, ...updates };
    setLocalRoute(updated);
    setValidationError('');
  };

  const handleSave = () => {
    // Validate required fields
    if (!localRoute.name || localRoute.name.trim() === '') {
      setValidationError('Route name is required');
      return;
    }
    if (!localRoute.destination?.target || localRoute.destination.target.trim() === '') {
      setValidationError('Destination target is required');
      return;
    }

    // Save to store
    updateRoute(localRoute.id, localRoute);
    setValidationError('');
    setShowSuccess(true);
  };

  const handleAddCondition = () => {
    const newCondition: RouteCondition = {
      type: 'payload',
      field: '',
      operator: 'equals',
      value: '',
    };
    handleUpdate({ conditions: [...localRoute.conditions, newCondition] });
  };

  const handleUpdateCondition = (index: number, updates: Partial<RouteCondition>) => {
    const conditions = [...localRoute.conditions];
    conditions[index] = { ...conditions[index], ...updates };
    handleUpdate({ conditions });
  };

  const handleDeleteCondition = (index: number) => {
    const conditions = localRoute.conditions.filter((_, i) => i !== index);
    handleUpdate({ conditions });
  };

  return (
    <Paper data-testid="route-editor" sx={{ height: '100%', overflow: 'auto', p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Route Configuration
      </Typography>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Basic Info
        </Typography>
        <TextField
          label="Route Name"
          value={localRoute.name}
          onChange={(e) => handleUpdate({ name: e.target.value })}
          fullWidth
          margin="normal"
          inputProps={{ 'data-testid': 'route-name-input' }}
          required
        />
        <TextField
          label="Description"
          value={localRoute.description || ''}
          onChange={(e) => handleUpdate({ description: e.target.value })}
          fullWidth
          margin="normal"
          multiline
          rows={2}
          inputProps={{ 'data-testid': 'route-description-input' }}
        />
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <TextField
            label="Priority"
            type="number"
            value={localRoute.priority}
            onChange={(e) => handleUpdate({ priority: parseInt(e.target.value) })}
            sx={{ flex: 1 }}
            inputProps={{ 'data-testid': 'route-priority-input' }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={localRoute.enabled}
                onChange={(e) => handleUpdate({ enabled: e.target.checked })}
              />
            }
            label="Enabled"
          />
        </Box>
      </Box>

      <Divider sx={{ my: 3 }} />

      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Conditions</Typography>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Operator</InputLabel>
            <Select
              value={localRoute.conditionOperator}
              onChange={(e) => handleUpdate({ conditionOperator: e.target.value as 'AND' | 'OR' })}
              label="Operator"
              data-testid="condition-operator"
            >
              <MenuItem value="AND">AND</MenuItem>
              <MenuItem value="OR">OR</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {localRoute.conditions.map((condition, index) => (
          <Paper key={index} sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Type</InputLabel>
                <Select
                  value={condition.type}
                  onChange={(e) =>
                    handleUpdateCondition(index, {
                      type: e.target.value as RouteCondition['type'],
                    })
                  }
                  label="Type"
                  size="small"
                  data-testid="condition-type-select"
                >
                  <MenuItem value="payload">Payload</MenuItem>
                  <MenuItem value="header">Header</MenuItem>
                  <MenuItem value="metadata">Metadata</MenuItem>
                  <MenuItem value="jq">JQ Expression</MenuItem>
                </Select>
              </FormControl>

              {condition.type !== 'jq' ? (
                <>
                  <TextField
                    label="Field"
                    value={condition.field || ''}
                    onChange={(e) => handleUpdateCondition(index, { field: e.target.value })}
                    size="small"
                    sx={{ flex: 1 }}
                    inputProps={{ 'data-testid': 'condition-field-input' }}
                  />
                  <FormControl sx={{ minWidth: 120 }}>
                    <InputLabel>Operator</InputLabel>
                    <Select
                      value={condition.operator}
                      onChange={(e) =>
                        handleUpdateCondition(index, {
                          operator: e.target.value as RouteCondition['operator'],
                        })
                      }
                      label="Operator"
                      size="small"
                      data-testid="condition-operator-select"
                    >
                      <MenuItem value="equals">Equals</MenuItem>
                      <MenuItem value="contains">Contains</MenuItem>
                      <MenuItem value="regex">Regex</MenuItem>
                      <MenuItem value="exists">Exists</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    label="Value"
                    value={condition.value || ''}
                    onChange={(e) => handleUpdateCondition(index, { value: e.target.value })}
                    size="small"
                    sx={{ flex: 1 }}
                    inputProps={{ 'data-testid': 'condition-value-input' }}
                  />
                </>
              ) : (
                <TextField
                  label="JQ Expression"
                  value={condition.jqExpression || ''}
                  onChange={(e) => handleUpdateCondition(index, { jqExpression: e.target.value })}
                  size="small"
                  sx={{ flex: 1 }}
                  placeholder=".order.priority == 'high'"
                />
              )}

              <IconButton onClick={() => handleDeleteCondition(index)} size="small">
                <DeleteIcon />
              </IconButton>
            </Box>
          </Paper>
        ))}

        <Button
          startIcon={<AddIcon />}
          onClick={handleAddCondition}
          variant="outlined"
          data-testid="add-condition-button"
        >
          Add Condition
        </Button>
      </Box>

      <Divider sx={{ my: 3 }} />

      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Destination
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={localRoute.destination.type}
              onChange={(e) =>
                handleUpdate({
                  destination: {
                    ...localRoute.destination,
                    type: e.target.value as DestinationConfig['type'],
                  },
                })
              }
              label="Type"
            >
              <MenuItem value="endpoint">Endpoint</MenuItem>
              <MenuItem value="queue">Queue</MenuItem>
              <MenuItem value="webhook">Webhook</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Target"
            value={localRoute.destination.target}
            onChange={(e) =>
              handleUpdate({
                destination: { ...localRoute.destination, target: e.target.value },
              })
            }
            fullWidth
            inputProps={{ 'data-testid': 'destination-endpoint-input' }}
          />
        </Box>
      </Box>

      <Divider sx={{ my: 3 }} />

      {validationError && (
        <Alert severity="error" data-testid="validation-error" sx={{ mb: 2 }}>
          {validationError}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          data-testid="save-route-button"
        >
          Save Route
        </Button>
      </Box>

      <Snackbar
        open={showSuccess}
        autoHideDuration={3000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity="success"
          onClose={() => setShowSuccess(false)}
          data-testid="save-success-message"
        >
          Route saved successfully!
        </Alert>
      </Snackbar>
    </Paper>
  );
};
