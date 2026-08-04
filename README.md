# AIPM Guide

AI 产品经理面试学习指南 · 交互版。

这是一个零依赖的静态 Web App，面向转行或转岗 AI 产品经理的候选人，帮助用户按面试官视角准备技术认知、产品方法论、评测体系、商业化、协作能力、题库和 12 周学习路线。

## 功能

- 目录抽屉、阅读进度条和继续上次阅读
- 岗位类型点击拆解
- AI 技术模块手风琴、RAG 链路图、概念闪卡
- 技术选型小测验
- 行业场景 Tab 和推理成本计算器
- 高频题库搜索、筛选、随机练题、收藏和个人答案记录
- 12 周学习清单、本地进度保存、学习备注和 Markdown 导出
- 主题色、字号和减少动效设置

## 项目结构

```text
.
├── index.html
├── assets
│   ├── app.js
│   ├── data.js
│   ├── learning-map.svg
│   ├── rag-flow.svg
│   └── styles.css
└── scripts
    └── validate.js
```

## 本地打开

直接用浏览器打开 `index.html` 即可。项目不需要构建工具、后端服务或 npm 依赖。

如果想用本地静态服务预览，也可以运行：

```bash
python3 -m http.server 8080
```

然后访问 `http://localhost:8080`。

## 校验

```bash
node scripts/validate.js
```

校验会检查入口文件、资源引用、核心挂载点、数据结构和脚本语法。

## 内容维护

大部分学习内容集中在 `assets/data.js`：

- `questions`：高频题库
- `flash`：概念闪卡
- `checks`：12 周学习清单
- `companies`：公司差异化准备
- `scenes`：行业场景

更新内容时优先改数据文件，避免把内容写死到交互逻辑里。
