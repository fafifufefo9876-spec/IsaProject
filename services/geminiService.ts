
import { GoogleGenAI, Type } from "@google/genai";
import { AppSettings, FileItem, FileMetadata, FileType, Language, AppMode, ApiProvider, ChatMessage } from "../types";
import { DEFAULT_PROMPT_TEMPLATE, CATEGORIES, APP_CODE_CONTEXT } from "../constants";
import { extractVideoFrames } from "../utils/helpers";

const fileToPart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        const base64String = (reader.result as string).split(',')[1];
        resolve({
          inlineData: {
            data: base64String,
            mimeType: file.type || 'application/octet-stream',
          },
        });
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.readAsDataURL(file);
  });
};

const convertSvgToWhiteBgJpeg = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Canvas context failed"));
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const base64String = dataUrl.split(',')[1];
        resolve({
          inlineData: {
            data: base64String,
            mimeType: 'image/jpeg', 
          },
        });
      };
      img.onerror = () => reject(new Error("Failed to load SVG image"));
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

const compressImage = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 2000;
        const MAX_HEIGHT = 2000;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Canvas context failed"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const base64String = dataUrl.split(',')[1];
        resolve({
          inlineData: {
            data: base64String,
            mimeType: 'image/jpeg', 
          },
        });
      };
      img.onerror = () => reject(new Error("Failed to load image for compression"));
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

interface GenerationResult {
  metadata: FileMetadata;
  thumbnail?: string;
}

