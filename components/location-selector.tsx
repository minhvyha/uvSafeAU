'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MapPin, Navigation, Search, Loader2, CheckCircle2 } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface LocationData {
  city: string
  state: string
  country: string
  lat: number
  lon: number
}

interface LocationSelectorProps {
  currentLocation: string
  onLocationChange: (location: string, data: LocationData) => void
}

// Popular Australian cities for quick selection
const popularLocations: LocationData[] = [
  { city: 'Sydney', state: 'NSW', country: 'Australia', lat: -33.8688, lon: 151.2093 },
  { city: 'Melbourne', state: 'VIC', country: 'Australia', lat: -37.8136, lon: 144.9631 },
  { city: 'Brisbane', state: 'QLD', country: 'Australia', lat: -27.4698, lon: 153.0251 },
  { city: 'Perth', state: 'WA', country: 'Australia', lat: -31.9523, lon: 115.8613 },
  { city: 'Adelaide', state: 'SA', country: 'Australia', lat: -34.9285, lon: 138.6007 },
  { city: 'Gold Coast', state: 'QLD', country: 'Australia', lat: -28.0167, lon: 153.4000 },
  { city: 'Canberra', state: 'ACT', country: 'Australia', lat: -35.2809, lon: 149.1300 },
  { city: 'Newcastle', state: 'NSW', country: 'Australia', lat: -32.9283, lon: 151.7817 },
]

export function LocationSelector({ currentLocation, onLocationChange }: LocationSelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLocating, setIsLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<string>(currentLocation)

  const filteredLocations = popularLocations.filter((loc) =>
    `${loc.city} ${loc.state}`.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleUseCurrentLocation = () => {
    setIsLocating(true)
    setLocationError(null)

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      setIsLocating(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        
        // Use reverse geocoding to get location name
        // For demo purposes, we'll estimate based on coordinates
        const nearestCity = findNearestCity(latitude, longitude)
        
        const locationData: LocationData = {
          ...nearestCity,
          lat: latitude,
          lon: longitude,
        }

        const locationString = `${nearestCity.city}, ${nearestCity.state}`
        onLocationChange(locationString, locationData)
        setSelectedLocation(locationString)
        setIsLocating(false)
        setOpen(false)
      },
      (error) => {
        let errorMessage = 'Unable to retrieve your location'
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable.'
            break
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.'
            break
        }
        
        setLocationError(errorMessage)
        setIsLocating(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }

  const findNearestCity = (lat: number, lon: number): LocationData => {
    let nearest = popularLocations[0]
    let minDistance = calculateDistance(lat, lon, nearest.lat, nearest.lon)

    for (const city of popularLocations) {
      const distance = calculateDistance(lat, lon, city.lat, city.lon)
      if (distance < minDistance) {
        minDistance = distance
        nearest = city
      }
    }

    return nearest
  }

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371 // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const handleSelectLocation = (location: LocationData) => {
    const locationString = `${location.city}, ${location.state}`
    onLocationChange(locationString, location)
    setSelectedLocation(locationString)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          className="flex items-center gap-2 hover:bg-accent/80 transition-colors"
        >
          <MapPin className="w-4 h-4" />
          <span className="hidden sm:inline">{currentLocation}</span>
          <span className="sm:hidden">Location</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Select Location</DialogTitle>
          <DialogDescription>
            Choose your current location or let us detect it automatically
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Use Current Location Button */}
          <Button
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            size="lg"
          >
            {isLocating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Detecting location...
              </>
            ) : (
              <>
                <Navigation className="w-5 h-5 mr-2" />
                Use My Current Location
              </>
            )}
          </Button>

          {locationError && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
              {locationError}
            </div>
          )}

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for a city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
          </div>

          {/* Popular Locations */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
              {searchQuery ? 'Search Results' : 'Popular Locations'}
            </h3>
            <div className="space-y-2">
              {filteredLocations.length > 0 ? (
                filteredLocations.map((location) => {
                  const locationString = `${location.city}, ${location.state}`
                  const isSelected = locationString === selectedLocation

                  return (
                    <Card
                      key={`${location.city}-${location.state}`}
                      className={`p-4 cursor-pointer transition-all hover:shadow-md hover:border-accent ${
                        isSelected ? 'border-2 border-accent bg-accent/10' : 'border'
                      }`}
                      onClick={() => handleSelectLocation(location)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-muted p-2 rounded-lg">
                            <MapPin className="w-5 h-5 text-foreground" />
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">{location.city}</div>
                            <div className="text-sm text-muted-foreground">{location.state}</div>
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-accent" />}
                      </div>
                    </Card>
                  )
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No locations found</p>
                  <p className="text-sm mt-1">Try a different search term</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
