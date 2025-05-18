import datetime
import random
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import pandas as pd

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
        self.process_id = group_name+str(datetime.datetime.now().timestamp())  # Unique process ID
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
        self.rounds = pd.Dataframe(columns = ['process_id','round_index','round_start_time', 'round_end_time','nb_idea_promotions', 'round_duration', 'round_result'])

        self.is_running = False  # Flag to indicate if the process is running
        self.is_paused = False  # Flag to indicate if the process is paused
        self.is_finished = False  # Flag to indicate if the process is finished

        self.result =''  # current result of the process


        self.start()


    def start(self, next_round_duration = 30, next_round_nb_idea_promotions = 4):
        """
        Start the CoopiaProcess.
        """
        self.is_running = True
        self.is_paused = False
        self.is_finished = False

        # Set the start time of the process
        self.start_time = datetime.datetime.now()
        self.max_end_time = self.start_time + datetime.timedelta(seconds=self.max_duration)

        self.next_round_duration = next_round_duration
        self.next_round_nb_idea_promotions = next_round_nb_idea_promotions

        self.run_process()
    
    def pause(self):
        """
        Pause the CoopiaProcess.
        """
        self.is_running = False
        self.is_paused = True
        self.is_finished = False

    def resume(self):
        """
        Resume the CoopiaProcess.
        """
        self.is_running = True
        self.is_paused = False
        self.is_finished = False
    
    def finish(self):
        """
        Finish the CoopiaProcess.
        """
        self.is_running = False
        self.is_paused = False
        self.is_finished = True

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

    def broadcast_countdown(self):
        """
        Broadcast the countdown to all participants.
        """
        # This method can be extended to add more functionality as needed
        pass

    def gather_voting_from_random_participant(self):
        """
        Gather voting from one randomly selected participant.
        """
        # This method can be extended to add more functionality as needed
        pass

    def broadcast_voting_result(self, proposal):
        """
        Broadcast a proposal to all groups.
        """
        # This method can be extended to add more functionality as needed
        pass

    def run_process(self):
        """
        Periodically broadcast a proposal to all participants.
        """
        self.current_round_index = 0
        while self.is_running:
            # Check if the process has reached its maximum duration
            if (datetime.datetime.now() >= self.max_end_time) or (self.current_round_index >= self.max_rounds):
                self.finish()
                break

            # Run a round of the CoopiaProcess
            self.run_round()
            self.current_round_index += 1

    def run_round(self):
        """
        Run a single round of the CoopiaProcess.
        """
        self.round_start_time = datetime.datetime.now()
        
        

        self.round_end_time = datetime.datetime.now()