import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'

// Helper to center map if nodes change (optional)
function ChangeView({ center, zoom }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

function getNodeColor(node) {
    if (node.waterStatus === 'OVERFLOW' || node.gasLevel > 2000) return '#d32f2f' // --gov-red
    if (node.waterStatus === 'DRY' || node.distance < 8 || (node.drainDistance != null && node.drainDistance < 5)) return '#F57C00' // --gov-amber
    return '#558B2F' // --gov-green
}

const VIT_CHENNAI_COORDS = [12.8406, 80.1534];

export default function SensorMap({ nodes }) {
    // Ensure nodes have coordinates or use default around VIT
    const validNodes = nodes.map((n, i) => ({
        ...n,
        position: [
            n.lat || (VIT_CHENNAI_COORDS[0] + (i * 0.001) - 0.001), 
            n.lng || (VIT_CHENNAI_COORDS[1] + (i * 0.001) - 0.001)
        ],
        color: getNodeColor(n)
    }))

    return (
        <div className="card" style={{ padding: 0, overflow: 'hidden', height: '400px', position: 'relative', border: '1px solid var(--border-color)' }}>
            <div style={{ 
                position: 'absolute', top: '12px', right: '12px', zindex: 1000, 
                background: 'rgba(255,255,255,0.9)', padding: '4px 10px', 
                borderRadius: '20px', fontSize: '10px', fontWeight: 'bold', 
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)', border: '1px solid var(--border-color)',
                color: 'var(--text-primary)', pointerEvents: 'none'
            }}>
                📍 VIT CHENNAI CAMPUS MAP (LIVE)
            </div>

            <MapContainer 
                center={VIT_CHENNAI_COORDS} 
                zoom={15} 
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {validNodes.map((node, i) => (
                    <CircleMarker 
                        key={node._id || i}
                        center={node.position}
                        radius={10}
                        pathOptions={{ 
                            fillColor: node.color, 
                            color: '#fff', 
                            weight: 2, 
                            fillOpacity: 0.8 
                        }}
                    >
                        <Popup>
                            <div style={{ fontFamily: 'var(--font-body)', minWidth: '160px' }}>
                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: node.color, marginBottom: '4px' }}>
                                    {node.nodeId} — {node.zone}
                                </div>
                                <div style={{ fontSize: '12px', borderTop: '1px solid #eee', paddingTop: '4px' }}>
                                    <div><strong>Status:</strong> {node.waterStatus || 'NORMAL'}</div>
                                    <div><strong>Gas Level:</strong> {node.gasLevel || 0}</div>
                                    <div><strong>Battery:</strong> {node.batteryLevel || 100}%</div>
                                    <div><strong>Last Updated:</strong> {new Date(node.timestamp).toLocaleTimeString()}</div>
                                </div>
                                <div style={{ marginTop: '8px', fontSize: '11px', color: '#666' }}>
                                    📍 {node.position[0].toFixed(4)}, {node.position[1].toFixed(4)}
                                </div>
                            </div>
                        </Popup>
                    </CircleMarker>
                ))}
            </MapContainer>

            {/* Custom Legend Overlay */}
            <div style={{ 
                position: 'absolute', bottom: '12px', left: '12px', zIndex: 1000, 
                background: 'rgba(255,255,255,0.9)', padding: '8px 12px', 
                borderRadius: '8px', border: '1px solid var(--border-color)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
                <div style={{ display: 'flex', gap: '12px', fontSize: '10px', fontWeight: 'bold' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#558B2F' }}></div> HEALTHY
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F57C00' }}></div> WARNING
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#d32f2f' }}></div> CRITICAL
                    </div>
                </div>
            </div>
        </div>
    )
}
