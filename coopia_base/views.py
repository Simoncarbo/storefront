from django.shortcuts import render, redirect
from django.http import HttpResponse

from coopia_base.models import Community, Message


def index(request):
    context= {
        "messages":Message.objects.all()
    }
    return render(request, "coopia_base/index.html", context)

def add_message(request):
    if request.method == 'POST':
        message_content = request.POST.get('message')
        if message_content:
            Message.objects.create(content=message_content)
        return redirect('index')
        