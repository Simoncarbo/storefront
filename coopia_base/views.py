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
            new_message = Message.objects.create(content=message_content)

            # Render only the new message
            return render(request, 'coopia_base/partials/single_message.html', {'message': new_message})
        else:
            return redirect('index')
        