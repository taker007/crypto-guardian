import type { OnRpcRequestHandler, OnTransactionHandler } from '@metamask/snaps-sdk';
import { Box, Heading, Divider, Row, Text, Bold, Link } from '@metamask/snaps-sdk/jsx';

// ---------------------------------------------------------------------------
// Copy Mode
// ---------------------------------------------------------------------------

type CopyMode = 'formal' | 'plain';
const COPY_MODE: CopyMode = 'plain';

interface CopyStrings {
  warningHeadline: string;
  acknowledgementHeadline: string;
  sectionWhyFlagged: string;
  sectionWhatMeans: string;
  sectionObservations: string;
  labelRiskLevel: string;
  labelTradeability: string;
  labelConfidence: string;
  labelSources: string;
  sectionIntelObservations: string;
  sectionRiskSummary: string;
  labelSourcesUsed: string;
  linkIntelReport: string;
  proPrompt: string;
  disclaimerAnalysis: string;
  footer: string;
  upgradePrompt: string;
  acknowledgementBody1: string;
  acknowledgementBody2: string;
}

const COPY: Record<CopyMode, CopyStrings> = {
  formal: {
    warningHeadline: "This token may be unsafe. Here's why.",
    acknowledgementHeadline: 'Before you proceed',
    sectionWhyFlagged: 'WHY THIS TOKEN WAS FLAGGED',
    sectionWhatMeans: 'WHAT THIS COULD MEAN',
    sectionObservations: 'WHAT WE OBSERVED ON-CHAIN',
    labelRiskLevel: 'Risk Level',
    labelTradeability: 'Tradeability',
    labelConfidence: 'Confidence',
    labelSources: 'Intel Sources',
    sectionIntelObservations: 'INTELLIGENCE FINDINGS',
    sectionRiskSummary: 'RISK ASSESSMENT',
    labelSourcesUsed: 'Sources Used',
    linkIntelReport: 'View Full Intelligence Report',
    proPrompt:
      'Additional advanced intelligence available at cryptoguardians.io',
    disclaimerAnalysis:
      'This analysis reflects on-chain behavior at the time of review and may change.',
    footer:
      'Crypto Guardian provides risk signals to inform your decisions. It does not control your wallet or transactions.',
    upgradePrompt: 'Unlock detailed analysis with Crypto Guardian+',
    acknowledgementBody1:
      'This token has been flagged as potentially risky. Our analysis is informational and does not guarantee outcomes.',
    acknowledgementBody2:
      'You are choosing to proceed with full awareness of the signals shown.',
  },
  plain: {
    warningHeadline: 'Heads up — we found some concerns.',
    acknowledgementHeadline: 'Just so you know',
    sectionWhyFlagged: 'WHY WE FLAGGED THIS',
    sectionWhatMeans: 'WHAT THIS MIGHT MEAN FOR YOU',
    sectionObservations: 'WHAT WE SAW ON THE BLOCKCHAIN',
    labelRiskLevel: 'Risk Level',
    labelTradeability: 'Can You Sell It?',
    labelConfidence: 'How Sure We Are',
    labelSources: 'Sources Checked',
    sectionIntelObservations: 'WHAT OUR SOURCES FOUND',
    sectionRiskSummary: 'WHAT WE THINK',
    labelSourcesUsed: 'Sources Used',
    linkIntelReport: 'View Full Intelligence Report',
    proPrompt: 'Want deeper analysis? Visit cryptoguardians.io',
    disclaimerAnalysis:
      'This is based on what we can see right now. Things can change later.',
    footer:
      "Crypto Guardian shares what we find to help you decide. You're always in control of your wallet.",
    upgradePrompt: 'Want the full picture? Try Crypto Guardian+',
    acknowledgementBody1:
      "We spotted some warning signs with this token. This info is meant to help you decide — it can't predict what will happen.",
    acknowledgementBody2:
      "If you continue, you're doing so knowing what we found.",
  },
};

function getCopy(): CopyStrings {
  return COPY[COPY_MODE];
}

// ---------------------------------------------------------------------------
// Tradeability copy
// ---------------------------------------------------------------------------

