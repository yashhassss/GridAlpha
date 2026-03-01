import { Server, DollarSign, ChevronDown, ChevronUp, Filter, ThermometerSun, AlertOctagon } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function LiveLedgerTable({ data }: { data: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterCompany, setFilterCompany] = useState<string>("All");

  const formatCurrency = (value: number) => {
    if (value === undefined || value === null) return "$0";
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  const uniqueCompanies = ["All", ...Array.from(new Set(data.map(d => d.company)))];
  const filteredData = filterCompany === "All" ? data : data.filter(d => d.company === filterCompany);

  return (
    <div className="bg-[#111111] border border-white/10 rounded-xl overflow-hidden shadow-2xl mt-6">
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 border-b border-white/5 bg-[#0a0a0a] flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
            <Server className="w-5 h-5 text-blue-500" />
            <h2 className="text-sm font-bold text-neutral-300 uppercase tracking-wider">
              Live Infrastructure Ledger Database ({filteredData.length} Assets)
            </h2>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Filter className="w-3 h-3 text-neutral-500" />
                <select 
                    className="bg-[#1a1a1a] border border-white/10 text-white rounded px-2 py-1 text-xs outline-none cursor-pointer focus:ring-1 focus:ring-blue-500"
                    value={filterCompany}
                    onChange={(e) => setFilterCompany(e.target.value)}
                >
                    {uniqueCompanies.map(c => <option key={c} value={c}>{c === "All" ? "All Companies" : c}</option>)}
                </select>
            </div>
            
            <div className="text-neutral-500 bg-white/5 p-1 rounded">
                {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} animate={{ height: 250, opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }} className="overflow-hidden"
          >
            <div className="h-[250px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="sticky top-0 bg-[#050505] z-10 shadow-md">
                    <tr className="text-[10px] text-neutral-500 uppercase tracking-widest border-b border-white/10">
                    <th className="py-3 px-6 font-medium">Asset / Location</th>
                    <th className="py-3 px-6 font-medium">Base IT Load</th>
                    <th className="py-3 px-6 font-medium">Live PUE</th>
                    <th className="py-3 px-6 font-medium text-orange-400">Thermal Load</th>
                    <th className="py-3 px-6 font-medium text-blue-400">Live Daily OPEX</th>
                    </tr>
                </thead>
                <tbody className="text-sm">
                    {filteredData.map((item, index) => {
                    return (
                        <tr key={index} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                        <td className="py-3 px-6">
                            <div className="font-bold text-white text-xs">{item.company}</div>
                            <div className="text-[10px] text-neutral-500 mt-0.5 font-mono">{item.location}</div>
                        </td>
                        <td className="py-3 px-6 font-mono text-neutral-300 text-xs">{item.demand} MW</td>
                        
                        {/* LIVE PUE & WEATHER */}
                        <td className="py-3 px-6">
                            <div className="font-mono text-neutral-300 text-xs">{item.pue}</div>
                            <div className="text-[9px] text-orange-400 mt-0.5 flex items-center gap-1 font-mono">
                                <ThermometerSun className="w-3 h-3"/> {item.live_temp_c}°C
                            </div>
                        </td>

                        <td className="py-3 px-6 font-mono font-bold text-orange-400 text-xs">{item.true_thermal_demand} MW</td>
                        
                        {/* LIVE OPEX & LMP SPIKE WARNING */}
                        <td className="py-3 px-6">
                            <div className={`font-mono font-bold text-xs flex items-center gap-1 ${item.lmp_active ? 'text-red-400' : 'text-blue-400'}`}>
                              <DollarSign className={`w-3 h-3 ${item.lmp_active ? 'text-red-500' : 'text-blue-500'}`} />
                              {formatCurrency(item.daily_opex).replace('$', '')}
                            </div>
                            {item.lmp_active && (
                                <div className="text-[9px] text-red-500 font-bold mt-0.5 flex items-center gap-1">
                                    <AlertOctagon className="w-2 h-2"/> LMP GRID SPIKE
                                </div>
                            )}
                        </td>
                        </tr>
                    );
                    })}
                </tbody>
                </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}