
import React, { memo, useState } from 'react';
import { Copy, CheckCircle, AlertTriangle } from 'lucide-react';
import { FileItem } from '../types';
import { isNSFW } from '../utils/helpers';

interface Props {
  items: FileItem[];
}

const IdeaListComponent: React.FC<Props> = ({ items }) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAll = () => {
    const allText = items.map(item => {
       const rowId = item.sourceData?.id || 0;
       // Safety check: ensure metadata.en exists
       const text = item.metadata?.en?.title || "";
       const nsfw = isNSFW(text);
       return `${rowId}. ${nsfw ? "--- Content Hidden (NSFW) ---" : text}`;
    }).join('\n');
    navigator.clipboard.writeText(allText);
    setCopiedId('ALL');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col gap-0 bg-white rounded-lg shadow-sm border border-blue-200 overflow-hidden h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-blue-50 border-b border-blue-100 shrink-0">
         <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wide">
            Extracted Links ({items.length})
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

      {/* List - Scrollable Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
          <div className="flex flex-col divide-y divide-gray-100">
             {items.map((item) => {
                const rowId = item.sourceData?.id || 0;
                // Safety check for rendering
                const text = item.metadata?.en?.title || "";
                const nsfw = isNSFW(text);

                return (
                   <div key={item.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors group">
                      {/* Row Number */}
                      <div className="shrink-0 w-8 h-8 flex items-center justify-center bg-gray-100 rounded text-xs font-bold text-gray-500">
                         {rowId}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                         {nsfw ? (
                            <div className="flex items-center gap-2 text-red-500 bg-red-50 px-2 py-1 rounded w-fit">
                               <AlertTriangle size={14} />
                               <span className="text-xs font-bold uppercase tracking-wide">Vulgar Link Detected</span>
                            </div>
                         ) : (
                            <p className="text-sm text-gray-800 font-medium truncate">{text}</p>
                         )}
                      </div>

                      {/* Action */}
                      <button 
                        onClick={() => handleCopy(nsfw ? "Content Hidden" : text, item.id)}
                        disabled={nsfw}
                        className={`shrink-0 p-2 rounded border transition-colors ${
                           nsfw 
                             ? 'opacity-20 cursor-not-allowed border-transparent'
                             : copiedId === item.id 
                                ? 'bg-green-50 border-green-200 text-green-600' 
                                : 'bg-white border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200'
                        }`}
                        title="Copy Text"
                      >
                         {copiedId === item.id ? <CheckCircle size={16} /> : <Copy size={16} />}
                      </button>
                   </div>
                );
             })}
          </div>
      </div>
    </div>
  );
};

export default memo(IdeaListComponent);
