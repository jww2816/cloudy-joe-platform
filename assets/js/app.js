const accessForm = document.getElementById("access-form");
const accessCodeInput = document.getElementById("access-code");
const accessStatus = document.getElementById("access-status");

const accessCodePanel = document.getElementById("access-code-panel");
const requestAccessPanel = document.getElementById("request-access-panel");
const requestConfirmationPanel = document.getElementById(
  "request-confirmation-panel"
);

const showRequestAccessButton = document.getElementById(
  "show-request-access"
);

const cancelRequestAccessButton = document.getElementById(
  "cancel-request-access"
);

const returnToAccessButton = document.getElementById(
  "return-to-access"
);

const requestAccessForm = document.getElementById(
  "request-access-form"
);

const requestStatus = document.getElementById("request-status");


function showPanel(panelToShow) {
  const panels = [
    accessCodePanel,
    requestAccessPanel,
    requestConfirmationPanel
  ];

  panels.forEach(function (panel) {
    if (!panel) {
      return;
    }

    panel.hidden = panel !== panelToShow;
  });
}


if (accessForm) {
  accessForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const accessCode = accessCodeInput.value.trim();

    if (!accessCode) {
      accessStatus.textContent = "Please enter an access code.";
      return;
    }

    accessStatus.textContent =
      "Mock validation complete. Real authentication will be added later.";
  });
}


if (showRequestAccessButton) {
  showRequestAccessButton.addEventListener("click", function () {
    requestStatus.textContent = "";
    showPanel(requestAccessPanel);
  });
}


if (cancelRequestAccessButton) {
  cancelRequestAccessButton.addEventListener("click", function () {
    showPanel(accessCodePanel);
  });
}


if (returnToAccessButton) {
  returnToAccessButton.addEventListener("click", function () {
    showPanel(accessCodePanel);
  });
}


if (requestAccessForm) {
  requestAccessForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const name = document
      .getElementById("request-name")
      .value
      .trim();

    const email = document
      .getElementById("request-email")
      .value
      .trim();

    const company = document
      .getElementById("request-company")
      .value
      .trim();

    const reason = document
      .getElementById("request-reason")
      .value
      .trim();

    if (!name || !email || !company || !reason) {
      requestStatus.textContent =
        "Please complete all request fields.";
      return;
    }

    console.log("Mock access request:", {
      name,
      email,
      company,
      reason
    });

    requestAccessForm.reset();
    showPanel(requestConfirmationPanel);
  });


}

const lessonToggles = document.querySelectorAll(".lesson-toggle");

lessonToggles.forEach(function (toggle) {
  toggle.addEventListener("click", function () {
    const lesson = toggle.closest(".lesson");

    const content = lesson.querySelector(".lesson-content");
    const icon = lesson.querySelector(".lesson-icon");

    const isExpanded =
      toggle.getAttribute("aria-expanded") === "true";

    toggle.setAttribute(
      "aria-expanded",
      String(!isExpanded)
    );

    content.hidden = !content.hidden;

    icon.textContent =
      isExpanded ? "+" : "−";
  });
});