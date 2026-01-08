'use client'

import { MapPin } from 'lucide-react'

interface RetreatMapProps {
  address: string
  className?: string
}

export function RetreatMap({ address, className = '' }: RetreatMapProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="border rounded-lg overflow-hidden">
        <iframe
          src={`https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed&z=14`}
          width="100%"
          height="300"
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Location map"
        />
      </div>

      <div className="flex items-start gap-2 text-sm text-muted-foreground">
        <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
        <span>{address}</span>
      </div>
    </div>
  )
}

export default RetreatMap
