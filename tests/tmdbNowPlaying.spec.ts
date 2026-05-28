import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import { TMDBNowPlayingPage, TMDBHomePage, TMDBLoginPage } from '../pages/tmdbPages';
import { getNowPlayingMovies } from '../utils/tmdbApi';
import { verifyScrapedAgainstBackend } from '../utils/backendVerifier';

dotenv.config();

test('TMDB Now Playing Verification', async ({ page }) => {
    test.setTimeout(60000);
    const isMockMode = false;

    const [backendTitles, isMock] = await getNowPlayingMovies(isMockMode);
    console.log(`\n[${isMock ? 'MOCK' : 'API'}] Successfully retrieved ${backendTitles.length} 'Now Playing' movies.`);

    const nowPlayingPage = new TMDBNowPlayingPage(page);
    await nowPlayingPage.load();
    await nowPlayingPage.acceptCookies();

    const scrapedTitles = await nowPlayingPage.getMovieTitles();
    console.log(`[UI] Successfully scraped ${scrapedTitles.length} movie titles.`);
    expect(scrapedTitles.length).toBeGreaterThan(0);

    const matchCount = verifyScrapedAgainstBackend(scrapedTitles, backendTitles, isMock, 0.6);
    console.log(`[VERIFIER] Successfully matched ${matchCount} movies.`);
});
