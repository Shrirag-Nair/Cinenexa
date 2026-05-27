import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Bell, User, LogOut, Bookmark, ChevronDown, X, Menu } from 'lucide-react'
import { useAuthStore } from '@store/authStore'
import { useMovieStore } from '@store/movieStore'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAuthenticated, logout } = useAuthStore()
  // Derive avatar letter reactively so it updates immediately after profile save
  const avatarLetter = user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'
  const { searchMovies, searchResults, clearSearch } = useMovieStore()

  const [scrolled, setScrolled] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const searchRef = useRef(null)
  const searchTimeoutRef = useRef(null)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  const handleSearch = (e) => {
    const query = e.target.value
    setSearchQuery(query)
    clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      if (query.length >= 2) searchMovies(query)
      else clearSearch()
    }, 350)
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`)
      closeSearch()
    }
  }

  const closeSearch = () => {
    setSearchOpen(false)
    setSearchQuery('')
    clearSearch()
  }

  const handleLogout = async () => {
    await logout()
    toast.success('Signed out successfully')
    navigate('/')
  }

  const navLinks = [
    { label: 'Home', to: '/' },
    { label: 'Browse', to: '/browse' },
    { label: 'My Watchlist', to: '/watchlist', auth: true },
    { label: 'Languages', to: '/language' },
  ]

  return (
    <nav
      className={clsx(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-surface-950/95 backdrop-blur-md border-b border-white/5 shadow-lg'
          : 'bg-gradient-to-b from-black/80 to-transparent'
      )}
    >
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <span className="font-display text-2xl text-brand-500 tracking-wider">
              CINE<span className="text-white">NEXA</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) =>
              link.auth && !isAuthenticated ? null : (
                <Link
                  key={link.to}
                  to={link.to}
                  className={clsx(
                    'text-sm font-medium transition-colors duration-200',
                    location.pathname === link.to
                      ? 'text-white'
                      : 'text-white/60 hover:text-white'
                  )}
                >
                  {link.label}
                </Link>
              )
            )}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <AnimatePresence>
              {searchOpen ? (
                <motion.form
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 260, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleSearchSubmit}
                  className="relative overflow-hidden"
                >
                  <input
                    ref={searchRef}
                    value={searchQuery}
                    onChange={handleSearch}
                    placeholder="Search movies..."
                    className="w-full bg-surface-800/90 border border-white/20 text-white placeholder-white/40 px-4 py-1.5 pr-8 rounded text-sm focus:outline-none focus:border-brand-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={closeSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                  >
                    <X size={14} />
                  </button>

                  {/* Search dropdown */}
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-surface-900 border border-white/10 rounded-lg overflow-hidden shadow-2xl z-50">
                      {searchResults.slice(0, 6).map((movie) => (
                        <button
                          key={movie.id}
                          onClick={() => {
                            navigate(`/movie/${movie.id}`)
                            closeSearch()
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 text-left transition-colors"
                        >
                          <img
                            src={movie.poster_path
                              ? `https://image.tmdb.org/t/p/w92${movie.poster_path}`
                              : '/placeholder-poster.jpg'
                            }
                            alt={movie.title}
                            className="w-8 h-12 object-cover rounded flex-shrink-0"
                          />
                          <div>
                            <p className="text-sm text-white line-clamp-1">{movie.title}</p>
                            <p className="text-xs text-white/40">
                              {movie.release_date?.slice(0, 4)} · ⭐ {movie.vote_average?.toFixed(1)}
                            </p>
                          </div>
                        </button>
                      ))}
                      <button
                        onClick={handleSearchSubmit}
                        className="w-full px-3 py-2 text-xs text-brand-400 hover:bg-white/5 text-left border-t border-white/5"
                      >
                        See all results for "{searchQuery}"
                      </button>
                    </div>
                  )}
                </motion.form>
              ) : (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setSearchOpen(true)}
                  className="p-2 text-white/70 hover:text-white transition-colors"
                  aria-label="Search"
                >
                  <Search size={18} />
                </motion.button>
              )}
            </AnimatePresence>

            {isAuthenticated ? (
              <>
                {/* Notifications */}
                <button className="p-2 text-white/70 hover:text-white transition-colors hidden sm:block">
                  <Bell size={18} />
                </button>

                {/* Profile dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 pl-1"
                  >
                    <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-sm font-semibold select-none">
                      {avatarLetter}
                    </div>
                    <ChevronDown
                      size={14}
                      className={clsx('text-white/60 transition-transform', profileOpen && 'rotate-180')}
                    />
                  </button>

                  <AnimatePresence>
                    {profileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="absolute right-0 top-full mt-2 w-52 bg-surface-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
                      >
                        <div className="px-4 py-3 border-b border-white/5">
                          <p className="text-sm font-medium text-white">{user?.name || 'User'}</p>
                          <p className="text-xs text-white/40 truncate">{user?.email}</p>
                        </div>
                        <Link
                          to="/profile"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <User size={15} /> Profile & Settings
                        </Link>
                        <Link
                          to="/watchlist"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <Bookmark size={15} /> My Watchlist
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors border-t border-white/5"
                        >
                          <LogOut size={15} /> Sign Out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-sm text-white/70 hover:text-white transition-colors px-3 py-1.5"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="text-sm bg-brand-500 hover:bg-brand-600 text-white px-4 py-1.5 rounded-md font-medium transition-colors"
                >
                  Join Free
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 text-white/70 hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu size={20} />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-white/10 py-3 overflow-hidden"
            >
              {navLinks.map((link) =>
                link.auth && !isAuthenticated ? null : (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-2 py-2.5 text-sm text-white/70 hover:text-white"
                  >
                    {link.label}
                  </Link>
                )
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  )
}
