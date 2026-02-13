// PandaScore Esports API Service
// Rate limit: 900 requests/hour — using 60s cache to stay well under

const PANDASCORE_TOKEN = 'QlP9wl3Oh5Zl97LiUyFy7HSQ1L4NIZ0McJMYoXf904QIJGoE0bk';
const BASE_URL = 'https://api.pandascore.co';

// PandaScore API doesn't send CORS headers, so browser requests from
// deployed sites get blocked. Use a CORS proxy in production.
const isLocalhost = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const CACHE_TTL = 60_000; // 60 seconds

// ── Types ────────────────────────────────────────────────────────

export interface PandaTeam {
    id: number;
    name: string;
    acronym: string | null;
    slug: string;
    location: string;
    image_url: string | null;
    dark_mode_image_url: string | null;
}

export interface PandaOpponent {
    type: string;
    opponent: PandaTeam;
}

export interface PandaGame {
    id: number;
    position: number;
    status: 'not_started' | 'running' | 'finished';
    length: number | null;
    finished: boolean;
    winner: { id: number | null; type: string };
    begin_at: string | null;
    end_at: string | null;
}

export interface PandaStream {
    main: boolean;
    language: string;
    embed_url: string | null;
    official: boolean;
    raw_url: string;
}

export interface PandaLeague {
    id: number;
    name: string;
    slug: string;
    image_url: string | null;
}

export interface PandaTournament {
    id: number;
    name: string;
    tier: string;
}

export interface PandaSerie {
    id: number;
    name: string;
    full_name: string;
    year: number;
}

export interface PandaVideogame {
    id: number;
    name: string;
    slug: string;
}

export interface PandaMatch {
    id: number;
    name: string;
    slug: string;
    status: 'not_started' | 'running' | 'finished' | 'canceled' | 'postponed';
    match_type: string;
    number_of_games: number;
    scheduled_at: string;
    begin_at: string | null;
    end_at: string | null;
    results: { score: number; team_id: number }[];
    opponents: PandaOpponent[];
    games: PandaGame[];
    streams_list: PandaStream[];
    league: PandaLeague;
    league_id: number;
    serie: PandaSerie;
    tournament: PandaTournament;
    videogame: PandaVideogame;
    winner: PandaTeam | null;
    winner_id: number | null;
    draw: boolean;
    forfeit: boolean;
    live: {
        supported: boolean;
        url: string | null;
        opens_at: string | null;
    };
}

// ── Game Slugs ───────────────────────────────────────────────────

export const GAME_FILTERS = [
    { slug: 'all', label: 'All Games', icon: '🎮' },
    { slug: 'league-of-legends', label: 'League of Legends', icon: '⚔️' },
    { slug: 'cs-go', label: 'Counter-Strike 2', icon: '🔫' },
    { slug: 'dota-2', label: 'Dota 2', icon: '🛡️' },
    { slug: 'valorant', label: 'Valorant', icon: '🎯' },
    { slug: 'rl', label: 'Rocket League', icon: '🚗' },
    { slug: 'overwatch', label: 'Overwatch', icon: '🦸' },
    { slug: 'r6-siege', label: 'Rainbow Six', icon: '🏰' },
] as const;

export type GameSlug = typeof GAME_FILTERS[number]['slug'];

// ── Cache ────────────────────────────────────────────────────────

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();

function getCached<T>(key: string): T | null {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL) {
        cache.delete(key);
        return null;
    }
    return entry.data;
}

function setCache<T>(key: string, data: T): void {
    cache.set(key, { data, timestamp: Date.now() });
}

// ── API Client ───────────────────────────────────────────────────

async function fetchPandaScore<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const cacheKey = `${endpoint}?${JSON.stringify(params)}`;
    const cached = getCached<T>(cacheKey);
    if (cached) return cached;

    const searchParams = new URLSearchParams({
        token: PANDASCORE_TOKEN,
        ...params,
    });

    // Build the full PandaScore URL first
    const pandaUrl = `${BASE_URL}${endpoint}?${searchParams}`;
    // In production, wrap with CORS proxy since PandaScore doesn't send CORS headers
    const url = isLocalhost ? pandaUrl : `https://corsproxy.io/?url=${encodeURIComponent(pandaUrl)}`;

    const response = await fetch(url);

    if (!response.ok) {
        if (response.status === 429) {
            console.warn('⚠️ PandaScore rate limit hit! Waiting...');
            throw new Error('Rate limit exceeded. Please try again in a moment.');
        }
        throw new Error(`PandaScore API error: ${response.status}`);
    }

    const data = await response.json();
    setCache(cacheKey, data);
    return data;
}

