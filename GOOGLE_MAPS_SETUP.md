# Google Places Autocomplete Setup

## 🗺️ Getting Your Google Maps API Key

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create a new project** (or select existing)
   - Click "Select a project" → "New Project"
   - Name it (e.g., "NeighbourLink")
   - Click "Create"

3. **Enable Google Maps APIs**
   - Go to "APIs & Services" → "Library"
   - Search for and enable these APIs:
     - **Maps JavaScript API**
     - **Places API**
     - **Geocoding API** (optional, but recommended)

4. **Create API Key**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy your API key

5. **Secure Your API Key** (Important!)
   - Click "Edit API key"
   - Under "API restrictions", select "Restrict key"
   - Choose only the APIs you enabled:
     - Maps JavaScript API
     - Places API
   - Under "Application restrictions", select:
     - "HTTP referrers (web sites)"
     - Add: `http://localhost:*/*` and your production domain
   - Click "Save"

6. **Add API Key to Your Project**
   - Open `/frontend/.env`
   - Replace `your_google_maps_api_key_here` with your actual API key:
     ```
     VITE_GOOGLE_MAPS_API_KEY=AIzaSyC...your_actual_key
     ```

7. **Restart Your Dev Server**
   ```bash
   cd frontend
   npm run dev
   ```

## 📍 What Was Added

### Components
- **`GooglePlacesAutocomplete.jsx`** - Reusable address autocomplete component
  - Integrates Google Places API
  - Returns structured address data (street, city, state, country, lat/lng)
  - Shows loading state and error handling
  - Restricts to address types only

### Register Page Updates
- Added address field with autocomplete
- Captures full address details:
  - `formatted_address` - Full address string
  - `street_number` & `route` - Street address
  - `city` - City/Town
  - `state` - State/Province
  - `country` - Country
  - `postal_code` - ZIP/Postal code
  - `lat` & `lng` - Coordinates
- Shows selected location preview

### Environment Variables
- **`.env`** file for secure API key storage
- Already in `.gitignore` for security

## 🎨 Features

- **Type-ahead suggestions** as user types
- **Address validation** from Google
- **Structured data extraction** from address components
- **Location coordinates** included
- **Country restrictions** (currently US/CA, customizable)
- **Minimal styling** matching your design

## 🔧 Customization

### Change Country Restrictions
Edit `GooglePlacesAutocomplete.jsx`:
```javascript
componentRestrictions: { country: ['us', 'ca', 'uk'] }
```

### Change Search Types
```javascript
types: ['address']  // Can be 'establishment', 'geocode', etc.
```

### Style the Input
The input uses your existing Tailwind classes - fully customizable!

## 💡 Usage in Other Components

```jsx
import GooglePlacesAutocomplete from '../components/GooglePlacesAutocomplete';

function YourComponent() {
  const handlePlaceSelect = (addressData) => {
    console.log('Selected address:', addressData);
    // addressData contains: formatted_address, city, state, country, lat, lng, etc.
  };

  return (
    <GooglePlacesAutocomplete 
      onPlaceSelect={handlePlaceSelect}
      placeholder="Enter your address"
    />
  );
}
```

## 🔒 Security Notes

- ✅ API key is in `.env` (not committed to git)
- ✅ Restrict API key in Google Console
- ✅ Add HTTP referrer restrictions
- ✅ Only enable necessary APIs
- ⚠️ Never commit `.env` file to version control

## 💰 Pricing

Google Maps offers a generous free tier:
- **$200 free credit per month**
- Places Autocomplete: ~$2.83 per 1000 requests
- Most small apps stay within free tier

Monitor usage at: https://console.cloud.google.com/billing

## 🚀 Next Steps

After adding your API key:
1. Restart the dev server
2. Go to the Register page
3. Start typing an address
4. See autocomplete suggestions!
5. The selected address will be included in registration data

---

**Need help?** Check the Google Maps Platform documentation:
https://developers.google.com/maps/documentation/javascript/places-autocomplete
