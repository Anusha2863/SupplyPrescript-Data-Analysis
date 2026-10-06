from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import joblib
import os

app = FastAPI(
    title="SupplyPrescript ML API",
    description="Machine Learning Risk Prediction API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(BASE_DIR, "supply_chain_risk_model.pkl")
FEATURE_PATH = os.path.join(BASE_DIR, "model_features.pkl")
PREDICTION_PATH = os.path.join(BASE_DIR, "ml_risk_predictions.csv")

model = joblib.load(MODEL_PATH)
model_features = joblib.load(FEATURE_PATH)

predictions = pd.read_csv(PREDICTION_PATH)


@app.get("/")
def root():
    return {
        "status": "success",
        "message": "SupplyPrescript ML API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model_loaded": True
    }


@app.get("/api/ml-risk-scores")
def get_ml_risk_scores():

    data = predictions.copy()

    return {
        "status": "success",
        "total_records": len(data),
        "data": data.to_dict(orient="records")
    }


@app.get("/api/ml-summary")
def get_ml_summary():

    data = predictions.copy()

    high = int(
        (data["ML Risk Category"] == "High Risk").sum()
    )

    medium = int(
        (data["ML Risk Category"] == "Medium Risk").sum()
    )

    low = int(
        (data["ML Risk Category"] == "Low Risk").sum()
    )

    return {
        "status": "success",
        "total_records": len(data),
        "average_risk_score": round(
            float(data["ML Risk Score"].mean()), 2
        ),
        "high_risk": high,
        "medium_risk": medium,
        "low_risk": low
    }
