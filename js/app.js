const APP = {
  files: [],
  rootName: "",
  entryMode: "analysis",
  sourceMode: "none",
  manualProductName: "",
  manualFallback: { lotNo: "", waferId: "", station: "", pendingFiles: [] },
  products: new Map(),
  activeStation: "",
  activeProduct: "",
  chartSortProduct: "",
  chartFilters: { product: [], process: [], density: [], voltage: [] },
  enableAnomalyDetail: false,
  tableSort: { key: "mean", dir: "desc" },
  tableExpanded: new Set(),
  tableCollapsed: true,
  scopeCollapsed: false,
  kpiCollapsed: false,
  chartCollapsed: false,
  selectedScopes: new Set(),
  charts: { count: null, mean: null, range: null, ratio: null },
};

const ROOT_REGEX = /^RW_(.+)_([^_]+)_([^_]+)_([^_]+)_(\d{14})$/i;
const PRODUCT_ROOT_REGEX = /^(EAG|FAG|AAG|KAG|MAG|RAG)\S*$/i;
const TEST_TIME_REGEX = /<<<\s*Test Time\s*>>>\s*,\s*(\d+)\s*,\s*([^,]+?)\s*,\s*([+-]?\d*\.?\d+)\s*,\s*\(([^)]+)\)/i;
const TOTAL_TEST_TIME_REGEX = /:(\d+):Total Test Time\s*=\s*([+-]?\d*\.?\d+)\s*\(S\)/i;
const RAW_TXT_FILENAME_REGEX = /^([^_]+)_Wafer(\d+)_([0-9]{14})_S(\d+)\.txt$/i;
const LINE_PREFIX_META_REGEX = /^[^:]+:([^:]+):([^:,]+),([^:]+):([^:]+):/;

const PRODUCT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#a855f7", "#06b6d4", "#ef4444", "#84cc16", "#f97316"];

const dom = {
  pickBtn: document.getElementById("pick-btn"),
  folderInput: document.getElementById("folder-input"),
  txtInput: document.getElementById("txt-input"),
  xlsxInput: document.getElementById("xlsx-input"),
  sourceModeGroup: document.getElementById("source-mode-group"),
  sourceRuleText: document.getElementById("source-rule-text"),
  sourceModeRadios: document.querySelectorAll('input[name="source-mode"]'),
  productInput: document.getElementById("product-input"),
  anomalyDetailToggle: document.getElementById("anomaly-detail-toggle"),
  folderName: document.getElementById("folder-name"),
  folderMeta: document.getElementById("folder-meta"),
  scopeSelectPanel: document.getElementById("scope-select-panel"),
  scopeSelectSummary: document.getElementById("scope-select-summary"),
  scopeSelectList: document.getElementById("scope-select-list"),
  scopeSelectAll: document.getElementById("scope-select-all"),
  scopeSelectNone: document.getElementById("scope-select-none"),
  scopeToggleBtn: document.getElementById("scope-toggle-btn"),
  entryTabAnalysis: document.getElementById("entry-tab-analysis"),
  entryTabXlsx: document.getElementById("entry-tab-xlsx"),
  entryTabGuide: document.getElementById("entry-tab-guide"),
  themeToggleBtn: document.getElementById("theme-toggle-btn"),
  analysisPage: document.getElementById("analysis-page"),
  guidePage: document.getElementById("guide-page"),
  guideContent: document.getElementById("guide-content"),
  message: document.getElementById("message"),
  manualEntryHint: document.getElementById("manual-entry-hint"),
  analyzeBtn: document.getElementById("analyze-btn"),
  exportBtn: document.getElementById("export-btn"),
  progressWrap: document.getElementById("progress-wrap"),
  progressBar: document.getElementById("progress-bar"),
  stationTabsSection: document.getElementById("station-tabs-section"),
  stationTabs: document.getElementById("station-tabs"),
  kpiToggleBtn: document.getElementById("kpi-toggle-btn"),
  tableProductTabs: document.getElementById("table-product-tabs"),
  tableToggleBtn: document.getElementById("table-toggle-btn"),
  tableContent: document.getElementById("table-content"),
  siteProductTabs: document.getElementById("site-product-tabs"),
  kpiSection: document.getElementById("kpi-section"),
  chartSection: document.getElementById("chart-section"),
  chartSortProduct: document.getElementById("chart-sort-product"),
  chartFilterProductBtn: document.getElementById("chart-filter-product-btn"),
  chartFilterProductMenu: document.getElementById("chart-filter-product-menu"),
  chartFilterProcessBtn: document.getElementById("chart-filter-process-btn"),
  chartFilterProcessMenu: document.getElementById("chart-filter-process-menu"),
  chartFilterDensityBtn: document.getElementById("chart-filter-density-btn"),
  chartFilterDensityMenu: document.getElementById("chart-filter-density-menu"),
  chartFilterVoltageBtn: document.getElementById("chart-filter-voltage-btn"),
  chartFilterVoltageMenu: document.getElementById("chart-filter-voltage-menu"),
  chartToggleBtn: document.getElementById("chart-toggle-btn"),
  chartContent: document.getElementById("chart-content"),
  tableSection: document.getElementById("table-section"),
  statsThead: document.getElementById("stats-thead"),
  statsTbody: document.getElementById("stats-tbody"),
  siteTdSection: document.getElementById("site-td-section"),
  siteTdHeatmap: document.getElementById("site-td-heatmap"),
};

dom.pickBtn.addEventListener("click", onPickSourceClick);
dom.folderInput.addEventListener("change", handleFolderSelection);
dom.txtInput.addEventListener("change", handleTxtSelection);
dom.xlsxInput.addEventListener("change", handleXlsxSelection);
dom.productInput?.addEventListener("input", onProductNameChange);
dom.anomalyDetailToggle?.addEventListener("change", onAnomalyToggleChange);
dom.analyzeBtn.addEventListener("click", startAnalysis);
dom.exportBtn.addEventListener("click", exportXlsx);
dom.stationTabs?.addEventListener("click", onStationTabClick);
dom.kpiToggleBtn?.addEventListener("click", onKpiToggleClick);
dom.tableProductTabs?.addEventListener("click", onProductTabClick);
dom.siteProductTabs?.addEventListener("click", onProductTabClick);
dom.statsThead?.addEventListener("click", onStatsHeadClick);
dom.statsTbody?.addEventListener("click", onStatsBodyClick);
dom.chartSortProduct?.addEventListener("change", onChartSortProductChange);
dom.chartFilterProductBtn?.addEventListener("click", onChartProductFilterToggle);
dom.chartFilterProductMenu?.addEventListener("change", onChartProductFilterItemChange);
dom.chartFilterProcessBtn?.addEventListener("click", (event) => onChartMultiFilterToggle(event, "process"));
dom.chartFilterDensityBtn?.addEventListener("click", (event) => onChartMultiFilterToggle(event, "density"));
dom.chartFilterVoltageBtn?.addEventListener("click", (event) => onChartMultiFilterToggle(event, "voltage"));
dom.chartFilterProcessMenu?.addEventListener("change", (event) => onChartMultiFilterItemChange(event, "process"));
dom.chartFilterDensityMenu?.addEventListener("change", (event) => onChartMultiFilterItemChange(event, "density"));
dom.chartFilterVoltageMenu?.addEventListener("change", (event) => onChartMultiFilterItemChange(event, "voltage"));
dom.chartToggleBtn?.addEventListener("click", onChartToggleClick);
dom.tableToggleBtn?.addEventListener("click", onTableToggleClick);
dom.entryTabAnalysis?.addEventListener("click", () => switchEntryPage("analysis"));
dom.entryTabXlsx?.addEventListener("click", () => switchEntryPage("xlsx"));
dom.entryTabGuide?.addEventListener("click", () => switchEntryPage("guide"));
dom.themeToggleBtn?.addEventListener("click", onThemeToggleClick);
dom.scopeSelectList?.addEventListener("change", onScopeSelectionChange);
dom.scopeSelectAll?.addEventListener("click", () => toggleAllScopes(true));
dom.scopeSelectNone?.addEventListener("click", () => toggleAllScopes(false));
dom.scopeToggleBtn?.addEventListener("click", onScopeToggleClick);
dom.folderMeta?.addEventListener("input", onMetaInputChange);
document.addEventListener("click", onDocumentClick);

initializeGuidePage();
applyEntryModeUI();
initializeTheme();

function applyTheme(theme) {
  const isLight = theme === "light";
  document.body.classList.toggle("theme-light", isLight);
  if (dom.themeToggleBtn) {
    dom.themeToggleBtn.textContent = isLight ? "深色系" : "亮色系";
    dom.themeToggleBtn.setAttribute("aria-pressed", isLight ? "true" : "false");
  }
}

function initializeTheme() {
  const saved = localStorage.getItem("tto-theme");
  applyTheme(saved === "light" ? "light" : "dark");
}

function onThemeToggleClick() {
  const toLight = !document.body.classList.contains("theme-light");
  const theme = toLight ? "light" : "dark";
  applyTheme(theme);
  localStorage.setItem("tto-theme", theme);
}

function onPickSourceClick() {
  if (APP.entryMode === "xlsx") {
    dom.xlsxInput.value = "";
    dom.xlsxInput.click();
    return;
  }
  const selected = Array.from(dom.sourceModeRadios).find((r) => r.checked)?.value ?? "folder";
  if (selected === "folder") {
    dom.folderInput.value = "";
    dom.folderInput.click();
    return;
  }
  dom.txtInput.value = "";
  dom.txtInput.click();
}

function showMessage(text, type = "info") {
  dom.message.textContent = text;
  if (type === "error") dom.message.className = "mt-4 text-sm msg-error";
  else if (type === "success") dom.message.className = "mt-4 text-sm msg-success";
  else dom.message.className = "mt-4 text-sm msg-info";
}

function hasManualFallbackOnly() {
  return APP.manualFallback.pendingFiles.length > 0 && getProducts().length === 0;
}

function isManualFallbackReady() {
  const productToken = detectProductToken(APP.manualProductName.trim());
  return Boolean(
    productToken &&
    APP.manualFallback.lotNo.trim() &&
    APP.manualFallback.waferId.trim() &&
    APP.manualFallback.station.trim(),
  );
}

function syncManualEntryHint() {
  if (!dom.manualEntryHint) return;
  dom.manualEntryHint.classList.toggle("hidden", !hasManualFallbackOnly());
}

function onProductNameChange() {
  APP.manualProductName = dom.productInput?.value.trim() || "";
  updateAnalyzeState();
  if (hasAnalyzedData()) {
    renderMeta(buildMetaCards());
    renderKpi();
  }
}

function onAnomalyToggleChange() {
  APP.enableAnomalyDetail = Boolean(dom.anomalyDetailToggle?.checked);
  APP.tableExpanded.clear();
  if (hasAnalyzedData()) renderTable();
}

function parseRootMeta(rootName) {
  const m = rootName.match(ROOT_REGEX);
  if (!m) return null;
  const raw = m[5];
  return {
    lotNo: m[2],
    waferId: m[3],
    station: m[4],
    datetimeRaw: raw,
    datetime: `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)} ${raw.slice(8, 10)}:${raw.slice(10, 12)}:${raw.slice(12, 14)}`,
  };
}

function createStation(name, rootFolderName = "", parsedMeta = null) {
  return {
    name,
    rootFolderName,
    parsedMeta,
    rawTxtFiles: [],
    stats: [],
    stationTotalTime: 0,
    touchDownCount: 0,
    siteTdMap: new Map(),
  };
}

function createProduct(name) {
  return {
    name,
    stations: new Map(),
    lotNos: new Set(),
    waferIds: new Set(),
    datetimes: new Set(),
    rootNames: new Set(),
    process: "",
    density: "",
    voltage: "",
  };
}

