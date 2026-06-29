'use client'

import { useState } from 'react'
import { FileText, ImageIcon, User, Calendar, Activity } from 'lucide-react'

interface RecordCardProps {
  record: {
    id: string
    name: string
    age: number
    tb_status: string
    facility: string
    date: string
    pdf_path?: string
    dcm_path?: string
    hasPdf?: boolean
    hasDcm?: boolean
  }
  onViewDetails: (record: any) => void
}

export default function RecordCard({ record, onViewDetails }: RecordCardProps) {
  const getStatusColor = (status: string) => {
    if (status.toLowerCase().includes('suspected')) return 'status-badge warning'
    if (status.toLowerCase().includes('not')) return 'status-badge stable'
    if (status.toLowerCase().includes('positive')) return 'status-badge critical'
    return 'status-badge pending'
  }

  return (
    <div 
      onClick={() => onViewDetails(record)}
      className="glass-luxury rounded-lg p-5 shadow-luxury hover:shadow-luxury-lg transition-all duration-200 cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center">
            <User className="w-6 h-6 text-brand-700" />
          </div>
          <div>
            <h3 className="font-display font-bold text-text-primary group-hover:text-brand-700 transition-colors">
              {record.name}
            </h3>
            <p className="text-xs text-text-tertiary">ID: {record.id}</p>
          </div>
        </div>
        <span className={getStatusColor(record.tb_status)}>
          {record.tb_status}
        </span>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-text-tertiary" />
          <span className="text-text-secondary">{record.age} yrs</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Activity className="w-4 h-4 text-text-tertiary" />
          <span className="text-text-secondary">{record.facility}</span>
        </div>
      </div>

      {/* Files Available */}
      <div className="flex items-center gap-2 pt-3 border-t border-border-subtle">
        {(record.hasPdf || record.pdf_path) && (
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded text-xs font-medium text-blue-700">
            <FileText className="w-3.5 h-3.5" />
            <span>PDF</span>
          </div>
        )}
        {(record.hasDcm || record.dcm_path) && (
          <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 rounded text-xs font-medium text-purple-700">
            <ImageIcon className="w-3.5 h-3.5" />
            <span>DICOM</span>
          </div>
        )}
        {!record.hasPdf && !record.hasDcm && !record.pdf_path && !record.dcm_path && (
          <span className="text-xs text-text-disabled">No files available</span>
        )}
      </div>
    </div>
  )
}
