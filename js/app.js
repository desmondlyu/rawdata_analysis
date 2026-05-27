const APP = {
  files: [],
  rootName: "",
  parsedMeta: null,
  sourceMode: "none",
  productName: "",
  stations: new Map(),
  activeStation: "",
  tableSort: { key: "mean", dir: "desc" },
  charts: {
    count: null,
    mean: null,
    range: null,
    ratio: null,
  },
};

const ROOT_REGEX = /^RW_P_([^_]+)_([^_]+)_([^_]+)_(\d{14})$/i;
const TEST_TIME_REGEX = /<<<\s*Test Time\s*>>>\s*,\s*(\d+)\s*,\s*([^,]+?)\s*,\s*([+-]?\d*\.?\d+)\s*,\s*\(([^)]+)\)/i;
const TOTAL_TEST_TIME_REGEX = /:(\d+):Total Test Time\s*=\s*([+-]?\d*\.?\d+)\s*\(S\)/i;
const RAW_TXT_FILENAME_REGEX = /^([^_]+)_Wafer(\d+)_([0-9]{14})_S(\d+)\.txt$/i;

const dom = {
  pickBtn: document.getElementById("pick-btn"),
  folderInput: document.getElementById("folder-input"),
  txtInput: document.getElementById("txt-input"),
  sourceModeRadios: document.querySelectorAll('input[name="source-mode"]'),
  productInput: document.getElementById("product-input"),
  folderName: document.getElementById("folder-name"),
  folderMeta: document.getElementById("folder-meta"),
  message: document.getElementById("message"),
  analyzeBtn: document.getElementById("analyze-btn"),
  exportBtn: document.getElementById("export-btn"),
  progressWrap: document.getElementById("progress-wrap"),
  progressBar: document.getElementById("progress-bar"),
  kpiSection: document.getElementById("kpi-section"),
  chartSection: document.getElementById("chart-section"),
  tableSection: document.getElementById("table-section"),
  siteTdSection: document.getElementById("site-td-section"),
  siteTdHeatmap: document.getElementById("site-td-heatmap"),
  stationTabsSection: document.getElementById("station-tabs-section"),
  stationTabs: document.getElementById("station-tabs"),
  statsThead: document.getElementById("stats-thead"),
  statsTbody: document.getElementById("stats-tbody"),
};

dom.pickBtn.addEventListener("click", onPickSourceClick);
dom.folderInput.addEventListener("change", handleFolderSelection);
dom.txtInput.addEventListener("change", handleTxtSelection);
dom.productInput.addEventListener("input", onProductNameChange);
dom.analyzeBtn.addEventListener("click", startAnalysis);
dom.exportBtn.addEventListener("click", exportXlsx);
if (dom.stationTabs) {
  dom.stationTabs.addEventListener("click", onStationTabClick);
}
if (dom.statsThead) {
  dom.statsThead.addEventListener("click", onStatsHeadClick);
}

window.setActiveStation = setActiveStation;

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
  APP.productName = dom.productInput.value.trim();
  updateAnalyzeState();
  if (hasAnalyzedData()) {
    renderKpi();
  }
}

