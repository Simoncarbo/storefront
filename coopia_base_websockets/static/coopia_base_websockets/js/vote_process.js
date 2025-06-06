// Countdown function
export function startCountdown(durationSeconds) {
    // Timer variables
    const countdownElement = document.getElementById('round-countdown');

    let countdownInterval = null;
    let countdownEndTime = Date.now() + durationSeconds * 1000;

    function updateCountdown() {
        const now = Date.now();
        let remaining = Math.max(0, Math.round((countdownEndTime - now) / 1000));

        // Format as mm:ss
        const min = Math.floor(remaining / 60);
        const sec = remaining % 60;
        const formatted = `${min}:${sec.toString().padStart(2, '0')}`;

        if (remaining > 10) {
            // Only update every 10 seconds
            if (remaining % 10 === 0 || remaining === durationSeconds) {
                countdownElement.innerHTML = `<span class="text-gray-700">Temps restant: ${formatted}</span>`;
                countdownElement.className = "mb-4 text-lg font-semibold text-gray-700 text-right";
            }
        } else {
            // Update every second, in red
            countdownElement.innerHTML = `<span class="text-red-500 font-bold animate-pulse">Temps restant: ${formatted}</span>`;
            countdownElement.className = "mb-4 text-lg font-semibold text-red-500 text-right";
        }

        if (remaining <= 0) {
            clearInterval(countdownInterval);
        }
    }

    // First update immediately
    updateCountdown();

    // Always update every second, but only change display every 10s if >10s left
    countdownInterval = setInterval(updateCountdown, 1000);
}