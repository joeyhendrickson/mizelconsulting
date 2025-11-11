import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? ''

const courseSearchSupabaseConfigured = Boolean(supabaseUrl && supabaseServiceKey)

const supabase: SupabaseClient = courseSearchSupabaseConfigured
  ? createClient(supabaseUrl, supabaseServiceKey)
  : new Proxy(
      {},
      {
        get() {
          throw new Error(
            'Supabase environment variables are not configured. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
          )
        }
      }
    ) as SupabaseClient

export async function POST(request: NextRequest) {
  try {
    if (!courseSearchSupabaseConfigured) {
      console.error('Supabase client not configured for course search')
      return NextResponse.json(
        { error: 'Supabase is not configured' },
        { status: 500 }
      )
    }

    const { query, email, mode = 'default', sessionId } = await request.json()

    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 })
    }

    // Extract keywords from the search query
    const { data: keywordsData, error: keywordsError } = await supabase
      .rpc('extract_keywords', { search_text: query })

    const keywords = keywordsError ? [] : (keywordsData || [])

    // Store the search query for analytics
    const { data: searchRecord, error: analyticsError } = await supabase
      .from('course_search_analytics')
      .insert({
        search_query: query,
        keywords: keywords,
        user_email: email || null,
        source_page: request.headers.get('referer') || 'unknown',
        search_mode: mode,
        session_id: sessionId || null,
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      })
      .select()
      .single()

    if (analyticsError) {
      console.error('Analytics error:', analyticsError)
      // Don't fail the request if analytics fails
    } else if (searchRecord && keywords.length > 0) {
      // Store individual keywords
      const keywordInserts = keywords.map((keyword: any, index: number) => ({
        keyword: keyword,
        search_id: searchRecord.id,
        position: index + 1,
        is_primary: index === 0
      }))

      const { error: keywordError } = await supabase
        .from('course_search_keywords')
        .insert(keywordInserts)

      if (keywordError) {
        console.error('Keyword tracking error:', keywordError)
      }
    }

    // Handle enterprise manager mode
    if (mode === 'manager') {
      const enterpriseResponse = generateEnterpriseResponse(query)
      return NextResponse.json({
        success: true,
        courses: [],
        query,
        message: enterpriseResponse,
        mode: 'manager'
      })
    }

    // Search courses based on query
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('*')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)
      .limit(5)

    if (coursesError) {
      console.error('Courses search error:', coursesError)
      return NextResponse.json({ error: 'Failed to search courses' }, { status: 500 })
    }

    // Update the search record with results count
    if (searchRecord) {
      const { error: updateError } = await supabase
        .from('course_search_analytics')
        .update({ results_count: courses?.length || 0 })
        .eq('id', searchRecord.id)

      if (updateError) {
        console.error('Error updating search results count:', updateError)
      }
    }

    return NextResponse.json({
      success: true,
      courses: courses || [],
      query,
      message: `Found ${courses?.length || 0} courses matching "${query}"`
    })

  } catch (error) {
    console.error('Course search error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateEnterpriseResponse(query: string): string {
  const lowerQuery = query.toLowerCase()
  
  // Custom Training Programs
  if (lowerQuery.includes('custom') || lowerQuery.includes('tailored') || lowerQuery.includes('bespoke')) {
    return `Great! I'd love to help you with custom training programs. We offer:

🎯 **Customized Curriculum**: Tailored specifically for your industry, company culture, and compliance requirements
📅 **Flexible Scheduling**: On-site training, virtual sessions, or hybrid delivery options
👥 **Dedicated Account Management**: Your personal training coordinator
📊 **Progress Tracking**: Comprehensive reporting and analytics dashboard
💰 **Bulk Pricing**: Volume discounts for large teams (50+ employees)

What industry are you in, and how many employees need training? I can provide a customized quote based on your specific needs.`
  }
  
  // LMS Integration
  if (lowerQuery.includes('lms') || lowerQuery.includes('learning management') || lowerQuery.includes('platform') || lowerQuery.includes('integration')) {
    return `Excellent choice! Our Learning Management System integration includes:

🔗 **Advanced LMS Integration**: Seamless integration with your existing systems (SCORM, xAPI compliant)
📱 **Mobile-Friendly Platform**: Access training anywhere, anytime
📈 **Employee Progress Tracking**: Real-time analytics and completion reports
🤖 **Automated Compliance Reporting**: Generate reports for audits and compliance
🛠️ **24/7 Technical Support**: Dedicated support team for your organization
🎓 **White-Label Options**: Custom branding to match your company identity

What's your current LMS system? I can provide specific integration details and pricing for your setup.`
  }
  
  // Volume Training
  if (lowerQuery.includes('volume') || lowerQuery.includes('bulk') || lowerQuery.includes('many employees') || lowerQuery.includes('large team')) {
    return `Perfect! For volume training, we offer significant savings:

👥 **Volume Discounts**: Up to 40% off for teams of 100+ employees
🏢 **Enterprise Packages**: Comprehensive training bundles for entire organizations
📚 **Course Libraries**: Access to our full catalog of 50+ safety courses
🎯 **Custom Bundles**: Mix and match courses to meet your specific needs
📊 **Centralized Management**: One dashboard to manage all employee training
💼 **Dedicated Account Manager**: Your personal point of contact

How many employees do you need to train? I can provide detailed pricing and create a custom training package for your organization.`
  }
  
  // Pricing
  if (lowerQuery.includes('price') || lowerQuery.includes('cost') || lowerQuery.includes('quote') || lowerQuery.includes('pricing')) {
    return `I'd be happy to provide pricing information! Our enterprise solutions include:

💰 **Volume Pricing**: Starting at $25/employee for teams of 100+
🎯 **Custom Programs**: $150-300 per hour for on-site training
🔗 **LMS Integration**: $2,000-5,000 setup + $10-20/employee/month
📊 **Reporting & Analytics**: Included with all enterprise packages
🛠️ **Support**: 24/7 technical support included

**Next Steps:**
1. Tell me your team size and training needs
2. I'll create a custom quote
3. Schedule a demo with our enterprise team

What's your company size and what type of training are you most interested in?`
  }
  
  // General enterprise response
  return `Thank you for your interest in our Enterprise Training Solutions! Here's what we offer:

🎯 **Custom Training Programs**
• Tailored curriculum for your industry
• Flexible scheduling and delivery
• Dedicated account management
• Progress tracking and reporting
• Volume discounts available

🔗 **Learning Management System**
• Advanced LMS integration
• Employee progress tracking  
• Automated compliance reporting
• Mobile-friendly platform
• 24/7 technical support

**To get started, please tell me:**
• Your company size and industry
• What type of training you need
• Your preferred delivery method (on-site, virtual, or hybrid)

I'll create a customized proposal for your organization. What would you like to know more about?`
}

export async function GET(request: NextRequest) {
  try {
    if (!courseSearchSupabaseConfigured) {
      console.error('Supabase client not configured for course search analytics')
      return NextResponse.json(
        { error: 'Supabase is not configured' },
        { status: 500 }
      )
    }

    // Get search analytics for admin dashboard
    const { data: analytics, error } = await supabase
      .from('course_search_analytics')
      .select('*')
      .order('search_timestamp', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Analytics fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      analytics: analytics || []
    })

  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
