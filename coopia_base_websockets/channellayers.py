from channels.layers import InMemoryChannelLayer
from channels.exceptions import ChannelFull
import random
import asyncio
import time
import datetime

from coopia_base_websockets.coopia_process import CoopiaProcess


class ChannelLayerForCoopiaProcess(InMemoryChannelLayer):
    """
    Custom Channel Layer that extends the InMemoryChannelLayer to add
    additional functionality or override existing methods.

    This class is used to manage the Coopia processes for each group.
    Current design choice: one Coopia process per group.

    Added functionality: random_send method to send a message to a random channel in the group.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.coopia_processes = {}  # Dictionary to hold groups and their coopia processes

    async def add_coopia_process_to_group(self, group_name):
        """
        Adds a coopia process to a group.
        """
        # Check the inputs
        #self.require_valid_group_name(group_name)
        if group_name in self.coopia_processes:
            return  # process already created for this group
        else:
            coopia_process = CoopiaProcess(group_name)
            # Add to group dict
            self.coopia_processes[group_name] = coopia_process

    async def discard_coopia_process(self, group_name):
        # to be implemented
        pass


    async def random_send(self, group, excluded_participants, message):
        """
        Send a message to a random channel in the group.

        excluded_participants: list of channel_names to exclude from the random choice
        """
        # Check types
        assert isinstance(message, dict), "Message is not a dict"

        # commenté car genere erreur (sans doute une question de version)
        # self.require_valid_group_name(group)

        # Run clean
        self._clean_expired()

        # Get all channels in the group
        channel_names = list(self.groups[group].keys())
        # Remove excluded participants
        channel_names = [name for name in channel_names if name not in excluded_participants]

        # Ensure there are channels left to choose from
        if not channel_names:
            return #raise ValueError("No available channels to send the message.")

        # Choose a random channel        
        channel_name = random.choice(channel_names)

        # Send the message to the chosen channel
        ops = [asyncio.create_task(self.send(channel_name, message))]

        for send_result in asyncio.as_completed(ops):
            try:
                await send_result
            except ChannelFull:
                pass

                