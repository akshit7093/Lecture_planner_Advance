import { apiRequest } from "./queryClient";
import { 
  PathwayFormData, 
  CompleteLearningPathway,
  NodeEnhancementData,
  CustomNode,
  CustomEdge
} from "@/types";
import { Edge, Node } from "@shared/schema";
import { MarkerType, EdgeMarker } from "reactflow";

// Pathways API
export const fetchPathways = async () => {
  const res = await fetch('/api/pathways', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch pathways');
  return res.json();
};

export const fetchPathway = async (id: number) => {
  const res = await fetch(`/api/pathways/${id}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch pathway');
  return res.json();
};

export const fetchNodesAndEdges = async (pathwayId: number) => {
  const [nodesRes, edgesRes] = await Promise.all([
    fetch(`/api/pathways/${pathwayId}/nodes`, { credentials: 'include' }),
    fetch(`/api/pathways/${pathwayId}/edges`, { credentials: 'include' })
  ]);
  
  if (!nodesRes.ok) throw new Error('Failed to fetch nodes');
  if (!edgesRes.ok) throw new Error('Failed to fetch edges');
  
  const nodes = await nodesRes.json();
  const edges = await edgesRes.json();
  
  return { nodes, edges };
};

export const generatePathway = async (data: PathwayFormData): Promise<CompleteLearningPathway> => {
  const res = await apiRequest('POST', '/api/generate', data);
  return res.json();
};

export const deletePathway = async (id: number) => {
  return apiRequest('DELETE', `/api/pathways/${id}`);
};

// Nodes API
export const updateNode = async (id: number, data: Partial<Node>) => {
  const res = await apiRequest('PATCH', `/api/nodes/${id}`, data);
  return res.json();
};

export const createNode = async (data: Omit<Node, 'id'>) => {
  const res = await apiRequest('POST', `/api/nodes`, data);
  return res.json();
};

export const deleteNode = async (id: number) => {
  return apiRequest('DELETE', `/api/nodes/${id}`);
};

// Edges API
export const updateEdge = async (id: number, data: Partial<Edge>) => {
  const res = await apiRequest('PATCH', `/api/edges/${id}`, data);
  return res.json();
};

export const createEdge = async (data: Omit<Edge, 'id'>) => {
  const res = await apiRequest('POST', `/api/edges`, data);
  return res.json();
};

export const deleteEdge = async (id: number) => {
  return apiRequest('DELETE', `/api/edges/${id}`);
};

// Node enhancement
export const enhanceNode = async (data: NodeEnhancementData) => {
  const res = await apiRequest('POST', '/api/enhance-node', data);
  return res.json();
};

// Convert database nodes/edges to ReactFlow format
export const convertToReactFlowElements = (nodes: Node[], edges: Edge[]) => {
  const reactFlowNodes: CustomNode[] = nodes.map((node) => ({
    id: node.nodeId,
    type: 'customNode',
    position: node.position as { x: number, y: number },
    data: {
      id: node.id,
      label: node.title,
      description: node.description || undefined,
      topics: node.topics as string[] | undefined,
      questions: node.questions as string[] | undefined,
      resources: node.resources as { title: string, url: string }[] | undefined,
      equations: node.equations as string[] | undefined,
      codeExamples: node.codeExamples as string[] | undefined,
      isExpanded: false,
    },
  }));

  const reactFlowEdges: CustomEdge[] = edges.map((edge) => ({
    id: edge.edgeId,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    animated: edge.animated === 1,
    label: edge.label || undefined,
    data: {
      id: edge.id,
      label: edge.label || undefined,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#718096',
    } as EdgeMarker,
    style: {
      stroke: '#718096',
    },
  }));

  return { nodes: reactFlowNodes, edges: reactFlowEdges };
};

// Auto layout the nodes in a horizontal hierarchical tree
export const layoutNodes = (nodes: CustomNode[], edges: CustomEdge[]) => {
  // First, build a tree structure
  const nodeMap = new Map<string, { node: CustomNode; children: CustomNode[]; level: number; processed: boolean }>();
  
  // Initialize the map with all nodes
  nodes.forEach(node => {
    nodeMap.set(node.id, { node, children: [], level: 0, processed: false });
  });
  
  // Find root nodes (nodes without parents)
  let rootNodes: CustomNode[] = Array.from(nodeMap.values())
    .map(item => item.node)
    .filter(node => {
      // A node is a root if no edge has it as a target
      return !edges.some(edge => edge.target === node.id);
    });
  
  // If no root nodes are found, take the first node as root
  if (rootNodes.length === 0 && nodes.length > 0) {
    rootNodes = [nodes[0]];
  }
  
  // First pass: calculate the level (depth) for each node using BFS
  const queue: { nodeId: string; level: number }[] = rootNodes.map(node => ({ nodeId: node.id, level: 0 }));
  
  while (queue.length > 0) {
    const { nodeId, level } = queue.shift()!;
    const item = nodeMap.get(nodeId);
    
    if (item && !item.processed) {
      item.level = level;
      item.processed = true;
      
      // Find all children of this node (where this node is the source)
      edges.forEach(edge => {
        if (edge.source === nodeId) {
          const targetNode = nodes.find(n => n.id === edge.target);
          
          if (targetNode) {
            const targetItem = nodeMap.get(edge.target);
            if (targetItem) {
              // Only push as a child if not already processed or if the new level is deeper
              if (!targetItem.processed || level + 1 > targetItem.level) {
                item.children.push(targetNode);
                queue.push({ nodeId: edge.target, level: level + 1 });
              }
            }
          }
        }
      });
    }
  }
  
  // Reset processed flag for the next phase
  Array.from(nodeMap.values()).forEach(item => {
    item.processed = false;
  });
  
  // Group nodes by level for hierarchical layout
  const nodesByLevel: Map<number, CustomNode[]> = new Map();
  Array.from(nodeMap.values()).forEach(item => {
    const level = item.level;
    if (!nodesByLevel.has(level)) {
      nodesByLevel.set(level, []);
    }
    nodesByLevel.get(level)!.push(item.node);
  });
  
  // Constants for spacing
  const HORIZONTAL_SPACING = 450; // Increased for more space between columns
  const VERTICAL_SPACING = 250;   // Increased for more space between rows
  const NODE_HEIGHT = 150;        // Approximate height of a node
  
  // Position nodes level by level (horizontal tree layout)
  const maxLevel = Math.max(...Array.from(nodesByLevel.keys()));
  
  for (let level = 0; level <= maxLevel; level++) {
    const levelNodes = nodesByLevel.get(level) || [];
    
    // Sort nodes within each level based on connections to previous level
    if (level > 0) {
      levelNodes.sort((a, b) => {
        // Find parent indices in previous level
        const aParentIndices: number[] = [];
        const bParentIndices: number[] = [];
        
        edges.forEach(edge => {
          if (edge.target === a.id) {
            const parentNode = nodes.find(n => n.id === edge.source);
            if (parentNode) {
              const parentItem = nodeMap.get(edge.source);
              if (parentItem && parentItem.level === level - 1) {
                const parentIndex = nodesByLevel.get(level - 1)?.findIndex(n => n.id === edge.source) || 0;
                aParentIndices.push(parentIndex);
              }
            }
          }
          if (edge.target === b.id) {
            const parentNode = nodes.find(n => n.id === edge.source);
            if (parentNode) {
              const parentItem = nodeMap.get(edge.source);
              if (parentItem && parentItem.level === level - 1) {
                const parentIndex = nodesByLevel.get(level - 1)?.findIndex(n => n.id === edge.source) || 0;
                bParentIndices.push(parentIndex);
              }
            }
          }
        });
        
        // Compare based on average parent position
        const aAvg = aParentIndices.length ? aParentIndices.reduce((sum, idx) => sum + idx, 0) / aParentIndices.length : 0;
        const bAvg = bParentIndices.length ? bParentIndices.reduce((sum, idx) => sum + idx, 0) / bParentIndices.length : 0;
        
        return aAvg - bAvg;
      });
    }
    
    // Position nodes in this level
    const levelHeight = levelNodes.length * VERTICAL_SPACING;
    let startY = -levelHeight / 2; // Center vertically
    
    levelNodes.forEach((node, index) => {
      // Position with even vertical spacing
      node.position = {
        x: level * HORIZONTAL_SPACING,
        y: startY + index * VERTICAL_SPACING
      };
      
      // Check for node overlap and adjust if needed
      for (let i = 0; i < index; i++) {
        const prevNode = levelNodes[i];
        const verticalDistance = Math.abs(node.position.y - prevNode.position.y);
        
        if (verticalDistance < NODE_HEIGHT) {
          // Move current node down to avoid overlap
          node.position.y += (NODE_HEIGHT - verticalDistance) + 20; // Add extra padding
        }
      }
    });
  }
  
  // Center the entire graph
  if (nodes.length > 0) {
    // Calculate bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    nodes.forEach(node => {
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x);
      maxY = Math.max(maxY, node.position.y);
    });
    
    // Center horizontally
    const offsetX = -minX;
    
    // Apply offset
    nodes.forEach(node => {
      node.position.x += offsetX;
      node.position.y += Math.abs(minY) + 100; // Add top margin
    });
  }
  
  return nodes;
};
