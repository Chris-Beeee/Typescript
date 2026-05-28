import fs from 'fs';
import path from 'path';

const MOCK_MOVIES = [
    "The Matrix",
    "Inception",
    "Interstellar",
    "The Dark Knight",
    "Pulp Fiction"
];

export async function getNowPlayingMovies(isMock = false): Promise<[string[], boolean]> {
    if (isMock) return [MOCK_MOVIES, true];
    
    const token = process.env.TMDB_API_READ_ACCESS_TOKEN;
    if (!token) return [MOCK_MOVIES, true];

    const url = "https://api.themoviedb.org/3/movie/now_playing?language=en-US&page=1&region=GB";
    const response = await fetch(url, {
        headers: {
            "accept": "application/json",
            "Authorization": `Bearer ${token}`
        }
    });

    if (!response.ok) throw new Error(`API error: ${response.status} ${response.statusText}`);
    const data = await response.json();
    return [data.results.map((m: any) => m.title), false];
}

export async function getMoviesFromApi(endpoint: string, isMock = false): Promise<[string[], boolean]> {
    if (isMock) return [MOCK_MOVIES, true];
    
    const token = process.env.TMDB_API_READ_ACCESS_TOKEN;
    if (!token) return [MOCK_MOVIES, true];

    const url = `https://api.themoviedb.org/3/movie/${endpoint}?language=en-US&page=1&region=GB`;
    const response = await fetch(url, {
        headers: {
            "accept": "application/json",
            "Authorization": `Bearer ${token}`
        }
    });

    if (!response.ok) throw new Error(`API error: ${response.status} ${response.statusText}`);
    const data = await response.json();
    return [data.results.map((m: any) => m.title), false];
}

export async function getDiscoveredMovies(filters: Record<string, any>, isMock = false): Promise<[string[], boolean]> {
    if (isMock) return [MOCK_MOVIES, true];
    
    const token = process.env.TMDB_API_READ_ACCESS_TOKEN;
    if (!token) return [MOCK_MOVIES, true];

    const params = new URLSearchParams({ language: "en-US", page: "1", region: "GB" });
    for (const [k, v] of Object.entries(filters)) {
        if (v !== undefined && v !== null) {
            params.append(k, v.toString());
        }
    }

    const url = `https://api.themoviedb.org/3/discover/movie?${params.toString()}`;
    const response = await fetch(url, {
        headers: {
            "accept": "application/json",
            "Authorization": `Bearer ${token}`
        }
    });

    if (!response.ok) throw new Error(`API error: ${response.status} ${response.statusText}`);
    const data = await response.json();
    return [data.results.map((m: any) => m.title), false];
}

let _GENRE_CACHE: Record<string, number> | null = null;

export async function getGenreId(genreName: string): Promise<string> {
    const genreLower = genreName.toLowerCase();
    
    if (_GENRE_CACHE) {
        return _GENRE_CACHE[genreLower]?.toString() || "";
    }

    const cacheFile = path.join(__dirname, "genres.json");
    if (fs.existsSync(cacheFile)) {
        _GENRE_CACHE = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
        if (_GENRE_CACHE![genreLower]) return _GENRE_CACHE![genreLower].toString();
    }

    const token = process.env.TMDB_API_READ_ACCESS_TOKEN;
    if (!token) {
        _GENRE_CACHE = { "action": 28, "romance": 10749 };
        return _GENRE_CACHE[genreLower]?.toString() || "";
    }

    const response = await fetch("https://api.themoviedb.org/3/genre/movie/list", {
        headers: {
            "accept": "application/json",
            "Authorization": `Bearer ${token}`
        }
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    
    _GENRE_CACHE = {};
    for (const g of data.genres) {
        _GENRE_CACHE[g.name.toLowerCase()] = g.id;
    }

    fs.writeFileSync(cacheFile, JSON.stringify(_GENRE_CACHE, null, 4));
    return _GENRE_CACHE[genreLower]?.toString() || "";
}

let _KEYWORD_CACHE: Record<string, number> | null = null;

export async function getKeywordId(keywordName: string): Promise<string> {
    const keywordLower = keywordName.toLowerCase();
    
    if (_KEYWORD_CACHE && _KEYWORD_CACHE[keywordLower]) {
        return _KEYWORD_CACHE[keywordLower].toString();
    }

    const cacheFile = path.join(__dirname, "keywords.json");
    if (fs.existsSync(cacheFile) && !_KEYWORD_CACHE) {
        _KEYWORD_CACHE = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
    }

    if (_KEYWORD_CACHE && _KEYWORD_CACHE[keywordLower]) {
        return _KEYWORD_CACHE[keywordLower].toString();
    }

    const token = process.env.TMDB_API_READ_ACCESS_TOKEN;
    if (!token) {
        _KEYWORD_CACHE = { "alien": 9951 };
        return _KEYWORD_CACHE[keywordLower]?.toString() || "";
    }

    const params = new URLSearchParams({ query: keywordName, page: "1" });
    const response = await fetch(`https://api.themoviedb.org/3/search/keyword?${params.toString()}`, {
        headers: {
            "accept": "application/json",
            "Authorization": `Bearer ${token}`
        }
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    const results = data.results;

    let keywordId = null;
    for (const res of results) {
        if (res.name.toLowerCase() === keywordLower) {
            keywordId = res.id;
            break;
        }
    }
    if (!keywordId && results.length > 0) {
        keywordId = results[0].id;
    }

    if (keywordId) {
        if (!_KEYWORD_CACHE) _KEYWORD_CACHE = {};
        _KEYWORD_CACHE[keywordLower] = keywordId;
        fs.writeFileSync(cacheFile, JSON.stringify(_KEYWORD_CACHE, null, 4));
        return keywordId.toString();
    }
    return "";
}

export async function buildApiFilters(scenario: Record<string, any>): Promise<Record<string, string>> {
    const apiParams: Record<string, string> = {};

    if (scenario.genre) {
        const id = await getGenreId(scenario.genre);
        if (id) apiParams["with_genres"] = id;
    }

    if (scenario.keyword) {
        const id = await getKeywordId(scenario.keyword);
        if (id) apiParams["with_keywords"] = id;
    }

    if (scenario.start_date) apiParams["release_date.gte"] = scenario.start_date;
    if (scenario.end_date) apiParams["release_date.lte"] = scenario.end_date;

    if (scenario.certifications && scenario.certifications.length > 0) {
        apiParams["certification"] = scenario.certifications.join("|");
        apiParams["certification_country"] = "GB";
    }

    if (scenario.min_score !== null && scenario.min_score !== undefined) apiParams["vote_average.gte"] = scenario.min_score.toString();
    if (scenario.max_score !== null && scenario.max_score !== undefined) apiParams["vote_average.lte"] = scenario.max_score.toString();
    if (scenario.min_votes !== null && scenario.min_votes !== undefined) apiParams["vote_count.gte"] = scenario.min_votes.toString();

    if (scenario.language) apiParams["with_original_language"] = scenario.language;

    if (scenario.min_runtime !== null && scenario.min_runtime !== undefined) apiParams["with_runtime.gte"] = scenario.min_runtime.toString();
    if (scenario.max_runtime !== null && scenario.max_runtime !== undefined) apiParams["with_runtime.lte"] = scenario.max_runtime.toString();

    if (scenario.availabilities && scenario.availabilities.length > 0) {
        apiParams["with_watch_monetization_types"] = scenario.availabilities.join("|");
        apiParams["watch_region"] = "GB";
    }

    return apiParams;
}
