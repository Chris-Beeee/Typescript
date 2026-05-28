import { Page, Locator } from '@playwright/test';
import { BasePage } from './basePage';

export class TMDBHomePage extends BasePage {
    readonly URL = 'https://www.themoviedb.org/';
    readonly loginLink: Locator;

    constructor(page: Page) {
        super(page);
        this.loginLink = page.locator("a[href='/login']");
    }

    async load() {
        await this.page.goto(this.URL);
    }

    async clickLogin() {
        await this.loginLink.first().click();
    }
}

export class TMDBLoginPage extends BasePage {
    readonly usernameField: Locator;
    readonly passwordField: Locator;
    readonly loginButton: Locator;
    readonly profileLink: Locator;

    constructor(page: Page) {
        super(page);
        this.usernameField = page.locator("input#username");
        this.passwordField = page.locator("input#password");
        this.loginButton = page.locator("input#login_button");
        this.profileLink = page.locator("a[href^='/u/']");
    }

    async login(username: string, password: string) {
        await this.usernameField.fill(username);
        await this.passwordField.fill(password);
        await this.loginButton.click();
    }

    async isLoginSuccessful(): Promise<boolean> {
        try {
            await this.profileLink.first().waitFor({ state: 'attached', timeout: 10000 });
            return true;
        } catch {
            return false;
        }
    }
}

export class TMDBGenericMoviesPage extends BasePage {
    readonly url: string;
    readonly movieTitles: Locator;
    readonly acceptCookiesBtn: Locator;

    constructor(page: Page, url: string) {
        super(page);
        this.url = url;
        this.movieTitles = page.locator("h2.whitespace-normal span, h2 a");
        this.acceptCookiesBtn = page.locator("button#onetrust-accept-btn-handler");
    }

    async load() {
        await this.page.goto(this.url);
    }

    async acceptCookies() {
        try {
            await this.acceptCookiesBtn.click({ timeout: 4000 });
        } catch {
            // Ignore if it doesn't appear
        }
    }

    async getMovieTitles(): Promise<string[]> {
        await this.movieTitles.first().waitFor({ state: 'visible', timeout: 10000 });
        const titles = await this.movieTitles.allTextContents();
        return titles.map(t => t.trim()).filter(t => t);
    }
}

export class TMDBNowPlayingPage extends TMDBGenericMoviesPage {
    constructor(page: Page) {
        super(page, "https://www.themoviedb.org/movie/now-playing");
    }
}

export class TMDBDiscoverPage extends BasePage {
    readonly URL = "https://www.themoviedb.org/movie";
    readonly searchButton: Locator;
    readonly movieTitles: Locator;
    readonly acceptCookiesBtn: Locator;

    constructor(page: Page) {
        super(page);
        this.searchButton = page.locator("div.apply.small.background_color.light_blue a");
        this.movieTitles = page.locator("h2.whitespace-normal span, h2 a");
        this.acceptCookiesBtn = page.locator("button#onetrust-accept-btn-handler");
    }

    async load() {
        await this.page.goto(this.URL);
    }

    async acceptCookies() {
        try {
            await this.acceptCookiesBtn.click({ timeout: 4000 });
        } catch {}
    }

    async selectShowMe(optionText: string) {
        const locator = this.page.locator(`//label[contains(text(), '${optionText}')]`);
        await locator.waitFor({ state: 'attached' });
        await locator.evaluate((el) => (el as HTMLElement).click());
    }

    async selectGenre(genreName: string) {
        const xpath = `//ul[@id='with_genres']/li/a[translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')='${genreName.toLowerCase()}']`;
        const locator = this.page.locator(xpath);
        await locator.waitFor({ state: 'attached' });
        await locator.evaluate((el) => (el as HTMLElement).click());
    }

    async setReleaseDates(startDate: string, endDate: string) {
        const startEl = this.page.locator("input#release_date_gte");
        const endEl = this.page.locator("input#release_date_lte");

        await startEl.evaluate((el: HTMLInputElement) => el.value = '');
        await startEl.fill(startDate);
        await startEl.press('Tab');

        await endEl.evaluate((el: HTMLInputElement) => el.value = '');
        await endEl.fill(endDate);
        await endEl.press('Tab');
    }

