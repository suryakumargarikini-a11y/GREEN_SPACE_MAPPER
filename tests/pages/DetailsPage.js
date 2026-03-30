// Page Object Model: Space Details Page
export class DetailsPage {
  constructor(page) {
    this.page          = page;
    this.weatherCard   = page.getByText(/Temperature/i).first();
    this.aqiBadge      = page.getByText(/EAQI/i).first();
    this.bestTimeCard  = page.getByText(/Best Time to Visit/i).first();
    this.nearbyCard    = page.getByText(/Nearby Green Spaces/i).first();
    this.mapContainer  = page.locator('.leaflet-container').first();
    this.satelliteBtn  = page.getByText('🛰 Satellite').first();
    this.streetBtn     = page.getByText('🗺 Street').first();
    this.backBtn       = page.getByText(/Back/i).first();
    this.deleteBtn     = page.getByTitle(/delete/i).first();
  }

  async goto(id) { await this.page.goto(`/park/${id}`); }

  async waitForLoad(timeout = 15000) {
    await this.mapContainer.waitFor({ state: 'visible', timeout });
  }
}
