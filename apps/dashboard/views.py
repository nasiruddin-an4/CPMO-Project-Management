import json
from datetime import date

from django.shortcuts import get_object_or_404, render, redirect
from django.contrib.auth import logout
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt

from apps.dashboard.models import (
    Announcement,
    Project,
    ProjectDocument,
    ProjectRemark,
    TeamMember,
    ToDoItem,
)
from apps.utils.api_response import APIResponse, Status


def custom_logout(request):
    logout(request)
    return redirect("login")


@login_required
def index(request):
    return render(request, "dashboard/index.html")


def _json_body(request):
    try:
        return json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return {}


@login_required
def api_team_members(request):
    # Non-superusers only see their linked team member for privacy.
    if request.user.is_authenticated and not request.user.is_superuser:
        members = TeamMember.objects.filter(user=request.user)
    else:
        members = TeamMember.objects.order_by("name")

    return APIResponse.success(
        data=[{"id": member.id, "name": member.name} for member in members]
    )


@login_required
@csrf_exempt
def api_announcement(request):
    if request.method == "POST":
        payload = _json_body(request)
        message = payload.get("message", "").strip()
        announcement, _ = Announcement.objects.get_or_create(pk=1)
        announcement.message = message
        announcement.save()
        return APIResponse.success(
            data={"message": announcement.message}, message="Announcement updated"
        )

    announcement = Announcement.objects.first()
    return APIResponse.success(
        data={"message": announcement.message if announcement else ""}
    )


@login_required
def api_team_data(request, member_id):
    member = get_object_or_404(TeamMember, pk=member_id)
    # Restrict access to team member data unless superuser
    if (
        request.user.is_authenticated
        and not request.user.is_superuser
        and getattr(member, "user", None) != request.user
    ):
        return APIResponse.error(message="Permission denied", status_code=403)
    projects = []
    for project in member.projects.all():
        projects.append(
            {
                "id": project.id,
                "project_name": project.project_name,
                "status_percent": project.status_percent,
                "estimated_complete_date": (
                    project.estimated_complete_date.isoformat()
                    if project.estimated_complete_date
                    else None
                ),
                "note": project.note,
                "final_status": project.final_status,
                "documents": [
                    {
                        "id": doc.id,
                        "doc_name": doc.doc_name,
                        "doc_link": doc.doc_link,
                    }
                    for doc in project.documents.all()
                ],
                "remarks": [
                    {
                        "id": remark.id,
                        "author_name": remark.author_name,
                        "remark": remark.remark,
                        "created_at": remark.created_at.isoformat(),
                    }
                    for remark in project.remarks.all()
                ],
            }
        )

    todos = [
        {
            "id": todo.id,
            "note": todo.note,
            "is_completed": todo.is_completed,
        }
        for todo in member.todos.all()
    ]

    return APIResponse.success(
        data={
            "team_member": {"id": member.id, "name": member.name},
            "projects": projects,
            "todos": todos,
        }
    )


@login_required
@csrf_exempt
def api_project_save(request):
    if request.method != "POST":
        return APIResponse.error(
            message="Only POST allowed", status_code=Status.HTTP_400_BAD_REQUEST
        )

    payload = _json_body(request)
    project_id = payload.get("id")
    member_id = payload.get("team_member_id")
    member = get_object_or_404(TeamMember, pk=member_id)
    # Only allow saving projects for members the user owns (or superuser)
    if (
        request.user.is_authenticated
        and not request.user.is_superuser
        and getattr(member, "user", None) != request.user
    ):
        return APIResponse.error(message="Permission denied", status_code=403)
    project = Project.objects.filter(pk=project_id).first() if project_id else Project()
    # If updating an existing project, ensure the user can edit that project
    if (
        project_id
        and project
        and request.user.is_authenticated
        and not request.user.is_superuser
    ):
        if getattr(project.team_member, "user", None) != request.user:
            return APIResponse.error(message="Permission denied", status_code=403)
    project.team_member = member
    project.project_name = payload.get("project_name", "").strip()
    project.status_percent = payload.get("status_percent") or 0
    estimated_date = payload.get("estimated_complete_date")
    if isinstance(estimated_date, str) and estimated_date:
        try:
            project.estimated_complete_date = date.fromisoformat(estimated_date)
        except ValueError:
            project.estimated_complete_date = None
    else:
        project.estimated_complete_date = None
    project.note = payload.get("note", "").strip()
    project.final_status = payload.get("final_status", "not_started")
    project.save()

    return APIResponse.success(data={"id": project.id}, message="Project saved")


@login_required
@csrf_exempt
def api_project_delete(request, project_id):
    if request.method != "POST":
        return APIResponse.error(
            message="Only POST allowed", status_code=Status.HTTP_400_BAD_REQUEST
        )
    project = get_object_or_404(Project, pk=project_id)
    if (
        request.user.is_authenticated
        and not request.user.is_superuser
        and getattr(project.team_member, "user", None) != request.user
    ):
        return APIResponse.error(message="Permission denied", status_code=403)
    project.delete()
    return APIResponse.success(message="Project deleted")


