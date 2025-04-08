import { useCallback, useRef, useState, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Edge,
  Connection,
  NodeChange,
  EdgeChange,
  ReactFlowInstance,
  MarkerType,
  Panel,
  ConnectionMode,
  EdgeMarker,
} from 'reactflow';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PlusCircle, Link2, Trash2, RefreshCw, Home } from 'lucide-react';
import SearchBar from './SearchBar';
import NodeComponent from './Node';
import { Node as DbNode, Edge as DbEdge } from '@shared/schema';
import { convertToReactFlowElements, layoutNodes } from '@/lib/api';
import NodeDetail from './NodeDetail';
import { useQueryClient } from '@tanstack/react-query';
import { useAddNode } from '@/lib/hooks';
import 'reactflow/dist/style.css';
import { CustomNode, CustomEdge } from '@/types';
import { Node as ReactFlowNode } from 'reactflow';
// Register custom node types
const nodeTypes = {
  customNode: NodeComponent,
};

interface FlowCanvasProps {
  nodes: DbNode[];
  edges: DbEdge[];
  pathwayId: number | null;
  onReactFlowInstanceChange: (instance: ReactFlowInstance | null) => void;
}

const FlowCanvas = ({
  nodes: dbNodes,
  edges: dbEdges,
  pathwayId,
  onReactFlowInstanceChange
}: FlowCanvasProps) => {
  // Convert DB nodes/edges to ReactFlow format
  const initialElements = convertToReactFlowElements(dbNodes, dbEdges);

  // Apply automatic layout
  const layoutedNodes = layoutNodes(initialElements.nodes, initialElements.edges);

  // State for nodes and edges
  const [nodes, setNodes] = useState<CustomNode[]>(layoutedNodes);
  const [edges, setEdges] = useState<CustomEdge[]>(initialElements.edges);
  const [selectedNode, setSelectedNode] = useState<CustomNode | null>(null);
  const [editNode, setEditNode] = useState<DbNode | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [startNode, setStartNode] = useState<CustomNode | null>(null);

  // State for connection mode
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('default');

  // Keep track of ReactFlow instance
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Access query client for invalidation
  const queryClient = useQueryClient();

  // Custom hook for adding nodes
  const { addNewNode } = useAddNode();

  // Set the start node when nodes are loaded
  useEffect(() => {
    if (nodes.length > 0) {
      // Assuming the first node is the start node
      setStartNode(nodes[0]);
    }
  }, [nodes]);

  // Update nodes when db data changes
  useEffect(() => {
    console.log("FlowCanvas received nodes:", dbNodes.length, "edges:", dbEdges.length);

    // Process even if we only have nodes but no edges
    if (dbNodes.length > 0) {
      const elements = convertToReactFlowElements(dbNodes, dbEdges);
      console.log("Converted elements:", elements);

      const layoutedNodes = layoutNodes(elements.nodes, elements.edges);
      console.log("Layouted nodes:", layoutedNodes);

      setNodes(layoutedNodes);
      setEdges(elements.edges);
    }
  }, [dbNodes, dbEdges]);

  // Update parent component with flow instance
  useEffect(() => {
    onReactFlowInstanceChange(reactFlowInstance);
  }, [reactFlowInstance, onReactFlowInstanceChange]);

  // Handle node enhancement
  const handleNodeEnhance = useCallback((nodeId: number, type: 'questions' | 'resources' | 'equations' | 'codeExamples') => {
    // Find the node in the database nodes
    const node = dbNodes.find(n => n.id === nodeId);
    if (node) {
      setEditNode(node);
      setIsDetailOpen(true);
    }
  }, [dbNodes]);

  // Handle node edit
  const handleNodeEdit = useCallback((nodeId: number) => {
    // Find the node in the database nodes
    const node = dbNodes.find(n => n.id === nodeId);
    if (node) {
      setEditNode(node);
      setIsDetailOpen(true);
    }
  }, [dbNodes]);

  // Handle node selection
  // Handle node selection
// Handle node selection
// import { Node as ReactFlowNode } from 'reactflow';

// Handle node selection
const onNodeClick = useCallback((event: React.MouseEvent, node: ReactFlowNode) => {
  // Ensure the node has the properties of CustomNode
  if ('id' in node && 'type' in node && 'position' in node) {
    setSelectedNode(node as unknown as CustomNode);
  } else {
    console.error('Node does not have the required properties to be a CustomNode');
  }
}, []);

// Handle double click to focus on connected nodes
const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: ReactFlowNode) => {
  // Ensure the node has the properties of CustomNode
  if ('id' in node && 'type' in node && 'position' in node) {
    const customNode = node as unknown as CustomNode;

    // Get all connected edges
    const connectedEdges = edges.filter(
      edge => edge.source === customNode.id || edge.target === customNode.id
    );

    // Get IDs of all connected nodes
    const connectedNodeIds = new Set<string>();
    connectedNodeIds.add(customNode.id); // Include the clicked node

    connectedEdges.forEach(edge => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });

    // Highlight connected nodes and edges
    setNodes(nodes.map(n => ({
      ...n,
      style: {
        ...n.style,
        opacity: connectedNodeIds.has(n.id) ? 1 : 0.25,
        boxShadow: n.id === customNode.id ? '0 0 8px 2px #2B6CB0' : undefined
      },
    })));

    setEdges(edges.map(e => ({
      ...e,
      style: {
        ...e.style,
        opacity: (connectedNodeIds.has(e.source) && connectedNodeIds.has(e.target)) ? 1 : 0.25,
        stroke: (e.source === customNode.id || e.target === customNode.id) ? '#2B6CB0' : e.style?.stroke || '#718096'
      },
      animated: (e.source === customNode.id || e.target === customNode.id)
    })));

    // Center view on these nodes with animation
    if (reactFlowInstance) {
      const nodeArray = nodes.filter(n => connectedNodeIds.has(n.id));
      if (nodeArray.length > 0) {
        reactFlowInstance.fitView({
          padding: 0.3,
          duration: 800,
          nodes: nodeArray
        });
      }
    }
  } else {
    console.error('Node does not have the required properties to be a CustomNode');
  }
}, [nodes, edges, reactFlowInstance]);

