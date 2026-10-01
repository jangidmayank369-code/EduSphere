from __future__ import annotations

import os

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.rbac import Permission, Role
from app.models.user import User


PERMISSIONS = {
    # ------------------------------------------------------------------
    # Authentication / Identity
    # ------------------------------------------------------------------
    "AUTH_LOGIN": "Allow user authentication.",
    "AUTH_ME": "Allow access to current authenticated user.",

    # ------------------------------------------------------------------
    # School
    # ------------------------------------------------------------------
    "SCHOOL_CREATE": "Create schools.",
    "SCHOOL_VIEW": "View schools.",
    "SCHOOL_UPDATE": "Update school information.",
    "SCHOOL_STATUS_UPDATE": "Activate or deactivate schools.",

    # ------------------------------------------------------------------
    # Academic Sessions
    # ------------------------------------------------------------------
    "ACADEMIC_SESSION_CREATE": "Create academic sessions.",
    "ACADEMIC_SESSION_VIEW": "View academic sessions.",
    "ACADEMIC_SESSION_UPDATE": "Update academic sessions.",
    "ACADEMIC_SESSION_STATUS_UPDATE": (
        "Activate or deactivate academic sessions."
    ),
    "ACADEMIC_SESSION_SET_CURRENT": (
        "Set the current academic session."
    ),
    "ACADEMIC_SESSION_CLOSE": "Close academic sessions.",
    "ACADEMIC_SESSION_ARCHIVE": "Archive closed academic sessions.",
    "ACADEMIC_SESSION_CLONE": "Clone academic sessions.",
    "ACADEMIC_SESSION_CARRY_FORWARD": (
        "Carry academic session data forward."
    ),

    # ------------------------------------------------------------------
    # Users / Identity
    # ------------------------------------------------------------------
    "USER_CREATE": "Create users.",
    "USER_VIEW": "View users.",
    "USER_UPDATE": "Update users.",
    "USER_STATUS_UPDATE": "Activate or deactivate users.",
    "USER_DELETE": "Delete users.",
    "USER_PASSWORD_RESET": "Reset user passwords.",
    "USER_ROLE_UPDATE": "Assign or update user roles.",

    # ------------------------------------------------------------------
    # RBAC
    # ------------------------------------------------------------------
    "RBAC_ROLE_CREATE": "Create roles.",
    "RBAC_ROLE_VIEW": "View roles.",
    "RBAC_ROLE_UPDATE": "Update roles.",
    "RBAC_ROLE_DELETE": "Delete roles.",
    "RBAC_ROLE_ASSIGN": "Assign or remove roles from users.",
    "RBAC_PERMISSION_CREATE": "Create permissions.",
    "RBAC_PERMISSION_VIEW": "View permissions.",
    "RBAC_PERMISSION_UPDATE": "Update permissions.",
    "RBAC_PERMISSION_DELETE": "Delete permissions.",
    "RBAC_PERMISSION_ASSIGN": (
        "Assign or remove permissions from roles."
    ),

    # ------------------------------------------------------------------
    # Students
    # ------------------------------------------------------------------
    "STUDENT_CREATE": "Create students.",
    "STUDENT_VIEW": "View students.",
    "STUDENT_UPDATE": "Update student information.",
    "STUDENT_STATUS_UPDATE": "Activate or deactivate students.",
    "STUDENT_BULK_STATUS_UPDATE": (
        "Bulk activate or deactivate students."
    ),

    # ------------------------------------------------------------------
    # Parents
    # ------------------------------------------------------------------
    "PARENT_CREATE": "Create parents.",
    "PARENT_VIEW": "View parents.",
    "PARENT_UPDATE": "Update parent information.",
    "PARENT_STATUS_UPDATE": "Activate or deactivate parents.",
    "PARENT_BULK_STATUS_UPDATE": (
        "Bulk activate or deactivate parents."
    ),
    "PARENT_STUDENT_LINK": (
        "Link or unlink students with parents."
    ),

    # ------------------------------------------------------------------
    # Documents
    # ------------------------------------------------------------------
    "DOCUMENT_CREATE": "Create student or parent documents.",
    "DOCUMENT_VIEW": "View documents.",
    "DOCUMENT_UPDATE": "Update document metadata.",
    "DOCUMENT_STATUS_UPDATE": "Activate or deactivate documents.",
    "DOCUMENT_ARCHIVE": "Archive or restore documents.",

    # ------------------------------------------------------------------
    # Admissions
    # ------------------------------------------------------------------
    "ADMISSION_CREATE": "Create admission enquiries/applications.",
    "ADMISSION_VIEW": "View admissions.",
    "ADMISSION_UPDATE": "Update admission information.",
    "ADMISSION_STATUS_UPDATE": (
        "Update admission workflow status."
    ),
    "ADMISSION_REVIEW": "Review admission applications.",
    "ADMISSION_APPROVE": "Approve admission applications.",
    "ADMISSION_CONFIRM": (
        "Confirm admissions and create student records."
    ),
    "ADMISSION_CANCEL": "Cancel admissions.",

    # ------------------------------------------------------------------
    # Fee Structure
    # ------------------------------------------------------------------
    "FEE_STRUCTURE_CREATE": "Create fee structures.",
    "FEE_STRUCTURE_VIEW": "View fee structures.",
    "FEE_STRUCTURE_UPDATE": "Update fee structures.",
    "FEE_STRUCTURE_STATUS_UPDATE": (
        "Activate or deactivate fee structures."
    ),

    # ------------------------------------------------------------------
    # Audit
    # ------------------------------------------------------------------
    "AUDIT_VIEW": "View audit records.",
    "AUDIT_EXPORT": "Export audit records.",

    # ------------------------------------------------------------------
    # System
    # ------------------------------------------------------------------
    "SYSTEM_SETTINGS_VIEW": "View system settings.",
    "SYSTEM_SETTINGS_UPDATE": "Update system settings.",
}


