# Rawdata 分析工具 — NOR Flash CP Test Time 詳細數據提取分析

一個純靜態網頁版的測試原始數據分析平台，直接用瀏覽器開啟即可使用。從原始測試資料檔中提取測試項目執行時間，進行統計分析。

**作者**：PP32 YPLU (Desmond Lyu)

---

## 📁 支援的上傳檔案格式

### 匯入XLSX分析（快速比較）

- 支援匯入由本工具匯出的 `*.xlsx`（可多選）
- 系統會從 `Summary` 工作表讀取 `Product / LOTNO / WAFER ID / Station` 等欄位
- 匯入後可直接顯示：
  - 統計圖表（Count / Mean / Range / TT Ratio）
  - Test Item 統計表
  - Test Time by Site / Touch Down（Heatmap）
- 適合先各自完成產品分析，再用多份 XLSX 快速做多產品比較

---

### 資料夾結構要求

使用者選擇的主目錄資料夾格式為（產品別作為主目錄）：
```
產品名稱
├─ RW_*_LOTNO_WAFERID_站點_YYYYMMDDHHMMSS
│  └─ home
│     └─ *
│        └─ rawdata
│           └─ *.TXT
├─ RW_*_LOTNO_WAFERID_站點_YYYYMMDDHHMMSS
│  └─ home
│     └─ *
│        └─ rawdata
│           └─ *.TXT
└─ ...
```

**資料夾命名範例**：
- `RW_CP1_65296Z600_01_S1P1_20260112181636`
- `RW_FLOWA_12345ABC_02_DS00_20260115143022`

| 欄位 | 說明 | 範例 |
|------|------|------|
| **LOTNO** | 測試批號 | 65296Z600 |
| **WAFERID** | Wafer ID（通常為序號） | 01, 02, ... |
| **站點** | 測試站點 | S1P1, DS00, DS03, DS05, SFIN, SPRE |
| **YYYYMMDDHHMMSS** | 時間戳記 | 20260112181636 |

## 📊 統計分析項目

系統會對每個 **Test Item** 的所有數值進行以下統計：

| 統計項目 | 說明 | 公式 |
|---------|------|------|
| **中位數** (Median) | 數據序列中間的值 | 排序後取中間位置 |
| **級距** (Range) | 最大值與最小值的差 | Max - Min |
| **平均數** (Mean) | 所有數值的算術平均 | ∑ Value / Count |
| **執行次數** (Count) | 該項目被執行的次數 | 記錄數量 |
| **最小值** (Min) | 最小執行時間 | 最小數值 |
| **最大值** (Max) | 最大執行時間 | 最大數值 |
| **TT Ratio/站點 (%)** | 該 Test Item 總時間占站點總時間比例（百分比） | `sum(Test Item Time) / StationTotalTime * 100%` |

---

## 🚀 使用流程

### 步驟一：選擇資料來源模式並上傳

1. 點擊 **📂 選擇資料夾** 按鈕
2. 可選 **資料夾匯入**、**單選 .TXT 檔案** 或 **匯入XLSX分析**
3. 支援 **多個產品別 + 多個測試站點** 同時分析
4. 資料夾匯入僅分析主目錄下產品名稱開頭為 `FAG/EAG/MAG/AAG/KAG/RAG` 的資料夾，其餘會自動略過
5. 資料夾掃描後可用「解析範圍勾選」選擇要分析的產品與站點

### 步驟零：可選擇啟用異常明細解析

- 勾選 **解析單顆異常時間** 後，Test Item 統計表會提供 `+` 展開按鈕
- 可展開查看對應 Max(s) 的單顆異常時間 RAWDATA 行

### 多產品別與多站點資料夾擺放關係

建議主目錄如下（同一次可放多個產品）：

