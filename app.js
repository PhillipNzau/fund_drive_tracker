const SHEET_API_URL =
  "https://script.google.com/macros/s/AKfycbwCjkSpY-jXcwpApbpYZj01mYbRCTG0bep0n5pEOMb5BztUOLgdNrIR2WUURJ5s_36SsA/exec";

var allContributions = [];
var filterStatusVal = "all";
var currentConfig = {};
var currentTarget = 1200000;

var defaultConfig = {
  "Campaign Name": "Emily Mwende's (mama Tanu) Send Off",
  "Target Amount (Ksh)": 1200000,
  "M-Pesa Number": "0723 876 744",
  "Account Name": "Anthony Nzau",
  "Event Name": "Harambee",
  "Event Venue": "Nairobi Baptist Church, Ngong Road, Bethel Sanctuary",
  "Event Date": "April 2026",
  "Event Time": "10:00am - 12:00pm",
};

var defaultContribs = [
  {
    Name: "Anthony Nzau",
    "Amount (Ksh)": 50000,
    "Reference Number": "M-Pesa REF XYZ123",
    Date: "02/08/2026",
    Status: "Confirmed",
  },
  {
    Name: "Emily Nzau",
    "Amount (Ksh)": 50000,
    "Reference Number": "M-Pesa REF XYZ124",
    Date: "02/08/2026",
    Status: "Confirmed",
  },
  {
    Name: "Emily Nzau",
    "Amount (Ksh)": 50000,
    "Reference Number": "M-Pesa REF XYZ225",
    Date: "02/08/2026",
    Status: "Confirmed",
  },
];

/* ── localStorage helpers ── */
function saveToStorage(cfg, contribs) {
  try {
    localStorage.setItem("fd_config", JSON.stringify(cfg));
    localStorage.setItem("fd_contribs", JSON.stringify(contribs));
  } catch (e) {
    console.warn("Storage save failed", e);
  }
}

function loadFromStorage() {
  try {
    var cfg = localStorage.getItem("fd_config");
    var contribs = localStorage.getItem("fd_contribs");
    if (cfg && contribs) {
      return { cfg: JSON.parse(cfg), contribs: JSON.parse(contribs) };
    }
  } catch (e) {
    console.warn("Storage load failed", e);
  }
  return null;
}

function clearStorage() {
  try {
    localStorage.removeItem("fd_config");
    localStorage.removeItem("fd_contribs");
  } catch (e) {}
}

/* ── UI helpers ── */
function fmt(n) {
  return "Ksh " + Number(n).toLocaleString();
}

function setSyncStatus(message) {
  var el = document.getElementById("sync-status");
  if (el) el.textContent = message;
}

