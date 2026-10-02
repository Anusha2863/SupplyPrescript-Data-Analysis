# Supply Chain Risk Score (SCRS)

Purpose: prioritize supply-chain records that may require attention.

Inputs: stock, order quantity, defect rate, lead time, shipping cost, availability.

SCRS = 0.25 Inventory Risk + 0.20 Defect Risk + 0.20 Lead-Time Risk + 0.15 Shipping-Cost Risk + 0.20 Availability Risk.

Inventory Risk = ((Order Quantity - Stock Level) / max(Order Quantity,1))*100, clipped to 0–100.
Defect Risk = (Defect Rate / 5)*100.
Lead-Time Risk = Lead Time / dataset maximum lead time * 100.
Shipping-Cost Risk = Shipping Cost / dataset maximum shipping cost * 100.
Availability Risk = 100 - Availability.

Low < 35, Medium 35–64.99, High >= 65.

This is a deterministic business-rule algorithm, not machine learning. It is explainable because every score is based on five visible operational factors.
