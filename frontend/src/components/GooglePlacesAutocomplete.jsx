import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import { useState } from 'react';

const libraries = ['places'];

const GooglePlacesAutocomplete = ({ onPlaceSelect, placeholder = 'Enter your address' }) => {
  const [autocomplete, setAutocomplete] = useState(null);
  const [inputValue, setInputValue] = useState('');

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const onLoad = (inst) => setAutocomplete(inst);

  const onPlaceChanged = () => {
    if (!autocomplete) return;
    const place = autocomplete.getPlace();
    if (!place?.geometry) return;

    const ac = place.address_components || [];
    const get = (type) => ac.find((c) => c.types.includes(type))?.long_name || '';

    const streetNumber = get('street_number');
    const route = get('route');
    const streetAddress = streetNumber && route ? `${streetNumber} ${route}` : route || streetNumber || '';

    const addressData = {
      street_address: streetAddress,
      city: get('locality') || get('postal_town'),
      state: get('administrative_area_level_1'),
      country: get('country'),
      postal_code: get('postal_code'),
      latitude: place.geometry.location.lat(),
      longitude: place.geometry.location.lng(),
    };

    setInputValue(place.formatted_address || '');
    onPlaceSelect && onPlaceSelect(addressData);
  };

  if (loadError) return <div className="small text-red-700">Error loading Google Maps.</div>;

  if (!isLoaded) {
    return <input className="input" disabled placeholder="Loading Google Maps…" />;
  }

  return (
    <Autocomplete
      onLoad={onLoad}
      onPlaceChanged={onPlaceChanged}
      options={{ types: ['address'], componentRestrictions: { country: ['us', 'ca'] } }}
    >
      <input
        className="input"
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={placeholder}
      />
    </Autocomplete>
  );
};

export default GooglePlacesAutocomplete;
