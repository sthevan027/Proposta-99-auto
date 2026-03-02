/**
 * Preenchimento e submissão de formulários
 * Single Responsibility: Interação com formulários
 */

import { browser } from './browser.js';

class FormService {
  async clickSendProposal(tabId) {
    return await browser.executeScript(tabId, () => {
      const elementos = document.querySelectorAll('a, button');
      
      for (const el of elementos) {
        const texto = (el.innerText || '').trim();
        
        if (texto.toLowerCase() === 'enviar proposta') {
          console.log('99F: Clicando em:', texto);
          el.click();
          return { success: true, texto };
        }
      }
      
      const links = document.querySelectorAll('a[href*="/bid/"]');
      if (links.length > 0) {
        console.log('99F: Clicando em link /bid/');
        links[0].click();
        return { success: true, texto: 'link /bid/' };
      }
      
      return { success: false };
    });
  }
  
  async fillForm(tabId, valor, prazo, mensagem) {
    return await browser.executeScript(tabId, (v, p, m) => {
      console.log('99F: Preenchendo formulário', { valor: v, prazo: p });
      
      let valorOk = false;
      let prazoOk = false;
      let detalhesOk = false;
      
      const inputs = Array.from(document.querySelectorAll('input')).filter(i => i.offsetParent !== null);
      console.log('99F: Inputs encontrados:', inputs.length);
      
      for (const input of inputs) {
        const type = input.type?.toLowerCase() || 'text';
        if (type === 'hidden' || type === 'submit' || type === 'checkbox' || type === 'radio') continue;
        
        const parent = input.closest('div, label, fieldset');
        const parentText = (parent?.innerText || '').toLowerCase();
        const prevSibling = input.previousElementSibling?.innerText?.toLowerCase() || '';
        const nextSibling = input.nextElementSibling?.innerText?.toLowerCase() || '';
        const placeholder = (input.placeholder || '').toLowerCase();
        
        console.log('99F: Input -', { parentText: parentText.substring(0, 30), prev: prevSibling, next: nextSibling });
        
        // Campo de VALOR
        if (!valorOk && (
          prevSibling.includes('r$') ||
          parentText.includes('sua oferta') ||
          parentText.includes('oferta') && !parentText.includes('final') ||
          placeholder.includes('valor')
        )) {
          input.value = v;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          valorOk = true;
          console.log('99F: Valor preenchido:', v);
          continue;
        }
        
        // Campo de PRAZO
        if (!prazoOk && (
          nextSibling.includes('dia') ||
          parentText.includes('duração') ||
          parentText.includes('estimada') && parentText.includes('dia') ||
          placeholder.includes('dia')
        )) {
          input.value = p;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          prazoOk = true;
          console.log('99F: Prazo preenchido:', p);
          continue;
        }
      }
      
      // Fallback por posição
      if (!valorOk || !prazoOk) {
        const numberInputs = inputs.filter(i => 
          i.type === 'number' || 
          i.type === 'text' && !i.value
        );
        
        if (numberInputs.length >= 1 && !valorOk) {
          numberInputs[0].value = v;
          numberInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
          valorOk = true;
          console.log('99F: Valor preenchido por posição');
        }
        
        if (!prazoOk) {
          for (const input of inputs) {
            const next = input.nextElementSibling;
            if (next && (next.innerText || '').toLowerCase().includes('dia')) {
              input.value = p;
              input.dispatchEvent(new Event('input', { bubbles: true }));
              prazoOk = true;
              console.log('99F: Prazo preenchido antes de "dias"');
              break;
            }
          }
        }
      }
      
      // DETALHES (textarea)
      const textareas = document.querySelectorAll('textarea');
      for (const ta of textareas) {
        if (ta.offsetParent !== null) {
          ta.value = m;
          ta.dispatchEvent(new Event('input', { bubbles: true }));
          ta.dispatchEvent(new Event('change', { bubbles: true }));
          detalhesOk = true;
          console.log('99F: Detalhes preenchidos');
          break;
        }
      }
      
      console.log('99F: Resultado -', { valorOk, prazoOk, detalhesOk });
      return { success: detalhesOk, valorOk, prazoOk, detalhesOk };
    }, [valor, prazo, mensagem]);
  }
  
  async submitForm(tabId) {
    return await browser.executeScript(tabId, () => {
      console.log('99F: Procurando botão "Enviar proposta"...');
      
      const elementos = document.querySelectorAll('button, input[type="submit"], a');
      
      // Primeira tentativa: texto exato
      for (const el of elementos) {
        if (el.offsetParent === null) continue;
        
        const texto = (el.innerText || el.value || '').trim().toLowerCase();
        const classes = (el.className || '').toLowerCase();
        
        console.log('99F: Elemento -', texto.substring(0, 25), classes.substring(0, 20));
        
        if (texto === 'enviar proposta') {
          console.log('99F: ENCONTRADO! Clicando...');
          el.click();
          return { success: true, texto: 'Enviar proposta' };
        }
      }
      
      // Segunda tentativa: botão verde
      for (const el of elementos) {
        if (el.offsetParent === null) continue;
        
        const texto = (el.innerText || el.value || '').toLowerCase();
        const classes = (el.className || '').toLowerCase();
        
        if (
          (classes.includes('btn-success') || classes.includes('btn-primary') || classes.includes('green')) &&
          (texto.includes('enviar') || texto.includes('submit'))
        ) {
          console.log('99F: Botão verde encontrado');
          el.click();
          return { success: true, texto: 'botão verde' };
        }
      }
      
      // Terceira tentativa: submit do form
      const form = document.querySelector('form');
      if (form) {
        const submitBtn = form.querySelector('button[type="submit"], input[type="submit"], button');
        if (submitBtn && submitBtn.offsetParent !== null) {
          console.log('99F: Submit do form');
          submitBtn.click();
          return { success: true, texto: 'form submit' };
        }
      }
      
      return { success: false };
    });
  }
}

export const form = new FormService();