DEFAULT_ADMIN_EMAIL = "admin@example.com"
DEFAULT_ADMIN_PASSWORD = "Admin@12345"
DEFAULT_ADMIN_NAME = "EduSphere Admin"


def get_or_create_permission(
    db,
    code: str,
    description: str,
) -> tuple[Permission, bool, bool]:
    permission = db.scalar(
        select(Permission).where(
            Permission.code == code,
        )
    )

    if permission is None:
        permission = Permission(
            code=code,
            description=description,
        )
        db.add(permission)
        db.flush()

        return permission, True, False

    updated = permission.description != description

    if updated:
        permission.description = description

    return permission, False, updated


def get_or_create_admin_role(
    db,
) -> tuple[Role, bool]:
    role = db.scalar(
        select(Role).where(
            Role.name == "Admin",
        )
    )

    description = "Full administrative access to EduSphere."

    if role is None:
        role = Role(
            name="Admin",
            description=description,
        )

        db.add(role)
        db.flush()

        return role, True

    if role.description != description:
        role.description = description

    return role, False


def get_or_create_admin_user(
    db,
    admin_role: Role,
) -> tuple[User, bool, bool]:
    """
    Returns:
        admin_user
        user_created
        role_attached
    """

    admin_email = (
        os.getenv(
            "BOOTSTRAP_ADMIN_EMAIL",
            DEFAULT_ADMIN_EMAIL,
        )
        .strip()
        .lower()
    )

    admin_password = os.getenv(
        "BOOTSTRAP_ADMIN_PASSWORD",
        DEFAULT_ADMIN_PASSWORD,
    )

    admin_name = os.getenv(
        "BOOTSTRAP_ADMIN_NAME",
        DEFAULT_ADMIN_NAME,
    ).strip()

    if not admin_password:
        raise RuntimeError(
            "BOOTSTRAP_ADMIN_PASSWORD cannot be empty."
        )

    admin_user = db.scalar(
        select(User).where(
            User.email == admin_email,
        )
    )

    user_created = False
    role_attached = False

    if admin_user is None:
        admin_user = User(
            email=admin_email,
            full_name=admin_name,
            password_hash=hash_password(admin_password),
            is_active=True,
        )

        db.add(admin_user)
        db.flush()

        user_created = True

    else:
        # Do NOT overwrite an existing user's password or profile.
        if not admin_user.is_active:
            admin_user.is_active = True

    if admin_role not in admin_user.roles:
        admin_user.roles.append(admin_role)
        role_attached = True

    return admin_user, user_created, role_attached


def seed() -> None:
    db = SessionLocal()

    try:
        admin_role, role_created = get_or_create_admin_role(db)

        permissions_created = 0
        permissions_updated = 0
        permissions_attached = 0

        for code, description in PERMISSIONS.items():
            (
                permission,
                created,
                updated,
            ) = get_or_create_permission(
                db=db,
                code=code,
                description=description,
            )

            if created:
                permissions_created += 1

            if updated:
                permissions_updated += 1

            if permission not in admin_role.permissions:
                admin_role.permissions.append(permission)
                permissions_attached += 1

        (
            admin_user,
            user_created,
            user_role_attached,
        ) = get_or_create_admin_user(
            db=db,
            admin_role=admin_role,
        )

        db.add(admin_role)
        db.add(admin_user)
        db.commit()

        db.refresh(admin_role)
        db.refresh(admin_user)

        print("========================================")
        print("EduSphere RBAC seed completed")
        print("========================================")
        print(
            f"Permissions defined : {len(PERMISSIONS)}"
        )
        print(
            f"Permissions created : {permissions_created}"
        )
        print(
            f"Permissions updated : {permissions_updated}"
        )
        print(
            f"Permissions attached: {permissions_attached}"
        )
        print(
            f"Admin role created  : "
            f"{'yes' if role_created else 'no'}"
        )
        print(
            f"Admin role ID       : {admin_role.id}"
        )
        print(
            f"Admin permissions   : "
            f"{len(admin_role.permissions)}"
        )
        print("----------------------------------------")
        print(
            f"Admin user created  : "
            f"{'yes' if user_created else 'no'}"
        )
        print(
            f"Admin user ID       : {admin_user.id}"
        )
        print(
            f"Admin role attached : "
            f"{'yes' if user_role_attached else 'no'}"
        )
        print(
            f"Admin email        : {admin_user.email}"
        )
        print("========================================")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed()