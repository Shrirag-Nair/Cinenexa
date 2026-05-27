import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bookmark, BookmarkCheck, Star, Play, Info } from 'lucide-react'
import { useMovieStore } from '@store/movieStore'
import { useAuthStore } from '@store/authStore'
import { getPosterUrl } from '@services/movieService'
import clsx from 'clsx'
import toast from 'react-hot-toast'

export default function MovieCard({ movie, index = 0, showRank = false }) {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useMovieStore()
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const inWatchlist = isInWatchlist(movie.id)

  const handleWatchlist = async (e) => {
    e.stopPropagation()
    if (!isAuthenticated) {
      toast.error('Sign in to add to watchlist')
      navigate('/login')
      return
    }
    if (inWatchlist) {
      await removeFromWatchlist(user.id, movie.id)
      toast.success('Removed from watchlist')
    } else {
      await addToWatchlist(user.id, movie)
      toast.success('Added to watchlist')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="group relative cursor-pointer flex-shrink-0"
      onClick={() => navigate(`/movie/${movie.id}`)}
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-surface-800 shadow-card group-hover:shadow-card-hover transition-shadow duration-300">
        {/* Skeleton while loading */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 skeleton" />
        )}

        <img
          src={imageError ? '/placeholder-poster.jpg' : getPosterUrl(movie.poster_path)}
          alt={movie.title}
          onLoad={() => setImageLoaded(true)}
          onError={() => { setImageError(true); setImageLoaded(true) }}
          className={clsx(
            'w-full h-full object-cover transition-transform duration-500 group-hover:scale-105',
            imageLoaded ? 'opacity-100' : 'opacity-0'
          )}
        />

        {/* Rank badge */}
        {showRank && (
          <div className="absolute top-2 left-2 bg-brand-500 text-white text-xs font-bold px-2 py-1 rounded">
            #{index + 1}
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
          {/* Action buttons */}
          <div className="flex gap-2 mb-2">
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/movie/${movie.id}`) }}
              className="flex-1 flex items-center justify-center gap-1.5 bg-white text-black text-xs font-semibold py-2 rounded hover:bg-white/90 transition-colors"
            >
              <Play size={12} fill="black" /> Play
            </button>
            <button
              onClick={handleWatchlist}
              className={clsx(
                'p-2 rounded transition-colors',
                inWatchlist
                  ? 'bg-brand-500 text-white'
                  : 'bg-white/10 text-white hover:bg-white/20'
              )}
            >
              {inWatchlist ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/movie/${movie.id}`) }}
              className="p-2 bg-white/10 text-white hover:bg-white/20 rounded transition-colors"
            >
              <Info size={14} />
            </button>
          </div>

          {/* Rating */}
          {movie.vote_average > 0 && (
            <div className="flex items-center gap-1">
              <Star size={10} className="text-gold-400 fill-gold-400" />
              <span className="text-xs text-white/80 font-medium">
                {movie.vote_average.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Title below card */}
      <div className="mt-2 px-0.5">
        <p className="text-sm text-white/80 group-hover:text-white transition-colors line-clamp-1 font-medium">
          {movie.title}
        </p>
        <p className="text-xs text-white/40 mt-0.5">
          {movie.release_date?.slice(0, 4)}
          {movie.vote_average > 0 && (
            <span className="ml-2 text-gold-500">★ {movie.vote_average.toFixed(1)}</span>
          )}
        </p>
      </div>
    </motion.div>
  )
}
