'use client'

import Link from 'next/link'
import { useCart } from '@/context/CartContext'
import { useChatbot } from '@/context/ChatbotContext'
import { useState } from 'react'
import { usePathname } from 'next/navigation'

const Logo = () => (
  <Link href="/" className="flex items-center gap-3">
    <div className="relative">
      {/* Modern M Logo */}
      <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-lg">
        <span className="text-white font-bold text-xl">M</span>
      </div>
      {/* Subtle glow effect */}
      <div className="absolute inset-0 w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl opacity-20 blur-sm"></div>
    </div>

    <span className="text-2xl font-bold text-gray-900">Mizel Safety Consulting</span>
  </Link>
)

export default function Navbar() {
  const { cartItems } = useCart()
  const { setIsChatbotOpen } = useChatbot()
  const totalItems = Array.isArray(cartItems) ? cartItems.reduce((acc, item) => acc + item.voteCount, 0) : 0
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const handleHowItWorks = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
    
    // If on homepage, scroll to how it works section
    if (pathname === '/') {
      const section = document.getElementById('how-it-works');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // If not on homepage, open the chatbot
      setIsChatbotOpen(true);
    }
  };

  return (
    <header className="sticky top-0 z-50 py-4 bg-white/95 backdrop-blur-md border-b border-gray-200">
      <div className="container mx-auto flex justify-between items-center px-4 md:px-0">
        <Logo />
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/courses" className="text-2xl text-gray-700 hover:text-blue-600 transition-colors">
            Courses
          </Link>
          <Link href="/faq" className="text-2xl text-gray-700 hover:text-blue-600 transition-colors">
            FAQ
          </Link>
          <Link href="/blog" className="text-2xl text-gray-700 hover:text-blue-600 transition-colors">
            Blog
          </Link>
          <a
            href="#how-it-works"
            className="text-2xl hover:text-blue-600 transition-colors bg-transparent border-none text-gray-700 cursor-pointer"
            onClick={handleHowItWorks}
          >
            How It Works
          </a>
          <Link
            href="/login"
            className="bg-blue-600 text-white font-semibold py-3 px-6 rounded-full hover:bg-blue-700 transition-colors text-xl"
          >
            Login
          </Link>
          <Link href="/cart" className="relative hover:text-black transition-colors text-gray-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-6 h-6"
            >
              <path d="M2.25 2.25a.75.75 0 000 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 00-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 000-1.5H5.378A2.25 2.25 0 017.5 15h11.218a.75.75 0 00.674-.421 60.358 60.358 0 002.46-5.23c.18-.487.22-1.01.12-1.521a.75.75 0 00-.728-.654h-12.21l-1.581-5.927A.75.75 0 003.636 2.25H2.25zM3.75 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM16.5 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
            </svg>
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 bg-black text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </Link>
        </nav>

        {/* Mobile Hamburger Menu */}
        <button
          className="md:hidden p-2"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle mobile menu"
        >
          <svg
            className="w-6 h-6 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Sidebar Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-64 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out">
            <div className="p-6">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-bold text-gray-900">Menu</h2>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2"
                >
                  <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <nav className="space-y-4">
                <Link 
                  href="/report-issue" 
                  className="block bg-black text-white font-semibold py-2 px-4 rounded-full hover:bg-gray-800 transition-colors text-center"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Report Issue
                </Link>
                <a
                  href="#how-it-works"
                  className="block bg-black text-white font-semibold py-2 px-4 rounded-full hover:bg-gray-800 transition-colors text-center cursor-pointer"
                  onClick={handleHowItWorks}
                >
                  How It Works
                </a>
                <Link
                  href="/login"
                  className="block bg-blue-600 text-white font-semibold py-2 px-4 rounded-full hover:bg-blue-700 transition-colors text-center"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link 
                  href="/cart" 
                  className="relative block bg-black text-white font-semibold py-2 px-4 rounded-full hover:bg-gray-800 transition-colors text-center"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-5 h-5"
                    >
                      <path d="M2.25 2.25a.75.75 0 000 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 00-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 000-1.5H5.378A2.25 2.25 0 017.5 15h11.218a.75.75 0 00.674-.421 60.358 60.358 0 002.46-5.23c.18-.487.22-1.01.12-1.521a.75.75 0 00-.728-.654h-12.21l-1.581-5.927A.75.75 0 003.636 2.25H2.25zM3.75 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM16.5 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
                    </svg>
                    <span>Cart</span>
                    {totalItems > 0 && (
                      <span className="bg-white text-black text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {totalItems}
                      </span>
                    )}
                  </div>
                </Link>
              </nav>
            </div>
          </div>
        </div>
      )}
    </header>
  )
} 