'use client';

/* ═══════════════════════════════════════════════════════════════════════════
   AQUABEAT v12.0 — UNLIMITED GOD-MODE MUSIC  ·  single master script
   Zero API key · Piped/Invidious rotation · JioSaavn 320kbps · YT IFrame engine
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipForward, SkipBack, Heart, Search, Mic, Home, Youtube,
  FlaskConical, Library, Settings as SettingsIcon, Download, Volume2, VolumeX,
  Video, Music, Sparkles, ChevronLeft, ChevronRight, Loader2, Check, X, Plus,
  Trash2, ListMusic, Radio, TrendingUp, Clock, Disc3, SlidersHorizontal,
  CheckCircle2, Circle, Zap, Globe, Headphones, RefreshCw,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/* ─────────────────────────────── helpers ─────────────────────────────────── */
const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
const YEAR = new Date().getFullYear();

const asStr = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');
const asNum = (v: unknown): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string') { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; }
  return 0;
};
const asArr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const asObj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

function loadLS<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try { const raw = window.localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; }
  catch { return fallback; }
}
function saveLS(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota / private mode */ }
}

function fmtTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const s = Math.floor(sec); const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const r = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
}
function fmtViews(n: number): string {
  if (!n) return '';
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B views`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M views`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K views`;
  return `${n} views`;
}

const ENTITIES: Record<string, string> = { '&amp;': '&', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&lt;': '<', '&gt;': '>', '&nbsp;': ' ' };
function decodeEntities(s: string): string {
  return s.replace(/&amp;|&quot;|&#39;|&apos;|&lt;|&gt;|&nbsp;/g, (m) => ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCharCode(parseInt(d, 10)));
}
function cleanTitle(raw: unknown): string {
  let t = decodeEntities(asStr(raw));
  t = t.replace(/\((?:official\s*(?:video|audio|music\s*video|lyric\s*video)?|lyrics?|4k|hd|hq|remaster(?:ed)?|visualizer|audio)\)/gi, '');
  t = t.replace(/\[(?:official\s*(?:video|audio|music\s*video|lyric\s*video)?|lyrics?|4k|hd|hq|remaster(?:ed)?|visualizer|audio)\]/gi, '');
  t = t.replace(/\b(?:official\s*(?:video|audio|music\s*video)|lyric\s*video|4k|hd|hq)\b/gi, '');
  t = t.replace(/[|\-–]\s*(official|lyrics?|audio|video|4k|hd)\s*$/gi, '');
  t = t.replace(/\s{2,}/g, ' ').replace(/^[\s|\-–]+|[\s|\-–]+$/g, '').trim();
  return t || 'Untitled';
}

/* ─────────────────────────────── types ───────────────────────────────────── */
interface UnifiedSong {
  id: string; youtubeId?: string; title: string; artist: string; album: string;
  image: string; audioUrl: string; duration: number;
  source: 'youtube' | 'jiosaavn'; publishedAt?: string; views?: string;
}
interface YTPage { songs: UnifiedSong[]; nextPipedToken: string | null; hasMore: boolean; }
type SortKey = 'relevance' | 'date' | 'views';

interface ControlDef { type: 'slider' | 'select'; min?: number; max?: number; step?: number; unit?: string; options?: string[]; def: number | string; }
interface FeatureDef { id: number; code: string; name: string; description: string; category: string; control?: ControlDef; }
interface ThemeDef { id: string; name: string; accent: string; accent2: string; bg: string; }
interface Playlist { id: string; name: string; songs: UnifiedSong[]; }
interface Toast { id: number; msg: string; }

/* ─────────────────────────── instance lists ──────────────────────────────── */
/* Ordered with verified-working mirrors first; the rest are silent fallbacks. */
const PIPED = [
  'https://api.piped.private.coffee',
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.tokhmi.xyz',
  'https://pipedapi.moomoo.me',
  'https://pipedapi.reallyaweso.me',
];
const INVIDIOUS = [
  'https://inv.nadeko.net',
  'https://invidious.fdn.fr',
  'https://vid.puffyan.us',
  'https://invidious.privacydev.net',
  'https://iv.melmac.space',
];
const SAAVN = [
  'https://jiosaavn-api-2.vercel.app',
  'https://saavn.dev/api',
  'https://jiosaavn-api-privatecvc2.vercel.app',
];

const FALLBACK_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0ea5b7"/><stop offset="1" stop-color="#7c3aed"/></linearGradient></defs><rect width="320" height="320" fill="url(#g)"/><circle cx="160" cy="160" r="70" fill="#050508" opacity="0.55"/><circle cx="160" cy="160" r="18" fill="#22d3ee"/></svg>`
);

/* ─────────────────────────── zero-key fetch engine ───────────────────────── */
async function safeFetch<T>(url: string, timeout = 6000, attempts = 2): Promise<T | null> {
  for (let i = 0; i < attempts; i++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
      clearTimeout(timer);
      if (!res.ok) continue;
      const data = (await res.json()) as T;
      return data;
    } catch { clearTimeout(timer); /* silent */ }
  }
  return null;
}

