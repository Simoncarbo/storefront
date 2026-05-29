# chat/consumers.py
import time
import json
import asyncio

from channels.generic.websocket import AsyncWebsocketConsumer


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = f"{self.room_name}"

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name, self.channel_name
        )

        # Subscribe to unreliable pubsub for participant count updates
        self.pubsub = await self.channel_layer.subscribe_unreliable_group(self.room_group_name)
        self.listen_task = asyncio.create_task(self.listen_to_pubsub())

        await self.accept()

        # Update participant count on connect
        await self.channel_layer.update_participant_count(self.room_group_name)

        # Send process information to the user on connect
        # utile pour envoyer les résultats précédents, mais pas encore implémenté
        # await self.send_process_info()

        # if running?
        await self.send_cycle_state(on_connect = True)

    async def disconnect(self, close_code):
        # Cancel the listen task
        if self.listen_task:
            self.listen_task.cancel()
            try:
                await self.listen_task
            except asyncio.CancelledError:
                pass

        # Close pubsub
        if self.pubsub:
            await self.pubsub.unsubscribe()
            await self.pubsub.close()

        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name, self.channel_name
        )

        # Update participant count on disconnect
        await self.channel_layer.update_participant_count(self.room_group_name)
  

    # Receive message from WebSocket
    async def receive(self, text_data):
        if text_data == 'ping':
            return
        text_data_json = json.loads(text_data)
        if text_data_json.get("type") == "idea":
            idea = text_data_json["idea"]
            await self.channel_layer.add_idea(self.room_group_name,idea)

        # client sending binary preference between two ideas
        if text_data_json.get("type") == "preference":
            # expected payload: {"type":"preference", "winner": "...", "loser":"..."}
            winner = text_data_json.get("winner")
            loser = text_data_json.get("loser")
            if winner and loser:
                await self.channel_layer.register_preference(self.room_group_name, winner, loser)
                await self.send_random_ideas() 
        
    async def send_participant_count(self, event):
        event["type"] = "participant_count"
        await self.send(text_data=json.dumps(event))
    
    async def send_process_info(self, event):
        """
        Handler for process info sent to individual user.
        """
        event["type"] = "process_info"
        await self.send(text_data=json.dumps(event))
        
    async def send_cycle_state(self, event = {}, on_connect = False):
        """
        Handler for cycle information broadcasts from the process.
        """
        event["type"] = "cycle_state"
        # Use numeric epoch seconds so clients can compute elapsed time reliably
        event["current_time"] = time.time()

        cycle_state = await self.channel_layer.get_cycle_state(self.room_group_name)
        if not cycle_state:
            # If cycle state is missing, send a minimal state so clients don't crash
            await self.send(text_data=json.dumps(event))
            return
        event.update(cycle_state)

        await self.send(text_data=json.dumps(event))

        # if first selection phase, send random ideas to compare
        if (cycle_state['current_phase'] == 'selection') and (on_connect or (cycle_state['nb_selections_done']==0)):
            await self.send_random_ideas()        

    async def send_random_ideas(self, event = {}):
        event["type"] = "ideas"
        event["ideas"] = await self.channel_layer.get_random_ideas(self.room_group_name, 2)
        # Send message to WebSocket
        await self.send(text_data=json.dumps(event))

    async def send_cycle_result(self, event):
        event["type"] = "cycle_result"

        # Send message to WebSocket
        await self.send(text_data=json.dumps(event))

    async def listen_to_pubsub(self):
        try:
            async for message in self.channel_layer.listen_unreliable(self.pubsub):
                if message.get("type") == "send.participant.count":
                    await self.send_participant_count({"count": message["count"]})
        except asyncio.CancelledError:
            pass

    ## a définir: send_loop_state, send_cycle_state, send_cycle_params
