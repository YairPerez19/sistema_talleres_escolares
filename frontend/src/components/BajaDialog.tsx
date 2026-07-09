import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface BajaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tallerNombre: string
  cambiosRestantes: number
  onConfirm: (motivo: string) => void
  loading?: boolean
}

export function BajaDialog({
  open,
  onOpenChange,
  tallerNombre,
  cambiosRestantes,
  onConfirm,
  loading = false,
}: BajaDialogProps) {
  const [motivo, setMotivo] = useState('')
  const esUltimaOportunidad = cambiosRestantes === 1

  const handleConfirm = () => {
    onConfirm(motivo)
    setMotivo('')
  }

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false)
      setMotivo('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        showCloseButton={!loading}
        className="sm:max-w-md bg-[#0d0d0d] border-[#8B1A32]/20 text-white"
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-extrabold text-white">
            {esUltimaOportunidad ? 'Ultima oportunidad' : 'Confirmar baja'}
          </DialogTitle>
          <DialogDescription className="text-white/50">
            Estás por darte de baja de{' '}
            <span className="text-white/80 font-semibold">{tallerNombre}</span>
          </DialogDescription>
        </DialogHeader>

        {esUltimaOportunidad && (
          <div className="flex items-start gap-3 rounded-xl border border-[#8B1A32]/30 bg-[#8B1A32]/5 p-4">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[#8B1A32]" />
            <div className="text-sm">
              <p className="font-bold text-[#8B1A32]">Es tu ultima oportunidad</p>
              <p className="text-white/50 mt-1">
                Despues de esta baja ya no podras hacer mas cambios de taller
                durante este ciclo.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-bold text-white/60 uppercase tracking-wider">
            Motivo de la baja
          </label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Escribe el motivo por el cual te das de baja..."
            rows={3}
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/20 resize-none outline-none focus:border-[#8B1A32]/40 focus:ring-1 focus:ring-[#8B1A32]/20 transition-all"
            disabled={loading}
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-white/30">
          <span>Te queda{cambiosRestantes === 1 ? '' : 'n'} {cambiosRestantes} cambio{cambiosRestantes === 1 ? '' : 's'} disponible{cambiosRestantes === 1 ? '' : 's'}</span>
        </div>

        <DialogFooter className="border-white/[0.04] bg-white/[0.02]">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="border-white/[0.08] text-white/70 hover:bg-white/[0.04] hover:text-white"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="bg-[#8B1A32] hover:bg-[#8B1A32]/80 text-white"
          >
            {loading ? 'Procesando...' : 'Confirmar baja'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
