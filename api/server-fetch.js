// File: api/server-fetch.js

const fetch = require('node-fetch');

// --- CONFIGURATION IS NOW DONE WITH ENVIRONMENT VARIABLES ---
const PLACE_ID = process.env.PLACE_ID || '85896571713843';
const MAX_PLAYERS = process.env.MAX_PLAYERS || '8';
const ROBLOX_COOKIE = process.env.ROBLOX_COOKIE;
const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY;
const JSONBIN_BIN_ID = process.env.JSONBIN_BIN_ID;

// This is the main serverless function Vercel will run
// Note: Changed from 'export default' to 'module.exports' for better Vercel/Node.js compatibility
module.exports = async function handler(request, response) {
    if (!ROBLOX_COOKIE || !JSONBIN_API_KEY || !JSONBIN_BIN_ID) {
        console.error("Server configuration error: Missing one or more required environment variables.");
        return response.status(500).send("Server configuration error: Missing environment variables.");
    }
    
    console.log("Starting scheduled fetch cycle...");
    try {
        const serverList = await fetchAllServers();
        
        if (serverList.length > 0) {
            const jobIds = serverList.map(server => server.id);
            console.log(`Success! Found ${jobIds.length} job IDs.`);
            await updateJsonBin(jobIds);
        } else {
            console.log("No suitable servers found in this cycle.");
            await updateJsonBin([]);
        }

        // Send a success response
        response.status(200).send(`Cycle complete. Found ${serverList.length} suitable servers and updated JSONBin.`);

    } catch (error) {
        console.error("An error occurred during the fetch cycle:", error);
        // Send an error response
        response.status(500).send(`An error occurred: ${error.message}`);
    }
}


// --- HELPER FUNCTIONS (Unchanged) ---

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function apiFetch(url) {
    const options = {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Cookie': `.ROBLOSECURITY=${ROBLOX_COOKIE}`
        }
    };
    return fetch(url, options);
}

async function fetchAllServers() {
    let allServers = [];
    let cursor = "";
    const urlTemplate = `https://games.roblox.com/v1/games/${PLACE_ID}/servers/Public?limit=100&cursor=`;
    let retryCount = 0;
    const MAX_RETRIES = 5;

    while (true) {
        if (retryCount >= MAX_RETRIES) {
            console.error("Maximum retry limit reached. Aborting.");
            throw new Error("Maximum retry limit reached while fetching servers.");
        }
        try {
            const url = urlTemplate + cursor;
            console.log(`Fetching server page... (Cursor: ${cursor || 'none'})`);
            const res = await apiFetch(url);

            if (res.status === 429) {
                retryCount++;
                console.warn(`Rate limited. Waiting 15s... (Retry ${retryCount}/${MAX_RETRIES})`);
                await sleep(15000);
                continue;
            }
            if (!res.ok) throw new Error(`Roblox API returned status ${res.status}`);
            
            retryCount = 0;
            const pageData = await res.json();
            const serversOnPage = pageData.data || [];
            if (serversOnPage.length === 0) break;

            const suitableServers = serversOnPage.filter(server => server.playing <= MAX_PLAYERS);
            if (suitableServers.length > 0) allServers.push(...suitableServers);
            
            cursor = pageData.nextPageCursor;
            if (!cursor) break;
            
            await sleep(500);
        } catch (error) {
            console.error("Error during server page fetch:", error.message);
            retryCount++;
            await sleep(2000); // Wait 2s before retrying after a generic error
        }
    }
    console.log(`Finished fetching all server pages. Found ${allServers.length} total suitable servers.`);
    return allServers;
}

async function updateJsonBin(data) {
    const url = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;
    const jsonData = JSON.stringify(data);

    console.log(`Updating JSONBin bin ${JSONBIN_BIN_ID}...`);
    const res = await fetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': JSONBIN_API_KEY
        },
        body: jsonData
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`JSONBin API Error: ${res.status} - ${errorText}`);
    }
    console.log(`Successfully updated JSONBin bin: ${JSONBIN_BIN_ID}`);
}