import { test as setup, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import { TMDBHomePage, TMDBLoginPage } from '../pages/tmdbPages';
import path from 'path';

dotenv.config();

import fs from 'fs';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
    // If the user already manually generated the auth file via codegen, don't overwrite it
    if (fs.existsSync(authFile)) {
        console.log("Valid auth file found! Skipping headless setup login.");
        return;
    }

    if (process.env.TMDB_USERNAME && process.env.TMDB_PASSWORD) {
        console.log("Performing global login...");
        const homePage = new TMDBHomePage(page);
        await homePage.load();
        await homePage.clickLogin();

        const loginPage = new TMDBLoginPage(page);
        await loginPage.login(process.env.TMDB_USERNAME, process.env.TMDB_PASSWORD);
        
        const isSuccessful = await loginPage.isLoginSuccessful();
        expect(isSuccessful).toBe(true);

        await page.context().storageState({ path: authFile });
        console.log("Global login successful! Auth state saved.");
    } else {
        console.log("No credentials found, skipping global login.");
        await page.context().storageState({ path: authFile });
    }
});
