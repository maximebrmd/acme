<?php

namespace Peal\Partner\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class NewCustomerWorkspace extends JsonSerializableType
{
    /**
     * @var ?string $idempotencyKey
     */
    public ?string $idempotencyKey;

    /**
     * @var ?string $externalId
     */
    #[JsonProperty('externalId')]
    public ?string $externalId;

    /**
     * @var string $name
     */
    #[JsonProperty('name')]
    public string $name;

    /**
     * @param array{
     *   name: string,
     *   idempotencyKey?: ?string,
     *   externalId?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->idempotencyKey = $values['idempotencyKey'] ?? null;
        $this->externalId = $values['externalId'] ?? null;
        $this->name = $values['name'];
    }
}
