class VoteProcess:
    def __init__(self):
        self.votes = {}
        self.ideas = []

    def start_voting(self, ideas):
        self.ideas = ideas
        self.votes = {idea: 0 for idea in ideas}

    def receive_vote(self, idea):
        if idea in self.votes:
            self.votes[idea] += 1

    def get_random_idea(self):
        if not self.ideas:
            return None
        total_votes = sum(self.votes.values())
        if total_votes == 0:
            return None
        random_choice = random.randint(1, total_votes)
        cumulative_votes = 0
        for idea, count in self.votes.items():
            cumulative_votes += count
            if cumulative_votes >= random_choice:
                return idea
        return None