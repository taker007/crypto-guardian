import styled from 'styled-components';

import {
  ConnectButton,
  InstallFlaskButton,
  ReconnectButton,
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
import { isLocalSnap, shouldDisplayReconnectButton } from '../utils';

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

  // Test handlers for each SNAP method
  const handleShowWarning = async (tradeability: string) => {
    await invokeSnap({ method: 'showWarning', params: { tradeability } });
  };

  const handleShowAnalysis = async (tradeability: string) => {
    await invokeSnap({ method: 'showAnalysis', params: { tradeability } });
  };

  const handleShowAcknowledgement = async () => {
    await invokeSnap({ method: 'showAcknowledgement' });
  };

  const handleAnalyzeToken = async () => {
    await invokeSnap({
      method: 'analyzeToken',
      params: {
        tokenAddress: '0x1234567890123456789012345678901234567890',
        chainId: '1'
      }
    });
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
        {!isMetaMaskReady && (
          <Card
            content={{
              title: 'Install MetaMask Flask',
              description:
                'Crypto Guardian is a MetaMask SNAP. You need MetaMask Flask (developer version) to test it.',
              button: <InstallFlaskButton />,
            }}
            fullWidth
          />
        )}
        {!installedSnap && (
          <Card
            content={{
              title: 'Connect & Install',
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
        {shouldDisplayReconnectButton(installedSnap) && (
          <Card
            content={{
              title: 'Reconnect',
              description:
                'Update the SNAP after making local changes.',
              button: (
                <ReconnectButton
                  onClick={requestSnap}
                  disabled={!installedSnap}
                />
              ),
            }}
            disabled={!installedSnap}
          />
        )}

        {/* Test Cards for SNAP Methods */}
        <Card
          content={{
            title: 'Free Tier: CRITICAL Risk',
            description:
              'Test the free tier warning screen with BLOCKED_BY_CONTRACT (honeypot) status.',
            button: (
              <TestButton
                label="Show Warning"
                onClick={() => handleShowWarning('BLOCKED_BY_CONTRACT')}
                disabled={!installedSnap}
              />
            ),
          }}
          disabled={!installedSnap}
        />
        <Card
          content={{
            title: 'Free Tier: HIGH Risk',
            description:
              'Test the free tier warning screen with UNVERIFIED status.',
            button: (
              <TestButton
                label="Show Warning"
                onClick={() => handleShowWarning('UNVERIFIED')}
                disabled={!installedSnap}
              />
            ),
          }}
          disabled={!installedSnap}
        />
        <Card
          content={{
            title: 'Free Tier: LOW Risk',
            description:
              'Test the free tier warning screen with VERIFIED status.',
            button: (
              <TestButton
                label="Show Warning"
                onClick={() => handleShowWarning('VERIFIED')}
                disabled={!installedSnap}
              />
            ),
          }}
          disabled={!installedSnap}
        />
        <Card
          content={{
            title: 'Paid Tier: Full Analysis',
            description:
              'Test the paid tier analysis screen with detailed explanations.',
            button: (
              <TestButton
                label="Show Analysis"
                onClick={() => handleShowAnalysis('BLOCKED_BY_CONTRACT')}
                disabled={!installedSnap}
              />
            ),
          }}
          disabled={!installedSnap}
        />
        <Card
          content={{
            title: 'Risk Acknowledgement',
            description:
              'Test the "Proceed Anyway" acknowledgement screen.',
            button: (
              <TestButton
                label="Show Acknowledgement"
                onClick={handleShowAcknowledgement}
                disabled={!installedSnap}
              />
            ),
          }}
          disabled={!installedSnap}
        />
        <Card
          content={{
            title: 'Analyze Token',
            description:
              'Test the full token analysis flow (mock data).',
            button: (
              <TestButton
                label="Analyze Token"
                onClick={handleAnalyzeToken}
                disabled={!installedSnap}
              />
            ),
          }}
          disabled={!installedSnap}
        />

        <Notice>
          <p>
            <b>Note:</b> This is a development environment. The SNAP uses mock data.
            Backend integration with Crypto Intel is not yet connected.
          </p>
        </Notice>
      </CardContainer>
    </Container>
  );
};

export default Index;
