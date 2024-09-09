from django.db import models
import django.contrib.auth as auth

# Create your models here.
class Community(models.Model):
    description_text = models.CharField(max_length=500)
    creation_date = models.DateTimeField()


class User(auth.models.User):
    # s'inspirer de l'app authentication de Django: https://docs.djangoproject.com/en/5.1/ref/contrib/auth/
    # email = models.EmailField(max_length = 254)
    # name = models.CharField(max_length=50)
    # surname = models.CharField(max_length=50)
    #birth_date = models.DateTimeField()
    # creation_date = models.DateTimeField()
    pass


class CommunityUserMapper(models.Model):
    community = models.ForeignKey(Community, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    date_joined = models.DateTimeField()
    date_last_activity = models.DateTimeField()