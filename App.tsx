import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Download, Trash2, Wand2, UploadCloud, FolderOutput, FilePlus, CheckCircle, AlertCircle, Circle, Database, Activity, Coffee, FolderPlus, Sparkles, Eraser, Lightbulb, Command, Filter, Lock, Key, Menu, ChevronRight, Info, Check, MessageSquare } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

import ApiKeyPanel from './components/ApiKeyPanel';
import MetadataSettings from './components/MetadataSettings';
import IdeaSettings from './components/IdeaSettings';
import PromptSettings from './components/PromptSettings';
import AppInfo from './components/AppInfo'; 
import FileCard from './components/FileCard';
import IdeaCard from './components/IdeaCard'; 
import IdeaListComponent from './components/IdeaListComponent'; 
import PromptListComponent from './components/PromptListComponent';
import PreviewModal from './components/PreviewModal';
import ChatInterface from './components/ChatInterface'; 
import { generateMetadataForFile, translateMetadataContent, generateChatResponse } from './services/geminiService';
import { downloadCSV, downloadTXT, extractSlugFromUrl } from './utils/helpers';
import { AppSettings, FileItem, FileType, ProcessingStatus, Language, AppMode, ApiProvider, ChatMessage, ChatSession } from './types';
import { INITIAL_METADATA } from './constants';

interface LogEntry {
  id: string;
  time: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
  mode?: AppMode | 'system'; 
}

type LogFilter = 'ALL' | AppMode;

type ApiKeyMap = Record<ApiProvider, string[]>;

