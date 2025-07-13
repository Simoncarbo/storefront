from channels.generic.websocket import WebsocketConsumer
import json
from .vote_process import VoteProcess

class VoteConsumer(WebsocketConsumer):
    def connect(self):
        self.accept()
        self.vote_process = VoteProcess()
        self.vote_process.start_voting()

    def disconnect(self, close_code):
        pass

    def receive(self, text_data):
        text_data_json = json.loads(text_data)
        if text_data_json.get("type") == "vote":
            idea = text_data_json["idea"]
            self.vote_process.receive_vote(idea)
            random_idea = self.vote_process.get_random_idea()
            self.send(text_data=json.dumps({
                "type": "vote_result",
                "random_idea": random_idea
            }))