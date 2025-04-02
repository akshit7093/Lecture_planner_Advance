import { memo, useState } from 'react';
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
  ExternalLink 
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
      
      <Card className="shadow-sm border-gray-200 transition-shadow max-w-md hover:shadow-md">
        <CardHeader className="py-3 px-4">
          <div className="flex justify-between items-start mb-1">
            <CardTitle className={isExpanded ? "text-lg" : "text-base"}>
              {data.label}
            </CardTitle>
            <div className="flex space-x-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0" 
                onClick={() => onNodeEdit && onNodeEdit(data.id)}
              >
                <Edit className="h-4 w-4 text-gray-500" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onNodeEnhance && onNodeEnhance(data.id, 'questions')}>
                    Add Questions
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onNodeEnhance && onNodeEnhance(data.id, 'resources')}>
                    Add Resources
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onNodeEnhance && onNodeEnhance(data.id, 'equations')}>
                    Add Equations
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onNodeEnhance && onNodeEnhance(data.id, 'codeExamples')}>
                    Add Code Examples
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
                  <div className="text-xs uppercase font-medium text-gray-500 mb-1">Previous Year Questions</div>
                  <ul className="text-xs text-gray-700 space-y-1 list-disc list-inside">
                    {data.questions.map((question, index) => (
                      <li key={index}>{question}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Resources section */}
              {data.resources && data.resources.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs uppercase font-medium text-gray-500 mb-1">Resources</div>
                  <div className="space-y-1">
                    {data.resources.map((resource, index) => (
                      <a 
                        key={index} 
                        href={resource.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-primary flex items-center hover:underline"
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
                  <div className="text-xs uppercase font-medium text-gray-500 mb-1">Mathematical Equations</div>
                  <div className="bg-gray-50 p-2 rounded">
                    {data.equations.map((equation, index) => (
                      <div key={index} className="mathematical-equation text-sm font-mono">
                        {renderEquation(equation)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Code examples section */}
              {data.codeExamples && data.codeExamples.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs uppercase font-medium text-gray-500 mb-1">Code Examples</div>
                  <pre className="bg-gray-50 p-2 rounded text-xs font-mono overflow-x-auto">
                    {data.codeExamples.map((code, index) => (
                      <code key={index} className="block mb-1">
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
          
          <div className="border-t border-gray-100 pt-2 mt-2">
            <Button 
              variant="link" 
              size="sm" 
              className="px-0 text-xs text-primary font-medium h-6"
              onClick={() => onNodeEnhance && onNodeEnhance(data.id, 'questions')}
            >
              <PlusCircle className="h-3 w-3 mr-1" /> Enhance node
            </Button>
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
