
import React from 'react';
import { Command, FileText, CheckSquare, Square, List } from 'lucide-react';
import { AppSettings } from '../types';

interface Props {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  isProcessing: boolean;
}

const PRESET_MEDIA_TYPES = [
  'Photo/Image',
  'Vector',
  'Illustration',
  'Video / Footage'
];

const PromptSettings: React.FC<Props> = ({ settings, setSettings, isProcessing }) => {
  const handleChange = (field: keyof AppSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (field: 'promptQuantity', value: string) => {
    if (value === '') {
      handleChange(field, 0);
      return;
    }
    let num = parseInt(value);
    if (isNaN(num)) return;
    
    if (field === 'promptQuantity') {
        if (num > 50) num = 50; // Max 50
        if (num < 0) num = 0;
    } 
    
    handleChange(field, num);
  };

  const inputClass = "w-full text-base p-2 border border-gray-300 rounded bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none focus:border-blue-500 transition-all disabled:bg-gray-100 disabled:text-gray-400 placeholder:text-gray-300 h-[42px]";
  
  const labelClass = "block text-sm font-medium text-gray-500 h-5 flex items-center whitespace-nowrap overflow-hidden";

  const isCustomMedia = !PRESET_MEDIA_TYPES.includes(settings.promptPlatform);

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-200 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Command className="w-4 h-4 text-blue-500" />
        <h2 className="text-base font-semibold text-gray-700 uppercase tracking-wide">Prompt Setting</h2>
      </div>

      <div className="border-t border-blue-100 -my-2"></div>

      {/* Idea / Niche Input */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-1">
          <label className={labelClass}>Idea / Niche</label>
        </div>
        <input
          type="text"
          className={inputClass}
          placeholder="e.g. Cyberpunk Street Food / Jajanan Jalanan..."
          value={settings.promptIdea}
          onChange={(e) => handleChange('promptIdea', e.target.value)}
          disabled={isProcessing}
        />
      </div>

      {/* Description Input */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <label className={labelClass}>Description (Optional)</label>
        </div>
        <textarea
          className="w-full text-base p-2 border border-gray-300 rounded bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none focus:border-blue-500 transition-all disabled:bg-gray-100 disabled:text-gray-400 placeholder:text-gray-300 resize-none h-20"
          placeholder="Specific details, lighting, mood, colors / Detail pencahayaan, suasana..."
          value={settings.promptDescription}
          onChange={(e) => handleChange('promptDescription', e.target.value)}
          disabled={isProcessing}
        />
      </div>

      {/* Media Type Selector (Select / Custom Input Style) */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <label className={labelClass}>Media Type</label>
        </div>
        
        {isCustomMedia ? (
             <div className="flex gap-3 animate-in fade-in duration-200">
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g. 3D Render"
                  value={settings.promptPlatform}
                  onChange={(e) => handleChange('promptPlatform', e.target.value)}
                  disabled={isProcessing}
                  autoFocus
                />
                <button
                  onClick={() => handleChange('promptPlatform', 'Photo/Image')} 
                  className="w-10 shrink-0 flex items-center justify-center bg-gray-100 text-gray-500 border border-gray-300 rounded hover:bg-gray-200 transition-colors h-[42px]"
                  title="Back to Presets"
                  disabled={isProcessing}
                >
                    <List size={16} />
                </button>
            </div>
        ) : (
             <div className="relative">
                <select
                    className={inputClass}
                    value={settings.promptPlatform}
                    onChange={(e) => {
                        if (e.target.value === 'CUSTOM_TRIGGER') {
                            handleChange('promptPlatform', ''); // Switch to custom mode
                        } else {
                            handleChange('promptPlatform', e.target.value);
                        }
                    }}
                    disabled={isProcessing}
                >
                    {PRESET_MEDIA_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                    <option value="CUSTOM_TRIGGER">Custom (Your Media Type)</option>
                </select>
             </div>
        )}
      </div>

      {/* Quantity & Output Row - 2 EQUAL COLUMNS GRID */}
      <div className="grid grid-cols-2 gap-3 items-end">
        
        {/* Quantity */}
        <div>
          <div className="flex items-center gap-2 mb-1">
             <label className={labelClass} title="Maximum 50">Quantity</label>
          </div>
          <input
            type="number"
            min="0"
            max="50"
            placeholder="Max 50"
            className={inputClass}
            value={settings.promptQuantity === 0 ? '' : settings.promptQuantity}
            onChange={(e) => handleNumberChange('promptQuantity', e.target.value)}
            disabled={isProcessing}
          />
        </div>

        {/* Output Format (Text Size Changed to text-base, font-medium) */}
        <div>
             <div className="flex items-center gap-2 mb-1">
                <label className={labelClass}>Output Format</label>
             </div>
             
             {/* Matching Height Container (42px) */}
             <div className="h-[42px] w-full bg-gray-100 rounded-lg p-1 flex relative border border-gray-200">
                 {/* Sliding Selection Background */}
                 <div 
                    className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded shadow-sm border border-gray-100 transition-all duration-300 ease-out z-0 ${
                        settings.promptJsonOutput ? 'left-[calc(50%+0px)]' : 'left-1'
                    }`}
                 />

                 <button
                    onClick={() => !isProcessing && handleChange('promptJsonOutput', false)}
                    // Disabled if Processing OR if the OTHER option is active (User requirement: disable JSON button if Normal selected)
                    disabled={isProcessing || !settings.promptJsonOutput} 
                    className={`flex-1 flex items-center justify-center gap-1.5 z-10 text-base font-medium transition-colors duration-200 ${
                        !settings.promptJsonOutput 
                           ? 'text-blue-600' 
                           : (isProcessing || settings.promptJsonOutput) 
                               ? 'text-gray-300 cursor-not-allowed' 
                               : 'text-gray-400 hover:text-gray-600'
                    }`}
                 >
                    Normal
                 </button>
                 
                 <button
                    onClick={() => !isProcessing && handleChange('promptJsonOutput', true)}
                    // Disabled if Processing OR if the OTHER option is active (User requirement: disable Normal button if JSON selected)
                    disabled={isProcessing || settings.promptJsonOutput}
                    className={`flex-1 flex items-center justify-center gap-1.5 z-10 text-base font-medium transition-colors duration-200 ${
                        settings.promptJsonOutput 
                           ? 'text-blue-600' 
                           : (isProcessing || !settings.promptJsonOutput) 
                               ? 'text-gray-300 cursor-not-allowed' 
                               : 'text-gray-400 hover:text-gray-600'
                    }`}
                 >
                    JSON
                 </button>
             </div>
        </div>
        
      </div>

      <div className="pt-2 border-t border-blue-100">
        <div className="flex items-center justify-between mb-1">
           <div className="flex items-center gap-2">
             <FileText className="w-4 h-4 text-blue-500" />
             <label className="block text-sm font-medium text-gray-500">
               Custom {settings.outputFormat.toUpperCase()} Filename
             </label>
           </div>
           
           <div className="flex gap-3">
              <button 
                onClick={() => handleChange('outputFormat', 'csv')}
                disabled={isProcessing}
                className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-blue-600 transition-colors"
              >
                {settings.outputFormat === 'csv' 
                  ? <CheckSquare className="w-3.5 h-3.5 text-blue-500" /> 
                  : <Square className="w-3.5 h-3.5 text-gray-300" />}
                CSV
              </button>
              <button 
                onClick={() => handleChange('outputFormat', 'txt')}
                disabled={isProcessing}
                className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-blue-600 transition-colors"
              >
                {settings.outputFormat === 'txt' 
                  ? <CheckSquare className="w-3.5 h-3.5 text-blue-500" /> 
                  : <Square className="w-3.5 h-3.5 text-gray-300" />}
                TXT
              </button>
           </div>
        </div>

        <div className="relative flex items-center">
          <input
            type="text"
            className={`${inputClass} pr-12 !bg-white !text-gray-900`} 
            placeholder="IsaPrompt"
            value={settings.csvFilename}
            onChange={(e) => handleChange('csvFilename', e.target.value)}
            disabled={false} 
          />
          <span className="absolute right-3 text-gray-400 font-medium select-none pointer-events-none">
            .{settings.outputFormat}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PromptSettings;
