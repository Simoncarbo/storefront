# chat/consumers.py
import json

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
from channels.layers import get_channel_layer
import random


class ChatConsumer(WebsocketConsumer):
    def connect(self):
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = f"chat_{self.room_name}"

        # Join room group
        async_to_sync(self.channel_layer.group_add)(
            self.room_group_name, self.channel_name
        )

        # Add coopia process to group if not already present
        async_to_sync(self.channel_layer.add_coopia_process_to_group)(
            self.room_group_name)
        self.coopia_process = self.channel_layer.coopia_processes[self.room_group_name]

        self.accept()

    def disconnect(self, close_code):
        # Leave room group
        async_to_sync(self.channel_layer.group_discard)(
            self.room_group_name, self.channel_name
        )

    # Receive message from WebSocket
    def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json["message"]
        excluded_participants = text_data_json.get("excluded_participants", []) # default value: []

        self.coopia_process.promote_idea(excluded_participants+[self.channel_name], message)

    
    def send_promoted_idea(self, event):
        event["type"] = "promoted_idea"

        # Send message to WebSocket
        self.send(text_data=json.dumps(event))

    # Receive message from room group
    def common_message(self, event):
        event["type"] = "common"

        # Send message to WebSocket
        self.send(text_data=json.dumps(event))