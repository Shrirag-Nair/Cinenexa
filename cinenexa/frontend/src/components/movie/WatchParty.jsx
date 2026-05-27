import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Send, X, Copy, Check, Play, Pause, Smile, Link, Tv2 } from 'lucide-react'
import { useAuthStore } from '@store/authStore'
import apiClient from '@services/apiClient'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const WS_URL = import.meta.env.VITE_WATCHPARTY_WS_URL // set after WebSocket API creation

const REACTIONS = ['❤️', '😂', '😮', '👏', '🔥', '💯']

export default function WatchParty({ movieId, movieTitle, posterPath }) {
  const { user, isAuthenticated } = useAuthStore()

  const [isOpen,      setIsOpen]      = useState(false)
  const [roomId,      setRoomId]      = useState(null)
  const [joinCode,    setJoinCode]    = useState('')
  const [members,     setMembers]     = useState([])
  const [messages,    setMessages]    = useState([])
  const [reactions,   setReactions]   = useState([])
  const [message,     setMessage]     = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isHost,      setIsHost]      = useState(false)
  const [playback,    setPlayback]    = useState({ state: 'PAUSE', currentTime: 0 })
  const [copied,      setCopied]      = useState(false)
  const [view,        setView]        = useState('lobby') // 'lobby' | 'party'

  const wsRef       = useRef(null)
  const chatBottomRef = useRef(null)

  // ── Connect WebSocket ────────────────────────────────────────────────────
  const connectWS = useCallback((rid) => {
    if (!WS_URL || !user?.id) return

    const ws = new WebSocket(
      `${WS_URL}?roomId=${rid}&userId=${user.id}&name=${encodeURIComponent(user.name || 'Guest')}`
    )

    ws.onopen = () => {
      setIsConnected(true)
      console.log('WatchParty WS connected')
    }

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        handleWsMessage(msg)
      } catch {}
    }

    ws.onclose = () => {
      setIsConnected(false)
      // Auto-reconnect after 3s
      setTimeout(() => { if (roomId) connectWS(rid) }, 3000)
    }

    ws.onerror = (e) => {
      console.error('WS error:', e)
      setIsConnected(false)
    }

    wsRef.current = ws
  }, [user, roomId])

  function handleWsMessage(msg) {
    switch (msg.type) {
      case 'USER_JOINED':
        setMembers(prev => {
          const exists = prev.find(m => m.userId === msg.userId)
          if (exists) return prev
          return [...prev, { userId: msg.userId, name: msg.name }]
        })
        addSystemMessage(`${msg.name} joined the party 🎉`)
        break

      case 'USER_LEFT':
        setMembers(prev => prev.filter(m => m.userId !== msg.userId))
        addSystemMessage(`${msg.name} left`)
        break

      case 'CHAT':
        setMessages(prev => [...prev, {
          id:     Date.now(),
          userId: msg.userId,
          name:   msg.name,
          text:   msg.message,
          sentAt: msg.sentAt,
          type:   'chat',
        }])
        break

      case 'PLAY':
      case 'PAUSE':
      case 'SEEK':
        setPlayback({ state: msg.type, currentTime: msg.payload?.currentTime || 0 })
        addSystemMessage(`${msg.name} ${msg.type === 'PLAY' ? '▶️ played' : msg.type === 'PAUSE' ? '⏸️ paused' : '⏩ seeked'}`)
        break

      case 'REACTION':
        const id = Date.now()
        setReactions(prev => [...prev, { id, emoji: msg.emoji, name: msg.name }])
        setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 3000)
        break
    }
  }

  function addSystemMessage(text) {
    setMessages(prev => [...prev, { id: Date.now(), text, type: 'system' }])
  }

  function sendWs(data) {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }

  // ── Scroll chat to bottom ─────────────────────────────────────────────────
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => wsRef.current?.close()
  }, [])

  // ── Create room ───────────────────────────────────────────────────────────
  async function createRoom() {
    if (!isAuthenticated) return toast.error('Sign in to host a watch party')
    try {
      const data = await apiClient.post('/watchparty', { movieId, movieTitle, posterPath })
      setRoomId(data.roomId)
      setIsHost(true)
      setView('party')
      setMembers([{ userId: user.id, name: user.name || 'You', isHost: true }])
      addSystemMessage('You created the party 🎬')
      connectWS(data.roomId)
      toast.success('Watch party created!')
    } catch (e) {
      toast.error(e.message || 'Failed to create room')
    }
  }

  // ── Join room ─────────────────────────────────────────────────────────────
  async function joinRoom() {
    const rid = joinCode.trim()
    if (!rid) return toast.error('Enter a room code')
    try {
      const room = await apiClient.get(`/watchparty/${rid}`)
      setRoomId(rid)
      setIsHost(room.hostId === user?.id)
      setPlayback(room.playback || { state: 'PAUSE', currentTime: 0 })
      setView('party')
      addSystemMessage(`Joined ${room.movieTitle || movieTitle} party 🎬`)
      connectWS(rid)
      toast.success('Joined watch party!')
    } catch {
      toast.error('Room not found. Check the code and try again.')
    }
  }

  // ── Send chat ─────────────────────────────────────────────────────────────
  function sendChat(e) {
    e.preventDefault()
    if (!message.trim()) return
    sendWs({ type: 'CHAT', roomId, payload: { message: message.trim() } })
    // Also add locally immediately
    setMessages(prev => [...prev, {
      id:     Date.now(),
      userId: user.id,
      name:   'You',
      text:   message.trim(),
      sentAt: new Date().toISOString(),
      type:   'chat',
      isSelf: true,
    }])
    setMessage('')
  }

  function sendReaction(emoji) {
    sendWs({ type: 'REACTION', roomId, payload: { emoji } })
    const id = Date.now()
    setReactions(prev => [...prev, { id, emoji, name: 'You' }])
    setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 3000)
  }

  function copyRoomCode() {
    navigator.clipboard.writeText(roomId || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Room code copied!')
  }

  function leaveParty() {
    wsRef.current?.close()
    setRoomId(null)
    setIsHost(false)
    setMembers([])
    setMessages([])
    setIsConnected(false)
    setView('lobby')
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-white/8 hover:bg-white/15 border border-white/10 text-white/70 hover:text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
      >
        <Users size={15} /> Watch Party
      </button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsOpen(false)} />

            {/* Panel */}
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              className="relative z-10 w-full max-w-md bg-surface-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
              style={{ maxHeight: '85vh' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <Tv2 size={18} className="text-brand-400" />
                  <div>
                    <h3 className="font-semibold text-white text-sm">Watch Party</h3>
                    <p className="text-xs text-white/40 truncate max-w-[200px]">{movieTitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isConnected && (
                    <span className="flex items-center gap-1.5 text-xs text-green-400">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                      Live
                    </span>
                  )}
                  <button onClick={() => setIsOpen(false)} className="p-1.5 text-white/40 hover:text-white transition-colors">
                    <X size={16} />
                  </button>
                </div>
              </div>

              {view === 'lobby' ? (
                /* ── Lobby ── */
                <div className="p-5 space-y-5">
                  {/* Movie card */}
                  <div className="flex gap-3 items-center bg-white/5 rounded-xl p-3">
                    {posterPath && (
                      <img src={`https://image.tmdb.org/t/p/w92${posterPath}`} alt={movieTitle}
                        className="w-10 aspect-[2/3] rounded object-cover flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-white">{movieTitle}</p>
                      <p className="text-xs text-white/40">Watch together in sync</p>
                    </div>
                  </div>

                  {/* Host */}
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Host a party</p>
                    <button
                      onClick={createRoom}
                      className="w-full bg-brand-500 hover:bg-brand-600 text-white py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <Users size={16} /> Create Room
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-xs text-white/30">or join one</span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>

                  {/* Join */}
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Join with room code</p>
                    <div className="flex gap-2">
                      <input
                        value={joinCode}
                        onChange={e => setJoinCode(e.target.value)}
                        placeholder="Paste room code..."
                        className="flex-1 bg-surface-800 border border-white/10 text-white placeholder-white/25 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-brand-500/50 transition-colors"
                      />
                      <button
                        onClick={joinRoom}
                        className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition-colors"
                      >
                        Join
                      </button>
                    </div>
                  </div>

                  {!WS_URL && (
                    <p className="text-xs text-amber-400/70 bg-amber-400/10 border border-amber-400/20 rounded-xl px-3 py-2.5">
                      ⚠️ WebSocket API not configured yet. Add VITE_WATCHPARTY_WS_URL to your .env after deploying the WebSocket API.
                    </p>
                  )}
                </div>
              ) : (
                /* ── Party room ── */
                <div className="flex flex-col" style={{ height: '500px' }}>
                  {/* Room code + members */}
                  <div className="px-4 py-3 border-b border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/40">Room:</span>
                        <code className="text-xs font-mono text-white/70 bg-white/5 px-2 py-0.5 rounded">
                          {roomId}
                        </code>
                        <button onClick={copyRoomCode} className="text-white/40 hover:text-white transition-colors">
                          {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                        </button>
                      </div>
                      <button onClick={leaveParty} className="text-xs text-red-400 hover:text-red-300 transition-colors">
                        Leave
                      </button>
                    </div>
                    {/* Members */}
                    <div className="flex gap-1.5 flex-wrap">
                      {members.map(m => (
                        <span key={m.userId} className="flex items-center gap-1 text-xs bg-white/8 text-white/60 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                          {m.name}
                          {m.isHost && <span className="text-brand-400">👑</span>}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Playback controls (host only) */}
                  {isHost && (
                    <div className="px-4 py-2 border-b border-white/5 flex items-center gap-3">
                      <span className="text-xs text-white/40">Sync:</span>
                      <button
                        onClick={() => {
                          const newState = playback.state === 'PLAY' ? 'PAUSE' : 'PLAY'
                          setPlayback(p => ({ ...p, state: newState }))
                          sendWs({ type: newState, roomId, payload: { currentTime: playback.currentTime } })
                        }}
                        className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors"
                      >
                        {playback.state === 'PLAY'
                          ? <><Pause size={11} /> Pause all</>
                          : <><Play size={11} /> Play all</>
                        }
                      </button>
                      <span className="text-xs text-white/30">{Math.floor(playback.currentTime / 60)}:{String(Math.floor(playback.currentTime % 60)).padStart(2,'0')}</span>
                    </div>
                  )}

                  {/* Chat */}
                  <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 no-scrollbar">
                    {messages.length === 0 && (
                      <p className="text-center text-white/20 text-xs py-6">Say hi to your watch party! 👋</p>
                    )}
                    {messages.map(msg => (
                      <div key={msg.id}>
                        {msg.type === 'system' ? (
                          <p className="text-center text-xs text-white/30 py-0.5">{msg.text}</p>
                        ) : (
                          <div className={clsx('flex gap-2', msg.isSelf && 'flex-row-reverse')}>
                            <div className={clsx(
                              'max-w-[80%] rounded-2xl px-3 py-2',
                              msg.isSelf ? 'bg-brand-500/80 text-white rounded-tr-sm' : 'bg-white/8 text-white/80 rounded-tl-sm'
                            )}>
                              {!msg.isSelf && (
                                <p className="text-xs font-medium text-brand-400 mb-0.5">{msg.name}</p>
                              )}
                              <p className="text-sm leading-relaxed">{msg.text}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Floating reactions */}
                  <div className="absolute top-20 right-4 pointer-events-none space-y-1">
                    <AnimatePresence>
                      {reactions.slice(-5).map(r => (
                        <motion.div
                          key={r.id}
                          initial={{ opacity: 0, y: 20, scale: 0.5 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -20, scale: 0.5 }}
                          className="text-2xl text-right"
                        >
                          {r.emoji}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  {/* Input area */}
                  <div className="border-t border-white/5 px-3 py-3 space-y-2">
                    {/* Reactions */}
                    <div className="flex gap-1.5 justify-center">
                      {REACTIONS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => sendReaction(emoji)}
                          className="text-lg hover:scale-125 transition-transform active:scale-95"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    {/* Chat input */}
                    <form onSubmit={sendChat} className="flex gap-2">
                      <input
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="Say something..."
                        maxLength={500}
                        className="flex-1 bg-white/8 border border-white/10 text-white placeholder-white/25 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-brand-500/30 transition-colors"
                      />
                      <button
                        type="submit"
                        disabled={!message.trim()}
                        className="p-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white rounded-xl transition-colors"
                      >
                        <Send size={15} />
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
