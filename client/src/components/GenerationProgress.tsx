import { useState, useEffect } from 'react';
import { Progress } from "@/components/ui/progress";
import { Loader2, Brain, Network, CheckCircle2 } from 'lucide-react';

export type GenerationStage = 'idle' | 'planning' | 'generating' | 'processing' | 'complete';

interface GenerationProgressProps {
  stage: GenerationStage;
  topic: string;
}

const GenerationProgress = ({ stage, topic }: GenerationProgressProps) => {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  
  // Simulate progress based on the current stage
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let targetProgress = 0;
    
    switch (stage) {
      case 'planning':
        targetProgress = 30;
        setMessage('Planning hierarchical structure...');
        break;
      case 'generating':
        targetProgress = 70;
        setMessage('Generating detailed content...');
        break;
      case 'processing':
        targetProgress = 90;
        setMessage('Processing and organizing data...');
        break;
      case 'complete':
        targetProgress = 100;
        setMessage('Pathway complete!');
        break;
      default:
        targetProgress = 0;
        setMessage('');
    }
    
    if (stage !== 'idle' && stage !== 'complete') {
      // Animate progress to target
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev < targetProgress) {
            return prev + 1;
          }
          clearInterval(interval);
          return prev;
        });
      }, 50);
    } else if (stage === 'complete') {
      setProgress(100);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [stage]);
  
  if (stage === 'idle') return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {stage === 'complete' ? 'Ready!' : 'Generating Pathway'}
          </h2>
          <p className="text-gray-600">
            {stage === 'complete' 
              ? `Your learning pathway for "${topic}" is ready to explore.` 
              : `Creating a learning pathway for "${topic}"`
            }
          </p>
        </div>
        
        <div className="space-y-6">
          <Progress value={progress} className="h-2" />
          
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-700">
            {stage === 'planning' && (
              <>
                <Brain className="h-5 w-5 text-blue-500 animate-pulse" />
                <span className="animate-pulse">{message}</span>
              </>
            )}
            
            {stage === 'generating' && (
              <>
                <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />
                <span>{message}</span>
              </>
            )}
            
            {stage === 'processing' && (
              <>
                <Network className="h-5 w-5 text-purple-500 animate-pulse" />
                <span>{message}</span>
              </>
            )}
            
            {stage === 'complete' && (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>{message}</span>
              </>
            )}
          </div>
          
          {stage !== 'complete' && (
            <div className="text-center text-xs text-gray-500 mt-4">
              <p>This may take a minute or two depending on the complexity.</p>
              <p className="mt-1">We're creating a comprehensive learning structure for you.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GenerationProgress;