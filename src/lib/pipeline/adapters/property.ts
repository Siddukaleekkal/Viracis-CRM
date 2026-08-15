import { PropertyData } from '../types'

/**
 * Live B2B Adapter using OpenStreetMap (Overpass API)
 * Pulls real commercial businesses (restaurants, cafes, car washes, fuel stations)
 */
export async function fetchPropertiesByRegion(): Promise<PropertyData[]> {
  // Bounding box for Greater Richmond Area (Richmond, Short Pump, Glen Allen, Chesterfield, Midlothian, etc.)
  // Format: (South, West, North, East)
  const overpassBbox = '37.33,-77.65,37.76,-77.30'

  // 2. Query Overpass API for commercial businesses in that bounding box
  const query = `
    [out:json];
    (
      node["amenity"~"restaurant|fast_food|cafe|fuel|car_wash"](${overpassBbox});
      way["amenity"~"restaurant|fast_food|cafe|fuel|car_wash"](${overpassBbox});
    );
    // We limit to 50 results per batch so we don't overwhelm the database during MVP testing
    out center 50;
  `

  const overpassUrl = 'https://overpass-api.de/api/interpreter'
  const overpassRes = await fetch(overpassUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'User-Agent': 'Viracis B2B Engine (siddu@viracis.com)'
    },
    body: `data=${encodeURIComponent(query)}`
  })
  
  if (!overpassRes.ok) {
    const text = await overpassRes.text()
    throw new Error(`Overpass API Error: ${overpassRes.status} ${text}`)
  }

  const overpassData = await overpassRes.json()
  const elements = overpassData.elements || []

  // 3. Map OSM data to our PropertyData format
  const properties: PropertyData[] = elements
    .filter((el: any) => el.tags && el.tags.name) // Must have a name
    .map((el: any) => {
      const tags = el.tags
      return {
        address: `${tags['addr:housenumber'] || ''} ${tags['addr:street'] || ''}`.trim(),
        city: tags['addr:city'] || 'Richmond Area',
        state: tags['addr:state'] || 'VA',
        zip: tags['addr:postcode'] || '',
        propertyType: 'commercial',
        businessName: tags.name,
        amenityType: tags.amenity || 'business',
        website: tags.website || tags['contact:website'] || null,
        phone: tags.phone || tags['contact:phone'] || null,
        ownerName: 'Business Owner', // B2B typically addresses the owner/manager
        // We temporarily store the raw OSM email in the phone field or ownerName just to pass it along? 
        // Actually, we can add rawEmail to the return type locally or let the contact adapter handle it.
        _rawEmail: tags.email || tags['contact:email'] || null // Hidden field for the contact adapter
      } as any // using 'any' to pass _rawEmail through
    })

  return properties
}
