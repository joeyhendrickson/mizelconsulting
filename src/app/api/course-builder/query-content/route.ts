import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { Pinecone } from '@pinecone-database/pinecone'

export async function POST(request: NextRequest) {
  try {
    const { title, description, duration, difficulty } = await request.json()
    
    const openaiApiKey = process.env.OPENAI_API_KEY
    const pineconeApiKey = process.env.PINECONE_API_KEY

    if (!openaiApiKey || !pineconeApiKey) {
      return NextResponse.json({
        success: false,
        message: 'Missing API keys'
      }, { status: 500 })
    }

    // Initialize clients
    const openai = new OpenAI({ apiKey: openaiApiKey })
    const pc = new Pinecone({ apiKey: pineconeApiKey })
    const index = pc.index('mizelconsulting')

    // Create comprehensive query for course content
    const courseQuery = `${title} ${description} ${difficulty} level training course content safety procedures regulations standards best practices`

    // Generate embedding for the course query
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: courseQuery
    })

    const queryEmbedding = embeddingResponse.data[0].embedding

    // Query Pinecone for relevant content
    const queryResponse = await index.namespace('site').query({
      vector: queryEmbedding,
      topK: Math.min(50, duration * 10), // More content for longer courses
      includeMetadata: true
    })

    if (!queryResponse.matches || queryResponse.matches.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No relevant content found in knowledge base'
      }, { status: 404 })
    }

    // Process and organize the content
    const relevantContent = queryResponse.matches
      .filter(match => match.score && match.score > 0.3) // Filter by relevance
      .map(match => ({
        text: match.metadata?.text || '',
        fileName: match.metadata?.file_name || 'Unknown',
        score: match.score,
        fileId: match.metadata?.file_id || '',
        mimeType: match.metadata?.mime_type || ''
      }))
      .filter(content => content.text.length > 50) // Filter out very short content

    // Group content by file type for better organization
    const contentByType = {
      documents: relevantContent.filter(c => c.mimeType.includes('wordprocessingml') || c.mimeType.includes('msword')),
      presentations: relevantContent.filter(c => c.mimeType.includes('presentation')),
      pdfs: relevantContent.filter(c => c.mimeType.includes('pdf')),
      other: relevantContent.filter(c => !c.mimeType.includes('wordprocessingml') && !c.mimeType.includes('presentation') && !c.mimeType.includes('pdf'))
    }

    // Calculate content statistics
    const totalContent = relevantContent.length
    const avgScore = relevantContent.reduce((sum, c) => sum + (c.score || 0), 0) / totalContent
    const contentLength = relevantContent.reduce((sum, c) => sum + c.text.length, 0)

    return NextResponse.json({
      success: true,
      content: {
        total: totalContent,
        averageScore: avgScore,
        totalLength: contentLength,
        byType: contentByType,
        allContent: relevantContent
      },
      query: courseQuery,
      duration: duration
    })

  } catch (error: any) {
    console.error('Error querying course content:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to query course content',
      error: error.message
    }, { status: 500 })
  }
}
