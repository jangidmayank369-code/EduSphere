from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.rbac import Permission, Role
from app.models.user import User


PERMISSIONS = [
    ("RBAC_ROLE_CREATE", "Create RBAC roles"),
    ("RBAC_PERMISSION_CREATE", "Create RBAC permissions"),
    ("RBAC_ROLE_ASSIGN", "Assign roles to users"),
    ("RBAC_PERMISSION_ASSIGN", "Assign permissions to roles"),
    ("AUDIT_READ", "Read audit logs"),
    ("SCHOOL_CREATE", "Create schools"),
    ("SCHOOL_UPDATE", "Update school information"),
    ("ACADEMIC_SESSION_CREATE", "Create academic sessions"),
    ("ACADEMIC_SESSION_UPDATE", "Update academic sessions"),
    (
        "ACADEMIC_SESSION_SET_CURRENT",
        "Set the current academic session",
    ),
]


def get_or_create_permission(
    db,
    code: str,
    description: str,
) -> Permission:
    permission = db.scalar(
        select(Permission).where(Permission.code == code)
    )

    if permission:
        return permission

    permission = Permission(
        code=code,
        description=description,
    )

    db.add(permission)
    db.flush()

    return permission


def main() -> None:
    db = SessionLocal()

    try:
        admin_role = db.scalar(
            select(Role).where(Role.name == "Admin")
        )

        if not admin_role:
            admin_role = Role(
                name="Admin",
                description="System administrator",
            )
            db.add(admin_role)
            db.flush()

        for code, description in PERMISSIONS:
            permission = get_or_create_permission(
                db,
                code,
                description,
            )

            if permission not in admin_role.permissions:
                admin_role.permissions.append(permission)

        admin_user = db.scalar(
            select(User).where(
                User.email == "admin@example.com"
            )
        )

        if not admin_user:
            admin_user = User(
                email="admin@example.com",
                full_name="EduSphere Admin",
                password_hash=hash_password("Admin@12345"),
                is_active=True,
            )
            db.add(admin_user)
            db.flush()

        if admin_role not in admin_user.roles:
            admin_user.roles.append(admin_role)

        db.commit()

        print("RBAC SEED SUCCESS")
        print(f"Admin role ID: {admin_role.id}")
        print(f"Admin user ID: {admin_user.id}")
        print("School permissions:")
        print("  SCHOOL_CREATE")
        print("  SCHOOL_UPDATE")
        print("  ACADEMIC_SESSION_CREATE")
        print("  ACADEMIC_SESSION_UPDATE")
        print("  ACADEMIC_SESSION_SET_CURRENT")

    finally:
        db.close()


if __name__ == "__main__":
    main()