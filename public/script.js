document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('start-button');
    const consoleOutput = document.getElementById('console-output');

    // Helper function to add styled logs to our fake console
    const log = (message, type = 'info') => {
        const p = document.createElement('p');
        p.textContent = `> ${message}`;
        p.className = `log-${type}`;
        consoleOutput.appendChild(p);
        // Auto-scroll to the bottom
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    };

    startButton.addEventListener('click', async () => {
        // Disable button and clear console on start
        startButton.disabled = true;
        startButton.textContent = 'Processing...';
        consoleOutput.innerHTML = '';

        log('Manual trigger initiated...');
        log('Calling backend function at /api/server-fetch...');
        log('This may take a moment...');

        try {
            const response = await fetch('/api/server-fetch');
            const resultText = await response.text();

            if (!response.ok) {
                // If the server returned an error status (like 500)
                throw new Error(`Server responded with ${response.status}: ${resultText}`);
            }
            
            // The function was successful
            log('Backend function responded.', 'success');
            log(resultText, 'success');

        } catch (error) {
            // Catches network errors or the error thrown above
            console.error("Fetch Error:", error);
            log('An error occurred.', 'error');
            log(error.message, 'error');
        } finally {
            // Re-enable the button when done
            startButton.disabled = false;
            startButton.textContent = 'Start Fetch Cycle';
            log('Process finished.');
        }
    });
});