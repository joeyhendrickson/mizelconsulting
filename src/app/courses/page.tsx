'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useChatbot } from '@/context/ChatbotContext';

interface Course {
  id: string;
  title: string;
  description: string;
  short_description: string;
  category: string;
  subcategory: string;
  duration_hours: number;
  price: number;
  certification_type: string;
  difficulty_level: string;
  delivery_method: string[];
  featured_image_url: string;
  slug: string;
  is_featured: boolean;
  is_active: boolean;
  enrollment_count: number;
  view_count: number;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showCourseSearch, setShowCourseSearch] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    message: ''
  });

  const { setIsChatbotOpen, setChatbotMode } = useChatbot();

  const categories = ['All', 'Construction Safety', 'Environmental Safety', 'General Safety', 'Specialized Training'];

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/courses');
      if (response.ok) {
        const data = await response.json();
        setCourses(data.courses || []);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCourseSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseSearchQuery.trim()) return;

    try {
      setIsSearching(true);
      console.log('Course search query:', courseSearchQuery);
      
      // Open chatbot with course search mode
      setIsChatbotOpen(true);
      setChatbotMode('course-search');
      
      // Store the search query for the AI
      sessionStorage.setItem('courseSearchQuery', courseSearchQuery);
      
    } catch (error) {
      console.error('Course search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      console.log('Contact form submitted:', contactForm);
      
      // Here you would typically send the form data to your backend
      alert('Message sent successfully! Our CEO, Kris Mizel, will get back to you soon.');
      
      // Reset form
      setContactForm({ name: '', email: '', message: '' });
      setShowContactForm(false);
    } catch (error) {
      console.error('Contact form error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCourses = selectedCategory === 'All' 
    ? courses 
    : courses.filter(course => course.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-8xl md:text-10xl font-bold mb-6 title-black">
            Safety Training Courses
          </h1>
          <p className="text-3xl mb-8 max-w-3xl mx-auto">
            Comprehensive OSHA certification courses for your team. Digital and on-site training options available.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setShowCourseSearch(!showCourseSearch)}
              className="bg-white text-blue-600 font-semibold py-3 px-8 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 text-2xl"
            >
              <span>Explore Courses</span>
              <svg 
                className={`w-4 h-4 transition-transform duration-200 ${showCourseSearch ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button
              onClick={() => setShowContactForm(!showContactForm)}
              className="bg-transparent border-2 border-white text-white font-semibold py-3 px-8 rounded-lg hover:bg-white hover:text-blue-600 transition-colors flex items-center justify-center gap-2 text-2xl"
            >
              <span>Request Training</span>
              <svg 
                className={`w-4 h-4 transition-transform duration-200 ${showContactForm ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Contact Form Section */}
      {showContactForm && (
        <section className="transition-all duration-500 ease-in-out opacity-100 py-16">
          <div className="container mx-auto px-4">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
              <div className="text-center mb-6">
                <h3 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-2">
                  Get in Touch with Our Team
                </h3>
                <p className="text-gray-600 text-2xl">
                  Complete the form with a message and our CEO, Kris Mizel, will get back to you as soon as possible.
                </p>
              </div>
              
              <form onSubmit={handleContactSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="courses-contact-name" className="block text-xl font-medium text-gray-700 mb-2">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      id="courses-contact-name"
                      value={contactForm.name}
                      onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="courses-contact-email" className="block text-xl font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="courses-contact-email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="courses-contact-message" className="block text-xl font-medium text-gray-700 mb-2">
                    Your Message *
                  </label>
                  <textarea
                    id="courses-contact-message"
                    value={contactForm.message}
                    onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Tell us about your safety training needs, questions, or how we can help..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-xl"
                    rows={4}
                    required
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <button
                    type="submit"
                    disabled={isSubmitting || !contactForm.name || !contactForm.email || !contactForm.message}
                    className="w-full sm:w-auto bg-blue-600 text-white font-semibold py-3 px-8 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Sending...
                      </>
                    ) : (
                      'Send Message'
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setShowContactForm(false)}
                    className="w-full sm:w-auto px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      )}

      {/* Course Search Section */}
      {showCourseSearch && (
        <section className="transition-all duration-500 ease-in-out opacity-100 py-16">
          <div className="container mx-auto px-4">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
              <div className="text-center mb-6">
                <h3 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-2">
                  Quick Search
                </h3>
                <p className="text-gray-600 text-2xl">
                  Tell us what safety training you need and our AI will find the best course for you.
                </p>
              </div>
              
              <form onSubmit={handleCourseSearch} className="space-y-6">
                <div>
                  <textarea
                    id="courses-course-search"
                    value={courseSearchQuery}
                    onChange={(e) => setCourseSearchQuery(e.target.value)}
                    placeholder="Example: I need OSHA 30-hour construction training for my supervisors, or HAZWOPER training for chemical cleanup workers..."
                    className="w-full px-4 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900 text-2xl"
                    rows={3}
                    required
                    autoFocus
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <button
                    type="submit"
                    disabled={isSearching || !courseSearchQuery.trim()}
                    className="w-full sm:w-auto bg-blue-600 text-white font-semibold py-3 px-8 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {isSearching ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Searching...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Find My Course
                      </>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setShowCourseSearch(false)}
                    className="w-full sm:w-auto px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
                
                <div className="text-center pt-4 border-t border-gray-200">
                  <p className="text-xl text-gray-500">
                    💡 Tip: Be specific about your industry, job role, and certification needs for better results.
                  </p>
                </div>
              </form>
            </div>
          </div>
        </section>
      )}

      {/* Trust Indicators */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">25+ Years Experience</h3>
              <p className="text-xl text-gray-600">Delivering comprehensive OSHA training and safety compliance solutions</p>
            </div>
            <div className="p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">Digital Learning</h3>
              <p className="text-xl text-gray-600">Advanced User Experience</p>
            </div>
            <div className="p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">Flexible Delivery</h3>
              <p className="text-xl text-gray-600">Digital self-paced courses or on-site training at your facility</p>
            </div>
          </div>
        </div>
      </section>

      {/* Training Categories */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-6xl font-bold text-gray-900 mb-4">Training Categories</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Designed to meet your compliance requirements and enhance workplace safety.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { 
                name: 'Construction Safety', 
                gradient: 'from-orange-500 to-red-600',
                icon: '🏗️',
                description: 'Industry-specific construction safety training and certifications' 
              },
              { 
                name: 'Environmental Safety', 
                gradient: 'from-green-500 to-emerald-600',
                icon: '🌱',
                description: 'HAZWOPER and environmental compliance training programs' 
              },
              { 
                name: 'General Safety', 
                gradient: 'from-blue-500 to-indigo-600',
                icon: '🏭',
                description: 'OSHA 10/30 hour general industry safety courses' 
              },
              { 
                name: 'Specialized Training', 
                gradient: 'from-purple-500 to-violet-600',
                icon: '🎯',
                description: 'Advanced safety certifications and specialized programs' 
              },
              { 
                name: 'Digital Learning', 
                gradient: 'from-teal-500 to-cyan-600',
                icon: '💻',
                description: 'Interactive courses with Quizzes and Monitoring' 
              },
              { 
                name: 'On-Site Training', 
                gradient: 'from-pink-500 to-rose-600',
                icon: '🏢',
                description: 'Customized training delivered at your facility' 
              }
            ].map((category, index) => (
              <div key={index} className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:-translate-y-1">
                {/* Header with gradient */}
                <div className={`h-24 bg-gradient-to-r ${category.gradient} relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-black/10"></div>
                  <div className="relative h-full flex items-center justify-center">
                    <div className="text-center text-white">
                      <div className="text-3xl mb-1">{category.icon}</div>
                      <h3 className="text-lg font-semibold tracking-wide">{category.name}</h3>
                    </div>
                  </div>
                  {/* Subtle pattern overlay */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                      backgroundImage: `radial-gradient(circle at 25% 25%, white 2px, transparent 2px)`,
                      backgroundSize: '20px 20px'
                    }}></div>
                  </div>
                </div>
                
                {/* Content area */}
                <div className="p-6">
                  <p className="text-gray-700 text-sm leading-relaxed mb-6">{category.description}</p>
                  
                  {/* CTA Button */}
                  <button className="w-full group/btn relative overflow-hidden bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 text-gray-800 font-medium py-3 px-4 rounded-xl border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:shadow-md">
                    <span className="relative z-10 flex items-center justify-center">
                      Explore {category.name}
                      <svg className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                  </button>
                </div>
                
                {/* Subtle border accent */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Course Search */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-6xl font-bold text-gray-900 mb-4">Course Search</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Find the safety training course you need for your industry and role.
            </p>
          </div>
          
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleCourseSearch} className="space-y-6">
              <div>
                <label htmlFor="courseSearch" className="block text-xl font-medium text-gray-700 mb-2">
                  Describe your safety training needs:
                </label>
                <textarea
                  id="courseSearch"
                  value={courseSearchQuery}
                  onChange={(e) => setCourseSearchQuery(e.target.value)}
                  placeholder="e.g., I need OSHA 10-hour construction safety training for my team..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={4}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSearching ? 'Searching...' : 'Search with AI'}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Trending Courses */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-6xl font-bold text-gray-900 mb-4">Trending Courses</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Designed to meet the highest industry standards.
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto mb-8">
            <div className="flex flex-wrap gap-2 justify-center">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-xl font-medium transition-colors ${selectedCategory === category ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading ? (
              <div className="col-span-full text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">Loading courses...</p>
              </div>
            ) : filteredCourses.length > 0 ? (
              filteredCourses.map((course) => (
                <div key={course.id} className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:-translate-y-1">
                  {/* Header with gradient based on category */}
                  <div className={`h-24 bg-gradient-to-r ${
                    course.category === 'Construction Safety' ? 'from-orange-500 to-red-600' :
                    course.category === 'Environmental Safety' ? 'from-green-500 to-emerald-600' :
                    course.category === 'General Safety' ? 'from-blue-500 to-indigo-600' :
                    course.category === 'Specialized Training' ? 'from-purple-500 to-violet-600' :
                    'from-teal-500 to-cyan-600'
                  } relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-black/10"></div>
                    <div className="relative h-full flex items-center justify-center">
                      <div className="text-center text-white">
                        <div className="text-2xl mb-1">
                          {course.category === 'Construction Safety' ? '🏗️' :
                           course.category === 'Environmental Safety' ? '🌱' :
                           course.category === 'General Safety' ? '🏭' :
                           course.category === 'Specialized Training' ? '🎯' :
                           '💼'}
                        </div>
                        <h3 className="text-sm font-semibold tracking-wide">{course.category}</h3>
                      </div>
                    </div>
                    {/* Subtle pattern overlay */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute inset-0" style={{
                        backgroundImage: `radial-gradient(circle at 25% 25%, white 2px, transparent 2px)`,
                        backgroundSize: '20px 20px'
                      }}></div>
                    </div>
                  </div>
                  
                  {/* Content area */}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                        {course.duration_hours}h • {course.certification_type}
                      </span>
                      {course.is_featured && (
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                          ⭐ Best Seller
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{course.title}</h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">{course.short_description}</p>
                    
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-2xl font-bold text-gray-900">${course.price}</div>
                      <div className="text-xs text-gray-500">
                        {course.enrollment_count} enrolled
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mb-4">
                      {course.delivery_method.slice(0, 2).map((method, index) => (
                        <span key={index} className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                          {method}
                        </span>
                      ))}
                      {course.delivery_method.length > 2 && (
                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          +{course.delivery_method.length - 2} more
                        </span>
                      )}
                    </div>
                    
                    <Link
                      href={`/course/${course.slug}`}
                      className="block w-full group/btn relative overflow-hidden bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 text-gray-800 font-medium py-3 px-4 rounded-xl border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:shadow-md"
                    >
                      <span className="relative z-10 flex items-center justify-center">
                        View Course Details
                        <svg className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                    </Link>
                  </div>
                  
                  {/* Subtle border accent */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
                </div>
            ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-600">No courses found for the selected category.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Enterprise Training Solutions */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-6xl font-bold text-gray-900 mb-4">Enterprise Training Solutions</h2>
            </div>
            
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Custom Training Programs</h3>
                  <ul className="space-y-4 text-xl text-gray-600">
                    <li>• Customized curriculum for your industry</li>
                    <li>• Flexible scheduling and delivery options</li>
                    <li>• Dedicated account management</li>
                    <li>• Progress tracking and reporting</li>
                    <li>• Bulk pricing and volume discounts</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Learning Management System</h3>
                  <ul className="space-y-4 text-xl text-gray-600">
                    <li>• Advanced LMS integration</li>
                    <li>• Employee progress tracking</li>
                    <li>• Automated compliance reporting</li>
                    <li>• Mobile-friendly learning platform</li>
                    <li>• 24/7 technical support</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="text-center mt-12">
              <button
                onClick={() => {
                  setChatbotMode('manager');
                  setIsChatbotOpen(true);
                }}
                className="bg-blue-600 text-white font-semibold py-4 px-10 rounded-lg hover:bg-blue-700 transition-colors text-2xl"
              >
                Get Enterprise Quote
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-5xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-2xl mb-8 max-w-2xl mx-auto">
            Join thousands of professionals who trust Mizel Safety Consulting for their safety training needs.
          </p>
          <button
            onClick={() => setIsChatbotOpen(true)}
            className="bg-transparent border-2 border-white text-white font-semibold py-3 px-8 rounded-lg hover:bg-white hover:text-blue-600 transition-colors"
          >
            Chat with AI Assistant
          </button>
        </div>
      </section>
    </div>
  );
}
