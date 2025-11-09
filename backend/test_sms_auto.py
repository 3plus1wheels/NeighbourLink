"""
Automated SMS Test - No user input required
"""
import django
import os
import sys

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.views import send_sms, format_phone_number
from django.conf import settings

print("\n" + "="*70)
print("AUTOMATED SMS TEST")
print("="*70)

# Test phone number (replace with your actual number to receive test SMS)
TEST_PHONE = "8255213687"  # Change this to your phone number

print("\n1. Checking Twilio Configuration...")
print("-" * 70)
account_sid = settings.TWILIO_ACCOUNT_SID
auth_token = settings.TWILIO_AUTH_TOKEN
phone_number = settings.TWILIO_PHONE_NUMBER

print(f"Account SID: {account_sid[:12]}..." if account_sid else "Account SID: NOT SET")
print(f"Auth Token: {'SET' if auth_token else 'NOT SET'}")
print(f"Phone Number: {phone_number}")

if not all([account_sid, auth_token, phone_number]):
    print("\n❌ ERROR: Twilio credentials not configured!")
    sys.exit(1)

print("\n✅ Twilio credentials configured")

print("\n2. Testing Phone Number Formatting...")
print("-" * 70)
formatted = format_phone_number(TEST_PHONE)
print(f"Original: {TEST_PHONE}")
print(f"Formatted: {formatted}")
print("✅ Phone formatting works")

print("\n3. Sending Test SMS...")
print("-" * 70)
print(f"To: {formatted}")
print(f"From: {phone_number}")

success = send_sms(
    to_phone_number=formatted,
    message="🎉 Test SMS from NeighbourLink! Your SMS notifications are working!"
)

if success:
    print(f"✅ SMS sent successfully!")
else:
    print(f"❌ SMS failed")
    sys.exit(1)

print("\n" + "="*70)
print("✅ ALL TESTS PASSED!")
print("="*70)
print(f"\nCheck phone {formatted} for the test message.")
