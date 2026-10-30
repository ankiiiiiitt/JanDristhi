import React, { useState, useEffect } from 'react';
import MobileAppExperience from './components/MobileAppExperience';
import UploadModal from './components/UploadModal';
import { fetchOverview, fetchRoadsGeoJSON, fetchObservations, fetchRepairs, checkSystemHealth } from './services/api';

export default function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [loading, setLoading] = useState(true);

  // Core Data States
  const [overview, setOverview] = useState(null);
  const [roadsGeoJson, setRoadsGeoJson] = useState(null);
  const [observations, setObservations] = useState([]);
  const [repairs, setRepairs] = useState([]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await checkSystemHealth();
      const [ovRes, roadsRes, obsRes, repRes] = await Promise.all([
        fetchOverview(),
        fetchRoadsGeoJSON(),
        fetchObservations(),
        fetchRepairs()
      ]);

      setOverview(ovRes.data);
      setIsMock(ovRes.isMock);
      setRoadsGeoJson(roadsRes.data);
      setObservations(obsRes.data || []);
      setRepairs(repRes.data || []);
    } catch (e) {
      console.error("Error loading JanDrishti data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleUploadSuccess = (newObservation) => {
    setObservations(prev => [newObservation, ...prev]);
    if (overview) {
      setOverview(prev => ({
        ...prev,
        total_hazards_detected: (prev.total_hazards_detected || 0) + 1,
        critical_hazards: (prev.critical_hazards || 0) + 1
      }));
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans select-none">
      <MobileAppExperience
        overview={overview}
        roadsGeoJson={roadsGeoJson}
        observations={observations}
        repairs={repairs}
        onRefresh={loadAllData}
        onOpenUpload={() => setIsModalOpen(true)}
      />

      {/* Modal for Telemetry & Image Ingestion */}
      <UploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  );
}
