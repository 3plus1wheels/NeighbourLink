import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import { useState } from 'react';

const libraries = ['places'];

const GooglePlacesAutocomplete = ({ onPlaceSelect, placeholder = "Enter your address" }) => {
  const [autocomplete, setAutocomplete] = useState(null);
  const [inputValue, setInputValue] = useState('');

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const onLoad = (autocompleteInstance) => {
    setAutocomplete(autocompleteInstance);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      
      if (place.geometry) {
        const addressComponents = place.address_components || [];
        const formattedAddress = place.formatted_address || '';
        
        // Extract address details
        const getComponent = (type) => {
          const component = addressComponents.find(c => c.types.includes(type));
          return component ? component.long_name : '';
        };

        const streetNumber = getComponent('street_number');
        const route = getComponent('route');
        const streetAddress = streetNumber && route ? `${streetNumber} ${route}` : route || streetNumber || '';
        
        const addressData = {
          street_address: streetAddress,
          city: getComponent('locality') || getComponent('postal_town'),
          state: getComponent('administrative_area_level_1'),
          country: getComponent('country'),
          postal_code: getComponent('postal_code'),
          latitude: place.geometry.location.lat(),
          longitude: place.geometry.location.lng(),
        };

        setInputValue(formattedAddress);
        if (onPlaceSelect) {
          onPlaceSelect(addressData);
        }
      }
    }
  };

  if (loadError) {
    return (
      <div className="text-red-600 text-sm">
        Error loading Google Maps. Please check your API key.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <input
        type="text"
        disabled
        placeholder="Loading Google Maps..."
        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100"
      />
    );
  }

  return (
    <Autocomplete
      onLoad={onLoad}
      onPlaceChanged={onPlaceChanged}
      options={{
        types: ['address'],
        componentRestrictions: { country: ['us', 'ca'] }, // Restrict to US and Canada, adjust as needed
      }}
    >
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={placeholder}
        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
      />
    </Autocomplete>
  );
};

export default GooglePlacesAutocomplete;
