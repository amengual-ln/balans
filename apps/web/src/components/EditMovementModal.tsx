import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Trash2 } from 'lucide-react';
import { Movement } from '@/hooks/useMovements';
import { apiPatch, apiDelete } from '@/hooks/useAPI';

const editSchema = z.object({
  descripcion: z.string().min(1).max(200).trim().optional(),
  categoria: z.string().max(50).optional().nullable(),
  fecha: z.string().optional(),
});

type EditFormData = z.infer<typeof editSchema>;

interface EditMovementModalProps {
  movement: Movement;
  onClose: () => void;
  onSuccess: (updated: Movement) => void;
  onDeleted: () => void;
}

export default function EditMovementModal({ movement, onClose, onSuccess, onDeleted }: EditMovementModalProps) {
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const form = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      descripcion: movement.descripcion,
      categoria: movement.categoria ?? '',
      fecha: movement.fecha.split('T')[0],
    },
  });

  const handleSubmit = async (data: EditFormData) => {
    setError('');
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {};
      if (data.descripcion !== undefined) payload.descripcion = data.descripcion;
      if (data.categoria !== undefined) payload.categoria = data.categoria || null;
      if (data.fecha !== undefined) payload.fecha = data.fecha;

      const result = await apiPatch<{ data: Movement }>(`/api/movements/${movement.id}`, payload);
      onSuccess(result.data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al editar movimiento');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este movimiento? La cuenta asociada será ajustada.')) return;
    setDeleting(true);
    setError('');
    try {
      await apiDelete(`/api/movements/${movement.id}`);
      onDeleted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar movimiento');
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50 animate-fade-in">
      <div className="w-full rounded-t-xl bg-white p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-text-primary">Editar movimiento</h2>
            <p className="mt-0.5 text-sm text-text-secondary">{movement.descripcion}</p>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">Fecha</label>
            <input
              type="date"
              {...form.register('fecha')}
              className="w-full rounded-lg border border-border px-3 py-2 text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {form.formState.errors.fecha && (
              <p className="text-sm text-negative">{form.formState.errors.fecha.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">Descripción</label>
            <input
              type="text"
              autoFocus
              {...form.register('descripcion')}
              className="w-full rounded-lg border border-border px-3 py-2 text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {form.formState.errors.descripcion && (
              <p className="text-sm text-negative">{form.formState.errors.descripcion.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">Categoría</label>
            <input
              type="text"
              {...form.register('categoria')}
              placeholder="Ej: Alimentación, Transporte"
              className="w-full rounded-lg border border-border px-3 py-2 text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {form.formState.errors.categoria && (
              <p className="text-sm text-negative">{form.formState.errors.categoria.message}</p>
            )}
          </div>

          {error && <p className="text-sm text-negative">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-text-secondary hover:bg-surface transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || deleting}
              className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>

        <button
          onClick={handleDelete}
          disabled={submitting || deleting}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-negative/30 py-2.5 text-sm font-medium text-negative hover:border-negative hover:bg-negative/5 transition-colors disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          {deleting ? 'Eliminando...' : 'Eliminar movimiento'}
        </button>
      </div>
    </div>
  );
}