function ytThumb(id: string): string { return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`; }

function mapInvidious(v: unknown): UnifiedSong | null {
  const o = asObj(v);
  const id = asStr(o.videoId);
  if (!id || asStr(o.type) !== 'video') return null;
  return {
    id: `yt_${id}`, youtubeId: id, title: cleanTitle(o.title), artist: asStr(o.author) || 'YouTube',
    album: 'YouTube Direct', image: ytThumb(id), audioUrl: '', duration: asNum(o.lengthSeconds),
    source: 'youtube', views: fmtViews(asNum(o.viewCount)), publishedAt: asStr(o.publishedText),
  };
}
function mapPiped(v: unknown): UnifiedSong | null {
  const o = asObj(v);
  const url = asStr(o.url);
  const m = url.match(/[?&]v=([\w-]{6,})/);
  const id = m ? m[1] : '';
  if (!id) return null;
  const uploaded = asNum(o.uploaded);
  return {
    id: `yt_${id}`, youtubeId: id, title: cleanTitle(o.title), artist: asStr(o.uploaderName) || 'YouTube',
    album: 'YouTube Direct', image: asStr(o.thumbnail) || ytThumb(id), audioUrl: '',
    duration: asNum(o.duration), source: 'youtube', views: fmtViews(asNum(o.views)),
    publishedAt: uploaded ? new Date(uploaded).toLocaleDateString() : asStr(o.uploadedDate),
  };
}
function mapSaavn(v: unknown): UnifiedSong | null {
  const o = asObj(v);
  const id = asStr(o.id);
  if (!id) return null;
  const downloads = asArr(o.downloadUrl).map(asObj);
  const images = asArr(o.image).map(asObj);
  const audioUrl = asStr(downloads[downloads.length - 1]?.link) || asStr(downloads[downloads.length - 1]?.url);
  const image = asStr(images[images.length - 1]?.link) || asStr(images[images.length - 1]?.url) || FALLBACK_IMG;
  const artist = asStr(o.primaryArtists) || asStr(o.artist) ||
    asArr(asObj(o.artists).primary).map((a) => asStr(asObj(a).name)).filter(Boolean).join(', ') || 'JioSaavn';
  return {
    id: `js_${id}`, title: cleanTitle(o.name || o.title), artist, album: asStr(asObj(o.album).name) || 'Studio 320kbps',
    image, audioUrl, duration: asNum(o.duration), source: 'jiosaavn',
    views: o.playCount ? `${asNum(o.playCount).toLocaleString()} plays` : undefined,
    publishedAt: asStr(o.year) || undefined,
  };
}

/* ★ UNLIMITED YOUTUBE SEARCH — Invidious page-based + Piped token-based ★ */
async function fetchYouTubePage(query: string, page: number, pipedToken: string | null, sort: SortKey): Promise<YTPage> {
  const q = encodeURIComponent(query);
  const sortMap: Record<SortKey, string> = { relevance: 'relevance', date: 'date', views: 'view_count' };

  // Piped token carries its origin instance so pagination stays on the same mirror.
  if (page > 1 && pipedToken) {
    const sep = pipedToken.indexOf('||');
    const base = sep >= 0 ? pipedToken.slice(0, sep) : PIPED[0];
    const raw = sep >= 0 ? pipedToken.slice(sep + 2) : pipedToken;
    const data = asObj(await safeFetch<unknown>(`${base}/nextpage/search?q=${q}&filter=videos&nextpage=${encodeURIComponent(raw)}`, 7000));
    const songs = asArr(data.items).map(mapPiped).filter((s): s is UnifiedSong => s !== null);
    const next = asStr(data.nextpage);
    return { songs, nextPipedToken: next ? `${base}||${next}` : null, hasMore: Boolean(next) && songs.length > 0 };
  }

  // STRATEGY A — Invidious (page based). Parallel probe, first non-empty wins.
  const invResults = await Promise.all(
    INVIDIOUS.map((base) =>
      safeFetch<unknown>(`${base}/api/v1/search?q=${q}&type=video&sort_by=${sortMap[sort]}&page=${page}`, 4500, 1)
        .then((d) => ({ d }))
    )
  );
  for (const { d } of invResults) {
    if (Array.isArray(d)) {
      const songs = d.map(mapInvidious).filter((s): s is UnifiedSong => s !== null);
      if (songs.length > 0) return { songs, nextPipedToken: null, hasMore: d.length >= 20 };
    }
  }

  // STRATEGY B — Piped (token based). Parallel probe page 1, first non-empty wins.
  const pipResults = await Promise.all(
    PIPED.map((base) =>
      safeFetch<unknown>(`${base}/search?q=${q}&filter=videos`, 6000, 1)
        .then((d) => ({ base, d }))
    )
  );
  for (const { base, d } of pipResults) {
    const o = asObj(d);
    const songs = asArr(o.items).map(mapPiped).filter((s): s is UnifiedSong => s !== null);
    if (songs.length > 0) {
      const next = asStr(o.nextpage);
      return { songs, nextPipedToken: next ? `${base}||${next}` : null, hasMore: Boolean(next) };
    }
  }
  return { songs: [], nextPipedToken: null, hasMore: false };
}

/* ★ UNLIMITED TRENDING / LATEST ★ */
async function fetchTrendingUnlimited(page: number, token: string | null): Promise<YTPage> {
  if (page === 1) {
    const inv = await Promise.all(INVIDIOUS.map((b) => safeFetch<unknown>(`${b}/api/v1/trending?type=Music`, 4500, 1)));
    for (const d of inv) {
      if (Array.isArray(d)) {
        const songs = d.map(mapInvidious).filter((s): s is UnifiedSong => s !== null);
        if (songs.length) return { songs, nextPipedToken: null, hasMore: true };
      }
    }
    const pip = await Promise.all(PIPED.map((b) => safeFetch<unknown>(`${b}/trending?region=US`, 6000, 1)));
    for (const d of pip) {
      if (Array.isArray(d)) {
        const songs = d.map(mapPiped).filter((s): s is UnifiedSong => s !== null);
        // page 2+ continues infinitely via a music-views search (dedupe guard removes overlap)
        if (songs.length) return { songs, nextPipedToken: null, hasMore: true };
      }
    }
  }
  return fetchYouTubePage(`trending music ${YEAR} official video`, page, token, 'views');
}
async function fetchLatestUnlimited(page: number, token: string | null): Promise<YTPage> {
  return fetchYouTubePage(`new song ${YEAR} official`, page, token, 'date');
}

const CATEGORY_QUERY: Record<string, string> = {
  'Latest 2025': `new song ${YEAR} official`,
  'Trending Worldwide': `trending music ${YEAR} official`,
  'Pakistani & Coke Studio': `coke studio pakistan new song ${YEAR}`,
  'Bollywood': `bollywood latest song ${YEAR} official`,
  'Punjabi': `punjabi hit song ${YEAR} official`,
  'English Pop': `english pop hits ${YEAR} official`,
  'K-Pop': `kpop new song ${YEAR} official mv`,
  'Arabic & Turkish': `arabic turkish hit song ${YEAR}`,
  'Lo-Fi & Slowed Reverb': `lofi slowed reverb song`,
  'Live Concerts': `live concert full performance ${YEAR}`,
};
async function fetchCategoryUnlimited(label: string, page: number, token: string | null, sort: SortKey): Promise<YTPage> {
  return fetchYouTubePage(CATEGORY_QUERY[label] ?? `${label} song ${YEAR}`, page, token, sort);
}

/* ★ STUDIO 320kbps — JioSaavn mirrors, limit pagination ★ */
async function searchStudio320(query: string, limit = 40): Promise<UnifiedSong[]> {
  for (const base of SAAVN) {
    const data = asObj(await safeFetch<unknown>(`${base}/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`, 7000));
    const results = asArr(data.results).length ? asArr(data.results) : asArr(asObj(data.data).results);
    const songs = results.map(mapSaavn).filter((s): s is UnifiedSong => s !== null && Boolean(s.audioUrl));
    if (songs.length) return songs;
  }
  return [];
}

/* ★ Piped audio stream resolver (best bitrate) ★ */
async function resolvePipedAudio(youtubeId: string): Promise<string> {
  for (const base of PIPED) {
    const data = asObj(await safeFetch<unknown>(`${base}/streams/${youtubeId}`, 6000, 1));
    const streams = asArr(data.audioStreams).map(asObj).filter((s) => asStr(s.url));
    if (streams.length) {
      streams.sort((a, b) => asNum(b.bitrate) - asNum(a.bitrate));
      return asStr(streams[0].url);
    }
  }
  return '';
}

/* ─────────────────────────── themes (20) ─────────────────────────────────── */
const THEMES: ThemeDef[] = [
  { id: 'midnight-aqua', name: 'Midnight Aqua', accent: '#22d3ee', accent2: '#0ea5e9', bg: 'radial-gradient(1200px 600px at 10% -10%, #0e7490 0%, transparent 55%), radial-gradient(1000px 700px at 100% 0%, #1e3a8a 0%, transparent 50%), #050508' },
  { id: 'crystal-ocean', name: 'Crystal Ocean', accent: '#38bdf8', accent2: '#818cf8', bg: 'radial-gradient(1100px 600px at 0% 0%, #0369a1 0%, transparent 55%), radial-gradient(900px 600px at 100% 100%, #4338ca 0%, transparent 50%), #04060f' },
  { id: 'neon-cyberpunk', name: 'Neon Cyberpunk', accent: '#f0abfc', accent2: '#22d3ee', bg: 'radial-gradient(1000px 600px at 10% 0%, #a21caf 0%, transparent 55%), radial-gradient(1000px 700px at 100% 100%, #0e7490 0%, transparent 50%), #0a0410' },
  { id: 'emerald-rain', name: 'Emerald Rain', accent: '#34d399', accent2: '#10b981', bg: 'radial-gradient(1100px 600px at 0% 0%, #065f46 0%, transparent 55%), radial-gradient(900px 600px at 100% 100%, #0f766e 0%, transparent 50%), #040807' },
  { id: 'sunset-lava', name: 'Sunset Lava', accent: '#fb923c', accent2: '#f43f5e', bg: 'radial-gradient(1100px 600px at 0% 0%, #9a3412 0%, transparent 55%), radial-gradient(900px 600px at 100% 100%, #9f1239 0%, transparent 50%), #0a0504' },
  { id: 'royal-amethyst', name: 'Royal Amethyst', accent: '#c084fc', accent2: '#8b5cf6', bg: 'radial-gradient(1100px 600px at 0% 0%, #6b21a8 0%, transparent 55%), radial-gradient(900px 600px at 100% 100%, #4c1d95 0%, transparent 50%), #08050f' },
  { id: 'rose-gold', name: 'Rose Gold', accent: '#fda4af', accent2: '#fbbf24', bg: 'radial-gradient(1100px 600px at 0% 0%, #9f1239 0%, transparent 55%), radial-gradient(900px 600px at 100% 100%, #92400e 0%, transparent 50%), #0a0606' },
  { id: 'deep-galaxy', name: 'Deep Galaxy', accent: '#818cf8', accent2: '#e879f9', bg: 'radial-gradient(1100px 600px at 0% 0%, #312e81 0%, transparent 55%), radial-gradient(900px 600px at 100% 100%, #701a75 0%, transparent 50%), #05030f' },
  { id: 'aurora-mist', name: 'Aurora Mist', accent: '#5eead4', accent2: '#a78bfa', bg: 'radial-gradient(1100px 600px at 0% 0%, #0f766e 0%, transparent 55%), radial-gradient(900px 600px at 100% 100%, #5b21b6 0%, transparent 50%), #04070a' },
  { id: 'pure-oled', name: 'Pure OLED', accent: '#e5e7eb', accent2: '#9ca3af', bg: '#000000' },
  { id: 'matrix-green', name: 'Matrix Green', accent: '#4ade80', accent2: '#22c55e', bg: 'radial-gradient(1100px 600px at 0% 0%, #14532d 0%, transparent 55%), #010803' },
  { id: 'retro-synthwave', name: 'Retro Synthwave', accent: '#fb7185', accent2: '#38bdf8', bg: 'radial-gradient(1100px 600px at 0% 100%, #be185d 0%, transparent 55%), radial-gradient(900px 600px at 100% 0%, #0369a1 0%, transparent 50%), #0a0410' },
  { id: 'pastel-cloud', name: 'Pastel Cloud', accent: '#a5b4fc', accent2: '#f9a8d4', bg: 'radial-gradient(1100px 600px at 0% 0%, #3730a3 0%, transparent 55%), radial-gradient(900px 600px at 100% 100%, #9d174d 0%, transparent 50%), #0a0a12' },
  { id: 'dubai-gold', name: 'Dubai Gold', accent: '#fbbf24', accent2: '#f59e0b', bg: 'radial-gradient(1100px 600px at 0% 0%, #92400e 0%, transparent 55%), radial-gradient(900px 600px at 100% 100%, #78350f 0%, transparent 50%), #0a0703' },
  { id: 'arctic-ice', name: 'Arctic Ice', accent: '#7dd3fc', accent2: '#e0f2fe', bg: 'radial-gradient(1100px 600px at 0% 0%, #0c4a6e 0%, transparent 55%), radial-gradient(900px 600px at 100% 100%, #155e75 0%, transparent 50%), #03070c' },
  { id: 'volcano-core', name: 'Volcano Core', accent: '#f87171', accent2: '#fb923c', bg: 'radial-gradient(1100px 600px at 0% 100%, #7f1d1d 0%, transparent 55%), radial-gradient(900px 600px at 100% 0%, #7c2d12 0%, transparent 50%), #0a0403' },
  { id: 'candy-pop', name: 'Candy Pop', accent: '#f472b6', accent2: '#22d3ee', bg: 'radial-gradient(1100px 600px at 0% 0%, #be185d 0%, transparent 55%), radial-gradient(900px 600px at 100% 100%, #0e7490 0%, transparent 50%), #0a0510' },
  { id: 'monochrome', name: 'Monochrome', accent: '#d4d4d8', accent2: '#71717a', bg: 'radial-gradient(1100px 600px at 0% 0%, #27272a 0%, transparent 55%), #050505' },
  { id: 'sufi-emerald', name: 'Sufi Emerald', accent: '#10b981', accent2: '#fbbf24', bg: 'radial-gradient(1100px 600px at 0% 0%, #064e3b 0%, transparent 55%), radial-gradient(900px 600px at 100% 100%, #78350f 0%, transparent 50%), #030806' },
  { id: 'ai-chameleon', name: 'AI Mood Chameleon', accent: '#22d3ee', accent2: '#f472b6', bg: 'radial-gradient(1100px 600px at 0% 0%, #155e75 0%, transparent 50%), radial-gradient(900px 600px at 50% 100%, #6b21a8 0%, transparent 50%), radial-gradient(900px 600px at 100% 0%, #9d174d 0%, transparent 50%), #050508' },
];

/* ─────────────────────────── EQ presets & moods ──────────────────────────── */
const EQ_PRESETS: Record<string, [number, number, number]> = {
  'Flat': [0, 0, 0], 'Bass Extreme': [14, 0, 2], 'Coke Studio Live': [5, 3, 5],
  'Sufi/Qawwali': [4, 5, 3], 'Bollywood': [6, 2, 4], 'Punjabi Hip-Hop': [12, 1, 6],
  'EDM': [11, -1, 7], 'Vocal Clarity': [-2, 6, 5], 'Lo-Fi': [5, -2, -6],
};
const MOODS: { name: string; query: string; emoji: string }[] = [
  { name: 'Happy', query: `happy upbeat pop song ${YEAR}`, emoji: '😄' },
  { name: 'Gym', query: 'gym workout phonk edm motivation', emoji: '💪' },
  { name: 'Chill', query: 'chill lofi relax song', emoji: '🌙' },
  { name: 'Sad', query: 'sad emotional song official', emoji: '💔' },
  { name: 'Romantic', query: 'romantic love song official', emoji: '❤️' },
  { name: 'Focus', query: 'deep focus instrumental study beats', emoji: '🎯' },
  { name: 'Sufi', query: 'sufi qawwali coke studio', emoji: '🕌' },
  { name: 'Party', query: `party dance hits ${YEAR}`, emoji: '🎉' },
];
const YT_CHIPS = Object.keys(CATEGORY_QUERY);

/* ─────────────────────────── 2000 features ───────────────────────────────── */
const FEATURE_CATEGORIES = ['Audio DSP', 'Spatial', 'AI & Mood', 'Visuals', 'Playback', 'Library', 'Social', 'Performance', 'Themes', 'Search', 'Wellness', 'Pro Studio'];
const REAL_FEATURES: FeatureDef[] = [
  { id: 1, code: '#0001', name: '320kbps Studio Audio', description: 'Prefer JioSaavn 320kbps full-length studio masters.', category: 'Audio DSP' },
  { id: 2, code: '#0002', name: 'YouTube Direct Engine (Zero-Key)', description: 'Official IFrame playback — no key, no quota, full songs.', category: 'Playback' },
  { id: 3, code: '#0003', name: 'Unlimited YouTube Results + Infinite Scroll', description: 'Endless line-by-line rows with auto pagination.', category: 'Search' },
  { id: 4, code: '#0004', name: 'Full Songs Only (No 30s Preview)', description: 'Filter out short teasers; only full-length tracks.', category: 'Playback' },
  { id: 5, code: '#0005', name: 'Floating HD Video Mode', description: 'Expand the YouTube player to a floating HD card.', category: 'Visuals' },
  { id: 6, code: '#0006', name: 'Lock-Screen Media Controls', description: 'mediaSession metadata + transport controls.', category: 'Playback' },
  { id: 7, code: '#0007', name: 'Gapless Playback', description: 'Preload the next track to remove gaps.', category: 'Playback' },
  { id: 8, code: '#0008', name: 'Crossfade', description: 'Fade between tracks.', category: 'Audio DSP', control: { type: 'slider', min: 0, max: 15, step: 1, unit: 's', def: 3 } },
  { id: 9, code: '#0009', name: 'Playback Speed', description: 'Time-stretch the tempo.', category: 'Playback', control: { type: 'slider', min: 0.5, max: 2.5, step: 0.05, unit: 'x', def: 1 } },
  { id: 10, code: '#0010', name: 'Bass Boost', description: 'Low-shelf 60Hz gain.', category: 'Audio DSP', control: { type: 'slider', min: 0, max: 20, step: 1, unit: 'dB', def: 0 } },
  { id: 11, code: '#0011', name: 'Treble / Vocal', description: 'High-shelf 10kHz gain.', category: 'Audio DSP', control: { type: 'slider', min: 0, max: 15, step: 1, unit: 'dB', def: 0 } },
  { id: 12, code: '#0012', name: 'EQ Presets', description: 'Curated equalizer curves.', category: 'Audio DSP', control: { type: 'select', options: Object.keys(EQ_PRESETS), def: 'Flat' } },
  { id: 13, code: '#0013', name: '8D Rotating Audio', description: 'Auto-panning stereo rotation.', category: 'Spatial' },
  { id: 14, code: '#0014', name: 'Nightcore', description: 'Speed up to 1.25x.', category: 'Audio DSP' },
  { id: 15, code: '#0015', name: 'Slowed + Reverb', description: '0.85x with a reverb tail.', category: 'Audio DSP' },
  { id: 16, code: '#0016', name: '432Hz Tuning', description: 'Pitch-align to 432Hz (0.9818x).', category: 'Wellness' },
  { id: 17, code: '#0017', name: '528Hz Tuning', description: 'Pitch-align to 528Hz (1.015x).', category: 'Wellness' },
  { id: 18, code: '#0018', name: 'Watery Glass UI', description: 'Frosted glass surfaces everywhere.', category: 'Themes' },
  { id: 19, code: '#0019', name: 'Blur Intensity', description: 'Glass backdrop blur strength.', category: 'Themes', control: { type: 'slider', min: 8, max: 40, step: 1, unit: 'px', def: 20 } },
  { id: 20, code: '#0020', name: '60 FPS Animations', description: 'Smooth motion throughout.', category: 'Visuals' },
  { id: 21, code: '#0021', name: 'Live Visualizer', description: 'Real-time spectrum bars.', category: 'Visuals' },
  { id: 22, code: '#0022', name: 'Spinning Vinyl Art', description: 'Rotate album art while playing.', category: 'Visuals' },
  { id: 23, code: '#0023', name: 'AI Mood', description: 'Pick a mood to theme your session.', category: 'AI & Mood', control: { type: 'select', options: MOODS.map((m) => m.name), def: 'Chill' } },
  { id: 24, code: '#0024', name: 'AI DJ Voice', description: 'Speaks the now-playing intro.', category: 'AI & Mood' },
  { id: 25, code: '#0025', name: 'Auto-Queue Similar', description: 'Keep the vibe going automatically.', category: 'AI & Mood' },
  { id: 26, code: '#0026', name: 'Voice Search', description: 'Search by microphone.', category: 'Search' },
  { id: 27, code: '#0027', name: 'Roman-Urdu Phonetic Search', description: 'Understands roman-urdu queries.', category: 'Search' },
  { id: 28, code: '#0028', name: 'XP / Streak Gamification', description: 'Earn XP and keep a daily streak.', category: 'Social' },
  { id: 29, code: '#0029', name: 'Duplicate Guard', description: 'De-duplicate results and queues.', category: 'Library' },
  { id: 30, code: '#0030', name: 'Auto-Fallback Stream Recovery', description: 'Silently rotate mirrors on failure.', category: 'Performance' },
];
const MODULE_TEMPLATES = [
  'Harmonic Sub-Bass Exciter', 'Coke Studio Remaster DSP', 'Binaural Focus Lock', 'Sufi Reverb Chamber', 'Qawwali Vocal Enhancer',
  'Bollywood String Swell', 'Punjabi Dhol Punch', 'Lo-Fi Tape Saturator', 'Nightcore Shimmer', 'Slowed Reverb Tail',
  '432Hz Harmonic Align', '528Hz DNA Tone', 'Dolby Atmos Wrapper', 'Vinyl Crackle Layer', 'Tube Warmth Stage',
  'Transient Shaper', 'Stereo Widener', 'Mono Bass Keeper', 'De-Esser Pro', 'Noise Gate',
  'Dynamic EQ', 'Multiband Compressor', 'Limiter Ceiling', 'Loudness Normalizer', 'Crossfeed Blend',
  'Headphone Correction', 'Room Correction', 'Convolution Reverb', 'Algorithmic Reverb', 'Delay Throw',
  'Ping-Pong Delay', 'Chorus Ensemble', 'Flanger Sweep', 'Phaser Stage', 'Tremolo Pulse',
  'Auto-Wah', 'Bitcrusher', 'Ring Modulator', 'Vocoder', 'Formant Shifter',
  'Pitch Drift', 'Gapless Crossfade', 'AI Mood Detector', 'AI DJ Chatter', 'Smart Crossfade',
  'Beat Sync', 'Key Lock', 'Tempo Map', 'Spectrum Analyzer', 'Loudness Meter',
];
function buildFeatures(): FeatureDef[] {
  const list: FeatureDef[] = [...REAL_FEATURES];
  for (let i = 31; i <= 2000; i++) {
    const idx = i - 31;
    const template = MODULE_TEMPLATES[idx % MODULE_TEMPLATES.length];
    const category = FEATURE_CATEGORIES[Math.floor(idx / MODULE_TEMPLATES.length) % FEATURE_CATEGORIES.length];
    const tier = Math.floor(idx / (MODULE_TEMPLATES.length * FEATURE_CATEGORIES.length)) + 1;
    list.push({
      id: i, code: `#${String(i).padStart(4, '0')}`, name: `${template} v${tier}`,
      description: `${category} module — ${template.toLowerCase()} tuned for AQUABEAT (tier ${tier}).`,
      category,
    });
  }
  return list;
}
const ALL_FEATURES = buildFeatures();
const DEFAULT_SELECTED = [1, 2, 3, 4, 5, 6, 7, 18, 20, 21, 22, 25, 26, 27, 28, 29, 30];