// Handle node drag
const onNodeDragStop = useCallback((_: React.MouseEvent, node: ReactFlowNode) => {
  // Ensure the node has the properties of CustomNode
  if ('id' in node && 'type' in node && 'position' in node) {
    const customNode = node as unknown as CustomNode;
    // Update node position in the database if needed
    console.log('Node position updated:', customNode.id, customNode.position);
  } else {
    console.error('Node does not have the required properties to be a CustomNode');
  }
}, []);


  // Handle node/edge changes
  // Handle node/edge changes
const onNodesChange = useCallback((changes: NodeChange[]) => {
  setNodes((nds) => applyNodeChanges(changes, nds) as CustomNode[]);
}, []);

const onEdgesChange = useCallback((changes: EdgeChange[]) => {
  setEdges((eds) => {
    const updatedEdges = applyEdgeChanges(changes, eds);
    // Ensure the result is of type CustomEdge[]
    return updatedEdges.map(edge => ({
      ...edge,
      type: 'smoothstep', // Ensure type is 'smoothstep'
    })) as CustomEdge[];
  });
}, []);

// Handle new connections
const onConnect = useCallback((connection: Connection) => {
  const newEdge: CustomEdge = {
    ...connection,
    id: `edge-${connection.source}-${connection.target}`,
    type: 'smoothstep',
    animated: false,
    style: { stroke: '#718096' },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#718096',
    },
    data: {
      id: Date.now(), // Temporary ID until saved to database
      label: undefined
    },
    source: connection.source as string,
    target: connection.target as string,
  };
  setEdges((eds) => addEdge(newEdge, eds) as CustomEdge[]);
}, []);


  // Handle adding a new node
  const handleAddNode = useCallback(() => {
    if (selectedNode) {
      addNewNode(selectedNode.id);
    }
  }, [selectedNode, addNewNode]);

  // Toggle connection mode
  // Toggle connection mode
  const toggleConnectionMode = useCallback(() => {
    setConnectionMode(prev => prev === 'default' ? 'strict' : 'default');
  }, []);

  // Delete selected node
  const deleteSelectedNode = useCallback(() => {
    if (selectedNode) {
      setNodes(nodes => nodes.filter(n => n.id !== selectedNode.id));
      setEdges(edges => edges.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
      setSelectedNode(null);

      // Also delete node from database if needed
    }
  }, [selectedNode]);

  // Reset function to clear all highlighting and return to normal view
  const resetView = useCallback(() => {
    // Reset all node styles
    setNodes(nodes.map(n => ({
      ...n,
      style: {
        ...n.style,
        opacity: 1,
        boxShadow: undefined
      }
    })));

    // Reset all edge styles
    setEdges(edges.map(e => ({
      ...e,
      animated: false,
      style: {
        ...e.style,
        opacity: 1,
        stroke: '#718096'
      }
    })));

    // Fit view to show all nodes
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ padding: 0.2, duration: 800 });
    }
  }, [nodes, edges, reactFlowInstance]);

  return (
    <div className="flex-1 overflow-hidden relative" ref={reactFlowWrapper}>
      <Panel position="top-left" className="w-96 p-2">
        <SearchBar
          nodes={nodes}
          edges={edges}
          setNodes={setNodes}
          setEdges={setEdges}
          reactFlowInstance={reactFlowInstance}
        />
      </Panel>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        onInit={setReactFlowInstance}
        className="bg-background"
        connectionMode={connectionMode}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { stroke: '#718096' },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: '#718096',
          }
        }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={true}
        zoomOnScroll={true}
        panOnScroll={true}
        fitView
      >
        <Background color="#e2e8f0" gap={16} />
        <Controls />

        {/* User instruction hint */}
        <Panel position="top-center" className="bg-white shadow-md rounded-md p-2 mt-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-sm text-gray-600 flex items-center cursor-help">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 16v-4"></path>
                    <path d="M12 8h.01"></path>
                  </svg>
                  Double-click any node to highlight connections
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="w-64 text-xs">
                  Double-click any node to focus on it and see all connected nodes and edges.
                  This will dim other nodes and highlight the relevant connections.
                  Use the "Reset View" button to clear highlighting.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Panel>
      </ReactFlow>

      {/* Bottom toolbar */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-white border-t border-gray-200 flex items-center justify-center">
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center"
            onClick={handleAddNode}
            disabled={!selectedNode}
          >
            <PlusCircle className="h-4 w-4 mr-1" /> Add Node
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center"
            onClick={toggleConnectionMode}
          >
            <Link2 className="h-4 w-4 mr-1" />
            {connectionMode === 'loose' ? "Exit Connect Mode" : "Connect Nodes"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center"
            onClick={deleteSelectedNode}
            disabled={!selectedNode}
          >
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center"
            onClick={resetView}
          >
            <RefreshCw className="h-4 w-4 mr-1" /> Reset View
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center"
            onClick={() => {
              if (startNode && reactFlowInstance) {
                // Center view on start node
                reactFlowInstance.setCenter(
                  startNode.position.x + 100,
                  startNode.position.y + 100,
                  { duration: 800 }
                );
                // Highlight start node
                setNodes(nodes.map(n => ({
                  ...n,
                  style: {
                    ...n.style,
                    opacity: n.id === startNode.id ? 1 : 0.25,
                    boxShadow: n.id === startNode.id ? '0 0 8px 2px #2B6CB0' : undefined
                  }
                })));
                // Update edges
                setEdges(edges.map(e => ({
                  ...e,
                  style: {
                    ...e.style,
                    opacity: (e.source === startNode.id || e.target === startNode.id) ? 1 : 0.25,
                    stroke: (e.source === startNode.id || e.target === startNode.id) ? '#2B6CB0' : e.style?.stroke || '#718096'
                  },
                  animated: (e.source === startNode.id || e.target === startNode.id)
                })));
              }
            }}
          >
            <Home className="h-4 w-4 mr-1" /> Home
          </Button>
        </div>
      </div>

      {/* Node detail dialog */}
      <NodeDetail
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        node={editNode}
        pathwayId={pathwayId}
      />
    </div>
  );
};

export default FlowCanvas;
