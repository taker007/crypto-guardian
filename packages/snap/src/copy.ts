// =============================================================================
// CRYPTO GUARDIAN - DUAL COPY SYSTEM
// =============================================================================
// This file contains all user-facing text in two versions:
// - formal: Original legal/technical language
// - plain: Simplified plain-English version
//
// Toggle COPY_MODE to switch between versions instantly.
// No logic changes required - just swap the copy.
// =============================================================================

import type { Tradeability } from './types';

/**
 * Copy mode toggle
 * Change this single value to switch all UI text between formal and plain
 */
export const COPY_MODE: 'formal' | 'plain' = 'plain';

// =============================================================================
// STATIC COPY - Headlines, Labels, Footer
// =============================================================================

export const copy = {
  formal: {
    // Warning screen headline
    warningHeadline: "This token may be unsafe. Here's why.",

    // Acknowledgement screen headline
    acknowledgementHeadline: "Before you proceed",

    // Section labels (paid tier)
    sectionWhyFlagged: "WHY THIS TOKEN WAS FLAGGED",
    sectionWhatMeans: "WHAT THIS COULD MEAN",
    sectionObservations: "WHAT WE OBSERVED ON-CHAIN",

    // Row labels
    labelRiskLevel: "Risk Level",
    labelTradeability: "Tradeability",
    labelConfidence: "Confidence",
    labelSources: "Intel Sources",

    // Section labels (intel)
    sectionIntelObservations: "INTELLIGENCE FINDINGS",
    sectionRiskSummary: "RISK ASSESSMENT",
    labelSourcesUsed: "Sources Used",
    linkIntelReport: "View Full Intelligence Report",
    proPrompt: "Additional advanced intelligence available at cryptoguardians.io",

    // Disclaimer text (appears on all screens)
    disclaimerAnalysis: "This analysis reflects on-chain behavior at the time of review and may change.",

    // Footer text (appears on all screens)
    footer: "Crypto Guardian provides risk signals to inform your decisions. It does not control your wallet or transactions.",

    // Upgrade prompt (free tier only)
    upgradePrompt: "Unlock detailed analysis with Crypto Guardian+",

    // Acknowledgement body text
    acknowledgementBody1: "This token has been flagged as potentially risky. Our analysis is informational and does not guarantee outcomes.",
    acknowledgementBody2: "You are choosing to proceed with full awareness of the signals shown.",
  },

  plain: {
    // Warning screen headline
    warningHeadline: "Heads up — we found some concerns.",

    // Acknowledgement screen headline
    acknowledgementHeadline: "Just so you know",

    // Section labels (paid tier)
    sectionWhyFlagged: "WHY WE FLAGGED THIS",
    sectionWhatMeans: "WHAT THIS MIGHT MEAN FOR YOU",
    sectionObservations: "WHAT WE SAW ON THE BLOCKCHAIN",

    // Row labels
    labelRiskLevel: "Risk Level",
    labelTradeability: "Can You Sell It?",
    labelConfidence: "How Sure We Are",
    labelSources: "Sources Checked",

    // Section labels (intel)
    sectionIntelObservations: "WHAT OUR SOURCES FOUND",
    sectionRiskSummary: "WHAT WE THINK",
    labelSourcesUsed: "Sources Used",
    linkIntelReport: "View Full Intelligence Report",
    proPrompt: "Want deeper analysis? Visit cryptoguardians.io",

    // Disclaimer text (appears on all screens)
    disclaimerAnalysis: "This is based on what we can see right now. Things can change later.",

    // Footer text (appears on all screens)
    footer: "Crypto Guardian shares what we find to help you decide. You're always in control of your wallet.",

    // Upgrade prompt (free tier only)
    upgradePrompt: "Want the full picture? Try Crypto Guardian+",

    // Acknowledgement body text
    acknowledgementBody1: "We spotted some warning signs with this token. This info is meant to help you decide — it can't predict what will happen.",
    acknowledgementBody2: "If you continue, you're doing so knowing what we found.",
  },
};

// =============================================================================
// DYNAMIC COPY - Reasons, Meanings, Observations (vary by tradeability)
// =============================================================================

export const dynamicCopy = {
  formal: {
    reasons: {
      VERIFIED: "Our analysis simulated a transfer from this token's contract. The simulation completed without errors.",
      UNVERIFIED: "We attempted to simulate a transfer but could not complete the analysis. This may be due to network conditions or contract complexity.",
      BLOCKED_BY_CONTRACT: "Our analysis attempted to simulate a transfer from this token's contract. The simulation was rejected.",
    } as Record<Tradeability, string>,

    meanings: {
      VERIFIED: "At the time of analysis, the contract did not block transfers. This does not guarantee future behavior or rule out other risks.",
      UNVERIFIED: "We cannot confirm whether this token can be sold. Proceed with caution if you choose to continue.",
      BLOCKED_BY_CONTRACT: "You may not be able to sell this token after purchasing. This pattern is sometimes associated with honeypot contracts.",
    } as Record<Tradeability, string>,

    observations: {
      VERIFIED: ["Transfer simulation: Passed", "No blocking behavior detected"],
      UNVERIFIED: ["Transfer simulation: Inconclusive", "Analysis could not be completed"],
      BLOCKED_BY_CONTRACT: ["Transfer simulation: Reverted", "Contract blocked the test transaction"],
    } as Record<Tradeability, string[]>,

    tradeabilityLabels: {
      VERIFIED: "VERIFIED",
      UNVERIFIED: "UNVERIFIED",
      BLOCKED_BY_CONTRACT: "BLOCKED_BY_CONTRACT",
    } as Record<Tradeability, string>,
  },

  plain: {
    reasons: {
      VERIFIED: "We ran a test to see if this token lets you sell. The test worked without any problems.",
      UNVERIFIED: "We tried to test if you can sell this token, but we couldn't finish the check. This might be a network issue or something unusual about the token.",
      BLOCKED_BY_CONTRACT: "We tried to test if you can sell this token. The token's code stopped our test from working.",
    } as Record<Tradeability, string>,

    meanings: {
      VERIFIED: "When we checked, the token didn't block sales. But this could change, and there might be other things to watch out for.",
      UNVERIFIED: "We can't say for sure if you'll be able to sell this token. If you go ahead, be extra careful.",
      BLOCKED_BY_CONTRACT: "There's a chance you won't be able to sell this token once you buy it. This is sometimes a sign of a high-risk token (called a \"honeypot\").",
    } as Record<Tradeability, string>,

    observations: {
      VERIFIED: ["Sale test: Passed", "No red flags found"],
      UNVERIFIED: ["Sale test: Unclear", "We couldn't finish checking"],
      BLOCKED_BY_CONTRACT: ["Sale test: Blocked", "The token stopped our test"],
    } as Record<Tradeability, string[]>,

    tradeabilityLabels: {
      VERIFIED: "Looks OK",
      UNVERIFIED: "Not Sure",
      BLOCKED_BY_CONTRACT: "Blocked",
    } as Record<Tradeability, string>,
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the current copy set based on COPY_MODE
 */
export function getCopy() {
  return copy[COPY_MODE];
}

/**
 * Get the current dynamic copy set based on COPY_MODE
 */
export function getDynamicCopy() {
  return dynamicCopy[COPY_MODE];
}

/**
 * Get a specific text value, with fallback to formal if key doesn't exist
 */
export function getText(key: keyof typeof copy.formal): string {
  return copy[COPY_MODE][key] ?? copy.formal[key];
}
