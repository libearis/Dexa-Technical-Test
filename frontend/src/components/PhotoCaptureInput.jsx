import { useRef, useState } from 'react';

export function PhotoCaptureInput({ onChange }) {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] ?? null;
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
    onChange(file);
  };

  return (
    <div className="photo-capture">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
      />
      {previewUrl && <img src={previewUrl} alt="preview" className="photo-preview" />}
    </div>
  );
}
