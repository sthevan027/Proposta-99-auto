/**
 * Geração de relatórios
 * Single Responsibility: Apenas relatórios
 */

import { state } from './state.js';
import { logger } from './logger.js';

class ReportService {
  generate() {
    const data = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    
    let conteudo = `RELATÓRIO DE PROPOSTAS - 99FREELAS
Gerado em: ${new Date().toLocaleString('pt-BR')}
Total de propostas: ${state.propostas.length}
${'='.repeat(60)}

`;

    state.propostas.forEach((p, i) => {
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
  
  async save() {
    const { conteudo, data } = this.generate();
    
    // Usa data URL em vez de blob URL - no Manifest V3 o service worker pode
    // ser descarregado antes do download, invalidando blob URLs
    const base64 = btoa(unescape(encodeURIComponent(conteudo)));
    const dataUrl = `data:text/plain;charset=utf-8;base64,${base64}`;
    
    // Data URLs têm limite ~2MB; conteúdo muito grande pode falhar
    if (dataUrl.length > 1.8 * 1024 * 1024) {
      throw new Error('Relatório muito grande. Tente limpar o histórico e gerar novamente.');
    }
    
    const filename = `propostas_99freelas_${data}.txt`;
    
    // saveAs: false evita que o diálogo feche o popup antes da resposta
    await chrome.downloads.download({
      url: dataUrl,
      filename: filename,
      saveAs: false
    });
    
    logger.success(`Relatório salvo: ${filename}`);
    return filename;
  }
}

export const report = new ReportService();
