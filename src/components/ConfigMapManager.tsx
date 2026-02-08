import React, { useState } from 'react';
import { Box, Paper, Typography, Button, Alert, Tabs, Tab } from '@mui/material';
import { Download as DownloadIcon, Upload as UploadIcon } from '@mui/icons-material';
import Editor from '@monaco-editor/react';
import { useRouteStore } from '../store';
import { storageService } from '../services';

export const ConfigMapManager: React.FC = () => {
  const { routes, setRoutes } = useRouteStore();
  const [exportFormat, setExportFormat] = useState<'yaml' | 'json'>('yaml');
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');

  const handleExport = () => {
    try {
      const content =
        exportFormat === 'yaml'
          ? storageService.exportToYAML(routes)
          : storageService.exportToJSON(routes);

      setPreview(content);
      setError('');
    } catch (err: any) {
      setError(`Export failed: ${err.message}`);
    }
  };

  const handleDownload = () => {
    try {
      const content =
        preview ||
        (exportFormat === 'yaml'
          ? storageService.exportToYAML(routes)
          : storageService.exportToJSON(routes));

      const filename = exportFormat === 'yaml' ? 'openhqm-routes.yaml' : 'openhqm-routes.json';
      const mimeType = exportFormat === 'yaml' ? 'text/yaml' : 'application/json';

      storageService.downloadFile(content, filename, mimeType);
      setError('');
    } catch (err: any) {
      setError(`Download failed: ${err.message}`);
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedRoutes = storageService.importFromYAML(content);
        setRoutes(importedRoutes);
        setError('');
        alert(`Successfully imported ${importedRoutes.length} routes`);
      } catch (err: any) {
        setError(`Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  React.useEffect(() => {
    if (routes.length > 0) {
      handleExport();
    }
  }, [routes, exportFormat]);

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
      <Typography variant="h6" gutterBottom>
        ConfigMap Manager
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Button
          variant="outlined"
          component="label"
          startIcon={<UploadIcon />}
          data-testid="import-button"
        >
          Import ConfigMap
          <input
            type="file"
            hidden
            accept=".yaml,.yml,.json"
            onChange={handleImport}
            data-testid="import-file-input"
          />
        </Button>

        <Tabs value={exportFormat} onChange={(_, v) => setExportFormat(v)}>
          <Tab label="YAML" value="yaml" />
          <Tab label="JSON" value="json" />
        </Tabs>

        <Box sx={{ flex: 1 }} />

        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={handleDownload}
          disabled={routes.length === 0}
          data-testid="export-button"
        >
          Download ConfigMap
        </Button>
      </Box>

      {routes.length > 0 && (
        <Box
          data-testid="configmap-preview"
          sx={{
            flexGrow: 1,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          <Editor
            height="100%"
            language={exportFormat}
            value={preview}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 14,
            }}
          />
        </Box>
      )}

      {routes.length === 0 && (
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'text.secondary',
          }}
        >
          <Typography>Create routes to generate ConfigMap</Typography>
        </Box>
      )}
    </Paper>
  );
};