function getProducts() {
  return Array.from(APP.products.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function getProductByName(name) {
  return APP.products.get(name) ?? null;
}

function getActiveProduct() {
  const p = getProductByName(APP.activeProduct);
  if (p) return p;
  const first = getProducts()[0] ?? null;
  if (first) APP.activeProduct = first.name;
  return first;
}

function getStationNames() {
  const stationSet = new Set();
  for (const product of getProducts()) {
    for (const stationName of product.stations.keys()) {
      const normalized = String(stationName || "").trim();
      if (normalized) stationSet.add(normalized);
    }
  }
  return Array.from(stationSet).sort((a, b) => a.localeCompare(b));
}

function getProductsInStation(stationName) {
  return getProducts().filter((p) => {
    const station = p.stations.get(stationName);
    return Boolean(station && station.stats.length > 0);
  });
}

function getActiveStationData() {
  const product = getActiveProduct();
  if (!product || !APP.activeStation) return null;
  return product.stations.get(APP.activeStation) ?? null;
}

function getTotalRawTxtCount() {
  let total = 0;
  for (const product of getProducts()) {
    for (const station of product.stations.values()) {
      total += station.rawTxtFiles.length;
    }
  }
  return total;
}

function makeScopeKey(productName, stationName) {
  return `${String(productName || "").trim()}||${String(stationName || "").trim()}`;
}

function initializeScopeSelection() {
  APP.selectedScopes.clear();
  for (const product of getProducts()) {
    for (const station of product.stations.values()) {
      APP.selectedScopes.add(makeScopeKey(product.name, station.name));
    }
  }
}

function getSelectableStationEntries() {
  const entries = [];
  for (const product of getProducts()) {
    for (const station of product.stations.values()) {
      if (!station.rawTxtFiles.length) continue;
      entries.push({ product, station, key: makeScopeKey(product.name, station.name) });
    }
  }
  return entries;
}

function getSelectedStationEntries() {
  return getSelectableStationEntries().filter((entry) => APP.selectedScopes.has(entry.key));
}

function getSelectedRawTxtCount() {
  return getSelectedStationEntries().reduce((acc, entry) => acc + entry.station.rawTxtFiles.length, 0);
}

function isProductFullySelected(productName) {
  const entries = getSelectableStationEntries().filter((entry) => entry.product.name === productName);
  if (!entries.length) return false;
  return entries.every((entry) => APP.selectedScopes.has(entry.key));
}

function isProductPartiallySelected(productName) {
  const entries = getSelectableStationEntries().filter((entry) => entry.product.name === productName);
  if (!entries.length) return false;
  const selectedCount = entries.filter((entry) => APP.selectedScopes.has(entry.key)).length;
  return selectedCount > 0 && selectedCount < entries.length;
}

function setProductScopeSelection(productName, checked) {
  for (const entry of getSelectableStationEntries()) {
    if (entry.product.name !== productName) continue;
    if (checked) APP.selectedScopes.add(entry.key);
    else APP.selectedScopes.delete(entry.key);
  }
}

function renderScopeSelection() {
  if (!dom.scopeSelectPanel || !dom.scopeSelectList || !dom.scopeSelectSummary) return;
  const show = APP.sourceMode === "folder" && getSelectableStationEntries().length > 0;
  dom.scopeSelectPanel.classList.toggle("hidden", !show);
  if (!show) return;

  const byProduct = new Map();
  for (const entry of getSelectableStationEntries()) {
    const arr = byProduct.get(entry.product.name) ?? [];
    arr.push(entry);
    byProduct.set(entry.product.name, arr);
  }

  const blocks = [];
  const productNames = Array.from(byProduct.keys()).sort((a, b) => a.localeCompare(b));
  for (const productName of productNames) {
    const entries = byProduct.get(productName) ?? [];
    const stationChecks = entries
      .sort((a, b) => a.station.name.localeCompare(b.station.name))
      .map((entry) => {
        const checked = APP.selectedScopes.has(entry.key) ? "checked" : "";
        return `<label class="scope-check"><input type="checkbox" data-scope-station="${escapeHtml(entry.key)}" ${checked}>${escapeHtml(entry.station.name)} <span class="hint-text">(${entry.station.rawTxtFiles.length} 檔)</span></label>`;
      })
      .join("");
    const productChecked = isProductFullySelected(productName) ? "checked" : "";
    blocks.push(`
      <div class="scope-product-card">
        <div class="scope-product-row">
          <label class="scope-check scope-check-product"><input type="checkbox" data-scope-product="${escapeHtml(productName)}" ${productChecked}>${escapeHtml(productName)}</label>
          <span class="hint-text text-xs">${entries.length} 站點</span>
        </div>
        <div class="scope-station-list">${stationChecks}</div>
      </div>
    `);
  }

  dom.scopeSelectList.innerHTML = blocks.join("");
  for (const checkbox of dom.scopeSelectList.querySelectorAll("[data-scope-product]")) {
    const productName = checkbox.getAttribute("data-scope-product");
    if (!productName) continue;
    checkbox.indeterminate = isProductPartiallySelected(productName);
  }

  const selectedStations = getSelectedStationEntries().length;
  const totalStations = getSelectableStationEntries().length;
  const selectedFiles = getSelectedRawTxtCount();
  dom.scopeSelectSummary.textContent = `目前已勾選 ${selectedStations}/${totalStations} 個站點，共 ${selectedFiles} 個 .TXT 檔案。`;
  syncScopeCollapsedUI();
}

function onScopeSelectionChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (target.hasAttribute("data-scope-product")) {
    const productName = target.getAttribute("data-scope-product");
    if (!productName) return;
    setProductScopeSelection(productName, target.checked);
    renderScopeSelection();
    updateAnalyzeState();
    return;
  }
  if (target.hasAttribute("data-scope-station")) {
    const key = target.getAttribute("data-scope-station");
    if (!key) return;
    if (target.checked) APP.selectedScopes.add(key);
    else APP.selectedScopes.delete(key);
    renderScopeSelection();
    updateAnalyzeState();
  }
}

function toggleAllScopes(checked) {
  for (const entry of getSelectableStationEntries()) {
    if (checked) APP.selectedScopes.add(entry.key);
    else APP.selectedScopes.delete(entry.key);
  }
  renderScopeSelection();
  updateAnalyzeState();
}

function syncScopeCollapsedUI() {
  if (!dom.scopeSelectList || !dom.scopeToggleBtn) return;
  dom.scopeSelectList.classList.toggle("hidden", APP.scopeCollapsed);
  dom.scopeToggleBtn.textContent = APP.scopeCollapsed ? "展開全部" : "收合全部";
  dom.scopeToggleBtn.setAttribute("aria-expanded", APP.scopeCollapsed ? "false" : "true");
}

function onScopeToggleClick() {
  APP.scopeCollapsed = !APP.scopeCollapsed;
  syncScopeCollapsedUI();
}

function hasAnalyzedData() {
  for (const product of getProducts()) {
    for (const station of product.stations.values()) {
      if (station.stats.length > 0) return true;
    }
  }
  return false;
}

function resetResultsUI() {
  for (const product of getProducts()) {
    for (const station of product.stations.values()) {
      station.stats = [];
      station.stationTotalTime = 0;
      station.touchDownCount = 0;
      station.siteTdMap = new Map();
    }
  }
  APP.chartSortProduct = "";
  APP.chartFilters = { product: [], process: [], density: [], voltage: [] };
  APP.tableExpanded.clear();
  APP.tableCollapsed = true;
  APP.scopeCollapsed = false;
  APP.kpiCollapsed = false;
  APP.chartCollapsed = false;

  dom.stationTabsSection?.classList.add("hidden");
  dom.kpiSection.classList.add("hidden");
  dom.chartSection.classList.add("hidden");
  dom.tableSection.classList.add("hidden");
  dom.siteTdSection.classList.add("hidden");

  if (dom.stationTabs) dom.stationTabs.innerHTML = "";
  if (dom.tableProductTabs) dom.tableProductTabs.innerHTML = "";
  if (dom.siteProductTabs) dom.siteProductTabs.innerHTML = "";
  if (dom.chartSortProduct) dom.chartSortProduct.innerHTML = "";
  if (dom.chartFilterProductBtn) dom.chartFilterProductBtn.textContent = "全部產品";
  if (dom.chartFilterProductMenu) dom.chartFilterProductMenu.innerHTML = "";
  if (dom.chartFilterProcessBtn) dom.chartFilterProcessBtn.textContent = "全部 Process";
  if (dom.chartFilterProcessMenu) dom.chartFilterProcessMenu.innerHTML = "";
  if (dom.chartFilterDensityBtn) dom.chartFilterDensityBtn.textContent = "全部 Density";
  if (dom.chartFilterDensityMenu) dom.chartFilterDensityMenu.innerHTML = "";
  if (dom.chartFilterVoltageBtn) dom.chartFilterVoltageBtn.textContent = "全部 Voltage";
  if (dom.chartFilterVoltageMenu) dom.chartFilterVoltageMenu.innerHTML = "";
  dom.statsTbody.innerHTML = "";
  dom.progressWrap.classList.add("hidden");
  setProgress(0);
  syncTableCollapsedUI();
  syncKpiCollapsedUI();
  syncChartCollapsedUI();

  destroyKpiCharts();
  for (const key of Object.keys(APP.charts)) {
    if (APP.charts[key]) {
      APP.charts[key].destroy();
      APP.charts[key] = null;
    }
  }
  if (window.SiteTdHeatmapReact && dom.siteTdHeatmap) {
    window.SiteTdHeatmapReact.clear(dom.siteTdHeatmap);
  } else if (dom.siteTdHeatmap) {
    dom.siteTdHeatmap.innerHTML = "";
  }
}

function syncTableCollapsedUI() {
  if (!dom.tableContent || !dom.tableToggleBtn) return;
  dom.tableContent.classList.toggle("hidden", APP.tableCollapsed);
  dom.tableToggleBtn.textContent = APP.tableCollapsed ? "展開全部" : "收合全部";
  dom.tableToggleBtn.setAttribute("aria-expanded", APP.tableCollapsed ? "false" : "true");
}

function onTableToggleClick() {
  APP.tableCollapsed = !APP.tableCollapsed;
  syncTableCollapsedUI();
}

function syncKpiCollapsedUI() {
  if (!dom.kpiToggleBtn || !dom.kpiSection) return;
  dom.kpiToggleBtn.textContent = APP.kpiCollapsed ? "展開全部" : "收合全部";
  dom.kpiToggleBtn.setAttribute("aria-expanded", APP.kpiCollapsed ? "false" : "true");
  if (APP.kpiCollapsed) dom.kpiSection.classList.add("hidden");
}

function onKpiToggleClick() {
  APP.kpiCollapsed = !APP.kpiCollapsed;
  syncKpiCollapsedUI();
  if (!APP.kpiCollapsed) renderKpi();
}

function syncChartCollapsedUI() {
  if (!dom.chartContent || !dom.chartToggleBtn) return;
  dom.chartContent.classList.toggle("hidden", APP.chartCollapsed);
  dom.chartToggleBtn.textContent = APP.chartCollapsed ? "展開全部" : "收合全部";
  dom.chartToggleBtn.setAttribute("aria-expanded", APP.chartCollapsed ? "false" : "true");
}

function onChartToggleClick() {
  APP.chartCollapsed = !APP.chartCollapsed;
  syncChartCollapsedUI();
  if (!APP.chartCollapsed) renderCharts();
}

function updateAnalyzeState() {
  if (APP.sourceMode === "xlsx") dom.analyzeBtn.disabled = APP.files.length === 0;
  else if (APP.sourceMode === "folder") {
    const hasSelectedScopeFiles = getSelectedRawTxtCount() > 0;
    const hasManualProduct = APP.manualProductName.length > 0;
    const hasAutoProduct = getProducts().length > 0;
    const canAnalyzeWithScope = hasSelectedScopeFiles && (hasManualProduct || hasAutoProduct);
    const canAnalyzeWithManualFallback = hasManualFallbackOnly() && isManualFallbackReady();
    dom.analyzeBtn.disabled = !(canAnalyzeWithScope || canAnalyzeWithManualFallback);
  } else if (APP.sourceMode === "txt") {
    const hasTxtFiles = APP.files.some((file) => file.name.toLowerCase().endsWith(".txt"));
    const hasAutoProduct = getProducts().length > 0;
    const canAnalyzeWithAuto = hasTxtFiles && hasAutoProduct;
    const canAnalyzeWithManualFallback = hasManualFallbackOnly() && isManualFallbackReady();
    dom.analyzeBtn.disabled = !(canAnalyzeWithAuto || canAnalyzeWithManualFallback);
  } else {
    const hasRawFiles = getTotalRawTxtCount() > 0;
    const hasManualProduct = APP.manualProductName.length > 0;
    const hasAutoProduct = getProducts().length > 0;
    dom.analyzeBtn.disabled = !(hasRawFiles && (hasManualProduct || hasAutoProduct));
  }
  dom.exportBtn.disabled = !hasAnalyzedData();
  syncManualEntryHint();
}

function detectProductToken(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return PRODUCT_ROOT_REGEX.test(text) ? text : "";
}

function parseImportPath(relativePath) {
  const normalized = String(relativePath || "").replaceAll("\\", "/");
  const parts = normalized.split("/").filter(Boolean);
  const homeIndex = parts.findIndex(
    (part, idx) =>
      part.toLowerCase() === "home" &&
      Boolean(parts[idx + 1]) &&
      (parts[idx + 2] || "").toLowerCase() === "rawdata",
  );
  if (homeIndex < 1) return null;

  const stationFolder = parts[homeIndex - 1];
  const stationMeta = parseRootMeta(stationFolder);
  let productName = "";
  for (let i = homeIndex - 2; i >= 0; i -= 1) {
    const token = detectProductToken(parts[i]);
    if (token) {
      productName = token;
      break;
    }
  }
  return {
    productName,
    stationFolder,
    stationName: stationMeta?.station ?? stationFolder,
    stationMeta,
  };
}

function ensureProduct(name) {
  const normalized = String(name || "").trim();
  const key = normalized || APP.manualProductName || "UNSPECIFIED";
  const existing = APP.products.get(key);
  if (existing) return existing;
  const created = createProduct(key);
  APP.products.set(key, created);
  return created;
}

function ensureStation(product, stationName, stationFolder, stationMeta) {
  const existing = product.stations.get(stationName);
  if (existing) return existing;
  const created = createStation(stationName, stationFolder, stationMeta);
  product.stations.set(stationName, created);
  return created;
}

function handleFolderSelection(event) {
  APP.sourceMode = "folder";
  APP.files = Array.from(event.target.files || []);
  APP.rootName = "";
  APP.manualFallback.lotNo = "";
  APP.manualFallback.waferId = "";
  APP.manualFallback.station = "";
  APP.manualFallback.pendingFiles = [];
  APP.products.clear();
  APP.activeStation = "";
  APP.activeProduct = "";
  resetResultsUI();

  if (!APP.files.length) {
    APP.selectedScopes.clear();
    renderScopeSelection();
    updateAnalyzeState();
    return;
  }

  const firstPath = APP.files[0].webkitRelativePath || APP.files[0].name;
  APP.rootName = firstPath.split("/")[0] || firstPath;
  dom.folderName.textContent = APP.rootName;

  const rootProduct = detectProductToken(APP.rootName);
  if (rootProduct) {
    APP.manualProductName = rootProduct;
    if (dom.productInput) dom.productInput.value = rootProduct;
  } else if (dom.productInput) {
    APP.manualProductName = dom.productInput.value.trim();
  } else {
    APP.manualProductName = "";
  }

  let totalTxt = 0;
  let acceptedTxt = 0;
  for (const file of APP.files) {
    const rel = String(file.webkitRelativePath || "");
    if (!rel.toLowerCase().endsWith(".txt")) continue;
    totalTxt += 1;
    const parsed = parseImportPath(rel);
    if (!parsed) continue;
    if (!parsed.productName) {
      APP.manualFallback.pendingFiles.push(file);
      if (parsed.stationMeta) {
        APP.manualFallback.lotNo = APP.manualFallback.lotNo || String(parsed.stationMeta.lotNo || "").trim();
        APP.manualFallback.waferId = APP.manualFallback.waferId || String(parsed.stationMeta.waferId || "").trim();
        APP.manualFallback.station = APP.manualFallback.station || String(parsed.stationMeta.station || parsed.stationName || "").trim();
      } else if (!APP.manualFallback.station) {
        APP.manualFallback.station = String(parsed.stationName || "").trim();
      }
      continue;
    }

    const productName = parsed.productName;
    const product = ensureProduct(productName);
    const station = ensureStation(product, parsed.stationName, parsed.stationFolder, parsed.stationMeta);
    station.rawTxtFiles.push(file);
    acceptedTxt += 1;

    if (parsed.stationMeta) {
      product.lotNos.add(parsed.stationMeta.lotNo);
      product.waferIds.add(parsed.stationMeta.waferId);
      product.datetimes.add(parsed.stationMeta.datetime);
    }
    product.rootNames.add(parsed.stationFolder);
  }

  const stationNames = getStationNames();
  APP.activeStation = stationNames[0] ?? "";
  APP.activeProduct = getProducts()[0]?.name ?? "";
  initializeScopeSelection();

  renderMeta(buildMetaCards());
  renderScopeSelection();

  const txtCount = getTotalRawTxtCount();
  if (!txtCount) {
    showMessage("未找到符合產品目錄（FAG/EAG/MAG/AAG/KAG/RAG）且位於 home/*/rawdata 的 .TXT 檔案。", "error");
  } else {
    const skipped = Math.max(0, totalTxt - acceptedTxt);
    const skippedText = skipped > 0 ? `，略過 ${skipped} 個非產品目錄 .TXT` : "";
    showMessage(`已找到 ${getProducts().length} 個產品、${stationNames.length} 個站點、共 ${txtCount} 個 .TXT 檔案${skippedText}。`, "success");
  }
  updateAnalyzeState();
}

function handleTxtSelection(event) {
  APP.sourceMode = "txt";
  APP.files = Array.from(event.target.files || []);
  APP.manualFallback.lotNo = "";
  APP.manualFallback.waferId = "";
  APP.manualFallback.station = "";
  APP.manualFallback.pendingFiles = [];
  APP.selectedScopes.clear();
  APP.rootName = "直接 TXT 上傳";
  APP.products.clear();
  APP.activeStation = "";
  APP.activeProduct = "";
  resetResultsUI();

  APP.manualProductName = "";
  const txtFiles = APP.files.filter((f) => f.name.toLowerCase().endsWith(".txt"));
  if (txtFiles.length > 0) {
    APP.manualFallback.pendingFiles = txtFiles.slice();
  }

  dom.folderName.textContent = txtFiles.length ? `直接 TXT 上傳（${txtFiles.length} 檔）` : "尚未選擇";
  renderMeta(buildMetaCards());
  renderScopeSelection();

  if (!txtFiles.length) showMessage("未選到任何 .TXT 檔案。", "error");
  else showMessage(`已選擇 ${txtFiles.length} 個 .TXT 檔案。請輸入 PRODUCT、LOTNO、WAFER ID、站點後開始分析。`, "info");

  updateAnalyzeState();
}

function handleXlsxSelection(event) {
  APP.sourceMode = "xlsx";
  APP.files = Array.from(event.target.files || []).filter((f) => /\.(xlsx|xls)$/i.test(f.name));
  APP.manualFallback.lotNo = "";
  APP.manualFallback.waferId = "";
  APP.manualFallback.station = "";
  APP.manualFallback.pendingFiles = [];
  APP.selectedScopes.clear();
  APP.rootName = APP.files.length ? `匯入 XLSX（${APP.files.length} 檔）` : "";
  APP.products.clear();
  APP.activeStation = "";
  APP.activeProduct = "";
  resetResultsUI();

  dom.folderName.textContent = APP.files.length ? APP.rootName : "尚未選擇";
  renderMeta([{ product: "-", lotNo: "-", waferId: "-", station: "-" }]);
  renderScopeSelection();

  if (!APP.files.length) showMessage("未選到任何 XLSX 檔案。", "error");
  else showMessage(`已選擇 ${APP.files.length} 個 XLSX 檔案。`, "success");
  updateAnalyzeState();
}

function buildMetaCards() {
  if (APP.sourceMode === "txt") {
    if (!getProducts().length) {
      return [{
        product: APP.manualProductName || "",
        lotNo: APP.manualFallback.lotNo || "",
        waferId: APP.manualFallback.waferId || "",
        station: APP.manualFallback.station || "",
        process: "",
        density: "",
        voltage: "",
        manualEditable: hasManualFallbackOnly(),
      }];
    }
    const name = getProducts()[0]?.name || "-";
    const product = getProductByName(name);
    return [{
      product: name,
      lotNo: "-",
      waferId: "-",
      station: "TXT",
      process: product?.process ?? "",
      density: product?.density ?? "",
      voltage: product?.voltage ?? "",
    }];
  }
  const cards = [];
  for (const product of getProducts()) {
    const stationNames = Array.from(product.stations.keys()).sort((a, b) => a.localeCompare(b));
    cards.push({
      product: product.name,
      lotNo: formatValueList(Array.from(product.lotNos).sort()),
      waferId: formatValueList(Array.from(product.waferIds).sort()),
      station: formatValueList(stationNames),
      process: product.process || "",
      density: product.density || "",
      voltage: product.voltage || "",
    });
  }
  return cards.length ? cards : [{
    product: APP.manualProductName || "",
    lotNo: APP.manualFallback.lotNo || "",
    waferId: APP.manualFallback.waferId || "",
    station: APP.manualFallback.station || "",
    process: "",
    density: "",
    voltage: "",
    manualEditable: hasManualFallbackOnly(),
  }];
}

function renderMeta(cards) {
  dom.folderMeta.innerHTML = cards
    .map((card) => {
      const manualEditable = Boolean(card.manualEditable);
      const productChip = manualEditable
        ? `<div class="meta-chip meta-input-chip"><div class="meta-key">PRODUCT</div><input type="text" class="meta-input" data-manual-field="product" value="${escapeHtml(String(card.product || ""))}" placeholder="請輸入產品名稱"></div>`
        : `<div class="meta-chip"><div class="meta-key">PRODUCT</div><div class="meta-value">${escapeHtml(String(card.product ?? "-"))}</div></div>`;
      const lotChip = manualEditable
        ? `<div class="meta-chip meta-input-chip"><div class="meta-key">LOTNO</div><input type="text" class="meta-input" data-manual-field="lotNo" value="${escapeHtml(String(card.lotNo || ""))}" placeholder="請輸入 LOTNO"></div>`
        : `<div class="meta-chip"><div class="meta-key">LOTNO</div><div class="meta-value">${escapeHtml(String(card.lotNo ?? "-"))}</div></div>`;
      const waferChip = manualEditable
        ? `<div class="meta-chip meta-input-chip"><div class="meta-key">WAFER ID</div><input type="text" class="meta-input" data-manual-field="waferId" value="${escapeHtml(String(card.waferId || ""))}" placeholder="請輸入 WAFER ID"></div>`
        : `<div class="meta-chip"><div class="meta-key">WAFER ID</div><div class="meta-value">${escapeHtml(String(card.waferId ?? "-"))}</div></div>`;
      const stationChip = manualEditable
        ? `<div class="meta-chip meta-input-chip"><div class="meta-key">站點</div><input type="text" class="meta-input" data-manual-field="station" value="${escapeHtml(String(card.station || ""))}" placeholder="請輸入站點"></div>`
        : `<div class="meta-chip"><div class="meta-key">站點</div><div class="meta-value">${escapeHtml(String(card.station ?? "-"))}</div></div>`;
      return `
      <div class="meta-row">
        ${productChip}
        ${lotChip}
        ${waferChip}
        ${stationChip}
        <div class="meta-chip meta-input-chip">
          <div class="meta-key">Process</div>
          <input type="text" class="meta-input" data-meta-product="${escapeHtml(String(card.product ?? ""))}" data-meta-field="process" value="${escapeHtml(String(card.process || ""))}" placeholder="範例:F45">
        </div>
        <div class="meta-chip meta-input-chip">
          <div class="meta-key">Density</div>
          <input type="text" class="meta-input" data-meta-product="${escapeHtml(String(card.product ?? ""))}" data-meta-field="density" value="${escapeHtml(String(card.density || ""))}" placeholder="範例: 256Mb">
        </div>
        <div class="meta-chip meta-input-chip">
          <div class="meta-key">Voltage</div>
          <input type="text" class="meta-input" data-meta-product="${escapeHtml(String(card.product ?? ""))}" data-meta-field="voltage" value="${escapeHtml(String(card.voltage || ""))}" placeholder="範例: 3V">
        </div>
      </div>
    `;
    })
    .join("");
  dom.folderMeta.classList.remove("hidden");
}

function onMetaInputChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  const manualField = target.getAttribute("data-manual-field");
  if (manualField) {
    const value = target.value.trim();
    if (manualField === "product") APP.manualProductName = value;
    else if (manualField === "lotNo") APP.manualFallback.lotNo = value;
    else if (manualField === "waferId") APP.manualFallback.waferId = value;
    else if (manualField === "station") APP.manualFallback.station = value;
    updateAnalyzeState();
    return;
  }
  const productName = target.getAttribute("data-meta-product");
  const field = target.getAttribute("data-meta-field");
  if (!productName || !field) return;
  const product = getProductByName(productName);
  if (!product) return;
  const value = target.value.trim();
  if (field === "process") product.process = value;
  else if (field === "density") product.density = value;
  else if (field === "voltage") product.voltage = value;
  else return;
  renderChartFilterOptions();
  renderChartSortOptions();
  renderKpi();
  renderCharts();
}

