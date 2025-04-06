import { apiRequest } from "./queryClient";
import { MarkerType } from 'reactflow';
import { 
  PathwayFormData, 
  CompleteLearningPathway,
  NodeEnhancementData,
  CustomNode,
  CustomEdge
} from "@/types";
import { Edge as DbEdge, Node as DbNode } from "@shared/schema";

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
export const updateNode = async (id: number, data: Partial<DbNode>) => {
  const res = await apiRequest('PATCH', `/api/nodes/${id}`, data);
  return res.json();
};

export const createNode = async (data: Omit<DbNode, 'id'>) => {
  const res = await apiRequest('POST', `/api/nodes`, data);
  return res.json();
};

export const deleteNode = async (id: number) => {
  return apiRequest('DELETE', `/api/nodes/${id}`);
};

// Edges API
export const updateEdge = async (id: number, data: Partial<DbEdge>) => {
  const res = await apiRequest('PATCH', `/api/edges/${id}`, data);
  return res.json();
};

export const createEdge = async (data: Omit<DbEdge, 'id'>) => {
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
export const convertToReactFlowElements = (nodes: DbNode[], edges: DbEdge[]) => {
  // Add debug logs
  console.log("Converting nodes count:", nodes.length);
  console.log("Node IDs in database:", nodes.map(n => n.id).join(', '));
  console.log("Node nodeIDs in database:", nodes.map(n => n.nodeId).join(', '));
  
  // Create a mapping from database IDs to nodeIds
  const nodeIdMapping = new Map<number, string>();
  nodes.forEach(node => {
    nodeIdMapping.set(node.id, node.nodeId);
  });
  
  console.log("Node ID mapping:", Array.from(nodeIdMapping.entries()).map(([dbId, nodeId]) => `${dbId} -> ${nodeId}`).join(', '));
  
  const reactFlowNodes: CustomNode[] = nodes.map((node) => {
    // Always use the nodeId for ReactFlow as it's what we use for connections
    // If nodeId is missing, generate a fallback using the database ID
    const nodeIdStr = node.nodeId || `node_${node.id}_fallback`;
    
    console.log(`Converting node ${node.id}: title=${node.title}, nodeId=${nodeIdStr}`);
    
    return {
      id: nodeIdStr,
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
    };
  });

  // Add debug logs
  console.log("Converting edges count:", edges.length);
  console.log("Edge IDs in database:", edges.map(e => e.id).join(', '));
  console.log("Edge connections in database:", edges.map(e => `${e.source} -> ${e.target}`).join(', '));
  
  const reactFlowEdges: CustomEdge[] = edges.map((edge) => {
    // For ReactFlow edges, we need to use the edge.edgeId for the id
    // If edgeId is missing, generate a fallback using the database ID
    const edgeIdStr = edge.edgeId || `edge_${edge.id}_fallback`;
    
    // The source and target should match the nodeId values, not the database id
    // Ensure they have values, fallback to empty string (will be filtered later)
    const sourceStr = edge.source || "";
    const targetStr = edge.target || "";
    
    console.log(`Converting edge ${edge.id}: edgeId=${edgeIdStr}, source=${sourceStr}, target=${targetStr}`);
    
    return {
      id: edgeIdStr,
      source: sourceStr,
      target: targetStr,
      type: 'smoothstep',
      animated: edge.animated === 1,
      label: edge.label || undefined,
      data: {
        id: edge.id,
        label: edge.label || undefined,
      },
      markerEnd: MarkerType.ArrowClosed,
      style: {
        stroke: '#718096',
      },
    };
  });
  
  // Filter out any edges with empty source or target
  const validReactFlowEdges = reactFlowEdges.filter(edge => 
    edge.source && edge.target && 
    edge.source.trim() !== "" && edge.target.trim() !== ""
  );

  // Log final conversion
  console.log("Converted ReactFlow nodes:", reactFlowNodes.map(n => `${n.id}`).join(', '));
  console.log("Valid ReactFlow edges:", validReactFlowEdges.map(e => `${e.source} -> ${e.target}`).join(', '));
  console.log(`Filtered out ${reactFlowEdges.length - validReactFlowEdges.length} invalid edges`);

  return { nodes: reactFlowNodes, edges: validReactFlowEdges };
};

// Auto layout the nodes in a horizontal hierarchical tree
export const layoutNodes = (nodes: CustomNode[], edges: CustomEdge[]) => {
  console.log("layoutNodes - nodes count:", nodes.length);
  console.log("layoutNodes - edges count:", edges.length);
  console.log("layoutNodes - node IDs:", nodes.map(n => n.id).join(', '));
  console.log("layoutNodes - edge connections:", edges.map(e => `${e.source} -> ${e.target}`).join(', '));
  
  if (nodes.length === 0) {
    console.log("No nodes to layout, returning empty array");
    return [];
  }
  
  // First, build a tree structure
  const nodeMap = new Map<string, { node: CustomNode; children: CustomNode[] }>();
  
  // Initialize the map with all nodes
  nodes.forEach(node => {
    nodeMap.set(node.id, { node, children: [] });
  });
  
  console.log("nodeMap size:", nodeMap.size);
  
  // Find root nodes (nodes without parents)
  let rootNodes: CustomNode[] = Array.from(nodeMap.values())
    .map(item => item.node)
    .filter(node => {
      // A node is a root if no edge has it as a target
      return !edges.some(edge => edge.target === node.id);
    });
  
  console.log("Root nodes found:", rootNodes.length, rootNodes.map(n => n.id).join(', '));
  
  // If no root nodes are found, take the first node as root
  if (rootNodes.length === 0 && nodes.length > 0) {
    rootNodes = [nodes[0]];
    console.log("No root nodes found, using first node as root:", nodes[0].id);
  }
  
  // Build the tree by associating children with parents
  edges.forEach(edge => {
    // This is crucial: we need to use the React Flow string ID, not the database ID
    const sourceItem = nodeMap.get(edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (sourceItem && targetNode) {
      sourceItem.children.push(targetNode);
      console.log(`Added child ${targetNode.id} to parent ${edge.source}`);
    } else {
      console.log(`Could not connect edge: ${edge.source} -> ${edge.target}`);
      if (!sourceItem) console.log(`  Source node ${edge.source} not found in nodeMap`);
      if (!targetNode) console.log(`  Target node ${edge.target} not found in nodes array`);
      
      // Log all node IDs to help debug
      console.log("Available node IDs in nodes array:", nodes.map(n => n.id).join(', '));
      console.log("Available node IDs in nodeMap:", Array.from(nodeMap.keys()).join(', '));
    }
  });
  
  // Log the children of each node
  Array.from(nodeMap.entries()).forEach(([nodeId, item]) => {
    console.log(`Node ${nodeId} has ${item.children.length} children: ${item.children.map(c => c.id).join(', ')}`);
  });
  
  // Recursively position nodes in a HORIZONTAL tree (left to right instead of top-down)
  const HORIZONTAL_SPACING = 350; // Space between levels (columns)
  const VERTICAL_SPACING = 150;   // Space between siblings (rows)
  
  // First, determine tree depth to better calculate initial positions
  const getTreeDepth = (nodeId: string, visited = new Set<string>()): number => {
    if (visited.has(nodeId)) return 0;
    visited.add(nodeId);
    
    const item = nodeMap.get(nodeId);
    if (!item || item.children.length === 0) return 1;
    
    let maxChildDepth = 0;
    item.children.forEach(child => {
      const childDepth = getTreeDepth(child.id, visited);
      maxChildDepth = Math.max(maxChildDepth, childDepth);
    });
    
    return 1 + maxChildDepth;
  };
  
  const positionNode = (
    nodeId: string, 
    depth: number,      // Horizontal position (X-coordinate column)
    rowPosition: number, // Vertical position (Y-coordinate row)
    processedNodes: Set<string>
  ): { rowCount: number } => {
    console.log(`Positioning node ${nodeId} at depth ${depth}, row ${rowPosition}`);
    
    if (processedNodes.has(nodeId)) {
      console.log(`Node ${nodeId} already processed, skipping`);
      return { rowCount: 0 };
    }
    
    processedNodes.add(nodeId);
    
    const item = nodeMap.get(nodeId);
    if (!item) {
      console.log(`Node ${nodeId} not found in nodeMap, skipping`);
      return { rowCount: 0 };
    }
    
    const { node, children } = item;
    
    // Position the current node HORIZONTALLY: x = depth (column), y = row
    node.position = {
      x: depth * HORIZONTAL_SPACING,
      y: rowPosition * VERTICAL_SPACING
    };
    
    console.log(`Set position of node ${nodeId} to (${node.position.x}, ${node.position.y})`);
    
    // Position children in the next column (depth+1)
    let currentRow = rowPosition;
    let totalRowCount = 1; // Start with 1 for current node
    
    children.forEach(childNode => {
      console.log(`Processing child ${childNode.id} of node ${nodeId}`);
      
      const { rowCount } = positionNode(
        childNode.id, 
        depth + 1,      // Next column to the right
        currentRow,     // Start at current row
        processedNodes
      );
      
      // Move to next row based on how many rows the subtree occupied
      currentRow += Math.max(1, rowCount);
      totalRowCount += Math.max(1, rowCount);
    });
    
    return { rowCount: Math.max(1, children.length > 0 ? totalRowCount - 1 : 1) };
  };
  
  // Position all root nodes and their descendants
  const processedNodes = new Set<string>();
  let currentRow = 0;
  
  rootNodes.forEach(rootNode => {
    console.log(`Laying out tree from root node ${rootNode.id}`);
    
    // Calculate total tree depth to better balance the layout
    const totalDepth = getTreeDepth(rootNode.id);
    console.log(`Tree starting from ${rootNode.id} has depth ${totalDepth}`);
    
    const { rowCount } = positionNode(rootNode.id, 0, currentRow, processedNodes);
    currentRow += rowCount + 1; // Add an extra row of spacing between trees
  });
  
  console.log(`Processed ${processedNodes.size} nodes during layout`);
  
  // Handle any remaining unprocessed nodes (in case of disconnected components)
  nodes.forEach(node => {
    if (!processedNodes.has(node.id)) {
      console.log(`Node ${node.id} was not processed, positioning at the bottom`);
      
      node.position = {
        x: 0,
        y: currentRow * VERTICAL_SPACING
      };
      currentRow++;
    }
  });
  
  return nodes;
};
