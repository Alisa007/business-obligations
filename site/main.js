import * as lib from "./lib/index.js";
import { createAnalytics } from "./analytics.js";
import { SITE_CONFIG } from "./config.js";
import {
  ENTITY_TYPES,
  INDUSTRIES,
  PROFESSIONS,
  analyze,
  buildProfile,
  CONFIDENCE,
  JURISDICTIONS,
  countBy,
  escapeHtml as h,
  formatDate as fd,
  frequencyLabel,
  groupObligations,
  hostOf,
  link,
  money,
  relativeDays,
} from "./app.js";

const $ = (id) => document.getElementById(id);

const analytics = createAnalytics({
  key: SITE_CONFIG.posthogKey,
  host: SITE_CONFIG.posthogHost,
  hostname: location.hostname,
  doNotTrack: navigator.doNotTrack === "1" || window.doNotTrack === "1",
});
if (analytics.enabled) $("analytics-note").hidden = false;
const fill = (id, options) => {
  $(id).innerHTML = options.map(([v, l]) => `<option value="${v}">${l}</option>`).join("");
};
fill("entityType", ENTITY_TYPES);
fill("industry", INDUSTRIES);
fill("profession", PROFESSIONS);
$("asOf").value = new Date().toISOString().slice(0, 10);

let zipLib;
async function lookup(zip) {
  zipLib ??= await import("./lib/zip.js");
  return zipLib.lookupZip(zip);
}

const form = () => ({
  zip: $("zip").value.trim(),
  entityType: $("entityType").value,
  industry: $("industry").value,
  profession: $("profession").value,
  employees: $("employees").value,
  payroll: $("payroll").value,
  revenue: $("revenue").value,
  owners: $("owners").value,
  sellsGoods: $("sellsGoods").checked,
  homeBased: $("homeBased").checked,
  tradeName: $("tradeName").checked,
  isNew: $("isNew").checked,
  formationDate: $("formationDate").value,
});

function syncRows() {
  const f = form();
  $("professionRow").hidden = !(
    ["pllc", "pc", "llp"].includes(f.entityType) || f.industry === "professional_services"
  );
  $("formationRow").hidden = f.isNew;
}
for (const id of ["entityType", "industry", "isNew"]) $(id).addEventListener("change", syncRows);
syncRows();

$("zip").addEventListener("input", async () => {
  const z = $("zip").value.trim();
  if (z.length !== 5) return ($("place").textContent = "");
  const p = await lookup(z);
  $("place").textContent = p ? `${p.city}, ${p.county} County, ${p.state}` : "Unknown ZIP";
});
$("zip").dispatchEvent(new Event("input"));

const sources = (i) =>
  (i.provenance?.sources ?? [])
    .slice(0, 3)
    .map((u) => link(u, hostOf(u)))
    .join(", ");

