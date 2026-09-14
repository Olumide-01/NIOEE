// Get the logged-in Spotify user's profile
async function getSpotifyProfile() {
    let accessToken =
        localStorage.getItem("spotify_access_token");

    if (!accessToken) {
        console.log("No Spotify access token found.");
        return;
    }

    let response = await fetch(
        "https://api.spotify.com/v1/me",
        {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        }
    );

    // If the access token expired, refresh it once
    if (response.status === 401) {
        console.log("Spotify access token expired. Refreshing...");

        try {
            accessToken =
                await refreshSpotifyAccessToken();

            response = await fetch(
                "https://api.spotify.com/v1/me",
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                }
            );
        } catch (error) {
            console.error(
                "Could not refresh Spotify token:",
                error
            );
            return;
        }
    }

    const data = await response.json();

    if (!response.ok) {
        console.error("Spotify API error:", data);
        return;
    }

    console.log("Spotify profile:", data);

    const greetingName =
        document.querySelector(".greeting h1");

    if (greetingName) {
        greetingName.textContent =
            data.display_name;
    }
}


// Get Spotify profile when the page loads
getSpotifyProfile();

// Create the NIOEE Spotify player
window.onSpotifyWebPlaybackSDKReady = () => {

    const player = new Spotify.Player({
        name: "NIOEE Web Player",

        getOAuthToken: async callback => {
            try {
                const token =
                    await refreshSpotifyAccessToken();

                callback(token);
            } catch (error) {
                console.error(
                    "Could not get Spotify token:",
                    error
                );
            }
        },

        volume: 0.5
    });

    window.nioeeSpotifyPlayer = player;


    // Spotify player is ready
    player.addListener("ready", ({ device_id }) => {
        console.log("NIOEE Spotify player is ready!");
        console.log("Device ID:", device_id);

        window.nioeeSpotifyDeviceId = device_id;
    });


    // Spotify player went offline
    player.addListener("not_ready", ({ device_id }) => {
        console.log(
            "NIOEE Spotify player is not ready:",
            device_id
        );
    });


    // SDK initialization failed
    player.addListener(
        "initialization_error",
        ({ message }) => {
            console.error(
                "Spotify initialization error:",
                message
            );
        }
    );


    // Spotify authentication failed
    player.addListener(
        "authentication_error",
        ({ message }) => {
            console.error(
                "Spotify authentication error:",
                message
            );
        }
    );


    // Account cannot use Web Playback
    player.addListener(
        "account_error",
        ({ message }) => {
            console.error(
                "Spotify account error:",
                message
            );
        }
    );


    // Connect NIOEE to Spotify
    player.connect().then(success => {

        if (success) {
            console.log(
                "NIOEE successfully connected to Spotify!"
            );
        } else {
            console.error(
                "NIOEE could not connect to Spotify."
            );
        }

    });

};


// Test playing a Spotify track on the NIOEE player
async function playTestTrack() {
    const deviceId = window.nioeeSpotifyDeviceId;

    if (!deviceId) {
        console.error("NIOEE Spotify device is not ready.");
        return;
    }

    try {
        const accessToken =
            await refreshSpotifyAccessToken();

        const response = await fetch(
            `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
            {
                method: "PUT",

                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    uris: [
                        "spotify:track:4eXb0vQK0syqsuLpj53C4J"
                    ]
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json();

            console.error(
                "Could not start Spotify playback:",
                errorData
            );

            return;
        }

        console.log("NIOEE is now playing the test track! 🎵");

    } catch (error) {
        console.error(
            "Playback test failed:",
            error
        );
    }
}