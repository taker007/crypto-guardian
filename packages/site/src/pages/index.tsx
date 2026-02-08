import styled from 'styled-components';

import {
  ConnectButton,
  InstallFlaskButton,
  TestButton,
  Card,
} from '../components';
import { defaultSnapOrigin } from '../config';
import {
  useMetaMask,
  useInvokeSnap,
  useMetaMaskContext,
  useRequestSnap,
} from '../hooks';
import { isLocalSnap } from '../utils';

// Well-known mainnet token addresses used for reviewer test scenarios
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  margin-top: 7.6rem;
  margin-bottom: 7.6rem;
  ${({ theme }) => theme.mediaQueries.small} {
    padding-left: 2.4rem;
    padding-right: 2.4rem;
    margin-top: 2rem;
    margin-bottom: 2rem;
    width: auto;
  }
`;

const Heading = styled.h1`
  margin-top: 0;
  margin-bottom: 2.4rem;
  text-align: center;
`;

const Span = styled.span`
  color: ${(props) => props.theme.colors.primary?.default};
`;

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.large};
  font-weight: 500;
  margin-top: 0;
  margin-bottom: 0;
  ${({ theme }) => theme.mediaQueries.small} {
    font-size: ${({ theme }) => theme.fontSizes.text};
  }
`;

const CardContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  max-width: 64.8rem;
  width: 100%;
  height: 100%;
  margin-top: 1.5rem;
`;

const Notice = styled.div`
  background-color: ${({ theme }) => theme.colors.background?.alternative};
  border: 1px solid ${({ theme }) => theme.colors.border?.default};
  color: ${({ theme }) => theme.colors.text?.alternative};
  border-radius: ${({ theme }) => theme.radii.default};
  padding: 2.4rem;
  margin-top: 2.4rem;
  max-width: 60rem;
  width: 100%;

  & > * {
    margin: 0;
  }
  ${({ theme }) => theme.mediaQueries.small} {
    margin-top: 1.2rem;
    padding: 1.6rem;
  }
`;

const ErrorMessage = styled.div`
  background-color: ${({ theme }) => theme.colors.error?.muted};
  border: 1px solid ${({ theme }) => theme.colors.error?.default};
  color: ${({ theme }) => theme.colors.error?.alternative};
  border-radius: ${({ theme }) => theme.radii.default};
  padding: 2.4rem;
  margin-bottom: 2.4rem;
  margin-top: 2.4rem;
  max-width: 60rem;
  width: 100%;
  ${({ theme }) => theme.mediaQueries.small} {
    padding: 1.6rem;
    margin-bottom: 1.2rem;
    margin-top: 1.2rem;
    max-width: 100%;
  }
`;

const Index = () => {
  const { error } = useMetaMaskContext();
  const { isFlask, snapsDetected, installedSnap } = useMetaMask();
  const requestSnap = useRequestSnap();
  const invokeSnap = useInvokeSnap();

  const isMetaMaskReady = isLocalSnap(defaultSnapOrigin)
    ? isFlask
    : snapsDetected;

  const handleAnalyzeToken = async (tokenAddress: string) => {
    await invokeSnap({
      method: 'analyzeToken',
      params: { tokenAddress, chainId: 'eth' },
    });
  };

  const handleShowWarning = async (tradeability: string) => {
    await invokeSnap({ method: 'showWarning', params: { tradeability } });
  };

  return (
    <Container>
      <Heading>
        Welcome to <Span>Crypto Guardian</Span>
      </Heading>
      <Subtitle>
        Risk signals for Ethereum tokens — advisory only
      </Subtitle>

      <CardContainer>
        {error && (
          <ErrorMessage>
            <b>An error happened:</b> {error.message}
          </ErrorMessage>
        )}

        {/* Step 1: Install MetaMask Flask (shown only if not detected) */}
        {!isMetaMaskReady && (
          <Card
            content={{
              title: 'Install MetaMask Flask',
              description:
                'Crypto Guardian requires MetaMask Flask to run. Install it to continue.',
              button: <InstallFlaskButton />,
            }}
            fullWidth
          />
        )}

        {/* Step 2: Install the SNAP (shown only if not yet installed) */}
        {!installedSnap && (
          <Card
            content={{
              title: 'Install Crypto Guardian',
              description:
                'Connect your wallet and install the Crypto Guardian SNAP.',
              button: (
                <ConnectButton
                  onClick={requestSnap}
                  disabled={!isMetaMaskReady}
                />
              ),
            }}
            disabled={!isMetaMaskReady}
          />
        )}

        {/* Test Scenario 1: Known safe token (USDC) */}
        <Card
          content={{
            title: 'Test: Known Safe Token',
            description:
              'Scans USDC. Expected: VERIFIED / LOW risk. No funds or signing required.',
            button: (
              <TestButton
                label="Test Safe Token"
                onClick={() => handleAnalyzeToken(USDC)}
                disabled={!installedSnap}
              />
            ),
          }}
          disabled={!installedSnap}
        />

        {/* Test Scenario 2: Risky / honeypot token (USDT) */}
        <Card
          content={{
            title: 'Test: Risky / Honeypot Token',
            description:
              'Scans USDT. Expected: BLOCKED_BY_CONTRACT / CRITICAL risk. No funds or signing required.',
            button: (
              <TestButton
                label="Test Honeypot Token"
                onClick={() => handleAnalyzeToken(USDT)}
                disabled={!installedSnap}
              />
            ),
          }}
          disabled={!installedSnap}
        />

        {/* Test Scenario 3: Unverifiable token (backend fallback) */}
        <Card
          content={{
            title: 'Test: Unverifiable Token',
            description:
              'Simulates a token the backend cannot verify. Expected: UNVERIFIED / HIGH risk. No funds or signing required.',
            button: (
              <TestButton
                label="Test Unverifiable Token"
                onClick={() => handleShowWarning('UNVERIFIED')}
                disabled={!installedSnap}
              />
            ),
          }}
          disabled={!installedSnap}
        />
      </CardContainer>

      <Notice>
        <p>
          <b>No funds required.</b> All buttons use wallet_invokeSnap.
          No transactions are signed, no gas is estimated, and no ETH
          (mainnet or testnet) is needed. This SNAP is advisory only.
        </p>
      </Notice>
    </Container>
  );
};

export default Index;
