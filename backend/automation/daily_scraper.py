import os
import time
import logging
import re
from datetime import datetime
import threading

import requests
from bs4 import BeautifulSoup
import schedule
from dotenv import load_dotenv

from backend.db import supabase_client
from backend.output import twilio_dispatcher

logger = logging.getLogger(__name__)

MESCOM_RURAL_URL = "https://mescomruralpayment.mesco.in/"

# --- Scraping Logic ---

def scrape_due_amount(rr_number: str) -> float:
    """
    Scrape the MESCOM rural payment portal for a specific RR Number to find the due amount.
    Hackathon stub: Because the exact ASP.NET form variables require a full browser session
    or explicit VIEWSTATE handling, this performs a basic POST or GET and searches for a ₹ pattern.
    You will need to adjust the form payload to match the real site's requirements.
    """
    try:
        # Example to fetch the initial VIEWSTATE:
        session = requests.Session()
        resp = session.get(MESCOM_RURAL_URL, timeout=10)
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        viewstate = soup.find("input", {"id": "__VIEWSTATE"})
        viewstate_val = viewstate["value"] if viewstate else ""
        
        event_val = soup.find("input", {"id": "__EVENTVALIDATION"})
        event_val_val = event_val["value"] if event_val else ""

        # Send the RR Number in the form payload
        # Replace 'txtRRNumber' or equivalent with actual input ID from the site
        payload = {
            "__VIEWSTATE": viewstate_val,
            "__EVENTVALIDATION": event_val_val,
            "txtRRNumber": rr_number,  # IMPORTANT: Check actual input name
            "btnSubmit": "Submit"      # IMPORTANT: Check actual button name
        }
        
        post_resp = session.post(MESCOM_RURAL_URL, data=payload, timeout=15)
        
        # Scrape amount logic
        # For the hackathon, we simulate finding the amount in the HTML
        result_soup = BeautifulSoup(post_resp.text, 'html.parser')
        amount_text = result_soup.text
        
        # Look for "Net Amount Due: 1540" or similar
        match = re.search(r'(?i)(?:total|net|amount)?\s*due[\s:]*(?:Rs\.?|INR|₹)?\s*([\d\.,]+)', amount_text)
        if match:
            due = float(match.group(1).replace(",", ""))
            return due
        
    except Exception as e:
        logger.error(f"Error scraping data for RR Number {rr_number}: {e}")
        
    return 0.0

# --- Automation Pipeline ---

def run_daily_scraping_job():
    """Fetches all users, checks their MESCOM due amount, and dispatches a reminder."""
    logger.info("Starting daily MESCOM bill scraping job...")
    try:
        client = supabase_client.init_client()
        
        # Fetch users and their recent bills to extract their RR number
        response = client.table("users").select("id, phone_number, bills(rr_number, created_at)").execute()
        users = response.data
        
        for user in users:
            bills = user.get("bills", [])
            if not bills:
                continue
                
            # Get latest valid rr_number
            bills.sort(key=lambda b: b["created_at"], reverse=True)
            latest_rr = None
            for b in bills:
                if b.get("rr_number"):
                    latest_rr = b["rr_number"]
                    break
                    
            if not latest_rr:
                continue
                
            # Scrape using the RR Number
            amount_due = scrape_due_amount(latest_rr)
            
            if amount_due > 0:
                logger.info(f"User {user['phone_number']} (RR: {latest_rr}) has a due of ₹{amount_due}.")
                
                message = (
                    f"Hi there! ⚡\n\n"
                    f"It looks like your MESCOM account ({latest_rr}) has an outstanding due of *Rs. {amount_due}*.\n\n"
                    f"📸 Reply with a clear photo of your latest bill, and I'll analyze it to see if you can save on your charges!"
                )
                
                # Dispatch Twilio message
                twilio_dispatcher.send_text(user["phone_number"], message)
                
    except Exception as e:
        logger.exception(f"Failed to run daily scraping job: {e}")

# --- Scheduler ---

def start_scheduler():
    """Starts the schedule loop in a background thread."""
    # Example: Run every day at 10:00 AM
    schedule.every().day.at("10:00").do(run_daily_scraping_job)
    
    logger.info("Automation scheduler started. Will run daily at 10:00 AM.")
    
    def loop():
        while True:
            schedule.run_pending()
            time.sleep(60)
            
    thread = threading.Thread(target=loop, daemon=True)
    thread.start()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    load_dotenv()
    run_daily_scraping_job()
