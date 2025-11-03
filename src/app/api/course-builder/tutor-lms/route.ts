import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// Helper function to log to file for debugging
function logToFile(message: string, data?: any) {
  const logMessage = `[${new Date().toISOString()}] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}\n`
  const logFile = path.join(process.cwd(), 'tutor-lms-debug.log')
  fs.appendFileSync(logFile, logMessage)
  console.log(message, data)
}

interface TutorLMSConfig {
  baseUrl: string
  consumerKey: string
  consumerSecret: string
}

interface CourseStructure {
  course: {
    title: string
    description: string
    difficulty: string
    duration: number
    totalPages: number
    totalQuizzes: number
  }
  topics: Array<{
    id: string
    title: string
    description: string
    order: number
    lessons: Array<{
      id: string
      title: string
      content: string
      order: number
      pageNumber: number
      hasQuiz: boolean
      videoUrl?: string
    }>
  }>
  quizzes: Array<{
    id: string
    title: string
    description: string
    order: number
    pageNumber: number
    questions: Array<{
      id: string
      question: string
      type: string
      options?: string[]
      correctAnswer: string
      explanation: string
    }>
  }>
}

export async function POST(request: NextRequest) {
  try {
    const { courseStructure } = await request.json()
    logToFile('Tutor LMS - Course structure received:', courseStructure?.course?.title)
    logToFile('Course structure validation:', {
      hasCourse: !!courseStructure?.course,
      hasTopics: !!courseStructure?.topics,
      hasQuizzes: !!courseStructure?.quizzes,
      topicsCount: courseStructure?.topics?.length || 0,
      quizzesCount: courseStructure?.quizzes?.length || 0
    })
    
    // Get Tutor LMS configuration from environment
    const tutorConfig: TutorLMSConfig = {
      baseUrl: process.env.TUTOR_BASE_URL || '',
      consumerKey: process.env.TUTOR_API_KEY || '',
      consumerSecret: process.env.TUTOR_API_SECRET || ''
    }

    logToFile('Tutor LMS Config:', {
      baseUrl: tutorConfig.baseUrl ? 'Set' : 'Missing',
      consumerKey: tutorConfig.consumerKey ? 'Set' : 'Missing',
      consumerSecret: tutorConfig.consumerSecret ? 'Set' : 'Missing'
    })

    if (!tutorConfig.baseUrl || !tutorConfig.consumerKey || !tutorConfig.consumerSecret) {
      console.error('Tutor LMS configuration missing:', {
        baseUrl: !!tutorConfig.baseUrl,
        consumerKey: !!tutorConfig.consumerKey,
        consumerSecret: !!tutorConfig.consumerSecret
      })
      return NextResponse.json({
        success: false,
        message: 'Tutor LMS configuration missing. Please configure TUTOR_BASE_URL, TUTOR_API_KEY, and TUTOR_API_SECRET in your environment variables.'
      }, { status: 500 })
    }

    // Validate course structure
    if (!courseStructure?.course || !courseStructure?.course?.title || !courseStructure?.course?.description) {
      console.error('Invalid course structure:', courseStructure)
      return NextResponse.json({
        success: false,
        message: 'Invalid course structure: missing required course fields'
      }, { status: 400 })
    }

    // Step 1: Create the main course
    logToFile('Course data being sent to Tutor LMS:', courseStructure.course)
    const course = await createCourse(tutorConfig, courseStructure.course)
    logToFile('Course creation result:', course)
    
    if (!course.success) {
      console.error('Course creation failed:', course.error)
      return NextResponse.json({
        success: false,
        message: 'Failed to create course',
        error: course.error
      }, { status: 500 })
    }

    const courseId = course.data.id

    // Step 2: Create topics and lessons
    for (const topic of courseStructure.topics) {
      const topicResult = await createTopic(tutorConfig, courseId, topic)
      if (!topicResult.success) {
        console.error(`Failed to create topic: ${topic.title}`, topicResult.error)
        continue
      }

      const topicId = topicResult.data.id

      // Create lessons for this topic
      for (const lesson of topic.lessons) {
        const lessonResult = await createLesson(tutorConfig, topicId, lesson)
        if (!lessonResult.success) {
          console.error(`Failed to create lesson: ${lesson.title}`, lessonResult.error)
          continue
        }
      }
    }

    // Step 3: Create quizzes
    for (const quiz of courseStructure.quizzes) {
      const quizResult = await createQuiz(tutorConfig, courseId, quiz)
      if (!quizResult.success) {
        console.error(`Failed to create quiz: ${quiz.title}`, quizResult.error)
        continue
      }
    }

    // Get the course permalink
    const courseDetails = await getCourseDetails(tutorConfig, courseId)
    const permalink = courseDetails.success ? courseDetails.data.permalink : ''

    return NextResponse.json({
      success: true,
      courseId,
      permalink,
      message: 'Course created successfully in Tutor LMS'
    })

  } catch (error: any) {
    console.error('Error creating course in Tutor LMS:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to create course in Tutor LMS',
      error: error.message
    }, { status: 500 })
  }
}

