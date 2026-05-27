import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ExternalLink, Play, Tv, ShoppingCart, ChevronDown } from 'lucide-react'
import apiClient from '@services/apiClient'

// Map provider names to their brand colors
const PROVIDER_COLORS = {
  'Netflix':            { bg: '#E50914', text: '#fff' },
  'Amazon Prime Video': { bg: '#00A8E1', text: '#fff' },
  'Disney+':            { bg: '#113CCF', text: '#fff' },
  'Apple TV+':          { bg: '#000000', text: '#fff' },
  'Hotstar':            { bg: '#1F80E0', text: '#fff' },
  'JioCinema':          { bg: '#6600CC', text: '#fff' },
  'ZEE5':               { bg: '#8B2FC9', text: '#fff' },
  'SonyLIV':            { bg: '#E4002B', text: '#fff' },
  'Mubi':               { bg: '#000000', text: '#fff' },
  'Hulu':               { bg: '#1CE783', text: '#000' },
  'HBO Max':            { bg: '#6200EE', text: '#fff' },
  'Max':                { bg: '#0023EC', text: '#fff' },
  'Paramount+':         { bg: '#0064FF', text: '#fff' },
  'Peacock':            { bg: '#000000', text: '#fff' },
  'Criterion Channel':  { bg: '#e8e8e8', text: '#000' },
  'Shudder':            { bg: '#1A1A2E', text: '#fff' },
}

function getProviderStyle(name) {
  for (const [key, style] of Object.entries(PROVIDER_COLORS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return style
  }
  return { bg: '#2d2d2d', text: '#fff' }
}

// Country codes to try in order of preference
const COUNTRY_PRIORITY = ['IN', 'US', 'GB', 'AU', 'CA']

function ProviderBadge({ provider, link }) {
  const style = getProviderStyle(provider.provider_name)
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      title={`Watch on ${provider.provider_name}`}
      className="group flex flex-col items-center gap-1.5 cursor-pointer"
    >
      <div className="relative">
        <img
          src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
          alt={provider.provider_name}
          className="w-12 h-12 rounded-xl object-cover shadow-lg border border-white/10 group-hover:scale-110 group-hover:border-white/30 transition-all duration-200"
        />
        <div className="absolute -bottom-0.5 -right-0.5 bg-surface-950 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink size={8} className="text-white/60" />
        </div>
      </div>
      <span className="text-xs text-white/50 group-hover:text-white/80 transition-colors text-center leading-tight max-w-[56px] truncate">
        {provider.provider_name.replace('Amazon Prime Video', 'Prime').replace('Disney Plus', 'Disney+')}
      </span>
    </a>
  )
}

