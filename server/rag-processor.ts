import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import axios from 'axios';
import config from './config';
import { validatePathwayResponse, extractJsonFromText } from './ai-response-processor';

// Types from agentic-processor.ts
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

type RagEnhancementResult = {
  success: boolean;
  enhancedResponse?: PathwayResponse;
  error?: string | Error;
};

/**
 * RAG-based Processor for Learning Pathway Generation
 * 
 * This module implements a Retrieval-Augmented Generation approach:
 * 1. Saves the initial AI response to a file
 * 2. Processes the response to extract structured data
 * 3. Performs quality assurance and enhancement
 * 4. Ensures the response adheres to the required structure
 */

/**
 * Saves the initial response to a file for debugging and analysis
 * @param content The raw content from the AI response
 * @param topic The topic of the learning pathway
 * @returns The path to the saved file
 */
export async function saveInitialResponse(content: string, topic: string): Promise<string> {
  // Create a sanitized filename from the topic
  const sanitizedTopic = topic.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const timestamp = Date.now();
  const filename = `${sanitizedTopic}_${timestamp}.txt`; // Changed to .txt for better compatibility
  
  // Ensure the directory exists
  const dirPath = path.join(process.cwd(), 'responses');
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  // Save the content to the file
  const filePath = path.join(dirPath, filename);
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log(`Initial response saved to ${filePath}`);
  return filePath;
}

/**
 * Creates a simple in-memory vector database from the saved response
 * @param filePath The path to the saved response file
 * @returns A vector database object with chunks and metadata
 */
export function createVectorDatabase(filePath: string): any {
  try {
    // Read the file content
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Split the content into chunks (simple approach)
    const chunks = content.split('\n\n').filter(chunk => chunk.trim().length > 0);
    
    // Create a simple vector database (in-memory for now)
    const vectorDb = {
      chunks: chunks.map((chunk, index) => ({
        id: `chunk-${index}`,
        text: chunk,
        metadata: {
          source: filePath,
          index
        }
      })),
      search: function(query: string, limit: number = 5) {
        // Simple keyword search (could be replaced with actual vector search)
        return this.chunks
          .map(chunk => ({
            chunk,
            score: chunk.text.toLowerCase().includes(query.toLowerCase()) ? 1 : 0
          }))
          .filter(result => result.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, limit)
          .map(result => result.chunk);
      }
    };
    
    console.log(`Created vector database with ${vectorDb.chunks.length} chunks`);
    return vectorDb;
  } catch (error) {
    console.error(`Failed to create vector database from ${filePath}:`, error);
    return null;
  }
}

/**
 * Extracts JSON content from the saved response file
 * @param filePath The path to the saved response file
 * @returns The parsed JSON content or null if parsing fails
 */
export function extractSavedContent(filePath: string): any | null {
  try {
    // Read the file content
    const content = fs.readFileSync(filePath, 'utf8');
    console.log('Extracting content from saved file:', filePath);
    console.log('Content length:', content.length);
    console.log('Content preview:', content.substring(0, 200) + '...');
    
    // Use the improved extraction function from ai-response-processor
    const extractedJson = extractJsonFromText(content);
    if (extractedJson) {
      console.log('Successfully extracted JSON using improved extraction function');
      return extractedJson;
    }
    
    // If extraction fails, create a minimal fallback structure
    console.log('Using minimal fallback JSON structure');
    return {
      title: "Learning Pathway",
      nodes: [{
        id: `node-${nanoid(6)}`,
        title: "Main Topic",
        description: "This is a placeholder node created because the AI response couldn't be properly parsed.",
        position: { x: 0, y: 0 }
      }],
      edges: []
    };
  } catch (error) {
    console.error(`Failed to read or process file ${filePath}:`, error);
    return null;
  }
}

/**
 * Performs quality assurance on the extracted content
 * @param content The extracted content from the saved response
 * @param topic The topic of the learning pathway
 * @returns The quality assurance result
 */
