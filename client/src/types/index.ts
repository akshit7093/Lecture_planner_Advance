import { 
  type Node as ReactFlowNode, 
  type Edge as ReactFlowEdge,
  type NodeProps as ReactFlowNodeProps,
  type EdgeMarker,
  MarkerType,
  Edge
} from 'reactflow';
import { Node as DbNode, Edge as DbEdge, Pathway } from '@shared/schema';

// Extended ReactFlow Node type to include our custom data
export interface CustomNode extends ReactFlowNode {
  data: {
    id: number;
    label: string;
    description?: string | null;
    topics?: string[];
    questions?: string[];
    resources?: { title: string; url: string }[];
    equations?: string[];
    codeExamples?: string[];
    isExpanded?: boolean;
  };
}

// Just use ReactFlow's Edge type directly
export type CustomEdge = Edge;

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
  nodes: DbNode[];
  edges: DbEdge[];
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
