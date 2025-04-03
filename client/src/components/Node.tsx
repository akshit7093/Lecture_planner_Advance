import { memo, useState, useRef, useEffect } from 'react';
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
  Info,
  X
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CustomNode } from '@/types';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

// Topic definitions for tooltips
const topicDefinitions: Record<string, string> = {
  // Common cryptography terms
  "Public Key Cryptography": "A cryptographic system that uses pairs of keys: public keys (which may be shared) and private keys (which are kept secret). The generation of such key pairs depends on cryptographic algorithms.",
  "Symmetric Key Ciphers": "Encryption algorithms that use the same cryptographic keys for both encryption and decryption of data. The keys may be identical or there may be a simple transformation between the two keys.",
  "Asymmetric Key Ciphers": "Also known as public-key cryptography, where different keys are used for encryption and decryption. A user has a pair of cryptographic keys: a public key and a private key.",
  "Block Ciphers": "Encryption method that applies a deterministic algorithm with a symmetric key to encrypt a block of text at once as a unit.",
  "Stream Ciphers": "Encryption method where plaintext digits are combined with a pseudorandom cipher digit stream (keystream).",
  "Cryptographic Hash Functions": "Mathematical algorithms that map data of arbitrary size to a bit array of a fixed size. Used for data integrity verification and password storage.",
  "Digital Signatures": "Mathematical scheme for verifying the authenticity of digital messages or documents.",
  "Secure Hash Algorithm": "Family of cryptographic hash functions published by NIST, including SHA-1, SHA-2, and SHA-3.",
  "Diffie-Hellman": "A method of securely exchanging cryptographic keys over a public channel without requiring a pre-shared secret.",
  "RSA": "A public-key cryptosystem widely used for secure data transmission. The acronym stands for Rivest–Shamir–Adleman, the inventors.",
  "AES": "Advanced Encryption Standard, a specification for the encryption of electronic data established by NIST in 2001.",
  "DES": "Data Encryption Standard, a symmetric-key algorithm for the encryption of digital data.",
  "3DES": "Triple DES, a symmetric-key block cipher which applies the DES cipher algorithm three times to each data block.",
  "Man-in-the-Middle Attack": "An attack where the attacker secretly relays and possibly alters the communications between two parties who believe they are communicating directly with each other.",
  "Birthday Attack": "A type of cryptographic attack that exploits the mathematics behind the birthday problem in probability theory.",
  "Brute Force Attack": "A cryptographic hack that relies on guessing possible combinations of a targeted password until the correct password is discovered.",
  
  // Database security terms
  "Database Security": "Practices, technologies, and tools used to protect data in databases from breaches, leaks, and other malicious activities.",
  "SQL Injection": "A code injection technique used to attack data-driven applications by inserting malicious SQL statements into entry fields.",
  "Access Control": "Selective restriction of access to data. Comprises authentication, authorization, and audit.",
  "Data Encryption": "Process of converting data into a code to prevent unauthorized access.",
  "Integrity Constraints": "Rules enforced by the database management system to maintain the integrity of the data.",
  
  // Network security terms
  "Firewall": "A network security system that monitors and controls incoming and outgoing network traffic.",
  "VPN": "Virtual Private Network, extends a private network across a public network, enabling users to send and receive data as if their devices were directly connected to the private network.",
  "IDS/IPS": "Intrusion Detection System/Intrusion Prevention System, monitors network traffic for suspicious activity and takes preventative actions.",
  "Proxy Server": "A server that acts as an intermediary for requests from clients seeking resources from other servers.",
  "TLS/SSL": "Transport Layer Security/Secure Sockets Layer, cryptographic protocols designed to provide communications security over a computer network.",
  "DDoS Attack": "Distributed Denial of Service attack, where multiple systems flood the bandwidth or resources of a targeted system.",
  "Zero Trust": "Security concept based on the belief that organizations should not automatically trust anything inside or outside its perimeters."
};

// Additional math/equation-related definitions
const equationDefinitions: Record<string, string> = {
  "Fermat's Little Theorem": "If p is a prime number, then for any integer a, the number a^p - a is an integer multiple of p.",
  "Euler's Theorem": "If a and n are coprime positive integers, then a^φ(n) ≡ 1 (mod n), where φ(n) is Euler's totient function.",
  "Modular Exponentiation": "The computation of b^e mod m, which is crucial for RSA algorithm.",
  "Time Complexity": "A measure of the amount of time an algorithm takes to run as a function of the length of the input.",
  "Birthday Paradox": "In probability theory, states that in a random group of 23 people, there is about a 50% chance that two people have the same birthday."
};

interface NodeComponentProps extends NodeProps {
  data: CustomNode['data'];
  isConnectable: boolean;
  onNodeEnhance?: (nodeId: number, type: 'questions' | 'resources' | 'equations' | 'codeExamples') => void;
  onNodeEdit?: (nodeId: number) => void;
}

interface TopicDefinition {
  topic: string;
  description: string;
}

