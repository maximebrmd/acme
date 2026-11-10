<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class NewBoost extends JsonSerializableType
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
     * @var ?string $payer
     */
    #[JsonProperty('payer')]
    public ?string $payer;

    /**
     * @var string $postId
     */
    #[JsonProperty('postId')]
    public string $postId;

    /**
     * @var value-of<SpecialAdCategory> $specialAdCategory
     */
    #[JsonProperty('specialAdCategory')]
    public string $specialAdCategory;

    /**
     * @var ?string $startsAt
     */
    #[JsonProperty('startsAt')]
    public ?string $startsAt;

    /**
     * @param array{
     *   accountId: string,
     *   audience: BoostAudience,
     *   budget: BoostBudget,
     *   channelId: string,
     *   currency: string,
     *   endsAt: string,
     *   postId: string,
     *   specialAdCategory: value-of<SpecialAdCategory>,
     *   beneficiary?: ?string,
     *   payer?: ?string,
     *   startsAt?: ?string,
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
        $this->currency = $values['currency'];
        $this->endsAt = $values['endsAt'];
        $this->payer = $values['payer'] ?? null;
        $this->postId = $values['postId'];
        $this->specialAdCategory = $values['specialAdCategory'];
        $this->startsAt = $values['startsAt'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
