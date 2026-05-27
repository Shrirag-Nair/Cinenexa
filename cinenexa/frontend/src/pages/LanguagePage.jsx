import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Globe } from 'lucide-react'
import MovieCard from '@components/movie/MovieCard'
import MovieCardSkeleton from '@components/movie/MovieCardSkeleton'
import { LanguagePills, LANGUAGES } from '@components/movie/LanguageRow'
import apiClient from '@services/apiClient'

export default function LanguagePage() {
  const navigate           = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialLang        = searchParams.get('lang')
  const initialLabel       = searchParams.get('label') || 'All Languages'

  const [selectedLang,  setSelectedLang]  = useState(initialLang)
  const [movies,        setMovies]        = useState([])
  const [isLoading,     setIsLoading]     = useState(false)
  const [page,          setPage]          = useState(1)
  const [hasMore,       setHasMore]       = useState(true)
  const loaderRef = useRef(null)

  const langInfo = LANGUAGES.find(l => l.code === selectedLang)

  // Fetch movies for selected language
  const fetchMovies = useCallback(async (lang, pg) => {
    setIsLoading(true)
    try {
      const params = lang
        ? { lang, page: pg }
        : { page: pg }
      const data = await apiClient.get('/movies/language', { params })
      const results = Array.isArray(data) ? data : []
      setMovies(prev => pg === 1 ? results : [...prev, ...results])
      setHasMore(results.length >= 18)
    } catch {
      setMovies([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Reset and fetch on language change
  useEffect(() => {
    setPage(1)
    setMovies([])
    setHasMore(true)
    fetchMovies(selectedLang, 1)
    // Update URL
    if (selectedLang) {
      setSearchParams({ lang: selectedLang, label: langInfo?.label || selectedLang })
    } else {
      setSearchParams({})
    }
  }, [selectedLang])

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoading && hasMore && page > 1) {
          fetchMovies(selectedLang, page)
        }
      },
      { rootMargin: '200px' }
    )
    if (loaderRef.current) observer.observe(loaderRef.current)
    return () => observer.disconnect()
  }, [isLoading, hasMore, page, selectedLang])

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchMovies(selectedLang, nextPage)
  }

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Globe size={24} className="text-brand-400" />
          <div>
            <h1 className="text-3xl font-bold text-white">
              {selectedLang ? `${langInfo?.flag} ${langInfo?.label} Cinema` : 'World Cinema'}
            </h1>
            <p className="text-white/40 text-sm mt-0.5">
              {selectedLang ? langInfo?.region : 'Explore movies from every language'}
            </p>
          </div>
        </div>

        {/* Language pills */}
        <div className="mb-8">
          <LanguagePills selected={selectedLang} onChange={setSelectedLang} />
        </div>

        {/* Stats bar */}
        {movies.length > 0 && !isLoading && (
          <p className="text-sm text-white/40 mb-5">
            Showing {movies.length} movies
            {selectedLang && ` in ${langInfo?.label}`}
          </p>
        )}

        {/* Movie grid */}
        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 sm:gap-4">
          {movies.map((movie, i) => (
            <motion.div
              key={movie.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
            >
              <MovieCard movie={movie} index={i} />
            </motion.div>
          ))}
          {isLoading && Array.from({ length: 14 }).map((_, i) => <MovieCardSkeleton key={i} />)}
        </div>

        {/* Load more */}
        {!isLoading && hasMore && movies.length > 0 && (
          <div ref={loaderRef} className="mt-10 flex justify-center">
            <button
              onClick={handleLoadMore}
              className="bg-white/8 hover:bg-white/15 text-white/70 hover:text-white px-8 py-3 rounded-xl text-sm font-medium transition-all"
            >
              Load more
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && movies.length === 0 && (
          <div className="text-center py-24">
            <Globe size={48} className="text-white/10 mx-auto mb-4" />
            <p className="text-white/40">No movies found for this language</p>
          </div>
        )}
      </div>
    </div>
  )
}
