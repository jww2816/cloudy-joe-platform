
const API_BASE =
  "https://m1qxy59lh9.execute-api.us-east-1.amazonaws.com";

const state = {
  requests: [],
  busy: false
};

const elements = {
  body: document.getElementById("requests-body"),
  message: document.getElementById("admin-message"),
  filter: document.getElementById("status-filter"),
  refresh: document.getElementById("refresh-button"),
  count: document.getElementById("request-count")
};

function getAccessToken() {
  const cookie = document.cookie
    .split("; ")
    .find(item => item.startsWith("cloudyJoeAccessToken="));

  return cookie
    ? decodeURIComponent(cookie.substring("cloudyJoeAccessToken=".length))
    : null;
}

function showMessage(message, type = "") {
  elements.message.textContent = message;
  elements.message.className = `admin-message ${type}`;
}

function createCell(row, value, className = "") {
  const cell = document.createElement("td");
  cell.textContent = value == null ? "" : String(value);

  if (className) {
    cell.className = className;
  }

  row.appendChild(cell);
  return cell;
}

function formatDate(value) {
  if (!value) return "Unknown";

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString();
}

async function apiRequest(path, options = {}) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("Session expired. Please sign in again.");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Session expired. Please sign in again.");
    }

    if (response.status === 403) {
      throw new Error("Administrator access is required.");
    }

    throw new Error(data.message || `Request failed (${response.status}).`);
  }

  return data;
}

function renderRequests() {
  const filter = elements.filter.value;

  const requests = state.requests
    .filter(request => filter === "ALL" || request.status === filter)
    .sort((a, b) =>
      new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );

  elements.body.replaceChildren();

  elements.count.textContent =
    `${requests.length} of ${state.requests.length} requests`;

  if (requests.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 6;
    cell.textContent = "No requests match this filter.";

    row.appendChild(cell);
    elements.body.appendChild(row);
    return;
  }

  for (const request of requests) {
    const row = document.createElement("tr");

    const applicant = createCell(row, request.name || "Unknown");
    const email = document.createElement("div");

    email.className = "admin-email";
    email.textContent = request.email || "";
    applicant.appendChild(email);

    createCell(row, request.company || "—");
    createCell(row, request.reason || "—", "admin-reason");
    createCell(row, formatDate(request.createdAt), "admin-date");
    createCell(row, request.status || "UNKNOWN");

    const actionsCell = createCell(row, "");
    const actions = document.createElement("div");
    actions.className = "admin-actions";

    if (request.status === "PENDING") {
      const approve = document.createElement("button");
      approve.type = "button";
      approve.className = "admin-action approve";
      approve.textContent = "Approve";
      approve.disabled = state.busy;
      approve.addEventListener("click", () =>
        changeRequestStatus(request, "approve")
      );

      const reject = document.createElement("button");
      reject.type = "button";
      reject.className = "admin-action reject";
      reject.textContent = "Reject";
      reject.disabled = state.busy;
      reject.addEventListener("click", () =>
        changeRequestStatus(request, "reject")
      );

      actions.append(approve, reject);
    } else {
      actions.textContent = "—";
    }

    actionsCell.appendChild(actions);
    elements.body.appendChild(row);
  }
}

async function loadRequests() {
  if (state.busy) return;

  state.busy = true;
  elements.refresh.disabled = true;
  showMessage("Loading access requests...");
  renderRequests();

  try {
    const data = await apiRequest("/admin/requests");

    if (!Array.isArray(data.requests)) {
      throw new Error("Unexpected API response.");
    }

    state.requests = data.requests;
    showMessage("Requests loaded successfully.", "success");
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    state.busy = false;
    elements.refresh.disabled = false;
    renderRequests();
  }
}

async function changeRequestStatus(request, action) {
  if (state.busy) return;

  const verb = action === "approve" ? "approve" : "reject";

  const confirmed = window.confirm(
    `Are you sure you want to ${verb} the request from ${request.email || "this applicant"}?`
  );

  if (!confirmed) return;

  state.busy = true;
  elements.refresh.disabled = true;
  renderRequests();
  showMessage(`Processing ${verb} request...`);

  try {
    await apiRequest(`/admin/requests/${action}`, {
      method: "POST",
      body: JSON.stringify({
        requestId: request.requestId
      })
    });

    const data = await apiRequest("/admin/requests");

    if (!Array.isArray(data.requests)) {
      throw new Error("Unexpected API response after update.");
    }

    state.requests = data.requests;
    showMessage(
      `Request ${action === "approve" ? "approved" : "rejected"} successfully.`,
      "success"
    );
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    state.busy = false;
    elements.refresh.disabled = false;
    renderRequests();
  }
}

elements.filter.addEventListener("change", renderRequests);
elements.refresh.addEventListener("click", loadRequests);

loadRequests();
