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
  ExternalLink,
  Clock,
  BookOpen,
  Code,
  FileText
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
import './Node.css';

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
  
  // Debug log to see node data
  console.log("Node rendering with data:", data);
  
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
      
      <Card className="node-card">
        <CardHeader className="node-header">
          <div className="flex justify-between items-start">
            <h3 className="node-title">{data.label}</h3>
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
        
        <CardContent className="node-description">
          {data.description && (
            <p>{data.description}</p>
          )}
          
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            {/* Always show key topics if available */}
            {data.topics && data.topics.length > 0 && (
              <div className="node-section">
                <div className="node-section-title">
                  <BookOpen className="inline-block w-4 h-4 mr-1" />
                  Key Topics
                </div>
                <div className="flex flex-wrap gap-1">
                  {data.topics.map((topic, index) => (
                    <span key={index} className="topic-badge">{topic}</span>
                  ))}
                </div>
              </div>
            )}
            
            <CollapsibleContent>
              {/* Questions section */}
              {data.questions && data.questions.length > 0 && (
                <div className="node-section">
                  <div className="node-section-title">
                    <FileText className="inline-block w-4 h-4 mr-1" />
                    Previous Year Questions
                  </div>
                  <div className="space-y-2">
                    {data.questions.map((question, index) => (
                      <div key={index} className="question-item">{question}</div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Resources section */}
              {data.resources && data.resources.length > 0 && (
                <div className="node-section">
                  <div className="node-section-title">
                    <ExternalLink className="inline-block w-4 h-4 mr-1" />
                    Learning Resources
                  </div>
                  <div className="space-y-2">
                    {data.resources.map((resource, index) => (
                      <a 
                        key={index} 
                        href={resource.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="resource-link"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        <span>{resource.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Equations section */}
              {data.equations && data.equations.length > 0 && (
                <div className="node-section">
                  <div className="node-section-title">
                    <Clock className="inline-block w-4 h-4 mr-1" />
                    Mathematical Equations
                  </div>
                  <div className="equation-container">
                    {data.equations.map((equation, index) => (
                      <div key={index} className="mathematical-equation">
                        {renderEquation(equation)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Code examples section */}
              {data.codeExamples && data.codeExamples.length > 0 && (
                <div className="node-section">
                  <div className="node-section-title">
                    <Code className="inline-block w-4 h-4 mr-1" />
                    Code Examples
                  </div>
                  <div className="code-container">
                    {data.codeExamples.map((code, index) => (
                      <code key={index} className="block mb-2">
                        {code}
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </CollapsibleContent>
            
            {/* Toggle button to expand/collapse */}
            <CollapsibleTrigger asChild>
              <Button className="expand-button">
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
