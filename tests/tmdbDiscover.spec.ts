import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import { TMDBDiscoverPage, TMDBHomePage, TMDBLoginPage } from '../pages/tmdbPages';
import { getDiscoveredMovies, getGenreId, getKeywordId } from '../utils/tmdbApi';
import { verifyScrapedAgainstBackend } from '../utils/backendVerifier';

dotenv.config();

const scenarios = [
    {
        name: "Action_Alien_2020_to_2023",
        genre: "Action",
        keyword: "alien",
        start_date: "2020-01-01",
        end_date: "2023-12-31"
    },
    {
        name: "Romance_Love_No_Dates",
        genre: "Romance",
        keyword: "love",
        start_date: null,
        end_date: null
    }
];

test.describe('TMDB Discover Filters Verification', () => {
    test.setTimeout(120000); // give enough time for UI actions

    for (const scenario of scenarios) {
        test(`Verify ${scenario.name}`, async ({ page }) => {
            console.log(`\n--- Running Scenario: ${scenario.name} ---`);
            const isMockMode = false;

            const apiFilters: Record<string, string> = {
                with_genres: await getGenreId(scenario.genre),
                with_keywords: await getKeywordId(scenario.keyword)
            };
            if (scenario.start_date) apiFilters["release_date.gte"] = scenario.start_date;
            if (scenario.end_date) apiFilters["release_date.lte"] = scenario.end_date;

            const [backendTitles, isMock] = await getDiscoveredMovies(apiFilters, isMockMode);
            console.log(`[API] Successfully retrieved ${backendTitles.length} discovered movies.`);

            const discoverPage = new TMDBDiscoverPage(page);
            await discoverPage.load();
            await discoverPage.acceptCookies();

            await discoverPage.selectShowMe("Everything");
            await discoverPage.selectGenre(scenario.genre);
            await discoverPage.addKeyword(scenario.keyword);

            if (scenario.start_date && scenario.end_date) {
                await discoverPage.setReleaseDates(scenario.start_date, scenario.end_date);
            }

            await discoverPage.applyFilters();

            const scrapedTitles = await discoverPage.getMovieTitles();
            console.log(`[UI] Successfully scraped ${scrapedTitles.length} movie titles.`);
            expect(scrapedTitles.length).toBeGreaterThan(0);

            const matchCount = verifyScrapedAgainstBackend(scrapedTitles, backendTitles, isMock, 0.85);
            if (!isMockMode) expect(matchCount).toBeGreaterThan(0);
        });
    }
});
