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
  useReactFlow,
} from 'reactflow';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PlusCircle, Link2, Trash2, RefreshCw, Home, LayoutGrid } from 'lucide-react';
import NodeComponent from './Node';
import { Node as DbNode, Edge as DbEdge } from '@shared/schema';
import { convertToReactFlowElements, layoutNodes } from '@/lib/api';
import NodeDetail from './NodeDetail';
import { useQueryClient } from '@tanstack/react-query';
import { useAddNode } from '@/lib/hooks';
import 'reactflow/dist/style.css';
import { CustomNode, CustomEdge } from '@/types';

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
  
  // State for connection mode
  // Define our own type to avoid ReactFlow's type issues
  type FlowConnectionMode = 'strict' | 'loose';
  const [connectionMode, setConnectionMode] = useState<FlowConnectionMode>('strict');
  
  // Keep track of ReactFlow instance
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  
  // Access query client for invalidation
  const queryClient = useQueryClient();
  
  // Custom hook for adding nodes
  const { addNewNode } = useAddNode();
  
  // Update nodes when db data changes
  useEffect(() => {
    console.log("FlowCanvas received nodes:", dbNodes.length, "edges:", dbEdges.length);
    
    // Process even if we only have nodes but no edges
    if (dbNodes.length > 0) {
      // For troubleshooting, log the database nodes
      console.log("Original DB nodes:", JSON.stringify(dbNodes));
      console.log("Original DB edges:", JSON.stringify(dbEdges));
      
      const elements = convertToReactFlowElements(dbNodes, dbEdges);
      console.log("Converted elements:", JSON.stringify(elements));
      
      const layoutedNodes = layoutNodes(elements.nodes, elements.edges);
      console.log("Layouted nodes:", JSON.stringify(layoutedNodes));
      
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
  const onNodeClick = useCallback((_: React.MouseEvent, node: CustomNode) => {
    setSelectedNode(node);
  }, []);
  
  // Handle double click to focus on connected nodes
  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: CustomNode) => {
    // Get all connected edges
    const connectedEdges = edges.filter(
      edge => edge.source === node.id || edge.target === node.id
    );
    
    // Get IDs of all connected nodes
    const connectedNodeIds = new Set<string>();
    connectedNodeIds.add(node.id); // Include the clicked node
    
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
        boxShadow: n.id === node.id ? '0 0 8px 2px #2B6CB0' : undefined
      },
    })));
    
    setEdges(edges.map(e => ({
      ...e,
      style: {
        ...e.style,
        opacity: (connectedNodeIds.has(e.source) && connectedNodeIds.has(e.target)) ? 1 : 0.25,
        stroke: (e.source === node.id || e.target === node.id) ? '#2B6CB0' : e.style?.stroke || '#718096'
      },
      animated: (e.source === node.id || e.target === node.id)
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
  }, [nodes, edges, reactFlowInstance]);
  
  // Handle node drag
  const onNodeDragStop = useCallback((_: React.MouseEvent, node: CustomNode) => {
    // Update node position in the database if needed
    console.log('Node position updated:', node.id, node.position);
  }, []);
  
  // Handle node/edge changes
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);
  
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds) as unknown as CustomEdge[]);
  }, []);
  
  // Handle new connections
  const onConnect = useCallback((connection: Connection) => {
    const newEdge = {
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
      } as any,
    };
    setEdges((eds) => addEdge(newEdge, eds) as unknown as CustomEdge[]);
  }, []);
  
  // Handle adding a new node
  const handleAddNode = useCallback(() => {
    if (selectedNode) {
      addNewNode(selectedNode.id);
    }
  }, [selectedNode, addNewNode]);
  
  // Toggle connection mode
  const toggleConnectionMode = useCallback(() => {
    setConnectionMode(prev => prev === 'strict' ? 'loose' : 'strict');
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
  
  // Go to the root node (Home button functionality)
  const goToRootNode = useCallback(() => {
    // Find the root node (usually the first one with no parent or with id containing 'root')
    // First check if we have nodes to avoid errors
    if (nodes.length === 0) {
      return; // No nodes to navigate to
    }
    
    const rootNode = nodes.find(n => 
      (n.id && typeof n.id === 'string' && n.id.includes('root')) || 
      !edges.some(e => e.target === n.id)
    );
    
    if (rootNode && reactFlowInstance) {
      // Reset styles first
      resetView();
      
      // Then focus on the root node
      setTimeout(() => {
        reactFlowInstance.fitView({
          padding: 0.5,
          duration: 800,
          nodes: [rootNode]
        });
        
        // Highlight the root node
        setNodes(nodes.map(n => ({
          ...n,
          style: {
            ...n.style,
            boxShadow: n.id === rootNode.id ? '0 0 12px 4px #2B6CB0' : undefined
          }
        })));
      }, 100);
    }
  }, [nodes, edges, reactFlowInstance, resetView]);
  
  // Reset the layout to original positions
  const resetLayout = useCallback(() => {
    if (dbNodes.length > 0) {
      // Convert and re-layout
      const elements = convertToReactFlowElements(dbNodes, dbEdges);
      const layoutedNodes = layoutNodes(elements.nodes, elements.edges);
      
      // Apply the new layout
      setNodes(layoutedNodes);
      setEdges(elements.edges);
      
      // Fit view
      if (reactFlowInstance) {
        setTimeout(() => {
          reactFlowInstance.fitView({ padding: 0.2, duration: 800 });
        }, 50);
      }
    }
  }, [dbNodes, dbEdges, reactFlowInstance]);
  
  return (
    <div className="flex-1 overflow-hidden relative" ref={reactFlowWrapper}>
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
        connectionMode={connectionMode as any}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { stroke: '#718096' },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: '#718096',
          } as any,
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
            variant="default" 
            size="sm" 
            className="flex items-center bg-blue-600 text-white hover:bg-blue-700" 
            onClick={goToRootNode}
          >
            <Home className="h-4 w-4 mr-1" /> Home
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center" 
            onClick={resetLayout}
          >
            <LayoutGrid className="h-4 w-4 mr-1" /> Reset Layout
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center" 
            onClick={resetView}
          >
            <RefreshCw className="h-4 w-4 mr-1" /> Reset View
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
