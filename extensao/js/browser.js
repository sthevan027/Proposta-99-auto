/**
 * Utilitários de navegação e interação com browser
 * Single Responsibility: Operações de browser
 */

import { CONFIG } from './config.js';

class BrowserService {
  async executeScript(tabId, func, args = []) {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func,
      args
    });
    return results[0]?.result;
  }
  
  async navigateTo(tabId, url) {
    await chrome.tabs.update(tabId, { url });
    
    return new Promise(resolve => {
      const listener = (id, info) => {
        if (id === tabId && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          setTimeout(resolve, CONFIG.TIMEOUTS.PAGE_LOAD);
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });
  }
  
  async getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }
  
  wait(seconds) {
    return new Promise(r => setTimeout(r, seconds * 1000));
  }
  
  waitMs(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  async scrollPageToLoadContent(tabId) {
    await this.executeScript(tabId, () => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await this.wait(2);
    await this.executeScript(tabId, () => {
      window.scrollTo(0, 0);
    });
    await this.wait(1);
  }
}

export const browser = new BrowserService();
