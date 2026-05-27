import { create } from "zustand";
import { movieService } from "@services/movieService";
import { watchlistService } from "@services/watchlistService";
import { recommendationService } from "@services/recommendationService";
export const useMovieStore = create((set, get) => ({
  // Movie data
  trending: [],
  topRated: [],
  nowPlaying: [],
  upcoming: [],
  byGenre: {},
  searchResults: [],
  recommendations: [],
  currentMovie: null,

  // Watchlist
  watchlist: [],
  watchlistIds: new Set(),

  // UI state
  isLoadingTrending: false,
  isLoadingSearch: false,
  isLoadingMovie: false,
  isLoadingRecommendations: false,
  searchQuery: "",

  // ─── Movie Actions ────────────────────────────────────────────────

  fetchTrending: async () => {
    set({ isLoadingTrending: true });
    try {
      const data = await movieService.getTrending();
      set({ trending: data, isLoadingTrending: false });
    } catch {
      set({ isLoadingTrending: false });
    }
  },

  fetchTopRated: async () => {
    try {
      const data = await movieService.getTopRated();
      set({ topRated: data });
    } catch (e) {
      console.error(e);
    }
  },

  fetchNowPlaying: async () => {
    try {
      const data = await movieService.getNowPlaying();
      set({ nowPlaying: data });
    } catch (e) {
      console.error(e);
    }
  },

  fetchMovieById: async (id) => {
    set({ isLoadingMovie: true, currentMovie: null });
    try {
      const data = await movieService.getMovieById(id);
      set({ currentMovie: data, isLoadingMovie: false });
      return data;
    } catch {
      set({ isLoadingMovie: false });
    }
  },

  fetchByGenre: async (genreId, genreName) => {
    try {
      const data = await movieService.getByGenre(genreId);
      set((state) => ({ byGenre: { ...state.byGenre, [genreName]: data } }));
    } catch (e) {
      console.error(e);
    }
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
    set({ isLoadingRecommendations: true });
    try {
      const data = await movieService.getRecommendations(userId);
      set({ recommendations: data, isLoadingRecommendations: false });
    } catch {
      set({ isLoadingRecommendations: false });
    }
  },

  // ─── Watchlist Actions ────────────────────────────────────────────

  fetchWatchlist: async (userId) => {
    try {
      const data = await watchlistService.getWatchlist(userId);
      set({
        watchlist: data,
        watchlistIds: new Set(data.map((m) => m.movieId)),
      });
    } catch (e) {
      console.error(e);
    }
  },

  addToWatchlist: async (userId, movie) => {
    // Optimistic update
    set((state) => ({
      watchlist: [movie, ...state.watchlist],
      watchlistIds: new Set([...state.watchlistIds, movie.id]),
    }));
    try {
      await watchlistService.addToWatchlist(userId, movie);
    } catch {
      // Rollback
      set((state) => ({
        watchlist: state.watchlist.filter((m) => m.id !== movie.id),
        watchlistIds: new Set(
          [...state.watchlistIds].filter((id) => id !== movie.id),
        ),
      }));
    }
  },

  removeFromWatchlist: async (userId, movieId) => {
    const prevWatchlist = get().watchlist;
    // Optimistic update
    set((state) => ({
      watchlist: state.watchlist.filter((m) => m.id !== movieId),
      watchlistIds: new Set(
        [...state.watchlistIds].filter((id) => id !== movieId),
      ),
    }));
    try {
      await watchlistService.removeFromWatchlist(userId, movieId);
    } catch {
      set({
        watchlist: prevWatchlist,
        watchlistIds: new Set(prevWatchlist.map((m) => m.id)),
      });
    }
  },

  isInWatchlist: (movieId) => get().watchlistIds.has(String(movieId)),

  clearSearch: () => set({ searchResults: [], searchQuery: "" }),
}));
