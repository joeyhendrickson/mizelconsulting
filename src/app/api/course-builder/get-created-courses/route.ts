import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

interface CreatedCourse {
  id: number
  title: string
  description: string
  createdAt: string
  status: string
  permalink?: string
  statistics?: {
    totalTopics: number
    totalLessons: number
    totalQuizzes: number
  }
}

export async function GET(request: NextRequest) {
  try {
    const coursesFile = path.join(process.cwd(), 'created-courses.json')
    
    // Read the created courses file
    let createdCourses: CreatedCourse[] = []
    
    if (fs.existsSync(coursesFile)) {
      try {
        const fileContent = fs.readFileSync(coursesFile, 'utf8')
        createdCourses = JSON.parse(fileContent)
      } catch (error) {
        console.error('Error reading created courses file:', error)
        createdCourses = []
      }
    }

    // Sort by creation date (newest first)
    createdCourses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({
      success: true,
      courses: createdCourses,
      total: createdCourses.length
    })

  } catch (error: any) {
    console.error('Error fetching created courses:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch created courses',
      error: error.message
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { course } = await request.json()
    const coursesFile = path.join(process.cwd(), 'created-courses.json')
    
    // Read existing courses
    let createdCourses: CreatedCourse[] = []
    
    if (fs.existsSync(coursesFile)) {
      try {
        const fileContent = fs.readFileSync(coursesFile, 'utf8')
        createdCourses = JSON.parse(fileContent)
      } catch (error) {
        console.error('Error reading created courses file:', error)
        createdCourses = []
      }
    }

    // Add or update the course
    const existingIndex = createdCourses.findIndex(c => c.id === course.id)
    
    if (existingIndex >= 0) {
      // Update existing course
      createdCourses[existingIndex] = {
        ...createdCourses[existingIndex],
        title: course.title,
        description: course.description,
        status: course.status || 'draft',
        permalink: course.permalink,
        statistics: course.statistics
      }
    } else {
      // Add new course
      createdCourses.push({
        id: course.id,
        title: course.title,
        description: course.description,
        createdAt: new Date().toISOString(),
        status: course.status || 'draft',
        permalink: course.permalink,
        statistics: course.statistics
      })
    }

    // Write back to file
    fs.writeFileSync(coursesFile, JSON.stringify(createdCourses, null, 2))

    return NextResponse.json({
      success: true,
      message: 'Course data saved successfully',
      course: course
    })

  } catch (error: any) {
    console.error('Error saving course data:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to save course data',
      error: error.message
    }, { status: 500 })
  }
}





