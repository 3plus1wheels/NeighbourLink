# Address Storage - Quick Reference

## Backend Files Modified

### 1. `backend/api/models.py` - Profile Model
Added fields:
```python
street_address = models.CharField(max_length=255, blank=True)
city = models.CharField(max_length=100, blank=True)
state = models.CharField(max_length=100, blank=True)
country = models.CharField(max_length=100, blank=True)
postal_code = models.CharField(max_length=20, blank=True)
latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
```

### 2. `backend/api/serializers.py` - RegisterSerializer
- Accepts address fields from frontend
- Saves to user's profile after creation

### 3. `backend/api/serializers.py` - UserSerializer
- Returns nested profile object with address data

## Frontend Files Modified

### 1. `frontend/src/components/GooglePlacesAutocomplete.jsx`
Returns:
```javascript
{
  street_address: "123 Main St",  // Combined street number + route
  city: "New York",
  state: "New York",
  country: "USA",
  postal_code: "10001",
  latitude: 40.7589,
  longitude: -73.9851
}
```

### 2. `frontend/src/pages/Register.jsx`
- Collects address via handlePlaceSelect()
- Sends to backend in registration request

## Database Migration
Migration: `0002_rename_karmara_points_profile_karma_points_and_more.py`
Status: ✅ Applied

## Test It
1. Register new user with address
2. Check Profile in Django admin
3. Call `/api/auth/user/` to see profile data with address

## Address Data Location
- **Table**: `api_profile`
- **Relationship**: OneToOne with User
- **Access**: `user.profile.city`, `user.profile.latitude`, etc.
