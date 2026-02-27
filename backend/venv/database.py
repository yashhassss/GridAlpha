from sqlalchemy import create_engine

# The format is: postgresql://username:password@host:port/database_name
DATABASE_URL = "postgresql://postgres:nirostime123@localhost:5432/aipower"

try:
    engine = create_engine(DATABASE_URL)
    connection = engine.connect()
    print("SUCCESS: The Python Quant Engine is connected to the PostgreSQL Vault!")
    connection.close()
except Exception as e:
    print(f"FAILED: Could not connect to the database. Error: {e}")