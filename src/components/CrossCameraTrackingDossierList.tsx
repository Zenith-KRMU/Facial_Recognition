import { useState, type MouseEvent } from 'react';
import { TrackedPerson, CameraId, IdentifiedObject, RegisteredFace } from '../types';
import { getEnrolledFaces, deleteEnrolledFace } from '../utils/faceRecognition';
import {
  isDangerousObject,
  classifyObjectCategory,
  getObjectIcon,
} from '../utils/objectClassifier';
import { playSecuritySiren } from '../utils/audioAlert';
import {
  Users,
  Search,
  ShieldAlert,
  Camera,
  Package,
  CheckCircle2,
  Trash2,
  Fingerprint,
  Layers,
  Volume2,
  AlertTriangle,
} from 'lucide-react';

interface CrossCameraTrackingDossierListProps {
  people: TrackedPerson[];
  objects: IdentifiedObject[];
  selectedPersonId: string | null;
  onSelectPerson: (person: TrackedPerson) => void;
  selectedObjectId?: string | null;
  onSelectObject?: (obj: IdentifiedObject) => void;
  onSelectCamera: (camId: CameraId) => void;
  onRegistryUpdated?: () => void;
}

export function CrossCameraTrackingDossierList({
  people,
  objects,
  selectedPersonId,
  onSelectPerson,
  selectedObjectId,
  onSelectObject,
  onSelectCamera,
  onRegistryUpdated,
}: CrossCameraTrackingDossierListProps) {
  const [activeTab, setActiveTab] = useState<'PEOPLE' | 'OBJECTS' | 'REGISTRY'>('PEOPLE');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'FLAGGED' | 'OCCLUDED' | 'REGISTERED'>('ALL');
  const [objectCategoryFilter, setObjectCategoryFilter] = useState<
    'ALL' | 'DANGER' | 'VEHICLE' | 'STATIONERY' | 'LUGGAGE' | 'TECH'
  >('ALL');

  const enrolledFaces = getEnrolledFaces();
  const dangerousObjectCount = objects.filter(
    (o) => o.isDangerous || isDangerousObject(o.class)
  ).length;

  const filteredPeople = people.filter((p) => {
    const matchesSearch =
      p.clusterId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.camera.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'FLAGGED') return p.isFlaggedSuspicious || p.status === 'WATCHLIST_FLAG';
    if (filterType === 'OCCLUDED') return p.occlusionPercent > 20;
    if (filterType === 'REGISTERED') return p.status === 'REGISTERED';
    return true;
  });

  const filteredObjects = objects.filter((o) => {
    const matchesSearch =
      o.class.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.camera.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    const isDangerous = o.isDangerous || isDangerousObject(o.class);
    const category = o.category || classifyObjectCategory(o.class);

    if (objectCategoryFilter === 'DANGER') return isDangerous;
    if (objectCategoryFilter === 'VEHICLE') return category === 'VEHICLE';
    if (objectCategoryFilter === 'STATIONERY') return category === 'STATIONERY';
    if (objectCategoryFilter === 'LUGGAGE') return category === 'LUGGAGE';
    if (objectCategoryFilter === 'TECH') return category === 'ELECTRONIC';
    return true;
  });

  const handleDeleteEnrolled = (id: string, e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    deleteEnrolledFace(id);
    if (onRegistryUpdated) onRegistryUpdated();
  };

  return (
    <div className="flex flex-col h-full glass-panel border border-white/[0.08] rounded-2xl overflow-hidden text-slate-200 shadow-xl font-mono text-xs">
      {/* Header & Sub-Tabs */}
      <div className="p-3 border-b border-white/[0.08] bg-white/[0.02] flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-400" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-100">
              Live Neural Telemetry
            </h3>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/30">
            {activeTab === 'PEOPLE' ? `${people.length} Faces` : activeTab === 'OBJECTS' ? `${objects.length} Objects` : `${enrolledFaces.length} Enrolled`}
          </span>
        </div>

        {/* View Switcher: Faces / Objects / Database */}
        <div className="grid grid-cols-3 gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.06] text-[11px]">
          <button
            onClick={() => setActiveTab('PEOPLE')}
            className={`py-1 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'PEOPLE'
                ? 'bg-violet-600 text-white font-bold shadow-[0_0_10px_rgba(139,92,246,0.3)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Fingerprint className="w-3 h-3" />
            <span>Faces ({people.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('OBJECTS')}
            className={`py-1 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'OBJECTS'
                ? 'bg-cyan-600 text-white font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="w-3 h-3" />
            <span>Objects ({objects.length})</span>
            {dangerousObjectCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping ml-0.5" title="Dangerous object detected" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('REGISTRY')}
            className={`py-1 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'REGISTRY'
                ? 'bg-emerald-600 text-white font-bold shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Registry</span>
          </button>
        </div>
      </div>

      {/* Search Input & Category Filters */}
      <div className="p-2.5 border-b border-white/[0.06] bg-black/20 space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'PEOPLE'
                ? 'Search face cluster or citizen name...'
                : activeTab === 'OBJECTS'
                ? 'Search object (knife, pen, car, backpack)...'
                : 'Search enrolled face database...'
            }
            className="w-full glass border border-white/[0.08] rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/70 font-sans"
          />
        </div>

        {activeTab === 'PEOPLE' && (
          <div className="flex gap-1 overflow-x-auto text-[10px]">
            {(['ALL', 'FLAGGED', 'OCCLUDED', 'REGISTERED'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setFilterType(filter)}
                className={`px-2 py-0.5 rounded-lg transition-all whitespace-nowrap ${
                  filterType === filter
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40 font-bold'
                    : 'glass-card border-white/[0.08] text-slate-400 hover:text-slate-200'
                }`}
              >
                {filter === 'ALL'
                  ? 'All'
                  : filter === 'FLAGGED'
                  ? 'Flagged'
                  : filter === 'OCCLUDED'
                  ? 'Occluded'
                  : 'Registered'}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'OBJECTS' && (
          <div className="flex gap-1 overflow-x-auto text-[10px] pb-0.5">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'DANGER', label: `🚨 Weapons (${dangerousObjectCount})` },
              { id: 'VEHICLE', label: '🚗 Cars' },
              { id: 'STATIONERY', label: '🖊️ Pens' },
              { id: 'LUGGAGE', label: '🎒 Luggage' },
              { id: 'TECH', label: '💻 Tech' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setObjectCategoryFilter(cat.id as any)}
                className={`px-2 py-0.5 rounded-lg transition-all whitespace-nowrap ${
                  objectCategoryFilter === cat.id
                    ? cat.id === 'DANGER'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/50 font-bold shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                    : 'glass-card border-white/[0.08] text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main List Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* TAB 1: FACES */}
        {activeTab === 'PEOPLE' && (
          <>
            {people.some((p) => p.status === 'UNREGISTERED') && (
              <div className="p-2.5 mb-2 rounded-xl bg-violet-950/40 border border-violet-500/30 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[11px] text-violet-200">
                  <Fingerprint className="w-4 h-4 text-violet-400 shrink-0" />
                  <span>Unregistered face in camera</span>
                </div>
                <button
                  onClick={() => {
                    const target = people.find((p) => p.status === 'UNREGISTERED');
                    if (target) onSelectPerson(target);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold text-[10px] whitespace-nowrap transition-colors"
                >
                  Enroll / Identify
                </button>
              </div>
            )}
            {filteredPeople.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-[11px] leading-relaxed">
                No faces detected in active camera feed.
                <div className="text-violet-400 mt-1">Camera is scanning for faces in real-time.</div>
              </div>
            ) : (
              filteredPeople.map((person) => {
                const isSelected = selectedPersonId === person.id;
                const isHighRisk = person.isFlaggedSuspicious || person.riskScore > 75;

                return (
                  <div
                    key={person.id}
                    onClick={() => onSelectPerson(person)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'active-ring bg-violet-950/30 border-violet-500/60 shadow-[0_0_20px_rgba(139,92,246,0.25)]'
                        : isHighRisk
                        ? 'glass-card border-red-500/40 bg-red-950/20 hover:border-red-500/60'
                        : person.status === 'REGISTERED'
                        ? 'glass-card border-emerald-500/30 bg-emerald-950/10 hover:border-emerald-500/50'
                        : 'glass-card border-white/[0.08] hover:border-violet-500/40 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {person.faceCropUrl ? (
                        <img
                          src={person.faceCropUrl}
                          alt="Crop"
                          className="w-9 h-9 rounded-xl object-cover border border-violet-400/40 shrink-0"
                        />
                      ) : (
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border ${
                            isHighRisk
                              ? 'bg-red-500/20 text-red-400 border-red-500/40'
                              : person.status === 'REGISTERED'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                              : 'bg-violet-500/20 text-violet-300 border-violet-500/40'
                          }`}
                        >
                          {person.status === 'REGISTERED' ? '✓' : person.clusterId.slice(-3)}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-xs truncate">
                            {person.clusterId}
                          </span>
                          {isHighRisk && <ShieldAlert className="w-3 h-3 text-red-400 shrink-0" />}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate font-sans">
                          {person.label}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold border ${
                          person.status === 'REGISTERED'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : isHighRisk
                            ? 'bg-red-500/20 text-red-300 border-red-500/30'
                            : 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                        }`}
                      >
                        {person.status === 'REGISTERED' ? `${person.matchConfidence.toFixed(0)}% MATCH` : 'NEW'}
                      </span>
                      <span className="text-[9px] text-slate-500 block mt-0.5">
                        {person.camera}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

        {/* TAB 2: IDENTIFIED OBJECTS */}
        {activeTab === 'OBJECTS' && (
          filteredObjects.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-[11px] leading-relaxed">
              No objects identified in current stream.
              <div className="text-cyan-400 mt-1">
                COCO-SSD detects everyday objects: knives, pens, cars, buses, phones, bottles, backpacks.
              </div>
            </div>
          ) : (
            filteredObjects.map((obj) => {
              const isSelected = selectedObjectId === obj.id;
              const isUnattended = obj.isUnattended;
              const isDangerous = obj.isDangerous || isDangerousObject(obj.class);
              const category = obj.category || classifyObjectCategory(obj.class);
              const icon = getObjectIcon(obj.class);

              return (
                <div
                  key={obj.id}
                  onClick={() => onSelectObject && onSelectObject(obj)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'active-ring bg-cyan-950/30 border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.25)]'
                      : isDangerous
                      ? 'glass-card border-red-500 bg-red-950/30 hover:border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.35)] animate-pulse'
                      : isUnattended
                      ? 'glass-card border-amber-500/50 bg-amber-950/20 hover:border-amber-500/70 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                      : category === 'VEHICLE'
                      ? 'glass-card border-sky-500/40 bg-sky-950/10 hover:border-sky-500/60'
                      : category === 'STATIONERY'
                      ? 'glass-card border-purple-500/40 bg-purple-950/10 hover:border-purple-500/60'
                      : 'glass-card border-white/[0.08] hover:border-cyan-500/40 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-base shrink-0 border ${
                        isDangerous
                          ? 'bg-red-500/30 border-red-500/60 text-red-300'
                          : isUnattended
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                          : category === 'VEHICLE'
                          ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                          : category === 'STATIONERY'
                          ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                          : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                      }`}
                    >
                      {icon}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-white text-xs uppercase truncate">
                          {obj.class}
                        </span>
                        {isDangerous && (
                          <span className="text-[9px] px-1 rounded bg-red-600 text-white font-bold border border-red-400">
                            🚨 DANGER / WEAPON
                          </span>
                        )}
                        {isUnattended && (
                          <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                            UNATTENDED
                          </span>
                        )}
                        <span className="text-[9px] px-1 rounded bg-white/[0.06] text-slate-400 border border-white/[0.1]">
                          {category}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                        Score: {obj.score}% • Time: {obj.detectedAt}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex items-center gap-2">
                    {isDangerous && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playSecuritySiren(3000);
                        }}
                        className="p-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-md transition-colors"
                        title="Trigger Emergency Security Siren"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold border ${
                          isDangerous
                            ? 'bg-red-500/20 text-red-300 border-red-500/40'
                            : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                        }`}
                      >
                        {obj.score}%
                      </span>
                      <span className="text-[9px] text-slate-500 block mt-0.5">
                        {obj.camera}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )
        )}

        {/* TAB 3: ENROLLED FACE REGISTRY */}
        {activeTab === 'REGISTRY' && (
          <>
            {people.length > 0 && (
              <div className="mb-3 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs text-emerald-200 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Active Face in Camera</span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">
                    Register current face to test live biometric identification.
                  </p>
                </div>
                <button
                  onClick={() => onSelectPerson(people[0])}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] whitespace-nowrap transition-colors flex items-center gap-1"
                >
                  <Fingerprint className="w-3 h-3" />
                  <span>Enroll</span>
                </button>
              </div>
            )}
            {enrolledFaces.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-[11px] leading-relaxed">
                No registered profiles in biometric database yet.
                <div className="text-emerald-400 mt-1">
                  Select any detected face in the camera and click "Save to Biometric Database" to register them!
                </div>
              </div>
            ) : (
              enrolledFaces.map((face) => (
                <div
                  key={face.id}
                  className="p-2.5 rounded-xl border border-white/[0.08] glass-card flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {face.faceCropUrl ? (
                      <img
                        src={face.faceCropUrl}
                        alt={face.name}
                        className="w-9 h-9 rounded-xl object-cover border border-emerald-400/40 shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
                        <Fingerprint className="w-4 h-4" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-xs truncate">{face.name}</span>
                        <span
                          className={`text-[9px] px-1 py-0.2 rounded font-bold border ${
                            face.status === 'REGISTERED'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-red-500/20 text-red-300 border-red-500/30'
                          }`}
                        >
                          {face.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">{face.role} • Enrolled {face.enrolledAt}</p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDeleteEnrolled(face.id, e)}
                    className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-white/[0.06] transition-colors shrink-0"
                    title="Remove from database"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
