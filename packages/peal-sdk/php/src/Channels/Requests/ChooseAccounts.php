<?php

namespace Peal\Channels\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class ChooseAccounts extends JsonSerializableType
{
    /**
     * @var array<string> $accountIds
     */
    #[JsonProperty('accountIds'), ArrayType(['string'])]
    public array $accountIds;

    /**
     * @var string $selection
     */
    #[JsonProperty('selection')]
    public string $selection;

    /**
     * @param array{
     *   accountIds: array<string>,
     *   selection: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->accountIds = $values['accountIds'];
        $this->selection = $values['selection'];
    }
}
