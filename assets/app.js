(function () {
  "use strict";

  const data = window.AIPM_DATA;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (error) {
        console.warn("本地缓存读取失败，已回退默认值：", key, error);
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.warn("本地缓存写入失败：", key, error);
      }
    }
  };

  const state = {
    qCat: "all",
    qSearch: "",
    starredOnly: false,
    qStep: 0,
    checks: store.get("aipm_checks", {}),
    answers: store.get("aipm_answers", {}),
    starred: store.get("aipm_starred_questions", {}),
    prefs: Object.assign({ theme: "blue", font: 15, motion: "on" }, store.get("aipm_appearance", {})),
    lastRead: store.get("aipm_last_read", null)
  };

  if (typeof state.prefs.font !== "number") state.prefs.font = 15;

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function uid(text) {
    return text.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, "-").replace(/^-|-$/g, "");
  }

  function renderStaticContent() {
    $("#tocList").innerHTML = data.nav.map(([id, num, title]) => `
      <button class="toclink" type="button" data-target="#${id}">
        <span class="num">${num}</span><span class="tt">${title}</span><span class="arrow">→</span>
      </button>
    `).join("");

    $("#scoreRows").innerHTML = data.scores.map(([name, weight, signal, reject, tagClass]) => `
      <tr><td><strong>${name}</strong></td><td><span class="tag ${tagClass}">${weight}</span></td><td>${signal}</td><td>${reject}</td></tr>
    `).join("");

    $("#jobTypes").innerHTML = data.jobs.map((job, index) => `
      <button class="card job-card reveal" type="button" data-job="${index}" aria-expanded="false">
        <span class="bignum">${job.code}</span>
        <span class="tag ${job.tagClass}">${job.tag}</span>
        <h4>${job.name}</h4>
        <p>${job.desc}</p>
      </button>
    `).join("");

    $("#techAccordions").innerHTML = data.tech.map((item, index) => `
      <article class="acc reveal">
        <button class="acc-head" type="button" aria-expanded="false" aria-controls="tech-panel-${index}">
          <span class="ico">${item.icon}</span>${item.title}<span class="chev">▼</span>
        </button>
        <div class="acc-body" id="tech-panel-${index}" role="region">
          <div class="acc-body-in">
            <ul>${item.body.map(line => `<li>${line}</li>`).join("")}</ul>
            ${item.table ? renderMiniTable(item.table) : ""}
            ${item.view ? `<div class="callout co-view"><div class="co-title">面试官视角</div>${item.view}</div>` : ""}
          </div>
        </div>
      </article>
    `).join("");

    renderSteps("#validationSteps", data.validationSteps);
    renderCards("#evalCards", data.evalCards.map(([tag, title, body]) => ({ tag, title, body })));
    renderSteps("#badcaseSteps", data.badcaseSteps);
    renderTabs("sceneTabs", "scenePanes", data.scenes);
    renderCollab();
    renderSteps("#framework7", data.framework7);
    renderQuestionFilters();
    renderTabs("coTabs", "coPanes", data.companies);
    renderSteps("#portfolioSteps", data.portfolio);
    renderTimeline();
    renderChecks();
    renderFinalCards();
    renderFlashCards();
    renderQuiz();
    renderCostCalculator();
  }

  function renderMiniTable(rows) {
    const [head, ...body] = rows;
    return `<div class="tblwrap"><table><thead><tr>${head.map(cell => `<th>${cell}</th>`).join("")}</tr></thead><tbody>${body.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }

  function renderSteps(selector, items) {
    $(selector).innerHTML = items.map(([title, body]) => `<div class="step"><div><b>${title}</b><span>${body}</span></div></div>`).join("");
  }

  function renderCards(selector, cards) {
    $(selector).innerHTML = cards.map(card => `
      <article class="card">
        ${card.tag ? `<span class="tag tag-blue">${card.tag}</span>` : ""}
        <h4>${card.title}</h4>
        <p>${card.body}</p>
      </article>
    `).join("");
  }

  function renderTabs(tabId, paneId, items) {
    const tabRoot = $(`#${tabId}`);
    const paneRoot = $(`#${paneId}`);
    tabRoot.innerHTML = items.map(([id, title], index) => `
      <button class="tab ${index === 0 ? "active" : ""}" type="button" role="tab" id="${id}-tab" aria-selected="${index === 0}" aria-controls="${id}" data-pane="${id}">${title}</button>
    `).join("");
    paneRoot.innerHTML = items.map(([id, title, tag, rows], index) => `
      <section class="tabpane ${index === 0 ? "active" : ""}" id="${id}" role="tabpanel" aria-labelledby="${id}-tab" ${index === 0 ? "" : "hidden"}>
        <div class="co-card">
          <div class="co-name">${title} <span class="tag tag-slate">${tag}</span></div>
          <dl>${rows.map(([dt, dd]) => `<dt>${dt}</dt><dd>${dd}</dd>`).join("")}</dl>
        </div>
      </section>
    `).join("");
  }

  function renderCollab() {
    $("#collabCards").innerHTML = data.collab.map(([title, items]) => `
      <article class="card"><h4>${title}</h4><ul>${items.map(item => `<li>${item}</li>`).join("")}</ul></article>
    `).join("");
  }

  function renderQuestionFilters() {
    $("#qFilters").innerHTML = data.categories.map(([id, name], index) => `
      <button class="tab ${index === 0 ? "active" : ""}" type="button" role="tab" aria-selected="${index === 0}" data-cat="${id}">${name}</button>
    `).join("");
    renderQuestions();
  }

  function filteredQuestions() {
    const query = state.qSearch.trim().toLowerCase();
    return data.questions
      .map((q, index) => ({ index, q }))
      .filter(({ index, q }) => state.qCat === "all" || q[0] === state.qCat)
      .filter(({ index, q }) => !state.starredOnly || state.starred[index])
      .filter(({ q }) => !query || `${q[1]} ${q[3]} ${q[4]}`.toLowerCase().includes(query));
  }

  function renderQuestions() {
    const rows = filteredQuestions();
    $("#qList").innerHTML = rows.length ? rows.map(({ index, q }) => {
      const [cat, cn, cls, question, answer] = q;
      const key = `q${index}`;
      return `
        <article class="qcard" data-qindex="${index}" data-cat="${cat}">
          <button class="q-head" type="button" aria-expanded="false" aria-controls="ans-${index}">
            <span class="cat tag ${cls}">${cn}</span><span class="qtext">${question}</span><span class="chev">▼</span>
          </button>
          <div class="ans" id="ans-${index}" role="region">
            <div class="ans-in">
              <div class="answer-top">
                <strong>答题要点：</strong>
                <button class="star-btn ${state.starred[index] ? "on" : ""}" type="button" aria-pressed="${!!state.starred[index]}" data-star="${index}">${state.starred[index] ? "已收藏" : "收藏"}</button>
              </div>
              <p>${answer}</p>
              <label class="answer-note"><span>我的开口答案</span><textarea data-answer="${key}" rows="4" placeholder="用自己的经历改写成 60 秒答案">${escapeHtml(state.answers[key] || "")}</textarea></label>
            </div>
          </div>
        </article>
      `;
    }).join("") : `<div class="empty">没有匹配的题目，换个关键词试试。</div>`;
  }

  function renderTimeline() {
    $("#timeline").innerHTML = data.timeline.map(([tag, title, body]) => `
      <div class="tl-item"><span class="tl-tag">${tag}</span><h4>${title}</h4><p>${body}</p></div>
    `).join("");
  }

  function renderChecks() {
    $("#checkList").innerHTML = data.checks.map(([id, wk, txt]) => `
      <button class="check-item ${state.checks[id] ? "done" : ""}" type="button" data-id="${id}" aria-pressed="${!!state.checks[id]}">
        <span class="box">${state.checks[id] ? "✓" : ""}</span><span class="wk">${wk}</span><span class="txt">${txt}</span>
      </button>
    `).join("");
    updateProgress();
    const note = $("#studyNote");
    note.value = store.get("aipm_study_note", "");
  }

  function renderFinalCards() {
    $("#finalCards").innerHTML = data.finals.map(([num, title, body]) => `
      <article class="card"><span class="bignum">${num}</span><h4>${title}</h4><p>${body}</p></article>
    `).join("");
  }

  function renderFlashCards() {
    $("#flashCards").innerHTML = data.flash.map(([term, cn, body], index) => `
      <button class="fc" type="button" aria-pressed="false" aria-label="${term} 闪卡，点击翻面" data-card="${index}">
        <span class="face front"><span class="term">${term}</span><span class="hint">点击翻面查看要点</span></span>
        <span class="face back"><span class="cn">${cn}</span><span>${body}</span></span>
      </button>
    `).join("");
  }

  function renderQuiz() {
    const box = $("#quizBox");
    const q = data.quiz[state.qStep];
    box.innerHTML = `
      <div class="crumb">第 ${state.qStep + 1} / ${data.quiz.length} 题</div>
      <div class="q">${q.q}</div>
      <div class="opts">${q.opts.map((opt, index) => `<button class="opt" type="button" data-i="${index}">${opt[0]}</button>`).join("")}</div>
      <div class="fb" aria-live="polite"></div>
    `;
  }

  function renderCostCalculator() {
    $("#costCalc").innerHTML = `
      <div class="calc-tabs" role="tablist" aria-label="成本估算模式">
        <button class="active" type="button" data-mode="basic" aria-selected="true">基础</button>
        <button type="button" data-mode="advanced" aria-selected="false">高级</button>
      </div>
      <div class="calc-grid">
        ${rangeRow("rDau", "日活跃用户 DAU", 1, 1000, 100, "", "oDau")}
        ${rangeRow("rTurn", "人均日对话轮次", 1, 50, 10, "", "oTurn")}
        ${rangeRow("rInTok", "每轮输入 Token", 100, 6000, 600, "100", "oInTok")}
        ${rangeRow("rOutTok", "每轮输出 Token", 100, 4000, 400, "100", "oOutTok")}
        ${rangeRow("rInPrice", "输入单价（元 / 百万Token）", 0.5, 60, 2, "0.5", "oInPrice")}
        ${rangeRow("rOutPrice", "输出单价（元 / 百万Token）", 0.5, 120, 8, "0.5", "oOutPrice")}
        <div class="advanced-only">${rangeRow("rCache", "缓存命中率", 0, 80, 15, "", "oCache")}</div>
        <div class="advanced-only">${rangeRow("rSmallRoute", "小模型路由比例", 0, 90, 35, "", "oSmallRoute")}</div>
        <div class="advanced-only">${rangeRow("rSmallDiscount", "小模型成本折扣", 10, 90, 35, "", "oSmallDiscount")}</div>
      </div>
      <div class="out">
        <div><b id="outDay">-</b><span>日消耗 Token</span></div>
        <div><b id="outCost">-</b><span>月推理成本</span></div>
        <div><b id="outPer">-</b><span>单用户月成本</span></div>
        <div><b id="outSaved">-</b><span>高级策略节省</span></div>
      </div>
      <p class="tip">进阶追问“怎么降本”：模型路由、缓存高频问答、Prompt 压缩、错峰批处理。答题要点是链条完整，每一步假设要敢说清楚。</p>
    `;
    bindCalc();
  }

  function rangeRow(id, label, min, max, value, step, outId) {
    return `<div class="row"><label for="${id}">${label} <output id="${outId}"></output></label><input type="range" id="${id}" min="${min}" max="${max}" ${step ? `step="${step}"` : ""} value="${value}"></div>`;
  }

  function fmtWan(n) {
    return n >= 1e8 ? `${(n / 1e8).toFixed(1)}亿` : n >= 1e4 ? `${(n / 1e4).toFixed(0)}万` : String(Math.round(n));
  }

  function bindCalc() {
    let mode = "basic";
    const calcRoot = $("#costCalc");
    function calculate() {
      const dau = +$("#rDau").value * 1e4;
      const turn = +$("#rTurn").value;
      const inTok = +$("#rInTok").value;
      const outTok = +$("#rOutTok").value;
      const inPrice = +$("#rInPrice").value;
      const outPrice = +$("#rOutPrice").value;
      const cache = mode === "advanced" ? +$("#rCache").value / 100 : 0;
      const smallRoute = mode === "advanced" ? +$("#rSmallRoute").value / 100 : 0;
      const smallDiscount = mode === "advanced" ? +$("#rSmallDiscount").value / 100 : 1;
      const dailyIn = dau * turn * inTok;
      const dailyOut = dau * turn * outTok;
      const baseMonthly = ((dailyIn / 1e6) * inPrice + (dailyOut / 1e6) * outPrice) * 30;
      const cacheAdjusted = ((dailyIn * (1 - cache) / 1e6) * inPrice + (dailyOut / 1e6) * outPrice) * 30;
      const advancedCost = cacheAdjusted * (1 - smallRoute + smallRoute * smallDiscount);
      const finalCost = mode === "advanced" ? advancedCost : baseMonthly;
      $("#oDau").textContent = fmtWan(dau);
      $("#oTurn").textContent = `${turn} 轮`;
      $("#oInTok").textContent = inTok;
      $("#oOutTok").textContent = outTok;
      $("#oInPrice").textContent = `¥${inPrice}`;
      $("#oOutPrice").textContent = `¥${outPrice}`;
      $("#oCache").textContent = `${Math.round(cache * 100)}%`;
      $("#oSmallRoute").textContent = `${Math.round(smallRoute * 100)}%`;
      $("#oSmallDiscount").textContent = `${Math.round(smallDiscount * 100)}%`;
      $("#outDay").textContent = fmtWan(dailyIn + dailyOut);
      $("#outCost").textContent = finalCost >= 1e4 ? `¥${(finalCost / 1e4).toFixed(1)}万` : `¥${finalCost.toFixed(0)}`;
      $("#outPer").textContent = `¥${(finalCost / dau).toFixed(3)}`;
      $("#outSaved").textContent = mode === "advanced" ? `${Math.max(0, (1 - finalCost / baseMonthly) * 100).toFixed(1)}%` : "-";
      calcRoot.classList.toggle("advanced", mode === "advanced");
    }
    $$(".calc-tabs button", calcRoot).forEach(btn => btn.addEventListener("click", () => {
      mode = btn.dataset.mode;
      $$(".calc-tabs button", calcRoot).forEach(item => {
        item.classList.toggle("active", item === btn);
        item.setAttribute("aria-selected", item === btn);
      });
      calculate();
    }));
    $$("input[type=range]", calcRoot).forEach(input => input.addEventListener("input", calculate));
    calculate();
  }

  function bindInteractions() {
    window.addEventListener("scroll", onScroll, { passive: true });
    $("#toTop").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

    $("#tocBtn").addEventListener("click", () => openDrawer("toc", !$("#tocPanel").classList.contains("show")));
    $("#tocMask").addEventListener("click", () => openDrawer("toc", false));
    $("#tocClose").addEventListener("click", () => openDrawer("toc", false));
    $("#tocList").addEventListener("click", event => {
      const link = event.target.closest(".toclink");
      if (!link) return;
      openDrawer("toc", false);
      const target = $(link.dataset.target);
      if (target) setTimeout(() => target.scrollIntoView({ behavior: "smooth" }), 80);
    });

    $("#jobTypes").addEventListener("click", event => {
      const card = event.target.closest("[data-job]");
      if (!card) return;
      const job = data.jobs[+card.dataset.job];
      $("#jd-name").textContent = job.name;
      $("#jd-focus").textContent = job.focus;
      $("#jd-style").textContent = job.style;
      $("#jd-advice").textContent = job.advice;
      $("#jobDetail").hidden = false;
      $$("#jobTypes .job-card").forEach(item => {
        item.classList.toggle("selected", item === card);
        item.setAttribute("aria-expanded", item === card);
      });
    });

    document.addEventListener("click", event => {
      const accHead = event.target.closest(".acc-head");
      if (accHead) toggleAccordion(accHead);
      const tab = event.target.closest(".tab[data-pane]");
      if (tab) activateTab(tab);
      const fc = event.target.closest(".fc");
      if (fc) {
        fc.classList.toggle("flipped");
        fc.setAttribute("aria-pressed", fc.classList.contains("flipped"));
      }
    });

    $("#quizBox").addEventListener("click", event => {
      const option = event.target.closest(".opt");
      if (option) answerQuiz(option);
      if (event.target.id === "qNext") {
        state.qStep += 1;
        renderQuiz();
      }
      if (event.target.id === "qAgain") {
        state.qStep = 0;
        renderQuiz();
      }
    });

    $("#qFilters").addEventListener("click", event => {
      const btn = event.target.closest(".tab");
      if (!btn) return;
      state.qCat = btn.dataset.cat;
      $$("#qFilters .tab").forEach(item => {
        item.classList.toggle("active", item === btn);
        item.setAttribute("aria-selected", item === btn);
      });
      renderQuestions();
    });
    $("#qSearch").addEventListener("input", event => {
      state.qSearch = event.target.value;
      renderQuestions();
    });
    $("#showStarred").addEventListener("click", event => {
      state.starredOnly = !state.starredOnly;
      event.currentTarget.setAttribute("aria-pressed", state.starredOnly);
      event.currentTarget.classList.toggle("active", state.starredOnly);
      renderQuestions();
    });
    $("#randomQuestion").addEventListener("click", () => {
      const rows = filteredQuestions();
      if (!rows.length) return;
      const chosen = rows[Math.floor(Math.random() * rows.length)];
      state.qCat = data.questions[chosen.index][0];
      state.qSearch = "";
      state.starredOnly = false;
      $("#qSearch").value = "";
      renderQuestionFilters();
      setTimeout(() => {
        const card = $(`[data-qindex="${chosen.index}"]`);
        if (!card) return;
        card.scrollIntoView({ behavior: "smooth", block: "center" });
        toggleQuestion(card.querySelector(".q-head"), true);
      }, 80);
    });
    $("#qList").addEventListener("click", event => {
      const head = event.target.closest(".q-head");
      if (head) toggleQuestion(head);
      const star = event.target.closest("[data-star]");
      if (star) {
        event.stopPropagation();
        const index = star.dataset.star;
        state.starred[index] = !state.starred[index];
        if (!state.starred[index]) delete state.starred[index];
        store.set("aipm_starred_questions", state.starred);
        renderQuestions();
      }
    });
    $("#qList").addEventListener("input", event => {
      const textarea = event.target.closest("[data-answer]");
      if (!textarea) return;
      state.answers[textarea.dataset.answer] = textarea.value;
      store.set("aipm_answers", state.answers);
    });

    $("#checkList").addEventListener("click", event => {
      const item = event.target.closest(".check-item");
      if (!item) return;
      const id = item.dataset.id;
      state.checks[id] = !state.checks[id];
      if (!state.checks[id]) delete state.checks[id];
      store.set("aipm_checks", state.checks);
      renderChecks();
    });
    $("#resetChecks").addEventListener("click", () => {
      state.checks = {};
      store.set("aipm_checks", state.checks);
      renderChecks();
    });
    $("#exportProgress").addEventListener("click", exportProgress);
    $("#studyNote").addEventListener("input", event => store.set("aipm_study_note", event.target.value));

    $("#settingsBtn").addEventListener("click", () => openDrawer("settings", !$("#settingsPanel").classList.contains("show")));
    $("#settingsMask").addEventListener("click", () => openDrawer("settings", false));
    $("#settingsClose").addEventListener("click", () => openDrawer("settings", false));
    $("#swatches").addEventListener("click", event => {
      const swatch = event.target.closest(".swatch");
      if (!swatch) return;
      state.prefs.theme = swatch.dataset.theme;
      applyPrefs();
    });
    $("#fontRange").addEventListener("input", event => {
      state.prefs.font = +event.target.value;
      applyPrefs();
    });
    $("#motionToggle").addEventListener("change", event => {
      state.prefs.motion = event.target.checked ? "off" : "on";
      applyPrefs();
    });
    $("#settingsReset").addEventListener("click", () => {
      state.prefs = { theme: "blue", font: 15, motion: "on" };
      applyPrefs();
    });
    $("#resumeBtn").addEventListener("click", () => {
      if (!state.lastRead || !state.lastRead.id) return;
      const target = $(`#${state.lastRead.id}`);
      if (target) target.scrollIntoView({ behavior: "smooth" });
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        openDrawer("toc", false);
        openDrawer("settings", false);
      }
    });
  }

  function toggleAccordion(head) {
    const body = $(`#${head.getAttribute("aria-controls")}`);
    const item = head.closest(".acc");
    const open = head.getAttribute("aria-expanded") !== "true";
    head.setAttribute("aria-expanded", open);
    item.classList.toggle("open", open);
    body.style.maxHeight = open ? `${body.scrollHeight}px` : "0";
  }

  function activateTab(tab) {
    const root = tab.closest("[role=tablist]");
    const paneId = tab.dataset.pane;
    $$(".tab", root).forEach(item => {
      const active = item === tab;
      item.classList.toggle("active", active);
      item.setAttribute("aria-selected", active);
    });
    const paneRoot = root.nextElementSibling;
    $$(".tabpane", paneRoot).forEach(pane => {
      const active = pane.id === paneId;
      pane.classList.toggle("active", active);
      pane.hidden = !active;
    });
  }

  function answerQuiz(option) {
    const q = data.quiz[state.qStep];
    const selected = q.opts[+option.dataset.i];
    const ok = selected[1];
    const fb = $("#quizBox .fb");
    $$("#quizBox .opt").forEach(item => {
      item.classList.remove("ok", "bad");
      item.disabled = false;
    });
    option.classList.add(ok ? "ok" : "bad");
    fb.innerHTML = `
      <div class="callout ${ok ? "co-frame" : "co-trap"}">
        <div class="co-title">${ok ? "回答正确" : "再想想"}</div>${selected[2]}
      </div>
      ${ok && state.qStep < data.quiz.length - 1 ? '<button class="btn btn-primary" id="qNext" type="button">进入追问</button>' : ""}
      ${ok && state.qStep === data.quiz.length - 1 ? '<button class="btn btn-primary" id="qAgain" type="button">再练一遍</button>' : ""}
    `;
  }

  function toggleQuestion(head, forceOpen) {
    const card = head.closest(".qcard");
    const answer = card.querySelector(".ans");
    const open = typeof forceOpen === "boolean" ? forceOpen : head.getAttribute("aria-expanded") !== "true";
    head.setAttribute("aria-expanded", open);
    card.classList.toggle("open", open);
    answer.style.maxHeight = open ? `${answer.scrollHeight}px` : "0";
  }

  function updateProgress() {
    const done = $$(".check-item.done").length;
    const pct = Math.round(done / data.checks.length * 100);
    $("#pFill").style.width = `${pct}%`;
    $("#pNum").textContent = `${pct}%`;
  }

  function exportProgress() {
    const checked = data.checks.filter(([id]) => state.checks[id]).map(([, wk, txt]) => `- [x] ${wk} ${txt}`);
    const starred = Object.keys(state.starred).map(index => `- ${data.questions[index][3]}`);
    const note = $("#studyNote").value.trim();
    const text = [
      "# AI产品经理面试学习记录",
      "",
      `导出时间：${new Date().toLocaleString("zh-CN")}`,
      "",
      "## 已完成清单",
      checked.length ? checked.join("\n") : "暂无",
      "",
      "## 收藏题目",
      starred.length ? starred.join("\n") : "暂无",
      "",
      "## 备注",
      note || "暂无"
    ].join("\n");
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "aipm-study-progress.md";
    link.click();
    URL.revokeObjectURL(url);
  }

  function applyPrefs() {
    const root = document.documentElement;
    root.dataset.theme = state.prefs.theme;
    root.dataset.motion = state.prefs.motion;
    root.style.setProperty("--fscale", state.prefs.font / 15);
    $("#fontRange").value = state.prefs.font;
    $("#fontVal").textContent = `${state.prefs.font.toFixed(1)}px${state.prefs.font === 15 ? " · 标准" : state.prefs.font < 15 ? " · 偏小" : " · 偏大"}`;
    $("#motionToggle").checked = state.prefs.motion === "off";
    $$("#swatches .swatch").forEach(item => item.classList.toggle("active", item.dataset.theme === state.prefs.theme));
    store.set("aipm_appearance", state.prefs);
  }

  function openDrawer(type, open) {
    const panel = type === "toc" ? $("#tocPanel") : $("#settingsPanel");
    const mask = type === "toc" ? $("#tocMask") : $("#settingsMask");
    const btn = type === "toc" ? $("#tocBtn") : $("#settingsBtn");
    panel.classList.toggle("show", open);
    mask.classList.toggle("show", open);
    btn.setAttribute("aria-expanded", open);
    document.body.style.overflow = $(".drawer.show") ? "hidden" : "";
  }

  function onScroll() {
    const html = document.documentElement;
    const total = html.scrollHeight - html.clientHeight;
    const pct = total > 0 ? html.scrollTop / total : 0;
    $("#pbar").style.width = `${pct * 100}%`;
    $("#tocBar").style.width = `${pct * 100}%`;
    $("#tocPct").textContent = `${Math.round(pct * 100)}%`;
    $("#toTop").classList.toggle("show", html.scrollTop > 600);
  }

  function initObservers() {
    const reveal = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        reveal.unobserve(entry.target);
      });
    }, { threshold: 0.08 });
    $$(".reveal").forEach(item => reveal.observe(item));

    const spy = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        const title = entry.target.dataset.title || "";
        $$(".toclink").forEach(link => link.classList.toggle("active", link.dataset.target === `#${id}`));
        $("#sectionHint").textContent = title;
        state.lastRead = { id, title, at: Date.now() };
        store.set("aipm_last_read", state.lastRead);
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    $$("main section").forEach(section => spy.observe(section));
  }

  function initResume() {
    if (!state.lastRead || !state.lastRead.title) return;
    const btn = $("#resumeBtn");
    btn.hidden = false;
    btn.textContent = `继续：${state.lastRead.title}`;
  }

  function boot() {
    renderStaticContent();
    bindInteractions();
    applyPrefs();
    initObservers();
    initResume();
    onScroll();
  }

  boot();
})();
