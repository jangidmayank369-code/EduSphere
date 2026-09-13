from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.rbac import Permission, Role
from app.models.user import User


SCHOOL_PERMISSIONS = [
    "SCHOOL_CREATE",
    "SCHOOL_UPDATE",
    "ACADEMIC_SESSION_CREATE",
    "ACADEMIC_SESSION_UPDATE",
    "ACADEMIC_SESSION_SET_CURRENT",
]

USER_PERMISSIONS = [
    "USER_READ",
    "USER_CREATE",
    "USER_UPDATE",
    "USER_STATUS_UPDATE",
    "USER_PASSWORD_RESET",
    "USER_DELETE",
]

ALL_PERMISSIONS = SCHOOL_PERMISSIONS + USER_PERMISSIONS


def get_or_create_permission(db, code):
    permission = db.scalar(
        select(Permission).where(
            Permission.code == code
        )
    )

    if permission is None:
        permission = Permission(
            code=code,
            description=code.replace(
                "_",
                " ",
            ).title(),
        )
        db.add(permission)
        db.flush()

    return permission


def get_or_create_admin_role(db):
    role = db.scalar(
        select(Role).where(
            Role.name == "Admin"
        )
    )

    if role is None:
        role = Role(
            name="Admin",
            description="System administrator",
        )
        db.add(role)
        db.flush()

    return role


def get_or_create_admin_user(db):
    user = db.scalar(
        select(User).where(
            User.email == "admin@example.com"
        )
    )

    if user is None:
        from app.core.security import hash_password

        user = User(
            email="admin@example.com",
            full_name="System Administrator",
            password_hash=hash_password(
                "Admin@12345"
            ),
            is_active=True,
        )

        db.add(user)
        db.flush()

    return user


def assign_permission_to_role(
    db,
    role,
    permission,
):
    if permission not in role.permissions:
        role.permissions.append(permission)


def assign_role_to_user(
    db,
    user,
    role,
):
    if role not in user.roles:
        user.roles.append(role)


def main():
    db = SessionLocal()

    try:
        admin_role = get_or_create_admin_role(db)
        admin_user = get_or_create_admin_user(db)

        permissions = {
            code: get_or_create_permission(
                db,
                code,
            )
            for code in ALL_PERMISSIONS
        }

        for permission in permissions.values():
            assign_permission_to_role(
                db,
                admin_role,
                permission,
            )

        assign_role_to_user(
            db,
            admin_user,
            admin_role,
        )

        db.commit()

        print()
        print("RBAC SEED SUCCESS")
        print(f"Admin role ID: {admin_role.id}")
        print(f"Admin user ID: {admin_user.id}")

        print()
        print("School permissions:")

        for code in SCHOOL_PERMISSIONS:
            print(f"  {code}")

        print()
        print("User permissions:")

        for code in USER_PERMISSIONS:
            print(f"  {code}")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    main()