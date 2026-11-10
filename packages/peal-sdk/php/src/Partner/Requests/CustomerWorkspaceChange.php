<?php

namespace Peal\Partner\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class CustomerWorkspaceChange extends JsonSerializableType
{
    /**
     * @var ?string $externalId
     */
    #[JsonProperty('externalId')]
    public ?string $externalId;

    /**
     * @var ?string $name
     */
    #[JsonProperty('name')]
    public ?string $name;

    /**
     * @param array{
     *   externalId?: ?string,
     *   name?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->externalId = $values['externalId'] ?? null;
        $this->name = $values['name'] ?? null;
    }
}
