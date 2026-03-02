/**
 * Configurações e constantes da aplicação
 * Single Responsibility: Apenas configurações
 */

export const CONFIG = {
  OLLAMA_URL: 'http://localhost:11434',
  URL_PROJETOS: 'https://www.99freelas.com.br/project-notifications/view?limit=20',
  
  DEFAULTS: {
    modelo: 'gemma3:4b',
    valor: 100,
    prazo: 7,
    limite: 5,
    delay: 30
  },
  
  TIMEOUTS: {
    PAGE_LOAD: 2000,
    FORM_LOAD: 4000,
    SUBMIT_WAIT: 3000,
    NAVIGATION: 4000
  },
  
  LIMITS: {
    MAX_LOGS: 100,
    MAX_DESCRIPTION: 1500,
    MAX_PROMPT_DESC: 800,
    MIN_PROPOSAL_LENGTH: 10
  }
};

export const FILTERS = {
  CLOSED_KEYWORDS: [
    'encerrado', 'fechado', 'finalizado', 
    'expirado', 'concluído', 'prazo encerrado'
  ],
  
  SENT_KEYWORDS: [
    'proposta enviada', 'você já enviou', 'sua proposta',
    'aguardando resposta', 'proposta em análise'
  ],
  
  OPEN_INDICATORS: ['tempo restante', 'dias', 'horas']
};
