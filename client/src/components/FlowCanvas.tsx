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
import { PlusCircle, Link2, Trash2 } from 'lucide-react';
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
  const onNodeClick = useCallback((_: React.MouseEvent, node: CustomNode) => {
    setSelectedNode(node);
  }, []);
  
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
  
  return (
    <div className="flex-1 overflow-hidden relative" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
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