```
主目錄
├─ FAG112
│  ├─ RW_*_LOTNO_WAFERID_S1P1_YYYYMMDDHHMMSS\home\*\rawdata\*.txt
│  └─ RW_*_LOTNO_WAFERID_DS05_YYYYMMDDHHMMSS\home\*\rawdata\*.txt
├─ EAG301
│  ├─ RW_*_LOTNO_WAFERID_SPRE_YYYYMMDDHHMMSS\home\*\rawdata\*.txt
│  └─ RW_*_LOTNO_WAFERID_DS00_YYYYMMDDHHMMSS\home\*\rawdata\*.txt
└─ ...
```

- 第一層：產品別（如 `FAG112`, `EAG301`）
- 第二層：站點資料夾（依 `RW_*_LOTNO_WAFERID_站點_YYYYMMDDHHMMSS` 命名）
- 第三層固定：`home\*\rawdata\*.txt`（`*` 為任意字串）

### 步驟二：自動掃描 .TXT 檔案

- 系統自動掃描各產品、各站點子目錄下所有 `.TXT` 檔案
- 顯示找到的檔案列表及檔案大小
- 掃描完成後，可在「解析範圍勾選」勾選要分析的產品/站點，再按開始分析
- 若無 .TXT 檔案，顯示錯誤提示

### 步驟三：執行分析

1. 點擊 **開始分析** 按鈕開始解析
2. 系統搜尋特徵字串 `*<<< Test Time >>>,*(S)`
3. 擷取並歸類各 Test Item 及其對應數值（Test No 會保留為參考欄位）
4. 執行統計計算

### 步驟四：檢視分析結果

分析完成後顯示：
- 站點分頁（Tab）切換不同測試站點儀表板
- 產品分頁（Tab）切換不同產品的統計表與 Site/TD 分析
- 總摘要 KPI（TEST SITE 數、發現的 Test Item 數、測試站點時間、Touch Down 數等）
- Test Item 列表及統計資訊
- Count / Mean / Range / TT Ratio/站點(%) 四張統計圖（可依指定產品做排序基準）
- 可選擇展開 `+` 查看單顆異常時間明細（若該 Test Item 有匹配資料）

### 步驟五：匯入XLSX分析（多產品快速比較）

1. 切換到入口書籤 **匯入XLSX分析**
2. 一次匯入多個由本工具匯出的 XLSX
3. 系統自動合併不同產品/站點，並還原完整儀表板資訊

---

## 📋 儀表板介紹

### 全局 KPI 卡片

| KPI | 說明 |
|-----|------|
| **TEST SITE 數** | 本次分析的測試站點數量 |
| **發現 Test Item 數** | 提取到的不同測試項目種類數 |
| **測試站點時間** | 依 TD 分組後，取跨檔案最大 Total Test Time 再加總，畫面顯示為 `HH:MM:SS`（時:分:秒） |
| **Touch Down 數** | 參與加總的 TD 數量 |
| **測試站點** | 從資料夾名稱解析的測試站點 |

### 測試站點時間計算規則

1. 每個 RAWDATA 檔案擷取 `TD:Total Test Time = 時間 (S)` 記錄  
2. 以 `TD`（例如 001, 002, 003）分組  
3. 同一個 TD 在多份檔案中，取**最大時間**  
4. 將所有 TD 的最大時間加總，得到 **測試站點時間**

### Test Item 統計表

| 欄位 | 說明 |
|-----|------|
| **Test Item** | 測試項目名稱 |
| **執行次數** | 該項目在所有檔案中被執行的次數 |
| **平均時間(s)** | 平均執行時間 |
| **中位數(s)** | 中位數執行時間 |
| **TT Ratio/站點 (%)** | 該 Test Item 加總時間 / 站點整體時間（百分比） |
| **最小值(s)** | 最小執行時間 |
| **Min Source (SITE/TD)** | 最小值對應的來源站點與 TD |
| **最大值(s)** | 最大執行時間 |
| **Max Source (SITE/TD)** | 最大值對應的來源站點與 TD |
| **Max Detail RawLine** | 對應 Max(s) 的關鍵 T 行原始字串（若匹配規則） |
| **級距(s)** | Max - Min |

