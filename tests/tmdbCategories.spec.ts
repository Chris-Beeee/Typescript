import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import { TMDBGenericMoviesPage, TMDBHomePage, TMDBLoginPage } from '../pages/tmdbPages';
import { getMoviesFromApi } from '../utils/tmdbApi';
import { verifyScrapedAgainstBackend } from '../utils/backendVerifier';

dotenv.config();

const categories = [
    { name: "Now Playing", url: "https://www.themoviedb.org/movie/now-playing", endpoint: "now_playing" },
    { name: "Popular", url: "https://www.themoviedb.org/movie", endpoint: "popular" },
    { name: "Upcoming", url: "https://www.themoviedb.org/movie/upcoming", endpoint: "upcoming" },
    { name: "Top Rated", url: "https://www.themoviedb.org/movie/top-rated", endpoint: "top_rated" }
];

test.describe('TMDB Categories Verification', () => {
    test.setTimeout(120000); // 2 minutes timeout for slow pages

    for (const category of categories) {
        test(`Verify ${category.name}`, async ({ page }) => {
            const isMockMode = false;

            const [backendTitles, isMock] = await getMoviesFromApi(category.endpoint, isMockMode);
            console.log(`[${isMock ? 'MOCK' : 'API'}] Successfully retrieved ${backendTitles.length} '${category.name}' movies.`);

            const moviesPage = new TMDBGenericMoviesPage(page, category.url);
            await moviesPage.load();
            await moviesPage.acceptCookies();

            const scrapedTitles = await moviesPage.getMovieTitles();
            console.log(`[UI] Successfully scraped ${scrapedTitles.length} '${category.name}' movie titles.`);
            expect(scrapedTitles.length).toBeGreaterThan(0);

            const matchCount = verifyScrapedAgainstBackend(scrapedTitles, backendTitles, isMock, 0.6);
            console.log(`[VERIFIER] Successfully matched ${matchCount} movies.`);
        });
    }
});
