#!/usr/bin/env python
"""
Quick SMS Test Script
Run with: python3 manage.py shell < test_sms_quick.py
"""

from django.contrib.auth.models import User
from api.models import Profile, NotificationPreference, Post
from api.views import calculate_distance, create_proximity_notifications, format_phone_number, send_sms
from django.conf import settings

print("\n" + "="*70)
print("SMS NOTIFICATION TEST")
print("="*70)

# Test 1: Check Twilio Configuration
print("\n1. Checking Twilio Configuration...")
print("-" * 70)
print(f"Account SID: {settings.TWILIO_ACCOUNT_SID[:10]}..." if settings.TWILIO_ACCOUNT_SID else "Account SID: NOT SET")
print(f"Auth Token: {'SET' if settings.TWILIO_AUTH_TOKEN else 'NOT SET'}")
print(f"Phone Number: {settings.TWILIO_PHONE_NUMBER}" if settings.TWILIO_PHONE_NUMBER else "Phone Number: NOT SET")

if not all([settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN, settings.TWILIO_PHONE_NUMBER]):
    print("\n❌ ERROR: Twilio credentials not configured!")
    print("Please set in your .env file or settings.py")
    exit(1)
else:
    print("\n✅ Twilio credentials configured")

# Test 2: Phone Number Formatting
print("\n2. Testing Phone Number Formatting...")
print("-" * 70)
test_phones = [
    '8255213687',
    '+18255213687',
    '(825) 521-3687',
]

for phone in test_phones:
    formatted = format_phone_number(phone)
    status = "✅" if formatted else "❌"
    print(f"{status} {phone:20s} -> {formatted}")

# Test 3: Direct SMS Test
print("\n3. Testing Direct SMS Send...")
print("-" * 70)
test_phone = input("Enter your phone number to test (e.g., 8255213687): ").strip()

if test_phone:
    formatted = format_phone_number(test_phone)
    print(f"Formatted: {formatted}")
    
    if formatted:
        print(f"\nSending test SMS to {formatted}...")
        success = send_sms(formatted, "Test SMS from NeighbourLink! If you receive this, SMS is working. 🎉")
        
        if success:
            print(f"✅ SMS sent successfully!")
            print(f"📱 Check your phone: {formatted}")
        else:
            print(f"❌ Failed to send SMS")
            print("Check the logs above for error details")
    else:
        print("❌ Invalid phone number format")
else:
    print("⏭️  Skipped direct SMS test")

# Test 4: Full Notification Test
print("\n4. Testing Full Notification System...")
print("-" * 70)
response = input("Create test users and post? (y/n): ").strip().lower()

if response == 'y':
    # Clean up
    User.objects.filter(username__in=['smsuser1', 'smsuser2']).delete()
    
    # Create User 1 (receiver)
    user1 = User.objects.create_user('smsuser1', 'test1@example.com', 'pass123')
    user1.profile.latitude = 37.7956
    user1.profile.longitude = -122.3933
    user1.profile.phone_number = test_phone if test_phone else '+18255213687'
    user1.profile.save()
    
    # Enable SMS
    pref = NotificationPreference.objects.get(user=user1)
    pref.sms_enabled = True
    pref.email_enabled = True
    pref.min_urgency = 'low'
    pref.save()
    
    print(f"✅ Created user1: {user1.username}")
    print(f"   Phone: {user1.profile.phone_number}")
    print(f"   SMS enabled: {pref.sms_enabled}")
    
    # Create User 2 (poster)
    user2 = User.objects.create_user('smsuser2', 'test2@example.com', 'pass123')
    user2.profile.latitude = 37.7996
    user2.profile.longitude = -122.3970
    user2.profile.save()
    
    print(f"✅ Created user2: {user2.username}")
    
    # Calculate distance
    dist = calculate_distance(
        user1.profile.latitude, user1.profile.longitude,
        user2.profile.latitude, user2.profile.longitude
    )
    print(f"✅ Distance: {dist:.3f}km ({dist*1000:.0f}m)")
    
    # Create post
    post = Post.objects.create(
        author=user2,
        title='TEST: SMS Notification',
        body='Testing SMS notifications',
        urgency='high',
        latitude=37.7996,
        longitude=-122.3970,
        postal_code='94111'
    )
    print(f"✅ Created post: {post.id}")
    
    # Trigger notifications
    print("\n📤 Sending notifications...")
    create_proximity_notifications(post)
    
    print("\n✅ Test complete!")
    print(f"📱 Check phone: {user1.profile.phone_number}")
    print(f"📧 Check email: {user1.email}")

print("\n" + "="*70)
print("TEST FINISHED")
print("="*70 + "\n")
