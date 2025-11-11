import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting AI update process...');
    
    // Get the absolute path to the incremental ingestion script
    const scriptPath = path.join(process.cwd(), 'ingest_incremental.py');
    
    // Create a readable stream for real-time output
    const stream = new ReadableStream({
      start(controller) {
        // Send initial status
        const initialData = JSON.stringify({
          type: 'status',
          message: '🚀 Starting AI update process...',
          step: 'initializing',
          progress: 0
        }) + '\n\n';
        controller.enqueue(new TextEncoder().encode(`data: ${initialData}`));

        // Spawn the Python process
        const pythonProcess = spawn('./venv/bin/python', [scriptPath], {
          cwd: process.cwd(),
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let outputBuffer = '';
        let currentStep = 'initializing';
        let progress = 0;

        // Handle stdout
        pythonProcess.stdout.on('data', (data) => {
          const output = data.toString();
          outputBuffer += output;
          
          // Parse progress from output
          const stepInfo = parseProgressFromOutput(output);
          if (stepInfo) {
            currentStep = stepInfo.step;
            progress = stepInfo.progress;
          }

          // Send real-time updates
          const updateData = JSON.stringify({
            type: 'progress',
            message: output.trim(),
            step: currentStep,
            progress: progress,
            timestamp: new Date().toISOString()
          }) + '\n\n';
          
          controller.enqueue(new TextEncoder().encode(`data: ${updateData}`));
        });

        // Handle stderr
        pythonProcess.stderr.on('data', (data) => {
          const error = data.toString();
          const errorData = JSON.stringify({
            type: 'error',
            message: error.trim(),
            step: currentStep,
            progress: progress,
            timestamp: new Date().toISOString()
          }) + '\n\n';
          
          controller.enqueue(new TextEncoder().encode(`data: ${errorData}`));
        });

        // Handle process completion
        pythonProcess.on('close', (code) => {
          const summary = extractSummaryFromOutput(outputBuffer);
          
          const finalData = JSON.stringify({
            type: 'complete',
            message: code === 0 ? '✅ AI update completed successfully!' : '❌ AI update failed',
            step: 'completed',
            progress: 100,
            summary: summary,
            exitCode: code,
            timestamp: new Date().toISOString()
          }) + '\n\n';
          
          controller.enqueue(new TextEncoder().encode(`data: ${finalData}`));
          controller.close();
        });

        // Handle process errors
        pythonProcess.on('error', (error) => {
          const errorData = JSON.stringify({
            type: 'error',
            message: `Process error: ${error.message}`,
            step: 'error',
            progress: 0,
            timestamp: new Date().toISOString()
          }) + '\n\n';
          
          controller.enqueue(new TextEncoder().encode(`data: ${errorData}`));
          controller.close();
        });
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    });
    
  } catch (error: any) {
    console.error('❌ AI update failed:', error);
    
    return NextResponse.json({
      success: false,
      message: 'AI update failed',
      error: error.message
    }, { status: 500 });
  }
}

function parseProgressFromOutput(output: string) {
  // Parse different steps and progress from the ingestion output
  if (output.includes('🔧 Setting up clients')) {
    return { step: 'initializing', progress: 5 };
  }
  if (output.includes('📁 Getting all supported files')) {
    return { step: 'scanning_folders', progress: 10 };
  }
  if (output.includes('📂 Found') && output.includes('subfolder')) {
    return { step: 'scanning_subfolders', progress: 15 };
  }
  if (output.includes('🔍 Searching folder')) {
    return { step: 'searching_files', progress: 20 };
  }
  if (output.includes('📊 Total supported files found')) {
    return { step: 'files_found', progress: 25 };
  }
  if (output.includes('🆕 New file:') || output.includes('🔄 Modified file:')) {
    return { step: 'checking_files', progress: 30 };
  }
  if (output.includes('🔄 Processing:')) {
    return { step: 'processing_files', progress: 40 };
  }
  if (output.includes('✅ Downloaded')) {
    return { step: 'downloading', progress: 50 };
  }
  if (output.includes('✅ Extracted') && output.includes('characters')) {
    return { step: 'extracting_text', progress: 60 };
  }
  if (output.includes('🧠 Generating embedding')) {
    return { step: 'generating_embeddings', progress: 70 };
  }
  if (output.includes('📤 Upserting to Pinecone')) {
    return { step: 'storing_vectors', progress: 80 };
  }
  if (output.includes('✅ Successfully upserted')) {
    return { step: 'upserting', progress: 85 };
  }
  if (output.includes('💾 Manifest saved')) {
    return { step: 'saving_manifest', progress: 90 };
  }
  if (output.includes('📊 COMPREHENSIVE INGESTION SUMMARY')) {
    return { step: 'finalizing', progress: 95 };
  }
  
  return null;
}

function extractSummaryFromOutput(output: string) {
  // Look for the final summary in the output
  const summaryMatch = output.match(/📊 COMPREHENSIVE INGESTION SUMMARY[\s\S]*?📁 Files attempted: (\d+)[\s\S]*?✅ Files successful: (\d+)[\s\S]*?❌ Files failed: (\d+)/);
  
  if (summaryMatch) {
    return {
      filesAttempted: parseInt(summaryMatch[1]),
      filesSuccessful: parseInt(summaryMatch[2]),
      filesFailed: parseInt(summaryMatch[3]),
      successRate: `${((parseInt(summaryMatch[2]) / parseInt(summaryMatch[1])) * 100).toFixed(1)}%`
    };
  }
  
  // Fallback: try to extract basic stats
  const successfulMatch = output.match(/✅ Files successful: (\d+)/);
  const failedMatch = output.match(/❌ Files failed: (\d+)/);
  
  if (successfulMatch && failedMatch) {
    const successful = parseInt(successfulMatch[1]);
    const failed = parseInt(failedMatch[1]);
    const total = successful + failed;
    
    return {
      filesAttempted: total,
      filesSuccessful: successful,
      filesFailed: failed,
      successRate: total > 0 ? `${((successful / total) * 100).toFixed(1)}%` : '0%'
    };
  }
  
  return null;
}

export async function GET() {
  return NextResponse.json({
    message: 'AI Update API endpoint. Use POST to trigger ingestion.',
    availableMethods: ['POST']
  });
}
