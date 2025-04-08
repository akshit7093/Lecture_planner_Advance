import { 
  type Node as ReactFlowNode, 
  type Edge as ReactFlowEdge,
  type NodeProps as ReactFlowNodeProps,
  type EdgeMarker,
  MarkerType
} from 'reactflow';
import { Node, Edge, Pathway } from '@shared/schema';

// Extended ReactFlow Node type to include our custom data
export interface CustomNode extends Omit<ReactFlowNode, 'data'> {
  id: string;
  type: 'customNode';
  position: { x: number; y: number };
  data: {
    id: number;
    label: string;
    description: string | null;
    topics: string[] | null;
    questions: string[] | null;
    resources: { title: string; url: string }[] | null;
    equations: string[] | null;
    codeExamples: string[] | null;
    isExpanded: boolean;
  };
}

// Custom Edge type that matches ReactFlow's expectations
export interface CustomEdge extends Omit<ReactFlowEdge, 'markerEnd'> {
  id: string;
  source: string;
  target: string;
  type: 'smoothstep';
  animated: boolean;
  style: React.CSSProperties;
  label?: string;
  data: {
    id: number;
    label: string | undefined;
  };
  markerEnd: {
    type: MarkerType;
    width: number;
    height: number;
    color: string;
  };
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

// Form for generating a new pathway
export interface PathwayFormData {
  topic: string;
  timespan: 'daily' | 'weekly' | 'monthly' | 'custom';
  customDays?: number;
  complexity: 'beginner' | 'intermediate' | 'advanced';
}

// Learning Pathway with all associated data
export interface CompleteLearningPathway {
  pathway: Pathway;
  nodes: Node[];
  edges: Edge[];
}

// SavedPathway for the sidebar list
export interface SavedPathway {
  id: number;
  title: string;
  timespan: string;
}

// Node enhancement form data
export interface NodeEnhancementData {
  nodeId: number;
  nodeData: {
    title: string;
    description?: string;
  };
  enhanceType: 'questions' | 'resources' | 'equations' | 'codeExamples';
}
