// Helper functions for course builder that can be called directly without HTTP
import OpenAI from 'openai'
import { Pinecone } from '@pinecone-database/pinecone'
import fs from 'fs'
import path from 'path'
import FormData from 'form-data'

// Helper function to log to file for debugging
function logToFile(message: string, data?: any) {
  const logMessage = `[${new Date().toISOString()}] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}\n`
  const logFile = path.join(process.cwd(), 'tutor-lms-enhanced-debug.log')
  fs.appendFileSync(logFile, logMessage)
  console.log(message, data)
}

interface CourseContent {
  text: string
  fileName: string
  score: number
  fileId: string
  mimeType: string
}

export async function queryPineconeContent(params: {
  title: string
  description: string
  duration: number
  difficulty: string
}) {
  try {
    console.log('🔍 Querying Pinecone for course:', params.title)
    
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || ''
    })

    const indexName = process.env.PINECONE_INDEX || ''
    console.log('📊 Using Pinecone index:', indexName)
    
    const index = pinecone.index(indexName)
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    // Create embedding from course requirements
    const queryText = `${params.title}\n${params.description}\nDuration: ${params.duration} hours\nDifficulty: ${params.difficulty}`
    console.log('📝 Query text length:', queryText.length, 'characters')
    
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: queryText
    })

    const queryEmbedding = embeddingResponse.data[0].embedding
    console.log('🎯 Generated embedding with', queryEmbedding.length, 'dimensions')

    // Query Pinecone with the 'site' namespace (where your documents are stored)
    console.log('🔎 Querying Pinecone with namespace: site')
    const queryResponse = await index.namespace('site').query({
      vector: queryEmbedding,
      topK: 50, // Increased to get more comprehensive content from your 1000+ documents
      includeMetadata: true
    })

    console.log('📥 Pinecone returned', queryResponse.matches?.length || 0, 'matches')
    
    if (queryResponse.matches && queryResponse.matches.length > 0) {
      console.log('✅ First match score:', queryResponse.matches[0].score)
      console.log('📄 First match metadata keys:', Object.keys(queryResponse.matches[0].metadata || {}))
    }

    const allContent: CourseContent[] = queryResponse.matches.map((match: any) => ({
      text: match.metadata?.text || match.metadata?.content || '',
      fileName: match.metadata?.file_name || match.metadata?.fileName || match.metadata?.source || 'Unknown',
      score: match.score || 0,
      fileId: match.id || '',
      mimeType: match.metadata?.mime_type || match.metadata?.mimeType || ''
    })).filter(c => c.text.length > 0) // Only include matches with actual text

    console.log('✅ Extracted', allContent.length, 'content pieces with text')

    return {
      success: true,
      content: {
        allContent,
        total: allContent.length
      }
    }
  } catch (error: any) {
    console.error('❌ Query content error:', error)
    return {
      success: false,
      message: 'Failed to query content',
      error: error.message
    }
  }
}