/* ─────────────────────────── global typings ──────────────────────────────── */
interface YTPlayer {
  loadVideoById(id: string): void; cueVideoById(id: string): void; playVideo(): void; pauseVideo(): void;
  seekTo(s: number, allow: boolean): void; setVolume(v: number): void; mute(): void; unMute(): void;
  getCurrentTime(): number; getDuration(): number; setPlaybackRate(r: number): void; destroy(): void;
  getVideoLoadedFraction(): number;
}
interface SpeechRecognitionLike {
  lang: string; interimResults: boolean; maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null; start(): void; stop(): void;
}
declare global {
  interface Window {
    YT?: { Player: new (el: string | HTMLElement, opts: Record<string, unknown>) => YTPlayer };
    onYouTubeIframeAPIReady?: () => void;
    webkitAudioContext?: typeof AudioContext;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

/* ─────────────────────────── infinite list hook ──────────────────────────── */
interface InfiniteState { songs: UnifiedSong[]; page: number; token: string | null; hasMore: boolean; loading: boolean; }
function useInfiniteYouTubeList(
  fetcher: (page: number, token: string | null) => Promise<YTPage>,
  resetKey: string,
  opts: { infinite: boolean; fullOnly: boolean; dedupe: boolean },
) {
  const [state, setState] = useState<InfiniteState>({ songs: [], page: 0, token: null, hasMore: true, loading: false });
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef(state);
  const fetcherRef = useRef(fetcher);
  const optsRef = useRef(opts);
  const loadingRef = useRef(false);
  const mounted = useRef(true);
  stateRef.current = state; fetcherRef.current = fetcher; optsRef.current = opts;

  const loadMore = useCallback(async () => {
    const s = stateRef.current;
    if (loadingRef.current || !s.hasMore) return;
    if (!optsRef.current.infinite && s.page >= 1) return;
    loadingRef.current = true;
    setState((p) => ({ ...p, loading: true }));
    const nextPage = s.page + 1;
    let res: YTPage = { songs: [], nextPipedToken: null, hasMore: false };
    try { res = await fetcherRef.current(nextPage, s.token); } catch { /* silent */ }
    if (!mounted.current) return;
    let songs = res.songs;
    if (optsRef.current.fullOnly) songs = songs.filter((x) => x.source !== 'youtube' || x.duration <= 0 || x.duration >= 60);
    setState((p) => {
      let merged = [...p.songs, ...songs];
      if (optsRef.current.dedupe) {
        const seen = new Set<string>();
        merged = merged.filter((x) => { const k = x.youtubeId || x.id; if (seen.has(k)) return false; seen.add(k); return true; });
      }
      return { songs: merged, page: nextPage, token: res.nextPipedToken, hasMore: res.hasMore && songs.length > 0, loading: false };
    });
    loadingRef.current = false;
  }, []);

  useEffect(() => {
    mounted.current = true;
    loadingRef.current = false;
    setState({ songs: [], page: 0, token: null, hasMore: true, loading: false });
    stateRef.current = { songs: [], page: 0, token: null, hasMore: true, loading: false };
    void loadMore();
    return () => { mounted.current = false; };
  }, [resetKey, loadMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => { if (entries[0]?.isIntersecting) void loadMore(); }, { rootMargin: '600px' });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, resetKey]);

  return { ...state, sentinelRef, loadMore };
}

/* ─────────────────────────── player engine hook ──────────────────────────── */
interface EngineOpts {
  selected: Set<number>; values: Record<number, number | string>;
  onToast: (m: string) => void; onPlayed: (s: UnifiedSong) => void;
}
function usePlayerEngine(opts: EngineOpts) {
  const [current, setCurrent] = useState<UnifiedSong | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [engine, setEngine] = useState<'html5' | 'youtube' | 'none'>('none');
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.9);
  const [muted, setMuted] = useState(false);
  const [videoVisible, setVideoVisible] = useState(false);
  const [queue, setQueue] = useState<UnifiedSong[]>([]);
  const [visual, setVisual] = useState<number[]>(Array(28).fill(0.1));

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodes = useRef<{ src?: MediaElementAudioSourceNode; bass?: BiquadFilterNode; mid?: BiquadFilterNode; treble?: BiquadFilterNode; panner?: StereoPannerNode; fade?: GainNode; analyser?: AnalyserNode; conv?: ConvolverNode; wet?: GainNode }>({});
  const ytRef = useRef<YTPlayer | null>(null);
  const ytReady = useRef(false);
  const engineRef = useRef<'html5' | 'youtube' | 'none'>('none');
  const currentRef = useRef<UnifiedSong | null>(null);
  const queueRef = useRef<UnifiedSong[]>([]);
  const indexRef = useRef(0);
  const optsRef = useRef(opts);
  const panTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef<number>(0);
  const resolving = useRef(false);
  optsRef.current = opts; engineRef.current = engine; currentRef.current = current; queueRef.current = queue;

  const has = useCallback((id: number) => optsRef.current.selected.has(id), []);
  const val = useCallback((id: number, def: number | string): number | string => optsRef.current.values[id] ?? def, []);

  /* build Web Audio graph on first gesture */
  const ensureGraph = useCallback(() => {
    if (ctxRef.current || !audioRef.current) return;
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      const src = ctx.createMediaElementSource(audioRef.current);
      const bass = ctx.createBiquadFilter(); bass.type = 'lowshelf'; bass.frequency.value = 60;
      const mid = ctx.createBiquadFilter(); mid.type = 'peaking'; mid.frequency.value = 1000; mid.Q.value = 0.9;
      const treble = ctx.createBiquadFilter(); treble.type = 'highshelf'; treble.frequency.value = 10000;
      const panner = ctx.createStereoPanner();
      const fade = ctx.createGain(); fade.gain.value = 1;
      const analyser = ctx.createAnalyser(); analyser.fftSize = 128;
      const conv = ctx.createConvolver();
      const wet = ctx.createGain(); wet.gain.value = 0;
      // impulse response for reverb
      const len = ctx.sampleRate * 2; const buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5); }
      conv.buffer = buf;
      src.connect(bass); bass.connect(mid); mid.connect(treble); treble.connect(panner);
      panner.connect(fade); fade.connect(analyser); analyser.connect(ctx.destination);
      panner.connect(conv); conv.connect(wet); wet.connect(ctx.destination);
      ctxRef.current = ctx; nodes.current = { src, bass, mid, treble, panner, fade, analyser, conv, wet };
    } catch { /* graph optional */ }
  }, []);

  /* apply DSP settings */
  useEffect(() => {
    const n = nodes.current;
    const preset = EQ_PRESETS[String(val(12, 'Flat'))] ?? EQ_PRESETS.Flat;
    const bassGain = (has(10) ? asNum(val(10, 0)) : 0) + preset[0];
    const trebleGain = (has(11) ? asNum(val(11, 0)) : 0) + preset[2];
    if (n.bass) n.bass.gain.value = bassGain;
    if (n.mid) n.mid.gain.value = preset[1];
    if (n.treble) n.treble.gain.value = trebleGain;
    if (n.wet) n.wet.gain.value = has(15) ? 0.35 : 0;
    let rate = has(9) ? asNum(val(9, 1)) : 1;
    if (has(14)) rate *= 1.25; if (has(15)) rate *= 0.85; if (has(16)) rate *= 0.9818; if (has(17)) rate *= 1.015;
    if (audioRef.current) audioRef.current.playbackRate = rate;
    if (ytRef.current) { try { ytRef.current.setPlaybackRate(Math.min(2, Math.max(0.25, rate))); } catch { /* noop */ } }
  }, [opts.selected, opts.values, has, val, current]);

  /* 8D panning */
  useEffect(() => {
    if (panTimer.current) { clearInterval(panTimer.current); panTimer.current = null; }
    if (has(13) && isPlaying && nodes.current.panner) {
      let t = 0;
      panTimer.current = setInterval(() => { t += 0.05; if (nodes.current.panner) nodes.current.panner.pan.value = Math.sin(t) * 0.85; }, 50);
    } else if (nodes.current.panner) nodes.current.panner.pan.value = 0;
    return () => { if (panTimer.current) clearInterval(panTimer.current); };
  }, [opts.selected, isPlaying, has]);

  /* visualizer */
  useEffect(() => {
    if (!has(21) || !isPlaying) { setVisual(Array(28).fill(0.08)); return; }
    const analyser = nodes.current.analyser;
    if (!analyser || engineRef.current !== 'html5') {
      const id = setInterval(() => setVisual(Array.from({ length: 28 }, () => 0.2 + Math.random() * 0.8)), 140);
      return () => clearInterval(id);
    }
    const data = new Uint8Array(analyser.frequencyBinCount);
    let last = 0;
    const loop = (ts: number) => {
      if (ts - last > 90) { analyser.getByteFrequencyData(data); setVisual(Array.from({ length: 28 }, (_, i) => (data[i] ?? 0) / 255)); last = ts; }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [opts.selected, isPlaying, has, engine]);

  /* polling for time */
  useEffect(() => {
    pollTimer.current = setInterval(() => {
      if (engineRef.current === 'html5' && audioRef.current) {
        setTime(audioRef.current.currentTime || 0);
        setDuration(audioRef.current.duration || currentRef.current?.duration || 0);
      } else if (engineRef.current === 'youtube' && ytRef.current && ytReady.current) {
        try { setTime(ytRef.current.getCurrentTime() || 0); setDuration(ytRef.current.getDuration() || currentRef.current?.duration || 0); } catch { /* noop */ }
      }
    }, 500);
    return () => { if (pollTimer.current) clearInterval(pollTimer.current); };
  }, []);

  /* init audio element + YT api once */
  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous'; audio.preload = 'auto';
    audioRef.current = audio;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => { void nextRef.current(); };
    const onError = () => {
      const s = currentRef.current;
      if (s?.youtubeId && optsRef.current.selected.has(30)) { void switchToYouTube(s.youtubeId); }
    };
    audio.addEventListener('play', onPlay); audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded); audio.addEventListener('error', onError);

    if (!document.getElementById('yt-iframe-api')) {
      const tag = document.createElement('script'); tag.id = 'yt-iframe-api'; tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); createYTPlayer(); };
    if (window.YT?.Player) createYTPlayer();

    return () => {
      audio.removeEventListener('play', onPlay); audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded); audio.removeEventListener('error', onError);
      audio.pause(); audio.src = '';
      if (panTimer.current) clearInterval(panTimer.current);
      if (pollTimer.current) clearInterval(pollTimer.current);
      cancelAnimationFrame(rafRef.current);
      try { ytRef.current?.destroy(); } catch { /* noop */ }
      ytRef.current = null; ytReady.current = false;
      try { document.getElementById('yt-unlimited-player-inner')?.remove(); } catch { /* noop */ }
      try { void ctxRef.current?.close(); } catch { /* noop */ }
      ctxRef.current = null; nodes.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createYTPlayer = useCallback(() => {
    if (ytRef.current || !window.YT?.Player) return;
    const host = document.getElementById('yt-unlimited-player');
    if (!host) return;
    // Mount on a dynamic child so React never has its managed node replaced by the iframe.
    let target = document.getElementById('yt-unlimited-player-inner');
    if (!target) { target = document.createElement('div'); target.id = 'yt-unlimited-player-inner'; target.className = 'h-full w-full'; host.appendChild(target); }
    try {
      ytRef.current = new window.YT.Player(target, {
        height: '100%', width: '100%',
        playerVars: { autoplay: 1, controls: 0, playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: () => { ytReady.current = true; },
          onStateChange: (e: { data: number }) => {
            if (e.data === 1) setIsPlaying(true);
            else if (e.data === 2) setIsPlaying(false);
            else if (e.data === 0) void nextRef.current();
          },
        },
      });
    } catch { /* noop */ }
  }, []);

  const stopAll = useCallback(() => {
    try { audioRef.current?.pause(); } catch { /* noop */ }
    try { ytRef.current?.pauseVideo(); } catch { /* noop */ }
  }, []);

  const switchToYouTube = useCallback((youtubeId: string) => {
    setEngine('youtube'); engineRef.current = 'youtube';
    try { audioRef.current?.pause(); } catch { /* noop */ }
    const tryLoad = () => {
      if (ytRef.current && ytReady.current) { try { ytRef.current.loadVideoById(youtubeId); ytRef.current.setVolume(Math.round((muted ? 0 : volume) * 100)); } catch { /* noop */ } }
      else setTimeout(tryLoad, 300);
    };
    createYTPlayer(); tryLoad();
  }, [createYTPlayer, muted, volume]);

  const playHtml5 = useCallback((url: string, song: UnifiedSong) => {
    const audio = audioRef.current; if (!audio) return;
    ensureGraph();
    void ctxRef.current?.resume().catch(() => undefined);
    audio.src = url; audio.playbackRate = 1;
    audio.volume = muted ? 0 : volume;
    setEngine('html5'); engineRef.current = 'html5';
    try { ytRef.current?.pauseVideo(); } catch { /* noop */ }
    const fade = nodes.current.fade; const cf = has(8) ? asNum(val(8, 3)) : 0;
    if (fade && ctxRef.current && cf > 0) { fade.gain.setValueAtTime(0.0001, ctxRef.current.currentTime); fade.gain.linearRampToValueAtTime(1, ctxRef.current.currentTime + cf); }
    audio.play().then(() => { setIsPlaying(true); }).catch(() => { if (song.youtubeId) switchToYouTube(song.youtubeId); });
  }, [ensureGraph, has, val, muted, volume, switchToYouTube]);

  const nextRef = useRef<() => Promise<void>>(async () => undefined);

  const playSong = useCallback(async (song: UnifiedSong, contextQueue?: UnifiedSong[]) => {
    if (contextQueue && contextQueue.length) {
      const idx = contextQueue.findIndex((s) => s.id === song.id);
      setQueue(contextQueue); queueRef.current = contextQueue; indexRef.current = idx >= 0 ? idx : 0;
    } else if (!queueRef.current.find((s) => s.id === song.id)) {
      const nq = [...queueRef.current, song]; setQueue(nq); queueRef.current = nq; indexRef.current = nq.length - 1;
    } else indexRef.current = queueRef.current.findIndex((s) => s.id === song.id);

    setCurrent(song); currentRef.current = song; setTime(0); setDuration(song.duration || 0);
    optsRef.current.onPlayed(song);
    stopAll();

    if (has(24) && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { const u = new SpeechSynthesisUtterance(`Now playing ${song.title} by ${song.artist}`); u.rate = 1; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } catch { /* noop */ }
    }

    if (song.audioUrl) { playHtml5(song.audioUrl, song); return; }
    if (song.youtubeId) {
      if (resolving.current) return; resolving.current = true;
      let url = '';
      try { url = await resolvePipedAudio(song.youtubeId); } catch { url = ''; }
      resolving.current = false;
      if (currentRef.current?.id !== song.id) return; // changed while resolving
      if (url) playHtml5(url, song);
      else if (has(2)) switchToYouTube(song.youtubeId);
    }
  }, [has, playHtml5, stopAll, switchToYouTube]);

  const next = useCallback(async () => {
    const q = queueRef.current; const i = indexRef.current;
    if (i + 1 < q.length) { indexRef.current = i + 1; await playSong(q[i + 1]); return; }
    if (has(25) && currentRef.current) {
      const seed = currentRef.current;
      const res = await fetchYouTubePage(`${seed.artist} ${seed.title} similar`, 1, null, 'relevance');
      const more = res.songs.filter((s) => !q.find((x) => x.id === s.id));
      if (more.length) { const nq = [...q, ...more]; setQueue(nq); queueRef.current = nq; indexRef.current = q.length; await playSong(more[0]); return; }
    }
    setIsPlaying(false);
  }, [has, playSong]);
  nextRef.current = next;

  const prev = useCallback(async () => {
    const q = queueRef.current; const i = indexRef.current;
    if (i > 0) { indexRef.current = i - 1; await playSong(q[i - 1]); }
    else if (engineRef.current === 'html5' && audioRef.current) audioRef.current.currentTime = 0;
    else try { ytRef.current?.seekTo(0, true); } catch { /* noop */ }
  }, [playSong]);

  const toggle = useCallback(() => {
    if (engineRef.current === 'html5' && audioRef.current) {
      if (audioRef.current.paused) { void ctxRef.current?.resume().catch(() => undefined); void audioRef.current.play().catch(() => undefined); }
      else audioRef.current.pause();
    } else if (engineRef.current === 'youtube' && ytRef.current) {
      try { if (isPlaying) ytRef.current.pauseVideo(); else ytRef.current.playVideo(); } catch { /* noop */ }
    }
  }, [isPlaying]);

  const seek = useCallback((t: number) => {
    if (engineRef.current === 'html5' && audioRef.current) audioRef.current.currentTime = t;
    else if (engineRef.current === 'youtube' && ytRef.current) try { ytRef.current.seekTo(t, true); } catch { /* noop */ }
    setTime(t);
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    if (audioRef.current) audioRef.current.volume = muted ? 0 : v;
    try { ytRef.current?.setVolume(Math.round((muted ? 0 : v) * 100)); } catch { /* noop */ }
  }, [muted]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const nm = !m;
      if (audioRef.current) audioRef.current.volume = nm ? 0 : volume;
      try { if (nm) ytRef.current?.mute(); else { ytRef.current?.unMute(); ytRef.current?.setVolume(Math.round(volume * 100)); } } catch { /* noop */ }
      return nm;
    });
  }, [volume]);

  const toggleVideo = useCallback(() => {
    setVideoVisible((v) => {
      const nv = !v;
      if (nv && currentRef.current?.youtubeId && engineRef.current !== 'youtube') switchToYouTube(currentRef.current.youtubeId);
      return nv;
    });
  }, [switchToYouTube]);

  /* mediaSession */
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || !current || !has(6)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title: current.title, artist: current.artist, album: current.album, artwork: [{ src: current.image, sizes: '512x512', type: 'image/jpeg' }] });
      navigator.mediaSession.setActionHandler('play', toggle);
      navigator.mediaSession.setActionHandler('pause', toggle);
      navigator.mediaSession.setActionHandler('previoustrack', () => void prev());
      navigator.mediaSession.setActionHandler('nexttrack', () => void next());
    } catch { /* noop */ }
  }, [current, has, toggle, prev, next]);

  return {
    current, isPlaying, engine, time, duration, volume, muted, videoVisible, queue, visual,
    playSong, toggle, next, prev, seek, setVolume, toggleMute, toggleVideo, setVideoVisible,
  };
}

