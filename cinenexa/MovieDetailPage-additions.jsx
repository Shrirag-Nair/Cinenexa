/**
 * ADD THESE to MovieDetailPage.jsx
 *
 * 1. Add imports at the top:
 */
import WhereToWatch from '@components/movie/WhereToWatch'
import WatchParty   from '@components/movie/WatchParty'
import RatingWidget from '@components/movie/RatingWidget'

/**
 * 2. Inside the movie detail JSX, after the action buttons (Play Trailer, Add to Watchlist)
 *    add WatchParty button alongside them:
 */
// FIND this block:
//   <div className="flex gap-3 flex-wrap mb-8">
//     {trailerKey && <button ... Watch Trailer</button>}
//     <button ... Add to Watchlist</button>
//   </div>
//
// REPLACE with:
<div className="flex gap-3 flex-wrap mb-8">
  {trailerKey && (
    <button
      onClick={() => setTrailerOpen(true)}
      className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-6 py-3 rounded-lg font-bold text-sm transition-all shadow-glow-sm active:scale-95"
    >
      <Play size={16} fill="white" /> Watch Trailer
    </button>
  )}
  <button
    onClick={handleWatchlist}
    className={clsx(
      'flex items-center gap-2 px-5 py-3 rounded-lg font-semibold text-sm transition-all active:scale-95',
      inWatchlist
        ? 'bg-brand-500/20 border border-brand-500/50 text-brand-400 hover:bg-brand-500/30'
        : 'bg-white/10 border border-white/10 text-white hover:bg-white/20'
    )}
  >
    {inWatchlist ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
    {inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
  </button>

  {/* Watch Party button — ADD THIS */}
  <WatchParty
    movieId={String(movie.id)}
    movieTitle={movie.title}
    posterPath={movie.poster_path}
  />
</div>

/**
 * 3. After the stats row (budget/revenue block), add WhereToWatch + RatingWidget:
 */
// After the stats block, add:
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
  {/* Where to Watch */}
  <WhereToWatch
    movieId={String(movie.id)}
    movieTitle={movie.title}
  />

  {/* Ratings and Reviews */}
  <div>
    <h2 className="text-xl font-bold text-white mb-4">Ratings & Reviews</h2>
    <RatingWidget
      movieId={String(movie.id)}
      movieTitle={movie.title}
      genres={movie.genres || []}
    />
  </div>
</div>
