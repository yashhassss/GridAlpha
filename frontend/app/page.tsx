"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import Header from "@/components/Header";
import GridStatusPanel from "@/components/GridStatusPanel";
import ControlCockpit from "@/components/ControlCockpit";
import ArbitrageLedger from "@/components/ArbitrageLedger";
import ChartsSection from "@/components/ChartsSection";
import GlobalMap from "@/components/GlobalMap";
import LiveLedgerTable from "@/components/LiveLedgerTable";
import PdfPreviewModal from '@/components/PdfPreviewModal';
export default function Home() {
  const [data, setData] = useState<any[]>([]);
  const [extraMW, setExtraMW] = useState<number>(0);
  const [targetCompany, setTargetCompany] = useState<string>("Microsoft");
  const [hardware, setHardware] = useState<string>("H100");
  const [targetYear, setTargetYear] = useState<string>("2030");
  const [optimizeData, setOptimizeData] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);


  // NEW: State to control map panning from the ledger
  const [focusLocation, setFocusLocation] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://wutluqusluastfeejceo.supabase.co/functions/v1";

  useEffect(() => {
    fetch(`${API_BASE}/power-alpha`)
      .then((res) => res.json())
      .then((json) => formatChartData(json.data))
      .catch((err) => console.error("Failed to fetch data:", err));
  }, []);

  const formatChartData = (rawData: any[]) => {
    if (!rawData) return;
    const processed = rawData.map(item => ({
      ...item,
      cooling_load: Number((item.true_thermal_demand - item.demand).toFixed(1)),
      trajectory: item.trajectory || []
    }));
    setData(processed);
  };

  const runSimulation = async (val: number, company: string, hwType: string) => {
    setExtraMW(val);
    setTargetCompany(company);
    setHardware(hwType);
    setOptimizeData(null);
    setFocusLocation(null); // Reset focus on new simulation

    const endpoint = val === 0 ? "/power-alpha" : "/simulate";
    const method = val === 0 ? "GET" : "POST";
    const body = val === 0 ? null : JSON.stringify({ target_company: company, extra_mw: val, hardware_type: hwType });

    const res = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body
    });
    const json = await res.json();
    formatChartData(json.data);
  };

  const runOptimization = async () => {
    setIsOptimizing(true);
    setFocusLocation(null); // Reset focus so map zooms back out to global view
    try {
      const res = await fetch(`${API_BASE}/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_company: targetCompany, requested_mw: extraMW, hardware_type: hardware }),
      });
      const json = await res.json();
      setOptimizeData(json);
    } catch (err) { console.error(err); }
    setIsOptimizing(false);
  };

  const downloadFile = async (endpoint: string, filename: string) => {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_company: targetCompany, extra_mw: extraMW, hardware_type: hardware }),
    });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
  }

  const uniqueCompanies = Array.from(new Set(data.map(item => item.company)));
  const targetAsset = data.find(item => item.company === targetCompany);
  const totalArbitrage = optimizeData?.daily_savings_vs_worst || 0;

  // Dynamic Grid Status Calculation
  // Dynamic Grid Status Calculation (Network Health)
  const networkNodes = data.filter(d => d.company === targetCompany);
  const nodeCount = networkNodes.length || 1;

  const criticalNodes = networkNodes.filter(d => (d.risks_by_year?.[targetYear] || 0) > 50).length;
  const elevatedNodes = networkNodes.filter(d => (d.risks_by_year?.[targetYear] || 0) > 20).length;

  const criticalPercent = (criticalNodes / nodeCount) * 100;
  const elevatedPercent = (elevatedNodes / nodeCount) * 100;

  let gridStatus = "STABLE";
  if (criticalPercent >= 15) {
    gridStatus = "CRITICAL"; // 15% or more of the network is crashing
  } else if (criticalPercent >= 5 || elevatedPercent >= 20) {
    gridStatus = "ELEVATED"; // A notable chunk is under stress
  }
  const handleGenerateTearSheet = async () => {
    setIsGeneratingPdf(true);
    try {
      const response = await fetch(`${API_BASE}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_company: targetCompany,
          extra_mw: extraMW,
          hardware_type: hardware
        })
      });

      if (!response.ok) throw new Error("PDF generation failed");

      // Convert the response to a Blob and create a temporary URL
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      setPdfUrl(url);
      setIsPdfModalOpen(true);
    } catch (error) {
      console.error("Error generating tear sheet:", error);
      alert("Failed to generate the Tear Sheet. Please ensure the backend is running.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };
  return (
    <main className="h-screen w-screen bg-[#050505] text-white p-2 md:p-3 font-sans overflow-hidden relative selection:bg-blue-500/30">
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-900/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-orange-900/5 blur-[120px] rounded-full pointer-events-none" />


      <motion.div className="max-w-[1800px] mx-auto h-full relative z-10 flex flex-col gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

        <div className="flex-none">
          <Header
            downloadReport={() => downloadFile("/export", `Grid_Stress_${targetCompany}.csv`)}
            downloadPDF={handleGenerateTearSheet}
            totalArbitrage={totalArbitrage}
            gridStatus={gridStatus}
            isOptimizing={isOptimizing}
          />
        </div>

        <div className="flex-none">
          <ControlCockpit
            extraMW={extraMW} setExtraMW={(val) => runSimulation(val, targetCompany, hardware)}
            targetCompany={targetCompany} setTargetCompany={(val) => runSimulation(extraMW, val, hardware)}
            hardware={hardware} handleHardwareChange={(val) => runSimulation(extraMW, targetCompany, val)}
            targetYear={targetYear} setTargetYear={setTargetYear}
            runOptimization={runOptimization} isOptimizing={isOptimizing} uniqueCompanies={uniqueCompanies}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0 overflow-hidden">
          <div className="lg:col-span-3 h-full min-h-0">
            <GridStatusPanel data={data} targetYear={targetYear} targetCompany={targetCompany} />
          </div>

          <div className="lg:col-span-6 h-full flex flex-col gap-3 min-h-0 overflow-hidden">
            <div className="flex-1 min-h-0">
              {/* MAP RECEIVES focusLocation */}
              <GlobalMap data={data} optimizeData={optimizeData} targetCompany={targetCompany} targetYear={targetYear} focusLocation={focusLocation} />
            </div>
            <div className="flex-1 min-h-0">
              <ChartsSection data={data} targetAsset={targetAsset} targetCompany={targetCompany} />
            </div>
          </div>

          <div className="lg:col-span-3 h-full min-h-0">
            {/* LEDGER SENDS setFocusLocation */}
            <ArbitrageLedger optimizeData={optimizeData} onLocationClick={setFocusLocation} />
          </div>
        </div>

        <div className="flex-none">
          <LiveLedgerTable data={data} />
        </div>
        <PdfPreviewModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          pdfUrl={pdfUrl}
          fileName={`Tear_Sheet_${targetCompany}.pdf`}
        />
      </motion.div>
    </main>
  );
}