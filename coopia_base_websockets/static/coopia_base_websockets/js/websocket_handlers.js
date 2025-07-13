export function CoopiaSocketOnMessage(e, CoopiaSocket, IdeasManager, chatLogCommon) {
    const data = JSON.parse(e.data);

    if (data.type === 'common') {
        chatLogCommon.appendMessage(data.message);
    } else if (data.type === 'promoted_idea') {
        // Check if the idea is already present
        if (!IdeasManager.isIdeaPresent(data.message)) {
            IdeasManager.addInput(data.message)
        }
    } else {
        console.error('Unknown message type:', data.type);
    }
};