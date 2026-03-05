// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title SniffDailyClaim
 * @notice Daily $SNIFF token faucet with streak-based multiplier rewards (UUPS Upgradeable).
 *         Users can claim once every 24 hours. Consecutive daily claims
 *         build a streak that increases the reward multiplier.
 *
 * Streak Tiers:
 *   Days 1–6   → 1.0x  (100 SNIFF)
 *   Days 7–13  → 1.5x  (150 SNIFF)
 *   Days 14–29 → 2.0x  (200 SNIFF)
 *   Days 30+   → 3.0x  (300 SNIFF)
 */
contract SniffDailyClaim is 
    Initializable, 
    OwnableUpgradeable, 
    ReentrancyGuardUpgradeable, 
    PausableUpgradeable, 
    UUPSUpgradeable 
{
    // ─── State ──────────────────────────────────────────────
    IERC20 public sniffToken;

    uint256 public dailyReward;
    uint256 public cooldown;
    uint256 public streakWindow;

    mapping(address => uint256) public lastClaimed;
    mapping(address => uint256) public streak;
    mapping(address => uint256) public totalClaimed;

    uint256 public totalDistributed;
    uint256 public totalClaimers;
    mapping(address => bool) private hasClaimed;

    // --- New State (Added for Shield Feature) ---
    mapping(address => uint256) public shields;
    uint256 public shieldPrice;

    // ─── Events ─────────────────────────────────────────────
    event Claimed(
        address indexed user,
        uint256 amount,
        uint256 streak,
        uint256 multiplier
    );
    event DailyRewardUpdated(uint256 oldReward, uint256 newReward);
    event TokensWithdrawn(address indexed to, uint256 amount);
    event ShieldBought(address indexed user, uint256 amount, uint256 cost);
    event ShieldUsed(address indexed user, uint256 newStreak);
    event ShieldPriceUpdated(uint256 oldPrice, uint256 newPrice);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // ─── Initializer ────────────────────────────────────────
    function initialize(address _token) public initializer {
        require(_token != address(0), "Invalid token address");
        
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        sniffToken = IERC20(_token);
        dailyReward = 100 * 1e18; // base reward (100 SNIFF, 18 decimals)
        cooldown = 1 days;        // minimum gap between claims
        streakWindow = 2 days;    // grace window to keep streak alive
        shieldPrice = 400 * 1e18; // default shield price
    }

    // ─── UUPS Upgrade Authorization ─────────────────────────
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ─── Shield Logic ───────────────────────────────────────

    /**
     * @notice Purchase streak shields using $SNIFF tokens.
     * @param amount The number of shields to buy.
     */
    function buyShield(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be > 0");
        uint256 totalCost = amount * shieldPrice;
        
        require(
            sniffToken.transferFrom(msg.sender, address(this), totalCost),
            "Transfer failed"
        );

        shields[msg.sender] += amount;
        emit ShieldBought(msg.sender, amount, totalCost);
    }

    // ─── Multiplier Logic ───────────────────────────────────

    /**
     * @notice Returns the reward multiplier (basis‑point style, 100 = 1x).
     *   Days  1–6  → 100  (1.0x)
     *   Days  7–13 → 150  (1.5x)
     *   Days 14–29 → 200  (2.0x)
     *   Days 30+   → 300  (3.0x)
     */
    function getMultiplier(uint256 _currentStreak) public pure returns (uint256) {
        if (_currentStreak >= 30) return 300;
        if (_currentStreak >= 14) return 200;
        if (_currentStreak >= 7)  return 150;
        return 100;
    }

    /**
     * @notice Returns the actual reward amount for a given streak.
     */
    function getRewardForStreak(uint256 _currentStreak) public view returns (uint256) {
        return (dailyReward * getMultiplier(_currentStreak)) / 100;
    }

    // ─── Core Claim ─────────────────────────────────────────

    function claim() external nonReentrant whenNotPaused {
        require(
            block.timestamp >= lastClaimed[msg.sender] + cooldown,
            "Already claimed today"
        );
        require(
            sniffToken.balanceOf(address(this)) >= dailyReward * 3, // worst‑case 3x
            "Contract has insufficient SNIFF balance"
        );

        // Update streak
        if (lastClaimed[msg.sender] == 0) {
            // First time claim
            streak[msg.sender] = 1;
        } else if (block.timestamp <= lastClaimed[msg.sender] + streakWindow) {
            // Within grace window
            streak[msg.sender]++;
        } else if (shields[msg.sender] > 0) {
            // Outside window BUT has a shield
            shields[msg.sender]--;
            streak[msg.sender]++;
            emit ShieldUsed(msg.sender, streak[msg.sender]);
        } else {
            // Reset streak
            streak[msg.sender] = 1;
        }

        lastClaimed[msg.sender] = block.timestamp;

        // Calculate reward with multiplier
        uint256 multiplier = getMultiplier(streak[msg.sender]);
        uint256 reward = (dailyReward * multiplier) / 100;

        // Track stats
        totalClaimed[msg.sender] += reward;
        totalDistributed += reward;
        if (!hasClaimed[msg.sender]) {
            hasClaimed[msg.sender] = true;
            totalClaimers++;
        }

        // Transfer
        require(sniffToken.transfer(msg.sender, reward), "Transfer failed");

        emit Claimed(msg.sender, reward, streak[msg.sender], multiplier);
    }

    // ─── View Helpers ───────────────────────────────────────

    function canClaim(address user) external view returns (bool) {
        return block.timestamp >= lastClaimed[user] + cooldown;
    }

    function timeUntilNextClaim(address user) external view returns (uint256) {
        if (lastClaimed[user] == 0) return 0; // never claimed → can claim now
        uint256 nextClaim = lastClaimed[user] + cooldown;
        if (block.timestamp >= nextClaim) return 0;
        return nextClaim - block.timestamp;
    }

    function currentStreak(address user) external view returns (uint256) {
        // If streak window has expired AND user has no shields, streak is effectively 0
        if (
            lastClaimed[user] != 0 &&
            block.timestamp > lastClaimed[user] + streakWindow &&
            shields[user] == 0
        ) {
            return 0;
        }
        return streak[user];
    }

    function nextReward(address user) external view returns (uint256) {
        uint256 projectedStreak;
        if (
            lastClaimed[user] == 0 ||
            block.timestamp <= lastClaimed[user] + streakWindow ||
            shields[user] > 0
        ) {
            projectedStreak = streak[user] + 1;
        } else {
            projectedStreak = 1;
        }
        return getRewardForStreak(projectedStreak);
    }

    function contractBalance() external view returns (uint256) {
        return sniffToken.balanceOf(address(this));
    }

    // ─── Owner Functions ────────────────────────────────────

    function setDailyReward(uint256 _reward) external onlyOwner {
        emit DailyRewardUpdated(dailyReward, _reward);
        dailyReward = _reward;
    }

    function setShieldPrice(uint256 _price) external onlyOwner {
        emit ShieldPriceUpdated(shieldPrice, _price);
        shieldPrice = _price;
    }

    function withdrawTokens(uint256 amount) external onlyOwner {
        require(sniffToken.transfer(owner(), amount), "Transfer failed");
        emit TokensWithdrawn(owner(), amount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
