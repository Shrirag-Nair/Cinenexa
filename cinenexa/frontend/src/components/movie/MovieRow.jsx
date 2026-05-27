import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import MovieCard from './MovieCard'
import MovieCardSkeleton from './MovieCardSkeleton'
import clsx from 'clsx'

export default function MovieRow({ title, movies = [], isLoading = false, showRank = false, badge }) {
  const rowRef = useRef(null)

  const scroll = (dir) => {
    const el = rowRef.current
    if (!el) return
    const amount = el.clientWidth * 0.75
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' })
  }

  const skeletonCount = 8

  return (
    <section className="section-row group/row">
      {/* Row header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg sm:text-xl font-bold text-white">{title}</h2>
          {badge && (
            <span className="text-xs bg-brand-500 text-white px-2 py-0.5 rounded font-medium">
              {badge}
            </span>
          )}
        </div>
        {/* Scroll arrows (desktop) */}
        <div className="hidden sm:flex gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
          <button
            onClick={() => scroll('left')}
            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white/70 hover:text-white transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white/70 hover:text-white transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Scrollable row */}
      <div className="relative">
        <div
          ref={rowRef}
          className="flex gap-3 overflow-x-auto no-scrollbar pb-2"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {isLoading
            ? Array.from({ length: skeletonCount }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[140px] sm:w-[160px] lg:w-[180px]" style={{ scrollSnapAlign: 'start' }}>
                  <MovieCardSkeleton />
                </div>
              ))
            : movies.map((movie, i) => (
                <div key={movie.id} className="flex-shrink-0 w-[140px] sm:w-[160px] lg:w-[180px]" style={{ scrollSnapAlign: 'start' }}>
                  <MovieCard movie={movie} index={i} showRank={showRank} />
                </div>
              ))
          }
        </div>
      </div>
    </section>
  )
}