async function startAnalysis() {
  if (APP.sourceMode === "xlsx") {
    await startAnalysisFromXlsx();
    return;
  }

  if (dom.productInput) APP.manualProductName = dom.productInput.value.trim();
  let selectedEntries = APP.sourceMode === "folder" ? getSelectedStationEntries() : getSelectableStationEntries();
  if ((APP.sourceMode === "folder" || APP.sourceMode === "txt") && !selectedEntries.length && hasManualFallbackOnly()) {
    const productName = APP.manualProductName.trim();
    const stationName = APP.manualFallback.station.trim();
    const lotNo = APP.manualFallback.lotNo.trim();
    const waferId = APP.manualFallback.waferId.trim();
    if (!detectProductToken(productName)) {
      showMessage("PRODUCT 格式錯誤：必須以 FAG/EAG/MAG/AAG/KAG/RAG 開頭。", "error");
      updateAnalyzeState();
      return;
    }
    if (!productName || !stationName || !lotNo || !waferId) {
      showMessage("請先完整輸入 PRODUCT、LOTNO、WAFER ID、站點。", "error");
      updateAnalyzeState();
      return;
    }
    APP.products.clear();
    const product = ensureProduct(productName);
    product.lotNos.add(lotNo);
    product.waferIds.add(waferId);
    product.rootNames.add("手動輸入");
    const stationMeta = { lotNo, waferId, station: stationName, datetime: "-" };
    const station = ensureStation(product, stationName, stationName, stationMeta);
    station.rawTxtFiles = APP.manualFallback.pendingFiles.slice();
    APP.activeStation = stationName;
    APP.activeProduct = productName;
    initializeScopeSelection();
    renderMeta(buildMetaCards());
    renderScopeSelection();
    selectedEntries = getSelectedStationEntries();
  }
  const totalFiles = selectedEntries.reduce((acc, entry) => acc + entry.station.rawTxtFiles.length, 0);
  if (!totalFiles) {
    showMessage(APP.sourceMode === "folder" ? "請先勾選至少一個要分析的產品/站點。" : "請先選擇資料夾或上傳 TXT。", "error");
    updateAnalyzeState();
    return;
  }
  if (!APP.manualProductName && getProducts().length === 0) {
    showMessage("請先輸入產品名稱。", "error");
    updateAnalyzeState();
    return;
  }

  dom.analyzeBtn.disabled = true;
  dom.progressWrap.classList.remove("hidden");
  setProgress(0);
  showMessage("開始解析 TXT 檔案...", "info");

  let processed = 0;
  for (const product of getProducts()) {
    for (const station of product.stations.values()) {
      station.touchDownCount = 0;
      station.stationTotalTime = 0;
      station.siteTdMap = new Map();
      station.stats = [];
    }
  }

  for (const entry of selectedEntries) {
    const { station } = entry;
    const itemMap = new Map();
    const tdMaxMap = new Map();
    const siteTdMap = new Map();

    for (const file of station.rawTxtFiles) {
      const fileMeta = parseRawTxtFilename(file.name);
      const siteKey = fileMeta ? String(fileMeta.site) : "Unknown";
      const text = await file.text();
      const lines = text.split(/\r?\n/);

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const line = lines[lineIndex];
        const tdMatch = line.match(TOTAL_TEST_TIME_REGEX);
        if (tdMatch) {
          const td = String(Number.parseInt(tdMatch[1], 10));
          const tdTime = Number.parseFloat(tdMatch[2]);
          if (Number.isFinite(tdTime)) {
            const currentMax = tdMaxMap.get(td);
            if (currentMax === undefined || tdTime > currentMax) tdMaxMap.set(td, tdTime);

            const siteEntry = siteTdMap.get(siteKey) ?? new Map();
            const siteCurrentMax = siteEntry.get(td);
            if (siteCurrentMax === undefined || tdTime > siteCurrentMax) siteEntry.set(td, tdTime);
            siteTdMap.set(siteKey, siteEntry);
          }
        }

        const m = line.match(TEST_TIME_REGEX);
        if (!m) continue;
        const testNo = m[1].trim();
        const testItem = m[2].trim();
        const value = Number.parseFloat(m[3]);
        const unit = m[4].trim();
        if (!Number.isFinite(value)) continue;
        const lineMeta = parseTestTimeLineMeta(line);

        const row = itemMap.get(testItem) ?? { testNos: new Set(), testItem, values: [], unit };
        row.testNos.add(testNo);
        row.values.push({
          value,
          site: siteKey,
          td: lineMeta.td || "Unknown",
          systemDut: lineMeta.systemDut,
          x: lineMeta.x,
          y: lineMeta.y,
          testNo,
          testItem,
          lineIndex,
          lines,
          rawLine: line,
        });
        itemMap.set(testItem, row);
      }

      processed += 1;
      setProgress(Math.round((processed / totalFiles) * 100));
    }

    station.touchDownCount = tdMaxMap.size;
    station.stationTotalTime = Array.from(tdMaxMap.values()).reduce((acc, n) => acc + n, 0);
    station.siteTdMap = siteTdMap;
    station.stats = buildStats(itemMap, station.stationTotalTime);
  }

  const stationsWithStats = getStationNames().filter((stationName) => getProductsInStation(stationName).length > 0);
  if (!stationsWithStats.length) {
    showMessage("未找到符合格式的 <<< Test Time >>> 記錄。", "error");
    updateAnalyzeState();
    return;
  }

  APP.activeStation = stationsWithStats[0];
  syncActiveProductForStation();
  renderStationTabs(stationsWithStats);
  renderProductTabs();
  renderChartFilterOptions();
  renderChartSortOptions();
  renderKpi();
  renderTable();
  renderCharts();
  renderSiteTdChart();
  showMessage(
    `分析完成：共 ${getProducts().length} 產品、${stationsWithStats.length} 站點、${getProducts().reduce((acc, p) => acc + Array.from(p.stations.values()).reduce((s, st) => s + st.stats.length, 0), 0)} 個 Test Item。`,
    "success",
  );
  updateAnalyzeState();
}

