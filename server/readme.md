# installazione 
cd server
pip install -r requirements.txt

# run
uvicorn server.main:app --reload --port 8000
