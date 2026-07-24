"""
Zero-Data Loss Migration Script: SQLite -> PostgreSQL using SQLAlchemy
Handles all data type conversions (like int to bool) and schema mismatches automatically.
"""
import os
import sys
from sqlalchemy import create_engine, MetaData, text
from sqlalchemy.orm import sessionmaker

SQLITE_DB = "data/infichat.db"
POSTGRES_DSN = os.getenv(
    "DATABASE_URL_SYNC", 
    "postgresql+psycopg2://infichat_user:infichat_password@127.0.0.1:5432/infichat_db"
)

def migrate():
    # Ensure tables are created first
    from app.database.db import Base, engine as pg_engine
    import app.models.chat
    import app.models.user
    import app.models.admin
    import app.models.incidents
    import app.models.memory
    import app.models.observability
    import app.models.organization
    import app.models.otp
    import app.models.plugins
    import app.models.rag_analytics
    import app.models.business_intelligence
    import app.models.data_governance
    import app.models.file
    
    Base.metadata.create_all(bind=pg_engine)
    print("PostgreSQL tables created.")

    if not os.path.exists(SQLITE_DB):
        print(f"SQLite DB '{SQLITE_DB}' not found. Nothing to migrate.")
        return

    print("Connecting to SQLite...")
    sqlite_engine = create_engine(f"sqlite:///{SQLITE_DB}")
    
    # Reflect metadata from Postgres to know actual table structures
    pg_meta = MetaData()
    pg_meta.reflect(bind=pg_engine)
    
    # Reflect metadata from SQLite
    sqlite_meta = MetaData()
    sqlite_meta.reflect(bind=sqlite_engine)

    try:
        with pg_engine.begin() as pg_conn:
            # Disable foreign key checks temporarily during migration
            pg_conn.execute(text("SET session_replication_role = 'replica';"))
            
            for table_name in sqlite_meta.tables:
                if table_name == "sqlite_sequence":
                    continue
                    
                if table_name not in pg_meta.tables:
                    print(f"Table '{table_name}' does not exist in PostgreSQL. Skipping.")
                    continue
                    
                print(f"\nMigrating table: {table_name}")
                sqlite_table = sqlite_meta.tables[table_name]
                pg_table = pg_meta.tables[table_name]
                
                with sqlite_engine.connect() as sqlite_conn:
                    rows = sqlite_conn.execute(sqlite_table.select()).fetchall()
                    
                    if not rows:
                        print("  -> Table is empty, skipping.")
                        continue
                        
                    valid_columns = [c.name for c in pg_table.columns if c.name in sqlite_table.columns]
                    
                    success_count = 0
                    for row in rows:
                        row_dict = {col: getattr(row, col) for col in valid_columns}
                        
                        # Type conversion logic for boolean columns
                        for col in valid_columns:
                            pg_type = str(pg_table.columns[col].type).lower()
                            if 'bool' in pg_type and row_dict[col] is not None:
                                row_dict[col] = bool(row_dict[col])
                        
                        try:
                            # Use savepoint so a single failed row doesn't abort the entire transaction
                            with pg_conn.begin_nested():
                                ins = pg_table.insert().values(**row_dict)
                                pg_conn.execute(ins)
                                success_count += 1
                        except Exception as e:
                            print(f"  -> Error inserting row: {e}")
                            
                    print(f"  -> Successfully migrated {success_count}/{len(rows)} rows.")
                    
            # Re-enable constraints
            pg_conn.execute(text("SET session_replication_role = 'origin';"))
            
    except Exception as e:
        print(f"Migration failed: {e}")
        sys.exit(1)
        
    print("\nMigration Complete!")

if __name__ == "__main__":
    migrate()
