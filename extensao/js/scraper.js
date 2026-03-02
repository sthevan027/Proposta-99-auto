/**
 * Extração de dados de projetos do 99freelas
 * Single Responsibility: Scraping de projetos
 */

import { browser } from './browser.js';
import { CONFIG, FILTERS } from './config.js';

class ScraperService {
  async fetchProjects(tabId) {
    return await browser.executeScript(tabId, (filters) => {
      const projetos = [];
      
      const cards = document.querySelectorAll('.result-container, .project-item, [class*="project"], article, .result');
      console.log('99F: Cards encontrados:', cards.length);
      
      const elementos = cards.length > 0 ? cards : document.querySelectorAll('a[href*="/project/"]');
      
      elementos.forEach(el => {
        const texto = (el.innerText || '').toLowerCase();
        const link = el.tagName === 'A' ? el : el.querySelector('a[href*="/project/"]');
        
        if (!link) return;
        
        const href = link.href;
        if (!href || href.includes('/new') || href.includes('/bid/')) return;
        
        // FILTROS - Já enviou
        if (filters.SENT_KEYWORDS.some(kw => texto.includes(kw))) {
          console.log('99F: Pulando - já enviou proposta');
          return;
        }
        
        // FILTROS - Fechado
        if (filters.CLOSED_KEYWORDS.some(kw => texto.includes(kw))) {
          console.log('99F: Pulando - projeto fechado');
          return;
        }
        
        // FILTROS - Sem tempo
        if (!filters.OPEN_INDICATORS.some(ind => texto.includes(ind))) {
          console.log('99F: Pulando - sem tempo restante');
          return;
        }
        
        // Evita duplicados
        if (projetos.some(p => p.url === href)) return;
        
        const titulo = link.innerText?.trim() || '';
        if (titulo && titulo.length > 5 && !titulo.includes('Expandir')) {
          console.log('99F: Projeto válido:', titulo.substring(0, 30));
          projetos.push({ url: href, titulo: titulo.substring(0, 100) });
        }
      });
      
      console.log('99F: Total projetos válidos:', projetos.length);
      return projetos.slice(0, 20);
    }, [FILTERS]);
  }
  
  async checkProjectOpen(tabId) {
    return await browser.executeScript(tabId, (filters) => {
      const texto = document.body.innerText.toLowerCase();
      
      console.log('99F: Verificando se projeto está aberto...');
      
      // Fechado
      const closedKeywords = [
        'projeto encerrado', 'projeto fechado', 'projeto finalizado',
        'projeto expirado', 'não aceita mais propostas', 'prazo encerrado'
      ];
      
      for (const kw of closedKeywords) {
        if (texto.includes(kw)) {
          console.log('99F: Projeto FECHADO');
          return { aberto: false, motivo: 'Projeto fechado' };
        }
      }
      
      // Já enviou
      const sentKeywords = [
        'proposta enviada', 'você já enviou', 'sua proposta foi',
        'aguardando resposta do cliente', 'proposta em análise'
      ];
      
      for (const kw of sentKeywords) {
        if (texto.includes(kw)) {
          console.log('99F: JÁ ENVIOU proposta');
          return { aberto: false, motivo: 'Já enviou proposta' };
        }
      }
      
      // Verifica botões
      const elementos = document.querySelectorAll('a, button');
      let temEnviarProposta = false;
      let temMelhorarProposta = false;
      
      for (const el of elementos) {
        const t = (el.innerText || '').trim().toLowerCase();
        
        if (t === 'melhorar proposta' || t.includes('melhorar proposta')) {
          temMelhorarProposta = true;
        }
        
        if (t === 'enviar proposta') {
          temEnviarProposta = true;
        }
      }
      
      if (temMelhorarProposta) {
        console.log('99F: Tem MELHORAR PROPOSTA - já enviou antes');
        return { aberto: false, motivo: 'Já enviou (Melhorar proposta)' };
      }
      
      if (!temEnviarProposta) {
        console.log('99F: SEM botão Enviar proposta');
        return { aberto: false, motivo: 'Sem botão de proposta' };
      }
      
      console.log('99F: Projeto ABERTO');
      return { aberto: true };
    }, [FILTERS]);
  }
  
  async extractProjectData(tabId) {
    return await browser.executeScript(tabId, (maxDesc) => {
      const h1 = document.querySelector('h1');
      const titulo = h1?.innerText?.trim() || '';
      
      let descricao = '';
      const body = document.body.cloneNode(true);
      body.querySelectorAll('header, footer, nav, aside, script, style').forEach(el => el.remove());
      descricao = body.innerText.substring(0, maxDesc);
      
      return { titulo, descricao };
    }, [CONFIG.LIMITS.MAX_DESCRIPTION]);
  }
}

export const scraper = new ScraperService();
