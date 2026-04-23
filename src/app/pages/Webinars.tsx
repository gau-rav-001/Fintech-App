import { useState, useEffect } from "react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { Video, Calendar, Clock, User, Play, ExternalLink, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { contentAPI } from "../services/api";

interface Webinar {
  id: string;
  title: string;
  description: string;
  speaker: string;
  date: string;
  time: string;
  duration: string;
  status: "upcoming" | "live" | "past" | "completed" | "cancelled";
  link?: string;
  isPublished: boolean;
}

interface VideoItem {
  id: string;
  title: string;
  description: string;
  youtubeUrl: string;
  thumbnail: string;
  category: string;
  createdAt: string;
}

export function Webinars() {
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [videos, setVideos]     = useState<VideoItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    async function loadContent() {
      try {
        setLoading(true);
        const [webRes, vidRes] = await Promise.all([
          contentAPI.getAll("webinar", 1),
          contentAPI.getAll("video", 1),
        ]);
        const wItems = (webRes as any).data?.content?.items ?? (webRes as any).data?.content ?? [];
        const vItems = (vidRes as any).data?.content?.items ?? (vidRes as any).data?.content ?? [];
        setWebinars(wItems);
        setVideos(vItems);
      } catch {
        setError("Failed to load content. Please try again later.");
      } finally {
        setLoading(false);
      }
    }
    loadContent();
  }, []);

  const upcomingWebinars = webinars.filter(w => w.status === "upcoming" || w.status === "live");
  const pastWebinars     = webinars.filter(w => w.status === "past" || w.status === "completed" || w.status === "cancelled");

  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#1A5F3D] to-[#2D7A4E] text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Video className="w-10 h-10" />
            </div>
            <h1 className="text-5xl font-bold mb-6">Financial Webinars</h1>
            <p className="text-xl text-white/90">
              Join live sessions with financial experts and take control of your financial future
            </p>
          </motion.div>
        </div>
      </section>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-[#1A5F3D]" />
          <span className="ml-3 text-gray-500 text-sm font-medium">Loading sessions...</span>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-red-500 font-medium">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Upcoming Webinars */}
          <section className="py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-gray-900 mb-4">Upcoming Webinars</h2>
                <p className="text-xl text-gray-600">Register now and secure your spot</p>
              </div>
              {upcomingWebinars.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                  <Video className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="font-semibold text-gray-400">No upcoming webinars at the moment</p>
                  <p className="text-sm text-gray-300 mt-1">Check back soon — new sessions are added regularly</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-8">
                  {upcomingWebinars.map((webinar, index) => (
                    <UpcomingWebinarCard key={webinar.id} webinar={webinar} index={index} />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Past Recordings */}
          {pastWebinars.length > 0 && (
            <section className="py-20 bg-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                  <h2 className="text-4xl font-bold text-gray-900 mb-4">Past Recordings</h2>
                  <p className="text-xl text-gray-600">Watch previous sessions at your convenience</p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {pastWebinars.map((webinar, index) => (
                    <PastWebinarCard key={webinar.id} webinar={webinar} index={index} />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Video Library */}
          {videos.length > 0 && (
            <section className="py-20 bg-[#F7F9FB]">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                  <h2 className="text-4xl font-bold text-gray-900 mb-4">Video Library</h2>
                  <p className="text-xl text-gray-600">Expert financial education on demand</p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {videos.map((video, index) => (
                    <VideoCard key={video.id} video={video} index={index} />
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-[#1A5F3D] to-[#2D7A4E] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">Never Miss a Webinar</h2>
          <p className="text-xl mb-8 text-white/90">
            Subscribe to get notified about upcoming financial education sessions
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <input type="email" placeholder="Enter your email"
              className="px-6 py-3 rounded-xl text-gray-900 outline-none flex-1" />
            <button className="px-8 py-3 bg-white text-[#1A5F3D] rounded-xl font-semibold hover:shadow-xl hover:scale-105 transition-all">
              Subscribe
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function UpcomingWebinarCard({ webinar, index }: { webinar: Webinar; index: number }) {
  const isLive = webinar.status === "live";
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="bg-white rounded-2xl overflow-hidden border border-gray-200 hover:shadow-xl transition-all"
    >
      <div className="h-48 bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] flex items-center justify-center relative">
        <Video className="w-20 h-20 text-white/30" />
        <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-white text-sm font-semibold backdrop-blur-sm ${isLive ? "bg-red-500/90" : "bg-white/20"}`}>
          {isLive ? "🔴 LIVE" : "Upcoming"}
        </div>
      </div>
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{webinar.title}</h3>
        {webinar.description && (
          <p className="text-gray-600 mb-4 text-sm leading-relaxed">{webinar.description}</p>
        )}
        <div className="space-y-2 mb-6">
          {webinar.speaker && (
            <div className="flex items-center text-sm text-gray-600">
              <User className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>{webinar.speaker}</span>
            </div>
          )}
          {webinar.date && (
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>{webinar.date}</span>
            </div>
          )}
          {(webinar.time || webinar.duration) && (
            <div className="flex items-center text-sm text-gray-600">
              <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>{[webinar.time, webinar.duration].filter(Boolean).join(" • ")}</span>
            </div>
          )}
        </div>
        {webinar.link ? (
          <a href={webinar.link} target="_blank" rel="noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#1A5F3D] to-[#2D7A4E] text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all">
            Register Now <ExternalLink className="w-4 h-4" />
          </a>
        ) : (
          <button className="w-full py-3 bg-gradient-to-r from-[#1A5F3D] to-[#2D7A4E] text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all">
            Register Now
          </button>
        )}
      </div>
    </motion.div>
  );
}

function PastWebinarCard({ webinar, index }: { webinar: Webinar; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="bg-white rounded-2xl overflow-hidden border border-gray-200 hover:shadow-xl transition-all group cursor-pointer"
    >
      <div className="h-40 bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center relative">
        <Play className="w-12 h-12 text-white/50 group-hover:text-white group-hover:scale-110 transition-all" />
        {webinar.duration && (
          <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-white text-xs">
            {webinar.duration}
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{webinar.title}</h3>
        {webinar.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{webinar.description}</p>
        )}
        {webinar.speaker && (
          <div className="flex items-center text-sm text-gray-500">
            <User className="w-4 h-4 mr-1" />
            <span>{webinar.speaker}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function VideoCard({ video, index }: { video: VideoItem; index: number }) {
  function getYTId(url: string) {
    const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }
  const ytId = getYTId(video.youtubeUrl ?? "");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="bg-white rounded-2xl overflow-hidden border border-gray-200 hover:shadow-xl transition-all group"
    >
      <div className="relative overflow-hidden" style={{ height: 160 }}>
        {ytId ? (
          <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#050a07] to-[#0f2419]">
            <Play className="w-10 h-10 text-white/40" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
          <a href={video.youtubeUrl} target="_blank" rel="noreferrer"
            className="w-12 h-12 rounded-full flex items-center justify-center bg-white/90 hover:bg-white transition-colors">
            <Play className="w-5 h-5 text-[#1A5F3D] ml-0.5" />
          </a>
        </div>
        {video.category && (
          <span className="absolute bottom-2 left-2 text-xs px-2 py-0.5 rounded-full font-semibold bg-black/60 text-white backdrop-blur-sm">
            {video.category}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 mb-1">{video.title}</h3>
        {video.description && (
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{video.description}</p>
        )}
        {video.youtubeUrl && (
          <a href={video.youtubeUrl} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#1A5F3D] mt-3 hover:underline">
            <ExternalLink className="w-3 h-3" /> Watch on YouTube
          </a>
        )}
      </div>
    </motion.div>
  );
}