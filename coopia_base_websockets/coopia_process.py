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
        self.participants = []
        self.vote_percentage = 0.0

        self.simulated_processing_time = 3


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

    async def update_participants(self, participants):
        self.participants = participants
        await self.update_vote_percentage()

    async def add_idea(self, channel_name, idea):
        """
        Add an idea to the process.
        """
        self.ideas[channel_name]=idea
        print(self.ideas)
    
        await self.update_vote_percentage()
    
    async def reset_ideas(self):
        self.ideas = {}
        await self.update_vote_percentage()

    async def update_vote_percentage(self):
        # remove ideas associated to users that are not in self.participants
        self.ideas = {k: v for k, v in self.ideas.items() if k in self.participants}

        self.vote_percentage = len(self.ideas) / len(self.participants) if self.participants else 0
        print(self.vote_percentage)

        # Broadcast the updated vote percentage to all participants
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "send.vote_percentage",
                "vote_percentage": round(self.vote_percentage*100)
            }
        )

    def get_random_idea(self):
        """
        Get a random idea from the process.
        """
        if self.ideas:
            return random.choice(list(self.ideas.values()))
        return None
            
    async def individual_inspiration(self, ideas):
        """
        Send to each member of the group two randomly selected ideas (excluding their own).
        """
        print("Diffusing ideas to participants...")
        participants = list(self.channel_layer.groups[self.group_name].keys())
        for participant in participants:
            # Exclude the participant's own idea
            other_ideas = [idea for sender, idea in ideas.items() if sender != participant]
            # Exclude ideas that are empty or none
            other_ideas = [idea for idea in other_ideas if idea and idea.strip()]
            # Select up to two random ideas
            selected_ideas = random.sample(other_ideas, min(4, len(other_ideas)))
            print(selected_ideas)
            await self.channel_layer.send(
                participant,
                {
                    "type": "send.diffused.ideas",
                    "ideas": selected_ideas
                }
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
            self.current_round_index += 1
        self.finish(save=False) 

    async def run_round(self):
        """
        Run a single round of the CoopiaProcess.
        Waits for all participants to submit their ideas, then broadcasts a randomly selected idea.
        """
        round_start_time = datetime.datetime.now()

        if self.current_round_index !=0:
            # Reset ideas for this round
            await self.reset_ideas()

        # Wait for all participants to submit their ideas or until round duration expires
        timeout = self.max_duration
        start_time = time.time()
        
        individual_inspiration_done = False
        while True:
            # You need to define participants as a list of channel_names
            if self.participants is not None and self.vote_percentage==1.:
                if not individual_inspiration_done:
                    await self.individual_inspiration(self.ideas)
                    await self.reset_ideas()
                    individual_inspiration_done = True
                else:
                    break
            if time.time() - start_time > timeout:
                break
            await asyncio.sleep(0.5)  # Polling interval

            if self.is_finished:
                return

        # Select a random idea and broadcast it
        selected_idea = self.get_random_idea()
        print(selected_idea)

        self.result += selected_idea
        print(self.result)

        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "send.result",
                "message": selected_idea,
                "simulated_processing_time": self.simulated_processing_time
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
        