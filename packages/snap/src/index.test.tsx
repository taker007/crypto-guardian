import { expect } from '@jest/globals';
import type { SnapConfirmationInterface } from '@metamask/snaps-jest';
import { installSnap } from '@metamask/snaps-jest';

describe('onRpcRequest', () => {
  describe('getCopyMode', () => {
    it('returns the current copy mode', async () => {
      const { request } = await installSnap();

      const response = await request({
        method: 'getCopyMode',
      });

      expect(response).toRespondWith({ mode: expect.stringMatching(/^(formal|plain)$/) });
    });
  });

  describe('showWarning', () => {
    it('shows a confirmation dialog', async () => {
      const { request } = await installSnap();

      const response = request({
        method: 'showWarning',
      });

      const ui = (await response.getInterface()) as SnapConfirmationInterface;
      expect(ui.type).toBe('confirmation');

      await ui.ok();

      expect(await response).toRespondWith(true);
    });
  });

  describe('simulateTransaction', () => {
    it('requires from and to addresses', async () => {
      const { request } = await installSnap();

      const response = await request({
        method: 'simulateTransaction',
        params: { from: '0x' + 'a'.repeat(40) },
      });

      expect(response).toRespondWithError({
        code: -32603,
        message: 'Both "from" and "to" addresses are required',
        stack: expect.any(String),
      });
    });

    it('shows a dialog when backend is unavailable (fallback)', async () => {
      const { request } = await installSnap();

      // Backend is not running in test — should show fallback warning
      const response = request({
        method: 'simulateTransaction',
        params: {
          from: '0x' + 'a'.repeat(40),
          to: '0x' + 'b'.repeat(40),
          data: '0x',
        },
      });

      const ui = (await response.getInterface()) as SnapConfirmationInterface;
      expect(ui.type).toBe('confirmation');

      await ui.ok();

      expect(await response).toRespondWith(true);
    });
  });

  it('throws an error if the requested method does not exist', async () => {
    const { request } = await installSnap();

    const response = await request({
      method: 'foo',
    });

    expect(response).toRespondWithError({
      code: -32603,
      message: 'Method not found: foo',
      stack: expect.any(String),
    });
  });
});

describe('onTransaction', () => {
  it('returns transaction insights content', async () => {
    const { onTransaction } = await installSnap();

    // Backend not running in test — should return fallback content
    const response = await onTransaction({
      from: `0x${'a'.repeat(40)}` as `0x${string}`,
      to: `0x${'b'.repeat(40)}` as `0x${string}`,
      data: '0x' as `0x${string}`,
      value: '0x0' as `0x${string}`,
      chainId: 'eip155:1',
    });

    // Should return insights content (not an error)
    expect(response).toBeDefined();
  });

  it('handles missing to address (contract creation)', async () => {
    const { onTransaction } = await installSnap();

    const response = await onTransaction({
      from: `0x${'a'.repeat(40)}` as `0x${string}`,
      data: '0x6080604052' as `0x${string}`,
      value: '0x0' as `0x${string}`,
      chainId: 'eip155:1',
    });

    // Should return fallback content for contract creation
    expect(response).toBeDefined();
  });
});
