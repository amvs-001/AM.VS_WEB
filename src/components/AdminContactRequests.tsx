import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type ContactRequestStatus = 'pendiente' | 'contactado' | 'rechazado';

type ContactRequest = {
  id: string;
  nombre: string;
  entidad: string;
  email: string;
  telefono: string;
  localidad: string;
  fecha_evento: string;
  tipo_evento: string;
  mensaje: string;
  estado: ContactRequestStatus;
  created_at: string;
};

function mapRequest(row: Record<string, unknown>): ContactRequest {
  const status = row.estado === 'contactado' || row.estado === 'rechazado'
    ? row.estado
    : 'pendiente';
  return {
    id: String(row.id ?? ''),
    nombre: String(row.nombre ?? ''),
    entidad: String(row.entidad ?? ''),
    email: String(row.email ?? ''),
    telefono: String(row.telefono ?? ''),
    localidad: String(row.localidad ?? ''),
    fecha_evento: String(row.fecha_evento ?? ''),
    tipo_evento: String(row.tipo_evento ?? ''),
    mensaje: String(row.mensaje ?? ''),
    estado: status,
    created_at: String(row.created_at ?? ''),
  };
}

function isContactRequestStatus(value: string): value is ContactRequestStatus {
  return value === 'pendiente' || value === 'contactado' || value === 'rechazado';
}

export default function AdminContactRequests() {
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadRequests() {
      if (!supabase) {
        setError('Supabase no está configurado; no se pueden consultar las solicitudes.');
        setIsLoading(false);
        return;
      }

      const { data, error: loadError } = await supabase
        .from('contact_requests')
        .select('id, nombre, entidad, email, telefono, localidad, fecha_evento, tipo_evento, mensaje, estado, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!isMounted) return;
      if (loadError) {
        setError(`No se pudieron cargar las solicitudes: ${loadError.message}. Ejecuta supabase/admin_panel_setup.sql.`);
      } else {
        setRequests((data ?? []).map(mapRequest));
      }
      setIsLoading(false);
    }

    void loadRequests();
    return () => {
      isMounted = false;
    };
  }, []);

  async function updateStatus(request: ContactRequest, status: ContactRequestStatus) {
    if (!supabase) {
      setError('Supabase no está configurado; no se puede actualizar la solicitud.');
      return;
    }

    setBusyId(request.id);
    setError('');
    setMessage('');
    const { data: updated, error: updateError } = await supabase
      .from('contact_requests')
      .update({ estado: status })
      .eq('id', request.id)
      .select('id')
      .maybeSingle();
    if (updateError || !updated) {
      setError(updateError
        ? `No se pudo actualizar la solicitud: ${updateError.message}`
        : 'No se pudo actualizar la solicitud porque ya no existe o no tienes permiso.');
    } else {
      setRequests((current) => current.map((item) => (
        item.id === request.id ? { ...item, estado: status } : item
      )));
      setMessage(`Solicitud de ${request.nombre}: estado actualizado.`);
    }
    setBusyId('');
  }

  async function deleteRequest(request: ContactRequest) {
    if (!supabase) {
      setError('Supabase no está configurado; no se puede eliminar la solicitud.');
      return;
    }
    if (!window.confirm(`¿Eliminar la solicitud de ${request.nombre}? Esta acción no se puede deshacer.`)) return;

    setBusyId(request.id);
    setError('');
    setMessage('');
    const { data: deleted, error: deleteError } = await supabase
      .from('contact_requests')
      .delete()
      .eq('id', request.id)
      .select('id')
      .maybeSingle();
    if (deleteError || !deleted) {
      setError(deleteError
        ? `No se pudo eliminar la solicitud: ${deleteError.message}`
        : 'No se pudo eliminar la solicitud porque ya no existe o no tienes permiso.');
    } else {
      setRequests((current) => current.filter((item) => item.id !== request.id));
      setMessage(`Solicitud de ${request.nombre} eliminada.`);
    }
    setBusyId('');
  }

  return (
    <section id="admin-requests" className="contact-requests">
      <div className="contact-requests-heading">
        <div>
          <h2>Solicitudes de contratación</h2>
          <p>Las solicitudes se guardan en privado y solo las ve Administración. Se muestran las 100 más recientes.</p>
        </div>
        <span>{requests.length}</span>
      </div>
      {isLoading ? <p role="status">Cargando solicitudes…</p> : null}
      {!isLoading && requests.length === 0 ? <p>No hay solicitudes de contratación.</p> : null}
      <div className="contact-requests-list">
        {requests.map((request) => (
          <article key={request.id} className="contact-request">
            <div className="contact-request-heading">
              <div>
                <h3>{request.nombre}{request.entidad ? ` · ${request.entidad}` : ''}</h3>
                <span>{request.created_at ? new Date(request.created_at).toLocaleString('es-ES') : ''}</span>
              </div>
              <select
                aria-label={`Estado de solicitud de ${request.nombre}`}
                value={request.estado}
                disabled={busyId === request.id}
                onChange={(event) => {
                  const status = event.target.value;
                  if (isContactRequestStatus(status)) void updateStatus(request, status);
                }}
              >
                <option value="pendiente">Pendiente</option>
                <option value="contactado">Contactado</option>
                <option value="rechazado">Rechazado</option>
              </select>
            </div>
            <div className="contact-request-details">
              <a href={`mailto:${request.email}`}>{request.email}</a>
              <a href={`tel:${request.telefono.replace(/[^\d+]/g, '')}`}>{request.telefono}</a>
              <span>{request.localidad}</span>
              <span>{request.fecha_evento || 'Fecha sin indicar'} · {request.tipo_evento}</span>
            </div>
            <p className="contact-request-message">{request.mensaje}</p>
            <button
              type="button"
              className="button secondary"
              disabled={busyId === request.id}
              onClick={() => { void deleteRequest(request); }}
            >
              Eliminar solicitud
            </button>
          </article>
        ))}
      </div>
      {error ? <p className="error-text" role="alert">{error}</p> : null}
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
