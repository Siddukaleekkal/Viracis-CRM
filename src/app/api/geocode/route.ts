import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const rawQ = searchParams.get('q')

  if (!rawQ) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 })
  }

  const cleanQuery = (str: string) => {
    let s = str.trim()
    // Strip unit/suite/apt/# designations
    s = s.replace(/,\s*(suite|ste|apt|apartment|unit|building|bldg|slot|#)\s*[\w-]+/gi, '')
    s = s.replace(/\s+(suite|ste|apt|apartment|unit|building|bldg|slot|#)\s*[\w-]+/gi, '')
    return s
  }

  const queryCandidates = [
    rawQ,
    cleanQuery(rawQ),
  ].filter((q, i, self) => q && self.indexOf(q) === i)

  try {
    for (const query of queryCandidates) {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=us&addressdetails=1&limit=3`, {
        headers: {
          'User-Agent': 'ViracisWizardWashCRM/1.0 (contact@viracis.com)',
          'Accept-Language': 'en',
        },
      })

      if (res.ok) {
        const data = await res.json()
        if (data && data.length > 0) {
          return NextResponse.json(data)
        }
      }
    }

    return NextResponse.json([])
  } catch (error) {
    console.error('Geocoding error:', error)
    return NextResponse.json({ error: 'Internal server error during geocoding' }, { status: 500 })
  }
}

