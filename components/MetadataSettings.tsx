
import React from 'react';
import { Database, Image, Video, PenTool, FileText } from 'lucide-react';
import { AppSettings, FileType } from '../types';

interface Props {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  isProcessing: boolean;
}

const MetadataSettings: React.FC<Props> = ({ settings, setSettings, isProcessing }) => {
  
  const handleTypeChange = (type: FileType) => {
    if (isProcessing) return; 
    setSettings(prev => ({ ...prev, selectedFileType: type }));
  };

  const handleChange = (field: keyof AppSettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (field: 'titleMin' | 'titleMax' | 'slideKeyword', value: string) => {
    if (value === '') {
      // Allow fields to be empty (visually) by setting state to 0 for controlled input
      setSettings(prev => ({ ...prev, [field]: 0 }));
      return;
    }

    let num = parseInt(value);
    
    if (isNaN(num)) return; 
    
    if (field === 'titleMin') {
      // Allow user to type, but prevent going above 100
      // Lower bound check done onBlur to facilitate typing
      if (num > 100) num = 100; 
    } else if (field === 'titleMax') {
      // Allow user to type, but prevent going above 150
      // Lower bound check done onBlur
      if (num > 150) num = 150; 
    } else if (field === 'slideKeyword') {
      if (num > 50) num = 50; // Max 50
      if (num < 0) num = 0;
    } 
    
    setSettings(prev => ({ ...prev, [field]: num }));
  };

  const handleBlur = (field: 'titleMin' | 'titleMax') => {
      // Enforce strict lower bounds on blur
      if (field === 'titleMin') {
          if (settings.titleMin < 50) {
              setSettings(prev => ({ ...prev, titleMin: 50 }));
          }
      } else if (field === 'titleMax') {
          if (settings.titleMax < 100) {
               setSettings(prev => ({ ...prev, titleMax: 100 }));
          }
      }
  };

  const inputClass = "w-full text-base p-2 border border-gray-300 rounded bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none focus:border-blue-500 transition-all disabled:bg-gray-100 disabled:text-gray-400 placeholder:text-gray-300";

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-200 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Database className="w-4 h-4 text-blue-500" />
        <h2 className="text-base font-semibold text-gray-700 uppercase tracking-wide">Metadata Settings</h2>
      </div>

      <div className="border-t border-blue-100 -my-2"></div>

      <div className="pt-2">
        <label className="block text-sm font-medium text-gray-500 mb-1">File Type</label>
        {/* GAP-3 for File Types */}
        <div className={`flex gap-3 p-1 bg-gray-100 rounded-lg w-full ${isProcessing ? 'opacity-60 cursor-not-allowed' : ''}`}>
          {[FileType.Image, FileType.Video, FileType.Vector].map((type) => {
            const isActive = settings.selectedFileType === type;
            const Icon = type === FileType.Image ? Image : type === FileType.Video ? Video : PenTool;
            return (
              <button
                key={type}
                onClick={() => handleTypeChange(type)}
                disabled={isProcessing}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-base font-medium rounded-md transition-all ${
                  isActive ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'
                } ${isProcessing ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <Icon className="w-4 h-4" />
                {type}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">Custom Title (Optional)</label>
          <input
            type="text"
            className={inputClass}
            placeholder="Priority title..."
            value={settings.customTitle}
            onChange={(e) => handleChange('customTitle', e.target.value)}
            disabled={isProcessing}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">Custom Keyword (Optional)</label>
          <input
            type="text"
            className={inputClass}
            placeholder="Priority keyword..."
            value={settings.customKeyword}
            onChange={(e) => handleChange('customKeyword', e.target.value)}
            disabled={isProcessing}
          />
        </div>
      </div>

      {/* REVERTED TO 2 COLUMNS (50 50) */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-blue-100">
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1" title="Character count range">Title Length (Min-Max)</label>
          <div className="flex items-center gap-2">
              <input
                type="number"
                min="50"
                max="100"
                placeholder="50"
                className={`${inputClass} text-center`}
                value={settings.titleMin === 0 ? '' : settings.titleMin}
                onChange={(e) => handleNumberChange('titleMin', e.target.value)}
                onBlur={() => handleBlur('titleMin')}
                disabled={isProcessing}
              />
              <span className="text-gray-400 font-bold">-</span>
              <input
                type="number"
                min="100"
                max="150"
                placeholder="100"
                className={`${inputClass} text-center`}
                value={settings.titleMax === 0 ? '' : settings.titleMax}
                onChange={(e) => handleNumberChange('titleMax', e.target.value)}
                onBlur={() => handleBlur('titleMax')}
                disabled={isProcessing}
              />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1" title="Target keyword count">Keyword Count</label>
          <input
            type="number"
            min="0"
            max="50"
            placeholder="Max 50"
            className={inputClass}
            value={settings.slideKeyword === 0 ? '' : settings.slideKeyword}
            onChange={(e) => handleNumberChange('slideKeyword', e.target.value)}
            disabled={isProcessing}
          />
        </div>
      </div>

      <div className="pt-2 border-t border-blue-100">
        <div className="flex items-center gap-2 mb-1">
           <FileText className="w-4 h-4 text-blue-500" />
           <label className="block text-sm font-medium text-gray-500">Custom {settings.outputFormat.toUpperCase()} Filename</label>
        </div>
        <div className="relative flex items-center">
          <input
            type="text"
            className={`${inputClass} pr-12 !bg-white !text-gray-900`} 
            placeholder="IsaMetadata"
            value={settings.csvFilename}
            onChange={(e) => handleChange('csvFilename', e.target.value)}
            disabled={false} 
          />
          <span className="absolute right-3 text-gray-400 font-medium select-none pointer-events-none">.{settings.outputFormat}</span>
        </div>
      </div>
    </div>
  );
};

export default MetadataSettings;
