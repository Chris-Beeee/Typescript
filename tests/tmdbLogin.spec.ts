import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import { TMDBHomePage, TMDBLoginPage } from '../pages/tmdbPages';

dotenv.config();

test('TMDB Login Verification', async ({ page }) => {
    const username = process.env.TMDB_USERNAME;
    const password = process.env.TMDB_PASSWORD;
    const accessToken = process.env.TMDB_API_READ_ACCESS_TOKEN;

    expect(username).toBeTruthy();
    expect(password).toBeTruthy();
    expect(accessToken).toBeTruthy();

    // 1. Verify API Login
    const response = await fetch("https://api.themoviedb.org/3/authentication", {
        headers: {
            "accept": "application/json",
            "Authorization": `Bearer ${accessToken}`
        }
    });
    expect(response.ok).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    console.log("\nAPI Login successful! Token is valid.");

    // 2. UI Global Auth Verification
    const homePage = new TMDBHomePage(page);
    await homePage.load();
    
    // Check if the profile link is attached to verify we are logged in globally
    const profileLink = page.locator("a[href^='/u/']").first();
    await expect(profileLink).toBeAttached({ timeout: 10000 });
    console.log("\nUI Global Auth successful!");
});