async function startAnalysisFromXlsx() {
  if (!APP.files.length) {
    showMessage("請先選擇 XLSX 檔案。", "error");
    updateAnalyzeState();
    return;
  }
  if (typeof XLSX === "undefined") {
    showMessage("XLSX 元件尚未載入。", "error");
    updateAnalyzeState();
    return;
  }

  APP.products.clear();
  APP.activeStation = "";
  APP.activeProduct = "";
  resetResultsUI();

  dom.analyzeBtn.disabled = true;
  dom.progressWrap.classList.remove("hidden");
  setProgress(0);
  showMessage("開始解析 XLSX 檔案...", "info");

  let processed = 0;
  for (const file of APP.files) {
    const buf = await file.arrayBuffer();
    const workbook = XLSX.read(buf, { type: "array" });
    importWorkbookData(workbook);
    processed += 1;
    setProgress(Math.round((processed / APP.files.length) * 100));
  }

  const stationNames = getStationNames().filter((name) => getProductsInStation(name).length > 0);
  if (!stationNames.length) {
    showMessage("匯入的 XLSX 未包含可用的統計資料。", "error");
    updateAnalyzeState();
    return;
  }

  APP.activeStation = stationNames[0];
  syncActiveProductForStation();
  renderMeta(buildMetaCards());
  renderStationTabs(stationNames);
  renderProductTabs();
  renderChartFilterOptions();
  renderChartSortOptions();
  renderKpi();
  renderTable();
  renderCharts();
  renderSiteTdChart();
  showMessage(`XLSX 匯入完成：共 ${getProducts().length} 產品、${stationNames.length} 站點。`, "success");
  updateAnalyzeState();
}

function importWorkbookData(workbook) {
  const summaryEntries = parseSummaryEntries(workbook);
  const dataSheets = workbook.SheetNames.filter((name) => name !== "Summary");
  const statsSheets = [];
  const siteSheets = [];

  for (const sheetName of dataSheets) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: true, defval: "" });
    const header = rows[0] ?? [];
    if (isStatsSheet(header)) statsSheets.push({ sheetName, rows });
    else if (isSiteSheet(header)) siteSheets.push({ sheetName, rows });
  }

  const entryCount = Math.max(summaryEntries.length, statsSheets.length, siteSheets.length);
  for (let idx = 0; idx < entryCount; idx += 1) {
    const summary = summaryEntries[idx] ?? {};
    const inferred = parseEntryFromSheetName(statsSheets[idx]?.sheetName || siteSheets[idx]?.sheetName || "");
    const keyParsed = parseSummaryEntryKey(summary.key);
    const productName = String(summary.product || keyParsed.product || inferred.product || "").trim() || "UNSPECIFIED";
    const stationName = String(summary.station || keyParsed.station || inferred.station || "").trim() || "UNSPECIFIED";
    const rootName = String(summary.root || "").trim() || `${productName}_${stationName}`;
    const parsedMeta = parseRootMeta(rootName);
    const lotNo = String(summary.lotNo || summary.lot || "").trim();
    const waferId = String(summary.waferId || summary.wafer || "").trim();

    const product = ensureProduct(productName);
    const station = ensureStation(product, stationName, rootName, parsedMeta);
    station.rootFolderName = rootName;
    station.parsedMeta = parsedMeta;

    const statRows = statsSheets[idx]?.rows ?? [];
    if (statRows.length > 1) station.stats = parseStatsRows(statRows);

    const siteRows = siteSheets[idx]?.rows ?? [];
    if (siteRows.length > 1) station.siteTdMap = parseSiteTdRows(siteRows);

    const summaryTd = Number.parseInt(summary.touchDownCount || "0", 10);
    station.touchDownCount = Number.isFinite(summaryTd) ? summaryTd : 0;

    const summaryTotal = Number.parseFloat(summary.stationTotalTimeSeconds || "0");
    const derivedTotal = calculateStationTotalFromSiteTd(station.siteTdMap);
    station.stationTotalTime = Number.isFinite(derivedTotal) && derivedTotal > 0 ? derivedTotal : (Number.isFinite(summaryTotal) ? summaryTotal : 0);
    if (!station.touchDownCount || station.touchDownCount <= 0) station.touchDownCount = countTouchDown(station.siteTdMap);

    if (parsedMeta) {
      product.lotNos.add(parsedMeta.lotNo);
      product.waferIds.add(parsedMeta.waferId);
      product.datetimes.add(parsedMeta.datetime);
    }
    if (lotNo) product.lotNos.add(lotNo);
    if (waferId) product.waferIds.add(waferId);
    product.rootNames.add(rootName);
  }
}

