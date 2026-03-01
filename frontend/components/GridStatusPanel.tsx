import { Server, AlertTriangle, CheckCircle } from "lucide-react";

export default function GridStatusPanel({ data, targetYear, targetCompany }: { data: any[], targetYear: string, targetCompany: string }) {
  
  // NEW: Filter the data to ONLY show the selected company
  const filteredData = data.filter(item => item.company === targetCompany);

  return (
    <div className="bg-[#111111] border border-white/10 rounded-xl p-4 h-full flex flex-col overflow-hidden">
      <h2 className="flex-none text-sm font-bold text-neutral-300 flex items-center gap-2 mb-3 uppercase tracking-wider">
        <Server className="w-4 h-4" /> Crash Predictor ({targetCompany})
      </h2>
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2 min-h-0">
        {filteredData.map((item, idx) => {
           const currentRisk = item.risks_by_year?.[targetYear] || 0;
           const isCritical = currentRisk > 50;
           return (
          <div key={idx} className={`p-2 rounded-lg border ${isCritical ? 'bg-red-950/20 border-red-900/50' : 'bg-[#0a0a0a] border-white/5'} flex justify-between items-center transition-all hover:border-white/20`}>
            <div>
              <div className="font-bold text-xs text-white">{item.company}</div>
              {/* Added font-mono to make the authentic AZ codes look official */}
              <div className="text-[10px] text-neutral-500 font-mono mt-0.5">{item.location}</div>
            </div>
            <div className="text-right">
              <div className={`font-mono font-bold text-xs ${isCritical ? 'text-red-500' : 'text-green-500'}`}>
                {currentRisk}% Risk
              </div>
            </div>
          </div>
        )})}
      </div>
    </div>
  );
}