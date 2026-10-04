import pandas as pd
import numpy as np
import joblib

from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


# ---------------------------------------------------------
# 1. Load dataset
# ---------------------------------------------------------

DATA_PATH = "../../supply_chain_data (1).csv"

df = pd.read_csv(DATA_PATH)

print("Dataset loaded successfully")
print("Rows:", len(df))
print("Columns:", len(df.columns))


# ---------------------------------------------------------
# 2. Display available columns
# ---------------------------------------------------------

print("\nAvailable columns:")
for column in df.columns:
    print("-", column)


# ---------------------------------------------------------
# 3. Select ML features
# ---------------------------------------------------------

features = [
    "Stock levels",
    "Number of products sold",
    "Order quantities",
    "Lead time",
    "Shipping times",
    "Shipping costs",
    "Manufacturing costs",
    "Defect rates",
    "Production volumes"
]


# ---------------------------------------------------------
# 4. Check required columns
# ---------------------------------------------------------

missing_columns = [column for column in features if column not in df.columns]

if missing_columns:
    print("\nMissing columns:")
    for column in missing_columns:
        print("-", column)

    raise ValueError(
        "Some required columns are missing from the dataset."
    )


# ---------------------------------------------------------
# 5. Clean numeric data
# ---------------------------------------------------------

for column in features:
    df[column] = pd.to_numeric(df[column], errors="coerce")


df = df.dropna(subset=features).copy()


# ---------------------------------------------------------
# 6. Create Supply Chain Risk Score
# ---------------------------------------------------------
# The score is created from operational risk indicators.
# This becomes the target that the ML model learns.

def calculate_risk_score(row):

    risk = 0

    # Low inventory
    if row["Stock levels"] < 10:
        risk += 20
    elif row["Stock levels"] < 25:
        risk += 10

    # High lead time
    if row["Lead time"] >= 25:
        risk += 20
    elif row["Lead time"] >= 18:
        risk += 10

    # Long shipping time
    if row["Shipping times"] >= 7:
        risk += 15
    elif row["Shipping times"] >= 5:
        risk += 8

    # High defect rate
    if row["Defect rates"] >= 4:
        risk += 20
    elif row["Defect rates"] >= 2:
        risk += 10

    # High manufacturing cost
    if row["Manufacturing costs"] >= 70:
        risk += 10
    elif row["Manufacturing costs"] >= 50:
        risk += 5

    # High shipping cost
    if row["Shipping costs"] >= 8:
        risk += 10
    elif row["Shipping costs"] >= 5:
        risk += 5

    # Normalize to 0-100
    return min(risk, 100)


df["Risk Score"] = df.apply(calculate_risk_score, axis=1)


# ---------------------------------------------------------
# 7. Create target
# ---------------------------------------------------------

X = df[features]

y = df["Risk Score"]


# ---------------------------------------------------------
# 8. Train/Test split
# ---------------------------------------------------------

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42
)


# ---------------------------------------------------------
# 9. Train Random Forest model
# ---------------------------------------------------------

model = RandomForestRegressor(
    n_estimators=200,
    random_state=42,
    max_depth=8
)


print("\nTraining Random Forest model...")

model.fit(X_train, y_train)


# ---------------------------------------------------------
# 10. Evaluate model
# ---------------------------------------------------------

predictions = model.predict(X_test)

mae = mean_absolute_error(y_test, predictions)
mse = mean_squared_error(y_test, predictions)
rmse = np.sqrt(mse)
r2 = r2_score(y_test, predictions)


print("\n-----------------------------")
print("MODEL PERFORMANCE")
print("-----------------------------")

print(f"MAE  : {mae:.2f}")
print(f"RMSE : {rmse:.2f}")
print(f"R2   : {r2:.2f}")


# ---------------------------------------------------------
# 11. Train final model on complete dataset
# ---------------------------------------------------------

model.fit(X, y)


# ---------------------------------------------------------
# 12. Save model
# ---------------------------------------------------------

MODEL_PATH = "supply_chain_risk_model.pkl"

joblib.dump(model, MODEL_PATH)


print("\nModel saved successfully:")
print(MODEL_PATH)


# ---------------------------------------------------------
# 13. Save feature list
# ---------------------------------------------------------

FEATURE_PATH = "model_features.pkl"

joblib.dump(features, FEATURE_PATH)

print("Feature list saved successfully:")
print(FEATURE_PATH)


# ---------------------------------------------------------
# 14. Generate predictions for all records
# ---------------------------------------------------------

df["ML Risk Score"] = model.predict(X)

df["ML Risk Score"] = df["ML Risk Score"].clip(0, 100)


# ---------------------------------------------------------
# 15. Create risk categories
# ---------------------------------------------------------

def risk_category(score):

    if score >= 70:
        return "High Risk"

    elif score >= 40:
        return "Medium Risk"

    else:
        return "Low Risk"


df["ML Risk Category"] = df["ML Risk Score"].apply(risk_category)


# ---------------------------------------------------------
# 16. Display highest-risk records
# ---------------------------------------------------------

result = df.sort_values(
    "ML Risk Score",
    ascending=False
)


print("\n-----------------------------")
print("TOP HIGH-RISK RECORDS")
print("-----------------------------")

columns_to_show = [
    "SKU",
    "Product type",
    "ML Risk Score",
    "ML Risk Category"
]

print(
    result[columns_to_show]
    .head(10)
    .to_string(index=False)
)


# ---------------------------------------------------------
# 17. Save prediction results
# ---------------------------------------------------------

OUTPUT_PATH = "ml_risk_predictions.csv"

result.to_csv(
    OUTPUT_PATH,
    index=False
)

print("\nPrediction file saved:")
print(OUTPUT_PATH)

print("\nML TRAINING COMPLETED SUCCESSFULLY!")