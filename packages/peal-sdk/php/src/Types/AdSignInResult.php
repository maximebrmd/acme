<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class AdSignInResult extends JsonSerializableType
{
    /**
     * @var array<ReachableAdAccount> $accounts
     */
    #[JsonProperty('accounts'), ArrayType([ReachableAdAccount::class])]
    public array $accounts;

    /**
     * @var AdConnection $connection
     */
    #[JsonProperty('connection')]
    public AdConnection $connection;

    /**
     * @param array{
     *   accounts: array<ReachableAdAccount>,
     *   connection: AdConnection,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->accounts = $values['accounts'];
        $this->connection = $values['connection'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
