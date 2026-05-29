<!-- ================================================================
  🤖 AI SESSION CONTEXT — 給下一個 AI Session 看的專案記憶
  最後更新：2026-05-29，Session c72de0d1
  ================================================================ -->

## 🤖 AI 快速喚醒區（給 Copilot / AI 看）
> 下次回到此專案，請先讀本節，再閱讀其他說明文件，即可還原完整開發背景。

### 專案定位
- 專案是 **NOR Flash CP Test Time 分析儀表板**（純前端）。
- Pipeline：`TXT/XLSX 匯入 → 解析與彙整 → Test Item/Group 統計 → KPI/圖表/報表渲染 → XLSX 匯出（可回灌）`。
- 主要入口檔：`index.html`、`js/app.js`、`css/style.css`。

### 重要技術決策
| 類別 | 決策 | 實作位置 | 原因 |
|---|---|---|---|
| 資料結構 | 全域 `APP` 狀態樹管理 products/stations/filters/scenario | `js/app.js` | 純前端下維持跨區塊同步 |
| 群組邏輯 | Test Item 與 Group 分層顯示，不合併欄位 | `index.html` + `js/app.js` | 可讀性與展開操作一致 |
| 模擬邏輯 | Scenario 以 `Mean × (ScenarioRange/BaseRange)` 推導有效值 | `js/app.js` | 同步反映 Range 調整影響 |
| 匯出可回灌 | 匯出 `Summary + TestItem_Stats + Site_TouchDown + Dashboard_State` | `js/app.js` | 支援 round-trip 還原儀表板 |
| 匯入恢復 | 匯入優先吃 `Summary` 的 PRODUCT/LOTID/WAFER ID，並套用 `Dashboard_State` | `js/app.js` | 保證匯出檔可完整再載入 |
| bug 修正 | `mergeImportedGroupingFromStats` 提升為全域函式 | `js/app.js` | 修正 XLSX 匯入卡住（ReferenceError） |

### 固定設定值（不在 GUI / CONFIG 中的常數）
- `ROOT_REGEX = /^RW_(.+)_([^_]+)_([^_]+)_([^_]+)_(\d{14})$/i`
- `PRODUCT_ROOT_REGEX = /^(EAG|FAG|AAG|KAG|MAG|RAG)\S*$/i`
- `RAW_TXT_FILENAME_REGEX = /^([^_]+)_Wafer(\d+)_([0-9]{14})_S(\d+)\.txt$/i`
- `PRODUCT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#a855f7", "#06b6d4", "#ef4444", "#84cc16", "#f97316"]`
- 數值顯示格式：`fmt(n) => toFixed(2)`（小數第 2 位）

### 已安裝 Skills 清單
- `python-eng-stat-ui-etest-skill`

### 常見錯誤與解法
- **症狀**：匯入匯出後 XLSX，解析進度卡住。  
  **解法**：確認 `mergeImportedGroupingFromStats` 為全域可呼叫函式，避免在 `parseStatsRows` 內部作用域失效。
- **症狀**：匯入後沒吃到產品/LOT/WAFER。  
  **解法**：檢查 `Summary` 欄位名稱正規化（LOT/LOTNO/LOTID、WAFER ID）與欄位是否存在。
- **症狀**：Group 顯示為「未分組」。  
  **解法**：檢查對應站點的 mapping 與 Test Item 命名是否一致，或是否已由匯入 `Group` 欄覆蓋。

### 尚未完成的功能
- [ ] 建立 round-trip 自動比對（匯出→匯入→狀態一致性）測試
- [ ] 補充超大檔案解析效能監控指標
- [ ] 規劃 grouping mapping 的版本化管理流程

---

# Rawdata 分析工具（使用者說明）

## 系統介紹

本工具用於分析 NOR Flash CP 測試資料，提供：
- 站點與產品維度的統計比較
- 單一統計報表中的 Group 分層展開（Group → Test Item）
- 模擬欄位調整後的即時圖表變化

重點頁面包含：
1. **統計圖表**
2. **統計報表**
3. **Site / Touch Down 熱圖**

---

## 操作方式

