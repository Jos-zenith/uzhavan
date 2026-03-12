/**
 * AI Pest Identification Screen Component
 * Service #16: Automated Pest/Disease Identification
 * 
 * Features:
 * - Camera capture (with permission)
 * - AI identification (requires server)
 * - Manual selection with offline database
 * - Remedial measures and guidance
 * - Identification history and statistics
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  pestIdentificationService,
  PestCategory,
  IdentificationResult,
} from '../../pestIdentificationService';
import { victoriSdk } from '../../victoriSdk';

// ============================================================
// CUSTOM HOOK
// ============================================================

function usePestIdentification() {
  const [identification, setIdentification] = useState<IdentificationResult | null>(null);
  const [history, setHistory] = useState<IdentificationResult[]>([]);
  const [cameraPermission, setCameraPermission] = useState(false);
  const [serverAvailable, setServerAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Request camera permission
  const requestCameraPermission = async () => {
    try {
      setLoading(true);
      setError(null);
      const granted = await pestIdentificationService.requestCameraPermission();
      setCameraPermission(granted);
      return granted;
    } catch (err: any) {
      setError(err.message || 'Failed to request camera permission');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Identify pest with AI
  const identifyWithAI = async (imageFile: File | Blob) => {
    try {
      setLoading(true);
      setError(null);
      const aiDetection = await pestIdentificationService.identifyPestWithAI(imageFile);
      setServerAvailable(true);
      return aiDetection;
    } catch (err: any) {
      setError(err.message);
      setServerAvailable(false);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Create identification
  const createIdentification = async (params: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await pestIdentificationService.createIdentification(params);
      setIdentification(result);

      // Track event
      if (victoriSdk) {
        victoriSdk.track('ANY_EVENT_WITH_LOCATION', {
          service: 'Pest Identification',
          action: 'Identify Pest',
          method: result.identificationMethod,
          pest: result.pestInfo.category,
          cropType: params.cropType,
        });
      }

      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Load history
  const loadHistory = React.useCallback(() => {
    const hist = pestIdentificationService.getIdentificationHistory();
    setHistory(hist);
  }, []);

  return {
    identification,
    history,
    cameraPermission,
    serverAvailable,
    loading,
    error,
    requestCameraPermission,
    identifyWithAI,
    createIdentification,
    loadHistory,
  };
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function PestIdentificationScreen() {
  const [activeTab, setActiveTab] = useState<'capture' | 'manual' | 'results' | 'history' | 'guide'>('capture');
  
  const {
    identification,
    history,
    cameraPermission,
    serverAvailable,
    loading,
    error,
    requestCameraPermission,
    identifyWithAI,
    createIdentification,
    loadHistory,
  } = usePestIdentification();

  // Camera references
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Capture tab state
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cropType, setCropType] = useState('');
  const [location, setLocation] = useState({ district: '', block: '', village: '' });
  const [farmerContact, setFarmerContact] = useState('');
  const [aiProcessing, setAiProcessing] = useState(false);

  // Manual tab state
  const [selectedPest, setSelectedPest] = useState<PestCategory | ''>('');
  const [searchSymptoms, setSearchSymptoms] = useState('');
  const [searchResults, setSearchResults] = useState<PestCategory[]>([]);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Start camera
  const startCamera = async () => {
    try {
      const granted = await requestCameraPermission();
      if (!granted) {
        alert('Camera permission denied. Please enable camera access in settings.');
        return;
      }

      if (videoRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err: any) {
      alert(`Camera error: ${err.message}`);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    setCameraActive(false);
  };

  // Capture image from camera
  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const imageData = canvasRef.current.toDataURL('image/jpeg');
        setCapturedImage(imageData);
        stopCamera();
      }
    }
  };

  // Upload image file
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Process captured image with AI
  const processImageWithAI = async () => {
    if (!capturedImage) {
      alert('Please capture or upload an image first.');
      return;
    }

    try {
      setAiProcessing(true);

      // Convert data URL to blob
      const blob = await (await fetch(capturedImage)).blob();

      // Get AI detection
      const aiDetection = await identifyWithAI(blob);

      // Create identification
      await createIdentification({
        imageDataUrl: capturedImage,
        aiDetection,
        cropType: cropType || undefined,
        location: {
          district: location.district || undefined,
          block: location.block || undefined,
          village: location.village || undefined,
        },
        farmerContact: farmerContact || undefined,
      });

      loadHistory();
      setActiveTab('results');
    } catch (err: any) {
      alert(`AI processing failed: ${err.message}`);
    } finally {
      setAiProcessing(false);
    }
  };

  // Manual pest selection
  const handleManualSelection = async () => {
    if (!selectedPest) {
      alert('Please select a pest type.');
      return;
    }

    try {
      await createIdentification({
        manualSelection: selectedPest,
        cropType: cropType || undefined,
        location: {
          district: location.district || undefined,
          block: location.block || undefined,
          village: location.village || undefined,
        },
        farmerContact: farmerContact || undefined,
      });

      loadHistory();
      setActiveTab('results');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Search by symptoms
  const handleSymptomSearch = () => {
    if (!searchSymptoms) {
      alert('Please enter symptoms to search.');
      return;
    }

    const results = pestIdentificationService.searchPestBySymptoms(searchSymptoms);
    setSearchResults(results);
  };

  // All pest categories
  const pestCategories = pestIdentificationService.getAllPestCategories();

  // Severity colors
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Low':
        return '#28a745';
      case 'Medium':
        return '#ffc107';
      case 'High':
        return '#fd7e14';
      case 'Critical':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  // Remedial type colors
  const getMeasureTypeColor = (type: string) => {
    switch (type) {
      case 'Organic':
        return '#28a745';
      case 'Chemical':
        return '#fd7e14';
      case 'Biological':
        return '#007bff';
      case 'Cultural':
        return '#17a2b8';
      case 'Mechanical':
        return '#6c757d';
      default:
        return '#6c757d';
    }
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ color: '#2c5f2d', marginBottom: '10px' }}>🐛 AI Pest Identification</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Automated Pest/Disease Identification with Remedial Measures • Partial Offline Support
      </p>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '2px solid #e0e0e0', flexWrap: 'wrap' }}>
        {[
          { id: 'capture', label: '📷 Capture & AI', emoji: '📷' },
          { id: 'manual', label: '📋 Manual Selection', emoji: '📋' },
          { id: 'results', label: '✅ Results', emoji: '✅', disabled: !identification },
          { id: 'history', label: '📊 History', emoji: '📊' },
          { id: 'guide', label: '📖 Pest Guide', emoji: '📖' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              if (!tab.disabled) {
                setActiveTab(tab.id as any);
                if (tab.id === 'history') loadHistory();
              }
            }}
            disabled={tab.disabled}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: activeTab === tab.id ? '#2c5f2d' : 'transparent',
              color: activeTab === tab.id ? 'white' : tab.disabled ? '#ccc' : '#666',
              cursor: tab.disabled ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: activeTab === tab.id ? 'bold' : 'normal',
              borderRadius: '8px 8px 0 0',
              transition: 'all 0.3s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div
          style={{
            padding: '15px',
            backgroundColor: '#ffebee',
            border: '1px solid #ef5350',
            borderRadius: '8px',
            marginBottom: '20px',
            color: '#c62828',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <div>🔄 Processing...</div>
        </div>
      )}

      {/* Tab 1: Capture & AI Identification */}
      {activeTab === 'capture' && !loading && (
        <div>
          <h2 style={{ color: '#2c5f2d', marginBottom: '20px' }}>📷 Capture Image & AI Identification</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
            {/* Camera Section */}
            <div>
              <h3 style={{ color: '#2c5f2d', marginBottom: '15px' }}>Camera</h3>

              {!cameraActive ? (
                <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f9f9f9', borderRadius: '10px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '20px' }}>📷</div>
                  <p style={{ color: '#666', marginBottom: '20px' }}>
                    {cameraPermission ? 'Ready to capture' : 'Request camera access'}
                  </p>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button
                      onClick={startCamera}
                      style={{
                        padding: '12px 24px',
                        backgroundColor: '#2c5f2d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                      }}
                    >
                      📷 Open Camera
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        padding: '12px 24px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                      }}
                    >
                      📁 Upload Image
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    style={{
                      width: '100%',
                      borderRadius: '10px',
                      marginBottom: '15px',
                      maxHeight: '400px',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={captureImage}
                      style={{
                        flex: 1,
                        padding: '12px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                      }}
                    >
                      ✓ Capture
                    </button>
                    <button
                      onClick={stopCamera}
                      style={{
                        flex: 1,
                        padding: '12px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                      }}
                    >
                      ✕ Close
                    </button>
                  </div>
                </div>
              )}

              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>

            {/* Image Preview & Details */}
            <div>
              <h3 style={{ color: '#2c5f2d', marginBottom: '15px' }}>Image & Details</h3>

              {capturedImage && (
                <img
                  src={capturedImage}
                  alt="Captured"
                  style={{
                    width: '100%',
                    borderRadius: '10px',
                    marginBottom: '15px',
                    maxHeight: '300px',
                    objectFit: 'cover',
                  }}
                />
              )}

              <div style={{ display: 'grid', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Crop Type:</label>
                  <input
                    type="text"
                    value={cropType}
                    onChange={(e) => setCropType(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                    placeholder="e.g., Cotton, Paddy"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>District:</label>
                  <input
                    type="text"
                    value={location.district}
                    onChange={(e) => setLocation({ ...location, district: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                    placeholder="e.g., Salem"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Contact (Optional):</label>
                  <input
                    type="tel"
                    value={farmerContact}
                    onChange={(e) => setFarmerContact(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                    placeholder="Mobile number"
                  />
                </div>

                {capturedImage && (
                  <button
                    onClick={processImageWithAI}
                    disabled={aiProcessing}
                    style={{
                      padding: '15px',
                      backgroundColor: serverAvailable !== false ? '#2c5f2d' : '#ffc107',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    {aiProcessing ? '⏳ Processing AI...' : '🤖 Identify with AI'}
                  </button>
                )}

                <p style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>
                  {serverAvailable === false
                    ? '⚠️ Server offline - Use manual identification'
                    : '✓ Server available - High accuracy identification'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Manual Selection */}
      {activeTab === 'manual' && !loading && (
        <div>
          <h2 style={{ color: '#2c5f2d', marginBottom: '20px' }}>📋 Manual Pest Selection (Offline)</h2>

          {/* Symptom Search */}
          <div style={{ marginBottom: '40px' }}>
            <h3 style={{ color: '#2c5f2d', marginBottom: '15px' }}>🔍 Search by Symptoms</h3>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <input
                type="text"
                value={searchSymptoms}
                onChange={(e) => setSearchSymptoms(e.target.value)}
                style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                placeholder="e.g., holes in leaves, webbing, dark spots"
              />
              <button
                onClick={handleSymptomSearch}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#2c5f2d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Search
              </button>
            </div>

            {searchResults.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                {searchResults.map((pest) => {
                  const info = pestIdentificationService.getPestInfo(pest);
                  return (
                    <div
                      key={pest}
                      onClick={() => setSelectedPest(pest)}
                      style={{
                        padding: '15px',
                        border: selectedPest === pest ? '3px solid #2c5f2d' : '1px solid #e0e0e0',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        backgroundColor: selectedPest === pest ? '#f0f8f0' : 'white',
                      }}
                    >
                      <h4 style={{ color: '#2c5f2d', margin: 0 }}>{info.pestName}</h4>
                      <p style={{ color: '#666', fontSize: '12px', margin: '5px 0' }}>{info.scientificName}</p>
                      <p style={{ fontSize: '12px', margin: '5px 0' }}>{info.description.substring(0, 80)}...</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Direct Selection */}
          <div>
            <h3 style={{ color: '#2c5f2d', marginBottom: '15px' }}>🐛 Select from Database</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              {pestCategories.map((category) => {
                const info = pestIdentificationService.getPestInfo(category);
                return (
                  <div
                    key={category}
                    onClick={() => setSelectedPest(category)}
                    style={{
                      padding: '20px',
                      border: selectedPest === category ? '3px solid #2c5f2d' : '1px solid #e0e0e0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: selectedPest === category ? '#f0f8f0' : 'white',
                      boxShadow: selectedPest === category ? '0 4px 8px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <h4 style={{ color: '#2c5f2d', margin: 0 }}>{info.pestName}</h4>
                      <span
                        style={{
                          padding: '3px 8px',
                          backgroundColor: getSeverityColor(info.severity),
                          color: 'white',
                          borderRadius: '3px',
                          fontSize: '11px',
                        }}
                      >
                        {info.severity}
                      </span>
                    </div>

                    <p style={{ fontSize: '12px', color: '#666', margin: '5px 0', fontStyle: 'italic' }}>
                      {info.scientificName}
                    </p>

                    <p style={{ fontSize: '12px', margin: '10px 0' }}>{info.description.substring(0, 100)}...</p>

                    <p style={{ fontSize: '11px', color: '#666', margin: '5px 0' }}>
                      <strong>Symptoms:</strong> {info.symptoms.slice(0, 2).join(', ')}...
                    </p>

                    <p style={{ fontSize: '11px', color: '#666', margin: '5px 0' }}>
                      <strong>Crops:</strong> {info.affectedCrops.slice(0, 2).join(', ')}...
                    </p>
                  </div>
                );
              })}
            </div>

            {selectedPest && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Crop Type:</label>
                  <input
                    type="text"
                    value={cropType}
                    onChange={(e) => setCropType(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                    placeholder="e.g., Cotton"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>District:</label>
                  <input
                    type="text"
                    value={location.district}
                    onChange={(e) => setLocation({ ...location, district: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                    placeholder="e.g., Salem"
                  />
                </div>

                <button
                  onClick={handleManualSelection}
                  style={{
                    gridColumn: '1 / -1',
                    padding: '15px',
                    backgroundColor: '#2c5f2d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '16px',
                  }}
                >
                  ✓ Confirm Selection & Get Remedies
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Results */}
      {activeTab === 'results' && identification && !loading && (
        <div>
          <h2 style={{ color: '#2c5f2d', marginBottom: '20px' }}>✅ Identification Results</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '40px' }}>
            {/* Image & Basic Info */}
            <div>
              {identification.imageDataUrl && (
                <img
                  src={identification.imageDataUrl}
                  alt="Identified"
                  style={{ width: '100%', borderRadius: '10px', marginBottom: '20px' }}
                />
              )}

              <div style={{ padding: '20px', backgroundColor: '#f0f8f0', borderRadius: '10px' }}>
                <h3 style={{ color: '#2c5f2d', margin: 0, marginBottom: '15px' }}>
                  {identification.pestInfo.pestName}
                </h3>

                <div style={{ display: 'grid', gap: '10px', fontSize: '14px' }}>
                  <p>
                    <strong>Scientific Name:</strong> <em>{identification.pestInfo.scientificName}</em>
                  </p>
                  <p>
                    <strong>Identified as:</strong>{' '}
                    <span
                      style={{
                        padding: '3px 8px',
                        backgroundColor: getSeverityColor(identification.pestInfo.severity),
                        color: 'white',
                        borderRadius: '3px',
                      }}
                    >
                      {identification.pestInfo.severity}
                    </span>
                  </p>
                  <p>
                    <strong>Method:</strong> {identification.identificationMethod}
                  </p>
                  {identification.aiDetection && (
                    <p>
                      <strong>Confidence:</strong> {(identification.aiDetection.confidence * 100).toFixed(1)}%
                    </p>
                  )}
                  <p>
                    <strong>Timestamp:</strong> {new Date(identification.timestamp).toLocaleString()}
                  </p>

                  {identification.cropType && (
                    <p>
                      <strong>Crop Type:</strong> {identification.cropType}
                    </p>
                  )}

                  {identification.location?.district && (
                    <p>
                      <strong>Location:</strong> {identification.location.district}
                      {identification.location.block && `, ${identification.location.block}`}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Pest Details */}
            <div>
              <div style={{ padding: '20px', backgroundColor: '#fff3cd', borderRadius: '10px', marginBottom: '20px' }}>
                <h4 style={{ color: '#2c5f2d', marginTop: 0 }}>📖 Description</h4>
                <p style={{ fontSize: '14px' }}>{identification.pestInfo.description}</p>
              </div>

              <div style={{ padding: '20px', backgroundColor: '#e7f4e4', borderRadius: '10px' }}>
                <h4 style={{ color: '#2c5f2d', marginTop: 0 }}>🚜 Affected Crops</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {identification.pestInfo.affectedCrops.map((crop) => (
                    <span
                      key={crop}
                      style={{
                        padding: '5px 10px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '12px',
                      }}
                    >
                      {crop}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Symptoms */}
          <div style={{ marginBottom: '40px' }}>
            <h3 style={{ color: '#2c5f2d', marginBottom: '15px' }}>⚠️ Symptoms</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
              {identification.pestInfo.symptoms.map((symptom, index) => (
                <div
                  key={index}
                  style={{
                    padding: '15px',
                    backgroundColor: '#fff3cd',
                    border: '1px solid #ffc107',
                    borderRadius: '8px',
                  }}
                >
                  <p style={{ margin: 0, fontSize: '14px' }}>✓ {symptom}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Remedial Measures */}
          <div>
            <h3 style={{ color: '#2c5f2d', marginBottom: '15px' }}>🛠️ Remedial Measures</h3>
            <div style={{ display: 'grid', gap: '20px' }}>
              {identification.remedialMeasures.map((measure, index) => (
                <details
                  key={index}
                  style={{
                    padding: '15px',
                    border: `2px solid ${getMeasureTypeColor(measure.type)}`,
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                  }}
                >
                  <summary style={{ fontWeight: 'bold', fontSize: '16px', color: '#2c5f2d' }}>
                    <span
                      style={{
                        marginRight: '10px',
                        padding: '3px 8px',
                        backgroundColor: getMeasureTypeColor(measure.type),
                        color: 'white',
                        borderRadius: '3px',
                        fontSize: '12px',
                      }}
                    >
                      {measure.type}
                    </span>
                    {measure.title}
                  </summary>

                  <div style={{ marginTop: '15px', paddingLeft: '20px' }}>
                    <p style={{ fontSize: '14px' }}>{measure.description}</p>

                    <h5 style={{ marginTop: '15px', color: '#2c5f2d' }}>Materials Required:</h5>
                    <ul style={{ fontSize: '13px' }}>
                      {measure.materials.map((material, i) => (
                        <li key={i}>{material}</li>
                      ))}
                    </ul>

                    <h5 style={{ marginTop: '15px', color: '#2c5f2d' }}>Steps:</h5>
                    <ol style={{ fontSize: '13px' }}>
                      {measure.steps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>

                    {measure.costEstimate && (
                      <p style={{ fontSize: '13px', color: '#666' }}>
                        <strong>Cost:</strong> {measure.costEstimate}
                      </p>
                    )}

                    <p style={{ fontSize: '13px', color: '#666' }}>
                      <strong>Effectiveness:</strong> {measure.effectivenessPeriod}
                    </p>

                    <h5 style={{ marginTop: '15px', color: '#2c5f2d' }}>Precautions:</h5>
                    <ul style={{ fontSize: '13px' }}>
                      {measure.precautions.map((precaution, i) => (
                        <li key={i}>{precaution}</li>
                      ))}
                    </ul>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: History */}
      {activeTab === 'history' && !loading && (
        <div>
          <h2 style={{ color: '#2c5f2d', marginBottom: '20px' }}>📊 Identification History</h2>

          {history.length > 0 ? (
            <div>
              {/* Statistics Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '40px' }}>
                {[
                  { label: 'Total', value: history.length },
                  { label: 'AI-Based', value: history.filter(h => h.identificationMethod === 'AI').length },
                  { label: 'Manual', value: history.filter(h => h.identificationMethod === 'Manual').length },
                  { label: 'Avg Confidence', value: `${(history.filter(h => h.aiDetection).reduce((s, h) => s + (h.aiDetection?.confidence || 0), 0) / Math.max(history.filter(h => h.aiDetection).length, 1) * 100).toFixed(0)}%` },
                ].map((stat, i) => (
                  <div key={i} style={{ padding: '15px', backgroundColor: '#f0f8f0', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c5f2d' }}>{stat.value}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* History List */}
              <div style={{ display: 'grid', gap: '15px' }}>
                {history.map((record) => (
                  <div
                    key={record.resultId}
                    style={{
                      padding: '15px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr',
                      gap: '15px',
                    }}
                  >
                    {record.imageDataUrl && (
                      <img
                        src={record.imageDataUrl}
                        alt="History"
                        style={{ width: '80px', height: '80px', borderRadius: '5px', objectFit: 'cover' }}
                      />
                    )}

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <h4 style={{ color: '#2c5f2d', margin: 0 }}>{record.pestInfo.pestName}</h4>
                        <span
                          style={{
                            padding: '5px 10px',
                            backgroundColor: getMeasureTypeColor(record.identificationMethod),
                            color: 'white',
                            borderRadius: '3px',
                            fontSize: '12px',
                          }}
                        >
                          {record.identificationMethod}
                          {record.aiDetection && ` (${(record.aiDetection.confidence * 100).toFixed(0)}%)`}
                        </span>
                      </div>

                      <p style={{ margin: '5px 0', fontSize: '13px', color: '#666' }}>
                        {new Date(record.timestamp).toLocaleDateString()}
                        {record.cropType && ` • Crop: ${record.cropType}`}
                        {record.location?.district && ` • Location: ${record.location.district}`}
                      </p>

                      <p style={{ margin: '5px 0', fontSize: '13px' }}>
                        Severity:{' '}
                        <span
                          style={{
                            padding: '2px 6px',
                            backgroundColor: getSeverityColor(record.pestInfo.severity),
                            color: 'white',
                            borderRadius: '3px',
                          }}
                        >
                          {record.pestInfo.severity}
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              No identification history yet. Start by capturing or uploading an image.
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Pest Guide */}
      {activeTab === 'guide' && !loading && (
        <div>
          <h2 style={{ color: '#2c5f2d', marginBottom: '20px' }}>📖 Complete Pest Guide (Offline)</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {pestCategories.map((category) => {
              const info = pestIdentificationService.getPestInfo(category);
              return (
                <details
                  key={category}
                  style={{
                    padding: '15px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <summary style={{ fontWeight: 'bold', fontSize: '16px', color: '#2c5f2d', cursor: 'pointer' }}>
                    <span
                      style={{
                        marginRight: '10px',
                        padding: '3px 8px',
                        backgroundColor: getSeverityColor(info.severity),
                        color: 'white',
                        borderRadius: '3px',
                        fontSize: '11px',
                      }}
                    >
                      {info.severity}
                    </span>
                    {info.pestName}
                  </summary>

                  <div style={{ marginTop: '15px', paddingLeft: '20px', fontSize: '13px' }}>
                    <p>
                      <strong>Scientific Name:</strong> <em>{info.scientificName}</em>
                    </p>
                    <p>{info.description}</p>

                    <h5 style={{ marginTop: '15px', color: '#2c5f2d' }}>Symptoms:</h5>
                    <ul>
                      {info.symptoms.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>

                    <h5 style={{ marginTop: '15px', color: '#2c5f2d' }}>Affected Crops:</h5>
                    <p>{info.affectedCrops.join(', ')}</p>
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
