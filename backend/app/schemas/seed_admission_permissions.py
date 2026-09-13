from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.rbac import Permission, Role


ADMISSION_PERMISSIONS = [
    (
        "ADMISSION_CREATE",
        "Create Admissions",
        "admissions",
        "Create admission applications.",
    ),
    (
        "ADMISSION_VIEW",
        "View Admissions",
        "admissions",
        "View admission applications.",
    ),
    (
        "ADMISSION_UPDATE",
        "Update Admissions",
        "admissions",
        "Update admission applications.",
    ),
    (
        "ADMISSION_STATUS_UPDATE",
        "Update Admission Status",
        "admissions",
        "Move admission applications through workflow statuses.",
    ),
    (
        "ADMISSION_REVIEW",
        "Review Admissions",
        "admissions",
        "Review admission applications.",
    ),
    (
        "ADMISSION_APPROVE",
        "Approve Admissions",
        "admissions",
        "Approve admission applications.",
    ),
    (
        "ADMISSION_CONFIRM",
        "Confirm Admissions",
        "admissions",
        "Confirm admissions and allow enrollment.",
    ),
    (
        "ADMISSION_CANCEL",
        "Cancel Admissions",
        "admissions",
        "Cancel admission applications.",
    ),
]


def get_or_create_permission(
    db,
    code: str,
    name: str,
    module: str,
    description: str,
) -> Permission:
    permission = db.scalar(
        select(Permission).where(
            Permission.code == code
        )
    )

    if permission:
        permission.name = name
        permission.module = module
        permission.description = description
        permission.is_active = True
        return permission

    permission = Permission(
        code=code,
        name=name,
        module=module,
        description=description,
        is_active=True,
    )

    db.add(permission)
    db.flush()

    return permission


def main() -> None:
    db = SessionLocal()

    try:
        admin_role = db.scalar(
            select(Role).where(
                Role.name == "Admin"
            )
        )

        if not admin_role:
            raise RuntimeError(
                "Admin role not found. Run the main RBAC seed first."
            )

        for (
            code,
            name,
            module,
            description,
        ) in ADMISSION_PERMISSIONS:

            permission = get_or_create_permission(
                db=db,
                code=code,
                name=name,
                module=module,
                description=description,
            )

            if permission not in admin_role.permissions:
                admin_role.permissions.append(
                    permission
                )

        db.commit()

        print(
            "Admission permissions seeded successfully."
        )

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    main()