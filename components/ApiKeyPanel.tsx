
import React, { useState, useMemo, useEffect } from 'react';
import { Key, Server, Cpu, Plus, Trash2, XCircle, ListOrdered, Eye, EyeOff, Search, Settings2 } from 'lucide-react';
import { AppMode, ApiProvider } from '../types';
import { GEMINI_MODELS, OPENAI_MODELS, GROQ_MODELS } from '../constants';

interface Props {
  apiKeys: string[];
  setApiKeys: (keys: string[]) => void;
  isProcessing: boolean;
  mode?: AppMode | 'logs'; 
  
  provider?: ApiProvider;
  setProvider?: (provider: ApiProvider) => void;
  
  // Specific model props
  geminiModel?: string;
  setGeminiModel?: (m: string) => void;
  openaiModel?: string;
  setOpenaiModel?: (m: string) => void;
  groqModel?: string;
  setGroqModel?: (m: string) => void;
  customBaseUrl?: string;
  setCustomBaseUrl?: (url: string) => void;
  customModel?: string;
  setCustomModel?: (model: string) => void;
  
  cooldownKeys?: Map<string, number>;

  // NEW: Global Worker Count
  workerCount?: number;
  setWorkerCount?: (count: number) => void;
}

const ApiKeyPanel: React.FC<Props> = ({ 
  apiKeys, 
  setApiKeys, 
  isProcessing, 
  mode = 'metadata',
  provider = 'GEMINI',
  setProvider,
  geminiModel,
  setGeminiModel,
  openaiModel,
  setOpenaiModel,
  groqModel,
  setGroqModel,
  customBaseUrl,
  setCustomBaseUrl,
  customModel,
  setCustomModel,
  cooldownKeys,
  workerCount,
  setWorkerCount
}) => {
  const [inputText, setInputText] = useState('');
  const [showHiddenKeys, setShowHiddenKeys] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Dynamic Theme Colors based on Mode (Unified Blue)
  const theme = { 
      border: 'border-blue-200', 
      separator: 'border-blue-100',
      icon: 'text-blue-500', 
      inputFocus: 'focus:ring-blue-500 focus:border-blue-500',
      selectFocus: 'focus:border-blue-500',
      buttonPrimary: 'bg-blue-600 hover:bg-blue-700',
      buttonPrimaryText: 'text-white',
      countBg: 'bg-blue-100 text-blue-800'
  };

  const inputClass = `w-full text-sm p-2 border border-gray-300 rounded bg-white text-gray-900 focus:ring-2 focus:outline-none transition-all disabled:bg-gray-100 disabled:text-gray-500 ${theme.inputFocus}`;

  const [isManualGemini, setIsManualGemini] = React.useState(false);
  const [isManualOpenAI, setIsManualOpenAI] = React.useState(false);
  const [isManualGroq, setIsManualGroq] = React.useState(false);

  const isCustomGeminiModel = !GEMINI_MODELS.some(m => m.value === geminiModel);
  const isCustomOpenAIModel = !OPENAI_MODELS.some(m => m.value === openaiModel);
  const isCustomGroqModel = !GROQ_MODELS.some(m => m.value === groqModel);

  // Sync manual toggle state
  useEffect(() => {
    if (provider === 'GEMINI' && isCustomGeminiModel && geminiModel) setIsManualGemini(true);
    if (provider === 'OPENAI' && isCustomOpenAIModel && openaiModel) setIsManualOpenAI(true);
    if (provider === 'GROQ' && isCustomGroqModel && groqModel) setIsManualGroq(true);
  }, [provider]);

  // STRICT WORKER LOGIC FIX
  useEffect(() => {
    if (setWorkerCount) {
        const count = apiKeys.length;
        if (count === 0) {
            setWorkerCount(10); 
        } else if (count < 10) {
            setWorkerCount(count);
        } else {
            setWorkerCount(10);
        }
    }
  }, [apiKeys, setWorkerCount]);

  const isValidFormat = (key: string): boolean => {
      if (!key) return false;
      if (provider === 'GEMINI') return key.startsWith('AIza');
      if (provider === 'OPENAI') return key.startsWith('sk-');
      if (provider === 'GROQ') return key.startsWith('gsk_');
      return true; // Custom accepts anything
  };

  const handleAddKeys = () => {
    if (!inputText.trim()) return;
    const newKeys = inputText.split(/[\n,]+/)
        .map(k => k.trim())
        .filter(k => k.length > 0);
    
    const invalidKeys = newKeys.filter(k => !isValidFormat(k));
    if (invalidKeys.length > 0 && provider !== 'CUSTOM') {
        console.warn("Some keys might have invalid format:", invalidKeys);
    }

    const updatedKeys = [...apiKeys, ...newKeys];
    setApiKeys(updatedKeys);
    setInputText('');
  };

  const handleClearAll = () => {
    setApiKeys([]);
  };

  const handleDeleteOne = (keyToDelete: string) => {
    const newKeys = apiKeys.filter(k => k !== keyToDelete);
    setApiKeys(newKeys);
  };

  const handleWorkerChange = (value: string) => {
      if (!setWorkerCount) return;
      if (value === '') {
          setWorkerCount(0);
          return;
      }
      let num = parseInt(value);
      if (isNaN(num)) return;
      if (num > 10) num = 10;
      if (num < 0) num = 0;
      setWorkerCount(num);
  };

  const maskKey = (key: string) => {
      if (showHiddenKeys) return key;
      if (key.length < 12) return "••••••••";
      const start = key.substring(0, 4);
      const end = key.substring(key.length - 4);
      return `${start}••••••••••••${end}`;
  };

  const getKeyStatusColor = (key: string) => {
      if (!isValidFormat(key)) return "bg-red-500"; 
      if (cooldownKeys && cooldownKeys.has(key)) {
         const expiry = cooldownKeys.get(key) || 0;
         if (Date.now() < expiry) return "bg-amber-400 animate-pulse";
      }
      return "bg-green-500";
  };

  const filteredKeys = useMemo(() => {
     if (!searchTerm) return apiKeys;
     return apiKeys.filter(k => k.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [apiKeys, searchTerm]);

  return (
    <div className={`bg-white p-4 rounded-lg shadow-sm border ${theme.border} transition-colors flex flex-col gap-4`}>
      {/* Header Row: Title & Provider Select */}
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-2">
            <Key className={`w-4 h-4 ${theme.icon}`} />
            <h2 className="text-base font-semibold text-gray-700 uppercase tracking-wide">API Settings</h2>
         </div>
         
         {setProvider && (
           <select 
              className={`text-xs font-bold border border-gray-300 rounded px-2 py-1 bg-gray-50 text-gray-700 focus:outline-none uppercase ${theme.selectFocus}`}
              value={provider}
              onChange={(e) => {
                  const newProvider = e.target.value as ApiProvider;
                  setProvider(newProvider);
                  setSearchTerm(''); // Clear search on provider switch
              }}
              disabled={isProcessing}
           >
              <option value="GEMINI">Gemini</option>
              <option value="GROQ">Groq</option>
              <option value="OPENAI">OpenAI</option>
              <option value="CUSTOM">Custom</option>
           </select>
         )}
      </div>

      <div className={`border-t ${theme.separator} -my-2`}></div>
      
      {/* Configuration Fields */}
      <div className="pt-2 grid grid-cols-2 gap-3">
        
        {provider === 'GEMINI' && (
          <>
             <div className="flex flex-col gap-1.5">
                 <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <Server size={10} /> Base URL
                 </div>
                 <input 
                   type="text"
                   className={inputClass}
                   value="https://generativelanguage.googleapis.com"
                   disabled={true} 
                 />
             </div>
             <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      <Cpu size={10} /> Model Name
                   </div>
                   <button onClick={() => setIsManualGemini(!isManualGemini)} className="text-[10px] text-blue-500 hover:text-blue-700 underline font-medium">
                     {isManualGemini ? 'List' : 'Manual'}
                   </button>
                </div>
                {isManualGemini ? (
                  <input type="text" className={inputClass} placeholder="gemini-3.0-flash" value={geminiModel} onChange={(e) => setGeminiModel && setGeminiModel(e.target.value)} disabled={isProcessing} />
                ) : (
                  <select className={inputClass} value={geminiModel} onChange={(e) => { if(e.target.value === 'MANUAL') setIsManualGemini(true); else setGeminiModel && setGeminiModel(e.target.value); }} disabled={isProcessing}>
                    {GEMINI_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    <option value="MANUAL">Custom...</option>
                  </select>
                )}
             </div>
          </>
        )}

        {provider === 'GROQ' && (
           <>
             <div className="flex flex-col gap-1.5">
                 <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <Server size={10} /> Base URL
                 </div>
                 <input type="text" className={inputClass} value="https://api.groq.com/openai/v1" disabled={true} />
             </div>
             <div className="flex flex-col gap-1.5 relative">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      <Cpu size={10} /> Model Name
                   </div>
                   <button onClick={() => setIsManualGroq(!isManualGroq)} className="text-[10px] text-blue-500 hover:text-blue-700 underline font-medium">
                     {isManualGroq ? 'List' : 'Manual'}
                   </button>
                 </div>
                 {isManualGroq ? (
                    <input type="text" className={inputClass} placeholder="llama-3.2-11b-vision-preview" value={groqModel} onChange={(e) => setGroqModel && setGroqModel(e.target.value)} disabled={isProcessing} />
                 ) : (
                    <select className={inputClass} value={groqModel} onChange={(e) => { if(e.target.value === 'MANUAL') setIsManualGroq(true); else setGroqModel && setGroqModel(e.target.value); }} disabled={isProcessing}>
                      {GROQ_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                      <option value="MANUAL">Custom...</option>
                    </select>
                 )}
             </div>
           </>
        )}

        {provider === 'OPENAI' && (
           <>
             <div className="flex flex-col gap-1.5">
                 <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <Server size={10} /> Base URL
                 </div>
                 <input type="text" className={inputClass} placeholder="https://api.openai.com/v1" value={customBaseUrl || "https://api.openai.com/v1"} onChange={(e) => setCustomBaseUrl && setCustomBaseUrl(e.target.value)} disabled={isProcessing} />
             </div>
             <div className="flex flex-col gap-1.5">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      <Cpu size={10} /> Model Name
                   </div>
                   <button onClick={() => setIsManualOpenAI(!isManualOpenAI)} className="text-[10px] text-blue-500 hover:text-blue-700 underline font-medium">
                     {isManualOpenAI ? 'List' : 'Manual'}
                   </button>
                 </div>
                 {isManualOpenAI ? (
                    <input type="text" className={inputClass} placeholder="gpt-5" value={openaiModel} onChange={(e) => setOpenaiModel && setOpenaiModel(e.target.value)} disabled={isProcessing} />
                 ) : (
                    <select className={inputClass} value={openaiModel} onChange={(e) => { if(e.target.value === 'MANUAL') setIsManualOpenAI(true); else setOpenaiModel && setOpenaiModel(e.target.value); }} disabled={isProcessing}>
                      {OPENAI_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                      <option value="MANUAL">Custom...</option>
                    </select>
                 )}
             </div>
           </>
        )}

        {provider === 'CUSTOM' && (
           <>
             <div className="flex flex-col gap-1.5">
                 <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <Server size={10} /> Base URL
                 </div>
                 <input type="text" className={inputClass} placeholder="http://localhost:11434/v1" value={customBaseUrl} onChange={(e) => setCustomBaseUrl && setCustomBaseUrl(e.target.value)} disabled={isProcessing} />
             </div>
             <div className="flex flex-col gap-1.5">
                 <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <Cpu size={10} /> Model Name
                 </div>
                 <input type="text" className={inputClass} placeholder="llama3, deepseek-r1" value={customModel} onChange={(e) => setCustomModel && setCustomModel(e.target.value)} disabled={isProcessing} />
             </div>
           </>
        )}
      </div>

      {/* GLOBAL WORKER SETTINGS */}
      {workerCount !== undefined && setWorkerCount && (
         <>
            <div className={`border-t ${theme.separator} -my-2`}></div>
            <div className="pt-2">
                <div className="flex items-center justify-between gap-4 p-2 bg-gray-50 border border-gray-200 rounded">
                    <div className="flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-gray-500" />
                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">
                            Concurrent Workers (Max 10)
                        </span>
                    </div>
                    <input 
                        type="number" 
                        min="1" 
                        max="10" 
                        className={`w-20 text-center text-sm font-bold p-1 rounded border border-gray-300 ${theme.inputFocus}`}
                        value={workerCount === 0 ? '' : workerCount}
                        onChange={(e) => handleWorkerChange(e.target.value)}
                        disabled={isProcessing}
                    />
                </div>
            </div>
         </>
      )}

      <div className={`border-t ${theme.separator} -my-2`}></div>

      {/* === INPUT SECTION === */}
      <div className="pt-2 flex flex-col gap-3">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            Input API Keys (One per line)
          </label>
          <textarea
              className={`w-full text-sm p-3 border rounded-md ${theme.inputFocus} focus:outline-none resize-none bg-white font-mono shadow-sm`}
              rows={3}
              placeholder={`Paste ${provider === 'GEMINI' ? 'Gemini (AIza...)' : provider === 'GROQ' ? 'Groq (gsk_...)' : 'API'} keys here...`}
              onChange={(e) => setInputText(e.target.value)}
              value={inputText}
              disabled={isProcessing}
              onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddKeys();
                  }
              }}
          />
      </div>
      
      {/* === CONTROLS GRID === */}
      <div className="grid grid-cols-3 gap-2">
          {/* Col 1: Total Display */}
          <div className={`flex items-center justify-center gap-1 p-2 rounded border ${theme.border} ${theme.countBg}`}>
             <span className="text-[10px] font-bold uppercase opacity-70">Total:</span>
             <span className="text-sm font-bold leading-none">{apiKeys.length}</span>
          </div>

          {/* Col 2: Add Button */}
          <button 
             onClick={handleAddKeys}
             disabled={isProcessing || !inputText.trim()}
             className={`flex flex-row items-center justify-center gap-1.5 p-2 rounded shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed ${theme.buttonPrimary} ${theme.buttonPrimaryText} active:scale-[0.98]`}
          >
            <Plus size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wide">Add Keys</span>
          </button>

          {/* Col 3: Clear Button */}
          <button 
             onClick={handleClearAll}
             disabled={isProcessing || apiKeys.length === 0}
             className="flex flex-row items-center justify-center gap-1.5 p-2 rounded border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] shadow-sm"
          >
            <Trash2 size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wide">Clear All</span>
          </button>
      </div>

      {/* === ACTIVE KEYS LIST === */}
      <div className="border border-gray-200 rounded-lg bg-gray-50 overflow-hidden flex flex-col mt-1 shadow-inner h-[280px] shrink-0">
        <div className="bg-gray-100 px-3 py-2 border-b border-gray-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
                <ListOrdered size={14} className="text-gray-500" />
                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">
                    {provider} Key List
                </span>
            </div>
            
            <div className="flex items-center gap-2">
                <div className="relative">
                    <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-24 pl-6 pr-2 py-1 text-[10px] border border-gray-300 rounded-full bg-white focus:outline-none focus:border-blue-400"
                    />
                </div>

                <button 
                    onClick={() => setShowHiddenKeys(!showHiddenKeys)}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
                    title={showHiddenKeys ? "Hide Keys" : "Show Keys"}
                >
                    {showHiddenKeys ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
            </div>
        </div>
        
        <div className="overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-300 flex-1">
            {filteredKeys.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2 opacity-60">
                    <ListOrdered size={24} />
                    <span className="text-[10px] font-medium">No API keys found.</span>
                </div>
            ) : (
                filteredKeys.map((k, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-white border border-gray-100 rounded mb-1 last:mb-0 shadow-sm hover:border-blue-200 transition-colors group">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${getKeyStatusColor(k)}`} title="Status" />
                        <span className="w-6 h-6 flex items-center justify-center bg-gray-50 text-[10px] font-bold text-gray-500 rounded shrink-0 select-none border border-gray-200">
                            {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0 font-mono text-[10px] text-gray-600 truncate px-1 select-all" title={showHiddenKeys ? k : "Hidden"}>
                            {maskKey(k)}
                        </div>
                        <button 
                            onClick={() => handleDeleteOne(k)}
                            disabled={isProcessing}
                            className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Remove Key"
                        >
                            <XCircle size={14} />
                        </button>
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
};

export default ApiKeyPanel;
