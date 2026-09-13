from app.core.database import SessionLocal
from app.models.rbac import Permission, Role


PERMISSIONS = [
    "STUDENT_FEE_PLAN_CREATE",
    "STUDENT_FEE_PLAN_VIEW",
    "STUDENT_FEE_PLAN_UPDATE",
    "STUDENT_FEE_PLAN_STATUS_UPDATE",
]


def main():
    db = SessionLocal()

    try:
        admin_role = (
            db.query(Role)
            .filter(Role.name == "Admin")
            .first()
        )

        if not admin_role:
            raise RuntimeError(
                "Admin role not found. Run scripts\\seed_rbac.py first."
            )

        created = 0
        attached = 0

        for code in PERMISSIONS:
            permission = (
                db.query(Permission)
                .filter(Permission.code == code)
                .first()
            )

            if not permission:
                permission = Permission(code=code)
                db.add(permission)
                db.flush()
                created += 1

            if permission not in admin_role.permissions:
                admin_role.permissions.append(permission)
                attached += 1

        db.commit()

        print("Student Fee Plan RBAC seed completed")
        print(f"Permissions defined : {len(PERMISSIONS)}")
        print(f"Permissions created : {created}")
        print(f"Permissions attached: {attached}")
        print(f"Admin role ID       : {admin_role.id}")
        print(f"Admin permissions   : {len(admin_role.permissions)}")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    main()