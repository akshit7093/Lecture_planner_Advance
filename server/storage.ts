import { 
  type Pathway, type InsertPathway, 
  type Node, type InsertNode, 
  type Edge, type InsertEdge,
  type User, type InsertUser, 
  users
} from "@shared/schema";

export interface IStorage {
  // Pathway operations
  getPathways(): Promise<Pathway[]>;
  getPathway(id: number): Promise<Pathway | undefined>;
  createPathway(pathway: InsertPathway): Promise<Pathway>;
  updatePathway(id: number, pathway: Partial<InsertPathway>): Promise<Pathway | undefined>;
  deletePathway(id: number): Promise<boolean>;
  
  // Node operations
  getNodes(pathwayId: number): Promise<Node[]>;
  getNode(id: number): Promise<Node | undefined>;
  createNode(node: InsertNode): Promise<Node>;
  updateNode(id: number, node: Partial<InsertNode>): Promise<Node | undefined>;
  deleteNode(id: number): Promise<boolean>;
  
  // Edge operations
  getEdges(pathwayId: number): Promise<Edge[]>;
  getEdge(id: number): Promise<Edge | undefined>;
  createEdge(edge: InsertEdge): Promise<Edge>;
  updateEdge(id: number, edge: Partial<InsertEdge>): Promise<Edge | undefined>;
  deleteEdge(id: number): Promise<boolean>;
  
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

export class MemStorage implements IStorage {
  private pathways: Map<number, Pathway>;
  private nodes: Map<number, Node>;
  private edges: Map<number, Edge>;
  private users: Map<number, User>;
  private currentPathwayId: number;
  private currentNodeId: number;
  private currentEdgeId: number;
  private currentUserId: number;

  constructor() {
    this.pathways = new Map();
    this.nodes = new Map();
    this.edges = new Map();
    this.users = new Map();
    this.currentPathwayId = 1;
    this.currentNodeId = 1;
    this.currentEdgeId = 1;
    this.currentUserId = 1;
  }

  // Pathway operations
  async getPathways(): Promise<Pathway[]> {
    return Array.from(this.pathways.values());
  }

  async getPathway(id: number): Promise<Pathway | undefined> {
    return this.pathways.get(id);
  }

  async createPathway(pathwayData: InsertPathway): Promise<Pathway> {
    const id = this.currentPathwayId++;
    const createdAt = new Date();
    
    // Ensure all required fields are properly set with null values if undefined
    const pathway: Pathway = { 
      ...pathwayData, 
      id, 
      createdAt,
      customDays: pathwayData.customDays ?? null 
    };
    
    this.pathways.set(id, pathway);
    return pathway;
  }

  async updatePathway(id: number, pathwayData: Partial<InsertPathway>): Promise<Pathway | undefined> {
    const pathway = this.pathways.get(id);
    if (!pathway) return undefined;

    const updatedPathway: Pathway = { ...pathway, ...pathwayData };
    this.pathways.set(id, updatedPathway);
    return updatedPathway;
  }

  async deletePathway(id: number): Promise<boolean> {
    // Delete associated nodes and edges first
    const nodes = Array.from(this.nodes.values()).filter(node => node.pathwayId === id);
    for (const node of nodes) {
      this.nodes.delete(node.id);
    }

    const edges = Array.from(this.edges.values()).filter(edge => edge.pathwayId === id);
    for (const edge of edges) {
      this.edges.delete(edge.id);
    }

    return this.pathways.delete(id);
  }

