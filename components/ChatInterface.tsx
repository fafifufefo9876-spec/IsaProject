
import React, { useState, useEffect, useRef } from 'react';
import { Send, Trash2, Loader2, MessageSquare, Plus, History, X, Edit2, Copy, Check, MoreVertical, Bot, AlertTriangle } from 'lucide-react';
import { ChatMessage, ChatSession } from '../types';
import SimpleMarkdown from './SimpleMarkdown';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  currentSessionId: string | null;
  sessions: ChatSession[];
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onNewSession: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newName: string) => void;
  onEditMessage: (messageId: string, newText: string) => void;
  onDeleteAllSessions: () => void;
  isProcessing: boolean;
}

const MESSAGE_LIMIT = 50; 

const TypingEffect = ({ text, onComplete }: { text: string; onComplete?: () => void }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    let index = 0;
    const intervalId = setInterval(() => {
      const chunk = text.slice(index, index + 3);
      setDisplayedText((prev) => prev + chunk);
      index += 3;
      if (index >= text.length) {
        clearInterval(intervalId);
        setDisplayedText(text);
        if (onComplete) onComplete();
      }
    }, 10);
    return () => clearInterval(intervalId);
  }, [text]);

  return <SimpleMarkdown text={displayedText} />;
};

const ChatInterface: React.FC<Props> = ({ 
  currentSessionId,
  sessions,
  messages, 
  onSendMessage, 
  onNewSession,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
  onEditMessage,
  onDeleteAllSessions,
  isProcessing 
}) => {
  const [inputText, setInputText] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editInputText, setEditInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [animatedMessageIds, setAnimatedMessageIds] = useState<Set<string>>(new Set());
  
  // Confirmation state for clearing all history
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing, editingMessageId]); 

  const handleSend = () => {
    if (!inputText.trim() || isProcessing) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setActiveMenuId(null);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const startEdit = (msg: ChatMessage) => {
      setEditingMessageId(msg.id);
      setEditInputText(msg.content);
      setActiveMenuId(null);
  };

  const saveEdit = () => {
      if (editingMessageId && editInputText.trim()) {
          onEditMessage(editingMessageId, editInputText);
          setEditingMessageId(null);
          setEditInputText('');
      } else {
          setEditingMessageId(null);
      }
  };

  const toggleMenu = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setActiveMenuId(activeMenuId === id ? null : id);
  };

  const sortedSessions = [...sessions].sort((a, b) => b.lastModified - a.lastModified);
  const currentSession = sessions.find(s => s.id === currentSessionId);
  const msgCount = messages.length;

  const markMessageAsAnimated = (id: string) => {
      setAnimatedMessageIds(prev => new Set(prev).add(id));
  };

  const handleConfirmClear = () => {
    onDeleteAllSessions();
    setShowClearConfirm(false);
  };

  const ActionMenu = ({ msg, isUser }: { msg: ChatMessage, isUser: boolean }) => {
      const isMenuOpen = activeMenuId === msg.id;
      
      return (
        <div className="relative flex items-center shrink-0">
            <button 
                onClick={(e) => toggleMenu(e, msg.id)}
                className={`p-1 rounded-full transition-colors ${isMenuOpen ? 'bg-gray-200 text-gray-700' : 'text-gray-400 hover:text-gray-600'}`}
                title="More options"
            >
                <MoreVertical size={18} />
            </button>

            {isMenuOpen && (
                <div 
                    ref={menuRef}
                    className={`absolute bottom-0 flex items-center gap-1 bg-white border border-gray-200 shadow-lg rounded-md p-1 z-50 animate-in fade-in zoom-in-95 duration-100 ${isUser ? 'left-full ml-1' : 'right-full mr-1'}`}
                >
                    {isUser && (
                        <button 
                            onClick={() => startEdit(msg)}
                            className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors text-gray-600"
                            disabled={isProcessing}
                        >
                            <Edit2 size={14} /> 
                        </button>
                    )}
                    <button 
                        onClick={() => handleCopy(msg.content, msg.id)}
                        className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors text-gray-600"
                    >
                        {copiedId === msg.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    </button>
                </div>
            )}
        </div>
      );
  };

  return (
    <div className="flex h-[calc(100vh-140px)] md:h-full bg-gray-100 rounded-lg shadow-sm border border-blue-200 overflow-hidden relative">
      
      {/* Sidebar History */}
      <div 
        ref={sidebarRef}
        className={`absolute md:relative z-20 h-full bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out ${
            isSidebarOpen ? 'w-52 translate-x-0 shadow-xl md:shadow-none' : 'w-0 -translate-x-full md:w-0 md:translate-x-0 overflow-hidden opacity-0 md:opacity-100'
        }`}
        style={{ width: isSidebarOpen ? '208px' : '0px' }}
      >
         <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider flex items-center gap-2">
                <History size={14} /> History ({sortedSessions.length})
            </h3>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-gray-600">
                <X size={16} />
            </button>
         </div>
         <div className="p-3 border-b border-gray-100">
            <button 
                onClick={() => { onNewSession(); if(window.innerWidth < 768) setIsSidebarOpen(false); }}
                disabled={isProcessing}
                className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
            >
                <Plus size={18} /> <span className="text-xs font-bold uppercase">New Chat</span>
            </button>
            <div className="mt-2 text-[10px] text-gray-400 text-center font-medium">
                Save 30 Chat History | 50 Chats/Page
            </div>
         </div>
         <div className="flex-1 overflow-y-auto px-2 pt-2">
            {sortedSessions.length === 0 ? (
                <div className="text-center mt-10 text-gray-400 text-xs italic">No history yet.</div>
            ) : (
                <div className="flex flex-col gap-1.5">
                    {sortedSessions.map(session => (
                        <div 
                            key={session.id}
                            className={`group flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors border ${
                                currentSessionId === session.id 
                                ? 'bg-blue-50 border-blue-200 text-blue-700' 
                                : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200 text-gray-700'
                            }`}
                            onClick={() => { onSelectSession(session.id); if(window.innerWidth < 768) setIsSidebarOpen(false); }}
                        >
                            <div className="flex items-center gap-2 overflow-hidden flex-1">
                                <MessageSquare size={14} className={`shrink-0 ${currentSessionId === session.id ? 'text-blue-500' : 'text-gray-400'}`} />
                                <span className="truncate font-medium">{session.name}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <button onClick={(e) => { e.stopPropagation(); setRenamingSessionId(session.id); setRenameInput(session.name); }} className="p-1 text-gray-400 hover:text-blue-500"><Edit2 size={10} /></button>
                                <button onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={10} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
         </div>
         
         {/* Persistent Clear All History button */}
         <div className="p-3 border-t border-gray-100 bg-gray-50">
            {showClearConfirm ? (
               <div className="flex flex-col gap-2 p-2 bg-red-50 rounded-lg border border-red-200 animate-in fade-in zoom-in-95 duration-200">
                  <p className="text-[10px] text-red-700 font-bold uppercase text-center flex items-center justify-center gap-1">
                     <AlertTriangle size={12} /> Delete All History?
                  </p>
                  <div className="flex gap-2">
                     <button 
                        onClick={() => setShowClearConfirm(false)}
                        className="flex-1 h-8 bg-white border border-gray-300 rounded text-[10px] font-bold text-gray-600 uppercase hover:bg-gray-50 transition-colors"
                     >
                        Cancel
                     </button>
                     <button 
                        onClick={handleConfirmClear}
                        className="flex-1 h-8 bg-red-600 text-white rounded text-[10px] font-bold uppercase hover:bg-red-700 transition-colors shadow-sm"
                     >
                        Confirm
                     </button>
                  </div>
               </div>
            ) : (
               <button 
                  onClick={() => setShowClearConfirm(true)} 
                  disabled={isProcessing || sortedSessions.length === 0} 
                  className={`w-full h-8 border rounded flex items-center justify-center gap-2 text-[10px] font-bold uppercase transition-colors ${
                     sortedSessions.length === 0 
                     ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed' 
                     : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                  }`}
               >
                  <Trash2 size={12} /> Clear All History
               </button>
            )}
         </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white relative">
        <div className="p-3 bg-white border-b border-blue-100 flex justify-between items-center shrink-0 shadow-sm z-10 h-16">
            <div className="flex items-center gap-3">
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`h-9 w-9 flex items-center justify-center rounded-lg transition-colors ${isSidebarOpen ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}><History size={18} /></button>
                <div className="flex flex-col min-w-0">
                    <h2 className="font-bold text-sm text-gray-800 uppercase tracking-wide truncate max-w-[200px]">{currentSession?.name || "New Conversation"}</h2>
                    <span className="text-[10px] text-gray-400 font-medium">{isProcessing ? 'AI is typing...' : `Messages: ${msgCount} / ${MESSAGE_LIMIT}`}</span>
                </div>
            </div>
            <button onClick={onNewSession} className="h-9 w-9 flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-200 rounded-lg shadow-sm"><Plus size={20} /></button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-3 scrollbar-thin scrollbar-thumb-gray-200 bg-slate-50/50">
            {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4 opacity-60">
                    <Bot size={48} className="text-blue-300" />
                    <div className="text-center"><p className="text-base font-bold">IsaProject Assistant</p><p className="text-xs">Start a conversation to get started.</p></div>
                </div>
            ) : (
                messages.map((msg, index) => {
                    const isLast = index === messages.length - 1;
                    const shouldAnimate = msg.role === 'assistant' && isLast && !isProcessing && !animatedMessageIds.has(msg.id);
                    const isUser = msg.role === 'user';

                    return (
                        <div key={msg.id} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex items-end gap-1.5 max-w-[98%]`}>
                                {isUser && editingMessageId !== msg.id && (
                                    <ActionMenu msg={msg} isUser={true} />
                                )}
                                <div className={`rounded-lg px-4 py-2 text-sm shadow-sm relative leading-relaxed overflow-hidden ${
                                        isUser ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                                    }`}
                                >
                                    {editingMessageId === msg.id ? (
                                        <div className="flex flex-col gap-2 min-w-[250px]">
                                            <textarea className="w-full bg-black/10 border border-white/30 rounded p-2 text-inherit focus:outline-none resize-none" value={editInputText} onChange={(e) => setEditInputText(e.target.value)} autoFocus />
                                            <div className="flex justify-end gap-2"><button onClick={() => setEditingMessageId(null)} className="px-2 py-1 text-xs bg-black/20 rounded">Cancel</button><button onClick={saveEdit} className="px-2 py-1 text-xs bg-white text-blue-600 font-bold rounded">Save</button></div>
                                        </div>
                                    ) : (
                                        shouldAnimate ? <TypingEffect text={msg.content} onComplete={() => markMessageAsAnimated(msg.id)} /> : <SimpleMarkdown text={msg.content} />
                                    )}
                                </div>
                                {!isUser && editingMessageId !== msg.id && (
                                    <ActionMenu msg={msg} isUser={false} />
                                )}
                            </div>
                        </div>
                    );
                })
            )}
            
            {isProcessing && (
                <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 rounded-lg rounded-tl-none px-4 py-2 shadow-sm flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></span>
                    </div>
                </div>
            )}
        </div>

        <div className="p-3 bg-white border-t border-gray-200 shrink-0 z-10">
            <div className={`relative flex items-end gap-2 border rounded-xl p-2 transition-all ${isProcessing ? 'bg-gray-50' : 'bg-gray-50 border-gray-300 focus-within:bg-white'}`}>
                <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="w-full max-h-[150px] min-h-[44px] py-2.5 px-2 bg-transparent border-none focus:ring-0 resize-none text-sm text-gray-800 scrollbar-thin"
                    rows={1}
                    disabled={isProcessing}
                />
                <button
                    onClick={handleSend}
                    disabled={!inputText.trim() || isProcessing}
                    className="mb-1 p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-200 transition-all shadow-md active:scale-95"
                >
                    {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
            </div>
            <div className="text-[10px] text-center text-gray-400 mt-2 font-medium">AI generated content can be inaccurate.</div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
