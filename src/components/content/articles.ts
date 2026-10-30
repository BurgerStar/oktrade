export interface Article {
  slug: string;
  title: string;
  category: string;
  level: string;
  minutes: number;
  date?: string;
  sections: { title: string; text: string }[];
}
export const lessons: Article[] = [
  {
    slug: "what-is-bitcoin",
    title: "What is Bitcoin?",
    category: "Crypto basics",
    level: "Beginner",
    minutes: 5,
    sections: [
      {
        title: "The essentials",
        text: "Bitcoin is a public settlement network with no central operator. Participants validate transactions against shared rules, and miners compete to add blocks using proof of work. The supply schedule approaches a maximum of 21 million BTC.",
      },
      {
        title: "What to consider",
        text: "A wallet manages keys, not coins. Your balance is recorded on the ledger; a private key authorizes spending. Exchanges hold keys for custodial balances, while a self-custody wallet makes you responsible for backups.",
      },
      {
        title: "Put it into practice",
        text: "Before buying, understand volatility, transaction fees and custody. Start with an amount you can afford to lose, verify the receiving network and test a small transfer first.",
      },
    ],
  },
  {
    slug: "understanding-ethereum-and-gas",
    title: "Understanding Ethereum and gas",
    category: "Crypto basics",
    level: "Beginner",
    minutes: 5,
    sections: [
      {
        title: "The essentials",
        text: "Ethereum executes programs called smart contracts. Transactions consume computational resources measured in gas, and users pay fees in ETH. A successful transaction can change balances or interact with a decentralized application.",
      },
      {
        title: "What to consider",
        text: "The base fee varies with demand and is burned; a priority fee incentivizes inclusion. A reverted transaction can still consume gas because validators performed computation. Layer-2 networks offer different costs and security assumptions.",
      },
      {
        title: "Put it into practice",
        text: "Check the destination network and preview the transaction. Keep enough native ETH for fees and never assume a token balance can pay gas.",
      },
    ],
  },
  {
    slug: "market-and-limit-orders-explained",
    title: "Market and limit orders explained",
    category: "Trading",
    level: "Beginner",
    minutes: 5,
    sections: [
      {
        title: "The essentials",
        text: "A market order prioritizes execution against available liquidity. Its final average price may differ from the displayed quote, especially in fast markets or thin order books.",
      },
      {
        title: "What to consider",
        text: "A limit order sets the worst acceptable price. It may rest without filling, fill partially, or execute immediately if marketable. Maker and taker status depends on whether liquidity is added or removed, not just the selected order type.",
      },
      {
        title: "Put it into practice",
        text: "Estimate notional value and fees before submitting. Split large orders when appropriate and review open orders before placing another trade.",
      },
    ],
  },
  {
    slug: "reading-an-order-book",
    title: "Reading an order book",
    category: "Trading",
    level: "Intermediate",
    minutes: 5,
    sections: [
      {
        title: "The essentials",
        text: "An order book lists resting bids and asks by price. The spread is the distance between the best bid and best ask, and depth shows available size at each level.",
      },
      {
        title: "What to consider",
        text: "Visible liquidity can change or disappear before your order arrives. A large displayed bid is not a guarantee of support; cancelled orders and hidden liquidity make snapshots incomplete.",
      },
      {
        title: "Put it into practice",
        text: "Compare depth across nearby levels and estimate slippage for your actual size. Use a limit price when execution boundaries matter more than immediate completion.",
      },
    ],
  },
  {
    slug: "risk-management-before-your-first-trade",
    title: "Risk management before your first trade",
    category: "Trading",
    level: "Beginner",
    minutes: 5,
    sections: [
      {
        title: "The essentials",
        text: "Risk management starts with deciding how much capital a single idea can lose. Position size should follow that budget and the distance to your invalidation price, rather than a desired profit target.",
      },
      {
        title: "What to consider",
        text: "Stops are execution instructions, not insurance. Gaps and thin liquidity can produce worse fills, while leverage can trigger liquidation before a planned exit. Correlated positions can multiply exposure.",
      },
      {
        title: "Put it into practice",
        text: "Write down entry, exit and maximum loss before trading. Review outcomes periodically and avoid increasing size simply to recover a loss.",
      },
    ],
  },
  {
    slug: "how-decentralized-exchanges-work",
    title: "How decentralized exchanges work",
    category: "DeFi",
    level: "Intermediate",
    minutes: 5,
    sections: [
      {
        title: "The essentials",
        text: "Decentralized exchanges allow swaps through contracts rather than a centralized matching service. Automated market makers quote prices from liquidity pools, while some protocols use on-chain order books.",
      },
      {
        title: "What to consider",
        text: "Liquidity providers earn fees but face inventory risk, contract exploits and impermanent loss. A high quoted yield may reflect token incentives rather than durable revenue.",
      },
      {
        title: "Put it into practice",
        text: "Review contract addresses, audits and approval limits. Set a reasonable slippage tolerance and avoid signing transactions you cannot explain.",
      },
    ],
  },
  {
    slug: "stablecoins-are-not-all-the-same",
    title: "Stablecoins are not all the same",
    category: "DeFi",
    level: "Beginner",
    minutes: 5,
    sections: [
      {
        title: "The essentials",
        text: "Stablecoins target a reference value, commonly one US dollar. Some hold reserves with custodians, some rely on excess crypto collateral and others use algorithmic mechanisms.",
      },
      {
        title: "What to consider",
        text: "A target price is not a guarantee. Redemption restrictions, banking disruption, collateral volatility and governance failures can cause a stablecoin to trade away from its peg.",
      },
      {
        title: "Put it into practice",
        text: "Read reserve reports and redemption terms. Consider issuer, chain and bridge exposure separately; spreading tokens across wallets does not diversify the same underlying issuer risk.",
      },
    ],
  },
  {
    slug: "a-practical-guide-to-self-custody",
    title: "A practical guide to self-custody",
    category: "Web3",
    level: "Intermediate",
    minutes: 5,
    sections: [
      {
        title: "The essentials",
        text: "Self-custody means controlling the keys that authorize transactions. A recovery phrase can recreate those keys, so anyone with the phrase can generally control the wallet.",
      },
      {
        title: "What to consider",
        text: "Hardware wallets isolate signing from a general-purpose computer, but malicious approvals remain a risk. Verify addresses and transaction details on the trusted device screen.",
      },
      {
        title: "Put it into practice",
        text: "Store backups offline in separate secure locations. Test recovery with a small balance and never enter a recovery phrase into a support chat or website.",
      },
    ],
  },
  {
    slug: "understanding-layer-2-networks",
    title: "Understanding layer-2 networks",
    category: "Web3",
    level: "Advanced",
    minutes: 5,
    sections: [
      {
        title: "The essentials",
        text: "Layer-2 systems process activity outside a base chain and settle commitments back to it. Rollups publish data and use validity proofs or dispute systems to support the state transition.",
      },
      {
        title: "What to consider",
        text: "Bridge contracts, sequencers and upgrade keys introduce additional assumptions. Optimistic withdrawals may involve a challenge delay; fast exits can rely on third-party liquidity.",
      },
      {
        title: "Put it into practice",
        text: "Compare data availability, withdrawal procedures and governance controls. A familiar token ticker on a new network does not imply identical security or liquidity.",
      },
    ],
  },
  {
    slug: "protect-your-account-from-phishing",
    title: "Protect your account from phishing",
    category: "Security",
    level: "Beginner",
    minutes: 5,
    sections: [
      {
        title: "The essentials",
        text: "Phishing attempts imitate trusted brands to capture passwords, verification codes or wallet signatures. Attackers frequently use urgent messages and look-alike domains to discourage careful checking.",
      },
      {
        title: "What to consider",
        text: "Bookmark the official application and enable strong two-factor authentication. Treat unsolicited support calls as suspicious; support should never request your password or recovery phrase.",
      },
      {
        title: "Put it into practice",
        text: "If you suspect compromise, stop interacting, revoke sessions and keys from a clean device, change credentials and contact support through the official help center.",
      },
    ],
  },
  {
    slug: "funding-rates-and-perpetual-futures",
    title: "Funding rates and perpetual futures",
    category: "Trading",
    level: "Advanced",
    minutes: 5,
    sections: [
      {
        title: "The essentials",
        text: "Perpetual futures do not have a fixed expiry. Periodic funding payments between long and short positions help align the contract price with the underlying spot index.",
      },
      {
        title: "What to consider",
        text: "A positive funding rate usually means longs pay shorts. Rates can change, and a seemingly profitable basis trade still carries execution, margin and liquidation risk.",
      },
      {
        title: "Put it into practice",
        text: "Calculate funding, trading fees and adverse price moves together. Monitor margin independently on both legs and do not treat historical funding as guaranteed income.",
      },
    ],
  },
  {
    slug: "smart-contract-approvals-explained",
    title: "Smart contract approvals explained",
    category: "Security",
    level: "Intermediate",
    minutes: 5,
    sections: [
      {
        title: "The essentials",
        text: "A token approval gives a contract permission to spend tokens up to an allowance. This is separate from a transfer and can remain active long after you stop using an application.",
      },
      {
        title: "What to consider",
        text: "Unlimited approvals reduce repeated transactions but increase exposure if a spender is compromised. Signature-based permits can also grant spending rights without an initial on-chain approval transaction.",
      },
      {
        title: "Put it into practice",
        text: "Verify the spender and limit allowances where practical. Review and revoke unused permissions, understanding that revocation itself requires a network transaction.",
      },
    ],
  },
];
export const helpArticles: Article[] = [
  {
    slug: "reset-your-password",
    title: "Reset your password",
    category: "Account",
    level: "Guide",
    minutes: 3,
    sections: [
      {
        title: "Steps and guidance",
        text: "Use Log in, then the password recovery option. Enter your registered email and follow the verification instructions. Choose a unique password and end unrecognized sessions. A security change may temporarily restrict withdrawals; review the displayed restriction before transferring.",
      },
      {
        title: "Before you continue",
        text: "Check every detail in your account before confirming an action. OK Trade support will never ask for your password, recovery phrase or remote access to your device. This preview does not process real funds; available controls can differ from a production exchange.",
      },
    ],
  },
  {
    slug: "complete-identity-verification",
    title: "Complete identity verification",
    category: "Account",
    level: "Guide",
    minutes: 3,
    sections: [
      {
        title: "Steps and guidance",
        text: "Open Account and select identity verification. Check that your legal name matches your valid identity document, use clear unedited images and complete the requested face check. If a review fails, follow the stated reason rather than submitting the same images repeatedly.",
      },
      {
        title: "Before you continue",
        text: "Check every detail in your account before confirming an action. OK Trade support will never ask for your password, recovery phrase or remote access to your device. This preview does not process real funds; available controls can differ from a production exchange.",
      },
    ],
  },
  {
    slug: "find-your-account-uid",
    title: "Find your account UID",
    category: "Account",
    level: "Guide",
    minutes: 3,
    sections: [
      {
        title: "Steps and guidance",
        text: "Your UID is shown in your account profile after signing in. Share it only through the official support channel when needed to investigate an issue. A UID is not a password and cannot authorize a withdrawal.",
      },
      {
        title: "Before you continue",
        text: "Check every detail in your account before confirming an action. OK Trade support will never ask for your password, recovery phrase or remote access to your device. This preview does not process real funds; available controls can differ from a production exchange.",
      },
    ],
  },
  {
    slug: "deposit-crypto-safely",
    title: "Deposit crypto safely",
    category: "Deposit & withdrawal",
    level: "Guide",
    minutes: 3,
    sections: [
      {
        title: "Steps and guidance",
        text: "Open Assets, choose Deposit, then select the asset and network. Match the sending network exactly and include a memo or tag when shown. Check the minimum deposit, copy the address and send a small test before a large transfer.",
      },
      {
        title: "Before you continue",
        text: "Check every detail in your account before confirming an action. OK Trade support will never ask for your password, recovery phrase or remote access to your device. This preview does not process real funds; available controls can differ from a production exchange.",
      },
    ],
  },
  {
    slug: "why-has-my-deposit-not-arrived",
    title: "Why has my deposit not arrived?",
    category: "Deposit & withdrawal",
    level: "Guide",
    minutes: 3,
    sections: [
      {
        title: "Steps and guidance",
        text: "Locate the transaction hash on the sending platform and inspect it in the correct network explorer. Deposits require network confirmations and a supported address, token and network. If confirmed but not credited, contact support with the hash, amount, network and time; never share private keys.",
      },
      {
        title: "Before you continue",
        text: "Check every detail in your account before confirming an action. OK Trade support will never ask for your password, recovery phrase or remote access to your device. This preview does not process real funds; available controls can differ from a production exchange.",
      },
    ],
  },
  {
    slug: "withdraw-crypto-to-a-wallet",
    title: "Withdraw crypto to a wallet",
    category: "Deposit & withdrawal",
    level: "Guide",
    minutes: 3,
    sections: [
      {
        title: "Steps and guidance",
        text: "Choose Withdraw from Assets, select the correct network and verify the full destination address. Review the network fee, minimum and final received amount. Complete security checks only for a withdrawal you initiated; blockchain transfers are generally irreversible.",
      },
      {
        title: "Before you continue",
        text: "Check every detail in your account before confirming an action. OK Trade support will never ask for your password, recovery phrase or remote access to your device. This preview does not process real funds; available controls can differ from a production exchange.",
      },
    ],
  },
  {
    slug: "missing-memo-or-incorrect-network",
    title: "Missing memo or incorrect network",
    category: "Deposit & withdrawal",
    level: "Guide",
    minutes: 3,
    sections: [
      {
        title: "Steps and guidance",
        text: "Do not send another deposit to solve a missing memo. Record the hash, address, asset and network and contact official support. Recovery depends on technical feasibility and cannot be guaranteed; recovery fees or additional verification may apply.",
      },
      {
        title: "Before you continue",
        text: "Check every detail in your account before confirming an action. OK Trade support will never ask for your password, recovery phrase or remote access to your device. This preview does not process real funds; available controls can differ from a production exchange.",
      },
    ],
  },
  {
    slug: "place-your-first-spot-order",
    title: "Place your first spot order",
    category: "Trading",
    level: "Guide",
    minutes: 3,
    sections: [
      {
        title: "Steps and guidance",
        text: "Open a spot pair such as BTC/USDT and choose Buy or Sell. A market order trades against available liquidity; a limit order sets a price boundary. Review size, available balance and estimated fee, then inspect Orders for execution status.",
      },
      {
        title: "Before you continue",
        text: "Check every detail in your account before confirming an action. OK Trade support will never ask for your password, recovery phrase or remote access to your device. This preview does not process real funds; available controls can differ from a production exchange.",
      },
    ],
  },
  {
    slug: "cancel-an-open-order",
    title: "Cancel an open order",
    category: "Trading",
    level: "Guide",
    minutes: 3,
    sections: [
      {
        title: "Steps and guidance",
        text: "Open Orders and locate the unfilled order. Select Cancel and confirm the updated status. Already executed quantities cannot be cancelled, and a fill may occur while a cancellation is being processed.",
      },
      {
        title: "Before you continue",
        text: "Check every detail in your account before confirming an action. OK Trade support will never ask for your password, recovery phrase or remote access to your device. This preview does not process real funds; available controls can differ from a production exchange.",
      },
    ],
  },
  {
    slug: "understand-maker-and-taker-fees",
    title: "Understand maker and taker fees",
    category: "Trading",
    level: "Guide",
    minutes: 3,
    sections: [
      {
        title: "Steps and guidance",
        text: "Maker orders add resting liquidity and taker orders remove liquidity. A limit order that crosses the book can be a taker order. Check the Fees page and your tier before trading; the fee applies to executed notional, not to cancelled unfilled quantities.",
      },
      {
        title: "Before you continue",
        text: "Check every detail in your account before confirming an action. OK Trade support will never ask for your password, recovery phrase or remote access to your device. This preview does not process real funds; available controls can differ from a production exchange.",
      },
    ],
  },
  {
    slug: "why-is-my-balance-unavailable",
    title: "Why is my balance unavailable?",
    category: "Trading",
    level: "Guide",
    minutes: 3,
    sections: [
      {
        title: "Steps and guidance",
        text: "Funds can be reserved for open orders, margin or subscribed products. Check Orders and active positions before trying again. Cancelling an unfilled order releases its reserved balance; market losses and fees are not restored by cancellation.",
      },
      {
        title: "Before you continue",
        text: "Check every detail in your account before confirming an action. OK Trade support will never ask for your password, recovery phrase or remote access to your device. This preview does not process real funds; available controls can differ from a production exchange.",
      },
    ],
  },
  {
    slug: "cross-and-isolated-margin",
    title: "Cross and isolated margin",
    category: "Futures",
    level: "Guide",
    minutes: 3,
    sections: [
      {
        title: "Steps and guidance",
        text: "Isolated margin assigns collateral to a specific position, while cross margin shares eligible collateral across positions. Both can liquidate when maintenance requirements are no longer met. Review leverage, liquidation estimates and funding before placing a position.",
      },
      {
        title: "Before you continue",
        text: "Check every detail in your account before confirming an action. OK Trade support will never ask for your password, recovery phrase or remote access to your device. This preview does not process real funds; available controls can differ from a production exchange.",
      },
    ],
  },
  {
    slug: "how-liquidation-works",
    title: "How liquidation works",
    category: "Futures",
    level: "Guide",
    minutes: 3,
    sections: [
      {
        title: "Steps and guidance",
        text: "Liquidation can occur when margin falls below maintenance requirements, typically using a mark price rather than the last traded price. Reduce exposure or add eligible collateral before reaching the threshold. Stop orders do not guarantee protection from liquidation.",
      },
      {
        title: "Before you continue",
        text: "Check every detail in your account before confirming an action. OK Trade support will never ask for your password, recovery phrase or remote access to your device. This preview does not process real funds; available controls can differ from a production exchange.",
      },
    ],
  },
  {
    slug: "when-is-funding-charged",
    title: "When is funding charged?",
    category: "Futures",
    level: "Guide",
    minutes: 3,
    sections: [
      {
        title: "Steps and guidance",
        text: "Funding is exchanged between long and short holders at the contract settlement times shown in the trading interface. Check the current rate and next settlement time for your instrument. Rates and schedules may differ between contracts.",
      },
      {
        title: "Before you continue",
        text: "Check every detail in your account before confirming an action. OK Trade support will never ask for your password, recovery phrase or remote access to your device. This preview does not process real funds; available controls can differ from a production exchange.",
      },
    ],
  },
  {
    slug: "redeem-an-earn-subscription",
    title: "Redeem an Earn subscription",
    category: "Earn",
    level: "Guide",
    minutes: 3,
    sections: [
      {
        title: "Steps and guidance",
        text: "Open Earn and review your active subscription. Flexible products can generally be redeemed subject to the product rules; fixed-term products may not allow early redemption. Review the settlement schedule and any impact on accrued rewards before confirming.",
      },
      {
        title: "Before you continue",
        text: "Check every detail in your account before confirming an action. OK Trade support will never ask for your password, recovery phrase or remote access to your device. This preview does not process real funds; available controls can differ from a production exchange.",
      },
    ],
  },
  {
    slug: "are-earn-returns-guaranteed",
    title: "Are Earn returns guaranteed?",
    category: "Earn",
    level: "Guide",
    minutes: 3,
    sections: [
      {
        title: "Steps and guidance",
        text: "Quoted annualized rates are estimates unless the individual product terms explicitly say otherwise. Rates, reward assets and redemption timing may vary. Crypto lending, staking and protocol exposure carry counterparty, liquidity and technology risks.",
      },
      {
        title: "Before you continue",
        text: "Check every detail in your account before confirming an action. OK Trade support will never ask for your password, recovery phrase or remote access to your device. This preview does not process real funds; available controls can differ from a production exchange.",
      },
    ],
  },
  {
    slug: "set-up-two-factor-authentication",
    title: "Set up two-factor authentication",
    category: "Security",
    level: "Guide",
    minutes: 3,
    sections: [
      {
        title: "Steps and guidance",
        text: "From Account security, enroll an authenticator and securely store the recovery information. Verify the setup with a current code. Never disclose a one-time code to someone contacting you; support cannot legitimately ask you to approve their login.",
      },
      {
        title: "Before you continue",
        text: "Check every detail in your account before confirming an action. OK Trade support will never ask for your password, recovery phrase or remote access to your device. This preview does not process real funds; available controls can differ from a production exchange.",
      },
    ],
  },
  {
    slug: "report-a-suspected-account-compromise",
    title: "Report a suspected account compromise",
    category: "Security",
    level: "Guide",
    minutes: 3,
    sections: [
      {
        title: "Steps and guidance",
        text: "Use a clean device to change your password, revoke API keys and terminate unknown sessions. Contact support through this help center with the suspicious activity details. Never move assets to a wallet provided by an unsolicited caller claiming to protect them.",
      },
      {
        title: "Before you continue",
        text: "Check every detail in your account before confirming an action. OK Trade support will never ask for your password, recovery phrase or remote access to your device. This preview does not process real funds; available controls can differ from a production exchange.",
      },
    ],
  },
  {
    slug: "p2p-payment-safety",
    title: "P2P payment safety",
    category: "P2P",
    level: "Guide",
    minutes: 3,
    sections: [
      {
        title: "Steps and guidance",
        text: "Only pay the verified counterparty using the method shown in the order. Keep conversation and evidence on-platform, and never mark payment complete before actually sending funds. Sellers should verify the money in their own bank account before releasing crypto.",
      },
      {
        title: "Before you continue",
        text: "Check every detail in your account before confirming an action. OK Trade support will never ask for your password, recovery phrase or remote access to your device. This preview does not process real funds; available controls can differ from a production exchange.",
      },
    ],
  },
  {
    slug: "open-a-p2p-dispute",
    title: "Open a P2P dispute",
    category: "P2P",
    level: "Guide",
    minutes: 3,
    sections: [
      {
        title: "Steps and guidance",
        text: "Do not cancel a paid order simply because a counterparty asks. Open a dispute from the order and provide payment evidence with sensitive unrelated details hidden. Keep the order reference and communicate through the official case; never share bank login credentials.",
      },
      {
        title: "Before you continue",
        text: "Check every detail in your account before confirming an action. OK Trade support will never ask for your password, recovery phrase or remote access to your device. This preview does not process real funds; available controls can differ from a production exchange.",
      },
    ],
  },
];
export const announcements: Article[] = [
  {
    slug: "sol-usdc-spot-market-added",
    title: "SOL/USDC spot market added",
    category: "New listings",
    date: "2025-05-28",
    level: "Announcement",
    minutes: 2,
    sections: [
      {
        title: "Overview",
        text: "OK Trade is publishing this new listings notice to help customers plan their activity. SOL/USDC spot market added. This notice is part of the illustrative OK Trade demo news archive and is not a live listing, maintenance or promotional commitment.",
      },
      {
        title: "What you need to know",
        text: "Check asset and network availability in the trading or deposit screen before submitting an instruction. Existing order history remains accessible. Feature eligibility depends on your account and region; no action is required solely because you read this notice.",
      },
      {
        title: "Stay informed",
        text: "Use official OK Trade channels for service notices and review this page before planning time-sensitive transfers. Trading digital assets involves substantial risk. Announcements are informational and are not investment advice.",
      },
    ],
  },
  {
    slug: "improved-order-history-filters",
    title: "Improved order history filters",
    category: "Product updates",
    date: "2025-05-27",
    level: "Announcement",
    minutes: 2,
    sections: [
      {
        title: "Overview",
        text: "OK Trade is publishing this product updates notice to help customers plan their activity. Improved order history filters. This notice is part of the illustrative OK Trade demo news archive and is not a live listing, maintenance or promotional commitment.",
      },
      {
        title: "What you need to know",
        text: "Check asset and network availability in the trading or deposit screen before submitting an instruction. Existing order history remains accessible. Feature eligibility depends on your account and region; no action is required solely because you read this notice.",
      },
      {
        title: "Stay informed",
        text: "Use official OK Trade channels for service notices and review this page before planning time-sensitive transfers. Trading digital assets involves substantial risk. Announcements are informational and are not investment advice.",
      },
    ],
  },
  {
    slug: "scheduled-wallet-infrastructure-maintenance",
    title: "Scheduled wallet infrastructure maintenance",
    category: "Maintenance",
    date: "2025-05-26",
    level: "Announcement",
    minutes: 2,
    sections: [
      {
        title: "Overview",
        text: "OK Trade is publishing this maintenance notice to help customers plan their activity. Scheduled wallet infrastructure maintenance. This notice is part of the illustrative OK Trade demo news archive and is not a live listing, maintenance or promotional commitment.",
      },
      {
        title: "What you need to know",
        text: "Check asset and network availability in the trading or deposit screen before submitting an instruction. Existing order history remains accessible. Feature eligibility depends on your account and region; no action is required solely because you read this notice.",
      },
      {
        title: "Stay informed",
        text: "Use official OK Trade channels for service notices and review this page before planning time-sensitive transfers. Trading digital assets involves substantial risk. Announcements are informational and are not investment advice.",
      },
    ],
  },
  {
    slug: "websocket-subscription-guidance-updated",
    title: "WebSocket subscription guidance updated",
    category: "API",
    date: "2025-05-25",
    level: "Announcement",
    minutes: 2,
    sections: [
      {
        title: "Overview",
        text: "OK Trade is publishing this api notice to help customers plan their activity. WebSocket subscription guidance updated. This notice is part of the illustrative OK Trade demo news archive and is not a live listing, maintenance or promotional commitment.",
      },
      {
        title: "What you need to know",
        text: "Check asset and network availability in the trading or deposit screen before submitting an instruction. Existing order history remains accessible. Feature eligibility depends on your account and region; no action is required solely because you read this notice.",
      },
      {
        title: "Stay informed",
        text: "Use official OK Trade channels for service notices and review this page before planning time-sensitive transfers. Trading digital assets involves substantial risk. Announcements are informational and are not investment advice.",
      },
    ],
  },
  {
    slug: "security-awareness-learning-week",
    title: "Security awareness learning week",
    category: "Latest events",
    date: "2025-05-24",
    level: "Announcement",
    minutes: 2,
    sections: [
      {
        title: "Overview",
        text: "OK Trade is publishing this latest events notice to help customers plan their activity. Security awareness learning week. This notice is part of the illustrative OK Trade demo news archive and is not a live listing, maintenance or promotional commitment.",
      },
      {
        title: "What you need to know",
        text: "Check asset and network availability in the trading or deposit screen before submitting an instruction. Existing order history remains accessible. Feature eligibility depends on your account and region; no action is required solely because you read this notice.",
      },
      {
        title: "Stay informed",
        text: "Use official OK Trade channels for service notices and review this page before planning time-sensitive transfers. Trading digital assets involves substantial risk. Announcements are informational and are not investment advice.",
      },
    ],
  },
  {
    slug: "retirement-of-legacy-demo-markets",
    title: "Retirement of legacy demo markets",
    category: "Delistings",
    date: "2025-05-23",
    level: "Announcement",
    minutes: 2,
    sections: [
      {
        title: "Overview",
        text: "OK Trade is publishing this delistings notice to help customers plan their activity. Retirement of legacy demo markets. This notice is part of the illustrative OK Trade demo news archive and is not a live listing, maintenance or promotional commitment.",
      },
      {
        title: "What you need to know",
        text: "Check asset and network availability in the trading or deposit screen before submitting an instruction. Existing order history remains accessible. Feature eligibility depends on your account and region; no action is required solely because you read this notice.",
      },
      {
        title: "Stay informed",
        text: "Use official OK Trade channels for service notices and review this page before planning time-sensitive transfers. Trading digital assets involves substantial risk. Announcements are informational and are not investment advice.",
      },
    ],
  },
  {
    slug: "new-portfolio-balance-controls",
    title: "New portfolio balance controls",
    category: "Product updates",
    date: "2025-05-22",
    level: "Announcement",
    minutes: 2,
    sections: [
      {
        title: "Overview",
        text: "OK Trade is publishing this product updates notice to help customers plan their activity. New portfolio balance controls. This notice is part of the illustrative OK Trade demo news archive and is not a live listing, maintenance or promotional commitment.",
      },
      {
        title: "What you need to know",
        text: "Check asset and network availability in the trading or deposit screen before submitting an instruction. Existing order history remains accessible. Feature eligibility depends on your account and region; no action is required solely because you read this notice.",
      },
      {
        title: "Stay informed",
        text: "Use official OK Trade channels for service notices and review this page before planning time-sensitive transfers. Trading digital assets involves substantial risk. Announcements are informational and are not investment advice.",
      },
    ],
  },
  {
    slug: "link-usdc-spot-market-added",
    title: "LINK/USDC spot market added",
    category: "New listings",
    date: "2025-05-21",
    level: "Announcement",
    minutes: 2,
    sections: [
      {
        title: "Overview",
        text: "OK Trade is publishing this new listings notice to help customers plan their activity. LINK/USDC spot market added. This notice is part of the illustrative OK Trade demo news archive and is not a live listing, maintenance or promotional commitment.",
      },
      {
        title: "What you need to know",
        text: "Check asset and network availability in the trading or deposit screen before submitting an instruction. Existing order history remains accessible. Feature eligibility depends on your account and region; no action is required solely because you read this notice.",
      },
      {
        title: "Stay informed",
        text: "Use official OK Trade channels for service notices and review this page before planning time-sensitive transfers. Trading digital assets involves substantial risk. Announcements are informational and are not investment advice.",
      },
    ],
  },
  {
    slug: "rest-request-timestamp-validation",
    title: "REST request timestamp validation",
    category: "API",
    date: "2025-05-20",
    level: "Announcement",
    minutes: 2,
    sections: [
      {
        title: "Overview",
        text: "OK Trade is publishing this api notice to help customers plan their activity. REST request timestamp validation. This notice is part of the illustrative OK Trade demo news archive and is not a live listing, maintenance or promotional commitment.",
      },
      {
        title: "What you need to know",
        text: "Check asset and network availability in the trading or deposit screen before submitting an instruction. Existing order history remains accessible. Feature eligibility depends on your account and region; no action is required solely because you read this notice.",
      },
      {
        title: "Stay informed",
        text: "Use official OK Trade channels for service notices and review this page before planning time-sensitive transfers. Trading digital assets involves substantial risk. Announcements are informational and are not investment advice.",
      },
    ],
  },
  {
    slug: "ethereum-wallet-service-update",
    title: "Ethereum wallet service update",
    category: "Maintenance",
    date: "2025-05-19",
    level: "Announcement",
    minutes: 2,
    sections: [
      {
        title: "Overview",
        text: "OK Trade is publishing this maintenance notice to help customers plan their activity. Ethereum wallet service update. This notice is part of the illustrative OK Trade demo news archive and is not a live listing, maintenance or promotional commitment.",
      },
      {
        title: "What you need to know",
        text: "Check asset and network availability in the trading or deposit screen before submitting an instruction. Existing order history remains accessible. Feature eligibility depends on your account and region; no action is required solely because you read this notice.",
      },
      {
        title: "Stay informed",
        text: "Use official OK Trade channels for service notices and review this page before planning time-sensitive transfers. Trading digital assets involves substantial risk. Announcements are informational and are not investment advice.",
      },
    ],
  },
  {
    slug: "trading-fundamentals-workshop",
    title: "Trading fundamentals workshop",
    category: "Latest events",
    date: "2025-05-18",
    level: "Announcement",
    minutes: 2,
    sections: [
      {
        title: "Overview",
        text: "OK Trade is publishing this latest events notice to help customers plan their activity. Trading fundamentals workshop. This notice is part of the illustrative OK Trade demo news archive and is not a live listing, maintenance or promotional commitment.",
      },
      {
        title: "What you need to know",
        text: "Check asset and network availability in the trading or deposit screen before submitting an instruction. Existing order history remains accessible. Feature eligibility depends on your account and region; no action is required solely because you read this notice.",
      },
      {
        title: "Stay informed",
        text: "Use official OK Trade channels for service notices and review this page before planning time-sensitive transfers. Trading digital assets involves substantial risk. Announcements are informational and are not investment advice.",
      },
    ],
  },
  {
    slug: "enhanced-deposit-network-warnings",
    title: "Enhanced deposit network warnings",
    category: "Product updates",
    date: "2025-05-17",
    level: "Announcement",
    minutes: 2,
    sections: [
      {
        title: "Overview",
        text: "OK Trade is publishing this product updates notice to help customers plan their activity. Enhanced deposit network warnings. This notice is part of the illustrative OK Trade demo news archive and is not a live listing, maintenance or promotional commitment.",
      },
      {
        title: "What you need to know",
        text: "Check asset and network availability in the trading or deposit screen before submitting an instruction. Existing order history remains accessible. Feature eligibility depends on your account and region; no action is required solely because you read this notice.",
      },
      {
        title: "Stay informed",
        text: "Use official OK Trade channels for service notices and review this page before planning time-sensitive transfers. Trading digital assets involves substantial risk. Announcements are informational and are not investment advice.",
      },
    ],
  },
  {
    slug: "order-book-sequence-handling",
    title: "Order book sequence handling",
    category: "API",
    date: "2025-05-16",
    level: "Announcement",
    minutes: 2,
    sections: [
      {
        title: "Overview",
        text: "OK Trade is publishing this api notice to help customers plan their activity. Order book sequence handling. This notice is part of the illustrative OK Trade demo news archive and is not a live listing, maintenance or promotional commitment.",
      },
      {
        title: "What you need to know",
        text: "Check asset and network availability in the trading or deposit screen before submitting an instruction. Existing order history remains accessible. Feature eligibility depends on your account and region; no action is required solely because you read this notice.",
      },
      {
        title: "Stay informed",
        text: "Use official OK Trade channels for service notices and review this page before planning time-sensitive transfers. Trading digital assets involves substantial risk. Announcements are informational and are not investment advice.",
      },
    ],
  },
  {
    slug: "avax-usdc-spot-market-added",
    title: "AVAX/USDC spot market added",
    category: "New listings",
    date: "2025-05-15",
    level: "Announcement",
    minutes: 2,
    sections: [
      {
        title: "Overview",
        text: "OK Trade is publishing this new listings notice to help customers plan their activity. AVAX/USDC spot market added. This notice is part of the illustrative OK Trade demo news archive and is not a live listing, maintenance or promotional commitment.",
      },
      {
        title: "What you need to know",
        text: "Check asset and network availability in the trading or deposit screen before submitting an instruction. Existing order history remains accessible. Feature eligibility depends on your account and region; no action is required solely because you read this notice.",
      },
      {
        title: "Stay informed",
        text: "Use official OK Trade channels for service notices and review this page before planning time-sensitive transfers. Trading digital assets involves substantial risk. Announcements are informational and are not investment advice.",
      },
    ],
  },
  {
    slug: "market-data-service-maintenance",
    title: "Market data service maintenance",
    category: "Maintenance",
    date: "2025-05-14",
    level: "Announcement",
    minutes: 2,
    sections: [
      {
        title: "Overview",
        text: "OK Trade is publishing this maintenance notice to help customers plan their activity. Market data service maintenance. This notice is part of the illustrative OK Trade demo news archive and is not a live listing, maintenance or promotional commitment.",
      },
      {
        title: "What you need to know",
        text: "Check asset and network availability in the trading or deposit screen before submitting an instruction. Existing order history remains accessible. Feature eligibility depends on your account and region; no action is required solely because you read this notice.",
      },
      {
        title: "Stay informed",
        text: "Use official OK Trade channels for service notices and review this page before planning time-sensitive transfers. Trading digital assets involves substantial risk. Announcements are informational and are not investment advice.",
      },
    ],
  },
  {
    slug: "monthly-product-community-review",
    title: "Monthly product community review",
    category: "Latest events",
    date: "2025-05-13",
    level: "Announcement",
    minutes: 2,
    sections: [
      {
        title: "Overview",
        text: "OK Trade is publishing this latest events notice to help customers plan their activity. Monthly product community review. This notice is part of the illustrative OK Trade demo news archive and is not a live listing, maintenance or promotional commitment.",
      },
      {
        title: "What you need to know",
        text: "Check asset and network availability in the trading or deposit screen before submitting an instruction. Existing order history remains accessible. Feature eligibility depends on your account and region; no action is required solely because you read this notice.",
      },
      {
        title: "Stay informed",
        text: "Use official OK Trade channels for service notices and review this page before planning time-sensitive transfers. Trading digital assets involves substantial risk. Announcements are informational and are not investment advice.",
      },
    ],
  },
];
