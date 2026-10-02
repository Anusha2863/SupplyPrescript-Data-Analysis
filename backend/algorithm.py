import pandas as pd


def calculate_risk_scores(df: pd.DataFrame) -> pd.DataFrame:
    """
    SupplyPrescript - Supply Chain Risk Score (SCRS)

    Weights:
    Inventory Risk       = 30%
    Lead-Time Risk       = 20%
    Defect Risk          = 20%
    Shipping-Cost Risk   = 15%
    Availability Risk    = 15%

    Final score: 0-100
    """

    data = df.copy()

    # Convert required columns to numeric
    numeric_columns = [
        "Stock levels",
        "Order quantities",
        "Lead times",
        "Lead time",
        "Defect rates",
        "Shipping costs",
        "Availability",
    ]

    for column in numeric_columns:
        data[column] = pd.to_numeric(
            data[column],
            errors="coerce"
        ).fillna(0)

    # --------------------------------------------------
    # 1. INVENTORY RISK
    # --------------------------------------------------
    inventory_ratio = (
        data["Order quantities"]
        / data["Stock levels"].replace(0, 1)
    )

    data["Inventory Risk"] = (
        inventory_ratio.clip(0, 3) / 3 * 100
    )

    # --------------------------------------------------
    # 2. LEAD-TIME RISK
    # --------------------------------------------------
    average_lead_time = (
        data["Lead times"] + data["Lead time"]
    ) / 2

    max_lead_time = average_lead_time.max()

    if max_lead_time > 0:
        data["Lead-Time Risk"] = (
            average_lead_time / max_lead_time * 100
        )
    else:
        data["Lead-Time Risk"] = 0

    # --------------------------------------------------
    # 3. DEFECT RISK
    # --------------------------------------------------
    max_defect_rate = data["Defect rates"].max()

    if max_defect_rate > 0:
        data["Defect Risk"] = (
            data["Defect rates"]
            / max_defect_rate
            * 100
        )
    else:
        data["Defect Risk"] = 0

    # --------------------------------------------------
    # 4. SHIPPING-COST RISK
    # --------------------------------------------------
    max_shipping_cost = data["Shipping costs"].max()

    if max_shipping_cost > 0:
        data["Shipping-Cost Risk"] = (
            data["Shipping costs"]
            / max_shipping_cost
            * 100
        )
    else:
        data["Shipping-Cost Risk"] = 0

    # --------------------------------------------------
    # 5. AVAILABILITY RISK
    # --------------------------------------------------
    max_availability = data["Availability"].max()

    if max_availability > 0:
        data["Availability Risk"] = (
            100
            - (
                data["Availability"]
                / max_availability
                * 100
            )
        )
    else:
        data["Availability Risk"] = 0

    # --------------------------------------------------
    # FINAL RISK SCORE
    # --------------------------------------------------
    data["Supply Chain Risk Score"] = (
        data["Inventory Risk"] * 0.30
        + data["Lead-Time Risk"] * 0.20
        + data["Defect Risk"] * 0.20
        + data["Shipping-Cost Risk"] * 0.15
        + data["Availability Risk"] * 0.15
    )

    data["Supply Chain Risk Score"] = (
        data["Supply Chain Risk Score"]
        .clip(0, 100)
        .round(2)
    )

    # --------------------------------------------------
    # RISK CATEGORY
    # --------------------------------------------------
    def classify_risk(score):
        if score < 35:
            return "Low Risk"
        elif score < 65:
            return "Medium Risk"
        else:
            return "High Risk"

    data["Risk Category"] = (
        data["Supply Chain Risk Score"]
        .apply(classify_risk)
    )

    return data
def calculate_supplier_performance(df: pd.DataFrame) -> pd.DataFrame:
    """
    Supplier Performance Score

    Factors:
    - Lead Time
    - Defect Rate
    - Manufacturing Cost
    - Inspection Result

    Final score: 0-100
    Higher score = better supplier performance.
    """

    data = df.copy()

    # Convert numeric columns
    numeric_columns = [
        "Lead time",
        "Defect rates",
        "Manufacturing costs",
    ]

    for column in numeric_columns:
        data[column] = pd.to_numeric(
            data[column],
            errors="coerce"
        ).fillna(0)

    # --------------------------------------------------
    # 1. LEAD-TIME PERFORMANCE
    # Lower lead time = better performance
    # --------------------------------------------------

    max_lead_time = data["Lead time"].max()

    if max_lead_time > 0:
        lead_time_performance = (
            100
            - (
                data["Lead time"]
                / max_lead_time
                * 100
            )
        ).clip(0, 100)
    else:
        lead_time_performance = 100

    # --------------------------------------------------
    # 2. DEFECT PERFORMANCE
    # Lower defect rate = better performance
    # --------------------------------------------------

    max_defect_rate = data["Defect rates"].max()

    if max_defect_rate > 0:
        defect_performance = (
            100
            - (
                data["Defect rates"]
                / max_defect_rate
                * 100
            )
        ).clip(0, 100)
    else:
        defect_performance = 100

    # --------------------------------------------------
    # 3. COST PERFORMANCE
    # Lower manufacturing cost = better performance
    # --------------------------------------------------

    max_cost = data["Manufacturing costs"].max()

    if max_cost > 0:
        cost_performance = (
            100
            - (
                data["Manufacturing costs"]
                / max_cost
                * 100
            )
        ).clip(0, 100)
    else:
        cost_performance = 100

    # --------------------------------------------------
    # 4. INSPECTION PERFORMANCE
    # --------------------------------------------------

    inspection = (
        data["Inspection results"]
        .astype(str)
        .str.strip()
        .str.lower()
    )

    inspection_performance = inspection.map({
        "pass": 100,
        "passed": 100,
        "fail": 0,
        "failed": 0
    }).fillna(50)

    # --------------------------------------------------
    # FINAL SUPPLIER PERFORMANCE SCORE
    # --------------------------------------------------

    data["Supplier Performance Score"] = (
        lead_time_performance * 0.30
        + defect_performance * 0.30
        + cost_performance * 0.20
        + inspection_performance * 0.20
    )

    data["Supplier Performance Score"] = (
        data["Supplier Performance Score"]
        .clip(0, 100)
        .round(2)
    )

    # --------------------------------------------------
    # PERFORMANCE CATEGORY
    # --------------------------------------------------

    def classify_performance(score):
        if score >= 75:
            return "Good"
        elif score >= 50:
            return "Average"
        else:
            return "Needs Improvement"

    data["Supplier Performance Category"] = (
        data["Supplier Performance Score"]
        .apply(classify_performance)
    )

    return data