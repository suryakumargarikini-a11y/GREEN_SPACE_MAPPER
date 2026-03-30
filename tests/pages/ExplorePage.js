// Page Object Model: Explore / Search Page
export class ExplorePage {
  constructor(page) {
    this.page          = page;
    this.searchInput   = page.getByPlaceholder(/Search any place/i);
    this.weatherCard   = page.getByText(/Temperature/i).first();
    this.aqiCard       = page.getByText(/Air Quality/i).first();
    this.bestTimeCard  = page.getByText(/Best Time to Visit/i).first();
    this.nearbySection = page.getByText(/Nearby Green Spaces/i).first();
    this.noNearby      = page.getByText(/No nearby/i);
    this.satelliteBtn  = page.getByText('🛰 Satellite').first();
    this.streetBtn     = page.getByText('🗺 Street').first();
    this.loadingSpinner = page.locator('.animate-spin').first();
  }

  async goto() { await this.page.goto('/explore'); }

  async searchFor(query) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(600); // wait for debounce
  }

  async selectFirstSuggestion() {
    await this.page.locator('button').filter({ hasText: '📍' }).first().click();
  }

  async waitForData(timeout = 15000) {
    await this.weatherCard.waitFor({ state: 'visible', timeout });
  }
}
