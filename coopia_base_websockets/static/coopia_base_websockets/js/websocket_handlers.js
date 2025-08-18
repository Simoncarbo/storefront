export async function CoopiaSocketOnMessage(e, CoopiaSocket, ideasManager, chatLogCommon,voteButton, overlay) {
    const data = JSON.parse(e.data);

    if (data.type === 'common_init') {
        chatLogCommon.setContent(data.result);
        ideasManager.reset(); // pour avoir les prefix adéquats
    } else if (data.type === 'common') {
        voteButton.updateVoteStatus('tirage');
        // sleep for 3 seconds to simulate processing
        await new Promise(resolve => setTimeout(resolve, data.simulated_processing_time *1000));
        chatLogCommon.appendMessage(data.message);
        voteButton.setVoteButtonText('Envoyer l\'idée pour l\'étape d\'inspiration');
        voteButton.reset();
        if (data.message!== '') {
            // await overlay.showWithPhases('decision');
            ideasManager.reset()
        }
    } else if (data.type === 'participant_count') {
        // Update the participant count display
        const countDiv = document.getElementById('participant-count');
        if (countDiv) {
            countDiv.textContent = `Nombre de scribes : ${data.count}`;
        }
        return;
    } else if (data.type === 'vote_percentage') {
        // Update the participant count display
        const countDiv = document.getElementById('vote_percentage');
        if (countDiv) {
            countDiv.textContent = ` (${data.vote_percentage}%)`;
        }
        return;
    } else if (data.type === 'idea_diffusion') {
        // data.ideas is expected to be an array of ideas
        let ideas_added = 0;
        if (Array.isArray(data.ideas)) {
            for (let idea of data.ideas) {
                if (!ideasManager.isIdeaPresent(idea)) {
                    ideasManager.addInput(idea);
                    ideas_added++;
                }
                if (ideas_added === 2) {
                    break; // Stop after adding two ideas
                }
            }
        }
        voteButton.setVoteButtonText('Envoyer l\'idée pour le tirage au sort');
        voteButton.reset();
    } else {
        console.error('Unknown message type:', data.type);
    }
};