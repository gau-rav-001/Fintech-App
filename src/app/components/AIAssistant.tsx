import { useState, useEffect, useRef, createContext, useContext } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Send, X, MessageSquare,
  Activity, Target, Umbrella, TrendingUp, CreditCard, Calculator,
  Zap, PiggyBank, ChevronDown, Trash2, Plus, AlertCircle,
  Moon, Sun, Settings, User, ChevronRight, ArrowRight,
  Volume2, VolumeX, Globe, Sliders, LogOut, Menu,
} from "lucide-react";
import { aiAPI, type AIMessage, type AIConversation } from "../services/aiService";
import { useTheme as useAppTheme } from "../ThemeContext";

// ── Brand mark ──────────────────────────────────────────────────────────────
function Logo({ size = 16, strokeColor = "#FFFFFF" }: { size?: number; strokeColor?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <g stroke={strokeColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 5 H15" />
        <path d="M7 9 H15" />
        <path d="M7 5 C7 9, 12 9, 12 9" />
        <path d="M8.5 9 L15.5 18" />
      </g>
      <circle cx="14.5" cy="15.5" r="1" fill={strokeColor} opacity="0.55" />
      <circle cx="16.8" cy="12.8" r="1" fill={strokeColor} opacity="0.78" />
      <circle cx="19" cy="10" r="1" fill={strokeColor} />
    </svg>
  );
}

type ChatMessage = AIMessage & { failed?: boolean };

// ── Theme system ──────────────────────────────────────────────────────────────
type Theme = "light" | "dark";

interface ThemeTokens {
  bg: string;
  bgPanel: string;
  bgSidebar: string;
  bgInput: string;
  bgHover: string;
  bgUserMsg: string;
  bgAssistantMsg: string;
  border: string;
  borderSubtle: string;
  text: string;
  textMuted: string;
  textFaint: string;
  textUser: string;
  brand: string;
  brandLight: string;
  gold: string;
  scrollTrack: string;
}

const THEMES: Record<Theme, ThemeTokens> = {
  light: {
    bg:              "#FAFAF8",
    bgPanel:         "#FFFFFF",
    bgSidebar:       "#F3F1EB",
    bgInput:         "#F3F1EB",
    bgHover:         "rgba(26,95,61,0.06)",
    bgUserMsg:       "#F3F1EB",
    bgAssistantMsg:  "transparent",
    border:          "#E7E3D8",
    borderSubtle:    "#EDEBE4",
    text:            "#1C2521",
    textMuted:       "#5C5648",
    textFaint:       "#9A9484",
    textUser:        "#1C2521",
    brand:           "#1A5F3D",
    brandLight:      "#2D8A5F",
    gold:            "#C9A227",
    scrollTrack:     "rgba(0,0,0,0.04)",
  },
  dark: {
    bg:              "#141614",
    bgPanel:         "#1C1F1C",
    bgSidebar:       "#111311",
    bgInput:         "#252825",
    bgHover:         "rgba(45,138,95,0.10)",
    bgUserMsg:       "#252825",
    bgAssistantMsg:  "transparent",
    border:          "#2E332E",
    borderSubtle:    "#252825",
    text:            "#E8EAE4",
    textMuted:       "#8A9186",
    textFaint:       "#5A6057",
    textUser:        "#E8EAE4",
    brand:           "#3FAF7D",
    brandLight:      "#5CC49A",
    gold:            "#D4AC3A",
    scrollTrack:     "rgba(255,255,255,0.04)",
  },
};

const ThemeCtx = createContext<{ theme: Theme; t: ThemeTokens; toggle: () => void }>({
  theme: "light", t: THEMES.light, toggle: () => {},
});
const useTh = () => useContext(ThemeCtx);

// ── Config types ──────────────────────────────────────────────────────────────
interface AIConfig {
  language: "en" | "hi" | "mr";
  responseLength: "concise" | "balanced" | "detailed";
  soundEnabled: boolean;
  fontSize: "sm" | "md" | "lg";
  autoScroll: boolean;
}

const DEFAULT_CONFIG: AIConfig = {
  language: "en",
  responseLength: "balanced",
  soundEnabled: false,
  fontSize: "md",
  autoScroll: true,
};

// ── Quick actions ─────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { icon: Activity,   label: "Health Score",    message: "What is my financial health score?" },
  { icon: Target,     label: "1 Cr in 10 Yrs",   message: "How to reach 1 Cr in 10 years at 12%?" },
  { icon: PiggyBank,  label: "50/30/20 Budget", message: "50 30 20 budget for ₹80,000 salary" },
  { icon: Calculator, label: "Tax Regimes",     message: "New vs Old tax regime comparison" },
  { icon: Zap,        label: "SGB vs Gold",     message: "SGB vs physical gold" },
  { icon: TrendingUp, label: "SIP vs Lumpsum",  message: "SIP vs Lumpsum investment" },
  { icon: Umbrella,   label: "FIRE / 4% Rule",  message: "Explain FIRE movement and 4% rule" },
  { icon: CreditCard, label: "Debt Avalanche",  message: "Debt Avalanche vs Debt Snowball" },
  { icon: TrendingUp, label: "Investments",     message: "How is my investment portfolio doing?" },
];