async function createCourse(config: TutorLMSConfig, courseData: any) {
  try {
    logToFile('Creating course in Tutor LMS:', courseData.title)
    logToFile('API URL:', `${config.baseUrl}/wp-json/tutor/v1/courses`)
    
    // Validate and sanitize course data
    const sanitizedCourseData = {
      title: courseData.title || 'Untitled Course',
      description: courseData.description || 'No description provided',
      difficulty: courseData.difficulty || 'beginner',
      duration: parseInt(courseData.duration) || 1,
      totalPages: parseInt(courseData.totalPages) || 10,
      totalQuizzes: parseInt(courseData.totalQuizzes) || 1
    }
    
    logToFile('Sanitized course data:', sanitizedCourseData)
    
    const requestBody = {
      post_title: sanitizedCourseData.title,
      post_content: sanitizedCourseData.description,
      post_status: 'draft',
      post_author: 1, // Default to user ID 1 (admin)
      course_level: sanitizedCourseData.difficulty,
      course_duration: sanitizedCourseData.duration,
      course_benefits: `Comprehensive ${sanitizedCourseData.difficulty} level training course`,
      course_requirements: 'Basic understanding of workplace safety',
      course_material_includes: `${sanitizedCourseData.totalPages} pages of content, ${sanitizedCourseData.totalQuizzes} quizzes`
    }
    
    logToFile('Request body:', requestBody)
    
    const response = await fetch(`${config.baseUrl}/wp-json/tutor/v1/courses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64')}`
      },
      body: JSON.stringify(requestBody)
    })

    logToFile('Tutor LMS response status:', response.status)
    const data = await response.json()
    logToFile('Tutor LMS response data:', data)
    
    if (!response.ok) {
      console.error('Tutor LMS API error:', data)
      return { success: false, error: data.message || data.code || 'Failed to create course' }
    }
    
    // Check if the response indicates success
    if (data.code && data.code !== 'tutor_create_course') {
      console.error('Tutor LMS unexpected response code:', data.code)
      return { success: false, error: data.message || 'Unexpected response from Tutor LMS' }
    }

    return { success: true, data }
  } catch (error: any) {
    console.error('Tutor LMS API exception:', error)
    return { success: false, error: error.message }
  }
}

async function createTopic(config: TutorLMSConfig, courseId: string, topicData: any) {
  try {
    const response = await fetch(`${config.baseUrl}/wp-json/tutor/v1/courses/${courseId}/topics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64')}`
      },
      body: JSON.stringify({
        title: topicData.title,
        content: topicData.description,
        course_id: courseId,
        topic_order: topicData.order
      })
    })

    const data = await response.json()
    
    if (!response.ok) {
      return { success: false, error: data.message || 'Failed to create topic' }
    }

    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

async function createLesson(config: TutorLMSConfig, topicId: string, lessonData: any) {
  try {
    const response = await fetch(`${config.baseUrl}/wp-json/tutor/v1/topics/${topicId}/lessons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64')}`
      },
      body: JSON.stringify({
        title: lessonData.title,
        content: lessonData.content,
        topic_id: topicId,
        lesson_order: lessonData.order,
        post_type: 'tutor_lesson',
        video_url: lessonData.videoUrl || ''
      })
    })

    const data = await response.json()
    
    if (!response.ok) {
      return { success: false, error: data.message || 'Failed to create lesson' }
    }

    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

async function createQuiz(config: TutorLMSConfig, courseId: string, quizData: any) {
  try {
    // First create the quiz
    const quizResponse = await fetch(`${config.baseUrl}/wp-json/tutor/v1/courses/${courseId}/quizzes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64')}`
      },
      body: JSON.stringify({
        title: quizData.title,
        content: quizData.description,
        course_id: courseId,
        quiz_order: quizData.order,
        time_limit: 30, // 30 minutes default
        pass_mark: 70, // 70% pass mark
        max_attempts: 3
      })
    })

    const quizResult = await quizResponse.json()
    
    if (!quizResponse.ok) {
      return { success: false, error: quizResult.message || 'Failed to create quiz' }
    }

    const quizId = quizResult.id

    // Then create questions for the quiz
    for (const question of quizData.questions) {
      await createQuizQuestion(config, quizId, question)
    }

    return { success: true, data: quizResult }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

async function createQuizQuestion(config: TutorLMSConfig, quizId: string, questionData: any) {
  try {
    const response = await fetch(`${config.baseUrl}/wp-json/tutor/v1/quizzes/${quizId}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64')}`
      },
      body: JSON.stringify({
        question_title: questionData.question,
        question_type: questionData.type,
        question_description: questionData.explanation,
        answer_options: questionData.options || [],
        correct_answer: questionData.correctAnswer
      })
    })

    const data = await response.json()
    
    if (!response.ok) {
      console.error(`Failed to create question: ${questionData.question}`, data.message)
    }

    return { success: response.ok, data }
  } catch (error: any) {
    console.error('Error creating quiz question:', error)
    return { success: false, error: error.message }
  }
}

async function getCourseDetails(config: TutorLMSConfig, courseId: string) {
  try {
    const response = await fetch(`${config.baseUrl}/wp-json/tutor/v1/courses/${courseId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64')}`
      }
    })

    const data = await response.json()
    
    if (!response.ok) {
      return { success: false, error: data.message || 'Failed to get course details' }
    }

    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
