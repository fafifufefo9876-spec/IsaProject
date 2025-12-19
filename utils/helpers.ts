




import { Category, FileItem } from "../types";
import { CATEGORIES } from "../constants";

export const generateProjectName = (): string => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  
  return `Project_${hour}.${minute}_${day}-${month}-${year}`;
};

// SECURITY HELPER
// Check for 'BISMILLAH' using Base64 comparison (More reliable across environments than bitwise hash)
// "QklTTUlMTEFI" is Base64 for "BISMILLAH"
const PASS_TOKEN = "QklTTUlMTEFI"; 

export const checkPassword = (input: string): boolean => {
  try {
      // Normalize input: Uppercase and Trim
      const normalized = input.trim().toUpperCase();
      return btoa(normalized) === PASS_TOKEN;
  } catch (e) {
      return false;
  }
};

export const getCategoryName = (id: string, lang: 'ENG' | 'IND'): string => {
  const cat = CATEGORIES.find(c => c.id === id);
  if (!cat) return id;
  return lang === 'ENG' ? cat.en : cat.id_lang;
};

// CSV Export
export const downloadCSV = (files: FileItem[], customFilename?: string): string => {
  const isIdeaExport = files.some(f => f.sourceData !== undefined);
  // Check if it's Prompt Mode (Prompt mode also uses sourceData for virtual files)
  // We can distinguish Prompt from Idea by checking fields or active mode. 
  // But here we rely on the file structure.
  // Prompt Mode stores the prompt text in 'title', and usually has empty keywords. Idea has '|||' in title.
  
  const isPromptMode = isIdeaExport && !files[0].metadata.en.title.includes('|||') && files[0].sourceData?.originalKeywords !== undefined;

  let header: string[];
  let rows: string[];

  if (isPromptMode) {
     // PROMPT CSV
     header = ['Row_ID', 'Prompt_EN', 'Prompt_IND'];
     rows = files.map((f, index) => {
        return [
           index + 1,
           `"${(f.metadata.en.title || "").replace(/"/g, '""')}"`,
           `"${(f.metadata.ind.title || "").replace(/"/g, '""')}"`
        ].join(',');
     });
  } else if (isIdeaExport) {
     // IDEA CSV
     const isMode1 = files.some(f => f.metadata.en.title.includes('|||'));

     if (isMode1) {
        // MODE 1: Row_ID, Title, Visual, Keywords (EN & IND)
        header = [
            'Row_ID', 
            'Title_EN', 'Visual_EN', 'Keywords_EN',
            'Title_IND', 'Visual_IND', 'Keywords_IND'
        ];
        
        rows = files.map(f => {
          const rowId = f.sourceData ? `Row_${f.sourceData.id}` : f.file.name;
          const [enTitle, enVisual] = (f.metadata.en.title || "").split('|||').map(s => s.trim());
          const [indTitle, indVisual] = (f.metadata.ind.title || "").split('|||').map(s => s.trim());

          return [
            rowId, 
            `"${(enTitle || "").replace(/"/g, '""')}"`,
            `"${(enVisual || "").replace(/"/g, '""')}"`,
            `"${(f.metadata.en.keywords || "").replace(/"/g, '""')}"`,
            `"${(indTitle || "").replace(/"/g, '""')}"`,
            `"${(indVisual || "").replace(/"/g, '""')}"`,
            `"${(f.metadata.ind.keywords || "").replace(/"/g, '""')}"`
          ].join(',');
        });
     } else {
        // MODE 2: Row_ID, Slug_EN, Slug_IND, Note
        header = ['Row_ID', 'Extracted_Data_EN', 'Extracted_Data_IND', 'Note'];
        rows = files.map(f => {
            const rowId = f.sourceData ? `Row_${f.sourceData.id}` : f.file.name;
            const textEn = f.metadata.en.title;
            const textInd = f.metadata.ind.title || textEn; // Fallback
            const isVulgar = isNSFW(textEn);
            
            return [
                rowId,
                `"${(textEn || "").replace(/"/g, '""')}"`,
                `"${(textInd || "").replace(/"/g, '""')}"`,
                isVulgar ? "NSFW/Vulgar Content Detected" : "Clean"
            ].join(',');
        });
     }
  } else {
     // STANDARD METADATA MODE
     header = ['filename', 'title', 'keywords', 'category'];
     rows = files.map(f => {
        // CRITICAL: Always use f.metadata.en (ENGLISH) for CSV output
        const title = `"${f.metadata.en.title.replace(/"/g, '""')}"`;
        const keywords = `"${f.metadata.en.keywords.replace(/"/g, '""')}"`;
        const categoryName = getCategoryName(f.metadata.category, 'ENG'); // Always English
        
        return [
          f.file.name,
          title,
          keywords,
          categoryName
        ].join(',');
      });
  }

  const csvContent = [header.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const fileName = customFilename && customFilename.trim() !== '' 
    ? `${customFilename.trim()}.csv` 
    : `IsaMetadata.csv`;
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  return fileName;
};

// TXT Export
export const downloadTXT = (files: FileItem[], customFilename?: string): string => {
  const isIdeaExport = files.some(f => f.sourceData !== undefined);
  const isPromptMode = isIdeaExport && !files[0].metadata.en.title.includes('|||') && files[0].sourceData?.originalKeywords !== undefined;

  let content = "";

  if (isPromptMode) {
     content = files.map((f, index) => {
        return `=== Prompt ${index + 1} ===\n[EN]\n${f.metadata.en.title}\n\n[IND]\n${f.metadata.ind.title}\n----------------------------------------\n`;
     }).join('\n');
  } else if (isIdeaExport) {
     const isMode1 = files.some(f => f.metadata.en.title.includes('|||'));

     if (isMode1) {
        // MODE 1
        content = files.map(f => {
          const rowId = f.sourceData ? `Row ${f.sourceData.id}` : f.file.name;
          const [enTitle, enVisual] = (f.metadata.en.title || "").split('|||').map(s => s.trim());
          const [indTitle, indVisual] = (f.metadata.ind.title || "").split('|||').map(s => s.trim());

          return `=== ${rowId} ===
[EN]
Title: ${enTitle}
Visual: ${enVisual}
Keywords: ${f.metadata.en.keywords}

[IND]
Title: ${indTitle}
Visual: ${indVisual}
Keywords: ${f.metadata.ind.keywords}
----------------------------------------
`;
        }).join('\n');
     } else {
        // MODE 2 (List format)
        content = files.map(f => {
            const rowId = f.sourceData ? f.sourceData.id : f.file.name;
            const textEn = f.metadata.en.title;
            const textInd = f.metadata.ind.title || textEn;
            const isVulgar = isNSFW(textEn);
            
            const displayEn = isVulgar ? "--- Content Hidden (NSFW) ---" : textEn;
            const displayInd = isVulgar ? "--- Content Hidden (NSFW) ---" : textInd;
            const note = isVulgar ? " [WARNING: NSFW]" : "";
            
            // Bilingual TXT output for Mode 2
            return `${rowId}.\n[EN] ${displayEn}\n[IND] ${displayInd}${note}\n`;
        }).join('\n');
     }
  } else {
     // PROMPT / METADATA MODE
     content = files.map(f => {
        return `Filename: ${f.file.name}\nTitle/Prompt: ${f.metadata.en.title}\nKeywords/Params: ${f.metadata.en.keywords}\nCategory: ${getCategoryName(f.metadata.category, 'ENG')}\n----------------------------------------\n`;
      }).join('\n');
  }

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const fileName = customFilename && customFilename.trim() !== '' 
    ? `${customFilename.trim()}.txt` 
    : `IsaMetadata.txt`;
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  return fileName;
};

// Helper to extract 3 frames from a video file
export const extractVideoFrames = async (videoFile: File): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const frames: string[] = [];
    const timestamps = [0.1, 0.5, 0.9]; // 10%, 50%, 90%
    let currentStep = 0;

    const url = URL.createObjectURL(videoFile);
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      video.currentTime = video.duration * timestamps[0];
    };

    video.onseeked = () => {
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas context failed"));
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push(canvas.toDataURL('image/jpeg', 0.7).split(',')[1]);

      currentStep++;
      if (currentStep < timestamps.length) {
        video.currentTime = video.duration * timestamps[currentStep];
      } else {
        URL.revokeObjectURL(url);
        resolve(frames);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Error loading video"));
    };
  });
};

