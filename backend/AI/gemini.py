import os
from pathlib import Path
from typing import Optional, Dict, Any

from dotenv import load_dotenv
from google import genai


ENV_PATH = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=ENV_PATH)


RENTPROOF_SYSTEM_INSTRUCTIONS = """You are RentProof Assistant, the AI guide for RentProof.

Your job is to explain the product clearly, accurately, and in a helpful tone.
You speak to landlords, property managers, and tenants who are learning about the platform.

About RentProof:
- RentProof is a property operations platform for landlords and property managers.
- It has a Next.js frontend and a FastAPI backend.
- It helps users manage rent collection, maintenance, documents, tenant communication, and deposit disputes.

What RentProof can do:
- Show rent collection status across units in one dashboard.
- Track paid, late, and partial payments in real time.
- Send automated rent reminders.
- Manage maintenance requests with photos, assignment, updates, and resolution tracking.
- Capture move-in photo walkthroughs with timestamps so the record cannot be edited or deleted.
- Store leases, notices, addendums, and signed agreements in one place.
- Keep landlord-tenant conversations timestamped and logged.
- Track security deposit amounts and return deadlines.
- Generate dispute evidence packages for deposit disagreements.
- Provide a tenant portal for rent payment, maintenance, and move-in walkthroughs.
- Offer dashboard views for properties, units, rent status, payments, maintenance, and deposits.

Pricing plans:
- Starter: for individual landlords, up to 5 units.
- Growth: the most popular plan, up to 25 units, with deposit vault, dispute evidence export, messaging, move-out comparisons, and priority support.
- Pro: for professional property managers, unlimited units, team roles, white-label tenant portal, API access, vendor management, portfolio reporting, and dedicated support.

Important behavior rules:
- Only describe features that are actually part of RentProof.
- If asked about something not in the product, say it is not currently listed as a feature.
- Keep answers concise, practical, and easy to understand.
- When useful, tailor the explanation to the audience: landlord, property manager, or tenant.
- Do not invent pricing, integrations, compliance claims, or product capabilities.
- If the user asks what RentProof is, answer that it is a property operations platform that helps manage rental workflows end to end.

When responding, focus on the benefits: less manual tracking, better records, fewer disputes, and a cleaner tenant experience.
"""


def _build_system_prompt_with_context(context: Optional[Dict[str, Any]] = None) -> str:
    """Build a system prompt that includes user's actual data context"""
    prompt = RENTPROOF_SYSTEM_INSTRUCTIONS
    
    if context:
        user_name = context.get("user_name", "User")
        user_plan = context.get("user_plan", "growth")
        properties = context.get("properties", [])
        units = context.get("units", [])
        maintenance = context.get("maintenance_requests", [])
        
        # Build user context section
        user_context = f"\n\n## Your Account Context\n"
        user_context += f"User: {user_name}\n"
        user_context += f"Plan: {user_plan}\n"
        
        if properties:
            user_context += f"\nProperties ({len(properties)}):\n"
            for prop in properties[:5]:  # Limit to first 5
                addr = prop.get("address", "Unknown")
                user_context += f"  - {addr}\n"
        
        if units:
            user_context += f"\nUnits ({len(units)}):\n"
            for unit in units[:10]:  # Limit to first 10
                name = unit.get("name", "Unknown")
                tenant = unit.get("tenant", "Vacant")
                rent = unit.get("rentAmount", 0)
                status = unit.get("status", "unknown")
                user_context += f"  - {name}: {tenant} (${rent}, status: {status})\n"
        
        if maintenance:
            user_context += f"\nRecent Maintenance Requests ({len(maintenance)}):\n"
            for req in maintenance[:5]:  # Limit to first 5
                unit_name = req.get("unitName", "Unknown")
                title = req.get("title", "Unknown")
                status_m = req.get("status", "unknown")
                user_context += f"  - {unit_name}: {title} (status: {status_m})\n"
        
        user_context += "\nWhen the user asks about their properties, units, tenants, or maintenance requests, use this actual data to provide specific, tailored advice."
        prompt += user_context
    
    return prompt


class Gemini:
    def __init__(self, api_key):
        self.client = genai.Client(api_key=api_key)

    def generate_response(self, message: str, system_prompt: str) -> str:
        chat = self.client.chats.create(
            model="gemini-3.1-flash-lite",
            config={"system_instruction": system_prompt},
        )
        result = chat.send_message(message)
        return (result.text or "").strip()

    def gen_conv(self):
        while True:
            try:
                query = input("You: ").strip()
                if not query:
                    continue
                if query.lower() in {"bye", "exit", "quit"}:
                    print("Goodbye!")
                    break
                print(self.generate_response(query, RENTPROOF_SYSTEM_INSTRUCTIONS))
            except Exception as e:
                print(e)
                print(
                    "You ran out of API credits, please upgrade your plan to continue or wait until the quota resets."
                )
                break


class GeminiService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not set. Add it to backend/.env")
        self.gemini = Gemini(api_key)

    def ask(self, message: str, context: Optional[Dict[str, Any]] = None) -> str:
        if not message or not message.strip():
            raise ValueError("Message cannot be empty")
        
        # Build system prompt with context
        system_prompt = _build_system_prompt_with_context(context)
        return self.gemini.generate_response(message, system_prompt)

        
if __name__ == "__main__":
    service = GeminiService()
    service.gemini.gen_conv()

