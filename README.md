# tode-offline

[terminal-code（`tode`，tode.sh）](https://github.com/zenbu-labs/terminal-code) 官方預編譯 Linux 版的離線安裝包，**同時附上它第一次執行時會上網下載的 code-server**。給封閉內網用：clone（或複製）這個 repo 進去，執行 `install.sh` 就能用，**安裝和第一次開啟都不需要連網路**。適用 Ubuntu 24.04（x86_64 / arm64），不需要 root。

## 一行安裝

```bash
git clone https://github.com/z9905080/tode-offline.git && cd tode-offline && ./install.sh
```

內網機器不能連 GitHub 的話，在外網 clone 好之後，把整個資料夾（或 `git bundle create tode.bundle --all` 產生的檔案）帶進內網，再執行 `./install.sh`。

> clone 約下載 **750 MB**（x86_64 + arm64 都在裡面），checkout 後約 2.1 GB。可以加 `--depth 1` 少抓歷史。

`install.sh` 做的事跟官方安裝程式（`curl -fsSL https://tode.sh/install | bash`）一樣，只是把下載換成用 repo 裡的檔案：

1. 用 `uname -m` 判斷架構（`x86_64`，或 `aarch64`/`arm64`）。
2. **重組大檔**：GitHub 單檔上限 100 MB，所以有 8 個超過 90 MB 的檔案（electron 主程式 `pixel`、code-server 的 `node`、Copilot 的 `runtime.node`）在 repo 裡被切成 `*.part-00`、`*.part-01`…。install.sh 會把目前架構的檔案接回原檔，並用 `SPLIT_FILES` 裡的 SHA256 驗證，不符就停止。
3. 停掉正在執行的 tode daemon / code-server（官方安裝程式也會這樣做）。
4. `~/.local/lib/tode`（官方安裝位置）→ symlink 指向 repo 裡的 `<arch>/tode`。
5. **code-server**：tode 第一次開啟時會從 GitHub 下載 code-server 4.132.0（約 230 MB）到 `~/.local/share/tode/code-server/4.132.0`。install.sh 直接把 repo 裡的 `<arch>/code-server` 放到這個位置，tode 看到已經存在就不會下載。
6. 把 `bin/tode` 啟動腳本複製到 `~/.local/bin/tode`，寫入 `~/.local/state/tode/install.json`（跟官方一樣）。
7. 用 `ldd` 檢查 electron 需要的系統函式庫，缺的會列出來。
8. 如果 `~/.local/bin` 不在 PATH 裡，會提示你把它加進去。

可以重複執行，結果一樣。

### 選項

- `./install.sh --copy`：把 tode 和 code-server 複製到上面兩個位置（不是 symlink），之後刪掉這個 repo 也能用。
- 預設（不加參數）：symlink 直接指向 repo，**不要移動或刪除這個 repo 資料夾**。

### 確認安裝

```bash
tode --version    # v0.4.3
tode --help
tode              # 在目前資料夾開啟（需要支援 kitty graphics protocol 的終端機，見下方）
```

### 移除

```bash
./uninstall.sh
```

只會刪除 install.sh 建立的 `~/.local/bin/tode`、`~/.local/lib/tode`、`~/.local/share/tode/code-server/4.132.0`（symlink 或 `--copy` 複製的）和 `install.json`。你的 tode 資料（`~/.local/share/tode` 裡的 VS Code 設定檔、擴充套件、資料庫，`~/.local/state/tode` 的 log）不會動。想連資料一起清掉，先跑 `tode --uninstall`，再跑 `./uninstall.sh`。

## 執行環境需求（Ubuntu 24.04）

- **終端機**：tode 用 kitty graphics protocol 把畫面畫在終端機裡，需要 kitty、Ghostty、WezTerm 這類終端機（可以搭配 [kitty-binary](https://github.com/z9905080/kitty-binary)）。GNOME Terminal 不支援。
- **系統函式庫**：tode 內含的 electron（`pixel`）需要 Chromium 常用的函式庫；code-server 自帶 Node.js，不需要另外裝。

| electron 直接連結的函式庫 | Ubuntu 24.04 套件 |
|---|---|
| `libnss3.so`、`libnssutil3.so`、`libsmime3.so` | `libnss3` |
| `libnspr4.so` | `libnspr4` |
| `libglib-2.0` / `libgobject-2.0` / `libgio-2.0` | `libglib2.0-0t64` |
| `libgtk-3.so.0` | `libgtk-3-0t64` |
| `libatk-1.0.so.0` | `libatk1.0-0t64` |
| `libatk-bridge-2.0.so.0` | `libatk-bridge2.0-0t64` |
| `libatspi.so.0` | `libatspi2.0-0t64` |
| `libcups.so.2` | `libcups2t64` |
| `libdbus-1.so.3` | `libdbus-1-3` |
| `libcairo.so.2` | `libcairo2` |
| `libpango-1.0.so.0` | `libpango-1.0-0` |
| `libX11`、`libXcomposite`、`libXdamage`、`libXext`、`libXfixes`、`libXrandr` | `libx11-6`、`libxcomposite1`、`libxdamage1`、`libxext6`、`libxfixes3`、`libxrandr2` |
| `libxcb.so.1` | `libxcb1` |
| `libxkbcommon.so.0` | `libxkbcommon0` |
| `libgbm.so.1` | `libgbm1` |
| `libexpat.so.1` | `libexpat1` |
| `libudev.so.1` | `libudev1` |
| `libasound.so.2` | `libasound2t64` |
| （字型快取 `fc-cache`，選用） | `fontconfig` |

`libffmpeg.so`、`libvulkan.so.1`、SwiftShader 已經在 electron 目錄裡，不用裝。glibc、`libgcc_s` 是 24.04 內建的。官方安裝程式的提示是 `sudo apt-get install libnss3 libgtk-3-0 libasound2t64 libgbm1`，上表是完整清單（24.04 的套件名稱有 `t64` 後綴）。

Ubuntu 24.04 桌面版通常都已經有了；伺服器版／精簡安裝最可能缺。檢查方法：

```bash
ldd ~/.local/lib/tode/node_modules/@zenbu-labs/pixel/electron/dist/pixel | grep 'not found'   # 沒輸出才正常
```

### 在外網預先下載 apt 套件（離線用）

在一台能上網、有 Docker 的機器上，用乾淨的 Ubuntu 24.04 容器把套件和所有相依套件一起下載下來：

```bash
PKGS="libnss3 libnspr4 libglib2.0-0t64 libgtk-3-0t64 libatk1.0-0t64 libatk-bridge2.0-0t64 \
      libatspi2.0-0t64 libcups2t64 libdbus-1-3 libcairo2 libpango-1.0-0 libx11-6 libxcomposite1 \
      libxdamage1 libxext6 libxfixes3 libxrandr2 libxcb1 libxkbcommon0 libgbm1 libexpat1 libudev1 \
      libasound2t64 fontconfig"

# x86_64
mkdir -p debs-amd64
docker run --rm --platform linux/amd64 -v "$PWD/debs-amd64:/debs" ubuntu:24.04 bash -c \
  "apt-get update && apt-get install -y --download-only -o Dir::Cache::archives=/debs $PKGS"

# arm64（需要 docker 支援 arm64 模擬，或直接在 arm64 機器上跑）
mkdir -p debs-arm64
docker run --rm --platform linux/arm64 -v "$PWD/debs-arm64:/debs" ubuntu:24.04 bash -c \
  "apt-get update && apt-get install -y --download-only -o Dir::Cache::archives=/debs $PKGS"
```

把 `debs-*` 資料夾帶進內網，在目標機器上：

```bash
sudo apt-get install ./debs-amd64/*.deb    # arm64 機器改用 debs-arm64
```

## 離線使用注意事項

- **`tode --upgrade`** 會連 `tode.sh`，內網無法使用。要升級：在外網更新這個 repo（或等新版），帶進內網再跑一次 `./install.sh`。
- **`tode --ssh <host>`**：遠端主機上也要有同版本（v0.4.3）的 tode，否則它會在遠端執行 `curl https://tode.sh/install/...` 安裝。內網用法：在遠端主機也 clone 這個 repo 跑 `./install.sh`，版本一致就不會連網。
- **擴充套件市集**：tode 內的 code-server 設定成用微軟 Marketplace（`marketplace.visualstudio.com`），內網連不到，只能用 `tode --install-extension <檔案.vsix>` 安裝 vsix 檔（在外網先下載好）。
- code-server 內建的 GitHub Copilot 擴充需要連網，內網無法使用，不影響編輯器本身。

## 目錄結構

```
x86_64/tode/          tode-linux-x64.tar.gz 解壓後的內容（bin/tode、dist/、node_modules/ 含 electron）
x86_64/code-server/   code-server-4.132.0-linux-amd64.tar.gz 解壓後的內容
arm64/tode/           tode-linux-arm64.tar.gz 解壓後的內容
arm64/code-server/    code-server-4.132.0-linux-arm64.tar.gz 解壓後的內容
install.sh / uninstall.sh
SPLIT_FILES           被切開的大檔：原檔 SHA256、權限、路徑（install.sh 用來重組和驗證）
SHA256SUMS            原始 tarball 的 SHA256
```

## 來源與驗證

- 版本：**tode v0.4.3**（stable，2026-10-19 發布，2026-11-03 時的最新版），**code-server 4.132.0**（tode v0.4.3 內 `dist/codeserver/vendored.js` 固定的版本）
- 來源：
  - tode：官方安裝程式 <https://tode.sh/install> 裡列的 `https://tode-releases.zenbu-labs.workers.dev/dl/stable/v0.4.3/tode-linux-{x64,arm64}.tar.gz`，跟 [GitHub Release v0.4.3](https://github.com/zenbu-labs/terminal-code/releases/tag/v0.4.3) 的檔案相同
  - code-server：<https://github.com/coder/code-server/releases/tag/v4.132.0> 的 `code-server-4.132.0-linux-{amd64,arm64}.tar.gz`（就是 tode 第一次執行時會下載的網址）
- 檔案為官方原檔，未修改，只是解壓（超過 90 MB 的檔案切開存放，安裝時重組並驗證）。上游沒有提供 GPG 簽章，只有 SHA256；下載後已比對三個來源（tode 安裝程式內寫死的值、tode 程式內寫死的 code-server 值、GitHub Release 的 asset digest），全部吻合：

```
2e0b12321cb83c3b42b84516f29ba79618915314c459ac16275cc33e9c340051  tode-linux-x64.tar.gz
708edd5fe76ab2915418e88bc1efe56549dc3446a18645d194d673ae8d60801c  tode-linux-arm64.tar.gz
a38d26f4cb81f768feddff79e2937fd3f39c83d3da8be3da7225e1087e62e4ed  code-server-4.132.0-linux-amd64.tar.gz
ade569a677d1c04ee66ef153382b7e15bf261f955407663c7ddc6b87f9ee29fc  code-server-4.132.0-linux-arm64.tar.gz
```

## 原始 tarball（Release）

原本的 4 個 `.tar.gz` 和 `SHA256SUMS` 放在 [Release v0.4.3](https://github.com/z9905080/tode-offline/releases/tag/v0.4.3)，可以直接下載：

```bash
curl -LO https://github.com/z9905080/tode-offline/releases/download/v0.4.3/tode-linux-x64.tar.gz
```

## 授權

terminal-code 由 zenbu-labs 開發，以 **MIT** 授權（<https://github.com/zenbu-labs/terminal-code>）。code-server 由 Coder 開發，以 **MIT** 授權，授權與第三方聲明見 `<arch>/code-server/LICENSE`、`ThirdPartyNotices.txt`。electron／Chromium 授權見 `<arch>/tode/node_modules/@zenbu-labs/pixel/electron/dist/LICENSE*`。
