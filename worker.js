export default {
  async fetch(request, env, ctx) {
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
        }
        .hero-text {
            font-size: clamp(3rem, 10vw, 8rem);
            line-height: 1.1;
        }
        .glass-panel {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
    </style>
</head>
<body class="min-h-screen flex flex-col items-center justify-center p-4 text-center">

    <main class="w-full max-w-4xl mx-auto flex flex-col items-center gap-8">
        
        <!-- HERO COUNTDOWN -->
        <div class="flex flex-col items-center">
            <h1 class="text-xl md:text-3xl font-bold text-slate-400 uppercase tracking-widest mb-2">Time until September 22</h1>
            <div id="countdown" class="hero-text font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 font-mono drop-shadow-lg">
                00:00:00:00
            </div>
            <div class="flex gap-4 md:gap-12 text-xs md:text-sm font-bold text-slate-500 uppercase mt-2 w-full justify-center px-4">
                <span>Days</span>
                <span>Hours</span>
                <span>Minutes</span>
                <span>Seconds</span>
            </div>
        </div>

        <!-- ACTION SECTION -->
        <div class="glass-panel w-full max-w-2xl rounded-2xl p-6 md:p-10 mt-8 shadow-2xl">
            <h2 class="text-3xl md:text-4xl font-bold mb-6">How are you getting to DC?</h2>
            
            <form id="travel-form" class="flex flex-col sm:flex-row gap-3 w-full">
                <input 
                    type="text" 
                    id="location" 
                    placeholder="Enter your city & state (e.g., Chicago, IL)" 
                    required
                    class="flex-1 px-4 py-3 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                <button type="submit" class="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors">
                    Check Options
                </button>
            </form>

            <!-- DYNAMIC RESULTS -->
            <div id="results" class="mt-8 text-left hidden flex-col gap-4 transition-all"></div>
        </div>
    </main>

    <script>
        // Set target date dynamically to the upcoming Sept 22
        const getNextSept22 = () => {
            const now = new Date();
            let year = now.getFullYear();
            let target = new Date(year, 8, 22, 0, 0, 0); // Month is 0-indexed (8 = Sept)
            if (now > target) {
                target = new Date(year + 1, 8, 22, 0, 0, 0);
            }
            return target.getTime();
        };

        const targetDate = getNextSept22();

        // Update countdown every second
        const countdownEl = document.getElementById('countdown');
        
        function updateCountdown() {
            const now = new Date().getTime();
            const distance = targetDate - now;

            if (distance < 0) {
                countdownEl.innerHTML = "THE TIME IS NOW";
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            // Pad with leading zeros
            const d = String(days).padStart(2, '0');
            const h = String(hours).padStart(2, '0');
            const m = String(minutes).padStart(2, '0');
            const s = String(seconds).padStart(2, '0');

            countdownEl.innerHTML = \`\${d}:\${h}:\${m}:\${s}\`;
        }

        setInterval(updateCountdown, 1000);
        updateCountdown();

        // Handle Form Submission and Travel Logic
        document.getElementById('travel-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const location = document.getElementById('location').value.trim();
            const encodedLocation = encodeURIComponent(location);
            const resultsDiv = document.getElementById('results');
            
            const now = new Date().getTime();
            const hoursLeft = (targetDate - now) / (1000 * 60 * 60);

            let htmlContent = '';

            // LOGIC: 
            // > 48 hours: Plenty of time for DC
            // 12 - 48 hours: Not enough time for DC, head to State Capital
            // < 12 hours: Not enough time to travel safely, strike/boycott
            
            if (hoursLeft > 48) {
                htmlContent = \`
                    <div class="p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-lg">
                        <h3 class="text-xl font-bold text-emerald-400 mb-2">There's still time to get to DC!</h3>
                        <p class="text-sm text-slate-300 mb-4">Check your travel options from <strong>\${location}</strong> below:</p>
                        
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <a href="https://www.google.com/travel/flights?q=flights+from+\${encodedLocation}+to+Washington+DC" target="_blank" class="flex items-center gap-2 p-3 bg-slate-800 rounded hover:bg-slate-700 transition">
                                ✈️ Check Flights
                            </a>
                            <a href="https://www.google.com/maps/dir/?api=1&origin=\${encodedLocation}&destination=Washington,+DC" target="_blank" class="flex items-center gap-2 p-3 bg-slate-800 rounded hover:bg-slate-700 transition">
                                🚗 Estimate Drive & Gas
                            </a>
                            <a href="https://www.amtrak.com" target="_blank" class="flex items-center gap-2 p-3 bg-slate-800 rounded hover:bg-slate-700 transition">
                                🚆 Check Trains (Amtrak)
                            </a>
                            <a href="https://www.greyhound.com" target="_blank" class="flex items-center gap-2 p-3 bg-slate-800 rounded hover:bg-slate-700 transition">
                                🚌 Check Buses
                            </a>
                        </div>
                    </div>
                \`;
            } else if (hoursLeft > 12) {
                htmlContent = \`
                    <div class="p-4 bg-amber-500/20 border border-amber-500/50 rounded-lg">
                        <h3 class="text-xl font-bold text-amber-400 mb-2">Time is running short for DC!</h3>
                        <p class="text-sm text-slate-300 mb-4">There might not be enough time to safely make it to the nation's capital. Head to your state capital instead!</p>
                        
                        <div class="flex flex-col gap-3">
                            <a href="https://www.google.com/maps/search/state+capital+near+\${encodedLocation}" target="_blank" class="flex items-center justify-center gap-2 p-4 bg-slate-800 rounded hover:bg-slate-700 transition text-center font-bold">
                                🏛️ Route to your State Capital
                            </a>
                        </div>
                    </div>
                \`;
            } else {
                htmlContent = \`
                    <div class="p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                        <h3 class="text-xl font-bold text-red-400 mb-2">Time is up for long-distance travel.</h3>
                        <p class="text-sm text-slate-300 mb-4">If you can't make it to a capital in time, you can still make an impact exactly where you are.</p>
                        
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <a href="https://en.wikipedia.org/wiki/Strike_action" target="_blank" class="flex items-center justify-center gap-2 p-3 bg-slate-800 rounded hover:bg-slate-700 transition font-bold">
                                ✊ Learn about Strikes
                            </a>
                            <a href="https://en.wikipedia.org/wiki/Boycott" target="_blank" class="flex items-center justify-center gap-2 p-3 bg-slate-800 rounded hover:bg-slate-700 transition font-bold">
                                🚫 Learn about Boycotts
                            </a>
                        </div>
                    </div>
                \`;
            }

            resultsDiv.innerHTML = htmlContent;
            resultsDiv.classList.remove('hidden');
            resultsDiv.classList.add('flex');
        });
    </script>
</body>
</html>
    `;

    return new Response(html, {
      headers: {
        "content-type": "text/html;charset=UTF-8",
      },
    });
  },
};
