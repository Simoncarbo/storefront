from django.urls import re_path

from . import consumers

# as_asgi is used to have a different consumer instance for each request. 
# even opening two different tabs in the same browser will create two different consumer instances.
websocket_urlpatterns = [
    re_path(r"ws/coopiabasewebsockets/(?P<room_name>\w+)/$", consumers.ChatConsumer.as_asgi()),
]