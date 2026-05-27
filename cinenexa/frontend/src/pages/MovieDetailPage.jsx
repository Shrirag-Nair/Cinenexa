import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Play,
  Bookmark,
  BookmarkCheck,
  Star,
  Clock,
  Calendar,
  Globe,
  DollarSign,
  ArrowLeft,
  Youtube,
  X,
} from "lucide-react";
import { useMovieStore } from "@store/movieStore";
import { useAuthStore } from "@store/authStore";
import { getBackdropUrl, getPosterUrl } from "@services/movieService";
import MovieRow from "@components/movie/MovieRow";
import toast from "react-hot-toast";
import clsx from "clsx";
import RatingWidget from "@components/movie/RatingWidget";
import { recommendationService } from "@services/recommendationService";
import WhereToWatch from "@components/movie/WhereToWatch";
import WatchParty   from '@components/movie/WatchParty'

export default function MovieDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const {
    currentMovie,
    isLoadingMovie,
    fetchMovieById,
    isInWatchlist,
    addToWatchlist,
    removeFromWatchlist,
  } = useMovieStore();

  const [trailerOpen, setTrailerOpen] = useState(false);
  const [trailerKey, setTrailerKey] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchMovieById(id);
    if (isAuthenticated) {
      recommendationService.recordInteraction(
        id,
        "detail_view",
        currentMovie?.genres || [],
      );
    }
  }, [id]);

  useEffect(() => {
    if (currentMovie?.videos?.results) {
      const trailer = currentMovie.videos.results.find(
        (v) => v.type === "Trailer" && v.site === "YouTube",
      );
      setTrailerKey(trailer?.key || null);
    }
  }, [currentMovie]);

  const inWatchlist = currentMovie ? isInWatchlist(currentMovie.id) : false;

  const handleWatchlist = async () => {
    if (!isAuthenticated) {
      toast.error("Sign in to add to watchlist");
      navigate("/login");
      return;
    }
    if (inWatchlist) {
      await removeFromWatchlist(user.id, currentMovie.id);
      toast.success("Removed from watchlist");
    } else {
      await addToWatchlist(user.id, currentMovie);
      toast.success("Added to watchlist");
    }
  };

  if (isLoadingMovie) return <DetailSkeleton />;
  if (!currentMovie) return null;

  const movie = currentMovie;
  const director = movie.credits?.crew?.find((c) => c.job === "Director");
  const cast = movie.credits?.cast?.slice(0, 10) || [];
  const similar = movie.similar?.results || [];
  const runtime = movie.runtime
    ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
    : null;

  return (
    <div className="min-h-screen">
      {/* Backdrop */}
      <div className="relative h-[60vh] min-h-[400px] overflow-hidden">
        <img
          src={getBackdropUrl(movie.backdrop_path)}
          alt={movie.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-black/40 to-black/30" />

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-20 left-6 lg:left-12 flex items-center gap-2 text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} /> Back
        </button>
      </div>

      {/* Main content - overlaps backdrop */}
      <div className="relative -mt-32 z-10 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12">
        <div className="flex gap-8 flex-col lg:flex-row">
          {/* Poster */}
          <div className="flex-shrink-0 mx-auto lg:mx-0">
            <img
              src={getPosterUrl(movie.poster_path, "w342")}
              alt={movie.title}
              className="w-44 sm:w-56 rounded-xl shadow-card-hover border border-white/10"
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Title */}
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-white leading-tight mb-2">
                {movie.title}
              </h1>
              {movie.tagline && (
                <p className="text-white/40 text-sm italic mb-4">
                  "{movie.tagline}"
                </p>
              )}

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-3 mb-5 text-sm text-white/60">
                {movie.vote_average > 0 && (
                  <div className="flex items-center gap-1.5 bg-gold-400/15 border border-gold-400/30 rounded-lg px-3 py-1.5">
                    <Star size={14} className="text-gold-400 fill-gold-400" />
                    <span className="font-bold text-gold-400">
                      {movie.vote_average.toFixed(1)}
                    </span>
                    <span className="text-white/40 text-xs">/ 10</span>
                  </div>
                )}
                {movie.release_date && (
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} /> {movie.release_date.slice(0, 4)}
                  </span>
                )}
                {runtime && (
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} /> {runtime}
                  </span>
                )}
                {movie.original_language && (
                  <span className="flex items-center gap-1.5">
                    <Globe size={14} /> {movie.original_language.toUpperCase()}
                  </span>
                )}
              </div>

              {/* Genres */}
              <div className="flex flex-wrap gap-2 mb-5">
                {movie.genres?.map((g) => (
                  <span
                    key={g.id}
                    className="px-3 py-1 bg-white/10 border border-white/10 rounded-full text-xs text-white/70"
                  >
                    {g.name}
                  </span>
                ))}
              </div>

              {/* Overview */}
              <p className="text-white/70 leading-relaxed mb-6 max-w-2xl">
                {movie.overview}
              </p>

              {/* Director */}
              {director && (
                <p className="text-sm text-white/40 mb-6">
                  <span className="text-white/60">Directed by </span>
                  <span className="text-white font-medium">
                    {director.name}
                  </span>
                </p>
              )}

              {/* Action buttons */}
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
                    "flex items-center gap-2 px-5 py-3 rounded-lg font-semibold text-sm transition-all active:scale-95",
                    inWatchlist
                      ? "bg-brand-500/20 border border-brand-500/50 text-brand-400 hover:bg-brand-500/30"
                      : "bg-white/10 border border-white/10 text-white hover:bg-white/20",
                  )}
                >
                  {inWatchlist ? (
                    <BookmarkCheck size={16} />
                  ) : (
                    <Bookmark size={16} />
                  )}
                  {inWatchlist ? "In Watchlist" : "Add to Watchlist"}
                </button>

                {/* Watch Party button — ADD THIS */}
                {<WatchParty
                  movieId={String(movie.id)}
                  movieTitle={movie.title}
                  posterPath={movie.poster_path}
                />}
              </div>
              {/* Rating Widget */}
              {/* <div className="mt-8">
                <h2 className="text-xl font-bold text-white mb-4">
                  Ratings & Reviews
                </h2>
                <RatingWidget
                  movieId={String(movie.id)}
                  movieTitle={movie.title}
                  genres={movie.genres || []}
                />
              </div> */}

              {/* Stats row */}
              {(movie.budget || movie.revenue || movie.vote_count) && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8 p-4 bg-white/5 border border-white/5 rounded-xl">
                  {movie.budget > 0 && (
                    <div>
                      <p className="text-xs text-white/40 mb-1">Budget</p>
                      <p className="text-sm font-semibold text-white">
                        ${(movie.budget / 1e6).toFixed(0)}M
                      </p>
                    </div>
                  )}
                  {movie.revenue > 0 && (
                    <div>
                      <p className="text-xs text-white/40 mb-1">Box Office</p>
                      <p className="text-sm font-semibold text-white">
                        ${(movie.revenue / 1e6).toFixed(0)}M
                      </p>
                    </div>
                  )}
                  {movie.vote_count > 0 && (
                    <div>
                      <p className="text-xs text-white/40 mb-1">Votes</p>
                      <p className="text-sm font-semibold text-white">
                        {movie.vote_count.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          {/* Where to Watch */}
          <WhereToWatch movieId={String(movie.id)} movieTitle={movie.title} />

          {/* Ratings and Reviews */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4">
              Ratings & Reviews
            </h2>
            <RatingWidget
              movieId={String(movie.id)}
              movieTitle={movie.title}
              genres={movie.genres || []}
            />
          </div>
        </div>

        {/* Cast */}
        {cast.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-bold text-white mb-5">Cast</h2>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              {cast.map((person) => (
                <div key={person.id} className="flex-shrink-0 w-24 text-center">
                  <div className="w-20 h-20 mx-auto rounded-full bg-surface-800 overflow-hidden mb-2 border border-white/10">
                    {person.profile_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                        alt={person.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl text-white/20">
                        {person.name[0]}
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-medium text-white/80 line-clamp-2">
                    {person.name}
                  </p>
                  <p className="text-xs text-white/40 line-clamp-1 mt-0.5">
                    {person.character}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Similar movies */}
        {similar.length > 0 && (
          <div className="mt-4">
            <MovieRow title="Similar Movies" movies={similar} />
          </div>
        )}
      </div>

      {/* Trailer Modal */}
      {trailerOpen && trailerKey && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setTrailerOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl aspect-video"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setTrailerOpen(false)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white"
            >
              <X size={24} />
            </button>
            <iframe
              src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1`}
              title="Trailer"
              allow="autoplay; encrypted-media"
              allowFullScreen
              className="w-full h-full rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="h-[60vh] bg-surface-900 skeleton" />
      <div className="relative -mt-32 z-10 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12">
        <div className="flex gap-8 flex-col lg:flex-row">
          <div className="w-44 sm:w-56 aspect-[2/3] skeleton rounded-xl flex-shrink-0 mx-auto lg:mx-0" />
          <div className="flex-1 space-y-4 pt-8">
            <div className="h-12 skeleton rounded w-3/4" />
            <div className="h-4 skeleton rounded w-1/3" />
            <div className="h-4 skeleton rounded w-1/2" />
            <div className="h-24 skeleton rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
