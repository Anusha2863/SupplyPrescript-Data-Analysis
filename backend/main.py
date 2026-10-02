
from pathlib import Path

import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

from algorithm import (
    calculate_risk_scores,
    calculate_supplier_performance
)


# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent

CSV_PATH = PROJECT_DIR / "public" / "supply_chain_data.csv"

load_dotenv(BASE_DIR / ".env")

DB_USER = "postgres"
DB_PASSWORD = "anu20"
DB_HOST = "localhost"
DB_PORT = "5432"
DB_NAME = "supplyprescript"

TABLE_NAME = "supply_chain_data"

DATABASE_URL = (
    f"postgresql+psycopg2://"
    f"{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)


# ============================================================
# DATABASE ENGINE
# ============================================================

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="SupplyPrescript API",
    description="Supply Chain Performance Dashboard Backend",
    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# DATABASE HELPER
# ============================================================

def load_data():
    """
    Load supply-chain data from PostgreSQL.
    """

    query = text(f'SELECT * FROM "{TABLE_NAME}"')

    with engine.connect() as connection:
        df = pd.read_sql(query, connection)

    return df


# ============================================================
# JSON CLEANING HELPER
# ============================================================

def clean_dataframe(df):
    """
    Convert NaN and infinite values into JSON-safe values.
    """

    df = df.replace(
        [float("inf"), float("-inf")],
        None
    )

    df = df.where(
        pd.notnull(df),
        None
    )

    return df


# ============================================================
# GET /
# ============================================================

@app.get("/")
def root():

    return {
        "status": "success",
        "message": "SupplyPrescript API is running",
        "database": DB_NAME
    }


# ============================================================
# GET /health
# ============================================================

@app.get("/health")
def health():

    try:

        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "status": "healthy",
            "database": "connected",
            "database_name": DB_NAME
        }

    except Exception as e:

        return {
            "status": "unhealthy",
            "database": "disconnected",
            "database_name": DB_NAME,
            "error": str(e)
        }


# ============================================================
# GET /api/data
# ============================================================

@app.get("/api/data")
def get_data():

    try:

        df = load_data()

        df = clean_dataframe(df)

        records = df.to_dict(
            orient="records"
        )

        return {
            "status": "success",
            "total_records": len(records),
            "data": records
        }

    except Exception as e:

        return {
            "status": "error",
            "total_records": 0,
            "data": [],
            "message": str(e)
        }


# ============================================================
# GET /api/risk-scores
# ============================================================

@app.get("/api/risk-scores")
def get_risk_scores():

    try:

        df = load_data()

        if df.empty:

            return {
                "status": "success",
                "total_records": 0,
                "data": []
            }

        result = calculate_risk_scores(df)

        result = clean_dataframe(result)

        records = result.to_dict(
            orient="records"
        )

        return {
            "status": "success",
            "total_records": len(records),
            "data": records
        }

    except Exception as e:

        return {
            "status": "error",
            "total_records": 0,
            "data": [],
            "message": str(e)
        }


# ============================================================
# GET /api/summary
# ============================================================

@app.get("/api/summary")
def get_summary():

    try:

        df = load_data()

        total_products = len(df)

        total_units_sold = float(
            pd.to_numeric(
                df["Number of products sold"],
                errors="coerce"
            ).sum()
        )

        total_revenue = float(
            pd.to_numeric(
                df["Revenue generated"],
                errors="coerce"
            ).sum()
        )

        total_inventory = float(
            pd.to_numeric(
                df["Stock levels"],
                errors="coerce"
            ).sum()
        )

        average_defect_rate = float(
            pd.to_numeric(
                df["Defect rates"],
                errors="coerce"
            ).mean()
        )

        average_shipping_cost = float(
            pd.to_numeric(
                df["Shipping costs"],
                errors="coerce"
            ).mean()
        )

        average_lead_time = float(
            pd.to_numeric(
                df["Lead time"],
                errors="coerce"
            ).mean()
        )

        return {
            "status": "success",
            "summary": {
                "total_products": total_products,
                "total_units_sold": total_units_sold,
                "total_revenue": total_revenue,
                "total_inventory": total_inventory,
                "average_defect_rate": average_defect_rate,
                "average_shipping_cost": average_shipping_cost,
                "average_lead_time": average_lead_time
            }
        }

    except Exception as e:

        return {
            "status": "error",
            "message": str(e)
        }


# ============================================================
# GET /api/products
# ============================================================

