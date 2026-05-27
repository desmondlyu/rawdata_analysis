const APP = {
  files: [],
  rootName: "",
  sourceMode: "none",
  manualProductName: "",
  products: new Map(),
  activeStation: "",
  activeProduct: "",
  chartSortProduct: "",
  tableSort: { key: "mean", dir: "desc" },
  charts: { count: null, mean: null, range: null, ratio: null },
};

const ROOT_REGEX = /^RW_(.+)_([^_]+)_([^_]+)_([^_]+)_(\d{14})$/i;
const PRODUCT_ROOT_REGEX = /^(EAG|FAG|AAG|KAG|MAG|RAG)\S*$/i;
const TEST_TIME_REGEX = /<<<\s*Test Time\s*>>>\s*,\s*(\d+)\s*,\s*([^,]+?)\s*,\s*([+-]?\d*\.?\d+)\s*,\s*\(([^)]+)\)/i;
const TOTAL_TEST_TIME_REGEX = /:(\d+):Total Test Time\s*=\s*([+-]?\d*\.?\d+)\s*\(S\)/i;
const RAW_TXT_FILENAME_REGEX = /^([^_]+)_Wafer(\d+)_([0-9]{14})_S(\d+)\.txt$/i;

const PRODUCT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#a855f7", "#06b6d4", "#ef4444", "#84cc16", "#f97316"];

const dom = {
  pickBtn: document.getElementById("pick-btn"),
  folderInput: document.getElementById("folder-input"),
  txtInput: document.getElementById("txt-input"),
  sourceModeRadios: document.querySelectorAll('input[name="source-mode"]'),
  productInput: document.getElementById("product-input"),
  folderName: document.getElementById("folder-name"),
  folderMeta: document.getElementById("folder-meta"),
  entryTabAnalysis: document.getElementById("entry-tab-analysis"),
  entryTabGuide: document.getElementById("entry-tab-guide"),
  analysisPage: document.getElementById("analysis-page"),
  guidePage: document.getElementById("guide-page"),
  guideContent: document.getElementById("guide-content"),
  message: document.getElementById("message"),
  analyzeBtn: document.getElementById("analyze-btn"),
  exportBtn: document.getElementById("export-btn"),
  progressWrap: document.getElementById("progress-wrap"),
  progressBar: document.getElementById("progress-bar"),
  stationTabsSection: document.getElementById("station-tabs-section"),
  stationTabs: document.getElementById("station-tabs"),
  tableProductTabs: document.getElementById("table-product-tabs"),
  siteProductTabs: document.getElementById("site-product-tabs"),
  kpiSection: document.getElementById("kpi-section"),
  chartSection: document.getElementById("chart-section"),
  chartSortProduct: document.getElementById("chart-sort-product"),
  tableSection: document.getElementById("table-section"),
  statsThead: document.getElementById("stats-thead"),
  statsTbody: document.getElementById("stats-tbody"),
  siteTdSection: document.getElementById("site-td-section"),
  siteTdHeatmap: document.getElementById("site-td-heatmap"),
};

dom.pickBtn.addEventListener("click", onPickSourceClick);
dom.folderInput.addEventListener("change", handleFolderSelection);
dom.txtInput.addEventListener("change", handleTxtSelection);
dom.productInput.addEventListener("input", onProductNameChange);
dom.analyzeBtn.addEventListener("click", startAnalysis);
dom.exportBtn.addEventListener("click", exportXlsx);
dom.stationTabs?.addEventListener("click", onStationTabClick);
dom.tableProductTabs?.addEventListener("click", onProductTabClick);
dom.siteProductTabs?.addEventListener("click", onProductTabClick);
dom.statsThead?.addEventListener("click", onStatsHeadClick);
dom.chartSortProduct?.addEventListener("change", onChartSortProductChange);
dom.entryTabAnalysis?.addEventListener("click", () => switchEntryPage("analysis"));
dom.entryTabGuide?.addEventListener("click", () => switchEntryPage("guide"));

