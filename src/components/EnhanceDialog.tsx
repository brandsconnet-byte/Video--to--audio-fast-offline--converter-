"use client"

import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Wand2, Volume2, Mic2 } from 'lucide-react';
import { ConversionRecord, saveConversion } from '@/lib/db';
import { enhanceConvertedAudio } from '@/ai/flows/enhance-converted-audio';
import { useToast } from '@/hooks/use-toast';

interface EnhanceDialogProps {
  record: ConversionRecord | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onEnhanced: () => void;
}

export function EnhanceDialog({ record, isOpen, onOpenChange, onEnhanced }: EnhanceDialogProps) {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const { toast } = useToast();

  const handleEnhance = async (request: string) => {
    if (!record) return;
    
    setIsEnhancing(true);
    try {
      // Convert blob to base64 for GenAI processing
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(record.blob);
      });
      
      const audioDataUri = await base64Promise;
      
      const result = await enhanceConvertedAudio({
        audioDataUri,
        enhancementRequest: request
      });

      // Simulation: result.enhancedAudioDataUri is returned.
      // In a real app we'd convert this data URI back to a Blob
      const response = await fetch(result.enhancedAudioDataUri);
      const enhancedBlob = await response.blob();

      const enhancedRecord: ConversionRecord = {
        ...record,
        id: `enhanced-${Date.now()}-${record.id}`,
        name: `Enhanced - ${record.name}`,
        blob: enhancedBlob,
        date: Date.now(),
      };

      await saveConversion(enhancedRecord);
      onEnhanced();
      onOpenChange(false);
      
      toast({
        title: "Audio Enhanced Successfully",
        description: result.enhancementDescription,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Enhancement Failed",
        description: "There was an error processing the audio. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            AI Audio Enhancement
          </DialogTitle>
          <DialogDescription>
            Choose a processing style to improve the quality of your extracted audio using advanced AI filters.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <Button 
            variant="outline" 
            className="justify-start h-auto py-4 px-4 hover:border-accent hover:bg-accent/5 group"
            onClick={() => handleEnhance("reduce noise and background hum")}
            disabled={isEnhancing}
          >
            <Wand2 className="mr-3 h-5 w-5 text-accent group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <div className="font-semibold">Smart Clean Up</div>
              <div className="text-xs text-muted-foreground">Removes background noise and hums automatically.</div>
            </div>
          </Button>

          <Button 
            variant="outline" 
            className="justify-start h-auto py-4 px-4 hover:border-accent hover:bg-accent/5 group"
            onClick={() => handleEnhance("normalize volume and increase clarity")}
            disabled={isEnhancing}
          >
            <Volume2 className="mr-3 h-5 w-5 text-accent group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <div className="font-semibold">Studio Polish</div>
              <div className="text-xs text-muted-foreground">Normalizes volume and balances frequencies.</div>
            </div>
          </Button>

          <Button 
            variant="outline" 
            className="justify-start h-auto py-4 px-4 hover:border-accent hover:bg-accent/5 group"
            onClick={() => handleEnhance("boost vocals and reduce instruments")}
            disabled={isEnhancing}
          >
            <Mic2 className="mr-3 h-5 w-5 text-accent group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <div className="font-semibold">Vocal Enhancer</div>
              <div className="text-xs text-muted-foreground">Specifically targets and clarifies human speech.</div>
            </div>
          </Button>
        </div>

        {isEnhancing && (
          <div className="flex flex-col items-center justify-center p-4 space-y-3 animate-in fade-in">
            <Loader2 className="h-8 w-8 text-accent animate-spin" />
            <p className="text-sm font-medium">Processing Audio...</p>
            <p className="text-xs text-muted-foreground text-center">This can take a few seconds for larger files.</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isEnhancing}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}