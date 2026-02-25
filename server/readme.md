# installazione 
cd server
pip install -r requirements.txt

# run
uvicorn server.main:app --reload --port 8000

ngrok
ngrok config add-authtoken 3A5DqfLTOCsml0cZVpLrX3YhWqH_5KAXmwcPWfYKcE9EqzfML
https://unexcrescent-unrepudiated-tanna.ngrok-free.dev 