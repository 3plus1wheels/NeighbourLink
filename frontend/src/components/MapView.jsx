import { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useLoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import api from '../utils/api';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const libraries = ['places'];

const mapContainerStyle = { width: '100%', height: '560px' };
const defaultCenter = { lat: 51.0447, lng: -114.0719 }; // Calgary

const getMarkerIcon = (urgency) => {
  const colors = { low: '#10B981', med: '#F59E0B', high: '#EF4444' };
  const color = colors[urgency] || colors.med;
  return {
    path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
    fillColor: color,
    fillOpacity: 1,
    strokeWeight: 2,
    strokeColor: '#FFFFFF',
    scale: 2,
    anchor: new window.google.maps.Point(12, 22),
  };
};

const MapView = ({ nearbyOnly = true, urgencyFilter = 'all' }) => {
  const [posts, setPosts] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mapCenter, setMapCenter] = useState(defaultCenter);

  const { isLoaded, loadError } = useLoadScript({ googleMapsApiKey: GOOGLE_MAPS_API_KEY, libraries });

  useEffect(() => {
    fetchPostsForMap();
    fetchUserLocation();
  }, [nearbyOnly, urgencyFilter]);

  const fetchUserLocation = async () => {
    try {
      const r = await api.get('/auth/user/');
      const lat = parseFloat(r.data?.profile?.latitude);
      const lng = parseFloat(r.data?.profile?.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        setUserLocation({ lat, lng });
        setMapCenter({ lat, lng });
      }
    } catch (e) {
      // ignore
    }
  };

  const fetchPostsForMap = async () => {
    try {
      setLoading(true);
      let url = '/posts/';
      const params = [];
      if (nearbyOnly) params.push('nearby=true');
      if (urgencyFilter !== 'all') params.push(`urgency=${urgencyFilter}`);
      if (params.length) url += '?' + params.join('&');

      const res = await api.get(url);
      const data = Array.isArray(res.data) ? res.data : res.data.posts || [];
      setPosts(data.filter((p) => p.latitude && p.longitude));
      setError('');
    } catch (e) {
      setError('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const onLoad = useCallback(
    (map) => {
      if (posts.length === 0 && !userLocation) return;
      const bounds = new window.google.maps.LatLngBounds();
      posts.forEach((p) => bounds.extend({ lat: parseFloat(p.latitude), lng: parseFloat(p.longitude) }));
      if (userLocation) bounds.extend(userLocation);
      map.fitBounds(bounds);
    },
    [posts, userLocation]
  );

  const fmt = (d) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (!GOOGLE_MAPS_API_KEY)
    return <div className="card"><p className="text-red-700">Google Maps API key missing.</p></div>;
  if (loadError) return <div className="card"><p className="text-red-700">Error loading maps.</p></div>;
  if (!isLoaded) return <div className="card"><p>Loading Google Maps…</p></div>;

  return (
    <section className="card">
      {/* Legend */}
      <div className="mb-3">
        <h3 className="text-sm font-semibold mb-2">Map legend</h3>
        <div className="flex flex-wrap gap-4 small">
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: '#EF4444' }}></span> High
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: '#F59E0B' }}></span> Medium
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: '#10B981' }}></span> Low
          </span>
          {userLocation && (
            <span className="inline-flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ background: '#2563EB' }}></span> Your location
            </span>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
            <p className="font-semibold">Loading map…</p>
          </div>
        )}
        {error && (
          <div className="absolute top-3 left-3 right-3 card z-10">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={mapCenter}
          zoom={12}
          onLoad={onLoad}
          options={{ zoomControl: true, streetViewControl: false, mapTypeControl: false, fullscreenControl: true }}
        >
          {userLocation && (
            <Marker
              position={userLocation}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: '#2563EB',
                fillOpacity: 1,
                strokeWeight: 3,
                strokeColor: '#FFFFFF',
              }}
              title="Your location"
            />
          )}

          {posts.map((p) => (
            <Marker
              key={p.id}
              position={{ lat: parseFloat(p.latitude), lng: parseFloat(p.longitude) }}
              icon={getMarkerIcon(p.urgency)}
              onClick={() => setSelectedPost(p)}
              title={p.title}
            />
          ))}

          {selectedPost && (
            <InfoWindow
              position={{ lat: parseFloat(selectedPost.latitude), lng: parseFloat(selectedPost.longitude) }}
              onCloseClick={() => setSelectedPost(null)}
            >
              <div className="max-w-xs">
                <h4 className="font-bold mb-1">{selectedPost.title}</h4>
                <div className="mb-2">
                  <span
                    className={
                      selectedPost.urgency === 'high'
                        ? 'badge badge-high'
                        : selectedPost.urgency === 'med'
                        ? 'badge badge-med'
                        : 'badge badge-low'
                    }
                  >
                    {selectedPost.urgency.toUpperCase()}
                  </span>
                </div>
                {selectedPost.body && <p className="small mb-1">{selectedPost.body}</p>}
                <p className="small text-gray-600">
                  By <strong>{selectedPost.author_username}</strong> • {fmt(selectedPost.created_at)}
                </p>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>

      <div className="small mt-3">
        <strong>{posts.length}</strong> posts shown {nearbyOnly && '(within 3km)'}
      </div>
    </section>
  );
};

export default MapView;
