// Service Worker - roda em background (não para quando fecha o popup)

const OLLAMA_URL = 'http://localhost:11434';
const URL_PROJETOS = 'https://www.99freelas.com.br/project-notifications/view?limit=20';

// Estado da automação
let estado = {
  rodando: false,
  config: { modelo: 'gemma3:4b', valor: 100, prazo: 7, limite: 5, delay: 30 },
  stats: { enviadas: 0, total: 0, erros: 0 },
  logs: [],
  tabId: null,
  propostas: [] // Lista de propostas enviadas
};

// Adiciona proposta ao histórico
function registrarProposta(projeto, proposta, valor, prazo) {
  const registro = {
    data: new Date().toLocaleString('pt-BR'),
    titulo: projeto.titulo,
    url: projeto.url,
    proposta: proposta,
    valor: valor,
    prazo: prazo
  };
  estado.propostas.push(registro);
  
  // Salva no storage do Chrome
  chrome.storage.local.set({ propostas: estado.propostas });
}

// Gera relatório em texto
function gerarRelatorio() {
  const data = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
  let conteudo = `RELATÓRIO DE PROPOSTAS - 99FREELAS
Gerado em: ${new Date().toLocaleString('pt-BR')}
Total de propostas: ${estado.propostas.length}
${'='.repeat(60)}

`;

  estado.propostas.forEach((p, i) => {
    conteudo += `
PROPOSTA #${i + 1}
Data: ${p.data}
Projeto: ${p.titulo}
URL: ${p.url}
Valor: R$ ${p.valor}
Prazo: ${p.prazo} dias
Mensagem:
${p.proposta}
${'-'.repeat(60)}
`;
  });

  conteudo += `
${'='.repeat(60)}
Fim do relatório
`;

  return { conteudo, data };
}

// Salva relatório como arquivo
async function salvarRelatorio() {
  const { conteudo, data } = gerarRelatorio();
  
  // Cria blob e URL
  const blob = new Blob([conteudo], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  // Baixa o arquivo
  const filename = `propostas_99freelas_${data}.txt`;
  
  await chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: true
  });
  
  log(`Relatório salvo: ${filename}`, 'success');
  return filename;
}

// Log
function log(msg, tipo = 'info') {
  const entry = { time: new Date().toLocaleTimeString(), msg, tipo };
  estado.logs.push(entry);
  if (estado.logs.length > 100) estado.logs.shift();
  console.log(`[${tipo}] ${msg}`);
}

// Carrega propostas salvas ao iniciar
chrome.storage.local.get(['propostas'], (result) => {
  if (result.propostas) {
    estado.propostas = result.propostas;
    console.log('99F: Propostas carregadas:', estado.propostas.length);
  }
});

// Listener para mensagens
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  
  if (message.action === 'iniciarAutomacao') {
    estado.config = message.config;
    iniciarAutomacao();
    sendResponse({ success: true });
    return true;
  }
  
  if (message.action === 'pararAutomacao') {
    estado.rodando = false;
    log('Automação parada pelo usuário', 'warning');
    sendResponse({ success: true });
    return true;
  }
  
  if (message.action === 'getEstado') {
    sendResponse({ ...estado, totalPropostas: estado.propostas.length });
    return true;
  }
  
  if (message.action === 'verificarOllama') {
    verificarOllama()
      .then(modelos => sendResponse({ success: true, modelos }))
      .catch(erro => sendResponse({ success: false, erro: erro.message }));
    return true;
  }
  
  if (message.action === 'gerarProposta') {
    gerarPropostaOllama(message.modelo, message.prompt)
      .then(resposta => sendResponse({ success: true, resposta }))
      .catch(erro => sendResponse({ success: false, erro: erro.message }));
    return true;
  }
  
  if (message.action === 'salvarRelatorio') {
    salvarRelatorio()
      .then(filename => sendResponse({ success: true, filename }))
      .catch(erro => sendResponse({ success: false, erro: erro.message }));
    return true;
  }
  
  if (message.action === 'limparHistorico') {
    estado.propostas = [];
    chrome.storage.local.set({ propostas: [] });
    log('Histórico limpo', 'info');
    sendResponse({ success: true });
    return true;
  }
});

// Verifica Ollama
async function verificarOllama() {
  const response = await fetch(`${OLLAMA_URL}/api/tags`);
  if (!response.ok) throw new Error('Ollama não respondeu');
  const data = await response.json();
  return data.models?.map(m => m.name) || [];
}

// Gera proposta com Ollama (funciona com modelos locais e cloud)
async function gerarPropostaOllama(modelo, prompt) {
  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
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
  
  // Limpa a resposta
  let resposta = data.response?.trim() || '';
  
  // Remove aspas no início/fim se houver
  resposta = resposta.replace(/^["']|["']$/g, '');
  
  return resposta;
}

// Executa script na tab
async function executeScript(tabId, func, args = []) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func,
    args
  });
  return results[0]?.result;
}

