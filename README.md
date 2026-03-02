# 99Freelas Auto-Proposta

Extensão Chrome para automatizar o envio de propostas personalizadas no 99freelas usando IA local (Ollama).

## Funcionalidades

- **Busca automática** de novos projetos na página "Novos Projetos"
- **Filtragem inteligente**: ignora projetos fechados, já enviados ou com "Melhorar proposta"
- **Geração de propostas** personalizadas com IA baseada na descrição completa do projeto
- **Preenchimento automático**: valor, prazo e detalhes da proposta
- **Envio automático** clicando no botão "Enviar proposta"
- **Histórico de propostas** enviadas com salvamento em arquivo
- **Roda em background** - continua mesmo fechando o popup
- **Configurável**: limite diário, delay, valor e prazo padrão

## Requisitos

- Google Chrome
- [Ollama](https://ollama.ai/) instalado localmente
- Modelo de IA (recomendado: `mistral` ou `gemma3:4b`)

## Instalação

### 1. Instalar Ollama

Baixe e instale: https://ollama.ai/

### 2. Baixar modelo de IA

```bash
# Recomendado - melhor qualidade
ollama pull mistral

# Alternativa - mais rápido
ollama pull gemma3:4b
```

### 3. Iniciar Ollama com CORS

```powershell
$env:OLLAMA_ORIGINS="*"; ollama serve
```

**Importante:** Mantenha esse terminal aberto enquanto usa a extensão.

### 4. Instalar a extensão

1. Abra o Chrome: `chrome://extensions/`
2. Ative o **"Modo do desenvolvedor"** (canto superior direito)
3. Clique em **"Carregar sem compactação"**
4. Selecione a pasta `extensao/`

## Como Usar

1. Certifique-se que o Ollama está rodando
2. Clique no ícone da extensão no Chrome
3. Configure:
   - **Modelo IA**: mistral (recomendado) ou gemma3:4b
   - **Valor padrão**: Sua oferta em R$
   - **Prazo padrão**: Duração estimada em dias
   - **Limite**: Quantidade máxima de propostas
   - **Delay**: Tempo entre propostas (segundos)
4. Clique em **"▶️ Iniciar Automação"**
5. Acompanhe o progresso no log

## Fluxo da Automação

1. Navega para página **"Novos Projetos"**
2. Busca projetos disponíveis
3. Para cada projeto:
   - Verifica se está aberto (ignora fechados/já enviados)
   - Extrai título e descrição
   - Gera proposta personalizada com IA
   - Clica em "Enviar proposta"
   - Preenche valor, prazo e detalhes
   - Clica no botão verde "Enviar proposta"
   - Registra no histórico
4. Aguarda delay configurado
5. Repete até atingir o limite

## Histórico e Relatório

A extensão salva todas as propostas enviadas:

- **Contador**: Mostra total de propostas no histórico
- **Salvar Relatório**: Gera arquivo .txt com todas as propostas
- **Limpar**: Remove o histórico

O relatório inclui:
- Data/hora do envio
- Título e URL do projeto
- Valor e prazo oferecido
- Mensagem enviada

## Arquitetura do Projeto

O projeto segue princípios **SOLID** para manutenibilidade:

```
extensao/
├── manifest.json       # Configuração da extensão (v2.0)
├── background.js       # Ponto de entrada (service worker)
├── popup.html          # Interface do usuário
├── popup.js            # Controle do popup
├── content.js          # Script injetado nas páginas
└── js/                 # Módulos SOLID
    ├── config.js       # Configurações e constantes
    ├── state.js        # Gerenciamento de estado (Singleton)
    ├── logger.js       # Sistema de logs
    ├── storage.js      # Persistência de dados
    ├── report.js       # Geração de relatórios
    ├── ollama.js       # Integração com Ollama API
    ├── browser.js      # Utilitários de navegação
    ├── scraper.js      # Extração de dados dos projetos
    ├── form.js         # Preenchimento de formulários
    ├── automation.js   # Orquestração da automação
    └── messages.js     # Handler de mensagens
```

### Princípios SOLID Aplicados

- **S** (Single Responsibility): Cada módulo tem uma única responsabilidade
- **O** (Open/Closed): Módulos configuráveis via `config.js`
- **L** (Liskov Substitution): Serviços podem ser substituídos
- **I** (Interface Segregation): Interfaces pequenas e específicas
- **D** (Dependency Inversion): `automation.js` depende de abstrações

## Modelos de IA Recomendados

| Modelo | Velocidade | Qualidade | RAM |
|--------|-----------|-----------|-----|
| `mistral` | ⚡ Rápido | ⭐⭐⭐⭐ Muito boa | 4GB |
| `gemma3:4b` | ⚡ Rápido | ⭐⭐⭐ Boa | 4GB |
| `llama3:8b` | 🐢 Lento | ⭐⭐⭐⭐ Muito boa | 8GB |
| `phi3` | ⚡⚡ Muito rápido | ⭐⭐⭐ Boa | 3GB |

## Problemas Comuns

### "Ollama Offline"
```powershell
$env:OLLAMA_ORIGINS="*"; ollama serve
```

### "Nenhum projeto encontrado"
- Verifique se está logado no 99freelas
- A extensão filtra projetos já enviados

### "PULANDO: Já enviou (Melhorar proposta)"
- Normal! Significa que você já enviou proposta para esse projeto

### "Erro ao preencher formulário"
- Tente novamente
- Pode haver mudança na estrutura do site

## Dicas de Uso

- Comece com **limite baixo** (3-5) para testar
- Use **mistral** para mensagens mais naturais
- Ajuste **valor e prazo** conforme seu perfil
- **Salve o relatório** regularmente
- Use **delay de 30s+** para não parecer spam

## Notas

- Use com responsabilidade
- Respeite os termos de uso do 99freelas
- Limite diário recomendado: 10-20 propostas
- Revise as mensagens geradas periodicamente
