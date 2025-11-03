import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { queryPineconeContent, generateEnhancedCourse, createCourseInTutorLMS } from '@/lib/course-builder-helpers'

// Helper function to log to file for debugging
function logToFile(message: string, data?: any) {
  const logMessage = `[${new Date().toISOString()}] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}\n`
  const logFile = path.join(process.cwd(), 'course-builder-debug.log')
  fs.appendFileSync(logFile, logMessage)
  console.log(message, data)
}

export async function POST(request: NextRequest) {
  try {
    const courseData = await request.json()
    
    // Create a readable stream for real-time progress updates
    const stream = new ReadableStream({
      start(controller) {
        // Send initial status
        const initialData = JSON.stringify({
          type: 'status',
          message: '🚀 Starting course creation process...',
          step: 'initializing',
          progress: 0
        }) + '\n\n'
        controller.enqueue(new TextEncoder().encode(`data: ${initialData}`))

        // Execute the course creation pipeline
        executeCourseCreation(courseData, controller)
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    })
    
  } catch (error: any) {
    console.error('❌ Course creation failed:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Course creation failed',
      error: error.message
    }, { status: 500 })
  }
}

async function executeCourseCreation(courseData: any, controller: ReadableStreamDefaultController) {
  try {
    logToFile('Course creation started with data:', courseData)
    
    // Step 1: Query Pinecone for relevant content (direct function call)
    await sendProgress(controller, 'querying_pinecone', 10, '🔍 Searching knowledge base for relevant content...')
    
    const contentResult = await queryPineconeContent({
      title: courseData.title,
      description: courseData.description,
      duration: 3,
      difficulty: courseData.difficulty
    })

    if (!contentResult.success) {
      logToFile('Content query failed:', contentResult)
      throw new Error(contentResult.message || 'Failed to query course content')
    }

    await sendProgress(controller, 'content_found', 20, `📊 Found ${contentResult.content.total} relevant documents`)

    // Step 2: Generate enhanced course structure with AI (direct function call)
    await sendProgress(controller, 'generating_content', 30, '🤖 Generating comprehensive course structure and content...')
    
    const generateResult = await generateEnhancedCourse({
      courseData,
      content: contentResult.content
    })

    if (!generateResult.success) {
      console.error('Generate course failed:', generateResult)
      logToFile('Generate result failed:', generateResult)
      throw new Error(generateResult.message || 'Failed to generate course structure')
    }
    
    console.log('Generate course result:', generateResult)

    await sendProgress(controller, 'content_generated', 50, `✅ Generated ${generateResult.statistics.totalTopics} topics, ${generateResult.statistics.totalLessons} lessons, ${generateResult.statistics.totalQuizzes} quizzes`)

    // Step 3: Create enhanced course in Tutor LMS (direct function call)
    await sendProgress(controller, 'creating_course', 60, '📚 Creating comprehensive course in Tutor LMS...')
    
    logToFile('Sending to Tutor LMS:', {
      courseTitle: generateResult.courseStructure?.course?.title,
      topicsCount: generateResult.courseStructure?.topics?.length,
      lessonsCount: generateResult.courseStructure?.topics?.reduce((sum: number, topic: any) => sum + topic.lessons.length, 0),
      quizzesCount: generateResult.courseStructure?.topics?.filter((t: any) => t.quiz).length,
      hasOverview: !!generateResult.courseStructure?.course?.overview,
      hasLearningObjectives: generateResult.courseStructure?.course?.learningObjectives?.length > 0
    })
    
    const tutorResult = await createCourseInTutorLMS(generateResult.courseStructure, courseData.generateFeaturedImage)
    logToFile('Tutor LMS result:', tutorResult)
    
    if (!tutorResult.success) {
      console.error('Tutor LMS failed:', tutorResult)
      throw new Error(tutorResult.message || 'Failed to create course in Tutor LMS')
    }

    await sendProgress(controller, 'course_created', 80, '✅ Comprehensive course created successfully in Tutor LMS')

    // Step 4: Finalize
    await sendProgress(controller, 'finalizing', 90, '🎯 Finalizing course setup with all content...')
    
    // Simulate finalization steps
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Step 6: Complete
    const finalData = JSON.stringify({
      type: 'complete',
      message: '🎉 Comprehensive course created successfully!',
      step: 'completed',
      progress: 100,
      course: {
        id: tutorResult.courseId,
        title: courseData.title,
        permalink: tutorResult.permalink,
        statistics: generateResult.statistics,
        hasFullContent: true,
        includesCurriculum: true,
        includesQuizzes: true,
        includesMetadata: true
      },
      timestamp: new Date().toISOString()
    }) + '\n\n'
    
    controller.enqueue(new TextEncoder().encode(`data: ${finalData}`))
    controller.close()

  } catch (error: any) {
    console.error('Error in course creation pipeline:', error)
    
    const errorData = JSON.stringify({
      type: 'error',
      message: `❌ Course creation failed: ${error.message}`,
      step: 'error',
      progress: 0,
      timestamp: new Date().toISOString()
    }) + '\n\n'
    
    controller.enqueue(new TextEncoder().encode(`data: ${errorData}`))
    controller.close()
  }
}

async function sendProgress(controller: ReadableStreamDefaultController, step: string, progress: number, message: string) {
  const data = JSON.stringify({
    type: 'progress',
    message,
    step,
    progress,
    timestamp: new Date().toISOString()
  }) + '\n\n'
  
  controller.enqueue(new TextEncoder().encode(`data: ${data}`))
  
  // Small delay to make progress visible
  await new Promise(resolve => setTimeout(resolve, 500))
}
