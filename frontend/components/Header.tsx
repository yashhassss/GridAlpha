import { FileText } from "lucide-react";

interface HeaderProps {
  downloadReport?: () => void;
  downloadPDF: () => void;
  totalArbitrage?: number;
  gridStatus: string;
  isOptimizing: boolean;
}

export default function Header({ downloadPDF, gridStatus, isOptimizing }: HeaderProps) {
  return (
    <div className="flex flex-col gap-1 mb-1">
      {/* MAIN TOP BAR */}
      <header className="flex items-center justify-between bg-[#111111] border border-white/10 p-3 rounded-t-xl">
        <div className="flex items-center gap-3">
          
          {/* New Minimalist SVG Logo */}
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white drop-shadow-md">
            <path d="M12 2.5L20.5 7.4V16.6L12 21.5L3.5 16.6V7.4L12 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M6 15L11 10L14 13L21 5" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0px 0px 4px rgba(16, 185, 129, 0.6))" }}/>
          </svg>

          <h1 className="text-xl font-bold tracking-tighter text-white flex items-center">
            <span className="text-white">Grid</span>
            <span className="text-slate-400">Alpha</span>
            <span className="text-blue-400/80 font-mono text-xs ml-3 border-l border-white/10 pl-3">Engineered by Yashas</span>
          </h1>
        </div>
        
        <div className="flex gap-3">
          <button onClick={downloadPDF} className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 text-blue-400 px-4 py-2 rounded-lg transition-all font-medium text-xs uppercase tracking-wider">
            <FileText className="w-4 h-4" /> Tear Sheet
          </button>
        </div>
      </header>

      {/* BOTTOM TERMINAL BAR */}
      <div className="bg-[#0a0a0a] border-x border-b border-white/10 p-2 flex justify-end items-center text-[10px] rounded-b-xl font-mono uppercase tracking-widest">
        <div className="flex gap-6">
          <span>
            GLOBAL GRID STABILITY: <span className={`font-bold ${gridStatus === 'CRITICAL' ? 'text-red-400' : gridStatus === 'ELEVATED' ? 'text-orange-400' : 'text-green-400'}`}>{gridStatus}</span>
          </span>
          <span>
            IDENTIFYING ALPHA: <span className={`font-bold ${isOptimizing ? 'text-blue-400 animate-pulse' : 'text-green-400'}`}>{isOptimizing ? 'CALCULATING STRATEGY...' : 'STANDBY'}</span>
          </span>
        </div>
      </div>
    </div>
  );
}