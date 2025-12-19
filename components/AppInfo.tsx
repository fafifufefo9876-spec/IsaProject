import React from 'react';
import { Key, Lightbulb, Command, Database, Info, Activity, ShieldAlert, Heart, Coffee, ChevronRight, Lock, MessageSquare } from 'lucide-react';
import { AppMode } from '../types';

interface Props {
  onNavigate: (tab: AppMode | 'logs' | 'apikeys') => void;
  isProcessing: boolean;
  processingMode: AppMode | null;
}

const AppInfo: React.FC<Props> = ({ onNavigate, isProcessing, processingMode }) => {
  const scrollContainerClass = "w-full h-[280px] border border-blue-200 rounded-lg bg-white p-3 text-xs text-gray-600 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 shadow-inner leading-relaxed";
  
  const buttonClass = "px-3 py-1 bg-white border border-blue-200 rounded text-[10px] font-bold text-blue-600 hover:bg-blue-50 transition-colors uppercase shadow-sm flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200";

  const isLocked = (target: AppMode | 'apikeys' | 'logs') => {
      if (!isProcessing) return false;
      if (target === processingMode) return false;
      return true;
  };

  const getButtonContent = (label: string, locked: boolean) => (
      <>
        {locked ? <Lock size={12} /> : label}
        {!locked && <ChevronRight size={12} />}
      </>
  );

  return (
    <div className="w-full flex flex-col gap-6 pb-10">
      
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-center gap-3 shadow-sm">
        <div className="p-2.5 bg-white text-blue-600 rounded-full border border-blue-100 shadow-sm">
            <Info size={24} />
        </div>
        <div>
            <h2 className="text-base font-bold text-blue-900">IsaProject Tools Information</h2>
            <p className="text-[11px] text-blue-600 font-medium">Detailed guides and operational instructions.</p>
        </div>
      </div>

      <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex flex-col gap-3 shadow-sm relative overflow-hidden">
         <div className="flex items-center gap-2 text-red-700 font-bold uppercase text-xs tracking-wider z-10 border-b border-red-200 pb-2">
             <ShieldAlert size={16} /> 
             <span>LEGAL NOTICE & WARNING</span>
         </div>
         
         <div className="text-xs text-red-800 leading-relaxed font-medium z-10 space-y-2">
            <p>
               Tools ini didistribusikan secara <span className="font-extrabold underline">100% GRATIS</span>. Anda tidak dikenakan biaya apapun untuk menggunakan seluruh fitur yang tersedia.
            </p>
            <p>
               Dilarang keras memperjualbelikan tools atau kode sumber ini untuk keuntungan pribadi. Segala bentuk komersialisasi tanpa izin adalah tindakan <span className="font-extrabold">ILEGAL</span> dan melanggar hukum.
            </p>
         </div>

         <div className="mt-1 pt-3 border-t border-red-200 flex items-center gap-1.5 text-[11px] text-red-800 font-bold z-10 opacity-90">
            <span>© 2025 Isa Rahmat Sobirin. All rights reserved.</span>
         </div>

         <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none">
            <ShieldAlert size={100} />
         </div>
      </div>

      <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 flex flex-col gap-4 shadow-sm">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-white text-orange-600 rounded-lg border border-orange-100 shadow-sm shrink-0">
                <Coffee size={20} />
            </div>
            <div>
                <h3 className="text-sm font-bold text-orange-800 uppercase tracking-wide">Dukung Pengembangan</h3>
                <p className="text-xs text-orange-700 font-medium">Bantu kami menjaga tools ini tetap gratis.</p>
            </div>
        </div>
        <a 
            href="https://lynk.id/isaproject/0581ez0729vx" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="w-full px-6 py-2.5 bg-white text-orange-700 font-bold text-xs uppercase tracking-wide rounded-lg border border-orange-200 hover:bg-orange-50 hover:border-orange-300 transition-all shadow-sm flex items-center justify-center gap-2 whitespace-nowrap active:scale-95"
        >
            <Heart size={14} className="text-orange-500 fill-orange-500" />
            lynk.id/isaproject/support
        </a>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-bold text-blue-800 uppercase tracking-wide">
                <Key size={16} className="text-blue-500" />
                <span>API Keys</span>
            </div>
            <button 
                onClick={() => onNavigate('apikeys')} 
                disabled={isLocked('apikeys')}
                className={buttonClass}
            >
               {getButtonContent('Open Settings', isLocked('apikeys'))}
            </button>
        </div>
        <div className={scrollContainerClass}>
            <p>Untuk menggunakan IsaProject, Anda memerlukan API Key dari Google Gemini. Anda dapat mendapatkan kunci tersebut secara gratis di Google AI Studio.</p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-bold text-blue-800 uppercase tracking-wide">
                <Lightbulb size={16} className="text-blue-500" />
                <span>Idea Generation</span>
            </div>
            <button 
                onClick={() => onNavigate('idea')} 
                disabled={isLocked('idea')}
                className={buttonClass}
            >
               {getButtonContent('Open Workspace', isLocked('idea'))}
            </button>
        </div>
        <div className={scrollContainerClass}>
            <p>Fitur ini membantu Anda menemukan ide konten stok yang unik berdasarkan kategori yang dipilih atau input kustom Anda.</p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-bold text-blue-800 uppercase tracking-wide">
                <Command size={16} className="text-blue-500" />
                <span>Prompt Engineering</span>
            </div>
            <button 
                onClick={() => onNavigate('prompt')} 
                disabled={isLocked('prompt')}
                className={buttonClass}
            >
               {getButtonContent('Open Workspace', isLocked('prompt'))}
            </button>
        </div>
        <div className={scrollContainerClass}>
            <p>Menghasilkan prompt gambar berkualitas tinggi untuk AI Image Generator seperti Midjourney atau Flux.</p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-bold text-blue-800 uppercase tracking-wide">
                <Database size={16} className="text-blue-500" />
                <span>Metadata Extraction</span>
            </div>
            <button 
                onClick={() => onNavigate('metadata')} 
                disabled={isLocked('metadata')}
                className={buttonClass}
            >
               {getButtonContent('Open Workspace', isLocked('metadata'))}
            </button>
        </div>
        <div className={scrollContainerClass}>
            <p>Ekstrak metadata (Judul, Keyword, Kategori) langsung dari file gambar atau video Anda secara otomatis.</p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-bold text-blue-800 uppercase tracking-wide">
                <MessageSquare size={16} className="text-blue-500" />
                <span>AI Chat Assistant</span>
            </div>
            <button 
                onClick={() => onNavigate('chat')} 
                disabled={isLocked('chat')}
                className={buttonClass}
            >
               {getButtonContent('Open Chat', isLocked('chat'))}
            </button>
        </div>
        <div className={scrollContainerClass}>
            <p>Asisten cerdas untuk membantu Anda membuat ide, memperbaiki prompt, dan menjawab pertanyaan seputar penggunaan aplikasi IsaProject secara interaktif.</p>
        </div>
      </div>

       <div>
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-bold text-blue-800 uppercase tracking-wide">
                <Activity size={16} className="text-blue-500" />
                <span>System Logs</span>
            </div>
            <button 
                onClick={() => onNavigate('logs')} 
                disabled={isLocked('logs')}
                className={buttonClass}
            >
               {getButtonContent('Open Logs', isLocked('logs'))}
            </button>
        </div>
        <div className={scrollContainerClass}>
            <p>Pantau aktivitas sistem secara real-time untuk melihat proses pengerjaan metadata atau kendala teknis.</p>
        </div>
      </div>

    </div>
  );
};

export default AppInfo;