function parseRootMeta(rootName) {
  const m = rootName.match(ROOT_REGEX);
  if (!m) return null;
  return {
    lotNo: m[1],
    waferId: m[2],
    station: m[3],
    datetimeRaw: m[4],
    datetime: `${m[4].slice(0, 4)}-${m[4].slice(4, 6)}-${m[4].slice(6, 8)} ${m[4].slice(8, 10)}:${m[4].slice(10, 12)}:${m[4].slice(12, 14)}`,
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

function getStations() {
  return Array.from(APP.stations.values());
}

function getTotalRawTxtCount() {
  return getStations().reduce((acc, station) => acc + station.rawTxtFiles.length, 0);
}

function getActiveStationData() {
  if (APP.stations.size === 0) return null;
  const active = APP.stations.get(APP.activeStation);
  if (active) return active;
  const first = getStations()[0] ?? null;
  if (first) APP.activeStation = first.name;
  return first;
}

function hasAnalyzedData() {
  return getStations().some((station) => station.stats.length > 0);
}

function buildMetaFromCurrentSelection() {
  const stations = getStations();
  if (APP.sourceMode === "txt") {
    return { lotNo: "-", waferId: "-", station: "TXT", datetime: "-" };
  }
  if (stations.length === 1) {
    return stations[0].parsedMeta ?? APP.parsedMeta;
  }
  const metas = stations
    .map((s) => s.parsedMeta)
    .filter((meta) => Boolean(meta));
  const lotNos = uniqueValues(metas.map((m) => m.lotNo));
  const waferIds = uniqueValues(metas.map((m) => m.waferId));
  const datetimes = uniqueValues(metas.map((m) => m.datetimeRaw))
    .sort()
    .map((raw) => {
      const meta = metas.find((m) => m.datetimeRaw === raw);
      return meta?.datetime ?? raw;
    });
  const stationNames = stations.map((s) => s.name).join(", ");
  return {
    lotNo: formatValueList(lotNos),
    waferId: formatValueList(waferIds),
    station: `共 ${stations.length} 站：${stationNames}`,
    datetime: formatValueList(datetimes),
  };
}

function uniqueValues(values) {
  return Array.from(new Set(values.filter((v) => String(v ?? "").trim().length > 0)));
}

function formatValueList(values) {
  if (!values || values.length === 0) return "-";
  return values.join(", ");
}

function renderMeta(meta) {
  const entries = [
    ["LOTNO", meta?.lotNo ?? "-"],
    ["WAFER ID", meta?.waferId ?? "-"],
    ["站點", meta?.station ?? "-"],
    ["時間", meta?.datetime ?? "-"],
  ];
  dom.folderMeta.innerHTML = entries
    .map(
      ([k, v]) => `
      <div class="meta-chip">
        <div class="meta-key">${k}</div>
        <div class="meta-value">${escapeHtml(String(v))}</div>
      </div>
    `,
    )
    .join("");
  dom.folderMeta.classList.remove("hidden");
}

function resetResultsUI() {
  for (const station of getStations()) {
    station.stats = [];
    station.stationTotalTime = 0;
    station.touchDownCount = 0;
    station.siteTdMap = new Map();
  }

  dom.kpiSection.classList.add("hidden");
  dom.stationTabsSection?.classList.add("hidden");
  dom.chartSection.classList.add("hidden");
  dom.tableSection.classList.add("hidden");
  dom.siteTdSection.classList.add("hidden");
  dom.statsTbody.innerHTML = "";
  if (dom.stationTabs) dom.stationTabs.innerHTML = "";
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

function onStationTabClick(event) {
  const btn = event.target instanceof Element ? event.target.closest("[data-station]") : null;
  if (!btn) return;
  const stationName = btn.getAttribute("data-station");
  if (!stationName) return;
  setActiveStation(stationName);
}

function onStatsHeadClick(event) {
  const btn = event.target instanceof Element ? event.target.closest("[data-sort-key]") : null;
  if (!btn) return;
  const key = btn.getAttribute("data-sort-key");
  if (!key) return;

  if (APP.tableSort.key === key) {
    APP.tableSort.dir = APP.tableSort.dir === "asc" ? "desc" : "asc";
  } else {
    APP.tableSort.key = key;
    APP.tableSort.dir = key === "testItem" ? "asc" : "desc";
  }
  renderTable();
}

function updateAnalyzeState() {
  const hasProduct = APP.productName.length > 0;
  const hasRawFiles = getTotalRawTxtCount() > 0;
  dom.analyzeBtn.disabled = !(hasProduct && hasRawFiles);
  dom.exportBtn.disabled = !hasAnalyzedData();
}

function parseStationFromRelativePath(relativePath) {
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
  return {
    stationFolder,
    stationName: stationMeta?.station ?? stationFolder,
    stationMeta,
  };
}

function handleFolderSelection(event) {
  APP.sourceMode = "folder";
  APP.files = Array.from(event.target.files || []);
  APP.stations.clear();
  APP.activeStation = "";
  resetResultsUI();

  if (!APP.files.length) {
    updateAnalyzeState();
    return;
  }

  const firstPath = APP.files[0].webkitRelativePath || APP.files[0].name;
  APP.rootName = firstPath.split("/")[0] || firstPath;
  APP.parsedMeta = parseRootMeta(APP.rootName);
  dom.folderName.textContent = APP.rootName;

  for (const file of APP.files) {
    const rel = String(file.webkitRelativePath || "");
    if (!rel.toLowerCase().endsWith(".txt")) continue;

    const stationPath = parseStationFromRelativePath(rel);
    if (!stationPath) continue;

    const station = APP.stations.get(stationPath.stationName) ?? createStation(stationPath.stationName, stationPath.stationFolder, stationPath.stationMeta);
    station.rawTxtFiles.push(file);
    APP.stations.set(stationPath.stationName, station);
  }

  const stationList = getStations();
  if (stationList.length > 0) {
    APP.activeStation = stationList[0].name;
  }

  renderMeta(buildMetaFromCurrentSelection());

  const txtCount = getTotalRawTxtCount();
  if (!txtCount) {
    showMessage("未在任一站點子目錄的 home/winbond/rawdata 下找到 .TXT 檔案。", "error");
  } else if (!APP.productName) {
    showMessage(`已找到 ${stationList.length} 站、共 ${txtCount} 個 .TXT 檔案，請先輸入產品名稱。`, "info");
  } else {
    showMessage(`已找到 ${stationList.length} 站、共 ${txtCount} 個 .TXT 檔案，準備開始分析。`, "success");
  }

  updateAnalyzeState();
}

function handleTxtSelection(event) {
  APP.sourceMode = "txt";
  APP.files = Array.from(event.target.files || []);
  APP.rootName = "直接 TXT 上傳";
  APP.parsedMeta = null;
  APP.stations.clear();
  APP.activeStation = "";
  resetResultsUI();

  const txtFiles = APP.files.filter((f) => f.name.toLowerCase().endsWith(".txt"));
  if (txtFiles.length > 0) {
    const station = createStation("TXT", "TXT", { lotNo: "-", waferId: "-", station: "TXT", datetime: "-" });
    station.rawTxtFiles = txtFiles;
    APP.stations.set("TXT", station);
    APP.activeStation = "TXT";
  }

  dom.folderName.textContent = txtFiles.length ? `直接 TXT 上傳（${txtFiles.length} 檔）` : "尚未選擇";
  renderMeta(buildMetaFromCurrentSelection());

  if (!txtFiles.length) {
    showMessage("未選到任何 .TXT 檔案。", "error");
  } else if (!APP.productName) {
    showMessage(`已選擇 ${txtFiles.length} 個 .TXT 檔案，請先輸入產品名稱。`, "info");
  } else {
    showMessage(`已選擇 ${txtFiles.length} 個 .TXT 檔案，準備開始分析。`, "success");
  }

  updateAnalyzeState();
}

async function startAnalysis() {
  APP.productName = dom.productInput.value.trim();
  if (!APP.productName) {
    showMessage("請先輸入產品名稱。", "error");
    updateAnalyzeState();
    return;
  }

  const stations = getStations();
  const totalFiles = getTotalRawTxtCount();
  if (!totalFiles || stations.length === 0) {
    showMessage("請先選擇資料夾或上傳 TXT。", "error");
    updateAnalyzeState();
    return;
  }

  dom.analyzeBtn.disabled = true;
  dom.progressWrap.classList.remove("hidden");
  setProgress(0);
  showMessage("開始解析 TXT 檔案...", "info");

  let processed = 0;

  for (const station of stations) {
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
            if (currentMax === undefined || tdTime > currentMax) {
              tdMaxMap.set(td, tdTime);
            }

            const siteEntry = siteTdMap.get(siteKey) ?? new Map();
            const siteCurrentMax = siteEntry.get(td);
            if (siteCurrentMax === undefined || tdTime > siteCurrentMax) {
              siteEntry.set(td, tdTime);
            }
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

  const stationsWithStats = stations.filter((station) => station.stats.length > 0);
  if (!stationsWithStats.length) {
    showMessage("未找到符合格式的 <<< Test Time >>> 記錄。", "error");
    updateAnalyzeState();
    return;
  }

  renderStationTabs(stationsWithStats.map((station) => station.name));
  setActiveStation(stationsWithStats[0].name);
  showMessage(`分析完成：${APP.productName}，共 ${stationsWithStats.length} 站、${stationsWithStats.reduce((acc, s) => acc + s.stats.length, 0)} 個 Test Item。`, "success");
  updateAnalyzeState();
}

function renderStationTabs(stationNames) {
  if (!dom.stationTabsSection || !dom.stationTabs) return;
  if (!stationNames.length) {
    dom.stationTabs.innerHTML = "";
    dom.stationTabsSection.classList.add("hidden");
    return;
  }

  dom.stationTabs.innerHTML = "";
  for (const name of stationNames) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "station-tab-btn";
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", "false");
    btn.dataset.station = name;
    btn.textContent = name;
    dom.stationTabs.appendChild(btn);
  }
  dom.stationTabsSection.classList.remove("hidden");
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

  return results.sort((a, b) => {
    if (b.mean !== a.mean) return b.mean - a.mean;
    return a.testItem.localeCompare(b.testItem);
  });
}

function setActiveStation(stationName) {
  if (!APP.stations.has(stationName)) return false;
  APP.activeStation = stationName;

  const station = APP.stations.get(stationName);
  if (dom.stationTabs) {
    for (const btn of dom.stationTabs.querySelectorAll("[data-station]")) {
      const selected = btn.getAttribute("data-station") === stationName;
      btn.setAttribute("aria-selected", selected ? "true" : "false");
    }
  }
  if (!station) return true;

  renderKpi();
  renderTable();
  renderCharts();
  renderSiteTdChart();
  return true;
}

function renderKpi() {
  const station = getActiveStationData();
  if (!station) return;
  const rawdataSiteCount = getRawdataSiteCount(station);

  const cards = [
    ["產品名稱", APP.productName || "-"],
    ["TEST SITE 數", rawdataSiteCount.toLocaleString()],
    ["Test Item 種類數", station.stats.length.toLocaleString()],
    ["測試站點時間", formatDuration(station.stationTotalTime)],
    ["Touch Down 數", station.touchDownCount.toLocaleString()],
    ["站點", station.name],
  ];
  dom.kpiSection.innerHTML = cards
    .map(
      ([title, value]) => `
      <div class="kpi-card">
        <div class="kpi-title">${title}</div>
        <div class="kpi-value">${escapeHtml(String(value))}</div>
      </div>
    `,
    )
    .join("");
  dom.kpiSection.classList.remove("hidden");
}

function getRawdataSiteCount(station) {
  if (!station?.siteTdMap || station.siteTdMap.size === 0) return 0;
  const filtered = Array.from(station.siteTdMap.keys()).filter((site) => site !== "Unknown");
  return filtered.length > 0 ? filtered.length : station.siteTdMap.size;
}

function renderTable() {
  const station = getActiveStationData();
  if (!station) return;

  const sortedStats = sortStats(station.stats, APP.tableSort.key, APP.tableSort.dir);
  dom.statsTbody.innerHTML = sortedStats
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

function sortStats(stats, sortKey, sortDir) {
  const sign = sortDir === "asc" ? 1 : -1;
  return stats.slice().sort((a, b) => {
    if (sortKey === "testItem") {
      return a.testItem.localeCompare(b.testItem) * sign;
    }
    const av = a[sortKey] ?? 0;
    const bv = b[sortKey] ?? 0;
    if (av === bv) return a.testItem.localeCompare(b.testItem);
    return (av - bv) * sign;
  });
}

function renderCharts() {
  for (const key of Object.keys(APP.charts)) {
    if (APP.charts[key]) {
      APP.charts[key].destroy();
      APP.charts[key] = null;
    }
  }

  const station = getActiveStationData();
  if (!station) return;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: "#cbd5e1" } } },
    scales: {
      x: { ticks: { color: "#94a3b8" }, grid: { color: "#1e293b" } },
      y: { ticks: { color: "#94a3b8" }, grid: { color: "#1e293b" } },
    },
  };

  const topCount = getTopByMetric(station.stats, "count");
  const topMean = getTopByMetric(station.stats, "mean");
  const topRange = getTopByMetric(station.stats, "range");
  const topRatio = getTopByMetric(station.stats, "ttRatio");

  APP.charts.count = new Chart(document.getElementById("count-chart"), {
    type: "bar",
    data: {
      labels: buildChartLabels(topCount),
      datasets: [{ label: "Count", data: topCount.map((s) => s.count), backgroundColor: "#3b82f6" }],
    },
    options: chartOptions,
  });

  APP.charts.mean = new Chart(document.getElementById("mean-chart"), {
    type: "bar",
    data: {
      labels: buildChartLabels(topMean),
      datasets: [{ label: "Mean (s)", data: topMean.map((s) => Number(s.mean.toFixed(6))), backgroundColor: "#10b981" }],
    },
    options: chartOptions,
  });

  APP.charts.range = new Chart(document.getElementById("range-chart"), {
    type: "bar",
    data: {
      labels: buildChartLabels(topRange),
      datasets: [{ label: "Range (s)", data: topRange.map((s) => Number(s.range.toFixed(6))), backgroundColor: "#f59e0b" }],
    },
    options: chartOptions,
  });

  const ratioCanvas = document.getElementById("tt-ratio-chart") || document.getElementById("median-chart");
  if (ratioCanvas) {
    APP.charts.ratio = new Chart(ratioCanvas, {
      type: "bar",
      data: {
        labels: buildChartLabels(topRatio),
        datasets: [{ label: "TT Ratio/站點", data: topRatio.map((s) => Number(s.ttRatio.toFixed(6))), backgroundColor: "#a855f7" }],
      },
      options: chartOptions,
    });
  }

  dom.chartSection.classList.remove("hidden");
}

