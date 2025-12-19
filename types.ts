
export enum FileType {
  Image = 'Image',
  Video = 'Video',
  Vector = 'Vector',
}

export enum ProcessingStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed',
}

export type ApiProvider = 'GEMINI' | 'OPENAI' | 'GROQ' | 'CUSTOM';

export interface LocalizedContent {
  title: string;
  keywords: string;
}

export interface FileMetadata {
  en: LocalizedContent;
  ind: LocalizedContent;
  category: string; // ID of the category (Global)
}

export interface FileItem {
  id: string;
  file: File;
  previewUrl: string; // For images: blob url. For video: blob url of the middle frame.
  thumbnail?: string; // NEW: Lightweight base64 image for UI display (proxy for heavy video)
  extractedFrames?: string[]; // Specifically for video: [start, middle, end] base64 strings
  type: FileType;
  status: ProcessingStatus;
  metadata: FileMetadata;
  error?: string;
  // NEW: To store source data for Idea generation (Hardcoded data)
  sourceData?: ScrapedDataRow; 
}

export interface Category {
  id: string;
  en: string;
  id_lang: string; // 'id' is reserved in some contexts, using id_lang for Indonesian label
}

export type AppMode = 'idea' | 'prompt' | 'metadata' | 'chat';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  name: string;
  messages: ChatMessage[];
  lastModified: number;
}

export interface ScrapedDataRow {
  id: number;
  // Removed platform/country/type specific fields as they are now generic
  originalTitle: string; 
  originalKeywords: string;
}

// NEW: Idea Categories
export type IdeaCategory = 
  | 'auto' 
  | 'lifestyle' 
  | 'business' 
  | 'nature' 
  | 'food' 
  | 'science' 
  | 'travel' 
  | 'architecture' 
  | 'social' 
  | 'sports' 
  | 'abstract' 
  | 'custom'
  | 'file'; // Moved to bottom

export interface AppSettings {
  // API Settings
  apiProvider: ApiProvider;
  
  // Model Configurations
  geminiModel: string;   // Specific for Gemini
  openaiModel: string;   // Specific for OpenAI
  groqModel: string;     // Specific for Groq
  customBaseUrl: string; // For Custom
  customModel: string;   // For Custom

  // Metadata Settings
  customTitle: string;
  customKeyword: string;
  
  // UPDATED: Title Length Range
  titleMin: number;
  titleMax: number;
  
  slideKeyword: number; // Target keyword count (0-50)
  workerCount: number; // NEW: Worker concurrency limit (Max 10)
  
  // Idea Settings
  ideaMode: 'free' | 'paid';
  ideaQuantity: number;      // Default 30, max 50
  
  // NEW: Revised Free Mode Parameters
  ideaCategory: IdeaCategory;
  ideaCustomInput: string;   // Input for 'Custom' mode
  ideaCustomInstruction: string; // NEW: Custom Prompt Injection
  ideaSourceFiles?: File[];  // CHANGED: Array to support multiple files

  ideaFromRow: number;       // Start Row (Paid)
  ideaBatchSize: number;     // Batch Size (Paid)
  ideaSourceLines: string[]; // Holds lines from uploaded CSV/TXT (Paid)
  
  // Prompt Settings
  promptIdea: string;
  promptDescription: string;
  promptQuantity: number;
  promptJsonOutput: boolean;
  promptPlatform: string; // Deprecated in UI but kept for type safety if needed, can serve as style preset

  selectedFileType: FileType;
  csvFilename: string;
  outputFormat: 'csv' | 'txt';
}

export type Language = 'ENG' | 'IND';
