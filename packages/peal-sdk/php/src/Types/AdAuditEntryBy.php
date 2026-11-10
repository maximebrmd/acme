<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class AdAuditEntryBy extends JsonSerializableType
{
    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var value-of<AdAuditEntryByKind> $kind
     */
    #[JsonProperty('kind')]
    public string $kind;

    /**
     * @var ?string $viaClient
     */
    #[JsonProperty('viaClient')]
    public ?string $viaClient;

    /**
     * @param array{
     *   id: string,
     *   kind: value-of<AdAuditEntryByKind>,
     *   viaClient?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->id = $values['id'];
        $this->kind = $values['kind'];
        $this->viaClient = $values['viaClient'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
