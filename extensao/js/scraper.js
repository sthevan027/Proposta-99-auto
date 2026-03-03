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
      const seen = new Set();

      const isVisible = (el) => el && el.offsetParent !== null;

      // ESTRATÉGIA 1: Coletar TODOS os links de projeto na página (fonte principal)
      const allProjectLinks = Array.from(document.querySelectorAll('a[href*="/project/"]'))
        .filter(a => isVisible(a) && a.href && !a.href.includes('/new'));

      console.log('99F: Links /project/ encontrados:', allProjectLinks.length);

      const addProject = (link, container) => {
        const href = (link.href || '').split('?')[0];
        if (!href || href.includes('/bid/')) return;
        if (seen.has(href)) return;

        // Container = link parent ou elemento pai (para texto do card)
        const card = container || link.closest('div, li, article, tr, [class*="item"], [class*="card"], [class*="result"]') || link;
        const texto = (card?.innerText || link.innerText || '').toLowerCase();

        // Fechado - termos definitivos
        if (filters.CLOSED_KEYWORDS.some(kw => texto.includes(kw))) return;

        // Já enviou
        if (filters.SENT_KEYWORDS.some(kw => texto.includes(kw))) return;
        if (texto.includes('melhorar proposta')) return;

        const titulo = (link.innerText || link.textContent || '').trim();
        if (!titulo || titulo.length < 3 || titulo.toLowerCase().includes('expandir')) return;

        seen.add(href);
        projetos.push({ url: link.href, titulo: titulo.substring(0, 100) });
      };

      // Processar cada link de projeto
      allProjectLinks.forEach(link => addProject(link, null));

      console.log('99F: Total projetos válidos:', projetos.length);
      return projetos.slice(0, 30);
    }, [FILTERS]);
  }
  
  async checkProjectOpen(tabId) {
    return await browser.executeScript(tabId, () => {
      // Helper: elemento visível e interativo
      const isVisible = (el) => {
        if (!el || el.offsetParent === null) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
      };

      // Área de conteúdo principal (evita matches em sidebar, footer, scripts)
      const getMainContent = () => {
        const selectors = ['main', 'article', '[role="main"]', '.content', '.project-detail', 
          '.project-content', '#content', '.main-content', '.project-view'];
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el && el.innerText && el.innerText.length > 100) return el;
        }
        return document.body;
      };

      const mainContent = getMainContent();
      const textoMain = (mainContent.innerText || '').toLowerCase();
      const textoFull = (document.body.innerText || '').toLowerCase();

      console.log('99F: Verificando projeto (área restrita)...');

      // 1. FECHADO - verificar apenas na área principal
      const closedKeywords = [
        'projeto encerrado', 'projeto fechado', 'projeto finalizado',
        'projeto expirado', 'não aceita mais propostas', 'prazo encerrado'
      ];
      for (const kw of closedKeywords) {
        if (textoMain.includes(kw)) {
          console.log('99F: Projeto FECHADO');
          return { aberto: false, motivo: 'Projeto fechado' };
        }
      }

      // 2. JÁ ENVIOU - apenas frases em contexto de status (evita "como enviar proposta" etc)
      const sentPatterns = [
        /proposta\s+enviada(?!\s+agora)/,
        /você\s+já\s+enviou/,
        /sua\s+proposta\s+foi\s+enviada/,
        /aguardando\s+resposta\s+do\s+cliente/,
        /proposta\s+em\s+análise/
      ];
      for (const pattern of sentPatterns) {
        if (pattern.test(textoMain)) {
          console.log('99F: JÁ ENVIOU proposta (regex)');
          return { aberto: false, motivo: 'Já enviou proposta' };
        }
      }

      // 3. BOTÕES - apenas elementos visíveis e clicáveis
      const actionElements = document.querySelectorAll('a, button, [role="button"]');
      let btnEnviar = null;
      let btnMelhorar = null;

      for (const el of actionElements) {
        if (!isVisible(el)) continue;
        const t = (el.innerText || el.textContent || el.getAttribute('aria-label') || '').trim().toLowerCase();
        const href = (el.href || '').toLowerCase();

        if (t === 'enviar proposta' || (t.includes('enviar') && t.includes('proposta') && !t.includes('melhorar'))) {
          btnEnviar = el;
        }
        if (t === 'melhorar proposta' || (t.includes('melhorar') && t.includes('proposta'))) {
          btnMelhorar = el;
        }
        // Link /bid/ pode ser ação de enviar
        if (href.includes('/bid/') && !btnEnviar) {
          btnEnviar = el;
        }
      }

      // 4. "Melhorar proposta" sem "Enviar proposta" = já enviou
      if (btnMelhorar && !btnEnviar) {
        console.log('99F: MELHORAR PROPOSTA - já enviou');
        return { aberto: false, motivo: 'Já enviou (Melhorar proposta)' };
      }

      if (btnEnviar) {
        console.log('99F: Projeto ABERTO (botão Enviar encontrado)');
        return { aberto: true };
      }

      // 5. Fallback: formulário de proposta visível?
      const form = document.querySelector('form');
      const textarea = document.querySelector('textarea');
      if (form && textarea && isVisible(textarea)) {
        console.log('99F: Projeto ABERTO (formulário encontrado)');
        return { aberto: true };
      }

      if (btnMelhorar) {
        return { aberto: false, motivo: 'Já enviou (Melhorar proposta)' };
      }

      console.log('99F: SEM botão de proposta');
      return { aberto: false, motivo: 'Sem botão de proposta' };
    });
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
