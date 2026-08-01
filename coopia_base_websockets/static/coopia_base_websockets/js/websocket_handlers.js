// import { CycleTimer } from './cycle_timer.js';

// let cycleTimer = null;

let generation_max_actions = 3;
let selection_max_actions = 5;
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

    } else if (data.type === 'cycle_state') {
        // Update phase max actions from data
        // generation_max_actions = data.generation_max_actions || 0;
        // selection_max_actions = data.selection_max_actions || 0;

        // compute start timestamp (ms since epoch) from elapsed seconds (if provided)
        const elapsedSeconds = Number(data.current_time-data.current_phase_start_time) || 0;
        const startTs = Date.now() - (elapsedSeconds * 1000);
        const phase_duration = Number(data.current_phase_end_time-data.current_phase_start_time)
 
        // if (!cycleTimer) {
        //     // je mets phase_2_duration à 0 -> on n'aura toujours qu'une couleur dans la progress bar
        //     cycleTimer = new CycleTimer(phase_duration, 0, '#timer-container');
        //     cycleTimer.mount('#timer-container');
        // } else {
        //     cycleTimer.setDurations(phase_duration, 0);
        // }
        // // start (or restart) timer using derived start timestamp so progress reflects elapsed time
        // cycleTimer.start(startTs);
        voteButton.start_countdown(phase_duration - elapsedSeconds);

        if (data.current_phase === 'generation') {
            ideasManager.reset(true);
            // voteButton.setVoteButtonText('Envoyer');
            voteButton.reset(generation_max_actions);
            last_reported_phase = 'generation';
            ideasManager.addInput('', true, true, true);
        }

        return;
    } else if (data.type === 'cycle_result') {
        ProcessResultDisplay.appendMessage(data.message);
    } else if (data.type === 'participant_count') {
        // Update the participant count display
        const countDiv = document.getElementById('participant-count');
        if (countDiv) {
            countDiv.textContent = `Nombre de participant.e.s : ${data.count}`;
        }
        return;
    } else if (data.type === 'ideas') {
        if (last_reported_phase !== 'selection') {
            // voteButton.setVoteButtonText('Envoyer préférence');
            voteButton.reset(selection_max_actions);
        }

        // data.ideas is expected to be an array of ideas
        if (Array.isArray(data.ideas)) {
            ideasManager.reset(true);
            for (let idea of data.ideas) {
                ideasManager.addInput(idea);
            }
        }

        last_reported_phase = 'selection';
    } else {
        console.error('Unknown message type:', data.type);
    }
};