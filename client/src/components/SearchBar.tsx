import { useState, useCallback } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CustomNode, CustomEdge } from '@/types';
import { ReactFlowInstance } from 'reactflow';

interface SearchBarProps {
  nodes: CustomNode[];
  edges: CustomEdge[];
  setNodes: (nodes: CustomNode[]) => void;
  setEdges: (edges: CustomEdge[]) => void;
  reactFlowInstance: ReactFlowInstance | null;
}

const SearchBar = ({ nodes, edges, setNodes, setEdges, reactFlowInstance }: SearchBarProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      // Reset all nodes and edges to their default state
      setNodes(nodes.map(node => ({
        ...node,
        style: {
          ...node.style,
          opacity: 1,
          boxShadow: undefined
        }
      })));
      setEdges(edges.map(edge => ({
        ...edge,
        style: {
          ...edge.style,
          opacity: 1,
          stroke: edge.style?.stroke || '#718096'
        },
        animated: false
      })));
      return;
    }

    // Find nodes that match the search query
    const matchingNodes = nodes.filter(node => {
      const nodeData = node.data;
      return (
        nodeData.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        nodeData.topics?.some(topic => 
          topic.toLowerCase().includes(searchQuery.toLowerCase())
        ) ||
        nodeData.questions?.some(question =>
          question.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    });

    const matchingNodeIds = new Set(matchingNodes.map(node => node.id));

    // Highlight matching nodes and dim others
    setNodes(nodes.map(node => ({
      ...node,
      style: {
        ...node.style,
        opacity: matchingNodeIds.has(node.id) ? 1 : 0.25,
        boxShadow: matchingNodeIds.has(node.id) ? '0 0 8px 2px #2B6CB0' : undefined
      }
    })));

    // Update edges visibility
    setEdges(edges.map(edge => ({
      ...edge,
      style: {
        ...edge.style,
        opacity: (matchingNodeIds.has(edge.source) && matchingNodeIds.has(edge.target)) ? 1 : 0.25
      }
    })));

    // Center view on matching nodes
    if (reactFlowInstance && matchingNodes.length > 0) {
      reactFlowInstance.fitView({
        padding: 0.3,
        duration: 800,
        nodes: matchingNodes
      });
    }
  }, [searchQuery, nodes, edges, setNodes, setEdges, reactFlowInstance]);

  const handleReset = useCallback(() => {
    setSearchQuery('');
    // Reset all nodes and edges to their default state
    setNodes(nodes.map(node => ({
      ...node,
      style: {
        ...node.style,
        opacity: 1,
        boxShadow: undefined
      }
    })));
    setEdges(edges.map(edge => ({
      ...edge,
      style: {
        ...edge.style,
        opacity: 1,
        stroke: edge.style?.stroke || '#718096'
      },
      animated: false
    })));

    // Reset view to fit all nodes
    if (reactFlowInstance) {
      reactFlowInstance.fitView({
        padding: 0.3,
        duration: 800
      });
    }
  }, [nodes, edges, setNodes, setEdges, reactFlowInstance]);

  return (
    <div className="flex gap-2 items-center">
      <div className="relative flex-1">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
        <Input
          type="text"
          placeholder="Search nodes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="pl-8 pr-4"
        />
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleSearch}
      >
        Search
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleReset}
      >
        Reset
      </Button>
    </div>
  );
};

export default SearchBar;