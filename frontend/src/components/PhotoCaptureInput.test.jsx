import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { PhotoCaptureInput } from './PhotoCaptureInput';

beforeAll(() => {
  // jsdom doesn't implement object URLs
  global.URL.createObjectURL = vi.fn(() => 'blob:preview-url');
});

describe('PhotoCaptureInput', () => {
  it('renders with the given label', () => {
    render(<PhotoCaptureInput label="Foto check-in" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Foto check-in')).toBeInTheDocument();
  });

  it('falls back to a default label when none is given', () => {
    render(<PhotoCaptureInput onChange={vi.fn()} />);
    expect(screen.getByLabelText('Ambil foto')).toBeInTheDocument();
  });

  it('calls onChange with the selected file and shows a preview', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PhotoCaptureInput label="Foto check-in" onChange={onChange} />);

    const file = new File(['photo-bytes'], 'photo.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByLabelText('Foto check-in'), file);

    expect(onChange).toHaveBeenCalledWith(file);
    expect(screen.getByRole('img', { name: 'preview' })).toHaveAttribute(
      'src',
      'blob:preview-url',
    );
  });
});
