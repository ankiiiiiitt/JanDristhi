import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import MetricCards from './components/MetricCards';
import RoadMap from './components/RoadMap';
import AnalyticsCharts from './components/AnalyticsCharts';
import RepairAudit from './components/RepairAudit';
import MobileCollector from './components/MobileCollector';
import UploadModal from './components/UploadModal';
import { fetchOverview, fetchRoadsGeoJSON, fetchObservations, fetchRepairs, checkSystemHealth } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data states
  const [overview, setOverview] = useState(null);
  const [roadsGeoJson, setRoadsGeoJson] = useState(null);
  const [observations, setObservations] = useState([]);
  const [repairs, setRepairs] = useState([]);
  const [selectedSegment, setSelectedSegment] = useState(null);

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
    // Optionally refresh overview
    if (overview) {
      setOverview(prev => ({
        ...prev,
        total_hazards_detected: (prev.total_hazards_detected || 0) + 1,
        critical_hazards: (prev.critical_hazards || 0) + 1
      }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        isMock={isMock}
        onOpenUpload={() => setIsModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* KPI Metrics */}
        <MetricCards overview={overview} />

        {/* Tab 1: GIS Map & Infrastructure Condition */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-200">Urban Road Network Condition Map</h2>
                <p className="text-xs text-slate-400">
                  Real-time color-coded health status (Green: Good, Amber: Fair, Red: Critical) and AI hazard pins.
                </p>
              </div>
              {selectedSegment && (
                <div className="text-xs px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
                  Active Segment: <b className="text-emerald-400">{selectedSegment.name}</b>
                </div>
              )}
            </div>

            <RoadMap
              geojson={roadsGeoJson}
              observations={observations}
              onSelectSegment={setSelectedSegment}
            />

            {/* Quick Analytics Summary below map */}
            <AnalyticsCharts
              overview={overview}
              selectedSegment={selectedSegment}
            />
          </div>
        )}

        {/* Tab 2: Detailed Risk Analytics & Multi-Hazard Fusion */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-semibold text-slate-200">Infrastructure Risk & Hazard Forecast</h2>
              <p className="text-xs text-slate-400">
                Multi-Hazard Fusion evaluating crack density, monsoon overflow, and vehicular axle shocks.
              </p>
            </div>
            <AnalyticsCharts
              overview={overview}
              selectedSegment={selectedSegment}
            />
          </div>
        )}

        {/* Tab 3: Repair Verification Audit */}
        {activeTab === 'repairs' && (
          <RepairAudit
            repairs={repairs}
            onRefresh={loadAllData}
          />
        )}

        {/* Tab 4: Android Chrome Mobile Collector */}
        {activeTab === 'collector' && (
          <MobileCollector
            onUploadSuccess={handleUploadSuccess}
            onRefresh={loadAllData}
          />
        )}
      </main>

      {/* Modal for Telemetry & Image Ingestion */}
      <UploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        JanDrishti Collaborative Platform – Built for Urban Infrastructure Hackathon 2026
      </footer>
    </div>
  );
}

