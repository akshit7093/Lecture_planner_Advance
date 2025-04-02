// OpenRouter API integration for AI content generation
app.post('/api/generate', async (req, res) => {
  try {
    // Step 1: Validate request data
    const validated = openRouterRequestSchema.parse(req.body);
    
    // Step 2: Prepare the prompt for OpenRouter
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

    // Step 3: Check API configuration
    const { MODEL_NAME, OPENROUTER_API_KEY, OPENROUTER_BASE_URL } = config.api;
    
    console.log(`Attempting to use model: ${MODEL_NAME}`);
    const start = Date.now();
    
    if (!OPENROUTER_API_KEY) {
      console.warn('OpenRouter API key is missing. Please set it in your .env file.');
      return res.status(400).json({ 
        message: "API key is required. Please set OPENROUTER_API_KEY in your .env file."
      });
    }
    
    // Step 4: Call the API
    const response = await axios.post(OPENROUTER_BASE_URL, {
      model: MODEL_NAME,
      messages: [
        { 
          role: "user", 
          content: prompt 
        }
      ],
      // No token limit as requested
      // max_tokens: 6000
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`
      }
    });
    
    const duration = Date.now() - start;
    console.log(`Successfully used model: ${MODEL_NAME}`, {
      model: MODEL_NAME, 
      statusCode: response.status,
      responseSize: JSON.stringify(response.data).length,
      duration: `${duration}ms`,
    });

    // Step 5: Process the API response
    const aiResponse = response.data;
    console.log("API Response:", JSON.stringify(aiResponse, null, 2));
  
    // Validate response structure
    if (!aiResponse.choices || !aiResponse.choices[0] || !aiResponse.choices[0].message) {
      console.error("Unexpected API response structure:", aiResponse);
      return res.status(500).json({ 
        message: "Unexpected API response structure",
        aiResponse: aiResponse
      });
    }
  
    const content = aiResponse.choices[0].message.content;
    console.log("Content from API:", content);
    
    // Step 6: Extract and parse JSON from the response
    let jsonContent;
    
    // First try the standard JSON extraction patterns
    const jsonMatch = content.match(/```(?:json)?([\s\S]*?)```/) || content.match(/(\{[\s\S]*\})/);
    
    let jsonText = "";
    if (jsonMatch && jsonMatch[1]) {
      jsonText = jsonMatch[1].trim();
    } else {
      // If no clear JSON marker, use the whole content
      jsonText = content;
    }
    
    // Try several methods to parse the JSON
    try {
      // Method 1: Standard parsing
      jsonContent = JSON.parse(jsonText);
      console.log("Successfully parsed JSON with standard method");
    } catch (parseError) {
      console.error("Standard JSON parsing failed:", (parseError as Error).message);
      
      // Method 2: Extract the main object
      const objectStart = jsonText.indexOf('{');
      const objectEnd = jsonText.lastIndexOf('}');
      
      if (objectStart < 0 || objectEnd <= objectStart) {
        console.error("Could not locate valid JSON object bounds in the content");
        return res.status(500).json({ 
          message: "Failed to parse AI response: Could not locate valid JSON object",
          content: content
        });
      }
      
      // Extract what appears to be the main object
      const extractedObject = jsonText.substring(objectStart, objectEnd + 1);
      console.log(`Extracted potential JSON object from index ${objectStart} to ${objectEnd}`);
      
      try {
        // Try to parse the extracted object
        jsonContent = JSON.parse(extractedObject);
        console.log("Successfully parsed extracted JSON object");
      } catch (extractError) {
        console.error("Extracted object parsing failed:", (extractError as Error).message);
        
        // Method 3: Apply fixes to the JSON
        try {
          // Replace newlines, fix quotes, trailing commas, etc.
          let fixedText = extractedObject
            .replace(/[\n\r]/g, ' ')                   // Remove newlines
            .replace(/,(\s*[\}\]])/g, '$1')            // Remove trailing commas
            .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')  // Ensure property names have double quotes
            .replace(/\'/g, '"')                      // Replace single quotes with double quotes
            .replace(/\\\\/g, '\\')                   // Fix double-escaped backslashes
            .replace(/\\"/g, '"')                    // Fix escaped quotes in code examples
            .replace(/\t/g, '    ');                 // Replace tabs with spaces
          
          try {
            jsonContent = JSON.parse(fixedText);
            console.log("Successfully parsed fixed JSON");
          } catch (fixError) {
            console.log("First fix attempt failed, trying advanced repair...");
            
            // Method 4: Handle truncated JSON
            const objectStart = fixedText.indexOf('{');
            
            if (objectStart < 0) {
              console.error("Cannot find starting bracket of JSON object");
              return res.status(500).json({ 
                message: "Failed to parse AI response: Invalid JSON structure",
                content: content
              });
            }
            
            // Is this a truncated node entry?
            if (fixedText.includes('"nodes":')) {
              // Check if we have a truncated node
              const lastNodeStart = fixedText.lastIndexOf('"id":');
              const lastBracePos = fixedText.lastIndexOf('}');
              const lastCommaPos = fixedText.lastIndexOf(',');
              
              // If the last node was started but not completed
              if (lastNodeStart > lastBracePos) {
                console.log("Found truncated node at position:", lastNodeStart);
                
                // Check for unfinished arrays within the node
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
                    
                    // Repair by closing the array after the last complete item
                    modifiedText = fixedText.substring(0, cutoffPoint) + 
                                 '], "position": {"x": 0, "y": 0} }' + 
                                 (fixedText.includes('"nodes": [') && 
                                  !fixedText.includes(']}') ? 
                                  '],"edges":[]}' : '');
                  } else {
                    // Empty array case
                    modifiedText = fixedText.substring(0, arrayTypeEnd + 1) + 
                                 '], "position": {"x": 0, "y": 0} }' + 
                                 (fixedText.includes('"nodes": [') && 
                                  !fixedText.includes(']}') ? 
                                  '],"edges":[]}' : '');
                  }
                  
                  console.log("Completed array and added position object");
                } else {
                  // No unclosed array found, but we're in a node - complete it
                  modifiedText = fixedText + '"position": {"x": 0, "y": 0} }' +
                                (fixedText.includes('"nodes": [') && 
                                 !fixedText.includes(']}') ? 
                                 '],"edges":[]}' : '');
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
              
              // Method 5: Last resort - use minimal structure
              console.log("Using minimal fallback JSON structure");
              jsonContent = {
                title: "Learning Pathway",
                description: "Automatically created pathway due to parsing issues",
                nodes: [],
                edges: []
              };
            }
          }
        } catch (jsonFixError) {
          console.error("JSON fixing attempt failed:", (jsonFixError as Error).message);
          return res.status(500).json({ 
            message: "Failed to parse AI response: Could not repair JSON structure",
            content: content
          });
        }
      }
    }
    
    // Step 7: Validate essential fields are present
    if (!jsonContent.title || !jsonContent.nodes || !Array.isArray(jsonContent.nodes) || !jsonContent.edges || !Array.isArray(jsonContent.edges)) {
      console.error("Invalid JSON content structure:", jsonContent);
      return res.status(500).json({ 
        message: "Generated content is missing required fields",
        content: content
      });
    }

    // Step 8: Create the pathway in storage
    const pathway = await storage.createPathway({
      title: jsonContent.title,
      timespan: validated.timespan,
      customDays: validated.customDays,
      complexity: validated.complexity
    });

    // Step 9: Create all nodes
    const createdNodes = [];
    for (const nodeData of jsonContent.nodes) {
      // Sanitize the node data before inserting into database
      const sanitizedNode = sanitizeNodeData(nodeData);
      
      const node = await storage.createNode({
        pathwayId: pathway.id,
        nodeId: sanitizedNode.id,
        parentId: sanitizedNode.parentId,
        title: sanitizedNode.title,
        description: sanitizedNode.description || "",
        position: sanitizedNode.position || { x: 0, y: 0 },
        nodeType: "default",
        topics: sanitizedNode.topics || [],
        questions: sanitizedNode.questions || [],
        resources: sanitizedNode.resources || [],
        equations: sanitizedNode.equations || [],
        codeExamples: sanitizedNode.codeExamples || [],
        metadata: {}
      });
      createdNodes.push(node);
    }

    // Step 10: Create all edges
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

    // Step 11: Return the complete pathway with nodes and edges
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
    
    res.status(500).json({ 
      message: "Failed to generate learning pathway",
      error: (error as Error).message
    });
  }
});