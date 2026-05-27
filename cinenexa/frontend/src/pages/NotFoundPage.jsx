import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Search } from 'lucide-react'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="font-display text-[10rem] leading-none text-white/5 select-none">404</div>
        <div className="-mt-8">
          <h1 className="text-3xl font-bold text-white mb-3">Page Not Found</h1>
          <p className="text-white/40 mb-8">
            Looks like this scene got cut from the final edit.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
            >
              <Home size={15} /> Go Home
            </button>
            <button
              onClick={() => navigate('/browse')}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
            >
              <Search size={15} /> Browse Movies
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
