import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from "@/hooks/use-toast";
import { ReactFlowInstance, useReactFlow, Node, Edge } from 'reactflow';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPathways, fetchPathway, fetchNodesAndEdges, generatePathway, deletePathway, enhanceNode } from './api';
import { PathwayFormData, NodeEnhancementData } from '@/types';

// Hook for sidebar collapse state
export const useSidebarCollapse = () => {
  const [collapsed, setCollapsed] = useState(false);
  
  const toggleSidebar = useCallback(() => {
    setCollapsed(prev => !prev);
  }, []);
  
  return { collapsed, toggleSidebar };
};

// Hook for managing pathways
export const usePathways = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: pathways = [], isLoading, error } = useQuery({
    queryKey: ['/api/pathways'],
    queryFn: fetchPathways,
  });
  
  const generateMutation = useMutation({
    mutationFn: (data: PathwayFormData) => generatePathway(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pathways'] });
      toast({
        title: "Success",
        description: "Learning pathway generated successfully",
      });
    },
    onError: (error: any) => {
      // Check for specific OpenRouter API errors
      const errorMessage = error.message || "";
      const errorDetails = error.details || {};
      
      let description = "Failed to generate pathway";
      
      if (errorMessage.includes("OpenRouter API") || errorDetails?.statusCode === 500) {
        description = "The AI service is currently experiencing high demand. Please try again in a few minutes.";
      } else if (errorMessage.includes("timeout")) {
        description = "The request timed out. The pathway may be too complex - try a simpler topic or retry later.";
      } else if (errorMessage.includes("Unexpected API response")) {
        description = "Received an unexpected response from the AI service. Please try again.";
      } else {
        description = `${description}: ${errorMessage}`;
      }
      
      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    }
  });
  
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePathway(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pathways'] });
      toast({
        title: "Success",
        description: "Pathway deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete pathway: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  return {
    pathways,
    isLoading,
    error,
    generatePathway: generateMutation.mutate,
    isGenerating: generateMutation.isPending,
    deletePathway: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
};

// Hook for loading pathway data
export const usePathwayData = (pathwayId: number | null) => {
  const { toast } = useToast();
  
  const {
    data: pathway,
    isLoading: isLoadingPathway,
  } = useQuery({
    queryKey: ['/api/pathways', pathwayId],
    queryFn: () => pathwayId ? fetchPathway(pathwayId) : null,
    enabled: !!pathwayId,
  });
  
  const {
    data: nodesAndEdges,
    isLoading: isLoadingElements,
    error,
  } = useQuery({
    queryKey: ['/api/pathways', pathwayId, 'elements'],
    queryFn: () => pathwayId ? fetchNodesAndEdges(pathwayId) : null,
    enabled: !!pathwayId,
    retry: 3,
    retryDelay: 1000,
  });
  
  // Log error and query result for debugging
  useEffect(() => {
    if (error) {
      console.error("Error fetching nodes and edges:", error);
    }
    if (nodesAndEdges) {
      console.log("Fetched nodes and edges:", nodesAndEdges);
    }
  }, [error, nodesAndEdges]);
  
  // Node enhancement mutation
  const queryClient = useQueryClient();
  
  const enhanceMutation = useMutation({
    mutationFn: (data: NodeEnhancementData) => enhanceNode(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pathways', pathwayId, 'elements'] });
      toast({
        title: "Success",
        description: "Node enhanced successfully",
      });
    },
    onError: (error: any) => {
      // Check for specific API errors
      const errorMessage = error.message || "";
      const errorDetails = error.details || {};
      
      let description = "Failed to enhance node";
      
      if (errorMessage.includes("OpenRouter API") || errorDetails?.statusCode === 500) {
        description = "The AI service is currently experiencing high demand. Please try again in a few minutes.";
      } else if (errorMessage.includes("timeout")) {
        description = "The request timed out. Please try again later.";
      } else if (errorMessage.includes("Unexpected API response")) {
        description = "Received an unexpected response from the AI service. Please try again.";
      } else {
        description = `${description}: ${errorMessage}`;
      }
      
      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    }
  });
  
  return {
    pathway,
    nodes: nodesAndEdges?.nodes || [],
    edges: nodesAndEdges?.edges || [],
    isLoading: isLoadingPathway || isLoadingElements,
    enhanceNode: enhanceMutation.mutate,
    isEnhancing: enhanceMutation.isPending,
  };
};

// Custom hook for ReactFlow viewport controls
export const useFlowControls = (reactFlowInstance: ReactFlowInstance | null) => {
  const zoomIn = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomIn();
    }
  }, [reactFlowInstance]);

  const zoomOut = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomOut();
    }
  }, [reactFlowInstance]);

  const fitView = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ padding: 0.2 });
    }
  }, [reactFlowInstance]);

  return { zoomIn, zoomOut, fitView };
};

// Custom hook for handling click outside
export const useClickOutside = (callback: () => void) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as HTMLElement)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [callback]);

  return ref;
};

// Custom hook for adding new nodes
export const useAddNode = () => {
  const { getNodes, getEdges, setNodes, setEdges, addNodes } = useReactFlow();
  const { toast } = useToast();
  
  const addNewNode = useCallback((sourceNodeId: string) => {
    // Get all existing nodes to find the source node
    const nodes = getNodes();
    const sourceNode = nodes.find(node => node.id === sourceNodeId);
    
    if (!sourceNode) {
      toast({
        title: "Error",
        description: "Source node not found",
        variant: "destructive",
      });
      return;
    }
    
    // Create a new unique ID
    const newNodeId = `node_${Date.now()}`;
    
    // Calculate position (to the right of the source node)
    const position = {
      x: sourceNode.position.x + 250,
      y: sourceNode.position.y
    };
    
    // Create the new node
    const newNode = {
      id: newNodeId,
      type: 'customNode',
      position,
      data: {
        label: 'New Node',
        description: 'Add description here',
        topics: [],
        questions: [],
        resources: [],
        equations: [],
        codeExamples: [],
      }
    };
    
    // Add the new node
    addNodes(newNode);
    
    // Create a new edge from source to new node
    const newEdge = {
      id: `edge_${Date.now()}`,
      source: sourceNodeId,
      target: newNodeId,
      type: 'smoothstep',
      animated: false,
      style: {
        stroke: '#718096',
      },
      markerEnd: {
        type: 'arrowclosed',
        width: 20,
        height: 20,
        color: '#718096',
      },
    };
    
    // Add the new edge
    setEdges(edges => [...edges, newEdge]);
    
    toast({
      title: "Success",
      description: "New node added",
    });
    
    return newNodeId;
  }, [getNodes, setEdges, addNodes, toast]);
  
  return { addNewNode };
};
