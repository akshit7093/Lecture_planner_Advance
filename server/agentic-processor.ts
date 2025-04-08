import axios from 'axios';
import { nanoid } from 'nanoid';
import config from './config';

// Type Definitions
type NodeData = {
  id: string;
  parentId?: string | null;
  title: string;
  description?: string;
  topics?: string[];
  questions?: string[];
  resources?: Array<{ title: string; url: string }>;
  equations?: string[];
  codeExamples?: string[];
  position: { x: number; y: number };
  pyqs?: string[];
  references?: Array<{ title: string; url: string; type: 'book' | 'paper' | 'video' | 'article' }>;
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

type ErrorCheckResult = {
  hasError: boolean;
  errorType?: string;
  errorContext?: string;
  correctedResponse?: PathwayResponse;
};

// Function to validate and fix IDs in the response
export function validateAndFixIds(response: PathwayResponse): PathwayResponse {
  const idMap = new Map<string, string>();

  // Assign new IDs to all nodes
  const fixedNodes = response.nodes.map((node) => {
    const newId = `node-${nanoid(6)}`;
    idMap.set(node.id, newId);
    return {
      ...node,
      id: newId,
      parentId: node.parentId ? idMap.get(node.parentId) || node.parentId : null,
    };
  });

  // Update all edges with the new node IDs
  const fixedEdges = (response.edges || []).map((edge) => ({
    ...edge,
    id: `edge-${nanoid(6)}`,
    source: idMap.get(edge.source) || edge.source,
    target: idMap.get(edge.target) || edge.target,
  }));

  // Return the fixed response
  return {
    title: response.title,
    nodes: fixedNodes,
    edges: fixedEdges,
  };
}

// Function to check for structural errors in the response
export function checkForErrors(responseContent: string): ErrorCheckResult {
  const result: ErrorCheckResult = { hasError: false };

  try {
    const parsedResponse = JSON.parse(responseContent);
    console.log('Checking for errors in parsed response');

    // Validate title
    if (!parsedResponse.title || typeof parsedResponse.title !== 'string') {
      result.hasError = true;
      result.errorType = 'missing_title';
      result.errorContext = 'Response is missing title or title is not a string';
      console.error('Error: Missing or invalid title');
      return result;
    }

    // Validate nodes
    if (!parsedResponse.nodes || !Array.isArray(parsedResponse.nodes) || parsedResponse.nodes.length === 0) {
      result.hasError = true;
      result.errorType = 'missing_nodes';
      result.errorContext = 'No nodes found in the response.';
      console.error('Error: Missing nodes array or empty nodes array');
      return result;
    }

    for (const node of parsedResponse.nodes) {
      if (!node.id || !node.title) {
        result.hasError = true;
        result.errorType = 'invalid_node_structure';
        result.errorContext = `Node is missing required fields: ${JSON.stringify(node).substring(0, 100)}`;
        console.error('Error: Invalid node structure - missing id or title');
        return result;
      }

      if (
        !node.position ||
        typeof node.position !== 'object' ||
        node.position.x === undefined ||
        node.position.y === undefined
      ) {
        result.hasError = true;
        result.errorType = 'missing_position';
        result.errorContext = `Node is missing position data: ${JSON.stringify(node).substring(0, 100)}`;
        console.error('Error: Node missing position data');
        return result;
      }
    }

    // Validate edges
    if (parsedResponse.nodes.length > 1 && (!parsedResponse.edges || !Array.isArray(parsedResponse.edges) || parsedResponse.edges.length === 0)) {
      result.hasError = true;
      result.errorType = 'missing_edges';
      result.errorContext = 'Multiple nodes exist but no edges are defined.';
      console.error('Error: Missing edges between multiple nodes');
      return result;
    }

    for (const edge of parsedResponse.edges || []) {
      if (!edge.id || !edge.source || !edge.target) {
        result.hasError = true;
        result.errorType = 'invalid_edge_structure';
        result.errorContext = `Edge is missing required fields: ${JSON.stringify(edge).substring(0, 100)}`;
        console.error('Error: Invalid edge structure - missing id, source, or target');
        return result;
      }
      
      const sourceExists = parsedResponse.nodes.some((node: any) => node.id === edge.source);
      const targetExists = parsedResponse.nodes.some((node: any) => node.id === edge.target);

      if (!sourceExists || !targetExists) {
        result.hasError = true;
        result.errorType = 'invalid_edge_reference';
        result.errorContext = `Edge references non-existent node: ${JSON.stringify(edge).substring(0, 100)}`;
        console.error('Error: Edge references non-existent node');
        return result;
      }
    }

    // If we get here, no errors were found
    console.log('No structural errors found in response');
    return result;
  } catch (error) {
    // JSON parsing error
    result.hasError = true;
    result.errorType = 'invalid_json';
    result.errorContext = responseContent.substring(0, 200); // First 200 chars for context
    console.error('Error: Invalid JSON structure', error);
    return result;
  }
}

// Function to generate the initial learning pathway
export async function generateInitialResponse(
  topic: string,
  timespan: string,
  complexity: string,
  customDays?: number
): Promise<any> {
  let timeDescription: string;

  if (timespan === 'custom' && customDays) {
    timeDescription = `${customDays} days`;
  } else {
    timeDescription = timespan;
  }

  const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || config.api.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1/chat/completions';
  const MODEL_NAME = process.env.MODEL_NAME || config.api.MODEL_NAME || 'nvidia/llama-3.1-nemotron-70b-instruct:free';
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || config.api.OPENROUTER_API_KEY;

  console.log(`Generating initial response using model: ${MODEL_NAME}`);
  console.log(`Topic: ${topic}, Timespan: ${timeDescription}, Complexity: ${complexity}`);

  const prompt = `Create a learning pathway for "${topic}" with ${timeDescription} timespan at ${complexity} level.
  The response should be a JSON object with the following structure:
  {
    "title": "Main topic title",
    "nodes": [
      {
        "id": "unique-id-1",
        "title": "Node title",
        "description": "Detailed description",
        "position": {"x": 0, "y": 0},
        "topics": ["topic1", "topic2"],
        "questions": ["question1?", "question2?"],
        "resources": [{"title": "Resource name", "url": "https://example.com"}]
      }
    ],
    "edges": [
      {
        "id": "unique-edge-id",
        "source": "source-node-id",
        "target": "target-node-id",
        "label": "Optional connection label"
      }
    ]
  }
  
  Ensure all nodes have valid position objects with x and y coordinates, and all edges reference existing node IDs.`;

  try {
    const response = await axios.post(
      OPENROUTER_BASE_URL,
      {
        model: MODEL_NAME,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        },
        timeout: 120000, // 2-minute timeout
      }
    );

    console.log('Initial response received successfully');
    return response.data;
  } catch (error) {
    console.error('Error generating initial response:', error);
    throw new Error(`Failed to generate initial response: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Function to extract JSON content from AI response
export function extractJsonContent(content: string): any {
  console.log('Extracting JSON content from AI response');
  console.log('Content length:', content.length);
  console.log('Content preview:', content.substring(0, 100) + '...');
  
  // Remove markdown code block markers if present
  const cleanedContent = content.replace(/```(?:json)?([\s\S]*?)```/g, '$1').trim();

  // Try to find a JSON object in the content
  const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/g);
  if (jsonMatch) {
    try {
      const parsedJson = JSON.parse(jsonMatch[0]);
      console.log('Successfully extracted and parsed JSON content');
      return parsedJson;
    } catch (error) {
      console.error('Error parsing extracted JSON:', error);
      
      // Try more aggressive cleaning
      try {
        // Remove comments and fix common issues
        const cleanedJson = jsonMatch[0]
          .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
          .replace(/\/\/.*$/gm, '')          // Remove single-line comments
          .replace(/#.*$/gm, '')             // Remove # style comments
          .replace(/,\s*([\]\}])/g, '$1')    // Remove trailing commas
          .replace(/([{[,:])(\s*[a-zA-Z0-9_]+)\s*:/g, '$1"$2":') // Quote unquoted property names
          .replace(/:\s*'([^']*)'\s*/g, ':"$1"') // Replace single quotes with double quotes
          .trim();
        
        const aggressiveParsed = JSON.parse(cleanedJson);
        console.log('Successfully parsed JSON with aggressive cleaning');
        return aggressiveParsed;
      } catch (aggressiveError) {
        console.error('Aggressive JSON parsing failed:', aggressiveError);
    
    // Attempt to recover by returning a minimal valid JSON structure
    return { title: 'Fallback Pathway', nodes: [], edges: [] };
        return null;
      }
    }
  }

  console.error('No JSON object found in content');
  return null;
}

// Function to process the agentic response
export function processAgenticResponse(response: any): PathwayResponse {
  try {
    console.log('Processing agentic response');
    const content = response.choices[0].message.content;

    // Extract JSON content using the helper function
    const extractedJson = extractJsonContent(content);
    if (!extractedJson) {
      console.error('Failed to extract JSON from agentic response');
      return {
        title: 'Learning Pathway',
        nodes: [
          {
            id: `node-${nanoid(6)}`,
            title: 'Main Topic',
            description: 'This is a placeholder node created because the AI response could not be parsed.',
            position: { x: 0, y: 0 }
          }
        ],
        edges: [],
      };
    }

    // Ensure the response has the required structure
    const processedResponse: PathwayResponse = {
      title: extractedJson.title || 'Learning Pathway',
      nodes: [],
      edges: [],
    };

    // Process nodes
    if (extractedJson.nodes && Array.isArray(extractedJson.nodes)) {
      processedResponse.nodes = extractedJson.nodes.map((node: any) => ({
        ...node,
        id: node.id || `node-${nanoid(6)}`,
        parentId: node.parentId || null,
        topics: node.topics ? (Array.isArray(node.topics) ? node.topics : [node.topics]) : [],
        questions: node.questions ? (Array.isArray(node.questions) ? node.questions : [node.questions]) : [],
        resources: node.resources ? (Array.isArray(node.resources) ? node.resources : [node.resources]) : [],
        equations: node.equations ? (Array.isArray(node.equations) ? node.equations : [node.equations]) : [],
        codeExamples: node.codeExamples ? (Array.isArray(node.codeExamples) ? node.codeExamples : [node.codeExamples]) : [],
        pyqs: node.pyqs ? (Array.isArray(node.pyqs) ? node.pyqs : [node.pyqs]) : [],
        keyConcepts: node.keyConcepts ? (Array.isArray(node.keyConcepts) ? node.keyConcepts : [node.keyConcepts]) : [],
        position: node.position || { x: 0, y: 0 }
      }));
    }

    // Process edges
    if (extractedJson.edges && Array.isArray(extractedJson.edges)) {
      processedResponse.edges = extractedJson.edges.map((edge: any) => ({
        ...edge,
        id: edge.id || `edge-${nanoid(6)}`,
        source: edge.source,
        target: edge.target,
      }));
    }

    // Add a default node if no nodes exist
    if (!processedResponse.nodes.length) {
      processedResponse.nodes = [
        {
          id: `node-${nanoid(6)}`,
          title: processedResponse.title,
          description: 'Generated learning pathway',
          position: { x: 0, y: 0 },
        },
      ];
    }

    console.log('Successfully processed agentic response');
    console.log(`Processed ${processedResponse.nodes.length} nodes and ${processedResponse.edges.length} edges`);
    return processedResponse;
  } catch (error) {
    console.error('Error processing agentic response:', error);
    return {
      title: 'Learning Pathway',
      nodes: [
        {
          id: `node-${nanoid(6)}`,
          title: 'Error Processing Response',
          description: 'An error occurred while processing the AI response.',
          position: { x: 0, y: 0 }
        }
      ],
      edges: [],
    };
  }
}

// Function to generate a complete pathway using the agentic approach
export async function generateAgenticPathway(
  topic: string,
  timespan: string,
  complexity: string,
  customDays?: number
): Promise<PathwayResponse> {
  try {
    console.log('Generating agentic pathway');
    // Generate the initial response
    const initialResponse = await generateInitialResponse(topic, timespan, complexity, customDays);
    
    // Process the response
    const processedResponse = processAgenticResponse(initialResponse);
    
    // Validate and fix IDs
    const validatedResponse = validateAndFixIds(processedResponse);
    
    console.log('Successfully generated agentic pathway');
    return validatedResponse;
  } catch (error) {
    console.error('Error generating agentic pathway:', error);
    throw new Error(`Failed to generate agentic pathway: ${error instanceof Error ? error.message : String(error)}`);
  }
}