export async function performQualityAssurance(
  content: any,
  topic: string,
  timespan: string,
  complexity: string,
  vectorDb: any
): Promise<RagEnhancementResult> {
  // If content is null or not an object, return an error
  if (!content || typeof content !== 'object') {
    console.error('Invalid content format provided to performQualityAssurance');
    return {
      success: false,
      error: 'Invalid content format'
    };
  }
  
  try {
    // Validate the pathway response using the improved validation function
    const validatedResponse = validatePathwayResponse(content);
    
    // Enhance the response with additional information using RAG
    const enhancedResponse = await enhanceWithRAG(validatedResponse, topic, timespan, complexity, vectorDb);
    
    return {
      success: true,
      enhancedResponse
    };
  } catch (error) {
    console.error('Error in quality assurance:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Enhances the pathway response with additional information using RAG
 * @param response The initial pathway response
 * @param topic The topic of the learning pathway
 * @param timespan The timespan for the learning pathway
 * @param complexity The complexity level of the learning pathway
 * @param vectorDb The vector database for RAG
 * @returns The enhanced pathway response
 */
async function enhanceWithRAG(
  response: PathwayResponse,
  topic: string,
  timespan: string,
  complexity: string,
  vectorDb: any
): Promise<PathwayResponse> {
  // Create a copy of the response to avoid modifying the original
  const enhancedResponse = { ...response };
  
  // Get API configuration
  const MODEL_NAME = process.env.MODEL_NAME || config.api.MODEL_NAME || 'nvidia/llama-3.1-nemotron-70b-instruct:free';
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || config.api.OPENROUTER_API_KEY;
  const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || config.api.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1/chat/completions';
  
  console.log(`Enhancing response with RAG using model: ${MODEL_NAME}`);
  
  // Enhance each node with information from the vector database
  for (let i = 0; i < enhancedResponse.nodes.length; i++) {
    const node = enhancedResponse.nodes[i];
    
    // Skip enhancement for nodes that already have sufficient content
    if (node.description && node.description.length > 100 && 
        node.questions && node.questions.length >= 3 && 
        node.resources && node.resources.length >= 2) {
      continue;
    }
    
    // Search the vector database for relevant information
    const relevantChunks = vectorDb ? vectorDb.search(node.title, 3) : [];
    const contextText = relevantChunks.map((chunk: any) => chunk.text).join('\n\n');
    
    // Prepare the enhancement prompt for this specific node
    const nodeEnhancementPrompt = `I need to enhance a node in a learning pathway for "${topic}" with ${timespan} timespan at ${complexity} level.

Node Title: ${node.title}
Current Description: ${node.description || 'None'}
Number of Questions: ${node.questions ? node.questions.length : 0}
Number of Resources: ${node.resources ? node.resources.length : 0}

Please enhance this node by:
1. Providing a detailed description (at least 3-4 sentences)
2. Adding 3-5 relevant questions
3. Adding 2-3 resources with valid URLs
4. Adding equations or code examples if relevant
5. Adding key concepts if missing

Here is some relevant context from the original content:
${contextText}

The response should be a JSON object with the following structure:
{
  "description": "Enhanced description...",
  "questions": ["Question 1?", "Question 2?", ...],
  "resources": [{"title": "Resource Title", "url": "https://example.com"}, ...],
  "equations": ["Equation 1", ...],
  "codeExamples": ["Code example 1", ...],
  "keyConcepts": ["Key concept 1", ...]
}`;
    
    try {
      // Call the API for node enhancement
      const nodeEnhancementResponse = await axios.post(OPENROUTER_BASE_URL, {
        model: MODEL_NAME,
        messages: [{ role: "user", content: nodeEnhancementPrompt }]
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`
        },
        timeout: 60000 // 1 minute timeout
      });
      
      // Extract the enhanced content
      const enhancedNodeContent = nodeEnhancementResponse.data.choices[0].message.content;
      console.log(`Received enhancement response for node: ${node.title}`);
      console.log('Response preview:', enhancedNodeContent.substring(0, 100) + '...');
      
      // Parse the enhanced content
      try {
        // Use the improved extraction function
        const parsedNodeResponse = extractJsonFromText(enhancedNodeContent);
        
        if (parsedNodeResponse) {
          // Update the node with the enhanced content
          if (parsedNodeResponse.description) {
            node.description = parsedNodeResponse.description;
          }
          
          if (parsedNodeResponse.questions && Array.isArray(parsedNodeResponse.questions)) {
            node.questions = [...(node.questions || []), ...parsedNodeResponse.questions];
            // Remove duplicates
            node.questions = Array.from(new Set(node.questions));
          }
          
          if (parsedNodeResponse.resources && Array.isArray(parsedNodeResponse.resources)) {
            node.resources = [...(node.resources || []), ...parsedNodeResponse.resources];
            // Remove duplicates by URL
            const seenUrls = new Set();
            node.resources = node.resources.filter(resource => {
              if (!resource.url || seenUrls.has(resource.url)) return false;
              seenUrls.add(resource.url);
              return true;
            });
          }
          
          if (parsedNodeResponse.equations && Array.isArray(parsedNodeResponse.equations)) {
            node.equations = [...(node.equations || []), ...parsedNodeResponse.equations];
            // Remove duplicates
            node.equations = Array.from(new Set(node.equations));
          }
          
          if (parsedNodeResponse.codeExamples && Array.isArray(parsedNodeResponse.codeExamples)) {
            node.codeExamples = [...(node.codeExamples || []), ...parsedNodeResponse.codeExamples];
            // Remove duplicates
            node.codeExamples = Array.from(new Set(node.codeExamples));
          }
          
          if (parsedNodeResponse.keyConcepts && Array.isArray(parsedNodeResponse.keyConcepts)) {
            node.keyConcepts = [...(node.keyConcepts || []), ...parsedNodeResponse.keyConcepts];
            // Remove duplicates
            node.keyConcepts = Array.from(new Set(node.keyConcepts));
          }
          
          console.log(`Enhanced node: ${node.title}`);
        } else {
          console.error(`Failed to parse enhanced content for node ${node.title}`);
        }
      } catch (parseError) {
        console.error(`Failed to parse enhanced content for node ${node.title}:`, parseError);
      }
    } catch (error) {
      console.error(`Error enhancing node ${node.title}:`, error);
    }
  }
  
  return enhancedResponse;
}

/**
 * Main function that implements the RAG-based approach for generating learning pathways
 * @param topic The topic for the learning pathway
 * @param timespan The timespan for learning (daily, weekly, monthly, custom)
 * @param complexity The complexity level (beginner, intermediate, advanced)
 * @param initialContent The initial content from the AI response
 * @returns Processed pathway response
 */
export async function generateRagPathway(
  topic: string,
  timespan: string,
  complexity: string,
  initialContent: string
): Promise<PathwayResponse> {
  console.log('Starting RAG pathway generation process');
  console.log('Model used: ' + (process.env.MODEL_NAME || config.api.MODEL_NAME || 'nvidia/llama-3.1-nemotron-70b-instruct:free'));
  
  try {
    // Step 1: Save the initial response to a file
    const savedFilePath = await saveInitialResponse(initialContent, topic);
    console.log('Initial response saved to file');
    
    // Step 2: Create a vector database from the saved file
    const vectorDb = createVectorDatabase(savedFilePath);
    console.log('Vector database created');
    
    // Step 3: Extract the content from the saved file
    const extractedContent = extractSavedContent(savedFilePath);
    console.log('Content extracted from saved file');
    
    if (!extractedContent) {
      throw new Error('Failed to extract content from saved file');
    }
    
    // Step 4: Perform quality assurance and enhancement
    console.log('Performing quality assurance and enhancement');
    const qaResult = await performQualityAssurance(extractedContent, topic, timespan, complexity, vectorDb);
    
    // Step 5: Return the enhanced response or a default response if enhancement failed
    if (qaResult.success && qaResult.enhancedResponse) {
      console.log('RAG enhancement successful');
      return qaResult.enhancedResponse;
    } else {
      console.error('RAG enhancement failed:', qaResult.error);
      
      // Create a default response
      const defaultResponse: PathwayResponse = {
        title: `${topic} Learning Pathway`,
        nodes: [{
          id: `node-${nanoid(6)}`,
          title: `${topic} Overview`,
          description: `A learning pathway for ${topic} at ${complexity} level.`,
          position: { x: 0, y: 0 }
        }],
        edges: []
      };
      
      return defaultResponse;
    }
  } catch (error) {
    console.error('Error in RAG pathway generation:', error);
    throw new Error(`Failed to generate pathway: ${error instanceof Error ? error.message : String(error)}`);
  }
}