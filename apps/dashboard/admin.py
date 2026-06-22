from django.contrib import admin

from .models import (
    Announcement,
    Project,
    ProjectDocument,
    ProjectRemark,
    TeamMember,
    ToDoItem,
)


class ProjectDocumentInline(admin.TabularInline):
    model = ProjectDocument
    extra = 1


class ProjectRemarkInline(admin.TabularInline):
    model = ProjectRemark
    extra = 1


@admin.register(TeamMember)
class TeamMemberAdmin(admin.ModelAdmin):
    list_display = ["name", "user", "created_at"]
    search_fields = ["name", "user__username"]


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ["message", "updated_at"]
    readonly_fields = ["updated_at"]


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = [
        "project_name",
        "team_member",
        "status_percent",
        "final_status",
        "updated_at",
    ]
    list_filter = ["final_status", "team_member"]
    search_fields = ["project_name", "note"]
    inlines = [ProjectDocumentInline, ProjectRemarkInline]


@admin.register(ToDoItem)
class ToDoItemAdmin(admin.ModelAdmin):
    list_display = ["team_member", "note", "is_completed", "updated_at"]
    list_filter = ["is_completed", "team_member"]
    search_fields = ["note"]
