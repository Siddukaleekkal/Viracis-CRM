import { ContactData } from '../types'

/**
 * Free B2B Contact Enrichment 
 * Extracts email from OSM data or simulates scraping the business website
 */
export async function skipTraceOwner(property: any): Promise<ContactData> {
  // Simulate the latency of a web scraper visiting the business website
  if (property.website) {
    await new Promise(resolve => setTimeout(resolve, 600))
  }

  // 1. Did OpenStreetMap already have their public email?
  let email = property._rawEmail || null

  // 2. If not, but they have a website, we pretend our scraper found a generic one
  // In a real production scraper, we would fetch(property.website) and regex for /mailto:/
  if (!email && property.website) {
    // Make up an info@ email based on their domain for the MVP demonstration
    try {
      const domain = new URL(property.website).hostname.replace('www.', '')
      email = `info@${domain}`
    } catch (e) {
      email = null
    }
  }

  return {
    email,
    phone: property.phone || null,
    emailIsValid: !!email // We assume public business emails are valid
  }
}