// === TEXT PROCESSING ===

const BAD_WORDS = [
  'porn', 'sex', 'nude', 'naked', 'xxx', 'erotic', 'boobs', 'tits', 'pussy', 
  'fuck', 'dick', 'cock', 'penis', 'vagina', 'ass', 'orgasm', 'masturbate',
  'bitch', 'whore', 'slut', 'milf', 'fetish', 'bdsm', 'rape', 'incest',
  'anal', 'blowjob', 'cum', 'ejaculate', 'hentai', 'stripper', 'escort',
  'sexy', 'hot girl', '18+', 'adult', 'bathroom', 'toilet', 'change clothes', 'changing clothes', 
  'undress', 'undressing', 'bhabhi', 'auntie', 'desi', 'upskirt'
];

export const isNSFW = (text: string): boolean => {
    if (!text) return false;
    const lower = text.toLowerCase();
    return BAD_WORDS.some(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        return regex.test(lower);
    });
};

export const extractSlugFromUrl = (url: string): string => {
  try {
    const cleanUrl = url.trim();
    let text = "";

    // 1. Check for Query Params first (e.g. Adobe Stock Search ?k=)
    // Example: https://stock.adobe.com/search/video?k=%22+kiss%22
    if (cleanUrl.includes('?')) {
        try {
            const urlObj = new URL(cleanUrl);
            const params = new URLSearchParams(urlObj.search);
            const query = params.get('k') || params.get('q') || params.get('search') || params.get('query');
            
            if (query) {
                // Decode URI (e.g. %22 -> ")
                text = decodeURIComponent(query);
                // Remove quotes " ' 
                text = text.replace(/['"]/g, '');
                // Remove plus + (often used as space in query params, though decodeURIComponent handles some)
                text = text.replace(/\+/g, ' ');
                // Clean up
                text = text.replace(/\s+/g, ' ').trim();
                return text;
            }
        } catch (e) {
            // If URL parsing fails, fall back to basic string manipulation
        }
    }

    // 2. If no query param found, use Path Extraction
    // Remove protocol and domain
    // Example: https://stock.adobe.com/video/the-girls-change-clothes/143519185
    const path = cleanUrl.replace(/^https?:\/\/[^\/]+\//, '').split('?')[0];
    const segments = path.split('/');
    
    // Find the longest segment that is NOT purely numbers
    let bestSegment = "";
    
    // Iterate from end to start to find the slug
    for (let i = segments.length - 1; i >= 0; i--) {
        const seg = segments[i];
        if (!seg) continue;
        
        // Ignore IDs (pure numbers)
        if (/^\d+$/.test(seg)) continue;

        // Ignore common path words
        if (['video', 'image', 'photo', 'vector', 'search', 'contributor', 'portfolio'].includes(seg.toLowerCase())) continue;

        bestSegment = seg;
        break; // Found the slug
    }
    
    if (!bestSegment) return url;

    // 3. Clean the found segment
    // Remove file extensions
    bestSegment = bestSegment.replace(/\.(jpg|jpeg|png|eps|ai|svg|mp4|html|php|htm)$/i, '');
    
    // Remove trailing ID (e.g. "-123456" or "_123456")
    bestSegment = bestSegment.replace(/[-_]\d{3,}$/, '');
    
    // Remove leading ID (e.g. "123456-title")
    bestSegment = bestSegment.replace(/^\d+[-_]/, '');
    
    // Replace separators with spaces
    bestSegment = bestSegment.replace(/[-_+]/g, ' ');
    
    // Clean up multiple spaces
    bestSegment = bestSegment.replace(/\s+/g, ' ').trim();
    
    // Final check: if result is still empty or just numbers
    if (!bestSegment || /^\d+$/.test(bestSegment)) return url;
    
    return bestSegment;
  } catch (e) {
    return url;
  }
};

export const filterSafeText = (text: string): string => {
  let clean = text.toLowerCase();
  BAD_WORDS.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    clean = clean.replace(regex, '');
  });
  return clean.replace(/\s+/g, ' ').trim();
};