    async addKeyword(keyword: string) {
        const keywordInput = this.page.locator("span.k-multiselect input.k-input-inner");
        await keywordInput.fill(keyword);
        await this.page.waitForTimeout(1500); // wait for autocomplete
        const xpath = `//ul[@id='with_keywords_listbox']/li[translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')='${keyword.toLowerCase()}']`;
        const dropdownItem = this.page.locator(xpath);
        await dropdownItem.click();
    }

    async setCertifications(certs: string[]) {
        if (!certs) return;
        for (const cert of certs) {
            const locator = this.page.locator(`//ul[@id='certification']/li[@data-value='${cert}']`);
            await locator.waitFor({ state: 'attached' });
            const classes = await locator.getAttribute("class");
            if (!classes?.includes("selected")) {
                await locator.evaluate((el) => (el as HTMLElement).click());
            }
        }
    }

    async setUserScoreRange(minScore: number, maxScore: number) {
        await this.page.evaluate(([min, max]) => {
            const slider = (window as any).$ && (window as any).$("#user_score_range").data("kendoRangeSlider");
            if (slider) {
                slider.values(min, max);
                slider.trigger("change");
            } else {
                (document.getElementById("vote_average_gte") as HTMLInputElement).value = min.toString();
                (document.getElementById("vote_average_lte") as HTMLInputElement).value = max.toString();
            }
        }, [minScore, maxScore]);
    }

    async setMinimumUserVotes(minVotes: number) {
        await this.page.evaluate((min) => {
            const slider = (window as any).$ && (window as any).$("#user_vote_range").data("kendoSlider");
            if (slider) {
                slider.value(min);
                slider.trigger("change");
            } else {
                (document.getElementById("user_vote_range") as HTMLInputElement).value = min.toString();
            }
        }, minVotes);
    }

    async selectLanguage(langCode: string) {
        await this.page.evaluate((code) => {
            const ddl = (window as any).$ && (window as any).$("#language").data("kendoDropDownList");
            if (ddl) {
                ddl.value(code);
                ddl.trigger("change");
            } else {
                (document.getElementById("language") as HTMLInputElement).value = code;
            }
        }, langCode);
    }

    async setRuntimeRange(minMins: number, maxMins: number) {
        await this.page.evaluate(([min, max]) => {
            const slider = (window as any).$ && (window as any).$("#runtime_range").data("kendoRangeSlider");
            if (slider) {
                slider.values(min, max);
                slider.trigger("change");
            } else {
                (document.getElementById("with_runtime_gte") as HTMLInputElement).value = min.toString();
                (document.getElementById("with_runtime_lte") as HTMLInputElement).value = max.toString();
            }
        }, [minMins, maxMins]);
    }

    async setAvailabilities(types: string[]) {
        const allCheckboxLocator = this.page.locator("input#all_availabilities");
        await allCheckboxLocator.waitFor({ state: 'attached' });
        const isAllChecked = await allCheckboxLocator.isChecked();

        if (!types || types.length === 0) {
            if (!isAllChecked) {
                await allCheckboxLocator.evaluate((el) => (el as HTMLElement).click());
            }
            return;
        }

        if (isAllChecked) {
            await allCheckboxLocator.evaluate((el) => (el as HTMLElement).click());
        }

        const mapping: Record<string, string> = {
            "flatrate": "input#ott_monetization_type_flatrate",
            "free": "input#ott_monetization_type_free",
            "ads": "input#ott_monetization_type_ads",
            "rent": "input#ott_monetization_type_rent",
            "buy": "input#ott_monetization_type_buy"
        };

        for (const [mType, cssSel] of Object.entries(mapping)) {
            const locator = this.page.locator(cssSel);
            await locator.waitFor({ state: 'attached' });
            const shouldBeChecked = types.includes(mType);
            const isChecked = await locator.isChecked();
            if (isChecked !== shouldBeChecked) {
                await locator.evaluate((el) => (el as HTMLElement).click());
            }
        }
    }

    async applyFilters() {
        await this.searchButton.evaluate((el) => (el as HTMLElement).click());
        await this.page.waitForTimeout(2000); // wait for ajax refresh
    }

    async getMovieTitles(): Promise<string[]> {
        try {
            await this.movieTitles.first().waitFor({ state: 'visible', timeout: 5000 });
        } catch {
            return [];
        }
        
        const username = process.env.TMDB_USERNAME || "";
        const titles = await this.movieTitles.allTextContents();
        return titles.map(t => t.trim()).filter(t => t && t.toLowerCase() !== username.toLowerCase());
    }
}
