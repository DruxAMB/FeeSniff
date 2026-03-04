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

    // ─── Events ─────────────────────────────────────────────
    event Claimed(
        address indexed user,
        uint256 amount,
        uint256 streak,
        uint256 multiplier
    );
    event DailyRewardUpdated(uint256 oldReward, uint256 newReward);
    event TokensWithdrawn(address indexed to, uint256 amount);

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
    }

    // ─── UUPS Upgrade Authorization ─────────────────────────
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

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
        if (
            lastClaimed[msg.sender] != 0 &&
            block.timestamp <= lastClaimed[msg.sender] + streakWindow
        ) {
            streak[msg.sender]++;
        } else {
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
        // If streak window has expired, streak is effectively 0 (will reset on next claim)
        if (
            lastClaimed[user] != 0 &&
            block.timestamp > lastClaimed[user] + streakWindow
        ) {
            return 0;
        }
        return streak[user];
    }

    function nextReward(address user) external view returns (uint256) {
        uint256 projectedStreak;
        if (
            lastClaimed[user] != 0 &&
            block.timestamp <= lastClaimed[user] + streakWindow
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