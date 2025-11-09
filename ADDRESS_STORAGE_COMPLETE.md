# ✅ Address Storage Implementation Complete!

## 📍 Address Data is Now Being Stored in the Profile Model

### What Was Implemented

#### 1. **Backend - Database Schema**
Added the following fields to the `Profile` model:
- `street_address` - CharField (255 chars)
- `city` - CharField (100 chars)
- `state` - CharField (100 chars)
- `country` - CharField (100 chars)
- `postal_code` - CharField (20 chars)
- `latitude` - DecimalField (9 digits, 6 decimal places)
- `longitude` - DecimalField (9 digits, 6 decimal places)

All fields are optional (`blank=True`) and nullable where appropriate.

#### 2. **Backend - Serializers Updated**

**RegisterSerializer:**
- Now accepts address fields from registration form
- Extracts address data from request
- Creates user account
- Updates the user's profile with address information automatically

**ProfileSerializer:**
- Explicitly includes all address fields in API responses
- Returns structured address data

**UserSerializer:**
- Now includes nested `profile` object in user data
- Returns all profile info including address when fetching user details

#### 3. **Frontend - Data Flow**

**GooglePlacesAutocomplete Component:**
- Returns properly named fields matching backend expectations:
  - `street_address` (combined street number + route)
  - `city`, `state`, `country`, `postal_code`
  - `latitude`, `longitude`

**Register Component:**
- Collects address data via Google Places autocomplete
- Sends structured address data to backend on registration
- Address is automatically saved to user's profile

---

## 🔄 Complete Data Flow

### Registration Process:

1. **User selects address** via Google Places autocomplete
2. **Frontend extracts** structured address data:
   ```javascript
   {
     street_address: "123 Main St",
     city: "New York",
     state: "New York",
     country: "USA",
     postal_code: "10001",
     latitude: 40.7589,
     longitude: -73.9851
   }
   ```

3. **Frontend sends** to backend:
   ```javascript
   {
     username: "johndoe",
     email: "john@example.com",
     password: "***",
     password2: "***",
     street_address: "123 Main St",
     city: "New York",
     state: "New York",
     country: "USA",
     postal_code: "10001",
     latitude: 40.7589,
     longitude: -73.9851
   }
   ```

4. **Backend processes**:
   - Creates User account
   - Automatically creates Profile (via signal)
   - Updates Profile with address data
   - Returns user with profile data

5. **Response includes**:
   ```json
   {
     "user": {
       "id": 1,
       "username": "johndoe",
       "email": "john@example.com",
       "date_joined": "2025-11-08T...",
       "profile": {
         "verified": false,
         "phone_number": "",
         "karma_points": 0,
         "street_address": "123 Main St",
         "city": "New York",
         "state": "New York",
         "country": "USA",
         "postal_code": "10001",
         "latitude": "40.758900",
         "longitude": "-73.985100"
       }
     },
     "access": "eyJ...",
     "refresh": "eyJ..."
   }
   ```

---

## 🗄️ Database Storage

Address data is stored in the `api_profile` table:

| Column | Type | Example |
|--------|------|---------|
| street_address | VARCHAR(255) | "123 Main St" |
| city | VARCHAR(100) | "New York" |
| state | VARCHAR(100) | "New York" |
| country | VARCHAR(100) | "USA" |
| postal_code | VARCHAR(20) | "10001" |
| latitude | DECIMAL(9,6) | 40.758900 |
| longitude | DECIMAL(9,6) | -73.985100 |

---

## 🧪 Testing

### Test the Complete Flow:

1. **Start both servers** (if not running):
   ```bash
   # Backend
   cd backend
   python manage.py runserver
   
   # Frontend
   cd frontend
   npm run dev
   ```

2. **Register a new user**:
   - Go to http://localhost:5174/register
   - Fill in username, email
   - **Type an address** in the Address field
   - Select from Google autocomplete suggestions
   - See the location preview (📍 City, State)
   - Enter and confirm password
   - Click Register

3. **Check the database**:
   ```bash
   cd backend
   python manage.py shell
   ```
   ```python
   from django.contrib.auth.models import User
   user = User.objects.last()
   print(f"Username: {user.username}")
   print(f"Address: {user.profile.street_address}")
   print(f"City: {user.profile.city}")
   print(f"State: {user.profile.state}")
   print(f"Country: {user.profile.country}")
   print(f"Coordinates: {user.profile.latitude}, {user.profile.longitude}")
   ```

4. **Check via API**:
   - Login to get access token
   - Call `/api/auth/user/` endpoint
   - You'll see profile data with address

---

## 📊 API Endpoints

### Register with Address
**POST** `/api/auth/register/`
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "password2": "SecurePass123",
  "street_address": "123 Main St",
  "city": "New York",
  "state": "New York",
  "country": "USA",
  "postal_code": "10001",
  "latitude": 40.7589,
  "longitude": -73.9851
}
```

### Get Current User (with Profile)
**GET** `/api/auth/user/`
```
Headers: Authorization: Bearer <access_token>
```

Response includes profile with address data.

---

## 🎯 What This Enables

Now that address is stored, you can:

1. **Display user location** on their profile
2. **Find nearby neighbors** using lat/lng coordinates
3. **Filter posts by neighborhood** based on proximity
4. **Create neighborhood groups** automatically by location
5. **Show map views** of users or posts
6. **Send location-based notifications**
7. **Verify users** are in the same neighborhood

---

## 🔐 Privacy Considerations

Since you're storing exact addresses and coordinates:

1. **Consider privacy settings** - let users choose what to share
2. **Show only city/state** publicly, not full address
3. **Use coordinates** for proximity calculations, not display
4. **Add privacy field** to Profile model for user preferences
5. **Comply with data protection** laws (GDPR, CCPA, etc.)

---

## ✨ Summary

✅ Address fields added to Profile model
✅ Database migrations created and applied
✅ RegisterSerializer accepts and saves address data
✅ ProfileSerializer returns address in API responses
✅ UserSerializer includes profile with address
✅ Frontend sends properly formatted address data
✅ Complete data flow from autocomplete → database → API

**Address data is now fully integrated into your registration system!** 🎉

Every new user registration will automatically save their address to their profile, and you can access it via the user's profile or the API.
