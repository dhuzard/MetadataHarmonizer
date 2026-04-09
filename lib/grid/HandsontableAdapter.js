import Handsontable from 'handsontable';

export default class HandsontableAdapter {
  constructor() {
    this.instance = null;
  }

  isRevoGrid() {
    return false;
  }

  initialize(rootElement) {
    this.destroy();
    this.instance = new Handsontable(rootElement, {
      licenseKey: 'non-commercial-and-evaluation',
    });
    return this.instance;
  }

  getEngine() {
    return this.instance;
  }

  destroy() {
    if (this.instance) {
      this.instance.destroy();
      this.instance = null;
    }
  }
}
