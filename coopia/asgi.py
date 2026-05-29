"""
ASGI config for coopia project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.0/howto/deployment/asgi/
"""

import os

import os
import asyncio
import logging

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from channels.layers import get_channel_layer
from django.contrib.staticfiles.handlers import ASGIStaticFilesHandler
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "coopia.settings")

# Initialize Django ASGI application early to ensure the AppRegistry
# is populated before importing code that may import ORM models.
# copilot: I've added ASGIStaticFilesHandler to wrap the Django ASGI application in asgi.py. This explicitly enables static file serving with Daphne, as the built-in handling in get_asgi_application() might not be working properly.
django_asgi_app = ASGIStaticFilesHandler(get_asgi_application())
# django_asgi_app = get_asgi_application()

from coopia_base_websockets.routing import websocket_urlpatterns

class TickLoopStarter:
    """ASGI middleware to start one tick loop task per process."""

    def __init__(self, app):
        self.app = app
        self.started = False
        self.task = None

    async def __call__(self, scope, receive, send):
        if not self.started:
            self.started = True
            try:
                channel_layer = get_channel_layer()
                if channel_layer and hasattr(channel_layer, "start_global_tick_loop"):                    
                    logging.info("Starting Coopia global tick loop (process-level)")
                    self.task = asyncio.create_task(channel_layer.start_global_tick_loop())
                else:
                    logging.warning("Channel layer missing start_global_tick_loop")
            except Exception as exc:
                logging.error(f"Failed to start global tick loop: {exc}")

        return await self.app(scope, receive, send)


application = TickLoopStarter(
    ProtocolTypeRouter(
        {
            "http": django_asgi_app,
            "websocket": AllowedHostsOriginValidator(
                AuthMiddlewareStack(URLRouter(websocket_urlpatterns))
            ),
        }
    )
)
