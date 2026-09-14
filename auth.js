// Spotify App Settings
const CLIENT_ID = "d6f92665381344c2ba614d0c610d3352";
const REDIRECT_URI = "http://127.0.0.1:5501/callback.html";

const SCOPES = [
    "streaming",
    "user-read-email",
    "user-read-private",
    "user-modify-playback-state",
    "user-read-playback-state"
].join(" ");


// Generate a secure random string
function generateRandomString(length = 64) {
    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);

    return Array.from(
        randomValues,
        value => characters[value % characters.length]
    ).join("");
}


// Convert data to Base64 URL format
function base64UrlEncode(buffer) {
    return btoa(
        String.fromCharCode(...new Uint8Array(buffer))
    )
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}


// Create the PKCE code challenge
async function generateCodeChallenge(codeVerifier) {
    const data = new TextEncoder().encode(codeVerifier);

    const digest = await crypto.subtle.digest(
        "SHA-256",
        data
    );

    return base64UrlEncode(digest);
}


// Start Spotify Login
async function loginWithSpotify() {
    const codeVerifier = generateRandomString(64);
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateRandomString(32);

    // Save these temporarily so we can use them after Spotify redirects us back
    sessionStorage.setItem("spotify_code_verifier", codeVerifier);
    sessionStorage.setItem("spotify_state", state);

    const params = new URLSearchParams({
        response_type: "code",
        client_id: CLIENT_ID,
        scope: SCOPES,
        redirect_uri: REDIRECT_URI,
        state: state,
        code_challenge_method: "S256",
        code_challenge: codeChallenge
    });

    window.location.href =
        `https://accounts.spotify.com/authorize?${params.toString()}`;
}


// Exchange authorization code for an access token
async function exchangeCodeForToken(code) {
    const codeVerifier =
        sessionStorage.getItem("spotify_code_verifier");

    const savedState =
        sessionStorage.getItem("spotify_state");

    const urlParams = new URLSearchParams(window.location.search);

    const returnedState = urlParams.get("state");

    // Security check
    if (!savedState || returnedState !== savedState) {
        throw new Error("Spotify login security check failed.");
    }

    const response = await fetch(
        "https://accounts.spotify.com/api/token",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code: code,
                redirect_uri: REDIRECT_URI,
                client_id: CLIENT_ID,
                code_verifier: codeVerifier
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        console.error(data);
        throw new Error("Could not get Spotify access token.");
    }

    // Save login information
    localStorage.setItem(
        "spotify_access_token",
        data.access_token
    );

    localStorage.setItem(
        "spotify_refresh_token",
        data.refresh_token
    );

    localStorage.setItem(
        "spotify_expires_at",
        Date.now() + data.expires_in * 1000
    );

    // Clean up temporary PKCE data
    sessionStorage.removeItem("spotify_code_verifier");
    sessionStorage.removeItem("spotify_state");

    // Send the user back to the Home screen
    window.location.href = "index.html";
}

// Refresh an expired Spotify access token
async function refreshSpotifyAccessToken() {
    const refreshToken =
        localStorage.getItem("spotify_refresh_token");

    if (!refreshToken) {
        throw new Error("No Spotify refresh token found.");
    }

    const response = await fetch(
        "https://accounts.spotify.com/api/token",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: refreshToken,
                client_id: CLIENT_ID
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        console.error("Spotify token refresh error:", data);
        throw new Error("Could not refresh Spotify access token.");
    }

    // Save the new access token
    localStorage.setItem(
        "spotify_access_token",
        data.access_token
    );

    // Spotify may return a new refresh token.
    // If it does, save it too.
    if (data.refresh_token) {
        localStorage.setItem(
            "spotify_refresh_token",
            data.refresh_token
        );
    }

    // Save the new expiry time
    localStorage.setItem(
        "spotify_expires_at",
        Date.now() + data.expires_in * 1000
    );

    return data.access_token;
}


// Handle Spotify callback
async function handleSpotifyCallback() {
    const urlParams = new URLSearchParams(window.location.search);

    const code = urlParams.get("code");
    const error = urlParams.get("error");

    if (error) {
        document.querySelector("h1").textContent =
            "Spotify login was cancelled.";

        console.error("Spotify error:", error);
        return;
    }

    if (!code) {
        return;
    }

    try {
        document.querySelector("h1").textContent =
            "Logging you into Spotify...";

        await exchangeCodeForToken(code);
    } catch (error) {
        console.error(error);

        document.querySelector("h1").textContent =
            "Spotify login failed. Check the console.";
    }
}


// Set up the login button on the Home screen
function setupSpotifyLogin() {
    const loginButton =
        document.getElementById("spotify-login-btn");

    if (!loginButton) {
        return;
    }

    loginButton.addEventListener(
        "click",
        loginWithSpotify
    );
}


// Decide what this page should do
if (
    window.location.pathname.endsWith("callback.html")
) {
    handleSpotifyCallback();
} else {
    setupSpotifyLogin();
}