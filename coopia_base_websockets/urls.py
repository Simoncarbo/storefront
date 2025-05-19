from django.urls import path

from . import views


urlpatterns = [
    path("", views.index, name="index"),
    path("<str:room_name>/", views.room, name="room"),
    path("<str:room_name>/admin", views.room_admin, name="room_admin"),
    path("<str:room_name>/admin_action/", views.room_admin_action, name="room_admin_action"),
]