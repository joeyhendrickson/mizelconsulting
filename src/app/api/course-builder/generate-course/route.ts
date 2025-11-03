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
  try {
    const { courseData, content } = await request.json()
    console.log('Generate course - courseData:', courseData)
    console.log('Generate course - content keys:', Object.keys(content || {}))
    
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      return NextResponse.json({
        success: false,
        message: 'Missing OpenAI API key'
      }, { status: 500 })
    }

    const openai = new OpenAI({ apiKey: openaiApiKey })

    // Calculate course structure
    const totalPages = courseData.duration * courseData.pagesPerHour
    const autoQuizzes = Math.floor(totalPages / courseData.quizFrequency)
    const totalQuizzes = autoQuizzes + courseData.customQuizzes

    // Prepare content for AI
    console.log('Content structure:', content)
    console.log('All content length:', content.allContent?.length || 0)
    
    const contentText = content.allContent
      .map((c: CourseContent) => `From ${c.fileName}: ${c.text}`)
      .join('\n\n---\n\n')
    
    console.log('Content text length:', contentText.length)

    // Map difficulty levels to valid Tutor LMS course levels
    const validCourseLevels = {
      'beginner': 'beginner',
      'intermediate': 'intermediate', 
      'advanced': 'expert'  // Map advanced to expert since advanced is not valid
    }
    
    const mappedDifficulty = validCourseLevels[courseData.difficulty as keyof typeof validCourseLevels] || 'beginner'
    
    // Create comprehensive system prompt for course generation
    const systemPrompt = `You are an expert course designer and instructional designer specializing in safety training and professional development courses. 

Your task is to create a comprehensive, well-structured course based on the provided training materials and specifications.

COURSE SPECIFICATIONS:
- Title: ${courseData.title}
- Description: ${courseData.description}
- Duration: ${courseData.duration} hours
- Difficulty: ${mappedDifficulty}
- Total Pages: ${totalPages}
- Quiz Frequency: Every ${courseData.quizFrequency} pages
- Total Quizzes: ${totalQuizzes}
- Videos: ${courseData.videos.length} video(s) to integrate

COURSE STRUCTURE REQUIREMENTS:
1. Create a logical flow from basic concepts to advanced topics
2. Each page should be approximately 200-300 words
3. Include practical examples and real-world applications
4. Ensure content is appropriate for ${courseData.difficulty} level
5. Integrate videos at appropriate points in the course
6. Create engaging, interactive content

QUIZ REQUIREMENTS:
- Each quiz should have 5-10 questions
- Mix of multiple choice, true/false, and short answer questions
- Questions should test understanding, not just memorization
- Include practical scenario-based questions
- Provide clear, educational explanations for answers

RESPONSE FORMAT:
Return a JSON object with this exact structure:
{
  "course": {
    "title": "Course Title",
    "description": "Course Description",
    "difficulty": "beginner|intermediate|advanced",
    "duration": number,
    "totalPages": number,
    "totalQuizzes": number
  },
  "topics": [
    {
      "id": "topic_1",
      "title": "Topic Title",
      "description": "Topic Description",
      "order": 1,
      "lessons": [
        {
          "id": "lesson_1",
          "title": "Lesson Title",
          "content": "Full lesson content (200-300 words)",
          "order": 1,
          "pageNumber": 1,
          "hasQuiz": false,
          "videoUrl": "optional video URL"
        }
      ]
    }
  ],
  "quizzes": [
    {
      "id": "quiz_1",
      "title": "Quiz Title",
      "description": "Quiz Description",
      "order": 1,
      "pageNumber": 4,
      "questions": [
        {
          "id": "q1",
          "question": "Question text",
          "type": "multiple_choice|true_false|short_answer",
          "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
          "correctAnswer": "Correct answer or index",
          "explanation": "Explanation of why this is correct"
        }
      ]
    }
  ]
}

IMPORTANT:
- Use the provided training materials as the foundation for all content
- Ensure all content is accurate and based on the source materials
- Create a logical progression through the topics
- Make content engaging and practical
- Include real-world examples and applications
- Ensure quizzes test actual understanding, not just facts`

    // Generate the course structure
    console.log('Calling OpenAI API...')
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: `Please create a comprehensive course based on these training materials:\n\n${contentText}\n\nCourse Requirements:\n- Title: ${courseData.title}\n- Description: ${courseData.description}\n- Duration: ${courseData.duration} hours\n- Difficulty: ${mappedDifficulty}\n- Total Pages: ${totalPages}\n- Quiz Frequency: Every ${courseData.quizFrequency} pages\n- Videos to integrate: ${courseData.videos.join(', ') || 'None'}\n\nPlease return the course structure as a JSON object following the exact format specified.`
        }
      ],
      max_tokens: 8000,
      temperature: 0.7,
    })
    console.log('OpenAI API call completed')

    const responseText = completion.choices[0]?.message?.content || ''
    
    // Parse the JSON response
    let courseStructure
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        courseStructure = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      console.error('Error parsing course structure:', parseError)
      return NextResponse.json({
        success: false,
        message: 'Failed to parse course structure from AI response',
        error: parseError,
        rawResponse: responseText
      }, { status: 500 })
    }

    // Validate the course structure
    if (!courseStructure.course || !courseStructure.topics || !courseStructure.quizzes) {
      return NextResponse.json({
        success: false,
        message: 'Invalid course structure generated',
        courseStructure
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      courseStructure,
      statistics: {
        totalTopics: courseStructure.topics.length,
        totalLessons: courseStructure.topics.reduce((sum: number, topic: any) => sum + topic.lessons.length, 0),
        totalQuizzes: courseStructure.quizzes.length,
        totalQuestions: courseStructure.quizzes.reduce((sum: number, quiz: any) => sum + quiz.questions.length, 0)
      }
    })

  } catch (error: any) {
    console.error('Error generating course:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to generate course structure',
      error: error.message
    }, { status: 500 })
  }
}
