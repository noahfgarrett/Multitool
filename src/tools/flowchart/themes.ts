// ── Flowchart Themes ─────────────────────────────────────────

export interface FlowchartTheme {
  name: string
  canvasBackground: string
  nodeFill: string
  nodeStroke: string
  textColor: string
  edgeColor: string
  gridColor: string
}

export const THEMES: FlowchartTheme[] = [
  {
    name: 'Classic',
    canvasBackground: '#0a0a14',
    nodeFill: 'rgba(244,123,32,0.08)',
    nodeStroke: 'rgba(244,123,32,0.4)',
    textColor: '#ffffff',
    edgeColor: 'rgba(244,123,32,0.5)',
    gridColor: 'rgba(255,255,255,0.06)',
  },
  {
    name: 'Professional',
    canvasBackground: '#ffffff',
    nodeFill: '#e8f0fe',
    nodeStroke: '#4285f4',
    textColor: '#111111',
    edgeColor: '#5f6368',
    gridColor: 'rgba(0,0,0,0.06)',
  },
  {
    name: 'High Contrast',
    canvasBackground: '#ffffff',
    nodeFill: '#ffeb3b',
    nodeStroke: '#000000',
    textColor: '#000000',
    edgeColor: '#000000',
    gridColor: 'rgba(0,0,0,0.12)',
  },
  {
    name: 'Blueprint',
    canvasBackground: '#1a237e',
    nodeFill: 'rgba(255,255,255,0.08)',
    nodeStroke: 'rgba(255,255,255,0.7)',
    textColor: '#ffffff',
    edgeColor: 'rgba(255,255,255,0.5)',
    gridColor: 'rgba(255,255,255,0.08)',
  },
  {
    name: 'Print-Ready',
    canvasBackground: '#ffffff',
    nodeFill: '#f5f5f5',
    nodeStroke: '#333333',
    textColor: '#111111',
    edgeColor: '#555555',
    gridColor: 'rgba(0,0,0,0.05)',
  },
]

export function getThemeByName(name: string): FlowchartTheme | undefined {
  return THEMES.find(t => t.name === name)
}
