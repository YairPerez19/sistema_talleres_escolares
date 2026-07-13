import { useState } from 'react';
import { Download } from '@/components/icons';

interface DownloadAttendanceButtonProps {
  onDownload: () => void;
  disabled?: boolean;
}

export function DownloadAttendanceButton({
  onDownload,
  disabled = false,
}: DownloadAttendanceButtonProps) {
  const [checked, setChecked] = useState(false);

  const handleChange = () => {
    if (disabled || checked) return;
    setChecked(true);

    setTimeout(() => {
      onDownload();
    }, 3500);
  };

  return (
    <label className="download-btn">
      <input
        type="checkbox"
        className="checkbox-input"
        checked={checked}
        onChange={handleChange}
        disabled={disabled || checked}
      />
      <span className="circle">
        <Download
          className="download-icon"
          aria-hidden="true"
        />
        <div className="check-square" />
      </span>
      <p className="btn-title">Descargar</p>
      <p className="btn-title">Listo</p>
    </label>
  );
}