@login_required
@csrf_exempt
def api_project_document(request):
    if request.method != "POST":
        return APIResponse.error(
            message="Only POST allowed", status_code=Status.HTTP_400_BAD_REQUEST
        )

    payload = _json_body(request)
    project = get_object_or_404(Project, pk=payload.get("project_id"))
    if (
        request.user.is_authenticated
        and not request.user.is_superuser
        and getattr(project.team_member, "user", None) != request.user
    ):
        return APIResponse.error(message="Permission denied", status_code=403)
    doc_id = payload.get("id")
    if doc_id:
        document = get_object_or_404(ProjectDocument, pk=doc_id)
        document.doc_name = payload.get("doc_name", "").strip()
        document.doc_link = payload.get("doc_link", "").strip()
        document.save()
    else:
        document = ProjectDocument.objects.create(
            project=project,
            doc_name=payload.get("doc_name", "").strip(),
            doc_link=payload.get("doc_link", "").strip(),
        )
    return APIResponse.success(data={"id": document.id}, message="Document saved")


@login_required
@csrf_exempt
def api_project_document_delete(request, document_id):
    if request.method != "POST":
        return APIResponse.error(
            message="Only POST allowed", status_code=Status.HTTP_400_BAD_REQUEST
        )
    document = get_object_or_404(ProjectDocument, pk=document_id)
    if (
        request.user.is_authenticated
        and not request.user.is_superuser
        and getattr(document.project.team_member, "user", None) != request.user
    ):
        return APIResponse.error(message="Permission denied", status_code=403)
    document.delete()
    return APIResponse.success(message="Document deleted")


@login_required
@csrf_exempt
def api_project_remark(request):
    if request.method != "POST":
        return APIResponse.error(
            message="Only POST allowed", status_code=Status.HTTP_400_BAD_REQUEST
        )

    payload = _json_body(request)
    project = get_object_or_404(Project, pk=payload.get("project_id"))
    if (
        request.user.is_authenticated
        and not request.user.is_superuser
        and getattr(project.team_member, "user", None) != request.user
    ):
        return APIResponse.error(message="Permission denied", status_code=403)
    remark_id = payload.get("id")
    if remark_id:
        remark = get_object_or_404(ProjectRemark, pk=remark_id)
        remark.author_name = payload.get("author_name", "").strip() or "Unknown"
        remark.remark = payload.get("remark", "").strip()
        remark.save()
    else:
        remark = ProjectRemark.objects.create(
            project=project,
            author_name=payload.get("author_name", "").strip() or "Unknown",
            remark=payload.get("remark", "").strip(),
        )
    return APIResponse.success(data={"id": remark.id}, message="Remark added")


@login_required
@csrf_exempt
def api_project_remark_delete(request, remark_id):
    if request.method != "POST":
        return APIResponse.error(
            message="Only POST allowed", status_code=Status.HTTP_400_BAD_REQUEST
        )
    remark = get_object_or_404(ProjectRemark, pk=remark_id)
    if (
        request.user.is_authenticated
        and not request.user.is_superuser
        and getattr(remark.project.team_member, "user", None) != request.user
    ):
        return APIResponse.error(message="Permission denied", status_code=403)
    remark.delete()
    return APIResponse.success(message="Remark deleted")


@login_required
@csrf_exempt
def api_todo_save(request):
    if request.method != "POST":
        return APIResponse.error(
            message="Only POST allowed", status_code=Status.HTTP_400_BAD_REQUEST
        )

    payload = _json_body(request)
    todo_id = payload.get("id")
    member_id = payload.get("team_member_id")
    member = get_object_or_404(TeamMember, pk=member_id)
    if (
        request.user.is_authenticated
        and not request.user.is_superuser
        and getattr(member, "user", None) != request.user
    ):
        return APIResponse.error(message="Permission denied", status_code=403)
    todo = (
        ToDoItem.objects.filter(pk=todo_id).first()
        if todo_id
        else ToDoItem(team_member=member)
    )
    todo.team_member = member
    todo.note = payload.get("note", "").strip()
    todo.is_completed = payload.get("is_completed", False)
    todo.save()
    return APIResponse.success(data={"id": todo.id}, message="To-do saved")


@login_required
@csrf_exempt
def api_todo_delete(request, todo_id):
    if request.method != "POST":
        return APIResponse.error(
            message="Only POST allowed", status_code=Status.HTTP_400_BAD_REQUEST
        )
    todo = get_object_or_404(ToDoItem, pk=todo_id)
    if (
        request.user.is_authenticated
        and not request.user.is_superuser
        and getattr(todo.team_member, "user", None) != request.user
    ):
        return APIResponse.error(message="Permission denied", status_code=403)
    todo.delete()
    return APIResponse.success(message="To-do deleted")
