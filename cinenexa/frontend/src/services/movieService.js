import apiClient from './apiClient'

// TMDB image base URL (used for poster paths from TMDB)
export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'
export const getPosterUrl = (path, size = 'w500') =>
  path ? `${TMDB_IMAGE_BASE}/${size}${path}` : '/placeholder-poster.jpg'
export const getBackdropUrl = (path, size = 'w1280') =>
  path ? `${TMDB_IMAGE_BASE}/${size}${path}` : '/placeholder-backdrop.jpg'

export const movieService = {
  // Get trending movies (weekly)
  getTrending: () => apiClient.get('/movies/trending'),

  // Get top-rated movies
  getTopRated: () => apiClient.get('/movies/top-rated'),

  // Get now playing
  getNowPlaying: () => apiClient.get('/movies/now-playing'),

  // Get upcoming
  getUpcoming: () => apiClient.get('/movies/upcoming'),

  // Get single movie details (includes cast, videos, similar)
  getMovieById: (id) => apiClient.get(`/movies/${id}`),

  // Search movies with optional fuzzy matching
  search: (query, page = 1) =>
    apiClient.get('/movies/search', { params: { q: query, page } }),

  // Get movies by genre
  getByGenre: (genreId, page = 1) =>
    apiClient.get('/movies/genre', { params: { genreId, page } }),

  // Get AI-powered recommendations for a user
  getRecommendations: (userId) =>
    apiClient.get(`/recommendations/${userId}`),

  // Get similar movies based on a movie
  getSimilar: (movieId) =>
    apiClient.get(`/movies/${movieId}/similar`),

  // Get all genres list
  getGenres: () => apiClient.get('/movies/genres'),
}
