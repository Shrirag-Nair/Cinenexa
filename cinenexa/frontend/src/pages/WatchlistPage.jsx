import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bookmark, Trash2, Play, Star } from 'lucide-react'
import { useMovieStore } from '@store/movieStore'
import { useAuthStore } from '@store/authStore'
import { getPosterUrl } from '@services/movieService'
import toast from 'react-hot-toast'

export default function WatchlistPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { watchlist, fetchWatchlist, removeFromWatchlist } = useMovieStore()

  useEffect(() => {
    if (user?.id) fetchWatchlist(user.id)
  }, [user?.id])

  const handleRemove = async (movieId, title) => {
    await removeFromWatchlist(user.id, movieId)
    toast.success(`Removed "${title}" from watchlist`)
  }

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Bookmark size={24} className="text-brand-400" />
          <div>
            <h1 className="text-3xl font-bold text-white">My Watchlist</h1>
            <p className="text-white/40 text-sm mt-0.5">{watchlist.length} movies saved</p>
          </div>
        </div>

        {watchlist.length === 0 ? (
          <div className="text-center py-24">
            <Bookmark size={56} className="text-white/10 mx-auto mb-5" />
            <h3 className="text-xl font-semibold text-white mb-2">Your watchlist is empty</h3>
            <p className="text-white/40 mb-6">Start adding movies you want to watch</p>
            <button
              onClick={() => navigate('/browse')}
              className="bg-brand-500 hover:bg-brand-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Browse Movies
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {watchlist.map((movie, i) => (
              <motion.div
                key={movie.movieId}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex gap-4 bg-surface-900/60 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all group"
              >
                {/* Poster */}
                <div
                  className="flex-shrink-0 w-16 aspect-[2/3] rounded-lg overflow-hidden cursor-pointer"
                  onClick={() => navigate(`/movie/${movie.movieId}`)}
                >
                  <img
                    src={getPosterUrl(movie.posterPath, 'w185')}
                    alt={movie.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3
                    className="font-semibold text-white hover:text-brand-400 cursor-pointer transition-colors line-clamp-1"
                    onClick={() => navigate(`/movie/${movie.movieId}`)}
                  >
                    {movie.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-white/40">
                    {movie.releaseDate && <span>{movie.releaseDate.slice(0, 4)}</span>}
                    {movie.voteAverage > 0 && (
                      <span className="flex items-center gap-0.5 text-gold-500">
                        <Star size={10} fill="currentColor" /> {Number(movie.voteAverage).toFixed(1)}
                      </span>
                    )}
                  </div>
                  {movie.overview && (
                    <p className="text-xs text-white/40 mt-2 line-clamp-2 hidden sm:block">
                      {movie.overview}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => navigate(`/movie/${movie.movieId}`)}
                    className="p-2 bg-white/8 hover:bg-brand-500 text-white/60 hover:text-white rounded-lg transition-all"
                    title="View details"
                  >
                    <Play size={15} />
                  </button>
                  <button
                    onClick={() => handleRemove(movie.movieId, movie.title)}
                    className="p-2 bg-white/8 hover:bg-red-500/20 text-white/40 hover:text-red-400 rounded-lg transition-all"
                    title="Remove from watchlist"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