function renderSiteTdChart() {
  const station = getActiveStationData();
  if (!station || !station.siteTdMap || station.siteTdMap.size === 0) {
    if (window.SiteTdHeatmapReact && dom.siteTdHeatmap) {
      window.SiteTdHeatmapReact.clear(dom.siteTdHeatmap);
    }
    dom.siteTdSection.classList.add("hidden");
    return;
  }

  const tdSet = new Set();
  for (const tdMap of station.siteTdMap.values()) {
    for (const td of tdMap.keys()) tdSet.add(td);
  }
  const tdLabels = Array.from(tdSet).sort((a, b) => Number(a) - Number(b));
  if (tdLabels.length === 0) {
    if (window.SiteTdHeatmapReact && dom.siteTdHeatmap) {
      window.SiteTdHeatmapReact.clear(dom.siteTdHeatmap);
    }
    dom.siteTdSection.classList.add("hidden");
    return;
  }

  if (window.SiteTdHeatmapReact && dom.siteTdHeatmap) {
    window.SiteTdHeatmapReact.render(dom.siteTdHeatmap, station.siteTdMap);
  }
  dom.siteTdSection.classList.remove("hidden");
}

function getTopByMetric(stats, metricKey) {
  return stats
    .slice()
    .sort((a, b) => {
      const diff = (b[metricKey] ?? 0) - (a[metricKey] ?? 0);
      if (diff !== 0) return diff;
      return a.testItem.localeCompare(b.testItem);
    })
    .slice(0, 15);
}

