
"use client"

import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Settings2,
  ListMusic,
  History,
  LayoutGrid,
  Info,
  ShieldCheck,
  Download,
  Trash2
} from 'lucide-react';
import { UploadZone } from '@/components/UploadZone';
import { ConversionCard } from '@/components/ConversionCard';
import { BatchControls } from '@/components/BatchControls';
import { LocalStatusBadge } from '@/components/LocalStatusBadge';
import { EnhanceDialog } from '@/components/EnhanceDialog';
import { 
  getConversions, 
  saveConversion, 
  deleteConversion, 
  ConversionRecord 
} from '@/lib/db';
import { convertVideoToAudio, ConversionFormat } from '@/lib/converter';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PendingFile {
  id: string;
  file: File;
  progress: number;
  status: string;
  isProcessing: boolean;
  error?: string;
}

export default function AudioSyncPro() {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [history, setHistory] = useState<ConversionRecord[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<ConversionFormat>('mp3');
  const [activeTab, setActiveTab] = useState('converting');
  const [enhancingRecord, setEnhancingRecord] = useState<ConversionRecord | null>(null);
  const [isEnhanceOpen, setIsEnhanceOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const records = await getConversions();
    setHistory(records);
  };

  const handleFilesSelected = (files: File[]) => {
    const newPending = files.map(file => ({
      id: `pending-${Math.random().toString(36).substr(2, 9)}`,
      file,
      progress: 0,
      status: 'Ready',
      isProcessing: false,
    }));
    setPendingFiles(prev => [...prev, ...newPending]);
    setActiveTab('converting');
  };

  const processFile = async (id: string) => {
    const pending = pendingFiles.find(p => p.id === id);
    if (!pending || pending.isProcessing) return;

    setPendingFiles(prev => prev.map(p => 
      p.id === id ? { ...p, isProcessing: true, status: 'Analyzing' } : p
    ));

    try {
      const audioBlob = await convertVideoToAudio(pending.file, selectedFormat, (progress, status) => {
        setPendingFiles(prev => prev.map(p => 
          p.id === id ? { ...p, progress, status } : p
        ));
      });

      const newRecord: ConversionRecord = {
        id: `conv-${Date.now()}-${id}`,
        name: pending.file.name.replace(/\.[^\/\.]+$/, "") + `.${selectedFormat}`,
        originalName: pending.file.name,
        type: `audio/${selectedFormat === 'mp3' ? 'mpeg' : 'wav'}`,
        size: audioBlob.size,
        date: Date.now(),
        blob: audioBlob,
      };

      await saveConversion(newRecord);
      setPendingFiles(prev => prev.filter(p => p.id !== id));
      await loadHistory();
      
      toast({
        title: "Conversion Complete",
        description: `${pending.file.name} is ready.`,
      });
    } catch (error) {
      setPendingFiles(prev => prev.map(p => 
        p.id === id ? { ...p, isProcessing: false, status: 'Error', error: 'Failed' } : p
      ));
    }
  };

  const processAll = async () => {
    const unprocessed = pendingFiles.filter(p => !p.isProcessing);
    for (const file of unprocessed) {
      await processFile(file.id);
    }
  };

  const handleSaveAll = () => {
    if (history.length === 0) return;
    
    history.forEach((record, index) => {
      setTimeout(() => {
        const url = URL.createObjectURL(record.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = record.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, index * 200);
    });

    toast({
      title: "Batch Download Started",
      description: `Saving ${history.length} audio files to your device.`,
    });
  };

  const handleClearHistory = async () => {
    for (const record of history) {
      await deleteConversion(record.id);
    }
    await loadHistory();
    toast({
      title: "History Cleared",
      description: "All saved conversions have been removed locally.",
    });
  };

  const removePending = (id: string) => {
    setPendingFiles(prev => prev.filter(p => p.id !== id));
  };

  const resetAll = () => setPendingFiles([]);

  const handleDeleteHistory = async (id: string) => {
    await deleteConversion(id);
    await loadHistory();
  };

  const handleEnhanceClick = (record: ConversionRecord) => {
    setEnhancingRecord(record);
    setIsEnhanceOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 hero-gradient selection:bg-primary selection:text-white">
      <Toaster />
      <EnhanceDialog 
        record={enhancingRecord} 
        isOpen={isEnhanceOpen} 
        onOpenChange={setIsEnhanceOpen} 
        onEnhanced={loadHistory}
      />
      
      {/* Premium Header */}
      <header className="sticky top-0 z-50 w-full px-6 py-4 flex items-center justify-between backdrop-blur-xl bg-white/70 border-b border-slate-200/60">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-primary rounded-xl flex items-center justify-center text-white shadow-[0_8px_16px_-4px_rgba(37,99,235,0.3)]">
            <Zap className="h-5 w-5 fill-current" />
          </div>
          <div>
            <h1 className="text-base font-headline font-bold leading-none tracking-tight text-slate-900">AudioSync <span className="text-primary">Studio</span></h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <ShieldCheck className="h-3 w-3 text-green-500" />
              <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest">Local Neural Engine</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 text-slate-400">
            <Info className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 text-slate-400">
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 md:py-16 space-y-12">
        {/* Minimal Hero */}
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-1000">
          <h2 className="text-4xl md:text-6xl font-headline font-bold text-slate-900 tracking-tight leading-[1.1]">
            Professional <br />
            <span className="text-primary/90">Sound Extraction</span>
          </h2>
          <p className="text-slate-500 max-w-sm text-sm md:text-base font-medium leading-relaxed">
            High-fidelity audio extraction powered by local AI. Your data stays in your browser.
          </p>
        </div>

        <UploadZone onFilesSelect={handleFilesSelected} />

        {/* Workspace */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-[73px] z-40 py-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
              <TabsList className="bg-slate-200/50 border border-slate-200/50 p-1 h-12 rounded-2xl">
                <TabsTrigger value="converting" className="rounded-xl px-6 font-bold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all">
                  <ListMusic className="w-3.5 h-3.5 mr-2" />
                  QUEUE {pendingFiles.length > 0 && <span className="ml-1 opacity-50">({pendingFiles.length})</span>}
                </TabsTrigger>
                <TabsTrigger value="history" className="rounded-xl px-6 font-bold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all">
                  <History className="w-3.5 h-3.5 mr-2" />
                  SAVED {history.length > 0 && <span className="ml-1 opacity-50">({history.length})</span>}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              {pendingFiles.length > 0 && activeTab === 'converting' && (
                <BatchControls 
                  format={selectedFormat} 
                  onFormatChange={setSelectedFormat}
                  onProcessAll={processAll}
                  onReset={resetAll}
                  count={pendingFiles.length}
                />
              )}

              {history.length > 0 && activeTab === 'history' && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-500">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleClearHistory}
                    className="rounded-xl h-10 px-4 font-bold text-xs border-slate-200 text-slate-500 hover:bg-destructive/5 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                    Clear All
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleSaveAll}
                    className="rounded-xl h-10 px-5 font-bold text-xs bg-primary text-white hover:bg-primary/90 shadow-[0_8px_16px_-4px_rgba(37,99,235,0.25)]"
                  >
                    <Download className="w-3.5 h-3.5 mr-2" />
                    Save All to Device
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-3">
            {activeTab === 'converting' ? (
              <>
                {pendingFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 bg-white/50 rounded-[3rem] border border-dashed border-slate-200/60 animate-in zoom-in-95 duration-700">
                    <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                      <LayoutGrid className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-slate-400 font-bold text-xs tracking-widest uppercase">Your queue is empty</p>
                  </div>
                ) : (
                  <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {pendingFiles.map((item) => (
                      <ConversionCard 
                        key={item.id}
                        fileName={item.file.name}
                        fileSize={item.file.size}
                        progress={item.progress}
                        status={item.status}
                        isProcessing={item.isProcessing}
                        format={selectedFormat}
                        onStart={() => processFile(item.id)}
                        onRemove={() => removePending(item.id)}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 bg-white/50 rounded-[3rem] border border-dashed border-slate-200/60 animate-in zoom-in-95 duration-700">
                    <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                      <History className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-slate-400 font-bold text-xs tracking-widest uppercase">No processed files yet</p>
                  </div>
                ) : (
                  <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {history.map((record) => (
                      <ConversionCard 
                        key={record.id}
                        record={record}
                        onDelete={handleDeleteHistory}
                        onEnhance={() => handleEnhanceClick(record)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="max-w-4xl mx-auto px-6 py-16 border-t border-slate-200/60 text-center md:text-left text-slate-400">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2.5 opacity-60">
            <Zap className="w-4 h-4 text-primary fill-current" />
            <span className="text-[10px] font-black tracking-[0.2em] uppercase text-slate-900">AudioSync Studio</span>
          </div>
          <div className="flex gap-8">
            <span className="text-[9px] font-bold uppercase tracking-widest">Hardware Acceleration</span>
            <span className="text-[9px] font-bold uppercase tracking-widest">End-to-End Privacy</span>
            <span className="text-[9px] font-bold uppercase tracking-widest">High Fidelity</span>
          </div>
        </div>
      </footer>

      <LocalStatusBadge />
    </div>
  );
}