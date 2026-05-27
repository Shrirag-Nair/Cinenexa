import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sparkles, Globe } from 'lucide-react'
import { useMovieStore } from '@store/movieStore'
import { useAuthStore } from '@store/authStore'
import HeroBanner from '@components/movie/HeroBanner'
import MovieRow from '@components/movie/MovieRow'
import LanguageRow, { LANGUAGES } from '@components/movie/LanguageRow'

// Pick the most popular languages to show on homepage
const FEATURED_LANGUAGES = LANGUAGES.filter(l =>
  ['hi', 'ko', 'ta', 'ja', 'fr', 'es'].includes(l.code)
)

export default function HomePage() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()
  const {
    trending, topRated, nowPlaying, recommendations,
    isLoadingTrending, isLoadingRecommendations,
    fetchTrending, fetchTopRated, fetchNowPlaying, fetchRecommendations,
  } = useMovieStore()

  useEffect(() => {
    fetchTrending()
    fetchTopRated()
    fetchNowPlaying()
    if (isAuthenticated && user?.id) fetchRecommendations(user.id)
  }, [isAuthenticated, user?.id])

  // Extract movies array from recommendations (Wave 1 returns { movies, strategy, signals })
  const recoMovies = Array.isArray(recommendations)
    ? recommendations
    : (recommendations?.movies || [])

  return (
    <div className="min-h-screen">
      <HeroBanner movies={trending} />

      <div className="-mt-16 relative z-10">

        {/* AI Recommendations */}
        {isAuthenticated && recoMovies.length > 0 && (
          <section className="section-row">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={18} className="text-brand-400" />
              <h2 className="text-lg sm:text-xl font-bold text-white">Recommended for You</h2>
              <span className="text-xs bg-brand-500/20 border border-brand-500/30 text-brand-400 px-2 py-0.5 rounded font-medium">AI</span>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {recoMovies.slice(0, 12).map((movie, i) => (
                <div key={movie.id} className="flex-shrink-0 w-[140px] sm:w-[160px] lg:w-[180px]">
                  <div
                    className="aspect-[2/3] rounded-lg overflow-hidden cursor-pointer group relative bg-surface-800"
                    onClick={() => navigate(`/movie/${movie.id}`)}
                  >
                    <img
                      src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                      alt={movie.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <p className="text-sm text-white/70 mt-2 line-clamp-1">{movie.title}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Main movie rows */}
        <MovieRow title="Trending This Week" badge="🔥 Hot" movies={trending}   isLoading={isLoadingTrending} showRank />
        <MovieRow title="Now Playing"                         movies={nowPlaying} />
        <MovieRow title="Top Rated All Time"                  movies={topRated}  />

        {/* World Cinema section */}
        <section className="section-row">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Globe size={20} className="text-brand-400" />
              <h2 className="text-lg sm:text-xl font-bold text-white">World Cinema</h2>
            </div>
            <button
              onClick={() => navigate('/language')}
              className="text-sm text-brand-400 hover:text-brand-300 transition-colors"
            >
              Explore all languages →
            </button>
          </div>
          <p className="text-white/40 text-sm -mt-4 mb-6">Discover movies from across the globe</p>
        </section>

        {/* Featured language rows — lazy loaded */}
        {FEATURED_LANGUAGES.map(lang => (
          <LanguageRow
            key={lang.code}
            langCode={lang.code}
            langLabel={lang.label}
            flag={lang.flag}
            region={lang.region}
          />
        ))}

        {/* Genre quick picks */}
        <section className="section-row">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-5">Browse by Genre</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {GENRES.map(({ id, name, emoji, color }) => (
              <motion.button
                key={id}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(`/browse?genre=${id}&name=${name}`)}
                className={`${color} rounded-xl p-4 text-left flex flex-col gap-2 hover:brightness-110 transition-all`}
              >
                <span className="text-2xl">{emoji}</span>
                <span className="text-sm font-semibold text-white">{name}</span>
              </motion.button>
            ))}
          </div>
        </section>

        {/* CTA for guests */}
        {!isAuthenticated && (
          <section className="section-row">
            <div className="bg-gradient-to-r from-brand-600/20 to-brand-900/20 border border-brand-500/20 rounded-2xl p-8 text-center">
              <h3 className="text-2xl font-bold text-white mb-2">Get Personalized Recommendations</h3>
              <p className="text-white/60 mb-6 max-w-md mx-auto">
                Sign up to unlock AI-powered recommendations, build your watchlist, and rate movies.
              </p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => navigate('/signup')} className="bg-brand-500 hover:bg-brand-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                  Create Free Account
                </button>
                <button onClick={() => navigate('/login')} className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                  Sign In
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

const GENRES = [
  { id: 28,    name: 'Action',      emoji: '💥', color: 'bg-red-900/60'    },
  { id: 12,    name: 'Adventure',   emoji: '🗺️', color: 'bg-amber-900/60'  },
  { id: 35,    name: 'Comedy',      emoji: '😂', color: 'bg-yellow-900/60' },
  { id: 18,    name: 'Drama',       emoji: '🎭', color: 'bg-purple-900/60' },
  { id: 27,    name: 'Horror',      emoji: '👻', color: 'bg-gray-900/80'   },
  { id: 10749, name: 'Romance',     emoji: '💕', color: 'bg-pink-900/60'   },
  { id: 878,   name: 'Sci-Fi',      emoji: '🚀', color: 'bg-blue-900/60'   },
  { id: 53,    name: 'Thriller',    emoji: '🔪', color: 'bg-slate-900/80'  },
  { id: 16,    name: 'Animation',   emoji: '🎨', color: 'bg-teal-900/60'   },
  { id: 99,    name: 'Documentary', emoji: '🎞️', color: 'bg-green-900/60'  },
  { id: 14,    name: 'Fantasy',     emoji: '🧙', color: 'bg-indigo-900/60' },
  { id: 80,    name: 'Crime',       emoji: '🕵️', color: 'bg-zinc-900/80'   },
]
