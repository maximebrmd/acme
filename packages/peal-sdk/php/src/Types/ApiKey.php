<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class ApiKey extends JsonSerializableType
{
    /**
     * @var string $createdAt
     */
    #[JsonProperty('createdAt')]
    public string $createdAt;

    /**
     * @var ?string $expiresAt
     */
    #[JsonProperty('expiresAt')]
    public ?string $expiresAt;

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
     * @var array<value-of<Permission>> $permissions
     */
    #[JsonProperty('permissions'), ArrayType(['string'])]
    public array $permissions;

    /**
     * @var ?string $start
     */
    #[JsonProperty('start')]
    public ?string $start;

    /**
     * @param array{
     *   createdAt: string,
     *   id: string,
     *   name: string,
     *   permissions: array<value-of<Permission>>,
     *   expiresAt?: ?string,
     *   start?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->createdAt = $values['createdAt'];
        $this->expiresAt = $values['expiresAt'] ?? null;
        $this->id = $values['id'];
        $this->name = $values['name'];
        $this->permissions = $values['permissions'];
        $this->start = $values['start'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
