
/**
 * Cloudy Joe - General Website Functionality
 *
 * Handles shared website interactions.
 *
 * Authentication is handled by auth.js.
 * Access requests are handled by request-access.js.
 */

// ============================================
// Lesson Page - Expand / Collapse Sections
// ============================================

const lessonToggles = document.querySelectorAll(".lesson-toggle");

lessonToggles.forEach(function (toggle) {
  toggle.addEventListener("click", function () {
    const lesson = toggle.closest(".lesson");

    if (!lesson) {
      return;
    }

    const content = lesson.querySelector(".lesson-content");
    const icon = lesson.querySelector(".lesson-icon");

    if (!content || !icon) {
      return;
    }

    const isExpanded =
      toggle.getAttribute("aria-expanded") === "true";

    toggle.setAttribute(
      "aria-expanded",
      String(!isExpanded)
    );

    content.hidden = isExpanded;

    icon.textContent = isExpanded ? "+" : "−";
  });
});