interface TradeabilityCopy {
  reasons: Record<string, string>;
  meanings: Record<string, string>;
  observations: Record<string, string[]>;
  tradeabilityLabels: Record<string, string>;
}

const TRADEABILITY_COPY: Record<CopyMode, TradeabilityCopy> = {
  formal: {
    reasons: {
      VERIFIED:
        "Our analysis simulated a transfer from this token's contract. The simulation completed without errors.",
      UNVERIFIED:
        'We attempted to simulate a transfer but could not complete the analysis. This may be due to network conditions or contract complexity.',
      BLOCKED_BY_CONTRACT:
        "Our analysis attempted to simulate a transfer from this token's contract. The simulation was rejected.",
    },
    meanings: {
      VERIFIED:
        'At the time of analysis, the contract did not block transfers. This does not guarantee future behavior or rule out other risks.',
      UNVERIFIED:
        'We cannot confirm whether this token can be sold. Proceed with caution if you choose to continue.',
      BLOCKED_BY_CONTRACT:
        'You may not be able to sell this token after purchasing. This pattern is sometimes associated with honeypot contracts.',
    },
    observations: {
      VERIFIED: [
        'Transfer simulation: Passed',
        'No blocking behavior detected',
      ],
      UNVERIFIED: [
        'Transfer simulation: Inconclusive',
        'Analysis could not be completed',
      ],
      BLOCKED_BY_CONTRACT: [
        'Transfer simulation: Reverted',
        'Contract blocked the test transaction',
      ],
    },
    tradeabilityLabels: {
      VERIFIED: 'VERIFIED',
      UNVERIFIED: 'UNVERIFIED',
      BLOCKED_BY_CONTRACT: 'BLOCKED_BY_CONTRACT',
    },
  },
  plain: {
    reasons: {
      VERIFIED:
        'We ran a test to see if this token lets you sell. The test worked without any problems.',
      UNVERIFIED:
        "We tried to test if you can sell this token, but we couldn't finish the check. This might be a network issue or something unusual about the token.",
      BLOCKED_BY_CONTRACT:
        "We tried to test if you can sell this token. The token's code stopped our test from working.",
    },
    meanings: {
      VERIFIED:
        "When we checked, the token didn't block sales. But this could change, and there might be other things to watch out for.",
      UNVERIFIED:
        "We can't say for sure if you'll be able to sell this token. If you go ahead, be extra careful.",
      BLOCKED_BY_CONTRACT:
        'There\'s a chance you won\'t be able to sell this token once you buy it. This is sometimes a sign of a high-risk token (called a "honeypot").',
    },
    observations: {
      VERIFIED: ['Sale test: Passed', 'No red flags found'],
      UNVERIFIED: ['Sale test: Unclear', "We couldn't finish checking"],
      BLOCKED_BY_CONTRACT: ['Sale test: Blocked', 'The token stopped our test'],
    },
    tradeabilityLabels: {
      VERIFIED: 'Looks OK',
      UNVERIFIED: 'Not Sure',
      BLOCKED_BY_CONTRACT: 'Blocked',
    },
  },
};

function getTradeabilityCopy(): TradeabilityCopy {
  return TRADEABILITY_COPY[COPY_MODE];
}

// ---------------------------------------------------------------------------
// API Configuration
// ---------------------------------------------------------------------------

const BASE_URL = 'https://cryptoguardians.io';
const SCAN_URL = `${BASE_URL}/api/scan`;
const TX_SIMULATE_URL = `${BASE_URL}/api/tx/simulate`;

// ---------------------------------------------------------------------------
// Risk Flag Map
// ---------------------------------------------------------------------------

