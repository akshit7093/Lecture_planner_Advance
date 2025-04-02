import { useState, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import FlowCanvas from "@/components/FlowCanvas";
import { usePathwayData, useSidebarCollapse } from "@/lib/hooks";
import { ReactFlowProvider, ReactFlowInstance } from "reactflow";
import { toPng } from 'html-to-image';
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const [selectedPathwayId, setSelectedPathwayId] = useState<number | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const { collapsed, toggleSidebar } = useSidebarCollapse();
  const { toast } = useToast();
  
  const {
    pathway,
    nodes,
    edges,
    isLoading,
  } = usePathwayData(selectedPathwayId);
  
  const handlePathwaySelect = useCallback((pathwayId: number) => {
    setSelectedPathwayId(pathwayId);
  }, []);
  
  const handleReactFlowInstanceChange = useCallback((instance: ReactFlowInstance | null) => {
    setReactFlowInstance(instance);
  }, []);
  
  // Export the learning pathway as an image
  const handleExport = useCallback(() => {
    if (!reactFlowInstance) {
      toast({
        title: "Error",
        description: "Flow instance not available",
        variant: "destructive",
      });
      return;
    }
    
    const nodesBounds = reactFlowInstance.getNodes().reduce(
      (bounds, node) => {
        const { x, y } = node.position;
        const nodeWidth = 300; // Approximate width of a node
        const nodeHeight = 200; // Approximate height of a node
        
        bounds.minX = Math.min(bounds.minX, x);
        bounds.minY = Math.min(bounds.minY, y);
        bounds.maxX = Math.max(bounds.maxX, x + nodeWidth);
        bounds.maxY = Math.max(bounds.maxY, y + nodeHeight);
        
        return bounds;
      },
      { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
    );
    
    const width = nodesBounds.maxX - nodesBounds.minX + 100;
    const height = nodesBounds.maxY - nodesBounds.minY + 100;
    
    const flowElement = document.querySelector('.react-flow');
    if (!flowElement) {
      toast({
        title: "Error",
        description: "Flow element not found",
        variant: "destructive",
      });
      return;
    }
    
    reactFlowInstance.fitView({
      padding: 0.1,
      duration: 500,
    });
    
    setTimeout(() => {
      toPng(flowElement as HTMLElement, {
        backgroundColor: '#F7FAFC',
        width,
        height,
      })
        .then((dataUrl) => {
          const link = document.createElement('a');
          link.download = `${pathway?.title || 'learning-pathway'}.png`;
          link.href = dataUrl;
          link.click();
        })
        .catch((error) => {
          toast({
            title: "Error",
            description: `Failed to export image: ${error.message}`,
            variant: "destructive",
          });
        });
    }, 500);
  }, [reactFlowInstance, pathway, toast]);
  
  return (
    <div className="flex h-screen w-full bg-background">
      <Sidebar 
        collapsed={collapsed} 
        toggleSidebar={toggleSidebar} 
        onPathwaySelect={handlePathwaySelect}
        selectedPathwayId={selectedPathwayId}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar 
          title={pathway?.title || ""} 
          timespan={pathway?.timespan || ""} 
          reactFlowInstance={reactFlowInstance}
          onExport={handleExport}
        />
        
        <ReactFlowProvider>
          <FlowCanvas 
            nodes={nodes} 
            edges={edges} 
            pathwayId={selectedPathwayId}
            onReactFlowInstanceChange={handleReactFlowInstanceChange}
          />
        </ReactFlowProvider>
      </div>
    </div>
  );
};

export default Dashboard;
