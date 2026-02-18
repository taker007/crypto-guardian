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
