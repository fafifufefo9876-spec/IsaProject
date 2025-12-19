
import React, { memo, useState } from 'react';
import { Copy, CheckCircle, Languages, Trash2, Code } from 'lucide-react';
import { FileItem, Language } from '../types';

interface Props {
  items: FileItem[];
  onDelete: (id: string) => void;
  onToggleLanguage: (id: string) => void;
  getLanguage: (id: string) => Language;
}

const PromptListComponent: React.FC<Props> = ({ items, onDelete, onToggleLanguage, getLanguage }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAll = () => {
    const allText = items.map(item => {
       const lang = getLanguage(item.id);
       const text = lang === 'ENG' ? item.metadata.en.title : item.metadata.ind.title;
       return text;
    }).join('\n\n');
    navigator.clipboard.writeText(allText);
    setCopiedId('ALL');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col gap-0 bg-white rounded-lg shadow-sm border border-blue-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-blue-50 border-b border-blue-100">
         <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wide">
            Generated Prompts ({items.length})
         </h3>
         <div className="flex gap-2">
            <button 
            onClick={handleCopyAll}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 rounded text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors uppercase"
            >
            {copiedId === 'ALL' ? <CheckCircle size={14} /> : <Copy size={14} />}
            {copiedId === 'ALL' ? 'Copied All' : 'Copy All'}
            </button>
         </div>
      </div>

      {/* List */}
      <div className="flex flex-col divide-y divide-gray-100">
         {items.map((item, index) => {
            const lang = getLanguage(item.id);
            const text = lang === 'ENG' ? item.metadata.en.title : item.metadata.ind.title;
            const isJson = text.trim().startsWith('{') && text.trim().endsWith('}');

            return (
               // Reduced fixed height to 140px
               <div key={item.id} className="flex gap-3 p-4 hover:bg-gray-50 transition-colors group h-[140px]">
                  {/* Row Number */}
                  <div className="shrink-0 w-8 flex items-start justify-center pt-1">
                     <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded text-xs font-bold text-gray-500">
                       {index + 1}
                     </div>
                  </div>

                  {/* Content - Vertical Scroll Only */}
                  <div className="flex-1 min-w-0 h-full">
                     <div className={`h-full rounded border overflow-hidden flex flex-col ${isJson ? 'bg-gray-50 border-gray-200 font-mono text-xs' : 'bg-white border-gray-100'}`}>
                        {isJson && <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase p-1.5 border-b border-gray-200 bg-gray-50 shrink-0"><Code size={10} /> JSON Output</div>}
                        
                        {/* 
                           Scrollable Text Area 
                           break-words & whitespace-pre-wrap ensures vertical flow (no horizontal scroll)
                        */}
                        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 p-2 break-words whitespace-pre-wrap">
                            <p className={`text-sm text-gray-800 ${isJson ? '' : 'font-medium'}`}>
                                {text || <span className="text-gray-400 italic">No content generated.</span>}
                            </p>
                        </div>
                     </div>
                  </div>

                  {/* Actions - Square Buttons Column */}
                  <div className="flex flex-col justify-center items-center shrink-0 gap-2 h-full w-[40px]">
                     {/* Square Buttons (w-9 h-9) */}
                     <button 
                        onClick={() => handleCopy(text, item.id)}
                        className={`w-9 h-9 flex items-center justify-center rounded border transition-colors ${
                           copiedId === item.id 
                                ? 'bg-green-50 border-green-200 text-green-600' 
                                : 'bg-white border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200'
                        }`}
                        title="Copy Prompt"
                     >
                        {copiedId === item.id ? <CheckCircle size={16} /> : <Copy size={16} />}
                     </button>
                     
                     <button 
                        onClick={() => onToggleLanguage(item.id)}
                        className={`w-9 h-9 flex items-center justify-center rounded border transition-colors ${
                            lang === 'ENG' 
                                ? 'bg-blue-50 text-blue-600 border-blue-200' 
                                : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        }`}
                        title="Toggle Language"
                     >
                        <Languages size={16} />
                     </button>

                     <button 
                        onClick={() => onDelete(item.id)}
                        className="w-9 h-9 flex items-center justify-center rounded border bg-white border-gray-200 text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors"
                        title="Delete"
                     >
                        <Trash2 size={16} />
                     </button>
                  </div>
               </div>
            );
         })}
      </div>
    </div>
  );
};

export default memo(PromptListComponent);