// Navega e aguarda carregar
async function navegarPara(tabId, url) {
  await chrome.tabs.update(tabId, { url });
  
  return new Promise(resolve => {
    const listener = (id, info) => {
      if (id === tabId && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        setTimeout(resolve, 2000);
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

// Aguarda
function aguardar(segundos) {
  return new Promise(r => setTimeout(r, segundos * 1000));
}

// Busca projetos na lista (APENAS ABERTOS)
async function buscarProjetos(tabId) {
  return await executeScript(tabId, () => {
    const projetos = [];
    
    // Pega todos os cards de projeto
    const cards = document.querySelectorAll('.result-container, .project-item, [class*="project"], article, .result');
    
    console.log('99F: Cards encontrados:', cards.length);
    
    // Se não encontrou cards específicos, tenta por links
    const elementos = cards.length > 0 ? cards : document.querySelectorAll('a[href*="/project/"]');
    
    elementos.forEach(el => {
      const texto = (el.innerText || '').toLowerCase();
      const link = el.tagName === 'A' ? el : el.querySelector('a[href*="/project/"]');
      
      if (!link) return;
      
      const href = link.href;
      if (!href || href.includes('/new') || href.includes('/bid/')) return;
      
      // FILTROS RIGOROSOS - PULA SE:
      // 1. Já enviou proposta
      if (texto.includes('proposta enviada') || 
          texto.includes('você já enviou') ||
          texto.includes('sua proposta') ||
          texto.includes('aguardando resposta')) {
        console.log('99F: Pulando - já enviou proposta');
        return;
      }
      
      // 2. Projeto encerrado/fechado
      if (texto.includes('encerrado') || 
          texto.includes('fechado') ||
          texto.includes('finalizado') ||
          texto.includes('expirado') ||
          texto.includes('concluído')) {
        console.log('99F: Pulando - projeto fechado');
        return;
      }
      
      // 3. NÃO tem tempo restante (projeto vencido)
      if (!texto.includes('tempo restante') && 
          !texto.includes('dias') && 
          !texto.includes('horas')) {
        console.log('99F: Pulando - sem tempo restante');
        return;
      }
      
      // 4. Evita duplicados
      if (projetos.some(p => p.url === href)) return;
      
      const titulo = link.innerText?.trim() || '';
      if (titulo && titulo.length > 5 && !titulo.includes('Expandir')) {
        console.log('99F: Projeto válido:', titulo.substring(0, 30));
        projetos.push({ url: href, titulo: titulo.substring(0, 100) });
      }
    });
    
    console.log('99F: Total projetos válidos:', projetos.length);
    return projetos.slice(0, 20);
  });
}

// Verifica se projeto está aberto e aceita proposta
async function verificarProjetoAberto(tabId) {
  return await executeScript(tabId, () => {
    const texto = document.body.innerText.toLowerCase();
    
    console.log('99F: Verificando se projeto está aberto...');
    
    // FECHADO SE:
    if (texto.includes('projeto encerrado') ||
        texto.includes('projeto fechado') ||
        texto.includes('projeto finalizado') ||
        texto.includes('projeto expirado') ||
        texto.includes('não aceita mais propostas') ||
        texto.includes('prazo encerrado')) {
      console.log('99F: Projeto FECHADO');
      return { aberto: false, motivo: 'Projeto fechado' };
    }
    
    // JÁ ENVIOU PROPOSTA SE:
    if (texto.includes('proposta enviada') ||
        texto.includes('você já enviou') ||
        texto.includes('sua proposta foi') ||
        texto.includes('aguardando resposta do cliente') ||
        texto.includes('proposta em análise')) {
      console.log('99F: JÁ ENVIOU proposta');
      return { aberto: false, motivo: 'Já enviou proposta' };
    }
    
    // VERIFICA BOTÕES NA PÁGINA
    const elementos = document.querySelectorAll('a, button');
    let temEnviarProposta = false;
    let temMelhorarProposta = false;
    
    for (const el of elementos) {
      const t = (el.innerText || '').trim().toLowerCase();
      
      // Se tem "Melhorar proposta" = já enviou antes
      if (t === 'melhorar proposta' || t.includes('melhorar proposta')) {
        temMelhorarProposta = true;
      }
      
      // Se tem "Enviar proposta" = pode enviar
      if (t === 'enviar proposta') {
        temEnviarProposta = true;
      }
    }
    
    // Se tem "Melhorar proposta", já enviou antes
    if (temMelhorarProposta) {
      console.log('99F: Tem MELHORAR PROPOSTA - já enviou antes');
      return { aberto: false, motivo: 'Já enviou (Melhorar proposta)' };
    }
    
    // Se não tem "Enviar proposta"
    if (!temEnviarProposta) {
      console.log('99F: SEM botão Enviar proposta');
      return { aberto: false, motivo: 'Sem botão de proposta' };
    }
    
    console.log('99F: Projeto ABERTO');
    return { aberto: true };
  });
}

// Extrai dados do projeto
async function extrairDadosProjeto(tabId) {
  return await executeScript(tabId, () => {
    const h1 = document.querySelector('h1');
    const titulo = h1?.innerText?.trim() || '';
    
    let descricao = '';
    const body = document.body.cloneNode(true);
    body.querySelectorAll('header, footer, nav, aside, script, style').forEach(el => el.remove());
    descricao = body.innerText.substring(0, 1500);
    
    return { titulo, descricao };
  });
}

// Clica em "Enviar proposta"
async function clicarEnviarProposta(tabId) {
  return await executeScript(tabId, () => {
    // Busca EXATAMENTE o botão/link "Enviar proposta"
    const elementos = document.querySelectorAll('a, button');
    
    for (const el of elementos) {
      const texto = (el.innerText || '').trim();
      
      // Deve ser EXATAMENTE "Enviar proposta" (case insensitive)
      if (texto.toLowerCase() === 'enviar proposta') {
        console.log('99F: Clicando em:', texto);
        el.click();
        return { success: true, texto };
      }
    }
    
    // Segunda tentativa: link que contém /bid/ na URL
    const links = document.querySelectorAll('a[href*="/bid/"]');
    if (links.length > 0) {
      console.log('99F: Clicando em link /bid/');
      links[0].click();
      return { success: true, texto: 'link /bid/' };
    }
    
    return { success: false };
  });
}

// Preenche formulário de proposta do 99freelas
async function preencherFormulario(tabId, valor, prazo, mensagem) {
  return await executeScript(tabId, (v, p, m) => {
    console.log('99F: Preenchendo formulário', { valor: v, prazo: p });
    
    let valorOk = false;
    let prazoOk = false;
    let detalhesOk = false;
    
    // Pega todos os inputs visíveis
    const inputs = Array.from(document.querySelectorAll('input')).filter(i => i.offsetParent !== null);
    
    console.log('99F: Inputs encontrados:', inputs.length);
    
    for (const input of inputs) {
      const type = input.type?.toLowerCase() || 'text';
      if (type === 'hidden' || type === 'submit' || type === 'checkbox' || type === 'radio') continue;
      
      // Pega texto ao redor do input
      const parent = input.closest('div, label, fieldset');
      const parentText = (parent?.innerText || '').toLowerCase();
      const prevSibling = input.previousElementSibling?.innerText?.toLowerCase() || '';
      const nextSibling = input.nextElementSibling?.innerText?.toLowerCase() || '';
      const placeholder = (input.placeholder || '').toLowerCase();
      
      console.log('99F: Input -', { parentText: parentText.substring(0, 30), prev: prevSibling, next: nextSibling });
      
      // Campo de VALOR (R$, oferta, sua oferta)
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
      
      // Campo de PRAZO (dias, duração)
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
    
    // Se não encontrou por contexto, tenta pela ordem (1º = valor, 2º após dias = prazo)
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
      
      // Procura input antes de "dias"
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
    
    // Preenche DETALHES (textarea)
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

// Submete proposta - clica no botão verde "Enviar proposta"
async function submeterProposta(tabId) {
  return await executeScript(tabId, () => {
    console.log('99F: Procurando botão "Enviar proposta"...');
    
    // Procura TODOS os botões e links
    const elementos = document.querySelectorAll('button, input[type="submit"], a');
    
    for (const el of elementos) {
      if (el.offsetParent === null) continue; // Ignora invisíveis
      
      const texto = (el.innerText || el.value || '').trim().toLowerCase();
      const classes = (el.className || '').toLowerCase();
      const style = el.style?.backgroundColor || '';
      
      console.log('99F: Elemento -', texto.substring(0, 25), classes.substring(0, 20));
      
      // Botão verde "Enviar proposta" no formulário
      if (texto === 'enviar proposta') {
        console.log('99F: ENCONTRADO! Clicando...');
        el.click();
        return { success: true, texto: 'Enviar proposta' };
      }
    }
    
    // Segunda tentativa: busca por classe ou cor verde
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
    
    // Terceira tentativa: qualquer botão submit no form
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

// Loop principal da automação
async function iniciarAutomacao() {
  if (estado.rodando) return;
  
  estado.rodando = true;
  estado.stats = { enviadas: 0, total: 0, erros: 0 };
  estado.logs = [];
  
  const { modelo, valor, prazo, limite, delay } = estado.config;
  
  log('Iniciando automação...', 'success');
  log(`Config: R$${valor} | ${prazo} dias | Limite: ${limite}`, 'info');
  
  try {
    // Pega ou cria tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    estado.tabId = tab.id;
    
    // Navega para lista de NOVOS PROJETOS
    log('Navegando para: Novos Projetos', 'info');
    log(URL_PROJETOS, 'info');
    await navegarPara(estado.tabId, URL_PROJETOS);
    await aguardar(4);
    
    // Busca projetos
    const projetos = await buscarProjetos(estado.tabId);
    estado.stats.total = projetos.length;
    
    if (projetos.length === 0) {
      log('Nenhum projeto encontrado!', 'error');
      estado.rodando = false;
      return;
    }
    
    log(`Encontrados ${projetos.length} projetos`, 'success');
    
    // Processa cada projeto
    for (let i = 0; i < projetos.length && estado.stats.enviadas < limite && estado.rodando; i++) {
      const projeto = projetos[i];
      
      try {
        log(`[${i+1}/${projetos.length}] ${projeto.titulo.substring(0, 40)}...`, 'info');
        
        // Abre projeto
        await navegarPara(estado.tabId, projeto.url);
        await aguardar(3);
        
        // Verifica se aberto
        const status = await verificarProjetoAberto(estado.tabId);
        if (!status.aberto) {
          log(`PULANDO: ${status.motivo || 'não disponível'}`, 'warning');
          estado.stats.erros++;
          continue;
        }
        
        log('Projeto aberto, continuando...', 'success');
        
        // Extrai dados
        const dados = await extrairDadosProjeto(estado.tabId);
        if (!dados.titulo) {
          log('Erro ao extrair dados', 'warning');
          estado.stats.erros++;
          continue;
        }
        
        // Gera proposta
        log('Gerando proposta com IA...', 'info');
        
        const prompt = `Leia com atenção a descrição do projeto abaixo e escreva uma mensagem de primeiro contato.

=== PROJETO DO CLIENTE ===
Título: ${dados.titulo}

Descrição completa:
${dados.descricao.substring(0, 800)}
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

        const proposta = await gerarPropostaOllama(modelo, prompt);
        
        if (!proposta || proposta.length < 10) {
          log('Proposta inválida', 'warning');
          estado.stats.erros++;
          continue;
        }
        
        log(`Proposta: "${proposta.substring(0, 40)}..."`, 'info');
        
        // Clica em "Enviar proposta"
        log('Procurando botão "Enviar proposta"...', 'info');
        const clickResult = await clicarEnviarProposta(estado.tabId);
        
        if (!clickResult.success) {
          log('Botão não encontrado, pulando...', 'warning');
          estado.stats.erros++;
          continue;
        }
        
        log(`Botão clicado: ${clickResult.texto}`, 'success');
        log('Aguardando formulário...', 'info');
        await aguardar(4);
        
        // Preenche formulário
        log(`Preenchendo: R$${valor} | ${prazo} dias`, 'info');
        const formResult = await preencherFormulario(estado.tabId, valor, prazo, proposta);
        
        if (!formResult.detalhesOk) {
          log('Erro ao preencher detalhes', 'error');
          estado.stats.erros++;
          continue;
        }
        
        log(`OK: valor=${formResult.valorOk}, prazo=${formResult.prazoOk}, detalhes=${formResult.detalhesOk}`, 'info');
        await aguardar(2);
        
        // Submete
        log('Submetendo proposta...', 'info');
        const submitResult = await submeterProposta(estado.tabId);
        
        if (!submitResult.success) {
          log('Erro ao submeter', 'error');
          estado.stats.erros++;
          continue;
        }
        
        await aguardar(3);
        
        // Registra proposta enviada
        registrarProposta(projeto, proposta, valor, prazo);
        
        estado.stats.enviadas++;
        log(`✓ ENVIADA! (${estado.stats.enviadas}/${limite})`, 'success');
        
        // Delay antes da próxima
        if (estado.stats.enviadas < limite && i < projetos.length - 1 && estado.rodando) {
          log(`Aguardando ${delay}s...`, 'info');
          
          for (let s = delay; s > 0 && estado.rodando; s--) {
            await aguardar(1);
          }
          
          // Volta para lista
          await navegarPara(estado.tabId, URL_PROJETOS);
          await aguardar(2);
        }
        
      } catch (err) {
        log(`Erro: ${err.message}`, 'error');
        estado.stats.erros++;
      }
    }
    
    log(`Finalizado! ${estado.stats.enviadas} propostas enviadas.`, 'success');
    
  } catch (err) {
    log(`Erro fatal: ${err.message}`, 'error');
  } finally {
    estado.rodando = false;
  }
}

console.log('99Freelas Auto-Proposta: Background iniciado');
