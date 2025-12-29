'use client'

import { MapPin, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RetreatMapProps {
  latitude?: number | null
  longitude?: number | null
  address?: string | null
  className?: string
}

export function RetreatMap({ latitude, longitude, address, className = '' }: RetreatMapProps) {
  const hasCoordinates = latitude && longitude

  // Generate Google Maps links
  const googleMapsSearchUrl = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : null

  const googleMapsCoordUrl = hasCoordinates
    ? `https://www.google.com/maps?q=${latitude},${longitude}`
    : null

  const googleMapsUrl = googleMapsCoordUrl || googleMapsSearchUrl

  // If we have coordinates, show embedded map
  if (hasCoordinates) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="border rounded-lg overflow-hidden">
          <iframe
            src={`https://www.google.com/maps?q=${latitude},${longitude}&output=embed&z=14`}
            width="100%"
            height="300"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Location map"
          />
        </div>

        {address && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{address}</span>
          </div>
        )}

        {googleMapsUrl && (
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
        )}
      </div>
    )
  }

  // If we only have address (no coordinates), show link to Google Maps
  if (address) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-start gap-2">
          <MapPin className="w-5 h-5 shrink-0 mt-0.5 text-muted-foreground" />
          <span>{address}</span>
        </div>

        {googleMapsSearchUrl && (
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <a
              href={googleMapsSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View on Google Maps
            </a>
          </Button>
        )}
      </div>
    )
  }

  // No location data
  return null
}

export default RetreatMap