export async function generateEnhancedCourse(params: {
  courseData: any
  content: any
}) {
  try {
    const { courseData, content } = params
    
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      return {
        success: false,
        message: 'Missing OpenAI API key'
      }
    }

    const openai = new OpenAI({ apiKey: openaiApiKey })

    const numberOfTopics = courseData.numberOfTopics || 6
    const lessonsPerTopic = courseData.lessonsPerTopic || 4
    const totalLessons = numberOfTopics * lessonsPerTopic
    const totalQuizzes = numberOfTopics

    // Handle case where no content was found
    const contentText = content.allContent && content.allContent.length > 0
      ? content.allContent.map((c: CourseContent) => `From ${c.fileName}: ${c.text}`).join('\n\n---\n\n')
      : 'No specific training materials found. Generate comprehensive content based on industry best practices and OSHA standards.'

    const difficultyMap: { [key: string]: string } = {
      'beginner': 'beginner',
      'intermediate': 'intermediate',
      'expert': 'expert'
    }
    const mappedDifficulty = difficultyMap[courseData.difficulty] || 'beginner'

    const systemPrompt = `You are an expert course designer and safety training specialist with deep knowledge of OSHA regulations, workplace safety, and adult learning principles. Create a comprehensive, professional course structure based on the provided training materials and course specifications.

You must respond with valid JSON only.

IMPORTANT: Generate a complete, COMPREHENSIVE course with:
1. Detailed course overview that captures the full scope and importance
2. Specific, measurable learning objectives (5-7 objectives)
3. Clear target audience identification (4-5 audience types)
4. Comprehensive course requirements and materials
5. In-depth topics with substantial, detailed lessons
6. Thorough quizzes with DIVERSE question types to truly assess mastery

CONTENT QUALITY STANDARDS:
- Lessons must be detailed, educational, and practical (400-600 words each)
- Include specific examples, procedures, regulations, and real-world applications
- Reference OSHA standards and regulations where applicable
- Use the provided training materials extensively to ensure accuracy
- Write at a professional level appropriate for workplace training
- Include practical tips, warnings, and best practices in lesson content

Question Type Guidelines:
- single_choice: Traditional multiple choice (one correct answer) - Use for factual knowledge
- true_false: True/False statements - Use for concept verification
- multiple_choice: Multiple correct answers - Use for comprehensive understanding
- open_ended: Short answer/essay - Use for critical thinking and application

Course Specifications:
- Title: ${courseData.title}
- Description: ${courseData.description}
- Difficulty: ${mappedDifficulty}
- Number of Topics: ${numberOfTopics}
- Lessons Per Topic: ${lessonsPerTopic}
- Total Lessons: ${totalLessons}
- Quizzes: ${totalQuizzes} (one per topic)
- Tags: 10 keyword tags to be generated

Generate content that is:
- Professional and educational
- Based on the provided training materials
- Appropriate for the specified difficulty level
- Comprehensive and detailed
- Industry-standard compliant`

    const userMessage = `Based on the course title "${courseData.title}" and description "${courseData.description}", create a complete course structure using the following training materials:

${contentText}

Generate a comprehensive course with the following structure:

1. Course Overview (detailed description of what students will learn)
2. Learning Objectives (5-7 specific, measurable objectives)
3. Target Audience (who should take this course)
4. Course Requirements (prerequisites and materials needed)
5. Course Materials (what's included)
6. Course Tags (exactly 10 keyword tags for discoverability and SEO)
7. Topics (exactly ${numberOfTopics} topics, each with a detailed title and comprehensive summary)
8. Lessons (exactly ${lessonsPerTopic} lessons per topic, each with a title and 400-600 words of detailed, educational content)
9. Quizzes (exactly ${totalQuizzes} quizzes - one per topic, with EXACTLY 20 questions each to thoroughly assess understanding)

Return the response as a JSON object with this exact structure:
{
  "course": {
    "title": "${courseData.title}",
    "description": "${courseData.description}",
    "difficulty": "${mappedDifficulty}",
    "duration": 8,
    "totalTopics": ${numberOfTopics},
    "totalLessons": ${totalLessons},
    "lessonsPerTopic": ${lessonsPerTopic},
    "totalQuizzes": ${totalQuizzes},
    "tags": ["tag1", "tag2", ... exactly 10 tags],
    "overview": "Detailed course overview...",
    "learningObjectives": ["Objective 1", "Objective 2", ...],
    "targetAudience": ["Audience 1", "Audience 2", ...],
    "requirements": ["Requirement 1", "Requirement 2", ...],
    "materialsIncluded": ["Material 1", "Material 2", ...]
  },
  "topics": [
    {
      "id": "topic-1",
      "title": "Topic Title",
      "summary": "Topic summary (2-3 sentences)...",
      "order": 1,
      "lessons": [
        {
          "id": "lesson-1-1",
          "title": "Comprehensive Lesson Title",
          "content": "Write 400-600 words of detailed, educational content covering: 1) Introduction and context, 2) Detailed explanations with specific examples, 3) Step-by-step procedures, 4) Relevant OSHA regulations and standards, 5) Real-world applications and case studies, 6) Safety best practices and warnings, 7) Practical implementation tips. Include specific details from the training materials provided.",
          "order": 1,
          "imageDescription": "Detailed description of relevant safety image"
        }
      ],
      "quiz": {
        "id": "quiz-1",
        "title": "Topic 1 Comprehensive Assessment",
        "description": "Thorough assessment covering all aspects of this topic",
        "questions": [
          {
            "id": "q1",
            "type": "single_choice",
            "question": "Detailed question about specific concept?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctAnswer": 0,
            "explanation": "Detailed explanation referencing regulations and standards..."
          },
          ... create EXACTLY 20 questions total:
          - 8 single_choice questions (40%)
          - 5 true_false questions (25%)
          - 4 multiple_choice questions (20%)
          - 3 open_ended questions (15%)
          
          Ensure questions cover all lessons in the topic thoroughly.
        ]
      }
    }
  ]
}

IMPORTANT REQUIREMENTS:
- Create EXACTLY ${numberOfTopics} topics
- Create EXACTLY ${lessonsPerTopic} lessons per topic (total ${totalLessons} lessons)
- Create EXACTLY 1 quiz per topic (total ${totalQuizzes} quizzes)
- Create EXACTLY 10 keyword tags
- Each lesson must have 400-600 words of comprehensive, detailed content with examples and practical applications
- Each quiz must have exactly 20 questions with diverse types:
  * 40% single_choice (8 questions)
  * 25% true_false (5 questions)
  * 20% multiple_choice (4 questions)
  * 15% open_ended (3 questions)
- Base all content on the provided training materials from the knowledge base`

    // Use gpt-4o which has higher token limits
    console.log('🤖 Calling OpenAI to generate comprehensive course structure...')
    console.log(`📏 Generating ${numberOfTopics} topics with ${lessonsPerTopic} lessons each = ${totalLessons} total lessons`)
    console.log(`📝 Each lesson: 400-600 words | Each quiz: 20 questions`)
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      max_tokens: 16384, // Full capacity - user has plenty of token budget available
      temperature: 0.7,
      response_format: { type: "json_object" }
    })
    console.log('✅ OpenAI response received')
    
    // Check if response was truncated
    const finishReason = completion.choices[0]?.finish_reason
    console.log('🏁 Finish reason:', finishReason)
    
    if (finishReason === 'length') {
      console.error('⚠️ WARNING: OpenAI response was TRUNCATED due to max_tokens limit!')
      console.error('   This means the AI hit the 16,384 token output limit.')
      console.error('   The course structure may be incomplete.')
    }

    const reply = completion.choices[0]?.message?.content || ''
    console.log('📄 Response length:', reply.length, 'characters')
    console.log('🔚 Response ends with:', reply.slice(-100))

    let courseStructure
    try {
      // With json_object mode, the response is always valid JSON
      courseStructure = JSON.parse(reply)
      console.log('✅ Successfully parsed JSON structure')
    } catch (parseError) {
      console.error('❌ Failed to parse course structure JSON:', parseError)
      console.error('📝 Response length:', reply.length)
      console.error('🔚 Last 200 chars:', reply.slice(-200))
      return {
        success: false,
        message: 'Failed to parse generated course structure',
        error: parseError
      }
    }

    if (!courseStructure.course || !courseStructure.topics) {
      return {
        success: false,
        message: 'Invalid course structure generated'
      }
    }

    const statistics = {
      totalTopics: courseStructure.topics.length,
      totalLessons: courseStructure.topics.reduce((sum: number, topic: any) => sum + topic.lessons.length, 0),
      totalQuizzes: courseStructure.topics.filter((topic: any) => topic.quiz).length,
      totalQuestions: courseStructure.topics.reduce((sum: number, topic: any) => sum + (topic.quiz?.questions?.length || 0), 0),
      totalTags: courseStructure.course.tags?.length || 0
    }
    
    // Validate that AI generated the requested structure
    console.log(`📊 AI Generated: ${statistics.totalTopics} topics (requested ${numberOfTopics}), ${statistics.totalLessons} lessons (requested ${totalLessons})`)
    
    if (statistics.totalTopics < numberOfTopics) {
      console.warn(`⚠️ AI only generated ${statistics.totalTopics} topics instead of ${numberOfTopics}. This may be due to output token limits or response truncation.`)
    }
    
    if (statistics.totalLessons < totalLessons) {
      console.warn(`⚠️ AI only generated ${statistics.totalLessons} lessons instead of ${totalLessons}. This may be due to output token limits or response truncation.`)
    }

    return {
      success: true,
      courseStructure: courseStructure,
      statistics: statistics
    }

  } catch (error: any) {
    console.error('Enhanced course generation error:', error)
    return {
      success: false,
      message: 'Failed to generate enhanced course structure',
      error: error.message || error.toString()
    }
  }
}

