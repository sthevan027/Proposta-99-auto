/**
 * Handler de mensagens da extensão
 * Single Responsibility: Gerenciar comunicação
 */

import { state } from './state.js';
import { storage } from './storage.js';
import { report } from './report.js';
import { ollama } from './ollama.js';
import { automation } from './automation.js';

export function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message, sendResponse);
    return true; // Mantém canal aberto para async
  });
}

async function handleMessage(message, sendResponse) {
  try {
    switch (message.action) {
      case 'iniciarAutomacao':
        state.setConfig(message.config);
        automation.start();
        sendResponse({ success: true });
        break;
        
      case 'pararAutomacao':
        automation.stop();
        sendResponse({ success: true });
        break;
        
      case 'getEstado':
        sendResponse(state.getState());
        break;
        
      case 'verificarOllama':
        try {
          const modelos = await ollama.checkConnection();
          sendResponse({ success: true, modelos });
        } catch (erro) {
          sendResponse({ success: false, erro: erro.message });
        }
        break;
        
      case 'gerarProposta':
        try {
          const resposta = await ollama.generateProposal(message.modelo, message.prompt);
          sendResponse({ success: true, resposta });
        } catch (erro) {
          sendResponse({ success: false, erro: erro.message });
        }
        break;
        
      case 'salvarRelatorio':
        try {
          const filename = await report.save();
          sendResponse({ success: true, filename });
        } catch (erro) {
          sendResponse({ success: false, erro: erro.message });
        }
        break;
        
      case 'limparHistorico':
        await storage.limparHistorico();
        sendResponse({ success: true });
        break;
        
      default:
        sendResponse({ success: false, erro: 'Ação desconhecida' });
    }
  } catch (err) {
    sendResponse({ success: false, erro: err.message });
  }
}
