const accessForm = document.getElementById("access-form");
const accessCodeInput = document.getElementById("access-code");
const accessStatus = document.getElementById("access-status");

if (accessForm) {
  accessForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const accessCode = accessCodeInput.value.trim();

    if (!accessCode) {
      accessStatus.textContent = "Please enter an access code.";
      return;
    }

    accessStatus.textContent =
      "Authentication service will be connected in a later phase.";
  });
}