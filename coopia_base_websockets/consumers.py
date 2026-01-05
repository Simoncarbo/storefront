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

        # Send process information to the user on connect
        async_to_sync(self.coopia_process.send_process_info)(self.channel_name)
        
        if self.coopia_process.is_running:
            # Send current cycle information to the user on connect
            async_to_sync(self.coopia_process.send_cycle_info)(self.channel_name)

            # if in phase 2, send random ideas to compare to the newly connected user
            if self.coopia_process.current_cycle_phase == 'phase2':
                async_to_sync(self.coopia_process.send_random_ideas_to_compare)(self.channel_name)

    def disconnect(self, close_code):
        # Leave room group
        async_to_sync(self.channel_layer.group_discard)(
            self.room_group_name, self.channel_name
        )

        self.update_participant_count()
    
    def update_participant_count(self):
        # don't do anything if there's no one in the group anymore
        group = self.channel_layer.groups.get(self.room_group_name)
        if not group:
            return
        # update number of members in the group
        participants = list(group.keys())
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
        if text_data_json.get("type") == "idea":
            idea = text_data_json["idea"]
            async_to_sync(self.coopia_process.add_idea)(idea)

        # client sending binary preference between two ideas
        if text_data_json.get("type") == "preference":
            # expected payload: {"type":"preference", "winner": "...", "loser":"..."}
            winner = text_data_json.get("winner")
            loser = text_data_json.get("loser")
            if winner and loser:
                async_to_sync(self.coopia_process.register_preference)(winner, loser)
                async_to_sync(self.coopia_process.send_random_ideas_to_compare)(self.channel_name)
        
    def send_participant_count(self, event):
        event["type"] = "participant_count"
        self.send(text_data=json.dumps(event))
    
    def send_process_info(self, event):
        """
        Handler for process info sent to individual user.
        """
        event["type"] = "process_info"
        self.send(text_data=json.dumps(event))
        
    def send_cycle_info(self, event):
        """
        Handler for cycle information broadcasts from the process.
        """
        event["type"] = "cycle_info"
        self.send(text_data=json.dumps(event))

    def send_ideas(self, event):
        event["type"] = "ideas"

        # Send message to WebSocket
        self.send(text_data=json.dumps(event))

    def send_cycle_result(self, event):
        event["type"] = "cycle_result"

        # Send message to WebSocket
        self.send(text_data=json.dumps(event))


    