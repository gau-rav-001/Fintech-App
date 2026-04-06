import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { Video, Calendar, Clock, User, Play } from "lucide-react";
import { motion } from "motion/react";
import { getAdminContent } from "../data/mockData";

const upcomingWebinars = [
  {
    id: 1,
    title: "Building Wealth in Your 30s",
    description: "Learn effective wealth building strategies for young professionals",
    speaker: "Rajesh Kumar",
    role: "Senior Financial Advisor",
    date: "March 28, 2026",
    time: "6:00 PM IST",
    duration: "60 mins",
    status: "upcoming",
  },
  {
    id: 2,
    title: "Tax-Saving Strategies 2026",
    description: "Maximize your tax savings with expert tips and planning",
    speaker: "Priya Sharma",
    role: "Tax Consultant",
    date: "March 30, 2026",
    time: "7:00 PM IST",
    duration: "90 mins",
    status: "upcoming",
  },
  {
    id: 3,
    title: "Mutual Funds Masterclass",
    description: "Complete guide to mutual fund investing for beginners",
    speaker: "Amit Patel",
    role: "Investment Specialist",
    date: "April 2, 2026",
    time: "6:30 PM IST",
    duration: "75 mins",
    status: "upcoming",
  },
  {
    id: 4,
    title: "Retirement Planning Essentials",
    description: "Secure your future with smart retirement planning",
    speaker: "Sunita Desai",
    role: "Retirement Planning Expert",
    date: "April 5, 2026",
    time: "5:00 PM IST",
    duration: "60 mins",
    status: "upcoming",
  },
];

const pastWebinars = [
  {
    id: 5,
    title: "Stock Market Basics for Beginners",
    description: "Introduction to stock market investing and trading",
    speaker: "Vikram Singh",
    views: "2.5K",
    duration: "45 mins",
  },
  {
    id: 6,
    title: "Real Estate Investment Strategies",
    description: "How to invest in real estate smartly",
    speaker: "Neha Gupta",
    views: "1.8K",
    duration: "60 mins",
  },
  {
    id: 7,
    title: "Understanding Crypto Investments",
    description: "Navigate the world of cryptocurrency safely",
    speaker: "Arjun Reddy",
    views: "3.2K",
    duration: "90 mins",
  },
  {
    id: 8,
    title: "Emergency Fund Planning",
    description: "Build a safety net for financial security",
    speaker: "Kavita Iyer",
    views: "1.5K",
    duration: "40 mins",
  },
];

export function Webinars() {
  const cms = getAdminContent();

  // Merge admin-entered webinars with hardcoded fallback, deduplicate by title
  const adminWebinars = cms.webinars.map(w => ({
    id: parseInt(w.id.replace(/\D/g, '')) || Math.random(),
    title: w.title,
    description: w.description,
    speaker: w.speaker,
    role: "Financial Expert",
    date: w.date,
    time: w.time,
    duration: w.duration,
    status: w.status,
    link: w.link,
  }));
  const adminTitles = new Set(adminWebinars.map(w => w.title));
  const mergedUpcoming = [
    ...adminWebinars.filter(w => w.status === "upcoming"),
    ...upcomingWebinars.filter(w => !adminTitles.has(w.title)),
  ];
  const mergedPast = [
    ...adminWebinars.filter(w => w.status === "completed"),
    ...pastWebinars,
  ];

  // Videos from admin
  const adminVideos = cms.videos.map((v, i) => ({
    id: i + 100,
    title: v.title,
    description: v.description,
    date: new Date(v.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
    duration: "45 mins",
    views: "—",
    status: "recorded" as const,
  }));
  const displayPast = adminVideos.length > 0 ? [...adminVideos, ...mergedPast] : mergedPast;

  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      <Navbar />

      {/* Hero Section */}
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

      {/* Upcoming Webinars */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Upcoming Webinars</h2>
            <p className="text-xl text-gray-600">Register now and secure your spot</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {mergedUpcoming.map((webinar, index) => (
              <UpcomingWebinarCard key={webinar.id} webinar={webinar} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Past Recordings */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Past Recordings</h2>
            <p className="text-xl text-gray-600">Watch previous sessions at your convenience</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayPast.map((webinar, index) => (
              <PastWebinarCard key={webinar.id} webinar={webinar} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-[#1A5F3D] to-[#2D7A4E] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">Never Miss a Webinar</h2>
          <p className="text-xl mb-8 text-white/90">
            Subscribe to get notified about upcoming financial education sessions
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="px-6 py-3 rounded-xl text-gray-900 outline-none flex-1"
            />
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

function UpcomingWebinarCard({ webinar, index }: { webinar: any; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="bg-white rounded-2xl overflow-hidden border border-gray-200 hover:shadow-xl transition-all"
    >
      <div className="h-48 bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] flex items-center justify-center relative">
        <Video className="w-20 h-20 text-white/30" />
        <div className="absolute top-4 right-4 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-semibold">
          Live
        </div>
      </div>
      
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{webinar.title}</h3>
        <p className="text-gray-600 mb-4">{webinar.description}</p>
        
        <div className="space-y-2 mb-6">
          <div className="flex items-center text-sm text-gray-600">
            <User className="w-4 h-4 mr-2" />
            <span>{webinar.speaker} - {webinar.role}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="w-4 h-4 mr-2" />
            <span>{webinar.date}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Clock className="w-4 h-4 mr-2" />
            <span>{webinar.time} • {webinar.duration}</span>
          </div>
        </div>
        
        <button className="w-full py-3 bg-gradient-to-r from-[#1A5F3D] to-[#2D7A4E] text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all">
          Register Now
        </button>
      </div>
    </motion.div>
  );
}

function PastWebinarCard({ webinar, index }: { webinar: any; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="bg-white rounded-2xl overflow-hidden border border-gray-200 hover:shadow-xl transition-all group cursor-pointer"
    >
      <div className="h-40 bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center relative">
        <Play className="w-12 h-12 text-white/50 group-hover:text-white group-hover:scale-110 transition-all" />
        <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-white text-xs">
          {webinar.duration}
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-bold text-gray-900 mb-2">{webinar.title}</h3>
        <p className="text-sm text-gray-600 mb-3">{webinar.description}</p>
        
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center">
            <User className="w-4 h-4 mr-1" />
            <span>{webinar.speaker}</span>
          </div>
          <span>{webinar.views} views</span>
        </div>
      </div>
    </motion.div>
  );
}