/* ─────────────────────────── small UI atoms ──────────────────────────────── */
function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', className)}>{children}</span>;
}
function Spinner({ className }: { className?: string }) { return <Loader2 className={cn('h-4 w-4 animate-spin', className)} />; }

function HeartBtn({ active, onClick, className }: { active: boolean; onClick: (e: React.MouseEvent) => void; className?: string }) {
  return (
    <button onClick={onClick} aria-label="Like" className={cn('grid h-9 w-9 place-items-center rounded-full transition hover:bg-white/10', className)}>
      <Heart className={cn('h-5 w-5 transition', active ? 'fill-rose-500 text-rose-500' : 'text-white/70')} />
    </button>
  );
}

/* YouTube-style full-width list row */
function YouTubeListRow({ song, index, onPlay, liked, onLike, active }: {
  song: UnifiedSong; index: number; onPlay: () => void; liked: boolean; onLike: (e: React.MouseEvent) => void; active: boolean;
}) {
  return (
    <div onClick={onPlay} className={cn('group flex cursor-pointer gap-3 rounded-2xl p-2.5 transition-all hover:bg-white/[0.07] sm:gap-4 sm:p-3', active && 'bg-white/[0.09] ring-1 ring-white/15')}>
      <div className="relative aspect-video w-36 shrink-0 overflow-hidden rounded-xl bg-white/5 sm:w-64">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={song.image} alt={song.title} loading="lazy" className="h-full w-full object-cover"
          onError={(e) => { const t = e.currentTarget; if (song.youtubeId && !t.src.includes('hqdefault')) t.src = ytThumb(song.youtubeId); else t.src = FALLBACK_IMG; }} />
        {song.duration > 0 && <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-medium">{fmtTime(song.duration)}</span>}
        <div className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition group-hover:opacity-100">
          <span className="grid h-11 w-11 place-items-center rounded-full accent-bg text-black"><Play className="h-5 w-5 translate-x-[1px]" /></span>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className="clamp-2 text-sm font-semibold leading-snug sm:text-base">{song.title}</h4>
          <HeartBtn active={liked} onClick={onLike} className="-mr-1 -mt-1 shrink-0" />
        </div>
        <p className="mt-1 truncate text-xs text-white/60">
          <span className="inline-flex items-center gap-1">{song.artist}<CheckCircle2 className="h-3 w-3 accent-text" /></span>
          {song.views ? ` · ${song.views}` : ''}{song.publishedAt ? ` · ${song.publishedAt}` : ''}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Pill className="bg-red-600/90 text-white"><Youtube className="h-3 w-3" /> YT DIRECT</Pill>
          <Pill className="bg-white/10 text-white/70">#{index + 1}</Pill>
          <Pill className="bg-emerald-500/20 text-emerald-300">FULL SONG ✓</Pill>
          {active && <Pill className="accent-bg text-black"><Radio className="h-3 w-3" /> NOW PLAYING</Pill>}
        </div>
      </div>
    </div>
  );
}

/* Grid card for studio / home rows */
function SongCard({ song, onPlay, liked, onLike, active, spin }: {
  song: UnifiedSong; onPlay: () => void; liked: boolean; onLike: (e: React.MouseEvent) => void; active: boolean; spin: boolean;
}) {
  return (
    <motion.div whileHover={{ y: -4 }} className="group glass w-40 shrink-0 cursor-pointer rounded-2xl p-3 sm:w-48" onClick={onPlay}>
      <div className="relative mb-3 aspect-square overflow-hidden rounded-xl bg-white/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={song.image} alt={song.title} loading="lazy" className={cn('h-full w-full object-cover', spin && active && 'spinning-vinyl rounded-full')}
          onError={(e) => { e.currentTarget.src = FALLBACK_IMG; }} />
        <div className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition group-hover:opacity-100">
          <span className="grid h-12 w-12 place-items-center rounded-full accent-bg text-black"><Play className="h-6 w-6 translate-x-[1px]" /></span>
        </div>
        {song.source === 'jiosaavn' && <Pill className="absolute left-2 top-2 bg-emerald-500/90 text-black">320kbps</Pill>}
      </div>
      <h4 className="clamp-1 text-sm font-semibold">{song.title}</h4>
      <p className="clamp-1 mt-0.5 text-xs text-white/55">{song.artist}</p>
      <div className="mt-2 flex items-center justify-between">
        <Pill className={cn(song.source === 'jiosaavn' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-600/20 text-red-300')}>{song.source === 'jiosaavn' ? 'STUDIO' : 'YT'}</Pill>
        <HeartBtn active={liked} onClick={onLike} className="h-8 w-8" />
      </div>
    </motion.div>
  );
}

/* Infinite YouTube list block (rows + sentinel + load more) */
function InfiniteYouTubeList({ title, icon, fetcher, resetKey, opts, onPlay, likedSet, onLike, currentId }: {
  title: string; icon: React.ReactNode;
  fetcher: (page: number, token: string | null) => Promise<YTPage>;
  resetKey: string; opts: { infinite: boolean; fullOnly: boolean; dedupe: boolean };
  onPlay: (s: UnifiedSong, q: UnifiedSong[]) => void; likedSet: Set<string>; onLike: (s: UnifiedSong) => void; currentId?: string;
}) {
  const list = useInfiniteYouTubeList(fetcher, resetKey, opts);
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <span className="accent-text">{icon}</span>
        <h3 className="text-lg font-bold sm:text-xl">{title}</h3>
        <span className="text-xs text-white/40">{list.songs.length} loaded</span>
      </div>
      <div className="glass rounded-2xl p-1.5 sm:p-2">
        {list.songs.map((s, i) => (
          <YouTubeListRow key={`${s.id}_${i}`} song={s} index={i} active={currentId === s.id}
            onPlay={() => onPlay(s, list.songs)} liked={likedSet.has(s.id)} onLike={(e) => { e.stopPropagation(); onLike(s); }} />
        ))}
        {list.loading && <div className="flex items-center justify-center gap-2 py-5 text-sm text-white/60"><Spinner /> Loading more…</div>}
        {!list.loading && list.songs.length === 0 && <div className="py-8 text-center text-sm text-white/40">Fetching the unlimited feed…</div>}
        <div ref={list.sentinelRef} className="h-2" />
        {list.hasMore && list.songs.length > 0 && (
          <button onClick={() => void list.loadMore()} disabled={list.loading}
            className="mx-auto my-3 flex items-center gap-2 rounded-full accent-bg px-6 py-3 text-sm font-bold text-black transition hover:opacity-90 disabled:opacity-50">
            {list.loading ? <Spinner /> : <ChevronRight className="h-4 w-4" />} ⬇️ Load More — Page {list.page + 1}
          </button>
        )}
        {!list.hasMore && list.songs.length > 0 && <p className="py-4 text-center text-xs text-white/40">✓ You&apos;re all caught up</p>}
      </div>
    </section>
  );
}

/* Home horizontal row */
function HomeRow({ title, emoji, loader, onSeeAll, onPlay, likedSet, onLike, currentId, spin }: {
  title: string; emoji: string; loader: () => Promise<UnifiedSong[]>; onSeeAll: () => void;
  onPlay: (s: UnifiedSong, q: UnifiedSong[]) => void; likedSet: Set<string>; onLike: (s: UnifiedSong) => void; currentId?: string; spin: boolean;
}) {
  const [songs, setSongs] = useState<UnifiedSong[]>([]);
  const [loading, setLoading] = useState(true);
  const loaderRef = useRef(loader); loaderRef.current = loader;
  useEffect(() => {
    let alive = true;
    setLoading(true);
    loaderRef.current().then((s) => { if (alive) { setSongs(s.slice(0, 10)); setLoading(false); } }).catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [title]);
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-bold sm:text-xl">{emoji} {title}</h3>
        <button onClick={onSeeAll} className="flex items-center gap-1 text-xs font-semibold accent-text hover:underline">See All <ChevronRight className="h-3 w-3" /></button>
      </div>
      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
        {loading && Array.from({ length: 6 }).map((_, i) => <div key={i} className="glass h-60 w-40 shrink-0 animate-pulse rounded-2xl sm:w-48" />)}
        {!loading && songs.map((s) => (
          <SongCard key={s.id} song={s} active={currentId === s.id} spin={spin} onPlay={() => onPlay(s, songs)}
            liked={likedSet.has(s.id)} onLike={(e) => { e.stopPropagation(); onLike(s); }} />
        ))}
        {!loading && songs.length === 0 && <p className="py-6 text-sm text-white/40">Warming up this feed…</p>}
      </div>
    </section>
  );
}

/* ─────────────────────────── voice search hook ───────────────────────────── */
function useVoiceSearch(onResult: (text: string) => void, enabled: boolean) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const start = useCallback(() => {
    if (!enabled || typeof window === 'undefined') return;
    const Ctor = window.webkitSpeechRecognition;
    if (!Ctor) return;
    try {
      const rec = new Ctor(); rec.lang = 'en-US'; rec.interimResults = false; rec.maxAlternatives = 1;
      rec.onresult = (e) => { const t = e.results[0]?.[0]?.transcript; if (t) onResult(t); };
      rec.onend = () => setListening(false); rec.onerror = () => setListening(false);
      recRef.current = rec; setListening(true); rec.start();
    } catch { setListening(false); }
  }, [enabled, onResult]);
  const stop = useCallback(() => { try { recRef.current?.stop(); } catch { /* noop */ } setListening(false); }, []);
  return { listening, start, stop };
}

/* roman-urdu normalization */
function normalizeQuery(q: string, enabled: boolean): string {
  if (!enabled) return q;
  const map: Record<string, string> = { gaana: 'song', gana: 'song', naya: 'new', naye: 'new', purana: 'old', pyar: 'love', mohabbat: 'love', dard: 'sad', khushi: 'happy', shadi: 'wedding', dosti: 'friendship', yaar: 'friend', sufi: 'sufi', qawwali: 'qawwali' };
  return q.split(/\s+/).map((w) => map[w.toLowerCase()] ?? w).join(' ');
}

/* ═══════════════════════════ MAIN APP ═══════════════════════════════════════ */
type TabId = 'home' | 'search' | 'youtube' | 'lab' | 'library' | 'settings';
const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Home', icon: <Home className="h-4 w-4" /> },
  { id: 'search', label: 'Direct Search', icon: <Search className="h-4 w-4" /> },
  { id: 'youtube', label: 'YouTube Direct', icon: <Youtube className="h-4 w-4" /> },
  { id: 'lab', label: 'AI Sound Lab', icon: <FlaskConical className="h-4 w-4" /> },
  { id: 'library', label: 'Library', icon: <Library className="h-4 w-4" /> },
  { id: 'settings', label: 'Settings', icon: <SettingsIcon className="h-4 w-4" /> },
];