initializeGuidePage();

function onPickSourceClick() {
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

function onProductNameChange() {
  APP.manualProductName = dom.productInput.value.trim();
  updateAnalyzeState();
  if (hasAnalyzedData()) {
    renderMeta(buildMetaCards());
    renderKpi();
  }
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
      stationSet.add(stationName);
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

  dom.stationTabsSection?.classList.add("hidden");
  dom.kpiSection.classList.add("hidden");
  dom.chartSection.classList.add("hidden");
  dom.tableSection.classList.add("hidden");
  dom.siteTdSection.classList.add("hidden");

  if (dom.stationTabs) dom.stationTabs.innerHTML = "";
  if (dom.tableProductTabs) dom.tableProductTabs.innerHTML = "";
  if (dom.siteProductTabs) dom.siteProductTabs.innerHTML = "";
  if (dom.chartSortProduct) dom.chartSortProduct.innerHTML = "";
  dom.statsTbody.innerHTML = "";
  dom.progressWrap.classList.add("hidden");
  setProgress(0);

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

function updateAnalyzeState() {
  const hasRawFiles = getTotalRawTxtCount() > 0;
  const hasManualProduct = APP.manualProductName.length > 0;
  const hasAutoProduct = getProducts().length > 0;
  dom.analyzeBtn.disabled = !(hasRawFiles && (hasManualProduct || hasAutoProduct));
  dom.exportBtn.disabled = !hasAnalyzedData();
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
      (parts[idx + 1] || "").toLowerCase() === "winbond" &&
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
  APP.products.clear();
  APP.activeStation = "";
  APP.activeProduct = "";
  resetResultsUI();

  if (!APP.files.length) {
    updateAnalyzeState();
    return;
  }

  const firstPath = APP.files[0].webkitRelativePath || APP.files[0].name;
  APP.rootName = firstPath.split("/")[0] || firstPath;
  dom.folderName.textContent = APP.rootName;

  const rootProduct = detectProductToken(APP.rootName);
  if (rootProduct) {
    APP.manualProductName = rootProduct;
    dom.productInput.value = rootProduct;
  } else {
    APP.manualProductName = dom.productInput.value.trim();
  }

  for (const file of APP.files) {
    const rel = String(file.webkitRelativePath || "");
    if (!rel.toLowerCase().endsWith(".txt")) continue;
    const parsed = parseImportPath(rel);
    if (!parsed) continue;

    const productName = parsed.productName || APP.manualProductName || "UNSPECIFIED";
    const product = ensureProduct(productName);
    const station = ensureStation(product, parsed.stationName, parsed.stationFolder, parsed.stationMeta);
    station.rawTxtFiles.push(file);

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

  renderMeta(buildMetaCards());

  const txtCount = getTotalRawTxtCount();
  if (!txtCount) {
    showMessage("未在任一產品/站點子目錄的 home/winbond/rawdata 下找到 .TXT 檔案。", "error");
  } else {
    showMessage(`已找到 ${getProducts().length} 個產品、${stationNames.length} 個站點、共 ${txtCount} 個 .TXT 檔案。`, "success");
  }
  updateAnalyzeState();
}

function handleTxtSelection(event) {
  APP.sourceMode = "txt";
  APP.files = Array.from(event.target.files || []);
  APP.rootName = "直接 TXT 上傳";
  APP.products.clear();
  APP.activeStation = "";
  APP.activeProduct = "";
  resetResultsUI();

  APP.manualProductName = dom.productInput.value.trim();
  const txtFiles = APP.files.filter((f) => f.name.toLowerCase().endsWith(".txt"));
  if (txtFiles.length > 0) {
    const product = ensureProduct(APP.manualProductName || "TXT");
    const station = ensureStation(product, "TXT", "TXT", { lotNo: "-", waferId: "-", station: "TXT", datetime: "-" });
    station.rawTxtFiles = txtFiles;
    product.rootNames.add("TXT");
    APP.activeStation = "TXT";
    APP.activeProduct = product.name;
  }

  dom.folderName.textContent = txtFiles.length ? `直接 TXT 上傳（${txtFiles.length} 檔）` : "尚未選擇";
  renderMeta(buildMetaCards());

  if (!txtFiles.length) showMessage("未選到任何 .TXT 檔案。", "error");
  else showMessage(`已選擇 ${txtFiles.length} 個 .TXT 檔案。`, "success");

  updateAnalyzeState();
}

function buildMetaCards() {
  if (APP.sourceMode === "txt") {
    const name = APP.manualProductName || getProducts()[0]?.name || "-";
    return [{ product: name, lotNo: "-", waferId: "-", station: "TXT" }];
  }
  const cards = [];
  for (const product of getProducts()) {
    const stationNames = Array.from(product.stations.keys()).sort((a, b) => a.localeCompare(b));
    cards.push({
      product: product.name,
      lotNo: formatValueList(Array.from(product.lotNos).sort()),
      waferId: formatValueList(Array.from(product.waferIds).sort()),
      station: formatValueList(stationNames),
    });
  }
  return cards.length ? cards : [{ product: APP.manualProductName || "-", lotNo: "-", waferId: "-", station: "-" }];
}

function renderMeta(cards) {
  const entries = [];
  for (const card of cards) {
    entries.push(["PRODUCT", card.product], ["LOTNO", card.lotNo], ["WAFER ID", card.waferId], ["站點", card.station]);
  }
  dom.folderMeta.innerHTML = entries
    .map(
      ([k, v]) => `
      <div class="meta-chip">
        <div class="meta-key">${k}</div>
        <div class="meta-value">${escapeHtml(String(v ?? "-"))}</div>
      </div>
    `,
    )
    .join("");
  dom.folderMeta.classList.remove("hidden");
}

async function startAnalysis() {
  APP.manualProductName = dom.productInput.value.trim();
  const totalFiles = getTotalRawTxtCount();
  if (!totalFiles) {
    showMessage("請先選擇資料夾或上傳 TXT。", "error");
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
      const itemMap = new Map();
      const tdMaxMap = new Map();
      const siteTdMap = new Map();

      for (const file of station.rawTxtFiles) {
        const fileMeta = parseRawTxtFilename(file.name);
        const siteKey = fileMeta ? String(fileMeta.site) : "Unknown";
        const text = await file.text();
        const lines = text.split(/\r?\n/);

        for (const line of lines) {
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

          const row = itemMap.get(testItem) ?? { testNos: new Set(), testItem, values: [], unit };
          row.testNos.add(testNo);
          row.values.push(value);
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
  for (const name of stationNames) {
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
  syncActiveProductForStation();
  renderStationTabs(getStationNames().filter((s) => getProductsInStation(s).length > 0));
  renderProductTabs();
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
  renderProductTabs();
  renderKpi();
  renderTable();
  renderSiteTdChart();
}

function onChartSortProductChange() {
  APP.chartSortProduct = dom.chartSortProduct?.value || APP.chartSortProduct;
  renderCharts();
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
    const values = payload.values.slice().sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((acc, n) => acc + n, 0);
    const mean = sum / count;
    const median = count % 2 === 0 ? (values[count / 2 - 1] + values[count / 2]) / 2 : values[Math.floor(count / 2)];
    const min = values[0];
    const max = values[count - 1];
    const range = max - min;
    const ttRatio = stationTotalTime > 0 ? sum / stationTotalTime : 0;
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
    });
  }
  return results.sort((a, b) => (b.mean !== a.mean ? b.mean - a.mean : a.testItem.localeCompare(b.testItem)));
}

function getRawdataSiteCount(station) {
  if (!station?.siteTdMap || station.siteTdMap.size === 0) return 0;
  const filtered = Array.from(station.siteTdMap.keys()).filter((site) => site !== "Unknown");
  return filtered.length > 0 ? filtered.length : station.siteTdMap.size;
}

function renderKpi() {
  const cards = [];
  const productsInStation = getProductsInStation(APP.activeStation);
  for (const product of productsInStation) {
    const station = product.stations.get(APP.activeStation);
    if (!station) continue;
    cards.push(
      ["產品名稱", product.name],
      ["TEST SITE 數", String(getRawdataSiteCount(station))],
      ["Test Item 種類數", String(station.stats.length)],
      ["測試站點時間", formatDuration(station.stationTotalTime)],
      ["Touch Down 數", String(station.touchDownCount)],
      ["站點", station.name],
    );
  }
  dom.kpiSection.innerHTML = cards
    .map(
      ([title, value]) => `
      <div class="kpi-card">
        <div class="kpi-title">${title}</div>
        <div class="kpi-value">${escapeHtml(value)}</div>
      </div>
    `,
    )
    .join("");
  dom.kpiSection.classList.toggle("hidden", cards.length === 0);
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
    return;
  }
  const sorted = sortStats(station.stats, APP.tableSort.key, APP.tableSort.dir);
  dom.statsTbody.innerHTML = sorted
    .map(
      (s) => `
      <tr>
        <td title="${escapeHtml(s.testItem)}">${escapeHtml(s.testItem)}</td>
        <td>${s.count}</td>
        <td>${fmt(s.mean)}</td>
        <td>${fmt(s.median)}</td>
        <td>${fmt(s.range)}</td>
        <td>${fmt(s.ttRatio)}</td>
        <td>${fmt(s.min)}</td>
        <td>${fmt(s.max)}</td>
      </tr>
    `,
    )
    .join("");
  renderSortHeaderState();
  dom.tableSection.classList.remove("hidden");
}

function renderChartSortOptions() {
  if (!dom.chartSortProduct) return;
  const productsInStation = getProductsInStation(APP.activeStation);
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
  const productsInStation = getProductsInStation(APP.activeStation);
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
  if (!getProductsInStation(APP.activeStation).length) {
    dom.chartSection.classList.add("hidden");
    return;
  }
  APP.charts.count = renderMetricChart("count-chart", "count", "Count", "#3b82f6");
  APP.charts.mean = renderMetricChart("mean-chart", "mean", "Mean (s)", "#10b981");
  APP.charts.range = renderMetricChart("range-chart", "range", "Range (s)", "#f59e0b");
  APP.charts.ratio = renderMetricChart("tt-ratio-chart", "ttRatio", "TT Ratio/站點", "#a855f7");
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
  const sourceLabel = APP.sourceMode === "txt" ? "Direct TXT Upload" : "Folder home/winbond/rawdata";
  const summaryRows = [["Field", ...entries.map((e) => `${e.product}_${e.station.name}`)]];
  const summaryFields = [
    { key: "Product", getValue: (entry) => entry.product },
    { key: "Source", getValue: () => sourceLabel },
    { key: "Root", getValue: (entry) => entry.station.rootFolderName || APP.rootName || "" },
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
    const itemRows = [["Test Nos", "Test Item", "Count", "Mean(s)", "Median(s)", "Range(s)", "TT Ratio/站點", "Min(s)", "Max(s)", "Unit"]];
    for (const s of entry.station.stats) {
      itemRows.push([s.testNos.join("|"), s.testItem, String(s.count), fmt(s.mean), fmt(s.median), fmt(s.range), fmt(s.ttRatio), fmt(s.min), fmt(s.max), s.unit || "S"]);
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
  dom.analysisPage?.classList.toggle("hidden", isGuide);
  dom.guidePage?.classList.toggle("hidden", !isGuide);

  if (dom.entryTabAnalysis) {
    dom.entryTabAnalysis.classList.toggle("is-active", !isGuide);
    dom.entryTabAnalysis.setAttribute("aria-selected", isGuide ? "false" : "true");
  }
  if (dom.entryTabGuide) {
    dom.entryTabGuide.classList.toggle("is-active", isGuide);
    dom.entryTabGuide.setAttribute("aria-selected", isGuide ? "true" : "false");
  }
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
