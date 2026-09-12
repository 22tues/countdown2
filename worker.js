export default {
  async fetch(request, env, ctx) {
    const gaspergallon = 4.306
    const url = new URL(request.url);
    const path = url.pathname.split('/')
    
    // =========================================================================
    // 1. SERVER-SIDE API ENDPOINT: Exact Craigslist Subdomain Resolution
    // =========================================================================
    if (path[1]==="api" && path[2]==="craigslist") {
      const lat = parseFloat(url.searchParams.get("lat") ?? path[3]);
      const lon = parseFloat(url.searchParams.get("lon") ?? path[4]);
      const invalid = new Response(JSON.stringify({ error: "Invalid coordinates" }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      if (isNaN(lat) || isNaN(lon)) return invalid;
      if (-124.8 > lon || lon > -67) return invalid;
      if (24.5 > lat || lat > 49.4) return invalid;
      
      const rideshareURL = (subdomain) => `https://${subdomain}.craigslist.org/search/rid`
      const ret = (sub) => new Response(JSON.stringify({ subdomain: sub, rideshareUrl: rideshareURL(sub) }), { headers: {"content-type":"application/json"}})
      try {
        const clRes = await fetch("https://reference.craigslist.org/Areas", {
          cf: { cacheTtl: 86400, cacheEverything: true },
        });
        const areas = await clRes.json();

        let nearestSubdomain = "washingtondc";
        let minDistance = Infinity;

        for (const area of areas) {
          if (area.Country === "US" && area.Hostname && area.Latitude && area.Longitude) {
            const mLat = parseFloat(area.Latitude);
            const mLon = parseFloat(area.Longitude);
            const slug = area.Hostname.trim().toLowerCase();

            const dLat = ((mLat - lat) * Math.PI) / 180;
            const dLon = ((mLon - lon) * Math.PI) / 180;
            const a =
              Math.sin(dLat / 2) ** 2 +
              Math.cos((lat * Math.PI) / 180) *
                Math.cos((mLat * Math.PI) / 180) *
                Math.sin(dLon / 2) ** 2;
            const dist = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

            if (dist < minDistance) {
              minDistance = dist;
              nearestSubdomain = slug;
            }
          }
        }
        return ret(nearestSubdomain)
      } catch (err) {
        return ret("washingtondc")
      }
    }
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Countdown to Sept 22</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        body {
            font-family: 'Inter', sans-serif;
            background-color: #0f172a;
            color: #f8fafc;
            background-image: linear-gradient(rgba(15, 23, 42, 0.7), rgba(15, 23, 42, 0.7)), 
                              url('https://images.unsplash.com/photo-1501466044931-62695aada8e9?auto=format&fit=crop&q=80&w=2000');
            background-size: cover;
            background-position: center;
            background-attachment: fixed;
            background-repeat: no-repeat;
        }
        .hero-text {
            font-size: clamp(2.5rem, 8vw, 7rem);
            line-height: 1.1;
        }
        .glass-panel {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .unit-tag {
            position: relative;
            display: inline-block;
            margin-right: 0.5em;
            width: 2em;
            padding-top: 0.5em;
            padding-bottom: 0.5em;
        }
        .unit-tag::after {
            content: attr(data-unit);
            position: absolute;
            top: 2.5em;
            right: -2em;
            width: 4em;
            height: 1em;
            font-size: 0.3em;
            color: gray;
            transform: rotate(90deg);
            transform-origin: bottom;
        }
        .unit-tag.med::after {
            font-size: 0.3em;
        }
        .unit-tag.long::after {
            font-size: 0.2em;
            top: 4.2em;
        }
    </style>
</head>
<body class="min-h-screen flex flex-col items-center justify-center p-4 text-center">

    <main class="w-full max-w-6xl mx-auto flex flex-col items-center gap-8 my-8">
        
        <!-- HERO COUNTDOWN -->
        <div class="flex flex-col items-center">
            <h1 class="text-xl md:text-2xl font-bold text-slate-400 uppercase tracking-widest mb-2">Time until September 22</h1>
            <div id="countdown" class="hero-text font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-teal-300 to-emerald-400 font-mono drop-shadow-lg">
                00<span>Days</span><br/>00<span>Hours</span><br/>00<span>Minutes</span><br/>00<span>Seconds</span>
            </div>
        </div>

        <!-- ACTION SECTION -->
        <div class="glass-panel w-full max-w-3xl rounded-2xl p-6 md:p-8 shadow-2xl">
            <h2 class="text-2xl md:text-3xl font-bold mb-4">How are you getting to DC?</h2>
            
            <form id="travel-form" class="flex flex-col sm:flex-row gap-3 w-full">
                <input 
                    type="text" 
                    id="location" 
                    placeholder="Enter City & State or Zip (e.g. Seattle, WA)" 
                    required
                    class="flex-1 px-4 py-3 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                <button type="submit" id="submit-btn" class="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors flex items-center justify-center gap-2">
                    Calculate Trip
                </button>
            </form>

            <div id="results" class="mt-6 text-left hidden flex-col gap-4"></div>
        </div>
    </main>

    <script>
        const targetDate = new Date(Date.UTC(2026, 8, 22, 13, 0, 0));
        const DC_COORDS = { lat: 38.8951, lon: -77.0364, name: "Washington, DC" };

        const STATE_NAME_TO_CODE = {
            "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR",
            "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE",
            "Florida": "FL", "Georgia": "GA", "Hawaii": "HI", "Idaho": "ID",
            "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS",
            "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
            "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS",
            "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV",
            "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
            "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK",
            "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
            "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT",
            "Vermont": "VT", "Virginia": "VA", "Washington": "WA", "West Virginia": "WV",
            "Wisconsin": "WI", "Wyoming": "WY"
        }
        
        const STATE_CAPITALS = {
            "AL": { name: "Montgomery, AL", lat: 32.3792, lon: -86.3077 },
            "AK": { name: "Juneau, AK", lat: 58.3019, lon: -134.4197 },
            "AZ": { name: "Phoenix, AZ", lat: 33.4484, lon: -112.0740 },
            "AR": { name: "Little Rock, AR", lat: 34.7465, lon: -92.2896 },
            "CA": { name: "Sacramento, CA", lat: 38.5816, lon: -121.4944 },
            "CO": { name: "Denver, CO", lat: 39.7392, lon: -104.9903 },
            "CT": { name: "Hartford, CT", lat: 41.7658, lon: -72.6734 },
            "DE": { name: "Dover, DE", lat: 39.1582, lon: -75.5244 },
            "FL": { name: "Tallahassee, FL", lat: 30.4383, lon: -84.2807 },
            "GA": { name: "Atlanta, GA", lat: 33.7490, lon: -84.3880 },
            "HI": { name: "Honolulu, HI", lat: 21.3069, lon: -157.8583 },
            "ID": { name: "Boise, ID", lat: 43.6150, lon: -116.2023 },
            "IL": { name: "Springfield, IL", lat: 39.7817, lon: -89.6501 },
            "IN": { name: "Indianapolis, IN", lat: 39.7684, lon: -86.1581 },
            "IA": { name: "Des Moines, IA", lat: 41.5868, lon: -93.6250 },
            "KS": { name: "Topeka, KS", lat: 39.0473, lon: -95.6752 },
            "KY": { name: "Frankfort, KY", lat: 38.2009, lon: -84.8733 },
            "LA": { name: "Baton Rouge, LA", lat: 30.4515, lon: -91.1871 },
            "ME": { name: "Augusta, ME", lat: 44.3106, lon: -69.7795 },
            "MD": { name: "Annapolis, MD", lat: 38.9784, lon: -76.4922 },
            "MA": { name: "Boston, MA", lat: 42.3601, lon: -71.0589 },
            "MI": { name: "Lansing, MI", lat: 42.7325, lon: -84.5555 },
            "MN": { name: "St. Paul, MN", lat: 44.9537, lon: -93.0900 },
            "MS": { name: "Jackson, MS", lat: 32.2988, lon: -90.1848 },
            "MO": { name: "Jefferson City, MO", lat: 38.5767, lon: -92.1735 },
            "MT": { name: "Helena, MT", lat: 46.5891, lon: -112.0391 },
            "NE": { name: "Lincoln, NE", lat: 40.8136, lon: -96.7026 },
            "NV": { name: "Carson City, NV", lat: 39.1638, lon: -119.7674 },
            "NH": { name: "Concord, NH", lat: 43.2081, lon: -71.5376 },
            "NJ": { name: "Trenton, NJ", lat: 40.2206, lon: -74.7597 },
            "NM": { name: "Santa Fe, NM", lat: 35.6870, lon: -105.9378 },
            "NY": { name: "Albany, NY", lat: 42.6526, lon: -73.7562 },
            "NC": { name: "Raleigh, NC", lat: 35.7796, lon: -78.6382 },
            "ND": { name: "Bismarck, ND", lat: 46.8083, lon: -100.7837 },
            "OH": { name: "Columbus, OH", lat: 39.9612, lon: -82.9988 },
            "OK": { name: "Oklahoma City, OK", lat: 35.4676, lon: -97.5164 },
            "OR": { name: "Salem, OR", lat: 44.9429, lon: -123.0351 },
            "PA": { name: "Harrisburg, PA", lat: 40.2732, lon: -76.8867 },
            "RI": { name: "Providence, RI", lat: 41.8240, lon: -71.4128 },
            "SC": { name: "Columbia, SC", lat: 34.0007, lon: -81.0348 },
            "SD": { name: "Pierre, SD", lat: 44.3683, lon: -100.3510 },
            "TN": { name: "Nashville, TN", lat: 36.1627, lon: -86.7816 },
            "TX": { name: "Austin, TX", lat: 30.2672, lon: -97.7431 },
            "UT": { name: "Salt Lake City, UT", lat: 40.7608, lon: -111.8910 },
            "VT": { name: "Montpelier, VT", lat: 44.2601, lon: -72.5754 },
            "VA": { name: "Richmond, VA", lat: 37.5407, lon: -77.4360 },
            "WA": { name: "Olympia, WA", lat: 47.0379, lon: -122.9007 },
            "WV": { name: "Charleston, WV", lat: 38.3498, lon: -81.6326 },
            "WI": { name: "Madison, WI", lat: 43.0731, lon: -89.4012 },
            "WY": { name: "Cheyenne, WY", lat: 41.1400, lon: -104.8202 }
        };

        const countdownEl = document.getElementById('countdown');
        function updateCountdown() {
            const now = new Date().getTime();
            const distance = targetDate.getTime() - now;
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));

            if (distance < 0 && days > -35) {
                countdownEl.innerHTML = " 22 TUESDAY IS HERE";
                return;
            }

            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            const digit = (num) => String(num).padStart(2, '0');
            const seg = (time, unit, long=false) => \`<div class="unit-tag\${long?" long ":' '}\${unit.toLowerCase()}" data-unit="\${unit}">\${digit(time)}</div>\`;

            countdownEl.innerHTML = \`\${seg(days, 'Days')}\${seg(hours, 'Hours')}\${seg(minutes, 'Minutes',1)}\${seg(seconds, 'Seconds',1)}\`            
        }
        setInterval(updateCountdown, 1000);
        updateCountdown();

        function calculateRoadDistance(lat1, lon1, lat2, lon2) {
            const R = 3958.8; 
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                      Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const straightMiles = R * c;
            return Math.round(straightMiles * 1.3); 
        }

        async function getActualDriveData(startLat, startLon) {
            const url = \`https://router.project-osrm.org/route/v1/driving/\${startLon},\${startLat};\${DC_COORDS.lon},\${DC_COORDS.lat}?overview=false\`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.code !== 'Ok') {
                return { miles: 0, hours: 0 }
            }
            
            return {
                miles: parseFloat((data.routes[0].distance * 0.000621371).toFixed(1)),
                hours: parseFloat((data.routes[0].duration / 3600).toFixed(1))
            };
        }

        document.getElementById('travel-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('location').value.trim();
            const btn = document.getElementById('submit-btn');
            const resultsDiv = document.getElementById('results');

            btn.disabled = true;
            btn.innerHTML = 'Calculating...';
            resultsDiv.classList.add('hidden');

            try {
                // Free Geocoding
                const geoRes = await fetch(\`https://nominatim.openstreetmap.org/search?q=\${encodeURIComponent(input)}&countrycodes=us&format=json&addressdetails=1\`);
                const geoData = await geoRes.json();

                if (!geoData || geoData.length === 0) {
                    throw new Error("Location not found. Please try entering a US City and State.");
                }

                const place = geoData[0];
                const userLat = parseFloat(place.lat);
                const userLon = parseFloat(place.lon);
                const userState = place.address.state_code ? place.address.state_code.toUpperCase() : place.address.state ? STATE_NAME_TO_CODE[place.address.state] : null;
                const formattedName = \`\${place.address.city || place.address.town || place.name}, \${userState || ''}\`;
                
                let clData = await fetch(\`/api/craigslist/\${userLat}/\${userLon}\`)
                let clRideshare = ''
                let clSubdomain = 'craigslist'
                if (clData.ok) {
                  const clJson = await clData.json(); 
                  clRideshare = clJson.rideshareUrl;
                  clSubdomain = clJson.subdomain;
                }

                const now = new Date();
                const hoursLeftToDeadline = (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60);

                const routeData = await getActualDriveData(userLat, userLon);
                let dcMiles = routeData.miles;
                let driveHours = routeData.hours;
                
                // NO SWIMMING CARS LOGIC:
                let isDrivable = dcMiles > 0;
                let overnightsNeeded = 0;
                let totalJourneyHours = 0;
                let gasCost = 0;

                if (isDrivable) {
                    overnightsNeeded = Math.floor(driveHours / 9); 
                    totalJourneyHours = driveHours + (overnightsNeeded * 15);
                    gasCost = Math.round((dcMiles / 25) * ${gaspergallon}); 
                } else {
                    // If they can't drive overland (e.g. Hawaii to DC), assume they must fly.
                    // Flights from anywhere in the US to DC take 24 hours max.
                    totalJourneyHours = 24;
                }

                const targetYear = targetDate.getFullYear();
                const targetMonth = String(targetDate.getMonth() + 1).padStart(2, '0');
                const flightDateStr = \`\${targetYear}-\${targetMonth}-21\`; 

                if (hoursLeftToDeadline >= totalJourneyHours) {
                    
                    // Conditionally render stats box based on drivability
                    let statsHtml = isDrivable ? \`
                        <div class="bg-slate-800/80 p-2 rounded border border-slate-700">
                            <div class="text-xs text-slate-400">Drive Time</div>
                            <div class="text-lg font-bold font-mono">\${driveHours} hrs</div>
                        </div>
                        <div class="bg-slate-800/80 p-2 rounded border border-slate-700">
                            <div class="text-xs text-slate-400">Overnight Stops</div>
                            <div class="text-lg font-bold font-mono">\${overnightsNeeded} night\${overnightsNeeded === 1 ? '' : 's'}</div>
                        </div>
                        <div class="bg-slate-800/80 p-2 rounded border border-slate-700">
                            <div class="text-xs text-slate-400">Est. Gas (1-Way)</div>
                            <div class="text-lg font-bold font-mono text-emerald-400">\$\${gasCost}</div>
                        </div>
                    \` : \`
                        <div class="bg-slate-800/80 p-2 rounded border border-slate-700 col-span-2 sm:col-span-3 flex flex-col justify-center items-center">
                            <div class="text-xs text-slate-400">Overland Travel</div>
                            <div class="text-sm font-bold text-amber-400">Ocean crossing / Flight required</div>
                        </div>
                    \`;

                    // Conditionally render links. Don't suggest Gasbuddy to someone in Hawaii looking to go to DC.
                    let linksHtml = isDrivable ? \`
                        <a href="https://www.google.com/maps/dir/?api=1&origin=\${userLat},\${userLon}&destination=Washington,+DC" target="_blank" class="flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 transition">
                            <span>🚗 Driving Route & Gas Stops</span>
                            <span class="text-xs text-slate-400">Google Maps ↗</span>
                        </a>
                        <a href="https://www.gasbuddy.com/tripcostcalculator" target="_blank" class="flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 transition">
                            <span>⛽ Exact Gas Calculator</span>
                            <span class="text-xs text-slate-400">GasBuddy ↗</span>
                        </a>
                        <a href="https://www.google.com/travel/flights?q=flights+from+\${encodeURIComponent(formattedName)}+to+Washington+DC+on+\${flightDateStr}" target="_blank" class="flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 transition">
                            <span>✈️ Flight Search (\${flightDateStr})</span>
                            <span class="text-xs text-slate-400">Google Flights ↗</span>
                        </a>
                        <a href="https://www.rome2rio.com/s/\${encodeURIComponent(formattedName)}/Washington-DC" target="_blank" class="flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 transition">
                            <span>🚌 Check Buses & Trains</span>
                            <span class="text-xs text-slate-400">Rome2Rio ↗</span>
                        </a>
                        <a href="https://www.google.com/maps/dir/?api=1&origin=\${userLat},\${userLon}&destination=Washington,+DC&travelmode=transit" target="_blank" class="flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 transition">
                            <span>🚆 Public Transit Routing</span>
                            <span class="text-xs text-slate-400">Google Maps ↗</span>
                        </a>
                        <a href="\${clRideshare}" target="_blank" class="flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 transition">
                            <span>🤝 Local Rideshares (\${clSubdomain})</span>
                            <span class="text-xs text-slate-400">Craigslist ↗</span>
                        </a>
                    \` : \`
                        <a href="https://www.google.com/travel/flights?q=flights+from+\${encodeURIComponent(formattedName)}+to+Washington+DC+on+\${flightDateStr}" target="_blank" class="flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 transition">
                            <span>✈️ Flight Search (\${flightDateStr})</span>
                            <span class="text-xs text-slate-400">Google Flights ↗</span>
                        </a>
                        <a href="https://www.rome2rio.com/s/\${encodeURIComponent(formattedName)}/Washington-DC" target="_blank" class="flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 transition">
                            <span>🗺️ Public Transport & Flights</span>
                            <span class="text-xs text-slate-400">Rome2Rio ↗</span>
                        </a>
                    \`;

                    resultsDiv.innerHTML = \`
                        <div class="p-5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl space-y-4">
                            <div class="flex items-center justify-between border-b border-emerald-800/50 pb-3">
                                <div>
                                    <h3 class="text-xl font-bold text-emerald-400">Route Feasible: Washington, DC</h3>
                                    <p class="text-xs text-slate-300">Origin: <strong>\${formattedName}</strong> \${isDrivable ? '('+Math.round(dcMiles)+' miles to DC)' : ''}</p>
                                </div>
                                <span class="px-3 py-1 bg-emerald-500/20 text-emerald-300 font-mono text-xs rounded-full font-bold">Time Available</span>
                            </div>

                            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center my-2">
                                \${statsHtml}
                                <div class="bg-slate-800/80 p-2 rounded border border-slate-700">
                                    <div class="text-xs text-slate-400">Time Window</div>
                                    <div class="text-lg font-bold font-mono text-blue-400">\${Math.round(hoursLeftToDeadline)} hrs left</div>
                                </div>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm font-semibold pt-2">
                                \${linksHtml}
                            </div>
                        </div>
                    \`;
                } else {
                    const capital = userState && STATE_CAPITALS[userState] ? STATE_CAPITALS[userState] : STATE_CAPITALS["VA"];
                    const capMiles = calculateRoadDistance(userLat, userLon, capital.lat, capital.lon);
                    const capDriveHours = Math.round((capMiles / 62) * 10) / 10;

                    if (hoursLeftToDeadline >= capDriveHours) {
                        resultsDiv.innerHTML = \`
                            <div class="p-5 bg-amber-950/60 border border-amber-500/40 rounded-xl space-y-4">
                                <div>
                                    <h3 class="text-xl font-bold text-amber-400">Not Enough Time for DC — Head to Your State Capital</h3>
                                    <p class="text-xs text-slate-300">Getting to DC requires <strong>\${totalJourneyHours} hrs</strong> (including transit/rest), but only <strong>\${Math.round(hoursLeftToDeadline)} hrs</strong> remain. Mobilize at <strong>\${capital.name}</strong> instead.</p>
                                </div>

                                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center my-2">
                                    <div class="bg-slate-800/80 p-2 rounded border border-slate-700">
                                        <div class="text-xs text-slate-400">Distance</div>
                                        <div class="text-lg font-bold font-mono">\${capMiles} miles</div>
                                    </div>
                                    <div class="bg-slate-800/80 p-2 rounded border border-slate-700">
                                        <div class="text-xs text-slate-400">Capital Drive Time</div>
                                        <div class="text-lg font-bold font-mono">\${capDriveHours} hrs</div>
                                    </div>
                                    <div class="bg-slate-800/80 p-2 rounded border border-slate-700">
                                        <div class="text-xs text-slate-400">Est. Gas</div>
                                        <div class="text-lg font-bold font-mono text-amber-400">\$\${Math.round((capMiles/25)*${gaspergallon})}</div>
                                    </div>
                                </div>

                                <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm font-semibold pt-2">
                                    <a href="https://www.google.com/maps/dir/?api=1&origin=\${userLat},\${userLon}&destination=\${encodeURIComponent(capital.name)}" target="_blank" class="flex items-center justify-between p-3 bg-amber-600 hover:bg-amber-500 text-slate-900 font-bold rounded transition">
                                        <span>🏛️ Directions to \${capital.name}</span>
                                        <span class="text-xs opacity-75">Google Maps ↗</span>
                                    </a>
                                    <a href="\${clRideshare}" target="_blank" class="flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 transition border border-slate-700">
                                        <span>🤝 Local Rideshares (\${clSubdomain})</span>
                                        <span class="text-xs text-slate-400">Craigslist ↗</span>
                                    </a>
                                </div>
                            </div>
                        \`;
                    } else {
                        resultsDiv.innerHTML = \`
                            <div class="p-5 bg-red-950/60 border border-red-500/40 rounded-xl space-y-4">
                                <div>
                                    <h3 class="text-xl font-bold text-red-400">Insufficient Travel Time — Organize Locally</h3>
                                    <p class="text-xs text-slate-300">You cannot safely reach DC or \${capital.name} before September 22. Focus efforts on economic action and local non-cooperation.</p>
                                </div>

                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                    <a href="https://workerorganizing.org/resources/" target="_blank" class="p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-left transition">
                                        <div class="font-bold text-red-400">✊ Workplace & Strike Action Guide</div>
                                        <div class="text-xs text-slate-400 mt-1">Emergency workplace organizing resources & legal protections via EWOC.</div>
                                    </a>
                                    <a href="https://www.industrialworkers.org/" target="_blank" class="p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-left transition">
                                        <div class="font-bold text-red-400">🚫 National Boycott Directory</div>
                                        <div class="text-xs text-slate-400 mt-1">Coordinated consumer actions and strategic local economic withholding.</div>
                                    </a>
                                </div>
                            </div>
                        \`;
                    }
                }

            } catch (err) {
                resultsDiv.innerHTML = \`<div class="p-4 bg-red-900/50 border border-red-500 text-red-200 text-sm rounded-lg">\${err.message || "Calculation failed."}</div>\`;
            } finally {
                btn.disabled = false;
                btn.innerHTML = 'Calculate Trip';
                resultsDiv.classList.remove('hidden');
            }
        });
    </script>
</body>
</html>
    `;

    return new Response(html, {
      headers: { "content-type": "text/html;charset=UTF-8" },
    });
  },
};
