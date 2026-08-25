import pytest

def test_health_news_endpoint(client):
    """Verify curated and live public health news feed API."""
    response = client.get("/api/health-news")
    assert response.status_code == 200
    data = response.json()
    assert "articles" in data
    assert isinstance(data["articles"], list)


def test_qr_health_id_generation_and_verification(client):
    """Verify generating signed QR health token and passport access."""
    payload = {
        "userId": "PAT-123",
        "userName": "Rajesh Kumar"
    }
    gen_res = client.post("/api/qr/generate", json=payload)
    assert gen_res.status_code == 200
    gen_data = gen_res.json()
    assert "token" in gen_data
    assert "qrImage" in gen_data
    assert "passportId" in gen_data

    # Fetch patient profile
    patient_res = client.get("/api/patient/PAT-123")
    assert patient_res.status_code == 200
    patient_data = patient_res.json()
    assert patient_data["id"] == "PAT-123"
    assert "diagnoses" in patient_data


def test_document_ingestion_validation(client):
    """Verify document ingestion rejects invalid file types."""
    files = {"file": ("test.exe", b"invalid executable bytes", "application/x-msdownload")}
    response = client.post("/api/ingest-document", files=files)
    assert response.status_code == 400
    data = response.json()
    assert "detail" in data
    assert "Unsupported file type" in data["detail"]


def test_ocr_parse_invalid_file_type(client):
    """Verify OCR endpoint rejects unallowed file extensions with a 400 error."""
    files = {"file": ("script.sh", b"#!/bin/bash echo hello", "text/x-sh")}
    response = client.post("/api/ocr/parse", files=files, data={"doc_type": "govt_id"})
    assert response.status_code == 400
    data = response.json()
    assert "Unsupported file type" in data["detail"]


def test_insights_generation(client, monkeypatch):
    """Verify AI clinical insights endpoint returns structured health advice."""
    from unittest.mock import MagicMock
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "candidates": [{
            "content": {
                "parts": [{
                    "text": '[{"category": "Heart Rate", "icon": "favorite", "status": "Normal", "statusColor": "green", "insight": "Normal heart rate.", "tip": "Keep active."}]'
                }]
            }
        }]
    }
    import requests
    monkeypatch.setattr(requests, "post", lambda *args, **kwargs: mock_resp)
    response = client.get("/api/health-insights")
    assert response.status_code == 200
    data = response.json()
    assert "insights" in data
    assert isinstance(data["insights"], list)
    assert len(data["insights"]) > 0

