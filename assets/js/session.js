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
    window.location.replace("/access.html");
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