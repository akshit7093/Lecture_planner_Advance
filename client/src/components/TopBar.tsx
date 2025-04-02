import { 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  Download, 
  Share2, 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  Settings 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useFlowControls } from "@/lib/hooks";
import { ReactFlowInstance } from "reactflow";

interface TopBarProps {
  title: string;
  timespan: string;
  reactFlowInstance: ReactFlowInstance | null;
  onSave?: () => void;
  onExport?: () => void;
}

const TopBar = ({ 
  title, 
  timespan, 
  reactFlowInstance,
  onSave,
  onExport
}: TopBarProps) => {
  const { zoomIn, zoomOut, fitView } = useFlowControls(reactFlowInstance);

  return (
    <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4">
      <div className="flex items-center">
        <div className="flex items-center mr-6">
          <h2 className="text-lg font-semibold">{title || "Untitled Pathway"}</h2>
          <Badge variant="outline" className="ml-2">{timespan || "Weekly"}</Badge>
        </div>
        
        <div className="flex space-x-1">
          <Button variant="ghost" size="icon" title="Undo">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Redo">
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="mx-1 h-6" />
          <Button 
            variant="ghost" 
            size="icon" 
            title="Save pathway"
            onClick={onSave}
          >
            <Save className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            title="Export as image"
            onClick={onExport}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Share">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="flex items-center space-x-1">
        <Button variant="ghost" size="icon" title="Zoom in" onClick={zoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" title="Zoom out" onClick={zoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" title="Fit view" onClick={fitView}>
          <Maximize className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <Button variant="ghost" size="icon" title="Settings">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default TopBar;
