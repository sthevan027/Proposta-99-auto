/**
 * Integração com Ollama API
 * Single Responsibility: Comunicação com IA
 */

import { CONFIG } from './config.js';

class OllamaService {
  constructor() {
    this.baseUrl = CONFIG.OLLAMA_URL;
  }
  
  async checkConnection() {
    const response = await fetch(`${this.baseUrl}/api/tags`);
    if (!response.ok) throw new Error('Ollama não respondeu');
    const data = await response.json();
    return data.models?.map(m => m.name) || [];
  }
  
  async generateProposal(modelo, prompt) {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelo,
        prompt: prompt,
        stream: false,
        options: { 
          temperature: 0.7, 
          num_predict: 250,
          top_p: 0.9
        }
      })
    });
    
    if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
    
    const data = await response.json();
    let resposta = data.response?.trim() || '';
    resposta = resposta.replace(/^["']|["']$/g, '');
    
    return resposta;
  }
  
  buildPrompt(titulo, descricao) {
    return `Leia com atenção a descrição do projeto abaixo e escreva uma mensagem de primeiro contato.

=== PROJETO DO CLIENTE ===
Título: ${titulo}

Descrição completa:
${descricao.substring(0, CONFIG.LIMITS.MAX_PROMPT_DESC)}
=== FIM DO PROJETO ===

INSTRUÇÕES:
- Escreva uma mensagem de 40-60 palavras
- LEIA A DESCRIÇÃO e mencione detalhes específicos que o cliente escreveu
- Mostre que você ENTENDEU o que o cliente precisa
- Mencione sua experiência relacionada ao que ele pediu
- Faça uma pergunta relevante sobre algum detalhe do projeto
- Comece com "Olá!"
- Seja profissional e direto

IMPORTANTE: A mensagem deve mostrar que você LEU e ENTENDEU a descrição do projeto. Cite algo específico que o cliente mencionou.

Escreva apenas a mensagem:`;
  }
}

export const ollama = new OllamaService();