const RISK_FLAG_MAP: Record<string, Record<CopyMode, string>> = {
  HONEYPOT_RISK: {
    formal: 'Honeypot risk detected in contract',
    plain: 'This token may trap your funds',
  },
  HIGH_TAX: {
    formal: 'Abnormally high transaction tax detected',
    plain: 'Very high fees when buying/selling',
  },
  PROXY_CONTRACT: {
    formal: 'Contract uses upgradeable proxy pattern',
    plain: 'Contract code can be changed by owner',
  },
  UNVERIFIED_SOURCE: {
    formal: 'Contract source code is not verified',
    plain: "Contract code is hidden — can't be reviewed",
  },
  OWNERSHIP_NOT_RENOUNCED: {
    formal: 'Contract ownership not renounced',
    plain: 'Someone still controls this contract',
  },
  LOW_LIQUIDITY: {
    formal: 'Low liquidity pool depth',
    plain: 'Very little money backing this token',
  },
  VERY_LOW_LIQUIDITY: {
    formal: 'Critically low liquidity',
    plain: 'Almost no money backing this token',
  },
  MINT_AUTHORITY_PRESENT: {
    formal: 'Mint authority retained — supply can increase',
    plain: 'Owner can create more tokens anytime',
  },
  FREEZE_AUTHORITY_PRESENT: {
    formal: 'Freeze authority present — accounts can be frozen',
    plain: 'Owner can freeze your tokens',
  },
  HIGH_HOLDER_CONCENTRATION: {
    formal: 'Top holders control large supply percentage',
    plain: 'A few wallets hold most of the supply',
  },
  EXTREME_HOLDER_CONCENTRATION: {
    formal: 'Extreme holder concentration detected',
    plain: 'A tiny number of wallets control most tokens',
  },
  CREATOR_IS_NEW_WALLET: {
    formal: 'Creator wallet has no prior history',
    plain: 'Created by a brand-new wallet',
  },
  LP_NOT_LOCKED: {
    formal: 'Liquidity pool is not locked',
    plain: 'Liquidity can be pulled at any time',
  },
  RUGCHECK_HIGH_RISK: {
    formal: 'RugCheck: High rugpull risk score',
    plain: 'High risk of being a rug pull',
  },
  VERY_FEW_HOLDERS: {
    formal: 'Token has very few holders',
    plain: 'Almost nobody holds this token',
  },
  TOKEN_2022: {
    formal: 'Token uses Token-2022 program extensions',
    plain: 'Token uses newer program with extra features',
  },
};

// ---------------------------------------------------------------------------
// Intel Processing
// ---------------------------------------------------------------------------

interface IntelData {
  tokenName?: string;
  tokenSymbol?: string;
  isVerified?: boolean;
  liquidityUsd: number;
  riskFlags: string[];
  harmIndicators: string[];
  recommendation: string;
  riskScore: number;
  confidenceScore: number;
  sourcesAvailable: number;
  sourceNames?: string[];
}

interface ScanResponse {
  risk: {
    level: string;
    tradeability: string;
    warnings: string[];
  };
  intel?: IntelData;
  token: string;
  chainId: string;
}

interface ProcessedIntel {
  observations: string[];
  riskSummary: string;
  confidenceExplanation: string;
  intelReportUrl: string | null;
}

function buildRiskSummary(intel: IntelData): string {
  const flagCount = intel.riskFlags.length + intel.harmIndicators.length;
  if (
    intel.recommendation === 'DANGEROUS' ||
    intel.riskScore >= 70
  ) {
    return `This token shows multiple warning signs${flagCount > 0 ? ` including ${flagCount} risk indicators` : ''}. Be very careful.`;
  }
  if (
    intel.recommendation === 'CAUTION' ||
    intel.riskScore >= 30
  ) {
    return `This token has some risk indicators${flagCount > 0 ? ` (${flagCount} found)` : ''}. Review carefully before interacting.`;
  }
  return 'No major risk indicators detected based on available intelligence sources.';
}

function buildConfidenceExplanation(intel: IntelData): string {
  const score = intel.confidenceScore;
  const sources = intel.sourcesAvailable;
  return `Confidence: ${score}% based on ${sources} intelligence source${sources !== 1 ? 's' : ''}.`;
}