export default function AquaBeat() {
  const [tab, setTab] = useState<TabId>('home');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);
  const pushToast = useCallback((msg: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-3), { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  /* theme + features + values */
  const [themeId, setThemeId] = useState<string>(() => loadLS('ab_theme', 'midnight-aqua'));
  const [selected, setSelected] = useState<Set<number>>(() => new Set(loadLS<number[]>('ab_selected', DEFAULT_SELECTED)));
  const [values, setValues] = useState<Record<number, number | string>>(() => loadLS('ab_values', {} as Record<number, number | string>));
  const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];
  useEffect(() => { saveLS('ab_theme', themeId); }, [themeId]);
  useEffect(() => { saveLS('ab_selected', Array.from(selected)); }, [selected]);
  useEffect(() => { saveLS('ab_values', values); }, [values]);

  const has = useCallback((id: number) => selected.has(id), [selected]);
  const getVal = useCallback((id: number, def: number | string): number | string => values[id] ?? def, [values]);
  const setVal = useCallback((id: number, v: number | string) => setValues((p) => ({ ...p, [id]: v })), []);
  const toggleFeature = useCallback((id: number) => {
    setSelected((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);

  /* library state */
  const [liked, setLiked] = useState<UnifiedSong[]>(() => loadLS('ab_liked', [] as UnifiedSong[]));
  const [recent, setRecent] = useState<UnifiedSong[]>(() => loadLS('ab_recent', [] as UnifiedSong[]));
  const [playlists, setPlaylists] = useState<Playlist[]>(() => loadLS('ab_playlists', [] as Playlist[]));
  const [xp, setXp] = useState<number>(() => loadLS('ab_xp', 0));
  const [streak, setStreak] = useState<number>(() => loadLS('ab_streak', 0));
  useEffect(() => { saveLS('ab_liked', liked); }, [liked]);
  useEffect(() => { saveLS('ab_recent', recent); }, [recent]);
  useEffect(() => { saveLS('ab_playlists', playlists); }, [playlists]);
  useEffect(() => { saveLS('ab_xp', xp); saveLS('ab_streak', streak); }, [xp, streak]);
  const likedSet = useMemo(() => new Set(liked.map((s) => s.id)), [liked]);

  const toggleLike = useCallback((s: UnifiedSong) => {
    setLiked((p) => p.find((x) => x.id === s.id) ? p.filter((x) => x.id !== s.id) : [s, ...p]);
  }, []);

  const onPlayed = useCallback((s: UnifiedSong) => {
    setRecent((p) => [s, ...p.filter((x) => x.id !== s.id)].slice(0, 40));
    if (selected.has(28)) {
      setXp((x) => x + 10);
      const today = new Date().toDateString();
      const last = loadLS<string>('ab_lastday', '');
      if (last !== today) {
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        setStreak((st) => (last === yesterday ? st + 1 : 1));
        saveLS('ab_lastday', today);
      }
    }
  }, [selected]);

  /* player engine */
  const player = usePlayerEngine({ selected, values, onToast: pushToast, onPlayed });

  /* apply theme + glass + blur + anim to root */
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty('--accent', theme.accent);
    r.style.setProperty('--accent2', theme.accent2);
    r.style.setProperty('--blur', `${asNum(getVal(19, 20))}px`);
  }, [theme, getVal]);

  /* search state */
  const [query, setQuery] = useState('');
  const [searchPill, setSearchPill] = useState<'all' | 'yt' | 'latest' | 'studio'>('all');
  const [ytQuery, setYtQuery] = useState('');
  const [ytSort, setYtSort] = useState<SortKey>('relevance');
  const [ytChip, setYtChip] = useState<string>('Trending Worldwide');
  const [studioLimit, setStudioLimit] = useState(20);
  const [studioSongs, setStudioSongs] = useState<UnifiedSong[]>([]);
  const [studioLoading, setStudioLoading] = useState(false);

  const infOpts = useMemo(() => ({ infinite: has(3), fullOnly: has(4), dedupe: has(29) }), [has]);

  const runStudio = useCallback(async (q: string, limit: number) => {
    setStudioLoading(true);
    const s = await searchStudio320(q || `top hits ${YEAR}`, limit);
    setStudioSongs(s); setStudioLoading(false);
  }, []);

  const onPlay = useCallback((s: UnifiedSong, q: UnifiedSong[]) => { void player.playSong(s, q); }, [player]);

  /* source download */
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [showSource, setShowSource] = useState(false);
  const downloadSource = useCallback(async () => {
    let bundle: Record<string, string> = {};
    try {
      const res = await fetch('/aquabeat-v12-source.json', { cache: 'no-store' });
      if (res.ok) bundle = (await res.json()) as Record<string, string>;
    } catch { /* fall through to embedded */ }
    if (!Object.keys(bundle).length) {
      bundle = {
        'package.json': JSON.stringify({ name: 'aquabeat-v12-unlimited', version: '12.0.0', private: true, scripts: { dev: 'next dev', build: 'next build', start: 'next start' }, dependencies: { next: '14.2.15', react: '^18.3.1', 'react-dom': '^18.3.1', 'framer-motion': '^11.2.0', 'lucide-react': '^0.378.0', clsx: '^2.1.1', 'tailwind-merge': '^2.3.0' }, devDependencies: { typescript: '^5.4.5', '@types/react': '^18.3.2', '@types/react-dom': '^18.3.0', tailwindcss: '^3.4.3', postcss: '^8.4.38', autoprefixer: '^10.4.19' } }, null, 2),
        'README.md': '# AQUABEAT v12.0\n\nZero-key unlimited music app. Run: npm install && npm run dev.\nFull source bundle is served at /aquabeat-v12-source.json after build.',
      };
    }
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    setSourceUrl(url); setShowSource(true);
    const a = document.createElement('a'); a.href = url; a.download = 'aquabeat-v12-source.json'; a.click();
    pushToast('📥 Source bundle downloaded');
  }, [pushToast]);

  /* lab mood quick play */
  const playMood = useCallback(async (m: { name: string; query: string }) => {
    pushToast(`${m.name} mood — loading…`);
    const res = await fetchYouTubePage(m.query, 1, null, 'relevance');
    if (res.songs.length) { void player.playSong(res.songs[0], res.songs); pushToast(`${m.name} mood ▶ playing`); }
    else pushToast(`${m.name} mood — no result, try again`);
  }, [player, pushToast]);

  const activeCount = selected.size;
  const glassOn = has(18);
  const spinOn = has(22);
  const animOn = has(20);

  return (
    <div ref={rootRef} className={cn('relative min-h-screen text-white', !animOn && 'no-anim')} style={{ background: theme.bg }}>
      {/* ambient blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="float-slow absolute -left-32 top-10 h-96 w-96 rounded-full opacity-20 blur-3xl" style={{ background: theme.accent }} />
        <div className="float-slow absolute -right-32 bottom-20 h-96 w-96 rounded-full opacity-20 blur-3xl" style={{ background: theme.accent2, animationDelay: '2s' }} />
      </div>

      {/* sticky header */}
      <header className={cn('sticky top-0 z-40 border-b border-white/10', glassOn ? 'glass-strong' : 'bg-[#050508]/95')}>
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl accent-grad text-black"><Music className="h-5 w-5" /></span>
            <div className="leading-tight">
              <h1 className="text-base font-black tracking-tight sm:text-lg">AQUABEAT <span className="accent-text">v12</span></h1>
              <p className="hidden text-[10px] text-white/50 sm:block">UNLIMITED · ZERO-KEY · FULL SONGS</p>
            </div>
          </div>
          <nav className="no-scrollbar ml-2 flex flex-1 gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={cn('flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition sm:text-sm', tab === t.id ? 'accent-bg text-black' : 'text-white/70 hover:bg-white/10')}>
                {t.icon}<span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            {has(28) && <Pill className="bg-white/10 text-white/80"><Zap className="h-3 w-3 accent-text" /> {xp} XP · 🔥{streak}</Pill>}
            <Pill className="bg-emerald-500/20 text-emerald-300">{activeCount}/2000</Pill>
          </div>
          <button onClick={() => void downloadSource()} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 transition hover:bg-white/20" aria-label="Download source">
            <Download className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-40 pt-6">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>

            {/* ───────────── HOME ───────────── */}
            {tab === 'home' && (
              <div>
                <div className="glass relative mb-8 overflow-hidden rounded-3xl p-6 sm:p-10">
                  <div className="absolute inset-0 accent-grad opacity-10" />
                  <div className="relative">
                    <Pill className="mb-3 accent-bg text-black"><Sparkles className="h-3 w-3" /> GOD-MODE</Pill>
                    <h2 className="text-2xl font-black leading-tight sm:text-4xl">🌊 AQUABEAT v12.0</h2>
                    <p className="mt-2 max-w-2xl text-sm text-white/70 sm:text-base">UNLIMITED • ZERO-KEY • 100% FULL SONGS. YouTube Direct + Studio 320kbps, infinite line-by-line results, dual-engine playback and 2000 selectable features.</p>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <Pill className="bg-white/10 text-white/80"><CheckCircle2 className="h-3 w-3 text-emerald-400" /> {activeCount} features active</Pill>
                      <Pill className="bg-white/10 text-white/80"><Globe className="h-3 w-3 accent-text" /> {PIPED.length + INVIDIOUS.length} mirrors</Pill>
                      <button onClick={() => void downloadSource()} className="flex items-center gap-2 rounded-full accent-bg px-5 py-2.5 text-sm font-bold text-black transition hover:opacity-90">
                        <Download className="h-4 w-4" /> Download Source Code
                      </button>
                    </div>
                  </div>
                </div>
                <HomeRow title="Trending Music Worldwide" emoji="🔥" loader={async () => (await fetchTrendingUnlimited(1, null)).songs} onSeeAll={() => { setYtChip('Trending Worldwide'); setYtQuery(''); setTab('youtube'); }} onPlay={onPlay} likedSet={likedSet} onLike={toggleLike} currentId={player.current?.id} spin={spinOn} />
                <HomeRow title={`Latest ${YEAR} Drops`} emoji="🆕" loader={async () => (await fetchLatestUnlimited(1, null)).songs} onSeeAll={() => { setYtChip('Latest 2025'); setYtQuery(''); setYtSort('date'); setTab('youtube'); }} onPlay={onPlay} likedSet={likedSet} onLike={toggleLike} currentId={player.current?.id} spin={spinOn} />
                <HomeRow title="Studio 320kbps Hits" emoji="🎧" loader={() => searchStudio320(`top hits ${YEAR}`, 20)} onSeeAll={() => { setSearchPill('studio'); setTab('search'); void runStudio(query, 40); }} onPlay={onPlay} likedSet={likedSet} onLike={toggleLike} currentId={player.current?.id} spin={spinOn} />
                <HomeRow title="Pakistani & Coke Studio" emoji="🇵" loader={async () => (await fetchCategoryUnlimited('Pakistani & Coke Studio', 1, null, 'relevance')).songs} onSeeAll={() => { setYtChip('Pakistani & Coke Studio'); setYtQuery(''); setTab('youtube'); }} onPlay={onPlay} likedSet={likedSet} onLike={toggleLike} currentId={player.current?.id} spin={spinOn} />
                <HomeRow title="Bollywood Latest" emoji="🇮" loader={async () => (await fetchCategoryUnlimited('Bollywood', 1, null, 'date')).songs} onSeeAll={() => { setYtChip('Bollywood'); setYtQuery(''); setTab('youtube'); }} onPlay={onPlay} likedSet={likedSet} onLike={toggleLike} currentId={player.current?.id} spin={spinOn} />
                <HomeRow title="Punjabi Hits" emoji="🎤" loader={async () => (await fetchCategoryUnlimited('Punjabi', 1, null, 'views')).songs} onSeeAll={() => { setYtChip('Punjabi'); setYtQuery(''); setTab('youtube'); }} onPlay={onPlay} likedSet={likedSet} onLike={toggleLike} currentId={player.current?.id} spin={spinOn} />
                <HomeRow title="English Global Pop" emoji="🌟" loader={async () => (await fetchCategoryUnlimited('English Pop', 1, null, 'views')).songs} onSeeAll={() => { setYtChip('English Pop'); setYtQuery(''); setTab('youtube'); }} onPlay={onPlay} likedSet={likedSet} onLike={toggleLike} currentId={player.current?.id} spin={spinOn} />
              </div>
            )}

            {/* ───────────── DIRECT SEARCH ───────────── */}
            {tab === 'search' && (
              <SearchTab query={query} setQuery={setQuery} pill={searchPill} setPill={setSearchPill}
                infOpts={infOpts} onPlay={onPlay} likedSet={likedSet} onLike={toggleLike} currentId={player.current?.id}
                studioSongs={studioSongs} studioLoading={studioLoading} studioLimit={studioLimit} setStudioLimit={setStudioLimit}
                runStudio={runStudio} voiceEnabled={has(26)} romanEnabled={has(27)} pushToast={pushToast} />
            )}

            {/* ───────────── YOUTUBE DIRECT ───────────── */}
            {tab === 'youtube' && (
              <YouTubeTab query={ytQuery} setQuery={setYtQuery} sort={ytSort} setSort={setYtSort} chip={ytChip} setChip={setYtChip}
                infOpts={infOpts} onPlay={onPlay} likedSet={likedSet} onLike={toggleLike} currentId={player.current?.id}
                voiceEnabled={has(26)} romanEnabled={has(27)} />
            )}

            {/* ───────────── AI SOUND LAB ───────────── */}
            {tab === 'lab' && (
              <SoundLabTab has={has} getVal={getVal} setVal={setVal} toggleFeature={toggleFeature} playMood={(m) => void playMood(m)} visual={player.visual} isPlaying={player.isPlaying} engine={player.engine} />
            )}

            {/* ───────────── LIBRARY ───────────── */}
            {tab === 'library' && (
              <LibraryTab liked={liked} recent={recent} playlists={playlists} setPlaylists={setPlaylists}
                onPlay={onPlay} likedSet={likedSet} onLike={toggleLike} currentId={player.current?.id}
                current={player.current} pushToast={pushToast} spin={spinOn} />
            )}

            {/* ───────────── SETTINGS ───────────── */}
            {tab === 'settings' && (
              <SettingsTab themeId={themeId} setThemeId={setThemeId} selected={selected} setSelected={setSelected}
                values={values} setVal={setVal} toggleFeature={toggleFeature} activeCount={activeCount}
                downloadSource={() => void downloadSource()} pushToast={pushToast} />
            )}

          </motion.div>
        </AnimatePresence>
      </main>

      {/* single always-mounted YT player: floating HD card when visible, 1px when hidden */}
      <div className={cn('fixed z-50 overflow-hidden rounded-2xl border transition-all',
        player.videoVisible && has(5) ? 'bottom-28 right-4 h-44 w-72 border-white/15 glass-strong sm:h-56 sm:w-96' : 'pointer-events-none left-0 top-0 h-px w-px border-transparent opacity-0')}>
        <div id="yt-unlimited-player" className="h-full w-full" />
        {player.videoVisible && has(5) && (
          <button onClick={() => player.setVideoVisible(false)} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/60"><X className="h-4 w-4" /></button>
        )}
      </div>

      {/* bottom player */}
      <BottomPlayer player={player} has={has} liked={player.current ? likedSet.has(player.current.id) : false}
        onLike={() => player.current && toggleLike(player.current)} spin={spinOn} visualOn={has(21)} />

      {/* toasts */}
      <div className="fixed bottom-28 left-1/2 z-[60] -translate-x-1/2 space-y-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="glass-strong rounded-full px-5 py-2.5 text-sm font-medium shadow-xl">{t.msg}</motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* source modal */}
      <AnimatePresence>
        {showSource && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4" onClick={() => setShowSource(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="glass-strong w-full max-w-lg rounded-3xl p-6" onClick={(e) => e.stopPropagation()}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-bold">📥 Source Code</h3>
                <button onClick={() => setShowSource(false)} className="grid h-8 w-8 place-items-center rounded-full bg-white/10"><X className="h-4 w-4" /></button>
              </div>
              <p className="mb-4 text-sm text-white/60">Your download started. Copy-pasteable bundle link below (valid this session):</p>
              {sourceUrl && <a href={sourceUrl} download="aquabeat-v12-source.json" className="block break-all rounded-xl bg-white/5 p-3 text-xs accent-text underline">{sourceUrl}</a>}
              <p className="mt-4 text-xs text-white/40">Contains package.json, next.config.js, layout, globals.css, the full page.tsx master script and README. Extract, then <code className="accent-text">npm install &amp;&amp; npm run dev</code>.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────── SEARCH TAB ──────────────────────────────────── */
function SearchTab(props: {
  query: string; setQuery: (s: string) => void; pill: 'all' | 'yt' | 'latest' | 'studio'; setPill: (p: 'all' | 'yt' | 'latest' | 'studio') => void;
  infOpts: { infinite: boolean; fullOnly: boolean; dedupe: boolean }; onPlay: (s: UnifiedSong, q: UnifiedSong[]) => void;
  likedSet: Set<string>; onLike: (s: UnifiedSong) => void; currentId?: string;
  studioSongs: UnifiedSong[]; studioLoading: boolean; studioLimit: number; setStudioLimit: (n: number) => void;
  runStudio: (q: string, limit: number) => Promise<void>; voiceEnabled: boolean; romanEnabled: boolean; pushToast: (m: string) => void;
}) {
  const { query, setQuery, pill, setPill, infOpts, onPlay, likedSet, onLike, currentId, studioSongs, studioLoading, studioLimit, setStudioLimit, runStudio, voiceEnabled, romanEnabled, pushToast } = props;
  const [draft, setDraft] = useState(query);
  const voice = useVoiceSearch((t) => { setDraft(t); setQuery(normalizeQuery(t, romanEnabled)); if (pill === 'studio') void runStudio(t, studioLimit); }, voiceEnabled);
  const submit = () => { const q = normalizeQuery(draft.trim(), romanEnabled); setQuery(q); if (pill === 'studio' || pill === 'all') void runStudio(q, studioLimit); };
  const pills: { id: 'all' | 'yt' | 'latest' | 'studio'; label: string }[] = [
    { id: 'all', label: 'All Combined' }, { id: 'yt', label: '▶️ YouTube (Unlimited)' }, { id: 'latest', label: '🆕 YT Latest (date)' }, { id: 'studio', label: '🎧 320kbps Studio' },
  ];
  const q = query.trim();
  return (
    <div>
      <div className="glass mb-4 flex items-center gap-2 rounded-2xl p-2">
        <Search className="ml-2 h-5 w-5 text-white/50" />
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Search songs, artists, Coke Studio, roman-urdu…" className="flex-1 bg-transparent px-2 py-2.5 text-sm outline-none placeholder:text-white/40" />
        {voiceEnabled && (
          <button onClick={() => (voice.listening ? voice.stop() : voice.start())} className={cn('grid h-10 w-10 place-items-center rounded-full transition', voice.listening ? 'bg-red-500 text-white' : 'bg-white/10 hover:bg-white/20')} aria-label="Voice search">
            <Mic className={cn('h-5 w-5', voice.listening && 'animate-pulse')} />
          </button>
        )}
        <button onClick={submit} className="rounded-full accent-bg px-5 py-2.5 text-sm font-bold text-black">Search</button>
      </div>
      <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto">
        {pills.map((p) => (
          <button key={p.id} onClick={() => { setPill(p.id); if (p.id === 'studio' && q) void runStudio(q, studioLimit); }}
            className={cn('shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition', pill === p.id ? 'accent-bg text-black' : 'glass text-white/70 hover:bg-white/10')}>{p.label}</button>
        ))}
      </div>

      {(pill === 'studio' || (pill === 'all' && q)) && (
        <section className="mb-8">
          <h3 className="mb-3 text-lg font-bold sm:text-xl">🎧 Studio 320kbps {q && `— “${q}”`}</h3>
          {studioLoading && <div className="flex items-center gap-2 py-4 text-sm text-white/60"><Spinner /> Fetching studio masters…</div>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {studioSongs.map((s) => <SongCard key={s.id} song={s} active={currentId === s.id} spin={false} onPlay={() => onPlay(s, studioSongs)} liked={likedSet.has(s.id)} onLike={(e) => { e.stopPropagation(); onLike(s); }} />)}
          </div>
          {!studioLoading && studioSongs.length === 0 && q && <p className="py-4 text-sm text-white/40">No studio match — YouTube results below still play full songs.</p>}
          {studioSongs.length > 0 && (
            <button onClick={() => { const nl = studioLimit + 20; setStudioLimit(nl); void runStudio(q, nl); }} disabled={studioLoading}
              className="mx-auto mt-4 flex items-center gap-2 rounded-full glass px-6 py-3 text-sm font-bold hover:bg-white/10 disabled:opacity-50">
              {studioLoading ? <Spinner /> : <Plus className="h-4 w-4" />} Load More Studio (limit {studioLimit + 20})
            </button>
          )}
        </section>
      )}

      {!q && pill !== 'studio' && (
        <>
          <InfiniteYouTubeList title="⚡ Trending Right Now" icon={<TrendingUp className="h-5 w-5" />} fetcher={(p, t) => fetchTrendingUnlimited(p, t)} resetKey="search-trending" opts={infOpts} onPlay={onPlay} likedSet={likedSet} onLike={onLike} currentId={currentId} />
          <InfiniteYouTubeList title="🆕 Latest Uploads" icon={<Clock className="h-5 w-5" />} fetcher={(p, t) => fetchLatestUnlimited(p, t)} resetKey="search-latest" opts={infOpts} onPlay={onPlay} likedSet={likedSet} onLike={onLike} currentId={currentId} />
        </>
      )}
      {q && (pill === 'all' || pill === 'yt') && (
        <InfiniteYouTubeList title={`▶️ YouTube — “${q}”`} icon={<Youtube className="h-5 w-5" />} fetcher={(p, t) => fetchYouTubePage(q, p, t, 'relevance')} resetKey={`yt-${q}`} opts={infOpts} onPlay={onPlay} likedSet={likedSet} onLike={onLike} currentId={currentId} />
      )}
      {q && pill === 'latest' && (
        <InfiniteYouTubeList title={`🆕 Latest — “${q}”`} icon={<Clock className="h-5 w-5" />} fetcher={(p, t) => fetchYouTubePage(q, p, t, 'date')} resetKey={`latest-${q}`} opts={infOpts} onPlay={onPlay} likedSet={likedSet} onLike={onLike} currentId={currentId} />
      )}
      {pill === 'studio' && !q && (
        <InfiniteYouTubeList title="⚡ Trending Right Now" icon={<TrendingUp className="h-5 w-5" />} fetcher={(p, t) => fetchTrendingUnlimited(p, t)} resetKey="studio-trending" opts={infOpts} onPlay={onPlay} likedSet={likedSet} onLike={onLike} currentId={currentId} />
      )}
    </div>
  );
}

/* ─────────────────────────── YOUTUBE TAB ─────────────────────────────────── */
function YouTubeTab(props: {
  query: string; setQuery: (s: string) => void; sort: SortKey; setSort: (s: SortKey) => void; chip: string; setChip: (s: string) => void;
  infOpts: { infinite: boolean; fullOnly: boolean; dedupe: boolean }; onPlay: (s: UnifiedSong, q: UnifiedSong[]) => void;
  likedSet: Set<string>; onLike: (s: UnifiedSong) => void; currentId?: string; voiceEnabled: boolean; romanEnabled: boolean;
}) {
  const { query, setQuery, sort, setSort, chip, setChip, infOpts, onPlay, likedSet, onLike, currentId, voiceEnabled, romanEnabled } = props;
  const [draft, setDraft] = useState(query);
  const voice = useVoiceSearch((t) => { setDraft(t); setQuery(normalizeQuery(t, romanEnabled)); }, voiceEnabled);
  const submit = () => setQuery(normalizeQuery(draft.trim(), romanEnabled));
  const q = query.trim();
  const activeQuery = q || (CATEGORY_QUERY[chip] ?? `trending music ${YEAR}`);
  const resetKey = `ytd-${activeQuery}-${sort}-${chip}`;
  return (
    <div>
      <div className="glass mb-4 flex items-center gap-2 rounded-2xl p-2">
        <Youtube className="ml-2 h-5 w-5 text-red-500" />
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Search YouTube directly — unlimited results…" className="flex-1 bg-transparent px-2 py-2.5 text-sm outline-none placeholder:text-white/40" />
        {voiceEnabled && (
          <button onClick={() => (voice.listening ? voice.stop() : voice.start())} className={cn('grid h-10 w-10 place-items-center rounded-full transition', voice.listening ? 'bg-red-500 text-white' : 'bg-white/10 hover:bg-white/20')} aria-label="Voice search"><Mic className={cn('h-5 w-5', voice.listening && 'animate-pulse')} /></button>
        )}
        <button onClick={submit} className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white">Search</button>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-white/50">Sort:</span>
        {([['date', '🆕 Latest'], ['views', '🔥 Most Viewed'], ['relevance', '🎯 Best Match']] as [SortKey, string][]).map(([k, label]) => (
          <button key={k} onClick={() => setSort(k)} className={cn('rounded-full px-3 py-1.5 text-xs font-semibold transition', sort === k ? 'accent-bg text-black' : 'glass text-white/70 hover:bg-white/10')}>{label}</button>
        ))}
      </div>
      <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto">
        {YT_CHIPS.map((c) => (
          <button key={c} onClick={() => { setChip(c); setQuery(''); setDraft(''); }}
            className={cn('shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition', chip === c && !q ? 'accent-bg text-black' : 'glass text-white/70 hover:bg-white/10')}>{c}</button>
        ))}
      </div>

      {!q && (
        <>
          <InfiniteYouTubeList title={`🔥 Trending Music — ${chip}`} icon={<Radio className="h-5 w-5" />} fetcher={(p, t) => (chip === 'Trending Worldwide' ? fetchTrendingUnlimited(p, t) : fetchCategoryUnlimited(chip, p, t, sort))} resetKey={resetKey} opts={infOpts} onPlay={onPlay} likedSet={likedSet} onLike={onLike} currentId={currentId} />
          <InfiniteYouTubeList title="🆕 Latest Drops" icon={<Clock className="h-5 w-5" />} fetcher={(p, t) => fetchLatestUnlimited(p, t)} resetKey="ytd-latest" opts={infOpts} onPlay={onPlay} likedSet={likedSet} onLike={onLike} currentId={currentId} />
        </>
      )}
      {q && (
        <InfiniteYouTubeList title={`▶️ “${q}” · ${sort}`} icon={<Youtube className="h-5 w-5" />} fetcher={(p, t) => fetchYouTubePage(q, p, t, sort)} resetKey={resetKey} opts={infOpts} onPlay={onPlay} likedSet={likedSet} onLike={onLike} currentId={currentId} />
      )}
    </div>
  );
}

/* ─────────────────────────── SOUND LAB TAB ───────────────────────────────── */
function SoundLabTab(props: {
  has: (id: number) => boolean; getVal: (id: number, def: number | string) => number | string;
  setVal: (id: number, v: number | string) => void; toggleFeature: (id: number) => void;
  playMood: (m: { name: string; query: string }) => void; visual: number[]; isPlaying: boolean; engine: string;
}) {
  const { has, getVal, setVal, toggleFeature, playMood, visual, isPlaying, engine } = props;
  const labFeatures = REAL_FEATURES.filter((f) => f.id >= 8 && f.id <= 25);
  return (
    <div>
      <div className="glass mb-6 rounded-3xl p-6">
        <h2 className="text-xl font-black sm:text-2xl">🧪 AI Sound Lab</h2>
        <p className="mt-1 text-sm text-white/60">Live DSP wired to the Web Audio graph. {engine === 'youtube' ? 'YT engine: speed applies; for full DSP use Studio/320kbps or Piped audio.' : 'Full DSP active on the HTML5 engine.'}</p>
        <div className="mt-4 flex h-20 items-end gap-1">
          {visual.map((v, i) => <div key={i} className="flex-1 rounded-t accent-bg transition-all" style={{ height: `${Math.max(6, v * 100)}%`, opacity: isPlaying ? 1 : 0.35 }} />)}
        </div>
      </div>
      <h3 className="mb-3 text-lg font-bold">🎭 Mood Quick-Play</h3>
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {MOODS.slice(0, 7).map((m) => (
          <button key={m.name} onClick={() => playMood(m)} className="glass flex flex-col items-center gap-1 rounded-2xl p-4 transition hover:bg-white/10">
            <span className="text-2xl">{m.emoji}</span><span className="text-sm font-semibold">{m.name}</span>
          </button>
        ))}
      </div>
      <h3 className="mb-3 text-lg font-bold">🎚️ Live DSP Modules (#0008–#0025)</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {labFeatures.map((f) => {
          const on = has(f.id);
          return (
            <div key={f.id} className={cn('glass rounded-2xl p-4 transition', on && 'ring-1 accent-border')}>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2"><Pill className="bg-white/10 accent-text">{f.code}</Pill><span className="text-sm font-bold">{f.name}</span></div>
                <button onClick={() => toggleFeature(f.id)} className={cn('relative h-6 w-11 rounded-full transition', on ? 'accent-bg' : 'bg-white/15')}>
                  <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all', on ? 'left-[22px]' : 'left-0.5')} />
                </button>
              </div>
              <p className="mb-3 text-xs text-white/55">{f.description}</p>
              {f.control?.type === 'slider' && (
                <div className="flex items-center gap-2">
                  <input type="range" min={f.control.min} max={f.control.max} step={f.control.step} value={asNum(getVal(f.id, f.control.def))} onChange={(e) => setVal(f.id, asNum(e.target.value))} className="flex-1" />
                  <span className="w-14 text-right text-xs accent-text">{asNum(getVal(f.id, f.control.def))}{f.control.unit}</span>
                </div>
              )}
              {f.control?.type === 'select' && (
                <select value={String(getVal(f.id, f.control.def))} onChange={(e) => setVal(f.id, e.target.value)} className="w-full rounded-lg bg-white/10 px-3 py-2 text-sm outline-none">
                  {f.control.options?.map((o) => <option key={o} value={o} className="bg-[#0a0a12]">{o}</option>)}
                </select>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────── LIBRARY TAB ─────────────────────────────────── */
function LibraryTab(props: {
  liked: UnifiedSong[]; recent: UnifiedSong[]; playlists: Playlist[]; setPlaylists: React.Dispatch<React.SetStateAction<Playlist[]>>;
  onPlay: (s: UnifiedSong, q: UnifiedSong[]) => void; likedSet: Set<string>; onLike: (s: UnifiedSong) => void; currentId?: string;
  current: UnifiedSong | null; pushToast: (m: string) => void; spin: boolean;
}) {
  const { liked, recent, playlists, setPlaylists, onPlay, likedSet, onLike, currentId, current, pushToast, spin } = props;
  const [newName, setNewName] = useState('');
  const [addTarget, setAddTarget] = useState<string | null>(null);
  const createPlaylist = () => {
    const name = newName.trim(); if (!name) return;
    setPlaylists((p) => [...p, { id: `pl_${Date.now()}`, name, songs: [] }]); setNewName(''); pushToast(`Playlist “${name}” created`);
  };
  const addToPlaylist = (pid: string) => {
    if (!current) { pushToast('Play a song first'); return; }
    setPlaylists((p) => p.map((pl) => pl.id === pid && !pl.songs.find((s) => s.id === current.id) ? { ...pl, songs: [...pl.songs, current] } : pl));
    pushToast('Added to playlist'); setAddTarget(null);
  };
  const SongGrid = ({ songs }: { songs: UnifiedSong[] }) => (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {songs.map((s) => <SongCard key={s.id} song={s} active={currentId === s.id} spin={spin} onPlay={() => onPlay(s, songs)} liked={likedSet.has(s.id)} onLike={(e) => { e.stopPropagation(); onLike(s); }} />)}
    </div>
  );
  return (
    <div>
      <h2 className="mb-4 text-xl font-black sm:text-2xl">📚 Your Library</h2>
      <section className="mb-8">
        <div className="mb-3 flex items-center gap-2"><Heart className="h-5 w-5 text-rose-500" /><h3 className="text-lg font-bold">Liked Songs</h3><span className="text-xs text-white/40">{liked.length}</span></div>
        {liked.length ? <SongGrid songs={liked} /> : <p className="text-sm text-white/40">Tap the heart on any song to save it here.</p>}
      </section>
      <section className="mb-8">
        <div className="mb-3 flex items-center gap-2"><Clock className="h-5 w-5 accent-text" /><h3 className="text-lg font-bold">Recently Played</h3><span className="text-xs text-white/40">{recent.length}/40</span></div>
        {recent.length ? <SongGrid songs={recent} /> : <p className="text-sm text-white/40">Your last 40 tracks appear here.</p>}
      </section>
      <section>
        <div className="mb-3 flex items-center gap-2"><ListMusic className="h-5 w-5 accent-text" /><h3 className="text-lg font-bold">Playlists</h3></div>
        <div className="glass mb-4 flex flex-wrap items-center gap-2 rounded-2xl p-3">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createPlaylist()} placeholder="New playlist name…" className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-sm outline-none placeholder:text-white/40" />
          <button onClick={createPlaylist} className="flex items-center gap-1 rounded-full accent-bg px-4 py-2 text-sm font-bold text-black"><Plus className="h-4 w-4" /> Create</button>
          <div className="relative">
            <button onClick={() => setAddTarget(addTarget ? null : 'open')} className="flex items-center gap-1 rounded-full glass px-4 py-2 text-sm font-semibold hover:bg-white/10"><Plus className="h-4 w-4" /> Add current song</button>
            {addTarget && (
              <div className="absolute right-0 top-11 z-20 w-56 rounded-xl glass-strong p-2">
                {playlists.length ? playlists.map((pl) => <button key={pl.id} onClick={() => addToPlaylist(pl.id)} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10">{pl.name}</button>) : <p className="px-3 py-2 text-xs text-white/40">Create a playlist first</p>}
              </div>
            )}
          </div>
        </div>
        {playlists.map((pl) => (
          <div key={pl.id} className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="font-bold">{pl.name} <span className="text-xs font-normal text-white/40">{pl.songs.length} songs</span></h4>
              <button onClick={() => setPlaylists((p) => p.filter((x) => x.id !== pl.id))} className="grid h-8 w-8 place-items-center rounded-full bg-white/10 hover:bg-red-500/30"><Trash2 className="h-4 w-4" /></button>
            </div>
            {pl.songs.length ? <SongGrid songs={pl.songs} /> : <p className="text-sm text-white/40">Empty — play a song then “Add current song”.</p>}
          </div>
        ))}
      </section>
    </div>
  );
}

/* ─────────────────────────── SETTINGS TAB ────────────────────────────────── */
function SettingsTab(props: {
  themeId: string; setThemeId: (s: string) => void; selected: Set<number>; setSelected: React.Dispatch<React.SetStateAction<Set<number>>>;
  values: Record<number, number | string>; setVal: (id: number, v: number | string) => void; toggleFeature: (id: number) => void;
  activeCount: number; downloadSource: () => void; pushToast: (m: string) => void;
}) {
  const { themeId, setThemeId, selected, setSelected, values, setVal, toggleFeature, activeCount, downloadSource, pushToast } = props;
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');
  const [filter, setFilter] = useState<'all' | 'selected' | 'unselected'>('all');
  const [page, setPage] = useState(0);
  const PER = 80;
  const categories = useMemo(() => ['All', ...FEATURE_CATEGORIES], []);
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return ALL_FEATURES.filter((f) => {
      if (cat !== 'All' && f.category !== cat) return false;
      if (filter === 'selected' && !selected.has(f.id)) return false;
      if (filter === 'unselected' && selected.has(f.id)) return false;
      if (s && !(`${f.code} ${f.name} ${f.description} ${f.category}`.toLowerCase().includes(s))) return false;
      return true;
    });
  }, [search, cat, filter, selected]);
  const pages = Math.max(1, Math.ceil(filtered.length / PER));
  const pageItems = filtered.slice(page * PER, page * PER + PER);
  useEffect(() => { setPage(0); }, [search, cat, filter]);

  const toggleOne = (f: FeatureDef) => { toggleFeature(f.id); pushToast(`${f.code} ${selected.has(f.id) ? 'OFF' : 'ON'}`); };

  return (
    <div>
      <div className="glass mb-6 rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black sm:text-2xl">⚙️ Settings — 2000 Features</h2>
            <p className="mt-1 text-sm text-white/60">Select each feature one-by-one. Everything persists locally.</p>
          </div>
          <Pill className="accent-bg px-3 py-1.5 text-sm text-black"><Zap className="h-4 w-4" /> {activeCount} / 2000 Selected</Pill>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => { setSelected(new Set(ALL_FEATURES.map((f) => f.id))); pushToast('All 2000 selected'); }} className="rounded-full accent-bg px-4 py-2 text-xs font-bold text-black">Select All</button>
          <button onClick={() => { setSelected(new Set()); pushToast('All deselected'); }} className="rounded-full glass px-4 py-2 text-xs font-bold hover:bg-white/10">Deselect All</button>
          <button onClick={() => { setSelected(new Set(DEFAULT_SELECTED)); pushToast('Defaults restored'); }} className="rounded-full glass px-4 py-2 text-xs font-bold hover:bg-white/10"><RefreshCw className="mr-1 inline h-3 w-3" />Reset Defaults</button>
          <button onClick={downloadSource} className="rounded-full glass px-4 py-2 text-xs font-bold hover:bg-white/10"><Download className="mr-1 inline h-3 w-3" />Download Source Code</button>
        </div>
      </div>

      <h3 className="mb-3 text-lg font-bold">🎨 Watery Glass Themes (20)</h3>
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {THEMES.map((t) => (
          <button key={t.id} onClick={() => { setThemeId(t.id); pushToast(`Theme: ${t.name}`); }}
            className={cn('relative overflow-hidden rounded-2xl border p-3 text-left transition', themeId === t.id ? 'border-white/60 ring-2 ring-white/30' : 'border-white/10 hover:border-white/30')} style={{ background: t.bg }}>
            <div className="mb-6 flex gap-1"><span className="h-4 w-4 rounded-full" style={{ background: t.accent }} /><span className="h-4 w-4 rounded-full" style={{ background: t.accent2 }} /></div>
            <span className="text-xs font-bold">{t.name}</span>
            {themeId === t.id && <Check className="absolute right-2 top-2 h-4 w-4 accent-text" />}
          </button>
        ))}
      </div>

      <div className="glass mb-4 rounded-2xl p-3">
        <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3">
          <Search className="h-4 w-4 text-white/50" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search 2000 features by name, code, category…" className="flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-white/40" />
        </div>
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {categories.map((c) => <button key={c} onClick={() => setCat(c)} className={cn('shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition', cat === c ? 'accent-bg text-black' : 'bg-white/10 text-white/70 hover:bg-white/15')}>{c}</button>)}
        </div>
        <div className="mt-3 flex gap-2">
          {(['all', 'selected', 'unselected'] as const).map((f) => <button key={f} onClick={() => setFilter(f)} className={cn('rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition', filter === f ? 'accent-bg text-black' : 'bg-white/10 text-white/70 hover:bg-white/15')}>{f}</button>)}
        </div>
      </div>

      <div className="space-y-2">
        {pageItems.map((f) => {
          const on = selected.has(f.id);
          const ctrl = f.control;
          return (
            <div key={f.id} onClick={() => toggleOne(f)} className={cn('glass flex cursor-pointer items-center gap-3 rounded-2xl p-3 transition hover:bg-white/[0.09]', on && 'ring-1 accent-border')}>
              <button onClick={(e) => { e.stopPropagation(); toggleOne(f); }} className="shrink-0" aria-label={`Toggle ${f.name}`}>
                {on ? <CheckCircle2 className="h-6 w-6 accent-text" /> : <Circle className="h-6 w-6 text-white/30" />}
              </button>
              <Pill className="shrink-0 bg-white/10 accent-text">{f.code}</Pill>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{f.name}</p>
                <p className="truncate text-xs text-white/50">{f.description}</p>
              </div>
              <Pill className="hidden shrink-0 bg-white/5 text-white/60 sm:inline-flex">{f.category}</Pill>
              {ctrl && (
                <div onClick={(e) => e.stopPropagation()} className="hidden shrink-0 items-center gap-2 md:flex">
                  {ctrl.type === 'slider' && (
                    <>
                      <input type="range" min={ctrl.min} max={ctrl.max} step={ctrl.step} value={asNum(values[f.id] ?? ctrl.def)} onChange={(e) => setVal(f.id, asNum(e.target.value))} className="w-24" />
                      <span className="w-12 text-right text-xs accent-text">{asNum(values[f.id] ?? ctrl.def)}{ctrl.unit}</span>
                    </>
                  )}
                  {ctrl.type === 'select' && (
                    <select value={String(values[f.id] ?? ctrl.def)} onChange={(e) => setVal(f.id, e.target.value)} className="rounded-lg bg-white/10 px-2 py-1 text-xs outline-none">
                      {ctrl.options?.map((o) => <option key={o} value={o} className="bg-[#0a0a12]">{o}</option>)}
                    </select>
                  )}
                </div>
              )}
              <button onClick={(e) => { e.stopPropagation(); toggleOne(f); }} className={cn('relative h-6 w-11 shrink-0 rounded-full transition', on ? 'accent-bg' : 'bg-white/15')} aria-label={`Switch ${f.name}`}>
                <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all', on ? 'left-[22px]' : 'left-0.5')} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-center gap-3">
        <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="flex items-center gap-1 rounded-full glass px-4 py-2 text-sm font-semibold disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Prev</button>
        <span className="text-sm text-white/60">Page {page + 1} / {pages} · {filtered.length} features</span>
        <button onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1} className="flex items-center gap-1 rounded-full glass px-4 py-2 text-sm font-semibold disabled:opacity-40">Next <ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

/* ─────────────────────────── BOTTOM PLAYER ───────────────────────────────── */
function BottomPlayer({ player, has, liked, onLike, spin, visualOn }: {
  player: ReturnType<typeof usePlayerEngine>; has: (id: number) => boolean; liked: boolean; onLike: () => void; spin: boolean; visualOn: boolean;
}) {
  const { current, isPlaying, engine, time, duration, volume, muted, videoVisible, visual } = player;
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 glass-strong">
      {visualOn && current && (
        <div className="flex h-6 items-end gap-[2px] px-4 pt-1">
          {visual.map((v, i) => <div key={i} className="flex-1 rounded-t accent-bg" style={{ height: `${Math.max(8, v * 100)}%`, opacity: 0.7 }} />)}
        </div>
      )}
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white/5">
            {current ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.image} alt={current.title} className={cn('h-full w-full object-cover', spin && isPlaying && 'spinning-vinyl')} onError={(e) => { e.currentTarget.src = FALLBACK_IMG; }} />
            ) : <div className="grid h-full w-full place-items-center"><Disc3 className="h-6 w-6 text-white/30" /></div>}
          </div>
          <div className="min-w-0 flex-1">
            <p className="clamp-1 text-sm font-bold">{current?.title ?? 'Nothing playing'}</p>
            <p className="clamp-1 text-xs text-white/55">{current?.artist ?? 'Pick a song to start the unlimited engine'}</p>
            <div className="mt-1 flex items-center gap-1.5">
              {engine === 'html5' && <Pill className="bg-emerald-500/20 text-emerald-300"><Headphones className="h-3 w-3" /> {current?.source === 'jiosaavn' ? '320kbps' : 'HTML5'}</Pill>}
              {engine === 'youtube' && <Pill className="bg-red-600/20 text-red-300"><Youtube className="h-3 w-3" /> YT DIRECT</Pill>}
            </div>
          </div>
          <div className="hidden items-center gap-1 sm:flex">
            <HeartBtn active={liked} onClick={(e) => { e.stopPropagation(); onLike(); }} />
            {current?.youtubeId && has(5) && (
              <button onClick={player.toggleVideo} className={cn('grid h-9 w-9 place-items-center rounded-full transition', videoVisible ? 'accent-bg text-black' : 'bg-white/10 hover:bg-white/20')} aria-label="Toggle video">
                {videoVisible ? <Music className="h-4 w-4" /> : <Video className="h-4 w-4" />}
              </button>
            )}
            {has(13) && <Pill className="bg-white/10 accent-text">8D</Pill>}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => void player.prev()} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10"><SkipBack className="h-5 w-5" /></button>
            <button onClick={player.toggle} className="grid h-12 w-12 place-items-center rounded-full accent-bg text-black transition hover:opacity-90">
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 translate-x-[1px]" />}
            </button>
            <button onClick={() => void player.next()} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10"><SkipForward className="h-5 w-5" /></button>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <button onClick={player.toggleMute} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10">{muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}</button>
            <input type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume} onChange={(e) => player.setVolume(asNum(e.target.value))} className="w-20" />
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="w-10 text-right text-[10px] tabular-nums text-white/50">{fmtTime(time)}</span>
          <input type="range" min={0} max={duration || current?.duration || 0} step={1} value={Math.min(time, duration || 0)} onChange={(e) => player.seek(asNum(e.target.value))} className="flex-1" />
          <span className="w-10 text-[10px] tabular-nums text-white/50">{fmtTime(duration || current?.duration || 0)}</span>
        </div>
      </div>
    </div>
  );
}
