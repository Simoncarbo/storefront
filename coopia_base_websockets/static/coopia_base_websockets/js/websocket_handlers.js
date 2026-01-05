import { CycleTimer } from './cycle_timer.js';

let cycleTimer = null;

let phase1_max_actions = 0;
let phase2_max_actions = 0;
let last_reported_phase = null;


export async function CoopiaSocketOnMessage(e, ideasManager, ProcessResultDisplay,voteButton, overlay) {
    const data = JSON.parse(e.data);

    if (data.type === 'process_info') {
        // data.results is expected to be an array of cycle results
        if (Array.isArray(data.results)) {
            for (let result of data.results) {
                ProcessResultDisplay.appendMessage(result);
            }
        }

        // if process is not running: show process start time to user
        if (!data.is_running) {
            return;
            // const startTime = data.start_time ? new Date(data.start_time) : null;
            // if (startTime) {
            //     const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
            //     const formattedTime = startTime.toLocaleDateString(undefined, options);
            //     overlay.showMessage(`Le processus n'a pas encore démarré. Démarrage prévu le : ${formattedTime}`);
            // } else {
            //     overlay.showMessage(`Le processus n'a pas encore démarré. La date et l'heure de démarrage ne sont pas encore définis.`);}
            }

    } else if (data.type === 'cycle_info') {
        // Update phase max actions from data
        phase1_max_actions = data.phase1_max_actions || 0;
        phase2_max_actions = data.phase2_max_actions || 0;

        // compute start timestamp (ms since epoch) from elapsed seconds (if provided)
        const elapsedSeconds = Number(data.cycle_elapsed_time) || 0;
        const startTs = Date.now() - (elapsedSeconds * 1000);
 
        if (!cycleTimer) {
            cycleTimer = new CycleTimer(data.phase1_duration, data.phase2_duration, '#timer-container');
            cycleTimer.mount('#timer-container');
        } else {
            cycleTimer.setDurations(data.phase1_duration, data.phase2_duration);
        }
        // start (or restart) timer using derived start timestamp so progress reflects elapsed time
        cycleTimer.start(startTs);

        if (data.cycle_phase === 'phase1') {
            ideasManager.reset(true);
            voteButton.setVoteButtonText('Envoyer');
            voteButton.reset(phase1_max_actions);
            last_reported_phase = 'phase1';
            ideasManager.addInput('', true, true, true);
        }

        return;
    } else if (data.type === 'cycle_result') {
        ProcessResultDisplay.appendMessage(data.message);
    } else if (data.type === 'participant_count') {
        // Update the participant count display
        const countDiv = document.getElementById('participant-count');
        if (countDiv) {
            countDiv.textContent = `Nombre de scribes : ${data.count}`;
        }
        return;
    } else if (data.type === 'ideas') {
        if (last_reported_phase !== 'phase2') {
            voteButton.setVoteButtonText('Envoyer préférence');
            voteButton.reset(phase2_max_actions);
        }

        // data.ideas is expected to be an array of ideas
        if (Array.isArray(data.ideas)) {
            ideasManager.reset(true);
            for (let idea of data.ideas) {
                ideasManager.addInput(idea);
            }
        }

        last_reported_phase = 'phase2';
    } else {
        console.error('Unknown message type:', data.type);
    }
};