// ── Markdown renderer ─────────────────────────────────────────────────────────
function normalizeMarkdownTables(raw: string): string {
  const lines = raw.split(/\r?\n/);
  const normalized: string[] = [];
  let tableHeaders: string[] | null = null;

  const parseRow = (line: string) => {
    const trimmed = line.trim();
    const parts = trimmed.split("|");
    if (parts[0].trim() === "") parts.shift();
    if (parts[parts.length - 1]?.trim() === "") parts.pop();
    return parts.map(cell => cell.trim().replace(/\*\*/g, ""));
  };

  const isTableRow = (line: string) => /^\s*\|.*\|?\s*$/.test(line);
  const isSeparator = (line: string) => /^\s*\|[\s\-:|]+(?:\|\s*)?$/.test(line);
  const isLabelValueHeader = (cells: string[]) =>
    cells.length === 2 && (!cells[0] || /^(amount|value)$/i.test(cells[1] || ""));

  for (const line of lines) {
    if (!isTableRow(line)) {
      tableHeaders = null;
      normalized.push(line);
      continue;
    }

    if (isSeparator(line)) continue;

    const cells = parseRow(line);
    if (!cells.some(Boolean)) continue;

    if (isLabelValueHeader(cells)) {
      tableHeaders = cells;
      continue;
    }

    if (!tableHeaders && cells.length > 2) {
      tableHeaders = cells;
      continue;
    }

    if (cells.length === 2) {
      normalized.push(`**${cells[0]}:** ${cells[1] || ""}`);
      continue;
    }

    normalized.push(cells
      .map((cell, index) => tableHeaders?.[index] ? `**${tableHeaders[index]}:** ${cell}` : cell)
      .filter(Boolean)
      .join(" · "));
  }

  return normalized.join("\n");
}

