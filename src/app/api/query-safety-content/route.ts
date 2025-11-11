import { NextRequest, NextResponse } from 'next/server'
import { Pinecone } from '@pinecone-database/pinecone'
import OpenAI from 'openai'

const openAiApiKey = process.env.OPENAI_API_KEY ?? ''
const pineconeApiKey = process.env.PINECONE_API_KEY ?? ''

const openAIConfigured = Boolean(openAiApiKey)
const pineconeConfigured = Boolean(pineconeApiKey)

const openai = openAIConfigured
  ? new OpenAI({
      apiKey: openAiApiKey
    })
  : null

const pc = pineconeConfigured
  ? new Pinecone({
      apiKey: pineconeApiKey
    })
  : null

export async function POST(request: NextRequest) {
  try {
    if (!openAIConfigured || !pineconeConfigured || !openai || !pc) {
      console.error('OpenAI or Pinecone not configured')
      return NextResponse.json(
        { error: 'Vector search is not configured' },
        { status: 500 }
      )
    }

    const { query, topK = 5, namespace = 'site', filters } = await request.json()

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Get Pinecone index
    const indexName = process.env.PINECONE_INDEX || 'mizel-consulting'
    const index = pc.index(indexName)

    // Generate query embedding (must match the model used for ingestion)
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Search Pinecone
    const searchParams: any = {
      vector: queryEmbedding,
      topK,
      namespace,
      includeMetadata: true,
    };

    if (filters) {
      searchParams.filter = filters;
    }

    const results = await index.query(searchParams)

    // Format results for frontend
    const formattedResults =
      results.matches?.map((match) => ({
        content: match.metadata?.text || '',
        sourceFile: match.metadata?.file_name || 'Unknown',
        folderPath: match.metadata?.folder_path || '',
        mimeType: match.metadata?.mime_type || '',
        relevanceScore: match.score || 0,
        fileId: match.metadata?.file_id || '',
        modifiedTime: match.metadata?.modified_time || ''
      })) || []

    return NextResponse.json({
      results: formattedResults,
      query,
      totalResults: formattedResults.length
    })
  } catch (error) {
    console.error('Error querying safety content:', error)
    return NextResponse.json(
      { error: 'Failed to query safety content' },
      { status: 500 }
    )
  }
}

// GET endpoint for health check
export async function GET() {
  try {
    if (!pineconeConfigured || !pc) {
      console.error('Pinecone not configured')
      return NextResponse.json(
        { error: 'Pinecone is not configured' },
        { status: 500 }
      )
    }

    const indexName = process.env.PINECONE_INDEX || 'mizel-consulting'
    const index = pc.index(indexName)

    const stats = await index.describeIndexStats()

    return NextResponse.json({
      status: 'healthy',
      indexName,
      totalVectors: stats.totalVectorCount,
      dimension: stats.dimension
    })
  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json(
      { error: 'Health check failed' },
      { status: 500 }
    )
  }
}
