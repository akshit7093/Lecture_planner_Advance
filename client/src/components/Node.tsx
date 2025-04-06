import { memo, useState, useMemo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  PlusCircle, 
  Edit, 
  MoreHorizontal,
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  MessageSquare,
  Lightbulb,
  FileCode,
  BookOpen,
  Calculator
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CustomNode } from '@/types';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface NodeComponentProps extends NodeProps {
  data: CustomNode['data'];
  isConnectable: boolean;
  onNodeEnhance?: (nodeId: number, type: 'questions' | 'resources' | 'equations' | 'codeExamples') => void;
  onNodeEdit?: (nodeId: number) => void;
}

const NodeComponent = ({ 
  data, 
  isConnectable,
  onNodeEnhance,
  onNodeEdit
}: NodeComponentProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Determine node color based on depth and characteristics
  const nodeColors = useMemo(() => {
    const nodeId = String(data.id); // Convert number to string
    const isRootNode = nodeId.includes('root') || nodeId.endsWith('-root');
    const isDetailNode = nodeId.includes('detail');
    const containsEquations = data.equations && data.equations.length > 0;
    const containsCode = data.codeExamples && data.codeExamples.length > 0;
    
    // Return different background and border colors based on node type
    if (isRootNode) {
      return {
        background: 'bg-gradient-to-br from-blue-50 to-blue-100',
        border: 'border-blue-300',
        shadow: 'shadow-blue-100'
      };
    } else if (isDetailNode) {
      return {
        background: 'bg-gradient-to-br from-purple-50 to-purple-100',
        border: 'border-purple-300',
        shadow: 'shadow-purple-100'
      };
    } else if (containsEquations) {
      return {
        background: 'bg-gradient-to-br from-amber-50 to-amber-100',
        border: 'border-amber-300',
        shadow: 'shadow-amber-100'
      };
    } else if (containsCode) {
      return {
        background: 'bg-gradient-to-br from-green-50 to-green-100',
        border: 'border-green-300',
        shadow: 'shadow-green-100'
      };
    } else {
      return {
        background: 'bg-gradient-to-br from-gray-50 to-white',
        border: 'border-gray-200',
        shadow: 'shadow-gray-100'
      };
    }
  }, [data.id, data.equations, data.codeExamples]);
  
  // Function to safely render math equations
  const renderEquation = (equation: string) => {
    try {
      // Try to render as block math first
      return <BlockMath math={equation} />;
    } catch (error) {
      // If it fails, try to render as inline math
      try {
        return <InlineMath math={equation} />;
      } catch (innerError) {
        // If both fail, return the raw equation
        return <code className="text-sm font-mono break-all">{equation}</code>;
      }
    }
  };
  
  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-gray-400"
      />
      
      <Card className={`shadow-md transition-shadow max-w-md hover:shadow-lg ${nodeColors.background} ${nodeColors.border} ${nodeColors.shadow}`}>
        <CardHeader className="py-3 px-4">
          <div className="flex justify-between items-start mb-1">
            <CardTitle className={isExpanded ? "text-lg" : "text-base"}>
              {data.label}
            </CardTitle>
            <div className="flex space-x-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0" 
                      onClick={() => onNodeEdit && onNodeEdit(data.id)}
                    >
                      <Edit className="h-4 w-4 text-gray-500" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Edit node</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onNodeEnhance && onNodeEnhance(data.id, 'questions')}>
                    <MessageSquare className="h-4 w-4 mr-2 text-indigo-500" /> Add Questions
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onNodeEnhance && onNodeEnhance(data.id, 'resources')}>
                    <BookOpen className="h-4 w-4 mr-2 text-blue-500" /> Add Resources
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onNodeEnhance && onNodeEnhance(data.id, 'equations')}>
                    <Calculator className="h-4 w-4 mr-2 text-amber-500" /> Add Equations
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onNodeEnhance && onNodeEnhance(data.id, 'codeExamples')}>
                    <FileCode className="h-4 w-4 mr-2 text-green-500" /> Add Code Examples
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="px-4 pb-3">
          {data.description && (
            <p className="text-sm text-gray-700 mb-3">{data.description}</p>
          )}
          
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            {/* Always show key topics if available */}
            {data.topics && data.topics.length > 0 && (
              <div className="mb-3">
                <div className="text-xs uppercase font-medium text-gray-500 mb-1">Key Topics</div>
                <div className="flex flex-wrap gap-1">
                  {data.topics.map((topic, index) => (
                    <Badge key={index} variant="secondary" className="px-2 py-0.5 bg-primary/10 text-primary text-xs">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <CollapsibleContent>
              {/* Questions section */}
              {data.questions && data.questions.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs uppercase font-medium flex items-center text-indigo-700 mb-1">
                    <MessageSquare className="h-3 w-3 mr-1" /> Previous Year Questions
                  </div>
                  <ul className="text-xs text-gray-700 space-y-1 list-disc list-inside bg-indigo-50 p-2 rounded border border-indigo-100">
                    {data.questions.map((question, index) => (
                      <li key={index} className="mb-1 last:mb-0">{question}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Resources section */}
              {data.resources && data.resources.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs uppercase font-medium flex items-center text-blue-700 mb-1">
                    <BookOpen className="h-3 w-3 mr-1" /> Resources
                  </div>
                  <div className="space-y-1 bg-blue-50 p-2 rounded border border-blue-100">
                    {data.resources.map((resource, index) => (
                      <a 
                        key={index} 
                        href={resource.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 flex items-center hover:underline"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" /> {resource.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Equations section */}
              {data.equations && data.equations.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs uppercase font-medium flex items-center text-amber-700 mb-1">
                    <Calculator className="h-3 w-3 mr-1" /> Mathematical Equations
                  </div>
                  <div className="bg-amber-50 p-2 rounded border border-amber-100">
                    {data.equations.map((equation, index) => (
                      <div key={index} className="mathematical-equation text-sm font-mono mb-1 last:mb-0">
                        {renderEquation(equation)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Code examples section */}
              {data.codeExamples && data.codeExamples.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs uppercase font-medium flex items-center text-green-700 mb-1">
                    <FileCode className="h-3 w-3 mr-1" /> Code Examples
                  </div>
                  <pre className="bg-green-50 p-2 rounded border border-green-100 text-xs font-mono overflow-x-auto">
                    {data.codeExamples.map((code, index) => (
                      <code key={index} className="block mb-1 last:mb-0">
                        {code}
                      </code>
                    ))}
                  </pre>
                </div>
              )}
            </CollapsibleContent>
            
            {/* Toggle button to expand/collapse */}
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full flex items-center justify-center mt-2 py-1 text-xs"
              >
                {isExpanded ? (
                  <>Show Less <ChevronUp className="h-3 w-3 ml-1" /></>
                ) : (
                  <>Show More <ChevronDown className="h-3 w-3 ml-1" /></>
                )}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
          
          <div className="border-t border-gray-100 pt-2 mt-2 flex items-center justify-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="rounded-full px-3 text-xs font-medium bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0 hover:from-blue-600 hover:to-indigo-600 shadow-md"
                    onClick={() => onNodeEnhance && onNodeEnhance(data.id, 'questions')}
                  >
                    <Lightbulb className="h-3 w-3 mr-1" /> Enhance with AI
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs w-48">Add AI-generated questions, resources, equations, or code examples to this node</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>
      
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-gray-400"
      />
    </div>
  );
};

export default memo(NodeComponent);
