
(() => {
  "use strict";

  // Replace with your actual API Gateway Invoke URL.
  const API_URL =
    "https://m1qxy59lh9.execute-api.us-east-1.amazonaws.com/access-requests";

  const emailPanel = document.getElementById("email-panel");
  const otpPanel = document.getElementById("otp-panel");
  const successPanel = document.getElementById("success-panel");
  const requestPanel = document.getElementById("request-access-panel");
  const confirmationPanel = document.getElementById(
    "request-confirmation-panel"
  );

  const requestForm = document.getElementById("request-access-form");
  const requestStatus = document.getElementById("request-status");
  const submitButton = requestForm?.querySelector(
    'button[type="submit"]'
  );

  const panels = [
    emailPanel,
    otpPanel,
    successPanel,
    requestPanel,
    confirmationPanel
  ];

  function showPanel(panelToShow) {
    panels.forEach((panel) => {
      if (panel) {
        panel.hidden = panel !== panelToShow;
      }
    });
  }

  document.getElementById("show-request-access")
    ?.addEventListener("click", () => {
      requestStatus.textContent = "";
      showPanel(requestPanel);
    });

  document.getElementById("cancel-request-access")
    ?.addEventListener("click", () => {
      showPanel(emailPanel);
    });

  document.getElementById("return-to-access")
    ?.addEventListener("click", () => {
      showPanel(emailPanel);
    });

  requestForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (submitButton.disabled) return;

    const data = {
      name: document.getElementById("request-name").value.trim(),
      email: document.getElementById("request-email").value.trim(),
      company: document.getElementById("request-company").value.trim(),
      reason: document.getElementById("request-reason").value.trim()
    };

    if (
      data.name.length < 2 ||
      data.company.length < 2 ||
      data.reason.length < 10 ||
      !requestForm.checkValidity()
    ) {
      requestStatus.textContent =
        "Please complete all fields with valid information.";
      return;
    }

    submitButton.disabled = true;
    requestStatus.textContent = "Submitting your request...";

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data),
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      requestForm.reset();
      requestStatus.textContent = "";
      showPanel(confirmationPanel);

    } catch (error) {
      console.error("Access request submission failed:", error);

      requestStatus.textContent =
        "We couldn't submit your request. Please try again.";

    } finally {
      submitButton.disabled = false;
    }
  });
})();
