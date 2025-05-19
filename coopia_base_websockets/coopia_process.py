import datetime
import time
import asyncio
import random
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import pandas as pd
import uuid

from .models import CoopiaProcessInfo

class CoopiaProcess(object):
    """
    This class is used to manage the collaboration process.
    It can be extended to add more functionality as needed.
    """
    def __init__(self, group_name,
                 max_rounds = 100,
                 max_duration = 3600, # 1 hour
                 nbtrials_promote_idea = 5):
        """
        Initialize the CoopiaProcess with the given parameters.
        """

        self.group_name = group_name  # Name of the group
        self.process_id = group_name+str(datetime.datetime.now())  # Unique process ID
        # for the moment, we assume a one-to-one mapping between group and coopia process


        # Initialize any required attributes or methods here
        self.max_duration = max_duration  # Duration of each round in seconds
        self.max_rounds = max_rounds  # Number of rounds to be played

        # Maximum amount of trials to reach a participant who has not received the promoted idea yet
        self.nbtrials_promote_idea = nbtrials_promote_idea
        
        self.start_time = None  # Start time of the process
        self.end_time = None  # End time of the process

        self.current_round_index = None  # Current round number
        self.next_round_duration = None
        self.next_round_nb_idea_promotions = None
        self.rounds = pd.DataFrame(columns = ['process_id','round_index','round_start_time', 'round_end_time','nb_idea_promotions', 'round_duration', 'round_result'])

        self.is_running = False  # Flag to indicate if the process is running
        self.is_paused = False  # Flag to indicate if the process is paused
        self.is_finished = False  # Flag to indicate if the process is finished

        self.result =''  # current result of the process
        self.task_description = None


        # self.start()


    def start(self, task_description='', next_round_duration = 25, next_round_nb_idea_promotions = 4):
        """
        Start the CoopiaProcess.
        """
        self.is_running = True
        self.is_paused = False
        self.is_finished = False

        # Set the start time of the process
        self.start_time = datetime.datetime.now()
        self.max_end_time = self.start_time + datetime.timedelta(seconds=self.max_duration)

        self.task_description = task_description

        self.next_round_duration = next_round_duration
        self.next_round_nb_idea_promotions = next_round_nb_idea_promotions

        self.current_round_index = 0

        # asyncio.create_task(self.run_process())
        async_to_sync(self.run_process)()
    
    def pause(self):
        """
        Pause the CoopiaProcess.
        """
        self.is_running = True  # Keep running, but pause
        self.is_paused = True
        self.is_finished = False

    def resume(self):
        """
        Resume the CoopiaProcess.
        Starts the next round if paused.
        """
        was_paused = self.is_paused
        self.is_running = True
        self.is_paused = False
        self.is_finished = False
        # # If process was paused and run_process is not running, restart it
        # if was_paused and not getattr(self, "_run_process_task", None):
        #     self._run_process_task = async_to_sync(self.run_process)()
    
    def finish(self):
        """
        Finish the CoopiaProcess.
        """
        self.is_running = False
        self.is_paused = False
        self.is_finished = True

        self.end_time = datetime.datetime.now()

        # Save process info to the database
        try:
            CoopiaProcessInfo.objects.create(
                process_id=self.process_id,
                group_name=self.group_name,
                task_description=self.task_description,
                result=self.result,
                start_time=self.start_time,
                end_time=self.end_time,
                current_round_index=self.current_round_index
            )
        except Exception as e:
            print(f"Error saving process info: {e}")

    def set_next_round_parameters(self, next_round_duration: int, next_round_nb_idea_promotions: int):
        """
        Set the parameters for the next round.
        """
        self.next_round_duration = next_round_duration
        self.next_round_nb_idea_promotions = next_round_nb_idea_promotions

    def promote_idea(self, excluded_participants, idea):
        """
        Promote a idea by sending it to a random participant.

        excluded_participants: List of channel_names to exclude from the random selection.
        """
        if len(excluded_participants)<=self.nbtrials_promote_idea:
            # If the first 5 participants to receive the idea had it already, stop trying to send this idea
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.random_send)(
                self.group_name,excluded_participants,{"type": "send.promoted.idea", 
                                                    "message": idea, 
                                                    "excluded_participants":excluded_participants}
                )

    async def broadcast_countdown(self,end_time = None, send_every_x_seconds = 5):
        """
        NOT USED FOR THE MOMENT

        Broadcast a countdown to all participants every second until end_time.
        """
        channel_layer = get_channel_layer()

        while True:
            now = datetime.datetime.now()
            seconds_left = int((end_time - now).total_seconds())

            if seconds_left <= 0:
                break

            await channel_layer.group_send(
                self.group_name,
                {
                    "type": "send.countdown",
                    "seconds_left": seconds_left,
                }
            )

            await asyncio.sleep(send_every_x_seconds)

    async def gather_voting_from_random_participant(self):
        """
        Gather voting from one randomly selected participant.
        """
        channel_layer = get_channel_layer()
        request_id = str(uuid.uuid4())
        self._voting_futures = getattr(self, "_voting_futures", {})
        future = asyncio.get_event_loop().create_future()
        self._voting_futures[request_id] = future

        # Send request to a random participant
        await channel_layer.random_send(
            self.group_name,
            excluded_participants=[],
            message={
                "type": "send.request_vote",
                "request_id": request_id,
            }
        )

        try:
            # Wait for the participant's response (with timeout)
            result = await asyncio.wait_for(future, timeout=15)
        except asyncio.TimeoutError:
            result = None
        finally:
            del self._voting_futures[request_id]
        return result

    def receive_vote(self, request_id, value):
        """
        Called by the consumer when a participant responds to a voting request.
        """
        if hasattr(self, "_voting_futures") and request_id in self._voting_futures:
            future = self._voting_futures[request_id]
            if not future.done():
                future.set_result(value)

    async def broadcast_voting_result(self, result):
        """
        Broadcast a result to all participants.
        """
        channel_layer = get_channel_layer()
        await channel_layer.group_send(
            self.group_name,{"type": "send.result", "message": result }
            )

    async def run_process(self):
        """
        Periodically broadcast a proposal to all participants.
        """
        while self.is_running:
            # Check if the process has reached its maximum duration
            if (datetime.datetime.now() >= self.max_end_time) or (self.current_round_index >= self.max_rounds):
                self.finish()
                break

            # Run a round of the CoopiaProcess
            await self.run_round()
            self.current_round_index += 1

    async def run_round(self):
        """
        Run a single round of the CoopiaProcess.
        """
        round_start_time = datetime.datetime.now()
        round_end_time = round_start_time + datetime.timedelta(seconds=self.next_round_duration)
        
        # broadcast round duration and countdown to participants
        # asyncio.create_task(self.broadcast_countdown(round_end_time))

        message = {
                    "type": "send.roundinfo",
                    "nb_idea_promotions": self.next_round_nb_idea_promotions,
                    "round_duration": self.next_round_duration,
                }
        if self.current_round_index==0:
            message["task_description"] = self.task_description

        # broadcast round info to participants
        channel_layer = get_channel_layer()
        await channel_layer.group_send(
                self.group_name, message               
            )
        
        # Wait for the round to finish
        await asyncio.sleep(self.next_round_duration)

        # --- PAUSE HANDLING ---
        while self.is_paused:
            await asyncio.sleep(0.5)
            if not self.is_running:
                return  # If finished while paused, exit

        result = await self.gather_voting_from_random_participant()
        self.result = self.result + result
        await self.broadcast_voting_result(result)

        

        