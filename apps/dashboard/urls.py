from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="dashboard_home"),
    path("api/team-members/", views.api_team_members, name="api_team_members"),
    path("api/announcement/", views.api_announcement, name="api_announcement"),
    path("api/team/<int:member_id>/data/", views.api_team_data, name="api_team_data"),
    path("api/project/save/", views.api_project_save, name="api_project_save"),
    path(
        "api/project/document/", views.api_project_document, name="api_project_document"
    ),
    path(
        "api/project/document/delete/<int:document_id>/",
        views.api_project_document_delete,
        name="api_project_document_delete",
    ),
    path("api/project/remark/", views.api_project_remark, name="api_project_remark"),
    path(
        "api/project/remark/delete/<int:remark_id>/",
        views.api_project_remark_delete,
        name="api_project_remark_delete",
    ),
    path(
        "api/project/delete/<int:project_id>/",
        views.api_project_delete,
        name="api_project_delete",
    ),
    path("api/todo/save/", views.api_todo_save, name="api_todo_save"),
    path(
        "api/todo/delete/<int:todo_id>/", views.api_todo_delete, name="api_todo_delete"
    ),
    path("api/project/reorder/", views.api_project_reorder, name="api_project_reorder"),
    path("api/todo/reorder/", views.api_todo_reorder, name="api_todo_reorder"),
]
