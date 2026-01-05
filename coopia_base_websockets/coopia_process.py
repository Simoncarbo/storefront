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
                 phase1_duration = 60,
                 phase2_duration = 30,
                 phase1_max_actions = 2,
                 phase2_max_actions = 4,
                 phase2_nb_ideas_to_compare = 2,
                 phase2_preference_factor = 1.4,
                 max_cycles = 100,
                 max_duration = 3600,
                 start_time = None,
                 end_time=None):
        """
        Initialize the CoopiaProcess with the given parameters.
        """

        self.group_name = group_name  # Name of the group
        self.process_id = group_name+str(datetime.datetime.now())  # Unique process ID
        # for the moment, we assume a one-to-one mapping between group and coopia process

        self.channel_layer =  get_channel_layer()

        self.phase1_duration = phase1_duration  # Duration of phase 1 in seconds
        self.phase2_duration = phase2_duration  # Duration of phase 2 in seconds
        self.cycle_duration = phase1_duration+phase2_duration  # Duration of each cycle in seconds

        self.phase1_max_actions = phase1_max_actions
        self.phase2_max_actions = phase2_max_actions

        self.phase2_nb_ideas_to_compare = phase2_nb_ideas_to_compare
        self.phase2_preference_factor = phase2_preference_factor

        self.max_duration = max_duration 
        self.max_cycles = max_cycles  # Number of cycles to be played
        
        self.start_time = start_time  # Start time of the process
        self.end_time = end_time  # End time of the process

        self.current_cycle_index = None  # Current cycle number
        self.current_cycle_start_time = None  # Start time of the current cycle
        self.current_cycle_phase = None
        self.cycles = pd.DataFrame(columns = ['process_id','cycle_index','self.current_cycle_start_time', 'cycle_end_time', 'cycle_duration', 'cycle_result'])

        self.has_started = False  # Flag to indicate if the process has started
        self.is_running = False  # Flag to indicate if the process is running
        self.is_paused = False  # Flag to indicate if the process is paused
        self.is_finished = False  # Flag to indicate if the process is finished

        self.task_description = None
        self.results = []  # list of results from each cycle
        

        self.ideas = {}  # Dictionary to store ideas with their weights


    async def start(self, task_description=''):
        """
        Start the CoopiaProcess.
        """
        self.has_started = True
        self.is_running = True
        self.is_paused = False
        self.is_finished = False

        # Set the start time of the process
        self.start_time = datetime.datetime.now()
        self.end_time = self.start_time + datetime.timedelta(seconds=self.max_duration)

        self.task_description = task_description

        self.current_cycle_index = 0

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
        Starts the next cycle if paused.
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
                    result='__'.join(self.results),
                    start_time=self.start_time,
                    end_time=self.end_time,
                    current_round_index=self.current_cycle_index
                )
            except Exception as e:
                print(f"Error saving process info: {e}")

    async def send_process_info(self, channel_name):
        """
        Send process information to a single connected user.
        """
        await self.channel_layer.send(
            channel_name,
            {
                "type": "send.process.info",
                "process_id": self.process_id,
                "task_description": self.task_description,
                "has_started": self.has_started,
                "is_running": self.is_running,
                "is_paused": self.is_paused,
                "is_finished": self.is_finished,
                "start_time": str(self.start_time) if self.start_time else None,
                "cycle_duration": self.cycle_duration,
                "results": self.results
            }
        )

    async def send_cycle_info(self, channel_name):
        """
        Send current cycle information to a single connected user.
        """
        elapsed_time = 0
        if self.current_cycle_start_time:
            elapsed_time = (datetime.datetime.now() - self.current_cycle_start_time).total_seconds()
        
        await self.channel_layer.send(
            channel_name,
            {
                "type": "send.cycle.info",
                "cycle_index": self.current_cycle_index,
                "cycle_phase": self.current_cycle_phase,
                "cycle_elapsed_time": elapsed_time,
                "phase1_duration": self.phase1_duration,
                "phase2_duration": self.phase2_duration,
                "phase1_max_actions": self.phase1_max_actions,
                "phase2_max_actions": self.phase2_max_actions
            }
        )

    async def broadcast_cycle_info(self):
        """
        Broadcast cycle information to all group members.
        """
        elapsed_time = 0
        if self.current_cycle_start_time:
            elapsed_time = (datetime.datetime.now() - self.current_cycle_start_time).total_seconds()
        

        try:
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "send.cycle.info",
                    "cycle_index": self.current_cycle_index,
                    "cycle_phase": self.current_cycle_phase,
                    "cycle_elapsed_time": elapsed_time,
                    "phase1_duration": self.phase1_duration,
                    "phase2_duration": self.phase2_duration,
                    "phase1_max_actions": self.phase1_max_actions,
                    "phase2_max_actions": self.phase2_max_actions
                }
            )
        except Exception as e:
            print(f"Error broadcasting cycle info: {e}")


    async def broadcast_cycle_result(self, result):
        """
        Broadcast a result to all participants.
        """
        await self.channel_layer.group_send(
            self.group_name,{"type": "send.cycle.result", "message": result }
            )

    # async def update_participants(self, participants):
    #     self.participants = participants

    async def add_idea(self, idea):
        """
        Add an idea to the process with initial weight = 1.
        """
        self.ideas[idea]=1.0
    
    async def reset_ideas(self):
        self.ideas = {}

    async def register_preference(self, winner, loser):
        """
        Update weights according to a binary preference:
        - multiply the winner weight by factor
        - divide the loser weight by factor
        If an idea is unknown, add it with default weight 1.0 first.
        """
        # ensure ideas exist
        if winner not in self.ideas:
            self.ideas[winner] = 1.0
        if loser not in self.ideas:
            self.ideas[loser] = 1.0

        # update weights
        self.ideas[winner] = self.ideas.get(winner) * self.phase2_preference_factor
        self.ideas[loser] = self.ideas.get(loser) / self.phase2_preference_factor


    def get_random_ideas(self, nb_ideas):
        """
        Get a random idea from the process using idea weights.
        Returns a list of up to nb_ideas unique ideas (without replacement).
        """
        if not self.ideas:
            return None

        items = list(self.ideas.keys())
        weights = list(self.ideas.values())

        nb = min(nb_ideas, len(items))
        if nb == 0:
            return []

        # If only one requested, use random.choices for efficiency
        if nb == 1:
            return [random.choices(items, weights=weights, k=1)[0]]

        # Weighted sampling without replacement
        selected = []
        items_local = items[:]
        weights_local = weights[:]
        for _ in range(nb):
            choice = random.choices(items_local, weights=weights_local, k=1)[0]
            idx = items_local.index(choice)
            selected.append(choice)
            del items_local[idx] # deletes sampled idea
            del weights_local[idx] # deletes corresponding weight
        return selected   
    
    def get_best_idea(self):
        """
        Return the idea with the largest weight.
        If multiple ideas share the largest weight, pick one at random.
        Returns None if there are no ideas.
        """
        if not self.ideas:
            return None

        max_weight = max(self.ideas.values())
        best_candidates = [idea for idea, w in self.ideas.items() if w == max_weight]
        return random.choice(best_candidates)

    async def send_random_ideas_to_compare(self, channel_name):  
        """
        Send to a member of the group two randomly selected ideas.
        """
        ideas = self.get_random_ideas(self.phase2_nb_ideas_to_compare)
        # # Exclude ideas that are empty or none
        # if ideas:
        #     ideas = [idea for idea in ideas if idea and idea.strip()]
        # else:
        #     ideas = []

        await self.channel_layer.send(
            channel_name,
            {
                "type": "send.ideas",
                "ideas": ideas
            }
        )
          
    async def broadcast_random_ideas_to_compare(self):
        """
        Send to each member of the group two randomly selected ideas.
        """
        print("Diffusing ideas to participants...")
        participants = list(self.channel_layer.groups[self.group_name].keys())
        for participant in participants:
            await self.send_random_ideas_to_compare(participant)


    async def run_process(self):
        """
        Periodically broadcast a proposal to all participants.
        """
        while self.is_running:
            self.current_cycle_index += 1
            print(f"Starting cycle {self.current_cycle_index}...")
            
            # Check if the process has reached its maximum duration or maximum number of cycles reached
            if (datetime.datetime.now() >= self.end_time) or (self.current_cycle_index >= self.max_cycles):
                self.finish()
                break

            # Run a cycle of the CoopiaProcess
            await self.run_cycle()
        self.finish(save=False) 

    async def run_cycle(self):
        """
        Run a single cycle of the CoopiaProcess.
        """
        self.current_cycle_start_time = datetime.datetime.now()
        self.current_cycle_phase = 'phase1'

        # Broadcast cycle start info
        await self.broadcast_cycle_info()

        if self.current_cycle_index != 0:
            await self.reset_ideas()

        while True:
            elapsed = (datetime.datetime.now() - self.current_cycle_start_time).total_seconds()

            if self.current_cycle_phase=="phase1" and elapsed >= self.phase1_duration:
                # if number of ideas is less than 2, break early
                if len(self.ideas) < 2:
                    break
                self.current_cycle_phase = 'phase2'
                await self.broadcast_random_ideas_to_compare()

            if elapsed > self.cycle_duration:
                break

            await asyncio.sleep(0.5)

            if self.is_finished:
                return
            

        # Select a random idea and broadcast it
        # ideas_list = self.get_random_ideas(1)
        # selected_idea = ideas_list[0] if ideas_list else ""
        # Select the best idea and broadcast it
        selected_idea = self.get_best_idea()
        print(selected_idea)

        self.results.append(selected_idea if selected_idea else "")
        # print(self.results)

        await self.broadcast_cycle_result(selected_idea if selected_idea else "")

        cycle_end_time = datetime.datetime.now()
        self.cycles = pd.concat([
            self.cycles,
            pd.DataFrame([{
                'process_id': self.process_id,
                'cycle_index': self.current_cycle_index,
                'self.current_cycle_start_time': self.current_cycle_start_time,
                'cycle_end_time': cycle_end_time,
                'cycle_duration': (cycle_end_time - self.current_cycle_start_time).total_seconds(),
                'cycle_result': selected_idea
            }])
        ], ignore_index=True)
        