const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Given Open-Meteo hourly + daily data, return a best-visit summary object.
 */
export function computeBestTime(hourly, daily, lat = 20) {
    const result = {
        bestTimeOfDay: null,   // e.g. "Early Morning (6–9 AM)"
        timeReason: '',
        bestDays: [],          // [{label, score, weatherEmoji}]
        seasonalAdvice: '',
        overallTip: '',
    };

    // ── 1. Best time of day (from today's hourly data) ───────────────────────
    if (hourly?.temperature_2m && hourly?.uv_index && hourly?.time) {
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);
        // Find today's indices (first 24 hours matching today)
        const todayIndices = hourly.time
            .map((t, i) => ({ t, i }))
            .filter(({ t }) => t.startsWith(todayStr))
            .map(({ i }) => i);

        if (todayIndices.length > 0) {
            // Score each hour: comfort = temp in [16,28]°C, low UV
            const scored = todayIndices.map(i => {
                const temp = hourly.temperature_2m[i];
                const uv = hourly.uv_index[i] ?? 0;
                const hour = parseInt(hourly.time[i].slice(11, 13));
                // Comfort: penalise temps outside [15,30], high UV (>5 bad), night (UV=0 ok)
                const tempScore = temp >= 15 && temp <= 28 ? 10 : temp > 28 ? Math.max(0, 10 - (temp - 28) * 1.5) : Math.max(0, 10 - (15 - temp));
                const uvScore = uv <= 2 ? 10 : uv <= 5 ? 6 : uv <= 7 ? 3 : 0;
                return { hour, score: tempScore + uvScore };
            });

            // Find best 3-consecutive-hour window
            let bestStart = scored[0]?.hour ?? 6;
            let bestWindowScore = -1;
            for (let k = 0; k < scored.length - 2; k++) {
                const ws = scored[k].score + scored[k + 1].score + scored[k + 2].score;
                if (ws > bestWindowScore) { bestWindowScore = ws; bestStart = scored[k].hour; }
            }

            const end = bestStart + 3;
            const fmt = h => `${h % 12 || 12}${h < 12 ? ' AM' : ' PM'}`;
            result.bestTimeOfDay = `${fmt(bestStart)} – ${fmt(end)}`;
            if (bestStart < 9) result.timeReason = 'Cool temperatures and low UV make early mornings ideal';
            else if (bestStart >= 17) result.timeReason = 'Cooler air and lower UV after sunset hours';
            else result.timeReason = 'Comfortable temperature and moderate UV during midday';
        }
    }

    // ── 2. Best upcoming days (from 7-day daily forecast) ────────────────────
    if (daily?.time && daily?.temperature_2m_max) {
        const weatherEmoji = (code) => {
            if (!code && code !== 0) return '❓';
            if (code === 0) return '☀️';
            if (code <= 3) return '⛅';
            if (code <= 48) return '🌫️';
            if (code <= 67) return '🌧️';
            if (code <= 77) return '❄️';
            if (code <= 82) return '🌦️';
            return '⛈️';
        };

        const scored = daily.time.map((dateStr, i) => {
            const date = new Date(dateStr);
            const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : DAYS[date.getDay()];
            const maxTemp = daily.temperature_2m_max[i] ?? 25;
            const minTemp = daily.temperature_2m_min[i] ?? 15;
            const precip = daily.precipitation_sum?.[i] ?? 0;
            const wind = daily.wind_speed_10m_max?.[i] ?? 10;
            const code = daily.weathercode?.[i] ?? 0;

            // Score: ideal temp 20-28, low precip, low wind
            const midTemp = (maxTemp + minTemp) / 2;
            const tempScore = midTemp >= 18 && midTemp <= 28 ? 10 : Math.max(0, 10 - Math.abs(midTemp - 23) * 0.8);
            const precipScore = precip === 0 ? 10 : precip < 2 ? 7 : precip < 5 ? 4 : 0;
            const windScore = wind < 15 ? 10 : wind < 25 ? 6 : wind < 40 ? 3 : 0;
            const score = tempScore * 0.4 + precipScore * 0.4 + windScore * 0.2;

            return { label, date: dateStr, score, maxTemp, minTemp, precip, emoji: weatherEmoji(code) };
        });

        result.bestDays = scored
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map(d => ({
                label: d.label,
                emoji: d.emoji,
                maxTemp: Math.round(d.maxTemp),
                minTemp: Math.round(d.minTemp),
                precip: d.precip.toFixed(1),
                rating: d.score >= 8 ? 'Great' : d.score >= 5 ? 'Good' : 'Fair',
                ratingColor: d.score >= 8 ? 'text-green-500' : d.score >= 5 ? 'text-yellow-500' : 'text-orange-400',
            }));
    }

    // ── 3. Seasonal advice (based on lat & current month) ────────────────────
    const month = new Date().getMonth(); // 0-11
    const isNorthern = lat >= 0;

    const seasons = isNorthern
        ? {
            best: [2, 3, 4, 8, 9, 10],  // Mar-May, Sep-Nov
            avoid: [5, 6, 7],           // Jun-Aug (too hot/wet for tropics)
            bestMonths: 'March–May and September–November',
            avoidMonths: 'Peak summer (June–August)',
        }
        : {
            best: [8, 9, 10, 2, 3, 4],  // Sep-Nov, Mar-May (southern hemisphere reversed)
            avoid: [11, 0, 1],
            bestMonths: 'September–November and March–May',
            avoidMonths: 'December–February',
        };

    const inBestSeason = seasons.best.includes(month);
    result.seasonalAdvice = inBestSeason
        ? `✅ You're visiting in a great season! Best months: ${seasons.bestMonths}.`
        : `💡 Consider visiting during ${seasons.bestMonths} for ideal conditions. Avoid ${seasons.avoidMonths} if possible.`;

    // ── 4. Overall tip ────────────────────────────────────────────────────────
    if (result.bestDays.length > 0) {
        const best = result.bestDays[0];
        result.overallTip = `${best.label} looks like the best day — ${best.emoji} ${best.maxTemp}°C/${best.minTemp}°C, ${best.precip}mm rain.`;
    }

    return result;
}
