// Content script - roda nas páginas do 99freelas
console.log('99Freelas Auto-Proposta: Extensão ativa');

// Listener para mensagens (caso precise no futuro)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Mensagem recebida:', message);
  
  if (message.action === 'ping') {
    sendResponse({ status: 'ok' });
  }
  
  return true;
});
