import React from 'react';

export interface ToolStepData {
  reasoning?: string;
  toolName?: string;
  args?: any;
  result?: any;
  ragContext?: any;
}

// ToolInspector disabled/hidden completely as requested for a clean chat interface
export const ToolInspector: React.FC<{ steps: ToolStepData[] }> = () => {
  return null;
};
