<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class Boost extends JsonSerializableType
{
    /**
     * @var string $accountId
     */
    #[JsonProperty('accountId')]
    public string $accountId;

    /**
     * @var BoostAudience $audience
     */
    #[JsonProperty('audience')]
    public BoostAudience $audience;

    /**
     * @var ?string $beneficiary
     */
    #[JsonProperty('beneficiary')]
    public ?string $beneficiary;

    /**
     * @var BoostBudget $budget
     */
    #[JsonProperty('budget')]
    public BoostBudget $budget;

    /**
     * @var string $channelId
     */
    #[JsonProperty('channelId')]
    public string $channelId;

    /**
     * @var int $committed An amount in the currency's minor units, as the ad network counts them: cents for EUR and USD, yen for JPY. Divide by 10 to the power of the account's `minorUnitDigits` to show it.
     */
    #[JsonProperty('committed')]
    public int $committed;

    /**
     * @var string $createdAt
     */
    #[JsonProperty('createdAt')]
    public string $createdAt;

    /**
     * @var string $currency An ISO 4217 currency code, in capitals: `EUR`, `USD`.
     */
    #[JsonProperty('currency')]
    public string $currency;

    /**
     * @var string $endsAt
     */
    #[JsonProperty('endsAt')]
    public string $endsAt;

    /**
     * @var ?value-of<BoostFailureReason> $failureReason
     */
    #[JsonProperty('failureReason')]
    public ?string $failureReason;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var ?string $networkCode
     */
    #[JsonProperty('networkCode')]
    public ?string $networkCode;

    /**
     * @var value-of<BoostObjective> $objective
     */
    #[JsonProperty('objective')]
    public string $objective;

    /**
     * @var ?string $payer
     */
    #[JsonProperty('payer')]
    public ?string $payer;

    /**
     * @var value-of<BoostPlatform> $platform
     */
    #[JsonProperty('platform')]
    public string $platform;

    /**
     * @var string $postId
     */
    #[JsonProperty('postId')]
    public string $postId;

    /**
     * @var string $startsAt
     */
    #[JsonProperty('startsAt')]
    public string $startsAt;

    /**
     * @var value-of<BoostState> $state
     */
    #[JsonProperty('state')]
    public string $state;

    /**
     * @var string $stateAt
     */
    #[JsonProperty('stateAt')]
    public string $stateAt;

    /**
     * @var string $updatedAt
     */
    #[JsonProperty('updatedAt')]
    public string $updatedAt;

    /**
     * @param array{
     *   accountId: string,
     *   audience: BoostAudience,
     *   budget: BoostBudget,
     *   channelId: string,
     *   committed: int,
     *   createdAt: string,
     *   currency: string,
     *   endsAt: string,
     *   id: string,
     *   objective: value-of<BoostObjective>,
     *   platform: value-of<BoostPlatform>,
     *   postId: string,
     *   startsAt: string,
     *   state: value-of<BoostState>,
     *   stateAt: string,
     *   updatedAt: string,
     *   beneficiary?: ?string,
     *   failureReason?: ?value-of<BoostFailureReason>,
     *   networkCode?: ?string,
     *   payer?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->accountId = $values['accountId'];
        $this->audience = $values['audience'];
        $this->beneficiary = $values['beneficiary'] ?? null;
        $this->budget = $values['budget'];
        $this->channelId = $values['channelId'];
        $this->committed = $values['committed'];
        $this->createdAt = $values['createdAt'];
        $this->currency = $values['currency'];
        $this->endsAt = $values['endsAt'];
        $this->failureReason = $values['failureReason'] ?? null;
        $this->id = $values['id'];
        $this->networkCode = $values['networkCode'] ?? null;
        $this->objective = $values['objective'];
        $this->payer = $values['payer'] ?? null;
        $this->platform = $values['platform'];
        $this->postId = $values['postId'];
        $this->startsAt = $values['startsAt'];
        $this->state = $values['state'];
        $this->stateAt = $values['stateAt'];
        $this->updatedAt = $values['updatedAt'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
