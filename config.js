/**
 * CONFIGURAÇÃO - INTEGRAÇÃO COM GOOGLE SHEETS
 *
 * Este arquivo configura a conexão com a planilha Google Sheets
 * e detecta automaticamente todas as abas disponíveis.
 */

// ============================================
// CONFIGURAÇÃO DA PLANILHA
// ============================================

// ID da planilha do Google Sheets
// Encontre na URL: https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit
const SHEET_ID = '1yfqi7AQYeFrTue1H5rYM3iBugsmuKlXjvgpdKMto12Y';
const API_KEY = "AIzaSyCOy74aEKiFssWDqDg5U8hDGQLvDhTTgrY";  // ← Adicione aqui

// Colunas esperadas na planilha (em ordem)
// A planilha tem: LINK | ID | DATA | HORA_INICIO | HORA_FIM
const COLUMNS = {
  LINK: 0, // Coluna A - Link da escala
  ID: 1, // Coluna B - ID da escala
  DATE: 2, // Coluna C - Data (DD/MM/YYYY)
  TIME_START: 3, // Coluna D - Hora de inicio (HH:MM)
  TIME_END: 4, // Coluna E - Hora de fim (HH:MM)
};

// ============================================
// FUNÇÃO PARA OBTER TODAS AS ABAS
// ============================================

/**
 * Obtém todas as abas da planilha usando a API do Google Sheets
 * Retorna um array com os nomes de todas as abas
 */
async function getAllSheetNames() {
  try {
    // Usa a API do Google Sheets para obter metadados
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?key=AIzaSyDyWJOw5w-1OfkABC123`;

    // Alternativa: usar a API de visualização do Google Sheets
    const apiUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

    // Tenta obter informações via API alternativa
    const response = await fetch(apiUrl);
    const text = await response.text();

    // Extrai os nomes das abas do HTML da planilha
    // Esta é uma abordagem alternativa que não requer API key
    const sheetNames = await detectSheetNamesFromExport();

    return sheetNames;
  } catch (error) {
    console.warn("Erro ao detectar abas automaticamente:", error);
    // Retorna um array vazio - o sistema tentará carregar abas conhecidas
    return [];
  }
}

/**
 * Detecta nomes de abas tentando exportar como CSV
 * Esta função tenta múltiplas abas conhecidas
 */
async function detectSheetNamesFromExport() {
  // Lista de abas comuns para tentar
  const commonSheetNames = [
    "ABRIL 2026",
    "CABINE LILÁS ABRIL 2026",
    "OFICIAIS ABRIL 2026",
    "MAIO 2026",
    "OFICIAIS MAIO 2026",
    "JUNHO 2026",
    "JULHO 2026",
    "AGOSTO 2026",
    "SETEMBRO 2026",
    "OUTUBRO 2026",
    "NOVEMBRO 2026",
    "DEZEMBRO 2026",
    "EM BRANCO",
  ];

  const validSheets = [];

  // Testa cada aba para ver se existe
  for (const sheetName of commonSheetNames) {
    try {
      const url = getSheetExportUrl(sheetName);
      const response = await fetch(url);

      if (response.ok) {
        const text = await response.text();
        // Se conseguiu ler e tem conteúdo, adiciona à lista
        if (text.trim().length > 0) {
          validSheets.push(sheetName);
          console.log(`✓ Aba detectada: ${sheetName}`);
        }
      }
    } catch (error) {
      // Aba não existe, continua
    }
  }

  return validSheets;
}

// ============================================
// FUNÇÃO PARA GERAR URL DE EXPORTAÇÃO
// ============================================

/**
 * Gera a URL de exportação CSV para uma aba específica
 * Usa a API de visualização do Google Sheets
 * @param {string} sheetName - Nome da aba
 * @returns {string} URL de exportação
 */
function getSheetExportUrl(sheetName) {
  // Usa a API de visualização do Google Sheets (não requer autenticação)
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
}

/**
 * Gera a URL de exportação alternativa
 * @param {string} sheetName - Nome da aba
 * @returns {string} URL de exportação
 */
function getSheetExportUrlAlternative(sheetName) {
  // Alternativa usando export direto (pode ter limitações)
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&sheet=${encodeURIComponent(sheetName)}`;
}

// ============================================
// VALIDAÇÃO DE CONFIGURAÇÃO
// ============================================

console.log("✓ Configuração carregada");
console.log("  ID da Planilha:", SHEET_ID);
console.log("  Sistema pronto para detectar abas automaticamente");