@app.get("/api/products")
def get_products():

    try:

        df = load_data()

        columns = [
            "Product type",
            "SKU",
            "Price",
            "Availability",
            "Number of products sold",
            "Revenue generated"
        ]

        available_columns = [
            column
            for column in columns
            if column in df.columns
        ]

        result = df[available_columns]

        result = clean_dataframe(result)

        records = result.to_dict(
            orient="records"
        )

        return {
            "status": "success",
            "total_records": len(records),
            "data": records
        }

    except Exception as e:

        return {
            "status": "error",
            "total_records": 0,
            "data": [],
            "message": str(e)
        }


# ============================================================
# GET /api/inventory
# ============================================================

@app.get("/api/inventory")
def get_inventory():

    try:

        df = load_data()

        columns = [
            "SKU",
            "Product type",
            "Stock levels",
            "Number of products sold",
            "Order quantities",
            "Availability"
        ]

        available_columns = [
            column
            for column in columns
            if column in df.columns
        ]

        result = df[available_columns]

        result = clean_dataframe(result)

        records = result.to_dict(
            orient="records"
        )

        return {
            "status": "success",
            "total_records": len(records),
            "data": records
        }

    except Exception as e:

        return {
            "status": "error",
            "total_records": 0,
            "data": [],
            "message": str(e)
        }


# ============================================================
# GET /api/suppliers
# ============================================================

@app.get("/api/suppliers")
def get_suppliers():

    try:

        df = load_data()

        columns = [
            "Supplier name",
            "Location",
            "Lead time",
            "Production volumes",
            "Manufacturing costs",
            "Inspection results",
            "Defect rates"
        ]

        available_columns = [
            column
            for column in columns
            if column in df.columns
        ]

        result = df[available_columns]

        result = clean_dataframe(result)

        records = result.to_dict(
            orient="records"
        )

        return {
            "status": "success",
            "total_records": len(records),
            "data": records
        }

    except Exception as e:

        return {
            "status": "error",
            "total_records": 0,
            "data": [],
            "message": str(e)
        }


# ============================================================
# GET /api/supplier-performance
# ============================================================

@app.get("/api/supplier-performance")
def get_supplier_performance():

    try:

        df = load_data()

        result = calculate_supplier_performance(df)

        columns = [
            "Supplier name",
            "Location",
            "Lead time",
            "Defect rates",
            "Manufacturing costs",
            "Inspection results",
            "Supplier Performance Score",
            "Supplier Performance Category"
        ]

        available_columns = [
            column
            for column in columns
            if column in result.columns
        ]

        result = result[available_columns]

        result = clean_dataframe(result)

        records = result.to_dict(
            orient="records"
        )

        return {
            "status": "success",
            "total_records": len(records),
            "data": records
        }

    except Exception as e:

        return {
            "status": "error",
            "total_records": 0,
            "data": [],
            "message": str(e)
        }


# ============================================================
# GET /api/logistics
# ============================================================

@app.get("/api/logistics")
def get_logistics():

    try:

        df = load_data()

        columns = [
            "Shipping times",
            "Shipping carriers",
            "Shipping costs",
            "Transportation modes",
            "Routes",
            "Location"
        ]

        available_columns = [
            column
            for column in columns
            if column in df.columns
        ]

        result = df[available_columns]

        result = clean_dataframe(result)

        records = result.to_dict(
            orient="records"
        )

        return {
            "status": "success",
            "total_records": len(records),
            "data": records
        }

    except Exception as e:

        return {
            "status": "error",
            "total_records": 0,
            "data": [],
            "message": str(e)
        }


# ============================================================
# GET /api/quality
# ============================================================

@app.get("/api/quality")
def get_quality():

    try:

        df = load_data()

        columns = [
            "SKU",
            "Product type",
            "Inspection results",
            "Defect rates",
            "Supplier name",
            "Manufacturing costs"
        ]

        available_columns = [
            column
            for column in columns
            if column in df.columns
        ]

        result = df[available_columns]

        result = clean_dataframe(result)

        records = result.to_dict(
            orient="records"
        )

        return {
            "status": "success",
            "total_records": len(records),
            "data": records
        }

    except Exception as e:

        return {
            "status": "error",
            "total_records": 0,
            "data": [],
            "message": str(e)
        }


# ============================================================
# STARTUP
# ============================================================

@app.on_event("startup")
def startup_event():

    print("=" * 60)
    print("SupplyPrescript API started")
    print(f"Database : {DB_NAME}")
    print(f"Table    : {TABLE_NAME}")
    print("Risk Engine : Active")
    print("Supplier Performance Engine : Active")
    print("CORS : Enabled")
    print("=" * 60)
