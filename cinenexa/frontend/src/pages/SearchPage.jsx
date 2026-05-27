import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMovieStore } from '@store/movieStore'
import MovieCard from '@components/movie/MovieCard'
import MovieCardSkeleton from '@components/movie/MovieCardSkeleton'
import { Search } from 'lucide-react'

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const { searchResults, isLoadingSearch, searchMovies, clearSearch } = useMovieStore()

  useEffect(() => {
    if (query) searchMovies(query)
    return () => clearSearch()
  }, [query])

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Search size={24} className="text-white/40" />
            <h1 className="text-3xl font-bold text-white">
              {query ? `Results for "${query}"` : 'Search'}
            </h1>
          </div>
          {searchResults.length > 0 && (
            <p className="text-white/40">{searchResults.length} movies found</p>
          )}
        </div>

        {isLoadingSearch ? (
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
            {Array.from({ length: 18 }).map((_, i) => <MovieCardSkeleton key={i} />)}
          </div>
        ) : searchResults.length > 0 ? (
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
            {searchResults.map((movie, i) => (
              <MovieCard key={movie.id} movie={movie} index={i} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <Search size={48} className="text-white/10 mx-auto mb-4" />
            <p className="text-white/40 text-lg">
              {query ? `No results for "${query}"` : 'Search for movies above'}
            </p>
            {query && (
              <p className="text-white/25 text-sm mt-2">Try a different spelling or keyword</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
