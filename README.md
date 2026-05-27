# TTO Analysis

NOR Flash CP Test 時間優化分析工具（GitHub Pages 版本）。

## 使用方式

1. 開啟 GitHub Pages 網站（部署後）：  
   `https://desmondlyu.github.io/rawdata_analysis/`
2. 輸入產品名稱。
3. 選擇匯入模式：
   - **資料夾匯入**：產品主目錄下可包含多個站點子目錄  
     `產品名稱/RW_P_LOTNO_WAFERID_站點_YYYYMMDDHHMMSS/home/winbond/rawdata/*.txt`
   - **單選 .TXT 檔案**
4. 點擊 **開始分析**，查看各站點分頁儀表板。
5. 點擊 **匯出 XLSX** 下載報表。

## 圖表呈現架構

- **統計圖表區（每個站點一組）**
  - Count（Test Item 執行次數）
  - Mean（平均秒數）
  - Range（級距）
  - TT Ratio/站點（Test Item 總時間 / 該站點總時間）
- **Test Time by Site / Touch Down**
  - Heatmap 顯示 DUT × SITE 測試時間強度
  - 支援 SITE 分頁顯示，避免欄位過多擠壓

## 網頁整體功能

- 支援多站點資料夾批次分析與單檔 TXT 分析
- 自動解析 Test Time 與 Touch Down Total Test Time
- 站點分頁切換：每站 KPI、統計表、圖表、Heatmap
- Test Item 統計表支援點欄位標題排序
- KPI 顯示站點時間（HH:MM:SS）、Touch Down 數、TEST SITE 數等
- 匯出 `.xlsx`：
  - `Summary`（多站點彙整）
  - `站點_TestItem_Stats`
  - `站點_Site_TouchDown`

## 作者

作者: PP32 YPLu (Desmond)
