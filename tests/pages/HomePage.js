// Page Object Model: Home Page
export class HomePage {
  constructor(page) {
    this.page         = page;
    this.map          = page.locator('.leaflet-container').first();
    this.mySpacesTab  = page.getByText('My Spaces', { exact: false }).first();
    this.addSpaceBtn  = page.getByRole('link', { name: /Add Space/i });
    this.searchNavBtn = page.getByRole('link', { name: /Search/i });
  }

  async goto()       { await this.page.goto('/'); }
  async waitForMap() { await this.map.waitFor({ state: 'visible', timeout: 10000 }); }
  async openMySpaces() { await this.mySpacesTab.click(); }
}
