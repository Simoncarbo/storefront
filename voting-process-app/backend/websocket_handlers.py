from channels.generic.websocket import AsyncWebsocketConsumer
import json
import random

class VoteConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'vote_{self.room_name}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        if data['type'] == 'vote':
            await self.handle_vote(data)

    async def handle_vote(self, data):
        # Process the vote and send the updated results to the group
        vote = data['vote']
        # Here you would typically store the vote and determine the current state
        # For simplicity, we will just echo the vote back to the group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'vote_message',
                'vote': vote
            }
        )

    async def vote_message(self, event):
        vote = event['vote']
        # Send the vote message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'vote',
            'vote': vote
        }))