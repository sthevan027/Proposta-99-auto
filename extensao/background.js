/**
 * Service Worker - Ponto de entrada da extensão
 * 
 * Arquitetura SOLID:
 * - S: Cada módulo tem responsabilidade única
 * - O: Módulos abertos para extensão via configs
 * - L: Serviços podem ser substituídos por outros compatíveis
 * - I: Interfaces pequenas e específicas
 * - D: Automação depende de abstrações (serviços)
 */

import { storage } from './js/storage.js';
import { setupMessageListeners } from './js/messages.js';

// Inicialização
async function init() {
  console.log('99Freelas Auto-Proposta: Iniciando...');
  
  // Carrega propostas salvas
  await storage.loadPropostas();
  
  // Configura listeners de mensagens
  setupMessageListeners();
  
  console.log('99Freelas Auto-Proposta: Background pronto!');
}

init();