// ── Public API ───────────────────────────────────────────────────

/**
 * Fetch currently live/running matches
 */
export async function fetchRunningMatches(gameSlug?: string): Promise<PandaMatch[]> {
    const endpoint = gameSlug && gameSlug !== 'all'
        ? `/${gameSlug}/matches/running`
        : '/matches/running';

    return fetchPandaScore<PandaMatch[]>(endpoint, {
        per_page: '15',
        sort: '-scheduled_at',
    });
}

/**
 * Fetch upcoming matches (next 24 hours)
 */
export async function fetchUpcomingMatches(gameSlug?: string): Promise<PandaMatch[]> {
    const endpoint = gameSlug && gameSlug !== 'all'
        ? `/${gameSlug}/matches/upcoming`
        : '/matches/upcoming';

    return fetchPandaScore<PandaMatch[]>(endpoint, {
        per_page: '10',
        sort: 'scheduled_at',
    });
}

/**
 * Fetch recently finished matches
 */
export async function fetchPastMatches(gameSlug?: string): Promise<PandaMatch[]> {
    const endpoint = gameSlug && gameSlug !== 'all'
        ? `/${gameSlug}/matches/past`
        : '/matches/past';

    return fetchPandaScore<PandaMatch[]>(endpoint, {
        per_page: '5',
        sort: '-end_at',
    });
}

// ── Helper Functions ─────────────────────────────────────────────

/**
 * Get the best stream URL for a match (prefer English, official, YouTube/Twitch)
 */
export function getBestStream(match: PandaMatch): PandaStream | null {
    const streams = match.streams_list;
    if (!streams || streams.length === 0) return null;

    // Prefer English official stream
    const enOfficial = streams.find(s => s.language === 'en' && s.official && s.embed_url);
    if (enOfficial) return enOfficial;

    // Prefer English stream
    const en = streams.find(s => s.language === 'en' && s.embed_url);
    if (en) return en;

    // Prefer official main stream
    const mainOfficial = streams.find(s => s.main && s.official);
    if (mainOfficial) return mainOfficial;

    // Any stream with embed URL
    const withEmbed = streams.find(s => s.embed_url);
    if (withEmbed) return withEmbed;

    // Fallback to first stream
    return streams[0];
}

/**
 * Get score for a team in a match
 */
export function getTeamScore(match: PandaMatch, teamId: number): number {
    return match.results?.find(r => r.team_id === teamId)?.score ?? 0;
}

/**
 * Get the game/videogame display name
 */
export function getGameDisplayName(slug: string): string {
    const map: Record<string, string> = {
        'league-of-legends': 'LoL',
        'cs-go': 'CS2',
        'dota-2': 'Dota 2',
        'valorant': 'Valorant',
        'rl': 'Rocket League',
        'overwatch': 'Overwatch',
        'r6siege': 'R6 Siege',
        'kog': 'King of Glory',
        'pubg': 'PUBG',
        'starcraft-2': 'SC2',
        'lol-wild-rift': 'Wild Rift',
        'mlbb': 'MLBB',
        'ea-sports-fc': 'EA FC',
        'cod-mw': 'CoD',
    };
    return map[slug] || slug;
}

/**
 * Get game badge color for each esport
 */
export function getGameColor(slug: string): string {
    const map: Record<string, string> = {
        'league-of-legends': '#C89B3C',
        'cs-go': '#F5A623',
        'dota-2': '#E74C3C',
        'valorant': '#FF4655',
        'rl': '#0078F2',
        'overwatch': '#F99E1A',
        'r6siege': '#4A5568',
        'kog': '#FF6B35',
    };
    return map[slug] || '#8B5CF6';
}

/**
 * Format match series info (e.g. "Bo5 - Game 3")
 */
export function getSeriesInfo(match: PandaMatch): string {
    const total = match.number_of_games;
    const finished = match.games?.filter(g => g.finished).length ?? 0;
    const running = match.games?.find(g => g.status === 'running');

    if (match.status === 'running') {
        const currentGame = running?.position ?? finished + 1;
        return `Bo${total} • Game ${currentGame}`;
    }

    return `Best of ${total}`;
}
