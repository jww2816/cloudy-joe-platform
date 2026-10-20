"use strict";

const COOKIE_NAME = "cloudyJoeAccessToken";

function signOut() {
    // Remove the browser's access-token cookie.
    document.cookie = [
        `${COOKIE_NAME}=`,
        "Path=/",
        "Max-Age=0",
        "Secure",
        "SameSite=Lax"
    ].join("; ");

    // Replace current history entry.
    const accessPath = window.location.pathname.startsWith("/frontend/")
    ? "/frontend/access.html"
    : "/access.html";

    window.location.replace(accessPath);
}

document.addEventListener("DOMContentLoaded", () => {
    const signOutButton =
        document.querySelector("#sign-out-button");

    if (signOutButton) {
        signOutButton.addEventListener(
            "click",
            signOut
        );
    }
});