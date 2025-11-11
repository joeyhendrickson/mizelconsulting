import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseConfigured } from '@/lib/supabaseClient'

export async function GET(request: NextRequest) {
  try {
    if (!supabaseConfigured) {
      console.error('Supabase client not configured')
      return NextResponse.json(
        { success: false, message: 'Supabase is not configured' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const artistId = searchParams.get('artistId')
    const timeRange = searchParams.get('timeRange') || '30d' // 7d, 30d, 90d, 1y

    if (!artistId) {
      return NextResponse.json(
        { success: false, message: 'Artist ID is required' },
        { status: 400 }
      )
    }

    // Calculate date range
    const now = new Date()
    let startDate = new Date()
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      case '90d':
        startDate.setDate(now.getDate() - 90)
        break
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1)
        break
      default:
        startDate.setDate(now.getDate() - 30)
    }

    // Get page views
    const { data: pageViews, error: pageViewsError } = await supabase
      .from('artist_page_views')
      .select('id')
      .eq('artist_id', artistId)
      .gte('timestamp', startDate.toISOString())

    // Get unique visitors (by IP)
    const { data: uniqueVisitors, error: visitorsError } = await supabase
      .from('artist_page_views')
      .select('visitor_ip')
      .eq('artist_id', artistId)
      .gte('timestamp', startDate.toISOString())

    const uniqueVisitorCount = uniqueVisitors 
      ? new Set(uniqueVisitors.map(v => v.visitor_ip)).size
      : 0

    // Get average session time
    const { data: sessions, error: sessionsError } = await supabase
      .from('visitor_sessions')
      .select('total_time_seconds')
      .eq('artist_id', artistId)
      .gte('start_time', startDate.toISOString())
      .not('total_time_seconds', 'is', null)

    // Get audio listening time
    const { data: audioSessions, error: audioError } = await supabase
      .from('audio_listening_sessions')
      .select('duration_seconds')
      .eq('artist_id', artistId)
      .gte('start_time', startDate.toISOString())
      .not('duration_seconds', 'is', null)

    // Get revenue data
    const { data: artistRevenue, error: revenueError } = await supabase
      .from('artist_revenue')
      .select('*')
      .eq('artist_id', artistId)
      .single()

    // Get song-specific revenue
    const { data: songRevenue, error: songRevenueError } = await supabase
      .from('song_revenue')
      .select('*')
      .eq('artist_id', artistId)

    // Get purchase transactions
    const { data: transactions, error: transactionsError } = await supabase
      .from('purchase_transactions')
      .select('*')
      .eq('artist_id', artistId)
      .gte('purchase_date', startDate.toISOString())

    // Calculate totals
    const totalPageViews = pageViews?.length || 0
    const totalVotes = transactions?.length || 0 // Assuming each transaction represents a vote/purchase
    
    const avgSessionTime = sessions && sessions.length > 0 
      ? sessions.reduce((sum, session) => sum + (session.total_time_seconds || 0), 0) / sessions.length
      : 0
    
    const totalAudioTime = audioSessions && audioSessions.length > 0
      ? audioSessions.reduce((sum, session) => sum + (session.duration_seconds || 0), 0)
      : 0

    // Calculate revenue metrics
    const totalRevenue = artistRevenue?.total_revenue || 0
    const totalPayouts = artistRevenue?.total_payouts || 0
    const pendingPayouts = artistRevenue?.pending_payouts || 0
    const platformFees = artistRevenue?.platform_fees || 0
    const platformProfit = platformFees

    // Get conversion rate (purchases per page view)
    const conversionRate = totalPageViews > 0 
      ? (totalVotes / totalPageViews * 100).toFixed(2)
      : '0.00'

    // Calculate song-specific metrics
    const songMetrics = songRevenue?.map(song => ({
      songId: song.song_id,
      totalRevenue: song.total_revenue,
      platformFee: song.platform_fee,
      artistPayout: song.artist_payout,
      purchaseCount: song.purchase_count
    })) || []

    return NextResponse.json({
      success: true,
      data: {
        artistId,
        timeRange,
        // Page Views and Visitors
        pageViews: totalPageViews,
        uniqueVisitors: uniqueVisitorCount,
        votes: totalVotes,
        
        // Time Metrics
        avgSessionTimeSeconds: Math.round(avgSessionTime),
        avgSessionTimeFormatted: formatTime(avgSessionTime),
        totalAudioTimeSeconds: totalAudioTime,
        totalAudioTimeFormatted: formatTime(totalAudioTime),
        
        // Revenue Metrics
        revenue: {
          total: totalRevenue,
          payouts: totalPayouts,
          pending: pendingPayouts,
          platformFees: platformFees,
          platformProfit: platformProfit
        },
        
        // Engagement Metrics
        engagement: {
          avgTimeOnPage: formatTime(avgSessionTime),
          audioEngagement: totalAudioTime > 0 ? formatTime(totalAudioTime) : 'No audio data',
          clickThroughRate: totalPageViews > 0 ? (totalVotes / totalPageViews * 100).toFixed(2) + '%' : '0%'
        },
        
        // Conversion
        conversionRate: `${conversionRate}%`,
        
        // Song-specific data
        songs: songMetrics
      }
    })

  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`
  } else if (seconds < 3600) {
    return `${Math.round(seconds / 60)}m ${Math.round(seconds % 60)}s`
  } else {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }
} 