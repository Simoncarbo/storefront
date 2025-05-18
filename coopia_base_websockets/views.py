from django.shortcuts import render

# Create your views here.


def index(request):
    return render(request, "coopia_base_websockets/index.html")

def room(request, room_name):
    return render(request, "coopia_base_websockets/room.html", {"room_name": room_name})