const callOpenAICompatibleApi = async (
  parts: any[], 
  systemInstruction: string, 
  apiKey: string, 
  baseUrl: string, 
  model: string,
  provider: ApiProvider,
  responseSchema?: any,
  temperature: number = 0.7,
  chatHistory?: ChatMessage[]
): Promise<any> => {
  const messages: any[] = [];
  messages.push({ role: "system", content: systemInstruction });
  if (chatHistory && chatHistory.length > 0) {
      chatHistory.forEach(msg => {
          messages.push({ role: msg.role, content: msg.content });
      });
  }
  const hasImages = parts.some(p => p.inlineData);
  let userContent: any;
  if (hasImages) {
      userContent = parts.map(part => {
        if (part.text) return { type: "text", text: part.text };
        if (part.inlineData) return { type: "image_url", image_url: { url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` } };
        return null;
      }).filter(Boolean);
  } else {
      userContent = parts.map(p => p.text).filter(Boolean).join("\n\n");
  }
  messages.push({ role: "user", content: userContent });
  let responseFormat = undefined;
  if (responseSchema && provider === 'OPENAI') {
    responseFormat = { type: "json_object" };
  }
  const payload: any = {
    model: model,
    messages: messages,
    temperature: temperature, 
  };
  if (responseFormat) payload.response_format = responseFormat;
  let endpoint = baseUrl;
  if (!endpoint.includes('/chat/completions')) {
      endpoint = endpoint.endsWith('/') ? `${endpoint}chat/completions` : `${endpoint}/chat/completions`;
  }
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API Error ${response.status}: ${errText.substring(0, 300)}`);
  }
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response content from API");
  if (responseSchema) {
      let cleanJson = content.replace(/```json\n?|```/g, "");
      const firstBrace = cleanJson.indexOf('{');
      const lastBrace = cleanJson.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
      try { return JSON.parse(cleanJson); } catch (e) { throw new Error("AI generated invalid JSON."); }
  }
  return content;
};

const CREATOR_PERSONAS = [
    "Futuristic Tech Visionary", "Minimalist Zen Master", "Corporate Business Analyst",
    "Adventure Travel Photographer", "Gourmet Food Stylist", "Abstract Art Director",
    "Vintage Retro Enthusiast", "Medical Science Illustrator", "Street Culture Observer",
    "Macro Nature Specialist", "Architectural Purist", "Lifestyle Influencer",
    "Dark Moody Storyteller", "Pastel Pop Artist", "Industrial Grunge Photographer",
    "Eco-Friendly Advocate", "Fantasy Concept Artist", "Sports Action Shooter",
    "Family Documentary Photographer", "Luxury Product Photographer"
];

export const generateMetadataForFile = async (
  fileItem: FileItem,
  settings: AppSettings,
  apiKey: string,
  mode: AppMode = 'metadata'
): Promise<GenerationResult> => {
  try {
    const multilingualInstruction = `
    GLOBAL LANGUAGE HANDLING:
    The user may provide input in Indonesian or English.
    Understand concept/intent, generate 'en' (English) and 'ind' (Indonesian).
    `;
    let systemInstruction = "";
    let promptText = "";
    let temperature = 0.7;
    let outputSchema: any = {
      type: Type.OBJECT,
      properties: {
        en: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, keywords: { type: Type.STRING } }, required: ["title", "keywords"] },
        ind: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, keywords: { type: Type.STRING } }, required: ["title", "keywords"] },
        category: { type: Type.STRING }
      },
      required: ["en", "ind", "category"]
    };

    if (mode === 'metadata') {
        systemInstruction = `${multilingualInstruction}\n\n${DEFAULT_PROMPT_TEMPLATE}`;
        const categoryListString = CATEGORIES.map(c => `ID: "${c.id}" = ${c.en}`).join('\n');
        systemInstruction += `\n\nAVAILABLE CATEGORIES:\n${categoryListString}`;
        if (settings.customTitle) systemInstruction += `\n\nEnglish title MUST contain: "${settings.customTitle}".`;
        if (settings.customKeyword) systemInstruction += `\n\nEnglish keywords MUST include: "${settings.customKeyword}".`;
        promptText = "Analyze this asset and generate commercial metadata in English and Indonesian.";
    } else if (mode === 'idea') {
        temperature = 1.3; 
        outputSchema = {
           type: Type.OBJECT,
           properties: { en_title: { type: Type.STRING }, ind_title: { type: Type.STRING }, en_visual: { type: Type.STRING }, ind_visual: { type: Type.STRING }, en_keywords: { type: Type.STRING }, ind_keywords: { type: Type.STRING } },
           required: ["en_title", "ind_title", "en_visual", "ind_visual", "en_keywords", "ind_keywords"]
        };
        const commonIdeaInstructions = `${multilingualInstruction}\nROLE: Professional Microstock Idea Generator for IsaProject_Free app.`;
        const randomPersona = CREATOR_PERSONAS[Math.floor(Math.random() * CREATOR_PERSONAS.length)];
        systemInstruction = `${commonIdeaInstructions}\nPERSONA: ${randomPersona}\nProvide English and Indonesian versions.`;
        if (settings.ideaCustomInstruction) systemInstruction += `\n\nUSER INSTRUCTION: ${settings.ideaCustomInstruction}`;
        promptText = `Generate a unique concept as a ${randomPersona}.`;
    } else if (mode === 'prompt') {
        temperature = 0.7;
        systemInstruction = `${multilingualInstruction}\nExpert AI Image Prompt Engineer for IsaProject_Free.`;
        outputSchema = { type: Type.OBJECT, properties: { en_prompt: { type: Type.STRING }, ind_prompt: { type: Type.STRING } }, required: ["en_prompt", "ind_prompt"] };
        promptText = `Generate a prompt for: ${fileItem.sourceData?.originalTitle || "Concept"}.`;
    }

    let parts: any[] = [];
    let generatedThumbnail: string | undefined = undefined;
    if (mode === 'prompt') {
       parts = [{ text: promptText }];
    } else if (fileItem.type === FileType.Video) {
      const frames = await extractVideoFrames(fileItem.file);
      generatedThumbnail = `data:image/jpeg;base64,${frames[0]}`;
      parts = frames.map(f => ({ inlineData: { mimeType: 'image/jpeg', data: f } }));
      parts.push({ text: promptText });
    } else if (fileItem.type === FileType.Vector && fileItem.file.type === 'image/svg+xml') {
      const mediaPart = await convertSvgToWhiteBgJpeg(fileItem.file);
      parts = [mediaPart, { text: promptText }];
    } else if (fileItem.type === FileType.Image) {
      const mediaPart = await compressImage(fileItem.file);
      parts = [mediaPart, { text: promptText }];
    } else {
      parts = [{ text: promptText }];
    }
    
    let parsed: any;
    const provider = settings.apiProvider || 'GEMINI';
    if (provider === 'GEMINI') {
        const geminiModel = settings.geminiModel || 'gemini-3-flash-preview';
        const ai = new GoogleGenAI({ apiKey });
        const response: any = await ai.models.generateContent({
          model: geminiModel,
          contents: { parts },
          config: { systemInstruction, responseMimeType: "application/json", responseSchema: outputSchema, temperature }
        });
        parsed = JSON.parse(response.text);
    } else {
        const baseUrl = provider === 'OPENAI' ? (settings.customBaseUrl || 'https://api.openai.com/v1') : (provider === 'GROQ' ? 'https://api.groq.com/openai/v1' : settings.customBaseUrl);
        const model = provider === 'OPENAI' ? settings.openaiModel : (provider === 'GROQ' ? settings.groqModel : settings.customModel);
        parsed = await callOpenAICompatibleApi(parts, systemInstruction, apiKey, baseUrl, model, provider, outputSchema, temperature);
    }

    const validCategory = (parsed.category && CATEGORIES.find(c => c.id === parsed.category)) ? parsed.category : '8';
    let enTitle = "", enKeywords = "", indTitle = "", indKeywords = "";

    if (mode === 'idea') {
       enTitle = `${parsed.en_title} ||| ${parsed.en_visual}`;
       indTitle = `${parsed.ind_title} ||| ${parsed.ind_visual}`;
       enKeywords = parsed.en_keywords; indKeywords = parsed.ind_keywords;
    } else if (mode === 'prompt') {
       enTitle = parsed.en_prompt; indTitle = parsed.ind_prompt;
    } else {
       enTitle = parsed.en?.title; enKeywords = parsed.en?.keywords;
       indTitle = parsed.ind?.title || enTitle; indKeywords = parsed.ind?.keywords || enKeywords;
    }

    return { metadata: { en: { title: enTitle, keywords: enKeywords }, ind: { title: indTitle, keywords: indKeywords }, category: validCategory }, thumbnail: generatedThumbnail };
  } catch (error: any) { throw error; }
};

