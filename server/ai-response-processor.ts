import { nanoid } from 'nanoid';

type NodeData = {
  id: string;
  parentId?: string | null;
  title: string;
  description?: string;
  topics?: string[];
  questions?: string[];
  resources?: Array<{title: string, url: string}>;
  equations?: string[];
  codeExamples?: string[];
  position: {x: number, y: number};
  pyqs?: string[];
  references?: Array<{title: string, url: string, type: 'book' | 'paper' | 'video' | 'article'}>;
  keyConcepts?: string[];
  expandableContent?: {
    detailedExplanation?: string;
    applications?: string[];
    commonMistakes?: string[];
    mnemonics?: string[];
  };
};

type EdgeData = {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
};

type PathwayResponse = {
  title: string;
  nodes: NodeData[];
  edges: EdgeData[];
};

/**
 * AI Response Processor
 * 
 * This module serves as an intermediate layer between the raw AI response and the application.
 * It analyzes the AI's response, extracts the JSON structure, and transforms it into the required format.
 * It also handles incomplete or malformed data by providing appropriate defaults.
 */

/**
 * Extracts JSON from AI response text, handling various formats
 * @param responseText The raw text response from the AI
 * @returns Parsed JSON object or null if parsing fails
 */
export function extractJsonFromText(responseText: string): any | null {
  if (!responseText || typeof responseText !== 'string') {
    console.error('Invalid response text provided to extractJsonFromText');
    return null;
  }

  console.log('Processing AI response text for JSON extraction');
  console.log('Response text length:', responseText.length);
  console.log('Response text preview:', responseText.substring(0, 200));
  
  // Remove markdown code block markers and language identifiers
  responseText = responseText.replace(/```(?:json)?(([\s\S]*?))```/g, '$1');

  // First try direct JSON parsing
  try {
    console.log('Attempting direct JSON parse...');
    const directParse = JSON.parse(responseText.trim());
    if (directParse && typeof directParse === 'object' && 
        (directParse.title || directParse.nodes || directParse.edges || directParse.outline)) {
      console.log('Direct JSON parsing succeeded');
      return directParse;
    }
  } catch (error: any) {
    console.log('Direct JSON parsing failed:', error.message);
  }
  
  // Try to extract any JSON-like structure from the text
  try {
    // Extract the largest JSON-like object from the text
    const jsonPattern = /\{[\s\S]*?\}/g;
    const matches = Array.from(responseText.matchAll(jsonPattern));
    
    // Sort matches by length (longest first) to find the most complete JSON object
    const sortedMatches = matches.sort((a, b) => b[0].length - a[0].length);
    
    for (const match of sortedMatches) {
      try {
        const potentialJson = match[0];
        console.log(`Extracted potential JSON object from index ${match.index} to ${match.index + potentialJson.length}`);
        
        // Basic cleanup of the extracted text
        let cleanedText = potentialJson
          // Remove comments
          .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
          .replace(/\/\/.*$/gm, '')          // Remove single-line comments
          .replace(/#.*$/gm, '')             // Remove # style comments
          
          // Fix common JSON syntax issues
          .replace(/,\s*([\]\}])/g, '$1')    // Remove trailing commas
          .replace(/([{[,:])\s*([a-zA-Z0-9_]+)\s*:/g, '$1"$2":') // Quote unquoted property names
          .replace(/:\s*'([^']*)'\s*/g, ':"$1"') // Replace single quotes with double quotes
          .replace(/\s+/g, ' ')              // Normalize whitespace
          .trim();
        
        try {
          const parsed = JSON.parse(cleanedText);
          
          // Validate that it has the expected structure
          if (parsed && typeof parsed === 'object' && 
              (parsed.title || parsed.nodes || parsed.edges || parsed.outline)) {
            console.log('Successfully parsed JSON object after basic cleaning');
            return parsed;
          }
        } catch (error: any) {
          console.log(`Basic cleaning failed: ${error.message}, trying advanced cleaning...`);
          
          // More aggressive cleaning for problematic JSON
          cleanedText = potentialJson
            // Remove all comments and problematic characters
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\/\/.*$/gm, '')
            .replace(/#.*$/gm, '')
            .replace(/\n/g, ' ')
            .replace(/\t/g, ' ')
            .replace(/\r/g, '')
            
            // Fix JSON syntax
            .replace(/,\s*([\]\}])/g, '$1')
            .replace(/([{[,:])\s*([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
            .replace(/:\s*'([^']*)'\s*/g, ':"$1"')
            .replace(/"\s*,\s*"/g, '","')
            .replace(/\s+/g, ' ')
            .trim();
          
          try {
            const aggressiveParsed = JSON.parse(cleanedText);
            
            if (aggressiveParsed && typeof aggressiveParsed === 'object' && 
                (aggressiveParsed.title || aggressiveParsed.nodes || aggressiveParsed.edges || aggressiveParsed.outline)) {
              console.log('Successfully parsed JSON with aggressive cleaning');
              return aggressiveParsed;
            }
          } catch (aggressiveError: any) {
            // Try to fix incomplete JSON by adding missing closing brackets
            try {
              let completionAttempt = cleanedText;
              const openBraces = (completionAttempt.match(/\{/g) || []).length;
              const closeBraces = (completionAttempt.match(/\}/g) || []).length;
              const openBrackets = (completionAttempt.match(/\[/g) || []).length;
              const closeBrackets = (completionAttempt.match(/\]/g) || []).length;
              
              // Add missing closing brackets
              for (let i = 0; i < openBrackets - closeBrackets; i++) {
                completionAttempt += ']';
              }
              
              // Add missing closing braces
              for (let i = 0; i < openBraces - closeBraces; i++) {
                completionAttempt += '}';
              }
              
              console.log('Attempting JSON completion with added closing brackets');
              const completedParse = JSON.parse(completionAttempt);
              
              if (completedParse && typeof completedParse === 'object' && 
                  (completedParse.title || completedParse.nodes || completedParse.edges || completedParse.outline)) {
                console.log('Successfully parsed completed JSON structure');
                return completedParse;
              }
            } catch (completionError: any) {
              console.log(`JSON completion attempt failed: ${completionError.message}`);
            }
          }
        }
      } catch (error: any) {
        console.log(`Error processing match: ${error.message}`);
        continue; // Try next match
      }
    }
  } catch (error: any) {
    console.log(`Error in JSON extraction process: ${error.message}`);
  }

  // If all extraction attempts fail, create a minimal valid structure
  console.log('All JSON extraction attempts failed, creating minimal valid structure');
  return {
    title: "Learning Pathway",
    nodes: [
      {
        id: `node-${nanoid(6)}`,
        title: "Main Topic",
        description: "This is a placeholder node created because the AI response couldn't be properly parsed.",
        position: { x: 0, y: 0 }
      }
    ],
    edges: []
  };
}

/**
 * Helper function to sanitize string values to prevent JSON escaping issues
 * @param value The string to sanitize
 * @returns Sanitized string
 */
function sanitizeString(value: string): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Sanitizes node data to ensure it meets the required format
 * @param node The node data to sanitize
 * @returns Sanitized node data
 */
export function sanitizeNodeData(node: any): NodeData {
  if (!node) {
    // Create a default node if none is provided
    return {
      id: `node-${nanoid(6)}`,
      title: "Default Node",
      description: "This is a default node created because no node data was provided.",
      position: { x: 0, y: 0 }
    };
  }

  // Ensure node has an ID
  const nodeId = node.id || `node-${nanoid(6)}`;
  
  // Ensure node has a position
  const position = node.position || { x: 0, y: 0 };
  if (typeof position.x !== 'number') position.x = 0;
  if (typeof position.y !== 'number') position.y = 0;
  
  // Sanitize arrays
  const topics = ensureArray(node.topics).map((topic: string) => sanitizeString(topic));
  const questions = ensureArray(node.questions).map((question: string) => sanitizeString(question));
  const resources = ensureArray(node.resources);
  const equations = ensureArray(node.equations).map((equation: string) => sanitizeString(equation));
  const codeExamples = ensureArray(node.codeExamples).map((code: string) => {
    if (typeof code !== 'string') return '';
    return code.replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\t/g, '    ')
      .replace(/\r/g, '');
  });
  const pyqs = ensureArray(node.pyqs).map((pyq: string) => sanitizeString(pyq));
  const keyConcepts = ensureArray(node.keyConcepts).map((concept: string) => sanitizeString(concept));
  const references = ensureArray(node.references);
  
  // Sanitize expandable content
  let expandableContent = node.expandableContent;
  if (expandableContent) {
    expandableContent = {
      detailedExplanation: expandableContent.detailedExplanation ? 
        sanitizeString(expandableContent.detailedExplanation) : '',
      applications: ensureArray(expandableContent.applications).map((app: string) => sanitizeString(app)),
      commonMistakes: ensureArray(expandableContent.commonMistakes).map((mistake: string) => sanitizeString(mistake)),
      mnemonics: ensureArray(expandableContent.mnemonics).map((mnemonic: string) => sanitizeString(mnemonic))
    };
  }
  
  // Return sanitized node
  return {
    id: nodeId,
    parentId: node.parentId || null,
    title: node.title ? sanitizeString(node.title) : "Untitled Node",
    description: node.description ? sanitizeString(node.description) : "",
    position,
    topics,
    questions,
    resources,
    equations,
    codeExamples,
    pyqs,
    keyConcepts,
    references,
    expandableContent
  };
}

/**
 * Ensures a value is an array
 * @param value The value to check
 * @returns An array
 */
function ensureArray(value: any): any[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

/**
 * Validates a pathway response to ensure it meets the required format
 * @param response The pathway response to validate
 * @returns Validated pathway response
 */
export function validatePathwayResponse(response: any): PathwayResponse {
  if (!response || typeof response !== 'object') {
    console.error('Invalid pathway response provided to validatePathwayResponse');
    return createDefaultPathwayResponse();
  }

  try {
    // Validate title
    const title = response.title || "Learning Pathway";
    
    // Validate nodes
    let nodes: NodeData[] = [];
    if (response.nodes && Array.isArray(response.nodes)) {
      nodes = response.nodes.map((node: any) => sanitizeNodeData(node));
    }
    
    // Ensure there's at least one node
    if (nodes.length === 0) {
      nodes.push({
        id: `node-${nanoid(6)}`,
        title: title,
        description: "This is a default node created because no nodes were provided.",
        position: { x: 0, y: 0 }
      });
    }
    
    // Validate edges
    let edges: EdgeData[] = [];
    if (response.edges && Array.isArray(response.edges)) {
      edges = response.edges.map((edge: any) => ({
        id: edge.id || `edge-${nanoid(6)}`,
        source: edge.source,
        target: edge.target,
        label: edge.label || undefined,
        animated: edge.animated !== undefined ? edge.animated : false
      }));
      
      // Filter out edges with invalid source or target
      const nodeIds = new Set(nodes.map(node => node.id));
      edges = edges.filter(edge => 
        nodeIds.has(edge.source) && nodeIds.has(edge.target)
      );
    }
    
    // Create default edges if none exist and there are multiple nodes
    if (edges.length === 0 && nodes.length > 1) {
      for (let i = 0; i < nodes.length - 1; i++) {
        edges.push({
          id: `edge-${nanoid(6)}`,
          source: nodes[i].id,
          target: nodes[i + 1].id,
          animated: false
        });
      }
    }
    
    return { title, nodes, edges };
  } catch (error: any) {
    console.error('Error validating pathway response:', error.message);
    return createDefaultPathwayResponse();
  }
}

/**
 * Creates a default pathway response
 * @returns Default pathway response
 */
function createDefaultPathwayResponse(): PathwayResponse {
  return {
    title: "Learning Pathway",
    nodes: [
      {
        id: `node-${nanoid(6)}`,
        title: "Main Topic",
        description: "This is a default node created because the pathway response couldn't be properly validated.",
        position: { x: 0, y: 0 }
      }
    ],
    edges: []
  };
}