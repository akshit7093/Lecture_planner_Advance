import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { updateNode, enhanceNode } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { Node as DbNode } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface NodeDetailProps {
  isOpen: boolean;
  onClose: () => void;
  node: DbNode | null;
  pathwayId: number | null;
}

const NodeDetail = ({ isOpen, onClose, node, pathwayId }: NodeDetailProps) => {
  const [title, setTitle] = useState(node?.title || "");
  const [description, setDescription] = useState(node?.description || "");
  const [newTopic, setNewTopic] = useState("");
  const [topics, setTopics] = useState<string[]>(node?.topics as string[] || []);
  const [questions, setQuestions] = useState<string[]>(node?.questions as string[] || []);
  const [newQuestion, setNewQuestion] = useState("");
  const [selectedEnhancement, setSelectedEnhancement] = useState<'questions' | 'codeExamples' | 'resources' | 'equations'>('questions');
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Reset form when node changes
  if (node && node.title !== title) {
    setTitle(node.title);
    setDescription(node.description || "");
    setTopics(node?.topics as string[] || []);
    setQuestions(node?.questions as string[] || []);
  }
  
  const handleAddTopic = () => {
    if (newTopic.trim()) {
      setTopics([...topics, newTopic.trim()]);
      setNewTopic("");
    }
  };
  
  const handleRemoveTopic = (index: number) => {
    setTopics(topics.filter((_, i) => i !== index));
  };
  
  const handleAddQuestion = () => {
    if (newQuestion.trim()) {
      setQuestions([...questions, newQuestion.trim()]);
      setNewQuestion("");
    }
  };
  
  const handleRemoveQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };
  
  const handleGenerateContent = async () => {
    if (!node || !pathwayId) return;
    
    setIsEnhancing(true);
    
    try {
      const result = await enhanceNode({
        nodeId: node.id,
        nodeData: { 
          title, 
          description 
        },
        enhanceType: selectedEnhancement
      });
      
      // Update local state based on enhancement type
      if (selectedEnhancement === 'questions') {
        setQuestions([...questions, ...(result.enhancedContent || [])]);
      }
      
      // Invalidate the query to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/pathways', pathwayId, 'elements'] });
      
      toast({
        title: "Success",
        description: "Content generated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate content",
        variant: "destructive",
      });
    } finally {
      setIsEnhancing(false);
    }
  };
  
  const handleSave = async () => {
    if (!node) return;
    
    try {
      await updateNode(node.id, {
        title,
        description,
        topics,
        questions,
      });
      
      // Invalidate the query to refresh the data
      if (pathwayId) {
        queryClient.invalidateQueries({ queryKey: ['/api/pathways', pathwayId, 'elements'] });
      }
      
      toast({
        title: "Success",
        description: "Node updated successfully",
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update node",
        variant: "destructive",
      });
    }
  };
  
  if (!node) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Edit Node: {node.title}</DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto flex-1 p-1">
          <div className="space-y-4">
            <div>
              <Label>Node Title</Label>
              <Input 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>Description</Label>
              <Textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                rows={3}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label className="mb-1 block">Key Topics</Label>
              <div className="flex flex-wrap gap-1 mb-2">
                {topics.map((topic, index) => (
                  <Badge key={index} variant="secondary" className="px-2 py-1 flex items-center">
                    {topic}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-4 w-4 p-0 ml-1 text-gray-400 hover:text-gray-700"
                      onClick={() => handleRemoveTopic(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
              <div className="flex">
                <Input 
                  placeholder="Add new topic" 
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  className="flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTopic()}
                />
                <Button 
                  onClick={handleAddTopic}
                  className="ml-2"
                >
                  Add
                </Button>
              </div>
            </div>
            
            <div>
              <Label className="mb-1 block">Previous Year Questions</Label>
              <div className="space-y-2 mb-2">
                {questions.map((question, index) => (
                  <div key={index} className="flex items-start">
                    <Textarea 
                      value={question}
                      onChange={(e) => {
                        const newQuestions = [...questions];
                        newQuestions[index] = e.target.value;
                        setQuestions(newQuestions);
                      }}
                      rows={2}
                      className="flex-1 text-sm"
                    />
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="ml-2 mt-2 text-gray-400 hover:text-red-500"
                      onClick={() => handleRemoveQuestion(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              
              <div className="flex mb-2">
                <Textarea
                  placeholder="Add new question"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  rows={2}
                  className="flex-1 text-sm"
                />
              </div>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleAddQuestion}
                className="text-sm"
              >
                <Plus className="h-3 w-3 mr-1" /> Add Question
              </Button>
            </div>
            
            <div>
              <Label className="mb-1 block">Generate More Content</Label>
              <div className="p-3 bg-gray-50 rounded-md">
                <div className="flex mb-2 flex-wrap gap-1">
                  <Button 
                    variant={selectedEnhancement === 'questions' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setSelectedEnhancement('questions')}
                    className="text-xs"
                  >
                    Questions
                  </Button>
                  <Button 
                    variant={selectedEnhancement === 'codeExamples' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setSelectedEnhancement('codeExamples')}
                    className="text-xs"
                  >
                    Code Examples
                  </Button>
                  <Button 
                    variant={selectedEnhancement === 'resources' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setSelectedEnhancement('resources')}
                    className="text-xs"
                  >
                    Resources
                  </Button>
                  <Button 
                    variant={selectedEnhancement === 'equations' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setSelectedEnhancement('equations')}
                    className="text-xs"
                  >
                    Equations
                  </Button>
                </div>
                <Button 
                  className="w-full bg-accent text-white"
                  onClick={handleGenerateContent}
                  disabled={isEnhancing}
                >
                  {isEnhancing ? "Generating..." : "Generate Content"}
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NodeDetail;