1. 匯入資料（資料夾、TXT 或匯入既有 XLSX）。
   - 多產品資料夾建議格式：

```text
資料夾根目錄/
├─ AAG106/
│  ├─ RW_*_LOTNO_WAFERID_站點_YYYYMMDDHHMMSS/
│  │  └─ home/winbond/rawdata/*.TXT
│  └─ ...
├─ EAG119/
│  ├─ RW_*_LOTNO_WAFERID_站點_YYYYMMDDHHMMSS/
│  │  └─ home/winbond/rawdata/*.TXT
│  └─ ...
└─ FAG102/
   └─ RW_*_LOTNO_WAFERID_站點_YYYYMMDDHHMMSS/
      └─ home/winbond/rawdata/*.TXT
```

2. 選擇要分析的產品與站點後按「開始分析」。
3. 在「統計圖表」可查看：
   - 測試項圖表
   - 群組化圖表
4. 在「統計報表」中先看 Group 彙總列，再按 `+` 展開該 Group 的 Test Item 詳細值與模擬欄位。
5. 需要模擬時，在展開後的 Test Item 輸入「模擬 Mean / 模擬 Range」，圖表會同步更新。
6. 需要回到原始值時，按「重置模擬」。

---

---

## 統計報表介紹

### Group 分層顯示
- 第一層：`Group` 彙總列（依 Mapping 將 Test Item 併入群組）
- 第二層：展開後顯示 `Test Item` 明細與模擬欄位

### Group 統計邏輯
- Group 總測試時間（欄位顯示在 `Mean(s)`）：
  - `Group TT Total(s) = Σ(Mean_i × Count_i)`
- Group TT Ratio/站點(%)：
  - `Group TT Ratio(%) = Group TT Total / Σ(Mean_j × Count_j) × 100`
- 其中 `i` 為該 Group 內的 Test Item，`j` 為該站點全部 Test Item。

### Test Item 模擬統計邏輯
- `Scenario Effective Mean = Scenario Mean × (Scenario Range / Base Range)`（Base Range = 0 時倍率視為 1）
- `Scenario TT Ratio(%) = Scenario Effective Mean × Count / Σ(Base Mean × Count) × 100`
- 分母固定為 Baseline 站點總量，因此只會反映被調整項目，不會因分母連動影響其他項。

---

## 重要說明

1. 模擬值只影響畫面計算，不會改動原始資料。
2. 群組化規則已內建於程式靜態檔，不需讀取外部 Mapping 檔。
3. 匯出結果以系統當前支援內容為準；若未看到預期欄位，請先確認目前版本說明。

---

## 常見問題

### Q1：為什麼統計報表的 Group 會出現「未分組」？
A：代表該站點下的 Test Item 沒命中內建對照規則，或名稱不完全一致。

### Q2：為什麼降低百分比圖沒有 bar？
A：通常是尚未在對應報表輸入模擬值，或篩選條件把產品過濾掉。

### Q3：我只改一個產品，為什麼看不到其他產品 bar？
A：目前圖表會保留所有產品。未輸入模擬值的產品會以 `0%` 顯示；有輸入模擬值的產品會顯示對應縮減比例。

### Q4：為什麼 Group 列沒有模擬輸入框？
A：Group 僅做彙總，模擬調整在展開後的 Test Item 層操作，Group 會即時反映彙總結果。

### Q5：如何快速恢復原始結果？
A：按「重置模擬」即可。

---

## 版本歷史

| 版本 | 日期 | 說明 |
|---|---|---|
| 1.0 | 2026-05-27 | 初版上線 |
| 1.5 | 2026-05-29 | 新增模擬欄位、降低百分比圖、多產品比較 |
| 1.6 | 2026-05-29 | 新增群組化圖表與群組化報表（雙標籤） |
| 1.7 | 2026-05-29 | 新增群組化報表專用降低百分比圖，並修正僅顯示有模擬變更產品的 bar |
| 1.8 | 2026-05-29 | 統計報表改為 Group 分層展開（Group→Test Item），移除群組化報表模擬圖與報表分頁，補充統計公式 |
