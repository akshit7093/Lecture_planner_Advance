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

// Auto layout the nodes in a horizontal hierarchical tree with intelligent separation of topics
export const layoutNodes = (nodes: CustomNode[], edges: CustomEdge[]) => {
  // Create a better structure for tracking node relationships and metadata
  interface NodeMeta {
    node: CustomNode;
    children: CustomNode[];
    parents: CustomNode[];
    level: number;
    processed: boolean;
    treeId: number; // To separate different topic trees
    subtopic?: string; // For grouping related nodes
    width: number; // For calculating node dimensions
    height: number; // For calculating node dimensions
  }
  
  const nodeMap = new Map<string, NodeMeta>();
  
  // Initialize the map with all nodes
  nodes.forEach(node => {
    // Extract potential subtopic from node title
    let subtopic = '';
    if (node.data.label.includes(':')) {
      const parts = node.data.label.split(':');
      subtopic = parts[0].trim();
    }
    
    // Calculate approximate node dimensions based on content
    let width = 300; // Base width
    let height = 150; // Base height
    
    // Adjust height based on content length
    if (node.data.description) {
      height += Math.min(100, node.data.description.length / 2);
    }
    
    // Add height for topics
    if (node.data.topics && node.data.topics.length > 0) {
      height += Math.min(80, node.data.topics.length * 25);
    }
    
    nodeMap.set(node.id, { 
      node, 
      children: [], 
      parents: [],
      level: 0, 
      processed: false, 
      treeId: -1, // Will be assigned during tree identification
      subtopic,
      width,
      height
    });
  });
  
  // Build the parent-child relationships using edges
  edges.forEach(edge => {
    const sourceItem = nodeMap.get(edge.source);
    const targetItem = nodeMap.get(edge.target);
    
    if (sourceItem && targetItem) {
      sourceItem.children.push(targetItem.node);
      targetItem.parents.push(sourceItem.node);
    }
  });
  
  // Find root nodes (nodes without parents)
  let rootNodes: CustomNode[] = Array.from(nodeMap.values())
    .filter(item => item.parents.length === 0)
    .map(item => item.node);
  
  // If no root nodes are found, take the first node as root
  if (rootNodes.length === 0 && nodes.length > 0) {
    rootNodes = [nodes[0]];
  }
  
  // Assign tree IDs to each distinct tree
  let nextTreeId = 0;
  
  const assignTreeId = (nodeId: string, treeId: number, visited = new Set<string>()) => {
    // Avoid cycles
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    
    const item = nodeMap.get(nodeId);
    if (!item) return;
    
    item.treeId = treeId;
    
    // Recursively assign the same tree ID to all children
    edges.forEach(edge => {
      if (edge.source === nodeId) {
        assignTreeId(edge.target, treeId, visited);
      }
    });
  };
  
  // Assign tree IDs for each root node
  rootNodes.forEach(rootNode => {
    assignTreeId(rootNode.id, nextTreeId++);
  });
  
  // For any remaining nodes not assigned a tree ID, give them their own tree ID
  Array.from(nodeMap.values()).forEach(item => {
    if (item.treeId === -1) {
      item.treeId = nextTreeId++;
    }
  });
  
  // Calculate levels for each node using BFS from roots
  const queue: { nodeId: string; level: number }[] = rootNodes.map(node => ({ 
    nodeId: node.id, 
    level: 0 
  }));
  
  const processedInLevel = new Set<string>();
  
  while (queue.length > 0) {
    const { nodeId, level } = queue.shift()!;
    const item = nodeMap.get(nodeId);
    
    // Skip if already processed at this or deeper level
    const levelKey = `${nodeId}-${level}`;
    if (processedInLevel.has(levelKey)) continue;
    processedInLevel.add(levelKey);
    
    if (item) {
      // Only update level if it's deeper than current known level
      if (level > item.level) {
        item.level = level;
      }
      
      // Add all children to the queue
      edges.forEach(edge => {
        if (edge.source === nodeId) {
          queue.push({ nodeId: edge.target, level: level + 1 });
        }
      });
    }
  }
  
  // Get maximum level for each tree
  const treeMaxLevels = new Map<number, number>();
  Array.from(nodeMap.values()).forEach(item => {
    const currentMax = treeMaxLevels.get(item.treeId) || 0;
    if (item.level > currentMax) {
      treeMaxLevels.set(item.treeId, item.level);
    }
  });
  
  // Group nodes by tree and by level for hierarchical layout
  const nodesByTreeAndLevel = new Map<number, Map<number, NodeMeta[]>>();
  
  // Initialize the tree and level maps
  for (let treeId = 0; treeId < nextTreeId; treeId++) {
    nodesByTreeAndLevel.set(treeId, new Map<number, NodeMeta[]>());
    const maxLevel = treeMaxLevels.get(treeId) || 0;
    
    for (let level = 0; level <= maxLevel; level++) {
      nodesByTreeAndLevel.get(treeId)!.set(level, []);
    }
  }
  
  // Fill in the nodes by tree and level
  Array.from(nodeMap.values()).forEach(item => {
    const treeMap = nodesByTreeAndLevel.get(item.treeId);
    if (treeMap) {
      const levelArray = treeMap.get(item.level) || [];
      levelArray.push(item);
      treeMap.set(item.level, levelArray);
    }
  });
  
  // Calculate tree dimensions
  const treeDimensions = new Map<number, { width: number, height: number }>();
  nodesByTreeAndLevel.forEach((levelMap, treeId) => {
    let maxTreeWidth = 0;
    let totalTreeHeight = 0;
    
    levelMap.forEach((nodesInLevel, level) => {
      // Sort nodes within level by subtopic, then by node label
      nodesInLevel.sort((a, b) => {
        // First, try to group by subtopic
        if (a.subtopic && b.subtopic) {
          if (a.subtopic !== b.subtopic) {
            return a.subtopic.localeCompare(b.subtopic);
          }
        }
        
        // Then by parent connections (children of the same parent should be close)
        const aParents = a.parents.map(p => p.id).join(',');
        const bParents = b.parents.map(p => p.id).join(',');
        
        if (aParents !== bParents) {
          return aParents.localeCompare(bParents);
        }
        
        // Finally by node label
        return a.node.data.label.localeCompare(b.node.data.label);
      });
      
      // Update tree dimensions
      maxTreeWidth = Math.max(maxTreeWidth, nodesInLevel.length);
      totalTreeHeight += nodesInLevel.length;
    });
    
    treeDimensions.set(treeId, { 
      width: maxTreeWidth, 
      height: totalTreeHeight
    });
  });
  
  // Constants for spacing
  const HORIZONTAL_SPACING = 550; // Increased for more space between columns
  const VERTICAL_SPACING = 300;   // Increased for more space between rows
  const TREE_SPACING = 400;      // Space between different trees
  
  // Position the nodes
  let currentTreeOffsetY = 0;
  nodesByTreeAndLevel.forEach((levelMap, treeId) => {
    const treeHeight = treeDimensions.get(treeId)?.height || 0;
    
    let levelOffset = 0;
    levelMap.forEach((nodesInLevel, level) => {
      // Calculate vertical space for this level
      const levelHeight = nodesInLevel.reduce((sum, item) => sum + item.height, 0) + 
                          (nodesInLevel.length - 1) * VERTICAL_SPACING;
      
      // Start y position for this level (centered)
      let posY = currentTreeOffsetY + levelOffset;
      
      nodesInLevel.forEach((item, index) => {
        // Position node - staggering even/odd levels slightly for better edge routing
        const offset = level % 2 === 0 ? 0 : HORIZONTAL_SPACING * 0.15;
        
        item.node.position = {
          x: level * HORIZONTAL_SPACING + offset,
          y: posY
        };
        
        // Move to next position
        posY += item.height + VERTICAL_SPACING;
        
        // Check for overlaps with previous nodes at the same level
        for (let i = 0; i < index; i++) {
          const prevNode = nodesInLevel[i].node;
          const distance = Math.abs(item.node.position.y - prevNode.position.y);
          
          if (distance < Math.max(item.height, nodesInLevel[i].height)) {
            // Move current node down to avoid overlap
            item.node.position.y += Math.max(item.height, nodesInLevel[i].height) - distance + 40;
            posY = item.node.position.y + item.height + VERTICAL_SPACING;
          }
        }
      });
      
      levelOffset += levelHeight + VERTICAL_SPACING;
    });
    
    // Update offset for the next tree
    currentTreeOffsetY += levelOffset + TREE_SPACING;
  });
  
  // Add horizontal separation between trees - shift each tree to the right
  const treeHorizontalOffset = new Map<number, number>();
  let nextOffset = 0;
  
  // Calculate horizontal offsets for each tree
  for (let treeId = 0; treeId < nextTreeId; treeId++) {
    treeHorizontalOffset.set(treeId, nextOffset);
    const maxLevel = treeMaxLevels.get(treeId) || 0;
    nextOffset += (maxLevel + 1) * HORIZONTAL_SPACING + TREE_SPACING;
  }
  
  // Apply horizontal offsets to position trees side by side
  nodes.forEach(node => {
    const item = nodeMap.get(node.id);
    if (item) {
      const offset = treeHorizontalOffset.get(item.treeId) || 0;
      node.position.x += offset;
    }
  });
  
  // Final adjustments to center everything
  if (nodes.length > 0) {
    // Calculate bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    nodes.forEach(node => {
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x);
      maxY = Math.max(maxY, node.position.y);
    });
    
    // Add margin and center horizontally
    const offsetX = 100 - minX; // Start with a left margin of 100px
    const offsetY = 100 - minY; // Start with a top margin of 100px
    
    // Apply offset to all nodes
    nodes.forEach(node => {
      node.position.x += offsetX;
      node.position.y += offsetY;
    });
  }
  
  return nodes;
};
