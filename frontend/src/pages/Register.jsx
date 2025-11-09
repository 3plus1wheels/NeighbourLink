import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GooglePlacesAutocomplete from '../components/GooglePlacesAutocomplete';
import api from '../utils/api';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [step, setStep] = useState(1); // 1: Basic Info, 2: Address & Verification
  const [formData, setFormData] = useState({ 
    username: '', 
    email: '', 
    password: '', 
    password2: '',
    phone_number: '' 
  });
  const [addressData, setAddressData] = useState(null);
  const [document, setDocument] = useState(null);
  const [documentPreview, setDocumentPreview] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handlePlaceSelect = (place) => {
    setAddressData(place);
    setVerificationResult(null); // Reset verification when address changes
  };

  const handleDocumentChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setDocument(file);
      setVerificationResult(null); // Reset verification when document changes
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocumentPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVerifyAddress = async () => {
    if (!document || !addressData) {
      setError('Please select an address and upload a document');
      return;
    }

    setVerifying(true);
    setError('');
    setVerificationResult(null);

    try {
      // Note: We need to create a temporary token or use a public endpoint
      // For now, we'll do a client-side simulation
      // In production, you'd want a separate public verification endpoint
      
      const verifyData = new FormData();
      verifyData.append('document', document);
      verifyData.append('street_address', addressData.street_address || '');
      verifyData.append('city', addressData.city || '');
      verifyData.append('state', addressData.state || '');
      verifyData.append('postal_code', addressData.postal_code || '');

      // This will fail without auth, so we'll handle verification after registration
      // Store the verification status for now
      setVerificationResult({
        verified: false,
        confidence: 0,
        pending: true,
        message: 'Document ready for verification'
      });
      
    } catch (err) {
      setError(err.response?.data?.error || 'Verification setup failed');
      setVerificationResult(null);
    } finally {
      setVerifying(false);
    }
  };

  const handleStepOne = (e) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.password2) {
      setError("Passwords don't match");
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setStep(2); // Move to address verification step
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!addressData) {
      setError('Please select your address');
      return;
    }

    // Require document upload and verification
    if (!document) {
      setError('Please upload a household document to verify your address');
      return;
    }

    setLoading(true);
    setVerifying(true);

    try {
      // FIRST: Verify the address with the uploaded document BEFORE creating account
      console.log('Step 1: Verifying address from document...');
      
      const verifyData = new FormData();
      verifyData.append('document', document);
      verifyData.append('street_address', addressData.street_address || '');
      verifyData.append('city', addressData.city || '');
      verifyData.append('state', addressData.state || '');
      verifyData.append('postal_code', addressData.postal_code || '');
      verifyData.append('verify_only', 'true'); // Don't update profile, just verify

      // Use public endpoint for verification before registration
      const verifyResponse = await fetch('http://localhost:8000/api/verify-address-public/', {
        method: 'POST',
        body: verifyData,
      });

      const verifyResult = await verifyResponse.json();
      setVerificationResult(verifyResult);
      setVerifying(false);
      
      // Check if verification passed (80% threshold)
      if (!verifyResult.verified) {
        // Verification failed - DON'T create account
        const confidence = verifyResult.confidence 
          ? `${(verifyResult.confidence * 100).toFixed(1)}%` 
          : 'low';
        
        setError(
          `❌ Address verification failed (${confidence} confidence, need 80%+).\n\n` +
          `The document does not contain your selected address. Please ensure:\n` +
          `• Document shows your full address clearly\n` +
          `• Address matches exactly: ${addressData.street_address}, ${addressData.city}, ${addressData.state} ${addressData.postal_code}\n` +
          `• Document is a valid household bill or bank statement`
        );
        setLoading(false);
        return; // Stop here - don't create account
      }

      // SECOND: Verification passed! Now create the account
      console.log('Step 2: Verification passed, creating account...');
      
      const payload = { 
        ...formData, 
        ...(addressData || {}),
        verified: true // Mark as verified
      };
      
      const result = await register(payload);
      
      if (!result.success) {
        setError(result.error);
        setLoading(false);
        return;
      }

      // Success! Navigate to dashboard
      console.log('Registration complete!');
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      
    } catch (error) {
      console.error('Registration/Verification error:', error);
      setVerifying(false);
      
      // Handle specific error responses from backend
      const errorData = error.response?.data;
      let errorMessage = 'Registration or verification failed';
      
      if (errorData) {
        if (errorData.message && errorData.help) {
          // AWS permission error - show helpful message
          errorMessage = `${errorData.message}\n\n${errorData.help}`;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.details) {
          errorMessage = errorData.details;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-2xl">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold uppercase tracking-wide">Join NeighbourLink</h1>
          <p className="small mt-2">Create your account to connect with your community</p>
          
          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className={`h-2 w-20 ${step === 1 ? 'bg-black' : 'bg-gray-300'}`}></div>
            <div className={`h-2 w-20 ${step === 2 ? 'bg-black' : 'bg-gray-300'}`}></div>
          </div>
          <p className="text-xs mt-2 text-gray-600">
            Step {step} of 2: {step === 1 ? 'Basic Information' : 'Address Verification'}
          </p>
        </div>

        {error && (
          <div className="card mb-4 bg-red-50 border-2 border-red-500">
            <p className="text-red-700 font-semibold">⚠ {error}</p>
          </div>
        )}

        {verificationResult && verificationResult.verified && (
          <div className="card mb-4 bg-green-50 border-2 border-green-500">
            <p className="text-green-700 font-semibold">✓ Address Verified! Completing registration...</p>
            <p className="text-sm text-gray-600 mt-1">Confidence: {(verificationResult.confidence * 100).toFixed(0)}%</p>
          </div>
        )}

        {verificationResult && !verificationResult.verified && !verificationResult.pending && (
          <div className="card mb-4 bg-yellow-50 border-2 border-yellow-500">
            <p className="text-yellow-800 font-semibold">⚠ Verification Failed</p>
            <p className="text-sm text-gray-700 mt-1">{verificationResult.message}</p>
          </div>
        )}

        {/* Step 1: Basic Information */}
        {step === 1 && (
          <form className="grid gap-4" onSubmit={handleStepOne}>
            <div>
              <label className="block text-sm font-semibold mb-2 uppercase tracking-wide">Username *</label>
              <input 
                className="input" 
                name="username" 
                value={formData.username} 
                onChange={handleChange} 
                required 
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 uppercase tracking-wide">Email *</label>
              <input 
                className="input" 
                type="email" 
                name="email" 
                value={formData.email} 
                onChange={handleChange} 
                required 
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 uppercase tracking-wide">Phone Number *</label>
              <input 
                className="input" 
                type="tel" 
                name="phone_number" 
                value={formData.phone_number} 
                onChange={handleChange}
                placeholder="+1 (123) 456-7890"
              />
              <p className="text-xs text-gray-600 mt-1">For SMS notifications (format: +1 123-456-7890)</p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 uppercase tracking-wide">Password *</label>
              <input 
                className="input" 
                type="password" 
                name="password" 
                value={formData.password} 
                onChange={handleChange} 
                required 
              />
              <p className="text-xs text-gray-600 mt-1">Must be at least 8 characters</p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 uppercase tracking-wide">Confirm Password *</label>
              <input 
                className="input" 
                type="password" 
                name="password2" 
                value={formData.password2} 
                onChange={handleChange} 
                required 
              />
            </div>

            <button type="submit" className="btn btn-primary w-full mt-2">
              Continue to Address Verification →
            </button>
          </form>
        )}

        {/* Step 2: Address & Document Verification */}
        {step === 2 && (
          <form className="grid gap-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-semibold mb-2 uppercase tracking-wide">Your Address *</label>
              <GooglePlacesAutocomplete onPlaceSelect={handlePlaceSelect} placeholder="Enter your address" />
              {addressData && (
                <div className="mt-2 p-3 bg-gray-50 border border-gray-300 text-sm">
                  <p className="font-semibold">📍 Selected Address:</p>
                  <p>{addressData.street_address}</p>
                  <p>{addressData.city}, {addressData.state} {addressData.postal_code}</p>
                </div>
              )}
            </div>

            <div className="border-t-2 border-dashed border-gray-300 pt-4">
              <div className="mb-3 p-4 bg-yellow-50 border-2 border-yellow-400">
                <h3 className="text-lg font-bold uppercase tracking-wide mb-1 text-yellow-800">
                  ⚠ Address Verification Required
                </h3>
                <p className="text-sm text-gray-700">
                  To ensure community safety and authenticity, you must upload a household document 
                  (bank statement, utility bill, lease agreement, etc.) that matches your selected address.
                </p>
                <p className="text-sm text-gray-700 mt-2 font-semibold">
                  Registration cannot be completed without verified address.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 uppercase tracking-wide text-black">
                  Upload Verification Document *
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleDocumentChange}
                  required
                  className={`w-full px-4 py-3 border-2 focus:outline-none file:mr-4 file:py-2 file:px-4 file:border-0 file:bg-black file:text-white file:font-bold file:uppercase file:cursor-pointer hover:file:bg-gray-800 transition-colors ${
                    document 
                      ? 'border-green-500 focus:border-green-700' 
                      : 'border-red-500 focus:border-red-700'
                  }`}
                />
                <p className="text-xs text-gray-600 mt-2">
                  <strong>Required:</strong> JPG, PNG, or PDF. Document must clearly display your name and the address you selected above.
                </p>
              </div>

              {/* Document Preview */}
              {documentPreview && (
                <div className="mt-4 border-2 border-black p-4">
                  <p className="text-sm font-bold uppercase tracking-wide mb-2">Preview:</p>
                  <img
                    src={documentPreview}
                    alt="Document preview"
                    className="max-w-full h-auto max-h-64 border-2 border-gray-300"
                  />
                </div>
              )}

              {/* Verification Result */}
              {verificationResult && (
                <div className={`mt-4 p-4 border-2 border-black ${
                  verificationResult.verified ? 'bg-green-50' : 'bg-yellow-50'
                }`}>
                  <p className="font-bold uppercase tracking-wide mb-2 text-xl">
                    {verificationResult.verified ? '✓ VERIFIED' : '✗ NOT VERIFIED'}
                  </p>
                  <p className="mb-2 font-medium">{verificationResult.message}</p>
                  {verificationResult.confidence > 0 && (
                    <p className="text-sm">Confidence: {(verificationResult.confidence * 100).toFixed(0)}%</p>
                  )}
                  
                  {verificationResult.found_addresses && verificationResult.found_addresses.length > 0 && (
                    <div className="mt-3 p-3 bg-white border border-gray-300 text-sm">
                      <p className="font-bold uppercase tracking-wide mb-2">Addresses Found:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {verificationResult.found_addresses.map((addr, idx) => (
                          <li key={idx} className={addr === verificationResult.best_match ? 'font-bold text-green-700' : ''}>
                            {addr}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-2">
              <button 
                type="button" 
                onClick={() => setStep(1)} 
                className="btn btn-secondary w-1/3"
                disabled={loading}
              >
                ← Back
              </button>
              <button 
                type="submit" 
                disabled={loading || !addressData || !document} 
                className={`btn w-2/3 ${loading || !addressData || !document ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'btn-primary'}`}
              >
                {loading ? 'Verifying & Creating Account...' : 'Complete Registration & Verify'}
              </button>
            </div>

            {!document && (
              <p className="text-xs text-center text-red-600 font-semibold">
                ⚠ Document upload is required to complete registration
              </p>
            )}

            {document && !loading && (
              <p className="text-xs text-center text-green-600 font-semibold">
                ✓ Document uploaded. Click button above to verify and register.
              </p>
            )}
          </form>
        )}

        <p className="small text-center mt-6">
          Already have an account? <Link to="/login" className="underline font-semibold">Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
