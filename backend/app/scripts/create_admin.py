"""Create an administrator account (admins can never sign up publicly).

Run from the backend folder:
    python -m app.scripts.create_admin --name "Admin Name" --email admin@example.com
You will be asked for the password (it is not shown or stored in shell history).
"""
import argparse
import getpass
import sys

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.core.validators import clean_name, validate_password
from app.models import User
from app.models.user import ROLE_ADMIN


def main() -> int:
    parser = argparse.ArgumentParser(description="Create an InternSetu administrator.")
    parser.add_argument("--name", required=True)
    parser.add_argument("--email", required=True)
    args = parser.parse_args()

    try:
        name = clean_name(args.name)
        password = getpass.getpass("Password: ")
        if password != getpass.getpass("Repeat password: "):
            print("Passwords do not match.")
            return 1
        validate_password(password)
    except ValueError as e:
        print(f"Error: {e}")
        return 1

    email = args.email.strip().lower()
    with SessionLocal() as db:
        if db.scalar(select(User.id).where(User.email == email)):
            print("An account with this email already exists.")
            return 1
        db.add(User(full_name=name, email=email, password_hash=hash_password(password), role=ROLE_ADMIN))
        db.commit()
    print(f"Administrator {email} created.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