// Checked-off launch steps are remembered in this browser only.
const DONE_KEY = "cre-done-steps";
const doneSteps = (() => {
  try {
    return new Set(JSON.parse(localStorage.getItem(DONE_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
})();
const saveDone = () => {
  try {
    localStorage.setItem(DONE_KEY, JSON.stringify([...doneSteps]));
  } catch {
    /* storage unavailable: progress just isn't remembered */
  }
};

const confidenceBadge = (p) =>
  p
    ? `<span class="badge ${h(p.confidence)}" title="${h(CONFIDENCE[p.confidence] ?? "")}${
        p.checkedOn ? `, checked ${h(fd(p.checkedOn))}` : ""
      }">${h(p.confidence)}</span>`
    : "";

const feeChip = (i) =>
  i.cost?.amount !== undefined ? `<span class="chip">fee ${money(i.cost.amount)}</span>` : "";

const stepHtml = (s, asOf, byId) => {
  const id = s.item.id;
  const needs = s.dependsOn
    .map((d) => byId.get(d))
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x.title);
  const due = s.legalDeadline
    ? `<span class="badge due" title="Legal due date">due ${h(fd(s.legalDeadline))} · ${h(relativeDays(s.legalDeadline, asOf))}</span>`
    : s.target
      ? `<span class="chip">by ${h(fd(s.target))}</span>`
      : "";
  return `<li class="step${doneSteps.has(id) ? " done" : ""}">
    <label class="check"><input type="checkbox" data-step="${h(id)}" ${doneSteps.has(id) ? "checked" : ""} />
      <span class="num">${s.order}</span>
      <span class="body">
        <span class="title">${link(s.item.url, s.item.title)}</span>
        <span class="meta">${h(s.item.authority)}</span>
        <span class="chips">${due}${feeChip(s.item)}<span class="chip">${h(frequencyLabel(s.item.frequency))}</span>${confidenceBadge(s.item.provenance)}</span>
        ${needs.length ? `<span class="meta needs">After: ${h(needs.join("; "))}</span>` : ""}
      </span>
    </label>
  </li>`;
};

const card = (label, value, note = "") =>
  `<div class="card"><div class="card-label">${h(label)}</div><div class="card-value">${value}</div>${
    note ? `<div class="card-note">${note}</div>` : ""
  }</div>`;

// Obligations view state (kept across tab switches and re-renders).
const obState = { jurisdiction: "all", category: "all", query: "" };

const obligationHtml = (i, asOf) =>
  `<li><details class="ob">
    <summary>
      <span class="title">${link(i.url, i.title)}</span>
      <span class="chips">${
        i.nextDue
          ? `<span class="chip strong">due ${h(fd(i.nextDue))} · ${h(relativeDays(i.nextDue, asOf))}</span>`
          : i.deadline
            ? `<span class="chip">${h(i.deadline)}</span>`
            : ""
      }<span class="chip">${h(frequencyLabel(i.frequency))}</span><span class="chip">${h(i.category)}</span>${feeChip(i)}${confidenceBadge(i.provenance)}</span>
    </summary>
    <div class="ob-body">
      <p>${h(i.description)}</p>
      <dl>
        <dt>Why it applies</dt><dd>${h(i.reason)}</dd>
        <dt>Authority</dt><dd>${link(i.url, i.authority)}</dd>
        ${
          i.penalty
            ? `<dt>If late</dt><dd>${money(i.penalty.amount)}${
                i.penalty.percentPerMonth ? ` plus ${h(String(i.penalty.percentPerMonth))}% per month` : ""
              }. ${h(i.penalty.note)}</dd>`
            : ""
        }
        ${sources(i) ? `<dt>Sources</dt><dd>${sources(i)}${i.provenance?.checkedOn ? ` (checked ${h(fd(i.provenance.checkedOn))})` : ""}</dd>` : ""}
      </dl>
    </div>
  </details></li>`;

function obligationsList(d) {
  const groups = groupObligations(d.result.items, obState);
  if (!groups.length) return `<p class="empty">No obligations match these filters.</p>`;
  return groups
    .map(
      (g) =>
        `<section class="group"><h2>${h(g.label)} <span class="count">${g.items.length}</span></h2><ul class="obs">${g.items
          .map((i) => obligationHtml(i, d.result.asOf))
          .join("")}</ul></section>`,
    )
    .join("");
}

function obligationsToolbar(d) {
  const items = d.result.items;
  const byJ = countBy(items, "jurisdiction", obState);
  const byC = countBy(items, "category", obState);
  const total = Object.values(byJ).reduce((a, b) => a + b, 0);
  const chip = (key, label, n) =>
    `<button class="filter${obState.jurisdiction === key ? " on" : ""}" data-j="${key}" ${n === 0 && key !== "all" ? "disabled" : ""}>${h(label)} <span class="count">${n}</span></button>`;
  const cats = Object.keys(countBy(items, "category", { ...obState, category: "all" })).sort();
  return `<div class="toolbar">
    <input type="search" id="ob-q" placeholder="Search obligations" value="${h(obState.query)}" aria-label="Search obligations" />
    <select id="ob-cat" aria-label="Category">
      <option value="all">All categories</option>
      ${cats.map((c) => `<option value="${h(c)}" ${obState.category === c ? "selected" : ""}>${h(c)} (${byC[c] ?? 0})</option>`).join("")}
    </select>
    <div class="filters">${chip("all", "All", total)}${JURISDICTIONS.map(([k, l]) => chip(k, l, byJ[k] ?? 0)).join("")}</div>
  </div>`;
}

const VIEWS = {
  plan: (d) => {
    const p = d.plan;
    const total = p.steps.length;
    const ids = new Set(p.steps.map((s) => s.item.id));
    const done = [...doneSteps].filter((x) => ids.has(x)).length;
    const byId = new Map(p.steps.map((s) => [s.item.id, s.item]));
    const opening =
      p.onTrack === undefined
        ? card("Opening date", "Not set", "Add a target opening date to check the plan fits")
        : p.onTrack
          ? card(
              "Opening",
              fd(p.openingDate),
              `<span class="ok">On track, ${p.slackDays} days of slack</span>`,
            )
          : card(
              "Opening",
              fd(p.openingDate),
              `<span class="error">${-p.slackDays} days too soon at these allowances</span>`,
            );
    const cards = `<div class="cards">
      ${card("File formation", fd(p.formationDate), relativeDays(p.formationDate, p.startDate))}
      ${card("Ready to operate", fd(p.readyDate), relativeDays(p.readyDate, p.startDate))}
      ${opening}
      ${card("Progress", `${done} / ${total}`, "Tick steps off as you go; saved in this browser")}
      ${card("Known fees", `${money(d.costs.oneTime)} <small>one-time</small>`, `${money(d.costs.annual)} per year`)}
    </div>`;
    const phases = p.phases
      .map((ph, n) => {
        const left = ph.steps.filter((s) => !doneSteps.has(s.item.id)).length;
        const range = `${fd(ph.start)}${ph.end ? ` → ${fd(ph.end)}` : " onward"}`;
        return `<li class="phase">
          <span class="marker">${n + 1}</span>
          <details ${left > 0 || ph.id === "operate" ? "open" : ""}>
            <summary><span class="phase-title">${h(ph.title)}</span>
              <span class="range">${h(range)}</span>
              <span class="count">${left === 0 ? "done" : `${left} to do`}</span></summary>
            <p class="meta">${h(ph.description)}</p>
            <ul class="steps">${ph.steps.map((s) => stepHtml(s, p.startDate, byId)).join("")}</ul>
          </details>
        </li>`;
      })
      .join("");
    return `${cards}<ol class="timeline">${phases}</ol>
      <p class="meta">Dates are planning allowances, not agency processing times. Legal due dates are shown where the rules give one.</p>`;
  },
  items: (d) => `${obligationsToolbar(d)}<div id="ob-list">${obligationsList(d)}</div>`,
  calendar: (d) =>
    `<p><button id="dl">Download .ics</button></p>` +
    (d.events.length
      ? `<table><tr><th>Date</th><th>Deadline</th><th>Authority</th></tr>${d.events
          .map(
            (e) =>
              `<tr><td>${fd(e.date)}</td><td>${link(e.url, e.title)}</td><td>${h(e.authority)}</td></tr>`,
          )
          .join("")}</table>`
      : `<p class="empty">No dated deadlines in the next year. Add a formation date for anniversary-based filings.</p>`),
  costs: (d) => {
    const urlOf = new Map(d.result.items.map((i) => [i.id, i.url]));
    return (
      `<p>Known government fees: <b>${money(d.costs.annual)}</b> per year, <b>${money(d.costs.oneTime)}</b> one-time.</p>
     <table>${d.costs.lines
       .map(
         (l) =>
           `<tr><td>${link(urlOf.get(l.id), l.title)}${l.estimate ? " (estimate)" : ""}</td><td>${money(l.perYear || l.amount)}</td></tr>`,
       )
       .join("")}</table>` +
      (d.costs.unknown.length
        ? `<p class="meta">${d.costs.unknown.length} items have fees that cannot be totalled.</p>`
        : "")
    );
  },
  whatif: (d) =>
    `<p class="meta">Inputs you left at their defaults, and what would change if they differed.</p>` +
    (d.analysis.sensitivity.length
      ? `<table>${d.analysis.sensitivity
          .map(
            (s) =>
              `<tr><td>${h(s.field)} (now ${h(JSON.stringify(s.current))})</td><td>${s.changes
                .slice(0, 4)
                .map((c) => `${h(JSON.stringify(c.value))}: +${c.added.length} / −${c.removed.length}`)
                .join("<br>")}</td></tr>`,
          )
          .join("")}</table>`
      : `<p class="empty">Nothing changes with these inputs.</p>`),
};
const LABELS = {
  plan: "Launch plan",
  items: "Obligations",
  calendar: "Calendar",
  costs: "Fees",
  whatif: "What would change",
};
let data;
let tab = "plan";

function render() {
  const out = $("out");
  const tabs = `<div class="tabs" role="tablist">${Object.entries(LABELS)
    .map(([k, l]) => `<button role="tab" data-tab="${k}" aria-selected="${k === tab}">${l}</button>`)
    .join("")}</div>`;
  out.innerHTML = tabs + VIEWS[tab](data) + `<p class="meta">${h(data.result.disclaimer)}</p>`;
  out.querySelectorAll("[data-tab]").forEach((b) =>
    b.addEventListener("click", () => {
      tab = b.dataset.tab;
      analytics.track("tab_viewed", { tab });
      render();
    }),
  );
  out.querySelectorAll("[data-step]").forEach((c) =>
    c.addEventListener("change", () => {
      if (c.checked) doneSteps.add(c.dataset.step);
      else doneSteps.delete(c.dataset.step);
      saveDone();
      render();
    }),
  );
  const refreshList = () => {
    const list = $("ob-list");
    if (list) list.innerHTML = obligationsList(data);
  };
  const rerenderToolbar = () => {
    const bar = out.querySelector(".toolbar");
    if (bar) bar.outerHTML = obligationsToolbar(data);
    wireToolbar();
  };
  function wireToolbar() {
    out.querySelectorAll(".filter[data-j]").forEach((b) =>
      b.addEventListener("click", () => {
        obState.jurisdiction = b.dataset.j;
        refreshList();
        rerenderToolbar();
      }),
    );
    const q = $("ob-q");
    if (q)
      q.addEventListener("input", () => {
        obState.query = q.value;
        refreshList();
      });
    const cat = $("ob-cat");
    if (cat)
      cat.addEventListener("change", () => {
        obState.category = cat.value;
        refreshList();
        rerenderToolbar();
      });
  }
  wireToolbar();
  const dl = $("dl");
  if (dl)
    dl.addEventListener("click", () => {
      analytics.track("ics_downloaded", { events: data.events.length });
      const url = URL.createObjectURL(new Blob([data.ics], { type: "text/calendar" }));
      Object.assign(document.createElement("a"), { href: url, download: "deadlines.ics" }).click();
      URL.revokeObjectURL(url);
    });
}

$("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = form();
  try {
    const place = await lookup(f.zip);
    if (!place) throw new Error(`Unknown ZIP code "${f.zip}"`);
    data = analyze(lib, buildProfile(f, place), {
      asOf: $("asOf").value || undefined,
      openingDate: $("openingDate").value || undefined,
      isNew: f.isNew,
    });
    analytics.track("plan_generated", { entityType: f.entityType, industry: f.industry, isNew: f.isNew });
    render();
  } catch (err) {
    $("out").innerHTML = `<p class="error">${h(err.message)}</p>`;
  }
});
