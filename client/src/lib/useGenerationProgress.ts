import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";
import { generatePathway } from './api';
import { PathwayFormData } from '@/types';
import { GenerationStage } from '@/components/GenerationProgress';

// Enhanced hook for pathway generation with progress tracking
export const useGenerationProgress = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Track the generation stage
  const [generationStage, setGenerationStage] = useState<GenerationStage>('idle');
  const [currentTopic, setCurrentTopic] = useState<string>('');
  
  const generateMutation = useMutation({
    mutationFn: async (data: PathwayFormData) => {
      try {
        // Update the current topic for display
        setCurrentTopic(data.topic);
        
        // Start with planning stage
        setGenerationStage('planning');
        
        // Artificial delay to show planning stage (500ms)
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Move to generating stage
        setGenerationStage('generating');
        
        // Actual API call
        const result = await generatePathway(data);
        
        // Move to processing stage
        setGenerationStage('processing');
        
        // Artificial delay to show processing stage (500ms)
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Complete
        setGenerationStage('complete');
        
        // Artificial delay before hiding the progress overlay (1500ms)
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Reset to idle
        setGenerationStage('idle');
        
        return result;
      } catch (error) {
        // Reset on error
        setGenerationStage('idle');
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pathways'] });
      toast({
        title: "Success",
        description: "Learning pathway generated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to generate pathway: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  return {
    generatePathway: generateMutation.mutate,
    isGenerating: generateMutation.isPending,
    generationStage,
    currentTopic,
    resetGenerationStage: () => setGenerationStage('idle'),
  };
};