
import React, { useRef, useState, useEffect } from 'react';
import { Lightbulb, FileText, UploadCloud, Crown, Trash2, List, Loader2, CheckSquare, Square, Eye, X, Image as ImageIcon, History, Sparkles, Library } from 'lucide-react';
import { read, utils } from 'xlsx';
import { AppSettings, IdeaCategory } from '../types';

interface Props {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  isProcessing: boolean;
  isPaidUnlocked: boolean;
  setIsPaidUnlocked: (unlocked: boolean) => void;
  onRestoreHistory: () => void;
  hasHistory: boolean;
}

const IdeaSettings: React.FC<Props> = ({ 
  settings, 
  setSettings, 
  isProcessing, 
  onRestoreHistory,
  hasHistory
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ideaMediaInputRef = useRef<HTMLInputElement>(null); 
  
  // File Loading State
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  const handleChange = (field: keyof AppSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (field: 'ideaFromRow' | 'ideaBatchSize' | 'ideaQuantity', value: string) => {
    if (value === '') {
      setSettings(prev => ({ ...prev, [field]: 0 }));
      return;
    }

    let num = parseInt(value);
    if (isNaN(num)) return; 
    
    if (field === 'ideaQuantity') {
        if (num > 50) num = 50; 
        if (num < 0) num = 0; 
    } 
    else if (field === 'ideaFromRow') {
        if (num < 0) num = 0; 
    } 
    else if (field === 'ideaBatchSize') {
        if (num > 100) num = 100; 
        if (num < 0) num = 0;
    }

    setSettings(prev => ({ ...prev, [field]: num }));
  };

  const handleDbFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoadingFile(true); 

    setTimeout(() => {
        const extension = file.name.split('.').pop()?.toLowerCase();

        if (extension === 'xlsx' || extension === 'xls') {
            const reader = new FileReader();
            reader.onload = (event) => {
                const data = event.target?.result;
                try {
                    const workbook = read(data, { type: 'binary' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
                    const lines = jsonData
                        .map(row => (row[0] ? String(row[0]).trim() : ''))
                        .filter(line => line.length > 0);
                    
                    setSettings(prev => ({ ...prev, ideaSourceLines: lines }));
                    setIsLoadingFile(false);
                } catch (err) {
                    console.error("Excel read error", err);
                    alert("Failed to read Excel file.");
                    setIsLoadingFile(false);
                }
            };
            reader.readAsBinaryString(file);
        } else {
            const reader = new FileReader();
            reader.onload = (event) => {
              const text = event.target?.result as string;
              if (text) {
                const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
                setSettings(prev => ({ ...prev, ideaSourceLines: lines }));
                setIsLoadingFile(false);
              }
            };
            reader.onerror = () => setIsLoadingFile(false);
            reader.readAsText(file);
        }
    }, 100);

    e.target.value = '';
  };

  const handleIdeaMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setSettings(prev => ({ ...prev, ideaSourceFiles: filesArray }));
    }
    e.target.value = '';
  };

  const handleClearDatabase = () => {
    setSettings(prev => ({ ...prev, ideaSourceLines: [] }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleModeSwitch = (mode: 'free' | 'paid') => {
    if (isProcessing) return; 
    setSettings(prev => ({ ...prev, ideaMode: mode }));
  };

  const inputClass = "w-full text-base p-2 border border-gray-300 rounded bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none focus:border-blue-500 transition-all disabled:bg-gray-100 disabled:text-gray-400 placeholder:text-gray-300";
  const selectClass = "w-full text-sm p-2 border border-gray-300 rounded bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none focus:border-blue-500 transition-all disabled:bg-gray-100 disabled:text-gray-400";
  const labelClass = "block text-sm font-medium text-gray-500 h-5 flex items-center whitespace-nowrap overflow-hidden";
  
  const lineCount = settings.ideaSourceLines ? settings.ideaSourceLines.length : 0;
  const showCustomInput = settings.ideaCategory === 'custom';
  const showFileInput = settings.ideaCategory === 'file';

  const sourceFiles = settings.ideaSourceFiles || [];
  const fileCount = sourceFiles.length;

  const previewStart = Math.max(0, (settings.ideaFromRow || 1) - 1);
  const previewLines = settings.ideaSourceLines && settings.ideaSourceLines.length > 0 
    ? settings.ideaSourceLines.slice(previewStart, previewStart + 3)
    : [];

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-200 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-blue-500" />
        <h2 className="text-base font-semibold text-gray-700 uppercase tracking-wide">Idea Setting</h2>
      </div>

      <div className="border-t border-blue-100 -my-2"></div>

      {/* MODE TABS (MODE 1 vs MODE 2) */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-1">
             <label className={labelClass}>Operating Mode</label>
        </div>
        <div className={`flex gap-3 p-1 bg-gray-100 rounded-lg w-full ${isProcessing ? 'opacity-60 cursor-not-allowed' : ''}`}>
          <button
            onClick={() => handleModeSwitch('free')}
            disabled={isProcessing} 
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-base font-medium rounded-md transition-all ${
              settings.ideaMode === 'free' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
            } ${isProcessing ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
          >
            <Sparkles size={16} className={settings.ideaMode === 'free' ? 'text-blue-500' : 'text-gray-400'} />
            <span>Mode 1</span>
          </button>

          <button
            onClick={() => handleModeSwitch('paid')}
            disabled={isProcessing} 
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-base font-medium rounded-md transition-all ${
              settings.ideaMode === 'paid' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
            } ${isProcessing ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
          >
            <Library size={16} className={settings.ideaMode === 'paid' ? 'text-blue-600' : 'text-gray-400'} />
            <span>Mode 2</span>
          </button>
        </div>
      </div>

      {/* === CUSTOM INSTRUCTION INJECTION === */}
      {settings.ideaMode === 'free' && (
         <div className="animate-in fade-in duration-300">
           <div className="flex items-center gap-2 mb-1">
             <label className={labelClass}>Custom Instruction (Optional)</label>
           </div>
           <div className="relative">
             <textarea
               className={`${inputClass} text-sm resize-none h-14`}
               placeholder="Instruksi spesifik untuk AI. Contoh: Bertindak sebagai Senior Stock Analyst, Fokus pada nilai komersial..."
               value={settings.ideaCustomInstruction || ''}
               onChange={(e) => handleChange('ideaCustomInstruction', e.target.value)}
               disabled={isProcessing}
             />
           </div>
         </div>
      )}

      {/* === MODE 1 CONTENT === */}
      {settings.ideaMode === 'free' && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300 flex flex-col gap-4">
           <div>
             <div className="flex items-center gap-2 mb-1">
                <label className={labelClass}>Theme / Niche</label>
             </div>
             
             {showCustomInput ? (
                <div className="flex gap-3 animate-in fade-in duration-200">
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="e.g. Cyberpunk Cat / Kucing Cyberpunk"
                      value={settings.ideaCustomInput || ''}
                      onChange={(e) => handleChange('ideaCustomInput', e.target.value)}
                      disabled={isProcessing}
                      autoFocus
                    />
                    <button
                      onClick={() => handleChange('ideaCategory', 'auto')} 
                      className="w-10 shrink-0 flex items-center justify-center bg-gray-100 text-gray-500 border border-gray-300 rounded hover:bg-gray-200 transition-colors"
                      title="Back to Categories"
                      disabled={isProcessing}
                    >
                        <List size={16} />
                    </button>
                </div>
             ) : showFileInput ? (
                <div className="flex gap-3 animate-in fade-in duration-200">
                     <div className="relative flex-1 min-w-0">
                        <input 
                           ref={ideaMediaInputRef}
                           type="file"
                           multiple 
                           accept="image/*,video/*,.svg,.eps,.ai,.pdf"
                           onChange={handleIdeaMediaUpload}
                           className="hidden"
                        />
                        <button 
                           onClick={() => fileCount === 0 && ideaMediaInputRef.current?.click()}
                           disabled={isProcessing}
                           className={`w-full h-full min-h-[42px] px-3 border rounded flex items-center justify-between gap-2 transition-all ${
                             fileCount > 0
                               ? 'bg-blue-50 border-blue-300 text-blue-700' 
                               : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                           }`}
                        >
                           <div className="flex items-center gap-2 overflow-hidden flex-1">
                              <ImageIcon size={16} className={`shrink-0 ${fileCount > 0 ? "text-blue-500" : "text-gray-400"}`} />
                              <span className="text-sm truncate block w-full text-left font-medium">
                                {fileCount > 0 
                                   ? (fileCount === 1 ? sourceFiles[0].name : `${fileCount} Files Selected`) 
                                   : "Upload Images/Videos/Vectors..."}
                              </span>
                           </div>
                           
                           {fileCount > 0 && (
                              <div 
                                onClick={(e) => {
                                   e.stopPropagation();
                                   if (!isProcessing) {
                                     setSettings(prev => ({ ...prev, ideaSourceFiles: [] })); 
                                     if(ideaMediaInputRef.current) ideaMediaInputRef.current.value = '';
                                   }
                                }}
                                className="p-1 hover:bg-blue-200 rounded-full cursor-pointer transition-colors shrink-0"
                              >
                                 <X size={14} />
                              </div>
                           )}
                        </button>
                     </div>
                     <button
                        onClick={() => handleChange('ideaCategory', 'auto')} 
                        className="w-10 shrink-0 flex items-center justify-center bg-gray-100 text-gray-500 border border-gray-300 rounded hover:bg-gray-200 transition-colors"
                        title="Back to Categories"
                        disabled={isProcessing}
                     >
                        <List size={16} />
                     </button>
                </div>
             ) : (
                <div className="relative">
                    <select
                        className={selectClass}
                        value={settings.ideaCategory}
                        onChange={(e) => handleChange('ideaCategory', e.target.value as IdeaCategory)}
                        disabled={isProcessing}
                    >
                        <option value="auto">SURPRISE ME</option>
                        <option value="lifestyle">Lifestyle & People</option>
                        <option value="business">Business & Technology</option>
                        <option value="nature">Nature & Environment</option>
                        <option value="food">Food & Drinks</option>
                        <option value="science">Science & Health</option>
                        <option value="travel">Travel & Culture</option>
                        <option value="architecture">Architecture</option>
                        <option value="social">Social Issues</option>
                        <option value="sports">Sports & Activities</option>
                        <option value="abstract">Abstract & Concepts</option>
                        <option value="custom">Custom (Your Own Theme)</option>
                        <option value="file">From File (Image/Video/Vector)</option>
                    </select>
                </div>
             )}
           </div>

           <div>
             <div className="grid grid-cols-2 gap-3">
                <div className="flex-1 min-w-0">
                    <label className={labelClass} title="Max 50">Quantity</label>
                    <input
                        type="number"
                        min="0"
                        max="50"
                        placeholder="Max 50"
                        className={inputClass}
                        value={settings.ideaQuantity === 0 ? '' : settings.ideaQuantity}
                        onChange={(e) => handleNumberChange('ideaQuantity', e.target.value)}
                        disabled={isProcessing}
                    />
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-end">
                    <button
                        onClick={onRestoreHistory}
                        disabled={isProcessing || !hasHistory}
                        className={`w-full h-[38px] flex items-center justify-center gap-2 px-3 rounded-md border text-xs font-bold uppercase transition-colors ${
                            hasHistory 
                            ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' 
                            : 'bg-gray-50 text-gray-400 border-gray-200'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title="Restore last generated batch"
                    >
                        <History size={14} />
                        <span>History</span>
                    </button>
                </div>
             </div>
           </div>
        </div>
      )}

      {/* === MODE 2 CONTENT === */}
      {settings.ideaMode === 'paid' && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300 flex flex-col gap-4">
          
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <label className={labelClass}>Database Source</label>
                </div>
                {isLoadingFile ? (
                   <span className="flex items-center gap-1 text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full border border-blue-200">
                     <Loader2 className="w-3 h-3 animate-spin" /> Analyzing...
                   </span>
                ) : (
                   lineCount > 0 && (
                    <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                      {lineCount.toLocaleString()} Rows
                    </span>
                   )
                )}
            </div>
            
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".txt,.csv,.xlsx,.xls" 
              onChange={handleDbFileUpload} 
              className="hidden" 
            />
            
            <div className="flex gap-3">
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing || isLoadingFile}
                className="flex-1 py-3 border-2 border-dashed rounded-lg text-xs font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-2 bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-wait"
              >
                {isLoadingFile ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />} 
                {isLoadingFile ? "Reading File..." : (lineCount > 0 ? "Replace File" : "Upload CSV/Excel")}
              </button>

              <button
                onClick={handleClearDatabase}
                disabled={isProcessing || lineCount === 0}
                className="w-12 shrink-0 flex items-center justify-center border-2 border-dashed border-red-300 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Clear Database"
              >
                 <Trash2 size={16} />
              </button>
            </div>
            
            <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-[10px] font-mono text-gray-500 overflow-y-auto h-[120px] scrollbar-thin scrollbar-thumb-gray-200">
                <div className="flex items-center gap-1 mb-1 font-bold text-gray-400 uppercase sticky top-0 bg-gray-50 pb-1 border-b border-gray-100"><Eye size={10} /> Data Preview</div>
                {lineCount > 0 ? (
                    <>
                        {previewLines.map((line, idx) => (
                            <div key={idx} className="truncate border-b border-gray-100 last:border-0 py-0.5 opacity-80">
                                {previewStart + idx + 1}. {line}
                            </div>
                        ))}
                        {(previewStart + 3) < lineCount && (
                             <div className="italic opacity-50 pt-0.5">... and {lineCount - (previewStart + 3)} more</div>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col gap-1 opacity-30 select-none h-full justify-center items-center pb-4">
                        <div className="text-center">-- Waiting for file upload --</div>
                        <div className="text-center">-- Empty Data --</div>
                    </div>
                )}
            </div>
          </div>

          <div className="flex gap-3">
              <div className="flex-1">
                <label className={labelClass} title="Start processing from this row">Start Row</label>
                <input
                  type="number"
                  min="0"
                  placeholder="1"
                  className={inputClass}
                  value={settings.ideaFromRow === 0 ? '' : settings.ideaFromRow}
                  onChange={(e) => handleNumberChange('ideaFromRow', e.target.value)}
                  disabled={isProcessing}
                />
              </div>
              <div className="flex-1">
                <label className={labelClass} title="How many items to process">Quantity</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Max 100"
                  className={inputClass}
                  value={settings.ideaBatchSize === 0 ? '' : settings.ideaBatchSize}
                  onChange={(e) => handleNumberChange('ideaBatchSize', e.target.value)}
                  disabled={isProcessing}
                />
              </div>
          </div>
        </div>
      )}

      {/* Custom Filename & Output Format Combined */}
      <div className="pt-2 border-t border-blue-100">
        <div className="flex items-center justify-between mb-1">
           <div className="flex items-center gap-2">
             <FileText className="w-4 h-4 text-blue-500" />
             <label className="block text-sm font-medium text-gray-500">
               Custom Filename
             </label>
           </div>
           
           <div className="flex gap-3">
             <button 
                onClick={() => handleChange('outputFormat', 'csv')}
                disabled={isProcessing}
                className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-blue-600 transition-colors"
              >
                {settings.outputFormat === 'csv' 
                  ? <CheckSquare className="w-3.5 h-3.5 text-blue-500" /> 
                  : <Square className="w-3.5 h-3.5 text-gray-300" />}
                CSV
              </button>
              <button 
                onClick={() => handleChange('outputFormat', 'txt')}
                disabled={isProcessing}
                className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-blue-600 transition-colors"
              >
                {settings.outputFormat === 'txt' 
                  ? <CheckSquare className="w-3.5 h-3.5 text-blue-500" /> 
                  : <Square className="w-3.5 h-3.5 text-gray-300" />}
                TXT
              </button>
           </div>
        </div>

        <div className="relative flex items-center">
          <input
            type="text"
            className={`${inputClass} pr-12 !bg-white !text-gray-900`} 
            placeholder="IsaIdea"
            value={settings.csvFilename}
            onChange={(e) => handleChange('csvFilename', e.target.value)}
            disabled={false} 
          />
          <span className="absolute right-3 text-gray-400 font-medium select-none pointer-events-none">
            .{settings.outputFormat}
          </span>
        </div>
      </div>
    </div>
  );
};

export default IdeaSettings;
