import apiClient from './apiClient'

export const ratingsService = {
  // Get summary stats for a movie
  getSummary: (movieId) =>
    apiClient.get(`/ratings/${movieId}/summary`),

  // Get all reviews for a movie
  getReviews: (movieId) =>
    apiClient.get(`/ratings/${movieId}/reviews`),

  // Get the current user's rating for a movie
  getUserRating: (movieId) =>
    apiClient.get(`/ratings/${movieId}/user`),

  // Submit a rating (and optional review)
  submitRating: (movieId, { rating, review, movieTitle, genres }) =>
    apiClient.post(`/ratings/${movieId}`, { rating, review, movieTitle, genres }),

  // Delete a rating
  deleteRating: (movieId) =>
    apiClient.delete(`/ratings/${movieId}`),

  // Mark a review as helpful
  markHelpful: (movieId, reviewUserId) =>
    apiClient.post(`/ratings/${movieId}/helpful`, { reviewUserId }),
}
