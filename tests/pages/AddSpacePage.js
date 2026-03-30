// Page Object Model: Add Space Page
export class AddSpacePage {
  constructor(page) {
    this.page        = page;
    this.nameInput   = page.getByLabel(/name/i).first();
    this.latInput    = page.getByLabel(/latitude/i).first();
    this.lngInput    = page.getByLabel(/longitude/i).first();
    this.descInput   = page.getByLabel(/description/i).first();
    this.areaInput   = page.getByLabel(/area/i).first();
    this.submitBtn   = page.getByRole('button', { name: /add space|save|submit/i }).first();
    this.backLink    = page.getByText(/Back to Map/i).first();
  }

  async goto() { await this.page.goto('/add'); }

  /** Fills the form fields with the given values (all optional except name). */
  async fillForm({ name, lat, lng, description = '', area = '' }) {
    if (name)        await this.nameInput.fill(name);
    if (lat != null) await this.latInput.fill(String(lat));
    if (lng != null) await this.lngInput.fill(String(lng));
    if (description) await this.descInput.fill(description);
    if (area)        await this.areaInput.fill(area);
  }
}