function parseSummaryEntries(workbook) {
  const summary = workbook.Sheets.Summary;
  if (!summary) return [];
  const rows = XLSX.utils.sheet_to_json(summary, { header: 1, raw: true, defval: "" });
  if (!rows.length) return [];
  const header = rows[0].map((v) => String(v || "").trim());
  const entries = [];
  for (let col = 1; col < header.length; col += 1) entries.push({ key: header[col] });
  for (let r = 1; r < rows.length; r += 1) {
    const row = rows[r];
    const field = String(row[0] || "").trim();
    if (!field) continue;
    for (let col = 1; col < header.length; col += 1) {
      const entry = entries[col - 1];
      if (!entry) continue;
      entry[fieldToSummaryKey(field)] = String(row[col] ?? "").trim();
    }
  }
  return entries;
}

function fieldToSummaryKey(field) {
  const raw = String(field || "").trim();
  const normalized = raw.replaceAll(/\s+/g, "").replaceAll("_", "").toLowerCase();
  if (normalized === "product" || normalized === "產品名稱" || normalized === "產品") return "product";
  if (normalized === "root" || normalized === "rootfolder" || normalized === "主目錄") return "root";
  if (normalized === "station" || normalized === "站點") return "station";
  if (normalized === "lotno" || normalized === "lot" || normalized === "批號") return "lotNo";
  if (normalized === "waferid" || normalized === "wafer" || normalized === "晶圓id") return "waferId";
  if (normalized === "touchdowncount") return "touchDownCount";
  if (normalized === "stationtotaltimeseconds") return "stationTotalTimeSeconds";
  return raw;
}

function parseSummaryEntryKey(key) {
  const text = String(key || "").trim();
  if (!text) return { product: "", station: "" };
  const parts = text.split("_").filter(Boolean);
  if (parts.length < 2) return { product: "", station: "" };
  const station = parts[parts.length - 1];
  const product = parts.slice(0, -1).join("_");
  return { product, station };
}

function isStatsSheet(header) {
  const h = header.map((v) => String(v || "").trim());
  return h.includes("Test Item") && h.includes("Count") && h.includes("Mean(s)");
}

function isSiteSheet(header) {
  const h = header.map((v) => String(v || "").trim());
  return h.includes("TouchDown") && h.includes("Site") && h.includes("Time(s)");
}

function parseEntryFromSheetName(sheetName) {
  const text = String(sheetName || "");
  const m = text.match(/^(.+)_([^_]+)_(TestItem_Stats|Site_TouchDown)$/i);
  if (!m) return { product: "", station: "" };
  return { product: m[1], station: m[2] };
}

function parseStatsRows(rows) {
  const header = (rows[0] ?? []).map((v) => String(v ?? "").trim());
  const idxMap = new Map(header.map((name, idx) => [name, idx]));
  const stats = [];
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const testItem = String(getCellByHeader(row, idxMap, ["Test Item"], 1) ?? "").trim();
    if (!testItem) continue;
    const count = Number.parseInt(getCellByHeader(row, idxMap, ["Count"], 2), 10);
    const mean = Number.parseFloat(getCellByHeader(row, idxMap, ["Mean(s)"], 3));
    const median = Number.parseFloat(getCellByHeader(row, idxMap, ["Median(s)"], 4));
    const range = Number.parseFloat(getCellByHeader(row, idxMap, ["Range(s)"], 5));
    const ttRatioRaw = Number.parseFloat(getCellByHeader(row, idxMap, ["TT Ratio/站點(%)", "TT Ratio/站點 (%)", "TT Ratio/站點"], 6));
    const ratioHeader = idxMap.has("TT Ratio/站點(%)")
      ? "TT Ratio/站點(%)"
      : (idxMap.has("TT Ratio/站點 (%)") ? "TT Ratio/站點 (%)" : "TT Ratio/站點");
    const ttRatio = normalizeTtRatioValue(ttRatioRaw, ratioHeader);
    const min = Number.parseFloat(getCellByHeader(row, idxMap, ["Min(s)"], 7));
    const max = Number.parseFloat(getCellByHeader(row, idxMap, ["Max(s)"], 8));
    const minSourceText = String(getCellByHeader(row, idxMap, ["Min Source(SITE/TD)"], 9) ?? "");
    const maxSourceText = String(getCellByHeader(row, idxMap, ["Max Source(SITE/TD)"], 10) ?? "");
    const maxDetailLine = String(getCellByHeader(row, idxMap, ["Max Detail RawLine"], -1) ?? "").trim();
    const minSource = parseSourceCell(minSourceText);
    const maxSource = parseSourceCell(maxSourceText);
    const unit = String(getCellByHeader(row, idxMap, ["Unit"], 12) ?? "S").trim() || "S";
    const testNos = String(getCellByHeader(row, idxMap, ["Test Nos"], 0) ?? "")
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);
    stats.push({
      testNos,
      testItem,
      count: Number.isFinite(count) ? count : 0,
      mean: Number.isFinite(mean) ? mean : 0,
      median: Number.isFinite(median) ? median : 0,
      range: Number.isFinite(range) ? range : 0,
      ttRatio: Number.isFinite(ttRatio) ? ttRatio : 0,
      min: Number.isFinite(min) ? min : 0,
      max: Number.isFinite(max) ? max : 0,
      minSite: minSource.site,
      minTd: minSource.td,
      maxSite: maxSource.site,
      maxTd: maxSource.td,
      maxDetailLine,
      unit,
    });
  }
  return stats;
}

function parseSiteTdRows(rows) {
  const siteTdMap = new Map();
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const tdText = String(row[0] ?? "").trim();
    const siteText = String(row[1] ?? "").trim();
    const val = Number.parseFloat(row[2]);
    const tdMatch = tdText.match(/(\d+)/);
    const siteMatch = siteText.match(/(\d+)/);
    if (!tdMatch || !siteMatch || !Number.isFinite(val)) continue;
    const td = String(Number.parseInt(tdMatch[1], 10));
    const site = String(Number.parseInt(siteMatch[1], 10));
    const siteMap = siteTdMap.get(site) ?? new Map();
    siteMap.set(td, val);
    siteTdMap.set(site, siteMap);
  }
  return siteTdMap;
}

function calculateStationTotalFromSiteTd(siteTdMap) {
  if (!siteTdMap || siteTdMap.size === 0) return 0;
  const tdMax = new Map();
  for (const tdMap of siteTdMap.values()) {
    for (const [td, value] of tdMap.entries()) {
      const current = tdMax.get(td);
      if (current === undefined || value > current) tdMax.set(td, value);
    }
  }
  return Array.from(tdMax.values()).reduce((acc, n) => acc + n, 0);
}

function countTouchDown(siteTdMap) {
  if (!siteTdMap || siteTdMap.size === 0) return 0;
  const tdSet = new Set();
  for (const tdMap of siteTdMap.values()) {
    for (const td of tdMap.keys()) tdSet.add(td);
  }
  return tdSet.size;
}

function syncActiveProductForStation() {
  const productsInStation = getProductsInStation(APP.activeStation);
  if (!productsInStation.length) {
    APP.activeProduct = "";
    return;
  }
  if (!productsInStation.some((p) => p.name === APP.activeProduct)) {
    APP.activeProduct = productsInStation[0].name;
  }
  if (!APP.chartSortProduct || !productsInStation.some((p) => p.name === APP.chartSortProduct)) {
    APP.chartSortProduct = APP.activeProduct;
  }
}

function renderStationTabs(stationNames) {
  if (!dom.stationTabsSection || !dom.stationTabs) return;
  dom.stationTabs.innerHTML = "";
  for (const rawName of stationNames) {
    const name = String(rawName || "").trim();
    if (!name) continue;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "station-tab-btn";
    btn.dataset.station = name;
    btn.setAttribute("aria-selected", name === APP.activeStation ? "true" : "false");
    btn.textContent = name;
    dom.stationTabs.appendChild(btn);
  }
  dom.stationTabsSection.classList.remove("hidden");
}

function renderProductTabs() {
  const productsInStation = getProductsInStation(APP.activeStation);
  syncProductTabHost(dom.tableProductTabs, productsInStation);
  syncProductTabHost(dom.siteProductTabs, productsInStation);
}

function syncProductTabHost(host, productsInStation) {
  if (!host) return;
  host.innerHTML = "";
  for (const product of productsInStation) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "station-tab-btn";
    btn.dataset.product = product.name;
    btn.setAttribute("aria-selected", product.name === APP.activeProduct ? "true" : "false");
    btn.textContent = product.name;
    host.appendChild(btn);
  }
}

function onStationTabClick(event) {
  const btn = event.target instanceof Element ? event.target.closest("[data-station]") : null;
  if (!btn) return;
  const stationName = btn.getAttribute("data-station");
  if (!stationName) return;
  APP.activeStation = stationName;
  APP.tableExpanded.clear();
  syncActiveProductForStation();
  renderStationTabs(getStationNames().filter((s) => getProductsInStation(s).length > 0));
  renderProductTabs();
  renderChartFilterOptions();
  renderChartSortOptions();
  renderKpi();
  renderTable();
  renderCharts();
  renderSiteTdChart();
}

function onProductTabClick(event) {
  const btn = event.target instanceof Element ? event.target.closest("[data-product]") : null;
  if (!btn) return;
  const productName = btn.getAttribute("data-product");
  if (!productName) return;
  APP.activeProduct = productName;
  APP.tableExpanded.clear();
  renderProductTabs();
  renderKpi();
  renderTable();
  renderSiteTdChart();
}

function onChartSortProductChange() {
  APP.chartSortProduct = dom.chartSortProduct?.value || APP.chartSortProduct;
  renderCharts();
}

function onChartProductFilterToggle(event) {
  event.stopPropagation();
  const menu = dom.chartFilterProductMenu;
  const btn = dom.chartFilterProductBtn;
  if (!menu || !btn) return;
  closeAllChartMultiFilterMenus();
  const willOpen = menu.classList.contains("hidden");
  menu.classList.toggle("hidden", !willOpen);
  btn.setAttribute("aria-expanded", willOpen ? "true" : "false");
}

function onChartProductFilterItemChange(event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  if (!input.matches("[data-chart-product-filter]")) return;
  APP.chartFilters.product = getCheckedChartProductFilters();
  const totalOptions = dom.chartFilterProductMenu?.querySelectorAll("input[data-chart-product-filter]").length || 0;
  syncChartProductFilterButton(totalOptions);
  renderChartSortOptions();
  renderCharts();
}

function onDocumentClick(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.closest(".chart-multi-filter")) return;
  closeChartProductFilterMenu();
  closeAllChartMultiFilterMenus();
}

function onChartMultiFilterToggle(event, key) {
  event.stopPropagation();
  const targetDom = getChartFilterDomByKey(key);
  if (!targetDom) return;
  closeChartProductFilterMenu();
  closeAllChartMultiFilterMenus();
  const willOpen = targetDom.menu.classList.contains("hidden");
  targetDom.menu.classList.toggle("hidden", !willOpen);
  targetDom.button.setAttribute("aria-expanded", willOpen ? "true" : "false");
}

function onChartMultiFilterItemChange(event, key) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  if (!input.matches("[data-chart-filter-item]")) return;
  APP.chartFilters[key] = getCheckedChartMultiFilters(key);
  const totalOptions = getChartFilterDomByKey(key)?.menu.querySelectorAll("input[data-chart-filter-item]").length || 0;
  syncChartMultiFilterButton(key, `全部 ${capitalizeFilterKey(key)}`, totalOptions);
  renderChartSortOptions();
  renderCharts();
}

