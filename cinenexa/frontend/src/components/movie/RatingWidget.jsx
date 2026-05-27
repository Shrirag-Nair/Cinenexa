import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Trash2, ThumbsUp, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuthStore } from '@store/authStore'
import apiClient from '@services/apiClient'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function RatingWidget({ movieId, movieTitle, genres = [] }) {
  const { user, isAuthenticated } = useAuthStore()

  const [summary,      setSummary]      = useState({ average: 0, count: 0, distribution: {} })
  const [userRating,   setUserRating]   = useState(null)
  const [userReview,   setUserReview]   = useState('')
  const [reviews,      setReviews]      = useState([])
  const [hoverStar,    setHoverStar]    = useState(0)
  const [showReviews,  setShowReviews]  = useState(false)
  const [showForm,     setShowForm]     = useState(false)
  const [draftRating,  setDraftRating]  = useState(0)
  const [draftReview,  setDraftReview]  = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading,    setIsLoading]    = useState(true)

  useEffect(() => {
    loadData()
  }, [movieId, isAuthenticated])

  async function loadData() {
    setIsLoading(true)
    try {
      const [summaryRes, reviewsRes] = await Promise.allSettled([
        apiClient.get(`/ratings/${movieId}/summary`),
        apiClient.get(`/ratings/${movieId}/reviews`),
      ])
      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value || { average: 0, count: 0, distribution: {} })
      if (reviewsRes.status === 'fulfilled') setReviews(reviewsRes.value || [])

      if (isAuthenticated && user?.id) {
        const userRes = await apiClient.get(`/ratings/${movieId}/user`)
        if (userRes?.rating) {
          setUserRating(userRes.rating)
          setUserReview(userRes.review || '')
          setDraftRating(userRes.rating)
          setDraftReview(userRes.review || '')
        }
      }
    } catch (e) {
      console.error('Rating load error:', e)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSubmit() {
    if (!isAuthenticated) return toast.error('Sign in to rate movies')
    if (!draftRating) return toast.error('Select a star rating first')
    setIsSubmitting(true)
    try {
      await apiClient.post(`/ratings/${movieId}`, {
        rating: draftRating,
        review: draftReview,
        movieTitle,
        genres: genres.map(g => ({ id: g.id, name: g.name })),
      })
      setUserRating(draftRating)
      setUserReview(draftReview)
      setShowForm(false)
      toast.success('Rating saved!')
      await loadData()
    } catch (e) {
      toast.error(e.message || 'Failed to save rating')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete() {
    try {
      await apiClient.delete(`/ratings/${movieId}`)
      setUserRating(null)
      setUserReview('')
      setDraftRating(0)
      setDraftReview('')
      toast.success('Rating removed')
      await loadData()
    } catch {
      toast.error('Failed to remove rating')
    }
  }

  const StarRow = ({ value, onHover, onClick, size = 20, readonly = false }) => (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(s => (
        <button
          key={s}
          type="button"
          disabled={readonly}
          onMouseEnter={() => !readonly && onHover?.(s)}
          onMouseLeave={() => !readonly && onHover?.(0)}
          onClick={() => !readonly && onClick?.(s)}
          className={clsx('transition-all', !readonly && 'hover:scale-110 cursor-pointer', readonly && 'cursor-default')}
        >
          <Star
            size={size}
            className={clsx('transition-colors', (hoverStar || value) >= s ? 'text-gold-400 fill-gold-400' : 'text-white/20')}
          />
        </button>
      ))}
    </div>
  )

  if (isLoading) return <div className="h-32 skeleton rounded-xl" />

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="bg-surface-900/60 border border-white/5 rounded-xl p-5">
        <div className="flex items-start gap-6 flex-wrap">
          {/* Average score */}
          <div className="text-center">
            <div className="text-4xl font-bold text-white">{summary.average || '—'}</div>
            <div className="text-xs text-white/40 mt-1">{summary.count} {summary.count === 1 ? 'rating' : 'ratings'}</div>
            {summary.average > 0 && (
              <div className="flex justify-center mt-1.5">
                <StarRow value={Math.round(summary.average)} readonly size={14} />
              </div>
            )}
          </div>

          {/* Distribution bars */}
          {summary.count > 0 && (
            <div className="flex-1 space-y-1.5 min-w-[160px]">
              {[5,4,3,2,1].map(star => {
                const count = summary.distribution?.[star] || 0
                const pct   = summary.count > 0 ? (count / summary.count) * 100 : 0
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="text-white/40 w-3">{star}</span>
                    <Star size={10} className="text-gold-400 fill-gold-400 flex-shrink-0" />
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gold-400 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-white/30 w-4 text-right">{count}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* User action */}
          <div className="ml-auto">
            {userRating ? (
              <div className="text-right">
                <p className="text-xs text-white/40 mb-1.5">Your rating</p>
                <StarRow value={userRating} readonly size={18} />
                <div className="flex gap-2 mt-2 justify-end">
                  <button
                    onClick={() => { setDraftRating(userRating); setDraftReview(userReview); setShowForm(true) }}
                    className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                  >
                    Edit
                  </button>
                  <button onClick={handleDelete} className="text-xs text-red-400 hover:text-red-300 transition-colors">
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => isAuthenticated ? setShowForm(true) : toast.error('Sign in to rate')}
                className="flex items-center gap-2 bg-white/8 hover:bg-white/15 border border-white/10 text-white/70 hover:text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              >
                <Star size={15} /> Rate this film
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Rating form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-surface-900/60 border border-brand-500/20 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white">Your rating for <span className="text-brand-400">{movieTitle}</span></h3>

              <div>
                <p className="text-xs text-white/40 mb-2">Stars</p>
                <StarRow
                  value={draftRating}
                  onHover={setHoverStar}
                  onClick={setDraftRating}
                  size={28}
                />
                {draftRating > 0 && (
                  <p className="text-xs text-white/40 mt-1.5">
                    {['','Terrible','Poor','Decent','Good','Excellent'][draftRating]}
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs text-white/40 mb-2">Review <span className="text-white/20">(optional)</span></p>
                <textarea
                  value={draftReview}
                  onChange={e => setDraftReview(e.target.value)}
                  placeholder="Share your thoughts about this film..."
                  maxLength={1000}
                  rows={4}
                  className="w-full bg-surface-800 border border-white/10 text-white placeholder-white/25 px-3 py-2.5 rounded-xl text-sm resize-none focus:outline-none focus:border-brand-500/50 transition-colors"
                />
                <p className="text-xs text-white/25 text-right mt-1">{draftReview.length}/1000</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !draftRating}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  {isSubmitting ? 'Saving...' : 'Save Rating'}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 bg-white/8 hover:bg-white/15 text-white/60 rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reviews section */}
      {reviews.length > 0 && (
        <div>
          <button
            onClick={() => setShowReviews(!showReviews)}
            className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors mb-3"
          >
            {showReviews ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
          </button>

          <AnimatePresence>
            {showReviews && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 overflow-hidden"
              >
                {reviews.map((r, i) => (
                  <motion.div
                    key={`${r.userId}-${r.movieId}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-surface-900/40 border border-white/5 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-brand-600/60 flex items-center justify-center text-xs font-semibold text-white">
                          {r.userId?.slice(0,2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-white/70">User {r.userId?.slice(0,8)}</p>
                          <p className="text-xs text-white/30">{new Date(r.reviewedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <StarRow value={r.rating} readonly size={12} />
                    </div>
                    <p className="text-sm text-white/60 leading-relaxed">{r.review}</p>
                    {r.helpful > 0 && (
                      <p className="text-xs text-white/30 mt-2 flex items-center gap-1">
                        <ThumbsUp size={10} /> {r.helpful} found helpful
                      </p>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
