import time

from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json
from .channellayers import ChannelLayerForCoopiaProcess

from asgiref.sync import async_to_sync


# Create your views here.


def index(request):
    return render(request, "coopia_base_websockets/index.html")

def room(request, room_name):
    return render(request, "coopia_base_websockets/room.html", {"room_name": room_name})

def room_admin(request, room_name):
    return render(request, "coopia_base_websockets/room_admin.html", {"room_name": room_name})

@csrf_exempt
def room_admin_action(request, room_name):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    try:
        data = json.loads(request.body)
        action = data.get("action")
        duration = int(data.get("next_round_duration", 25))
        nb_promotions = int(data.get("next_round_nb_idea_promotions", 4))
        task_description = data.get("task_description", "")

        # Get the channel layer and process
        from channels.layers import get_channel_layer
        channel_layer = get_channel_layer()

        if action == "start":
            if channel_layer and hasattr(channel_layer, "start_global_tick_loop"):
                    current_time = time.time()
                    async_to_sync(channel_layer.set_cycle_params)(group=room_name, 
                                                         generation_duration=10, 
                                                         selection_duration=30, 
                                                         nb_selections=1)
        
                    async_to_sync(channel_layer.set_cycle_state)(group=room_name, 
                                                        current_cycle_start_time=current_time, 
                                                        current_phase="generation", 
                                                        nb_selections_done=0, 
                                                        current_phase_start_time=current_time, 
                                                        current_cycle_end_time=None, 
                                                        current_phase_end_time=None)
        # elif action == "pause":
        #     process.pause()
        # elif action == "resume":
        #     process.resume()
        #     process.set_next_round_parameters(next_round_duration=duration, next_round_nb_idea_promotions=nb_promotions)
        # elif action == "finish":
        #     process.finish(save = False)
        # elif action == "next_round":
        #     process.set_next_round_parameters(next_round_duration=duration, next_round_nb_idea_promotions=nb_promotions)
        else:
            return JsonResponse({"error": "Unknown action"}, status=400)
        return JsonResponse({"status": f"{action} called"})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)