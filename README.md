# 📅 Sistema de Escalas DEJEM - Documentação Completa

## 🎯 Visão Geral

O **Sistema de Escalas DEJEM** é uma aplicação web responsiva que permite visualizar, buscar e imprimir escalas de serviço diárias de forma rápida e intuitiva. O sistema se integra com uma **planilha Google Sheets**, carregando dados automaticamente e atualizando em tempo real.

### ✨ Características Principais

- ✅ **Calendário Interativo**: Navegue entre meses e selecione datas
- ✅ **Busca por ID**: Encontre escalas rapidamente pelo ID
- ✅ **Detecção Automática de Abas**: Carrega todas as abas da planilha
- ✅ **Responsivo**: Funciona perfeitamente em mobile, tablet e desktop
- ✅ **Sem Dependências Externas**: 100% vanilla JavaScript
- ✅ **Integração com Google Sheets**: Dados sempre atualizados
- ✅ **Ordenação por Horário**: Escalas organizadas por horário de início
- ✅ **Filtro de Anos**: Carrega apenas escalas de 2026 em diante

---

## 📁 Estrutura de Arquivos

```
sistema-escalas/
├── index.html              # Estrutura HTML principal
├── styles.css              # Estilos (Mobile First)
├── script.js               # Lógica JavaScript
├── config.js               # Configuração da planilha
└── README.md               # Este arquivo
```

### Descrição dos Arquivos

| Arquivo | Tamanho | Descrição |
|---------|---------|-----------|
| **index.html** | ~3KB | Estrutura HTML com header, calendário e escalas |
| **styles.css** | ~35KB | Estilos completos (Mobile First, responsivo) |
| **script.js** | ~20KB | Lógica de carregamento, filtros e interações |
| **config.js** | ~5KB | Configuração da planilha Google Sheets |

---

## 🚀 Como Usar

### 1️⃣ Instalação

**Não requer instalação!** Basta abrir o arquivo `index.html` no navegador.

```bash
# Opção 1: Abrir diretamente
# Clique com botão direito em index.html → Abrir com → Navegador

# Opção 2: Usar Live Server (VSCode)
# Clique com botão direito em index.html → Open with Live Server
```

### 2️⃣ Configuração Inicial

Antes de usar, você precisa configurar a planilha Google Sheets:

#### Passo 1: Obtenha o ID da Planilha
```
URL: https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit
Copie o SHEET_ID
```

