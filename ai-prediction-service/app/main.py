from fastapi import FastAPI
from pydantic import BaseModel
from sklearn.linear_model import LinearRegression
import numpy as np

app = FastAPI(title="MYCROWB AI Prediction Service", version="1.0.0")

class PredictionInput(BaseModel):
    shopId: str
    previous_hair_collection: float
    shop_size: float
    customer_frequency: float

class PredictionOutput(BaseModel):
    predicted_hair_next_month: float
    model_version: str

# Seeded lightweight baseline model; replace with persisted training pipeline in production.
X = np.array([
    [10, 250, 400],
    [15, 300, 500],
    [8, 200, 320],
    [20, 450, 700],
    [12, 260, 420],
])
y = np.array([11, 16, 9, 22, 13])
model = LinearRegression().fit(X, y)

@app.get('/health')
def health():
    return {'status': 'ok'}

@app.post('/predict', response_model=PredictionOutput)
def predict(payload: PredictionInput):
    features = np.array([[payload.previous_hair_collection, payload.shop_size, payload.customer_frequency]])
    prediction = model.predict(features)[0]
    return PredictionOutput(predicted_hair_next_month=round(float(prediction), 2), model_version='linreg-v1')
