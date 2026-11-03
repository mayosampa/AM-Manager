import React from 'react';
import { Globe, Loader2, Sparkles } from 'lucide-react';

interface RfafSourceBarProps {
  urlLabel: string;
  urlPlaceholder: string;
  urlValue: string;
  onUrlChange: (url: string) => void;
  onFetchUrl: () => void;
  loadingUrl: boolean;
  pasteLabel: string;
  pastePlaceholder: string;
  pasteValue: string;
  onPasteChange: (val: string) => void;
  onParsePaste: () => void;
  parseButtonLabel?: string;
}

export const RfafSourceBar: React.FC<RfafSourceBarProps> = ({
  urlLabel,
  urlPlaceholder,
  urlValue,
  onUrlChange,
  onFetchUrl,
  loadingUrl,
  pasteLabel,
  pastePlaceholder,
  pasteValue,
  onPasteChange,
  onParsePaste,
  parseButtonLabel = 'Procesar',
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 bg-[#0E0E0E] border border-[#1F1F1F] rounded-lg p-3.5">
      <div>
        <label className="text-[11px] font-medium text-[#A1A1AA] block mb-1">{urlLabel}</label>
        <div className="flex gap-2">
          <input
            type="url"
            value={urlValue}
            onChange={e => onUrlChange(e.target.value)}
            placeholder={urlPlaceholder}
            className="flex-1 h-8 bg-[#050505] border border-[#262626] rounded px-2.5 text-[#EDEDED] text-[12px] focus:border-emerald-500/50 focus:outline-none"
          />
          <button
            type="button"
            onClick={onFetchUrl}
            disabled={loadingUrl || !urlValue.trim()}
            className="h-8 px-3 rounded bg-[#171717] hover:bg-[#222222] border border-[#2E2E2E] text-[#EDEDED] font-medium flex items-center gap-1.5 disabled:opacity-40 cursor-pointer shrink-0"
          >
            {loadingUrl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5 text-emerald-400" />}
            <span>Extraer Web</span>
          </button>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-medium text-[#A1A1AA] block mb-1">{pasteLabel}</label>
        <div className="flex gap-2">
          <textarea
            rows={1}
            value={pasteValue}
            onChange={e => onPasteChange(e.target.value)}
            placeholder={pastePlaceholder}
            className="flex-1 h-8 py-1.5 bg-[#050505] border border-[#262626] rounded px-2.5 text-[#EDEDED] text-[12px] resize-none focus:border-emerald-500/50 focus:outline-none"
          />
          <button
            type="button"
            onClick={onParsePaste}
            disabled={!pasteValue.trim()}
            className="h-8 px-3 rounded bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-semibold flex items-center gap-1.5 disabled:opacity-40 cursor-pointer shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{parseButtonLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
