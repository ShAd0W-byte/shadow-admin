
# ABAC Engine — Authorization Logic
# Shadow Admin CTF

class User:
    def __init__(self, user_id: str, role: str):
        self.id = user_id
        self.role = role  # 'dev' or 'admin'


class Server:
    def __init__(
        self,
        server_id: str,
        owner_id: str | None,
        environment: str,   # 'Dev' or 'Prod'
        status: str         # 'active', 'orphaned', 'quarantined'
    ):
        self.id = server_id
        self.owner_id = owner_id
        self.environment = environment
        self.status = status


def can_access(user: User, server: Server) -> bool:
    """
    ABAC POLICY (FINAL, CORRECT, INTENTIONAL)

    ALLOW access IF:

    (
        server.environment == "Dev"
        AND server.owner_id == user.id
    )

    OR

    (
        server.environment == "Prod"
        AND (
            user.role == "admin"
            OR server.owner_id == user.id
        )
    )
    """

    # Rule 1: Dev environment
    if server.environment == "Dev":
        return server.owner_id == user.id

    # Rule 2: Prod environment
    if server.environment == "Prod":
        if user.role == "admin":
            return True
        return server.owner_id == user.id

    # Defensive default (should never happen)
    return False
