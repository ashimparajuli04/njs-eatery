from fastapi import status


class AppError(Exception):
    """Base for application-level errors, converted to HTTP responses by a global handler."""

    status_code: int = status.HTTP_400_BAD_REQUEST
    detail: str = "Bad request"

    def __init__(self, detail: str | None = None):
        if detail is not None:
            self.detail = detail
        super().__init__(self.detail)


class BadRequestError(AppError):
    status_code = status.HTTP_400_BAD_REQUEST
    detail = "Bad request"


class NotFoundError(AppError):
    status_code = status.HTTP_404_NOT_FOUND
    detail = "Not found"


class ConflictError(AppError):
    status_code = status.HTTP_409_CONFLICT
    detail = "Conflict"
