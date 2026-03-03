/**
 * Gerenciamento de estado da aplicação
 * Single Responsibility: Apenas estado
 * Singleton Pattern
 */

import { CONFIG } from './config.js';

class StateManager {
  constructor() {
    this.rodando = false;
    this.config = { ...CONFIG.DEFAULTS };
    this.stats = { enviadas: 0, total: 0, erros: 0, pulados: 0 };
    this.logs = [];
    this.tabId = null;
    this.propostas = [];
  }
  
  reset() {
    this.rodando = false;
    this.stats = { enviadas: 0, total: 0, erros: 0, pulados: 0 };
    this.logs = [];
    this.tabId = null;
  }
  
  resetStats() {
    this.stats = { enviadas: 0, total: 0, erros: 0, pulados: 0 };
    this.logs = [];
  }
  
  setConfig(config) {
    this.config = { ...this.config, ...config };
  }
  
  setTabId(tabId) {
    this.tabId = tabId;
  }
  
  incrementSent() {
    this.stats.enviadas++;
  }
  
  incrementErrors() {
    this.stats.erros++;
  }
  
  incrementPulados() {
    this.stats.pulados++;
  }
  
  setTotal(total) {
    this.stats.total = total;
  }
  
  isRunning() {
    return this.rodando;
  }
  
  start() {
    this.rodando = true;
  }
  
  stop() {
    this.rodando = false;
  }
  
  canContinue() {
    return this.rodando && this.stats.enviadas < this.config.limite;
  }
  
  getState() {
    return {
      rodando: this.rodando,
      config: this.config,
      stats: this.stats,
      logs: this.logs,
      tabId: this.tabId,
      totalPropostas: this.propostas.length
    };
  }
}

export const state = new StateManager();
