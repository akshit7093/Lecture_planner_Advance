import { apiRequest } from "./queryClient";
import { 
  PathwayFormData, 
  CompleteLearningPathway,
  NodeEnhancementData,
  CustomNode,
  CustomEdge
} from "@/types";
import { Edge, Node } from "@shared/schema";

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
      description: node.description,
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
      type: 'arrowclosed',
      width: 20,
      height: 20,
      color: '#718096',
    },
    style: {
      stroke: '#718096',
    },
  }));

  return { nodes: reactFlowNodes, edges: reactFlowEdges };
};

// Auto layout the nodes in a horizontal hierarchical tree
export const layoutNodes = (nodes: CustomNode[], edges: CustomEdge[]) => {
  // First, build a tree structure
  const nodeMap = new Map<string, { node: CustomNode; children: CustomNode[] }>();
  
  // Initialize the map with all nodes
  nodes.forEach(node => {
    nodeMap.set(node.id, { node, children: [] });
  });
  
  // Find root nodes (nodes without parents)
  let rootNodes: CustomNode[] = [...nodeMap.values()]
    .map(item => item.node)
    .filter(node => {
      // A node is a root if no edge has it as a target
      return !edges.some(edge => edge.target === node.id);
    });
  
  // If no root nodes are found, take the first node as root
  if (rootNodes.length === 0 && nodes.length > 0) {
    rootNodes = [nodes[0]];
  }
  
  // Build the tree by associating children with parents
  edges.forEach(edge => {
    const sourceItem = nodeMap.get(edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (sourceItem && targetNode) {
      sourceItem.children.push(targetNode);
    }
  });
  
  // Recursively position nodes with increased spacing for better readability
  const HORIZONTAL_SPACING = 350; // Increased from 250
  const VERTICAL_SPACING = 200;   // Increased from 150
  
  const positionNode = (
    nodeId: string, 
    level: number, 
    verticalPosition: number,
    processedNodes: Set<string>
  ): { verticalSize: number } => {
    if (processedNodes.has(nodeId)) return { verticalSize: 0 };
    processedNodes.add(nodeId);
    
    const item = nodeMap.get(nodeId);
    if (!item) return { verticalSize: 0 };
    
    const { node, children } = item;
    
    // Calculate the total space needed for children first to center parent
    let totalChildrenHeight = 0;
    if (children.length > 0) {
      // Pre-calculate children heights
      children.forEach(() => {
        totalChildrenHeight += VERTICAL_SPACING;
      });
    }
    
    // Position the current node
    node.position = {
      x: level * HORIZONTAL_SPACING,
      y: verticalPosition
    };
    
    // Position children in a balanced tree layout
    let currentY = verticalPosition - (totalChildrenHeight / 2);
    if (currentY < 0) currentY = 0; // Make sure we don't position above the viewport
    
    let totalVerticalSize = 0;
    
    // If this node has only one child, place it directly across
    if (children.length === 1) {
      const { verticalSize } = positionNode(
        children[0].id, 
        level + 1, 
        verticalPosition, // Same Y position as parent for direct alignment
        processedNodes
      );
      totalVerticalSize = Math.max(VERTICAL_SPACING, verticalSize);
    } 
    // If multiple children, distribute them vertically
    else if (children.length > 1) {
      children.forEach((childNode, index) => {
        // Add proper spacing between siblings
        if (index > 0) {
          currentY += VERTICAL_SPACING;
        }
        
        const { verticalSize } = positionNode(
          childNode.id, 
          level + 1, 
          currentY,
          processedNodes
        );
        
        currentY += verticalSize > 0 ? verticalSize : VERTICAL_SPACING;
        totalVerticalSize += verticalSize > 0 ? verticalSize : VERTICAL_SPACING;
      });
    }
    
    // If no children, return single node height
    if (children.length === 0) {
      return { verticalSize: VERTICAL_SPACING };
    }
    
    return { verticalSize: totalVerticalSize };
  };
  
  // Position all root nodes and their descendants
  const processedNodes = new Set<string>();
  let currentY = 50;
  
  rootNodes.forEach(rootNode => {
    const { verticalSize } = positionNode(rootNode.id, 0, currentY, processedNodes);
    currentY += verticalSize > 0 ? verticalSize + VERTICAL_SPACING : VERTICAL_SPACING * 2;
  });
  
  // Handle any remaining unprocessed nodes (in case of disconnected components)
  nodes.forEach(node => {
    if (!processedNodes.has(node.id)) {
      node.position = {
        x: 0,
        y: currentY
      };
      currentY += VERTICAL_SPACING;
    }
  });
  
  return nodes;
};