export const translateMetadataContent = async (content: { title: string; keywords: string }, sourceLanguage: Language, apiKey: string): Promise<{ title: string; keywords: string }> => {
  try {
    const ai = new GoogleGenAI({ apiKey });
    const targetLangFull = sourceLanguage === 'ENG' ? 'Indonesian' : 'English';
    const sourceLangFull = sourceLanguage === 'ENG' ? 'English' : 'Indonesian';
    let prompt = `Translate Title="${content.title}" from ${sourceLangFull} to ${targetLangFull}.`;
    let outputSchema: any = { type: Type.OBJECT, properties: { title: { type: Type.STRING } }, required: ["title"] };
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { responseMimeType: "application/json", responseSchema: outputSchema } });
    const parsed = JSON.parse(response.text);
    return { title: parsed.title, keywords: content.keywords };
  } catch (error) { throw error; }
};

export const generateChatResponse = async (history: ChatMessage[], newMessage: string, settings: AppSettings, apiKey: string): Promise<string> => {
  try {
    const provider = settings.apiProvider || 'GEMINI';
    const systemInstruction = `You are IsaProject_Free Chat Assistant. 
    Only use the verified support link: https://lynk.id/isaproject/0581ez0729vx if asked. 
    DO NOT generate fake email addresses, fake Telegram groups, or fake Google Forms. 
    You are helpful and polite about stock photography and AI.
    
    ${APP_CODE_CONTEXT}`;

    if (provider === 'GEMINI') {
        const geminiModel = settings.geminiModel || 'gemini-3-flash-preview';
        const ai = new GoogleGenAI({ apiKey });
        const contents = history.map(msg => ({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content }] }));
        contents.push({ role: 'user', parts: [{ text: newMessage }] });
        const response = await ai.models.generateContent({ model: geminiModel, contents, config: { systemInstruction, temperature: 0.7 } });
        return response.text || "No response.";
    } else {
        const baseUrl = provider === 'OPENAI' ? (settings.customBaseUrl || 'https://api.openai.com/v1') : (provider === 'GROQ' ? 'https://api.groq.com/openai/v1' : settings.customBaseUrl);
        const model = provider === 'OPENAI' ? settings.openaiModel : (provider === 'GROQ' ? settings.groqModel : settings.customModel);
        return await callOpenAICompatibleApi([{ text: newMessage }], systemInstruction, apiKey, baseUrl, model, provider, undefined, 0.7, history);
    }
  } catch (error: any) { throw error; }
};
