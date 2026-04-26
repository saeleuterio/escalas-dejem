/**
 * SISTEMA DE ESCALAS - LÓGICA PRINCIPAL
 * Integração com Google Sheets para dados dinâmicos
 */

// Estado da aplicação
let state = {
  selectedDate: "",
  currentMonth: new Date(),
  filteredScales: [],
  allScales: [],
  isLoading: true,
  error: null,
};

// Elementos do DOM
const calendarGrid = document.getElementById("calendarGrid");
const scalesContainer = document.getElementById("scalesContainer");
const monthNameEl = document.getElementById("monthName");
const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");

// ============================================
// FUNÇÕES DE CARREGAMENTO DE DADOS
// ============================================

/**
 * Busca dados da planilha Google Sheets
 */
async function fetchSheetsData() {
  try {
    state.isLoading = true;
    state.allScales = [];

    console.log("Iniciando carregamento de dados...");

    // Carrega dados de cada aba
    for (const sheetName of SHEET_NAMES) {
      try {
        const scales = await fetchSheetData(sheetName);
        state.allScales.push(...scales);
        console.log(`✓ Carregado: ${sheetName} (${scales.length} escalas)`);
      } catch (error) {
        console.warn(`⚠ Erro ao carregar ${sheetName}:`, error.message);
      }
    }

    console.log(`✓ Total de escalas carregadas: ${state.allScales.length}`);

    // Se conseguiu carregar dados, define o mês inicial baseado nos dados
    if (state.allScales.length > 0) {
      const firstDate = parseDate(state.allScales[0].date);
      state.currentMonth = new Date(
        firstDate.getFullYear(),
        firstDate.getMonth(),
        1,
      );
    }

    state.isLoading = false;
    renderCalendar();
    renderScales();
  } catch (error) {
    console.error("Erro ao carregar dados:", error);
    state.error = error.message;
    state.isLoading = false;
    showError(error.message);
  }
}

/**
 * Busca dados de uma aba específica
 */
async function fetchSheetData(sheetName) {
  const url = getSheetExportUrlV2(sheetName);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const csv = await response.text();
    return parseCSV(csv);
  } catch (error) {
    console.error(`Erro ao buscar ${sheetName}:`, error);
    throw error;
  }
}

/**
 * Converte CSV para array de objetos
 */
function parseCSV(csv) {
  const lines = csv.trim().split("\n");
  const scales = [];

  // Pula o cabeçalho (primeira linha)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();

    // Pula linhas vazias
    if (!line) continue;

    // Parse da linha CSV
    const parts = parseCSVLine(line);

    // Valida se tem os dados necessários
    if (parts.length >= 3) {
      const link = parts[COLUMNS.LINK]?.trim();
      const id = parts[COLUMNS.ID]?.trim();
      const dateTimeStr = parts[COLUMNS.DATE_TIME]?.trim();

      // Só adiciona se tiver link e id
      if (link && id && dateTimeStr) {
        // Extrai data e hora do formato "DD/MM/YYYY HH:MM"
        const [datePart, timePart] = dateTimeStr.split(" ");

        // Valida formato da data
        if (isValidDate(datePart)) {
          scales.push({
            id: id,
            date: datePart,
            time: timePart || "00:00",
            link: link,
          });
        }
      }
    }
  }

  return scales;
}

/**
 * Parse de linha CSV considerando aspas
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
 * Valida formato de data DD/MM/YYYY
 */
function isValidDate(dateStr) {
  const regex = /^\d{2}\/\d{2}\/\d{4}$/;
  return regex.test(dateStr);
}

/**
 * Exibe mensagem de erro
 */
function showError(message) {
  scalesContainer.innerHTML = `
        <div class="card">
            <div class="empty-state">
                <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <h3 class="empty-state-title">Erro ao carregar dados</h3>
                <p class="empty-state-text">${message}</p>
                <button class="btn btn-primary" style="margin-top: 1rem;" onclick="location.reload()">
                    Tentar novamente
                </button>
            </div>
        </div>
    `;
}

// ============================================
// FUNÇÕES DE DATA
// ============================================

/**
 * Formata uma data para DD/MM/YYYY
 */
function formatDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Converte string DD/MM/YYYY para objeto Date
 */
function parseDate(dateStr) {
  const [day, month, year] = dateStr.split("/").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Obtém número de dias no mês
 */
function getDaysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/**
 * Obtém primeiro dia da semana do mês (0 = domingo)
 */
function getFirstDayOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
}

/**
 * Obtém nome do mês em português
 */
function getMonthName(date) {
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
  return `${months[date.getMonth()]} De ${date.getFullYear()}`;
}

/**
 * Verifica se uma data tem escalas disponíveis
 */
function hasScales(dateStr) {
  return state.allScales.some((scale) => scale.date === dateStr);
}

/**
 * Obtém escalas para uma data específica
 */
function getScalesForDate(dateStr) {
  return state.allScales.filter((scale) => scale.date === dateStr);
}

// ============================================
// FUNÇÕES DE CALENDÁRIO
// ============================================

/**
 * Renderiza o calendário
 */