function buildChartLabels(items) {
  return items.map((s) => (s.testItem.length > 32 ? `${s.testItem.slice(0, 32)}...` : s.testItem));
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

  const stations = getStations().filter((station) => station.stats.length > 0);
  const sourceLabel = APP.sourceMode === "txt" ? "Direct TXT Upload" : "Folder home/winbond/rawdata";
  const stationNames = stations.map((station) => station.name);
  const summaryRows = [["Field", ...stationNames]];

  const summaryFields = [
    { key: "Product", getValue: () => APP.productName || "" },
    { key: "Source", getValue: () => sourceLabel },
    { key: "Root", getValue: (station) => station.rootFolderName || APP.rootName || "" },
    { key: "Station", getValue: (station) => station.name },
    { key: "TouchDownCount", getValue: (station) => String(station.touchDownCount) },
    { key: "StationTotalTime(HH:MM:SS)", getValue: (station) => formatDuration(station.stationTotalTime) },
    { key: "StationTotalTimeSeconds", getValue: (station) => fmt(station.stationTotalTime) },
  ];

  for (const field of summaryFields) {
    summaryRows.push([field.key, ...stations.map((station) => field.getValue(station))]);
  }

  const wb = XLSX.utils.book_new();
  const usedSheetNames = new Set();
  appendSheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), "Summary", usedSheetNames);

  for (const station of stations) {
    const itemRows = [["Test Nos", "Test Item", "Count", "Mean(s)", "Median(s)", "Range(s)", "TT Ratio/站點", "Min(s)", "Max(s)", "Unit"]];
    for (const s of station.stats) {
      itemRows.push([
        s.testNos.join("|"),
        s.testItem,
        String(s.count),
        fmt(s.mean),
        fmt(s.median),
        fmt(s.range),
        fmt(s.ttRatio),
        fmt(s.min),
        fmt(s.max),
        s.unit || "S",
      ]);
    }

    const siteTdRows = [["TouchDown", "Site", "Time(s)", "Time(HH:MM:SS)"]];
    if (station.siteTdMap && station.siteTdMap.size > 0) {
      const siteLabels = Array.from(station.siteTdMap.keys()).sort((a, b) => {
        if (a === "Unknown") return 1;
        if (b === "Unknown") return -1;
        return Number(a) - Number(b);
      });

      const tdSet = new Set();
      for (const tdMap of station.siteTdMap.values()) {
        for (const td of tdMap.keys()) tdSet.add(td);
      }
      const tdLabels = Array.from(tdSet).sort((a, b) => Number(a) - Number(b));

      for (const td of tdLabels) {
        for (const site of siteLabels) {
          const tdMap = station.siteTdMap.get(site) ?? new Map();
          const value = tdMap.get(td);
          if (value === undefined) continue;
          siteTdRows.push([`TD ${td}`, `SITE ${site}`, fmt(value), formatDuration(value)]);
        }
      }
    }

    appendSheet(wb, XLSX.utils.aoa_to_sheet(itemRows), `${station.name}_TestItem_Stats`, usedSheetNames);
    appendSheet(wb, XLSX.utils.aoa_to_sheet(siteTdRows), `${station.name}_Site_TouchDown`, usedSheetNames);
  }

  const safeName = sanitizeFileName(APP.productName || "rawdata");
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
  return value.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").replace(/\s+/g, "_");
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
  return {
    lotNo: m[1],
    waferNo: Number.parseInt(m[2], 10),
    datetimeRaw: m[3],
    site: Number.parseInt(m[4], 10),
  };
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
