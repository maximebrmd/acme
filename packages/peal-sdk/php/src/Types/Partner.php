<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class Partner extends JsonSerializableType
{
    /**
     * @var string $createdAt
     */
    #[JsonProperty('createdAt')]
    public string $createdAt;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var ?string $logoUrl
     */
    #[JsonProperty('logoUrl')]
    public ?string $logoUrl;

    /**
     * @var string $name
     */
    #[JsonProperty('name')]
    public string $name;

    /**
     * @var array<string> $returnOrigins
     */
    #[JsonProperty('returnOrigins'), ArrayType(['string'])]
    public array $returnOrigins;

    /**
     * @var string $workspaceId
     */
    #[JsonProperty('workspaceId')]
    public string $workspaceId;

    /**
     * @param array{
     *   createdAt: string,
     *   id: string,
     *   name: string,
     *   returnOrigins: array<string>,
     *   workspaceId: string,
     *   logoUrl?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->createdAt = $values['createdAt'];
        $this->id = $values['id'];
        $this->logoUrl = $values['logoUrl'] ?? null;
        $this->name = $values['name'];
        $this->returnOrigins = $values['returnOrigins'];
        $this->workspaceId = $values['workspaceId'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
