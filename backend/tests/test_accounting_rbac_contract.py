from pathlib import Path
import ast

ROOT = Path(__file__).resolve().parents[1]


def test_accounting_permissions_are_seeded():
    source = (ROOT / "scripts" / "seed_rbac.py").read_text(encoding="utf-8")
    tree = ast.parse(source)
    permissions = next(
        node.value
        for node in tree.body
        if isinstance(node, ast.Assign)
        and any(isinstance(target, ast.Name) and target.id == "PERMISSIONS" for target in node.targets)
    )
    assert isinstance(permissions, ast.Dict)
    codes = {key.value for key in permissions.keys if isinstance(key, ast.Constant)}
    assert "ACCOUNTING_TRANSACTION_VIEW" in codes
    assert "ACCOUNTING_TRANSACTION_CREATE" in codes


def test_accounting_routes_use_seeded_accounting_permissions():
    files = [
        ROOT / "app" / "api" / "routes" / "accounting.py",
        ROOT / "app" / "api" / "routes" / "accounting_transactions.py",
    ]
    for path in files:
        source = path.read_text(encoding="utf-8")
        assert 'require_permission("ACCOUNTING_TRANSACTION_VIEW")' in source
        assert 'require_permission("ACCOUNTING_TRANSACTION_CREATE")' in source
        assert 'require_permission("FEE_PAYMENT_VIEW")' not in source
        assert 'require_permission("FEE_PAYMENT_CREATE")' not in source
