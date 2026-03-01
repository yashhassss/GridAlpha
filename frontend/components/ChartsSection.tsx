import { BarChart, Bar, ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Flame, TrendingUp } from "lucide-react";

export default function ChartsSection({ data, targetCompany, targetAsset }: { data: any[], targetCompany: string, targetAsset: any }) {
  const trajectoryData = targetAsset?.trajectory || [];
  
  const companyData = data.filter(d => d.company === targetCompany);
  const regionalAggregation = companyData.reduce((acc: any, curr: any) => {
    if (!acc[curr.region]) acc[curr.region] = { region: curr.region, demand: 0, cooling_load: 0 };
    acc[curr.region].demand += curr.demand;
    acc[curr.region].cooling_load += curr.cooling_load;
    return acc;
  }, {});
  
  const cleanBarChartData = Object.values(regionalAggregation).map((d: any) => ({
      ...d, demand: Math.round(d.demand), cooling_load: Math.round(d.cooling_load)
  }));

  return (
    // FIX: Removed fixed heights. Using flex flex-col to fill available space
    <div className="flex flex-col lg:flex-row gap-3 h-full">
      <div className="bg-[#111111] border border-white/10 rounded-xl p-3 flex-1 flex flex-col min-h-0">
        <h2 className="flex-none text-xs font-bold text-neutral-300 flex items-center gap-2 mb-2 uppercase tracking-wider">
          <Flame className="w-3 h-3 text-orange-500" /> {targetCompany} TRUE GRID LOAD
        </h2>
        <div className="flex-1 w-full min-h-0 text-[10px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cleanBarChartData} margin={{ bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="region" stroke="#666" tickLine={false} axisLine={false} dy={5} interval={0} tick={{fontSize: 8}} angle={-35} textAnchor="end" />
              <YAxis stroke="#666" tickLine={false} axisLine={false} dx={-5} />
              <Tooltip cursor={{fill: '#ffffff05'}} contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #333' }} wrapperStyle={{fontSize: '10px'}}/>
              <Legend wrapperStyle={{ paddingTop: '0px', fontSize: '9px' }} />
              <Bar dataKey="demand" name="IT Load" stackId="a" fill="#3b82f6" />
              <Bar dataKey="cooling_load" name="Cooling" stackId="a" fill="#f97316" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-[#111111] border border-white/10 rounded-xl p-3 flex-1 flex flex-col min-h-0">
        <h2 className="flex-none text-xs font-bold text-neutral-300 flex items-center gap-2 mb-2 uppercase tracking-wider">
          <TrendingUp className="w-3 h-3 text-blue-400" /> Risk Forecast ({targetCompany})
        </h2>
        <div className="flex-1 w-full min-h-0 text-[10px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trajectoryData}>
              <Area type="monotone" dataKey="p90_load" fill="#f97316" fillOpacity={0.1} stroke="none" activeDot={false} legendType="none" tooltipType="none" />
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="year" stroke="#666" tickLine={false} axisLine={false} dy={5} />
              <YAxis stroke="#666" tickLine={false} axisLine={false} dx={-5} />
              <Tooltip cursor={{stroke: '#ffffff22'}} contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #333' }} wrapperStyle={{fontSize: '10px'}}/>
              <Legend wrapperStyle={{ paddingTop: '0px', fontSize: '9px' }} />
              
              <Area type="monotone" dataKey="p90_load" fill="#f97316" fillOpacity={0.1} stroke="none" activeDot={false} legendType="none" tooltipType="none" />
              <Line type="monotone" dataKey="p90_load" name="Pessimistic" stroke="#f97316" strokeDasharray="3 3" strokeWidth={1} dot={false} />
              <Line type="monotone" dataKey="median_load" name="Expected" stroke="#3b82f6" strokeWidth={2} dot={{r: 1.5}} />
              <Line type="monotone" dataKey="p10_load" name="Optimistic" stroke="#10b981" strokeDasharray="3 3" strokeWidth={1} dot={false} />
              <Line type="stepAfter" dataKey="grid_capacity" name="Grid Limit" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}