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
        max_tokens: 4000
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
        
        // Extract JSON object if it's wrapped in backticks or other formatting
        const jsonMatch = content.match(/```(?:json)?([\s\S]*?)```/) || content.match(/(\{[\s\S]*\})/);
        
        if (jsonMatch && jsonMatch[1]) {
          jsonContent = JSON.parse(jsonMatch[1].trim());
        } else {
          // Try to parse the whole response as JSON
          jsonContent = JSON.parse(content);
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
        max_tokens: 1000
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
          // Try to extract JSON from the response
          const jsonMatch = content.match(/```(?:json)?([\s\S]*?)```/) || content.match(/(\[[\s\S]*\])/);
          if (jsonMatch) {
            enhancementContent = JSON.parse(jsonMatch[1].trim());
          } else {
            // Fallback: parse as text and create structured data
            const resources = content.split('\n')
              .filter((line: string) => line.trim().length > 0 && (line.includes('http') || line.includes('www')))
              .map((line: string) => {
                const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
                const url = urlMatch ? urlMatch[1] : '';
                const title = line.replace(url, '').replace(/[:-]\s*/, '').trim();
                return { title: title || 'Resource', url };
              });
            enhancementContent = resources;
          }
        } catch (error: any) {
          console.error("Error parsing resources:", error);
          enhancementContent = [{ title: "Generated Resource", url: "https://example.com" }];
        }
      } else {
        // For other types, split by newlines and filter empty lines
        enhancementContent = content.split('\n')
          .filter((line: string) => line.trim().length > 0)
          .map((line: string) => line.replace(/^\d+\.\s*/, '').trim()); // Remove numbering
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
