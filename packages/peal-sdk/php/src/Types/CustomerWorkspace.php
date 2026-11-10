<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class CustomerWorkspace extends JsonSerializableType
{
    /**
     * @var int $channels
     */
    #[JsonProperty('channels')]
    public int $channels;

    /**
     * @var string $createdAt
     */
    #[JsonProperty('createdAt')]
    public string $createdAt;

    /**
     * @var ?string $externalId
     */
    #[JsonProperty('externalId')]
    public ?string $externalId;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var string $name
     */
    #[JsonProperty('name')]
    public string $name;

    /**
     * @param array{
     *   channels: int,
     *   createdAt: string,
     *   id: string,
     *   name: string,
     *   externalId?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channels = $values['channels'];
        $this->createdAt = $values['createdAt'];
        $this->externalId = $values['externalId'] ?? null;
        $this->id = $values['id'];
        $this->name = $values['name'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
