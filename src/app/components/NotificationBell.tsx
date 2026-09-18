import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router";
import { Bell, Check, Circle, AlertCircle, RefreshCw } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useAdvisorAuth } from "../auth/AdvisorAuthContext";
import { notificationAPI, type AppNotification } from "../services/api";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";

interface NotificationBellProps {
  actorType: "user" | "advisor";
}

function getRelativeTime(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export function NotificationBell({ actorType }: NotificationBellProps) {
  const { isUserAuthenticated } = useAuth();
  const { isAdvisorAuthenticated } = useAdvisorAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Authentication check - only active for the correct logged-in actor
  const isAuthenticated = actorType === "user" ? isUserAuthenticated : isAdvisorAuthenticated;

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Poll unread count
  const fetchUnreadCount = useCallback(async (signal?: AbortSignal) => {
    if (!isAuthenticated) return;
    try {
      const res = await notificationAPI.getUnreadCount(signal);
      if (res.data) {
        setUnreadCount(res.data.count);
      }
    } catch (err: any) {
      // Ignore abort errors
    }
  }, [isAuthenticated]);

  // Load list when popover opens
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const res = await notificationAPI.getAll();
      if (res.data) {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unreadCount); // Keep in sync
      }
    } catch (err: any) {
      setError("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Polling Effect - only runs when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      setNotifications([]);
      setIsOpen(false);
      return;
    }

    const abortController = new AbortController();

    // Initial fetch
    fetchUnreadCount(abortController.signal);

    // Poll every 60 seconds
    const interval = setInterval(() => {
      fetchUnreadCount(abortController.signal);
    }, 60000);

    // Focus refresh
    const onFocus = () => fetchUnreadCount(abortController.signal);
    window.addEventListener("focus", onFocus);

    return () => {
      abortController.abort();
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [isAuthenticated, fetchUnreadCount, location.pathname]);

  // Fetch when popover is opened
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      fetchNotifications();
    }
  }, [isOpen, isAuthenticated, fetchNotifications]);

  async function handleNotificationClick(n: AppNotification) {
    if (!n.readAt) {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, readAt: new Date().toISOString() } : item))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      try {
        await notificationAPI.markAsRead(n.id);
      } catch (err) {
        // Revert optimistic update
        setNotifications((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, readAt: null } : item))
        );
        setUnreadCount((prev) => prev + 1);
      }
    }

    if (n.actionUrl) {
      setIsOpen(false);
      navigate(n.actionUrl);
    }
  }

  async function handleMarkAllAsRead() {
    // Optimistic update
    const unreadIds = notifications.filter(n => !n.readAt).map(n => n.id);
    if (unreadIds.length === 0) return;

    setNotifications((prev) =>
      prev.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() }))
    );
    const prevCount = unreadCount;
    setUnreadCount(0);

    try {
      await notificationAPI.markAllAsRead();
    } catch (err) {
      // Revert if completely failed
      setNotifications((prev) =>
        prev.map((item) => unreadIds.includes(item.id) ? { ...item, readAt: null } : item)
      );
      setUnreadCount(prevCount);
    }
  }

  if (!isAuthenticated) return null;

  const displayBadge = unreadCount > 0;
  const displayCount = unreadCount > 99 ? "99+" : unreadCount;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={`relative p-2 rounded-full transition-colors flex items-center justify-center ${
            actorType === "advisor"
              ? "text-white hover:bg-white/10 lg:text-gray-600 lg:hover:bg-gray-100"
              : "text-white hover:bg-white/10 lg:text-white/75 lg:hover:text-white lg:hover:bg-white/10"
          }`}
          aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ""}`}
        >
          <Bell className="w-5 h-5" />
          {displayBadge && (
            <Badge
              variant="destructive"
              className="absolute top-0 right-0 px-1 py-0 min-w-[1.25rem] h-5 flex items-center justify-center translate-x-1 -translate-y-1 text-[10px] rounded-full border-2 border-white/20 shadow-sm"
            >
              {displayCount}
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      
      <PopoverContent
        align="end"
        className="w-80 sm:w-96 p-0 border border-gray-100 shadow-xl rounded-2xl bg-white overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs font-semibold text-[#1A5F3D] hover:underline"
            >
              Mark all as read
            </button>
          )}
        </div>

        <ScrollArea className="h-[360px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-3 py-10">
              <RefreshCw className="w-6 h-6 text-gray-300 animate-spin" />
              <p className="text-sm text-gray-500">Loading notifications...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-10 px-6">
              <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
              <p className="text-sm text-gray-800 font-medium">{error}</p>
              <button
                onClick={fetchNotifications}
                className="mt-3 text-xs font-semibold px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 px-6">
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                <Bell className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-900">All caught up!</p>
              <p className="text-xs text-gray-500 mt-1">No notifications yet.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((n) => {
                const isUnread = !n.readAt;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full text-left flex items-start gap-3 p-4 transition-colors border-b border-gray-50 last:border-0 ${
                      isUnread ? "bg-[#f0faf4]/50 hover:bg-[#e1f5e8]/50" : "bg-white hover:bg-gray-50"
                    }`}
                  >
                    <div className="mt-1 flex-shrink-0">
                      {isUnread ? (
                        <Circle className="w-2.5 h-2.5 fill-[#1A5F3D] text-[#1A5F3D]" />
                      ) : (
                        <Check className="w-3 h-3 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm mb-0.5 line-clamp-1 ${
                          isUnread ? "font-semibold text-gray-900" : "font-medium text-gray-700"
                        }`}
                      >
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-500 leading-snug line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1.5 font-medium">
                        {getRelativeTime(n.createdAt)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
