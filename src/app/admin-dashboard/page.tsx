'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import EmailAnalytics from '@/components/EmailAnalytics'
import ChatAnalytics from '@/components/ChatAnalytics'
import CourseKeywordsAnalytics from '@/components/CourseKeywordsAnalytics'
import EmailCaptureAnalytics from '@/components/EmailCaptureAnalytics'

const AdminDashboard = () => {
  const router = useRouter()
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalUsers: 0,
    digitalClients: 0,
    totalRevenue: 0,
    pendingApprovals: 0,
    courseSearches: 0,
    totalInquiries: 0
  })
  const [loading, setLoading] = useState(true)
  const [adminUser, setAdminUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [updatingAI, setUpdatingAI] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<string | null>(null)
  const [updateProgress, setUpdateProgress] = useState(0)
  const [updateStep, setUpdateStep] = useState('')
  const [updateLogs, setUpdateLogs] = useState<string[]>([])
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [createdCourses, setCreatedCourses] = useState<any[]>([])
  const [coursesLoading, setCoursesLoading] = useState(false)

  // Tooltip component
  const Tooltip = ({ children, content }: { children: React.ReactNode; content: string }) => {
    const [showTooltip, setShowTooltip] = useState(false)

    return (
      <div 
        className="relative"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {children}
        {showTooltip && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg z-50 max-w-xs">
            <div className="whitespace-pre-line">{content}</div>
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
        )}
      </div>
    )
  }

  useEffect(() => {
    checkAdminAuth()
    fetchDashboardData()
    fetchCreatedCourses()
  }, [])

  const checkAdminAuth = () => {
    try {
      const adminSession = localStorage.getItem('adminSession')
      if (adminSession) {
        const sessionData = JSON.parse(adminSession)
        const now = Date.now()
        const sessionAge = now - sessionData.timestamp
        
        // Check if session is less than 24 hours old
        if (sessionAge < 24 * 60 * 60 * 1000) {
          setAdminUser(sessionData.admin)
          setAuthLoading(false)
          return
        } else {
          // Session expired, remove it
          localStorage.removeItem('adminSession')
        }
      }
      
      // No valid session, redirect to login
      router.push('/login')
    } catch (error) {
      console.error('Error checking admin auth:', error)
      router.push('/login')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('adminSession')
    router.push('/login')
  }

  const fetchDashboardData = async () => {
    try {
      // Fetch all dashboard data
      const [courseSearchRes, coursesRes, analyticsRes] = await Promise.all([
        fetch('/api/course-search'),
        fetch('/api/courses'),
        fetch('/api/analytics/dashboard')
      ])
      
      const courseSearchData = await courseSearchRes.json()
      const coursesData = await coursesRes.json()
      const analyticsData = await analyticsRes.json()

      setStats({
        totalCourses: coursesData?.courses?.length || 0,
        totalUsers: analyticsData?.analytics?.totalUsers || 0,
        digitalClients: analyticsData?.analytics?.digitalClients || 0,
        totalRevenue: analyticsData?.analytics?.totalRevenue || 0,
        pendingApprovals: analyticsData?.analytics?.pendingApprovals || 0,
        courseSearches: courseSearchData?.analytics?.length || 0,
        totalInquiries: analyticsData?.analytics?.totalInquiries || 0
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCreatedCourses = async () => {
    setCoursesLoading(true)
    try {
      // First try to get courses from our local tracking
      const response = await fetch('/api/course-builder/get-created-courses')
      const data = await response.json()
      
      if (data.success && data.courses.length > 0) {
        // Convert to the format expected by the UI
        const formattedCourses = data.courses.map((course: any) => ({
          id: course.id,
          title: course.title,
          link: course.permalink || `https://wordpress-1537294-5934650.cloudwaysapps.com/wp-admin/post.php?post=${course.id}&action=edit`,
          date: course.createdAt,
          status: course.status,
          excerpt: course.description,
          author: 1,
          featured_media: 0,
          statistics: course.statistics
        }))
        setCreatedCourses(formattedCourses)
      } else {
        // Fallback: try the Tutor LMS API
        const tutorResponse = await fetch('/api/tutor-lms/get-courses')
        const tutorData = await tutorResponse.json()
        
        if (tutorData.success) {
          setCreatedCourses(tutorData.courses)
        } else {
          console.error('Failed to fetch courses from both sources:', data.message, tutorData.message)
          setCreatedCourses([])
        }
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
      setCreatedCourses([])
    } finally {
      setCoursesLoading(false)
    }
  }

  const handleUpdateAI = async () => {
    setUpdatingAI(true)
    setUpdateStatus('🔄 Starting AI update...')
    setUpdateProgress(0)
    setUpdateStep('initializing')
    setUpdateLogs([])
    setShowProgressModal(true)
    
    try {
      const response = await fetch('/api/update-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error('Failed to start AI update')
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
                setUpdateStep(data.step)
                setUpdateProgress(data.progress)
                // Format the message to show green checkmarks for successful operations
                const formattedMessage = data.message.replace(/INFO/g, '✅').replace(/X/g, '✅')
                setUpdateLogs(prev => [...prev, formattedMessage])
              } else if (data.type === 'error') {
                setUpdateLogs(prev => [...prev, `❌ ${data.message}`])
              } else if (data.type === 'complete') {
                setUpdateProgress(100)
                setUpdateStep('completed')
                setUpdateLogs(prev => [...prev, data.message])
                
                if (data.summary) {
                  setUpdateStatus(`✅ AI updated successfully! Processed ${data.summary.filesAttempted} files (${data.summary.successRate} success rate)`)
                } else {
                  setUpdateStatus('✅ AI updated successfully!')
                }
                
                // Close modal after 3 seconds
                setTimeout(() => {
                  setShowProgressModal(false)
                  setUpdatingAI(false)
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
      console.error('Error updating AI:', error)
      setUpdateStatus('❌ Failed to update AI. Please try again.')
      setUpdateLogs(prev => [...prev, `❌ Error: ${error}`])
      setUpdatingAI(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Loading dashboard...</p>
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
              <h1 className="text-8xl md:text-10xl font-bold text-gray-900 mb-2 title-black">Admin Dashboard</h1>
              <p className="text-xl text-gray-600">Welcome, {adminUser.firstName} {adminUser.lastName}</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => router.push('/admin-dashboard/course-builder')}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span className="font-semibold">Course Builder</span>
              </button>
              <button
                onClick={handleUpdateAI}
                disabled={updatingAI}
                className={`px-6 py-3 rounded-lg transition-colors flex items-center gap-2 ${
                  updatingAI 
                    ? 'bg-gray-400 text-white cursor-not-allowed' 
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {updatingAI ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Updating AI...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Update AI
                  </>
                )}
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
              <button
                onClick={() => router.push('/')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Site
              </button>
            </div>
          </div>
        </div>
        </div>

      <div className="container mx-auto px-4 py-8">
        {/* Update Status Message */}
        {updateStatus && (
          <div className={`mb-6 p-4 rounded-lg ${
            updateStatus.includes('✅') 
              ? 'bg-green-100 border border-green-300 text-green-800' 
              : updateStatus.includes('❌')
              ? 'bg-red-100 border border-red-300 text-red-800'
              : 'bg-blue-100 border border-blue-300 text-blue-800'
          }`}>
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {updateStatus.includes('✅') ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                ) : updateStatus.includes('❌') ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                )}
              </svg>
              <span className="font-medium">{updateStatus}</span>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Tooltip content="Total number of safety training courses available in the system. This count is fetched from the courses table in the database and represents all active training programs offered by Mizel Consulting.">
            <div className="bg-white rounded-lg shadow-lg p-6 cursor-help">
                  <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-full">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div className="ml-4">
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalCourses}</p>
                  <p className="text-gray-600">Total Courses</p>
                    </div>
                  </div>
                </div>
          </Tooltip>

          <Tooltip content="Total number of users who have created accounts on the website. This count is fetched from the clients table in the database and represents all registered users who can log in and access training programs.">
            <div className="bg-white rounded-lg shadow-lg p-6 cursor-help">
                  <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-full">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</p>
                  <p className="text-gray-600">Registered Users</p>
                    </div>
                  </div>
                </div>
          </Tooltip>

          <Tooltip content="Number of users who have actually purchased digital courses through the website. This count is fetched from the course_enrollments table where course_type = 'digital' and represents users who have completed a purchase, not just registered accounts.">
            <div className="bg-white rounded-lg shadow-lg p-6 cursor-help">
                  <div className="flex items-center">
                <div className="p-3 bg-indigo-100 rounded-full">
                  <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-semibold text-gray-900">{stats.digitalClients}</p>
                  <p className="text-gray-600">Digital Clients</p>
                </div>
              </div>
            </div>
          </Tooltip>

          <Tooltip content="Total number of inquiries received through contact forms, chat sessions, and email captures. This count is fetched from the email_captures table and represents all potential leads who have provided their contact information.">
            <div className="bg-white rounded-lg shadow-lg p-6 cursor-help">
                  <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-full">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalInquiries}</p>
                  <p className="text-gray-600">Total Inquiries</p>
                    </div>
                  </div>
                </div>
          </Tooltip>

          <Tooltip content="Total revenue generated from all course purchases. This amount is calculated by summing the price field from all records in the course_enrollments table, representing the total income from digital course sales.">
            <div className="bg-white rounded-lg shadow-lg p-6 cursor-help">
                  <div className="flex items-center">
                <div className="p-3 bg-yellow-100 rounded-full">
                  <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <div className="ml-4">
                  <p className="text-2xl font-semibold text-gray-900">${stats.totalRevenue.toLocaleString()}</p>
                  <p className="text-gray-600">Total Revenue</p>
                </div>
              </div>
            </div>
          </Tooltip>

          <Tooltip content="Number of pending approvals for artist submissions or other content that requires admin review. This count is fetched from the analytics dashboard API and represents items waiting for administrative action.">
            <div className="bg-white rounded-lg shadow-lg p-6 cursor-help">
                        <div className="flex items-center">
              <div className="p-3 bg-red-100 rounded-full">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-semibold text-gray-900">{stats.pendingApprovals}</p>
                <p className="text-gray-600">Pending Approvals</p>
              </div>
            </div>
            </div>
          </Tooltip>

          <Tooltip content="Total number of course searches performed by users on the website. This count is fetched from the course_search_analytics table and represents all search queries made through the course search functionality.">
            <div className="bg-white rounded-lg shadow-lg p-6 cursor-help">
            <div className="flex items-center">
              <div className="p-3 bg-indigo-100 rounded-full">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-semibold text-gray-900">{stats.courseSearches}</p>
                <p className="text-gray-600">Course Searches</p>
              </div>
            </div>
            </div>
          </Tooltip>
                  </div>

        {/* Course Builder Section */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-8 mb-8 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">AI Course Builder</h2>
              <p className="text-lg text-gray-600 mb-4">Create comprehensive training courses using your knowledge base</p>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Uses 1,887+ training documents
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Auto-generates quizzes
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Integrates with Tutor LMS
                </span>
              </div>
            </div>
            <button
              onClick={() => router.push('/admin-dashboard/course-builder')}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className="font-semibold text-lg">Create Course</span>
            </button>
          </div>
        </div>

        {/* Created Courses Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-1">Created Courses</h2>
              <p className="text-gray-600">View and manage courses created in Tutor LMS</p>
              <p className="text-sm text-blue-600 mt-1">
                💡 Note: Shows all courses created via AI Course Builder. Course data is tracked locally for reliable display.
              </p>
            </div>
            <button
              onClick={fetchCreatedCourses}
              disabled={coursesLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {coursesLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Loading...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </>
              )}
            </button>
          </div>

          {coursesLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading courses...</p>
            </div>
          ) : createdCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {createdCourses.map((course) => (
                <div key={course.id} className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{course.title}</h3>
                      <p className="text-sm text-gray-500 mb-1">ID: {course.id}</p>
                      <p className="text-sm text-gray-500">
                        Created: {new Date(course.date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      course.status === 'publish' ? 'bg-green-100 text-green-700' : 
                      course.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {course.status}
                    </span>
                  </div>
                  
                  <div className="mt-4">
                    <a
                      href={course.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full text-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                    >
                      <span>View in LMS</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <p className="text-xl text-gray-600 mb-2">No courses created yet</p>
              <p className="text-gray-500">Use the Course Builder above to create your first AI-powered course</p>
            </div>
          )}
        </div>

        {/* Email Analytics */}
        <EmailAnalytics className="mb-8" />

        {/* Chat Analytics */}
        <ChatAnalytics className="mb-8" />

        {/* Course Keywords Analytics */}
        <CourseKeywordsAnalytics className="mb-8" />

        {/* Email Capture Analytics */}
        <EmailCaptureAnalytics className="mb-8" />

        {/* Course Search Analytics */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">Course Search Analytics</h2>
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-2xl text-gray-600">Course search analytics will appear here</p>
            <p className="text-gray-500 mt-2">Track popular search terms and user behavior</p>
          </div>
        </div>
      </div>

      {/* AI Update Progress Modal */}
      {showProgressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">AI Update Progress</h3>
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
                    {updateStep === 'initializing' && '🔧 Initializing...'}
                    {updateStep === 'scanning_folders' && '📁 Scanning Google Drive folders...'}
                    {updateStep === 'scanning_subfolders' && '📂 Scanning subfolders...'}
                    {updateStep === 'searching_files' && '🔍 Searching for files...'}
                    {updateStep === 'files_found' && '📊 Files found, checking for updates...'}
                    {updateStep === 'checking_files' && '🔄 Checking for new/modified files...'}
                    {updateStep === 'processing_files' && '🔄 Processing files...'}
                    {updateStep === 'downloading' && '⬇️ Downloading files...'}
                    {updateStep === 'extracting_text' && '📝 Extracting text...'}
                    {updateStep === 'generating_embeddings' && '🧠 Generating embeddings...'}
                    {updateStep === 'storing_vectors' && '💾 Storing vectors in Pinecone...'}
                    {updateStep === 'upserting' && '📤 Upserting to database...'}
                    {updateStep === 'saving_manifest' && '💾 Saving manifest...'}
                    {updateStep === 'finalizing' && '📊 Finalizing...'}
                    {updateStep === 'completed' && '✅ Completed!'}
                  </span>
                  <span className="text-sm text-gray-500">{updateProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${updateProgress}%` }}
                  ></div>
                </div>
              </div>

              {/* Logs */}
              <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Process Logs:</h4>
                <div className="space-y-1">
                  {updateLogs.map((log, index) => (
                    <div key={index} className="text-sm text-gray-600 font-mono flex items-start">
                      <span className="text-green-600 mr-2">✅</span>
                      <span className="flex-1">{log.replace(/✅/g, '').trim()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 

export default AdminDashboard