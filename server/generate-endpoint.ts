import express from 'express';
import { storage } from './storage';
import axios from 'axios';
import { ZodError } from 'zod';
import { openRouterRequestSchema } from '@shared/schema';
import config from './config';
import { nanoid } from 'nanoid';
import { sanitizeNodeData, extractJsonFromText } from './ai-response-processor';
import { generateAgenticPathway, generateInitialResponse } from './agentic-processor';
import { generateRagPathway } from './rag-processor';
import {processAgenticResponse} from './agentic-processor';

type OutlineItem = {
  id: string;
  title: string;
  description?: string;
  children?: OutlineItem[];
  learning_objectives?: string[];
  activities?: string[];
  equations?: string[];
  codeExamples?: string[];
  pyqs?: string[];
  references?: Array<{title: string, url: string, type: 'book' | 'paper' | 'video' | 'article'}>;
  keyConcepts?: string[];
  detailedExplanation?: string;
  applications?: string[];
  commonMistakes?: string[];
  mnemonics?: string[];
};

type PlanningData = {
  title: string;
  outline: OutlineItem[];
};

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

// Note: sanitizeNodeData is now imported from ai-response-processor.ts

function convertOutlineToNodesAndEdges(outlineData: any, defaultTitle: string): PathwayResponse {
  const result: PathwayResponse = {
    title: outlineData.title || defaultTitle,
    nodes: [],
    edges: []
  };
  
  const nodeMap = new Map<string, NodeData>();
  
  function processOutlineItem(item: any, parentId: string | null = null, level: number = 0, index: number = 0): string | null {
    if (!item) return null;
    
    const nodeId = item.id || `node-${nanoid(6)}`;
    let description = item.description || "";
    let topics: string[] = [];
    let questions: string[] = [];
    let resources: Array<{title: string, url: string}> = [];
    
    if (item.learning_objectives && Array.isArray(item.learning_objectives)) {
      description += "\n\nLearning Objectives:\n" + 
        item.learning_objectives.map((obj: string) => `- ${obj}`).join("\n");
      topics = [...item.learning_objectives];
    }
    
    if (item.activities && Array.isArray(item.activities)) {
      questions = [...item.activities];
    }
    
    const position = {
      x: level * 300,
      y: index * 200
    };
    
    const node: NodeData = {
      id: nodeId,
      parentId,
      title: item.title,
      description,
      topics,
      questions,
      resources,
      equations: item.equations || [],
      codeExamples: item.codeExamples || [],
      pyqs: item.pyqs || [],
      references: item.references || [],
      keyConcepts: item.keyConcepts || [],
      expandableContent: {
        detailedExplanation: item.detailedExplanation || '',
        applications: item.applications || [],
        commonMistakes: item.commonMistakes || [],
        mnemonics: item.mnemonics || []
      },
      position
    };
    
    result.nodes.push(node);
    nodeMap.set(nodeId, node);
    
    if (item.children && Array.isArray(item.children)) {
      item.children.forEach((child: any, childIndex: number) => {
        const childNodeId = processOutlineItem(child, nodeId, level + 1, childIndex);
        
        if (childNodeId) {
          result.edges.push({
            id: `edge-${nanoid(6)}`,
            source: nodeId,
            target: childNodeId,
            animated: false
          });
        }
      });
    }
    
    return nodeId;
  }
  
  if (outlineData.outline && Array.isArray(outlineData.outline)) {
    outlineData.outline.forEach((item: any, index: number) => {
      processOutlineItem(item, null, 0, index);
    });
  }
  
  return result;
}

function processAIResponse(rawResponse: any, requestData: any): PathwayResponse {
  // Ensure we have a valid response object
  if (!rawResponse) {
    console.error('Received null or undefined AI response');
    return createDefaultResponse(requestData.topic || 'Learning Pathway');
  }

  if (typeof rawResponse !== 'object') {
    console.error('Invalid AI response format:', typeof rawResponse);
    return createDefaultResponse(requestData.topic || 'Learning Pathway');
  }

  // Check if the response contains an error
  if (rawResponse.error) {
    console.error('AI response contains error:', rawResponse.error);
    return createDefaultResponse(requestData.topic || 'Learning Pathway');
  }

  try {
    const processedResponse: PathwayResponse = {
      title: (rawResponse.title || requestData.topic || 'Learning Pathway').trim(),
      nodes: [],
      edges: []
    };
  
  const processedNodes = rawResponse.nodes.map((node: NodeData, index: number) => { // Specify types for node and index
    const nodeId = node.id || `node-${nanoid(6)}`;
    const position = node.position || { x: index * 200, y: Math.floor(index / 5) * 200 };
    
    return {
      ...node,
      id: nodeId,
      position,
      description: node.description || "",
      topics: node.topics ? (Array.isArray(node.topics) ? node.topics : [node.topics].filter(Boolean)) : [],
      questions: node.questions ? (Array.isArray(node.questions) ? node.questions : [node.questions].filter(Boolean)) : [],
      resources: node.resources ? (Array.isArray(node.resources) ? node.resources : [node.resources].filter(Boolean)) : [],
      equations: node.equations ? (Array.isArray(node.equations) ? node.equations : [node.equations].filter(Boolean)) : [],
      codeExamples: node.codeExamples ? (Array.isArray(node.codeExamples) ? node.codeExamples : [node.codeExamples].filter(Boolean)) : []
    };
  });
  
  processedResponse.nodes = processedNodes;
  
  if (rawResponse.edges && Array.isArray(rawResponse.edges)) {
    processedResponse.edges = rawResponse.edges.map((edge: EdgeData) => ({ // Specify type for edge
      ...edge,
      id: edge.id || `edge-${nanoid(6)}`,
      animated: edge.animated !== undefined ? edge.animated : false
    }));
  } else if (processedNodes.length > 1) {
    for (let i = 0; i < processedNodes.length - 1; i++) {
      processedResponse.edges.push({
        id: `edge-${nanoid(6)}`,
        source: processedNodes[i].id,
        target: processedNodes[i + 1].id,
        animated: false
      });
    }
  }
  
  if (!processedResponse.nodes.length) {
    processedResponse.nodes = [{
      id: `node-${nanoid(6)}`,
      title: processedResponse.title,
      description: "Generated learning pathway",
      position: { x: 0, y: 0 }
    }];
  }
  
    return processedResponse;
  } catch (error) {
    console.error('Error processing AI response:', error);
    return createDefaultResponse(requestData.topic || 'Learning Pathway');
  }
}

