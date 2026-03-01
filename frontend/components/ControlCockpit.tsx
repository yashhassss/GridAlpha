import { Zap, Network, Microchip, Calendar } from "lucide-react";

interface ControlCockpitProps {
  extraMW: number;
  setExtraMW: (val: number) => void;
  targetCompany: string;
  setTargetCompany: (val: string) => void;
  hardware: string;
  handleHardwareChange: (val: string) => void;
  targetYear: string;
  setTargetYear: (val: string) => void;
  runOptimization: () => void;
  isOptimizing: boolean;
  uniqueCompanies: string[];
}

export default function ControlCockpit({
  extraMW, setExtraMW, targetCompany, setTargetCompany,
  hardware, handleHardwareChange, targetYear, setTargetYear,
  runOptimization, isOptimizing, uniqueCompanies
}: ControlCockpitProps) {
  return (
    <div className="bg-[#111111] border border-white/10 rounded-xl p-4 w-full flex flex-col xl:flex-row items-center justify-between gap-4 shadow-2xl">
      
      <select 
        className="bg-[#0a0a0a] border border-white/10 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-900 outline-none cursor-pointer font-bold text-sm w-full xl:w-auto"
        value={targetCompany} onChange={(e) => setTargetCompany(e.target.value)}
      >
        {uniqueCompanies.map((comp, idx) => (
          <option key={idx} value={comp as string}>{comp as string} Network</option>
        ))}
      </select>

      <div className="flex items-center gap-2 bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-2 w-full xl:w-auto">
        <Microchip className="w-4 h-4 text-neutral-400" />
        <select 
          className="bg-transparent text-white outline-none cursor-pointer font-bold text-sm w-full"
          value={hardware} 
          onChange={(e) => handleHardwareChange(e.target.value)}
        >
          <option value="A100" className="bg-neutral-900">NVIDIA A100 (Legacy)</option>
          <option value="H100" className="bg-blue-900">NVIDIA H100 (Current)</option>
          <option value="AMD_MI300X" className="bg-red-900">AMD MI300X (Compute)</option>
          <option value="B200" className="bg-orange-900">NVIDIA B200 (Air-Cooled)</option>
          <option value="GB200_NVL72" className="bg-purple-900">GB200 NVL72 (Liquid-Cooled)</option>
          <option value="TPU_v5p" className="bg-emerald-900">Google TPU v5p (ASIC)</option>
        </select>
      </div>

      {/* EXPANDED TIMELINE CHOICES */}
      <div className="flex items-center gap-2 bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-2 w-full xl:w-auto">
        <Calendar className="w-4 h-4 text-neutral-400" />
        <select 
          className="bg-transparent text-white outline-none cursor-pointer font-bold text-sm w-full"
          value={targetYear} 
          onChange={(e) => setTargetYear(e.target.value)}
        >
          <option value="2028" className="bg-neutral-900">2028 Risk Profile</option>
          <option value="2030" className="bg-neutral-900">2030 Risk Profile</option>
          <option value="2032" className="bg-neutral-900">2032 Risk Profile</option>
          <option value="2034" className="bg-neutral-900">2034 Risk Profile</option>
          <option value="2036" className="bg-neutral-900">2036 Risk Profile</option>
        </select>
      </div>

      <div className="flex-1 flex items-center gap-4 bg-[#0a0a0a] p-2 rounded-lg border border-white/10 w-full">
        <Zap className="w-4 h-4 text-neutral-400 ml-2" />
        <input 
          type="range" min="0" max="5000" step="50" value={extraMW}
          onChange={(e) => setExtraMW(Number(e.target.value))}
          className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        <div className="bg-blue-500/10 px-4 py-1 rounded border border-blue-500/20 text-blue-400 font-mono font-bold text-sm min-w-[90px] text-center">
          +{extraMW} MW
        </div>
      </div>
      
      <button 
        onClick={runOptimization}
        disabled={extraMW === 0 || isOptimizing}
        className={`w-full xl:w-auto px-6 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-all uppercase tracking-wider text-xs whitespace-nowrap ${
          extraMW === 0 
            ? 'bg-neutral-900 text-neutral-600 border border-neutral-800 cursor-not-allowed' 
            : 'bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/50 shadow-[0_0_15px_rgba(74,222,128,0.1)]'
        }`}
      >
        <Network className="w-4 h-4" />
        {isOptimizing ? 'Calculating...' : 'Run Arbitrage Optimizer'}
      </button>
    </div>
  );
}