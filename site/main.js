import * as lib from "./lib/index.js";
import { createAnalytics } from "./analytics.js";
import { SITE_CONFIG } from "./config.js";
import {
  ENTITY_TYPES,
  INDUSTRIES,
  PROFESSIONS,
  analyze,
  buildProfile,
  escapeHtml as h,
  formatDate as fd,
  hostOf,
  link,
  money,
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

const stepHtml = (s) =>
  `<li class="step"><div class="title">${s.order ? `${s.order}. ` : ""}${link(s.item.url, s.item.title)}</div>
   <div class="meta">${h(s.item.authority)}${s.target ? ` · target ${fd(s.target)}` : ""}${
     s.legalDeadline ? ` · <b>legal due ${fd(s.legalDeadline)}</b>` : ""
   }${s.item.cost?.amount !== undefined ? ` · fee ${money(s.item.cost.amount)}` : ""}</div></li>`;

const itemHtml = (i) =>
  `<li class="step"><div class="title">${link(i.url, i.title)}</div>
   <div class="meta"><span class="chip">${h(i.jurisdiction)}</span><span class="chip">${h(i.category)}</span>${h(i.authority)}${
     i.nextDue ? ` · next due ${fd(i.nextDue)}` : i.deadline ? ` · ${h(i.deadline)}` : ""
   }</div><div class="meta">${h(i.reason)}${
     i.provenance
       ? ` · ${h(i.provenance.confidence)}${i.provenance.checkedOn ? ` (checked ${fd(i.provenance.checkedOn)})` : ""}`
       : ""
   }${sources(i) ? ` · sources: ${sources(i)}` : ""}</div></li>`;

const VIEWS = {
  plan: (d) => {
    const p = d.plan;
    const head = `<p>Formation filing around <b>${fd(p.formationDate)}</b>, ready to operate around <b>${fd(p.readyDate)}</b>.${
      p.onTrack === undefined
        ? ""
        : p.onTrack
          ? ` Opening ${fd(p.openingDate)} is reachable (${p.slackDays} days of slack).`
          : ` <span class="error">Opening ${fd(p.openingDate)} is ${-p.slackDays} days too soon at these allowances.</span>`
    }</p>`;
    const phases = p.phases
      .map(
        (ph) =>
          `<h2>${h(ph.title)} <span class="meta">${fd(ph.start)}${ph.end ? ` → ${fd(ph.end)}` : " onward"}</span></h2>
           <div class="meta">${h(ph.description)}</div><ol>${ph.steps.map(stepHtml).join("")}</ol>`,
      )
      .join("");
    return head + phases;
  },
  items: (d) => `<ul>${d.result.items.map(itemHtml).join("")}</ul>`,
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
