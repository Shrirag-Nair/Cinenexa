import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Save, Bell, Shield } from 'lucide-react'
import { useAuthStore } from '@store/authStore'
import { userService } from '@services/userService'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const GENRE_PREFS = ['Action','Comedy','Drama','Horror','Sci-Fi','Thriller','Romance','Animation','Documentary','Fantasy','Adventure','Crime']

export default function ProfilePage() {
  const { user, logout, updateUserName } = useAuthStore()
  const [name, setName]             = useState(user?.name || '')
  const [isSaving, setIsSaving]     = useState(false)
  const [selectedGenres, setSelectedGenres] = useState(['Action','Sci-Fi','Thriller'])

  const handleSave = async () => {
    if (!name.trim()) return toast.error('Name cannot be empty')
    setIsSaving(true)
    try {
      await userService.updateProfile(user.id, { name: name.trim() })
      updateUserName(name.trim())   // updates navbar avatar letter immediately
      toast.success('Profile updated!')
    } catch {
      toast.error('Failed to save profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSavePreferences = async () => {
    try {
      await userService.updatePreferences(user.id, { genres: selectedGenres })
      toast.success('Preferences saved!')
    } catch {
      toast.error('Failed to save preferences')
    }
  }

  const toggleGenre = (g) =>
    setSelectedGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])

  // Always derive avatar letter from current name state (not stale user object)
  const avatarLetter = name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <div className="w-16 h-16 rounded-full bg-brand-600 flex items-center justify-center text-2xl font-bold text-white select-none">
            {avatarLetter}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{name || user?.email}</h1>
            <p className="text-white/40 text-sm">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Personal Info */}
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="bg-surface-900/60 border border-white/5 rounded-2xl p-6">
            <h2 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
              <User size={16} className="text-brand-400" /> Personal Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-white/50 block mb-1.5">Display Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  placeholder="Your name"
                  className="w-full bg-surface-800 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-brand-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-sm text-white/50 block mb-1.5">Email Address</label>
                <input
                  value={user?.email || ''}
                  disabled
                  className="w-full bg-surface-800/50 border border-white/5 text-white/40 px-4 py-2.5 rounded-xl text-sm cursor-not-allowed"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {isSaving
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Save size={14} />
                }
                Save Changes
              </button>
            </div>
          </motion.section>

          {/* Genre Preferences */}
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-surface-900/60 border border-white/5 rounded-2xl p-6">
            <h2 className="text-base font-semibold text-white mb-2">🎬 Genre Preferences</h2>
            <p className="text-xs text-white/40 mb-4">Used to improve your AI recommendations</p>
            <div className="flex flex-wrap gap-2">
              {GENRE_PREFS.map(g => (
                <button key={g} onClick={() => toggleGenre(g)}
                  className={clsx('px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                    selectedGenres.includes(g) ? 'bg-brand-500 text-white' : 'bg-white/8 text-white/50 hover:bg-white/15'
                  )}>
                  {g}
                </button>
              ))}
            </div>
            <button onClick={handleSavePreferences}
              className="mt-4 text-xs text-brand-400 hover:text-brand-300 transition-colors">
              Save preferences →
            </button>
          </motion.section>

          {/* Notifications */}
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-surface-900/60 border border-white/5 rounded-2xl p-6">
            <h2 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
              <Bell size={16} className="text-brand-400" /> Notifications
            </h2>
            {[
              { label: 'New movie recommendations', desc: 'Weekly AI-curated picks' },
              { label: 'Watchlist reminders',       desc: 'Remind me to watch saved movies' },
              { label: 'New releases',              desc: 'Upcoming movies in my favorite genres' },
            ].map(({ label, desc }, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-sm text-white/80">{label}</p>
                  <p className="text-xs text-white/30 mt-0.5">{desc}</p>
                </div>
                <button className="w-10 h-6 bg-brand-500 rounded-full relative flex-shrink-0">
                  <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                </button>
              </div>
            ))}
          </motion.section>

          {/* Danger zone */}
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-red-950/30 border border-red-500/20 rounded-2xl p-6">
            <h2 className="text-base font-semibold text-red-400 mb-4 flex items-center gap-2">
              <Shield size={16} /> Account
            </h2>
            <button
              onClick={() => { logout(); toast('Signed out') }}
              className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors border border-red-500/30 hover:border-red-400/50 px-4 py-2 rounded-xl">
              Sign Out
            </button>
          </motion.section>
        </div>
      </div>
    </div>
  )
}
