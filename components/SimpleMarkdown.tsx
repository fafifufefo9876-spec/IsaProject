import React from 'react';

interface Props {
  text: string;
  className?: string;
}

const SimpleMarkdown: React.FC<Props> = ({ text, className = '' }) => {
  if (!text) return null;

  const lines = text.split('\n');
  const renderedElements: React.ReactNode[] = [];
  
  let i = 0;

  // Helper to process inline formatting (Bold, Italic, Code, Links)
  const processInlineFormatting = (line: string): React.ReactNode[] => {
    // Split by Bold (**text**)
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold">{part.slice(2, -2)}</strong>;
      }
      
      // Split by Italic (*text* or _text_)
      const italicParts = part.split(/(\*.*?\*)/g);
      return italicParts.map((subPart, subIndex) => {
         if (subPart.startsWith('*') && subPart.endsWith('*') && subPart.length > 2) {
             return <em key={`${index}-${subIndex}`} className="italic">{subPart.slice(1, -1)}</em>;
         }
         // Handle `code` inline
         const codeParts = subPart.split(/(`.*?`)/g);
         return codeParts.map((cPart, cIndex) => {
             if (cPart.startsWith('`') && cPart.endsWith('`')) {
                 return <code key={`${index}-${subIndex}-${cIndex}`} className="bg-gray-100 text-red-500 px-1 rounded font-mono text-xs">{cPart.slice(1, -1)}</code>;
             }
             
             // Handle Links (http/https)
             const urlParts = cPart.split(/(https?:\/\/[^\s,()<>]+)/g);
             return urlParts.map((uPart, uIndex) => {
                if (uPart.startsWith('http')) {
                    return (
                        <a 
                            key={`${index}-${subIndex}-${cIndex}-${uIndex}`} 
                            href={uPart} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-blue-600 underline hover:text-blue-800 break-all decoration-blue-300 underline-offset-2 transition-colors"
                        >
                            {uPart}
                        </a>
                    );
                }
                return uPart;
             });
         });
      });
    });
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // 1. Code Blocks
    if (trimmedLine.startsWith('```')) {
      let codeContent: string[] = [];
      i++; // Skip opening ```
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeContent.push(lines[i]);
        i++;
      }
      renderedElements.push(
        <div key={`code-${i}`} className="my-2 bg-gray-800 text-gray-100 p-3 rounded-lg text-xs font-mono overflow-x-auto w-full block" style={{ maxWidth: '100%' }}>
          <pre>{codeContent.join('\n')}</pre>
        </div>
      );
      i++; // Skip closing ```
      continue;
    }

    // 2. Tables
    // A table must start with a pipe |
    if (trimmedLine.startsWith('|')) {
      const tableRows: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableRows.push(lines[i].trim());
        i++;
      }

      // We need at least 2 rows (header + separator) to be a valid table
      if (tableRows.length >= 2) {
        // Parse Headers
        const headerRow = tableRows[0];
        // Split and clean headers
        const headers = headerRow.split('|')
            .filter((_, idx, arr) => idx !== 0 && idx !== arr.length - 1) // Remove first and last empty splits from |header|header|
            .map(cell => cell.trim());
        
        // Fallback if filter removes everything (e.g. malformed table like "Header|Header")
        if (headers.length === 0 && headerRow.split('|').length > 0) {
             const manualSplit = headerRow.split('|').map(s => s.trim()).filter(s => s);
             headers.push(...manualSplit);
        }

        // Check for separator row (must contain dashes)
        const separatorRow = tableRows[1];
        if (separatorRow.includes('---')) {
           const bodyRows = tableRows.slice(2);

           // Key fix: Removed maxHeight and overflow-y-auto to allow full vertical expansion.
           // Kept overflow-x-auto for horizontal scrolling.
           renderedElements.push(
             <div key={`table-${i}`} className="my-3 block w-full overflow-x-auto border border-gray-200 rounded-lg shadow-sm bg-white" style={{ maxWidth: '100%' }}>
                <table className="min-w-full text-left border-collapse">
                  <thead className="bg-gray-50 shadow-sm">
                    <tr>
                      {headers.map((h, idx) => (
                        <th key={idx} className="p-3 border-b border-gray-300 bg-gray-50 text-xs font-bold text-gray-700 uppercase tracking-wide min-w-[120px] align-top whitespace-normal break-words">
                          {processInlineFormatting(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bodyRows.map((row, rIdx) => {
                      // Robust splitting:
                      // 1. Split by |
                      const parts = row.split('|');
                      // 2. Remove first and last if they are empty (common in markdown tables | a | b |)
                      if (parts.length > 1 && parts[0].trim() === '') parts.shift();
                      if (parts.length > 0 && parts[parts.length - 1].trim() === '') parts.pop();
                      
                      const actualCells = parts;

                      return (
                        <tr key={rIdx} className="even:bg-gray-50/50 hover:bg-blue-50/30 transition-colors border-b border-gray-100 last:border-0">
                          {actualCells.map((cell, cIdx) => (
                            <td key={cIdx} className="p-3 text-xs text-gray-700 align-top leading-relaxed min-w-[120px] whitespace-normal break-words">
                              {processInlineFormatting(cell.trim())}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
             </div>
           );
           continue; // Loop already advanced
        }
      }
      
      // Fallback: If table logic didn't trigger (e.g. no separator), render lines as text
      tableRows.forEach((r, idx) => {
         renderedElements.push(<div key={`text-${i}-fallback-${idx}`}>{processInlineFormatting(r)}</div>);
      });
      continue;
    }

    // 3. Lists (Bullet points)
    if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
      renderedElements.push(
        <li key={`li-${i}`} className="ml-4 list-disc pl-1 mb-1">
          {processInlineFormatting(trimmedLine.substring(2))}
        </li>
      );
      i++;
      continue;
    }
    
    // 4. Numbered Lists
    if (/^\d+\.\s/.test(trimmedLine)) {
       renderedElements.push(
        <div key={`num-${i}`} className="ml-1 mb-1 flex gap-1">
           <span className="font-bold text-gray-600 select-none">{trimmedLine.split(' ')[0]}</span>
           <span>{processInlineFormatting(trimmedLine.substring(trimmedLine.indexOf(' ') + 1))}</span>
        </div>
       );
       i++;
       continue;
    }

    // 5. Headers (## )
    if (trimmedLine.startsWith('### ')) {
        renderedElements.push(<h3 key={`h3-${i}`} className="text-sm font-bold mt-3 mb-1 text-blue-800">{processInlineFormatting(trimmedLine.substring(4))}</h3>);
        i++;
        continue;
    }
    if (trimmedLine.startsWith('## ')) {
        renderedElements.push(<h2 key={`h2-${i}`} className="text-base font-bold mt-4 mb-2 border-b border-gray-200 pb-1 text-blue-900">{processInlineFormatting(trimmedLine.substring(3))}</h2>);
        i++;
        continue;
    }

    // 6. Regular Paragraphs
    if (trimmedLine === '') {
      renderedElements.push(<br key={`br-${i}`} />);
    } else {
      renderedElements.push(
        <div key={`p-${i}`} className="min-h-[1.2em]">
          {processInlineFormatting(line)}
        </div>
      );
    }
    i++;
  }

  return <div className={`markdown-body text-sm leading-relaxed break-words w-full block ${className}`} style={{ maxWidth: '100%' }}>{renderedElements}</div>;
};

export default SimpleMarkdown;