function onStatsBodyClick(event) {
  const btn = event.target instanceof Element ? event.target.closest("[data-expand-key]") : null;
  if (!btn) return;
  const key = btn.getAttribute("data-expand-key");
  if (!key) return;
  if (APP.tableExpanded.has(key)) APP.tableExpanded.delete(key);
  else APP.tableExpanded.add(key);
  renderTable();
}

function onStatsHeadClick(event) {
  const btn = event.target instanceof Element ? event.target.closest("[data-sort-key]") : null;
  if (!btn) return;
  const key = btn.getAttribute("data-sort-key");
  if (!key) return;
  if (APP.tableSort.key === key) APP.tableSort.dir = APP.tableSort.dir === "asc" ? "desc" : "asc";
  else {
    APP.tableSort.key = key;
    APP.tableSort.dir = key === "testItem" ? "asc" : "desc";
  }
  renderTable();
}

function renderSortHeaderState() {
  if (!dom.statsThead) return;
  const sortButtons = dom.statsThead.querySelectorAll("[data-sort-key]");
  for (const btn of sortButtons) {
    const key = btn.getAttribute("data-sort-key");
    const isSorted = key === APP.tableSort.key;
    btn.classList.toggle("is-sorted", isSorted);
    btn.classList.toggle("asc", isSorted && APP.tableSort.dir === "asc");
    btn.classList.toggle("desc", isSorted && APP.tableSort.dir === "desc");
  }
}

function buildStats(itemMap, stationTotalTime) {
  const results = [];
  for (const payload of itemMap.values()) {
    const valueRecords = payload.values.filter((entry) => Number.isFinite(entry?.value));
    const values = valueRecords.map((entry) => entry.value).sort((a, b) => a - b);
    const count = valueRecords.length;
    const sum = valueRecords.reduce((acc, entry) => acc + entry.value, 0);
    const mean = sum / count;
    const median = count % 2 === 0 ? (values[count / 2 - 1] + values[count / 2]) / 2 : values[Math.floor(count / 2)];
    const min = values[0];
    const max = values[count - 1];
    const range = max - min;
    const ttRatio = stationTotalTime > 0 ? (sum / stationTotalTime) * 100 : 0;
    let minRecord = null;
    let maxRecord = null;
    for (const entry of valueRecords) {
      if (!minRecord || entry.value < minRecord.value) minRecord = entry;
      if (!maxRecord || entry.value > maxRecord.value) maxRecord = entry;
    }
    results.push({
      testNos: Array.from(payload.testNos).sort((a, b) => Number(a) - Number(b)),
      testItem: payload.testItem,
      count,
      mean,
      median,
      range,
      min,
      max,
      ttRatio,
      unit: payload.unit,
      minSite: minRecord?.site || "Unknown",
      minTd: minRecord?.td || "Unknown",
      maxSite: maxRecord?.site || "Unknown",
      maxTd: maxRecord?.td || "Unknown",
      maxDetailLine: extractMaxDetailRawLine(maxRecord),
    });
  }
  return results.sort((a, b) => (b.mean !== a.mean ? b.mean - a.mean : a.testItem.localeCompare(b.testItem)));
}

function getRawdataSiteCount(station) {
  if (!station?.siteTdMap || station.siteTdMap.size === 0) return 0;
  const filtered = Array.from(station.siteTdMap.keys()).filter((site) => site !== "Unknown");
  return filtered.length > 0 ? filtered.length : station.siteTdMap.size;
}

function destroyKpiCharts() {
  if (window.KpiCompareReact?.clear && dom.kpiSection) {
    window.KpiCompareReact.clear(dom.kpiSection);
  }
}

function renderKpiComparisonCharts(rows) {
  dom.kpiSection.classList.remove("kpi-grid");
  if (window.KpiCompareReact?.render && dom.kpiSection) {
    window.KpiCompareReact.render(dom.kpiSection, {
      stationName: APP.activeStation,
      rows,
      colors: PRODUCT_COLORS,
    });
    return;
  }
  dom.kpiSection.innerHTML = '<div class="kpi-chart-meta">站點：' + escapeHtml(APP.activeStation) + '</div>';
}

function renderKpi() {
  const productsInStation = getProductsInStation(APP.activeStation);
  const rows = [];
  for (const product of productsInStation) {
    const station = product.stations.get(APP.activeStation);
    if (!station) continue;
    rows.push({
      productName: product.name,
      siteCount: getRawdataSiteCount(station),
      itemCount: station.stats.length,
      stationSeconds: station.stationTotalTime,
      stationMinutes: Number((station.stationTotalTime / 60).toFixed(3)),
      touchDownCount: station.touchDownCount,
      touchDownAvgSeconds: station.touchDownCount > 0 ? Number((station.stationTotalTime / station.touchDownCount).toFixed(3)) : 0,
      stationName: station.name,
    });
  }

  if (!rows.length) {
    destroyKpiCharts();
    dom.kpiSection.innerHTML = "";
    dom.kpiSection.classList.add("hidden");
    return;
  }

  if (APP.kpiCollapsed) {
    dom.kpiSection.classList.add("hidden");
    return;
  }

  if (rows.length > 1) {
    destroyKpiCharts();
    renderKpiComparisonCharts(rows);
    dom.kpiSection.classList.remove("hidden");
    return;
  }

  destroyKpiCharts();
  dom.kpiSection.classList.add("kpi-grid");
  const row = rows[0];
  const cards = [
    ["產品名稱", row.productName],
    ["TEST SITE 數", String(row.siteCount)],
    ["Test Item 種類數", String(row.itemCount)],
    ["測試站點時間", formatDuration(row.stationSeconds)],
    ["Touch Down 數", String(row.touchDownCount)],
    ["站點", row.stationName],
  ];
  dom.kpiSection.innerHTML = cards.map(
    ([title, value]) => `
      <div class="kpi-card">
        <div class="kpi-title">${title}</div>
        <div class="kpi-value">${escapeHtml(value)}</div>
      </div>
    `,
  ).join("");
  dom.kpiSection.classList.remove("hidden");
}

function sortStats(stats, sortKey, sortDir) {
  const sign = sortDir === "asc" ? 1 : -1;
  return stats.slice().sort((a, b) => {
    if (sortKey === "testItem") return a.testItem.localeCompare(b.testItem) * sign;
    const av = a[sortKey] ?? 0;
    const bv = b[sortKey] ?? 0;
    if (av === bv) return a.testItem.localeCompare(b.testItem);
    return (av - bv) * sign;
  });
}

function renderTable() {
  const station = getActiveStationData();
  if (!station) {
    dom.tableSection.classList.add("hidden");
    APP.tableCollapsed = true;
    syncTableCollapsedUI();
    return;
  }
  const sorted = sortStats(station.stats, APP.tableSort.key, APP.tableSort.dir);
  dom.statsTbody.innerHTML = sorted
    .map((s) => {
      const rowKey = makeTableExpandKey(station.name, s.testItem);
      const canExpand = Boolean(s.maxDetailLine);
      const expanded = APP.tableExpanded.has(rowKey);
      const baseRow = `
      <tr>
        <td class="expand-cell">${APP.enableAnomalyDetail && canExpand ? `<button type="button" class="expand-btn" data-expand-key="${escapeHtml(rowKey)}" aria-expanded="${expanded ? "true" : "false"}">${expanded ? "−" : "+"}</button>` : ""}</td>
        <td title="${escapeHtml(s.testItem)}">${escapeHtml(s.testItem)}</td>
        <td>${s.count}</td>
        <td>${fmt(s.mean)}</td>
        <td>${fmt(s.median)}</td>
        <td>${fmt(s.range)}</td>
        <td>${fmt(s.ttRatio)}</td>
        <td>${fmt(s.min)}</td>
        <td>${escapeHtml(formatSiteTdSource(s.minSite, s.minTd))}</td>
        <td>${fmt(s.max)}</td>
        <td>${escapeHtml(formatSiteTdSource(s.maxSite, s.maxTd))}</td>
      </tr>`;
      if (!(APP.enableAnomalyDetail && canExpand && expanded)) return baseRow;
      return `${baseRow}
      <tr class="detail-row">
        <td></td>
        <td colspan="10" class="detail-cell"><code>${escapeHtml(s.maxDetailLine)}</code></td>
      </tr>`;
    })
    .join("");
  renderSortHeaderState();
  syncTableCollapsedUI();
  dom.tableSection.classList.remove("hidden");
}

function normalizeFilterValue(value) {
  return String(value || "").trim().toLowerCase();
}

function getChartFilteredProductsInStation(stationName = APP.activeStation) {
  let products = getProductsInStation(stationName);
  const productFilters = Array.isArray(APP.chartFilters.product) ? APP.chartFilters.product : [];
  const processFilters = Array.isArray(APP.chartFilters.process) ? APP.chartFilters.process.map(normalizeFilterValue).filter(Boolean) : [];
  const densityFilters = Array.isArray(APP.chartFilters.density) ? APP.chartFilters.density.map(normalizeFilterValue).filter(Boolean) : [];
  const voltageFilters = Array.isArray(APP.chartFilters.voltage) ? APP.chartFilters.voltage.map(normalizeFilterValue).filter(Boolean) : [];
  if (productFilters.length > 0) {
    const productSet = new Set(productFilters);
    products = products.filter((p) => productSet.has(p.name));
  }
  if (processFilters.length > 0) {
    const filterSet = new Set(processFilters);
    products = products.filter((p) => filterSet.has(normalizeFilterValue(p.process)));
  }
  if (densityFilters.length > 0) {
    const filterSet = new Set(densityFilters);
    products = products.filter((p) => filterSet.has(normalizeFilterValue(p.density)));
  }
  if (voltageFilters.length > 0) {
    const filterSet = new Set(voltageFilters);
    products = products.filter((p) => filterSet.has(normalizeFilterValue(p.voltage)));
  }
  return products;
}

function getCheckedChartProductFilters() {
  if (!dom.chartFilterProductMenu) return [];
  return Array.from(dom.chartFilterProductMenu.querySelectorAll("input[data-chart-product-filter]:checked"))
    .map((node) => node.getAttribute("data-chart-product-filter") || "")
    .filter(Boolean);
}

function syncChartProductFilterButton(totalCount = null) {
  if (!dom.chartFilterProductBtn) return;
  const selected = Array.isArray(APP.chartFilters.product) ? APP.chartFilters.product : [];
  const total = totalCount ?? getProductsInStation(APP.activeStation).length;
  if (selected.length === 0 || (total > 0 && selected.length >= total)) {
    dom.chartFilterProductBtn.textContent = "全部產品";
    dom.chartFilterProductBtn.title = "全部產品";
    return;
  }
  if (selected.length === 1) {
    dom.chartFilterProductBtn.textContent = selected[0];
    dom.chartFilterProductBtn.title = selected[0];
    return;
  }
  dom.chartFilterProductBtn.textContent = `${selected.length} 項產品`;
  dom.chartFilterProductBtn.title = selected.join(", ");
}

function closeChartProductFilterMenu() {
  if (!dom.chartFilterProductMenu || !dom.chartFilterProductBtn) return;
  dom.chartFilterProductMenu.classList.add("hidden");
  dom.chartFilterProductBtn.setAttribute("aria-expanded", "false");
}

function getChartFilterDomByKey(key) {
  if (key === "process" && dom.chartFilterProcessBtn && dom.chartFilterProcessMenu) {
    return { button: dom.chartFilterProcessBtn, menu: dom.chartFilterProcessMenu };
  }
  if (key === "density" && dom.chartFilterDensityBtn && dom.chartFilterDensityMenu) {
    return { button: dom.chartFilterDensityBtn, menu: dom.chartFilterDensityMenu };
  }
  if (key === "voltage" && dom.chartFilterVoltageBtn && dom.chartFilterVoltageMenu) {
    return { button: dom.chartFilterVoltageBtn, menu: dom.chartFilterVoltageMenu };
  }
  return null;
}

