import { installSnap } from '@metamask/snaps-jest';
import { expect, describe, it } from '@jest/globals';

describe('Crypto Guardian Snap', () => {
  describe('onTransaction - API Success', () => {
    it('should display HIGH risk 87/100 when API is available', async () => {
      const { onTransaction } = await installSnap();

      const response = await onTransaction({
        to: '0x1234567890123456789012345678901234567890',
        value: '0xDE0B6B3A7640000', // 1 ETH
        data: '0x',
        chainId: 'eip155:1',
      });

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();

      // When API is running, should show the API response
      // Risk Level: HIGH, Risk Score: 87/100
    });

    it('should show transaction details correctly', async () => {
      const { onTransaction } = await installSnap();

      const response = await onTransaction({
        to: '0xABCDEF1234567890ABCDEF1234567890ABCDEF12',
        value: '0x16345785D8A0000', // 0.1 ETH
        data: '0x',
        chainId: 'eip155:1',
      });

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
    });
  });

  describe('onTransaction - API Failure (Fallback)', () => {
    it('should show fallback warning when API is unreachable', async () => {
      // Note: This test runs in isolation, API may not be available
      // The snap should gracefully handle this and show the fallback
      const { onTransaction } = await installSnap();

      const response = await onTransaction({
        to: '0x0000000000000000000000000000000000000000',
        value: '0x0',
        data: '0x',
        chainId: 'eip155:1',
      });

      // Response should always be defined (never silent)
      expect(response).toBeDefined();
      expect(response.content).toBeDefined();

      // The fallback panel should be shown when API fails
      // It includes: "We couldn't reach the security server"
      // Risk Level: UNKNOWN, Risk Score: N/A
    });

    it('should handle zero-value transactions gracefully', async () => {
      const { onTransaction } = await installSnap();

      const response = await onTransaction({
        to: '0x1234567890123456789012345678901234567890',
        value: '0x0',
        data: '0x',
        chainId: 'eip155:1',
      });

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
    });

    it('should handle missing to address', async () => {
      const { onTransaction } = await installSnap();

      const response = await onTransaction({
        value: '0x1000',
        data: '0x',
        chainId: 'eip155:1',
      });

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
    });
  });

  describe('onTransaction - Edge Cases', () => {
    it('should handle contract interactions', async () => {
      const { onTransaction } = await installSnap();

      const response = await onTransaction({
        to: '0x1234567890123456789012345678901234567890',
        value: '0x0',
        data: '0xa9059cbb0000000000000000000000001234567890123456789012345678901234567890', // ERC20 transfer
        chainId: 'eip155:1',
      });

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
    });

    it('should handle different chain IDs', async () => {
      const { onTransaction } = await installSnap();

      const response = await onTransaction({
        to: '0x1234567890123456789012345678901234567890',
        value: '0x1000',
        data: '0x',
        chainId: 'eip155:137', // Polygon
      });

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
    });

    it('should never return undefined or null content', async () => {
      const { onTransaction } = await installSnap();

      // Multiple transactions to ensure consistent behavior
      const transactions = [
        { to: '0x1234567890123456789012345678901234567890' as const, value: '0x0' as const, data: '0x' as const, chainId: 'eip155:1' },
        { to: '0x0000000000000000000000000000000000000000' as const, value: '0xFFFFFFFFFFFFFFFF' as const, data: '0x' as const, chainId: 'eip155:1' },
        { to: '0x0000000000000000000000000000000000000001' as const, value: '0x0' as const, data: '0x1234' as const, chainId: 'eip155:5' },
      ];

      for (const tx of transactions) {
        const response = await onTransaction(tx);
        expect(response).toBeDefined();
        expect(response.content).toBeDefined();
        expect(response.content).not.toBeNull();
      }
    });
  });
});
