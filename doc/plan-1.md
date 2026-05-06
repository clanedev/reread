最小化方案 v2：

- 只用 idb 做持久化
- 不使用 zustand
- URL 始终固定为
  /shelf（不暴露本地路径）
- 支持目录导航（进入子目录 /
  返回上级）

目标是：从首页选择根目录后，初始化持
久化状态并跳转 /shelf；/shelf 从 IDB
恢复状态，按当前路径展示目录内容并
可继续导航。

Core data model

lib/shelf/types.ts

export interface ShelfState {
// 导航路径：['root'] → ['root',
'小说'] → ['root', '小说', '科幻']
currentPath: string[];
// 路径到句柄的映射，key
形如：'root' / 'root/小说' /
'root/小说/科幻'
handles: Record<string,
FileSystemDirectoryHandle>;
}

约定：

- 根目录 key 固定为 root
- 当前目录 key 由
  currentPath.join('/') 生成
- 仅在用户进入某个子目录时，才把该子
  目录句柄写入 handles

File-by-file implementation plan

1.  lib/shelf/types.ts（新增）

- 定义 ShelfState
- 定义目录项类型：
  - DirectoryEntry = { name: string;
    kind: 'file' | 'directory' }

2.  lib/shelf/db.ts（新增）

- 使用 idb 创建数据库（例如
  reread-db）
- object store：shelf（key 固定
  'state'）
- 导出 API：
  - getShelfState():
    Promise<ShelfState | null>
  - setShelfState(state:
    ShelfState): Promise<void>
  - clearShelfState():
    Promise<void>（可选）

实现要点：

- 直接持久化 FileSystemDirectoryHand
  le（structured clone）
- 统一由该模块负责读写，页面不直接操作
  idb

3.  lib/shelf/filesystem.ts（新增）

- 导出目录读取与排序函数：
  - listDirectoryEntries(handle:
    FileSystemDirectoryHandle):
    Promise<DirectoryEntry[]>
- 规则：
  - 读取当前目录的 entries()
  - 返回 name + kind
  - 排序：目录优先，再按名称升序
- 可加一个小工具函数：
  - toPathKey(path: string[]):
    string（path.join('/')）

4.  app/page.tsx（修改）

- 首页“选择文件夹”按钮逻辑：
  a. showDirectoryPicker()
  获取根目录句柄
  b. 初始化 ShelfState： - currentPath: ['root'] - handles: { root: rootHandle }
  c. setShelfState(initialState)
  d. router.push('/shelf')
- 取消选择（AbortError）时静默返回
- 保持现有简洁 UI 和主色 #4cada9

5.  app/shelf/page.tsx（新增）

- 客户端组件，页面加载时：
  a. getShelfState()
  b. 若为空：显示空态（提示先回首页
  选择目录）
  c. 根据 currentPath 求 currentKey
  d. 从 handles[currentKey]
  取当前目录句柄
  e.
  做权限检查（queryPermission，必要时
  requestPermission）
  f.
  listDirectoryEntries(currentHandle)
  并渲染
- 导航交互：
  - 进入子目录：点击 kind ===
    'directory' 项时
    i. 在当前句柄上
    getDirectoryHandle(name) 获取子句柄
    ii. 计算子路径与子 key
    iii. 写入 handles[childKey] =
    childHandle
    iv. 更新 currentPath =
    [...currentPath, name]
    v. setShelfState(nextState)
    后刷新列表
  - 返回上级：当 currentPath.length
    > 1
          i. currentPath =
    currentPath.slice(0, -1)
    ii. setShelfState(nextState)
    iii. 刷新列表
- 路径展示：面包屑仅展示 currentPath
  文本，不写入 URL

Critical files

- lib/shelf/types.ts（new）
- lib/shelf/db.ts（new）
- lib/shelf/filesystem.ts（new）
- app/page.tsx（modify）
- app/shelf/page.tsx（new）
- package.json（add idb）

Verification - app/shelf/page.tsx（new） - package.json（add idb）

     Verification

     1. 首页选根目录后跳转 /shelf。
     2. /shelf 首屏能展示根目录内容。
     3. 点击子目录可进入并展示其内容；
     点击返回可回上级。
     4. URL 全程保持 /shelf。
     5. 刷新 /shelf 后可从 IDB
     恢复路径与句柄映射。
     6. 直接访问 /shelf
     且无状态时显示空态引导。
     7. 运行 npm run lint 与 npm run
     build。
