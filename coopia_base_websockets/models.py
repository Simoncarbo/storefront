from django.db import models

# Create your models here.

class CoopiaProcessInfo(models.Model):
    process_id = models.CharField(max_length=255, unique=True)
    group_name = models.CharField(max_length=255)
    task_description = models.TextField(blank=True, null=True)
    result = models.TextField(blank=True, null=True)
    start_time = models.DateTimeField(blank=True, null=True)
    end_time = models.DateTimeField(blank=True, null=True)
    current_round_index = models.IntegerField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)