export default function WhereToWatch({ movieId, movieTitle }) {
  const [providers,   setProviders]   = useState(null)
  const [isLoading,   setIsLoading]   = useState(true)
  const [expanded,    setExpanded]    = useState(false)
  const [activeCountry, setActiveCountry] = useState(null)
  const [tmdbLink,    setTmdbLink]    = useState('')

  useEffect(() => {
    if (!movieId) return
    fetchProviders()
  }, [movieId])

  async function fetchProviders() {
    setIsLoading(true)
    try {
      const data = await apiClient.get(`/movies/${movieId}/providers`)
      const results = data?.results || {}
      setTmdbLink(data?.link || `https://www.themoviedb.org/movie/${movieId}/watch`)

      // Find the best country to show
      let chosen = null
      for (const code of COUNTRY_PRIORITY) {
        if (results[code]) { chosen = code; break }
      }
      // Fallback: first available country
      if (!chosen) chosen = Object.keys(results)[0] || null

      setActiveCountry(chosen)
      setProviders(results)
    } catch (e) {
      console.error('WhereToWatch error:', e.message)
      setProviders({})
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-surface-900/60 border border-white/5 rounded-2xl p-5 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-36 mb-4" />
        <div className="flex gap-3">
          {[1,2,3,4].map(i => <div key={i} className="w-12 h-12 bg-white/10 rounded-xl" />)}
        </div>
      </div>
    )
  }

  const countryData   = activeCountry ? providers?.[activeCountry] : null
  const streamList    = countryData?.flatrate || []
  const rentList      = countryData?.rent     || []
  const buyList       = countryData?.buy      || []
  const freeList      = countryData?.free     || []
  const hasAnything   = streamList.length || rentList.length || buyList.length || freeList.length

  const availableCountries = Object.keys(providers || {})

  return (
    <div className="bg-surface-900/60 border border-white/5 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <Tv size={16} className="text-brand-400" />
          <h3 className="text-base font-semibold text-white">Where to Watch</h3>
        </div>
        <a
          href={tmdbLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-white/30 hover:text-white/60 flex items-center gap-1 transition-colors"
        >
          via JustWatch <ExternalLink size={10} />
        </a>
      </div>

      {/* Country selector */}
      {availableCountries.length > 0 && (
        <div className="px-5 pb-3">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {COUNTRY_PRIORITY.filter(c => availableCountries.includes(c)).map(code => (
              <button
                key={code}
                onClick={() => setActiveCountry(code)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  activeCountry === code
                    ? 'bg-brand-500 text-white'
                    : 'bg-white/8 text-white/50 hover:bg-white/15 hover:text-white'
                }`}
              >
                {CODE_TO_COUNTRY[code] || code}
              </button>
            ))}
            {/* Other countries toggle */}
            {availableCountries.filter(c => !COUNTRY_PRIORITY.includes(c)).length > 0 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-white/8 text-white/50 hover:bg-white/15 hover:text-white transition-all"
              >
                More <ChevronDown size={10} className={expanded ? 'rotate-180' : ''} />
              </button>
            )}
          </div>
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {availableCountries.filter(c => !COUNTRY_PRIORITY.includes(c)).map(code => (
                    <button
                      key={code}
                      onClick={() => { setActiveCountry(code); setExpanded(false) }}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        activeCountry === code
                          ? 'bg-brand-500 text-white'
                          : 'bg-white/8 text-white/50 hover:bg-white/15'
                      }`}
                    >
                      {CODE_TO_COUNTRY[code] || code}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Provider sections */}
      <div className="px-5 pb-5 space-y-4">
        {!hasAnything ? (
          <div className="text-center py-6">
            <p className="text-white/30 text-sm">Not available for streaming in your region</p>
            <a
              href={`https://www.justwatch.com/us/search?q=${encodeURIComponent(movieTitle)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-400 hover:text-brand-300 transition-colors mt-2 inline-block"
            >
              Check JustWatch →
            </a>
          </div>
        ) : (
          <>
            {/* Streaming */}
            {streamList.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <Play size={12} className="text-green-400" />
                  <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Stream</span>
                </div>
                <div className="flex gap-3 flex-wrap">
                  {streamList.map(p => <ProviderBadge key={p.provider_id} provider={p} link={tmdbLink} />)}
                </div>
              </div>
            )}

            {/* Free */}
            {freeList.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Free</span>
                </div>
                <div className="flex gap-3 flex-wrap">
                  {freeList.map(p => <ProviderBadge key={p.provider_id} provider={p} link={tmdbLink} />)}
                </div>
              </div>
            )}

            {/* Rent */}
            {rentList.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <ShoppingCart size={12} className="text-amber-400" />
                  <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Rent</span>
                </div>
                <div className="flex gap-3 flex-wrap">
                  {rentList.map(p => <ProviderBadge key={p.provider_id} provider={p} link={tmdbLink} />)}
                </div>
              </div>
            )}

            {/* Buy */}
            {buyList.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Buy</span>
                </div>
                <div className="flex gap-3 flex-wrap">
                  {buyList.map(p => <ProviderBadge key={p.provider_id} provider={p} link={tmdbLink} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const CODE_TO_COUNTRY = {
  IN: '🇮🇳 India', US: '🇺🇸 USA', GB: '🇬🇧 UK',
  AU: '🇦🇺 Australia', CA: '🇨🇦 Canada', DE: '🇩🇪 Germany',
  FR: '🇫🇷 France', JP: '🇯🇵 Japan', KR: '🇰🇷 Korea',
  BR: '🇧🇷 Brazil', MX: '🇲🇽 Mexico', IT: '🇮🇹 Italy',
  ES: '🇪🇸 Spain', NL: '🇳🇱 Netherlands', SE: '🇸🇪 Sweden',
  NO: '🇳🇴 Norway', DK: '🇩🇰 Denmark', PL: '🇵🇱 Poland',
}
