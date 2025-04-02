import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import axios from "axios";
import { ZodError } from "zod";
import { 
  insertPathwaySchema, 
  insertNodeSchema, 
  insertEdgeSchema,
  openRouterRequestSchema,
  type InsertNode,
  type Node as DbNode
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes for pathways
  app.get('/api/pathways', async (req, res) => {
    try {
      const pathways = await storage.getPathways();
      res.json(pathways);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pathways" });
    }
  });

  app.get('/api/pathways/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const pathway = await storage.getPathway(id);
      
      if (!pathway) {
        return res.status(404).json({ message: "Pathway not found" });
      }
      
      res.json(pathway);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pathway" });
    }
  });

  app.post('/api/pathways', async (req, res) => {
    try {
      const validated = insertPathwaySchema.parse(req.body);
      const pathway = await storage.createPathway(validated);
      res.status(201).json(pathway);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create pathway" });
    }
  });

  app.patch('/api/pathways/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validated = insertPathwaySchema.partial().parse(req.body);
      const pathway = await storage.updatePathway(id, validated);
      
      if (!pathway) {
        return res.status(404).json({ message: "Pathway not found" });
      }
      
      res.json(pathway);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update pathway" });
    }
  });

  app.delete('/api/pathways/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deletePathway(id);
      
      if (!success) {
        return res.status(404).json({ message: "Pathway not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete pathway" });
    }
  });

  // API routes for nodes
  app.get('/api/pathways/:pathwayId/nodes', async (req, res) => {
    try {
      const pathwayId = parseInt(req.params.pathwayId);
      const nodes = await storage.getNodes(pathwayId);
      res.json(nodes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch nodes" });
    }
  });

  app.post('/api/nodes', async (req, res) => {
    try {
      const validated = insertNodeSchema.parse(req.body);
      const node = await storage.createNode(validated);
      res.status(201).json(node);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create node" });
    }
  });

  app.patch('/api/nodes/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validated = insertNodeSchema.partial().parse(req.body);
      const node = await storage.updateNode(id, validated);
      
      if (!node) {
        return res.status(404).json({ message: "Node not found" });
      }
      
      res.json(node);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update node" });
    }
  });

  app.delete('/api/nodes/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteNode(id);
      
      if (!success) {
        return res.status(404).json({ message: "Node not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete node" });
    }
  });

  // API routes for edges
  app.get('/api/pathways/:pathwayId/edges', async (req, res) => {
    try {
      const pathwayId = parseInt(req.params.pathwayId);
      const edges = await storage.getEdges(pathwayId);
      res.json(edges);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch edges" });
    }
  });

  app.post('/api/edges', async (req, res) => {
    try {
      const validated = insertEdgeSchema.parse(req.body);
      const edge = await storage.createEdge(validated);
      res.status(201).json(edge);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create edge" });
    }
  });

  app.patch('/api/edges/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validated = insertEdgeSchema.partial().parse(req.body);
      const edge = await storage.updateEdge(id, validated);
      
      if (!edge) {
        return res.status(404).json({ message: "Edge not found" });
      }
      
      res.json(edge);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update edge" });
    }
  });

  app.delete('/api/edges/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteEdge(id);
      
      if (!success) {
        return res.status(404).json({ message: "Edge not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete edge" });
    }
  });

  // OpenRouter API integration for AI content generation
  app.post('/api/generate', async (req, res) => {
    try {
      const validated = openRouterRequestSchema.parse(req.body);
      
      // Prepare the prompt for OpenRouter
      let timeDescription;
      if (validated.timespan === 'custom' && validated.customDays) {
        timeDescription = `${validated.customDays} days`;
      } else {
        timeDescription = validated.timespan;
      }
      
      const prompt = `Create a learning pathway for "${validated.topic}" with ${timeDescription} timespan at ${validated.complexity} level.
      
The response should be a JSON object with the following structure:
{
  "title": "Main topic title",
  "nodes": [
    {
      "id": "unique-id-1",
      "parentId": null, // null for root nodes
      "title": "Node title",
      "description": "Brief description of this topic",
      "topics": ["key topic 1", "key topic 2"], // Array of key topics
      "questions": ["previous year question 1", "previous year question 2"], // Array of questions
      "resources": [{"title": "Resource title", "url": "https://example.com"}], // Array of resources
      "equations": ["E = mc^2"], // Array of mathematical equations (if applicable)
      "codeExamples": ["code example here"], // Array of code examples (if applicable)
      "position": {"x": 0, "y": 0} // Relative position (we'll adjust this on the frontend)
    },
    {
      "id": "unique-id-2",
      "parentId": "unique-id-1", // Reference to parent node
      "title": "Subtopic title",
      "description": "Description of subtopic",
      "topics": ["subtopic 1", "subtopic 2"],
      "questions": [],
      "resources": [],
      "equations": [],
      "codeExamples": [],
      "position": {"x": 0, "y": 0}
    }
    // Additional nodes...
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "unique-id-1",
      "target": "unique-id-2",
      "label": "relates to",
      "animated": false
    }
    // Additional edges...
  ]
}

Ensure there are at least 5-10 nodes with various content types appropriate for the topic (include questions, equations if relevant, code examples if relevant, and resources). Structure the nodes in a hierarchical way that makes sense for learning the topic progressively.`;

      // Call the OpenRouter API with only google/gemini-2.5-pro-exp-03-25:free model as requested
      console.log(`Attempting to use model: google/gemini-2.5-pro-exp-03-25:free`);
      const start = Date.now();
      const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: "google/gemini-2.5-pro-exp-03-25:free",
        messages: [
          { 
            role: "user", 
            content: prompt 
          }
        ],
        max_tokens: 6000
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY || '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'}`
        }
      });
      
      const duration = Date.now() - start;
      console.log(`Successfully used model: google/gemini-2.5-pro-exp-03-25:free`, {
        model: "google/gemini-2.5-pro-exp-03-25:free", 
        statusCode: response.status,
        responseSize: JSON.stringify(response.data).length,
        duration: `${duration}ms`,
      });

      // Extract the generated content
      const aiResponse = response.data;
      console.log("API Response:", JSON.stringify(aiResponse, null, 2));
      
      // Parse the JSON content from the AI response
      let jsonContent;
      try {
        // Make sure we're accessing the response structure correctly
        if (!aiResponse.choices || !aiResponse.choices[0] || !aiResponse.choices[0].message) {
          console.error("Unexpected API response structure:", aiResponse);
          return res.status(500).json({ 
            message: "Unexpected API response structure",
            aiResponse: aiResponse
          });
        }
        
        const content = aiResponse.choices[0].message.content;
        console.log("Content from API:", content);
        
        // Enhanced JSON extraction and repair mechanism
        console.log("Attempting to extract and fix JSON from content...");
        
        // First try the standard JSON extraction patterns
        const jsonMatch = content.match(/```(?:json)?([\s\S]*?)```/) || content.match(/(\{[\s\S]*\})/);
        
        let jsonText = "";
        if (jsonMatch && jsonMatch[1]) {
          jsonText = jsonMatch[1].trim();
        } else {
          // If no clear JSON marker, use the whole content
          jsonText = content;
        }
        
        // Try to repair and extract a valid JSON object
        try {
          // Attempt standard parsing first
          jsonContent = JSON.parse(jsonText);
          console.log("Successfully parsed JSON with standard method");
        } catch (error) {
          const parseError = error as Error;
          console.error("Standard JSON parsing failed:", parseError.message);
          
          // Attempt JSON repair techniques:
          console.log("Attempting JSON repair...");
          
          // 1. Try to find the main JSON structure bounds
          const objectStart = jsonText.indexOf('{');
          const objectEnd = jsonText.lastIndexOf('}');
          
          if (objectStart >= 0 && objectEnd > objectStart) {
            // Extract what appears to be the main object
            const extractedObject = jsonText.substring(objectStart, objectEnd + 1);
            console.log(`Extracted potential JSON object from index ${objectStart} to ${objectEnd}`);
            
            try {
              // Try to parse the extracted object
              jsonContent = JSON.parse(extractedObject);
              console.log("Successfully parsed extracted JSON object");
            } catch (error) {
              const extractError = error as Error;
              console.error("Extracted object parsing failed:", extractError.message);
              
              // 2. Further try to fix common issues with AI-generated JSON
              try {
                // Replace newlines, fix quotes, trailing commas, etc.
                let fixedText = extractedObject
                  .replace(/[\n\r]/g, ' ')                   // Remove newlines
                  .replace(/,(\s*[\}\]])/g, '$1')            // Remove trailing commas
                  .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')  // Ensure property names have double quotes
                  .replace(/\'/g, '"');                      // Replace single quotes with double quotes
                
                try {
                  jsonContent = JSON.parse(fixedText);
                  console.log("Successfully parsed fixed JSON");
                } catch (parseAttemptError) {
                  console.log("First fix attempt failed, trying advanced repair...");
                  
                  // This is likely a truncated JSON - let's try to complete it
                  const objectStart = fixedText.indexOf('{');
                  
                  if (objectStart >= 0) {
                    console.log("Attempting to complete truncated JSON...");
                    
                    // Is this a truncated node entry?
                    if (fixedText.includes('"nodes":')) {
                      // Check if we have a truncated node
                      const lastNodeStart = fixedText.lastIndexOf('"id":');
                      const lastBracePos = fixedText.lastIndexOf('}');
                      const lastCommaPos = fixedText.lastIndexOf(',');
                      
                      // If the last node was started but not completed
                      if (lastNodeStart > lastBracePos) {
                        console.log("Found truncated node at position:", lastNodeStart);
                        
                        // Check for unfinished arrays within the node (questions, resources, etc.)
                        const questionsStart = fixedText.lastIndexOf('"questions":');
                        const topicsStart = fixedText.lastIndexOf('"topics":');
                        const resourcesStart = fixedText.lastIndexOf('"resources":');
                        const equationsStart = fixedText.lastIndexOf('"equations":');
                        const codeStart = fixedText.lastIndexOf('"codeExamples":');
                        
                        let modifiedText = fixedText;
                        
                        // Find the most recent array opening that doesn't have a closing bracket
                        const lastArrayOpening = Math.max(
                          questionsStart > fixedText.lastIndexOf(']', lastNodeStart) ? questionsStart : -1,
                          topicsStart > fixedText.lastIndexOf(']', lastNodeStart) ? topicsStart : -1,
                          resourcesStart > fixedText.lastIndexOf(']', lastNodeStart) ? resourcesStart : -1,
                          equationsStart > fixedText.lastIndexOf(']', lastNodeStart) ? equationsStart : -1,
                          codeStart > fixedText.lastIndexOf(']', lastNodeStart) ? codeStart : -1
                        );
                        
                        if (lastArrayOpening > -1) {
                          // We found an unclosed array, determine where to close it
                          const arrayTypeEnd = fixedText.indexOf('[', lastArrayOpening);
                          const arrayType = fixedText.substring(lastArrayOpening + 1, arrayTypeEnd).trim().replace(/[":]/g, '');
                          
                          console.log(`Found unclosed ${arrayType} array at position:`, lastArrayOpening);
                          
                          // Identify a comma after the array start (indicating at least one item exists)
                          const commaAfterArray = fixedText.indexOf(',', arrayTypeEnd);
                          
                          if (commaAfterArray > arrayTypeEnd) {
                            // Complete the array
                            let cutoffPoint = commaAfterArray;
                            
                            // Look for the last complete string in the array (ending with quote)
                            const lastQuotePos = fixedText.lastIndexOf('"', lastCommaPos);
                            if (lastQuotePos > arrayTypeEnd) {
                              // Find the comma after the complete string
                              const commaAfterQuote = fixedText.indexOf(',', lastQuotePos);
                              if (commaAfterQuote > 0 && commaAfterQuote < lastCommaPos) {
                                cutoffPoint = commaAfterQuote;
                              } else {
                                // If no comma after quote, find the object closing if it's a resource
                                if (arrayType === 'resources') {
                                  const closeBracePos = fixedText.lastIndexOf('}', lastCommaPos);
                                  if (closeBracePos > arrayTypeEnd) {
                                    cutoffPoint = closeBracePos + 1;
                                  }
                                } else {
                                  cutoffPoint = lastQuotePos + 1;
                                }
                              }
                            }
                            
                            // Build the fixed text by closing the array, then the node, and adding edges
                            modifiedText = fixedText.substring(0, cutoffPoint) + 
                                         '], "position": {"x": 0, "y": 0}}], "edges": [] }';
                            
                            console.log(`Completed truncated ${arrayType} array and JSON structure`);
                          } else {
                            // No items in array, just close it
                            modifiedText = fixedText.substring(0, arrayTypeEnd + 1) + 
                                         '], "position": {"x": 0, "y": 0}}], "edges": [] }';
                            
                            console.log(`Completed empty ${arrayType} array and JSON structure`);
                          }
                        } else {
                          // No arrays found, complete the node and the overall structure
                          modifiedText = fixedText.substring(0, lastCommaPos) + 
                                       '}], "edges": [] }';
                          
                          console.log("Completed truncated node and JSON structure");
                        }
                        
                        fixedText = modifiedText;
                      } else if (fixedText.lastIndexOf('"nodes": [') > fixedText.lastIndexOf(']')) {
                        // We have nodes tag but no closing bracket
                        fixedText = fixedText + '],"edges":[]}';
                        console.log("Completed nodes array and JSON structure");
                      } else if (!fixedText.includes('"edges":')) {
                        // If we have completed nodes but no edges
                        if (fixedText.endsWith('}')) {
                          // Add edges before the last }
                          fixedText = fixedText.substring(0, fixedText.length - 1) + 
                                     ', "edges": [] }';
                        } else if (fixedText.endsWith(']')) {
                          // Add edges after the nodes array
                          fixedText = fixedText + ', "edges": [] }';
                        } else {
                          // Just append edges and close
                          fixedText = fixedText + ', "edges": [] }';
                        }
                        console.log("Added missing edges array");
                      }
                    } else if (fixedText.includes('"title":') && !fixedText.includes('"nodes":')) {
                      // We have title but no nodes section
                      if (fixedText.endsWith('"description": "')) {
                        // Truncated at description, complete it
                        fixedText = fixedText + 'Auto-completed description", "nodes": [], "edges": [] }';
                        console.log("Completed truncated description and added missing arrays");
                      } else {
                        // Append nodes and edges
                        if (fixedText.endsWith('}')) {
                          fixedText = fixedText.substring(0, fixedText.length - 1) + 
                                     ', "nodes": [], "edges": [] }';
                        } else {
                          fixedText = fixedText + ', "nodes": [], "edges": [] }';
                        }
                        console.log("Added missing nodes and edges arrays");
                      }
                    }
                    
                    // Try to parse the repaired JSON
                    try {
                      jsonContent = JSON.parse(fixedText);
                      console.log("Successfully parsed completed JSON structure");
                    } catch (finalError) {
                      console.error("Final JSON completion attempt failed:", (finalError as Error).message);
                      
                      // Last resort: Create minimal valid structure for the response
                      console.log("Using minimal fallback JSON structure");
                      jsonContent = {
                        title: "Learning Pathway",
                        description: "Automatically created pathway due to parsing issues",
                        nodes: [],
                        edges: []
                      };
                    }
                  } else {
                    throw new Error("Cannot find starting bracket of JSON object");
                  }
                }
              } catch (error) {
                const fixError = error as Error;
                console.error("JSON fixing attempt failed:", fixError.message);
                throw new Error("Could not parse valid JSON structure after repair attempts: " + fixError.message);
              }
            }
          } else {
            console.error("Could not locate valid JSON object bounds in the content");
            throw new Error("Could not locate valid JSON object in the AI response");
          }
        }
        
        // Validate essential fields are present
        if (!jsonContent.title || !jsonContent.nodes || !Array.isArray(jsonContent.nodes) || !jsonContent.edges || !Array.isArray(jsonContent.edges)) {
          console.error("Invalid JSON content structure:", jsonContent);
          return res.status(500).json({ 
            message: "Generated content is missing required fields",
            content: content
          });
        }
      } catch (error: any) {
        console.error("Failed to parse API response:", error);
        return res.status(500).json({ 
          message: "Failed to parse AI response",
          error: error.message,
          content: aiResponse.choices && aiResponse.choices[0] && aiResponse.choices[0].message 
            ? aiResponse.choices[0].message.content 
            : "No content available"
        });
      }

      // Create the pathway in storage
      const pathway = await storage.createPathway({
        title: jsonContent.title,
        timespan: validated.timespan,
        customDays: validated.customDays,
        complexity: validated.complexity
      });

      // Create all nodes
      const createdNodes = [];
      for (const nodeData of jsonContent.nodes) {
        const node = await storage.createNode({
          pathwayId: pathway.id,
          nodeId: nodeData.id,
          parentId: nodeData.parentId,
          title: nodeData.title,
          description: nodeData.description || "",
          position: nodeData.position || { x: 0, y: 0 },
          nodeType: "default",
          topics: nodeData.topics || [],
          questions: nodeData.questions || [],
          resources: nodeData.resources || [],
          equations: nodeData.equations || [],
          codeExamples: nodeData.codeExamples || [],
          metadata: {}
        });
        createdNodes.push(node);
      }

      // Create all edges
      const createdEdges = [];
      for (const edgeData of jsonContent.edges) {
        const edge = await storage.createEdge({
          pathwayId: pathway.id,
          edgeId: edgeData.id,
          source: edgeData.source,
          target: edgeData.target,
          label: edgeData.label || "",
          animated: edgeData.animated ? 1 : 0
        });
        createdEdges.push(edge);
      }

      // Return the complete pathway with nodes and edges
      res.status(201).json({
        pathway,
        nodes: createdNodes,
        edges: createdEdges
      });
      
    } catch (error) {
      console.error("Generation error:", error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      
      if (axios.isAxiosError(error)) {
        return res.status(500).json({ 
          message: "OpenRouter API call failed", 
          error: error.response?.data || error.message 
        });
      }
      
      res.status(500).json({ message: "Failed to generate learning pathway" });
    }
  });

  // Enhance node with AI
  app.post('/api/enhance-node', async (req, res) => {
    try {
      const { nodeId, nodeData, enhanceType } = req.body;
      
      if (!nodeId || !nodeData || !enhanceType) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Get the node to enhance
      const node = await storage.getNode(parseInt(nodeId));
      if (!node) {
        return res.status(404).json({ message: "Node not found" });
      }
      
      // TypeScript safety check
      const dbNode = node as DbNode;

      // Prepare the prompt based on enhancement type
      let prompt;
      switch (enhanceType) {
        case 'questions':
          prompt = `Generate 3-5 relevant previous year exam or interview questions related to: "${nodeData.title}"\n\n${nodeData.description || ''}`;
          break;
        case 'resources':
          prompt = `Suggest 3-5 high-quality learning resources (articles, videos, books) for: "${nodeData.title}"\n\nProvide title and URL for each resource. Return as JSON array with format: [{"title": "Resource name", "url": "https://example.com"}]`;
          break;
        case 'equations':
          prompt = `Generate 2-3 relevant mathematical equations or formulas related to: "${nodeData.title}"\n\n${nodeData.description || ''}`;
          break;
        case 'codeExamples':
          prompt = `Generate 2-3 code examples related to: "${nodeData.title}"\n\n${nodeData.description || ''}`;
          break;
        default:
          return res.status(400).json({ message: "Invalid enhancement type" });
      }

      // Call the OpenRouter API with only google/gemini-2.5-pro-exp-03-25:free model as requested
      console.log(`Attempting to use model for node enhancement: google/gemini-2.5-pro-exp-03-25:free`, {
        enhanceType,
        nodeId,
        title: nodeData.title
      });
      
      const start = Date.now();
      const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: "google/gemini-2.5-pro-exp-03-25:free",
        messages: [
          { 
            role: "user", 
            content: prompt 
          }
        ],
        max_tokens: 2000
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY || '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'}`
        }
      });
      
      const duration = Date.now() - start;
      console.log(`Successfully used model for node enhancement: google/gemini-2.5-pro-exp-03-25:free`, {
        model: "google/gemini-2.5-pro-exp-03-25:free",
        enhanceType,
        nodeId,
        title: nodeData.title,
        statusCode: response.status,
        responseSize: JSON.stringify(response.data).length,
        duration: `${duration}ms`
      });

      // Extract the content from the AI response
      const aiResponse = response.data;
      console.log("Node Enhancement API Response:", JSON.stringify(aiResponse, null, 2));
      
      // Validate the response structure
      if (!aiResponse.choices || !aiResponse.choices[0] || !aiResponse.choices[0].message) {
        console.error("Unexpected API response structure for node enhancement:", aiResponse);
        return res.status(500).json({ 
          message: "Unexpected API response structure",
          aiResponse: aiResponse
        });
      }
      
      const content = aiResponse.choices[0].message.content;
      console.log("Node Enhancement Content:", content);
      
      // Process the response based on enhancement type
      let enhancementContent;
      
      if (enhanceType === 'resources') {
        try {
          console.log("Attempting to parse resources JSON...");
          
          // Try standard JSON extraction first
          const jsonMatch = content.match(/```(?:json)?([\s\S]*?)```/) || content.match(/(\[[\s\S]*\])/);
          
          let jsonText = "";
          if (jsonMatch && jsonMatch[1]) {
            jsonText = jsonMatch[1].trim();
          } else {
            // If no clear JSON marker, look for anything that resembles an array
            const arrayStart = content.indexOf('[');
            const arrayEnd = content.lastIndexOf(']');
            
            if (arrayStart >= 0 && arrayEnd > arrayStart) {
              jsonText = content.substring(arrayStart, arrayEnd + 1);
              console.log(`Extracted potential JSON array from index ${arrayStart} to ${arrayEnd}`);
            }
          }
          
          // Try to parse the JSON
          try {
            // Standard parsing
            if (jsonText) {
              enhancementContent = JSON.parse(jsonText);
              console.log("Successfully parsed resources JSON");
            } else {
              throw new Error("No JSON array found in content");
            }
          } catch (error) {
            const parseError = error as Error;
            console.error("Standard JSON parsing failed:", parseError.message);
            
            // Try to fix common issues
            try {
              // Replace newlines, fix quotes, trailing commas
              let fixedText = jsonText
                .replace(/[\n\r]/g, ' ')                   // Remove newlines
                .replace(/,(\s*[\}\]])/g, '$1')            // Remove trailing commas
                .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')  // Ensure property names have double quotes
                .replace(/\'/g, '"');                      // Replace single quotes with double quotes
              
              enhancementContent = JSON.parse(fixedText);
              console.log("Successfully parsed fixed resources JSON");
            } catch (error) {
              const fixError = error as Error;
              console.error("Resources JSON fixing attempt failed:", fixError.message);
              
              // Fallback: parse as text and create structured data
              console.log("Using fallback URL extraction for resources");
              const resources = content.split('\n')
                .filter((line: string) => line.trim().length > 0 && (line.includes('http') || line.includes('www')))
                .map((line: string) => {
                  const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
                  const url = urlMatch ? urlMatch[1] : '';
                  const title = line.replace(url, '').replace(/[:-]\s*/, '').trim();
                  return { title: title || 'Resource', url };
                });
              
              if (resources.length > 0) {
                enhancementContent = resources;
                console.log(`Extracted ${resources.length} resources using URL pattern matching`);
              } else {
                // Last resort fallback
                console.error("Could not extract any resources from content");
                enhancementContent = [];
              }
            }
          }
        } catch (error: any) {
          console.error("Error parsing resources:", error);
          enhancementContent = [];
        }
      } else {
        // For other types (questions, equations, codeExamples)
        console.log(`Processing ${enhanceType} as text list...`);
        
        // For code examples, try to preserve code blocks
        if (enhanceType === 'codeExamples') {
          const codeBlocks = [];
          const codeBlockRegex = /```(?:\w+)?\s*([\s\S]*?)```/g;
          let match;
          
          while ((match = codeBlockRegex.exec(content)) !== null) {
            codeBlocks.push(match[1].trim());
          }
          
          if (codeBlocks.length > 0) {
            enhancementContent = codeBlocks;
            console.log(`Extracted ${codeBlocks.length} code blocks`);
          } else {
            // Fall back to line-by-line for code if no code blocks
            enhancementContent = content.split('\n\n')
              .filter((block: string) => block.trim().length > 0)
              .map((block: string) => block.trim());
            
            console.log(`Extracted ${enhancementContent.length} code examples by paragraph`);
          }
        } else {
          // For questions and equations, split by newlines and filter empty lines
          enhancementContent = content.split('\n')
            .filter((line: string) => line.trim().length > 0)
            .map((line: string) => line.replace(/^\d+\.\s*/, '').trim()); // Remove numbering
          
          console.log(`Extracted ${enhancementContent.length} ${enhanceType} items`);
        }
      }

      // Create the appropriate update object based on enhancement type
      let result: DbNode | undefined;
      
      if (enhanceType === 'questions') {
        // We need to create a properly typed object for each case
        result = await storage.updateNode(dbNode.id, {
          questions: [...(dbNode.questions || []), ...enhancementContent]
        });
      } else if (enhanceType === 'resources') {
        result = await storage.updateNode(dbNode.id, {
          resources: [...(dbNode.resources || []), ...enhancementContent]
        });
      } else if (enhanceType === 'equations') {
        result = await storage.updateNode(dbNode.id, {
          equations: [...(dbNode.equations || []), ...enhancementContent]
        });
      } else if (enhanceType === 'codeExamples') {
        result = await storage.updateNode(dbNode.id, {
          codeExamples: [...(dbNode.codeExamples || []), ...enhancementContent]
        });
      }
      
      res.json({
        success: true,
        node: result,
        enhancedContent: enhancementContent
      });
      
    } catch (error: any) {
      console.error("Enhancement error:", error);
      
      if (axios.isAxiosError(error)) {
        return res.status(500).json({ 
          message: "OpenRouter API call failed", 
          error: error.response?.data || error.message 
        });
      }
      
      res.status(500).json({ 
        message: "Failed to enhance node",
        error: error.message || "Unknown error" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
