
import React, { useState, useEffect, memo } from 'react';
import { Edit2, Check, Languages, Trash2, Loader2, RefreshCw, Copy, CheckCircle } from 'lucide-react';
import { FileItem, Language, ProcessingStatus } from '../types';

interface Props {
  item: FileItem;
  onDelete: (id: string) => void;
  onUpdate: (id: string, field: 'title' | 'keywords', value: string, language: Language) => void;
  onRetry: (id: string) => void;
  language: Language;
  onToggleLanguage: (id: string) => void;
  disabled: boolean;
}

const IdeaCard: React.FC<Props> = ({
  item,
  onDelete,
  onUpdate,
  onRetry,
  language,
  onToggleLanguage,
  disabled
}) => {
  // === SAFETY GUARD CLAUSE (Mencegah Layar Putih) ===
  // Jika item atau metadata tidak ada, JANGAN RENDER APAPUN (return null)
  // Ini mencegah error "cannot read property of undefined" saat render cepat.
  if (!item || !item.metadata || !item.metadata.en || !item.metadata.ind) {
      return null; 
  }

  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Local state for edits
  const [editTitle, setEditTitle] = useState('');
  const [editVisual, setEditVisual] = useState('');
  const [editKeywords, setEditKeywords] = useState('');

  const safeEn = item.metadata.en;
  const safeInd = item.metadata.ind;

  const rawTitle = language === 'ENG' ? safeEn.title : safeInd.title;
  const rawKeywords = language === 'ENG' ? safeEn.keywords : safeInd.keywords;

  // SAFETY: Handle splitting to avoid undefined errors
  const parts = (rawTitle || "").split('|||');
  const titleDisplay = parts[0] ? parts[0].trim() : "";
  const visualDisplay = parts[1] ? parts[1].trim() : "";

  useEffect(() => {
    setEditTitle(titleDisplay || "");
    setEditVisual(visualDisplay || "");
    setEditKeywords(rawKeywords || "");
  }, [rawTitle, rawKeywords, isEditing]);

  const toggleEdit = () => {
    if (isEditing) {
      // Save logic: Reconstruct the "Title ||| Visual" string
      const newCombinedTitle = `${editTitle} ||| ${editVisual}`;
      
      if (newCombinedTitle !== rawTitle) {
        onUpdate(item.id, 'title', newCombinedTitle, language);
      }
      if (editKeywords !== rawKeywords) {
        onUpdate(item.id, 'keywords', editKeywords, language);
      }
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  const handleCopyTitle = () => {
    if (titleDisplay) {
      navigator.clipboard.writeText(titleDisplay);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isCompleted = item.status === ProcessingStatus.Completed;
  const isProcessing = item.status === ProcessingStatus.Processing;
  const isFailed = item.status === ProcessingStatus.Failed;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-blue-200 flex flex-col overflow-hidden relative group hover:shadow-md transition-shadow h-[220px]">
      
      {/* 1. TOP TOOLBAR - Matched style with FileCard (using Blue theme) */}
      <div className="grid grid-cols-4 gap-2 p-2 bg-blue-50/50 border-b border-blue-100 shrink-0">
        
        {/* Copy Button */}
        <button 
          onClick={handleCopyTitle}
          disabled={!titleDisplay}
          className={`flex flex-row items-center justify-center gap-2 py-1.5 rounded border transition-colors ${
            copied 
              ? 'bg-green-100 border-green-300 text-green-700' 
              : 'bg-white border-blue-200 text-blue-600 hover:bg-blue-100'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title="Copy Title"
        >
          {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
          <span className="text-[10px] font-bold uppercase tracking-tight truncate">{copied ? 'Copied' : 'Copy'}</span>
        </button>

        {/* Edit Button */}
        <button 
          onClick={toggleEdit} 
          disabled={disabled || !isCompleted}
          className={`flex flex-row items-center justify-center gap-2 py-1.5 rounded border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isEditing 
              ? 'bg-green-100 border-green-300 text-green-700' 
              : 'bg-white border-blue-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          {isEditing ? <Check size={14} /> : <Edit2 size={14} />}
          <span className="text-[10px] font-bold uppercase tracking-tight truncate">{isEditing ? 'Save' : 'Edit'}</span>
        </button>

        {/* Language Button */}
        <button 
           onClick={() => !isEditing && onToggleLanguage(item.id)} 
           disabled={isEditing || disabled || !isCompleted}
           className={`flex flex-row items-center justify-center gap-2 py-1.5 rounded border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
             language === 'ENG' 
               ? 'bg-blue-50 text-blue-600 border-blue-200' 
               : 'bg-emerald-50 text-emerald-600 border-emerald-200'
           } hover:brightness-95`}
        >
           <Languages size={14} />
           <span className="text-[10px] font-bold uppercase tracking-tight truncate">{language}</span>
        </button>

        {/* Delete Button */}
        <button 
          onClick={() => onDelete(item.id)} 
          disabled={disabled}
          className="flex flex-row items-center justify-center gap-2 py-1.5 rounded border bg-white border-blue-200 text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 size={14} />
          <span className="text-[10px] font-bold uppercase tracking-tight truncate">Delete</span>
        </button>
      </div>

      {/* 2. BODY CONTENT (New Compact Structure) */}
      <div className="flex-1 flex flex-col p-3 bg-white relative overflow-hidden gap-1">
         
         {/* Status / Loading Overlay */}
         {(isProcessing || isFailed) && (
             <div className="absolute inset-0 z-20 bg-white/90 flex flex-col items-center justify-center">
                {isProcessing && <Loader2 className="animate-spin text-blue-500" size={24} />}
                {isFailed && (
                  <button onClick={() => onRetry(item.id)} title="Retry" className="text-red-500 hover:text-red-700">
                    <RefreshCw size={24} />
                    <span className="text-xs font-bold block mt-1">Retry</span>
                  </button>
                )}
             </div>
         )}

         {/* --- 1. TITLE (Bold) --- */}
         <div className="shrink-0 mb-1">
            {isEditing ? (
                <textarea
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full text-sm font-bold border border-blue-300 rounded p-1 resize-none bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  placeholder="Title..."
                  rows={2}
                  spellCheck={false}
                />
            ) : (
                <h3 className="text-sm font-bold text-gray-900 leading-tight line-clamp-2" title={titleDisplay}>
                   {titleDisplay || "Waiting for Idea..."}
                </h3>
            )}
         </div>

         {/* --- 2. VISUAL CONCEPT (Middle) --- */}
         <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 border-b border-gray-100 pb-2 mb-2">
            {isEditing ? (
                 <textarea
                   value={editVisual}
                   onChange={(e) => setEditVisual(e.target.value)}
                   className="w-full h-full text-xs border border-cyan-300 rounded p-1 resize-none bg-white focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                   placeholder="Visual Description..."
                   spellCheck={false}
                 />
            ) : (
                 <p className="text-xs text-gray-700 leading-relaxed font-medium">
                    {visualDisplay || "Visual description will appear here..."}
                 </p>
            )}
         </div>

         {/* --- 3. TAGS (Bottom, Small, Gray) --- */}
         <div className="shrink-0">
            {isEditing ? (
                 <textarea
                   value={editKeywords}
                   onChange={(e) => setEditKeywords(e.target.value)}
                   className="w-full text-[10px] border border-gray-300 rounded p-1 resize-none bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none text-gray-500"
                   placeholder="Keywords..."
                   rows={1}
                   spellCheck={false}
                 />
            ) : (
                 <p className="text-[10px] text-gray-500 leading-tight truncate">
                    {rawKeywords || "Keywords..."}
                 </p>
            )}
         </div>

      </div>
    </div>
  );
};

export default memo(IdeaCard);
