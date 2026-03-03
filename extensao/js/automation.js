/**
 * Orquestração da automação
 * Dependency Inversion: Depende de abstrações (serviços)
 * Single Responsibility: Coordenar o fluxo
 */

import { CONFIG } from './config.js';
import { state } from './state.js';
import { logger } from './logger.js';
import { storage } from './storage.js';
import { ollama } from './ollama.js';
import { browser } from './browser.js';
import { scraper } from './scraper.js';
import { form } from './form.js';

class AutomationService {
  async start() {
    if (state.isRunning()) return;
    
    state.start();
    state.resetStats();
    
    const { modelo, valor, prazo, limite, delay } = state.config;
    
    logger.success('Iniciando automação...');
    logger.info(`Config: R$${valor} | ${prazo} dias | Limite: ${limite}`);
    
    try {
      await this.run();
    } catch (err) {
      logger.error(`Erro fatal: ${err.message}`);
    } finally {
      state.stop();
    }
  }
  
  async run() {
    const { modelo, valor, prazo, limite, delay } = state.config;
    const MAX_RETRIES = 3;
    let retryCount = 0;
    
    // Pega tab ativa
    const tab = await browser.getActiveTab();
    state.setTabId(tab.id);
    
    while (state.canContinue() && retryCount < MAX_RETRIES) {
      const enviadasAntes = state.stats.enviadas;
      
      // Navega para lista de projetos (ou recarrega em retry)
      if (retryCount > 0) {
        logger.info(`Tentativa ${retryCount + 1}/${MAX_RETRIES} - Recarregando página...`);
        await browser.wait(5);
      }
      
      logger.info('Navegando para: Novos Projetos');
      logger.info(CONFIG.URL_PROJETOS);
      await browser.navigateTo(state.tabId, CONFIG.URL_PROJETOS);
      await browser.wait(4);

      // Scroll para carregar projetos (lazy load)
      await browser.scrollPageToLoadContent(state.tabId);
      
      // Busca projetos
      const projetos = await scraper.fetchProjects(state.tabId);
      state.setTotal(projetos.length);
      
      if (projetos.length === 0) {
        logger.warning('Nenhum projeto encontrado nesta página.');
        retryCount++;
        if (retryCount < MAX_RETRIES) {
          logger.info('Nova tentativa em 8s...');
          await browser.wait(8);
        }
        continue;
      }
      
      logger.success(`Encontrados ${projetos.length} projetos`);
      
      // Processa cada projeto
      for (let i = 0; i < projetos.length && state.canContinue(); i++) {
        const projeto = projetos[i];
        
        try {
          await this.processProject(projeto, i, projetos.length);
          
          // Delay e volta para lista
          if (state.canContinue() && i < projetos.length - 1) {
            await this.waitAndReturn(delay);
          }
          
        } catch (err) {
          logger.error(`Erro: ${err.message}`);
          state.incrementErrors();
        }
      }
      
      const enviouAlguma = state.stats.enviadas > enviadasAntes;
      
      if (enviouAlguma || !state.canContinue()) {
        break;
      }
      
      if (state.stats.pulados > 0 || projetos.length > 0) {
        retryCount++;
        logger.info(`Todos os projetos foram pulados. Nova tentativa em 10s...`);
        await browser.wait(10);
      } else {
        break;
      }
    }
    
    const { enviadas, pulados, erros } = state.stats;
    logger.success(`Finalizado! ${enviadas} enviadas${pulados > 0 ? `, ${pulados} pulados` : ''}${erros > 0 ? `, ${erros} erros` : ''}.`);
  }
  
  async processProject(projeto, index, total) {
    const { modelo, valor, prazo } = state.config;
    
    logger.info(`[${index + 1}/${total}] ${projeto.titulo.substring(0, 40)}...`);
    
    // Abre projeto
    await browser.navigateTo(state.tabId, projeto.url);
    await browser.wait(3);
    
    // Verifica se aberto
    const status = await scraper.checkProjectOpen(state.tabId);
    if (!status.aberto) {
      logger.warning(`PULANDO: ${status.motivo || 'não disponível'}`);
      state.incrementPulados();
      return;
    }
    
    logger.success('Projeto aberto, continuando...');
    
    // Extrai dados
    const dados = await scraper.extractProjectData(state.tabId);
    if (!dados.titulo) {
      logger.warning('Erro ao extrair dados');
      state.incrementErrors();
      return;
    }
    
    // Gera proposta
    logger.info('Gerando proposta com IA...');
    const prompt = ollama.buildPrompt(dados.titulo, dados.descricao);
    const proposta = await ollama.generateProposal(modelo, prompt);
    
    if (!proposta || proposta.length < CONFIG.LIMITS.MIN_PROPOSAL_LENGTH) {
      logger.warning('Proposta inválida');
      state.incrementErrors();
      return;
    }
    
    logger.info(`Proposta: "${proposta.substring(0, 40)}..."`);
    
    // Clica em "Enviar proposta"
    logger.info('Procurando botão "Enviar proposta"...');
    const clickResult = await form.clickSendProposal(state.tabId);
    
    if (!clickResult.success) {
      logger.warning('Botão não encontrado, pulando...');
      state.incrementErrors();
      return;
    }
    
    logger.success(`Botão clicado: ${clickResult.texto}`);
    logger.info('Aguardando formulário...');
    await browser.wait(4);
    
    // Preenche formulário
    logger.info(`Preenchendo: R$${valor} | ${prazo} dias`);
    const formResult = await form.fillForm(state.tabId, valor, prazo, proposta);
    
    if (!formResult.detalhesOk) {
      logger.error('Erro ao preencher detalhes');
      state.incrementErrors();
      return;
    }
    
    logger.info(`OK: valor=${formResult.valorOk}, prazo=${formResult.prazoOk}, detalhes=${formResult.detalhesOk}`);
    await browser.wait(2);
    
    // Submete
    logger.info('Submetendo proposta...');
    const submitResult = await form.submitForm(state.tabId);
    
    if (!submitResult.success) {
      logger.error('Erro ao submeter');
      state.incrementErrors();
      return;
    }
    
    await browser.wait(3);
    
    // Registra proposta enviada
    storage.registrarProposta(projeto, proposta, valor, prazo);
    
    state.incrementSent();
    logger.success(`✓ ENVIADA! (${state.stats.enviadas}/${state.config.limite})`);
  }
  
  async waitAndReturn(delay) {
    logger.info(`Aguardando ${delay}s...`);
    
    for (let s = delay; s > 0 && state.isRunning(); s--) {
      await browser.wait(1);
    }
    
    await browser.navigateTo(state.tabId, CONFIG.URL_PROJETOS);
    await browser.wait(2);
  }
  
  stop() {
    state.stop();
    logger.warning('Automação parada pelo usuário');
  }
}

export const automation = new AutomationService();
