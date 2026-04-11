import { useState } from "react";
import { Link } from "react-router";
import { Users, FileText, Video, Settings, TrendingUp, BarChart3, Search } from "lucide-react";

const users = [
  { id: 1, name: "Rajesh Kumar", email: "rajesh@example.com", plan: "Premium", status: "Active" },
  { id: 2, name: "Priya Sharma", email: "priya@example.com", plan: "Basic", status: "Active" },
  { id: 3, name: "Amit Patel", email: "amit@example.com", plan: "Premium", status: "Active" },
  { id: 4, name: "Sunita Desai", email: "sunita@example.com", plan: "Basic", status: "Inactive" },
  { id: 5, name: "Vikram Singh", email: "vikram@example.com", plan: "Premium", status: "Active" },
];

export function Admin() {
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-[#F7F9FB] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
        <div className="p-6">
          <Link to="/" className="flex items-center space-x-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] flex items-center justify-center">
              <span className="text-white font-bold text-xl">SF</span>
            </div>
            <span className="font-bold text-xl text-gray-900">Admin Panel</span>
          </Link>

          <nav className="space-y-2">
            <AdminNavLink
              icon={<BarChart3 className="w-5 h-5" />}
              label="Overview"
              active={activeTab === "overview"}
              onClick={() => setActiveTab("overview")}
            />
            <AdminNavLink
              icon={<Users className="w-5 h-5" />}
              label="Users"
              active={activeTab === "users"}
              onClick={() => setActiveTab("users")}
            />
            <AdminNavLink
              icon={<FileText className="w-5 h-5" />}
              label="Content"
              active={activeTab === "content"}
              onClick={() => setActiveTab("content")}
            />
            <AdminNavLink
              icon={<Video className="w-5 h-5" />}
              label="Webinars"
              active={activeTab === "webinars"}
              onClick={() => setActiveTab("webinars")}
            />
            <AdminNavLink
              icon={<Settings className="w-5 h-5" />}
              label="Settings"
              active={activeTab === "settings"}
              onClick={() => setActiveTab("settings")}
            />
          </nav>
        </div>

        <div className="p-6 border-t border-gray-200 mt-auto">
          <Link to="/" className="text-sm text-gray-600 hover:text-[#1A5F3D]">
            ← Back to Website
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-x-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h1>
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] flex items-center justify-center text-white font-semibold">
                AD
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="p-8">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Total Users" value="10,234" change="+12.5%" icon={<Users className="w-6 h-6" />} />
                <StatCard title="Active Plans" value="8,456" change="+8.3%" icon={<TrendingUp className="w-6 h-6" />} />
                <StatCard title="Total Revenue" value="₹45.2L" change="+15.2%" icon={<BarChart3 className="w-6 h-6" />} />
                <StatCard title="Webinars" value="48" change="+4" icon={<Video className="w-6 h-6" />} />
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    <ActivityItem text="New user registration: Rajesh Kumar" time="2 mins ago" />
                    <ActivityItem text="Webinar scheduled: Tax Planning 2026" time="15 mins ago" />
                    <ActivityItem text="Premium plan purchased by Priya Sharma" time="1 hour ago" />
                    <ActivityItem text="New blog post published" time="2 hours ago" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <button className="w-full py-3 bg-gradient-to-r from-[#1A5F3D] to-[#2D7A4E] text-white rounded-xl font-semibold hover:shadow-lg transition-all">
                      Create New Webinar
                    </button>
                    <button className="w-full py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all">
                      Add New Content
                    </button>
                    <button className="w-full py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all">
                      Export User Data
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === "users" && (
            <div>
              <div className="mb-6 flex justify-between items-center">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1A5F3D] focus:border-transparent outline-none"
                  />
                </div>
                <button className="px-6 py-3 bg-gradient-to-r from-[#1A5F3D] to-[#2D7A4E] text-white rounded-xl font-semibold hover:shadow-lg transition-all">
                  Add User
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Name</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Email</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Plan</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{user.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            user.plan === "Premium" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                          }`}>
                            {user.plan}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            user.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                          }`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button className="text-[#1A5F3D] hover:underline text-sm font-semibold">
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Other Tabs */}
          {activeTab !== "overview" && activeTab !== "users" && (
            <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Settings className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Management
                </h3>
                <p className="text-gray-600">
                  This section is under development. Manage your {activeTab} here.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function AdminNavLink({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
        active
          ? "bg-gradient-to-r from-[#1A5F3D] to-[#2D7A4E] text-white"
          : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </div>
  );
}

function StatCard({ title, value, change, icon }: { title: string; value: string; change: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] flex items-center justify-center text-white">
          {icon}
        </div>
        <span className="text-sm font-semibold text-green-600">{change}</span>
      </div>
      <p className="text-sm text-gray-600 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function ActivityItem({ text, time }: { text: string; time: string }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-gray-100 last:border-0">
      <p className="text-sm text-gray-700">{text}</p>
      <span className="text-xs text-gray-500">{time}</span>
    </div>
  );
}
