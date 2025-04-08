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
    if (!pathwayData.title || !pathwayData.timespan || !pathwayData.complexity) {
      throw new Error('Missing required pathway fields');
    }
    if (pathwayData.timespan === 'custom' && !pathwayData.customDays) {
      throw new Error('Custom timespan requires customDays field');
    }
    const id = this.currentPathwayId++;
    const createdAt = new Date();
    const pathway: Pathway = {
      id,
      title: pathwayData.title,
      timespan: pathwayData.timespan,
      complexity: pathwayData.complexity,
      customDays: pathwayData.customDays || null,
      createdAt
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
    return Array.from(this.nodes.values()).filter(node => node.pathwayId === pathwayId);
  }

  async getNode(id: number): Promise<Node | undefined> {
    return this.nodes.get(id);
  }

  async createNode(nodeData: InsertNode): Promise<Node> {
    if (!nodeData.pathwayId || !nodeData.nodeId || !nodeData.title || !nodeData.position) {
      throw new Error('Missing required node fields');
    }
    // Validate that the pathway exists
    const pathway = await this.getPathway(nodeData.pathwayId);
    if (!pathway) {
      throw new Error(`Pathway with id ${nodeData.pathwayId} does not exist`);
    }
    const id = this.currentNodeId++;
    // Ensure questions is properly typed as string[] | null
    const questions = nodeData.questions ? nodeData.questions.map(q => String(q)) : null;
    const node: Node = {
      ...nodeData,
      id,
      questions,
    };
    this.nodes.set(id, node);
    return node;
  }

  async updateNode(id: number, nodeData: Partial<InsertNode>): Promise<Node | undefined> {
    const node = this.nodes.get(id);
    if (!node) return undefined;

    // Ensure questions and topics are properly typed as string[] | null
    const questions = nodeData.questions ? nodeData.questions.map(q => String(q)) : node.questions;
    const topics = nodeData.topics ? nodeData.topics.map(t => String(t)) : node.topics;
    const updatedNode: Node = {
      ...node,
      ...nodeData,
      questions,
      topics,
    };
    this.nodes.set(id, updatedNode);
    return updatedNode;
  }

  async deleteNode(id: number): Promise<boolean> {
    const node = this.nodes.get(id);
    if (!node) return false;

    // Delete any edges connected to this node's nodeId
    const connectedEdges = Array.from(this.edges.values())
      .filter(edge => edge.source === node.nodeId || edge.target === node.nodeId);

    for (const edge of connectedEdges) {
      this.edges.delete(edge.id);
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
    if (!edgeData.pathwayId || !edgeData.edgeId || !edgeData.source || !edgeData.target) {
      throw new Error('Missing required edge fields');
    }

    // Validate that the pathway exists
    const pathway = await this.getPathway(edgeData.pathwayId);
    if (!pathway) {
      throw new Error(`Pathway with id ${edgeData.pathwayId} does not exist`);
    }

    // Validate that source and target nodes exist
    const sourceNode = Array.from(this.nodes.values())
      .find(node => node.nodeId === edgeData.source && node.pathwayId === edgeData.pathwayId);
    const targetNode = Array.from(this.nodes.values())
      .find(node => node.nodeId === edgeData.target && node.pathwayId === edgeData.pathwayId);

    if (!sourceNode || !targetNode) {
      throw new Error('Source or target node does not exist in the specified pathway');
    }

    // Check for duplicate edges
    const existingEdge = Array.from(this.edges.values())
      .find(edge => edge.source === edgeData.source &&
                    edge.target === edgeData.target &&
                    edge.pathwayId === edgeData.pathwayId);
    if (existingEdge) {
      throw new Error('An edge between these nodes already exists');
    }

    const id = this.currentEdgeId++;
    const edge: Edge = {
      ...edgeData,
      id,
      label: edgeData.label ?? null, // Ensure label is never undefined
      animated: edgeData.animated ?? null, // Ensure animated is never undefined
    };
    this.edges.set(id, edge);
    return edge;
  }

  async updateEdge(id: number, edgeData: Partial<InsertEdge>): Promise<Edge | undefined> {
    const edge = this.edges.get(id);
    if (!edge) return undefined;

    const updatedEdge: Edge = {
      ...edge,
      ...edgeData,
      label: edgeData.label ?? edge.label, // Ensure label is never undefined
    };
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
    if (!insertUser.username || !insertUser.password) {
      throw new Error('Missing required user fields');
    }

    // Check for existing username
    const existingUser = await this.getUserByUsername(insertUser.username);
    if (existingUser) {
      throw new Error('Username already exists');
    }

    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
}

export const storage = new MemStorage();
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        