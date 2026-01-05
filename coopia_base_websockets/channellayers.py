from channels.layers import InMemoryChannelLayer
from channels_redis.core import RedisChannelLayer
from channels.exceptions import ChannelFull
import random
import asyncio
import time
import datetime

from coopia_base_websockets.coopia_process import CoopiaProcess


class ChannelLayerForCoopiaProcess(InMemoryChannelLayer):
# class ChannelLayerForCoopiaProcess(RedisChannelLayer):
    """
    This class is used to connect the Coopia processes for each group.
    Current design choice: one Coopia process per group.
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
            # if not self.coopia_processes[group_name].is_running:
            #     # If the process is not running, we can start it
            #     await self.coopia_processes[group_name].start()
            return  # process already created for this group
        else:
            coopia_process = CoopiaProcess(group_name)
            # Add to group dict
            self.coopia_processes[group_name] = coopia_process
        
        # await self.coopia_processes[group_name].start()

    async def discard_coopia_process(self, group_name):
        # to be implemented
        pass