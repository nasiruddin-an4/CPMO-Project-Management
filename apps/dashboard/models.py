from django.db import models
from django.conf import settings


class TeamMember(models.Model):
    name = models.CharField(max_length=120, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="team_member",
    )

    def __str__(self):
        return self.name


class Announcement(models.Model):
    message = models.TextField(blank=True, default="")
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return "Team Announcement"


class Project(models.Model):
    STATUS_CHOICES = [
        ("not_started", "Not started yet"),
        ("under_development", "Under development"),
        ("completed", "Completed"),
        ("hold", "In hold"),
        ("upcoming", "Upcoming"),
    ]

    team_member = models.ForeignKey(
        TeamMember, on_delete=models.CASCADE, related_name="projects"
    )
    project_name = models.CharField(max_length=255)
    status_percent = models.PositiveSmallIntegerField(default=0)
    estimated_complete_date = models.DateField(null=True, blank=True)
    note = models.TextField(blank=True)
    final_status = models.CharField(
        max_length=32, choices=STATUS_CHOICES, default="not_started"
    )
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.project_name} ({self.team_member})"


class ProjectDocument(models.Model):
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="documents"
    )
    doc_name = models.CharField(max_length=200)
    doc_link = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.doc_name


class ProjectRemark(models.Model):
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="remarks"
    )
    author_name = models.CharField(max_length=120)
    remark = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.author_name}: {self.remark[:50]}"


class ToDoItem(models.Model):
    team_member = models.ForeignKey(
        TeamMember, on_delete=models.CASCADE, related_name="todos"
    )
    note = models.TextField()
    is_completed = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.note
