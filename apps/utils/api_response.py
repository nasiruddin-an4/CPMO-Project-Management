from django.http import JsonResponse
from django.utils import timezone


class Status:
    HTTP_200_OK = 200
    HTTP_201_CREATED = 201
    HTTP_204_NO_CONTENT = 204
    HTTP_400_BAD_REQUEST = 400
    HTTP_404_NOT_FOUND = 404
    HTTP_500_INTERNAL_SERVER_ERROR = 500


class APIResponse:
    @staticmethod
    def success(
        data=None,
        message="Request successful",
        status_code=Status.HTTP_200_OK,
        meta=None,
    ):
        return JsonResponse(
            {
                "success": True,
                "message": message,
                "data": data,
                "errors": None,
                "meta": {**(meta or {}), "timestamp": timezone.now()},
            },
            status=status_code,
            safe=False,
        )

    @staticmethod
    def error(
        errors=None,
        message="Something went wrong",
        status_code=Status.HTTP_400_BAD_REQUEST,
        meta=None,
    ):
        return JsonResponse(
            {
                "success": False,
                "message": message,
                "data": None,
                "errors": errors,
                "meta": {**(meta or {}), "timestamp": timezone.now()},
            },
            status=status_code,
            safe=False,
        )
