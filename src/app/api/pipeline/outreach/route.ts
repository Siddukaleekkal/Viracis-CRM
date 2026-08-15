import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'
import fs from 'fs'
import path from 'path'

export async function POST(req: Request) {
  try {
    const adminSupabase = createAdminClient()
    const executionLog = []

    // Initialize Resend
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'RESEND_API_KEY is missing.' }, { status: 500 })
    }
    const resend = new Resend(apiKey)

    executionLog.push(`Outreach Pipeline Started.`)

    // 1. Fetch all enriched leads with emails
    const { data: leads, error: fetchError } = await adminSupabase
      .from('leads')
      .select('*')
      .eq('status', 'enriched')
      .not('owner_email', 'is', null)

    if (fetchError) {
      throw new Error(`Failed to fetch enriched leads: ${fetchError.message}`)
    }

    if (!leads || leads.length === 0) {
      executionLog.push(`No enriched leads found with email addresses. Stopping outreach.`)
      return NextResponse.json({
        success: true,
        message: 'No leads to process.',
        log: executionLog
      })
    }

    executionLog.push(`Found ${leads.length} enriched leads to process.`)

    // 2. Read the email template
    let emailHtmlTemplate = ''
    try {
      const templatePath = path.join(process.cwd(), 'src', 'app', 'templates', 'outreach-email.html')
      emailHtmlTemplate = fs.readFileSync(templatePath, 'utf8')
    } catch (err: any) {
      executionLog.push(`Warning: Could not read HTML template, falling back to simple text. Error: ${err.message}`)
    }

    // 3. Process each lead
    let successfulSends = 0
    const processedLeadIds: string[] = []

    for (const lead of leads) {
      try {
        const leadEmail = lead.owner_email
        const businessName = lead.owner_name || 'Business Owner'

        // Personalize the template if needed (for now, the template is fairly generic, 
        // but we could replace placeholders if we added them like {{BUSINESS_NAME}})
        const personalizedHtml = emailHtmlTemplate || `
          <p>Hello ${businessName},</p>
          <p>We are reaching out to discuss your online presence.</p>
        `

        // Send Email
        const { data: emailData, error: emailError } = await resend.emails.send({
          from: "Viracis <siddu@viracis.com>", // Make sure to verify viracis.com in Resend
          to: leadEmail,
          subject: "Helping you convert more leads and save time",
          html: personalizedHtml,
        })

        if (emailError) {
          executionLog.push(`Failed to send to ${leadEmail} (${businessName}): ${emailError.message}`)
          continue // Skip updating this lead
        }

        executionLog.push(`Successfully sent email to ${leadEmail} (ID: ${emailData?.id})`)
        processedLeadIds.push(lead.id)
        successfulSends++

      } catch (err: any) {
        executionLog.push(`Unexpected error processing lead ${lead.id}: ${err.message}`)
      }
    }

    // 4. Update Database for successful sends
    if (processedLeadIds.length > 0) {
      const { error: updateError } = await adminSupabase
        .from('leads')
        .update({ status: 'contacted', updated_at: new Date().toISOString() })
        .in('id', processedLeadIds)

      if (updateError) {
        executionLog.push(`ERROR: Failed to update database statuses to 'contacted': ${updateError.message}`)
      } else {
        executionLog.push(`Successfully updated ${processedLeadIds.length} leads to 'contacted' status in database.`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Outreach completed. Sent ${successfulSends} emails.`,
      log: executionLog,
      processedCount: successfulSends
    })

  } catch (error: any) {
    console.error('Outreach Pipeline Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
