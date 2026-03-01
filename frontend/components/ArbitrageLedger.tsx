import { TrendingDown, CheckCircle, AlertTriangle, Zap, ThermometerSun, AlertOctagon, MousePointerClick } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// NEW: Added onLocationClick to props
export default function ArbitrageLedger({ optimizeData, onLocationClick }: { optimizeData: any, onLocationClick: (loc: string) => void }) {
  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  return (
    <div className="bg-[#111111] border border-white/10 rounded-xl p-4 h-full overflow-hidden flex flex-col">
      <h2 className="text-sm font-bold text-neutral-300 flex items-center gap-2 mb-4 uppercase tracking-wider flex-none">
        <TrendingDown className="w-4 h-4 text-green-500" /> Algorithmic Execution Ledger
      </h2>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
        <AnimatePresence>
          {optimizeData && optimizeData.status === "success" ? (
            <>
              <div className="mb-4 p-3 bg-green-950/20 border border-green-900/50 rounded-lg">
                <div className="text-[10px] text-green-500 uppercase tracking-widest mb-1 flex justify-between items-center">
                  Daily Alpha vs Network Baseline
                  <MousePointerClick className="w-3 h-3 text-green-500/50" />
                </div>
                <div className="text-2xl font-mono font-black text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.3)]">
                  +{formatCurrency(optimizeData.daily_savings_vs_worst)}
                </div>
              </div>
              
              <div className="space-y-3">
                {optimizeData.allocations.map((alloc: any, idx: number) => (
                  <motion.div 
                    key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                    onClick={() => onLocationClick(alloc.location)} // NEW: Click Handler
                    className="flex flex-col bg-[#0a0a0a] border border-white/5 p-3 rounded-lg text-xs font-mono cursor-pointer hover:border-blue-500/50 hover:bg-white/[0.02] transition-all group"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-500 group-hover:text-blue-400 transition-colors" />
                        <span className="text-neutral-300 font-bold group-hover:text-white transition-colors">{alloc.location}</span>
                      </div>
                      <div className="font-bold text-blue-400 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-blue-500" /> +{alloc.allocated_mw} MW
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2 border-t border-white/10 text-[9px] uppercase tracking-widest mb-1">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-orange-400"><ThermometerSun className="w-3 h-3"/> {alloc.live_temp_c}°C</span>
                        <span className="text-neutral-300">PUE: {alloc.pue}</span>
                      </div>
                      <div className="text-green-500 font-bold group-hover:drop-shadow-[0_0_5px_rgba(74,222,128,0.5)] transition-all">
                        Alpha: {formatCurrency(alloc.route_savings)}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-[9px] uppercase tracking-widest">
                       <span className={`flex items-center gap-1 ${alloc.lmp_active ? 'text-red-400 font-bold' : 'text-neutral-500'}`}>
                          {alloc.lmp_active && <AlertOctagon className="w-3 h-3" />}
                          Rate: ${alloc.live_rate}/kWh {alloc.lmp_active && "(LMP SPIKE)"}
                       </span>
                    </div>

                  </motion.div>
                ))}
                
                 {optimizeData.unallocated_mw > 0 && (
                    <div className="flex justify-between items-center bg-red-950/30 border border-red-900/50 p-3 rounded-lg text-xs font-mono cursor-not-allowed">
                      <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500" /> <span className="text-red-400 font-bold">CAPACITY EXCEEDED</span></div>
                      <div className="font-bold text-red-500">{optimizeData.unallocated_mw} MW FAILED</div>
                    </div>
                  )}
              </div>
            </>
          ) : (
             <div className="h-full flex items-center justify-center text-neutral-600 text-xs uppercase tracking-widest text-center px-4 leading-relaxed">
               Awaiting parameter injection.<br/>
             </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}