const NodeComponent = ({ 
  data, 
  isConnectable,
  onNodeEnhance,
  onNodeEdit
}: NodeComponentProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<TopicDefinition | null>(null);
  
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
  
  // Get a definition for a topic, or generate a placeholder
  const getTopicDefinition = (topic: string): string => {
    // Check if we have a predefined definition
    if (topicDefinitions[topic]) {
      return topicDefinitions[topic];
    }
    
    // Check if there's an equation definition
    if (equationDefinitions[topic]) {
      return equationDefinitions[topic];
    }
    
    // For topics with ":" in them, try to match the prefix
    const prefix = topic.split(':')[0].trim();
    if (topicDefinitions[prefix]) {
      return topicDefinitions[prefix];
    }
    
    // Generate a reasonable definition based on the topic name
    return `${topic} is a key concept in ${data.label}. Click the "Enhance Node" button to add more details about this topic.`;
  };
  
  // Handle click on a topic badge
  const handleTopicClick = (topic: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent node selection
    setSelectedTopic({
      topic,
      description: getTopicDefinition(topic)
    });
  };
  
  // Close topic info panel
  const closeTopicInfo = () => {
    setSelectedTopic(null);
  };
  
  // Tooltip timeout reference
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Clean up tooltip timeout on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);
  
  // Handle topic hover
  const handleTopicHover = (topic: string) => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    setActiveTooltip(topic);
  };
  
  // Handle topic hover end
  const handleTopicHoverEnd = () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    
    tooltipTimeoutRef.current = setTimeout(() => {
      setActiveTooltip(null);
    }, 200);
  };
  
  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-gray-400"
      />
      
      <Card className="shadow-md border-gray-200 transition-shadow hover:shadow-lg max-w-md">
        <CardHeader className="py-3 px-4 bg-gray-50 border-b border-gray-100">
          <div className="flex justify-between items-start mb-1">
            <CardTitle className={isExpanded ? "text-lg font-semibold text-gray-800" : "text-base font-semibold text-gray-800"}>
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
        
        <CardContent className="px-4 py-3">
          {data.description && (
            <p className="text-sm text-gray-700 mb-3 leading-relaxed">{data.description}</p>
          )}
          
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            {/* Always show key topics if available */}
            {data.topics && data.topics.length > 0 && (
              <div className="mb-4">
                <div className="text-xs uppercase font-medium text-gray-500 mb-2">Key Topics</div>
                <div className="flex flex-wrap gap-1.5">
                  {data.topics.map((topic, index) => (
                    <TooltipProvider key={index}>
                      <Tooltip 
                        open={activeTooltip === topic} 
                        onOpenChange={(open) => {
                          if (open) {
                            handleTopicHover(topic);
                          } else {
                            handleTopicHoverEnd();
                          }
                        }}
                      >
                        <TooltipTrigger asChild>
                          <Badge 
                            variant="secondary" 
                            className="px-2 py-1 bg-primary/10 text-primary text-xs cursor-pointer hover:bg-primary/20 transition-colors"
                            onClick={(e) => handleTopicClick(topic, e)}
                            onMouseEnter={() => handleTopicHover(topic)}
                            onMouseLeave={handleTopicHoverEnd}
                          >
                            {topic}
                            <Info className="ml-1 h-3 w-3 inline opacity-60" />
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="center" className="max-w-xs bg-gray-800 text-white p-2 text-xs">
                          <p>Click for details about {topic}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
                
                {/* Topic detail panel */}
                {selectedTopic && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-md border border-gray-200 relative">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="absolute top-1 right-1 h-6 w-6 p-0"
                      onClick={closeTopicInfo}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">{selectedTopic.topic}</h4>
                    <p className="text-xs text-gray-700">{selectedTopic.description}</p>
                  </div>
                )}
              </div>
            )}
            
            <CollapsibleContent>
              {/* Questions section */}
              {data.questions && data.questions.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs uppercase font-medium text-gray-500 mb-2">Previous Year Questions</div>
                  <ul className="text-xs text-gray-700 space-y-2 list-disc list-outside ml-4">
                    {data.questions.map((question, index) => (
                      <li key={index} className="leading-relaxed">{question}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Resources section */}
              {data.resources && data.resources.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs uppercase font-medium text-gray-500 mb-2">Resources</div>
                  <div className="space-y-2">
                    {data.resources.map((resource, index) => (
                      <a 
                        key={index} 
                        href={resource.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-primary flex items-start hover:underline"
                      >
                        <ExternalLink className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" /> 
                        <span>{resource.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Equations section */}
              {data.equations && data.equations.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs uppercase font-medium text-gray-500 mb-2">Mathematical Equations</div>
                  <div className="bg-white p-3 rounded border border-gray-200">
                    {data.equations.map((equation, index) => (
                      <div key={index} className="mathematical-equation text-sm font-mono mb-2 last:mb-0">
                        {renderEquation(equation)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Code examples section */}
              {data.codeExamples && data.codeExamples.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs uppercase font-medium text-gray-500 mb-2">Code Examples</div>
                  <pre className="bg-white p-3 rounded border border-gray-200 text-xs font-mono overflow-x-auto">
                    {data.codeExamples.map((code, index) => (
                      <code key={index} className="block mb-2 last:mb-0 text-gray-800">
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
                variant="outline" 
                size="sm" 
                className="w-full flex items-center justify-center mt-2 py-1.5 text-xs"
              >
                {isExpanded ? (
                  <>Show Less <ChevronUp className="h-3 w-3 ml-1" /></>
                ) : (
                  <>Show More <ChevronDown className="h-3 w-3 ml-1" /></>
                )}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
          
          <div className="border-t border-gray-100 pt-2 mt-3">
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