export async function createCourseInTutorLMS(courseStructure: any, shouldGenerateImages: boolean = true) {
  try {
    logToFile('Creating course in Tutor LMS', { 
      title: courseStructure.course.title,
      shouldGenerateImages: shouldGenerateImages
    })

    const config = {
      baseUrl: process.env.TUTOR_BASE_URL || '',
      consumerKey: process.env.TUTOR_API_KEY || '',
      consumerSecret: process.env.TUTOR_API_SECRET || ''
    }

    if (!config.baseUrl || !config.consumerKey || !config.consumerSecret) {
      throw new Error('Missing Tutor LMS configuration')
    }

    // Step 1: Create the basic course with ALL Additional section fields
    const courseData = {
      post_title: courseStructure.course.title,
      post_content: courseStructure.course.description,
      post_status: 'draft',
      post_author: 1,
      course_level: courseStructure.course.difficulty,
      // Course duration as object (hours and minutes)
      course_duration: {
        hours: Math.floor(courseStructure.course.duration || 3),
        minutes: 0
      },
      // Additional section fields
      course_overview: courseStructure.course.overview || courseStructure.course.description,
      course_benefits: courseStructure.course.learningObjectives?.join('\n') || '',
      course_target_audience: courseStructure.course.targetAudience?.join('\n') || '',
      course_requirements: courseStructure.course.requirements?.join('\n') || '',
      course_material_includes: courseStructure.course.materialsIncluded?.join('\n') || ''
    }
    
    logToFile('📤 Creating course with complete Additional section:', courseData)

    const courseResponse = await fetch(`${config.baseUrl}wp-json/tutor/v1/courses`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(courseData)
    })

    if (!courseResponse.ok) {
      const errorText = await courseResponse.text()
      throw new Error(`Failed to create course: ${courseResponse.status} - ${errorText}`)
    }

    const courseResult = await courseResponse.json()
    const courseId = courseResult.data || courseResult.id
    logToFile('✅ Created course with ID:', courseId)

    // Step 1.5: Generate and set course featured image
    logToFile('🔍 Image generation check:', { shouldGenerateImages, type: typeof shouldGenerateImages })
    if (shouldGenerateImages === true) {
      logToFile('🎨 Generating course featured image...')
      
      const courseImage = await generateFeaturedImage({
        title: courseStructure.course.title,
        description: courseStructure.course.description,
        type: 'course'
      })
      
      if (!courseImage.success) {
        logToFile('⚠️ Course image generation failed:', courseImage.error)
      } else if (courseImage.imageUrl) {
        // Upload to WordPress
        logToFile('📤 Uploading course image to WordPress...')
        const uploadResult = await uploadImageToWordPress({
          imageUrl: courseImage.imageUrl,
          title: `${courseStructure.course.title} - Featured Image`,
          config: config
        })
        
        if (!uploadResult.success) {
          logToFile('⚠️ Course image upload failed:', uploadResult.error)
        } else if (uploadResult.mediaId) {
          // Set as course featured image using Tutor LMS API
          logToFile('🔗 Setting course featured image...')
          const featuredResponse = await fetch(`${config.baseUrl}wp-json/tutor/v1/courses/${courseId}`, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              thumbnail_id: uploadResult.mediaId
            })
          })
          
          if (featuredResponse.ok) {
            logToFile('✅ Set course featured image with media ID:', uploadResult.mediaId)
          } else {
            const errorText = await featuredResponse.text()
            logToFile('⚠️ Failed to set course featured image:', { status: featuredResponse.status, error: errorText })
          }
        }
      }
    }

    // Step 2: Create topics, lessons, and quizzes
    for (const topic of courseStructure.topics) {
      // Create topic with correct API parameters
      const topicPayload = {
        topic_title: topic.title,
        topic_summary: topic.summary,
        topic_course_id: courseId,
        topic_author: 1
      }

      logToFile('📤 Creating topic with payload:', topicPayload)
      
      const topicResponse = await fetch(`${config.baseUrl}wp-json/tutor/v1/topics`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(topicPayload)
      })

      if (!topicResponse.ok) {
        const errorText = await topicResponse.text()
        logToFile(`❌ Failed to create topic:`, {
          status: topicResponse.status,
          statusText: topicResponse.statusText,
          error: errorText
        })
        continue
      }

      const topicResult = await topicResponse.json()
      logToFile('📥 Topic response:', topicResult)
      
      const topicId = topicResult.data?.id || topicResult.data || topicResult.id
      
      if (!topicId) {
        logToFile(`❌ Could not extract topic ID from response`)
        continue
      }
      
      logToFile('✅ Created topic with ID:', topicId)

      // Create lessons for this topic
      for (const lesson of topic.lessons) {
        const lessonPayload = {
          topic_id: topicId,
          lesson_title: lesson.title,
          lesson_content: lesson.content,
          lesson_author: 1
        }

        logToFile('📤 Creating lesson with payload:', lessonPayload)

        const lessonResponse = await fetch(`${config.baseUrl}wp-json/tutor/v1/lessons/`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(lessonPayload)
        })

        if (!lessonResponse.ok) {
          const errorText = await lessonResponse.text()
          logToFile(`❌ Failed to create lesson:`, {
            status: lessonResponse.status,
            statusText: lessonResponse.statusText,
            error: errorText
          })
          continue
        }

        const lessonResult = await lessonResponse.json()
        logToFile('📥 Lesson response:', lessonResult)
        
        const lessonId = lessonResult.data?.id || lessonResult.data || lessonResult.id
        
        if (!lessonId) {
          logToFile(`❌ Could not extract lesson ID from response`)
          continue
        }
        
        logToFile('✅ Created lesson with ID:', lessonId)
        
        // Generate and set lesson featured image
        logToFile(`🎨 Generating lesson image for: ${lesson.title}`)
        
        const lessonImage = await generateFeaturedImage({
          title: lesson.title,
          description: lesson.imageDescription || lesson.title,
          type: 'lesson',
          lessonContent: lesson.content
        })
        
        if (!lessonImage.success) {
          logToFile(`⚠️ Lesson image generation failed for "${lesson.title}":`, lessonImage.error)
        } else if (lessonImage.imageUrl) {
          // Upload to WordPress
          logToFile(`📤 Uploading lesson image to WordPress for: ${lesson.title}`)
          const uploadResult = await uploadImageToWordPress({
            imageUrl: lessonImage.imageUrl,
            title: `${lesson.title} - Lesson Image`,
            config: config
          })
          
          if (!uploadResult.success) {
            logToFile(`⚠️ Lesson image upload failed for "${lesson.title}":`, uploadResult.error)
          } else if (uploadResult.mediaId) {
            // Set as lesson featured image (thumbnail_id)
            logToFile(`🔗 Setting lesson featured image for: ${lesson.title}`)
            const thumbnailResponse = await fetch(`${config.baseUrl}wp-json/tutor/v1/lessons/${lessonId}`, {
              method: 'POST',
              headers: {
                'Authorization': `Basic ${Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                thumbnail_id: uploadResult.mediaId
              })
            })
            
            if (thumbnailResponse.ok) {
              logToFile(`✅ Set lesson featured image for "${lesson.title}" with media ID:`, uploadResult.mediaId)
            } else {
              const errorText = await thumbnailResponse.text()
              logToFile(`⚠️ Failed to set lesson featured image for "${lesson.title}":`, { status: thumbnailResponse.status, error: errorText })
            }
          }
        }
      }

      // Create quiz for this topic
      if (topic.quiz) {
        const quizPayload = {
          topic_id: topicId,
          quiz_title: topic.quiz.title,
          quiz_author: 1,
          quiz_description: topic.quiz.description || '',
          quiz_options: {
            time_limit: { time_value: 45, time_type: 'minutes' }, // Increased for 20 questions
            feedback_mode: 'default',
            question_layout_view: 'question_below_each_other',
            attempts_allowed: 3,
            passing_grade: 70,
            max_questions_for_answer: topic.quiz.questions.length, // Should be 20
            questions_order: 'rand',
            short_answer_characters_limit: 500,
            open_ended_answer_characters_limit: 1000
          }
        }

        logToFile('📤 Creating quiz with payload:', quizPayload)

        const quizResponse = await fetch(`${config.baseUrl}wp-json/tutor/v1/quizzes`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(quizPayload)
        })

        if (!quizResponse.ok) {
          const errorText = await quizResponse.text()
          logToFile(`❌ Failed to create quiz:`, {
            status: quizResponse.status,
            statusText: quizResponse.statusText,
            error: errorText
          })
          continue
        }

        const quizResult = await quizResponse.json()
        logToFile('📥 Quiz response:', quizResult)
        
        const quizId = quizResult.data?.id || quizResult.data || quizResult.id
        
        if (!quizId) {
          logToFile(`❌ Could not extract quiz ID from response`)
          continue
        }
        
        logToFile('✅ Created quiz with ID:', quizId)

        // Add questions to the quiz
        for (const question of topic.quiz.questions) {
          const mappedType = question.type || 'single_choice'

          let questionData: any = {
            quiz_id: quizId,
            question_title: question.question,
            question_type: mappedType,
            answer_required: 1,
            randomize_question: 1,
            question_mark: 1.00,
            show_question_mark: 1,
            answer_explanation: question.explanation || '',
            question_description: question.explanation || ''
          }

          // Handle different question types based on API examples
          if (mappedType === 'single_choice') {
            // Single choice: options array + correct_answer as STRING (the actual answer text)
            questionData.options = question.options || []
            questionData.correct_answer = question.options?.[question.correctAnswer] || question.options?.[0]
          } else if (mappedType === 'multiple_choice') {
            // Multiple choice: options array + correct_answer as ARRAY of STRINGS (actual answer texts)
            questionData.options = question.options || []
            questionData.correct_answer = question.correctAnswers?.map((idx: number) => question.options?.[idx]) || []
          } else if (mappedType === 'true_false') {
            // True/False: correct_answer is "true" or "false" string
            questionData.correct_answer = question.correctAnswer === 0 ? 'true' : 'false'
          } else if (mappedType === 'open_ended') {
            // Open ended: no options needed, answer_explanation contains guidance
            questionData.question_type = 'open_ended'
            // No correct_answer field for open_ended
          } else if (mappedType === 'short_answer') {
            // Short answer: similar to open_ended but shorter responses
            questionData.question_type = 'short_answer'
            // No correct_answer field for short_answer
          }

          logToFile('📤 Creating question:', questionData)

          const questionResponse = await fetch(`${config.baseUrl}wp-json/tutor/v1/quiz-questions`, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(questionData)
          })

          if (questionResponse.ok) {
            const questionResult = await questionResponse.json()
            logToFile('✅ Created question:', questionResult)
          } else {
            const errorText = await questionResponse.text()
            logToFile('❌ Failed to create question:', errorText)
          }
        }
      }
    }

    return {
      success: true,
      courseId: courseId,
      permalink: `${config.baseUrl}course/${courseStructure.course.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/`,
      statistics: {
        totalTopics: courseStructure.topics.length,
        totalLessons: courseStructure.topics.reduce((sum: number, topic: any) => sum + topic.lessons.length, 0),
        totalQuizzes: courseStructure.topics.filter((topic: any) => topic.quiz).length
      }
    }

  } catch (error: any) {
    logToFile('❌ Tutor LMS Error:', error.message)
    return {
      success: false,
      message: 'Failed to create course in Tutor LMS',
      error: error.message
    }
  }
}

// Generate professional featured image using DALL-E
export async function generateFeaturedImage(params: {
  title: string
  description: string
  type: 'course' | 'lesson'
  lessonContent?: string
}) {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    
    // Create a professional prompt for safety training imagery
    let imagePrompt = ''
    
    if (params.type === 'course') {
      imagePrompt = `Create a professional, eye-catching featured image for a workplace safety training course titled "${params.title}". The image should be: modern, professional, relevant to workplace safety and HAZWOPER training, visually appealing, suitable for educational content. Include elements like safety equipment, workers in protective gear, or safety symbols. Style: Clean, professional, corporate training aesthetic. No text or words in the image.`
    } else {
      imagePrompt = `Create a professional educational image for a safety training lesson titled "${params.title}". The lesson covers: ${params.lessonContent?.substring(0, 300)}. The image should be: professional, relevant to the specific lesson topic, educational, clear and focused. Include specific safety equipment, procedures, or scenarios mentioned in the lesson. Style: Clean, professional, corporate training aesthetic. No text or words in the image.`
    }
    
    logToFile(`🎨 Generating ${params.type} image:`, { title: params.title })
    
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: imagePrompt,
      n: 1,
      size: "1792x1024", // Wide format, professional aspect ratio
      quality: "hd",
      style: "natural" // Professional, realistic style
    })
    
    const imageUrl = imageResponse.data[0]?.url
    
    if (!imageUrl) {
      throw new Error('No image URL returned from DALL-E')
    }
    
    logToFile(`✅ Generated ${params.type} image:`, imageUrl)
    
    return {
      success: true,
      imageUrl: imageUrl
    }
    
  } catch (error: any) {
    logToFile(`❌ Image generation error for ${params.type}:`, error.message)
    return {
      success: false,
      error: error.message
    }
  }
}

// Upload image to WordPress media library
export async function uploadImageToWordPress(params: {
  imageUrl: string
  title: string
  config: any
}) {
  try {
    logToFile('📤 Uploading image to WordPress:', params.title)
    
    // Download the image from DALL-E URL
    const imageResponse = await fetch(params.imageUrl)
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`)
    }
    
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
    const fileName = `${params.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`
    
    // Create form-data for WordPress media upload
    const formData = new FormData()
    formData.append('file', imageBuffer, {
      filename: fileName,
      contentType: 'image/png'
    })
    formData.append('title', params.title)
    
    // Convert form-data stream to buffer for Node.js fetch compatibility
    const chunks: Buffer[] = []
    const headers = formData.getHeaders()
    
    // Wait for form-data to finish and get all chunks
    const formDataBuffer = await new Promise<Buffer>((resolve, reject) => {
      formData.on('data', (chunk: any) => {
        // Convert string chunks to Buffer
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      })
      formData.on('end', () => {
        resolve(Buffer.concat(chunks))
      })
      formData.on('error', reject)
      formData.resume() // Start reading the stream
    })
    
    // WordPress Application Password authentication (different from Tutor LMS auth)
    const wpUsername = process.env.WORDPRESS_USERNAME || ''
    const wpAppPassword = process.env.WORDPRESS_APP_PASSWORD || ''
    
    // Upload to WordPress media library using WordPress Application Password
    const uploadResponse = await fetch(`${params.config.baseUrl}wp-json/wp/v2/media`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${wpUsername}:${wpAppPassword}`).toString('base64')}`,
        'Content-Type': headers['content-type'],
        'Content-Length': formDataBuffer.length.toString()
      },
      body: formDataBuffer
    })
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      logToFile('❌ WordPress upload failed:', { status: uploadResponse.status, error: errorText })
      throw new Error(`Failed to upload image: ${uploadResponse.status} - ${errorText}`)
    }
    
    const uploadResult = await uploadResponse.json()
    const mediaId = uploadResult.id
    
    logToFile('✅ Uploaded image to WordPress, media ID:', mediaId)
    
    return {
      success: true,
      mediaId: mediaId,
      url: uploadResult.source_url
    }
    
  } catch (error: any) {
    logToFile('❌ Image upload error:', error.message)
    logToFile('❌ Full error details:', { message: error.message, stack: error.stack })
    return {
      success: false,
      error: error.message
    }
  }
}

