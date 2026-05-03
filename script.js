/**
 * SISTEMA DE ESCALAS - LÓGICA PRINCIPAL
 * Integração com Google Sheets para dados dinâmicos
 * Carrega TODAS as abas e consolida as escalas por data
 */

// Estado da aplicação
let state = {
    selectedDate: '',
    currentMonth: new Date(),
    filteredScales: [],
    allScales: [],
    allSheetNames: [],
    isLoading: true,
    error: null,
    searchQuery: ''  // Novo: termo de busca
};

// Elementos do DOM
const calendarGrid = document.getElementById('calendarGrid');
const scalesContainer = document.getElementById('scalesContainer');
const monthNameEl = document.getElementById('monthName');
const prevMonthBtn = document.getElementById('prevMonthBtn');
const nextMonthBtn = document.getElementById('nextMonthBtn');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');

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
        
        console.log('Iniciando carregamento de dados de todas as abas...');
        
        // Lista de abas conhecidas para tentar carregar
        const sheetNames = [
            'ABRIL 2026',
            'CABINE LILÁS ABRIL 2026',
            'OFICIAIS ABRIL 2026',
            'MAIO 2026',
            'OFICIAIS MAIO 2026',
            'JUNHO 2026',
            'JULHO 2026',
            'AGOSTO 2026',
            'SETEMBRO 2026',
            'OUTUBRO 2026',
            'NOVEMBRO 2026',
            'DEZEMBRO 2026',
            'EM BRANCO'
        ];
        
        // Carrega dados de cada aba em paralelo
        const promises = sheetNames.map(sheetName => 
            fetchSheetData(sheetName)
                .then(scales => {
                    console.log(`✓ Carregado: ${sheetName} (${scales.length} escalas)`);
                    return scales;
                })
                .catch(error => {
                    console.warn(`⚠ Erro ao carregar ${sheetName}:`, error.message);
                    return [];
                })
        );
        
        // Aguarda todas as requisições
        const allResults = await Promise.all(promises);
        
        // Consolida todos os resultados
        state.allScales = allResults.flat();
        
        // Remove duplicatas (mesma data, id e horário)
        state.allScales = removeDuplicates(state.allScales);
        
        console.log(`✓ Total de escalas carregadas: ${state.allScales.length}`);
        console.log('Escalas por data:', groupScalesByDate(state.allScales));
        
        // Sempre inicia com o mês vigente (atual)
        state.currentMonth = new Date();
        state.currentMonth.setDate(1);  // Garante que começa no dia 1 do mês
        
        state.isLoading = false;
        renderCalendar();
        renderScales();
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        state.error = error.message;
        state.isLoading = false;
        showError(error.message);
    }
}

/**
 * Remove escalas duplicadas (mantém a primeira ocorrência)
 */
