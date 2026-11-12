<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class PartnerHealth extends JsonSerializableType
{
    /**
     * @var ?PartnerHealthAccount $account
     */
    #[JsonProperty('account')]
    public ?PartnerHealthAccount $account;

    /**
     * @var ?string $next
     */
    #[JsonProperty('next')]
    public ?string $next;

    /**
     * @var int $total
     */
    #[JsonProperty('total')]
    public int $total;

    /**
     * @var array<CustomerHealth> $workspaces
     */
    #[JsonProperty('workspaces'), ArrayType([CustomerHealth::class])]
    public array $workspaces;

    /**
     * @param array{
     *   total: int,
     *   workspaces: array<CustomerHealth>,
     *   account?: ?PartnerHealthAccount,
     *   next?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->account = $values['account'] ?? null;
        $this->next = $values['next'] ?? null;
        $this->total = $values['total'];
        $this->workspaces = $values['workspaces'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
