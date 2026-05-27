import apiClient from './apiClient'
 
export const recommendationService = {
  // Get personalised recommendations for a user
  getRecommendations: (userId) =>
    apiClient.get(`/recommendations/${userId}`),
 
  // Record a user interaction for AI signal — fire and forget, never blocks UI
  recordInteraction: async (movieId, type, genres = []) => {
    try {
      await apiClient.post('/recommendations/record', {
        movieId: String(movieId),
        type,
        genres,
      })
    } catch {
      // Silently ignore — interaction recording is non-critical
    }
  },
 
  // Record a search for AI signal — fire and forget
  recordSearch: async (query, genres = []) => {
    try {
      await apiClient.post('/recommendations/search', { query, genres })
    } catch {
      // Silently ignore
    }
  },
}