<?php

namespace Peal\Ads\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class AdAccountsToConnect extends JsonSerializableType
{
    /**
     * @var array<string> $externalIds
     */
    #[JsonProperty('externalIds'), ArrayType(['string'])]
    public array $externalIds;

    /**
     * @param array{
     *   externalIds: array<string>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->externalIds = $values['externalIds'];
    }
}
