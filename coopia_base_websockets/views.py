from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json
from .channellayers import ChannelLayerForCoopiaProcess


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
        # Assume your channel layer has a .coopia_processes dict
        process = getattr(channel_layer, "coopia_processes", {}).get(room_name)
        # if not process and action == "start":
        #     # Create a new process if not exists
        #     awaitable = channel_layer.add_coopia_process_to_group(room_name)
        #     if hasattr(awaitable, "__await__"):
        #         import asyncio
        #         asyncio.get_event_loop().run_until_complete(awaitable)
        #     process = channel_layer.coopia_processes.get(room_name)
        if not process:
            return JsonResponse({"error": "No process found for this room"}, status=404)
        if action == "start":
            process.start(task_description,next_round_duration=duration, next_round_nb_idea_promotions=nb_promotions)
        elif action == "pause":
            process.pause()
        elif action == "resume":
            process.resume()
            process.set_next_round_parameters(next_round_duration=duration, next_round_nb_idea_promotions=nb_promotions)
        elif action == "finish":
            process.finish()
        elif action == "next_round":
            process.set_next_round_parameters(next_round_duration=duration, next_round_nb_idea_promotions=nb_promotions)
        else:
            return JsonResponse({"error": "Unknown action"}, status=400)
        return JsonResponse({"status": f"{action} called"})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)