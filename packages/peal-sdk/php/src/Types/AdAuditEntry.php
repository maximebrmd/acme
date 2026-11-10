<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class AdAuditEntry extends JsonSerializableType
{
    /**
     * @var ?string $accountId
     */
    #[JsonProperty('accountId')]
    public ?string $accountId;

    /**
     * @var value-of<AdAuditAction> $action
     */
    #[JsonProperty('action')]
    public string $action;

    /**
     * @var array<string, int> $amounts
     */
    #[JsonProperty('amounts'), ArrayType(['string' => 'integer'])]
    public array $amounts;

    /**
     * @var string $at
     */
    #[JsonProperty('at')]
    public string $at;

    /**
     * @var ?string $boostId
     */
    #[JsonProperty('boostId')]
    public ?string $boostId;

    /**
     * @var ?AdAuditEntryBy $by
     */
    #[JsonProperty('by')]
    public ?AdAuditEntryBy $by;

    /**
     * @var ?string $currency
     */
    #[JsonProperty('currency')]
    public ?string $currency;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @param array{
     *   action: value-of<AdAuditAction>,
     *   amounts: array<string, int>,
     *   at: string,
     *   id: string,
     *   accountId?: ?string,
     *   boostId?: ?string,
     *   by?: ?AdAuditEntryBy,
     *   currency?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->accountId = $values['accountId'] ?? null;
        $this->action = $values['action'];
        $this->amounts = $values['amounts'];
        $this->at = $values['at'];
        $this->boostId = $values['boostId'] ?? null;
        $this->by = $values['by'] ?? null;
        $this->currency = $values['currency'] ?? null;
        $this->id = $values['id'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