#### Passo 2: Obtenha uma Chave de API
1. Acesse [Google Cloud Console](https://console.cloud.google.com)
2. Crie um novo projeto
3. Ative a **Google Sheets API**
4. Crie uma **chave de API**
5. Copie a chave

#### Passo 3: Configure o arquivo `config.js`
```javascript
const SHEET_ID = 'sua_sheet_id_aqui';
const API_KEY = 'sua_api_key_aqui';
```

#### Passo 4: Configure a Planilha
Sua planilha deve ter as seguintes colunas (em ordem):

| Coluna | Nome | Exemplo |
|--------|------|---------|
| A | LINK | http://sistema.com/escala/123 |
| B | ID | 8373942 |
| C | DATA | 23/04/2026 |
| D | HORA_INÍCIO | 06:00 |
| E | HORA_FIM | 14:00 |

#### Passo 5: Publique a Planilha
1. Arquivo → Compartilhar → Publicar na web
2. Selecione formato **CSV**
3. Copie o link

### 3️⃣ Usar a Aplicação

#### Selecionar Data
1. Clique em um dia no calendário (lado esquerdo)
2. As escalas do dia aparecem no lado direito

#### Buscar por ID
1. Digite o ID no campo de busca (topo)
2. Os resultados aparecem instantaneamente
3. Clique no X para limpar a busca

#### Abrir Escala
1. Clique em **"Abrir e Imprimir"**
2. A escala abre no sistema

#### Copiar Link
1. Clique em **"Copiar Link"**
2. O link é copiado para a área de transferência

---

## 🎨 Design e Responsividade

### Paleta de Cores

| Elemento | Cor | Código |
|----------|-----|--------|
| **Header** | Verde Escuro | #1b5e3f |
| **Título** | Dourado | #fbbf24 |
| **Botão Primário** | Teal | #06b6d4 |
| **Badges** | Múltiplas | Veja CSS |

### Breakpoints (Mobile First)

```css
/* Mobile (320px - padrão) */
/* Tablet Pequeno (480px) */
@media (min-width: 480px) { ... }

/* Tablet (768px) */
@media (min-width: 768px) { ... }

/* Desktop (1024px) */
@media (min-width: 1024px) { ... }

/* Desktop Grande (1280px) */
@media (min-width: 1280px) { ... }
```

### Layout Responsivo

- **Mobile (320-480px)**: Coluna única, calendário compacto
- **Tablet (480-1024px)**: Calendário esquerda, escalas direita
- **Desktop (1024px+)**: Layout otimizado, espaçamento amplo

---

## 🔧 Configuração Avançada

### Adicionar Novas Abas

Quando você adicionar uma nova aba na planilha:

1. **Recarregue a página** (F5)
2. O sistema detectará automaticamente
3. Os dados carregarão em sequência

### Filtro de Anos

O sistema carrega apenas escalas de **MAIO de 2026 em diante**. Para alterar:

**Arquivo:** `script.js`  
**Função:** `filterSheetsByDate()`  
**Linha:** ~195

```javascript
// Modifique a condição:
if (year > 2026 || (year === 2026 && monthIndex >= 4)) {
    // 4 = MAIO (0=JANEIRO, 1=FEVEREIRO, etc)
}
```

### Personalizar Cores

**Arquivo:** `styles.css`

```css
/* Header */
.header-main { background: #1b5e3f; }

/* Botão Primário */
.btn-primary { background: #06b6d4; }

/* Badges */
.scale-id { background: #cffafe; }
.scale-time-badge { background: #fef3c7; }
.scale-sheet-badge { background: #e0e7ff; }
```

---

## 📊 Estrutura de Dados

### Escala (Objeto)

```javascript
{
  link: "http://sistema.com/escala/123",
  id: "8373942",
  date: "23/04/2026",
  time: "06:00-14:00",
  sheet: "DEJEM"  // Nome da aba
}
```

### Estado da Aplicação

```javascript
state = {
  allScales: [],           // Todas as escalas carregadas
  currentMonth: Date,      // Mês atual do calendário
  selectedDate: null,      // Data selecionada
  searchTerm: "",          // Termo de busca
  filteredScales: []       // Escalas filtradas
}
```

---

## 🧪 Solução de Problemas

### ❌ Erro 429 (Rate Limiting)

**Problema:** "Failed to load resource: the server responded with a status of 429"

**Solução:**
- O sistema carrega abas sequencialmente com delay
- Aguarde alguns segundos
- Recarregue a página (F5)

### ❌ Nenhuma Escala Aparece

**Verificar:**
1. A planilha está publicada? (Arquivo → Compartilhar → Publicar na web)
2. O SHEET_ID está correto em `config.js`?
3. A API_KEY está válida?
4. As datas estão no formato DD/MM/YYYY?
5. Abra o Console (F12) e procure por mensagens de erro

### ❌ Calendário Não Mostra Mês Vigente

**Solução:**
- Recarregue a página (F5)
- O calendário sempre mostra o mês atual ao carregar

### ❌ Busca Não Funciona

**Verificar:**
1. O ID existe na planilha?
2. Você digitou corretamente?
3. Abra o Console (F12) e procure por mensagens

---

## 📱 Teste em Diferentes Telas

### Teste no Navegador

```bash
# Abra o DevTools
F12

# Ative o modo responsivo
Ctrl+Shift+M

# Teste diferentes tamanhos:
- iPhone (375x667)
- iPad (768x1024)
- Desktop (1920x1080)
```

### Teste em Dispositivo Real

1. Obtenha o IP da máquina: `ipconfig` (Windows) ou `ifconfig` (Mac/Linux)
2. Acesse no celular: `http://SEU_IP:8000`
3. Teste todas as funcionalidades

---

## 🔐 Segurança

### Chave de API

⚠️ **IMPORTANTE:** A chave de API está exposta no código. Para produção:

1. Use um backend para proteger a chave
2. Configure restrições de origem no Google Cloud Console
3. Implemente rate limiting

### Dados Sensíveis

- ✅ Nenhum dado sensível é armazenado localmente
- ✅ Tudo é carregado da planilha em tempo real
- ✅ Sem cookies ou localStorage

---

## 📈 Performance

### Otimizações Implementadas

- ✅ Carregamento sequencial de abas (evita erro 429)
- ✅ Delay de 500ms entre requisições
- ✅ Retry automático em caso de erro
- ✅ Cache de dados em memória
- ✅ Sem dependências externas (mais rápido)

### Tempo de Carregamento

- **Primeira carga:** ~2-5 segundos (depende da conexão)
- **Navegação:** Instantâneo (dados em cache)
- **Busca:** <100ms

---

## 🎓 Como Funciona Internamente

### Fluxo de Dados

```
1. Página carregada
   ↓
2. Detecta todas as abas da planilha
   ↓
3. Filtra abas (apenas MAIO 2026+)
   ↓
4. Carrega dados de cada aba (sequencial)
   ↓
5. Consolida escalas
   ↓
6. Renderiza calendário e escalas
```

### Funções Principais

| Função | Descrição |
|--------|-----------|
| `init()` | Inicializa a aplicação |
| `getAllSheetNames()` | Detecta todas as abas |
| `fetchAllSheetsData()` | Carrega dados de todas as abas |
| `fetchSheetData(sheetName)` | Carrega dados de uma aba |
| `parseCSV(csv, sheetName)` | Converte CSV em objetos |
| `renderCalendar()` | Renderiza o calendário |
| `renderScales()` | Renderiza as escalas |
| `filterScales()` | Filtra escalas por data/busca |

---

## 📞 Suporte

### Documentação Adicional

- [Google Sheets API](https://developers.google.com/sheets/api)
- [JavaScript Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [CSS Media Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Media_Queries)

### Verificar Logs

Abra o Console do navegador (F12) para ver:
- ✅ Abas detectadas
- ✅ Dados carregados
- ✅ Mensagens de erro
- ✅ Informações de debug

---

## 📝 Changelog

### v1.0.0 (Atual)
- ✅ Calendário interativo
- ✅ Busca por ID
- ✅ Detecção automática de abas
- ✅ Responsivo (Mobile First)
- ✅ Integração com Google Sheets
- ✅ Ordenação por horário
- ✅ Filtro de anos (MAIO 2026+)

---

## 📄 Licença

Este projeto é de uso interno da DEJEM. Todos os direitos reservados.

---

## 👨‍💻 Autor

Desenvolvido para o Sistema de Escalas DEJEM.

**Última atualização:** Maio de 2026

---

## 🎉 Dicas Úteis

### 1. Atalhos de Teclado

- **F5**: Recarregar página
- **F12**: Abrir Console
- **Ctrl+F**: Buscar na página

### 2. Melhorar Performance

- Limpe o cache do navegador regularmente
- Feche abas desnecessárias
- Use navegadores modernos (Chrome, Firefox, Edge)

### 3. Compartilhar com Colegas

- Copie o link da escala (botão "Copiar Link")
- Compartilhe via WhatsApp, Email, etc.
- Colegas podem abrir direto no sistema

### 4. Imprimir Escala

- Clique em "Abrir e Imprimir"
- Use Ctrl+P para imprimir
- Salve como PDF se necessário

---

**Obrigado por usar o Sistema de Escalas DEJEM!** 🚀