- 若某個 Test Item 可匹配資料，表格左側會顯示 `+`，點開可查看 `Max Detail RawLine`。

### 圖表展示

1. **Test Item 執行次數分布** — 柱狀圖
2. **Test Item 平均時間分布** — 柱狀圖
3. **Test Item Range 分布** — 柱狀圖
4. **Test Item TT Ratio/站點(%) 分布** — 柱狀圖

### Test Time by Site / Touch Down 分析

在 Test Item 統計表之後，新增 **Heatmap**：

- Heatmap：列為 TD（Touch Down）、欄為 SITE，色深代表 Total Test Time（秒）
- 若同一個 `SITE + TD` 在多個檔案重複出現，取最大值顯示

---

## 📤 匯出報告

點擊 **📤 匯出 XLSX** 可下載統計報告，內容包含：

| 欄位 | 內容 |
|------|------|
| **Product** | 使用者輸入的產品名稱 |
| **Summary** | 橫向彙整每個站點資訊（Product/Source/Root/Station/TouchDownCount/StationTotalTime） |
| **站點_TestItem_Stats** | 每站一張工作表，含 `TT Ratio/站點(%)`、`Min/Max Source(SITE/TD)`、`Max Detail RawLine` 欄位 |
| **站點_Site_TouchDown** | 每站一張工作表，列出 TouchDown × Site 時間 |

> 匯出的 XLSX 可再回到「匯入XLSX分析」模式重新匯入，用於跨產品快速比較。

---

## ⚠️ 重要說明

- ✅ 所有分析在**瀏覽器端進行**，檔案不會上傳至任何伺服器，資料完全私密
- ✅ 自動識別資料夾格式並導航至子目錄，無需手動操作路徑
- ✅ 支援大量 .TXT 檔案批量處理（建議 < 100 個檔案）
- ✅ 搜尋機制使用正則表達式，確保準確擷取特徵字串
- ✅ 數據時間戳記自動解析，支援按時間排序與趨勢分析

---

## ❓ 常見問題

**Q：為什麼找不到 .TXT 檔案？**  
A：請確認資料夾路徑包含 `home\*\rawdata\` 子目錄（`*` 為任意字串），系統會自動導航至該路徑。

**Q：特徵字串沒有被找到是什麼原因？**  
A：檢查 .TXT 檔案內容是否包含 `*<<< Test Time >>>,*(S)` 格式的整行字串。可能原因：
- 檔案編碼不同（建議 UTF-8 或 ANSI）
- 字串格式有細微差異

**Q：為什麼某個 Test Item 只有一筆數據？**  
A：這是正常現象，表示該項目在選定的檔案中只被執行一次。中位數與平均數會相同。

**Q：級距（Range）的意義是什麼？**  
A：表示該測試項目執行時間的波動範圍，值越小表示執行時間越穩定。

**Q：是否支援多個 Wafer 的資料混合分析？**  
A：系統支持混合分析並按 Wafer ID 分類統計。可下載 Excel 查看詳細的 Wafer 分布。

---

## 🛠️ 技術規格

- **前端技術**：Pure HTML5 + CSS3 + JavaScript（無外部依賴）
- **檔案格式支持**：.TXT（純文字）、XLSX 匯入/匯出
- **相容性**：現代瀏覽器（Chrome、Firefox、Safari、Edge）
- **資料大小**：支援 .TXT 檔案單個 ≤ 100MB

---

## 📝 版本歷史

| 版本 | 日期 | 說明 |
|-----|------|------|
| 1.0 | 2026-05-27 | 初版發佈 |
| 1.1 | 2026-05-27 | Test No / Test Item 拆分，並更新 CSV 匯出欄位 |
| 1.2 | 2026-05-27 | 匯出格式改為 XLSX，並新增 Site/TouchDown 獨立工作表 |
| 1.3 | 2026-05-27 | 支援產品主目錄多站點分析、站點分頁、TT Ratio/站點與多站點分工作表匯出 |