function closeAllChartMultiFilterMenus() {
  for (const key of ["process", "density", "voltage"]) {
    const targetDom = getChartFilterDomByKey(key);
    if (!targetDom) continue;
    targetDom.menu.classList.add("hidden");
    targetDom.button.setAttribute("aria-expanded", "false");
  }
}

function capitalizeFilterKey(key) {
  return key ? key[0].toUpperCase() + key.slice(1) : "";
}

function getCheckedChartMultiFilters(key) {
  const targetDom = getChartFilterDomByKey(key);
  if (!targetDom) return [];
  return Array.from(targetDom.menu.querySelectorAll("input[data-chart-filter-item]:checked"))
    .map((node) => node.getAttribute("data-chart-filter-item") || "")
    .filter(Boolean);
}

function syncChartMultiFilterButton(key, allLabel, totalCount = null) {
  const targetDom = getChartFilterDomByKey(key);
  if (!targetDom) return;
  const selected = Array.isArray(APP.chartFilters[key]) ? APP.chartFilters[key] : [];
  const total = totalCount ?? 0;
  if (selected.length === 0 || (total > 0 && selected.length >= total)) {
    targetDom.button.textContent = allLabel;
    targetDom.button.title = allLabel;
    return;
  }
  if (selected.length === 1) {
    targetDom.button.textContent = selected[0];
    targetDom.button.title = selected[0];
    return;
  }
  targetDom.button.textContent = `${selected.length} 項`;
  targetDom.button.title = selected.join(", ");
}

function renderChartProductFilterOptions(productsInStation) {
  if (!dom.chartFilterProductMenu) return;
  const options = productsInStation.map((p) => p.name);
  const allowed = new Set(options);
  let selected = (Array.isArray(APP.chartFilters.product) ? APP.chartFilters.product : []).filter((name) => allowed.has(name));
  if (selected.length === 0 && options.length > 0) selected = [...options];
  APP.chartFilters.product = selected;
  dom.chartFilterProductMenu.innerHTML = options
    .map(
      (name) => `
        <label class="chart-multi-item">
          <input type="checkbox" data-chart-product-filter="${escapeHtml(name)}" ${selected.includes(name) ? "checked" : ""}>
          <span>${escapeHtml(name)}</span>
        </label>
      `,
    )
    .join("");
  syncChartProductFilterButton(options.length);
}

function renderChartMultiFilterOptions(key, options, allLabel) {
  const targetDom = getChartFilterDomByKey(key);
  if (!targetDom) return;
  const allowed = new Set(options);
  let selected = (Array.isArray(APP.chartFilters[key]) ? APP.chartFilters[key] : []).filter((name) => allowed.has(name));
  if (selected.length === 0 && options.length > 0) selected = [...options];
  APP.chartFilters[key] = selected;
  targetDom.menu.innerHTML = options
    .map(
      (value) => `
        <label class="chart-multi-item">
          <input type="checkbox" data-chart-filter-item="${escapeHtml(value)}" ${selected.includes(value) ? "checked" : ""}>
          <span>${escapeHtml(value)}</span>
        </label>
      `,
    )
    .join("");
  syncChartMultiFilterButton(key, allLabel, options.length);
}

function renderChartFilterOptions() {
  const productsInStation = getProductsInStation(APP.activeStation);
  renderChartProductFilterOptions(productsInStation);

  const processPairs = Array.from(new Set(productsInStation.map((p) => (p.process || "").trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b));
  renderChartMultiFilterOptions("process", processPairs, "全部 Process");

  const densityPairs = Array.from(new Set(productsInStation.map((p) => (p.density || "").trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b));
  renderChartMultiFilterOptions("density", densityPairs, "全部 Density");

  const voltagePairs = Array.from(new Set(productsInStation.map((p) => (p.voltage || "").trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b));
  renderChartMultiFilterOptions("voltage", voltagePairs, "全部 Voltage");
}

function renderChartSortOptions() {
  if (!dom.chartSortProduct) return;
  const productsInStation = getChartFilteredProductsInStation(APP.activeStation);
  dom.chartSortProduct.innerHTML = productsInStation
    .map((p) => `<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)}</option>`)
    .join("");
  if (!productsInStation.some((p) => p.name === APP.chartSortProduct)) APP.chartSortProduct = APP.activeProduct;
  dom.chartSortProduct.value = APP.chartSortProduct || productsInStation[0]?.name || "";
}

function buildChartLabels(items) {
  return items.map((s) => (s.testItem.length > 32 ? `${s.testItem.slice(0, 32)}...` : s.testItem));
}

function getTopByMetric(stats, metricKey) {
  return stats
    .slice()
    .sort((a, b) => ((b[metricKey] ?? 0) - (a[metricKey] ?? 0) !== 0 ? (b[metricKey] ?? 0) - (a[metricKey] ?? 0) : a.testItem.localeCompare(b.testItem)))
    .slice(0, 15);
}

function metricValue(stat, metric) {
  if (!stat) return 0;
  if (metric === "count") return stat.count;
  if (metric === "mean") return Number(stat.mean.toFixed(6));
  if (metric === "range") return Number(stat.range.toFixed(6));
  return Number(stat.ttRatio.toFixed(6));
}

function renderMetricChart(canvasId, metricKey, label, colorFallback) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const productsInStation = getChartFilteredProductsInStation(APP.activeStation);
  if (!productsInStation.length) return null;

  const sortProduct = getProductByName(APP.chartSortProduct) ?? productsInStation[0];
  const sortStation = sortProduct?.stations.get(APP.activeStation);
  const top = getTopByMetric(sortStation?.stats ?? [], metricKey);
  const labels = buildChartLabels(top);
  const rawItems = top.map((item) => item.testItem);
  const datasets = productsInStation.map((product, idx) => {
    const station = product.stations.get(APP.activeStation);
    const statMap = new Map((station?.stats ?? []).map((s) => [s.testItem, s]));
    return {
      label: product.name,
      data: rawItems.map((item) => metricValue(statMap.get(item), metricKey)),
      backgroundColor: PRODUCT_COLORS[idx % PRODUCT_COLORS.length] || colorFallback,
    };
  });

  return new Chart(canvas, {
    type: "bar",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "#cbd5e1" }, title: { display: true, text: label } } },
      scales: {
        x: { ticks: { color: "#94a3b8" }, grid: { color: "#1e293b" } },
        y: { ticks: { color: "#94a3b8" }, grid: { color: "#1e293b" } },
      },
    },
  });
}

function renderCharts() {
  for (const key of Object.keys(APP.charts)) {
    if (APP.charts[key]) {
      APP.charts[key].destroy();
      APP.charts[key] = null;
    }
  }
  if (!getChartFilteredProductsInStation(APP.activeStation).length) {
    dom.chartSection.classList.add("hidden");
    return;
  }
  syncChartCollapsedUI();
  if (APP.chartCollapsed) {
    dom.chartSection.classList.remove("hidden");
    return;
  }
  APP.charts.count = renderMetricChart("count-chart", "count", "Count", "#3b82f6");
  APP.charts.mean = renderMetricChart("mean-chart", "mean", "Mean (s)", "#10b981");
  APP.charts.range = renderMetricChart("range-chart", "range", "Range (s)", "#f59e0b");
  APP.charts.ratio = renderMetricChart("tt-ratio-chart", "ttRatio", "TT Ratio/站點 (%)", "#a855f7");
  dom.chartSection.classList.remove("hidden");
}

function renderSiteTdChart() {
  const station = getActiveStationData();
  if (!station || !station.siteTdMap || station.siteTdMap.size === 0) {
    if (window.SiteTdHeatmapReact && dom.siteTdHeatmap) window.SiteTdHeatmapReact.clear(dom.siteTdHeatmap);
    dom.siteTdSection.classList.add("hidden");
    return;
  }
  if (window.SiteTdHeatmapReact && dom.siteTdHeatmap) window.SiteTdHeatmapReact.render(dom.siteTdHeatmap, station.siteTdMap);
  dom.siteTdSection.classList.remove("hidden");
}

function exportXlsx() {
  if (!hasAnalyzedData()) {
    showMessage("目前沒有可匯出的分析資料。", "error");
    return;
  }
  if (typeof XLSX === "undefined") {
    showMessage("XLSX 匯出元件尚未載入。", "error");
    return;
  }

  const entries = [];
  for (const product of getProducts()) {
    for (const station of product.stations.values()) {
      if (station.stats.length > 0) entries.push({ product: product.name, station });
    }
  }
  const sourceLabel = APP.sourceMode === "txt" ? "Direct TXT Upload" : "Folder home/*/rawdata";
  const summaryRows = [["Field", ...entries.map((e) => `${e.product}_${e.station.name}`)]];
  const summaryFields = [
    { key: "Product", getValue: (entry) => entry.product },
    { key: "Source", getValue: () => sourceLabel },
    { key: "Root", getValue: (entry) => entry.station.rootFolderName || APP.rootName || "" },
    {
      key: "LOTNO",
      getValue: (entry) => {
        const fromRoot = parseRootMeta(entry.station.rootFolderName || "")?.lotNo;
        const fromParsed = String(entry.station.parsedMeta?.lotNo || "").trim();
        return fromRoot || fromParsed || "-";
      },
    },
    {
      key: "WAFER ID",
      getValue: (entry) => {
        const fromRoot = parseRootMeta(entry.station.rootFolderName || "")?.waferId;
        const fromParsed = String(entry.station.parsedMeta?.waferId || "").trim();
        return fromRoot || fromParsed || "-";
      },
    },
    { key: "Station", getValue: (entry) => entry.station.name },
    { key: "TouchDownCount", getValue: (entry) => String(entry.station.touchDownCount) },
    { key: "StationTotalTime(HH:MM:SS)", getValue: (entry) => formatDuration(entry.station.stationTotalTime) },
    { key: "StationTotalTimeSeconds", getValue: (entry) => fmt(entry.station.stationTotalTime) },
  ];
  for (const field of summaryFields) summaryRows.push([field.key, ...entries.map((entry) => field.getValue(entry))]);

  const wb = XLSX.utils.book_new();
  const usedSheetNames = new Set();
  appendSheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), "Summary", usedSheetNames);

  for (const entry of entries) {
    const itemRows = [[
      "Test Nos",
      "Test Item",
      "Count",
      "Mean(s)",
      "Median(s)",
      "Range(s)",
      "TT Ratio/站點(%)",
      "Min(s)",
      "Min Source(SITE/TD)",
      "Max(s)",
      "Max Source(SITE/TD)",
      "Max Detail RawLine",
      "Unit",
    ]];
    for (const s of entry.station.stats) {
      itemRows.push([
        s.testNos.join("|"),
        s.testItem,
        String(s.count),
        fmt(s.mean),
        fmt(s.median),
        fmt(s.range),
        fmt(s.ttRatio),
        fmt(s.min),
        formatSiteTdSource(s.minSite, s.minTd),
        fmt(s.max),
        formatSiteTdSource(s.maxSite, s.maxTd),
        s.maxDetailLine || "",
        s.unit || "S",
      ]);
    }
    appendSheet(wb, XLSX.utils.aoa_to_sheet(itemRows), `${entry.product}_${entry.station.name}_TestItem_Stats`, usedSheetNames);

    const siteTdRows = [["TouchDown", "Site", "Time(s)", "Time(HH:MM:SS)"]];
    if (entry.station.siteTdMap && entry.station.siteTdMap.size > 0) {
      const siteLabels = Array.from(entry.station.siteTdMap.keys()).sort((a, b) => (a === "Unknown" ? 1 : b === "Unknown" ? -1 : Number(a) - Number(b)));
      const tdSet = new Set();
      for (const tdMap of entry.station.siteTdMap.values()) for (const td of tdMap.keys()) tdSet.add(td);
      const tdLabels = Array.from(tdSet).sort((a, b) => Number(a) - Number(b));
      for (const td of tdLabels) {
        for (const site of siteLabels) {
          const value = (entry.station.siteTdMap.get(site) ?? new Map()).get(td);
          if (value === undefined) continue;
          siteTdRows.push([`TD ${td}`, `SITE ${site}`, fmt(value), formatDuration(value)]);
        }
      }
    }
    appendSheet(wb, XLSX.utils.aoa_to_sheet(siteTdRows), `${entry.product}_${entry.station.name}_Site_TouchDown`, usedSheetNames);
  }

  const productNames = getProducts().map((p) => p.name).filter(Boolean);
  const safeName = sanitizeFileName(productNames.join("_") || APP.manualProductName || "rawdata");
  XLSX.writeFile(wb, `${safeName}_test_time_stats.xlsx`);
  showMessage("XLSX 匯出完成。", "success");
}

