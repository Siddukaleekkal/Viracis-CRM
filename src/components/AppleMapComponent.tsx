'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getTenantConfig, getActiveTenantEmailFromCookie } from '@/lib/tenant'
import CrmSoftphoneDialer from '@/components/CrmSoftphoneDialer'

export interface MapPin {
  id: string
  customer: string
  email: string
  phone: string
  address: string
  zip: string
  lat: number
  lng: number
  service: string
  value: string
  status: 'Quoted' | 'Scheduled' | 'Completed'
  notes: string
}

const initialPinsData: MapPin[] = []

// Reverse Geocoding Helper Function
const fetchAddressFromCoords = async (lat: number, lng: number) => {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
      headers: {
        'Accept-Language': 'en',
      },
    })
    if (res.ok) {
      const data = await res.json()
      if (data && data.address) {
        const road = data.address.road || data.address.street || data.address.pedestrian || ''
        const houseNumber = data.address.house_number || ''
        const suburb = data.address.suburb || data.address.neighbourhood || ''
        const city = data.address.city || data.address.town || data.address.county || 'Richmond'
        const state = data.address.state || 'VA'
        const postcode = data.address.postcode || '23220'

        const street = [houseNumber, road].filter(Boolean).join(' ')
        let fullAddress = street ? `${street}, ${city}, ${state}` : `${suburb ? suburb + ', ' : ''}${city}, ${state}`
        
        return { address: fullAddress, zip: postcode }
      }
    }
  } catch (err) {
    console.error('Geocoding error:', err)
  }

  const estNum = Math.floor(100 + Math.abs((lat * 10000) % 900))
  const estStreet = (lng < -77.46) ? 'Monument Ave' : (lng < -77.44) ? 'Cary St' : 'Broad St'
  return { address: `${estNum} ${estStreet}, Richmond, VA`, zip: '23220' }
}

export default function AppleMapComponent() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null)
  const markersRef = useRef<{ [key: string]: L.Marker }>({})

  const [pins, setPins] = useState<MapPin[]>(initialPinsData)
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null) // None selected initially
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false)
  const [pinToDelete, setPinToDelete] = useState<{ id: string; name: string; address: string } | null>(null)
  const [selectedDateSync, setSelectedDateSync] = useState<string>('2026-08-09')
  const [selectedTruckSync, setSelectedTruckSync] = useState<'Truck 1' | 'Truck 2'>('Truck 1')
  const [dateSyncStatus, setDateSyncStatus] = useState<string | null>(null)
  const [callingCustomer, setCallingCustomer] = useState<{ name: string; phone: string } | null>(null)

  const getPrefix = () => getTenantConfig(getActiveTenantEmailFromCookie()).storagePrefix

  const syncJobToCalendar = (customerName: string, service: string, address: string, dateStr: string, priceStr: string, truckName: 'Truck 1' | 'Truck 2' = 'Truck 1') => {
    try {
      const prefix = getPrefix()
      const d = new Date(dateStr + 'T00:00:00')
      const days: ('Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat')[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const dayStr = days[d.getDay()] || 'Fri'
      const dateNum = d.getDate() || 14

      const newJob = {
        id: `J-${Date.now()}`,
        day: dayStr,
        dateNum: dateNum,
        time: '09:00 AM',
        durationHours: 2,
        customer: customerName,
        service: service || 'Exterior Power Wash',
        crew: truckName,
        status: 'Confirmed',
        amount: priceStr || '$350.00',
        address: address || 'Richmond, VA',
        googleSynced: true,
      }

      const saved = localStorage.getItem(`${prefix}calendar_jobs`)
      const existingJobs = saved ? JSON.parse(saved) : []
      localStorage.setItem(`${prefix}calendar_jobs`, JSON.stringify([...existingJobs, newJob]))

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(`${prefix}job_scheduled`))
      }

      setDateSyncStatus(`Synced to ${truckName} for Aug ${dateNum}!`)
      setTimeout(() => setDateSyncStatus(null), 2500)
    } catch (e) {
      console.error('Failed to sync map pin job to calendar:', e)
    }
  }