function md(raw: string, t: ThemeTokens): string {
  let s = normalizeMarkdownTables(raw)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  s = s.replace(/```[\w]*\n?([\s\S]*?)```/g,
    `<pre style="background:${t.bgInput};border:1px solid ${t.border};color:${t.text}" class="rounded-lg p-3 text-xs font-mono overflow-x-auto my-2 whitespace-pre-wrap">$1</pre>`);
  s = s.replace(/`([^`]+)`/g,
    `<code style="background:${t.bgInput};color:${t.text}" class="px-1.5 py-0.5 rounded text-xs font-mono">$1</code>`);
  s = s.replace(/^## (.+)$/gm,
    `<p style="color:${t.text}" class="text-[15px] font-semibold mt-3 mb-1 tracking-tight">$1</p>`);
  s = s.replace(/^### (.+)$/gm,
    `<p style="color:${t.textMuted}" class="text-[13px] font-semibold mt-2 mb-0.5 uppercase tracking-widest">$1</p>`);
  s = s.replace(/\*\*(.+?)\*\*/g, `<strong style="color:${t.text}" class="font-semibold">$1</strong>`);
  s = s.replace(/\*(.+?)\*/g, `<em class="italic">$1</em>`);
  s = s.replace(/^\s*\|\s*([^|\n]+?)\s*\|\s*([^|\n]+?)\s*\|?\s*$/gm, "**$1:** $2");
  s = s.replace(/^[•\-\*] (.+)$/gm,
    `<li style="color:${t.textMuted}" class="ml-5 list-disc text-[13.5px] my-0.5">$1</li>`);
  s = s.replace(/^\d+\. (.+)$/gm,
    `<li style="color:${t.textMuted}" class="ml-5 list-decimal text-[13.5px] my-0.5">$1</li>`);
  s = s.replace(/(<li[^>]*>[\s\S]*?<\/li>\n?)+/g, m => `<ul class="my-1.5">${m}</ul>`);
  s = s.replace(/\n/g, "<br/>");
  s = s.replace(/(<br\/>)+(<\/?(?:p|ul|ol|li|div|pre|table))/g, "$2");
  s = s.replace(/(<\/(?:p|ul|ol|li|div|pre|table)>)(<br\/>)+/g, "$1");
  return s;
}

// ── Animated message IDs ──────────────────────────────────────────────────────
const animatedIds = new Set<string>();

// ── Typewriter + caret ────────────────────────────────────────────────────────
function MsgContent({ text, isUser, msgId, fontSize, onStream }: {
  text: string; isUser: boolean; msgId: string; fontSize: "sm" | "md" | "lg";
  onStream?: () => void;
}) {
  const { t } = useTh();
  const already = animatedIds.has(msgId);
  const [display, setDisplay] = useState(isUser || already ? text : "");
  const [streaming, setStreaming] = useState(!isUser && !already);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indexRef = useRef(0);

  const sizeClass = fontSize === "sm" ? "text-[13px]" : fontSize === "lg" ? "text-[16px]" : "text-[14.5px]";

  useEffect(() => {
    if (isUser || animatedIds.has(msgId)) { setDisplay(text); setStreaming(false); return; }
    animatedIds.add(msgId);
    indexRef.current = 0;
    setStreaming(true);
    const chunks = text.match(/\S+\s*|\s+/g) || [text];
    const step = () => {
      indexRef.current += 1;
      setDisplay(chunks.slice(0, indexRef.current).join(""));
      onStream?.();
      if (indexRef.current < chunks.length) {
        timerRef.current = setTimeout(step, chunks.length > 150 ? 6 : 14);
      } else setStreaming(false);
    };
    step();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, msgId, isUser]);

  if (isUser) return (
    <p className={`${sizeClass} leading-relaxed`} style={{ color: t.textUser }}>{text}</p>
  );

  return (
    <div className={`${sizeClass} leading-[1.65] sf-serif`} style={{ color: t.text }}>
      <span dangerouslySetInnerHTML={{ __html: md(display, t) }} />
      {streaming && (
        <span className="inline-block w-[2px] h-[15px] ml-0.5 align-middle rounded-sm"
          style={{ backgroundColor: t.brand, animation: "sfCaret 0.85s ease-in-out infinite" }} />
      )}
    </div>
  );
}

// ── Thinking indicator ────────────────────────────────────────────────────────
const THINKING_PHRASES = [
  "Analysing your data…",
  "Reading your numbers…",
  "Connecting the dots…",
  "Thinking it through…",
  "Working out the details…",
  "Crunching the figures…",
];

function ThinkingIndicator() {
  const { t } = useTh();
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx(i => (i + 1) % THINKING_PHRASES.length), 1800);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex items-center gap-3 py-0.5">
      <div className="relative w-4 h-4 flex-shrink-0">
        <span className="absolute inset-0 rounded-full" style={{ border: `1.5px solid ${t.border}` }} />
        <span className="absolute inset-0 rounded-full"
          style={{ border: "1.5px solid transparent", borderTopColor: t.brand, animation: "sfSpin 0.85s linear infinite" }} />
      </div>
      <AnimatePresence mode="wait">
        <motion.span key={idx}
          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.22 }}
          className="text-[13px] italic" style={{ color: t.textFaint }}>
          {THINKING_PHRASES[idx]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
type SidebarView = "chats" | "settings" | "account";

function Sidebar({ expanded, setExpanded, view, setView, convs, activeId, loadConv, delConv, newChat, config, setConfig, userEmail }: {
  expanded: boolean; setExpanded: (e: boolean) => void;
  view: SidebarView; setView: (v: SidebarView) => void;
  convs: AIConversation[]; activeId: string | null;
  loadConv: (id: string) => void; delConv: (id: string, e: React.MouseEvent) => void;
  newChat: () => void; config: AIConfig; setConfig: (c: AIConfig) => void;
  userEmail?: string;
}) {
  const { t, theme, toggle } = useTh();

  if (!expanded) {
    return (
      <div className="w-[52px] flex flex-col items-center py-3 gap-1 flex-shrink-0 h-full"
        style={{ backgroundColor: t.bgSidebar, borderRight: `1px solid ${t.border}` }}>
        <button onClick={() => setExpanded(true)}
          className="w-9 h-9 rounded-lg flex items-center justify-center mb-2 transition-colors"
          style={{ color: t.textFaint }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = t.bgHover}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
          title="Expand sidebar" aria-label="Expand sidebar">
          <Menu size={17} />
        </button>
        <button onClick={newChat}
          className="w-9 h-9 rounded-lg flex items-center justify-center mb-2 transition-all active:scale-95"
          style={{ background: `linear-gradient(135deg, ${t.brand}, ${t.brandLight})` }}
          title="New chat" aria-label="New chat">
          <Plus size={16} className="text-white" />
        </button>
        <button onClick={() => { setView("chats"); setExpanded(true); }}
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: t.textFaint }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = t.bgHover}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
          title="Chats" aria-label="Chats">
          <MessageSquare size={16} />
        </button>
        <div className="flex-1" />
        <button onClick={() => { setView("settings"); setExpanded(true); }}
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: t.textFaint }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = t.bgHover}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
          title="Settings" aria-label="Settings">
          <Settings size={16} />
        </button>
        <button onClick={() => { setView("account"); setExpanded(true); }}
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors mb-1"
          style={{ color: t.textFaint }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = t.bgHover}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
          title="Account" aria-label="Account">
          <User size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-[260px] flex flex-col flex-shrink-0 h-full"
      style={{ backgroundColor: t.bgSidebar, borderRight: `1px solid ${t.border}` }}>

      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <div className="flex items-center gap-2 px-1">
          <Logo size={16} strokeColor={t.brand} />
          <span className="text-[13px] font-semibold tracking-tight" style={{ color: t.text }}>SmartFinance</span>
        </div>
        <button onClick={() => setExpanded(false)}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: t.textFaint }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = t.bgHover}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
          title="Collapse sidebar" aria-label="Collapse sidebar">
          <Menu size={16} />
        </button>
      </div>

      {/* New chat */}
      <div className="px-3 pb-2">
        <button onClick={newChat}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors"
          style={{ backgroundColor: t.bgInput, color: t.text }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = t.bgHover}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = t.bgInput}>
          <Plus size={15} style={{ color: t.brand }} />
          <span className="text-[13px] font-medium">New chat</span>
        </button>
      </div>

      {/* View switcher */}
      <div className="flex-1 overflow-y-auto px-3">
        {view === "chats" && (
          <div className="pb-2">
            <p className="text-[10.5px] font-semibold uppercase tracking-widest mb-2 px-1 pt-1"
              style={{ color: t.textFaint }}>Conversations</p>
            {convs.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare size={24} className="mx-auto mb-2 opacity-30" style={{ color: t.textFaint }} />
                <p className="text-[12px]" style={{ color: t.textFaint }}>No conversations yet</p>
              </div>
            ) : convs.map(c => (
              <div key={c.id} onClick={() => loadConv(c.id)}
                className="flex items-start gap-2 px-2 py-2 rounded-lg cursor-pointer group mb-0.5 transition-colors"
                style={{ backgroundColor: activeId === c.id ? t.bgHover : "transparent" }}>
                <MessageSquare size={12} className="flex-shrink-0 mt-0.5" style={{ color: t.textFaint }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] truncate" style={{ color: t.text }}>{c.title}</p>
                  <p className="text-[10.5px]" style={{ color: t.textFaint }}>
                    {new Date(c.lastMessageAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <button onClick={e => delConv(c.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all"
                  style={{ color: t.textFaint }}
                  aria-label="Delete conversation">
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        {view === "settings" && (
          <div className="pb-3">
            <p className="text-[10.5px] font-semibold uppercase tracking-widest mb-2 px-1 pt-1"
              style={{ color: t.textFaint }}>Preferences</p>

            <SettingRow label="Theme" icon={theme === "light" ? Sun : Moon} t={t}>
              <ThemeToggle theme={theme} toggle={toggle} t={t} />
            </SettingRow>

            <SettingRow label="Response length" icon={Sliders} t={t}>
              <SelectSetting
                value={config.responseLength}
                options={[
                  { value: "concise", label: "Concise" },
                  { value: "balanced", label: "Balanced" },
                  { value: "detailed", label: "Detailed" },
                ]}
                onChange={v => setConfig({ ...config, responseLength: v as any })}
                t={t}
              />
            </SettingRow>

            <SettingRow label="Font size" icon={Sliders} t={t}>
              <SelectSetting
                value={config.fontSize}
                options={[
                  { value: "sm", label: "Small" },
                  { value: "md", label: "Medium" },
                  { value: "lg", label: "Large" },
                ]}
                onChange={v => setConfig({ ...config, fontSize: v as any })}
                t={t}
              />
            </SettingRow>

            <SettingRow label="Language" icon={Globe} t={t}>
              <SelectSetting
                value={config.language}
                options={[
                  { value: "en", label: "English" },
                  { value: "hi", label: "हिन्दी" },
                  { value: "mr", label: "मराठी" },
                ]}
                onChange={v => setConfig({ ...config, language: v as any })}
                t={t}
              />
            </SettingRow>

            <SettingRow label="Sound effects" icon={config.soundEnabled ? Volume2 : VolumeX} t={t}>
              <Toggle
                value={config.soundEnabled}
                onChange={v => setConfig({ ...config, soundEnabled: v })}
                t={t}
              />
            </SettingRow>

            <SettingRow label="Auto-scroll" icon={ChevronDown} t={t}>
              <Toggle
                value={config.autoScroll}
                onChange={v => setConfig({ ...config, autoScroll: v })}
                t={t}
              />
            </SettingRow>

            <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${t.border}` }}>
              <button
                onClick={() => setConfig(DEFAULT_CONFIG)}
                className="w-full text-[12px] py-1.5 rounded-lg transition-colors"
                style={{ color: t.textMuted, backgroundColor: t.bgInput }}>
                Reset to defaults
              </button>
            </div>
          </div>
        )}

        {view === "account" && (
          <div className="pb-3">
            <p className="text-[10.5px] font-semibold uppercase tracking-widest mb-2 px-1 pt-1"
              style={{ color: t.textFaint }}>Account</p>
            <div className="p-3 rounded-xl mb-3" style={{ backgroundColor: t.bgInput, border: `1px solid ${t.border}` }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                style={{ background: `linear-gradient(135deg, ${t.brand}, ${t.brandLight})` }}>
                <User size={18} className="text-white" />
              </div>
              <p className="text-[13px] font-semibold" style={{ color: t.text }}>Gaurav Kumbhare</p>
              <p className="text-[11.5px] mt-0.5" style={{ color: t.textFaint }}>{userEmail || "gaurav@smartfinance.app"}</p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.brand }} />
                <span className="text-[11px]" style={{ color: t.brand }}>Pro plan</span>
              </div>
            </div>

            <div className="space-y-0.5">
              {[
                { label: "Financial Profile", icon: User },
                { label: "Billing & Plan", icon: CreditCard },
                { label: "Notifications", icon: Activity },
              ].map(item => (
                <button key={item.label}
                  className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors"
                  style={{ color: t.textMuted }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = t.bgHover}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
                  <item.icon size={13} />
                  <span className="text-[12.5px] flex-1">{item.label}</span>
                  <ChevronRight size={12} style={{ color: t.textFaint }} />
                </button>
              ))}
            </div>

            <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${t.border}` }}>
              <button className="w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-colors text-red-500"
                onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.08)"}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
                <LogOut size={13} />
                <span className="text-[12.5px]">Sign out</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="flex items-center gap-1 px-3 py-2" style={{ borderTop: `1px solid ${t.borderSubtle}` }}>
        {([
          { id: "chats" as SidebarView, icon: MessageSquare, label: "Chats" },
          { id: "settings" as SidebarView, icon: Settings, label: "Settings" },
          { id: "account" as SidebarView, icon: User, label: "Account" },
        ]).map(item => (
          <button key={item.id} onClick={() => setView(item.id)}
            className="flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg transition-colors"
            style={{
              backgroundColor: view === item.id ? t.bgHover : "transparent",
              color: view === item.id ? t.brand : t.textFaint,
            }}
            title={item.label} aria-label={item.label}>
            <item.icon size={15} />
            <span className="text-[9.5px]">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Setting sub-components ────────────────────────────────────────────────────
function SettingRow({ label, icon: Icon, t, children }: {
  label: string; icon: any; t: ThemeTokens; children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 px-1" style={{ borderBottom: `1px solid ${t.borderSubtle}` }}>
      <div className="flex items-center gap-2">
        <Icon size={13} style={{ color: t.textFaint }} />
        <span className="text-[12.5px]" style={{ color: t.textMuted }}>{label}</span>
      </div>
      {children}
    </div>
  );
}

function SelectSetting({ value, options, onChange, t }: {
  value: string; options: { value: string; label: string }[];
  onChange: (v: string) => void; t: ThemeTokens;
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="text-[11.5px] px-2 py-1 rounded-lg border outline-none cursor-pointer"
      style={{ backgroundColor: t.bgInput, color: t.text, borderColor: t.border }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Toggle({ value, onChange, t }: { value: boolean; onChange: (v: boolean) => void; t: ThemeTokens }) {
  return (
    <button onClick={() => onChange(!value)}
      className="w-8 h-4 rounded-full flex items-center transition-all relative"
      style={{ backgroundColor: value ? t.brand : t.border }}>
      <span className="absolute w-3 h-3 rounded-full bg-white shadow-sm transition-all"
        style={{ left: value ? "calc(100% - 14px)" : "2px" }} />
    </button>
  );
}

function ThemeToggle({ theme, toggle, t }: { theme: Theme; toggle: () => void; t: ThemeTokens }) {
  return (
    <button onClick={toggle}
      className="flex items-center gap-1 px-2 py-1 rounded-lg border text-[11.5px] transition-colors"
      style={{ backgroundColor: t.bgInput, borderColor: t.border, color: t.text }}>
      {theme === "light" ? <Sun size={11} /> : <Moon size={11} />}
      {theme === "light" ? "Light" : "Dark"}
    </button>
  );
}

// ── Welcome screen ────────────────────────────────────────────────────────────
function WelcomeScreen({ send, t, fontSize }: {
  send: (msg: string) => void; t: ThemeTokens; fontSize: "sm" | "md" | "lg";
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
          style={{ background: `linear-gradient(135deg, ${t.brand}, ${t.brandLight})` }}>
          <Logo size={24} />
        </div>
        <h2 className="text-[20px] font-semibold text-center mb-1 tracking-tight" style={{ color: t.text }}>
          SmartFinance AI
        </h2>
        <p className="text-[13.5px] text-center mb-8" style={{ color: t.textMuted }}>
          Your personal Indian wealth advisor
        </p>
        <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto">
          {QUICK_ACTIONS.map(qa => (
            <button key={qa.label} type="button" onClick={() => send(qa.message)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-center active:scale-95 group"
              style={{ backgroundColor: t.bgPanel, borderColor: t.border }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = t.brand;
                e.currentTarget.style.backgroundColor = t.bgHover;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = t.border;
                e.currentTarget.style.backgroundColor = t.bgPanel;
              }}>
              <qa.icon size={16} style={{ color: t.textFaint }} />
              <span className="text-[11px] font-medium leading-tight" style={{ color: t.textMuted }}>
                {qa.label}
              </span>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props { inline?: boolean }

function AIAssistantInner({ inline = false }: Props) {
  const { t } = useTh();

  const [open, setOpen]         = useState(inline);
  const [convs, setConvs]       = useState<AIConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [sidebarView, setSidebarView] = useState<SidebarView>("chats");
  const [config, setConfig]     = useState<AIConfig>(DEFAULT_CONFIG);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);

  useEffect(() => {
    if (!inline && !open) {
      const dismissed = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("sf_ai_popup_dismissed") : null;
      if (!dismissed) {
        const timer = setTimeout(() => setShowWelcomePopup(true), 1200);
        return () => clearTimeout(timer);
      }
    } else {
      setShowWelcomePopup(false);
    }
  }, [inline, open]);

  const endRef     = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const activeIdRef = useRef<string | null>(null);
  const loadingRef  = useRef(false);
  const autoScrollRef = useRef(true);
  const userScrolledUpRef = useRef(false);
  activeIdRef.current = activeId;
  loadingRef.current  = loading;
  autoScrollRef.current = config.autoScroll;

  function scrollToBottom(smooth = true) {
    if (!autoScrollRef.current) return;
    if (userScrolledUpRef.current) return;
    endRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }

  function handleScroll() {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    userScrolledUpRef.current = distanceFromBottom > 120;
  }

  useEffect(() => {
    if (open) { fetchConvs(); setTimeout(() => inputRef.current?.focus(), 150); }
  }, [open]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [input]);

  async function fetchConvs() {
    try {
      const res = await aiAPI.listConversations();
      setConvs(res.data.conversations || []);
    } catch {}
  }

  async function loadConv(id: string) {
    setActiveId(id);
    setError(null);
    setSuggestions([]);
    try {
      const res = await aiAPI.getConversation(id);
      setMessages(res.data.messages || []);
    } catch (e: any) {
      setError(e.message || "Could not load conversation");
    }
  }

  async function send(text: string, retryId?: string) {
    const msg = text.trim();
    if (!msg || loadingRef.current) return;
    setError(null);
    setLoading(true);
    userScrolledUpRef.current = false;

    if (retryId) setMessages(prev => prev.filter(m => m.id !== retryId));

    const tempId = `tmp-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: tempId, role: "user" as const, content: msg,
      createdAt: new Date().toISOString(),
    }]);
    setInput("");

    try {
      const res = await aiAPI.chat(msg, activeIdRef.current || undefined);
      const { conversationId, messageId, content, suggestions: dynamicSuggestions } = res.data;
      if (!activeIdRef.current) { setActiveId(conversationId); fetchConvs(); }
      if (dynamicSuggestions && dynamicSuggestions.length) {
        setSuggestions(dynamicSuggestions);
      }
      setMessages(prev => [
        ...prev.filter(m => m.id !== tempId),
        { id: `u-${messageId}`, role: "user" as const,     content: msg, createdAt: new Date().toISOString() },
        { id: messageId,        role: "assistant" as const, content,      createdAt: new Date().toISOString() },
      ]);
    } catch (e: any) {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, failed: true } : m));
      setInput(msg);
      setError(
        e.code === "PROFILE_INCOMPLETE" || e.status === 403
          ? "Complete your financial profile in Settings to use the AI advisor."
          : e.status === 401 ? "Please sign in to continue."
          : e.status === 0  ? "Can't reach the server — check your connection."
          : e.message || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }

  function newChat() {
    setActiveId(null);
    setMessages([]);
    setSuggestions([]);
    setError(null);
    setInput("");
    inputRef.current?.focus();
  }

  async function delConv(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await aiAPI.deleteConversation(id);
      setConvs(prev => prev.filter(c => c.id !== id));
      if (activeId === id) { setActiveId(null); setMessages([]); setSuggestions([]); }
    } catch (err: any) { setError(err.message); }
  }

  const panelCls = inline
    ? "w-full flex flex-col overflow-hidden rounded-2xl"
    : "fixed inset-0 z-50 flex flex-col overflow-hidden";

  const panel = (
    <div className={panelCls}
      style={{
        backgroundColor: t.bg,
        border: inline ? `1px solid ${t.border}` : "none",
        minHeight: inline ? 560 : undefined,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,500&display=swap');
        @keyframes sfCaret { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        @keyframes sfSpin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .sf-serif { font-family: 'Source Serif 4', Georgia, serif; }
      `}</style>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <Sidebar
          expanded={sidebarExpanded} setExpanded={setSidebarExpanded}
          view={sidebarView} setView={setSidebarView}
          convs={convs} activeId={activeId}
          loadConv={loadConv} delConv={delConv} newChat={newChat}
          config={config} setConfig={setConfig}
        />

        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
            style={{ borderBottom: `1px solid ${t.border}`, backgroundColor: t.bgPanel }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${t.brand}, ${t.brandLight})` }}>
              <Logo size={13} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-semibold tracking-tight" style={{ color: t.text }}>
                {messages.length > 0 && convs.find(c => c.id === activeId)?.title || "SmartFinance AI"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {!inline && (
                <button onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg transition-colors" style={{ color: t.textFaint }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = t.bgHover}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex-shrink-0 mx-4 mt-3 p-3 rounded-xl flex items-start gap-2"
              style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="flex-1 text-[12.5px] text-red-600 leading-relaxed">{error}</p>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                <X size={13} />
              </button>
            </div>
          )}

          {/* Messages or welcome */}
          {messages.length === 0 && !loading ? (
            <WelcomeScreen send={send} t={t} fontSize={config.fontSize} />
          ) : (
            <div ref={scrollContainerRef} onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-6 py-5 space-y-6 min-h-0" style={{ backgroundColor: t.bg }}>
              {messages.map((msg, i) => (
                <motion.div key={msg.id}
                  initial={i >= messages.length - 2 ? { opacity: 0, y: 8 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}>

                  {msg.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="max-w-[75%]">
                        <p className="text-[10.5px] text-right mb-1 uppercase tracking-widest" style={{ color: t.textFaint }}>You</p>
                        <div className="px-4 py-3 rounded-xl" style={{
                          backgroundColor: t.bgUserMsg,
                          border: msg.failed ? "1px solid rgba(239,68,68,0.4)" : undefined,
                        }}>
                          <MsgContent text={msg.content} isUser msgId={msg.id} fontSize={config.fontSize} />
                        </div>
                        {msg.failed && (
                          <div className="flex items-center justify-end gap-2 mt-1">
                            <span className="text-[11px] text-red-500">Failed to send</span>
                            <button type="button" onClick={() => send(msg.content, msg.id)}
                              className="text-[11px] font-medium underline" style={{ color: t.brand }}>
                              Retry
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm"
                        style={{ background: `linear-gradient(135deg, ${t.brand}, ${t.brandLight})` }}>
                        <Logo size={12} />
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-[10.5px] mb-1 uppercase tracking-widest" style={{ color: t.textFaint }}>SmartFinance AI</p>
                        <MsgContent text={msg.content} isUser={false} msgId={msg.id} fontSize={config.fontSize}
                          onStream={() => scrollToBottom(false)} />
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}

              {loading && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                  className="flex gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${t.brand}, ${t.brandLight})` }}>
                    <Logo size={12} />
                  </div>
                  <div className="flex-1 pt-0.5">
                    <p className="text-[10.5px] mb-1 uppercase tracking-widest" style={{ color: t.textFaint }}>SmartFinance AI</p>
                    <ThinkingIndicator />
                  </div>
                </motion.div>
              )}
              <div ref={endRef} />
            </div>
          )}

          {/* Dynamic contextual suggestions or Quick Actions when mid-conversation */}
          {messages.length > 0 && !loading && (
            <div className="flex-shrink-0 px-4 py-2 overflow-x-auto flex gap-2"
              style={{ borderTop: `1px solid ${t.borderSubtle}`, backgroundColor: t.bgPanel }}>
              {suggestions.length > 0 ? (
                suggestions.map(s => (
                  <button key={s} type="button" onClick={() => send(s)} disabled={loading}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-medium border transition-all disabled:opacity-40 shadow-xs"
                    style={{ color: t.brand, borderColor: t.brand, backgroundColor: t.bgHover }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = t.bgHover; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = t.brand; }}>
                    <Zap size={11} className="text-amber-500" />
                    {s}
                  </button>
                ))
              ) : (
                QUICK_ACTIONS.slice(0, 6).map(qa => (
                  <button key={qa.label} type="button" onClick={() => send(qa.message)} disabled={loading}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-medium border transition-all disabled:opacity-40"
                    style={{ color: t.textMuted, borderColor: t.border, backgroundColor: t.bgInput }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = t.brand; e.currentTarget.style.color = t.brand; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textMuted; }}>
                    <qa.icon size={11} />
                    {qa.label}
                  </button>
                ))
              )}
            </div>
          )}

          {/* Input */}
          <div className="flex-shrink-0 px-4 py-3" style={{ borderTop: `1px solid ${t.border}`, backgroundColor: t.bgPanel }}>
            <div className="flex gap-3 items-end">
              <div className="flex-1 rounded-xl border transition-all overflow-hidden"
                style={{ backgroundColor: t.bgInput, borderColor: t.border }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
                  }}
                  placeholder="Ask about your finances… (Shift+Enter for new line)"
                  disabled={loading}
                  rows={1}
                  className="w-full px-4 py-3 text-[13.5px] outline-none resize-none bg-transparent disabled:opacity-60 leading-relaxed"
                  style={{ color: t.text, maxHeight: "120px" }}
                  onFocus={e => {
                    const parent = e.currentTarget.parentElement!;
                    parent.style.borderColor = t.brand;
                    parent.style.boxShadow = `0 0 0 3px ${t.brand}18`;
                  }}
                  onBlur={e => {
                    const parent = e.currentTarget.parentElement!;
                    parent.style.borderColor = t.border;
                    parent.style.boxShadow = "none";
                  }}
                />
              </div>
              <button type="button" onClick={() => send(input)}
                disabled={!input.trim() || loading}
                className="w-10 h-10 rounded-xl text-white flex items-center justify-center disabled:opacity-30 transition-all active:scale-95 flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${t.brand}, ${t.brandLight})` }}>
                {loading
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" style={{ animation: "sfSpin 0.85s linear infinite" }} />
                  : <Send size={14} />
                }
              </button>
            </div>
            <p className="text-[10.5px] text-center mt-2 uppercase tracking-wide" style={{ color: t.textFaint }}>
              AI Financial Advisor · Indian Context · Not Financial Advice
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  if (inline) return panel;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div key="sf-panel"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.18, ease: "easeOut" }}>
            {panel}
          </motion.div>
        )}
      </AnimatePresence>

      {!open && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
          {/* Welcome Callout Popup */}
          <AnimatePresence>
            {showWelcomePopup && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.92 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="pointer-events-auto mb-3 max-w-[320px] sm:max-w-[340px] rounded-2xl p-4 shadow-2xl border backdrop-blur-md relative"
                style={{
                  backgroundColor: t.bgPanel,
                  borderColor: `${t.brand}40`,
                  boxShadow: `0 20px 35px -10px rgba(0,0,0,0.35), 0 0 20px ${t.brand}25`,
                }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowWelcomePopup(false);
                    if (typeof sessionStorage !== "undefined") sessionStorage.setItem("sf_ai_popup_dismissed", "true");
                  }}
                  className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
                  style={{ backgroundColor: t.bgHover }}
                  aria-label="Dismiss">
                  <X size={13} />
                </button>

                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-md"
                    style={{ background: `linear-gradient(135deg, ${t.brand}, ${t.brandLight})` }}>
                    <Logo size={16} />
                  </div>
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full text-emerald-500 bg-emerald-500/10 border border-emerald-500/20">
                        AI Wealth Assistant
                      </span>
                    </div>
                    <h4 className="text-[13.5px] font-bold leading-tight" style={{ color: t.text }}>
                      Need quick financial help?
                    </h4>
                    <p className="text-[11.5px] mt-1 leading-normal" style={{ color: t.textMuted }}>
                      Ask me for <strong>live stock quotes</strong>, <strong>tax regimes</strong>, <strong>SIP math</strong>, or your net worth!
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t flex items-center justify-between gap-2" style={{ borderColor: t.borderSubtle }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowWelcomePopup(false);
                      setOpen(true);
                      setTimeout(() => {
                        send("price of sbi stock today ?");
                      }, 120);
                    }}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all text-left truncate flex items-center gap-1 hover:opacity-85"
                    style={{ borderColor: t.border, color: t.brand, backgroundColor: t.bgHover }}>
                    <Zap size={11} className="text-amber-500 flex-shrink-0" />
                    <span>SBI stock price?</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowWelcomePopup(false);
                      setOpen(true);
                    }}
                    className="text-[11.5px] font-semibold px-3 py-1.5 rounded-xl text-white shadow-xs flex items-center gap-1 transition-all active:scale-95 flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${t.brand}, ${t.brandLight})` }}>
                    <span>Chat Now</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Glowing Floating Button */}
          <div className="relative pointer-events-auto">
            <span
              className="absolute -inset-1 rounded-full opacity-60 blur-xs animate-pulse"
              style={{ background: `linear-gradient(135deg, ${t.brand}, ${t.brandLight})` }}
            />
            <motion.button
              onClick={() => {
                setOpen(true);
                setShowWelcomePopup(false);
                setError(null);
              }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.93 }}
              className="relative w-14 h-14 rounded-full text-white shadow-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${t.brand}, ${t.brandLight})` }}
              aria-label="Open AI assistant">
              <Logo size={22} />
            </motion.button>
          </div>
        </div>
      )}
    </>
  );
}

// ── Wrap with theme provider ──────────────────────────────────────────────────
export function AIAssistant({ inline = false }: Props) {
  const { resolvedTheme, setPreference } = useAppTheme();
  const theme: Theme = resolvedTheme;
  const toggle = () => setPreference(resolvedTheme === "dark" ? "light" : "dark");

  return (
    <ThemeCtx.Provider value={{ theme, t: THEMES[theme], toggle }}>
      <AIAssistantInner inline={inline} />
    </ThemeCtx.Provider>
  );
}
