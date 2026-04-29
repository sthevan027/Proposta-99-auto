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

  getReport() {
    const { conteudo, data } = this.generate();
    const filename = `propostas_99freelas_${data}.txt`;
    return { conteudo, filename };
  }
  
  async save() {
    const { conteudo, filename } = this.getReport();

    // MV3: evite blob/object URLs (podem invalidar com unload do popup/SW).
    // Data URL base64 é auto-contida e não depende do ciclo de vida do contexto.
    const base64 = toBase64Utf8(conteudo);
    const dataUrl = `data:text/plain;charset=utf-8;base64,${base64}`;

    await chrome.downloads.download({ url: dataUrl, filename, saveAs: true });
    
    logger.success(`Relatório salvo: ${filename}`);
    return filename;
  }
}

export const report = new ReportService();

function toBase64Utf8(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
