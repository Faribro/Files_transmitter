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
        {record.pdf_path && (
          <div className="flex items-center gap-1 text-xs text-text-tertiary">
            <FileText className="w-4 h-4" />
            <span>PDF</span>
          </div>
        )}
        {record.dcm_path && (
          <div className="flex items-center gap-1 text-xs text-text-tertiary">
            <ImageIcon className="w-4 h-4" />
            <span>DICOM</span>
          </div>
        )}
        {!record.pdf_path && !record.dcm_path && (
          <span className="text-xs text-text-disabled">No files available</span>
        )}
      </div>
    </div>
  )
}
