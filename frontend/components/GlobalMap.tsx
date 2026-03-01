// @ts-nocheck
import React, { useState, useEffect } from "react";
import { ComposableMap, Geographies, Geography, Marker, Line, ZoomableGroup } from "react-simple-maps";
import { Plus, Minus } from "lucide-react";

const geoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

const hubData = [
  { name: "Virginia", code: "IAD", coords: [-77.48, 39.04] },
  { name: "Texas", code: "DFW", coords: [-98.49, 29.42] },
  { name: "Oregon", code: "PDX", coords: [-121.18, 45.59] },
  { name: "Ohio", code: "CMH", coords: [-82.99, 39.96] },
  { name: "São Paulo", code: "GRU", coords: [-46.63, -23.55] },
  { name: "Montreal", code: "YUL", coords: [-73.56, 45.50] },
  { name: "Ireland", code: "DUB", coords: [-6.26, 53.34] },
  { name: "Frankfurt", code: "FRA", coords: [8.68, 50.11] },
  { name: "London", code: "LHR", coords: [-0.12, 51.50] },
  { name: "Cape Town", code: "CPT", coords: [18.42, -33.92] },
  { name: "Tokyo", code: "HND", coords: [139.69, 35.68] },
  { name: "Singapore", code: "SIN", coords: [103.81, 1.35] },
  { name: "Sydney", code: "SYD", coords: [151.20, -33.86] },
  { name: "Mumbai", code: "BOM", coords: [72.87, 19.07] },
  { name: "Seoul", code: "ICN", coords: [126.97, 37.56] },
  { name: "Reykjavik", code: "KEF", coords: [-21.82, 64.12] },
];

const getBaseCoordinates = (locationString: string) => {
  const found = hubData.find(h => locationString && locationString.includes(`(${h.code})`));
  return found ? found.coords : [0, 0];
};

const HQ_COORD = [-74.006, 40.7128]; // Wall Street HQ

export default function GlobalMap({ data, optimizeData, targetCompany, targetYear, focusLocation }: { data: any[], optimizeData: any, targetCompany: string, targetYear: string, focusLocation?: string | null }) {
  const isOptimizing = optimizeData && optimizeData.status === "success";
  const [position, setPosition] = useState({ coordinates: [0, 20], zoom: 1 });

  useEffect(() => {
    if (focusLocation) {
      const coords = getBaseCoordinates(focusLocation);
      if (coords[0] !== 0 || coords[1] !== 0) {
        setPosition({ coordinates: coords, zoom: 4 });
      }
    } else {
      setPosition({ coordinates: [0, 20], zoom: 1 });
    }
  }, [focusLocation]);

  const handleZoomIn = () => {
    if (position.zoom >= 8) return;
    setPosition(pos => ({ ...pos, zoom: pos.zoom * 1.5 }));
  };

  const handleZoomOut = () => {
    if (position.zoom <= 1) return;
    setPosition(pos => ({ ...pos, zoom: pos.zoom / 1.5 }));
  };

  return (
    <div className="bg-[#111111] border border-white/10 rounded-xl p-4 h-full relative overflow-hidden flex flex-col group">
      <h2 className="text-sm font-bold text-neutral-300 flex items-center gap-2 mb-2 uppercase tracking-wider z-10">
         Global Infrastructure Routing Map
      </h2>
      
      {/* NEW: Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={handleZoomIn} className="bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-white/10 text-white p-1.5 rounded transition-colors shadow-lg">
          <Plus className="w-4 h-4" />
        </button>
        <button onClick={handleZoomOut} className="bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-white/10 text-white p-1.5 rounded transition-colors shadow-lg">
          <Minus className="w-4 h-4" />
        </button>
      </div>

      <div className="absolute inset-0 bg-blue-900/5 pointer-events-none" />
      
      <div className="flex-1 w-full h-full min-h-[300px]">
        <ComposableMap projection="geoMercator" projectionConfig={{ scale: 120 }} width={800} height={400} style={{ width: "100%", height: "100%", outline: "none" }}>
          <ZoomableGroup zoom={position.zoom} center={position.coordinates as [number, number]} onMoveEnd={(pos) => setPosition(pos)}>
            <Geographies geography={geoUrl}>
                {({ geographies }) => geographies.map((geo) => (
                    <Geography key={geo.rsmKey} geography={geo} fill="#1a1d24" stroke="#2d3748" strokeWidth={0.5} style={{ default: { outline: "none" }, hover: { fill: "#2a2d34", outline: "none" }, pressed: { outline: "none" } }} />
                ))}
            </Geographies>

            {hubData.map((hub) => (
                <Marker key={`label-${hub.code}`} coordinates={hub.coords as [number, number]}>
                    <text y={-10} style={{ fontFamily: "sans-serif", fill: "#888", fontSize: "6px", textAnchor: "middle", pointerEvents: "none", fontWeight: "bold" }}>
                        {hub.name.toUpperCase()}
                    </text>
                </Marker>
            ))}

            {data.map((item, idx) => {
                const baseCoords = getBaseCoordinates(item.location);
                if (baseCoords[0] === 0 && baseCoords[1] === 0) return null; 
                
                // FIX: Tightened the scatter multiplier from 0.8 down to 0.4
                const radius = Math.sqrt(idx % 20) * 0.4; 
                const angle = (idx * 137.5) * (Math.PI / 180);
                const finalCoords = [baseCoords[0] + (Math.cos(angle) * radius), baseCoords[1] + (Math.sin(angle) * radius)];
                
                const isTarget = item.company === targetCompany;
                const currentRisk = item.risks_by_year?.[targetYear] || 0;
                const isCritical = currentRisk > 50;

                return (
                <Marker key={`marker-${idx}`} coordinates={finalCoords as [number, number]}>
                    <circle r={isTarget ? 1.5 : 1} fill={isTarget ? (isCritical ? "#ef4444" : "#3b82f6") : "#333333"} opacity={isTarget ? 0.9 : 0.2} />
                </Marker>
                );
            })}

            {isOptimizing && optimizeData.allocations.map((alloc: any, idx: number) => {
                const destBaseCoords = getBaseCoordinates(alloc.location);
                if (destBaseCoords[0] === 0 && destBaseCoords[1] === 0) return null;

                const lineOffsetX = (idx % 3 - 1) * 1.5; 
                const lineOffsetY = ((idx * 2) % 3 - 1) * 1.5;
                const targetCoords = [destBaseCoords[0] + lineOffsetX, destBaseCoords[1] + lineOffsetY];

                return (
                <React.Fragment key={`arc-${idx}`}>
                    <Line from={HQ_COORD as [number, number]} to={targetCoords as [number, number]} stroke="#10b981" strokeWidth={1.5} strokeLinecap="round" style={{ fill: "none", opacity: 0.6, filter: "drop-shadow(0px 0px 4px rgba(16, 185, 129, 0.8))" }} className="dash-animation" />
                    <Marker coordinates={targetCoords as [number, number]}>
                       <circle r={2.5} fill="#10b981" filter="drop-shadow(0px 0px 3px #10b981)" />
                    </Marker>
                </React.Fragment>
                );
            })}

            {isOptimizing && (
                <Marker coordinates={HQ_COORD as [number, number]}>
                    <circle r={3} fill="#ffffff" filter="drop-shadow(0px 0px 4px #ffffff)" />
                    <text y={-6} style={{ fontFamily: "monospace", fill: "#fff", fontSize: "7px", fontWeight: "bold", textAnchor: "middle" }}>HQ</text>
                </Marker>
            )}

          </ZoomableGroup>
        </ComposableMap>
      </div>
    </div>
  );
}