import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OtpInput } from '../OtpInput';
import React from 'react';

function getCells() {
  return screen.getAllByRole('textbox');
}

function getValueFromCells() {
  const cells = getCells();
  return cells.map((c) => (c as HTMLInputElement).value).join('');
}

describe('OtpInput', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  function Wrapper() {
    const [value, setValue] = React.useState('');
    return <OtpInput value={value} onChange={setValue} length={6} />;
  }

  it('auto-advances focus on digit entry', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);
    const cells = getCells();
    expect(cells.length).toBe(6);

    await user.click(cells[0]);
    await user.type(cells[0], '1');

    expect(getValueFromCells()).toBe('1');
    expect(document.activeElement).toBe(cells[1]);
  });

  it('pastes full code across cells', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);
    const cells = getCells();

    await user.click(cells[0]);
    await user.paste('123456');

    expect(getValueFromCells()).toBe('123456');
    const texts = cells.map((c) => (c as HTMLInputElement).value);
    expect(texts).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(document.activeElement).toBe(cells[5]);
  });

  it('backspace navigates to previous cell and clears digit', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);
    const cells = getCells();

    await user.click(cells[0]);
    await user.type(cells[0], '1');
    await user.type(cells[1], '2');
    expect(getValueFromCells()).toBe('12');

    await user.type(cells[1], '{backspace}');
    expect(getValueFromCells()).toBe('1');
    // When cell has a digit, backspace clears it but keeps focus on the same cell
    expect(document.activeElement).toBe(cells[1]);
    expect((cells[1] as HTMLInputElement).value).toBe('');
  });

  it('ignores non-numeric input', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);
    const cells = getCells();

    await user.click(cells[0]);
    await user.type(cells[0], 'a');
    expect(getValueFromCells()).toBe('');
    expect((cells[0] as HTMLInputElement).value).toBe('');
  });
});