function renderCalendar() {
  const daysInMonth = getDaysInMonth(state.currentMonth);
  const firstDay = getFirstDayOfMonth(state.currentMonth);

  // Limpa o grid
  calendarGrid.innerHTML = "";

  // Adiciona dias vazios no início
  for (let i = 0; i < firstDay; i++) {
    const emptyDay = document.createElement("button");
    emptyDay.className = "calendar-day empty";
    emptyDay.disabled = true;
    calendarGrid.appendChild(emptyDay);
  }

  // Adiciona dias do mês
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDate(
      new Date(
        state.currentMonth.getFullYear(),
        state.currentMonth.getMonth(),
        day,
      ),
    );

    const dayBtn = document.createElement("button");
    dayBtn.className = "calendar-day";
    dayBtn.textContent = day;

    // Determina classe baseado no estado
    if (state.selectedDate === dateStr) {
      dayBtn.classList.add("selected");
    } else if (hasScales(dateStr)) {
      dayBtn.classList.add("available");
    } else {
      dayBtn.classList.add("unavailable");
      dayBtn.disabled = true;
    }

    // Event listener
    dayBtn.addEventListener("click", () => {
      selectDate(dateStr);
    });

    calendarGrid.appendChild(dayBtn);
  }

  // Atualiza nome do mês
  monthNameEl.textContent = getMonthName(state.currentMonth);
}

/**
 * Seleciona uma data
 */
function selectDate(dateStr) {
  state.selectedDate = dateStr;
  state.filteredScales = getScalesForDate(dateStr);
  renderCalendar();
  renderScales();
}

/**
 * Navega para o mês anterior
 */
function previousMonth() {
  state.currentMonth = new Date(
    state.currentMonth.getFullYear(),
    state.currentMonth.getMonth() - 1,
  );
  renderCalendar();
}

/**
 * Navega para o próximo mês
 */
function nextMonth() {
  state.currentMonth = new Date(
    state.currentMonth.getFullYear(),
    state.currentMonth.getMonth() + 1,
  );
  renderCalendar();
}

// ============================================
// FUNÇÕES DE ESCALAS
// ============================================

/**
 * Renderiza a lista de escalas
 */
function renderScales() {
  scalesContainer.innerHTML = "";

  if (state.isLoading) {
    scalesContainer.innerHTML = `
            <div class="card">
                <div class="empty-state">
                    <div class="loading-spinner"></div>
                    <h3 class="empty-state-title">Carregando dados...</h3>
                    <p class="empty-state-text">Conectando com a planilha do Google Sheets</p>
                </div>
            </div>
        `;
    return;
  }

  if (!state.selectedDate) {
    // Estado vazio - nenhuma data selecionada
    scalesContainer.innerHTML = `
            <div class="card">
                <div class="empty-state">
                    <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <h3 class="empty-state-title">Selecione uma data</h3>
                    <p class="empty-state-text">Clique em uma data no calendário à esquerda para visualizar as escalas disponíveis</p>
                </div>
            </div>
        `;
    return;
  }

  if (state.filteredScales.length === 0) {
    // Estado vazio - data sem escalas
    scalesContainer.innerHTML = `
            <div class="card">
                <div class="empty-state">
                    <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <h3 class="empty-state-title">Nenhuma escala disponível</h3>
                    <p class="empty-state-text">Não há escalas registradas para ${state.selectedDate}</p>
                </div>
            </div>
        `;
    return;
  }

  // Renderiza cabeçalho
  const header = document.createElement("div");
  header.innerHTML = `
        <h2 class="scales-title">Escalas para ${state.selectedDate}</h2>
        <p class="scales-count">${state.filteredScales.length} escala${state.filteredScales.length !== 1 ? "s" : ""} disponível${state.filteredScales.length !== 1 ? "s" : ""}</p>
    `;
  scalesContainer.appendChild(header);

  // Renderiza lista de escalas
  const list = document.createElement("div");
  list.className = "scales-list";

  state.filteredScales.forEach((scale, index) => {
    const card = createScaleCard(scale);
    list.appendChild(card);
  });

  scalesContainer.appendChild(list);
}

/**
 * Cria um card de escala
 */
function createScaleCard(scale) {
  const card = document.createElement("div");
  card.className = "scale-card";

  card.innerHTML = `
        <div class="scale-header">
            <span class="scale-id">ID: ${scale.id}</span>
            <span class="scale-time">${scale.time}</span>
        </div>
        <p class="scale-link-info">
            <svg class="scale-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
            Link da escala no sistema
        </p>
        <div class="scale-actions">
            <button class="btn btn-primary" onclick="openScale('${scale.link.replace(/'/g, "\\'")}')">
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                </svg>
                Abrir e Imprimir
            </button>
            <button class="btn btn-secondary" onclick="copyLink('${scale.link.replace(/'/g, "\\'")}')">
                Copiar Link
            </button>
        </div>
    `;

  return card;
}

/**
 * Abre a escala em nova aba
 */
function openScale(link) {
  window.open(link, "_blank");
}

/**
 * Copia o link para a área de transferência
 */
function copyLink(link) {
  navigator.clipboard
    .writeText(link)
    .then(() => {
      // Feedback visual
      const btn = event.target.closest(".btn-secondary");
      const originalText = btn.textContent;
      btn.textContent = "Copiado!";
      setTimeout(() => {
        btn.textContent = originalText;
      }, 2000);
    })
    .catch((err) => {
      console.error("Erro ao copiar:", err);
      alert("Erro ao copiar o link");
    });
}

// ============================================
// EVENT LISTENERS
// ============================================

prevMonthBtn.addEventListener("click", previousMonth);
nextMonthBtn.addEventListener("click", nextMonth);

// ============================================
// INICIALIZAÇÃO
// ============================================

function init() {
  console.log("Iniciando Sistema de Escalas...");
  fetchSheetsData();
}

// Inicia a aplicação quando o DOM estiver pronto
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
