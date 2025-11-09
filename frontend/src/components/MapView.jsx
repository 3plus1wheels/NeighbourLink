import { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useLoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import api from '../utils/api';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Load Google Maps script only once
const libraries = ['places'];

const mapContainerStyle = {
  width: '100%',
  height: '600px',
};

const defaultCenter = {
  lat: 51.0447, // Calgary, Alberta
  lng: -114.0719,
};

// Marker colors for different urgency levels
const getMarkerIcon = (urgency) => {
  const colors = {
    low: '#10B981',    // Green
    med: '#F59E0B',    // Yellow/Orange
    high: '#EF4444',   // Red
  };
  
  const color = colors[urgency] || colors.med;
  
  // Create SVG marker with custom color
  const svgMarker = {
    path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
    fillColor: color,
    fillOpacity: 1,
    strokeWeight: 2,
    strokeColor: '#FFFFFF',
    scale: 2,
    anchor: new window.google.maps.Point(12, 22),
  };
  
  return svgMarker;
};

const MapView = ({ nearbyOnly = true, urgencyFilter = 'all' }) => {
    const [posts, setPosts] = useState([]);
    const [userLocation, setUserLocation] = useState(null);
    const [selectedPost, setSelectedPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [mapCenter, setMapCenter] = useState(defaultCenter);
    const [map, setMap] = useState(null);

    // Use the useLoadScript hook to load Google Maps only once
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
        libraries
    });

  useEffect(() => {
    fetchPostsForMap();
    getUserLocation();
  }, [nearbyOnly, urgencyFilter]);

  const getUserLocation = async () => {
    try {
      const response = await api.get('/auth/user/');
      if (response.data?.profile?.latitude && response.data?.profile?.longitude) {
        const userLat = parseFloat(response.data.profile.latitude);
        const userLng = parseFloat(response.data.profile.longitude);
        setUserLocation({ lat: userLat, lng: userLng });
        setMapCenter({ lat: userLat, lng: userLng });
      }
    } catch (err) {
      console.error('Failed to get user location:', err);
    }
  };

  const fetchPostsForMap = async () => {
    try {
      setLoading(true);
      
      let url = '/posts/';
      const params = [];
      
      if (nearbyOnly) {
        params.push('nearby=true');
      }
      
      if (urgencyFilter !== 'all') {
        params.push(`urgency=${urgencyFilter}`);
      }
      
      if (params.length > 0) {
        url += '?' + params.join('&');
      }
      
      const response = await api.get(url);
      const postsData = Array.isArray(response.data) ? response.data : response.data.posts || [];
      
      // Filter posts that have coordinates
      const postsWithCoordinates = postsData.filter(
        post => post.latitude && post.longitude
      );
      
      setPosts(postsWithCoordinates);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load posts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const onLoad = useCallback((mapInstance) => {
    setMap(mapInstance);
    // Optional: Fit bounds to show all markers
    if (posts.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      posts.forEach(post => {
        bounds.extend({
          lat: parseFloat(post.latitude),
          lng: parseFloat(post.longitude)
        });
      });
      if (userLocation) {
        bounds.extend(userLocation);
      }
      mapInstance.fitBounds(bounds);
    }
  }, [posts, userLocation]);

  // Handle Google Maps loading states
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="bg-white border-2 border-black p-6">
        <p className="text-red-600 font-bold">
          Google Maps API key not configured. Please add VITE_GOOGLE_MAPS_API_KEY to your .env file.
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-white border-2 border-black p-6">
        <p className="text-red-600 font-bold">
          Error loading maps: {loadError.message}
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="bg-white border-2 border-black p-6">
        <p className="text-black font-bold">Loading Google Maps...</p>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-black">
      {/* Legend */}
      <div className="p-4 border-b-2 border-black bg-gray-50">
        <h3 className="text-lg font-bold text-black mb-3 uppercase tracking-wide">Map Legend</h3>
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white"></div>
            <span className="text-sm font-bold text-gray-800">High Urgency</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-yellow-500 border-2 border-white"></div>
            <span className="text-sm font-bold text-gray-800">Medium Urgency</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white"></div>
            <span className="text-sm font-bold text-gray-800">Low Urgency</span>
          </div>
          {userLocation && (
            <div className="flex items-center space-x-2 ml-4">
              <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white"></div>
              <span className="text-sm font-bold text-gray-800">Your Location</span>
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            <p className="text-black font-bold">Loading map...</p>
          </div>
        )}
        
        {error && (
          <div className="absolute top-4 left-4 right-4 bg-white border-2 border-red-500 p-4 z-10">
            <p className="text-red-600 font-bold">{error}</p>
          </div>
        )}

        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={mapCenter}
          zoom={12}
          onLoad={onLoad}
          options={{
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
          }}
        >
            {/* User location marker */}
            {userLocation && (
              <Marker
                position={userLocation}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: '#3B82F6',
                  fillOpacity: 1,
                  strokeWeight: 3,
                  strokeColor: '#FFFFFF',
                }}
                title="Your Location"
              />
            )}

            {/* Post markers */}
            {posts.map((post) => (
              <Marker
                key={post.id}
                position={{
                  lat: parseFloat(post.latitude),
                  lng: parseFloat(post.longitude),
                }}
                icon={getMarkerIcon(post.urgency)}
                onClick={() => setSelectedPost(post)}
                title={post.title}
              />
            ))}

            {/* Info Window for selected post */}
            {selectedPost && (
              <InfoWindow
                position={{
                  lat: parseFloat(selectedPost.latitude),
                  lng: parseFloat(selectedPost.longitude),
                }}
                onCloseClick={() => setSelectedPost(null)}
              >
                <div className="p-2 max-w-sm">
                  <h3 className="font-bold text-black text-lg mb-2 uppercase">
                    {selectedPost.title}
                  </h3>
                  <div className="mb-2">
                    <span className={`inline-block px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                      selectedPost.urgency === 'high'
                        ? 'bg-red-500 text-white'
                        : selectedPost.urgency === 'med'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-green-500 text-white'
                    }`}>
                      {selectedPost.urgency === 'high' && 'High'}
                      {selectedPost.urgency === 'med' && 'Medium'}
                      {selectedPost.urgency === 'low' && 'Low'}
                    </span>
                  </div>
                  {selectedPost.body && (
                    <p className="text-gray-700 text-sm mb-2 line-clamp-3">
                      {selectedPost.body}
                    </p>
                  )}
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>By <strong>{selectedPost.author_username}</strong></p>
                    <p>{formatDate(selectedPost.created_at)}</p>
                    {selectedPost.postal_code && (
                      <p className="font-mono">{selectedPost.postal_code}</p>
                    )}
                  </div>
                </div>
              </InfoWindow>
            )}
        </GoogleMap>
      </div>

      {/* Stats */}
      <div className="p-4 border-t-2 border-black bg-gray-50">
        <p className="text-sm text-gray-700">
          <span className="font-bold">{posts.length}</span> posts shown on map
          {nearbyOnly && <span> (within 3km)</span>}
        </p>
      </div>
    </div>
  );
};

export default MapView;
