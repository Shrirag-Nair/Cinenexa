import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, CheckCircle } from 'lucide-react'
import { useAuthStore } from '@store/authStore'
import toast from 'react-hot-toast'

export default function SignupPage() {
  const navigate = useNavigate()
  const { register, confirmRegistration, login, isLoading } = useAuthStore()
  const [step, setStep] = useState('signup') // 'signup' | 'confirm'
  const [showPass, setShowPass] = useState(false)
  const [pendingEmail, setPendingEmail] = useState('')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [code, setCode] = useState('')

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSignup = async (e) => {
    e.preventDefault()
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    try {
      await register(form)
      setPendingEmail(form.email)
      setStep('confirm')
      toast.success('Check your email for a verification code')
    } catch (err) {
      toast.error(err.message || 'Registration failed')
    }
  }

  const handleConfirm = async (e) => {
    e.preventDefault()
    try {
      await confirmRegistration({ email: pendingEmail, code })
      await login({ email: pendingEmail, password: form.password })
      toast.success('Account created! Welcome to CineNexa 🎬')
      navigate('/')
    } catch (err) {
      toast.error(err.message || 'Verification failed')
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-surface-950 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-bl from-brand-900/30 to-transparent" />
        <div className="relative z-10 text-center px-12">
          <h1 className="font-display text-7xl text-brand-500 tracking-wider mb-4">
            CINE<span className="text-white">NEXA</span>
          </h1>
          <div className="mt-10 space-y-4 text-left max-w-xs mx-auto">
            {['AI-powered recommendations', 'Build your watchlist', 'Track what you watch', 'Discover by genre & mood'].map((feature) => (
              <div key={feature} className="flex items-center gap-3 text-white/60 text-sm">
                <CheckCircle size={16} className="text-brand-500 flex-shrink-0" />
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-surface-950 lg:bg-surface-900">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <span className="font-display text-4xl text-brand-500">CINE<span className="text-white">NEXA</span></span>
          </div>

          <AnimatePresence mode="wait">
            {step === 'signup' ? (
              <motion.div key="signup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h2 className="text-2xl font-bold text-white mb-1">Create your account</h2>
                <p className="text-white/40 text-sm mb-8">Join CineNexa for free</p>

                <form onSubmit={handleSignup} className="space-y-5">
                  <div>
                    <label className="block text-sm text-white/60 mb-1.5">Full Name</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                      <input
                        type="text"
                        value={form.name}
                        onChange={set('name')}
                        placeholder="John Doe"
                        required
                        className="w-full bg-surface-800 border border-white/10 text-white placeholder-white/25 pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-brand-500/60 transition-colors text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-white/60 mb-1.5">Email</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={set('email')}
                        placeholder="you@example.com"
                        required
                        className="w-full bg-surface-800 border border-white/10 text-white placeholder-white/25 pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-brand-500/60 transition-colors text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-white/60 mb-1.5">Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={form.password}
                        onChange={set('password')}
                        placeholder="Min. 8 characters"
                        required
                        minLength={8}
                        className="w-full bg-surface-800 border border-white/10 text-white placeholder-white/25 pl-10 pr-10 py-3 rounded-xl focus:outline-none focus:border-brand-500/60 transition-colors text-sm"
                      />
                      <button type="button" onClick={() => setShowPass(!showPass)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {/* Password strength indicator */}
                    {form.password && (
                      <div className="flex gap-1 mt-2">
                        {[1,2,3,4].map((level) => (
                          <div key={level} className={`h-1 flex-1 rounded-full transition-colors ${
                            form.password.length >= level * 3
                              ? level <= 2 ? 'bg-brand-500' : level === 3 ? 'bg-amber-500' : 'bg-green-500'
                              : 'bg-white/10'
                          }`} />
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    {isLoading
                      ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <>Create Account <ArrowRight size={16} /></>
                    }
                  </button>
                </form>

                <p className="text-center text-sm text-white/40 mt-6">
                  Already have an account?{' '}
                  <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">Sign in</Link>
                </p>
              </motion.div>
            ) : (
              <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <div className="w-14 h-14 bg-brand-500/20 rounded-full flex items-center justify-center mb-6">
                  <Mail size={24} className="text-brand-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-1">Check your email</h2>
                <p className="text-white/40 text-sm mb-8">
                  We sent a 6-digit code to <span className="text-white/70">{pendingEmail}</span>
                </p>

                <form onSubmit={handleConfirm} className="space-y-5">
                  <div>
                    <label className="block text-sm text-white/60 mb-1.5">Verification Code</label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      required
                      maxLength={6}
                      className="w-full bg-surface-800 border border-white/10 text-white placeholder-white/25 px-4 py-3 rounded-xl focus:outline-none focus:border-brand-500/60 transition-colors text-sm text-center tracking-[0.5em] text-lg font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || code.length < 6}
                    className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
                  >
                    {isLoading
                      ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <>Verify & Continue <ArrowRight size={16} /></>
                    }
                  </button>
                </form>

                <button
                  onClick={() => setStep('signup')}
                  className="w-full text-center text-sm text-white/40 hover:text-white/60 mt-4 transition-colors"
                >
                  ← Back to sign up
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