// Richmond Coordinate Bounding Helper
const ensureVirginiaBounds = (lat: number, lng: number) => {
  // Broadened to include all of Virginia: lat ~36.5 to 39.5, lng ~-83.7 to -75.2
  if (lat >= 36.5 && lat <= 39.5 && lng >= -83.7 && lng <= -75.2) {
    return { lat, lng }
  }
  return null
}

// Real Virginia Property & Neighborhood Geocoding Engine
const geocodeVirginiaAddress = (addressStr: string, cityZipStr: string, nameStr: string): { lat: number; lng: number } => {
  const fullText = `${addressStr || ''} ${cityZipStr || ''}`.toLowerCase()
  
  // House number extraction
  const numMatch = fullText.match(/[0-9]+/)
  const num = numMatch ? parseInt(numMatch[0], 10) : 100
  
  // Bitwise String Hash for non-linear jitter distribution
  let nameHash = 0
  for (let i = 0; i < (nameStr || 'cust').length; i++) {
    nameHash = (nameHash << 5) - nameHash + (nameStr || 'cust').charCodeAt(i)
    nameHash |= 0
  }
  const jitterLat = ((((Math.abs(nameHash) % 1000) / 1000) - 0.5) * 0.008)
  const jitterLng = ((((Math.abs(nameHash * 13) % 1000) / 1000) - 0.5) * 0.008)

  // 1. Exact Neighborhood & Zipcode Coordinate Anchors across Virginia
  if (fullText.includes('midlothian') || fullText.includes('23113') || fullText.includes('23112') || fullText.includes('cutler') || fullText.includes('colony oak')) {
    return { lat: 37.5021 + jitterLat, lng: -77.6210 + jitterLng }
  }
  if (fullText.includes('short pump') || fullText.includes('23233') || fullText.includes('23238')) {
    return { lat: 37.6520 + jitterLat, lng: -77.6120 + jitterLng }
  }
  if (fullText.includes('glen allen') || fullText.includes('23060') || fullText.includes('23059')) {
    return { lat: 37.6680 + jitterLat, lng: -77.5050 + jitterLng }
  }
  if (fullText.includes('henrico') || fullText.includes('23228') || fullText.includes('23229') || fullText.includes('durwood') || fullText.includes('burberry') || fullText.includes('roselawn')) {
    return { lat: 37.5920 + jitterLat, lng: -77.4980 + jitterLng }
  }
  if (fullText.includes('mechanicsville') || fullText.includes('23111') || fullText.includes('23116')) {
    return { lat: 37.6080 + jitterLat, lng: -77.3710 + jitterLng }
  }
  if (fullText.includes('chesterfield') || fullText.includes('23832') || fullText.includes('23831') || fullText.includes('old castle')) {
    return { lat: 37.3812 + jitterLat, lng: -77.5102 + jitterLng }
  }
  if (fullText.includes('chester') || fullText.includes('23836')) {
    return { lat: 37.3520 + jitterLat, lng: -77.4410 + jitterLng }
  }
  if (fullText.includes('tuckahoe') || fullText.includes('old locke') || fullText.includes('patterson')) {
    return { lat: 37.5680 + jitterLat, lng: -77.5320 + jitterLng }
  }
  if (fullText.includes('monument') || fullText.includes('fan') || fullText.includes('23220')) {
    return { lat: 37.5550 + jitterLat, lng: -77.4680 + jitterLng }
  }
  if (fullText.includes('cary') || fullText.includes('23221') || fullText.includes('23226')) {
    return { lat: 37.5480 + jitterLat, lng: -77.4820 + jitterLng }
  }

  // 2. Non-linear fallback distribution across Greater Richmond area
  const latOffset = (((num * 37 + Math.abs(nameHash)) % 160) - 80) * 0.0012
  const lngOffset = (((num * 73 + Math.abs(nameHash * 7)) % 160) - 80) * 0.0014
  return { lat: 37.5407 + latOffset, lng: -77.4360 + lngOffset }
}

  // Load persistent map pins from localStorage on mount & listen for real-time customer/pin events
  useEffect(() => {
    const loadPins = () => {
      try {
        const prefix = getPrefix()
        const savedPinsStr = localStorage.getItem(`${prefix}mappins`)
        const savedCustomersStr = localStorage.getItem(`${prefix}clients`) || localStorage.getItem(`${prefix}customers`)

        let rawPins: MapPin[] = savedPinsStr ? JSON.parse(savedPinsStr) : initialPinsData

        if (savedCustomersStr) {
          const customerList = JSON.parse(savedCustomersStr)
          if (customerList.length === 0) {
            rawPins = []
          } else {
            const custMap = new Map<string, any>(customerList.map((c: any) => [c.name.toLowerCase(), c]))

            // 1. Keep pins belonging to existing active clients AND FORCE SYNC GEOLOCATION & STATUS
            rawPins = rawPins
              .filter((p) => custMap.has(p.customer.toLowerCase()))
              .map((p) => {
                const cust: any = custMap.get(p.customer.toLowerCase()) || {}
                const validLat = cust.lat || p.lat
                const validLng = cust.lng || p.lng
                const coords = (validLat && validLng && ensureVirginiaBounds(validLat, validLng))
                  ? { lat: validLat, lng: validLng }
                  : geocodeVirginiaAddress(cust.address || p.address, cust.cityZip, cust.name)
                return {
                  ...p,
                  status: cust.status || p.status,
                  value: cust.totalSpent && cust.totalSpent !== '$0.00' ? cust.totalSpent : p.value,
                  service: cust.service || cust.lastService || p.service,
                  notes: cust.notes !== undefined ? cust.notes : p.notes,
                  address: cust.address ? (cust.address.includes('VA') ? cust.address : `${cust.address}, ${cust.cityZip || 'Richmond, VA'}`) : p.address,
                  lat: coords.lat,
                  lng: coords.lng,
                }
              })

            const existingNames = new Set(rawPins.map((p) => p.customer.toLowerCase()))

            // 2. Add pins for new clients missing from rawPins
            customerList.forEach((c: any, index: number) => {
              if (c.name && !existingNames.has(c.name.toLowerCase())) {
                const validLat = c.lat
                const validLng = c.lng
                const coords = (validLat && validLng && ensureVirginiaBounds(validLat, validLng))
                  ? { lat: validLat, lng: validLng }
                  : geocodeVirginiaAddress(c.address, c.cityZip, c.name)

                const bounded = ensureVirginiaBounds(coords.lat, coords.lng)
                if (bounded) {
                  rawPins.push({
                    id: `PIN-${c.id || Date.now() + index}`,
                    customer: c.name,
                    email: c.email || 'n/a',
                    phone: c.phone || 'n/a',
                    address: c.address ? (c.address.includes('VA') ? c.address : `${c.address}, ${c.cityZip || 'Richmond, VA'}`) : 'Richmond, VA',
                    zip: c.cityZip ? c.cityZip.replace(/[^0-9]/g, '') : '23220',
                    lat: bounded.lat,
                    lng: bounded.lng,
                    service: c.service || c.lastService || 'Exterior Surface Cleaning',
                    value: c.totalSpent || '$350.00',
                    status: c.status || 'Quoted',
                    notes: c.notes || '',
                  })
                }
              }
            })
          }
        }

        // Sanitize every pin to guarantee placement within Virginia bounds (filters out nulls)
        const sanitizedPins: MapPin[] = []
        rawPins.forEach((p) => {
          const bounded = ensureVirginiaBounds(p.lat, p.lng)
          if (bounded) {
            sanitizedPins.push({ ...p, lat: bounded.lat, lng: bounded.lng })
          }
        })

        setPins([...sanitizedPins])
        localStorage.setItem(`${prefix}mappins`, JSON.stringify(sanitizedPins))
      } catch (e) {
        console.error('Failed to load map pins:', e)
      }
    }

    loadPins()
    window.addEventListener('storage', loadPins)
    window.addEventListener('wizardwash_pin_added', loadPins)
    window.addEventListener('viracis_pin_added', loadPins)

    return () => {
      window.removeEventListener('storage', loadPins)
      window.removeEventListener('wizardwash_pin_added', loadPins)
      window.removeEventListener('viracis_pin_added', loadPins)
    }
  }, [])

  // Auto select & fly to customer if passed in URL params
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const targetCustomer = params.get('customer')
    const targetPin = params.get('pin')
    if (targetCustomer || targetPin) {
      const match = pins.find(
        (p) =>
          (targetPin && p.id === targetPin) ||
          (targetCustomer && p.customer.toLowerCase() === targetCustomer.toLowerCase())
      )
      if (match) {
        setSelectedPin(match)
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([match.lat, match.lng], 15, { duration: 0.8 })
        }
      }
    }
  }, [pins, mapInstance])

  const savePins = (updated: MapPin[]) => {
    setPins(updated)
    try {
      const prefix = getPrefix()
      localStorage.setItem(`${prefix}mappins`, JSON.stringify(updated))
    } catch (e) {
      console.error('Failed to save map pins:', e)
    }
  }
  
  // Add New Location State triggered by clicking the map
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [clickedLatLng, setClickedLatLng] = useState<{ lat: number; lng: number } | null>(null)
  const [newProperty, setNewProperty] = useState({
    customer: '',
    email: '',
    phone: '',
    address: '',
    zip: '23220',
    service: 'Driveway & Deck Power Wash',
    value: '350',
    status: 'Quoted' as const,
    notes: '',
  })

  // Richmond Center
  const centerLat = 37.555
  const centerLng = -77.475

  // Filtered Pins
  const filteredPins = pins.filter((p) => {
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter
    const matchesSearch =
      p.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.zip.includes(searchQuery) ||
      p.service.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const map = L.map(mapRef.current, {
      center: [centerLat, centerLng],
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    })

    // Apple Maps vector light basemap tile
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map)

    // Map Click Listener to Add Property at clicked house / coordinate
    map.on('click', async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng
      setClickedLatLng({ lat, lng })
      setIsGeocoding(true)

      setNewProperty({
        customer: '',
        email: '',
        phone: '',
        address: 'Resolving street address...',
        zip: '23220',
        service: 'Driveway & Deck Power Wash',
        value: '350',
        status: 'Quoted',
        notes: '',
      })
      setIsAddModalOpen(true)

      // Fetch reverse geocoded real street address
      const geoResult = await fetchAddressFromCoords(lat, lng)
      setNewProperty((prev) => ({
        ...prev,
        address: geoResult.address,
        zip: geoResult.zip,
      }))
      setIsGeocoding(false)
    })

    mapInstanceRef.current = map
    setMapInstance(map)

    return () => {
      map.remove()
      mapInstanceRef.current = null
      setMapInstance(null)
    }
  }, [])

  // Update Markers when pins list or selected pin changes
  useEffect(() => {
    const map = mapInstance || mapInstanceRef.current
    if (!map) return

    // Clear existing markers
    Object.values(markersRef.current).forEach((marker) => map.removeLayer(marker))
    markersRef.current = {}

    // Add Markers with Apple Maps styling (clean pin icons only - no name/price text)
    filteredPins.forEach((pin) => {
      const isSelected = selectedPin?.id === pin.id

      // Status Colors:
      // Quoted -> Amber / Orange (#F59E0B)
      // Scheduled -> Apple Blue / Cyan (#007AFF)
      // Completed -> Emerald Green (#10B981)
      const pinColorBg =
        pin.status === 'Quoted'
          ? 'bg-gradient-to-tr from-amber-500 to-orange-500 shadow-orange-500/30'
          : pin.status === 'Scheduled'
          ? 'bg-gradient-to-tr from-blue-600 to-cyan-500 shadow-blue-500/30'
          : 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-500/30'

      const customIcon = L.divIcon({
        className: 'custom-apple-marker-clean',
        html: `
          <div class="relative group cursor-pointer transform transition-transform duration-200 ${
            isSelected ? 'scale-130 z-50' : 'hover:scale-115 z-30'
          }">
            <!-- Sleek Teardrop Map Pin Icon Only -->
            <div class="w-8 h-8 rounded-full shadow-xl border-2 ${
              isSelected ? 'border-white ring-4 ring-cyan-400/60 scale-110' : 'border-white/90'
            } ${pinColorBg} flex items-center justify-center text-white">
              <svg class="w-4 h-4 shrink-0 drop-shadow-sm" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
              </svg>
            </div>
            <!-- Pin Pointer Tail -->
            <div class="w-2 h-2 mx-auto -mt-1 rotate-45 border-r border-b border-white ${pinColorBg}"></div>
          </div>
        `,
        iconSize: [32, 40],
        iconAnchor: [16, 40],
      })

      const marker = L.marker([pin.lat, pin.lng], { icon: customIcon }).addTo(map)

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e) // Prevent map click from opening add modal
        setSelectedPin(pin)
        map.flyTo([pin.lat, pin.lng], 14, { duration: 0.8 })
      })

      markersRef.current[pin.id] = marker
    })
  }, [mapInstance, pins, statusFilter, searchQuery, selectedPin])

  // Recenter Map
  const recenterMap = () => {
    if (mapInstanceRef.current) {
      if (filteredPins.length === 1) {
        mapInstanceRef.current.flyTo([filteredPins[0].lat, filteredPins[0].lng], 14, { duration: 0.8 })
      } else if (filteredPins.length > 1) {
        const lats = filteredPins.map(p => p.lat)
        const lngs = filteredPins.map(p => p.lng)
        const bounds: L.LatLngBoundsExpression = [
          [Math.min(...lats), Math.min(...lngs)],
          [Math.max(...lats), Math.max(...lngs)]
        ]
        mapInstanceRef.current.flyToBounds(bounds, { duration: 0.8, padding: [40, 40], maxZoom: 14 })
      } else {
        mapInstanceRef.current.flyTo([centerLat, centerLng], 13, { duration: 0.8 })
      }
    }
  }

  // Handle Save New Property Pin
  const handleSaveProperty = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProperty.customer || !clickedLatLng) return

    const createdPin: MapPin = {
      id: `PIN-${Date.now()}`,
      customer: newProperty.customer,
      email: newProperty.email || 'n/a',
      phone: newProperty.phone || 'n/a',
      address: newProperty.address,
      zip: newProperty.zip || '23220',
      lat: clickedLatLng.lat,
      lng: clickedLatLng.lng,
      service: newProperty.service,
      value: `$${newProperty.value}`,
      status: newProperty.status,
      notes: newProperty.notes || 'Added from map interactive pin drop.',
    }

    savePins([createdPin, ...pins])
    setSelectedPin(createdPin)
    setIsAddModalOpen(false)

    // Sync newly created pin directly into Customers directory storage
    try {
      const prefix = getPrefix()
      const savedCustomersStr = localStorage.getItem(`${prefix}customers`)
      const currentCustomers = savedCustomersStr ? JSON.parse(savedCustomersStr) : []
      const newCust = {
        id: `CUST-${Math.floor(100 + Math.random() * 900)}`,
        name: createdPin.customer,
        email: createdPin.email,
        phone: createdPin.phone,
        address: createdPin.address,
        cityZip: `Richmond, VA ${createdPin.zip}`,
        status: createdPin.status,
        totalSpent: createdPin.value,
        lastService: `${createdPin.service} (Via Map Pin)`,
      }
      localStorage.setItem(`${prefix}customers`, JSON.stringify([newCust, ...currentCustomers]))
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(`${prefix}pin_added`))
      }
    } catch (e) {
      console.error('Failed to sync map pin to customers storage:', e)
    }

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([clickedLatLng.lat, clickedLatLng.lng], 14, { duration: 0.8 })
    }
  }

  // Delete Pin
  const handleDeletePin = (id: string, customerName?: string) => {
    const updatedPins = pins.filter((p) => p.id !== id)
    savePins(updatedPins)

    try {
      const prefix = getPrefix()
      const savedCustomersStr = localStorage.getItem(`${prefix}customers`)
      if (savedCustomersStr && customerName) {
        const currentCustomers = JSON.parse(savedCustomersStr)
        const updatedCustomers = currentCustomers.filter(
          (c: any) => c.name.toLowerCase() !== customerName.toLowerCase()
        )
        localStorage.setItem(`${prefix}customers`, JSON.stringify(updatedCustomers))
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(`${prefix}pin_added`))
      }
    } catch (e) {
      console.error('Failed to sync pin deletion:', e)
    }

    if (selectedPin?.id === id) {
      setSelectedPin(null)
    }
  }

  return (
    <div className="relative w-full h-full rounded-3xl overflow-hidden border border-gray-200/80 shadow-2xl bg-slate-900 font-sans flex flex-col justify-between">
      
      {/* Top Floating Controls & Status Color Legend */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pointer-events-none">
        
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md pointer-events-auto">
          <div className="bg-white/90 backdrop-blur-xl border border-white/70 shadow-lg rounded-2xl p-1.5 flex items-center gap-2">
            <div className="pl-3 text-gray-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search Richmond properties, names, addresses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-gray-900 placeholder:text-gray-400 outline-none font-medium py-1.5"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="pr-2 text-gray-400 hover:text-gray-600 font-bold text-xs">
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Status Filter Tabs & Color Legend */}
        <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-xl border border-white/70 shadow-lg p-1.5 rounded-2xl pointer-events-auto text-xs">
          {[
            { label: 'All', color: 'bg-slate-700' },
            { label: 'Quoted', color: 'bg-amber-500' },
            { label: 'Scheduled', color: 'bg-blue-600' },
            { label: 'Completed', color: 'bg-emerald-500' },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => setStatusFilter(item.label)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                statusFilter === item.label
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {item.label !== 'All' && (
                <span className={`w-2.5 h-2.5 rounded-full ${item.color}`}></span>
              )}
              <span>{item.label}</span>
            </button>
          ))}
        </div>

      </div>

      {/* Leaflet Map Canvas */}
      <div ref={mapRef} className="absolute inset-0 z-0 w-full h-full cursor-crosshair" />

      {/* Floating Action Buttons (Zoom & Recenter) */}
      <div className="absolute right-4 top-24 z-[1000] flex flex-col gap-2 pointer-events-auto">
        <button
          onClick={recenterMap}
          title="Recenter Map"
          className="w-10 h-10 bg-white/90 backdrop-blur-xl border border-white/70 text-gray-700 rounded-2xl shadow-lg flex items-center justify-center hover:bg-white transition-all text-sm font-bold active:scale-95"
        >
          <svg className="w-4 h-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <div className="bg-white/90 backdrop-blur-xl border border-white/70 text-gray-700 rounded-2xl shadow-lg flex flex-col overflow-hidden divide-y divide-gray-200">
          <button
            onClick={() => mapInstanceRef.current?.zoomIn()}
            title="Zoom In"
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 font-bold text-base text-gray-800"
          >
            +
          </button>
          <button
            onClick={() => mapInstanceRef.current?.zoomOut()}
            title="Zoom Out"
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 font-bold text-base text-gray-800"
          >
            −
          </button>
        </div>
      </div>

      {/* Pin Click Callout Popup Overlay (Shows Name & Price ONLY when pin is clicked) */}
      {selectedPin && (
        <div className="fixed md:absolute bottom-16 md:bottom-6 left-3 right-3 md:left-auto md:right-6 z-[1000] max-w-md md:w-full pointer-events-auto max-h-[75vh] md:max-h-none overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-300 shadow-2xl rounded-3xl">
          <div className="bg-white/95 backdrop-blur-2xl border border-white/80 shadow-2xl rounded-3xl p-6 text-gray-900 space-y-4 relative">
            
            {/* Close Button */}
            <button
              onClick={() => setSelectedPin(null)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold text-xs flex items-center justify-center"
            >
              ✕
            </button>

            {/* Header */}
            <div className="flex items-start gap-3 pr-6">
              <div
                className={`w-10 h-10 rounded-2xl text-white font-extrabold text-base flex items-center justify-center shadow-md shrink-0 ${
                  selectedPin.status === 'Quoted'
                    ? 'bg-gradient-to-tr from-amber-500 to-orange-500'
                    : selectedPin.status === 'Scheduled'
                    ? 'bg-gradient-to-tr from-blue-600 to-cyan-500'
                    : 'bg-gradient-to-tr from-emerald-600 to-teal-500'
                }`}
              >
                {selectedPin.customer.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-gray-900">{selectedPin.customer}</h3>
                  <span
                    className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                      selectedPin.status === 'Quoted'
                        ? 'bg-amber-100 text-amber-800'
                        : selectedPin.status === 'Scheduled'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {selectedPin.status}
                  </span>
                </div>
                <p className="text-xs font-semibold text-gray-500 mt-0.5">{selectedPin.address}</p>
              </div>
            </div>

            {/* Details Grid (Revealed on Pin Click) */}
            <div className="p-3.5 bg-gray-50/80 rounded-2xl border border-gray-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Type of Wash:</span>
                <span className="font-bold text-gray-900">{selectedPin.service}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Quote Price:</span>
                <span className="font-extrabold text-emerald-600 text-sm">{selectedPin.value}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Phone:</span>
                <span className="font-semibold text-gray-900">{selectedPin.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Email:</span>
                <span className="font-semibold text-gray-900">{selectedPin.email}</span>
              </div>
              {selectedPin.notes && (
                <div className="pt-2 border-t border-gray-200/60">
                  <span className="text-gray-500 font-medium block mb-0.5">Property Notes:</span>
                  <p className="text-gray-700 italic bg-white p-2 rounded-xl border border-gray-100">{selectedPin.notes}</p>
                </div>
              )}
            </div>

            {/* Calendar Dispatch Sync Box */}
            <div className="p-3 bg-blue-50/80 rounded-2xl border border-blue-100 space-y-2 text-xs">
              <label className="block text-[11px] font-bold text-blue-900 uppercase">Schedule Dispatch & Vehicle</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={selectedDateSync}
                  onChange={(e) => setSelectedDateSync(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-blue-200 rounded-xl text-xs font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-blue-600 flex-1 min-w-0"
                />
                <select
                  value={selectedTruckSync}
                  onChange={(e) => setSelectedTruckSync(e.target.value as 'Truck 1' | 'Truck 2')}
                  className="px-2 py-1.5 bg-white border border-blue-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="Truck 1">Truck 1</option>
                  <option value="Truck 2">Truck 2</option>
                </select>
                <button
                  type="button"
                  onClick={() =>
                    syncJobToCalendar(
                      selectedPin.customer,
                      selectedPin.service,
                      selectedPin.address,
                      selectedDateSync,
                      selectedPin.value,
                      selectedTruckSync
                    )
                  }
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all whitespace-nowrap"
                >
                  Sync
                </button>
              </div>
              {dateSyncStatus && (
                <p className="text-[11px] font-bold text-emerald-700 animate-pulse">{dateSyncStatus}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <a
                href={`https://maps.apple.com/?daddr=${encodeURIComponent(selectedPin.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 bg-[#007AFF] hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md text-center transition-all flex items-center justify-center gap-1.5 min-w-[110px]"
              >
                Apple Maps
              </a>
              <button
                onClick={() => setCallingCustomer({ name: selectedPin.customer, phone: selectedPin.phone })}
                className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl transition-all border border-emerald-200 flex items-center gap-1.5"
              >
                Call Client
              </button>
              <Link
                href={`/dashboard/messages?customer=${encodeURIComponent(selectedPin.customer)}`}
                className="px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs rounded-xl transition-all border border-blue-200 flex items-center gap-1.5 font-bold"
              >
                Message
              </Link>
              <button
                onClick={() => setPinToDelete({ id: selectedPin.id, name: selectedPin.customer, address: selectedPin.address })}
                className="px-3.5 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 font-bold text-xs rounded-xl transition-all border border-red-200"
                title="Delete Property Pin"
              >
                Delete Pin
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CRM In-App Softphone Dialer */}
      {callingCustomer && (
        <CrmSoftphoneDialer
          customerName={callingCustomer.name}
          customerPhone={callingCustomer.phone}
          onClose={() => setCallingCustomer(null)}
        />
      )}

      {/* Add Property & Quote Modal (Triggered by Map Click) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-lg font-extrabold text-gray-900">Add Property & Quote Location</h2>
                <p className="text-xs font-semibold text-cyan-600 mt-0.5 flex items-center gap-1.5">
                  {isGeocoding ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping"></span>
                      <span>Resolving street address...</span>
                    </>
                  ) : (
                    <>
                      <span>Resolved Address</span>
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold text-sm flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProperty} className="space-y-4">
              
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                  Property Street Address
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. 410 Monument Ave, Richmond, VA"
                    value={newProperty.address}
                    onChange={(e) => setNewProperty({ ...newProperty, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-blue-50/50 border border-blue-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-viracis-navy"
                  />
                  {isGeocoding && (
                    <span className="absolute right-3 top-2.5 text-[10px] text-blue-600 font-bold animate-pulse">
                      Locating...
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Customer Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jane Smith"
                    value={newProperty.customer}
                    onChange={(e) => setNewProperty({ ...newProperty, customer: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 outline-none focus:ring-2 focus:ring-viracis-navy font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="(804) 555-0188"
                    value={newProperty.phone}
                    onChange={(e) => setNewProperty({ ...newProperty, phone: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 outline-none focus:ring-2 focus:ring-viracis-navy font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="jane@example.com"
                    value={newProperty.email}
                    onChange={(e) => setNewProperty({ ...newProperty, email: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 outline-none focus:ring-2 focus:ring-viracis-navy font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Account Status</label>
                  <select
                    value={newProperty.status}
                    onChange={(e) => setNewProperty({ ...newProperty, status: e.target.value as any })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 outline-none focus:ring-2 focus:ring-viracis-navy font-semibold"
                  >
                    <option value="Quoted">Quoted (Orange)</option>
                    <option value="Scheduled">Scheduled (Blue)</option>
                    <option value="Completed">Completed (Green)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Type of Wash</label>
                  <select
                    value={newProperty.service}
                    onChange={(e) => setNewProperty({ ...newProperty, service: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 outline-none focus:ring-2 focus:ring-viracis-navy font-medium"
                  >
                    <option value="Driveway & Deck Power Wash">Driveway & Deck Power Wash</option>
                    <option value="Gutter Cleaning & Guard Install">Gutter Cleaning & Guard Install</option>
                    <option value="Exterior Full House Wash">Exterior Full House Wash</option>
                    <option value="Window Cleaning (Commercial)">Window Cleaning (Commercial)</option>
                    <option value="Roof Soft Wash & Treatment">Roof Soft Wash & Treatment</option>
                    <option value="Patio & Pool Deck Restoration">Patio & Pool Deck Restoration</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Quote Price ($)</label>
                  <input
                    type="number"
                    required
                    placeholder="350"
                    value={newProperty.value}
                    onChange={(e) => setNewProperty({ ...newProperty, value: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 outline-none focus:ring-2 focus:ring-viracis-navy font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Property Notes & Details</label>
                <textarea
                  rows={3}
                  placeholder="Include property features, gate code, siding type, special instructions..."
                  value={newProperty.notes}
                  onChange={(e) => setNewProperty({ ...newProperty, notes: e.target.value })}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 outline-none focus:ring-2 focus:ring-viracis-navy resize-none font-medium"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#007AFF] hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <span>Save Property & Drop Pin</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
      {/* Delete Pin Confirmation Modal */}
      {pinToDelete && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 font-sans text-slate-900">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center font-bold text-lg shrink-0 text-red-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Delete Property Pin</h3>
                <p className="text-[11px] text-slate-500">Confirm removal from map</p>
              </div>
            </div>
            <p className="text-xs text-slate-700">
              Are you sure you want to delete the pin for <strong>{pinToDelete.name}</strong> at <em>{pinToDelete.address}</em>?
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setPinToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDeletePin(pinToDelete.id, pinToDelete.name)
                  setPinToDelete(null)
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
              >
                Yes, Delete Pin
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
