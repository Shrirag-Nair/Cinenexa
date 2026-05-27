import { Link } from 'react-router-dom'
import { Film, Github, Twitter, Linkedin } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-surface-950 border-t border-white/5 mt-20">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <span className="font-display text-2xl text-brand-500 tracking-wider">
              CINE<span className="text-white">NEXA</span>
            </span>
            <p className="text-white/40 text-sm mt-3 leading-relaxed">
              Your personalized AI-powered movie streaming platform. Built on AWS.
            </p>
            <div className="flex gap-3 mt-4">
              {[Github, Twitter, Linkedin].map((Icon, i) => (
                <button
                  key={i}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all"
                >
                  <Icon size={16} />
                </button>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold text-white/80 mb-4">Explore</h4>
            <ul className="space-y-2">
              {['Browse Movies', 'Top Rated', 'Now Playing', 'Upcoming'].map((item) => (
                <li key={item}>
                  <Link to="/browse" className="text-sm text-white/40 hover:text-white/80 transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white/80 mb-4">Account</h4>
            <ul className="space-y-2">
              {['Sign In', 'Create Account', 'My Watchlist', 'Profile Settings'].map((item) => (
                <li key={item}>
                  <span className="text-sm text-white/40 hover:text-white/80 transition-colors cursor-pointer">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white/80 mb-4">Tech Stack</h4>
            <ul className="space-y-2">
              {['React + Tailwind', 'AWS Lambda', 'DynamoDB', 'Cognito Auth', 'CloudFront CDN'].map((item) => (
                <li key={item}>
                  <span className="text-sm text-white/40">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-white/25">
            © {new Date().getFullYear()} CineNexa. Built with React & AWS. Movie data from TMDB.
          </p>
          <div className="flex gap-4">
            {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map((item) => (
              <span key={item} className="text-xs text-white/25 hover:text-white/50 cursor-pointer transition-colors">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
