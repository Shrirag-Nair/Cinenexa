import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  signIn, signUp, signOut, confirmSignUp,
  getCurrentUser, fetchAuthSession, fetchUserAttributes
} from 'aws-amplify/auth'
 
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
 
      // Sign up
      register: async ({ email, password, name }) => {
        set({ isLoading: true, error: null })
        try {
          const { userId } = await signUp({
            username: email,
            password,
            options: { userAttributes: { email, name } },
          })
          set({ isLoading: false })
          return { success: true, userId, nextStep: 'CONFIRM_SIGN_UP' }
        } catch (err) {
          set({ isLoading: false, error: err.message })
          throw err
        }
      },
 
      // Confirm OTP
      confirmRegistration: async ({ email, code }) => {
        set({ isLoading: true, error: null })
        try {
          await confirmSignUp({ username: email, confirmationCode: code })
          set({ isLoading: false })
          return { success: true }
        } catch (err) {
          set({ isLoading: false, error: err.message })
          throw err
        }
      },
 
      // Sign in
      login: async ({ email, password }) => {
        set({ isLoading: true, error: null })
        try {
          const { isSignedIn } = await signIn({ username: email, password })
          if (isSignedIn) {
            const session    = await fetchAuthSession()
            const attributes = await fetchUserAttributes()
            const token      = session.tokens?.idToken?.toString()
 
            // Always use 'sub' as the user ID — it's the Cognito UUID
            // and matches what the JWT authorizer puts in requestContext.authorizer.claims.sub
            const sub = attributes.sub || session.tokens?.idToken?.payload?.sub
 
            const user = {
              id:    sub,       // ← always the UUID, never email
              email: attributes.email || email,
              name:  attributes.name  || attributes.email?.split('@')[0] || 'User',
            }
 
            console.log('Logged in user id (sub):', sub)
            set({ user, token, isAuthenticated: true, isLoading: false })
            return { success: true }
          }
        } catch (err) {
          set({ isLoading: false, error: err.message })
          throw err
        }
      },
 
      // Sign out
      logout: async () => {
        try { await signOut() } catch {}
        set({ user: null, token: null, isAuthenticated: false, error: null })
      },
 
      // Refresh token
      refreshToken: async () => {
        try {
          const session = await fetchAuthSession({ forceRefresh: true })
          const token   = session.tokens?.idToken?.toString()
          set({ token })
          return token
        } catch {
          get().logout()
          return null
        }
      },
 
      // Update name in store immediately after profile save
      updateUserName: (name) => {
        const current = get().user
        if (current) set({ user: { ...current, name } })
      },
 
      clearError: () => set({ error: null }),
    }),
    {
      name: 'cinenexa-auth',
      partialize: (state) => ({
        user:            state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)