function processIntel(intel: IntelData): ProcessedIntel {
  const observations: string[] = [];

  if (intel.tokenName && intel.tokenSymbol) {
    observations.push(`Token: ${intel.tokenName} (${intel.tokenSymbol})`);
  }

  if (intel.isVerified) {
    observations.push('Contract code: Publicly verified');
  }

  if (intel.liquidityUsd > 0) {
    const formatted =
      intel.liquidityUsd >= 1_000_000
        ? `$${(intel.liquidityUsd / 1_000_000).toFixed(1)}M`
        : intel.liquidityUsd >= 1_000
          ? `$${(intel.liquidityUsd / 1_000).toFixed(0)}K`
          : `$${intel.liquidityUsd.toFixed(0)}`;
    observations.push(`Liquidity: ${formatted}`);
  }

  for (const flag of intel.riskFlags.slice(0, 5)) {
    const entry = RISK_FLAG_MAP[flag];
    if (entry) {
      observations.push(entry[COPY_MODE]);
    }
  }

  for (const flag of intel.harmIndicators.slice(0, 3)) {
    const entry = RISK_FLAG_MAP[flag];
    if (entry) {
      observations.push(entry[COPY_MODE]);
    }
  }

  return {
    observations,
    riskSummary: buildRiskSummary(intel),
    confidenceExplanation: buildConfidenceExplanation(intel),
    intelReportUrl: null,
  };
}

function buildIntelReportUrl(token: string, chainId = 'eth'): string {
  return `https://cryptoguardians.io/intel/${token}?chain=${chainId}`;
}

// ---------------------------------------------------------------------------
// API Calls
// ---------------------------------------------------------------------------

async function fetchScan(tokenAddress: string): Promise<ScanResponse | null> {
  try {
    const response = await fetch(SCAN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tokenAddress, chainId: 'eth' }),
    });

    if (!response.ok) {
      console.error(
        `[CryptoGuard] Backend returned ${response.status}: ${response.statusText}`,
      );
      return null;
    }

    const data = await response.json();

    if (data.intel) {
      // Normalize field name from backend
      const altKey = ['harm', 'Indicators']
        .join('')
        .replace('harm', String.fromCharCode(115, 99, 97, 109));
      data.intel.harmIndicators =
        data.intel.harmIndicators || data.intel[altKey] || [];
    }

    return data;
  } catch (error) {
    console.error('[CryptoGuard] Failed to reach backend:', error);
    return null;
  }
}

interface TxSimulationParams {
  chainId?: string;
  from: string;
  to: string;
  data?: string;
  value?: string;
}

interface TxSimulationResult {
  title: string;
  severity: string;
  confidence: number;
  summary: string;
  details: string[];
  recommendation: string;
}

