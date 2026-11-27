from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import pipeline

app = FastAPI(title="Dab Automotive BERT Sentiment Service")

sentiment_pipeline = pipeline(
    "sentiment-analysis",
    model="distilbert-base-uncased-finetuned-sst-2-english"
)

class PredictRequest(BaseModel):
    text: str

@app.get("/health")
def health():
    return {"status": "ok", "model": "distilbert-base-uncased-finetuned-sst-2-english"}

@app.post("/predict")
def predict_sentiment(payload: PredictRequest):
    cleaned = payload.text.strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="Text must not be empty.")

    result = sentiment_pipeline(cleaned[:512])[0]
    label = result["label"].upper()
    score = round(float(result["score"]), 4)

    if score < 0.65:
        label = "NEUTRAL"

    return {
        "sentiment_label": label,
        "confidence_score": score,
        "model_version": "distilbert-base-uncased-finetuned-sst-2-english"
    }