const CHAT_MESSAGE_LIMIT = 50; 
const CHAT_SESSION_LIMIT = 30; 
const SUPPORT_LINK = "https://lynk.id/isaproject/0581ez0729vx";

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppMode | 'logs' | 'apikeys' | 'info'>('info');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logFilter, setLogFilter] = useState<LogFilter>('ALL');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(() => {
      try {
          const saved = localStorage.getItem('ISA_CHAT_SESSIONS');
          if (saved) {
              return JSON.parse(saved);
          }
          return [];
      } catch (e) { return []; }
  });
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const [apiKeysMap, setApiKeysMap] = useState<ApiKeyMap>(() => {
    try {
      const saved = localStorage.getItem('ISA_API_KEYS');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
            return { GEMINI: parsed, OPENAI: [], GROQ: [], CUSTOM: [] };
        }
        return {
            GEMINI: parsed.GEMINI || [],
            OPENAI: parsed.OPENAI || [],
            GROQ: parsed.GROQ || [],
            CUSTOM: parsed.CUSTOM || []
        };
      }
      return { GEMINI: [], OPENAI: [], GROQ: [], CUSTOM: [] };
    } catch (e) {
      return { GEMINI: [], OPENAI: [], GROQ: [], CUSTOM: [] };
    }
  });

  const [isPaidUnlocked, setIsPaidUnlocked] = useState(false);

  const [settings, setSettings] = useState<AppSettings>({
    apiProvider: 'GEMINI',
    geminiModel: 'gemini-3-flash-preview',
    openaiModel: 'gpt-4o',
    groqModel: 'openai/gpt-oss-120b', 
    customBaseUrl: '',
    customModel: '',
    customTitle: '',
    customKeyword: '',
    titleMin: 50, 
    titleMax: 100,
    slideKeyword: 40,
    workerCount: 10,
    ideaMode: 'free', 
    ideaQuantity: 30, 
    ideaCategory: 'auto',
    ideaCustomInput: '',
    ideaCustomInstruction: '', 
    ideaFromRow: 0, 
    ideaBatchSize: 0, 
    ideaSourceLines: [],
    ideaSourceFiles: [], 
    promptIdea: '',
    promptDescription: '',
    promptQuantity: 30,
    promptJsonOutput: false,
    promptPlatform: 'Photo/Image', 
    selectedFileType: FileType.Image,
    csvFilename: '',
    outputFormat: 'csv',
  });
  
  const [filesMap, setFilesMap] = useState<Record<AppMode, FileItem[]>>({
    metadata: [],
    idea: [],
    prompt: [],
    chat: []
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMode, setProcessingMode] = useState<AppMode | null>(null);
  const [previewItem, setPreviewItem] = useState<FileItem | null>(null);
  const [fileLanguages, setFileLanguages] = useState<Record<string, Language>>({});

  const processingRef = useRef(false);
  const activeWorkersRef = useRef(0);
  const queueRef = useRef<string[]>([]);
  const activeKeysRef = useRef<Set<string>>(new Set());
  const cooldownKeysRef = useRef<Map<string, number>>(new Map());
  const nextKeyIdxRef = useRef(0);
  
  const processingFilesRef = useRef<FileItem[]>([]); 

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  
  const sidebarContentRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  const activeMode: AppMode = (activeTab === 'logs' || activeTab === 'apikeys' || activeTab === 'info') ? 'metadata' : activeTab;
  const currentFiles = filesMap[activeMode] || [];
  const currentProviderKeys = apiKeysMap[settings.apiProvider] || [];
  const [hasHistory, setHasHistory] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    const savedIdeaHistory = localStorage.getItem('ISA_LAST_IDEA_BATCH');
    if (savedIdeaHistory) setHasHistory(true);

    try {
        const savedPromptHistory = localStorage.getItem('ISA_LAST_PROMPT_BATCH');
        if (savedPromptHistory) {
            const parsed = JSON.parse(savedPromptHistory);
            const restoredFiles: FileItem[] = parsed.map((item: any) => ({
                ...item,
                file: new File([""], item.file?.name || "restored_prompt", { type: item.file?.type || 'text/plain' }),
            }));
            setFilesMap(prev => ({ ...prev, prompt: restoredFiles }));
        }
    } catch(e) { console.error("Failed to restore prompts", e); }
    
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearInterval(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('ISA_API_KEYS', JSON.stringify(apiKeysMap));
  }, [apiKeysMap]);

  useEffect(() => {
      localStorage.setItem('ISA_CHAT_SESSIONS', JSON.stringify(chatSessions));
  }, [chatSessions]);

  useEffect(() => {
    if (!isProcessing || !processingMode) return;
    if (processingMode === 'chat') return;

    const uiInterval = setInterval(() => {
        if (processingFilesRef.current) {
            setFilesMap(prev => ({
                ...prev,
                [processingMode]: [...processingFilesRef.current]
            }));
        }
    }, 500); 

    return () => clearInterval(uiInterval);
  }, [isProcessing, processingMode]);

  useLayoutEffect(() => {
    if (sidebarContentRef.current) sidebarContentRef.current.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    if (mainContentRef.current) mainContentRef.current.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [activeTab]);

  const handleNavigation = (tab: AppMode | 'logs' | 'apikeys' | 'info') => {
    setActiveTab(tab);
    setIsMenuOpen(false);
    window.scrollTo(0, 0);
  };

  const formatTime = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info', mode: AppMode | 'system' = 'system') => {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev, {
      id: uuidv4(),
      time: timeString,
      message,
      type,
      mode
    }]);
  };

  const handleClearLogs = () => {
    setLogs([]);
    addLog('Logs cleared by user.', 'info', 'system');
  };

  const handleUpdateCurrentProviderKeys = (newKeys: string[]) => {
    setApiKeysMap(prev => ({ ...prev, [settings.apiProvider]: newKeys }));
    nextKeyIdxRef.current = 0;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || activeTab === 'logs' || activeTab === 'apikeys' || activeTab === 'info' || activeTab === 'idea' || activeTab === 'prompt' || activeTab === 'chat') return;
    processFiles(e.target.files, activeTab);
    e.target.value = ''; 
  };

  const processFiles = (fileList: FileList, targetMode: AppMode) => {
    const count = fileList.length;
    addLog(`Uploaded ${count} files to ${targetMode.toUpperCase()}.`, 'info', targetMode);

    const newFiles: FileItem[] = Array.from(fileList)
      .filter(file => {
        if (settings.selectedFileType === FileType.Image) return file.type.startsWith('image/') && !file.type.includes('svg');
        if (settings.selectedFileType === FileType.Video) return file.type.startsWith('video/');
        if (settings.selectedFileType === FileType.Vector) {
          if (file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/gif') return false;
          const name = file.name.toLowerCase();
          return file.type === 'image/svg+xml' || file.type === 'application/pdf' || name.endsWith('.svg') || name.endsWith('.eps') || name.endsWith('.ai') || name.endsWith('.pdf');
        }
        return false;
      })
      .map((file: File) => ({
        id: uuidv4(),
        file,
        previewUrl: URL.createObjectURL(file), 
        type: settings.selectedFileType,
        status: ProcessingStatus.Pending,
        metadata: JSON.parse(JSON.stringify(INITIAL_METADATA)), 
      }));
      
    setFilesMap(prev => ({
      ...prev,
      [targetMode]: [...prev[targetMode], ...newFiles]
    }));
  };

  const handleClearAll = () => {
    if (activeTab === 'logs' || activeTab === 'apikeys' || activeTab === 'info' || activeTab === 'chat') return;
    const count = filesMap[activeTab].length;
    filesMap[activeTab].forEach(f => URL.revokeObjectURL(f.previewUrl));
    
    setFilesMap(prev => ({ ...prev, [activeTab]: [] }));
    setIsProcessing(false);
    setProcessingMode(null);
    processingRef.current = false;
    
    if (activeTab === 'idea') localStorage.removeItem('ISA_LAST_IDEA_BATCH');
    if (activeTab === 'prompt') localStorage.removeItem('ISA_LAST_PROMPT_BATCH');

    addLog(`Cleared all ${count} files from ${activeTab.toUpperCase()}.`, 'warning', activeTab);
  };

  const handleRestoreHistory = () => {
      try {
          const saved = localStorage.getItem('ISA_LAST_IDEA_BATCH');
          if (saved) {
              filesMap['idea'].forEach(f => URL.revokeObjectURL(f.previewUrl));
              const parsed = JSON.parse(saved);
              const restoredFiles: FileItem[] = parsed.map((item: any) => ({
                  ...item,
                  file: new File([""], item.file?.name || "restored_idea", { type: item.file?.type || 'text/plain' }),
                  status: ProcessingStatus.Completed 
              }));
              setFilesMap(prev => ({ ...prev, idea: restoredFiles }));
              addLog(`Restored ${restoredFiles.length} items from history.`, 'success', 'idea');
          }
      } catch (e) {
          console.error("Failed to restore history", e);
          addLog("Failed to restore history.", 'error', 'idea');
      }
  };

  const handleDelete = (id: string) => {
    if (activeTab === 'logs' || activeTab === 'apikeys' || activeTab === 'info' || activeTab === 'chat') return;
    const file = filesMap[activeTab].find(f => f.id === id);
    if (file && file.status === ProcessingStatus.Processing) {
        addLog("Cannot delete item while it is processing.", 'warning', activeTab);
        return;
    }
    if (file) {
      URL.revokeObjectURL(file.previewUrl);
      addLog(`Deleted file: ${file.file.name}`, 'warning', activeTab);
    }
    setFilesMap(prev => {
        const newState = {
            ...prev,
            [activeTab]: prev[activeTab].filter(f => f.id !== id)
        };
        if (activeTab === 'prompt') localStorage.setItem('ISA_LAST_PROMPT_BATCH', JSON.stringify(newState.prompt));
        if (activeTab === 'idea') localStorage.setItem('ISA_LAST_IDEA_BATCH', JSON.stringify(newState.idea));
        return newState;
    });
  };

  const handleUpdateMetadata = async (id: string, field: 'title' | 'keywords' | 'category', value: string, language: Language) => {
    if (activeTab === 'logs' || activeTab === 'apikeys' || activeTab === 'info' || activeTab === 'chat') return;
    const targetMode = activeTab;

    setFilesMap(prev => ({
      ...prev,
      [targetMode]: prev[targetMode].map(f => {
        if (f.id !== id) return f;
        const newMeta = { ...f.metadata };
        if (field === 'category') {
           newMeta.category = value; 
        } else {
           if (language === 'ENG') {
             newMeta.en = { ...newMeta.en, [field]: value };
           } else {
             newMeta.ind = { ...newMeta.ind, [field]: value };
           }
        }
        return { ...f, metadata: newMeta };
      })
    }));

    if (field === 'title' || field === 'keywords') {
      const file = filesMap[targetMode].find(f => f.id === id);
      if (!file || currentProviderKeys.length === 0) return;
      
      const apiKey = currentProviderKeys[Math.floor(Math.random() * currentProviderKeys.length)];
      try {
        const currentSourceMeta = language === 'ENG' 
          ? { ...file.metadata.en, [field]: value } 
          : { ...file.metadata.ind, [field]: value };
        
        const translated = await translateMetadataContent(currentSourceMeta, language, apiKey);
        
        setFilesMap(prev => ({
          ...prev,
          [targetMode]: prev[targetMode].map(f => {
            if (f.id !== id) return f;
            const newMeta = { ...f.metadata };
            if (language === 'ENG') {
              newMeta.ind = translated;
            } else {
              newMeta.en = translated;
            }
            return { ...f, metadata: newMeta };
          })
        }));
      } catch (error) {
        console.error("Sync translation failed", error);
      }
    }
  };

  const handleToggleLanguage = (id: string) => {
    setFileLanguages(prev => ({
      ...prev,
      [id]: prev[id] === 'IND' ? 'ENG' : 'IND'
    }));
  };

  const getLanguage = (id: string): Language => {
    return fileLanguages[id] || 'ENG';
  };

  const handleDownload = () => {
    if (activeTab === 'logs' || activeTab === 'apikeys' || activeTab === 'info' || activeTab === 'chat') return;
    let defaultBase = 'IsaMetadata';
    if (activeTab === 'idea') defaultBase = 'IsaIdea';
    if (activeTab === 'prompt') defaultBase = 'IsaPrompt';

    const filenameToUse = settings.csvFilename.trim() || defaultBase;
    const targetFiles = filesMap[activeTab];

    if ((activeTab === 'idea' || activeTab === 'prompt') && settings.outputFormat === 'txt') {
        const filename = downloadTXT(targetFiles, filenameToUse);
        addLog(`Downloaded TXT: ${filename}`, 'success', activeTab);
    } else {
        const filename = downloadCSV(targetFiles, filenameToUse);
        addLog(`Downloaded CSV: ${filename}`, 'success', activeTab);
    }
  };

  const updateSession = (sessionId: string, messages: ChatMessage[], newName?: string) => {
      setChatSessions(prev => {
          const updated = prev.map(s => {
              if (s.id === sessionId) {
                  return { 
                      ...s, 
                      messages, 
                      name: newName || s.name,
                      lastModified: Date.now() 
                  };
              }
              return s;
          });
          const sorted = updated.sort((a, b) => b.lastModified - a.lastModified);
          return sorted.slice(0, CHAT_SESSION_LIMIT);
      });
  };

  const handleNewSession = () => {
      const newSession: ChatSession = {
          id: uuidv4(),
          name: 'New Conversation',
          messages: [],
          lastModified: Date.now()
      };
      setChatSessions(prev => {
          const updated = [newSession, ...prev];
          return updated.slice(0, CHAT_SESSION_LIMIT);
      });
      setCurrentSessionId(newSession.id);
  };

  const handleRenameSession = (id: string, name: string) => {
      setChatSessions(prev => prev.map(s => s.id === id ? { ...s, name } : s));
  };

  const handleDeleteSession = (id: string) => {
      setChatSessions(prev => prev.filter(s => s.id !== id));
      if (currentSessionId === id) {
          setCurrentSessionId(null);
      }
  };

  const handleDeleteAllSessions = () => {
      setChatSessions([]);
      setCurrentSessionId(null);
      localStorage.removeItem('ISA_CHAT_SESSIONS');
      addLog('All chat history cleared.', 'warning', 'chat');
  };

  const handleSendMessage = async (text: string) => {
      if (!text.trim()) return;
      
      let sessionId = currentSessionId;
      let session = chatSessions.find(s => s.id === sessionId);
      
      if (!sessionId || !session) {
          const newSession: ChatSession = {
              id: uuidv4(),
              name: text.substring(0, 30) + (text.length > 30 ? '...' : ''),
              messages: [],
              lastModified: Date.now()
          };
          
          setChatSessions(prev => {
              const updated = [newSession, ...prev];
              return updated.slice(0, CHAT_SESSION_LIMIT);
          });
          
          setCurrentSessionId(newSession.id);
          session = newSession;
          sessionId = newSession.id;
      }

      const userMsg: ChatMessage = {
          id: uuidv4(),
          role: 'user',
          content: text,
          timestamp: new Date()
      };
      
      const rawMessages = [...session.messages, userMsg];
      const updatedMessages = rawMessages.length > CHAT_MESSAGE_LIMIT 
          ? rawMessages.slice(rawMessages.length - CHAT_MESSAGE_LIMIT) 
          : rawMessages;
      
      let updatedName = session.name;
      if (session.messages.length === 0) {
          updatedName = text.substring(0, 30) + (text.length > 30 ? '...' : '');
      }

      updateSession(sessionId, updatedMessages, updatedName);

      if (currentProviderKeys.length === 0) { 
          setTimeout(() => {
              const sysMsg: ChatMessage = {
                  id: uuidv4(),
                  role: 'assistant',
                  content: "👋 Hello! It seems you haven't configured your API Key yet.\n\nPlease go to **Menu > API Keys** and add a valid key to start chatting with me.",
                  timestamp: new Date()
              };
              
              setChatSessions(prev => prev.map(s => {
                  if (s.id === sessionId) {
                      const newMsgs = [...s.messages, sysMsg];
                      return { 
                          ...s, 
                          messages: newMsgs.length > CHAT_MESSAGE_LIMIT ? newMsgs.slice(newMsgs.length - CHAT_MESSAGE_LIMIT) : newMsgs, 
                          lastModified: Date.now() 
                      };
                  }
                  return s;
              }));
          }, 500);
          return; 
      }

      setIsProcessing(true);
      setProcessingMode('chat');
      
      try {
          const apiKey = currentProviderKeys[Math.floor(Math.random() * currentProviderKeys.length)];
          const responseText = await generateChatResponse(updatedMessages, text, settings, apiKey);
          
          const botMsg: ChatMessage = {
              id: uuidv4(),
              role: 'assistant',
              content: responseText,
              timestamp: new Date()
          };
          
          setChatSessions(prev => prev.map(s => {
              if (s.id === sessionId) {
                  const newMsgs = [...s.messages, botMsg];
                  return { 
                      ...s, 
                      messages: newMsgs.length > CHAT_MESSAGE_LIMIT ? newMsgs.slice(newMsgs.length - CHAT_MESSAGE_LIMIT) : newMsgs, 
                      lastModified: Date.now() 
                  };
              }
              return s;
          }));
          
      } catch (error: any) {
          const errorMsg: ChatMessage = {
              id: uuidv4(),
              role: 'assistant',
              content: `Error: ${error.message || "Failed to generate response."}`,
              timestamp: new Date()
          };
          setChatSessions(prev => prev.map(s => {
              if (s.id === sessionId) {
                  const newMsgs = [...s.messages, errorMsg];
                  return { 
                      ...s, 
                      messages: newMsgs.length > CHAT_MESSAGE_LIMIT ? newMsgs.slice(newMsgs.length - CHAT_MESSAGE_LIMIT) : newMsgs, 
                      lastModified: Date.now() 
                  };
              }
              return s;
          }));
      } finally {
          setIsProcessing(false);
          setProcessingMode(null);
      }
  };

  const handleEditMessage = async (messageId: string, newText: string) => {
      if (!currentSessionId) return;
      const session = chatSessions.find(s => s.id === currentSessionId);
      if (!session) return;

      const msgIndex = session.messages.findIndex(m => m.id === messageId);
      if (msgIndex === -1) return;

      const previousMessages = session.messages.slice(0, msgIndex);
      
      if (currentProviderKeys.length === 0) { alert("Please configure an API Key."); return; }

      const userMsg: ChatMessage = {
          id: uuidv4(),
          role: 'user',
          content: newText,
          timestamp: new Date()
      };

      const updatedMessages = [...previousMessages, userMsg];
      updateSession(currentSessionId, updatedMessages);

      setIsProcessing(true);
      setProcessingMode('chat');

      try {
          const apiKey = currentProviderKeys[Math.floor(Math.random() * currentProviderKeys.length)];
          const responseTextCorrected = await generateChatResponse(previousMessages, newText, settings, apiKey);

          const botMsg: ChatMessage = {
              id: uuidv4(),
              role: 'assistant',
              content: responseTextCorrected,
              timestamp: new Date()
          };

          setChatSessions(prev => prev.map(s => {
              if (s.id === currentSessionId) {
                  const newMsgs = [...updatedMessages, botMsg];
                  return { 
                      ...s, 
                      messages: newMsgs.length > CHAT_MESSAGE_LIMIT ? newMsgs.slice(newMsgs.length - CHAT_MESSAGE_LIMIT) : newMsgs,
                      lastModified: Date.now() 
                  };
              }
              return s;
          }));

      } catch (error: any) {
           const errorMsg: ChatMessage = {
              id: uuidv4(),
              role: 'assistant',
              content: `Error: ${error.message || "Failed to generate response."}`,
              timestamp: new Date()
          };
          setChatSessions(prev => prev.map(s => {
              if (s.id === currentSessionId) {
                  const newMsgs = [...updatedMessages, errorMsg];
                  return { 
                      ...s, 
                      messages: newMsgs.length > CHAT_MESSAGE_LIMIT ? newMsgs.slice(newMsgs.length - CHAT_MESSAGE_LIMIT) : newMsgs, 
                      lastModified: Date.now() 
                  };
              }
              return s;
          }));
      } finally {
          setIsProcessing(false);
          setProcessingMode(null);
      }
  };

  const startProcessing = () => {
    if (activeTab === 'logs' || activeTab === 'apikeys' || activeTab === 'info' || activeTab === 'chat') return;
    const currentMode = activeTab;

    if ((currentMode === 'idea' || currentMode === 'prompt') && filesMap[currentMode].length > 0) {
        const targetList = filesMap[currentMode];
        const targetFiles = targetList.filter(f => f.status === ProcessingStatus.Pending || f.status === ProcessingStatus.Failed);
        
        if (targetFiles.length > 0) {
           runQueue(targetFiles, currentMode);
        } else {
           const resetFiles = targetList.map(f => ({ ...f, status: ProcessingStatus.Pending, error: undefined }));
           setFilesMap(prev => ({ ...prev, [currentMode]: resetFiles }));
           runQueue(resetFiles, currentMode);
        }
        return;
    }

    if (currentMode === 'prompt') {
       if (currentProviderKeys.length === 0) { alert("Please enter at least one API Key."); return; }
       if (!settings.promptIdea) { alert("Please enter an Idea/Niche."); return; }
       if ((settings.promptQuantity || 0) <= 0) { alert("Quantity must be greater than 0."); return; }

       const virtualFiles: FileItem[] = [];
       const quantity = Math.min(50, settings.promptQuantity);

       for (let i = 0; i < quantity; i++) {
         virtualFiles.push({
           id: uuidv4(),
           file: new File([""], `Prompt_${i+1}`, { type: 'text/plain' }),
           previewUrl: "",
           type: FileType.Image,
           status: ProcessingStatus.Pending,
           metadata: JSON.parse(JSON.stringify(INITIAL_METADATA)),
           sourceData: { id: i + 1, originalTitle: settings.promptIdea, originalKeywords: settings.promptDescription }
         });
       }

       addLog(`Generated ${quantity} prompt slots. Idea: ${settings.promptIdea}`, 'info', 'prompt');
       setFilesMap(prev => ({ ...prev, prompt: virtualFiles }));
       runQueue(virtualFiles, currentMode);
       return;
    }

    if (currentMode === 'idea') {
      let virtualFiles: FileItem[] = [];

      if (settings.ideaMode === 'free') {
          if (currentProviderKeys.length === 0) { alert("Please enter at least one API Key."); return; }
          if (settings.ideaCategory === 'custom' && !settings.ideaCustomInput) { alert("Enter custom topic."); return; }

          const sourceFiles = settings.ideaSourceFiles || [];
          if (settings.ideaCategory === 'file' && sourceFiles.length === 0) { alert("Upload Image/Video files."); return; }
          
          let contextLabel = settings.ideaCategory === 'custom' ? settings.ideaCustomInput : settings.ideaCategory;
          const quantityPerItem = Math.min(50, Math.max(1, settings.ideaQuantity || 30)); 
          
          if (settings.ideaCategory === 'file' && sourceFiles.length > 0) {
              sourceFiles.forEach((file, fileIdx) => {
                 for (let i = 0; i < quantityPerItem; i++) {
                     let type = file.type.startsWith('video') ? FileType.Video : FileType.Image;
                     virtualFiles.push({
                         id: uuidv4(),
                         file: file, 
                         previewUrl: URL.createObjectURL(file),
                         type: type,
                         status: ProcessingStatus.Pending,
                         metadata: JSON.parse(JSON.stringify(INITIAL_METADATA)),
                         sourceData: { id: (fileIdx * quantityPerItem) + i + 1, originalTitle: `File: ${file.name}`, originalKeywords: settings.ideaCategory }
                      });
                 }
              });
          } else {
              for (let i = 0; i < quantityPerItem; i++) {
                 virtualFiles.push({
                     id: uuidv4(),
                     file: new File([""], `Idea_${i+1}`, { type: 'text/plain' }),
                     previewUrl: "",
                     type: FileType.Image,
                     status: ProcessingStatus.Pending,
                     metadata: JSON.parse(JSON.stringify(INITIAL_METADATA)),
                     sourceData: { id: i + 1, originalTitle: contextLabel, originalKeywords: settings.ideaCategory }
                  });
              }
          }
          setFilesMap(prev => ({ ...prev, idea: virtualFiles }));
          runQueue(virtualFiles, currentMode);
      } else {
          const from = settings.ideaFromRow || 1;
          const batchSize = settings.ideaBatchSize || 0; 
          const sourceLines = settings.ideaSourceLines || [];
          if (sourceLines.length === 0) { alert("Please upload a file."); return; }
          const slicedLines = sourceLines.slice(Math.max(0, from - 1), Math.min(sourceLines.length, Math.max(0, from - 1) + batchSize));
          
          virtualFiles = slicedLines.map((line, index) => {
            const cleanSlug = extractSlugFromUrl(line); 
            const meta = JSON.parse(JSON.stringify(INITIAL_METADATA));
            meta.en.title = cleanSlug;
            meta.ind.title = cleanSlug;
            return {
              id: uuidv4(),
              file: new File([""], `Idea_Row_${from + index}`, { type: 'text/plain' }), 
              previewUrl: "", type: FileType.Image, status: ProcessingStatus.Completed, metadata: meta,
              sourceData: { id: from + index, originalTitle: cleanSlug, originalKeywords: "" }
            };
          });
          setFilesMap(prev => ({ ...prev, idea: virtualFiles }));
          addLog(`Extracted ${virtualFiles.length} links locally.`, 'success', 'idea');
      }
      return;
    }

    if (currentProviderKeys.length === 0) { alert("Please enter at least one API Key."); return; }
    const targetList = filesMap[currentMode];
    const targetFiles = targetList.filter(f => f.status === ProcessingStatus.Pending || f.status === ProcessingStatus.Failed);
    
    if (targetFiles.length === 0) {
      const resetFiles = targetList.map(f => ({ ...f, status: ProcessingStatus.Pending, error: undefined }));
      setFilesMap(prev => ({ ...prev, [currentMode]: resetFiles }));
      runQueue(resetFiles, currentMode);
      return;
    }
    
    runQueue(targetFiles, currentMode);
  };

  const runQueue = (filesToProcess: FileItem[], mode: AppMode) => {
    setIsProcessing(true);
    setProcessingMode(mode);
    processingRef.current = true;
    activeWorkersRef.current = 0;
    
    setFilesMap(currentMap => {
        processingFilesRef.current = [...currentMap[mode]];
        return currentMap;
    });

    queueRef.current = filesToProcess.map(f => f.id); 
    activeKeysRef.current.clear();
    
    const keysToUse = apiKeysMap[settings.apiProvider] || [];
    addLog(`Starting Queue: ${queueRef.current.length} items in ${mode.toUpperCase()} using ${settings.apiProvider}.`, 'info', mode);

    const userMaxWorkers = settings.workerCount || 10;
    const maxConcurrency = Math.min(userMaxWorkers, Math.max(1, keysToUse.length));
    addLog(`Spawning ${maxConcurrency} workers...`, 'info', mode);

    for (let i = 0; i < maxConcurrency; i++) {
      spawnWorker(i + 1, mode, keysToUse);
    }
  };

  const spawnWorker = async (workerId: number, mode: AppMode, keysPool: string[]) => {
    if (!processingRef.current) return;
    await new Promise(r => setTimeout(r, 200)); 

    const fileId = queueRef.current.shift();
    if (!fileId) {
      checkCompletion(mode);
      return;
    }

    activeWorkersRef.current++;
    
    let selectedKey: string | null = null;
    const totalKeys = keysPool.length;
    const now = Date.now();

    for (const [key, expiry] of cooldownKeysRef.current.entries()) {
      if (now > expiry) cooldownKeysRef.current.delete(key);
    }

    for (let i = 0; i < totalKeys; i++) {
      const idx = (nextKeyIdxRef.current + i) % totalKeys;
      const keyCandidate = keysPool[idx];
      if (!activeKeysRef.current.has(keyCandidate) && !cooldownKeysRef.current.has(keyCandidate)) {
        selectedKey = keyCandidate;
        nextKeyIdxRef.current = (idx + 1) % totalKeys;
        break;
      }
    }

    if (!selectedKey) {
      queueRef.current.unshift(fileId);
      activeWorkersRef.current--;
      setTimeout(() => spawnWorker(workerId, mode, keysPool), 2000); 
      return;
    }

    activeKeysRef.current.add(selectedKey);
    const fileIndex = processingFilesRef.current.findIndex(f => f.id === fileId);
    if (fileIndex !== -1) {
        processingFilesRef.current[fileIndex] = { ...processingFilesRef.current[fileIndex], status: ProcessingStatus.Processing, error: undefined };
    }
    
    const currentFileItem = processingFilesRef.current[fileIndex];
    const keyIndex = keysPool.indexOf(selectedKey) + 1;

    try {
      if (!currentFileItem) throw new Error("File aborted or not found");

      const { metadata, thumbnail } = await generateMetadataForFile(currentFileItem, settings, selectedKey, mode);

      if (fileIndex !== -1) {
          processingFilesRef.current[fileIndex] = { 
              ...processingFilesRef.current[fileIndex], 
              status: ProcessingStatus.Completed, 
              metadata,
              thumbnail
          };
      }
      
      addLog(`Key ${keyIndex} [Success] ${currentFileItem.file.name}`, 'success', mode);
      activeKeysRef.current.delete(selectedKey);

    } catch (error: any) {
      activeKeysRef.current.delete(selectedKey!);
      const errorMsg = String(error).toLowerCase();
      if (errorMsg === 'file aborted') return; 

      const isTemporaryError = errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('overloaded') || errorMsg.includes('timeout') || errorMsg.includes('fetch failed');

      if (isTemporaryError) {
        queueRef.current.push(fileId);
        cooldownKeysRef.current.set(selectedKey!, Date.now() + 45000); 
        addLog(`Key ${keyIndex} Limited. Cooling down.`, 'warning', mode);
        
        if (fileIndex !== -1) {
            processingFilesRef.current[fileIndex] = { ...processingFilesRef.current[fileIndex], status: ProcessingStatus.Pending };
        }

      } else {
        console.error(error);
        if (fileIndex !== -1) {
            processingFilesRef.current[fileIndex] = { 
                ...processingFilesRef.current[fileIndex], 
                status: ProcessingStatus.Failed, 
                error: errorMsg.substring(0, 100) 
            };
        }
        addLog(`Key ${keyIndex} [Failed] Item: ${errorMsg.substring(0, 100)}...`, 'error', mode);
      }
    }

    activeWorkersRef.current--;
    spawnWorker(workerId, mode, keysPool);
  };

  const checkCompletion = (mode: AppMode) => {
    if (activeWorkersRef.current === 0) {
      setTimeout(() => {
        if (queueRef.current.length === 0 && activeWorkersRef.current === 0) {
            setIsProcessing(false);
            setProcessingMode(null);
            processingRef.current = false;
            
            setFilesMap(prev => {
               const newState = {
                  ...prev,
                  [mode]: [...processingFilesRef.current]
               };
               
               if (mode === 'idea') {
                  localStorage.setItem('ISA_LAST_IDEA_BATCH', JSON.stringify(processingFilesRef.current));
                  setHasHistory(true);
                  addLog('Batch saved to history.', 'info', 'idea');
               } else if (mode === 'prompt') {
                  localStorage.setItem('ISA_LAST_PROMPT_BATCH', JSON.stringify(processingFilesRef.current));
                  addLog('Prompts saved to history.', 'info', 'prompt');
               }

               return newState;
            });

            addLog('All workers finished. Navigation unlocked.', 'success', mode);
        }
      }, 1000);
    }
  };

  const displayTotalFiles = (() => {
      if (activeTab === 'idea') {
          if (currentFiles.length > 0) return currentFiles.length;
          if (settings.ideaMode === 'free') {
             if (settings.ideaCategory === 'file' && settings.ideaSourceFiles && settings.ideaSourceFiles.length > 0) {
                return (settings.ideaQuantity || 30) * settings.ideaSourceFiles.length;
             }
             return settings.ideaQuantity || 30;
          } else {
             return settings.ideaBatchSize || 0;
          }
      }
      if (activeTab === 'prompt') {
          if (currentFiles.length > 0) return currentFiles.length;
          return settings.promptQuantity || 0;
      }
      return currentFiles.length;
  })();

  const completedCount = currentFiles.filter(f => f.status === ProcessingStatus.Completed).length;
  const failedCount = currentFiles.filter(f => f.status === ProcessingStatus.Failed).length;
  
  const filteredLogs = logs.filter(log => {
      if (logFilter === 'ALL') return true;
      return log.mode === logFilter;
  });

  const activeModeLabel = activeMode === 'idea' ? 'Idea Generation' 
        : activeMode === 'prompt' ? 'Prompt Engineering'
        : activeMode === 'chat' ? 'AI Chat Assistant'
        : 'Metadata Extraction';

  const getInputAccept = () => {
        if (settings.selectedFileType === FileType.Video) return "video/mp4,video/quicktime,video/x-msvideo";
        if (settings.selectedFileType === FileType.Vector) return ".svg,.eps,.ai,.pdf";
        return "image/jpeg,image/png,image/webp,image/heic,image/jpg";
  };

  const getStatusBorderColor = () => {
        if (isProcessing) return 'border-blue-400 shadow-md ring-1 ring-blue-200';
        if (failedCount > 0) return 'border-red-200';
        if (completedCount > 0 && completedCount === displayTotalFiles) return 'border-green-300';
        return 'border-gray-200';
  };

  const getLoadingButtonStyle = () => {
        return 'from-blue-50 to-blue-100 text-blue-700 border-blue-200';
  };

  const getLoadingIconColor = () => {
        return 'text-blue-600';
  };

  const canGenerate = (() => {
        if (isProcessing) return false;
        if (currentProviderKeys.length === 0) return false;

        if (activeMode === 'idea') {
            if (settings.ideaMode === 'free') {
                 if (settings.ideaCategory === 'file' && (!settings.ideaSourceFiles || settings.ideaSourceFiles.length === 0)) return false;
                 if (settings.ideaCategory === 'custom' && !settings.ideaCustomInput) return false;
                 return true;
            } else {
                 return currentFiles.length > 0;
            }
        }
        if (activeMode === 'prompt') {
            return !!settings.promptIdea;
        }
        return currentFiles.length > 0 && currentFiles.some(f => f.status === ProcessingStatus.Pending || f.status === ProcessingStatus.Failed);
  })();

  const getGenerateButtonColor = () => {
        if (!canGenerate) return 'bg-gray-300 cursor-not-allowed text-gray-500';
        return 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-700';
  };

  const getGenerateButtonText = () => {
        if (activeMode === 'idea') return "Generate Ideas";
        if (activeMode === 'prompt') return "Generate Prompts";
        return "Generate Metadata";
  };

  const getDownloadLabel = () => {
        return `Download ${settings.outputFormat.toUpperCase()}`;
  };

  const getThemeColor = () => {
        return 'text-blue-500';
  };

  const MenuItem = ({ mode, icon: Icon, label, onClick, disabled }: { mode: string, icon: any, label: string, onClick?: () => void, disabled?: boolean }) => {
        const isActive = mode === activeTab;
        const isProcessingThis = isProcessing && mode === processingMode;
        const isLocked = isProcessing && mode !== processingMode && disabled;
        const isHighlighted = isActive || isProcessingThis;

        const handleClick = () => {
            if (isLocked) return;
            if (onClick) onClick();
            else handleNavigation(mode as any);
        };

        return (
            <button
                onClick={handleClick}
                disabled={isLocked}
                className={`w-full px-4 py-3 flex items-center justify-between transition-colors border-l-4 ${
                    isHighlighted 
                    ? 'bg-blue-50 text-blue-700 font-bold border-blue-600' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-transparent'
                } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <div className="flex items-center gap-3">
                    <Icon size={16} className={isHighlighted ? 'text-blue-600' : 'text-gray-400'} />
                    <span className="text-xs uppercase tracking-wider font-medium">{label}</span>
                </div>
                {isHighlighted && <CheckCircle size={14} className="text-blue-600 fill-blue-50" />}
            </button>
        );
  };

  return (
    <div className="flex flex-col min-h-screen md:h-screen bg-gray-50 overflow-x-hidden">
      <header className="fixed top-0 left-0 w-full bg-white border-b border-gray-200 px-6 h-16 flex items-center justify-between shadow-sm z-50">
        <div className="flex items-center">
          <h1 className="text-5xl font-share-tech font-bold bg-gradient-to-r from-blue-600 to-cyan-400 bg-clip-text text-transparent tracking-tighter leading-none select-none">IsaProject</h1>
        </div>
        <div className="flex flex-col items-end justify-center text-gray-800">
           <span className="text-2xl leading-none tracking-tight tabular-nums">{formatTime(currentTime)}</span>
           <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-0.5 tabular-nums">{formatDate(currentTime)}</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row md:overflow-hidden relative pt-16">
        <aside className="w-full md:w-96 md:ml-2 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col shrink-0 z-20 shadow-sm md:shadow-none order-1 md:h-full">
          
          <div className="flex flex-col bg-white border-b border-gray-200 shrink-0">
             <div className="grid grid-cols-4 gap-1 p-2">
                 <div className="relative" ref={menuRef}>
                    <button 
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className={`w-full py-2 px-1 rounded-lg text-[11px] font-bold uppercase tracking-wide flex flex-row items-center justify-center gap-1.5 transition-all border ${isMenuOpen ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >
                        <Menu className="w-4 h-4" />
                        <span className="truncate">Menu</span>
                    </button>
                    {isMenuOpen && (
                        <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-[100] animate-in slide-in-from-top-2 duration-200 overflow-hidden">
                            <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Settings</div>
                            <MenuItem mode="apikeys" icon={Key} label="API Keys" onClick={() => handleNavigation('apikeys')} disabled={isProcessing} />
                            <div className="bg-gray-50 px-4 py-2 border-b border-t border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select Mode</div>
                            <MenuItem mode="idea" icon={Lightbulb} label="Idea" disabled={true} />
                            <MenuItem mode="prompt" icon={Command} label="Prompt" disabled={true} />
                            <MenuItem mode="metadata" icon={Database} label="Metadata" disabled={true} />
                            <MenuItem mode="chat" icon={MessageSquare} label="AI Chat" disabled={true} />
                        </div>
                    )}
                 </div>
                 
                 <button onClick={() => handleNavigation('info')} className={`py-2 px-1 rounded-lg text-[11px] font-bold uppercase tracking-wide flex flex-row items-center justify-center gap-1.5 transition-all border ${activeTab === 'info' ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                    <Info className="w-4 h-4" /> 
                    <span className="truncate">Info</span>
                 </button>
                 
                 <button onClick={() => handleNavigation('logs')} className={`py-2 px-1 rounded-lg text-[11px] font-bold uppercase tracking-wide flex flex-row items-center justify-center gap-1.5 transition-all border ${activeTab === 'logs' ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                    <Activity className="w-4 h-4" /> 
                    <span className="truncate">Logs</span>
                 </button>
                 
                 <a href={SUPPORT_LINK} target="_blank" rel="noopener noreferrer" className="py-2 px-1 rounded-lg text-[11px] font-bold uppercase tracking-wide flex flex-row items-center justify-center gap-1.5 transition-all bg-white text-orange-700 hover:bg-orange-50 border border-orange-200">
                    <Coffee className="w-4 h-4 text-orange-600" /> 
                    <span className="truncate">Support</span>
                 </a>
             </div>
             
             {(activeTab === 'idea' || activeTab === 'prompt' || activeTab === 'metadata' || activeTab === 'info' || activeTab === 'apikeys' || activeTab === 'logs' || activeTab === 'chat') && (
                <div className="px-2 pb-2">
                    <div className="bg-blue-50 border border-blue-100 rounded px-3 py-1.5 flex items-center justify-between">
                         <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Active Workspace</span>
                         <span className="text-xs font-bold text-blue-700 uppercase flex items-center gap-1">{activeModeLabel} <ChevronRight size={12} /></span>
                    </div>
                </div>
             )}
          </div>

          <div ref={sidebarContentRef} className="flex-1 bg-gray-50 flex flex-col overflow-y-auto">
            <div className="p-4 pb-4 flex flex-col gap-4">
              {activeTab === 'info' && (
                  <AppInfo 
                    onNavigate={handleNavigation} 
                    isProcessing={isProcessing} 
                    processingMode={processingMode} 
                  />
              )}
              {activeTab === 'idea' && (
                 <IdeaSettings 
                    settings={settings} setSettings={setSettings} isProcessing={isProcessing} 
                    isPaidUnlocked={isPaidUnlocked} setIsPaidUnlocked={setIsPaidUnlocked} 
                    onRestoreHistory={handleRestoreHistory} hasHistory={hasHistory}
                 />
              )}
              {activeTab === 'prompt' && <PromptSettings settings={settings} setSettings={setSettings} isProcessing={isProcessing} />}
              {activeTab === 'metadata' && <MetadataSettings settings={settings} setSettings={setSettings} isProcessing={isProcessing} />}
              {activeTab === 'apikeys' && (
                <ApiKeyPanel 
                    apiKeys={currentProviderKeys} setApiKeys={handleUpdateCurrentProviderKeys} isProcessing={isProcessing} 
                    mode='metadata' provider={settings.apiProvider}
                    setProvider={(p) => setSettings(prev => ({ ...prev, apiProvider: p }))}
                    geminiModel={settings.geminiModel} setGeminiModel={(m) => setSettings(prev => ({ ...prev, geminiModel: m }))}
                    openaiModel={settings.openaiModel} setOpenaiModel={(m) => setSettings(prev => ({ ...prev, openaiModel: m }))}
                    groqModel={settings.groqModel} setGroqModel={(m) => setSettings(prev => ({ ...prev, groqModel: m }))}
                    customBaseUrl={settings.customBaseUrl} setCustomBaseUrl={(u) => setSettings(prev => ({ ...prev, customBaseUrl: u }))}
                    customModel={settings.customModel} setCustomModel={(m) => setSettings(prev => ({ ...prev, customModel: m }))}
                    cooldownKeys={cooldownKeysRef.current} workerCount={settings.workerCount}
                    setWorkerCount={(num) => setSettings(prev => ({ ...prev, workerCount: num }))}
                  />
              )}

              {activeTab !== 'logs' && activeTab !== 'apikeys' && activeTab !== 'info' && activeTab !== 'chat' && (
                <>
                  {activeTab !== 'idea' && activeTab !== 'prompt' && (
                    <div className="flex flex-col gap-3">
                      <input key={`file-${settings.selectedFileType}`} ref={fileInputRef} type="file" multiple accept={getInputAccept()} onChange={handleFileUpload} className="hidden" disabled={isProcessing} />
                      <input key={`folder-${settings.selectedFileType}`} ref={folderInputRef} type="file" multiple {...({ webkitdirectory: "", directory: "" } as any)} onChange={handleFileUpload} className="hidden" disabled={isProcessing} />
                      <div className="flex gap-2">
                          <button onClick={() => fileInputRef.current?.click()} disabled={isProcessing} className={`flex-1 py-3 rounded-lg font-bold shadow-sm transition-all flex items-center justify-center gap-2 ${isProcessing ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}><FilePlus size={18} /> Files</button>
                          <button onClick={() => folderInputRef.current?.click()} disabled={isProcessing} className={`flex-1 py-3 rounded-lg font-bold shadow-sm transition-all flex items-center justify-center gap-2 ${isProcessing ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}><FolderPlus size={18} /> Folder</button>
                      </div>
                    </div>
                  )}
                  <div className={`bg-white rounded-lg border ${getStatusBorderColor()} p-3 shadow-sm flex flex-col gap-2 transition-colors duration-300`}>
                      <div className="flex items-center justify-between text-sm font-medium text-gray-600">
                        <div className="flex items-center gap-1.5"><Circle className="w-3.5 h-3.5 text-blue-500" /> <span>Selected: <span className="text-gray-900">{displayTotalFiles}</span></span></div>
                        <div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-green-500" /> <span>Completed: <span className="text-green-600">{completedCount}</span></span></div>
                        <div className="flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 text-red-500" /> <span>Failed: <span className="text-red-500">{failedCount}</span></span></div>
                      </div>
                      <button onClick={handleClearAll} disabled={currentFiles.length === 0 || isProcessing} className="w-full mt-1 flex items-center justify-center gap-2 py-2 text-sm font-bold uppercase tracking-wide rounded border transition-colors bg-red-50 text-red-600 border-red-200 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200"><Trash2 size={14} /> Clear All</button>
                  </div>
                </>
              )}

              {activeTab === 'logs' && (
                  <div className="h-[600px] bg-white text-gray-800 rounded-lg shadow-sm border border-gray-200 relative shrink-0 flex flex-col overflow-hidden">
                    <div className="shrink-0 flex flex-col border-b border-gray-100">
                        <button onClick={handleClearLogs} className="w-full py-2 bg-red-50 hover:bg-red-100 border-b border-red-100 text-red-600 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"><Eraser size={14} /> Clear Logs</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-200">
                        {filteredLogs.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center opacity-40 gap-2 text-gray-400"><Activity size={32} /> <p>No logs found.</p></div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {filteredLogs.map(log => (
                              <div key={log.id} className="flex gap-2 items-start break-all border-b border-gray-50 pb-1 last:border-0">
                                <span className={`shrink-0 font-medium text-[10px] mt-0.5 px-1 rounded ${log.mode === 'idea' ? 'bg-amber-100 text-amber-700' : log.mode === 'prompt' ? 'bg-fuchsia-100 text-fuchsia-700' : log.mode === 'metadata' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{log.mode?.substring(0,4).toUpperCase()}</span>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-gray-400 font-mono">{log.time}</span>
                                    <span className={`text-xs ${log.type === 'error' ? 'text-red-600 font-bold' : log.type === 'success' ? 'text-green-600 font-semibold' : log.type === 'warning' ? 'text-orange-600 font-semibold' : 'text-gray-700'}`}>{log.message}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  </div>
              )}

              {activeTab !== 'logs' && activeTab !== 'apikeys' && activeTab !== 'info' && activeTab !== 'chat' && (
                <div className="flex flex-col gap-3">
                   {isProcessing ? (
                     <div className={`w-full py-3 bg-gradient-to-r border font-bold rounded-lg flex items-center justify-center gap-2 shadow-sm select-none ${getLoadingButtonStyle()}`}>
                       <Sparkles className={`w-5 h-5 animate-spin ${getLoadingIconColor()}`} style={{ animationDuration: '3s' }} />
                       <span className="tracking-widest text-sm">GENERATING...</span>
                     </div>
                   ) : (
                     <button onClick={startProcessing} disabled={!canGenerate} className={`w-full py-3 text-white font-bold rounded-lg shadow transition-colors flex items-center justify-center gap-2 ${getGenerateButtonColor()}`}>
                       <Wand2 size={18} />
                       {getGenerateButtonText()}
                     </button>
                   )}
                   <button onClick={handleDownload} disabled={displayTotalFiles === 0 || completedCount === 0 || isProcessing} className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow transition-colors flex items-center justify-center gap-2">
                     <Download size={18} /> {getDownloadLabel()}
                   </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        <section className={`flex-1 flex-col md:overflow-hidden relative order-2 min-h-0 bg-gray-100 ${activeTab === 'apikeys' || activeTab === 'logs' || activeTab === 'info' ? 'hidden md:flex' : 'flex'}`}>
          {activeTab !== 'logs' && activeTab !== 'apikeys' && activeTab !== 'info' && activeTab !== 'chat' && (
            <div className="p-4 bg-white border-b border-gray-200 shrink-0 flex items-center justify-between sticky top-0 md:static z-10 shadow-sm">
              <div className="flex items-center gap-2 text-gray-700">
                <FolderOutput className={`w-5 h-5 ${getThemeColor()}`} />
                <h2 className="font-bold text-xl tracking-tight">OUTPUT RESULT</h2>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border bg-blue-50 text-blue-600 border-blue-200`}>{activeTab} MODE</span>
            </div>
          )}

          <div ref={mainContentRef} className={`flex-1 p-4 md:overflow-y-auto min-h-[50vh] md:min-h-0 relative ${activeTab === 'chat' ? 'h-full' : ''}`}>
            {activeTab === 'info' ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-300"><Info size={80} className="mb-4 opacity-20" /><p className="font-medium text-lg text-gray-400">Application Information & Guide.</p></div>
            ) : activeTab === 'apikeys' ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-300"><Key size={80} className="mb-4 opacity-20" /><p className="font-medium text-lg text-gray-400">Configure API Keys in the sidebar settings.</p></div>
            ) : activeTab === 'logs' ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-300"><Activity size={80} className="mb-4 opacity-20" /><p className="font-medium text-lg text-gray-400">Viewing Logs...</p></div>
            ) : activeTab === 'chat' ? (
                <ChatInterface 
                    currentSessionId={currentSessionId}
                    sessions={chatSessions}
                    messages={chatSessions.find(s => s.id === currentSessionId)?.messages || []}
                    onSendMessage={handleSendMessage} 
                    onNewSession={handleNewSession}
                    onSelectSession={setCurrentSessionId}
                    onDeleteSession={handleDeleteSession}
                    onRenameSession={handleRenameSession}
                    onEditMessage={handleEditMessage}
                    onDeleteAllSessions={handleDeleteAllSessions}
                    isProcessing={isProcessing}
                />
            ) : currentFiles.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 min-h-[300px]">
                {activeTab === 'idea' ? (
                   <><Lightbulb size={64} className="mb-4 opacity-20 text-blue-500" /><p className="font-medium text-base">Idea Workspace Ready.</p><p className="text-sm mt-1 max-w-xs text-center text-gray-500">{settings.ideaMode === 'free' ? (settings.ideaCategory === 'file' ? "Upload a file in Idea Settings to generate concepts." : "Select a category and quantity to generate new concepts."): (settings.ideaSourceLines && settings.ideaSourceLines.length > 0 ? "Database loaded. Set Start Row & Quantity." : "Upload a Database file in Idea Settings (MODE 2) to start.")}</p></>
                ) : activeTab === 'prompt' ? (
                   <><Command size={64} className="mb-4 opacity-20 text-blue-500" /><p className="font-medium text-base">Prompt Generator Ready.</p><p className="text-sm mt-1 max-w-xs text-center text-gray-500">Enter an Idea, Description, and Quantity to start.</p></>
                ) : (
                   <><UploadCloud size={64} className="mb-4 opacity-20" /><p className="font-medium text-base">No files in {activeTab.toUpperCase()} workspace.</p><p className="text-sm mt-1">Upload {settings.selectedFileType}s to start.</p></>
                )}
              </div>
            ) : (
              activeTab === 'idea' && settings.ideaMode === 'paid' ? (
                <IdeaListComponent items={currentFiles} />
              ) : activeTab === 'prompt' ? (
                <PromptListComponent items={currentFiles} onDelete={handleDelete} onToggleLanguage={handleToggleLanguage} getLanguage={getLanguage} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20 md:pb-0">
                  {currentFiles.map(file => {
                     if (activeTab === 'idea') {
                        return (
                          <IdeaCard 
                             key={file.id} item={file} onDelete={handleDelete} onUpdate={handleUpdateMetadata}
                             onRetry={(id) => {
                               const targetMode = 'idea';
                               setFilesMap(prev => ({ ...prev, [targetMode]: prev[targetMode].map(f => f.id === id ? { ...f, status: ProcessingStatus.Pending } : f) }));
                             }}
                             language={getLanguage(file.id)} onToggleLanguage={handleToggleLanguage} disabled={isProcessing}
                          />
                        );
                     }
                     return (
                        <FileCard 
                          key={file.id} item={file} onDelete={handleDelete} onUpdate={handleUpdateMetadata}
                          onRetry={(id) => {
                            const targetMode = activeTab === 'logs' ? 'metadata' : activeTab;
                            setFilesMap(prev => ({ ...prev, [targetMode]: prev[targetMode].map(f => f.id === id ? { ...f, status: ProcessingStatus.Pending } : f) }));
                          }}
                          onPreview={setPreviewItem} language={getLanguage(file.id)} onToggleLanguage={handleToggleLanguage} disabled={isProcessing}
                        />
                     );
                  })}
                </div>
              )
            )}
          </div>
        </section>
      </main>

      <PreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />
    </div>
  );
};

export default App;