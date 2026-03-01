import React from 'react';
import { X, Download } from 'lucide-react';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string | null;
  fileName: string;
}

export default function PdfPreviewModal({ isOpen, onClose, pdfUrl, fileName }: PdfPreviewModalProps) {
  if (!isOpen || !pdfUrl) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 md:p-8 animate-in fade-in duration-200">
      <div className="bg-[#0a0a0a] border border-white/20 rounded-xl shadow-2xl w-full max-w-5xl h-full max-h-[90vh] flex flex-col overflow-hidden relative">
        
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#111111]">
          <h2 className="text-white font-bold tracking-widest text-sm uppercase">
            Executive Tear Sheet Preview
          </h2>
          
          <div className="flex items-center gap-4">
            {/* Custom Download Button */}
            <a 
              href={pdfUrl} 
              download={fileName} 
              className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/50 px-4 py-2 rounded font-bold text-xs uppercase tracking-widest transition-all"
            >
              <Download className="w-4 h-4" /> Download PDF
            </a>
            
            {/* Close Button */}
            <button 
              onClick={onClose} 
              className="text-neutral-500 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 w-full bg-neutral-900">
          {/* #toolbar=0 hides the browser's default PDF controls */}
          <iframe 
            src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`} 
            className="w-full h-full border-none" 
            title="Tear Sheet Preview" 
          />
        </div>
        
      </div>
    </div>
  );
}