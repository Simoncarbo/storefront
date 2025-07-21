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

        self.channel_layer =  get_channel_layer()

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

        self.ideas = {}  # Dictionary to store ideas with their source


    async def start(self, task_description='', next_round_duration=25, next_round_nb_idea_promotions=4):
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

        await self.run_process()
    
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
    
    def finish(self, save = True):
        """
        Finish the CoopiaProcess.
        """
        self.is_running = False
        self.is_paused = False
        self.is_finished = True

        self.end_time = datetime.datetime.now()

        if save:
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

    async def add_idea(self, channel_name, idea):
        """
        Add an idea to the process.
        """
        self.ideas[channel_name]=idea
        print(self.ideas)

    def get_random_idea(self):
        """
        Get a random idea from the process.
        """
        if self.ideas:
            return random.choice(list(self.ideas.values()))
        return None

    def promote_idea(self, excluded_participants, idea):
        """
        Promote a idea by sending it to a random participant.

        excluded_participants: List of channel_names to exclude from the random selection.
        """
        if len(excluded_participants)<=self.nbtrials_promote_idea:
            # If the first 5 participants to receive the idea had it already, stop trying to send this idea
            async_to_sync(self.channel_layer.random_send)(
                self.group_name,excluded_participants,{"type": "send.promoted.idea", 
                                                    "message": idea, 
                                                    "excluded_participants":excluded_participants}
                )

    async def broadcast_voting_result(self, result):
        """
        Broadcast a result to all participants.
        """
        await self.channel_layer.group_send(
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
            self.finish(save=False) 
            self.current_round_index += 1

    async def run_round(self):
        """
        Run a single round of the CoopiaProcess.
        Waits for all participants to submit their ideas, then broadcasts a randomly selected idea.
        """
        round_start_time = datetime.datetime.now()
        self.ideas = {}  # Reset ideas for this round

        # Wait for all participants to submit their ideas or until round duration expires
        timeout = self.max_duration
        start_time = time.time()
        
        participants_old = []
        while True:
            participants = list(self.channel_layer.groups[self.group_name].keys())
            if participants_old!=participants:
                print((participants))
            # You need to define participants as a list of channel_names
            if participants is not None and set(self.ideas.keys()) >= set(participants):
                break
            if time.time() - start_time > timeout:
                break
            await asyncio.sleep(0.5)  # Polling interval
            participants_old = participants

        # Select a random idea and broadcast it
        selected_idea = self.get_random_idea()
        print(selected_idea)
        if selected_idea:
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "send.result",
                    "message": selected_idea
                }
            )

        round_end_time = datetime.datetime.now()
        # Optionally, log round info
        self.rounds = pd.concat([
            self.rounds,
            pd.DataFrame([{
                'process_id': self.process_id,
                'round_index': self.current_round_index,
                'round_start_time': round_start_time,
                'round_end_time': round_end_time,
                'nb_idea_promotions': 1,
                'round_duration': (round_end_time - round_start_time).total_seconds(),
                'round_result': selected_idea
            }])
        ], ignore_index=True)
        