from django.contrib import admin

# Register your models here.

from .models import Community,User, CommunityUserMapper

admin.site.register(Community)
admin.site.register(User)
admin.site.register(CommunityUserMapper)