function removeDuplicates(scales) {
    const seen = new Map();
    return scales.filter(scale => {
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
    scales.forEach(scale => {
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
    const url = getSheetExportUrl(sheetName);
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'text/csv'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const csv = await response.text();
        
        // Verifica se a resposta é válida
        if (!csv || csv.includes('<!DOCTYPE') || csv.includes('<html')) {
            throw new Error('Resposta inválida do servidor');
        }
        
        return parseCSV(csv, sheetName);
        
    } catch (error) {
        console.error(`Erro ao buscar ${sheetName}:`, error);
        throw error;
    }
}

/**
 * Converte CSV para array de objetos
 * Estrutura esperada: LINK | ID | DATA | HORA_INICIO | HORA_FIM
 */
function parseCSV(csv, sheetName = 'Desconhecida') {
    const lines = csv.trim().split('\n');
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
            const datePart = parts[2]?.trim();
            const timeStart = parts[3]?.trim();
            const timeEnd = parts[4]?.trim();
            
            // Só adiciona se tiver link, id e data
            if (link && id && datePart) {
                // Monta o horário no formato HH:MM-HH:MM
                let timePart = '00:00';
                if (timeStart) {
                    timePart = timeStart;
                    if (timeEnd) {
                        timePart = `${timeStart}-${timeEnd}`;
                    }
                }
                
                // Valida formato da data
                if (isValidDate(datePart)) {
                    const scaleObj = {
                        id: id,
                        date: datePart,
                        time: timePart,
                        link: link,
                        sheet: sheetName  // Adiciona informação da aba
                    };
                    scales.push(scaleObj);
                    console.log(`[${sheetName}] Escala: ID=${id}, Data=${datePart}, Hora=${timePart}`);
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
    let current = '';
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
        } else if (char === ',' && !insideQuotes) {
            result.push(current);
            current = '';
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
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * Converte string DD/MM/YYYY para objeto Date
 */
function parseDate(dateStr) {
    const [day, month, year] = dateStr.split('/').map(Number);
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
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${months[date.getMonth()]} De ${date.getFullYear()}`;
}

/**
 * Verifica se uma data tem escalas disponíveis
 */
function hasScales(dateStr) {
    return state.allScales.some(scale => scale.date === dateStr);
}

/**
 * Extrai a hora de início em minutos desde a meia-noite
 * Suporta formatos: "06:00", "06:00-14:00", "22:00-06:00"
 */
function extractStartTime(timeStr) {
    if (!timeStr) return 0;
    
    // Pega a primeira parte (antes do hífen)
    const startTime = timeStr.split('-')[0].trim();
    
    // Converte HH:MM para minutos
    const [hours, minutes] = startTime.split(':').map(Number);
    return hours * 60 + (minutes || 0);
}

/**
 * Obtém escalas para uma data específica
 */
function getScalesForDate(dateStr) {
    return state.allScales.filter(scale => scale.date === dateStr)
        .sort((a, b) => {
            // Extrai hora de início para comparação numérica
            const timeA = extractStartTime(a.time);
            const timeB = extractStartTime(b.time);
            return timeA - timeB;
        });
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
    calendarGrid.innerHTML = '';

    // Adiciona dias vazios no início
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('button');
        emptyDay.className = 'calendar-day empty';
        emptyDay.disabled = true;
        calendarGrid.appendChild(emptyDay);
    }

    // Adiciona dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = formatDate(
            new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth(), day)
        );

        const dayBtn = document.createElement('button');
        dayBtn.className = 'calendar-day';
        dayBtn.textContent = day;

        // Determina classe baseado no estado
        if (state.selectedDate === dateStr) {
            dayBtn.classList.add('selected');
        } else if (hasScales(dateStr)) {
            dayBtn.classList.add('available');
        } else {
            dayBtn.classList.add('unavailable');
            dayBtn.disabled = true;
        }

        // Event listener
        dayBtn.addEventListener('click', () => {
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
        state.currentMonth.getMonth() - 1
    );
    renderCalendar();
}

/**
 * Navega para o próximo mês
 */
function nextMonth() {
    state.currentMonth = new Date(
        state.currentMonth.getFullYear(),
        state.currentMonth.getMonth() + 1
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
    scalesContainer.innerHTML = '';

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

    // Se tem busca, mostra resultados globais
    if (state.searchQuery) {
        const searchResults = searchScalesGlobally(state.searchQuery);
        
        if (searchResults.length === 0) {
            scalesContainer.innerHTML = `
                <div class="card">
                    <div class="empty-state">
                        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="m21 21-4.35-4.35"></path>
                        </svg>
                        <h3 class="empty-state-title">Nenhuma escala encontrada</h3>
                        <p class="empty-state-text">Não há escalas com ID contendo "${state.searchQuery}"</p>
                    </div>
                </div>
            `;
            return;
        }
        
        // Renderiza resultados de busca
        const header = document.createElement('div');
        header.innerHTML = `
            <h2 class="scales-title">Resultados da Busca</h2>
            <p class="scales-count">${searchResults.length} escala${searchResults.length !== 1 ? 's' : ''} encontrada${searchResults.length !== 1 ? 's' : ''}</p>
        `;
        scalesContainer.appendChild(header);
        
        const list = document.createElement('div');
        list.className = 'scales-list';
        
        searchResults.forEach(scale => {
            const card = createScaleCard(scale, true);
            list.appendChild(card);
        });
        
        scalesContainer.appendChild(list);
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
    const header = document.createElement('div');
    header.innerHTML = `
        <h2 class="scales-title">Escalas para ${state.selectedDate}</h2>
        <p class="scales-count">${state.filteredScales.length} escala${state.filteredScales.length !== 1 ? 's' : ''} disponível${state.filteredScales.length !== 1 ? 's' : ''}</p>
    `;
    scalesContainer.appendChild(header);

    // Filtra escalas por busca (se houver)
    let displayScales = filterScalesBySearch(state.filteredScales);
    
    // Renderiza lista de escalas
    const list = document.createElement('div');
    list.className = 'scales-list';

    displayScales.forEach((scale, index) => {
        const card = createScaleCard(scale);
        list.appendChild(card);
    });

    scalesContainer.appendChild(list);
}

/**
 * Cria um card de escala
 */
function createScaleCard(scale, isSearchResult = false) {
    const card = document.createElement('div');
    card.className = 'scale-card';
    
    // Adiciona classe de destaque se for resultado de busca
    if (isSearchResult) {
        card.classList.add('search-highlight');
    }

    // Formata o nome da aba para exibição
    const sheetDisplay = scale.sheet ? scale.sheet.replace(' ABRIL 2026', '').replace(' MAIO 2026', '').replace(' JUNHO 2026', '') : 'Desconhecida';

    // Destaca o ID se for resultado de busca
    const idClass = isSearchResult ? 'scale-id search-match' : 'scale-id';
    
    // Se for resultado de busca, adiciona a data
    const dateDisplay = isSearchResult ? `<span class="scale-date-badge">${scale.date}</span>` : '';
    
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
            <button class="btn btn-primary" onclick="openScale('${scale.link.replace(/'/g, "\\'")}')">
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                </svg>
                Abrir
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
    window.open(link, '_blank');
}

/**
 * Copia o link para a área de transferência
 */
function copyLink(link) {
    navigator.clipboard.writeText(link).then(() => {
        // Feedback visual
        const btn = event.target.closest('.btn-secondary');
        const originalText = btn.textContent;
        btn.textContent = 'Copiado!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Erro ao copiar:', err);
        alert('Erro ao copiar o link');
    });
}

// ============================================
// FUNÇÕES DE BUSCA
// ============================================

/**
 * Manipula entrada de busca
 */
function handleSearch(event) {
    state.searchQuery = event.target.value.trim().toLowerCase();
    
    // Atualiza visibilidade do botão de limpar
    if (state.searchQuery) {
        clearSearchBtn.classList.add('visible');
    } else {
        clearSearchBtn.classList.remove('visible');
    }
    
    // Re-renderiza as escalas com filtro de busca
    renderScales();
}

/**
 * Limpa a busca
 */
function clearSearch() {
    state.searchQuery = '';
    searchInput.value = '';
    clearSearchBtn.classList.remove('visible');
    renderScales();
}

/**
 * Filtra escalas por ID de busca
 */
function filterScalesBySearch(scales) {
    if (!state.searchQuery) {
        return scales;
    }
    
    return scales.filter(scale => 
        scale.id.toLowerCase().includes(state.searchQuery)
    );
}

/**
 * Busca escalas por ID em TODAS as datas
 */
function searchScalesGlobally(query) {
    if (!query) {
        return [];
    }
    
    return state.allScales.filter(scale => 
        scale.id.toLowerCase().includes(query.toLowerCase())
    ).sort((a, b) => {
        // Ordena por data
        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);
        return dateA - dateB;
    });
}

// ============================================
// EVENT LISTENERS
// ============================================

prevMonthBtn.addEventListener('click', previousMonth);
nextMonthBtn.addEventListener('click', nextMonth);
searchInput.addEventListener('input', handleSearch);
clearSearchBtn.addEventListener('click', clearSearch);

// ============================================
// INICIALIZAÇÃO
// ============================================

function init() {
    console.log('Iniciando Sistema de Escalas...');
    fetchAllSheetsData();
}

// Inicia a aplicação quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
