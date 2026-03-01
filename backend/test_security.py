import requests
import time

url = "http://127.0.0.1:8001/api/power-alpha"

success_count = 0
fail_count = 0

print("Testing rate limiter (allowance 60/min)...")
for i in range(65):
    try:
        response = requests.get(url)
        if response.status_code == 200:
            success_count += 1
        elif response.status_code == 429:
            fail_count += 1
    except requests.exceptions.ConnectionError:
        print("Backend is not running. Start uvicorn first.")
        break
        
print(f"Success: {success_count}, Fail (429): {fail_count}")

# Test invalid payload
url_sim = "http://127.0.0.1:8001/api/simulate"
print("Testing invalid payload validation (negative MW)...")
invalid_payload = {
    "target_company": "Microsoft",
    "extra_mw": -50,
    "hardware_type": "H100"
}
try:
    response = requests.post(url_sim, json=invalid_payload)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 422:
        print("Validation working as expected (422 Unprocessable Entity).")
    else:
        print("Validation failed. Check Pydantic schemas.")
except requests.exceptions.ConnectionError:
    pass