function updateLastUpdated(date) {
  var el = document.getElementById("last-updated");
  if (!el) return;
  if (!date) {
    el.textContent = "Last updated: --";
    return;
  }
  el.textContent =
    "Last updated: " +
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cleanText(value) {
  if (value === undefined || value === null) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function normalizeAmount(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  var cleaned = cleanText(value).replace(/,/g, "");
  var parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeStatus(value) {
  var normalized = cleanText(value).toLowerCase();
  return normalized === "confirmed" ? "Confirmed" : "Pending";
}

function normalizeConfig(cfg) {
  var merged = Object.assign({}, defaultConfig, cfg || {});
  Object.keys(merged).forEach(function (key) {
    if (key === "Target Amount (Ksh)") {
      merged[key] = normalizeAmount(merged[key]) || defaultConfig[key];
      return;
    }
    merged[key] = cleanText(merged[key]);
  });
  return merged;
}

function normalizeContribution(row) {
  var normalized = row || {};
  return {
    Name: cleanText(normalized.Name) || "Anonymous",
    "Amount (Ksh)": normalizeAmount(normalized["Amount (Ksh)"]),
    "Reference Number": cleanText(normalized["Reference Number"]) || "Not provided",
    Date: cleanText(normalized.Date) || "Not provided",
    Status: normalizeStatus(normalized.Status),
  };
}

function normalizeContributions(rows) {
  return (rows || []).map(normalizeContribution);
}

function setSourceBadge(message, tone) {
  var el = document.getElementById("source-badge");
  if (!el) return;
  el.className = "source-badge " + (tone || "source-badge-muted");
  el.textContent = message;
}

function showStorageBadge(show) {
  var el = document.getElementById("storage-badge");
  if (el) el.style.display = show ? "inline-flex" : "none";
}

function loadConfig(cfg) {
  cfg = normalizeConfig(cfg);
  currentConfig = cfg;
  document.getElementById("campaign-name").textContent = cfg["Campaign Name"] || "Fund Drive";
  document.getElementById("campaign-label").textContent =
    (cfg["Campaign Name"] || "Fund Drive") + " - Send Off";
  document.getElementById("mpesa-num").textContent = cfg["M-Pesa Number"] || "Not provided";
  document.getElementById("mpesa-name").textContent = cfg["Account Name"] || "Not provided";
  currentTarget = Number(cfg["Target Amount (Ksh)"]) || 1200000;
  document.getElementById("target-val").textContent = fmt(currentTarget);
  document.getElementById("ev-name").textContent = cfg["Event Name"] || "Upcoming Event";
  document.getElementById("ev-details").innerHTML =
    '<strong style="color:var(--text-light)">' +
    escapeHtml(cfg["Event Venue"] || "Venue not provided") +
    "</strong><br/>" +
    "Service: " +
    escapeHtml(cfg["Event Time"] || "Time not provided") +
    "<br/>" +
    "Date: " +
    escapeHtml(cfg["Event Date"] || "Date not provided");
  return currentTarget;
}

function loadContributions(rows, target) {
  rows = normalizeContributions(rows);
  allContributions = rows;
  var confirmed = rows.filter(function (r) {
    return (r.Status || "").toLowerCase() === "confirmed";
  });
  var raised = confirmed.reduce(function (s, r) {
    return s + (Number(r["Amount (Ksh)"]) || 0);
  }, 0);
  var pct = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;
  document.getElementById("progress-fill").style.width = pct + "%";
  document.getElementById("raised-val").textContent = fmt(raised);
  document.getElementById("stat-raised").textContent = fmt(raised);
  document.getElementById("stat-count").textContent = rows.length;
  document.getElementById("stat-confirmed").textContent = confirmed.length;
  document.getElementById("pct-val").textContent = pct + "%";
  renderTable("recent-table-wrap", rows.slice().reverse().slice(0, 5));
  renderTable("all-table-wrap", rows.slice().reverse());
}

function renderTable(id, rows) {
  if (!rows.length) {
    document.getElementById(id).innerHTML = '<div class="loading-msg">No contributions found</div>';
    return;
  }
  var html =
    "<table><thead><tr><th>Name</th><th>Amount</th><th>Reference</th><th>Date</th><th>Status</th></tr></thead><tbody>";
  rows.forEach(function (r) {
    var st = (r.Status || "pending").toLowerCase();
    var badge = st === "confirmed" ? "badge-confirmed" : "badge-pending";
    html +=
      "<tr>" +
      "<td>" +
      escapeHtml(r.Name || "Anonymous") +
      "</td>" +
      '<td class="amount-cell">' +
      fmt(r["Amount (Ksh)"] || 0) +
      "</td>" +
      '<td style="color:var(--text-muted);font-size:12px">' +
      escapeHtml(r["Reference Number"] || "Not provided") +
      "</td>" +
      '<td style="color:var(--text-muted)">' +
      escapeHtml(r.Date || "Not provided") +
      "</td>" +
      '<td><span class="badge ' +
      badge +
      '">' +
      escapeHtml(r.Status || "Pending") +
      "</span></td>" +
      "</tr>";
  });
  html += "</tbody></table>";
  document.getElementById(id).innerHTML = html;
}

function filterTable() {
  var q = document.getElementById("name-search").value.toLowerCase();
  var rows = allContributions.slice().reverse();
  if (filterStatusVal !== "all")
    rows = rows.filter(function (r) {
      return (r.Status || "").toLowerCase() === filterStatusVal;
    });
  if (q)
    rows = rows.filter(function (r) {
      return (r.Name || "").toLowerCase().includes(q);
    });
  renderTable("all-table-wrap", rows);
}

function filterStatus(val, btn) {
  filterStatusVal = val;
  document.querySelectorAll(".tab-btn").forEach(function (b) {
    b.classList.remove("active");
  });
  btn.classList.add("active");
  filterTable();
}

function showTab(name, btn) {
  ["dashboard", "contributions", "event", "upload"].forEach(function (t) {
    document.getElementById("tab-" + t).style.display = t === name ? "" : "none";
  });
  document.querySelectorAll(".nav-btn").forEach(function (b) {
    b.classList.remove("active");
  });
  if (btn) btn.classList.add("active");
}

function handleFile(e) {
  var file = e.target.files[0];
  if (!file) return;
  setSourceBadge("Importing data from uploaded spreadsheet...", "source-badge-muted");
  var reader = new FileReader();
  reader.onload = function (ev) {
    try {
      var wb = XLSX.read(ev.target.result, { type: "binary" });
      var cfg = Object.assign({}, defaultConfig);
      if (wb.SheetNames.includes("Config")) {
        var cfgRows = XLSX.utils.sheet_to_json(wb.Sheets["Config"], { header: 1 });
        cfgRows.forEach(function (r) {
          if (r[0] && r[1] !== undefined) cfg[r[0]] = r[1];
        });
      }
      var target = loadConfig(cfg);
      var contribs = defaultContribs;
      if (wb.SheetNames.includes("Contributions")) {
        contribs = XLSX.utils.sheet_to_json(wb.Sheets["Contributions"]);
      }
      loadContributions(contribs, target);
      saveToStorage(normalizeConfig(cfg), normalizeContributions(contribs));
      showStorageBadge(true);
      setSourceBadge("Showing data from uploaded spreadsheet.", "source-badge-live");
      showTab("dashboard", document.querySelector(".nav-btn"));
    } catch (err) {
      setSourceBadge(
        "Spreadsheet import failed. Please check the format and try again.",
        "source-badge-fallback",
      );
      alert("Error reading Excel file. Please check the format and try again.");
    }
  };
  reader.readAsBinaryString(file);
}

function clearData() {
  if (!confirm("Clear all saved data and reset to defaults?")) return;
  clearStorage();
  showStorageBadge(false);
  loadConfig(defaultConfig);
  loadContributions(defaultContribs, defaultConfig["Target Amount (Ksh)"]);
  setSourceBadge("Showing bundled sample data.", "source-badge-muted");
  document.getElementById("file-input").value = "";
}

/* ── Boot: restore from localStorage or use defaults ── */
(function init() {
  setSyncStatus("Refreshing live data...");
  setSourceBadge("Refreshing live contribution data...", "source-badge-muted");
  loadFromGoogleSheets();

  // Auto refresh every 10 seconds for live updates.
  setInterval(loadFromGoogleSheets, 10000);
})();

async function loadFromGoogleSheets() {
  try {
    setSourceBadge("Refreshing live contribution data...", "source-badge-muted");
    const res = await fetch(SHEET_API_URL + "?t=" + Date.now()); // prevent caching
    if (!res.ok) {
      throw new Error("Sheet request failed with status " + res.status);
    }
    const data = await res.json();

    if (!data || !data.config || !data.contributions) {
      throw new Error("Invalid data from sheet");
    }

    const normalizedConfig = normalizeConfig(data.config);
    const normalizedContribs = normalizeContributions(data.contributions);
    const target = loadConfig(normalizedConfig);
    loadContributions(normalizedContribs, target);

    // Also save locally as backup.
    saveToStorage(normalizedConfig, normalizedContribs);
    showStorageBadge(true);
    setSyncStatus("Live data connected");
    updateLastUpdated(new Date());
    setSourceBadge("Live sheet data loaded successfully.", "source-badge-live");
  } catch (err) {
    console.warn("Google Sheets load failed, falling back to local", err);

    const saved = loadFromStorage();
    if (saved) {
      loadConfig(saved.cfg);
      loadContributions(saved.contribs, currentTarget);
      showStorageBadge(true);
      setSyncStatus("Using saved local data");
      updateLastUpdated(new Date());
      setSourceBadge(
        "Live data is unavailable. Showing saved local data instead.",
        "source-badge-fallback",
      );
    } else {
      loadConfig(defaultConfig);
      loadContributions(defaultContribs, defaultConfig["Target Amount (Ksh)"]);
      showStorageBadge(false);
      setSyncStatus("Using bundled sample data");
      updateLastUpdated(null);
      setSourceBadge(
        "Live data is unavailable. Showing bundled sample data.",
        "source-badge-fallback",
      );
    }
  }
}