function createDefaultResponse(title: string): PathwayResponse {
  return {
    title,
    nodes: [{
      id: `node-${nanoid(6)}`,
      title: title,
      description: 'An error occurred while generating the learning pathway. Please try again.',
      position: { x: 0, y: 0 },
      topics: [],
      questions: [],
      resources: [],
      equations: [],
      codeExamples: []
    }],
    edges: []
  };
}

export function registerGenerateEndpoint(app: express.Express) {
  app.post('/api/generate', async (req, res) => {
    try {
      // Step 1: Validate request data
      const validated = openRouterRequestSchema.parse(req.body);
      const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || config.api.OPENROUTER_API_KEY;

      if (!OPENROUTER_API_KEY) {
        return res.status(400).json({ 
          message: "API key is required. Please set OPENROUTER_API_KEY in your .env file."
        });
      }

      // Step 2: Prepare timespan description
      let timeDescription: string;
      if (validated.timespan === 'custom' && validated.customDays) {
        timeDescription = `${validated.customDays} days`;
      } else {
        timeDescription = validated.timespan;
      }

      console.log(`Generating learning pathway for "${validated.topic}" with ${timeDescription} timespan at ${validated.complexity} level`);
      
      try {
        // Step 3: Generate the initial response using the agentic approach
        console.log('Starting agentic response generation...');
        const initialResponse = await generateInitialResponse(
          validated.topic,
          validated.timespan,
          validated.complexity,
          validated.customDays
        );
        
        if (!initialResponse || !initialResponse.choices || !initialResponse.choices[0] || !initialResponse.choices[0].message) {
          console.error('Invalid response structure from AI model:', initialResponse);
          return res.status(500).json({
            message: "Failed to generate pathway: Invalid AI response structure",
            details: "The AI model returned an unexpected response format"
          });
        }
        
        const initialContent = initialResponse.choices[0].message.content;
        console.log('Content from API:', initialContent.substring(0, 100) + '...');
        
        // Step 4: Use both approaches for better results
        // First try the agentic approach
        console.log('Processing with agentic approach...');
        const agenticResponse = processAgenticResponse(initialResponse);
        
        // Then enhance with RAG approach
        console.log('Enhancing with RAG approach...');
        const pathwayResponse = await generateRagPathway(
          validated.topic,
          validated.timespan,
          validated.complexity,
          initialContent
        );

        // Merge the results, preferring RAG results but falling back to agentic if RAG fails
        const finalResponse = {
          title: pathwayResponse.title || agenticResponse.title || `${validated.topic} Learning Pathway`,
          nodes: (pathwayResponse.nodes && pathwayResponse.nodes.length > 0) ? 
                  pathwayResponse.nodes : 
                  (agenticResponse.nodes || []),
          edges: (pathwayResponse.edges && pathwayResponse.edges.length > 0) ? 
                  pathwayResponse.edges : 
                  (agenticResponse.edges || [])
        };

        // Step 5: Apply final sanitization to ensure all nodes are properly formatted
        const sanitizedNodes = finalResponse.nodes.map(node => sanitizeNodeData(node));
        finalResponse.nodes = sanitizedNodes;

        // Step 6: Return the response
        return res.status(201).json({ pathway: finalResponse });
      } catch (error) {
        console.error('Error in pathway generation:', error);
        
        // Create a minimal fallback response
        const fallbackResponse = {
          title: `${validated.topic} Learning Pathway`,
          nodes: [{
            id: `node-${nanoid(6)}`,
            title: `${validated.topic} Overview`,
            description: `A learning pathway for ${validated.topic} at ${validated.complexity} level.`,
            position: { x: 0, y: 0 }
          }],
          edges: []
        };
        
        // Return the fallback response with an error message
        return res.status(201).json({
          pathway: fallbackResponse,
          warning: "Generated a minimal pathway due to processing errors. Please try again."
        });
      }
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: error.errors
        });
      }

      console.error('Unexpected error in generate endpoint:', error);
      return res.status(500).json({
        message: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
}