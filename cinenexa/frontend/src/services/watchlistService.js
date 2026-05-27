import apiClient from './apiClient'

export const watchlistService = {
  // Get user's full watchlist
  getWatchlist: (userId) => apiClient.get(`/watchlist/${userId}`),

  // Add movie to watchlist
  addToWatchlist: (userId, movie) =>
    apiClient.post(`/watchlist/${userId}`, {
      movieId: String(movie.id),
      title: movie.title,
      posterPath: movie.poster_path,
      releaseDate: movie.release_date,
      voteAverage: movie.vote_average,
      overview: movie.overview,
      genres: movie.genres || [],
    }),

  // Remove movie from watchlist
  removeFromWatchlist: (userId, movieId) =>
    apiClient.delete(`/watchlist/${userId}/${movieId}`),

  // Check if movie is in watchlist
  isInWatchlist: (userId, movieId) =>
    apiClient.get(`/watchlist/${userId}/${movieId}`),
}
