
import pandas as pd
from database import engine

CSV_PATH = "../public/supply_chain_data.csv"

TABLE_NAME = "supply_chain_data"

print("Reading CSV...")
df = pd.read_csv(CSV_PATH)

print(f"Rows found: {len(df)}")
print(f"Columns found: {len(df.columns)}")

print("Loading data into PostgreSQL...")

df.to_sql(
    TABLE_NAME,
    engine,
    if_exists="replace",
    index=False
)

print()
print("SUCCESS!")
print(f"Table '{TABLE_NAME}' created in database 'supplyprescript'.")
print(f"Total rows loaded: {len(df)}")
