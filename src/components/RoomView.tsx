import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { AuthUser, Room, RoomAvailability } from '../types';
import { Modal } from './ui/Modal';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { StatusLabel } from './ui/StatusIndicator';

interface RoomViewProps {
  user: AuthUser;
  rooms: Room[];
  onAddRoom: (room: Room) => void;
  onUpdateRoom: (room: Room) => void;
  onDeleteRoom: (id: string) => void;
  openAddSignal?: number;
  onNotify: (type: 'success' | 'error' | 'warning', title: string, message?: string) => void;
}

export const RoomView: React.FC<RoomViewProps> = ({
  user,
  rooms,
  onAddRoom,
  onUpdateRoom,
  onDeleteRoom,
  openAddSignal = 0,
  onNotify,
}) => {
  const [search, setSearch] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [availFilter, setAvailFilter] = useState('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Room | null>(null);

  const [formNumber, setFormNumber] = useState('');
  const [formBuilding, setFormBuilding] = useState('Academic Block A');
  const [formFloor, setFormFloor] = useState('1st Floor');
  const [formCapacity, setFormCapacity] = useState('60');
  const [formAvailability, setFormAvailability] =
    useState<RoomAvailability>('Available');
  const [formError, setFormError] = useState('');

  const canManage = user.role === 'admin' || user.role === 'staff';

  const buildings = useMemo(
    () => Array.from(new Set(rooms.map((r) => r.building))).sort(),
    [rooms]
  );

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        r.roomNumber.toLowerCase().includes(q) ||
        r.building.toLowerCase().includes(q);
      const matchesBuilding =
        buildingFilter === 'all' || r.building === buildingFilter;
      const matchesAvail =
        availFilter === 'all' || r.availability === availFilter;
      return matchesSearch && matchesBuilding && matchesAvail;
    });
  }, [rooms, search, buildingFilter, availFilter]);

  const openAddModal = () => {
    setEditingRoom(null);
    setFormNumber('');
    setFormBuilding('Academic Block A');
    setFormFloor('1st Floor');
    setFormCapacity('60');
    setFormAvailability('Available');
    setFormError('');
    setModalOpen(true);
  };

  useEffect(() => {
    if (openAddSignal > 0 && canManage) {
      openAddModal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openAddSignal]);

  const openEditModal = (room: Room) => {
    setEditingRoom(room);
    setFormNumber(room.roomNumber);
    setFormBuilding(room.building);
    setFormFloor(room.floor);
    setFormCapacity(String(room.capacity));
    setFormAvailability(room.availability);
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cap = parseInt(formCapacity, 10);
    if (!formNumber.trim() || !formBuilding.trim()) {
      setFormError('Room Number and Building / Block are required.');
      return;
    }
    if (isNaN(cap) || cap <= 0) {
      setFormError('Room Capacity must be a positive number.');
      return;
    }
    if (
      !editingRoom &&
      rooms.some(
        (r) => r.roomNumber.toLowerCase() === formNumber.trim().toLowerCase()
      )
    ) {
      setFormError(`Room "${formNumber.trim()}" already exists.`);
      return;
    }

    const nextNum =
      301 +
      rooms.reduce((max, r) => {
        const n = parseInt(r.id.replace(/\D/g, ''), 10);
        return !isNaN(n) && n >= max ? n - 300 : max;
      }, rooms.length);

    const payload: Room = {
      id: editingRoom ? editingRoom.id : `RM-${nextNum}`,
      roomNumber: formNumber.trim(),
      building: formBuilding.trim(),
      floor: formFloor.trim() || 'Ground Floor',
      capacity: cap,
      availability: formAvailability,
    };

    if (editingRoom) {
      onUpdateRoom(payload);
      onNotify(
        'success',
        'Room Updated',
        `Room ${payload.roomNumber} (${payload.building}) saved.`
      );
    } else {
      onAddRoom(payload);
      onNotify(
        'success',
        'Room Added',
        `Room ${payload.roomNumber} (Capacity ${payload.capacity}) added.`
      );
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Room Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Maintain examination halls, seating capacities, and room readiness.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0F2547] hover:bg-blue-900 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Room</span>
          </button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by room number or building block..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
          <select
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            aria-label="Filter by building"
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="all">All Buildings</option>
            {buildings.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <select
            value={availFilter}
            onChange={(e) => setAvailFilter(e.target.value)}
            aria-label="Filter by availability"
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="all">All Availability</option>
            <option value="Available">Available</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Reserved">Reserved</option>
          </select>
        </div>
      </div>

      {/* Rooms Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">Room Number</th>
                <th className="py-3 px-4">Building / Block</th>
                <th className="py-3 px-4">Floor</th>
                <th className="py-3 px-4 text-right">Room Capacity</th>
                <th className="py-3 px-4">Room Availability</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRooms.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    No examination rooms match the active filters.
                  </td>
                </tr>
              ) : (
                filteredRooms.map((room) => (
                  <tr key={room.id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4 font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                      {room.roomNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-800 whitespace-nowrap">
                      {room.building}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {room.floor}
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums font-medium text-slate-900 text-right whitespace-nowrap">
                      {room.capacity} seats
                    </td>
                    <td className="py-3.5 px-4">
                      {canManage ? (
                        <select
                          value={room.availability}
                          onChange={(e) => {
                            const updated = {
                              ...room,
                              availability: e.target.value as RoomAvailability,
                            };
                            onUpdateRoom(updated);
                            onNotify(
                              'success',
                              'Room Status Updated',
                              `Room ${room.roomNumber} set to ${updated.availability}.`
                            );
                          }}
                          aria-label={`Availability for room ${room.roomNumber}`}
                          className={`px-2.5 py-1 text-xs font-medium rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                            room.availability === 'Available'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : room.availability === 'Maintenance'
                              ? 'bg-amber-50 border-amber-200 text-amber-800'
                              : 'bg-slate-100 border-slate-200 text-slate-700'
                          }`}
                        >
                          <option value="Available">Available</option>
                          <option value="Maintenance">Maintenance</option>
                          <option value="Reserved">Reserved</option>
                        </select>
                      ) : (
                        <StatusLabel status={room.availability} />
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {canManage ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(room)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                            title="Edit Room"
                            aria-label={`Edit room ${room.roomNumber}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(room)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                            title="Delete Room"
                            aria-label={`Delete room ${room.roomNumber}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          View only
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingRoom ? 'Edit Examination Room' : 'Add Examination Room'}
        subtitle="Configure room identifier, building block, and seating capacity."
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="room-form"
              className="px-4 py-2 text-xs font-medium text-white bg-[#0F2547] hover:bg-blue-900 rounded-lg"
            >
              {editingRoom ? 'Save Changes' : 'Add Room'}
            </button>
          </>
        }
      >
        <form id="room-form" onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Room Number
              </label>
              <input
                type="text"
                value={formNumber}
                onChange={(e) => setFormNumber(e.target.value)}
                placeholder="e.g. A-205"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Room Capacity
              </label>
              <input
                type="number"
                min={5}
                max={400}
                value={formCapacity}
                onChange={(e) => setFormCapacity(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Building or Block
            </label>
            <input
              type="text"
              value={formBuilding}
              onChange={(e) => setFormBuilding(e.target.value)}
              placeholder="e.g. Academic Block A"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Floor
              </label>
              <input
                type="text"
                value={formFloor}
                onChange={(e) => setFormFloor(e.target.value)}
                placeholder="e.g. 2nd Floor"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Availability
              </label>
              <select
                value={formAvailability}
                onChange={(e) =>
                  setFormAvailability(e.target.value as RoomAvailability)
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="Available">Available</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Reserved">Reserved</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            onDeleteRoom(deleteTarget.id);
            onNotify(
              'success',
              'Room Deleted',
              `Room ${deleteTarget.roomNumber} has been removed.`
            );
          }
        }}
        title="Delete Examination Room"
        message={`Are you sure you want to delete Room ${deleteTarget?.roomNumber} (${deleteTarget?.building})? Any allocations using this room will require reassignment.`}
        confirmLabel="Delete Room"
      />
    </div>
  );
};
