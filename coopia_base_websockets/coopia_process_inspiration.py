from channels.layers import InMemoryChannelLayer
from channels.exceptions import ChannelFull
import random
import asyncio
import time


class ChannelLayerForCoopiaProcess(InMemoryChannelLayer):
    """
    Custom Channel Layer that extends the InMemoryChannelLayer to add
    additional functionality or override existing methods.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.messages = []  # Used for automatic broadcasting
        # Start the periodic task to broadcast messages every 10 seconds
        asyncio.create_task(self.periodic_broadcast())

    async def broadcast_random_message_to_all_groups(self):
        """
        Broadcast a random message from self.messages to all groups.
        """
        # Ensure there are messages to broadcast
        if not self.messages:
            return  # No messages to broadcast

        # Select a random message from the list
        message = random.choice(self.messages)

        # Check types
        assert isinstance(message, str), "Message must be a string"

        # Run clean
        self._clean_expired()

        # Add a timestamp indicating when the countdown will end (10 seconds from now)
        countdown_end_time = time.time() + 10

        # Iterate over all groups
        for group in self.groups.keys():
            # Get all channels in the group
            channels = list(self.groups[group].keys())

            # Broadcast the message to all channels in the group
            ops = [asyncio.create_task(self.send(channel, {"type": "common.message", 
                                                           "message": message,
                                                           "countdown_end_time": countdown_end_time})) for channel in channels]

            # Wait for all send operations to complete
            for send_result in asyncio.as_completed(ops):
                try:
                    await send_result
                except ChannelFull:
                    pass

    async def periodic_broadcast(self):
        """
        Periodically broadcast a random message to all groups every 10 seconds.
        """
        while True:
            try:
                await self.broadcast_random_message_to_all_groups()
            except Exception as e:
                print(f"Error during periodic broadcast: {e}")
            # Wait for 10 seconds before broadcasting again
            await asyncio.sleep(10)

    async def random_send(self, group, message):
        """
        Send a message to a random channel in the group.
        """
        # Check types
        assert isinstance(message, dict), "Message is not a dict"

        # commenté car genere erreur (sans doute une question de versiion)
        # self.require_valid_group_name(group)

        # Run clean
        self._clean_expired()

        self.messages.append(message['message'])

        # Get all channels in the group
        channels = list(self.groups[group].keys())

        # Choose a random channel
        channel = random.choice(channels)

        # Send the message to the chosen channel
        ops = [asyncio.create_task(self.send(channel, message))]

        for send_result in asyncio.as_completed(ops):
            try:
                await send_result
            except ChannelFull:
                pass

                