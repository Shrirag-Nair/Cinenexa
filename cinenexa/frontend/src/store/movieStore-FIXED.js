import { create } from 'zustand'
import { movieService } from '@services/movieService'
import { watchlistService } from '@services/watchlistService'

export const useMovieStore = create((set, get) => ({
  // Movie data
  trending:        [],
  topRated:        [],
  nowPlaying:      [],
  upcoming:        [],
  byGenre:         {},
  searchResults:   [],
  recommendations: [],
  currentMovie:    null,

  // Watchlist
  watchlist:    [],
  watchlistIds: new Set(),

  // UI state
  isLoadingTrending:        false,
  isLoadingSearch:          false,
  isLoadingMovie:           false,
  isLoadingRecommendations: false,
  searchQuery: '',

  // ── Movie actions ──────────────────────────────────────────────────────────

  fetchTrending: async () => {
    set({ isLoadingTrending: true })
    try {
      const data = await movieService.getTrending()
      set({ trending: Array.isArray(data) ? data : [], isLoadingTrending: false })
    } catch { set({ isLoadingTrending: false }) }
  },

  fetchTopRated: async () => {
    try {
      const data = await movieService.getTopRated()
      set({ topRated: Array.isArray(data) ? data : [] })
    } catch (e) { console.error(e) }
  },

  fetchNowPlaying: async () => {
    try {
      const data = await movieService.getNowPlaying()
      set({ nowPlaying: Array.isArray(data) ? data : [] })
    } catch (e) { console.error(e) }
  },

  fetchMovieById: async (id) => {
    set({ isLoadingMovie: true, currentMovie: null })
    try {
      const data = await movieService.getMovieById(id)
      set({ currentMovie: data, isLoadingMovie: false })
      return data
    } catch { set({ isLoadingMovie: false }) }
  },

  fetchByGenre: async (genreId, genreName) => {
    try {
      const data = await movieService.getByGenre(genreId)
      set((state) => ({ byGenre: { ...state.byGenre, [genreName]: Array.isArray(data) ? data : [] } }))
    } catch (e) { console.error(e) }
  },

  searchMovies: async (query) => {
    if (!query.trim()) {
      set({ searchResults: [], searchQuery: '' })
      return
    }
    set({ isLoadingSearch: true, searchQuery: query })
    try {
      const data = await movieService.search(query)
      set({ searchResults: Array.isArray(data) ? data : [], isLoadingSearch: false })
    } catch (e) {
      console.error('Search error:', e)
      set({ searchResults: [], isLoadingSearch: false })
    }
  },

  fetchRecommendations: async (userId) => {
    set({ isLoadingRecommendations: true })
    try {
      const data = await movieService.getRecommendations(userId)
      // Handle both array response and { movies, strategy } object
      const movies = Array.isArray(data) ? data : (data?.movies || [])
      set({ recommendations: movies, isLoadingRecommendations: false })
    } catch { set({ isLoadingRecommendations: false }) }
  },

  // ── Watchlist actions ──────────────────────────────────────────────────────

  fetchWatchlist: async (userId) => {
    try {
      const data = await watchlistService.getWatchlist(userId)
      const items = Array.isArray(data) ? data : []
      set({
        watchlist:    items,
        // Support both m.movieId (from DynamoDB) and m.id (raw TMDB)
        watchlistIds: new Set(items.map(m => String(m.movieId || m.id))),
      })
    } catch (e) { console.error('fetchWatchlist error:', e) }
  },

  addToWatchlist: async (userId, movie) => {
    const movieId = String(movie.id || movie.movieId)
    // Optimistic update
    set((state) => ({
      watchlist:    [{ ...movie, movieId }, ...state.watchlist],
      watchlistIds: new Set([...state.watchlistIds, movieId]),
    }))
    try {
      await watchlistService.addToWatchlist(userId, movie)
    } catch {
      // Rollback
      set((state) => ({
        watchlist:    state.watchlist.filter(m => String(m.movieId || m.id) !== movieId),
        watchlistIds: new Set([...state.watchlistIds].filter(id => id !== movieId)),
      }))
    }
  },

  removeFromWatchlist: async (userId, movieId) => {
    const id          = String(movieId)
    const prevList    = get().watchlist
    const prevIds     = get().watchlistIds

    // Optimistic update — filter by BOTH m.movieId and m.id to cover all cases
    set((state) => ({
      watchlist: state.watchlist.filter(
        m => String(m.movieId || m.id) !== id
      ),
      watchlistIds: new Set([...state.watchlistIds].filter(existing => existing !== id)),
    }))

    try {
      await watchlistService.removeFromWatchlist(userId, id)
      // Re-fetch to ensure server state matches local state
      await get().fetchWatchlist(userId)
    } catch (e) {
      console.error('removeFromWatchlist error:', e)
      // Rollback on failure
      set({ watchlist: prevList, watchlistIds: prevIds })
      throw e
    }
  },

  isInWatchlist: (movieId) => get().watchlistIds.has(String(movieId)),

  clearSearch: () => set({ searchResults: [], searchQuery: '' }),
}))