function appendSheet(workbook, worksheet, desiredName, usedNames) {
  const sheetName = createUniqueSheetName(desiredName, usedNames);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  usedNames.add(sheetName);
}

function createUniqueSheetName(value, usedNames) {
  const maxLen = 31;
  const base = sanitizeSheetName(value).slice(0, maxLen) || "Sheet";
  if (!usedNames.has(base)) return base;
  let idx = 1;
  while (idx < 1000) {
    const suffix = `_${idx}`;
    const candidate = `${base.slice(0, maxLen - suffix.length)}${suffix}`;
    if (!usedNames.has(candidate)) return candidate;
    idx += 1;
  }
  return `Sheet_${Date.now()}`.slice(0, maxLen);
}

function sanitizeFileName(value) {
  return String(value || "")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, "_");
}

function sanitizeSheetName(value) {
  return String(value || "")
    .replace(/[\[\]\*\/?\\:]/g, "_")
    .replace(/[\x00-\x1F]/g, "_")
    .trim();
}

function setProgress(percent) {
  dom.progressBar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
}

function fmt(n) {
  return Number.isFinite(n) ? n.toFixed(6) : "-";
}

function formatDuration(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "-";
  const rounded = Math.round(totalSeconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const seconds = rounded % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function parseRawTxtFilename(filename) {
  const m = filename.match(RAW_TXT_FILENAME_REGEX);
  if (!m) return null;
  return { lotNo: m[1], waferNo: Number.parseInt(m[2], 10), datetimeRaw: m[3], site: Number.parseInt(m[4], 10) };
}

function parseTestTimeLineMeta(line) {
  const m = String(line || "").match(LINE_PREFIX_META_REGEX);
  if (!m) return { systemDut: "", x: "", y: "", td: "" };
  const rawTd = String(m[4] || "").trim();
  const tdNum = Number.parseInt(rawTd, 10);
  return {
    systemDut: String(m[1] || "").trim(),
    x: String(m[2] || "").trim(),
    y: String(m[3] || "").trim(),
    td: Number.isFinite(tdNum) ? String(tdNum) : rawTd,
  };
}

function makeTableExpandKey(stationName, testItem) {
  return `${String(stationName || "").trim()}||${String(testItem || "").trim()}`;
}

function extractMaxDetailRawLine(maxRecord) {
  if (!maxRecord || !Array.isArray(maxRecord.lines)) return "";
  const lines = maxRecord.lines;
  const endIndex = Number.isInteger(maxRecord.lineIndex) ? maxRecord.lineIndex : -1;
  if (endIndex < 0 || endIndex >= lines.length) return "";
  const td = String(maxRecord.td || "").trim();
  const testNo = String(maxRecord.testNo || "").trim();
  const testItem = String(maxRecord.testItem || "").trim();
  if (!td || !testNo || !testItem) return "";

  const headerIndex = findTestItemHeaderLine(lines, endIndex, td, testNo, testItem);
  if (headerIndex < 0) return "";
  const detail = findMaxTimingLineBetween(lines, headerIndex + 1, endIndex - 1, td);
  return detail?.rawLine || "";
}

function findTestItemHeaderLine(lines, fromIndex, td, testNo, testItem) {
  const escapedItem = escapeRegExp(testItem);
  const escapedNo = escapeRegExp(testNo);
  const testRefRegex = new RegExp(`\\b${escapedNo}\\s*,\\s*${escapedItem}\\b`);
  for (let i = fromIndex - 1; i >= 0; i -= 1) {
    const line = String(lines[i] || "");
    if (!line.includes("////")) continue;
    const meta = parseTestTimeLineMeta(line);
    if (String(meta.td || "").trim() !== td) continue;
    if (testRefRegex.test(line)) return i;
  }
  return -1;
}

function findMaxTimingLineBetween(lines, startIdx, endIdx, td) {
  const regex = /(?:^|[;,\s])(T|Terase|Tpgm|Twc|Tbusy|Twp)\s*=\s*([+-]?\d*\.?\d+)\s*(ms|s)\b/ig;
  let best = null;
  for (let i = Math.max(0, startIdx); i <= endIdx && i < lines.length; i += 1) {
    const line = String(lines[i] || "");
    if (!line.startsWith("T:")) continue;
    const meta = parseTestTimeLineMeta(line);
    if (String(meta.td || "").trim() !== td) continue;

    let localBestSec = null;
    let m = regex.exec(line);
    while (m) {
      const rawValue = Number.parseFloat(m[2]);
      const unit = String(m[3] || "").toLowerCase();
      if (Number.isFinite(rawValue)) {
        const sec = unit === "ms" ? rawValue / 1000 : rawValue;
        if (localBestSec === null || sec > localBestSec) localBestSec = sec;
      }
      m = regex.exec(line);
    }
    regex.lastIndex = 0;
    if (localBestSec === null) continue;
    if (!best || localBestSec > best.valueSec) {
      best = { valueSec: localBestSec, rawLine: line.trim() };
    }
  }
  return best;
}

function formatSiteTdSource(site, td) {
  const siteLabel = site && site !== "Unknown" ? String(site) : "?";
  const tdLabel = td && td !== "Unknown" ? String(td) : "?";
  return `SITE ${siteLabel} / TD ${tdLabel}`;
}

function parseSourceCell(text) {
  const raw = String(text || "").trim();
  const siteMatch = raw.match(/SITE\s*([^\s/]+)/i);
  const tdMatch = raw.match(/TD\s*([^\s/]+)/i);
  return {
    site: siteMatch ? siteMatch[1] : "Unknown",
    td: tdMatch ? tdMatch[1] : "Unknown",
  };
}

function normalizeTtRatioValue(value, headerName) {
  if (!Number.isFinite(value)) return 0;
  const header = String(headerName || "").toLowerCase();
  const isPercentHeader = header.includes("(%)") || header.includes("%");
  return isPercentHeader ? value : value * 100;
}

function getCellByHeader(row, idxMap, aliases, fallbackIndex) {
  for (const alias of aliases) {
    if (!idxMap.has(alias)) continue;
    const idx = idxMap.get(alias);
    return row[idx];
  }
  return row[fallbackIndex];
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatValueList(values) {
  if (!values || values.length === 0) return "-";
  return values.join(", ");
}

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function switchEntryPage(target) {
  const isGuide = target === "guide";
  const isXlsx = target === "xlsx";
  APP.entryMode = isGuide ? "guide" : (isXlsx ? "xlsx" : "analysis");
  dom.analysisPage?.classList.toggle("hidden", isGuide);
  dom.guidePage?.classList.toggle("hidden", !isGuide);

  if (dom.entryTabAnalysis) {
    const active = !isGuide && !isXlsx;
    dom.entryTabAnalysis.classList.toggle("is-active", active);
    dom.entryTabAnalysis.setAttribute("aria-selected", active ? "true" : "false");
  }
  if (dom.entryTabXlsx) {
    dom.entryTabXlsx.classList.toggle("is-active", isXlsx);
    dom.entryTabXlsx.setAttribute("aria-selected", isXlsx ? "true" : "false");
  }
  if (dom.entryTabGuide) {
    dom.entryTabGuide.classList.toggle("is-active", isGuide);
    dom.entryTabGuide.setAttribute("aria-selected", isGuide ? "true" : "false");
  }
  applyEntryModeUI();
}

function applyEntryModeUI() {
  const isXlsx = APP.entryMode === "xlsx";
  if (dom.sourceModeGroup) dom.sourceModeGroup.classList.toggle("hidden", isXlsx);
  if (dom.productInput) {
    dom.productInput.disabled = isXlsx;
    dom.productInput.placeholder = isXlsx ? "XLSX 匯入模式由檔案內產品資訊判斷" : "例如：EAG119C";
  }
  if (dom.pickBtn) dom.pickBtn.textContent = isXlsx ? "📄 選擇 XLSX 檔案" : "📂 選擇上傳檔案";
  if (dom.analyzeBtn) dom.analyzeBtn.textContent = isXlsx ? "▶ 載入XLSX分析" : "▶ 開始分析";
  if (dom.sourceRuleText) {
    dom.sourceRuleText.innerHTML = isXlsx
      ? "規則：請選擇由本工具匯出的 <code>.xlsx</code>，可一次匯入多個產品檔案，系統會自動合併成多產品比較分析。"
      : `規則：先勾選模式再上傳。<br>
          - <code>資料夾匯入</code>：會讀取符合 <code>產品主目錄/RW_*_LOTNO_WAFERID_站點_YYYYMMDDHHMMSS/home/*/rawdata</code> 的 .TXT（例如：<code>FAG112/RW_CP1_65296Z600_01_S1P1_20260112181636/home/winbond/rawdata</code>）<br>
          - <code>單選 .TXT 檔案</code>：直接解析你選的單一檔案<br>
          ※ 僅分析產品目錄開頭為 <code>FAG/EAG/MAG/AAG/KAG/RAG</code> 的資料夾，其餘會略過<br>
          ※ 掃描後可於「解析範圍勾選」選擇要分析的產品/站點<br>
          ※ 系統會同步檢查 <code>RW_*_LOTNO_WAFERID_站點_YYYYMMDDHHMMSS</code> 並嘗試自動帶入 <code>LOTNO / WAFER ID / 站點</code><br>
          ※ 若未找到符合產品目錄，可在下方手動輸入 <code>PRODUCT / LOTNO / WAFER ID / 站點</code> 後開始分析（PRODUCT 需以 <code>FAG/EAG/MAG/AAG/KAG/RAG</code> 開頭）`;
  }
  if (isXlsx) APP.sourceMode = "xlsx";
  else if (APP.sourceMode === "xlsx") APP.sourceMode = Array.from(dom.sourceModeRadios).find((r) => r.checked)?.value ?? "folder";
  renderScopeSelection();
  updateAnalyzeState();
}

function stripAiWakeupSection(markdown) {
  let cleaned = String(markdown || "");
  cleaned = cleaned.replace(/<!--[\s\S]*?AI SESSION CONTEXT[\s\S]*?-->\s*/gi, "");
  cleaned = cleaned.replace(/##\s*🤖\s*AI\s*快速喚醒區[\s\S]*?(?=\n##\s+|$)/gi, "");
  return cleaned.trim();
}

async function initializeGuidePage() {
  if (!dom.guideContent) return;
  const sources = [
    "https://raw.githubusercontent.com/desmondlyu/rawdata_analysis/main/README.md",
    "README.md",
  ];
  let markdown = "";
  for (const src of sources) {
    try {
      const resp = await fetch(src, { cache: "no-store" });
      if (!resp.ok) continue;
      markdown = await resp.text();
      if (markdown.trim()) break;
    } catch (_err) {
      // try next source
    }
  }

  markdown = stripAiWakeupSection(markdown);
  if (!markdown.trim()) {
    dom.guideContent.textContent = "無法載入操作說明（README）。";
    return;
  }

  if (window.marked && typeof window.marked.parse === "function") {
    dom.guideContent.innerHTML = window.marked.parse(markdown);
  } else {
    dom.guideContent.textContent = markdown;
  }
}
