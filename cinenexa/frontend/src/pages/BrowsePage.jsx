import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMovieStore } from '@store/movieStore'
import MovieCard from '@components/movie/MovieCard'
import MovieCardSkeleton from '@components/movie/MovieCardSkeleton'
import { Filter, ChevronDown } from 'lucide-react'
import clsx from 'clsx'

const GENRES = [
  { id: null,  name: 'All' },
  { id: 28,    name: 'Action' },
  { id: 12,    name: 'Adventure' },
  { id: 35,    name: 'Comedy' },
  { id: 18,    name: 'Drama' },
  { id: 27,    name: 'Horror' },
  { id: 10749, name: 'Romance' },
  { id: 878,   name: 'Sci-Fi' },
  { id: 53,    name: 'Thriller' },
  { id: 16,    name: 'Animation' },
  { id: 99,    name: 'Documentary' },
  { id: 14,    name: 'Fantasy' },
  { id: 80,    name: 'Crime' },
]

const SORT_OPTIONS = [
  { value: 'trending',    label: 'Trending' },
  { value: 'top_rated',  label: 'Top Rated' },
  { value: 'now_playing',label: 'Now Playing' },
  { value: 'upcoming',   label: 'Upcoming' },
]

export default function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [sortBy, setSortBy] = useState('trending')
  const [selectedGenre, setSelectedGenre] = useState(null)

  const {
    trending, topRated, nowPlaying, upcoming, byGenre,
    isLoadingTrending,
    fetchTrending, fetchTopRated, fetchNowPlaying, fetchByGenre
  } = useMovieStore()

  useEffect(() => {
    const genreId = searchParams.get('genre')
    const genreName = searchParams.get('name')
    if (genreId) {
      setSelectedGenre(Number(genreId))
      fetchByGenre(Number(genreId), genreName || genreId)
    }
    fetchTrending()
    fetchTopRated()
    fetchNowPlaying()
  }, [])

  const getMovies = () => {
    if (selectedGenre) {
      const genreName = GENRES.find((g) => g.id === selectedGenre)?.name
      return byGenre[genreName] || []
    }
    switch (sortBy) {
      case 'top_rated':   return topRated
      case 'now_playing': return nowPlaying
      case 'upcoming':    return upcoming
      default:            return trending
    }
  }

  const movies = getMovies()
  const isLoading = isLoadingTrending && !movies.length

  const handleGenre = (genreId) => {
    setSelectedGenre(genreId)
    if (genreId) {
      const name = GENRES.find((g) => g.id === genreId)?.name
      setSearchParams({ genre: genreId, name })
      fetchByGenre(genreId, name)
    } else {
      setSearchParams({})
    }
  }

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Browse Movies</h1>
          <p className="text-white/40">Discover your next favorite film</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Sort by */}
          {!selectedGenre && (
            <div className="flex gap-2 flex-wrap">
              {SORT_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setSortBy(value)}
                  className={clsx(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    sortBy === value
                      ? 'bg-brand-500 text-white'
                      : 'bg-white/8 text-white/60 hover:text-white hover:bg-white/12'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Genre pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-8">
          {GENRES.map(({ id, name }) => (
            <button
              key={name}
              onClick={() => handleGenre(id)}
              className={clsx(
                'flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all',
                selectedGenre === id || (id === null && !selectedGenre)
                  ? 'bg-white text-black'
                  : 'bg-white/8 text-white/60 hover:text-white hover:bg-white/15'
              )}
            >
              {name}
            </button>
          ))}
        </div>

        {/* Results count */}
        {movies.length > 0 && (
          <p className="text-sm text-white/40 mb-5">
            Showing {movies.length} movies
            {selectedGenre && ` · ${GENRES.find(g => g.id === selectedGenre)?.name}`}
          </p>
        )}

        {/* Grid */}
        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 sm:gap-4">
          {isLoading
            ? Array.from({ length: 21 }).map((_, i) => (
                <MovieCardSkeleton key={i} />
              ))
            : movies.map((movie, i) => (
                <MovieCard key={movie.id} movie={movie} index={i} />
              ))
          }
        </div>

        {!isLoading && movies.length === 0 && (
          <div className="text-center py-20">
            <p className="text-white/40 text-lg">No movies found</p>
          </div>
        )}
      </div>
    </div>
  )
}
