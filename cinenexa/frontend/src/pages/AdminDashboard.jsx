import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Users, Star, Bookmark, TrendingUp, Activity, Search,
  Eye, RefreshCw, BarChart2, Clock, Film, Globe, ChevronUp,
  ChevronDown, AlertTriangle, Shield
} from 'lucide-react'
import { useAuthStore } from '@store/authStore'
import apiClient from '@services/apiClient'

// ── Chart primitives ──────────────────────────────────────────────────────────

function BarChart({ data, color = '#f03f30', height = 80, showLabels = false }) {
  if (!data?.length) return <div className="h-20 flex items-center justify-center text-white/20 text-xs">No data</div>
  const max = Math.max(...data.map(d => d.count || d.value || 0), 1)
  return (
    <div className="flex items-end gap-0.5" style={{ height }}>
      {data.map((d, i) => {
        const val = d.count || d.value || 0
        const pct = (val / max) * 100
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-surface-800 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
              {d.label || d.date || d.time || d.hour}: {val}
            </div>
            <div
              className="w-full rounded-t transition-all duration-500"
              style={{ height: `${Math.max(pct, 2)}%`, backgroundColor: color, opacity: 0.8 + (pct / max) * 0.2 }}
            />
            {showLabels && (
              <span className="text-[9px] text-white/30 rotate-45 origin-left mt-1 whitespace-nowrap">{d.label || d.date}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function DonutChart({ data, size = 120 }) {
  if (!data?.length) return null
  const total = data.reduce((s, d) => s + d.count, 0)
  if (!total) return null

  const COLORS = ['#f03f30','#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#14b8a6','#f97316']
  let cumulative = 0
  const slices = data.slice(0, 6).map((d, i) => {
    const pct   = d.count / total
    const start = cumulative
    cumulative += pct
    return { ...d, pct, start, color: COLORS[i % COLORS.length] }
  })

  const r = 40, cx = 60, cy = 60, strokeWidth = 18
  const circumference = 2 * Math.PI * r

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} viewBox="0 0 120 120">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ffffff10" strokeWidth={strokeWidth} />
        {slices.map((s, i) => (
          <circle
            key={i} cx={cx} cy={cy} r={r}
            fill="none" stroke={s.color} strokeWidth={strokeWidth}
            strokeDasharray={`${s.pct * circumference} ${circumference}`}
            strokeDashoffset={`${(1 - s.start) * circumference}`}
            style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px', transition: 'all 0.5s' }}
          />
        ))}
        <text x={cx} y={cy-4} textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">{total}</text>
        <text x={cx} y={cy+12} textAnchor="middle" fill="#ffffff60" fontSize="9">total</text>
      </svg>
      <div className="space-y-1.5">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-white/60 truncate max-w-[100px]">{s.label}</span>
            <span className="text-white/40 ml-auto">{Math.round(s.pct * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function LineChart({ data, color = '#f03f30', height = 60 }) {
  if (!data?.length) return null
  const max = Math.max(...data.map(d => d.count), 1)
  const w = 400, h = height
  const pts = data.map((d, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - (d.count / max) * h * 0.9,
  }))
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const area = `${path} L${w},${h} L0,${h} Z`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#lineGrad)" />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} className="opacity-0 hover:opacity-100 transition-opacity" />
      ))}
    </svg>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = 'text-brand-400', trend, isLoading }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-900/60 border border-white/5 rounded-2xl p-5"
    >
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-4 bg-white/10 rounded w-1/2" />
          <div className="h-8 bg-white/10 rounded w-3/4" />
          <div className="h-3 bg-white/10 rounded w-1/3" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <div className={`p-2 rounded-lg bg-white/5 ${color}`}>
              <Icon size={16} />
            </div>
            {trend !== undefined && (
              <span className={`text-xs flex items-center gap-0.5 ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {trend >= 0 ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {Math.abs(trend)}%
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-white">{value?.toLocaleString() ?? '—'}</p>
          <p className="text-sm text-white/50 mt-0.5">{label}</p>
          {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
        </>
      )}
    </motion.div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, subtitle, icon: Icon, children, action }) {
  return (
    <div className="bg-surface-900/60 border border-white/5 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={16} className="text-brand-400" />}
          <div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            {subtitle && <p className="text-xs text-white/30 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()

  const [overview,  setOverview]  = useState(null)
  const [realtime,  setRealtime]  = useState(null)
  const [users,     setUsers]     = useState([])
  const [tab,       setTab]       = useState('overview')
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [error,     setError]     = useState(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [overviewRes, realtimeRes] = await Promise.all([
        apiClient.get('/admin/overview'),
        apiClient.get('/admin/realtime'),
      ])
      setOverview(overviewRes)
      setRealtime(realtimeRes)
      setLastUpdated(new Date())
    } catch (e) {
      setError(e.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      const data = await apiClient.get('/admin/users')
      setUsers(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('Users fetch error:', e.message)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return }
    fetchData()
  }, [isAuthenticated])

  useEffect(() => {
    if (tab === 'users' && !users.length) fetchUsers()
  }, [tab])

  // Auto-refresh realtime every 30s
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const data = await apiClient.get('/admin/realtime')
        setRealtime(data)
        setLastUpdated(new Date())
      } catch {}
    }, 30000)
    return () => clearInterval(timer)
  }, [])

  const o = overview || {}
  const ov = o.overview || {}

  if (error) {
    return (
      <div className="min-h-screen pt-24 pb-12 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-white/40 text-sm mb-6">{error}</p>
          <button onClick={() => navigate('/')} className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors">
            Go Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20 pb-12 bg-surface-950">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 pt-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-500/20 rounded-xl">
              <Shield size={20} className="text-brand-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-white/40 text-sm">
                {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Loading...'}
              </p>
            </div>
          </div>
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="flex items-center gap-2 bg-white/8 hover:bg-white/15 text-white/70 hover:text-white px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-surface-900/60 border border-white/5 rounded-xl p-1 mb-8 w-fit">
          {[
            { id: 'overview',  label: 'Overview',  icon: BarChart2 },
            { id: 'realtime',  label: 'Realtime',  icon: Activity  },
            { id: 'content',   label: 'Content',   icon: Film      },
            { id: 'users',     label: 'Users',     icon: Users     },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.id ? 'bg-brand-500 text-white' : 'text-white/50 hover:text-white'
              }`}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* Key metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard icon={Users}     label="Total Users"       value={ov.totalUsers}        color="text-blue-400"   isLoading={isLoading} />
              <StatCard icon={Activity}  label="Active 7d"         value={ov.activeUsers7d}     color="text-green-400"  isLoading={isLoading} sub={`${ov.engagementRate || 0}% engagement`} />
              <StatCard icon={Users}     label="New Users 7d"      value={ov.newUsers7d}        color="text-purple-400" isLoading={isLoading} />
              <StatCard icon={Bookmark}  label="Watchlist Items"   value={ov.totalWatchlists}   color="text-amber-400"  isLoading={isLoading} />
              <StatCard icon={Star}      label="Total Ratings"     value={ov.totalRatings}      color="text-brand-400"  isLoading={isLoading} sub={`Avg ${ov.avgRating || 0} ⭐`} />
              <StatCard icon={Search}    label="Total Searches"    value={ov.totalSearches}     color="text-teal-400"   isLoading={isLoading} />
            </div>

            {/* Charts row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Section title="User Growth" subtitle="New registrations (14 days)" icon={TrendingUp}>
                {o.userGrowth && <LineChart data={o.userGrowth} color="#3b82f6" height={100} />}
                <div className="flex gap-6 mt-3">
                  {o.userGrowth?.slice(-7).map(d => (
                    <div key={d.date} className="text-center">
                      <p className="text-sm font-semibold text-white">{d.count}</p>
                      <p className="text-xs text-white/30">{d.date.slice(5)}</p>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="Platform Activity" subtitle="Interactions (14 days)" icon={Activity}>
                {o.activityByDay && <LineChart data={o.activityByDay} color="#f03f30" height={100} />}
              </Section>
            </div>

            {/* Charts row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Section title="Top Genres" subtitle="Across all user signals" icon={Globe}>
                <DonutChart data={o.topGenres} />
              </Section>

              <Section title="Rating Distribution" subtitle="How users rate movies" icon={Star}>
                <div className="space-y-2 mt-2">
                  {o.ratingDistribution?.map(d => {
                    const max = Math.max(...(o.ratingDistribution || []).map(x => x.count), 1)
                    return (
                      <div key={d.star} className="flex items-center gap-3">
                        <span className="text-xs text-white/50 w-8">{d.star} ⭐</span>
                        <div className="flex-1 h-2 bg-white/8 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(d.count / max) * 100}%` }}
                            transition={{ duration: 0.8, delay: d.star * 0.1 }}
                            className="h-full bg-gold-400 rounded-full"
                          />
                        </div>
                        <span className="text-xs text-white/40 w-6 text-right">{d.count}</span>
                      </div>
                    )
                  })}
                </div>
              </Section>

              <Section title="Activity by Hour" subtitle="When users are most active" icon={Clock}>
                {o.activityByHour && (
                  <BarChart
                    data={o.activityByHour.map(d => ({ ...d, label: `${d.hour}:00`, count: d.count }))}
                    color="#10b981"
                    height={100}
                  />
                )}
                <div className="flex justify-between mt-1 text-xs text-white/20">
                  <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
                </div>
              </Section>
            </div>

            {/* Top searches */}
            <Section title="Top Searches" subtitle="Most searched terms" icon={Search}
              action={<span className="text-xs text-white/30">{o.topSearches?.length || 0} unique terms</span>}
            >
              <div className="flex flex-wrap gap-2">
                {o.topSearches?.map((s, i) => (
                  <span key={i}
                    className="px-3 py-1.5 bg-white/8 border border-white/5 rounded-full text-sm text-white/60"
                    style={{ fontSize: `${Math.max(0.65, 1 - i * 0.04)}rem` }}
                  >
                    {s.label}
                    <span className="text-white/30 ml-1.5 text-xs">{s.count}</span>
                  </span>
                ))}
              </div>
            </Section>
          </div>
        )}

        {/* ── REALTIME TAB ─────────────────────────────────────────────────── */}
        {tab === 'realtime' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard icon={Users}    label="Active Now"         value={realtime?.activeNow}           color="text-green-400"  isLoading={isLoading} />
              <StatCard icon={Activity} label="Interactions / hr"  value={realtime?.interactionsLastHr}  color="text-brand-400"  isLoading={isLoading} />
              <StatCard icon={Search}   label="Searches / hr"      value={realtime?.searchesLastHr}      color="text-blue-400"   isLoading={isLoading} />
              <StatCard icon={Star}     label="Ratings / hr"       value={realtime?.ratingsLastHr}       color="text-amber-400"  isLoading={isLoading} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Section title="Activity (last hour)" subtitle="5-minute buckets" icon={Activity}>
                {realtime?.activityBuckets && (
                  <BarChart data={realtime.activityBuckets.map(b => ({ label: b.time, count: b.count }))} color="#f03f30" height={120} />
                )}
              </Section>

              <Section title="Live Searches" subtitle="Recent search queries" icon={Search}>
                {realtime?.recentSearches?.length ? (
                  <div className="space-y-2">
                    {realtime.recentSearches.map((q, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                        <Search size={12} className="text-white/30 flex-shrink-0" />
                        <span className="text-sm text-white/60">{q}</span>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="text-white/30 text-sm text-center py-6">No searches in the last hour</p>
                )}
              </Section>

              <Section title="Recent Ratings" subtitle="Last hour" icon={Star}>
                {realtime?.recentRatings?.length ? (
                  <div className="space-y-3">
                    {realtime.recentRatings.map((r, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/8 flex items-center justify-center text-xs font-bold text-white">
                          {r.rating}⭐
                        </div>
                        <div>
                          <p className="text-sm text-white/70">{r.movieTitle || `Movie ${r.movieId}`}</p>
                          <p className="text-xs text-white/30">{new Date(r.ratedAt).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-white/30 text-sm text-center py-6">No ratings in the last hour</p>
                )}
              </Section>
            </div>
          </div>
        )}

        {/* ── CONTENT TAB ──────────────────────────────────────────────────── */}
        {tab === 'content' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Section title="Most Watchlisted Movies" subtitle="By number of saves" icon={Bookmark}>
                <div className="space-y-3">
                  {o.topWatchlisted?.map((m, i) => (
                    <div key={m.id} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-white/30 w-5">#{i+1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/80 truncate">{m.title}</p>
                        <div className="h-1 bg-white/8 rounded-full mt-1 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(m.count / (o.topWatchlisted?.[0]?.count || 1)) * 100}%` }}
                            transition={{ duration: 0.6, delay: i * 0.05 }}
                            className="h-full bg-amber-400 rounded-full"
                          />
                        </div>
                      </div>
                      <span className="text-xs text-white/40 flex-shrink-0">{m.count}</span>
                    </div>
                  ))}
                  {!o.topWatchlisted?.length && <p className="text-white/30 text-sm text-center py-6">No watchlist data yet</p>}
                </div>
              </Section>

              <Section title="Most Rated Movies" subtitle="By rating count" icon={Star}>
                <div className="space-y-3">
                  {o.topRated?.map((m, i) => (
                    <div key={m.id} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-white/30 w-5">#{i+1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/80 truncate">{m.title}</p>
                        <div className="h-1 bg-white/8 rounded-full mt-1 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(m.count / (o.topRated?.[0]?.count || 1)) * 100}%` }}
                            transition={{ duration: 0.6, delay: i * 0.05 }}
                            className="h-full bg-brand-400 rounded-full"
                          />
                        </div>
                      </div>
                      <span className="text-xs text-white/40 flex-shrink-0">{m.count}</span>
                    </div>
                  ))}
                  {!o.topRated?.length && <p className="text-white/30 text-sm text-center py-6">No rating data yet</p>}
                </div>
              </Section>

              <Section title="Genre Popularity by Source" subtitle="Where genre interest comes from" icon={Globe}>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: '💾 Watchlist',  key: 'fromWatchlist', color: '#f59e0b' },
                    { label: '⭐ Ratings',    key: 'fromRatings',   color: '#f03f30' },
                    { label: '👁️ Browsing',   key: 'fromBrowsing',  color: '#3b82f6' },
                  ].map(({ label, key, color }) => (
                    <div key={key}>
                      <p className="text-xs text-white/40 mb-2">{label}</p>
                      <div className="space-y-1.5">
                        {(o.genreBySource?.[key] || []).slice(0, 5).map((g, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(g.count / ((o.genreBySource?.[key]?.[0]?.count) || 1)) * 100}%` }}
                                transition={{ duration: 0.5, delay: i * 0.05 }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: color }}
                              />
                            </div>
                            <span className="text-xs text-white/30 w-16 truncate">{g.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="Interaction Types" subtitle="How users engage" icon={Activity}>
                <DonutChart
                  data={o.interactionTypes?.map(i => ({ label: i.label.replace('_', ' '), count: i.count }))}
                />
              </Section>
            </div>
          </div>
        )}

        {/* ── USERS TAB ────────────────────────────────────────────────────── */}
        {tab === 'users' && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    {['User', 'Email', 'Plan', 'Watchlist', 'Ratings', 'Joined'].map(h => (
                      <th key={h} className="text-left text-xs text-white/40 font-medium py-3 px-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <motion.tr
                      key={u.userId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-white/5 hover:bg-white/3 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-brand-600/60 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
                            {(u.name || u.email || '?')[0].toUpperCase()}
                          </div>
                          <span className="text-white/70 truncate max-w-[120px]">{u.name || '—'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-white/40 truncate max-w-[180px]">{u.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.plan === 'premium' ? 'bg-gold-400/20 text-gold-400' : 'bg-white/8 text-white/40'}`}>
                          {u.plan || 'free'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-white/50">{u.watchlistCount || 0}</td>
                      <td className="py-3 px-4 text-white/50">{u.ratingCount || 0}</td>
                      <td className="py-3 px-4 text-white/30 text-xs">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                      </td>
                    </motion.tr>
                  ))}
                  {!users.length && (
                    <tr><td colSpan={6} className="text-center text-white/30 py-12">No users found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
