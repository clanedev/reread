Recommended approach

Phase 1 — 先做“像在读”的外观与交互壳（低
风险，快速见效）

1.  保持现有 foliate-js
    解析与章节加载逻辑不变，先改 ReaderShell
    的排版系统。
2.  把目前散落在 JSX 的阅读样式收敛成
    reader token（字体、字号、行高、段距、版
    心宽度、主题色）。
3.  增加轻量设置面板（主题/字号/行距/段首
    缩进）并实时作用到当前章节流。
4.  顶部信息条改为更“阅读模式”：书名、进度
    、设置入口；避免干扰视觉。

实现位置：

- app/reader/[book]/ReaderShell.tsx
- app/globals.css
- lib/reader/theme.ts（新增，存放默认
  preset/token）

Phase 2 —
建立本地持久化阅读状态（阅读偏好 +
阅读进度）

1.  新增 reader 专用存储，不混在 shelf
    state 里：

- 全局偏好（theme/fontSize/lineHeight/i
  ndent 等）
- 按书进度（bookId、sectionIndex、scrol
  lTop、progressRatio、updatedAt）

2.  定义稳定 bookId（建议由 dirKey +
    fileName 生成，兼容本地优先）。
3.  Reader 打开时恢复偏好和进度；滚动与章
    节加载时节流写回。
4.  保留当前本地句柄恢复流程，不改动权限模
    型。

实现位置：

- lib/reader/types.ts（新增）
- lib/reader/db.ts（新增）
- lib/reader/book-id.ts（新增）
- app/reader/[book]/page.tsx（传入
  bookId/dirKey/fileName）
- app/reader/[book]/ReaderShell.tsx（接入
  读写）

Phase 3 — 向 WeRead
风格靠拢的“阅读线”能力（结构升级）

1.  增加 TOC 导航与“当前章节高亮”（基于
    book.toc + resolveHref）。
2.  连续滚动中追踪 active
    section，进度按章节与全书双轨计算。
3.  章节预取（N+1）与资源缓存复用，降低“点
    击下一章”等待感。
4.  在不引入分页引擎的前提下，做语义化排版
    增强：标题层级、引用块、图片说明、分割线
    风格统一。

实现位置：

- app/reader/[book]/ReaderShell.tsx
- lib/reader/navigation.ts（新增）
- lib/reader/progress.ts（新增）

Phase 4 — 书架与在读闭环（产品化）

1.  书架卡片读取进度（如 42% /
    最近阅读时间）。
2.  可选增加“继续阅读”排序与入口。
3.  封面保持真实封面优先，失败回退占位图，
    不阻塞主流程。

实现位置：

- app/shelf/page.tsx
- lib/reader/db.ts
- lib/reader/library.ts（新增，可选）

Reuse notes

- 复用本地优先主链路：getShelfState /
  setShelfState 与目录句柄恢复。
  - lib/shelf/db.ts
  - app/reader/[book]/page.tsx
- 复用现有 EPUB 解析与资源重写：
  - app/reader/[book]/ReaderShell.tsx（new
    EPUB(loader).init()、章节
    createDocument()、asset URL rewrite）
- 复用封面提取能力：
  - lib/reader/cover.ts（book.getCover()）
- 复用 URL 安全链路：
  - lib/reader/slug.ts
  - lib/shelf/filesystem.ts
    (isEpubFileName, getPathKey)

Critical files

- app/reader/[book]/ReaderShell.tsx
- app/reader/[book]/page.tsx
- app/shelf/page.tsx
- app/globals.css
- lib/reader/cover.ts
- lib/shelf/db.ts
- lib/reader/theme.ts (new)
- lib/reader/types.ts (new)
- lib/reader/db.ts (new)
- lib/reader/book-id.ts (new)
- lib/reader/navigation.ts (new)
- lib/reader/progress.ts (new)

Verification

1.  回归链路：/shelf 进入
    EPUB、章节连续加载、资源与图片显示正常。
2.  偏好持久化：改字号/行距/主题后刷新页面
    仍保留。
3.  进度持久化：读到中段刷新后恢复到同书同
    位置（允许小范围偏移）。
4.  TOC/章节定位：跳转后 active section
    与进度同步更新。
5.  书架联动：卡片显示阅读进度与最近阅读状
    态，点击可继续阅读。
6.  性能与稳定性：长书连续加载无明显卡顿；
    对象 URL 在卸载时释放；无新增控制台错误。
7.  质量检查：pnpm exec eslint app
    lib，pnpm build。
