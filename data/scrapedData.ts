
import { ScrapedDataRow } from "../types";

// INI ADALAH TEMPAT UNTUK MENYIMPAN DATA DARI SPREADSHEET ANDA.
// Format data harus sesuai dengan struktur di bawah ini.
// Nanti Anda bisa copy-paste ribuan data JSON ke sini.

export const SCRAPED_DATA: ScrapedDataRow[] = [
  {
    id: 1,
    originalTitle: "Happy family running on the beach during summer vacation",
    originalKeywords: "family, beach, summer, happy, running, vacation, sea, ocean, fun, joy"
  },
  {
    id: 2,
    originalTitle: "Business meeting in modern office with diversity people",
    originalKeywords: "business, meeting, office, corporate, team, teamwork, diversity, professional"
  },
  {
    id: 3,
    originalTitle: "Abstract geometric background with vibrant colors",
    originalKeywords: "abstract, geometric, background, pattern, modern, colorful, design, wallpaper"
  },
  {
    id: 4,
    originalTitle: "Traditional indian wedding ceremony celebration",
    originalKeywords: "wedding, indian, traditional, ceremony, celebration, culture, bride, groom, festival"
  },
  {
    id: 5,
    originalTitle: "Aerial view of city skyline at night with traffic lights",
    originalKeywords: "aerial, city, skyline, night, traffic, lights, urban, architecture, skyscraper, drone"
  },
  {
    id: 6,
    originalTitle: "Flat design business infographic template",
    originalKeywords: "infographic, template, business, flat, design, chart, graph, diagram, presentation, data"
  }
  // ... (Data lainnya akan ditambahkan di sini)
];

// Helper to fetch data based on filters and range
export const getScrapedData = (
  platform: string, 
  fileType: string, 
  country: string, 
  startRow: number, 
  endRow: number
): ScrapedDataRow[] => {
  // Filter logic (Optional: if we want to filter specifically, or just assume the user sets the range correctly)
  // For now, let's just grab by Index (Row Number) to keep it simple as requested.
  // Assuming 'id' correlates to Row Number.
  
  // Adjust 1-based index to 0-based array
  const startIndex = Math.max(0, startRow - 1);
  const endIndex = Math.min(SCRAPED_DATA.length, endRow);

  return SCRAPED_DATA.slice(startIndex, endIndex);
};
