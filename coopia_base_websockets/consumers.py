# chat/consumers.py
import json

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer


class ChatConsumer(WebsocketConsumer):
    def connect(self):
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = f"{self.room_name}"

        # Join room group
        async_to_sync(self.channel_layer.group_add)(
            self.room_group_name, self.channel_name
        )

        # Add coopia process to group if not already present
        async_to_sync(self.channel_layer.add_coopia_process_to_group)(
            self.room_group_name)
        self.coopia_process = self.channel_layer.coopia_processes[self.room_group_name]

        self.accept()
        self.update_participant_count()

        # send self.coopia_process.result to the user
        if self.coopia_process.result!='':
            self.send(text_data=json.dumps({
                "type": "common_init",
                "result": self.coopia_process.result
            }))

    def disconnect(self, close_code):
        # Leave room group
        async_to_sync(self.channel_layer.group_discard)(
            self.room_group_name, self.channel_name
        )

        self.update_participant_count()
    
    def update_participant_count(self):
        # don't do anything if there's no one in the group anymore
        if self.channel_layer.groups[self.room_group_name] is None:
            return
        # update number of members in the group
        participants = list(self.channel_layer.groups[self.room_group_name].keys())
        # send info to the users
        async_to_sync(self.channel_layer.group_send)(self.room_group_name,
        {
            "type": "send.participant.count",
            "count": len(participants)
        })

    # Receive message from WebSocket
    def receive(self, text_data):
        if text_data == 'ping':
            return
        text_data_json = json.loads(text_data)
        if text_data_json.get("type") == "vote":
            idea = text_data_json["idea"]
            async_to_sync(self.coopia_process.add_idea)(self.channel_name,idea)

    def send_participant_count(self, event):
        event["type"] = "participant_count"
        self.send(text_data=json.dumps(event))
    
    def send_vote_percentage(self, event):
        event["type"] = "vote_percentage"
        self.send(text_data=json.dumps(event))

    def send_diffused_ideas(self, event):
        event["type"] = "idea_diffusion"

        # Send message to WebSocket
        self.send(text_data=json.dumps(event))

    # Receive message from room group
    def send_result(self, event):
        event["type"] = "common"

        # Send message to WebSocket
        self.send(text_data=json.dumps(event))


    