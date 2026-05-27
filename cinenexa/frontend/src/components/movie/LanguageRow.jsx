import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import MovieCard from '@components/movie/MovieCard'
import MovieCardSkeleton from '@components/movie/MovieCardSkeleton'
import apiClient from '@services/apiClient'

// ── All supported languages ───────────────────────────────────────────────────
export const LANGUAGES = [
  { code: 'en', label: 'English',    flag: '🇺🇸', region: 'Hollywood'     },
  { code: 'hi', label: 'Hindi',      flag: '🇮🇳', region: 'Bollywood'     },
  { code: 'ta', label: 'Tamil',      flag: '🇮🇳', region: 'Kollywood'     },
  { code: 'te', label: 'Telugu',     flag: '🇮🇳', region: 'Tollywood'     },
  { code: 'ml', label: 'Malayalam',  flag: '🇮🇳', region: 'Mollywood'     },
  { code: 'kn', label: 'Kannada',    flag: '🇮🇳', region: 'Sandalwood'    },
  { code: 'ko', label: 'Korean',     flag: '🇰🇷', region: 'K-Cinema'      },
  { code: 'ja', label: 'Japanese',   flag: '🇯🇵', region: 'J-Cinema'      },
  { code: 'fr', label: 'French',     flag: '🇫🇷', region: 'French Cinema' },
  { code: 'es', label: 'Spanish',    flag: '🇪🇸', region: 'Spanish Cinema'},
  { code: 'it', label: 'Italian',    flag: '🇮🇹', region: 'Italian Cinema'},
  { code: 'de', label: 'German',     flag: '🇩🇪', region: 'German Cinema' },
  { code: 'zh', label: 'Chinese',    flag: '🇨🇳', region: 'C-Cinema'      },
  { code: 'pt', label: 'Portuguese', flag: '🇧🇷', region: 'Brazilian'     },
  { code: 'ru', label: 'Russian',    flag: '🇷🇺', region: 'Russian Cinema'},
  { code: 'tr', label: 'Turkish',    flag: '🇹🇷', region: 'Turkish Cinema'},
  { code: 'ar', label: 'Arabic',     flag: '🇸🇦', region: 'Arabic Cinema' },
  { code: 'th', label: 'Thai',       flag: '🇹🇭', region: 'Thai Cinema'   },
]

// ── Language pill selector ────────────────────────────────────────────────────
export function LanguagePills({ selected, onChange }) {
  const rowRef = useRef(null)

  const scroll = (dir) =>
    rowRef.current?.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' })

  return (
    <div className="relative group/pills">
      <button
        onClick={() => scroll('left')}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1.5 bg-surface-950/90 text-white/60 hover:text-white rounded-full opacity-0 group-hover/pills:opacity-100 transition-opacity shadow-lg"
      >
        <ChevronLeft size={16} />
      </button>
      <button
        onClick={() => scroll('right')}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1.5 bg-surface-950/90 text-white/60 hover:text-white rounded-full opacity-0 group-hover/pills:opacity-100 transition-opacity shadow-lg"
      >
        <ChevronRight size={16} />
      </button>

      <div ref={rowRef} className="flex gap-2 overflow-x-auto no-scrollbar py-1 px-1">
        <button
          onClick={() => onChange(null)}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            !selected ? 'bg-white text-black' : 'bg-white/8 text-white/60 hover:bg-white/15 hover:text-white'
          }`}
        >
          🌍 All Languages
        </button>
        {LANGUAGES.map(lang => (
          <button
            key={lang.code}
            onClick={() => onChange(lang.code === selected ? null : lang.code)}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              selected === lang.code
                ? 'bg-brand-500 text-white'
                : 'bg-white/8 text-white/60 hover:bg-white/15 hover:text-white'
            }`}
          >
            <span>{lang.flag}</span>
            <span>{lang.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Language movie row (for homepage) ─────────────────────────────────────────
export default function LanguageRow({ langCode, langLabel, flag, region }) {
  const navigate   = useNavigate()
  const rowRef     = useRef(null)
  const sectionRef = useRef(null)

  const [movies,    setMovies]    = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetched,   setFetched]   = useState(false)

  async function fetchMovies() {
    if (fetched) return
    setFetched(true)
    setIsLoading(true)
    try {
      // Use apiClient so it shares the same base URL config
      const data = await apiClient.get('/movies/language', { params: { lang: langCode, page: 1 } })
      setMovies(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(`Language row error (${langCode}):`, e.message)
      setMovies([])
    } finally {
      setIsLoading(false)
    }
  }

  // ── Intersection observer — fetch when row scrolls into view ────────────────
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          fetchMovies()
          observer.disconnect() // only fetch once
        }
      },
      { rootMargin: '300px' } // start loading 300px before it's visible
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [langCode]) // re-run if langCode changes

  const scroll = (dir) =>
    rowRef.current?.scrollBy({ left: dir === 'left' ? -400 : 400, behavior: 'smooth' })

  return (
    <section ref={sectionRef} className="section-row group/row">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{flag}</span>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">{langLabel}</h2>
            <p className="text-xs text-white/40">{region}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/language?lang=${langCode}&label=${langLabel}`)}
            className="text-xs text-brand-400 hover:text-brand-300 transition-colors hidden sm:block"
          >
            See all →
          </button>
          <div className="hidden sm:flex gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
            <button onClick={() => scroll('left')}
              className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white/70 hover:text-white transition-all">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => scroll('right')}
              className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white/70 hover:text-white transition-all">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable movie row */}
      <div ref={rowRef} className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[140px] sm:w-[160px] lg:w-[180px]">
                <MovieCardSkeleton />
              </div>
            ))
          : movies.length > 0
            ? movies.map((movie, i) => (
                <div key={movie.id} className="flex-shrink-0 w-[140px] sm:w-[160px] lg:w-[180px]">
                  <MovieCard movie={movie} index={i} />
                </div>
              ))
            : (
              <div className="flex items-center justify-center w-full py-10">
                <p className="text-white/30 text-sm">No movies found</p>
              </div>
            )
        }
      </div>
    </section>
  )
}