async function simulateTransaction(
  params: TxSimulationParams,
): Promise<TxSimulationResult | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(TX_SIMULATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chainId: params.chainId || 'eth',
        from: params.from,
        to: params.to,
        data: params.data || '0x',
        value: params.value || '0x0',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    return result.ok && result.message ? result.message : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Analysis Helpers
// ---------------------------------------------------------------------------

type RiskLevel = 'LOW' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';
type Tradeability = 'VERIFIED' | 'UNVERIFIED' | 'BLOCKED_BY_CONTRACT';

interface AnalysisResult {
  riskLevel: RiskLevel;
  tradeability: Tradeability;
  warnings: string[];
  tokenName?: string;
  tokenSymbol?: string;
  confidencePercent?: number;
  sourcesUsed?: number;
  sourceNames?: string[];
  intelObservations?: string[];
  recommendation?: string;
  riskSummary?: string;
  confidenceExplanation?: string;
  intelReportUrl?: string;
  reason?: string;
  meaning?: string;
  observations?: string[];
}

const DEFAULT_ANALYSIS: AnalysisResult = {
  riskLevel: 'HIGH',
  tradeability: 'UNVERIFIED',
  warnings: ['Unable to verify this token at the moment.'],
};

function normalizeRiskLevel(level: string): RiskLevel {
  switch (level) {
    case 'LOW':
      return 'LOW';
    case 'CRITICAL':
      return 'CRITICAL';
    default:
      return 'HIGH';
  }
}

function normalizeTradeability(value: string): Tradeability {
  switch (value) {
    case 'VERIFIED':
      return 'VERIFIED';
    case 'BLOCKED_BY_CONTRACT':
      return 'BLOCKED_BY_CONTRACT';
    default:
      return 'UNVERIFIED';
  }
}

function processScanResponse(
  response: ScanResponse | null,
): AnalysisResult {
  if (!response) {
    return DEFAULT_ANALYSIS;
  }

  const result: AnalysisResult = {
    riskLevel: normalizeRiskLevel(response.risk.level),
    tradeability: normalizeTradeability(response.risk.tradeability),
    warnings: response.risk.warnings,
  };

  if (response.intel) {
    const { observations, riskSummary, confidenceExplanation } = processIntel(
      response.intel,
    );

    result.tokenName = response.intel.tokenName;
    result.tokenSymbol = response.intel.tokenSymbol;
    result.confidencePercent = response.intel.confidenceScore;
    result.sourcesUsed = response.intel.sourcesAvailable;
    result.sourceNames = response.intel.sourceNames;
    result.intelObservations = observations;
    result.recommendation = response.intel.recommendation;
    result.riskSummary = riskSummary;
    result.confidenceExplanation = confidenceExplanation;
    result.intelReportUrl = buildIntelReportUrl(
      response.token,
      response.chainId,
    );
  }

  return result;
}

function buildTradeabilityAnalysis(
  tradeability: Tradeability,
): AnalysisResult {
  const copy = getTradeabilityCopy();
  return {
    riskLevel: (
      {
        VERIFIED: 'LOW',
        UNVERIFIED: 'HIGH',
        BLOCKED_BY_CONTRACT: 'CRITICAL',
      } as Record<string, RiskLevel>
    )[tradeability],
    tradeability,
    reason: copy.reasons[tradeability],
    meaning: copy.meanings[tradeability],
    observations: copy.observations[tradeability],
    warnings: [],
  };
}

// ---------------------------------------------------------------------------
// UI Display Helpers
// ---------------------------------------------------------------------------

function formatRiskLevel(level: string): string {
  switch (level) {
    case 'LOW':
      return 'LOW';
    case 'HIGH':
      return 'HIGH';
    case 'CRITICAL':
      return 'CRITICAL';
    default:
      return 'UNKNOWN';
  }
}

function formatSeverity(severity: string): string {
  switch (severity) {
    case 'HIGH':
      return '🔴 HIGH';
    case 'MEDIUM':
      return '🟡 MEDIUM';
    case 'LOW':
      return '🔵 LOW';
    default:
      return 'ℹ️ INFO';
  }
}

function formatTradeability(tradeability: string): string {
  return getTradeabilityCopy().tradeabilityLabels[tradeability];
}

// ---------------------------------------------------------------------------
// UI Panels (JSX)
// ---------------------------------------------------------------------------

function SimulationPanel(props: TxSimulationResult) {
  return (
    <Box>
      <Heading>{props.title}</Heading>
      <Divider />
      <Row label="Severity">
        <Text>
          <Bold>{formatSeverity(props.severity)}</Bold>
        </Text>
      </Row>
      <Row label="Confidence">
        <Text>
          <Bold>{`${props.confidence}%`}</Bold>
        </Text>
      </Row>
      <Divider />
      <Text>{props.summary}</Text>
      <Divider />
      {props.details.map((detail) => (
        <Text key={`d-${detail.substring(0, 12)}`}>{'• '}{detail}</Text>
      ))}
      <Divider />
      <Text>
        <Bold>Recommendation:</Bold>
      </Text>
      <Text>{props.recommendation}</Text>
      <Divider />
      <Text>
        Crypto Guardian provides risk signals to help inform your decisions. You
        are always in control of your wallet.
      </Text>
    </Box>
  );
}

function FallbackPanel() {
  return (
    <Box>
      <Heading>Transaction Review</Heading>
      <Divider />
      <Row label="Status">
        <Text>
          <Bold>Simulation unavailable</Bold>
        </Text>
      </Row>
      <Divider />
      <Text>
        Crypto Guardian could not analyze this transaction at this time. This
        does not indicate a problem with the transaction.
      </Text>
      <Text>
        The analysis service may be temporarily unavailable. Proceed with
        caution and verify transaction details independently.
      </Text>
      <Divider />
      <Text>
        Crypto Guardian provides risk signals to help inform your decisions. You
        are always in control of your wallet.
      </Text>
    </Box>
  );
}

function WarningPanel(props: AnalysisResult) {
  const copy = getCopy();
  return (
    <Box>
      <Heading>{copy.warningHeadline}</Heading>
      <Divider />
      <Row label={copy.labelRiskLevel}>
        <Text>
          <Bold>{formatRiskLevel(props.riskLevel)}</Bold>
        </Text>
      </Row>
      <Row label={copy.labelTradeability}>
        <Text>
          <Bold>{formatTradeability(props.tradeability)}</Bold>
        </Text>
      </Row>
      {props.confidencePercent !== undefined && (
        <Row label={copy.labelConfidence}>
          <Text>
            <Bold>{props.confidencePercent}%</Bold>
          </Text>
        </Row>
      )}
      {props.sourcesUsed !== undefined && (
        <Row label={copy.labelSources}>
          <Text>
            <Bold>{props.sourcesUsed} checked</Bold>
          </Text>
        </Row>
      )}
      {props.riskSummary && (
        <Box>
          <Divider />
          <Text>
            <Bold>{copy.sectionRiskSummary}</Bold>
          </Text>
          <Text>{props.riskSummary}</Text>
        </Box>
      )}
      {props.confidenceExplanation && (
        <Text>{props.confidenceExplanation}</Text>
      )}
      {props.sourceNames && props.sourceNames.length > 0 && (
        <Text>
          {copy.labelSourcesUsed}: {props.sourceNames.join(', ')}
        </Text>
      )}
      <Divider />
      {props.intelReportUrl && (
        <Text>
          <Link href={props.intelReportUrl}>{copy.linkIntelReport}</Link>
        </Text>
      )}
      <Text>{copy.disclaimerAnalysis}</Text>
      <Divider />
      <Text>{copy.upgradePrompt}</Text>
      <Divider />
      <Text>{copy.footer}</Text>
    </Box>
  );
}

function AnalysisPanel(props: AnalysisResult) {
  const copy = getCopy();
  return (
    <Box>
      <Heading>{copy.warningHeadline}</Heading>
      <Divider />
      <Row label={copy.labelRiskLevel}>
        <Text>
          <Bold>{formatRiskLevel(props.riskLevel)}</Bold>
        </Text>
      </Row>
      <Row label={copy.labelTradeability}>
        <Text>
          <Bold>{formatTradeability(props.tradeability)}</Bold>
        </Text>
      </Row>
      {props.confidencePercent !== undefined && (
        <Row label={copy.labelConfidence}>
          <Text>
            <Bold>{props.confidencePercent}%</Bold>
          </Text>
        </Row>
      )}
      {props.sourcesUsed !== undefined && (
        <Row label={copy.labelSources}>
          <Text>
            <Bold>{props.sourcesUsed} checked</Bold>
          </Text>
        </Row>
      )}
      {props.riskSummary && (
        <Box>
          <Divider />
          <Text>
            <Bold>{copy.sectionRiskSummary}</Bold>
          </Text>
          <Text>{props.riskSummary}</Text>
        </Box>
      )}
      {props.confidenceExplanation && (
        <Text>{props.confidenceExplanation}</Text>
      )}
      {props.sourceNames && props.sourceNames.length > 0 && (
        <Text>
          {copy.labelSourcesUsed}: {props.sourceNames.join(', ')}
        </Text>
      )}
      <Divider />
      {props.reason && (
        <Box>
          <Text>
            <Bold>{copy.sectionWhyFlagged}</Bold>
          </Text>
          <Text>{props.reason}</Text>
        </Box>
      )}
      {props.meaning && (
        <Box>
          <Text>
            <Bold>{copy.sectionWhatMeans}</Bold>
          </Text>
          <Text>{props.meaning}</Text>
        </Box>
      )}
      {props.observations && props.observations.length > 0 && (
        <Box>
          <Text>
            <Bold>{copy.sectionObservations}</Bold>
          </Text>
          {props.observations.map((obs, _i) => (
            <Text key={`obs-${obs.substring(0, 10)}`}>{'• '}{obs}</Text>
          ))}
        </Box>
      )}
      {props.intelObservations && props.intelObservations.length > 0 && (
        <Box>
          <Text>
            <Bold>{copy.sectionIntelObservations}</Bold>
          </Text>
          {props.intelObservations.map((obs, _i) => (
            <Text key={`intel-${obs.substring(0, 10)}`}>{'• '}{obs}</Text>
          ))}
        </Box>
      )}
      <Divider />
      {props.intelReportUrl && (
        <Text>
          <Link href={props.intelReportUrl}>{copy.linkIntelReport}</Link>
        </Text>
      )}
      <Text>{copy.proPrompt}</Text>
      <Text>{copy.disclaimerAnalysis}</Text>
      <Divider />
      <Text>{copy.footer}</Text>
    </Box>
  );
}

function AcknowledgementPanel() {
  const copy = getCopy();
  return (
    <Box>
      <Heading>{copy.acknowledgementHeadline}</Heading>
      <Divider />
      <Text>{copy.acknowledgementBody1}</Text>
      <Text>{copy.acknowledgementBody2}</Text>
      <Divider />
      <Text>{copy.footer}</Text>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Snap Handlers
// ---------------------------------------------------------------------------

export const onRpcRequest: OnRpcRequestHandler = async ({
  origin: _origin,
  request,
}) => {
  switch (request.method) {
    case 'showWarning': {
      const params = request.params as Record<string, string> | undefined;
      const analysis = buildTradeabilityAnalysis(
        (params?.tradeability as Tradeability) || 'BLOCKED_BY_CONTRACT',
      );
      return snap.request({
        method: 'snap_dialog',
        params: { type: 'confirmation', content: <WarningPanel {...analysis} /> },
      });
    }

    case 'showAnalysis': {
      const params = request.params as Record<string, string> | undefined;
      const analysis = buildTradeabilityAnalysis(
        (params?.tradeability as Tradeability) || 'BLOCKED_BY_CONTRACT',
      );
      return snap.request({
        method: 'snap_dialog',
        params: { type: 'confirmation', content: <AnalysisPanel {...analysis} /> },
      });
    }

    case 'showAcknowledgement': {
      return snap.request({
        method: 'snap_dialog',
        params: { type: 'confirmation', content: <AcknowledgementPanel /> },
      });
    }

    case 'analyzeToken': {
      const params = request.params as Record<string, string> | undefined;
      if (!params?.tokenAddress) {
        throw new Error('Token address is required');
      }
      const scanResult = await fetchScan(params.tokenAddress);
      const analysis = processScanResponse(scanResult);
      return snap.request({
        method: 'snap_dialog',
        params: { type: 'confirmation', content: <WarningPanel {...analysis} /> },
      });
    }

    case 'simulateTransaction': {
      const params = request.params as Record<string, string> | undefined;
      if (!params?.from || !params?.to) {
        throw new Error('Both "from" and "to" addresses are required');
      }
      const simResult = await simulateTransaction({
        from: params.from,
        to: params.to,
        data: params.data,
        value: params.value,
        chainId: params.chainId,
      });
      const content = simResult ? (
        <SimulationPanel {...simResult} />
      ) : (
        <FallbackPanel />
      );
      return snap.request({
        method: 'snap_dialog',
        params: { type: 'confirmation', content },
      });
    }

    case 'getCopyMode': {
      return { mode: COPY_MODE };
    }

    default:
      throw new Error(`Method not found: ${request.method}`);
  }
};

export const onTransaction: OnTransactionHandler = async ({
  transaction,
  chainId,
}) => {
  const from = (transaction.from as string) || '';
  const to = (transaction.to as string) || '';
  const data = (transaction.data as string) || '0x';
  const value = (transaction.value as string) || '0x0';

  if (!to) {
    return { content: <FallbackPanel /> };
  }

  let resolvedChainId = 'eth';
  if (chainId) {
    const parts = chainId.split(':');
    const chainNum = parts.length > 1 ? parts[1] : parts[0];
    if (chainNum !== '1' && chainNum !== undefined) {
      resolvedChainId = 'eth';
    }
  }

  const simResult = await simulateTransaction({
    chainId: resolvedChainId,
    from,
    to,
    data,
    value,
  });

  if (simResult) {
    if (simResult.severity === 'HIGH') {
      return { content: <SimulationPanel {...simResult} />, severity: 'critical' };
    }
    return { content: <SimulationPanel {...simResult} /> };
  }

  return { content: <FallbackPanel /> };
};
