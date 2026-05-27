import apiClient from './apiClient'

export const userService = {
  // Get user profile
  getProfile: (userId) => apiClient.get(`/user/${userId}`),

  // Update user profile
  updateProfile: (userId, data) => apiClient.put(`/user/${userId}`, data),

  // Update user preferences (for recommendations)
  updatePreferences: (userId, preferences) =>
    apiClient.put(`/user/${userId}/preferences`, { preferences }),

  // Get user watch history
  getHistory: (userId) => apiClient.get(`/user/${userId}/history`),

  // Add to watch history
  addToHistory: (userId, movieId, progress) =>
    apiClient.post(`/user/${userId}/history`, { movieId, progress }),
}
