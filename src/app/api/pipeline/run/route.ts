import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchPropertiesByRegion } from '@/lib/pipeline/adapters/property'
import { skipTraceOwner } from '@/lib/pipeline/adapters/contact'
import { scoreProperty } from '@/lib/pipeline/scorer'
import { EnrichedLead } from '@/lib/pipeline/types'

export async function POST(req: Request) {
  try {
    const adminSupabase = createAdminClient()
    const executionLog = []

    // 1. Fetch the active tenant so we can write real data to their account
    const { data: tenants, error: tenantError } = await adminSupabase.from('tenants').select('id').limit(1)
    
    if (tenantError || !tenants || tenants.length === 0) {
      return NextResponse.json({ success: false, error: 'No active tenant found to write leads to.' }, { status: 400 })
    }
    
    const activeTenantId = tenants[0].id
    const targetRegion = 'Greater Richmond Area (Short Pump, Midlothian, Glen Allen, etc)'

    executionLog.push(`Pipeline Started for Tenant: ${activeTenantId}`)
    executionLog.push(`Targeting Region: ${targetRegion}`)

    // --- PIPELINE EXECUTION ---

    // Step 1: FIND (Fetch free commercial properties from OpenStreetMap)
    const rawProperties = await fetchPropertiesByRegion()
    executionLog.push(`Found ${rawProperties.length} commercial businesses in ${targetRegion}.`)

    // Step 2: SCORE (Filter out low-value businesses)
    const scoredLeads = rawProperties
      .map(scoreProperty)
      .filter((lead): lead is NonNullable<typeof lead> => lead !== null)
    
    executionLog.push(`${scoredLeads.length} businesses passed the scoring threshold.`)

    // Step 3: ENRICH (Scrape websites for emails)
    const enrichedLeads: EnrichedLead[] = []
    
    for (const lead of scoredLeads) {
      const contactData = await skipTraceOwner(lead)
      
      enrichedLeads.push({
        ...lead,
        ...contactData,
        outreachChannel: contactData.emailIsValid ? 'email' : 'mail'
      })
    }

    executionLog.push(`Successfully enriched ${enrichedLeads.length} commercial leads.`)

    // Step 4: SAVE TO LIVE DATABASE
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY === 'placeholder') {
      executionLog.push('Database saving skipped (No valid SUPABASE_SERVICE_ROLE_KEY found).')
    } else {
      // Map the B2B data to the existing database schema
      const dbInsertPayload = enrichedLeads.map(lead => ({
        tenant_id: activeTenantId,
        property_address: lead.address,
        property_city: lead.city,
        property_state: lead.state,
        property_zip: lead.zip,
        property_type: lead.amenityType, // Maps 'restaurant', 'fuel', etc.
        owner_name: lead.businessName,   // Maps business name into owner_name
        owner_email: lead.email,
        owner_mailing_address: lead.phone, // We use mailing_address field to store phone number for now to avoid schema migrations
        lead_score: lead.score,
        status: 'enriched'
      }))

      const { error: insertError } = await adminSupabase.from('leads').insert(dbInsertPayload)

      if (insertError) {
        throw new Error(`Failed to write leads to database: ${insertError.message}`)
      }

      executionLog.push(`SUCCESS: Wrote ${enrichedLeads.length} leads to the live database!`)
    }

    return NextResponse.json({
      success: true,
      message: 'Nightly B2B pipeline executed successfully.',
      log: executionLog,
      results: enrichedLeads
    })

  } catch (error: any) {
    console.error('Pipeline Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
