'use client'

import { motion } from 'framer-motion'

interface HeatmapData {
  facility_name: string
  demographics: number // percentage
  ai_findings: number  // percentage
  symptoms: number     // percentage
  tb_history: number   // percentage
  referrals: number    // percentage
  overall: number      // percentage
}

interface DataQualityHeatmapProps {
  data: HeatmapData[]
}

export default function DataQualityHeatmap({ data }: DataQualityHeatmapProps) {
  const getCellColor = (value: number) => {
    if (value >= 90) return 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30'
    if (value >= 75) return 'bg-teal-500/20 text-teal-700 border-teal-500/30'
    if (value >= 50) return 'bg-amber-500/20 text-amber-700 border-amber-500/30'
    if (value >= 25) return 'bg-orange-500/20 text-orange-700 border-orange-500/30'
    return 'bg-rose-500/20 text-rose-700 border-rose-500/30'
  };

  const getOverallBadge = (value: number) => {
    if (value >= 90) return 'bg-emerald-100 text-emerald-800'
    if (value >= 75) return 'bg-teal-100 text-teal-800'
    if (value >= 50) return 'bg-amber-100 text-amber-800'
    return 'bg-rose-100 text-rose-800'
  };

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-border-subtle p-6 shadow-luxury">
      <div className="mb-4">
        <h3 className="text-lg font-display font-bold text-brand-900">Completeness Heatmap by Facility</h3>
        <p className="text-xs text-text-tertiary">Percentage of fields populated correctly from PDF medical reports</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left py-3 px-4 text-xs font-semibold text-text-secondary border-b border-border-subtle">Facility</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-text-secondary border-b border-border-subtle">Demographics</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-text-secondary border-b border-border-subtle">AI Findings</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-text-secondary border-b border-border-subtle">Symptoms</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-text-secondary border-b border-border-subtle">TB History</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-text-secondary border-b border-border-subtle">Referrals</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-text-secondary border-b border-border-subtle">Overall Score</th>
            </tr>
          </thead>
          <tbody>
            {data.map((facility, idx) => (
              <motion.tr 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                key={facility.facility_name} 
                className="hover:bg-brand-50/20 transition-colors"
              >
                <td className="py-4 px-4 text-sm font-semibold text-text-primary border-b border-border-subtle">
                  {facility.facility_name}
                </td>
                <td className="py-2 px-2 text-center border-b border-border-subtle">
                  <div className={`mx-auto w-16 py-1.5 rounded-lg text-xs font-bold border ${getCellColor(facility.demographics)}`}>
                    {facility.demographics}%
                  </div>
                </td>
                <td className="py-2 px-2 text-center border-b border-border-subtle">
                  <div className={`mx-auto w-16 py-1.5 rounded-lg text-xs font-bold border ${getCellColor(facility.ai_findings)}`}>
                    {facility.ai_findings}%
                  </div>
                </td>
                <td className="py-2 px-2 text-center border-b border-border-subtle">
                  <div className={`mx-auto w-16 py-1.5 rounded-lg text-xs font-bold border ${getCellColor(facility.symptoms)}`}>
                    {facility.symptoms}%
                  </div>
                </td>
                <td className="py-2 px-2 text-center border-b border-border-subtle">
                  <div className={`mx-auto w-16 py-1.5 rounded-lg text-xs font-bold border ${getCellColor(facility.tb_history)}`}>
                    {facility.tb_history}%
                  </div>
                </td>
                <td className="py-2 px-2 text-center border-b border-border-subtle">
                  <div className={`mx-auto w-16 py-1.5 rounded-lg text-xs font-bold border ${getCellColor(facility.referrals)}`}>
                    {facility.referrals}%
                  </div>
                </td>
                <td className="py-4 px-4 text-center border-b border-border-subtle">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getOverallBadge(facility.overall)}`}>
                    {facility.overall}%
                  </span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap items-center justify-end gap-4 mt-6 text-xs text-text-secondary border-t border-border-subtle pt-4">
        <span className="font-medium">Quality Scale:</span>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-rose-500/20 border border-rose-500/30" />
          <span>Critical (&lt;25%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-orange-500/20 border border-orange-500/30" />
          <span>Poor (25-50%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-amber-500/20 border border-amber-500/30" />
          <span>Moderate (50-75%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-teal-500/20 border border-teal-500/30" />
          <span>Good (75-90%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-emerald-500/20 border border-emerald-500/30" />
          <span>Excellent (&gt;90%)</span>
        </div>
      </div>
    </div>
  )
}
