'use client'

import { MapPin, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RetreatMapProps {
  address: string
  className?: string
}

export function RetreatMap({ address, className = '' }: RetreatMapProps) {
  // Generate Google Maps link
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`

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

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        asChild
      >
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Open in Google Maps
        </a>
      </Button>
    </div>
  )
}

export default RetreatMap
