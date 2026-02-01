import { installSnap } from '@metamask/snaps-jest';
import { expect } from '@jest/globals';

describe('Crypto Guardian Snap', () => {
  describe('onTransaction', () => {
    it('should display security alert for simple ETH transfer', async () => {
      const { onTransaction } = await installSnap();

      const response = await onTransaction({
        to: '0x1234567890123456789012345678901234567890',
        value: '0x16345785D8A0000', // 0.1 ETH in wei (hex)
        data: '0x',
        chainId: 'eip155:1',
      });

      // Verify response has content
      expect(response).toBeDefined();
      const content = response.content;
      expect(content).toBeDefined();
    });

    it('should analyze contract interactions', async () => {
      const { onTransaction } = await installSnap();

      const response = await onTransaction({
        to: '0x1234567890123456789012345678901234567890',
        value: '0xDE0B6B3A7640000', // 1 ETH in wei (hex)
        data: '0xa9059cbb0000000000000000000000001234567890123456789012345678901234567890', // ERC20 transfer
        chainId: 'eip155:1',
      });

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
    });

    it('should handle zero-value transactions', async () => {
      const { onTransaction } = await installSnap();

      const response = await onTransaction({
        to: '0xABCDEF1234567890ABCDEF1234567890ABCDEF12',
        value: '0x0',
        data: '0x',
        chainId: 'eip155:1',
      });

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
    });
  });
});
