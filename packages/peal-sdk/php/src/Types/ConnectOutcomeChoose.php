<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class ConnectOutcomeChoose extends JsonSerializableType
{
    /**
     * @var array<ChoosableAccount> $accounts
     */
    #[JsonProperty('accounts'), ArrayType([ChoosableAccount::class])]
    public array $accounts;

    /**
     * @var string $expiresAt
     */
    #[JsonProperty('expiresAt')]
    public string $expiresAt;

    /**
     * @var string $selection
     */
    #[JsonProperty('selection')]
    public string $selection;

    /**
     * @param array{
     *   accounts: array<ChoosableAccount>,
     *   expiresAt: string,
     *   selection: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->accounts = $values['accounts'];
        $this->expiresAt = $values['expiresAt'];
        $this->selection = $values['selection'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