  // Node operations
  async getNodes(pathwayId: number): Promise<Node[]> {
    // Get nodes for the pathway
    const nodes = Array.from(this.nodes.values()).filter(node => node.pathwayId === pathwayId);
    
    // Ensure each node has a nodeId (backward compatibility)
    return nodes.map(node => {
      if (!node.nodeId) {
        const generatedNodeId = `node_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        console.log(`Generated nodeId ${generatedNodeId} for existing node ${node.id}`);
        this.nodes.set(node.id, {...node, nodeId: generatedNodeId});
        return {...node, nodeId: generatedNodeId};
      }
      return node;
    });
  }

  async getNode(id: number): Promise<Node | undefined> {
    const node = this.nodes.get(id);
    if (!node) return undefined;
    
    // Ensure node has a nodeId (backward compatibility)
    if (!node.nodeId) {
      const generatedNodeId = `node_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      console.log(`Generated nodeId ${generatedNodeId} for existing node ${node.id}`);
      const updatedNode = {...node, nodeId: generatedNodeId};
      this.nodes.set(id, updatedNode);
      return updatedNode;
    }
    
    return node;
  }

  async createNode(nodeData: InsertNode): Promise<Node> {
    const id = this.currentNodeId++;
    
    // Convert array-like objects to actual arrays and ensure null for undefined values
    const ensureArray = <T>(value: T[] | null | undefined): T[] | null => {
      if (value === undefined) return null;
      if (value === null) return null;
      return Array.isArray(value) ? value : Array.from(value);
    };
    
    // Ensure all required fields are properly set with null values if undefined
    const node: Node = { 
      ...nodeData, 
      id,
      parentId: nodeData.parentId ?? null,
      description: nodeData.description ?? null,
      nodeType: nodeData.nodeType ?? null,
      topics: ensureArray(nodeData.topics),
      questions: ensureArray(nodeData.questions),
      resources: ensureArray(nodeData.resources),
      equations: ensureArray(nodeData.equations),
      codeExamples: ensureArray(nodeData.codeExamples),
      metadata: nodeData.metadata ?? {}
    };
    
    this.nodes.set(id, node);
    return node;
  }

  async updateNode(id: number, nodeData: Partial<InsertNode>): Promise<Node | undefined> {
    const node = this.nodes.get(id);
    if (!node) return undefined;

    // Convert array-like objects to actual arrays and ensure null for undefined values
    const ensureArray = <T>(value: T[] | null | undefined): T[] | null => {
      if (value === undefined) return null;
      if (value === null) return null;
      return Array.isArray(value) ? value : Array.from(value);
    };
    
    // Process array fields correctly
    const processedData: Partial<InsertNode> = {
      ...nodeData
    };
    
    if ('topics' in nodeData) {
      processedData.topics = ensureArray(nodeData.topics);
    }
    
    if ('questions' in nodeData) {
      processedData.questions = ensureArray(nodeData.questions);
    }
    
    if ('resources' in nodeData) {
      processedData.resources = ensureArray(nodeData.resources);
    }
    
    if ('equations' in nodeData) {
      processedData.equations = ensureArray(nodeData.equations);
    }
    
    if ('codeExamples' in nodeData) {
      processedData.codeExamples = ensureArray(nodeData.codeExamples);
    }

    const updatedNode: Node = { ...node, ...processedData };
    this.nodes.set(id, updatedNode);
    return updatedNode;
  }

  async deleteNode(id: number): Promise<boolean> {
    // Also delete any edges connected to this node
    const node = this.nodes.get(id);
    if (node) {
      const nodeId = node.nodeId;
      const connectedEdges = Array.from(this.edges.values()).filter(
        edge => edge.source === nodeId || edge.target === nodeId
      );
      
      for (const edge of connectedEdges) {
        this.edges.delete(edge.id);
      }
    }
    
    return this.nodes.delete(id);
  }

  // Edge operations
  async getEdges(pathwayId: number): Promise<Edge[]> {
    return Array.from(this.edges.values()).filter(edge => edge.pathwayId === pathwayId);
  }

  async getEdge(id: number): Promise<Edge | undefined> {
    return this.edges.get(id);
  }

  async createEdge(edgeData: InsertEdge): Promise<Edge> {
    const id = this.currentEdgeId++;
    
    // Ensure all required fields are properly set with null values if undefined
    const edge: Edge = { 
      ...edgeData, 
      id,
      label: edgeData.label ?? null,
      animated: edgeData.animated ?? null
    };
    
    this.edges.set(id, edge);
    return edge;
  }

  async updateEdge(id: number, edgeData: Partial<InsertEdge>): Promise<Edge | undefined> {
    const edge = this.edges.get(id);
    if (!edge) return undefined;

    const updatedEdge: Edge = { ...edge, ...edgeData };
    this.edges.set(id, updatedEdge);
    return updatedEdge;
  }

  async deleteEdge(id: number): Promise<boolean> {
    return this.edges.delete(id);
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
}

export const storage = new MemStorage();
