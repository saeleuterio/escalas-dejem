/**
 * SISTEMA DE ESCALAS - LÓGICA PRINCIPAL
 * Integração com Google Sheets API para detecção automática de abas
 * Carrega TODAS as abas e consolida as escalas por data
 */

// Estado da aplicação
let state = {
  selectedDate: "",
  currentMonth: new Date(),
  filteredScales: [],
  allScales: [],
  allSheetNames: [],
  isLoading: true,
  error: null,
  searchQuery: "",
};

// Elementos do DOM
const calendarGrid = document.getElementById("calendarGrid");
const scalesContainer = document.getElementById("scalesContainer");
const monthNameEl = document.getElementById("monthName");
const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");
const searchInput = document.getElementById("searchInput");
const clearSearchBtn = document.getElementById("clearSearchBtn");

// ============================================
// FUNÇÕES DE DETECÇÃO DE ABAS (API)
// ============================================

/**
 * Detecta todas as abas usando Google Sheets API
 * Método 100% automático - detecta qualquer aba nova
 */
async function getAllSheetNamesViaAPI() {
  try {
    console.log("🔍 Tentando detectar abas via API do Google Sheets...");

    // Verifica se a chave de API está configurada
    if (typeof API_KEY === "undefined" || !API_KEY) {
      console.warn("⚠️ API_KEY não está configurada em config.js");
      return null;
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?key=${API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const sheets = data.sheets || [];

    // Extrai os nomes das abas
    const sheetNames = sheets.map((sheet) => sheet.properties.title);

    console.log(`✅ Detectadas ${sheetNames.length} abas via API:`, sheetNames);
    return sheetNames;
  } catch (error) {
    console.warn("⚠️ Erro ao usar API do Google Sheets:", error.message);
    console.log("↩️ Voltando para detecção via GID...");
    return null; // Volta para método com GID
  }
}

/**
 * Detecta abas via GID (fallback quando API não funciona)
 */
async function detectViaGID() {
  try {
    console.log("🔍 Detectando abas via GID...");

    const gidArray = [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
      21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38,
      39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 1181533628, 1584295234,
      718897533,
    ];

    const detectedSheets = [];

    for (const gid of gidArray) {
      try {
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
        const response = await fetch(url, { method: "HEAD" });

        if (response.ok) {
          // Se conseguiu acessar, tenta pegar o nome da aba
          const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`;
          const csvResponse = await fetch(csvUrl);

          if (csvResponse.ok) {
            const csv = await csvResponse.text();
            if (csv && csv.length > 0) {
              detectedSheets.push(`Sheet_${gid}`);
            }
          }
        }
      } catch (e) {
        // Continua tentando outros GIDs
      }
    }

    console.log(
      `✅ Detectadas ${detectedSheets.length} abas via GID:`,
      detectedSheets,
    );
    return detectedSheets;
  } catch (error) {
    console.error("❌ Erro ao detectar via GID:", error);
    return [];
  }
}

/**
 * Detecta TODAS as abas da planilha
 * Tenta API primeiro, depois GID
 */
async function getAllSheetNames() {
  try {
    // Tenta método 1: API do Google Sheets (100% automático)
    if (typeof API_KEY !== "undefined" && API_KEY) {
      console.log("📡 Usando API do Google Sheets para detectar abas...");
      const namesViaAPI = await getAllSheetNamesViaAPI();
      if (namesViaAPI && namesViaAPI.length > 0) {
        console.log("✅ Abas detectadas com sucesso via API");
        return namesViaAPI;
      }
    }

    // Tenta método 2: Detecção via GID (fallback)
    console.log("📡 API não disponível, usando detecção via GID...");
    const namesViaGID = await detectViaGID();
    return namesViaGID;
  } catch (error) {
    console.error("❌ Erro ao detectar abas:", error);
    return [];
  }
}

// ============================================
// FUNÇÕES DE CARREGAMENTO DE DADOS
// ============================================

/**
 * Busca dados de TODAS as abas da planilha
 */
async function fetchAllSheetsData() {
  try {
    state.isLoading = true;
    state.allScales = [];

    console.log("🚀 Iniciando carregamento de dados de todas as abas...");

    // Detecta automaticamente TODAS as abas da planilha
    console.log("🔍 Detectando abas automaticamente...");
    const sheetNames = await getAllSheetNames();

    if (sheetNames.length === 0) {
      console.warn(
        "⚠️ Aviso: Nenhuma aba foi detectada. Verifique a planilha.",
      );
      state.error = "Nenhuma aba foi detectada na planilha";
      state.isLoading = false;
      showError(state.error);
      return;
    }

    console.log(`📊 Detectadas ${sheetNames.length} abas:`, sheetNames);

    // Carrega dados de cada aba em paralelo
    const promises = sheetNames.map((sheetName) =>
      fetchSheetData(sheetName).then((scales) => {
        if (scales.length > 0) {
          console.log(`✅ Carregado: ${sheetName} (${scales.length} escalas)`);
        } else {
          console.warn(`⚠️ ${sheetName} não tem dados ou não foi acessada`);
        }
        return scales;
      }),
    );

    // Aguarda todas as requisições
    const allResults = await Promise.all(promises);

    // Consolida todos os resultados
    state.allScales = allResults.flat();

    // Remove duplicatas (mesma data, id e horário)
    state.allScales = removeDuplicates(state.allScales);

    console.log(`📈 Total de escalas carregadas: ${state.allScales.length}`);
    console.log("📅 Escalas por data:", groupScalesByDate(state.allScales));

    // Sempre inicia com o mês vigente (atual)
    state.currentMonth = new Date();
    state.currentMonth.setDate(1);

    state.isLoading = false;
    renderCalendar();
    renderScales();
  } catch (error) {
    console.error("❌ Erro ao carregar dados:", error);
    state.error = error.message;
    state.isLoading = false;
    showError(error.message);
  }
}

/**
 * Remove escalas duplicadas
 */
function removeDuplicates(scales) {
  const seen = new Map();
  return scales.filter((scale) => {
    const key = `${scale.date}-${scale.id}-${scale.time}`;
    if (seen.has(key)) {
      return false;
    }
    seen.set(key, scale.sheet);
    return true;
  });
}

/**
 * Agrupa escalas por data para debug
 */
function groupScalesByDate(scales) {
  const grouped = {};
  scales.forEach((scale) => {
    if (!grouped[scale.date]) {
      grouped[scale.date] = 0;
    }
    grouped[scale.date]++;
  });
  return grouped;
}

/**
 * Busca dados de uma aba específica
 */
async function fetchSheetData(sheetName) {
  try {
    let csv = null;

    // Método 1: Export CSV direto
    try {
      const url1 = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&sheet=${encodeURIComponent(sheetName)}`;
      const response1 = await fetch(url1, {
        method: "GET",
        mode: "cors",
      });

      if (response1.ok) {
        const text = await response1.text();
        if (
          text &&
          text.length > 0 &&
          !text.includes("<!DOCTYPE") &&
          !text.includes("<html")
        ) {
          csv = text;
          console.log(`  ✅ Exportado via CSV: ${sheetName}`);
        }
      }
    } catch (e) {
      console.warn(`  ⚠️ Método 1 falhou para ${sheetName}:`, e.message);
    }

    // Método 2: Via gviz
    if (!csv) {
      try {
        const url2 = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
        const response2 = await fetch(url2, {
          method: "GET",
          mode: "cors",
        });

        if (response2.ok) {
          const text = await response2.text();
          if (
            text &&
            text.length > 0 &&
            !text.includes("<!DOCTYPE") &&
            !text.includes("<html")
          ) {
            csv = text;
            console.log(`  ✅ Exportado via gviz: ${sheetName}`);
          }
        }
      } catch (e) {
        console.warn(`  ⚠️ Método 2 falhou para ${sheetName}:`, e.message);
      }
    }

    // Se conseguiu CSV, faz parse
    if (csv) {
      return parseCSV(csv, sheetName);
    }

    console.warn(`⚠️ Não conseguiu carregar dados de ${sheetName}`);
    return [];
  } catch (error) {
    console.warn(`⚠️ Aviso ao buscar ${sheetName}:`, error.message);
    return [];
  }
}

/**
 * Converte CSV para array de objetos
 */
function parseCSV(csv, sheetName = "Desconhecida") {
  const lines = csv.trim().split("\n");
  const scales = [];

  // Pula o cabeçalho (primeira linha)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();

    // Pula linhas vazias
    if (!line) continue;

    // Parse da linha CSV
    const parts = parseCSVLine(line);

    // Valida se tem os dados necessários (mínimo 5 colunas)
    if (parts.length >= 5) {
      const link = parts[0]?.trim();
      const id = parts[1]?.trim();
      const date = parts[2]?.trim();
      const timeStart = parts[3]?.trim();
      const timeEnd = parts[4]?.trim();

      // Valida dados
      if (id && date && timeStart && timeEnd) {
        // Formata o horário
        const time = `${timeStart}-${timeEnd}`;

        scales.push({
          link: link || "",
          id: id,
          date: date,
          time: time,
          sheet: sheetName,
        });
      }
    }
  }

  return scales;
}

/**
 * Parse de linha CSV (trata aspas e vírgulas)
 */
function parseCSVLine(line) {
  const result = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

/**
 * Parse de data no formato DD/MM/YYYY
 */
function parseDate(dateStr) {
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    return new Date(
      parseInt(parts[2]),
      parseInt(parts[1]) - 1,
      parseInt(parts[0]),
    );
  }
  return new Date();
}

/**
 * Formata data para DD/MM/YYYY
 */
function formatDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formata mês para exibição
 */
function formatMonthName(date) {
  const months = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

// ============================================
// FUNÇÕES DE RENDERIZAÇÃO
// ============================================

/**
 * Renderiza o calendário
 */
function renderCalendar() {
  const year = state.currentMonth.getFullYear();
  const month = state.currentMonth.getMonth();

  // Atualiza nome do mês
  monthNameEl.textContent = formatMonthName(state.currentMonth);

  // Limpa o calendário
  calendarGrid.innerHTML = "";

  // Primeiro dia do mês
  const firstDay = new Date(year, month, 1).getDay();
  // Último dia do mês
  const lastDay = new Date(year, month + 1, 0).getDate();

  // Adiciona dias vazios no início
  for (let i = 0; i < firstDay; i++) {
    const emptyDay = document.createElement("button");
    emptyDay.className = "calendar-day empty";
    emptyDay.disabled = true;
    calendarGrid.appendChild(emptyDay);
  }

  // Adiciona dias do mês
  for (let day = 1; day <= lastDay; day++) {
    const date = new Date(year, month, day);
    const dateStr = formatDate(date);
    const button = document.createElement("button");
    button.className = "calendar-day";
    button.textContent = day;

    // Verifica se tem escalas neste dia
    const hasScales = state.allScales.some((scale) => scale.date === dateStr);

    if (hasScales) {
      button.classList.add("available");
    }

    // Verifica se é a data selecionada
    if (state.selectedDate === dateStr) {
      button.classList.add("selected");
    }

    // Evento de clique
    button.addEventListener("click", () => selectDate(dateStr));

    calendarGrid.appendChild(button);
  }
}

/**
 * Seleciona uma data
 */
function selectDate(dateStr) {
  state.selectedDate = dateStr;
  renderCalendar();
  renderScales();
}

/**
 * Renderiza as escalas
 */
function renderScales() {
  scalesContainer.innerHTML = "";

  if (state.isLoading) {
    scalesContainer.innerHTML = '<div class="loading-spinner"></div>';
    return;
  }

  let scales = [];

  if (state.searchQuery) {
    // Modo de busca global
    scales = searchScalesGlobally(state.searchQuery);

    if (scales.length === 0) {
      scalesContainer.innerHTML =
        '<div class="no-results"><p>Nenhuma escala encontrada para: ' +
        state.searchQuery +
        "</p></div>";
      return;
    }

    const title = document.createElement("h2");
    title.className = "scales-title";
    title.textContent = `Resultados da busca: ${state.searchQuery}`;
    scalesContainer.appendChild(title);

    const count = document.createElement("p");
    count.className = "scales-count";
    count.textContent = `${scales.length} escala${scales.length !== 1 ? "s" : ""} encontrada${scales.length !== 1 ? "s" : ""}`;
    scalesContainer.appendChild(count);
  } else if (state.selectedDate) {
    // Modo de data selecionada
    scales = getScalesForDate(state.selectedDate);

    const title = document.createElement("h2");
    title.className = "scales-title";
    title.textContent = `Escalas para ${state.selectedDate}`;
    scalesContainer.appendChild(title);

    const count = document.createElement("p");
    count.className = "scales-count";
    count.textContent = `${scales.length} escala${scales.length !== 1 ? "s" : ""} dispon${scales.length !== 1 ? "íveis" : "ível"}`;
    scalesContainer.appendChild(count);

    if (scales.length === 0) {
      const noData = document.createElement("div");
      noData.className = "no-results";
      noData.innerHTML = "<p>Nenhuma escala disponível para esta data</p>";
      scalesContainer.appendChild(noData);
      return;
    }
  } else {
    scalesContainer.innerHTML =
      '<div class="no-selection"><p>Selecione uma data no calendário</p></div>';
    return;
  }

  // Renderiza lista de escalas
  const list = document.createElement("div");
  list.className = "scales-list";

  scales.forEach((scale) => {
    const isSearchResult = !!state.searchQuery;
    const card = createScaleCard(scale, isSearchResult);
    list.appendChild(card);
  });

  scalesContainer.appendChild(list);
}

/**
 * Obtém escalas para uma data específica
 */
function getScalesForDate(dateStr) {
  let scales = state.allScales.filter((scale) => scale.date === dateStr);

  // Ordena por horário
  scales.sort((a, b) => {
    const timeA = parseInt(a.time.split(":")[0]);
    const timeB = parseInt(b.time.split(":")[0]);
    return timeA - timeB;
  });

  return scales;
}

/**
 * Cria um card de escala
 */
function createScaleCard(scale, isSearchResult = false) {
  const card = document.createElement("div");
  card.className = "scale-card";

  if (isSearchResult) {
    card.classList.add("search-highlight");
  }

  const sheetDisplay = scale.sheet
    ? scale.sheet
        .replace(" ABRIL 2026", "")
        .replace(" MAIO 2026", "")
        .replace(" JUNHO 2026", "")
    : "Desconhecida";
  const idClass = isSearchResult ? "scale-id search-match" : "scale-id";
  const dateDisplay = isSearchResult
    ? `<span class="scale-date-badge">${scale.date}</span>`
    : "";

  card.innerHTML = `
        <div class="scale-header">
            <div class="scale-id-info">
                <span class="${idClass}">ID: ${scale.id}</span>
                ${dateDisplay}
                <span class="scale-time-badge">${scale.time}</span>
            </div>
            <span class="scale-sheet-badge">${sheetDisplay}</span>
        </div>
        <div class="scale-actions">
            <button class="btn btn-primary" onclick="window.open('${scale.link}', '_blank')">
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                Abrir e Imprimir
            </button>
        </div>
    `;

  return card;
}

/**
 * Copia link para clipboard
 */
function copyToClipboard(text) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      alert("Link copiado para a área de transferência!");
    })
    .catch((err) => {
      console.error("Erro ao copiar:", err);
    });
}

/**
 * Navega para o mês anterior
 */
function previousMonth() {
  state.currentMonth.setMonth(state.currentMonth.getMonth() - 1);
  renderCalendar();
}

/**
 * Navega para o próximo mês
 */
function nextMonth() {
  state.currentMonth.setMonth(state.currentMonth.getMonth() + 1);
  renderCalendar();
}

/**
 * Filtra escalas por busca
 */
function handleSearch(event) {
  state.searchQuery = event.target.value.toLowerCase();

  if (state.searchQuery) {
    clearSearchBtn.style.display = "block";
  } else {
    clearSearchBtn.style.display = "none";
  }

  renderScales();
}

/**
 * Limpa a busca
 */
function clearSearch() {
  state.searchQuery = "";
  searchInput.value = "";
  clearSearchBtn.style.display = "none";
  renderScales();
}

/**
 * Busca escalas por ID em TODAS as datas
 */
function searchScalesGlobally(query) {
  if (!query) {
    return [];
  }

  return state.allScales
    .filter((scale) => scale.id.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      return dateA - dateB;
    });
}

/**
 * Mostra mensagem de erro
 */
function showError(message) {
  scalesContainer.innerHTML = `<div class="error-message"><p>❌ Erro: ${message}</p></div>`;
}

/**
 * Gera a URL de exportacao CSV para uma aba
 */
function getSheetExportUrl(sheetName) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
}

/**
 * Gera URL alternativa de exportacao
 */
function getSheetExportUrlAlternative(sheetName) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&sheet=${encodeURIComponent(sheetName)}`;
}

// ============================================
// EVENT LISTENERS
// ============================================

prevMonthBtn.addEventListener("click", previousMonth);
nextMonthBtn.addEventListener("click", nextMonth);
searchInput.addEventListener("input", handleSearch);
clearSearchBtn.addEventListener("click", clearSearch);

// ============================================
// INICIALIZAÇÃO
// ============================================

function init() {
  console.log("🚀 Iniciando Sistema de Escalas...");
  console.log("📋 SHEET_ID:", SHEET_ID);
  console.log(
    "🔑 API_KEY configurada:",
    typeof API_KEY !== "undefined" && !!API_KEY,
  );
  fetchAllSheetsData();
}

// Inicia a aplicação quando o DOM estiver pronto
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
