# 99Freelas Auto-Proposta

Extensão Chrome para automatizar o envio de propostas personalizadas no 99freelas usando IA local (Ollama).

## Funcionalidades

- Busca automática de projetos na categoria Web, Mobile & Software
- Filtra apenas projetos abertos (ignora fechados e já enviados)
- Gera propostas personalizadas com IA local (Ollama)
- Preenche automaticamente: valor, prazo e detalhes
- Envia propostas automaticamente
- Configurável: limite diário, delay entre propostas, valor e prazo padrão
- Roda em background (continua mesmo fechando o popup)

## Requisitos

- Google Chrome
- [Ollama](https://ollama.ai/) instalado localmente
- Modelo de IA (recomendado: `gemma3:4b` para melhor performance)

## Instalação

### 1. Instalar Ollama

Baixe e instale o Ollama: https://ollama.ai/

### 2. Baixar modelo de IA

```bash
ollama pull gemma3:4b
```

### 3. Iniciar Ollama com CORS

```powershell
$env:OLLAMA_ORIGINS="*"; ollama serve
```

**Importante:** Mantenha esse terminal aberto enquanto usa a extensão.

### 4. Instalar a extensão

1. Abra o Chrome e vá para: `chrome://extensions/`
2. Ative o **"Modo do desenvolvedor"** (canto superior direito)
3. Clique em **"Carregar sem compactação"**
4. Selecione a pasta `extensao/`

## Como Usar

1. Certifique-se que o Ollama está rodando (`ollama serve`)
2. Clique no ícone da extensão no Chrome
3. Configure:
   - **Modelo IA**: Escolha o modelo (gemma3:4b recomendado)
   - **Valor padrão**: Sua oferta em R$
   - **Prazo padrão**: Duração estimada em dias
   - **Limite**: Quantidade máxima de propostas
   - **Delay**: Tempo de espera entre propostas (segundos)
4. Clique em **"▶️ Iniciar Automação"**
5. Acompanhe o progresso no log

## Estrutura do Projeto

```
extensao/
├── manifest.json    # Configuração da extensão
├── background.js    # Lógica principal (roda em background)
├── popup.html       # Interface do usuário
├── popup.js         # Controle do popup
└── content.js       # Script injetado nas páginas
```

## Problemas Comuns

### "Ollama Offline"
- Verifique se o Ollama está rodando: `ollama serve`
- Certifique-se de usar `$env:OLLAMA_ORIGINS="*"` antes do `ollama serve`

### "Nenhum projeto encontrado"
- Verifique se está logado no 99freelas
- A extensão filtra projetos já enviados e fechados

### "Erro ao preencher formulário"
- Pode haver mudança na estrutura do site
- Tente novamente ou reporte o problema

## Notas

- Use com responsabilidade
- Respeite os termos de uso do 99freelas
- Limite diário recomendado: 10-20 propostas
- Sempre revise as propostas antes de enviar em massa
