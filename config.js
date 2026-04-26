/**
 * CONFIGURAÇÃO - INTEGRAÇÃO COM GOOGLE SHEETS
 *
 * Para usar este sistema, você precisa:
 * 1. Publicar a planilha do Google Sheets como CSV
 * 2. Copiar o ID da planilha
 * 3. Configurar as abas (sheets) que deseja usar
 */

// ============================================
// CONFIGURAÇÃO DA PLANILHA
// ============================================

// ID da planilha do Google Sheets
// Encontre na URL: https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit
const SHEET_ID = "1yfqi7AQYeFrTue1H5rYM3iBugsmuKlXjvgpdKMto12Y";

// Nomes das abas (sheets) que contêm as escalas
// Exemplo: ['ABRIL 2026', 'MAIO 2026', 'JUNHO 2026']
const SHEET_NAMES = [
  "ABRIL 2026",
  "MAIO 2026",
  "JUNHO 2026",
  "JULHO 2026",
  "AGOSTO 2026",
  "SETEMBRO 2026",
  "OUTUBRO 2026",
  "NOVEMBRO 2026",
  "DEZEMBRO 2026",
];

// Colunas esperadas na planilha (em ordem)
// A planilha deve ter: LINK | ID | DATA/HORA
const COLUMNS = {
  LINK: 0, // Coluna A - Link da escala
  ID: 1, // Coluna B - ID da escala
  DATE_TIME: 2, // Coluna C - Data e Hora
};

// ============================================
// FUNÇÃO PARA GERAR URL DE EXPORTAÇÃO
// ============================================

/**
 * Gera a URL de exportação CSV para uma aba específica
 * @param {string} sheetName - Nome da aba
 * @returns {string} URL de exportação
 */
function getSheetExportUrl(sheetName) {
  // Encontra o gid (ID da aba) pela posição
  // Para abas customizadas, você pode precisar ajustar isso
  const sheetIndex = SHEET_NAMES.indexOf(sheetName);
  const gid = 1181533628 + sheetIndex * 1000; // Ajuste conforme necessário

  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
}

/**
 * Gera a URL de exportação CSV usando a API do Google Sheets
 * Esta é uma abordagem alternativa mais confiável
 * @param {string} sheetName - Nome da aba
 * @returns {string} URL de exportação
 */
function getSheetExportUrlV2(sheetName) {
  // Usa a API de exportação do Google Sheets
  // Formato: /export?format=csv&gid=SHEET_ID
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
}

/**
 * Gera a URL de exportação usando CORS proxy (se necessário)
 * @param {string} sheetName - Nome da aba
 * @returns {string} URL de exportação
 */
function getSheetExportUrlWithProxy(sheetName) {
  const baseUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  // Se tiver problemas de CORS, use um proxy CORS
  return baseUrl;
}

// ============================================
// VALIDAÇÃO DE CONFIGURAÇÃO
// ============================================

console.log("✓ Configuração carregada");
console.log("  ID da Planilha:", SHEET_ID);
console.log("  Abas configuradas:", SHEET_NAMES.length);
console.log("  Abas:", SHEET_NAMES.join(", "));
