import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import { TMDBDiscoverPage, TMDBHomePage, TMDBLoginPage } from '../pages/tmdbPages';
import { getDiscoveredMovies, buildApiFilters } from '../utils/tmdbApi';
import { verifyScrapedAgainstBackend } from '../utils/backendVerifier';
import fs from 'fs';

dotenv.config();

function loadGenres(): string[] {
    try {
        const data = JSON.parse(fs.readFileSync('utils/genres.json', 'utf-8'));
        return Object.keys(data).map(k => k.charAt(0).toUpperCase() + k.slice(1));
    } catch {
        return ["Action", "Comedy", "Drama", "Horror", "Romance"];
    }
}

function generateRandomScenarios(numScenarios = 5) {
    const scenarios = [];
    const genres = loadGenres();
    const languages = ["en", "fr", "es", "de", "it", "ja"];
    const availabilitiesOptions = [
        ["flatrate"], ["rent"], ["buy"], ["flatrate", "rent"], null
    ];

    for (let i = 0; i < numScenarios; i++) {
        const minScore = Math.floor(Math.random() * 8);
        const maxScore = Math.floor(Math.random() * (10 - minScore) + minScore + 1);
        const minRuntime = Math.floor(Math.random() * 61) + 30; // 30-90
        const maxRuntime = Math.floor(Math.random() * 101) + 100; // 100-200

        scenarios.push({
            name: `Random_Scenario_${i + 1}`,
            genre: Math.random() > 0.2 ? genres[Math.floor(Math.random() * genres.length)] : null,
            keyword: null, // Avoid niche keywords to ensure we get results
            start_date: null,
            end_date: null,
            certifications: null,
            min_score: minScore,
            max_score: maxScore,
            min_votes: Math.floor(Math.random() * 51),
            language: Math.random() > 0.2 ? languages[Math.floor(Math.random() * languages.length)] : null,
            min_runtime: minRuntime,
            max_runtime: maxRuntime,
            availabilities: availabilitiesOptions[Math.floor(Math.random() * availabilitiesOptions.length)],
            show_me: "Everything"
        });
    }
    return scenarios;
}

const RANDOM_SCENARIOS = generateRandomScenarios(5);

test.describe('TMDB Discover Random Verification', () => {
    test.setTimeout(120000); // 2 min per test

    for (const scenario of RANDOM_SCENARIOS) {
        test(`Verify ${scenario.name}`, async ({ page }) => {
            console.log(`\n--- Running Random Scenario: ${scenario.name} ---`);
            const isMockMode = false;

            const apiFilters = await buildApiFilters(scenario);
            const [backendTitles, isMock] = await getDiscoveredMovies(apiFilters, isMockMode);
            console.log(`[API] Successfully retrieved ${backendTitles.length} discovered movies.`);

            const discoverPage = new TMDBDiscoverPage(page);
            await discoverPage.load();
            await discoverPage.acceptCookies();

            if (scenario.show_me) await discoverPage.selectShowMe(scenario.show_me);
            if (scenario.genre) await discoverPage.selectGenre(scenario.genre);
            if (scenario.start_date && scenario.end_date) await discoverPage.setReleaseDates(scenario.start_date, scenario.end_date);
            if (scenario.certifications) await discoverPage.setCertifications(scenario.certifications);
            if (scenario.min_score !== null && scenario.max_score !== null) await discoverPage.setUserScoreRange(scenario.min_score, scenario.max_score);
            if (scenario.min_votes !== null) await discoverPage.setMinimumUserVotes(scenario.min_votes);
            if (scenario.language) await discoverPage.selectLanguage(scenario.language);
            if (scenario.min_runtime !== null && scenario.max_runtime !== null) await discoverPage.setRuntimeRange(scenario.min_runtime, scenario.max_runtime);
            if (scenario.availabilities) await discoverPage.setAvailabilities(scenario.availabilities);

            await discoverPage.applyFilters();

            const scrapedTitles = await discoverPage.getMovieTitles();
            console.log(`[UI] Successfully scraped ${scrapedTitles.length} movie titles.`);

            const matchCount = verifyScrapedAgainstBackend(scrapedTitles, backendTitles, isMock, 0.85);
            if (backendTitles.length > 0 && !isMockMode) {
                expect(matchCount).toBeGreaterThan(0);
            }
        });
    }
});
