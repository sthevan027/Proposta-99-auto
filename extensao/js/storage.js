/**
 * Persistência de dados
 * Single Responsibility: Apenas storage
 */

import { state } from './state.js';
import { logger } from './logger.js';

class StorageService {
  async loadPropostas() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['propostas'], (result) => {
        if (result.propostas) {
          state.propostas = result.propostas;
          console.log('99F: Propostas carregadas:', state.propostas.length);
        }
        resolve(state.propostas);
      });
    });
  }
  
  async savePropostas() {
    return new Promise((resolve) => {
      chrome.storage.local.set({ propostas: state.propostas }, resolve);
    });
  }
  
  registrarProposta(projeto, proposta, valor, prazo) {
    const registro = {
      data: new Date().toLocaleString('pt-BR'),
      titulo: projeto.titulo,
      url: projeto.url,
      proposta: proposta,
      valor: valor,
      prazo: prazo
    };
    
    state.propostas.push(registro);
    this.savePropostas();
    
    return registro;
  }
  
  async limparHistorico() {
    state.propostas = [];
    await chrome.storage.local.set({ propostas: [] });
    logger.info('Histórico limpo');
  }
}

export const storage = new StorageService();
