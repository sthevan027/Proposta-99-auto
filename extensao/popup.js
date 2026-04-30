// Popup - apenas controla o background (não faz a automação)

// Elementos
const ollamaStatus = document.getElementById('ollama-status');
const botStatus = document.getElementById('bot-status');
const modeloSelect = document.getElementById('modelo');
const valorInput = document.getElementById('valor-proposta');
const prazoInput = document.getElementById('prazo-proposta');
const limiteInput = document.getElementById('limite');
const delayInput = document.getElementById('delay');
const btnIniciar = document.getElementById('btn-iniciar');
const btnParar = document.getElementById('btn-parar');
const btnLista = document.getElementById('btn-lista');
const logArea = document.getElementById('log-area');
const progressBar = document.getElementById('progress-bar');
const statEnviadas = document.getElementById('stat-enviadas');
const statTotal = document.getElementById('stat-total');
const statPulados = document.getElementById('stat-pulados');
const totalHistorico = document.getElementById('total-historico');
const btnRelatorio = document.getElementById('btn-relatorio');
const btnLimpar = document.getElementById('btn-limpar');

// Verifica Ollama
async function verificarOllama() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'verificarOllama' });
    
    if (response.success && response.modelos?.length > 0) {
      ollamaStatus.textContent = '✓ Conectado';
      ollamaStatus.className = 'status-ok';
      
      modeloSelect.innerHTML = '';
      response.modelos.forEach(modelo => {
        const opt = document.createElement('option');
        opt.value = modelo;
        opt.textContent = modelo;
        if (modelo.includes('gemma')) opt.selected = true;
        modeloSelect.appendChild(opt);
      });
      
      return true;
    }
    throw new Error('Sem modelos');
  } catch (e) {
    ollamaStatus.textContent = '✗ Offline';
    ollamaStatus.className = 'status-error';
    return false;
  }
}

// Atualiza UI com estado do background
function atualizarUI(estado) {
  // Stats
  statEnviadas.textContent = estado.stats.enviadas;
  statTotal.textContent = estado.stats.total;
  statPulados.textContent = estado.stats.pulados ?? 0;
  
  // Histórico
  totalHistorico.textContent = estado.totalPropostas || 0;
  
  // Progress
  const limite = parseInt(limiteInput.value) || 5;
  const progresso = (estado.stats.enviadas / limite) * 100;
  progressBar.style.width = `${Math.min(progresso, 100)}%`;
  
  // Status
  if (estado.rodando) {
    botStatus.textContent = 'Rodando...';
    botStatus.className = 'status-ok';
    btnIniciar.classList.add('hidden');
    btnParar.classList.remove('hidden');
  } else {
    botStatus.textContent = 'Parado';
    botStatus.className = 'status-warning';
    btnIniciar.classList.remove('hidden');
    btnParar.classList.add('hidden');
  }
  
  // Logs
  logArea.innerHTML = '';
  estado.logs.forEach(entry => {
    const div = document.createElement('div');
    div.className = `log-entry log-${entry.tipo}`;
    div.textContent = `[${entry.time}] ${entry.msg}`;
    logArea.appendChild(div);
  });
  logArea.scrollTop = logArea.scrollHeight;
}

// Busca estado do background periodicamente
async function atualizarEstado() {
  try {
    const estado = await chrome.runtime.sendMessage({ action: 'getEstado' });
    atualizarUI(estado);
  } catch (e) {
    console.log('Erro ao buscar estado:', e);
  }
}

// Inicia automação
btnIniciar.addEventListener('click', async () => {
  const ollamaOk = await verificarOllama();
  if (!ollamaOk) {
    alert('Ollama não está disponível!');
    return;
  }
  
  const config = {
    modelo: modeloSelect.value,
    valor: parseInt(valorInput.value) || 100,
    prazo: parseInt(prazoInput.value) || 7,
    limite: parseInt(limiteInput.value) || 5,
    delay: parseInt(delayInput.value) || 30
  };
  
  await chrome.runtime.sendMessage({ action: 'iniciarAutomacao', config });
  
  // Inicia polling do estado
  atualizarEstado();
});

// Para automação
btnParar.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ action: 'pararAutomacao' });
  atualizarEstado();
});

// Vai para lista de novos projetos
btnLista.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await chrome.tabs.update(tab.id, { 
    url: 'https://www.99freelas.com.br/project-notifications/view?limit=50' 
  });
});

// Salvar relatório
btnRelatorio.addEventListener('click', async () => {
  btnRelatorio.textContent = '⏳ Salvando...';
  btnRelatorio.disabled = true;
  
  try {
    const response = await chrome.runtime.sendMessage({ action: 'salvarRelatorio' });
    if (response && response.success) {
      btnRelatorio.textContent = '✓ Salvo!';
    } else {
      const erroMsg = (response && response.erro) ? response.erro : 'Erro desconhecido';
      console.error('Erro ao salvar relatório:', erroMsg);
      btnRelatorio.textContent = '❌ Erro';
      btnRelatorio.title = erroMsg;
    }
  } catch (e) {
    console.error('Erro ao salvar relatório:', e);
    btnRelatorio.textContent = '❌ Erro';
    btnRelatorio.title = e?.message || 'Falha na comunicação com o background';
  }
  
  setTimeout(() => {
    btnRelatorio.textContent = '💾 Salvar Relatório';
    btnRelatorio.title = '';
    btnRelatorio.disabled = false;
  }, 2000);
});

// Limpar histórico
btnLimpar.addEventListener('click', async () => {
  if (confirm('Tem certeza que deseja limpar todo o histórico de propostas?')) {
    await chrome.runtime.sendMessage({ action: 'limparHistorico' });
    totalHistorico.textContent = '0';
  }
});

// Polling para atualizar UI
setInterval(atualizarEstado, 1000);

// Inicialização
async function init() {
  await verificarOllama();
  await atualizarEstado();
}

init();
