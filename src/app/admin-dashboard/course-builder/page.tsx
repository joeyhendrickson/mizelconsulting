'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const CourseBuilder = () => {
  const router = useRouter()
  const [adminUser, setAdminUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [logs, setLogs] = useState<string[]>([])
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [createdCourse, setCreatedCourse] = useState<any>(null)

  // Course form state with admin-controlled structure
  const [courseData, setCourseData] = useState({
    title: '',
    description: '',
    difficulty: 'beginner' as 'beginner' | 'intermediate' | 'expert',
    generateFeaturedImage: true, // Requires WordPress Application Password in .env.local
    numberOfTopics: 3, // Optimized for reliable generation within token limits
    lessonsPerTopic: 3  // Optimized for reliable generation within token limits
  })

  useEffect(() => {
    checkAdminAuth()
  }, [])

  const checkAdminAuth = () => {
    try {
      const adminSession = localStorage.getItem('adminSession')
      console.log('Course Builder - Admin session:', adminSession ? 'Found' : 'Not found')
      
      if (adminSession) {
        const sessionData = JSON.parse(adminSession)
        const now = Date.now()
        console.log('Course Builder - Session data:', sessionData)
        
        // Check if session is still valid (24 hours)
        if (now - sessionData.timestamp < 24 * 60 * 60 * 1000) {
          console.log('Course Builder - Valid session, setting admin user')
          setAdminUser(sessionData.admin)
        } else {
          console.log('Course Builder - Session expired, redirecting to login')
          localStorage.removeItem('adminSession')
          router.push('/login')
        }
      } else {
        console.log('Course Builder - No session found, redirecting to login')
        router.push('/login')
      }
    } catch (error) {
      console.error('Course Builder - Auth check failed:', error)
      router.push('/login')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setCourseData(prev => ({
      ...prev,
      [field]: value
    }))
  }


  const handleCreateCourse = async () => {
    if (!courseData.title.trim() || !courseData.description.trim()) {
      alert('Please fill in course title and description')
      return
    }

    setCreating(true)
    setProgress(0)
    setCurrentStep('initializing')
    setLogs([])
    setShowProgressModal(true)
    setCreatedCourse(null)

    try {
      const response = await fetch('/api/course-builder/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(courseData)
      })

      if (!response.ok) {
        throw new Error('Failed to create course')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break
        
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.type === 'status' || data.type === 'progress') {
                setCurrentStep(data.step)
                setProgress(data.progress)
                setLogs(prev => [...prev, data.message])
              } else if (data.type === 'error') {
                setLogs(prev => [...prev, `❌ ${data.message}`])
              } else if (data.type === 'complete') {
                setProgress(100)
                setCurrentStep('completed')
                setLogs(prev => [...prev, data.message])
                setCreatedCourse(data.course)
                
                // Close modal after 3 seconds
                setTimeout(() => {
                  setShowProgressModal(false)
                  setCreating(false)
                }, 3000)
                return
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error creating course:', error)
      setLogs(prev => [...prev, `❌ Error: ${error}`])
      setCreating(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!adminUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Course Builder</h1>
              <p className="text-xl text-gray-600">AI-Powered Course Creation</p>
            </div>
            <button
              onClick={() => router.push('/admin-dashboard')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Course</h2>
            
            {/* AI-Powered Course Creation Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-600 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">AI-Powered Course Generation</h3>
                  <p className="text-blue-800 mb-3">
                    Control the structure, let AI create the content:
                  </p>
                  <ul className="text-blue-700 space-y-1 text-sm">
                    <li>• Choose number of topics and lessons per topic</li>
                    <li>• AI generates topic titles, summaries, and lesson content from knowledge base</li>
                    <li>• AI creates quiz per topic to assess understanding</li>
                    <li>• AI generates 10 keyword tags for discoverability</li>
                    <li>• AI fills out all "Additional" information</li>
                    <li>• AI generates/selects featured images for course and lessons</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="border-b pb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Course Title *
                    </label>
                    <input
                      type="text"
                      value={courseData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., OSHA 40-Hour HAZWOPER Training"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Course Description *
                    </label>
                    <textarea
                      value={courseData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Describe what this course will cover and who it's for. AI will use this to generate topics, lessons, and content..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Difficulty Level
                      </label>
                      <select
                        value={courseData.difficulty}
                        onChange={(e) => handleInputChange('difficulty', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="expert">Expert</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Sets course level in LMS Tutor Basics</p>
                    </div>

                    <div>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={courseData.generateFeaturedImage}
                          onChange={(e) => handleInputChange('generateFeaturedImage', e.target.checked)}
                          className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-3">
                          <span className="text-sm font-medium text-gray-700">AI Generate Featured Image</span>
                          <p className="text-xs text-gray-500">Generate course featured image based on title & description</p>
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Course Structure */}
              <div className="border-b pb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Structure</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Topics (3-20)
                    </label>
                    <input
                      type="number"
                      min="3"
                      max="20"
                      value={courseData.numberOfTopics}
                      onChange={(e) => handleInputChange('numberOfTopics', parseInt(e.target.value) || 3)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">AI will generate topics with titles & summaries</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lessons Per Topic (2-5)
                    </label>
                    <input
                      type="number"
                      min="2"
                      max="5"
                      value={courseData.lessonsPerTopic}
                      onChange={(e) => handleInputChange('lessonsPerTopic', parseInt(e.target.value) || 2)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Each lesson includes AI-generated content & image</p>
                  </div>
                </div>

                {/* Course Preview */}
                <div className="mt-6 bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Course Preview</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Topics:</span>
                      <span className="ml-2 text-blue-600">{courseData.numberOfTopics}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Total Lessons:</span>
                      <span className="ml-2 text-blue-600">{courseData.numberOfTopics * courseData.lessonsPerTopic}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Quizzes:</span>
                      <span className="ml-2 text-blue-600">{courseData.numberOfTopics}</span>
                      <span className="text-xs text-gray-500 block">One per topic</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Tags:</span>
                      <span className="ml-2 text-blue-600">10</span>
                      <span className="text-xs text-gray-500 block">AI-generated</span>
                    </div>
                  </div>
                  
                  {/* Warning for large courses */}
                  {courseData.numberOfTopics * courseData.lessonsPerTopic > 15 && (
                    <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div className="ml-3">
                          <h5 className="text-sm font-medium text-yellow-800">Large Course Warning</h5>
                          <p className="text-xs text-yellow-700 mt-1">
                            Courses with {courseData.numberOfTopics * courseData.lessonsPerTopic} lessons may take 2-3 minutes to generate. 
                            Consider using 3-5 topics with 2-4 lessons each for faster generation.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Create Button */}
              <div className="border-t pt-6">
                <button
                  onClick={handleCreateCourse}
                  disabled={creating || !courseData.title.trim() || !courseData.description.trim()}
                  className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition-colors ${
                    creating || !courseData.title.trim() || !courseData.description.trim()
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                  }`}
                >
                  {creating ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Creating Comprehensive Course...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      Generate Complete Course with AI
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Modal */}
      {showProgressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Creating Course</h3>
                <button
                  onClick={() => setShowProgressModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {currentStep === 'initializing' && '🔧 Initializing...'}
                    {currentStep === 'querying_pinecone' && '🔍 Searching knowledge base...'}
                    {currentStep === 'generating_content' && '🤖 Generating course content...'}
                    {currentStep === 'creating_course' && '📚 Creating course in Tutor LMS...'}
                    {currentStep === 'generating_images' && '🎨 Generating professional images with AI...'}
                    {currentStep === 'adding_lessons' && '📖 Adding lessons...'}
                    {currentStep === 'creating_quizzes' && '❓ Creating quizzes...'}
                    {currentStep === 'finalizing' && '🎯 Finalizing course...'}
                    {currentStep === 'completed' && '✅ Course created successfully!'}
                  </span>
                  <span className="text-sm text-gray-500">{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Logs */}
              <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Process Logs:</h4>
                <div className="space-y-1">
                  {logs.map((log, index) => (
                    <div key={index} className="text-sm text-gray-600 font-mono">
                      {log}
                    </div>
                  ))}
                </div>
              </div>

              {/* Success Message */}
              {createdCourse && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="text-lg font-semibold text-green-800 mb-2">Course Created Successfully!</h4>
                  <p className="text-green-700 mb-3">Your course has been created in Tutor LMS.</p>
                  <a
                    href={createdCourse.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    View Course
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CourseBuilder
