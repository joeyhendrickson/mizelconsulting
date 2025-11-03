import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

interface CourseContent {
  text: string
  fileName: string
  score: number
  fileId: string
  mimeType: string
}

interface CourseData {
  title: string
  description: string
  duration: number
  pagesPerHour: number
  quizFrequency: number
  customQuizzes: number
  videos: string[]
  difficulty: string
}

export async function POST(request: NextRequest) {
  console.log('=== ENHANCED COURSE GENERATION API CALLED ===')
  try {
    const { courseData, content } = await request.json()
    console.log('Generate enhanced course - courseData:', JSON.stringify(courseData, null, 2))
    console.log('Content received - total chunks:', content?.total || 0)
    console.log('Generate enhanced course - content keys:', Object.keys(content || {}))
    
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      return NextResponse.json({
        success: false,
        message: 'Missing OpenAI API key'
      }, { status: 500 })
    }

    const openai = new OpenAI({ apiKey: openaiApiKey })

    // Use admin-specified structure
    const numberOfTopics = courseData.numberOfTopics || 6
    const lessonsPerTopic = courseData.lessonsPerTopic || 4
    const totalLessons = numberOfTopics * lessonsPerTopic
    const quizzesPerTopic = 1 // One quiz per topic
    const totalQuizzes = numberOfTopics
    const generateFeaturedImage = courseData.generateFeaturedImage !== false

    // Prepare content for AI
    console.log('Content structure:', content)
    console.log('All content length:', content.allContent?.length || 0)
    
    const contentText = content.allContent
      .map((c: CourseContent) => `From ${c.fileName}: ${c.text}`)
      .join('\n\n---\n\n')

    console.log('Content text length:', contentText.length)

    // Map difficulty to valid Tutor LMS levels
    const difficultyMap: { [key: string]: string } = {
      'beginner': 'beginner',
      'intermediate': 'intermediate', 
      'expert': 'expert'
    }
    const mappedDifficulty = difficultyMap[courseData.difficulty] || 'beginner'

    // Enhanced system prompt for comprehensive course generation
    const systemPrompt = `You are an expert course designer and safety training specialist. Create a comprehensive, professional course structure based on the provided training materials and course specifications.

IMPORTANT: Generate a complete course with:
1. Detailed course overview and learning objectives
2. Target audience identification
3. Course requirements and materials
4. Multiple topics with detailed lessons
5. Comprehensive quizzes with DIVERSE question types (single_choice, true_false, multiple_choice, open_ended)
6. Professional content based on the provided training materials

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
- Generate Featured Image: ${generateFeaturedImage}
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
7. Topics (exactly ${numberOfTopics} topics, each with a title and summary)
8. Lessons (exactly ${lessonsPerTopic} lessons per topic, each with a title, content, and image description)
9. Quizzes (exactly ${totalQuizzes} quizzes - one per topic, with 5-10 questions each to assess understanding of that topic's lessons)

Return the response as a JSON object with this exact structure:
{
  "course": {
    "title": "${courseData.title}",
    "description": "${courseData.description}",
    "difficulty": "${mappedDifficulty}",
    "duration": 3,
    "totalTopics": ${numberOfTopics},
    "totalLessons": ${totalLessons},
    "lessonsPerTopic": ${lessonsPerTopic},
    "totalQuizzes": ${totalQuizzes},
    "tags": ["tag1", "tag2", ... exactly 10 tags],
    "overview": "Detailed course overview...",
    "learningObjectives": ["Objective 1", "Objective 2", ...],
    "targetAudience": ["Audience 1", "Audience 2", ...],
    "requirements": ["Requirement 1", "Requirement 2", ...],
    "materialsIncluded": ["Material 1", "Material 2", ...],
    "featuredImageUrl": "https://example.com/safety-training-image.jpg",
    "introVideoUrl": "https://example.com/intro-video.mp4"
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
          "title": "Lesson Title",
          "content": "Detailed lesson content with practical examples, safety procedures, and key concepts (at least 200-300 words)...",
          "order": 1,
          "imageDescription": "Description of relevant image for this lesson (e.g., 'Safety inspector checking equipment', 'Worker wearing proper PPE')",
          "videoUrl": ""
        },
        ... create exactly ${lessonsPerTopic} lessons per topic
      ],
      "quiz": {
        "id": "quiz-1",
        "title": "Topic 1 Assessment",
        "description": "Test your understanding of this topic",
        "questions": [
          {
            "id": "q1",
            "type": "single_choice",
            "question": "What is the primary purpose of...?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctAnswer": 0,
            "explanation": "Detailed explanation of the correct answer..."
          },
          {
            "id": "q2",
            "type": "true_false",
            "question": "Statement to evaluate as true or false",
            "options": ["True", "False"],
            "correctAnswer": 0,
            "explanation": "Explanation of why this is true/false..."
          },
          {
            "id": "q3",
            "type": "multiple_choice",
            "question": "Which of the following are correct? (Select all that apply)",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctAnswers": [0, 2],
            "explanation": "Explanation of why A and C are correct..."
          },
          {
            "id": "q4",
            "type": "open_ended",
            "question": "Describe the process for...",
            "correctAnswer": "Expected answer guidelines or key points",
            "explanation": "Key concepts that should be included in the answer..."
          },
          ... create 8-10 questions total with a mix of types: 50% single_choice, 20% true_false, 20% multiple_choice, 10% open_ended
        ]
      }
    },
    ... create exactly ${numberOfTopics} topics
  ]
}

IMPORTANT REQUIREMENTS:
- Create EXACTLY ${numberOfTopics} topics
- Create EXACTLY ${lessonsPerTopic} lessons per topic (total ${totalLessons} lessons)
- Create EXACTLY 1 quiz per topic (total ${totalQuizzes} quizzes)
- Create EXACTLY 10 keyword tags
- Each lesson must have 200-300 words of content
- Each quiz must have 5-10 questions
- Each lesson must have an imageDescription for AI image generation or database selection
- Base all content on the provided training materials from the knowledge base`

    console.log('Calling OpenAI API for enhanced course generation...')
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      max_tokens: 16000, // Increased for larger courses
      temperature: 0.7
    })

    console.log('OpenAI API call completed')

    const reply = completion.choices[0]?.message?.content || ''
    console.log('Generated course structure length:', reply.length)

    // Parse the JSON response
    let courseStructure
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = reply.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        courseStructure = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      console.error('Failed to parse course structure JSON:', parseError)
      console.error('Raw response:', reply)
      return NextResponse.json({
        success: false,
        message: 'Failed to parse generated course structure',
        error: parseError,
        rawResponse: reply
      }, { status: 500 })
    }

    // Validate the course structure
    if (!courseStructure.course || !courseStructure.topics) {
      return NextResponse.json({
        success: false,
        message: 'Invalid course structure generated',
        courseStructure: courseStructure
      }, { status: 500 })
    }

    // Calculate statistics
    const statistics = {
      totalTopics: courseStructure.topics.length,
      totalLessons: courseStructure.topics.reduce((sum: number, topic: any) => sum + topic.lessons.length, 0),
      totalQuizzes: courseStructure.topics.filter((topic: any) => topic.quiz).length,
      totalQuestions: courseStructure.topics.reduce((sum: number, topic: any) => sum + (topic.quiz?.questions?.length || 0), 0),
      totalTags: courseStructure.course.tags?.length || 0
    }

    console.log('Enhanced course generation successful:', statistics)

    return NextResponse.json({
      success: true,
      courseStructure: courseStructure,
      statistics: statistics
    })

  } catch (error: any) {
    console.error('Enhanced course generation error:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    
    return NextResponse.json({
      success: false,
      message: 'Failed to generate enhanced course structure',
      error: error.message || error.toString(),
      errorType: error.name
    }, { status: 500 })
  }
}
