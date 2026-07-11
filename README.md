# 泡泡糖大战

一个本地双人同屏的网页版泡泡糖对战小游戏。P1 使用 WASD + Space，P2 使用方向键 + Enter，`[` / `]` 可以切换 5 张手写关卡。放下泡泡糖后会延时爆开，水柱范围会困住玩家；被困太久会被淘汰，先到 3 分获胜。

渲染是手写的 Canvas 2D「soft blueprint」扁平风格：五张地图各有一套地点身份（城市/森林/乡村/夜市/实验室），地形排布、环境配色和墙体/障碍物的装饰图案都不同；泡泡糖、水柱和被困泡泡共用同一套水蓝色系（水柱是连贯的胶囊十字形，不是逐格方块）；道具是白色卡片；角色是蓝/绿两只戴深色面罩的胶囊小潜水员。游戏规则保持在可测试的 TypeScript model/entities 中，渲染层只消费每帧的 `GameSnapshot`。

## Commands

```bash
bun run dev
bun run check
```

默认开发端口是 `5173`。如果被占用，可以指定端口：

```bash
PORT=5299 bun run dev
```

## Structure

- `src/game/Game.ts`：回合、计分、对象生命周期和快照输出。
- `src/game/Level.ts`：5 张确定性的 15x11 地图和 tile helpers。
- `src/game/entities/`：`Player`、`GumBomb`、`WaterBlast`、`PowerUp` 等游戏实体。
- `src/input/KeyboardInput.ts`：双人键盘输入状态。
- `src/render/theme.ts`：全部设计 token（配色、材质、角色调色板）。
- `src/render/layout.ts`：棋盘布局与 tile → 像素换算。
- `src/render/board.ts` / `effects.ts` / `heroes.ts`：地板墙体、泡泡水花道具、角色绘制。
- `src/render/CanvasRenderer.ts`：整帧绘制编排与回合结算浮层。
- `src/render/GameApp.ts`：canvas、rAF 循环、固定步长模拟和输入接线。
- `src/main.ts`：启动 GameApp，连接 HUD 和重开按钮。
- `server.ts`：开发静态服务，并用 Bun bundler 为浏览器打包 TypeScript/npm imports。
- `tests/`：Bun 单元测试，覆盖规则、地图和渲染；键盘手感类的东西玩起来判断，不写自动化测试。
