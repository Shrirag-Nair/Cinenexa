import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Plus, Check, Info, Star, Clock, Calendar } from 'lucide-react'
import { useAuthStore } from '@store/authStore'
import { useMovieStore } from '@store/movieStore'
import { getBackdropUrl } from '@services/movieService'
import clsx from 'clsx'
import toast from 'react-hot-toast'

export default function HeroBanner({ movies = [] }) {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useMovieStore()

  const [current, setCurrent] = useState(0)
  const [imageLoaded, setImageLoaded] = useState(false)
  const featured = movies.slice(0, 5)

  // Auto-rotate every 8s
  useEffect(() => {
    if (featured.length <= 1) return
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % featured.length)
      setImageLoaded(false)
    }, 8000)
    return () => clearInterval(timer)
  }, [featured.length])

  if (!featured.length) {
    return (
      <div className="relative w-full h-[70vh] min-h-[500px] bg-surface-900 animate-pulse" />
    )
  }

  const movie = featured[current]
  const inWatchlist = isInWatchlist(movie.id)

  const handleWatchlist = async () => {
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
    <div className="relative w-full h-[75vh] min-h-[520px] max-h-[800px] overflow-hidden">
      {/* Background image */}
      <AnimatePresence mode="wait">
        <motion.div
          key={movie.id}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0"
        >
          <img
            src={getBackdropUrl(movie.backdrop_path)}
            alt={movie.title}
            onLoad={() => setImageLoaded(true)}
            className={clsx(
              'w-full h-full object-cover transition-opacity duration-500',
              imageLoaded ? 'opacity-100' : 'opacity-0'
            )}
          />
          {!imageLoaded && <div className="absolute inset-0 bg-surface-900" />}
        </motion.div>
      </AnimatePresence>

      {/* Gradients */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-transparent to-black/30" />

      {/* Content */}
      <div className="absolute inset-0 flex items-center">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12 w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={movie.id}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.5 }}
              className="max-w-xl"
            >
              {/* Featured badge */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-bold text-brand-400 tracking-widest uppercase">
                  ✦ Featured
                </span>
              </div>

              {/* Title */}
              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl text-white text-shadow-lg leading-tight mb-3">
                {movie.title}
              </h1>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-3 mb-4 text-sm text-white/60">
                {movie.vote_average > 0 && (
                  <span className="flex items-center gap-1 text-gold-400 font-semibold">
                    <Star size={14} fill="currentColor" />
                    {movie.vote_average.toFixed(1)}
                  </span>
                )}
                {movie.release_date && (
                  <span className="flex items-center gap-1">
                    <Calendar size={13} />
                    {movie.release_date.slice(0, 4)}
                  </span>
                )}
                {movie.runtime && (
                  <span className="flex items-center gap-1">
                    <Clock size={13} />
                    {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
                  </span>
                )}
                {movie.genres?.slice(0, 3).map((g) => (
                  <span key={g.id} className="px-2 py-0.5 bg-white/10 rounded text-xs">
                    {g.name}
                  </span>
                ))}
              </div>

              {/* Overview */}
              <p className="text-white/70 text-sm sm:text-base leading-relaxed mb-6 line-clamp-3 text-shadow max-w-lg">
                {movie.overview}
              </p>

              {/* CTA buttons */}
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => navigate(`/movie/${movie.id}`)}
                  className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-lg font-bold text-sm hover:bg-white/90 transition-all shadow-glow-sm active:scale-95"
                >
                  <Play size={16} fill="black" /> Play Now
                </button>
                <button
                  onClick={handleWatchlist}
                  className={clsx(
                    'flex items-center gap-2 px-5 py-3 rounded-lg font-semibold text-sm transition-all active:scale-95',
                    inWatchlist
                      ? 'bg-brand-500 text-white hover:bg-brand-600'
                      : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'
                  )}
                >
                  {inWatchlist ? <Check size={16} /> : <Plus size={16} />}
                  {inWatchlist ? 'In Watchlist' : 'Watchlist'}
                </button>
                <button
                  onClick={() => navigate(`/movie/${movie.id}`)}
                  className="flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-5 py-3 rounded-lg font-semibold text-sm hover:bg-white/20 transition-all active:scale-95"
                >
                  <Info size={16} /> More Info
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Slide dots */}
      {featured.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
          {featured.map((_, i) => (
            <button
              key={i}
              onClick={() => { setCurrent(i); setImageLoaded(false) }}
              className={clsx(
                'transition-all duration-300 rounded-full',
                i === current ? 'w-8 h-2 bg-brand-500' : 'w-2 h-2 bg-white/30 hover:bg-white/60'
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}
